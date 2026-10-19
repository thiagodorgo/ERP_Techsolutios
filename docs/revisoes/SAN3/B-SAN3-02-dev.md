# B-SAN3-02 — relatório do dev (faturamento atômico e título complementar)

- **Identidade:** `dev-san3-02-opus` — Claude Opus 5.5 (`claude-opus-5-5`), nível menor, DECLARADO. Cobre o `dev-san3-02-cdx` (Codex GPT-5.6 Sol), que bateu o limite de uso antes de começar (`D-IAS-EXTERNAS-PRIMEIRO`); o worktree não existia e foi criado por mim.
- **Insumos:** plano v2 (`B-SAN3-02-plano.md`, md5 `ad4e92fad7b2006b8f11523460f018c3`, conferido), emenda v2.1 (prevalece), respostas do dono (Q1–Q3 = SIM; **Q4 = SIM** → FK de 4 colunas + índice auxiliar + CHECK), críticas r1 (Opus, Gemini) e r2 (Opus).
- **Ramo:** `fix/faturamento-atomico-e-delta`, worktree `C:/Users/AMP/w-san3-02`, a partir de `origin/main = 3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d`.
- **Restrições da cobertura (orquestrador, 19/10):** memória de commit livre medida antes de cada Docker (≥ 3 GB); no máximo 2 trabalhos Docker; código e testes de memória primeiro, `-db` e mutações de banco em lote no fim; commits locais, sem push.

## Evidência incremental (P1)

| # | comando | saída resumida | veredito |
|---|---|---|---|
| 1 | `git fetch -q origin && git rev-parse origin/main` | `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` | ref do plano, inalterada |
| 2 | `git worktree add -b fix/faturamento-atomico-e-delta C:/Users/AMP/w-san3-02 origin/main` | HEAD `3fbcaea2`; disco C: 19 GB livres | terreno criado |
| 3 | `npm ci` (próprio, sem junction) | 326 pacotes, ec 0 (aviso EBADENGINE node 20.19.5) | dependências do worktree |
| 4 | `DATABASE_URL=<loopback inerte :59999> npx prisma generate && npm run check` | `prisma generate` exige `DATABASE_URL` no `prisma.config.ts` (sem conexão); `check` ec 0 | baseline de tipos verde |
| 5 | `node scripts/run-backend-tests.mjs tests/work-order-invoicing.test.ts` (sem `CORE_SAAS_PERSISTENCE` → memory) | `# tests 16 · pass 16 · fail 0 · skipped 0` | **N = 16** reproduzido (plano §12) |
| 6 | idem `tests/work-order-financials.test.ts` | `# tests 31 · pass 31 · fail 0 · skipped 0` | regressão do módulo verde na base |
| 7 | migração `20260878000000_invoice_complementary_title` (Q4 = SIM: coluna + índice auxiliar + FK de 4 colunas + CHECK + índice de originais + DROP do velho) e `schema.prisma` (coluna scalar-only + `@@unique` auxiliar + comentário); `npx prisma validate` | "The schema at prisma\schema.prisma is valid"; `prisma generate` ok | §5 escrito |
| 8 | código D1–D5 + B1/B5 (unidade, passo 0, FOR UPDATE ordenado, decisão depois da trava, guarda do passo 7, `translateUnitFailure` estreito, 503 transiente, CAS, `softDeleteAllByWorkOrder` ordenado, validação do pai, DTO, auditoria `complementary`); `npm run check` | ec 0 | H1 confirmada (só os 4 pontos de construção da UoW; `tsconfig` cobre só `src/**`, então os testes não quebram o `check` — a dependência nova foi posta nos 3 arquivos de teste mesmo assim) |
| 9 | suítes de memória afetadas, antes dos testes novos | invoicing 16/16 · financials 31/31 · uow-memory 8/8 · journal 35/35 · entries 78/78 · titles 64/64 · titles-routes 15/15 · financials-routes 8/8 | nenhum contrato vivo quebrou |
| 10 | D4 nos testes da UoW: `financial-uow-memory` (+1 "undo-log desfaz carimbo e título juntos"), harness `journal-classification` (4º repositório, 11 casos gerados), `financial-entries` (só a dependência) | uow-memory **9/9** · journal **46/46** (35 + 11) · entries 78/78 | T-UOW verde |
| 11 | 19 testes novos de memória em `tests/work-order-invoicing.test.ts` | **35/35** (16 + 19) | K1/K2/K3/K4/precedência em memória verdes |
| 12 | mutações de MEMÓRIA, uma a uma, por `scratchpad/san302/mutar.py spec_mem.py` — cada uma aplicada numa cópia de trabalho do arquivo (backup + md5), teste citado rodado, restauro conferido por md5; `git status -- src prisma tests` vazio no fim | ver tabela "Mutações — memória" abaixo: **16/16 VERMELHAS**, 16/16 restauros com md5 igual | vermelho-controle de memória completo |

