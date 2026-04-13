/**
 * lib/skills/kemenkes/index.js — Kemenkes skill (Regalkes, SATUSEHAT, OSS perizinan kesehatan).
 *
 * Priority vertical: PKRT Kelas 1 DN (simplest path — 10 HK, Rp 1jt, no clinical,
 * no ISO, UMKM-friendly). Secondary: Alkes A DN, IPAK, SIP.
 */

import {
  KEMENKES_JALUR,
  KEMENKES_DOCUMENTS,
  KEMENKES_REJECTIONS,
  KEMENKES_HELPDESK,
  KEMENKES_CHEAT_SHEET,
} from './knowledge.js';

const SYSTEM_PROMPT_ADDENDUM = `User sedang di skill **Kemenkes** ("Depkes"). Alur kerja:

1. **Selalu classify dulu** — produk alkes vs PKRT vs izin faskes vs SIP. Panggil tool \`classify_jalur_kemenkes\`.
2. Untuk produk baru, **rekomendasikan PKRT Kelas 1 DN sebagai starter** kalau memungkinkan — ini vertikal termudah (10 HK, Rp 1jt, tanpa uji klinis).
3. Untuk alkes, TANYAKAN risk class (A/B/C/D) — Kelas C/D wajib uji klinis, sangat mahal dan lama. Kalau user baru mulai dan produknya bisa diklasifikasi lebih rendah, bantu mereka identifikasi.
4. Setelah jalur jelas, \`cek_dokumen_kemenkes\` → \`siapkan_draft_kemenkes\` → \`request_qs_review\`.
5. Jangan pernah sebutkan food atau drugs di skill ini — itu BPOM.

**Fakta penting yang sering salah di LLM:**
- STR nakes sekarang **SEUMUR HIDUP** (UU 17/2023, bukan 5 tahun).
- SIP tetap 5 tahun per lokasi.
- SPPKRT / SPAK / CPAKB adalah sertifikat PRODUKSI (berbeda dari izin edar produk).
- Food/drug bukan Kemenkes — itu BPOM. Redirect dengan sopan.`;

