# B-FILA-USUARIO — diário do dev

> **Papel:** `dev-filausr-argon` — Gemini 4 Argon via Antigravity, nível menor declarado, identidade exclusiva de dev.
> **Autoria do plano:** Claude (`planejador-reenvios`, Fable, corrigido em 02/11 por `corretor-cobranca-3110`).
> **Revisão e junta:** Claude (pré-revisão + 3 cadeiras da junta completa, unanimidade). Este dev não planejou nem revisará o bloco.

## RETOMADA 0

- **Head de partida (`origin/main`):** `04bb0e17d4bec400519bf79228e7b5f6682afdbb` (`#509`).
- **Ramo / worktree:** `fix/mobile-fila-por-usuario` em worktree dedicado `w-filausr` (sem `npm ci`, sem Docker, sem junction).
- **O que foi feito (comandos e saídas resumidas):**
  1. `df -h /c` → `454G total, 223G usados, 231G livres (50%)` (acima do piso de 7,5 GB).
  2. `git log --grep="B-O6R-11" --oneline -3` → `7c89c73b fix(mobile): fila durável e despesa em Aguardando envio — 1º PR do corte (B-O6R-11) (#483)` confirmado na `origin/main`.
  3. `flutter --version` → `Flutter 3.41.6 • channel stable` / `Dart 3.11.4` (CI roda `3.47.5`; declarado).
  4. `flutter pub get` em `mobile/flutter_app` → exit 0, `pubspec.yaml` e `pubspec.lock` intocados.
  5. Re-medição do terreno em `origin/main` (`04bb0e17`):
     - `app_database.dart:11`: `int get schemaVersion => 13;` → versão alvo deste bloco confirmada em **`14`**.
     - `_kSyncActions` (`app_database.dart:241-253`): 10 colunas (`client_action_id`, `tenant_id`, `type`, `payload_json`, `status`, `created_at`, `processed_at`, `retry_count`, `last_error_code`, `last_safe_error`), sem `user_id`. Nota de terreno: migrações `ALTER TABLE` existentes em `app_database.dart` verificam `sqlite_master` antes do `ALTER` porque suítes legadas (`telemetry_test.dart:226`, `b104:403`, `b105:844`) semeiam arquivos SQLite vazios com `PRAGMA user_version = N`.
     - `git grep -n "_actionFactory.create(" origin/main -- mobile/flutter_app/lib` → **20** sítios (6 `checklist_repository.dart`, 4 `expense_repository.dart`, 2 `inventory_repository.dart`, 1 `prestador_repository.dart`, 7 `work_order_repository.dart`).
     - `git grep -n "implements SyncQueueRepository" origin/main -- mobile/flutter_app` → **11** ocorrências: 2 em `lib/` (`PersistentSyncQueueRepository`, `InMemorySyncQueueRepository`) e 9 em `test/` (8 da M.6 + `_CountingQueue` de `bo6r11_sync_queue_reclaim_service_test.dart`).
     - Símbolos herdados do PR #483 confirmados em `origin/main`: `canDiscardSyncAction` (`sync_stalled_resolver.dart:13`), `_confirmDiscard` (`sync_screen.dart:58`), `PendingBackendExpenseSyncBatchApi` (`sync_replay_service.dart:130`), `expenseSyncChannelOffProvider` (`sync_providers.dart:129`), `SyncQueueReclaimService` (`sync_queue_reclaim_service.dart:4`).
     - Provedor de autenticação real medido em `lib/core/auth/auth_notifier.dart:31`: `authStateProvider` (`AsyncNotifierProvider<AuthNotifier, AuthState>`), com `state.isAuthenticated` e `state.session?.user.sub` (`AuthUser.sub`).
  6. `flutter analyze` → `No issues found! (ran in 54.7s)`.
  7. `flutter test --reporter compact` → **`01:15 +998: All tests passed!`** → Baseline **`N = 998`** (zero falha, zero skip).
- **O que falta:** A-F1, A-F2, A-F3, A-F4, A-F5, A-F6, A-F6b, A-F7, A-F8.
- **Próximo comando:** criar worktree temporário detached em `origin/main` para medir os vermelhos-controle (RA5(1), RA5(3), RA2(1)/(2)) e as 3 hipóteses da A-F1 (`_kSyncActions` desde v1, `sub` × `userId` no bootstrap do backend, e downgrade do Drift 14 → 13), removendo o worktree temporário ao fim.
## RETOMADA 1

