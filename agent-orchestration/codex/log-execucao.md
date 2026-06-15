# Log de Execucao

## 2026-06-15 - B-101 Backend Mobile Checklist Available Endpoint

### Natureza

Backend. Fecha a lacuna da B-100 no endpoint `GET /api/v1/mobile/checklists/available`.
Investigacao revelou que o handler nao estava ausente — estava em `checklist.routes.ts`
(nao em `mobile.routes.ts`). O problema real era de contrato: o DTO compartilhado expoe
`name`/`version`/`status: published`, incompativel com o parser Flutter B-100 (`title`,
`schema_version`, `status: active`). Solucao: DTO mobile dedicado + envelope `{data,items,meta}`.

### Mudancas implementadas

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/modules/checklists/checklist.dto.ts` | feat | `toMobileChecklistTemplateDto` (title, schema_version, status active, items) |
| `src/modules/checklists/checklist.controller.ts` | feat | `listAvailableMobileChecklists` usa DTO mobile + envelope `{data,items,meta}` |
| `tests/mobile-checklists-available.test.ts` | test | 5 testes de contrato (rota, auth/tenant, isolamento, publicados, vazio) |

### Validacao final

| Verificacao | Resultado |
|-------------|-----------|
| `npm test` (core-saas) | **15/15** |
| Testes de contrato mobile (`node --test`) | **45/45** (+5 de B-101) |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |
| `flutter analyze` | **No issues found** |
| `flutter test` (regressao) | **486/487** (1 instavel pre-existente, passa isolado) |

### Limitacao conhecida

`npm test`/CI roda apenas `core-saas.test.ts`; os testes de contrato mobile sao orfaos
do runner (incluindo os pre-existentes). `package.json` esta fora do escopo da B-101;
wiring de CI fica para B-102.

---

## 2026-06-15 - B-100 Flutter Checklist Remote Templates

### Natureza

Conexao do `ChecklistRepository` ao endpoint `GET /api/v1/mobile/checklists/available`.
Pull de templates com parser tolerante (camelCase/snake_case + multiplos envelopes),
upsert no cache Drift, fallback para cache/seeds em caso de erro. Banners de pull
state na tela de checklists disponiveis. Nenhuma mudanca em backend ou frontend web.

### Mudancas implementadas

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `lib/features/checklists/data/checklist_remote_api.dart` | feat | Envelopes tolerantes; parser camelCase/snake_case |
| `lib/features/checklists/data/checklist_repository.dart` | feat | Pull state, `refresh()`, fallback cache/seeds |
| `lib/features/checklists/ui/checklist_available_screen.dart` | feat | Stateful + RefreshIndicator + banners |
| `test/features/b100_checklist_remote_templates_test.dart` | test | 44 novos testes |

### Limitacao conhecida

Rota backend `GET /api/v1/mobile/checklists/available` ausente em `mobile.routes.ts`
(listada como implementada no catalogo de bootstrap). Flutter trata com fallback
resiliente para cache/seeds. Escopo backend nao alterado — implementacao da rota
fica para B-101.

### Validacao final

| Verificacao | Resultado |
|-------------|-----------|
| `flutter analyze` | **No issues found** |
| `flutter test` (B-100) | **44/44 passando** |
| `flutter test` (suite) | **486/487** (1 pre-existente instavel passa isolado) |
| `npm test` | **15/15 passando** |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |

---

## 2026-06-14 - B-099K Project KPIs Dashboard

### Natureza

Criacao do dashboard de KPIs em `mobile/flutter_app/Kpis/`.
Sem dependencias externas (sem CDN, sem npm/flutter packages adicionais).
Dashboard HTML/CSS/JS que carrega JSON local via fetch().
Estabelecida regra de atualizacao obrigatoria a partir desta entrega.

### Arquivos criados

| Arquivo | Descricao |
|---------|-----------|
| `Kpis/index.html` | Dashboard com 11 secoes |
| `Kpis/styles.css` | Visual premium dark-mode sem dependencias |
| `Kpis/app.js` | Carregamento e renderizacao dos dados JSON |
| `Kpis/kpis-latest.json` | Snapshot atual B-099 com metricas reais/estimadas |
| `Kpis/kpis-history.json` | Historico B-094 → B-099 |
| `Kpis/kpis-history.md` | Historico legivel por humanos |
| `Kpis/README.md` | Instrucoes de visualizacao e atualizacao |

### Fixes de estabilizacao (commit anterior)

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `shared/ui/home_screen.dart` | fix | Move listener WorkOrderRepository para build() — corrige regressions b084 e home_screen |
| `test/features/b099_real_work_orders_pull_test.dart` | fix | Remove isAfter(before) flaky no teste 1.5 |

### Validacao final

| Verificacao | Resultado |
|-------------|-----------|
| `flutter test` | **443/443 passando** |
| `npm test` | **15/15 passando** |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |

### Regra

A partir da B-099K, toda entrega deve atualizar `mobile/flutter_app/Kpis/` e commitar com
`docs(kpis): update dashboard for B-XXX`.

---

## 2026-06-14 - B-099 Flutter Real Work Orders Pull

### Natureza

Conexao do `WorkOrderRepository` ao endpoint real `GET /api/v1/work-orders`.
Pull em background com upsert no Drift, preservacao de pending locais,
fallback para cache em caso de erro. Banners de pull state em Home e List.
Nenhuma mudanca em backend ou frontend web.

### Mudancas implementadas

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `features/work_orders/data/work_order_remote_api.dart` | fix+feat | Parser tolerante camelCase/snake_case; envelope items desempacotado |
| `features/work_orders/data/work_order_repository.dart` | feat | WorkOrderPullOutcome, pull background, upsert, fallback, getters |
| `features/work_orders/ui/work_order_list_screen.dart` | feat | Banners + RefreshIndicator |
| `shared/ui/home_screen.dart` | feat | Banners de pull state na home |
| `test/features/b099_real_work_orders_pull_test.dart` | test | 35 novos testes (novo arquivo) |

### Decisoes tecnicas

- Guard de seed voltou para `stored.isEmpty` (estava `tenantOrders.isEmpty` — regressao corrigida).
- `refresh()` retorna `pulling` em local mode como no-op seguro.
- `_FakeSyncQueue` nos testes sem dependencia de Riverpod.
- `workOrderRemoteApiProvider` retorna `WorkOrderRemoteApi?` (nullable) — null em local mode.

### Validacao

| Verificacao | Resultado |
|-------------|-----------|
| `flutter test` | **443/443 passando** (+35 novos de B-099) |
| `npm test` | **15/15 passando** |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |

---

## 2026-06-14 - B-098B Flutter Consume Expanded Bootstrap Contract

### Natureza

Adaptacao do app Flutter para consumir o contrato expandido de `GET /api/v1/mobile/bootstrap`
introduzido pela PR #81 (B-098A), mantendo compatibilidade retroativa com o contrato minimo
da B-098. Nenhuma mudanca em backend ou frontend web.

### Mudancas implementadas

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `core/bootstrap/bootstrap_expanded_session.dart` | feat | Novos modelos: CapabilityStatus, FeatureFlag, SyncPolicy, EvidencePolicy, ExpandedMobilePolicy, BootstrapContractMeta, SyncCursors |
| `core/bootstrap/bootstrap_session.dart` | feat | 4 campos opcionais expandidos + helpers isFeatureEnabled/featureStatus |
| `core/bootstrap/bootstrap_repository.dart` | feat | bootstrapSessionFromJson(), _parseMinimal(), _parseExpanded(), _kNavigationModules lookup |
| `test/features/b098b_expanded_bootstrap_test.dart` | test | 42 novos testes (novo arquivo) |

### Decisoes tecnicas

- Deteccao de formato por presenca de chave: `data` wrapper = B-098A; `feature_flags` dentro = expanded.
- Campos expandidos NAO sao cacheados no BootstrapSessionCodec — sessoes restauradas usam defaults neutros.
- Lookup local `_kNavigationModules` converte chaves de modulo em title/route/perms — B-098A so envia `{key, enabled}`.
- SyncCursors parseados mas nao consumidos — preparados para B-099 (Work Orders pull incremental).
- `devBootstrapSession` permanece `const` sem alteracoes — todos os novos campos tem defaults.

### Validacao

| Verificacao | Resultado |
|-------------|-----------|
| `flutter analyze` | **No issues found** |
| `flutter test` | **413/413 passando** (+42 novos de B-098B) |
| `npm test` | **15/15 passando** |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |

---

## 2026-06-14 - B-098 Flutter Real Auth and Bootstrap

### Natureza

Ativacao de autenticacao real controlada e bootstrap completo. Dois providers em paralelo para backward-compat. TenantSelectorScreen para multi-tenant. Nenhuma mudanca em backend ou frontend web.

### Mudancas implementadas

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `core/bootstrap/bootstrap_repository.dart` | feat | fetchForTenant, BootstrapNotifier, bootstrapNotifierProvider |
| `features/auth/tenant_selector_screen.dart` | feat | Tela de selecao de empresa (novo arquivo) |
| `app/router.dart` | feat | /tenant-select route + redirect pendingTenantSelection |
| `core/auth/auth_notifier.dart` | fix | Wildcard Dart 3.11.4 (_, _) |
| `shared/ui/home_screen.dart` | feat | bootstrapNotifierProvider + _BootstrapErrorView |
| `test/features/b098_real_auth_bootstrap_test.dart` | test | 30 novos testes (novo arquivo) |

### Descoberta tecnica

Riverpod 3.3.2 ativa retry exponencial automatico para Exceptions (`ProviderContainer.defaultRetry`). Quando um provider falha, ele entra em `AsyncLoading(retrying:true)` e `when()` chama `loading()`. Solucao: `ProviderScope(retry: (_, _) => null)` nos testes de estado de erro.

### Validacao

| Verificacao | Resultado |
|-------------|-----------|
| `flutter analyze` | **No issues found** |
| `flutter test` | **352/352 passando** |
| `npm test` | **15/15 passando** |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |

---

## 2026-06-14 - B-097 Flutter Mobile MVP Stabilization

### Natureza

Implementacao de correcoes criticas, persistencia SQLite para Work Orders, melhorias de UX no SyncScreen e Login, modelos de checklist dinamico versionados e registry de renderers. Zero mudancas no backend Node.js ou no frontend React.

### Mudancas implementadas

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `core/network/api_error.dart` | fix | ApiIntegrationUnavailableError — substitui UnimplementedError nos stubs Pending* |
| `features/expenses/data/expense_remote_api.dart` | fix | _pending() nao crasha mais — retorna Future.error controlado |
| `core/config/app_config.dart` | feat | kIsDevMode via --dart-define=ERP_ENV=dev |
| `core/local_db/drift_work_order_local_store.dart` | feat | Persistencia SQLite para Work Orders (novo arquivo) |
| `core/local_db/app_database.dart` | feat | Schema v4 — tabela work_order_evidence adicionada |
| `features/work_orders/data/work_order_repository.dart` | fix | Provider trocado: InMemory → DriftWorkOrderLocalStore |
| `features/auth/login_screen.dart` | fix | Campos limpos, acesso dev isolado em kIsDevMode |
| `app/router.dart` | fix | /diagnostics protegida por kIsDevMode em producao |
| `shared/ui/sync_screen.dart` | feat | Reescrita: grupos por dominio, KPIs, banner backend-pending |
| `features/checklists/domain/checklist_template_models.dart` | feat | Modelos ricos versionados (novo arquivo) |
| `features/checklists/ui/checklist_question_renderer.dart` | feat | Registry de renderers com fallback controlado (novo arquivo) |
| `test/features/b097_mvp_stabilization_test.dart` | test | 35 novos testes (Drift, stub, modelos, renderers) |
| `test/home_screen_test.dart` | fix | Override workOrderLocalStoreProvider adicionado |
| `test/features/expenses/expense_local_first_test.dart` | fix | Labels SyncScreen atualizados + override WO store |
| `test/features/b088_checklist_sync_replay_test.dart` | fix | Label atualizado + override WO store |

### Validacao

| Verificacao | Resultado |
|-------------|-----------|
| `flutter analyze --no-fatal-infos` | **No issues found** |
| `flutter test` | **315/315 passando** |
| `npm test` | **15/15 passando** |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |

---

## 2026-06-13 - B-094 (v2) QA Geral + Organizacao Flutter + Estrategia de PR

### Natureza

Auditoria, QA e planejamento completo. Nenhuma feature implementada. Nenhum arquivo Flutter, backend, React ou docs/prototipo modificado.

### Comandos executados

- `git branch --show-current` → `docs/flutter-mobile-ux-html-proposals`
- `git log -1 --oneline` → `167fe6a docs: map flutter ux with html screen proposals`
- `git diff --check` (pre-QA) → **CLEAN**
- `git status --short` → 39 M + ~85 ??
- `git diff --stat` → 39 arquivos, 6589 inserções, 1307 deleções
- `git diff --name-only` → lista completa dos 39 M
- `git ls-files --others --exclude-standard` → ~120 nao rastreados
- `git ls-files mobile/flutter_app` → 82 arquivos rastreados
- `flutter pub get` → OK (15 outdated, nao breaking)
- `dart format --set-exit-if-changed .` → **106 arquivos verificados, 0 alterados — CLEAN**
- `flutter analyze --no-pub` → **No issues found** (136.6s)
- `flutter test --no-pub` → **280/280 passando** (0 falhas)
- `git diff --check` (pos-QA) → **CLEAN**
- `git diff --name-only -- mobile/flutter_app/pubspec.lock` → pub get nao adicionou mudancas ao lock

### Resultado QA Flutter

| Verificacao | Resultado |
|-------------|-----------|
| `flutter pub get` | OK |
| `dart format --set-exit-if-changed .` | **0 alterados** |
| `flutter analyze --no-pub` | **No issues found** |
| `flutter test --no-pub` | **280/280** |
| `git diff --check` pos-QA | **CLEAN** |

### Classificacao worktree (resumo)

- Grupo 1: Flutter lib rastreado (M) — 15 arquivos
- Grupo 2: Flutter pubspec rastreado (M) — 2 arquivos
- Grupo 3: Flutter testes rastreados (M) — 6 arquivos
- Grupo 4: Flutter lib novo ?? — ~75 arquivos
- Grupo 5: Flutter testes novos ?? — 21 arquivos
- Grupo 6: Flutter assets novos ?? — 27 PNG
- Grupo 7: Agent-orchestration M — 2 arquivos
- Grupo 8: Agent-orchestration ?? — 20 arquivos
- Grupo 9: Docs/prototipo M — 7 arquivos
- Grupo 10: Docs novos ?? — 1 arquivo
- Grupo 11: Backend M — 4 arquivos
- Grupo 12: Frontend React M — 2 arquivos
- Grupo 13: README — 1 arquivo
- Grupo 14: experiments/, src/brand/, icons.tsx — Nao entram em PR

### Estrategia de PRs definida

- PR A: Flutter Mobile Foundation (prioridade maxima, ~139 arquivos, draft primeiro)
- PR B: Agent Orchestration + Codex
- PR C: Docs mobile
- PR D: Prototipo HTML (separado para nao inflar PR Flutter)
- PR E: Backend/Frontend polish

### Branch recomendada

`feature/flutter-mobile-field-ops-foundation` (criada a partir do HEAD atual, com autorizacao do usuario)

### Alterado por B-094 (v2)

- `agent-orchestration/codex/comandos/B-094-qa-flutter-pr-organization.md` (novo)
- `agent-orchestration/codex/log-execucao.md` (aditivo)
- `agent-orchestration/docs/status-geral.md` (aditivo)

---

## 2026-06-13 - B-094 QA Geral + Organizacao de Branch/PR

### Natureza

Auditoria, QA e planejamento. Nenhuma feature alterada. Nenhum arquivo Flutter, backend ou React modificado.

### Comandos executados

- `git branch --show-current` → `docs/flutter-mobile-ux-html-proposals`
- `git log -1 --oneline` → `167fe6a docs: map flutter ux with html screen proposals`
- `git diff --check` → CLEAN
- `git status --short` → 39 M + ~120 ??
- `git diff --stat` → 39 arquivos, 6512 inserções, 1307 deleções
- `git ls-files --others --exclude-standard` → ~120 nao rastreados
- `flutter pub get` → OK
- `dart format --set-exit-if-changed .` → **0 alterados — CLEAN**
- `flutter analyze --no-pub` → **No issues found**
- `flutter test --no-pub` → **280/280 passando**
- `git diff --check` (pos-QA) → CLEAN

### Alterado por B-094

- `agent-orchestration/codex/comandos/B-094-qa-branch-pr-organization.md` (novo)
- `agent-orchestration/codex/log-execucao.md` (aditivo)
- `agent-orchestration/docs/status-geral.md` (aditivo)

### KPIs

- Testes: 280/280 (sem alteracao)
- flutter analyze: 0 issues
- dart format --set-exit-if-changed: 0 alterados
- git diff --check: limpo

---

## 2026-06-13 - B-093 Flutter: Evidencia Real Camera/Galeria + Upload Metadata Seguro

### Implementado

- `pubspec.yaml`: `image_picker: ^1.1.2` adicionado
- `lib/core/evidence/evidence_picker.dart` (novo): `EvidenceCaptureSource`, `EvidencePickerResult`, `EvidencePickerService`, `ImagePickerEvidenceService`, `evidencePickerProvider`, `showEvidenceSourcePicker`
- `checklist_models.dart`: `MobileChecklistAttachmentMetadata.captureSource: String?`
- `checklist_repository.dart`: `addAttachment()` com `captureSource` no payload
- `checklist_run_screen.dart`: `pickAndAttach` callback com `showEvidenceSourcePicker` em `_PhotoUploadField` e `_BeforeAfterField`
- `work_order_models.dart`: classe `WorkOrderEvidence`
- `work_order_local_store.dart`: `saveEvidence` + `loadEvidence` na interface e `InMemoryWorkOrderLocalStore`
- `work_order_repository.dart`: `attachEvidence()` + `loadEvidence()` com payload seguro
- `work_order_execute_screen.dart`: `_ExecData.evidences`, `_attachEvidence`, `_EvidenceSection` (substitui placeholder futuro)
- `expense_item_receipts_screen.dart`: `ConsumerStatefulWidget` com `_addReceipt()` conectando picker real
- `test/features/b093_evidence_camera_gallery_test.dart` (novo, 12 testes)

### KPIs

- Testes: 268 → 280 (+12)
- flutter analyze: 0 issues
- dart format: 5 arquivos reformatados
- git diff --check: limpo

### Constraints mantidos

- sem commit, sem push, sem PR
- sem alteracoes em backend, frontend React, experiments/
- payload de sync sem token/path/base64

---

## 2026-06-13 - B-092 Flutter: OS + Checklist + Conclusao Ponta a Ponta

### Implementado

- `lib/features/work_orders/data/work_order_repository.dart`: metodo `completeWorkOrder(localId, {required bool checklistComplete})` — valida checklist obrigatorio, gera `work_order.status_update` sync action com payload seguro (sem token/path/base64), gera `WorkOrderTimelineEventType.completed` timeline event; seed OS-1042 recebe `checklistId: 'cl-seed-1'`
- `lib/features/work_orders/ui/work_order_execute_screen.dart`: redesenhado com classe `_ExecData` (wo + runs + canConclude); `_ensureFuture` cacheia Future com chave de identidade dos repos; secao "Checklist" com `_ChecklistStatusCard` (status chip + botao Abrir/Continuar/Ver); secao "Concluir OS" separada com card de bloqueio e mensagem exata `'Conclua o checklist obrigatorio antes de finalizar a OS.'`; botao `FilledButton 'Concluir OS'` desabilitado quando checklist incompleto; `_openChecklist` reseta future ao navegar para que ao retornar o status seja recarregado
- `lib/features/work_orders/ui/work_order_detail_screen.dart`: `_ChecklistCard` migrado de `StatelessWidget` para `ConsumerWidget`; exibe status do run (Nao iniciado / Em andamento / Concluido) via `checklistRepositoryProvider.getRunsForWorkOrder()`; botao contextual (Abrir / Continuar / Ver checklist) navega para `/checklists/${checklistId}/run`
- `test/features/b092_os_checklist_completion_test.dart` (novo, 10 testes em 2 grupos)

### Grupos de teste (b092)

- `WorkOrderRepository.completeWorkOrder` (6 unit): sem checklist sucede; com checklistId+incomplete lanca StateError exato; com checklistId+complete sucede; timeline recebe evento completed; payload sem token/path/base64; isolamento de tenant
- `WorkOrderExecuteScreen` (4 widget): mensagem de bloqueio visivel quando checklist incompleto; botao desabilitado quando incompleto; botao habilitado sem checklist; botao habilitado quando checklist concluido

### KPIs

- Testes: 258 → 268 (+10)
- flutter analyze: 0 issues
- dart format: 3 arquivos reformatados
- git diff --check: limpo

### Constraints mantidos

- sem commit, sem push, sem PR
- sem alteracoes em backend, frontend React, experiments/

---

## 2026-06-12 - B-090b Flutter: Offline/Online UX + Auto Sync

### Implementado

- `lib/core/network/connectivity_repository.dart` (novo): `NetworkStatus` enum (online/offline/checking/unknown); `NetworkStatusNotifier extends Notifier<NetworkStatus>` com `setStatus/setOnline/setOffline/setChecking`; `networkStatusProvider`; pure Dart, sem plugin nativo
- `lib/core/sync/auto_sync_coordinator.dart` (novo): `AutoSyncState` data class com `isRunning`, `lastSyncAt`, `lastSafeError`; `AutoSyncCoordinator extends Notifier<AutoSyncState>` com `ref.listen(networkStatusProvider)` em `build()`, triggering sync em transicao offline→online; flag `_running` previne concorrencia; `triggerManual()` para botao; `autoSyncCoordinatorProvider`
- `lib/shared/ui/erp_components.dart`: `NetworkStatusBanner` widget (stateless, recebe `NetworkStatus`); invisible em online/unknown; vermelho com `wifi_off_outlined` em offline; amarelo com `sync_outlined` em checking
- `lib/shared/ui/home_screen.dart`: `NetworkStatusBanner` inserido apos greeting card, visivel apenas quando offline/checking
- `lib/shared/ui/sync_screen.dart`: watches `networkStatusProvider` e `autoSyncCoordinatorProvider`; `NetworkStatusBanner` no topo; card de estado auto sync (isRunning, lastSyncAt, lastSafeError); botao "Sincronizar tudo" chama `autoSyncCoordinatorProvider.notifier.triggerManual()`
- `lib/core/diagnostics/diagnostics_screen.dart`: watches `networkStatusProvider`; card "Conectividade" mostrando status atual
- `test/features/b090b_offline_auto_sync_test.dart` (novo, 14 testes em 4 grupos)
- `test/features/expenses/expense_diagnostics_test.dart` (novo): teste de sanitizacao de payload sensivel na tela de diagnostico

### Grupos de teste (b090b)

- `NetworkStatusNotifier` (3): default online; setOffline/setOnline; setStatus cobre todos valores
- `NetworkStatusBanner widget` (3): invisible em online; mensagem offline com wifi_off; mensagem checking com sync_outlined
- `AutoSyncCoordinator` (7): estado inicial idle; offline→online dispara sync; concorrencia bloqueada; manual trigger; falha armazena safeError; sem sessao skipa silenciosamente; online→online nao dispara sync
- `Safety` (1): nenhum campo de AutoSyncState contem token/bearer/eyj

### Arquivos criados

- `mobile/flutter_app/lib/core/network/connectivity_repository.dart` (novo)
- `mobile/flutter_app/lib/core/sync/auto_sync_coordinator.dart` (novo)
- `mobile/flutter_app/test/features/b090b_offline_auto_sync_test.dart` (novo, 14 testes)
- `mobile/flutter_app/test/features/expenses/expense_diagnostics_test.dart` (novo)

### Arquivos alterados

- `mobile/flutter_app/lib/shared/ui/erp_components.dart`
- `mobile/flutter_app/lib/shared/ui/home_screen.dart`
- `mobile/flutter_app/lib/shared/ui/sync_screen.dart`
- `mobile/flutter_app/lib/core/diagnostics/diagnostics_screen.dart`

### Validacoes

- `flutter test`: 243/243 passando (14 novos B-090b + 1 expense_diagnostics, nenhuma regressao)
- `dart format .`: aplicado, sem divergencias
- `flutter analyze`: No issues found
- `git diff --check`: limpo
- sem commit, push ou PR

---

## 2026-06-12 - B-090 Flutter: Auth Production Mode + Token Refresh

### Implementado

- `lib/core/config/app_config.dart` (novo): `kAuthMode = String.fromEnvironment('ERP_AUTH_MODE', defaultValue: 'local')` e `kIsRemoteAuth = kAuthMode == 'remote'`; seleção compile-time sem alterar comportamento default
- `lib/core/network/auth_interceptor.dart` (novo): `AuthRefreshInterceptor extends Interceptor`; intercepta 401, chama `onRefresh()`, patcha headers do cliente e da requisição, retenta com novo token; guarda contra loops via flag `_refreshing` e marker `extra['_authRetry']`; ignora paths de auth (`/api/v1/auth/login|refresh|logout`)
- `lib/core/network/http_client.dart`: adicionado `createAuthenticatedHttpClient(config, {onRefresh, onClearSession})` — chama `createExpenseHttpClient` e anexa `AuthRefreshInterceptor`
- `lib/core/auth/auth_notifier.dart`: `authRepositoryProvider` usa `kIsRemoteAuth` para escolher `DioAuthRepository` (modo remoto) ou `LocalDevAuthRepository` (modo local/dev); `tryRefresh()` e falha em `build()` agora setam `AuthStatus.expired` com `safeError: 'Sua sessao expirou. Faca login novamente.'`
- `lib/features/auth/login_screen.dart`: `safeError` agora cobre também `authState.status == AuthStatus.expired && authState.safeError != null` — exibe mensagem de sessão expirada ao redirecionar para login
- `lib/features/checklists/data/checklist_repository.dart`: `checklistRemoteApiProvider` usa `createAuthenticatedHttpClient` com `onRefresh → tryRefresh()` e `onClearSession → logout()`
- `lib/core/bootstrap/bootstrap_repository.dart`: `mobileBootstrapRepositoryProvider` usa `DioMobileBootstrapRepository` quando `kIsRemoteAuth`, `LocalDevBootstrapRepository` quando local
- `test/features/b090_auth_production_token_refresh_test.dart` (novo, 16 testes em 6 grupos)

### Grupos de teste

- `kIsRemoteAuth constant` (1): `kIsRemoteAuth == false` em ambiente de testes
- `AuthRefreshInterceptor` (5): 401→refresh→retry resolve; auth endpoint nao retenta; `_authRetry=true` nao retenta; `onRefresh null` → `onClearSession`; non-401 propaga sem refresh
- `DioAuthRepository — login` (4): tokens do servidor; token em storage sem senha; 401→`ApiUnauthorizedError`; conexao→`ApiNetworkError`
- `DioAuthRepository — refresh` (3): envia `refreshToken` do storage; retorna novo `accessToken`; sem sessao → `ApiUnauthorizedError` imediato
- `AuthNotifier — expired state` (2): `tryRefresh` falha → `AuthStatus.expired`; `safeError` nao contem bearer
- `Safety` (1): `mapDioError` em 401 nunca ecoa body ou token

### Arquivos alterados

- `mobile/flutter_app/lib/core/config/app_config.dart` (novo)
- `mobile/flutter_app/lib/core/network/auth_interceptor.dart` (novo)
- `mobile/flutter_app/lib/core/network/http_client.dart`
- `mobile/flutter_app/lib/core/auth/auth_notifier.dart`
- `mobile/flutter_app/lib/features/auth/login_screen.dart`
- `mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart`
- `mobile/flutter_app/lib/core/bootstrap/bootstrap_repository.dart`
- `mobile/flutter_app/test/features/b090_auth_production_token_refresh_test.dart` (novo, 16 testes)

### Validacoes

- `flutter test`: 229/229 passando (16 novos B-090, nenhuma regressao)
- `dart format .`: aplicado, sem divergencias
- `flutter analyze`: No issues found
- `git diff --check`: limpo
- sem commit, push ou PR

---

## 2026-06-12 - B-089 Flutter: Auth Real + HTTP Checklist Integration

### Implementado

- `checklist_remote_api.dart`: adicionado `DioChecklistRemoteApi` com todos os 9 metodos (`fetchAvailableChecklists`, `fetchChecklistRender`, `createRun`, `patchRun`, `completeRun`, `createMarker`, `createDivergence`, `acknowledge`, `attachMetadata`); parsers privados JSON→Model para `MobileChecklistTemplate`, `MobileChecklistSchema`, `MobileChecklistField`, `MobileChecklistFieldOption`
- `auth_notifier.dart`: adicionado `authenticatedApiConfigProvider` — le `authStateProvider`, injeta `accessToken` em `ApiConfig`; retorna token null quando nao autenticado
- `checklist_repository.dart`: construtor recebe `remoteApi: ChecklistRemoteApi`; `load()` tenta remote-first (persiste localmente em sucesso, cai para local/seed em qualquer excecao); `getSchema()` tenta remote-first (persiste localmente, cai para local em excecao); `checklistRemoteApiProvider` usa `DioChecklistRemoteApi` com token ou `PendingBackendChecklistRemoteApi` sem token; `checklistRepositoryProvider` passa `remoteApi`
- `b085_checklist_foundation_test.dart` e `b087_checklist_persistence_test.dart`: atualizados com `remoteApi: const PendingBackendChecklistRemoteApi()` nos 3 call sites afetados
- `test/features/b089_auth_http_checklist_test.dart`: 18 testes em 6 grupos

### Arquivos alterados

- `mobile/flutter_app/lib/features/checklists/data/checklist_remote_api.dart`
- `mobile/flutter_app/lib/core/auth/auth_notifier.dart`
- `mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart`
- `mobile/flutter_app/test/features/b089_auth_http_checklist_test.dart` (novo, 18 testes)
- `mobile/flutter_app/test/features/b085_checklist_foundation_test.dart`
- `mobile/flutter_app/test/features/b087_checklist_persistence_test.dart`

### Validacoes

- `flutter test`: 213/213 passando (18 novos B-089, nenhuma regressao)
- `dart format .`: aplicado, sem divergencias residuais
- `flutter analyze`: No issues found
- sem commit, push ou PR

---

## 2026-06-12 - B-088 Flutter: Checklist Sync Replay

### Implementado

- `sync_replay_service.dart`: adicionados `ChecklistSyncBatchApi` (abstract), `MockChecklistSyncBatchApi`, `CaptureChecklistBatchApi`, `PendingBackendChecklistSyncBatchApi`, `DioChecklistSyncBatchApi`; `ChecklistSyncReplayService` com filtragem por `_checklistActionTypes` (7 tipos), logica identica ao `SyncReplayService`, suporte a `processed/failed/conflict/ignored/unknown/NETWORK_ERROR/MISSING_RESULT`
- `sync_providers.dart`: `checklistSyncBatchApiProvider` (default `PendingBackendChecklistSyncBatchApi` — seguro enquanto backend nao disponivel) e `checklistSyncReplayServiceProvider`
- `sync_screen.dart`: botao "Sincronizar checklist" (`OutlinedButton.icon`) usando `checklistSyncReplayServiceProvider`; domain label por action (`_domainLabel`: Checklist/RDV/OS/Estoque/Outro); empty state atualizado para citar todos os dominios
- `diagnostics_screen.dart`: card "Por dominio" com contagem por prefixo de tipo; `_domainBreakdown` function
- `test/features/b088_checklist_sync_replay_test.dart`: 16 testes em 6 grupos

### Separacao RDV vs Checklist

- `SyncReplayService` (RDV/Expense) nao foi alterado — path de replay RDV intacto
- `ChecklistSyncReplayService` e servico dedicado e independente
- `pendingForTenant` retorna todos os tipos; `ChecklistSyncReplayService` filtra por `_checklistActionTypes` antes de enviar
- Actions de outros dominios nunca entram no batch checklist

### Arquivos alterados

- `mobile/flutter_app/lib/core/sync/sync_replay_service.dart`
- `mobile/flutter_app/lib/core/sync/sync_providers.dart`
- `mobile/flutter_app/lib/shared/ui/sync_screen.dart`
- `mobile/flutter_app/lib/core/diagnostics/diagnostics_screen.dart`
- `mobile/flutter_app/test/features/b088_checklist_sync_replay_test.dart` (novo, 16 testes)

### Validacoes

- `flutter test`: 195/195 passando (16 novos B-088, nenhuma regressao)
- `dart format .`: aplicado, sem divergencias
- `flutter analyze`: No issues found
- `git diff --check`: sem whitespace errors
- sem commit, push ou PR

---

## 2026-06-12 - B-087 Flutter: Checklist — persistencia Drift, renderers multiChoice/vehicleSelector/photoUpload/beforeAfter

### Implementado

- `app_database.dart`: schemaVersion 2→3; 6 novas tabelas (checklist_templates, checklist_schemas, checklist_runs, checklist_markers, checklist_attachments, checklist_acknowledgements) em `onCreate` e `onUpgrade (from < 3)` via `CREATE TABLE IF NOT EXISTS`
- `drift_checklist_local_store.dart` (novo): `DriftChecklistLocalStore implements ChecklistLocalStore`; todos os metodos via `customSelect`/`customInsert`; `INSERT OR REPLACE`; serializa `fields_json` e `answers_json` (todos os slots nullaveis); isolamento por `tenant_id`
- `checklist_local_store.dart`: metodos `loadAttachments`/`saveAttachment` adicionados ao abstract + `InMemoryChecklistLocalStore`
- `checklist_repository.dart`: `checklistLocalStoreProvider` migrado para `DriftChecklistLocalStore(appDatabaseProvider)`; metodo `addAttachment` com payload seguro (sem path/base64/token); seed schema 1 ampliado (multiChoice f-checks, photoUpload f-photo, beforeAfter f-before-after); seed schema 2 com vehicleSelector f-vehicle-type (required, order 1)
- `vehicle_asset_helper.dart` (novo): `VehicleAssetHelper` — `assetFolder`, `assetPath`, `isFallback`, `defaultOptions`, `views`, `viewLabels`; sedan tem pasta propria; car/generic → sedan como fallback documentado
- `checklist_run_screen.dart` (reescrito): renderers `_buildMultiChoice` (CheckboxListTile), `_VehicleSelectorField` (4 thumbnails + DropdownButton), `_PhotoUploadField` (metadata placeholder seguro), `_BeforeAfterField` (Antes/Depois com IDs tagged); `onAddAttachment` callback; `_vehicleTypeFromAnswers` para navegacao ao mapa
- `checklist_damage_map_screen.dart` (reescrito): `vehicleType` param; `_VehicleViewSelector` (4 tabs) + `_VehicleImage`; dialog usa `InputDecorator + DropdownButton` (sem deprecated); `errorBuilder` em todas as `Image.asset`
- `router.dart`: ambos os builders do damage-map passam `vehicleType` via `queryParameters`
- `pubspec.yaml`: entries de assets para 6 pastas de veiculos (`assets/images/sedan/` etc.)
- `test/features/b087_checklist_persistence_test.dart` (novo): 20 testes em 7 grupos — Drift persistencia (5), multiChoice (4), vehicleSelector (2), VehicleAssetHelper (4), photoUpload (2), beforeAfter (1), damageMap (2)

### Arquivos alterados/criados

- `mobile/flutter_app/lib/core/local_db/app_database.dart`
- `mobile/flutter_app/lib/core/local_db/drift_checklist_local_store.dart` (novo)
- `mobile/flutter_app/lib/features/checklists/data/checklist_local_store.dart`
- `mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart`
- `mobile/flutter_app/lib/features/checklists/ui/vehicle_asset_helper.dart` (novo)
- `mobile/flutter_app/lib/features/checklists/ui/checklist_run_screen.dart`
- `mobile/flutter_app/lib/features/checklists/ui/checklist_damage_map_screen.dart`
- `mobile/flutter_app/lib/app/router.dart`
- `mobile/flutter_app/pubspec.yaml`
- `mobile/flutter_app/test/features/b087_checklist_persistence_test.dart` (novo)

### Validacoes

- `flutter test`: 179/179 passando, 0 falhas (20 novos em B-087, nenhuma regressao)
- `git diff --check`: sem whitespace errors
- sem commit, push ou PR

---

## 2026-06-12 - B-086 Flutter: Estoque (Inventory) — fundacao local-first

### Implementado

- `inventory_models.dart`: `InventoryItemStatus` (zeroed/critical/low/normal), `InventoryItem` (isCritical, copyWith), `InventoryMovement`, `InventoryMovementType`
- `inventory_local_store.dart`: `InMemoryInventoryLocalStore` — `saveItem` tenant-aware (id+tenantId), `loadItems` por tenant, `findItem`, `saveMovement`
- `inventory_repository.dart`: `InventoryRepository` (ChangeNotifier) — `load` (seed 8 itens demo), `findById` tenant-aware, `recordEntry`/`recordExit` com sync action + `notifyListeners`; `inventoryLocalStoreProvider` e `inventoryRepositoryProvider`
- `inventory_list_screen.dart`: gate `inventory:read`, tabs Todos/Criticos, banner de criticos, FABs condicionais a `inventory:write`
- `stock_entry_screen.dart`: form com dropdown defensivo (`identical` guard no value), loading via `initState` + `addPostFrameCallback` + `ref.listen`, cancellation token
- `stock_exit_screen.dart`: mesma arquitetura do entry; valida saldo antes de saida
- `api_contracts.dart`: `InventoryApiEndpoints` (6 constantes) + `InventorySyncActionTypes` (entryCreate/exitCreate)
- `router.dart`: 3 rotas adicionadas (`/inventory`, `/inventory/entry`, `/inventory/exit`)
- 15 testes em `test/features/b086_inventory_foundation_test.dart`

### Arquivos alterados

- `mobile/flutter_app/lib/core/network/api_contracts.dart`
- `mobile/flutter_app/lib/app/router.dart`
- `mobile/flutter_app/lib/features/inventory/` (criado — 6 arquivos novos: models, local_store, repository, list_screen, stock_entry_screen, stock_exit_screen)
- `mobile/flutter_app/test/features/b086_inventory_foundation_test.dart` (criado, 15 testes)

### Validacoes

- `flutter test`: 159/159 passando, 0 falhas
- `dart analyze`: No issues found
- sem commit, push ou PR

---

## 2026-06-12 - B-085 Flutter: Checklist Operacional — fundacao schema-driven

### Implementado

- `checklist_models.dart`: dominio completo — `MobileChecklistFieldType` (11 tipos), `MobileChecklistSchema` (sortedFields, requiredFields), `MobileChecklistTemplate` (isActive), `MobileChecklistAnswer` (hasValue), `MobileChecklistRun` (copyWith), `MobileChecklistMarker`, `MobileChecklistAttachmentMetadata`, `MobileChecklistAcknowledgement`
- `checklist_local_store.dart`: `ChecklistLocalStore` abstrato + `InMemoryChecklistLocalStore` com seed opcional via construtor
- `checklist_remote_api.dart`: `ChecklistRemoteApi` abstrato + `PendingBackendChecklistRemoteApi` (stub seguro)
- `checklist_repository.dart`: `ChecklistRepository` com load, getSchema, getOrStartRun, saveAnswer, completeRun, addMarker, acknowledge + providers Riverpod
- `api_contracts.dart`: `ChecklistApiEndpoints` (11 constantes) + `ChecklistSyncActionTypes` (7 tipos)
- `checklist_available_screen.dart`: gate de permissao `checklist_run:execute`, FutureBuilder com lista de templates ativos por OS
- `checklist_run_screen.dart`: renderer dinamico por schema — switch exaustivo em `MobileChecklistFieldType`, FutureBuilder no build (evita race condition de sessao), labels como `Row([Text(label), Text(' *')])` para compatibilidade com find.text nos testes
- `checklist_damage_map_screen.dart`: lista de marcadores + dialog de cadastro com `DropdownButtonFormField(initialValue:)`
- `checklist_acknowledgement_screen.dart`: nome + cargo + checkbox de confirmacao
- `router.dart`: 4 novas rotas adicionadas em appRouterProvider e appRouter estatico
- `work_order_detail_screen.dart`: botao Checklist navegando para /work-orders/:id/checklists

### Arquivos alterados

- `mobile/flutter_app/lib/core/network/api_contracts.dart`
- `mobile/flutter_app/lib/app/router.dart`
- `mobile/flutter_app/lib/features/work_orders/ui/work_order_detail_screen.dart`
- `mobile/flutter_app/lib/features/checklists/` (criado — 7 arquivos novos)
- `mobile/flutter_app/test/features/b085_checklist_foundation_test.dart` (criado, 15 testes)

### Validacoes

- `dart format`: OK
- `dart analyze`: No issues found
- `flutter test`: **144/144 passando, 0 falhas** (129 anteriores + 15 novos)
- sem commit, push ou PR

## 2026-06-12 - B-084 Flutter: Home operacional + label OS

### Implementado

- `HomeScreen`: adicionado `_StatsRow` com 3 cards (OS hoje / Em campo / Concluidas) — aparece quando ha OS no tenant
- `HomeScreen`: adicionado `_TodayOsList` com até 5 OS agendadas no dia, cada item navegavel para detalhe
- `HomeScreen`: separado `allTenantOrders` (todos) de `workOrders` (nao-finais) para calculo correto de stats e nextOs
- `WorkOrderDetailScreen`: botao principal renomeado de "Executar OS" para "Iniciar atendimento" (aderencia ao prototipo)
- Helper privado `_sameDay(DateTime, DateTime)` para comparacao de datas sem timezone brittleness

### Arquivos alterados

- `mobile/flutter_app/lib/shared/ui/home_screen.dart` (stats row + today list)
- `mobile/flutter_app/lib/features/work_orders/ui/work_order_detail_screen.dart` (label botao)
- `mobile/flutter_app/test/features/b084_home_stats_test.dart` (criado, 10 testes)

### Validacoes

- `dart format`: OK
- `flutter analyze`: No issues found
- `flutter test`: **129/129 passando, 0 falhas** (119 anteriores + 10 novos)
- `git diff --check`: OK
- sem commit, push ou PR

## 2026-06-12 - B-083 Flutter: polimento de telas (OS + RDV)

### Telas polidas

- `WorkOrderListScreen`: barra de busca + chips de status (`_WoGroup`: Todas/Agendadas/Em campo/Concluidas) + filtro de prioridade dropdown
- `WorkOrderDetailScreen`: stepper horizontal `_WorkOrderStepper` (5 etapas) + `_PreparedActionButton` para Checklist/Evidencias/Mapa
- `NewWorkOrderScreen`: nova rota `/work-orders/new`, form com Titulo/Cliente/Endereco/Prioridade/Data, gate `work_orders:create`
- `ExpenseListScreen`: cabecalho `_SummaryHeader` (total/adiantamento/a receber) + tabs de status `_PcGroup`
- `ExpenseReportDetailScreen`: `_TotalsHeader` com chip de status + 3 colunas de valores; `_ExpenseItemCard` com tags de politica inline
- `ExpenseSubmitScreen`: checklist visual `_SubmissionChecklist` (5 itens) + botao desabilitado com violacoes blocking
- `HomeScreen`: `_GreetingCard` (prefixo do email) + `_NextOsCard` + `_RdvSummaryCard` + `_QuickActions`

### Arquivos alterados / criados

- `mobile/flutter_app/lib/features/work_orders/ui/work_order_list_screen.dart` (reescrito)
- `mobile/flutter_app/lib/features/work_orders/ui/work_order_detail_screen.dart` (reescrito)
- `mobile/flutter_app/lib/features/work_orders/ui/new_work_order_screen.dart` (criado)
- `mobile/flutter_app/lib/features/expenses/ui/expense_list_screen.dart` (reescrito)
- `mobile/flutter_app/lib/features/expenses/ui/expense_report_detail_screen.dart` (reescrito)
- `mobile/flutter_app/lib/features/expenses/ui/expense_submit_screen.dart` (reescrito)
- `mobile/flutter_app/lib/shared/ui/home_screen.dart` (reescrito)
- `mobile/flutter_app/test/features/b083_polish_test.dart` (criado, 30 testes)

### Correcoes de testes aplicadas

- `ListView` -> `SingleChildScrollView + Column` em `NewWorkOrderScreen` e `ExpenseSubmitScreen` — widgets built eagerly, eliminando falha de botao abaixo do fold
- `settlementLabel(totals).split(' ').first` -> `settlementLabel(totals)` — exibe "A receber" completo
- `find.textContaining('tecnico')` -> `find.textContaining('tecnico.')` — distingue saudacao do role line
- `tester.ensureVisible()` antes de tap no botao de submit (borda inferior do viewport)
- `find.text('Todas')` com `findsWidgets` (aparece em ChoiceChip E hint do dropdown)

### Validacoes

- `dart format`: OK (zero diffs)
- `flutter analyze`: No issues found
- `flutter test`: **119/119 passando, 0 falhas**
- `git diff --check`: OK
- sem commit, push ou PR

## 2026-06-12 - B-082 Flutter: fundacao de Ordens de Servico (work_orders)

- criados modelos de dominio: `WorkOrderStatus` (12 estados), `WorkOrderPriority`, `WorkOrder`, `WorkOrderTimelineEvent`, `WorkOrderAssignment`, `WorkOrderApprovalRequest`
- extensoes `WorkOrderStatusX`/`WorkOrderPriorityX`: `label`, `statusTone`, `isFinal`, `allowedTransitions`, `canTransitionTo`
- criado `WorkOrderLocalStore` + `InMemoryWorkOrderLocalStore` (load, save, saveAll, loadTimeline, saveTimelineEvent, clearAll)
- criado `WorkOrderRepository extends ChangeNotifier`: `load`, `findById`, `findByServerId`, `workOrdersForUser`, `updateStatus`, `createWorkOrder`, `createApprovalRequest`, `loadTimeline`
  - `updateStatus`: valida transicao, gera `SyncAction` tipo `work_order.status_update`, registra evento na timeline
  - `createApprovalRequest`: valida motivo nao vazio, gera `SyncAction` tipo `work_order.approval_request`
  - tenant isolation: filtra `workOrders` por `session.activeTenant.tenantId`
  - seeds 3 OS de demonstracao por tenant
- criado `WorkOrderRemoteApi` + `PendingBackendWorkOrderRemoteApi` (stub seguro) + `DioWorkOrderRemoteApi` (9 endpoints)
- criado `workOrderLocalStoreProvider`, `workOrderRepositoryProvider`, `workOrderRemoteApiProvider` em `work_order_repository.dart`
- adicionados `WorkOrderApiEndpoints` (9 endpoints) e `WorkOrderSyncActionTypes` (4 action types) em `api_contracts.dart`
- bumped `AppDatabase.schemaVersion` 1→2 com `onUpgrade`: adiciona `work_orders` e `work_order_timeline` tables
- criadas 4 telas Flutter reais (substituindo placeholder):
  - `WorkOrderListScreen`: lista, filtros status/prioridade, permission gate, empty state, TenantContextBar
  - `WorkOrderDetailScreen`: cabecalho, cliente/local, assignment, checklist futuro, timeline, botoes de acao permission-gated
  - `WorkOrderExecuteScreen`: transicoes de status visivelmente rotuladas, safeError, link para evidencia/checklist futuros
  - `WorkOrderApprovalRequestScreen`: motivo (obrigatorio), impacto, urgencia, sucesso/erro sem dados sensiveis
- atualizadas rotas em `appRouterProvider` e `appRouter` global: `/work-orders`, `/:workOrderId`, `/:workOrderId/execute`, `/:workOrderId/approval-request`
- criados 20 testes em `test/features/work_orders/work_order_test.dart`:
  - testes 1-2: permission resolver (sem/com work_orders:read)
  - testes 3-4: tenant isolation (filtra por tenant ativo, OS de outro tenant nao aparece)
  - testes 5-9: status update (clientActionId nao vazio, payload seguro, transicao invalida, syncStatus pending, enfileira na queue)
  - testes 10-11: approval request (ArgumentError sem motivo, action correta com motivo)
  - testes 12-15: transicoes de status (allowed, invalid, isFinal, allowedTransitions)
  - teste 16: timeline registra evento apos updateStatus
  - testes 17-20: widget (blocked state sem permissao, lista OS do tenant, OS de outro tenant nao aparece, rota navegavel)
- payload dos sync actions nunca contem Bearer token, senha, base64 ou path privado
- `flutter test`: 89/89 passando (69 anteriores + 20 novos)
- `flutter analyze`: No issues found
- `dart format`: OK (8 arquivos formatados)
- `git diff --check`: OK
- sem commit, push ou PR

## 2026-06-11 - B-081 Flutter: autenticacao mobile com secure storage e boundary real

- criados `AuthStatus`, `AuthTokens`, `AuthUser`, `AuthSession`, `AuthState` em `features/auth/auth_models.dart`
- criado `auth_token_storage.dart`: `AuthTokenStorage` interface + `SecureAuthTokenStorage` (flutter_secure_storage) + `InMemoryAuthTokenStorage` (testes)
  - armazena: access token, refresh token, expiry, safe user JSON (sub, email, tenantId, tenantRole, tenantRoles, permissions, scope)
  - nunca armazena: senha, payload bruto, path privado, secrets, logs de token
- criado `auth_repository.dart`: `AuthRepository` interface + `LocalDevAuthRepository` (dev/modo local, TTL 8h) + `DioAuthRepository` (login/refresh/logout via HTTP)
- criado `auth_notifier.dart`: `AuthState`, `AuthNotifier` (AsyncNotifier), `RouterNotifier` (ChangeNotifier), providers Riverpod
- criado `bootstrap_codec.dart`: `BootstrapSessionCodec.encode/decode` — serializa/deserializa `BootstrapSession` completo (Set↔List para `PermissionSet` e `receiptRequiredCategories`)
- substituido `bootstrap_repository.dart`: interface `MobileBootstrapRepository` com `fetch/restoreCached/cache/clearCache`
  - `LocalDevBootstrapRepository`: autenticado → constroi `BootstrapSession` a partir de `AuthUser`; nao autenticado → `devBootstrapSession`
  - `DioMobileBootstrapRepository`: `GET /api/v1/mobile/bootstrap` com Bearer token
  - `bootstrapSessionProvider` agora aguarda `authStateProvider.future` antes de decidir
- substituido `router.dart`: `appRouterProvider` com `RouterNotifier` + redirect de auth guard; `appRouter` global com todas as rotas sem guard (testes)
- atualizado `app.dart`: `ConsumerWidget`, consome `appRouterProvider`
- substituida `login_screen.dart`: `ConsumerStatefulWidget`, watcher de `authStateProvider`, safeError, disabled durante loading
- substituida `profile_screen.dart`: exibe email, tenantRole, expiry formatado, permissions, modules, tenants; logout via `authStateProvider.notifier`
- adicionado `ExpenseApiEndpoints.mobileBootstrap` em `api_contracts.dart`
- criados 11 testes `auth_repository_test.dart`: login, persistencia, restore, logout+clear, null storage, isExpired, safeMessage sem token, header Bearer, codec round-trip, modo dev qualquer email
- corrigidos 2 testes regressivos: `expense_local_first_test` e `expense_diagnostics_test` — adicionado override de `bootstrapSessionProvider` com `devBootstrapSession`
- `flutter test`: 69/69 passando, 0 falhas, 0 erros
- `flutter analyze`: OK, `dart format`: OK, `git diff --check`: OK
- sem commit, push ou PR

## 2026-06-11 - B-080 Flutter: HTTP remoto + SyncReplayService

- criado `ApiError` sealed hierarchy (Network/Timeout/Unauthorized/Conflict/Server) — sem dados sensiveis
- criado `ApiConfig` + `createExpenseHttpClient` + `mapDioError` em `core/network/http_client.dart`
- substituida `ExpenseRemoteApi` com interface completa + `DioExpenseRemoteApi` + `PendingBackendExpenseRemoteApi`
- criado `sync_replay_service.dart`: `SyncActionResult`, `SyncReplayResult`, `ExpenseSyncBatchApi`, `MockExpenseSyncBatchApi`, `CaptureBatchApi`, `DioExpenseSyncBatchApi`, `SyncReplayService`
- `SyncReplayService`: maxRetry=5, marks syncing, batch POST, processa por clientActionId, preserva result_ref, retryCount++ em falha segura
- adicionados `apiConfigProvider`, `syncBatchApiProvider`, `syncReplayServiceProvider` em `sync_providers.dart`
- criados 8 testes `sync_replay_service_test.dart` com `InMemorySyncQueueRepository` + mocks
- `flutter test`: 58/58 passando (48 anteriores + 10 novos)
- `flutter analyze`: OK, `dart format`: OK, `git diff --check`: OK
- sem commit, push ou PR

## 2026-06-11 - B-079 Drift/SQLite Migration

- migrada persistencia local da Prestação de Contas/Despesas de JSON para Drift/SQLite no Flutter
- criado `AppDatabase` (GeneratedDatabase sem codegen) com 4 tabelas: `expense_reports`, `expense_items`, `expense_receipts`, `sync_actions`
- criado `DriftExpenseLocalStore` implementando `ExpenseLocalStore` (interface publica preservada)
- criado `DriftSyncActionStore` implementando `SyncActionStore` (interface publica preservada)
- criado `appDatabaseProvider` (Riverpod) que deve ser sobreescrito antes do ProviderScope
- atualizado `main.dart` com `async main()`, `WidgetsFlutterBinding.ensureInitialized()` e injecao via `ProviderScope.overrides`
- atualizado `expenseLocalStoreProvider` e `syncActionStoreProvider` para usar Drift
- adicionados 8 novos testes Drift com `NativeDatabase.memory()` (round-trip, isolamento, recibos, sync queue)
- `flutter test`: 48/48 passando (40 anteriores + 8 novos)
- `flutter analyze`: OK, sem issues
- `dart format .`: OK
- `git diff --check`: OK
- sem commit, push ou PR

## 2026-05-07

- identificado repositorio oficial `thiagodorgo/ERP_Techsolutios`
- analisado historico recente do GitHub
- detectado conflito entre baseline historico em C e repositorio atual em Node.js + TypeScript
- importada documentacao v1 enviada pelo usuario
- estruturados arquivos-base e trilha operacional
- criado esqueleto tecnico minimo do backend atual do repositorio
- criado commit local com a organizacao desta fase

## 2026-05-21

- evoluido Bloco 02 Core SaaS + RBAC + isolamento multi-tenant
- criado modulo `src/modules/core-saas/` com permissoes, roles, middleware, service, store em memoria, rotas e tipos
- implementado catalogo inicial de permissoes e mapeamento de roles padrao
- mantida compatibilidade com roles legados e com `src/core-saas.ts`
- implementado `tenantContextMiddleware` e `requirePermission(permission)`
- adicionadas rotas protegidas para tenants, users, roles e auditoria inicial
- reforcado isolamento por `tenant_id` em listagens e acesso por id
- criado registro de auditoria minima com `action`, `actor_user_id`, `tenant_id` e `timestamp`
- ampliados testes para acesso permitido, acesso negado, isolamento por tenant, permission mismatch, role sem permissao e acesso cruzado bloqueado
- validado `npm test` com 11 testes passando durante a implementacao
- limitacao registrada: contexto autenticado ainda e simulado por headers e persistencia segue em memoria ate introducao do PostgreSQL

## 2026-05-21 - Bloco 03

- iniciado bloco PostgreSQL + persistencia real com Prisma ORM
- instalados `prisma`, `@prisma/client`, `@prisma/adapter-pg` e `pg`
- criado `prisma.config.ts` porque Prisma 7 removeu `url` do datasource no schema
- criado schema Prisma shared-schema com `tenant_id` nas entidades multi-tenant
- criada migration SQL versionada para tenants, branches, users, roles, permissions, role_permissions e audit_logs
- criado seed inicial idempotente com tenant demo, filial principal, permissoes, roles padrao, admin demo sem senha e audit log
- criado singleton Prisma em `src/database/prisma.ts`
- criados repositories iniciais em `src/modules/core-saas/repositories/`
- mantidos stores em memoria e rotas atuais como transicao segura
- atualizado `.env.example` com `DATABASE_URL` placeholder local
- atualizado `docs/database.md` com decisao PostgreSQL/Prisma, modelo shared-schema e proximos passos
- adicionados testes de integridade do catalogo de permissoes e coerencia das roles RBAC
- validado `npx prisma validate`, `npx prisma generate`, `npm run check` e `npm test`
- migration nao foi executada contra banco real por nao haver `DATABASE_URL` real configurada

## 2026-05-21 - Hardening de dependencias

- executado `npm audit`
- identificadas 3 vulnerabilidades moderadas na cadeia `prisma` -> `@prisma/dev` -> `@hono/node-server`
- vulnerabilidade: `@hono/node-server < 1.19.13`, advisory `GHSA-92pp-h63x-v22m`
- executado `npm audit fix` sem `--force`; comando nao corrigiu e manteve sugestao de downgrade/breaking para `prisma@6.19.3`
- nao executado `npm audit fix --force` para evitar downgrade/breaking do Prisma 7
- aplicado override para `@hono/node-server@1.19.13`
- movido `prisma` de `dependencies` para `devDependencies`
- removido `pg` de `dependencies` diretas por ja ser dependencia transitiva de `@prisma/adapter-pg`
- executado `npm install` para atualizar `package-lock.json`
- confirmado `npm audit` com 0 vulnerabilidades
- aviso residual: `@prisma/streams-local@0.1.2` declara Node `>=22.0.0`, mas e dependencia transitiva de `@prisma/dev`; mantido por compatibilidade atual com Prisma 7 e Node 20 validada pelos comandos do projeto

## 2026-05-31 - Bloco 04B.2B

- revisada a alternancia controlada de persistencia do Core SaaS por `CORE_SAAS_PERSISTENCE`
- mantido `memory` como padrao e preservado `export const app` em memoria para compatibilidade dos testes
- preservado o singleton `coreSaasService` usado pelos testes e pelo adapter de memoria
- extraida a factory configuravel para `src/modules/core-saas/core-saas-runtime.ts`
- extraido o singleton memory para `src/modules/core-saas/core-saas-singleton.ts`
- mantido `PrismaCoreSaasService` fora do barrel principal e carregado apenas via `import()` dinamico no modo `prisma`
- mantidas as rotas Core SaaS usando `ICoreSaasService` async e `handleAsyncRoute`
- frontend, schema Prisma, migrations e dependencias permaneceram intocados

## 2026-06-01 - Bloco 04B.3 Validacao runtime Prisma

- branch usada: `feat/validate-prisma-runtime`
- criado `docs/core-saas-runtime.md` com procedimento operacional para runtime `memory` e `prisma`
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` estavam em execucao
- tentativa inicial de `npm run db:generate` via `cmd` nao repassou `DATABASE_URL` corretamente e falhou com `Cannot resolve environment variable: DATABASE_URL`
- `npm run db:generate` repetido via PowerShell com `DATABASE_URL` local: passou
- `npm run db:migrate` com `DATABASE_URL` local: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed` com `DATABASE_URL` local: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- consultados IDs reais do tenant demo e do admin demo via `docker exec erp-postgres psql`
- servidor em `memory` subiu com `CORE_SAAS_PERSISTENCE=memory`, `DATABASE_URL` vazio e `PORT=3101`
- endpoints testados em `memory`: `GET /api/v1/health` -> 200; `GET /api/v1/users` -> 200 com `data: []`; `GET /api/v1/roles` -> 200
- servidor em `prisma` subiu com `CORE_SAAS_PERSISTENCE=prisma`, `DATABASE_URL` local e `PORT=3102`
- endpoints testados em `prisma`: `GET /api/v1/health` -> 200; `GET /api/v1/users` -> 200 com admin demo; `GET /api/v1/roles` -> 200; `GET /api/v1/audit-events` -> 200
- diferenca observada: `memory` recem-iniciado nao tem seed automatico e retorna lista vazia em `/users`; `prisma` retorna dados persistidos do seed
- diferenca observada: `/audit-events` em `prisma` lista eventos de seeds anteriores porque o seed registra auditoria a cada execucao
- nenhuma correcao de codigo foi necessaria
- frontend, schema Prisma, migrations e dependencias permaneceram intocados

## 2026-06-01 - Bloco 04B.4 Alinhamento memory/prisma

- branch usada: `feat/align-memory-prisma-runtime`
- revisadas diferencas confirmadas entre runtime `memory` e `prisma`
- `memory` mantido volatil e sem seed automatico no startup
- `prisma/seed.ts` ajustado para criar `seed.initialized` apenas se ainda nao existir evento para o tenant demo
- criado `tests/core-saas-contract.test.ts` para validar contrato HTTP DB-free em runtime memory
- `docs/core-saas-runtime.md` atualizado com secao de alinhamento memory vs prisma
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04B.4
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- contagem de `seed.initialized` antes de `npm run db:seed`: 7
- `npm run db:seed`: passou
- contagem de `seed.initialized` depois de `npm run db:seed`: 7
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- servidor real em `memory` subiu em `PORT=3201`; endpoints `health`, `users`, `roles`, `audit-events`, sem tenant e role sem permissao responderam com envelopes esperados
- servidor real em `prisma` subiu em `PORT=3202`; endpoints `health`, `users`, `roles`, `audit-events`, sem tenant e role sem permissao responderam com envelopes esperados
- diferenca confirmada: `memory` sem seed automatico retorna listas vazias em dados volateis; `prisma` retorna dados persistidos do seed demo
- diferenca confirmada: banco local ainda possui 7 eventos historicos `seed.initialized`, mas novas execucoes do seed nao aumentaram a contagem
- pendencias mantidas: auth real, substituicao de headers internos, RBAC real persistido e RLS

## 2026-06-01 - Bloco 04C.1 Auth credentials foundation

- branch usada: `feat/local-auth-credentials`
- criado model Prisma `LocalAuthCredential` e tabela `local_auth_credentials`
- criada migration `20260528000000_add_local_auth_credentials`
- adicionada FK composta `tenant_id + user_id` para garantir que credencial pertence ao usuario do mesmo tenant
- criado modulo `src/modules/auth/`
- decisao de hash: usar `node:crypto` com `scrypt` em formato versionado `scrypt-v1`, sem adicionar dependencia nova
- criado `LocalAuthCredentialRepository` com queries sempre tenant-scoped
- criado `LocalAuthCredentialService` para normalizar email, validar senha minima, criar/upsert credencial e verificar senha sem emitir token
- `prisma/seed.ts` atualizado para criar/atualizar credencial local do admin demo
- `.env.example` atualizado com `DEMO_ADMIN_PASSWORD` local/dev e aviso de nao uso em producao
- criados `tests/auth-credentials.test.ts` e `tests/auth-prisma.test.ts`
- criado `docs/auth.md`
- `docs/database.md` atualizado com `local_auth_credentials`
- login, JWT, refresh token, middleware authenticated actor, Redis runtime e RLS permaneceram fora do escopo
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou e aplicou `20260528000000_add_local_auth_credentials`
- `npm run db:seed`: passou e criou/atualizou credencial local do admin demo
- verificacao SQL confirmou `password_algorithm=scrypt-v1` e que o hash armazenado nao e a senha pura
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste

## 2026-06-01 - Bloco 04C.2 Login local tenant-scoped

- branch usada: `feat/local-auth-login`
- criado endpoint `POST /api/v1/auth/login`
- criado `src/modules/auth/services/local-auth-login.service.ts`
- criado `src/modules/auth/routes/auth.routes.ts`
- criado `src/modules/auth/auth-runtime.ts` com carregamento preguiçoso de Prisma para nao quebrar import do app em modo memory/teste
- `src/app.ts` atualizado para montar `/api/v1/auth`
- formato escolhido para request body: `tenantId`, `email`, `password`
- decisoes de seguranca: erro generico para credenciais invalidas; nenhuma emissao de JWT/refresh token; nenhuma sessao/cookie; `password_hash` nunca retornado
- roles persistidas retornadas via `UserRoleRepository.listByUserForTenant`
- auditoria de login implementada com `auth.login.success` e `auth.login.failed`, sem senha/hash em metadata
- `src/modules/auth/types/auth.types.ts` atualizado com os tipos do contrato de login local
- criado `tests/auth-login.test.ts`
- primeiro teste de login detectou excesso de campos no objeto `tenant`; response shape foi corrigido para retornar apenas `id` e `name`
- `docs/auth.md` atualizado com a secao de login local tenant-scoped
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.2
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- frontend, schema Prisma, migrations, `package.json` e `package-lock.json` permaneceram intocados nesta rodada
- nenhum commit, push ou PR foi criado

## 2026-06-01 - Bloco 04C.6 RBAC persistido

- branch usada: `feat/persistent-rbac-authorization`
- worktree inicial estava limpo e a branch esperada ja estava ativa
- abordagem escolhida: A, resolver persistido separado e testado com PostgreSQL, sem plugar no `tenantContextMiddleware`
- justificativa: `tenantContextMiddleware` atual e sincrono e o runtime `memory` deve continuar DB-free sem import estatico de Prisma
- criado `src/modules/core-saas/services/persistent-authorization.service.ts`
- `PersistentAuthorizationService` recebe repositories por injecao, sem importar Prisma estaticamente
- resolver usa `user_role_assignments` por `tenantId/userId`, roles atribuidas e `role_permissions` para retornar roles/permissoes persistidas
- usuario sem role persistida retorna roles e permissions vazias
- `src/modules/core-saas/index.ts` exporta o service persistido sem carregar Prisma
- `tests/actor-aware-routes.test.ts` reforcado para validar que `x-permissions` nao eleva permissao quando ha JWT
- criado `tests/persistent-rbac-authorization.test.ts`
- `docs/auth.md` atualizado com `Persistent RBAC authorization`
- criado `docs/rbac.md`
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.6
- JWT continua tendo prioridade sobre headers simulados
- `x-permissions` permanece fallback apenas para legacy headers
- nao foram alterados frontend, schema Prisma, migrations, `package.json` ou `package-lock.json`
- refresh token, logout, sessao/cookie, Redis runtime e RLS permaneceram fora do escopo
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `node --test --import tsx tests/auth-actor-middleware.test.ts`: passou com 6 testes
- `node --test --import tsx tests/actor-aware-routes.test.ts`: passou com 7 testes
- `node --test --import tsx tests/persistent-rbac-authorization.test.ts`: passou com 1 teste
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- nenhum commit, push, PR ou merge foi criado

## 2026-06-01 - Bloco 04C.3 JWT access token

- branch usada: `feat/jwt-access-token`
- adicionado `jose` como dependencia runtime para assinatura/verificacao JWT em ESM/TypeScript, sem implementacao manual com `crypto`
- `src/config/env.ts` atualizado com `JWT_SECRET` e `JWT_EXPIRES_IN`
- `JWT_SECRET` passa a falhar claramente em `NODE_ENV=production` quando ausente ou com segredo local/dev conhecido
- `.env.example` recebeu variaveis JWT locais/dev naquele bloco; valores finais atuais foram realinhados depois para `JWT_SECRET="change-me-in-local-development"` e `JWT_EXPIRES_IN="1h"`
- criado `src/modules/auth/services/jwt.service.ts`
- `src/modules/auth/types/auth.types.ts` atualizado com `SignAccessTokenInput` e `AuthenticatedTokenPayload`
- `POST /api/v1/auth/login` atualizado para retornar `access_token`, `token_type: Bearer` e `expires_in`
- payload JWT minimo: `sub`, `tenant_id`, `email`, `roles`, `type=access`, `iat`, `exp`, `iss` e `aud`
- resposta de login nao retorna `password_hash`, `refresh_token`, cookie ou sessao
- falha de login continua sem token e com erro generico `INVALID_CREDENTIALS`
- auditoria de login mantida sem registrar token, segredo, senha ou hash
- headers simulados `x-tenant-id`, `x-user-id`, `x-role` e `x-permissions` continuam ativos
- middleware JWT obrigatorio nao foi criado nem plugado nesta rodada
- criado `tests/auth-jwt.test.ts`
- `tests/auth-login.test.ts` atualizado para validar token emitido e payload
- `docs/auth.md` atualizado com secao `JWT access token`
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.3
- `docs/api.md` nao existe neste repositorio, portanto nao foi atualizado
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- frontend, schema Prisma e migrations permaneceram intocados
- nenhum commit, push ou PR foi criado

## 2026-06-01 - Bloco 04C.4 Middleware authenticated actor

- branch usada: `feat/authenticated-actor-middleware`
- criado `src/modules/auth/middleware/authenticated-actor.middleware.ts`
- middleware escolhido: opcional e exportado pelo modulo auth, sem montagem global em `src/app.ts`
- `request.actor` tipado via module augmentation do Express
- formato de actor JWT: `userId`, `tenantId`, `email`, `roles` e `authType: "jwt"`
- sem `Authorization`, o middleware chama `next()` e nao define `request.actor`
- `Authorization` sem Bearer, token invalido ou token expirado retorna `401 INVALID_TOKEN`
- token valido e verificado com `verifyAccessToken` e popula `request.actor`
- criado helper `resolveRequestActor` para retornar actor JWT ou fallback de headers simulados
- fallback legado le `x-tenant-id`, `x-user-id`/`x-actor-user-id`, `x-role`/`x-roles` e `x-permissions`
- headers simulados foram preservados e rotas Core SaaS nao foram migradas nesta rodada
- refresh token, logout, sessao/cookie, Redis runtime e RLS permaneceram fora do escopo
- `src/modules/auth/types/auth.types.ts` atualizado com tipos de actor
- `src/modules/auth/index.ts` atualizado para exportar middleware/helper
- criado `tests/auth-actor-middleware.test.ts`
- `docs/auth.md` atualizado com secao `Authenticated actor middleware`
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.4
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `node --test --import tsx tests/auth-actor-middleware.test.ts`: passou com 6 testes
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- frontend, schema Prisma, migrations, `package.json` e `package-lock.json` permaneceram intocados nesta rodada
- nenhum commit, push ou PR foi criado

## 2026-06-01 - Bloco 04C.5 Rotas protegidas actor-aware

- branch usada: `feat/actor-aware-protected-routes`
- `attachAuthenticatedActor()` montado em `src/app.ts` antes de `createCoreSaasRouter(service)`
- montagem escolhida: somente para rotas Core SaaS sob `/api/v1`, preservando health e auth sem middleware JWT
- `src/modules/core-saas/middleware/tenant-context.middleware.ts` atualizado para resolver actor via `resolveRequestActor`
- `request.actor` JWT tem prioridade sobre headers simulados
- fallback legado preservado para `x-tenant-id`, `x-user-id`, `x-actor-user-id`, `x-role`, `x-roles` e `x-permissions`
- token invalido, malformado ou expirado retorna `401 INVALID_TOKEN`
- sem JWT, as rotas protegidas continuam funcionando com headers simulados
- sem JWT e sem headers, envelope de erro atual `403 tenant_required` foi preservado
- response shape de sucesso das rotas protegidas foi preservado
- logger HTTP passou a redigir `req.headers.authorization`
- criado `tests/actor-aware-routes.test.ts`
- `docs/auth.md` atualizado com secao de rotas protegidas actor-aware
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.5
- nao foram feitas consultas de roles no banco, RBAC real persistido, refresh token, logout, sessao/cookie, Redis runtime ou RLS
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `node --test --import tsx tests/auth-actor-middleware.test.ts`: passou com 6 testes
- `node --test --import tsx tests/actor-aware-routes.test.ts`: passou com 6 testes
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- frontend, schema Prisma, migrations, `package.json` e `package-lock.json` permaneceram intocados nesta rodada
- nenhum commit, push ou PR foi criado

## 2026-06-01 - Bloco 04C.7 Middleware RBAC persistido para JWT

- branch usada: `feat/persistent-rbac-middleware`
- worktree inicial estava limpo e a branch esperada ja estava ativa
- criado `src/modules/core-saas/middleware/persistent-rbac-context.middleware.ts`
- novo middleware roda depois do `tenantContextMiddleware`
- `tenantContextMiddleware` permaneceu sincronico como fallback/base
- com actor JWT e `CORE_SAAS_PERSISTENCE=prisma`, o middleware usa `PersistentAuthorizationService` para substituir roles/permissoes por RBAC persistido
- repositories Prisma sao carregados por `import()` dinamico apenas no modo Prisma
- com runtime `memory`, o middleware chama `next()` sem abrir Prisma nem exigir `DATABASE_URL`
- `src/modules/core-saas/routes/index.ts` atualizado para montar o middleware persistido antes das rotas protegidas
- `src/modules/core-saas/index.ts` exporta o middleware sem expor repositories Prisma no barrel principal
- criado `tests/persistent-rbac-middleware.test.ts`
- teste novo cobre legacy sem JWT, JWT com role persistida, JWT sem permissao persistida, `x-permissions` sem elevacao, headers conflitantes ignorados, token invalido 401, memory DB-free e response shape preservado
- `docs/auth.md` atualizado com o middleware async de RBAC persistido
- `docs/rbac.md` atualizado com fluxo JWT/Prisma, fallback legacy e preservacao do runtime memory
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.7
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` ja estavam em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `node --test --import tsx tests/auth-actor-middleware.test.ts`: passou com 6 testes
- `node --test --import tsx tests/actor-aware-routes.test.ts`: passou com 7 testes
- `node --test --import tsx tests/persistent-rbac-authorization.test.ts`: passou com 1 teste
- `node --test --import tsx tests/persistent-rbac-middleware.test.ts`: passou com 2 testes
- frontend, schema Prisma, migrations, `package.json` e `package-lock.json` permaneceram intocados nesta rodada
- refresh token, logout, sessao/cookie, Redis runtime e RLS permaneceram fora do escopo
- nenhum commit, push, PR ou merge foi criado

