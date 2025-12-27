// Stub file - this endpoint is no longer used
// Kept to prevent errors from old cached deployments
// All email functionality has been moved to process-email-queue
// 
// NOTE: This file is intentionally minimal to avoid env var access at module load time

export default function handler(req, res) {
  return res.status(410).json({ 
    error: 'This endpoint has been deprecated',
    message: 'Email functionality has been moved to /api/process-email-queue',
    migration_info: 'Use /api/process-email-queue instead'
  });
}

