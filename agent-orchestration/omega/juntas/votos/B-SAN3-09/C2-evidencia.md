# C2-evidencia — papel: cadeira C2 da junta 1 do B-SAN3-09 (PR 400) · identidade: agente-dba-guardiao · modelo: Opus 5.5 (claude-opus-5-5; decisao do dono de 2026-10-04, Fable/Astra suspensos ate o reset semanal) · mandato_md5 (EOL-neutro): aa9f7170a35dcc22631f2d13428678b9 · corpo_md5 (EOL-neutro, origin/main .claude/agents/agente-dba-guardiao.md, blob fef74fac): de789c12f149cd9c36dc79e861adc043

Inicio: 2026-10-04T18:44:30Z. Evidencia incremental (P1): comando -> saida resumida -> veredito parcial, apensada a cada item.

## 0. Identidade, mandato e corpo (2026-10-04T18:44:30Z)
- `tr -d '\r' < 00-mandatos/C2.md | md5sum` (arvore w-nuv09 e `git show 6330bce2:...C2.md`) -> aa9f7170a35dcc22631f2d13428678b9 nos dois -> confere com o mandato_md5 do disparo.
- `git ls-tree origin/main -- .claude/agents/agente-dba-guardiao.md` -> blob fef74fac806b7171689ffa072b88ae1cffc3fad2; `git cat-file -p <blob> | tr -d '\r' | md5sum` -> de789c12f149cd9c36dc79e861adc043 (origin/main = 8ee10bd2). Espelho .agents/agents/agente-dba-guardiao.md (blob ce52a435) md5 8eb01a8f... (espelho Codex adaptado; nao e o corpo carregado).
- Corpo carregado = corpo de origin/main (cabecalho e texto conferidos por leitura). O corpo nao tem Write: evidencia e voto sao gravados por Bash (heredoc), so nestes dois arquivos.
- Parcial: identidade/mandato/corpo CONFEREM.

