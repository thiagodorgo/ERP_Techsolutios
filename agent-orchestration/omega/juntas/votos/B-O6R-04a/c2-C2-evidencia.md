papel=jurado-o6r04a-c2-fail-closed-backend (cadeira C2, TITULAR, ciclo 2, identidade nova) · modelo=Fable (claude-fable-5-1, conforme o contrato: bloco toca dinheiro e dado) · mandato_md5=cf1b37fdfd4b3d918fc2af3e07c63317 (EOL-neutro, `00-mandatos/C2c2.md` @35ef85be) · corpo_md5=82c3016b41e1f5ad9c4a4a0686338200 (EOL-neutro, `.claude/agents/especialistas/jurado-o6r04a-c2-fail-closed-backend.md` @origin/fix/inventory-consistency) — AMBOS CONFERIDOS IGUAIS AO PUBLICADO antes de qualquer medição.

# Evidência incremental — C2 · ciclo 2 · B-O6R-04a (PR #389)

Disparo: general-purpose com ferramentas por escrito Read/Grep/Glob/Bash (sem Write/Edit; gravação por Bash). Prefixo de containers: `j389-c2-` (mandato; vale sobre o corpo — ressalva R1 do inspetor). Nada do plano, do dev, da reprovação do ciclo 1 nem de voto alheio entra como fato; não li nem leio `c2-C1-*` nem `c2-C3-*`.

## 0. Legalidade e terreno (antes do mérito)

### 0.1 — 2026-10-10T08:24Z · md5 do corpo e do mandato
- cmd: `MSYS_NO_PATHCONV=1 git show origin/fix/inventory-consistency:<caminho> | tr -d '\r' | md5sum`
- saída: corpo `82c3016b41e1f5ad9c4a4a0686338200`; mandato `cf1b37fdfd4b3d918fc2af3e07c63317`
- veredito parcial: IGUAIS ao publicado no disparo → a cadeira pode votar.

### 0.2 — 2026-10-10T08:25Z · head por git e por gh, merge-base, delta desde o objeto do inspetor
- cmd: `gh pr view 389 --json headRefOid,...` · `git rev-parse origin/fix/inventory-consistency` · `git merge-base origin/main origin/fix/inventory-consistency` · `git diff --name-only 6bec9f92 35ef85be` · `git log --oneline 6bec9f92..35ef85be`
- saída: head gh=`35ef85be26e4ced21b25014ea7302c2fa60288cc` (OPEN, draft=true, MERGEABLE) = head git; merge-base=`c1cfdabe12c74b58f8393dbee4f333224c56b303`; delta 6bec9f92→35ef85be = 3 arquivos, todos `00-mandatos/C{1,2,3}c2.md` (1 commit `chore(junta): mandatos das 3 cadeiras…`)
- veredito parcial: objeto = 35ef85be; delta desde o objeto do inspetor é SÓ registro (mandatos). Base c1cfdabe.

### 0.3 — 2026-10-10T08:26Z · check-runs do head
- cmd: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/35ef85be.../check-runs`
- saída: total=14; 14 × `completed | success` (docker×2, authority-portal×2, backend-postgres×2, owner-portal×2, flutter×2, frontend×2, backend×2)
- veredito parcial: CI CONCLUÍDO e verde no head → insumo válido; start permitido pelo §C7.1-bis.

### 0.4 — 2026-10-10T08:26Z · disco, worktrees, containers
- cmd: `df -h /c` · `git worktree list` · `docker ps -a`
- saída: livre 14G (≥10G OK); worktrees: main@c1cfdabe, w-07c, w-389@35ef85be, w-j389c1@35ef85be (C1 viva), w-pvpr@6bec9f92, w-traccar; containers vivos: j389-c1-runner/-redis/-pg (C1, NÃO TOCAR), erp-postgres/erp-redis (base viva, NÃO TOCAR); imagem `erp-junta-node20-pg16:local` presente (386MB)
- veredito parcial: terreno apto; nenhum objeto `j389-c2-*` nem `w-j389c2` pré-existente.

### 0.5 — 2026-10-10T08:30Z · worktree próprio, npm ci próprio, baseline
- cmd: `git -c core.longpaths=true worktree add --detach C:/Users/AMP/w-j389c2 35ef85be…` · `npm ci --no-audit --no-fund` (no worktree) · `DATABASE_URL=postgresql://x npx prisma generate` · `npm run check` · `env -u DATABASE_URL -u REDIS_URL node --test --import tsx tests/inventory-write-paths-guard.test.ts` (ec por variável, contagens lidas do log `scratchpad/c2-td-baseline.log`)
- saída: HEAD do worktree = `35ef85be26e4ced21b25014ea7302c2fa60288cc`; `git status --porcelain` vazio; sem `.env`; Node v20.19.5 / npm 11.7.0; `npm ci` ec 0 (diretório real, sem junction); `prisma generate` ec 0; **`npm run check` ec 0**; **T-D `# tests 12 · pass 12 · fail 0`** (D1, D1′, D1″, D2, D2′, D3, D4, D5, D6, D7, D8, D9 todos `ok`); porcelain vazio depois.
- veredito parcial: baseline verde medido na hora (§"Forma de toda mutação"); árvore pristina antes das mutações.

