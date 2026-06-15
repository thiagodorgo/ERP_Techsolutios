// KPIs Mobile — ERP Techsolutions
// Dashboard estatico. Tenta carregar os JSON oficiais via fetch(); se falhar
// (tipico ao abrir via file://), usa o snapshot embutido abaixo. Sem dependencias
// externas, sem CDN, sem build, sem servidor obrigatorio.

// ---------------------------------------------------------------------------
// Snapshot embutido (fallback) — espelho de kpis-latest.json / kpis-history.json
// Mantido em sincronia a cada entrega. Fonte oficial: os arquivos .json ao lado.
// ---------------------------------------------------------------------------
const EMBEDDED_LATEST = {
  snapshot_date: "2026-06-15",
  version: "B-101",
  branch: "feature/backend-mobile-checklists-available",
  description:
    "B-101 Backend Mobile Checklist Available Endpoint — fecha a lacuna da B-100 entregando o handler real de GET /api/v1/mobile/checklists/available com DTO compativel ao parser Flutter",
  release: {
    block: "B-101",
    title: "Backend Mobile Checklist Available Endpoint",
    branch: "feature/backend-mobile-checklists-available",
    status: "local_complete_pending_push",
    status_label: "Concluido localmente — aguardando push",
    summary:
      "Endpoint GET /api/v1/mobile/checklists/available passa a retornar um DTO mobile compativel com o parser Flutter B-100 (title, schema_version, status active) e envelope { data, items, meta }. Tenant-scoped + RBAC (checklist_runs:read/create). 5 testes de contrato novos. Descoberta: o handler ja existia em checklist.routes.ts (nao estava ausente, apenas fora de mobile.routes.ts).",
    commits: [
      { hash: "pending", message: "feat(mobile-api): add available checklist templates endpoint" },
      { hash: "pending", message: "test(mobile-api): cover checklist templates contract" },
      { hash: "pending", message: "docs: add B-101 backend checklist endpoint status" },
    ],
    limitation:
      "npm test (CI) executa apenas core-saas.test.ts; os testes de contrato mobile (incl. B-101) rodam via node --test direto. Wiring de CI fica para bloco de infra (package.json fora do escopo da B-101).",
    fallback: "Flutter B-100 mantem fallback remoto -> cache Drift -> seeds; agora com backend real respondendo.",
  },
  domains: [
    {
      id: "work_orders",
      name: "Work Orders (OS)",
      status: "parcial",
      detail: "Pull remoto ativo (B-099); sync bidirecional pendente.",
      points: [
        "GET /api/v1/work-orders conectado com upsert no Drift",
        "Parser tolerante camelCase/snake_case",
        "Banners de pull state em Home e List + RefreshIndicator",
        "Pendente: push de alteracoes locais ao backend (B-102)",
      ],
    },
    {
      id: "checklists",
      name: "Checklists",
      status: "parcial",
      detail: "Pull de templates ativo (B-100) + backend real (B-101); sync write pendente.",
      points: [
        "GET /api/v1/mobile/checklists/available com handler backend real (B-101)",
        "DTO mobile compativel: title, schema_version, status active, items, meta",
        "Tenant-scoped + RBAC (checklist_runs:read/create); somente templates publicados",
        "Cache Drift + fallback remoto -> cache -> seeds no Flutter",
        "Pendente: sync write de respostas de checklist (B-102+)",
      ],
    },
    {
      id: "offline",
      name: "Offline / Local-first",
      status: "concluido",
      detail: "Persistencia local SQLite via Drift em todos os dominios.",
      points: [
        "Drift como cache local de OS, checklists e inventario",
        "App permanece util sem rede (cache/seeds)",
        "Fila de sync local (replay com stubs seguros)",
        "Sem perda de dados em falha de rede no pull",
      ],
    },
  ],
  categories: [
    {
      id: "quality",
      label: "Qualidade de Codigo",
      metrics: [
        { id: "flutter_tests", label: "Flutter Tests", value: 487, total: 487, unit: "testes", type: "real", status: "green", detail: "487/487 (1 pre-existente instavel passa isolado) — inclui +44 de B-100" },
        { id: "npm_tests", label: "Backend Tests", value: 15, total: 15, unit: "testes", type: "real", status: "green", detail: "15/15 passando" },
        { id: "flutter_analyze", label: "flutter analyze", value: 0, unit: "issues", type: "real", status: "green", detail: "No issues found" },
        { id: "npm_lint", label: "npm run lint", value: 0, unit: "erros", type: "real", status: "green", detail: "0 erros" },
        { id: "npm_build", label: "npm run build", value: 0, unit: "erros", type: "real", status: "green", detail: "0 erros" },
      ],
    },
    {
      id: "mobile",
      label: "Mobile Flutter MVP",
      metrics: [
        { id: "flutter_modules_ready", label: "Modulos Flutter Prontos", value: 13, total: 15, unit: "modulos", type: "real", status: "yellow", detail: "Pendentes: OS sync bidirecional, Approvals, Field Map" },
        { id: "flutter_mvp_demo", label: "MVP Demo Readiness", value: 78, unit: "%", type: "estimated", status: "yellow", detail: "Estimado. Subiu com backend real de checklists (B-101). Sobe mais com sync write de respostas" },
        { id: "flutter_mvp_vendavel", label: "MVP Vendavel (Producao)", value: 52, unit: "%", type: "estimated", status: "yellow", detail: "Estimado. Requer sync write de checklist, upload real de evidencias, GPS, aprovacao real" },
        { id: "flutter_test_files", label: "Arquivos de Teste Flutter", value: 20, unit: "arquivos", type: "real", status: "green", detail: "20 arquivos de teste no diretorio test/" },
        { id: "flutter_os_pull", label: "OS Pull Remoto", value: 1, unit: "conectado", type: "real", status: "green", detail: "GET /api/v1/work-orders com upsert Drift e fallback cache" },
        { id: "flutter_checklist_pull", label: "Checklist Templates Pull", value: 1, unit: "conectado", type: "real", status: "green", detail: "GET /api/v1/mobile/checklists/available com parser tolerante, cache Drift e fallback seeds (B-100)" },
      ],
    },
    {
      id: "backend",
      label: "Backend Node.js",
      metrics: [
        { id: "backend_modules", label: "Modulos Backend", value: 8, total: 10, unit: "modulos", type: "estimated", status: "yellow", detail: "core-saas, auth, RBAC, checklists, work-orders, tenants, audit, platform" },
        { id: "backend_auth", label: "Auth JWT Real", value: 1, unit: "implementado", type: "real", status: "green", detail: "Login local tenant-scoped + JWT + RBAC persistido" },
        { id: "backend_persistence", label: "Persistencia Prisma/PostgreSQL", value: 1, unit: "implementado", type: "real", status: "green", detail: "PrismaCoreSaasStore via CORE_SAAS_PERSISTENCE=prisma" },
        { id: "backend_checklist_api", label: "Checklist API", value: 1, unit: "implementado", type: "real", status: "green", detail: "/api/v1/tenant/checklists + /api/v1/mobile/checklists/*" },
        { id: "backend_mobile_checklists_available", label: "Mobile Checklists Available", value: 1, unit: "implementado", type: "real", status: "green", detail: "GET /api/v1/mobile/checklists/available com DTO mobile compativel ao Flutter B-100, tenant-scoped + RBAC (B-101)" },
        { id: "backend_mobile_contract_tests", label: "Testes de Contrato Mobile", value: 45, total: 45, unit: "testes", type: "real", status: "green", detail: "45/45 via node --test (core-saas 15 + mobile-backend-contracts 15 + checklist 10 + B-101 5). npm test/CI roda apenas core-saas (15)" },
      ],
    },
    {
      id: "delivery",
      label: "Velocidade de Entrega",
      metrics: [
        { id: "blocks_completed", label: "Blocos Entregues (total)", value: 30, unit: "blocos", type: "real", status: "green", detail: "B-076 ate B-101, incluindo sub-blocos (A/B/K)" },
        { id: "blocks_last_sprint", label: "Blocos em 2026-06-15", value: 2, unit: "blocos", type: "real", status: "green", detail: "B-100 Flutter Checklist Remote Templates + B-101 Backend Checklist Available Endpoint" },
        { id: "prs_merged", label: "PRs Merged (estimado)", value: 15, unit: "PRs", type: "estimated", status: "green", detail: "Estimado com base no historico de branches e merges" },
      ],
    },
    {
      id: "gaps",
      label: "Lacunas para Producao",
      metrics: [
        { id: "os_sync_bidirecional", label: "OS Sync Bidirecional", value: 0, unit: "implementado", type: "real", status: "red", detail: "Pendente — push de alteracoes locais ao backend (B-102)" },
        { id: "upload_evidencias", label: "Upload Real de Evidencias", value: 0, unit: "implementado", type: "real", status: "red", detail: "Pendente — S3 presigned URL + image_picker" },
        { id: "gps_mapa", label: "GPS / Mapa Operacional", value: 0, unit: "implementado", type: "real", status: "red", detail: "Placeholder — aguarda definicao de requisito" },
        { id: "aprovacao_real", label: "Aprovacao Real", value: 0, unit: "implementado", type: "real", status: "red", detail: "Placeholder — fluxo de aprovacao de OS" },
        { id: "checklist_remoto", label: "Checklist Remoto Mobile", value: 1, unit: "implementado", type: "real", status: "yellow", detail: "Pull de templates (B-100) + backend real (B-101) entregues. Falta sync write de respostas de checklist (B-102+)" },
        { id: "checklist_answers_sync", label: "Checklist Answers Sync", value: 0, unit: "implementado", type: "real", status: "red", detail: "Pendente — push/replay de respostas de checklist do mobile ao backend" },
      ],
    },
  ],
  modules: [
    { name: "Auth/Login", status: "pronto", detail: "Real via --dart-define=ERP_AUTH_MODE=remote" },
    { name: "Bootstrap/Session", status: "pronto", detail: "Dual-format: B-098 minimal + B-098A expandido" },
    { name: "Feature Flags", status: "pronto", detail: "FeatureFlag + CapabilityStatus" },
    { name: "Sync Cursors", status: "pronto", detail: "Parseados; prontos para uso incremental" },
    { name: "Multi-tenant", status: "pronto", detail: "TenantSelectorScreen + switchTenant()" },
    { name: "OS — Lista Local", status: "pronto", detail: "DriftWorkOrderLocalStore ativo" },
    { name: "OS — Pull Remoto", status: "pronto", detail: "GET /api/v1/work-orders; upsert Drift; banners UI (B-099)" },
    { name: "OS — Sync Bidirecional", status: "pendente", detail: "B-102 — alteracoes locais para backend" },
    { name: "Checklist Configuravel", status: "pronto", detail: "Modelos ricos + 10 renderers" },
    { name: "Checklist — Pull Remoto", status: "pronto", detail: "GET /mobile/checklists/available; parser tolerante; cache Drift; banners UI (B-100)" },
    { name: "Checklist — Backend Available", status: "pronto", detail: "Handler backend real com DTO mobile compativel, tenant-scoped + RBAC (B-101)" },
    { name: "Sync Screen", status: "pronto", detail: "Grupos por dominio, KPIs, banners" },
    { name: "Diagnostics", status: "pronto", detail: "Dev-only (kIsDevMode)" },
    { name: "Inventory", status: "pronto", detail: "Local-first (SQLite)" },
    { name: "RDV / Despesas", status: "pronto", detail: "Local-first (SQLite)" },
    { name: "Approvals", status: "placeholder", detail: "Aguarda definicao de fluxo" },
    { name: "Field Map / GPS", status: "placeholder", detail: "Aguarda requisito tecnico" },
  ],
  next_steps: [
    { block: "B-102", title: "Sync write de respostas de checklist (mobile -> backend) + wiring de CI para os testes de contrato mobile" },
    { block: "B-103", title: "Push de alteracoes locais de OS para o backend (sync bidirecional)" },
    { block: "B-104", title: "Upload real de fotos (image_picker + presigned URL S3)" },
  ],
};

