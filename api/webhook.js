/**
 * api/webhook.js — Meta WhatsApp Cloud API webhook handler.
 *
 * GET:  webhook verification (Meta sends hub.mode, hub.verify_token, hub.challenge)
 * POST: incoming messages. Verifies HMAC signature, deduplicates by msg id,
 *       resolves tenant, loads session, runs the agent, sends reply,
 *       notifies admin on QS review, handles admin approval commands.
 */

import { resolveTenant } from '../lib/tenant.js';
import { sendMessage, markAsRead } from '../lib/whatsapp.js';
import { verifyMetaSignature } from '../lib/hmac.js';
import { downloadMediaAsDataUrl } from '../lib/media.js';
import {
  markSeen,
  loadSession,
  saveSession,
  loadDraft,
  saveDraft,
  deleteDraft,
  updateTenant,
  getTenant,
} from '../lib/db.js';
import { runAgent } from '../lib/agent.js';

// Vercel / Node runtime: raw body as Buffer for HMAC. When Vercel parses JSON
// it passes req.body as an object — we reconstruct the raw bytes if needed.
export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

function getRawBody(req) {
  if (req.rawBody) return req.rawBody;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  return Buffer.from(JSON.stringify(req.body || {}));
}

async function handleApprovalCommand(tenant, sender, text) {
  // Commands (admin only):
  //   /approve <draftId>
  //   /revise <draftId> <catatan>
  //   /drafts
  const cmd = text.trim();
  if (cmd === '/drafts') {
    return 'Fitur list drafts belum tersedia. Admin approval: kirim `/approve <draftId>` atau `/revise <draftId> <catatan>`.';
  }
  const approve = cmd.match(/^\/approve\s+(\S+)/i);
  if (approve) {
    const draft = await loadDraft(tenant.id, approve[1]);
    if (!draft) return `Draft ${approve[1]} tidak ditemukan.`;
    draft.status = 'approved';
    draft.approvedAt = new Date().toISOString();
    await saveDraft(tenant.id, draft.id, draft);
    // Send approval notice back to the original user
    try {
      await sendMessage(
        tenant.phoneNumberId,
        tenant.whatsappAccessToken,
        draft.sender,
        `✅ Draft kamu (${draft.kind}) sudah di-approve admin. Berikut ringkasannya:\n\n${draft.summary}\n\nLangkah selanjutnya: silakan lanjut ke portal sesuai instruksi di chat sebelumnya. Butuh bantuan? Ketik "lanjut".`,
      );
    } catch (err) {
      console.error('[approve] failed to notify sender:', err.message);
    }
    return `✅ Draft ${draft.id} di-approve & user sudah dinotif.`;
  }
  const revise = cmd.match(/^\/revise\s+(\S+)\s+(.+)/i);
  if (revise) {
    const draft = await loadDraft(tenant.id, revise[1]);
    if (!draft) return `Draft ${revise[1]} tidak ditemukan.`;
    draft.status = 'revision_requested';
    draft.reviseNote = revise[2];
    await saveDraft(tenant.id, draft.id, draft);
    try {
      await sendMessage(
        tenant.phoneNumberId,
        tenant.whatsappAccessToken,
        draft.sender,
        `🔁 Admin minta revisi untuk draft kamu (${draft.kind}):\n\n"${revise[2]}"\n\nSilakan revisi & minta review ulang.`,
      );
    } catch (err) {
      console.error('[revise] failed to notify sender:', err.message);
    }
    return `🔁 Draft ${draft.id} minta revisi. User sudah dinotif.`;
  }
  return null; // not an admin command
}

async function notifyAdminOfDraft(tenant, sender, draftId) {
  const draft = await loadDraft(tenant.id, draftId);
  if (!draft) return;
  const adminNumber = tenant.adminWhatsappNumber;
  if (!adminNumber) {
    console.warn(`[webhook] tenant ${tenant.id} has no adminWhatsappNumber — skipping QS notification`);
    return;
  }
  const body = `🔍 *QS Review Request*\n\nKind: ${draft.kind}\nDari: ${sender}\nDraft ID: *${draftId}*\n\nRingkasan:\n${draft.summary}\n\nApprove: \`/approve ${draftId}\`\nRevise:  \`/revise ${draftId} <catatan>\``;
  try {
    await sendMessage(tenant.phoneNumberId, tenant.whatsappAccessToken, adminNumber, body);
  } catch (err) {
    console.error('[webhook] admin notify failed:', err.message);
  }
}

