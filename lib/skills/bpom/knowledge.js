/**
 * lib/skills/bpom/knowledge.js — BPOM knowledge base.
 *
 * Every fact in this file comes from researched BPOM sources
 * (ereg-rba.pom.go.id, registrasipangan.pom.go.id, notifkos.pom.go.id,
 * asrot.pom.go.id, sppirt.pom.go.id, PerBPOM 23/2023, PP 32/2017).
 * Keep this file the single source of truth — tools return it verbatim.
 */

export const JALUR_DEFINITIONS = {
  pirt: {
    nama: 'PIRT (Pangan Industri Rumah Tangga)',
    penerbit: 'Dinas Kesehatan Kabupaten/Kota (via OSS, BUKAN BPOM)',
    scope: 'Pangan kering/stabil rendah risiko yang diproduksi rumah tangga. TIDAK boleh: susu, daging olahan, AMDK, makanan bayi, makanan kaleng — itu wajib MD.',
    masaBerlaku: '5 tahun',
    portal: 'https://oss.go.id (NIB → KBLI IRTP) → otomatis ke Dinkes Kab/Kota. BPOM juga ada https://sppirt.pom.go.id terintegrasi OSS.',
    timeline: '7–30 hari kerja (PKP daring + inspeksi lapangan)',
    biaya: 'Gratis (kecuali biaya PKP jika ada)',
  },
  pangan_md: {
    nama: 'Pangan Olahan MD (Dalam Negeri)',
    penerbit: 'BPOM — Direktorat Registrasi Pangan Olahan',
    scope: 'Pangan olahan yang diproduksi industri menengah-besar di dalam negeri, atau produk berisiko (AMDK, susu, daging olahan, makanan bayi, kaleng).',
    masaBerlaku: '5 tahun (auto-renew jika tanpa perubahan komposisi/label)',
    portal: 'Akun: https://ereg-rba.pom.go.id/ — Produk: https://registrasipangan.pom.go.id (Siripo)',
    timeline: 'Risiko Rendah/Sangat Rendah 5 HK, Risiko Sedang 5 HK, Risiko Tinggi 30 HK',
    biayaPNBP: 'Rp 300rb–Rp 3jt per produk (UMKM diskon 50%)',
  },
  pangan_ml: {
    nama: 'Pangan Olahan ML (Impor)',
    penerbit: 'BPOM — Direktorat Registrasi Pangan Olahan',
    scope: 'Pangan olahan yang diimpor. Butuh LoA + Health Cert + GMP/HACCP produsen asing.',
    masaBerlaku: '5 tahun',
    portal: 'Sama: ereg-rba.pom.go.id + registrasipangan.pom.go.id',
    timeline: 'Sama seperti MD, plus waktu verifikasi dokumen impor',
    biayaPNBP: 'Lebih tinggi dari MD',
  },
  notifkos: {
    nama: 'Notifikasi Kosmetik',
    penerbit: 'BPOM — Direktorat Pengawasan Kosmetik',
    scope: 'Semua produk kosmetik (skincare, make-up, toiletries, haircare, parfum).',
    masaBerlaku: '3 tahun (PERHATIAN: bukan 5 tahun seperti pangan)',
    portal: 'https://notifkos.pom.go.id/',
    timeline: 'Verifikasi awal ~3 HK, approval notifikasi ~14 HK',
    biayaPNBP: 'ASEAN: Rp 500rb per item. Non-ASEAN: Rp 1,5jt per item.',
    wajib: 'Pabrik wajib Sertifikat CPKB atau Surat Pernyataan Penerapan CPKB (UMKM golongan B). DIP (Dokumen Informasi Produk) wajib disimpan di pelaku usaha min 6 tahun.',
  },
  otsk: {
    nama: 'Obat Tradisional / Suplemen Kesehatan / Obat Kuasi (OTSK)',
    penerbit: 'BPOM — Direktorat Pengawasan OTSK',
    scope: 'Jamu, OHT (Obat Herbal Terstandar), Fitofarmaka, Suplemen Kesehatan, Obat Kuasi (balsam, minyak angin).',
    masaBerlaku: '5 tahun',
    portal: 'https://asrot.pom.go.id/asrot/',
    timeline: 'Pra-registrasi 20 HK + registrasi 30–60 HK (Low Risk jalur lebih cepat ~10 HK)',
    biayaPNBP: 'OT lokal Rp 100rb–2,5jt; Suplemen Rp 500rb–5jt per item; UMOT/UKOT diskon UMKM 50%.',
    wajib: 'Sertifikat CPOTB (atau bertahap), BAP sarana produksi, surat kuasa bermeterai.',
  },
};

