/**
 * ## Env + platform checklist
 * - Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`,
 *   `SUPABASE_SERVICE_ROLE_KEY`, and optional `RESEND_API_KEY` in Vercel Dashboard →
 *   Settings → Environment Variables for both Production + Preview scopes.
 * - Keep secrets server-side (no `VITE_` prefixes) and rotate keys before redeploying.
 *
 * ## Routing + raw body notes
 * - App Router handler only exports POST; any other method returns 405.
 * - `request.text()` reads the raw payload Stripe signs—never pre-parse JSON.
 * - Optional Vercel routing snippet (locks POST + preserves raw body):
 * ```json
 * {
 *   "routes": [
 *     {
 *       "src": "/api/stripe-webhook",
 *       "dest": "/api/stripe-webhook",
 *       "methods": ["POST"],
 *       "headers": { "Content-Type": "application/json" }
 *     }
 *   ]
 * }
 * ```
 * - For tracing, opt into `experimental.instrumentationHook = true` in `next.config.js`.
 *
 * ## Deployment + testing workflow
 * ```bash
 * npm install
 * npm run dev
 * stripe listen --forward-to localhost:3000/api/stripe-webhook
 * stripe trigger checkout.session.completed \
 *   --add checkout.session:metadata.event_id=deploy_test \
 *   --add checkout.session:customer_details.email=test@example.com
 * vercel --prod
 * vercel logs https://<deployment>.vercel.app --since 10m | grep "STRIPE-WEBHOOK"
 * ```
 *
 * ## Webhook setup + debugging
 * - Stripe Dashboard (test) → Developers → Webhooks → Add endpoint → https://<deployment>/api/stripe-webhook.
 * - Subscribe to `checkout.session.completed`, then copy the signing secret into Vercel envs.
 * - Promote to prod by updating the endpoint URL + secret, redeploying, and re-running tests.
 * - 405 errors → ensure only POST hits this route (stripe-cli uses POST by default).
 * - `Webhook signature verification FAILED` → regenerate signing secret + redeploy.
 * - No logs → inspect Stripe → Webhooks → Recent deliveries + `vercel logs ... | grep "[STRIPE-WEBHOOK]"`.
 * - Supabase insert issues → confirm `tickets` schema + service role bypasses RLS.
 * - Email send failures are logged but non-blocking; resend manually if needed.
 * - Trigger duplicate events to verify the `Ticket already exists (idempotent skip)` log.
 */

import { unstable_noStore as noStore } from 'next/cache';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from '@resend/resend';

const LOG_PREFIX = '[STRIPE-WEBHOOK]';
const REQUIRED_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  throw new Error(`${LOG_PREFIX} Missing environment variables: ${missingEnvVars.join(', ')}`);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type TicketInsertPayload = {
  event_id: string;
  user_email: string;
  purchased_at: string;
  status: string;
};

const methodNotAllowed = () =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });

function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function sendConfirmationEmail(to: string, eventId: string) {
  if (!resend) {
    console.log(`${LOG_PREFIX} RESEND_API_KEY missing—email skipped (dev mode)`);
    return;
  }

  try {
    const result = await resend.emails.send({
      from: 'tickets@sports-app.com',
      to: [to],
      subject: 'Your Sports Ticket Confirmation!',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5;">
          <h2>Thanks for purchasing!</h2>
          <p>Event: <strong>${eventId}</strong></p>
          <p>Ticket details: Active status, purchased ${new Date().toISOString()}.</p>
          <p>Show this email with a valid ID at the gate.</p>
        </div>
      `,
    });

    if (result.error) {
      console.error(`${LOG_PREFIX} Email send failed: ${result.error.message}`);
    } else {
      console.log(`${LOG_PREFIX} Email sent to ${to} (id: ${result.data?.id ?? 'n/a'})`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Email send failed:`, error);
  }
}

export async function POST(request: Request) {
  noStore();

  try {
    const rawBody = await request.text();
    if (!rawBody) {
      console.error(`${LOG_PREFIX} Empty request body received`);
      return new Response('Bad Request', { status: 400 });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error(`${LOG_PREFIX} No signatures found on webhook request`);
      return new Response('Webhook Error', { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      console.log(`${LOG_PREFIX} Event verified: ${event.id} (${event.type})`);
    } catch (err) {
      console.error(`${LOG_PREFIX} Webhook signature verification FAILED:`, err);
      return new Response('Webhook Error', { status: 400 });
    }

    if (event.type !== 'checkout.session.completed') {
      console.log(`${LOG_PREFIX} Ignored non-checkout event: ${event.type}`);
      return new Response('Ignored', { status: 200 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const eventId = session.metadata?.event_id;
    const email = session.customer_details?.email;

    if (!eventId || !email) {
      console.error(`${LOG_PREFIX} Missing metadata.event_id or customer_details.email`, {
        sessionId: session.id,
      });
      return new Response('Missing metadata', { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data: existingTicket, error: lookupError } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_email', email)
      .single<{ id: string }>();

    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error(`${LOG_PREFIX} Supabase lookup failed:`, lookupError);
      throw new Error(`Supabase lookup failed: ${lookupError.message}`);
    }

    if (existingTicket?.id) {
      console.log(`${LOG_PREFIX} Ticket already exists (idempotent skip): ${existingTicket.id}`);
    } else {
      const insertPayload: TicketInsertPayload = {
        event_id: eventId,
        user_email: email,
        purchased_at: new Date().toISOString(),
        status: 'active',
      };

      const { data: insertedTicket, error: insertError } = await supabase
        .from('tickets')
        .insert(insertPayload)
        .select()
        .single<{ id: string }>();

      if (insertError) {
        if (insertError.code === '23505') {
          console.warn(`${LOG_PREFIX} Insert failed (possible duplicate): ${insertError.message}`);
        } else {
          console.error(`${LOG_PREFIX} Ticket insert failed:`, insertError);
          throw new Error(`Ticket insert failed: ${insertError.message}`);
        }
      } else if (insertedTicket?.id) {
        console.log(`${LOG_PREFIX} Ticket inserted: ${insertedTicket.id}`);
      }
    }

    await sendConfirmationEmail(email, eventId);

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error(`${LOG_PREFIX} Fatal error:`, error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export const GET = () => methodNotAllowed();
export const PUT = () => methodNotAllowed();
export const PATCH = () => methodNotAllowed();
export const DELETE = () => methodNotAllowed();
export const runtime = 'nodejs';
export const maxDuration = 30;

