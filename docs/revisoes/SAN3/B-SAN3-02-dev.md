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
| 16 | 1º Docker: `teste-linux.sh … "node --test … atomic-db drill-db"` (Postgres 16 descartável, rede própria, removido pelo nome) | atomic **17/17**; drill 4/5 — T-D(a) falhou por ARNÊS: `contype` é tipo `char`, que o `$queryRawUnsafe` do Prisma não desserializa | falha de arnês, não de produto (lição do 03a: nunca contar como vermelho funcional); corrigido com `contype::text` |
| 17 | `git diff --check origin/main...HEAD` | ec 0 | limpo |
| 18 | `git grep -n isConflictError -- src/modules/work-order-financials` (critério do B1) | 1 linha, só o COMENTÁRIO que diz que ele saiu; 0 usos | B1 cumprido |
| 19 | palavras de catálogo do ratchet (`GRANT`, `REVOKE`, `OWNER TO`, `CREATE/ALTER/DROP ROLE`) nas 2 suítes novas | 0 | o `db-catalog-write-guard` não precisa de entrada nova; papel efêmero só pelo `createEphemeralRole` do arnês |
| 20 | memória de commit livre antes do 2º Docker (o lote) | **7,4 GB**; 0 contêiner de teste vivo | liberado |
| 21 | LOTE no contêiner descartável (`teste-linux.sh … "bash tmp-san302/lote.sh"`, uma subida): atomic 3× | **17/17 · 17/17 · 17/17**, 0 skip, ~12,3 s cada | estabilidade: denominador constante |
| 22 | drill `work-order-invoicing-migration-drill-db` | **5/5** | T-D(a)–(e) verdes, inclusive a ponta B do down (23505) |
| 23 | regressões `-db` do financeiro (`financial-title-invariants`, `financial-pay-title-atomic`, `cheque-clear-bounce-atomic`, `financial-entry-reverse-restore`, `financial-entry-delete-reverse-race`, `financial-period-close-write-race`, `pg-barrier-scoped`) + `financial-period-lock-guard` | **57/57** | sem regressão |
| 24 | mutações de BANCO (`tmp-san302/mutar-db.mjs`: cópia + md5 + restauro conferido; base NOVA migrada para as que mexem na migração) | tabela "Mutações — banco": 14 vermelhas; M11 (1ª forma) sobreviveu como mutante EQUIVALENTE | ver nota da M11 |
| 25 | delta de drift (B4) + M27 (`tmp-san302/drift.sh`): `migrate diff --from-config-datasource --to-schema --script` na base até a main (schema da main) e na base até o head | main 217 linhas · head 220; **delta = 1 linha**: `> ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"`. Coluna e chave auxiliar NÃO aparecem (modeladas). M27 (sem `parent_title_id` no schema): o delta ganha `DROP COLUMN "parent_title_id"` → **VERMELHA**; restauro md5 igual | **premissa do B4 FALSIFICADA em parte** (ver "Falsificações") |
| 26 | `npm test` na forma do job `backend` (contêiner: memory + `DATABASE_URL`, migrado) | `# tests 3750 · pass 3739 · fail 9 · skipped 2`; as 9 falhas são todas de `tests/traccar-dev-topology.test.ts`, que chama o binário `docker`, ausente no contêiner | artefato de AMBIENTE: o mesmo arquivo no host dá **12/12**; é de `c1485c94` (#426), fora do escopo |
| 27 | `npm run build` (contêiner e host) | ec 0 nos dois; `dist/` do host removido | build verde |
| 28 | 2º contêiner (memória livre **10,7 GB**, 0 contêiner de teste vivo): M11b | **VERMELHA** em T-D(b) e T-D(d) | M11 provada na forma não equivalente |
| 29 | host: `npm run lint` (= `check`) · `git diff --check` · `node scripts/sync-agent-agents.mjs --check` | ec 0 · ec 0 · "OK — 70 agentes, espelho consistente" | bateria final verde |
| 30 | registro APPEND-only: `decisoes.md` (+10 linhas, `D-SAN3-02-TITULO-COMPLEMENTAR` com (A) palavras do dono e (B) derivação/Q4) e `pendencias.md` (+35, 5 pendências novas) | `git diff --stat`: só inserções | §10 em parte (ver "O que fica para o orquestrador") |

### Mutações — banco (vermelho-controle)

| M | o que a mutação faz | teste que a matou | resultado |
|---|---|---|---|
| M2 | sem `FOR UPDATE` na seleção dos itens faturáveis | T-R2, T-R2b, T-Z2 (determinísticos) | VERMELHA. Nota B2: o T-A4 também ficou vermelho sob a M2, de forma não determinística; fica **fora da contagem** |
| M4 | `softDelete` sem `invoiced_at: null` | T-R1 | VERMELHA 1/17 |
| M4′ | `update` sem `invoiced_at: null` | T-R4 | VERMELHA 1/17 |
| M4″ | `softDeleteAllByWorkOrder` sem `invoiced_at IS NULL` (SELECT e UPDATE) | T-Z1 (+T-Z3) | VERMELHA 2/17 |
| M5 | índice de originais sem `parent_title_id IS NULL` (migração; base nova) | T-C1d, T-C6, T-D(c) (+T-A4, T-C9d) | VERMELHA |
| M5b | índice de originais removido sem substituto (migração; base nova) | T-A4b, T-C5-db | VERMELHA 2/17 |
| M6 | `findActiveByWorkOrder` Prisma sem `parent_title_id: null` | T-C9d | VERMELHA 1/17 |
| M11 (1ª forma) | down sem o `DROP INDEX … original_active_key` | — | **SOBREVIVEU, mutante equivalente**: o `DROP COLUMN parent_title_id` do mesmo down derruba o índice parcial que cita a coluna. Medido 5/5 |
| M11b | o down recria o índice VELHO com outro nome | T-D(b), T-D(d) | VERMELHA |
| M14 | a auditoria vaza `amount` | T-C8d | VERMELHA 1/17 |
| M15 | `markInvoiced` sem `invoiced_at: null` | T-K4b | VERMELHA 1/17 |
| M17 | decidir original × complementar ANTES do `FOR UPDATE` | T-A4 | VERMELHA 1/17 |
| M19 | `softDeleteAllByWorkOrder` volta ao `updateMany` sem ordem (forma da ref) | T-Z3 | VERMELHA 1/17; a premissa (b) do B3 valeu neste cluster |
| M22 | FK do pai de 2 colunas (migração; base nova) | T-D(a), T-D(e) | VERMELHA 2/5 |
| M27 | `parent_title_id` fora do `schema.prisma` | critério de drift (B4) | VERMELHA (`DROP COLUMN` no delta) |

**Contagem:** 28 identificadores (os 24 da v2 + M24, M19, M26, M27 da emenda) → **28/28 vermelhas**, a M11 pela forma M11b. O mandato diz "x/27", mas a consolidação da emenda v2.1 soma 24 + 4 = 28: divergência aritmética do plano, registrada.

## Testes (N medido)

| suíte | antes | depois | novos |
|---|---|---|---|
| `tests/work-order-invoicing.test.ts` (memória) | 16 | **35** | 19: T-A1, T-A3, T-A6, T-A7, T-M4b, T-M4c, T-C1m, T-C2, T-C3, T-C4, T-C9a, T-C9b, T-C10, T-C11, T-C5, T-PREC, T-PREC2, T-PREC3, T-C8 |
| `tests/financial-uow-memory.test.ts` | 8 | **9** | +1 |
| `tests/financial-uow-journal-classification.test.ts` | 35 | **46** | +11 gerados (`[P7][workOrderItems.*]`) |
| `tests/work-order-invoicing-atomic-db.test.ts` (novo) | — | **17** | T-A2, T-A4, T-A4b, T-R1, T-R2, T-R2b, T-R4, T-Z1, T-Z2, T-Z3, T-C1d, T-C6, T-C5-db, T-C9d, T-K4b, T-RLS, T-C8d |
| `tests/work-order-invoicing-migration-drill-db.test.ts` (novo) | — | **5** | T-D(a)–(e) |
| regressão: financials 31 · entries 78 · titles 64 · titles-routes 15 · financials-routes 8 · `-db` do financeiro 57 | — | verdes | — |

Nomeados novos: **42** (+11 gerados); o plano previa 41. O 42º é o **T-C8d**: em memória a auditoria é no-op, então a asserção de auditoria do T-C8 (e a morte da M14) foi para a suíte `-db`.

## Falsificações de premissa e divergências

1. **B4:** a emenda esperava no delta `DROP INDEX` do índice velho/novo e `DROP CONSTRAINT` do CHECK. Medido no Prisma 7.8.0: o `migrate diff` não emite drop de índice PARCIAL nem de CHECK; o delta real é só o `DROP CONSTRAINT` da FK do pai. Coluna e chave auxiliar ausentes e M27 vermelha provam o que o critério quer. Insumo da C2.
2. **`.github/workflows/ci.yml`:** o plano §6.1 permite apensar as 2 suítes novas à `SUITES` do `backend-postgres`; o mandato do dev proíbe `.github/`. Não toquei. Fica para o orquestrador.
3. **Contagem:** 28 mutações, não 27.
4. **Arnês:** `contype` é `char`, não desserializa no `$queryRawUnsafe` — `::text`.
5. **`foreignKeyTarget`** (`financial-title-prisma.repository.ts`) passou a ler o `meta` por `JSON.stringify` (antes `String(objeto)` dava `[object Object]`), para o ramo `parent` do P2003 casar no Prisma 7 + adapter-pg. Superconjunto; T-A4b (H2) verde.
6. O 422 `period_closed` da unidade é o `periodClosedError` do módulo de títulos (import dinâmico), o mesmo de hoje.

## O que fica para o orquestrador

- `ci.yml` (`SUITES`), item 2.
- Fechar `P-Ω4-3-INVOICE-ATOMIC` (T-A2), `P-Ω4-3-INVOICE-TOCTOU-DELETE` (T-R2), `P-Ω4-3-REFATURAR-DELTA` (T-C1d) depois do merge, com PR e SHA. As 5 pendências novas já estão apensadas.
- `status-geral.md`, `log-execucao.md`, inventário SAN3 e cópias de plano/emenda/críticas em `docs/revisoes/SAN3/`.
- Push e PR.

## Limpeza

`tmp-san302/` saiu do worktree (cópia em `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/san302/tmp-san302-copia/`). Os 3 contêineres `tl*` foram removidos pelo nome (sem `prune`); `dist/` do host removido. Base viva e portas 5432/6379/3000/5173/5050/8899 intocadas.

## Ciclo de revisão (19/10)

### Achado 1 — suítes novas na CI PostgreSQL

- **Comando:** duas rodadas adicionais de `tests/work-order-invoicing-migration-drill-db.test.ts` via `teste-linux.sh`, depois `git diff -U0 -- .github/workflows/ci.yml` e `git diff --check`.
- **Saída:** drill `5/5 · 5/5`, `fail 0`, `skip 0`; com a rodada `5/5` anterior, denominador constante em 3×. A atômica já tinha `17/17 · 17/17 · 17/17`, 0 skip. O diff local da CI mostrou somente:

  ```diff
  +          SUITES="$SUITES tests/work-order-invoicing-atomic-db.test.ts"
  +          SUITES="$SUITES tests/work-order-invoicing-migration-drill-db.test.ts"
  ```

- **Veredito:** regra de estabilidade do §7.6 atendida antes da edição; as duas suítes foram apensadas somente à lista `SUITES` do job `backend-postgres`; `git diff --check` verde.

### Achado 3 — M19 e T-Z3 em cópia isolada

- **Comando:** `git worktree add C:/Users/AMP/w-fix302 HEAD --detach`; `npm ci` próprio; M19 aplicada somente na cópia; suíte `work-order-invoicing-atomic-db` 3×; `EXPLAIN` do `UPDATE`; sonda 3× com `PGOPTIONS="-c enable_indexscan=off -c enable_bitmapscan=off"`; restauração; suíte 3×; `git worktree remove --force`.
- **Saída padrão com M19:** `17 tests · 17 pass · 0 fail · 0 skipped` nas três rodadas; T-Z3 ficou verde. O `EXPLAIN` mostrou `Index Scan using work_order_financial_items_tenant_id_work_order_id_idx`; o PATCH só de `notes` pode ser HOT e preservar o TID-raiz, logo a premissa física “i1 vai ao fim” não se materializou nesse plano.
- **Saída controlada com M19 e Seq Scan:** nas três rodadas, `17 tests · 16 pass · 1 fail · 0 skipped`; teste vermelho nominal nas três: `[T-Z3] ordem total do zero: com i1 movido para o fim do heap, o vencedor trava só i1; o zero espera em i1 (não em i2); sem 40P01/503`; falha por `deadlock detected` na asserção “nenhum 40P01/P2034/503”.
- **Saída após restauração, sem opção de planner:** `17 tests · 17 pass · 0 fail · 0 skipped` nas três rodadas; T-Z3 verde 3×; `git status --short` e `git diff --check` vazios na cópia antes de removê-la.
- **Veredito:** M19 ficou vermelha 3× seguidas quando a premissa (b) da emenda B3 foi materializada por Seq Scan, e o head restaurado ficou verde 3×. Fica registrado, sem esconder, que a forma padrão do cluster escolheu Index Scan e deixou a M19 sobreviver 3×; portanto o vermelho-controle depende do plano físico e não é prova independente do planner.
