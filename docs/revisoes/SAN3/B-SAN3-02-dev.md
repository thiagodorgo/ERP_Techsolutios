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
| M19 | `softDeleteAllByWorkOrder` volta ao `updateMany` sem ordem (forma da ref) | T-Z3 | VERMELHA 1/17 3× no planner padrão (Index Scan), com o T-Z3 plano-independente da emenda v2.2 §6 — ver a seção de 19/10 abaixo |
| M22 | FK do pai de 2 colunas (migração; base nova) | T-D(a), T-D(e) | VERMELHA 2/5 |
| M27 | `parent_title_id` fora do `schema.prisma` | critério de drift (B4) | VERMELHA (`DROP COLUMN` no delta) |

**Contagem consolidada pela emenda v2.2:** 30 identificadores (os 24 da v2 + M24, M19, M26, M27, M27b e M28) → **30/30 vermelhas**, a M11 pela forma M11b. O mandato anterior dizia "x/27" e a v2.1 somava 28; a v2.2 reconciliou o total em 30.

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
3. **Contagem:** a v2.1 tinha 28 mutações, não 27; a emenda v2.2 acrescentou M27b e M28, totalizando 30.
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

## Emenda v2.2 — aceite B4 e mutações M27b/M28 (19/10)

- **Terreno e cópia — comando:** `git -C C:/Users/AMP/w-san3-02 rev-parse HEAD`; medição de trabalhos por `docker ps --format '{{.Names}}'` agrupados sem os sufixos `-pg/-redis/-run`; `Win32_PerfFormattedData_PerfOS_Memory` (`CommitLimit - CommittedBytes`); `git worktree add C:/Users/AMP/w-fix302b HEAD --detach`; `npm ci` próprio. **Saída:** objeto `98df3c48a60b7f89e29222d78444eaf4a6092d6a`; 0 trabalhos/7,8 GB antes da cópia; antes do lote válido, 0 trabalhos/7,26 GB; antes da repetição nominal da M28, 1 trabalho alheio/7,37 GB, total 2 com o meu; 326 pacotes instalados, ec 0, sem junction. **Veredito:** terreno dentro de ≤2 trabalhos e ≥3 GB; base viva e portas publicadas não foram usadas.
- **B4 novo — comando:** no lote descartável de `teste-linux.sh`, `npx prisma validate`; `npx prisma migrate status` nas bases próprias main (112 migrations, sem `20260878000000`) e head (113); duas execuções de `prisma migrate diff --from-config-datasource --to-schema <schema> --script`, normalizadas para uma sentença por linha, seguidas de `comm -23/-13`. **Saída:** validate ec 0; ambos os status “Database schema is up to date”; main 71 sentenças, head 72; `DELTA_ONLY_MAIN` vazio e `DELTA_ONLY_HEAD` exatamente `ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"`. **Veredito:** aceite B4 v2.2 VERDE — delta nominal, uma e só uma sentença.
- **Controle do mecanismo — comando:** `grep -E 'DROP INDEX "(financial_titles_wo_direction_active_key|financial_titles_source_direction_active_key|authority_removal_requests_open_plate_key)"' main.norm.sql | wc -l`. **Saída:** `PARTIAL_DROP_INDEX_COUNT=0`. **Veredito:** confirmado que o schema engine 7.8.0 não inclui os três índices parciais conhecidos no diff da main.
- **M27b — comando:** cópia do `schema.prisma` sem `@@unique(..., map: "financial_titles_tenant_wo_direction_id_key")`; `prisma migrate diff` da base head para essa cópia; normalização e comparação com o diff da main. **Saída:** o delta mutante contém a FK scalar-only nominal e acrescenta `DROP INDEX "financial_titles_tenant_wo_direction_id_key"`; o schema rastreado não foi editado. **Veredito:** M27b VERMELHA pelo critério B4 novo.
- **M28 — comando:** na cópia isolada, SHA-256 da migração; retirada somente da sentença (4), `ADD CONSTRAINT "financial_titles_parent_requires_work_order_check" CHECK (...)`; `node --test --import tsx --test-reporter=tap --test-name-pattern='T-D\(c\)' tests/work-order-invoicing-migration-drill-db.test.ts`; restauração e SHA-256. **Saída:** SHA original `c8a80631bd9dbe7cb4cb9f8ab95b1d6ee748d0b20d64a32bef90e80386477ae4`, mutante `3591b24faa2d0033d83f343ec42efc725e64dba566889d8a367ed77f340d2a27`; T-D(c) `not ok`, exit 1, erro nominal `complementar sem OS: tinha de ser recusado pelo banco (23514)`; SHA restaurado igual ao original. A execução integral inicial do mutante também ficou vermelha (5/5), mas T-D(a)/(b) alteraram a base compartilhada do arquivo antes de T-D(c); por isso ela foi tratada só como corroboração, não como a prova nominal. **Veredito:** M28 VERMELHA em T-D(c) pela ausência do 23514, sem atribuir a prova ao 42703 contaminado da primeira forma.
- **Restauração — comando:** migração restaurada por cópia conferida por SHA; suíte integral do drill no mesmo lote, já sem a mutação; `git status --short -- prisma/schema.prisma prisma/migrations/20260878000000_invoice_complementary_title/migration.sql tests/work-order-invoicing-migration-drill-db.test.ts`; `git diff --check`. **Saída:** T-D(a)–(e) `5 tests · 5 pass · 0 fail · 0 skipped`; status e diff sem saída. **Veredito:** cópia restaurada e head novamente verde; T-Z3 e M19 não foram tocados.
- **Contagem:** era 28; com M27b e M28 passa a **30/30 mutações vermelhas** (M11 continua contada pela forma M11b).
- **Retomada P3 após a pausa — comando:** nova cópia `w-fix302d` no mesmo head, `npm ci` próprio e novo lote por `teste-linux.sh`, sem aproveitar conclusão não reexecutada. **Saída:** B4 repetiu `71` sentenças na main e `72` no head, delta só-head exatamente a FK nominal; controle dos parciais `0`; M27b acrescentou o `DROP INDEX` esperado; M28 morreu nominalmente em T-D(c) pela ausência do `23514`; drill restaurado `5/5`; SHA original/restaurado `c8a806…`. **Veredito:** conteúdo da seção confirmado. O SHA mutante acima foi corrigido para o valor desta reexecução (`3591b24…`); a diferença era só a forma textual de retirar a mesma sentença, não o comportamento medido.

