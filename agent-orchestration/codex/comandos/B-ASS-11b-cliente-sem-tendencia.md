# B-ASS-11b — o cliente sem a consulta de tendência (Parte R do item 62 do portão)

- **Tipo:** fix (retirada de rota do cliente; nenhuma linha nova de produção)
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-14
- **Branch:** `fix/ass-cliente-sem-tendencia`
- **Autor (dev):** `dev-62r-cl`, Claude Opus 5.5, **identidade de dev nova, declarada**. Não escreveu nem criticou o plano.
  Exceção declarada: o §8 da Emenda 1.1 pede Codex para a Parte R; o orquestrador designou este dev.
- **Plano (lei, a mais nova prevalece):** `erp-pausa-2026-10-03/planos/plano-B-ASS-11-emenda1.md` →
  `plano-B-ASS-11-emenda1.1.md` (§1.3, §3.2, §4.3, §6 e "Parte R — 3 fatias") → `plano-B-ASS-11-emenda1.1.1.md`.
  Arquivos fora do repositório. Onde este comando divergir da lei, vale a lei.
- **Nível de revisão:** **junta completa** (inspetor + 3 cadeiras, unanimidade). A trava casa `tenant` no nome de
  `subscription-billing.tenant.routes.ts` e é fail-closed (Emenda 1 §10).
- **KPI:** congelado (§C7 item 8(5)).

## Objetivo

A P12 (requisito do dono, 31/10) tira "da tela e do payload do cliente" os veículos rastreados e a tendência de 6 meses. A
decisão 8.2 do dono (13/11, `D-DONO-1311-RECOMENDACOES`) diz "a tendência sai". Hoje a `main` ainda entrega
`GET /api/v1/billing/subscription/usage-history`, com `trackedVehicles`, a qualquer papel com `billing:read`. Este bloco
retira essa rota e tudo o que só existia por ela. A rota `GET /billing/subscription`, a cadeia de permissão e a visão
principal não mudam uma linha. Depois da retirada, o caminho antigo cai no 404 padrão de `/api/v1` (`route_not_found`).

Fecha `P-ASS-USAGE-HISTORY-X-P12` (aberta e fechada neste PR). É **condição** do item 62, que só fecha com a tela
(`B-ASS-11`, Parte T) e com os comandos do §1.3 da Emenda 1.1 passando.

## Escopo PERMITIDO (Emenda 1.1 §6.1, por chave, nunca por número de linha)

- `src/modules/subscription-billing/subscription-billing.tenant.routes.ts`: o `router.get` de `` `${BASE}/usage-history` ``
  e o nome `buildUsageHistory` no import.
- `src/modules/subscription-billing/statements/subscription-view.ts`: `shiftPeriod`, `UsageHistoryRow`,
  `buildUsageHistory` e os imports de `daysInPeriod` e de `monthMeasurements`. O comentário do cabeçalho fica.
- `src/modules/navigation/navigation.registry.ts`: `"GET /api/v1/billing/subscription/usage-history"` em
  `relatedEndpoints` do item `tenant.billing`.
- `tests/ass-04-statement-routes.test.ts`: só o teste de título `T-ST-64`, reescrito.
- `tests/ass-11b-cliente-so-p12.test.ts` (novo).
- `tests/fixtures/o6r07c-classificacao-vias.json` e `tests/fixtures/san3-18-route-modules.json`: a chave da tendência,
  **só pelo gerador** (§6.1), depois do rebase e da retirada.
- `docs/subscription-billing.md`: o trecho `` · `GET /billing/subscription/usage-history?months=1..12` ``.
- Registro: este comando, `docs/revisoes/ASSINATURA/B-ASS-11b-dev.md` (novo), `agent-orchestration/controle/pendencias.md`,
  `pendencias-indice.md` (regenerado por `gerar-indice-pendencias.py`), `decisoes.md`,
  `agent-orchestration/docs/status-geral.md` e a l.146 de `docs/revisoes/SAN3/PLANO_SAN3.md`.

## Escopo PROIBIDO

