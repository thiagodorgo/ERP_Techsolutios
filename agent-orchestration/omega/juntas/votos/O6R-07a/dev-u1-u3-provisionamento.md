# EVIDÊNCIA DE DESENVOLVIMENTO — `dev-o6r07a-provisionamento` (U1 · U2 · U3)

**Papel:** DESENVOLVER (§C7.4-bis — quem acha não conserta; quem planeja não desenvolve).
Não achei o defeito (foi o `dev-o6r07a-autorizacao`) e não escrevi o plano nem a EMENDA E1
(foi o `planejador-mestre`). **Implemento e não rejulgo.**

**Contrato:** `agent-orchestration/omega/planos/B-O6R-07-plano.md` → `## EMENDA E1`, seção **E3**
(vence o §5 e o §3.10 do corpo onde divergirem).
**Insumo do achado:** `agent-orchestration/omega/juntas/votos/O6R-07a/dev-d1-d3-autorizacao.md`
(bloco "⛔ BLOQUEIO MEDIDO" + `## Fechamento`).
**Migração-padrão cuja FORMA copio:**
`prisma/migrations/20260861000000_grant_checklist_run_reopen_permission/migration.sql`.

**Worktree:** `.claude/worktrees/b07` · **branch:** `fix/o6r07a-authorization`.
**Concorrência declarada:** o dev `dev-o6r07a-auth-residuais` trabalha NESTE MESMO worktree em
`src/modules/auth/**` e em `tests/o6r07a-anon-lockout|login-rate-limit|scrypt-pin`. Meus caminhos são
disjuntos dos dele. Nada de `auth` foi tocado por mim.

**Status geral:** EM APURAÇÃO

---

## §0 · Baseline — MEDIDO (antes de qualquer edição)

```
$ git rev-parse HEAD
2d54ea26ac79e33ed1abee73367854d8c70cc16e
$ git branch --show-current
fix/o6r07a-authorization
$ git rev-parse origin/main
f895dd25f0d8cd5fb6b7c18373245e43f968fcd9
$ git status --porcelain
 M agent-orchestration/omega/planos/B-O6R-07-plano.md          <- EMENDA E1 (planejador)
 M src/modules/auth/services/local-auth-login.service.ts        <- DO OUTRO DEV
 M src/modules/auth/services/password.service.ts                <- DO OUTRO DEV
?? agent-orchestration/omega/juntas/votos/O6R-07a/dev-a1-a3-auth.md   <- DO OUTRO DEV
?? agent-orchestration/omega/juntas/votos/O6R-07a/dev-u1-u3-provisionamento.md  <- este esqueleto
?? tests/o6r07a-anon-lockout-db.test.ts                         <- DO OUTRO DEV
?? tests/o6r07a-anon-lockout.test.ts                            <- DO OUTRO DEV
?? tests/o6r07a-login-rate-limit.test.ts                        <- DO OUTRO DEV
?? tests/o6r07a-scrypt-pin.test.ts                              <- DO OUTRO DEV
```

O head que MEDI (`2d54ea2`) é o mesmo sobre o qual a EMENDA E1 foi escrita. Os arquivos de `auth`
são do `dev-o6r07a-auth-residuais`, que trabalha neste mesmo worktree em paralelo: **não revertidos,
não commitados, não "arrumados"** — conforme o mandato.

### Portas do meu cluster descartável — MEDIDAS antes de subir

`docker ps` no início mostrava `o6r07a-pg` já em **:56438** e `o6r07a-redis` em **:56381** (containers do
OUTRO dev) além da base viva `erp-postgres`/`erp-redis` em :5432/:6379. Escolhi portas livres, conferidas
com `netstat` (0 listeners) e fora de todo `excludedportrange` do Windows:

| Serviço | Porta | Container |
|---|---|---|
| PostgreSQL 16 | **56442** | `o6r07a-prov-pg` |
| Redis 7 | **56391** | `o6r07a-prov-redis` |