- **Head antes do commit:** `118ccb3baff139275d2498432db92e28fa8550e3` (`docs(b-fila-usuario): diário — terreno medido`).
- **O que foi feito (comandos e saídas resumidas — fatia A-F1):**
  1. **Hipótese H1 (A2 item 4 — `_kSyncActions` desde v1):**
     - Comando: `git log --oneline -S"_kSyncActions" origin/main -- mobile/flutter_app/lib/core/local_db/app_database.dart`
     - Saída: `e79616aa feat(mobile): Flutter mobile field ops foundation`
     - Leitura: `sync_actions` existe desde a v1 (`onCreate` original). Mantemos a checagem padrão do arquivo (`SELECT name FROM sqlite_master WHERE type='table' AND name='sync_actions'`) dentro de `if (from < 14)` para preservar os testes de migração em banco vazio semeado apenas com `PRAGMA user_version` (`telemetry_test.dart:226`, `b104:403`, `b105:844`).
  2. **Hipótese H2 (M.23 / N1 — `sub` × `userId` no bootstrap do backend):**
     - Comando: `git show origin/main:src/modules/mobile/mobile.routes.ts | sed -n '50,130p'`
     - Saída: `service.getUserForTenant(actor.userId, actor.tenantId)` (l.67) → `user: { id: user.id, name: user.name, email: user.email }` (l.99-103); recibos de sync usam `actor.userId` (claim `sub`).
     - Leitura: no servidor `bootstrap.user.id` nasce de `actor.userId` (`sub`), porém no app `clearSession` na expiração não apaga o cache de bootstrap (N1). Logo `currentSyncUserIdProvider` lerá exclusivamente `authStateProvider` (`state.isAuthenticated ? state.session?.user.sub : null`), nunca `bootstrapSessionProvider`.
  3. **Hipótese H3 (R-A4 — downgrade do Drift 14 → 13):**
     - Comando: em worktree temporário detached em `origin/main` (`04bb0e17`, `schemaVersion => 13`), banco SQLite semeado em `PRAGMA user_version = 14` com coluna `user_id TEXT` e 2 linhas (`c-u1` com `'u1'` e `c-null` com `NULL`), aberto pelo `AppDatabase` v13 (`DriftSyncActionStore.load()` + `save(...)`).
     - Saída: `DOWNGRADE_LOAD_OK count=2 user_version=13 ids=[c-u1, c-null]` e `DOWNGRADE_SAVE_OK count=3` (`00:00 +1: All tests passed!`).
     - Leitura: o Drift 2.34.0 chama `onUpgrade(m, 14, 13)`, nenhum bloco `from < N` (`N <= 13`) dispara, `user_version` passa a `13`, `SELECT *` ignora a coluna extra `user_id` e o `INSERT` explícito de 10 colunas segue gravando sem erro. Ainda assim, conforme §A8 (`Rollback`), num eventual `git revert` recomenda-se não baixar `schemaVersion` de volta para 13 (nota vai no corpo do PR).
  4. **Vermelhos-controle medidos em `origin/main` (`04bb0e17`) em worktree temporário `w-filausr-ctrl` (removido ao fim com `git worktree remove --force`):**
     | Requisito / Caso | Comando | Resultado no head (`04bb0e17`) |
     |---|---|---|
     | RA1 / RA3 / RA4 / RA5(4) (símbolos novos) | `flutter test test/af1_compile_ctrl_test.dart` | **Não compila (exit 1):** `Error when reading 'lib/core/sync/sync_user_scope.dart'`, `No named parameter with the name 'userId'`, `Method not found: 'isOwnedBy'` |
     | RA2(1) migração 13 → 14 | `flutter test test/af1_red_controls_test.dart` | **VERMELHO:** `Expected: <14>, Actual: <13>` |
     | RA2(2) DDL fresca com `user_id` | `flutter test test/af1_red_controls_test.dart` | **VERMELHO:** `Expected: contains 'user_id', Actual: Set:[10 colunas] — does not contain 'user_id'` |
     | RA5(1) ação de `u1` sob sessão `u2` | `flutter test test/af1_red_controls_test.dart` | **VERMELHO:** `Expected: ['exp-u2'], Actual: ['exp-u1', 'exp-u2']` (a ação de `u1` vaza no replay de `u2`) |
     | RA5(3) N1 bootstrap velho `u1-velho` × token `u2` | `flutter test test/af1_red_controls_test.dart` | **VERMELHO:** `Expected: ['exp-u2-novo'], Actual: ['exp-u1-velho', 'exp-u2-novo']` |
  5. Worktree temporário removido e conferido por `git worktree list` (`w-filausr-ctrl` ausente).
