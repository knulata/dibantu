/**
 * lib/skills/ekatalog/knowledge.js — LKPP e-Katalog knowledge base.
 * Researched facts, kept as data so tools can return them verbatim.
 */

export const EKATALOG_DOCUMENTS = [
  { id: 'nib', label: 'NIB (OSS) dengan KBLI sesuai produk' },
  { id: 'npwp', label: 'NPWP perusahaan aktif' },
  { id: 'ktp_direktur', label: 'KTP direktur/pemilik' },
  { id: 'akta', label: 'Akta pendirian + SK Kemenkumham (PT/CV)' },
  { id: 'izin_usaha', label: 'Izin usaha sesuai KBLI (SIUP atau izin sektor)' },
  { id: 'rekening', label: 'Rekening perusahaan atas nama badan usaha' },
  { id: 'surat_pernyataan', label: 'Surat pernyataan kesanggupan (template LKPP)' },
  { id: 'tkdn', label: 'Sertifikat TKDN — self-declare 3 HK gratis untuk industri kecil' },
  { id: 'sertifikat_produk', label: 'Sertifikat produk: SNI / izin edar / halal / ISO sesuai kategori' },
  { id: 'bukan_blacklist', label: 'Tidak sedang masuk daftar hitam LKPP' },
  { id: 'spt_pajak', label: 'SPT tahunan / bukti patuh pajak' },
  { id: 'sertifikat_umk', label: 'Sertifikat UMK (opsional, memberi prioritas)' },
];

export const EKATALOG_PROFIL_FIELDS = [
  { id: 'nama', label: 'Nama perusahaan' },
  { id: 'bentukUsaha', label: 'Bentuk usaha (PT/CV/UD/Perseorangan)' },
  { id: 'alamat', label: 'Alamat lengkap' },
  { id: 'npwp', label: 'NPWP' },
  { id: 'nib', label: 'NIB' },
  { id: 'telepon', label: 'Telepon' },
  { id: 'email', label: 'Email' },
  { id: 'direktur', label: 'Nama direktur/pemilik' },
  { id: 'kbli', label: 'KBLI' },
];

export const EKATALOG_REJECTIONS = [
  'Dokumen legal expired (NIB/NPWP/izin usaha/SBU/sertifikat produk kadaluarsa).',
  'Spesifikasi teknis berbeda dengan dokumen pendukung / brosur.',
  'Harga di luar wajar atau tanpa justifikasi HPP / salah satuan.',
  'Gambar / file rusak, format salah, penamaan tidak sesuai konvensi LKPP.',
  'Kategori etalase atau KBKI salah, atau tidak respons verifikator dalam 3 hari.',
];

export const EKATALOG_KNOWLEDGE = {
  rejection: { rejections: EKATALOG_REJECTIONS },
  tkdn: {
    dasar: 'Permenperin 35/2025',
    jalur: {
      industri_kecil: 'Self-declare via tkdn.kemenperin.go.id, selesai 3 hari kerja, GRATIS.',
      industri_besar: 'Via Lembaga Verifikasi Independen (LVI), selesai 10 hari kerja.',
    },
    preferensi: 'Produk dengan TKDN + BMP ≥ 40% dapat preferensi harga dan wajib dibeli bila tersedia (P3DN).',
    wajib: 'Wajib untuk semua produk yang ditayangkan di e-Katalog jika tunduk aturan TKDN.',
  },
  validity: {
    masaBerlaku: 'Tidak ada renewal universal.',
    triggerDeactivate: [
      'Masa berlaku harga habis',
      'Sertifikat TKDN / izin edar / SNI expired',
      'Verifikator minta revisi ≥ 3 hari tanpa respons',
      'Spesifikasi tidak match dokumen pendukung',
    ],
    reviewBaru: '~5 hari kerja di v6 untuk produk baru.',
  },
  helpdesk: {
    whatsapp: '+62 811-1557-709',
    jamWA: 'Senin–Jumat 09:00–18:00 WIB',
    email: 'layanan@lkpp.go.id',
    callCenter: '144',
    ticketing: 'https://bantuan.inaproc.id',
    verifikasiLPSE: 'Senin–Kamis 08:00–15:30, Jumat 08:00–16:00 (di kantor LPSE setempat)',
  },
  v6_changes: {
    launch: '10 Desember 2024 (efektif 1 Jan 2025), v5 di-nonaktifkan bertahap sepanjang 2025',
    highlights: [
      'Pembayaran terintegrasi dalam sistem',
      'Tracking pengiriman & pembayaran satu dashboard',
      'e-Audit real-time',
      'UI toko-style (keranjang, checkout, halaman produk)',
      'Review produk baru ~5 hari kerja',
      'Beberapa field wajib baru bisa menonaktifkan listing lama yang belum lengkap',
    ],
  },
  jalur: {
    nasional: 'Managed LKPP pusat, nationwide reach, syarat paling ketat.',
    sektoral: 'Per kementerian/lembaga, entry via UKPBJ kementerian.',
    lokal: 'Per Pemda via UKPBJ setempat — paling mudah untuk UMKM. Disarankan sebagai jalur pertama.',
    tokoDaring: 'Marketplace channel via mitra (Blibli/Bhinneka/dll), onboarding lebih ringan tapi tiket kecil.',
  },
  field_produk: {
    tabs: [
      'Informasi Produk (Nama, Merk, SKU, Kategori/Etalase, Negara Asal, Produsen, Jenis)',
      'KBKI (Kode Baku Komoditas Indonesia — wajib, harus sinkron dengan etalase)',
      'Spesifikasi Produk (dinamis per kategori etalase — semua field * wajib)',
      'Harga Produk (satuan, ongkir, PPN, masa berlaku, kuantitas min/max, TKDN%, BMP%)',
      'Dokumen Pendukung Harga (PDF/JPG/PNG, penamaan sesuai konvensi LKPP)',
      'Gambar (minimal 1 utama, high-res, harus menampilkan produk yang sama dengan spec)',
      'Tayangkan Produk (submit ke antrian review ~5 HK)',
    ],
  },
};
