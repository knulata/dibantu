/**
 * lib/db.js — Upstash Redis persistence for multi-tenant data.
 *
 * Key namespaces:
 *   dibantu:tenant:index                 — SET of tenant IDs
 *   dibantu:tenant:<id>                  — HASH of tenant record
 *   dibantu:tenant:byPhoneId:<phoneId>   — STRING tenant ID (reverse lookup)
 *   dibantu:business:<tenantId>          — STRING JSON business context
 *   dibantu:conv:<tenantId>:<sender>     — LIST of JSON messages (last 50)
 *   dibantu:session:<tenantId>:<sender>  — STRING JSON session state
 *   dibantu:seen:<messageId>             — STRING flag (TTL 1h), idempotency
 *   dibantu:draft:<tenantId>:<draftId>   — STRING JSON QS review draft
 *
 * Falls back to an in-memory store if UPSTASH_REDIS_REST_URL is unset
 * (local dev, tests). Not persistent across restarts in that mode.
 */

import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let client;

if (url && token) {
  client = new Redis({ url, token });
} else {
  // In-memory fallback for local dev. Emulates the subset of Redis we use.
  const mem = new Map();
  const listMem = new Map();
  const setMem = new Map();

  client = {
    async get(k) { return mem.has(k) ? mem.get(k) : null; },
    async set(k, v, opts) {
      mem.set(k, v);
      if (opts?.ex) setTimeout(() => mem.delete(k), opts.ex * 1000).unref?.();
      return 'OK';
    },
    async del(...keys) {
      let n = 0;
      for (const k of keys) {
        if (mem.delete(k)) n++;
        if (listMem.delete(k)) n++;
        if (setMem.delete(k)) n++;
      }
      return n;
    },
    async sadd(k, ...members) {
      const s = setMem.get(k) || new Set();
      members.forEach(m => s.add(m));
      setMem.set(k, s);
      return members.length;
    },
    async srem(k, ...members) {
      const s = setMem.get(k);
      if (!s) return 0;
      let n = 0;
      members.forEach(m => { if (s.delete(m)) n++; });
      return n;
    },
    async smembers(k) { return Array.from(setMem.get(k) || []); },
    async lpush(k, ...vals) {
      const list = listMem.get(k) || [];
      list.unshift(...vals);
      listMem.set(k, list);
      return list.length;
    },
    async ltrim(k, start, end) {
      const list = listMem.get(k) || [];
      const trimmed = list.slice(start, end === -1 ? undefined : end + 1);
      listMem.set(k, trimmed);
      return 'OK';
    },
    async lrange(k, start, end) {
      const list = listMem.get(k) || [];
      return list.slice(start, end === -1 ? undefined : end + 1);
    },
    async exists(k) { return mem.has(k) || listMem.has(k) || setMem.has(k) ? 1 : 0; },
  };
  console.warn('[db] Using in-memory fallback — set UPSTASH_REDIS_REST_URL to persist.');
}

// -------- helpers --------

const J = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

function tenantKey(id) { return `dibantu:tenant:${id}`; }
function tenantByPhoneKey(phoneNumberId) { return `dibantu:tenant:byPhoneId:${phoneNumberId}`; }
function businessKey(tenantId) { return `dibantu:business:${tenantId}`; }
function convKey(tenantId, sender) { return `dibantu:conv:${tenantId}:${sender}`; }
function sessionKey(tenantId, sender) { return `dibantu:session:${tenantId}:${sender}`; }
function seenKey(messageId) { return `dibantu:seen:${messageId}`; }
function draftKey(tenantId, draftId) { return `dibantu:draft:${tenantId}:${draftId}`; }
const TENANT_INDEX = 'dibantu:tenant:index';

// -------- tenants --------

export async function loadTenants() {
  const ids = await client.smembers(TENANT_INDEX);
  if (!ids.length) return [];
  const out = [];
  for (const id of ids) {
    const raw = await client.get(tenantKey(id));
    if (raw) out.push(J(raw));
  }
  return out;
}

export async function getTenant(id) {
  const raw = await client.get(tenantKey(id));
  return raw ? J(raw) : null;
}

