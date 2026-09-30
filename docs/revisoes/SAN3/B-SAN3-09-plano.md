Papel: planejador-mestre · Modelo: Fable · SHA do worktree: 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
Conferência factual pré-commit: 22 divergências, 22 aplicadas, 0 recusadas (tabela em §0.8; cada uma reexecutada por esta instância antes de aplicar).

# B-SAN3-09 — PLANO — bootstrap do 1º administrador de plataforma (item 43 do §4.1) — ciclo 1

> **Papel:** `planejador-mestre` (identidade nova: nunca planejou, votou nem desenvolveu este bloco) · **modelo:** Fable
> (o fixado no frontmatter — sem fallback) · **medido em:** `origin/main` = `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c`
> (resolvido por `git rev-parse origin/main` em 2026-09-30; o worktree `/home/user/w-b-san3-09` está nesse SHA, `git
> status` vazio antes deste arquivo) · **ramo deste plano:** `docs/plano-b-san3-09`, criado desse SHA · **bloco:**
> `B-SAN3-09` · **branch da entrega:** `feat/bootstrap-platform-admin` (§5.2 do `PLANO_SAN3.md`, l.256).
>
> **Fonte do bloco:** `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 item 43 (l.167), §4.2 (l.193: "1º admin real | script
> testado (`B-SAN3-09`) | executá-lo em produção"), §5.2 (linha `B-SAN3-09`, l.256), §5.6 (CE-G1, CE-G2 — l.322-323),
> §6 (o bloco consta da agenda da frente 2, l.344; **nenhuma** trava de mesmo arquivo nomeia este bloco —
> `grep SAN3-09` no §6 só devolve a agenda), §10 (l.499-532: item 0 "não declarar vendável com ato pendente"; item 2
> provedor). Pendências: `P-SAN-PROD-BOOTSTRAP` (`pendencias.md:574-584`) e, como fronteira do que este bloco **não**
> faz, `P-O6R-B01-PROMOCAO-PLATAFORMA` (`pendencias.md:2549`).
>
> **Regra de leitura (§A7 do contrato):** toda afirmação abaixo diz onde foi medida. **MEDIDO** = comando + saída,
> nesta sessão, sobre `origin/main@3b1fe0f9` (via `git show`/`git grep` na ref) ou sobre um PostgreSQL 16.13
> descartável (porta 54331) com as migrações dessa ref aplicadas e o RBAC provisionado pelo script do CD.
> **HIPÓTESE** = não medido aqui, com o comando exato que a derruba (§0.6). Nenhum SHA foi digitado; nenhum número
> foi copiado de bloco anterior.

---

## §0 — Terreno e LINHA DE BASE (medido por mim, comando + saída)

### 0.1 Referências — resolvidas, não digitadas

```
$ git fetch origin && git rev-parse origin/main
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
$ git rev-parse HEAD ; git branch --show-current ; git status --porcelain | wc -l
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
docs/plano-b-san3-09
0
$ git show origin/main:docs/revisoes/SAN3/PLANO_SAN3.md | grep -n 'SAN3-09'
167:| 43 | `P-SAN-PROD-BOOTSTRAP` — não há caminho versionado para o 1º admin real; é passo do roteiro de operação | 12 | C1 | `B-SAN3-09` | |
193:| 1º admin real | script testado (`B-SAN3-09`) | executá-lo em produção |
256:| `B-SAN3-09` · `feat/bootstrap-platform-admin` | 43 | não há caminho versionado para o 1º admin | `scripts/bootstrap-platform-admin.ts` (novo) + teste | 2 execuções = 1 tenant de sistema + 1 admin; recusa sem a trava de produção | backend | unanimidade + `agente-secops` | — | P |
344:| 2 — isolamento e permissão | `SAN3-04a` 0–5 · `SAN3-05` 5–18 · `07c` 18–31 · `SAN3-04b` 31–36 · `SAN3-09` 36–37,5 · … |
```

`3b1fe0f9` é exatamente o que o mandato esperava — ele mesmo, não um descendente. A linha do §5.2 confere verbatim
com a do mandato.

### 0.2 A máquina de medição e o cluster descartável

```
$ uname -a ; node --version ; git --version
Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
v22.22.2
git version 2.43.0
$ (echo > /dev/tcp/127.0.0.1/54331) 2>/dev/null && echo OCUPADA || echo livre
livre
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/erp_b_san3_09/data -U postgres --auth=trust --no-instructions ; echo initdb exit=$?
initdb exit=0
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/erp_b_san3_09/data -o "-p 54331 -k /var/lib/postgresql/erp_b_san3_09 -c listen_addresses=127.0.0.1" -l /var/lib/postgresql/erp_b_san3_09/server.log -w start
server started
$ psql -h 127.0.0.1 -p 54331 -U postgres -d postgres -Atc "CREATE DATABASE erp_b_san3_09" ; psql … -Atc "SELECT version(); SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='postgres';"
PostgreSQL 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1) on x86_64-pc-linux-gnu …
postgres|t|t
$ DATABASE_URL="postgresql://postgres@127.0.0.1:54331/erp_b_san3_09?schema=public" timeout 300 npx prisma migrate deploy ; echo migrate exit=$?
All migrations have been successfully applied.
migrate exit=0
$ psql … -d erp_b_san3_09 -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'; SELECT count(*) FROM roles; SELECT count(*) FROM tenants; SELECT count(*) FROM users; SELECT count(*) FROM permissions;"
115
0
0
0
2                      # (checklist_runs:reopen e work_orders:approve — as migrações de dados 20260861/20260871)
$ DATABASE_URL="…/erp_b_san3_09…" timeout 300 npm run --silent db:provision-rbac ; echo provision exit=$?
[provisionamento RBAC] papéis do sistema: 12 provisionáveis (platform_admin fica fora por contrato) · 12 criado(s): super_admin, tenant_admin, …
[provisionamento RBAC] concessões: 908 criada(s) · 0 já existiam
[provisionamento RBAC] CONVERGIDO — banco reflete o catálogo. Nenhum dado de demonstração foi criado.
provision exit=0
$ psql … -Atc "SELECT count(*) FROM roles; SELECT count(*) FROM permissions; SELECT count(*) FROM role_permissions; SELECT count(*) FROM tenants; SELECT count(*) FROM users;"
12 · 198 · 908 · 0 · 0
```

Isto é a base que o CD **produz** (`deploy-production.yml:135-164`: `prisma migrate deploy` + `db:provision-rbac`,
"SEM db:seed"), reproduzida aqui pelos mesmos dois comandos: 12 papéis globais (`super_admin` incluso), nenhuma
organização, nenhum usuário. **Que a produção real esteja neste mesmo estado é HIPÓTESE (H8, §0.6)** — a produção é
ambiente do dono e não foi medida daqui; o Ato 0 do §11 é a medição (D20). Um segundo banco **só migrado**
(`erp_b_san3_09_migrated`: `roles = 0`) serve à recusa "RBAC não provisionado". Um papel `san3_09_runtime` (`LOGIN
NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS` + DML em todas as tabelas + `USAGE` nas sequências)
reproduz o papel de runtime que o `B-SAN3-05` manda a produção ter.

**Estado do cluster (D04).** A matriz (Apêndice C) termina em `0/0/0/0/0` — M15 é `--dry-run` em estado limpo. O
conferente encontrou `1/1/1/1/1` (linhas criadas às 10:40Z, depois da matriz das 10:38Z): uma execução avulsa,
posterior à matriz e **não registrada**, tinha convergido o estado; a afirmação anterior deste parágrafo ("fica de pé
com o estado convergido") descrevia esse estado sem dizer que comando o produziu. No fechamento, as mutações do §0.8
(D14, D15) foram reexecutadas nesse cluster e ele foi então **parado e removido** (etapa 3 do mandato de fechamento),
com a porta 54331 provada livre; a junta sobe o dela pela mesma receita (§10).

### 0.3 As premissas do enunciado (e as pistas do orquestrador), uma a uma

| # | Premissa | Estado | Comando → saída |
|---|---|---|---|
| P-a | "Não há caminho versionado para o 1º admin" (item 43) | **MEDIDO — verdadeira** | `git grep -l -E 'bootstrap-platform-admin\|PLATFORM_ADMIN_' origin/main -- tests scripts src` → **vazio**; o mesmo `git grep` sobre `prisma` → só `prisma/seed.ts`. `git ls-tree -r --name-only origin/main -- scripts` → 17 arquivos; nenhum cria organização/usuário/credencial **num banco de produção** (`provision-rbac.ts:32-35` diz que **não** o faz, de propósito; `scripts/rbac-provision-drill.sh:94` insere uma organização `drill-org`, mas só no banco **de drill** que ele mesmo cria e derruba — `git grep -n -i 'insert into "\?tenants' origin/main -- scripts` → só essa linha). Os criadores de admin de plataforma na ref são **dois seeds de demonstração**: `prisma/seed.ts:414-463` (organização **demo**) e `prisma/seed-users.ts:30` (`git show origin/main:prisma/seed-users.ts \| grep -n super_admin` → `30: { role: "super_admin", email: "plataforma.demo@example.com", … }`), ambos barrados em produção por `assertSeedAllowed` (`seed.ts:20`, `seed-users.ts:18`) e pela ausência do passo no CD (`deploy-production.yml:132-134`). Logo: nenhum caminho de **produção** — a premissa vale (D10). |
| P-b | O que é "admin de plataforma" hoje: papel global? tenant especial? claim? | **MEDIDO — é um USUÁRIO de uma organização real, vinculado ao papel GLOBAL `super_admin`; `platform_admin` nunca tem linha em banco** | `scripts/provision-rbac.ts:55-61`: "`platform_admin` fica FORA do provisionamento inteiro … NUNCA teve linha em banco"; `catalog.ts:329-343` `ROLE_AUTHORITY`: `super_admin: "platform"`, `platform_admin: "platform"`; `platform-permissions.ts:33-58`: o gate de `/api/v1/platform/*` é a **presença** de um papel de `PLATFORM_ROLES` no claim `roles`; `jwt.service.ts:31-45` + `auth.routes.ts:273-279`: `roles` = chaves de `user_role_assignments → roles` do usuário **na organização dele**; `authenticated-actor.middleware.ts:38-44`: `actor.tenantId = payload.tenant_id` (UUID real; `"platform"` só existe por *legacy headers*, `persistent-rbac-context.middleware.ts:31-36`). `grep -n 'platform_admin' prisma/migrations` → só comentários (20260861:26, 20260871:28: "não existe como role no banco"). |
| P-c | O que é "tenant de sistema" hoje | **MEDIDO — não existe nenhum marcador**: nenhum código trata uma organização como "de sistema" | `git grep -n -E 'is_system\|isSystem\|system_tenant\|tenant de sistema' origin/main -- src prisma` → **vazio**. O seed vincula o admin de plataforma à organização **demo** (`seed.ts:414-433`, `tenant.id` do slug `demo`). Logo "tenant de sistema" = **uma organização comum, de slug reservado**, cuja única função é hospedar o usuário do admin (`User.tenant_id` é `NOT NULL`/FK `Restrict` — `schema.prisma`, modelo `User`; `pendencias.md:575-576`). Slug escolhido: `platform` (passa em `assertSlug`, `platform-tenants.validator.ts:105-109`: `^[a-z0-9]+(?:-[a-z0-9]+)*$`); nome `Plataforma` (§3 do contrato: linguagem de negócio). |
| P-d | O RBAC (papel `super_admin` + concessões) é do CD, não deste script | **MEDIDO** | `docs/deployment.md:178-181` (Runbook B, verbatim no Apêndice F): "A parte de RBAC saiu deste follow-up … Resta ao bootstrap **só** a organização real, o usuário administrador e a credencial dele — o vínculo usuário↔papel é dado de organização e **nunca** é criado pelo provisionamento". No cluster: após `db:provision-rbac`, `super_admin` global existe com concessões (§0.2). |
| P-e | Quais travas de produção existem, para a do script ser coerente | **MEDIDO — 35 linhas, GERADAS (§0.4; 34 executáveis + 1 de JSDoc, `seed-guard.ts:23` — D03)**: `env.ts` (**19** = 18 gates no `superRefine`, l.318-546, + o default da l.638 — D01), `seed-guard.ts` (`isSeedAllowed`: `NODE_ENV=production` → só `ALLOW_PROD_SEED` estrito `true/1/yes/on`), os três seeds chamam `assertSeedAllowed()` no topo, `seed.ts:547,565` exigem senha em produção, `prisma.ts:19`. **`scripts/*.ts`: 0** — nenhum script tem trava hoje | Apêndice A. Coerência escolhida: **mesma semântica estrita** (`strictBool` = `booleanFlag`, `env.ts:26-34`), **variável própria** `ALLOW_PROD_BOOTSTRAP` (não `ALLOW_PROD_SEED` — ver §0.7 D2), exit code nomeado. |
| P-f | Como o login verifica a credencial (para o script gravar o que o login lê) | **MEDIDO** | `local-auth-login.service.ts:131-217`: `tenants.findById` → `credentials.findByEmailForTenant(email normalizado)` → `verifyPassword(hash)` → `users.findByIdForTenant` (`status === "active"`) → `userRoles.listByUserForTenant`. Hash: `password.service.ts:13-33` `scrypt-v1` (`N=16384 r=8 p=1`, pino em l.135-137). Política: `local-auth-credential.service.ts:196-204` (≥ 8 chars, ≠ e-mail); `buildCredentialData` exige usuário existente e e-mail igual (l.174-182); e-mail normalizado = `trim().toLowerCase()` (`repository.ts:152-154`). |
| P-g | RLS nas tabelas que o bootstrap grava | **MEDIDO no cluster** | `relrowsecurity/relforcerowsecurity`: `tenants f/f` · `users t/t` · `roles t/t` (policy `tenant_id IS NULL OR GUC`, migração `20260608000000:25-27`) · `user_role_assignments t/t` · `local_auth_credentials t/t` · `branches t/t` · `audit_logs t/t` · `permissions f/f` · `role_permissions f/f`. Policy = `"tenant_id"::text = current_setting('app.current_tenant_id', true)` (l.11-13, 18-20, 32-34, 39-41). Sob papel sem `BYPASSRLS` e sem GUC: `INSERT` em `users` → `new row violates row-level security policy` (M10, §0.5). |
| P-h | Unicidade que sustenta a idempotência | **MEDIDO no cluster** | `tenants_slug_key (slug)` · `users_tenant_id_email_key (tenant_id, email)` · `roles_key_tenant_id_key (key, tenant_id)` (NULL não protege — `provision-rbac.ts:65-70`) · `user_role_assignments_unique_global_branch (tenant_id, user_id, role_id) WHERE branch_id IS NULL` (índice parcial: o vínculo sem filial **é** protegido) · `local_auth_credentials_tenant_id_user_id_key` e `_tenant_id_email_key`. FKs: `users.tenant_id → tenants RESTRICT`; `user_role_assignments.role_id → roles RESTRICT`; `local_auth_credentials(tenant_id,user_id) → users CASCADE`. |
| P-i | O padrão de "script TS + teste" da casa | **MEDIDO** | `scripts/backfill-third-party-vehicle-identity.ts:561`: guarda `import.meta.url === file://argv[1] \|\| argv[1].endsWith(...)` — só executa `main()` como script; `tests/backfill-third-party-vehicle-identity.test.ts:6-14` importa as funções puras. `scripts/provision-rbac.ts`: `dotenv/config` + `PrismaPg` + transação com `pg_advisory_xact_lock` (l.70,124) + relatório sem segredo + `--dry-run` que só relata (l.63, 328-331). `prisma/seed-users.ts:70-86`: usuário + vínculo + credencial **sob `withTenantRls`**, credencial pelo `LocalAuthCredentialService`. |
| P-j | O script pode carregar `src/config/env.ts`? | **MEDIDO — NÃO** | `env.ts:599` `envSchema.parse(process.env)` **no import**; `NODE_ENV=production` exige `JWT_SECRET`, `REDIS_URL`, `CORS_ORIGIN`, `PORTAL_*` (gates l.318-546). Controle executado: `import ".../src/modules/auth/index.js"` sob `env -i NODE_ENV=production` → `ZodError … "JWT_SECRET must be set to a production secret."` (exit 1). Os módulos-folha (`src/database/rls.ts`; `auth/repositories/local-auth-credential.repository.ts`; `auth/services/local-auth-credential.service.ts`; `auth/services/password.service.ts`) **não** importam `env.ts` (`grep ^import` em cada um: só `@prisma/client` tipos, `anonymous-login.constants.js` sem imports, `identity-link.service.js` como `import type`) → carregam sob produção sem variável nenhuma (sonda: 9 × `function`, exit 0). |
| P-k | Onde o script roda: dentro da imagem de produção? | **MEDIDO — NÃO; roda de um checkout, como o `migrate` e o `db:provision-rbac`** | `package.json`: `tsx` é **devDependency**; `Dockerfile:34` `npm ci --omit=dev`. `deploy-production.yml:132-164` roda `prisma migrate deploy` e `db:provision-rbac` **da pipeline** com `secrets.PROD_DATABASE_URL` ("a imagem runtime slim não carrega a CLI do Prisma"). O ato do dono (§11) roda o script **de um checkout no SHA mergeado**, com a credencial do migrador. |
| P-l | O segredo entra por onde sem vazar | **MEDIDO** | `ps -o args= -p <pid>` de `PLATFORM_ADMIN_PASSWORD=… node -e … argv-marker` → `node -e setTimeout(()=>{},4000) argv-marker-abc` (argv **visível**; env **não** aparece: 0 ocorrências); `/proc/<pid>/environ` = `-r-------- root` (só o dono do processo/root). Logo: env ou stdin; **nunca argv** (recusa `PASSWORD_IN_ARGV`). |
| P-m | O login pela WEB manda a organização? | **MEDIDO — NÃO por padrão** (`VITE_DEFAULT_TENANT_ID` vazio fora de mock) | `frontend/src/pages/LoginPage.tsx:15-16,26`: `const defaultTenantId = readFrontendEnv("VITE_DEFAULT_TENANT_ID", useMocks ? "ten-industrial-01" : "")` · `const [tenantId] = useState(defaultTenantId)` · `signIn({ tenantId, email, password })` — a tela não tem campo de organização e fora de mock o default é **vazio**; `auth.adapter.ts:59-65` manda `tenantId: credentials.tenantId` como está. (`frontend/src/modules/auth/repository.ts:4-14` também escreve `tenantId = ""`, mas `git grep -n -E 'signInWithCognito\|auth/repository' origin/main -- frontend` → só a própria definição: **código morto** — D09.) Com `VITE_DEFAULT_TENANT_ID` definido no build, a web manda organização — escolha de build do dono, não deste bloco. → `auth.routes.ts:156-174`: `tenantId` vazio ⇒ **caminho anônimo** (`AnonymousLoginService`) ⇒ `public.auth_login_candidates(email)` (`login-candidates.repository.ts:18-25`, `SECURITY DEFINER`). No cluster: dono `postgres`, ACL `{postgres=X/postgres}`; como `postgres` executa; como `san3_09_runtime` → `permission denied for function auth_login_candidates`. Consequência para o dono (§11, Ato 2): depois do `B-SAN3-05` (app ≠ migrador), o admin **só entra pela web** após o runbook B-O6R-01 (`deployment.md:461-516`, passo 5 `GRANT EXECUTE`); pela API com `tenantId` entra imediatamente. |
| P-n | Nenhum ramo em voo toca os arquivos do bloco | **MEDIDO — verdadeiro para a fronteira; 1 ramo toca `package.json`** | gerador `ramos-em-voo.sh` (Apêndice E, verbatim + saída — D17): laço sobre `git for-each-ref refs/remotes/origin` (**141** refs no fechamento, 2026-09-30T12:18Z; o número cresce durante a sessão — 139 na 1ª medição, 140 na conferência; a ref nova `origin/docs/conhecimento-de-terreno` chegou às 10:45:43Z e **não** toca a fronteira) com `git diff --name-only origin/main...<ramo>` filtrado pela fronteira → só `origin/docs/governanca-porteiro-pre-merge-sol → package.json`, igual nas três medições (acrescenta `governance:check`/`governance:allowlist` em `scripts`). Este plano **não toca `package.json`** (§6), exatamente para não abrir trava de mesmo arquivo. |
| P-o | Origem (§C7.1-ter(a)) | **MEDIDO** | `git log --diff-filter=A --date=short -- <arquivo>` devolve `f4ef511 2026-08-11` (a **raiz**, `git rev-list --max-parents=0`) para `provision-rbac.ts`, `seed-users.ts`, `seed-guard.ts`, `password.service.ts`, a migração `20260608000000`. Datação útil: `P-SAN-PROD-BOOTSTRAP` (Ω-INFRA-3, **2026-07-14**), migração `20260608`, `P-O6R-B01-PROMOCAO-PLATAFORMA` (B-O6R-01). Tudo antecede este bloco: a ausência do bootstrap é **pré-existente**; o que este bloco cria é novo. |
| P-p | Testes hoje sobre a propriedade | **MEDIDO — 0 sobre o bootstrap; 4 sobre a trava-irmã** | `git grep -l -E 'bootstrap-platform-admin\|PLATFORM_ADMIN_' origin/main -- tests` → vazio; `tests/seed-guard.test.ts` → **4** `test(` (a família da trava); suíte: **287** arquivos `tests/*.test.ts`, **33** `-db`; KPI vigente `backend_tests 3052/3054`. |

### 0.4 A LISTA GERADA — travas de produção existentes, pela PROPRIEDADE

A propriedade **não é** "o seed-guard"; é: *ponto do código, fora de `src/modules/**`, que decide comportamento
pelo valor `NODE_ENV === "production"` ou pela leitura de um opt-in `ALLOW_PROD_*`*. É dessa família que a trava do
script tem de ser coerente ("recusa sem a trava de produção", §5.2). O gerador (Apêndice A, verbatim) mede **na ref**
(`git grep` sobre `origin/main`, nunca o disco). Saída resumida no head `3b1fe0f9`:

```
$ bash travas-de-producao.sh /home/user/w-b-san3-09 origin/main
# ref=3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c · fonte: git grep na ref (nunca o disco da sessão)
prisma/seed-fleet.ts:17,20 · prisma/seed-guard.ts:23,25,28,29,35,38,41 · prisma/seed-users.ts:15,18 · prisma/seed.ts:17,20,547,565
src/config/env.ts:318,329,346,360,370,382,392,404,419,430,445,456,470,490,500,512,531,546,638 · src/database/prisma.ts:19
# total: 35 linhas executáveis (comentários excluídos)
```

**Rótulo do gerador (D03):** o filtro exclui só linhas iniciadas por `//`; `prisma/seed-guard.ts:23` é linha de JSDoc
(` * ALLOW_PROD_SEED (one-off controlado, …)`) e entra na contagem — leia "35 linhas" como **34 executáveis + 1 de
comentário**. O gerador e a saída ficam verbatim (não se reescreve o que foi medido); controle do filtro apertado
(`grep -v -E '^[^:]+:[0-9]+:\s*(//|\*)'`) → **34**. **Controles do gerador:** (i) um sítio sabido aparece — `prisma/seed-guard.ts` → 7 linhas; (ii) mutação injetada aparece
— num repositório git temporário com `scripts/bootstrap-platform-admin.ts` contendo `if (process.env.NODE_ENV ===
"production") { throw … }`, o gerador, chamado na forma **posicional** (`bash travas-de-producao.sh <tmp> HEAD` — ele lê `$1`/`$2`, não variáveis de ambiente; a forma `ROOT=… REF=…` **não** funciona, D21) lista `scripts/bootstrap-platform-admin.ts:1` e
`total: 1`. **Residual declarado:** só vê a forma literal `NODE_ENV === "production"`/`ALLOW_PROD_*`/`isSeedAllowed`/
`assertSeedAllowed`; um gate escrito como `env.NODE_ENV !== "development"` ou por `booleanFlag` de outro nome não é
visto — o árbitro é a leitura do `superRefine` do `env.ts` (**l.304-597**: abre em `}).superRefine((value, context) => {` e fecha em `});` na l.597 — D02), que este plano leu inteiro por índice de linhas.
**Leitura:** hoje **nenhum** `scripts/*.ts` tem trava de produção — o bootstrap será o primeiro, e por isso espelha a
única trava de "execução manual" que existe (`seed-guard.ts`, l.1-12: "camada de defesa do CONTAINER / execução manual").

### 0.5 A MEDIÇÃO — protótipo executado no cluster: 19 linhas de matriz, 25 execuções do script, 0 fora do esperado

Script do protótipo em Apêndice B (**verbatim**; md5 do texto final `a5f5383dfbbabde9a63205bd40f64782`, 417 linhas —
o desenvolvedor parte dele, trocando nada além do que a junta pedir). A cópia **medida** difere do texto final só nas
**6 linhas de import** reescritas por `sed` para caminhos absolutos do worktree (o scratchpad não tem `node_modules`;
símlink de `node_modules` é proibido — §C7.1-ter(c)). Matriz em Apêndice C (`matriz.sh`, verbatim, e a saída completa).
`E` = `admin@exemplo.com.br`; contagens = `tenants(slug=platform)/users/vínculos super_admin/credenciais/auditorias`.
**Contagem (D05):** `grep -c '^--- M' <saída da matriz>` = **19** linhas de matriz (M1–M16, com M5b/M5c, M8a–g, M9a/b,
M10b e M14a/b desdobrados); `ls run-M*.log | wc -l` = **25** execuções do script; mais a prova de login (M13, Apêndice D) e
a varredura de vazamento (M16). O "24 itens" da versão anterior não correspondia a nenhuma dessas contagens.

| id | item | esperado | medido | ok |
|---|---|---|---|:-:|
| M1 | 1ª execução, `postgres`, base pós-CD | exit 0 · `1/1/1/1/1` | `CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.` · `1/1/1/1/1` · hash `scrypt-v1` | ✓ |
| M2 | 2ª execução idêntica | exit 0 · contagens iguais · hash igual · auditoria 1 | `1/1/1/1/1` · hash igual: SIM | ✓ |
| M3 | `--dry-run` com tudo existente | exit 0 · nada escrito | `simulação encerrada — nada foi escrito` · `1/1/1/1/1` | ✓ |
| M4 | base **só migrada** (`roles = 0`) | exit 2 `RBAC_NOT_PROVISIONED` · nada criado | `RECUSADO (RBAC_NOT_PROVISIONED)` · tenants=0 users=0 | ✓ |
| M5 | `NODE_ENV=production` sem opt-in (`env -i`: sem `JWT_SECRET`, `REDIS_URL`, `CORS_ORIGIN`) | exit 2 `PRODUCTION_OPT_IN_MISSING` | idem | ✓ |
| M5b | `NODE_ENV=production ALLOW_PROD_BOOTSTRAP=false` | exit 2 (estrito) | idem | ✓ |
| M5c | `NODE_ENV=production ALLOW_PROD_SEED=1` (a trava do **seed** não abre o bootstrap) | exit 2 | idem | ✓ |
| M6 | `NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1`, sem nenhuma outra variável | exit 0 (roda; `env.ts` não é carregado) | `CONVERGIDO` · `1/1/1/1/1` | ✓ |
| M7 | outro e-mail com admin existente | exit 2 `ADDITIONAL_ADMIN_REFUSED` · `1/1/1/1/1` | idem | ✓ |
| M8a–g | senha de 8 chars · senha = e-mail · `--password=x` · sem e-mail · sem senha · sem `DATABASE_URL` · e-mail sem `@` | exit 2: `PASSWORD_TOO_WEAK` ×2 · `PASSWORD_IN_ARGV` · `EMAIL_MISSING` · `PASSWORD_MISSING` · `DATABASE_URL_MISSING` · `EMAIL_MISSING` | idem, na ordem | ✓ |
| M9a/b | papel `san3_09_runtime` (`NOSUPERUSER NOBYPASSRLS`), estado limpo: cria; e é idempotente | exit 0 · `1/1/1/1/1` · exit 0 · `1/1/1/1/1` | idem | ✓ |
| M10 | **MUTAÇÃO**: `setTenantRlsContext` removido, mesmo papel | exit 1 · RLS · rollback total | `FALHOU: new row violates row-level security policy for table "users"` · `0/0/0/0/0` | ✓ |
| M10b | a **mesma** mutação sob `postgres` | exit 0 (verde-cego) — por isso a junta mede sob papel real | `1/1/1/1/1` | ✓ |
| M11 | `--password-stdin` (1ª linha da entrada) | exit 0 · `1/1/1/1/1` | idem | ✓ |
| M12 | `--reset-password` com `failed_attempts=4`, `locked_until` futuro | hash muda · `0/NULL` · auditoria +1 | hash mudou: SIM · `0/NULL` · `1/1/1/1/2` | ✓ |
| M13 | prova de login pelas peças reais | `verifyPassword(certa)=true`, `(errada)=false`, papel `super_admin`, `auth_login_candidates(E)` = 1 e é a organização de sistema | idem | ✓ |
| M14 | 2 execuções **simultâneas** em estado limpo | `1/1/1/1/1` (advisory lock) | a: CONVERGIDO · b: CONVERGIDO · `1/1/1/1/1` | ✓ |
| M15 | `--dry-run` em estado limpo | relata "a criar" · `0/0/0/0/0` | `organização … a criar · usuário a criar · vínculo super_admin a criar · credencial a criar` · `0/0/0/0/0` | ✓ |
| M16 | vazamento: senha/hash/`postgresql://` em algum log | nenhum | `grep -l` → vazio | ✓ |

Também medido: `npx tsc --noEmit --strict … bootstrap-platform-admin.medido.ts` → **exit 0** (o `tsconfig.json` só
inclui `src/**` — `scripts/` não passa por `npm run check`; por isso a bateria do §8 roda o `tsc` no script).

### 0.6 HIPÓTESES — o que NÃO foi medido aqui, com o comando que derruba cada uma

| id | Hipótese | Por que não foi medida | Comando que a mede |
|---|---|---|---|
| H1 | Na máquina de onde o dono roda o ato, `NODE_ENV` **não** está exportado — logo a trava só morde se ele a exportar inline (a mesma honestidade de `seed-guard.ts:3-7`) | ambiente do dono | `echo "NODE_ENV=${NODE_ENV:-<vazio>}"`; o §11 manda `NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1` **inline** no único comando, para que a trava seja exercida e o log a registre |
| H2 | A credencial do migrador (`PROD_DATABASE_URL`) tem `INSERT` em `tenants/users/user_role_assignments/local_auth_credentials/audit_logs` (é dona/superusuária) | é segredo | `psql "$PROD_DATABASE_URL" -Atc "SELECT bool_and(has_table_privilege(current_user, t, 'INSERT')) FROM unnest(ARRAY['tenants','users','user_role_assignments','local_auth_credentials','audit_logs']) t"` → `t`. Sob o papel de runtime do `B-SAN3-05` também funciona (M9), desde que tenha DML |
| H3 | Depois do `B-SAN3-18` (gate de módulo no ponto de montagem), as rotas `/api/v1/platform/*` continuam alcançáveis para um `super_admin` cuja organização tem `modules = []` (CE-1: núcleo literal) | bloco futuro | no head pós-`SAN3-18`: T2.8 deste plano (`GET /api/v1/platform/overview` → 200 com a organização `platform` sem módulos) |
| H4 | Em produção, `login_without_org` fica `inert_no_execute` até o passo 5 do runbook B-O6R-01 — como medido no cluster para `san3_09_runtime` | ambiente | `GET /api/v1/health/ready` (o `healthRouter` é montado sob `/api/v1` — `app.ts:114`; é o caminho de `fly.production.toml:76` e de `smoke-production.mjs:95` — D18) → `login_without_org` (`deployment.md:461-468`); `psql "$DATABASE_URL_DO_APP" -Atc "SELECT has_function_privilege(current_user, 'public.auth_login_candidates(text)', 'EXECUTE')"` |
| H5 | O e2e Playwright continua usando o admin do **seed** (`tests/e2e/critical-flows.spec.ts:10-11`) e não este script | fora do bloco | `git grep -n bootstrap -- tests/e2e` → 0 (não muda nada lá) |
| H6 | No job `backend` da CI o usuário `postgres` (`ci.yml:34`) pode `CREATE DATABASE` (é o superusuário da imagem `postgres:16`) — o teste `-db` cria um banco de drill próprio | CI | o próprio run; localmente: `psql "$DATABASE_URL" -Atc "SELECT rolcreatedb OR rolsuper FROM pg_roles WHERE rolname = current_user"` → `t` (no cluster: `postgres\|t\|t`) |
| H7 | O smoke de produção/staging não depende do slug `platform` nem do e-mail do admin | leitura | `git grep -n -E 'platform\b' -- scripts/smoke-production.mjs scripts/smoke-staging.mjs` → nada de slug/organização (o smoke usa `SMOKE_*` do operador) |
| H8 | A produção real está no estado pós-CD que §0.2 reproduziu (`super_admin` global com concessões; `tenants`/`users` vazios) — a versão anterior dizia "byte a byte" sem comando (D20) | ambiente do dono; a produção não é medida daqui | Ato 0 do §11: `psql "$PROD_DATABASE_URL" -Atc "SELECT count(*) FROM roles r WHERE r.key='super_admin' AND r.tenant_id IS NULL AND EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id)"` → `1`; `psql "$PROD_DATABASE_URL" -Atc "SELECT count(*) FROM tenants; SELECT count(*) FROM users; SELECT migration_name FROM _prisma_migrations ORDER BY 1"` → `0`/`0`/a mesma lista de `git ls-tree --name-only origin/main prisma/migrations`. Se houver organizações, o script **não** se importa: só recusa se já existir **outro** admin de plataforma (M7) |

### 0.7 Divergências registradas (§A2) — antes de qualquer consolidação

- **D1 — `CLAUDE.md` §11 aponta `screen-refs/web/` (35 PNGs) e a ref não os tem lá.** Medido pelo orquestrador e
  reconferido: `git ls-tree -r origin/main screen-refs/web` → 0; os PNGs vivem em `docs/claude-code-handoff/screen-refs/web/`
  e o mapeamento em `docs/claude-code-handoff/screen-refs/README.md`. Este bloco é **backend** (sem tela): registra e
  não usa. Dono do conserto do texto: bloco de governança do contrato (fora daqui).
- **D2 — Runbook B (`docs/deployment.md:182-184`, item 2) manda o bootstrap usar `ALLOW_PROD_SEED=1` one-shot; este plano usa
  `ALLOW_PROD_BOOTSTRAP` (variável própria, mesma semântica estrita).** Razão medida: o próprio Runbook B (l.184)
  avisa que persistir `ALLOW_PROD_SEED` "reabre o seed demo no mesmo ambiente" — reusar o **mesmo** opt-in para dois
  atos distintos faz o opt-in de um destravar o outro (M5c prova que a trava do seed **não** abre o bootstrap, e
  vice-versa). O Runbook B é **editado** por este bloco (E4) para dizer a variável certa; a divergência fica registrada
  na ata e em `pendencias.md` (emenda de `P-SAN-PROD-BOOTSTRAP`), não em silêncio.
- **D3 — `P-SAN-PROD-BOOTSTRAP` (`pendencias.md:575`) diz "criar tenant de SISTEMA + role super_admin + admin +
  credencial"; o Runbook B (l.178-181) tira a `role` do bootstrap.** Vale o Runbook B — **não por data** (`git blame -L 174,184
  --date=short origin/main -- docs/deployment.md` → as 11 linhas estão no commit-raiz `f4ef511`, 2026-08-11, e a pendência
  é de 2026-07-14; a ordem de escrita não sai do git — D20), mas por ser o texto coerente com `provision-rbac.ts:55-61`
  e com o passo do CD (`deploy-production.yml:135-164`): o script **exige** o papel global provisionado e **recusa** sem ele (M4). A emenda
  da pendência no PR registra isso.

### 0.8 Conferência pré-commit — 22 divergências do conferente factual, cada uma REEXECUTADA por esta instância

Regra aplicada: o que reproduziu foi corrigido no plano (e em tudo que dependia do número); nada foi recusado, porque as
22 reproduziram. Evidência bruta do fechamento em rascunho (`…/scratchpad/planos/b-san3-09/fechamento/`: `mutacoes.out`,
`d01-gerador.out`, `kpisim/`, `ramos-em-voo.out`, `fecho-de-imports.out`), fora do repositório.

| id | classe | decisão (onde mudou) | evidência — comando → saída (desta instância) |
|---|---|---|---|
| D01 | saida-nao-reproduz | aplicada (P-e) | `bash travas-de-producao.sh <w> origin/main \| awk -F: '/^[a-z]/{print $1}' \| sort \| uniq -c` → `2 seed-fleet · 7 seed-guard · 2 seed-users · 4 seed.ts · 19 env.ts · 1 prisma.ts` (= 35); `git show origin/main:src/config/env.ts \| awk 'NR>=304 && NR<=597' \| grep -c NODE_ENV` → **18** (+ o default da l.638 = 19; a versão anterior dizia "20 gates") |
| D02 | citacao-errada | aplicada (§0.4) | `git show origin/main:src/config/env.ts \| awk 'NR==304 \|\| NR==597'` → `304: }).superRefine((value, context) => {` · `597: });` (a versão anterior citava l.304-560) |
| D03 | outro | aplicada (P-e, §0.4) | `git show origin/main:prisma/seed-guard.ts \| sed -n '21,24p'` → `21: /**` · `23:  * ALLOW_PROD_SEED (one-off controlado, …)` · `24:  */` — JSDoc, não código; o filtro do gerador só exclui `//`; filtro apertado (`//` e `*`) → **34** |
| D04 | outro | aplicada (§0.2) | `psql -p 54331 -d erp_b_san3_09 -Atc "SELECT slug\|\|'\|'\|\|created_at FROM tenants; SELECT created_at FROM audit_logs"` → `platform\|…\|2026-09-30 11:40:27+00` · `2026-09-30 11:40:27+00` — estado `1/1/1/1/1` deixado por execução avulsa posterior à matriz (a matriz termina em `0/0/0/0/0`, Apêndice C); §0.2 agora diz isso, e o cluster foi removido no fechamento |
| D05 | saida-nao-reproduz | aplicada (§0.5, §9, índice dos apêndices) | `awk 'NR>=1263&&NR<=1325' plano \| grep -c '^--- M'` → **19**; `grep -o -E '\[M[0-9]+[a-z]?\]' \| sort -u \| wc -l` → 23; `ls run-M*.log \| wc -l` → **25**; nenhuma dá 24 |
| D06 | outro | aplicada (§8) | `awk 'NR>=473&&NR<=491' plano \| grep -c -E '^\| T1\.'` → 7; `'^\| T2\.'` → 10 — o "26 (14 + 12)" não saía de lugar nenhum; agora **18** (8 + 10, com T1.8) |
| D07 | saida-nao-reproduz | aplicada (§2.1) | `git show origin/main:src/modules/core-saas/permissions/catalog.ts \| sed -n '281-302p;329-343p;361-363p'` → `sed: -e expression #1, char 4: unknown command: -` (exit 1); `grep -n 'super_admin: PERMISSION_CATALOG'` → `412:  super_admin: PERMISSION_CATALOG,` |
| D08 | citacao-errada | aplicada (P-d, D2, D3) | `git show origin/main:docs/deployment.md \| awk 'NR>=174&&NR<=184'` → `178: **A parte de RBAC saiu deste follow-up:**` … `181: … **nunca** é criado pelo provisionamento.` · `182: 2. Se o bootstrap precisar rodar com NODE_ENV=production, usar … ALLOW_PROD_SEED=1` · `184: … (senao reabre o seed demo no mesmo ambiente).` |
| D09 | citacao-errada | aplicada (P-m, §2.1) | `git grep -n -E 'signInWithCognito\|auth/repository' origin/main -- frontend` → só `frontend/src/modules/auth/repository.ts:4` (a definição: código morto); `git show origin/main:frontend/src/pages/LoginPage.tsx \| sed -n '15,16p;26p'` → `readFrontendEnv("VITE_DEFAULT_TENANT_ID", useMocks ? "ten-industrial-01" : "")` · `useState(defaultTenantId)` · `signIn({ tenantId, email, password })` |
| D10 | premissa-sem-comando | aplicada (P-a) | `git show origin/main:prisma/seed-users.ts \| grep -n super_admin` → `30:  { role: "super_admin", email: "plataforma.demo@example.com", … }`; `git grep -n -i 'insert into "\?tenants' origin/main -- scripts` → `scripts/rbac-provision-drill.sh:94` (banco de drill); `git grep -l -E 'bootstrap-platform-admin\|PLATFORM_ADMIN_' origin/main -- prisma` → `prisma/seed.ts` |
| D11 | citacao-errada | aplicada (§2.1 a) | `git show origin/main:src/modules/core-saas/permissions/catalog.ts \| sed -n '312,315p'` → `313: // legítima de provisionamento de plataforma é o seed (prisma/seed-users.ts, escrita direta no` · `314: // banco) e uma futura rota de plataforma (pendência P-O6R-B01-PROMOCAO-PLATAFORMA) — nunca` · `315: // POST/PATCH /users.` |
| D12 | premissa-sem-comando | aplicada (§3 E5, §5, §6, §8 bateria, §9) | cópia própria de `Kpis/{app.js,index.html,styles.css,kpis-history.json,kpis-latest.json}` + `tests/kpi-dashboard-charts.test.ts` da ref em rascunho: `node --test --import tsx …` → `# pass 17 # fail 0`; `metrics.blocks_completed.value=169` **só** no JSON → `not ok 11 - painel: a cópia congelada é IDÊNTICA ao kpis-latest.json (gerada, nunca digitada)` · `# pass 16 # fail 1`; `git log --format=%h -8 origin/main -- Kpis/kpis-latest.json` = `-- Kpis/app.js` (`3b1fe0f b3f0af5 fc3363e b8cd22d aadaa6d 83a3c68 02bd7da 15ef3fb`, IGUAIS); `scripts/kpi-freeze.mjs:24,36` regenera `var FROZEN = …;` |
| D13 | mutacao-faltando | aplicada (A16, A20, A21; T1.8 novo) | `awk 'NR>=443&&NR<=448' plano \| awk -F'\|' '{print $2"\|"$4}'` → `A16 \| — (documental + asserção do 401; …)` · `A20 \| — (documental; a junta lê)` · `A21 \| —`; espelho de doc-guard na ref: `tests/san3-04a-matriz-x-catalogo-guard.test.ts:29-30,504` lê `RBAC_MATRIX.md` do disco |
| D14 | mutacao-faltando | aplicada (A13) | `git show origin/main:src/modules/auth/repositories/local-auth-credential.repository.ts \| sed -n '88,104p'` → `100: failed_attempts: 0,` · `101: locked_until: null,`; mutante do conferente reexecutado no cluster → `hash mudou: SIM · failed/locked: 0/NULL · contagens: 1/1/1/1/2` (**verde**, não avermelha); mutação nova **m1** (`} else if (false && input.resetPassword) {`, 2 linhas de diff) → `hash mudou: NAO · failed/locked: 4/2026-09-30 12:26:41+00 · 1/1/1/1/1` (**vermelho**); **m2** (`passwordReset = false`) → `hash mudou: SIM · 0/NULL · 1/1/1/1/1` (auditoria não subiu: **vermelho**) |
| D15 | outro | aplicada (A18, T2.10) | `sed '/pg_advisory_xact_lock/d' medido.ts > mut-a18-sem-lock.ts` (1 linha); 4 rodadas de 2 processos simultâneos em estado limpo → `a=CONVERGIDO b=FALHOU` · `a=FALHOU b=CONVERGIDO` · `a=FALHOU b=CONVERGIDO` · `a=CONVERGIDO b=FALHOU`, **todas** `1/1/1/1/1`, erro `Unique constraint failed on the fields: (slug)`; controle com o lock, 2 rodadas → `a=CONVERGIDO b=CONVERGIDO` · `1/1/1/1/1` |
| D16 | secao-faltando | aplicada (§2.1 tabela; Apêndice F) | `awk 'NR>=282&&NR<=288' plano` → 6 linhas sem comando; coladas as saídas de `migration.sql \| sed -n '8,13p;25,27p'`, `seed-guard.ts \| sed -n '14,19p;28,30p'`, `auth.routes.ts \| sed -n '156p;159p;168,169p'`, `LoginPage.tsx \| sed -n '15,16p;26p'` + `auth.adapter.ts \| sed -n '59,65p'`, `deployment.md \| sed -n '168,185p'` (Apêndice F) e `Dockerfile \| sed -n 34p` + `package.json:51,58` |
| D17 | lista-nao-gerada | aplicada (P-n, §2.1, Apêndice E) | `bash ramos-em-voo.sh <w>` → `# base=3b1fe0f9… · refs remotas=141 · medido em 2026-09-30T12:18:00Z` · `origin/docs/governanca-porteiro-pre-merge-sol → package.json`; `git reflog show --date=iso refs/remotes/origin/docs/conhecimento-de-terreno \| tail -1` → `2026-09-30 10:45:43 +0000`; `bash fecho-de-imports.sh apB.ts <w> origin/main` → 6 diretos + 3 transitivos; controle: `env.js` injetado numa cópia aparece (`3:../src/config/env.js`) |
| D18 | escopo-caminho-inexistente | aplicada (H4, §11 passo 6) | `git show origin/main:src/app.ts \| grep -n healthRouter` → `114:  app.use("/api/v1", healthRouter);`; `git grep -n 'health/ready' origin/main -- fly.production.toml scripts/smoke-production.mjs` → `fly.production.toml:76: path = "/api/v1/health/ready"` · `smoke-production.mjs:95: fetchJson("/api/v1/health/ready")` |
| D19 | premissa-sem-comando | aplicada (§11 passo 6) | `git show origin/main:frontend/src/modules/auth/auth.adapter.ts \| sed -n '208,209p'` → `if (status === 401) {` · `return "Tenant, e-mail ou senha invalidos.";` |
| D20 | premissa-sem-comando | aplicada (§0.2, H8, D3) | `git blame -L 174,184 --date=short origin/main -- docs/deployment.md \| cut -c1-40 \| sort \| uniq -c` → 11 linhas, todas `^f4ef511 (thiagodorgo 2026-08-11 …)`; a produção não é medida daqui → "byte a byte" virou **H8** com o comando do Ato 0; "escrito depois" saiu de D3 |
| D21 | saida-nao-reproduz | aplicada (§0.4) | `grep -n 'ROOT=' travas-de-producao.sh` → `8:ROOT="${1:-.}"; REF="${2:-origin/main}"` (posicional); `ROOT=<tmp> REF=HEAD bash …` ignora as variáveis e mede o cwd; `bash travas-de-producao.sh <tmp> HEAD` → `scripts/bootstrap-platform-admin.ts:1 \| if (process.env.NODE_ENV === "production") { throw new Error("x"); }` · `# total: 1` |
| D22 | regra-do-mandato | aplicada (cabeçalho, l.13 e l.22 antigas) | `grep -n -i -E 'custo\|prazo\|36–37\|pressa' plano` → l.13 (janela de horas da agenda), l.22 (frase que negava custo/prazo) e l.41 (saída literal do `grep -n SAN3-09` na ref — mantida: é o que a ref diz, não afirmação do plano); as duas primeiras removidas |


