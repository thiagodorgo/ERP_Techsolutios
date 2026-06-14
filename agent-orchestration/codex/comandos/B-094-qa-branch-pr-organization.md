# B-094 — QA Geral + Organizacao de Branch/PR

**Data:** 2026-06-13
**Status:** Concluido
**Natureza:** Auditoria, QA, organizacao — nenhuma feature alterada

## Objetivo

Auditar o estado acumulado do worktree (B-077 a B-093), validar saude do Flutter, classificar todos os arquivos por grupo, e definir estrategia segura de PRs sem executar commit/push/PR.

## Git — estado no inicio do bloco

```
Branch atual:  docs/flutter-mobile-ux-html-proposals
Ultimo commit: 167fe6a docs: map flutter ux with html screen proposals
git diff --check: CLEAN
```

## Classificacao do worktree

### Grupo 1 — Flutter rastreado modificado (23 arquivos, M)

Arquivos que existiam antes e foram evoluidos pelos blocos Flutter:

| Arquivo | Blocos |
|---------|--------|
| `mobile/flutter_app/lib/app/app.dart` | B-078+ |
| `mobile/flutter_app/lib/app/router.dart` | B-078+ |
| `mobile/flutter_app/lib/core/bootstrap/bootstrap_session.dart` | B-079+ |
| `mobile/flutter_app/lib/core/diagnostics/diagnostics_screen.dart` | B-083+ |
| `mobile/flutter_app/lib/core/network/api_contracts.dart` | B-082+ |
| `mobile/flutter_app/lib/core/sync/sync_engine.dart` | B-080+ |
| `mobile/flutter_app/lib/core/sync/sync_models.dart` | B-080+ |
| `mobile/flutter_app/lib/core/sync/sync_queue_repository.dart` | B-080+ |
| `mobile/flutter_app/lib/features/expenses/domain/expense_models.dart` | B-083+ |
| `mobile/flutter_app/lib/features/expenses/services/expense_policy_evaluator.dart` | B-083+ |
| `mobile/flutter_app/lib/features/expenses/services/expense_totals_calculator.dart` | B-083+ |
| `mobile/flutter_app/lib/features/expenses/ui/expense_list_screen.dart` | B-083+ |
| `mobile/flutter_app/lib/features/expenses/ui/new_expense_report_screen.dart` | B-083+ |
| `mobile/flutter_app/lib/main.dart` | B-078+ |
| `mobile/flutter_app/lib/shared/ui/home_screen.dart` | B-084+ |
| `mobile/flutter_app/pubspec.lock` | B-079+ |
| `mobile/flutter_app/pubspec.yaml` | B-079+ |
| `mobile/flutter_app/test/core/api_contracts_test.dart` | B-082+ |
| `mobile/flutter_app/test/core/resolvers_test.dart` | B-079+ |
| `mobile/flutter_app/test/core/sync_action_factory_test.dart` | B-080+ |
| `mobile/flutter_app/test/core/sync_engine_test.dart` | B-080+ |
| `mobile/flutter_app/test/features/expenses/expense_services_test.dart` | B-083+ |
| `mobile/flutter_app/test/home_screen_test.dart` | B-084+ |

### Grupo 2 — Flutter novo nao rastreado (lib — ~70 arquivos, ??)

Arquivos criados pelos blocos e ainda nao adicionados ao index git:

**Core:**
- `lib/core/auth/` (auth_notifier, auth_repository, auth_token_storage)
- `lib/core/bootstrap/` (bootstrap_codec, bootstrap_repository)
- `lib/core/config/app_config.dart`
- `lib/core/evidence/evidence_picker.dart`
- `lib/core/local_db/` (app_database, database_provider, drift_*_local_store x3)
- `lib/core/network/` (api_error, auth_interceptor, connectivity_bridge, connectivity_repository, http_client)
- `lib/core/sync/` (auto_sync_coordinator, sync_action_store, sync_providers, sync_replay_service, sync_summary)

