# B-SAN3-05 — CRÍTICA ADVERSARIAL — rodada r1

> **Identidade:** `critico-b-san3-05` (nova; não planejou nem desenvolveu este bloco) · **papel:** `critico-adversarial`
> (§C7.4-bis: **quem acha** — defeito + evidência executada + motivo; sem correção, sem plano, sem código).
> **Corpo:** `.claude/agents/critico-adversarial.md` @ `origin/main` = `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c`;
> `git show origin/main:.claude/agents/critico-adversarial.md | tr -d '\r' | md5sum` → `ae0a04610a6be1c1490c0c51e0489d91` (= o declarado pelo orquestrador).
> **Modelo em que roda:** Opus 5.5 (`claude-opus-5-5`) — o modelo da sessão; o `critico-adversarial` não tem `model:` fixado no frontmatter (não é gate Fable do §C7.6/6-bis).
> **Máquina:** `Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux` · `PATH=/opt/node20/bin:$PATH node -v` → `v20.20.2`.
> **Alvo:** `docs/revisoes/SAN3/B-SAN3-05-plano.md` no ramo `docs/plano-b-san3-05`, head `c3f57e9be6352b96a12ef1c6a292e49c1db64ad3`
> (1 commit sobre `origin/main@3b1fe0f9`). Lido inteiro (1292 linhas, com Apêndices A e B).
> **Cluster:** Postgres 16.13 descartável `127.0.0.1:54351`, banco `erp_critico` (115 tabelas, 106 FORCE — medido ao abrir). Redis `63851` (PONG; não usado).
> **Regra de leitura:** cada item = comando → saída resumida → veredito parcial. Logs longos ficam aqui, não na mensagem final.

---

## Item 1 — Lista fechada: gerador do Apêndice A, os 7 sítios do §0.4, e sítios crus que ele não vê

Scratch: `/tmp/claude-0/-home-user-ERP-Techsolutios/2284c1af-ebcb-5671-92c9-9a61ff81a2fa/scratchpad/critico-r1/` (abaixo `$S`).

**1.1 — o gerador é o declarado e reproduz a saída do plano.**
```
$ awk '/^```js$/{f=1;next} f&&/^```$/{exit} f' docs/revisoes/SAN3/B-SAN3-05-plano.md > $S/gerador.mjs ; md5sum $S/gerador.mjs
e8861755e1c960bbf41a48ce270ac445                       (= o declarado na l.733)
$ PATH=/opt/node20/bin:$PATH node $S/gerador.mjs . > $S/gerador-out.txt ; echo ec=$?        # cwd = /home/user/wt-critico (head c3f57e9)
ec=0
$ diff <(saída colada no plano, l.1020-1056) $S/gerador-out.txt && echo IDENTICA
IDENTICA        (L0 106/106/106/777 · L1 642 · L2 70/451 · L2b = 7 linhas)
```
Veredito parcial: **reproduz**.

**1.2 — os 7 sítios da tabela do §0.4, um a um (`sed -n` no head).** `cloud-usage-prisma.repository.ts:61` (`listEvents`, `this.client.cloudUsageEvent.findMany`), `:120` (`listDailyAggregates`), `:173`/`:197` (`new PrismaCloudUsageRepository(this.prismaClient)` nos ramos sem `tenantId`); `cloud-charge-prisma.repository.ts:167` (`deleteMany`), `:171` (`create`), `:202` (`listTenantCharges`), `:220` (`listAllocationTenantAllocations`, com `take: 100_000`), `:240` (fábrica crua); `cloud-cost-allocation-prisma.repository.ts:238` + `:413` (fábrica crua). Chamadores: `cloud-charge.service.ts:256-257` (`new CloudChargeService(await createPrismaCloudChargeRepository())`), `cloud-charge.routes.ts:27…118` e `cloud-charge.jobs.ts:18`. Veredito parcial: **linha, método, tabela e fronteira conferem** nos 7.

**1.3 — A12/T13/C3(1) exigem "L2b = ∅" no head da entrega; isso é IMPOSSÍVEL com o próprio escopo do plano.**
Simulei o remédio prescrito no §2.2(b) numa cópia (`$S/fixed`: `forEachTenantRls` em `rls.ts`, ramos sem tenant do uso reescritos, `RlsPrismaCloudChargeRepository` + fábrica devolvendo o envoltório) **sem tocar** `src/modules/cloud-cost-allocation/**` (PROIBIDO, §6):
```
$ PATH=/opt/node20/bin:$PATH node $S/gerador.mjs $S/fixed | awk '/^## L2b/{f=1;next} f'
src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts:238  PrismaCloudCostAllocationRepository.listUsageDailyAggregates  this.client  cloudUsageDailyAggregate.findMany  cloud_usage_daily_aggregates  via fábrica
```
O sítio 7 continua em L2b porque a fábrica `:413` continua crua — e o plano manda o sítio 7 para pendência (§13) e proíbe o arquivo (§6). O gerador verbatim não tem lista de exceção; A12 diz "falha se qualquer linha aparecer". Veredito parcial: **critério impossível de passar** → achado **F1**.

**1.4 — o critério do guard (L2b sem o sítio 7 = ∅ ∧ L1 `CRU` = 0) é cego a 16 de 17 sítios crus.**
Harness: para cada mutação, `cp -r $S/fixed mutdir`, um arquivo novo `src/modules/zz-mut/mut.ts`, e o gerador verbatim. Resultado (`$S/mut-fixed-results.txt`):

