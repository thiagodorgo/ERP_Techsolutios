# B-094 — QA Geral + Organizacao do App Flutter e Preparacao de PR

**Data:** 2026-06-13
**Status:** Concluido
**Natureza:** Auditoria, QA, classificacao de worktree, estrategia de PR — nenhuma feature implementada

---

## Objetivo

Auditar o estado completo do worktree (B-077 a B-093), executar QA Flutter real com comandos verificados, classificar todos os arquivos por grupo, e definir estrategia segura de PRs sem executar nenhuma operacao Git destrutiva.

---

## Estado Git no inicio do bloco

```
Branch atual:  docs/flutter-mobile-ux-html-proposals
Ultimo commit: 167fe6a docs: map flutter ux with html screen proposals
git diff --check (pre-QA): CLEAN
```

---

## Comandos executados

```
# Git inicial
git branch --show-current
git log -1 --oneline
git status --short
git diff --check
git diff --stat
git diff --name-only
git ls-files --others --exclude-standard
git ls-files mobile/flutter_app
git diff --name-only -- mobile/flutter_app/pubspec.lock

# Flutter QA
cd mobile/flutter_app
flutter pub get
dart format --set-exit-if-changed .
flutter analyze --no-pub
flutter test --no-pub

# Git pos-QA
git diff --check
git diff --name-only -- mobile/flutter_app/pubspec.lock
```

---

## Resultado QA Flutter

| Verificacao | Resultado | Detalhe |
|-------------|-----------|---------|
| `flutter pub get` | OK | 15 packages outdated — nao breaking |
| `dart format --set-exit-if-changed .` | **CLEAN** | 106 arquivos verificados, 0 alterados |
| `flutter analyze --no-pub` | **No issues found** | 0 warnings, 0 errors (136.6s) |
| `flutter test --no-pub` | **280/280 passando** | 0 falhas, 0 skip |
| `git diff --check` (pos-QA) | **CLEAN** | pub get nao alterou conteudo do pubspec.lock |

**pubspec.lock:** ja constava como M no worktree antes deste bloco. pub get nao gerou nova alteracao no arquivo.

---

## Classificacao completa do worktree

### Grupo 1 — Flutter lib rastreado modificado (M) — 15 arquivos

| Arquivo | Blocos principais | PR Flutter? | Risco |
|---------|------------------|-------------|-------|
| `lib/app/app.dart` | B-078+ | **Sim** | Baixo |
| `lib/app/router.dart` | B-078+ | **Sim** | Baixo |
| `lib/core/bootstrap/bootstrap_session.dart` | B-079+ | **Sim** | Baixo |
| `lib/core/diagnostics/diagnostics_screen.dart` | B-083+ | **Sim** | Baixo |
| `lib/core/network/api_contracts.dart` | B-082+ | **Sim** | Baixo |
| `lib/core/sync/sync_engine.dart` | B-080+ | **Sim** | Baixo |
| `lib/core/sync/sync_models.dart` | B-080+ | **Sim** | Baixo |
| `lib/core/sync/sync_queue_repository.dart` | B-080+ | **Sim** | Baixo |
| `lib/features/expenses/domain/expense_models.dart` | B-083+ | **Sim** | Baixo |
| `lib/features/expenses/services/expense_policy_evaluator.dart` | B-083+ | **Sim** | Baixo |
| `lib/features/expenses/services/expense_totals_calculator.dart` | B-083+ | **Sim** | Baixo |
| `lib/features/expenses/ui/expense_list_screen.dart` | B-083+ | **Sim** | Baixo |
| `lib/features/expenses/ui/new_expense_report_screen.dart` | B-083+ | **Sim** | Baixo |
| `lib/main.dart` | B-078+ | **Sim** | Baixo |
| `lib/shared/ui/home_screen.dart` | B-084+ | **Sim** | Baixo |

### Grupo 2 — Flutter pubspec rastreado modificado (M) — 2 arquivos

| Arquivo | Notas | PR Flutter? |
|---------|-------|-------------|
| `pubspec.yaml` | image_picker adicionado em B-093 | **Sim** |
| `pubspec.lock` | Atualizado em B-079 (Drift/SQLite) e incrementado em B-093 | **Sim** |