## 1. Item 1 — a FONTE da enumeração

### 1.1 — 2026-10-10T08:37Z · geradores do plano §2.1 re-executados no head × universo publicado pelo guard
- cmd: os 5 `grep` do plano §2.1 (a)(b)(c)(e) em `C:/Users/AMP/w-j389c2` (saída integral no scratchpad); `find` da superfície (src/prisma/scripts) × `tsconfig.json` (`include: ["src/**/*.ts"]`).
- saída: (a) ORM — 4 sítios: `inventory-prisma.repository.ts:531 stockMovement.create(` (insertMovement) + `prisma/seed-fleet.ts:171,172,173`; (a) SQL cru em src/prisma/scripts/tests/helpers: **0**; (b) escritores `cycleCount(Entry).*`: 8 sítios, TODOS em `cycle-count-prisma.repository.ts` (l.72 create, 84 createMany, 142 updateManyAndReturn, 165/225/255 updateMany, 198 updateMany, 283 updateManyAndReturn); (c) `insertMovement(` chamado em l.264, 282, 295, 364, 456, 490 (V1, V2×2, V3, V4, V5) e declarado em l.518; `inventoryItem.updateMany` l.196/252/696; (c2) chamadores externos: só `fuel-log.service.ts:564,575` e `maintenance-order.service.ts:709,720` (via `InventoryService`); (e) lock da linha do tenant: **1** sítio, `cycle-count-prisma.repository.ts:54` (`FOR NO KEY UPDATE`).
- superfície: `src/**/*.ts` = 781 arquivos (= os que o `walk` lê: 0 em `generated|dist`), `prisma/**/*.ts` sem migrations = 4, `scripts/**/*.{ts,mts}` = 3 → 788 = o `788 raízes` que o guard publica; 0 arquivos `.mts/.js/.tsx/.cts` sob src; hoje NÃO existe diretório `generated/` nem `dist/` sob src/prisma/scripts.
- veredito parcial (PARCIAL — universo publicado pelo guard confrontado no 1.1b): o gerador do plano e o conjunto estático batem (1 escritor de runtime + semente; 8 escritores de contagem no dono; 1 lock de tenant). O guard publica a superfície só como CONTAGEM (`788 raízes`), não as raízes/globs — a lista de diretórios pulados (`node_modules`, `generated`, `dist`, `prisma/migrations`) vive só no código do guard. NOTA (não bloqueia por si): a leitura do `walk` difere do `tsconfig` em um ponto — o tsc compila `src/**/*.ts` inteiro, o guard pula qualquer diretório chamado `generated` ou `dist` em qualquer profundidade → mutação N5 mede se isso é porta aberta.

