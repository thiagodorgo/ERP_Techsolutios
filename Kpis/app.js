const dashboardData = {
  project: {
    name: "ERP Techsolutions",
    version: "B-105",
    updatedAt: "2026-06-17",
    sourceBranch: "main after PR #97",
    summary:
      "B-105 GPS/mapa operacional da OS sincronizado com os KPIs mobile. Kpis/ reflete mobile/flutter_app/Kpis/ para Flutter 613/613, MVP demo 87%, MVP vendavel 64% e 35 blocos entregues.",
  },
  kpis: [
    { label: "B-105", value: "GPS/mapa operacional", note: "Field Location parcial com DeviceLocationProvider, store field_location_events, mapa simples e sync manual." },
    { label: "Flutter", value: "613/613", note: "Total real do full Flutter validado no gate B-152 pos-B-105." },
    { label: "Backend tests", value: "15/15", note: "npm test passou com core-saas.test.ts." },
    { label: "Contratos focados", value: "47/47", note: "mobile-backend-contracts, core-saas-contract, checklist e B-101 focados." },
    { label: "MVP demo", value: "87%", note: "Percentual mobile vindo de mobile/flutter_app/Kpis/kpis-latest.json." },
    { label: "MVP vendavel", value: "64%", note: "Percentual mobile vindo de mobile/flutter_app/Kpis/kpis-latest.json." },
    { label: "Blocos entregues", value: "35", note: "B-076 ate B-105 + B-098F, incluindo sub-blocos." },
    { label: "Escopo B-152F", value: "docs/KPIs", note: "Sem alteracao funcional em Flutter, backend, frontend web, Prisma, infra, env, lockfiles ou Figma." },
  ],
  blocks: [
    { id: "B-098E", title: "Evidencias mobile", status: "parcial", progress: 55, summary: "Manifestos idempotentes de evidencia para OS/campo." },
    { id: "B-102", title: "Checklist answers sync", status: "concluido", progress: 100, summary: "Respostas/notas/conclusao para runs backend-ready." },
    { id: "B-103", title: "OS status sync", status: "parcial", progress: 75, summary: "statusUpdate backend-ready para Work Orders." },
    { id: "B-104", title: "Upload real de evidencias", status: "parcial", progress: 70, summary: "Multipart local/dev com blob opaco e checksum." },
    { id: "B-105", title: "GPS/mapa operacional", status: "parcial", progress: 68, summary: "Provider abstrato, Field Location, mapa simples e sync manual." },
  ],
  contracts: [
    {
      domain: "Field Location",
      status: "parcial",
      endpoints: ["POST /api/v1/mobile/field-locations"],
      detail: "B-105 registra evento manual de localizacao do actor autenticado; sem tenant/token/path/base64 no payload real.",
    },
    {
      domain: "KPIs mobile",
      status: "concluido",
      endpoints: ["mobile/flutter_app/Kpis/kpis-latest.json", "mobile/flutter_app/Kpis/index.html"],
      detail: "Fonte dos percentuais Flutter/mobile: 613/613, 87%, 64%, 35 blocos.",
    },
    {
      domain: "KPIs raiz",
      status: "concluido",
      endpoints: ["Kpis/kpis-latest.json", "Kpis/index.html"],
      detail: "Reflete os percentuais mobile em Kpis/ conforme politica obrigatoria de KPIs duplos.",
    },
  ],
  domains: [
    { name: "Flutter", status: "parcial", detail: "B-105 pronto como fundacao; adapter GPS nativo real, permissoes Android/iOS e opt-in de privacidade pendentes." },
    { name: "Field Location", status: "parcial", detail: "Sync manual para Field Location e mapa operacional simples; sem geolocator, sem Google Maps, sem Mapbox, sem SDK externo." },
    { name: "Politica KPIs duplos", status: "concluido", detail: "Mexeu Flutter/mobile atualiza mobile/flutter_app/Kpis/* e reflete percentuais em Kpis/*; fora mobile atualiza Kpis/*; ambos atualizam ambos; index.html tambem deve refletir." },
  ],
  validations: [
    { name: "flutter test --reporter compact", result: "pass 613/613 no gate B-152" },
    { name: "npm test", result: "pass 15/15 no gate B-152" },
    { name: "backend contract tests focados", result: "pass 47/47 conforme KPI B-105" },
    { name: "PR #97", result: "merged 0a01b0b5a6cc63066cd154fd7c91c1ce66edc5f3" },
    { name: "Head aprovado", result: "8fde8b1443fe9510c7f45e9088ddf5b0d5635d6a" },
  ],
  estimates: [
    { label: "MVP demo", value: "87%", detail: "Estimado no KPI mobile apos B-105." },
    { label: "MVP vendavel", value: "64%", detail: "Estimado no KPI mobile apos B-105." },
  ],
  risks: [
    { title: "Adapter GPS nativo real pendente", severity: "medio", detail: "B-105 usa provider abstrato/testavel e runtime seguro sem adapter nativo." },
    { title: "Permissoes Android/iOS pendentes", severity: "medio", detail: "Opt-in de privacidade e permissoes ficam para B-106." },
    { title: "Sem coleta automatica", severity: "baixo", detail: "Sem pacote GPS nativo, sem geolocator, sem background tracking, sem timer, sem stream continuo e sem envio silencioso." },
  ],
  nextBlocks: [
    { id: "B-106", title: "Adapter GPS nativo real + permissoes Android/iOS", detail: "Proximo passo apos correcoes de KPIs duplos." },
  ],
  history: [
    { date: "2026-06-17", title: "B-152F", detail: "Kpis/ raiz sincronizado com mobile/flutter_app/Kpis/ apos B-105; politica de KPIs duplos documentada." },
    { date: "2026-06-17", title: "B-105", detail: "GPS/mapa operacional da OS, Field Location, Flutter 613/613, MVP demo 87%, MVP vendavel 64%, 35 blocos." },
    { date: "2026-06-15", title: "KPI-DASHBOARD-001", detail: "Criado painel permanente Kpis/." },
  ],
};