- **O que falta:** A-F2, A-F3, A-F4, A-F5, A-F6, A-F6b, A-F7, A-F8.
- **Próximo comando:** implementar A-F2 (`sync_models.dart`, `sync_action_store.dart`, `sync_action_factory.dart` + `test/core/sync/bfilausuario_model_factory_test.dart`), rodar RA1 (3/3), mutação M-A1 e `flutter analyze`.

## RETOMADA 2

- **Head antes do commit:** `76694745` (`docs(b-fila-usuario): vermelho-controle e hipóteses medidas`).
- **O que foi feito (comandos e saídas resumidas — fatia A-F2):**
  1. Editados exclusivamente os 3 arquivos de produção de A2 itens 1, 2 e 5:
     - `mobile/flutter_app/lib/core/sync/sync_models.dart`: campo opcional `final String? userId;` no construtor, `copyWith(userId:)` e `props`.
     - `mobile/flutter_app/lib/core/sync/sync_action_store.dart`: `'user_id': action.userId` em `SyncActionCodec.toJson` e `userId: json['user_id'] as String?` em `SyncActionCodec.fromJson`.
     - `mobile/flutter_app/lib/core/sync/sync_action_factory.dart`: `SyncActionFactory({Uuid? uuid, String? Function()? currentUserId})` e `userId` opcional em `create(...)` resolvido por `_normalizeUserId(userId) ?? _normalizeUserId(_currentUserId?.call())` (os 20 sítios chamadores em `lib/features/**` seguem intocados).
  2. Criado `mobile/flutter_app/test/core/sync/bfilausuario_model_factory_test.dart` com os 3 casos de **RA1**:
     - `flutter test test/core/sync/bfilausuario_model_factory_test.dart --reporter expanded` → `00:00 +3: All tests passed!` (3/3).
  3. **Mutação M-A1** (fábrica ignora `_currentUserId` em `sync_action_factory.dart`):
     - Aplicada → `flutter test test/core/sync/bfilausuario_model_factory_test.dart` → **VERMELHO** (`00:00 +2 -1: RA1(3) ... Expected: 'u1', Actual: <null>`).
     - Revertida por edição inversa → provado com `git diff --quiet` (exit `0`).
  4. `dart format --output=none --set-exit-if-changed` nos 4 arquivos da fatia → `0 changed`; guard AST `bo6r11_guard_fila_await_ast_test.dart` verde; `flutter analyze` → `No issues found!`.
- **O que falta:** A-F3, A-F4, A-F5, A-F6, A-F6b, A-F7, A-F8.
- **Próximo comando:** implementar A-F3 (`app_database.dart` schemaVersion 14 + migração aditiva `from < 14`, `drift_sync_action_store.dart` + `test/core/local_db/bfilausuario_drift_user_id_test.dart`), rodar RA2 (3/3), mutações M-A2 e M-A3 e regressões `drift_stores_test.dart` + `app_database_migration_test.dart`.

## RETOMADA 3