- Todo o resto. Em especial: a cadeia de permissão e a rota principal do arquivo de rotas; `charges/**`, `frontend/**`,
  `prisma/**`, `.github/**`, `.env*`, lockfiles; os testes T-ST-29 a T-ST-33 e T-ST-63, que não mudam.
- Editar as 2 fixtures à mão.

## Fatias (Emenda 1.1 §8, cerca de 1 h 50 min)

- **R0 (20 min):** este comando; ramo; `npm ci` próprio; a regressão do §8.3 verde na `main`; T-R1 a T-R5 e o T-ST-64
  novo escritos e vermelhos.
- **R1 (55 min):** rebase; a retirada por chave; os 2 geradores (com o `printf '\n'` do o6r07c); a doc; `--numstat`
  colado (esperado `0 4` e `0 1`).
- **R2 (35 min):** bateria; as 4 mutações (MR-1 a MR-4); a lista do diff (§4.3); os comandos do §1.3 só se a tela já
  estiver na `main`; PR.

## Testes-dono

- `tests/ass-11b-cliente-so-p12.test.ts`: T-R1 (pilha do roteador = exatamente `GET /billing/subscription`), T-R2
  (`subscription-view.ts` por texto, 0 de `buildUsageHistory|UsageHistoryRow|shiftPeriod`), T-R3 (`tenant.billing` com 1
  endpoint), T-R4 (nenhuma chave das 2 fixtures com `usage-history`), T-R5 (a doc sem `usage-history`).
- `tests/ass-04-statement-routes.test.ts`, T-ST-64 reescrito: 404 `route_not_found` para o cliente com `billing:read`;
  `GET /billing/subscription` segue 200 com as 5 chaves.
- **Regressão que não muda e segue verde:** T-ST-29 a T-ST-33, T-ST-63, `tests/navigation-menu.test.ts`,
  `tests/san3-04a-menu-front-x-catalogo.test.ts`, `tests/san3-18-route-module-census.test.ts`,
  `tests/san3-18-menu-modules.test.ts` e `tests/o6r07c-census-guard.test.ts`.

## Mutações (âncora com `grep -cF` = 1 antes de cada uma)

| # | Arquivo | Âncora | Troca | Fica vermelho |
|---|---|---|---|---|
| MR-1 | `subscription-billing.tenant.routes.ts` | `  return router;` | inserir na linha de cima: ``  router.get(`${BASE}/usage-history`, handleAsyncRoute(async (_request, response) => { response.status(200).json({ data: [] }); }));`` | T-R1, T-ST-64, `san3-18-route-module-census` e `o6r07c-census-guard` |
| MR-2 | `subscription-billing.tenant.routes.ts` | `router.use(BASE, requirePermission("billing:read"));` | remover a linha | T-ST-31 |
| MR-3 | `navigation.registry.ts` | `relatedEndpoints: ["GET /api/v1/billing/subscription"],` | `relatedEndpoints: ["GET /api/v1/billing/subscription", "GET /api/v1/billing/subscription/usage-history"],` | T-R3 |
| MR-4 | `subscription-view.ts` | `export type TenantSubscriptionView = {` | inserir na linha de cima: `export type UsageHistoryRow = { readonly period: string };` | T-R2 |

## Bateria de validação

1. `npm run check` · 2. `npm run lint` · 3. `npm test` (o runner assume `CORE_SAAS_PERSISTENCE=memory`) · 4. `npm run build`
5. A regressão do §8.3 e o teste novo, em memória.
6. As 4 mutações, aplicadas como escritas e revertidas, com a saída vermelha no diário.
7. `git diff --name-only origin/main...HEAD` = exatamente a lista do §6.1 (§4.3); `git diff --check`.
8. `git diff origin/main...HEAD | grep -nE '^\+.*(C:[/\\]Users|/c/Users/)'` → 0 linhas (repositório público).

## Ordem de merge

**#566 → Parte R → Parte T** (Emenda 1.1 §3.2). A Parte R não fica refém do #566: se, com a R2 pronta, o #566 ainda
estiver aberto, a Parte R entra primeiro, e quem faz rebase e regenera as 2 fixtures é o #566.

## Rastreabilidade

ID `B-ASS-11b` · PR (a preencher) · status `in_progress`.
