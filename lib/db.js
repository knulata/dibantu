/**
 * lib/db.js — JSON-file-based database for multi-tenant data.
 * Stores tenants and conversations as JSON files.
 * Easy to migrate to a real DB later.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const TENANTS_FILE = join(DATA_DIR, 'tenants.json');
const CONVERSATIONS_DIR = join(DATA_DIR, 'conversations');

// Ensure directories exist
function ensureDirs() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(CONVERSATIONS_DIR, { recursive: true });
}

// --- Tenant CRUD ---

/** Load all tenants */
export function loadTenants() {
  ensureDirs();
  try {
    return JSON.parse(readFileSync(TENANTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

/** Save all tenants */
export function saveTenants(tenants) {
  ensureDirs();
  writeFileSync(TENANTS_FILE, JSON.stringify(tenants, null, 2), 'utf-8');
}

/** Get tenant by ID */
export function getTenant(id) {
  return loadTenants().find(t => t.id === id) || null;
}

/** Create a new tenant */
export function createTenant(tenant) {
  const tenants = loadTenants();
  tenants.push(tenant);
  saveTenants(tenants);
  // Create tenant data directory
  const tenantDir = join(DATA_DIR, 'tenants', tenant.id);
  mkdirSync(tenantDir, { recursive: true });
  return tenant;
}

/** Update a tenant by ID */
export function updateTenant(id, updates) {
  const tenants = loadTenants();
  const idx = tenants.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tenants[idx] = { ...tenants[idx], ...updates, id }; // don't allow changing id
  saveTenants(tenants);
  return tenants[idx];
}

/** Delete a tenant by ID */
export function deleteTenant(id) {
  const tenants = loadTenants();
  const idx = tenants.findIndex(t => t.id === id);
  if (idx === -1) return false;
  tenants.splice(idx, 1);
  saveTenants(tenants);
  return true;
}

/** Find tenant by Meta phoneNumberId */
export function findTenantByPhoneNumberId(phoneNumberId) {
  return loadTenants().find(t => t.phoneNumberId === phoneNumberId && t.status === 'active') || null;
}

// --- Conversation History ---

function conversationFile(tenantId) {
  return join(CONVERSATIONS_DIR, `${tenantId}.json`);
}

/** Load conversations for a tenant (keyed by sender phone) */
export function loadConversations(tenantId) {
  try {
    return JSON.parse(readFileSync(conversationFile(tenantId), 'utf-8'));
  } catch {
    return {};
  }
}

/** Save conversations for a tenant */
export function saveConversations(tenantId, conversations) {
  ensureDirs();
  writeFileSync(conversationFile(tenantId), JSON.stringify(conversations, null, 2), 'utf-8');
}

/** Add a message to conversation history */
export function addMessage(tenantId, sender, role, content) {
  const convos = loadConversations(tenantId);
  if (!convos[sender]) convos[sender] = [];
  convos[sender].push({ role, content, timestamp: new Date().toISOString() });
  // Keep last 50 messages per sender
  if (convos[sender].length > 50) {
    convos[sender] = convos[sender].slice(-50);
  }
  saveConversations(tenantId, convos);
}

/** Get recent messages for a sender (last N) */
export function getRecentMessages(tenantId, sender, limit = 10) {
  const convos = loadConversations(tenantId);
  const msgs = convos[sender] || [];
  return msgs.slice(-limit);
}

/** Get conversation stats for a tenant */
export function getConversationStats(tenantId) {
  const convos = loadConversations(tenantId);
  const senders = Object.keys(convos);
  const totalMessages = senders.reduce((sum, s) => sum + convos[s].length, 0);
  return { totalConversations: senders.length, totalMessages };
}

// --- Business Context ---

/** Load business context for a tenant */
export function loadBusinessContext(tenantId) {
  const ctxFile = join(DATA_DIR, 'tenants', tenantId, 'business.json');
  try {
    return JSON.parse(readFileSync(ctxFile, 'utf-8'));
  } catch {
    return null;
  }
}

/** Save business context for a tenant */
export function saveBusinessContext(tenantId, context) {
  const tenantDir = join(DATA_DIR, 'tenants', tenantId);
  mkdirSync(tenantDir, { recursive: true });
  writeFileSync(join(tenantDir, 'business.json'), JSON.stringify(context, null, 2), 'utf-8');
}
