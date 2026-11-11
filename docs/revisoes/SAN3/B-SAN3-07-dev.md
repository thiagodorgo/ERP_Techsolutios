# B-SAN3-07 — diário do dev (item 47: papéis legados no seed base e nome da organização demonstração, provados no banco)

- **Dev:** `dev-san3-07-cl`, Claude Opus 5.5, subagente da sessão, identidade nova (nível menor, declarado). Cobre o Codex,
  com exceção declarada: o Codex 1 está sem cota semanal até 16/11 e o Codex 2 está ocupado. Não planejei nem critiquei.
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/plano-B-SAN3-07.md` (autor `plano-B-SAN3-07-api`, Claude Opus 5.5
  pela API), com a Emenda 1 (orquestrador, 11/11 03:01), que prevalece. Crítica `crit-07-cl` (Claude Opus 5.5 da sessão),
  APROVADO COM AJUSTES: `revisoes/crit-07-plano.json` e `-evidencia.md`.
- **Verificador:** de outra casa, a cargo do orquestrador (emenda 1, item 8). Este diário não verifica a si mesmo.
- **Terreno:** worktree `C:/Users/thiag/w-san307`, ramo `fix/seed-papeis-legados` a partir de `origin/main` = `07898adf`
  (`git rev-parse origin/main`, 11/11 03:02 SP). `npm ci` próprio, sem junction. Postgres 16.15 descartável `san307-pg`
  em `127.0.0.1:55498`.
- **Horas:** de `date`, em São Paulo.

## F0 — comando (03:05)

- `agent-orchestration/codex/comandos/B-SAN3-07-seed-papeis-e-nome.md`, no formato curto da trilha SAN3
  (`B-SAN3-21-acentuacao.md`).
- O ramo é `fix/seed-papeis-legados`, o do mandato do orquestrador; o plano dizia `fix/seed-demo-nome-de-negocio`.
- O texto sobre a superfície da mudança de permissão já sai corrigido pela emenda 1, item 3: ganham os 5 papéis só as
  bases preparadas apenas por `db:seed` (CI `backend-postgres`, `test:e2e`, dev sem `db:seed:users`). O staging roda
  `db:seed:demo`, e o `seed-users.ts` já cria os 5.

## F1 — teste primeiro, vermelho-controle (03:07)

**Base de hoje.** `create database san307_tpl` → `npx prisma migrate deploy` (base modelo, só migrada); `create database
san307_hoje template san307_tpl` → `npm run db:seed` com o `prisma/` igual ao da `main` (`git diff --quiet origin/main HEAD
-- prisma/`), exit 0.
- `select count(*), string_agg(key, ',' order by key) from roles where tenant_id is null` →
  `7|auditor,field_dispatcher,manager,super_admin,technician,tenant_admin,viewer` (a HIPÓTESE do §1.2 do plano, confirmada).
- `select name, slug from tenants` → `Organização Demonstração|demo`.

**Mudança no teste** (`tests/permission-catalog-db-parity.test.ts`):
- `PAPEIS_SEM_LINHA_GLOBAL` reduzido a `["platform_admin"]`; o comentário que dizia "6 linhas globais" foi reescrito.
- P2 (`select count(*)::int as n from roles where key = 'platform_admin' and tenant_id is null` = 0) e P3
  (`select name from tenants where slug = 'demo'` → 1 linha, sem `/tenant/i`) entram como asserções DENTRO do teste "os
  grants do papel GLOBAL…", sem `test()` novo e sem renomear os 2 (emenda 1, item 1). `grep -c "^test(" …` = 2.
- P2 e P3 ficam antes da asserção de P1, para cada mutação ficar vermelha na asserção dela.

**Vermelho-controle.** `RBAC_DB_PARITY=1 node --test --import tsx tests/permission-catalog-db-parity.test.ts` contra
`san307_hoje` → exit 1, `# pass 1 · # fail 1`, `not ok 2` com exatamente 5 linhas:
`papel "operator" … 68`, `"finance" … 62`, `"inventory" … 17`, `"field_technician" … 49`, `"support" … 11` (soma 207).
P2 e P3 passaram nessa base (o seed de hoje não cria `platform_admin`, e o nome já foi corrigido pelo #518).

**Orçamento de pulos.** `DATABASE_URL=…/san307_tpl CORE_SAAS_PERSISTENCE=memory node scripts/run-backend-tests.mjs
tests/permission-catalog-db-parity.test.ts` → exit 0, `# tests 2 · # skipped 2`.

## F2 — a derivação no seed e o textual reescrito (03:09)

**Textual primeiro.** `tests/san3-04a-seed-semeia-auditor.test.ts` reescrito: lê `prisma/seed.ts` e
`scripts/provision-rbac.ts`, extrai o corpo do `DEFAULT_ROLES.filter((x) => …)` de `SEEDED_SYSTEM_ROLES` e de
`PAPEIS_PROVISIONADOS`, troca o nome do parâmetro e exige o mesmo texto, que deve ser `papel !== "platform_admin"`; exige
também o import de `DEFAULT_ROLES` do catálogo no seed (emenda 1, item 7). O segundo teste (o laço consome
`SEEDED_SYSTEM_ROLES`) ficou.
- Vermelho-controle no seed de hoje: `node --test --import tsx tests/san3-04a-seed-semeia-auditor.test.ts` → exit 1,
  `not ok 1` com "seed.ts sem `const SEEDED_SYSTEM_ROLES = DEFAULT_ROLES.filter((…) => …);`", `ok 2`.

**O seed.** `prisma/seed.ts`: o import troca `STANDARD_ROLES` por `DEFAULT_ROLES` (`grep -c STANDARD_ROLES prisma/seed.ts`
= 0), e `const SEEDED_SYSTEM_ROLES = DEFAULT_ROLES.filter((role) => role !== "platform_admin");`, com o comentário
reescrito. O nome da organização não foi tocado. Nada mais no arquivo.

**Verde.**
- `node --test --import tsx tests/san3-04a-seed-semeia-auditor.test.ts tests/seed-guard.test.ts` → exit 0, `# tests 6 ·
  # pass 6 · # fail 0`.
- Base nova `san307_novo` (template `san307_tpl`) → `npm run db:seed` exit 0 → 12 globais:
  `auditor,field_dispatcher,field_technician,finance,inventory,manager,operator,super_admin,support,technician,tenant_admin,viewer`.
- `RBAC_DB_PARITY=1 node --test --import tsx tests/permission-catalog-db-parity.test.ts` contra `san307_novo` → exit 0,
  `# tests 2 · # pass 2 · # fail 0 · # skipped 0`.

**O sinal sobre o seed é executá-lo** (emenda 1, item 6). `npm run check` → exit 0, mas ele compila só `src/**`.
Typecheck explícito do seed com um tsconfig meu, fora do repositório (`extends` do `tsconfig.json`, `include` de `src/**`
+ `prisma/seed.ts`, `typeRoots` do worktree): os MESMOS 2 erros antes (seed de `07898adf`, por `git stash`) e depois —
`prisma/seed.ts(195,3) TS1360` (o `permissionDescriptions … satisfies Record<Permission, string>` não tem 43 das 205
permissões do catálogo; contado por script: 162 com descrição) e `prisma/seed.ts(257,48) TS2551` (o acesso
`permissionDescriptions[permission]`, que tem fallback genérico). Pré-existentes, fora do escopo; viram pendência na F4.

## F3 — drills e mutações (03:11 a 03:15)

Todas as bases nascem de `create database <b> template san307_tpl` (só migrada no `07898adf`; o bloco não tem migração).

**D1** (base só do seed, `san307_novo`): `SELECT name FROM tenants` → 1 linha, `Organização Demonstração`. É o critério
literal do §5 do `PLANO_SAN3.md` ("nenhum contém Tenant", medido no banco).

**Contagem por papel.** `select r.key, count(rp.*) from roles r left join role_permissions rp on rp.role_id = r.id where
r.tenant_id is null group by r.key order by r.key` × `ROLE_PERMISSIONS[papel].length` (script meu, fora do repositório):
`diff` vazio nos 12 papéis — auditor 57, field_dispatcher 42, field_technician 49, finance 62, inventory 17, manager 141,
operator 68, super_admin 205, support 11, technician 44, tenant_admin 188, viewer 45; total 929.

**D2** (o seed de novo sobre `san307_novo`): concessões dos globais 929 → 929; globais 12 → 12; `select key, count(*) from
roles where tenant_id is null group by key having count(*) > 1` → 0 linha; `platform_admin` global = 0. 2º seed exit 0.

**D3.** `npm run db:provision-rbac -- --dry-run` depois do seed (`san307_novo`) → `12 provisionáveis … · 0 a criar`,
`concessões: 0 a criar · 929 já existiam`, `revogações deliberadas: 0 a remover`, exit 0. O mesmo comando na base de hoje
(`san307_hoje`) → `5 a criar: operator, finance, inventory, field_technician, support`, `concessões: 207 a criar · 722 já
existiam`.

**Mutações, literais, uma por vez** (roteiro meu fora do repositório: confere a âncora, troca o texto, base nova, `npx tsx
prisma/seed.ts`, paridade com `RBAC_DB_PARITY=1`, `git checkout -- prisma/seed.ts` e `git diff --quiet` depois):

| Mutação | Âncora | Seed | Banco | Paridade | Motivo |
|---|---|---|---|---|---|
| M1 (texto da crítica, emenda 1 item 2) | 1 | exit 0 | 7 globais | exit 1, `not ok 2` | exatamente 5 linhas "papel X não tem linha global": field_technician 49, finance 62, inventory 17, operator 68, support 11 |
| M2 `→ [...DEFAULT_ROLES]` | 1 | exit 0 | 13 globais, `platform_admin` = 1 | exit 1, `not ok 2` | a asserção P2 (`expected: 0`, `actual: 1`) |
| M3 (as 2 linhas `name: "Organização Demonstração"` → `"Tenant Demo"`) | 2 | exit 0 | `demo` = `Tenant Demo` | exit 1, `not ok 2` | a asserção P3 (`nome técnico: "Tenant Demo"`) |
| M4 (`role === "support" ? [] : …`) | 1 | exit 0 | 12 globais | exit 1, `not ok 2` | 11 linhas, todas `"support" deveria ter "…"`, nenhuma de outro papel |

Todas revertidas: "revertida: seed igual ao HEAD" depois de cada uma.

**Controle de P3 contra `4cd1889d^`.** `git diff 4cd1889d^ 4cd1889d -- prisma/` = só `prisma/seed.ts`, 2 linhas (`name:
"Tenant Demo"` → `name: "Organização Demonstração"`). O inverso desse diff aplicado ao seed do bloco (`git apply -R`) é
byte a byte o arquivo da M3 (`diff -q` vazio), que ficou vermelha acima.

**Suítes de banco do plano** (base nova `san307_bloco` semeada; env do job `backend-postgres`: `CORE_SAAS_PERSISTENCE=prisma`,
`JWT_SECRET`, `LOG_LEVEL=silent`, `RBAC_DB_PARITY=1`): `node --test --import tsx tests/permission-catalog-db-parity.test.ts
tests/permission-catalog-migration-parity.test.ts tests/persistent-rbac-middleware.test.ts
tests/core-saas-role-authority-db.test.ts` → exit 0, `# tests 12 · # pass 12 · # fail 0 · # skipped 0`.

## F4 — registro (03:17 a 03:23)

- `agent-orchestration/controle/pendencias.md`:
  - `P-SAN3-04A-SEED-PAPEIS-LEGADOS` → `status: FECHADA` (2026-11-11, PR deste ramo), com a prova de banco; a linha
    antiga fica como `status anterior`.
  - `P-CHK-SEED-DEMO-SUJO` (já FECHADA pelo #518 só com `grep`) → apenso com a prova no banco (D1, a asserção P3, a M3 e o
    inverso do #518).
  - Novas, com N, forma e dono: `P-SAN3-07-APP-NOME-TECNICO-OFFLINE` (MÉDIA; N = 15 arquivos, 20 ocorrências, 1 fonte +
    14 testes, as 2 asserções que exigem o texto em `b091:389` e `b098:447`; dono proposto `B-SAN3-19b`, a pergunta do §9
    com o dono — emenda 1, item 5); `P-SAN3-07-SEED-USERS-LEGADO` (BAIXA; N = 7 locais em 3 arquivos: `seed-users.ts`
    `:41-43`, `:53`, `:54-57` + `:60-68`, e os 2 corpos do `jurado-san3-01b-c2-cadeia-de-acesso` com o espelho; dono
    `B-SAN3-10` ou o primeiro bloco que tocar `seed-users.ts` — emenda 1, item 4); `P-SAN3-07-SEED-FORA-DO-TYPECHECK`
    (BAIXA; N = 2 erros, 43 de 205 permissões sem descrição; dono o próximo na trava de `prisma/seed.ts`, `B-SAN3-18`, com
    ampliação nominal — emenda 1, item 6).
  - Os N foram medidos por mim: `git grep -lE "Tenant Demo|Tenant Field Services" HEAD -- mobile/` → 15 (1 fora de
    `/test/`); `git grep -c` → 20; `sed -n 440,450p` do `b098` confirma a asserção da linha 447.
- `agent-orchestration/controle/pendencias-indice.md`: regenerado por `python agent-orchestration/controle/gerar-indice-pendencias.py`
  → `815 cabecalhos / 804 IDs | FECHADA 194, ABERTA 617, SEM-STATUS 4`. Antes de regenerar conferi que o índice da `main`
  estava em dia (o gerador sobre o `pendencias.md` da `origin/main` reproduz o índice dela byte a byte), então o diff do
  índice é só deste bloco: +3 cabeçalhos, +2 abertas, +1 fechada, e o resto são números de linha que andaram.
  - **Erro meu, corrigido antes do commit:** a 1ª regeneração deu CRÍTICA às 3 novas, porque a função `severidade` acha
    a palavra "crítica" ("crítica do plano") no corpo. Troquei por "revisão do plano" e regenerei: MÉDIA, BAIXA, BAIXA.
- `docs/revisoes/SAN3/PLANO_SAN3.md`: nota no item 47 (`:181`), dizendo que segue ABERTO até o merge e a resposta do
  dono, e nota na linha do bloco (`:282`) com o ramo real e o teste permanente.
  - **Leitura do dev, declarada (§A6):** o plano mandava "a marca ✓" no `:181`. A coluna é "reclass." e a legenda
    (`PLANO_SAN3.md:107-108`) diz que o ✓ marca item reclassificado para o gate, não item feito. Não marquei ✓; segui o
    precedente do item 48 (`:182`), uma nota "em revisão no PR …; segue ABERTO até o merge".

## Bateria

**Sem banco (03:25):** `npm run check` exit 0 · `npm run lint` exit 0 · `npm run build` exit 0 · `node
scripts/migration-transaction-guard.mjs` exit 0 (`migrações: 130 · … · violações: 0`) · `git diff --check` e `git diff
--check origin/main...HEAD` exit 0.

**As 60 suítes do job `backend-postgres`, todas juntas (03:16 a 03:26).** Lista extraída do `ci.yml` (60 arquivos, todos
presentes), base nova `san307_ci` semeada pelo seed do bloco, env do job (`CORE_SAAS_PERSISTENCE=prisma`, `JWT_SECRET`,
`LOG_LEVEL=silent`, `RBAC_DB_PARITY=1`; **sem Redis**, que o env declara opcional), `node --test --import tsx <60>` com
`pipefail`: exit 1, `# tests 504 · # pass 482 · # fail 21 · # cancelled 1 · # skipped 0`, 541 s.
- As 22 em 12 arquivos, todas em domínio que o bloco não toca: Traccar (6 arquivos, 14 casos), estoque
  (`inventory-cycle-count-close-units-db`, 3), rateio (`o6r06-allocation-basis-rls-db`, 2), faturamento de OS (1),
  checklists da OS (1) e `persistent-rbac-middleware` (1).
- As assinaturas são de carga, não de regra: `Transaction API error: Unable to start a transaction in the given time` (5),
  `A commit cannot be executed on an expired transaction … 23088 ms passed` (2), `timeout/503 stock_busy`, `test timed
  out after 180000ms` (o drill de migração do Traccar, que cancelou o arquivo), e durações de 20 a 43 s por caso. É o
  Postgres numa VM do Docker no Windows com 60 arquivos em paralelo; o runner da CI é Linux.
- O `persistent-rbac-middleware` (`500 !== 200` depois de 43 s) é o único que toca papel. Sozinho, na base `san307_bloco`,
  ele passou antes (F3: as 4 suítes de banco do plano, 12/12).
- **Isso não é aceite.** A regra "falha de ambiente esconde regressão" pede prova: cada um dos 12 arquivos re-roda
  sozinho, em série, numa base nova semeada pelo seed do bloco (abaixo).

**Os 12 arquivos vermelhos, cada um sozinho e em série (03:27 a 03:34).** Base nova `san307_iso` semeada pelo seed do
bloco, o mesmo env:

| Arquivo | Resultado |
|---|---|
| `inventory-cycle-count-close-units-db` | 22/22 |
| `o6r06-allocation-basis-rls-db` | 10/10 |
| `persistent-rbac-middleware` | 2/2 |
| `traccar-event-ingestion-db` | 21/21 |
| `traccar-event-migration-drill-db` | 6/6 casos; o 7º "teste" é o encerramento do arquivo: `EBUSY: resource busy or locked, rmdir 'C:\Users\thiag\AppData\Local\Temp\trc02-mdrill-tXDb3N'`, trava de arquivo do Windows ao apagar a pasta temporária do drill |
| `traccar-event-sample-db` | 13/13 |
| `traccar-idempotency-db` | 9/9 |
| `traccar-position-ingestion-db` | 22/22 |
| `traccar-quarantine-db` | 6/6 |
| `traccar-resolution-race-db` | 5/5 |
| `work-order-checklists-freeze-links-db` | 6/6 |
| `work-order-invoicing-atomic-db` | 17/17 |

Conclusão, declarada como tal: os 22 vermelhos do conjunto paralelo são carga desta máquina (e o `EBUSY` é do Windows),
não efeito do seed. Todos os casos passam quando o Postgres não está saturado, com o seed do bloco. A medida que vale para
o aceite é o TAP do job `backend-postgres` na CI, no Linux, sobre o head do PR (§C7 item 11(3)).

## PARADA — o plano com a emenda não fecha no código (03:48)

**O defeito.** A emenda 1, item 1 (CRIT07-01) pôs P3 ("a organização `demo` existe, 1 linha, e não tem `/tenant/i`")
DENTRO do teste de concessões de `tests/permission-catalog-db-parity.test.ts`. Esse arquivo não roda só depois do seed:
ele é o guard de paridade catálogo × banco de QUALQUER base provisionada, e o cabeçalho dele diz que o valor real é
contra a base que não foi semeada (dev, staging, produção). Três drills de migração do `npm test` (job `backend`) montam
uma base própria com `migrate deploy` + `db:provision-rbac`, sem seed, e rodam a paridade num processo filho exigindo
`# fail 0`. Nessa base não existe a organização `demo`, então P3 reprova, e o job `backend` do PR ficaria vermelho.

**Os 3 vermelhos, no `npm test` na forma do job `backend`** (base nova só migrada `san307_npmtest`,
`CORE_SAAS_PERSISTENCE=memory`):
- `tests/ass-04-billing-permissions-migration-drill-db.test.ts` → `not ok 115 - M3b (d): depois do db:provision-rbac
  nesta base, a paridade catálogo × banco é verde (permission-catalog-db-parity)`;
- `tests/ass-05-providers-permission-migration-drill-db.test.ts` → `not ok 214 - M4b (d): …`;
- `tests/b-san3-12a-permissions-migration-drill-db.test.ts` → `not ok 820 - A22 (d): …`.

**A causa, provada por execução (03:48).** Base nova `san307_prov` (template só migrado) → `npm run db:provision-rbac`
(exit 0; `12 criado(s)`, `929 criada(s)`); `select count(*) from tenants` = 0. `RBAC_DB_PARITY=1 node --test --import tsx
tests/permission-catalog-db-parity.test.ts` com o arquivo do bloco → exit 1, `ok 1`, `not ok 2`, mensagem `P3: o seed
não deixou a organização demonstração (slug = 'demo') na base.`, `expected: 1`, `actual: 0`. O mesmo comando com o
arquivo da `origin/main` (copiado para um nome temporário e apagado em seguida) → exit 0, `# fail 0`. P1 e P2 passam na
base provisionada: o defeito é só P3.

**Por que a crítica não viu.** A prova do A2 (CRIT07-01) mediu o orçamento de pulos com o arquivo de paridade sozinho e as
60 suítes do `backend-postgres`; os três drills estão no `npm test` do job `backend`, e só lá a paridade roda contra base
sem seed.

**O que NÃO fiz.** Não troquei o critério de P3, não mexi nos drills (fora do PERMITIDO) nem em `.github/**` ou
`scripts/**` (PROIBIDOS). Trocar o critério é emenda antes do código (`D-EMENDA-ANTES-DO-CODIGO`, §C7 item 11(3)). Não
abri o PR: ele nasceria vermelho no job `backend`.

**Saídas que eu vejo, para quem emenda decidir (não escolhi nenhuma):**
1. **P3 só quando a organização `demo` existir.** Fica no PERMITIDO e não muda o orçamento. Perde a reprovação de "o seed
   deixou de criar a `demo`" (passaria em vazio); a M3 continua mordendo. Muda o critério de P3 do §3 do plano.
2. **P3 num teste de seed próprio, fora do arquivo de paridade.** Precisa de 1 linha em `.github/workflows/ci.yml` (a
   SUITES do `backend-postgres`) e, se o teste pular no job `backend`, de `scripts/run-backend-tests.mjs` (orçamento 2 → 3)
   e do guard-do-guard `tests/npm-test-runner-guard.test.ts`. Hoje os três estão PROIBIDOS.
3. **Os três drills semeiam a base antes da paridade, ou desligam P3 por variável.** Toca 3 arquivos de teste fora do
   PERMITIDO, e quem rodasse a paridade em produção, como o cabeçalho dela convida, teria de desligar P3 também.

**Estado em que paro.** Commits F0, F1 e F2 no ramo `fix/seed-papeis-legados` (local, não empurrado). P1, P2 e a
derivação no seed estão provados (F1 a F3) e não dependem da escolha acima. O registro da F4 (pendências, índice e
`PLANO_SAN3.md`) foi para um commit de **rascunho**, só para não se perder: ele fecha a `P-SAN3-04A-SEED-PAPEIS-LEGADOS`
e o bloco parou, então não vale até a emenda; quem retomar confere e reaproveita.

**`npm test` na forma do job `backend` (03:34 a 03:58).** Base nova só migrada `san307_npmtest`,
`CORE_SAAS_PERSISTENCE=memory`, sem Redis: exit 1, `# tests 4954 · # pass 4933 · # fail 19 · # cancelled 0 · # skipped 2`
(o orçamento de 2 pulos, cumprido). Os 19:
- **3 são deste bloco:** os drills da paridade acima (`ass-04` 115, `ass-05` 214, `b-san3-12a` 820).
- **16 não leem o seed nem a paridade** (`grep -cE 'db:seed|prisma/seed|seed\.ts'` e `grep -c permission-catalog-db-parity`
  = 0 em cada arquivo): `san3-09-bootstrap-platform-admin-db` (o drill chama `node_modules/.bin/prisma`, que no Windows é
  script de shell: `SyntaxError: missing ) after argument list`), `san3-05-runtime-role-guard-db` e
  `san3-05-leituras-de-plataforma-db` (`condição de boot não apareceu em 15000ms`, e o mesmo drill de papel), `ass-08-channel-db`
  (`o claim alcançou a cauda em 2347 ms (teto 2 000)`), `inventory-balance-lock-race-db` (`stock_busy`),
  `cheque-title-link-migration-drill-db`, `impound-trigger-durability` e `traccar-position-ingestion-db` (concorrência e
  tempo). É a mesma classe de carga e de Windows do conjunto paralelo; não re-rodei estes porque o bloco não alcança
  nenhum deles, e a decisão que importa agora é a da parada.
- Os testes que leem o texto do seed (`ass-02-plan-catalog`, `b-san3-12-ce4-db`, `inventory-write-paths-guard`,
  `san3-04a-menu-com-permissoes-do-banco-db`, `san3-04a-menu-front-x-catalogo`, `seed-guard` e o textual do bloco) não
  aparecem entre os vermelhos.

## RETOMADA pela Emenda 2 (04:02 a 04:20)

A Emenda 2 do plano (orquestrador, 11/11 04:02, leitura declarada) responde à PARADA: o P3 vale só em base semeada,
detectada por uma sentinela S que só o `db:seed` base cria; P3 = "se S existe, a `demo` existe, com 1 linha e sem
`/tenant/i`"; dentro dos 2 `test()` que já existem; drills, `.github/**` e `scripts/**` intocados.

**Terreno.** `git fetch` → a `main` andou para `b6caf568` (#533, `B-SAN3-08`), que mexeu no `pendencias.md` e no
índice. Rebase do ramo sobre ela: o único conflito foi no commit de rascunho do registro, os dois lados acrescentando
pendências no fim do `pendencias.md`; mantive as da `main` e depois as minhas, e regenerei o índice. O índice da `main`
`b6caf568` estava em dia (o gerador sobre o `pendencias.md` dela reproduz o índice dela byte a byte). Postgres
`san307-pg` subido de novo (04:03).

**A escolha de S, medida.**
- Fora de tabela com RLS, o seed base não cria nada que a migração ou o provisionamento não criem: os 6 planos já vêm da
  migração (`select count(*) … from subscription_plans` = 6 na base só migrada), e `permissions`, `roles` e
  `role_permissions` vêm do `db:provision-rbac`. A única linha só do seed numa tabela sem RLS é a própria `demo` em
  `tenants`, e a Emenda pede uma S que sobreviva a "o seed não cria a `demo`".
- `select relname, relrowsecurity, relforcerowsecurity from pg_class …` → `audit_logs`, `branches`, `tenant_settings`,
  `users`, `user_role_assignments` e `roles` têm RLS forçado; `tenants`, `permissions`, `role_permissions` e
  `subscription_plans`, não. A política de `audit_logs` só mostra linha com o GUC `app.current_tenant_id` da organização.
- **S = o registro de auditoria `action = 'seed.initialized'`, `entity = 'database'`**, que o `prisma/seed.ts` grava uma
  vez (idempotente) e que mais nada cria (`git grep -n "seed.initialized"` fora do registro: só `prisma/seed.ts:494,508` e
  a documentação). As exclusões de `audit_logs` nos testes são escopadas às organizações deles.
- Medido: base só migrada S = 0 (0 organização, 0 papel global); base só provisionada (`db:provision-rbac`, 12 papéis
  globais) S = 0 (0 organização); base semeada S = 1 (1 organização, 12 papéis globais).
- **Leitura do dev, declarada (§A6): a trava de RLS.** Um papel sem `BYPASSRLS` lê S = 0 mesmo na base semeada, e o P3
  passaria em vazio sem ninguém ver. Por isso a medição de S exige papel superusuário ou BYPASSRLS (`select (rolsuper or
  rolbypassrls) … where rolname = current_user`) e FALHA sem ele, com a mensagem dizendo o porquê. A CI
  (`postgres`) e os drills (o mesmo usuário da `DATABASE_URL`) já usam superusuário; nenhuma execução atual da paridade
  muda. Quem rodar a paridade com o papel de runtime recebe a falha em vez de um verde vazio.
- O P3 escreve no TAP o que decidiu: `# P3 aplicado: a base foi semeada (sentinela seed.initialized = N)` ou `# P3 não
  se aplica: a base não tem a sentinela do seed (provisionada sem db:seed)`.

**Erro meu, corrigido.** Depois de medir a M6 eu reverti o arquivo de teste com `git checkout --`, e isso apagou a edição
da Emenda 2, que ainda não estava commitada. Reapliquei o mesmo texto, fiz o commit e repeti TODAS as provas abaixo sobre
o arquivo commitado (04:12 a 04:17). As primeiras medições (04:08 a 04:11) deram o mesmo resultado.

**Provas da Emenda 2, item 3** (todas sobre o arquivo commitado):
1. **Os 3 drills verdes**, na forma do job `backend` (base nova só migrada, `CORE_SAAS_PERSISTENCE=memory`), um por vez:
   `ass-04-billing-permissions-migration-drill-db` 4/4, `ass-05-providers-permission-migration-drill-db` 4/4,
   `b-san3-12a-permissions-migration-drill-db` 4/4, com `ok 4 - M3b (d)`, `ok 4 - M4b (d)` e `ok 4 - A22 (d)`.
   A paridade direta na base só provisionada: exit 0, `# pass 2`, `# P3 não se aplica: …`.
2. **Na base semeada o P3 roda de verdade:** exit 0, `# pass 2`, `# P3 aplicado: a base foi semeada (sentinela
   seed.initialized = 1)`; e a M3 e a M5 abaixo só ficam vermelhas porque ele roda.
3. **A mutação nova M5** ("o seed não cria a `demo`, mas mantém S"): as 2 linhas `slug: "demo",` → `slug: "demo-mutante",`
   (âncora 2). Seed exit 0; banco: sentinela 1, `demo` ausente, `demo-mutante:Organização Demonstração`; paridade exit 1,
   `not ok 2`, `# P3 aplicado …`, `P3: a base foi semeada (há o registro seed.initialized), mas a organização
   demonstração (slug = 'demo') não está nela. O seed base está incompleto.` Revertida.
4. **A M3 continua vermelha:** sentinela 1, `demo` = `Tenant Demo`; `P3: a organização demonstração tem nome técnico:
   "Tenant Demo" …`. Revertida.

**As outras mutações, de novo:** M1 → 5 linhas "não tem linha global" (globais 7); M2 → a asserção P2 (globais 13,
`platform_admin` 1); M4 → 11 linhas, todas `"support" deveria ter …`, 0 de outro papel. Todas revertidas, `git status`
limpo depois.

**A trava de RLS, por execução (M6).** Na base semeada criei o papel `san307_rt` `NOSUPERUSER NOBYPASSRLS` com `SELECT` em
todas as tabelas. `select count(*) from audit_logs where action='seed.initialized'`: como `postgres` 1, como `san307_rt`
0. Paridade com `san307_rt`: exit 1, `P3: o papel da conexão (san307_rt) não atravessa o RLS de audit_logs …`. M6 (no
teste, `papelDaConexao[0]?.atravessa,` → `true,`), com o mesmo papel: exit 0, `# pass 2`, `# P3 não se aplica` — o verde
vazio que a trava fecha. Revertida.

**Orçamento de pulos:** `DATABASE_URL=…/san307_tpl CORE_SAAS_PERSISTENCE=memory node scripts/run-backend-tests.mjs
tests/permission-catalog-db-parity.test.ts` → exit 0, `# tests 2 · # skipped 2`.

**O registro (F4), conferido e reaproveitado.** O rascunho foi tirado da sequência e refeito como commit válido sobre
a Emenda 2, com as correções: a `P-SAN3-04A-SEED-PAPEIS-LEGADOS` cita o P3 só em base semeada, as mutações M1–M5 e os 3
drills verdes; o apenso da `P-CHK-SEED-DEMO-SUJO` descreve a sentinela e a M5; o comando ganhou o P3 da Emenda 2, a M5,
a M6 e os 3 drills na bateria. Índice regenerado: `821 cabecalhos / 810 IDs | FECHADA 194, ABERTA 623` (a `main` tem
818/807, 193 e 621: +3 cabeçalhos, +1 fechada, +2 abertas).

## Bateria final (head `def54be6`, 04:19 a 04:33)

- `npm run check` exit 0 · `npm run lint` exit 0 · `npm run build` exit 0 · `node scripts/migration-transaction-guard.mjs`
  → `migrações: 130 · … · violações: 0` · `git diff --check origin/main...HEAD` exit 0.
- `node --test --import tsx tests/san3-04a-seed-semeia-auditor.test.ts tests/seed-guard.test.ts` → `# tests 6 · # pass 6 ·
  # fail 0`.
- Base nova semeada `san307_bloco`: D1 `SELECT name FROM tenants` = `Organização Demonstração`; as 4 suítes de banco do
  plano no env do `backend-postgres` → `# tests 12 · # pass 12 · # fail 0 · # skipped 0`, com `# P3 aplicado (sentinela
  seed.initialized = 1)`.
- **`npm test` na forma do job `backend`** (base nova só migrada `san307_npmtest2`, `CORE_SAAS_PERSISTENCE=memory`, sem
  Redis): exit 1, **`# tests 4963 · # pass 4945 · # fail 16 · # cancelled 0 · # skipped 2`** (o orçamento de 2 pulos,
  cumprido). **Os 3 drills do bloco verdes:** `ok 115 - M3b (d)`, `ok 214 - M4b (d)`, `ok 820 - A22 (d)`.
- **Os 16 vermelhos, um a um.** Estão em 7 arquivos, e nenhum lê o seed nem a paridade (`grep -cE
  'db:seed|prisma/seed|seed\.ts'` = 0 e `grep -c permission-catalog-db-parity` = 0 em cada um):

| Arquivo | Casos (o pai conta como 1) | Assinatura | Classe |
|---|---|---|---|
| `san3-05-leituras-de-plataforma-db` | T11d, T11e + o pai (3) | `allocatedCost: 10` contra `30` entre o papel sem bypass e o superusuário, no rateio de custo de nuvem | poluição da suíte paralela: **sozinho, 12/12** (04:35, base nova só migrada) |
| `san3-05-runtime-role-guard-db` | T14a/b, T14c, T14d, T15 + o pai (5) | `setsid: ausente — necessário para impedir que psql \password leia a senha do terminal` (o `scripts/db-runtime-role.sh` exige `setsid`, que o Git Bash não tem); `condição de boot não apareceu em 15000ms` | Windows: **sozinho, os mesmos 5** (04:36) |
| `san3-09-bootstrap-platform-admin-db` | T2.1 + o pai (2) | `migrate deploy saiu com 1`: o drill chama `node_modules/.bin/prisma`, que no Windows é script de shell, e o `node` o lê como JS (`SyntaxError: missing ) after argument list`) | Windows |
| `traccar-binding-uniqueness-db` | 1 | `Transaction API error: Unable to start a transaction in the given time.` | carga |
| `traccar-event-migration-drill-db` | T-M(e), T-M(f) (2) | `deploy da base <drill>_main …: null !== 0`, ~181 s: o `migrate deploy` filho morto pelo tempo | carga |
| `traccar-position-ingestion-db` | 2 | `controle: o trabalho chegou à porta do commit depois do 503` (o controle do teste de tempo esgotado) | carga |
| `work-order-invoicing-migration-drill-db` | T-D(f) (1) | `deploy da base <drill>_main …: null !== 0`, ~181 s | carga |

  O conjunto muda de uma rodada para outra (na 1ª, às 03:34, foram 19, com `ass-08`, estoque, cheque e `impound`, e
  sem `traccar-binding-uniqueness` nem o drill de faturamento), que é a marca de carga. Os da classe Traccar e estoque
  passaram sozinhos às 03:27–03:34 (tabela acima). A medida que vale para o aceite é o TAP dos jobs da CI, no Linux,
  sobre o head do PR (§C7 item 11(3)).