| mutação (sítio cru de verdade — lê/grava tabela FORCE sem GUC) | L1 `CRU` | L2b extra | guard A12 | aparece em alguma seção? |
|---|--:|--:|---|---|
| Ma alias `const db2 = prisma; db2.cloudUsageEvent.findMany()` | 0 | 0 | **VERDE** | L1 `OUTRO(db2)` |
| Mb desestruturação `const { cloudUsageEvent } = prisma` | 0 | 0 | **VERDE** | não |
| Mc acesso por índice `prisma["cloudUsageEvent"].findMany()` | 0 | 0 | **VERDE** | não |
| Md `prisma.$transaction(async (tx) => tx.cloudUsageEvent.findMany())` (sem setter) | 0 | 0 | **VERDE** | classificado **`SOB-CONTEXTO`** (`--all`) |
| Me client raiz dentro do callback: `withTenantRls(prisma, id, async (_tx) => prisma.cloudUsageEvent.findMany())` | 0 | 0 | **VERDE** | classificado **`SOB-CONTEXTO`** (`--all`) |
| Mf `new Svc(new PrismaCloudUsageRepository(prisma))` (injeção por construtor — a forma de `cloud-charge.service.ts:257`) | 0 | 0 | **VERDE** | L2 `CRU ?` (uso `?` ⇒ alcance vazio) |
| Mg `class Sub extends PrismaCloudChargeRepository {}` + `return new Sub(prisma)` | 0 | 0 | **VERDE** | não |
| Mh função livre `listAll(client) { client.cloudUsageEvent.findMany() }` + `listAll(prisma)` | 0 | 0 | **VERDE** | não (INJETADO sem classe ⇒ nunca entra em L2) |
| Mi `prisma.$queryRawUnsafe(SQL_TODOS)` com a tabela numa constante | 0 | 0 | **VERDE** | não |
| Mj método como campo arrow `listAll = async () => this.client…` + `new K(prisma).listAll()` | 0 | 0 | **VERDE** | L2 `CRU .listAll()` (método `null` ⇒ não casa em L2b) |
| Mk fábrica com parâmetro chamado `tx`: `const make = (tx) => new PrismaCloudUsageRepository(tx); make(prisma).listEvents()` | 0 | 0 | **VERDE** | não |
| **Ml a mutação do próprio plano** `new PrismaCloudUsageRepository(prisma).listEvents()` | 0 | **1** | **VERMELHO** | L2b `:61` |
| Mm `getPrisma().cloudUsageEvent.findMany()` | 0 | 0 | **VERDE** | L1 `OUTRO(getPrisma())` |
| Mn membro não previsto `this.conn.cloudUsageEvent.findMany()` + `new K(prisma)` | 0 | 0 | **VERDE** | L1 `OUTRO(this.conn)` |
| Mo helper com parâmetro `tx` chamado com `prisma` | 0 | 0 | **VERDE** | L1 `TX-SEM-ENVOLTORIO?` |
| Mp `{ charges: new PrismaCloudChargeRepository(prisma) }` em objeto literal | 0 | 0 | **VERDE** | L2 `CRU ?` |
| Mq classe cujo acesso FORCE é `this.client.tenantCloudCharge.updateManyAndReturn(...)` + `new Rep(prisma)` | 0 | 0 | **VERDE** | **não, nem com `--all`** |

A mutação que o plano cita em A12 é **a única** que o guard pega. "Default do membro não previsto = negar (linha nova = vermelho)" (A12) é **falso** para o gerador verbatim: Mn (membro `this.conn`) vira `OUTRO`, e nada em A12 torna `OUTRO` vermelho. Se, ao contrário, o teste ficar vermelho por **qualquer** linha das seções L1/L2, ele é vermelho **no head da entrega** (6 `TX-SEM-ENVOLTORIO?` + 4 `OUTRO()` + 5 `INJETADO` + as instanciações cruas de delegação e a fábrica `:413`). Não há leitura de A12 que seja ao mesmo tempo satisfazível e discriminante. Veredito parcial: **guard gerado não enuncia a propriedade** → achado **F2**.

**1.5 — dois defeitos do próprio gerador, medidos.**
- (a) **`classify` engole `$transaction-SEM-setter`.** L.858: `if (/^(tx|trx|transaction)$/.test(recv)) return ctx ? "SOB-CONTEXTO" : …` — `ctx = "$transaction-SEM-setter"` é *truthy* ⇒ `SOB-CONTEXTO`. Medido (Md acima). E o residual (i) do §0.4 ("hoje **zero** casos") é falso: `node $S/gerador.mjs . --all` → `src/modules/work-orders/work-order-prisma.repository.ts:541  tx  workOrderAssignment.create  $transaction-SEM-setter  SOB-CONTEXTO` (há 1 hoje; por leitura, `assign` é chamado dentro de `withTenantRls` em `:669`, então **não** é vazamento — mas o gerador o rotulou pelo motivo errado, e a categoria é invisível por construção). Também 1 instanciação `$transaction+setter-depois? → SOB-CONTEXTO` (`prisma-core-saas.store.ts:47`).
- (b) **`OPS` não tem `updateManyAndReturn`.** `git grep … | uniq -c` dos ops Prisma em `src`: `updateManyAndReturn` = **68** (5º mais usado); contador próprio (`$S/count-umr.mjs`, mesma L0) → **68 sobre tabela FORCE** (`this.client` 67, `tx` 1). Nenhum é visto: o `# L1: call-sites sobre tabelas FORCE = 642` do §0.4 é **subcontagem** de ao menos 68; Mq prova que um sítio cru por essa via some até do `--all`.
Veredito parcial: achados **F3** (a) e **F4** (b).

## Item 2 — `RUNTIME_ROLE_GUARD_SQL` sob papel real (super, super renomeado, limpo, membro de BYPASSRLS c/ NOINHERIT e 2 níveis) e a consulta ingênua

Banco `critico_i2` criado por mim no cluster 54351 (derrubado no fim). A consulta é a do §2.2, byte a byte (`$S/guard.sql`).
Cada papel conecta **como ele mesmo** (`psql -U <papel>`, trust), e além da trava meço a porta real (`SET ROLE c2_bypass` + `SELECT count(*) FROM t_force` sem GUC; tabela FORCE com 3 linhas).

```
papel                                   | trava  | consulta ingênua §5.2 | SET ROLE c2_bypass → linhas
postgres (super)                        | RECUSA | t|t                   | 3
c2_super2 (SUPERUSER, outro nome)       | RECUSA | t|f                   | 3
c2_clean (NOSUPERUSER NOBYPASSRLS)      | PASSA  | f|f                   | (SET ROLE negado) 0
c2_member_direct (GRANT c2_bypass)      | RECUSA | f|f                   | 3
c2_member_noinherit (NOINHERIT + GRANT) | RECUSA | f|f                   | 3
c2_member_chain (→ c2_mid → c2_bypass)  | RECUSA | f|f                   | 3
c2_member_chain_noinh (NOINHERIT → c2_mid2 NOINHERIT → c2_bypass) | RECUSA | f|f | 3
c2_member_noset (GRANT … WITH INHERIT FALSE, SET FALSE — PG16)    | RECUSA | f|f | (SET ROLE negado) 0
c2_app_ownermember (GRANT c2_mig TO app; c2_mig = dono NÃO-super de t_force) | PASSA | f|f | (SET ROLE negado) 0
c2_app_owner (dono direto de t_force2)  | PASSA  | f|f                   | —
```
Veredito parcial (casos do mandato a–e): **a trava se sustenta** para atributo e para pertença a papel que escapa (direta, `NOINHERIT`, cadeia de 2 níveis) e a consulta ingênua é cega em todos os casos de pertença (G4c reproduzido). `c2_member_noset` é **falso positivo** (recusa um papel que não consegue `SET ROLE`) — direção segura, **nota** (N1).