## L. Legalidade (18:43–18:46Z)
- Parecer do inspetor (`00-inspetor-terreno.md`, l.11 e l.170): **LIBERADO COM RESSALVA** (R-1..R-7), objeto que ele mediu = 6330bce2. R-1 condiciona C2; a frase exigida pela R-1 esta no meu disparo ("esses criterios gerais do corpo nao se aplicam ao escopo deste bloco e NAO sao motivo de reprovacao aqui"), logo a liberacao cobre esta cadeira.
- `git fetch origin; git rev-parse origin/feat/bootstrap-platform-admin origin/main` -> ba65c03a4c3edc0723633b0f1330f34852a60e6f / 8ee10bd2e44d95206551b71351f23d901192cbb6. `gh pr view 400 --json headRefOid,state,isDraft,mergeable` -> headRefOid ba65c03a..., OPEN, rascunho, MERGEABLE (git = gh).
- R-4: `git log --oneline 6330bce2..ba65c03a` -> 1 commit (parecer do inspetor); `git diff --name-only 6330bce2 ba65c03a` -> so `agent-orchestration/omega/juntas/votos/B-SAN3-09/00-inspetor-terreno.md` (condicao (a) OK).
- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/ba65c03a.../check-runs --paginate` -> total_count=14, 14x `completed success` (docker, owner-portal, frontend, backend, backend-postgres, flutter, authority-portal, x2), concluidos 17:48:20Z–17:57:53Z (condicao (b) OK).
- **OBJETO = ba65c03a4c3edc0723633b0f1330f34852a60e6f** (arvore de produto identica a 6330bce2).
- R-1: `git diff --name-only 8ee10bd2(merge-base) ba65c03a | grep -cE '^(prisma|migrations|infra)/'` -> 0; `grep -ciE 'backup|pg_dump|pitr'` nos nomes -> 0. Fora de agent-orchestration/: Kpis/{app.js,kpis-history.json,kpis-history.md,kpis-latest.json}, docs/deployment.md, docs/revisoes/SAN3/B-SAN3-09-plano.md, scripts/bootstrap-platform-admin.ts, tests/san3-09-bootstrap-platform-admin{,-db}.test.ts. Sem migration nem backup: os criterios gerais do corpo (migration up/down, PITR, pg_dump, restore) NAO se aplicam ao objeto (§A7); valem os do corpo que cabem (isolamento por tenant_id, RLS).
- Parcial: LEGAL. Objeto ba65c03a com 14/14 check-runs concluidos verdes; inspetor LIBERADO COM RESSALVA.

## T. Terreno (18:47–18:55Z)
- Disco antes: `df -h /c` -> 4,2–4,8 GB livres (R-7). Decisao de terreno por disco: a EXECUCAO toda roda num container Linux proprio (R-6) com `npm ci` proprio la dentro; o worktree Windows e a fonte (arvore do objeto, grep, md5) e NAO recebe `npm ci` (economiza ~0,5 GB em C:). Sem junction possivel (fs do container).
- Worktree: `git worktree add --detach C:/Users/AMP/w-j09c2 ba65c03a...` -> HEAD ba65c03a4c3edc0723633b0f1330f34852a60e6f, `status --porcelain` = 0 linhas.
- Portas: `netstat -ano | grep -E ':(55721|55722) '` -> 0 linhas antes; depois LISTENING 127.0.0.1:55721 (pg) e 127.0.0.1:55722 (redis).
- Containers proprios na rede `j09c2-net`: `j09c2-pg` (postgres:16, senha aleatoria 24 hex so no scratchpad, nunca impressa), `j09c2-redis` (redis:7), `j09c2-node` (node:20-bookworm-slim, imagem ja local). `docker exec j09c2-pg pg_isready -U postgres` -> accepting connections; `redis-cli ping` -> PONG. Base viva erp-postgres 5432 / erp-redis 6379 nao recebeu comando; container alheio `san3-05-s2-pg` (55405, outra sessao) nao tocado.
- Arvore: `git -c core.autocrlf=false archive ba65c03a | docker exec -i j09c2-node sh -c 'mkdir -p /work && cd /work && tar -x'`; md5 container = md5 blob: script a5f5383dfbbabde9a63205bd40f64782, teste -db e90a9bc4b99c98f65bab85d92f452490, package-lock 69a6ea326087249d7aa03896859513f8, provision-rbac ff5b2338896dab6d5158d5c2a24cd266, rls.ts 7cffaafe08f6ad2a07b86f79aa7686c9.
- Senhas de teste (admin `Tst-<20 hex>`, papel de runtime 24 hex) geradas no scratchpad e descartadas ao fim; nunca impressas.

## P. Preparo do cluster (18:53–18:58Z, container Linux j09c2-node, Node v20, OpenSSL 3.0.22)
- `npm ci --no-audit --no-fund` em /work -> 222 pacotes de topo; prisma 7.8.0 / @prisma/client 7.8.0; `.bin/prisma -> ../prisma/build/index.js` (symlink).
- `DATABASE_URL=<j09c2-pg superusuario> npx prisma generate` -> gen_ec=0; `npx prisma migrate deploy` -> mig_ec=0, "All migrations have been successfully applied."; `SELECT count(*) FILTER (WHERE finished_at IS NOT NULL), count(*) FROM _prisma_migrations` -> 107|107 (= 107 diretorios em prisma/migrations do objeto).
- Postura RLS na base migrada (`pg_class.relforcerowsecurity`): users, roles, user_role_assignments, local_auth_credentials, audit_logs = FORCE; tenants e role_permissions = sem RLS. Contagens: tenants=0 users=0 ura=0 cred=0 audit=0 roles=0 rp=0 (permissions=2, semeadas por migracao).

## Item 3 — base so migrada -> RBAC_NOT_PROVISIONED e nenhuma linha; o script nao cria papel nem concessao (18:58–19:00Z)
- comando: `docker exec -e DATABASE_URL=<su> -e PLATFORM_ADMIN_EMAIL=admin-j09c2@example.com -e PLATFORM_ADMIN_PASSWORD=<teste> j09c2-node sh -c 'cd /work && npx tsx scripts/bootstrap-platform-admin.ts [--dry-run]'` na base SO migrada (antes de qualquer db:provision-rbac).
- saida (aplicar): ec=2, `[bootstrap-platform-admin] RECUSADO (RBAC_NOT_PROVISIONED): Papel global "super_admin" ausente ou sem concessões neste banco. Rode \`npm run db:provision-rbac\` antes (é o passo do CD).`; depois: tenants=0 users=0 ura=0 cred=0 audit=0 roles=0 rp=0.
- saida (--dry-run): ec=2, mesma recusa nomeada; contagens identicas (todas 0).
- segredo na saida: `grep -cF <senha-teste>` = 0, `grep -c postgres` = 0, `grep -cF <senha-cluster>` = 0, nas duas.
- grep (mandato): `grep -nE 'role\.create|rolePermission' scripts/bootstrap-platform-admin.ts | wc -l` -> 0.
- grep ampliado (a classe, nao so a instancia): `role\.(create|upsert|update|delete)|rolePermission|role_permissions|permission\.(create|upsert)|createMany|INSERT INTO (roles|role_permissions|permissions)|CREATE ROLE|GRANT |ALTER ROLE|\$executeRawUnsafe|\$queryRawUnsafe` -> so l.197/200/201, todas LEITURA (`_count: { select: { role_permissions: true } }` e a comparacao `=== 0`). Mesma classe nos modulos importados (rls.ts, local-auth-credential.repository.ts, local-auth-credential.service.ts, anonymous-login.constants.ts, password.service.ts, auth.types.ts) -> 0. Imports do script: dotenv/config, @prisma/adapter-pg, @prisma/client, rls.js, os 2 de credencial (nada que crie papel).
- veredito parcial: VERDE — recusa nomeada com zero linhas (aplicar e dry-run); o script nao cria papel nem concessao (grep da instancia e da classe, inclusive transitivo de 1-2 niveis).

