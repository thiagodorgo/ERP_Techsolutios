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

## §2-bis — Reproducao do F2-02 (senha vaza) com o script v2, no meu cluster (2026-10-01T22:20Z)

### MEDIDO
Banco `v3_i3`; executor `v3_nocr` (`LOGIN NOCREATEROLE NOSUPERUSER NOBYPASSRLS`) = o modo 1 do §11 da v2. A senha nova e aleatoria e vive SO em `$SCR/.pw_m1` (nunca neste relatorio).
```
$ env -i PATH=/usr/bin:/bin HOME=/root PGHOST=127.0.0.1 PGPORT=54371 PGUSER=v3_nocr PGDATABASE=v3_i3 DB_RUNTIME_ROLE=erp_rt_m1 DB_RUNTIME_PASSWORD=<senha> bash $SCR/apx/db-runtime-role-v2.sh → ec=3
$ grep -c -F "<senha>" $SCR/v2-m1.out                              → 1    (terminal do dono)
$ grep -c -F "<senha>" /var/lib/postgresql/san3_05_plan_v3/server.log → 1  (log do servidor, defaults do PG16)
  ERROR:  permission denied to create role
  CONTEXT:  SQL statement "CREATE ROLE erp_rt_m1 LOGIN NOINHERIT PASSWORD '<SENHA>'"
$ (shim $SCR/shim/psql que so grava "$@") … bash db-runtime-role-v2.sh → ec=0 ; grep -c -F "<senha>" $SCR/shim/argv.txt → 1 (l.8: `password=<SENHA>`)
$ psql … "SELECT count(*) FROM pg_roles WHERE rolname='erp_rt_m1'" → 0  (nada persistiu — o DO fez rollback, como a v2 dizia)
```
**F2-02 reproduz nas tres vias** (CONTEXT no terminal, server.log, argv). A fonte do CONTEXT e o PL/pgSQL, que poe o SQL DINAMICO executado — com o valor interpolado por `%L` — no contexto de todo erro nao capturado; a fonte do argv e o `-v password="$DB_RUNTIME_PASSWORD"` da l.1709 do plano.

Leitura paralela que muda o gerador v3: `src/modules/auth/services/local-auth-login.service.ts:106` → `private readonly runWithTenantContext: TenantContextRunner = async (_tenantId, work) => work()` — o "envoltorio" `runWithTenantContext` que a v2 absolvia PELO NOME (`CONTEXT_WRAPPERS`) e um runner INJETADO cujo default NAO seta GUC; so em `auth-runtime.ts:82` ele vira `withTenantRls`. Default-negar exige confiar apenas no SIMBOLO declarado em `src/database/rls.ts` (e no `forEachTenantInOneTx` privado de `cloud-cost-allocation-prisma.repository.ts:340`, cujo corpo seta o GUC — a junta le os dois).

### HIPOTESE
- H2b-a: embrulhar cada `EXECUTE` que carrega a senha num bloco `BEGIN … EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION '<msg sem senha>: %', SQLERRM; END` descarta o CONTEXT interno (a re-emissao tem contexto proprio, "at RAISE"), e `\set password` por backtick (`printf` builtin do sh) tira a senha do argv — derruba com os mesmos tres `grep -c` ≠ 0 no §4.

## §2-ter — Queda e retomada (P6/P3) (2026-10-01T23:26Z)

| agente | modelo (pin/herdado) | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|
| `planejador-b-san3-05-v3` | Fable (pin do frontmatter) | 1 (plano v3 + relatorio) | ~22:5x UTC, com as medicoes dos §3–§5 executadas e gravadas SO no scratch (relatorio ate §2-bis empurrado em `de70f2d`) | 429 — limite de sessao do Fable; renovou 23:20 UTC | ZERO redo de medicao: o scratch sobreviveu (`ls $SCR` → gerador-v3.mjs md5 `81d9259571391eded68255391a99fb61`, `v3/db-runtime-role.sh` `810c1c4a2552665d4947bf0ef4e93670`, `v3/guard-v3.sql` `36650de53be8504c76deef74ecc78811`, saidas `gen-v3-*.txt`, `v3/cenarios*.out`, `boot-head.out`, `apxB.out`); o que se perdeu foi o PROCESSO do cluster (`pgrep -c -x postgres` → 0; `postmaster.pid` obsoleto em disco) |

Retomada (mesma identidade, mesmo mandato): `git rev-parse HEAD` = `de70f2d` = `origin/docs/plano-b-san3-05`; `git status --short | wc -l` → 0; worktree `/home/user/wt-plan-v3` em `de70f2d`, `node_modules` com 222 entradas, `.prisma/client/index.d.ts` e `.bin/tsx` presentes. O cluster e religado em §6 (prova nova da porta) e um subconjunto dos cenarios e re-executado la; as secoes §3–§5 abaixo relatam as medicoes feitas ANTES da queda, com os artefatos nomeados — nada e herdado de outra identidade.

## §3 — F2 (bloqueia): gerador v3 SEMANTICO — 26/26 formas vermelhas, "sumida" vermelha, inventario do head (2026-10-01T22:35Z–22:58Z)

### MEDIDO

