/**
 * api/chat.js — web dogfood harness.
 *
 * Lets the user chat with the Dibantu agent via a browser instead of
 * WhatsApp. Useful for testing knowledge-base changes before Meta
 * approval lands. Not a public surface — protected by DOGFOOD_KEY env.
 *
 * The underlying agent loop (lib/agent.js) is identical. We skip the
 * WhatsApp media / QS-admin-notify paths; QS drafts still land in Redis
 * and can be inspected via /api/admin/dashboard.
 */

import { runAgent } from '../lib/agent.js';
import {
  loadSession,
  saveSession,
  resetSession,
  findTenantByPhoneNumberId,
  createTenant,
  getTenant,
  loadBusinessContext,
} from '../lib/db.js';

const DOGFOOD_TENANT_ID = 'dogfood';
const DOGFOOD_PHONE_ID = 'dogfood';

async function getOrCreateDogfoodTenant() {
  let tenant = await getTenant(DOGFOOD_TENANT_ID);
  if (tenant) return tenant;
  tenant = await findTenantByPhoneNumberId(DOGFOOD_PHONE_ID);
  if (tenant) return tenant;
  await createTenant({
    id: DOGFOOD_TENANT_ID,
    name: 'Dogfood',
    phoneNumberId: DOGFOOD_PHONE_ID,
    whatsappAccessToken: 'dogfood-unused',
    adminWhatsappNumber: '',
    skills: ['ekatalog', 'bpom', 'kemenkes'],
    status: 'active',
    createdAt: new Date().toISOString(),
    note: 'Web-chat dogfood harness — not a real WhatsApp tenant.',
  });
  return await getTenant(DOGFOOD_TENANT_ID);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Dogfood-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const providedKey =
    req.headers['x-dogfood-key'] ||
    (req.query && req.query.key) ||
    (req.body && req.body.key);
  const expected = process.env.DOGFOOD_KEY;
  if (expected && providedKey !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { message, sender = 'web-dogfood', reset } = req.body || {};

  try {
    const tenant = await getOrCreateDogfoodTenant();

    if (reset) {
      await resetSession(tenant.id, sender);
      return res.status(200).json({
        ok: true,
        reply: 'Session direset. Silakan mulai percakapan baru.',
      });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message (string) required' });
    }

    const session = await loadSession(tenant.id, sender);
    const businessContext = await loadBusinessContext(tenant.id);

    const result = await runAgent({
      tenant,
      businessContext,
      sender,
      userMessage: message,
      session,
    });

    await saveSession(tenant.id, sender, result.session);

    return res.status(200).json({
      reply: result.reply,
      draftId: result.pendingReviewDraftId || null,
      activeSkill: result.session?.activeSkill || null,
      bpomMode: result.session?.bpom?.mode || null,
    });
  } catch (err) {
    console.error('[chat] error:', err);
    return res.status(500).json({ error: err.message || 'internal error' });
  }
}
