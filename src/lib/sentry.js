import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for frontend error tracking
 * Called once at app startup
 */
export function initSentry() {
  // Only initialize in production or if SENTRY_DSN is explicitly set
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.log('Sentry: DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    // Session Replay
    replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Always record replays on errors
    // Release tracking
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || undefined,
    // Filter out common noise
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'atomicFindClose',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
      // Stripe iframe errors (expected)
      'ResizeObserver loop limit exceeded',
    ],
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly testing
      if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_SENTRY_ENABLE_DEV) {
        return null;
      }
      return event;
    },
  });

  console.log('Sentry initialized for frontend');
}

/**
 * Helper to capture exceptions manually
 */
export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Helper to capture messages
 */
export function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser() {
  Sentry.setUser(null);
}