function renderDashboard(data) {
  setText("project-title", data.project.name);
  setText("dashboard-version", data.project.version);
  setText("last-updated", data.project.updatedAt);
  setText("source-branch", data.project.sourceBranch);
  setText("project-summary", data.project.summary);
  renderKpis(data.kpis);
  renderTimeline(data.blocks);
  renderProgress(data.blocks);
  renderContractMap(data.contracts);
  renderDomainStatus(data.domains);
  renderValidations(data.validations);
  renderEstimates(data.estimates);
  renderRisks(data.risks);
  renderNextBlocks(data.nextBlocks);
  renderHistory(data.history);
}

function renderKpis(items) {
  renderInto("kpi-cards", items, (item) => `
    <article class="kpi-card">
      <div class="kpi-card__label">${escapeHtml(item.label)}</div>
      <div class="kpi-card__value">${escapeHtml(item.value)}</div>
      <p class="kpi-card__note">${escapeHtml(item.note)}</p>
    </article>
  `);
}

function renderTimeline(items) {
  renderInto("timeline", items, (item) => `
    <article class="timeline-item" data-status="${escapeHtml(item.status)}">
      ${statusBadge(item.status)}
      <h3>${escapeHtml(item.id)} - ${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
    </article>
  `);
}

function renderProgress(items) {
  renderInto("contract-progress", items, (item) => `
    <article class="progress-item">
      <div class="progress-top"><span>${escapeHtml(item.id)}</span><span>${item.progress}%</span></div>
      <div class="progress-bar" data-status="${escapeHtml(item.status)}"><span style="width: ${clampPercent(item.progress)}%"></span></div>
    </article>
  `);
}

function renderContractMap(items) {
  renderInto("contract-map", items, (item) => `
    <article class="contract-card">
      <header><h3>${escapeHtml(item.domain)}</h3>${statusBadge(item.status)}</header>
      <p>${escapeHtml(item.detail)}</p>
      ${item.endpoints.length > 0 ? `<ul>${item.endpoints.map((endpoint) => `<li>${escapeHtml(endpoint)}</li>`).join("")}</ul>` : ""}
    </article>
  `);
}

function renderDomainStatus(items) {
  renderInto("domain-status", items, (item) => `
    <article class="status-row">
      <header><h3>${escapeHtml(item.name)}</h3>${statusBadge(item.status)}</header>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function renderValidations(items) {
  renderInto("validation-list", items, (item) => `<article class="validation-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.result)}</span></article>`);
}

function renderEstimates(items) {
  renderInto("estimate-list", items, (item) => `
    <article class="estimate-card">
      <h3>${escapeHtml(item.label)}</h3>
      <strong>${escapeHtml(item.value)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function renderRisks(items) {
  renderInto("risk-list", items, (item) => `
    <article class="risk-item" data-severity="${escapeHtml(item.severity)}">
      <header><h3>${escapeHtml(item.title)}</h3>${statusBadge(item.severity === "alto" ? "risco" : "parcial")}</header>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function renderNextBlocks(items) {
  renderInto("next-blocks", items, (item) => `
    <article class="next-item">
      <header><h3>${escapeHtml(item.id)}</h3>${statusBadge("planejado")}</header>
      <p><strong>${escapeHtml(item.title)}.</strong> ${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function renderHistory(items) {
  renderInto("history-summary", items, (item) => `
    <article class="history-item">
      <header><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.date)}</span></header>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function statusBadge(status) {
  return `<span class="status-badge" data-status="${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function renderInto(id, items, template) {
  const element = document.getElementById(id);
  if (!element) return;
  element.innerHTML = items.map(template).join("");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderDashboard(dashboardData);
