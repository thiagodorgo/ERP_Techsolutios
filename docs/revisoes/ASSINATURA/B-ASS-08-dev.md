# B-ASS-08 — diário de dev (incremental, P1)

Bloco **B-ASS-08** — fluxo ponta a ponta, webhooks, fila (outbox) e habilitação; **tudo desligado**.
Identidade de dev: **Claude Opus** (DECLARADA; ordem do dono "não espere o Codex, faça você mesmo").
Ramo `feat/b-ass-08-outbox-webhooks`, worktree `C:/Users/thiag/w-ass08`, a partir de `origin/main` (B-ASS-05/06/07 mergeados, head `7d8b2b98`).

**Esta execução: F0–F9 SOMENTE** (dublê em memória; sem `prisma/**`, sem Docker, sem migração).
**F10 (migração M5) aguarda autorização NOMINAL do dono** — `prisma/**` é PROIBIDO por padrão (§C4).
F10–F14 ficam para a continuação, após o "sim" do dono.

Cruzamento de modelo (D-UM-FAZ-OUTRO-VERIFICA): o dev é Claude; a verificação/junta é de modelo diferente (Codex/DeepSeek).
Invariantes (§4.8): webhook desligado = 404 byte-a-byte antes do parser; `timingSafeEqual` (`===` proibido); o corpo do webhook nunca
decide (sempre reconsulta); organização pelo nosso `statement_id` via `billing_statement_refs`, nunca pelo payload; `fetch` nunca
dentro de `withTenantRls`; segredo/corpo nunca em log (só digest); nenhum caminho grava `enabled=true`.

| fatia | comando | saída resumida | veredito parcial |
|---|---|---|---|
| F0 | node --test traccar-forward-auth | pass 9 fail 0 | baseline N: traccar-forward-auth=9; harness OK; prisma generate exit 0; comando e diário criados |
| F1 | node --test ass-08-outbox | pass 9 fail 0 | outbox repo + dispatcher claim-chamada-registro; R-OBX-1/2/3/4; mutações OBX-4 e OBX-1 vermelhas e revertidas; guard de texto (sem fetch em tx) |
| F2 | node --test ass-08-webhook-router | pass 8 fail 0 | router do webhook: 404 padrão antes do parser, 413, 401 sem motivo, limitador por IP e teto global, replay ON CONFLICT; mutação R-WH-1 (parser antes da decisão) vermelha e revertida |
| F3 | node --test ass-08-webhook-asaas | pass 5 fail 0 | fake Asaas emite webhook assinado; adaptador real verifica (timingSafeEqual); 200/401/replay; guard R-WH-2 (timingSafeEqual presente, sem === na comparação) |
| F4 | node --test ass-08-webhook-focusnfe | pass 2 fail 0 | fake Focus NFe emite webhook (X-Webhook-Token); adaptador verifica; external_reference=ref, id ausente → sha256(corpo); 401 em segredo errado |
| F5 | node --test ass-08-reconcile-settlement | pass 8 fail 0 | reconcile por billing_statement_refs (org pelo nosso id) + reconsulta (corpo não decide) + customer-id match; settlement monotônico D6 e excedente→crédito; mutações D6 (T-WH-31) e R-WH-4 (T-WH-21) vermelhas e revertidas |
| F6 | node --test ass-08-chargeback-reversal; npm run check | pass 5 fail 0; tsc OK | chargeback/estorno: D4 (desconta 1º do crédito), D3 (disputa não derruba em dia nem cancela nota), R-CB-1 charged_back, invoice_cancel só em reversão total; mutações D4 e D3 vermelhas e revertidas |
| F7 | node --test ass-08-charges-profile; npm run check | pass 5 fail 0; tsc OK | cobranças gravadas (G11); payment do cliente sem dinheiro (deep-key scan); charge_cancel; gate de perfil (billing_profile_missing + missing[]); mutação T-CHG-3 vermelha e revertida |
| F8 | node --test ass-08-flow-e2e | pass 1 fail 0 | e2e lado pagamento com adaptador Asaas REAL contra o falso: fechado→outbox+refs→cobrança(payUrl)→payment do cliente→webhook assinado→reconcile(reconsulta paid)→paid. Perna da NOTA (invoice_issue→authorized) diferida p/ a continuação (precisa do handler invoice_issue na outbox + reconcile de nota) |
| F9 | node --test ass-08-provider-enable; npm run check | pass 4 fail 0; tsc OK | gate de habilitação G14 fail-closed (8 casos negativos + MP manual) + guard R-CFG-2 (enabled:true só no serviço); mutação R-CFG-1 vermelha e revertida. DIFERIDO: persistência enable/disable, test-connection, register-webhook, emitter, metrics (precisam de repo/porta/rota B-ASS-05/06/07 fora do PERMITIDO; pareiam com M5/F11 e rotas/F13) |