## 2026-06-02 - Bloco 04C.8 RBAC hardening e headers legados

- branch usada: `chore/rbac-hardening-legacy-headers`
- worktree inicial estava limpo e a branch esperada estava ativa
- leitura rapida confirmou `attachAuthenticatedActor()`, `tenantContextMiddleware`, `persistent-rbac-context.middleware.ts`, rotas Core SaaS e testes atuais
- cobertura existente ja validava JWT vencendo headers conflitantes, `x-permissions` sem elevacao de JWT, token invalido com headers retornando 401, legacy sem JWT, ausencia de contexto retornando 403, response shape preservado e runtime memory DB-free
- nenhum teste novo foi criado para evitar duplicacao de cobertura
- `docs/auth.md` atualizado com `Legacy headers deprecation plan`
- `docs/auth.md` passou a listar explicitamente `x-actor-user-id` e `x-roles` junto dos demais headers legados
- `docs/auth.md` documenta `Authorization: Bearer` como fonte preferencial e `x-permissions` apenas como fluxo legacy
- `docs/rbac.md` atualizado com estado atual JWT + `request.actor` + `tenantContext` + RBAC persistido
- `docs/rbac.md` documenta riscos temporarios dos headers simulados e plano futuro para feature flag ou modo strict
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.8
- nao houve alteracao de middleware, rotas, schema Prisma, migrations, package files ou contratos HTTP
- headers legados foram preservados
- refresh token, logout, sessao/cookie, Redis runtime e RLS permaneceram fora do escopo
- nenhum commit, push, PR ou merge foi criado

