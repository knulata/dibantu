/**
 * lib/skills/bpom/index.js — BPOM paperwork skill.
 *
 * Covers: PIRT (Dinkes), Pangan MD/ML, Notifkos (kosmetik), OTSK
 * (obat tradisional/suplemen). First action is always jalur classification
 * so user doesn't mistakenly start a flow they don't qualify for.
 */

import {
  JALUR_DEFINITIONS,
  BPOM_DOCUMENTS,
  BPOM_REJECTION_REASONS,
  BPOM_HELPDESK,
  BPOM_CHEAT_SHEET,
} from './knowledge.js';

const SYSTEM_PROMPT_ADDENDUM = `User sedang di skill **BPOM**. Alur kerja yang benar:

1. **Selalu mulai dengan jalur classification**. Panggil tool \`classify_jalur_bpom\` begitu user menyebut produk. Jangan asal tanya dokumen sebelum tahu jalurnya.
2. Setelah jalur jelas, jalankan \`cek_dokumen_bpom\` dengan jalur tersebut untuk cek kesiapan dokumen.
3. Saat user ingin menyiapkan draft akhir (form Siripo/notifkos/asrot), gunakan \`siapkan_draft_bpom\` kemudian \`request_qs_review\` — JANGAN langsung "selesai".
4. Kalau user kirim foto dokumen perusahaan atau label produk, pakai \`extract_document\`.
5. Kalau user bertanya spesifik tentang rejection, timeline, biaya, atau helpdesk: panggil \`lookup_knowledge_bpom\`.

**KRITIS — PIRT vs BPOM**: PIRT diterbitkan Dinkes Kabupaten/Kota via OSS, BUKAN BPOM. Produk berisiko (susu, daging olahan, AMDK, makanan bayi, kaleng) TIDAK boleh PIRT — harus MD. Jelaskan ini dengan tegas kalau user bingung.

**KRITIS — renewal kosmetik**: 3 tahun (bukan 5), dan harus diperpanjang ≤ 30 hari sebelum expired kalau mau nomor tetap sama. Lewat tenggat = notifikasi baru.`;

