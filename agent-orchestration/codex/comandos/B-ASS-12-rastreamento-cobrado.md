# B-ASS-12 — Rastreamento cobrado (item 65 do portão)

- **Tipo:** feature (bloco de DINHEIRO: muda o cálculo da linha de rastreamento do demonstrativo)
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-14
- **Branch:** `feat/ass-12-rastreamento-cobrado`
- **Autor (dev):** `dev-65-dp` (DeepSeek Pro, identidade de dev declarada). O planejador, o crítico e o
  verificador são de outra casa (§C7 item 11(1)); quem verifica depois é o Claude.
- **Plano (norma única):** `plano-B-ASS-12.md` + `plano-B-ASS-12-emenda1.md` (a emenda vence), fora do
  repositório, na pasta do orquestrador. Conferência da emenda: `ver-65-e1-dp.json` = CONFERIDO.
- **Nível de revisão:** junta completa (§C7 item 10(1)): muda cálculo de dinheiro e a regra de assinatura.
- **KPI:** congelado (§C7 item 8(5)); PR nenhum atualiza `Kpis/*`.

## Objetivo

Fazer o rastreamento entrar certo na cobrança mensal da organização: o adicional de rastreamento (Básico ou
Plus) vira a linha do demonstrativo com regra de dinheiro fechada, e nenhum adicional entra numa assinatura
sem preço. Critério do item 65: 2 add-ons; no máximo 1 vigente por assinatura; 1 linha no demonstrativo;
0 cobrança sem vínculo vigente. Fecha também a `P-ASS03-VEICULOS-SEM-DB`. Fora do bloco: o alerta
"rastreia sem adicional" (bloco menor depois do B-ASS-09) e o conflito filial × organização (segue aberto,
dono `B-ASSINATURA`).

## Regra da linha (Emenda 1, §E4.1)

1. Dia a dia: para cada dia com assinatura, o montador procura o adicional vigente naquele dia e a versão dele.
2. O regime do dia: sobrescrita por veículo → por veículo pelo preço combinado (zero = cortesia), qualquer que
   seja a unidade da versão; sem sobrescrita, versão fixa → fixa; sem sobrescrita, versão por veículo → por
   veículo pelo preço da versão (preço nulo → pulo `addon_without_price`).
3. Por veículo (P10, sem pro-rata): um preço só no mês, o do último dia nesse regime; `veículos × preço`.
4. Mensalidade fixa (P17): por trecho de vigência, `halfUpDiv(mensalidade × dias do trecho, dias do mês)`, e só
   se algum veículo teve vínculo no trecho.
5. A linha = por veículo + fixa; os dois regimes no mês somam (`mixed`).
6. Sem adicional no mês → 0, sem versão, `tracking: null`.
7. A medição (`trackedVehicles`) não muda; a organização vê só a quantidade, nunca preço.
8. Borda do vínculo inclusiva dos dois lados, em data de São Paulo.

## Escopo PERMITIDO (plano §5 + Emenda 1 §E12)

- `src/modules/subscription-billing/statements/statement.engine.ts`
- `src/modules/subscription-billing/statements/statement.inputs.ts`
- `src/modules/subscription-billing/statements/statement.service.ts` (o motivo de pulo `:28` e a função `pinOf`)
- `src/modules/subscription-billing/statements/statements.platform.routes.ts` (3 campos do DTO)
- `src/modules/subscription-billing/plans/plans.service.ts`
- `src/modules/subscription-billing/plans/route-validators.ts` (só a linha `:123`)
- `src/modules/subscription-billing/plans/subscriptions.service.ts`
- Testes novos: `tests/ass-12-tracking-charge.test.ts`, `tests/ass-12-tracking-addon-rules.test.ts`,
  `tests/ass-12-tracking-db.test.ts`, `tests/ass-12-tracking-routes.test.ts`
- Testes existentes: `tests/ass-04-statement-inputs.test.ts` (fixtures e o `pin`), `tests/ass-04-statement-service.test.ts:187`
- Docs e registro: `docs/subscription-billing.md`, `docs/revisoes/TRACCAR/PLANO_TRACCAR.md` (1 nota),
  `agent-orchestration/codex/comandos/B-ASS-12-rastreamento-cobrado.md`, `agent-orchestration/controle/`,
  `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md`,
  `docs/revisoes/SAN3/PLANO_SAN3.md` (só as linhas `:147` e `:330`)

### Acréscimos das Emendas 1.2, 1.2.1, 1.3 e 1.3.1 (o motivo `addon_without_price` na visão de custo; caso (a))

