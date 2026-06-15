/* ERP Techsolutions — KPI Dashboard app.js */
/* No external dependencies */

(function () {
  'use strict';

  const LATEST_URL  = './kpis-latest.json';
  const HISTORY_URL = './kpis-history.json';

  async function loadAll() {
    const [latest, history] = await Promise.all([
      fetch(LATEST_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(HISTORY_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    ]);
    return { latest, history };
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function statusClass(s) {
    return s === 'green' ? 'green' : s === 'yellow' ? 'yellow' : s === 'red' ? 'red' : 'blue';
  }

  function pct(value, total) {
    return total ? Math.round((value / total) * 100) : value;
  }

  function progressBar(value, total, cls) {
    const p = pct(value, total);
    return `
      <div class="progress-wrap">
        <div class="progress-track">
          <div class="progress-fill ${cls}" style="width:${Math.min(p,100)}%"></div>
        </div>
        <div class="progress-pct">${p}%</div>
      </div>`;
  }

  // ── sections ─────────────────────────────────────────────────────────────

  function renderHeader(latest) {
    const d = document.getElementById('header');
    const overall = latest.categories.every(c => c.metrics.every(m => m.status !== 'red' || m.id.endsWith('_sync') || m.id.endsWith('_evidencias') || m.id.endsWith('_mapa') || m.id.endsWith('_real') || m.id.endsWith('_remoto')));
    d.innerHTML = `
      <div class="header-left">
        <h1>ERP <span>Techsolutions</span> — KPIs</h1>
        <div class="header-meta">
          Snapshot: <strong>${latest.snapshot_date}</strong> &nbsp;·&nbsp;
          Versao: <strong>${latest.version}</strong> &nbsp;·&nbsp;
          Branch: <code>${latest.branch}</code>
        </div>
        <div class="header-meta" style="margin-top:4px;font-style:italic">${latest.description}</div>
      </div>
      <div>
        <span class="badge green">Flutter 443/443 ✓</span>
        &nbsp;
        <span class="badge green">Backend 15/15 ✓</span>
      </div>`;
  }

  function renderSummaryCards(latest) {
    const container = document.getElementById('summary-cards');
    container.className = 'kpi-grid';

    // Flatten all metrics into a summary row
    const highlights = [
      { label: 'Flutter Tests', value: '443/443', unit: '', status: 'green', detail: '100% passando' },
      { label: 'Backend Tests', value: '15/15',   unit: '', status: 'green', detail: '100% passando' },
      { label: 'flutter analyze', value: '0', unit: 'issues', status: 'green', detail: 'No issues found' },
      { label: 'npm lint / build', value: '0', unit: 'erros', status: 'green', detail: 'Pipeline verde' },
      { label: 'Modulos Prontos', value: '12/15', unit: '', status: 'yellow', detail: '3 pendentes (sync, approvals, GPS)' },
      { label: 'MVP Demo (est.)', value: '75', unit: '%', status: 'yellow', detail: 'Estimado — 85%+ apos B-100' },
      { label: 'MVP Vendavel (est.)', value: '50', unit: '%', status: 'yellow', detail: 'Requer upload, GPS, aprovacao' },
      { label: 'Blocos Entregues', value: '28', unit: '', status: 'green', detail: 'B-076 → B-099' },
    ];

    container.innerHTML = highlights.map(h => `
      <div class="kpi-card ${h.status}">
        <div class="kpi-label">${h.label}</div>
        <div class="kpi-value">${h.value}</div>
        ${h.unit ? `<div class="kpi-unit">${h.unit}</div>` : ''}
        <div class="kpi-detail">${h.detail}</div>
      </div>`).join('');
  }

  function renderCategorySection(cat, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.className = 'kpi-grid';
    container.innerHTML = cat.metrics.map(m => {
      const cls = statusClass(m.status);
      const hasTotal = m.total != null;
      return `
        <div class="kpi-card ${cls}">
          <div class="kpi-label">${m.label}</div>
          <div class="kpi-value">${hasTotal ? `${m.value}/${m.total}` : m.value}</div>
          ${m.unit ? `<div class="kpi-unit">${m.unit}</div>` : ''}
          ${hasTotal ? progressBar(m.value, m.total, cls) : ''}
          <div class="kpi-detail">${m.detail}</div>
          <div class="kpi-type ${m.type}">${m.type === 'estimated' ? '⚠ estimado' : '✓ real'}</div>
        </div>`;
    }).join('');
  }

  function renderModuleTable(latest) {
    const container = document.getElementById('module-table-wrap');
    if (!container) return;
    const rows = latest.modules.map(m => `
      <tr>
        <td><strong>${m.name}</strong></td>
        <td><span class="status-dot ${m.status}">${m.status}</span></td>
        <td style="color:var(--muted);font-size:12px">${m.detail}</td>
      </tr>`).join('');
    container.innerHTML = `
      <table class="module-table">
        <thead><tr>
          <th>Modulo</th><th>Status</th><th>Observacao</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function renderHistory(history) {
    const container = document.getElementById('history-chart');
    if (!container) return;

    const maxTests = Math.max(...history.map(h => h.flutter_tests));
    const bars = history.map(h => {
      const pctH = Math.round((h.flutter_tests / maxTests) * 100);
      return `
        <div class="chart-col" title="${h.version}: ${h.flutter_tests} testes">
          <div class="chart-bar-val">${h.flutter_tests}</div>
          <div class="chart-bar" style="height:${pctH}%"></div>
          <div class="chart-bar-lbl">${h.version}</div>
        </div>`;
    }).join('');

    const trend = history.map((h, i) => {
      const prev = i > 0 ? history[i - 1].flutter_tests : null;
      const delta = prev != null ? h.flutter_tests - prev : 0;
      return `<tr>
        <td>${h.snapshot_date}</td>
        <td><strong>${h.version}</strong></td>
        <td style="color:var(--green)">${h.flutter_tests}</td>
        <td style="color:var(--muted)">${h.npm_tests}</td>
        <td style="color:${h.flutter_mvp_demo >= 75 ? 'var(--green)' : 'var(--yellow)'}">${h.flutter_mvp_demo}%</td>
        <td style="color:var(--muted)">${h.flutter_mvp_vendavel}%</td>
        <td style="color:${delta > 0 ? 'var(--green)' : 'var(--muted)'}">
          ${delta > 0 ? '+' + delta : delta === 0 ? '—' : delta}
        </td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="chart-wrap" style="margin-bottom:16px">
        <div class="chart-title">Flutter Tests — evolucao historica</div>
        <div class="chart-bars">${bars}</div>
      </div>
      <div style="overflow-x:auto">
        <table class="module-table">
          <thead><tr>
            <th>Data</th><th>Versao</th><th>Flutter</th><th>Backend</th><th>Demo %</th><th>Vendavel %</th><th>Delta</th>
          </tr></thead>
          <tbody>${trend}</tbody>
        </table>
      </div>`;
  }

  function renderNextSteps(latest) {
    const container = document.getElementById('next-steps');
    if (!container) return;
    container.innerHTML = `<ul class="next-list">${
      latest.next_steps.map(s => `
        <li class="next-item">
          <span class="next-block">${s.block}</span>
          <span class="next-title">${s.title}</span>
        </li>`).join('')
    }</ul>`;
  }

  function renderGaps(latest) {
    const cat = latest.categories.find(c => c.id === 'gaps');
    if (!cat) return;
    const container = document.getElementById('gaps-grid');
    if (!container) return;
    container.className = 'kpi-grid';
    container.innerHTML = cat.metrics.map(m => `
      <div class="kpi-card red">
        <div class="kpi-label">${m.label}</div>
        <div class="kpi-value" style="font-size:16px;margin-top:4px">Pendente</div>
        <div class="kpi-detail">${m.detail}</div>
      </div>`).join('');
  }

  function renderFooter(latest) {
    const f = document.getElementById('footer');
    if (!f) return;
    f.innerHTML = `
      <span>ERP Techsolutions — Dashboard gerado localmente</span>
      <span>Ultima atualizacao: ${latest.snapshot_date} — ${latest.version}</span>`;
  }

  // ── boot ─────────────────────────────────────────────────────────────────

  async function init() {
    const loadingEl = document.getElementById('loading');
    const errorEl   = document.getElementById('error-msg');
    const dashEl    = document.getElementById('dashboard');

    try {
      const { latest, history } = await loadAll();

      renderHeader(latest);
      renderSummaryCards(latest);

      const quality  = latest.categories.find(c => c.id === 'quality');
      const mobile   = latest.categories.find(c => c.id === 'mobile');
      const backend  = latest.categories.find(c => c.id === 'backend');
      const delivery = latest.categories.find(c => c.id === 'delivery');

      if (quality)  renderCategorySection(quality,  'quality-cards');
      if (mobile)   renderCategorySection(mobile,   'mobile-cards');
      if (backend)  renderCategorySection(backend,  'backend-cards');
      if (delivery) renderCategorySection(delivery, 'delivery-cards');

      renderModuleTable(latest);
      renderHistory(history);
      renderNextSteps(latest);
      renderGaps(latest);
      renderFooter(latest);

      if (loadingEl) loadingEl.style.display = 'none';
      if (dashEl)    dashEl.style.display = 'block';
    } catch (err) {
      console.error(err);
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Erro ao carregar kpis-latest.json. Abra o dashboard via um servidor local (ex: npx serve Kpis/).';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