## Item 1 — parte A: provision-rbac, script 2x, dry-run (18:58–19:05Z, banco erp_j09c2, superusuario do cluster descartavel)
- `npm run --silent db:provision-rbac` -> prov_ec=0; "198 no catálogo · 12 papéis criados (super_admin ... support) · concessões: 908 criada(s) · CONVERGIDO". Pos: roles=12 (12 globais), rp=908, super_admin global com 198 concessoes, tenants=0, users=0.
- Clones limpos (pos-provision, antes de qualquer bootstrap): `CREATE DATABASE erp_j09c2_{conc,rls,mut,mutsu} TEMPLATE erp_j09c2`.
- Medidores (no container pg): `cnt.sql` = contagens escopadas a organizacao `slug='platform'` (tenants/users/ura/cred/audit `platform.bootstrap.admin_created`) + totais + `md5(password_hash)` (so o md5, nunca o hash) + papel do vinculo; `fp.sql` = md5 do texto de TODAS as linhas de tenants, users, user_role_assignments, local_auth_credentials, audit_logs, roles, role_permissions + `sum(n_tup_ins+n_tup_upd+n_tup_del)` de pg_stat_user_tables.
- antes: cnt 0/0/0/0/0 · totais roles=12 rp=908 · fp ef5aad87b45e1a1613042e1fd5608406 tup=1439.
- a) `--dry-run` em estado LIMPO -> ec=0, "organização ... a criar · usuário a criar · vínculo a criar · credencial a criar · simulação encerrada — nada foi escrito"; depois fp ef5aad87... tup=1439 (IDENTICO: 0 escritas).
- b) 1a execucao -> ec=0, "criada (54829774-...) · usuário criado · vínculo super_admin criado · credencial criada · CONVERGIDO"; cnt **1/1/1/1/1**, totais tenants=1 users=1 ura=1 cred=1 audit=1, md5(hash)=fea0673bccbaf9950ae454a083816fa6, vinculo super_admin/global=true; fp 7e48a69f... tup=1444 (+5 = exatamente 5 INSERTs).
- c) 2a execucao -> ec=0, "já existia ... credencial já existia (senha mantida) · CONVERGIDO"; cnt **1/1/1/1/1**, md5(hash)=fea0673bccbaf9950ae454a083816fa6 (**hash igual**); fp 7e48a69f... tup=1444 (identico: zero INSERT/UPDATE/DELETE na 2a).
- d) `--dry-run` CONVERGIDO -> ec=0, "já existia ... simulação encerrada"; fp 7e48a69f... tup=1444 (0 escritas).
- segredo nas 4 saidas: senha-teste=0, senha-cluster=0, 'postgres'=0, 'scrypt'=0.
- parcial (parte A): VERDE — 2x = 1/1/1/1/1 com hash igual; dry-run com 0 escritas nos dois estados (fingerprint de linhas e contador de tuplas).

