/**
 * lib/media.js — download WhatsApp media attachments via Meta Graph API.
 * When a user sends an image/document on WhatsApp, the webhook only includes
 * a media_id. We must call GET /v21.0/<media_id> with the tenant's access
 * token to resolve a short-lived URL, then GET that URL with the same token.
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';

export async function getMediaUrl(mediaId, accessToken) {
  const res = await fetch(`${GRAPH_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`getMediaUrl ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.url;
}

export async function downloadMediaAsDataUrl(mediaId, accessToken, mimeType) {
  const url = await getMediaUrl(mediaId, accessToken);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`downloadMedia ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = mimeType || res.headers.get('content-type') || 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}
