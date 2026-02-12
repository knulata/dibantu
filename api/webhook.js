import { generateReply } from '../lib/ai.js';
import { sendMessage } from '../lib/fonnte.js';

/**
 * Fonnte webhook handler.
 * Receives incoming WhatsApp messages and sends AI-generated replies.
 */
export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sender, message, device } = req.body;

    // Validate required fields
    if (!sender || !message) {
      console.warn('[webhook] Missing sender or message:', req.body);
      return res.status(400).json({ error: 'Missing sender or message' });
    }

    // Skip messages from groups (optional — remove if you want group support)
    if (sender.includes('-')) {
      return res.status(200).json({ status: 'skipped', reason: 'group message' });
    }

    console.log(`[webhook] From: ${sender} | Device: ${device || 'unknown'} | Message: ${message}`);

    // Generate AI reply
    const reply = await generateReply(message);
    console.log(`[webhook] Reply to ${sender}: ${reply.substring(0, 100)}...`);

    // Send reply via Fonnte
    await sendMessage(sender, reply);

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[webhook] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
