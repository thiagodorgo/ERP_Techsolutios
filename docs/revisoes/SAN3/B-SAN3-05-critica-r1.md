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

EM APURAÇÃO

## Item 5 — A1–A16 × T1–T14: a mutação que derruba cada critério existe?

EM APURAÇÃO

## Item 6 — Outras premissas (contagens, linhas, P-a…P-p, §6×§5, §9)

EM APURAÇÃO

---

## Tabela de achados

EM APURAÇÃO

## Veredito

EM APURAÇÃO
