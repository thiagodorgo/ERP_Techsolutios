# PORTEIRO PÓS-MERGE — PR #389 (B-O6R-04a, consistência do estoque sob concorrência)

**Substituição de modelo declarada:** papel `porteiro-pos-merge` · rodou em **Claude Opus 5.5** (claude-opus-5-5), nível menor ·
o frontmatter diz `fable`; o Fable não foi usado por **decisão do dono de 2026-10-10**: *"o topo fica só no plano e em toda
reprovação de junta"*. Isto não é esgotamento de cota; é decisão de alocação do dono, declarada aqui e a declarar na ata/registro.

- Corpo carregado: `git show ab52ec50:.claude/agents/porteiro-pos-merge.md` → md5 EOL-neutro `374b1b0d091a85cddf1733d3e51456ae` (esperado igual: CONFERE), 78 linhas.
- Ref medida (§A7): `ab52ec5065dec1fd542e8280f0f2150187780955` (= `origin/main` e `HEAD` da árvore principal no início, 2026-10-10T15:16Z).
- Início: 2026-10-10T15:16:45Z.
- KPI congelado (§C7.8(5)): `Kpis/*` não é cobrado.

## 1. Promessa × diff — ver CONCLUSÕES ao fim
## 2. Contagens reexecutadas — ver CONCLUSÕES ao fim
## 3. Rito e registro — ver CONCLUSÕES ao fim
## 4. Limpeza §C5 — ver CONCLUSÕES ao fim
## 5. O que bloqueia o próximo alvo — ver CONCLUSÕES ao fim
## Veredito — ver CONCLUSÕES ao fim

---
## Evidência incremental (P1)

### E1.0 — o merge existe (15:17Z)
- `git fetch origin --prune; git rev-parse origin/main` → `ab52ec5065dec1fd542e8280f0f2150187780955`; `git log origin/main -1` → "fix(inventory): o estoque fica consistente sob concorrência (B-O6R-04a) (#389)", 2026-10-10 12:15:33 -0300.
- `gh pr view 389 --json state,mergedAt,mergeCommit,headRefOid` → state=MERGED, mergedAt=2026-10-10T15:15:33Z, mergeCommit=ab52ec50…, head=e852304c40ef60f0a08468adfe846f852c3a3b8f. **CONFERE.**