const EMBEDDED_HISTORY = [
  { snapshot_date: "2026-06-13", version: "B-094", flutter_tests: 280, npm_tests: 15, flutter_modules_ready: 10, flutter_modules_total: 15, flutter_mvp_demo: 70, flutter_mvp_vendavel: 40, blocks_completed: 22, description: "B-094 QA Geral + Organizacao Flutter + Estrategia de PR" },
  { snapshot_date: "2026-06-14", version: "B-097", flutter_tests: 315, npm_tests: 15, flutter_modules_ready: 11, flutter_modules_total: 15, flutter_mvp_demo: 72, flutter_mvp_vendavel: 43, blocks_completed: 24, description: "B-097 Flutter Mobile MVP Stabilization — persistencia SQLite OS, checklist renderers" },
  { snapshot_date: "2026-06-14", version: "B-098", flutter_tests: 352, npm_tests: 15, flutter_modules_ready: 11, flutter_modules_total: 15, flutter_mvp_demo: 73, flutter_mvp_vendavel: 45, blocks_completed: 25, description: "B-098 Flutter Real Auth and Bootstrap — DioAuthRepository, BootstrapNotifier, multi-tenant" },
  { snapshot_date: "2026-06-14", version: "B-098B", flutter_tests: 413, npm_tests: 15, flutter_modules_ready: 12, flutter_modules_total: 15, flutter_mvp_demo: 74, flutter_mvp_vendavel: 47, blocks_completed: 27, description: "B-098B Flutter Consume Expanded Bootstrap Contract — FeatureFlags, SyncCursors, CapabilityStatus" },
  { snapshot_date: "2026-06-14", version: "B-099", flutter_tests: 443, npm_tests: 15, flutter_modules_ready: 12, flutter_modules_total: 15, flutter_mvp_demo: 75, flutter_mvp_vendavel: 50, blocks_completed: 28, description: "B-099 Flutter Real Work Orders Pull — GET /api/v1/work-orders, upsert Drift, banners UI" },
  { snapshot_date: "2026-06-15", version: "B-100", flutter_tests: 487, npm_tests: 15, flutter_modules_ready: 13, flutter_modules_total: 15, flutter_mvp_demo: 76, flutter_mvp_vendavel: 51, blocks_completed: 29, description: "B-100 Flutter Checklist Remote Templates — pull de modelos, parser tolerante, cache Drift, banners UX" },
  { snapshot_date: "2026-06-15", version: "B-101", flutter_tests: 487, npm_tests: 15, flutter_modules_ready: 13, flutter_modules_total: 15, flutter_mvp_demo: 78, flutter_mvp_vendavel: 52, blocks_completed: 30, description: "B-101 Backend Mobile Checklist Available Endpoint — handler real + DTO compativel ao Flutter, 5 testes de contrato" },
];

