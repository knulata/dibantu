import OpenAI from 'openai';
import { loadBusinessContext, buildSystemPrompt } from './context.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate an AI reply for a customer message.
 * @param {string} customerMessage - The incoming message text
 * @returns {Promise<string>} AI-generated reply
 */
export async function generateReply(customerMessage) {
  const ctx = loadBusinessContext();
  const systemPrompt = buildSystemPrompt(ctx);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: customerMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('[ai] OpenAI error:', err.message);
    return ctx.greeting || 'Maaf, sistem sedang mengalami gangguan. Silakan coba lagi nanti ya. 🙏';
  }
}
