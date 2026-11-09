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
