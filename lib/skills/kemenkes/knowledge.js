/**
 * lib/skills/kemenkes/knowledge.js — Kemenkes (Regalkes, SATUSEHAT SDMK) knowledge base.
 */

export const KEMENKES_JALUR = {
  pkrt_kelas1_dn: {
    nama: 'PKRT Kelas 1 Dalam Negeri (PKD Kelas 1)',
    scope: 'Perbekalan Kesehatan Rumah Tangga kelas 1 produksi dalam negeri — sabun, tissue basah, deterjen, kapas kosmetik, penyegar udara. Vertikal PALING MUDAH di Kemenkes.',
    portal: 'https://regalkes.kemkes.go.id/ (terintegrasi OSS — mulai dari oss.go.id)',
    masaBerlaku: '5 tahun',
    timeline: '10 hari kerja',
    biayaPNBP: 'Rp 1 juta',
    syaratUtama: 'SPPKRT (Sertifikat Produksi PKRT) dari sertifikasialkes.kemkes.go.id — WAJIB ada sebelum bisa daftar izin edar PKD.',
    wajibTidak: 'TIDAK butuh: uji klinis, ISO 13485, CPKB. Cukup formula + CoA per bahan + uji stabilitas + label.',
  },
  pkrt_kelas2_dn: {
    nama: 'PKRT Kelas 2 DN',
    scope: 'PKRT dengan risiko menengah.',
    portal: 'Sama — regalkes.kemkes.go.id via OSS',
    masaBerlaku: '5 tahun',
    timeline: '20 hari kerja',
    biayaPNBP: 'Rp 2 juta',
  },
  alkes_kelas_a_dn: {
    nama: 'Alkes Kelas A Dalam Negeri (AKD Kelas A)',
    scope: 'Alat kesehatan risiko rendah — perban, tongkat, kasa, termometer mekanik. Vertikal kedua termudah.',
    portal: 'regalkes.kemkes.go.id via OSS',
    masaBerlaku: '5 tahun (izin edar) — Sertifikat CPAKB juga 5 tahun',
    timeline: '~30–45 hari kerja',
    biayaPNBP: '~Rp 1,5 juta',
    syaratUtama: 'SPAK (Sertifikat Produksi Alkes) dari sertifikasialkes.kemkes.go.id + CPAKB audit',
    wajibTidak: 'TIDAK butuh uji klinis. Cukup technical file + CPAKB.',
  },
  alkes_kelas_b_dn: {
    nama: 'Alkes Kelas B DN',
    scope: 'Sedang — diagnostik sederhana, sterilisator',
    timeline: '~45–60 hari kerja',
  },
  alkes_kelas_c_dn: {
    nama: 'Alkes Kelas C DN',
    scope: 'Tinggi — ventilator, pacu jantung, implan non-aktif. WAJIB uji pre-klinis + klinis.',
    timeline: '~90 hari kerja',
  },
  alkes_kelas_d_dn: {
    nama: 'Alkes Kelas D DN',
    scope: 'Sangat tinggi — implan aktif. WAJIB uji klinis.',
    timeline: '120+ hari kerja',
  },
  akl: {
    nama: 'AKL (Alkes Impor)',
    scope: 'Alat kesehatan impor semua kelas.',
    syaratTambahan: 'LoA distributor, Certificate of Free Sale negara asal, ISO 13485, CoA per batch',
  },
  ipak: {
    nama: 'IPAK (Izin Penyalur Alat Kesehatan)',
    portal: 'regalkes.kemkes.go.id via OSS',
    syarat: 'Badan hukum + NIB, PJT full-time (D3 ATEM/Farmasi/dll), gudang + kantor memenuhi syarat, bengkel sendiri atau kerjasama purna-jual, CDAKB',
    masaBerlaku: '5 tahun',
    biayaPNBP: '~Rp 1 juta minimum',
  },
  sip: {
    nama: 'SIP (Surat Izin Praktik) — dokter/perawat/bidan/apoteker',
    portal: 'https://satusehat.kemkes.go.id/sdmk → Plataran Sehat / MPP Digital',
    masaBerlaku: 'SIP 5 tahun per lokasi praktik. STR sekarang SEUMUR HIDUP (UU Kesehatan 17/2023, bukan 5 tahun lagi).',
    syarat: 'STR aktif, SKP cukup via Platform SKP, rekomendasi organisasi profesi (IDI/PPNI/IBI/IAI) masih diminta di banyak daerah, surat pernyataan lokasi, fotokopi fasyankes',
    catatan: 'Submit ≥ 3 bulan sebelum expire.',
  },
  apotek: {
    nama: 'Apotek / Toko Obat / Klinik',
    portal: 'oss.go.id (NIB + Sertifikat Standar) → DPMPTSP → Dinkes Kab/Kota verifikasi',
    regulasi: 'PP 28/2025 (menggantikan PP 5/2021 per Oktober 2025), Permenkes 14/2021',
    kbli: 'Apotek 47721, Toko Obat 47722/47842, Klinik 86105/86104',
    masaBerlaku: '5 tahun',
    syarat: 'SIA apoteker penanggung jawab, perjanjian kerjasama notaris (non-perseorangan), SPPL, denah ruang, daftar peralatan, self-assessment via SIMONA (perpanjangan)',
  },
};