## Item 1 — parte B: duas execucoes SIMULTANEAS, com controle de mutacao (19:05–19:12Z)
- arnes: `/tmp/conc.sh <db> <script>` no container node = dois `npx tsx <script>` em background (`&`) contra o mesmo banco, mesmo e-mail, `wait` em cada um, ec e saida de cada um. Bancos: clones limpos pos-provision (`CREATE DATABASE ... TEMPLATE`).
- OBJETO (script com a trava, md5 a5f5383d...), N=3:
  - erp_j09c2_conc: A ec=0 ("já existia ... senha mantida"), B ec=0 ("criada ... criado ... criada"); cnt **1/1/1/1/1**, vinculo super_admin/global=true.
  - erp_j09c2_conc2: A ec=0 (já existia), B ec=0 (criada); cnt **1/1/1/1/1**.
  - erp_j09c2_conc3: A ec=0 (criada), B ec=0 (já existia); cnt **1/1/1/1/1**.
  - segredo nas saidas: senha-teste=0, senha-cluster=0.
- CONTROLE (prova de que a corrida e real e de que a trava e quem converge): mutante `sed "/pg_advisory_xact_lock/d"` em copia `scripts/mut-nolock-bootstrap-platform-admin.ts` DENTRO do container (diff = so l.190 removida; original intacto, md5 a5f5383d...), N=3 (erp_j09c2_nolock1..3): **3/3 colidem** — um lado ec=1 `FALHOU: Invalid tx.tenant.create() ... Unique constraint failed on the fields: (slug)`, o outro ec=0 "criada"; contagens finais 1/1/1/1/1 (o perdedor sofre rollback). Ou seja: o arnes produz sobreposicao real (3/3), e com a trava as duas execucoes CONVERGEM (3/3 ec=0/ec=0) em vez de uma morrer na UNIQUE.
- parcial (parte B): VERDE — 2 execucoes simultaneas -> 1/1/1/1/1 nas 3 rodadas, ambas ec=0.
- OBSERVACAO para o achado A-1 (abaixo, apos medir o T2): o T2.10 do teste -db afirma so `fulfilled.length >= 1`, `tenants=1` e `users=1` (l.645, 654, 655) — exatamente o que o mutante SEM trava entrega (1 fulfilled + contagens 1/1). Medir no T2 mutado antes de concluir.

## Item 2 — parte A: papel NOSUPERUSER NOBYPASSRLS criado por mim: cria e e idempotente (19:12–19:17Z, banco erp_j09c2_rls)
- `CREATE ROLE j09c2_rt LOGIN PASSWORD '<teste 24 hex>' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT` (cluster descartavel); em erp_j09c2_rls e erp_j09c2_mut: `GRANT CONNECT ON DATABASE`, `GRANT USAGE ON SCHEMA public`, `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public`, `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public` (mesma forma do createEphemeralRole do arnes, l.337-344). `pg_roles`: j09c2_rt super=f bypassrls=f createrole=f createdb=f inherit=f; conectado como ele: `postura j09c2_rt super=false bypassrls=false`. Nao e dono de tabela nenhuma (dono = postgres).
- Politicas medidas (`pg_policies`): users/user_role_assignments/local_auth_credentials/audit_logs `*_tenant_isolation` ALL, qual = check = `(tenant_id)::text = current_setting('app.current_tenant_id', true)`.
- `DATABASE_URL=postgresql://j09c2_rt:<teste>@j09c2-pg/erp_j09c2_rls npx tsx scripts/bootstrap-platform-admin.ts` (OBJETO):
  - 1a -> ec=0 "criada · usuário criado · vínculo super_admin criado · credencial criada · CONVERGIDO"; leitura pelo superusuario: cnt **1/1/1/1/1**, vinculo super_admin/global=true, md5(hash)=a8d812365dd0552c7f5cb2671aca95b5; fp 8703e299..., tup +5.
  - 2a -> ec=0 "já existia ... senha mantida · CONVERGIDO"; cnt **1/1/1/1/1**, md5(hash) **igual**, fp identico, tup +0.
  - --dry-run -> ec=0 "simulação encerrada"; fp identico, tup +0.
  - O mesmo papel, SEM GUC, enxerga: users=0 cred=0 ura=0 audit=0 tenants=1 (o RLS morde; tenants sem RLS).
  - segredo nas saidas: senha-teste=0, senha do papel=0, senha-cluster=0, 'postgres'=0.
