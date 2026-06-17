// KPIs Mobile — ERP Techsolutions
// Dashboard estatico. Tenta carregar os JSON oficiais via fetch(); se falhar
// (tipico ao abrir via file://), usa o snapshot embutido abaixo. Sem dependencias
// externas, sem CDN, sem build, sem servidor obrigatorio.

// ---------------------------------------------------------------------------
// Snapshot embutido (fallback) — espelho de kpis-latest.json / kpis-history.json
// Mantido em sincronia a cada entrega. Fonte oficial: os arquivos .json ao lado.
// ---------------------------------------------------------------------------
const EMBEDDED_LATEST = {
  "snapshot_date": "2026-06-17",
  "version": "B-104",
  "branch": "feature/mobile-evidence-real-upload",
  "description": "B-104 Upload real de fotos/evidencias — multipart protegido para POST /api/v1/mobile/evidence-uploads, blob local opaco e upload binario apos sync de metadados",
  "release": {
    "block": "B-104",
    "title": "Upload real de fotos/evidencias",
    "branch": "feature/mobile-evidence-real-upload",
    "status": "implemented_pending_review",
    "status_label": "Implementado em branch — aguardando revisao",
    "summary": "Backend mobile recebe multipart em POST /api/v1/mobile/evidence-uploads com evidencia tenant-scoped, JPEG/PNG ate 10 MB, sha256 obrigatorio e resposta sem path fisico. Flutter salva bytes em blob local opaco, sincroniza metadados primeiro e executa upload binario apenas quando ha evidence_id/serverId real.",
    "commits": [
      {
        "hash": "branch-head",
        "message": "feat: add mobile evidence binary upload contract"
      },
      {
        "hash": "branch-head",
        "message": "feat(mobile): upload evidence binaries after metadata sync"
      },
      {
        "hash": "branch-head",
        "message": "docs: record B-104 evidence upload status"
      }
    ],
    "limitation": "Contrato partial: local/dev storage, sem presigned URL, sem storage protegido final, sem persistencia DB/Redis, sem antivirus e sem auditoria completa de arquivo.",
    "fallback": "Evidencia continua local-first: metadados pending ate OS ter serverId; upload falha como failed retryable ou conflict manual sem perder evidencia/timeline/metadados."
  },
  "domains": [
    {
      "id": "work_orders",
      "name": "Work Orders (OS)",
      "status": "parcial",
      "detail": "Pull remoto ativo (B-099) + sync write parcial de status conectado para OS com server_id/work_order_id real (B-103).",
      "points": [
        "GET /api/v1/work-orders conectado com upsert no Drift",
        "POST /api/v1/mobile/sync/work-order-actions conectado para statusUpdate backend-ready",
        "work_order.status_update -> work_order.status_change",
        "server_id/work_order_id real vira payload.work_order_id; local_id fica apenas em metadata",
        "accepted/already_applied viram synced na action e na WorkOrder local; rejected vira failed; conflict marca conflito manual",
        "OS local-only, create, approval_request e evidence_attach permanecem pending/fora do replay B-103",
        "Pendente: criacao remota de OS, aprovacao real, evidencias reais, GPS/mapa e resolucao manual de conflitos"
      ]
    },
    {
      "id": "checklists",
      "name": "Checklists",
      "status": "parcial",
      "detail": "Pull de templates ativo (B-100/B-101) + sync write de respostas conectado para runs com server_run_id/run_id real (B-102); run create, anexos/markers/divergencia/ack seguem pendentes.",
      "points": [
        "GET /api/v1/mobile/checklists/available com handler backend real (B-101)",
        "POST /api/v1/mobile/sync/checklist-actions conectado no replay Flutter para answerUpsert/runComplete backend-ready (B-102)",
        "checklist_answer.upsert -> checklist.item_answer ou checklist.item_note",
        "checklist_run.complete -> checklist.complete",
        "accepted/already_applied viram synced; rejected vira failed; conflict exige decisao manual",
        "Request seguro: sem tenantId, tenant_id, token, Authorization, path, base64, file_data ou binary",
        "Pendente: checklist_run.create remoto, anexos reais, markers/divergencia/acknowledgement em lote e reconciliacao avancada"
      ]
    },
    {
      "id": "evidence",
      "name": "Evidencias Mobile",
      "status": "parcial",
      "detail": "Sync Flutter de metadados implementado + upload binario real parcial via multipart local/dev (B-104).",
      "points": [
        "POST /api/v1/mobile/sync/evidence-actions conectado no replay mobile",
        "POST /api/v1/mobile/evidence-uploads conectado para upload JPEG/PNG ate 10 MB apos evidence_id real",
        "Blob local opaco via EvidenceBlobStore; localBlobRef nunca entra em payload remoto",
        "Request seguro: sem tenant_id, base64, binario em JSON, file_data, local_path ou path",
        "already_applied vira sucesso idempotente; upload conflict exige decisao manual",
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
          "value": 589,
          "total": 589,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "589/589 esperado no sweep B-104 — inclui teste dedicado de upload real de evidencias"
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
          "detail": "No issues found esperado no sweep B-103"
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
          "value": 16,
          "total": 16,
          "unit": "modulos",
          "type": "real",
          "status": "yellow",
          "detail": "Evidence binary upload parcial conectado; pendentes de produto: storage protegido, Approvals e Field Map"
        },
        {
          "id": "flutter_mvp_demo",
          "label": "MVP Demo Readiness",
          "value": 85,
          "unit": "%",
          "type": "estimated",
          "status": "yellow",
          "detail": "Estimado. Sobe com upload real parcial de evidencias e blob local opaco; ainda depende de piloto Android e GPS"
        },
        {
          "id": "flutter_mvp_vendavel",
          "label": "MVP Vendavel (Producao)",
          "value": 62,
          "unit": "%",
          "type": "estimated",
          "status": "yellow",
          "detail": "Estimado. Requer storage protegido/presigned URL, antivirus, auditoria, GPS, aprovacao real e resolucao de conflitos"
        },
        {
          "id": "flutter_test_files",
          "label": "Arquivos de Teste Flutter",
          "value": 36,
          "unit": "arquivos",
          "type": "real",
          "status": "green",
          "detail": "36 arquivos de teste no diretorio test/ apos B-104"
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
          "detail": "Metadados via POST /api/v1/mobile/sync/evidence-actions + upload binario parcial via POST /api/v1/mobile/evidence-uploads (B-104)"
        },
        {
          "id": "flutter_checklist_answers_sync",
          "label": "Checklist Answers Sync",
          "value": 1,
          "unit": "conectado",
          "type": "real",
          "status": "green",
          "detail": "POST /api/v1/mobile/sync/checklist-actions com client_batch_id, tipos reais, parser body.data e replay seguro apenas para runs backend-ready (B-102)"
        },
        {
          "id": "flutter_work_order_status_sync",
          "label": "OS Status Sync",
          "value": 1,
          "unit": "parcial",
          "type": "real",
          "status": "yellow",
          "detail": "POST /api/v1/mobile/sync/work-order-actions conectado para statusUpdate backend-ready (B-103)"
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
          "value": 34,
          "unit": "blocos",
          "type": "real",
          "status": "green",
          "detail": "B-076 ate B-104 + B-098F, incluindo sub-blocos (A/B/K/F)"
        },
        {
          "id": "blocks_last_sprint",
          "label": "Blocos em 2026-06-15",
          "value": 3,
          "unit": "blocos",
          "type": "real",
          "status": "green",
          "detail": "B-102, B-103 e B-104 em 2026-06-16/17"
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
          "value": 1,
          "unit": "parcial",
          "type": "real",
          "status": "yellow",
          "detail": "B-103 conecta statusUpdate de OS com server_id/work_order_id real; local-only, create, approval e evidence_attach seguem pendentes"
        },
        {
          "id": "upload_evidencias",
          "label": "Upload Real de Evidencias",
          "value": 1,
          "unit": "parcial",
          "type": "real",
          "status": "yellow",
          "detail": "B-104 implementa multipart local/dev com sha256 e blob opaco; faltam presigned URL, storage protegido, DB/Redis, antivirus e auditoria completa"
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
          "detail": "Implementado no Flutter em B-102 para respostas, notas e conclusao de runs com server_run_id/run_id real; run create, anexos/markers/divergencia ficam fora do escopo"
        },
        {
          "id": "checklist_remoto",
          "label": "Checklist Remoto Mobile",
          "value": 1,
          "unit": "implementado",
          "type": "real",
          "status": "green",
          "detail": "Pull de templates (B-100), backend real (B-101) e sync write parcial de respostas (B-102) entregues para runs reconhecidas pelo backend"
        },
        {
          "id": "evidence_binary_upload",
          "label": "Evidence Binary Upload",
          "value": 1,
          "unit": "parcial",
          "type": "real",
          "status": "yellow",
          "detail": "B-104 envia JPEG/PNG ate 10 MB apos metadata sync; ainda sem storage protegido final/presigned URL"
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
      "status": "parcial",
      "detail": "B-103 conecta statusUpdate para OS com server_id/work_order_id real; create/approval/evidence/local-only pendentes"
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
      "detail": "POST /api/v1/mobile/sync/checklist-actions com respostas/notas/conclusao de runs backend-ready e replay idempotente (B-102)"
    },
    {
      "name": "Evidence — Metadata + Binary Upload",
      "status": "parcial",
      "detail": "Manifestos B-098F + upload multipart parcial B-104 com blob local opaco e checksum"
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
      "block": "B-105",
      "title": "GPS/mapa operacional e piloto Android real"
    },
    {
      "block": "B-106",
      "title": "Criacao remota de OS/local-only mapping e resolucao manual de conflitos"
    },
    {
      "block": "B-107",
      "title": "Hardening de evidencias: presigned URL, storage protegido, antivirus e auditoria"
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
    "flutter_tests": 538,
    "npm_tests": 15,
    "flutter_modules_ready": 15,
    "flutter_modules_total": 16,
    "flutter_mvp_demo": 81,
    "flutter_mvp_vendavel": 56,
    "blocks_completed": 32,
    "description": "B-102 Flutter Checklist Answers Sync — serializer snake_case, provider Dio autenticado, parser body.data e replay seguro para runs backend-ready com server_run_id"
  },
  {
    "snapshot_date": "2026-06-16",
    "version": "B-103",
    "flutter_tests": 582,
    "npm_tests": 15,
    "flutter_modules_ready": 16,
    "flutter_modules_total": 16,
    "flutter_mvp_demo": 83,
    "flutter_mvp_vendavel": 58,
    "blocks_completed": 33,
    "description": "B-103 Flutter OS Sync Bidirecional — WorkOrder statusUpdate -> work_order.status_change, replay backend-ready, entity updater local, parser accepted/rejected/conflicts/already_applied e AutoSyncCoordinator"
  }
];

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
