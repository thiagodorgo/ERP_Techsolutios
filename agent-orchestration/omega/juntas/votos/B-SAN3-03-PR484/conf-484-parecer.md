# Conferência do conserto único do PR #484 (B-SAN3-03), item 10(3) passo 5

- **Identidade:** `conf-484-agy-opus`, Claude Opus 5.5 pelo Antigravity, nível menor DECLARADO, identidade nova. Não achou, não planejou e não consertou nada neste bloco.
- **Cruzamento de modelo, declarado:** K1–K4 foram consertados pelo Codex (`dev-san303-k-sol`), então a conferência cruza modelo. O K5 e o ajuste do §11 foram feitos pelo Claude (`dev-san303-k-opus`), então a conferência deles **não cruza** modelo: o Codex estava sem limite (item 11(2)).
- **Objeto:** `353677535f855d931a0e02fccc64297cfdb443ae` (`gh pr view 484 --json headRefOid`, 2026-11-03 10:29 −03; estado OPEN, MERGEABLE). Antes do conserto: `5b628b886520bcbece0228eec9d47c965a32b577`.
- **Leitura:** `planos/B-SAN3-03-emenda-2.md` §4, §9, §10 e §11; `revisoes/j484/` (BRIEFING, c1b/c2/c3 evidência).

## Terreno

