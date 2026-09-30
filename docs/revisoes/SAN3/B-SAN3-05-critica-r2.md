# B-SAN3-05 — Crítica adversarial r2 (ÚLTIMA rodada) sobre o plano v2

- **Identidade:** `critico-b-san3-05` · papel `critico-adversarial` · rodada **r2** (instância nova, contexto limpo; nunca planejou nem desenvolveu o bloco).
- **Corpo:** `.claude/agents/critico-adversarial.md` em `origin/main@3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c` — `git show origin/main:.claude/agents/critico-adversarial.md | tr -d '\r' | md5sum` → `ae0a04610a6be1c1490c0c51e0489d91` (confere com o esperado).
- **Modelo em que roda:** Opus 5.5 (`claude-opus-5-5`). Papel `critico-adversarial` não é gate nem planejador; sem substituição a declarar.
- **Máquina:** `Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 GNU/Linux` · Node `v20.20.2` (`PATH=/opt/node20/bin:$PATH`).
- **Alvo:** `docs/revisoes/SAN3/B-SAN3-05-plano.md` (v2, 1913 linhas) no ramo `docs/plano-b-san3-05`, head `c727156ddecda2c26258d67749c5bed21cc18d43`; crítica r1 no mesmo ramo; v1 em `c3f57e9`.
- **Cluster:** Postgres 16.13 descartável `127.0.0.1:54354` (banco `erp_critico_r2`), Redis `127.0.0.1:63854`.
- **Regra de papéis (§C7.4-bis):** este documento ACHA. Não propõe correção, não escreve plano, não escreve código de produto.

## 1. Fechamento dos 23 achados da r1

EM APURAÇÃO

## 2. Achados novos da v2 (e re-medição do que a v2 afirma)

Scratch: `/tmp/claude-0/-home-user-ERP-Techsolutios/2284c1af-ebcb-5671-92c9-9a61ff81a2fa/scratchpad/critico-r2/` (abaixo `$S2`).
Os apêndices foram extraídos do plano por `awk` e conferidos por md5 contra o declarado: Apêndice A `293b3746ad7e4dea1c11e16c794e7aa3`,
Apêndice B `6204643a81fb5d2305f09ff38b89f9de`, Apêndice C `189ddf8a093934cf1c1baa61ba80f5c8` (os três = o declarado e = os scripts do
planejador em `plano-v2/`); a trava do §2.2(a) extraída do plano = `plano-v2/guard-v2.sql` (`diff` vazio).

### 2.1 O gerador v2 e o ratchet — reproduz, e é cego a 9 formas novas fora do residual declarado

