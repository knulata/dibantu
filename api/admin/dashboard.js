/**
 * api/admin/dashboard.js — Admin dashboard HTML page.
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

  const tenants = await loadTenants();
  const key = req.query.key;

  const rows = await Promise.all(tenants.map(async (t) => {
    const stats = await getConversationStats(t.id);
    const skillsBadges = (t.skills || []).map((s) => `<span class="skill">${s}</span>`).join(' ');
    return `<tr>
      <td><strong>${t.businessName}</strong><br><small>${t.whatsappNumber || t.phoneNumberId}</small></td>
      <td>${skillsBadges || '<em>all</em>'}</td>
      <td><span class="badge ${t.status === 'active' ? 'active' : 'inactive'}">${t.status}</span></td>
      <td>${t.plan}</td>
      <td>${stats.totalMessages}</td>
      <td>${new Date(t.createdAt).toLocaleDateString('id-ID')}</td>
      <td>
        <button onclick="toggleTenant('${t.id}', '${t.status === 'active' ? 'inactive' : 'active'}')" class="btn btn-sm">
          ${t.status === 'active' ? 'Pause' : 'Activate'}
        </button>
        <button onclick="deleteTenant('${t.id}', '${t.businessName.replace(/'/g, "\\'")}')" class="btn btn-sm btn-danger">Delete</button>
      </td>
    </tr>`;
  }));

  const totalMessages = tenants.reduce((sum, t) => sum + (t.messageCount || 0), 0);
  const activeCount = tenants.filter((t) => t.status === 'active').length;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dibantu Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0b1020; color: #e6e8f0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #7dd3fc; margin-bottom: 4px; font-size: 1.8em; }
    .subtitle { color: #94a3b8; margin-bottom: 24px; font-size: 0.9em; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: #111a33; border: 1px solid #1e293b; border-radius: 10px; padding: 16px; }
    .stat-card .number { font-size: 1.8em; font-weight: 700; color: #7dd3fc; }
    .stat-card .label { color: #94a3b8; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; }
    .card { background: #111a33; border: 1px solid #1e293b; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
    .card h2 { margin-bottom: 12px; font-size: 1.1em; color: #e6e8f0; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #1e293b; }
    th { font-weight: 600; color: #94a3b8; font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; }
    td small { color: #64748b; font-size: 0.8em; }
    .badge { padding: 3px 8px; border-radius: 12px; font-size: 0.75em; font-weight: 600; }
    .badge.active { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
    .badge.inactive { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .skill { display: inline-block; padding: 2px 6px; margin-right: 3px; background: rgba(125, 211, 252, 0.1); color: #7dd3fc; border-radius: 6px; font-size: 0.7em; }
    .btn { padding: 5px 10px; border: 1px solid #334155; border-radius: 6px; background: #1e293b; color: #e6e8f0; cursor: pointer; font-size: 0.8em; }
    .btn:hover { background: #334155; }
    .btn-danger { color: #f87171; }
    .btn-primary { background: #0ea5e9; color: white; border: none; padding: 10px 18px; font-size: 0.95em; }
    .btn-primary:hover { background: #0284c7; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.8em; color: #94a3b8; }
    .form-group input, .form-group select { width: 100%; padding: 8px 10px; border: 1px solid #334155; border-radius: 6px; background: #0b1020; color: #e6e8f0; font-size: 0.9em; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    #result { margin-top: 12px; padding: 10px; border-radius: 6px; display: none; font-size: 0.85em; }
    #result.success { display: block; background: rgba(34, 197, 94, 0.15); color: #4ade80; }
    #result.error { display: block; background: rgba(239, 68, 68, 0.15); color: #f87171; }
    a { color: #7dd3fc; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Dibantu Admin</h1>
    <p class="subtitle">WhatsApp agent untuk BPOM, Kemenkes & LKPP e-Katalog — multi-tenant control panel.</p>

    <div class="stats">
      <div class="stat-card"><div class="number">${tenants.length}</div><div class="label">Total Tenants</div></div>
      <div class="stat-card"><div class="number">${activeCount}</div><div class="label">Active</div></div>
      <div class="stat-card"><div class="number">${totalMessages}</div><div class="label">Total Messages</div></div>
    </div>

    <div class="card">
      <h2>Tenants</h2>
      <table>
        <thead>
          <tr>
            <th>Business</th><th>Skills</th><th>Status</th><th>Plan</th>
            <th>Msgs</th><th>Created</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows.join('') || '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:30px;">No tenants yet. Add one below.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="card">
      <h2>Add Tenant</h2>
      <form id="addForm" onsubmit="addTenant(event)">
        <div class="form-grid">
          <div class="form-group"><label>Business Name *</label><input name="businessName" required placeholder="Dibantu HQ"></div>
          <div class="form-group"><label>WhatsApp Number *</label><input name="whatsappNumber" required placeholder="628131102445"></div>
          <div class="form-group"><label>Phone Number ID *</label><input name="phoneNumberId" required placeholder="Meta phone_number_id"></div>
          <div class="form-group"><label>Access Token *</label><input name="whatsappAccessToken" required placeholder="EAA..."></div>
          <div class="form-group"><label>Admin WA Number (QS approver)</label><input name="adminWhatsappNumber" placeholder="628131102445"></div>
          <div class="form-group"><label>Plan</label>
            <select name="plan">
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label>Enabled Skills</label>
            <label style="display:inline;font-weight:400;"><input type="checkbox" name="skills" value="ekatalog" checked> ekatalog</label>
            <label style="display:inline;font-weight:400;margin-left:16px;"><input type="checkbox" name="skills" value="bpom" checked> bpom</label>
            <label style="display:inline;font-weight:400;margin-left:16px;"><input type="checkbox" name="skills" value="kemenkes" checked> kemenkes</label>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">+ Add Tenant</button>
        <div id="result"></div>
      </form>
    </div>

    <div class="card">
      <h2>Skill quick reference</h2>
      <ul style="padding-left:18px;color:#94a3b8;font-size:0.85em;line-height:1.7;">
        <li><code>/approve &lt;draftId&gt;</code> — admin command via WA to approve a QS draft</li>
        <li><code>/revise &lt;draftId&gt; &lt;note&gt;</code> — request revision, user gets notified</li>
        <li>Skills: <span class="skill">ekatalog</span> <span class="skill">bpom</span> <span class="skill">kemenkes</span></li>
      </ul>
    </div>
  </div>

  <script>
    const API_KEY = '${key}';
    const BASE = '/api/admin/tenants';

    async function addTenant(e) {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const data = {};
      data.skills = fd.getAll('skills');
      for (const [k, v] of fd.entries()) { if (k !== 'skills') data[k] = v; }
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': API_KEY },
        body: JSON.stringify(data),
      });
      const result = document.getElementById('result');
      if (res.ok) { result.className = 'success'; result.textContent = 'Tenant created.'; setTimeout(() => location.reload(), 800); }
      else { const err = await res.json(); result.className = 'error'; result.textContent = err.error || 'Failed to create'; }
    }

    async function toggleTenant(id, newStatus) {
      await fetch(BASE, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': API_KEY }, body: JSON.stringify({ id, status: newStatus }) });
      location.reload();
    }

    async function deleteTenant(id, name) {
      if (!confirm('Delete tenant "' + name + '"?')) return;
      await fetch(BASE + '?id=' + id, { method: 'DELETE', headers: { 'X-Admin-Key': API_KEY } });
      location.reload();
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}
