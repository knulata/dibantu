/**
 * api/admin/dashboard.js — Admin dashboard HTML page.
 * Simple single-page admin interface for managing tenants.
 */

import { loadTenants, getConversationStats } from '../../lib/db.js';

function authenticate(req) {
  const key = req.query?.key;
  return key === process.env.ADMIN_API_KEY;
}

export default async function handler(req, res) {
  if (!authenticate(req)) {
    return res.status(401).send('<h1>401 Unauthorized</h1><p>Add ?key=YOUR_ADMIN_KEY to the URL</p>');
  }

  const tenants = loadTenants();
  const key = req.query.key;

  // Build tenant rows
  const tenantRows = tenants.map(t => {
    const stats = getConversationStats(t.id);
    return `<tr>
      <td><a href="/api/admin/tenant/${t.id}?key=${key}" target="_blank">${t.businessName}</a></td>
      <td>${t.whatsappNumber}</td>
      <td><span class="badge ${t.status === 'active' ? 'active' : 'inactive'}">${t.status}</span></td>
      <td>${t.plan}</td>
      <td>${stats.totalConversations}</td>
      <td>${stats.totalMessages}</td>
      <td>${new Date(t.createdAt).toLocaleDateString('id-ID')}</td>
      <td>
        <button onclick="toggleTenant('${t.id}', '${t.status === 'active' ? 'inactive' : 'active'}')" class="btn btn-sm">
          ${t.status === 'active' ? '⏸ Pause' : '▶ Activate'}
        </button>
        <button onclick="deleteTenant('${t.id}', '${t.businessName}')" class="btn btn-sm btn-danger">🗑</button>
      </td>
    </tr>`;
  }).join('');

  const totalMessages = tenants.reduce((sum, t) => sum + getConversationStats(t.id).totalMessages, 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dibantu Admin Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #0d9488; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 24px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-card .number { font-size: 2em; font-weight: 700; color: #0d9488; }
    .stat-card .label { color: #666; font-size: 0.9em; }
    .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #666; font-size: 0.85em; text-transform: uppercase; }
    .badge { padding: 4px 10px; border-radius: 20px; font-size: 0.8em; font-weight: 600; }
    .badge.active { background: #d1fae5; color: #065f46; }
    .badge.inactive { background: #fde2e2; color: #991b1b; }
    .btn { padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 0.85em; }
    .btn:hover { background: #f5f5f5; }
    .btn-danger { color: #dc2626; }
    .btn-primary { background: #0d9488; color: white; border: none; padding: 10px 20px; font-size: 1em; }
    .btn-primary:hover { background: #0f766e; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.9em; }
    .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    #result { margin-top: 12px; padding: 10px; border-radius: 8px; display: none; }
    #result.success { display: block; background: #d1fae5; color: #065f46; }
    #result.error { display: block; background: #fde2e2; color: #991b1b; }
    a { color: #0d9488; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 Dibantu Admin</h1>
    <p class="subtitle">Multi-tenant WhatsApp AI Assistant Platform</p>

    <div class="stats">
      <div class="stat-card">
        <div class="number">${tenants.length}</div>
        <div class="label">Total Tenants</div>
      </div>
      <div class="stat-card">
        <div class="number">${tenants.filter(t => t.status === 'active').length}</div>
        <div class="label">Active Tenants</div>
      </div>
      <div class="stat-card">
        <div class="number">${totalMessages}</div>
        <div class="label">Total Messages</div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-bottom: 16px;">Tenants</h2>
      <table>
        <thead>
          <tr>
            <th>Business</th><th>WhatsApp</th><th>Status</th><th>Plan</th>
            <th>Chats</th><th>Messages</th><th>Created</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${tenantRows || '<tr><td colspan="8" style="text-align:center;color:#999;padding:40px;">No tenants yet. Add one below.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="card">
      <h2 style="margin-bottom: 16px;">Add New Tenant</h2>
      <form id="addForm" onsubmit="addTenant(event)">
        <div class="form-grid">
          <div class="form-group">
            <label>Business Name *</label>
            <input name="businessName" required placeholder="Toko ABC">
          </div>
          <div class="form-group">
            <label>WhatsApp Number *</label>
            <input name="whatsappNumber" required placeholder="628123456789">
          </div>
          <div class="form-group">
            <label>Fonnte Token *</label>
            <input name="fonnteToken" required placeholder="fonnte-api-token">
          </div>
          <div class="form-group">
            <label>Plan</label>
            <select name="plan">
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">+ Add Tenant</button>
        <div id="result"></div>
      </form>
    </div>
  </div>

  <script>
    const API_KEY = '${key}';
    const BASE = '/api/admin/tenants';

    async function addTenant(e) {
      e.preventDefault();
      const form = e.target;
      const data = Object.fromEntries(new FormData(form));
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': API_KEY },
        body: JSON.stringify(data),
      });
      const result = document.getElementById('result');
      if (res.ok) {
        result.className = 'success';
        result.textContent = 'Tenant created! Refreshing...';
        setTimeout(() => location.reload(), 1000);
      } else {
        const err = await res.json();
        result.className = 'error';
        result.textContent = err.error || 'Failed to create tenant';
      }
    }

    async function toggleTenant(id, newStatus) {
      await fetch(BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': API_KEY },
        body: JSON.stringify({ id, status: newStatus }),
      });
      location.reload();
    }

    async function deleteTenant(id, name) {
      if (!confirm('Delete tenant "' + name + '"? This cannot be undone.')) return;
      await fetch(BASE + '?id=' + id, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': API_KEY },
      });
      location.reload();
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}
