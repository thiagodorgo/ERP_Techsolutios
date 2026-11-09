# B-ASS-06 — porta comum de pagamento, cliente HTTP e adaptador Asaas — relatório do dev

Plano: `B-ASSINATURA` §4.6 (+ §3, §4.5, §12) — fora do repositório, em `erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md`.

**Papéis (declarados)**
- **Dev:** `dev-ass06` (DeepSeek, nível menor declarado, esforço médio).
- **Revisão:** pré-revisão do Claude + **junta completa** (superfície externa + dinheiro, unanimidade de 3), com cadeiras Claude (cruzamento de modelo).

**Recorte do portão (1 + 1; Iugu fora em 02/11):** este bloco entrega a **porta + cliente HTTP + adaptador Asaas + falso Asaas**. Iugu e Mercado Pago ficam FORA. O MP é do `B-ASS-15`; a Iugu saiu do pacote (sem débito pelas docs oficiais).
- **T-PAY fora pelo recorte (1 + 1):**
  - **Iugu (removida do pacote em 02/11; não aceita cartão de débito e o dono exige débito + crédito + Pix):** T-PAY-8..14 (R-PAY-1 Iugu), T-PAY-23 (R-PAY-2 Iugu), T-PAY-29..31 (R-PAY-3 erros Iugu nas 4 formas), T-PAY-42 (R-PAY-9 webhook Iugu).
  - **Mercado Pago (sai para o B-ASS-15, fora do portão, mesma porta):** T-PAY-15..21 (R-PAY-1 MP), T-PAY-24 (R-PAY-2 MP), T-PAY-43 (R-PAY-9 webhook MP manual), T-PAY-46..47 (R-PAY-11 ts do MP).
  - **T-PAY-36..38 (R-PAY-2 / chargeback D3):** entregue só a parte Asaas (chargeback_disputed + dispute_won_pending); as partes Iugu/MP seguem com os respectivos adaptadores (Iugu fora, MP no B-ASS-15).

## F0 — comando e terreno

- **Worktree:** `C:/Users/thiag/w-ass06`, ramo `feat/b-ass-06-porta-pagamento`, a partir da `origin/main` `b153f219` (com o B-ASS-05 e o cofre).
- **Sem migração** neste bloco. **Docker:** nenhum.
- **Baseline medido (origin/main, `npm test` local sem `DATABASE_URL`):** 429 arquivos, **3760 testes** (2654 pass, 982 fail, 124 skipped; exit 1). Os 982 vermelhos são pré-existentes e serão re-medidos na `origin/main` na mesma forma ao final (um vermelho fora do bloco é comparado com a origin/main).
- **Premissa verificada no código:** `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS` e `BILLING_WEBHOOK_PUBLIC_BASE_URL` **não existem** em `src/config/env.ts` na `origin/main` (grep `ALLOW_LOCAL|WEBHOOK_PUBLIC` → vazio). O §3.9 manda as duas viverem no `env.ts` com gates; o PERMITIDO do §4.6 omitiu `src/config/env.ts`. **Leitura registrada:** incluo `src/config/env.ts` (só essas 2 variáveis + gates) no escopo, conforme §3.9.

## F1 — porta, dinheiro e cliente HTTP único (guard primeiro)

- **Arquivos:**
  - `providers/payment/payment-provider.port.ts`: a porta `PaymentProviderPort` (9 métodos, enum G9 com `chargeback_disputed` — D3; `disputeWonPending` no `getCharge`).
  - `providers/payment/payment-money.ts`: `toCents(x) = Math.round(x * 100)` com safe integer, nunca `Math.trunc`.
  - `providers/http/billing-errors.ts`: `channel_disabled`, `host_not_allowed`, `provider_validation`, `provider_timeout`, `provider_rate_limited`, `provider_not_configured`, `provider_unavailable`.
  - `providers/http/billing-http.client.ts`: `fetch` único, `AbortSignal.timeout` (60 s cartão / 15 s resto), allowlist do catálogo, `channel_disabled` antes da rede, 429 → `retryAfterMs`, log só `{provider, op, status, latencyMs}`.
  - `src/config/env.ts` (+1 variável + 1 gate): `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS` (default false; true fora de `test` recusa — G-BILLING-LOCAL). **Omissão declarada:** o PERMITIDO do §4.6 não lista `env.ts`, mas o §3.9 manda a variável viver lá. **`BILLING_WEBHOOK_PUBLIC_BASE_URL` ficou para o B-ASS-08** (o B-ASS-06 não a usa — o `registerWebhook` recebe a URL por parâmetro; e o gate rígido de produção quebraria o `T-ENV-1` existente do B-ASS-05).