### Grupo 3 — Flutter testes rastreados modificados (M) — 6 arquivos

| Arquivo | Blocos | PR Flutter? |
|---------|--------|-------------|
| `test/core/api_contracts_test.dart` | B-082+ | **Sim** |
| `test/core/resolvers_test.dart` | B-079+ | **Sim** |
| `test/core/sync_action_factory_test.dart` | B-080+ | **Sim** |
| `test/core/sync_engine_test.dart` | B-080+ | **Sim** |
| `test/features/expenses/expense_services_test.dart` | B-083+ | **Sim** |
| `test/home_screen_test.dart` | B-084+ | **Sim** |

### Grupo 4 — Flutter lib novo nao rastreado (??) — ~75 arquivos

**Core auth (3):**
- `lib/core/auth/auth_notifier.dart` — B-089
- `lib/core/auth/auth_repository.dart` — B-089
- `lib/core/auth/auth_token_storage.dart` — B-089

**Core bootstrap (2):**
- `lib/core/bootstrap/bootstrap_codec.dart` — B-079
- `lib/core/bootstrap/bootstrap_repository.dart` — B-079

**Core config (1):**
- `lib/core/config/app_config.dart` — B-079

**Core evidence (1):**
- `lib/core/evidence/evidence_picker.dart` — B-093

**Core local_db (5):**
- `lib/core/local_db/app_database.dart` — B-079
- `lib/core/local_db/database_provider.dart` — B-079
- `lib/core/local_db/drift_checklist_local_store.dart` — B-087
- `lib/core/local_db/drift_expense_local_store.dart` — B-079
- `lib/core/local_db/drift_sync_action_store.dart` — B-079

**Core network (5):**
- `lib/core/network/api_error.dart` — B-082
- `lib/core/network/auth_interceptor.dart` — B-090
- `lib/core/network/connectivity_bridge.dart` — B-091
- `lib/core/network/connectivity_repository.dart` — B-091
- `lib/core/network/http_client.dart` — B-089

**Core sync (5):**
- `lib/core/sync/auto_sync_coordinator.dart` — B-090b
- `lib/core/sync/sync_action_store.dart` — B-079
- `lib/core/sync/sync_providers.dart` — B-090b
- `lib/core/sync/sync_replay_service.dart` — B-088
- `lib/core/sync/sync_summary.dart` — B-090b

**Features auth (2):**
- `lib/features/auth/auth_models.dart` — B-081
- `lib/features/auth/login_screen.dart` — B-081

**Features checklists (9):**
- `lib/features/checklists/data/checklist_local_store.dart` — B-085
- `lib/features/checklists/data/checklist_remote_api.dart` — B-089
- `lib/features/checklists/data/checklist_repository.dart` — B-085
- `lib/features/checklists/domain/checklist_models.dart` — B-085
- `lib/features/checklists/ui/checklist_acknowledgement_screen.dart` — B-088
- `lib/features/checklists/ui/checklist_available_screen.dart` — B-085
- `lib/features/checklists/ui/checklist_damage_map_screen.dart` — B-087
- `lib/features/checklists/ui/checklist_run_screen.dart` — B-087
- `lib/features/checklists/ui/vehicle_asset_helper.dart` — B-087

**Features expenses/data (3):**
- `lib/features/expenses/data/expense_local_store.dart` — B-079
- `lib/features/expenses/data/expense_remote_api.dart` — B-089
- `lib/features/expenses/data/expense_repository.dart` — B-083

**Features expenses/ui novos (4):**
- `lib/features/expenses/ui/expense_item_receipts_screen.dart` — B-083/B-093
- `lib/features/expenses/ui/expense_report_detail_screen.dart` — B-083
- `lib/features/expenses/ui/expense_submit_screen.dart` — B-083
- `lib/features/expenses/ui/new_expense_item_screen.dart` — B-083

