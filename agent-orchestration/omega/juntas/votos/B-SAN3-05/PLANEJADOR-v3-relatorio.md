# Relatorio — papel `planejador-mestre` · identidade `planejador-b-san3-05-v3` · modelo **Fable** (claude-fable-5-1, o do frontmatter; sem substituicao) · mandato_md5 `068dbc0ee9bc5f1b0d3a80fd41ab3e69`

> Evidencia incremental (P1): cada secao e gravada AO MEDIR, com hora UTC, em MEDIDO (comando + saida) e HIPOTESE (com o comando que
> derruba). Logs longos ficam no scratch (`$SCR = /tmp/claude-0/-home-user-ERP-Techsolutios/ebd477e6-43d1-57c2-a4f1-24921d727a74/scratchpad/planejador-v3/`),
> que e efemero e nao conta como entregue. Papel: PLANEJO (§C7.4-bis) — nao escrevo codigo de produto no repositorio; prototipos e
> mutacoes rodam no scratch ou num worktree descartavel meu.

## §0 — Terreno, identidade e corpo (2026-10-01T21:53Z)

### MEDIDO

Corpo do papel e mandato, md5 EOL-neutro, no head do ramo:
```
$ git show HEAD:.claude/agents/planejador-mestre.md | tr -d '\r' | md5sum
4c912f69a93f07b14d8fd1c49539c778  -        (= o esperado pelo invocador)
$ tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md | md5sum
068dbc0ee9bc5f1b0d3a80fd41ab3e69  -        (= o mandato_md5 do orquestrador e do invocador) · wc -l = 63
```

Maquina, Node, git, refs:
```
$ date -u                       → Thu Oct  1 21:53:40 UTC 2026
$ uname -a                      → Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
$ node -v                       → v22.22.0   (padrao da nuvem — NAO e o Node do CI; nao sera usado para numero)
$ PATH=/opt/node20/bin:$PATH node -v → v20.20.0   (o Node 20 que uso em toda medicao de teste)
$ git --version                 → git version 2.43.0
$ git rev-parse --abbrev-ref HEAD → docs/plano-b-san3-05
$ git rev-parse HEAD            → 9a808491bd7a3ffe20adbec5647879479f73f9e5
$ git rev-parse origin/main     → 5bcdcc58fda793dd6e5ffc12f2d0709bef3f222d
$ git merge-base origin/main HEAD → 5b6e103638f398d6074eecc5daebdf2d3bcd2252   (a origin/main andou 2 commits depois do mandato: 513937b #397 e 5bcdcc5 #398)
```

Arvores das areas do bloco — identicas entre a base do ramo (`5b6e1036`), a base do plano v2 (`3b1fe0f9`) e a `origin/main` (`5bcdcc58`), medido por `git rev-parse <ref>:<dir>`:
```
src:     21e1c4f2fc63fbb511af76bbfee2e7b83c286fce  (5b6e1036 = 3b1fe0f9 = origin/main)
tests:   2854a3ec2bd694f885732ff5f4ddcf752e4ac22e  (idem)
scripts: 6445f8bc34d0b3c9b233080498d3dca465359a0a  (idem)
prisma:  e906ac2e4b484f1a9e754538d5837e1f8a5d781f  (idem)
$ git log --oneline 3b1fe0f9..origin/main → 5bcdcc5 (#398 registro) · 513937b (#397 P7 governanca) · 5b6e103 (#396 registro)
```
Consequencia: toda medicao de codigo feita aqui no checkout do ramo (HEAD `9a808491`, cujo `src/tests/scripts/prisma` = os da base `5b6e1036`,
pois o ramo so toca `docs/` e `agent-orchestration/`) vale como medicao na `origin/main` para essas quatro arvores. Confirmo que o ramo nao
toca essas arvores: `git diff --name-only origin/main HEAD -- src tests scripts prisma | wc -l` → (medido abaixo na §1).

Ferramentas: Postgres 16 em `/usr/lib/postgresql/16/bin` (initdb, pg_ctl, …), `psql` em `/usr/bin/psql`, `redis-server` em `/usr/bin`,
`node_modules` AUSENTE no checkout (`ls -d node_modules` → No such file). Sem Docker.

### HIPOTESE

- H0-a: o checkout tem `src/tests/scripts/prisma` identicos a `origin/main` — derruba com `git diff --stat origin/main HEAD -- src tests scripts prisma | tail -1` (qualquer linha = derrubada).
- H0-b: o Node 20 do CI e 20.x (`ci.yml`) e o v20.20.0 daqui conta como numero de CI — derruba com `grep -n 'node-version' .github/workflows/ci.yml` mostrando outra major.

Veredito parcial §0: identidade, corpo, mandato e refs conferem; terreno conforme o mandato. Nenhuma divergencia a gravar.

Medido depois de escrever as hipoteses (2026-10-01T21:55Z):
```
$ git diff --name-only origin/main HEAD -- src tests scripts prisma | wc -l → 0        (H0-a se sustenta)
$ grep -n 'node-version' .github/workflows/ci.yml → l.76,172,291,317,340: `node-version: 20`  (H0-b se sustenta)
```