Nunca **55432** (`P-SAN2-2-PORTA-55432-RESERVADA`). **A base viva não foi tocada nem para leitura** —
este worktree não tem `.env` (`test -f .env` = ABSENT) e toda `DATABASE_URL` que usei aponta para :56442.

### As 4 falhas do ANTES — confirmadas por EXECUÇÃO (não herdadas da ata)

Forma: `node --test --import tsx <arquivo>`, no head `2d54ea2`.

| # | Teste | `ec` | Saída |
|---|---|---|---|
| 1 | `permissão acrescentada ao catálogo chega ao banco por migração (fronteira)` (`permission-catalog-migration-parity`) | **1** | `Permissão nova no catálogo e SEM migração de dados: work_orders:approve` · `actual ['work_orders:approve'] / expected []` |
| 2 | `mantem catalogo de permissoes integro` (`core-saas.test.ts`) | **1** | `deepStrictEqual` do `expectedPermissionCatalog` |
| 3 | `tests/core-saas-role-authority.test.ts` | **1** | ver nota abaixo |
| 4 | `[rota] o ajuste exige a permissão de ENVIAR ao técnico e o detalhe passa a mostrar o conjunto` (`work-order-checklists-sticky.test.ts`) | **1** | D3 · 409 → 403 |

**Nota honesta sobre a #3:** SEM `DATABASE_URL` o arquivo nem chega a rodar — morre no import com
`Error: DATABASE_URL is required to initialize Prisma Client` (`src/database/prisma.ts:12`), e o node
reporta falha de ARQUIVO, não de teste nomeado. Com o meu cluster exportado ele **roda** e a falha real
é o snapshot papel→permissões. É o mesmo gap de ambiente que o dev anterior registrou.

### Medição do conjunto de papéis — POR EXECUÇÃO, não copiada do mandato

Antes de gravar qualquer literal, medi contra o catálogo em CÓDIGO (a verdade que o snapshot espelha):

```
$ npx tsx <probe importando src/modules/core-saas/permissions/catalog.ts>
=== CODIGO: quem tem work_orders:approve ===   super_admin, tenant_admin, manager, platform_admin
=== CODIGO: quem tem work_orders:mileage_correct === super_admin, tenant_admin, manager, platform_admin, operator
catalogo contem approve? true   indice approve: 31   indice mileage_correct: 30   tamanho: 198
```

E contra o snapshot (`ROLE_PERMISSIONS` do fixture), quem tem a irmã `mileage_correct`:
`super_admin, tenant_admin, manager, platform_admin, operator` — **menos `operator` = os 4 arrays**.
Os dois lados batem: `approve` vai para **4** papéis no snapshot e fica **imediatamente após**
`mileage_correct` (índice 31 logo depois de 30) no literal do catálogo. `operator` NÃO recebe.

---

## U1 — Migração de provisionamento (E3.1) — **COMPLETO E PROVADO**

### O que foi criado

`prisma/migrations/20260871000000_grant_work_orders_approve_permission/migration.sql` — **diretório
NOVO**, arquivo escrito com `Write` (nunca heredoc). **Nenhuma migração existente foi tocada** — a
armadilha do E2 item 4 (editar migração já aplicada = no-op drift silencioso) não se aplica porque
não editei nenhuma.

**FORMA copiada da migração-padrão** `20260861000000_grant_checklist_run_reopen_permission`, que li
inteira antes de escrever: cabeçalho explicando problema/agravante/segurança/distribuição + **runbook
de `down`** (DELETE dos grants → DELETE da permission, nesta ordem por causa da FK), depois
`INSERT INTO permissions (key, description) ... ON CONFLICT (key) DO NOTHING` e
`INSERT INTO role_permissions (role_id, permission_id) SELECT ... CROSS JOIN ... ON CONFLICT
(role_id, permission_id) DO NOTHING`.

**Distribuição no banco:** `r.key IN ('super_admin','tenant_admin','manager')`. `platform_admin` fora —
**re-medido por mim, não herdado**: com só `migrate deploy` a tabela `roles` tem **0 linhas** (nenhuma
migração insere em `roles`), e o `PAPEIS_SEM_LINHA_GLOBAL` do próprio guard de paridade lista
`platform_admin` como pseudo-papel sem linha em banco nenhum. No catálogo em CÓDIGO ele herda normalmente
(medição acima: aparece entre os 4).