```
$ cd /home/user/wt-critico-r2 && PATH=/opt/node20/bin:$PATH node $S2/gerador-apA.mjs . > $S2/gen-head.txt ; ec=0
$ diff <(saída colada no Apêndice A) $S2/gen-head.txt  → IDÊNTICA (L1 720 · 48 chaves · sha1 147d41c2… · L2b 65)
# arnês $S2/mut.sh: cópia de src+prisma SEM node_modules; mutação em src/modules/zz-mut/mut.ts; comm contra as 48 chaves do head
CONTROLE sem mutação → novas=0 sumidas=0 VERDE
as 17 fixtures do Apêndice D (extraídas verbatim) → 17/17 VERMELHO (+1 cada)   · "sumida" (sítio 7, prisma → prisma as never) → novas=1 sumidas=1 VERMELHO
```
Veredito parcial: **o que a v2 afirma sobre as 17 reproduz.** Agora as formas que NÃO estão nas 17 e NÃO estão no residual
declarado do §0.4 ("acessor dinâmico `prisma[nome]`, `Object.values(prisma)`, SQL cru montado fora do arquivo e client obtido por
caminho que não passe por um nome de acessor Prisma") — todas obtêm o client **pelo nome do acessor** ou instanciam a classe crua
**pelo nome da classe**:

```
$S2/novas/N01_destructure_renomeado.ts   const { cloudUsageEvent: ev } = prisma; ev.findMany({})                         → novas=0 VERDE
$S2/novas/N02_alias_do_delegate.ts       const ev = prisma.cloudUsageEvent; ev.findMany({})                              → novas=0 VERDE
$S2/novas/N03_new_via_namespace.ts       import * as cu from "…cloud-usage-prisma.repository.js"; new cu.PrismaCloudUsageRepository(prisma).listEvents({}) → VERDE
$S2/novas/N04_import_renomeado.ts        import { PrismaCloudUsageRepository as UsageRepo }; new UsageRepo(prisma).listEvents({})                        → VERDE
$S2/novas/N05_setter_condicional.ts      prisma.$transaction(async (tx) => { if (tenantId) await setTenantRlsContext(tx, tenantId); return tx.cloudUsageEvent.findMany({}) }) → VERDE
$S2/novas/N06_setter_no_cliente_errado.ts prisma.$transaction(async (tx) => { await setTenantRlsContext(prisma, id); return tx.cloudUsageEvent.findMany({}) })          → VERDE
$S2/novas/N07_delegate_como_argumento.ts paginate(prisma.cloudUsageEvent) com paginate(d) { return d.findMany({take:50}) } → VERDE
$S2/novas/N08_subclasse_via_namespace.ts class Sub extends cc.PrismaCloudChargeRepository {}; new Sub(prisma).listTenantCharges("x")           → VERDE
$S2/novas/N09_setter_em_comentario.ts    $transaction cujo corpo só tem o COMENTÁRIO "sem setTenantRlsContext( aqui"       → VERDE
```
**9/9 VERDES** (saída em `$S2/novas-results.txt`). Mecanismo, lido no Apêndice A: L1 só reconhece acessor por **nome** (`accessorToTable.has(target.name.text)`
ou identificador literalmente chamado `cloudUsageEvent`), então delegate renomeado/aliased/passado como argumento some (N01, N02, N07); L2 só
reconhece `new <Identificador>` cujo texto é o nome da classe (`ts.isIdentifier(node.expression) && injectedClasses.has(...)`) e `extends` pelo
texto (`t.expression.getText(sf)` = `cc.PrismaCloudChargeRepository` ≠ `PrismaCloudChargeRepository`), então namespace, import renomeado e
subclasse via namespace somem (N03, N04, N08); e `$transaction` é absolvido por **regex de texto** (`CONTEXT_SETTERS.test(before)`) — qualquer
ocorrência textual de `setTenantRlsContext(` antes do sítio, inclusive num `if` que não executa, com o client errado, ou num comentário, vira
`SOB-CONTEXTO` (N05, N06, N09). N05 é **a forma exata do defeito original do item 10** (ramo sem `tenantId`). A prova dinâmica de que N05/N06
leem sem GUC está em 2.2.

### 2.2 As formas novas são sítios crus de verdade; o T11 não as vê; T2 e T15 re-medidos

**(a) Prova dinâmica** (`$S2/dyn-novas.mts`, `setTenantRlsContext`/`withTenantRls` reais do head, cluster 54354, papel `cr2_clean`
`NOSUPERUSER NOBYPASSRLS` + DML, 2 organizações com 3+2 eventos; papel e semente derrubados no fim — contagem `0 0 0`):
```
superusuario {"N02_alias":5,"N05_setter_condicional":5,"N06_setter_cliente_errado":5,"controle_withTenantRls_A":5}
papel_limpo  {"N02_alias":0,"N05_setter_condicional":0,"N06_setter_cliente_errado":0,"controle_withTenantRls_A":3}
```
Os três leem **sem GUC**: 5 sob bypass, 0 sob papel limpo — a assinatura exata do item 10. O gerador classifica N05 e N06 como
`SOB-CONTEXTO` (regex de texto) e N02 não vê.

**(b) O T11-diferencial não é guard da propriedade — é teste de UMA rota.** Re-executado o roteiro do planejador (`plano-v2/diff-http.mts`,
cwd = meu worktree, cluster 54354): `super → 200 [{"metricKey":"storage_bytes","quantity":50,…}]` · `runtime (o6r_b01_…, f/f) → 200 []`;
limpeza `0 0 0`. **Reproduz o §R.3.** Mas a rota é só `GET /platform/cloud-usage/summary` (`diff-http.mts:36`), que alcança só
`RlsPrismaCloudUsageRepository.listEvents`. Qualquer uma das formas N01–N09 posta em qualquer outro módulo passa no ratchet (2.1) **e** no
T11. O plano (§R.2, R9, §10 C3) chama o T11 de "o guard da propriedade" e faz dele a rede do residual; o que ele guarda é o sítio 1.

**(c) O T11 como escrito é exposto ao lote paralelo.** `npm test` roda os arquivos em paralelo (`scripts/run-backend-tests.mjs:362-370`:
um `node --test` com todos os arquivos, concorrência default; `ci.yml:136-138` registra a poluição do paralelismo). A rota soma
`quantity` de **todas** as organizações na janela (`cloud-usage.service.ts:112-131`). `captureCloudUsage` grava `occurred_at = new Date()`
por default (`cloud-usage.capture.ts:187`) e é exercida por ≥13 suítes `-db` (checklist, financeiro…). O protótipo usou a janela
`2026-09-01..2026-09-30`, que contém "hoje" (2026-09-30). "Corpos iguais" entre duas chamadas separadas no tempo, num banco onde
outras suítes gravam na mesma janela, fica vermelho por concorrência, não pela propriedade. O plano não fixa janela isolada nem
serialização. **Achado F2-03 (ajuste).**

**(d) T2 — o mecanismo funciona, o comando colado não.** `le-export.sh EVIDENCE_SCANNER` (roteiro do planejador, `cd` trocado) →
`production unavailable`. O `sed` do §R.5 (l.200), verbatim, casa **0** vezes: o texto é `=== "production" ? "unavailable" : "noop"`
(aspas entre `production` e `?`). Com âncora que casa (1 substituição, provada): filho → `production noop`, precedente
`o6r07b-scanner-failclosed` → `13/13` verde. Revertido (`cmp` = original; `git status` 0). O **mecanismo** do T2 se sustenta e o P1 reproduz;
a evidência colada no §R.5 não pode ter produzido a saída que o plano mostra. **Nota N2-01.**

**(e) T15 — o vermelho-controle descrito é falso; a mutação ainda fica vermelha, por outro motivo.** `$S2/boot.sh` (= `plano-v2/boot.sh`,
`cd` trocado, saída inteira em arquivo, `timeout 40`), `DATABASE_URL` = superusuário do cluster, `src/server.ts` do head:
```
ec=124   (morto pelo timeout aos 40 s — o processo NÃO sai)
+6,8 s  {"level":50,…,"error":{"name":"RedisCommandError"},"msg":"Failed to start ERP Techsolutions API"}
depois: 33 × "Job worker tick failed." (RedisCommandError), sem "In-process job worker started"; nenhum processo órfão depois (ps)
```
O plano diz, em §R.5, §1 (fluxo 1), H5 e A20, que hoje o boot "morre no Redis aos ~18 s". Medido: falha aos 6,8 s e **não morre** —
`startJobWorkerIfEnabled` (`server.ts:19`) já ligou `setInterval`/heartbeat antes do primeiro enqueue estourar, e o `main().catch`
só põe `exitCode` (`server.ts:45-48`). Consequência para o T15: a mutação "apagar a chamada em `main()`" fica vermelha **por timeout do
teste** (R12: 30 s), não por "a primeira linha traz `RedisCommandError`". Continua vermelha; o motivo declarado é que está errado.
**Nota N2-02.**


### 2.3 O `db-catalog-write-guard` reprova as suítes que o próprio plano manda escrever, e o arquivo que resolve isso está fora do §6

```
$ sed -n 62,69p tests/db-catalog-write-guard.test.ts   → padrões: CREATE ROLE · DROP ROLE · ALTER ROLE · GRANT · REVOKE · OWNER TO
$ sed -n 144,158p …                                     → walkTestFiles(TESTS_ROOT) recursivo, todo *.ts sob tests/ (fixtures incluídas)
# sonda TEMPORÁRIA tests/san3-05-runtime-role-guard-db.test.ts com a forma mínima que T7/T8 exigem (1 CREATE ROLE, 1 GRANT), removida por trap:
$ PATH=/opt/node20/bin:$PATH node --test --import tsx --test-name-pattern='ratchet de catálogo' tests/db-catalog-write-guard.test.ts
not ok 1 - ratchet de catálogo: …
    san3-05-runtime-role-guard-db.test.ts: 2 ocorrência(s) de escrita de catálogo FORA da allowlist — escritor novo. … registre o arquivo aqui com motivo
# fail 1
$ git status --short | wc -l → 0   (sonda removida)
$ sed -n 324,352p tests/helpers/auth-identity-fixture.ts → createEphemeralRole só cria "NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT"; não há função do arnês para SUPERUSER, GRANT de pertença, OWNER TO nem CREATE DATABASE
```
O §8 manda T7 (papel `SUPERUSER NOBYPASSRLS` "criado pelo arnês sob `withRoleCatalogLock`"), T8 (`GRANT bypass TO efêmero` / `REVOKE`),
T8b (`OWNER TO efêmero`, `GRANT dono TO efêmero`) e T14 (7 cenários com `CREATE ROLE p3_mig`, `ALTER ROLE … SUPERUSER BYPASSRLS`, `GRANT`,
`OWNER TO`) em `tests/san3-05-runtime-role-guard-db.test.ts`; e diz (l.856-858) que "os que criam papel/banco entram no ratchet
`db-catalog-write-guard` com contagem congelada (ou pedem ao arnês…)". As duas saídas exigem editar `tests/db-catalog-write-guard.test.ts`
(a `FROZEN_ALLOWLIST`) ou `tests/helpers/auth-identity-fixture.ts` — **nenhum dos dois está no PERMITIDO do §6** ("PERMITIDO (e nada mais)":
`tests/production-runtime-gates.test.ts` · `tests/san3-05-*.test.ts` · `tests/fixtures/san3-05-mutacoes/**`). E a bateria do §8 (l.875) roda
`tests/db-catalog-write-guard.test.ts` como regressão. Logo: ou o dev sai do escopo, ou omite T7/T8/T8b/T14 (A2–A5, A17 sem teste), ou burla
o guard lexical (o próprio guard documenta o buraco `["GRANT","SELECT"].join(" ")`, l.46) — as três reprovam. É a classe do F1 da r1
(critério impossível dentro do próprio escopo). **Achado F2-01.**


### 2.4 O procedimento (Apêndice C) executado — reproduz nos cenários do plano; vaza a senha nova; tem um 4º modo de falha

Bancos `cr2_i3` (executor `postgres`) e `cr2_i4` (dono `cr2_mig` `LOGIN CREATEROLE NOSUPERUSER NOBYPASSRLS`), criados por mim no 54354.
Execução sempre por `env -i PATH=/usr/bin:/bin HOME=/root PGHOST=127.0.0.1 PGPORT=54354 PGUSER=… PGDATABASE=… DB_RUNTIME_*=… bash $S2/db-runtime-role-apC.sh`.

```
(i)   postgres, papel novo            → DO / erp_runtime|f|f|f|0|2 / ec=0
(ii)  2ª execução                     → mesma linha, ec=0; diff de pg_roles/pg_default_acl/pg_auth_members/relacl → IDEMPOTENTE
(iii) pré-existente SUPERUSER BYPASSRLS CREATEDB + membro de cr2_bypass + dono de t_own FORCE
      → ERROR: papel erp_runtime ainda escapa de RLS (1 via(s) … POSSE …) / ec=3 ; depois: t|t|t|membros=1 (NADA persistiu)
(iii-b) OWNER TO postgres; de novo     → erp_runtime|f|f|f|0|3 / ec=0 ; f|f|f, membros=0
(iv)  cr2_mig (não-super, dono) cria erp_rt2 → erp_rt2|f|f|f|0|1 / ec=0 ; pg_default_acl: cr2_mig|S, cr2_mig|r
```
Os cenários do §R.4 **reproduzem** (roteiro re-executado, não herdado). O que o plano não executou:

**(a) A senha nova sai em claro no terminal, no log do servidor e no `argv` do `psql`.**
```
# modo 1 do PRÓPRIO §11 passo 3 ("permission denied to create role"): executor cr2_nocr (LOGIN NOCREATEROLE)
ERROR:  permission denied to create role
CONTEXT:  SQL statement "CREATE ROLE erp_rt4 LOGIN NOINHERIT PASSWORD 'Senha-Nova-Modo1-cr2'"          ec=3
$ grep -c 'Senha-Nova-Modo1-cr2' /var/lib/postgresql/san3_05_critico_r2/server.log   → 1
# 4º modo (abaixo, (b)): CONTEXT: SQL statement "ALTER ROLE erp_rt3 WITH LOGIN NOINHERIT PASSWORD 'pw-cr2-3'"
$ grep -n 'pw-cr2-3' …/server.log → 127: … CONTEXT:  SQL statement "ALTER ROLE erp_rt3 WITH LOGIN NOINHERIT PASSWORD 'pw-cr2-3'"
# argv: shim $S2/shim/psql que só grava "$@" (sem conectar), DB_RUNTIME_PASSWORD=Senha-Nova-Argv-cr2
$ grep -n Senha-Nova-Argv-cr2 $S2/shim/argv.txt → 8:password=Senha-Nova-Argv-cr2
```
Configuração do cluster = default do PG16 (`log_min_messages=warning`, `log_min_error_statement=error`, `log_statement=none`). O plano diz
"`DB_RUNTIME_PASSWORD` (obrigatória; **nunca ecoada**)" (§4.1, cabeçalho do Apêndice C) e o §11 passo 2 diz que a senha "**não** vai para o
repositório nem para o chat". Medido: em **todo** modo de falha dentro do `DO` que passe por `CREATE/ALTER ROLE` (inclusive o modo 1
que o próprio §11 manda o dono esperar e ler), o PL/pgSQL põe o SQL dinâmico — com `PASSWORD '<senha nova>'` — no `CONTEXT` do erro, que
vai ao terminal do dono **e** ao log do servidor gerenciado (retenção do provedor, fora do controle do dono); e em **toda** execução a senha
está no `argv` do `psql` (`-v password=…`), legível por `ps`/`/proc/<pid>/cmdline` enquanto ele roda. Exposição de segredo é parada
irredutível do contrato (§C7.5) e regra de ouro (§2.8). **Achado F2-02 (bloqueia).**