## §1 — Cluster descartavel, dependencias, insumos e o que o head diz sobre os tres bloqueantes (2026-10-01T22:05Z)

### MEDIDO

Cluster Postgres 16 descartavel MEU (nunca o 54353 da v2 nem o 54354 da critica), como usuario `postgres` em diretorio proprio:
```
$ ss -ltn → "ss: command not found" (sem iproute2 nesta imagem); a prova da porta e a CONEXAO abaixo
$ rm -rf /var/lib/postgresql/san3_05_plan_v3; mkdir -p …; chown postgres:postgres …
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/san3_05_plan_v3/data -U postgres --auth=trust --no-instructions → initdb ec=0
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D …/data -o "-p 54371 -k /var/lib/postgresql/san3_05_plan_v3 -c listen_addresses=127.0.0.1" -l …/server.log -w start → server started
$ psql -h 127.0.0.1 -p 54371 -U postgres -d postgres -Atc "SELECT version(); SHOW log_min_error_statement; SHOW log_statement; SHOW log_min_messages;"
PostgreSQL 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1) … 64-bit
error / none / warning          (defaults do PG16 — os mesmos sob os quais a critica mediu o vazamento da senha, F2-02)
$ psql … -c "CREATE DATABASE erp_v3"; DATABASE_URL=postgresql://postgres@127.0.0.1:54371/erp_v3?schema=public npx prisma migrate deploy → All migrations have been successfully applied.
$ psql … -d erp_v3 -Atc "<tabelas public>; <FORCE>; <views>" → 115 / 106 / 0
```
Dependencias (Node 20): `npm ci --no-audit --no-fund` → ec=0 (222 entradas em `node_modules`); `npx prisma generate` → ec=0 (log em `$SCR/npm-ci.log`).

Insumos do head que decidem o DESENHO das respostas aos tres `bloqueia`:
```
$ sed -n 62,69p tests/db-catalog-write-guard.test.ts → padroes: CREATE ROLE · DROP ROLE · ALTER ROLE · GRANT · REVOKE · OWNER TO (maiusculas, case-sensitive)
$ sed -n 71,139p …                                     → FROZEN_ALLOWLIST = Map<arquivo, {count, reason}> (8 entradas); arquivo fora da lista com padrao → violacao; contagem ≠ congelada → violacao
$ sed -n 143,158p …                                     → walkTestFiles: recursivo, todo `*.ts` sob tests/ (fixtures incluidas)
$ grep -n -i 'SKIP_BUDGET\|skip' scripts/run-backend-tests.mjs | sed -n 1,12p → l.82 `const SKIP_BUDGET_DB = 2;` · l.90-94 evaluateDbSkipBudget: exceeded = DATABASE_URL presente ∧ skipped > 2 (teto DURO, monotonico)
$ grep -n -i psql .github/workflows/ci.yml → (vazio): nenhum job do CI chama psql; a presenca no runner nao e medida pelo repositorio
$ grep -n 'runs-on' .github/workflows/ci.yml | sort -u → `ubuntu-latest` (unico)
$ curl -sS -L -o $SCR/runner-ubuntu2404.md https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md → ec=0 (16328 bytes)
$ grep -n -i -E 'postgres|psql' $SCR/runner-ubuntu2404.md → l.172-177: "#### PostgreSQL / PostgreSQL 16.15 / User: postgres / service is disabled by default"
$ git show HEAD:.claude/agents/critico-adversarial.md | grep -n -i 'rodada' → l.3 "(máx 2 rodadas)"; l.6 "Máx 2 rodadas de ataque/defesa; o que sobreviver vira requisito explícito no plano"
$ grep -n -i 'crítico\|rodada' docs/revisoes/SAN3/PLANO_SAN3.md | sed -n 1,3p → l.9-10: "Revisão adversarial: critico-adversarial, 2 rodadas … Junta do PR"
$ cat src/server.ts → main(): createCoreSaasService() → createApp → startJobWorkerIfEnabled → listen; `main().catch` so poe exitCode=1 (l.45-48) — confere com N2-02
$ cat src/modules/cloud-usage/cloud-usage.routes.ts → GET /summary (parseFilters: periodStart, periodEnd, metricKey), GET /tenants/:id/summary, GET /tenants/:id/daily — a janela e parametro de query (base do F2-03)
$ sed -n 40,180p src/modules/platform/platform.routes.ts | grep -n 'router\.use' → /cloud-charges (raiz), /cloud-cost-allocations, /cloud-costs, /cloud-usage montados sob /api/v1/platform (app.ts:126)
$ sed -n 324,352p tests/helpers/auth-identity-fixture.ts → createEphemeralRole: `CREATE ROLE … LOGIN … NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT` + 3 GRANTs, sob withRoleCatalogLock; nenhuma funcao do arnes cria SUPERUSER, GRANT de pertenca, OWNER TO nem banco
```

### HIPOTESE

