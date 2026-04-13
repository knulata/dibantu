/**
 * api/health.js — liveness + config summary.
 */

export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'dibantu',
    version: '2.0.0',
    skills: ['ekatalog', 'bpom', 'kemenkes'],
    persistence: process.env.UPSTASH_REDIS_REST_URL ? 'upstash' : 'in-memory',
    hmacEnabled: !!process.env.META_APP_SECRET,
    timestamp: new Date().toISOString(),
  });
}