## Emenda v2.2 §6 — T-Z3 independente do planner (19/10)

- **Por quê:** com o T-Z3 antigo (PATCH HOT em i1), a M19 sobrevivia 3× no planner padrão (Index Scan segue o TID-raiz da cadeia HOT) e só morria com Seq Scan forçado (seção "Achado 3" acima). A emenda v2.2 §6 manda consertar a PROVA, não o produto, e retira o fallback "M19 não derrubada → revisão estática" da v2.1 B3. Esse fallback não estava escrito neste relatório; não havia o que remover.
- **Conserto, só em `tests/work-order-invoicing-atomic-db.test.ts`:**
  - sai o PATCH;
  - `addItem` ganha `createdAt?`, passado ao `create`;
  - i1 nasce primeiro com `created_at` T0+1s e i2 depois com T0;
  - a premissa `ctid(i1) < ctid(i2)` é medida (página e lp, comparados como números), com até 5 tentativas e DELETE físico do par inválido; esgotadas as tentativas, o teste falha com `assert.ok` e a mensagem "arranjo físico não alcançado em 5 tentativas" (falha de verdade, nunca skip);
  - o vencedor trava i2, o 1º da ordem total, passa a barreira e depois trava i1;
  - as asserções ficam como estavam; o teste imprime os `ctid` e o `EXPLAIN (COSTS OFF)` da trava ordenada.

  Produto, Prisma e CI não mudam.