O que vale é a âncora de contagem 1 de cada script da emenda; o resto do PROIBIDO abaixo continua.
- Servidor (E12-S): `src/modules/subscription-billing/overview/overview.types.ts` (só a linha do `SubscriptionSkipReason`,
  que vira a lista `SUBSCRIPTION_SKIP_REASONS` e o tipo derivado; o resto de `overview/**` segue PROIBIDO);
  `statement.inputs.ts` (1 comentário); `tests/ass-09-subscription-amount.test.ts` (imports, T-SUB-5 e T-SUB-13);
  `tests/ass-04-statement-service.test.ts` (o laço do T-ST-13); `docs/subscription-billing.md` (1 frase);
  `API_CONTRACTS.md` (1 frase em "Base da assinatura").
- Tela (E12-T, só no caso (a), em `frontend/src/modules/platform/cloud-billing/`): `cloud-billing.types.ts` (o tipo),
  `cloud-billing.adapter.ts` (só o `SKIP_REASONS`), `cloud-billing.labels.ts` (os 2 rótulos),
  `views/cloudBilling.shared.tsx` (a dica, o predicado, o texto do grupo, a nota, o campo Assinatura e o membro do
  grupo), `views/CloudBillingViewA.tsx` e `views/CloudBillingViewC.tsx` (as dicas); `frontend/tests/ass-10b-estados.smoke.test.tsx`
  (1 import e o T-UI-3 no fim). O resto de `frontend/**` segue PROIBIDO.
- T-CTR-1 (Emenda 1.3, que revoga o item 2(a) da 1.2.1, e Emenda 1.3.1): `tests/ass-10b-contrato-overview.test.ts`
  (o comentário, os pisos, o `createProgram`, o `literalUnionsOf`/`typeMembersOf` pelo verificador e o teste da
  fixture) e `tests/fixtures/ass-12-tctr1-formas/{formas,fora,nao-resolvido}.ts` (novos).

### Acréscimos da Emenda 1.4 (o conserto da J-573: uma autoridade única para o preço do add-on)

- `src/modules/subscription-billing/plans/addon-pricing.ts` (novo); em `plans.service.ts`, `subscriptions.service.ts` e
  `statement.inputs.ts`, só os pontos que passam a perguntar à `resolveAddonPricing`.
- Testes novos `tests/ass-12-addon-pricing.test.ts` e `tests/ass-12-tracking-formas.test.ts`; acréscimos no fim de
  `tests/ass-12-tracking-charge.test.ts`, `tests/ass-12-tracking-addon-rules.test.ts`, `tests/ass-12-tracking-db.test.ts` e
  `frontend/tests/ass-10b-estados.smoke.test.tsx`; o título do T-SUB-13 em `tests/ass-09-subscription-amount.test.ts`.
- `docs/subscription-billing.md` ("Sem preço utilizável", a tabela das travas e a frase do `PUT`) e a nota do
  `docs/revisoes/TRACCAR/PLANO_TRACCAR.md` movida para depois do parágrafo da recomendação.
- Continuam PROIBIDOS: `plan-types.ts`, `statement.engine.ts`, `statement.service.ts`, `overview/**` e `frontend/src/**`.

## Escopo PROIBIDO

- `prisma/**` e qualquer migração; `src/integrations/traccar/**`, `src/modules/field-location/**`,
  `src/modules/telemetry/**`, `src/modules/vehicles/**`
- `src/modules/navigation/**`, `src/modules/platform/platform-modules.service.ts`,
  `src/modules/core-saas/permissions/**`
- `statement.prisma-runtime.ts`, `statement.types.ts`, `subscription-view.ts`, `statement.factory.ts`
- `charges/credits/invoices/metering/outbox/providers/vault/webhooks/platform-audit/**`, `overview/**`
- `plan-catalog.ts`, `prisma/seed.ts`, `frontend/**`, `mobile/**`, `Kpis/**`, `infra/**`, `.env`, lockfiles
- bloquear ingestão ou leitura de rastreamento por falta de adicional

## Bateria de validação

1. `npm run check` · 2. `npm run lint` · 3. `npm run build`
4. `node scripts/migration-transaction-guard.mjs`
5. Em memória: `tests/ass-12-tracking-charge.test.ts tests/ass-12-tracking-addon-rules.test.ts
   tests/ass-12-tracking-routes.test.ts tests/ass-04-statement-inputs.test.ts tests/ass-04-statement-engine.test.ts
   tests/ass-04-statement-service.test.ts`
6. Banco (Postgres descartável do dev): `tests/ass-12-tracking-db.test.ts` + as suítes `-db` vizinhas
   (`ass-04-statement-db`, `ass-04-statement-races-db`, `ass-02-plans-modules-db`, `ass-02-plans-rls-db`)
7. G3: `node --test --import tsx tests/db-fuso-utc-pontos-de-conexao.test.ts`
8. `git diff --check`
9. Mutações literais da Emenda 1 (EM1–EM26, M13–M16, M18–M24) aplicadas como estão escritas e revertidas com
   md5 igual, cada uma morta pelo teste-dono.

## Rastreabilidade

ID `B-ASS-12` · PR do bloco (rascunho até a pré-revisão) · merge commit e approved head (pós-merge) ·
status `published_per_pr`.