// ---------------------------------------------------------------------------
// Carregamento: fetch oficial com fallback embutido
// ---------------------------------------------------------------------------

async function tryFetchJson(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null; // file:// / CORS / offline
  }
}

async function loadData() {
  const latest = await tryFetchJson("./kpis-latest.json");
  const history = await tryFetchJson("./kpis-history.json");
  if (latest && history) {
    return { latest, history, source: "external" };
  }
  return { latest: EMBEDDED_LATEST, history: EMBEDDED_HISTORY, source: "embedded" };
}

// ---------------------------------------------------------------------------
// Helpers de status / formatacao
// ---------------------------------------------------------------------------

const STATUS_TO_BADGE = {
  green: "concluido",
  yellow: "parcial",
  red: "risco",
  pronto: "concluido",
  concluido: "concluido",
  parcial: "parcial",
  pendente: "planejado",
  placeholder: "planejado",
  planejado: "planejado",
};

function badgeKind(status) {
  return STATUS_TO_BADGE[status] || "planejado";
}

const STATUS_LABEL = {
  green: "ok",
  yellow: "parcial",
  red: "pendente",
  pronto: "pronto",
  concluido: "concluido",
  parcial: "parcial",
  pendente: "pendente",
  placeholder: "placeholder",
};

function metricValue(m) {
  if (m.total !== undefined) return `${m.value}/${m.total}`;
  if (m.unit === "%") return `${m.value}%`;
  if (m.unit === "conectado" || m.unit === "implementado") return m.value ? "Sim" : "Nao";
  return `${m.value}`;
}

