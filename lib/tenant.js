/**
 * lib/tenant.js — Tenant resolver for multi-tenant webhooks.
 */

import { findTenantByPhoneNumberId, loadBusinessContext } from './db.js';

export async function resolveTenant(phoneNumberId) {
  if (!phoneNumberId) return null;
  const tenant = await findTenantByPhoneNumberId(phoneNumberId);
  if (!tenant) return null;
  const businessContext = (await loadBusinessContext(tenant.id)) || {};
  return { tenant, businessContext };
}
