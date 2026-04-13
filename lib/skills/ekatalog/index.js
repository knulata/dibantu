/**
 * lib/skills/ekatalog/index.js — LKPP e-Katalog skill.
 *
 * Ported from ekatalog-bot. Three functional flows live inside tools:
 *   - cek_dokumen_ekatalog: walks the penyedia document checklist
 *   - simpan_profil_ekatalog: captures + polishes company profile
 *   - tambah_produk_ekatalog: captures + validates a product listing
 *   - extract_document: OCR on uploaded NIB/NPWP/akta etc.
 */

import { extractCompanyDocument } from '../../vision.js';
import OpenAI from 'openai';
import { EKATALOG_DOCUMENTS, EKATALOG_REJECTIONS, EKATALOG_KNOWLEDGE, EKATALOG_PROFIL_FIELDS } from './knowledge.js';
import { PROFIL_REWRITE_PROMPT, PRODUK_EXTRACT_PROMPT } from './prompts.js';

let _openai;
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const KNOWLEDGE_SUMMARY = `### Knowledge: LKPP e-Katalog v6 (launched Jan 2025)

**Portals:**
- https://sikap.lkpp.go.id — pendaftaran penyedia
- https://e-katalog.lkpp.go.id — etalase & upload produk
- https://katalog.inaproc.id — publik
- Helpdesk Katalog: WA **0811-1557-709** (Sen-Jum 09:00-18:00 WIB), email layanan@lkpp.go.id, call 144

**Jalur utama untuk UMKM:** mulai dari Katalog Lokal via UKPBJ Pemda (paling mudah), atau Toko Daring via mitra (Blibli/Bhinneka/dll).

**Syarat penyedia (definitive):** NIB (OSS, KBLI sesuai), NPWP aktif, KTP direktur, akta + SK Kemenkumham (PT/CV), izin usaha KBLI, rekening perusahaan, surat pernyataan LKPP, sertifikasi TKDN (self-declare 3 HK gratis via tkdn.kemenperin.go.id untuk industri kecil — Permenperin 35/2025), sertifikat produk kategori (SNI/alkes/halal/ISO), bukan daftar hitam, SPT pajak. Biaya pendaftaran Rp 0.

**Field produk (6 tab):** Informasi Produk → KBKI → Spesifikasi (dinamis per etalase) → Harga + Satuan + Ongkir + PPN + Masa Berlaku Harga + Min/Max Qty + TKDN% + BMP% → Dokumen Pendukung Harga (PDF/JPG) → Gambar minimal 1 utama → Tayangkan.

**Review produk baru v6:** ~5 hari kerja.

**Validitas:** Tidak ada renewal universal. Yang bikin auto-deactivate: masa berlaku harga habis, sertifikat TKDN/izin edar/SNI expired, verifikator minta revisi ≥ 3 hari tanpa respons, spesifikasi mismatch dokumen pendukung.

**Top rejection reasons:**
1. Dokumen legal expired (NIB/NPWP/izin usaha/SBU/sertifikat produk).
2. Spesifikasi teknis ≠ dokumen pendukung / brosur.
3. Harga tidak wajar atau tanpa HPP.
4. Gambar / file rusak / format salah / penamaan tidak sesuai.
5. Kategori etalase atau KBKI salah; atau tidak respons verifikator dalam 3 hari.`;

const SYSTEM_PROMPT_ADDENDUM = `User sedang di skill **LKPP e-Katalog**. Bantu mereka:
1. Cek kesiapan dokumen penyedia (gunakan tool cek_dokumen_ekatalog).
2. Siapkan profil perusahaan untuk halaman e-Katalog (gunakan tool simpan_profil_ekatalog — bisa input manual atau dari OCR NIB/NPWP).
3. Siapkan listing produk yang tidak di-reject (gunakan tool tambah_produk_ekatalog).

Utamakan **Katalog Lokal via UKPBJ Pemda** untuk UMKM kecuali user punya alasan spesifik pilih Nasional/Sektoral.`;

// ---------- tools ----------

