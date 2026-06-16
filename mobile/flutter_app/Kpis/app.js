// KPIs Mobile — ERP Techsolutions
// Dashboard estatico. Tenta carregar os JSON oficiais via fetch(); se falhar
// (tipico ao abrir via file://), usa o snapshot embutido abaixo. Sem dependencias
// externas, sem CDN, sem build, sem servidor obrigatorio.

// ---------------------------------------------------------------------------
// Snapshot embutido (fallback) — espelho de kpis-latest.json / kpis-history.json
// Mantido em sincronia a cada entrega. Fonte oficial: os arquivos .json ao lado.
// ---------------------------------------------------------------------------
const EMBEDDED_LATEST = {
  "snapshot_date": "2026-06-16",
  "version": "B-102",
  "branch": "feature/flutter-checklist-answers-sync",
  "description": "B-102 Flutter Checklist Answers Sync — sync write de respostas de checklist conectado ao contrato POST /api/v1/mobile/sync/checklist-actions com serializer snake_case, replay idempotente e conflito manual",
  "release": {
    "block": "B-102",
    "title": "Flutter Checklist Answers Sync",
    "branch": "feature/flutter-checklist-answers-sync",
    "status": "implemented_pending_review",
    "status_label": "Implementado em branch — aguardando revisao",
    "summary": "Flutter passa a enviar respostas, notas e conclusao de checklist para POST /api/v1/mobile/sync/checklist-actions usando client_batch_id, client_action_id, tipos backend reais e parser de accepted, rejected, conflicts e already_applied. accepted/already_applied viram synced; rejected vira failed com retry; conflict exige decisao manual.",
    "commits": [
      {
        "hash": "branch-head",
        "message": "feat(mobile): connect checklist answers sync contract"
      },
      {
        "hash": "branch-head",
        "message": "docs: add B-102 checklist answers sync status"
      }
    ],
    "limitation": "Contrato Flutter cobre respostas, notas e conclusao. Permanecem fora do escopo anexos reais, markers, divergencia, acknowledgement em lote, OS sync bidirecional e upload real de evidencias.",
    "fallback": "Checklist continua local-first: a resposta fica salva localmente, a action permanece na fila e erro de rede vira failed retryable sem marcar synced sem confirmacao do servidor."
  },
  "domains": [
    {
      "id": "work_orders",
      "name": "Work Orders (OS)",
      "status": "parcial",
      "detail": "Pull remoto ativo (B-099); sync bidirecional pendente.",
      "points": [
        "GET /api/v1/work-orders conectado com upsert no Drift",
        "Parser tolerante camelCase/snake_case",
        "Banners de pull state em Home e List + RefreshIndicator",
        "Pendente: OS sync bidirecional (B-103)"
      ]
    },
    {
      "id": "checklists",
      "name": "Checklists",
      "status": "parcial",
      "detail": "Pull de templates ativo (B-100/B-101) + sync write de respostas conectado (B-102); anexos/markers/divergencia seguem pendentes.",
      "points": [
        "GET /api/v1/mobile/checklists/available com handler backend real (B-101)",
        "POST /api/v1/mobile/sync/checklist-actions conectado no replay Flutter (B-102)",
        "checklist_answer.upsert -> checklist.item_answer ou checklist.item_note",
        "checklist_run.complete -> checklist.complete",
        "accepted/already_applied viram synced; rejected vira failed; conflict exige decisao manual",
        "Request seguro: sem tenantId, tenant_id, token, Authorization, path, base64, file_data ou binary",
        "Pendente: anexos reais, markers/divergencia/acknowledgement em lote e reconciliacao avancada"
      ]
    },
    {
      "id": "evidence",
      "name": "Evidencias Mobile",
      "status": "parcial",
      "detail": "Sync Flutter de metadados implementado; upload binario final permanece pendente.",
      "points": [
        "POST /api/v1/mobile/sync/evidence-actions conectado no replay mobile",
        "Tipos OS/campo: foto, assinatura e observacao",
        "Request seguro: sem tenant_id, base64, binario, file_data, local_path ou path",
        "already_applied vira sucesso idempotente; conflict exige decisao manual",
        "Pendente: presigned URL, storage protegido, persistencia DB/Redis, antivirus e auditoria completa"
      ]
    },
    {
      "id": "offline",
      "name": "Offline / Local-first",
      "status": "concluido",
      "detail": "Persistencia local SQLite via Drift em todos os dominios.",
      "points": [
        "Drift como cache local de OS, checklists e inventario",
        "App permanece util sem rede (cache/seeds)",
        "Fila de sync local (replay com stubs seguros)",
        "Sem perda de dados em falha de rede no pull"
      ]
    }
  ],
  "categories": [
    {
      "id": "quality",
      "label": "Qualidade de Codigo",
      "metrics": [
        {
          "id": "flutter_tests",
          "label": "Flutter Tests",
          "value": 526,
          "total": 526,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "526/526 — inclui +26 testes B-102 de checklist answers sync"
        },
        {
          "id": "npm_tests",
          "label": "Backend Tests",
          "value": 15,
          "total": 15,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "15/15 passando"
        },
        {
          "id": "flutter_analyze",
          "label": "flutter analyze",
          "value": 0,
          "unit": "issues",
          "type": "real",
          "status": "green",
          "detail": "No issues found — B-102"
        },
        {
          "id": "npm_lint",
          "label": "npm run lint",
          "value": 0,
          "unit": "erros",
          "type": "real",
          "status": "green",
          "detail": "0 erros"
        },
        {
          "id": "npm_build",
          "label": "npm run build",
          "value": 0,
          "unit": "erros",
          "type": "real",
          "status": "green",
          "detail": "0 erros"
        }
      ]
    },
    {
      "id": "mobile",
      "label": "Mobile Flutter MVP",
      "metrics": [
        {
          "id": "flutter_modules_ready",
          "label": "Modulos Flutter Prontos",
          "value": 15,
          "total": 16,
          "unit": "modulos",
          "type": "real",
          "status": "yellow",
          "detail": "Checklist answers sync conectado; pendentes principais: OS sync bidirecional, upload real, Approvals e Field Map"
        },
        {
          "id": "flutter_mvp_demo",
          "label": "MVP Demo Readiness",
          "value": 81,
          "unit": "%",
          "type": "estimated",
          "status": "yellow",
          "detail": "Estimado. Sobe com sync write de checklist conectado ao contrato backend real; ainda depende de OS sync e upload real"
        },
        {
          "id": "flutter_mvp_vendavel",
          "label": "MVP Vendavel (Producao)",
          "value": 56,
          "unit": "%",
          "type": "estimated",
          "status": "yellow",
          "detail": "Estimado. Requer OS sync bidirecional, upload real de evidencias, storage protegido, GPS, aprovacao real e piloto Android"
        },
        {
          "id": "flutter_test_files",
          "label": "Arquivos de Teste Flutter",
          "value": 22,
          "unit": "arquivos",
          "type": "real",
          "status": "green",
          "detail": "22 arquivos de teste no diretorio test/"
        },
        {
          "id": "flutter_os_pull",
          "label": "OS Pull Remoto",
          "value": 1,
          "unit": "conectado",
          "type": "real",
          "status": "green",
          "detail": "GET /api/v1/work-orders com upsert Drift e fallback cache"
        },
        {
          "id": "flutter_checklist_pull",
          "label": "Checklist Templates Pull",
          "value": 1,
          "unit": "conectado",
          "type": "real",
          "status": "green",
          "detail": "GET /api/v1/mobile/checklists/available com backend real B-101, parser tolerante, cache Drift e fallback seeds"
        },
        {
          "id": "flutter_evidence_sync",
          "label": "Evidence Metadata Sync",
          "value": 1,
          "unit": "conectado",
          "type": "real",
          "status": "green",
          "detail": "POST /api/v1/mobile/sync/evidence-actions com body.data, accepted/rejected/conflicts/already_applied e payload seguro (B-098F)"
        },
        {
          "id": "flutter_checklist_answers_sync",
          "label": "Checklist Answers Sync",
          "value": 1,
          "unit": "conectado",
          "type": "real",
          "status": "green",
          "detail": "POST /api/v1/mobile/sync/checklist-actions com client_batch_id, action types reais, parser body.data e replay seguro (B-102)"
        }
      ]
    },
    {
      "id": "backend",
      "label": "Backend Node.js",
      "metrics": [
        {
          "id": "backend_modules",
          "label": "Modulos Backend",
          "value": 8,
          "total": 10,
          "unit": "modulos",
          "type": "estimated",
          "status": "yellow",
          "detail": "core-saas, auth, RBAC, checklists, work-orders, tenants, audit, platform"
        },
        {
          "id": "backend_auth",
          "label": "Auth JWT Real",
          "value": 1,
          "unit": "implementado",
          "type": "real",
          "status": "green",
          "detail": "Login local tenant-scoped + JWT + RBAC persistido"
        },
        {
          "id": "backend_persistence",
          "label": "Persistencia Prisma/PostgreSQL",
          "value": 1,
          "unit": "implementado",
          "type": "real",
          "status": "green",
          "detail": "PrismaCoreSaasStore via CORE_SAAS_PERSISTENCE=prisma"
        },
        {
          "id": "backend_checklist_api",
          "label": "Checklist API",
          "value": 1,
          "unit": "implementado",
          "type": "real",
          "status": "green",
          "detail": "/api/v1/tenant/checklists + /api/v1/mobile/checklists/*"
        },
        {
          "id": "backend_mobile_contract_tests",
          "label": "Testes de Contrato Mobile",
          "value": 45,
          "total": 45,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "45/45 via node --test (core-saas 15 + mobile-backend-contracts 15 + checklist 10 + B-101 5). npm test/CI roda apenas core-saas (15)"
        },
        {
          "id": "backend_mobile_checklists_available",
          "label": "Mobile Checklists Available",
          "value": 1,
          "unit": "implementado",
          "type": "real",
          "status": "green",
          "detail": "GET /api/v1/mobile/checklists/available com DTO mobile compativel ao Flutter B-100, tenant-scoped + RBAC (B-101)"
        }
      ]
    },
    {
      "id": "delivery",
      "label": "Velocidade de Entrega",
      "metrics": [
        {
          "id": "blocks_completed",
          "label": "Blocos Entregues (total)",
          "value": 32,
          "unit": "blocos",
          "type": "real",
          "status": "green",
          "detail": "B-076 ate B-102 + B-098F, incluindo sub-blocos (A/B/K/F)"
        },
        {
          "id": "blocks_last_sprint",
          "label": "Blocos em 2026-06-15",
          "value": 1,
          "unit": "blocos",
          "type": "real",
          "status": "green",
          "detail": "B-102 Flutter Checklist Answers Sync"
        },
        {
          "id": "prs_merged",
          "label": "PRs Merged (estimado)",
          "value": 16,
          "unit": "PRs",
          "type": "estimated",
          "status": "green",
          "detail": "Estimado com base no historico de branches e merges"
        }
      ]
    },
    {
      "id": "gaps",
      "label": "Lacunas para Producao",
      "metrics": [
        {
          "id": "os_sync_bidirecional",
          "label": "OS Sync Bidirecional",
          "value": 0,
          "unit": "implementado",
          "type": "real",
          "status": "red",
          "detail": "Pendente — B-103: push de alteracoes locais de OS ao backend"
        },
        {
          "id": "upload_evidencias",
          "label": "Upload Real de Evidencias",
          "value": 0,
          "unit": "implementado",
          "type": "real",
          "status": "red",
          "detail": "Pendente — presigned URL, storage protegido, persistencia DB/Redis, antivirus e auditoria completa"
        },
        {
          "id": "gps_mapa",
          "label": "GPS / Mapa Operacional",
          "value": 0,
          "unit": "implementado",
          "type": "real",
          "status": "red",
          "detail": "Placeholder — aguarda definicao de requisito"
        },
        {
          "id": "aprovacao_real",
          "label": "Aprovacao Real",
          "value": 0,
          "unit": "implementado",
          "type": "real",
          "status": "red",
          "detail": "Placeholder — fluxo de aprovacao de OS"
        },
        {
          "id": "checklist_answers_sync",
          "label": "Checklist Answers Sync",
          "value": 1,
          "unit": "implementado",
          "type": "real",
          "status": "green",
          "detail": "Implementado no Flutter em B-102 para respostas, notas e conclusao; anexos/markers/divergencia ficam fora do escopo"
        },
        {
          "id": "checklist_remoto",
          "label": "Checklist Remoto Mobile",
          "value": 1,
          "unit": "implementado",
          "type": "real",
          "status": "green",
          "detail": "Pull de templates (B-100), backend real (B-101) e sync write de respostas (B-102) entregues para o contrato parcial atual"
        },
        {
          "id": "evidence_binary_upload",
          "label": "Evidence Binary Upload",
          "value": 0,
          "unit": "implementado",
          "type": "real",
          "status": "red",
          "detail": "B-098F cobre somente metadados; upload final, storage e auditoria ficam pendentes"
        }
      ]
    }
  ],
  "modules": [
    {
      "name": "Auth/Login",
      "status": "pronto",
      "detail": "Real via --dart-define=ERP_AUTH_MODE=remote"
    },
    {
      "name": "Bootstrap/Session",
      "status": "pronto",
      "detail": "Dual-format: B-098 minimal + B-098A expandido"
    },
    {
      "name": "Feature Flags",
      "status": "pronto",
      "detail": "FeatureFlag + CapabilityStatus"
    },
    {
      "name": "Sync Cursors",
      "status": "pronto",
      "detail": "Parseados; prontos para uso incremental"
    },
    {
      "name": "Multi-tenant",
      "status": "pronto",
      "detail": "TenantSelectorScreen + switchTenant()"
    },
    {
      "name": "OS — Lista Local",
      "status": "pronto",
      "detail": "DriftWorkOrderLocalStore ativo"
    },
    {
      "name": "OS — Pull Remoto",
      "status": "pronto",
      "detail": "GET /api/v1/work-orders; upsert Drift; banners UI (B-099)"
    },
    {
      "name": "OS — Sync Bidirecional",
      "status": "pendente",
      "detail": "B-100+ — alteracoes locais para backend"
    },
    {
      "name": "Checklist Configuravel",
      "status": "pronto",
      "detail": "Modelos ricos + 10 renderers"
    },
    {
      "name": "Checklist — Pull Remoto",
      "status": "pronto",
      "detail": "GET /mobile/checklists/available; parser tolerante; cache Drift; banners UI (B-100)"
    },
    {
      "name": "Checklist — Backend Available",
      "status": "pronto",
      "detail": "Handler backend real com DTO mobile compativel, tenant-scoped + RBAC (B-101)"
    },
    {
      "name": "Checklist — Answers Sync",
      "status": "pronto",
      "detail": "POST /api/v1/mobile/sync/checklist-actions com respostas/notas/conclusao e replay idempotente (B-102)"
    },
    {
      "name": "Evidence — Metadata Sync",
      "status": "pronto",
      "detail": "Manifestos de evidencia OS/campo enviados ao backend B-098E sem binario/path/base64 (B-098F)"
    },
    {
      "name": "Sync Screen",
      "status": "pronto",
      "detail": "Grupos por dominio, KPIs, banners, checklist replay com accepted/rejected/conflicts/already_applied"
    },
    {
      "name": "Diagnostics",
      "status": "pronto",
      "detail": "Dev-only (kIsDevMode)"
    },
    {
      "name": "Inventory",
      "status": "pronto",
      "detail": "Local-first (SQLite)"
    },
    {
      "name": "RDV / Despesas",
      "status": "pronto",
      "detail": "Local-first (SQLite)"
    },
    {
      "name": "Approvals",
      "status": "placeholder",
      "detail": "Aguarda definicao de fluxo"
    },
    {
      "name": "Field Map / GPS",
      "status": "placeholder",
      "detail": "Aguarda requisito tecnico"
    }
  ],
  "next_steps": [
    {
      "block": "B-103",
      "title": "OS sync bidirecional (mobile -> backend)"
    },
    {
      "block": "B-104",
      "title": "Upload real de fotos/evidencias com URL protegida e storage"
    },
    {
      "block": "B-105",
      "title": "GPS/mapa operacional e piloto Android real"
    }
  ]
};

