/**
 * lib/ai.js — AI reply generation with multi-tenant context and conversation history.
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Build system prompt from tenant's business context.
 */
function buildSystemPrompt(ctx) {
  const products = (ctx.products || [])
    .map(p => `- ${p.name}: Rp${p.price?.toLocaleString('id-ID') || '?'} — ${p.description}${p.stock === false ? ' (HABIS)' : ''}`)
    .join('\n');

  const faq = (ctx.faq || [])
    .map(f => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  const payments = ctx.paymentMethods?.join(', ') || '-';

  return `Kamu adalah asisten WhatsApp untuk "${ctx.businessName}".
${ctx.description || ''}

NADA BICARA: ${ctx.tone || 'ramah dan profesional'}
BAHASA: ${ctx.language || 'Bahasa Indonesia'}

${ctx.operatingHours ? `JAM OPERASIONAL: ${ctx.operatingHours.days || '-'}, ${ctx.operatingHours.hours || '-'} ${ctx.operatingHours.timezone || 'WIB'}` : ''}

PRODUK:
${products || 'Tidak ada daftar produk.'}

METODE PEMBAYARAN: ${payments}

${faq ? `FAQ:\n${faq}` : ''}

${ctx.additionalInstructions ? `INSTRUKSI TAMBAHAN:\n${ctx.additionalInstructions}` : ''}

ATURAN:
- Jawab dalam Bahasa Indonesia
- Jawab singkat dan jelas, cocok untuk WhatsApp (maks 3-4 paragraf pendek)
- Gunakan emoji secukupnya
- Jika tidak tahu jawabannya, arahkan ke admin
- Jangan mengarang informasi produk yang tidak ada di daftar
- Sapa dengan ramah di awal percakapan`;
}

/**
 * Generate an AI reply with tenant context and conversation history.
 * @param {string} customerMessage - The incoming message
 * @param {object} businessContext - Tenant's business.json content
 * @param {Array} history - Recent conversation messages [{role, content}]
 * @returns {Promise<string>} AI-generated reply
 */
export async function generateReply(customerMessage, businessContext, history = []) {
  const systemPrompt = buildSystemPrompt(businessContext);

  // Build messages array: system + history + current message
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: customerMessage },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('[ai] OpenAI error:', err.message);
    return businessContext.greeting || 'Maaf, sistem sedang mengalami gangguan. Silakan coba lagi nanti ya. 🙏';
  }
}