### E1.1 — delta do squash × approved_head (15:19Z)
- `ab52ec50^` = `c1cfdabe` (#413). `git merge-base --is-ancestor c1cfdabe 622bf845` e `… e852304c` → ambos verdadeiros; merge-base = c1cfdabe nos dois.
- `git rev-parse e852304c^{tree} ab52ec50^{tree}` → `b792f827…` == `b792f827…` (o squash é byte a byte a árvore do head no merge).
- `git log --oneline 622bf845..e852304c` → 3 commits `docs(registro)` (C3, C1, C2+ata). `git diff --stat 622bf845 e852304c` → 8 arquivos, todos em `agent-orchestration/omega/juntas/` (ata ciclo3, 00-quedas, c3-C1/C2/C3 evidência+voto), 508+/0−.
- patch-id `--stable` de `git diff ab52ec50^ ab52ec50` excluindo os 8 = `870d973acdcc86209f461fd338ef25364fb496f6`; de `git diff c1cfdabe 622bf845` excluindo os mesmos 8 = `870d973acdcc86209f461fd338ef25364fb496f6`. **IGUAIS.**
- Veredito parcial: o delta de produto do squash é o do approved_head; o que o head do merge acrescentou é só registro. **CONFERE.**

### E1.2 — escopo (15:21Z)
- `git diff --stat ab52ec50^ ab52ec50 -- . ':(exclude)agent-orchestration/omega'` → 35 arquivos, 9758+/345−. `Kpis/*` = 0 arquivos (coerente com §C7.8(5) e Emenda 6 (bb)).
- Fora do PERMITIDO base, cada um tem autorização nominal no comando: `.github/workflows/ci.yml` (+9, Emenda 1(c), só linhas SUITES — a conferir), `docs/revisoes/O6R/{achados.jsonl,REGISTRO_ACHADOS_O6R.md}` (Emenda 1(b)/6(cc)), `scripts/inventory-duplicates-census.sql` (Emenda 2(g)), `tests/inventory-cycle-counts-routes.test.ts` (Emenda 4(t)), `tests/db-catalog-write-guard.test.ts` (Emenda 5(x)). 8 corpos de jurado `.claude/agents/especialistas/jurado-o6r04a-c2-*` + espelho `.agents/` = artefatos de junta (inspetor exige corpo commitado no ramo julgado). `src/` só `src/modules/inventory/**` (8 arquivos). Nenhum `frontend/ mobile/ infra/ .env` nem lockfile.
- `git diff ab52ec50^ ab52ec50 -- .github/workflows/ci.yml` → +9: 1 bloco de comentário + 4 linhas `SUITES="$SUITES tests/inventory-{balance-lock-race,cycle-count-close-units,unique-backstops,migration-drill}-db.test.ts"` antes do `node --test`. Só SUITES (Emenda 1(c)). **CONFERE.**
- `git diff … -- prisma/schema.prisma` → +6, só comentário `//` sobre os 2 índices que o Prisma não modela. Nenhum model/campo alterado. **CONFERE.**

### E1.3 — DAT-002: lock antes da leitura que decide (15:24Z)
- `git show ab52ec50:src/modules/inventory/inventory-prisma.repository.ts` l.510–515: `lockItemForUpdate` = `$queryRaw` tagged `SELECT * FROM "inventory_items" WHERE tenant_id=… AND id=… FOR UPDATE`; único produtor do token `ItemWriteLock` (tipo branded l.77–78).
- l.234–243 `createMovement`: 1º statement = `lockItemForUpdate`; só então `saldoOfCustodyLocked(lock, custody)` → `wouldOverdraw` → 409. Idem `createTransfer` (l.269/276), reversão (l.323/326/341/358), saída por origem (l.438/441/451) e estorno por origem (l.482/485). As leituras `*Locked` e `insertMovement` exigem o token (l.522–527 recusa inserir movimento de item ≠ item travado).
- Veredito parcial: o lock (`FOR UPDATE` na linha do item) precede a leitura do saldo em toda via V1–V5 lida. **CONFERE.**

### E1.4 — DAT-003: fechamento em unidades retomáveis (15:25Z)
- `git show ab52ec50:src/modules/inventory/cycle-count.service.ts` l.160–284: `beginClose` (CAS `aberta→fechando` sob `FOR UPDATE` da sessão, ou retoma `fechando`) → laço `for` com **uma `uow.run` por item** divergente sem ajuste: `lockSessionForUpdate` → exige `fechando` → `findEntry` relido (já carimbado = `return`, idempotente) → `createMovement` (lock do item DENTRO da unidade, I7) → `stampEntry` → commit. `catch` → `abortClose` (S-01) e propaga o erro original. `finishClose` = sessão `FOR UPDATE` + total da sessão inteira no banco + CAS `fechando→concluida`.
- Backstop de banco: `stock_movements_cycle_count_item_key` UNIQUE parcial `(tenant_id, cycle_count_id, item_id) WHERE cycle_count_id IS NOT NULL` (migração).
- Veredito parcial: fechamento retomável por unidade, com unicidade por CAS + releitura + índice. **CONFERE.**

### E1.5 — a migração é aditiva (15:26Z)
- `git show ab52ec50:prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql` (42 linhas, único arquivo do diretório; última migração da ref).
- Conteúdo executável: `DO $censo$` (só `set_config('row_security','off',true)` local à transação + `WITH … SELECT count(*)` + `RAISE EXCEPTION` se `grupos > 0` ou se o papel é cego, com `42501` → `raise_exception`) e 2 × `CREATE UNIQUE INDEX … WHERE … IS NOT NULL`.
- `grep -n -iE '\b(DELETE|UPDATE|INSERT|TRUNCATE|DROP|ALTER TABLE|MERGE|COPY)\b'` → só l.3 (comentário "nenhum UPDATE/DELETE") e l.41–42 (o down, comentado). **Zero DML, zero DROP executável.** Parada §C7.5 não acionada.
- Fail-closed: aborta com contagem real + amostra ≤20 por id de movimento/contagem/item (sem `tenant_id`) e **nunca deduplica**. `scripts/inventory-duplicates-census.sql`: só `SET row_security=off` + 3 `SELECT` (somente leitura; a saída dele tem `tenant_id`, fica com o dono, não versionada).
- Nota (não bloqueia): `CREATE UNIQUE INDEX` sem `CONCURRENTLY` toma lock SHARE em `stock_movements` durante a construção — em produção, escritas de estoque esperam o build do índice. Aceitável numa migração Prisma (roda em transação, onde `CONCURRENTLY` é proibido); vale um aviso no roteiro de deploy (`B-SAN3-10`).
- Veredito parcial item 1: **CONFERE** (delta = approved_head; DAT-002 e DAT-003 no código; migração aditiva e fail-closed).

### E2.0 — worktree próprio (15:30Z)
- `git worktree add --detach C:/Users/AMP/w-port389 ab52ec5065dec1fd542e8280f0f2150187780955` → HEAD = ab52ec50…, `status --porcelain` vazio. `npm ci --no-audit --no-fund` → "added 326 packages", exit 0 (avisos EBADENGINE: Node do host v20.19.5). `node_modules` é diretório real: 0 symlink, `dir /AL` sem junction.
- EOL: `core.autocrlf=true` no host → worktree em CRLF (ex. `inventory-write-paths-guard.test.ts` wt_CR=1339, blob_CR=0). O CI roda em LF; por isso as suítes `-db` vão para um runner Linux com cópia LF (E2.2).

### E2.1 — guard T-D e regressão em memória, no worktree Windows (15:33Z)
- `DATABASE_URL=<fictícia> npm run db:generate` → ec 0.
- `node --test --import tsx tests/inventory-write-paths-guard.test.ts` → **tests 12 · pass 12 · fail 0 · skipped 0 · cancelled 0**, ec 0, 48,1 s.
- `node --test --import tsx tests/{inventory-abc,inventory-cycle-counts-routes,inventory-items-routes,inventory-stock-decrement,inventory,stock-custody,stock-movements-routes}.test.ts` (sem DATABASE_URL) → **tests 67 · pass 67 · fail 0 · skipped 0**, ec 0, 16,0 s.
- Veredito parcial: T-D e regressão em memória verdes sob CRLF/Windows.

### E2.2 — terreno Linux próprio (15:38Z)
- `docker network create port389-net`; `port389-pg` (postgres:16, env igual ao job `backend-postgres` do ci.yml: db erp_techsolutions, user/senha postgres), `port389-redis` (redis:7), `port389-runner` (erp-junta-node20-pg16:local, `sleep infinity`). `docker ps` → Ports só `5432/tcp`/`6379/tcp`/vazio: **nenhuma porta publicada**. Base viva (erp-postgres/erp-redis, 5432/6379 do host) não é alvo.
- Código no runner: `git -c core.autocrlf=false archive ab52ec50 | docker exec -i port389-runner tar -x -C /w` (ec 0/0) → 3983 arquivos = `git ls-tree -r` 3983; md5 runner == md5 blob em 4 arquivos amostrados (guard T-D, repo prisma, migração, T-B), CR=0 em todos. A cópia é LF fiel à ref (sem a injeção de CR do §C7.1-ter(c)).
- Runner: Node v20.20.2, **sem `psql`** (`psql: command not found`). Divergência com a premissa do mandato ("imagem com psql 16"); é o mesmo `IMG-C1-01` já registrado pela C1 do ciclo 3. Sem efeito: as 4 suítes não chamam `psql` (`grep psql|pg_dump|spawn|execFile` → só `execFileSync(process.execPath, [prisma CLI, "migrate","deploy"])` no drill); `psql` 16.14 existe em `port389-pg`. Nota, não bloqueia.

### E2.3 — migrações no terreno próprio (15:41Z)
- Runner: `npm ci` ec 0 → `npm run db:generate` ec 0 → `npx prisma migrate deploy` ec 0 ("All migrations have been successfully applied", última `20260873000000_add_stock_movements_unique_backstops`) → `npm run db:seed` ec 0.
- `psql` em port389-pg: `_prisma_migrations` 108 / 108 concluídas (= 108 diretórios em `git ls-tree -d ab52ec50 prisma/migrations/`). `pg_indexes`: `stock_movements_cycle_count_item_key` UNIQUE btree (tenant_id, cycle_count_id, item_id) WHERE cycle_count_id IS NOT NULL; `stock_movements_reversal_active_key` UNIQUE btree (tenant_id, reverses_movement_id) WHERE reverses_movement_id IS NOT NULL. O censo passou (base vazia, 0 grupos).

### E2.4 — check-runs (15:43Z)
- `gh api repos/{owner}/{repo}/commits/<sha>/check-runs`:
  - `e852304c` (head no merge): total 14, **14/14 completed/success** (docker×2, frontend×2, backend-postgres×2, owner-portal×2, flutter×2, backend×2, authority-portal×2 — gatilhos push + pull_request).
  - `622bf845` (approved_head): total 14, **14/14 completed/success**.
  - `ab52ec50` (main): total 8 — backend, backend-postgres, flutter, frontend, owner-portal, authority-portal **success**; deploy **skipped**; docker **in_progress** às 15:43Z (re-medir).

### E3.1 — atas e votos (15:50Z)
- `git show ab52ec50:agent-orchestration/omega/juntas/J-B-O6R-04a-ciclo2.md` → "VEREDITO: REPROVADO (2 × 1)", objeto `35ef85be`; C1 APROVADO, C2 REPROVADO (4 `bloqueia` D1/D2/D7/D5, todos do GUARD), C3 APROVADO; §C7.4-bis com os 3 papéis e as perguntas (a)(b)(c) respondidas. `R-B-O6R-04a-ciclo1.md` e `R-B-O6R-04a-ciclo2.md` presentes em `omega/reprovacoes/`.
- `… J-B-O6R-04a-ciclo3.md` → "VEREDITO: APROVADO (3 × 0, unanimidade)", linha **`approved_head: 622bf8453d2d60ecb6577aa611b2d87645a689ae`**; papéis do §C7.4-bis (achou C2 c2; planejou planejador-retomada (Fable); dev ninguém; 3 identidades novas). Modelos declarados por cadeira (C1 Codex Sol, C2 Codex Sol→Claude Opus 5.5, C3 Claude Opus 5.5), "nível menor por decisão do dono de 2026-10-10".
- Votos JSON (parse com `node -e`): c2-C1 APROVADO/0 bloqueia · c2-C2 REPROVADO/**4** bloqueia · c2-C3 APROVADO/0 (head 35ef85be) · c3-C1 APROVADO/0 (head_medido 622bf845, 14/14) · c3-C2 APROVADO/0 (head_medido 622bf845; instância 2 relançada) · c3-C3 APROVADO/0 (objeto 622bf845). **Votos == atas.**
- Inspetor c3 (`insp-c3-parecer.md` l.5): "LIBERADO COM RESSALVA — 2026-10-10T13:35:54Z" sobre `de1dff89`. Reconciliação do delta que o próprio parecer pede (l.50): `git log de1dff89..622bf845` = 2 commits `chore(junta)` (parecer + mandatos); `git diff --exit-code de1dff89 622bf845 -- src tests prisma scripts .github` → ec 0 (vazio); `git diff --exit-code 35ef85be 622bf845 -- <mesmos>` → ec 0 (ciclo 3 sem dev, confirmado). `bb083ea5` (citado na ata) é ancestral do approved_head. Check-runs no novo objeto 14/14 (E2.4).
- `00-quedas.md`: 2 linhas P6 com colunas fixas (inspetor c2 inst.1, 429 sessão; C2 c3 inst.1, limite Codex → relançada em Claude Opus, mesma identidade). Coerente com a ata.
- Nota (não bloqueia): o título do `00-quedas.md` diz "junta do ciclo 2", mas a 2ª linha é da C2 do ciclo 3 — rótulo de cabeçalho desatualizado.

### E2.5 — as 4 suítes `-db` do estoque, contagem reexecutada (15:55Z)
- Runner Linux LF, `DATABASE_URL=postgresql://postgres:<senha-descartável-redigida>@port389-pg:5432/erp_techsolutions`, `REDIS_URL=redis://port389-redis:6379`, uma por vez (`timeout 1500 node --test --import tsx tests/<s>.test.ts`):
  - `inventory-balance-lock-race-db` (T-A): **16/16**, fail 0, skip 0, ec 0, 12,4 s
  - `inventory-cycle-count-close-units-db` (T-B): **22/22**, fail 0, skip 0, ec 0, 23,2 s
  - `inventory-unique-backstops-db` (T-C): **8/8**, fail 0, skip 0, ec 0, 1,6 s
  - `inventory-migration-drill-db` (T-C′): **6/6**, fail 0, skip 0, ec 0, 11,5 s
  - **Total 52/52, 0 skip** = o "52/52" do dev (e o N=52 da Emenda 5(y)). Reproduz.
- As 4 juntas em paralelo (forma do job `backend-postgres`): **tests 52 · pass 52 · fail 0 · cancelled 0 · skipped 0**, ec 0. As 10 menções a `40P01|XX000|25P02` no TAP são nomes de teste ("zero 40P01"…) e as 2 linhas de diagnóstico do CONTROLE B8(i) (`P2010/40P01 / ok`, o vermelho esperado do desenho antigo) — nenhuma é erro.
- Casos que importam, por nome: `A0`/`B0` "postura dos dois papéis (NOSUPERUSER, sem BYPASSRLS) … READ COMMITTED"; `A1 [encerramento]` "20 saídas concorrentes de 1 sobre saldo 10 × RACE_N → exatamente 10, saldo 0"; `A2 [barreira]` "409 e saldo 0 (não −1)"; `B1 [encerramento]` "fechamento 2× concorrente → exatamente 1×200 + 1×422, UM ajuste"; `B2 [retomável]`; `B6 [cross-tenant]` → 404, nada muda em T2; `B15 [S-02]` → −60, zero duplicata.
- Teardown das suítes: `pg_roles` não-sistema ≠ postgres = **0**; bancos extras = **nenhum** (o drill derrubou o seu); `stock_movements` = 0. Sem resíduo.
- T-D no runner Linux LF: **12/12**, fail 0, skip 0, ec 0 (= Windows CRLF 12/12).
- Veredito parcial item 2: **CONFERE** — 52/52 `-db`, T-D 12/12, regressão em memória 67/67, todos reexecutados.

### E2.6 — determinismo da bateria (item 4 da `D-GUARDA-POR-PROPRIEDADE-BLOCO-TRANSVERSAL`) (16:05Z)
- A decisão do dono de 2026-09-20 (decisoes.md l.3095–3126, item 4): "Nada do #389 entra na `main` até a bateria estar determinista". A retomada (`D-ORDEM-NOITE-2026-10-10` + Emenda 6(dd)) trouxe só `3fb275ad` (teto vira detector de travamento) e `010742c0` (saem 3 `sleep(20)`); o portão causal (`pg-barrier`, 11 esperas → 0) ficou no ramo `wip/bateria-estoque-preservacao` para o `B-BAT-01`. Plano de retomada R3.4 (l.743) DECLARA: esperas fixas restantes = forma de teste, exposição residual a intermitência, nunca `bloqueia`.
- `git show <ref>:<suite> | grep -cE '\bsleep\(|setTimeout\(|delay\('` (inclui definição e comentários): balance-lock c1cfdabe 0 → ab52ec50 **8**; cycle-count 0 → **14**. Há `sleep(1500)`/`sleep(300)`/`sleep(5500)` vivos (ex. balance-lock l.532/534/592).
- Medição própria, terreno sem outros clusters do bloco, banco intacto entre rodadas: 1 rodada por arquivo + 1 paralela + **5 paralelas** (`for i in 1..5`) → **7/7 com 52/52, fail 0, skip 0**, 26–27 s cada. Denominador constante.
- CI `backend-postgres` (roda as 4 com as demais suítes `-db`, sem retry, runner GitHub): success em 35ef85be (ata c2), 622bf845, e852304c (×2) e ab52ec50.
- Veredito parcial: nenhuma intermitência observada em 7 + 5 execuções; o determinismo **por construção** não foi entregue (as esperas fixas seguem); o risco residual está declarado no plano, mas o `B-BAT-01` que o carrega **não existe como bloco nem como pendência na `main`** (`git grep B-BAT-01 ab52ec50 -- agent-orchestration/controle/pendencias.md` → só como dono alternativo da `-CENSO-DETECTOR-DE-LITERAIS`). → RESSALVA (registro), não bloqueio.

### E3.2 — índice gerado e as 5 pendências novas (16:08Z)
- Cópia descartável `scratchpad/gen389` com `git show ab52ec50:` de `pendencias.md` e `gerar-indice-pendencias.py`; `python gerar-indice-pendencias.py` → ec 0, "499 cabecalhos / 488 IDs | FECHADA 125, ABERTA 371, SEM-STATUS 3". md5 EOL-neutro gerado `3175d84ae53fc48345d21653bd9c6359` == versionado `3175d84ae53fc48345d21653bd9c6359`; `diff` vazio. **Índice em dia.**
- As 5 em `pendencias.md` (ref ab52ec50): `P-O6R-B04-GUARD-D1-ESCRITOR-POR-FORMA` l.10628 · `-D2-INDIRECAO-AO-LEDGER` l.10638 · `-D7-PORTA-COMO-PROPRIEDADE` l.10647 · `-D5-TRANSICAO-POR-SQL-CRU` l.10656 (MÉDIA cada) · `P-O6R-B04-CENSO-DETECTOR-DE-LITERAIS` l.10665 (BAIXA). Todas `status: ABERTA`, `dono: B-GOV-GUARDA-POR-PROPRIEDADE` (a do censo: "ou B-BAT-01"), "bloqueia: não o merge do #389". Cabeçalho único cada. As 5 estão no índice (balde de abertas, coluna dono = sim).
- Nota: `B-GOV-GUARDA-POR-PROPRIEDADE` é nome do orquestrador (Emenda 8 (ss)); a decisão-mãe é do dono (`D-GUARDA-POR-PROPRIEDADE-BLOCO-TRANSVERSAL`, 2026-09-20), mas o bloco não está no §5 do `PLANO_SAN3.md` nem tem comando (`git grep` → só registro do #389). Dono nomeado ≠ bloco planejado. → RESSALVA de registro.

### E3.3 — amostra de 3 pendências antigas do bloco + 1 fechada (16:14Z)
- `P-020` (pendencias.md l.247, ALTA; índice: ABERTAS balde A): apenso do bloco (l.10585) diz "fechada na autoria pelo B-O6R-04a; backfill pós-merge". **No código:** `lockItemForUpdate` antes de toda leitura que decide (E1.3); **por execução:** A1 "20 saídas concorrentes de 1 sobre saldo 10 → exatamente 10, saldo 0" verde 8× (E2.5/E2.6). Conserto VERDADEIRO; a linha `status:` segue "aberto" → backfill devido.
- `P-021` (l.260, MÉDIA; índice: FECHADAS): apenso diz que a idempotência segue viva dentro da unidade. **Por execução:** `ok 24 - B7 [legado P-021] · aberta com um ajuste da sessão gravado antes do bloco → reaproveita (1 ajuste) e o total o inclui`; no código, `prior ?? createMovement` (cycle-count.service.ts l.216–230). CONFERE. (Nota pré-existente: dono "a atribuir" no índice.)
- `P-O6R-B04` (l.2918, ALTA, "BLOQUEIA estoque"; índice: ABERTAS balde A): apenso → "PARCIAL na autoria"; DAT-002/003 fechados no código (E1.3/E1.4), `Ω6R-QUA-002` (P1) segue com o `B-O6R-04b`. Linha `status:` não mudou ("o fechamento só conta quando estiver na main") → backfill devido: PARCIAL.
- Fechada amostrada: `P-O6R-B04-DIVERGENCIA-ESCOPO-TESTE-ISOLAMENTO` (FECHADA) diz que a ratificação está na Emenda 4-(t) → `git show ab52ec50:…/B-O6R-04a-inventory-consistency.md | grep -c 'D-1 ratificada'` = 1. CONFERE.
- `achados.jsonl`: Ω6R-DAT-002 `ativo`; Ω6R-DAT-003 `ativo` + `nota_criterio` (emenda 3-q). `REGISTRO_ACHADOS_O6R.md` l.632/668: "fechado NA AUTORIA do B-O6R-04a (PR #389); … mudam no marco de KPI". `node --test tests/kpi-achados-paridade.test.ts` → 6/6. Coerente com Emenda 6 (cc) e o KPI congelado.
- Veredito parcial item 3: **CONFERE**, com dívida de registro pós-merge (P-020 → FECHADA, P-O6R-B04 → PARCIAL, nascimento de `B-BAT-01`/`B-GOV-GUARDA-POR-PROPRIEDADE` como bloco ou pendência com dono) — é o Passo 6 do próprio plano de retomada (l.784), no PR semanal de registro.

### E4 — limpeza §C5 (16:18Z)
- `git worktree list` → main@ab52ec50, w-07ca (fix/o6r07c-subresource-scope, NÃO tocado), w-port389 (meu), w-pvpr@bb083ea5, w-traccar. **`w-389` ausente** (`ls -d C:/Users/AMP/w-*` sem w-389). CONFERE.
- `git branch --list fix/inventory-consistency` → vazio; `git ls-remote --heads origin fix/inventory-consistency` → vazio. **Ramo removido no local e no remoto.** CONFERE.
- `git ls-remote --heads origin wip/bateria-estoque-preservacao` → `dee45faf…` **PRESERVADO no remoto** (sem cópia local — não é necessária). CONFERE.
- `docker ps -a` (antes dos meus) → só erp-postgres (Up, viva do dono), erp-redis (Up, viva), erp-postgres-alt (Exited 3 semanas), pastrack-teste-banco-teste-1 (Exited 2 semanas) — nenhum `j389*`, `dev389*`, `j389c3-*`. `docker network ls` → nenhuma rede do bloco (só erp_techsolutions_local, pastrack-teste_default + a minha port389-net). `docker volume ls | grep -iE '389|o6r|04a'` → vazio. **Nenhum container de cadeira/dev do bloco vivo.** CONFERE.
- Árvore principal: `git status --porcelain | grep '^ D'` → 0 (nenhum rastreado apagado). `dist`, `frontend/dist`, `coverage`, `.vite` ausentes. Único untracked: `agent-orchestration/omega/juntas/TEMPLATE-J-ata.md` (mtime 2026-09-07, anterior ao bloco — alheio, não varro).
- Disco: `df -h /c` → **16 GB livres** (≥ 10 GB; `DEEP_CLEAN` não é necessário — e a Emenda 6 (ii) proíbe rodá-lo enquanto a imagem `erp-junta-node20-pg16:local` for o terreno das juntas).
- **Resíduo a nomear (nota, não bloqueia):** `C:/Users/AMP/w-pvpr` — worktree detached em `bb083ea5` (commit do ramo do #389), criado 2026-10-10 03:25, 69 MB, sem node_modules, 2 untracked (`scripts/mandato-preflight.sh`, `scripts/mandato-refs.sh`). É o arnês de pré-voo dos mandatos montado pelo orquestrador (mandato C1c3 l.73 "pré-voo do ramo do B-GOV-MANDATO copiado para um arnês local"). Pode servir ao pré-voo da junta do 07c-a; a remoção (por nome, `git worktree remove --force`) é decisão do orquestrador quando não for mais usado. Não toquei.
- Veredito parcial item 4: **CONFERE**, com 1 resíduo nomeado (w-pvpr) para o orquestrador decidir.

### E5 — o que bloqueia o próximo alvo (16:30Z)
- PR #414 (`gh pr view 414`): OPEN, draft, head `d4cd35e38b55adab71c5a4bc2bd179139c1f52f9`, ramo `fix/o6r07c-subresource-scope`; check-runs **14/14 completed/success**. Base = `c1cfdabe` (NÃO contém ab52ec50); `git merge-tree --write-tree ab52ec50 origin/fix/o6r07c-subresource-scope` → ec 0 (sem conflito); arquivos em comum com o squash do #389 = **0**; `git diff c1cfdabe d4cd35e3 -- src | grep -cE '^\+.*(inventory|stock)'` = **0**. O plano do 07c (`docs/revisoes/SAN3/B-O6R-07c-plano.md` l.354–360, no ramo) mediu a interseção com o #389 e reordenou a trava `SAN3-13 → 07c` para `07c-a → SAN3-13` (o SAN3-13 não começou; `git log --grep SAN3-13 ab52ec50` vazio).
- Pendências com "bloqueia" que nomeiam o 07c/07c-a como alvo bloqueado: nenhuma (`grep 07c` em pendencias.md → só linhas de "dono: B-O6R-07c"). Trava de `prisma/` (§6): `04a → 03a → …` — o merge do 04a **libera** o `03a`.
- Deploy: `deploy-staging.yml` dispara em `push` na main, gated por `vars.STAGING_DEPLOY_ENABLED == 'true'`; em ab52ec50 → `deploy-staging push completed skipped` (`gh run list --commit ab52ec50`). A migração NÃO rodou fora do CI. `deploy-production.yml` l.136–138: `npx prisma migrate deploy` com `DATABASE_URL=secrets.PROD_DATABASE_URL` (staging: `STAGING_DATABASE_URL`, l.44–46). A migração aborta "censo CEGO" se esse papel não for superusuário/BYPASSRLS, e aborta com contagem se houver duplicata — e então todo deploy seguinte responde P3009 até `prisma migrate resolve --rolled-back`.
- Registro de modelo: a decisão do dono de 2026-10-10 ("o topo fica só no plano e em toda reprovação de junta") aparece só em `J-B-O6R-04a-ciclo3.md` l.11–16 e nos votos c3; `git grep -iE 'topo fica|nível menor|topo no plano' ab52ec50 -- agent-orchestration/controle/decisoes.md CLAUDE.md AGENTS.md` → vazio. O registro vigente é `D-FABLE-ASTRA-SO-DINHEIRO` (decisoes.md l.2982, 08/10: Fable/Astra em bloco de dinheiro — o #389 é). Conflito não registrado (§A2) → RESSALVA de registro. A minha própria substituição (Opus) se apoia nessa decisão, relatada pelo invocador e pela ata — não a medi na fonte.

---
# CONCLUSÕES (16:40Z)

## 1. Promessa × diff — CONFERE
- Árvore de ab52ec50 == árvore de e852304c (b792f827). Patch-id do squash sem os 8 arquivos de registro da junta 3 == patch-id de c1cfdabe..622bf845 sem os mesmos 8 (870d973a). O delta de produto mergeado é o do approved_head; o head do merge só somou registro (E1.1).
- Escopo: 35 arquivos fora de omega/; src/ só src/modules/inventory/**; cada arquivo fora do PERMITIDO base tem autorização nominal (Emendas 1(b)(c), 2(g), 4(t), 5(x)); ci.yml só linhas de SUITES; schema.prisma só comentário; Kpis/* intocado (E1.2).
- Ω6R-DAT-002: SELECT … FOR UPDATE no item antes de toda leitura que decide, com token tipado ItemWriteLock (E1.3). Ω6R-DAT-003: fechamento em unidades por item retomáveis (CAS aberta→fechando→concluida, releitura sob lock, abortClose), com backstop único parcial (E1.4).
- Migração 20260873000000: ADITIVA (2 CREATE UNIQUE INDEX parciais + bloco DO só de leitura que aborta); zero DML, zero DROP executável; fail-closed, nunca deduplica. Parada §C7.5 não acionada (E1.5).

## 2. Contagens reexecutadas — CONFERE
- Worktree próprio w-port389@ab52ec50 com npm ci próprio (Windows, CRLF): guard T-D 12/12; regressão do estoque em memória 67/67 (7 arquivos); fail 0, skip 0 (E2.1).
- Runner Linux próprio, cópia LF fiel ao blob, Postgres 16 + Redis 7 próprios sem porta publicada, 108 migrações + seed: T-A 16 + T-B 22 + T-C 8 + T-C′ 6 = 52/52, 0 skip (= relatório do dev). Paralelo: 52/52. Mais 5 rodadas paralelas: 5 × 52/52. T-D no LF: 12/12. Teardown das suítes sem resíduo (E2.2–E2.6).
- Check-runs: e852304c 14/14 success; 622bf845 14/14 success; ab52ec50 (main) 7 success + deploy skipped (gate de staging) (E2.4).

## 3. Rito e registro — CONFERE, com dívida de registro
- Ata do ciclo 2: REPROVADO 2 × 1 (os 4 bloqueia da C2 são de forma do guard). Ata do ciclo 3: APROVADO 3 × 0, com a linha approved_head 622bf845. Os 6 votos JSON batem com as atas. Inspetor c3: LIBERADO COM RESSALVA sobre de1dff89; o delta até 622bf845 é só registro (código vazio, ec 0). 00-quedas.md com 2 linhas P6 (E3.1).
- As 5 pendências novas: ABERTA, dono B-GOV-GUARDA-POR-PROPRIEDADE, todas no índice. Índice regenerado numa cópia == versionado (md5 EOL-neutro 3175d84a) (E3.2).
- Amostra: P-020 com conserto verdadeiro (código + A1), mas status ainda aberto (backfill devido); P-021 FECHADA, com B7 verde; P-O6R-B04 PARCIAL pelo apenso, status inalterado; a fechada -DIVERGENCIA-ESCOPO-TESTE-ISOLAMENTO tem a Emenda 4-(t) existente (E3.3).

## 4. Limpeza §C5 — CONFERE
- w-389 removido; fix/inventory-consistency ausente no local e no remoto; wip/bateria-estoque-preservacao preservado no remoto (dee45faf); nenhum container, rede ou volume de cadeira ou dev do bloco; 0 rastreado apagado; 16 GB livres (E4).
- Resíduo nomeado (sem efeito no mérito): C:/Users/AMP/w-pvpr@bb083ea5, o arnês de pré-voo dos mandatos do orquestrador (69 MB, 2 untracked). Não toquei.

## 5. O que bloqueia o próximo alvo
**(a) Junta do 07c-a (PR #414): nada deste merge a bloqueia.** O #414 tem 14/14 check-runs no head d4cd35e3, 0 arquivo em comum com o #389, merge-tree limpo contra ab52ec50 e 0 referência nova a estoque. Nenhuma pendência marcada "bloqueia" nomeia o 07c. O plano do 07c já mediu a interseção com o #389 e reordenou a trava do work-order.service.ts. Fica para o inspetor do 07c-a: a base do #414 é c1cfdabe (sem o #389), e integrar a main é decisão dele (a interseção medida é vazia). Há WIP local não commitado no w-07ca, fora do meu alcance.

**(b) A produção continua bloqueada, e não por este bloco.** Faltam B-O6R-07c (07c-a em junta + o resto do 07c), B-O6R-03a (a trava de prisma/ fica livre com este merge), a junta J-6R nova e o Ato 2 (o boot de produção recusa papel que escapa do RLS, depois do #405). Do lado deste bloco, antes de qualquer deploy:
- ATO DO DONO — P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD (ALTA, ABERTA): rodar scripts/inventory-duplicates-census.sql em staging e produção, COM PAPEL SUPERUSUÁRIO OU BYPASSRLS, antes do próximo deploy E antes de ligar STAGING_DEPLOY_ENABLED. O deploy de staging dispara sozinho em todo push na main, e a migração aborta fail-closed (duplicata, ou "censo CEGO" se STAGING_DATABASE_URL/PROD_DATABASE_URL não enxergar todas as linhas), deixando P3009 em todo deploy seguinte até prisma migrate resolve --rolled-back.
- P-DEPLOY-RUNBOOK-SEM-PRE-CONDICAO-DO-CENSO (MÉDIA, dono B-SAN3-10): o runbook ainda não diz isso. Com o B-SAN3-05, a URL do migrate deploy precisa continuar sendo um papel privilegiado, distinto do papel de runtime.
- Nota operacional: os 2 CREATE UNIQUE INDEX não são CONCURRENTLY e travam escrita em stock_movements durante o build do índice no deploy.

**(c) Não bloqueia nada:** as 5 pendências de forma do guard (D1/D2/D7/D5/detector do censo); P-O6R-B04-CONSUMIDORES-503, -UI-STATUS-FECHANDO e -OPEN-NO-TETO-DO-TIMEOUT (MÉDIA, blocos nomeados fora da trilha de destravar a produção); a imagem erp-junta-node20-pg16:local sem psql (IMG-C1-01, repetido aqui); o cabeçalho do 00-quedas.md diz "ciclo 2" e também tem linha do ciclo 3; o w-pvpr; o TEMPLATE-J-ata.md untracked (de 2026-09-07, alheio).

## Veredito
Entrega íntegra e números reproduzidos por execução própria. Nenhum achado grave. Viajam junto quatro dívidas de REGISTRO, nenhuma de produto:
1. **Registro pós-merge** (Passo 6 do plano de retomada, no PR de registro): P-020 → FECHADA; P-O6R-B04 → PARCIAL (QUA-002 com o B-O6R-04b); rastreabilidade §C6 do #389 (PR 389 · merge ab52ec50 · approved_head 622bf845 · junta J-B-O6R-04a-ciclo3) no log e no status-geral. DAT-002/003 em achados.jsonl só no marco de KPI.
2. **Os donos nomeados precisam existir:** B-BAT-01 (a metade transversal da bateria, no ramo wip/bateria-estoque-preservacao, mais o risco residual R3.4 das esperas fixas que seguem nas suítes -db) e B-GOV-GUARDA-POR-PROPRIEDADE (dono das 5 pendências novas) são nomes do orquestrador, sem comando nem pendência própria na main. O item 4 da D-GUARDA-POR-PROPRIEDADE-BLOCO-TRANSVERSAL ("bateria determinista") está cumprido POR MEDIÇÃO (7 + 5 rodadas verdes, CI verde em 4 heads), NÃO por construção.
3. **A decisão de modelo do dono de 2026-10-10** ("o topo fica só no plano e em toda reprovação de junta") entra em controle/decisoes.md com as palavras literais, declarando que substitui a D-FABLE-ASTRA-SO-DINHEIRO (08/10) para cadeiras e porteiro (§A2). Hoje ela só existe na ata e nos votos.
4. O w-pvpr sai por nome quando o pré-voo do 07c-a não precisar mais dele.

Terreno próprio desmontado: containers port389-runner/redis/pg e a rede port389-net removidos pelo nome (0 restantes); git worktree remove --force C:/Users/AMP/w-port389 com ec 0; a cópia scratchpad/gen389 apagada. Base viva, portas do dono e w-07ca não tocados. Fim: 16:42Z.

LIBERADO COM RESSALVA: junta de permissão do B-O6R-07c-a (PR #414) e continuidade da trilha de produção | no próximo PR de registro: P-020 → FECHADA e P-O6R-B04 → PARCIAL com a rastreabilidade do #389; B-BAT-01 e B-GOV-GUARDA-POR-PROPRIEDADE registrados como blocos/pendências com dono (incluindo o residual R3.4 das esperas fixas); a decisão de modelo do dono de 2026-10-10 em decisoes.md (substitui a D-FABLE-ASTRA-SO-DINHEIRO); e, antes de qualquer deploy ou de ligar STAGING_DEPLOY_ENABLED, o ato do dono P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD com papel superusuário/BYPASSRLS