export default async function handler(req, res) {
  // --- GET: Webhook verification ---
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Signature verification (optional but recommended) ---
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const sig = req.headers['x-hub-signature-256'];
    const raw = getRawBody(req);
    if (!verifyMetaSignature(raw, sig, appSecret)) {
      console.warn('[webhook] signature check failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  // --- ACK fast, then process (Meta retries on non-2xx) ---
  // We process inline here because Vercel functions don't guarantee delivery
  // if we return before awaiting; instead we try to finish within the 10s
  // Meta timeout window. If this becomes an issue we'd move to a queue.

  try {
    const body = req.body || {};
    if (body.object !== 'whatsapp_business_account') {
      return res.status(200).json({ status: 'ignored' });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || change.field !== 'messages') continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        const messages = value.messages || [];
        const contacts = value.contacts || [];
        if (messages.length === 0) continue;

        const resolved = await resolveTenant(phoneNumberId);
        if (!resolved) {
          console.warn(`[webhook] no tenant for phoneNumberId: ${phoneNumberId}`);
          continue;
        }
        const { tenant, businessContext } = resolved;

        for (const msg of messages) {
          const sender = msg.from;
          const messageId = msg.id;

          // Idempotency: Meta retries on failure; skip dupes
          if (!(await markSeen(messageId))) {
            continue;
          }

          markAsRead(phoneNumberId, tenant.whatsappAccessToken, messageId).catch(() => {});

          // Extract text / image
          let userText = '';
          let imageDataUrl = null;
          if (msg.type === 'text') {
            userText = msg.text?.body || '';
          } else if (msg.type === 'interactive') {
            userText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
          } else if (msg.type === 'image') {
            try {
              imageDataUrl = await downloadMediaAsDataUrl(
                msg.image.id,
                tenant.whatsappAccessToken,
                msg.image.mime_type,
              );
              userText = msg.image.caption || '';
            } catch (err) {
              console.error('[webhook] image download failed:', err.message);
              await sendMessage(phoneNumberId, tenant.whatsappAccessToken, sender,
                'Maaf, gambar gagal diunduh. Bisa coba kirim ulang?');
              continue;
            }
          } else if (msg.type === 'document') {
            try {
              imageDataUrl = await downloadMediaAsDataUrl(
                msg.document.id,
                tenant.whatsappAccessToken,
                msg.document.mime_type,
              );
              userText = msg.document.caption || `[dokumen: ${msg.document.filename || 'file'}]`;
            } catch (err) {
              console.error('[webhook] doc download failed:', err.message);
              continue;
            }
          } else {
            continue; // unsupported type (audio, video, location, …)
          }

          // Admin approval commands: short-circuit if sender is admin
          const isAdmin = tenant.adminWhatsappNumber && sender === tenant.adminWhatsappNumber;
          if (isAdmin && userText && userText.startsWith('/')) {
            const adminReply = await handleApprovalCommand(tenant, sender, userText);
            if (adminReply) {
              await sendMessage(phoneNumberId, tenant.whatsappAccessToken, sender, adminReply);
              continue;
            }
          }

          // Load per-user session, run agent
          const session = await loadSession(tenant.id, sender);
          const ctx = {
            tenant,
            businessContext,
            sender,
            userMessage: userText,
            session,
            imageSource: imageDataUrl ? 'incoming' : null,
            imageDataUrl,
          };

          let agentResult;
          try {
            agentResult = await runAgent(ctx);
          } catch (err) {
            console.error('[webhook] agent error:', err);
            await sendMessage(
              phoneNumberId,
              tenant.whatsappAccessToken,
              sender,
              'Maaf kak, sistem lagi gangguan sebentar. Bisa coba lagi barusan? 🙏',
            );
            continue;
          }

          await saveSession(tenant.id, sender, agentResult.session);

          // Send agent reply
          if (agentResult.reply) {
            await sendMessage(phoneNumberId, tenant.whatsappAccessToken, sender, agentResult.reply);
          }

          // If agent requested QS review, notify admin
          if (agentResult.pendingReviewDraftId) {
            await notifyAdminOfDraft(tenant, sender, agentResult.pendingReviewDraftId);
          }

          // Bump message counter
          await updateTenant(tenant.id, {
            messageCount: (tenant.messageCount || 0) + 1,
          });
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[webhook] Error:', err);
    // Return 200 to avoid Meta retries on our internal bugs
    return res.status(200).json({ status: 'error-logged' });
  }
}