**Features:**
- `lib/features/auth/` (auth_models, login_screen)
- `lib/features/checklists/` (data x3, domain, ui x5 + vehicle_asset_helper)
- `lib/features/expenses/data/` (expense_local_store, expense_remote_api, expense_repository)
- `lib/features/expenses/ui/` (expense_item_receipts_screen, expense_report_detail_screen, expense_submit_screen, new_expense_item_screen)
- `lib/features/inventory/` (data x2, domain, ui x3)
- `lib/features/work_orders/` (data x3, domain, ui x5)

**Shared:**
- `lib/shared/theme/erp_mobile_theme.dart`
- `lib/shared/ui/` (erp_components, erp_scaffold, module_placeholder_screen, profile_screen, sync_screen)

### Grupo 3 — Flutter testes novos nao rastreados (~20 arquivos, ??)

- `test/core/auth/auth_repository_test.dart`
- `test/core/local_db/drift_stores_test.dart`
- `test/core/sync/sync_replay_service_test.dart`
- `test/features/b083_polish_test.dart` a `b093_evidence_camera_gallery_test.dart` (11 arquivos)
- `test/features/expenses/` (expense_diagnostics, expense_local_first, expense_persistence, expense_receipt, expense_screens)
- `test/features/work_orders/work_order_test.dart`

### Grupo 4 — Flutter assets novos nao rastreados

- `assets/brand/` (3 PNG de logo)
- `assets/images/` (24 PNG de veiculos: sedan, pickup, van, truck, motorcycle, bus — 4 vistas cada)

### Grupo 5 — Agent-orchestration rastreado modificado (2 arquivos, M)

- `agent-orchestration/codex/log-execucao.md`
- `agent-orchestration/docs/status-geral.md`

### Grupo 6 — Agent-orchestration novos nao rastreados (19 arquivos, ??)

B-077 a B-093 + B-083-non-flutter + B-094 (criado neste bloco).

### Grupo 7 — Docs rastreados modificados (7 arquivos, M)

- `docs/expense-management.md`
- `docs/mobile-flutter-app.md`
- `docs/mobile-flutter-ux-architecture.md`
- `docs/mobile-sync-contracts.md`
- `docs/modules.md`
- `docs/prototypes/flutter-mobile/index.html` (+1857 linhas)
- `docs/prototypes/flutter-mobile/styles.css` (+1435 linhas)

### Grupo 8 — Docs novo nao rastreado

- `docs/assets-images.md`

### Grupo 9 — Backend rastreado modificado (4 arquivos, M)

- `prisma/seed.ts`
- `src/modules/notifications/notification.recipient-resolver.ts`
- `tests/expense-management-routes.test.ts`
- `tests/notifications.test.ts`

### Grupo 10 — Frontend React rastreado modificado (2 arquivos, M)

- `frontend/src/modules/operations/dispatches/components/DispatchesTable.tsx`
- `frontend/src/modules/work-orders/components/WorkOrdersTable.tsx`

### Grupo 11 — Outros rastreados modificados

- `README.md`

### Grupo 12 — Nao rastreados fora do escopo Flutter

- `experiments/frontend-v2/**` — nao entra em nenhum PR
- `src/brand/`, `src/config/icons.tsx`, `src/types/` — avaliar separadamente

## QA Flutter — resultados

| Verificacao | Resultado |
|-------------|-----------|
| `flutter pub get` | OK (15 outdated nao breaking) |
| `dart format --set-exit-if-changed .` | **0 arquivos alterados** — CLEAN |
| `flutter analyze --no-pub` | **No issues found** |
| `flutter test --no-pub` | **280/280 passando** |
| `git diff --check` (pos-QA) | **CLEAN** |

## Estrategia de PRs

### PR A — Flutter Mobile Foundation (prioridade maxima)

**Objetivo:** Integrar toda a fundacao Flutter mobile ao repositorio principal.

**Arquivos:**
- `mobile/flutter_app/**` (todos os M + todos os ??)
- Inclui lib, test, assets, pubspec.yaml, pubspec.lock