**(b) Papel pré-existente que o migrador não-super NÃO criou — mesmo LIMPO — derruba o script com erro cru; é um 4º modo, fora do §11.**
```
$ psql -U postgres -c "CREATE ROLE erp_rt3 LOGIN PASSWORD 'x' NOSUPERUSER NOBYPASSRLS"       (limpo; criado por outro executor)
$ … PGUSER=cr2_mig PGDATABASE=cr2_i4 DB_RUNTIME_ROLE=erp_rt3 … bash db-runtime-role-apC.sh
ERROR:  permission denied to alter role
DETAIL:  Only roles with the CREATEROLE attribute and the ADMIN option on role "erp_rt3" may alter this role.      ec=3
```
No PG16 o `ALTER ROLE … PASSWORD` do ramo "papel já existe" exige `ADMIN OPTION`; quem tem é só quem criou o papel. O §11 passo 3 lista
três modos; o modo 2 ("já existia um papel com esse nome e um atributo que o migrador não pode tirar") **nunca aparece** para papel que o
migrador não criou — o `ALTER … PASSWORD` falha antes, com a mensagem crua acima. A "idempotência" do §11 ("rodar N vezes converge")
só vale para o mesmo executor que criou o papel. É a classe do F8 da r1 (migrador não-super recusado num `ALTER ROLE` que o plano não
previu), agora no ramo do papel pré-existente. **F8 → aberto (parcial), ajuste.**