### 1.1b — 2026-10-10T08:45Z · universo PUBLICADO pelo guard × derivado
- cmd: leitura do TAP do baseline (`scratchpad/c2-td-baseline.log`): linhas `# [D1] universo…`, `# [D2] universo W…`, `# [D5] universo…`, `# [D7] …`, `# [T-D] programa: 788 raízes`.
- saída: D1 publica **8** sítios = {`prisma/seed-fleet.ts:171/172/173` (create + aninhado), `inventory-prisma.repository.ts:531/532 (insertMovement)`}; `não classificados: 0`. D2 publica W = {createExitForSource, createMovement, createTransfer, removeExitForSource, reverseMovement} (5 = V1..V5); identificação = {findExitBySource, findItemById, findMovementById}. D5 publica 16 sítios, todos em `cycle-count-prisma.repository.ts`; transições CAS = {abortClose, beginClose, cancelSession, finishClose}; escritas de entrada = {recordEntryCount, stampEntry}. D7: 17/17 e 12/12 portas por `this.tx`. D3: 7 leituras `*Locked`.
- veredito parcial: conjunto a conjunto, o publicado = o derivado pelos geradores do §2.1 (1.1). IGUAL. Superfície publicada só como contagem (788).

### 1.2 — 2026-10-10T08:47Z · a enumeração vem da AST, não de texto (N6a / N6b, lote A)
- cmd: runner `scratchpad/c2-mut.mjs` (uma mutação por vez: arquivo novo → `npm run check` → `node --test --import tsx --test-name-pattern='^D1 ' tests/inventory-write-paths-guard.test.ts` → remoção → `git status --porcelain`); resultados em `scratchpad/c2-mut-a.jsonl`.
- N6a (escritor REAL numa linha após `const marcador = "/* abre comentario"`): check ec 0; D1 **`not ok`** (`fail 1`, "escritor de stock_movements fora da allowlist") → o literal não esconde o escritor. N6b (escritor SÓ dentro de string literal + `count` real): check ec 0; D1 **`ok`** (sem falso positivo).
- veredito parcial: classificador é AST (comentário/literal não enganam; código não escapa por texto). FECHADO neste recorte.

### 1.3 — 2026-10-10T08:51Z · MUTAÇÕES de fonte, lote A (arquivo novo em `src/modules/inventory/_jurado_b04a_c2*.ts`, compila sob `npm run check`, uma por vez, removido; `git status --porcelain` vazio após CADA uma — 12/12 `pristino:true`)
| # | classe | forma | compila? | camada que negou | D1 | ec |
|---|---|---|---|---|---|---|
| K2 | controle C2-02 (grafia nova) | `tx.stockMovement["createMany"]({…})` | sim (ec 0) | **guard D1** ("fora da allowlist") | `not ok` fail 1 | 1 |
| N1 | NOVA — desestruturação | `const { create } = tx.stockMovement; create({ data })` | sim | **NENHUMA** | `ok` 3/3 | 0 |
| N2 | NOVA — acesso dinâmico `as any` | `(tx as any)["stockMovement"]["create"]({…})` | sim | **NENHUMA** | `ok` | 0 |
| N2b | NOVA — tipo estrutural anônimo (sem `any`) | `const d: { create: Prisma.StockMovementDelegate["create"] } = tx.stockMovement; d.create({…})` | sim | **NENHUMA** | `ok` | 0 |
| N3 | NOVA — SQL cru em forma de CHAMADA | `tx.$executeRaw(Prisma.sql\`INSERT INTO stock_movements …\`)` | sim | **NENHUMA** | `ok` | 0 |
| N3b | NOVA — grafia SQL válida | `tx.$executeRaw\`UPDATE ONLY stock_movements SET …\`` | sim | **NENHUMA** | `ok` | 0 |
| N5 | NOVA — fora do glob | `src/modules/inventory/generated/_….ts` com `tx.stockMovement.create({…})` (tsc compila; `walk` pula `generated`) | sim | **NENHUMA** | `ok` | 0 |
| N6a | controle AST | literal com `/*` antes do escritor | sim | guard D1 | `not ok` | 1 |
| N6b | controle AST (sem falso positivo) | escritor só em string | sim | n/a (esperado verde) | `ok` | 0 |
| N7 | controle membro inventado | `findManyAndCount` via cast (a forma honesta não compila — não medida, comentada) | sim (cast) | — (não escreve; inconclusivo, não conta) | `ok` | 0 |
| N8 | NOVA — erasure por interface estrutural | `interface Gravador { create(args): unknown }` · `gravar(d: Gravador)` · `gravar(tx.stockMovement, row)` | sim | **NENHUMA** | `ok` | 0 |
| K5 | controle C2-05 (R6) | `uow.run` com 2 × `ctx.inventory.createMovement` | sim | **guard D2** (R6 "uow.run com 2 escrita(s)") | D2 `not ok` fail 1 | 1 |
- D1 publicou, em TODAS as verdes, o mesmo universo (8) e `não classificados: 0` — o escritor novo é INVISÍVEL, não "não classificado".
- **PROVA DE ESCRITA REAL (sonda F, runner `j389-c2-runner`, papel efêmero `rolsuper=false rolbypassrls=false`, dentro de `withTenantRls`):** N1 → **1 linha gravada**; N2 → **1**; N3 → **1**; N8 → **1**; N3b → `UPDATE ONLY` atualizou **5 linhas**. (`scratchpad/c2-probe3.log`, seção F.)
- veredito parcial: **REPROVA** — 7 formas novas (N1, N2, N2b, N3, N3b, N5, N8) compilam, ESCREVEM no ledger e deixam o guard D1 VERDE. A enumeração do D1 é uma propriedade sobre `<Model>Delegate` em receptor de `PropertyAccess`/`ElementAccess` + `*Unsafe`/tagged — toda outra rota sintática (callee sem receptor, receptor com tipo apagado, `$executeRaw` em forma de chamada, grafia SQL `ONLY`, diretório `generated/`) nasce permitida. Classe do C2-02 ("a forma número dez passa") com outra roupa.