**Volume:** ~23 M + ~100 ?? = ~123 arquivos

**Validacao pre-merge:**
```
flutter pub get
dart format --set-exit-if-changed .
flutter analyze
flutter test
git diff --check
```

**Riscos:**
- PR grande demais se nao squashado
- Necessidade de teste em emulador Android/iOS real antes do merge
- pubspec.lock difere de um ambiente para outro se versoes divergirem

**Ordem:** Primeiro. Blocos A e B podem ir juntos.

---

### PR B — Agent Orchestration + Codex

**Objetivo:** Registrar historico operacional dos blocos B-077 a B-094.

**Arquivos:**
- `agent-orchestration/codex/log-execucao.md` (M)
- `agent-orchestration/docs/status-geral.md` (M)
- `agent-orchestration/codex/comandos/B-077 a B-094` (??)

**Volume:** 2 M + 20 ?? = 22 arquivos

**Riscos:** Baixo. Apenas documentacao operacional.

**Ordem:** Pode ir junto com PR A ou logo apos.

---

### PR C — Docs mobile

**Objetivo:** Atualizar documentacao do modulo mobile.

**Arquivos:**
- `docs/mobile-flutter-app.md`
- `docs/mobile-flutter-ux-architecture.md`
- `docs/mobile-sync-contracts.md`
- `docs/expense-management.md`
- `docs/modules.md`
- `docs/assets-images.md` (??)

**Riscos:** Baixo. Sem dependencia tecnica.

**Ordem:** Pode ir junto com PR A ou separado.

---

### PR D — Docs / Prototipo HTML

**Objetivo:** Registrar prototipos UX HTML da etapa de mapeamento.

**Arquivos:**
- `docs/prototypes/flutter-mobile/index.html`
- `docs/prototypes/flutter-mobile/styles.css`

**Riscos:** Arquivos grandes (1857 e 1435 linhas de diff). Considerar PR separado para nao poluir revisao do Flutter.

**Ordem:** Terceiro ou quarto. Nao bloqueia nada.

---

### PR E — Backend/Frontend polish

**Objetivo:** Integrar melhorias pontuais de backend e React de blocos anteriores.

**Arquivos:**
- `src/modules/notifications/notification.recipient-resolver.ts`
- `tests/notifications.test.ts`
- `tests/expense-management-routes.test.ts`
- `frontend/src/modules/operations/dispatches/components/DispatchesTable.tsx`
- `frontend/src/modules/work-orders/components/WorkOrdersTable.tsx`
- `prisma/seed.ts`
- `README.md`

**Validacao:**
```
npm run test (ou yarn test) -- testes backend
npm run build -- frontend
```

**Riscos:** Precisa de validacao de CI/CD proprio. Nao misturar com Flutter.

**Ordem:** Independente. Pode ir antes ou depois de PR A.

---

### Fora de qualquer PR

- `experiments/` — nunca commitar
- `src/brand/`, `src/config/icons.tsx`, `src/types/` — avaliar necessidade antes de incluir

## Status funcional por modulo

| Modulo | Status | Testes | Lacunas | Demo? |
|--------|--------|--------|---------|-------|
| Auth/Login | Local com backend real (JWT + refresh) | b089, b090 | Sem biometria, sem SSO | Parcial (funciona, backend precisa estar up) |
| Profile | Exibicao + logout | b091 | Sem edicao de dados | Sim |
| Connectivity | Bridge ConnectivityStatus | b091 | — | Sim |
| Auto Sync | SyncEngine + AutoSyncCoordinator + replay | b090b, sync_engine | Sem backoff exponencial | Parcial |
| RDV/Recibos | Create/edit/submit + receipts com picker real | expense_* | Upload real ao servidor | Parcial |
| OS | List, detail, execute, transitions, complete | work_order_test, b092 | Pull de OS do servidor | Sim (local) |
| Checklist | Schema, run, todos os fields, before-after com picker | b085-b092 | Pull de schema do servidor | Sim (local) |
| Evidencias | Camera/galeria → metadata seguro em OS+checklist+RDV | b093 | Upload real | Parcial |
| Sync screen | UI de status de sync | (indireta) | Historico offline | Sim |
| Diagnostics | Info de sessao, tenant, sync | b091 | — | Sim |
| Approvals | Request de aprovacao + tela | work_order_test | Fluxo de aprovacao pelo servidor | Parcial |
| Inventory | List, entry, exit | b086 | Sync de estoque | Parcial |
| Field map | Placeholder | 0 | GPS real, mapa, navegacao | Nao |

