/**
 * lib/whatsapp.js — Send WhatsApp messages via Meta Cloud API.
 * Replaces lib/fonnte.js for official WhatsApp Business Cloud API.
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';

/**
 * Send a text message via Meta WhatsApp Cloud API.
 * @param {string} phoneNumberId - WhatsApp Business phone number ID
 * @param {string} accessToken - Meta API access token
 * @param {string} to - Recipient phone number (E.164 format)
 * @param {string} message - Message text
 * @returns {Promise<object>} API response
 */
export async function sendMessage(phoneNumberId, accessToken, to, message) {
  const url = `${GRAPH_API}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[whatsapp] API error:', data);
    throw new Error(`WhatsApp API error: ${res.status} — ${data.error?.message || 'Unknown'}`);
  }
  return data;
}

/**
 * Send a template message (for business-initiated conversations).
 * @param {string} phoneNumberId - WhatsApp Business phone number ID
 * @param {string} accessToken - Meta API access token
 * @param {string} to - Recipient phone number
 * @param {string} templateName - Template name
 * @param {string} languageCode - Template language code (e.g. 'id')
 * @param {Array} [components] - Template components/parameters
 * @returns {Promise<object>} API response
 */
export async function sendTemplate(phoneNumberId, accessToken, to, templateName, languageCode = 'id', components = []) {
  const url = `${GRAPH_API}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };
  if (components.length > 0) {
    body.template.components = components;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[whatsapp] Template error:', data);
    throw new Error(`WhatsApp template error: ${res.status} — ${data.error?.message || 'Unknown'}`);
  }
  return data;
}

/**
 * Mark a message as read.
 * @param {string} phoneNumberId - WhatsApp Business phone number ID
 * @param {string} accessToken - Meta API access token
 * @param {string} messageId - The message ID to mark as read
 * @returns {Promise<object>} API response
 */
export async function markAsRead(phoneNumberId, accessToken, messageId) {
  const url = `${GRAPH_API}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[whatsapp] markAsRead error:', data);
  }
  return data;
}