### Prefixo — regra determinística do E2 aplicada

`origin/main` tem como maior prefixo `20260868000000_add_auth_identities` (medido com `git ls-tree -d
origin/main prisma/migrations/`). Como main **não** ganhou prefixo ≥ `20260871`, o remédio de nome do E2
**não dispara** e o diretório fica como está.

### Prova de que a MIGRAÇÃO provisiona — discriminante, sem seed

Cluster descartável, banco `erp_test`, **só `migrate deploy`, SEM `db:seed`**:

```
$ npx prisma migrate deploy      → "All migrations have been successfully applied."  ec=0
$ select key, description from permissions where key='work_orders:approve';
work_orders:approve|Decidir (aprovar ou reprovar) uma solicitação de aprovação operacional da OS.
$ select count(*) from permissions;   → 2
$ select count(*) from roles;         → 0
```

**`permissions` tem exatamente 2 linhas** num banco só-migrado: `checklist_runs:reopen` (da migração-padrão)
e a minha. Ou seja: **quem inseriu foi a migração, não o seed** — é o cenário exato de produção
(`deploy-production.yml` roda só `migrate deploy`).

### Prova do INSERT de grants — isolada, em banco `erp_probe` separado, SEM nenhum DELETE

`roles` fica vazia num banco novo, então o grant casaria 0 linhas. Para exercitar o segundo `INSERT` no
cenário REAL de produção (banco cujos papéis já existem por bootstrap, depois só migração), criei o banco
`erp_probe` no meu próprio cluster, migrei, inseri **6 papéis globais** à mão — 3 que devem receber e
**3 que NÃO devem** — e re-executei o SQL da migração:

```
$ psql -f migration.sql            → INSERT 0 0   (permission já existia — ON CONFLICT funcionou)
                                     INSERT 0 3   (exatamente 3 grants)
=== quem RECEBEU ===        manager, super_admin, tenant_admin
=== quem NÃO recebeu ===    field_technician, operator, technician
=== IDEMPOTÊNCIA (2ª replay) ===   INSERT 0 0 / INSERT 0 0
=== total de grants após 2 replays ===  3   (nenhuma duplicata)
```

Os três papéis de execução (`technician`, `operator`, `field_technician`) ficaram **de fora**, como a
distribuição manda. `erp_probe` foi **derrubado** (`DROP DATABASE`) logo em seguida.

### Aceite do E3.1 — os DOIS guards, e nenhum deles `skipped`