const tools = [
  {
    schema: {
      name: 'cek_dokumen_ekatalog',
      description: 'Cek kesiapan dokumen pendaftaran penyedia e-Katalog LKPP. Untuk setiap dokumen, tandai punya / belum / tidak yakin. Tool mengembalikan ringkasan + daftar yang masih kurang.',
      parameters: {
        type: 'object',
        properties: {
          dokumen: {
            type: 'object',
            description: 'Map dokumen_id → "ya" | "tidak" | "tidak_yakin"',
            additionalProperties: { type: 'string', enum: ['ya', 'tidak', 'tidak_yakin'] },
          },
        },
        required: ['dokumen'],
      },
    },
    handler: async ({ args, ctx }) => {
      const has = args.dokumen || {};
      const missing = EKATALOG_DOCUMENTS.filter((d) => has[d.id] !== 'ya').map((d) => d.label);
      const ready = EKATALOG_DOCUMENTS.filter((d) => has[d.id] === 'ya').length;
      const total = EKATALOG_DOCUMENTS.length;
      ctx.session.ekatalog = ctx.session.ekatalog || {};
      ctx.session.ekatalog.dokumen = has;
      return {
        totalDokumen: total,
        siap: ready,
        kurang: missing,
        siapDaftar: missing.length === 0,
        catatan: missing.length
          ? `Masih kurang ${missing.length} dokumen. Prioritaskan NIB + NPWP + izin usaha dulu sebelum TKDN.`
          : 'Dokumen lengkap. Silakan lanjut daftar SIKaP → verifikasi di LPSE terdekat.',
      };
    },
  },
  {
    schema: {
      name: 'simpan_profil_ekatalog',
      description: 'Simpan data profil perusahaan untuk halaman e-Katalog. Panggil setelah mengumpulkan semua field dari user (atau dari OCR). Tool mengembalikan versi deskripsi yang sudah diformat untuk e-Katalog.',
      parameters: {
        type: 'object',
        properties: {
          nama: { type: 'string' },
          bentukUsaha: { type: 'string' },
          alamat: { type: 'string' },
          npwp: { type: 'string' },
          nib: { type: 'string' },
          telepon: { type: 'string' },
          email: { type: 'string' },
          direktur: { type: 'string' },
          kbli: { type: 'string' },
          deskripsiKasar: { type: 'string', description: 'Deskripsi usaha dari user, bahasa apa adanya.' },
        },
        required: ['nama', 'deskripsiKasar'],
      },
    },
    handler: async ({ args, ctx }) => {
      const ctxText = `Nama: ${args.nama}\nBentuk: ${args.bentukUsaha || '-'}\nKBLI: ${args.kbli || '-'}\nDeskripsi kasar: ${args.deskripsiKasar}`;
      const completion = await openai().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: PROFIL_REWRITE_PROMPT },
          { role: 'user', content: ctxText },
        ],
        max_tokens: 400,
        temperature: 0.3,
      });
      const deskripsi = completion.choices[0].message.content.trim();
      ctx.session.ekatalog = ctx.session.ekatalog || {};
      ctx.session.ekatalog.profil = { ...args, deskripsi };
      return { profil: { ...args, deskripsi }, siapUntukReview: true };
    },
  },
  {
    schema: {
      name: 'tambah_produk_ekatalog',
      description: 'Parse free-text product description into a structured e-Katalog listing entry. Returns {nama, kategori, spesifikasi, tkdn, harga, satuan, merek}. Validates against common rejection reasons.',
      parameters: {
        type: 'object',
        properties: {
          deskripsi: { type: 'string', description: 'Deskripsi produk bebas dari user.' },
        },
        required: ['deskripsi'],
      },
    },
    handler: async ({ args, ctx }) => {
      const completion = await openai().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: PRODUK_EXTRACT_PROMPT },
          { role: 'user', content: args.deskripsi },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0.2,
      });
      let parsed = {};
      try {
        parsed = JSON.parse(completion.choices[0].message.content);
      } catch (err) {
        return { error: 'Gagal parse produk', raw: completion.choices[0].message.content };
      }
      const warnings = [];
      const d = parsed.extractedData || {};
      if (!d.harga) warnings.push('Harga belum ada — wajib ada dengan satuan + masa berlaku.');
      if (!d.spesifikasi) warnings.push('Spesifikasi teknis kosong — ini penyebab rejection #2.');
      if (!d.tkdn && d.tkdn !== 0) warnings.push('TKDN belum diisi — self-declare gratis 3 HK via tkdn.kemenperin.go.id untuk industri kecil.');
      if (!d.merek) warnings.push('Merek belum diisi.');
      ctx.session.ekatalog = ctx.session.ekatalog || {};
      ctx.session.ekatalog.produk = ctx.session.ekatalog.produk || [];
      ctx.session.ekatalog.produk.push(d);
      return { produk: d, warnings, guidance: parsed.botMessage || '' };
    },
  },
  {
    schema: {
      name: 'extract_document',
      description: 'Ekstrak data dari foto dokumen perusahaan (NIB, NPWP, akta, SIUP, sertifikat, label produk) yang user kirim. Panggil setiap kali user mengirim gambar. Gunakan source_id dari pesan sistem.',
      parameters: {
        type: 'object',
        properties: {
          source_id: { type: 'string', description: 'ID sumber gambar dari context (image attachment).' },
          jenis: { type: 'string', description: 'Tebakan jenis dokumen (NIB, NPWP, akta, dll).' },
        },
        required: ['source_id'],
      },
    },
    handler: async ({ ctx }) => {
      if (!ctx.imageDataUrl) return { error: 'Tidak ada gambar yang bisa dibaca pada giliran ini.' };
      const { extractedData, confidence } = await extractCompanyDocument(ctx.imageDataUrl);
      ctx.session.lastExtracted = extractedData;
      return { extractedData, confidence, catatan: 'Hasil OCR bisa salah — konfirmasikan ke user sebelum dipakai.' };
    },
  },
  {
    schema: {
      name: 'lookup_knowledge_ekatalog',
      description: 'Ambil fakta spesifik dari knowledge base e-Katalog: rejection reasons, TKDN rules, validity, helpdesk kontak, perbedaan v5 vs v6. Gunakan kalau user bertanya pertanyaan spesifik tentang LKPP.',
      parameters: {
        type: 'object',
        properties: {
          topik: {
            type: 'string',
            enum: ['rejection', 'tkdn', 'validity', 'helpdesk', 'v6_changes', 'jalur', 'field_produk'],
          },
        },
        required: ['topik'],
      },
    },
    handler: async ({ args }) => EKATALOG_KNOWLEDGE[args.topik] || { error: 'Topik tidak dikenal' },
  },
];

export default {
  name: 'ekatalog',
  displayName: 'LKPP e-Katalog',
  shortDescription: 'Daftar jadi penyedia e-Katalog LKPP dan siapkan listing produk tanpa ditolak.',
  systemPromptAddendum: SYSTEM_PROMPT_ADDENDUM,
  knowledgeSummary: KNOWLEDGE_SUMMARY,
  tools,
};