---

## §1 — Objetivo · ator · fluxo · contrato

**Objetivo.** Fechar o item 43 do gate vendável (`PLANO_SAN3.md` §4.1, critério 12) com **mecanismo versionado e
testado**: um script idempotente que, numa base já migrada e já provisionada pelo CD, cria **uma** organização de
sistema (`platform` / "Plataforma"), **um** usuário administrador nela, o vínculo dele ao papel global `super_admin` e
**uma** credencial local — pelo mesmo serviço e pelo mesmo hash que o login verifica —, e que **recusa** com código
nomeado: em produção sem o opt-in one-shot; sem RBAC provisionado; para um segundo administrador; para senha fraca ou
passada por argumento. "2 execuções = 1 tenant de sistema + 1 admin" é medido (M1/M2, M9a/b, M14), não prometido.

**Ator.** Não há ator de negócio na aplicação: é **ato de ativação** do dono (`PLANO_SAN3.md` §4.2, l.193 — "executá-lo
em produção"), praticado de um checkout com a credencial do migrador (P-k). O papel que **resulta** é o admin de
plataforma (`super_admin`, rótulo de UI "Super Admin" / "Admin Plataforma" — `auth.adapter.ts:228`, §3 do contrato).

**Fluxo origem → destino (do ato à primeira sessão).**
1. CD já rodou `prisma migrate deploy` + `db:provision-rbac` (`deploy-production.yml:135-164`) ⇒ `roles` tem
   `super_admin` global com 198 concessões; `tenants`/`users` vazios (§0.2).
2. Dono: `NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1 PLATFORM_ADMIN_EMAIL=… PLATFORM_ADMIN_PASSWORD=… DATABASE_URL=<migrador>
   npx tsx scripts/bootstrap-platform-admin.ts --dry-run` (relata) e depois sem `--dry-run` (aplica) — §11.
3. Script: trava (§4.1) → entrada (§4.2) → **uma** transação sob `pg_advisory_xact_lock` → papel global lido (nunca
   criado) → organização `platform` (`tenants`, sem RLS) → `set_config('app.current_tenant_id', …, true)` → usuário →
   vínculo → credencial (`LocalAuthCredentialService.createCredentialForUser`) → 1 linha em `audit_logs` → relatório
   sem segredo → exit 0.
4. Login: `POST /api/v1/auth/login` com `{ tenantId: <id da organização platform>, email, password }` → 200; `roles`
   contém `super_admin` (`auth.routes.ts:273-279`); `GET /api/v1/platform/overview` → 200 pelo gate de presença de
   papel (`platform-permissions.ts:53-58`). Pela **web** (que manda `tenantId: ""`, P-m) o mesmo login passa pelo
   caminho anônimo e só funciona com `auth_login_candidates` executável pelo papel do app (runbook B-O6R-01; §11 Ato 2).

**Contrato — é um CLI, não uma rota (nenhuma rota, payload ou código HTTP muda; `/health/*` intocado).**

| Entrada | Obrigatória | Forma |
|---|---|---|
| `DATABASE_URL` | sim | conexão do migrador (produção) ou do arnês (teste) |
| `PLATFORM_ADMIN_EMAIL` | sim | normalizado `trim().toLowerCase()`; precisa de `@` |
| `PLATFORM_ADMIN_PASSWORD` **ou** `--password-stdin` | sim (uma das duas) | ≥ 12 caracteres e ≠ e-mail (§4.2); **nunca** por argumento |
| `PLATFORM_ADMIN_NAME` | não | default `Administrador da Plataforma` |
| `NODE_ENV=production` + `ALLOW_PROD_BOOTSTRAP` | condicional | em produção, só `true/1/yes/on` (estrito) libera |
| `--dry-run` · `--reset-password` | não | relata sem escrever · redefine a senha do admin existente (zera contador e lock) |

| Saída | Código | Quando |
|---|---|---|
| `CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.` | **0** | criado ou já convergido (idempotente) |
| `simulação encerrada — nada foi escrito no banco.` | **0** | `--dry-run` |
| `RECUSADO (<código>): …` | **2** | `PRODUCTION_OPT_IN_MISSING` · `DATABASE_URL_MISSING` · `EMAIL_MISSING` · `PASSWORD_MISSING` · `PASSWORD_IN_ARGV` · `PASSWORD_TOO_WEAK` · `RBAC_NOT_PROVISIONED` · `ADDITIONAL_ADMIN_REFUSED` |
| `FALHOU: …` | **1** | erro real (conexão, RLS sob papel sem contexto, escrita) — transação desfeita |

Relatório (stdout) = nome do banco (`current_database()`), ids, e-mail e flags. **Nunca** senha, hash, host ou URL
(§2.8; M16). Os análogos de "404 cross-tenant / 422 transição inválida / 409 duplicidade" do molde do papel são, aqui,
`ADDITIONAL_ADMIN_REFUSED` (o estado não admite um 2º), `PASSWORD_TOO_WEAK` (entrada inválida) e a **idempotência**
(duplicidade não é erro: é no-op relatado).

---

## §2 — Onde mora a propriedade — respondido duas vezes

### 2.1 Pelo ENUNCIADO

"Não há caminho versionado para o 1º admin real" (item 43). A propriedade tem três metades, e as três já estão
decididas **fora** deste bloco — o bloco só precisa **respeitá-las**:

- **(a) Identidade de plataforma = usuário de uma organização + vínculo ao papel global `super_admin`.** Mora em
  `catalog.ts:329-343` (`ROLE_AUTHORITY`), `platform-permissions.ts:33-58` (gate por presença do papel no claim),
  `jwt.service.ts:31-45` e `auth.routes.ts:273-279` (o claim vem de `user_role_assignments`), `provision-rbac.ts:55-61`
  (`platform_admin` nunca tem linha; `super_admin` é provisionado). O catálogo diz onde fica a fronteira legítima de
  provisionamento de plataforma: **"o seed (prisma/seed-users.ts, escrita direta no banco) e uma futura rota de plataforma (pendência
  P-O6R-B01-PROMOCAO-PLATAFORMA) — nunca POST/PATCH /users"** (`catalog.ts:312-315`, verbatim — D11). O script é a forma de produção dessa "escrita direta no banco".
