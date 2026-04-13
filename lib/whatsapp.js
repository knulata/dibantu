/**
 * lib/whatsapp.js — send WhatsApp messages via Meta Cloud API.
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';

async function postMessage(phoneNumberId, accessToken, body) {
  const url = `${GRAPH_API}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[whatsapp] API error:', data);
    throw new Error(`WhatsApp API error: ${res.status} — ${data.error?.message || 'Unknown'}`);
  }
  return data;
}

export async function sendMessage(phoneNumberId, accessToken, to, message) {
  return postMessage(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message, preview_url: false },
  });
}

/**
 * Send an interactive button message. `buttons` is up to 3 reply buttons:
 * [{ id: 'menu', title: 'Menu' }, ...]. Title max 20 chars.
 */
export async function sendButtons(phoneNumberId, accessToken, to, body, buttons) {
  return postMessage(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

export async function sendTemplate(phoneNumberId, accessToken, to, templateName, languageCode = 'id', components = []) {
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: templateName, language: { code: languageCode } },
  };
  if (components.length) body.template.components = components;
  return postMessage(phoneNumberId, accessToken, body);
}

export async function markAsRead(phoneNumberId, accessToken, messageId) {
  try {
    await postMessage(phoneNumberId, accessToken, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  } catch {
    /* best-effort */
  }
}