export const BPOM_DOCUMENTS = {
  pangan_md: [
    'NIB (OSS-RBA) dengan KBLI industri pangan',
    'NPWP perusahaan',
    'Sertifikat Standar / Izin Usaha sesuai risk tier KBLI pangan',
    'PSB (Pemeriksaan Sarana Bangunan) atau PMR (Piagam Manajemen Risiko)',
    'Hasil uji lab terakreditasi KAN (mikrobiologi + cemaran logam + parameter spesifik per kategori)',
    'Spesifikasi bahan baku + BTP (food additives) dengan nomor INS',
    'Diagram alir proses produksi',
    'Label design final (PDF artwork)',
    'Foto kemasan (primer + sekunder)',
    'Sertifikat halal (opsional kecuali klaim halal)',
    'SNI bila produk wajib SNI (AMDK, garam, gula, tepung terigu, kakao bubuk, minyak goreng sawit, tuna/sarden kaleng, kopi instan)',
  ],
  pangan_ml: [
    '... semua dokumen MD di atas, plus:',
    'Letter of Authorization (LoA) dari produsen luar negeri — legalisasi KBRI',
    'Health Certificate / Certificate of Free Sale dari negara asal',
    'GMP / HACCP certificate pabrik asing',
    'Spesifikasi + CoA per batch',
  ],
  notifkos: [
    'NIB + KBLI kosmetik',
    'NPWP',
    'Akta + SK Kemenkumham',
    'Sertifikat CPKB ATAU Surat Pernyataan Penerapan CPKB (UMKM gol B)',
    'Surat Penunjukan Keagenan (untuk impor — legalised)',
    'Certificate of Free Sale (impor)',
    'LoA produsen asing (impor)',
    'Sertifikat merek atau surat kuasa merek',
    'DIP (Dokumen Informasi Produk) — wajib ada sebelum notifikasi, simpan ≥ 6 tahun',
    'Halal (opsional)',
  ],
  otsk: [
    'NIB, NPWP, akta pendirian',
    'Izin industri: IOT/IEBA/UKOT/UMOT (OT) atau izin industri farmasi (suplemen)',
    'Sertifikat CPOTB (atau bertahap)',
    'Formula kualitatif + kuantitatif (nama latin simplisia + bagian tanaman + kadar)',
    'Spesifikasi + CoA bahan baku',
    'Metode analisis',
    'Sertifikat analisis produk jadi (mikrobiologi, cemaran logam, aflatoksin, ALT/AKK)',
    'Uji stabilitas',
    'Data pendukung khasiat & keamanan (pustaka/uji praklinik/klinik sesuai klaim)',
    'Rancangan kemasan & brosur',
    'BAP sarana produksi + surat kuasa pemegang akun bermaterai',
  ],
  pirt: [
    'NIB dari OSS dengan KBLI Industri Rumah Tangga Pangan',
    'KTP pemilik',
    'Denah / peta lokasi produksi',
    'Foto produk + rancangan label',
    'Hasil PKP (Penyuluhan Keamanan Pangan) dari Dinkes',
    'Hasil IRTP (inspeksi sarana) Dinkes',
    '(Upload maks 500 KB per file)',
  ],
};

