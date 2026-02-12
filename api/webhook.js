/**
 * api/webhook.js — Meta WhatsApp Cloud API webhook handler.
 * GET: webhook verification (Meta sends hub.mode, hub.verify_token, hub.challenge)
 * POST: receive incoming messages, resolve tenant, generate AI reply, send back.
 */

import { resolveTenant } from '../lib/tenant.js';
import { generateReply } from '../lib/ai.js';
import { sendMessage, markAsRead } from '../lib/whatsapp.js';
import { addMessage, getRecentMessages } from '../lib/db.js';

export default async function handler(req, res) {
  // --- GET: Webhook verification ---
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log('[webhook] Verification successful');
      return res.status(200).send(challenge);
    }

    console.warn('[webhook] Verification failed');
    return res.status(403).send('Forbidden');
  }

  // --- POST: Incoming messages ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Validate it's a WhatsApp webhook
    if (body.object !== 'whatsapp_business_account') {
      return res.status(200).json({ status: 'ignored' });
    }

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || change.field !== 'messages') continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        if (messages.length === 0) continue;

        // Resolve tenant by phone_number_id
        const resolved = resolveTenant(phoneNumberId);
        if (!resolved) {
          console.warn(`[webhook] No tenant for phoneNumberId: ${phoneNumberId}`);
          continue;
        }

        const { tenant, businessContext } = resolved;

        for (const msg of messages) {
          // Only handle text messages for now
          if (msg.type !== 'text') continue;

          const sender = msg.from;
          const messageText = msg.text?.body;
          const messageId = msg.id;
          const senderName = contacts.find(c => c.wa_id === sender)?.profile?.name || sender;

          if (!messageText) continue;

          console.log(`[webhook] ${tenant.businessName} | From: ${senderName} (${sender}) | ${messageText}`);

          // Mark as read
          markAsRead(phoneNumberId, tenant.whatsappAccessToken, messageId).catch(() => {});

          // Save incoming message
          addMessage(tenant.id, sender, 'user', messageText);

          // Load history and generate reply
          const history = getRecentMessages(tenant.id, sender, 10);
          const historyWithoutLast = history.slice(0, -1);
          const reply = await generateReply(messageText, businessContext, historyWithoutLast);

          // Save and send reply
          addMessage(tenant.id, sender, 'assistant', reply);
          await sendMessage(phoneNumberId, tenant.whatsappAccessToken, sender, reply);

          console.log(`[webhook] Reply sent to ${sender} via ${tenant.businessName}`);
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[webhook] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