- **Verde, sem mutação — comando:** `teste-linux.sh C:/Users/AMP/w-san3-02 'for i in 1 2 3; do … node --test --import tsx --test-reporter=tap tests/work-order-invoicing-atomic-db.test.ts; done; PGOPTIONS=-c\ enable_indexscan=off\ -c\ enable_bitmapscan=off node --test … tests/work-order-invoicing-atomic-db.test.ts'`.
- **Saída:**
  - planner padrão: `17 tests · 17 pass · 0 fail · 0 skipped` ×3;
  - Seq Scan forçado: `17/17`, 0 skip;
  - T-Z3 `ok` nas 4 rodadas;
  - `ctid` na 1ª tentativa: `(0,28)<(0,29)`, `(0,49)<(0,51)`, `(0,28)<(0,29)`, `(0,49)<(0,51)`.

  Plano da trava ordenada:

  ```text
  LockRows
    ->  Sort
          Sort Key: created_at, id
          ->  Index Scan using work_order_financial_items_tenant_id_work_order_id_idx on work_order_financial_items   (padrão, rodadas 1-2)
          ->  Seq Scan on work_order_financial_items                                                                 (padrão rodada 3; Seq Scan forçado)
  ```

  **Veredito:** conserto VERDE 3× no planner padrão e 1× com Seq Scan forçado; `# tests` = 17 em todas as rodadas.
- **M19 — comando:** cópia isolada `w-fix302d` com o mesmo teste (`git hash-object` `e892e820…` nos dois worktrees) e a M19 na forma da ref (`softDeleteAllByWorkOrder` sem o `SELECT … ORDER BY created_at, id FOR UPDATE`, só o `updateMany`; hash `ff1eba3b…`). Rodei `teste-linux.sh C:/Users/AMP/w-fix302d 'for i in 1 2 3; do node --test … tests/work-order-invoicing-atomic-db.test.ts || echo …; done; node <sonda EXPLAIN>'` **sem `PGOPTIONS`**.
- **Saída:**
  - nas 3 rodadas, `17 tests · 16 pass · 1 fail · 0 skipped`;
  - o único vermelho nas 3 é `[T-Z3] ordem total do zero: ordem física (TID) ≠ ordem total (created_at, id) em qualquer plano; o vencedor trava o 1º da ordem total; o zero espera nele; sem 40P01/503`, por `DriverAdapterError: deadlock detected` na asserção "nenhum 40P01/P2034/503";
  - `ctid`: `(0,28)<(0,29)`, `(0,50)<(0,52)`, `(0,91)<(0,93)`;
  - o plano do cluster nas 3 foi Index Scan.

  Plano do `UPDATE` sem ordem, observado no cluster da suíte (para a ata):

  ```text
  Update on work_order_financial_items
    ->  Index Scan using work_order_financial_items_tenant_id_work_order_id_idx on work_order_financial_items
          Index Cond: ((tenant_id = …) AND (work_order_id = …))
          Filter: ((deleted_at IS NULL) AND (invoiced_at IS NULL))
  ```

  **Veredito:** M19 VERMELHA 3/3 **no planner padrão (Index Scan)**, justamente o plano em que a M19 sobrevivia com o T-Z3 antigo. Com isso, a prova deixa de depender do plano.
- **Restauro — comando:** `git restore` do repositório Prisma na cópia, seguido de `git hash-object`. **Saída:** `1a96234a73fbdf194e1c5151331ecb9d3a3b8c54`, igual a `HEAD:…`; temporários apagados; nenhum `tl*` vivo. Depois, a cópia foi removida com `git worktree remove --force`.
- **Contagem:** **30/30 mutações vermelhas** (a M19 continua a mesma; só a prova dela mudou); testes nomeados inalterados (o T-Z3 foi modificado, não acrescentado).
- **Pendência:** `P-SAN3-02-DEADLOCK-RESIDUAL` ganha o fato "T-Z3 plano-independente desde o commit desta seção" e continua aberta só para o residual do §11 R2 da v2 (escritores fora do bloco; OS não travada). O registro em `controle/` fica com o orquestrador.

## Ciclo 2 (20/10)