## KPIs atualizados

| KPI | Valor |
|-----|-------|
| Flutter demonstravel | Sim (sem emulador real validado) |
| Flutter V-0.01 vendavel | Parcial (~60%) |
| OS | Funcional local, sem backend pull |
| Checklist | Funcional local, sem backend pull |
| Evidencias | Metadata seguro, sem upload real |
| RDV | Funcional local, sem upload |
| Auth | Funcional com backend real |
| Connectivity | Funcional |
| Sync | Engine OK, sem replay real com backend |
| QA / test coverage | 280/280, analyze clean, format clean |
| Git / PR readiness | Branch errada, arquivos nao staged — exige organizacao antes do merge |

## Estimativas

| Atividade | Horas |
|-----------|-------|
| PR limpo (staging, squash, descricao) | 2-4h |
| Setup emulador + smoke test visual | 1-2h |
| Flutter demonstravel com backend mockado | 3-6h |
| Flutter V-0.01 vendavel (upload real, mapa, backend sync) | 40-80h |

| Ritmo | Para PR limpo | Para demo | Para V-0.01 |
|-------|--------------|-----------|-------------|
| 2h/dia | 1-2 dias | 2-3 dias | 20-40 dias |
| 4h/dia | 1 dia | 1-2 dias | 10-20 dias |
| 6h/dia | 1 dia | 1 dia | 7-14 dias |
| 8h/dia | < 1 dia | 1 dia | 5-10 dias |

## Riscos reais

1. **Branch errada**: `docs/flutter-mobile-ux-html-proposals` carrega todo o trabalho Flutter — nome sugere apenas docs/prototipo, nao fundacao mobile
2. **Worktree grande e sujo**: ~123 arquivos Flutter para staging manual; risco de esquecer arquivo critico no PR
3. **Arquivos `??` dominam o escopo**: maioria dos arquivos Flutter novos nao esta rastreada — git add manual por diretorio e necessario
4. **Backend/frontend misturados**: `prisma/seed.ts`, `frontend/**`, `src/**` no mesmo worktree sem separacao de branch
5. **Prototipos HTML grandes**: index.html e styles.css com >1800 linhas de diff podem inflar revisao do PR Flutter
6. **Sem teste em emulador real**: 280 testes unit/widget passam mas nenhum teste de integracao com camera real, Drift em dispositivo, ou HTTP real foi executado
7. **Backend sem endpoints de sync real**: checklist/OS/evidencia sincronizam apenas localmente — qualquer demo ao vivo exige backend up com contratos implementados
8. **`experiments/` nao rastreado mas presente**: deve ser ignorado em qualquer git add / PR

## Proximo bloco recomendado

**B-095 — Preparacao de Branch + PR Flutter** (nao implementa feature):
- Criar branch limpa `feature/flutter-mobile-foundation` a partir de `main`
- Mover worktree para nova branch (sem perder historico)
- Montar PR A (Flutter) bem dividido em grupos de arquivos logicos
- Confirmar que PR D (Docs/Prototipo) fica separado

**Ou**, se preferir feature:
**B-095 — Upload Real de Evidencias**: conectar `ImagePickerEvidenceService` a endpoint real de upload multipart (S3 presigned URL ou proxy), completando o loop de evidencias.

## Constraints mantidos

- sem commit, sem push, sem PR
- sem branch criada ou trocada
- sem alteracao em Flutter, backend, React, docs/prototipos
- sem formatacao, sem refatoracao
- apenas criacao aditiva do registro B-094 em agent-orchestration/
