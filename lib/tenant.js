/**
 * lib/tenant.js — Tenant resolver for multi-tenant webhooks.
 * Identifies which tenant an incoming Meta webhook belongs to.
 */

import { findTenantByPhoneNumberId, loadBusinessContext } from './db.js';

/**
 * Resolve tenant from Meta webhook phone_number_id.
 * Each tenant has their own WhatsApp Business phone number.
 * 
 * @param {string} phoneNumberId - The phone_number_id from Meta webhook metadata
 * @returns {{ tenant: object, businessContext: object } | null}
 */
export function resolveTenant(phoneNumberId) {
  if (!phoneNumberId) {
    console.warn('[tenant] No phoneNumberId provided');
    return null;
  }

  const tenant = findTenantByPhoneNumberId(phoneNumberId);
  if (!tenant) {
    console.warn(`[tenant] No active tenant found for phoneNumberId: ${phoneNumberId}`);
    return null;
  }

  const businessContext = loadBusinessContext(tenant.id);
  if (!businessContext) {
    console.warn(`[tenant] No business context for tenant: ${tenant.id}`);
    return null;
  }

  return { tenant, businessContext };
}