- **Head antes do commit:** `83e32668` (`feat(mobile): ação de sincronização carrega o usuário que a criou (B-FILA-USUARIO)`).
- **O que foi feito (comandos e saídas resumidas — fatia A-F3):**
  1. Editados A2 itens 3 e 4:
     - `mobile/flutter_app/lib/core/local_db/app_database.dart`: `schemaVersion => 14`, coluna `user_id TEXT` em `_kSyncActions` e bloco `if (from < 14)` com guarda `sqlite_master` + `ALTER TABLE sync_actions ADD COLUMN user_id TEXT` (nenhuma outra tabela tocada; nenhuma linha antiga perdida).
     - `mobile/flutter_app/lib/core/local_db/drift_sync_action_store.dart`: coluna `user_id` no `INSERT` e `userId: row.readNullable<String>('user_id')` em `_actionFromRow`.
  2. Criado `mobile/flutter_app/test/core/local_db/bfilausuario_drift_user_id_test.dart` com **RA2(1..3)** → `00:00 +3: All tests passed!` (3/3).
  3. `PREMISSA FALSA: A-F3 exige test/core/local_db/app_database_migration_test.dart verde sem listá-lo no PERMITIDO literal de A4 (não está em PROIBIDO), mas l.181 e l.222 assertem literal expect(await _userVersion(db), 13) — flutter test --no-pub test/core/local_db/app_database_migration_test.dart --reporter expanded — 00:00 +0 -2: Expected: <13>, Actual: <14> (l.181 e l.222).` Atualizadas exclusivamente as linhas 181 e 222 (`13` → `14`, precedente `B-ASS-04` / `R-507`); marcado como `Fora do PERMITIDO literal de A4 (fora de PROIBIDO), declarado`.
  4. **Mutações M-A2 e M-A3 (uma por vez, revertidas por edição inversa):**
     - **M-A2** (remover `ALTER TABLE` de `from < 14`): **VERMELHO** em RA2(1) e RA2(3) (`does not contain 'user_id'` / `SqliteException(1): table sync_actions has no column named user_id`); revertida por edição inversa → `git diff --quiet` exit `0`.
     - **M-A3** (`_actionFromRow` sem `userId:`): **VERMELHO** em RA2(2) e RA2(3) (`Expected: 'user-1', Actual: <null>`); revertida por edição inversa → `git diff --quiet` exit `0`.
  5. Regressões `drift_stores_test.dart` (8/8), `app_database_migration_test.dart` (2/2), `telemetry_test.dart` e guard AST verdes; `dart format` nos 4 arquivos → `0 changed`; `flutter analyze --no-pub` → `No issues found!`.
- **O que falta:** A-F4, A-F5, A-F6, A-F6b, A-F7, A-F8.
- **Próximo comando:** implementar A-F4 (`lib/core/sync/sync_user_scope.dart` + `lib/core/sync/sync_providers.dart` + `test/core/sync/bfilausuario_user_scoped_queue_test.dart`), rodar RA3 (4/4), mutações M-A4, M-A5 e M-A6 e os 6 testes do coordenador.
## RETOMADA 4