## 2026-06-02 - Console da Plataforma Foundation

- branch criada: `feature/platform-console-foundation`
- status inicial tinha apenas `frontend/links_Figma.txt` nao rastreado; arquivo preservado e nao alterado
- auditoria confirmou frontend em `frontend/src` com `layouts`, `providers`, `components`, `modules`, `mocks`, `services` e `pages`
- auditoria confirmou backend em `src/modules` com `auth`, `core-saas`, routes, services, repositories, middleware e Prisma separado
- criados `docs/platform-console.md`, `docs/modules.md`, `docs/frontend-screens.md`, `docs/api.md` e `docs/architecture.md`
- `docs/rbac.md` atualizado com escopos platform/tenant e sidebar dinamica
- `docs/09-mapa-telas-frontend.md` atualizado para labels `Usuarios` e `Administrador` e telas P01/P02/P03 da Console da Plataforma
- criado `frontend/src/navigation` com `NavigationItem`, `canShowNavigationItem`, `platformNavigation` e `tenantNavigation`
- criados `frontend/src/guards/PlatformGuard.tsx` e `frontend/src/guards/PermissionGuard.tsx`
- criado `frontend/src/layouts/PlatformLayout.tsx`
- criado modulo `frontend/src/modules/platform` com types, mock, adapter, service e paginas P01/P02/P03
- `frontend/src/App.tsx` atualizado com rotas `/platform/tenants`, `/platform/tenants/:tenantId` e `/platform/tenants/:tenantId/modules`
- `frontend/src/components/erp/index.tsx` passou a usar navegacao dinamica de tenant
- `frontend/src/modules/auth/types.ts` e mock de auth atualizados com permissao de plataforma e label `Administrador`
- criado modulo backend `src/modules/platform` com permissoes, DTOs, validator, service, repository em memoria e routes
- `src/app.ts` monta `/api/v1/platform` antes das rotas Core SaaS
- endpoints iniciais criados: listar/criar/detalhar/atualizar tenants, status, modulos e admin inicial
- criado `tests/platform-routes.test.ts`
- revisao final limitou fallback legacy de `/api/v1/platform/*` a desenvolvimento/teste/local e bloqueou headers simulados em `NODE_ENV=production`
- nenhuma migration ou alteracao de schema Prisma foi feita
- nenhum package file foi alterado

## 2026-06-06 - Plano Checklists Configuraveis por Tenant

- branch criada/usada: `feature/configurable-checklists-backend`
- objetivo: formalizar a Fase 1 documental do modulo `checklists`, cobrindo RF, RNF, arquitetura, API planejada, banco, RBAC, frontend futuro, mobile/offline, riscos e proximos passos.
- arquivos lidos: `docs/05-requisitos-funcionais.md`, `docs/06-requisitos-nao-funcionais.md`, `docs/modules.md`, `docs/api.md`, `docs/database.md`, `docs/rbac.md`, `docs/architecture.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md`, `package.json` e `frontend/package.json`.
- arquivos previstos para alteracao: documentos acima quando aplicavel, alem deste log e do status geral.
- arquivos previstos para criacao: nenhum, salvo se a revisao mostrar ausencia real de documento necessario; os documentos alvo ja existem no estado atual do repositorio.
- objetivo de cada alteracao: registrar requisito funcional, requisitos nao funcionais, modelo de dominio, entidades, endpoints planejados, permissoes RBAC, impactos Web/Mobile, decisoes arquiteturais e criterios de aceite do modulo.
- riscos conhecidos: worktree ja continha alteracoes nao commitadas anteriores da Console da Plataforma; por isso o commit desta tarefa deve separar apenas arquivos relevantes de documentacao/log e nao incluir alteracoes frontend/backend nao relacionadas.
- estrategia de testes: executar os scripts existentes `npm run check`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npx prisma validate`, `npx prisma generate`, `docker compose config` e `git diff --check` conforme disponibilidade local.
- criterios de aceite: RF registrado, multi-tenancy explicito, componentes definidos pela plataforma, cliente configurando apenas templates/campos, versionamento, auditoria, RBAC, mobile/offline, endpoints planejados e entidades principais documentados.
- comandos que nao serao inventados: nao executar `npm run typecheck`, `npm run test:api`, `npm --prefix frontend run lint` ou `npm --prefix frontend run test` se nao existirem nos `package.json`.
- fora de escopo nesta fase: migration Prisma, rotas backend, service/repository/controller, telas frontend, layout global, auth, Redis, storage de evidencias e qualquer refatoracao ampla.

## 2026-06-06 - Execucao Checklists Configuraveis por Tenant

- branch usada: `feature/configurable-checklists-backend`
- implementada Fase 1 documental do modulo `checklists`
- arquivos alterados nesta tarefa: `docs/05-requisitos-funcionais.md`, `docs/06-requisitos-nao-funcionais.md`, `docs/modules.md`, `docs/02-mapa-modulos.md`, `docs/api.md`, `docs/database.md`, `docs/rbac.md`, `RBAC_MATRIX.md`, `docs/architecture.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `agent-orchestration/docs/requisitos.md`, `agent-orchestration/docs/status-geral.md` e `agent-orchestration/codex/log-execucao.md`
- nenhum arquivo novo foi criado por esta tarefa; alguns documentos editados ja estavam nao rastreados antes da execucao por trabalho anterior da Console da Plataforma
- documentados RF, RNF, entidades, endpoints planejados, permissoes RBAC, impacto frontend, impacto backend, impacto banco, impacto mobile/offline, decisoes, riscos e proximos passos
- nenhuma migration Prisma foi criada
- nenhum backend `src/modules/checklists` foi criado
- nenhuma tela frontend foi criada
- `npm run check`: passou
- `npm run lint`: passou, executando `npm run check`
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `npm --prefix frontend run check`: passou
- `npm --prefix frontend run build`: passou
- `npx prisma validate`: falhou inicialmente sem `DATABASE_URL`, depois passou com a URL local placeholder do `.env.example`
- `npx prisma generate`: passou com a URL local placeholder do `.env.example`
- `docker compose config`: passou
- `docker compose up -d`: falhou porque o Docker daemon/Desktop nao estava ativo (`dockerDesktopLinuxEngine` indisponivel)
- `npx prisma migrate status`: falhou porque o PostgreSQL local nao estava acessivel, coerente com Docker indisponivel
- `git diff --check`: falhou inicialmente por dois trailing spaces em `docs/05-requisitos-funcionais.md`; corrigido e passou na repeticao
- commit nao realizado: o worktree ja continha alteracoes e arquivos nao rastreados anteriores da Console da Plataforma, incluindo frontend/backend, e um commit desta tarefa arrastaria escopo nao relacionado
- push nao realizado porque nao houve commit seguro
- mensagem de commit sugerida quando o escopo for separado: `feat: document configurable checklists module`