- **Identidade:** `dev-san302-ciclo2-opus` — executor Claude Code (subagente), modelo Claude Opus 5.5 (`claude-opus-5-5`), nível menor, DECLARADO. Identidade NOVA: não achou, não planejou e não votou neste bloco. Substitui `dev-san302-ciclo2-agyopus` (Antigravity), que caiu em 9 s por falta de crédito antes de tocar em qualquer coisa — medido: `git -C C:/Users/AMP/w-san3-02 status --short` só com os ` M` de EOL de `.agents/**` e os `??` de `agent-orchestration/omega/juntas/votos/B-SAN3-02/` (nada do dev).
- **Norma:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-ciclo2-auditoria-e-plano.md` (§4–§8), lido inteiro. Mandato: `C:/Users/AMP/erp-pausa-2026-10-03/prompts/prompt-dev-san302-ciclo2-agyopus.md` (sem push; logs em `C:/Users/AMP/erp-pausa-2026-10-03/dev302c2/`).
- **Formato:** cada passo = comando → saída → veredito, gravado ao ser medido (P1).

| # | comando | saída | veredito |
|---|---|---|---|
| 0.1 | `git rev-parse HEAD`; `git hash-object` da migração, do drill e deste relatório | `8e6a6c29b8a0aced5bf3968383aa9ef247019f46`; migração `aca531dacbbea3fa5b00a4a6312a162ba392c5e2`; drill `a562157fe88a97b412664e2815430f3f0f3a5458`; relatório `cf40d47609f405085f579a86ac5a795deabb1f5b`; `git ls-files --eol` → `i/lf w/lf` nos três | head = o esperado pelo mandato; migração = `aca531da` do plano §8 |
| 0.2 | `pwsh … FreeVirtualMemory/1MB`; `docker ps --format '{{.Names}}'`; `df -h /c` | 5,61 GB; só `erp-postgres`/`erp-redis` (0 trabalhos alheios); 13 GB livres | terreno dentro de ≥ 4 GB e ≤ 2 trabalhos |
| 0.3 | `bash …/teste-linux.sh C:/Users/AMP/w-san3-02 "node --test --import tsx --test-reporter=tap tests/work-order-invoicing-migration-drill-db.test.ts"` (log `dev302c2/00-baseline-drill.log`) | `# tests 5 · pass 5 · fail 0 · skipped 0`; `migrate deploy` da base própria 15,5 s; `teste-linux ec=0`; depois, `docker ps` só `erp-*` | baseline do drill = **5/5**, 0 skip (N = 5 do plano §6) |
| 0.4 | `npm run check` (log `dev302c2/00-check.log`) | `tsc -p tsconfig.json --noEmit` ec 0 | baseline de tipos verde |
| 1.1 | edição da migração (§7.1 a/b/c, pelo texto do §5): `BEGIN;` antes da (1), `COMMIT;` depois da (6), cabeçalho l.3-5 reescrito + bloco "TRANSAÇÃO EXPLÍCITA", linha `-- down (…)` com a invocação `psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>` e a razão (R2 do DBA) NA MESMA LINHA; `git hash-object` | migração `aca531da…` → `663d4071ecfb9b66dc10b17ebf65ea057bcbdbfc`; 0 CR; `i/lf` | §7.1(a)(b)(c) aplicados |
| 1.2 | edição do drill (§6): `rawStatements()` (cru, sem forma), `upStatements()` exige `BEGIN` 1ª, `COMMIT` última e 6 DDL entre elas, `downStatements()` inalterado, **T-D(f)** (k = 1..6 pelo CLI real com `--config` temporário; assere estado, nunca mensagem), teardown das bases novas e do diretório temporário no `after`; `git hash-object` | drill `a562157f…` → `7ba02c80f385e9365876a069a470890e32194bec` | §6 (1)(2) aplicados |
| 2 | `diff <(git show HEAD:<migração> \| grep -v '^\s*--' \| grep -v '^\s*$') <(grep -v '^\s*--' <migração> \| grep -v '^\s*$')`; e o mesmo para o rodapé depois de `^-- down` | up: só `0a1 > BEGIN;` e `14a16 > COMMIT;`; down: diff vazio (ec 0) | as 6 sentenças do up e as 6 do down **byte-iguais** às do objeto |
| 3 | `bash …/teste-linux.sh C:/Users/AMP/w-san3-02 "for i in 1 2 3; do node --test --import tsx --test-reporter=tap tests/work-order-invoicing-migration-drill-db.test.ts; done"` (log `dev302c2/03-drill-3x.log`) | 3 rodadas: `# tests 6 · pass 6 · fail 0 · skipped 0`; T-D(f) `k=1..6: atômico e convergente` em 4,4–6,0 s por k (~30–34 s o caso); o `npx prisma migrate deploy` do próprio `teste-linux.sh` aplicou a migração nova (com BEGIN/COMMIT) na base da suíte sem erro (senão ec 4); `teste-linux ec=0` | drill **6/6 × 3**, 0 skip, denominador constante; R6 medido: o `--config` em `os.tmpdir()` (`/tmp/san302-drill-*`) carrega — o fallback `node_modules/.cache` não foi preciso |
| 4 | `bash …/teste-linux.sh C:/Users/AMP/w-san3-02 "node --test --import tsx --test-reporter=tap tests/work-order-invoicing-atomic-db.test.ts"` (log `dev302c2/04-atomic-db.log`) — a base da suíte migrada pelo arquivo NOVO | `# tests 17 · pass 17 · fail 0 · skipped 0`; `teste-linux ec=0` | regressão `-db` do bloco **17/17** com a migração em transação explícita |
| 5.0 | cópia: `git worktree add C:/Users/AMP/w-dev302c2 HEAD --detach` (HEAD = `8e6a6c29`) + cópia dos 2 arquivos editados; `git hash-object` na cópia; script de mutação `dev302c2/mutar.mjs` (âncora única obrigatória; recusa partir de blob ≠ `663d4071`; restauro pelo arquivo guardado + conferência do blob) e lote `dev302c2/lote.sh`, ambos copiados para `.dev302c2/` (não rastreado) da cópia; ensaio a seco das 6 mutações no host | cópia em `8e6a6c29`, migração `663d4071…` e drill `7ba02c80…` (= os do worktree); as 6 âncoras únicas; 6 restauros `== esperado` | terreno de mutação isolado; o `npm ci` próprio da cópia é o do contêiner (`teste-linux.sh` exclui `node_modules` e roda `npm ci` dentro), sem junction; nada mutado em `w-san3-02` |
| 5.1 | `bash …/teste-linux.sh C:/Users/AMP/w-dev302c2 "bash .dev302c2/lote.sh"` — por mutação: `apply` → drill inteiro → (M28: também `--test-name-pattern='T-D\(c\)'`) → `restore`; no fim, controle restaurado (log `dev302c2/05-mutacoes.log`); antes: 5,45 GB, 0 trabalhos alheios | ver tabela "Mutações do ciclo 2" abaixo; controle restaurado `6/6`; os 6 restauros `blob 663d4071… == esperado`; `teste-linux ec=0` | M29, M29b, M29c **VERMELHAS** no T-D(f); M11b, M28, M22 **VERMELHAS** como no ciclo 1 |