const EMBEDDED_HISTORY = [
  {
    "snapshot_date": "2026-06-13",
    "version": "B-094",
    "flutter_tests": 280,
    "npm_tests": 15,
    "flutter_modules_ready": 10,
    "flutter_modules_total": 15,
    "flutter_mvp_demo": 70,
    "flutter_mvp_vendavel": 40,
    "blocks_completed": 22,
    "description": "B-094 QA Geral + Organizacao Flutter + Estrategia de PR"
  },
  {
    "snapshot_date": "2026-06-14",
    "version": "B-097",
    "flutter_tests": 315,
    "npm_tests": 15,
    "flutter_modules_ready": 11,
    "flutter_modules_total": 15,
    "flutter_mvp_demo": 72,
    "flutter_mvp_vendavel": 43,
    "blocks_completed": 24,
    "description": "B-097 Flutter Mobile MVP Stabilization — persistencia SQLite OS, checklist renderers"
  },
  {
    "snapshot_date": "2026-06-14",
    "version": "B-098",
    "flutter_tests": 352,
    "npm_tests": 15,
    "flutter_modules_ready": 11,
    "flutter_modules_total": 15,
    "flutter_mvp_demo": 73,
    "flutter_mvp_vendavel": 45,
    "blocks_completed": 25,
    "description": "B-098 Flutter Real Auth and Bootstrap — DioAuthRepository, BootstrapNotifier, multi-tenant"
  },
  {
    "snapshot_date": "2026-06-14",
    "version": "B-098B",
    "flutter_tests": 413,
    "npm_tests": 15,
    "flutter_modules_ready": 12,
    "flutter_modules_total": 15,
    "flutter_mvp_demo": 74,
    "flutter_mvp_vendavel": 47,
    "blocks_completed": 27,
    "description": "B-098B Flutter Consume Expanded Bootstrap Contract — FeatureFlags, SyncCursors, CapabilityStatus"
  },
  {
    "snapshot_date": "2026-06-14",
    "version": "B-099",
    "flutter_tests": 443,
    "npm_tests": 15,
    "flutter_modules_ready": 12,
    "flutter_modules_total": 15,
    "flutter_mvp_demo": 75,
    "flutter_mvp_vendavel": 50,
    "blocks_completed": 28,
    "description": "B-099 Flutter Real Work Orders Pull — GET /api/v1/work-orders, upsert Drift, banners UI"
  },
  {
    "snapshot_date": "2026-06-15",
    "version": "B-100",
    "flutter_tests": 487,
    "npm_tests": 15,
    "flutter_modules_ready": 13,
    "flutter_modules_total": 15,
    "flutter_mvp_demo": 76,
    "flutter_mvp_vendavel": 51,
    "blocks_completed": 29,
    "description": "B-100 Flutter Checklist Remote Templates — pull de modelos, parser tolerante camelCase/snake_case, cache Drift, banners UX"
  },
  {
    "snapshot_date": "2026-06-15",
    "version": "B-101",
    "flutter_tests": 487,
    "npm_tests": 15,
    "flutter_modules_ready": 13,
    "flutter_modules_total": 15,
    "flutter_mvp_demo": 78,
    "flutter_mvp_vendavel": 52,
    "blocks_completed": 30,
    "description": "B-101 Backend Mobile Checklist Available Endpoint — handler real GET /mobile/checklists/available + DTO compativel ao Flutter B-100, tenant-scoped + RBAC, 5 testes de contrato"
  },
  {
    "snapshot_date": "2026-06-15",
    "version": "B-098F",
    "flutter_tests": 497,
    "npm_tests": 15,
    "flutter_modules_ready": 14,
    "flutter_modules_total": 16,
    "flutter_mvp_demo": 79,
    "flutter_mvp_vendavel": 54,
    "blocks_completed": 31,
    "description": "B-098F Mobile Evidence Flutter Sync — consumo do endpoint evidence-actions, request seguro, parser body.data e replay idempotente/conflito manual"
  },
  {
    "snapshot_date": "2026-06-16",
    "version": "B-102",
    "flutter_tests": 526,
    "npm_tests": 15,
    "flutter_modules_ready": 15,
    "flutter_modules_total": 16,
    "flutter_mvp_demo": 81,
    "flutter_mvp_vendavel": 56,
    "blocks_completed": 32,
    "description": "B-102 Flutter Checklist Answers Sync — serializer snake_case, provider Dio autenticado, parser body.data e replay seguro para accepted/rejected/conflicts/already_applied"
  }
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
  const recent = history.filter((h) => ["B-098", "B-098B", "B-099", "B-100", "B-098F"].includes(h.version));
  renderInto("deliveries", recent, (h) => `
    <article class="timeline-item" data-status="${h.version === "B-098F" ? "parcial" : "concluido"}">
      ${statusBadge(h.version === "B-098F" ? "yellow" : "green", h.version === "B-098F" ? "atual" : "merged")}
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