function allMetrics(latest) {
  return latest.categories.flatMap((c) => c.metrics.map((m) => ({ ...m, category: c.label })));
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render({ latest, history, source }) {
  renderOverview(latest, source);
  renderRelease(latest.release);
  renderRealKpis(latest);
  renderEstimatedKpis(latest);
  renderMobileMaturity(latest);
  renderDeliveries(history);
  renderDomain(latest, "work_orders", "wo-domain");
  renderDomain(latest, "checklists", "cl-domain");
  renderDomain(latest, "offline", "offline-domain");
  renderRisks(latest);
  renderNextSteps(latest.next_steps);
  renderHistory(history);
}

function renderOverview(latest, source) {
  setText("project-version", latest.version);
  setText("last-updated", latest.snapshot_date);
  setText("source-branch", latest.branch);
  setText("project-summary", latest.description);

  const banner = document.getElementById("source-banner");
  if (banner) {
    if (source === "embedded") {
      banner.textContent =
        "Exibindo snapshot embutido. Para dados JSON externos, abra com servidor local opcional.";
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  const metrics = allMetrics(latest);
  const pick = (id) => metrics.find((m) => m.id === id);
  const cards = [
    pick("flutter_tests"),
    pick("flutter_modules_ready"),
    pick("blocks_completed"),
    pick("flutter_mvp_demo"),
  ].filter(Boolean);
  renderInto("overview-cards", cards, (m) => `
    <article class="kpi-card" data-status="${escapeHtml(m.status)}">
      <div class="kpi-card__label">${escapeHtml(m.label)}</div>
      <div class="kpi-card__value">${escapeHtml(metricValue(m))}</div>
      <p class="kpi-card__note">${escapeHtml(m.detail)}</p>
    </article>
  `);
}

function renderRelease(release) {
  if (!release) return;
  setText("release-title", `${release.block} — ${release.title}`);
  setText("release-summary", release.summary);
  setText("release-branch", release.branch);
  const statusEl = document.getElementById("release-status");
  if (statusEl) {
    statusEl.textContent = release.status_label || release.status;
    statusEl.dataset.status = "parcial";
  }
  renderInto("release-commits", release.commits || [], (c) => `
    <li><code>${escapeHtml(c.hash)}</code> ${escapeHtml(c.message)}</li>
  `);
  setText("release-limitation", release.limitation || "");
  setText("release-fallback", release.fallback || "");
}

function renderRealKpis(latest) {
  const reals = allMetrics(latest).filter((m) => m.type === "real");
  renderInto("real-kpis", reals, (m) => `
    <article class="metric-row" data-status="${escapeHtml(m.status)}">
      <header>
        <h3>${escapeHtml(m.label)}</h3>
        ${statusBadge(m.status, STATUS_LABEL[m.status] || "real")}
      </header>
      <strong class="metric-row__value">${escapeHtml(metricValue(m))}</strong>
      <p>${escapeHtml(m.detail)}</p>
    </article>
  `);
}

function renderEstimatedKpis(latest) {
  const ests = allMetrics(latest).filter((m) => m.type === "estimated");
  renderInto("estimated-kpis", ests, (m) => `
    <article class="metric-row metric-row--est" data-status="${escapeHtml(m.status)}">
      <header>
        <h3>${escapeHtml(m.label)}</h3>
        <span class="tag-est">estimado</span>
      </header>
      <strong class="metric-row__value">${escapeHtml(metricValue(m))}</strong>
      <p>${escapeHtml(m.detail)}</p>
    </article>
  `);
}

function renderMobileMaturity(latest) {
  const mobile = latest.categories.find((c) => c.id === "mobile");
  const pct = mobile ? mobile.metrics.filter((m) => m.unit === "%") : [];
  renderInto("mobile-progress", pct, (m) => `
    <article class="progress-item">
      <div class="progress-top"><span>${escapeHtml(m.label)}</span><span>${m.value}%</span></div>
      <div class="progress-bar" data-status="${escapeHtml(badgeKind(m.status))}"><span style="width:${clampPercent(m.value)}%"></span></div>
      <p class="progress-note">${escapeHtml(m.detail)}</p>
    </article>
  `);

  renderInto("module-list", latest.modules || [], (mod) => `
    <article class="status-row" data-status="${escapeHtml(mod.status)}">
      <header><h3>${escapeHtml(mod.name)}</h3>${statusBadge(mod.status, STATUS_LABEL[mod.status] || mod.status)}</header>
      <p>${escapeHtml(mod.detail)}</p>
    </article>
  `);
}

function renderDeliveries(history) {
  const recent = history.filter((h) => ["B-097", "B-098", "B-098B", "B-099", "B-100"].includes(h.version));
  renderInto("deliveries", recent, (h) => `
    <article class="timeline-item" data-status="${h.version === "B-100" ? "parcial" : "concluido"}">
      ${statusBadge(h.version === "B-100" ? "yellow" : "green", h.version === "B-100" ? "atual" : "merged")}
      <h3>${escapeHtml(h.version)}</h3>
      <p>${escapeHtml(h.description)}</p>
      <p class="timeline-meta">${h.flutter_tests} testes • ${h.flutter_modules_ready}/${h.flutter_modules_total} modulos</p>
    </article>
  `);
}

function renderDomain(latest, domainId, targetId) {
  const d = (latest.domains || []).find((x) => x.id === domainId);
  const el = document.getElementById(targetId);
  if (!el || !d) return;
  el.innerHTML = `
    <header class="domain-head">
      <h3>${escapeHtml(d.name)}</h3>
      ${statusBadge(d.status, d.status)}
    </header>
    <p class="domain-detail">${escapeHtml(d.detail)}</p>
    <ul class="domain-points">
      ${d.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
    </ul>
  `;
}

function renderRisks(latest) {
  const gaps = latest.categories.find((c) => c.id === "gaps");
  const items = gaps ? gaps.metrics : [];
  renderInto("risk-list", items, (m) => {
    const severity = m.status === "red" ? "alto" : "medio";
    return `
    <article class="risk-item" data-severity="${severity}">
      <header><h3>${escapeHtml(m.label)}</h3>${statusBadge(m.status, m.status === "red" ? "pendente" : "parcial")}</header>
      <p>${escapeHtml(m.detail)}</p>
    </article>`;
  });
}

function renderNextSteps(steps) {
  renderInto("next-steps", steps || [], (s) => `
    <article class="next-item">
      <header><h3>${escapeHtml(s.block)}</h3>${statusBadge("planejado", "proximo")}</header>
      <p>${escapeHtml(s.title)}</p>
    </article>
  `);
}

function renderHistory(history) {
  const rows = [...history].reverse();
  const body = document.getElementById("history-body");
  if (!body) return;
  body.innerHTML = rows
    .map((h) => `
      <tr>
        <td>${escapeHtml(h.version)}</td>
        <td>${escapeHtml(h.snapshot_date)}</td>
        <td>${h.flutter_tests}</td>
        <td>${h.flutter_modules_ready}/${h.flutter_modules_total}</td>
        <td>${h.flutter_mvp_demo}%</td>
        <td>${h.flutter_mvp_vendavel}%</td>
        <td>${h.blocks_completed}</td>
      </tr>
    `)
    .join("");
}

// ---------------------------------------------------------------------------
// Utilitarios
// ---------------------------------------------------------------------------

function statusBadge(status, label) {
  return `<span class="status-badge" data-status="${escapeHtml(badgeKind(status))}">${escapeHtml(label || status)}</span>`;
}

function renderInto(id, items, template) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map(template).join("");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
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

loadData().then(render);