## 2026-06-06 - Validacao e publicacao solicitada

- usuario solicitou validar o que foi feito e subir para o GitHub todas as mudancas
- escopo confirmado pelo pedido: worktree completo da branch `feature/configurable-checklists-backend`
- `frontend/links_Figma.md` classificado como mapa de links Figma do projeto, nao como temporario local
- `gh --version`: disponivel
- `gh auth status`: autenticado em `github.com` como `thiagodorgo`
- `npm run check`: passou
- `npm run lint`: passou
- `npm test`: passou com 13 testes
- `node --test --import tsx tests/platform-routes.test.ts`: passou com 3 testes
- `npm run build`: passou
- `npm --prefix frontend run check`: passou
- `npm --prefix frontend run build`: passou
- `npx prisma validate`: passou com `DATABASE_URL` local placeholder do `.env.example`
- `npx prisma generate`: passou com `DATABASE_URL` local placeholder do `.env.example`
- `docker compose config`: passou
- `git diff --check`: passou
- `docker compose up -d`: falhou porque o Docker daemon/Desktop nao esta ativo (`dockerDesktopLinuxEngine` indisponivel)
- `npx prisma migrate status`: falhou porque o PostgreSQL local nao esta acessivel, coerente com Docker indisponivel
- varredura simples de segredos confirmou que a nova alteracao em `.env.example` e apenas `VITE_USE_MOCKS="true"`; os demais valores encontrados sao placeholders locais ja documentados

## 2026-06-06 - tenant_checklist W02A e Mobile schema-driven

- objetivo: atualizar documentacao e frontend para prever a feature `tenant_checklist`
- arquivos alterados: `docs/modules.md`, `docs/rbac.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/platform-console.md`, `docs/api.md`, `docs/05-requisitos-funcionais.md`, `docs/09-mapa-telas-frontend.md`, `docs/02-mapa-modulos.md`, `RBAC_MATRIX.md`, `frontend/src/App.tsx`, `frontend/src/navigation/tenantNavigation.ts`, `frontend/src/components/erp/index.tsx`, `frontend/src/mocks/auth/context.ts`, `frontend/src/styles/app.css`, `frontend/src/modules/checklists/*`, `frontend/src/modules/platform/platform.mock.ts`, `src/modules/platform/platform-modules.service.ts`, `agent-orchestration/docs/status-geral.md` e este log
- criado `docs/api-screen-endpoints.md` para mapear W02A/M10/M11/M12 aos endpoints esperados
- criada tela frontend `TenantChecklistsPage` para W02A em `/administrator/checklists`
- criados tipos frontend `TenantChecklist`, `TenantChecklistComponent`, `ChecklistRun`, `ChecklistMarker`, `ChecklistAttachment` e `ChecklistAcknowledgement`
- atualizado catalogo de modulos para incluir `tenant_checklist`
- atualizado RBAC com `tenant_checklists:read`, `tenant_checklists:create`, `tenant_checklists:update`, `tenant_checklists:publish`, `checklist_runs:read`, `checklist_runs:create`, `checklist_runs:update` e `checklist_runs:complete`
- decisao registrada: M10 e `towing_collection`, M11 e `towing_delivery`, M12 e `technical_evidence`
- decisao registrada: M10/M11/M12 devem consumir schema da API e evitar hardcode de campos quando possivel
- backend real de `tenant_checklist` nao implementado nesta rodada

## 2026-06-07 - FIGMA-CHECKLIST-HANDOFF.1

- objetivo: sincronizar documentacao do repositorio com as decisoes finais Figma sobre `tenant_checklist`, W02A, M10, M11 e M12
- arquivos alvo atualizados: `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/platform-console.md`, `docs/modules.md`, `docs/api-screen-endpoints.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- W02A registrada como tela oficial de configuracao de `tenant_checklist`
- componentes oficiais registrados: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`
- M10 registrado como coleta/reboque com selecao de tipo de veiculo, imagem dinamica por tipo, marcacao de avarias, fotos obrigatorias conforme template e schema vindo da API
- M11 registrado como entrega/reboque com comparacao com coleta; divergencia exige foto, observacao obrigatoria e ciencia de responsabilidade
- M12 registrado como evidencia tecnica antes/depois fora do escopo de guincho/reboque
- estados registrados: checklist rascunho, checklist publicado, checklist inativo, execucao em andamento, execucao concluida, execucao com divergencia e execucao pendente de ciencia
- backend, migrations e arquitetura fora do escopo nao foram alterados

## 2026-06-07 - Backend real tenant_checklist

- branch usada: `feature/tenant-checklists-backend`
- objetivo: implementar backend real de `tenant_checklist` com migrations, models Prisma, rotas, service, repository, validators, RBAC, auditoria e testes
- migration criada: `prisma/migrations/20260607000000_add_tenant_checklists/migration.sql`
- schema Prisma atualizado com `ChecklistTemplate`, `ChecklistTemplateComponent`, `ChecklistRun`, `ChecklistRunAnswer`, `ChecklistAttachment`, `ChecklistMarker` e `ChecklistAcknowledgement`
- modulo criado: `src/modules/checklists`
- rotas registradas em `src/app.ts` sob `/api/v1`
- RBAC atualizado com `tenant_checklists:read`, `tenant_checklists:create`, `tenant_checklists:update`, `tenant_checklists:publish`, `checklist_runs:read`, `checklist_runs:create`, `checklist_runs:update`, `checklist_runs:complete` e `checklist_runs:acknowledge`
- testes criados em `tests/checklist-routes.test.ts`
- decisao tecnica: manter repository em memoria para runtime/testes sem `DATABASE_URL` e adapter Prisma carregado dinamicamente quando `CORE_SAAS_PERSISTENCE=prisma`
- limite conhecido: anexos usam `fileUrl` logico; upload/storage real fica para rodada futura

## 2026-06-07 - W02A integrada a API tenant_checklist

- branch usada: `feature/tenant-checklists-frontend-api`
- objetivo: substituir mocks principais da W02A por chamadas reais aos endpoints backend de `tenant_checklist`
- criados `frontend/src/modules/checklists/checklist.adapter.ts`, `checklist.service.ts`, `checklist.mock.ts` e `index.ts`
- `TenantChecklistsPage.tsx` passou a carregar checklists e componentes via service, com loading, erro e estado vazio
- implementado fluxo basico de criar, editar, publicar e ativar/inativar checklist
- `frontend/src/services/api/client.ts` passou a aceitar headers `X-Role` e `X-Permissions`, preservando o padrao atual de tenant via headers enquanto JWT real nao e obrigatorio
- mocks ficam como fallback explicito de desenvolvimento quando `VITE_USE_MOCKS=true`
- mobile Flutter, Figma e backend nao foram alterados nesta rodada

## 2026-06-07 - W02A builder UI

- branch usada: `feature/tenant-checklists-builder-ui`
- objetivo: evoluir W02A para builder visual MVP conforme `FIGMA-CHECKLIST-BUILDER-UX.1`
- arquivos criados em `frontend/src/modules/checklists/components`: `ChecklistComponentPalette.tsx`, `ChecklistCanvas.tsx`, `ChecklistInspector.tsx`, `ChecklistSchemaPreview.tsx`, `ChecklistStatusBadge.tsx` e `NewChecklistForm.tsx`
- criados helpers `checklist.builder.ts` e `checklist.constants.ts`
- `TenantChecklistsPage.tsx` reorganizada para lista administrativa com busca/filtro, builder visual, preview de schema e publicacao
- ordenacao de componentes implementada por botoes subir/descer, sem drag-and-drop
- `pending_changes` e apenas estado visual derivado de checklist publicado alterado apos `publishedAt`; nao altera contrato backend
- backend, Prisma/migrations, Figma e mobile Flutter nao foram alterados
## 2026-06-07 - Padronizacao de navegacao RBAC

- branch usada: `feature/navigation-rbac-sidebar-standardization`
- objetivo: padronizar sidebar/navegacao por RBAC sem alterar backend, Prisma, migrations, API contracts, Figma ou mobile
- criado modelo unificado de navegacao com escopo, modo, permissoes, roles, status, icone, modulo/feature e filhos
- implementado filtro `canAccessNavigationItem`/`filterNavigationItems`
- sidebar tenant e Platform Console passaram a usar a mesma lista filtrada nos modos expandido e recolhido
- removida renderizacao de links planejados/desabilitados; usuario sem permissao nao ve item nem grupo vazio
- `PermissionProvider`, `PermissionGuard` e `PlatformGuard` alinhados ao contexto de roles/permissoes
- rotas Web operacionais receberam guards para impedir renderizacao por acesso direto sem permissao
- W02A mantida como rota administrativa dependente de `tenant_checklists:read`; operador nao ve W02A
- documentacao atualizada em `docs/rbac.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `agent-orchestration/docs/status-geral.md` e este log

## 2026-06-07 - Hardening backend RBAC

- branch usada: `feature/backend-rbac-hardening`
- objetivo: reforcar autorizacao backend para Core SaaS, Platform Console e `tenant_checklist`, sem alterar frontend, Figma, Prisma/migrations, contratos API desnecessariamente, RLS, upload/storage ou mobile
- mapeamento inicial: Core SaaS ja usava `requirePermission` em tenants/users/roles/audit; Platform ja usava `requirePlatformPermission`; checklists ja exigiam permissoes por rota
- adicionado `requireAnyPermission([...])` no middleware RBAC existente, reaproveitando a resposta 403 padronizada
- adicionado `requirePlatformAdmin()` como helper semantico sobre `requirePlatformPermission("platform:tenants:read")`
- rotas `GET /api/v1/mobile/checklists/available` e `GET /api/v1/mobile/checklists/:checklistId/render` passaram a aceitar `checklist_runs:read` ou `checklist_runs:create`
- `POST /api/v1/users` deixou de aceitar `tenantId` do body como fonte de escopo e usa sempre o `tenantId` do contexto autenticado
- testes ampliados em `tests/core-saas.test.ts` e `tests/checklist-routes.test.ts`
- testes especificos executados durante a implementacao: `npm test`, `node --test --import tsx tests/checklist-routes.test.ts` e `node --test --import tsx tests/platform-routes.test.ts`
- documentacao atualizada em `docs/rbac.md`, `docs/api.md`, `docs/modules.md`, `agent-orchestration/docs/status-geral.md` e este log

## 2026-06-07 - PostgreSQL RLS tenant isolation

- branch usada: `feature/postgres-rls-tenant-isolation`
- objetivo: adicionar Row Level Security PostgreSQL como camada de defesa contra vazamento cross-tenant
- migration criada: `prisma/migrations/20260608000000_enable_tenant_rls/migration.sql`
- tabelas protegidas por RLS: `branches`, `users`, `local_auth_credentials`, `roles`, `user_role_assignments`, `audit_logs`, `checklist_templates`, `checklist_template_components`, `checklist_runs`, `checklist_run_answers`, `checklist_attachments`, `checklist_markers` e `checklist_acknowledgements`
- policies usam `current_setting('app.current_tenant_id', true)`
- policy de `roles` permite roles globais com `tenant_id IS NULL` e roles do tenant atual
- `FORCE ROW LEVEL SECURITY` aplicado para que os testes com usuario da aplicacao/owner provem isolamento real
- criado helper `src/database/rls.ts` com `setTenantRlsContext` e `withTenantRls`
- integrados contextos RLS em Core SaaS Prisma, auth local, RBAC persistido, repository Prisma de checklists e seed
- criado teste especifico `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/database.md`, `docs/architecture.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: frontend, Figma, contratos API desnecessarios, upload/storage, mobile e refatoracao ampla
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `node --test --import tsx tests/rls-tenant-isolation.test.ts` e `git diff --check`
- observacao de validacao: o primeiro `npx prisma migrate status` antes do deploy apontou a nova migration pendente, como esperado; apos `npx prisma migrate deploy`, o status ficou atualizado
- observacao de teste: `DATABASE_URL` local usa `postgres`, que e superuser e bypassa RLS; por isso o teste especifico cria um papel temporario nao-superuser, concede acesso minimo, valida isolamento e remove o papel ao final

## 2026-06-07 - checklist attachments storage local

- branch usada: `feature/checklist-attachments-storage`
- objetivo: substituir anexos apenas logicos por upload/storage local real para evidencias de checklist, preservando tenant, RBAC, RLS e auditoria
- dependencia adicionada: `busboy` para parsing de `multipart/form-data`; dependencia dev adicionada: `@types/busboy`
- criado `src/modules/checklists/checklist-attachment.storage.ts`
- criado `storage/checklist-attachments/.gitkeep` e atualizado `.gitignore` para nao versionar arquivos enviados
- `.env.example` atualizado com `CHECKLIST_ATTACHMENT_STORAGE_DRIVER`, `CHECKLIST_ATTACHMENT_STORAGE_PATH`, `CHECKLIST_ATTACHMENT_MAX_SIZE_MB` e `CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES`
- `POST /api/v1/mobile/checklist-runs/:runId/attachments` agora aceita multipart com campo `file`, `componentId` e `metadata` opcional, mantendo o JSON legado com `fileUrl`
- criada rota `GET /api/v1/mobile/checklist-runs/:runId/attachments/:attachmentId/download`
- arquivos locais recebem nome sanitizado, isolamento fisico por tenant/run, checksum SHA-256 e storage key logico; path absoluto nao e retornado na API
- auditoria adicionada: `checklist_run.attachment_uploaded`
- testes criados/alterados: `tests/checklist-attachments.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/api.md`, `docs/database.md`, `docs/architecture.md`, `docs/modules.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: frontend, Figma, mobile Flutter e S3-compatible real

## 2026-06-07 - checklist attachments frontend integration

- branch usada: `feature/checklist-attachments-frontend-integration`
- objetivo: integrar o frontend ao upload/download real de anexos de checklist, preservando mocks e sem alterar backend
- arquivos criados: `frontend/src/modules/checklists/checklist-attachments.adapter.ts`, `checklist-attachments.service.ts`, `checklist-attachments.mock.ts`, `components/ChecklistAttachmentUploader.tsx`, `components/ChecklistAttachmentList.tsx` e `components/ChecklistEvidencePreview.tsx`
- `frontend/src/services/api/client.ts` atualizado para `FormData` multipart e download protegido via `Blob`
- `frontend/src/modules/checklists/types.ts` atualizado com tipos reais de `ChecklistAttachment`, upload, download e metadata
- `ChecklistSchemaPreview` agora sinaliza evidencias para componentes `photo_upload`, `before_after` e `damage_map`, sem transformar W02A em tela operacional
- `frontend/src/styles/app.css` atualizado para os novos componentes
- documentacao atualizada em `docs/api.md`, `docs/frontend-screens.md`, `docs/modules.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: backend, Prisma/migrations, Figma, mobile Flutter, S3-compatible real e fluxo operacional completo M10/M11/M12

## 2026-06-07 - W03 tenant settings menu UI

- branch usada: `feature/tenant-settings-menu-ui`
- objetivo: criar central visual de configurações do tenant em W03 sem alterar backend ou contratos
- criado modulo `frontend/src/modules/settings` com page, types, mock de categorias e barrel
- rota criada: `/administrator/settings`
- sidebar recebeu item `Configuracoes` com permissao frontend `tenant:manage`, modulo `tenant-admin` e roles administrativas
- pendencia documentada: `tenant_settings:read` ainda nao existe no catalogo backend
- categorias MVP: Geral, Aparência, Usuários e Acesso, Módulos e Checklists
- categorias planejadas: Notificações, Integrações e Segurança/Auditoria
- card Checklists aponta para W02A `/administrator/checklists`; W03 nao duplica builder
- temas exibidos como opções visuais planejadas: `enterprise_blue`, `tech_dark` e `green_operations`
- fora de escopo mantido: backend, Prisma/migrations, contratos API, Figma, mobile Flutter, tenant_checklist backend e persistência real de tema

## 2026-06-07 - alinhamento numeracao W03

- objetivo: corrigir referencias documentais conflitantes antes de PR/merge da branch `feature/tenant-settings-menu-ui`
- decisao oficial registrada: W03 e `Administrador — Configurações` em `/administrator/settings`
- W02A permanece `Administrador — Checklists`
- Dashboard/Resumo Financeiro nao usa W03; a entrada financeira foi renomeada no mapa para evitar conflito de numeracao
- documentos/logs revisados: `docs/09-mapa-telas-frontend.md`, `docs/frontend-screens.md`, `docs/modules.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend, Prisma/migrations, API, Figma, mobile e rota `/administrator/settings`

## 2026-06-07 - hardening JWT/session auth context

- objetivo: reduzir dependencia de headers legacy e consolidar JWT/Bearer como fonte principal do contexto autenticado
- branch usada: `feature/auth-jwt-session-hardening`
- mapeamento inicial confirmou login local tenant-scoped com JWT via `jose`, `JWT_SECRET`/`JWT_EXPIRES_IN`, middleware `attachAuthenticatedActor()` e fallback legacy via `resolveRequestActor()`
- `tenantContextMiddleware` passou a rejeitar actor `legacy_headers` em `NODE_ENV=production` com `403 FORBIDDEN` e reason `legacy_headers_disabled`
- regra preservada: Bearer token invalido, malformado ou expirado retorna `401 INVALID_TOKEN` antes de qualquer fallback
- fallback legacy segue ativo em desenvolvimento/teste para chamadas internas e testes existentes
- `tests/platform-routes.test.ts` cobre JWT com role de plataforma real e rejeicao de JWT tenant comum no boundary platform
- `tests/checklist-routes.test.ts` cobre bloqueio de headers legacy em producao para rota sensivel tenant-scoped
- `.env.example` atualizado para `JWT_SECRET="change-me-in-local-development"` e `JWT_EXPIRES_IN="1h"` sem segredo real
- documentacao atualizada em `docs/auth.md`, `docs/api.md`, `docs/rbac.md`, `docs/architecture.md`, `docs/modules.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: frontend amplo, Figma, mobile, OAuth/social login, refresh token complexo, Prisma/migrations e contratos API destrutivos

## 2026-06-07 - frontend login JWT

- branch usada: `feature/auth-frontend-login-integration`
- objetivo: integrar o frontend ao fluxo real `login -> Bearer token -> RBAC backend -> RLS PostgreSQL`, preservando mocks de desenvolvimento
- endpoint usado: `POST /api/v1/auth/login`
- criados `frontend/src/modules/auth/auth.adapter.ts`, `auth.service.ts` e `auth.storage.ts`
- `AuthProvider` passou a usar sessao armazenada, estado de autenticacao e logout simples
- `LoginPage` passa a enviar `tenantId`, e-mail e senha em modo real; em mock preserva dados demo
- `apiRequest`, `apiFormDataRequest` e `apiBlobRequest` enviam `Authorization: Bearer` automaticamente a partir do token armazenado
- headers legados sao enviados pelo API client apenas quando `VITE_USE_MOCKS=true`
- resposta `401` limpa a sessao local
- `ContextSelectionPage` e repository de contexto usam tenant/roles/permissoes derivados da sessao real quando mocks estao desativados
- `PermissionGuard`, `PlatformGuard`, `AppShell`, `Topbar` e `PlatformLayout` ajustados para auth state e logout simples
- `.env.example` recebeu `VITE_DEFAULT_TENANT_ID=""` como placeholder opcional, sem segredo
- documentacao atualizada em `docs/auth.md`, `docs/api.md`, `docs/frontend-screens.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend, Prisma/migrations, Figma, mobile Flutter, refresh token, revogacao remota e remocao brusca de mocks
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npx prisma validate`, `npx prisma generate` e `git diff --check`

## 2026-06-07 - frontend smoke flow tests

- branch usada: `feature/frontend-smoke-flow-tests`
- objetivo: adicionar cobertura smoke inicial para fluxo principal do frontend sem criar features novas
- estrategia verificada: frontend nao tinha Vitest, Testing Library, Playwright ou Cypress; escolhido `node:test` + `tsx` + `react-dom/server` para evitar dependencia pesada nesta rodada
- dependencia nova: nenhuma
- script criado em `frontend/package.json`: `test:smoke`
- helper criado: `frontend/src/config/env.ts` para leitura testavel de `VITE_API_BASE_URL`, `VITE_DEFAULT_TENANT_ID` e `VITE_USE_MOCKS`
- teste criado: `frontend/tests/smoke-flow.test.tsx`
- cobertura: auth.storage, auth.service real/mock, API client Bearer, ausencia de headers legacy em modo real, preservacao de FormData, sidebar/guards RBAC para W02A/W03/Platform, smoke render de `/login`, W02A, W03 e Platform Console, e anexos frontend
- documentacao atualizada em `docs/auth.md`, `docs/frontend-screens.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend, Prisma/migrations, contratos API, Figma, mobile Flutter e redesign

## 2026-06-07 - E2E critical flows

- branch usada: `feature/e2e-critical-flows`
- objetivo: adicionar testes E2E reais em navegador para fluxos criticos do ERP Techsolutions
- verificacao inicial: nao havia Playwright/Cypress nem script E2E no repositorio
- dependencia adicionada: `@playwright/test` na raiz do repositorio
- script criado: `npm run test:e2e`
- configuracao criada: `playwright.config.ts`
- seed usado: seed demo existente, idempotente, executado via `npm run db:seed` antes do Playwright
- spec criada: `tests/e2e/critical-flows.spec.ts`
- cobertura: login real/JWT, credenciais invalidas, guard de rota protegida, sessao em `localStorage`, sidebar RBAC tenant admin, W02A Checklists, W03 Configuracoes e bloqueio de Platform Console para usuario tenant
- artifacts ignorados: `playwright-report/`, `test-results/`, `frontend/playwright-report/` e `frontend/test-results/`
- pendencia registrada: acesso positivo ao Platform Console aguarda seed estavel de usuario platform
- fora de escopo mantido: backend funcional, Prisma/migrations, contratos API, Figma, mobile Flutter, redesign e remocao de mocks
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## 2026-06-07 - auth refresh/logout sessions

- branch usada: `feature/auth-session-refresh-logout`
- objetivo: implementar refresh token, rotacao, logout/revogacao backend, refresh-on-401 no frontend e cobertura de testes/documentacao
- migration criada: `prisma/migrations/20260609000000_add_auth_sessions/migration.sql`
- modelo Prisma criado: `AuthSession`, mapeado para `auth_sessions`, com FKs tenant/user, hash unico do refresh token, expiracao, revogacao, indices e RLS
- servicos criados: `src/modules/auth/repositories/auth-session.repository.ts` e `src/modules/auth/services/auth-session.service.ts`
- `src/modules/auth/services/jwt.service.ts` passou a assinar/verificar refresh token com secret/audience separados do access token
- `src/modules/auth/routes/auth.routes.ts` adicionou `POST /api/v1/auth/refresh` e `POST /api/v1/auth/logout`; login manteve compatibilidade e passou a retornar refresh/session aliases
- `.env.example` recebeu `JWT_REFRESH_SECRET` e `JWT_REFRESH_EXPIRES_IN`
- frontend atualizado em auth adapter/service/storage/types e API client para armazenar refresh token, renovar access token uma vez em `401` e chamar logout backend em best effort
- E2E passou a validar sessao com `refreshToken` e logout de usuario tenant
- testes criados/alterados: `tests/auth-session.test.ts`, `tests/auth-jwt.test.ts`, `tests/auth-login.test.ts`, `frontend/tests/smoke-flow.test.tsx` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/auth.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/architecture.md`, `docs/database.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- decisoes: refresh token nunca e persistido em texto puro; refresh rotaciona token; logout e idempotente; frontend tenta refresh unico fora dos endpoints de auth; access tokens ja emitidos continuam validos ate expirarem
- fora de escopo mantido: cookie httpOnly, MFA, OAuth/social login, recuperacao de senha, Redis runtime, remocao definitiva dos headers legacy e revogacao imediata de access token ja emitido
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `node --test --import tsx tests/platform-routes.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/auth-jwt.test.ts`, `node --test --import tsx tests/auth-session.test.ts` com `DATABASE_URL` local, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - platform admin seed E2E

- branch usada: `feature/platform-admin-seed-e2e`
- objetivo: criar seed local/dev estavel de Platform Admin e cobrir acesso positivo ao Console da Plataforma no Playwright
- mapeamento inicial: seed criava tenant demo, branch MAIN, admin demo, roles globais e credencial local apenas para `admin.demo@example.com`; nao havia usuario platform estavel
- `prisma/seed.ts` atualizado para criar/atualizar `platform.admin@erp.local` no tenant demo com role global `super_admin`
- senha local/dev do Platform Admin configurada por `E2E_PLATFORM_PASSWORD`, com fallback `platform-admin-dev-password`
- decisao: sem migration; o modelo atual exige `tenantId` no login local, entao o Platform Admin local pertence ao tenant demo apenas para autenticacao e usa role global `super_admin` para escopo platform
- `tests/e2e/critical-flows.spec.ts` passou a validar login Platform Admin, sessao com refresh token, shell `Console da Plataforma`, link `Tenants` e pagina P01 `/platform/tenants`
- teste existente de Tenant Admin bloqueado na Platform Console foi preservado
- documentacao atualizada em `.env.example`, `docs/auth.md`, `docs/deployment.md`, `docs/frontend-screens.md`, `docs/rbac.md`, `docs/github-workflow.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: Figma, mobile Flutter, API contracts, Prisma migrations, refatoracao de auth e features novas de produto
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run db:seed`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - Redis job queue foundation

- branch usada: `feature/redis-job-queue-foundation`
- objetivo: criar fundacao inicial de mensageria interna com Redis para jobs, eventos, retry/backoff e dead-letter
- verificacao inicial: nao havia cliente Redis nem dependencia de filas; `docker-compose.yml` ja possuia `erp-redis` e `.env.example` ja possuia `REDIS_URL`
- dependencia nova: nenhuma; criado cliente Redis minimo sobre `node:net`
- criados `src/infra/redis/redis.client.ts`, `src/infra/jobs/job.types.ts`, `src/infra/jobs/job.queue.ts`, `src/infra/jobs/job.registry.ts`, `src/infra/jobs/job.worker.ts`, `src/infra/events/domain-event.types.ts` e `src/infra/events/domain-event.publisher.ts`
- jobs iniciais: `checklist-attachment-postprocess`, `notification-dispatch` e `audit-log-fanout`
- eventos iniciais: `auth.session.created`, `auth.session.revoked`, `checklist_run.created`, `checklist_run.completed`, `checklist_run.attachment_uploaded`, `checklist_run.divergence_reported`, `notification.requested` e `audit_log.created`
- integracao real escolhida: upload de anexo de checklist publica `checklist_run.attachment_uploaded` apos storage, banco e auditoria sincronicos
- falha de Redis no publish nao quebra upload critico no MVP; warning e registrado
- worker exposto por `JobWorker`/`startWorker`, sem inicializacao automatica no servidor
- documentacao criada: `docs/messaging.md`
- documentacao atualizada em `docs/architecture.md`, `docs/modules.md`, `docs/deployment.md`, `docs/github-workflow.md` e `agent-orchestration/docs/status-geral.md`
- testes criados: `tests/job-queue.test.ts` e `tests/domain-events.test.ts`
- fora de escopo mantido: Kafka, RabbitMQ, cloud queue, notificacoes reais, webhooks reais, frontend, Figma, mobile Flutter, migrations e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - audit log enhancements

- branch usada: `feature/audit-log-enhancements`
- objetivo: implementar melhorias enterprise no audit log sem alterar frontend amplo, Figma, mobile ou contratos destrutivos
- mapeamento inicial: `audit_logs` ja possuia `tenant_id`, `actor_user_id`, `action`, `entity`, `entity_id`, `metadata` e `created_at`; RLS ja estava habilitado na tabela
- decisao: nenhuma migration criada; campos enterprise adicionais ficam em `metadata`
- criado contrato em `src/modules/core-saas/audit/audit-log.types.ts`
- criado `EnterpriseAuditLogService` em `src/modules/core-saas/audit/audit-log.service.ts`
- criado helper `src/modules/core-saas/audit/audit-request-context.ts` para requestId/correlationId/IP/user-agent e auditoria best-effort de rotas
- sanitizacao recursiva redige tokens, refresh tokens, senhas, hashes, secrets, API keys e Authorization
- fluxos integrados: auth login/refresh/logout/sessao, `user.created`, `tenant.created`, `permission.denied` centralizado e auditoria de checklists
- nomes de checklists padronizados para `checklist_template.*`, `checklist_run.divergence_reported` e `checklist_run.acknowledgement_created`
- Redis/events: audit log persistido publica `audit_log.created` para `audit-log-fanout`; falha de Redis nao desfaz operacao principal
- documentacao criada: `docs/audit.md`
- documentacao atualizada em `docs/architecture.md`, `docs/database.md`, `docs/rbac.md`, `docs/modules.md`, `docs/messaging.md`, `docs/api.md` e `agent-orchestration/docs/status-geral.md`
- testes criados: `tests/audit-log.test.ts` e `tests/audit-security.test.ts`
- fora de escopo mantido: SIEM externo, exportacao, painel visual completo de auditoria, migrations, frontend amplo, Figma, mobile Flutter e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/audit-log.test.ts`, `node --test --import tsx tests/audit-security.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts` e `git diff --check`

