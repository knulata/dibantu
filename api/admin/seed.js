/**
 * api/admin/seed.js — one-shot seed for the default tenant.
 *
 * Call: POST /api/admin/seed with X-Admin-Key header.
 * Creates a tenant pointing at the user's own WA number (MEMORY default: 628131102445)
 * with all three skills enabled and adminWhatsappNumber = same number so the QS loop
 * delivers back to the same inbox. phoneNumberId + whatsappAccessToken are placeholders
 * that must be edited via the dashboard before the tenant can actually receive Meta webhooks.
 */

import { loadTenants, createTenant, saveBusinessContext } from '../../lib/db.js';
import { randomUUID } from 'crypto';

function authenticate(req) {
  const key = req.headers['x-admin-key'] || req.query?.key;
  return key === process.env.ADMIN_API_KEY;
}

const DEFAULT_ADMIN_NUMBER = '628131102445';

export default async function handler(req, res) {
  if (!authenticate(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const existing = await loadTenants();
  if (existing.length > 0) {
    return res.status(200).json({
      status: 'already-seeded',
      tenants: existing.length,
      message: 'Tenants already exist. Delete them via the dashboard first if you want to re-seed.',
    });
  }

  const tenant = {
    id: randomUUID(),
    businessName: 'Dibantu HQ',
    phoneNumberId: 'SET_ME_IN_DASHBOARD', // placeholder — Meta phone_number_id
    whatsappAccessToken: 'SET_ME_IN_DASHBOARD',
    whatsappNumber: DEFAULT_ADMIN_NUMBER,
    adminWhatsappNumber: DEFAULT_ADMIN_NUMBER,
    plan: 'enterprise',
    status: 'active',
    skills: ['ekatalog', 'bpom', 'kemenkes'],
    createdAt: new Date().toISOString(),
    messageCount: 0,
  };

  await createTenant(tenant);
  await saveBusinessContext(tenant.id, {
    businessName: 'Dibantu HQ',
    description: 'Internal test tenant for regulatory paperwork flows (ekatalog, bpom, kemenkes).',
    tone: 'santai tapi jelas',
    language: 'Bahasa Indonesia',
  });

  return res.status(201).json({
    status: 'seeded',
    tenant: { ...tenant, whatsappAccessToken: '***' },
    nextStep: 'Edit phoneNumberId and whatsappAccessToken via the dashboard, then point Meta webhook to /api/webhook.',
  });
}