**Features inventory (6):**
- `lib/features/inventory/data/inventory_local_store.dart` — B-086
- `lib/features/inventory/data/inventory_repository.dart` — B-086
- `lib/features/inventory/domain/inventory_models.dart` — B-086
- `lib/features/inventory/ui/inventory_list_screen.dart` — B-086
- `lib/features/inventory/ui/stock_entry_screen.dart` — B-086
- `lib/features/inventory/ui/stock_exit_screen.dart` — B-086

**Features work_orders (9):**
- `lib/features/work_orders/data/work_order_local_store.dart` — B-082
- `lib/features/work_orders/data/work_order_remote_api.dart` — B-089
- `lib/features/work_orders/data/work_order_repository.dart` — B-082
- `lib/features/work_orders/domain/work_order_models.dart` — B-082
- `lib/features/work_orders/ui/new_work_order_screen.dart` — B-082
- `lib/features/work_orders/ui/work_order_approval_request_screen.dart` — B-092
- `lib/features/work_orders/ui/work_order_detail_screen.dart` — B-082
- `lib/features/work_orders/ui/work_order_execute_screen.dart` — B-082/B-093
- `lib/features/work_orders/ui/work_order_list_screen.dart` — B-082

**Shared (6):**
- `lib/shared/theme/erp_mobile_theme.dart` — B-084
- `lib/shared/ui/erp_components.dart` — B-084
- `lib/shared/ui/erp_scaffold.dart` — B-084
- `lib/shared/ui/module_placeholder_screen.dart` — B-082
- `lib/shared/ui/profile_screen.dart` — B-091
- `lib/shared/ui/sync_screen.dart` — B-080

Todos: PR Flutter = **Sim**

### Grupo 5 — Flutter testes novos nao rastreados (??) — 19 arquivos

| Arquivo | Bloco | PR Flutter? |
|---------|-------|-------------|
| `test/core/auth/auth_repository_test.dart` | B-089 | **Sim** |
| `test/core/local_db/drift_stores_test.dart` | B-079 | **Sim** |
| `test/core/sync/sync_replay_service_test.dart` | B-088 | **Sim** |
| `test/features/b083_polish_test.dart` | B-083 | **Sim** |
| `test/features/b084_home_stats_test.dart` | B-084 | **Sim** |
| `test/features/b085_checklist_foundation_test.dart` | B-085 | **Sim** |
| `test/features/b086_inventory_foundation_test.dart` | B-086 | **Sim** |
| `test/features/b087_checklist_persistence_test.dart` | B-087 | **Sim** |
| `test/features/b088_checklist_sync_replay_test.dart` | B-088 | **Sim** |
| `test/features/b089_auth_http_checklist_test.dart` | B-089 | **Sim** |
| `test/features/b090_auth_production_token_refresh_test.dart` | B-090 | **Sim** |
| `test/features/b090b_offline_auto_sync_test.dart` | B-090b | **Sim** |
| `test/features/b091_connectivity_profile_test.dart` | B-091 | **Sim** |
| `test/features/b092_os_checklist_completion_test.dart` | B-092 | **Sim** |
| `test/features/b093_evidence_camera_gallery_test.dart` | B-093 | **Sim** |
| `test/features/expenses/expense_diagnostics_test.dart` | B-083 | **Sim** |
| `test/features/expenses/expense_local_first_test.dart` | B-083 | **Sim** |
| `test/features/expenses/expense_persistence_test.dart` | B-079 | **Sim** |
| `test/features/expenses/expense_receipt_test.dart` | B-083 | **Sim** |
| `test/features/expenses/expense_screens_test.dart` | B-083 | **Sim** |
| `test/features/work_orders/work_order_test.dart` | B-082 | **Sim** |

### Grupo 6 — Flutter assets novos nao rastreados (??) — 27 arquivos

- `assets/brand/`: 3 PNG (techsolutions-logo-icon, techsolutions-logo-main, techsolutions-logo-sidebar)
- `assets/images/`: 24 PNG (sedan/pickup/van/truck/motorcycle/bus x 4 vistas cada)

PR Flutter: **Sim** (necessarios para damageMap e identidade visual)

### Grupo 7 — Agent-orchestration rastreado modificado (M) — 2 arquivos

