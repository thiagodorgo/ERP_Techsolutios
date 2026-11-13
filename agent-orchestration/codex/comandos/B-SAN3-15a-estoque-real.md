# B-SAN3-15a — o estoque real do técnico e a contagem do web (itens 35 a 37 do portão, primeira parte)

- **Tipo:** feature (KPI congelado, §C7 item 8(5): este PR não toca `Kpis/**`)
- **Fase:** Execution/Validation (A5)
- **Trilha:** backend de estoque, web de estoque e app de campo (prestador)
- **Data:** 2026-11-11
- **Branch:** `fix/mobile-estoque-real-do-tecnico`
- **Autor:** `dev-15a-cl`, Claude Opus 5.5, subagente da sessão, nível menor, **dev declarado por exceção** (§C7 itens 6 e
  11(6): as duas contas Codex sem cota semanal até 16/11; a pré-revisão e a conferência serão de outro modelo, pela API).
- **Plano:** `plano-B-SAN3-15-v2.md` (só o 15a) com a Emenda 1 (requisitos da crítica r2), fora do repositório
  (`erp-pausa-2026-10-03/planos/`). Onde este comando e o plano divergirem, vale o plano.
- **Diário:** `docs/revisoes/SAN3/B-SAN3-15a-dev.md`.

## Objetivo

1. `GET /api/v1/mobile/technician/stock`: o estoque sob a responsabilidade do **ator**, com a custódia escolhida pelo
   servidor (profissional do cadastro ativo; a BASE para o ator `tenant_wide` sem cadastro, Pergunta 5 (a); senão
   `custody: null`), resposta mínima e `inventory.read` (P1, P1b, P2, P3).
2. No web, o fechamento de contagem que volta 2xx sem a contagem mostra erro, sem "Concluída" nem relatório zerado (P13).
3. No app, o estoque do técnico vem do servidor e funciona sem sinal, por organização e usuário (P4, P5, P6) — fatias F4
   e F4ui, que esperam o merge do #534 (banco do aparelho) e a maquete aprovada.

## Escopo permitido / proibido

O §4.1 do plano v2, por arquivo. Proibido: `prisma/**`, `migrations/**`, `catalog.ts`, `src/app.ts`, `src/modules/mobile/**`,
`src/modules/work-orders/**`, `src/modules/operator-profiles/**`, `router.dart`, `lib/features/work_orders/**`,
`lib/features/inventory/**`, `lib/core/sync/**`, `home_screen.dart`, `addSelection`, `removeMaterial`, `pubspec.*`,
lockfiles, `.env`, `infra/**`, `Kpis/**`, `.github/**` salvo a linha do `SUITES=`, `frontend/package.json` salvo o fim do
`test:smoke`.

## Bateria

Plano v2 §6.3 + §9 do `CLAUDE.md`: `npm run check` · `npm run lint` · `npm test` (forma do job `backend`) · `npm run build` ·
`node --test --import tsx tests/bsan315-technician-stock.test.ts …` · a suíte `-db` 3× na forma do job `backend-postgres` ·
`npm --prefix frontend run check` · `build` · `test:smoke` · (app, na F4) `dart format`, `flutter analyze`, `flutter test` ·
`git diff --check`. Aceite pela forma real (§C7.11(3)): o resumo de cada job, nunca a cor.

## Revisão

Junta completa (plano §5: leitura de estoque com isolamento entre organizações e entre técnicos, superfície nova, banco do
aparelho). Pré-revisão de outro modelo, inspetor, junta uma vez, triagem, um conserto, conferência, merge, porteiro.