## 2026-06-08 - checklist runtime web

- branch usada: `feature/checklist-runtime-web`
- objetivo: implementar runtime web operacional de execucao de checklists publicados usando schema vindo da API
- decisao de rota: `/operations/checklists` para lista operacional e `/operations/checklists/:checklistId/run` para execucao
- W02A `/administrator/checklists` preservada como builder/admin de templates
- endpoints `/mobile/*` reutilizados no web como runtime compartilhado web/mobile
- criados `frontend/src/modules/checklists/checklist-runtime.adapter.ts`, `checklist-runtime.service.ts` e `checklist-runtime.mock.ts`
- criadas paginas `ChecklistRunsPage.tsx` e `ChecklistRuntimePage.tsx`
- criados componentes `ChecklistRuntimeRenderer.tsx`, `ChecklistRuntimeField.tsx`, `ChecklistRunStatusBadge.tsx` e `ChecklistRunSummary.tsx`
- renderer MVP cobre `observation`, `vehicle_selector`, `acknowledgement`, `photo_upload`, `before_after`, `damage_map` e fallback para `comparison`
- anexos/evidencias reutilizam services/componentes existentes de upload/lista/download
- navegacao tenant adiciona `Checklists Operacionais` com `checklist_runs:read` ou `checklist_runs:create`; operador nao ve W02A sem `tenant_checklists:read`
- testes atualizados em `frontend/tests/smoke-flow.test.tsx` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/frontend-screens.md`, `docs/api.md`, `docs/modules.md`, `docs/audit.md`, `docs/messaging.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: backend novo, migrations, Figma, mobile Flutter, offline, drag-and-drop, redesign amplo e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - checklist runtime web hardening

- branch usada: `feature/checklist-runtime-web-hardening`
- objetivo: endurecer o runtime web operacional sem redesign, sem backend novo e sem alterar contratos `/mobile/*`
- criada validacao client-side por schema em `frontend/src/modules/checklists/checklist-runtime.validation.ts`
- validacao bloqueia conclusao quando faltam campos obrigatorios, observacao, fotos, antes/depois, ciencia, seletor de veiculo ou markers exigidos
- UX aprimorada com progresso de obrigatorios, status do run, resumo lateral e mensagens de sucesso/falha
- `comparison` consulta endpoint de comparacao quando presente no schema e permite registrar divergencia com observacao obrigatoria e evidencia anexada
- `acknowledgement` usa texto configuravel do schema e chama endpoint de ciencia apenas quando o run esta `pending_acknowledgement`
- `before_after` separa evidencias por metadata `stage=before` e `stage=after`
- `damage_map` exige marker com tipo/descricao, envia marker ao endpoint real e permite remocao local da lista; exclusao persistente fica pendente de endpoint futuro
- mocks foram ajustados para publicar M11 de entrega/reboque e exercitar ciencia configuravel
- smoke e E2E ampliados para validar endpoints runtime, validacao por schema, tela de run e bloqueio de obrigatorios incompletos
- documentacao atualizada em `docs/frontend-screens.md`, `docs/api.md`, `docs/modules.md`, `docs/audit.md`, `docs/messaging.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: mobile Flutter, Figma, offline, drag-and-drop, redesign amplo, backend novo, migrations e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - checklist attachments S3-compatible storage

- branch usada: `feature/checklist-attachments-s3-storage`
- objetivo: implementar storage configuravel local/S3-compatible para anexos de checklist, sem expor bucket, storage key, path privado ou URL interna na API
- dependencia adicionada: `@aws-sdk/client-s3`
- criados providers em `src/modules/checklists/storage`
- `checklist-attachment.storage.ts` passou a usar factory/provider e preserva aliases locais antigos
- DTO publico de attachment passa a retornar rota protegida de download para uploads gerenciados
- `.env.example` atualizado com `CHECKLIST_STORAGE_*`; valores S3 ficam vazios como placeholders
- documentacao atualizada em `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/storage.md`, `docs/modules.md`, `docs/audit.md`, `docs/messaging.md` e `agent-orchestration/docs/status-geral.md`
- testes adicionados/alterados: `tests/checklist-storage.test.ts` e `tests/checklist-attachments.test.ts`
- migration: nao criada; metadados internos continuam em `checklist_attachments.metadata`
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/checklist-storage.test.ts`, `node --test --import tsx tests/checklist-attachments.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/audit-log.test.ts`, `node --test --import tsx tests/domain-events.test.ts` e `git diff --check`

## 2026-06-08 - notification foundation

- branch usada: `feature/notification-foundation`
- objetivo: implementar fundacao backend de notificacoes internas usando domain events e Redis/jobs
- criado modelo Prisma `Notification` e migration `20260610000000_add_notifications`
- RLS aplicada na tabela `notifications`
- criados service, repository memory/prisma, resolver de recipients, routes, controller, DTO e job handler em `src/modules/notifications`
- endpoint minimo criado para listar inbox propria, contar nao lidas, marcar uma/todas como lidas e arquivar
- RBAC atualizado com `notifications:read` e `notifications:update`
- `notification-dispatch` passou a criar notificacoes para `checklist_run.completed`, `checklist_run.divergence_reported` e `checklist_run.acknowledgement_created`
- `checklist_run.attachment_uploaded` permanece apenas com postprocess para evitar spam no MVP
- frontend completo, e-mail, SMS, WhatsApp, push externo e providers externos ficaram fora do escopo
- testes criados/alterados: `tests/notifications.test.ts`, `tests/notification-routes.test.ts`, `tests/domain-events.test.ts`, `tests/rls-tenant-isolation.test.ts` e `tests/core-saas.test.ts`
- documentacao atualizada em `docs/notifications.md`, `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/messaging.md`, `docs/modules.md`, `docs/rbac.md`, `docs/audit.md`, `docs/deployment.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/notifications.test.ts`, `node --test --import tsx tests/notification-routes.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - notifications UI

- branch usada: `feature/notifications-ui`
- objetivo: implementar interface web de notificacoes internas a partir da API backend ja existente
- criados `frontend/src/modules/notifications/notification.types.ts`, `notification.adapter.ts`, `notification.service.ts`, `notification.mock.ts` e `index.ts`
- criados componentes `NotificationList`, `NotificationCard`, `NotificationStatusBadge`, `NotificationSeverityBadge` e `NotificationUnreadBadge`
- criada pagina `NotificationsPage` em `/notifications`
- `frontend/src/App.tsx`, `AppShell`, `tenantNavigation`, mocks de auth/contexto, auth adapter, resolvedor de modulos e CSS foram atualizados
- sidebar e topbar exibem badge de nao lidas; contador atualiza ao montar e apos mark/read-all/archive, sem polling agressivo
- acoes implementadas: listar, filtrar, marcar uma como lida, marcar todas como lidas, arquivar e abrir `actionUrl` interna segura
- seguranca de UI: metadata completa, recipient, ids internos sensiveis, tokens/storage keys e URLs externas nao sao exibidos/navegados
- testes atualizados em `frontend/tests/smoke-flow.test.tsx` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/notifications.md`, `docs/api.md`, `docs/frontend-screens.md`, `docs/modules.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: backend amplo, migrations, e-mail, SMS, WhatsApp, push externo, chat, provider externo, polling agressivo, Figma e mobile Flutter
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - cloud usage metering foundation

- branch usada: `feature/cloud-usage-metering-foundation`
- objetivo: implementar a fundacao de metering interno de uso cloud por tenant, preparando a ponte futura para custo AWS real, rateio, markup e cobranca cloud com lucro
- decisao registrada: Opcao B, metering interno por tenant + margem futura; esta branch mede uso, nao custo
- migration criada: `20260611000000_add_cloud_usage_metering`
- models Prisma adicionados: `CloudUsageEvent` e `CloudUsageDailyAggregate`
- tabelas criadas: `cloud_usage_events` e `cloud_usage_daily_aggregates`
- RLS aplicada nas duas tabelas por `tenant_id`, com checks de unidade/quantidade, indices por tenant/metrica/data e idempotencia MVP por `tenant_id + idempotency_key`
- modulo criado: `src/modules/cloud-usage`
- funcoes entregues: `recordUsageEvent`, `recordManyUsageEvents`, `aggregateDailyUsage`, `getTenantUsageSummary`, `getTenantUsageDaily` e `getPlatformUsageSummary`
- job criado: `cloud-usage.aggregate-daily`, idempotente por tenant/dia/metrica/unidade/origem, sem scheduler automatico nesta branch
- API Platform criada: `GET /api/v1/platform/cloud-usage/summary`, `GET /api/v1/platform/cloud-usage/tenants/:tenantId/summary` e `GET /api/v1/platform/cloud-usage/tenants/:tenantId/daily`
- RBAC atualizado com `platform:cloud-usage:read`; `tenant_admin` foi mantido sem permissao `platform:*`
- eventos integrados: checklist run created/completed/divergence/acknowledgement, attachment uploaded/downloaded, notification created e job executed
- metadata de metering sanitiza tokens, senhas, secrets, Authorization, storage key, bucket, path privado, body, payload e query sensivel
- documentacao criada/atualizada: `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/messaging.md`, `docs/modules.md`, `docs/rbac.md`, `docs/storage.md`, `docs/notifications.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: AWS CUR, AWS Cost Explorer, AWS Billing Conductor, custo monetario real, rateio de custo AWS, markup, fatura, pagamento, credenciais AWS reais e tela complexa
- observacao de validacao: `tests/rls-tenant-isolation.test.ts` falhou inicialmente porque a migration nova ainda nao estava aplicada no banco local; apos `npx prisma migrate deploy`, o teste passou
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-usage.test.ts`, `node --test --import tsx tests/cloud-usage-routes.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/notification-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - AWS CUR cost import foundation

- branch usada: `feature/aws-cur-cost-import`
- objetivo: implementar a foundation para importar custo AWS CUR bruto, sem rateio, markup, fatura, pagamento, UI completa ou credenciais AWS reais
- migration criada: `20260612000000_add_aws_cur_cost_import`
- models Prisma adicionados: `CloudCostImport` e `CloudCostLineItem`
- tabelas criadas: `cloud_cost_imports` e `cloud_cost_line_items`
- decisao de isolamento: tabelas globais de plataforma, sem `tenant_id` e sem RLS por tenant; acesso protegido por `platform:cloud-costs:*`
- modulo criado: `src/modules/cloud-costs`
- parser criado para CSV simplificado de AWS CUR com fixture `tests/fixtures/aws-cur-sample.csv`
- importer deduplica linhas por `raw_line_hash` dentro do import, calcula `total_unblended_cost`, salva tags `Project`, `Environment`, `Tenant` e `Module`, e sanitiza metadata/error_message
- job criado: `aws-cur.import-cost-file`
- API Platform criada: `GET /api/v1/platform/cloud-costs/imports`, `GET /api/v1/platform/cloud-costs/imports/:importId`, `GET /api/v1/platform/cloud-costs/line-items`, `GET /api/v1/platform/cloud-costs/summary` e `POST /api/v1/platform/cloud-costs/imports/manual-csv`
- RBAC atualizado com `platform:cloud-costs:read` e `platform:cloud-costs:import`; `tenant_admin` permanece sem permissoes `platform:*`
- `.env.example` atualizado com variaveis passivas `AWS_CUR_*`, sem credenciais AWS
- documentacao criada/atualizada: `docs/aws-cur-cost-import.md`, `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/modules.md`, `docs/messaging.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: allocation/rateio, markup/margem, cobranca, fatura, gateway, UI completa, S3/Athena real obrigatorio, Cost Explorer, Billing Conductor e secrets reais
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/aws-cur-cost-import.test.ts`, `node --test --import tsx tests/aws-cur-cost-routes.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - cloud cost allocation engine

- branch usada: `feature/cloud-cost-allocation-engine`
- objetivo: implementar motor de alocacao/rateio de custo cloud por tenant, sem markup, fatura, pagamento, UI completa ou AWS real adicional
- migration criada: `20260613000000_add_cloud_cost_allocation`
- models Prisma adicionados: `CloudCostAllocationRun` e `TenantCloudCostAllocation`
- tabelas criadas: `cloud_cost_allocation_runs` e `tenant_cloud_cost_allocations`
- decisao de isolamento: runs sao globais de plataforma; allocations possuem `tenant_id`, RLS por `app.current_tenant_id` e `FORCE ROW LEVEL SECURITY`
- modulo criado: `src/modules/cloud-cost-allocation`
- engine cruza `cloud_cost_line_items`, `cloud_usage_daily_aggregates` e tenants conhecidos
- metodos entregues: `direct_tenant_tag`, `storage_usage_weight`, `download_usage_weight`, `api_request_weight`, `job_execution_weight`, `checklist_run_weight`; `equal_split` fica reservado e custo sem base confiavel fica em `total_unallocated_cost`
- API Platform criada: `GET /api/v1/platform/cloud-cost-allocations/runs`, `GET /api/v1/platform/cloud-cost-allocations/runs/:runId`, `POST /api/v1/platform/cloud-cost-allocations/runs`, `GET /api/v1/platform/cloud-cost-allocations/runs/:runId/tenant-allocations` e `GET /api/v1/platform/cloud-cost-allocations/summary`
- RBAC atualizado com `platform:cloud-cost-allocation:read` e `platform:cloud-cost-allocation:run`; `tenant_admin` permanece sem permissoes `platform:*`
- job criado: `cloud-cost-allocation.run`
- testes criados: `tests/cloud-cost-allocation.test.ts` e `tests/cloud-cost-allocation-routes.test.ts`
- testes atualizados: `tests/core-saas.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao criada/atualizada: `docs/cloud-cost-allocation.md`, `docs/aws-cur-cost-import.md`, `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/messaging.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- observacao de validacao: `tests/rls-tenant-isolation.test.ts` falhou inicialmente porque a migration nova ainda nao estava aplicada no banco local; apos `npx prisma migrate deploy`, o teste passou
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-cost-allocation.test.ts`, `node --test --import tsx tests/cloud-cost-allocation-routes.test.ts`, `node --test --import tsx tests/aws-cur-cost-import.test.ts`, `node --test --import tsx tests/cloud-usage.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - cloud charge markup rules

- branch usada: `feature/cloud-charge-markup-rules`
- objetivo: implementar motor de regras comerciais de cobranca cloud com markup/margem, sem fatura, pagamento, checkout, emissao fiscal, UI completa ou AWS real adicional
- migration criada: `20260614000000_add_cloud_charge_markup_rules`
- models Prisma adicionados: `CloudChargeRule`, `CloudChargeCalculationRun` e `TenantCloudCharge`
- tabelas criadas: `cloud_charge_rules`, `cloud_charge_calculation_runs` e `tenant_cloud_charges`
- decisao de isolamento: regras e runs sao globais de plataforma; charges possuem `tenant_id`, RLS por `app.current_tenant_id` e `FORCE ROW LEVEL SECURITY`
- modulo criado: `src/modules/cloud-charges`
- engine consome `tenant_cloud_cost_allocations`, agrupa por tenant, seleciona regra comercial ativa e calcula `billable_cost`, markup, minimo mensal, arredondamento, `final_charge_amount`, `margin_amount` e `margin_percentage`
- metodos entregues: `percentage`, `fixed_multiplier`, `fixed_amount`, `minimum_monthly_charge`, `included_cloud_cost`, `nearest_cent`, `nearest_10_cents`, `nearest_real` e `ceil_real`
- API Platform criada: `GET/POST /api/v1/platform/cloud-charge-rules`, `GET/PATCH /api/v1/platform/cloud-charge-rules/:ruleId`, `GET/POST /api/v1/platform/cloud-charges/calculation-runs`, `GET /api/v1/platform/cloud-charges/calculation-runs/:runId`, `GET /api/v1/platform/cloud-charges/calculation-runs/:runId/tenant-charges` e `GET /api/v1/platform/cloud-charges/summary`
- RBAC atualizado com `platform:cloud-charge-rules:read`, `platform:cloud-charge-rules:write`, `platform:cloud-charges:read` e `platform:cloud-charges:calculate`; `tenant_admin` permanece sem permissoes `platform:*`
- job criado: `cloud-charges.calculate`
- testes criados: `tests/cloud-charge-markup-rules.test.ts` e `tests/cloud-charge-routes.test.ts`
- testes atualizados: `tests/core-saas.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao criada/atualizada: `docs/cloud-charge-markup-rules.md`, `docs/cloud-cost-allocation.md`, `docs/aws-cur-cost-import.md`, `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/messaging.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- observacao de validacao: `tests/rls-tenant-isolation.test.ts` falhou inicialmente porque a migration nova ainda nao estava aplicada no banco local; apos `npx prisma migrate deploy`, o teste passou
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-charge-markup-rules.test.ts`, `node --test --import tsx tests/cloud-charge-routes.test.ts`, `node --test --import tsx tests/cloud-cost-allocation.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - platform cloud billing UI

- branch usada: `feature/platform-cloud-billing-ui`
- objetivo: implementar a interface web Platform Cloud Billing sem backend novo
- rota criada: `/platform/cloud-billing`
- abas criadas: Visao geral, Uso, Custos AWS, Rateio, Cobranca, Regras e Runs
- modulo frontend criado em `frontend/src/modules/platform/cloud-billing`
- menu Platform, `App.tsx`, mocks/auth e auth adapter atualizados para permissoes cloud
- CSS atualizado para layout responsivo da tela e tabela visivel em mobile dentro da pagina
- smoke test atualizado para navegacao RBAC, adapter/endpoints e render SSR da tela
- E2E atualizado para Platform Admin acessar o menu e a rota Cloud Billing
- documentacao atualizada em `docs/platform-cloud-billing-ui.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/platform-console.md`, `docs/modules.md`, `docs/api-screen-endpoints.md`, `docs/api.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: backend, migrations, fatura, pagamento, checkout, emissao fiscal, mobile Flutter, Figma e exposicao tenant de custo/preco/margem
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-cost-allocation.test.ts`, `node --test --import tsx tests/cloud-charge-markup-rules.test.ts`, `node --test --import tsx tests/aws-cur-cost-import.test.ts`, `node --test --import tsx tests/cloud-usage.test.ts` e `git diff --check`

## 2026-06-09 - backend navigation menu registry

- branch usada: `feature/backend-navigation-menu-registry`
- objetivo: implementar registry backend de navegacao para o frontend consumir via API, mantendo o menu como UX e nao como autorizacao real
- comandos iniciais executados: `git branch --show-current`, `git status` e `git log --oneline --decorate -5`
- branch confirmada: `feature/backend-navigation-menu-registry`
- worktree inicial confirmado limpo
- modulo criado: `src/modules/navigation`
- endpoint criado: `GET /api/v1/navigation/menu`
- app atualizado para registrar `/api/v1/navigation` com `attachAuthenticatedActor()`
- filtros implementados: permissoes, boundary Platform/Tenant, modulos habilitados do tenant e `scope`
- registry inicial criado com grupos `platform`, `tenant`, `operations`, `logistics` e `finance`
- permissoes planejadas adicionadas ao catalogo central para sustentar itens de navegacao sem ids inexistentes
- seed Prisma atualizado com descricoes das permissoes planejadas para manter `npm run db:seed` e E2E consistentes com o catalogo
- testes criados: `tests/navigation-menu.test.ts` e `tests/navigation-menu-routes.test.ts`
- documentacao criada/atualizada: `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/iconography-and-tags.md`, `docs/field-operator-location-map.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: frontend novo, Google Maps real, localizacao de operador, Work Orders backend, logistica backend, billing/payment/fiscal tenant-scoped, CRUD persistido de menu e remocao dos menus atuais do frontend
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/core-saas.test.ts` e `git diff --check`

## 2026-06-09 - frontend navigation menu consumer

- branch usada: `feature/frontend-navigation-menu-consumer`
- comandos iniciais executados: `git branch --show-current`, `git status --short --branch` e `git log --oneline --decorate -5`
- branch confirmada: `feature/frontend-navigation-menu-consumer`
- worktree inicial confirmado limpo
- modulo criado: `frontend/src/modules/navigation`
- service criado para `GET /api/v1/navigation/menu`
- adapter criado para normalizar resposta backend, ordenar itens, mapear icones `lucide-react`, preservar status/permissoes/children e usar fallback `Circle`
- hook criado: `useNavigationMenu`
- fallback local criado com `navigation.mock.ts`, reutilizando menus locais apenas como fallback/mock
- fallback local tambem cobre resposta backend vazia enquanto a persistencia de modulos do tenant nao estiver completa em seeds/ambientes locais
- `PlatformLayout` atualizado para consumir `scope=platform`
- `AppShell` e `Sidebar` atualizados para consumir o menu backend/fallback e renderizar grupos `platform`, `tenant`, `operations`, `logistics` e `finance`
- smoke test atualizado para adapter/service; E2E atualizado para aguardar chamadas reais ao endpoint de navegacao
- documentacao atualizada em `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/iconography-and-tags.md`, `docs/platform-console.md`, `docs/modules.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: novas telas, Google Maps, localizacao, backend, novos endpoints e remocao completa do fallback local
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts` e `git diff --check`

## 2026-06-09 - field operator location foundation

- branch usada: `feature/field-operator-location-foundation`
- comandos iniciais executados: `git branch --show-current`, `git status --short --branch` e `git log --oneline --decorate -5`
- branch confirmada e worktree inicial limpo
- migration criada: `prisma/migrations/20260615000000_add_field_operator_locations/migration.sql`
- schema Prisma atualizado com `FieldOperatorLocation` e relacoes em `Tenant`/`User`
- modulo criado: `src/modules/field-location`
- app atualizado para montar `createFieldLocationRouter()`
- endpoints implementados: `POST /api/v1/mobile/field-locations`, `GET /api/v1/field-locations/latest` e `GET /api/v1/field-locations/history`
- validacoes de entrada implementadas: coordenadas, precisao, heading, velocidade, bateria, data e source
- DTO publico nao retorna metadata bruta de localizacao
- auditoria best-effort adicionada para envio e consulta de historico
- RBAC atualizado para distribuir permissao de envio/leitura/historico aos papeis operacionais adequados
- registry de navegacao atualizado para marcar `/operations/map` como `backend-ready` e registrar endpoints relacionados
- catalogo de modulos Platform atualizado com `field_operations`
- teste focado `tests/field-location-routes.test.ts` criado e executado com sucesso durante a implementacao
- teste RLS atualizado para incluir `field_operator_locations`
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/database.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/02-mapa-modulos.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: Google Maps, tela `/operations/map`, app Flutter, roteirizacao avancada, Work Orders completas, despacho completo e coleta real mobile

## 2026-06-09 - operations map UI

- branch usada: `feature/operations-map-ui`
- comandos iniciais executados: `git branch --show-current`, `git status --short --branch` e `git log --oneline --decorate -5`
- branch confirmada: `feature/operations-map-ui`
- modulo frontend criado em `frontend/src/modules/operations/map`
- pagina criada: `OperationsMapPage`, rota `/operations/map`, guard `field_location:read`
- service criado para consumir somente `GET /api/v1/field-locations/latest` e `GET /api/v1/field-locations/history`
- adapter criado para normalizar DTO snake_case/camelCase, descartar coordenadas invalidas e marcar stale acima de 15 minutos
- mock/fallback criado para `VITE_USE_MOCKS=true`, API vazia ou falha de rede/autorizacao
- componentes criados: filtros, KPIs, mapa placeholder, status badge, lista de operadores e detalhe
- menu local/fallback atualizado com `field_operations`; contexto mock recebeu `field_location:read`, `field_location:history` e modulo `field_operations`
- `.env.example` atualizado com placeholder vazio `VITE_GOOGLE_MAPS_API_KEY=""`, sem credencial real
- smoke test atualizado para navegacao, adapter, service e renderizacao SSR da tela
- E2E atualizado com fluxo direto em `/operations/map`
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/frontend-menu-navigation.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/backend-navigation-menu.md`, `docs/platform-console.md`, `docs/09-mapa-telas-frontend.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: Google Maps real, app Flutter, WebSocket, Work Orders completas, despacho completo, roteirizacao avancada, novos endpoints e backend novo
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/field-location-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts` e `git diff --check`

## 2026-06-09 - work orders foundation

