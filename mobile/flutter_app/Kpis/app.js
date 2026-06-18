// KPIs Mobile — ERP Techsolutions
// Dashboard estatico. Tenta carregar os JSON oficiais via fetch(); se falhar
// (tipico ao abrir via file://), usa o snapshot embutido abaixo. Sem dependencias
// externas, sem CDN, sem build, sem servidor obrigatorio.

// ---------------------------------------------------------------------------
// Snapshot embutido (fallback) — espelho de kpis-latest.json / kpis-history.json
// Mantido em sincronia a cada entrega. Fonte oficial: os arquivos .json ao lado.
// ---------------------------------------------------------------------------
const EMBEDDED_LATEST = {
  "snapshot_date": "2026-06-18",
  "version": "B-106",
  "branch": "feature/mobile-native-gps-permissions",
  "description": "B-106 Adapter GPS nativo real + permissoes Android/iOS — geolocator runtime, permissao when-in-use, opt-in explicito e captura manual preservando Field Location seguro",
  "release": {
    "block": "B-106",
    "title": "Adapter GPS nativo real + permissões Android/iOS",
    "pr": 99,
    "mergeCommit": "aac998eedcd95fba1c1a6a8fa5c09ec6fcaa6f26",
    "approvedHead": "2ac4215fa6a69a93b546f53816a7bf5fc2766133",
    "branch": "feature/mobile-native-gps-permissions",
    "status": "published_after_human_approval",
    "status_label": "Publicado apos avaliacao humana e merge",
    "summary": "Conecta o DeviceLocationProvider do B-105 a um adapter nativo real baseado em geolocator, com permissao when-in-use Android/iOS, consentimento explicito e captura somente por acao manual.",
    "commits": [
      {
        "hash": "2ac4215fa6a69a93b546f53816a7bf5fc2766133",
        "message": "feat(mobile): add native GPS adapter and permissions"
      },
      {
        "hash": "aac998eedcd95fba1c1a6a8fa5c09ec6fcaa6f26",
        "message": "Merge pull request #99 from thiagodorgo/feature/mobile-native-gps-permissions"
      }
    ],
    "limitation": "Sem background tracking; Sem stream continuo; Sem timer; Sem envio silencioso; Geofencing pendente; Roteirizacao pendente; Provider externo de mapa pendente, se aprovado; Approval real pendente; Conflitos manuais avancados pendentes; Hardening final de evidencias/storage pendente; Piloto Android real ainda precisa validacao em dispositivo fisico.",
    "fallback": "Servico desligado, permissao negada, permissao permanente e ausencia de opt-in retornam mensagens seguras sem coordenadas, tenant ou tokens."
  },
  "domains": [
    {
      "id": "work_orders",
      "name": "Work Orders (OS)",
      "status": "parcial",
      "detail": "Pull remoto ativo (B-099) + sync write parcial de status conectado (B-103) + mapa operacional simples conectado a OS com Field Location sync (B-105).",
      "points": [
        "GET /api/v1/work-orders conectado com upsert no Drift",
        "POST /api/v1/mobile/sync/work-order-actions conectado para statusUpdate backend-ready",
        "work_order.status_update -> work_order.status_change",
        "server_id/work_order_id real vira payload.work_order_id; local_id fica apenas em metadata",
        "accepted/already_applied viram synced na action e na WorkOrder local; rejected vira failed; conflict marca conflito manual",
        "OS local-only, create, approval_request e evidence_attach permanecem pending/fora do replay B-103",
        "B-105 adiciona card de localizacao operacional na OS e botao Mapa para /field-map?workOrderId=...",
        "Pendente: criacao remota de OS, aprovacao real e resolucao manual de conflitos"
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
      "id": "field_location",
      "name": "Field Location / Mapa Operacional",
      "status": "parcial",
      "detail": "B-106 conecta o adapter GPS nativo real ao DeviceLocationProvider, mantendo captura manual, opt-in explicito e Field Location seguro.",
      "points": [
        "GeolocatorDeviceLocationProvider com GeolocatorLocationPort testavel",
        "Permissoes Android/iOS foreground/when-in-use",
        "Consentimento explicito antes do primeiro pedido de permissao nativa",
        "Captura somente por Enviar localizacao agora; sem captura ao abrir tela",
        "getCurrentPosition com timeout seguro; sem stream, timer ou envio silencioso",
        "POST /api/v1/mobile/field-locations preservado com payload seguro",
        "AutoSyncCoordinator continua sincronizando Field Location antes dos demais dominios sem capturar nova localizacao",
        "Sem background tracking",
        "Sem stream continuo",
        "Sem timer",
        "Sem envio silencioso",
        "Geofencing pendente",
        "Roteirizacao pendente",
        "Provider externo de mapa pendente, se aprovado",
        "Approval real pendente",
        "Conflitos manuais avancados pendentes",
        "Hardening final de evidencias/storage pendente",
        "Piloto Android real ainda precisa validacao em dispositivo fisico"
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
          "value": 633,
          "total": 633,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "633/633 no full Flutter B-106 — inclui 20 testes dedicados de GPS nativo/permissoes"
        },
        {
          "id": "npm_tests",
          "label": "Backend Tests",
          "value": 15,
          "total": 15,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "15/15 em npm test (core-saas.test.ts)"
        },
        {
          "id": "flutter_analyze",
          "label": "flutter analyze",
          "value": 0,
          "unit": "issues",
          "type": "real",
          "status": "green",
          "detail": "No issues found no sweep B-105"
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
          "value": 17,
          "total": 17,
          "unit": "modulos",
          "type": "real",
          "status": "yellow",
          "detail": "Field Location / mapa operacional parcial conectado; pendentes de produto: adapter GPS nativo, Approvals e hardening de campo"
        },
        {
          "id": "flutter_mvp_demo",
          "label": "MVP Demo Readiness",
          "value": 90,
          "unit": "%",
          "type": "estimated",
          "status": "yellow",
          "detail": "Estimado. Sobe com adapter GPS nativo real, opt-in explicito e permissoes when-in-use."
        },
        {
          "id": "flutter_mvp_vendavel",
          "label": "MVP Vendavel (Producao)",
          "value": 68,
          "unit": "%",
          "type": "estimated",
          "status": "yellow",
          "detail": "Estimado. Ainda requer piloto Android fisico, geofencing/roteirizacao se aprovados, approval real, conflitos avancados e hardening final de evidencias/storage."
        },
        {
          "id": "flutter_test_files",
          "label": "Arquivos de Teste Flutter",
          "value": 38,
          "unit": "arquivos",
          "type": "real",
          "status": "green",
          "detail": "38 arquivos de teste no diretorio test/ apos B-106"
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
          "value": 47,
          "total": 47,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "47/47 focados via node --test: mobile-backend-contracts 17 + core-saas-contract 15 + checklist 10 + B-101 5. npm test roda core-saas 15/15"
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
          "value": 36,
          "unit": "blocos",
          "type": "real",
          "status": "green",
          "detail": "B-076 ate B-106 + B-098F, incluindo sub-blocos (A/B/K/F)"
        },
        {
          "id": "blocks_last_sprint",
          "label": "Blocos em 2026-06-15",
          "value": 4,
          "unit": "blocos",
          "type": "real",
          "status": "green",
          "detail": "B-102, B-103, B-104 e B-105 em 2026-06-16/17"
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
          "value": 1,
          "unit": "parcial",
          "type": "real",
          "status": "yellow",
          "detail": "B-106 implementa adapter GPS nativo real com geolocator, permissoes when-in-use e opt-in explicito; mapa externo, geofencing e roteirizacao seguem pendentes."
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
      "status": "parcial",
      "detail": "B-106: adapter GPS nativo real com geolocator, permissao when-in-use, opt-in explicito, mapa operacional simples e sync Field Location manual."
    },
    {
      "name": "Field Location Sync",
      "status": "parcial",
      "detail": "POST /api/v1/mobile/field-locations, store field_location_events, captura manual e AutoSync antes dos demais dominios sem captura automatica."
    }
  ],
  "next_steps": [
    {
      "block": "B-107",
      "title": "Criacao remota de OS/local-only mapping e resolucao manual de conflitos"
    },
    {
      "block": "B-108",
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
  },
  {
    "snapshot_date": "2026-06-17",
    "version": "B-104",
    "flutter_tests": 589,
    "npm_tests": 15,
    "flutter_modules_ready": 16,
    "flutter_modules_total": 16,
    "flutter_mvp_demo": 85,
    "flutter_mvp_vendavel": 62,
    "blocks_completed": 34,
    "description": "B-104 Upload real de fotos/evidencias — multipart protegido, blob local opaco, checksum SHA-256 e upload binario apos metadata sync"
  },
  {
    "snapshot_date": "2026-06-17",
    "version": "B-105",
    "flutter_tests": 613,
    "npm_tests": 15,
    "backend_contract_tests": 47,
    "flutter_modules_ready": 17,
    "flutter_modules_total": 17,
    "flutter_mvp_demo": 87,
    "flutter_mvp_vendavel": 64,
    "blocks_completed": 35,
    "description": "B-105 GPS/mapa operacional da OS — provider abstrato/testavel, store field_location_events, sync Field Location e mapa operacional simples conectado a OS"
  },
  {
    "snapshot_date": "2026-06-17",
    "version": "B-152F",
    "flutter_tests": 613,
    "npm_tests": 15,
    "backend_contract_tests": 47,
    "flutter_modules_ready": 17,
    "flutter_modules_total": 17,
    "flutter_mvp_demo": 87,
    "flutter_mvp_vendavel": 64,
    "blocks_completed": 35,
    "description": "Correcao obrigatoria de KPIs duplos pos-B-105 — mobile/flutter_app/Kpis/ preservado e Kpis/ raiz sincronizado com percentuais mobile"
  },
  {
    "snapshot_date": "2026-06-18",
    "version": "B-106",
    "flutter_tests": 633,
    "npm_tests": 15,
    "backend_contract_tests": 47,
    "flutter_modules_ready": 17,
    "flutter_modules_total": 17,
    "flutter_mvp_demo": 90,
    "flutter_mvp_vendavel": 68,
    "blocks_completed": 36,
    "description": "B-106 Adapter GPS nativo real + permissoes Android/iOS — geolocator, permissao when-in-use, opt-in explicito e captura manual segura",
    "pr": 99,
    "mergeCommit": "aac998eedcd95fba1c1a6a8fa5c09ec6fcaa6f26",
    "approvedHead": "2ac4215fa6a69a93b546f53816a7bf5fc2766133",
    "status": "published_after_human_approval"
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
