/**
 * lib/tenant.js — Tenant resolver for multi-tenant webhooks.
 * Identifies which tenant an incoming Fonnte webhook belongs to.
 */

import { findTenantByDevice, loadBusinessContext } from './db.js';

/**
 * Resolve tenant from incoming webhook data.
 * Fonnte sends `device` field = the WhatsApp number connected.
 * We match this to a tenant's whatsappNumber.
 * 
 * @param {object} webhookBody - The incoming webhook request body
 * @returns {{ tenant: object, businessContext: object } | null}
 */
export function resolveTenant(webhookBody) {
  const { device } = webhookBody;

  if (!device) {
    console.warn('[tenant] No device field in webhook body');
    return null;
  }

  // Find tenant by device (WhatsApp number)
  const tenant = findTenantByDevice(device);
  if (!tenant) {
    console.warn(`[tenant] No active tenant found for device: ${device}`);
    return null;
  }

  // Load business context
  const businessContext = loadBusinessContext(tenant.id);
  if (!businessContext) {
    console.warn(`[tenant] No business context for tenant: ${tenant.id}`);
    return null;
  }

  return { tenant, businessContext };
}