- `agent-orchestration/codex/log-execucao.md`
- `agent-orchestration/docs/status-geral.md`

PR: **PR B (agent-orchestration)**, nao entrar no PR Flutter

### Grupo 8 — Agent-orchestration novo nao rastreado (??) — 20 arquivos

Comandos B-077 a B-094 (incluindo este arquivo).

PR: **PR B (agent-orchestration)**

### Grupo 9 — Docs/prototipo rastreado modificado (M) — 7 arquivos

| Arquivo | PR recomendado |
|---------|---------------|
| `docs/expense-management.md` | **PR C (Docs mobile)** |
| `docs/mobile-flutter-app.md` | **PR C** |
| `docs/mobile-flutter-ux-architecture.md` | **PR C** |
| `docs/mobile-sync-contracts.md` | **PR C** |
| `docs/modules.md` | **PR C** |
| `docs/prototypes/flutter-mobile/index.html` | **PR D (Prototipo HTML)** |
| `docs/prototypes/flutter-mobile/styles.css` | **PR D** |

### Grupo 10 — Docs novos nao rastreados (??) — 1 arquivo

- `docs/assets-images.md` — **PR C**

### Grupo 11 — Backend rastreado modificado (M) — 4 arquivos

- `prisma/seed.ts` — **PR E (Backend polish)**
- `src/modules/notifications/notification.recipient-resolver.ts` — **PR E**
- `tests/expense-management-routes.test.ts` — **PR E**
- `tests/notifications.test.ts` — **PR E**

### Grupo 12 — Frontend React rastreado modificado (M) — 2 arquivos

- `frontend/src/modules/operations/dispatches/components/DispatchesTable.tsx` — **PR E**
- `frontend/src/modules/work-orders/components/WorkOrdersTable.tsx` — **PR E**

### Grupo 13 — Outros rastreados modificados — 1 arquivo

- `README.md` — **PR E ou PR B**

### Grupo 14 — Nao rastreados fora de scope Flutter — 4 grupos

- `experiments/` — **Nao entra em nenhum PR. Nunca.**
- `src/brand/` — Avaliar antes de adicionar
- `src/config/icons.tsx` — Deveria estar em frontend/src/; **PR E ou PR futuro de frontend**
- `src/types/` — Avaliar antes de adicionar

---

## Inventario funcional Flutter por modulo

