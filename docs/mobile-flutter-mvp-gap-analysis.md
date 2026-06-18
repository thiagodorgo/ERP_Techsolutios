# Flutter Mobile MVP — Gap Analysis

**Referência de branch:** `feature/mobile-gps-operational-map`
**Data:** 2026-06-17 (atualizado em B-105)
**Responsável:** ERP Techsolutions — Mobile Squad
**KPI Dashboard:** `mobile/flutter_app/Kpis/` — abrir `index.html` por duplo clique (fallback embutido; servidor local opcional)

---

## Politica de KPIs duplos

Existem dois conjuntos de KPIs: `mobile/flutter_app/Kpis/` para o app Flutter e
`Kpis/` para os KPIs gerais/raiz do projeto. A regra permanente e:

- mexeu Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`;
- mexeu fora do mobile: atualizar `Kpis/*`;
- mexeu nos dois: atualizar os dois conjuntos;
- se existir `index.html`, atualizar tambem o HTML.

No pos-B-106, os valores mobile refletidos na raiz sao Flutter 633/633,
Backend 15/15, contratos focados 47/47, modulos Flutter 17/17, MVP demo 90%,
MVP vendavel 68% e 36 blocos entregues.

---

## 1. Status atual do app Flutter

O app Flutter (`mobile/flutter_app`) está em fase de **protótipo avançado estabilizado**. Possui
arquitetura local-first funcional, persistência SQLite via Drift, autenticação local em modo dev e
cobertura de testes de 633 casos no sweep B-106. Pull real de Work Orders (B-099),
sync write parcial de status de OS (B-103), pull de templates de checklist (B-100/B-101) e sync
write parcial de respostas de checklist (B-102) já estão conectados ao backend, com fallback
resiliente. B-104 adiciona upload multipart parcial de evidências JPEG/PNG. B-105 adiciona a
fundacao de GPS/mapa operacional da OS com store `field_location_events`, sync para
`POST /api/v1/mobile/field-locations` e mapa operacional simples. B-106 conecta o adapter GPS
nativo real via `geolocator`, configura permissoes Android/iOS when-in-use e exige opt-in
explicito antes do primeiro pedido nativo. A captura continua manual, somente por
`Enviar localizacao agora`; nao ha background tracking, stream continuo, timer ou envio
silencioso. Ainda falta storage protegido/presigned URL, criação remota de OS/local-only
mapping, aprovação real, conflitos manuais avançados, geofencing/roteirizacao se aprovados e
piloto Android real em dispositivo fisico. Não está pronto para operação ampla de campo com
dados reais.

### Inventário funcional por módulo

| Módulo | Status | Classificação |
|--------|--------|---------------|
| Auth / Login | Funcional (real) | **pronto** — real via `--dart-define=ERP_AUTH_MODE=remote` |
| Bootstrap / Session | Funcional (real) | **pronto** — `GET /api/v1/mobile/bootstrap` chamado; dual-format B-098/B-098A |
| Feature Flags | Funcional | **pronto** — `FeatureFlag`, `CapabilityStatus`; helpers `isFeatureEnabled`/`featureStatus` |
| Sync Cursors | Parseados | **parcial** — `SyncCursors` parseados; consumo incremental aguarda B-100+ |
| Seleção de tenant | Funcional | **pronto** — `TenantSelectorScreen` pós-login |
| Profile | Funcional | **existente** |
| Connectivity | Funcional | **existente** |
| Sync Engine (fila local) | Funcional (parcial real) | **existente** — replay real parcial para OS status, checklist answers e evidence metadata |
| Auto Sync Coordinator | Funcional (parcial real) | **B-106** — sincroniza Field Location antes dos demais dominios sem capturar localizacao automaticamente |
| RDV / Despesas | Funcional (local-first) | **existente** — criação, itens, totais, envio local; submit stub seguro |
| Recibos / Evidências RDV | Metadado apenas | **parcial** — upload real ausente |
| Ordens de Serviço (OS) — lista | Funcional (pull real) | **B-099** — `GET /api/v1/work-orders`; upsert Drift; fallback cache; banners UI |
| Ordens de Serviço (OS) — sync bidirecional | Parcial | **B-103** — statusUpdate backend-ready enviado para `POST /api/v1/mobile/sync/work-order-actions`; local-only/create/approval/evidence ficam pending |
| Work Order Evidence | Parcial real | **B-104** — salva metadado local, blob ref opaco e upload multipart apos `evidence_id` real; falta storage protegido/auditoria |
| Checklists configuráveis | Funcional (local-first) | **existente** — run, respostas, persistência Drift |
| Checklist — pull de templates | Funcional (pull real) | **B-100/B-101** — `GET /api/v1/mobile/checklists/available` com backend real (DTO mobile compativel); cache Drift; banners UI; fallback cache/seeds |
| Checklist — backend available endpoint | Funcional (backend) | **B-101** — handler real, tenant-scoped + RBAC, DTO `title`/`schema_version`/`status active` + envelope `{data,items,meta}` |
| Checklist domain model (rico) | Modelado | **parcial** — `ChecklistTemplate` versionado pronto; backend `available` entregue (B-101); sync write de respostas entregue (B-102) |
| Checklist renderer registry | Funcional | **existente** — 10 tipos nativos + fallback para tipos desconhecidos |
| Checklist sync replay | Funcional (real parcial) | **B-102** — `POST /api/v1/mobile/sync/checklist-actions`; respostas/notas/conclusão de runs com `server_run_id`/`run_id` real; accepted/rejected/conflicts/already_applied |
| Sync Screen | Melhorada | **existente** — domínios, KPIs, banner backend-pending |
| Diagnostics | Dev-only | **existente** — protegida por `kIsDevMode` em produção |
| Aprovações | Placeholder | **futuro** |
| Inventário | Funcional (local-first) | **existente** — entrada/saída local; sem sync real |
| Mapa / GPS | Parcial | **B-106** — adapter GPS nativo real via geolocator, permissoes when-in-use, opt-in explicito, mapa operacional simples e sync Field Location manual |
| Notificações push | Ausente | **futuro** |

---

## 2. Por que ainda não está pronto para campo

O app não pode ser usado em campo real pelos seguintes motivos objetivos:

| Bloqueador | Impacto | Categoria |
|------------|---------|-----------|
| Work Orders — pull real implementado (B-099) | ✅ Resolvido — `GET /api/v1/work-orders` conectado | — |
| Sync bidirecional de OS parcial (B-103) | Status de OS backend-ready chega ao backend; local-only/create/approval/evidence ainda não chegam | Médio |
| Checklist — pull de templates (B-100) + backend real (B-101) | ✅ Resolvido — cliente + handler backend real (`GET /mobile/checklists/available`, DTO compatível) | — |
| Checklist answers sync (B-102) | ✅ Resolvido parcialmente — respostas/notas/conclusão chegam ao contrato backend quando a run tem `server_run_id`/`run_id` real; runs locais sem mapeamento ficam pending; runCreate/anexos/markers/divergência/ack seguem fora do escopo | — |
| Sync de inventário e lacunas avançadas de OS não chegam ao servidor | Inventário, criação remota de OS, aprovação e evidência real ainda não fecham ciclo de campo | Crítico |
| Upload de fotos/evidências parcial (B-104) | Evidências JPEG/PNG chegam ao backend local/dev, mas ainda sem storage protegido, DB/Redis, antivirus e auditoria completa | Alto |
| Sem aprovação mobile real | Fluxo de aprovação de OS não completo | Alto |
| GPS/mapa operacional parcial (B-106) | Adapter real, permissoes e opt-in foram conectados; ainda sem background tracking, stream, timer, envio silencioso, geofencing, roteirizacao e piloto Android fisico | Médio |
| Sem notificações push | Técnico não recebe atribuições em tempo real | Médio |

---

## 3. O que `feature/flutter-mobile-mvp-stabilization` corrigiu

Esta branch transformou um protótipo com riscos críticos em uma fundação estável. Nenhum backend
real foi conectado nesta PR — essa foi uma decisão explícita de escopo (ver seção 5).

### Correções críticas

| # | Problema anterior | Solução implementada | Arquivo |
|---|-------------------|----------------------|---------|
| 1 | `UnimplementedError` no submit de despesa travava o app | `ApiIntegrationUnavailableError` — erro controlado com mensagem amigável | `expense_remote_api.dart` |
| 2 | Work Orders perdidos ao reiniciar | `DriftWorkOrderLocalStore` substitui `InMemoryWorkOrderLocalStore` | `work_order_repository.dart` + `app_database.dart` (schema v4) |
| 3 | Credenciais demo visíveis por padrão na tela de login | Campos limpos; acesso dev isolado em `kIsDevMode` | `login_screen.dart` |
| 4 | `DiagnosticsScreen` acessível por qualquer usuário em produção | Rota protegida por `kIsDevMode` — produção vê placeholder | `router.dart` |

### Melhorias implementadas

| # | Melhoria | Arquivo |
|---|----------|---------|
| 5 | Flag `kIsDevMode` via `--dart-define=ERP_ENV=dev` | `core/config/app_config.dart` |
| 6 | Schema Drift v5 com tabela `work_order_evidence` e campos de upload | `core/local_db/app_database.dart` |
| 7 | SyncScreen com grupos por domínio, 4 KPIs, banner backend-pendente | `shared/ui/sync_screen.dart` |
| 8 | `ChecklistTemplate` versionado — 19 tipos, seções, regras de visibilidade, políticas de sync | `features/checklists/domain/checklist_template_models.dart` |
| 9 | `ChecklistQuestionRendererRegistry` extensível com fallback controlado para tipos desconhecidos | `features/checklists/ui/checklist_question_renderer.dart` |

### Cobertura de testes

- **315 testes Flutter** passando (35 novos nesta branch)
- 3 regressões de testes pre-existentes corrigidas (causadas pela reescrita do SyncScreen)
- **15 testes backend** passando — zero alterações no backend

---

## 4. O que permanece pendente

### Pendências críticas (bloqueiam campo real)

| Item | Status atual | O que falta |
|------|-------------|-------------|
| Auth real com JWT | ✅ Ativo via `--dart-define=ERP_AUTH_MODE=remote` | — |
| Bootstrap real do tenant | ✅ `bootstrapSessionFromJson()` dual-format; aceita B-098 e B-098A | — |
| Pull de Work Orders do servidor | ✅ `DioWorkOrderRemoteApi` ativo (B-099) | Sync incremental por cursor ainda pendente |
| Checklist templates do backend | ✅ `GET /api/v1/mobile/checklists/available` ativo (B-100/B-101) | Sync incremental por cursor ainda pendente |
| Sync real de OS | ✅ Parcial em B-103 — `statusUpdate` backend-ready usa `POST /api/v1/mobile/sync/work-order-actions` | Criar OS remota/local-only mapping, aprovação real, evidência real e resolução manual de conflitos |
| Sync real de checklists | ✅ `DioChecklistSyncBatchApi` ativo para respostas/notas/conclusão de runs reconhecidas pelo backend (B-102) | Checklist run creation/mapping remoto, anexos/markers/divergência/acknowledgement e reconciliação avançada |
| Sync real de inventário | Stub pendente | Implementar batch sync de inventário |
| Upload de fotos / evidências | ✅ Parcial B-104 — `image_picker`, blob local opaco e multipart `POST /api/v1/mobile/evidence-uploads` | Evoluir para presigned URL, storage protegido, persistencia DB/Redis, antivirus e auditoria |

### Pendências importantes (não bloqueiam MVP mas necessárias para campo)

| Item | Status atual | O que falta |
|------|-------------|-------------|
| Aprovação mobile | `ModulePlaceholderScreen` | Implementar fila de aprovação e ações de aprovar/rejeitar |
| GPS / mapa / roteirização | ✅ Parcial B-106 — adapter nativo geolocator, permissoes when-in-use, opt-in explicito, card OS, `/field-map` e sync Field Location | Geofencing, roteirizacao, provider externo de mapa se aprovado e piloto Android real |
| Notificações push | Ausente | FCM (Android) / APNs (iOS) |
| Seleção multi-tenant | ✅ `TenantSelectorScreen` ativa | — |
| Piloto Android real | Sem build signed | Configurar signing, distribuição interna (Firebase App Distribution ou similar) |

### Pendências de menor urgência

| Item | Status atual | O que falta |
|------|-------------|-------------|
| Tipos de pergunta avançados | Fallback controlado | Builders para `gps`, `barcode`, `signature`, `currency`, `date`, `time`, `dateTime`, `computed`, `repeater` |
| `damageMap` integrado | Botão stub | Conectar navegação ao `ChecklistDamageMapScreen` existente; serializar pontos de dano |
| Refresh automático de token | `DioTokenRefreshInterceptor` existe | Validar com Cognito; cobrir expiração em campo sem conectividade |
| Seleção de tenant completa | Sem UI | Pós-login, listar tenants e redirecionar para bootstrap do tenant selecionado |

---

## 5. Decisão de não conectar backend real nesta PR

**Decisão deliberada e documentada.**

O escopo da branch `feature/flutter-mobile-mvp-stabilization` foi explicitamente limitado a:

- Eliminar crashes e riscos críticos do protótipo;
- Estabelecer persistência local confiável (Drift);
- Criar arquitetura extensível para checklists dinâmicos;
- Melhorar UX de telas de transição;
- Garantir cobertura de testes sem reduzir cobertura existente.

As seguintes ações foram **explicitamente proibidas** nesta PR:

- Conectar backend real como default
- Ativar `DioAuthRepository` como default
- Trocar todos os `Pending*` por `Dio*`
- Alterar backend Node.js
- Alterar frontend web React
- Alterar contratos reais de API
- Inventar endpoints como existentes
- Fazer upload real de fotos

**Motivação:** Conectar o backend real antes de estabilizar a base local causaria falhas de
integração mascarando problemas arquiteturais locais. A ordem correta é: base estável → integração
incremental por domínio.

---

## 6. Estratégia de checklist dinâmico

### Princípio

Templates de checklist são criados e versionados no backend. O app baixa, cacheia localmente e
executa offline. Respostas são enfileiradas e sincronizadas quando há conectividade.

### Modelo de dados atual (implementado)

```
ChecklistTemplate (versionado)
  ├─ id, tenantId, code, name, version, status
  ├─ enabledForModules, serviceTypes, branchIds (applies_to)
  ├─ syncPolicy: offlineAllowed, maxOfflineDays
  └─ sections[]
       └─ questions[]
            ├─ type: ChecklistQuestionType (19 tipos)
            ├─ visibleWhen: ChecklistVisibilityRule
            ├─ validation: ChecklistValidationRule
            └─ evidencePolicy: ChecklistEvidencePolicy

ChecklistRunContext
  ├─ runId, templateId, templateVersion
  ├─ tenantId, userId, workOrderId

ChecklistAnswer
  ├─ questionId, questionCode, type, answeredAt
  └─ value (texto | número | bool | opção | opções | attachmentIds)
```

### Tipos de pergunta por status de renderizador

| Categoria | Tipos | Status |
|-----------|-------|--------|
| **Nativo** | `text`, `longText`, `integer`, `decimal`, `yesNo`, `singleChoice`, `multiChoice`, `sectionNote` | **existente** |
| **Stub seguro** | `photo`, `damageMap` | **parcial** — UI presente, ação desabilitada |
| **Fallback controlado** | `currency`, `date`, `time`, `dateTime`, `gps`, `barcode`, `signature`, `computed`, `repeater` | **existente** — exibe aviso ao usuário |

### Extensão do registry

```dart
final registry = ChecklistQuestionRendererRegistry([
  const _TextBuilder(),
  const GpsBuilder(),        // futuro
  const BarcodeBuilder(),    // futuro
]);
```

### Payload de sync (implementado)

```dart
ChecklistAnswer.toSyncPayload()
// → { question_id, question_code, type, answered_at, value }
```

### Contrato de endpoint esperado (proposto — não implementado)

```
GET  /api/v1/mobile/checklists/templates?since=<timestamp>   → templates atualizados
POST /api/v1/mobile/checklists/sync                          → batch de runs/respostas
```

---

## 7. Estratégia local-first

### Princípio

O app opera completamente offline. Toda mutação é persistida localmente antes de qualquer tentativa
de sync remoto. O backend é tratado como destino eventual, não pré-requisito.

### Camadas implementadas

```
UI (Flutter Widgets + Riverpod)
  ↓
Repository (WorkOrderRepository, LocalExpenseRepository, ChecklistRepository)
  ↓
LocalStore — Drift/SQLite (DriftWorkOrderLocalStore, DriftExpenseLocalStore,
             DriftChecklistLocalStore, DriftSyncActionStore)
  ↓
SyncQueue — ações enfileiradas com clientActionId idempotente
  ↓
SyncReplayService — replay por domínio, retry com backoff, conflito controlado
  ↓
RemoteApi — Pending* (stub seguro) → Dio* (real, inativo por padrão)
```

### Isolamento de tenant

Todos os registros Drift incluem `tenant_id`. Queries filtram por tenant ativo da sessão.
Limpeza por tenant via `clearAll()` em cada store.

### Schema Drift — versões

| Versão | Mudança |
|--------|---------|
| v1 | Tabelas base: `sync_actions`, `expense_reports`, `expense_items`, `receipts` |
| v2 | `checklist_runs`, `checklist_answers`, `checklist_attachments` |
| v3 | `checklist_templates`, `checklist_sections`, `checklist_fields` |
| v4 | `work_orders`, `work_order_timeline`, `work_order_evidence` *(esta branch)* |

### Flags de build-time

| Flag | Valor padrão | Efeito |
|------|-------------|--------|
| `--dart-define=ERP_ENV=dev` | `production` | `kIsDevMode=true` — DiagnosticsScreen, botão dev login |
| `--dart-define=ERP_AUTH_MODE=remote` | `local` | `kIsRemoteAuth=true` — DioAuthRepository ativo |

---

## 8. Atores mobile

| Ator | Permissões-chave | Fluxos principais |
|------|-----------------|-------------------|
| **Técnico de Campo** | `work_orders:read`, `work_orders:status`, `checklists:run`, `expenses:create` | Receber OS → Deslocar → Executar checklist → Registrar despesas → Concluir OS |
| **Supervisor** | `work_orders:read`, `work_orders:create`, `workflow:request` | Criar OS → Atribuir técnico → Aprovar solicitações |
| **Gestor de Estoque** | `inventory:read`, `inventory:update` | Registrar entradas/saídas de peças |
| **Auditor / Financeiro** | `expenses:read`, `expenses:approve` | Revisar RDVs → Aprovar ou rejeitar |
| **Administrador** | Todas as permissões | Configurar módulos, permissões, checklists e tenants |

O app resolve permissões localmente via `PermissionSet` recebido no bootstrap. Telas e ações são
habilitadas/desabilitadas sem chamada ao servidor durante a sessão.

---

## 9. Fluxos principais

### 9.1 Ciclo completo de Ordem de Serviço (local-first)

```
Login (local dev / real com ERP_AUTH_MODE=remote)
  → Bootstrap → HomeScreen (módulos habilitados)
  → WorkOrderListScreen (OS do tenant, carregadas do SQLite)
  → WorkOrderDetailScreen (status, timeline, evidence)
  → [status: scheduled → arrived → inService → pendingApproval | completed]
  → WorkOrderExecuteScreen (ações de campo)
  → ChecklistRunScreen (checklist vinculado, se houver)
  → WorkOrderApprovalRequestScreen (se houver bloqueio)
  → SyncScreen (fila de ações pendentes de envio)
```

**Status atual:** Pull real de OS implementado (B-099). Alterações locais de OS ainda não são sincronizadas de volta ao backend.

### 9.2 Ciclo de Prestação de Contas / RDV

```
ExpenseListScreen → NewExpenseReportScreen → ExpenseReportDetailScreen
  → NewExpenseItemScreen (categoria, valor, cidade, fornecedor)
  → ExpenseItemReceiptsScreen (metadado de recibo)
  → ExpenseSubmitScreen → [sync local → fila → replay quando conectado]
```

**Status atual:** Completo localmente. `submitReport` enfileira e retorna `ApiIntegrationUnavailableError` controlada (não crasha).

### 9.3 Ciclo de Checklist

```
ChecklistAvailableScreen (checklists para a OS)
  → ChecklistRunScreen (seções e perguntas, renderer por tipo)
  → [damageMap] → ChecklistDamageMapScreen
  → ChecklistAcknowledgementScreen (assinatura / confirmação)
  → [sync] → fila local → replay quando conectado
```

**Status atual:** Completo localmente com templates demo. Templates reais do backend ausentes.

### 9.4 Ciclo de Inventário

```
InventoryListScreen → StockEntryScreen | StockExitScreen
  → [sync local → fila → replay]
```

**Status atual:** Completo localmente. Sync real pendente.

---

## 10. Próximas fases

### Fase 1 — Integração de Autenticação Real

**Prioridade: Crítica**

| Item | O que fazer | Arquivo(s) alvo |
|------|-------------|-----------------|
| Auth remota | Ativar `DioAuthRepository` como default com `ERP_AUTH_MODE=remote` | `core/auth/auth_repository.dart` |
| Refresh automático de token | Validar `DioTokenRefreshInterceptor` com Cognito real | `core/network/http_client.dart` |
| Sessão expirada em campo | Mostrar UI de sessão expirada; preservar dados locais | `login_screen.dart`, `auth_notifier.dart` |

### Fase 2 — Bootstrap Real e Seleção de Tenant

**Prioridade: Crítica**

| Item | O que fazer | Arquivo(s) alvo |
|------|-------------|-----------------|
| Bootstrap real | Chamar `GET /api/v1/mobile/bootstrap` após login; mapear resposta | `core/bootstrap/bootstrap_repository.dart` |
| Seleção multi-tenant | UI de seleção quando `tenants.length > 1` | Novo: `features/auth/tenant_selector_screen.dart` |
| Módulos dinâmicos | Habilitar/desabilitar cards da home a partir de `enabled_modules` real | `shared/ui/home_screen.dart` |

### Fase 3 — Pull Real de Work Orders

**Prioridade: Crítica**

| Item | O que fazer | Arquivo(s) alvo |
|------|-------------|-----------------|
| Pull de OS | Implementar `DioWorkOrderRemoteApi.listOrders()` e salvar em Drift | `features/work_orders/data/work_order_remote_api.dart` |
| Sync incremental | `since` timestamp para pull apenas de OS atualizadas | `DriftWorkOrderLocalStore` + sync engine |
| Resolução de conflitos | OS modificada local vs. atualizada no servidor | `core/sync/sync_models.dart` |

### Fase 4 — Checklist Remoto Real

**Prioridade: Alta**

| Item | O que fazer | Arquivo(s) alvo |
|------|-------------|-----------------|
| Download de templates | ✅ `GET /api/v1/mobile/checklists/available` cacheado em Drift | B-100/B-101 |
| Sync write de respostas | ✅ `DioChecklistSyncBatchApi` ativo para respostas/notas/conclusão de runs com `server_run_id`/`run_id` real | B-102 |
| Versionamento de template em run | Garantir `template_version` no payload de sync quando o backend exigir | `checklist_template_models.dart` (já modelado) |

### Fase 5 — Sync Completo (OS, Checklists, Inventário)

**Prioridade: Alta**

| Item | O que fazer |
|------|-------------|
| Sync de OS | ✅ Parcial B-103: `WorkOrderSyncReplayService` envia `statusUpdate` backend-ready; falta create/local-only mapping, approval/evidence e conflito manual |
| Sync de checklists | Respostas/notas/conclusão ativo em B-102 para runs backend-ready; run create, anexos/markers/divergência/ack pendentes |
| Sync de inventário | Implementar `DioInventorySyncBatchApi` |
| Replay com retry e backoff | `AutoSyncCoordinator` já dispara Work Orders, checklists, evidências e RDV; validar com backends reais |

### Fase 6 — Upload de Evidências

**Prioridade: Alta**

| Item | O que fazer | Arquivo(s) alvo |
|------|-------------|-----------------|
| Câmera / galeria | Integrar `image_picker` | Novo: `core/evidence/evidence_capture_service.dart` |
| Upload presigned | `POST /api/v1/mobile/evidences/upload-url` → PUT S3 | Novo: `core/evidence/evidence_upload_service.dart` |
| Checksum e status | Salvar hash local; marcar `sync_status` após upload | `work_order_evidence` (schema já criado) |
| Photo builder ativo | Remover `onPressed: null` após integração | `checklist_question_renderer.dart` |

### Fase 7 — Aprovação Mobile

**Prioridade: Média**

| Item | O que fazer |
|------|-------------|
| Fila de aprovações | `GET /api/v1/mobile/approvals` → listar pendentes |
| Ações de campo | Aprovar / rejeitar com justificativa |
| Notificação de resultado | Push ou polling para requester |

### Fase 8 — GPS, Mapa e Roteirização

**Prioridade: Média**

| Item | O que fazer |
|------|-------------|
| Localização | ✅ Adapter GPS nativo real sobre `DeviceLocationProvider`; permissoes Android/iOS when-in-use; opt-in explicito; captura manual apenas |
| Mapa | Evoluir o mapa operacional simples para provider externo de mapa se aprovado |
| Roteirização | Ordenar OS por proximidade; rota sugerida |

### Fase 9 — Notificações Push

**Prioridade: Média**

| Item | O que fazer |
|------|-------------|
| FCM / APNs | Integrar `firebase_messaging` |
| Tipos de notificação | Nova OS atribuída, checklist pendente, aprovação solicitada |
| Deep links | Notificação abre diretamente na tela relevante |

### Fase 10 — Piloto Android Real

**Prioridade: Alta (bloqueante para campo)**

| Item | O que fazer |
|------|-------------|
| Build signed | Configurar `key.properties` e `upload-keystore.jks` |
| Distribuição interna | Firebase App Distribution ou Google Play Internal Testing |
| Monitoramento | Crashlytics + Logcat filtrado |
| Teste de campo | Piloto com 2–3 técnicos reais em ambiente controlado |

---

## Legenda de classificação

| Classificação | Significado |
|---------------|-------------|
| **existente** | Implementado, testado, funcional na branch atual |
| **parcial** | Implementado parcialmente; falta integração real ou cobertura completa |
| **mock/demo** | Presente mas com dados ou sessão simulados — não apto para produção |
| **proposto** | Modelado/documentado; sem implementação de integração real |
| **futuro** | Não iniciado; planejado para fases posteriores |
