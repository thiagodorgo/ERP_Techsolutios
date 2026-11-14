# B-SAN3-16 — a fila do app drena "pedir aprovação" e "não consegui iniciar" (item 5 do portão)

- **Tipo:** correção de perda de dado (KPI congelado, §C7 item 8(5): este PR não toca `Kpis/**`)
- **Fase:** Execution/Validation (A5)
- **Trilha:** app de campo (fila offline) e servidor (lote do app, linha do tempo da OS, Aprovações, avisos)
- **Data:** 2026-11-14
- **Branch:** `feat/mobile-fila-os-16` (a partir da `origin/main` `eeac48a3`, #564)
- **Autor:** `dev-16-cl`, Claude Opus 5.5, dev declarado, identidade nova (§C7 11(6)). O verificador é da outra casa
  quando houver crédito (§C7 11(1)), ou identidade Claude nova, com "sem cruzamento" declarado.
- **Plano:** `plano-B-SAN3-16.md` (com a Emenda 1 da crítica r1) e as Emendas 1, 1.1 e 1.1.1 da abertura, fora do repositório
  (`erp-pausa-2026-10-03/planos/`). Onde este comando e o plano divergirem, vale o plano (a emenda mais nova).
- **Diário:** `erp-pausa-2026-10-03/revisoes/b-san3-16/dev-16-cl.md` (cada comando e cada saída, para outro modelo reproduzir).

## Objetivo

1. **P1:** os dois pedidos saem do aparelho, com a lista fechada de campos e o corte nos limites do contrato.
2. **P2 e P3:** o servidor aceita os dois só do técnico da OS (permissão por ação, escopo por objeto antes de ler o corpo),
   grava o evento na linha do tempo da OS e não duplica no reenvio, também depois de reinício.
3. **Identidade do pedido (Emenda 1.1 §2):** cada pedido do técnico é uma aprovação própria na fila do gestor
   (`pedido-app:<hash>`); a fila é chamada antes do evento, e a falha dela é reenviável (503 `approval_unavailable`).
4. **P8 (P2 = B):** o "não consegui iniciar" avisa no sino quem atribuiu a OS por último, com chave durável; falha do aviso
   é reenviável (503 `notification_unavailable`).
5. **P5:** nenhuma ação pendente fica invisível: toda constante da fila tem rota; o que o aplicativo não sabe enviar vira
   erro visível, com "Tentar de novo" e "Descartar", e uma mensagem por causa.
6. **P7 (P3 = A):** na tela de atendimento, "Solicitar aprovação" abre o pedido (só com `work_orders:update`); "Ag.
   aprovação" e "Exceção" saem dos botões de status.

## Escopo permitido / proibido

A lista de permitidos da Emenda 1.1 §5 (trava T1 a T4, sem o porteiro, VER5-04), mais os imports do §7.3. Proibido:
`prisma/**`, `migrations/**`, `src/modules/work-orders/approval.*.ts` e `work-order.controller.ts` (item 67),
`src/modules/field-dispatch/**` e `src/modules/notifications/**` (só uso), `catalog.ts`, `RBAC_MATRIX.md`, as rotas e os
repositórios de OS, `mobile.routes.ts`, `work_order_repository.dart`, `work_order_remote_api.dart`,
`work_order_detail_screen.dart`, `work_order_approval_request_screen.dart`, `work_order_models.dart`, `router.dart`,
`lib/core/permissions/**`, `features/checklists/**`, `features/prestador/**`, `home_screen.dart`, a fila e o resgate
(`sync_queue_*`, `sync_action_store`, `sync_interrupted_reclaim`, `sync_providers`, `sync_user_scope`,
`sync_stalled_resolver`, `inventory_sync_replay_service`), `core/local_db/**`, `api_contracts.dart`, `frontend/**`,
`infra/**`, `.env`, lockfiles, `pubspec.*`, `Kpis/**`, `.github/**` fora da linha única do `SUITES=`, e todo teste existente.

## Ordem de merge

`B-SAN3-17` → **`B-SAN3-16`** → `B-APROVACOES-DURAVEIS` (item 67) → `B-O6R-04b`. A fatia do coordenador (F4b) espera o 17;
o censo do 07c é regerado pelo gerador depois do último rebase.

## Bateria

§6.2 do plano de 11/11 com as trocas da Emenda 1 §8 e os acréscimos da 1.1 §7.4: `npm run check` · `npm run lint` ·
`npm test` · `npm run build` · `node --test --import tsx tests/bsan316-fila-os.test.ts tests/o6r07c-census-guard.test.ts
tests/o6r07c-subresource-scope.test.ts tests/o6r07c-b-scope.test.ts tests/mobile-backend-contracts.test.ts
tests/mobile-work-order-assign-registry.test.ts tests/work-order-mileage.test.ts tests/approval-routes.test.ts
tests/approval.test.ts tests/db-fuso-utc-pontos-de-conexao.test.ts tests/mobile-gate-chave-catalogo.test.ts
tests/mobile-gate-chave-matriz.test.ts` · a suíte `-db` (`tests/bsan316-fila-os-db.test.ts` e as do 07c) em cluster
descartável, sob papel `NOSUPERUSER NOBYPASSRLS`, 0 pulo · (app) `dart format` dos arquivos tocados, `flutter analyze`,
os `bsan316_*`, as regressões do §3.5 e da Emenda 1 §5.4, `flutter test` inteiro · as 43 mutações, uma a uma · a trava
T1 a T4 · `node scripts/migration-transaction-guard.mjs` (0 migração nova) · `git diff --check`. Aceite pela forma real
(§C7 11(3)): o resumo de cada job da CI, nunca a cor.

## Revisão

Junta completa (perda de dado, permissão por ação e escopo por objeto, isolamento entre organizações). Pré-revisão com
roteiro fixo, inspetor, junta uma vez (C1 servidor, C2 app, C3 ponta a ponta e tela), triagem, um conserto, conferência,
merge e porteiro. A conferência visual do cartão do não enviável e da tela de atendimento é do Claude.