Gerador v3 = `$SCR/gerador-v3.mjs` (353 linhas, md5 `81d9259571391eded68255391a99fb61`; vai verbatim para o Apendice A do plano v3). Mecanismo, em uma linha cada: delegate pelo TIPO (`checker.getResolvedSignature(call).declaration` dentro de uma interface `*Delegate` do client gerado, com 2a tentativa pelo tipo da expressao — cobre o tipo estrutural `PrismaChecklistClient` de `checklist-prisma.repository.ts:72`); classe pelo SIMBOLO/TIPO (`checker.getTypeAtLocation(new.expression).symbol` → `ClassDeclaration`; heranca pelo simbolo da base; `await import()` desestruturado resolvido pelo export do modulo); `$transaction` so absolvido se a PRIMEIRA instrucao do callback e `await setTenantRlsContext(<o mesmo tx>, …)` (AST + identidade de simbolo); envoltorio confiado so pelo SIMBOLO declarado em `src/database/rls.ts` ou o `forEachTenantInOneTx` de `cloud-cost-allocation-prisma.repository.ts:340`; receptor classificado pela DECLARACAO do simbolo raiz; `any`/`unknown` com metodo de delegate → `TIPO-DESCONHECIDO` (suspeito); fixtures como ARQUIVOS VIRTUAIS (`--mutant`, `--override`) num CompilerHost proprio — sem copia de `src`, sem symlink de `node_modules`; L2 em lista de trabalho (classe que so REPASSA o campo injetado tambem e injetada; 2 rodadas no head); transitividade em L2 (`new K(this.<campo de J>)` so e contexto se TODA instanciacao de J em `src` o for).

```
$ cd /home/user/ERP_Techsolutios && PATH=/opt/node20/bin:$PATH node $SCR/gerador-v3.mjs .     (21 s; stderr vazio apos o conserto do bloco solto de OPS)
# L0: tabelas ENABLE=106 FORCE=106 · acessores Prisma em FORCE=106 · OPS(derivados)=17 · arquivos no programa=777 (virtuais=0) · erros sintaticos=0
# L1: call-sites sobre tabelas FORCE (+ RAW) = 720 · por como: {"opaco":10,"literal":104,"semantico":578,"sintatico":28}
# L1 por classificação: {"PARAMETRO":22,"INJETADO":646,"$TRANSACTION-SEM-SETTER-PROVADO":6,"SOB-CONTEXTO":45,"CRU":1}
# L2: classes com executor injetado = 72; instanciações achadas = 452; rodadas L2 = 2
# L2 por classificação do argumento: {"SOB-CONTEXTO":416,"INJETADO-TRANSITIVO:SUSPEITO-ACIMA":2,"CRU":7,"PARAMETRO":20,"$TRANSACTION-SEM-SETTER-PROVADO":7}
# INVENTÁRIO SUSPEITO (L1+L2): 53 chaves · sha1=5c566532986c533416e880e70350fb5ea692f9e2
```
(720 call-sites = o mesmo total da v2, agora 578 resolvidos pelo tipo; 452 instanciacoes ≈ 451 da v2 + `new RlsPrismaCloudUsageRepository(prisma)` de `cloud-usage-prisma.repository.ts:204`, que a v2 nao via porque a classe so repassa o client.) OPS derivado do programa: 114 interfaces `*Delegate` em `node_modules/.prisma/client/index.d.ts` → 17 metodos (medido em separado: `ifaces 114 OPS 17`).

Inventario do head = `$SCR/gen-v3-head-inv.txt` (53 chaves, sem numero de linha). Diferencas de classificacao em relacao a v2, por leitura do `--all` (`$SCR/gen-v3-head-all.txt`):
- `$TRANSACTION-SEM-SETTER-PROVADO` = 6 sitios L1 (v2: 2): `identity-link.service.ts:323,362` (`unlink`), `:412` (`handlePasswordChange`), `prisma-core-saas.service.ts:368` (`listTenantsForIdentity`), `work-order-prisma.repository.ts:525,541` (`assign`) — a v2 absolvia os quatro primeiros por REGEX de texto (`CONTEXT_SETTERS.test(before)`); a v3 exige setter-primeiro no mesmo `tx`. Ficam CONGELADOS com nota de leitura (a junta C3 le os 6).
- `PARAMETRO` = 22 L1 + 20 L2 (v2: `TX-SEM-ENVOLTORIO?` 12+14 e `INJETADO-SEM-CLASSE` 8): inclui `auth-session.service.ts` e `session-admin.service.ts` (`tx de callback de runWithTenantContext`) — o runner injetado cujo default e `work()` (§2-bis). Congelados.
- `CRU` L1 = 1 (`health.routes.ts:115`, `$queryRawUnsafe` opaco via `const { prisma } = await import(…)`); `CRU` L2 = 7 (as 4 fabricas sem argumento de `prisma-core-saas.store.ts`, as fabricas cruas de `cloud-charges` e `cloud-cost-allocation`, e `new RlsPrismaCloudUsageRepository(prisma)`); `INJETADO-TRANSITIVO:SUSPEITO-ACIMA` = 2 (`new PrismaCloudUsageRepository(this.prismaClient)` ×2 — os sitios 1 e 2 do remedio).
- `TIPO-DESCONHECIDO` = 0 no head.

Fixtures — 17 da r1 (Apendice D, extraidas) + 9 da r2 (escritas por mim) num SO programa (`--mutant` ×26; 24,6 s):
```
$ node $SCR/gerador-v3.mjs . --mutant fix/Ma_alias.ts … --mutant novas/N09_setter_em_comentario.ts | …  → 78 chaves
$ chaves fora de src/modules/zz-mut/ == inventario do head (sem linhas em branco)? → SIM   (as fixtures nao alteram o veredito de nenhum sitio do head)
$ por fixture (chaves atribuidas ao proprio arquivo): 26 × VERMELHO (+1 cada; detalhe em $SCR/v3-fixtures-result.txt)
N01 ev → CRU (via desestruturacao) · N02 ev → CRU (via alias) · N03 new PrismaCloudUsageRepository(prisma) CRU (namespace) · N04 idem (import renomeado) ·
N05/N06/N09 tx.cloudUsageEvent.findMany → $TRANSACTION-SEM-SETTER-PROVADO · N07 d.findMany → PARAMETRO(d) · N08 new Sub extends PrismaCloudChargeRepository(prisma) → CRU
```
"Sumida" (fabrica do sitio 7 alterada por fora, `--override …cloud-cost-allocation-prisma.repository.ts=<copia com 'prisma as never'>`): `novas=1 sumidas=1` → VERMELHO (a chave `new PrismaCloudCostAllocationRepository(prisma) CRU` some e nasce `(prismaasnever)`).