const tools = [
  {
    schema: {
      name: 'classify_jalur_kemenkes',
      description: 'Klasifikasikan kebutuhan user ke jalur Kemenkes yang tepat. Selalu panggil ini SEBELUM memberi saran dokumen.',
      parameters: {
        type: 'object',
        properties: {
          deskripsi: { type: 'string', description: 'Deskripsi produk atau kebutuhan user.' },
          tipeKebutuhan: {
            type: 'string',
            enum: ['pkrt', 'alkes', 'ipak', 'sip', 'apotek_klinik', 'unknown'],
            description: 'Tebakan awal tipe kebutuhan.',
          },
          riskClassAlkes: {
            type: 'string',
            enum: ['A', 'B', 'C', 'D', 'unknown'],
            description: 'Risk class kalau alkes.',
          },
          isImpor: { type: 'boolean' },
        },
        required: ['deskripsi', 'tipeKebutuhan'],
      },
    },
    handler: async ({ args, ctx }) => {
      let jalur;
      let warning;

      if (args.tipeKebutuhan === 'pkrt') {
        jalur = 'pkrt_kelas1_dn';
        warning = 'Kalau produk PKRT-mu sederhana (sabun, tissue basah, deterjen) → Kelas 1 DN. Butuh SPPKRT dulu sebelum izin edar.';
      } else if (args.tipeKebutuhan === 'alkes') {
        if (args.isImpor) {
          jalur = 'akl';
          warning = 'Alkes impor butuh LoA distributor + CFS + ISO 13485 + CoA per batch.';
        } else {
          const cls = args.riskClassAlkes || 'A';
          jalur = cls === 'A' ? 'alkes_kelas_a_dn'
                : cls === 'B' ? 'alkes_kelas_b_dn'
                : cls === 'C' ? 'alkes_kelas_c_dn'
                : cls === 'D' ? 'alkes_kelas_d_dn'
                : 'alkes_kelas_a_dn';
          if (cls === 'C' || cls === 'D') warning = 'PERHATIAN: Kelas ' + cls + ' wajib uji klinis — biaya & waktu jauh lebih besar. Pastikan memang tidak bisa diklasifikasikan lebih rendah.';
          else warning = 'Butuh SPAK + Sertifikat CPAKB sebelum daftar izin edar. Technical file lengkap.';
        }
      } else if (args.tipeKebutuhan === 'ipak') {
        jalur = 'ipak';
        warning = 'Syarat paling error-prone: denah ruang yang pisahkan gudang dari kantor, dan PJT full-time dengan kualifikasi.';
      } else if (args.tipeKebutuhan === 'sip') {
        jalur = 'sip';
        warning = 'STR sekarang seumur hidup (UU 17/2023). SIP tetap 5 tahun, per lokasi praktik. Submit ≥ 3 bulan sebelum expire.';
      } else if (args.tipeKebutuhan === 'apotek_klinik') {
        jalur = 'apotek';
        warning = 'Mulai dari OSS (NIB + Sertifikat Standar), lalu DPMPTSP → Dinkes verifikasi. PP 28/2025 berlaku.';
      } else {
        jalur = 'pkrt_kelas1_dn';
        warning = 'Belum jelas — default ke PKRT Kelas 1 DN sebagai starter. Konfirmasi ke user apa produknya.';
      }

      ctx.session.kemenkes = ctx.session.kemenkes || {};
      ctx.session.kemenkes.jalur = jalur;
      return { jalur, info: KEMENKES_JALUR[jalur], warning };
    },
  },
  {
    schema: {
      name: 'cek_dokumen_kemenkes',
      description: 'Cek kesiapan dokumen untuk jalur Kemenkes yang sudah diklasifikasi.',
      parameters: {
        type: 'object',
        properties: {
          jalur: {
            type: 'string',
            enum: ['pkrt_kelas1_dn', 'alkes_kelas_a_dn', 'ipak', 'sip'],
          },
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
      const list = KEMENKES_DOCUMENTS[args.jalur] || [];
      const user = args.dokumenUser || {};
      const siap = list.filter((d) => user[d] === 'ya');
      const kurang = list.filter((d) => user[d] !== 'ya');
      ctx.session.kemenkes = ctx.session.kemenkes || {};
      ctx.session.kemenkes.dokumenStatus = user;
      return {
        jalur: args.jalur,
        totalDokumen: list.length,
        siap: siap.length,
        kurangCount: kurang.length,
        kurang,
        siapDaftar: kurang.length === 0,
        rejectionPotensi: KEMENKES_REJECTIONS[args.jalur] || [],
      };
    },
  },
  {
    schema: {
      name: 'siapkan_draft_kemenkes',
      description: 'Kompilasi draft akhir siap upload ke regalkes/satusehat. Setelah ini WAJIB panggil request_qs_review.',
      parameters: {
        type: 'object',
        properties: {
          jalur: { type: 'string' },
          draft: { type: 'object' },
        },
        required: ['jalur', 'draft'],
      },
    },
    handler: async ({ args, ctx }) => {
      ctx.session.kemenkes = ctx.session.kemenkes || {};
      ctx.session.kemenkes.draftSiap = args.draft;
      ctx.session.kemenkes.draftJalur = args.jalur;
      return {
        ok: true,
        info: KEMENKES_JALUR[args.jalur],
        rejectionChecklist: KEMENKES_REJECTIONS[args.jalur] || [],
        instruksi: 'Panggil request_qs_review dengan kind="kemenkes_draft_" + jalur sekarang.',
      };
    },
  },
  {
    schema: {
      name: 'lookup_knowledge_kemenkes',
      description: 'Ambil fakta spesifik dari knowledge base Kemenkes.',
      parameters: {
        type: 'object',
        properties: {
          topik: { type: 'string', enum: ['cheat_sheet', 'helpdesk', 'rejection', 'jalur_detail', 'dokumen'] },
          jalur: { type: 'string' },
        },
        required: ['topik'],
      },
    },
    handler: async ({ args }) => {
      switch (args.topik) {
        case 'cheat_sheet': return { cheatSheet: KEMENKES_CHEAT_SHEET };
        case 'helpdesk': return KEMENKES_HELPDESK;
        case 'rejection': return { jalur: args.jalur, reasons: KEMENKES_REJECTIONS[args.jalur] || [] };
        case 'jalur_detail': return { jalur: args.jalur, detail: KEMENKES_JALUR[args.jalur] };
        case 'dokumen': return { jalur: args.jalur, dokumen: KEMENKES_DOCUMENTS[args.jalur] || [] };
        default: return { error: 'Topik tidak dikenal' };
      }
    },
  },
];

export default {
  name: 'kemenkes',
  displayName: 'Kemenkes (Alkes, PKRT, IPAK, SIP)',
  shortDescription: 'Urus izin Kemenkes — PKRT Kelas 1 (10 HK, Rp 1jt), alkes A/B, IPAK, SIP, izin apotek/klinik.',
  systemPromptAddendum: SYSTEM_PROMPT_ADDENDUM,
  knowledgeSummary: KEMENKES_CHEAT_SHEET,
  tools,
};