## 3. Item 3 — classificação de erro (sonda `probe3.mts`, runner, 2026-10-10T08:52Z, ec 0, teardown 4 tenants → 0, índices de sonda → 0)
| via | restrição violada (criada na sonda) | classificada como | resposta | efeito no ledger |
|---|---|---|---|---|
| V4 `createExitForSource` | `zz_c2_exit_por_item` (tenant_id,item_id WHERE source_id NOT NULL) — NÃO o `source_active_key` | não reconhecida → **propaga** | `rejected P2002`, `constraint=zz_c2_exit_por_item` | 0 exits de s4, delta 0 |
| V3 `reverseMovement` | `zz_c2_estorno_por_item` (tenant_id,item_id WHERE reverses NOT NULL) — NÃO o `reversal_active_key` | não reconhecida → **propaga** | `rejected P2002`, nome certo | 0 compensações de m2, delta 0 |
| V5 `removeExitForSource` | idem | não reconhecida → **propaga** (nunca `undefined`) | `rejected P2002` | 0 compensações de e2, delta 0 |
| V3/V5 sem conflito (controle) | — | — | `fulfilled ok` | compensação gravada |
- 3.4 transitório (sonda D): `createMovement` sob `FOR UPDATE` alheio → **503 `STOCK_UNAVAILABLE/stock_busy`**; `cancelSession` (wrapper da contagem) → **503 `cycle_count_busy`**; `uow.run(lockSessionForUpdate)` → **503 `cycle_count_busy`**. Nada gravado.
- veredito parcial (3.1/3.2/3.4): FECHADO — nenhuma violação de outra restrição vira sucesso; nenhuma via conclui sem efeito. 3.3 (25P02) e a linha do índice CERTO (C7/C8) ficam para a cadeia T-C.

## 2. Item 2 — default fechado
### 2.3 — 2026-10-10T08:52Z · status desconhecido por DADO (`suspensa` semeada por SQL; sonda E)
| decisão | resultado | lado |
|---|---|---|
| `isTerminal('suspensa')` / `isWritable('suspensa')` | false / false | fechado / fechado |
| `open` do mesmo item | 409 `items_in_open_session` | fechado (SEGURA) |
| `recordEntry` na suspensa | 422 `invalid_status_transition` | fechado (RECUSA) |
| `close` na suspensa | 422 | fechado |
| `cancel` na suspensa | 422 | fechado |
| listagem sem filtro | aparece com `status: "suspensa"` | exibição (não decide) — nota |
| listagem `?status=suspensa` | 400 `invalid_status` | fechado |
| estado final | `suspensa`, `counted_quantity null` | inalterado |
- veredito parcial: tabela INTEIRA do lado fechado. Sentinela mapeado×fallback: medido na sonda G/S (abaixo).

