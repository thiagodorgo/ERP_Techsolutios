# B-SAN3-05 — PLANO v2 — o papel de runtime não escapa de RLS (itens 9 e 10 do §4.1) — ciclo 1, replanejado após a crítica r1

> **Papel:** `planejador-mestre` (identidade nova, sessão na nuvem) · **modelo:** Fable 5.1 (`claude-fable-5-1`, o
> fixado no frontmatter — sem fallback) · **medido em:** `origin/main` = `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c`
> (resolvido por `git rev-parse origin/main` em 2026-09-30; a árvore da sessão está nesse SHA, `git status` vazio) ·
> **ramo deste plano:** `docs/plano-b-san3-05`, criado desse SHA · **bloco:** `B-SAN3-05` ·
> **branch da entrega:** `fix/runtime-role-sem-bypass` (§5.2 do `PLANO_SAN3.md`).
>
> **v2 (esta revisão):** `planejador-mestre` (instância NOVA desta sessão — não achou nem desenvolve; §C7.4-bis) ·
> **modelo em que roda de fato:** Fable 5.1 (`claude-fable-5-1`), o fixado no frontmatter — **sem fallback** (§C7.6: replanejamento
> após crítica, Fable obrigatório) · corpo `.claude/agents/planejador-mestre.md` @ `origin/main@3b1fe0f9`, md5 EOL-neutro
> `4c912f69a93f07b14d8fd1c49539c778` (conferido por mim) · **responde a** `docs/revisoes/SAN3/B-SAN3-05-critica-r1.md`
> (`critico-b-san3-05`, head `c7d1e95d62102b267f1636ce1ed715578d2242ae`) · **v1 recuperável em** `c3f57e9` · **máquina:**
> `uname -a` = `Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux`; `PATH=/opt/node20/bin:$PATH node -v`
> = `v20.20.2` (o do CI); Postgres 16.13 descartável `127.0.0.1:54353`, banco `erp_plano` (115 tabelas, 106 FORCE, medido ao abrir).
> Tudo o que a v2 afirma de novo foi **medido aqui**, na seção "Resposta à crítica r1"; o que a v1 afirmava e a crítica
> **reproduziu** (gerador byte a byte, Apêndice B 22/22, trava G1–G4, P-k/P-m/P-n/P-p) fica como estava.
>
> **Fonte do bloco:** `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 itens 9 e 10, §4.2 (l.192, "Papel de banco da
> produção"), §5.2 (linha `B-SAN3-05`), §6 (l.366: trava de mesmo arquivo `SAN3-05 → SAN3-03` nos dois
> repositórios de nuvem, e `SAN3-05 → AV-REAL` em `src/config/env.ts`), §5.6 (CE-G1, CE-G2). Pendências:
> `P-INFRA-RLS` (`pendencias.md:493`) e `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` (`pendencias.md:7426`).
>
> **Regra de leitura deste plano (§A7 do contrato):** toda afirmação abaixo diz onde foi medida. **MEDIDO** = comando
> + saída, nesta sessão, sobre `origin/main@3b1fe0f9` ou sobre um Postgres 16.13 descartável com as migrações
> dessa ref aplicadas. **HIPÓTESE** = não medido aqui, com o comando exato que a derruba (§0.6). Nenhum SHA foi
> digitado; nenhum número foi copiado de bloco anterior.

---

## Resposta à crítica r1 — todos os achados, um a um (medido aqui, no cluster `54353`)

> Regra desta seção: **cada achado tem uma linha**; a coluna "o que mudou" aponta a seção da v2; a coluna "evidência"
> é comando + saída **executados nesta sessão** (roteiro de re-execução: os scripts da crítica r1, re-rodados, não
> herdados); o estado é um de **incorporado** · **falsificado com medição** · **pendência nomeada**. `EM APURAÇÃO`
> é o esqueleto (P2): some quando o item é medido. Detalhe de cada medição em §R.1–§R.6 logo abaixo da tabela.

| id | gravidade | achado (resumo da r1) | o que mudou na v2 (seção) | evidência executada | estado |
|---|---|---|---|---|---|
| F1 | bloqueia | A12/T13/C3(1): "L2b = ∅" impossível com o sítio 7 em arquivo PROIBIDO | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F2 | bloqueia | guard gerado verde para 16/17 sítios crus reais; "default negar" falso | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F3 | ajuste | `classify` engole `$transaction-SEM-setter`; "hoje zero casos" é falso | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F4 | ajuste | `updateManyAndReturn` fora do `OPS`: 68 acessos FORCE invisíveis | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F5 | bloqueia | pertença ao papel DONO escapa (`ALTER TABLE … NO FORCE`); trava e sonda de posse dizem 0 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F6 | bloqueia | o SQL do procedimento não roda (`:'role'` em `DO $$`, `:"db"` não declarada) | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F7 | ajuste | auto-verificação é `SELECT` (sai 0 com `escapa=t`); pertença não revogada | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F8 | ajuste | migrador `NOSUPERUSER CREATEROLE`: `ALTER ROLE … NOSUPERUSER …` recusado | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F9 | bloqueia | fiação de produção da trava sem critério (default→`skip`; chamada em `main()` apagada) | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F10 | ajuste | "22/22" era `grep`; executado 28/28; mutação de A6 vermelha por `ZodError` | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F11 | ajuste | mutação de A1 (apagar `r.rolsuper`) não deixa T6/T7 vermelhos | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F12 | ajuste | semente com `occurred_at`/`date` iguais: "remover a reordenação" não fica vermelho | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F13 | bloqueia | trava julga `current_user`; login super + `options=-c role=<limpo>` passa e escapa com `SET ROLE NONE` | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| F14 | ajuste | gerador resolve `typescript` a partir do alvo; cópia fora da árvore morre | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N1 | nota | `GRANT … WITH SET FALSE` recusado sem poder `SET ROLE` (falso positivo seguro) | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N2 | nota | `REPO` cravado no Apêndice B | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N3 | nota | os três `.sh` do repo são `100644`: sourced é o caminho padrão do entrypoint | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N4 | nota | "sem `$disconnect` o processo não morre" é falso (~11,5 s); A4 é pega pelo espião do T4 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N5 | nota | `deploy-production.yml:141` fala da tabela RBAC `roles`, não de papel PostgreSQL | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N6 | nota | A2 pega por T5 não T7; A9/T11 sem vermelho-controle; T12 vermelho-controle por import | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N7 | nota | A15/A16 sem mutação escrita | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N8 | nota | P-a 8 linhas/1 executável; P-f omite `permissions`, `role_permissions`; N omite `rls-tenant-isolation` | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| P1 | ajuste (pre-existente) | teste do default do `EVIDENCE_SCANNER` reescreve a regra (mutante 13/13 verde) — `fe2748c` 2026-09-06 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |

### §R.0 — Roteiro de re-execução (o que re-rodei da crítica antes de decidir)

EM APURAÇÃO


---

## §0 — Terreno e LINHA DE BASE (medido por mim, comando + saída)

### 0.1 Referências — resolvidas, não digitadas

```
$ git fetch origin && git rev-parse origin/main
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
$ git rev-parse HEAD ; git merge-base HEAD origin/main
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
$ git log --oneline -3 origin/main
3b1fe0f docs(registro): votos, inspetor e porteiro do #394 versionados, e o backfill dele (#395)
b3f0af5 docs(governanca): D-SEM-TETO-AUDITORIA-NO-3 — sem teto de ciclos, auditoria da maquina no ciclo 3 (#394)
fc3363e chore(registro): corpo de agente novo para de nascer invisivel, e dois registros voltam a ser texto (B-SAN3-00)
```

`3b1fe0f9` é o esperado pelo mandato ("3b1fe0f9 ou descendente") — é ele mesmo, não um descendente.

### 0.2 A máquina de medição

```
$ uname -a
Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
$ node --version ; npm --version
v22.22.2
10.9.7
$ docker --version ; timeout 120 docker run --rm postgres:16 postgres --version
Docker version 29.3.1, build c2be9cc
failed to connect to the docker API at unix:///var/run/docker.sock; check if the path is correct and if the daemon is running: dial unix /var/run/docker.sock: connect: no such file or directory
(exit=1 — há CLIENTE docker, NÃO há daemon: nada de contêiner nesta máquina)
$ which psql pg_ctl postgres
/usr/bin/psql            (exit=1 — pg_ctl e postgres não estão no PATH…)
$ ls /usr/lib/postgresql/16/bin | tr '\n' ' '
… initdb pg_ctl pg_dump postgres psql …   (…mas o pacote postgresql-16 está instalado)
$ /usr/lib/postgresql/16/bin/postgres --version
postgres (PostgreSQL) 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
```

**Deu para subir Postgres 16 descartável — sem docker, com os binários do pacote**, como usuário `postgres`
(`initdb` recusa rodar como root), em `/var/lib/postgresql/erp_san3_05` (o scratchpad da sessão fica sob
`/tmp/claude-0`, `drwx------ root`, ilegível para o usuário `postgres`), porta **54329**, `listen_addresses=127.0.0.1`,
auth `trust` (cluster local e efêmero; nenhum segredo):

```
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/erp_san3_05/data -U postgres --auth=trust --no-instructions
initdb exit=0
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/erp_san3_05/data -o "-p 54329 -k /var/lib/postgresql/erp_san3_05 -c listen_addresses=127.0.0.1" -l /var/lib/postgresql/erp_san3_05/server.log -w start
server started
$ psql -h 127.0.0.1 -p 54329 -U postgres -d postgres -Atc "SELECT version(); SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='postgres';"
PostgreSQL 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1) on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0, 64-bit
postgres|t|t
$ npm ci --no-audit --no-fund   → exit=0 (222 pacotes em node_modules) ; DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate → client gerado
$ psql … -c "CREATE DATABASE erp_san3_05" && DATABASE_URL="postgresql://postgres@127.0.0.1:54329/erp_san3_05?schema=public" npx prisma migrate deploy
All migrations have been successfully applied.   (migrate exit=0)
$ psql … -d erp_san3_05 -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'; SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity; SELECT count(*) FROM pg_policies WHERE schemaname='public';"
115
106
107
```

**Toda premissa de banco deste plano está, portanto, MEDIDA sob um papel `NOSUPERUSER NOBYPASSRLS` real** (§0.5) —
a cláusula "se não der, marque como HIPÓTESE" do mandato não se aplica às premissas de banco; aplica-se ao que
depende de **docker** (o compose local-prod) e ao que depende de **produção** (o papel real do Fly) — §0.6.

### 0.3 As premissas do enunciado, uma a uma

| # | Premissa | Estado | Comando → saída |
|---|---|---|---|
| P-a | Nada no repositório impõe `NOSUPERUSER NOBYPASSRLS` ao papel de runtime (item 9) | **MEDIDO — verdadeira** | `git grep -n -i -E 'rolbypassrls\|rolsuper\|BYPASSRLS' origin/main -- src` → 12 linhas: 10 são comentários; as 2 executáveis são `src/modules/auth/services/login-readiness.ts:202-204` (a sonda do B-O6R-01 pergunta pelo **dono da função** `auth_login_candidates`, não pelo papel corrente, e "não derruba o boot", l.7-8). `src/server.ts` (48 linhas) não consulta o banco antes do `listen`. `src/config/env.ts` tem os gates G1, G2, G3, G5, G-EVIDENCE-SCANNER, G-EVIDENCE-SNIFFABLE (grep `NODE_ENV === "production"`, l.318-556) — nenhum sobre papel de banco. |
| P-b | O compose de subida/smoke conecta como `postgres` (`docker-compose.prod.yml:35,57`) | **MEDIDO — verdadeira** | `git show origin/main:docker-compose.prod.yml \| cat -n` → l.35 `DATABASE_URL: postgresql://postgres:postgres@postgres:5432/erp_techsolutions?schema=public` (serviço `migrate`); l.57 idem (serviço `api`, `NODE_ENV: production` na l.51). |
| P-c | Dev e CI rodam como `postgres` (superusuário) — o defeito do item 10 é invisível na suíte | **MEDIDO — verdadeira** | `.github/workflows/ci.yml:34,128` (`postgresql://postgres:postgres@localhost:5432/…`), `docker-compose.yml:7` (`POSTGRES_USER: postgres`), `.env.example:12`. E `postgres\|t\|t` no cluster (§0.2). |
| P-d | O papel real da produção é secret do Fly e **não foi medido** | **HIPÓTESE** (por construção: é segredo) | comando do dono em §0.6 H2. `fly.production.toml:9` declara só o NOME `DATABASE_URL`; `deploy-production.yml:136-138` roda `prisma migrate deploy` com `secrets.PROD_DATABASE_URL` — **outro** secret (GitHub Environment), l.164 idem para `db:provision-rbac`. |
| P-e | `docs/deployment.md` afirma em prosa o que nenhum mecanismo garante | **MEDIDO — conflito registrado (§A2)** | `docs/deployment.md:458`: "Em PRODUCAO o app conecta com role NAO-superuser (o `app_user`, sem BYPASSRLS) — nunca `postgres` —, … Confirmar na ativacao." e `:472-473` (runbook B-O6R-01): "O nome `app_user` acima é convenção em prosa, não fato". Prosa ≠ trava: este plano substitui a frase por mecanismo + procedimento (E4, E5). |
| P-f | `FORCE ROW LEVEL SECURITY` nas 4 tabelas de nuvem (e em quantas mais) | **MEDIDO — 106 tabelas, ENABLE = FORCE** | gerador L0 (§0.4): `ENABLE=106 FORCE=106`; no cluster: `relforcerowsecurity` = 106; `diff` nome a nome entre a lista das migrações e a do catálogo → **IDÊNTICAS**. Inclui `cloud_usage_events`, `cloud_usage_daily_aggregates`, `tenant_cloud_cost_allocations`, `tenant_cloud_charges`. **Sem RLS:** `tenants`, `cloud_charge_rules`, `cloud_charge_calculation_runs`, `cloud_cost_allocation_runs`, `cloud_cost_imports`, `cloud_cost_line_items` (os 115 − 106 − `_prisma_migrations`…). |
| P-g | A policy é `tenant_id = current_setting('app.current_tenant_id', true)`; sem GUC ela é falsa | **MEDIDO** | `prisma/migrations/20260614000000_add_cloud_charge_markup_rules/migration.sql:158-160`: `USING ("tenant_id"::text = current_setting('app.current_tenant_id', true)) WITH CHECK (…)`; `20260611000000…:60,67` e `20260613000000…:91` mesma forma. Sem GUC: `current_setting(…, true)` = `NULL` → comparação `NULL` → linha invisível e `INSERT` recusado (P6 em §0.5). |
| P-h | Item 10: as leituras de plataforma devolvem **zero** sob papel sem `BYPASSRLS` — e o remédio por tenant funciona no mesmo papel | **MEDIDO — 22/22** | §0.5 (P1…P7 = `0`; controles positivos por tenant = `3`, `2`, `1`, `2`; remédio R1 = `5`). |
| P-i | A consulta do teste de encerramento do §5.2 (`SELECT rolsuper, rolbypassrls … WHERE rolname = current_user`) basta | **MEDIDO — falsa (incompleta)** | G4c em §0.5: um papel `false:false` que é **MEMBRO** de um papel `BYPASSRLS` passa nela — e G4b prova que a porta é real (`SET ROLE` + `SELECT` sem GUC devolve os 5 eventos). É exatamente o "GRANT <role_dona> TO <app> — NUNCA" que `docs/deployment.md:498-500` proíbe **em prosa**. A trava deste plano usa `pg_has_role` (§2, §4.2). |
| P-j | Migrador e app podem ser papéis **distintos** sem tocar a pipeline | **MEDIDO — verdadeira** | `deploy-production.yml:136-138,162-164` (`PROD_DATABASE_URL`, GitHub Environment) × `fly.production.toml:9` (`DATABASE_URL`, Fly secret): já são **dois** segredos. O ato do dono (§11) troca só o segundo. |
| P-k | O app não precisa de privilégio além de `SELECT/INSERT/UPDATE/DELETE` + `USAGE/SELECT` em sequências | **MEDIDO no estático; residual em §0.6 H4** | `git grep -n -i -E '\b(TRUNCATE\|LISTEN\|pg_notify\|NOTIFY\|REFRESH MATERIALIZED\|COPY .* FROM\|LOCK TABLE\|CREATE TEMP\|SET ROLE\|SET SESSION AUTHORIZATION)\b' origin/main -- src` → 0 ocorrências executáveis (os hits são nomes de job `impound.notify-due` e a coluna `SET role = …` de um `UPDATE` em `checklist-prisma.repository.ts:574`). O `pg_advisory_xact_lock` (`src/database/financial-period-lock.ts`) e o `set_config` não exigem privilégio. A única `SECURITY DEFINER` (`auth_login_candidates`, `REVOKE ALL FROM PUBLIC`) é ato humano do runbook B-O6R-01 — fica `inert_no_execute` até o GRANT (esperado; §11 passo 4). |
| P-l | `ALTER DEFAULT PRIVILEGES` cobre as tabelas que o migrador criar **depois** | **MEDIDO — verdadeira** | no cluster: `CREATE ROLE h6_runtime …; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO h6_runtime; … ON SEQUENCES …; CREATE TABLE h6_depois(id serial primary key); SELECT has_table_privilege('h6_runtime','h6_depois','SELECT,INSERT,UPDATE,DELETE'), has_sequence_privilege('h6_runtime','h6_depois_id_seq','USAGE'), has_table_privilege('h6_runtime','tenants','SELECT')` → `t\|t\|f`. Logo o procedimento precisa das **duas** coisas: `GRANT … ON ALL TABLES` (as existentes) **e** `ALTER DEFAULT PRIVILEGES` (as futuras). |
| P-m | Nenhum ramo em voo toca os arquivos do bloco | **MEDIDO — verdadeiro** | laço sobre `git for-each-ref refs/remotes/origin` com `git diff --name-only origin/main...<ramo>` filtrado pela fronteira: só `scripts/` aparece, e em **outros** arquivos (`audit-agents-skills.mjs`, `mandato-*.sh`, `demo-seed/*`, `porteiro-pre-merge.mjs`, `inventory-duplicates-census.sql`, `run-backend-tests.mjs`). Nada em `env.ts`, `src/database/`, compose, `deployment.md`, `server.ts` nem nos dois repositórios de nuvem. |
| P-n | "15 suítes exigem `CREATEROLE`/dono de tabela" (§5.2, fora do bloco → `B-ARNES-2`) | **MEDIDO — 13 + 8** | `git grep -l -E 'createEphemeralRole\|CREATE ROLE\|withRoleCatalogLock\|createSyntheticOrphanRole' origin/main -- tests` (sem `helpers/`) → **13** suítes escrevem catálogo; `git grep -l -E 'TRUNCATE\|ALTER TABLE\|DROP TABLE\|CREATE EXTENSION\|DISABLE TRIGGER' … -- tests` → **8** fazem DDL de dono. O número "15" do §5.2 não se reproduz assim; a classe está confirmada e continua **fora deste bloco** (§13). |
| P-o | A lista "hoje medida" do §5.2 tem **quatro** leituras | **MEDIDO — são sete sítios, em cinco métodos; um deles fora da fronteira** | §0.4. |
| P-p | Origem (§C7.1-ter(a)) | **MEDIDO** | `git log --diff-filter=A --date=short -- <arquivo>` devolve `f4ef511 2026-08-11` para os quatro arquivos de código **e** para as três migrações — `f4ef511` é a **raiz** do histórico (`git rev-list --max-parents=0 origin/main`). A datação útil vem das migrações (`20260611`, `20260613`, `20260614`) e das pendências (`P-INFRA-RLS`: Ω3-d; `P-O6R-B06-…`: 2026-09-07, medida no #386). Tudo **antecede** este bloco. |

### 0.4 A LISTA FECHADA — gerada por script, pela PROPRIEDADE (CE-G1)

A propriedade **não é** "estes quatro métodos"; é: *acesso (leitura ou escrita) a uma tabela sob `FORCE ROW LEVEL
SECURITY`, executado por um executor **sem** `app.current_tenant_id` — que só devolve linhas (ou só grava) quando o
papel de banco é superusuário ou tem `BYPASSRLS`*. O gerador (Apêndice A, **verbatim**; o desenvolvedor o commita
como `scripts/san3-05-acessos-de-plataforma.mjs`) deriva tudo da fonte, em três camadas — L0 tabelas FORCE ←
`prisma/migrations/**` e tabela→model→acessor ← `prisma/schema.prisma`; L1 todo call-site Prisma e todo
`$queryRaw*/$executeRaw*` sobre essas tabelas em `src/**/*.ts`, com receptor e envoltório de contexto lidos da
**AST** (`typescript` 5.9.3, já em `node_modules`); L2 para receptor injetado (`this.client`), quem instancia a
classe e com quê. Comando e cabeçalho da saída, no head:

```
$ node scripts/san3-05-acessos-de-plataforma.mjs .        # (nesta sessão: node <scratchpad>/leituras-de-plataforma.mjs .)
# L0: tabelas ENABLE=106 FORCE=106 · acessores Prisma em FORCE=106 · src/**/*.ts=777
# L1: call-sites sobre tabelas FORCE = 642
# L1 por classificação: {"TX-SEM-ENVOLTORIO?":6,"INJETADO":584,"SOB-CONTEXTO":52}
# L2: classes com executor injetado = 70; instanciações achadas = 451
# L2 por classificação do argumento: {"SOB-CONTEXTO":424,"TX-SEM-ENVOLTORIO?":14,"CRU":4,"OUTRO()":4,"INJETADO":5}
```

**A lista fechada (L2b — sítios alcançáveis a partir de instanciações com client cru), no head `3b1fe0f9`:**

| # | Sítio | Método | Tabela FORCE | Como chega ao client cru | Fronteira |
|--:|---|---|---|---|---|
| 1 | `src/modules/cloud-usage/cloud-usage-prisma.repository.ts:61` | `PrismaCloudUsageRepository.listEvents` | `cloud_usage_events` | `:173` `new PrismaCloudUsageRepository(this.prismaClient).listEvents()` — o ramo **sem `tenantId`** de `RlsPrismaCloudUsageRepository.listEvents` | **dentro** |
| 2 | `…/cloud-usage-prisma.repository.ts:120` | `PrismaCloudUsageRepository.listDailyAggregates` | `cloud_usage_daily_aggregates` | `:197` idem, ramo sem `tenantId` de `listDailyAggregates` | **dentro** |
| 3 | `src/modules/cloud-charges/cloud-charge-prisma.repository.ts:167` | `PrismaCloudChargeRepository.replaceTenantCharges` (`deleteMany`) | `tenant_cloud_charges` | `:240` `createPrismaCloudChargeRepository()` devolve `new PrismaCloudChargeRepository(prisma)` — **fábrica crua, sem envoltório `Rls*`** | **dentro** |
| 4 | `…/cloud-charge-prisma.repository.ts:171` | `replaceTenantCharges` (`create`) | `tenant_cloud_charges` | idem | **dentro** |
| 5 | `…/cloud-charge-prisma.repository.ts:202` | `listTenantCharges` (`findMany`) | `tenant_cloud_charges` | idem | **dentro** |
| 6 | `…/cloud-charge-prisma.repository.ts:220` | `listAllocationTenantAllocations` (`findMany`) | `tenant_cloud_cost_allocations` | idem — **não estava na lista do §5.2**; é a leitura que alimenta `executeCalculationRun` (`cloud-charge.service.ts:85`): sob papel sem bypass a cobrança calcula **zero** cobranças com `status: completed` | **dentro** (mesmo arquivo do §5.2) |
| 7 | `src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts:238` | `PrismaCloudCostAllocationRepository.listUsageDailyAggregates` | `cloud_usage_daily_aggregates` | `:413` fábrica crua | **FORA** (arquivo fora do §5.2) — e **sem chamador em `src/`**: `git grep -n listUsageDailyAggregates origin/main -- src tests` só devolve a interface, a implementação, um comentário de `.types.ts` e a sonda do teste `o6r06-allocation-basis-rls-db.test.ts:59`. Vira pendência nomeada (§13). |

**Quem chama os cinco métodos de dentro (fluxo até a superfície):** `cloud-usage.service.ts:114` (`summarizeEvents` ←
`getPlatformUsageSummary` ← `GET /platform/cloud-usage/summary`, `cloud-usage.routes.ts:12-17`) e `:49`
(`aggregateDailyUsage`, o job `cloud-usage.aggregate-daily` — que sob papel sem bypass agregaria **nada**);
`:102` (`getTenantUsageDaily`, sempre com tenant — o ramo cru de `listDailyAggregates` hoje só é alcançável por
chamada direta sem tenant); `cloud-charge.service.ts:85,104,155,178` (`executeCalculationRun`, `listTenantCharges`,
`getCloudChargeSummary` ← `GET /platform/cloud-charges/...`, `cloud-charge.routes.ts:88-119`).

**O que o gerador mostra que NÃO é leak (para a junta conferir o critério, não a lista):**
- **6 sítios `TX-SEM-ENVOLTORIO?`** (receptor `tx` recebido como **parâmetro** de helper): `src/database/rls.ts:57`
  (dentro de `setIdentityRlsContext`, que seta o GUC de tenant na l.51 **antes**); `identity-link.service.ts:613` e
  `identity-resolver.ts:22` (helpers chamados em `identity-link.service.ts:98,179,189,194,195,315`, todos após
  `setTenantRlsContext`/`setIdentityRlsContext` — lido nas l.85-100, 168-192, 305-316); `session-admin.service.ts:163`
  (`resolveUserLabels`, chamado na l.80 dentro de `this.runWithTenantContext(actor.tenantId, …)`, cujo valor de
  produção é `(tenantId, work) => withTenantRls(prisma, tenantId, work)` — `session-admin.service.ts:288`,
  `auth-runtime.ts:82`); `financial-period-close-prisma.repository.ts:111,115` (`readCompetencia`, chamado de
  `close`/`reopen` dentro de `withTenantRls`, l.59 e 66). **Contexto herdado do chamador — verificado por leitura.**
- **4 instanciações `OUTRO()`** — `prisma-core-saas.store.ts:38-41` (`new UserRepository()` etc., default = client
  cru): os campos **não têm chamada** (`campo users → (sem chamada)`); todo uso passa por `new XRepository(tx)` sob
  `withTenantRls` (l.102-106, 176-180, 246-337) e `this.tenants.*` lê `tenants`, que não tem RLS.
- **5 instanciações `INJETADO`→`INJETADO`** (`impound-prisma.repository.ts:165,211,500,721`,
  `release-prisma.repository.ts:445`): transitivas — as 35 instanciações de `PrismaImpoundRepository`/
  `PrismaReleaseRepository` são todas `SOB-CONTEXTO` (`--all`, coluna 4).

**Residual declarado do gerador (é aproximação estática, não prova):** (i) `$transaction` cujo `set_config` esteja
em helper chamado dentro do callback aparece como `$transaction-SEM-setter` — hoje **zero** casos; (ii) receptor com
nome fora de `prisma|this.prismaClient|this.prisma|client|this.client|executor|tx` cai em `OUTRO(...)` — hoje só os
4 acima; (iii) SQL montado por concatenação sem o nome literal da tabela não é visto. O árbitro final é a
**medição dinâmica** (§0.5), e é ela que o teste de encerramento repete (T10–T13).

### 0.5 A MEDIÇÃO sob papel `NOSUPERUSER NOBYPASSRLS` real — 22 itens, 0 fora do esperado

Script em Apêndice B (**verbatim**), executado com `ADMIN_URL=postgresql://postgres@127.0.0.1:54329/erp_san3_05?schema=public
npx tsx <scratchpad>/medir-papel.ts` a partir da raiz do repo, importando **as classes reais** de
`src/modules/cloud-usage/cloud-usage-prisma.repository.ts`, `src/modules/cloud-charges/cloud-charge-prisma.repository.ts`,
`src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts` e `src/database/rls.ts` do head.
Semente: 2 organizações (`A` com 3 eventos, `B` com 2; 1 agregado diário cada; 1 alocação cada; 1 cobrança cada),
gravada **sob contexto por tenant** como o app grava. Papéis criados e derrubados pelo script: `san3_05_runtime`
(`LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS` + grants DML), `san3_05_super_com_outro_nome`
(`SUPERUSER`), `san3_05_bypass_nologin` (`NOLOGIN BYPASSRLS`). Ao final: `pg_roles LIKE 'san3_05%'` = **0**,
`tenants LIKE 'san3-05-%'` = **0**, `cloud_usage_events` = 0, `tenant_cloud_charges` = 0 (limpo, medido).

| id | item | esperado | medido | ok |
|---|---|---|---|:-:|
| M0 | postura dos papéis (rolname:rolsuper:rolbypassrls) | `san3_05_bypass_nologin:false:true,san3_05_runtime:false:false,san3_05_super_com_outro_nome:true:false` | idem | ✓ |
| G1 | trava sob `postgres` (superusuário): linhas devolvidas > 0 ⇒ RECUSA | `recusa` | `recusa` | ✓ |
| G2 | trava sob `san3_05_runtime` (NOSUPERUSER NOBYPASSRLS): 0 linhas ⇒ PASSA | `passa` | `passa` | ✓ |
| G3 | MUTAÇÃO: superusuário com OUTRO nome ⇒ RECUSA (a trava é por atributo, não por nome) | `recusa` | `recusa` | ✓ |
| G4 | MUTAÇÃO: papel limpo que é MEMBRO de papel BYPASSRLS ⇒ RECUSA (`pg_has_role`) | `recusa` | `recusa` | ✓ |
| G4b | a porta dos fundos é real: `SET ROLE <bypass>` + `SELECT` sem GUC devolve os 5 eventos | `5` | `5` | ✓ |
| G4c | a consulta INGÊNUA do §5.2 sob o mesmo papel-membro diz `false:false` (cega à pertença) | `false:false` | `false:false` | ✓ |
| O1 | tabelas FORCE de posse do papel de runtime (dono ≠ app) | `0` | `0` | ✓ |
| O2 | tabelas FORCE de posse do migrador (`postgres`) | `106` | `106` | ✓ |
| P1 | `cloud-usage-prisma.repository.ts:173` `listEvents({})` [plataforma, sem tenant] — hoje | `0` | `0` | ✓ |
| P1c | controle positivo: `listEvents({tenantId: A})` sob contexto | `3` | `3` | ✓ |
| P1d | controle positivo: `listEvents({tenantId: B})` sob contexto | `2` | `2` | ✓ |
| P2 | `cloud-usage-prisma.repository.ts:197` `listDailyAggregates({})` [plataforma] — hoje | `0` | `0` | ✓ |
| P2c | controle positivo: `listDailyAggregates({tenantId: A})` | `1` | `1` | ✓ |
| P3 | `cloud-charge-prisma.repository.ts:202` `listTenantCharges(run)` — hoje | `0` | `0` | ✓ |
| P4 | `cloud-charge-prisma.repository.ts:220` `listAllocationTenantAllocations(allocRun)` — hoje | `0` | `0` | ✓ |
| P5c | controle: `listTenants()` (tabela `tenants` sem RLS) devolve as 2 organizações da semente | `2` | `2` | ✓ |
| P6 | `cloud-charge-prisma.repository.ts:167-171` `replaceTenantCharges` — hoje (`deleteMany` silencioso + `INSERT` recusado) | `42501 row-level security` | `42501 row-level security` | ✓ |
| P6b | …e o `deleteMany` sem contexto NÃO apagou nada (as 2 cobranças seguem lá, lidas como superusuário) | `2` | `2` | ✓ |
| P7 | `cloud-cost-allocation-prisma.repository.ts:238` `listUsageDailyAggregates` (sem chamador em `src`) — hoje | `0` | `0` | ✓ |
| P7c | controle: `listTenantAllocations(allocRun)` do B-O6R-06 (laço por tenant SOB contexto) devolve 2 | `2` | `2` | ✓ |
| R1 | REMÉDIO (protótipo): laço por tenant sob contexto, mesmo papel, soma os eventos das 2 organizações | `5` | `5` | ✓ |

**Leitura:** o item 10 é real e **silencioso** (P1–P4, P7: `0`, sem erro; só a **escrita** grita, P6). O remédio
por tenant sob contexto (R1) funciona no **mesmo** papel — logo o bloco não precisa de privilégio novo, precisa de
**contexto**. E a trava proposta (G1–G4) distingue os quatro casos que importam, incluindo o que a consulta do
§5.2 não distingue (G4c).

### 0.6 HIPÓTESES — o que NÃO foi medido aqui, com o comando que derruba cada uma

| id | Hipótese | Por que não foi medida | Comando que a mede |
|---|---|---|---|
| H1 | O script do papel, montado em `/docker-entrypoint-initdb.d/`, roda na **primeira** subida do volume do `postgres:16` e cria o papel **antes** do `migrate` (então os `ALTER DEFAULT PRIVILEGES` cobrem as tabelas das migrações — P-l) | sem daemon docker nesta máquina | `docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml up -d postgres && docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d erp_techsolutions -Atc "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='erp_runtime'"` → esperado `erp_runtime\|f\|f`. E, na CI, o job `docker` (`ci.yml:394-477`) com `scripts/smoke-compose-persistence.mjs` verde no head. |
| H2 | O papel **de produção** hoje é superusuário/`BYPASSRLS` (ou não) | é segredo do Fly; ninguém mediu (`P-INFRA-RLS`, emenda de 2026-09-11) | pelo dono, com a URL do secret: `psql "$DATABASE_URL" -Atc "SELECT current_user, r.rolsuper, r.rolbypassrls, EXISTS (SELECT 1 FROM pg_roles b WHERE (b.rolsuper OR b.rolbypassrls) AND pg_has_role(current_user, b.oid, 'MEMBER')) AS escapa FROM pg_roles r WHERE r.rolname = current_user"`. Qualquer `t` ⇒ a trava vai recusar o boot ⇒ §11 antes do deploy. |
| H3 | Em produção, o migrador (`PROD_DATABASE_URL`) é o **dono** das 106 tabelas FORCE, e o papel do app não é dono de nenhuma | idem | `psql "$DATABASE_URL" -Atc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity AND pg_get_userbyid(c.relowner)=current_user"` → esperado `0` sob o papel do app. A trava **reporta** (log), não recusa (§2.2, §12 R5). |
| H4 | O caminho do smoke de contêiner (`smoke-compose-persistence.mjs`: readiness → worker → grava organização → restart → relê) só exige DML + `USAGE` em sequências sob o papel novo | sem docker; e SQL dinâmico não é visto pelo grep de P-k | o mesmo job `docker` da CI no head: se o papel faltar privilégio, o smoke cai com `42501` no passo "grava organização" (o script já redige `DATABASE_URL`/`postgresql://` da saída — `smoke-compose-persistence.mjs:72-81`). |
| H5 | Boot recusado no Fly vira **restart em laço** até o dono trocar o secret (não "meio de pé") | sem ambiente | `fly logs -c fly.production.toml` após um deploy com papel errado: linha `Failed to start ERP Techsolutions API` + `RUNTIME_ROLE_CAN_BYPASS_RLS`, máquina reiniciando; `fly status` sem máquina `started` passando no check. É o comportamento **desejado** (deployment.md:78-81: "configuracao incompleta nao degrada — ela reprova o boot"). |
| H6 | `tests/deploy-manifest-parity.test.ts` continua verde sem tocar manifesto nem `.env.example`, porque a chave nova é **opcional com default seguro** (não entra em `deriveRequiredInProduction()`, l.280-287; `.env.example` só precisa nomear chaves **exigidas**, l.431-434) | é consequência do desenho E2, medível só no diff | `node --test --import tsx tests/deploy-manifest-parity.test.ts` no head da entrega → 22/22. Mutação que a derruba: tornar `DATABASE_RUNTIME_ROLE_GUARD` obrigatória. |

---

## §1 — Objetivo · ator · fluxo · contrato

**Objetivo.** Fechar os itens 9 e 10 do gate vendável (`PLANO_SAN3.md` §4.1) com **mecanismo**, não prosa:
(9) o processo da API **só sobe em produção** se a identidade com que fala ao banco **não puder escapar de RLS** —
nem por atributo (`rolsuper`, `rolbypassrls`), nem por pertença (`SET ROLE` para um papel que escapa) —, e existe um
**procedimento versionado** que cria esse papel (para o compose local-prod e para o banco gerenciado do dono);
(10) as leituras e escritas **de plataforma** sobre tabelas `FORCE RLS` deixam de depender de bypass: rodam **por
organização, sob o contexto dela**, e somam — de modo que, no dia em que o papel de produção for trocado (ato do
dono, §11), o resumo de uso da plataforma, o Cloud Billing e a cobrança de nuvem **não zerem**.

**Ator.** Não há ator de negócio: é infraestrutura de segurança. Os papéis de plataforma (`platform_admin`,
permissões `platform:cloud-usage:read`, `platform:cloud-charges:*`) são os que **veem** o efeito do item 10; o
**dono** é quem pratica o ato do §4.2 (l.192).

**Fluxo origem → destino.**
1. `node dist/server.js` → `main()` → **[NOVO] trava do papel** (§2.2 E1) → `createCoreSaasService()` → … → `listen`.
   Recusa ⇒ exceção nomeada **antes** do `listen`, conexão fechada, `process.exitCode = 1` (o `main().catch` que já
   existe em `src/server.ts:45-48`).
2. `GET /platform/cloud-usage/summary` → `getPlatformUsageSummary` → `summarizeEvents` → `listEvents({sem tenant})`
   → **[NOVO] laço por organização sob contexto** → soma. Idem `aggregateDailyUsage` (job) e `listDailyAggregates`.
3. `POST /platform/cloud-charges/calculation-runs` → `executeCalculationRun` → `listAllocationTenantAllocations`
   **[NOVO por tenant]** → cálculo → `replaceTenantCharges` **[NOVO por tenant, uma transação]**; `GET …/summary`
   → `listTenantCharges` **[NOVO por tenant]**.
4. Compose local-prod: `postgres` (init cria `erp_runtime` via o script) → `migrate` (como `postgres`) → `api`
   (como `erp_runtime`, `NODE_ENV=production` ⇒ trava ativa ⇒ boot **prova** a postura) → smoke da CI.
5. Produção: o dono roda o script no banco gerenciado com a credencial do migrador, troca o secret `DATABASE_URL`
   do Fly para o papel novo, faz deploy; a trava é a prova (§11).

**Contrato.** Nenhuma rota, payload ou código HTTP muda. Contratos que mudam de **semântica** sob papel sem bypass:
`GET /platform/cloud-usage/summary` e `GET /platform/cloud-usage/tenants/:id/daily` (passam a devolver os números
reais); `GET /platform/cloud-charges/summary`, `GET /platform/cloud-charges/calculation-runs/:id/charges` e o cálculo
(idem). Boot: nova causa de recusa em produção, nomeada `RUNTIME_ROLE_CAN_BYPASS_RLS` (item 9, `P-INFRA-RLS`).
Env: chave nova **opcional** `DATABASE_RUNTIME_ROLE_GUARD` = `enforce` | `skip` (§2.2 E2). **`/health/*` não muda**
(corpo público inalterado — §2.8; a postura do papel vai só ao log estruturado do servidor).

---

## §2 — Onde mora a propriedade — respondido duas vezes

### 2.1 Pelo ENUNCIADO

A propriedade tem duas metades, e as duas são **do banco**, não do código de negócio:

- **(a) Identidade.** *A única identidade com que a API fala ao banco em produção não consegue ler ou gravar linha
  de tabela `FORCE RLS` sem o GUC do tenant.* Em PostgreSQL isso é exatamente: `¬∃ r ∈ pg_roles : (r.rolsuper ∨
  r.rolbypassrls) ∧ pg_has_role(current_user, r, 'MEMBER')` — o próprio papel não escapa **e** não pode `SET ROLE`
  para quem escapa (G4/G4b/G4c provam que só a primeira metade não basta). Hoje **nada** no repositório enuncia isso
  (P-a); `docs/deployment.md:458` enuncia em prosa e pede "confirmar na ativação".
- **(b) Contexto.** *Todo acesso a tabela `FORCE RLS` que precise de linhas de N organizações roda N vezes, cada uma
  sob o GUC da organização, e não uma vez sem GUC.* Hoje sete sítios violam isso (§0.4), e violam **em silêncio**
  (`0` linhas, `ec=0`) — o único que grita é a escrita (P6).

A metade (a) sem a (b) **zera** o painel de plataforma no dia da troca (é o item 10 como pré-requisito do 9). A (b)
sem a (a) é cosmética: sob superusuário o laço por tenant devolve o mesmo que a leitura crua. **Por isso são um
bloco só.**

### 2.2 Pelo REMÉDIO — cada metade mora num arquivo, e só num

**(a) → `src/database/runtime-role.ts` + `src/database/runtime-role.bootstrap.ts` + 1 linha em `src/server.ts` + gate em `src/config/env.ts`.**

- `RUNTIME_ROLE_GUARD_SQL` (constante **única**, o mesmo texto do G1–G4 do §0.5 — a junta confere byte a byte):
  ```sql
  SELECT r.rolname, r.rolsuper, r.rolbypassrls, (r.rolname = current_user) AS is_self
  FROM pg_roles r
  WHERE (r.rolsuper OR r.rolbypassrls) AND pg_has_role(current_user, r.oid, 'MEMBER')
  ORDER BY r.rolname
  ```
  `probeRuntimeRolePosture(client)` devolve `{ roleName: current_user, bypassing: linhas acima, ownedForceRlsTables:
  count(*) de pg_class … relforcerowsecurity … relowner = current_user }`. `assertRuntimeRolePosture(posture)` lança
  `RuntimeRoleGuardError` (`code = "RUNTIME_ROLE_CAN_BYPASS_RLS"`) se `bypassing.length > 0`. A **posse** é
  **reportada** no log (`owned_force_rls_tables`), **não recusa** — decisão declarada: exigir dono ≠ app no boot
  tornaria impossível o próprio ato do dono num provedor que só ofereça um papel até o segundo existir; a topologia
  dono ≠ app segue sendo medida na ativação (deployment.md:489-495) e H3.
- `assertRuntimeDatabaseRoleIfEnforced({ enforce = env.DATABASE_RUNTIME_ROLE_GUARD === "enforce", logger, loadClient,
  attempts = 5, backoffMs = 2000 })` — padrão de `src/infra/jobs/job-worker.bootstrap.ts` (dependências injetáveis,
  testável sem `server.ts`). Com `enforce`: abre o client (`src/database/prisma.ts`), sonda (com retry só para erro de
  **conexão**; um veredito de postura não é retentado), loga em `info` `{ role, bypassing: 0, owned_force_rls_tables }`
  **sem URL, sem senha, sem host** e retorna; se recusar: loga em `error` `{ role, bypassing: [{rolname, rolsuper,
  rolbypassrls, is_self}] }`, `await client.$disconnect()` (senão o pool segura o event loop e o processo não
  morre), e **lança**. Sem `enforce`: retorna `{ enforced: false }` e loga uma linha `info` dizendo que a trava está
  desligada (dev/test) — nunca silêncio (lição do B-O6R-05: "o retorno MUDO era o modo de falha").
- `src/server.ts` `main()`: **primeira** instrução `await assertRuntimeDatabaseRoleIfEnforced({ logger });` — antes de
  `createCoreSaasService()` abrir Redis ou qualquer handle. Uma linha + import, exatamente como o B-O6R-05 fez com
  `startJobWorkerIfEnabled` (l.19). `src/server.ts` não está na linha do §5.2; entra no PERMITIDO **nominalmente e só
  para essa linha** (§6), porque uma trava de boot que ninguém chama antes do `listen` é trava no nome (o mesmo
  argumento do G3 em `env.ts:509-511`).
- **Gate `G-DB-ROLE` em `src/config/env.ts`** (a parte **síncrona** da trava — o schema não consulta banco):
  `DATABASE_RUNTIME_ROLE_GUARD: z.enum(["enforce", "skip"]).optional()`; no `export const env`, default por ambiente
  **espelhando `EVIDENCE_SCANNER` (l.631-638)**: `production` → `"enforce"`, `development`/`test` → `"skip"`
  (dev/CI rodam como `postgres` — P-c — e não podem recusar o boot de todo mundo); no `superRefine`, `production ∧
  "skip"` → issue em `DATABASE_RUNTIME_ROLE_GUARD` com mensagem nomeando `P-INFRA-RLS`/item 9. **Não existe valor
  que afrouxe em produção**; `skip` só serve para dev/test **explicitarem** o que já é o default, e `enforce` em
  dev/test serve ao teste T5 (boot sob papel efêmero). Chave opcional com default seguro ⇒ não entra na lista
  derivada de exigidas ⇒ `fly.*.toml`, compose e `.env.example` **não** precisam declará-la (H6).

**(b) → `src/database/rls.ts` (o laço) + os dois repositórios de nuvem (quem o usa).**

- `src/database/rls.ts` ganha **`forEachTenantRls(client, tenantIds, work)`**: **uma** transação, `setTenantRlsContext(tx,
  id)` (o setter único que já existe, l.16-27) **a cada volta** (transaction-local, substituído), `work(tx, id)` por
  volta, resultados concatenados na ordem de `tenantIds`; e **`assertRowsBelongToTenant(rows, tenantId, table)`** — o
  **canário** (uma volta que não trocou o GUC devolve, em silêncio, as linhas do tenant anterior; achado R2-C do
  B-O6R-06, `cloud-cost-allocation-prisma.repository.ts:168-178`). Os dois são o padrão já provado pelo B-O6R-06
  (`forEachTenantInOneTx`, l.340-368 daquele arquivo) **promovidos ao lar único** de `src/database/rls.ts`; a cópia
  privada da alocação **fica** (arquivo fora da fronteira) e vira pendência de deduplicação (§13). O GUC de
  identidade não é tocado (a constante `IDENTITY_RLS_GUC` e seu guard de varredura continuam intactos).
- **`RlsPrismaCloudUsageRepository`** (`cloud-usage-prisma.repository.ts:166-174, 190-198`): o ramo **sem
  `tenantId`** deixa de instanciar o repositório cru com `this.prismaClient` e passa a: `ids = tenant.findMany({select:{id}})`
  (tabela sem RLS — P-f; mesma leitura de `platform-overview-prisma.repository.ts:23-33`), `forEachTenantRls(ids,
  (tx, id) => new PrismaCloudUsageRepository(tx).listEvents({...filters, tenantId: id}))`, canário por volta, e a
  concatenação **reordenada** por `occurredAt asc` (o contrato do método era `orderBy occurred_at asc`; a concatenação
  por tenant quebraria a ordem global). `listDailyAggregates` idem, reordenando por `date asc`. Custo N+1 declarado
  (o mesmo aceite de `platform-overview-prisma.repository.ts:15-16`).
- **`cloud-charge-prisma.repository.ts`**: nasce **`RlsPrismaCloudChargeRepository implements CloudChargeRepository`**
  (mesmo desenho `Prisma*` cru + `Rls*` envoltório dos outros módulos), delegando ao cru **tudo** que toca tabela
  **sem** RLS (`cloud_charge_rules`, `cloud_charge_calculation_runs`, `cloud_cost_allocation_runs`, `tenants`) e
  reescrevendo os **três** métodos da lista: `replaceTenantCharges(runId, charges)` — agrupa por `tenantId`, `ids =
  todos os tenants` (não só os com cobrança: quem ficou sem cobrança neste run precisa ter as linhas do run anterior
  **apagadas** — o B7 do B-O6R-06), `forEachTenantRls(ids, (tx, id) => { deleteMany({calculation_run_id, tenant_id:
  id}); create de cada cobrança do tenant })`, **uma** transação (atomicidade B8: falha no 2º tenant não deixa linha
  do 1º); `listTenantCharges(runId, filters)` — `ids = filters.tenantId ? [ele] : todos`, por volta `findMany({…,
  tenant_id: id})` + canário, concatenação reordenada por `createdAt asc`; `listAllocationTenantAllocations(runId)`
  — todos os tenants, por volta `findMany({allocation_run_id, tenant_id: id})` + canário, sem `take` global (espelha
  `listTenantAllocations` do B-O6R-06, l.180-200; o `take: 100_000` da versão crua deixa de existir —
  **decisão declarada**, a junta ratifica ou pede o teto por tenant). `createPrismaCloudChargeRepository()` passa a
  devolver o envoltório; o tipo de retorno vira a **interface** `CloudChargeRepository` (chamadores: grep no §8
  passo 3 — o serviço já depende da interface).

**O que NÃO é lar da propriedade (e por isso não entra):** `src/routes/health.routes.ts` (reportar a postura no
`/health/ready` seria útil, mas corpo público de saúde é §2.8 e o arquivo está fora do §5.2 — §13);
`cloud-cost-allocation-prisma.repository.ts` (fora do §5.2; o sítio 7 é morto — §13); `fly.*.toml` (a chave nova
não é exigida; H6).

---

## §3 — Entregas

| E | Entrega | Arquivos | Fecha |
|---|---|---|---|
| E1 | Trava de boot: sonda + asserção + bootstrap + chamada em `main()` | `src/database/runtime-role.ts` (novo), `src/database/runtime-role.bootstrap.ts` (novo), `src/server.ts` (1 linha + import) | item 9 (mecanismo) |
| E2 | Gate `G-DB-ROLE`: chave `DATABASE_RUNTIME_ROLE_GUARD`, default por ambiente, recusa de `skip` em produção | `src/config/env.ts` | item 9 (não afrouxável) |
| E3 | Laço por organização sob contexto + canário no lar único; os cinco métodos da lista fechada passam a usá-lo | `src/database/rls.ts`, `src/modules/cloud-usage/cloud-usage-prisma.repository.ts`, `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` | item 10 |
| E4 | Procedimento do papel (idempotente; serve ao compose **e** ao banco gerenciado) + compose local-prod sobe com `api` no papel de runtime | `scripts/db-runtime-role.sh` (novo), `docker-compose.prod.yml` | item 9 (procedimento) + §4.2 "o que os blocos entregam pronto" |
| E5 | Documentação: seção "Papel de banco de runtime", linha `G-DB-ROLE` na tabela dos gates (deployment.md:71-76), a frase da l.458 trocada por mecanismo + procedimento, o runbook B-O6R-01 passo 0/5 apontando para o papel de runtime | `docs/deployment.md` | §4.2 (procedimento que o dono lê) |
| E6 | Guard **gerado** (CE-G1): o gerador versionado + teste que o executa e exige lista fechada **vazia** | `scripts/san3-05-acessos-de-plataforma.mjs` (novo, = Apêndice A), `tests/san3-05-acessos-de-plataforma-guard.test.ts` (novo) | item 10 (não regride) |
| E7 | Testes T1–T14 (§8) | `tests/production-runtime-gates.test.ts` (+ casos), `tests/san3-05-runtime-role-guard-db.test.ts` (novo), `tests/san3-05-leituras-de-plataforma-db.test.ts` (novo), `tests/san3-05-runtime-role-bootstrap.test.ts` (novo) | DoD |
| E8 | KPI e registro no próprio PR (§9, §C3) + comando do bloco + registro em `agent-orchestration/` | `Kpis/*`, `agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md` (novo), `agent-orchestration/controle/pendencias.md` (emendas de status + pendências novas), `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | §C3, §C6 |

O que **não** muda de propósito: `docker-compose.yml` (dev continua `postgres`: as 13 suítes de catálogo precisam de
`CREATEROLE`, P-n), `.github/workflows/ci.yml` (idem; e o job `docker` já roda o compose local-prod — é ele que
prova o E4), `fly.production.toml`/`fly.staging.toml` (nenhuma chave nova exigida; o segredo `DATABASE_URL` muda de
**valor**, não de nome — ato do dono), `prisma/**` (sem migração: não há objeto de banco novo além do **papel**, que
é objeto de **cluster** e nunca entra em migração — decisão consistente com `deploy-production.yml:141`, "`migrate
deploy` NÃO cria papel").

---

## §4 — Modelagem

### 4.1 Sem migração. O objeto novo é um PAPEL de cluster, criado por procedimento

`scripts/db-runtime-role.sh` (bash, `set -euo pipefail`, padrão de `scripts/rbac-provision-drill.sh` /
`restore-drill.sh`): entradas por ambiente — `DB_RUNTIME_ROLE` (default `erp_runtime`), `DB_RUNTIME_PASSWORD`
(**obrigatória**, nunca ecoada), `DB_MIGRATOR_ROLE` (default: o usuário da conexão — é quem cria as tabelas), conexão
pelas variáveis padrão `PG*`/`psql` (no initdb.d do `postgres:16`: `--username "$POSTGRES_USER" --dbname
"$POSTGRES_DB"`, socket local). SQL via `psql -v ON_ERROR_STOP=1 -v role=… -v password=… -v migrator=…`, **idempotente**
(rodar N vezes = mesmo estado; a segunda execução **reafirma** os atributos, para que um papel pré-existente com
`BYPASSRLS` seja corrigido, não aceito):

```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', :'role', :'password');
  END IF;
END $$;
ALTER ROLE :"role" WITH LOGIN PASSWORD :'password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE :"db" TO :"role";
GRANT USAGE ON SCHEMA public TO :"role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"role";          -- as existentes (P-l: 'f' sem isto)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"role";  -- as futuras (P-l: 't')
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO :"role";
-- auto-verificação: o script sai com erro se o papel escapar de RLS por atributo ou por pertença
SELECT rolname, rolsuper, rolbypassrls,
       EXISTS (SELECT 1 FROM pg_roles b WHERE (b.rolsuper OR b.rolbypassrls) AND pg_has_role(:'role', b.oid, 'MEMBER')) AS escapa,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity AND pg_get_userbyid(c.relowner) = :'role') AS tabelas_force_de_posse
FROM pg_roles WHERE rolname = :'role';
```

**O que o procedimento NÃO faz, de propósito:** não concede `EXECUTE` em `auth_login_candidates(text)` (é o passo 5 do
runbook B-O6R-01, ato humano com decisão registrada); não dá `CREATEROLE`, `TRUNCATE`, DDL nem posse; não toca
`pg_hba`. **`NOINHERIT`** como no arnês da casa (`auth-identity-fixture.ts:337`); a trava cobre a pertença de
qualquer modo.

### 4.2 A trava (E1) — o SQL é o do §2.2, e só ele

Comportamento por caso (os quatro medidos em §0.5): superusuário (G1) → recusa; papel limpo (G2) → passa; superusuário
com outro nome (G3) → recusa; papel limpo membro de `BYPASSRLS` (G4) → recusa. Erro de conexão → até 5 tentativas
(2 s, 4 s, 8 s, 16 s, 32 s) e então **recusa** (fail-closed: não se sobe sem saber com quem se fala; H5 diz o que isso
vira no Fly). Log do veredito: `role`, `bypassing` (n e, na recusa, as linhas `{rolname, rolsuper, rolbypassrls,
is_self}`), `owned_force_rls_tables` — **nunca** URL, host, senha (§2.8).

### 4.3 O compose (E4)

`postgres`: `environment` ganha `DB_RUNTIME_ROLE: erp_runtime`, `DB_RUNTIME_PASSWORD:
local-prod-validation-db-runtime-not-a-secret`, `DB_MIGRATOR_ROLE: postgres`; `volumes` ganha
`./scripts/db-runtime-role.sh:/docker-entrypoint-initdb.d/10-runtime-role.sh:ro` (H1). `migrate`: **inalterado**
(`postgres`, o dono das tabelas). `api`: `DATABASE_URL:
postgresql://erp_runtime:local-prod-validation-db-runtime-not-a-secret@postgres:5432/erp_techsolutions?schema=public`
(placeholder **rotulado**, mesma classe dos cinco secrets da l.62-68; o smoke redige `postgresql://` da saída). A
senha aparece **duas** vezes (init e `api`) — literal de propósito e idêntico, como os `JWT_*` (l.63-66 explica por
que não se interpola o `.env`). Comentário no compose: "volume já iniciado sem o papel ⇒ `down -v`".

---

## §5 — Arquivos tocados (caminhos exatos) e a regra do espelho

| Arquivo | Ação | Módulo de referência (espelho) |
|---|---|---|
| `src/database/runtime-role.ts` | novo | `src/modules/auth/services/login-readiness.ts:196-206` (a consulta a `pg_roles` com timeout; aqui sem "best-effort") |
| `src/database/runtime-role.bootstrap.ts` | novo | `src/infra/jobs/job-worker.bootstrap.ts` (injeção, `started/enforced`, log que nunca é mudo) |
| `src/server.ts` | +1 linha em `main()` + import | `src/server.ts:19` (`startJobWorkerIfEnabled`) |
| `src/config/env.ts` | +1 campo no schema, +1 gate no `superRefine`, +1 default no export | `EVIDENCE_SCANNER` (l.263-265, 540-553, 631-638) — o **mesmo** desenho fail-closed |
| `src/database/rls.ts` | +`forEachTenantRls`, +`assertRowsBelongToTenant` | `cloud-cost-allocation-prisma.repository.ts:340-368,372-…` (B-O6R-06) |
| `src/modules/cloud-usage/cloud-usage-prisma.repository.ts` | ramos sem tenant de `listEvents`/`listDailyAggregates` (l.166-174, 190-198) | `platform-overview-prisma.repository.ts` (leitura de `tenants` + N+1 sob contexto) |
| `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` | +`RlsPrismaCloudChargeRepository`; fábrica l.238-241 devolve o envoltório | `RlsPrismaCloudUsageRepository` (mesmo arquivo de uso, l.142-199) |
| `scripts/db-runtime-role.sh` | novo | `scripts/rbac-provision-drill.sh`, `scripts/restore-drill.sh` |
| `scripts/san3-05-acessos-de-plataforma.mjs` | novo (= Apêndice A) | `scripts/audit-agents-skills.mjs` (varredura gerada) |
| `docker-compose.prod.yml` | `postgres` (env + volume), `api` (URL) | — |
| `docs/deployment.md` | seção nova; tabela dos gates; l.458; runbook B-O6R-01 passos 0 e 5 | — |
| `tests/production-runtime-gates.test.ts` | + casos do `G-DB-ROLE` | o próprio arquivo (baseline PROD_OK) |
| `tests/san3-05-runtime-role-bootstrap.test.ts` | novo | `tests/o6r05-…` do bootstrap do worker (injeção) |
| `tests/san3-05-runtime-role-guard-db.test.ts` | novo | `tests/o6r06-usage-atomic-db.test.ts:610-633` (`createRoleWithoutBypassRls` pelo **arnês único**) |
| `tests/san3-05-leituras-de-plataforma-db.test.ts` | novo | `tests/o6r06-allocation-basis-rls-db.test.ts` (B2′, B7, B8, B11) |
| `tests/san3-05-acessos-de-plataforma-guard.test.ts` | novo | `tests/db-catalog-write-guard.test.ts` (ratchet com mutação) |
| `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md` | §C3 | — |
| `agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md` | novo (molde `comando-template.md`) | `B-SAN3-04a-rbac-catalogo-banco-matriz.md` |
| `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | emendas | — |

---

## §6 — Escopo (§C4) — PERMITIDO e PROIBIDO, caminhos exatos

**PERMITIDO** (e nada mais):
`src/database/**` · `src/config/env.ts` · `src/server.ts` (**nominalmente**: a linha da chamada + import, nada
além) · `src/modules/cloud-usage/cloud-usage-prisma.repository.ts` · `src/modules/cloud-charges/cloud-charge-prisma.repository.ts`
· `docker-compose.prod.yml` · `docs/deployment.md` · `scripts/db-runtime-role.sh` (novo) ·
`scripts/san3-05-acessos-de-plataforma.mjs` (novo) · `tests/production-runtime-gates.test.ts` · `tests/san3-05-*.test.ts`
(novos) · `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` ·
`agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md` (novo) · `agent-orchestration/controle/pendencias.md`
· `agent-orchestration/controle/pendencias-indice.md` (se o gerador de índice o exigir) · `agent-orchestration/docs/status-geral.md`
· `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/omega/juntas/**` (ata, votos — do orquestrador,
não do dev).

**PROIBIDO** (§C4 + fronteira do bloco):
`prisma/**` (schema, migrations, seed) · `.env`, `.env.*`, `.env.example` (a chave nova é opcional; H6) ·
`package.json`, `package-lock.json`, `frontend/package-lock.json`, `pubspec.*` · `.github/workflows/**` (a CI já
roda o compose; se o smoke ficar vermelho, o conserto é no compose/script/código, nunca no workflow) ·
`fly.production.toml`, `fly.staging.toml`, `frontend/fly.*.toml` · `Dockerfile`, `docker-compose.yml` (dev) ·
`src/routes/health.routes.ts` (corpo público; §13) · `src/modules/cloud-cost-allocation/**` (sítio 7 → pendência) ·
`src/modules/auth/**` (a sonda do login e o `runWithTenantContext` ficam como estão) · qualquer outro `src/modules/**`
· `frontend/**`, `mobile/**` · `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.agents/**` · `Kpis/index.html`, `Kpis/app.js`
(nenhuma dimensão nova: o painel hidrata dos JSON) · `docs/revisoes/SAN3/PLANO_SAN3.md` (o §5.2 fala em "quatro"; a
diferença para "sete/cinco métodos" fica registrada na ata e em `pendencias.md`, não editando o plano-mãe).

**Trava de mesmo arquivo (§6 do PLANO_SAN3):** este bloco **precede** `B-SAN3-03` nos dois repositórios de nuvem e
`B-AV-REAL` em `src/config/env.ts`. Nenhum dos dois pode abrir ramo antes do merge deste. P-m confirma que hoje
ninguém está nesses arquivos.

---

## §7 — Critérios de aceite — cada um com a MUTAÇÃO que o deixa vermelho

| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde é medido |
|---|---|---|---|
| A1 | Sob superusuário (`postgres`), a trava recusa: `RuntimeRoleGuardError` `RUNTIME_ROLE_CAN_BYPASS_RLS`, `bypassing ≥ 1`, `is_self = true` | apagar a cláusula `r.rolsuper` da consulta | T6 |
| A2 | Sob superusuário com **outro nome**, recusa (a trava é por atributo) | trocar a consulta por `WHERE rolname = 'postgres'` | T7 |
| A3 | Sob papel `NOSUPERUSER NOBYPASSRLS` que é **membro** de papel `BYPASSRLS`, recusa; após `REVOKE`, passa | trocar por `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user` (a do §5.2) — G4c prova que fica verde-cego | T8 |
| A4 | Sob papel efêmero limpo (arnês `createEphemeralRole`), passa e o log traz `role`, `bypassing: 0`, `owned_force_rls_tables: 0` — e **nenhum** campo com `postgresql://`, `password`, host | remover `$disconnect` na recusa (T9 mede que o processo/loop encerra); logar a `DATABASE_URL` | T9, T4 |
| A5 | `envSchema`: `production` + `skip` → issue em `DATABASE_RUNTIME_ROLE_GUARD`; `production` sem a chave → aceito e `env.DATABASE_RUNTIME_ROLE_GUARD === "enforce"`; `development`/`test` sem a chave → `"skip"`; `test` + `enforce` → aceito | trocar o default de produção para `skip`; apagar o gate do `superRefine`; aceitar um terceiro valor | T1–T3 |
| A6 | `tests/deploy-manifest-parity.test.ts` continua 22/22 **sem** editar manifesto nem `.env.example` | tornar a chave obrigatória (`z.enum(...)` sem `.optional()`) — a lista derivada passa a exigi-la e o compose não a tem | bateria §8 (H6) |
| A7 | Sob papel efêmero, `RlsPrismaCloudUsageRepository.listEvents({janela})` soma os eventos de **2** organizações (hoje `0` — **vermelho-controle no head-base obrigatório**) e devolve ordenado por `occurredAt` | remover `setTenantRlsContext` de dentro do laço; remover a reordenação (asserção de ordem) | T10 |
| A8 | Idem `listDailyAggregates({})` → 2 agregados | idem | T10 |
| A9 | `GET /platform/cloud-usage/summary` via HTTP, app montado com o client do papel efêmero (padrão `san3-04a-…-db.test.ts:64-70`, `globalThis.prisma = efemera.client`), soma `quantity` das 2 organizações | idem A7 | T11 |
| A10 | Sob papel efêmero, `RlsPrismaCloudChargeRepository`: `listAllocationTenantAllocations(run)` → 2; `listTenantCharges(run)` → 2 (e `{tenantId: A}` → 1); `replaceTenantCharges(run, [A, B])` grava 2 e `replace(run, [A])` **apaga a de B** (órfã zero — B7); falha injetada na 2ª volta não deixa linha da 1ª (B8) | apagar `deleteMany` da volta; tirar a transação única (duas transações) | T12 |
| A11 | Canário: uma volta que **não** trocou o GUC lança `rows_from_another_tenant` (mutação executada pelo teste, como o B6′/B9 do B-O6R-06) | remover `assertRowsBelongToTenant` | T12 |
| A12 | Guard gerado (CE-G1): `node scripts/san3-05-acessos-de-plataforma.mjs .` no head da entrega tem **L2b = ∅** e L1 `CRU` = 0; o teste executa o gerador (processo filho) e falha se qualquer linha aparecer; default do membro não previsto = **negar** (linha nova = vermelho) | inserir `new PrismaCloudUsageRepository(this.prismaClient).listEvents(...)` em qualquer ramo; instanciar `PrismaCloudChargeRepository(prisma)` fora do envoltório | T13 |
| A13 | Compose local-prod: `api` conecta como `erp_runtime` (≠ `migrate`), o smoke da CI (`ci.yml:472-477`) passa **com a trava ativa** (`NODE_ENV=production` já está na l.51) | apontar `api.DATABASE_URL` de volta para `postgres` — o boot recusa e o smoke cai na readiness (H1/H4 medem na CI) | job `docker` no head |
| A14 | `scripts/db-runtime-role.sh` é idempotente: 2ª execução = mesmo estado (`pg_roles`, grants, default privileges), e corrige um papel pré-existente com `BYPASSRLS` | rodar com papel pré-criado `BYPASSRLS` e omitir o `ALTER ROLE … NOBYPASSRLS` | T14 (num cluster descartável, `psql` real) |
| A15 | `docs/deployment.md`: a l.458 deixa de afirmar sem mecanismo; a tabela dos gates ganha `G-DB-ROLE`; o runbook B-O6R-01 nomeia o papel de runtime como alvo do `GRANT EXECUTE` | — (documental; a junta lê) | C2 |
| A16 | Registro: pendências `P-INFRA-RLS` e `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` **não** fecham no PR — ficam `EM ANDAMENTO (código mergeado; fecha com a trava verde no ambiente — ato do dono §11)`, como o §4.2 exige ("só fecham com a trava verde no ambiente"); pendências novas do §13 abertas com dono | — | C2/C3 |

**CE-G2 (papel × passo):** os passos HTTP de T11 rodam como `platform_admin` com `platform:cloud-usage:read`
(`src/modules/platform/platform-permissions.ts:15`; rota `platform.routes.ts:45` + `cloud-usage.routes.ts:12`) — permissão
que o papel já tem (`RBAC_MATRIX.md`, `platform_admin` = tudo de plataforma); token assinado com `signAccessToken`
como em `san3-04a-menu-com-permissoes-do-banco-db.test.ts:79,179`.

---

## §8 — Testes: baseline N, meta M ≥ 2N, e a bateria

**Baseline N = 4** — testes que hoje executam código dos arquivos deste bloco (ou as mesmas tabelas) **sob papel real
sem bypass**: `o6r06-usage-atomic-db.test.ts` A7 (l.211: "sem contexto nenhum" → documenta o `0`) e A17 (l.544);
`o6r06-allocation-basis-rls-db.test.ts` B2′ (l.68) e B11 (l.342). Nenhum deles cobre a **trava** (0 testes) nem o
**remédio** dos cinco métodos (0). Contagem de `test(` nas suítes que o bloco estende, para a régua do §C3:
`production-runtime-gates.test.ts` 30 · `deploy-manifest-parity.test.ts` 22 · `o6r06-usage-atomic-db.test.ts` 16 ·
`o6r06-allocation-basis-rls-db.test.ts` 11. Suíte inteira em `origin/main`: 287 arquivos `tests/*.test.ts`, 33 `-db`;
KPI vigente `backend_tests 3052/3054`.

**Meta M ≥ 8 (2N).** O bloco entrega **14**:

| T | Teste | Arquivo | Banco |
|---|---|---|---|
| T1 | `G-DB-ROLE`: `production` + `skip` rejeitado (issue path exato) | `production-runtime-gates.test.ts` | não |
| T2 | `production` sem a chave → aceito, export = `enforce`; `test`/`development` sem a chave → `skip` | idem | não |
| T3 | valor fora do enum rejeitado em qualquer ambiente; `test` + `enforce` aceito | idem | não |
| T4 | bootstrap com client **injetado** (fake): `enforce=false` → `{enforced:false}` + log info; `enforce=true` + posture limpa → passa e loga sem URL/senha; `enforce=true` + `bypassing` → lança `RUNTIME_ROLE_CAN_BYPASS_RLS` **e** chama `$disconnect`; erro de conexão → 5 tentativas e recusa | `san3-05-runtime-role-bootstrap.test.ts` | não |
| T5 | boot de verdade: `assertRuntimeDatabaseRoleIfEnforced({ enforce: true })` com `globalThis.prisma = efemera.client` (padrão `san3-04a`) → passa; com o client `postgres` → recusa | `san3-05-runtime-role-guard-db.test.ts` | sim |
| T6 | A1 (superusuário) | idem | sim |
| T7 | A2 (superusuário com outro nome — papel criado pelo arnês sob `withRoleCatalogLock`, `SUPERUSER`, derrubado no `finally`) | idem | sim |
| T8 | A3 (pertença: `GRANT bypass TO efêmero` → recusa; `REVOKE` → passa; e a consulta ingênua **passa** no mesmo estado — o vermelho-controle da mutação) | idem | sim |
| T9 | A4 (log: campos exatos; ausência de `postgresql://`/`password`/host por varredura do JSON do log, padrão `auth-identity-exposure-scan.test.ts`) | idem | sim |
| T10 | A7 + A8 com **vermelho-controle no head-base** (o teste roda o repositório do head-base? não: o teste é novo; o vermelho-controle é a **execução do mesmo teste contra `origin/main` antes do diff**, colada na ata — `git stash`/worktree do jurado) | `san3-05-leituras-de-plataforma-db.test.ts` | sim |
| T11 | A9 (HTTP, app sob papel efêmero, `platform_admin`) | idem | sim |
| T12 | A10 + A11 (cobrança: 2 lidas, órfã zero, atomicidade, canário por mutação executada) | idem | sim |
| T13 | A12 (gerador como processo filho; L2b = ∅; **mutação executada pelo próprio teste** num diretório temporário com um sítio cru injetado → o gerador o lista → o guard fica vermelho — a forma do `db-catalog-write-guard`) | `san3-05-acessos-de-plataforma-guard.test.ts` | não |
| T14 | A14 (script do papel: 2 execuções, estado idêntico; papel pré-existente `BYPASSRLS` corrigido; auto-verificação sai `≠0` se `escapa`) — precisa de `psql` no PATH (a CI `backend-postgres` tem o cliente do `postgres:16`? **conferir**: se não tiver, T14 roda o mesmo SQL pelo Prisma cru e o `.sh` é provado só pelo job `docker`) | `san3-05-runtime-role-guard-db.test.ts` | sim |

**Regras dos testes `-db`:** papel efêmero **só** pelo arnês (`createEphemeralRole`/`withRoleCatalogLock`;
`o6r06-usage-atomic-db.test.ts:610-618` explica o `XX000 tuple concurrently updated`); os que criam papel entram no
ratchet `db-catalog-write-guard` com contagem congelada (ou pedem ao arnês, que é o caminho preferido); **falha é
vermelho, nunca skip** sob `DATABASE_URL` presente (guard de zero pulos, `ci.yml:274-279` do job `backend-postgres` —
as suítes novas entram na lista `SUITES` **daquele job**… que está em `.github/workflows/ci.yml`, PROIBIDO). **Decisão:**
as três suítes `-db` novas seguem a convenção "auto-pula **declarando** sem `DATABASE_URL`" e rodam no job `backend`
(que tem `DATABASE_URL`, l.34) — o job `backend-postgres` com `SUITES` fica para o bloco que possa tocar o workflow
(`B-ARNES-2`), registrado em §13. A junta confere que **rodaram** no head (TAP colado).

**Bateria de validação (§9 do contrato), na ordem, com `timeout` e `ec` por variável:**

```
npm run check
npm run lint
node --test --import tsx tests/production-runtime-gates.test.ts tests/deploy-manifest-parity.test.ts tests/o6r07b-scanner-failclosed.test.ts tests/cors-env.test.ts tests/portal-env.test.ts     # regressão dos gates (B-O6R-05/07b)
node --test --import tsx tests/san3-05-runtime-role-bootstrap.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts
DATABASE_URL=<descartável> node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts
DATABASE_URL=<descartável> node --test --import tsx tests/o6r06-usage-atomic-db.test.ts tests/o6r06-allocation-basis-rls-db.test.ts tests/o6r06-cost-summary-sum-db.test.ts tests/rls-tenant-isolation.test.ts tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts tests/cloud-usage.test.ts tests/cloud-usage-routes.test.ts tests/cloud-charge-routes.test.ts tests/cloud-charge-markup-rules.test.ts   # regressões dos blocos anteriores
node scripts/san3-05-acessos-de-plataforma.mjs .            # L2b vazio; saída colada na ata
DATABASE_URL=<descartável> npm test                         # suíte inteira (contagem real → KPI)
npm run build
node --check Kpis/app.js && node --test --import tsx tests/kpi-dashboard-charts.test.ts
git diff --check
```

Mais: `grep -n 'DATABASE_RUNTIME_ROLE_GUARD' fly.production.toml fly.staging.toml .env.example` → **vazio** (A6);
`git diff --name-only origin/main...HEAD` ⊆ PERMITIDO (§6); `git grep -n 'PrismaCloudChargeRepository(prisma)' -- src` →
só dentro do envoltório. O compose/smoke é provado pelo job `docker` da CI no head (H1/H4) — o dev **não** o
reproduz localmente se não tiver docker; a junta lê o run.

---

## §9 — KPI (§C3) — no próprio PR

- `Kpis/kpis-latest.json`, `Kpis/kpis-history.json` (append) e `Kpis/kpis-history.md` (append) no mesmo PR; o painel
  `Kpis/index.html` hidrata dos JSON — **nenhuma** dimensão nova (não se toca `app.js`/`index.html`).
- `backend_tests`: **reexecução real** (`DATABASE_URL=<descartável> npm test`, TAP), nunca copiado do `3052/3054`.
  `frontend_smoke_tests` e `flutter_tests`: **carregados com nota** (§C3.3 — o PR não toca `frontend/` nem `mobile/`;
  `git diff --name-only origin/main...HEAD -- frontend mobile` vazio, colado na nota).
- `mvp_demo`/`mvp_vendavel`: **intocados** (o PR não move escopo; fecha itens do gate por mecanismo, mas os itens 9 e
  10 só contam fechados após o ato do dono — §4.2).
- `blocks_completed`: 168 → **169**. `release.block`: "B-SAN3-05 (itens 9 e 10 do §4.1 — código; fecho depende do ato
  do dono)"; `pr` após `gh pr create`; `merge_commit`/`approved_head` **`null` na autoria** (§C3.5; backfill pós-merge
  pelo bloco seguinte); `status: "published_per_pr"`.
- History: 1 linha de justificativa por métrica carregada; menção explícita de que a lista do §5.2 ("quatro") foi
  medida como **sete sítios / cinco métodos dentro + um fora**.

---

## §10 — Junta (§C7) — quórum, composição, papéis, terreno, resiliência

- **Quórum: unanimidade de 3** (§C7.1-ter(b): o bloco toca **segurança e permissão** — papel de banco, gate de boot,
  isolamento). Sem `critico-adversarial` (reservado aos blocos de invariante financeiro; aqui o dinheiro só é
  **lido**). O `§5.2` pede `agente-dba-guardiao` + `agente-secops`; a terceira cadeira é o `guardiao-fail-closed`
  (a lista fechada e o guard são exatamente "enumeração decide privilégio" + "prova por mutação").
- **Objeto:** o SHA do head da entrega com check-runs **concluídos** (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`)
  — inclusive o job `docker` (é ele que prova E4). Sem CI concluída, o inspetor **bloqueia** o start (§C7.1-bis).
- **Cadeiras (≤3 itens cada — P4; medir ≠ julgar onde a medição é pesada):**

| Cadeira | Identidade (nova) | Itens | Veto |
|---|---|---|---|
| C1 papel, grants e compose | `agente-dba-guardiao` | (1) `scripts/db-runtime-role.sh` num cluster **descartável próprio**: idempotência, `NOBYPASSRLS` reafirmado, default privileges medidos como em P-l; (2) G1–G4 **reexecutados** com a constante `RUNTIME_ROLE_GUARD_SQL` do head (não a do plano); (3) compose: `api` ≠ `migrate`, run do job `docker` verde no SHA julgado, `down -v` documentado | sim (§C7.1) |
| C2 segurança do gate e do segredo | `agente-secops` | (1) `G-DB-ROLE` não afrouxável: T1–T3 rodados + mutação própria (default de produção → `skip` deve reprovar); paridade 22/22 sem manifesto tocado; (2) zero segredo: placeholders rotulados e distintos, log da trava sem URL/senha/host (T9 + leitura do código), `/health/*` sem mudança; (3) diff × escopo §6 (nada em PROIBIDO; `server.ts` só a linha) e o registro A16 | **sim** |
| C3 lista fechada e remédio | `guardiao-fail-closed` | (1) gerador rodado no head: L2b = ∅, L1 `CRU` = 0, e **mutação nova** de autoria própria (um sítio cru injetado em módulo que não o de nuvem) fica vermelha em T13; (2) T10–T12 rodados sob papel efêmero **com vermelho-controle no head-base** (mesmo teste, `origin/main`, saída colada); canário por mutação; (3) `aggregateDailyUsage` e `executeCalculationRun` sob o papel: agregam/calculam 2 organizações (a via do job e a via da cobrança, não só o resumo) | sim |

- **Inspetor de terreno** (`inspetor-de-terreno-da-junta`, Fable) antes do voto: worktree por jurado que muta, **cluster
  descartável por jurado** (cada um o seu, porta própria — este plano mostra como subir um sem docker, §0.2),
  `sync-agent-agents.mjs --check` verde, check-runs concluídos no objeto, inelegibilidade por nome, plano de perda.
- **Papéis (§C7.4-bis):** **quem acha** = as três cadeiras (identidades novas; nenhuma participou deste plano);
  **quem planeja** = este `planejador-mestre` (Fable; na revalidação pós-correção o Fable é **obrigatório**, §C7.6);
  **quem desenvolve** = desenvolvedor de identidade nova nomeado pelo orquestrador no comando do bloco, que não vota.
  Ciclo de reprovação → `omega/reprovacoes/R-B-SAN3-05-<ciclo>.md`; no ciclo 3 com `bloqueia`, auditoria da máquina
  antes do ciclo 4 (`D-SEM-TETO-AUDITORIA-NO-3`).
- **Escopo do voto (§C7.1-ter(a)):** `dentro-do-bloco` para os sítios 1–6 e a trava; `pre-existente` (não reprova,
  vira pendência com dono) para o sítio 7, para a suíte `-db` sob papel real (`B-ARNES-2`), para a posse dono ≠ app em
  produção (H3, ato) e para qualquer sítio que o gerador **não** veja hoje (residual §0.4) — com evidência de data
  (migrações `202606xx`; `f4ef511` é a raiz).
- **P1–P6:** evidência incremental em `omega/juntas/votos/B-SAN3-05/<cadeira>-evidencia.md`; voto-arquivo-primeiro
  (`<cadeira>-voto.json`, esqueleto `EM APURAÇÃO` item a item); ≤2 jurados em paralelo; `00-quedas.md`; ata
  `omega/juntas/J-B-SAN3-05.md`.
- **Porteiro pós-merge** (`porteiro-pos-merge`, Fable): revalida promessa × diff, reexecuta o gerador e a contagem de
  KPI, confere A16 e a limpeza §C5, e **libera** (ou não) o próximo alvo da frente 2 (`B-O6R-07c`).

---

## §11 — ATOS DO DONO — o que só você faz, escrito para você ler

> O bloco entrega **pronto**: a trava, o procedimento, o compose e a documentação. Os itens 9 e 10 **só fecham** quando
> a trava estiver **verde no ambiente** — e isso depende de dois atos que o repositório não pode praticar por você
> (`PLANO_SAN3.md` §4.2, l.192). O plano **não decide** nome do papel, senha, nem provedor; abaixo vão os defaults e o
> comando de cada passo. **Nada disto é feito pelo PR. Nada disto é feito antes do merge do PR.**

**Ato 1 — criar o papel de runtime no banco gerenciado de produção (e de staging).**
1. Conecte-se ao banco com a credencial **do migrador** — a mesma URL que está em `PROD_DATABASE_URL` no GitHub
   Environment `production` (é ela que roda `prisma migrate deploy` e `db:provision-rbac`, e é ela que **fica** como
   migrador; para staging, `STAGING_DATABASE_URL`).
2. Escolha o nome do papel (default `erp_runtime`) e uma senha nova, forte, que **não** vai para o repositório nem
   para o chat. Rode, a partir da raiz do repo, no SHA mergeado:
   ```bash
   PGHOST=<host do gerenciado> PGPORT=5432 PGUSER=<usuário do migrador> PGPASSWORD=<senha do migrador> PGDATABASE=<banco> \
   DB_RUNTIME_ROLE=erp_runtime DB_RUNTIME_PASSWORD='<senha nova>' DB_MIGRATOR_ROLE=<usuário do migrador> \
   bash scripts/db-runtime-role.sh
   ```
   O script termina imprimindo **uma** linha: `erp_runtime|f|f|f|0` (rolsuper, rolbypassrls, escapa por pertença,
   tabelas FORCE de posse). Qualquer `t`, ou posse `> 0`, e ele sai com erro — não siga para o Ato 2.
3. Se o provedor **não** deixar criar papel (`CREATE ROLE` recusado): pare e registre em
   `agent-orchestration/controle/` — é decisão de provedor (§10.2 do PLANO_SAN3), não deste bloco.

**Ato 2 — trocar o secret do app (e só ele).**
4. `fly secrets set DATABASE_URL='postgresql://erp_runtime:<senha nova>@<host>:5432/<banco>?schema=public' -c fly.production.toml`
   (staging: `-c fly.staging.toml`). **Não** troque `PROD_DATABASE_URL`/`STAGING_DATABASE_URL` no GitHub: o migrador
   continua sendo o dono das tabelas (é isso que mantém "dono ≠ app", `docs/deployment.md:489-495`).
5. Faça o deploy pela pipeline de sempre. A trava é a prova: **o app sobe** ⇒ o papel não escapa de RLS. Confira no log
   (`fly logs -c fly.production.toml`) a linha `runtime database role verified` com `bypassing: 0` e `owned_force_rls_tables: 0`.
   Se o app **não** subir e o log disser `RUNTIME_ROLE_CAN_BYPASS_RLS`, o secret ainda aponta para um papel que escapa
   (H2): volte ao passo 4; a máquina anterior continua servindo até um deploy bem-sucedido (H5).
6. Depois, os dois efeitos que você deve **ver**: `GET /api/v1/platform/cloud-usage/summary` (como admin de plataforma)
   continua somando as organizações (item 10 — antes deste bloco ele zeraria neste exato momento); e `login_without_org`
   no `/health/ready` passa a `inactive`/`inert_no_execute` **até** o passo 5 do runbook B-O6R-01 conceder
   `GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime` — decisão sua, registrada em ata,
   como o runbook já pede (`docs/deployment.md:461-500`).

**O que muda no registro quando os dois atos estiverem feitos:** `P-INFRA-RLS` e `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS`
passam de `EM ANDAMENTO` para `FECHADA`, com a linha do log do passo 5 como evidência; os itens 9 e 10 do §4.1
fecham. Até lá, o PR mergeado é **código pronto, ato pendente** — e é assim que o §4.2 manda contar.

---

## §12 — Riscos e rollback

| R | Risco | Mitigação | Rollback |
|---|---|---|---|
| R1 | A trava recusa o boot em produção porque o secret ainda é o papel antigo (H2) | é o comportamento desejado; §11 antes do deploy; H5 mostra o que se vê | `fly secrets set DATABASE_URL=<anterior>` **ou** `flyctl deploy --image <sha-anterior>` (Runbook A) — o código anterior não tem trava |
| R2 | Tabela nova de uma migração futura sem grant para o papel (`42501` no 1º acesso) | `ALTER DEFAULT PRIVILEGES FOR ROLE <migrador>` (P-l, `t`); o script pede o migrador **explicitamente** | rodar o script de novo (idempotente) — regrant das existentes |
| R3 | `N+1` por organização no resumo de plataforma e no cálculo de cobrança | precedente aceito (`platform-overview`, B-O6R-06); uma transação por chamada; nota de escala no código | — (é leitura) |
| R4 | Blip do banco no boot vira crash-loop (5 tentativas/62 s e recusa) | trade-off declarado: fail-closed > subir sem saber com quem fala; Fly reinicia; readiness já era 503 nesse blip | — |
| R5 | Posse dono = app em algum ambiente (a trava **reporta**, não recusa) | log `owned_force_rls_tables`; H3 na ativação; deployment.md:489-495 | ato do dono (dono dedicado) — fora do bloco |
| R6 | Compose com volume antigo sem o papel (init só na 1ª subida) | comentário no compose; CI faz `down -v` | `docker compose -f docker-compose.prod.yml down -v` |
| R7 | O `.sh` montado em `initdb.d` sem bit de execução (checkout Windows) é **sourced** pelo entrypoint | script auto-contido, sem `exit` em caminho feliz, `set -euo pipefail` compatível com o entrypoint (`-Eeo pipefail`) | H1 na CI |
| R8 | `login_without_org` fica `inactive` após a troca até o GRANT humano | é o desenho do B-O6R-01 (janela longa e reportada, `health.routes.ts:40-45`) | passo 6 do §11 |
| R9 | O gerador (aproximação estática) não vê um sítio cru novo com receptor de nome exótico | residual declarado (§0.4); T13 tem mutação **nova** por jurado; a medição dinâmica é o árbitro | — |
| R10 | `take: 100_000` retirado de `listAllocationTenantAllocations` | espelha o B-O6R-06; a junta ratifica ou pede teto por tenant (decisão declarada, não silenciosa) | reintroduzir por tenant |

**Rollback do PR inteiro:** `git revert` do squash — nenhuma migração, nenhum objeto de banco criado pelo código; o
papel criado pelo dono (se já criado) é inerte enquanto o secret não o usar.

---

## §13 — O que este plano NÃO pega (pendências nomeadas, com dono)

| Pendência (a abrir no PR) | O quê | Dono proposto |
|---|---|---|
| `P-SAN3-05-LEITURA-MORTA-PROJECAO-DIARIA` | sítio 7: `cloud-cost-allocation-prisma.repository.ts:238` (`listUsageDailyAggregates`) lê `cloud_usage_daily_aggregates` sem contexto e **não tem chamador** em `src/` (só a sonda de teste); remover ou envolver | `B-O6R-08` (dono da projeção diária, `P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA`) |
| `P-SAN3-05-LACO-POR-TENANT-DUPLICADO` | `forEachTenantInOneTx`/`assertRowsBelongToTenant` privados em `cloud-cost-allocation-prisma.repository.ts:340-380` × os públicos novos em `src/database/rls.ts` — a mesma verdade em dois lugares | `B-SAN3-03` (próximo a tocar os repositórios de nuvem, §6 do PLANO_SAN3) |
| `P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL` | a suíte `-db` inteira sob papel `NOSUPERUSER NOBYPASSRLS` (13 suítes escrevem catálogo, 8 fazem DDL — P-n); `SUITES` do job `backend-postgres` para as 3 suítes novas | `B-ARNES-2` (já nomeado no §5.2) |
| `P-SAN3-05-POSTURA-NO-HEALTH` | reportar a postura do papel (`database_role: isolated`) no `/health/ready` **fora** de `checks`, como o `login_without_org` — corpo público, `src/routes/health.routes.ts` fora da fronteira | bloco de observabilidade (a nomear pelo orquestrador) |
| `P-SAN3-05-POSSE-DONO-DIFERENTE-DO-APP` | exigir (não só reportar) dono ≠ app no boot, quando todo ambiente tiver dois papéis | `B-SAN3-10` (go-live; H3 é passo da ativação) |
| (registro, não pendência) | o `§5.2` diz "quatro leituras"; medido: sete sítios, cinco métodos dentro + um fora; a consulta do teste de encerramento do §5.2 é cega à pertença (G4c) — este plano a substitui por `pg_has_role` | ata da junta + emenda em `pendencias.md` (`P-INFRA-RLS`) |

Também fora: mudar o usuário de `db:provision-rbac`/`migrate` (continuam com o migrador); `docker-compose.yml` de
dev; qualquer mudança em `.github/workflows/**`; `.env.example` (chave opcional); os `fly.*.toml`.

---

## §14 — Comando do bloco (para o orquestrador colar em `agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md`)

`# B-SAN3-05 — o papel de runtime não escapa de RLS (itens 9 e 10)` · **Objetivo** §1 · **Fontes** §0 deste plano ·
**Regras** §2 e §4 (o SQL da trava é o do §2.2, byte a byte; nenhum privilégio além de DML+USAGE; nada em `/health`) ·
**Escopo PERMITIDO/PROIBIDO** §6 · **Rito** §10 (inspetor → dev → junta unânime de 3 → porteiro) · **Teste de
encerramento** §7 A1–A16 com T1–T14 · **Bateria** §8 · **KPI** §9 · **DoD** §10 do contrato + A16 · **Atos do dono**
§11 (fora do PR) · **Rastreabilidade**: `pr`, `merge_commit`, `approved_head`, `J-B-SAN3-05.md`, `published_per_pr`.

---

## Apêndices

- **A** — o gerador da lista fechada, verbatim, e a saída completa no head `3b1fe0f9`.
- **B** — o script de medição sob papel real, verbatim, e a saída completa (22 itens).

---

## Apêndice A — o gerador da lista fechada (verbatim) e a saída no head `3b1fe0f9`

Arquivo que o desenvolvedor commita como `scripts/san3-05-acessos-de-plataforma.mjs` (uso: `node scripts/san3-05-acessos-de-plataforma.mjs . [--all]`). Dependência única: o `typescript` já presente em `node_modules` (5.9.3). md5 do fonte medido: `e8861755e1c960bbf41a48ce270ac445`.

```js
#!/usr/bin/env node
// B-SAN3-05 — GERADOR da lista fechada de acessos de PLATAFORMA a tabelas sob FORCE ROW LEVEL SECURITY.
//
// PROPRIEDADE (não lista de nomes): "acesso (leitura ou escrita) a uma tabela com FORCE RLS executado num
// executor SEM contexto de tenant (`app.current_tenant_id`) — que só devolve linhas (ou só grava) quando o
// papel de banco é superusuário ou tem BYPASSRLS".
//
// Método, em 3 camadas, todas GERADAS da fonte:
//   L0  tabelas com FORCE RLS  ← prisma/migrations/**/migration.sql  (ALTER TABLE … FORCE ROW LEVEL SECURITY)
//       tabela → model → acessor Prisma (lcfirst(model)) ← prisma/schema.prisma (@@map)
//   L1  todo call-site `<recv>.<acessor>.<op>(…)` e todo `$queryRaw*/$executeRaw*` cujo SQL cite a tabela,
//       em src/**/*.ts, com o RECEPTOR e o ENVOLTÓRIO de contexto (AST do TypeScript, não regex de linha).
//   L2  para receptores injetados (`this.client`/`this.prismaClient`/`this.prisma`), os sítios `new Classe(arg)`
//       e a classificação do `arg` (tx de contexto × client cru).
//
// Saída: TSV `file:line | receptor | acessor.op | tabela | contexto | classificação`
//   contexto  = withTenantRls | forEachTenantInOneTx | $transaction+setTenantRlsContext | (nenhum)
//   classificação:
//     SOB-CONTEXTO         receptor é o tx de um envoltório que seta o GUC
//     CRU                  receptor é o client raiz (prisma / this.prismaClient / this.prisma / client raiz)
//     INJETADO             receptor é executor injetado (this.client) — decidido em L2 por quem instancia
//     RAW-SQL              SQL cru citando tabela FORCE (classificação pelo receptor idem)
//
// Uso: node leituras-de-plataforma.mjs <repo-root> [--all]   (sem --all: só CRU/INJETADO-cru e RAW-SQL cru)
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const repo = path.resolve(process.argv[2] ?? ".");
const showAll = process.argv.includes("--all");
const require = createRequire(path.join(repo, "package.json"));
const ts = require("typescript");

// ---------- L0 ----------
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const migrationFiles = walk(path.join(repo, "prisma/migrations")).filter((f) => f.endsWith("migration.sql"));
const FORCE = new Set();
const ENABLE = new Set();
for (const f of migrationFiles) {
  const sql = readFileSync(f, "utf8");
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+FORCE ROW LEVEL SECURITY/gi)) FORCE.add(m[1].toLowerCase());
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+ENABLE ROW LEVEL SECURITY/gi)) ENABLE.add(m[1].toLowerCase());
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+NO FORCE ROW LEVEL SECURITY/gi)) FORCE.delete(m[1].toLowerCase());
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+DISABLE ROW LEVEL SECURITY/gi)) ENABLE.delete(m[1].toLowerCase());
}

