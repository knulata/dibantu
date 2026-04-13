/**
 * api/admin/tenant/[id].js — Tenant detail + business context API.
 */

import {
  getTenant,
  loadBusinessContext,
  saveBusinessContext,
  getConversationStats,
} from '../../../lib/db.js';

function authenticate(req) {
  const key = req.headers['x-admin-key'] || req.query?.key;
  return key === process.env.ADMIN_API_KEY;
}

export default async function handler(req, res) {
  if (!authenticate(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  const tenant = await getTenant(id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  if (req.method === 'GET') {
    const businessContext = await loadBusinessContext(id);
    const stats = await getConversationStats(id);
    return res.status(200).json({
      tenant: { ...tenant, whatsappAccessToken: '***' },
      businessContext,
      stats,
    });
  }

  if (req.method === 'PUT') {
    const { businessContext } = req.body;
    if (!businessContext) {
      return res.status(400).json({ error: 'businessContext required' });
    }
    await saveBusinessContext(id, businessContext);
    return res.status(200).json({ status: 'updated' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