### HIPOTESE
- H3-a: o T13 do plano v3 (gerador em processo filho, 2 programas: head+26 virtuais e head+override) roda em < 60 s no runner — derruba com `time node --test … tests/san3-05-acessos-de-plataforma-guard.test.ts` > 60 s (aqui: 21 s + 25 s).
- H3-b: nenhum sitio do head muda de classe entre `origin/main` (`5bcdcc58`) e o head da entrega fora dos arquivos do PERMITIDO — derruba com `comm` do inventario do head da entrega contra o congelado mostrando chave nova fora de `cloud-usage`/`cloud-charges`/`src/database`.

Veredito parcial §3: F2 RESPONDIDO por troca de mecanismo (nome/texto → tipo/simbolo), com 26/26 + sumida vermelhas e o inventario do head reproduzivel (53 chaves, sha1 `5c566532…`). O residual que resta e SEMANTICO (envoltorio confiado que nao sete GUC; `tenantId` errado) — nao e forma; so a medicao dinamica o ve (§4 do plano: T10–T12 na superficie fechada de plataforma; B-ARNES-2 no resto).

## §4 — F2-02 / F2-04 / F2-05 / F8 (script v3 do papel) e F2-07 / F13 (trava v3) — executados no cluster 54371 antes da queda (2026-10-01T22:40Z–23:05Z)

