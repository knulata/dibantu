/**
 * api/webhook.js — Multi-tenant Fonnte webhook handler.
 * Resolves tenant, loads context + history, generates AI reply, sends via Fonnte.
 */

import { resolveTenant } from '../lib/tenant.js';
import { generateReply } from '../lib/ai.js';
import { sendMessage } from '../lib/fonnte.js';
import { addMessage, getRecentMessages } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sender, message, device } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: 'Missing sender or message' });
    }

    // Skip group messages
    if (sender.includes('-')) {
      return res.status(200).json({ status: 'skipped', reason: 'group message' });
    }

    // Resolve tenant from device field
    const resolved = resolveTenant(req.body);
    if (!resolved) {
      console.warn(`[webhook] No tenant for device: ${device}`);
      return res.status(200).json({ status: 'skipped', reason: 'unknown tenant' });
    }

    const { tenant, businessContext } = resolved;
    console.log(`[webhook] Tenant: ${tenant.businessName} | From: ${sender} | Message: ${message}`);

    // Save incoming message to history
    addMessage(tenant.id, sender, 'user', message);

    // Load recent conversation history for context
    const history = getRecentMessages(tenant.id, sender, 10);

    // Generate AI reply (exclude the message we just added — it's passed separately)
    const historyWithoutLast = history.slice(0, -1);
    const reply = await generateReply(message, businessContext, historyWithoutLast);

    // Save assistant reply to history
    addMessage(tenant.id, sender, 'assistant', reply);

    // Send reply via Fonnte using tenant's own token
    await sendMessage(sender, reply, tenant.fonnteToken);

    console.log(`[webhook] Reply sent to ${sender} via ${tenant.businessName}`);
    return res.status(200).json({ status: 'ok', tenant: tenant.id });
  } catch (err) {
    console.error('[webhook] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
