# B-ASS-06 — Porta comum de pagamento + cliente HTTP + adaptador Asaas (canal desligado)

- **Tipo:** feature
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-08
- **Branch:** `feat/b-ass-06-porta-pagamento`
- **Autor:** `dev-ass06` (DeepSeek, nível menor declarado, esforço médio)
- **Plano (norma única):** `B-ASSINATURA` §4.6 + §3 (regras transversais) + §4.5 (cofre) + §12 (correções de 02/11, em especial §12.2 D3 e §12.4). Arquivo fora do repositório: `erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md`.

## Objetivo

Entregar a porta `PaymentProviderPort`, o cliente HTTP único (`BillingHttpClient`, único ponto de `fetch`), o adaptador **Asaas** e o servidor falso Asaas, provados contra `127.0.0.1:0`. **Nada liga ainda**: canal desligado (`BILLING_PROVIDERS_ENABLED=false`), sem rotas, sem outbox, sem webhooks, sem banco.

**Recorte do portão 1 + 1 (DONO 31/10; Iugu fora em 02/11):** este bloco entrega a porta + cliente HTTP + adaptador Asaas + falso Asaas. **Iugu e Mercado Pago ficam FORA** (o MP é do `B-ASS-15`). Requisitos que citam Iugu/MP valem só na parte Asaas e na parte comum (porta, cliente, guard, centavos).

## Contexto / fontes de verdade

- Plano: `B-ASSINATURA` §4.6 (porta, cliente, adaptadores, falsos, PERMITIDO/PROIBIDO, R-PAY-1..11, fatias, N/M, junta), §3.3 (centavos `toCents`), §3.9 (variáveis de ambiente), §4.5 (cofre `readSecretForProvider`), §12.2 (D3 chargeback) e §12.4 (1+1, débito/crédito/pix).
- O cofre do B-ASS-05 já está na `origin/main` (`src/modules/subscription-billing/vault/**`): os adaptadores leem o segredo só por `readSecretForProvider`.

## Regras (negócio · permissão · segurança)

- Token nunca em log, erro, query string nem corpo de resposta (`VaultSecret` não serializa; cliente HTTP nunca loga headers nem corpo).
- Nenhuma chamada a host real, nem em teste: tudo contra o falso em `127.0.0.1:0`, com `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS` só em `test`.
- Canal desligado = nenhum `fetch` (`channel_disabled` antes da rede).
- Dinheiro em centavos inteiros: `toCents(x) = Math.round(x * 100)`; nunca `Math.trunc`.
- Débito, crédito e Pix obrigatórios: Asaas débito só pela fatura (`billingType: UNDEFINED`).

## Escopo PERMITIDO

- `src/modules/subscription-billing/providers/{http/**, payment/**, provider.catalog.ts}`
- `src/config/env.ts` — só `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS` + o gate G-BILLING-LOCAL (omissão declarada do PERMITIDO do §4.6; o §3.9 manda a variável viver lá). `BILLING_WEBHOOK_PUBLIC_BASE_URL` fica para o B-ASS-08 (o B-ASS-06 não a usa)
- `tests/ass-06-*.test.ts`
- `tests/helpers/fake-providers/{asaas,shared}.ts`
- `tests/ass-06-no-external-calls-guard.test.ts`
- `docs/subscription-billing.md` (§Pagamento)
- `agent-orchestration/codex/comandos/B-ASS-06-porta-pagamento.md`
- `docs/revisoes/ASSINATURA/B-ASS-06-dev.md`

## Escopo PROIBIDO

- `outbox/**`, `webhooks/**`, `statements/**`, `src/app.ts`, `prisma/**`, `frontend/**`
- dependência nova
- qualquer host real em `tests/**` fora de `provider.catalog.ts` e `tests/helpers/fake-providers/**`
- dado de cartão em qualquer lugar
- `Kpis/**` (congelado — `D-GOV-PROPORCIONAL`)

## Passos de implementação

1. F1: guard sem rede (`tests/ass-06-no-external-calls-guard.test.ts`) primeiro; depois a porta (`payment-provider.port.ts`), tipos, `payment-money.ts` (`toCents`) e `billing-http.client.ts`.
2. F2: falso Asaas (`tests/helpers/fake-providers/asaas.ts` + `shared.ts`) e o adaptador (`payment/asaas/**`).
3. F3/F4: **não existem** (Iugu e MP fora pelo recorte 1+1).
4. F5: erros/limites/timeout (400 sanitizado, 429 `retryAfterMs`, timeout sem repetição, segredo não vaza).
5. F6: docs + bateria + PR (sem migração; KPI congelado; "não fazer merge").

## Bateria de validação

```bash
npm run check
npm run lint
npm test
npm run build
npm test -- tests/ass-06-no-external-calls-guard.test.ts
npm test -- tests/ass-06-porta-pagamento.test.ts
npm test -- tests/ass-06-asaas-adapter.test.ts
npm test -- tests/ass-06-errors-limits.test.ts
npm test -- tests/ass-06-money.test.ts
npm test -- tests/ass-06-webhook.test.ts
npm test -- tests/ass-06-env-gates.test.ts
git diff --check
```

## Junta

Completa (superfície externa + dinheiro), unanimidade de 3. C1 = R-PAY-1/2/8/10 (contrato e dinheiro), C2 = R-PAY-4/5/6/7 (fechado por construção), C3 = R-PAY-3/9/11 + regressão.

## Rastreabilidade

- **ID:** B-ASS-06
- **PR #:** pós `gh pr create`
- **Status:** `published_per_pr`
- **Sem migração.**
- **KPI congelado** (`D-GOV-PROPORCIONAL`).
