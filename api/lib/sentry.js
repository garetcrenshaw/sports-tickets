import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for serverless functions (API routes)
 * Call this at the top of each API route file
 */
let sentryInitialized = false;

export function initSentryServer() {
  if (sentryInitialized) {
    return;
  }

  // Only initialize if DSN is configured
  if (!process.env.SENTRY_DSN) {
    console.log('Sentry: DSN not configured, skipping server initialization');
    sentryInitialized = true; // Mark as initialized to avoid repeated checks
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    integrations: [
      // Add integrations as needed
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    // Filter out common noise
    ignoreErrors: [
      // Expected validation errors
      'Missing stripe-signature header',
      'Signature verification failed',
      'Method Not Allowed',
      // Network timeouts (handled gracefully)
      'Body read timeout',
    ],
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly testing
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
        return null;
      }
      return event;
    },
  });

  sentryInitialized = true;
  console.log('Sentry initialized for serverless functions');
}

/**
 * Wrap an async handler function with Sentry error tracking
 * Usage: export default Sentry.wrapHandler(async (req, res) => { ... })
 */
export function wrapHandler(handler) {
  initSentryServer();
  
  return Sentry.wrapHandler(async (req, res) => {
    try {
      // Set request context
      Sentry.setContext('request', {
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
      });

      return await handler(req, res);
    } catch (error) {
      // Capture exception
      Sentry.captureException(error, {
        tags: {
          handler: handler.name || 'unknown',
          endpoint: req.url,
        },
      });
      throw error; // Re-throw to let handler deal with it
    }
  });
}

/**
 * Helper to capture exceptions manually
 */
export function captureException(error, context = {}) {
  initSentryServer();
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Helper to capture messages
 */
export function captureMessage(message, level = 'info', context = {}) {
  initSentryServer();
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user) {
  initSentryServer();
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