- parcial (parte A): VERDE — sob NOSUPERUSER NOBYPASSRLS o script cria (1/1/1/1/1) e e idempotente (hash igual, 0 escritas na 2a).

## Item 2 — parte B: mutacao `sed '/setTenantRlsContext(tx, tenant.id)/d'` (19:17–19:20Z)
- mutante em copia `scripts/mut-norls-bootstrap-platform-admin.ts` DENTRO do container (diff = so l.233 `await setTenantRlsContext(tx, tenant.id);` removida; original md5 a5f5383d... intacto).
- sob j09c2_rt (NOSUPERUSER NOBYPASSRLS), banco limpo erp_j09c2_mut: **ec=1**, `[bootstrap-platform-admin] FALHOU: new row violates row-level security policy for table "users"` (RLS, SQLSTATE 42501). Depois, leitura pelo superusuario: cnt 0/0/0/0/0, totais tenants=0 users=0 ura=0 cred=0 audit=0; fp ef5aad87... IDENTICO ao pre (o `tenants` inserido antes na mesma transacao foi desfeito: n_tup_ins=1 contado e 0 tupla viva) -> **ROLLBACK TOTAL**.
- sob SUPERUSUARIO, banco limpo erp_j09c2_mutsu, o MESMO mutante: **ec=0**, "criada · criado · criado · criada · CONVERGIDO", cnt 1/1/1/1/1 -> **VERDE-CEGO confirmado**: sob superusuario a remocao do contexto de RLS passa despercebida; so o papel NOBYPASSRLS a pega.
- segredo nas saidas: 0 em todas as classes.
- parcial (parte B): VERDE — a mutacao falha por RLS com rollback total sob o papel; passa verde sob superusuario (o verde-cego que o plano declara).

## R-3/R-6 — teste -db no OBJETO, container Linux proprio (19:20–19:23Z)
- `docker exec -e DATABASE_URL=<j09c2-pg su>/erp_j09c2 -e REDIS_URL=redis://j09c2-redis:6379 -e CORE_SAAS_PERSISTENCE=memory j09c2-node sh -c 'cd /work && node --test --import tsx --test-reporter=tap tests/san3-09-bootstrap-platform-admin-db.test.ts'` (md5 no container: script a5f5383d..., teste e90a9bc4... = blob).
- saida: **t_ec=0**, `# tests 11 · pass 11 · fail 0 · cancelled 0 · skipped 0` (T2 externo + T2.1..T2.10 ok). SO/forma: Linux (node:20-bookworm-slim) com npm ci proprio.
- Leitura de A11/A18 do plano (§7 l.492, l.499) x T2.4/T2.10 (teste l.232-250, l.594-664): A18 exige "as duas resolvem (nenhuma rejeita) e 1/1/1/1/1; 3 rodadas" PORQUE a remocao da trava deixa as contagens 1/1/1/1/1; o T2.10 entregue afirma `fulfilled.length >= 1` (l.645), so tenants=1 e users=1 (l.654-655), 1 rodada. A11 exige dry-run "em estado limpo ... 0 linhas; com tudo existente, idem"; o T2.4 entregue so exercita o estado CONVERGIDO (l.238) apesar do nome "em estado limpo (novo tenant) e em estado convergido", e so conta tenants/users/audit. -> medir os mutantes declarados no T2 antes de classificar.

## Item 2 — parte C: o vermelho-controle M10 da junta no T2 (sed no script + T2.7, plano §8 l.559) (19:23–19:26Z)
- no container: `cp scripts/bootstrap-platform-admin.ts /tmp/orig-bootstrap.ts` (md5 a5f5383d...); `sed -i "/setTenantRlsContext(tx, tenant.id)/d"` -> diff so l.233, md5 f129738a...; T2 completo.
- saida: t_ec=1, `# tests 11 · pass 9 · fail 2`: **not ok 7 - T2.7** (erro `new row violates row-level security policy for table "users"`) e o externo; T2.1–T2.6, T2.8, T2.9, T2.10 **ok** sob a mesma mutacao (rodam sob superusuario/conexao administrativa ou papel efemero ja com o admin criado -> o verde-cego aparece tambem dentro do teste: so o T2.7 pega).
- restauro: `cp /tmp/orig-bootstrap.ts scripts/...` -> md5 a5f5383dfbbabde9a63205bd40f64782 (= blob).
- parcial (parte C): VERDE — o T2.7 morre pela mutacao M10, por RLS.