| Guard | Forma | `ec` | tests/pass/fail/**skipped** |
|---|---|---|---|
| `permission-catalog-migration-parity` (**sem banco**) | `node --test --import tsx` | **0** | 3 / 3 / 0 / **0** |
| `permission-catalog-db-parity` (**COM banco**) | forma do job `backend-postgres` da CI: `DATABASE_URL`+`REDIS_URL` do cluster :56442/:56391, `CORE_SAAS_PERSISTENCE=prisma`, **`RBAC_DB_PARITY=1`**, banco `migrate deploy` + `db:seed` | **0** | 2 / 2 / 0 / **0** |

**`skipped 0` nos dois — o guard de banco RODOU DE FATO**, não se auto-pulou. (Sem `RBAC_DB_PARITY=1`
ele se declara pulado, e é exatamente esse o orçamento de 2 skips do runner canônico; por isso a
verificação COM banco é uma execução à parte, na forma da CI.)

**Veredito parcial U1: CUMPRIDO.**

---

## U2 — Os dois literais (E3.2 e E3.3) — **COMPLETO E PROVADO**

### Como editei (e por que não com `sed`)

Os três arquivos que toquei são **CRLF integral** — medido com `tr -cd '\r' | wc -c` (nunca `grep -c`):
`role-catalog-contract.snapshot.json` CR=1189/1189 linhas · `core-saas.test.ts` CR=1420/1420 ·
`work-order-checklists-sticky.test.ts` CR=826/826. Por isso **nenhum `sed -i`/`perl -i`** (converteriam
EOL em massa disfarçado de edição) e **nenhum heredoc**: usei script Node `fs.readFileSync`/`writeFileSync`
por NÚMERO DE LINHA, **fail-closed** — ele confere o conteúdo exato de TODAS as linhas-alvo antes de mutar
qualquer uma, e aborta se o CR não crescer exatamente o número de linhas inseridas.

### E3.2 — `tests/core-saas.test.ts`

**1 linha**, `  "work_orders:approve",` inserida **imediatamente após** `  "work_orders:mileage_correct",`
(l.48) no literal `expectedPermissionCatalog`. Confere com a medição: no `PERMISSION_CATALOG` do código,
`approve` está no índice **31** e `mileage_correct` no **30** — adjacentes.

### E3.3 — `tests/fixtures/role-catalog-contract.snapshot.json`

**4 linhas**, uma por array de papel. Mapeei linha → papel por **faixa medida** (`grep -n` dos inícios de
array), não por suposição:

| Papel | Faixa do array | Linha do `mileage_correct` | Recebeu `approve`? |
|---|---|---|---|
| `super_admin` | 67–265 | 98 | **SIM** |
| `tenant_admin` | 266–451 | 285 | **SIM** |
| `manager` | 452–593 | 472 | **SIM** |
| `platform_admin` | 731–929 | 762 | **SIM** |
| **`operator`** | **930–998** | **982** | **NÃO — intocado** |

Confirmei ainda por VIZINHANÇA que a inserção cai no lugar certo em cada papel (o `manager` tem
`work_orders:cancel` antes, os outros três têm `work_orders:comment`; o `operator`, o único não tocado,
tem `work_orders:status` antes e `field_location:send` depois). E medi no CÓDIGO que em **todos os 4**
papéis `approve` fica adjacente logo após `mileage_correct` (super_admin 31/30 · tenant_admin 19/18 ·
manager 20/19 · platform_admin 31/30) — inclusive no `manager`, cuja concessão é explícita.

### Prova de que não houve conversão de EOL

```
$ git diff --numstat
1	0	tests/core-saas.test.ts
4	0	tests/fixtures/role-catalog-contract.snapshot.json
```
**Adições puras, zero remoções** — se tivesse havido conversão de EOL o numstat mostraria o arquivo inteiro.

### Verificação do conjunto final, relida do arquivo gravado

```
TEM approve: super_admin, tenant_admin, manager, platform_admin
NÃO tem:     technician, field_dispatcher, viewer, operator, finance, inventory,
             field_technician, auditor, support
```

### Execução

```
$ node --test --import tsx tests/core-saas.test.ts tests/core-saas-role-authority.test.ts
ec=0 · tests 38 · pass 38 · fail 0 · skipped 0
```
(`core-saas-role-authority` roda de verdade porque exportei a `DATABASE_URL` do meu cluster; sem ela
morre no import, como registrado no §0.)

**Veredito parcial U2: CUMPRIDO.**

---

## U3 — Asserção do sticky (E3.4) + bateria + ANTES × DEPOIS

### E3.4 — o que eu MEDI antes de tocar

A falha real, por execução no head `2d54ea2`:
```
AssertionError: o desvio pelo update genérico é porta fechada, não 200
403 !== 409      at tests/work-order-checklists-sticky.test.ts:612:12
```
A origem do 403 é o guard novo do D3 (`assertMutationObjectScope`,
`work-order.service.ts:818-823` → `WorkOrderError(403, "WORK_ORDER_NOT_ASSIGNED",
"not_assigned_to_actor", ...)`), que roda **antes** da checagem do conjunto de checklists.

### O que eu mudei — as 2 linhas do par nomeado pela emenda

A emenda nomeia a transformação `409 checklist_set_requires_endpoint` →
`403 WORK_ORDER_NOT_ASSIGNED (reason not_assigned_to_actor)`. Esse par vive em **duas** linhas
consecutivas, que são **uma asserção só** sobre a MESMA resposta (`desvio`): a l.612 afirma o status e a
l.613 afirma o `reason`. Mudei as duas e nada mais:

| Linha | Antes | Depois |
|---|---|---|
| 612 | `assert.equal(desvio.status, 409, …)` | `assert.equal(desvio.status, 403, …)` |
| 613 | `… ?? desvio.body.reason, "checklist_set_requires_endpoint")` | `… ?? desvio.body.reason, "not_assigned_to_actor")` |

```
$ git diff --numstat   →   2	2	tests/work-order-checklists-sticky.test.ts
```
2 adições / 2 remoções: **exatamente as 2 linhas**, sem conversão de EOL (CR 826 → 826, 827 linhas).
A intenção do teste segue satisfeita: *"porta fechada, não 200"* — só que agora a porta que fecha primeiro
é a do escopo por objeto.

### ⛔ ACHADO QUE DEVOLVO — a l.612 NÃO fecha o arquivo; faltam 2 asserções FORA do meu contrato

Depois da mudança autorizada, **o mesmo teste continua vermelho**, agora mais adiante:

```
$ node --test --import tsx tests/work-order-checklists-sticky.test.ts
ec=1 · tests 15 · pass 14 · fail 1
AssertionError: zerar com `checklists: null` também é porta fechada
403 !== 409      at tests/work-order-checklists-sticky.test.ts:620:12
```

**Causa medida:** o teste dispara **TRÊS** `PATCH /work-orders/:id` com `headers(seed, "field_technician")`
sobre uma OS à qual esse técnico **não está atribuído**. O guard de escopo por objeto do D3 recusa **as
três**, não só a primeira:

| Linha | Requisição | Espera hoje | Contrato novo entrega | Nomeada pela emenda? |
|---|---|---|---|---|
| 612–613 | `desvio` (declara conjunto pelo update genérico) | 409 `checklist_set_requires_endpoint` | **403** `not_assigned_to_actor` | **SIM — foi o que eu mudei** |
| 620 | `zeragem` (`checklists: null`) | 409 | **403** | **NÃO** |
| 628 | `edicaoComum` (`description`) | **200** | **403** | **NÃO** |

**Medi a extensão exata em vez de estimar.** Com uma sonda TEMPORÁRIA (l.620 → 403 e l.628 → 403), o
arquivo fica **inteiramente verde**:
```
ec=0 · tests 15 · pass 15 · fail 0 · skipped 0
```
**A sonda foi REVERTIDA em seguida** e o `git diff --numstat` do arquivo voltou a `2 2` — a árvore que
entrego carrega **somente** a mudança autorizada. Registro o número porque o mandato manda medir, não
estimar; não porque eu tenha entregue essas duas linhas.

**Por que eu PAREI e não emendei sozinho** (§C7.4-bis; a emenda é nominal e fechada, e o E3.4 diz
*"Nenhuma outra linha do arquivo"*):

1. A l.620 é **renumeração** da mesma classe da l.612 (409 → 403) — mecânica, mas **não autorizada**.
2. A l.628 **NÃO é renumeração: é decisão de contrato.** Ela afirma hoje, no comentário logo acima,
   *"O 409 é do CAMPO, não da rota: o técnico segue editando o que a permissão dele cobre"* e espera
   **200**. Sob o escopo por objeto do D3, um técnico de campo **não atribuído** deixa de poder fazer
   até a edição comum de `description` — o 200 vira 403. Isso **muda o que o teste afirma sobre o
   produto**, e quem decide isso é a junta/o planejador, não o dev que implementa. É exatamente a classe
   que a `D-JUNTA-SEPARACAO-DE-PAPEIS` isola.
3. Existe uma leitura alternativa que **não** mexe no teste — atribuir a OS ao técnico no arranjo, para
   que ele siga podendo editar — e ela também é decisão de desenho, fora do meu papel.

**Consequência honesta: a falha #4 do ANTES NÃO fecha com o meu diff.** Ela avançou de l.612 para l.620,
mas o arquivo segue `ec=1`. Não a declaro fechada.

Isto conversa diretamente com a tensão do §A2 que o dev anterior consignou (semântica de
`assigned_operator_id`) e que a emenda E4 diz ser **da junta** decidir.

---

## Fechamento

### `git diff --numstat` — completo, nada elidido

O worktree é COMPARTILHADO com o `dev-o6r07a-auth-residuais`. Publico o numstat inteiro e marco o dono
de cada linha, para que ninguém me atribua o que não é meu nem o contrário:

```
127	0	agent-orchestration/omega/planos/B-O6R-07-plano.md        <- planejador (EMENDA E1)
16	0	src/modules/auth/anonymous-login.constants.ts             <- OUTRO DEV
57	1	src/modules/auth/routes/auth.routes.ts                    <- OUTRO DEV
16	3	src/modules/auth/services/anonymous-login.service.ts      <- OUTRO DEV
35	5	src/modules/auth/services/local-auth-login.service.ts     <- OUTRO DEV
17	0	src/modules/auth/services/password.service.ts             <- OUTRO DEV
17	8	tests/auth-login-anonymous-db.test.ts                     <- OUTRO DEV
1	0	tests/core-saas.test.ts                                   <- MEU (U2/E3.2)
4	0	tests/fixtures/role-catalog-contract.snapshot.json        <- MEU (U2/E3.3)
2	2	tests/work-order-checklists-sticky.test.ts                <- MEU (U3/E3.4)
```

Não rastreados MEUS: `prisma/migrations/20260871000000_grant_work_orders_approve_permission/`
(U1/E3.1) e este arquivo de evidência. Não rastreados do OUTRO DEV: `dev-a1-a3-auth.md`,
`00-quedas.md`, `tests/o6r07a-anon-lockout*.test.ts`, `tests/o6r07a-login-rate-limit.test.ts`,
`tests/o6r07a-scrypt-pin.test.ts`.

**MEU diff inteiro = 4 caminhos, exatamente os 4 do E3.** Nada além.

### Conferência do PROIBIDO — saiu VAZIO, comando publicado

```
$ git status --porcelain -- prisma/schema.prisma prisma/seed.ts .github frontend mobile \
    CLAUDE.md AGENTS.md RBAC_MATRIX.md APPROVAL_LIMITS.md Kpis API_CONTRACTS.md scripts package-lock.json
(vazio)
$ git status --porcelain -- prisma/migrations | grep -v 20260871000000_grant_work_orders_approve_permission
(vazio)
```
**Nenhuma migração EXISTENTE tocada** (a armadilha do no-op drift do E2.4 não se aplica: só criei
diretório novo). `PERMISSOES_HERDADAS_DO_SEED` **não cresceu** — não abri o arquivo do guard para editar;
a linha de base segue em 189 = `TAMANHO_CONGELADO`. `src/modules/auth/**` **não foi tocado por mim**;
os arquivos de auth no numstat acima são do outro dev e eu não os revertí, commitei nem "arrumei".
Dos 8 arquivos de teste do ciclo 5, **nenhum** aparece no meu diff.

### Portas usadas

| Serviço | Porta | Container |
|---|---|---|
| PostgreSQL 16 | **56442** | `o6r07a-prov-pg` |
| Redis 7 | **56391** | `o6r07a-prov-redis` |

Medidas livres antes de subir (`netstat` = 0 listeners; fora de todo `excludedportrange`). Não usei
**56434** (o planejador tinha acabado de usar) nem **56438/56381** (do outro dev) nem **55432**
(reservada). **A base viva `erp-postgres`:5432 / `erp-redis`:6379 não foi tocada nem para leitura.**

### Bateria — `ec` de cada passo

| Passo | Comando | `ec` |
|---|---|---|
| typecheck | `npm run check` | **0** |
| lint | `npm run lint` | **0** |
| suíte canônica | `npm test` (runner, cluster descartável) | **1** — 1 falha, a do U3 que devolvo |
| build | `npm run build` | **0** |
| whitespace | `git diff --check` | **0** (e a migração untracked, via `--no-index`, sai sem erro) |
| guard de paridade (sem banco) | `node --test --import tsx tests/permission-catalog-migration-parity.test.ts` | **0** — 3/3, **skipped 0** |
| guard de paridade (COM banco) | forma do job `backend-postgres`, `RBAC_DB_PARITY=1` | **0** — 2/2, **skipped 0** |

### N, forma e denominador

| Número | Forma | N |
|---|---|---|
| **2647** testes · pass **2644** · fail **1** · skip **2** | `npm test` (= `node scripts/run-backend-tests.mjs`, **255** arquivos), `DATABASE_URL`/`REDIS_URL` do cluster :56442/:56391, `CORE_SAAS_PERSISTENCE` **não** exportado (runner assume memory) — a forma canônica 3 | **N=2**, resultado **idêntico** nas duas |
| 3/3 e 2/2 nos guards de paridade | acima | 1 cada |
| 25 testes nos 4 arquivos novos de `auth` | `node --test --import tsx` dos 4 juntos | 1 |
| 2 = `permissions` num banco só-migrado | `psql` no cluster, sem seed | 1 |
| 3 grants / 0 duplicatas após 2 replays | `psql -f migration.sql` em `erp_probe` | **N=2** replays |

**O denominador subiu de 2622 (251 arquivos) para 2647 (255) e a diferença NÃO é minha** — medi:
os 4 arquivos novos do outro dev somam **exatamente 25** testes (2622 + 25 = 2647; 251 + 4 = 255).
**Meu diff não acrescenta caso de teste nenhum**: o U1 é migração, o U2 são literais de contrato e o U3
é uma asserção existente. Os **2 skips** são o orçamento conhecido do runner (os dois testes de
`permission-catalog-db-parity`, gated por `RBAC_DB_PARITY`), e eu os rodei **ligados**, à parte, verdes.

### As 4 falhas — ANTES × DEPOIS, nome a nome

| # | Teste | ANTES (`2d54ea2`) | DEPOIS (meu diff) | Fechou? |
|---|---|---|---|---|
| 1 | `permissão acrescentada ao catálogo chega ao banco por migração (fronteira)` | **FALHA** | **PASSA** | **SIM** — U1 |
| 2 | `mantem catalogo de permissoes integro` (`core-saas.test.ts`) | **FALHA** | **PASSA** | **SIM** — U2 |
| 3 | `contrato do consumidor de deploy` (`core-saas-role-authority.test.ts` / snapshot) | **FALHA** | **PASSA** | **SIM** — U2 |
| 4 | `[rota] o ajuste exige a permissão de ENVIAR ao técnico…` (`work-order-checklists-sticky.test.ts`) | **FALHA** na l.612 | **FALHA** na l.620 | **NÃO** — ver U3 |

**Três das quatro fecharam. A #4 NÃO fechou** e eu não a declaro fechada: a emenda autorizou uma
asserção e o arquivo precisa de **duas outras** (l.620 e l.628) que ela nomeia como proibidas — e a
l.628 é decisão de contrato, não renumeração. Medi que com essas duas o arquivo fica 15/15 verde, e
**revertí a sonda**.

**Nenhuma falha NOVA apareceu.** A única falha da suíte canônica é a #4, que já estava na lista do dev
anterior. Em particular **nenhum teste de `auth` falhou** — não tenho nada a devolver ao outro dev.

### O que eu NÃO fiz, e por quê

1. **`tests/work-order-checklists-sticky.test.ts` l.620 e l.628** — fora do E3.4, que diz *"Nenhuma
   outra linha do arquivo"*. A l.628 troca um **200 por 403** e muda o que o teste afirma sobre o
   produto. **PAREI e devolvo** (§C7.4-bis). **Bloqueia o merge enquanto não for decidido.**
2. **Não rejulguei** o achado do `dev-o6r07a-autorizacao` nem a EMENDA E1 — implementei como escritos.
   Onde a evidência dele e a emenda **divergem**, segui a **emenda** (meu contrato): ele propôs os
   grants para **4** papéis incluindo `platform_admin`; a emenda mede que `platform_admin` **não existe
   como role no banco** e manda 3. Re-medi e confirmei (`roles` = 0 linhas após `migrate deploy`;
   `platform_admin` está em `PAPEIS_SEM_LINHA_GLOBAL` do próprio guard). **Gravei 3.**
3. **`prisma/seed.ts`** — proibido, e desnecessário: o seed itera o `PERMISSION_CATALOG`, então a chave
   já flui sozinha para ele.
4. **Descrição da permissão no mapa do seed** — não dá para acrescentar sem editar `prisma/seed.ts`;
   a migração traz a sua própria `description` (o seed cai no fallback genérico, e nenhum guard compara
   descrição, só chaves).
5. **`Kpis/*`, `API_CONTRACTS.md`, `achados.jsonl`, `status-geral.md`, `pendencias.md`** — do orquestrador.
   As pendências `P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE` (fechável pelo U1+U2) e
   `P-O6R-B07A-STICKY-409-VIRA-403` (**segue aberta**, ver U3) não foram por mim registradas.
6. **`npm --prefix frontend run check`** — **NÃO MEDI**, e digo em vez de estimar: `frontend/node_modules`
   não existe neste worktree (só o `npm ci` da raiz foi rodado), e instalar dependência do frontend não
   está no mandato. **Nenhum arquivo de `frontend/` está no meu diff.**
7. **Commit, PR, merge** — do orquestrador, por instrução expressa.

### Armadilhas do mandato — como foram respeitadas

CR contado com `tr -cd '\r' | wc -c`, nunca `grep -c` · **nenhum `sed -i`/`perl -i`** (edições por
script Node fail-closed, por número de linha, com asserção de CR antes e depois) · **nenhum heredoc**
(o SQL da migração foi escrito com `Write`) · **nenhum `git archive`+`tar`** — a comparação de EOL do
blob foi feita com `git show`, que o mandato autoriza · nenhum `git checkout -- <arq>`, `reset`,
`stash`, `gc`, `prune`, `pack-refs` ou remoção de `.lock` · nenhum backtick em string de shell com
conteúdo a preservar · caminhos ABSOLUTOS em todo `Write`/`Edit` (a árvore principal não foi tocada) ·
nenhuma junction/symlink de `node_modules` · **nenhum mass-delete**: o único `DROP` foi o do banco-sonda
`erp_probe`, inteiro e meu, e não houve `DELETE` ad-hoc em lugar nenhum.

**Nota de EOL, medida (a armadilha que já queimou este repo):** minha migração está em **LF** na árvore
enquanto a migração-padrão aparece em **CRLF**. Isso **não é divergência**: com `core.autocrlf=true` e
**sem `.gitattributes`**, o git ARMAZENA as duas em LF — medido com `git show HEAD:<padrão>`, cujo blob
tem **CR = 0** contra os 44 CR da mesma arquivo na árvore de trabalho. O que vai para o repositório é
idêntico em forma.

### Limpeza (§C5) — 1 linha

Containers descartáveis `o6r07a-prov-pg` (:56442) e `o6r07a-prov-redis` (:56391) **derrubados e
removidos**, com o banco-sonda `erp_probe` já dropado antes; `dist/` do `npm run build` removido;
scripts temporários ficaram fora do repositório (scratchpad da sessão); **nada rastreado, nenhum
`node_modules`, nenhum `.env` e nenhum container ou arquivo do OUTRO DEV foi tocado**.

---

## Veredito final

| Item | Estado |
|---|---|
| **U1** — migração de provisionamento (E3.1) | **CUMPRIDO** — os 2 guards verdes, nenhum `skipped` |
| **U2** — os dois literais (E3.2, E3.3) | **CUMPRIDO** |
| **U3** — asserção do sticky (E3.4) + bateria | **PARCIAL** — a asserção nomeada foi feita e a bateria rodou; a falha #4 **não fecha** dentro do contrato e é **devolvida** |

**Status geral: 3 das 4 falhas fechadas · 0 falha nova · 1 achado devolvido à junta/ao planejador
(sticky l.620 e l.628).**