### 1.4 / 2.2 / 2.4 / 2.6 — 2026-10-10T08:55Z · MUTAÇÕES por EDIÇÃO nos fontes vigiados (lote B; âncora única, CRLF preservado, restauração por bytes; 9/9 `pristino:true` e `hash-object = blob do head` em TODAS)
| # | classe | o que mutou | compila? | camada que negou | guard | ec |
|---|---|---|---|---|---|---|
| K1 | controle C2-01 (nome novo antes do lock, `this.<novo>()`) | `consumeQuick` + `private balanceSnapshot()` (aggregate) em `inventory-prisma.repository.ts` | sim | **guard D2** (`R2 antes do lock: this.balanceSnapshot(...) não é leitura de identificação`; W passou a incluir `consumeQuick`) | D2 `not ok` | 1 |
| N9 | NOVA — decisão antes do lock numa via que chega a `insertMovement` por `.call(this, …)` | `consumeViaCall`: aggregate direto → decide → `lockItemForUpdate` → `this.insertMovement.call(this, …)` | sim (strictBindCallApply) | **NENHUMA** — W = {V1..V5} sem `consumeViaCall` (a via sai do universo porque o alcance é medido só por `this.x(`); D1 idem | D1/D2 `ok` 5/5 | 0 |
| K7 | controle 2.4(a) via SEM lock | `semLockHonesto` (`@ts-expect-error` consumido → a forma honesta NÃO compila: TS2554) + `semLock` por cast | sim (com o @ts-expect-error) | **compilador** (honesto) e **D2** (`semLockHonesto` em W, R1=0) — o cast `semLock` NÃO entra em W (mesma classe de N9) | D2 `not ok` | 1 |
| N10 | NOVA — porta pública como PROPRIEDADE-ARROW no wrapper RLS | `readonly contarSemMapeamento = (tenantId) => withTenantRls(this.prismaClient, …)` sem `this.tx` | sim | **NENHUMA** — D7 publica `17/17 portas públicas por this.tx` (só `MethodDeclaration` conta) | D7 `ok` | 0 |
| N11 | NOVA — transição de status sem CAS por SQL cru tagged com schema | `forceConclude`: `$executeRaw\`UPDATE "public"."cycle_counts" SET status = 'concluida' WHERE …\`` no repositório dono | sim | **NENHUMA** — D5 classifica como `CycleCount … raw-tagged` DENTRO do dono (permitido), o CAS só é conferido em `cycleCount.update*` ORM e o pino textual `UPDATE\s+"?cycle_counts"?` não casa com o schema | D5/D8 `ok` | 0 |
| N11b | controle C2-06 | idem sem schema (`UPDATE cycle_counts …`) | sim | pino textual do D5 (`UPDATE cru da contagem`) | D5 `not ok` | 1 |
| K3 | controle C2-03 / 2.2 membro NOVO | `CYCLE_COUNT_STATUSES += "suspensa"` sem classificação | **NÃO** (ec 2) | **compilador** `TS1360` (satisfies) + `TS7053` ×2 | — | — |
| K3b | 2.2 membro APAGADO | sem `"fechando"` | **NÃO** (ec 2) | **compilador** `TS2367` em 4+ sítios do repositório (literais `fechando` sem overlap) | — | — |
| K3c | 2.2 entrada na tabela sem membro | `STATUS_KIND.suspensa` sem `suspensa` em STATUSES | **NÃO** (ec 2) | **compilador** `TS2353` (excesso no satisfies) | — | — |
- veredito parcial: exaustividade verificada pelo compilador NOS DOIS SENTIDOS (K3/K3b/K3c). Mas três formas novas nascem permitidas: **N9** (classe do C2-01 por indireção `.call`), **N10** (wrapper novo não enumerado), **N11** (transição sem precondição — a 2ª classe que o D5 não enxerga; classe do C2-06).

