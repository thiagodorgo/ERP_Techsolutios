// KPIs Mobile — ERP Techsolutions
// Dashboard estatico. Tenta carregar os JSON oficiais via fetch(); se falhar
// (tipico ao abrir via file://), usa o snapshot embutido abaixo. Sem dependencias
// externas, sem CDN, sem build, sem servidor obrigatorio.

// ---------------------------------------------------------------------------
// Snapshot embutido (fallback) — espelho de kpis-latest.json / kpis-history.json
// Mantido em sincronia a cada entrega. Fonte oficial: os arquivos .json ao lado.
// ---------------------------------------------------------------------------
const EMBEDDED_LATEST = {
  "snapshot_date": "2026-07-05",
  "version": "B-124",
  "branch": "fix/b124-kpis-post-human-approval",
  "description": "B-124 Dashboard web enriquecido com despachos e localizacoes (web-only). O ultimo bloco mobile permanece B-123 (fidelidade visual do fluxo de OS): nenhum arquivo mobile foi alterado no B-124. version/release travados em B-124 para manter (version, block, status) identicos entre os dois conjuntos de KPI (politica de KPIs duplos + teste-guarda).",
  "release": {
    "block": "B-124",
    "title": "Dashboard web enriquecido com despachos e localizacoes",
    "pr": 125,
    "mergeCommit": "dcfa25063111532f8cc1c77d7af8ec4519406bb0",
    "approvedHead": "6605b13630e3f29f98670aabf9ee32e274f40d47",
    "branch": "feat/web-b124-dashboard-dispatches-field-locations",
    "status": "published_after_human_approval",
    "status_label": "Publicado apos avaliacao humana e merge da PR #125 (B-124K)",
    "summary": "B-124 (web-only) enriqueceu o Dashboard web: composicao paralela de GET /work-orders + GET /operations/dispatches + GET /field-locations/latest + GET /notifications/unread-count (+ GET /approvals/pending), 8 KPIs derivados, fila critica combinada (SLA vencido > prioridade > operador sem sinal > aprovacao pendente > OS sem operador), despachos ativos, status de campo real (regra stale de 15 min reutilizada do operations-map.adapter), alertas acionaveis e eventos derivados das listas (sem timeline por OS); fallback por fonte. frontend check/build OK e test:smoke 44/44 (33 -> 44). Nenhum arquivo mobile alterado — as metricas Flutter/mobile (764/764, modulos 17/17, contratos 18/18 e 21/21, MVP 96%/78%) permanecem nos valores oficiais do B-123.",
    "commits": [
      {
        "hash": "dcfa25063111532f8cc1c77d7af8ec4519406bb0",
        "message": "Merge pull request #125 — B-124 dashboard web enriquecido com despachos e localizacoes"
      }
    ],
    "limitation": "S3/presigned real, DB/Redis receipt, antivirus real, download protegido final, retencao definitiva e Settings web sem backend dedicado seguem pendentes. Dashboard web sem dispatches/field-locations foi resolvido no B-124.",
    "fallback": "Timeline cai para o cache local em falha de rede/404/403; rejected, scan_failed, pending_review, erro de rede e timeout preservam a evidencia local; conflitos permanecem em resolucao manual."
  },
  "domains": [
    {
      "id": "work_orders",
      "name": "Work Orders (OS)",
      "status": "parcial",
      "detail": "Pull remoto ativo + sync write de OS com create local-only e status conectado; B-121 conectou a timeline real do detalhe/check-in com fallback local seguro.",
      "points": [
        "GET /api/v1/work-orders conectado com upsert no Drift",
        "GET /api/v1/work-orders/:id/timeline conectado no detalhe/check-in (B-121) com fallback local",
        "POST /api/v1/mobile/sync/work-order-actions conectado para work_order.create e statusUpdate backend-ready",
        "localId -> serverId implementado para accepted e already_applied",
        "Auto-sync montado no app root com ordem segura (B-121)"
      ]
    },
    {
      "id": "checklists",
      "name": "Checklists",
      "status": "parcial",
      "detail": "Pull de templates ativo + sync write de respostas conectado; B-121 tornou o adapter de render tolerante a fields e components.",
      "points": [
        "GET /api/v1/mobile/checklists/available com handler backend real",
        "GET /api/v1/mobile/checklists/:id/render aceita fields e components (orderIndex -> order, componentKey -> type)",
        "Tipo desconhecido vira unsupported com mensagem segura no render",
        "POST /api/v1/mobile/sync/checklist-actions conectado no replay Flutter",
        "Payload seguro sem tenant externo, token, path, base64 ou file_data"
      ]
    },
    {
      "id": "evidence",
      "name": "Evidencias Mobile",
      "status": "parcial",
      "detail": "B-108 endurece o upload binario real parcial com storage protegido local/dev, scanner testavel, auditoria segura e resposta publica com referencia opaca.",
      "points": [
        "POST /api/v1/mobile/evidence-uploads preserva upload multipart",
        "Resposta sem path, bucket, storage key, URL publica, token, base64 ou binario",
        "Provider local protegido implementado para dev/test",
        "Referencia opaca evfile_*",
        "EvidenceScanner testavel com Noop/Fake scanner",
        "MIME validation JPEG/PNG",
        "Size validation 10 MB",
        "Checksum SHA-256",
        "Auditoria segura accepted/rejected/scan_failed/stored",
        "Estados stored, rejected, scan_failed e pending_review tratados no mobile",
        "Evidencia local preservada em erro, rejected, scan_failed, pending_review, rede e timeout",
        "S3/presigned real, DB/Redis receipt, antivirus real, download protegido final e retencao definitiva seguem pendentes"
      ]
    },
    {
      "id": "field_location",
      "name": "Field Location / Mapa Operacional",
      "status": "parcial",
      "detail": "B-106 conecta adapter GPS nativo real mantendo captura manual e opt-in explicito.",
      "points": [
        "GeolocatorDeviceLocationProvider com GeolocatorLocationPort testavel",
        "Permissoes Android/iOS foreground/when-in-use",
        "Sem background tracking",
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
        "Fila de sync local",
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
          "value": 764,
          "total": 764,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "764/764 no full Flutter revalidado na PR #123 (apos cada uma das 7 telas)"
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
          "detail": "No issues found na PR #119 (B-121)"
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
        },
        {
          "id": "mobile_backend_contracts",
          "label": "Mobile Backend Contracts",
          "value": 18,
          "total": 18,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "18/18 em tests/mobile-backend-contracts.test.ts"
        },
        {
          "id": "mobile_core_saas_contracts",
          "label": "Mobile + Core SaaS Contracts",
          "value": 21,
          "total": 21,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "21/21 em mobile-backend-contracts + core-saas-contract"
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
          "detail": "17/17 modulos Flutter prontos; evidencias agora tem hardening de storage/scanner/auditoria."
        },
        {
          "id": "flutter_mvp_demo",
          "label": "MVP Demo Readiness",
          "value": 96,
          "unit": "%",
          "type": "estimated",
          "status": "yellow",
          "detail": "Estimado. Ultimo valor documentado na rodada B-113 a B-120; B-121 nao propos novo percentual."
        },
        {
          "id": "flutter_mvp_vendavel",
          "label": "MVP Vendavel (Producao)",
          "value": 78,
          "unit": "%",
          "type": "estimated",
          "status": "yellow",
          "detail": "Estimado. Ultimo valor documentado na rodada B-113 a B-120; ainda requer S3/presigned real, DB/Redis receipt, antivirus real, download protegido e retencao definitiva."
        },
        {
          "id": "flutter_test_files",
          "label": "Arquivos de Teste Flutter",
          "value": 52,
          "unit": "arquivos",
          "type": "real",
          "status": "green",
          "detail": "52 arquivos de teste no diretorio test/"
        },
        {
          "id": "flutter_evidence_sync",
          "label": "Evidence Metadata + Binary Upload",
          "value": 1,
          "unit": "parcial",
          "type": "real",
          "status": "yellow",
          "detail": "B-108 preserva metadata sync e multipart B-104, adicionando storage protegido local/dev, scanner e auditoria segura."
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
          "id": "backend_mobile_contract_tests",
          "label": "Testes de Contrato Mobile",
          "value": 18,
          "total": 18,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "18/18 em mobile-backend-contracts; contrato combinado mobile + Core SaaS passou 21/21."
        },
        {
          "id": "backend_mobile_core_saas_contracts",
          "label": "Mobile + Core SaaS Contracts",
          "value": 21,
          "total": 21,
          "unit": "testes",
          "type": "real",
          "status": "green",
          "detail": "21/21 em tests/mobile-backend-contracts.test.ts + tests/core-saas-contract.test.ts"
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
          "value": 49,
          "unit": "blocos",
          "type": "real",
          "status": "green",
          "detail": "B-076 ate B-124, incluindo sub-blocos (A/B/K/F); 48 ate B-123 + B-124 (web-only)"
        },
        {
          "id": "prs_merged",
          "label": "PRs Merged",
          "value": 119,
          "unit": "PRs",
          "type": "real",
          "status": "green",
          "detail": "Contagem real via GitHub (gh pr list --state merged) em 2026-07-05"
        }
      ]
    },
    {
      "id": "gaps",
      "label": "Lacunas para Producao",
      "metrics": [
        {
          "id": "upload_evidencias",
          "label": "Upload Real de Evidencias",
          "value": 1,
          "unit": "parcial",
          "type": "real",
          "status": "yellow",
          "detail": "B-108 implementa hardening local/dev com storage protegido, scanner testavel e auditoria segura; faltam S3/presigned real, DB/Redis, antivirus real, download protegido e retencao."
        },
        {
          "id": "aprovacao_real",
          "label": "Aprovacao Real",
          "value": 1,
          "unit": "implementado",
          "type": "real",
          "status": "green",
          "detail": "B-109 publicou approvals no backend; B-121 integrou aprovar/reprovar (motivo obrigatorio, RBAC) no detalhe da OS web. Decisao mobile permanece fora do escopo."
        },
        {
          "id": "os_sync_bidirecional",
          "label": "OS Sync Bidirecional",
          "value": 1,
          "unit": "parcial",
          "type": "real",
          "status": "yellow",
          "detail": "B-107 conecta create local-only e statusUpdate dependente; merge avancado segue pendente."
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
      "detail": "GET /api/v1/work-orders; upsert Drift; banners UI"
    },
    {
      "name": "OS — Sync Bidirecional",
      "status": "parcial",
      "detail": "B-107 conecta work_order.create local-only, mapeamento localId -> serverId, statusUpdate em duas fases e conflito manual inicial."
    },
    {
      "name": "Checklist Configuravel",
      "status": "pronto",
      "detail": "Modelos ricos + 10 renderers"
    },
    {
      "name": "Checklist — Pull Remoto",
      "status": "pronto",
      "detail": "GET /mobile/checklists/available; parser tolerante; cache Drift; banners UI"
    },
    {
      "name": "Checklist — Backend Available",
      "status": "pronto",
      "detail": "Handler backend real com DTO mobile compativel, tenant-scoped + RBAC"
    },
    {
      "name": "Checklist — Answers Sync",
      "status": "pronto",
      "detail": "POST /api/v1/mobile/sync/checklist-actions com respostas/notas/conclusao de runs backend-ready"
    },
    {
      "name": "Evidence — Metadata + Binary Upload",
      "status": "parcial",
      "detail": "B-108: manifestos + upload multipart parcial com storage protegido local/dev, scanner testavel, auditoria segura, evfile_* e preservacao de evidencia local em erro."
    },
    {
      "name": "Sync Screen",
      "status": "pronto",
      "detail": "Grupos por dominio, KPIs e banners"
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
      "detail": "B-106: adapter GPS nativo real com geolocator, permissao when-in-use, opt-in explicito e sync Field Location manual."
    }
  ],
  "next_steps": [
    {
      "block": "B-12x",
      "title": "Storage externo/presigned URL, antivirus real e download protegido final para evidencias"
    },
    {
      "block": "B-12x",
      "title": "Settings web com backend dedicado (hoje mock-only)"
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
  },
  {
    "snapshot_date": "2026-06-18",
    "version": "B-107",
    "flutter_tests": 654,
    "npm_tests": 15,
    "mobile_backend_contracts": 18,
    "mobile_core_saas_contracts": 21,
    "backend_contract_tests": 21,
    "flutter_modules_ready": 17,
    "flutter_modules_total": 17,
    "flutter_mvp_demo": 92,
    "flutter_mvp_vendavel": 72,
    "blocks_completed": 37,
    "description": "B-107 Criacao remota de OS/local-only mapping + resolucao manual de conflitos — work_order.create, localId -> serverId, already_applied, rejected seguro e conflito manual inicial",
    "pr": 102,
    "mergeCommit": "db36fb318adc234e1fcc6bfeaeb17b6260847c3c",
    "approvedHead": "b3da11d1605af9edb68e5e8f587881fc22115f3f",
    "status": "published_after_human_approval"
  },
  {
    "snapshot_date": "2026-06-18",
    "version": "B-108",
    "flutter_tests": 662,
    "npm_tests": 15,
    "mobile_backend_contracts": 18,
    "mobile_core_saas_contracts": 21,
    "backend_contract_tests": 21,
    "flutter_modules_ready": 17,
    "flutter_modules_total": 17,
    "flutter_mvp_demo": 93,
    "flutter_mvp_vendavel": 76,
    "blocks_completed": 38,
    "description": "B-108 Hardening de evidências/storage — EvidenceStorageProvider, LocalProtectedEvidenceStorageProvider, EvidenceScanner testavel, Noop/Fake scanner, evfile_*, MIME JPEG/PNG, 10 MB, checksum SHA-256, auditoria segura e multipart mobile preservado",
    "pr": 104,
    "mergeCommit": "468fcf16c6b42865aecbd45b05f4c37ced0c3068",
    "approvedHead": "4b221cfdfe3acad9c65214ac5fc7e7892a050331",
    "status": "published_after_human_approval"
  },
  {
    "snapshot_date": "2026-07-05",
    "version": "B-121",
    "flutter_tests": 764,
    "frontend_smoke_tests": 33,
    "npm_tests": 15,
    "mobile_backend_contracts": 18,
    "mobile_core_saas_contracts": 21,
    "backend_contract_tests": 21,
    "flutter_modules_ready": 17,
    "flutter_modules_total": 17,
    "flutter_mvp_demo": 96,
    "flutter_mvp_vendavel": 78,
    "blocks_completed": 46,
    "description": "B-121 MVP integrado Web/Mobile — timeline real no detalhe/check-in com fallback local, auto-sync no app root, adapter de checklist fields/components, base URL por --dart-define; web MVP religado aos endpoints reais (OS lista/detalhe, Dashboard, Aprovacao, nav MVP-only). Consolida B-109 a B-120. Percentuais mvp: ultimos valores documentados na rodada B-113 a B-120 (estimados).",
    "pr": 119,
    "mergeCommit": "e851fd35e141545401abfc0fac774f62e1c2f615",
    "approvedHead": "72d6ccc6476be752ccf8d368a5252c8c97fac522",
    "status": "published_after_human_approval",
    "relatedPrs": [
      { "pr": 117, "mergeCommit": "38facb24a3bc8592cc3ccd6c11d4e428420532ed", "approvedHead": "73a50e905b5a7a3c4665910e705f168d239a8dd9" },
      { "pr": 118, "mergeCommit": "f05566828a2b05d9c4400112d66be490477f0a17", "approvedHead": "474e5ec49e562a39ddcb1eec15253816ff11f520" }
    ]
  },
  {
    "snapshot_date": "2026-07-05",
    "version": "B-122",
    "flutter_tests": 764,
    "frontend_smoke_tests": 33,
    "npm_tests": 15,
    "mobile_backend_contracts": 18,
    "mobile_core_saas_contracts": 21,
    "backend_contract_tests": 21,
    "flutter_modules_ready": 17,
    "flutter_modules_total": 17,
    "flutter_mvp_demo": 96,
    "flutter_mvp_vendavel": 78,
    "blocks_completed": 47,
    "description": "B-122 Alinhamento visual ao prototipo aprovado — Perfil do operador recriado fiel a screen-refs/mobile/perfil.png (hero com papel PT-BR e organizacao, Conta e organizacao, Aparencia, Seguranca e sessao, Sair), sem dados tecnicos crus (token, modo de autenticacao, permissoes, IDs); testes b091 realinhados. Auditoria: 11 telas web MVP conformes; fluxo de OS mobile em Material stock (lacuna). Percentuais mvp mantidos nos valores oficiais do B-121K.",
    "pr": 121,
    "mergeCommit": "fc7e17810940edf933b5e4a2071f8f456e05d4e9",
    "approvedHead": "f151b4fb6e53200204846aed5abb0699c0308d94",
    "status": "published_after_human_approval"
  },
  {
    "snapshot_date": "2026-07-05",
    "version": "B-123",
    "flutter_tests": 764,
    "frontend_smoke_tests": 33,
    "npm_tests": 15,
    "mobile_backend_contracts": 18,
    "mobile_core_saas_contracts": 21,
    "backend_contract_tests": 21,
    "flutter_modules_ready": 17,
    "flutter_modules_total": 17,
    "flutter_mvp_demo": 96,
    "flutter_mvp_vendavel": 78,
    "blocks_completed": 48,
    "description": "B-123 Fidelidade visual do fluxo de OS mobile (visual-only) — 7 telas/areas alinhadas ao prototipo aprovado (lista de OS, detalhe/check-in, execucao, checklists da OS, execucao de checklist, evidencias, sincronizacao), estados semanticos por tokens centrais, sem dado tecnico cru; nenhum repository/service/contrato/sync/model/provider alterado. flutter test 764/764 apos cada tela; analyze sem issues; dart format limpo. Percentuais mvp mantidos (sem decisao humana para alterar).",
    "pr": 123,
    "mergeCommit": "2537558f3f078425c13119a60445e960aac26bb2",
    "approvedHead": "24d439072778438ed3de837fc66a4ef6bce31944",
    "status": "published_after_human_approval"
  },
  {
    "snapshot_date": "2026-07-05",
    "version": "B-124",
    "flutter_tests": 764,
    "frontend_smoke_tests": 44,
    "npm_tests": 15,
    "mobile_backend_contracts": 18,
    "mobile_core_saas_contracts": 21,
    "backend_contract_tests": 21,
    "flutter_modules_ready": 17,
    "flutter_modules_total": 17,
    "flutter_mvp_demo": 96,
    "flutter_mvp_vendavel": 78,
    "blocks_completed": 49,
    "description": "B-124 Dashboard web enriquecido com despachos e localizacoes (web-only) — o Dashboard web passou a compor GET /work-orders + GET /operations/dispatches + GET /field-locations/latest + GET /notifications/unread-count (+ GET /approvals/pending), com 8 KPIs derivados, fila critica combinada (SLA vencido > prioridade > operador sem sinal > aprovacao pendente > OS sem operador), despachos ativos, status de campo real (regra stale de 15 min reutilizada do operations-map.adapter), alertas acionaveis e eventos derivados das listas (sem timeline por OS). frontend check/build OK e test:smoke 44/44 (33 -> 44). Nenhum arquivo mobile alterado; metricas Flutter/mobile inalteradas (764/764, 17/17, 18/18, 21/21, 96%/78%); version/release travados em B-124 para manter (version, block, status) identicos entre os dois conjuntos.",
    "pr": 125,
    "mergeCommit": "dcfa25063111532f8cc1c77d7af8ec4519406bb0",
    "approvedHead": "6605b13630e3f29f98670aabf9ee32e274f40d47",
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