### Mutações do ciclo 2 (vermelho-controle; drill inteiro, uma por vez, na cópia)

| M | mutação (blob mutante) | T-D(f) — estado medido depois do deploy falho | morte nominal (propriedade/forma) | cascata (NÃO conta como prova) | resultado |
|---|---|---|---|---|---|
| **M29** | sem `BEGIN;` e `COMMIT;` = objeto do ciclo 1 (`44e846fa…`) | **6/6 k vermelhos**: k=1 `column 1`; k=2 `column 1` + índice auxiliar; k=3 + 1 constraint; k=4/5 + 2 constraints — sempre com o antigo presente (o C2-01 reproduzido prefixo a prefixo) | T-D(f) (propriedade); T-D(b) por forma: `a migração abre com BEGIN (1ª sentença achada: "ALTER TABLE …"; 6 sentenças)` | T-D(d) (`2` esperado, `0` achado: a base ficou no estado do down deixado pelo T-D(b)); T-D(c)/(e) por `42703 column "parent_title_id" … does not exist` | **VERMELHA** (pass 1/6) |
| **M29b** | `COMMIT;` antes da (6) (`830ff2f6…`) | **só k=6 vermelho**: `column 1 · constraints 2 · os 2 índices novos · o antigo AUSENTE` (as 6 DDL aplicadas, a (6) fora da transação); k=1..5 atômicos e convergentes | T-D(f) k=6; T-D(b) por forma: `a migração fecha com COMMIT (última achada: "DROP INDEX …"; 8 sentenças)` | T-D(d), T-D(c), T-D(e) como na M29 | **VERMELHA** (pass 1/6) — k conforme o plano §6 |
| **M29c** | `BEGIN;` depois da (1) (`0dc3c00c…`) | **6/6 k vermelhos** (plano §6 previa só k=1): em todo k, `column 1 · constraints 0 · só o antigo` — a (1) é commitada em autocommit ANTES do `BEGIN`, qualquer que seja o prefixo da falha; o resto volta | T-D(f) (propriedade); T-D(b) por forma: `a migração abre com BEGIN (1ª sentença achada: "ALTER TABLE … ADD COLUMN …"; 8 sentenças)` | T-D(d), T-D(c), T-D(e) como na M29 | **VERMELHA** (pass 1/6) — mais forte que o previsto; ver "Divergências do ciclo 2" |
| **M11b** (re-execução) | o down recria o índice velho com outro nome (`9d5d67c5…`) | 6/6 atômicos (a mutação não toca o up) | T-D(b): `down: volta o índice velho` | T-D(d) (`2`/`0`), T-D(c)/(e) (`42703`) | **VERMELHA** (pass 2/6) |
| **M28** (re-execução) | sem a sentença (4), o CHECK (`888efd2a…`) | 6/6 k vermelhos (corroboração): k=1..5 em `depois da recuperação …` (constraints 1 ≠ 2), k=6 `falha injetada uma vez (DDL achadas: 5)` | **T-D(c) nominal** (`--test-name-pattern='T-D\(c\)'`, base nova): `complementar sem OS: tinha de ser recusado pelo banco (23514)` — o 23514 ausente; corroboração: T-D(a) `FK do pai e CHECK presentes`, T-D(b) `… 6 sentenças (achei 5)` | T-D(d), T-D(e) | **VERMELHA** (nominal pass 0/1, 5 skip por padrão de nome; inteiro pass 0/6) |
| **M22** (re-execução) | FK do pai de 2 colunas `(tenant_id, parent_title_id) → (tenant_id, id)` (`83e05a08…`) | 6/6 atômicos | T-D(a) (regex da FK de 4 colunas); T-D(e) `pai de outra OS: tinha de ser recusado pelo banco (23503)` | — | **VERMELHA** (pass 4/6) |

