/**
 * lib/agent.js — Core agent loop.
 *
 * Model-driven conversation with tool calling. The agent is given a system
 * prompt composed of:
 *   1. Base personality & tenant context
 *   2. The menu of skills (ekatalog, bpom, kemenkes) with when-to-use guidance
 *   3. The active skill's knowledge (if any)
 *
 * Skills expose tools; the agent decides which to call. Tools can:
 *   - Look up knowledge (document checklists, form rules, rejection reasons)
 *   - Mutate session state (remember user's product, save a draft)
 *   - Trigger QS review (submit a draft to the admin for approval)
 *
 * The tool-driven design avoids brittle state machines: the model stays in
 * charge of the conversation while tools own the source of truth.
 */

import OpenAI from 'openai';
import { skills, getSkill } from './skills/index.js';
import { addMessage, getRecentMessages } from './db.js';

let _openai;
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Soft cap to keep latency + cost bounded. Enough for 2-3 tool round-trips.
const MAX_TOOL_ROUNDS = 6;
const HISTORY_TURNS = 8;

const BASE_SYSTEM = `Kamu adalah **Dibantu**, asisten WhatsApp untuk UMKM Indonesia yang sedang mengurus perizinan usaha dan paperwork pemerintah. Kamu membantu mereka menyiapkan pengajuan ke:

- **LKPP e-Katalog** (jualan ke pemerintah)
- **BPOM** (pangan olahan MD/ML, kosmetik, obat tradisional/suplemen, PIRT coaching)
- **Kemenkes / "Depkes"** (PKRT, alat kesehatan, IPAK, SIP, izin apotek/klinik)

ATURAN UTAMA:
1. Bahasa Indonesia santai tapi jelas. Cocok untuk WhatsApp — paragraf pendek, bullet list, emoji secukupnya.
2. Jangan pernah mengarang aturan, biaya, atau timeline. Gunakan tool \`lookup_knowledge\` untuk mengambil fakta dari knowledge base internal kamu.
3. Jangan pernah mengirim jawaban final tanpa memastikan user sudah setuju melalui QS review bila mereka ingin "kirim", "submit", atau "proses". Gunakan tool \`request_qs_review\`.
4. Jika user baru chat pertama kali atau bingung, tampilkan menu tiga layanan dan tanya mereka mau bantu apa.
5. Kalau user kirim gambar dokumen (NIB, NPWP, akta, sertifikat, label produk), gunakan tool \`extract_document\` untuk membaca dan ringkas hasilnya.
6. Prioritas verifikasi sebelum pengajuan:
   - Punya NIB (OSS)? KBLI cocok? NPWP aktif?
   - Dokumen wajib lengkap untuk jalur yang dipilih?
   - Label/artwork sesuai aturan pelabelan?
7. Kalau user bertanya hal yang di luar tiga layanan (BPOM/Kemenkes/LKPP), arahkan dengan sopan — kamu bukan CS umum.
8. Selalu akhiri jawaban dengan langkah konkret berikutnya ("step selanjutnya: ...") supaya user tidak bingung.
9. Jangan mengaku sebagai GPT atau menyebut model AI. Kamu adalah "Dibantu".`;

function buildSystemPrompt(ctx) {
  const { tenant, businessContext, session } = ctx;
  const activeSkillName = session?.activeSkill;
  const activeSkill = activeSkillName ? getSkill(activeSkillName) : null;

  const menu = skills
    .map((s) => `- **${s.displayName}** — ${s.shortDescription}`)
    .join('\n');

  const enabledSkills = tenant.skills?.length ? tenant.skills : skills.map((s) => s.name);
  const enabled = skills
    .filter((s) => enabledSkills.includes(s.name))
    .map((s) => `- ${s.displayName}`)
    .join('\n');

  const activeBlock = activeSkill
    ? `\n\n## SKILL AKTIF: ${activeSkill.displayName}\n\n${activeSkill.systemPromptAddendum || ''}\n\n${activeSkill.knowledgeSummary || ''}`
    : '';

  const tenantBlock = businessContext?.businessName
    ? `\n\n## TENANT\nBusiness: ${businessContext.businessName}\n${businessContext.description || ''}`
    : '';

  return `${BASE_SYSTEM}

## LAYANAN YANG AKTIF UNTUK TENANT INI
${enabled || menu}

## SEMUA LAYANAN DIBANTU
${menu}${activeBlock}${tenantBlock}

Jika user masih bingung pilih yang mana, tanyakan mereka tentang produk/kebutuhannya, lalu ARAHKAN ke layanan yang tepat dengan \`set_active_skill\`.`;
}

function collectTools(tenant) {
  const enabled = tenant.skills?.length ? tenant.skills : skills.map((s) => s.name);
  const tools = [];
  for (const skill of skills) {
    if (!enabled.includes(skill.name)) continue;
    for (const tool of skill.tools || []) {
      tools.push({ type: 'function', function: tool.schema });
    }
  }
  // Core cross-cutting tools (always available)
  for (const tool of CORE_TOOLS) {
    tools.push({ type: 'function', function: tool.schema });
  }
  return tools;
}

function findToolHandler(name, tenant) {
  for (const core of CORE_TOOLS) {
    if (core.schema.name === name) return core.handler;
  }
  const enabled = tenant.skills?.length ? tenant.skills : skills.map((s) => s.name);
  for (const skill of skills) {
    if (!enabled.includes(skill.name)) continue;
    for (const tool of skill.tools || []) {
      if (tool.schema.name === name) return tool.handler;
    }
  }
  return null;
}