- **Guard** `tests/ass-06-no-external-calls-guard.test.ts` = **4/4** (R-PAY-6): rede só em `billing-http.client.ts`; host real em `tests/` só nos `fake-providers`; `fetch`/`new URL` dos fakes sem host real.
- **Testes** `tests/ass-06-http-client.test.ts` = **4/4** (R-PAY-4/5/7): canal desligado → 0 requisição; host fora do catálogo → `host_not_allowed`; 127.0.0.1 só com flag em `test`; log sem token/headers/corpo.
- **Testes** `tests/ass-06-money.test.ts` = **3/3** (R-PAY-8): 0.29→29, 129.9→12990, 2999.99→299999; propriedade 1..299999; NaN/∞ lançam.
- `npm run check` verde.

## F2 — falso Asaas + adaptador Asaas

- **Arquivos:**
  - `tests/helpers/fake-providers/asaas.ts`: `node:http` em 127.0.0.1:0; rotas `/v3/customers`, `/v3/payments`, `/v3/payments/{id}`, `/v3/payments/{id}/refund`, `/v3/payments/{id}/pixQrCode`, `/v3/payments/{id}/identificationField`, `/v3/webhooks`; cenários `validation_400`, `rate_limited_429`, `timeout`, `customer_duplicate`; grava `recorded[]`.
  - `providers/payment/asaas/asaas.adapter.ts`: 7 operações de rede + `verifyWebhook`/`supportedMethods`/`describe`; headers `access_token` + `User-Agent`; segredo só por `readSecret`.
  - `providers/payment/asaas/asaas.state-map.ts`: mapa de estados (G9 + D3).
- **Testes** `tests/ass-06-asaas-adapter.test.ts` = **11/11**:
  - R-PAY-1 (7 operações): ensureCustomer (busca + cria com `notificationDisabled:false`), createCharge PIX/BOLETO/CREDIT_CARD (value em reais, `externalReference` = statement_id, pixQrCode/identificationField), getCharge, findChargeByExternalReference (acha + null), cancelCharge, refund, registerWebhook (`authToken` = segredo, `sendType: SEQUENTIALLY`).
  - R-PAY-7b: débito → `billingType: UNDEFINED` (nunca `DEBIT_CARD`).
  - R-PAY-7: `supportedMethods()` ⊇ {pix, credit_card, debit_card}.
  - R-PAY-2/D3: tabela de mesa dos 14 status + desconhecido (`chargeback_disputed`, `dispute_won_pending`; `REFUND_REQUESTED/IN_PROGRESS → unknown` — N4 removeu `pending_refund`).
- `npm run check` verde; guard 4/4.

## F5 — erros, limites, webhook e reconsulta

- **Arquivos:**
  - `tests/helpers/fake-providers/asaas.ts`: cenário DEFAULT por `startAsaasFake(defaultScenario)` (além do header `x-fake-scenario`); `shared.ts` destrói sockets no `close` (cenário `timeout` não pendura o fim do teste).
  - `tests/ass-06-errors-limits.test.ts` = **4/4** (R-PAY-3): 400 → `ProviderValidationError` sanitizada (sem token); 429 → `retryAfterMs=2000`; timeout → `ProviderTimeoutError` com 1 única requisição; credencial ausente → `provider_not_configured` antes da rede.
  - `tests/ass-06-webhook.test.ts` = **3/3** (R-PAY-9/10): `verifyWebhook` aceita o token do cofre e extrai `eventId/chargeId/externalReference/kind`; token errado/ausente/segredo ausente/body não-JSON → `ok:false`; reconsulta por referência acha a cobrança criada (sem cobrança → null).
  - `tests/ass-06-env-gates.test.ts` = **2/2**: `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS` default false e só em `test` (G-BILLING-LOCAL); produção + canal ligado exige `BILLING_WEBHOOK_PUBLIC_BASE_URL` `https://`.