### 2.1 — 2026-10-10T08:55Z · vocabulários por EXECUÇÃO (import real no runner, árvore do head)
- `CYCLE_COUNT_STATUSES` = [aberta, fechando, concluida, cancelada]; `KIND` = {aberta/fechando: non_terminal, concluida/cancelada: terminal}; `TERMINAL` = [concluida, cancelada]; `WRITABLE` = [aberta, fechando]; `x` desconhecido → terminal? **false**, writable? **false**. `STOCK_MOVEMENT_UNIQUE_INDEXES` = reversal(tenant_id, reverses_movement_id) · sourceActive(tenant_id, source_type, source_id) · cycleCountItem(tenant_id, cycle_count_id, item_id). `STOCK_MOVEMENT_TYPES` = [entrada, saida, consumo, ajuste, link, unlink]; custódias [base, professional, vehicle]. `mapTransientDbFailure`: P2028 → busy; 40P01 cru (`meta.driverAdapterError.cause.code`) → busy; P2002 → propaga; código desconhecido P9999 → propaga (lado fechado).

### 2.3-sentinela e 2.5 — 2026-10-10T08:56Z · sonda G/S (runner; a tabela de status MUTADA na CÓPIA do runner e restaurada: sha1 `31c423884cb3` antes = depois)
- S (árvore intacta): TERMINAL=[concluida,cancelada]; `open` do item em sessão `suspensa` → **409** (fallback SEGURA); `cancel` → 422. S-mut (`suspensa` MAPEADA como `terminal`): TERMINAL=[concluida,cancelada,**suspensa**]; `open` → **fulfilled (sessão nova `aberta`)** — liberou; `cancel` → 422. → **mapeado ≠ fallback**: só a entrada mapeada mudou a decisão; o desconhecido continua do lado fechado.
- G (I7 no escopo TRANSACIONAL, medido por `FOR UPDATE SKIP LOCKED` do admin DENTRO da tx da unidade): fora de tx **0**; `uow.run` com 1 `createMovement` → **1** item travado; `uow.run` COMPOSTA (a + b) → **2** (a violação existe e é mensurável no escopo da tx — e o guard R6 a reprova estaticamente: K5); `createTransfer` (2 pernas, mesmo item) → **1**; depois **0**.

### 3.3 / 3.5 — 2026-10-10T08:56Z · cadeia T-C no runner (`tests/inventory-unique-backstops-db.test.ts`, banco próprio `erp_c2`, papel efêmero)
- baseline: **8/8 ok** (C0, C1, C2, C3, C6, C9, C7, C8) → linhas do índice CERTO para a tabela do item 3: V3 (C7) → 409 `movement_already_reversed`, 1 compensação; V5 (C8) → `undefined`, 1 compensação; ambos FORA da tx.
- **K4 (controle C2-04 — índice ERRADO no wrapper V5):** l.882 `STOCK_MOVEMENT_UNIQUE_INDEXES.reversal` → `.cycleCountItem` na cópia do runner → T-C `# fail 1`: **`not ok 8 - C8`** (`expected: 'undefined'`, a violação do índice certo passou a PROPAGAR); restaurado, sha1 `f4efdbbbb08a` antes = depois. → a rede pega a classificação errada POR COMPORTAMENTO (D6 estático ficaria verde: a forma `isUniqueViolationOf(error, STOCK_MOVEMENT_UNIQUE_INDEXES.\w+)` casa) — mutação de sanidade: algum caso ficou vermelho.
- **índice AMBÍGUO** (`zz_c2_same_cols` com as MESMAS colunas do `reversal`, outro predicado): C9 **`not ok`** («reversal: 2 índices únicos com o mesmo conjunto de colunas (ambíguo)»); removido → C9 `ok`; índices únicos restantes = os 5 do catálogo.
- **25P02 no log do servidor (prefixo `%e`, `log_min_error_statement=error`), após sonda A/D/E/F/G/S + 4 execuções da T-C (C7/C8 concorrentes inclusive): `25P02` = 0** · `23505` = 50 (os esperados: C1/C2/C7/C8 + minhas violações provocadas) · `42501` = 4 (C6 sob o papel) · nenhum outro SQLSTATE de erro.
- veredito parcial (item 3 inteiro): FECHADO — classificação por identidade (colunas ou nome), outra restrição propaga, nenhum sucesso silencioso, 0 × 25P02, 503 em todo wrapper medido; rede não tautológica (K4, C9-ambíguo).

