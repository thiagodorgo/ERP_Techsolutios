const dashboardData = {
  project: {
    name: "ERP Techsolutions",
    version: "B-107",
    updatedAt: "2026-06-18",
    sourceBranch: "feature/work-order-remote-create-conflicts",
    summary:
      "B-107 Criacao remota de OS/local-only mapping + resolucao manual de conflitos publicado apos avaliacao humana. Kpis/ reflete mobile/flutter_app/Kpis/ para Flutter 654/654, MVP demo 92%, MVP vendavel 72% e 37 blocos entregues.",
  },
  kpis: [
    { label: "B-107", value: "OS local-only mapping", note: "work_order.create, localId -> serverId e resolucao manual inicial de conflitos." },
    { label: "Flutter", value: "654/654", note: "Total real validado no full Flutter B-107." },
    { label: "Backend tests", value: "15/15", note: "npm test passou com core-saas.test.ts." },
    { label: "Mobile contracts", value: "18/18", note: "tests/mobile-backend-contracts.test.ts." },
    { label: "Mobile + Core SaaS", value: "21/21", note: "mobile-backend-contracts + core-saas-contract." },
    { label: "MVP demo", value: "92%", note: "Percentual mobile vindo de mobile/flutter_app/Kpis/kpis-latest.json." },
    { label: "MVP vendavel", value: "72%", note: "Percentual mobile vindo de mobile/flutter_app/Kpis/kpis-latest.json." },
    { label: "Blocos entregues", value: "37", note: "B-076 ate B-107 + B-098F, incluindo sub-blocos." },
    { label: "Escopo B-107K", value: "KPI/docs", note: "Publicacao documental pos-avaliacao humana; sem feature nova ou codigo funcional." },
  ],
  blocks: [
    { id: "B-098E", title: "Evidencias mobile", status: "parcial", progress: 55, summary: "Manifestos idempotentes de evidencia para OS/campo." },
    { id: "B-102", title: "Checklist answers sync", status: "concluido", progress: 100, summary: "Respostas/notas/conclusao para runs backend-ready." },
    { id: "B-103", title: "OS status sync", status: "parcial", progress: 75, summary: "statusUpdate backend-ready para Work Orders." },
    { id: "B-104", title: "Upload real de evidencias", status: "parcial", progress: 70, summary: "Multipart local/dev com blob opaco e checksum." },
    { id: "B-105", title: "GPS/mapa operacional", status: "parcial", progress: 68, summary: "Provider abstrato, Field Location, mapa simples e sync manual." },
    { id: "B-106", title: "Adapter GPS nativo", status: "parcial", progress: 76, summary: "Geolocator, permissao when-in-use, opt-in explicito e captura manual." },
    { id: "B-107", title: "OS local-only mapping", status: "parcial", progress: 82, summary: "work_order.create, serverId mapping e conflito manual inicial." },
  ],
  contracts: [
    {
      domain: "Work Orders",
      status: "parcial",
      endpoints: ["POST /api/v1/mobile/sync/work-order-actions"],
      detail: "B-107 envia work_order.create local-only, mapeia localId -> serverId, reaproveita already_applied e preserva rejected/conflict com seguranca.",
    },
    {
      domain: "KPIs mobile",
      status: "concluido",
      endpoints: ["mobile/flutter_app/Kpis/kpis-latest.json", "mobile/flutter_app/Kpis/index.html"],
      detail: "Fonte dos percentuais Flutter/mobile: 654/654, 92%, 72%, 37 blocos.",
    },
    {
      domain: "KPIs raiz",
      status: "concluido",
      endpoints: ["Kpis/kpis-latest.json", "Kpis/index.html"],
      detail: "Reflete os percentuais mobile em Kpis/ conforme politica obrigatoria de KPIs duplos.",
    },
  ],
  domains: [
    { name: "Flutter", status: "parcial", detail: "B-107 conecta criacao remota de OS local-only, mapeamento serverId e resolucao manual inicial; approval/evidence reais seguem pendentes." },
    { name: "Work Orders", status: "parcial", detail: "Sync mobile de OS agora cobre create e status em duas fases, com conflict manual inicial e sem descarte silencioso." },
    { name: "Politica KPIs duplos", status: "concluido", detail: "Mexeu Flutter/mobile atualiza mobile/flutter_app/Kpis/* e reflete percentuais em Kpis/*; fora mobile atualiza Kpis/*; ambos atualizam ambos; index.html tambem deve refletir." },
  ],
  validations: [
    { name: "flutter test --reporter compact", result: "pass 654/654 no B-107" },
    { name: "npm test", result: "pass 15/15 no gate B-107G" },
    { name: "mobile-backend-contracts", result: "pass 18/18" },
    { name: "mobile + Core SaaS contracts", result: "pass 21/21" },
    { name: "PR #102", result: "merged db36fb318adc234e1fcc6bfeaeb17b6260847c3c" },
    { name: "Head aprovado", result: "b3da11d1605af9edb68e5e8f587881fc22115f3f" },
    { name: "Politica KPI", result: "publicado apos avaliacao humana, merge e gate B-107G" },
  ],
  estimates: [
    { label: "MVP demo", value: "92%", detail: "Estimado no KPI mobile apos B-107." },
    { label: "MVP vendavel", value: "72%", detail: "Estimado no KPI mobile apos B-107." },
  ],
  risks: [
    { title: "Approval real pendente", severity: "medio", detail: "B-107 nao implementa aprovacao operacional real de OS." },
    { title: "Evidence attach real pendente", severity: "medio", detail: "B-107 nao implementa anexos reais no replay de OS." },
    { title: "Merge avancado de conflitos pendente", severity: "medio", detail: "B-107 entrega resolucao manual inicial, sem merge campo a campo." },
  ],
  nextBlocks: [
    { id: "B-108", title: "Hardening de evidencias", detail: "Presigned URL, storage protegido, antivirus e auditoria." },
  ],
  history: [
    { date: "2026-06-18", title: "B-107", detail: "Criacao remota de OS local-only, localId -> serverId, conflito manual inicial, Flutter 654/654, MVP demo 92%, MVP vendavel 72%, 37 blocos." },
    { date: "2026-06-18", title: "B-106", detail: "Adapter GPS nativo real, permissoes when-in-use, opt-in explicito, Flutter 633/633, MVP demo 90%, MVP vendavel 68%, 36 blocos." },
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
