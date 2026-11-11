# Comando — B-ASS-08 · fluxo ponta a ponta, webhooks, fila (outbox) e habilitação (canal DESLIGADO)

- **Bloco:** B-ASS-08 (Feature). **Ramo:** `feat/b-ass-08-outbox-webhooks`. **Plano (autoridade):** `C:/Users/thiag/erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md` §4.8 (+ §3.5/§3.6/§3.8, §12.2 D1-D6).
- **Objetivo:** demonstrativo fechado → cobrança no provedor → webhook → reconsulta → baixa automática → nota → "em dia"; outbox durável e idempotente, reprocesso, cancelamento, estorno/chargeback; `test-connection`/`enable`/`disable`. **Tudo desligado** até o dono ligar na tela.
- **Identidade do dev:** Claude Opus (DECLARADA). Cruzamento: verificação por modelo diferente (D-UM-FAZ-OUTRO-VERIFICA).

## Escopo desta execução — F0..F9 (dublê em memória; sem banco/Docker/migração)
- F0 comando + diário + N. F1 outbox + dispatcher (claim–chamada–registro). F2 router do webhook (decisão antes do parser, 404/401/413, limitador). F3 fakes emitindo webhook + verifyWebhook Asaas. F4 Focus NFe. F5 reconcile por `billing_statement_refs` + settlement + créditos. F6 chargeback/estorno parcial + `invoice_cancel`. F7 cobranças gravadas + `payment` do cliente + perfil → `ensureCustomer`. F8 fluxo ponta a ponta. F9 test/enable/disable/register-webhook/emitter/metrics.
- **PARA em F10 (migração M5):** `prisma/**` PROIBIDO sem autorização NOMINAL do dono (§C4). F10–F14 na continuação.

## Escopo permitido (F0..F9)
`src/modules/subscription-billing/{outbox/**, webhooks/**, charges/**, providers/provider-config.service.ts (test/enable/disable/register-webhook/emitter/metrics), statements/statement-settlement.service.ts, credits/credit.service.ts, invoice-sequence.service.ts}`, `tests/ass-08-*.test.ts`, `tests/helpers/fake-providers/*` (emissão de webhook; numeração), `docs/revisoes/ASSINATURA/B-ASS-08-dev.md`, este comando.

## Escopo proibido (nesta execução)
`prisma/**`, `src/app.ts`, `src/config/env.ts`, `frontend/**`, `src/integrations/**`, dependência nova, `Kpis/*`, qualquer host real em teste, gravar `enabled=true` por seed/código, guardar corpo de webhook (só digest). (app.ts/env/prisma/migração/drill = F10/F13, após o "sim" do dono.)

## Invariantes (não violar)
404 byte-a-byte antes do parser quando desligado (R-WH-1); `timingSafeEqual` sobre SHA-256, `===` proibido (R-WH-2); corpo do webhook nunca decide, sempre reconsulta (R-WH-4); organização pelo nosso `statement_id` via `billing_statement_refs`, nunca pelo payload (R-WH-5); `fetch` nunca dentro de `withTenantRls`/`withTenantRlsBudget` (R-OBX-1); provedor desligado não é alcançado (R-OBX-4); nenhum segredo/corpo em log (só digest, R-WH-7).

## Bateria (F0..F9)
Por fatia: `node --test --import tsx tests/ass-08-<tema>.test.ts`; ao fim desta execução `npm run check` + `npm run lint` + `npm run build` + regressões. (Testes `-db`/Docker e drill = F11/F12.) Diário incremental em `docs/revisoes/ASSINATURA/B-ASS-08-dev.md`.

## Emenda de escopo da 08b (10/11 23:19 SP; PR #530, ramo `feat/b-ass-08b-ligacao`; achado PR530-04 da pré-revisão)