export const KEMENKES_DOCUMENTS = {
  pkrt_kelas1_dn: [
    'NIB (OSS-RBA) dengan KBLI produksi PKRT',
    'NPWP',
    'Akta pendirian + SK Kemenkumham (untuk PT/CV)',
    'SPPKRT (Sertifikat Produksi PKRT) — WAJIB sebelum daftar',
    'Formula lengkap + spesifikasi bahan baku',
    'CoA per bahan baku',
    'Uji stabilitas produk jadi (sesuai masa simpan yang diklaim)',
    'Label & brosur produk (format sesuai Permenkes)',
    'Sample kemasan primer & sekunder',
    'Surat Penunjukan PJT (Penanggung Jawab Teknis)',
    'KTP PJT',
  ],
  alkes_kelas_a_dn: [
    'NIB dengan KBLI produksi alkes',
    'NPWP',
    'Izin Produksi Alkes + Sertifikat CPAKB (WAJIB)',
    'Technical File: deskripsi produk, prinsip kerja, spesifikasi',
    'Alur proses produksi',
    'Hasil uji: stabilitas, sterilitas (jika steril), keamanan listrik (jika elektronik)',
    'Label & brosur',
    'Sample kemasan',
    'KTP + ijazah PJT',
    'Surat pernyataan jaminan mutu',
  ],
  ipak: [
    'NIB (badan hukum)',
    'NPWP',
    'Akta + SK Kemenkumham',
    'PJT full-time dengan latar D3 ATEM / Farmasi / sesuai',
    'Gudang yang memenuhi syarat (suhu, kelembaban, keamanan)',
    'Kantor yang terpisah dari gudang',
    'Bengkel sendiri atau kerjasama purna-jual',
    'CDAKB (Cara Distribusi Alat Kesehatan yang Baik)',
  ],
  sip: [
    'STR aktif (seumur hidup per UU Kesehatan 17/2023)',
    'SKP cukup via Platform SKP',
    'Surat rekomendasi organisasi profesi (IDI/PPNI/IBI/IAI)',
    'Surat pernyataan lokasi praktik',
    'Fotokopi izin fasyankes yang terverifikasi di SATUSEHAT',
    'Foto diri terbaru',
  ],
};

export const KEMENKES_REJECTIONS = {
  pkrt_kelas1_dn: [
    'Label tidak mencantumkan nomor izin edar / nama PJT / komposisi lengkap',
    'CoA tidak lengkap per bahan baku',
    'Uji stabilitas tidak cukup bulan (harus minimal masa simpan yang diklaim)',
    'KBLI di NIB tidak mencakup produksi PKRT',
    'SPPKRT belum terbit atau kedaluwarsa',
  ],
  alkes_kelas_a_dn: [
    'Kelas risiko salah (ternyata bukan Kelas A — perlu Kelas B/C)',
    'Label mismatch brosur',
    'Klaim medis berlebihan di brosur',
    'Technical file tidak lengkap',
    'CPAKB sertifikat lapsed',
  ],
  ipak: [
    'Denah ruang tidak memisahkan gudang dari kantor',
    'PJT tidak sesuai kualifikasi / bukan full-time',
    'Tidak ada SOP CAPA (Corrective and Preventive Action)',
    'Bengkel purna-jual tidak terverifikasi',
  ],
  sip: [
    'SKP belum cukup',
    'Rekomendasi organisasi profesi belum keluar',
    'Fasyankes tidak terverifikasi di SATUSEHAT',
  ],
};

export const KEMENKES_HELPDESK = {
  umum: {
    nama: 'Halo Kemenkes',
    telepon: '1500-567',
    whatsapp: '+62 812-6050-0567',
    email: 'helpdesk@kemkes.go.id',
    faq: 'https://faq.kemkes.go.id',
  },
  farmalkes: {
    nama: 'Direktorat Jenderal Farmalkes',
    website: 'https://farmalkes.kemkes.go.id/kontak',
    catatan: 'Untuk pertanyaan spesifik Regalkes, SPPKRT, SPAK.',
  },
  sdmk: {
    nama: 'SATUSEHAT SDMK (untuk SIP/STR)',
    website: 'https://satusehat.kemkes.go.id/sdmk',
  },
};

export const KEMENKES_CHEAT_SHEET = `
### Kemenkes quick ref (cheat sheet)

| Jalur | Timeline | PNBP | Portal | Catatan |
|---|---|---|---|---|
| **PKRT Kelas 1 DN** (paling mudah) | **10 HK** | **Rp 1 jt** | regalkes via OSS | Butuh SPPKRT lebih dulu. Tidak perlu uji klinis. |
| PKRT Kelas 2 DN | 20 HK | Rp 2 jt | regalkes via OSS | — |
| Alkes Kelas A DN | 30–45 HK | ~Rp 1,5 jt | regalkes via OSS | Butuh SPAK + CPAKB. Tidak perlu uji klinis. |
| Alkes Kelas C/D | 90–120+ HK | lebih tinggi | regalkes | **WAJIB uji klinis**. |
| IPAK | — | ~Rp 1 jt+ | regalkes | PJT full-time + gudang+bengkel. |
| SIP dokter/nakes | — | — | satusehat.kemkes.go.id/sdmk | STR sekarang **seumur hidup** (UU 17/2023), SIP tetap 5 thn. |
| Apotek / Klinik | — | — | oss.go.id → Dinkes | PP 28/2025. |

**Semua jalur NIB-gated.**
**TIDAK ada API publik Kemenkes untuk Regalkes.** SATUSEHAT ada REST API tapi itu untuk data klinis (FHIR), bukan perizinan.
**Halo Kemenkes**: 1500-567 / WA 0812-6050-0567 / helpdesk@kemkes.go.id.

**Catatan penting**: Food & drug bukan Kemenkes — itu BPOM. Jangan ketuker.`;
