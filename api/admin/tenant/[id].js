/**
 * api/admin/tenant/[id].js — Tenant detail + business context API.
 * GET: tenant details, recent conversations, stats
 * PUT: update business context
 */

import { getTenant, loadBusinessContext, saveBusinessContext, loadConversations, getConversationStats } from '../../../lib/db.js';

function authenticate(req) {
  const key = req.headers['x-admin-key'] || req.query?.key;
  return key === process.env.ADMIN_API_KEY;
}

export default async function handler(req, res) {
  if (!authenticate(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  const tenant = getTenant(id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  // GET — tenant details + conversations + stats
  if (req.method === 'GET') {
    const businessContext = loadBusinessContext(id);
    const stats = getConversationStats(id);
    const conversations = loadConversations(id);

    // Get last 5 conversations (most recent messages)
    const recentConversations = Object.entries(conversations)
      .map(([sender, msgs]) => ({
        sender,
        messageCount: msgs.length,
        lastMessage: msgs[msgs.length - 1],
      }))
      .sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0))
      .slice(0, 5);

    return res.status(200).json({
      tenant,
      businessContext,
      stats,
      recentConversations,
    });
  }

  // PUT — update business context
  if (req.method === 'PUT') {
    const { businessContext } = req.body;
    if (!businessContext) {
      return res.status(400).json({ error: 'businessContext required' });
    }
    saveBusinessContext(id, businessContext);
    return res.status(200).json({ status: 'updated' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