- H1-a: `ubuntu-latest` resolve hoje para a imagem 24.04 (a que o README mede) — derruba com, num job: `lsb_release -rs` ≠ 24.04. (Consequencia: `psql` 16 presente no runner e MEDIDO na fonte da imagem, nao mais hipotese pura; se a resolucao mudar, o T14b do plano v3 fica VERMELHO nomeando `psql`, nunca pulado — §F2-06.)
- H1-b: o `psql` do runner esta no PATH do job (o README lista o pacote; nao lista o PATH) — derruba com `which psql` no job (o T14b imprime isso no TAP).

Veredito parcial §1: terreno pronto; os tres bloqueantes tem os fatos de head que o desenho precisa: (F2-01) a allowlist e por arquivo+contagem+motivo — o caminho honesto e REGISTRAR, logo `tests/db-catalog-write-guard.test.ts` entra no PERMITIDO nominalmente; (F2-06) o teto de pulos e duro — o T14b nao pode pular; (F2-02) defaults de log do PG16 confirmados para reproduzir e depois provar o conserto.

## §2 — Reproducao da critica r2 (F2) no head, por re-execucao propria — nunca herdada (2026-10-01T22:14Z)

### MEDIDO

Apendices do plano v2 extraidos por `awk` e conferidos contra o md5 declarado:
```
$ awk '/^```js$/{f=1;next} f&&/^```$/{exit} f' docs/revisoes/SAN3/B-SAN3-05-plano.md | md5sum → 293b3746ad7e4dea1c11e16c794e7aa3  (= declarado, Apendice A)
$ awk '/^```bash$/…' → 189ddf8a093934cf1c1baa61ba80f5c8 · 82 linhas (= declarado, Apendice C)
$ (Apendice D: 17 blocos ```ts extraidos para $SCR/fix/) → 17 arquivos (Ma_alias.ts … Mq_updateManyAndReturn.ts)
```
As 9 formas N01–N09 foram ESCRITAS POR MIM a partir das descricoes da critica (§2.1 dela), em `$SCR/novas/` — os scripts dela viviam em outra sessao e nao existem aqui.
Arnes `$SCR/mut-v2.sh`: copia de `src`+`prisma` SEM `node_modules`, mutacao em `src/modules/zz-mut/mut.ts`, gerador v2 com cwd = repo, `comm` contra o inventario do head.
```
$ node $SCR/apx/gerador-v2.mjs . | sed -n 6p → # INVENTÁRIO SUSPEITO (L1+L2): 48 chaves · sha1=147d41c209a5f3bbce9fc7d208fd33a02e6bd8d2 · L2b = 65   (= v2 e = critica)
$ mut-v2.sh gerador-v2.mjs -            → novas=0 sumidas=0 VERDE   (controle)
$ for f in fix/*.ts  → 17 × VERMELHO      (as 17 da r1 reproduzem)
$ for f in novas/*.ts →
N01_destructure_renomeado.ts novas=0 sumidas=0 VERDE · N02_alias_do_delegate.ts VERDE · N03_new_via_namespace.ts VERDE · N04_import_renomeado.ts VERDE ·
N05_setter_condicional.ts VERDE · N06_setter_no_cliente_errado.ts VERDE · N07_delegate_como_argumento.ts VERDE · N08_subclasse_via_namespace.ts VERDE · N09_setter_em_comentario.ts VERDE
```
**9/9 VERDES — o F2 da critica reproduz integralmente no head `origin/main` (arvores `src/prisma` = `5b6e1036` = `3b1fe0f9`, §0).**

Mecanismo, lido no Apendice A (nao herdado — as linhas sao do arquivo extraido): L1 so reconhece acessor por NOME (`accessorToTable.has(target.name.text)` / identificador literal, l.1218-1223 do plano); L2 so reconhece `new <Identificador>` com o texto do nome da classe (`ts.isIdentifier(node.expression) && injectedClasses.has(node.expression.text)`, l.1252) e `extends` pelo TEXTO (`t.expression.getText(sf)`, l.1209); `$transaction` e absolvido por REGEX de texto (`CONTEXT_SETTERS.test(before)`, l.1165) — qualquer ocorrencia textual do setter antes do sitio, inclusive em `if`, com o client errado ou em comentario.

### HIPOTESE (a derrubar pelo gerador v3, §3)
- H2-a: um analisador que resolva o delegate pelo TIPO (type checker), a classe pelo SIMBOLO (aliases, namespaces, heranca via `getSymbolAtLocation`/`getAliasedSymbol`) e o setter por AST + identidade de simbolo (primeira instrucao do callback, mesmo parametro) deixa as 26 formas (17 + 9) VERMELHAS sem alterar o veredito de nenhum sitio do head alem de reclassificar o que hoje e absolvido por texto — derruba com: qualquer fixture `novas=0` no arnes v3 (§3).

Veredito parcial §2: F2 confirmado por execucao; a resposta nao pode ser "mais regex" — tem de trocar o mecanismo (nome/texto → tipo/simbolo). Continua em §3.