export async function createTenant(tenant) {
  // Uniqueness check on phoneNumberId
  const existing = await client.get(tenantByPhoneKey(tenant.phoneNumberId));
  if (existing) throw new Error(`phoneNumberId ${tenant.phoneNumberId} already in use by tenant ${existing}`);
  await client.set(tenantKey(tenant.id), JSON.stringify(tenant));
  await client.set(tenantByPhoneKey(tenant.phoneNumberId), tenant.id);
  await client.sadd(TENANT_INDEX, tenant.id);
  return tenant;
}

export async function updateTenant(id, updates) {
  const current = await getTenant(id);
  if (!current) return null;
  const merged = { ...current, ...updates, id };
  // If phoneNumberId changed, update reverse index
  if (updates.phoneNumberId && updates.phoneNumberId !== current.phoneNumberId) {
    await client.del(tenantByPhoneKey(current.phoneNumberId));
    await client.set(tenantByPhoneKey(updates.phoneNumberId), id);
  }
  await client.set(tenantKey(id), JSON.stringify(merged));
  return merged;
}

export async function deleteTenant(id) {
  const current = await getTenant(id);
  if (!current) return false;
  await client.del(tenantKey(id));
  await client.del(tenantByPhoneKey(current.phoneNumberId));
  await client.del(businessKey(id));
  await client.srem(TENANT_INDEX, id);
  return true;
}

export async function findTenantByPhoneNumberId(phoneNumberId) {
  const id = await client.get(tenantByPhoneKey(phoneNumberId));
  if (!id) return null;
  const tenant = await getTenant(id);
  if (!tenant || tenant.status !== 'active') return null;
  return tenant;
}

// -------- business context --------

export async function loadBusinessContext(tenantId) {
  const raw = await client.get(businessKey(tenantId));
  return raw ? J(raw) : null;
}

export async function saveBusinessContext(tenantId, context) {
  await client.set(businessKey(tenantId), JSON.stringify(context));
}

// -------- conversations --------

export async function addMessage(tenantId, sender, role, content) {
  const entry = JSON.stringify({ role, content, timestamp: new Date().toISOString() });
  await client.lpush(convKey(tenantId, sender), entry);
  await client.ltrim(convKey(tenantId, sender), 0, 49); // keep latest 50
}

export async function getRecentMessages(tenantId, sender, limit = 10) {
  const raw = await client.lrange(convKey(tenantId, sender), 0, limit - 1);
  // lrange returns newest-first (we used lpush). Reverse for chronological.
  return raw.map((r) => (typeof r === 'string' ? J(r) : r)).reverse();
}

export async function getConversationStats(tenantId) {
  // Cheap approximation: count is expensive on Upstash without a separate counter.
  // We'll lazily return zero for now; admin dashboard shows message count at tenant level.
  const tenant = await getTenant(tenantId);
  return { totalConversations: 0, totalMessages: tenant?.messageCount || 0 };
}

// -------- sessions --------

export async function loadSession(tenantId, sender) {
  const raw = await client.get(sessionKey(tenantId, sender));
  return raw ? J(raw) : {};
}

export async function saveSession(tenantId, sender, state) {
  await client.set(sessionKey(tenantId, sender), JSON.stringify(state));
}

export async function resetSession(tenantId, sender) {
  await client.del(sessionKey(tenantId, sender));
}

// -------- idempotency --------

export async function markSeen(messageId) {
  if (!messageId) return false;
  const existing = await client.get(seenKey(messageId));
  if (existing) return false;
  await client.set(seenKey(messageId), '1', { ex: 3600 });
  return true;
}

// -------- QS drafts --------

export async function saveDraft(tenantId, draftId, draft) {
  await client.set(draftKey(tenantId, draftId), JSON.stringify(draft));
}

export async function loadDraft(tenantId, draftId) {
  const raw = await client.get(draftKey(tenantId, draftId));
  return raw ? J(raw) : null;
}

export async function deleteDraft(tenantId, draftId) {
  await client.del(draftKey(tenantId, draftId));
}