- **(b) Credencial = o que o login lê.** Mora em `local-auth-login.service.ts:131-217`, `password.service.ts:13-33,
  122-137` (scrypt-v1 pinado), `local-auth-credential.service.ts:164-204` (política + e-mail igual ao do usuário),
  `local-auth-credential.repository.ts:26-62,152-154`. O script **não** reimplementa nada disso: chama
  `LocalAuthCredentialService` como `seed-users.ts:82-85` e `seed.ts:389-412` chamam.
- **(c) Isolamento = FORCE RLS por organização + trava de produção estrita.** Mora na migração
  `20260608000000_enable_tenant_rls` (l.8-34, 36-41), em `src/database/rls.ts:16-27` (o **único** setter do GUC) e em
  `prisma/seed-guard.ts:14-45` (a única trava de execução manual). O script grava **sob o GUC** e espelha a trava.

**Arquivos FORA do escopo de que a propriedade depende — comando + saída (todos na ref).** A tabela tem duas partes:
as **dependências de runtime do script** vêm do gerador `fecho-de-imports.sh` (Apêndice E — diretos: `dotenv/config`,
`@prisma/adapter-pg`, `@prisma/client`, `../src/database/rls.js`, `…/local-auth-credential.repository.js`,
`…/local-auth-credential.service.js`; transitivos de 1 nível: `anonymous-login.constants.js`, `auth.types.js`,
`password.service.js`; controle: um `import` de `../src/config/env.js` injetado numa cópia aparece); as demais linhas são
**onde a propriedade mora**, por leitura — não são enumeração de sítios, e ficam declaradas como tal (D17).

| Arquivo | O que o script depende dele | Comando → saída |
|---|---|---|
| `scripts/provision-rbac.ts` | cria o `super_admin` global; nunca `platform_admin` | `git show origin/main:scripts/provision-rbac.ts \| sed -n '55,61p;147,166p'` → `PAPEIS_PROVISIONADOS = DEFAULT_ROLES.filter(≠ platform_admin)`; `role.createMany({ key, name, scope: "system" })` com `tenant_id` nulo |
| `src/modules/core-saas/permissions/catalog.ts` | `super_admin ∈ PLATFORM_ROLES`; `ROLE_PERMISSIONS.super_admin` | `git show origin/main:src/modules/core-saas/permissions/catalog.ts \| sed -n '281,283p;329,331p;361,363p;412p'` → `export const STANDARD_ROLES = [ "super_admin", "tenant_admin", …`; `export const ROLE_AUTHORITY = { super_admin: "platform", tenant_admin: "tenant", …`; `PLATFORM_ROLES = DEFAULT_ROLES.filter((role): role is PlatformRole => ROLE_AUTHORITY[role] === "platform")`; l.412 `super_admin: PERMISSION_CATALOG,` (o `ROLE_PERMISSIONS.super_admin` fica na l.412, fora dos três intervalos; a forma anterior do `sed`, com hífen, não é sintaxe válida — D07) |
| `src/modules/platform/platform-permissions.ts` | o gate é presença de papel | `sed -n '33,58p'` → `platformRoles = new Set(PLATFORM_ROLES)`; `hasPlatformRole = roles.some(platformRoles.has)` |
| `src/modules/auth/services/local-auth-credential.service.ts` | `createCredentialForUser`, `upsertCredentialForUser`, `validateLocalPassword` | `sed -n '61,77p;164,204p'` → política ≥ 8 e ≠ e-mail; exige `users.findByIdForTenant` e e-mail igual |
| `src/modules/auth/services/password.service.ts` | `scrypt-v1` | `sed -n '5,33p'` → `N=16384 r=8 p=1 keylen=64`, `password_algorithm: "scrypt-v1"` |
| `src/database/rls.ts` | `setTenantRlsContext(tx, id)` | `sed -n '16,27p'` → `set_config('app.current_tenant_id', $1, true)` |
| `prisma/migrations/20260608000000_enable_tenant_rls/migration.sql` | policies das 5 tabelas | `git show origin/main:prisma/migrations/20260608000000_enable_tenant_rls/migration.sql \| sed -n '8,13p;25,27p'` → `ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;` · `ALTER TABLE "users" FORCE ROW LEVEL SECURITY;` · `CREATE POLICY "users_tenant_isolation" ON "users" USING ("tenant_id"::text = current_setting('app.current_tenant_id', true)) WITH CHECK (idem)`; l.25-27 `roles`: `USING ("tenant_id" IS NULL OR "tenant_id"::text = current_setting(…))`; o mesmo par ENABLE/FORCE + policy para `local_auth_credentials` (l.15-20), `user_role_assignments` (l.29-34) e `audit_logs` (l.36-41) |
| `prisma/seed-guard.ts` | a semântica da trava | `git show origin/main:prisma/seed-guard.ts \| sed -n '14,19p;28,30p'` → `const TRUTHY = new Set(["true", "1", "yes", "on"]);` · `function strictBool(raw) { if (!raw) return false; return TRUTHY.has(raw.trim().toLowerCase()); }` · `if (envLike.NODE_ENV === "production") { return strictBool(envLike.ALLOW_PROD_SEED); }` |
| `src/config/env.ts` | **não pode** ser carregado pelo script | l.599 `envSchema.parse(process.env)`; controle em §0.3 P-j |
| `src/modules/auth/routes/auth.routes.ts` | login direcionado × anônimo | `git show origin/main:src/modules/auth/routes/auth.routes.ts \| sed -n '156p;159p;168,169p'` → `let resolvedTenantId = parsedBody.tenantId;` · `if (!resolvedTenantId) {` · `const anonymousLoginService = await resolveAnonymousLoginService();` · `const outcome = await anonymousLoginService.attempt({` (⇒ caminho anônimo); l.223-233 (direcionado), l.273-279 (claims) |
| `frontend/src/pages/LoginPage.tsx` · `frontend/src/modules/auth/auth.adapter.ts` | a web manda `tenantId` vazio por padrão (D09) | `git show origin/main:frontend/src/pages/LoginPage.tsx \| sed -n '15,16p;26p'` → `const defaultTenantId = readFrontendEnv("VITE_DEFAULT_TENANT_ID", useMocks ? "ten-industrial-01" : "");` · `const [tenantId] = useState(defaultTenantId);` · `const session = await signIn({ tenantId, email, password });`; `git show origin/main:frontend/src/modules/auth/auth.adapter.ts \| sed -n '59,65p'` → `fetch(${apiBaseUrl()}/auth/login, { method: "POST", … body: JSON.stringify({ tenantId: credentials.tenantId,` |
| `docs/deployment.md` | Runbook B (l.168-185) nomeia o script e as variáveis; runbook B-O6R-01 (l.461-516) é o Ato 2 | Runbook B **verbatim no Apêndice F** (`git show origin/main:docs/deployment.md \| sed -n '168,185p'`; termina antes do `### Provedor` da l.187); o runbook B-O6R-01 é citado em P-m/H4 e não é editado |
| `Dockerfile` · `package.json` | o script não roda na imagem de runtime | `git show origin/main:Dockerfile \| sed -n 34p` → `RUN npm ci --omit=dev && npm cache clean --force`; `git show origin/main:package.json \| grep -n -E '"tsx"\|devDependencies'` → `51: "devDependencies": {` · `58: "tsx": "^4.19.3",` |

### 2.2 Pelo REMÉDIO — cada metade mora num arquivo, e só num

- **(a)+(b)+(c) → `scripts/bootstrap-platform-admin.ts` (novo, Apêndice B).** Funções **puras e exportadas**
  (`isBootstrapAllowed`, `parseArgv`, `readBootstrapInput`, `assertBootstrapPassword`) e a função de banco
  `bootstrapPlatformAdmin(prisma, input, { dryRun })`, que faz **oito** passos numa transação: lock → papel global
  (`findMany` por `key`/`tenant_id: null`, escolhe a linha com **mais** concessões — a mesma régua de
  `san3-04a-…-db.test.ts:130-137` para bases poluídas por outras suítes — e **recusa** se não houver ou tiver 0
  concessões) → organização (`findUnique(slug)`/`create`) → `setTenantRlsContext` → admins existentes → usuário →
  vínculo → credencial → auditoria. `main()` só roda como script (guarda de `import.meta.url`, padrão do backfill).
  Constantes exportadas: `PLATFORM_TENANT_SLUG = "platform"`, `PLATFORM_TENANT_NAME = "Plataforma"`,
  `PLATFORM_ROLE_KEY = "super_admin"`, `BOOTSTRAP_MIN_PASSWORD_LENGTH = 12`, `BOOTSTRAP_ADVISORY_LOCK = 20260909n`,
  `BOOTSTRAP_AUDIT_ACTION = "platform.bootstrap.admin_created"`.
- **A trava → `isBootstrapAllowed` no mesmo arquivo**, espelho linha a linha de `isSeedAllowed` (§0.3 P-e; D2). Não
  se toca `prisma/seed-guard.ts` (fora da fronteira; e acoplar os dois opt-ins é o que D2 evita).
- **O runbook → `docs/deployment.md`, Runbook B (l.168-185), só ele.** Entra no PERMITIDO nominalmente: é o texto
  que o §4.2 manda o dono ler para "executá-lo em produção", e hoje ele nomeia variáveis (`ALLOW_PROD_SEED`) que o
  script **não** aceita (M5c). A seção "Provisionamento de RBAC" (l.83-150) e o runbook B-O6R-01 (l.461-516) **não**
  mudam — são citados, não editados.
- **Os testes → `tests/san3-09-bootstrap-platform-admin.test.ts` (sem banco) e
  `tests/san3-09-bootstrap-platform-admin-db.test.ts` (banco de drill próprio)** — §8.

**O que NÃO é lar da propriedade (e por isso não entra):** `package.json` (o comando é `npx tsx scripts/…`, como o
backfill — `backfill-third-party-vehicle-identity.ts:7`; e o ramo `docs/governanca-porteiro-pre-merge-sol` está no
arquivo, P-n); `.env.example` (§C4; as variáveis novas são lidas com `process.env` no script e **não** entram no
`envSchema`, logo a paridade `deploy-manifest-parity.test.ts:274-287,431-434` não as exige — H do §0.6 não precisa);
`prisma/**` (nenhum objeto de banco novo: são **linhas**, não schema); `src/**` (nenhuma rota; o gate de plataforma já
existe); `docs/go-live-readiness.md` (o roteiro de operação com "bootstrap do 1º admin" é o item (e) do `B-SAN3-10`,
`PLANO_SAN3.md:300` — este bloco entrega o script e o Runbook B que aquele roteiro cita).

