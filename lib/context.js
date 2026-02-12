import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedContext = null;

/**
 * Load business context from data/business.json.
 * Falls back to data/business-example.json if not found.
 */
export function loadBusinessContext() {
  if (cachedContext) return cachedContext;

  const dataDir = join(__dirname, '..', 'data');

  try {
    const raw = readFileSync(join(dataDir, 'business.json'), 'utf-8');
    cachedContext = JSON.parse(raw);
  } catch {
    const raw = readFileSync(join(dataDir, 'business-example.json'), 'utf-8');
    cachedContext = JSON.parse(raw);
  }

  return cachedContext;
}

/**
 * Build a system prompt from the business context for the AI.
 */
export function buildSystemPrompt(ctx) {
  const products = ctx.products
    .map(p => `- ${p.name}: Rp${p.price.toLocaleString('id-ID')} — ${p.description}${p.stock ? '' : ' (HABIS)'}`)
    .join('\n');

  const faq = ctx.faq
    .map(f => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  const payments = ctx.paymentMethods?.join(', ') || '-';

  return `Kamu adalah asisten WhatsApp untuk "${ctx.businessName}".
${ctx.description}

NADA BICARA: ${ctx.tone}
BAHASA: ${ctx.language}

JAM OPERASIONAL: ${ctx.operatingHours.days}, ${ctx.operatingHours.hours} ${ctx.operatingHours.timezone}

PRODUK:
${products}

METODE PEMBAYARAN: ${payments}

FAQ:
${faq}

INSTRUKSI TAMBAHAN:
${ctx.additionalInstructions || 'Tidak ada.'}

ATURAN:
- Jawab dalam Bahasa Indonesia
- Jawab singkat dan jelas, cocok untuk WhatsApp (maks 3-4 paragraf pendek)
- Gunakan emoji secukupnya
- Jika tidak tahu jawabannya, arahkan ke admin
- Jangan mengarang informasi produk yang tidak ada di daftar
- Sapa dengan ramah di awal percakapan`;
}