## T. Teardown — 2026-10-10T08:59Z
- cmd: `git -C C:/Users/AMP/w-j389c2 status --porcelain` · `hash-object` × `rev-parse 35ef85be:<f>` nos 4 arquivos tocados · `wmic process where CommandLine like %w-j389c2%` · `docker rm -f -v j389-c2-runner j389-c2-pg j389-c2-redis` · `docker network rm j389-c2-net` · `docker ps -a / network ls / volume ls` · `git worktree remove --force C:/Users/AMP/w-j389c2` · `git worktree list` · `df -h /c`
- saída: porcelain vazio; IGUAL ×4 (`inventory-prisma.repository.ts` 11459e26f717, `cycle-count-prisma.repository.ts` 214e262210ef, `cycle-count.types.ts` b0ebebab63b3, `inventory-write-paths-guard.test.ts` b0c461f9e6bd); nenhum `_jurado_b04a_c2*` nem `generated/` restante; 0 processos; containers/redes/volumes `j389-c2*` = 0/0/0; `erp-postgres`/`erp-redis` Up intocados; worktree removido (ec 0, diretório ausente); `git worktree list` = main, w-389, w-pvpr, w-traccar (w-j389c1 e w-07c já não constavam — não removidos por mim); disco 11 GB livres.
- objetos: criados 1 worktree + 3 containers + 1 rede + 12 arquivos de mutação + 9 edições por âncora + 2 sondas/3 scripts no runner; derrubados 1 worktree + 3 containers + 1 rede; restaurados 21/21.
- Nada escrito no repositório além de `c2-C2-evidencia.md` e `c2-C2-voto.json` neste diretório (não commitados).

## VOTO (o arquivo `c2-C2-voto.json` é o voto; esta é a linha final)
VOTO: REPROVADO — o membro não previsto nasce PERMITIDO: 10 vias novas (N1, N2, N2b, N3, N3b, N5, N8 no D1; N9 no D2; N10 no D7; N11 no D5) compilam sob `npm run check`, 4 delas provadas gravando no ledger sob papel efêmero (1 linha cada) e 1 atualizando 5 linhas, e deixam o guard VERDE | escopo: dentro-do-bloco (`tests/inventory-write-paths-guard.test.ts` nasce em 9a86b524 2026-09-18, reescrito em 1644c2a7 2026-09-20 e 518b8ccd 2026-10-10; ausente em `origin/main` c1cfdabe) | evidência: lotes A (12) e B (9) de mutações uma a uma com `npm run check` + `node --test` (ec por variável), 21/21 restauradas com hash-object = blob; sonda F: N1/N2/N3/N8 → 1 linha gravada cada, N3b → 5 linhas; controles do ciclo 1 (K1, K2, K3, K4, K5, N11b) todos vermelhos. Classe declarada para o ciclo 3: defeito de ENFORCEMENT (guard de enumeração), não de produto em caminho alcançável hoje.

### 0.6 (registro da legalidade, lido antes do mérito às 08:27Z) · parecer do inspetor
- cmd: leitura de `insp-c2-parecer.md` @35ef85be (51 linhas).
- saída: veredito **LIBERADO COM RESSALVA** (2026-10-10T07:56Z), objeto ae863e1a → delta até 35ef85be só registro (Emenda 7 + mandatos); ressalvas R1–R7 lidas: R1 aplicada (prefixo `j389-c2-*`, caminho curto `C:/Users/AMP/w-j389c2`, detached), R2 cumprida (corpo pelo blob do head + md5 EOL-neutro, modelo Fable explícito), R3 cumprida (mandato C2c2.md existe na ref, pré-voo OK), R4 (disco ≥ 10 GB medido: 14 GB no início, 11 GB no fim), R5/R6 notas, R7 insumo da C3.
- veredito parcial: junta legalmente aberta para esta cadeira.
