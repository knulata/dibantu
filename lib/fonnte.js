/**
 * lib/fonnte.js — Send WhatsApp messages via Fonnte API.
 * Updated for multi-tenant: accepts token parameter.
 */

const FONNTE_API = 'https://api.fonnte.com/send';

/**
 * Send a WhatsApp message via Fonnte API.
 * @param {string} target - Recipient phone number
 * @param {string} message - Message text
 * @param {string} [token] - Fonnte API token (tenant-specific). Falls back to env var.
 * @returns {Promise<object>} Fonnte API response
 */
export async function sendMessage(target, message, token) {
  const apiToken = token || process.env.FONNTE_TOKEN;
  if (!apiToken) throw new Error('No Fonnte token provided');

  const res = await fetch(FONNTE_API, {
    method: 'POST',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target, message }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[fonnte] API error:', data);
    throw new Error(`Fonnte API error: ${res.status}`);
  }

  return data;
}