## Achado A-1 — medicao: o mutante declarado do A18 (sem trava) no T2 (19:26–19:33Z)
- no container: `sed -i "/pg_advisory_xact_lock/d" scripts/bootstrap-platform-admin.ts` -> diff so l.190, md5 ad3dcde9...; T2 completo 3 rodadas.
- saida: rodada 1 t_ec=0 pass 11 fail 0; rodada 2 t_ec=0 pass 11 fail 0; rodada 3 t_ec=0 pass 11 fail 0 — `ok 10 - T2.10 duas chamadas simultâneas → 1/1/1/1/1 (trava própria)` nas 3. **O mutante que o plano declara para o A18 SOBREVIVE 3/3 no T2.10.** (No meu arnes de processos separados o mesmo mutante colide 3/3 na UNIQUE slug com um lado ec=1 — parte B do item 1; o T2.10 tolera isso por construcao: `fulfilled.length >= 1`.)
- restauro: md5 a5f5383dfbbabde9a63205bd40f64782.

## Achado A-2 — medicao: mutante "escrever no dry-run" (A11) no T2 (19:33–19:37Z)
- no container: `sed -i "s/if (dryRun) {/if (false \&\& dryRun) {/"` -> diff l.212 e l.257 (os dois retornos antecipados do dry-run), md5 b22b81aa...; T2 completo -> **t_ec=0, pass 11 fail 0, `ok 4 - T2.4 --dry-run em estado limpo (novo tenant) e em estado convergido: 0 escritas`**.
- prova de que o mutante NAO e equivalente: o mesmo script mutado, `--dry-run` como superusuario no banco limpo erp_j09c2_mut -> ec=0 e imprime "simulação encerrada — nada foi escrito no banco.", mas depois: tenants_platform=1 users=1 (ura=0 cred=0 audit=0) — **o dry-run escreveu 2 linhas dizendo que nao escreveu, e o T2.4 ficou verde**.
- restauro: md5 a5f5383dfbbabde9a63205bd40f64782.
- origem (R-5): `git cat-file -e 8ee10bd2:tests/san3-09-bootstrap-platform-admin-db.test.ts` -> "exists on disk, but not in '8ee10bd2'"; `git log ba65c03a -- <arquivo>` -> nasce em 9890fc06 (2026-10-01T22:00:08Z, "test(bootstrap): E3 ..."), commit do ramo deste bloco -> A-1, A-2 e A-3 sao **dentro-do-bloco**.

## R-3 — o teste -db no WINDOWS, medicao propria (19:37–19:45Z)
- `npm ci --no-audit --no-fund` em C:/Users/AMP/w-j09c2 -> ec=0, "added 326 packages"; `cmd /c "dir /AL /S /B node_modules" | wc -l` -> 0 (sem junction/symlink); `DATABASE_URL=<127.0.0.1:55721> npx prisma generate` (variavel so no comando) -> ec=0.
- `node_modules/.bin/prisma` no Windows = shim `#!/bin/sh` (`basedir=$(dirname ...)`), ao lado de `prisma.cmd` e `prisma.ps1`.
- `DATABASE_URL=<127.0.0.1:55721/erp_j09c2> REDIS_URL=redis://127.0.0.1:55722 CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/san3-09-bootstrap-platform-admin-db.test.ts` -> **t_ec=1**, `# tests 2 · pass 0 · fail 2`: `not ok 1 - T2.1` com `basedir=$(dirname ...)` / `SyntaxError: missing ) after argument list` (o teste executa o shim sh com `node --import tsx/esm`, l.75-77, 352-354, 515-517, 603-605), e o externo com `db:provision-rbac falhou: stdout: null stderr: null` (fallback `spawnSync("npm", ...)` sem shell, l.121; tambem l.359, 522, 610 incondicionais). `node -e "spawnSync('npm',['--version'])"` no Windows -> status=null error=ENOENT. Teardown do teste derrubou o drill (`pg_database LIKE 'erp_san3_09_drill_%'` = 0). Senha do cluster no log = 0.
- Linux (container proprio, acima): 11/11. CI ubuntu-latest (`.github/workflows/ci.yml` runs-on: ubuntu-latest em todos os jobs): verde no objeto (14/14).
- origem/classe (R-5): `git grep -n -E '"\.bin", "prisma"|\.bin/prisma'` e `git grep -n 'spawnSync("npm"'` em tests/ no objeto -> SO este arquivo (4 + 4 ocorrencias); nenhum outro `*-db.test.ts` faz spawn de migrate/npm; precedente de portabilidade na casa: `tests/o6r06-billing-census.test.ts:261` `shell: process.platform === "win32"`. Arquivo nasce em 9890fc06 (2026-10-01, ramo deste bloco) -> **dentro-do-bloco**.
- classificacao: falha ALTO (nao e verde falso): no Windows o teste fica vermelho, nunca verde. Nao toca a propriedade testada nem o gate (CI Linux executa e passa). Efeito: a linha `DATABASE_URL=<descartável> npm test` da bateria §8 nao fica verde nesta maquina Windows (o dev de KPI e o inspetor precisaram de container Linux) e o erro exibido (SyntaxError do shim) nao diz a causa. -> **ajuste, dentro-do-bloco** (achado A-3).