| # | comando | saída | veredito |
|---|---|---|---|
| 5.2 | `bash …/teste-linux.sh C:/Users/AMP/w-dev302c2 "bash .dev302c2/lote2.sh"` — T-D(d) NOMINAL (`--test-name-pattern='T-D\(d\)'`, base nova, sem a cascata do T-D(b)) sob M29, M29b, M29c e M11b (log `dev302c2/05b-td-d-nominal.log`) | M29: `a migração abre com BEGIN (… 6 sentenças)`; M29b: `a migração fecha com COMMIT (… 8 sentenças)`; M29c: `a migração abre com BEGIN (… 8 sentenças)`; M11b: `down: o índice velho de volta`; cada uma `pass 0 · fail 1 · skipped 5`; 4 restauros `== esperado`; `teste-linux ec=0` | T-D(d) morre **nominalmente** nas quatro (forma nas M29*, propriedade na M11b) — a morte do T-D(d) no lote 5.1 era cascata e não foi contada |

**Contagem do ciclo 2:** M29, M29b, M29c **3/3 VERMELHAS** pelo T-D(f) (comportamento) e por forma no T-D(b)/(d); M11b, M28, M22 re-executadas **3/3 VERMELHAS** como no ciclo 1. Total de identificadores do bloco: 30 (ciclo 1) + 3 = **33/33 vermelhas** (as outras 27 não se re-executam: nenhum arquivo que elas tocam mudou — plano §6). Nota: o plano do ciclo 2 (§6) escreveu "24 → 27"; a base certa é a contagem consolidada pela emenda v2.2 (30, l.84 deste relatório) — divergência de aritmética do plano, não de mutação.
| 6.1 | host: `npm run check && npm run lint && npm run build` (log `dev302c2/06-check-lint-build.log`); `git diff --check`; `git diff --stat` | ec 0 (os três `tsc -p tsconfig.json`); `git diff --check` ec 0; stat: migração `16 +-`, drill `239 ++…`, este relatório (append) — 3 arquivos | tipos e build verdes; diff limpo; só os 2 arquivos de código do §7.1 + o relatório |