| Modulo | Status | Rotas | Testes | Lacunas | Demo? | Producao? |
|--------|--------|-------|--------|---------|-------|-----------|
| Auth/Login | Pronto (dev/local) | /login | b089, b090 (16 testes) | Backend real em prod | Parcial | Nao |
| Bootstrap/Session | Pronto | (boot) | auth, resolvers | — | Sim | Nao |
| Profile | Pronto | /profile | b091 (7 testes) | Sem edicao de dados | Sim | Nao |
| Connectivity | Pronto | — | b091 (6 testes) | — | Sim | Nao |
| Auto sync | Pronto (local) | — | b090b (11 testes) | Sem backoff exp. | Parcial | Nao |
| RDV/Despesas | Pronto (local-first) | /expenses/** | expense_* (20+ testes) | Upload real | Parcial | Nao |
| Recibos/Evidencias RDV | Pronto | .../receipts | expense_receipt (9 testes) | Upload S3 real | Parcial | Nao |
| OS | Pronto (local-first) | /work-orders/** | work_order_test (17 testes) | Pull servidor | Sim (local) | Nao |
| Checklist configuravel | Pronto | /checklists/** | b085 (11 testes) | Pull servidor | Sim (local) | Nao |
| Checklist persistence Drift | Pronto | — | drift_stores (8 testes), b087 | — | Sim | Nao |
| Checklist sync replay | Pronto | — | b088, sync_replay (8 testes) | — | Sim | Nao |
| Evidencias camera/galeria | Pronto | (embutido) | b093 (12 testes) | Upload multipart real | Parcial | Nao |
| WorkOrder evidence | Pronto (metadata) | (embutido) | b093 (t05-t09) | Upload real | Parcial | Nao |
| Sync screen | Pronto | /sync | (indireta) | Historico offline | Sim | Nao |
| Diagnostics | Pronto | /diagnostics | b091 | — | Sim | Nao |
| Approvals | Parcial | /work-orders/:id/approval-request | work_order_test (t10-t11) | Fluxo server | Parcial | Nao |
| Inventory | Pronto (local-first) | /inventory/** | b086 (14 testes) | Sync server | Sim (local) | Nao |
| Field map | Placeholder | /field-map | 0 | GPS real, mapa, backend | Nao | Nao |

---

## Estrategia de divisao de PRs

### PR A — Flutter Mobile App Foundation (prioridade maxima)

**Objetivo:** Integrar toda a fundacao Flutter mobile ao repositorio principal.

**Arquivos:**
- `mobile/flutter_app/lib/**` (todos os M e ??)
- `mobile/flutter_app/test/**` (todos os M e ??)
- `mobile/flutter_app/assets/**` (??)
- `mobile/flutter_app/pubspec.yaml` (M)
- `mobile/flutter_app/pubspec.lock` (M)
- `mobile/flutter_app/android/**`, `mobile/flutter_app/ios/**` (rastreados — verificar se houve mudancas)
- `mobile/flutter_app/.gitignore`, `mobile/flutter_app/analysis_options.yaml` etc.

**Volume estimado:** ~23 M + ~116 ?? = ~139 arquivos de codigo/teste/assets

**Excluir deste PR:**
- `docs/prototypes/**` (vai para PR D)
- `agent-orchestration/**` (vai para PR B)
- Backend, frontend React, README

**Validacao pre-merge:**
```
flutter pub get
dart format --set-exit-if-changed .
flutter analyze
flutter test
git diff --check
```

**Ordem:** Primeiro. Bloqueante para os outros.

**Tamanho estimado:** Grande (~139 arquivos). Avaliar se deve ser draft inicialmente.

**Draft ou normal:** Recomendado como draft primeiro para QA do revisor, despois promovido.

**Riscos:**
- PR grande: ~6500+ linhas de diff no subset rastreado
- ~116 arquivos nao rastreados exigem `git add mobile/flutter_app/` em bloco cuidadoso
- pubspec.lock pode divergir entre ambientes de CI
- Sem teste em emulador real validado

---

### PR B — Agent Orchestration + Codex

**Objetivo:** Registrar historico operacional dos blocos B-077 a B-094.

**Arquivos:**
- `agent-orchestration/codex/log-execucao.md` (M)
- `agent-orchestration/docs/status-geral.md` (M)
- `agent-orchestration/codex/comandos/B-077` a `B-094` (??)

**Volume:** 2 M + 20 ?? = 22 arquivos

**Validacao:** Apenas revisao de conteudo. Sem CI tecnico.

**Ordem:** Pode ir junto com PR A ou logo apos.

**Draft ou normal:** Normal (sem risco tecnico).

---

### PR C — Docs mobile

**Objetivo:** Atualizar documentacao dos modulos mobile.

**Arquivos:**
- `docs/expense-management.md`
- `docs/mobile-flutter-app.md`
- `docs/mobile-flutter-ux-architecture.md`
- `docs/mobile-sync-contracts.md`
- `docs/modules.md`
- `docs/assets-images.md` (??)

**Volume:** 5 M + 1 ?? = 6 arquivos

**Validacao:** Revisao de conteudo.

**Ordem:** Junto com PR A ou separado. Nao bloqueia nada.

**Draft ou normal:** Normal.

---

### PR D — Docs / Prototipo HTML

**Objetivo:** Registrar prototipos UX HTML da etapa de mapeamento B-095.

**Arquivos:**
- `docs/prototypes/flutter-mobile/index.html` (+1857 linhas de diff)
- `docs/prototypes/flutter-mobile/styles.css` (+1435 linhas de diff)

**Volume:** 2 M

**Motivo separado:** Arquivos gigantes; nao devem inflar revisao do PR Flutter.

**Ordem:** Quarto. Nao bloqueia nada.

---

### PR E — Backend/Frontend polish anterior

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
npm run test
npm run build (frontend)
```

**Ordem:** Independente. Pode ir antes ou depois de PR A.

---

### Fora de qualquer PR

- `experiments/` — nunca commitar, nunca staged
- `src/brand/` — avaliar necessidade
- `src/config/icons.tsx` — esta no lugar errado (src/ em vez de frontend/src/); avaliar antes
- `src/types/assets.d.ts` — avaliar necessidade

---

## Estrategia de branch

### Problema atual

A branch `docs/flutter-mobile-ux-html-proposals` foi criada para o bloco de mapeamento UX/HTML (B-095 planejamento anterior). No entanto, ela acumula todo o trabalho Flutter de B-077 a B-093. O nome da branch e enganoso para revisores de PR.

### Opcoes avaliadas

**Opcao 1 — Manter a branch atual para PR Flutter**
- Nao recomendado: nome sugere apenas docs/prototipo, nao fundacao mobile
- Confunde revisor sobre escopo do PR

**Opcao 2 — Criar branch nova `feature/flutter-mobile-field-ops-foundation` a partir de `main`**
- Recomendado
- Limpa, com nome correto
- Exige cherry-pick ou squash dos commits relevantes
- Alternativa mais simples: manter worktree atual, criar nova branch a partir de HEAD, depois fazer `git add mobile/flutter_app/` e commit nessa branch nova

**Opcao 3 — Criar branch a partir de HEAD atual**
- Mais simples: sem perda de historico
- Comando futuro (NAO EXECUTAR AGORA):
  ```
  git checkout -b feature/flutter-mobile-field-ops-foundation
  ```
  Depois staged apenas os arquivos Flutter + commit.

### Nome recomendado

```
feature/flutter-mobile-field-ops-foundation
```

Alternativas:
- `feature/flutter-mobile-v001-foundation`
- `feature/flutter-field-ops-local-first`

### Sequencia de comandos futuros (NAO EXECUTAR AGORA)

```bash
# 1. criar branch nova a partir de HEAD (preserva worktree)
git checkout -b feature/flutter-mobile-field-ops-foundation

# 2. stage apenas arquivos Flutter
git add mobile/flutter_app/

# 3. validar o que sera commitado
git diff --cached --stat
git diff --cached --name-only

# 4. validar QA antes de commitar
flutter pub get && dart format --set-exit-if-changed . && flutter analyze && flutter test

# 5. commitar
git commit -m "feat(mobile): flutter mobile field ops foundation B-077 to B-093

- Local-first architecture with Drift/SQLite
- Auth JWT + auto refresh + secure token storage
- Work orders: list, detail, execute, complete, approval
- Configurable checklists: schema, run, all field renderers, damage map
- RDV/Expenses: create, items, receipts, submit
- Camera/gallery evidence picker with safe metadata
- Inventory: list, stock entry/exit
- Auto sync + offline queue + replay service
- Connectivity bridge + profile screen
- 280 tests passing, 0 analyze issues

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

# 6. push e abrir draft PR
git push -u origin feature/flutter-mobile-field-ops-foundation
gh pr create --draft --title "feat(mobile): Flutter mobile field ops foundation (B-077 to B-093)"
```

---

## Riscos reais e mitigacao

| # | Risco | Severidade | Mitigacao |
|---|-------|-----------|-----------|
| 1 | Branch `docs/flutter-mobile-ux-html-proposals` carrega implementacao Flutter — nome enganoso | Alta | Criar branch limpa com nome correto antes do PR |
| 2 | ~116 arquivos nao rastreados — `git add mobile/flutter_app/` em bloco pode incluir arquivos indesejados | Alta | Revisar `git status` e `git ls-files --others -- mobile/flutter_app/` antes de staged |
| 3 | `experiments/` nao rastreado presente no worktree — risco de incluir acidentalmente | Alta | Confirmar .gitignore cobre `experiments/`; usar `git add mobile/flutter_app/` especificamente |
| 4 | Backend/frontend antigos misturados no mesmo worktree sem separacao de branch | Media | PRs separados (PR E) resolvem |
| 5 | PR A gigante (~139 arquivos) pode assustar revisor | Media | Draft PR primeiro; dividir revisao em camadas logicas na descricao |
| 6 | pubspec.lock pode divergir entre ambientes de CI | Media | Testar `flutter pub get` em CI; fixar versoes de pacotes criticos |
| 7 | Sem teste em emulador/dispositivo Android real | Alta | Necessario antes do merge; QA manual com seed de dados |
| 8 | Backend real nao expoe todos os endpoints mobile | Media | Documentar no PR que app funciona em modo local-first; backend nao e prerequisito para merge |
| 9 | B-095 foi analise de web/API — nao deve entrar no PR Flutter | Media | Confirmar que nenhum arquivo B-095 esta em mobile/flutter_app/ |
| 10 | Docs/prototipo HTML (index.html +1857 linhas) podem confundir revisor do PR Flutter | Media | PR D separado para prototipo |
| 11 | Upload binario real (camera/galeria) ainda depende de backend S3 | Media | Documentar no PR como known limitation |
| 12 | App funcional em testes unit/widget mas sem validacao manual end-to-end | Alta | QA manual obrigatorio antes de promote draft → normal PR |
| 13 | `src/config/icons.tsx` esta no diretorio errado (raiz src/, nao frontend/src/) | Baixa | Avaliar antes de PR E |

---

## Plano de saneamento sem executar

### Fase 1 — Congelar features (DONE)

**Objetivo:** Nenhuma feature nova antes de PR
**Status:** Concluido. B-094 e ultimo bloco de implementacao.
**Criterio de pronto:** Nenhuma alteracao em Flutter, backend, React ou docs/prototipo.

### Fase 2 — Validar Flutter (DONE neste bloco)

**Objetivo:** QA completo antes de PR
**Comandos executados:** pub get, format, analyze, test
**Resultado:** 280/280, 0 issues, 0 alterados
**Criterio de pronto:** ✅ Atingido

### Fase 3 — Classificar arquivos (DONE neste bloco)

**Objetivo:** Saber exatamente o que vai em cada PR
**Resultado:** 14 grupos classificados neste documento
**Criterio de pronto:** ✅ Atingido

### Fase 4 — Decidir branch/PR (DONE neste bloco)

**Objetivo:** Definir estrategia de branch e PRs
**Resultado:** 5 PRs definidos (A-E)
**Criterio de pronto:** ✅ Atingido

### Fase 5 — Criar branch limpa (PENDENTE — aguarda autorizacao)

**Objetivo:** Branch `feature/flutter-mobile-field-ops-foundation` a partir de HEAD
**Comando futuro:**
```
git checkout -b feature/flutter-mobile-field-ops-foundation
```
**Risco:** Baixo (cria branch nova sem perder nada)
**Criterio de pronto:** Branch criada confirmada por `git branch --show-current`

### Fase 6 — Staged somente arquivos do PR Flutter (PENDENTE)

**Objetivo:** `git add mobile/flutter_app/` e verificar
**Comandos futuros:**
```
git add mobile/flutter_app/
git diff --cached --stat
git diff --cached --name-only | wc -l
```
**Risco:** Verificar que nao inclui arquivos nao desejados
**Criterio de pronto:** `git diff --cached --name-only` mostra apenas arquivos Flutter

### Fase 7 — Rodar validacoes finais (PENDENTE)

**Objetivo:** Confirmar QA com staged atual
**Comandos futuros:**
```
flutter pub get
dart format --set-exit-if-changed .
flutter analyze
flutter test
git diff --check
```
**Criterio de pronto:** Todos passando, 0 alterados

### Fase 8 — Abrir draft PR (PENDENTE)

**Objetivo:** PR visivel para revisao sem merge imediato
**Comando futuro:**
```
git commit -m "feat(mobile): flutter mobile field ops foundation B-077 to B-093"
git push -u origin feature/flutter-mobile-field-ops-foundation
gh pr create --draft --title "feat(mobile): Flutter mobile field ops foundation (B-077 to B-093)"
```
**Criterio de pronto:** URL do PR retornada pelo gh

### Fase 9 — QA manual/emulador (PENDENTE)

**Objetivo:** Validar app em dispositivo/emulador real
**Atividades:**
- Instalar em emulador Android
- Login com seed de dados
- Navegar por OS, checklist, RDV, inventario
- Testar evidencia de camera
- Verificar sync screen
**Criterio de pronto:** Golden path executado sem crash

### Fase 10 — Revisao final e merge (PENDENTE)

**Objetivo:** Promover draft → normal PR e fazer merge
**Pre-requisito:** Fases 7, 8, 9 concluidas; reviewer aprovou

---

## KPIs atualizados

### Estado tecnico

| KPI | Valor | Nota |
|-----|-------|------|
| Testes Flutter | 280/280 (100%) | Zero falhas |
| flutter analyze | No issues | 0 warnings, 0 errors |
| dart format | CLEAN | 0 arquivos alterados |
| git diff --check | CLEAN | Pre e pos-QA |
| Arquivos formatados | 106 | Verify-only mode |

### Estado de produto

| Modulo | Tecnico | Produto | PR Ready |
|--------|---------|---------|----------|
| Auth | 90% | 60% | Sim |
| OS | 85% | 70% | Sim |
| Checklist | 85% | 70% | Sim |
| RDV | 80% | 65% | Sim |
| Evidencias | 70% | 50% | Sim |
| Inventory | 75% | 60% | Sim |
| Connectivity | 90% | 80% | Sim |
| Auto sync | 80% | 65% | Sim |
| Profile | 85% | 70% | Sim |
| Diagnostics | 85% | 75% | Sim |
| Approvals | 50% | 30% | Parcial |
| Field map | 5% | 0% | Nao |

### Estado de Git/PR

| Item | Status |
|------|--------|
| Branch atual | `docs/flutter-mobile-ux-html-proposals` (nome inadequado) |
| Branch nova sugerida | `feature/flutter-mobile-field-ops-foundation` |
| PR A (Flutter) | Planejado, nao criado |
| PR B (Agent Orch) | Planejado, nao criado |
| PR C (Docs mobile) | Planejado, nao criado |
| PR D (Prototipo HTML) | Planejado, nao criado |
| PR E (Backend/Frontend) | Planejado, nao criado |
| `experiments/` seguro | Nao rastreado, nao entra em PR |

---

## Estimativas de prazo

| Atividade | Horas |
|-----------|-------|
| Branch nova + staged + commit Flutter | 1–2h |
| Draft PR + descricao | 1h |
| QA manual emulador Android | 2–4h |
| Approve + merge PR A | 1–2h (+ tempo de revisor) |
| Flutter demonstravel com backend mockado | 3–6h |
| Conexao com backend real (auth + OS + checklist) | 12–24h |
| Upload real evidencias (S3 presigned) | 4–8h |
| Flutter V-0.01 vendavel | 40–80h total |

| Ritmo | PR Flutter | Demo forte | V-0.01 |
|-------|-----------|-----------|--------|
| 2h/dia | 1–2 dias | 3–5 dias | 20–40 dias |
| 4h/dia | < 1 dia | 2–3 dias | 10–20 dias |
| 6h/dia | < 1 dia | 1–2 dias | 7–14 dias |
| 8h/dia | < 1 dia | 1 dia | 5–10 dias |

---

## Proximo bloco recomendado

**B-095-branch — Criar branch + staged + commit + draft PR Flutter:**
- Autorizar criacao de `feature/flutter-mobile-field-ops-foundation`
- Executar `git checkout -b feature/flutter-mobile-field-ops-foundation`
- Executar `git add mobile/flutter_app/`
- Validar staged, rodar QA
- Commit + push + `gh pr create --draft`

Nao implementar features. Apenas organizar Git e abrir PR.

---

## Constraints mantidos

- sem commit, sem push, sem PR
- sem branch criada ou trocada
- sem alteracao em Flutter, backend, React, docs/prototipos
- sem formatacao, sem refatoracao
- apenas criacao aditiva do registro B-094 em agent-orchestration/
- `experiments/` nao tocado
- git diff --check CLEAN antes e depois
