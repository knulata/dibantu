/**
 * api/admin/tenants.js — Admin CRUD API for tenants.
 * Protected by ADMIN_API_KEY.
 */

import { loadTenants, createTenant, updateTenant, deleteTenant, saveBusinessContext } from '../../lib/db.js';
import { randomUUID } from 'crypto';

function authenticate(req) {
  const key = req.headers['x-admin-key'] || req.query?.key;
  return key === process.env.ADMIN_API_KEY;
}

export default async function handler(req, res) {
  if (!authenticate(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;

  // GET — list all tenants
  if (method === 'GET') {
    return res.status(200).json(loadTenants());
  }

  // POST — create tenant
  if (method === 'POST') {
    const { businessName, phoneNumberId, whatsappAccessToken, whatsappNumber, plan, businessContext } = req.body;

    if (!businessName || !phoneNumberId || !whatsappAccessToken) {
      return res.status(400).json({ error: 'businessName, phoneNumberId, whatsappAccessToken required' });
    }

    const tenant = {
      id: randomUUID(),
      businessName,
      phoneNumberId,
      whatsappAccessToken,
      whatsappNumber: whatsappNumber || '',
      plan: plan || 'starter',
      status: 'active',
      createdAt: new Date().toISOString(),
      messageCount: 0,
    };

    createTenant(tenant);

    // Save business context if provided
    if (businessContext) {
      saveBusinessContext(tenant.id, businessContext);
    }

    return res.status(201).json(tenant);
  }

  // PUT — update tenant
  if (method === 'PUT') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });

    const updated = updateTenant(id, updates);
    if (!updated) return res.status(404).json({ error: 'Tenant not found' });

    return res.status(200).json(updated);
  }

  // DELETE — remove tenant
  if (method === 'DELETE') {
    const id = req.body?.id || req.query?.id;
    if (!id) return res.status(400).json({ error: 'id required' });

    const deleted = deleteTenant(id);
    if (!deleted) return res.status(404).json({ error: 'Tenant not found' });

    return res.status(200).json({ status: 'deleted' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
