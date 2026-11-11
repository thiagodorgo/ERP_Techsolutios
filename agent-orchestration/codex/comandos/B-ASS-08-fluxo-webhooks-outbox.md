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
