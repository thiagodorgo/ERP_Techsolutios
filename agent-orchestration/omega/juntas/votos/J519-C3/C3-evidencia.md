# J519 B-ASS-07 — Cadeira C3 (Claude Opus) — Evidência incremental (P1)
SHA: 3175ce3413aac9c16abb21b2c9de6461937eedaa
Lente: Fail-closed, segredo, R-NF-6/9/10/12 + regressão

## Medições (P1)
- `git diff --name-status <base>..HEAD` → 15 arquivos NOVOS (A) + 1 docs (M docs/subscription-billing.md). NENHUM .ts existente modificado. catalog/http-client/guard NÃO tocados → superfície de regressão ~nula. [veredito: escopo respeitado]
- `node --test --import tsx tests/ass-07-*.test.ts` → tests 27 / pass 27 / fail 0. [verde]
- `node --test tests/ass-06-no-external-calls-guard.test.ts` → 4/4 pass; guard contém /focusnfe\.com\.br/ (l.49) + node:http(s) import. [R-EXT-0 ativo]
- R-NF-6: T-NF-33 (canal off recusa antes da rede, recorded=0), T-NF-34 (localhost exige flag+test), T-NF-35 (token redigido em log/erro), T-NF-36 (cred ausente antes da rede) — todos verdes.
- R-NF-9: T-NF-41 (registerWebhook: authorization=webhook_secret do cofre, header X-Webhook-Token, url; lê só os 3 segredos por readSecretForProvider) + T-NF-41b (verifyWebhook timingSafeEqual SHA-256) — verdes.
- R-NF-10: T-NF-44 (getInvoicePdf → {source:public_url}; sem token na resposta; describe().pdfSource=public_url) — verde.
- R-NF-12: T-NF-50 (cancel envia justificativa, permanece processing) + T-NF-51 (erro_cancelamento em 200 → status:error) — verdes.
- VERMELHO-CONTROLE MUT1 (R-NF-12): erro_cancelamento→"cancelled" em vez de "error" → T-NF-51 FALHA (fail 1). Teste real.
- VERMELHO-CONTROLE MUT2 (R-NF-6 segredo): sanitizedErrorMessage sem redação → T-NF-35 FALHA (fail 1). Teste real.
- Regressão: `npm test` (suíte inteira) no worktree = 3835/pass 2729/fail 981. 936 fails = "@prisma/client does not provide export Prisma" (client não gerado no worktree); resto ECONNREFUSED (Redis/Postgres ausentes). Todos os 27 T-NF-* passaram DENTRO do run. 0 fail no bloco. Fails são ambiente (mais que os 7 do orquestrador porque falta prisma generate + Redis + Postgres aqui), não regressão. CI Linux VERDE (fato do orquestrador).
- AJUSTE (segredo, dentro-do-bloco): sanitizedErrorMessage redige só o segredo INTEIRO (api_token, webhook_secret, e o JSON completo do certificate); se um erro do provedor ecoasse só o campo interno `password`/`pfxBase64` do certificado, não seria redigido. Repro teórico (provedor real não ecoa senha de cert em erro de registro); não há teste/caso que demonstre vazamento real → não bloqueia.