const schema = readFileSync(path.join(repo, "prisma/schema.prisma"), "utf8");
const modelToTable = new Map();
let current = null;
for (const line of schema.split(/\r?\n/)) {
  const m = line.match(/^model\s+(\w+)\s*\{/);
  if (m) current = m[1];
  const map = line.match(/@@map\("([^"]+)"\)/);
  if (map && current) modelToTable.set(current, map[1]);
}
const accessorToTable = new Map();
for (const [model, table] of modelToTable) {
  if (FORCE.has(table)) accessorToTable.set(model[0].toLowerCase() + model.slice(1), table);
}

const OPS = new Set([
  "findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate",
  "groupBy", "create", "createMany", "createManyAndReturn", "update", "updateMany", "upsert", "delete",
  "deleteMany",
]);
const RAW = new Set(["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"]);
// Envoltórios de contexto: os nomeados em src/database/rls.ts e os que o repositório injeta como "runner"
// (`runWithTenantContext`, cujo valor de produção é `(tenantId, work) => withTenantRls(prisma, tenantId, work)`
// em src/modules/auth/auth-runtime.ts:82 e session-admin.service.ts:288). Qualquer método/função cujo corpo
// chame withTenantRls/setTenantRlsContext e receba callback também conta (coletado por arquivo, abaixo).
const CONTEXT_WRAPPERS = new Set([
  "withTenantRls", "forEachTenantInOneTx", "withIdentityRls", "withTenantContext", "runWithTenantContext",
]);
const CONTEXT_SETTERS = /setTenantRlsContext\(|setIdentityRlsContext\(|app\.current_tenant_id/;

// ---------- L1 ----------
const srcFiles = walk(path.join(repo, "src")).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"));
const rows = [];
const injectedClasses = new Map(); // className -> Set(file)

function isFunctionLike(n) {
  return ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n);
}

function contextOf(node, sf) {
  // sobe até a função envolvente mais próxima; se ela é argumento de um envoltório de contexto, ou de
  // `$transaction` cujo corpo seta o GUC ANTES (posição) do sítio, o sítio está SOB CONTEXTO.
  let n = node;
  while (n) {
    if (isFunctionLike(n)) {
      const parent = n.parent;
      if (parent && ts.isCallExpression(parent) && parent.arguments.includes(n)) {
        const callee = parent.expression.getText(sf);
        const name = callee.split(".").pop();
        if (CONTEXT_WRAPPERS.has(name)) return name;
        if (name === "$transaction") {
          const body = n.body.getText(sf);
          const before = sf.text.slice(n.body.getStart(sf), node.getStart(sf));
          if (CONTEXT_SETTERS.test(before)) return "$transaction+setTenantRlsContext";
          if (CONTEXT_SETTERS.test(body)) return "$transaction+setter-depois?";
          return "$transaction-SEM-setter";
        }
      }
      // método de classe / função nomeada: continua subindo só se for callback; método → para.
      if (ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n)) return null;
    }
    n = n.parent;
  }
  return null;
}

function classify(recv, ctx) {
  if (ctx && ctx !== "$transaction-SEM-setter" && ctx !== "$transaction+setter-depois?") return "SOB-CONTEXTO";
  if (/^(tx|trx|transaction)$/.test(recv)) return ctx ? "SOB-CONTEXTO" : "TX-SEM-ENVOLTORIO?";
  if (/^this\.client$/.test(recv) || /^this\.executor$/.test(recv) || /^client$/.test(recv) || /^executor$/.test(recv)) return "INJETADO";
  if (/^(prisma|this\.prismaClient|this\.prisma|prismaClient|this\.db|db)$/.test(recv)) return "CRU";
  return "OUTRO(" + recv + ")";
}

for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const rel = path.relative(repo, file).replace(/\\/g, "/");
  let enclosingClass = null;
  let enclosingMethod = null;

  function visit(node) {
    if (ts.isClassDeclaration(node) && node.name) {
      const prev = enclosingClass;
      enclosingClass = node.name.text;
      ts.forEachChild(node, visit);
      enclosingClass = prev;
      return;
    }
    if (ts.isMethodDeclaration(node) && node.name) {
      const prev = enclosingMethod;
      enclosingMethod = node.name.getText(sf);
      ts.forEachChild(node, visit);
      enclosingMethod = prev;
      return;
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const op = node.expression.name.text;
      const target = node.expression.expression;
      if (OPS.has(op) && ts.isPropertyAccessExpression(target)) {
        const accessor = target.name.text;
        const table = accessorToTable.get(accessor);
        if (table) {
          const recv = target.expression.getText(sf);
          const ctx = contextOf(node, sf);
          const cls = classify(recv, ctx);
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          rows.push({ loc: `${rel}:${line}`, recv, what: `${accessor}.${op}`, table, ctx: ctx ?? "(nenhum)", cls, klass: enclosingClass, method: enclosingMethod });
          if (cls === "INJETADO" && enclosingClass) {
            if (!injectedClasses.has(enclosingClass)) injectedClasses.set(enclosingClass, new Set());
            injectedClasses.get(enclosingClass).add(rel);
          }
        }
      }
      if (RAW.has(op)) {
        const full = node.getText(sf);
        for (const table of FORCE) {
          if (new RegExp(`\\b${table}\\b`).test(full)) {
            const recv = target.getText(sf);
            const ctx = contextOf(node, sf);
            const cls = classify(recv, ctx);
            const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
            rows.push({ loc: `${rel}:${line}`, recv, what: `RAW-SQL(${op})`, table, ctx: ctx ?? "(nenhum)", cls, klass: enclosingClass, method: enclosingMethod });
          }
        }
      }
    }
    // tagged template: prisma.$queryRaw`...`
    if (ts.isTaggedTemplateExpression(node) && ts.isPropertyAccessExpression(node.tag) && RAW.has(node.tag.name.text)) {
      const full = node.getText(sf);
      for (const table of FORCE) {
        if (new RegExp(`\\b${table}\\b`).test(full)) {
          const recv = node.tag.expression.getText(sf);
          const ctx = contextOf(node, sf);
          const cls = classify(recv, ctx);
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          rows.push({ loc: `${rel}:${line}`, recv, what: `RAW-SQL(${node.tag.name.text})`, table, ctx: ctx ?? "(nenhum)", cls, klass: enclosingClass, method: enclosingMethod });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

// ---------- L2: quem instancia as classes com executor injetado ----------
const instantiations = [];
for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const rel = path.relative(repo, file).replace(/\\/g, "/");
  function visit(node) {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && injectedClasses.has(node.expression.text)) {
      const arg = node.arguments?.[0]?.getText(sf) ?? "";
      const ctx = contextOf(node, sf);
      const cls = classify(arg, ctx);
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      // USO da instância: método encadeado, variável local, campo de classe ou retorno de fábrica.
      let usage = "?";
      const p = node.parent;
      if (p && ts.isPropertyAccessExpression(p) && p.expression === node) {
        usage = `.${p.name.text}()`;
      } else if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
        const v = p.name.text;
        let scope = p; while (scope && !isFunctionLike(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
        const body = scope.getText(sf).slice(node.getEnd() - scope.getStart(sf));
        const ms = [...body.matchAll(new RegExp(`\\b${v}\\.(\\w+)\\(`, "g"))].map((m) => m[1]);
        usage = ms.length ? `var ${v} → .${[...new Set(ms)].join("() .")}()` : `var ${v} → (sem chamada)`;
      } else if (p && (ts.isPropertyDeclaration(p) || ts.isParameter(p)) && ts.isIdentifier(p.name)) {
        const fld = p.name.text;
        let cls_ = p; while (cls_ && !ts.isClassDeclaration(cls_)) cls_ = cls_.parent;
        const body = cls_ ? cls_.getText(sf) : "";
        const ms = [...body.matchAll(new RegExp(`this\\.${fld}\\.(\\w+)\\(`, "g"))].map((m) => m[1]);
        usage = ms.length ? `campo ${fld} → .${[...new Set(ms)].join("() .")}()` : `campo ${fld} → (sem chamada)`;
      } else if (p && (ts.isReturnStatement(p) || ts.isArrowFunction(p) || ts.isAwaitExpression(p))) {
        usage = "FÁBRICA/retorno → todos os métodos (quem consome decide)";
      }
      instantiations.push({ loc: `${rel}:${line}`, klass: node.expression.text, arg, ctx: ctx ?? "(nenhum)", cls, usage });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

// ---------- saída ----------
console.log(`# L0: tabelas ENABLE=${ENABLE.size} FORCE=${FORCE.size} · acessores Prisma em FORCE=${accessorToTable.size} · src/**/*.ts=${srcFiles.length}`);
console.log(`# L1: call-sites sobre tabelas FORCE = ${rows.length}`);
const byCls = {};
for (const r of rows) byCls[r.cls] = (byCls[r.cls] ?? 0) + 1;
console.log(`# L1 por classificação: ${JSON.stringify(byCls)}`);
console.log(`# L2: classes com executor injetado = ${injectedClasses.size}; instanciações achadas = ${instantiations.length}`);
const instByCls = {};
for (const i of instantiations) instByCls[i.cls] = (instByCls[i.cls] ?? 0) + 1;
console.log(`# L2 por classificação do argumento: ${JSON.stringify(instByCls)}`);
console.log("");
console.log("## L1 — call-sites CRUS (receptor = client raiz, sem envoltório de contexto)");
for (const r of rows.filter((r) => r.cls === "CRU" || r.cls.startsWith("OUTRO") || r.cls.startsWith("TX-SEM") )) {
  console.log(`${r.loc}\t${r.recv}\t${r.what}\t${r.table}\t${r.ctx}\t${r.cls}`);
}
console.log("");
console.log("## L2 — instanciações de classes com executor INJETADO usando client CRU (todo método dessas classes que toque tabela FORCE roda sem contexto)");
for (const i of instantiations.filter((i) => i.cls === "CRU" || i.cls.startsWith("OUTRO") || i.cls === "INJETADO")) {
  console.log(`${i.loc}\tnew ${i.klass}(${i.arg})\t${i.ctx}\t${i.cls}\t${i.usage}`);
}
console.log("");
console.log("## L2b — call-sites sobre tabela FORCE ALCANÇÁVEIS a partir das instanciações CRUS (método usado × método do call-site)");
const reach = new Map(); // klass -> Set(method) | "*"
for (const i of instantiations.filter((i) => i.cls === "CRU" || i.cls.startsWith("OUTRO"))) {
  const ms = [...i.usage.matchAll(/\.(\w+)\(\)/g)].map((m) => m[1]);
  if (!reach.has(i.klass)) reach.set(i.klass, new Set());
  if (i.usage.startsWith("FÁBRICA")) reach.get(i.klass).add("*");
  for (const m of ms) reach.get(i.klass).add(m);
}
for (const r of rows.filter((r) => r.cls === "INJETADO" && reach.has(r.klass))) {
  const set = reach.get(r.klass);
  if (set.has("*") || set.has(r.method)) console.log(`${r.loc}\t${r.klass}.${r.method}\t${r.recv}\t${r.what}\t${r.table}\t${set.has("*") ? "via fábrica" : "via chamada direta"}`);
}
if (showAll) {
  console.log("");
  console.log("## TODOS os call-sites (--all)");
  for (const r of rows) console.log(`${r.loc}\t${r.recv}\t${r.what}\t${r.table}\t${r.ctx}\t${r.cls}\t${r.klass ?? ""}`);
  console.log("");
  console.log("## TODAS as instanciações (--all)");
  for (const i of instantiations) console.log(`${i.loc}\tnew ${i.klass}(${i.arg})\t${i.ctx}\t${i.cls}`);
}
```

**Saída completa** (`node <gerador> .`, sem `--all`, sobre `origin/main@3b1fe0f9`; colunas separadas por TAB):

```text
# L0: tabelas ENABLE=106 FORCE=106 · acessores Prisma em FORCE=106 · src/**/*.ts=777
# L1: call-sites sobre tabelas FORCE = 642
# L1 por classificação: {"TX-SEM-ENVOLTORIO?":6,"INJETADO":584,"SOB-CONTEXTO":52}
# L2: classes com executor injetado = 70; instanciações achadas = 451
# L2 por classificação do argumento: {"SOB-CONTEXTO":424,"TX-SEM-ENVOLTORIO?":14,"CRU":4,"OUTRO()":4,"INJETADO":5}

## L1 — call-sites CRUS (receptor = client raiz, sem envoltório de contexto)
src/database/rls.ts:57	tx	RAW-SQL($queryRaw)	auth_identity_links	(nenhum)	TX-SEM-ENVOLTORIO?
src/modules/auth/services/identity-link.service.ts:613	tx	RAW-SQL($queryRaw)	auth_identity_links	(nenhum)	TX-SEM-ENVOLTORIO?
src/modules/auth/services/identity-resolver.ts:22	tx	RAW-SQL($queryRaw)	auth_identity_links	(nenhum)	TX-SEM-ENVOLTORIO?
src/modules/auth/services/session-admin.service.ts:163	tx	user.findMany	users	(nenhum)	TX-SEM-ENVOLTORIO?
src/modules/financial-period-closes/financial-period-close-prisma.repository.ts:111	tx	financialTitle.findMany	financial_titles	(nenhum)	TX-SEM-ENVOLTORIO?
src/modules/financial-period-closes/financial-period-close-prisma.repository.ts:115	tx	financialEntry.findMany	financial_entries	(nenhum)	TX-SEM-ENVOLTORIO?

## L2 — instanciações de classes com executor INJETADO usando client CRU (todo método dessas classes que toque tabela FORCE roda sem contexto)
src/modules/cloud-charges/cloud-charge-prisma.repository.ts:240	new PrismaCloudChargeRepository(prisma)	(nenhum)	CRU	FÁBRICA/retorno → todos os métodos (quem consome decide)
src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts:413	new PrismaCloudCostAllocationRepository(prisma)	(nenhum)	CRU	FÁBRICA/retorno → todos os métodos (quem consome decide)
src/modules/cloud-usage/cloud-usage-prisma.repository.ts:173	new PrismaCloudUsageRepository(this.prismaClient)	(nenhum)	CRU	.listEvents()
src/modules/cloud-usage/cloud-usage-prisma.repository.ts:197	new PrismaCloudUsageRepository(this.prismaClient)	(nenhum)	CRU	.listDailyAggregates()
src/modules/core-saas/store/prisma-core-saas.store.ts:38	new UserRepository()	(nenhum)	OUTRO()	campo users → (sem chamada)
src/modules/core-saas/store/prisma-core-saas.store.ts:39	new RoleRepository()	(nenhum)	OUTRO()	campo roles → (sem chamada)
src/modules/core-saas/store/prisma-core-saas.store.ts:40	new UserRoleRepository()	(nenhum)	OUTRO()	campo userRoles → (sem chamada)
src/modules/core-saas/store/prisma-core-saas.store.ts:41	new AuditLogRepository()	(nenhum)	OUTRO()	campo auditLogs → (sem chamada)
src/modules/impound/impound-prisma.repository.ts:165	new PrismaVehicleIdentityRepository(this.client)	(nenhum)	INJETADO	var identityRepo → .resolveOrCreateByPlateKey() .createProvisionalUnidentified()
src/modules/impound/impound-prisma.repository.ts:211	new PrismaImpoundChecklistLinkRepository(this.client)	(nenhum)	INJETADO	var linkRepo → .createLink()
src/modules/impound/impound-prisma.repository.ts:500	new PrismaVehicleIdentityRepository(this.client)	(nenhum)	INJETADO	var identityRepo → .resolveOrCreateByPlateKey()
src/modules/impound/impound-prisma.repository.ts:721	new PrismaYardRepository(this.client)	(nenhum)	INJETADO	FÁBRICA/retorno → todos os métodos (quem consome decide)
src/modules/release/release-prisma.repository.ts:445	new PrismaYardRepository(this.client)	(nenhum)	INJETADO	.vacate()

## L2b — call-sites sobre tabela FORCE ALCANÇÁVEIS a partir das instanciações CRUS (método usado × método do call-site)
src/modules/cloud-charges/cloud-charge-prisma.repository.ts:167	PrismaCloudChargeRepository.replaceTenantCharges	this.client	tenantCloudCharge.deleteMany	tenant_cloud_charges	via fábrica
src/modules/cloud-charges/cloud-charge-prisma.repository.ts:171	PrismaCloudChargeRepository.replaceTenantCharges	this.client	tenantCloudCharge.create	tenant_cloud_charges	via fábrica
src/modules/cloud-charges/cloud-charge-prisma.repository.ts:202	PrismaCloudChargeRepository.listTenantCharges	this.client	tenantCloudCharge.findMany	tenant_cloud_charges	via fábrica
src/modules/cloud-charges/cloud-charge-prisma.repository.ts:220	PrismaCloudChargeRepository.listAllocationTenantAllocations	this.client	tenantCloudCostAllocation.findMany	tenant_cloud_cost_allocations	via fábrica
src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts:238	PrismaCloudCostAllocationRepository.listUsageDailyAggregates	this.client	cloudUsageDailyAggregate.findMany	cloud_usage_daily_aggregates	via fábrica
src/modules/cloud-usage/cloud-usage-prisma.repository.ts:61	PrismaCloudUsageRepository.listEvents	this.client	cloudUsageEvent.findMany	cloud_usage_events	via chamada direta
src/modules/cloud-usage/cloud-usage-prisma.repository.ts:120	PrismaCloudUsageRepository.listDailyAggregates	this.client	cloudUsageDailyAggregate.findMany	cloud_usage_daily_aggregates	via chamada direta
```

---

## Apêndice B — a medição sob papel real (verbatim) e a saída completa

Executado nesta sessão com `cd <repo> && ADMIN_URL=postgresql://postgres@127.0.0.1:54329/erp_san3_05?schema=public npx tsx <scratchpad>/medir-papel.ts` (Postgres 16.13 descartável, migrações de `3b1fe0f9` aplicadas; cria e derruba os papéis `san3_05_*` e a semente; nenhum segredo). É o roteiro dos testes T6–T12: o desenvolvedor **não** o commita como está — o converte em testes pelo arnês único (`createEphemeralRole`), como o §8 pede.

```ts
// B-SAN3-05 — MEDIÇÃO sob papel real `NOSUPERUSER NOBYPASSRLS` num Postgres 16 descartável.
// Roda com: cd <repo> && ADMIN_URL=postgresql://postgres@127.0.0.1:54329/erp_san3_05?schema=public npx tsx <este arquivo>
// Não toca o repositório. Cria e derruba os papéis `san3_05_*`. Nada aqui é segredo (cluster local, trust auth).
import { createRequire } from "node:module";

const REPO = "/home/user/ERP_Techsolutios";
const require = createRequire(`${REPO}/package.json`);
const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

const ADMIN_URL = process.env.ADMIN_URL!;
if (!ADMIN_URL) throw new Error("ADMIN_URL ausente");

const RUNTIME = "san3_05_runtime";
const SUPER2 = "san3_05_super_com_outro_nome";
const BYPASS = "san3_05_bypass_nologin";
const PW = "san3-05-medicao";

const results: Array<{ id: string; item: string; esperado: string; medido: string; ok: boolean }> = [];
function rec(id: string, item: string, esperado: string, medido: unknown) {
  const m = String(medido);
  results.push({ id, item, esperado, medido: m, ok: m === esperado });
}

function urlFor(role: string): string {
  const u = new URL(ADMIN_URL);
  u.username = role;
  u.password = PW;
  return u.toString();
}

// A CONSULTA DA TRAVA (proposta do plano): recusa se o papel corrente É (ou É MEMBRO de) qualquer papel com
// rolsuper ou rolbypassrls. `pg_has_role(current_user, r.oid, 'MEMBER')` é verdadeiro para o próprio papel e
// para toda pertença (direta ou herdada) — cobre o atributo E a porta dos fundos do `SET ROLE`.
const GUARD_SQL = `
  SELECT r.rolname, r.rolsuper, r.rolbypassrls, (r.rolname = current_user) AS is_self
  FROM pg_roles r
  WHERE (r.rolsuper OR r.rolbypassrls) AND pg_has_role(current_user, r.oid, 'MEMBER')
  ORDER BY r.rolname`;

async function main() {
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: ADMIN_URL }) });
  const { withTenantRls } = (await import(`${REPO}/src/database/rls.ts`)) as typeof import("/home/user/ERP_Techsolutios/src/database/rls.js");
  const { RlsPrismaCloudUsageRepository } = (await import(`${REPO}/src/modules/cloud-usage/cloud-usage-prisma.repository.ts`)) as typeof import("/home/user/ERP_Techsolutios/src/modules/cloud-usage/cloud-usage-prisma.repository.js");
  const { PrismaCloudChargeRepository } = (await import(`${REPO}/src/modules/cloud-charges/cloud-charge-prisma.repository.ts`)) as typeof import("/home/user/ERP_Techsolutios/src/modules/cloud-charges/cloud-charge-prisma.repository.js");
  const { PrismaCloudCostAllocationRepository } = (await import(`${REPO}/src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts`)) as typeof import("/home/user/ERP_Techsolutios/src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js");

  // ---- 0. papéis ----
  for (const r of [RUNTIME, SUPER2, BYPASS]) await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${r}"`);
  await admin.$executeRawUnsafe(`CREATE ROLE "${RUNTIME}" LOGIN PASSWORD '${PW}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
  await admin.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${RUNTIME}"`);
  await admin.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${RUNTIME}"`);
  await admin.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${RUNTIME}"`);
  await admin.$executeRawUnsafe(`CREATE ROLE "${SUPER2}" LOGIN PASSWORD '${PW}' SUPERUSER`);
  await admin.$executeRawUnsafe(`CREATE ROLE "${BYPASS}" NOLOGIN BYPASSRLS`);
  await admin.$executeRawUnsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${BYPASS}"`);

  const postura = await admin.$queryRawUnsafe<Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>>(
    `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ($1,$2,$3) ORDER BY rolname`, RUNTIME, SUPER2, BYPASS);
  rec("M0", "postura dos papéis (rolname:rolsuper:rolbypassrls)", `${BYPASS}:false:true,${RUNTIME}:false:false,${SUPER2}:true:false`,
    postura.map((p) => `${p.rolname}:${p.rolsuper}:${p.rolbypassrls}`).join(","));

  // ---- 1. semente (como superusuário, SOB contexto por tenant — como o app grava) ----
  const suffix = `${Date.now()}`;
  const t1 = await admin.tenant.create({ data: { name: `SAN3-05 A ${suffix}`, slug: `san3-05-a-${suffix}` } });
  const t2 = await admin.tenant.create({ data: { name: `SAN3-05 B ${suffix}`, slug: `san3-05-b-${suffix}` } });
  const day = new Date("2026-09-15T12:00:00.000Z");
  for (const [t, n] of [[t1, 3], [t2, 2]] as const) {
    await withTenantRls(admin, t.id, async (tx) => {
      for (let i = 0; i < n; i++) {
        await tx.cloudUsageEvent.create({ data: { tenant_id: t.id, source_type: "medicao", metric_key: "storage_bytes", quantity: 10, unit: "bytes", occurred_at: day, metadata: {} } });
      }
      await tx.cloudUsageDailyAggregate.create({ data: { tenant_id: t.id, date: new Date("2026-09-15T00:00:00.000Z"), metric_key: "storage_bytes", quantity: 10 * n, unit: "bytes", source_type: "medicao", metadata: {} } });
    });
  }
  const allocRun = await admin.cloudCostAllocationRun.create({ data: { provider: "aws", status: "completed", period_start: day, period_end: day, strategy: "usage_weighted_v1", metadata: {} } });
  for (const t of [t1, t2]) {
    await withTenantRls(admin, t.id, (tx) => tx.tenantCloudCostAllocation.create({ data: {
      allocation_run_id: allocRun.id, tenant_id: t.id, provider: "aws", period_start: day, period_end: day, service_code: "AmazonS3", usage_type: "storage",
      cost_category: "storage", allocation_method: "storage_usage_weight", allocation_basis_metric_key: "storage_bytes", allocation_basis_quantity: 10, allocation_ratio: 0.5, allocated_cost: 5, currency: "USD", source_cost_line_item_ids: [], metadata: {} } }));
  }
  const chargeRun = await admin.cloudChargeCalculationRun.create({ data: { status: "completed", period_start: day, period_end: day, source_allocation_run_id: allocRun.id, strategy: "markup_rules_v1", metadata: {} } });
  for (const t of [t1, t2]) {
    await withTenantRls(admin, t.id, (tx) => tx.tenantCloudCharge.create({ data: {
      calculation_run_id: chargeRun.id, tenant_id: t.id, source_allocation_run_id: allocRun.id, period_start: day, period_end: day, allocated_cost: 5, included_cloud_cost: 0, billable_cost: 5,
      markup_type: "percentage", markup_value: 20, minimum_monthly_charge: 0, gross_charge_amount: 6, discount_amount: 0, final_charge_amount: 6, margin_amount: 1, currency: "USD", status: "ready", metadata: {} } }));
  }

  // ---- 2. a trava, sob cada papel ----
  const asAdmin = await admin.$queryRawUnsafe<Array<{ rolname: string }>>(GUARD_SQL);
  rec("G1", "trava sob `postgres` (superusuário): linhas devolvidas > 0 ⇒ RECUSA", "recusa", asAdmin.length > 0 ? "recusa" : "passa");

  const runtime = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlFor(RUNTIME) }) });
  const asRuntime = await runtime.$queryRawUnsafe<Array<{ rolname: string }>>(GUARD_SQL);
  rec("G2", `trava sob \`${RUNTIME}\` (NOSUPERUSER NOBYPASSRLS): 0 linhas ⇒ PASSA`, "passa", asRuntime.length === 0 ? "passa" : `recusa(${asRuntime.map((r) => r.rolname).join(",")})`);

  const super2 = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlFor(SUPER2) }) });
  const asSuper2 = await super2.$queryRawUnsafe<Array<{ rolname: string; is_self: boolean }>>(GUARD_SQL);
  rec("G3", "MUTAÇÃO: superusuário com OUTRO nome ⇒ RECUSA (a trava é por atributo, não por nome)", "recusa", asSuper2.length > 0 ? "recusa" : "passa");
  await super2.$disconnect();

  // porta dos fundos: pertença a papel BYPASSRLS (deployment.md proíbe `GRANT <role_dona> TO <app>`)
  await admin.$executeRawUnsafe(`GRANT "${BYPASS}" TO "${RUNTIME}"`);
  const runtime2 = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlFor(RUNTIME) }) });
  const asMember = await runtime2.$queryRawUnsafe<Array<{ rolname: string; is_self: boolean }>>(GUARD_SQL);
  rec("G4", "MUTAÇÃO: papel limpo que é MEMBRO de papel BYPASSRLS ⇒ RECUSA (pg_has_role)", "recusa", asMember.length > 0 ? `recusa` : "passa");
  // …e a porta é real: SET ROLE + leitura sem GUC devolve tudo
  const backdoor = await runtime2.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE "${BYPASS}"`);
    const [row] = await tx.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM cloud_usage_events WHERE tenant_id IN ('${t1.id}'::uuid,'${t2.id}'::uuid)`);
    return Number(row.n);
  });
  rec("G4b", "a porta dos fundos é real: SET ROLE <bypass> + SELECT sem GUC devolve os 5 eventos", "5", backdoor);
  // a consulta simples do §5.2 (`SELECT rolsuper, rolbypassrls … WHERE rolname = current_user`) NÃO vê a pertença:
  const naive = await runtime2.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`);
  rec("G4c", "a consulta INGÊNUA do §5.2 sob o mesmo papel-membro diz false:false (cega à pertença)", "false:false", `${naive[0].rolsuper}:${naive[0].rolbypassrls}`);
  await runtime2.$disconnect();
  await admin.$executeRawUnsafe(`REVOKE "${BYPASS}" FROM "${RUNTIME}"`);

  // ---- 3. posse das tabelas FORCE (dimensão reportada, não bloqueante) ----
  const [own] = await runtime.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity AND pg_get_userbyid(c.relowner) = current_user`);
  rec("O1", `tabelas FORCE de posse do papel de runtime (dono ≠ app)`, "0", Number(own.n));
  const [ownAdmin] = await admin.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity AND pg_get_userbyid(c.relowner) = current_user`);
  rec("O2", "tabelas FORCE de posse do migrador (`postgres`)", "106", Number(ownAdmin.n));

  // ---- 4. as leituras/escritas de plataforma, com o CÓDIGO REAL, sob o papel de runtime ----
  const usage = new RlsPrismaCloudUsageRepository(runtime);
  rec("P1", "cloud-usage-prisma.repository.ts:173 listEvents({}) [plataforma, sem tenant] — hoje", "0", (await usage.listEvents({ periodStart: new Date("2026-09-01"), periodEnd: new Date("2026-09-30") })).length);
  rec("P1c", "controle positivo: listEvents({tenantId: A}) sob contexto", "3", (await usage.listEvents({ tenantId: t1.id })).length);
  rec("P1d", "controle positivo: listEvents({tenantId: B}) sob contexto", "2", (await usage.listEvents({ tenantId: t2.id })).length);
  rec("P2", "cloud-usage-prisma.repository.ts:197 listDailyAggregates({}) [plataforma] — hoje", "0", (await usage.listDailyAggregates({})).length);
  rec("P2c", "controle positivo: listDailyAggregates({tenantId: A})", "1", (await usage.listDailyAggregates({ tenantId: t1.id })).length);

  const charges = new PrismaCloudChargeRepository(runtime);
  rec("P3", "cloud-charge-prisma.repository.ts:202 listTenantCharges(run) — hoje", "0", (await charges.listTenantCharges(chargeRun.id)).length);
  rec("P4", "cloud-charge-prisma.repository.ts:220 listAllocationTenantAllocations(allocRun) — hoje", "0", (await charges.listAllocationTenantAllocations(allocRun.id)).length);
  rec("P5c", "controle: listTenants() (tabela `tenants` sem RLS) devolve as 2 organizações da semente", "2", (await charges.listTenants()).filter((t) => t.id === t1.id || t.id === t2.id).length);
  let p6 = "sem erro";
  try {
    await charges.replaceTenantCharges(chargeRun.id, [{ calculationRunId: chargeRun.id, tenantId: t1.id, sourceAllocationRunId: allocRun.id, periodStart: day, periodEnd: day, allocatedCost: 5, includedCloudCost: 0, billableCost: 5, markupType: "percentage", markupValue: 20, minimumMonthlyCharge: 0, grossChargeAmount: 6, discountAmount: 0, finalChargeAmount: 6, marginAmount: 1, currency: "USD", status: "ready", metadata: {} }]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    p6 = /row-level security/i.test(msg) ? "42501 row-level security" : `erro: ${msg.slice(0, 80)}`;
  }
  rec("P6", "cloud-charge-prisma.repository.ts:167-171 replaceTenantCharges — hoje (deleteMany silencioso + INSERT recusado)", "42501 row-level security", p6);
  const [sobrou] = await admin.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM tenant_cloud_charges WHERE calculation_run_id = '${chargeRun.id}'::uuid`);
  rec("P6b", "…e o deleteMany sem contexto NÃO apagou nada (as 2 cobranças seguem lá, lidas como superusuário)", "2", Number(sobrou.n));

  const alloc = new PrismaCloudCostAllocationRepository(runtime);
  rec("P7", "cloud-cost-allocation-prisma.repository.ts:238 listUsageDailyAggregates (sem chamador em src) — hoje", "0", (await alloc.listUsageDailyAggregates(day, day)).length);
  rec("P7c", "controle: listTenantAllocations(allocRun) do B-O6R-06 (laço por tenant SOB contexto) devolve 2", "2", (await alloc.listTenantAllocations(allocRun.id)).length);

  // o REMÉDIO proposto (laço por tenant sob contexto, padrão B-O6R-06) — medido aqui como protótipo
  const tenants = await runtime.tenant.findMany({ where: { id: { in: [t1.id, t2.id] } }, select: { id: true } });
  let soma = 0;
  await runtime.$transaction(async (tx) => {
    const { setTenantRlsContext } = await import(`${REPO}/src/database/rls.ts`);
    for (const t of tenants) {
      await setTenantRlsContext(tx, t.id);
      const rows = await tx.cloudUsageEvent.findMany({ where: { tenant_id: t.id } });
      if (rows.some((r) => r.tenant_id !== t.id)) throw new Error("canário: linha de outro tenant");
      soma += rows.length;
    }
  });
  rec("R1", "REMÉDIO (protótipo): laço por tenant sob contexto, mesmo papel, soma os eventos das 2 organizações", "5", soma);

  await runtime.$disconnect();

  // ---- 5. limpeza ----
  for (const t of [t1, t2]) {
    await withTenantRls(admin, t.id, async (tx) => {
      await tx.tenantCloudCharge.deleteMany({ where: { tenant_id: t.id } });
      await tx.tenantCloudCostAllocation.deleteMany({ where: { tenant_id: t.id } });
      await tx.cloudUsageDailyAggregate.deleteMany({ where: { tenant_id: t.id } });
      await tx.cloudUsageEvent.deleteMany({ where: { tenant_id: t.id } });
    });
  }
  await admin.cloudChargeCalculationRun.delete({ where: { id: chargeRun.id } });
  await admin.cloudCostAllocationRun.delete({ where: { id: allocRun.id } });
  await admin.tenant.deleteMany({ where: { id: { in: [t1.id, t2.id] } } });
  for (const r of [RUNTIME, SUPER2, BYPASS]) {
    await admin.$executeRawUnsafe(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "${r}"`);
    await admin.$executeRawUnsafe(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM "${r}"`);
    await admin.$executeRawUnsafe(`REVOKE ALL ON SCHEMA public FROM "${r}"`);
    await admin.$executeRawUnsafe(`DROP ROLE "${r}"`);
  }
  await admin.$disconnect();

  console.log("| id | item | esperado | medido | ok |");
  console.log("|---|---|---|---|:-:|");
  for (const r of results) console.log(`| ${r.id} | ${r.item} | \`${r.esperado}\` | \`${r.medido}\` | ${r.ok ? "✓" : "✗"} |`);
  const bad = results.filter((r) => !r.ok);
  console.log(`\n# ${results.length} itens, ${bad.length} fora do esperado`);
  process.exitCode = bad.length ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 2; });