### MEDIDO
Script v3 = `$SCR/v3/db-runtime-role.sh` (115 linhas, md5 `810c1c4a2552665d4947bf0ef4e93670`; Apendice C do plano v3). Trava v3 = `$SCR/v3/guard-v3.sql` (md5 `36650de53be8504c76deef74ecc78811`; 8 ocorrencias de `session_user`; §2.2 do plano v3). Roteiros: `$SCR/v3/cenarios.sh` e `cenarios2.sh`; saidas integrais em `$SCR/v3/cenarios.out` e `cenarios2.out`. Senhas: aleatorias por cenario (`pw-v3-<cen>-<rand>`), nunca neste relatorio; `grep -c -F "<senha>"` e feito contra o terminal capturado e contra `/var/lib/postgresql/san3_05_plan_v3/server.log`.
```
(i')   postgres, banco v3_i5 (TEMPLATE erp_v3, 115 tabelas), papel novo erp_rt5 → ec=0 | erp_rt5|f|f|f|f|0|0|115 ; trava v3 sob erp_rt5 → 0 linhas ; DML 115/115
(i)/(ii) v3_i3: ec=0 ; 2a execucao com OUTRA senha → ec=0, snapshots (pg_roles, pg_default_acl, pg_auth_members, relacl) IDENTICOS ; pg_authid.rolpassword = 'SCRAM-SHA-256$…' e o verificador MUDOU (a senha fluiu pelo \set com backtick)
(iii)  pre-existente SUPERUSER BYPASSRLS CREATEDB REPLICATION + membro de v3_bypass + dono de t_own FORCE → ec=3 "ainda escapa de RLS por 1 via(s): posse:erp_runtime … (MODO 3)" ; depois: true|true|true|true, membros=1 (NADA persistiu)
(iii-b) OWNER TO postgres; de novo → ec=0 | f|f|f|f|0|0|2 ; pg_roles false|false|false|false, membros=0 (SUPERUSER/BYPASSRLS/REPLICATION/CREATEDB corrigidos; pertenca revogada)
(iii-c) F2-04 cadeia v3_bypass → v3_mid → erp_runtime: trava ANTES → atributo|v3_bypass|f|t|f ; script → ec=0 ; membros diretos de erp_runtime DEPOIS = (nenhum) — o 1o salto (v3_mid) foi revogado; v3_mid segue membro de v3_bypass (1)
(iii-d) F2-05 GRANT pg_execute_server_program TO erp_runtime: trava ANTES → atributo|pg_execute_server_program ; script → ec=0 e trava DEPOIS → 0 linhas
(iii-e) F2-05 view de dono que escapa: CREATE VIEW v_rel (dono postgres) sobre t_force_v3 + GRANT SELECT TO erp_runtime → porta REAL: como erp_runtime sem GUC, t_force_v3 → 0 linhas, v_rel → 3 ; trava → view|postgres|t|t|f|1 ; script → ec=3 "1 via(s): view:v_rel … (MODO 6)" ; REVOKE SELECT ON v_rel → ec=0 ; trava → 0
(vii)  F2-02 MODO 1 (executor v3_nocr sem CREATEROLE): ec=3 "MODO 1 — nao foi possivel criar o papel erp_rt_m1 (42501 permission denied to create role): o executor v3_nocr precisa de CREATEROLE — decisao de provedor" ; senha no terminal 0 · no server.log 0 · unico CONTEXT: "PL/pgSQL function inline_code_block line 9 at RAISE"
(viii) F2-02 argv (shim psql que grava "$@"): ec=0 ; senha no argv 0 ; `-v password=` no argv 0
(ix)   MODO 0: ALTER SYSTEM SET log_statement='all' → script ec=3 "MODO 0 — o servidor registra o texto de todo statement (log_statement=all, log_min_duration_statement=-1): a senha nova iria ao log…" ; senha no server.log 0 ; com DB_RUNTIME_ALLOW_LOG_ALL=1 → ec=0 e senha no server.log 1 (a exposicao que o dono ACEITA explicitamente) ; RESET → none
(iv)   migrador NAO-super v3_mig (LOGIN CREATEROLE NOSUPERUSER NOBYPASSRLS, dono de v3_i4 e das 115 tabelas) cria erp_rt2 → ec=0 | erp_rt2|f|f|f|f|0|0|115 ; pg_has_role('v3_mig','erp_rt2','MEMBER WITH ADMIN OPTION') = t (ADMIN OPTION implicita do criador, PG16)
(iv-b) MODO 2: erp_rt2 com BYPASSRLS (pelo super) → ec=3 "papel erp_rt2 tem BYPASSRLS e v3_mig nao pode remover (precisa de BYPASSRLS)" ; com REPLICATION → ec=3 "…tem REPLICATION… (precisa de SUPERUSER)"
(iv-c) MODO 3 tabela alheia → ec=3 "tabela/sequencia public.t_alheia pertence a v3_outro e v3_mig nao pode conceder DML nela: ALTER ... OWNER TO v3_mig e rode de novo"
(iv-d) F8/MODO 4: erp_rt3 LIMPO criado por postgres; v3_mig roda → ec=3 "MODO 4 — o papel erp_rt3 ja existe e v3_mig nao tem ADMIN OPTION sobre ele (foi criado por outro executor): use outro nome (DB_RUNTIME_ROLE) ou, com a credencial que o criou, GRANT erp_rt3 TO v3_mig WITH ADMIN OPTION…" ; senha no terminal 0 · server.log 0 (a v2 dava `permission denied to alter role` CRU com a senha no CONTEXT) ; apos o GRANT WITH ADMIN OPTION → ec=0 | erp_rt3|f|f|f|f|0|0|115
(iv-e) MODO 5: GRANT v3_bypass4 TO erp_rt2 pelo super; v3_mig roda → ec=3 "MODO 5 — a pertenca de erp_rt2 a v3_bypass4 (que leva a papel que escapa de RLS) nao pode ser revogada por v3_mig (42501 permission denied to revoke role…)" ; REVOKE pelo super → ec=0
(v)    CREATE TABLE t_depois por v3_mig DEPOIS → has_table_privilege(erp_rt2, DML)=t, has_sequence_privilege(USAGE)=t
(vi)   trava v3 sob erp_rt2 em v3_i4 → 0 linhas
(x)    entrypoint falso (set -Eeo pipefail; executa se -x, senao source), SEM senha: script direto ec=1 ; via entrypoint (exec) ec=1 ; via entrypoint (source, modo 644) ec=1 — a falha PROPAGA e o entrypoint morre (fail-closed), nos dois modos. [A 1a medicao mostrou "ec=0": artefato do meu arnes — `$(basename $f)` zerou `$?` antes do `ec=$?`; refeito sem substituicao de comando antes do `$?`.]
```
Trava v3 sob papeis (banco v3_i3; `t_force_v3` FORCE com 3 linhas; `v_rel` view do super sobre ela):
```
postgres → 12 linhas (atributo|postgres t|t|t, os 3 papeis de servidor, posse de tudo, view) · v3_super2 → 12 · v3_clean (sem SELECT na view) → 0 PASSA ·
v3_member_direct/noinherit/chain/noset → atributo|v3_bypass (noset = falso positivo seguro, N1) · v3_app_ownermember → posse|v3_own|…|1 · v3_app_owner → posse|v3_app_owner|f|f|t|1 ·
v3_read_all → view|postgres (pg_read_all_data NAO escapa pela tabela: count(*) t_force_v3 → 0; mas LE a view do super) · v3_repl → atributo|v3_repl|f|f|t + view · v3_prog → atributo|pg_execute_server_program + view · v3_viewer → view|postgres|t|t|f|1
PORTAS REAIS (sem GUC): v3_prog `COPY d FROM PROGRAM 'psql … select tenant_id from t_force_v3'` → a,b,segredo-tenant-b-v3 · v3_viewer `SELECT count(*) FROM v_rel` → 3 · v3_app_ownermember: count(*) t_own2 → 0; `SET LOCAL ROLE v3_own; ALTER TABLE t_own2 NO FORCE ROW LEVEL SECURITY; SELECT count(*)` → 2 · v3_repl `pg_basebackup -U v3_repl -D … -Ft` → ec=0, base.tar 82M, `grep -a -c 'segredo-tenant-b-v3'` → 1 (apagado em seguida)
```
F13 + F2-07 — login X com `PGOPTIONS='-c role=v3_clean'`; semi-mutantes gerados por `sed` da trava v3 (mutA: so `current_user` na metade atributo; mutP: idem posse; mutV: idem view; `session_user` 8 → 7 em cada):
```
login postgres (o cenario unico do T8c da v2)   | orig: 12 | mutA: 4  | mutP: 9 | mutV: 11   ← os tres semi-mutantes SOBREVIVEM (superusuario e membro de tudo): confirma a critica
login v3_mbyp (membro de BYPASSRLS, dono de nada) | orig: 1 (atributo|v3_bypass) | mutA: 0 PASSA ← mata mutA | mutP: 1 | mutV: 1 ; porta: `SET ROLE v3_bypass; SELECT count(*) FROM t_force_v3` → 3
login v3_mown (membro do DONO v3_own)            | orig: 1 (posse|v3_own)        | mutA: 1 | mutP: 0 PASSA ← mata mutP | mutV: 1
login v3_viewer (SELECT na view do super)         | orig: 1 (view|postgres)       | mutA: 1 | mutP: 1 | mutV: 0 PASSA ← mata mutV ; porta: `SET ROLE NONE; SELECT count(*) FROM v_rel` → 3
```
Apendice B da v2 (md5 extraido `6204643a81fb5d2305f09ff38b89f9de` = declarado), re-executado por mim no worktree contra `erp_v3`: `# 22 itens, 0 fora do esperado` (ec=0); limpeza `0 0 0 0` (papeis san3_05%, tenants san3-05-%, cloud_usage_events, tenant_cloud_charges).

