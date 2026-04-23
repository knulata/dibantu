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
  BPOM_RENEWAL,
} from './knowledge.js';

const SYSTEM_PROMPT_ADDENDUM = `User sedang di skill **BPOM**. Alur kerja yang benar:

1. **Deteksi niat — pendaftaran baru vs perpanjangan.** Kalau user menyebut "perpanjang", "renewal", "daftar ulang", "registrasi ulang", "izin saya expired", atau memberi nomor izin lama (TR/POM TR/QD/QL/MD/ML/NA/POM TI/POM SD dst) → set \`mode: 'perpanjangan'\` di session dan langsung panggil \`cek_renewal_bpom\`. JANGAN mulai dari checklist pendaftaran baru — dokumennya berbeda dan lebih sedikit.
2. **Kalau pendaftaran baru:** mulai dengan \`classify_jalur_bpom\`. Setelah jalur jelas, \`cek_dokumen_bpom\`.
3. Saat user ingin draft akhir (form Siripo/notifkos/asrot), gunakan \`siapkan_draft_bpom\` lalu \`request_qs_review\` — JANGAN bilang "selesai" sebelum QS review jalan.
4. Kalau user kirim foto dokumen perusahaan atau label produk, pakai \`extract_document\`.
5. Kalau user bertanya spesifik tentang rejection, timeline, biaya, atau helpdesk: panggil \`lookup_knowledge_bpom\`.

**KRITIS — PIRT vs BPOM**: PIRT diterbitkan Dinkes Kabupaten/Kota via OSS, BUKAN BPOM. Produk berisiko (susu, daging olahan, AMDK, makanan bayi, kaleng) TIDAK boleh PIRT — harus MD. Jelaskan dengan tegas kalau user bingung.

**KRITIS — renewal per jalur**:
- **Kosmetik**: 3 tahun (bukan 5). Perpanjang ≤ 30 hari sebelum expired. Lewat = notifikasi baru (nomor berubah).
- **Pangan MD/ML + OTSK**: 5 tahun. Ajukan ≤ 6 bulan sebelum expired. Lewat = pendaftaran baru (nomor berubah = kemasan/stiker harus dicetak ulang).
- **Semua jalur**: kalau ada perubahan sekecil apapun (label, pabrik, supplier, komposisi), WAJIB Variasi dulu atau bundling. Jangan renew diam-diam dengan kemasan baru — itu alasan penolakan umum.
- **Upstream check OTSK**: izin industri (IOT/UKOT/UMOT) + CPOTB wajib masih berlaku SEBELUM mulai renewal. Kalau expired, renewal OTSK pasti ditolak — urus upstream dulu.`;

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
      name: 'cek_renewal_bpom',
      description: 'Handle BPOM renewal / perpanjangan / daftar ulang. Panggil ini (BUKAN cek_dokumen_bpom) ketika user ingin memperpanjang izin yang sudah ada — bukan mendaftarkan produk baru. Mengembalikan checklist dokumen renewal, jendela waktu, gotchas, dan peringatan upstream (izin industri / CPOTB / LoA yang wajib masih aktif).',
      parameters: {
        type: 'object',
        properties: {
          jalur: {
            type: 'string',
            enum: ['pirt', 'pangan_md', 'pangan_ml', 'notifkos', 'otsk'],
            description: 'Jalur izin yang mau diperpanjang.',
          },
          nomorIzinLama: {
            type: 'string',
            description: 'Nomor izin edar lama (contoh: MD 234567890123, POM TR 123456789, NA 12345678, POM QD 234567890). Membantu QS verifikasi registrasi.',
          },
          tanggalExpired: {
            type: 'string',
            description: 'Tanggal expired izin (format YYYY-MM-DD atau "belum tahu"). Dipakai untuk menilai apakah masih dalam jendela renewal atau sudah lewat.',
          },
          adaPerubahan: {
            type: 'boolean',
            description: 'True kalau ada perubahan sejak registrasi terakhir (desain label, komposisi, nama dagang, alamat pabrik, supplier bahan baku, klaim). Satu perubahan kecil pun = WAJIB Variasi, bukan renewal biasa.',
          },
          catatanPerubahan: {
            type: 'string',
            description: 'Kalau adaPerubahan=true, jelaskan singkat apa yang berubah.',
          },
        },
        required: ['jalur'],
      },
    },
    handler: async ({ args, ctx }) => {
      const info = BPOM_RENEWAL[args.jalur];
      if (!info) {
        return { error: `Jalur ${args.jalur} belum punya knowledge renewal.` };
      }

      ctx.session.bpom = ctx.session.bpom || {};
      ctx.session.bpom.jalur = args.jalur;
      ctx.session.bpom.mode = 'perpanjangan';
      ctx.session.bpom.renewal = {
        nomorIzinLama: args.nomorIzinLama || null,
        tanggalExpired: args.tanggalExpired || null,
        adaPerubahan: args.adaPerubahan || false,
        catatanPerubahan: args.catatanPerubahan || null,
      };

      // Jendela check
      let windowStatus = 'tidak_diketahui';
      let windowNote = null;
      if (args.tanggalExpired && /^\d{4}-\d{2}-\d{2}$/.test(args.tanggalExpired)) {
        const exp = new Date(args.tanggalExpired);
        const now = new Date();
        const daysLeft = Math.round((exp - now) / 86400000);
        const idealWindow = args.jalur === 'notifkos' ? 30 : 180;
        if (daysLeft < 0) {
          windowStatus = 'lewat';
          windowNote = `Izin sudah expired ${Math.abs(daysLeft)} hari yang lalu. Jalur renewal TIDAK BISA dipakai — harus pendaftaran BARU dengan nomor izin baru. Kemasan/stiker yang beredar dengan nomor lama wajib ditarik & dicetak ulang.`;
        } else if (daysLeft <= idealWindow) {
          windowStatus = 'ideal';
          windowNote = `${daysLeft} hari sampai expired — masih dalam jendela renewal${args.jalur === 'notifkos' ? ' kosmetik (≤ 30 hari)' : ' (≤ 6 bulan)'}. Ajukan secepatnya.`;
        } else {
          windowStatus = 'terlalu_awal_tapi_oke';
          windowNote = `${daysLeft} hari sampai expired. ${args.jalur === 'notifkos' ? 'Kosmetik biasanya dibuka ≤ 30 hari sebelum expired.' : 'Boleh mulai siapkan dokumen sekarang, submit paling aman 3–6 bulan sebelum expired.'}`;
        }
      }

      // Variasi warning
      let variasiWarning = null;
      if (args.adaPerubahan) {
        variasiWarning = `Ada perubahan dideklarasikan (${args.catatanPerubahan || 'tidak dispesifikasi'}). Ini WAJIB jalur Variasi — bisa diajukan bareng renewal, tapi TIDAK BOLEH renew diam-diam dengan kemasan/label baru. BPOM pasti menolak kalau ketahuan pasca-verifikasi.`;
      }

      // Upstream check untuk OTSK & notifkos
      let upstreamCheck = null;
      if (args.jalur === 'otsk') {
        upstreamCheck = 'Sebelum mulai: verifikasi izin industri (IOT/IEBA/UKOT/UMOT atau izin industri farmasi) dan Sertifikat CPOTB masih berlaku. Kalau salah satu expired, urus upstream dulu — renewal OTSK pasti ditolak.';
      } else if (args.jalur === 'notifkos') {
        upstreamCheck = 'Sebelum mulai: verifikasi Sertifikat CPKB atau Surat Pernyataan Penerapan CPKB masih aktif. DIP (Dokumen Informasi Produk) harus updated dan disimpan ≥ 6 tahun.';
      } else if (args.jalur === 'pangan_ml') {
        upstreamCheck = 'Sebelum mulai: LoA dari produsen asing WAJIB masih berlaku (legalisasi KBRI). LoA expired = penyebab #1 renewal ML macet — minta principal perbarui dulu.';
      }

      return {
        ok: true,
        jalur: args.jalur,
        mode: 'perpanjangan',
        info: JALUR_DEFINITIONS[args.jalur],
        window: { status: windowStatus, note: windowNote, portal: info.portal },
        dokumenRenewal: info.dokumen,
        timeline: info.timeline,
        gotchas: info.gotchas,
        upstreamCheck,
        variasiWarning,
        perbedaanDariPendaftaranBaru: 'Renewal tidak butuh semua dokumen pendaftaran baru — tidak perlu ulang uji lab lengkap, formula kualitatif+kuantitatif, CoA bahan baku dari nol (kecuali ada perubahan). Cukup dokumen bukti izin lama + dokumen pendukung yang masih aktif + uji produk jadi terbaru.',
        instruksi: 'Setelah user konfirmasi dokumen siap, panggil siapkan_draft_bpom (jalur sama) untuk kompilasi draft — lalu request_qs_review dengan mode="perpanjangan" di payload.',
      };
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
            enum: ['cheat_sheet', 'helpdesk', 'rejection', 'jalur_detail', 'dokumen', 'renewal'],
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
        case 'renewal':
          return { jalur: args.jalur, renewal: BPOM_RENEWAL[args.jalur] || null };
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
