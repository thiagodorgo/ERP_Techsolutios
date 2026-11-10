# B-O6R-03b — Despesas (RDV) de verdade: replay autenticado, payload, permissão, conflito e comprovante fora do lote

- **Tipo:** feature (corte do `B-O6R-11` / `B-REENVIOS`, Bloco B)
- **Fase:** Execution / Validation (A5)
- **Trilha:** mobile (Flutter) + backend (permissão, sem regra nova)
- **Data:** 2026-11-09
- **Branch:** `fix/mobile-rdv-sync`
- **Autor:** `dev-o6r03b-dp` (DeepSeek Pro, DP, identidade de dev declarada; retomou o ramo do Codex, que caiu por cota após B-F3). Plano por `planejador-reenvios` + `corretor-cobranca-3110` (Claude). Pré-revisão e junta completa serão do Claude (`D-UM-FAZ-OUTRO-VERIFICA`).

## Objetivo

Fazer a fila de despesas (RDV) convergir de verdade: o replay sobe **com a sessão de quem criou cada ação** (token em vigor, nunca o bootstrap em cache — N1), envia o payload que o servidor lê (`report_id`/`category_key`/`spent_at`/`amount`), na ordem exigida (relatório antes de item/envio), grava o `serverId` do `report.create` no relatório e nas dependentes, dá `expense_sync:write` ao `field_technician`, traduz o conflito por ação e o 503 como reenvio seguro, e mantém o comprovante fora do lote (nunca derruba o lote). Fecha o **item 30** do portão (`Ω6R-QUA-001`, `PLANO_SAN3.md`).

## Contexto / fontes de verdade

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/`, `agent-orchestration/codex/log-execucao.md`, `PROJECT_MEMORY.md`.
- Plano canônico: `agent-orchestration/omega/planos/B-REENVIOS-plano.md` (§0, §B, §D, §E, §F, §G).
- Pré-requisitos cumpridos na `main`: 1º PR do corte (`B-O6R-11`, #483 `7c89c73b`), `B-O6R-03a` (recibo durável) e `B-FILA-USUARIO` (#512 `1dab0957`).
- Não depende do `B-O6R-04b` (a dependência foi corrigida para `B-FILA-USUARIO`, §D).

## Regras (negócio · permissão · segurança)

- Propriedade **P-DESPESA-REENVIADA** (PB1–PB6):
  - **PB1:** o replay usa o cliente autenticado; sem token não marca `syncing` nem consome tentativa.
  - **PB2:** `item.create` sai com `report_id` (UUID de servidor), `category_key`, `spent_at`, `amount`; `submit` com `report_id`; contrato provado contra o parser real do backend.
  - **PB3:** `item.create`/`submit` só saem depois de o relatório ter `serverId`; `report.create` → `processed` grava o `serverId` e copia às dependentes.
  - **PB4:** `field_technician` ganha `expense_sync:write` + espelho do `technician` menos `expense_receipt:attach`; `auditor` continua 403.
  - **PB5:** conflito por ação → `conflict` com texto PT-BR por código; `ApiServerError(503)` → `pending` sem `retryCount+1`; `ApiUnauthorizedError` → `conflict`.
  - **PB6:** o app não enfileira `expense_receipt.attach`; legado enfileirado vira `conflict` visível; o comprovante local fica guardado (sobe no `B-RDV-COMPROVANTE`).

## Escopo PERMITIDO

- `src/modules/core-saas/permissions/catalog.ts` (só as 5 linhas no bloco `field_technician`) + `tests/fixtures/role-catalog-contract.snapshot.json` (regenerado pelo guard)
- `tests/b-o6r-03b-field-technician-expense-sync.test.ts`, `tests/b-o6r-03b-expense-payload-contract.test.ts` (NOVOS)
- `mobile/flutter_app/lib/core/sync/{sync_providers,sync_replay_service,sync_resolution_side_effects}.dart` (nas faixas de B4)
- `mobile/flutter_app/lib/core/network/api_contracts.dart` (só `ExpenseSyncActionTypes.backendSupported`)
- `mobile/flutter_app/lib/features/expenses/data/{expense_repository,expense_sync_entity_updater}.dart`
- `mobile/flutter_app/lib/shared/ui/sync_screen.dart` (só as 2 linhas do gancho)
- `mobile/flutter_app/test/core/sync/bo6r03b_*`, `test/features/expenses/bo6r03b_*`, `test/features/expenses/expense_receipt_test.dart`, `test/core/sync/sync_replay_service_test.dart` (casos do S-n1), `test/features/b093_evidence_camera_gallery_test.dart` (1 linha: `seedIfEmpty: true`, consequência do `load(seedIfEmpty: false)` fora de demo)
- `docs/mobile-sync-contracts.md`, `docs/api.md`, `RBAC_MATRIX.md` (nota), `docs/revisoes/SAN3/PLANO_SAN3.md`, `docs/revisoes/REENVIOS/B-O6R-03b-dev.md`, `agent-orchestration/**`

## Escopo PROIBIDO

- `src/modules/expense-management/**` · `prisma/**` · `frontend/**` · `Kpis/**` (KPI congelado) · `pubspec.*` · lockfiles JS · `.github/**` · `CLAUDE.md` · `AGENTS.md`
- `mobile/flutter_app/lib/core/sync/{sync_models,sync_queue_repository,sync_user_scope,auto_sync_coordinator,sync_queue_reclaim_service,sync_conflict_resolver,sync_stalled_resolver}.dart`
- `mobile/flutter_app/lib/features/expenses/ui/**` · `mobile/flutter_app/lib/features/{work_orders,checklists,inventory,prestador}/**`

## Bateria de validação

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test --reporter compact
cd ../..
npm run check
npm run lint
npm test
npm run build
node scripts/migration-transaction-guard.mjs
git diff --check
git diff --name-only origin/main
```

## KPIs no próprio PR (§C3)

- **KPI congelado** (`D-GOV-PROPORCIONAL` item 5): `Kpis/**` permanece intocado; contagens reais (N_f → M_f, N_b → M_b) registradas no diário e no PR.

## Junta (§C7)

- **Nível:** junta completa (inspetor + 3 cadeiras, unanimidade — dinheiro + permissão), sem cadeira de banco PostgreSQL obrigatória (opcional para a regressão do 03a).
- **Pré-revisão e junta:** Claude em identidades distintas (`D-UM-FAZ-OUTRO-VERIFICA`).
- **Diário / voto 00-dev:** `agent-orchestration/omega/juntas/votos/B-O6R-03b/00-dev.md` (espelho de `docs/revisoes/REENVIOS/B-O6R-03b-dev.md`).

## Rastreabilidade (§C6)

- **ID:** `B-O6R-03b`
- **PR #:** preenchido após `gh pr create`
- **Merge commit / Approved head:** `null` na autoria → backfill pós-merge
- **Gate:** item 30 (`PLANO_SAN3.md` §4.1, `Ω6R-QUA-001`)