### HIPOTESE
- H4-a: no PG16 gerenciado do Fly/RDS, `pg_has_role(current_user, <papel>, 'MEMBER WITH ADMIN OPTION')` e verdadeiro para o papel que o migrador CRIOU (como aqui) — derruba com o proprio script dando MODO 4 na 2a execucao pelo mesmo executor.
- H4-b: `/proc/<pid>/environ` do psql e a unica exposicao residual da senha fora de `log_statement=all` — derruba com `grep -c <senha>` em qualquer outro artefato (argv, stdout, server.log) ≠ 0 nos cenarios acima.

Veredito parcial §4: F2-02 RESPONDIDO (0/0/0 nas tres vias; MODO 0 fail-closed); F2-04 RESPONDIDO (1o salto revogado; MODO 5 nomeado); F2-05 RESPONDIDO (REPLICATION, 3 papeis de servidor e view de dono que escapa recusados pela trava e tratados pelo script — portas provadas reais); F8 RESPONDIDO (MODO 4 nomeado, sem vazamento); F2-07 RESPONDIDO (T8c ganha os cenarios v3_mbyp/v3_mown/v3_viewer, cada um matando o seu semi-mutante).

## §5 — F2-01, F2-03, F2-06, N2-01, N2-02, N2-03 (2026-10-01T22:50Z–23:10Z)

### MEDIDO
```
F2-01  worktree: sonda tests/san3-05-runtime-role-guard-db.test.ts com 1 CREATE ROLE + 1 GRANT (em comentario) → db-catalog-write-guard: "2 ocorrência(s) … FORA da allowlist — escritor novo" fail 1 ;
       entrada na FROZEN_ALLOWLIST {count: 2, reason} → pass 1 ; contagem errada (3) → "contagem 2 difere da congelada 3 — mudar exige atualização CONSCIENTE" fail 1 ; revertido (cp do original; rm da sonda; git status 0)
F2-03  src/modules/cloud-usage/cloud-usage.capture.ts:176 `occurred_at,` (default = agora, por leitura das l.170-190) ; `grep -rln '2001-0' tests src prisma` → 0 arquivos (ninguem grava na janela 2001) ; suites que chamam captura: 4 ; rotas aceitam periodStart/periodEnd (cloud-usage.routes.ts parseFilters)
F2-06  scripts/run-backend-tests.mjs:82 `SKIP_BUDGET_DB = 2`; :90-94 `exceeded = dbPresent && skipped > budget` (teto duro) ; .github/workflows/ci.yml: 0 ocorrencias de psql; runs-on ubuntu-latest ; README da imagem 24.04 (baixado, 16328 B): "PostgreSQL 16.15 … service is disabled by default" (binario presente; servico desligado)
N2-01  src/config/env.ts:638 = `parsedEnv.EVIDENCE_SCANNER ?? (parsedEnv.NODE_ENV === "production" ? "unavailable" : "noop")` ; ancora da v2 (`production ? "unavailable"`) casa 0 ; ancora correta (`"production" ? "unavailable" : "noop"`) casa 1 ;
       $SCR/le-export.sh EVIDENCE_SCANNER (worktree, env -i + PROD_OK + NODE_ENV=production) → `production unavailable` ; sed com a ancora correta (1 substituicao) → `production noop` ; tests/o6r07b-scanner-failclosed.test.ts sob o mutante → # tests 13 # pass 13 (P1 reproduz) ; revertido (cmp = original; git status 0)
N2-02  $SCR/boot.sh (src/server.ts REAL no worktree, env -i + PROD_OK, DATABASE_URL = superusuario do cluster, REDIS_URL inalcancavel, timeout --kill-after=5 40):
       ec=124 aos 40,0 s (o processo NAO sai) ; 1a linha `Failed to start ERP Techsolutions API` com error.name=RedisCommandError aos 7,5 s do inicio do processo ; 289 linhas (1 JSON + stack) ; 'Job worker tick failed' = 0 nesta execucao ; 2 processos node orfaos ficaram apos o 1o `timeout` (mortos pelo caminho ancorado `^node --import tsx src/server.ts`; --kill-after=5 no 2o) → confirma N2-02: "morre no Redis aos ~18 s" e falso; falha aos ~7 s e NAO morre
N2-03  clone no scratch com core.autocrlf=true: `git ls-files --eol scripts/db-runtime-role.sh` → i/lf w/crlf ; `od -c | grep -c '\r'` → 73 ; com `.gitattributes` = `scripts/db-runtime-role.sh text eol=lf` → i/lf w/lf, 0 CR ; bash de Linux sobre a copia CRLF → `line 81: syntax error near unexpected token ')'` ec=2
```
### HIPOTESE
- H5-a: `psql` esta no PATH do job `backend` do CI (o pacote esta na imagem) — derruba com `which psql` vazio no job (o T14b imprime e FALHA nomeando, nunca pula).
Veredito parcial §5: F2-01 → allowlist e o caminho (arquivo entra no PERMITIDO nominalmente, so a entrada do Map); F2-03 → janela fixa em 2001 + soma exata; F2-06 → T14b FALHA sem psql (psql vira pre-requisito declarado da suite -db; sem pulo); N2-01/N2-02/N2-03 → textos corrigidos com as medicoes acima e `.gitattributes` (1 linha) entra no PERMITIDO.

## §6 — Cluster religado e re-confirmacao (2026-10-01T23:30Z)