- **Head antes do commit:** `eaeca78c` (`feat(mobile): sync_actions ganha user_id com migração aditiva (B-FILA-USUARIO)`).
- **O que foi feito (comandos e saídas resumidas — fatia A-F4):**
  1. Criado `mobile/flutter_app/lib/core/sync/sync_user_scope.dart` (A2 item 6 + S-n6 + S-n7 + Emenda 4 §7): `SyncOwnershipError`, `isOwnedBy`, `partitionByUser`, `canAssumeLegacyAction`, `assignActionToUser`, `discardLegacyAction` e `UserScopedSyncQueueRepository` (`pendingForTenant` filtrado por `isOwnedBy`; `actionsForTenant` e `enqueue` delegados; `update` guardado por dono com `SyncOwnershipError`).
  2. Editado `mobile/flutter_app/lib/core/sync/sync_providers.dart` (A2 item 7 + S-n6): `currentSyncUserIdProvider` lendo exclusivamente `authStateProvider` (`state.isAuthenticated ? state.session?.user.sub : null`, nunca `bootstrapSessionProvider`), `syncActionFactoryProvider` carimbando `currentUserId`, `replaySyncQueueRepositoryProvider` com `UserScopedSyncQueueRepository`, e os 4 providers de replay (`syncReplayServiceProvider`, `workOrderSyncReplayServiceProvider`, `checklistSyncReplayServiceProvider`, `evidenceSyncReplayServiceProvider`) mais `workOrderConflictResolutionServiceProvider` (S-n6) recebendo `replaySyncQueueRepositoryProvider` (`syncQueueRepositoryProvider` cru mantido para repositórios, resgate, tela e diagnóstico).
  3. Criado `mobile/flutter_app/test/core/sync/bfilausuario_user_scoped_queue_test.dart` com **RA3(1..4)** → `00:02 +4: All tests passed!` (4/4).
  4. `PREMISSA FALSA: A-F4 exige os testes do coordenador verdes sem listar bo6r11_despesa_aguardando_envio_test.dart no PERMITIDO literal de A4 (fora de PROIBIDO), mas o caso p4 semeia ações sem userId (_action l.30) e monta ProviderContainer sem currentSyncUserIdProvider (_runCoordinatorScenario l.101), fazendo o replay filtrado bloquear o envio legítimo — flutter test --no-pub --reporter compact test/core/sync/bo6r11_despesa_aguardando_envio_test.dart — 00:00 +17 -1: p4 canal ligado preserva falha real e envia só elegíveis [E] Null check operator used on a null value at test/core/sync/bo6r11_despesa_aguardando_envio_test.dart:581:28.` Carimbo mínimo de fixture em 2 linhas (`userId: 'u-awaiting'` em `_action` e `currentSyncUserIdProvider.overrideWithValue('u-awaiting')` em `_runCoordinatorScenario`); marcado como `Fora do PERMITIDO literal de A4 (fora de PROIBIDO), declarado`.
  5. Regressões do coordenador e sync (14 arquivos, incluindo `bo6r11_despesa_aguardando_envio_test.dart`, `bo6r11_guard_fila_await_ast_test.dart` com `ESCRITAS=46, VIOLACOES(0)`, `b090b`, `b091`, `b103`, `b105`, `b106`, `b121`, `sync_replay_service_test`, `sync_engine_test`, `b088`, `bo6r11_resgate_*`, `bo6r11_sync_queue_reclaim_service_test`) → `00:13 +191: All tests passed!`.
  6. **Mutações M-A4, M-A5 e M-A6 (uma por vez, revertidas por edição inversa):**
     - **M-A4** (`pendingForTenant` sem filtro de dono): **VERMELHO** em RA3(1) e RA3(2) (`00:03 +2 -2: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
     - **M-A5** (`isOwnedBy` tratando `userId == null` como da sessão): **VERMELHO** em RA3(1) e RA3(2) (`00:02 +2 -2: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
     - **M-A6** (`actionsForTenant` também filtrado por dono): **VERMELHO** em RA3(3) (`00:02 +3 -1: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
  7. `dart format --output=none --set-exit-if-changed` nos 4 arquivos → `0 changed`; `flutter analyze --no-pub` → `No issues found!`.
- **O que falta:** A-F5, A-F6, A-F6b, A-F7, A-F8.
- **Próximo comando:** implementar A-F5 (`lib/shared/ui/sync_screen.dart` + `test/features/bfilausuario_sync_screen_test.dart`), rodar RA4 (5/5 incluindo RA4(3b)), mutações M-A7, M-A8, M-A9, M-A11, M-A12, M-A14 e os 5 arquivos existentes que montam `SyncScreen`.
## RETOMADA 5

- **Head antes do commit:** `6cb91b09` (`feat(mobile): replay envia só as ações do usuário da sessão (B-FILA-USUARIO)`).
- **O que foi feito (comandos e saídas resumidas — fatia A-F5):**
  1. Editado `mobile/flutter_app/lib/shared/ui/sync_screen.dart` (A2 item 8, PA4, S-n7, Emenda 4 §7; tela-modelo: própria `lib/shared/ui/sync_screen.dart`; skills consultadas: `ts-frontend-full`, `ui-ux-pro-max`, `flutter-expert`):
     - Partição da fila por `partitionByUser(actions, currentUserId)`: contadores (`SyncQueueSummary.fromActions`) e cartões de conflito/encalhe calculados exclusivamente sobre `part.mine`.
     - Aviso discreto para ações pendentes de outros usuários (`part.others` não sincronizadas): `N ações de outro usuário neste aparelho aguardam o login dele` (singular `1 ação...`), sem exibir tipo, erro ou payload alheio.
     - Seção de legado (`part.legacy` não sincronizadas) com cabeçalho literal `"Lançamentos da versão anterior do app. Toque Assumir para que sejam enviados com o seu usuário quando o envio estiver ativo."` e cartões `legacy-card-<id>` reutilizando `_ConflictCard` parametrizado:
       - `canAssumeLegacyAction(a, currentUserId)`: exibe botão `Assumir` (`legacy-assume-<id>`) que re-lê a ação na fila e persiste `assignActionToUser(fresh, uid)` preservando o status; para `expense_report.create` legado com `employee_id` de outro usuário (S-n7), omite os botões e mostra `"Lançamento de outro usuário: só ele pode assumir"`.
       - `canDiscardSyncAction(a.type)`: exibe botão `Descartar` (`legacy-discard-<id>`) somente para tipos descartáveis (omitido para despesa — `D-DESPESA-SEM-DESCARTAR`), exigindo sempre `_confirmDiscard(context, a)` antes de gravar `discardLegacyAction(fresh)` (`SyncStatus.synced` + `DISCARDED_BY_TECHNICIAN`).
  2. Criado `mobile/flutter_app/test/features/bfilausuario_sync_screen_test.dart` com **RA4(1), RA4(2), RA4(3), RA4(3b), RA4(4)** (5 casos) → `00:05 +5: All tests passed!`.
  3. `PREMISSA FALSA: A-F5 exige b122_sync_conflict_test.dart, bo6r11_sync_screen_despesa_e_saida_test.dart (nome real no repo do citado bo6r11_sync_screen_saida_encalhe_test.dart) e os demais arquivos que montam SyncScreen verdes sem listá-los no PERMITIDO literal de A4 (fora de PROIBIDO), mas suas fixtures semeiam SyncAction sem userId (null → part.legacy) e não sobrescrevem currentSyncUserIdProvider — flutter test --no-pub --reporter compact test/features/b122_sync_conflict_test.dart test/features/bo6r11_sync_screen_despesa_e_saida_test.dart test/features/b107_work_order_remote_create_conflicts_test.dart test/features/b088_checklist_sync_replay_test.dart test/features/expenses/expense_local_first_test.dart — 00:16 +42 -17: Some tests failed.` Aplicado carimbo mínimo de fixture (`userId` + `currentSyncUserIdProvider.overrideWithValue(...)`) nesses 5 arquivos de teste; marcados como `Fora do PERMITIDO literal de A4 (fora de PROIBIDO), declarado`.
  4. Regressões completas de `SyncScreen`, `DiagnosticsScreen` (`diagnostics_screen.dart` intocada, A2 item 9) e guard AST (`bo6r11_guard_fila_await_ast_test.dart`: `ESCRITAS=48, VIOLACOES(0)`) → `00:15 +78: All tests passed!`.
  5. **Mutações M-A7, M-A8, M-A9, M-A11, M-A12 e M-A14 (uma por vez, revertidas por edição inversa):**
     - **M-A7** (cartões de conflito lendo `actions` sem filtrar por dono): **VERMELHO** em RA4(1) (`00:06 +3 -2: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
     - **M-A8** (aviso de `others` renderizando tipo/payload de `u1`): **VERMELHO** em RA4(2) (`00:12 +4 -1: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
     - **M-A9** (`_assumeLegacy` sem `queue.update`): **VERMELHO** em RA4(3) (`00:05 +4 -1: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
     - **M-A11** (`discardLegacyAction` e botão permitindo descartar despesa): **VERMELHO** em RA4(3) (`00:04 +4 -1: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
     - **M-A12** (`_discardLegacy` gravando direto sem `_confirmDiscard`): **VERMELHO** em RA4(4) (`00:04 +4 -1: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
     - **M-A14** (`canAssumeLegacyAction` retornando `true` para despesa legada de outro `employee_id`): **VERMELHO** em RA4(3b) (`00:04 +4 -1: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
  6. `dart format --output=none --set-exit-if-changed` nos 7 arquivos `.dart` → `0 changed`; re-execução de RA4 pós-revert → `00:05 +5: All tests passed!`; `flutter analyze --no-pub` → `No issues found!`.
- **O que falta:** A-F6, A-F6b, A-F7, A-F8.
- **Próximo comando:** implementar A-F6 (`test/features/bfilausuario_replay_integration_test.dart` com RA5(1) e RA5(2)), rodar M-A10 e M-A6 sobre RA5(2) e citar o vermelho-controle de A-F1.
## RETOMADA 6

- **Head antes do commit:** `f9fd906c` (`feat(mobile): tela de sincronização separa minhas ações, as de outro usuário e as sem usuário (B-FILA-USUARIO)`).
- **O que foi feito (comandos e saídas resumidas — fatia A-F6):**
  1. Criado `mobile/flutter_app/test/features/bfilausuario_replay_integration_test.dart` com **RA5(1) e RA5(2)** (2/2):
     - **RA5(1):** `ProviderContainer` com a cadeia real `authTokenStorageProvider` (`InMemoryAuthTokenStorage` com sessão ativa `sub: 'u2'`) → `authStateProvider` → `currentSyncUserIdProvider` → `replaySyncQueueRepositoryProvider` → `syncReplayServiceProvider` e `workOrderSyncReplayServiceProvider` + `AutoSyncCoordinator.triggerManual()`. Com fila semeada com `exp-u1`, `exp-u2`, `wo-u1` e `exp-legacy` (`userId == null`), apenas `['exp-u2']` chega ao `CaptureBatchApi`, `workOrderApi.captured` permanece `null`, e `exp-u1`, `wo-u1` e `exp-legacy` continuam `SyncStatus.pending` (`retryCount == 0`, zero passagens por `SyncStatus.syncing`).
     - **RA5(2):** reconciliação via `WorkOrderRepository.refresh()` contra `_WalkingEmptyWorkOrderApi` (`complete: true`) sob sessão `u2` retém tanto a OS `wo-u1` (ação `work_order.status_update` de `u1`) quanto `wo-cl-u1` (run de vistoria com ação `checklist_answer.upsert` de `u1` via `buildWorkOrderExternalPendingWork`), purgando apenas as OS sem pendência (`wo-clean`, `wo-clean-2`), provado tanto no `workOrderRepositoryProvider` de produção quanto através de `replaySyncQueueRepositoryProvider.actionsForTenant` (PA3).
     - `flutter test --no-pub --reporter expanded test/features/bfilausuario_replay_integration_test.dart` → `00:00 +2: All tests passed!`.
  2. **Vermelho-controle de A-F1 citado (`RETOMADA 1`):** no head `origin/main` (`04bb0e17`), o cenário de `RA5(1)` falhou com `Expected: ['exp-u2'], Actual: ['exp-u1', 'exp-u2']` (a despesa de `u1` vazava no replay sob a sessão de `u2`).
  3. **Mutações M-A10 e M-A6 sobre RA5(2) (uma por vez, revertidas por edição inversa):**
     - **M-A10** (`syncReplayServiceProvider` recebendo a fila crua `syncQueueRepositoryProvider`): **VERMELHO** em RA5(1) (`Expected: ['exp-u2'], Actual: ['exp-u1', 'exp-u2', 'exp-legacy']`; `00:00 +1 -1: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
     - **M-A6 sobre RA5(2)** (`UserScopedSyncQueueRepository.actionsForTenant` também filtrado por dono): **VERMELHO** em RA5(2) (`Expected: ['wo-cl-u1', 'wo-u1'], Actual: []`; `00:00 +1 -1: Some tests failed.`); revertida por edição inversa → `git diff --quiet` exit `0`.
  4. `dart format --output=none --set-exit-if-changed test/features/bfilausuario_replay_integration_test.dart` → `0 changed`; re-execução pós-revert → `00:00 +2: All tests passed!`; `flutter analyze --no-pub` → `No issues found!`.
- **O que falta:** A-F6b, A-F7, A-F8.
- **Próximo comando:** implementar A-F6b (`RA5(3)` para N1 — bootstrap em cache `u1-velho` × token em vigor `u2` — e `RA5(4)` para S-n6 — `WorkOrderConflictResolutionService.acceptServer` recusando conflito de `u1` sob `u2` com `SyncOwnershipError`), rodar mutações M-A13 e M-A15 e medir `flutter test --reporter compact` (`+1017`).
