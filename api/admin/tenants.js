/**
 * api/admin/tenants.js — Admin CRUD API for tenants.
 */

import { loadTenants, createTenant, updateTenant, deleteTenant, saveBusinessContext } from '../../lib/db.js';
import { randomUUID } from 'crypto';

function authenticate(req) {
  const key = req.headers['x-admin-key'] || req.query?.key;
  return key === process.env.ADMIN_API_KEY;
}

const ALL_SKILLS = ['ekatalog', 'bpom', 'kemenkes'];

export default async function handler(req, res) {
  if (!authenticate(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;

  if (method === 'GET') {
    const tenants = await loadTenants();
    // Redact access tokens on list endpoint
    return res.status(200).json(tenants.map((t) => ({
      ...t,
      whatsappAccessToken: t.whatsappAccessToken ? '***' : '',
    })));
  }

  if (method === 'POST') {
    const {
      businessName,
      phoneNumberId,
      whatsappAccessToken,
      whatsappNumber,
      adminWhatsappNumber,
      plan,
      skills,
      businessContext,
    } = req.body;

    if (!businessName || !phoneNumberId || !whatsappAccessToken) {
      return res.status(400).json({ error: 'businessName, phoneNumberId, whatsappAccessToken required' });
    }

    const normalizedSkills = Array.isArray(skills) && skills.length
      ? skills.filter((s) => ALL_SKILLS.includes(s))
      : ALL_SKILLS;

    const tenant = {
      id: randomUUID(),
      businessName,
      phoneNumberId,
      whatsappAccessToken,
      whatsappNumber: whatsappNumber || '',
      adminWhatsappNumber: adminWhatsappNumber || '',
      plan: plan || 'starter',
      status: 'active',
      skills: normalizedSkills,
      createdAt: new Date().toISOString(),
      messageCount: 0,
    };

    try {
      await createTenant(tenant);
    } catch (err) {
      return res.status(409).json({ error: err.message });
    }

    if (businessContext) {
      await saveBusinessContext(tenant.id, businessContext);
    }

    return res.status(201).json({ ...tenant, whatsappAccessToken: '***' });
  }

  if (method === 'PUT') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (updates.skills) {
      updates.skills = updates.skills.filter((s) => ALL_SKILLS.includes(s));
    }
    const updated = await updateTenant(id, updates);
    if (!updated) return res.status(404).json({ error: 'Tenant not found' });
    return res.status(200).json({ ...updated, whatsappAccessToken: '***' });
  }

  if (method === 'DELETE') {
    const id = req.body?.id || req.query?.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const deleted = await deleteTenant(id);
    if (!deleted) return res.status(404).json({ error: 'Tenant not found' });
    return res.status(200).json({ status: 'deleted' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