**2.2 — mas "isso é EXATAMENTE" (§2.1(a)) é falso: pertença ao papel DONO das tabelas escapa, e a trava e a sonda de posse dizem 0.**
```
$ psql -U c2_app_ownermember -d critico_i2      # membro de c2_mig (NOSUPERUSER NOBYPASSRLS, dono de t_force FORCE RLS)
owned_force_rls_tables (a sonda do §2.2/§4.1: relowner = current_user) → 0
SELECT count(*) FROM t_force;                            → 0     (RLS vale)
BEGIN; ALTER TABLE t_force NO FORCE ROW LEVEL SECURITY;  → ALTER TABLE   (dono por pertença)
SELECT count(*) FROM t_force;                            → 3     (sem GUC, mesma sessão do app)
ROLLBACK;
$ psql -U c2_app_owner … (dono direto de t_force2): sonda → 1 ; NO FORCE → 2 linhas sem GUC ; ROLLBACK
```
O §2.1(a) enuncia a propriedade como "não consegue ler ou gravar linha de tabela FORCE RLS sem o GUC" e afirma que "em PostgreSQL isso é **exatamente**" a consulta da trava. Medido: um papel que a trava **aprova** e cuja posse a sonda reporta **0** lê tudo sem GUC com um único `ALTER TABLE` — a mesma classe de escape (um comando a mais) que a pertença a `BYPASSRLS` (um `SET ROLE` a mais), que o plano recusa. A decisão declarada do plano (posse **reportada, não recusada** — §2.2, R5) não cobre isto: o que se reporta é `relowner = current_user`, que é **forma** (nome literal do dono), não a propriedade (poder agir como dono). O mesmo predicado está na auto-verificação do §4.1 (`pg_get_userbyid(c.relowner) = :'role'`), no go/no-go do dono no §11 passo 2 ("posse > 0 → não siga") e no H3. Veredito parcial: achado **F5**.

**2.3 — as leituras de plataforma sob papel limpo (sítios do §0.4), no MEU cluster.**
O Apêndice B verbatim tem `const REPO = "/home/user/ERP_Techsolutios"` cravado; aqui essa árvore está em `3b1fe0f9` mas **sem `node_modules`**, então o script verbatim não roda nesta máquina. Rodei cópia com **só** essa linha trocada (`diff` = 1 linha), cwd = worktree (`git diff --stat origin/main HEAD -- src prisma package.json` vazio):
```
$ ADMIN_URL=postgresql://postgres@127.0.0.1:54351/erp_critico?schema=public PATH=/opt/node20/bin:$PATH npx tsx $S/medir-papel.ts ; echo ec=$?
ec=0 … # 22 itens, 0 fora do esperado   (M0, G1–G4c, O1/O2, P1–P7c, R1 idênticos à tabela do §0.5)
$ psql … -Atc "…LIKE 'san3_05%'…; …slug LIKE 'san3-05-%'…; count(*) cloud_usage_events; count(*) tenant_cloud_charges"
0 / 0 / 0 / 0
```
Veredito parcial: **P1–P7 reproduzem** (`0` sob papel limpo; P6 `42501`). O caminho cravado no apêndice é **nota** de reprodutibilidade (N2).

## Item 3 — `scripts/db-runtime-role.sh` (SQL do §4.1) executado de verdade; `ALTER DEFAULT PRIVILEGES`; `docker-entrypoint` do `postgres:16`

Banco `critico_i3` criado por mim no cluster 54351. SQL extraído **verbatim** das l.391-408 do plano (`$S/role.sql`, 18 linhas, md5 `ffb3a039aff8b07b30aeb1a11f2bb9cf`).

**3.1 — o SQL não roda como está escrito, com as variáveis que o plano declara.**
```
$ psql -h 127.0.0.1 -p 54351 -U postgres -d critico_i3 -v ON_ERROR_STOP=1 -v role=erp_runtime -v password=senha-x -v migrator=postgres -f $S/role.sql
ERROR:  syntax error at or near ":"
LINE 2: ...OT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role') T...
psql ec=3
```
O `psql` **não interpola** `:'role'`/`:'password'` dentro de corpo *dollar-quoted* (`DO $$ … $$`): o servidor recebe `:'role'` literal. O **primeiro** comando do procedimento falha. Tirando o bloco `DO` (arnês meu, só para medir o resto; papel pré-criado à mão):
```
$ psql … -v ON_ERROR_STOP=1 -v role=erp_runtime -v password=senha-x -v migrator=postgres -f $S/role-sem-do.sql
ALTER ROLE
ERROR:  syntax error at or near ":"
LINE 1: GRANT CONNECT ON DATABASE :"db" TO "erp_runtime";
psql ec=3
```
`:"db"` é usado na l.397 mas **não** está na lista `-v role=… -v password=… -v migrator=…` da l.386 nem nas entradas por ambiente (l.383-385). Com `-v db=critico_i3` o resto roda (`ec=0`). O §0.2 (l.81) afirma "**Toda premissa de banco deste plano está MEDIDA** sob um papel `NOSUPERUSER NOBYPASSRLS` real"; o SQL do procedimento — que o §11 manda o dono executar em produção — nunca foi executado (o P-l mediu só o `ALTER DEFAULT PRIVILEGES` isolado). Veredito parcial: achado **F6**.

**3.2 — idempotência e "corrige papel pré-existente com `BYPASSRLS`": atributo sim, pertença não; e a auto-verificação não consegue falhar.**
```
# 2ª × 3ª execução (com o arnês de 3.1): pg_roles, pg_default_acl e pg_auth_members idênticos
role|erp_runtime|f|f|f|f|t|f · defacl|postgres|r|{erp_runtime=arwd/postgres} · defacl|postgres|S|{erp_runtime=rU/postgres} · members|0   → IDEMPOTENTE
# papel pré-existente: ALTER ROLE erp_runtime SUPERUSER BYPASSRLS; GRANT c2_bypass TO erp_runtime; dono de t_own (FORCE)
$ psql … -v ON_ERROR_STOP=1 … -f $S/role-sem-do.sql ; echo ec=$?
 erp_runtime | f | f | t | 1          (rolsuper, rolbypassrls, escapa, tabelas_force_de_posse)
psql ec=0
```
Atributos corrigidos (`f|f`). Mas: (i) a pertença a `c2_bypass` **continua** (`escapa = t`) — o procedimento não revoga pertença; (ii) com `escapa = t` **e** posse `= 1`, o `psql` sai **0**: a "auto-verificação" do §4.1 é um `SELECT`, e um `SELECT` que devolve `t` não é erro para `ON_ERROR_STOP`. O §4.1 ("o script sai com erro se o papel escapar") e o §11 passo 2 ("Qualquer `t`, ou posse `> 0`, e ele sai com erro — não siga para o Ato 2") descrevem um mecanismo que o SQL prescrito não tem. (O §11 também diz que ele imprime `erp_runtime|f|f|f|0`; sem `-At` o `psql` imprime tabela.) T14 como descrito ("auto-verificação sai ≠0 se `escapa`") ficaria vermelho contra este SQL — logo o teste existe para a metade `escapa`; **não** existe critério para a pertença não revogada (A14 só fala de atributo). Veredito parcial: achado **F7**.