```

**Saída completa** (exit=0):

| id | item | esperado | medido | ok |
|---|---|---|---|:-:|
| M0 | postura dos papéis (rolname:rolsuper:rolbypassrls) | `san3_05_bypass_nologin:false:true,san3_05_runtime:false:false,san3_05_super_com_outro_nome:true:false` | `san3_05_bypass_nologin:false:true,san3_05_runtime:false:false,san3_05_super_com_outro_nome:true:false` | ✓ |
| G1 | trava sob `postgres` (superusuário): linhas devolvidas > 0 ⇒ RECUSA | `recusa` | `recusa` | ✓ |
| G2 | trava sob `san3_05_runtime` (NOSUPERUSER NOBYPASSRLS): 0 linhas ⇒ PASSA | `passa` | `passa` | ✓ |
| G3 | MUTAÇÃO: superusuário com OUTRO nome ⇒ RECUSA (a trava é por atributo, não por nome) | `recusa` | `recusa` | ✓ |
| G4 | MUTAÇÃO: papel limpo que é MEMBRO de papel BYPASSRLS ⇒ RECUSA (pg_has_role) | `recusa` | `recusa` | ✓ |
| G4b | a porta dos fundos é real: SET ROLE <bypass> + SELECT sem GUC devolve os 5 eventos | `5` | `5` | ✓ |
| G4c | a consulta INGÊNUA do §5.2 sob o mesmo papel-membro diz false:false (cega à pertença) | `false:false` | `false:false` | ✓ |
| O1 | tabelas FORCE de posse do papel de runtime (dono ≠ app) | `0` | `0` | ✓ |
| O2 | tabelas FORCE de posse do migrador (`postgres`) | `106` | `106` | ✓ |
| P1 | cloud-usage-prisma.repository.ts:173 listEvents({}) [plataforma, sem tenant] — hoje | `0` | `0` | ✓ |
| P1c | controle positivo: listEvents({tenantId: A}) sob contexto | `3` | `3` | ✓ |
| P1d | controle positivo: listEvents({tenantId: B}) sob contexto | `2` | `2` | ✓ |
| P2 | cloud-usage-prisma.repository.ts:197 listDailyAggregates({}) [plataforma] — hoje | `0` | `0` | ✓ |
| P2c | controle positivo: listDailyAggregates({tenantId: A}) | `1` | `1` | ✓ |
| P3 | cloud-charge-prisma.repository.ts:202 listTenantCharges(run) — hoje | `0` | `0` | ✓ |
| P4 | cloud-charge-prisma.repository.ts:220 listAllocationTenantAllocations(allocRun) — hoje | `0` | `0` | ✓ |
| P5c | controle: listTenants() (tabela `tenants` sem RLS) devolve as 2 organizações da semente | `2` | `2` | ✓ |
| P6 | cloud-charge-prisma.repository.ts:167-171 replaceTenantCharges — hoje (deleteMany silencioso + INSERT recusado) | `42501 row-level security` | `42501 row-level security` | ✓ |
| P6b | …e o deleteMany sem contexto NÃO apagou nada (as 2 cobranças seguem lá, lidas como superusuário) | `2` | `2` | ✓ |
| P7 | cloud-cost-allocation-prisma.repository.ts:238 listUsageDailyAggregates (sem chamador em src) — hoje | `0` | `0` | ✓ |
| P7c | controle: listTenantAllocations(allocRun) do B-O6R-06 (laço por tenant SOB contexto) devolve 2 | `2` | `2` | ✓ |
| R1 | REMÉDIO (protótipo): laço por tenant sob contexto, mesmo papel, soma os eventos das 2 organizações | `5` | `5` | ✓ |

# 22 itens, 0 fora do esperado