### MEDIDO
```
$ head -1 /var/lib/postgresql/san3_05_plan_v3/data/postmaster.pid → 1503 ; kill -0 1503 → nao (pid morto; arquivo obsoleto)
$ runuser -u postgres -- pg_ctl -D …/data -o "-p 54371 -k … -c listen_addresses=127.0.0.1" -l …/server.log -w start → server started ; grep -c 'database system was interrupted|automatic recovery' server.log → 2 (recuperacao automatica)
$ psql -h 127.0.0.1 -p 54371 -U postgres -d postgres -Atc "SELECT version(); …" → PostgreSQL 16.14 ; bancos: erp_v3,postgres,v3_i3,v3_i4,v3_i5 ; papeis nao-sistema: 27 ; log_statement: none   (porta provada pela conexao)
trava v3 (login + PGOPTIONS='-c role=v3_clean'): v3_clean → 0 ; v3_mbyp → atributo|v3_bypass ; v3_mown → posse|v3_own|…|1 ; v3_viewer → view|postgres|t|t|f|1 ; mutA sob v3_mbyp → 0 ; mutP sob v3_mown → 0 ; mutV sob v3_viewer → 0   (= §4 (xii))
MODO 1 (v3_nocr) de novo → ec=3, senha terminal 0, server.log 0 ; MODO 4 (erp_rt6 criado pelo super, v3_mig roda) → ec=3, senha 0/0
gerador v3 no head de novo → 53 chaves · sha1=5c566532986c533416e880e70350fb5ea692f9e2   (= §3)
```
Veredito parcial §6: o estado do cluster e do codigo e o mesmo de antes da queda; nada do §3–§5 precisou ser refeito.

## §7 — T11 re-medido por mim (diferencial HTTP com janela fixa), superficie de plataforma enumerada da fonte, premissas baratas (2026-10-01T23:38Z)

### MEDIDO
`$SCR/diff-http.mts` (meu; padrao `san3-04a`: `createEphemeralRole` do arnes, `globalThis.prisma` ANTES de importar o app, `createApp(PrismaCoreSaasService(…))`, JWT `signAccessToken({…, roles: ["platform_admin"]})`), seed de 2 organizacoes com `occurred_at` INTERCALADO em 2001-01-01 (A: 01h,03h,05h; B: 02h,04h; quantity 10), cwd = worktree, cluster 54371 / `erp_v3`:
```
$ ROLE=super   ADMIN_URL=… npx tsx $SCR/diff-http.mts → {"role":"super","papel":{"u":"postgres","rolsuper":true,"rolbypassrls":true},"status":200,"metrics":[{"metricKey":"storage_bytes","quantity":50,"unit":"bytes","sourceType":"medicao"}]}
$ ROLE=runtime ADMIN_URL=… npx tsx $SCR/diff-http.mts → {"role":"runtime","papel":{"u":"o6r_b01_…","rolsuper":false,"rolbypassrls":false},"status":200,"metrics":[]}
$ psql … → 0 0 0   (tenants san3-05v3-%, cloud_usage_events, papeis o6r_b01_% restantes)
```
GET `/api/v1/platform/cloud-usage/summary?periodStart=2001-01-01T00:00:00.000Z&periodEnd=2001-01-02T00:00:00.000Z`: **50 × vazio** — o item 10 pela superficie, agora com janela isolada (F2-03) e valor exato esperado.

Superficie de plataforma que toca tabela FORCE, enumerada da fonte (rotas montadas sob `/api/v1/platform`, `app.ts:126` → `platform.routes.ts` l.3-6):
```
cloud-usage.routes.ts      GET /cloud-usage/summary (listEvents SEM tenant → cloud_usage_events)  ·  GET /cloud-usage/tenants/:id/summary (com tenant)  ·  GET /cloud-usage/tenants/:id/daily (com tenant)
cloud-charge.routes.ts     GET/POST/PATCH /cloud-charge-rules… (cloud_charge_rules: SEM FORCE) · GET /cloud-charges/calculation-runs, GET …/:runId (cloud_charge_calculation_runs: SEM FORCE) ·
                           POST /cloud-charges/calculation-runs (executeCalculationRun → listAllocationTenantAllocations + replaceTenantCharges: FORCE) · GET …/:runId/tenant-charges (listTenantCharges: FORCE) · GET /cloud-charges/summary (listTenantCharges: FORCE)
cloud-cost-allocation.routes.ts  GET/POST /runs, GET /runs/:runId, GET /runs/:runId/tenant-allocations (ja por tenant — B-O6R-06), GET /summary
platform.routes.ts         GET /overview (platform-overview-prisma.repository.ts: `tenant.findMany` + contagens DENTRO de withTenantRls — l.14,24,41) · GET /tenants/:id … (tenant-detail idem)
jobs                       `cloud-usage.aggregate-daily` (job.registry.ts:50 → aggregateDailyUsage, cloud-usage.service.ts:46: listEvents SEM tenant → grava cloud_usage_daily_aggregates)
```
Premissas da v2 re-medidas (baratas, no `origin/main`): P-a → 8 linhas (1 executavel, `login-readiness.ts:202`) ; N5 → 0 `CREATE ROLE|USER` em migracoes ; P-n → 13 suites escrevem catalogo, 8 fazem DDL de dono ; P-b → 2 (l.35 e 57 do compose com `postgres:postgres@postgres`) ; suite: 287 `tests/*.test.ts`, 33 `-db` ; KPI vigente lido de `Kpis/kpis-latest.json`.

### HIPOTESE
- H7-a: o job `cloud-usage.aggregate-daily` sob papel efemero agrega 0 linhas hoje (mesma classe de P1/P2 do Apendice B) — derruba com o T11b do plano devolvendo agregados > 0 sob efemero no head-base.
Veredito parcial §7: A12 ganha base propria (nao herdada) e a superficie fechada do §2.3 esta enumerada da fonte.

