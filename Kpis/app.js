const dashboardData = {
  project: {
    name: "ERP Techsolutions",
    version: "KPI-DASHBOARD-001",
    updatedAt: "2026-06-15",
    sourceBranch: "feature/project-kpis-dashboard",
    summary:
      "Painel executivo permanente para consolidar progresso tecnico, contratos mobile/backend, lacunas, riscos, validacoes e previsoes do ERP Techsolutions apos o merge de B-098D.",
  },
  kpis: [
    { label: "Backend mobile", value: "5/7", note: "Bootstrap, OS, checklist e inventario cobertos em contratos implementados/parciais." },
    { label: "CI PR #85", value: "pass", note: "Workflow backend remoto finalizado com sucesso." },
    { label: "Smoke React", value: "28/28", note: "Ultimo smoke conhecido do frontend React passou." },
    { label: "Escopo proibido", value: "0", note: "Flutter, Figma, secrets, .env, migrations e infra tocados neste bloco." },
  ],
  blocks: [
    { id: "B-098", title: "Backend readiness", status: "concluido", progress: 100, summary: "Bootstrap minimo e prontidao backend/mobile formalizados." },
    { id: "B-098A", title: "Bootstrap expandido", status: "concluido", progress: 100, summary: "Feature flags, mobile policy, cache e catalogos versionados." },
    { id: "B-098B", title: "Sync OS", status: "concluido", progress: 100, summary: "Replay offline de status e atribuicao de OS." },
    { id: "B-098C", title: "Sync checklist", status: "parcial", progress: 65, summary: "Respostas, notas e conclusao; anexos e markers continuam fora do replay em lote." },
    { id: "B-098D", title: "Inventario mobile", status: "parcial", progress: 60, summary: "Availability e sync minimo de reserva, consumo e falta em campo." },
  ],
  contracts: [
    {
      domain: "Mobile bootstrap",
      status: "concluido",
      endpoints: ["GET /api/v1/mobile/bootstrap"],
      detail: "Contrato expandido com tenant, usuario, roles, permissoes, cache, policies e catalogos.",
    },
    {
      domain: "Work Orders",
      status: "concluido",
      endpoints: ["POST /api/v1/mobile/sync/work-order-actions"],
      detail: "Replay controlado de status e atribuicao, idempotente por tenant + usuario + client_action_id.",
    },
    {
      domain: "Checklists",
      status: "parcial",
      endpoints: ["POST /api/v1/mobile/sync/checklist-actions"],
      detail: "Respostas, notas e complete; sem anexos, markers, divergencia ou acknowledgement em lote.",
    },
    {
      domain: "Inventory",
      status: "parcial",
      endpoints: ["GET /api/v1/mobile/inventory/availability", "POST /api/v1/mobile/sync/inventory-actions"],
      detail: "Consulta e replay minimo em memoria; sem persistencia duravel ou reserva transacional.",
    },
    {
      domain: "Evidence OS/generic",
      status: "planejado",
      endpoints: [],
      detail: "Checklist possui anexos online, mas OS/generico ainda aguardam contrato proprio.",
    },
    {
      domain: "Idempotencia duravel",
      status: "planejado",
      endpoints: [],
      detail: "DB/Redis planejado para ambiente multi-instancia e replay duravel.",
    },
  ],
  domains: [
    { name: "Backend mobile", status: "parcial", detail: "Base forte, mas ainda faltam evidencia OS/generica e idempotencia duravel." },
    { name: "Flutter", status: "planejado", detail: "Nao alterado neste bloco; pendente consumir B-098B/C/D." },
    { name: "Frontend React", status: "concluido", detail: "Smoke conhecido 28/28." },
    { name: "CI", status: "concluido", detail: "PR #85 backend pass." },
  ],
  validations: [
    { name: "npm run check", result: "pass" },
    { name: "npm run lint", result: "pass" },
    { name: "npm test", result: "pass" },
    { name: "npm run build", result: "pass" },
    { name: "npm --prefix frontend run check", result: "pass" },
    { name: "npm --prefix frontend run test:smoke", result: "pass 28/28" },
    { name: "npm --prefix frontend run build", result: "pass" },
    { name: "DATABASE_URL dummy npx prisma validate", result: "pass" },
    { name: "git diff --check", result: "pass" },
  ],
  estimates: [
    {
      label: "MVP vendavel",
      value: "40-80h",
      detail: "Sujeito a consumo Flutter dos contratos B-098B/C/D, evidencias/OS, persistencia/idempotencia e validacao E2E.",
    },
    {
      label: "Padrao Figma premium",
      value: "80-160h",
      detail: "Depende de fidelidade visual, responsividade, estados, microinteracoes e polimento web/mobile.",
    },
  ],
  risks: [
    {
      title: "Idempotencia nao duravel",
      severity: "alto",
      detail: "Contratos B-098B/C/D usam runtime em memoria para estabilizar contrato, mas ambiente multi-instancia exige DB/Redis.",
    },
    {
      title: "Flutter ainda nao consome B-098B/C/D",
      severity: "alto",
      detail: "O backend esta pronto para consumo controlado, mas o app ainda precisa integrar os novos contratos.",
    },
    {
      title: "Evidencias OS/genericas planejadas",
      severity: "medio",
      detail: "Checklist tem anexos online, mas OS/generico ainda precisam de contrato seguro.",
    },
    {
      title: "Inventario parcial",
      severity: "medio",
      detail: "Availability e sync minimo existem; falta reserva transacional e vinculo real com OS/armazem.",
    },
  ],
  nextBlocks: [
    { id: "B-098E", title: "Evidencias OS/genericas", detail: "Definir upload/metadata seguro para OS, storage protegido, auditoria e limites." },
    { id: "MOBILE-CONSUME-B098BCD", title: "Flutter consome contratos B-098B/C/D", detail: "Integrar OS, checklist e inventory sync ao app sem perder local-first." },
    { id: "SYNC-DURABILITY", title: "Idempotencia duravel", detail: "Migrar receipts para DB/Redis e preparar multi-instancia." },
  ],
  history: [
    { date: "2026-06-15", title: "KPI-DASHBOARD-001", detail: "Criado painel permanente Kpis/ apos merge do PR #85 e consolidacao B-098D." },
    { date: "2026-06-15", title: "B-098D", detail: "Inventory availability + inventory actions sync parcial; PR #85 backend pass e mergeado." },
    { date: "2026-06-14", title: "B-098 ate B-098C", detail: "Readiness, bootstrap expandido, sync OS e sync checklist parcial estabilizados." },
  ],
};

function updateKpiDashboardData(mutator) {
  mutator(dashboardData);
  renderDashboard(dashboardData);
}

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