- **Comando:** `FreeVirtualMemory` = 39,45 GB (≥ 4 GB); disco C: 294 GB livres; `docker ps` = `rec01-pg` (outro), `erp-postgres`, `erp-redis` (intocados). `git worktree add --detach C:/Users/thiag/w-conf484 35367753…`; `git rev-parse HEAD`; `git status --porcelain`.
- **Saída:** HEAD = `353677535f855d931a0e02fccc64297cfdb443ae`, status vazio. `git log --graph 5b628b88..HEAD`: 10 commits do conserto (K1 `0f731d4b`, K2 `1af05802`, K3 `03901eb9`, M47-c′ `f1a123ca`, K5 `c7387fd7`, §11 `f4bb114d`, registros) + merge `88e63e11` de `origin/main` (#485 `ceb62a07`, #486 `5da03cac`) + `35367753`.
- **Comando:** `npm ci --include=dev` no worktree (`conf-npmci.log`) → `npmci_exit=0`, `node_modules` é `Directory` (não junction). `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate`. `docker run -d --name conf484-pg -e POSTGRES_USER=postgres … -p 127.0.0.1:55468:5432 postgres:16` → `accepting connections`; `npx prisma migrate deploy` → `All migrations have been successfully applied.` (`conf-migrate.log`).
- **Veredito parcial:** terreno próprio apto. `erp-postgres`, `erp-redis`, `rec01-pg`, as portas 3000/5173/5432/6379 e a árvore principal não foram tocados (na árvore principal, só `git worktree add` e leitura).

## Item 1 — O grave sumiu (C1b-A1)

### 1a. Leitura do conserto K1
- **Comando:** `git diff 5b628b88 HEAD -- src/`.
- **Saída:** `normalizeTenantTag` (`engine.ts:155`) passa a `value.replace(/[\p{Default_Ignorable_Code_Point}\p{Cf}]/gu, "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()`, que é a letra do K1. A mesma função serve o índice (id, nome, slug) e a tag.

### 1b. Sonda da C1 em memória (`c1b-grafias-novas.mts`)
- **Comando:** `node --import tsx revisoes/j484/c1b-grafias-novas.mts C:/Users/thiag/w-conf484/src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.ts` → `exit=0`, log `conf-grafias-novas-objeto.log`. Resumi por cenário × estratégia e comparei com o `c1b-grafias-novas-objeto.log` da C1 (medido no `5b628b88`).
- **Saída (objeto `35367753`), 12 invisíveis × 2 estratégias:**
  - `nameSide` (A=`"Dupli"+ch+"cada"`, B=`"Duplicada"`, tag `"Duplicada"`): **12/12 `ambiguous_tenant_tag`=10, `alloc[]`**, nas duas estratégias. No `5b628b88` (log da C1): 12/12 `alloc[b=10]` na direta e rateio a/b no só-uso.
  - `nameEdge` (invisível na ponta): 12/12 ambígua, nas duas (antes: só U+FEFF).
  - `tagSide` (tag com invisível, A e B "Duplicada"): 12/12 ambígua, nas duas (antes: `unknown_tenant_tag` na direta e rateio no só-uso).
  - `tagSingle` (tag `"Alfa"+ch`, A única): 12/12 `alloc[a=10]` na direta (antes: `unknown_tenant_tag` em 11/12). É a mesma chave humana de uma organização única, coerente com o K1.
  - `closes=True` em todas as 96 combinações.
- **Veredito parcial:** nenhum dos 12 invisíveis desvia o custo em memória. O resultado é `ambiguous_tenant_tag`.

### 1c. T-TAG-14 e T-TAG-db-2 no objeto (memória + Postgres)
- **Comando:** `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55468/erp_techsolutions CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/san3-03-tenant-tag.test.ts tests/san3-03-system-org-db.test.ts` → `exit=0`, log `conf-k1-objeto.log`.
- **Saída:** `# tests 20 · pass 20 · fail 0 · skipped 0`. Inclui `ok 15 - T-TAG-14` (os 12 caracteres do parecer da C1 × 2 estratégias, `assertAmbiguous`) e `ok 4 - T-TAG-db-2` (4 subtestes: U+00AD, U+200B, U+2060, U+FEFF; `totalAllocatedCost=0`, `[["ambiguous_tenant_tag",10]]`, nenhuma alocação para A ou B).

### 1d. Vermelho-controle no `5b628b88`
- **Comando:** `git checkout 5b628b88 -- src/modules/cloud-cost-allocation/` → mesmo comando do 1c → `git checkout HEAD -- src/modules/cloud-cost-allocation/` → `git status --porcelain`.
- **Saída:** `exit=1`, `# tests 20 · pass 14 · fail 6`: **`not ok 15 - T-TAG-14`** e **`not ok 4 - T-TAG-db-2`** (os 4 subtestes `not ok`). Natureza: `ERR_ASSERTION`/`testCodeFailure` em todos, sem `SyntaxError`/`TransformError`. Os outros 14 ficam verdes. Status vazio depois de restaurar (log `conf-k1-5b628b88.log`).
- **Veredito parcial:** o T-TAG-14 e o T-TAG-db-2 ficam vermelhos no `5b628b88` por asserção e verdes no objeto.

### 1e. Sonda da C1 no Postgres (`c1b-probe-db.test.ts`), contra o objeto
- **Comando:** cópia temporária como `tests/zz-conf484-c1b-probe-db.test.ts`; `DATABASE_URL=…55468… CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/zz-conf484-c1b-probe-db.test.ts` → `exit=0`; arquivo removido; `git status --porcelain` vazio. Log `conf-c1b-probe-db-objeto.log`.
- **Saída:** nos 4 invisíveis (U+00AD, U+200B, U+2060, U+FEFF no meio), com o nome de A passando por `parseCreatePlatformTenantDto` (o validador da API), deu `status=completed`, `totalAllocated=0`, `allocations=[]`, **`persistedRows=[]`** em `tenant_cloud_cost_allocations` e `unallocated=[["ambiguous_tenant_tag",10],["unknown_tenant_tag",7]]`. Na C1 (`5b628b88`) deu `allocations=[["B(limpo)",10]]`, persistido.
- **Veredito parcial:** no caminho real (serviço + `PrismaCloudCostAllocationRepository`), B não recebe nem persiste nada.

### 1f. Observação (não grave), do T-TAG-10
- **Comando:** `git diff 5b628b88 HEAD -- tests/san3-03-tenant-tag.test.ts`.
- **Saída:** o T-TAG-10 perdeu o caso `"Duplicada\u200b"`: `for (const tag of ["nao-existe", "Duplicada\u200b"])` virou `for (const tag of ["nao-existe"])`. É consequência direta do K1: a tag sem o invisível casa nome de A e slug de B, e vira ambígua em vez de desconhecida. O caso sai do teste sem ser convertido em asserção de ambígua. Com isso, nenhum teste do bloco cobre o **lado da tag** com invisível. Esse lado eu medi na sonda (1b, `tagSide` 12/12 ambígua) e ele continua falhando fechado.
- **Veredito parcial:** a falha continua fechada e o custo não desvia. Fica registrada como ressalva de cobertura, não como defeito.

**Veredito do item 1: o grave C1b-A1 SUMIU**, em memória e no Postgres, nos 12 caracteres e nas 2 estratégias.

## Item 2 — Os não graves fecharam

### 2a. C2-N1 e C2-N2: sondas da C2 contra o objeto
- **Comando (memória):** `C2_WT=C:/Users/thiag/w-conf484`, `TZ=America/Sao_Paulo` e depois `TZ=UTC`, `node --test --import tsx revisoes/j484/c2-probe-routes.test.mts` → `exit=0` nos dois. Logs `conf-c2-probe-objeto-America-Sao_Paulo.log` e `conf-c2-probe-objeto-UTC.log`. Comparei com o `c2-probe-objeto.log` da C2 (`5b628b88`).
- **Saída (objeto, idêntica nos dois TZ):**
  - O contrato antigo se mantém: sem query → 200/15; `2026-06-01`/`2026-06-30` → 200/15; uma ponta → 400 `summary_period_incomplete`; vazio, texto, 31/02, 13/01, 00/10, array e sozinho-vazio (16 casos) → 400 `summary_period_invalid`; `2028-02-29` → 200.
  - **Hora e fuso (C2-N1), todos 400 `summary_period_invalid`:** `iso-fuso+05-cruza-dia`, `iso-fuso+0500-ambos`, `+23:59`, `-23:59`, `hora-24` (as duas pontas e só o fim), `hora-local-sem-fuso` e `iso-Z-completo`. No `5b628b88` eram 200: 15, 15, 15, 0, 15, 15, 15 e 15. A hora local sem fuso dava 15 em São Paulo e 0 em UTC; agora dá 400 nos dois TZ.
  - **Chave desconhecida (C2-N2), todas 400 `summary_query_invalid`:** `PeriodStart=…`, `periodStart[]=…&periodEnd=…`, `periodStart[a]=…` e `periodStart[]&periodEnd[]`. No `5b628b88`: 200/15, 400 incomplete, 400 incomplete e 200/15.
- **Comando (Postgres):** `DATABASE_URL=…55468… TZ=America/Sao_Paulo node --test --import tsx revisoes/j484/c2-probe-routes-db.test.mts` → `exit=0`, log `conf-c2-probe-db-objeto.log`.
- **Saída:** repo = `PrismaCloudCostAllocationRepository`; duas pontas → 200/77 (a run da sonda); uma ponta → 400 incomplete; 6 inválidos → 400 invalid; `+23:59`, `T24:00Z` e hora local sem fuso → **400 `summary_period_invalid`** (no `5b628b88` eram 200/77).
- **Veredito parcial:** hora, fuso e chave desconhecida dão 400 no objeto, em memória e no Postgres, e o resultado não depende do TZ. A listagem de runs não mudou: `parseRunFilters`/`readDate` estão fora do diff `5b628b88..HEAD`, e o T-SUM-10 confirma `/runs?PeriodStart=…` → 200.

### 2b. T-SUM-9 e T-SUM-10: verdes no objeto, vermelhos no `5b628b88`
- **Comando:** `node --test --import tsx tests/cloud-cost-allocation-routes.test.ts tests/san3-03-summary.test.ts` no objeto (`conf-k23-objeto.log`) e com `git checkout 5b628b88 -- src/modules/cloud-cost-allocation/` (`conf-k23-5b628b88.log`), restaurado depois, status vazio.
- **Saída:** objeto **12/12**. No `5b628b88`: 10/12, **`not ok 4 - T-SUM-9`** e **`not ok 5 - T-SUM-10`**, e o resto verde.

### 2c. M57, M58, M59 e M47-c′ (C2-N3 + K1)
- **Comando:** driver próprio `revisoes/j484/conf-k-mutations.mjs`, que aplica cada mutação por âncora única, roda os testes, restaura com `git checkout HEAD -- <arquivo>` e publica `git status --porcelain`. `DATABASE_URL=…55468… CORE_SAAS_PERSISTENCE=prisma node conf-k-mutations.mjs` → `driver_exit=0`, log `conf-k-mutations.log` (e `conf-mut-<id>.log`).
- **Saída:** todas com `anchor_count=1`, `exit=1`, natureza `AssertionError` (sem `SyntaxError`/`TransformError`), `restored=true`, `status=[]`:
  - **M57** (sem a remoção dos invisíveis): `not ok` T-TAG-14 e T-TAG-db-2 (4 subtestes), 20/14/6.
  - **M58** (regex sem `$`): `not ok` **T-SUM-9**, 12/11/1. Substitui a M-C2-a da C2 e morde.
  - **M59** (sem `assertSummaryQueryKeys(query)`): `not ok` **T-SUM-10**, 12/11/1.
  - **M47-c′** (recusa de uma ponta acrescentada em `parseRunFilters`, serviço intacto): `not ok` T-SUM-8, na asserção **`T-RUN-1 · listagem continua aceitando somente uma ponta`, `expected: 200`, `actual: 400`**.
- **Veredito parcial:** a M58 e a M59 mordem, e a M47-c′ derruba o T-RUN-1. O C2-N3 fechou.

### 2d. O §11: `tests/san3-05-leituras-de-plataforma-db.test.ts`
- **Comando:** `git diff --numstat 5b628b88 HEAD -- tests/san3-05-leituras-de-plataforma-db.test.ts`; `git diff` do arquivo.
- **Saída:** `1 1`. A única linha trocada é a 351: `periodStart=${MES_INICIO}&periodEnd=${MES_FIM}` virou `periodStart=${MES_INICIO.slice(0, 10)}&periodEnd=${MES_FIM.slice(0, 10)}`, que é a letra do §11.
- **Comando:** `DATABASE_URL=…55468… node --test --import tsx tests/san3-05-leituras-de-plataforma-db.test.ts` (`conf-s11-objeto.log`); depois `git checkout 5b628b88 -- <o teste>`, com o `routes.ts` do head, e o mesmo comando (`conf-s11-chamada-antiga.log`); restaurado, status vazio.
- **Saída:** objeto **13/13, 0 fail, 0 skip**. Com a chamada antiga: `exit=1`, 3 testes e 1 fail (`not ok 1 - B-SAN3-05 · T10–T12`, corpo `summary_period_invalid`). É o vermelho-controle do §11.
- **Veredito parcial:** o §11 está conforme: mudou só a chamada indicada e o arquivo dá 13/13 no meu Postgres.

## Sucessor conf-484b-opus (P3 + cauda)

- **Identidade:** `conf-484b-opus`, Claude Opus 5.5 (Claude Code, subagente), nível menor DECLARADO, identidade nova. Sucede `conf-484-agy-opus`, que caiu por cota (429, `00-quedas-conferencia.md`). Não achou, não planejou e não consertou nada neste bloco.
- **Cruzamento, declarado:** igual ao do antecessor. K1–K4 (Codex) cruzam modelo; K5 e §11 (Claude) não cruzam (item 11(2)).
- **Regra P3:** só vale o que eu re-executei. A bateria e os logs de CI que o antecessor deixou na pasta (`conf-bateria*`, `conf-ci-*`) não estão no parecer dele; não foram usados como insumo, só como comparação depois da minha execução. Meus logs têm prefixo `confb-`.

### Terreno (sucessor)
- **Comando:** `git -C C:/Users/thiag/w-conf484 rev-parse HEAD`; `git status --porcelain | wc -l`; `gh pr view 484 --json headRefOid,state,mergeable`; `FreeVirtualMemory`; `dir /AL` (junction); `docker ps`; `docker exec conf484-pg pg_isready`; `select count(*) from _prisma_migrations …`.
- **Saída:** HEAD `353677535f855d931a0e02fccc64297cfdb443ae` = head do PR (OPEN, MERGEABLE); status 0 linhas; memória de commit livre 38,72 GB (≥ 4 GB); `node_modules` não é junction; `conf484-pg` Up desde 13:30:26Z (criado pelo antecessor), `accepting connections`; 117 migrações aplicadas, 0 pendente ou revertida, 117 pastas em `prisma/migrations`. `erp-postgres`, `erp-redis`, `rec01-pg` vivos e não tocados.
- **Veredito parcial:** terreno íntegro; reusado.

### P3 · Item 1 — re-execução

**1b′. Sonda da C1 em memória.**
- **Comando:** `cd w-conf484 && node --import tsx revisoes/j484/c1b-grafias-novas.mts C:/Users/thiag/w-conf484/src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.ts > confb-grafias-novas-objeto.log` → `exit=0`; comparação por `node` (decodifica o UTF-16 do log do antecessor, normaliza fim de linha e compara as 24 linhas JSON).
- **Saída:** 24 linhas, **idênticas** às do antecessor (`iguais true`). Agregado: `nameSide`, `nameEdge` e `tagSide` = `ambiguous_tenant_tag` em 12/12 nas duas estratégias; `tagSingle` = alocação (direta `a=10`; só-uso rateio a/b/plataforma); `closes` 96/96.
- **Veredito parcial:** reproduz o 1b: nenhum invisível desvia o custo em memória.

**1c′/1d′. T-TAG-14 e T-TAG-db-2: verdes no objeto, vermelhos no `5b628b88`.**
- **Comando:** `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55468/erp_techsolutions?schema=public CORE_SAAS_PERSISTENCE=prisma node --test --import tsx --test-reporter=tap tests/san3-03-tenant-tag.test.ts tests/san3-03-system-org-db.test.ts` (`confb-k1-objeto.log`); depois `git checkout 5b628b88 -- src/modules/cloud-cost-allocation/`, o mesmo comando (`confb-k1-5b628b88.log`), `git checkout HEAD -- src/modules/cloud-cost-allocation/`, `git status --porcelain`.
- **Saída:** objeto `exit=0`, `# tests 20 · pass 20 · fail 0 · skipped 0`, `ok 15 - T-TAG-14`, `ok 4 - T-TAG-db-2`. No `5b628b88`: `exit=1`, `# tests 20 · pass 14 · fail 6 · skipped 0`; `not ok 15 - T-TAG-14`, `not ok 4 - T-TAG-db-2` com os 4 subtestes (U+00AD, U+200B, U+2060, U+FEFF) `not ok`; 5 `ERR_ASSERTION`/`testCodeFailure` + 1 `subtestsFailed` (o pai); 0 `SyntaxError`/`TransformError`. Status vazio depois de restaurar.
- **Veredito parcial:** reproduz o 1c e o 1d, números iguais.

**1e′. Sonda da C1 no Postgres.**
- **Comando:** `cp c1b-probe-db.test.ts tests/zz-confb-c1b-probe-db.test.ts`; `DATABASE_URL=…55468… CORE_SAAS_PERSISTENCE=prisma node --test --import tsx --test-reporter=tap tests/zz-confb-c1b-probe-db.test.ts` (`confb-c1b-probe-db-objeto.log`); `rm` do arquivo; `git status --porcelain` vazio. Comparação por `node`, sem o campo `nameAstored` (sufixo aleatório).
- **Saída:** `exit=0`, `# tests 4 · pass 4 · fail 0`. Nos 4 invisíveis: `status=completed`, `totalAllocated=0`, `allocations=[]`, `persistedRows=[]`, `unallocated=[["ambiguous_tenant_tag",10],["unknown_tenant_tag",7]]`. Igual ao antecessor nas 4 linhas (`iguais true`).
- **Veredito parcial:** reproduz o 1e. **Item 1 confirmado por re-execução: o grave C1b-A1 sumiu.**

### P3 · Item 2 (2a–2d) — re-execução

**2a′. Sondas da C2 (C2-N1, C2-N2).**
- **Comando:** `C2_WT=C:/Users/thiag/w-conf484 TZ=America/Sao_Paulo` e depois `TZ=UTC`, `node --test --import tsx --test-reporter=tap revisoes/j484/c2-probe-routes.test.mts` (`confb-c2-probe-objeto-America-Sao_Paulo.log`, `confb-c2-probe-objeto-UTC.log`); `DATABASE_URL=…55468… TZ=America/Sao_Paulo node --test --import tsx revisoes/j484/c2-probe-routes-db.test.mts` (`confb-c2-probe-db-objeto.log`). Comparação por `node` das linhas `C2PROBE` (ids aleatórios mascarados) com os logs do antecessor.
- **Saída:** os três `exit=0`, `# tests 1 · pass 1 · fail 0`. Linhas `C2PROBE`: 41, 41 e 15, **iguais** às do antecessor nos três (`iguais true`). Nos dois TZ: `iso-fuso+05-cruza-dia`, `iso-fuso+0500-ambos`, `iso-fuso±23:59`, `hora-24` (2), `hora-local-sem-fuso`, `iso-Z-completo`, `hora-25` → 400 `summary_period_invalid`; `chave-maiuscula-ignorada` (`PeriodStart`), `start-bracket`, `start-objeto`, `ambos-bracket` → 400 `summary_query_invalid`; sem query e duas pontas → 200/15; uma ponta → 400 `summary_period_incomplete`. No Postgres (`PrismaCloudCostAllocationRepository`): duas pontas 200/77; fuso +23:59, `T24:00Z` e hora local → 400 `summary_period_invalid`.
- **Veredito parcial:** reproduz o 2a.

**2b′. T-SUM-9 e T-SUM-10.**
- **Comando:** `node --test --import tsx --test-reporter=tap tests/cloud-cost-allocation-routes.test.ts tests/san3-03-summary.test.ts` no objeto (`confb-k23-objeto.log`) e com `git checkout 5b628b88 -- src/modules/cloud-cost-allocation/` (`confb-k23-5b628b88.log`), restaurado, status vazio.
- **Saída:** objeto 12/12/0. Base `exit=1`, 12/10/2: `not ok 4 - T-SUM-9`, `not ok 5 - T-SUM-10`.
- **Veredito parcial:** reproduz o 2b.

**2c′. M57, M58, M59, M47-c′.**
- **Comando:** `confb-k-mutations.mjs` = cópia do driver do antecessor, com só o prefixo dos logs trocado (`diff` = 2 linhas); `DATABASE_URL=…55468… CORE_SAAS_PERSISTENCE=prisma node confb-k-mutations.mjs` → `driver_exit=0` (`confb-k-mutations.log`, `confb-mut-*.log`).
- **Saída:** as 4 com `anchor_count=1`, `exit=1`, `assertion=true`, `syntax=false`, `restored=true`, `status=[]`. M57 20/14/6 (T-TAG-14, T-TAG-db-2 + 4 subtestes); M58 12/11/1 `not ok T-SUM-9`; M59 12/11/1 `not ok T-SUM-10`; M47-c′ 12/11/1, `not ok T-SUM-8` com a asserção `T-RUN-1 · listagem continua aceitando somente uma ponta` (`expected: 200`, `actual: 400`). Igual linha a linha ao log do antecessor (a única diferença é a codificação do log dele).
- **Veredito parcial:** reproduz o 2c.

**2d′. O §11.**
- **Comando:** `git diff --numstat 5b628b88 HEAD -- tests/san3-05-leituras-de-plataforma-db.test.ts` e o `git diff` do arquivo; `DATABASE_URL=…55468… node --test --import tsx --test-reporter=tap <o teste>` (`confb-s11-objeto.log`); `git checkout 5b628b88 -- <o teste>`, mesmo comando (`confb-s11-chamada-antiga.log`), restaurado, status vazio.
- **Saída:** `1 1`; a única troca é `periodStart=${MES_INICIO}&periodEnd=${MES_FIM}` → `…MES_INICIO.slice(0, 10)…MES_FIM.slice(0, 10)`. Objeto 13/13, 0 fail, 0 skip. Chamada antiga: `exit=1`, 3/2/1, `not ok 1 - B-SAN3-05 · T10–T12`, com `summary_period_invalid`.
- **Veredito parcial:** reproduz o 2d.

### Cauda · Item 2 — C3-01 (a bateria do K5)
- **Comando (lista):** `awk` extrai a `LISTA LITERAL` de `docs/revisoes/SAN3/B-SAN3-03-bateria.txt` do objeto (blob `adc8d855`) → `confb-bateria-lista.txt`; `diff` contra a expansão, no objeto, dos 8 globs que o próprio arquivo declara (`ls … | sort -u`) e contra `c3-bateria-arquivos.txt` da cadeira C3.
- **Saída:** 38 arquivos; `LISTA=GLOB` e `LISTA=C3` (diff vazio nos dois).
- **Comando (execução):** o COMANDO LITERAL do arquivo, um arquivo por vez: `DATABASE_URL=…55468… CORE_SAAS_PERSISTENCE=memory; while read -r f; do node --test --import tsx --test-reporter=tap "$f"; done < confb-bateria-lista.txt` (10:42–10:44), log `confb-bateria.log` (um bloco `=== <arquivo> ===` + `EXIT=` por arquivo); resumo `node confb-bateria-resumo.mjs <bateria.txt>` → `confb-bateria-resumo.txt`; `git status --porcelain` vazio depois.
- **Saída:** **38 arquivos, `# tests 307 · pass 303 · fail 4 · skipped 0`**. As 38 linhas da tabela "RESULTADO POR ARQUIVO" do `.txt` batem **uma a uma** com a minha execução (exit, tests, pass, fail, skipped): `divergentes 0`. O único arquivo com `exit!=0` é `tests/san3-05-runtime-role-guard-db.test.ts`, 12/8/4/0, com `not ok` em T14a/b, T14c, T14d e o pai, e 3 ocorrências de `setsid: ausente` — exatamente as 4 falhas declaradas de ambiente do Windows. O `.log` versionado (blob `959e3e83`), somado por `awk`, dá 38 blocos, 307/303/4/0 e 3 `setsid: ausente`.
- **Conta do denominador:** 307 − 4 (setsid) = 303 verdes; 307 = 299 (C3 no `5b628b88`) + 1 (T-TAG-14) + 5 (T-TAG-db-2 + 4 subcasos) + 2 (T-SUM-9, T-SUM-10), como o arquivo declara.
- **Veredito parcial:** **C3-01 fechou.** A bateria tem lista literal e log, e o denominador se reproduz.

### Cauda · Item 3 — CI inteiro

**3a. Os 16 check-runs do objeto.**
- **Comando:** `gh api repos/:owner/:repo/commits/353677535f855d931a0e02fccc64297cfdb443ae/check-runs --paginate -q '.check_runs[] | [.name,.status,.conclusion,.id,run]'`; `gh run view <run> --json event,headSha,status,conclusion`.
- **Saída:** `total_count=16`; os 16 `completed`/`success`: `antivirus`, `authority-portal`, `backend`, `backend-postgres`, `docker`, `flutter`, `frontend`, `owner-portal` × 2 runs do workflow `ci` — `41642082165` (`push`) e `41642092077` (`pull_request`), os dois com `headSha=35367753…` e `completed/success`.
- **Veredito parcial:** conforme.

**3b. TAP de `backend` e `backend-postgres`.**
- **Comando:** `gh run view <run> --job <id> --log > confb-ci-<run>-<job>.log` para os jobs `125937860001`/`125937860243` (run `41642082165`) e `125937895225`/`125937894740` (run `41642092077`); `grep -E '^# (tests|pass|fail|skipped|cancelled|todo) |not ok'` depois de tirar o prefixo de tempo; `grep -c 'not ok'`; `grep` dos testes do conserto.
- **Saída (idêntica nas duas runs):** `backend` → `# tests 4371 · pass 4369 · fail 0 · skipped 2 · cancelled 0 · todo 0`; os 2 skips são `ok 2800`/`ok 2801` (`RBAC_DB_PARITY` só ligado no job `backend-postgres`), pré-existentes e declarados. `backend-postgres` → `# tests 493 · pass 493 · fail 0 · skipped 0`. `not ok` = 0 nos 4 logs. No `backend`: `ok 3077 - T-TAG-14`, `ok 3058 - T-TAG-db-2`, `ok 838 - T-SUM-9`, `ok 839 - T-SUM-10`, `ok 3111 - B-SAN3-05 · T10–T12` (o teste do §11; era o `not ok 3111` do CI de `f1a123ca`), e `ok 8/9/10 - T14a/b, T14c, T14d` com 0 `setsid: ausente` — no Linux as 4 falhas de ambiente da bateria local passam, o que confirma a leitura do K5.
- **Veredito parcial:** conforme.

**3c. Escopo de `git diff --name-only 5b628b88..35367753`.**
- **Comando:** `git log --first-parent --format='%h|%p|%s' 5b628b88..HEAD`; `git log --first-parent --no-merges --format= --name-only 5b628b88..HEAD | sort -u` (arquivos do BLOCO); `git diff --name-only 7c89c73b ceb62a07` (o que veio da `main`: merge-base `7c89c73b`, 2º pai `ceb62a07` = #485 sobre #486 `5da03cac`); `git diff-tree --cc --name-only 88e63e11` (conteúdo próprio do merge); `comm` do total contra a união; para cada arquivo do `--cc`, linhas do merge que não existem em nenhum dos dois pais (`comm -23`); `python agent-orchestration/controle/gerar-indice-pendencias.py` no objeto + `git status --porcelain` (e restauração).
- **Saída:**
  - Total do diff: 104 arquivos = 10 do bloco + 94 da `main`; **0 arquivo fora da união**; interseção bloco ∩ `main` vazia; o `frontend/` só vem da `main` (`git diff 5b628b88..f4bb114d -- frontend/` vazio).
  - Os 10 do bloco: `src/…/cloud-cost-allocation.engine.ts` (+6 −1) e `.routes.ts` (+16 −8); `tests/cloud-cost-allocation-routes.test.ts`, `tests/san3-03-system-org-db.test.ts`, `tests/san3-03-tenant-tag.test.ts`; `tests/san3-05-leituras-de-plataforma-db.test.ts` (+1 −1, §11); `API_CONTRACTS.md` (+5 −2, só a seção do resumo de alocação: `summary_period_invalid` sem hora/fuso/espaço e `summary_query_invalid`); `docs/revisoes/SAN3/B-SAN3-03-dev.md`; `docs/revisoes/SAN3/B-SAN3-03-bateria.txt` e `.log`. **Nenhum proibido** (`prisma/`, `migrations/`, `frontend/`, `Kpis/`, `.github/`, `src/modules/cloud-charges/`, lockfile) tocado pelo bloco.
  - Merge `88e63e11` (`git merge origin/main`, sem rebase): conteúdo próprio só em `log-execucao.md`, `decisoes.md`, `pendencias.md` (0 linha nova além dos dois pais = os dois lados mantidos) e `pendencias-indice.md` (difere dos pais porque é gerado; o gerador rodado no objeto não muda nada: `git status` vazio). Conforme o §11.
- **Veredito parcial:** cabe no §4 + §10 + §11, com uma ressalva de registro: `B-SAN3-03-bateria.txt`/`.log` não estão na lista literal do §4 nem do "Escopo" do §10 (que diz "o mesmo §4, mais `API_CONTRACTS.md`"), mas são a própria entrega que o K5 manda publicar, e o mandato desta conferência os nomeia "no objeto". Não grave.

**3d. `git diff --check`.**
- **Comando:** `git diff --check 5b628b88..HEAD`.
- **Saída:** sem saída, `exit=0`.
- **Veredito parcial:** limpo.

### Ressalvas (nenhuma é grave; não proponho correção)
1. **Cobertura do lado da tag (herdada do 1f do antecessor, re-medida):** `git diff 5b628b88 HEAD -- tests/san3-03-tenant-tag.test.ts` mostra `for (const tag of ["nao-existe", "Duplicada\u200b"])` → `for (const tag of ["nao-existe"])`. O caso sai do T-TAG-10 sem virar asserção de ambígua; nenhum teste do bloco cobre tag com invisível. O comportamento falha fechado (sonda 1b′, `tagSide` 12/12 ambígua).
2. **Escopo literal:** os dois arquivos da bateria do K5 fora da lista escrita (3c).
3. **Registro do C1b-A2:** a triagem do §10 manda o cirílico para a pendência `P-SAN303-HOMOGLIFO-NOME`. `git grep -n -i HOMOGLIFO HEAD` não acha nada no objeto, e na pasta da pausa só o plano e as evidências da C1 citam o nome. A pendência não está registrada.
4. **Cruzamento:** o K5 e o §11 não cruzam modelo (Claude fez, Claude confere), como o mandato declara (item 11(2)).

### Conclusão do sucessor
- Item 1: o grave **C1b-A1 sumiu**. Re-executei a sonda em memória (24 linhas iguais às do antecessor), a sonda no Postgres (4/4 iguais) e o vermelho-controle T-TAG-14/T-TAG-db-2 no `5b628b88` (20/14/6), e o verde no objeto (20/20).
- Item 2: C2-N1, C2-N2 e C2-N3 fecharam, re-executados com saídas iguais às do antecessor. **C3-01 fechou**: 38 arquivos, 307/303/4/0, com as 4 falhas de `setsid` como declarado, e as 38 linhas iguais à tabela do K5. O §11 está conforme (13/13; a chamada antiga deu 3/2/1).
- Item 3: os 16 check-runs estão `completed/success` no `35367753`. O TAP: `backend` 4371/4369/0/2 e `backend-postgres` 493/493/0/0, nas duas runs, com 0 `not ok`. O escopo cabe, e `git diff --check` está limpo.
- Ressalvas não graves: 1–3 acima.

### Limpeza
- **Comando:** `docker rm -f conf484-pg`; `git worktree remove --force C:/Users/thiag/w-conf484`; `git worktree list`; `docker ps`.
- **Saída:** container removido; worktree removido (`exit=0`, ausente da lista e do disco); `erp-postgres`, `erp-redis` e `rec01-pg` seguem no ar, intocados. Os temporários de `/tmp` que criei foram apagados. Nenhum merge.

VEREDITO: CONFERIDO COM RESSALVA