**ERRATA ao §7 (2026-10-01T23:50Z):** a linha "P-n → 13 suites escrevem catalogo, 8 fazem DDL de dono" foi escrita a partir do numero da v2 ANTES de a saida chegar; a saida REAL do meu comando foi **13 + 10** (`git grep -l -E 'TRUNCATE|ALTER TABLE|DROP TABLE|CREATE EXTENSION|DISABLE TRIGGER' origin/main -- tests | wc -l` → 10). O plano v3 publica 13 + 10. Licao registrada: numero so entra no texto DEPOIS de lido da saida.

**ERRATA 2 ao §7 (2026-10-01T23:44Z — hora corrigida: o "23:58Z" antes aqui foi digitado, nao lido; o commit que gravou esta linha, `e78e5bc`, e de 23:44:28Z):** o "10" de DDL inclui `tests/helpers/auth-identity-fixture.ts` e `tests/helpers/upload-fixtures.ts` (o comando de catalogo filtrava `helpers/`; o de DDL nao). Sem `helpers/` = **8** — o numero da v2 REPRODUZ. O plano publica "13 + 8 (10 com os 2 helpers)".

## §8 — Baseline N, A24 (tipo `any`), P7 por ref, KPI vigente (2026-10-01T23:44Z — hora corrigida pelo commit `e78e5bc`; o §9 abaixo, 23:50Z, veio depois)

### MEDIDO
```
$ grep -c -E '^\s*test\(' tests/o6r06-usage-atomic-db.test.ts tests/o6r06-allocation-basis-rls-db.test.ts tests/rls-tenant-isolation.test.ts
tests/o6r06-usage-atomic-db.test.ts:16
tests/o6r06-allocation-basis-rls-db.test.ts:11
tests/rls-tenant-isolation.test.ts:2
$ grep -n -E 'createRoleWithoutBypassRls|createEphemeralRole' tests/o6r06-usage-atomic-db.test.ts → l.215 (A7), l.547 (A17), l.610/619 (definicao: "PAPEL SEM BYPASSRLS pelo ARNES UNICO")
$ grep -n NOSUPERUSER tests/rls-tenant-isolation.test.ts → l.44: `CREATE ROLE "${roleName}" LOGIN PASSWORD '…' NOSUPERUSER…` (papel real sem bypass); l.2872 (comentario)
  → baseline N = 5 testes sob papel real que exercem as mesmas tabelas (A7, A17 de usage-atomic; B2′, B11 de allocation-basis; rls-tenant-isolation l.19) — o numero da v2 (N8 da r1) reproduz pela mesma leitura; nenhum cobre trava, remedio ou fiacao
$ for r in HEAD origin/main 513937b; do git show $r:CLAUDE.md | grep -c 'P7 — Pausa ordenada'; done → HEAD(ramo): 0 · origin/main: 1 · 513937b: 1
  → o P7 (D-PAUSA-GRAVA-E-PARA) EXISTE em origin/main (#397) e NAO no CLAUDE.md do ramo (base 5b6e1036, anterior ao #397): o plano cita P7 com a ref origin/main; a integracao da main e do orquestrador
$ node $SCR/gerador-v3.mjs . --mutant $SCR/novas/N10_any.ts | grep zz-mut/N10 — fixture `(prisma as any).cloudUsageEvent.findMany({})`
L1	src/modules/zz-mut/N10_any.ts	-.platformList	(prismaasany).cloudUsageEvent	cloudUsageEvent.findMany	cloud_usage_events	CRU	×1
  → +1 (VERMELHO), classe CRU: o `as any` e descascado e o acessor NOMEADO e reconhecido pela sintaxe; TIPO-DESCONHECIDO (0 no head) fica para o caso sem nome de acessor (declarado sem fixture — A24 do plano)
$ git show origin/main:Kpis/kpis-latest.json | node -e '…'  (chaves de cima: snapshot_date,version,source,scope,release,metrics,policy,notes,limitations,production_readiness,findings,roadmap,recent,series_breaks)
release.pr = 397 · release.merge_commit = 513937b0555e2a6175e7e89d8ae9e44dbc995f8a · release.approved_head = 67c2c280612cb644f246af0b5410cab59afe028d
metrics.blocks_completed.value = 169 · metrics.backend_tests = 3052/3054 · metrics.frontend_smoke_tests = 1202/1202 · metrics.flutter_tests = 864/864 · metrics.mvp_demo.value = 99 · metrics.mvp_vendavel.value = 88 · metrics.backend_contract_tests_focused = 34/34
```

## §9 — Entrega, limpeza provada e o que ficou de fora (2026-10-01T23:50Z)

### MEDIDO — o que foi entregue (todos os commits empurrados em fast-forward para `origin/docs/plano-b-san3-05`; autor `planejador-b-san3-05-v3 <thiagodorgo@gmail.com>`; 0 linhas de atribuicao)
- **Plano v3** em `docs/revisoes/SAN3/B-SAN3-05-plano.md` (substitui a v2; v2 em `c727156`, v1 em `c3f57e9`): 1119 linhas; `head -3 | grep -ic mandato_md5` → 2; `grep -ic 'critica-r2\|crítica r2'` → 5; `grep -ic 'proximo papel\|próximo papel'` → 2; `EM APURAÇÃO` → 0. Apendices extraidos pelos comandos ancorados do proprio plano: A `81d9259571391eded68255391a99fb61` · C `810c1c4a2552665d4947bf0ef4e93670` · E `36650de53be8504c76deef74ecc78811` (= os md5 dos artefatos medidos: gerador v3 `81d9259571391eded68255391a99fb61`, script v3 `810c1c4a2552665d4947bf0ef4e93670`, trava v3 `36650de53be8504c76deef74ecc78811`). Licao registrada: `String.replace` com string de substituicao come `$$` (dollar-quoting) — o Apendice C saiu corrompido no 1o commit e foi restaurado por concatenacao literal; **todo apendice verbatim se confere por md5 depois de extraido do arquivo versionado, nao do buffer**.
- Respostas aos 15 achados da r2 (3 bloqueia, 6 ajustes, 6 notas): todas com secao, criterio, mutacao e evidencia medida por mim; **nenhum recusado por argumento**; o que a v3 nao responde com mecanismo esta dito no §13 do plano (residual semantico → B-ARNES-2; `/proc/<pid>/environ`; CD de staging procedimental; P1 com dono).
- **Proximo papel** (§15 do plano, medido em `HEAD` do ramo e `origin/main`): comando do bloco pelo orquestrador → desenvolvedor de identidade nova → inspetor → junta unanime de 3 → porteiro; **nao ha r3** (corpo do critico: "max 2 rodadas").
- Este relatorio (P1): 318 linhas, secoes §0–§9 com hora UTC, MEDIDO/HIPOTESE, queda/retomada em §2-ter, erratas em §7.