- branch usada: `feature/work-orders-foundation`
- comandos iniciais executados: `git branch --show-current`, `git status` e `git log --oneline --decorate -5`
- branch confirmada e worktree inicial limpo
- migration criada: `prisma/migrations/20260616000000_add_work_orders/migration.sql`
- schema Prisma atualizado com `WorkOrder`, `WorkOrderEvent` e `WorkOrderAssignment`
- modulo criado: `src/modules/work-orders`
- rotas registradas em `src/app.ts`
- endpoints implementados: `GET /api/v1/work-orders`, `POST /api/v1/work-orders`, `GET /api/v1/work-orders/:workOrderId`, `PATCH /api/v1/work-orders/:workOrderId`, `PATCH /api/v1/work-orders/:workOrderId/status`, `POST /api/v1/work-orders/:workOrderId/assign` e `GET /api/v1/work-orders/:workOrderId/timeline`
- validators implementados para titulo, prioridade, status, transicoes, coordenadas, datas, UUIDs, limit/offset e busca
- RBAC atualizado com `work_orders:read`, `work_orders:create`, `work_orders:update`, `work_orders:assign`, `work_orders:status`, `work_orders:cancel` e `work_orders:delete`
- eventos/timeline implementados: `work_order_created`, `work_order_updated`, `work_order_assigned`, `work_order_status_changed`, `work_order_cancelled` e `work_order_completed`
- auditoria best-effort adicionada para criacao, atualizacao, atribuicao, mudanca de status, cancelamento e conclusao
- navigation registry atualizado para `operations.workOrders` como `backend-ready`
- testes criados/atualizados: `tests/work-orders.test.ts`, `tests/work-orders-routes.test.ts`, `tests/core-saas.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/work-orders.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/frontend-menu-navigation.md`, `docs/field-operator-location-map.md`, `docs/backend-navigation-menu.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: UI completa de Work Orders, despacho avancado, roteirizacao, comissao, pagamento de prestador, app Flutter, Google Maps real, fotos/assinaturas especificas de OS, estoque/pecas e integracao externa
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/work-orders.test.ts`, `node --test --import tsx tests/work-orders-routes.test.ts`, `node --test --import tsx tests/field-location-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/core-saas.test.ts` e `git diff --check`

## 2026-06-09 - work orders UI

- branch usada: `feature/work-orders-ui`
- comandos iniciais executados: `git branch --show-current`, `git status` e `git log --oneline --decorate -5`
- branch confirmada e worktree inicial limpo
- modulo frontend criado: `frontend/src/modules/work-orders`
- rotas implementadas em `frontend/src/App.tsx`: `/work-orders`, `/work-orders/new` e `/work-orders/:workOrderId`
- services criados para consumir endpoints reais de lista, criacao, detalhe, status, atribuicao e timeline
- adapter criado para normalizar envelopes `{ items, pagination }`, `{ data }`, snake_case e camelCase
- hooks criados: `useWorkOrders` e `useWorkOrderDetail`
- mocks realistas criados para OS aberta, atribuida, em deslocamento, em atendimento, concluida, cancelada e urgente
- lista implementada com KPIs, filtros, busca, badges, tabela e lista mobile
- criacao implementada com validacao frontend e redirecionamento para detalhe
- detalhe implementado com timeline, dados operacionais, alteracao de status, atribuicao simples por UUID e link para Mapa Operacional quando ha coordenadas
- permissoes frontend alinhadas para `work_orders:*`; aliases legados `work-orders:*` permanecem apenas em compatibilidade de auth
- navigation registry atualizado para `operations.workOrders` como `implemented`
- testes atualizados: `frontend/tests/smoke-flow.test.tsx`, `frontend/tests/work-orders.adapter.test.ts` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/work-orders.md`, `docs/frontend-screens.md`, `docs/frontend-menu-navigation.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/backend-navigation-menu.md`, `docs/field-operator-location-map.md`, `docs/09-mapa-telas-frontend.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: despacho avancado, roteirizacao, comissao, pagamento de prestador, Flutter/mobile, Google Maps real, upload de evidencias especificas por OS, estoque/pecas, novos endpoints backend e migrations
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/work-orders.test.ts`, `node --test --import tsx tests/work-orders-routes.test.ts`, `node --test --import tsx tests/field-location-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/core-saas.test.ts` e `git diff --check`

## 2026-06-10 - operations map + work orders integration

- branch usada: `feature/operations-map-work-orders-integration`
- comandos iniciais executados: `pwd`, `git status --short`, `git branch --show-current`, `git fetch origin`, `git rev-parse --abbrev-ref origin/HEAD`, `git log --oneline -5`, `gh pr list --state open --limit 10`, `gh pr view 54`, `gh pr view 53`, `gh pr view 52`, `rg` de mapa/OS/localizacao e listagem de modulos
- diagnostico inicial: branch local estava em `feature/work-orders-ui`, worktree limpo, `origin/HEAD=origin/main`, PRs #52/#53/#54 merged e sem PRs abertas; em PowerShell, `find ... -maxdepth` foi substituido por `Get-ChildItem -Recurse -File | Sort-Object FullName`
- base atualizada: `git checkout main`, `git pull --ff-only origin main` e criada `feature/operations-map-work-orders-integration`
- arquivos de mapa, Work Orders, Field Location, registry de navegacao e docs obrigatorios foram lidos antes da implementacao
- `frontend/src/modules/operations/map` passou a suportar `currentWorkOrder` opcional em `FieldLocationItem`
- adapter/service do mapa correlacionam localizacao com OS ativa/atribuida usando `assignedOperatorId`/`assignedUserId`
- consumo de `/work-orders` e exibicao de link dependem de `work_orders:read`; sem a permissao, a UI nao renderiza link/acao de OS
- componentes do mapa atualizados para mostrar codigo/status/prioridade da OS e abrir `/work-orders/:workOrderId`
- mocks de Work Orders alinhados a operadores de campo para fallback demonstrativo seguro
- navigation registry atualizado para `operations.map` como `implemented`, com endpoints relacionados de localizacao e OS
- testes smoke/E2E atualizados para cobrir enriquecimento e link de OS no mapa
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/work-orders.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/api.md`, `docs/02-mapa-modulos.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend novo, migrations, Google Maps real, WebSocket, roteirizacao, despacho avancado, Flutter/mobile, comissoes e estoque

## 2026-06-10 - field dispatch routing foundation

- branch usada: `feature/field-dispatch-routing-foundation`
- comandos iniciais executados: `pwd`, `git status --short`, `git branch --show-current`, `git fetch origin`, `git rev-parse --abbrev-ref origin/HEAD`, `git log --oneline -8`, `gh pr list --state open --limit 10`, `gh pr view 55`, `gh pr view 54`, `gh pr view 53`, `rg` de dispatch/OS/localizacao/mapa e listagem de modulos
- diagnostico inicial: branch local estava em `feature/operations-map-work-orders-integration`, worktree limpo, `origin/HEAD=origin/main`, PRs #53/#54/#55 merged e sem PRs abertas; em PowerShell, `find ... -maxdepth` foi substituido por `Get-ChildItem -Recurse -File | Sort-Object FullName`
- base atualizada: `git checkout main`, `git pull --ff-only origin main` e criada `feature/field-dispatch-routing-foundation`
- arquivos de Mapa Operacional, Work Orders, Field Location, navigation registry, RBAC e docs obrigatorios foram lidos antes da implementacao
- migration criada: `prisma/migrations/20260617000000_add_field_dispatches/migration.sql`
- schema Prisma atualizado com `FieldDispatch` e `FieldDispatchEvent`
- modulo criado: `src/modules/field-dispatch`
- rotas registradas em `src/app.ts`
- endpoints implementados: `GET /api/v1/operations/dispatches`, `POST /api/v1/operations/dispatches`, `GET /api/v1/operations/dispatches/:dispatchId`, `PATCH /api/v1/operations/dispatches/:dispatchId/status` e `PATCH /api/v1/operations/dispatches/:dispatchId/reassign`
- validators implementados para UUIDs, status, transicoes, cancelamento com motivo, limit/offset e busca
- RBAC atualizado com `field_dispatch:read`, `field_dispatch:create`, `field_dispatch:update`, `field_dispatch:cancel` e `field_dispatch:reassign`
- service valida OS e operador no mesmo tenant antes de criar ou reatribuir despacho
- eventos/timeline implementados: `field_dispatch_created`, `field_dispatch_status_changed`, `field_dispatch_reassigned` e `field_dispatch_cancelled`
- auditoria best-effort adicionada para criacao, mudanca de status, reatribuicao e cancelamento
- navigation registry atualizado para `operations.dispatches` como `backend-ready`
- testes criados/atualizados: `tests/field-dispatch.test.ts`, `tests/field-dispatch-routes.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/modules.md`, `docs/rbac.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/field-operator-location-map.md`, `docs/work-orders.md`, `docs/database.md`, `docs/02-mapa-modulos.md`, `docs/05-requisitos-funcionais.md`, `RBAC_MATRIX.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: UI completa de despacho, Google Maps real, roteirizacao/otimizacao, WebSocket/tempo real, Flutter/mobile, comissoes, pagamentos e despacho completo
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `node --test --import tsx tests/field-dispatch.test.ts`, `node --test --import tsx tests/field-dispatch-routes.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `npm run test:e2e` e `git diff --check`

## 2026-06-10 - field dispatch UI

- branch usada: `feature/field-dispatch-ui`
- comandos iniciais executados: `pwd`, `git status --short`, `git branch --show-current`, `git remote -v`, `git fetch origin`, `git checkout main`, `git pull --ff-only origin main`, `git checkout -b feature/field-dispatch-ui`, listagem de modulos, `rg` de Work Orders/Mapa/Field Dispatch, leitura do registry, docs e `frontend/src/App.tsx`
- diagnostico inicial: branch anterior era `feature/field-dispatch-routing-foundation`; `main` foi atualizado ate a PR #56 e a branch `feature/field-dispatch-ui` iniciou com worktree limpo
- modulo frontend criado: `frontend/src/modules/operations/dispatches`
- rota criada: `/operations/dispatches`, protegida por `field_dispatch:read`
- endpoints consumidos: `GET /api/v1/operations/dispatches`, `POST /api/v1/operations/dispatches`, `GET /api/v1/operations/dispatches/:dispatchId`, `PATCH /api/v1/operations/dispatches/:dispatchId/status`, `PATCH /api/v1/operations/dispatches/:dispatchId/reassign` e enriquecimento opcional via `GET /api/v1/work-orders`
- UI implementada: listagem, KPIs, filtros, detalhe, criacao simples, status/cancelamento, reatribuicao, badges, fallback/mock e estados loading/empty/error
- RBAC aplicado nas acoes: `field_dispatch:create`, `field_dispatch:update`, `field_dispatch:cancel` e `field_dispatch:reassign`
- navigation registry atualizado para `operations.dispatches` como `implemented`; fallback local `tenantNavigation` tambem recebeu o item
- testes atualizados/criados: `frontend/tests/smoke-flow.test.tsx`, `frontend/tests/dispatches.adapter.test.ts` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/api.md`, `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/field-operator-location-map.md`, `docs/work-orders.md`, `docs/02-mapa-modulos.md`, `docs/platform-console.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend novo, migrations, Google Maps real, Flutter/mobile, roteirizacao avancada, WebSocket/tempo real, despacho completo, comissoes e pagamentos

## 2026-06-10 - operations map dispatch integration

- branch usada: `feature/operations-map-dispatch-integration`
- comandos iniciais executados: `pwd`, `git status --short`, `git branch --show-current`, `git remote -v`, `git fetch origin`, `git checkout main`, `git pull --ff-only origin main`, `git checkout -b feature/operations-map-dispatch-integration`, listagem de arquivos de `operations`/`work-orders`, `rg` de mapa/despacho/OS e leitura dos arquivos centrais
- diagnostico inicial: `main` foi atualizado com a PR #57 antes da criacao da branch; worktree limpo antes da implementacao
- `frontend/src/modules/operations/map` passou a suportar `currentDispatch` opcional em `FieldLocationItem`
- service do mapa consome `GET /api/v1/operations/dispatches` somente quando o contexto possui `field_dispatch:read`
- falha ou ausencia de permissao de despacho nao bloqueia o mapa; o enriquecimento de despacho retorna sem quebrar a tela
- painel/lista/marcador do mapa exibem despacho vinculado quando disponivel
- acao contextual abre `/operations/dispatches?workOrderId=...&operatorUserId=...` quando `field_dispatch:create` esta presente e ha OS atual
- `/operations/dispatches` aceita query string para filtro/acompanhamento/pre-preenchimento (`workOrderId`, `operatorUserId`, `dispatchId`)
- fallback/mock cobre operador com OS e despacho vinculado
- testes atualizados: `frontend/tests/dispatches.adapter.test.ts` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/work-orders.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend novo, migrations, Google Maps real, WebSocket/tempo real, Flutter/mobile, roteirizacao avancada, despacho completo, comissoes, pagamentos e fiscal

## 2026-06-10 - operations map dispatch actions

- branch usada: `feature/operations-map-dispatch-actions`
- comandos iniciais executados: `git fetch origin`, `git checkout main`, `git pull --ff-only origin main`, `git checkout -b feature/operations-map-dispatch-actions`, `git branch --show-current`, `git status --short`, leitura de mapa/despachos/navigation/docs/testes
- implementado painel `OperationsDispatchActionsPanel` em `/operations/map`, exibido apenas quando ha despacho vinculado e permissao de acao correspondente
- acoes reutilizam `updateDispatchStatus` e `reassignDispatch`; cancelamento usa `PATCH /api/v1/operations/dispatches/:dispatchId/status` com `status=cancelled` e motivo obrigatorio
- erros de API permanecem no painel de acoes, sem mutar estado local do despacho e sem acionar loading global do mapa
- `operations.map` no registry passou a declarar os endpoints condicionais de despacho ja existentes
- documentacao atualizada em `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/api-screen-endpoints.md`, `docs/field-operator-location-map.md`, `docs/modules.md` e `docs/rbac.md`
- fora de escopo mantido: backend novo, migrations, endpoints novos, Google Maps real, WebSocket/tempo real, Flutter/mobile, roteirizacao, despacho completo, pagamentos e fiscal

## 2026-06-10 - field dispatch action audit hardening

- branch usada: `feature/field-dispatch-action-audit-hardening`
- PR base validada: #59 `feat: add operations map dispatch actions` mergeada na `main` com merge commit `bd27d6c1373b8f58f093e780270fc4f9d1151828`
- comandos iniciais executados: `pwd`, `git status --short`, `git branch --show-current`, `git remote -v`, `git fetch origin`, `git checkout main`, `git pull --ff-only origin main`, `gh pr view 59`, `gh api repos/thiagodorgo/ERP_Techsolutios/pulls/59`, `git checkout -b feature/field-dispatch-action-audit-hardening`
- mapeamento executado sobre `frontend/src/modules/operations`, `OperationsDispatchActionsPanel`, `OperationsOperatorDetailPanel`, `OperationsMapPage`, testes smoke/dispatches e E2E
- hardening implementado: feedback local de sucesso/erro por acao, loading local para status/reatribuicao/cancelamento, protecao contra clique duplo, mensagem para usuario sem permissao mutavel e bloqueio visual para despacho terminal
- testes atualizados para permissoes parciais e erro local de API nas acoes de despacho
- fora de escopo mantido: backend, migrations, endpoints novos, Google Maps real, WebSocket, Flutter/mobile, roteirizacao, comissoes, pagamentos e fiscal

## 2026-06-10 - frontend route splitting field ops

- branch usada: `feature/frontend-route-splitting-field-ops`
- fase 0: `git fetch origin`, `git checkout main`, `git pull --ff-only`, worktree limpo, PR #60 confirmada no codigo, `main` estava 2 commits atras e foi atualizado via fast-forward
- fase 1: criada branch `feature/frontend-route-splitting-field-ops`
- mapeamento: lido `App.tsx` completo (176 linhas, todas imports eager), modulos operations/map/dispatches (31 arquivos), work-orders (22 arquivos), platform/cloud-billing
- implementacao: `React.lazy` + `Suspense` adicionados em `App.tsx` para 9 rotas pesadas; `PageLoader` inline como fallback
- build antes: chunk `index.js` 512.08 kB (gzip 142.69 kB), warning Vite ativo
- build depois: chunk `index.js` 389.29 kB (gzip 114.92 kB), warning Vite eliminado, 22 chunks async gerados
- validacoes: `npm run check` passou, `npm run lint` passou, `npm test` passou (15 testes), `npm run build` passou, `npm --prefix frontend run check` passou, `npm --prefix frontend run build` passou (sem warning), `npm --prefix frontend run test:smoke` passou (26 testes), `git diff --check` passou
- e2e (`npm run test:e2e`) nao foi possivel executar por exigir PostgreSQL/Docker ativo; testes unitarios e smoke cobrem o comportamento
- documentacao atualizada em `docs/frontend-screens.md`, `docs/modules.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend, migrations, endpoints novos, Google Maps real, WebSocket, Flutter/mobile, roteirizacao, comissoes, pagamentos e fiscal

## 2026-06-10 - validacao E2E field ops apos route splitting

- branch usada: `feature/field-ops-e2e-validation-after-route-splitting`
- objetivo: executar e registrar validacao E2E completa dos fluxos de campo apos PR #61 (route splitting/lazy loading)
- fase 0: `git fetch origin`, `git checkout main`, `git pull --ff-only` — main atualizado com PR #61 (633ba96), worktree limpo
- fase 0 confirmacao: `lazy`, `Suspense`, `PageLoader`, `OperationsMapPage`, `OperationsDispatchesPage` encontrados em `frontend/src/App.tsx`
- infra: `docker compose config` passou; `docker compose up -d` — daemon Linux WSL havia parado, reiniciado via WSL start + Docker Desktop restart; containers `erp-postgres` e `erp-redis` subiram healthy
- prisma: `validate` passou, `generate` passou, `migrate deploy` (14 migrations aplicadas, nenhuma pendente), `migrate status` (database schema up to date)
- seed: `npm run db:seed` executado com sucesso
- testes backend pre-E2E: `field-dispatch.test.ts` (2/2), `field-dispatch-routes.test.ts` (2/2), `work-orders.test.ts` (2/2), `work-orders-routes.test.ts` (2/2), `navigation-menu.test.ts` (9/9), `navigation-menu-routes.test.ts` (7/7), `rls-tenant-isolation.test.ts` (1/1)
- `npm run check`: passou; `npm run lint`: passou; `npm test`: passou (15 testes); `npm run build`: passou
- `npm --prefix frontend run check`: passou; `npm --prefix frontend run build`: passou (chunk 389 kB, sem warning); `npm --prefix frontend run test:smoke`: passou (26 testes)
- `npm run test:e2e`: **11/11 testes passaram em 35.6s** com 1 worker chromium real e banco real
  - lazy loading comprovado: /operations/map, /operations/dispatches e /work-orders carregam sem travar
  - mapa renderiza UI inicial e fallback sem Google Maps
  - despachos renderiza lista, KPIs e acoes RBAC
  - ordens de servico renderiza lista, criacao e detalhe
- `git diff --check`: passou; `git status --short`: limpo; nenhum arquivo de codigo precisou ser alterado
- documentacao atualizada em `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: feature nova, backend, migrations, endpoints, Google Maps real, WebSocket, Flutter/mobile, roteirizacao, comissoes, pagamentos e fiscal

## 2026-06-10 - Google Maps provider no Mapa Operacional

- branch usada: `feature/operations-map-google-maps-provider`
- base: `main` atualizado com PR #63 (c2c9ff4), worktree limpo
- fase 0: `git fetch origin`, `git checkout main`, `git pull --ff-only` — fast-forward ok, PR #63 confirmada
- fase 0 mapeamento: lido `OperationsMapCanvas.tsx` (placeholder CSS puro), `OperationsMapPage.tsx`, `operations-map.types.ts`, `operations-map.adapter.ts`, `operations-map.mock.ts`, `.env.example` (VITE_GOOGLE_MAPS_API_KEY ja presente vazia), `frontend/src/config/env.ts` (padrao readFrontendEnv)
- fase 1: criada branch `feature/operations-map-google-maps-provider`
- criado `frontend/src/types/google-maps.d.ts`: tipos minimos de `google.maps.Map`, `google.maps.Marker` e interfaces; sem dependencia runtime nova
- adicionado `VITE_GOOGLE_MAPS_API_KEY` ao tipo `FrontendEnvKey` em `frontend/src/config/env.ts`
- criado `frontend/src/modules/operations/map/hooks/useGoogleMapsLoader.ts`: singleton de modulo, carrega script uma vez, notifica subscribers, estados: idle/loading/ready/error
- criado `frontend/src/modules/operations/map/components/GoogleMapsCanvas.tsx`: inicializa google.maps.Map no useEffect quando ready, sincroniza marcadores (cor por status/selecao), panTo no selecionado, clique chama onSelect, cleanup no unmount
- reescrito `frontend/src/modules/operations/map/components/OperationsMapCanvas.tsx`: le VITE_GOOGLE_MAPS_API_KEY via readFrontendEnv, chama useGoogleMapsLoader, usa GoogleMapsCanvas quando chave presente e sem erro, cai no placeholder existente quando chave ausente ou erro
- corrigido: import `Map as MapIcon` no GoogleMapsCanvas para evitar shadowing do built-in `Map` pelo icone lucide-react
- atualizado `frontend/src/modules/operations/map/pages/OperationsMapPage.tsx`: texto do alerta de limite removido "Google Maps" (entregue), mantido "roteirizacao e tempo real"
- adicionado `.operations-map-canvas__gmaps` em `frontend/src/styles/app.css` (min-height 380px desktop, 420px tablet+)
- `npm run check`: passou; `npm run lint`: passou; `npm test`: passou (15 testes); `npm run build`: passou
- `npm --prefix frontend run check`: passou; `npm --prefix frontend run build`: passou (OperationsMapPage 32.45 kB, sem warning)
- smoke: corrigida assercao `/Visualização operacional inicial/` para `/Visualização operacional/`; 26/26 passaram
- E2E: corrigidas assercoes de texto do mapa placeholder e chip do provider; 11/11 passaram em 31.8s com Chromium real e PostgreSQL real
- `git diff --check`: passou; `git status --short`: limpo
- documentacao atualizada em `docs/frontend-screens.md`, `docs/modules.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend, migrations, endpoints novos, WebSocket/tempo real, roteirizacao avancada, Flutter/mobile, comissoes, pagamentos e fiscal

## 2026-06-10 - manual vendor chunks

- branch usada: `feature/frontend-manual-vendor-chunks`
- base: `main` atualizado com PR #62 (25faea2), worktree limpo
- fase 0: `git fetch origin`, `git checkout main`, `git pull --ff-only` — fast-forward ok, PR #62 confirmada
- fase 1: criada branch `feature/frontend-manual-vendor-chunks`
- mapeamento: lido `vite.config.ts` (9 linhas, apenas `plugins` e `server`), `frontend/package.json` — deps: react 19, react-dom, react-router-dom 7, lucide-react, vite 6
- build antes: chunk `index.js` 389.29 kB (gzip 114.92 kB), sem warning Vite
- implementacao: adicionado `build.rollupOptions.output.manualChunks` em `vite.config.ts`
  - `vendor-react`: `node_modules/react/`, `node_modules/react-dom/`, `node_modules/react-router`, `node_modules/scheduler/`
  - `vendor-icons`: `node_modules/lucide-react/`