---

## §3 — Entregas

| E | Entrega | Arquivos | Fecha |
|---|---|---|---|
| E1 | O script: trava estrita, entrada sem argv, transação idempotente sob GUC e lock, recusas nomeadas, `--dry-run`, `--reset-password`, relatório sem segredo | `scripts/bootstrap-platform-admin.ts` (novo = Apêndice B) | item 43 (mecanismo) |
| E2 | Testes puros: trava (espelho dos 4 de `seed-guard.test.ts`), argv, entrada, política, guard de imports (CE-G1), processo filho sem banco | `tests/san3-09-bootstrap-platform-admin.test.ts` (novo) | DoD |
| E3 | Testes com banco **de drill próprio** (migrado + provisionado dentro do teste): recusa sem RBAC, 1ª/2ª execução, dry-run, 2º admin, reset, papel efêmero `NOBYPASSRLS`, login HTTP (direcionado 200; anônimo 401 até o GRANT), processo filho, concorrência | `tests/san3-09-bootstrap-platform-admin-db.test.ts` (novo) | item 43 ("2 execuções = 1 + 1"; "recusa sem a trava") |
| E4 | Runbook B reescrito: comando exato, variáveis (`ALLOW_PROD_BOOTSTRAP`, `PLATFORM_ADMIN_*`), `--dry-run` primeiro, códigos de saída, o Ato 2 (login pela web exige o runbook B-O6R-01) e a regra "senha por env ou stdin, nunca argv" | `docs/deployment.md` (só l.168-185) | §4.2 (o que o dono lê) |
| E5 | KPI e registro no próprio PR (§9, §C3) + comando do bloco + emendas de pendência (`P-SAN-PROD-BOOTSTRAP` → `EM ANDAMENTO (código mergeado; fecha com o ato do dono)`, D2/D3 registradas; pendências do §13 abertas) | `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` (**só** a linha `var FROZEN = …;`, regenerada por `node scripts/kpi-freeze.mjs` — D12), `agent-orchestration/codex/comandos/B-SAN3-09-bootstrap-platform-admin.md` (novo), `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | §C3, §C6 |

O que **não** muda de propósito: `prisma/seed*.ts` (o seed demo continua sendo o caminho de dev/e2e — H5); `.github/
workflows/**` (o teste `-db` novo roda no job `backend`, que tem `DATABASE_URL` — `ci.yml:31-34,108-109` — e auto-pula
**declarando** sem ela, dentro do orçamento de skip `SKIP_BUDGET_DB = 2` de `run-backend-tests.mjs:82` porque **não**
pula com ela presente); `fly.*.toml` (nenhuma chave nova: o script não roda no contêiner, P-k).

---

## §4 — Modelagem

### 4.1 Sem migração. Os objetos novos são LINHAS, em tabelas que já existem

| Tabela | Linha criada | Chave de idempotência (medida, §0.3 P-h) | Sob RLS? |
|---|---|---|---|
| `tenants` | `{ name: "Plataforma", slug: "platform", status: "active", modules: [] }` | `tenants_slug_key` | não |
| `users` | `{ tenant_id, name, email (normalizado), status: "active", branch_id: null }` | `users_tenant_id_email_key` | **sim** (GUC) |
| `user_role_assignments` | `{ tenant_id, user_id, role_id: <super_admin global>, branch_id: null }` | `user_role_assignments_unique_global_branch` (parcial, `branch_id IS NULL`) | **sim** |
| `local_auth_credentials` | via `LocalAuthCredentialService` (`scrypt-v1`, `password_updated_at = now()`) | `_tenant_id_user_id_key`, `_tenant_id_email_key` | **sim** |
| `audit_logs` | `{ action: "platform.bootstrap.admin_created", entity: "user", entity_id: user.id, actor_user_id: user.id, metadata: { source, email, flags } }` — só quando algo foi criado/redefinido | — (append-only por desenho) | **sim** |

`timestamptz`: todas as colunas de data das cinco tabelas já são `Timestamptz(6)` (schema). Dinheiro: não há.
Delete lógico: `users.status` já existe (o script grava `active`; não há remoção). A idempotência **não** vem de
`upsert` cego: vem de **ler antes de escrever** dentro da transação com `pg_advisory_xact_lock(20260909)` — a mesma
técnica de `provision-rbac.ts:65-70,119-124` — porque `roles` global não é protegido por UNIQUE (NULL) e porque a senha
**não** deve ser reescrita em silêncio na 2ª execução (M2: hash igual; M12: só com `--reset-password`).

### 4.2 A trava e a entrada — decisões declaradas (a junta ratifica ou pede mudança)

1. **`ALLOW_PROD_BOOTSTRAP`, própria e estrita** (não `ALLOW_PROD_SEED`) — D2. Mutação que a junta executa: trocar por
   `ALLOW_PROD_SEED` faz M5c ficar verde (o opt-in do seed passaria a abrir o bootstrap).
2. **A trava vem ANTES de qualquer leitura de entrada ou conexão** (`main()`, primeira instrução depois do `parseArgv`):
   em produção sem opt-in, o script não lê senha nem abre conexão (M5: exit 2 sem `DATABASE_URL` sequer tocada).
3. **Senha: mínimo 12** (mais estrito que os 8 do app, `validateLocalPassword`) — é a credencial que alcança **todas**
   as organizações. **Nunca em argv** (P-l). `--password-stdin` lê a 1ª linha (para `read -rs` no terminal ou um
   cofre que escreve em pipe).
4. **Só o 1º administrador.** Admin de outro e-mail já vinculado ⇒ `ADDITIONAL_ADMIN_REFUSED`. Administradores
   adicionais são a rota de plataforma com SoD e trilha própria (`P-O6R-B01-PROMOCAO-PLATAFORMA`, `pendencias.md:2549`)
   — não um script que qualquer detentor da credencial do migrador roda de novo.
5. **Nunca cria papel; nunca concede permissão.** Sem `super_admin` global com concessões ⇒ `RBAC_NOT_PROVISIONED`
   (M4) — criar "para ajudar" reintroduziria o papel global duplicado (`provision-rbac.ts:65-69`) e o admin nasceria
   sem plataforma se as concessões faltassem.
6. **Organização de sistema com `modules: []` e `status: "active"`.** O admin de plataforma não usa menu de organização;
   as rotas `/platform/*` não checam módulo (`platform.routes.ts:42-70`, só `requirePlatformPermission`). H3 vigia o
   `B-SAN3-18`. Consequência declarada: a organização "Plataforma" **aparece** na lista do console de plataforma
   (`GET /api/v1/platform/tenants`) como qualquer outra — cosmético; ocultá-la é decisão de produto fora daqui (§13).
7. **Auditoria só na criação/redefinição**, com allowlist (`email`, flags, `source`) — nunca senha/hash (§2.8).
8. **Exit 2 para recusa nomeada, 1 para erro** — quem automatiza o ato distingue "a trava mordeu" de "o banco caiu".

---

## §5 — Arquivos tocados (caminhos exatos) e a regra do espelho

| Arquivo | Ação | Módulo de referência (espelho) |
|---|---|---|
| `scripts/bootstrap-platform-admin.ts` | novo (= Apêndice B) | `scripts/provision-rbac.ts` (cabeçalho "o que faz / não faz", `dotenv/config`, `PrismaPg`, transação + `pg_advisory_xact_lock`, relatório, `--dry-run`, `exitCode`) · `prisma/seed-users.ts:70-86` (usuário + vínculo + credencial sob contexto) · `prisma/seed-guard.ts:14-32` (a trava) · `scripts/backfill-third-party-vehicle-identity.ts:507-568` (guarda de `main`, funções exportadas) |
| `tests/san3-09-bootstrap-platform-admin.test.ts` | novo | `tests/seed-guard.test.ts` (os 4 casos da trava, espelhados 1:1) · `tests/backfill-third-party-vehicle-identity.test.ts` (funções puras do script) · `tests/npm-test-runner-guard.test.ts:1-16` (`spawnSync` do script real) |
| `tests/san3-09-bootstrap-platform-admin-db.test.ts` | novo | `scripts/rbac-provision-drill.sh` (banco descartável próprio, `migrate deploy` + `db:provision-rbac`, contagens antes/depois, `trap` de limpeza) · `tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts:41-112,172-200` (auto-skip declarado; `createEphemeralRole` + `globalThis.prisma`; login/rota por HTTP) · `tests/o6r06-usage-atomic-db.test.ts` (papel efêmero **só** pelo arnês) |
| `docs/deployment.md` | Runbook B, l.168-185 (só) | `docs/deployment.md:83-150` (a seção de provisionamento: "Contrato do passo", "Como rodar") |
| `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` (linha `var FROZEN`, via `node scripts/kpi-freeze.mjs`) | §C3 | `scripts/kpi-freeze.mjs:2-36` (o par de `tests/kpi-dashboard-charts.test.ts:323-343`, que exige a cópia congelada idêntica ao JSON — D12) |
| `agent-orchestration/codex/comandos/B-SAN3-09-bootstrap-platform-admin.md` | novo (molde `comando-template.md`) | `B-SAN3-04a-rbac-catalogo-banco-matriz.md` |
| `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | emendas | — |

---

## §6 — Escopo (§C4) — PERMITIDO e PROIBIDO, caminhos exatos

**PERMITIDO** (e nada mais):
`scripts/bootstrap-platform-admin.ts` (novo) · `tests/san3-09-bootstrap-platform-admin.test.ts` (novo) ·
`tests/san3-09-bootstrap-platform-admin-db.test.ts` (novo) · `docs/deployment.md` (**nominalmente**: só o Runbook B,
l.168-185 do head; nada além) · `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` (**só** pela regeneração
`node scripts/kpi-freeze.mjs` da linha `var FROZEN = …;` — nunca editado à mão; D12) ·
`agent-orchestration/codex/comandos/B-SAN3-09-bootstrap-platform-admin.md` (novo) · `agent-orchestration/controle/pendencias.md`
· `agent-orchestration/controle/pendencias-indice.md` (se o gerador de índice o exigir) · `agent-orchestration/docs/status-geral.md`
· `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/omega/juntas/**` (ata, votos — do orquestrador,
não do dev).

**PROIBIDO** (§C4 + fronteira do bloco):
`prisma/**` (schema, migrations, seeds, `seed-guard.ts`) · `.env`, `.env.*`, `.env.example` · `package.json`,
`package-lock.json`, `frontend/package-lock.json`, `pubspec.*` · `.github/workflows/**` · `fly.*.toml`, `Dockerfile`,
`docker-compose*.yml` · `src/**` (nenhuma rota, serviço ou gate muda — se o dev "precisar" de algo em `src/`, é
achado, não conserto: vira pendência) · `frontend/**`, `mobile/**` · `tests/helpers/**` (o arnês é o do `B-O6R-ARNES`;
o teste o **usa**) · `tests/db-catalog-write-guard.test.ts` (o teste novo não pode escrever catálogo por SQL próprio —
só via `createEphemeralRole`; e não pode conter as palavras `CREATE ROLE`/`DROP ROLE`/`ALTER ROLE`/`GRANT`/`REVOKE`/
`OWNER TO` **nem em comentário**: o ratchet é lexical, `db-catalog-write-guard.test.ts:62-69`) · `docs/go-live-readiness.md`
(`B-SAN3-10`) · `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.agents/**` · `Kpis/index.html`, `Kpis/styles.css` e qualquer linha de `Kpis/app.js` que não seja a `var FROZEN = …;` (nenhuma
dimensão nova; D12) · `docs/revisoes/SAN3/PLANO_SAN3.md`.

**Trava de mesmo arquivo (§6 do PLANO_SAN3):** nenhuma nomeia `SAN3-09`. Medido em P-n: o único arquivo comum a um
ramo em voo seria `package.json`, que este plano **não toca**. `docs/deployment.md` foi tocado pelo plano do
`B-SAN3-05` (E5 daquele plano: seção "Papel de banco de runtime", tabela dos gates, l.458, runbook B-O6R-01) — regiões
**disjuntas** do Runbook B (l.168-185); se o `B-SAN3-05` mergear antes, o dev rebaseia e reconfere os números de linha
(a regra é "só o Runbook B", não "só as l.168-185").

---

## §7 — Critérios de aceite — cada um com a MUTAÇÃO que o deixa vermelho

| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde é medido |
|---|---|---|---|
| A1 | `isBootstrapAllowed`: `development`/`test`/ausente → `true`; `production` sem opt-in ou com `""`/`0`/`false`/`no`/`off` → `false`; `production` com `1`/`true`/`TRUE`/`yes`/`on` → `true` | trocar `strictBool` por `Boolean(raw)` (o footgun do `"false"`) ou por `raw !== undefined` | T1.1 |
| A2 | `ALLOW_PROD_SEED=1` **não** libera o bootstrap em produção | ler `ALLOW_PROD_SEED` (ou `ALLOW_PROD_SEED \|\| ALLOW_PROD_BOOTSTRAP`) na trava | T1.1, T2.9 (M5c) |
| A3 | Em produção sem opt-in, o processo filho sai com **2**, imprime `PRODUCTION_OPT_IN_MISSING`, e o stderr **não** contém `ZodError`/`JWT_SECRET` (a trava vem antes de qualquer import que alcance `env.ts`, e nenhum alcança) | mover a trava para depois de abrir o `PrismaClient`; importar `../src/modules/auth/index.js` | T1.5, T1.6 |
| A4 | Guard de imports (CE-G1): toda linha `import … from "…"` do script pertence à allowlist `{ dotenv/config, @prisma/adapter-pg, @prisma/client, ../src/database/rls.js, ../src/modules/auth/repositories/local-auth-credential.repository.js, ../src/modules/auth/services/local-auth-credential.service.js }`; import fora dela = **vermelho** (default negar) | acrescentar `import … from "../src/config/env.js"` ou `"../src/modules/auth/index.js"` | T1.7 |
| A5 | `--password`/`--password=…` → `PASSWORD_IN_ARGV` antes de qualquer outra coisa; a senha do env **nunca** aparece em stdout/stderr | aceitar `--password=`; logar `input.password` | T1.2, T1.6, T2.9 |
| A6 | `readBootstrapInput`: sem e-mail / sem `@` → `EMAIL_MISSING`; sem senha → `PASSWORD_MISSING`; e-mail normalizado (`" Admin@X.Com "` → `admin@x.com`); nome default | remover a normalização; aceitar e-mail vazio | T1.3 |
| A7 | `assertBootstrapPassword`: 8 chars → `PASSWORD_TOO_WEAK` (limite 12); senha = e-mail → `PASSWORD_TOO_WEAK` (mensagem do app); 12 chars ≠ e-mail → passa | baixar `BOOTSTRAP_MIN_PASSWORD_LENGTH` para 8; não chamar `validateLocalPassword` | T1.4 |
| A8 | Base **só migrada** (`roles` sem `super_admin` global com concessões) → `RBAC_NOT_PROVISIONED`, e **nenhuma** linha criada em `tenants`/`users` (vermelho-controle "nunca cria papel") | criar o papel quando ausente; ler `role` de qualquer `tenant_id` | T2.1 |
| A9 | Base provisionada: 1ª execução → `tenantCreated/userCreated/assignmentCreated/credentialCreated = true`, contagens `1/1/1/1/1`; usuário `active`; vínculo ao **global** `super_admin`; credencial `scrypt-v1` | gravar o vínculo com `branch_id` da filial (não há); gravar `status: "pending"` | T2.2 |
| A10 | 2ª execução idêntica → todos os flags `false`, contagens **iguais**, `password_hash` **igual**, `audit_logs` continua 1 | trocar `createCredentialForUser` por `upsertCredentialForUser` incondicional (M2 ficaria com hash diferente) | T2.3 |
| A11 | `--dry-run` em estado limpo relata "a criar" e escreve **0** linhas; com tudo existente, idem sem escrita | escrever no dry-run | T2.4 |
| A12 | Outro e-mail com admin existente → `ADDITIONAL_ADMIN_REFUSED`; contagens intactas | remover o passo 4 do script | T2.5 |
| A13 | `--reset-password` → hash muda, `failed_attempts = 0`, `locked_until = NULL`, `audit_logs` +1 (`passwordReset: true`) | ignorar a flag (`} else if (input.resetPassword) {` → `} else if (false && input.resetPassword) {`): hash **igual** e `failed_attempts` continua `4` (medido no fechamento, §0.8 D14-m1); ou nunca marcar `passwordReset = true`: a auditoria fica em 1 (D14-m2). A mutação antes declarada — chamar `credentials.updatePassword` direto — **não** avermelha: `updatePassword` já grava `failed_attempts: 0, locked_until: null` (`local-auth-credential.repository.ts:100-101`; reexecutada: hash mudou, `0/NULL`, auditoria 2 — verde). O teste arma `failed_attempts=4`/`locked_until` antes | T2.6 |
| A14 | Sob papel efêmero `NOSUPERUSER NOBYPASSRLS` (arnês): estado limpo → `1/1/1/1/1`; de novo → idempotente; e, **sem** GUC, o mesmo papel vê `0` usuários da organização enquanto a conexão administrativa vê `1` (a política morde) | remover `setTenantRlsContext` — sob o papel efêmero o `INSERT` em `users` viola a policy (M10) e sob `postgres` passa (M10b): por isso T2.7 roda sob o arnês | T2.7 |
| A15 | Login HTTP direcionado (`tenantId` = organização `platform`) → 200, `roles ∋ super_admin`; `GET /api/v1/platform/overview` com o token → 200; senha errada → 401 | apontar o vínculo para `tenant_admin`; gravar a credencial com outro normalizador de e-mail | T2.8 |
| A16 | Login HTTP **sem** `tenantId` sob o papel efêmero (sem `EXECUTE` em `auth_login_candidates`) → **401 uniforme** — é o estado de produção antes do runbook B-O6R-01, e o Runbook B (E4) o diz | em T2.8, trocar o cliente do papel efêmero pela conexão **administrativa** (dona de `auth_login_candidates`) → o login sem `tenantId` devolve **200** e a asserção de 401 reprova; na doc, reverter o Runbook B (`git checkout origin/main -- docs/deployment.md`) → T1.8 reprova (o Ato 2 do §11 é o remédio em produção, não este bloco) | T2.8, T1.8 |
| A17 | Processo filho contra o banco de drill: 1ª → exit 0 `CONVERGIDO`; 2ª → exit 0; `NODE_ENV=production` sem opt-in → exit 2 e contagens intactas; stdout/stderr sem senha/hash/`postgresql://` | qualquer uma das anteriores | T2.9 |
| A18 | Duas chamadas **simultâneas** de `bootstrapPlatformAdmin` em estado limpo → **as duas resolvem** (nenhuma rejeita) **e** `1/1/1/1/1`; 3 rodadas, limpando entre elas, todas verdes | remover o `pg_advisory_xact_lock`: uma das duas rejeita com `Unique constraint failed on the fields: (slug)` — medido no fechamento em **4 de 4** rodadas (§0.8 D15; o conferente mediu 3 de 4) **e as contagens ficam `1/1/1/1/1` mesmo assim** — por isso o critério exige que **ambas resolvam** e repete 3 rodadas (a morte do mutante é probabilística: ≥ 1 − (1/4)³ pela pior série medida); controle com o lock: 2 de 2 rodadas com ambas `CONVERGIDO` | T2.10 |
| A19 | `npx tsc --noEmit --strict …` no script → 0 erros (scripts/ está fora do `tsconfig`) | qualquer erro de tipo | bateria §8 |
| A20 | Runbook B (`docs/deployment.md:168-185`) cita `ALLOW_PROD_BOOTSTRAP` (não mais `ALLOW_PROD_SEED` para o bootstrap), o comando exato com `--dry-run` primeiro, `--password-stdin`, os códigos 0/2/1 e o Ato 2 (web exige B-O6R-01) | T1.8 lê o Runbook B (de `#### Runbook B` até o próximo `### `) e exige `ALLOW_PROD_BOOTSTRAP`, `scripts/bootstrap-platform-admin.ts`, `--dry-run`, `--password-stdin`, `PRODUCTION_OPT_IN_MISSING` e a menção ao runbook B-O6R-01; mutação: `git checkout origin/main -- docs/deployment.md` (o Runbook B de hoje só cita `ALLOW_PROD_SEED`) → vermelho | T1.8, C3 |
| A21 | Registro: `P-SAN-PROD-BOOTSTRAP` **não fecha** no PR — vira `EM ANDAMENTO (script mergeado e testado; fecha com a execução em produção — ato do dono, §4.2)`; D2/D3 anotadas nela; pendências do §13 abertas com dono | a junta (C1, item 3) roda `git grep -n -A3 'P-SAN-PROD-BOOTSTRAP' HEAD -- agent-orchestration/controle/pendencias.md` e exige `EM ANDAMENTO`; mutação: marcar `FECHADA` (ou não emendar a pendência) → o grep não devolve `EM ANDAMENTO` → reprova; o porteiro pós-merge reexecuta | C1, porteiro |

**CE-G1 (enumeração fail-closed):** o único guard deste bloco é A4/T1.7 — fonte = as linhas `import` **do próprio
script** (lidas do arquivo, não de lista curada); default = negar; mutação = import novo fora da allowlist. A lista
de travas do §0.4 é insumo de plano (Apêndice A), não guard de CI — declarado.

**CE-G2 (papel × passo):** T2.8 loga como o **usuário criado** (papel `super_admin`); a rota `GET /api/v1/platform/overview`
compara `requirePlatformPermission("platform:tenants:read")` (`platform.routes.ts:49-51`), que é satisfeita pela
**presença** do papel `super_admin` em `PLATFORM_ROLES` (`platform-permissions.ts:53-58`) — a permissão
`platform:tenants:read` pertence a `ROLE_PERMISSIONS.super_admin` (= `PERMISSION_CATALOG`, `catalog.ts:729` para
`platform_admin`; `super_admin` idem por herança do catálogo integral — `catalog.ts:253,264`). O login direcionado não
exige permissão. O token vem do **login real** (`POST /api/v1/auth/login`), nunca assinado à mão.

---

## §8 — Testes: baseline N, meta M ≥ 2N, e a bateria

**Baseline N = 4** — testes que hoje exercitam a **família** da propriedade: `tests/seed-guard.test.ts` (4 `test(`: a
trava de execução manual em produção, que este bloco espelha). Sobre o bootstrap em si: **0** (`git grep -l -E
'bootstrap-platform-admin|PLATFORM_ADMIN_' origin/main -- tests` → vazio); sobre "credencial + `super_admin` criados e
provados por login": **0** fora do e2e Playwright (que usa o seed — H5). Régua do §C3: suíte `origin/main` = **287**
arquivos `tests/*.test.ts`, **33** `-db`; KPI vigente `backend_tests 3052/3054`.

**Meta M ≥ 8 (2N).** O bloco entrega **18 casos** (8 sem banco + 10 com banco — contados na tabela: `grep -c '^| T1\.'` = 8,
`grep -c '^| T2\.'` = 10; o "26 (14 + 12)" da versão anterior não saía de lugar nenhum — D06):

| T | Teste | Arquivo | Banco |
|---|---|---|---|
| T1.1 | `isBootstrapAllowed` — os 4 casos de `seed-guard.test.ts`, espelhados 1:1, **mais** `ALLOW_PROD_SEED=1` não libera (A1, A2) | `san3-09-bootstrap-platform-admin.test.ts` | não |
| T1.2 | `parseArgv`: `--password`/`--password=` → `PASSWORD_IN_ARGV`; flags `--dry-run`/`--password-stdin`/`--reset-password` (A5) | idem | não |
| T1.3 | `readBootstrapInput`: e-mail ausente/sem `@` → `EMAIL_MISSING`; senha ausente (env e stdin) → `PASSWORD_MISSING`; normalização e nome default (A6) | idem | não |
| T1.4 | `assertBootstrapPassword`: 8 chars → `PASSWORD_TOO_WEAK`; = e-mail → `PASSWORD_TOO_WEAK`; 12 ≠ e-mail → passa (A7) | idem | não |
| T1.5 | processo filho (`spawnSync("npx", ["tsx", script])`, `env` mínimo + `NODE_ENV=production`, **sem** `DATABASE_URL`) → exit **2**, stderr ∋ `PRODUCTION_OPT_IN_MISSING`, stderr ∌ `ZodError`/`JWT_SECRET` (A3) | idem | não |
| T1.6 | processo filho com `PLATFORM_ADMIN_PASSWORD=<sentinela>` e `--password=x` → exit 2 `PASSWORD_IN_ARGV`; stdout+stderr ∌ sentinela (A5) | idem | não |
| T1.7 | guard de imports (CE-G1): lê `scripts/bootstrap-platform-admin.ts`, extrai `from "…"`, exige ⊆ allowlist; **mutação executada pelo teste** (cópia temporária com `import "../src/modules/auth/index.js"` → o mesmo verificador reprova) (A4) | idem | não |
| T1.8 | contrato do Runbook B (doc-guard; espelho de `tests/san3-04a-matriz-x-catalogo-guard.test.ts:29-30,504`, que lê `RBAC_MATRIX.md` do disco por `fileURLToPath(new URL("../", import.meta.url))`): lê `docs/deployment.md`, recorta de `#### Runbook B` ao próximo `### `, exige `ALLOW_PROD_BOOTSTRAP`, `scripts/bootstrap-platform-admin.ts`, `--dry-run`, `--password-stdin`, `PRODUCTION_OPT_IN_MISSING` e a menção ao runbook B-O6R-01 (A20; A16 documental) | idem | não |
| T2.1 | banco de drill **só migrado** (antes do `db:provision-rbac`): `bootstrapPlatformAdmin` → `RBAC_NOT_PROVISIONED`; `tenants = users = 0` (A8) | `san3-09-bootstrap-platform-admin-db.test.ts` | sim |
| T2.2 | após `db:provision-rbac` (processo filho no drill): 1ª execução → flags `true`, `1/1/1/1/1`, `status active`, vínculo global, `scrypt-v1` (A9) | idem | sim |
| T2.3 | 2ª execução → flags `false`, contagens e hash iguais, auditoria 1 (A10) | idem | sim |
| T2.4 | `--dry-run` em estado limpo e em estado convergido: 0 escritas (A11) | idem | sim |
| T2.5 | outro e-mail → `ADDITIONAL_ADMIN_REFUSED`, contagens intactas (A12) | idem | sim |
| T2.6 | `--reset-password` com `failed_attempts=4`/`locked_until` armados → hash muda, `0/NULL`, auditoria +1 (A13) | idem | sim |
| T2.7 | papel efêmero `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole(drillAdmin, drillUrl)`): limpo → `1/1/1/1/1`; de novo → idempotente; sem GUC o papel vê `0` usuários, a administrativa vê `1` (A14) | idem | sim |
| T2.8 | HTTP: `process.env.DATABASE_URL = drillUrl` e `globalThis.prisma = efemera.client` **antes** dos imports dinâmicos (`san3-04a:63-69`); `POST /api/v1/auth/login` com `tenantId` → 200 e `roles ∋ super_admin`; `GET /api/v1/platform/overview` com o token → 200; senha errada → 401; **sem** `tenantId` → 401 uniforme (o papel efêmero não executa `auth_login_candidates`) (A15, A16) | idem | sim |
| T2.9 | processo filho contra o drill: 1ª exit 0; 2ª exit 0; `NODE_ENV=production` sem opt-in → exit 2 e contagens intactas; saídas sem senha/hash/`postgresql://` (A17) | idem | sim |
| T2.10 | duas chamadas simultâneas (`Promise.all`, dois clientes) em estado limpo → `1/1/1/1/1` (A18) | idem | sim |

**Desenho do `-db` (o "banco prod-like" que a pendência exige, sem poluir a base compartilhada da CI):** um único
`test(…, { timeout: 300_000 }, async (t) => …)` com subtestes **sequenciais** (a ordem T2.1 → T2.2 importa); auto-pula
**declarando** sem `DATABASE_URL` (padrão `san3-04a:52-55`) e **nunca** pula com ela (orçamento `SKIP_BUDGET_DB = 2`,
`run-backend-tests.mjs:82`). Setup: com a conexão administrativa, `CREATE DATABASE erp_san3_09_drill_<sufixo>`
(`$executeRawUnsafe`; H6), URL reescrita para o drill (a técnica de `rbac-provision-drill.sh:33-37`), `npx prisma migrate
deploy` e `npm run --silent db:provision-rbac` como processos filhos com `DATABASE_URL = drillUrl`; teardown em `finally`:
desconectar tudo, `DROP DATABASE … WITH (FORCE)`. Papel efêmero **só** pelo arnês (`createEphemeralRole`, lock de
catálogo, teardown resiliente — `o6r06-usage-atomic-db.test.ts:610-618`). **Ratchet lexical** (`db-catalog-write-guard.test.ts:62-69`):
os dois arquivos novos não podem conter `CREATE ROLE`, `DROP ROLE`, `ALTER ROLE`, `GRANT`, `REVOKE`, `OWNER TO` — nem
em comentário (escrever "concessão de EXECUTE", não a palavra-chave). O `CREATE DATABASE` não está no ratchet.
O vermelho-controle da mutação sem GUC (M10) é **executado pela junta** (sed no script + T2.7), não pelo teste.

**Bateria de validação (§9 do contrato), na ordem, com `timeout` e `ec` por variável:**

```
npm run check
npm run lint
npx tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck --types node scripts/bootstrap-platform-admin.ts    # A19 (scripts/ fora do tsconfig)
node --test --import tsx tests/san3-09-bootstrap-platform-admin.test.ts
node --test --import tsx tests/seed-guard.test.ts tests/backfill-third-party-vehicle-identity.test.ts tests/npm-test-runner-guard.test.ts tests/deploy-manifest-parity.test.ts tests/auth-invariant-guards.test.ts    # regressões da família
DATABASE_URL=<descartável> node --test --import tsx tests/san3-09-bootstrap-platform-admin-db.test.ts
DATABASE_URL=<descartável> node --test --import tsx tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts tests/core-saas-role-authority-db.test.ts tests/auth-login-anonymous-db.test.ts tests/auth-login-candidates-fn-db.test.ts tests/rls-tenant-isolation.test.ts tests/db-catalog-write-guard.test.ts tests/auth-identity-exposure-scan.test.ts    # regressões dos blocos anteriores
DATABASE_URL=<descartável> npm test                         # suíte inteira (contagem real → KPI)
npm run build
node scripts/kpi-freeze.mjs                                 # reinjeta a cópia congelada do kpis-latest.json no app.js (D12) — commit dos dois juntos
node --check Kpis/app.js && node --test --import tsx tests/kpi-dashboard-charts.test.ts    # 17/17 (medido em cópia de rascunho: só o JSON mexido → `not ok 11`, 16/17)
git diff --check
```

Mais: `git diff --name-only origin/main...HEAD` ⊆ PERMITIDO (§6); `git grep -n -E 'CREATE ROLE|DROP ROLE|ALTER ROLE|GRANT|REVOKE|OWNER TO' -- tests/san3-09-*` →
**vazio**; `bash <Apêndice A> . HEAD | grep scripts/` → `scripts/bootstrap-platform-admin.ts` aparece (o script entrou na
família das travas); `grep -n -E 'password|postgresql://' <saída do processo filho>` → vazio; `git diff origin/main...HEAD -- docs/deployment.md`
só dentro do Runbook B.

---

## §9 — KPI (§C3) — no próprio PR

- `Kpis/kpis-latest.json`, `Kpis/kpis-history.json` (append) e `Kpis/kpis-history.md` (append) no mesmo PR; o painel
  `Kpis/index.html` hidrata dos JSON — **nenhuma** dimensão nova. `Kpis/app.js` **é** tocado, só na linha `var FROZEN = …;`,
  por `node scripts/kpi-freeze.mjs`: `tests/kpi-dashboard-charts.test.ts:323-343` exige a cópia congelada **idêntica** ao
  `kpis-latest.json` (medido em cópia de rascunho: controle 17/17; só o JSON mexido → `not ok 11`, 16/17; os 8 últimos commits
  da `origin/main` que tocaram `kpis-latest.json` são os mesmos 8 que tocaram `app.js`) — D12. `index.html`/`styles.css` intocados.
- `metrics.backend_tests`: **reexecução real** (`DATABASE_URL=<descartável> npm test`, TAP), nunca copiado do `3052/3054`.
  `metrics.frontend_smoke_tests` (`1202/1202`) e `metrics.flutter_tests` (`864/864`): **carregados com nota** (§C3.3 —
  `git diff --name-only origin/main...HEAD -- frontend mobile` vazio, colado na nota).
- `metrics.mvp_demo` (99 %) / `metrics.mvp_vendavel` (88 %): **intocados** (§C3.4) — o item 43 só conta fechado após o
  ato do dono (§4.2, l.193; §10 item 0 do PLANO_SAN3). Uma linha no history diz isso.
- `metrics.blocks_completed`: **168 → 169**, contado a partir do valor publicado na `origin/main` (`3b1fe0f9`, #395 =
  168); o history do #394 avisa que "quem mergear depois reconta" — o dev reconta no pré-merge.
- `release.block`: "B-SAN3-09 (item 43 do §4.1 — script testado; fecho depende do ato do dono)"; `pr` após
  `gh pr create`; `merge_commit`/`approved_head` **`null` na autoria** (§C3.5); `status: "published_per_pr"`.
- History: 1 linha por métrica carregada; menção de que a linha do §5.2 diz "2 execuções = 1 tenant de sistema + 1 admin"
  e o plano mediu **19 linhas de matriz / 25 execuções do script** (§0.5), inclusive 2 execuções **simultâneas**; que a trava é própria (`ALLOW_PROD_BOOTSTRAP`,
  D2) e que o script exige o RBAC do CD (D3).

---

## §10 — Junta (§C7) — quórum, composição, papéis, terreno, resiliência

- **Quórum: unanimidade de 3** (§C7.1-ter(b): o bloco toca **segurança e permissão** — cria a credencial que alcança
  todas as organizações e o vínculo ao papel de plataforma). Sem `critico-adversarial` (não é invariante financeiro).
  A linha do §5.2 nomeia `agente-secops`; as outras duas cadeiras são `agente-dba-guardiao` (idempotência, RLS, lock,
  drill num cluster próprio) e `guardiao-fail-closed` (recusas nomeadas, guard de imports, mutações). Os três corpos
  existem na ref (`git ls-tree origin/main .claude/agents/` → `agente-secops.md`, `agente-dba-guardiao.md`,
  `guardiao-fail-closed.md`).
- **Objeto:** o SHA do head da entrega com check-runs **concluídos** (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`).
  Sem CI concluída, o inspetor **bloqueia** o start (§C7.1-bis).
- **Cadeiras (≤ 3 itens cada — P4; medir ≠ julgar):**

| Cadeira | Identidade (nova) | Itens | Veto |
|---|---|---|---|
| C1 segurança do ato e do segredo | `agente-secops` | (1) trava: T1.1/T1.5 rodados + mutação própria (trocar `ALLOW_PROD_BOOTSTRAP` por `ALLOW_PROD_SEED` no script → M5c fica verde = reprova); (2) segredo: `--password=` recusado; saída do processo filho sem senha/hash/URL; `ps -o args` de um run real sem a senha; auditoria com allowlist (`metadata` sem senha/hash); política 12 ratificada ou emendada por escrito; (3) diff × escopo §6 (nada em PROIBIDO; `deployment.md` só Runbook B) e o registro A21 | **sim** |
| C2 idempotência e isolamento no banco | `agente-dba-guardiao` | (1) num cluster **descartável próprio**: `migrate deploy` + `db:provision-rbac` + script 2× → `1/1/1/1/1`, hash igual; 2 execuções **simultâneas** → `1/1/1/1/1`; `--dry-run` → 0 escritas; (2) sob papel `NOSUPERUSER NOBYPASSRLS` criado por si: cria e é idempotente; **mutação** `sed '/setTenantRlsContext(tx, tenant.id)/d'` → falha por RLS com rollback total (e passa verde sob superusuário — o verde-cego declarado); (3) base só migrada → `RBAC_NOT_PROVISIONED` e nenhuma linha; o script **não** contém `role.create`/`rolePermission` (grep) | sim |
| C3 recusas nomeadas e guard | `guardiao-fail-closed` | (1) T1.2–T1.4, T1.7 rodados + mutação **nova** de autoria própria no guard de imports (import fora da allowlist em cópia temporária → vermelho); (2) T2.5/T2.6/T2.8/T2.9 rodados no head; login direcionado 200 e anônimo 401 medidos por HTTP; (3) `tsc` do script verde; Runbook B (A20/T1.8) confere com o script (variáveis, flags, códigos de saída) — leitura contra execução, não contra o plano | sim |

- **Inspetor de terreno** (`inspetor-de-terreno-da-junta`, Fable) antes do voto: worktree por jurado que muta, **cluster
  descartável por jurado** (este plano mostra como subir um sem docker, §0.2 — e o de 54331 fica de pé para o
  conferente do plano), `sync-agent-agents.mjs --check` verde, check-runs concluídos no objeto, inelegibilidade por
  nome, plano de perda de jurado.
- **Papéis (§C7.4-bis):** **quem acha** = as três cadeiras acima (identidades novas; nenhuma participou deste plano);
  **quem planeja** = este `planejador-mestre` (Fable; na revalidação pós-correção o Fable é **obrigatório**, §C7.6);
  **quem desenvolve** = desenvolvedor de identidade nova nomeado pelo orquestrador no comando do bloco (proposta de
  nome: `dev-b-san3-09-c1`), que não vota e não é o autor deste plano. Ciclo de reprovação →
  `omega/reprovacoes/R-B-SAN3-09-<ciclo>.md`; no ciclo 3 com `bloqueia`, auditoria da máquina antes do ciclo 4
  (`D-SEM-TETO-AUDITORIA-NO-3`).
- **Escopo do voto (§C7.1-ter(a)):** `dentro-do-bloco` para o script, os dois testes e o Runbook B; `pre-existente`
  (não reprova; pendência com dono) para: ausência de rota de promoção a plataforma (`P-O6R-B01-PROMOCAO-PLATAFORMA`,
  B-O6R-01); login sem organização inerte sob papel de runtime até o GRANT humano (runbook B-O6R-01, `deployment.md:461`);
  `NODE_ENV` não exportado fora do contêiner (`seed-guard.ts:3-7`, Ω-INFRA-3, 2026-07-14); `scripts/*.ts` fora do
  `tsconfig` (raiz `f4ef511`); a organização "Plataforma" listada no console (produto, §13) — com evidência de data
  (§0.3 P-o).
- **P1–P6:** evidência incremental em `omega/juntas/votos/B-SAN3-09/<cadeira>-evidencia.md`; voto-arquivo-primeiro
  (`<cadeira>-voto.json`, esqueleto `EM APURAÇÃO` item a item); ≤ 2 jurados em paralelo; `00-quedas.md`; ata
  `omega/juntas/J-B-SAN3-09.md`.
- **Porteiro pós-merge** (`porteiro-pos-merge`, Fable): revalida promessa × diff, reexecuta a contagem de KPI, confere
  A21 e a limpeza §C5, e **libera** (ou não) o próximo alvo da frente 2 (`B-SAN3-22`, agenda l.344).

---

## §11 — ATOS DO DONO — o que só você faz, escrito para você ler

> O bloco entrega **pronto**: o script, os testes e o Runbook B. O item 43 **só fecha** quando o script tiver rodado
> em produção (`PLANO_SAN3.md` §4.2, l.193) — e isso o repositório não pode fazer por você. O plano **não decide** o
> e-mail, o nome nem a senha do administrador; abaixo vão os defaults e o comando de cada passo. **Nada disto é feito
> pelo PR. Nada disto é feito antes do merge do PR.** O script **não roda dentro do contêiner** (a imagem de produção
> não tem o `tsx`): roda de um checkout, como o `migrate` e o `db:provision-rbac` já rodam na pipeline.

**Ato 0 — conferir que o CD já preparou o banco (é pré-condição; o script recusa sem isto).**
1. `psql "$PROD_DATABASE_URL" -Atc "SELECT count(*) FROM roles r WHERE r.key='super_admin' AND r.tenant_id IS NULL AND EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id)"`
   → `1`. Se `0`, o deploy de produção ainda não rodou o passo "Provision RBAC" nesse banco: rode-o (ou o deploy) antes.

**Ato 1 — criar o 1º administrador de plataforma (produção; depois, se quiser, staging).**
2. Num checkout do SHA mergeado: `npm ci && npx prisma generate`.
3. Escolha o e-mail do administrador e uma senha nova e forte (≥ 12 caracteres, ≠ e-mail), que **não** vai para o
   repositório, para o chat nem para a linha de comando. Primeiro a **simulação**, depois a aplicação — o mesmo comando,
   sem e com `--dry-run`. Com a senha lida do terminal sem eco (nada fica no histórico do shell):
   ```bash
   read -rs -p "Senha do administrador da plataforma: " SENHA; echo
   printf '%s\n' "$SENHA" | NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1 \
     DATABASE_URL="$PROD_DATABASE_URL" PLATFORM_ADMIN_EMAIL='<e-mail>' PLATFORM_ADMIN_NAME='<nome>' \
     npx tsx scripts/bootstrap-platform-admin.ts --password-stdin --dry-run
   printf '%s\n' "$SENHA" | NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1 \
     DATABASE_URL="$PROD_DATABASE_URL" PLATFORM_ADMIN_EMAIL='<e-mail>' PLATFORM_ADMIN_NAME='<nome>' \
     npx tsx scripts/bootstrap-platform-admin.ts --password-stdin
   unset SENHA
   ```
   `DATABASE_URL` é a credencial do **migrador** (a mesma de `PROD_DATABASE_URL` no GitHub Environment `production`);
   também funciona com o papel de runtime do `B-SAN3-05`, em qualquer ordem entre os dois atos (medido, M9).
   O script termina com **uma** linha: `CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.` e sai
   com `0`. Se sair com `2`, ele diz o motivo pelo nome (`RECUSADO (<código>): …`) e **nada foi gravado**; se sair com
   `1`, a transação foi desfeita — nada foi gravado. Rodar de novo é seguro (idempotente): não troca a senha.
4. `ALLOW_PROD_BOOTSTRAP=1` vale **só nesse comando**. Não o coloque no `[env]` do `fly.*.toml`, num secret, num `.env`
   nem no perfil do shell. (É a mesma regra do `ALLOW_PROD_SEED` do Runbook B — mas são variáveis **diferentes**, de
   propósito: uma não abre a outra.)

**Ato 2 — entrar.**
5. **Pela API, imediatamente:** `curl -sS -X POST "$API/api/v1/auth/login" -H 'content-type: application/json' -d
   '{"tenantId":"<id impresso no passo 3>","email":"<e-mail>","password":"…"}'` → `200` com `roles` contendo `super_admin`.
6. **Pela web:** a tela de login **não pede organização** — ela usa o login sem organização (B-O6R-01). Isso só
   funciona quando o papel com que a API fala ao banco pode executar `auth_login_candidates`: se a API ainda usa a
   credencial do migrador, já funciona; se você já fez o ato do `B-SAN3-05` (papel de runtime), siga o runbook de
   ativação do login sem organização (`docs/deployment.md`, "Runbook de ativação do login sem organização", passos 0-7)
   e confira `GET /api/v1/health/ready` → `login_without_org: "active"`. Até lá, a tela de login da web responde
   **"Tenant, e-mail ou senha invalidos."** (o texto que ela dá a todo 401 — `auth.adapter.ts:208-209`) para **qualquer**
   conta — não é a senha.
7. No primeiro acesso ao Console da Plataforma, a organização **"Plataforma"** aparece na lista de organizações. É a
   organização de sistema que hospeda o seu usuário; não a suspenda nem a apague (o usuário do admin vive nela).

**Se a senha se perder:** o mesmo comando do passo 3 com `--reset-password` (redefine a senha, zera tentativas e
bloqueio, e registra na auditoria). Não existe troca de senha pela tela (`P-O6R-B01-TROCA-SENHA`).

**Para desfazer o ato (se precisar):** `psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -c "BEGIN; DELETE FROM audit_logs WHERE tenant_id = (SELECT id FROM tenants WHERE slug='platform'); DELETE FROM local_auth_credentials WHERE tenant_id = (SELECT id FROM tenants WHERE slug='platform'); DELETE FROM user_role_assignments WHERE tenant_id = (SELECT id FROM tenants WHERE slug='platform'); DELETE FROM users WHERE tenant_id = (SELECT id FROM tenants WHERE slug='platform'); DELETE FROM tenants WHERE slug='platform'; COMMIT;"`
— o script não cria nada além dessas cinco linhas (medido: `auth_identities/links = 0/0` após a execução; nenhum trigger em `users`).

**O que muda no registro quando o Ato 1 estiver feito:** `P-SAN-PROD-BOOTSTRAP` passa de `EM ANDAMENTO` para
`FECHADA`, com a linha `CONVERGIDO …` (sem e-mail real, se preferir) como evidência; o item 43 do §4.1 fecha. Até lá,
o PR mergeado é **código pronto, ato pendente** — é assim que o §4.2 manda contar.

---

## §12 — Riscos e rollback

| R | Risco | Mitigação | Rollback |
|---|---|---|---|
| R1 | `NODE_ENV` não exportado na máquina do dono ⇒ a trava de produção não morde (H1) | o §11 exporta inline; as **outras** recusas (RBAC, 2º admin, senha, argv) não dependem de `NODE_ENV`; honestidade igual à do `seed-guard.ts:3-7` | — |
| R2 | Senha vaza pelo histórico do shell ou por `ps` | `--password-stdin` + `read -rs`; `--password=` recusado; env não aparece em `ps` (P-l); log sem segredo (M16) | `--reset-password` |
| R3 | A credencial do migrador na máquina do dono | é a mesma que o CD já usa; o §11 não a persiste; `/proc/<pid>/environ` é 0400 | — |
| R4 | O teste `-db` cria um banco de drill na CI (H6) e a CI não permite `CREATE DATABASE` | o teste **falha alto** (nunca pula); o dev mede no run do PR; alternativa declarada: rodar o drill contra o banco compartilhado com sufixos únicos e teardown escopado (sem `db:provision-rbac` — usar o braço 2 de `san3-04a`) | — |
| R5 | Já existir uma organização de cliente com slug `platform` | produção nasce com `tenants = 0` (§0.2) e o slug só nasce por este script; **não** implementado: recusar se `name ≠ "Plataforma"` (residual declarado; a junta pode pedir) | renomear a organização do cliente antes do ato |
| R6 | Segundo administrador "por engano" | `ADDITIONAL_ADMIN_REFUSED` (M7) | — |
| R7 | O admin nasce sem plataforma porque as concessões faltaram | `RBAC_NOT_PROVISIONED` exige `super_admin` global **com** concessões (M4) | rodar `db:provision-rbac` e o script de novo |
| R8 | `--reset-password` na mão errada (quem tem a credencial do migrador redefine a senha do admin) | é a mesma superfície do `psql` com a credencial do migrador; a auditoria registra `passwordReset: true`; SoD real é a rota de plataforma pendente | — |
| R9 | Política 12 ≠ 8 do app: futura troca de senha pela tela aceitaria 8 | residual declarado; `P-O6R-B01-TROCA-SENHA` decide a política única | — |
| R10 | `docs/deployment.md` conflita com o `B-SAN3-05` (regiões distintas do mesmo arquivo) | rebase + reconferência do Runbook B | — |

**Rollback do PR inteiro:** `git revert` do squash — nenhuma migração, nenhum objeto de banco criado pelo código; as
linhas criadas pelo **ato** (se já feito) são removidas pelo comando do §11 ("Para desfazer o ato").

---

## §13 — O que este plano NÃO pega (pendências nomeadas, com dono)

| Pendência (a abrir no PR) | O quê | Dono proposto |
|---|---|---|
| `P-SAN3-09-ORG-PLATAFORMA-NO-CONSOLE` | a organização de sistema `platform` aparece na lista/contagens do console de plataforma como se fosse cliente (`GET /platform/tenants`, `overview`); rotular ou filtrar é decisão de produto | `B-SAN3-06b` (telas de plataforma) |
| `P-SAN3-09-ENV-EXAMPLE-BOOTSTRAP` | documentar `ALLOW_PROD_BOOTSTRAP`, `PLATFORM_ADMIN_EMAIL/NAME/PASSWORD` no `.env.example` ao lado do bloco de `ALLOW_PROD_SEED` (l.91-94) — `.env.example` é §C4, fora desta fronteira | bloco de configuração/governança (a nomear pelo orquestrador) |
| `P-SAN3-09-SCRIPTS-FORA-DO-TSCONFIG` | `scripts/*.ts` não passam por `npm run check` (`tsconfig.json` inclui só `src/**`); este bloco põe o `tsc` do script na bateria, mas a CI não o roda | `B-ARNES-2` / bloco de CI |
| `P-SAN3-09-ROTEIRO-DE-OPERACAO` | o roteiro de operação com "bootstrap do 1º admin" e o checklist de go-live (`docs/go-live-readiness.md`, que hoje não cita o admin) | `B-SAN3-10`, item (e) (`PLANO_SAN3.md:300`) — já é dele |
| (referência, não nova) `P-O6R-B01-PROMOCAO-PLATAFORMA` | administradores adicionais / promoção a plataforma com SoD e trilha — o script recusa o 2º admin de propósito | B-O6R-01 (já aberta, `pendencias.md:2549`) |
| (referência, não nova) `P-O6R-B01-TROCA-SENHA` | troca de senha pela aplicação; até lá o único reset é `--reset-password` | B-O6R-01 (já aberta) |
| (registro, não pendência) | D2 (`ALLOW_PROD_BOOTSTRAP` ≠ `ALLOW_PROD_SEED`) e D3 (o papel é do CD) — emendas em `P-SAN-PROD-BOOTSTRAP` e na ata | ata da junta + `pendencias.md` |

Também fora: `package.json` (alias `db:bootstrap-platform-admin` — opcional, e o ramo em voo está no arquivo);
`prisma/seed*.ts`; `.github/workflows/**`; `fly.*.toml`; qualquer rota nova.

---

## §14 — Comando do bloco (para o orquestrador colar em `agent-orchestration/codex/comandos/B-SAN3-09-bootstrap-platform-admin.md`)

`# B-SAN3-09 — bootstrap do 1º administrador de plataforma (item 43)` · **Objetivo** §1 · **Fontes** §0 deste plano ·
**Regras** §2 e §4 (o script é o Apêndice B, byte a byte salvo o que a junta pedir; nunca cria papel; nunca carrega
`env.ts`; senha nunca em argv; trava própria e estrita) · **Escopo PERMITIDO/PROIBIDO** §6 · **Rito** §10 (inspetor →
dev → junta unânime de 3 → porteiro) · **Teste de encerramento** §7 A1–A21 com T1.1–T2.10 · **Bateria** §8 · **KPI** §9 ·
**DoD** §10 do contrato + A21 · **Atos do dono** §11 (fora do PR) · **Rastreabilidade**: `pr`, `merge_commit`,
`approved_head`, `J-B-SAN3-09.md`, `published_per_pr`.

---

## Apêndices

- **A** — o gerador da lista de travas de produção, verbatim, e a saída completa no head `3b1fe0f9`.
- **B** — o protótipo do script (texto final que o desenvolvedor commita), verbatim, e a linha de `sed` da cópia medida.
- **C** — a matriz de medição (`matriz.sh`), verbatim, e a saída completa (19 linhas de matriz, 25 execuções do script).
- **D** — a prova de login (`prova-login.ts`), verbatim.
- **E** — geradores do fechamento (ramos em voo, P-n; fecho de imports, §2.1), verbatim, e as saídas.
- **F** — Runbook B verbatim (`origin/main:docs/deployment.md` l.168-185): o texto que E4 reescreve.

---

## Apêndice A — gerador das travas de produção (verbatim) e a saída no head `3b1fe0f9`

Uso: `bash travas-de-producao.sh <repo-root> [ref]` (ref default `origin/main`; mede **na ref**, §A7). Controles em §0.4.

```bash
#!/usr/bin/env bash
# B-SAN3-09 — GERADOR da lista de TRAVAS DE PRODUÇÃO existentes no repositório.
# PROPRIEDADE (não lista de nomes): "ponto do código, fora de src/modules/**, que decide comportamento
# pelo valor NODE_ENV === 'production' (ou pela leitura do opt-in one-shot ALLOW_PROD_*)". É dessa família
# que a trava do bootstrap tem de ser coerente (§5.2 do PLANO_SAN3: 'recusa sem a trava de produção').
# Uso: bash travas-de-producao.sh <repo-root> [ref]   (ref default: origin/main — mede na ref, §A7)
set -euo pipefail
ROOT="${1:-.}"; REF="${2:-origin/main}"
cd "$ROOT"
echo "# ref=$(git rev-parse "$REF") · fonte: git grep na ref (nunca o disco da sessão)"
echo "# colunas: arquivo:linha | trecho"
git grep -n -E 'NODE_ENV(\s*===?\s*|\s*!==?\s*)"production"|ALLOW_PROD_[A-Z_]+|isSeedAllowed|assertSeedAllowed' "$REF" -- \
  'src/config/env.ts' 'prisma/*.ts' 'scripts/*.ts' 'scripts/*.mjs' 'src/server.ts' 'src/database/*.ts' 'src/infra/**' \
  | sed "s#^$REF:##" | sed -E 's/^([^:]+:[0-9]+):\s*/\1 | /' | grep -v -E '^\S+ \| *//'