## Notas de dominio (banco) sem gravidade de bloqueio
- chaves de advisory lock distintas: bootstrap 20260909 x provision-rbac 20260863 x arnes 20268801 (`git grep pg_advisory` em src/scripts/prisma); financial-period-lock usa `hashtext()` (int4) — colisao teorica com 20260909 so serializaria, sem efeito de dado. nota.
- isolamento por tenant_id (criterio do corpo que cabe no objeto): todas as linhas criadas carregam o tenant_id da organizacao "platform" (contagens escopadas = totais em todas as rodadas); o vinculo aponta para papel GLOBAL (tenant_id NULL); o mesmo papel NOBYPASSRLS sem GUC ve 0 linhas da organizacao; nenhuma leitura/escrita de outra organizacao no script (le so `roles` com tenant_id NULL e `tenants.slug='platform'`).

## Achado A-1 — motivo medido: o desenho do T2.10 colide, a assercao tolera (19:45–19:50Z)
- sonda propria `scripts/zz-c2-probe.ts` (so no container) replicando o desenho do T2.10: mesmo processo, dois PrismaClient, `Promise.allSettled` de `bootstrapPlatformAdmin`, mesmo e-mail; bancos limpos clonados (erp_j09c2_p1..p3, q1..q3; o clone-mae erp_j09c2_mut foi limpo das 2 linhas que o mutante de dry-run escreveu, DELETE 1 + DELETE 1, cnt 0 conferido).
- MUTANTE sem trava (copia mut-nolock2, original md5 a5f5383d... intacto), N=3: p1 `A=fulfilled B=rejected(Unique constraint failed on the fields: (slug))`; p2 idem; p3 `A=rejected(... slug) B=fulfilled` — contagens finais 1/1/1/1/1 nas 3.
- OBJETO com trava, N=3: q1/q2/q3 `A=fulfilled B=fulfilled`, 1/1/1/1/1.
- conclusao de medicao: o desenho em processo do T2.10 PRODUZ a corrida (3/3 colidem sem a trava); o mutante sobrevive porque a assercao `fulfilled.length >= 1` (l.645) aceita a rejeicao e as contagens checadas (tenants, users; l.654-655) ficam 1 mesmo assim — exatamente o caso que o A18 do plano (l.499) descreve como motivo para exigir "as duas resolvem" e 3 rodadas.