### Divergências do ciclo 2 (fato × plano; nenhuma muda o código pedido)

1. **M29c morre em 6/6 k, não só em k=1** (plano §6 e §8). Medido no lote 5.1: com o `BEGIN` depois da (1), a (1) é commitada em autocommit antes de a transação abrir, e isso acontece em **todo** prefixo de falha — o catálogo fica com `column 1` e nada mais em k=1..6. A previsão do plano era um subconjunto do comportamento real; a mutação é mais visível do que o previsto, não menos.
2. **Cascata no drill inteiro.** Sob M29, M29b, M29c, M11b e M28, o T-D(b) falha DEPOIS de rodar o down na base compartilhada do arquivo, e os casos seguintes herdam essa base: T-D(d) acha `0` índices novos onde espera `2`, e T-D(c)/(e) quebram em `42703`. É a mesma contaminação registrada no ciclo 1 (seção "Emenda v2.2", M28). Por isso as mortes do T-D(c)/(d)/(e) nesses lotes **não** contam como prova. O T-D(d) foi medido de novo, nominalmente, no lote 5.2, e o T-D(c) da M28 também (lote 5.1). O T-D(f) não sofre a cascata, porque usa bases próprias (`<drill>_main`, `<drill>_k<k>`).
3. **Contagem de mutações:** o plano do ciclo 2 diz "24 → 27". A base consolidada pela emenda v2.2 é 30, então o ciclo 2 fecha em **33**. O erro é de aritmética do plano.
4. **`stderr` com P3009:** o plano manda conferir o `P3009` no stderr, e o T-D(f) faz isso no stderr mesmo, não na saída combinada. Verde em 6 k × 3 rodadas (passo 3).
5. **R3 do plano (base de dev que já aplicou a versão antiga):** `deploy` e `status` ficam inertes, como o planejador mediu no §5 item 7; esta medida não foi refeita aqui. Numa base dessas, só `prisma migrate dev` apontaria a migração como "modificada" e proporia reset. Isso é decisão do dono, e nenhum agente faz reset na base viva. A base viva não foi consultada (porta proibida).
6. **Bateria fora do host:** o `npm test` rodou no contêiner, na forma do job `backend` da CI. O worktree não tem `.env`, e as suítes `-db` só têm banco ali. No host, o `npm test` pularia as `-db` ou, com um `.env` local, alcançaria a base viva. `check`, `lint` e `build` rodaram no host.
7. **Sem push:** o mandato manda NÃO fazer push, então o commit é local. O plano §8 (7) pede "commit + push; CI 14/14", e isso fica com o orquestrador, que é quem empurra e mede a CI no head novo.