- build depois: chunk `index.js` 125.38 kB (gzip 33.89 kB); `vendor-react` 232.37 kB (gzip 74.21 kB); `vendor-icons` 38.77 kB (gzip 8.15 kB); sem warning Vite
- reducao do chunk de app: 389 kB -> 125 kB (-264 kB, -67%); total de bytes muito proximo, porcao estavel agora em cache de longo prazo
- `npm run check`: passou; `npm run lint`: passou; `npm test`: passou (15 testes); `npm run build`: passou
- `npm --prefix frontend run check`: passou; `npm --prefix frontend run build`: passou (125 kB, sem warning); `npm --prefix frontend run test:smoke`: passou (26 testes)
- docker: `erp-postgres` e `erp-redis` ja estavam healthy; `prisma migrate deploy` (14 migrations, nenhuma pendente); `prisma migrate status`: up to date
- `npm run test:e2e`: **11/11 testes passaram em 23.3s** com 1 worker chromium real e banco real
- `git diff --check`: passou; `git status --short`: limpo
- documentacao atualizada em `docs/frontend-screens.md`, `docs/modules.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend, migrations, endpoints novos, Google Maps real, WebSocket, Flutter/mobile, roteirizacao, comissoes, pagamentos e fiscal

## PR feature/operations-map-live-refresh-polling — 2026-06-10

### FASE 0
- branch base: `main` em commit `f30afe6` (PR #64 mergeada)
- PR #64 confirmada: `GoogleMapsCanvas`, `useGoogleMapsLoader`, `google-maps.d.ts` presentes em `main`
- worktree limpo; partida autorizada

### FASE 1 — Implementacao
Arquivos alterados:
- `frontend/src/modules/operations/map/useOperationsMap.ts`: adicionados `POLL_INTERVAL_MS = 30_000`, estado `isRefreshing`, estado `autoRefresh`, `refreshingRef` (previne chamadas concorrentes em background), parametro `background` no `refresh`, effect de polling com cleanup, retorno exposto `autoRefresh`, `setAutoRefresh`, `isRefreshing`
- `frontend/src/modules/operations/map/pages/OperationsMapPage.tsx`: imports `Pause`, `Play` adicionados; `isRefreshing`, `autoRefresh`, `setAutoRefresh` desestruturados do hook; chip "Atualizando..." condicional; botao "Pausar auto" / "Auto atualizar" com toggle; botao "Atualizar" desabilitado durante `loading || isRefreshing`
- `docs/modules.md`: entrada `field_operations` atualizada com descricao do polling
- `agent-orchestration/docs/status-geral.md`: entrada adicionada
- `agent-orchestration/codex/log-execucao.md`: este log

Sem alteracoes a: backend, Prisma, migrations, endpoints, OperationsMapCanvas, GoogleMapsCanvas, useGoogleMapsLoader, smoke/E2E assertions

### Validacoes
- `npm run check`: passou (tsc limpo)
- `npm run lint`: passou
- `npm test`: 15/15
- `npm run build`: passou
- `npm --prefix frontend run check`: passou (tsc limpo)
- `npm --prefix frontend run build`: passou; sem warnings Vite; chunks estáveis
- `npm --prefix frontend run test:smoke`: 26/26
- `npm run test:e2e`: 11/11 (docker postgres/redis healthy)
- `git diff --check`: passou

## Log 2026-06-10 - feature/field-ops-realtime-events-foundation

### FASE 0 - Alinhamento
- branch: main (29da59d, PR #65 confirmado)
- worktree: limpo
- nova branch: `feature/field-ops-realtime-events-foundation`

### FASE 1 - Mapeamento
- infra existente: `publishDomainEvent` em `src/infra/events/domain-event.publisher.ts`
- tipos existentes: `DOMAIN_EVENT_NAMES` em `src/infra/events/domain-event.types.ts`
- padrao existente: checklist.service.ts usa `await publishDomainEvent(name, payload, { tenantId, actorId })`
- eventos sem job mapping retornam instantaneamente sem Redis

### FASE 2 - Implementacao
- `domain-event.types.ts`: +6 nomes de eventos field_ops
- `field-dispatch.service.ts`: publishDomainEvent apos create, changeStatus, reassign
- `field-location.service.ts`: recordMobileLocation tornado async, publishDomainEvent apos record (sem coords no payload)
- `work-order.service.ts`: publishDomainEvent apos changeStatus
- `tests/field-ops-events.test.ts`: 9 novos testes

### FASE 3 - Validacoes
- npm run check: OK
- npm run lint: OK
- npm test (15/15): OK
- npm run build: OK
- field-ops-events.test.ts (9/9): OK
- field-dispatch.test.ts (2/2): OK
- field-dispatch-routes.test.ts (2/2): OK
- work-orders.test.ts (2/2): OK
- work-orders-routes.test.ts (2/2): OK
- rls-tenant-isolation.test.ts (1/1): OK
- git diff --check: OK

### Decisoes tecnicas
- Nenhuma migration criada (eventos nao persistem em tabela propria)
- Nenhum job worker criado (eventos ficam em memoria, prontos para job mapping futuro)
- Nenhum endpoint de streaming criado
- `void publishDomainEvent()` vs `await`: escolhido `await` para manter consistencia com padrao do checklist.service.ts; seguro pois eventos sem job mapping retornam sem IO
- Payload de localizacao exclui lat/lon intencionalmente

## 2026-06-10 - field ops event fanout job

- branch usada: `feature/field-ops-event-fanout-job`
- objetivo: adicionar mapeamento de fanout assincrono para os 6 eventos de field ops, preparando transporte SSE/WebSocket futuro

### FASE 0 - Git
- main atualizada com PR #66 (afac1ef + 95e7923)
- branch criada: `feature/field-ops-event-fanout-job`

### FASE 1 - Inspecao
- `domain-event.publisher.ts`: identificado `eventJobMap` como ponto de extensao; padrao fail-open confirmado
- `job.types.ts`: identificado `JOB_NAMES` como catalogo tipado
- `job.registry.ts`: identificado `createDefaultJobRegistry()` como ponto de registro de handlers
- `domain-events.test.ts`: padrão de mock queue com `as unknown as JobQueue` confirmado
- `field-ops-events.test.ts`: 9 testes existentes todos com `enqueuedJobId === undefined` (pre-mapping)

### FASE 2 - Implementacao
- `job.types.ts`: +1 job name `field-ops-event-fanout`
- `domain-event.publisher.ts`: +6 entradas no eventJobMap para os 6 eventos field ops
- `src/modules/field-dispatch/field-ops-event-fanout.jobs.ts`: criado handler placeholder
- `job.registry.ts`: importado e registrado `createFieldOpsEventFanoutJobHandler()`
- `tests/field-ops-events.test.ts`: reescrito com `makeCapturingQueue()`; 12 testes

### FASE 3 - Validacoes
- npm run check: OK
- npm run lint: OK
- npm test (15/15): OK
- npm run build: OK
- field-ops-events.test.ts (12/12): OK
- field-dispatch.test.ts (2/2): OK
- field-dispatch-routes.test.ts (2/2): OK
- work-orders.test.ts (2/2): OK
- work-orders-routes.test.ts (2/2): OK
- rls-tenant-isolation.test.ts (1/1): OK
- git diff --check: OK

### Decisoes tecnicas
- Handler e placeholder: SSE/WebSocket sera PR separado (`feature/field-ops-sse-transport`)
- Mock queue sem Redis para testes unitarios; padrao copiado de domain-events.test.ts
- fail-open preservado: falha de enqueue nao quebra create/changeStatus/reassign
- Nenhum endpoint publico; Nenhum segredo; Nenhuma migration

## 2026-06-10 - operations map work order context filter

- branch usada: `feature/operations-map-work-order-context-filter`
- base: `origin/main` em `f3ee25f` com PR #67 mergeada; branch anterior local `feature/field-ops-sse-transport` preservada sem uso
- worktree inicial continha `experiments/` nao rastreado; item mantido fora de escopo e nao stageado
- implementado filtro local em `frontend/src/modules/operations/map/operations-map.adapter.ts`: `filterFieldLocationsByWorkOrder()` usa `currentWorkOrder.id` ou `currentDispatch.workOrderId`
- `OperationsMapPage` agora le `workOrderId` via query string, aplica contexto antes dos filtros visuais, atualiza KPIs/equipes pelo contexto e reseta selecao quando o operador selecionado sai do conjunto
- contexto removivel exibido com chip "OS filtrada" e botao "Limpar contexto"; estado vazio explicito exibe opcao de limpar filtro quando a OS nao possui operador/despacho vinculado
- mapa placeholder, Google Maps real e polling existente permanecem sem alteracao estrutural; recebem somente o subconjunto filtrado
- smoke tests atualizados para adapter e renderizacao de `/operations/map?workOrderId=...`
- validacoes executadas:
  - `git status --short`: 5 arquivos alterados esperados + `experiments/` nao rastreado fora de escopo
  - `npm --prefix frontend run check`: OK
  - `npm --prefix frontend run build`: OK
  - `npm --prefix frontend run test:smoke`: OK, 26/26
  - `npm run check`: OK
  - `npm test`: OK, 15/15
  - `git diff --check`: OK
  - `docker compose ps`: `erp-postgres` e `erp-redis` healthy
  - `npm run test:e2e`: OK, 11/11
- fora de escopo mantido: backend, migrations, endpoints novos, SSE/WebSocket/realtime, fanout job, Google Maps provider, Flutter/mobile e permissoes novas

## 2026-06-11 - tenant-scoped realtime SSE para field operations

- branch usada: `feature/field-ops-tenant-realtime-sse`
- base: `origin/main` em `e8166af`, com PR #68 mergeada; `experiments/` permaneceu nao rastreado e fora de escopo
- objetivo: implementar transporte SSE tenant-scoped para eventos de operacoes de campo sem remover polling do mapa

### Implementacao
- criado `src/modules/field-ops-realtime/field-ops-realtime.broker.ts`
  - subscribers separados por `tenantId`
  - deduplicacao por `event.id` para evitar duplicidade entre publicacao imediata e fanout job
  - sanitizacao recursiva de chaves de coordenadas antes de entregar ao stream
  - entrega best-effort por subscriber, sem quebrar a operacao de dominio se um stream falhar
- criado `src/modules/field-ops-realtime/field-ops-realtime.routes.ts`
  - endpoint `GET /api/v1/operations/field-events/stream`
  - headers SSE `text/event-stream`, `no-cache`, keep-alive e `X-Accel-Buffering: no`
  - protecao por `tenantContextMiddleware`, RBAC persistido e `requirePermission("field_location:read")`
  - cleanup de subscriber no `request.close`
- `src/app.ts`: router realtime montado em `/api/v1` antes dos routers de field location/dispatch
- `src/infra/events/domain-event.publisher.ts`: eventos field ops publicados no broker em best-effort alem do job Redis existente
- `src/modules/field-dispatch/field-ops-event-fanout.jobs.ts`: handler do job passa a publicar no broker SSE
- frontend:
  - `operations-map.service.ts`: `subscribeOperationsMapEvents()` usa `fetch` streaming com `Authorization: Bearer`, parser SSE manual e callback `onError`
  - `useOperationsMap.ts`: abre stream quando ha `field_location:read` e, a cada evento, chama `refresh(true)`; erro SSE e ignorado para preservar polling
  - `operations-map.types.ts`: tipo de evento realtime adicionado
- testes:
  - `tests/field-ops-realtime.test.ts`: RBAC, tenant isolation, sanitizacao e fanout handler
  - `frontend/tests/smoke-flow.test.tsx`: Bearer no stream, parsing de `field_ops_event` e tolerancia a falha

### Fora de escopo mantido
- WebSocket, remocao do polling, Flutter/mobile, novos endpoints de dominio de localizacao/despacho, Google Maps provider, billing, pagamentos e fiscal

### Validacoes
- `npm run check`: OK
- `npm run lint`: OK
- `npm test`: OK, 15/15
- `npm run build`: OK
- `npm --prefix frontend run check`: OK
- `npm --prefix frontend run build`: OK
- `npm --prefix frontend run test:smoke`: OK, 27/27
- `node --test --import tsx tests/field-ops-realtime.test.ts`: OK, 3/3
- `git diff --check`: OK
- `docker compose ps`: falhou ao conectar no Docker Desktop (`dockerDesktopLinuxEngine` ausente); `npm run test:e2e` nao executado porque Docker/PostgreSQL nao estavam ativos

## 2026-06-11 - field ops realtime health e degradacao graciosa

- branch usada: `feature/field-ops-realtime-health`
- base: `origin/main` em `70a798c`; a branch remota de B-070 (`origin/test/field-ops-sse-e2e-validation`) existia, mas nao aparecia mergeada em `main` no inicio desta fase
- worktree inicial continha `experiments/` nao rastreado; item mantido fora de escopo e nao stageado
- objetivo: expor estado observavel de SSE/fallback no Mapa Operacional e health minimo tenant-scoped no backend sem remover polling

### Implementacao
- `src/modules/field-ops-realtime/field-ops-realtime.routes.ts`
  - adicionado `GET /api/v1/operations/field-events/health`
  - rota reutiliza `tenantContextMiddleware`, RBAC persistido e `requirePermission("field_location:read")`
  - resposta limita diagnostico ao tenant atual: status, transporte SSE, `tenantScoped`, `activeSubscribers`, keep-alive e timestamp
- `frontend/src/modules/operations/map/operations-map.types.ts`
  - adicionados `OperationsMapRealtimeStatus` e `OperationsMapRealtimeState`
- `frontend/src/modules/operations/map/useOperationsMap.ts`
  - estado `connected`, `degraded`, `fallback` e `unavailable`
  - `onOpen` marca conexao conectada; `onError` marca degradado, mantem polling e agenda reconexao
  - polling de 30s permanece ativo e independente do SSE
- `frontend/src/modules/operations/map/operations-map.service.ts`
  - stream encerrado sem erro tambem aciona `onError`, para o hook entrar em degradacao/reconexao
- `frontend/src/modules/operations/map/pages/OperationsMapPage.tsx`
  - chips e alerts para estado realtime, fallback polling ativo e indisponibilidade
- `tests/field-ops-realtime.test.ts`
  - cobertura de RBAC no health, isolamento entre tenants e ausencia de coordenadas/dados sensiveis no diagnostico
- `frontend/tests/smoke-flow.test.tsx`
  - cobertura de `onOpen`, tolerancia a falha/encerramento do stream e render do fallback polling

### Fora de escopo mantido
- Remocao do polling, WebSocket, Flutter/mobile, novos endpoints de dominio de localizacao/despacho, Google Maps provider, billing, pagamentos, fiscal e refactors nao relacionados

### Validacoes
- `git status --short`: arquivos esperados alterados + `experiments/` nao rastreado fora de escopo
## 2026-06-11 - validacao E2E apos field ops SSE

- branch usada: `test/field-ops-sse-e2e-validation`
- objetivo: validar o sistema completo apos merge da PR #69 com Docker/PostgreSQL/Redis ativos

### Git e confirmacao de base
- `git fetch origin`: OK
- `git switch main` + `git pull --ff-only origin main`: fast-forward de `f3ee25f` para `70a798c`
- merge confirmado: `70a798c Merge pull request #69 from thiagodorgo/feature/field-ops-tenant-realtime-sse`
- PR #69 confirmada no codigo por `rg` em:
  - `src/app.ts`: `createFieldOpsRealtimeRouter()`
  - `src/modules/field-ops-realtime/field-ops-realtime.routes.ts`: `/operations/field-events/stream`
  - `src/modules/field-ops-realtime/field-ops-realtime.broker.ts`: `fieldOpsRealtimeBroker`
  - `frontend/src/modules/operations/map/operations-map.service.ts`: `subscribeOperationsMapEvents`
- `git status --short`: apenas `experiments/` nao rastreado, fora de escopo

### Infraestrutura e banco
- `docker compose config`: OK
- `docker compose up -d`: OK; `erp-postgres` e `erp-redis` running
- `docker compose ps`: `erp-postgres` e `erp-redis` healthy
- `npx prisma validate`: OK
- `npx prisma generate`: OK
- `npx prisma migrate deploy`: 14 migrations, nenhuma pendente
- `npx prisma migrate status`: database schema up to date
- `npm run db:seed`: OK

### Validacoes
- `npm run check`: OK
- `npm run lint`: OK
- `npm test`: OK, 15/15
- `npm run build`: OK
- `npm --prefix frontend run check`: OK
- `npm --prefix frontend run build`: OK
- `npm --prefix frontend run test:smoke`: OK, 27/27
- `node --test --import tsx tests/field-ops-realtime.test.ts`: OK, 4/4
- `docker compose ps`: `erp-postgres` e `erp-redis` healthy
- `npm run test:e2e`: OK, 11/11
- `git diff --check`: OK
- `node --test --import tsx tests/field-ops-realtime.test.ts`: OK, 3/3
- `npm run test:e2e`: OK, 11/11 em 37.9s com Chromium e PostgreSQL/Redis reais
- `git diff --check`: OK

### Resultado
- E2E confirmou que login, mapa operacional, fallback sem Google Maps real, despachos, ordens de servico, checklists, Platform Console, configuracoes e logout continuam funcionando apos o SSE.
- Nenhum fix de codigo foi necessario.
- Alteracao desta fase: registro documental da validacao em `agent-orchestration/docs/status-geral.md` e este log.
- Fora de escopo preservado: remover polling, trocar SSE por WebSocket, Flutter/mobile, novos endpoints de dominio, Google Maps provider, billing, pagamentos, fiscal e refactors nao relacionados.

## 2026-06-11 - realtime-first polling fallback tuning

- branch usada: `feature/field-ops-realtime-polling-fallback`
- pre-condicao executada antes de alterar arquivos:
  - `git checkout main`: OK
  - `git pull --ff-only origin main`: fast-forward ate `c086c5e`
  - PR #71 confirmada em `main`: `c086c5e Merge pull request #71 from thiagodorgo/feature/field-ops-realtime-health`
  - artefatos B-071 confirmados por `rg`: health `/operations/field-events/health`, estados visuais realtime no mapa e testes de health em `tests/field-ops-realtime.test.ts`
- `git status --short` inicial: apenas `experiments/` nao rastreado, preservado e fora de escopo

### Implementacao
- `frontend/src/modules/operations/map/useOperationsMap.ts`
  - adicionado `shouldUseOperationsMapPollingFallback(autoRefresh, realtimeStatus)`
  - intervalo de polling de 30s agora so e agendado quando `autoRefresh` esta ativo e realtime nao esta `connected`
  - estados `degraded`, `fallback` e `unavailable` continuam usando polling como fallback
  - refresh manual continua chamando `refresh()` independentemente do estado SSE
- `frontend/tests/smoke-flow.test.tsx`
  - teste cobre polling desligado quando `connected` e fallback ativo quando `degraded`, `fallback` ou `unavailable`

### Preservacao
- `agent-orchestration/**` atualizado somente por append/merge aditivo
- `memory/**` nao existe no checkout e nao foi criado/removido
- `experiments/` permaneceu nao rastreado, nao stageado, nao apagado, nao movido e fora do commit

### Validacoes
- `npm run check`: OK
- `npm run lint`: OK
- `npm test`: OK, 15/15
- `npm run build`: OK
- `npm --prefix frontend run check`: OK
- `npm --prefix frontend run build`: OK
- `npm --prefix frontend run test:smoke`: OK, 28/28
- `node --test --import tsx tests/field-ops-realtime.test.ts`: OK, 4/4
- `docker compose ps`: `erp-postgres` e `erp-redis` healthy
- `npm run test:e2e`: OK, 11/11
- `git diff --check`: OK

### Fora de escopo mantido
- Remover polling completamente, WebSocket, Flutter/mobile, novos endpoints de localizacao/despacho, Google Maps provider, billing, pagamentos, fiscal e refactors nao relacionados

## 2026-06-11 - B-073 Commission Engine Planning and Data Model

- branch usada: `docs/commission-engine-planning`
- criado `docs/commissions.md`
- atualizado `docs/modules.md` com secao do modulo/capacidade `commissions`
- atualizado `agent-orchestration/docs/status-geral.md`
- atualizado `agent-orchestration/codex/log-execucao.md`
- motor de comissoes documentado como capacidade transversal tenant-scoped
- definido fluxo assincrono como prioridade arquitetural
- definido modelo conceitual com `commission_policy`, `commission_policy_version`, `commission_source_event`, `commission_basis`, `commission_calculation`, `commission_split`, `commission_statement`, `commission_settlement`, `commission_adjustment` e `commission_audit_event`
- documentado catalogo de tipos de comissao para fixo, percentual, margem, distancia, meta, produtividade, split, recorrencia, bonus, penalidade/estorno e regras hibridas
- documentadas verticais iniciais: servicos tecnicos em campo, guincho/assistencia veicular, vendas comerciais, representantes/parceiros, logistica/entregas, instalacao/manutencao e industria/producao por meta
- migrations, backend funcional, calculo real, UI, pagamento, fiscal, Flutter/mobile e refactors ficaram fora do escopo
- `experiments/` preservado fora do commit
- `agent-orchestration/**` preservado sem limpeza destrutiva

### Validacoes
- `git status --short`: arquivos documentais esperados + `experiments/` nao rastreado
- `npm run check`: OK
- `git diff --check`: OK
- `git status --short`: arquivos documentais esperados + `experiments/` nao rastreado

## 2026-06-11 - B-074 Commission Engine Foundation Backend

- branch usada: `feature/commission-engine-foundation`
- pre-condicao executada antes de alterar arquivos:
  - `git checkout main`: OK
  - `git pull --ff-only origin main`: fast-forward ate PR #73
  - PR #73 confirmada em `main` por `docs/commissions.md` e secao `commissions` em `docs/modules.md`
  - `git status --short` inicial: apenas `experiments/` nao rastreado

### Implementacao

- `prisma/schema.prisma` e migration nova adicionam tabelas de fundacao do Motor de Comissoes com `tenant_id`, indices, constraints e RLS
- `src/modules/core-saas/permissions/catalog.ts` e `prisma/seed.ts` adicionam catalogo RBAC `commissions:*`
- `src/modules/commissions/**` adiciona tipos, validadores, sanitizacao de payload, repositorio em memoria, repositorio Prisma lazy/RLS, servico, controller, DTOs e rotas
- `src/app.ts` registra o router de comissoes em `/api/v1`
- `tests/commissions-routes.test.ts` cobre RBAC, isolamento por tenant, idempotencia e sanitizacao
- `tests/core-saas.test.ts` atualizado para refletir o catalogo RBAC expandido

### Preservacao

- `agent-orchestration/**` atualizado apenas por append/merge aditivo
- `experiments/` permaneceu nao rastreado, nao stageado, nao apagado, nao movido e fora do commit
- calculo avancado, UI, Flutter/mobile, pagamento, fiscal, contabil, gateway e refactors nao relacionados ficaram fora do escopo

### Validacoes

- `npx prisma validate`: OK
- `npx prisma generate`: OK
- `npx prisma migrate deploy`: OK, migration `20260618000000_add_commission_engine_foundation` aplicada
- `npm run check`: OK
- `node --test --import tsx tests/commissions-routes.test.ts`: OK, 3/3
- `npm test`: OK, 15/15
- `npm run lint`: OK
- `npm run build`: OK
- `npm --prefix frontend run check`: OK
- `npm --prefix frontend run build`: OK
- `npm --prefix frontend run test:smoke`: OK, 28/28
- `docker compose ps`: `erp-postgres` e `erp-redis` healthy
- `npm run test:e2e`: primeira tentativa 10/11 com falha transitoria `net::ERR_NETWORK_CHANGED` no fluxo Platform Cloud Billing; rerun OK, 11/11
- `git diff --check`: OK

## 2026-06-11 - GD-001 Gestao de Despesas + Flutter Foundation

- branch usada: `feature/expense-management-flutter-foundation`
- pre-condicao executada antes de alterar arquivos:
  - `git checkout main`: OK
  - `git pull --ff-only origin main`: fast-forward ate PR #74
  - PR #74 confirmada em `main` por merge commit, `docs/commissions.md` e entrada de `commission_engine_foundation`
  - `git status --short` inicial: apenas `experiments/` nao rastreado
- documento base lido de `C:\Users\AMP\Downloads\plano_gestao_despesas_flutter_erp_techsolutions.docx`
- toolchain verificada: Node v20.19.5, npm 11.7.0, Flutter 3.41.6 e Dart 3.11.4
- documentacao criada:
  - `docs/expense-management.md`
  - `docs/mobile-flutter-app.md`
  - `docs/mobile-sync-contracts.md`
- `docs/modules.md` atualizado incrementalmente com `expense_management`
- arquivos historicos e de orquestracao preservados por append/merge aditivo
- app Flutter criado em `mobile/flutter_app` com plataformas Android/iOS
- implementados App Shell, roteamento, home modular, tela de Gestao de Despesas, tela de nova Prestação de Contas e diagnostico
- implementados modelos e servicos Dart:
  - `TenantContext`, `EnabledModule`, `BootstrapSession`
  - `PermissionResolver`, `ModuleResolver`
  - `ExpenseReport`, `ExpenseItem`, `Receipt`, `ExpenseAdvance`, `ExpensePolicy`, `PolicyViolation`
  - `ExpenseTotalsCalculator`, `ExpensePolicyEvaluator`
  - `SyncActionFactory`, `InMemorySyncQueueRepository`, `SyncEngine`
- dependencias Flutter adicionadas: `flutter_riverpod`, `go_router`, `dio`, `flutter_secure_storage`, `drift`, `sqlite3_flutter_libs`, `path_provider`, `uuid`, `crypto` e `equatable`
- OCR, PDF, camera, backend completo, pagamentos, fiscal, conciliacao, Figma final e publicacao mobile ficaram fora do escopo

### Validacoes

- `npm run check`: OK
- `npm run lint`: OK
- `npm test`: OK, 15/15
- `npm run build`: OK
- `npm --prefix frontend run check`: OK
- `npm --prefix frontend run build`: OK
- `npm --prefix frontend run test:smoke`: OK, 28/28
- `flutter pub get`: OK
- `flutter analyze`: OK
- `flutter test`: OK, 14/14

## 2026-06-11 - GD-002 Review Flutter Scaffold + Backend Foundation

- branch usada: `feature/expense-management-flutter-foundation`
- pre-condicao executada:
  - `git fetch origin`: OK
  - `git pull --ff-only origin feature/expense-management-flutter-foundation`: OK, branch ja atualizada
  - `git status --short`: apenas `experiments/` nao rastreado
  - confirmada existencia dos docs e do app Flutter da PR #75
  - confirmada ausencia inicial de `src/modules/expense-management/**`, migrations de despesas e modelos Prisma reais de expenses
- revisao Flutter:
  - caminho `mobile/flutter_app` documentado e aceitavel
  - Android/iOS mantidos versionados
  - sem token salvo em SQLite
  - secure storage planejado/documentado
  - modelos criticos com `tenantId`
  - testes existentes cobrem permission resolver, module resolver, totais, adiantamento, policy evaluator, tenant isolation, idempotencia e sync success/failure/conflict
  - OCR/PDF/camera permanecem fora desta fase
- validacoes Flutter da Etapa 1:
  - `flutter pub get`: OK
  - `flutter analyze`: OK
  - `flutter test`: OK, 14/14
  - `git diff --check`: OK
- schema/migration/RBAC:
  - criada migration `prisma/migrations/20260619000000_add_expense_management_foundation/migration.sql`
  - `prisma/schema.prisma` atualizado com `ExpensePolicy`, `ExpenseReport`, `ExpenseItem`, `ExpenseReceipt`, `ExpenseAdvance`, `ExpenseApprovalStep`, `ExpenseEvent` e `MobileActionReceipt`
  - RLS habilitado e forcado em todas as tabelas novas
  - `src/modules/core-saas/permissions/catalog.ts`, `prisma/seed.ts` e `tests/core-saas.test.ts` atualizados com permissoes `expense_*`
- backend implementado:
  - `src/modules/expense-management/**`
  - repositorio em memoria para testes
  - repositorio Prisma lazy/RLS para runtime persistente
  - endpoints `/api/v1/expense-policies`, `/api/v1/expense-categories`, `/api/v1/expense-reports`, `/api/v1/expense-reports/:reportId`, `/api/v1/expense-reports/:reportId/items`, `/api/v1/expense-reports/:reportId/submit` e `/api/v1/mobile/sync/expense-actions`
  - sync mobile idempotente por `tenant_id` + `client_action_id`
  - payload mobile nao define `tenant_id` efetivo e tecnico nao consegue criar Prestação de Contas para outro usuario via sync
- Flutter alinhado:
  - adicionadas constantes de contratos em `mobile/flutter_app/lib/core/network/api_contracts.dart`
  - testes Flutter agora cobrem endpoints, status e tipos de acao backend
- testes focados:
  - `tests/expense-management-routes.test.ts` cobre policies/categorias, RBAC, create/list, read_own, add item, recalculo, submit, sync idempotente, bloqueio sem permissao e tenant isolation

### Validacoes finais

- `npx prisma validate`: OK
- `npx prisma generate`: OK
- `npx prisma migrate deploy`: OK
- `npx prisma migrate status`: OK, schema up to date
- `npm run check`: OK
- `npm run lint`: OK
- `npm test`: OK, 15/15
- `npm run build`: OK
- `node --test --import tsx tests/expense-management-routes.test.ts`: OK, 6/6
- `npm --prefix frontend run check`: OK
- `npm --prefix frontend run build`: OK
- `npm --prefix frontend run test:smoke`: OK, 28/28
- `flutter analyze`: OK
- `flutter test`: OK, 17/17
- `docker compose ps`: `erp-postgres` e `erp-redis` healthy
- `npm run test:e2e`: OK, 11/11

### Fora de escopo mantido

- OCR real
- upload real de arquivos/recibos
- PDF oficial
- pagamento real
- fiscal/contabil
- conciliacao bancaria/cartao
- UI web
- approval avancado
- integracao direta com comissoes

## 2026-06-11 - B-076 Flutter Mobile UX Architecture + HTML Proposals

- branch usada: `docs/flutter-mobile-ux-html-proposals`
- pre-condicao executada antes de alterar arquivos:
  - `git status --short`: apenas `experiments/` nao rastreado
  - `git checkout main`: OK
  - `git pull --ff-only origin main`: fast-forward ate PR #75
  - `git status --short`: apenas `experiments/` nao rastreado
  - PR #75 confirmada por existencia de `mobile/flutter_app`, `docs/expense-management.md`, `docs/mobile-flutter-app.md`, `docs/mobile-sync-contracts.md` e `src/modules/expense-management`
- Flutter mapeado em `mobile/flutter_app`:
  - rotas atuais `/`, `/expenses`, `/expenses/new` e `/diagnostics`
  - app shell com `GoRouter`, `ThemeData`, `HomeScreen`, `ExpenseListScreen`, `NewExpenseReportScreen` e `DiagnosticsScreen`
  - fundacoes existentes para bootstrap, module resolver, permission resolver, contratos API, sync engine e modelos/servicos de despesas
- Figma:
  - encontrada referencia versionada em `frontend/links_Figma.md`, com M01-M12 e handoffs
  - nenhum acesso, criacao ou edicao automatica de Figma foi feita
- documentacao criada:
  - `docs/mobile-flutter-ux-architecture.md`
  - `docs/prototypes/flutter-mobile/index.html`
  - `docs/prototypes/flutter-mobile/styles.css`
  - `agent-orchestration/codex/comandos/B-076-flutter-mobile-ux-html-proposals.md`
- prototipo HTML cobre Login, Home operacional, lista priorizada de OS, detalhe de OS, execucao/checklist, captura de evidencia, mapa/rota/localizacao, sync/offline/conflito, aprovacao manager, Gestao de Despesas mobile, estoque do tecnico e perfil/permissoes
- fora de escopo mantido: implementacao Flutter final, backend, migrations, APIs, realtime/map real, OCR, PDF, upload, pagamento, fiscal, contabil, comissoes, Figma automatico e refactors nao relacionados
- preservacao: `agent-orchestration/**` atualizado somente por entradas aditivas; `experiments/` permaneceu nao rastreado e fora do commit