## CLASSIFICACAO DOS ACHADOS (19:50Z)
- **A-1 — bloqueia · dentro-do-bloco.** Defeito: dois testes do bloco nao implementam o criterio de aceite que o plano lhes atribui, e o mutante declarado no proprio plano sobrevive ao teste:
  (a) T2.4 x A11 (plano l.492; §8 l.541 "em estado limpo e em estado convergido"): o T2.4 so exercita o estado convergido (l.238) apesar do nome "em estado limpo (novo tenant) e em estado convergido: 0 escritas"; o mutante "escrever no dry-run" (`if (dryRun)` -> `if (false && dryRun)`, l.212/257) deixa o T2 11/11 verde, e esse mesmo mutante, em `--dry-run` num banco limpo, grava organizacao + usuario (tenants=1 users=1) imprimindo "nada foi escrito no banco".
  (b) T2.10 x A18 (plano l.499): o criterio exige "as duas resolvem (nenhuma rejeita) e 1/1/1/1/1; 3 rodadas"; o T2.10 afirma `fulfilled.length >= 1`, conta 2 das 5 tabelas, 1 rodada; o mutante "remover o pg_advisory_xact_lock" deixa o T2 11/11 verde em 3/3 rodadas, embora colida 3/3 (sonda em processo e arnes de processos).
  Motivo da gravidade: sao as propriedades do meu item 1 (dry-run com zero escrita; concorrencia convergente) e o plano as escreveu com a mutacao que deve avermelhar o teste (§7: "cada um com a MUTAÇÃO que o deixa vermelho"); o que o bloco entrega como guarda delas nao as guarda, e os nomes dos testes afirmam a cobertura que nao executam. O caso (a) e o caminho de producao do Runbook B: o 1o bootstrap acontece numa base limpa e o runbook manda o `--dry-run` primeiro — e o estado que o T2.4 nao exercita. O comportamento ATUAL do script esta correto (itens 1-3 verdes por medicao direta); o defeito e do entregavel de teste. Escopo: o arquivo nasce neste bloco (9890fc06, 2026-10-01; ausente em 8ee10bd2).
- **A-3 — ajuste · dentro-do-bloco.** (R-3) O teste -db so executa em Linux; no Windows falha alto em T2.1 (shim sh executado por `node --import tsx/esm`; `spawnSync("npm")` sem shell -> ENOENT). Sem verde falso; gate CI Linux executa e passa. Medicao e origem acima.
- **N-1 — nota.** Colisao teorica de chave de advisory lock com `hashtext()` do financial-period-lock: so serializaria.
- **R-1 aplicada:** criterios gerais do corpo (migration up/down, PITR, pg_dump, restore) NAO se aplicam (diff sem prisma/migrations/infra/backup). Nao registro nota pre-existente sobre eles: o objeto nao toca backup nem esquema, logo nao ha o que medir neles neste bloco.

## Reconferencia do objeto antes do voto (19:52Z)
- `git fetch origin; git rev-parse origin/feat/bootstrap-platform-admin` = `gh pr view 400 --json headRefOid` = ba65c03a4c3edc0723633b0f1330f34852a60e6f (objeto estavel durante toda a medicao).

## VOTO gravado em C2-voto.json antes da limpeza: **REPROVADO** (A-1 bloqueia, dentro-do-bloco). Itens 1, 2 e 3 VERDES por medicao direta.

## LIMPEZA (2026-10-04T19:21:24Z)
- `docker volume ls -f dangling=true -q | wc -l` = 12 antes (com os meus containers vivos, os volumes anonimos deles nao contavam como orfaos) e 12 depois de `docker rm -f -v j09c2-node j09c2-pg j09c2-redis` -> os 2 volumes anonimos meus foram removidos junto (senao seriam 14). O inspetor contou 10 as 17:44Z; os +2 nao sao meus (existiam antes da minha remocao), nao atribuiveis, nao tocados.
- `docker network rm j09c2-net`; containers j09c2 restantes = 0; redes j09c2 restantes = 0; portas 55721/55722 em escuta = 0. Imagem node:20-bookworm-slim NAO removida (compartilhada; remocao e do orquestrador, item 4.2-bis.5 do inspetor).
- Worktree: `git worktree remove --force C:/Users/AMP/w-j09c2` -> ec=0; `ls -d` -> nao existe; `git worktree list | grep -ic w-j09c2` -> 0. RESSALVA DE PROCEDIMENTO: a contagem de processos ANTES da remocao falhou (`powershell` fora do PATH do Git Bash) — todos os meus comandos tinham sido em primeiro plano com timeout e ja tinham terminado; a contagem DEPOIS, pelo caminho completo do powershell.exe (`Get-CimInstance Win32_Process` filtrando CommandLine por 'j09c2'), deu **0**.
- Scratchpad: 13 temporarios j09c2-* (senhas de teste do cluster/papel/admin, logs, SQL, sondas) apagados -> 0.
- Base viva erp-postgres / erp-redis: Up 7 days (healthy), nunca alvo. Frentes alheias (w-e5, w-pl11c3, w-s05d, container san3-05-s2-pg) nao tocadas. Nada escrito no repositorio alem deste arquivo e do C2-voto.json; nao commitei.
- Disco ao fim: 8,9 GB livres.
