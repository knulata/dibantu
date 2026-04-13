/**
 * lib/vision.js — Indonesian company document extraction via OpenAI Vision.
 * Ported from ekatalog-bot/api/extract-document.js.
 *
 * Given an image URL or data URL, returns structured data:
 *   { nama, bentukUsaha, alamat, npwp, nib, telepon, email, direktur, kbli }
 */

import OpenAI from 'openai';

let _openai;
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const EXTRACTION_PROMPT = `Kamu asisten OCR untuk dokumen perusahaan Indonesia (NIB, NPWP, SIUP, akta pendirian, KTP direktur, sertifikat halal, sertifikat produksi, CoA hasil uji lab, dll).

Dari gambar/dokumen yang diberikan, ekstrak informasi berikut jika tersedia:
- nama: Nama perusahaan / nama badan usaha
- bentukUsaha: Bentuk usaha (PT, CV, UD, Perseorangan, Yayasan, dll)
- alamat: Alamat lengkap usaha
- npwp: Nomor NPWP (format 15 digit, dengan titik dan strip)
- nib: Nomor Induk Berusaha (13 digit)
- telepon: Nomor telepon perusahaan
- email: Email perusahaan
- direktur: Nama direktur/pemilik/penanggung jawab
- kbli: Kode KBLI (5 digit) + deskripsi bila ada
- jenisDokumen: Tipe dokumen yang kamu kenali (contoh: "NIB", "NPWP perusahaan", "Akta pendirian PT", "Sertifikat Halal", "CoA mikrobiologi", "KTP direktur")
- nomorDokumen: Nomor unik dokumen bila ada
- tanggalTerbit: Tanggal terbit (YYYY-MM-DD bila bisa)
- berlakuSampai: Tanggal kadaluarsa (YYYY-MM-DD bila ada)
- catatan: Hal penting lain yang perlu dicatat (mis. risk level, klasifikasi, lokasi KBLI tidak sesuai, dokumen kadaluarsa)

Aturan:
- Hanya ekstrak data yang BENAR-BENAR terlihat di dokumen. Jangan menebak.
- Jika suatu field tidak terlihat, biarkan null.
- Jangan bertanya balik; hanya keluarkan JSON.
- Jawaban harus valid JSON tanpa markdown, tanpa penjelasan.`;

/**
 * @param {string} imageSource - http(s) URL or data URL (data:image/jpeg;base64,...)
 * @returns {Promise<{extractedData: object, confidence: number}>}
 */
export async function extractCompanyDocument(imageSource) {
  const completion = await openai().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: imageSource, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 800,
    temperature: 0,
  });

  let data = {};
  try {
    data = JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    console.error('[vision] JSON parse failed:', err.message);
  }

  const filled = Object.values(data).filter((v) => v && v !== 'null').length;
  const confidence = Math.min(1, filled / 8);
  return { extractedData: data, confidence };
}