## PAUSA 2026-11-09 21:12 UTC — F0-F9 prontas; F10 (migracao M5) aguarda autorizacao NOMINAL do dono

Head: ramo feat/b-ass-08-outbox-webhooks, 10 commits sobre origin/main 7d8b2b98 (B-ASS-07). Worktree C:/Users/thiag/w-ass08.

Feito (F0-F9, duble em memoria; sem prisma, sem Docker, sem migracao):
- F0 comando + diario + N (traccar-forward-auth=9).
- F1 outbox (outbox/) + dispatcher claim-chamada-registro: R-OBX-1 (fetch nunca em transacao), R-OBX-2 (backoff 1/5/15/60, 8a->FAILED, retry), R-OBX-3 (desligado nao roda), R-OBX-4 (provedor desligado nao e alcancado). Mutacoes OBX-4 e OBX-1 provadas vermelhas.
- F2 router do webhook (webhooks/): 404 padrao ANTES do parser (R-WH-1), 413, 401 sem motivo, limitador por IP + teto global (R-WH-6), replay ON CONFLICT. Mutacao R-WH-1 provada vermelha.
- F3 fake Asaas emite webhook assinado + adaptador real verifica (timingSafeEqual); guard R-WH-2.
- F4 fake Focus NFe emite webhook (X-Webhook-Token) + adaptador verifica.
- F5 reconcile por billing_statement_refs (organizacao pelo NOSSO id, R-WH-5) + reconsulta (corpo nao decide, R-WH-4) + customer-id match; settlement monotonico (D6/R-WH-3) + excedente->credito (R-SET-1). Mutacoes D6 e R-WH-4 provadas vermelhas.
- F6 chargeback/estorno: D4/R-SET-3 (desconta 1o do credito), D3/R-CB-2 (disputa nao derruba "em dia" nem cancela nota), R-CB-1 charged_back, invoice_cancel so em reversao total (R-SET-2). Mutacoes D4 e D3 provadas vermelhas.
- F7 cobrancas gravadas (charges/, G11) + payment do cliente sem dinheiro (deep-key scan, R-CHG-1) + charge_cancel + gate de perfil (R-PRF-1). Mutacao T-CHG-3 provada vermelha.
- F8 e2e lado pagamento com adaptador Asaas REAL contra o falso (R-FLX-1 parcial; perna da nota diferida).
- F9 (nucleo) gate de habilitacao G14 fail-closed (provider-config.service.ts) + guard R-CFG-2. Mutacao R-CFG-1 provada vermelha.

Testes: tests/ass-08-*.test.ts = 47 (pass 47, fail 0). npm run check / lint (tsc) limpo. Regressao: ass-06/ass-07 (importam os fakes editados) 48/48 verdes. git diff --check limpo. Escopo 100% dentro do PERMITIDO (sem prisma, app.ts, env.ts, frontend).

Falta (continuacao, apos o "sim" do dono):
- F10 migracao M5 (prisma/schema.prisma + prisma/migrations), 6 tabelas (billing_outbox, billing_webhook_events, billing_statement_refs, subscription_statement_invoices, subscription_statement_charges, billing_invoice_sequences), com BEGIN;/COMMIT; e node scripts/migration-transaction-guard.mjs. BLOQUEADO: prisma e PROIBIDO sem autorizacao NOMINAL do dono gravada no registro (C4). Texto pronto da autorizacao: plano 3.10.
- F11 repositorios Prisma das portas + testes -db (T-OBX-db-1/2, T-WH-db-1, T-SET-db-1, T-NF-db-1) + RLS (Docker).
- F12 drill M5 (tests/ass-08-channel-migration-drill-db.test.ts) (Docker).
- F13 montagem do router em src/app.ts (ANTES de express.json/pinoHttp, git add src/app.ts), 4 jobs com hora (dispatch/reconcile/poll-pending/poll-settled), env BILLING_WEBHOOK_PUBLIC_BASE_URL, classificacao san3-05, docs (threat model, roteiro de sandbox). Tambem: perna da NOTA do e2e (invoice_issue dispatch + reconcile de nota -> authorized/invoicePdfAvailable) e a persistencia de F9 (enable/disable/test-connection/register-webhook/emitter/metrics).
- F14 bateria + PR.

Proximo comando (ao retomar, com autorizacao do dono): gravar a autorizacao nominal da M5 no registro, entao F10 - prisma/schema.prisma (6 modelos) + prisma/migrations/<carimbo>_ass08_billing_outbox/migration.sql com BEGIN;/COMMIT;, e node scripts/migration-transaction-guard.mjs.

Limpeza: nenhum artefato temporario no repo (o helper de diario vive no scratchpad da sessao). Sem build artifacts gerados (so testes via tsx).
