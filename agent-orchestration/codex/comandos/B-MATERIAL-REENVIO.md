# B-MATERIAL-REENVIO — O material lançado no app chega ao estoque, uma vez só, e a OS drena

- **Tipo:** feature (corte do `B-O6R-11` / `B-REENVIOS`, Bloco C)
- **Fase:** Execution / Validation (A5)
- **Trilha:** backend (Node.js + TypeScript) e mobile (Flutter)
- **Data:** 2026-11-12 a 2026-11-13
- **Branch:** `feat/mobile-material-reenvio`
- **Autores:** dev `dev-c-cdx`, `dev-c3-cdx`, `dev-c4-cdx` e `dev-c5-cdx` (Codex GPT-5.6 Sol, nível menor declarado) da C-F0 à C-F7; `dev-c6-cl` (Claude Opus 5.5, nível menor declarado, cobrindo a conta 1 do Codex) da C-F8 em diante. Plano `planejador-reenvios` e `corretor-cobranca-3110`; emendas `topo-emenda-c`, `topo-emenda-c21` e o orquestrador (C2.2 a C2.7).

## Objetivo

Toda peça lançada no app por um técnico numa OS que é dele vira, uma vez só e de forma durável, uma baixa na custódia de onde a peça sai (a do profissional que lança ou, para o gerente sem cadastro, a BASE); o que não é dele é recusado (ou, se já foi dele, vira conflito à espera de supervisor); remover a peça desfaz a baixa (estorno) ou tira a ação da fila; a linha do aparelho segue a ação em toda saída e a OS drena (propriedade **P-MATERIAL-REENVIADO**, PC1 a PC8).

## Contexto / fontes de verdade

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/`, `agent-orchestration/codex/log-execucao.md`, `PROJECT_MEMORY.md`.
- Plano canônico: `agent-orchestration/omega/planos/B-REENVIOS-plano.md`, §C, mais as Emendas C2, C2.1 a C2.7 (a mais nova prevalece onde divergirem).
- Pré-requisitos na `main`: 1º PR do corte do `B-O6R-11`, `B-FILA-USUARIO` (#512), `B-O6R-04a` (#389), `B-SAN3-15a` (#548).
- Fecha: `P-MOBILE-MATERIAL-SEM-REPLAY` (item 63 do portão), a metade material de `P-MOBILE-SYNC-FAILED-SEM-DESCARTE` e de `P-MOBILE-LINHA-CONFLICT-NAO-LIMPA`. Efeito em produção depois da porta do prestador (`B-SAN3-15b`, nota S11).

## Regras (negócio · permissão · segurança)

- Lote com `inventory.manage` **ou** `work_orders:update`; por ação, os 3 tipos antigos exigem `inventory.manage` e o material exige `work_orders:update`. Nenhuma permissão nova no catálogo.
- Escopo por objeto: `getForMutation` para o papel de campo, `get` para gestão; toda recusa nasce antes de qualquer baixa (`razaoIntacto`).
- Custódia pela regra 5(a) do dono (`resolveActorStockCustody`): estorno na custódia do movimento original; combustível e manutenção seguem na BASE (RN-BAIXA-04).
- Área contratada: módulo `inventory` no lote (403) e `work_orders` por ação (`rejected module_not_enabled`).
- Idempotência durável pelo índice de origem; o `Map` em memória dos tipos antigos não é lido nem escrito para o material.
- Nunca `tenant_id` do payload; nada de `tenant_id` na resposta pública (§2.8).

## Escopo PERMITIDO / PROIBIDO

Exatamente o §C4 do plano, com as ampliações das Emendas: E3 (rótulo e teste de rótulo, `mobile.routes.ts`, `tests/b-material-custodia.test.ts`), R-C21-01 (uma linha do `SUITES=` do `ci.yml`, autorizada pelo dono), E-C25.4/E-C26 (duas linhas do despacho em `mobile-inventory-sync.ts`) e E-C27.1 (uma linha em `lib/features/work_orders/data/work_order_repository.dart`). PROIBIDO: `prisma/**`, `catalog.ts` e o instantâneo do catálogo, `src/modules/work-orders/**`, `inventory.actor-custody.ts`, `src/modules/navigation/**`, `http_client.dart`, `lib/features/inventory/**`, `lib/features/checklists/**`, `lib/features/expenses/**`, `sync_replay_service.dart`, `sync_models.dart`, `sync_queue_repository.dart`, `sync_user_scope.dart`, `sync_conflict_resolver.dart`, `sync_stalled_resolver.dart`, `app_database.dart`, `pubspec.*`, lockfiles, `frontend/**`, `Kpis/**`, `CLAUDE.md`, `AGENTS.md`.

## Bateria de validação

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/core/sync/bmaterial_replay_test.dart test/features/prestador/bmaterial_remove_test.dart test/features/prestador/bmaterial_linha_test.dart test/core/sync/bo6r11_resgate_syncing_interrompido_test.dart test/core/sync/bo6r11_sync_action_labels_test.dart test/features/bsan313_os_purga_reconcilia_test.dart --reporter compact
flutter test --reporter compact
cd ../..
npm run check
npm run lint
npm run build
node --test --import tsx tests/b-material-*.test.ts tests/mobile-backend-contracts.test.ts tests/o6r07c-census-guard.test.ts
node scripts/migration-transaction-guard.mjs
git diff --check
```

A suíte backend inteira se mede pelo CI do head (Emenda C2.3), lendo o TAP de cada job: `gh run view <run> --job <id> --log | grep -E '^# (tests|pass|fail|skipped)|not ok'`.

## KPIs no próprio PR (§C3)

- **KPI congelado** (`D-GOV-PROPORCIONAL` item 5): `Kpis/**` intocado; contagens reais no diário e no PR.

## Junta (§C7)

- **Nível:** junta completa (inspetor + 3 cadeiras, unanimidade; permissão + dado de estoque + isolamento), com cadeira de banco em PostgreSQL descartável.
- **Diário / voto 00-dev:** `agent-orchestration/omega/juntas/votos/B-MATERIAL-REENVIO/00-dev.md`.

## Rastreabilidade (§C6)

- **ID:** `B-MATERIAL-REENVIO`
- **PR #:** 551
- **Merge commit / Approved head:** `null` na autoria → backfill pós-merge
- **Gate:** item 63 (`PLANO_SAN3.md` §4.1)
- **Status:** rascunho; o job `backend` do CI está vermelho pelo laço G do `o6r07c-subresource-scope` (`P-MATERIAL-LACO-G-SEM-RECEITA`), que aguarda emenda.