| # | comando | saída | veredito |
|---|---|---|---|
| 6.2a | `bash …/teste-linux.sh C:/Users/AMP/w-san3-02` (sem comando = `npm test` na forma do job `backend`; antes: 4,51 GB, 0 trabalhos alheios) — log `dev302c2/06-npm-test-tentativa1-ec125.log` | interrompido pelo cliente Docker: `level=error msg="error waiting for container: unexpected EOF"`, `teste-linux ec=125`, depois de 2298 `ok` e **0 `not ok`**; o trap removeu contêineres e rede (`docker ps -a`/`network ls` sem `tl*`); daemon de pé (`docker info` 29.6.1) | **falha de AMBIENTE**, não resultado: a suíte não terminou — não conta; refeito em 6.2b |
| 6.2b | repetição do 6.2a, mesma forma (antes: 6,58 GB, 0 trabalhos alheios) — log `dev302c2/06-npm-test.log` | `[run-backend-tests] 324 arquivo(s) · 3751 teste(s) · pass 3740 · fail 9 · skipped 2`; `CORE_SAAS_PERSISTENCE=memory — herdado do ambiente`; T-D(f) `ok` dentro da suíte; os **9** `not ok` são todos de `tests/traccar-dev-topology.test.ts` (2971–2978, 2980), todos com `não foi possível executar "docker compose" (spawnSync docker ENOENT) … falha em vez de se declarar pulado` (9/9 `ENOENT`) | **verde para o bloco**; os 9 vermelhos são **`pre-existente`, de ambiente**: a imagem `erp-teste-linux:1` não tem o CLI do Docker, e o teste exige isso de propósito. Evidência: o arquivo não está no diff do ciclo (`git diff --name-only 8e6a6c29 -- tests/traccar-dev-topology.test.ts` vazio) e nasceu em `c1485c94` (#426, B-TRC-01), que entrou pela `main`. O job da CI tem Docker. A base `8e6a6c29` não foi re-medida nesta forma (custaria ~10 min); a causa é nominal (`ENOENT`) e independe deste diff |
| 7.1 | escopo: `git diff --name-only` (antes do commit) contra o §7.1/§7.2 | `docs/revisoes/SAN3/B-SAN3-02-dev.md`, `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql`, `tests/work-order-invoicing-migration-drill-db.test.ts` (e mais nada); `git status` só com os ` M` de EOL de `.agents/**`/`.claude/**` e os `??` de `votos/B-SAN3-02/`, que não foram adicionados | PERMITIDO cumprido. PROIBIDO intocado: `src/**`, `schema.prisma`, as outras migrações, as outras suítes, `tests/helpers/**`, `ci.yml`, `docs/deployment.md`, `package.json`/lockfiles, `scripts/**`, `Kpis/**`, `.claude/agents/**`, `.agents/agents/**`. As 6 sentenças do up e as 6 do down estão byte-iguais (passo 2) |
| 7.2 | limpeza §C5: `git worktree remove --force C:/Users/AMP/w-dev302c2`; `rm -rf dist/` (artefato gitignored do `npm run build`); `docker ps -a` e `docker network ls` | cópia removida (`worktree list` sem `dev302c2`); `dist/` removido; nenhum contêiner ou rede `tl*` (o trap do `teste-linux.sh` limpou as 7 execuções) | **Limpeza:** cópia `w-dev302c2`, `dist/` e os contêineres e redes das 7 execuções do `teste-linux.sh` removidos; ficaram só os logs em `C:/Users/AMP/erp-pausa-2026-10-03/dev302c2/` |
| 7.3 | `git add` de 3 caminhos explícitos; `git commit` Conventional, em português, sem linhas de atribuição; **sem push** (mandato) | o head novo é o commit que contém esta seção (o relatório não carrega o próprio hash; ver a mensagem final do dev ao orquestrador) | push, CI 14/14 e Anexo D do plano ficam com o orquestrador (plano §7.1 e §8 (7)) |

**Critério de aceite do dev (plano §8):** drill 6/6 × 3 ✔ · atômica 17/17 ✔ · M29/M29b/M29c vermelhas ✔ · M11b/M28/M22 vermelhas ✔ · `check`/`lint`/`build` verdes ✔ · `npm test` com 0 falha do bloco (9 de ambiente, `pre-existente`, nomeadas) ✔ · diff = 2 arquivos de código + este relatório ✔ · restauros com blob igual (6 + 4 `== esperado`) ✔ · limpeza em 1 linha ✔.
