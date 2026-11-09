# B-FILA-USUARIO — A fila de sincronização do app passa a ser por usuário

- **Tipo:** feature (corte do `B-O6R-11` / `B-REENVIOS`, Bloco A)
- **Fase:** Execution / Validation (A5)
- **Trilha:** mobile (Flutter)
- **Data:** 2026-11-08
- **Branch:** `fix/mobile-fila-por-usuario`
- **Autor:** `dev-filausr-argon` (Gemini 4 Argon via Antigravity, nível menor declarado; plano por `planejador-reenvios` + `corretor-cobranca-3110` em Claude)

## Objetivo

Particionar a fila de sincronização local do app de campo (`sync_actions`) pelo usuário da sessão autenticada em vigor (`AuthUser.sub` do token ativo, nunca do cache de bootstrap — N1), garantindo que nenhum serviço de replay envie ações de outro usuário nem ações legadas sem usuário, sem perder retenção local de OS/vistoria (`actionsForTenant`) e tornando ações legadas visíveis e decidíveis na `SyncScreen` (`Assumir` e, apenas onde `canDiscardSyncAction`, `Descartar` com confirmação). Não altera backend, Prisma, permissões nem foto/telemetria/localização (endereçadas ao bloco `B-FILA-USUARIO-2`).

## Contexto / fontes de verdade

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/`, `agent-orchestration/codex/log-execucao.md`, `PROJECT_MEMORY.md`.
- Plano canônico: `agent-orchestration/omega/planos/B-REENVIOS-plano.md` (§0, §A, §D, §E, §F, §G) e `docs/mobile-sync-contracts.md`.
- Pré-requisito cumprido na `main`: 1º PR do corte do `B-O6R-11` (#483, `7c89c73b`).
- Destrava: `B-O6R-03b` (item 30 do gate, `Ω6R-QUA-001`) e `B-MATERIAL-REENVIO` (item 63).

## Regras (negócio · permissão · segurança)

- Propriedade **P-FILA-POR-USUÁRIO** (PA1–PA4):
  - **PA1:** `SyncAction.userId` carimbado na criação (`SyncActionFactory`) e persistido no JSON e no Drift (`schemaVersion 14`, migração aditiva `ALTER TABLE sync_actions ADD COLUMN user_id TEXT`).
  - **PA2:** os 4 providers de replay (`syncReplayServiceProvider`, `workOrderSyncReplayServiceProvider`, `checklistSyncReplayServiceProvider`, `evidenceSyncReplayServiceProvider`) leem `replaySyncQueueRepositoryProvider` (`UserScopedSyncQueueRepository`), que filtra `pendingForTenant` por `userId == AuthUser.sub` do token em vigor (`authStateProvider`); `userId == null` nunca é enviado automaticamente.
  - **PA3:** `actionsForTenant` preserva todas as ações da organização no aparelho (retenção de OS e vistoria intocada); `workOrderConflictResolutionServiceProvider` recebe o decorador e recusa mutação de conflito alheio com `SyncOwnershipError` (S-n6).
  - **PA4:** `SyncScreen` exibe contadores e cartões apenas das ações do usuário ativo, aviso discreto de contagem para ações de outros usuários (sem expor tipo/erro/payload) e cartões de legado (`Assumir` respeitando S-n7 para `employee_id` de despesa; `Descartar` omitido para despesa por `D-DESPESA-SEM-DESCARTAR` e confirmado por `_confirmDiscard` nos demais tipos).

## Escopo PERMITIDO

- `mobile/flutter_app/lib/core/sync/{sync_models,sync_action_store,sync_action_factory,sync_user_scope,sync_providers}.dart`
- `mobile/flutter_app/lib/core/local_db/{app_database,drift_sync_action_store}.dart`
- `mobile/flutter_app/lib/shared/ui/sync_screen.dart`
- `mobile/flutter_app/test/core/sync/bfilausuario_*`, `test/core/local_db/bfilausuario_*`, `test/features/bfilausuario_*` (mais carimbos mínimos declarados de fixtures pré-existentes documentados no diário)
- `docs/revisoes/REENVIOS/B-FILA-USUARIO-dev.md`, `docs/revisoes/SAN3/PLANO_SAN3.md`, `docs/mobile-sync-contracts.md`
- `agent-orchestration/**`

## Escopo PROIBIDO

- `src/**` · `prisma/**` · `tests/**` da raiz · `frontend/**` · `Kpis/**` (KPI congelado, `D-GOV-PROPORCIONAL` 5) · `pubspec.*` · `.github/**` · `CLAUDE.md` · `AGENTS.md` · `RBAC_MATRIX.md`
- `mobile/flutter_app/lib/core/sync/{sync_replay_service,sync_engine,sync_queue_repository,sync_conflict_resolver,sync_stalled_resolver,sync_interrupted_reclaim,auto_sync_coordinator,evidence_sync}.dart`
- `mobile/flutter_app/lib/core/auth/**` · `mobile/flutter_app/lib/features/**` · `diagnostics_screen.dart`

## Bateria de validação

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/core/sync/bfilausuario_model_factory_test.dart test/core/local_db/bfilausuario_drift_user_id_test.dart test/core/sync/bfilausuario_user_scoped_queue_test.dart test/features/bfilausuario_sync_screen_test.dart test/features/bfilausuario_replay_integration_test.dart --reporter compact
flutter test --reporter compact
cd ../..
git diff --check
```

## KPIs no próprio PR (§C3)

- **KPI congelado** (`D-GOV-PROPORCIONAL` item 5): `Kpis/**` permanece intocado; contagens reais (`N = 998` → `M = 1017`, +19 testes Flutter) registradas no diário e no PR.

## Junta (§C7)

- **Nível:** junta completa (inspetor + 3 cadeiras C1/C2/C3, unanimidade — isolamento entre usuários no aparelho e migração local `app_database.dart`), sem cadeira de banco PostgreSQL.
- **Pré-revisão e junta:** executadas por Claude em identidades distintas (`D-UM-FAZ-OUTRO-VERIFICA`).
- **Diário / voto 00-dev:** `agent-orchestration/omega/juntas/votos/B-FILA-USUARIO/00-dev.md` (espelho de `docs/revisoes/REENVIOS/B-FILA-USUARIO-dev.md`).

## Rastreabilidade (§C6)

- **ID:** `B-FILA-USUARIO`
- **PR #:** preenchido após `gh pr create`
- **Merge commit / Approved head:** `null` na autoria → backfill pós-merge
- **Gate:** item 64 (`PLANO_SAN3.md` §4.1) e pré-requisito do item 30 (`B-O6R-03b`)