const tools = [
  {
    schema: {
      name: 'classify_jalur_bpom',
      description: 'Klasifikasikan produk user ke jalur BPOM yang tepat (pirt, pangan_md, pangan_ml, notifkos, otsk) berdasarkan deskripsi produk. Selalu panggil ini SEBELUM memberi saran spesifik.',
      parameters: {
        type: 'object',
        properties: {
          deskripsi: { type: 'string', description: 'Deskripsi produk dari user: jenis, komposisi, skala produksi, domestik/impor, klaim.' },
          isRumahTangga: { type: 'boolean', description: 'True kalau diproduksi skala rumah tangga (bukan industri pabrik).' },
          isImpor: { type: 'boolean', description: 'True kalau produk diimpor.' },
          klaimKesehatan: { type: 'boolean', description: 'True kalau ada klaim khasiat kesehatan (jamu, suplemen).' },
        },
        required: ['deskripsi'],
      },
    },
    handler: async ({ args, ctx }) => {
      const d = args.deskripsi.toLowerCase();

      // Kosmetik detection
      if (/skincare|kosmetik|krim|lipstik|sabun muka|serum|toner|masker wajah|parfum|shampoo|conditioner|body lotion|sunscreen|bedak/.test(d)) {
        const jalur = 'notifkos';
        ctx.session.bpom = { ...(ctx.session.bpom || {}), jalur };
        return { jalur, info: JALUR_DEFINITIONS[jalur], alasan: 'Terdeteksi produk kosmetik — wajib Notifikasi Kosmetik BPOM via notifkos.pom.go.id.', warning: 'Pabrik WAJIB punya Sertifikat CPKB atau Surat Pernyataan Penerapan CPKB. Masa berlaku notifikasi hanya 3 tahun.' };
      }

      // OTSK detection
      if (args.klaimKesehatan || /jamu|herbal|obat tradisional|suplemen|kapsul herbal|fitofarmaka|balsam|minyak angin|obat kuasi|tolak angin/.test(d)) {
        const jalur = 'otsk';
        ctx.session.bpom = { ...(ctx.session.bpom || {}), jalur };
        return { jalur, info: JALUR_DEFINITIONS[jalur], alasan: 'Terdeteksi produk herbal/suplemen/obat tradisional — wajib daftar asrot.pom.go.id.', warning: 'Rejection #1 di jalur ini adalah BKO (Bahan Kimia Obat) seperti sildenafil/parasetamol/deksametason. Pastikan TIDAK ADA BKO sebelum pengajuan.' };
      }

      // Risky foods → MD even if user thinks PIRT
      const risky = /amdk|air minum dalam kemasan|susu|daging olahan|makanan bayi|makanan kaleng|kaleng|nugget|sosis|kornet|formula bayi/.test(d);
      if (risky) {
        const jalur = args.isImpor ? 'pangan_ml' : 'pangan_md';
        ctx.session.bpom = { ...(ctx.session.bpom || {}), jalur };
        return {
          jalur,
          info: JALUR_DEFINITIONS[jalur],
          alasan: `Produk ini berisiko tinggi (${d.match(/amdk|susu|daging olahan|makanan bayi|kaleng/)?.[0] || 'berisiko'}) — WAJIB pangan MD/ML, TIDAK BOLEH PIRT.`,
          warning: 'PIRT hanya untuk pangan kering/stabil rendah risiko skala rumah tangga. Produk kamu tidak masuk kriteria.',
        };
      }

      // Rumah tangga + pangan stabil → PIRT
      if (args.isRumahTangga && !args.isImpor) {
        const jalur = 'pirt';
        ctx.session.bpom = { ...(ctx.session.bpom || {}), jalur };
        return { jalur, info: JALUR_DEFINITIONS[jalur], alasan: 'Produksi rumah tangga + pangan stabil → jalur PIRT (via OSS → Dinkes Kabupaten/Kota). BUKAN BPOM.', warning: 'PIRT diterbitkan Dinas Kesehatan Kab/Kota, bukan BPOM. Gratis, 7–30 HK.' };
      }

      // Impor pangan → ML
      if (args.isImpor) {
        const jalur = 'pangan_ml';
        ctx.session.bpom = { ...(ctx.session.bpom || {}), jalur };
        return { jalur, info: JALUR_DEFINITIONS[jalur], alasan: 'Produk pangan impor → jalur Pangan ML.', warning: 'Butuh LoA legalisasi KBRI + Health Certificate + GMP/HACCP produsen asing.' };
      }

      // Default: MD
      const jalur = 'pangan_md';
      ctx.session.bpom = { ...(ctx.session.bpom || {}), jalur };
      return { jalur, info: JALUR_DEFINITIONS[jalur], alasan: 'Default ke jalur Pangan MD (dalam negeri). Konfirmasi ke user kalau memang benar pangan olahan skala industri.', warning: 'Kalau skala rumah tangga + produk rendah risiko, mungkin cocoknya PIRT — tanyakan ke user.' };
    },
  },
  {
    schema: {
      name: 'cek_dokumen_bpom',
      description: 'Cek kesiapan dokumen untuk jalur BPOM yang sudah diklasifikasi. Gunakan setelah classify_jalur_bpom.',
      parameters: {
        type: 'object',
        properties: {
          jalur: { type: 'string', enum: ['pirt', 'pangan_md', 'pangan_ml', 'notifkos', 'otsk'] },
          dokumenUser: {
            type: 'object',
            description: 'Map dokumen → "ya" | "tidak" | "tidak_yakin"',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['jalur'],
      },
    },
    handler: async ({ args, ctx }) => {
      const list = BPOM_DOCUMENTS[args.jalur] || [];
      const user = args.dokumenUser || {};
      const siap = list.filter((d) => user[d] === 'ya');
      const kurang = list.filter((d) => user[d] !== 'ya');
      ctx.session.bpom = ctx.session.bpom || {};
      ctx.session.bpom.dokumenStatus = user;
      return {
        jalur: args.jalur,
        totalDokumen: list.length,
        siap: siap.length,
        kurangCount: kurang.length,
        kurang,
        siapDaftar: kurang.length === 0,
        catatan: kurang.length
          ? `Masih kurang ${kurang.length} dari ${list.length} dokumen. Fokus ke NIB + NPWP + izin usaha dulu kalau masih nol, baru uji lab dan label.`
          : 'Dokumen lengkap. Lanjut siapkan draft form via siapkan_draft_bpom.',
      };
    },
  },
  {
    schema: {
      name: 'siapkan_draft_bpom',
      description: 'Kompilasi draft akhir (isi form, daftar dokumen siap upload, checklist label) yang siap dipakai user untuk mendaftar di portal BPOM. Setelah ini, WAJIB panggil request_qs_review sebelum kirim ke user sebagai final.',
      parameters: {
        type: 'object',
        properties: {
          jalur: { type: 'string', enum: ['pirt', 'pangan_md', 'pangan_ml', 'notifkos', 'otsk'] },
          draft: {
            type: 'object',
            description: 'Struktur draft: namaProduk, namaPerusahaan, nib, npwp, kategori, komposisi, label, catatan',
          },
        },
        required: ['jalur', 'draft'],
      },
    },
    handler: async ({ args, ctx }) => {
      ctx.session.bpom = ctx.session.bpom || {};
      ctx.session.bpom.draftSiap = args.draft;
      ctx.session.bpom.draftJalur = args.jalur;
      return {
        ok: true,
        info: JALUR_DEFINITIONS[args.jalur],
        rejectionChecklist: BPOM_REJECTION_REASONS[args.jalur] || [],
        instruksi: 'Sekarang panggil request_qs_review dengan kind="bpom_draft_" + jalur dan payload=draft ini. Jangan bilang ke user "sudah selesai" sebelum review jalan.',
      };
    },
  },
  {
    schema: {
      name: 'lookup_knowledge_bpom',
      description: 'Ambil fakta spesifik dari knowledge base BPOM: rejection, helpdesk, jalur detail, cheat sheet, dokumen list per jalur.',
      parameters: {
        type: 'object',
        properties: {
          topik: {
            type: 'string',
            enum: ['cheat_sheet', 'helpdesk', 'rejection', 'jalur_detail', 'dokumen'],
          },
          jalur: {
            type: 'string',
            enum: ['pirt', 'pangan_md', 'pangan_ml', 'notifkos', 'otsk'],
            description: 'Spesifikkan jalur jika topik butuh (rejection, jalur_detail, dokumen).',
          },
        },
        required: ['topik'],
      },
    },
    handler: async ({ args }) => {
      switch (args.topik) {
        case 'cheat_sheet':
          return { cheatSheet: BPOM_CHEAT_SHEET };
        case 'helpdesk':
          return BPOM_HELPDESK;
        case 'rejection':
          return { jalur: args.jalur, reasons: BPOM_REJECTION_REASONS[args.jalur] || [] };
        case 'jalur_detail':
          return { jalur: args.jalur, detail: JALUR_DEFINITIONS[args.jalur] };
        case 'dokumen':
          return { jalur: args.jalur, dokumen: BPOM_DOCUMENTS[args.jalur] || [] };
        default:
          return { error: 'Topik tidak dikenal' };
      }
    },
  },
];

export default {
  name: 'bpom',
  displayName: 'BPOM (Pangan, Kosmetik, Obat Tradisional)',
  shortDescription: 'Bantu daftar & renewal izin edar BPOM — pangan MD/ML, notifkos, OTSK, serta coaching PIRT.',
  systemPromptAddendum: SYSTEM_PROMPT_ADDENDUM,
  knowledgeSummary: BPOM_CHEAT_SHEET,
  tools,
};