### Mutações — memória (vermelho-controle)

| M | o que a mutação faz | teste que a matou | resultado (fail/tests) |
|---|---|---|---|
| M1 | o `work` roda com o contexto capturado FORA da unidade (sequencial, sem rollback) | T-A1 (+T-A3, T-A6) | VERMELHA 3/35 |
| M3 | remove a guarda do passo 7 (`stamped !== items.length`) | T-A3 | VERMELHA 1/35 |
| M4m | o serviço devolve 404 cego quando o CAS casa 0 | T-M4b | VERMELHA 1/35 |
| M4i | InMemory sem a checagem de `invoicedAt` em `update`/`softDelete` | T-M4c | VERMELHA 2/35 |
| M5 | simulação do índice sem `parent_title_id IS NULL` | T-C1m, T-C2, T-C3 (+5) | VERMELHA 8/35 |
| M6 | `findActiveByWorkOrder` sem `parent_title_id IS NULL` (InMemory e Prisma) | T-C9a, T-C9b | VERMELHA 2/35 |
| M7 | simulação InMemory do índice de originais removida | T-C5 | VERMELHA 2/35 |
| M8 | journal de itens vira delegação pura | harness `[P7][workOrderItems.*]` (5 writes) | VERMELHA 5/46 |
| M9 | a variante usa `this.repository.create` em vez de `ctx.titles.create` | T-A1 (+3) | VERMELHA 4/35 |
| M13 | DTO sem `parentTitleId` (detalhe e lista) | T-C8 | VERMELHA 1/35 |
| M18 | remove `assertPeriodOpenShared` do passo 1 E da variante | T-PREC | VERMELHA 2/35 |
| M20 | sem o mapeamento transiente | T-A6 | VERMELHA 1/35 |
| M21 | `findActiveByWorkOrder` excluindo `status = cancelled` | T-C10 | VERMELHA 1/35 |
| M23 | remove o passo 0 | T-PREC2, T-PREC3 | VERMELHA 2/35 |
| M24 | `translateUnitFailure` por `statusCode === 409` (o `isConflictError` antigo) | T-A3, T-A7 | VERMELHA 2/35 |
| M26 | remove a validação do pai na variante | T-C11 | VERMELHA 1/35 |
| 13 | suítes `-db` novas escritas: `tests/work-order-invoicing-atomic-db.test.ts` (T-A2, T-A4, T-A4b, T-R1, T-R2, T-R2b, T-R4, T-Z1, T-Z2, T-Z3, T-C1d, T-C6, T-C5-db, T-C9d, T-K4b, T-RLS, T-C8d = 17) e `tests/work-order-invoicing-migration-drill-db.test.ts` (T-D(a), (b), (d), (c), (e) = 5); serviço da unidade sobre papel efêmero `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole`), vencedor cru com as peças do produto, barreira escopada por `application_name` | — | arnês pronto; execução no lote Docker abaixo |
| 14 | `RBAC_MATRIX.md` l.122 — só a frase (A7) | `git diff --stat RBAC_MATRIX.md` → `1 file changed, 1 insertion(+), 1 deletion(-)` | escopo da linha respeitado |
| 15 | memória de commit livre antes do 1º Docker | **8,1 GB** (≥ 3 GB); 0 contêiner de teste vivo (só `erp-postgres`/`erp-redis`, a base viva, intocada) | liberado subir 1 trabalho |