echo "# total: $(git grep -n -E 'NODE_ENV(\s*===?\s*|\s*!==?\s*)"production"|ALLOW_PROD_[A-Z_]+|isSeedAllowed|assertSeedAllowed' "$REF" -- 'src/config/env.ts' 'prisma/*.ts' 'scripts/*.ts' 'scripts/*.mjs' 'src/server.ts' 'src/database/*.ts' 'src/infra/**' | sed "s#^$REF:##" | grep -v -E '^[^:]+:[0-9]+:\s*//' | wc -l) linhas executáveis (comentários excluídos)"
```

Saída completa (`bash travas-de-producao.sh /home/user/w-b-san3-09 origin/main`):

```
# ref=3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c · fonte: git grep na ref (nunca o disco da sessão)
# colunas: arquivo:linha | trecho
prisma/seed-fleet.ts:17 | import { assertSeedAllowed } from "./seed-guard.js";
prisma/seed-fleet.ts:20 | assertSeedAllowed();
prisma/seed-guard.ts:23 | * `ALLOW_PROD_SEED` (one-off controlado, ver Runbook B em docs/deployment.md).
prisma/seed-guard.ts:25 | export function isSeedAllowed(
prisma/seed-guard.ts:28 | if (envLike.NODE_ENV === "production") {
prisma/seed-guard.ts:29 | return strictBool(envLike.ALLOW_PROD_SEED);
prisma/seed-guard.ts:35 | export function assertSeedAllowed(
prisma/seed-guard.ts:38 | if (isSeedAllowed(envLike)) return;
prisma/seed-guard.ts:41 | "nunca devem rodar em produção. Para um bootstrap one-off controlado, defina ALLOW_PROD_SEED=1 " +
prisma/seed-users.ts:15 | import { assertSeedAllowed } from "./seed-guard.js";
prisma/seed-users.ts:18 | assertSeedAllowed();
prisma/seed.ts:17 | import { assertSeedAllowed } from "./seed-guard.js";
prisma/seed.ts:20 | assertSeedAllowed();
prisma/seed.ts:547 | if (process.env.NODE_ENV === "production") {
prisma/seed.ts:565 | if (process.env.NODE_ENV === "production") {
src/config/env.ts:318 | value.NODE_ENV === "production" &&
src/config/env.ts:329 | value.NODE_ENV === "production" &&
src/config/env.ts:346 | value.NODE_ENV === "production" &&
src/config/env.ts:360 | value.NODE_ENV === "production" &&
src/config/env.ts:370 | value.NODE_ENV === "production" &&
src/config/env.ts:382 | value.NODE_ENV === "production" &&
src/config/env.ts:392 | if (value.NODE_ENV === "production" && !value.PORTAL_TENANT_ID) {
src/config/env.ts:404 | value.NODE_ENV === "production" &&
src/config/env.ts:419 | value.NODE_ENV === "production" &&
src/config/env.ts:430 | value.NODE_ENV === "production" &&
src/config/env.ts:445 | value.NODE_ENV === "production" &&
src/config/env.ts:456 | value.NODE_ENV === "production" &&
src/config/env.ts:470 | value.NODE_ENV === "production" &&
src/config/env.ts:490 | if (value.NODE_ENV === "production" && value.CORE_SAAS_PERSISTENCE !== "prisma") {
src/config/env.ts:500 | if (value.NODE_ENV === "production" && !value.DATABASE_URL) {
src/config/env.ts:512 | if (value.NODE_ENV === "production" && value.JOBS_WORKER_ENABLED !== true) {
src/config/env.ts:531 | if (value.NODE_ENV === "production" && (!value.REDIS_URL || isRedisHostRefusedInProduction(redisHost))) {
src/config/env.ts:546 | if (value.NODE_ENV === "production" && value.EVIDENCE_SCANNER === "noop") {
src/config/env.ts:638 | parsedEnv.EVIDENCE_SCANNER ?? (parsedEnv.NODE_ENV === "production" ? "unavailable" : "noop"),
src/database/prisma.ts:19 | if (process.env.NODE_ENV !== "production") {
# total: 35 linhas executáveis (comentários excluídos)
```

---

## Apêndice B — `scripts/bootstrap-platform-admin.ts` (verbatim; md5 `a5f5383dfbbabde9a63205bd40f64782`, 417 linhas)

A cópia **medida** (§0.5) foi gerada deste texto por
`sed -e 's#"dotenv/config"#"<worktree>/node_modules/dotenv/config.js"#' -e 's#"@prisma/adapter-pg"#"<worktree>/node_modules/@prisma/adapter-pg/dist/index.js"#' -e 's#"@prisma/client"#"<worktree>/node_modules/@prisma/client/default.js"#' -e 's#"\.\./src/#"<worktree>/src/#g'`
(6 linhas de import; `diff | grep -c '^[<>]'` = 12) e executada com `npx tsx` a partir da raiz do worktree, num diretório
de rascunho com `{"type":"module"}` (o mesmo `type` do `package.json` do repo).

```ts
// B-SAN3-09 (P-SAN-PROD-BOOTSTRAP, item 43 do PLANO_SAN3) — bootstrap do 1º administrador de PLATAFORMA.
//
// O QUE ELE FAZ (e só isto): numa base já MIGRADA e já PROVISIONADA pelo CD (`prisma migrate deploy` +
// `npm run db:provision-rbac` — deploy-production.yml:135-164), cria UMA organização de sistema
// (`tenants.slug = "platform"`, sem RLS), UM usuário nela, o vínculo dele ao papel GLOBAL `super_admin`
// (`roles.tenant_id IS NULL`, provisionado pelo CD — este script NUNCA cria papel) e UMA credencial local
// (scrypt-v1, pelo MESMO serviço que o login verifica). Tudo dentro de UMA transação, sob advisory lock,
// e sob o GUC `app.current_tenant_id` da organização (users/user_role_assignments/local_auth_credentials/
// audit_logs têm FORCE ROW LEVEL SECURITY — migração 20260608000000). IDEMPOTENTE: a 2ª execução não cria
// nada e não troca a senha (só com `--reset-password`, explícito).
//
// O QUE ELE NÃO FAZ, DE PROPÓSITO:
//   · não semeia demonstração, não cria papel, não concede permissão (é o db:provision-rbac; Runbook B);
//   · não cria um SEGUNDO administrador: organização de sistema com admin de outro e-mail → RECUSA
//     (`ADDITIONAL_ADMIN_REFUSED`); administradores adicionais são a rota de plataforma pendente
//     (P-O6R-B01-PROMOCAO-PLATAFORMA), com SoD e trilha própria — nunca este script;
//   · não importa `src/modules/auth/index.js` nem nada que alcance `src/config/env.ts`: o env.ts faz
//     `envSchema.parse(process.env)` no import (l.599) e, em NODE_ENV=production, exige JWT_SECRET,
//     REDIS_URL, CORS_ORIGIN, PORTAL_* — o operador que roda isto de fora do contêiner não os tem, e não
//     deve precisar ter. Só módulos-folha: rls.ts, o repositório/serviço de credencial e o password.service.
//
// TRAVA DE PRODUÇÃO (coerente com prisma/seed-guard.ts — mesma semântica ESTRITA de `booleanFlag`):
//   NODE_ENV=production → recusa (exit 2) salvo opt-in one-shot `ALLOW_PROD_BOOTSTRAP=1|true|yes|on`,
//   inline no único comando e nunca persistido. Variável PRÓPRIA (não ALLOW_PROD_SEED): reusar a do seed
//   faria o mesmo opt-in reabrir o seed demo no mesmo ambiente (docs/deployment.md, Runbook B, item 2).
//   Honestidade de alcance (a mesma de seed-guard.ts:3-7): a trava só morde onde NODE_ENV=production
//   está exportado; por isso o Runbook manda exportá-lo INLINE junto com o opt-in.
//
// SEGREDO: a senha entra por `PLATFORM_ADMIN_PASSWORD` (variável de ambiente) ou por `--password-stdin`
// (1ª linha da entrada padrão). NUNCA por argumento: `--password[=…]` é recusado (`PASSWORD_IN_ARGV`) —
// argv aparece em `ps -o args` para qualquer usuário da máquina; env não aparece (medido no plano, §0.5).
// Nenhuma senha, hash ou URL de banco vai ao log (§2.8): o relatório é nome do banco, ids e flags.
//
// USO (docs/deployment.md, Runbook B):
//   PLATFORM_ADMIN_EMAIL=… PLATFORM_ADMIN_PASSWORD=… npx tsx scripts/bootstrap-platform-admin.ts
//   … --dry-run            só relata o que criaria; não escreve nada
//   … --password-stdin     lê a senha da entrada padrão (1ª linha), em vez da variável
//   … --reset-password     redefine a senha do admin já existente (zera lockout/contador)
// Códigos de saída: 0 = ok (criado ou já convergido) · 2 = RECUSA nomeada (trava/entrada/estado) · 1 = erro.

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { setTenantRlsContext } from "../src/database/rls.js";
import {
  LocalAuthCredentialRepository,
  normalizeCredentialEmail,
} from "../src/modules/auth/repositories/local-auth-credential.repository.js";
import {
  LocalAuthCredentialService,
  validateLocalPassword,
} from "../src/modules/auth/services/local-auth-credential.service.js";

export const PLATFORM_TENANT_SLUG = "platform";
export const PLATFORM_TENANT_NAME = "Plataforma";
export const PLATFORM_ROLE_KEY = "super_admin";
export const PLATFORM_ADMIN_DEFAULT_NAME = "Administrador da Plataforma";
// Mais estrito que o mínimo do app (8, `validateLocalPassword`): é a credencial que alcança TODAS as
// organizações (`platform-permissions.ts` concede plataforma pela presença do papel). Decisão declarada
// no plano do bloco; a junta (agente-secops) ratifica o número.
export const BOOTSTRAP_MIN_PASSWORD_LENGTH = 12;
// Serializa duas execuções concorrentes (o UNIQUE de `tenants.slug` já protege a organização; o lock
// protege a sequência usuário → vínculo → credencial, como `scripts/provision-rbac.ts:70`).
export const BOOTSTRAP_ADVISORY_LOCK = 20260909n;
export const BOOTSTRAP_AUDIT_ACTION = "platform.bootstrap.admin_created";

export type BootstrapRefusalCode =
  | "PRODUCTION_OPT_IN_MISSING"
  | "DATABASE_URL_MISSING"
  | "EMAIL_MISSING"
  | "PASSWORD_MISSING"
  | "PASSWORD_IN_ARGV"
  | "PASSWORD_TOO_WEAK"
  | "RBAC_NOT_PROVISIONED"
  | "ADDITIONAL_ADMIN_REFUSED";

export class BootstrapRefused extends Error {
  constructor(
    readonly code: BootstrapRefusalCode,
    message: string,
  ) {
    super(message);
    this.name = "BootstrapRefused";
  }
}

const TRUTHY = new Set(["true", "1", "yes", "on"]);

function strictBool(raw: string | undefined): boolean {
  if (!raw) return false;
  return TRUTHY.has(raw.trim().toLowerCase());
}

/** Núcleo puro/testável da trava (espelho de `isSeedAllowed`, prisma/seed-guard.ts:25-32). */
export function isBootstrapAllowed(envLike: Record<string, string | undefined> = process.env): boolean {
  if (envLike.NODE_ENV === "production") {
    return strictBool(envLike.ALLOW_PROD_BOOTSTRAP);
  }
  return true;
}

export type BootstrapFlags = {
  readonly dryRun: boolean;
  readonly passwordStdin: boolean;
  readonly resetPassword: boolean;
};

export function parseArgv(argv: readonly string[]): BootstrapFlags {
  for (const argument of argv) {
    if (argument === "--password" || argument.startsWith("--password=")) {
      throw new BootstrapRefused(
        "PASSWORD_IN_ARGV",
        "Senha por argumento é recusada (argv é visível em `ps`). Use PLATFORM_ADMIN_PASSWORD ou --password-stdin.",
      );
    }
  }
  return {
    dryRun: argv.includes("--dry-run"),
    passwordStdin: argv.includes("--password-stdin"),
    resetPassword: argv.includes("--reset-password"),
  };
}

export type BootstrapInput = {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly resetPassword: boolean;
};

export function assertBootstrapPassword(password: string, normalizedEmail: string): void {
  try {
    validateLocalPassword(password, normalizedEmail);
  } catch (error) {
    throw new BootstrapRefused("PASSWORD_TOO_WEAK", error instanceof Error ? error.message : "Senha inválida.");
  }
  if (password.length < BOOTSTRAP_MIN_PASSWORD_LENGTH) {
    throw new BootstrapRefused(
      "PASSWORD_TOO_WEAK",
      `A senha do administrador da plataforma precisa de pelo menos ${BOOTSTRAP_MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }
}

export function readBootstrapInput(
  envLike: Record<string, string | undefined>,
  flags: BootstrapFlags,
  stdinPassword?: string,
): BootstrapInput {
  const email = normalizeCredentialEmail(envLike.PLATFORM_ADMIN_EMAIL ?? "");
  if (!email || !email.includes("@")) {
    throw new BootstrapRefused("EMAIL_MISSING", "PLATFORM_ADMIN_EMAIL é obrigatório (e-mail do 1º administrador).");
  }
  const password = flags.passwordStdin ? (stdinPassword ?? "") : (envLike.PLATFORM_ADMIN_PASSWORD ?? "");
  if (!password) {
    throw new BootstrapRefused(
      "PASSWORD_MISSING",
      flags.passwordStdin ? "Nenhuma senha na entrada padrão." : "PLATFORM_ADMIN_PASSWORD é obrigatório (ou use --password-stdin).",
    );
  }
  assertBootstrapPassword(password, email);
  const name = envLike.PLATFORM_ADMIN_NAME?.trim() || PLATFORM_ADMIN_DEFAULT_NAME;
  return { email, name, password, resetPassword: flags.resetPassword };
}

export type BootstrapReport = {
  readonly database: string;
  readonly dryRun: boolean;
  readonly tenantId: string | null;
  readonly userId: string | null;
  readonly tenantCreated: boolean;
  readonly userCreated: boolean;
  readonly assignmentCreated: boolean;
  readonly credentialCreated: boolean;
  readonly passwordReset: boolean;
};

export async function bootstrapPlatformAdmin(
  prisma: PrismaClient,
  input: BootstrapInput,
  options: { readonly dryRun?: boolean } = {},
): Promise<BootstrapReport> {
  const dryRun = options.dryRun === true;
  const [{ db }] = await prisma.$queryRaw<Array<{ db: string }>>`SELECT current_database() AS db`;

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK}::bigint)`;

      // 1) O papel GLOBAL super_admin tem de existir COM concessões — quem o cria é o CD (db:provision-rbac).
      //    Sem ele o admin nasceria sem plataforma nenhuma, em silêncio: recusa, nunca "cria para ajudar".
      //    (`roles` sob FORCE RLS: a política deixa ver `tenant_id IS NULL` sem GUC — migração 20260608, l.26.)
      const globalRoles = await tx.role.findMany({
        where: { key: PLATFORM_ROLE_KEY, tenant_id: null },
        select: { id: true, _count: { select: { role_permissions: true } } },
        orderBy: { created_at: "asc" },
      });
      const role = [...globalRoles].sort((a, b) => b._count.role_permissions - a._count.role_permissions)[0];
      if (!role || role._count.role_permissions === 0) {
        throw new BootstrapRefused(
          "RBAC_NOT_PROVISIONED",
          `Papel global "${PLATFORM_ROLE_KEY}" ausente ou sem concessões neste banco. Rode \`npm run db:provision-rbac\` antes (é o passo do CD).`,
        );
      }

      // 2) Organização de sistema (`tenants` não tem RLS; `slug` é UNIQUE — a 2ª execução a reencontra).
      let tenant = await tx.tenant.findUnique({ where: { slug: PLATFORM_TENANT_SLUG }, select: { id: true } });
      const tenantCreated = tenant === null;
      if (!tenant) {
        if (dryRun) {
          return {
            database: db,
            dryRun,
            tenantId: null,
            userId: null,
            tenantCreated: true,
            userCreated: true,
            assignmentCreated: true,
            credentialCreated: true,
            passwordReset: false,
          } satisfies BootstrapReport;
        }
        tenant = await tx.tenant.create({
          data: { name: PLATFORM_TENANT_NAME, slug: PLATFORM_TENANT_SLUG, status: "active", modules: [] },
          select: { id: true },
        });
      }

      // 3) Contexto de RLS da organização — sem isto, sob papel NOBYPASSRLS, users/vínculos/credenciais
      //    são invisíveis (SELECT = 0) e o INSERT é recusado (42501). Sob superusuário é inócuo.
      await setTenantRlsContext(tx, tenant.id);

      // 4) Só o 1º administrador. Admin de OUTRO e-mail já vinculado ao papel → recusa nomeada.
      const existingAdmins = await tx.userRoleAssignment.findMany({
        where: { tenant_id: tenant.id, role_id: role.id },
        select: { user: { select: { email: true } } },
      });
      if (
        existingAdmins.length > 0 &&
        !existingAdmins.some((assignment) => normalizeCredentialEmail(assignment.user.email) === input.email)
      ) {
        throw new BootstrapRefused(
          "ADDITIONAL_ADMIN_REFUSED",
          "A organização de sistema já tem um administrador com outro e-mail. Este script cria só o 1º; administradores adicionais são ato de plataforma (P-O6R-B01-PROMOCAO-PLATAFORMA).",
        );
      }

      // 5) Usuário (UNIQUE (tenant_id, email)).
      let user = await tx.user.findUnique({
        where: { tenant_id_email: { tenant_id: tenant.id, email: input.email } },
        select: { id: true, email: true },
      });
      const userCreated = user === null;
      if (!user) {
        if (dryRun) {
          return {
            database: db,
            dryRun,
            tenantId: tenant.id,
            userId: null,
            tenantCreated,
            userCreated: true,
            assignmentCreated: true,
            credentialCreated: true,
            passwordReset: false,
          } satisfies BootstrapReport;
        }
        user = await tx.user.create({
          data: { tenant_id: tenant.id, name: input.name, email: input.email, status: "active" },
          select: { id: true, email: true },
        });
      }

      // 6) Vínculo ao papel global (índice parcial UNIQUE (tenant_id, user_id, role_id) WHERE branch_id IS NULL).
      const assignment = await tx.userRoleAssignment.findFirst({
        where: { tenant_id: tenant.id, user_id: user.id, role_id: role.id, branch_id: null },
        select: { id: true },
      });
      const assignmentCreated = assignment === null;
      if (!assignment && !dryRun) {
        await tx.userRoleAssignment.create({
          data: { tenant_id: tenant.id, user_id: user.id, role_id: role.id, branch_id: null },
        });
      }

      // 7) Credencial local — pelo MESMO serviço/hash que o login verifica (scrypt-v1, N=16384/r=8/p=1).
      const credentials = new LocalAuthCredentialRepository(tx);
      const credentialService = new LocalAuthCredentialService(credentials, {
        findByIdForTenant: (userId, tenantId) =>
          tx.user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, tenant_id: true, email: true } }),
      });
      const existingCredential = await credentials.findByUserForTenant(user.id, tenant.id);
      const credentialCreated = existingCredential === null;
      let passwordReset = false;
      if (!dryRun) {
        if (!existingCredential) {
          await credentialService.createCredentialForUser({
            tenant_id: tenant.id,
            user_id: user.id,
            email: user.email,
            password: input.password,
          });
        } else if (input.resetPassword) {
          await credentialService.upsertCredentialForUser({
            tenant_id: tenant.id,
            user_id: user.id,
            email: user.email,
            password: input.password,
          });
          passwordReset = true;
        }
      }

      // 8) Trilha — só quando algo foi criado/redefinido. Allowlist (§2.8): e-mail e flags; nunca senha/hash.
      if (!dryRun && (userCreated || assignmentCreated || credentialCreated || passwordReset)) {
        await tx.auditLog.create({
          data: {
            tenant_id: tenant.id,
            actor_user_id: user.id,
            action: BOOTSTRAP_AUDIT_ACTION,
            entity: "user",
            entity_id: user.id,
            metadata: {
              source: "scripts/bootstrap-platform-admin.ts",
              email: user.email,
              tenantCreated,
              userCreated,
              assignmentCreated,
              credentialCreated,
              passwordReset,
            },
          },
        });
      }

      return {
        database: db,
        dryRun,
        tenantId: tenant.id,
        userId: user.id,
        tenantCreated,
        userCreated,
        assignmentCreated,
        credentialCreated,
        passwordReset,
      } satisfies BootstrapReport;
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
}

function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[bootstrap-platform-admin] ${message}`);
}

async function readStdinFirstLine(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8").split(/\r?\n/)[0] ?? "";
}

async function main(): Promise<void> {
  const flags = parseArgv(process.argv.slice(2));

  if (!isBootstrapAllowed()) {
    throw new BootstrapRefused(
      "PRODUCTION_OPT_IN_MISSING",
      "Bootstrap BLOQUEADO em produção (NODE_ENV=production). Para o ato one-shot, defina ALLOW_PROD_BOOTSTRAP=1 inline nesse único comando e remova-o em seguida (nunca persista a variável).",
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new BootstrapRefused("DATABASE_URL_MISSING", "DATABASE_URL é obrigatório.");
  }

  const stdinPassword = flags.passwordStdin ? await readStdinFirstLine() : undefined;
  const input = readBootstrapInput(process.env, flags, stdinPassword);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const report = await bootstrapPlatformAdmin(prisma, input, { dryRun: flags.dryRun });
    log(`banco: ${report.database} · modo: ${report.dryRun ? "simulação (--dry-run)" : "aplicar"}`);
    log(
      `organização de sistema "${PLATFORM_TENANT_SLUG}": ${report.tenantCreated ? (report.dryRun ? "a criar" : "criada") : "já existia"}` +
        `${report.tenantId ? ` (${report.tenantId})` : ""}`,
    );
    log(
      `administrador ${input.email}: usuário ${report.userCreated ? (report.dryRun ? "a criar" : "criado") : "já existia"}` +
        ` · vínculo ${PLATFORM_ROLE_KEY} ${report.assignmentCreated ? (report.dryRun ? "a criar" : "criado") : "já existia"}` +
        ` · credencial ${report.credentialCreated ? (report.dryRun ? "a criar" : "criada") : report.passwordReset ? "senha redefinida" : "já existia (senha mantida)"}`,
    );
    log(report.dryRun ? "simulação encerrada — nada foi escrito no banco." : "CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.");
  } finally {
    await prisma.$disconnect();
  }
}

// Só executa main() quando rodado como script (não em import de teste) — padrão de scripts/backfill-third-party-vehicle-identity.ts:561.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("bootstrap-platform-admin.ts")) {
  try {
    await main();
  } catch (error) {
    if (error instanceof BootstrapRefused) {
      // eslint-disable-next-line no-console
      console.error(`[bootstrap-platform-admin] RECUSADO (${error.code}): ${error.message}`);
      process.exitCode = 2;
    } else {
      // eslint-disable-next-line no-console
      console.error(`[bootstrap-platform-admin] FALHOU: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      process.exitCode = 1;
    }
  }
}
```

---

## Apêndice C — `matriz.sh` (verbatim) e a saída completa

```bash
#!/usr/bin/env bash
# B-SAN3-09 — MATRIZ DE MEDIÇÃO do protótipo do bootstrap num Postgres 16.13 descartável (porta 54331).
set -uo pipefail
S="$(cd "$(dirname "$0")" && pwd)"; W=/home/user/w-b-san3-09
SCRIPT="$S/bootstrap-platform-admin.medido.ts"
PG="postgresql://postgres@127.0.0.1:54331/erp_b_san3_09?schema=public"
PGM="postgresql://postgres@127.0.0.1:54331/erp_b_san3_09_migrated?schema=public"
RT="postgresql://san3_09_runtime:san3-09-runtime-not-a-secret@127.0.0.1:54331/erp_b_san3_09?schema=public"
EMAIL="admin@exemplo.com.br"; SENHA="Senha-Forte-2026!"
q() { psql -h 127.0.0.1 -p 54331 -U postgres -d erp_b_san3_09 -Atc "$1"; }
contagens() { q "SELECT (SELECT count(*) FROM tenants WHERE slug='platform')||'/'||(SELECT count(*) FROM users)||'/'||(SELECT count(*) FROM user_role_assignments ura JOIN roles r ON r.id=ura.role_id WHERE r.key='super_admin')||'/'||(SELECT count(*) FROM local_auth_credentials)||'/'||(SELECT count(*) FROM audit_logs WHERE action='platform.bootstrap.admin_created')"; }
limpar() { q "DELETE FROM audit_logs; DELETE FROM auth_identity_links; DELETE FROM auth_identities; DELETE FROM local_auth_credentials; DELETE FROM user_role_assignments; DELETE FROM users; DELETE FROM tenants WHERE slug='platform';" >/dev/null; }
run() { # <rótulo> <DATABASE_URL> [env extra...] -- [args]
  local rotulo="$1" url="$2"; shift 2; local envs=(); while [ $# -gt 0 ] && [ "$1" != "--" ]; do envs+=("$1"); shift; done; [ $# -gt 0 ] && shift
  ( cd "$W" && env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$url" "${envs[@]}" timeout 120 npx tsx "$SCRIPT" "$@" ) > "$S/run-$rotulo.log" 2>&1; local ec=$?
  echo "[$rotulo] exit=$ec · $(grep -E 'RECUSADO|FALHOU|CONVERGIDO|simulação|criad|já existia' "$S/run-$rotulo.log" | tail -1 | cut -c1-150)"
}
echo "== estado inicial (tenants platform/users/vínculos super_admin/credenciais/auditorias): $(contagens)"
echo "== triggers em users: $(q "SELECT string_agg(tgname, ',') FROM pg_trigger WHERE tgrelid='users'::regclass AND NOT tgisinternal")"
echo "--- M1 1ª execução (postgres, base pós-CD)"; run M1 "$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"; echo "     contagens: $(contagens) · auth_identities/links: $(q 'SELECT (SELECT count(*) FROM auth_identities)||'"'"'/'"'"'||(SELECT count(*) FROM auth_identity_links)')"
HASH1=$(q "SELECT md5(password_hash)||' '||password_algorithm FROM local_auth_credentials LIMIT 1"); echo "     hash1(md5)+alg: $HASH1"
echo "--- M2 2ª execução idêntica (idempotência)"; run M2 "$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"; echo "     contagens: $(contagens) · hash igual ao da M1: $([ "$(q "SELECT md5(password_hash)||' '||password_algorithm FROM local_auth_credentials LIMIT 1")" = "$HASH1" ] && echo SIM || echo NAO)"
echo "--- M3 --dry-run com tudo já existente"; run M3 "$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA" -- --dry-run; echo "     contagens: $(contagens)"
echo "--- M4 base SÓ-MIGRADA (roles vazia) → recusa RBAC_NOT_PROVISIONED"; run M4 "$PGM" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"; echo "     migrated: tenants=$(psql -h 127.0.0.1 -p 54331 -U postgres -d erp_b_san3_09_migrated -Atc 'SELECT count(*) FROM tenants') users=$(psql -h 127.0.0.1 -p 54331 -U postgres -d erp_b_san3_09_migrated -Atc 'SELECT count(*) FROM users')"
echo "--- M5 NODE_ENV=production SEM opt-in → recusa PRODUCTION_OPT_IN_MISSING (sem JWT_SECRET etc.)"; run M5 "$PG" NODE_ENV=production PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"
echo "--- M5b NODE_ENV=production ALLOW_PROD_BOOTSTRAP=false → recusa (estrito)"; run M5b "$PG" NODE_ENV=production ALLOW_PROD_BOOTSTRAP=false PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"
echo "--- M5c NODE_ENV=production ALLOW_PROD_SEED=1 (a trava do SEED não abre o bootstrap)"; run M5c "$PG" NODE_ENV=production ALLOW_PROD_SEED=1 PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"
echo "--- M6 NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1 (sem JWT_SECRET/REDIS_URL/CORS_ORIGIN) → roda"; run M6 "$PG" NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1 PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"; echo "     contagens: $(contagens)"
echo "--- M7 outro e-mail com admin existente → recusa ADDITIONAL_ADMIN_REFUSED"; run M7 "$PG" PLATFORM_ADMIN_EMAIL="outro@exemplo.com.br" PLATFORM_ADMIN_PASSWORD="$SENHA"; echo "     contagens: $(contagens)"
echo "--- M8 entradas recusadas"; run M8a "$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="abcdefgh"; run M8b "$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$EMAIL"; run M8c "$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" -- --password=x; run M8d "$PG" PLATFORM_ADMIN_PASSWORD="$SENHA"; run M8e "$PG" PLATFORM_ADMIN_EMAIL="$EMAIL"; run M8f "" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"; run M8g "$PG" PLATFORM_ADMIN_EMAIL="sem-arroba" PLATFORM_ADMIN_PASSWORD="$SENHA"
echo "--- M9 papel NOSUPERUSER NOBYPASSRLS (san3_09_runtime) cria do zero e é idempotente"; limpar; echo "     limpo: $(contagens)"; run M9a "$RT" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"; echo "     contagens: $(contagens)"; run M9b "$RT" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA"; echo "     contagens: $(contagens)"
echo "--- M10 MUTAÇÃO: sem setTenantRlsContext, sob o mesmo papel → falha (RLS) e transação desfeita"; limpar; sed '/await setTenantRlsContext(tx, tenant.id);/d' "$SCRIPT" > "$S/bootstrap-mutado-sem-guc.ts"; echo "     linha removida: $(grep -c setTenantRlsContext "$S/bootstrap-mutado-sem-guc.ts") ocorrências restantes de setTenantRlsContext (import só)"; ( cd "$W" && env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$RT" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA" timeout 120 npx tsx "$S/bootstrap-mutado-sem-guc.ts" ) > "$S/run-M10.log" 2>&1; echo "     [M10] exit=$? · $(grep -o -E 'FALHOU.*|42501|row-level security|violates row-level' "$S/run-M10.log" | head -2 | tr '\n' ' ' | cut -c1-160) · contagens após rollback: $(contagens)"
echo "--- M10b a MESMA mutação sob superusuário passa verde (por isso a junta mede sob papel real)"; ( cd "$W" && env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA" timeout 120 npx tsx "$S/bootstrap-mutado-sem-guc.ts" ) > "$S/run-M10b.log" 2>&1; echo "     [M10b] exit=$? · contagens: $(contagens)"; limpar
echo "--- M11 --password-stdin (postgres), estado limpo"; ( cd "$W" && printf '%s\n' "$SENHA" | env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" timeout 120 npx tsx "$SCRIPT" --password-stdin ) > "$S/run-M11.log" 2>&1; echo "     [M11] exit=$? · $(grep -E 'CONVERGIDO|RECUSADO' "$S/run-M11.log" | tail -1 | cut -c1-120) · contagens: $(contagens)"
HASH2=$(q "SELECT md5(password_hash) FROM local_auth_credentials LIMIT 1"); q "UPDATE local_auth_credentials SET failed_attempts=4, locked_until=now()+interval '10 min'" >/dev/null
echo "--- M12 --reset-password redefine hash, zera contador/lock e audita"; run M12 "$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="Outra-Senha-Forte-2026!" -- --reset-password; echo "     hash mudou: $([ "$(q "SELECT md5(password_hash) FROM local_auth_credentials LIMIT 1")" != "$HASH2" ] && echo SIM || echo NAO) · failed_attempts/locked_until: $(q "SELECT failed_attempts||'/'||coalesce(locked_until::text,'NULL') FROM local_auth_credentials") · contagens: $(contagens)"
echo "--- M13 prova de login: verifyPassword real + papel no vínculo + candidatos"; cat > "$S/prova-login.ts" <<EOT
import { PrismaPg } from "$W/node_modules/@prisma/adapter-pg/dist/index.js";
import { PrismaClient } from "$W/node_modules/@prisma/client/default.js";
import { verifyPassword } from "$W/src/modules/auth/services/password.service.js";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const cred = await prisma.\$queryRaw<Array<{ password_hash: string; tenant_id: string; user_id: string }>>\`SELECT password_hash, tenant_id::text, user_id::text FROM local_auth_credentials\`;
const ok = await verifyPassword(process.env.SENHA!, cred[0]!.password_hash); const errada = await verifyPassword("errada-errada-errada", cred[0]!.password_hash);
const roles = await prisma.\$queryRaw<Array<{ key: string }>>\`SELECT r.key FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = \${cred[0]!.user_id}::uuid\`;
const cand = await prisma.\$queryRaw<Array<{ tenant_id: string }>>\`SELECT tenant_id::text FROM public.auth_login_candidates(\${process.env.EMAIL!})\`;
console.log(\`verifyPassword(senha certa)=\${ok} verifyPassword(errada)=\${errada} roles=\${roles.map(r => r.key).join(",")} candidatos=\${cand.length} candidato=tenant_da_plataforma:\${cand[0]?.tenant_id === cred[0]!.tenant_id}\`);
await prisma.\$disconnect();
EOT
( cd "$W" && env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$PG" SENHA="Outra-Senha-Forte-2026!" EMAIL="$EMAIL" timeout 120 npx tsx "$S/prova-login.ts" ) 2>&1 | tail -1
echo "--- M14 concorrência: 2 execuções simultâneas num estado limpo → 1 de cada"; limpar; ( cd "$W" && env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA" timeout 120 npx tsx "$SCRIPT" > "$S/run-M14a.log" 2>&1 & cd "$W" && env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA" timeout 120 npx tsx "$SCRIPT" > "$S/run-M14b.log" 2>&1; wait ); echo "     a: $(grep -E 'CONVERGIDO|RECUSADO|FALHOU' "$S/run-M14a.log" | tail -1 | cut -c1-80) · b: $(grep -E 'CONVERGIDO|RECUSADO|FALHOU' "$S/run-M14b.log" | tail -1 | cut -c1-80) · contagens: $(contagens)"
echo "--- M15 --dry-run em estado limpo → 'a criar' e nada escrito"; limpar; run M15 "$PG" PLATFORM_ADMIN_EMAIL="$EMAIL" PLATFORM_ADMIN_PASSWORD="$SENHA" -- --dry-run; grep -E 'organização|administrador' "$S/run-M15.log" | cut -c1-140; echo "     contagens: $(contagens)"
echo "--- M16 vazamento no log: senha/hash/URL em algum log de execução?"; grep -l -E "$SENHA|Outra-Senha|scrypt\\\$|postgresql://" "$S"/run-M*.log | sed "s#$S/##" | tr '\n' ' '; echo "(fim — vazio = nenhum)"
echo "--- estado final (deixado para o conferente): $(contagens)"
```

Saída completa (`timeout 580 bash matriz.sh`):

```
== estado inicial (tenants platform/users/vínculos super_admin/credenciais/auditorias): 0/0/0/0/0
== triggers em users:
--- M1 1ª execução (postgres, base pós-CD)
[M1] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
     contagens: 1/1/1/1/1 · auth_identities/links: 0/0
     hash1(md5)+alg: ae982a874d98ddf02628d25fd4d45b30 scrypt-v1
--- M2 2ª execução idêntica (idempotência)
[M2] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
     contagens: 1/1/1/1/1 · hash igual ao da M1: SIM
--- M3 --dry-run com tudo já existente
[M3] exit=0 · [bootstrap-platform-admin] simulação encerrada — nada foi escrito no banco.
     contagens: 1/1/1/1/1
--- M4 base SÓ-MIGRADA (roles vazia) → recusa RBAC_NOT_PROVISIONED
[M4] exit=2 · [bootstrap-platform-admin] RECUSADO (RBAC_NOT_PROVISIONED): Papel global "super_admin" ausente ou sem concessões neste banco. Rode `npm run db:provis
     migrated: tenants=0 users=0
--- M5 NODE_ENV=production SEM opt-in → recusa PRODUCTION_OPT_IN_MISSING (sem JWT_SECRET etc.)
[M5] exit=2 · [bootstrap-platform-admin] RECUSADO (PRODUCTION_OPT_IN_MISSING): Bootstrap BLOQUEADO em produção (NODE_ENV=production). Para o ato one-shot, defina
--- M5b NODE_ENV=production ALLOW_PROD_BOOTSTRAP=false → recusa (estrito)
[M5b] exit=2 · [bootstrap-platform-admin] RECUSADO (PRODUCTION_OPT_IN_MISSING): Bootstrap BLOQUEADO em produção (NODE_ENV=production). Para o ato one-shot, defina
--- M5c NODE_ENV=production ALLOW_PROD_SEED=1 (a trava do SEED não abre o bootstrap)
[M5c] exit=2 · [bootstrap-platform-admin] RECUSADO (PRODUCTION_OPT_IN_MISSING): Bootstrap BLOQUEADO em produção (NODE_ENV=production). Para o ato one-shot, defina
--- M6 NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1 (sem JWT_SECRET/REDIS_URL/CORS_ORIGIN) → roda
[M6] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
     contagens: 1/1/1/1/1
--- M7 outro e-mail com admin existente → recusa ADDITIONAL_ADMIN_REFUSED
[M7] exit=2 · [bootstrap-platform-admin] RECUSADO (ADDITIONAL_ADMIN_REFUSED): A organização de sistema já tem um administrador com outro e-mail. Este script cria
     contagens: 1/1/1/1/1
--- M8 entradas recusadas
[M8a] exit=2 · [bootstrap-platform-admin] RECUSADO (PASSWORD_TOO_WEAK): A senha do administrador da plataforma precisa de pelo menos 12 caracteres.
[M8b] exit=2 · [bootstrap-platform-admin] RECUSADO (PASSWORD_TOO_WEAK): Password must not be equal to the email.
[M8c] exit=2 · [bootstrap-platform-admin] RECUSADO (PASSWORD_IN_ARGV): Senha por argumento é recusada (argv é visível em `ps`). Use PLATFORM_ADMIN_PASSWORD ou --p
[M8d] exit=2 · [bootstrap-platform-admin] RECUSADO (EMAIL_MISSING): PLATFORM_ADMIN_EMAIL é obrigatório (e-mail do 1º administrador).
[M8e] exit=2 · [bootstrap-platform-admin] RECUSADO (PASSWORD_MISSING): PLATFORM_ADMIN_PASSWORD é obrigatório (ou use --password-stdin).
[M8f] exit=2 · [bootstrap-platform-admin] RECUSADO (DATABASE_URL_MISSING): DATABASE_URL é obrigatório.
[M8g] exit=2 · [bootstrap-platform-admin] RECUSADO (EMAIL_MISSING): PLATFORM_ADMIN_EMAIL é obrigatório (e-mail do 1º administrador).
--- M9 papel NOSUPERUSER NOBYPASSRLS (san3_09_runtime) cria do zero e é idempotente
     limpo: 0/0/0/0/0
[M9a] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
     contagens: 1/1/1/1/1
[M9b] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
     contagens: 1/1/1/1/1
--- M10 MUTAÇÃO: sem setTenantRlsContext, sob o mesmo papel → falha (RLS) e transação desfeita
     linha removida: 1 ocorrências restantes de setTenantRlsContext (import só)
     [M10] exit=1 · FALHOU: new row violates row-level security policy for table "users"  · contagens após rollback: 0/0/0/0/0
--- M10b a MESMA mutação sob superusuário passa verde (por isso a junta mede sob papel real)
     [M10b] exit=0 · contagens: 1/1/1/1/1
--- M11 --password-stdin (postgres), estado limpo
     [M11] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma. · contagens: 1/1/1/1/1
--- M12 --reset-password redefine hash, zera contador/lock e audita
[M12] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
     hash mudou: SIM · failed_attempts/locked_until: 0/NULL · contagens: 1/1/1/1/2
--- M13 prova de login: verifyPassword real + papel no vínculo + candidatos
verifyPassword(senha certa)=true verifyPassword(errada)=false roles=super_admin candidatos=1 candidato=tenant_da_plataforma:true
--- M14 concorrência: 2 execuções simultâneas num estado limpo → 1 de cada
     a: [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administ · b: [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administ · contagens: 1/1/1/1/1
--- M15 --dry-run em estado limpo → 'a criar' e nada escrito
[M15] exit=0 · [bootstrap-platform-admin] simulação encerrada — nada foi escrito no banco.
[bootstrap-platform-admin] organização de sistema "platform": a criar
[bootstrap-platform-admin] administrador admin@exemplo.com.br: usuário a criar · vínculo super_admin a criar · credencial a criar
     contagens: 0/0/0/0/0
--- M16 vazamento no log: senha/hash/URL em algum log de execução?
(fim — vazio = nenhum)
--- estado final (deixado para o conferente): 0/0/0/0/0
```

---

## Apêndice D — `prova-login.ts` (verbatim; gerado pela matriz, M13)

```ts
import { PrismaPg } from "/home/user/w-b-san3-09/node_modules/@prisma/adapter-pg/dist/index.js";
import { PrismaClient } from "/home/user/w-b-san3-09/node_modules/@prisma/client/default.js";
import { verifyPassword } from "/home/user/w-b-san3-09/src/modules/auth/services/password.service.js";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const cred = await prisma.$queryRaw<Array<{ password_hash: string; tenant_id: string; user_id: string }>>`SELECT password_hash, tenant_id::text, user_id::text FROM local_auth_credentials`;
const ok = await verifyPassword(process.env.SENHA!, cred[0]!.password_hash); const errada = await verifyPassword("errada-errada-errada", cred[0]!.password_hash);
const roles = await prisma.$queryRaw<Array<{ key: string }>>`SELECT r.key FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = ${cred[0]!.user_id}::uuid`;
const cand = await prisma.$queryRaw<Array<{ tenant_id: string }>>`SELECT tenant_id::text FROM public.auth_login_candidates(${process.env.EMAIL!})`;
console.log(`verifyPassword(senha certa)=${ok} verifyPassword(errada)=${errada} roles=${roles.map(r => r.key).join(",")} candidatos=${cand.length} candidato=tenant_da_plataforma:${cand[0]?.tenant_id === cred[0]!.tenant_id}`);
await prisma.$disconnect();
```

---

## Apêndice E — geradores do fechamento (verbatim) e saídas

### E.1 `ramos-em-voo.sh` — ramos remotos que tocam a fronteira (P-n; D17)

```bash
#!/usr/bin/env bash
# B-SAN3-09 — GERADOR: ramos remotos em voo que tocam a FRONTEIRA deste bloco (P-n; trava de mesmo arquivo, §6 do PLANO_SAN3).
# Uso: bash ramos-em-voo.sh <repo-root>   (mede em refs/remotes/origin após `git fetch origin`; base = origin/main)
set -uo pipefail
cd "${1:-.}"
FRONTEIRA='^(scripts/bootstrap-platform-admin\.ts|tests/san3-09-|docs/deployment\.md|package\.json|\.env\.example|prisma/seed-guard\.ts|src/modules/auth/services/local-auth-credential\.service\.ts|docs/go-live-readiness\.md)'
echo "# base=$(git rev-parse origin/main) · refs remotas=$(git for-each-ref refs/remotes/origin --format='%(refname)' | wc -l) · medido em $(date -u +%Y-%m-%dT%H:%M:%SZ)"
for r in $(git for-each-ref refs/remotes/origin --format='%(refname:short)'); do
  case "$r" in origin/main|origin/HEAD) continue;; esac
  hits=$(git diff --name-only "origin/main...$r" 2>/dev/null | grep -E "$FRONTEIRA")
  [ -n "$hits" ] && echo "$r → $(echo "$hits" | paste -sd' ')"
done
echo "# fim do laço (um ramo por linha; vazio = nenhum ramo toca a fronteira)"
```

Saída (`bash ramos-em-voo.sh /home/user/w-b-san3-09`, após `git fetch origin`):

```
# base=3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c · refs remotas=141 · medido em 2026-09-30T12:27:22Z
origin/docs/governanca-porteiro-pre-merge-sol → package.json
# fim do laço (um ramo por linha; vazio = nenhum ramo toca a fronteira)
```

**Controle:** o ramo sabido que toca `package.json` aparece. **Residual declarado:** só vê ramos já buscados em
`refs/remotes/origin` (um `git fetch origin` antes é obrigatório) e compara pelo merge-base (`origin/main...<ramo>`), logo
não vê trabalho não commitado de outras sessões; o número de refs muda durante a sessão (139 → 140 → 141).

### E.2 `fecho-de-imports.sh` — dependências de runtime do script (§2.1; D17)

```bash
#!/usr/bin/env bash
# B-SAN3-09 — GERADOR: fecho de imports do script — diretos (linhas `import "…"` e `… from "…"`, inclusive imports
# multilinha) e, para cada módulo de src/ importado, os imports transitivos lidos NA REF (`import type` excluído:
# não carrega módulo em runtime). É a lista dos arquivos fora do escopo de que o script depende em execução (§2.1).
# Uso: bash fecho-de-imports.sh <script.ts> <repo-root> [ref]
set -uo pipefail
SCRIPT="$1"; cd "${2:-.}"; REF="${3:-origin/main}"
imports() { awk '/^import type/ {t=1} /^import / && !/^import type/ {t=0} /from "[^"]+"/ { match($0, /from "[^"]+"/); s=substr($0, RSTART+6, RLENGTH-7); if (!t) print s; t=0; next } /^import "[^"]+"/ { match($0, /"[^"]+"/); print substr($0, RSTART+1, RLENGTH-2) }' | sort -u; }
echo "# script=$(basename "$SCRIPT") md5=$(md5sum "$SCRIPT" | cut -c1-32) · ref=$(git rev-parse "$REF")"
echo '## diretos (runtime)'
imports < "$SCRIPT"
echo '## transitivos (src/, 1 nivel, lidos na ref; import type excluido)'
for spec in $(imports < "$SCRIPT" | grep -E '^\.\./src/' | sed -E 's#^\.\./##; s/\.js$/.ts/'); do
  echo "$spec:"; git show "$REF:$spec" | imports | sed 's/^/  /'
done
```

Saída (`bash fecho-de-imports.sh <Apêndice B extraído do plano> /home/user/w-b-san3-09 origin/main`):

```
# script=apB-extraido.ts md5=a5f5383dfbbabde9a63205bd40f64782 · ref=3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
## diretos (runtime)
../src/database/rls.js
../src/modules/auth/repositories/local-auth-credential.repository.js
../src/modules/auth/services/local-auth-credential.service.js
@prisma/adapter-pg
@prisma/client
dotenv/config
## transitivos (src/, 1 nivel, lidos na ref; import type excluido)
src/database/rls.ts:
src/modules/auth/repositories/local-auth-credential.repository.ts:
  ../anonymous-login.constants.js
src/modules/auth/services/local-auth-credential.service.ts:
  ../repositories/local-auth-credential.repository.js
  ../types/auth.types.js
  ./password.service.js
```

**Controle (mutação injetada):** `sed '1a import { env } from "../src/config/env.js";' apB.ts > apB-mutado.ts; bash
fecho-de-imports.sh apB-mutado.ts <w> origin/main | grep -n 'config/env'` → `3:../src/config/env.js` · `11:src/config/env.ts:`.
**Residual declarado:** 1 nível de transitividade (`password.service.ts`, importado pelo service, não é expandido — ele
só importa `node:crypto`, e P-j mediu o carregamento real dos módulos-folha sob `env -i NODE_ENV=production`); qualificadores
`type` dentro de chaves (`{ AuthCredentialError, type AuthenticatedActor }`) não são distinguidos — `auth.types.js` conta como
runtime porque `AuthCredentialError` é classe; `src/database/rls.ts` só tem `import type` (0 transitivos), conferido por
`git show origin/main:src/database/rls.ts | grep -n '^import'` → `1: import type { Prisma, PrismaClient } …` · `7: import type { AuthenticatedActor } …`.

### E.3 `mutacoes.sh` — reexecução das mutações A13/A18 no cluster (D14, D15) — saída

```
== estado inicial: 1/1/1/1/1
--- D14-r: reprodução do mutante do conferente (credentials.updatePassword)
[base1] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
[mutC] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
     hash mudou: SIM · failed/locked: 0/NULL · contagens: 1/1/1/1/2
--- D14-m1: mutação NOVA — ramo --reset-password vira no-op (flag ignorada)
     diff: 2 linhas
[base2] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
[m1] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
     hash mudou: NAO · failed/locked: 4/2026-09-30 12:26:41.121289+00 · contagens: 1/1/1/1/1
--- D14-m2: mutação NOVA — reset sem trilha (passwordReset nunca vira true)
     diff: 2 linhas
[base3] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
[m2] exit=0 · [bootstrap-platform-admin] CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.
     hash mudou: SIM · failed/locked: 0/NULL · contagens: 1/1/1/1/1
--- D15: mutante sem pg_advisory_xact_lock, 2 processos simultâneos, 4 rodadas
     diff: 1 linha(s)
     rodada 1: a=CONVERGIDO b=FALHOU · contagens: 1/1/1/1/1 · erro: 1-b.log:Unique constraint failed on the fields: (`slug`)
     rodada 2: a=FALHOU b=CONVERGIDO · contagens: 1/1/1/1/1 · erro: 2-a.log:Unique constraint failed on the fields: (`slug`)
     rodada 3: a=FALHOU b=CONVERGIDO · contagens: 1/1/1/1/1 · erro: 3-a.log:Unique constraint failed on the fields: (`slug`)
     rodada 4: a=CONVERGIDO b=FALHOU · contagens: 1/1/1/1/1 · erro: 4-b.log:Unique constraint failed on the fields: (`slug`)
--- D15-controle: script MEDIDO (com lock), 2 simultâneos, 2 rodadas
     rodada 1: a=CONVERGIDO b=CONVERGIDO · contagens: 1/1/1/1/1
     rodada 2: a=CONVERGIDO b=CONVERGIDO · contagens: 1/1/1/1/1
== estado final (limpo): 0/0/0/0/0
```

`base1/2/3` = o script medido (Apêndice B) criando o admin em estado limpo; `mutC` = mutante do conferente; `m1`/`m2` =
mutações novas de A13; rodadas 1–4 = mutante sem lock; controle = script medido com lock. `limpar` entre cada item.


---

## Apêndice F — Runbook B verbatim (`origin/main:docs/deployment.md`, l.168-185) — o texto que E4 reescreve

`git show origin/main:docs/deployment.md | sed -n '168,185p'` (o cabeçalho seguinte é `### Provedor …`, l.187):

```markdown
#### Runbook B — provisionamento do 1o tenant real (sem seed demo)

Produção **nunca** roda `db:seed`/`db:seed:demo` (guarda `assertSeedAllowed` + ausencia do passo no CD). O
bootstrap do 1o tenant/administrador de plataforma real e uma acao de **ativacao** contra o banco vivo de
produção (exige o DB provisionado), NAO um passo deste PR. Requisitos:

1. E um **bootstrap dedicado e idempotente** (tenant de sistema + platform admin + credencial), exigindo
   `PLATFORM_ADMIN_EMAIL`/`PLATFORM_ADMIN_PASSWORD` — **nunca** o seed demo. O script de
   bootstrap idempotente e verificado contra um banco prod-like e entregue na ativacao (follow-up
   **P-SAN-PROD-BOOTSTRAP**; o seed atual so cria o tenant demo, inadequado para produção).
   **A parte de RBAC saiu deste follow-up:** papéis (inclusive `super_admin`), permissões e concessões já são
   provisionados pelo passo do CD (secao "Provisionamento de RBAC"). Resta ao bootstrap **só** a organização real,
   o usuário administrador e a credencial dele — o vínculo usuário↔papel (`user_role_assignments`) é dado de
   organização e **nunca** é criado pelo provisionamento.
2. Se o bootstrap precisar rodar com `NODE_ENV=production`, usar o escape hatch **one-shot** `ALLOW_PROD_SEED=1`
   **inline no unico comando** e **remove-lo em seguida** — NUNCA persistir a variavel no `[env]` do toml nem
   como secret fixo (senao reabre o seed demo no mesmo ambiente).
3. Dominio + TLS pelo Fly (certs gerenciados) apos o `fly apps create` e o apontamento de DNS.
```