**Mutações do plano (todas vermelhas, restauradas):**

| Mutação | Resultado |
|---|---|
| canal checado depois do fetch (R-PAY-4) | 1 fail (`tests/ass-06-http-client.test.ts`) |
| allowlist removida (R-PAY-5) | 2 fail (`tests/ass-06-http-client.test.ts`) |
| `fetch` direto no adaptador (R-PAY-6) | 1 fail (`tests/ass-06-no-external-calls-guard.test.ts`) |
| `DEBIT_CARD` enviado ao Asaas (R-PAY-7b) | 1 fail (`tests/ass-06-asaas-adapter.test.ts`) |
| só `RECEIVED` como pago (R-PAY-2) | 1 fail (`tests/ass-06-asaas-adapter.test.ts`) |
| `Math.trunc` no lugar de `Math.round` (R-PAY-8) | 2 fail (`tests/ass-06-money.test.ts`) |
| segredo do cofre ignorado no webhook (R-PAY-9) | 1 fail (`tests/ass-06-webhook.test.ts`) |
| headers no log (R-PAY-7) | 1 fail (`tests/ass-06-http-client.test.ts`) |

## F6 — docs, bateria e PR

- **Docs:** `docs/subscription-billing.md` ganhou a seção "Pagamento (B-ASS-06)" (porta, cliente HTTP, Asaas, centavos, ambiente, rollback).
- **Bateria (na forma canônica: Prisma gerado, sem `.env` — as suítes `-db` pulam):**
  - `npm run check` verde · `npm run lint` verde (≡ check) · `npm run build` verde · `git diff --check` limpo.
  - Suítes do bloco: **30/30** (`ass-06-*`: 11 asaas + 4 http-client + 4 guard + 4 errors + 3 money + 3 webhook + 1 env-gate).
  - `npm test`: **3968 testes** (3834 pass · **7 fail** · 127 skip; exit 1).
  - **Baseline `origin/main` `b153f219` na mesma forma:** **3938 testes** (3801 pass · 10 fail · 127 skip). **+30 testes = exatamente os 30 do bloco.**
  - Os **7 fails** do final são todos pré-existentes (core-saas-role-authority; 2 domain events de checklist; 3 Redis; writer SET EX). Os 3 fails a mais do baseline (runtime-role-guard `skip`, CLI senha ×2) passaram na execução final — **flakiness de tempo/processo filho, não relacionado ao bloco** (o bloco não toca esses módulos).
- **Sem migração.** **KPI congelado** (`D-GOV-PROPORCIONAL`). **Não fazer merge:** pré-revisão do Claude + junta completa (superfície externa + dinheiro, unanimidade de 3).

PRONTO PARA REVISÃO — PR #515 · head d0c0f90f8062285fdff1fc4a2c7a8ff2bd30a661 · ramo feat/b-ass-06-porta-pagamento

## CONSERTO PRÉ-REVISÃO — bateria e PRONTO (09/11, orquestrador Claude Opus terminou; dev do conserto = DeepSeek)
Conserto da pré-revisão `prerev-515-opus` (Emenda 1 ao §4.6): A1 (redirect manual), A2 (paidCents só quando pago), A3/A5/A6/A8, A4 (allowlist por provedor+ambiente, https), A9/A10 (mutantes), A11 (docs/env/contagem), A7 (pendência `P-ASS06-COBRANCA-CRIADA-SEM-ID`, dono B-ASS-08). Objeto de código: 0c1949c0 (DeepSeek fez o conserto; o Claude rodou a bateria e empurrou, por o DeepSeek estar no pico e o Codex fora até 15:32).
- **Bateria no objeto 0c1949c0:** `tests/ass-06-*.test.ts` 42/42; `npm run check` ec 0; `npm run lint` (=check) ec 0; `node scripts/migration-transaction-guard.mjs` 0 violações; `npm run build` ec 0; `git diff --check bdfbcd01..0c1949c0` limpo; 0 CR nos arquivos tocados.
- **CI:** o GitHub Actions está parado por cobrança; a junta usa o CI local (`ferramentas/ci-github.sh`) no head, mais a revalidação do próprio CI do GitHub quando o pagamento voltar.

PRONTO PARA JUNTA — objeto de código 0c1949c0 · PR #515