### Validacoes

- `git status --short`: arquivos esperados da fase + `experiments/` nao rastreado
- `flutter pub get`: OK
- `flutter analyze`: OK
- `flutter test`: OK, 17/17
- `npm run check`: OK
- validacao visual Playwright em `docs/prototypes/flutter-mobile/index.html`: OK, 12 telas, 12 links de navegacao, sem overflow horizontal em viewport 390x844; screenshot temporario salvo fora do repo
- `git diff --check`: OK

## 2026-06-11 - Flutter Mobile Operacional Local-First

- pedido do usuario: nao mexer em Git/merge/release, nao criar PR, nao fazer commit/push e transformar o Flutter existente em app operacional local-first
- preservacao inicial:
  - `git status --short` mostrava `docs/prototypes/flutter-mobile/index.html` e `docs/prototypes/flutter-mobile/styles.css` ja modificados, preservados sem edicao deliberada nesta rodada
  - `experiments/` permaneceu nao rastreado e fora do escopo
- leitura executada:
  - `AGENTS.md`
  - `PRODUCT_CONTEXT.md`
  - `RBAC_MATRIX.md`
  - `DESIGN_SYSTEM.md`
  - `COMPONENT_LIBRARY.md`
  - `docs/mobile-flutter-app.md`
  - `docs/mobile-sync-contracts.md`
  - `docs/expense-management.md`
  - `docs/mobile-flutter-ux-architecture.md`
  - `mobile/flutter_app/**`
  - `agent-orchestration/docs/status-geral.md`
  - `agent-orchestration/codex/log-execucao.md`

### Implementacao Flutter

- app shell:
  - `ErpMobileTheme`
  - `ErpScaffold`
  - rotas `/login`, `/`, `/profile`, `/diagnostics`, `/sync`, `/expenses`, `/expenses/new`, `/expenses/:reportId`, `/expenses/:reportId/items/new`, `/expenses/:reportId/submit`, `/work-orders`, `/field-map`, `/inventory` e `/approvals`
- bootstrap/permissoes:
  - `MobileBootstrapRepository`
  - `bootstrapSessionProvider`
  - `BootstrapSession` expandido com usuario, tenant role, tenants disponiveis, mobile policy, categorias e expense policy
  - `field_location:send` incluido para o modulo de field ops do mock
- componentes compartilhados:
  - `TenantContextBar`
  - `SyncStatusBanner`
  - `OperationalStatusChip`
  - `PermissionBlockedState`
  - `EmptyState`
  - `ErrorState`
  - `OfflineState`
  - `PolicyViolationBanner`
  - `ExpenseReportCard`
  - `ApprovalDecisionCard`
- Prestação de Contas/Gestao de Despesas:
  - `LocalExpenseRepository` local-first em memoria
  - criacao de Prestação de Contas com `expense_report.create`
  - adicao de item com `expense_item.create`
  - submissao com `expense_report.submit`
  - totais, adiantamento, A Receber/A Devolver/Sem diferenca
  - status Prestação de Contas, violacoes de politica e bloqueio visual de submit quando ha violacao bloqueante
  - estrutura para recibo/OCR/upload sem implementacao real
- sync/offline:
  - `sync_providers.dart`
  - fila em memoria consultavel por tenant
  - `/sync` e `/diagnostics` exibem acoes locais, retry/status e log sanitizado
  - conflitos permanecem explicitos e nao resolvidos silenciosamente
- placeholders:
  - OS, mapa/localizacao, estoque e aprovacoes agora sao telas Flutter reais com permission gate e mensagem operacional de modulo em preparacao

### Testes

- atualizados testes de module resolver e home
- criado `test/features/expenses/expense_screens_test.dart`
- cobertura adicionada para:
  - field ops exige `field_location:send`
  - lista Prestação de Contas renderiza dados locais e violacoes
  - detalhe Prestação de Contas renderiza totais e acao de item
  - novo item mostra placeholder estruturado de recibo
  - submit fica bloqueado quando politica possui violacao bloqueante

### Validacoes Executadas

- `flutter pub get`: OK
- `dart format .`: OK
- `flutter analyze`: OK
- `flutter test`: OK, 24/24
- `git diff --check`: OK

### Lacunas Para Flutter 100%

- bootstrap real via `GET /api/v1/mobile/bootstrap`
- persistencia local Drift/SQLite real em vez de memoria
- integracao HTTP real dos endpoints de despesas
- camera/upload/OCR/PDF reais
- resolucao visual completa de conflitos
- OS/checklist/mapa/estoque/aprovacoes completos
- auth Cognito/local real com secure storage de tokens

### Fora De Escopo Mantido

- backend, migrations, APIs, frontend React, Figma, pagamento, fiscal, contabil, comissoes, mapa real, GPS real, checklist completo e estoque completo
- nenhum commit, push ou PR foi feito

## 2026-06-11 - Flutter Prestação de Contas Persistencia Local-First

- pedido do usuario: continuar Flutter sem commit, push ou PR, evoluinda Prestação de Contas/Gestao de Despesas de fluxo em memoria para local-first real e robusto
- restricoes preservadas: sem backend, migrations, frontend React, Figma, pagamentos, fiscal, contabil, comissoes, mapa real, Git/PR/commit/push
- estado inicial preservado:
  - havia alteracoes pendentes da rodada Flutter anterior
  - `docs/prototypes/flutter-mobile/index.html` e `docs/prototypes/flutter-mobile/styles.css` ja apareciam modificados e nao foram tratados como escopo desta implementacao
  - `experiments/` permaneceu nao rastreado e fora do escopo

### Implementacao

- criada persistencia local de Prestação de Contas/itens:
  - `mobile/flutter_app/lib/features/expenses/data/expense_local_store.dart`
  - `ExpenseLocalStore`
  - `InMemoryExpenseLocalStore`
  - `JsonFileExpenseLocalStore`
  - codecs para `ExpenseReport`, `ExpenseItem`, `Receipt` e `ExpenseAdvance`
- criada persistencia local de fila de sync:
  - `mobile/flutter_app/lib/core/sync/sync_action_store.dart`
  - `SyncActionStore`
  - `InMemorySyncActionStore`
  - `JsonFileSyncActionStore`
  - `SyncActionCodec`
- `PersistentSyncQueueRepository` adicionado para persistir acoes de sync fora da memoria do processo
- `SyncAction` expandido com `lastErrorCode`, `lastSafeError` e `processedAt`
- `SyncEngine` agora marca sucesso com `processedAt`, falha segura com mensagem sanitizada e conflito com estado explicito
- `sync_providers.dart` passou a usar `JsonFileSyncActionStore.appDocuments()` e `PersistentSyncQueueRepository`
- `LocalExpenseRepository` passou a receber `ExpenseLocalStore`, carregar dados salvos, salvar mutacoes locais e preservar isolamento por `tenant_id`
- `LocalExpenseRepository` salva Prestação de Contas, item e submit antes de retornar a mutacao e antes/junto da fila de sync
- telas Home, lista Prestação de Contas, detalhe Prestação de Contas e submit carregam a store local antes de renderizar
- `/sync` agora mostra pendentes, processadas, erros, conflitos, ultimo sync, retry e erro seguro por acao
- `/diagnostics` mostra resumo seguro da fila e erros sanitizados, sem payload sensivel
- adicionada boundary HTTP futura:
  - `mobile/flutter_app/lib/features/expenses/data/expense_remote_api.dart`
  - contratos isolados para list/create/get/patch/item/submit sem chamada real nesta rodada

### Modelo Local

- cache de leitura: `ExpenseLocalStore`
- mutacoes pendentes/processadas/conflitos: `SyncActionStore`
- status local/remoto: `ExpenseReport.status`, `ExpenseReport.serverId`, `SyncAction.status`, `SyncAction.processedAt`
- idempotencia: `client_action_id`
- tenant isolation: `tenant_id` em Prestação de Contas, item, recibo e sync action
- dados sensiveis: tokens continuam fora da store local comum; diagnostico nao renderiza payload, token, path privado nem recibo bruto

### Testes

- `expense_persistence_test.dart`
  - persiste Prestação de Contas, item, submit e fila apos recriacao do repository
  - replay idempotente por `client_action_id`
  - isolamento entre tenants
- `expense_diagnostics_test.dart`
  - diagnostico nao renderiza token nem path privado do payload
- `expense_screens_test.dart`
  - detalhe Prestação de Contas carrega dados vindos de store local

### Validacoes Executadas

- `flutter pub get`: OK
- `dart format .`: OK
- `flutter analyze`: OK
- `flutter test`: OK, 29/29
- `git diff --check`: OK

### Lacunas Restantes

- trocar JSON local por Drift/SQLite real com schema mobile quando for oportuno
- integrar HTTP real com backend
- reconciliar cache remoto incremental e conflitos ricos
- persistir recibos/arquivos com criptografia/retenção adequada
- implementar camera/upload/OCR/PDF reais
- finalizar OS/checklists/mapa/estoque/aprovacoes

### Confirmacao

- nenhum commit, push ou PR foi feito

## 2026-06-11 - B-077 Flutter Prestação de Contas local-first: timestamps e testes obrigatorios

- branch ativa: `docs/flutter-mobile-ux-html-proposals`
- escopo: apenas `mobile/flutter_app/**`
- objetivo: evoluir a Prestação de Contas/Gestao de Despesas para local-first real com timestamps e cobertura de testes completa

### Implementado

- `ExpenseReport` recebeu `createdAt: DateTime?` e `updatedAt: DateTime?`
  - campos opcionais (nao quebram codigo e testes existentes)
  - codec `ExpenseReportCodec` atualizado para serializar/deserializar `created_at` e `updated_at` no JSON local
- `LocalExpenseRepository.createReport()` define `createdAt: DateTime.now().toUtc()`
- `LocalExpenseRepository.addItem()` define `updatedAt: DateTime.now().toUtc()` via `copyWith`
- `LocalExpenseRepository.submitReport()` define `updatedAt: DateTime.now().toUtc()` via `copyWith`
- criado `test/features/expenses/expense_local_first_test.dart` com 3 novos testes:
  1. `totals are consistent after report and items reload from local store` — cria Prestação de Contas + 2 itens, recria repository do mesmo arquivo, verifica `items.length == 2`, totais corretos e `createdAt`/`updatedAt` nao nulos
  2. `sync screen displays all queued actions with safe metadata` — seed de 2 acoes (pending + failed) no InMemorySyncActionStore, widget SyncScreen renderizado, verifica tipo, `client_action_id` e mensagem de erro segura exibidos
  3. `expense list disables create button when expense_report:create is missing` — override de `bootstrapSessionProvider` com sessao sem `expense_report:create`, verifica FAB com `onPressed == null`

### Validacoes Executadas

- `flutter pub get`: OK
- `dart format .`: OK (1 arquivo reformatado)
- `flutter analyze`: OK, sem issues
- `flutter test`: OK, 32/32 (era 29/29)
- `git diff --check`: OK, sem whitespace errors

### Arquivos Alterados

- `mobile/flutter_app/lib/features/expenses/domain/expense_models.dart`
- `mobile/flutter_app/lib/features/expenses/data/expense_local_store.dart`
- `mobile/flutter_app/lib/features/expenses/data/expense_repository.dart`
- `mobile/flutter_app/test/features/expenses/expense_local_first_test.dart` (criado)

### Confirmacao

- nenhum commit, push ou PR foi feito
- backend, frontend React, Figma, secrets e areas fora do escopo nao foram alterados

## 2026-06-12 - B-083 Polimento e hardening fora do Flutter

- branch ativa: nao alterada nesta tarefa
- escopo: backend, frontend React, testes e documentacao operacional aditiva
- restricao critica: `mobile/flutter_app/**` e Flutter nao foram alterados neste bloco

### Implementado

- otimizado `NotificationRecipientResolver` para selecionar destinatarios em uma unica passada, preservando ordem, deduplicacao, exclusao do ator, exclusao de inativos e limite de 20
- adicionado teste unitario cobrindo o limite seguro e as regras de selecao de destinatarios
- memoizadas colunas de `DispatchesTable` e `WorkOrdersTable`
- adicionados `aria-label` nos cards mobile de despachos e ordens de servico
- criado registro operacional `agent-orchestration/codex/comandos/B-083-non-flutter-code-polish-and-hardening.md`

### Validacoes Executadas

- baseline antes das alteracoes: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`: OK
- validacoes focadas apos alteracoes: `npm run check`, `node --test --import tsx tests/notifications.test.ts`, `npm --prefix frontend run check`: OK
- validacoes finais: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `git diff --check`: OK
- `docker compose ps`: falhou porque o daemon Docker Desktop nao estava disponivel em `npipe:////./pipe/dockerDesktopLinuxEngine`; `npm run test:e2e` nao foi executado por depender de Docker/PostgreSQL

### Confirmacao

- nenhum commit, push ou PR foi feito
- Flutter, Figma, secrets, migrations, schema e contratos publicos nao foram alterados

## 2026-06-11 - B-078 Flutter Prestação de Contas: base local-first de recibos/evidencias

### Implementado

- expandido modelo `Receipt` com novos campos: `serverId?`, `reportLocalId?`, `itemLocalId?`, `fileName`, `mimeType`, `sizeBytes`, `localReference?`, `sha256Hash?`, `captureSource`, `uploadStatus` (expandido + `conflict`), `ocrStatus`, `ocrExtractedFields?`, `userReviewedFields?`, `createdAt`, `updatedAt?`
- adicionados enums `ReceiptCaptureSource` (camera, gallery, file, manualPlaceholder) e `ReceiptOcrStatus` (notStarted, pending, reviewed, failed, unavailable)
- codec `ExpenseReportCodec` atualizado com backward compat para JSON antigo (`sha256` → `sha256Hash`, `pendingUpload` → `pending`)
- adicionado `ExpenseSyncActionTypes.receiptAttach = 'expense_receipt.attach'`
- adicionados ao `LocalExpenseRepository`: `attachReceiptPlaceholder`, `receiptsForItem`, `receiptsForReport`, `markReceiptUploadPending`, `markReceiptUploadFailed`, `markReceiptUploaded`, `markReceiptOcrReviewed`
- payload `_safeReceiptPayload` com somente metadata segura — sem `localReference`, token, base64 ou path privado
- nova rota `/expenses/:reportId/items/:itemId/receipts` no `router.dart`
- nova tela `ExpenseItemReceiptsScreen` com lista de recibos e botao de placeholder
- item cards no `ExpenseReportDetailScreen` agora navegam para a tela de recibos com `onTap`
- criado `test/features/expenses/expense_receipt_test.dart` com 8 testes obrigatorios

### Validacoes Executadas

- `dart format .`: OK (5 arquivos reformatados)
- `flutter analyze --no-fatal-warnings`: OK, sem issues
- `flutter test`: OK, 40/40 (era 32/32)
- `git diff --check`: OK, sem whitespace errors

### Arquivos Alterados

- `mobile/flutter_app/lib/features/expenses/domain/expense_models.dart`
- `mobile/flutter_app/lib/features/expenses/data/expense_local_store.dart`
- `mobile/flutter_app/lib/features/expenses/data/expense_repository.dart`
- `mobile/flutter_app/lib/core/network/api_contracts.dart`
- `mobile/flutter_app/lib/app/router.dart`
- `mobile/flutter_app/lib/features/expenses/ui/expense_report_detail_screen.dart`
- `mobile/flutter_app/lib/features/expenses/ui/expense_item_receipts_screen.dart` (criado)
- `mobile/flutter_app/test/features/expenses/expense_receipt_test.dart` (criado)

### Confirmacao

- nenhum commit, push ou PR foi feito

## 2026-06-12 - B-091 Connectivity Real + Profile Polish

### Implementado

**Parte A — ConnectivityBridge (plugin desacoplado)**

- `lib/core/network/connectivity_bridge.dart` (novo): interface `ConnectivitySource` com `statusStream` e `fetchCurrent()`; `ConnectivityPlusSource` implementacao real usando `connectivity_plus` 6.1.5 (mapeia `wifi/mobile/ethernet/vpn` → online, `none` → offline); `ManualConnectivitySource` para testes; `connectivitySourceProvider` e `connectivityBridgeProvider` que subscreve ao stream e aciona `networkStatusProvider.notifier.setStatus()` com `ref.onDispose`
- `pubspec.yaml`: adicionado `connectivity_plus: ^6.0.0` (resolvido para 6.1.5)
- `lib/app/app.dart`: `ref.watch(connectivityBridgeProvider)` montado uma vez no root para ciclo de vida do app

**Parte B — ProfileScreen polished**

- `lib/shared/ui/profile_screen.dart` (novo): tela completa com avatar (iniciais do email via `_initials()`), `TenantContextBar`, card de funcao/role, card de modo auth (`kIsRemoteAuth` → 'Remoto (producao)' / 'Local (desenvolvimento)'), card de status da sessao, card de expiracao do token (apenas formatted, sem valor), card de conectividade (icon + label), card de ultimo sync (de `autoSyncCoordinatorProvider`), permissoes, modulos, tenants disponiveis, botao "Sair" com cor de erro; `_ExpiredSessionView` para estado `AuthStatus.expired` com botao de re-login; sem exibicao de nenhum token, bearer ou valor sensivel

### Grupos de teste (b091) — 15 testes

- `ManualConnectivitySource` (3): fetchCurrent retorna status inicial; emit atualiza stream e fetchCurrent; multiplos emits entregues em ordem
- `connectivityBridgeProvider` (3): connectivitySourceProvider e overrideavel; bridge propaga evento de stream; auto sync dispara em offline→online via bridge
- `ProfileScreen` (9): mostra email e role do devBootstrapSession; mostra displayName do tenant; mostra modo auth 'Local (desenvolvimento)'; mostra 'Online'; mostra 'Offline'; nao renderiza valor do access token; logout aciona notifier.logout(); sessao expirada mostra aviso + botao login; avatar mostra iniciais corretas

### Arquivos criados

- `mobile/flutter_app/lib/core/network/connectivity_bridge.dart`
- `mobile/flutter_app/lib/shared/ui/profile_screen.dart`
- `mobile/flutter_app/test/features/b091_connectivity_profile_test.dart` (15 testes)

### Arquivos alterados

- `mobile/flutter_app/pubspec.yaml` (connectivity_plus adicionado)
- `mobile/flutter_app/lib/app/app.dart` (bridge montado no root)

### Validacoes

- `flutter test`: 258/258 passando (15 novos B-091, nenhuma regressao)
- `dart format .`: 3 arquivos reformatados
- `flutter analyze`: No issues found
- `git diff --check`: limpo
- sem commit, push ou PR
- backend, frontend React, Figma, secrets e areas fora do escopo nao foram alterados

## 2026-06-14 - B-098 Mobile Backend Contract Readiness

### Implementado

- worktree isolado: `ERP_Techsolutios-codex-b098`
- branch: `feature/mobile-backend-contract-readiness`
- `GET /api/v1/mobile/bootstrap` minimo no backend Node/TypeScript
- 404 JSON estavel para rotas `/api/v1` nao mapeadas
- testes de contrato mobile/backend em `tests/mobile-backend-contracts.test.ts`
- alinhamento do teste de permissao ao contrato atual de `requireAnyPermission`
- documentacao consolidada em `docs/mobile-backend-contract-readiness.md`

### Escopo preservado

- `mobile/flutter_app/**` nao foi alterado
- nenhum comando Flutter foi executado
- sem push, merge ou PR
- sem migration Prisma, secrets, `.env`, Docker/infra ou Figma

### Lacunas registradas

- sync mobile de OS, checklist e inventario ainda planejado
- evidencia generica/OS ainda planejada
- bootstrap expandido com catalogos versionados e feature flags ainda planejado

## 2026-06-14 - B-098A Mobile Bootstrap Expanded Contract

### Implementado

- branch: `feature/mobile-bootstrap-expanded-contract`
- base: `main` apos merge do PR #79
- `GET /api/v1/mobile/bootstrap` expandido mantendo campos minimos anteriores
- adicionados `contract`, `mobile_app`, `cache`, `feature_flags`, `mobile_policy` e `catalogs`
- catalogos diferenciam `implemented`, `planned`, `unavailable` e `partial`
- testes de contrato mobile cobrem sucesso, ausencia de contexto/permissao e estabilidade de 404 JSON

### Escopo preservado

- `mobile/flutter_app/**` nao foi alterado
- nenhum comando Flutter foi executado
- sem Figma, secrets, `.env`, migrations ou infra
- sync de OS nao foi implementado; permanece para B-098B

## 2026-06-14 - B-098B Mobile Work Order Actions Sync Contract

### Implementado

- worktree isolado: `ERP_Techsolutios-codex-b098b`
- branch: `feature/mobile-work-order-actions-sync`
- base: `origin/main` atualizada apos merge do PR #81
- criado contrato `POST /api/v1/mobile/sync/work-order-actions`
- suporte a lote de acoes `work_order.status_change` e `work_order.assign`
- tenant resolvido exclusivamente pelo ator autenticado/contexto backend
- idempotencia por tenant do ator + usuario do ator + `client_action_id`
- resposta separada em `accepted`, `rejected`, `conflicts` e `already_applied`
- bootstrap/catalogos atualizados para marcar `work_order_sync` como `implemented`
- testes de contrato mobile atualizados para aceite, replay idempotente, conflitos, rejeicoes e 404 planejado de checklist/inventario

### Escopo preservado

- `mobile/flutter_app/**` nao foi alterado
- nenhum comando Flutter foi executado
- sem Figma, secrets, `.env`, migrations ou infra
- checklist sync, inventario e evidencias genericas nao foram implementados

## 2026-06-14 - B-098C Mobile Checklist Actions Sync Contract

### Implementado

- branch: `feature/mobile-checklist-actions-sync-contract`
- base: `origin/main` atualizada com merge commit `082320aa218b49a3a10216591046c5b88e2effbb` do PR #82 confirmado
- criado contrato `POST /api/v1/mobile/sync/checklist-actions`
- suporte a lote de acoes `checklist.item_answer`, `checklist.item_note` e `checklist.complete`
- tenant resolvido exclusivamente pelo ator autenticado/contexto backend
- idempotencia por tenant do ator + usuario do ator + `client_action_id`
- resposta separada em `accepted`, `rejected`, `conflicts` e `already_applied`
- bootstrap/catalogos atualizados para marcar `checklist_sync` como `partial`
- testes de contrato mobile atualizados para aceite, replay idempotente, mismatch, rejeicoes, permissao por tipo e tenant spoofing

### Escopo preservado

- `mobile/flutter_app/**` nao foi alterado
- nenhum comando Flutter foi executado
- sem Figma, secrets, `.env`, migrations ou infra
- B-098D, inventario e evidencias genericas nao foram iniciados

## 2026-06-15 - B-098D Mobile Inventory Availability Contract

### Implementado

- worktree isolado: `ERP_Techsolutios-codex-b098d`
- branch: `feature/mobile-inventory-availability-contract`
- base: `origin/main` atualizada com merge commit `ce455dc40b7c860c3d4108f4e2ffdceb993cc2a6` do PR #84 confirmado
- criado contrato `GET /api/v1/mobile/inventory/availability`
- criado contrato `POST /api/v1/mobile/sync/inventory-actions`
- suporte a lote de acoes `inventory.reserve`, `inventory.consume` e `inventory.shortage_report`
- tenant resolvido exclusivamente pelo ator autenticado/contexto backend
- idempotencia por tenant do ator + usuario do ator + `client_action_id`
- resposta separada em `summary`, `accepted`, `rejected`, `conflicts` e `already_applied`
- bootstrap/catalogos atualizados para marcar `inventory_mobile` e `inventory_sync` como `partial`
- testes de contrato mobile atualizados para availability, permissoes, aceite, rejeicao, replay idempotente, mismatch e tenant spoofing

### Escopo preservado

- `mobile/flutter_app/**` nao foi alterado
- nenhum comando Flutter foi executado
- sem Figma, secrets, `.env`, migrations ou infra
- evidencias genericas/OS e B-098E nao foram iniciados

### Lacunas registradas

- persistencia duravel de availability/idempotencia em banco ou Redis
- reserva transacional multi-instancia
- relacionamento real entre inventario, armazem e Ordem de Servico
- permissoes granulares `inventory:reserve`/`inventory:consume` ainda nao existem no catalogo real; B-098D usa `inventory.manage`
- implementacao Flutter consumindo os endpoints B-098D permanece fora do escopo

## 2026-06-15 - KPI-DASHBOARD-001 Painel permanente de KPIs

### Implementado

- worktree isolado: `ERP_Techsolutios-codex-kpis-dashboard-001`
- branch: `feature/project-kpis-dashboard`
- base: `origin/main` atualizada apos merge do PR #85
- merge commit B-098D confirmado: `cd1f839e4435fbb2c2e94aa33549b7e47ea9fdbc`
- criada pasta permanente `Kpis/`
- criado dashboard HTML/CSS/JS puro:
  - `Kpis/index.html`
  - `Kpis/styles.css`
  - `Kpis/app.js`
  - `Kpis/kpis-history.md`
- painel registra KPIs consolidados, timeline B-098..B-098D, mapa de contratos, lacunas, riscos, previsoes e proximos blocos
- historico Markdown inicial criado com regra para atualizacao em blocos futuros

### Regra operacional permanente

- todo bloco futuro deve atualizar `Kpis/index.html`, `Kpis/app.js` e `Kpis/kpis-history.md`
- `Kpis/` passa a ser artefato permanente de acompanhamento do ERP Techsolutions
- `mobile/**` continua fora do escopo enquanto houver trabalho paralelo do Claude nessa area

### Escopo preservado

- `mobile/**` nao foi alterado
- nenhum comando Flutter foi executado
- sem Figma, secrets, `.env`, migrations ou infra
- B-098E e novos contratos funcionais nao foram iniciados

## 2026-06-15 - B-098E Mobile Evidence Contract

### Implementado

- worktree isolado: `C:\Users\AMP\Documents\GitHub\ERP_Techsolutios-codex-b098e`
- branch: `feature/mobile-evidence-contract`
- base: `origin/main` com merge commit `fc86ae1f70b21b7bdec02fa308b070cadca9b0a4` confirmado
- criado `POST /api/v1/mobile/sync/evidence-actions`
- suporte a fotos, assinaturas e observacoes de OS/campo
- tenant resolvido exclusivamente pelo ator autenticado
- idempotencia por tenant + usuario + `client_evidence_id`
- rejeicao de binario/base64/path local no contrato de metadados
- bootstrap, policy, catalogos, documentacao e `Kpis/` atualizados

### Validacoes

- `npm run check`: pass
- `npm run lint`: pass
- `npm test`: pass, 15/15
- testes focados mobile/backend + Core SaaS: pass, 18/18
- `npm run build`: pass
- frontend check: pass
- frontend smoke: pass, 28/28
- frontend build: pass
- Prisma validate com `DATABASE_URL` dummy: pass
- `git diff --check`: pass

### Escopo preservado

- nenhum arquivo `mobile/**` alterado
- nenhum comando Flutter executado
- sem Figma, secrets, `.env`, migrations ou infra
- B-098F nao iniciado

### Lacunas

- upload protegido, storage, antivirus e auditoria de arquivo
- persistencia duravel DB/Redis
- associacao definitiva com entidades e consumo Flutter