export const BPOM_REJECTION_REASONS = {
  pangan_md: [
    'Label tidak match form: nama jenis, netto, nomor pendaftaran placeholder, alergen tidak dicantumkan',
    'ING (Informasi Nilai Gizi) salah hitung per takaran saji',
    'Lab uji bukan terakreditasi KAN',
    'Bahan tidak diizinkan (pewarna non food-grade, bahan obat)',
    'Klaim gizi/kesehatan tanpa bukti',
    'Pabrik belum punya Sertifikat Standar atau PMR',
  ],
  notifkos: [
    'Bahan di negative list (Lampiran I PerBPOM) atau kadar melebihi batas (hydroquinone, AHA, tabir surya)',
    'Klaim medis dilarang ("memutihkan permanen", "menghilangkan bekas luka")',
    'INCI naming mismatch atau salah',
    'Artwork tidak memenuhi aturan pelabelan',
    'Pabrik kontrak / makloon CPKB sudah kedaluwarsa',
  ],
  otsk: [
    'Temuan BKO (Bahan Kimia Obat: sildenafil, parasetamol, deksametason) — rejection terbesar',
    'Klaim tidak didukung bukti ilmiah sesuai jalur (jamu=empiris, OHT=praklinik, fitofarmaka=klinik)',
    'CoA bahan tidak lengkap',
    'Uji stabilitas kurang',
    'Produsen bukan industri berizin',
    'Nomenklatur latin simplisia salah',
  ],
  pirt: [
    'Produk tidak eligible (berisiko — seharusnya MD)',
    'File upload > 500 KB',
    'Sarana tidak lulus inspeksi Dinkes',
  ],
};

export const BPOM_HELPDESK = {
  umum: {
    nama: 'Halo BPOM',
    telepon: '1500-533',
    whatsapp: '+62 811-9181-533',
    sms: '08121-9999-533',
    email: 'halobpom@pom.go.id',
    jam: 'Senin–Jumat 08:00–18:00 WIB',
    pengaduan: 'https://www.pom.go.id/pengaduan',
  },
  pangan: {
    nama: 'Direktorat Registrasi Pangan Olahan',
    telepon: '(021) 311-5195-1',
    liveChat: 'https://registrasipangan.pom.go.id (Senin–Kamis 09:00–15:00)',
  },
  kosmetik: {
    nama: 'CPKB / Notifkos',
    email: 'notifikasikosmetik@yahoo.com',
  },
  otsk: {
    nama: 'Direktorat OTSKK',
    telepon: '021-4244691 ext. 3553',
    alamat: 'Gedung Athena Lt.2, Jl. Percetakan Negara 23, Jakarta Pusat',
  },
};

export const BPOM_CHEAT_SHEET = `
### BPOM quick ref (cheat sheet)

| Jalur | Validity | PNBP | Timeline | Portal |
|---|---|---|---|---|
| PIRT | 5 thn | Gratis | 7–30 HK | oss.go.id / sppirt.pom.go.id (Dinkes) |
| Pangan MD | 5 thn | Rp 300k–3jt | 5–30 HK | registrasipangan.pom.go.id |
| Pangan ML | 5 thn | Lebih tinggi | 5–30 HK | registrasipangan.pom.go.id |
| Kosmetik Notifikasi | **3 thn** | 500k / 1.5jt | ~14 HK | notifkos.pom.go.id |
| OTSK (Jamu/OHT/FF/Suplemen) | 5 thn | 100k–5jt | 50–80 HK | asrot.pom.go.id |

**Semua jalur NIB-gated.** KBLI harus cocok sebelum mulai.
**TIDAK ada API publik BPOM** — semua pengajuan manual via portal.
**Halo BPOM:** 1500-533 / WA 0811-9181-533 / halobpom@pom.go.id (Sen-Jum 08-18 WIB).

**Renewal warning:** Kosmetik 3 tahun (30 hari sebelum expired via menu Perpanjangan — nomor tetap sama). Pangan/OTSK 5 tahun.`;
