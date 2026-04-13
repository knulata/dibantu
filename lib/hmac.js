/**
 * lib/hmac.js — verify Meta WhatsApp webhook signatures.
 * Meta signs each webhook POST with X-Hub-Signature-256: sha256=<hex>,
 * using the Meta app secret as HMAC key over the raw body bytes.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) return false;
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const got = signatureHeader.slice(7);
  if (expected.length !== got.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(got, 'hex'));
  } catch {
    return false;
  }
}
