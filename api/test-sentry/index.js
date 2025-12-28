import { initSentryServer, captureException, captureMessage } from '../lib/sentry.js';

// Initialize Sentry
initSentryServer();

/**
 * Test endpoint to verify Sentry integration
 * This endpoint intentionally throws errors to test alerting
 */
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query || {};

  try {
    switch (action) {
      case 'exception':
        // Test exception capture
        throw new Error('Test exception for Sentry monitoring');
        
      case 'message':
        // Test message capture
        captureMessage('Test message for Sentry monitoring', 'info', {
          test: true,
          timestamp: new Date().toISOString(),
        });
        return res.status(200).json({
          success: true,
          message: 'Test message sent to Sentry',
        });
        
      case 'context':
        // Test with context
        captureException(new Error('Test exception with context'), {
          tags: {
            test: true,
            component: 'test-sentry',
          },
          extra: {
            customData: 'This is test data',
            timestamp: new Date().toISOString(),
          },
        });
        return res.status(200).json({
          success: true,
          message: 'Test exception with context sent to Sentry',
        });
        
      default:
        return res.status(200).json({
          message: 'Sentry test endpoint',
          usage: {
            '?action=exception': 'Throw a test exception',
            '?action=message': 'Send a test message',
            '?action=context': 'Send exception with context',
          },
        });
    }
  } catch (error) {
    // This will be captured by Sentry
    captureException(error, {
      tags: {
        component: 'test-sentry',
        test: true,
      },
    });
    
    return res.status(500).json({
      error: error.message,
      message: 'This error was captured by Sentry',
    });
  }
}

