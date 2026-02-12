const FONNTE_API = 'https://api.fonnte.com/send';

/**
 * Send a WhatsApp message via Fonnte API.
 * @param {string} target - Recipient phone number
 * @param {string} message - Message text
 * @returns {Promise<object>} Fonnte API response
 */
export async function sendMessage(target, message) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) throw new Error('FONNTE_TOKEN environment variable is not set');

  const res = await fetch(FONNTE_API, {
    method: 'POST',
    headers: {
      'Authorization': token,
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