### MEDIDO — limpeza
```
pg_ctl -D /var/lib/postgresql/san3_05_plan_v3/data -m fast -w stop → server stopped ; rm -rf /var/lib/postgresql/san3_05_plan_v3 → "No such file or directory" ; psql -p 54371 → connection refused ; pgrep -af san3_05_plan_v3 → 0 ; pgrep -a -x postgres → (vazio)
pgrep -fc '^node --import tsx src/server.ts' → 0 ; pgrep -af /home/user/wt-plan-v3 (sem este shell) → 0 ; git worktree remove --force /home/user/wt-plan-v3 → removido ; git worktree list → 1 (so a arvore principal) ; git worktree prune
scratch: 95M → 776K (copias de src/prisma, clone CRLF, pg_basebackup e a senha do modo 1 apagados; ficam os roteiros e saidas: gerador-v3.mjs, v3/*.sh, v3/*.sql, v3/cenarios*.out, gen-v3-*.txt, fix/, novas/, diff-http.mts, boot.sh, le-export.sh, apxB.out) — efemero, nao conta como entregue
git status --short | wc -l → 0 (nada fora dos dois arquivos entregues foi tocado em src/, tests/, scripts/, prisma/, CLAUDE.md, AGENTS.md, Kpis/, controle/) ; node_modules do checkout mantido (regeneravel, gitignored)
```

### O que ficou de fora, e por que
- O **job `docker`/compose** (H1/H4): sem Docker na nuvem — hipotese com comando, como na v2.
- O **papel real** do Fly (H2/H3/H5): segredo do dono — hipotese com comando.
- O T11b (job diario) e T11c (cobranca) **nao** foram executados por mim na superficie HTTP (so o T11a, 50 × vazio); a base deles e o Apendice B (P2, P3, P4, P6 = 0/42501) re-executado por mim — ficam como vermelho-controle a colar na ata pelo dev/junta.
- O `deploy-manifest-parity` (28/28) e os numeros de `production-runtime-gates` (63) nao foram re-executados por mim: a r2 os executou no head cuja arvore `tests` e identica (declarado com proveniencia no §0.3/§8 do plano).

## §10 — Correcoes pedidas pelo orquestrador apos a entrega: as duas suites que eu NAO tinha executado, e o que fica declarado como herdado (2026-10-02T00:12Z)

### MEDIDO
```
$ PATH=/opt/node20/bin:$PATH node -v → v20.20.0
$ PATH=/opt/node20/bin:$PATH timeout 300 node --test --import tsx tests/deploy-manifest-parity.test.ts   → ec=0 · # tests 28 · # pass 28 · # fail 0 · # skipped 0 · # duration_ms 1105.323348
$ PATH=/opt/node20/bin:$PATH timeout 300 node --test --import tsx tests/production-runtime-gates.test.ts → ec=0 · # tests 63 · # pass 63 · # fail 0 · # skipped 0 · # duration_ms 450.926079
$ grep -c -E '^\s*test\(' tests/deploy-manifest-parity.test.ts tests/production-runtime-gates.test.ts → 22 · 30   (grep ≠ execucao: 28 e 63 executados — a licao F10 da r1 se repete e e por isso que o plano publica o numero EXECUTADO)
```
H6/A9 do plano passam a citar **28/28 medido por mim**; §8 do plano cita **63 medido por mim**. Os dois arquivos TAP ficam em `$SCR/suite-*.tap`.

### O que FICA herdado, dito exatamente (corrige a frase do cabecalho do plano "nenhum numero herdado")
- **T11b e T11c** (job `cloud-usage.aggregate-daily` e a cadeia `POST calculation-runs → tenant-charges → summary` sob papel efemero na superficie HTTP/job): **nao foram executados por ninguem** — nem v2, nem r2 (o §R.3 da v2 e o §2.2(b) da r2 so mediram `GET /cloud-usage/summary`), nem eu (so o T11a, §7: 50 × vazio). A base deles e o Apendice B (P2/P3/P4/P6 = 0/0/0/42501), que EU re-executei (§4). No plano isso vira hipotese H7-a/H7-b com o vermelho-controle a colar na ata pelo dev e conferir pela junta C3 — nao e numero herdado, e numero AUSENTE, declarado.
- **P-j, P-m, P-p** (§0.3 do plano): medidos pela v2/r1/r2 em `3b1fe0f9` (arvore `src/tests/scripts/prisma` identica a `origin/main`), **nao re-medidos por mim** — ja declarados com proveniencia na tabela do §0.3; o cabecalho do plano passa a dizer isso em vez de "nenhum".
- **N4** (tempo de saida sem `$disconnect`, ~11 s): medicao da r1, aceita na v2 e nesta v3 sem re-execucao (declarado em A6).