**(c) Pertença INDIRETA a papel que escapa: o script falha fechado, mas manda o dono consertar a coisa errada.**
```
$ GRANT cr2_bypass TO cr2_mid; GRANT cr2_mid TO erp_runtime            (cadeia de 2 níveis; erp_runtime não é dono de nada)
WARNING:  role "erp_runtime" has not been granted membership in role "cr2_bypass" by role "postgres"
ERROR:  papel erp_runtime ainda escapa de RLS (1 via(s): …). Posse nao se corrige aqui: reatribua o dono ao migrador (ALTER TABLE ... OWNER TO postgres) e rode de novo     ec=3
```
O laço de `REVOKE` só revoga pertença direta ao papel que escapa; a intermediária fica, e a mensagem final atribui à **posse**. O dono,
seguindo o §11 passo 3 (modo 3), procuraria tabela para reatribuir e não acharia. **Achado F2-04 (ajuste).**

**(d) CRLF.** `git ls-files '.gitattributes'` → 0 na ref; o manual de terreno (§2.6) registra `core.autocrlf=true` no Windows do dono.
Cópia CRLF do Apêndice C sob bash de Linux, executada e sourced sob `set -Eeo pipefail`: `line 81: syntax error near unexpected token ')'`,
`ec=2` nos dois modos. Vale para o `bash` do contêiner `postgres:16` lendo um bind-mount de um checkout Windows (compose local-prod do
dono — HIPÓTESE, sem Docker aqui; comando: `git ls-files --eol scripts/db-runtime-role.sh` e `docker compose -f docker-compose.prod.yml up
postgres` na máquina do dono). **Não** afirmo quebra no `bash` do Git for Windows: o MSYS2 é corrigido para ignorar CR
([msys2/MSYS2-packages#6660](https://github.com/msys2/MSYS2-packages/issues/6660); relato de quebra em Git Bash:
[mindcockpit-ai/cognitive-core#58](https://github.com/mindcockpit-ai/cognitive-core/issues/58)). A CI faz checkout LF. **Nota N2-03.**

### 2.5 A trava v2 e a auto-verificação aprovam dois papéis que escapam com UM comando

Mesmo cluster, banco `cr2_i3`, tabela `t_force` FORCE com 4 linhas (3 organizações + o marcador `segredo-tenant-b-cr2`), a trava =
`$S2/guard-v2-plano.sql` (extraída do §2.2, = `plano-v2/guard-v2.sql`).
```
# (a) pertença ao papel predefinido pg_execute_server_program (NOSUPERUSER NOBYPASSRLS, dono de nada)
trava v2 sob cr2_prog                          → 0 linhas (PASSA)
SELECT count(*) FROM t_force  (sem GUC)        → 0
COPY cr2_dump FROM PROGRAM 'psql -h 127.0.0.1 -p 54354 -U postgres -d cr2_i3 -XAtc "select tenant_id from t_force order by id"'
SELECT string_agg(v, ',') FROM cr2_dump        → a,b,c,segredo-tenant-b-cr2
# (b) atributo REPLICATION num papel pré-existente: o script CONVERGE e aprova
script (executor postgres)                     → DO / erp_runtime|f|f|f|0|3 / ec=0 ; pg_roles.rolreplication = t (mantido)
trava v2 sob erp_runtime                       → 0 linhas (PASSA)
pg_basebackup -h 127.0.0.1 -p 54354 -U erp_runtime -D $S2/bb -Ft -X none -c fast   → ec=0, base.tar 48 MB
grep -a -c 'segredo-tenant-b-cr2' $S2/bb/base.tar → 2          (backup apagado em seguida)
```
O §1 promete que o processo "só sobe se a identidade … **não puder escapar de RLS**", e o §11 passo 5 diz "A trava é a prova — **agora
inteira**". O §2.1(a) lista o que fica fora (`SECURITY DEFINER`, `pg_read_all_data` que não escapa, `SET FALSE`) e não nomeia
`pg_execute_server_program`/`pg_read_server_files`/`pg_write_server_files` nem `REPLICATION`. O script (Apêndice C) corrige
`SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE` e deixa `REPLICATION` intacto com a linha de go/no-go `f|f|f|0`. É a classe do F5 da r1 (a trava
aprova um papel que escapa com um comando a mais); a exposição é menor (nenhum dos dois vem do `CREATE ROLE` do script; o pg_hba de um
gerenciado pode não aceitar replicação). **Achado F2-05 (ajuste).**

### 2.6 O "pula declarando" do T14b estoura o orçamento de pulos do runner

```
# fixture $S2/skipfix/a.test.ts: 2 pulos "conhecidos" + o pulo do T14b ("psql: ausente") + 1 teste; DATABASE_URL exportada
$ node scripts/run-backend-tests.mjs $S2/skipfix
[run-backend-tests] GUARD DE SKIP (P8): DATABASE_URL presente e 3 teste(s) pulados > orçamento 2. …      ec=1
# sem o pulo do T14b → ec=0
```
`SKIP_BUDGET_DB = 2` (`scripts/run-backend-tests.mjs:82`, fora do §6). O §8 (T14b) e o R13 dizem que, sem `psql` no PATH, o T14b
"pula **declarando**" e que isso mitiga a H7 falsa. Medido: com `DATABASE_URL` presente, o pulo declarado reprova o `npm test` inteiro.
Onde houver banco e não houver `psql` (a máquina onde juntas e porteiro rodam — manual de terreno §1.2 — é Windows com Postgres em
Docker; `psql` no PATH do Git Bash é HIPÓTESE), a contagem de KPI e a regressão do porteiro ficam vermelhas. **Achado F2-06 (ajuste).**

## 3. Critérios A1–A20 × mutação × teste

Mutantes da trava gerados de `$S2/guard-v2-plano.sql` por substituição textual provada (`grep -c session_user`: original 5, semi-mutante
atributo 3, semi-mutante posse 2); papéis `cr2_*` no banco `cr2_i3`.
```
                      membro de BYPASSRLS | membro do DONO | postgres (via/rolname/is_self)
trava v2               1                  | 1              | atributo/cr2_bypass/f atributo/cr2_super2/f atributo/postgres/t posse/cr2_owner/f posse/postgres/t
mut-A3 (r.rolname=cu)  0  ← T8 vermelho   | 1              | …
mut-A4 (sem posse)     1                  | 0 ← T8b verm.  | só atributo/*
sem r.rolsuper, sob cr2_super2: linhas is_self = 0 (v2: atributo|cr2_super2|t|f|t)  ← T7 vermelho
semi-mutante A5 "session_user→current_user só na metade atributo":
   cenário do T8c (login postgres, options role=cr2_clean) → 2 linhas (RECUSA: o mutante SOBREVIVE)
   login cr2_mbyp (NOSUPERUSER, membro de cr2_bypass e de cr2_clean), options role=cr2_clean → 0 linhas (PASSA)
   …e a porta nessa mesma sessão: cr2_mbyp|cr2_clean|0 ; SET ROLE cr2_bypass ; SELECT count(*) FROM t_force → 4
semi-mutante "só na metade posse": T8c → 3 linhas (SOBREVIVE); login cr2_mown (membro do dono) + role=cr2_clean → 0 (PASSA)
```

| A | Mutação declarada existe e o teste declarado a pega? | Evidência |
|---|---|---|
| A1 | sim (T6 asserta `via=atributo ∧ is_self ∧ rolsuper`; sem a metade atributo só sobram linhas `posse`) | tabela acima, linha `postgres` |
| A2 | sim (T7) | `is_self` some sem `r.rolsuper` |
| A3 | sim (T8) | mut-A3 → 0 sob membro de BYPASSRLS |
| A4 | sim (T8b) | mut-A4 → 0 sob membro do dono |
| A5 | **parcial**: a mutação escrita ("nas duas ocorrências") é pega; a substituição em **uma** metade sobrevive ao cenário único do T8c (login superusuário é membro de tudo, então a outra metade recusa por ele). A §2.1(a) é conjunção das duas metades para `session_user`; o teste não mata cada metade. (Nota: o SQL tem **5** ocorrências de `session_user`, não "duas".) | semi-mutantes acima → **F2-07 (ajuste)** |
| A6 | sim (T9 varredura do log; `$disconnect` pelo espião do T4) | leitura; r1 item 4.3 |
| A7 | sim (T1/T3, `safeParse`) | mecanismo dos gates existentes |
| A8 | sim (T2 em processo filho) | 2.2(d): mecanismo vê a mutação quando a âncora casa |
| A9 | sim | `deploy-manifest-parity` 28/28, `production-runtime-gates` 63/63 no head (executados aqui) |
| A10/A11 | sim para "tirar a reordenação" (semente intercalada: concatenação `false`, reordenada `true`; agregados `[15,14]` `false`) e para "tirar o setter" | `node -e` executado aqui; **mas** a soma "de 2 organizações" via `listEvents({janela})` sem tenant lê todas as organizações do banco compartilhado → F2-03 |
| A12 | a mutação declarada (sem laço) é pega **nessa rota**; nada além dela | 2.2(b)/(c) → F2 aberto, F2-03 |
| A13/A14 | sim, pelo precedente (proxy do B-O6R-06) | leitura |
| A15 | sim para as 17 + "sumida"; **não** para N01–N09 | 2.1 → F2 aberto |
| A16 | sim (compose: `api`→`postgres` faz a trava recusar); o boot sob `erp_runtime` passa — simulado sem Docker (§4 abaixo) | §4 |
| A17 | as 2 mutações escritas são pegas; T14a executa o `DO` pelo **Prisma administrativo** (superusuário) — os cenários de migrador não-super (iv, iv-b, iv-c) exigem cliente não-super, que é papel `LOGIN CREATEROLE` criado pelo teste (F2-01); T14b "pula declarando" reprova o `npm test` (F2-06) | 2.3, 2.6 |
| A18 | sim (documental, por comando) | — |
| A19 | frágil: "`rg -c 'P-SAN3-05-' pendencias.md` ≥ 6" conta **linhas**, e o §13 nomeia **5** IDs `P-SAN3-05-*`; omitir uma pendência pode manter ≥ 6 | leitura → **N2-04** |
| A20 | a mutação "apagar a chamada" fica vermelha **por timeout** do teste (o filho não sai), não pela 1ª linha trazer `RedisCommandError` | 2.2(e) → N2-02 |


## 4. A decisão de posse virar RECUSA × §11, compose e CI — medida

```
# compose simulado sem Docker, banco novo cr2_compose no 54354:
1. init, modo initdb.d (POSTGRES_DB/POSTGRES_USER, socket), DB_MIGRATOR_ROLE=postgres → DO / erp_runtime_c|f|f|f|0|0 / ec=0
2. DATABASE_URL=…postgres@…/cr2_compose npx prisma migrate deploy → All migrations have been successfully applied.
3. trava v2 sob erp_runtime_c → 0 linhas (PASSA) ; DML em 115/115 tabelas de public ; FORCE de posse/pertença = 0 ; 0 sequências em public
4. INSERT/DELETE em tenants como erp_runtime_c → ok
# §11 (papel que o script produz): (i) e (iv) acima → linha f|f|f|0 ; trava v2 sob o papel → 0 linhas
# CI job backend: roda como postgres com NODE_ENV≠production (trava desligada por default); T6 espera a recusa sob postgres
```
**Veredito do item 4: a RECUSA por posse não inviabiliza o §11, o compose (simulado) nem a CI.** O que resta é o que a v2 já declara
como hipótese: H1 (entrypoint real do `postgres:16`), H2/H3 (papel real de produção). Risco latente, não achado de bloqueio: o CD de
staging (`deploy-staging.yml:11-22`) roda a cada push na `main` quando `STAGING_DEPLOY_ENABLED == 'true'`; hoje está **desligado**
(API do GitHub: as 8 execuções mais recentes, inclusive a do `3b1fe0f9` em 2026-09-28, `conclusion: skipped`). No dia em que for ligado,
o primeiro deploy sobe com `NODE_ENV=production` (`fly.staging.toml:31`) e a trava ativa — o §11 não amarra a ativação do CD de staging
aos Atos 1–2 de staging. **Nota N2-05.**


## 5. Tabela de achados

EM APURAÇÃO

## 6. Tabela de fechamento r1

EM APURAÇÃO

## 7. Veredito

EM APURAÇÃO

## 8. Limpeza do cluster

EM APURAÇÃO