// ---------- Core tools: set_active_skill, reset, QS review ----------

import { saveDraft, resetSession } from './db.js';
import { randomUUID } from 'crypto';

const CORE_TOOLS = [
  {
    schema: {
      name: 'set_active_skill',
      description: 'Set the currently active skill so the agent can focus on one workflow. Call this as soon as you detect the user wants ekatalog / bpom / kemenkes.',
      parameters: {
        type: 'object',
        properties: {
          skill: { type: 'string', enum: ['ekatalog', 'bpom', 'kemenkes', 'none'] },
          reason: { type: 'string', description: 'Short Indonesian explanation the user will see.' },
        },
        required: ['skill'],
      },
    },
    handler: async ({ args, ctx }) => {
      ctx.session.activeSkill = args.skill === 'none' ? null : args.skill;
      ctx.session.skillSetAt = new Date().toISOString();
      return { ok: true, activeSkill: ctx.session.activeSkill };
    },
  },
  {
    schema: {
      name: 'reset_conversation',
      description: 'Clear the current session (active skill + any drafts in progress) and go back to the main menu. Call when user says "mulai ulang", "reset", or clearly wants to abandon the current flow.',
      parameters: { type: 'object', properties: {} },
    },
    handler: async ({ ctx }) => {
      await resetSession(ctx.tenant.id, ctx.sender);
      ctx.session = {};
      return { ok: true };
    },
  },
  {
    schema: {
      name: 'request_qs_review',
      description: 'Submit a draft (checklist result, profile draft, product listing, BPOM form summary, etc.) for human QS review before final delivery. The admin will approve or revise. Do NOT deliver a "final" result to the user without calling this.',
      parameters: {
        type: 'object',
        properties: {
          kind: { type: 'string', description: 'e.g. "ekatalog_profil", "bpom_pangan_md_draft", "kemenkes_pkrt_checklist"' },
          summary: { type: 'string', description: 'Short Indonesian summary of what the draft contains.' },
          payload: { type: 'object', description: 'The full draft object (structured data).' },
        },
        required: ['kind', 'summary', 'payload'],
      },
    },
    handler: async ({ args, ctx }) => {
      const draftId = randomUUID().slice(0, 8);
      const draft = {
        id: draftId,
        kind: args.kind,
        summary: args.summary,
        payload: args.payload,
        tenantId: ctx.tenant.id,
        sender: ctx.sender,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
      };
      await saveDraft(ctx.tenant.id, draftId, draft);
      ctx.pendingReviewDraftId = draftId;
      return {
        ok: true,
        draftId,
        message: `Draft disimpan untuk QS review (ID: ${draftId}). Admin akan cek dan approve.`,
      };
    },
  },
];

// ---------- Main loop ----------

/**
 * @param {object} ctx - { tenant, businessContext, sender, userMessage, session, imageSource? }
 * @returns {Promise<{reply: string, session: object, pendingReviewDraftId?: string}>}
 */
export async function runAgent(ctx) {
  const systemPrompt = buildSystemPrompt(ctx);
  const tools = collectTools(ctx.tenant);

  // Load recent conversation history (chronological)
  const history = await getRecentMessages(ctx.tenant.id, ctx.sender, HISTORY_TURNS);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Current turn. If the user sent an image, instruct the agent to call extract_document.
  if (ctx.imageSource) {
    messages.push({
      role: 'user',
      content: `[User mengirim gambar dokumen. Source ID: ${ctx.imageSource}. ${ctx.userMessage || ''} Panggil tool extract_document dengan source_id ini untuk membacanya.]`.trim(),
    });
  } else if (ctx.userMessage) {
    messages.push({ role: 'user', content: ctx.userMessage });
  }

  let finalText = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await openai().chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? 'auto' : undefined,
      max_tokens: 900,
      temperature: 0.4,
    });

    const msg = completion.choices[0].message;
    messages.push(msg);

    if (msg.tool_calls?.length) {
      for (const call of msg.tool_calls) {
        const handler = findToolHandler(call.function.name, ctx.tenant);
        let result;
        if (!handler) {
          result = { error: `Unknown tool: ${call.function.name}` };
        } else {
          try {
            const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
            result = await handler({ args, ctx });
          } catch (err) {
            console.error(`[agent] tool ${call.function.name} failed:`, err.message);
            result = { error: err.message };
          }
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result ?? { ok: true }),
        });
      }
      continue; // loop for follow-up completion
    }

    finalText = msg.content || '';
    break;
  }

  if (!finalText) {
    finalText = 'Maaf kak, ada sedikit kendala di sistem. Bisa coba ulang pertanyaannya?';
  }

  // Persist the incoming user turn + assistant reply to history
  if (ctx.userMessage) {
    await addMessage(ctx.tenant.id, ctx.sender, 'user', ctx.userMessage);
  } else if (ctx.imageSource) {
    await addMessage(ctx.tenant.id, ctx.sender, 'user', '[gambar dokumen]');
  }
  await addMessage(ctx.tenant.id, ctx.sender, 'assistant', finalText);

  return {
    reply: finalText,
    session: ctx.session,
    pendingReviewDraftId: ctx.pendingReviewDraftId,
  };
}