Esta emenda é **registro**: ela escreve o escopo que a 08b de fato usou, com a autorização de cada parte, e não muda código para caber no comando antigo. As seções acima (F0..F9) ficam como estavam, são o histórico da parte 1 (#522, squash `d5ec1696`). Pela `D-EMENDA-ANTES-DO-CODIGO`, a emenda deveria ter vindo antes do código; ela vem agora, depois, e o atraso fica declarado aqui.

- **Bloco:** B-ASS-08b, a ligação do canal de cobrança: webhook montado no app, outbox ligada ao despacho real, perna da nota, cliente do provedor guardado (G12), índice do G14 e jobs do canal. O canal continua **desligado** (`BILLING_PROVIDERS_ENABLED=false`, e nenhum caminho grava `enabled=true`). **Dev:** Claude Opus 5.5, declarado. **Base:** `d5ec1696`.
- **Autoridade do escopo:** o PERMITIDO do `B-ASS-08` no plano mestre (`planos/B-ASSINATURA-plano.md` §4.8, l.543), mais estas autorizações:
  - `D-ASS08B-INDICE-G14` (dono, 09/11 ~22:20 SP, autorização nominal de migração): a migração do índice único parcial do G14;
  - `D-NOTA-CANCEL-CODIGO-PROVEDOR` (dono, 09/11 ~22:20 SP): o código de cancelamento da nota;
  - as decisões do orquestrador, registradas no diário:
    - (a) a perna da nota (só demonstrativo pago; competência = período; valor = `total_amount`), na linha `08b-(c2) NOTA`;
    - (b) o router montado em `/api/v1/webhooks/billing/:provider` antes de `express.json` e de qualquer `attachAuthenticatedActor`, com `next()` na decisão negativa, na linha `08b-(b2) 404 por construcao`;
    - (A), de 10/11: a 08b fica no §4.8, e (1)-(3), (5)b2, (5)b3 e o §11 (b)-(h) do plano `B-ASS-08-conserto-c2.md` passam ao `B-ASS-08c` (leitura do orquestrador `LEITURA-ORQ-1011-B-ASS-08C` em `controle/decisoes.md`; registro em `controle/pendencias.md`, `P-B-ASS-08c-OBRIGACOES-DA-08b`);
  - o §11 (a) e (j) do plano `B-ASS-08-conserto-c2.md`: o despacho do 2º conserto prevalece no merge, e cada SQL cru novo leva sua chave no T13;
  - o item opcional do orquestrador sobre o T11d/T11e (run 42734958946).
- **PERMITIDO real**, os 42 caminhos exatos. São os de `git diff --name-only d5ec1696...HEAD` mais este comando. Cada grupo traz a autoridade dele:
  - **No §4.8 (outbox/**, webhooks/**, charges/**, rota do webhook, `src/app.ts`, jobs, `tests/ass-08-*`, fake-providers, san3-05-leituras, docs, registro):**
    - `src/app.ts`
    - `src/infra/jobs/job-worker.bootstrap.ts`
    - `src/infra/jobs/job.registry.ts`
    - `src/infra/jobs/job.types.ts`
    - `src/modules/subscription-billing/subscription-billing.jobs.ts`
    - `src/modules/subscription-billing/charges/provider-customer.prisma.ts`
    - `src/modules/subscription-billing/charges/provider-customer.store.ts`
    - `src/modules/subscription-billing/outbox/channel.jobs.ts`
    - `src/modules/subscription-billing/outbox/channel.runtime.ts`
    - `src/modules/subscription-billing/outbox/invoice.dispatch.ts`
    - `src/modules/subscription-billing/outbox/outbox.dispatcher.ts`
    - `src/modules/subscription-billing/outbox/outbox.prisma.ts`
    - `src/modules/subscription-billing/webhooks/reconcile.service.ts`
    - `src/modules/subscription-billing/webhooks/statement-refs.prisma.ts`
    - `src/modules/subscription-billing/webhooks/statement-refs.repository.ts`
    - `src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.ts`
    - `src/modules/subscription-billing/webhooks/webhook-runtime.ts`
    - `tests/ass-08-flow-e2e.test.ts`
    - `tests/ass-08-lock-order-db.test.ts`
    - `tests/ass-08-webhook-router.test.ts`
    - `tests/helpers/fake-providers/focusnfe.ts`
    - `tests/san3-05-leituras-de-plataforma-db.test.ts`
    - `docs/subscription-billing.md`
    - `docs/deployment.md`
    - `docs/revisoes/ASSINATURA/B-ASS-08-dev.md`
    - `agent-orchestration/controle/pendencias.md`
    - `agent-orchestration/controle/pendencias-indice.md`
    - `agent-orchestration/codex/comandos/B-ASS-08-fluxo-webhooks-outbox.md`
  - **Por `D-ASS08B-INDICE-G14`:**
    - `prisma/migrations/20260901000000_ass08b_provider_one_enabled_per_kind/migration.sql`
  - **Pela decisão (a) do orquestrador, a perna da nota.** A tabela `subscription_statement_invoices` é da M5 do §4.8, e o repositório dela não estava listado. Leitura declarada no diário, linha `08b-(c2) NOTA`:
    - `src/modules/subscription-billing/invoices/invoices.prisma.ts`
    - `src/modules/subscription-billing/invoices/invoices.repository.ts`
    - `src/modules/subscription-billing/invoices/invoices.types.ts`
  - **Testes da parte b com o prefixo `ass-08b-`.** É o mesmo bloco; leitura declarada de que `tests/ass-08-*` os cobre:
    - `tests/ass-08b-channel-flag.test.ts`
    - `tests/ass-08b-channel-handlers.test.ts`
    - `tests/ass-08b-channel-jobs.test.ts`
    - `tests/ass-08b-invoice-leg-db.test.ts`
    - `tests/ass-08b-invoice-leg.test.ts`
    - `tests/ass-08b-webhook-app.test.ts`
  - **Guards que ficam vermelhos pela superfície nova, ajustados no mesmo PR** (o precedente é o PERMITIDO do B-ASS-01, plano l.341):
    - o censo de vias, porque a rota do webhook muda de montagem: `tests/fixtures/o6r07c-classificacao-vias.json` e `tests/helpers/o6r07c-census.ts`;
    - o ratchet T13, pelo §11 (j) do conserto c2: `tests/san3-05-acessos-de-plataforma-guard.test.ts`;
    - os jobs novos do bootstrap: `tests/job-worker-bootstrap.test.ts`.
- **PROIBIDO (medido vazio no diff):**
  - `prisma/schema.prisma` e qualquer outra migração;
  - `src/config/env.ts`, `frontend/**`, `src/integrations/**`, `Kpis/*`;
  - lockfiles e dependência nova;
  - host real em teste;
  - gravar `enabled=true` por seed ou código;
  - guardar corpo de webhook (só o digest).
- **Conferência:** `git diff --name-only d5ec1696...HEAD` tem de ser igual à lista acima. Caminho fora dela é escopo não autorizado.

## Emenda 2 da 08b — o conserto da J-530 (11/11; plano `B-ASS-08b-conserto-530-v2.md` §6, com os requisitos de `crit-530-r2`)

Registro, como a emenda acima. O conserto único da reprovação da J-530 tem o PERMITIDO do §6 do plano v2, que é a autoridade
dele. Esta emenda acrescenta à lista acima os caminhos que o conserto tocou e que ela não tinha, cada um com a autoridade:

- **No §6 do plano v2:**
  - `src/modules/subscription-billing/statements/statement-settlement.service.ts`
  - `src/modules/subscription-billing/statements/statement.service.ts` (só o `afterWrite` de `recordProviderPayment` e o marcador `[INTX-09]`)
  - `src/modules/subscription-billing/statements/statement.repository.ts`
  - `src/modules/subscription-billing/statements/statement.prisma-runtime.ts`
  - `src/modules/subscription-billing/outbox/outbox.repository.ts`
  - `src/modules/subscription-billing/outbox/outbox.types.ts`
  - `tests/ass-08b-invoice-intent-db.test.ts`
  - `tests/ass-08b-invoice-intent.test.ts`
  - `tests/ass-08b-reconcile-reference.test.ts`
  - `tests/ass-08-chargeback-reversal.test.ts`
  - `tests/ass-08-reconcile-settlement.test.ts`
  - `agent-orchestration/controle/decisoes.md` (a `D-J530-G14-BRIEFING-X-CONTRATO`, §7 do plano)
- **Leitura do dev, declarada (§A6), no diário da 08b:**
  - `tests/san3-05-acessos-de-plataforma-guard.test.ts`: o T13 ficou vermelho pela leitura de `subscription_statement_invoices` dentro da transação do demonstrativo, a mesma razão pela qual o §6 permite ajustar os censos o6r07c; entra 1 chave, do gerador, com motivo (linha `530c-guards`);
  - `tests/san3-05-leituras-de-plataforma-db.test.ts`: a dubla de reconsulta passa a devolver a referência do demonstrativo, a mesma troca que o §5 manda fazer nas dublas de `tests/ass-08*` (linha `530c-F5`);
  - este comando (esta emenda).
- **PROIBIDO do plano v2, medido vazio:** `prisma/**` (a G14 intocada), `.github/**`, `Kpis/**`, `frontend/**`, `mobile/**`, `infra/**`, `.env*`, lockfiles; as travas do claim, o corpo de `#mutate`, `retry` e `markDisabledProvidersVisible`; a aritmética de dinheiro; `recordManualPayment`/`reverseManualPayment`; `src/app.ts`, `webhook.rate-limit.ts`.
- **Conferência:** `git diff --name-only d5ec1696...HEAD` tem de ser igual à lista da emenda acima somada a esta.