**3.3 — migrador NÃO-superusuário (a forma do banco gerenciado): o `ALTER ROLE` é recusado mesmo sem mudar nada.**
```
$ psql -U postgres … -c "CREATE ROLE c3_mig LOGIN CREATEROLE NOSUPERUSER NOBYPASSRLS" …
$ psql -U c3_mig -d critico_i3 -c "CREATE ROLE erp_rt2 LOGIN PASSWORD 'x'"        → ok (CREATE ROLE permitido)
$ psql -U c3_mig … -v ON_ERROR_STOP=1 -v role=erp_rt2 … -v migrator=c3_mig -v db=critico_i3 -f $S/role-sem-do.sql
ERROR:  permission denied to alter role
DETAIL:  Only roles with the SUPERUSER attribute may change the SUPERUSER attribute.        psql ec=3
# isolando: NOCREATEDB → "Only roles with the CREATEDB attribute…"; NOBYPASSRLS → "Only roles with the BYPASSRLS attribute…"
```
O PG16 recusa **nomear** `NOSUPERUSER`/`NOCREATEDB`/`NOBYPASSRLS` para quem não tem o atributo, mesmo quando o valor já é o pedido. O §11 passo 3 só prevê "`CREATE ROLE` recusado"; aqui o `CREATE ROLE` passa e o procedimento morre na linha seguinte, deixando um papel com `LOGIN PASSWORD` e sem grants. Provedor: `docs/deployment.md:189` nomeia **Fly.io Postgres gerenciado** (fallback AWS RDS). **HIPÓTESE** (não medida — segredo do dono): o migrador de produção não é superusuário. Fontes web (a busca devolveu; `fly.io`/`community.fly.io` estão bloqueados pelo proxy de saída, então só os resumos): no Managed Postgres do Fly o admin é `fly-user` com papel "Schema Admin", "o mais próximo de superusuário" (https://fly.io/docs/mpg/cluster-configuration/ ; https://community.fly.io/t/managed-postgres-can-the-admin-user-have-createrole-and-bypassrls-no-superuser/28697); no RDS o usuário mestre é membro de `rds_superuser`, que **não** é superusuário (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Roles.rds_superuser.html). Comando que mede: `psql "$PROD_DATABASE_URL" -Atc "SELECT rolsuper, rolcreaterole, rolcreatedb, rolbypassrls FROM pg_roles WHERE rolname = current_user"`. Veredito parcial: achado **F8**.

**3.4 — `ALTER DEFAULT PRIVILEGES` cobre só (tabela criada pelo migrador NOMEADO) ∧ (mesmo banco).**
```
tabela        | criada por | banco      | erp_runtime DML + USAGE na sequência?
t_by_postgres | postgres   | critico_i3 | t
t_by_c3mig    | c3_mig     | critico_i3 | f
t_other_db    | postgres   | critico_i2 | f      (default privileges foram definidos em critico_i3)
```
Veredito parcial: P-l se confirma **e** mostra dois limites que o plano não enuncia: tabela criada por outro papel (ex.: um `db:provision-rbac`/seed que crie tabela sob outra credencial) fica sem grant (R2 só cobre "migrador"), e o procedimento precisa estar conectado **ao banco da aplicação** — o que leva a 3.5.

**3.5 — o `docker-entrypoint` do `postgres:16` (fonte oficial, `docker-library/postgres` `16/bookworm/docker-entrypoint.sh`, 389 linhas, md5 `c416efc410e681254f4733ca159eea5a`, baixado agora).**
- l.180-188: `*.sh` **executável** → executado; senão → **sourced** (`. "$f"`) no shell do entrypoint (`set -Eeo pipefail`, l.2).
- `git ls-files -s -- 'scripts/*.sh'` → **os três** `.sh` do repo (`post-merge-cleanup`, `rbac-provision-drill`, `restore-drill`) são `100644`. O "padrão da casa" que o §4.1 manda seguir produz arquivo **sem** bit de execução ⇒ **sourced é o caminho padrão**, não o caso de borda "checkout Windows" do R7. O modelo citado (`rbac-provision-drill.sh`) usa `trap … EXIT` (l.43) e `exit 1` (l.48); sourced, um `exit` mata o entrypoint antes de `docker_temp_server_stop`.
- Variáveis: `POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB` são **exportadas** por `file_env` (l.23, l.238); `PGPASSWORD` exportada (l.359); `PGUSER` só inline para `pg_ctl` (l.302, **não** exportada); `PGHOST`/`PGDATABASE` **não** definidas; servidor temporário só em socket (`listen_addresses=''`, l.297). Logo um `psql` que dependa das "variáveis padrão `PG*`" (l.385 do plano) conecta como o usuário do SO ao banco **`postgres`**, não a `erp_techsolutions` — e (3.4) grants e default privileges ficariam no banco errado. O §4.1 lista as duas formas de conexão sem dizer como o script escolhe.
- **HIPÓTESE** (sem daemon docker aqui): o compose sobe com o papel certo no banco certo. Comando: `docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml up -d postgres && docker compose -f docker-compose.prod.yml logs postgres | grep -E 'running|sourcing' && docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d erp_techsolutions -Atc "SELECT defaclrole::regrole, defaclobjtype FROM pg_default_acl"` → esperado uma linha `postgres|r` e uma `postgres|S` **em `erp_techsolutions`**. É o H1 do plano, com o banco explicitado.
Veredito parcial: **nota** (N3: sourced é o padrão da casa) + o risco de banco errado fica como hipótese que o job `docker` mede.

## Item 4 — Trava de boot × `env.ts`, pontos de entrada, H6/paridade

**4.1 — o default `production → enforce` quebra algum teste/job que suba o servidor sob superusuário?** Não achei.
```
$ grep -rln -E "server\.(js|ts)['\"]|dist/server|src/server" tests scripts   → tests/job-worker-bootstrap.test.ts (só comentário/histórico; testa startJobWorkerIfEnabled por injeção)
$ grep -rn 'NODE_ENV.*production' tests/*.ts (fora das suítes de gate) → authority-env, env-geocoding (envSchema.safeParse), checklist-routes:306 e platform-routes:94 (setam process.env DEPOIS do import de env) , seed-guard (função pura)
```
Nenhum chama `main()`. O único processo que chama `main()` sob `NODE_ENV=production` é o `api` do compose local-prod (job `docker`, `ci.yml:472-477`) — que o plano troca para `erp_runtime`. Veredito parcial: **premissa se sustenta** (por varredura; não há como rodar o compose aqui).

**4.2 — outro ponto de entrada de produção que fale ao banco sem passar por `main()`?** Não achei.
`Dockerfile:48` `CMD ["node", "dist/server.js"]` (único); `fly.production.toml`/`fly.staging.toml` sem `release_command` nem `[processes]`; worker de jobs e portal são in-process (`server.ts:19,36`; `env.ts` G3 diz "não existe entrypoint dedicado além de src/server.ts"); `migrate`/`db:provision-rbac`/`db:seed:demo`/backup rodam na pipeline com `PROD_DATABASE_URL`/`STAGING_DATABASE_URL` (`deploy-production.yml:136-164`, `deploy-staging.yml:44-52`, `backup-database.yml:54`) — o migrador, não o app. Veredito parcial: **premissa se sustenta**.

**4.3 — H5: recusada a trava, o processo morre?** Reproduzi o grafo de import de `src/server.ts` (`$S/boot-exit.ts`: importa `app`, `portal-app`, `env`, `job-worker.bootstrap`, `core-saas/index`, abre o client de `src/database/prisma.ts`, roda a consulta da trava como `postgres`, `$disconnect`, lança; `.catch` põe `exitCode=1`):
```
CORE_SAAS_PERSISTENCE=memory → catch t+2779ms · EXIT code 1 t+3092ms
CORE_SAAS_PERSISTENCE=prisma → catch t+1503ms · EXIT code 1 t+1691ms
MUTANTE A4 (sem $disconnect) → catch t+1519ms · EXIT code 1 t+11526ms       (não pendura: o pool pg fecha ocioso em ~10 s)
```
Veredito parcial: H5 **se sustenta** localmente. A justificativa do §2.2 ("senão o pool segura o event loop e o processo não morre") é **falsa** — morre ~10 s depois; o mutante de A4 só é pego pelo espião do T4 (`chama $disconnect`), não por "o processo/loop encerra" (A4 aponta T9, cuja descrição no §8 é só de campos de log). **Nota** N4.

**4.4 — H6 e A6: a chave opcional não entra em `deriveRequiredInProduction()`.**
```
$ node --test --import tsx tests/deploy-manifest-parity.test.ts   (head)                         → # tests 28 # pass 28
$ grep -c -E '^\s*test\(' tests/deploy-manifest-parity.test.ts                                   → 22
# simulação temporária em env.ts (revertida, cmp = original, git status vazio):
(a) + DATABASE_RUNTIME_ROLE_GUARD: z.enum(["enforce","skip"]).optional()  → # tests 28 # pass 28
(b) MUTAÇÃO A6: mesma chave SEM .optional()                              → ZodError no import de env.ts ("DATABASE_RUNTIME_ROLE_GUARD") · not ok (arquivo inteiro)
```
`deriveRequiredInProduction()` (l.274-287) só itera as chaves **de `PROD_BASELINE`** — uma chave nova nunca é examinada. H6 **se sustenta** na substância. Mas: (i) "22/22" (H6 e A6) é **contagem de `grep test(`, não de execução**: executado no head dá **28/28**; a junta que rodar A6 "22/22" encontrará 28 — **ajuste** F10; (ii) a mutação de A6 fica vermelha, mas **não** pelo mecanismo escrito ("a lista derivada passa a exigi-la e o compose não a tem"): fica vermelha porque `envSchema.parse(process.env)` explode no import. Mesma nota para `production-runtime-gates.test.ts` (grep 30 × executados **63**).

**4.5 — a fiação de PRODUÇÃO da trava não é observável por nenhum critério.**
O item 9 só existe em produção por duas coisas: a linha nova em `main()` e o default `production → "enforce"` no **export** `env` (não no schema — §2.2 "espelhando `EVIDENCE_SCANNER` (l.631-638)"). Medi o precedente citado com a mutação que A5 diz pegar:
```
# mutação temporária (revertida; cmp = original): env.ts l.638  production ? "unavailable" : "noop"  →  production ? "noop" : "noop"
$ node --test --import tsx tests/o6r07b-scanner-failclosed.test.ts tests/production-runtime-gates.test.ts tests/deploy-manifest-parity.test.ts
# tests 104 # pass 104 # fail 0            (base: 104/104)
$ grep -rl EVIDENCE_SCANNER tests  → só tests/o6r07b-scanner-failclosed.test.ts → 13/13 verde sob o mutante
```
O teste do precedente (`o6r07b…:54-56`) **reescreve a regra dentro do teste** (`const resolved = result.data.NODE_ENV === "production" ? "unavailable" : "noop"`) em vez de ler o export — reconhece a forma, não enuncia a propriedade. O T2 do plano ("`production` sem a chave → aceito, export = `enforce`") mora em `production-runtime-gates.test.ts`, cujo único acesso ao export é `await import("../src/config/env.js")` (l.282) — avaliado sob o `NODE_ENV` do processo de teste, nunca `production`. Consequências, por mecanismo:
- **Mutação "default de produção → `skip`"** (listada em A5 como pega por T1–T3): T1–T3 são `envSchema.safeParse` (o default não mora no schema); T4/T5 injetam `enforce` explicitamente; A13 (compose) sobe `api` como `erp_runtime`, que **passa** a trava — com ou sem trava ligada, o smoke fica verde. **Nenhum** critério fica vermelho.
- **Mutação "apagar a chamada em `main()`"**: idem — nenhum A1–A16 exercita `server.ts`; o próprio §2.2 diz que "uma trava de boot que ninguém chama antes do `listen` é trava no nome".
Veredito parcial: achado **F9**.

**4.6 — citação que não sustenta o que o plano diz.** O §3 (l.373-374) apoia "o papel … é objeto de cluster e nunca entra em migração" em `deploy-production.yml:141`, "`migrate deploy` NÃO cria papel". Lido: a l.141 é "`migrate deploy` NÃO cria papel: nenhuma migração insere em **`roles`**" — fala de **linhas da tabela RBAC `roles`**, não de papel PostgreSQL. **Nota** N5. E `fly.staging.toml:5` diz "Postgres gerenciado (**Fly MPG**) de staging" — reforça F8 (o Ato 1 de staging roda sob o admin do MPG).

## Item 5 — A1–A16 × T1–T14: a mutação que derruba cada critério existe?

Medições específicas deste item (além das dos itens 1–4):
```
# A1 — mutante: consulta da trava SEM "r.rolsuper" (WHERE r.rolbypassrls AND pg_has_role(...))
$ psql -U postgres -d critico_i2 -Atc "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='postgres'"   → postgres|t|t
mutante sob postgres  → RECUSA [c2_bypass…; postgres|t|t|t]
mutante sob c2_super2 → RECUSA [c2_bypass…; postgres|t|t|f]      (superusuário é "membro" de todo papel; o bootstrap tem BYPASSRLS)
mutante sob c2_clean  → PASSA
# A2 — mutante literal "WHERE rolname = 'postgres'": postgres RECUSA · c2_super2 RECUSA · c2_clean RECUSA
#      variante por nome "…AND current_user = 'postgres'": postgres RECUSA · c2_super2 PASSA · c2_clean PASSA
# reuso do client após $disconnect (PrismaPg): "reuso após $disconnect: OK 2"  (T5/T6 podem compartilhar client)
# T13 — gerador verbatim numa cópia FORA da árvore do repo ($SP/t13-XXXX, sem node_modules acima):
Error: Cannot find module 'typescript'        ec=1        (createRequire(<alvo>/package.json), l.766-767)
$ grep -n -E 'tmp|mkdtemp|cp\(|copy|spawn|execFile' tests/db-catalog-write-guard.test.ts   → (vazio: o precedente não usa diretório temporário)
# A7/A8 — semente do Apêndice B: occurred_at = day para os 5 eventos (l.1136); date = 2026-09-15 para os 2 agregados (l.1138)
$ node -e '…concatenação A,A,A,B,B com o mesmo occurredAt…'  → "sem reordenar (mutante) passa na asserção de ordem? true"
```

| A | Mutação declarada no plano | Existe (algum teste proposto fica vermelho)? | Evidência |
|---|---|---|---|
| A1 | apagar `r.rolsuper` | **NÃO** — T6 (postgres) e T7 (super renomeado) continuam RECUSA | acima; mutante equivalente em qualquer cluster cujo bootstrap tenha `BYPASSRLS` (padrão do `initdb`) → **F11** |
| A2 | "trocar por `WHERE rolname = 'postgres'`" | sim, mas pelo **T5/G2** (papel limpo passa a ser recusado), não pelo T7 | acima → N6 |
| A3 | consulta ingênua | **sim** (T8) | item 2: ingênua `f|f` para todo membro; trava RECUSA |
| A4 | remover `$disconnect`; logar a URL | sim — `$disconnect` pelo **espião do T4** (não pelo T9: o processo sai mesmo assim, 11,5 s); URL pelo T9 se ele varrer os dois caminhos de log | item 4.3 → N4 |
| A5 | default de produção → `skip` | **NÃO** | item 4.5 → **F9** |
| A5 | apagar o gate do `superRefine` / aceitar 3º valor | sim (T1 / T3) | mecanismo: `envSchema.safeParse` |
| A6 | chave obrigatória | sim, mas por explosão do import (`ZodError`), não pela lista derivada; e o número é 28, não 22 | item 4.4 → **F10** |
| A7 | remover `setTenantRlsContext` do laço | sim (soma 0 ≠ 5; e o canário) | R1 do §0.5 |
| A7/A8 | remover a reordenação | **NÃO** com a semente do Apêndice B (todos os `occurredAt`/`date` iguais ⇒ a concatenação já "está ordenada") | acima → **F12** |
| A9 | "idem A7" | sim, se o teste rodar de fato sob o papel efêmero; **sem** vermelho-controle exigido | N6 |
| A10 | apagar `deleteMany`; duas transações | sim — B7/B8 do precedente, com proxy que atravessa `$transaction` (`o6r06-allocation-basis-rls-db.test.ts:600-660`) | lido |
| A11 | remover o canário | sim — mesmo proxy (B9/B11 do precedente, l.229-240, 359-370) | lido |
| A12 | sítio cru inserido | **impossível** de ficar verde no head (sítio 7) e **cego** a 16/17 formas | item 1 → **F1**, **F2**, **F14** |
| A13 | `api.DATABASE_URL` → `postgres` | sim, **se** a trava estiver fiada; as mutações de fiação passam no mesmo smoke | item 4.5 → F9 |
| A14 | omitir `NOBYPASSRLS` | sim (T14, com `psql`; runner `ubuntu-24.04` traz psql — HIPÓTESE, fonte https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md). O fallback "o mesmo SQL pelo Prisma cru" (§8 T14) é inexequível: `:'role'`/`:"db"` são sintaxe do `psql` | item 3 → F6, F7 |
| A15 | — (documental) | sem mutação | → N7 |
| A16 | — | sem mutação (existe uma: "fechar `P-INFRA-RLS` no PR" — mas não está escrita) | → N7 |

Veredito parcial: **A1, A5 (default), A7/A8 (ordem), A12 não têm mutação que os derrube** pelo mecanismo proposto; A13 só pega a mutação que ele nomeia. T12 com "vermelho-controle no head-base" (C3 item 2) fica vermelho por **motivo errado**: `RlsPrismaCloudChargeRepository` não existe em `origin/main` (import falha), então o controle não prova a propriedade (N6).

## Item 6 — Outras premissas (contagens, linhas, P-a…P-p, §6×§5, §9)

```
P-a  $ git grep -n -i -E 'rolbypassrls|rolsuper|BYPASSRLS' origin/main -- src | wc -l   → 8 linhas (10 ocorrências); 7 comentários + 1 executável (login-readiness.ts:202)
     plano: "12 linhas: 10 comentários; 2 executáveis (202-204)"                         → número não reproduz; conclusão (nada impõe a postura) se sustenta
P-f  $ psql … "SELECT string_agg(relname…) … NOT relforcerowsecurity"
     _prisma_migrations, cloud_charge_calculation_runs, cloud_charge_rules, cloud_cost_allocation_runs, cloud_cost_imports, cloud_cost_line_items, permissions, role_permissions, tenants
     (o plano lista 6 + "…"; faltam permissions, role_permissions — sem efeito no remédio)
P-k  reproduz (hits = nomes de job impound.notify-due e a coluna `SET role = …`); setval/nextval = 0
P-m  $ laço sobre refs/remotes/origin × fronteira do bloco  → nenhum ramo toca os arquivos (reproduz)
P-n  catálogo 13 · DDL 8   (reproduz)
P-p  raiz = f4ef511 (reproduz)
§8   287 tests/*.test.ts · 33 -db (reproduz) · o6r06-usage-atomic-db 15/15 · o6r06-allocation-basis-rls-db 10/10 no meu cluster
     baseline N = 4 omite tests/rls-tenant-isolation.test.ts, que grava/lê cloud_usage_events, cloud_usage_daily_aggregates,
     tenant_cloud_cost_allocations e tenant_cloud_charges (l.434-519, 836-921) sob papel NOSUPERUSER criado na l.44
§9   Kpis/kpis-latest.json @ origin/main: blocks_completed 168 · backend_tests 3052/3054 · mvp_demo 99 · mvp_vendavel 88 (reproduz); Kpis/kpis-history.md existe
§6×§5 todos os arquivos do §5 cabem no PERMITIDO; agent-orchestration/controle/pendencias-indice.md existe
§2.2 CloudChargeService depende do TIPO CloudChargeRepository (cloud-charge.service.ts:35; cloud-charge.repository.ts:21-38) — reproduz
CE-G2 platform-permissions.ts:15, platform.routes.ts:45, cloud-usage.routes.ts:12-17 — reproduzem; setTenantRlsContext usa set_config(…, true) (rls.ts:26)
Blind spots × estado de HOJE: gerador com `updateManyAndReturn` no OPS → L1 710 (+68), L2b idêntico (7) ; linhas SOB-CONTEXTO com receptor raiz = 0 ;
     instanciações cruas de classes Prisma* fora do L2 (authority-*, portal-*, financial-period-close…) → todos os acessos FORCE delas estão sob withTenantRls/$transaction+setter.
     ⇒ os pontos cegos do gerador (F2–F4) não escondem vazamento EXISTENTE; eles tornam o guard (A12) incapaz de pegar REGRESSÃO.
```
Veredito parcial: premissas numéricas quase todas reproduzem; P-a e o baseline N têm números errados (**nota** N8).

**6.2 — a trava julga `current_user`; o escape por `SET ROLE` é decidido por `session_user`.**
```
$ PGOPTIONS='-c role=c2_clean' psql -U postgres -d critico_i2
identidade|postgres|c2_clean          (session_user | current_user)
trava|0                               → PASSA
linhas sem GUC|0
SET ROLE NONE;  → apos SET ROLE NONE|postgres|postgres|3     (3 linhas de t_force sem GUC)
# pelo caminho do APP (PrismaClient + PrismaPg, URL …/critico_i2?options=-c%20role%3Dc2_clean), $S/options-url.mts:
URL com options=-c role=c2_clean → {"s":"postgres","c":"c2_clean"} | trava: PASSA
mesma conexão, SET LOCAL ROLE NONE → {"c":"postgres","n":3}
```
Uma `DATABASE_URL` cujo **login** é superusuário, com `options=-c role=<papel limpo>`, sobe com a trava verde e escapa de RLS com um comando. O §2.1(a) formaliza a propriedade sobre `current_user`; quem decide se a sessão pode `SET ROLE` (inclusive `SET ROLE NONE`) é `session_user`. O §11 passo 5 ("A trava é a prova: o app sobe ⇒ o papel não escapa de RLS") fica falso nessa configuração — e ela é exatamente a "solução" tentadora para um provedor que só entrega um usuário admin (F8). Nenhum A/T a cobre. Veredito parcial: achado **F13**.

**6.3 — precedente cego (pré-existente).** O teste que o E2 manda espelhar (`tests/o6r07b-scanner-failclosed.test.ts` M-B7.1, l.49-57) não prende o default do export (item 4.5: mutante 13/13 verde). Origem: `git log --diff-filter=A … -- tests/o6r07b-scanner-failclosed.test.ts` → `fe2748c 2026-09-06` (#380, B-O6R-07b); o default no `env.ts` nasce no mesmo commit. **Pré-existente** → P1 (não reprova este bloco; o dono é o B-O6R-07b/segurança).

---

## Tabela de achados

Escopo: todos os `dentro-do-bloco` são defeitos **deste plano** (critério, SQL, gerador, formalização ou teste que ele escreve); nenhum é classe anterior que o bloco herdou. O único `pre-existente` tem origem datada.

| id | gravidade | escopo (+ evidência) | seção/critério afetado | defeito, em uma linha |
|---|---|---|---|---|
| F1 | **bloqueia** | dentro-do-bloco | A12, T13, C3(1), §0.4 sítio 7, §6 | "L2b = ∅" é impossível: com o remédio prescrito e `cloud-cost-allocation/**` PROIBIDO, o gerador verbatim continua listando `cloud-cost-allocation-prisma.repository.ts:238` (item 1.3) |
| F2 | **bloqueia** | dentro-do-bloco | A12, T13, R9, "default negar" | o guard (L2b ∧ L1 `CRU`=0) fica verde para 16 de 17 sítios crus reais (alias, desestruturação, índice, `$transaction` sem setter, client raiz dentro do callback, `new` como argumento, subclasse, função livre, SQL em constante, campo arrow, fábrica com parâmetro `tx`, getter, membro não previsto, helper `tx`, objeto literal, `updateManyAndReturn`); só a mutação citada pelo plano fica vermelha (item 1.4) |
| F3 | ajuste | dentro-do-bloco | Apêndice A l.858, residual (i) do §0.4 | `classify` converte `$transaction-SEM-setter` em `SOB-CONTEXTO`; "hoje zero casos" é falso (`work-order-prisma.repository.ts:541`) (item 1.5a) |
| F4 | ajuste | dentro-do-bloco | Apêndice A `OPS`, §0.4 "L1 = 642" | `updateManyAndReturn` fora do `OPS`: 68 acessos FORCE invisíveis; L1 real ≥ 710 (item 1.5b, item 6) |
| F5 | **bloqueia** | dentro-do-bloco | §1 objetivo (9), §2.1(a) "exatamente", §2.2 sonda de posse, §4.1 auto-verificação, §11 passo 2, H3 | papel membro do papel DONO (não-super, sem BYPASSRLS) passa na trava, a sonda de posse diz 0, e ele lê tudo sem GUC após `ALTER TABLE … NO FORCE ROW LEVEL SECURITY` (item 2.2) |
| F6 | **bloqueia** | dentro-do-bloco | §4.1 (SQL do procedimento), E4, §11 Ato 1, §0.2 "toda premissa de banco MEDIDA" | o SQL não roda: `psql` não interpola `:'role'` dentro de `DO $$…$$` (erro no 1º comando) e `:"db"` não está entre as variáveis declaradas (item 3.1) |
| F7 | ajuste | dentro-do-bloco | §4.1 "sai com erro", §11 passo 2, A14 | a auto-verificação é um `SELECT`: com `escapa=t` e posse `=1` o `psql` sai 0; a pertença a papel `BYPASSRLS` de um papel pré-existente não é revogada e nenhum critério a cobre (item 3.2) |
| F8 | ajuste | dentro-do-bloco (procedimento); provedor = HIPÓTESE | §11 Ato 1 passos 2–3, E4 "serve ao banco gerenciado" | com migrador `NOSUPERUSER CREATEROLE` (forma do gerenciado; staging = Fly MPG, `fly.staging.toml:5`) o `CREATE ROLE` passa e o `ALTER ROLE … NOSUPERUSER NOCREATEDB … NOBYPASSRLS` é recusado mesmo sem mudar nada; o §11 só prevê `CREATE ROLE` recusado (item 3.3) |
| F9 | **bloqueia** | dentro-do-bloco | A5, A13, T2, E1 (`server.ts`), E2 (default no export) | a fiação de produção da trava não tem critério: "default de produção → `skip`" e "apagar a chamada em `main()`" deixam T1–T14 e o smoke verdes; o precedente que o E2 manda espelhar é cego à mesma mutação (104/104 verde sob o mutante) (item 4.5) |
| F10 | ajuste | dentro-do-bloco | H6, A6 | "22/22" é `grep test(`; executado no head: 28/28. A mutação de A6 fica vermelha por `ZodError` no import, não pela lista derivada (item 4.4) |
| F11 | ajuste | dentro-do-bloco | A1, T6, T7 | a mutação de A1 (apagar `r.rolsuper`) não deixa T6 nem T7 vermelhos: o bootstrap `postgres` tem `BYPASSRLS` e superusuário é membro de todo papel (item 5) |
| F12 | ajuste | dentro-do-bloco | A7, A8, T10, Apêndice B (semente) | "remover a reordenação" não tem dado que a mate: a semente usa o mesmo `occurred_at`/`date` para todas as linhas (item 5) |
| F13 | **bloqueia** | dentro-do-bloco | §2.1(a), §2.2 `RUNTIME_ROLE_GUARD_SQL`, §11 passo 5 "a trava é a prova", A1–A4 | a trava julga `current_user`; login superusuário com `options=-c role=<limpo>` na URL passa a trava e escapa com `SET ROLE NONE` na mesma conexão (medido pelo PrismaPg) (item 6.2) |
| F14 | ajuste | dentro-do-bloco | T13 ("mutação num diretório temporário"), E6 | o gerador verbatim resolve `typescript` a partir do alvo: numa cópia fora da árvore do repo ele morre com `Cannot find module 'typescript'`; o precedente citado (`db-catalog-write-guard`) não usa diretório temporário (item 5) |
| N1 | nota | dentro-do-bloco | §4.2 | falso positivo seguro: `GRANT … WITH INHERIT FALSE, SET FALSE` (PG16) é recusado sem poder `SET ROLE` |
| N2 | nota | dentro-do-bloco | Apêndice B | `const REPO = "/home/user/ERP_Techsolutios"` cravado; lá não há `node_modules` nesta máquina — o verbatim não reproduz sem editar |
| N3 | nota | dentro-do-bloco | §4.1, R7 | os três `.sh` do repo são `100644`: "sourced" é o caminho padrão do entrypoint, não borda; o modelo citado usa `trap … EXIT`/`exit 1` |
| N4 | nota | dentro-do-bloco | §2.2, A4, T9 | "sem `$disconnect` o processo não morre" é falso (morre em ~11,5 s); a mutação de A4 é pega pelo espião do T4, não pelo T9 |
| N5 | nota | dentro-do-bloco | §3 | `deploy-production.yml:141` fala de linhas da tabela RBAC `roles`, não de papel PostgreSQL |
| N6 | nota | dentro-do-bloco | A2, A9/T11, T12, C3(2) | A2 literal é pego pelo T5, não pelo T7; A9/T11 sem vermelho-controle; o vermelho-controle de T12 no head-base é falha de import (`RlsPrismaCloudChargeRepository` não existe), não a propriedade |
| N7 | nota | dentro-do-bloco | A15, A16 | critérios sem mutação escrita |
| N8 | nota | dentro-do-bloco | P-a, P-f, §8 N | P-a mede 8 linhas/1 executável (não 12/2); P-f omite `permissions`, `role_permissions`; N = 4 omite `rls-tenant-isolation.test.ts` (mesmas tabelas, papel NOSUPERUSER) |
| P1 | ajuste | **pre-existente** — `tests/o6r07b-scanner-failclosed.test.ts` e o default `EVIDENCE_SCANNER` nascem em `fe2748c` (2026-09-06, #380, B-O6R-07b) | M-B7.1 (fora deste bloco) | o teste do default do scanner reescreve a regra em vez de ler o export: o mutante "produção → noop" fica 13/13 verde. Vira pendência com dono B-O6R-07b; não reprova este bloco |

**Contagem:** `bloqueia` 6 (F1, F2, F5, F6, F9, F13) · `ajuste` 9 (F3, F4, F7, F8, F10, F11, F12, F14, P1) · `nota` 8 (N1–N8). Dentro do bloco: 22; pré-existente: 1.

**O que se sustentou (medido, não herdado):** o gerador reproduz byte a byte a saída do plano e os 7 sítios conferem; o Apêndice B reproduz 22/22 no meu cluster; a trava recusa superusuário, super renomeado e pertença a `BYPASSRLS` (direta, `NOINHERIT`, cadeia de 2 níveis); a consulta ingênua do §5.2 é cega à pertença; `ALTER DEFAULT PRIVILEGES` cobre as tabelas futuras do migrador nomeado; o default `production → enforce` não quebra teste existente; não há outro ponto de entrada de produção fora de `main()`; o processo sai com código 1 após a recusa; P-k, P-m, P-n, P-p e §8/§9 reproduzem.

**Limpeza (provada):** bancos `critico_i2` e `critico_i3` derrubados; 16 papéis `c2_*`, `c3_mig`, `erp_runtime`, `erp_rt2` derrubados → papéis não-sistema no cluster = `postgres`; bancos = `erp_critico, postgres, template0, template1`; `erp_critico`: 115 tabelas, 106 FORCE, `pg_default_acl` = 0, `tenants` = 0, `cloud_usage_events` = 0; papéis `san3_05%` = 0. Edições temporárias em `src/config/env.ts` revertidas (`cmp` = original; `git status --short` = 0 linhas). Scratch: cópias do repo removidas (844K restantes, só scripts e saídas).

## Veredito

**VOLTA AO PLANO.** Seis `bloqueia` dentro do bloco:

1. **F1** — A12/T13/C3(1) exigem "L2b = ∅" e o próprio escopo do plano torna isso impossível (sítio 7 em arquivo PROIBIDO).
2. **F2** — o guard gerado não enuncia a propriedade: 16 de 17 sítios crus reais ficam verdes; "default negar" é falso.
3. **F5** — "não escapa de RLS" ≠ a consulta da trava: pertença ao papel dono escapa, e a sonda de posse, o script e o go/no-go do §11 medem o nome do dono, não o poder de agir como dono.
4. **F6** — o SQL do procedimento que o dono vai rodar em produção não executa como está escrito, e o plano afirma ter medido toda premissa de banco.
5. **F9** — a fiação de produção da trava (chamada em `main()` + default do export) não tem critério que a prenda; a mutação que A5 diz pegar passa.
6. **F13** — a trava julga `current_user`; um login superusuário com `options=-c role=…` passa e escapa com `SET ROLE NONE`.

Pela regra de papéis (§C7.4-bis), o conserto é de **quem planeja**, não deste crítico: aqui estão o defeito, a evidência executada e o motivo.
