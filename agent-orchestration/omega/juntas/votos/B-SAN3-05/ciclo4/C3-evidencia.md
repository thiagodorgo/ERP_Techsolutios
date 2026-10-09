papel: C3 | identidade: jurado-san305-c4-boot-e-suite | modelo: Claude Opus 5.5 (claude-opus-5-5) (substituição §C7.6-bis: D-FABLE-ASTRA-SO-DINHEIRO — o bloco não toca dinheiro; Fable não rodou por decisão do dono de 2026-10-08) | mandato_md5: 833b319da996789e790aa2428f55733d (declarado no disparo: 833b319da996789e790aa2428f55733d) | corpo_md5: 093e4690131a30b24c3e30ec2751252a .claude / 2c86c959e3f7bb4ed365a36dd3b1cc13 .agents (recebido no prompt: n/a — lido do blob 84831ad9 por git show; publicado no disparo 093e4690131a30b24c3e30ec2751252a)

# Evidência — Cadeira C3 da junta 4 do B-SAN3-05 (PR 405, ciclo 4) — boot de produção, suíte inteira, texto da regra

- Aberto: 2026-10-09T20:35:58Z (`date -u`)
- Objeto: `84831ad9796d8db29766b0ff6e0a1a894a9d45e7` (`git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` = `gh pr view 405 headRefOid`; OPEN, rascunho, CONFLICTING)
- `origin/main` no início: `a9bbde382213627545e9d229c9ab616d83a0a840` (fetch 20:36Z)
- Head do disparo do dev: `7c63f920c996cf105535f345eec2ee10461c77a3` (fonte: `ciclo4/DEV-relatorio.md` l.7 no blob do objeto; `git log --oneline 37c83064..84831ad9` mostra 7c63f920 como 1º commit do ciclo 4)
- Cerca do mandato: `2400049bf8ec421c3f65a07884c6394d4ab208bc`
- Host: `MINGW64_NT-10.0-22631 N3SOH82 3.6.6 x86_64 Msys` (Git Bash); Docker servidor 29.6.1 linux/amd64
- Disco `df -h /c` no início: 13 GB livres (95% usado)
- Ambiente do condutor: Git Bash, cwd variável por comando com caminho absoluto; nenhuma variável exportada; `MSYS_NO_PATHCONV` nunca exportada.
- `$SCRATCH` = `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c3`
- Outra cadeira viva no início (`docker ps`): `j05c4-c2-b7-pg`, `j05c4-c2-node`, `j05c4-c2-pg`, rede `j05c4-c2-net` — não são minhas, nunca tocadas. `erp-postgres`/`erp-redis` (Exited) e `erp-postgres-alt` (Exited) nunca alvo.

## 0. Legalidade (20:36–20:38Z)

- `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` → `84831ad9796d8db29766b0ff6e0a1a894a9d45e7`; `gh pr view 405 --json headRefOid,baseRefName,state,isDraft,mergeable` → `{"baseRefName":"main","headRefOid":"84831ad9796d8db29766b0ff6e0a1a894a9d45e7","isDraft":true,"mergeable":"CONFLICTING","state":"OPEN"}` → coincidem.
- `git diff --name-only 2400049b 84831ad9` → 6 arquivos, todos em `agent-orchestration/omega/juntas/votos/B-SAN3-05/` (`00-mandatos/C1c4.md`, `C2c4.md`, `C3c4.md`, `ciclo4/00-inspetor-terreno.md`, `ciclo4/C1-evidencia.md`, `ciclo4/C1-voto.json`) → delta = **só registro**. Nota de independência: o `git log --oneline 2400049b..84831ad9` que prova a delta mostra o assunto do commit 84831ad9 (que menciona o voto da C1); **não abri, não li e não citarei** nenhum `ciclo4/C1-*` nem `ciclo4/C2-*`.
- Parecer do inspetor da junta 4: `ciclo4/00-inspetor-terreno.md` no blob do objeto (129 linhas) → `LIBERADO COM RESSALVA` (R1–R4), fechado 19:28Z, objeto `2400049b`; tabela da cadeira C3 = `jurado-san305-c4-boot-e-suite`, corpo `093e4690131a30b24c3e30ec2751252a` rastreado (`.agents` `2c86c959…`), worktree `C:/Users/AMP/w-j05c4c3` (livre), containers `j05c4-c3-*` sem porta. R4: objeto que andar → publicar `git diff --name-only 2400049b <objeto>` (só registro, feito acima) e começar só com check-runs concluídos.
- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/84831ad9…/check-runs?per_page=100` → total 7 | não-verdes 0 | pendentes 0 (filtro: não-verde = `completed` com conclusão ∉ {success, skipped, neutral}; pendente = status ≠ completed). `backend` completed/success 20:24:13Z; `backend-postgres` completed/success 20:20:26Z; docker, owner-portal, frontend, flutter, authority-portal success.
- Corpo: `git ls-tree 84831ad9` → `.claude/…/jurado-san305-c4-boot-e-suite.md` blob `aed23254…` e `.agents/…` blob `33e46d03…` (os dois espelhos rastreados). md5 EOL-neutro `.claude` = `093e4690131a30b24c3e30ec2751252a` (= publicado); `.agents` = `2c86c959e3f7bb4ed365a36dd3b1cc13` (= o do inspetor).
- Mandato: `tr -d '\r' < 00-mandatos/C3c4.md | md5sum` = `833b319da996789e790aa2428f55733d` = declarado no disparo.
- Obituário no objeto: `grep -ciE 'san305|SAN3-05|c4-boot'` = 0 → nome não sepultado nem reservado. Meu nome não está na lista de inelegíveis do corpo.
- Âncoras de norma (`grep -cF`, objeto | origin/main): D-MEDIR-NA-REF-ALVO 1|1 · D-INSPETOR-TERRENO-JUNTA 1|1 · D-JUNTA-ESCOPO-E-CALIBRACAO 1|1 · D-JUNTA-SEPARACAO-DE-PAPEIS 1|1 · "Paradas imediatas irredutíveis" 1|1 · D-FALLBACK-MODELO-FABLE-OPUS 1|1 · D-PAUSA-GRAVA-E-PARA 2|2 · D-GOV-PROPORCIONAL 3|3 · "(1) Junta proporcional ao risco" 1|1 · "(2) Teto de 2 ciclos" 1|1 · "(5) KPI congelado" 1|1 · "Junction/symlink de `node_modules` entre worktrees é" 1|1 · "Fontes de verdade" 1|1 · "Regra de conflito" 1|1. `git diff --stat origin/main 84831ad9 -- CLAUDE.md AGENTS.md` = vazio (contrato idêntico nas duas refs). Controle: âncora com escape literal `Limpeza pós-validação e \*\*pós-merge\*\*` → 0|0 (o leitor acusa ausência).
- `decisoes.md` (objeto | main): D-FABLE-ASTRA-SO-DINHEIRO 2|1 · D-405-PROIBIR-VIEWS 1|0 · "R3, mutação cega" 1|0 · "R4, …" 1|0 → existem **só no objeto**; aplico a ref julgada (§A7). D-405-PROIBIR-VIEWS no objeto l.3013.
- Erratas ao D4 no plano do objeto: l.1676 (errata 1), l.1687 (errata 2, dono), l.1697 (errata 3, dono). Campos onde nome de papel é permitido: `session_user`, `current_user`, `escapes[].rolname`, mensagem de recusa `via:rolname`, `error.sessionUser`, `error.currentUser`.
- Quórum que vale: unanimidade de 3 com veto; ciclo 4 — só defeito GRAVE de produto reprova, leitura R3/R4 (objeto).
- Veredito parcial: **LEGAL** — objeto resolvido, check-runs 7/7 concluídos e verdes, delta só registro, inspetor LIBEROU COM RESSALVA com este nome/corpo/worktree/prefixo.

## Terreno (20:40Z–)

- Worktree: `git -C C:/Users/AMP/w-o05 worktree add --detach C:/Users/AMP/w-j05c4c3 84831ad9…` → ec=0; `test -e C:/Users/AMP/w-j05c4c3/.git` ok; `rev-parse HEAD` = `84831ad9…`; `git status --short | wc -l` = 0. Só serve ao git (archive, show, diff): `node_modules` vive só dentro do container (`npm ci` próprio no container; nenhum `npm ci` nem junction no Windows — o corpo manda rodar tudo em Linux).
- Receita copiada e adaptada: `$SCRATCH/condutor-setup.sh` md5 `4a7a9ede8eb9a8a3da0506ad3167a2d7` (receita original `C:/Users/AMP/erp-terreno/receita-pg16.sh` md5 `9861a2aaa55fc49fcf1c4263261a3668`; `diff | wc -l` = 242 linhas). Mudanças: prefixo fixo `j05c4-c3-` (rede/pg/node/redis); árvore temporária `/c/Users/AMP/t-j05c4c3-<rand>` com a remoção casando o MESMO prefixo (`case … /c/Users/AMP/t-j05c4c3-*`); `REPO` = meu worktree; `redis:7` próprio sem porta; **sem** `trap EXIT` de derrubada (containers de pé entre boots/testes/suíte; teardown pelo nome no fim); senha do postgres aleatória (48 hex), só por `export` em subshell e `-e NOME` sem valor; `TESTS`/`SAMPLE`/sonda de argv da receita não usados no setup.

## Item 1 — boot real de produção (T9/T15)

### 1(a) call-site sem diff (~20:39Z; gravado ~20:42Z)
- `git diff 7c63f920..84831ad9 -- src/server.ts src/database/runtime-role.bootstrap.ts src/config/env.ts | wc -l` → **0** (vazio). Irmão não-vazio: `-- src/database/runtime-role.ts` → 25 linhas (9+/16-). Ciclo em src/tests/scripts/docs: `docs/deployment.md` 20, `scripts/db-runtime-role.sh` 32, `src/database/runtime-role.ts` 25, `tests/db-catalog-write-guard.test.ts` 4, `tests/san3-05-runtime-role-guard-db.test.ts` 417.
- Leitura no blob do objeto: `src/server.ts:17` `await assertRuntimeDatabaseRoleIfEnforced({ logger });` — 1ª instrução de `main()`, antes de `createCoreSaasService` (l.18), `startJobWorkerIfEnabled` (l.21) e `listen`; `src/server.ts:47-49` `main().catch` → `logger.error({ error }, "Failed to start ERP Techsolutions API"); process.exitCode = 1`. `src/database/runtime-role.bootstrap.ts:116` `enforce = options.enforce ?? env.DATABASE_RUNTIME_ROLE_GUARD === "enforce"`; l.158-166 escapes>0 → `logger.error(... describeEscapes)` + `$disconnect` + `throw new RuntimeRoleGuardError`. `src/config/env.ts:657-658` `DATABASE_RUNTIME_ROLE_GUARD: parsedEnv.DATABASE_RUNTIME_ROLE_GUARD ?? (NODE_ENV === "production" ? "enforce" : "skip")`; l.562-567 `skip` em produção → erro de validação.
- Veredito parcial: call-site e resolução da variável **inalterados** no ciclo; sem a variável em produção resolve `enforce` (por leitura; o boot sem a variável mede por execução em 1(b)).

### 1(d) parte 1 — T5/T6/T9 e T15 byte a byte no ciclo (~20:40Z; gravado ~20:42Z)
- Extração por `awk` dos blocos, EOL-neutro (`git show <ref>:tests/san3-05-runtime-role-guard-db.test.ts | tr -d '\r'`): T5/T6/T9 69 linhas md5 `ce4438ef7f825e69b1beadf330dbc6fb` em 7c63f920 **e** em 84831ad9 (`diff` ec=0); T15 75 linhas md5 `41b09235ea04550b2f57fe58d7f977a6` nos dois (`diff` ec=0). Funções D4 (`connectionParts`…`assertConnectionLogsSafe`, 121 linhas) `diff` ec=0; `startBackend`…`PROD_BASE` (50 linhas) `diff` ec=0.
- Controle do extrator: o bloco T8c ("três"→"dois semi-mutantes") extraído do mesmo jeito → `diff` ec=**1** (o extrator acusa mudança).
- Veredito parcial: T5/T6/T9 e T15 **não mudaram** no ciclo (C4.4 os quer byte a byte). O `ok` deles mede-se por execução (1(d) parte 2).

### Terreno — resultado do setup (20:41–20:43Z)
- `timeout 2400 bash $SCRATCH/condutor-setup.sh` → ec=0. Log (`$SCRATCH/setup/setup.log`, resumo): imagem `erp-junta-node20-pg16:local` sha256:4203157f95ea; `postgres:16` 16.14; `redis:7` sha256:b2b95679e3b4 (imagem já local, sem pull).
- Containers: `j05c4-c3-pg`, `j05c4-c3-redis`, `j05c4-c3-node` na rede `j05c4-c3-net`; `docker inspect -f '{{json .HostConfig.PortBindings}}'` = `{}` nos três (**sem porta publicada no host**; `docker ps` mostra só as portas expostas internas 5432/tcp e 6379/tcp).
- Árvore: `git -c core.autocrlf=false archive 84831ad9` → blobs_no_objeto=3776, extraidos_byte_identicos=3776 (`git hash-object --no-filters` × `ls-tree`); no container `md5sum -c` de 3776 arquivos → 0 divergência; árvore temporária `/c/Users/AMP/t-j05c4c3-42422a` removida.
- Container: `Linux … 6.18.33.2-microsoft-standard-WSL2 x86_64`; node v20.20.2; npm 10.8.2; psql 16.14; typescript Version 5.9.3.
- `npm ci` ec=0 (326 pacotes) · `prisma generate` ec=0 · `prisma migrate deploy` ec=0 (107 migrations) — tudo dentro do container, `DATABASE_URL` só no ambiente do container.
- Catálogo pós-migração (public): tabelas 115 | FORCE 106 | views 0 | matviews 0. Redis `PONG`.
- Disco `df -h /c` depois do npm ci: 12 GB livres.
- Veredito parcial: terreno próprio de pé, árvore = blob, base viva intocada.

### 1(b) os dois lados, mesmo terreno, mesmo papel (papel 20:44:58Z · b1 20:45:11Z · view 20:46:49Z · b2 20:47:09Z · b3 20:47:11Z; gravado ~20:47Z)
Sondas (texto em `$SCRATCH`, copiadas para `/tmp/zz-j05c4c3-*` no container): `zz-j05c4c3-boot.mjs` md5 `41ff0f334de177a39d071aafa5430ea5` (60 linhas; extrai `PROD_BASE` do blob por regex `^const PROD_BASE = (\{…\n\}) as const;$` — não redigitado; `spawn(process.execPath, ["--import","tsx","src/server.ts"], {cwd:"/work"})` como o `startBackend` do T15; env = `{...process.env, ...PROD_BASE, DATABASE_URL:<papel limpo>, PORT, PORTAL_PORT}` com `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE` do container removidos; `REDIS_URL` = o inalcançável do PROD_BASE `redis://192.0.2.1:6379`; `close` lido do evento; teto 60 s; aceito → espera "verified" + 5 s e SIGTERM, SIGKILL após 3 s); `zz-j05c4c3-vivos.sh` md5 `d345f8bb3c206922db57b4c29350bc07` (conta `node … src/server.ts` em `/proc`, exclui `sh -c`; controle positivo com um `node -e … src/server.ts` falso vivo → `vivos_src_server=1`; sem ele → 0); `zz-j05c4c3-probe.mts` md5 `d310efdc11ae1034a97b3cff67e2a489` (importa `/work/src/database/runtime-role.ts` do objeto; `probeRuntimeRolePosture` + `assertRuntimeRolePosture` como o papel limpo); `zz-j05c4c3-view-up.sql` md5 `db3419ac63e5e50ec965e4eff23a1ab6`.

1. **Papel limpo pelo caminho do operador:** `md5sum scripts/db-runtime-role.sh` no container `5cab4f63b1259450acf68675205d5908` = blob (`git show 84831ad9:scripts/db-runtime-role.sh | md5sum`). `DB_RUNTIME_ROLE=zz_j05c4c3_app DB_RUNTIME_PASSWORD="$(cat /tmp/zz-j05c4c3-app.pw)" timeout 120 bash scripts/db-runtime-role.sh` (senha 48 hex aleatória gerada no container, só por ambiente) → **ec=0**; linha final `zz_j05c4c3_app|f|f|f|f|0|0|115` (super f, bypassrls f, replication f, escapa f, posse 0, **views 0**, dml 115). URL do papel: `postgresql://zz_j05c4c3_app:<48 chars>@j05c4-c3-pg:5432/erp_techsolutions?schema=public` (arquivo 0600 no container).
2. **b1 — sem view, sem a variável:** `node /tmp/zz-j05c4c3-boot.mjs b1-semview-semvar unset accept` → "runtime database role verified" em **2469 ms**, `"escapes":0`, `session_user`/`current_user` = `zz_j05c4c3_app`; parado por mim (`condutor-SIGTERM`, close_signal SIGTERM, 7496 ms); 3 linhas (2× "Login sem organização INATIVO", nível 50, e o verified); 0 menção a Redis/job worker; `vivos_src_server=0` depois.
3. **A view.** Tabela FORCE escolhida pelo catálogo: `public.tenant_settings` (`relrowsecurity=t`, `relforcerowsecurity=t`, dono `postgres`, política `tenant_settings_tenant_isolation` `tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`, sem trigger). Semeadas 2 organizações (`c3c3c3c3-…0a`/`…0b`) e 1 linha `tenant_settings` de cada (`valor-A`, `valor-B`). Dono comum `zz_j05c4c3_dono` (`NOLOGIN NOSUPERUSER NOBYPASSRLS`: f|f|f); `GRANT CREATE ON SCHEMA public` → `SET ROLE` → `CREATE VIEW public.zz_j05c4c3_v AS SELECT tenant_id, key, value FROM public.tenant_settings` → `RESET ROLE` → `REVOKE CREATE`. Âncora: `relowner` = `zz_j05c4c3_dono`, `relacl` = `<null>` (só o dono); `has_table_privilege(app, view, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')` = f; `has_any_column_privilege(app, view, …)` = f; grants na view além do dono = 0; grants de coluna = 0; views não-sistema no banco = 1. O papel limpo lendo a view: `ERROR: permission denied for view zz_j05c4c3_v`.
4. **b2 — com view, `DATABASE_RUNTIME_ROLE_GUARD=enforce`:** `close_code` **1** (do evento `close`), sem sinal, **1593 ms**; 1ª falha ("Failed to start ERP Techsolutions API") em 1456 ms, com `RUNTIME_ROLE_CAN_BYPASS_RLS` (`error.code`); linhas antes da falha: 2 ("Login sem organização INATIVO" e "runtime database role can bypass RLS — refusing to start"); **Redis/job worker antes da falha: 0** (e 0 no log todo); a recusa nomeia `escapes[0] = {via:"view", rolname:"zz_j05c4c3_dono", rolsuper:false, rolbypassrls:false, is_self:false, objetos:1}` na linha do bootstrap **e** em `error.escapes` na linha "Failed to start"; `vivos_src_server=0`.
5. **b3 — com view, SEM a variável:** `close_code` **1**, **1500 ms**; 1ª falha em 1339 ms com o código; Redis/job worker antes: 0; mesma `escapes` (`view/zz_j05c4c3_dono/1`); `vivos_src_server=0`.
- Forma do log da recusa (b2, LF, senha mascarada; senha no log = 0 ocorrência em b1/b2/b3, contada no container com a senha lida do arquivo): `{"level":50,…,"guard":"enforce","session_user":"zz_j05c4c3_app","current_user":"zz_j05c4c3_app","escapes":[{"via":"view","rolname":"zz_j05c4c3_dono",…,"objetos":1}],"msg":"runtime database role can bypass RLS — refusing to start"}` e `{"level":50,…,"error":{"code":"RUNTIME_ROLE_CAN_BYPASS_RLS","sessionUser":"zz_j05c4c3_app","currentUser":"zz_j05c4c3_app","escapes":[…view/zz_j05c4c3_dono…],"name":"RuntimeRoleGuardError"},"msg":"Failed to start ERP Techsolutions API"}`. **O `message` do `RuntimeRoleGuardError` (que diz `view:zz_j05c4c3_dono` e o remédio) NÃO está no log**: `Object.keys(error)` = code, sessionUser, currentUser, escapes, name (o pino serializa só as propriedades próprias enumeráveis do `Error` posto na chave `error`). Vai ao item 3 como nota.

### Vermelho-controles do item 1 — (1) e (3) (20:46–20:47Z)
- **(1) a view é vista antes do boot:** `node --import tsx /tmp/zz-j05c4c3-probe.mts` como o papel limpo — **sem view** (antes de criar): `escapes: []`, mensagem null; **com a view:** `escapes: ["view/zz_j05c4c3_dono/1"]` e `assertRuntimeRolePosture` lança `RUNTIME_ROLE_CAN_BYPASS_RLS: … por 1 via(s): view:zz_j05c4c3_dono. Use um papel NOSUPERUSER NOBYPASSRLS sem posse de tabela FORCE e nenhuma view/matview sobre tabela FORCE (scripts/db-runtime-role.sh; docs/deployment.md).` → acusou.
- **(3) o papel limpo é o que diz ser:** como `zz_j05c4c3_app` (psql, senha por ambiente): `current_user|session_user|rolsuper|rolbypassrls|rolreplication` = `zz_j05c4c3_app|zz_j05c4c3_app|f|f|f`; `count(*) FROM tenant_settings` **sem GUC = 0**; com `set_config('app.current_tenant_id', A)` = 1 (`valor-A`, só a própria organização); superusuário vê 2. → acusou (o leitor vê linha quando deve e 0 quando deve).
- Veredito parcial (b1–b3 + controles 1/3): **o processo de produção recusa com a view de dono comum sem grant — código 1, ~1,5 s, com e sem a variável, antes de Redis/job worker, nomeando a via `view` e o dono — e aceita o mesmo papel sem ela.** Falta: b4 (sem a view de novo), guarda D4 em cada log e controle (2), T5/T6/T9/T15 por execução.

### 1(b) passo 4 — sem a view de novo, e um boot adicional que serve (MODO 6 com view 20:48:08Z · b4 20:48:28Z · b5 20:49:09Z · MODO 6 sem view 20:49:18Z)
- Captura do MODO 6 COM a view (insumo do item 3; feita antes de derrubar): `DB_RUNTIME_ROLE=zz_j05c4c3_novo DB_RUNTIME_PASSWORD="$(cat …novo.pw)" timeout 120 bash scripts/db-runtime-role.sh` → **ec=3**; stdout vazio; stderr: `ERROR:  papel zz_j05c4c3_novo ainda escapa de RLS por 1 via(s): view:zz_j05c4c3_v. posse → ALTER TABLE ... OWNER TO postgres e rode de novo (MODO 3); view → nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma e rode de novo (MODO 6)` + `CONTEXT: PL/pgSQL function inline_code_block line 68 at RAISE`; senha no stderr 0; `pg_roles` com `zz_j05c4c3_novo` = 0 (ROLLBACK).
- `DROP VIEW public.zz_j05c4c3_v; DROP ROLE zz_j05c4c3_dono` → ec=0; views não-sistema = 0; dono = 0.
- Controle (1), lado sem view (depois): `probe.mts` → `escapes: []`, mensagem null.
- **b4 — sem a view de novo, sem a variável, mesmo papel `zz_j05c4c3_app`:** "runtime database role verified" em **1317 ms**, `"escapes":0`; 5 s depois o processo segue para o Redis do PROD_BASE (`redis://192.0.2.1:6379`, inalcançável por desenho do T15) e registra `{"error":{"name":"RedisCommandError"},"msg":"Failed to start ERP Techsolutions API"}` (a 6360 ms, junto do meu SIGTERM a ~6317 ms; close por SIGTERM, 6374 ms). Leitura: a trava ACEITOU (é o critério de aceite do T15: "verified" + `"escapes":0`); a falha seguinte é do Redis inalcançável do ambiente de teste e vem DEPOIS da trava — mostra a ordem trava → Redis. `vivos_src_server=0`.
- **b5 (adicional, declarado) — sem view, sem variável, mesmo papel, Redis PRÓPRIO alcançável:** cópia `zz-j05c4c3-boot-redis.mjs` md5 `ccdc86deb3255b38c6d0a8ea179a9440` = `boot.mjs` + 1 linha (`diff`: `15a16 > if (process.env.ZZ_REDIS_URL) env.REDIS_URL = process.env.ZZ_REDIS_URL;`), `-e ZZ_REDIS_URL=redis://j05c4-c3-redis:6379` → "runtime database role verified" (1741 ms, `"escapes":0`) → "In-process job worker started (JOBS_WORKER_ENABLED)." → "**ERP Techsolutions API listening**" → "ERP Techsolutions owner-portal (public BFF) listening"; parado por mim (SIGTERM, 6779 ms); `vivos_src_server=0`. Prova que, num banco sem view, o processo de produção com o papel limpo do script **sobe e serve** — a premissa do dono "hoje há 0 views; nenhuma funcionalidade quebra" **não** foi falsificada no boot.
- Controle (2) do item 3 (mesma execução sem view): `DB_RUNTIME_ROLE=zz_j05c4c3_novo … bash scripts/db-runtime-role.sh` → **ec=0**, linha final `zz_j05c4c3_novo|f|f|f|f|0|0|115`; `grep -c "MODO 6"` no stderr = **0**; senha no stderr 0.
- Veredito parcial (1(b)): **dois lados medidos no mesmo terreno com o mesmo papel** — sem view aceita (b1, b4, b5: verified, escapes 0; b5 serve), com view recusa (b2 enforce, b3 sem variável: código 1). A recusa é da view (o papel e o terreno não mudaram entre b3 e b4).

### 1(c) o log é limpo — guarda D4 do PRÓPRIO objeto (sonda 20:50:04Z; gravado ~20:50Z)
- Sonda montada no container: `awk "/^function connectionParts/{p=1} /^async function waitFor/{p=0} p" tests/san3-05-runtime-role-guard-db.test.ts` → 121 linhas md5 `ea9025d013fb00d79fd457141c3a7888` (= a extração do blob feita no host, `$SCRATCH/d4-84831ad9.txt`, mesmo md5); 4 funções (`connectionParts`, `assertConnectionSecretsAbsent`, `assertRoleNamesOnlyInIdentityFields`, `assertConnectionLogsSafe`) — verbatim, não reescritas. Cabeçalho `zz-j05c4c3-d4-head.mts` md5 `6c1bb4c307191696e8b7d7587bee9b72` (3 linhas: `import assert from "node:assert/strict"`, `readFileSync`); rodapé meu `zz-j05c4c3-d4-foot.mts` md5 `079744d8c32f27525c60baf1621ad183` (aplica `assertConnectionSecretsAbsent(texto,[url])` e `assertConnectionLogsSafe(linhas JSON,[url])`; imprime só a 1ª linha da falha); sonda final `/tmp/zz-j05c4c3-d4.mts` md5 `7a22edfda2e6d1072f5fffe9f14424ff`.
- Partes examinadas (de `connectionParts(url do papel limpo)`): hostname `j05c4-c3-pg`, port `5432`, username `zz_j05c4c3_app`, database `erp_techsolutions`, password `<48 chars>`.
- **Controle (2) — a guarda acusa:** `CTRL+ postgresql://` → FALHA (regex `/postgresql:\/\/|password/i`) nas duas funções; `CTRL+ host` → FALHA "hostname da conexão apareceu no log"; `CTRL+ papel fora de campo identidade` → FALHA "username da conexão apareceu no log"; `CTRL- formas permitidas` (session_user/current_user, `error.sessionUser/currentUser`, `escapes[].rolname`) → ok/ok. → acusou nos dois sentidos.
- **Logs dos 5 boots** (`.seq` = stdout+stderr na ordem): b1 (3 linhas) ok/ok · b2 (3) ok/ok · b3 (3) ok/ok · b4 (4) ok/ok · b5 (6) ok/ok. Contagem crua por arquivo (`grep -o`): `j05c4-c3-pg` 0, `5432` 0, `erp_techsolutions` 0, `postgresql:` 0 em todos; senha 0 (1(b)). Nenhum falso vermelho da porta (`P-SAN3-05-T15-FALSO-VERMELHO-PORTA` não se manifestou nesta amostra).
- **Nome do dono da view:** aparece 2× em b2 e 2× em b3, só como valor de `escapes[0].rolname` (na linha do bootstrap e em `error.escapes[0].rolname`). A guarda **não o examina**: ela só procura os nomes de usuário das URLs passadas (`connectionParts(url).username` = o papel da conexão), e o dono da view não é o papel da conexão. Ele é identidade de outro papel, num campo que as erratas 2/3 dão (`escapes[].rolname`).
- Veredito parcial: **log limpo pela guarda D4 do objeto em todos os boots**, recusados e aceitos; a guarda foi vista acusando.

- **Correção de registro (20:52Z, `date -u`):** os cabeçalhos acima foram gravados primeiro com horas ESTIMADAS (20:44Z–20:59Z, à frente do relógio). Corrigi-os pelas horas de modificação dos artefatos no container (`TZ=UTC ls -l --time-style=+%H:%M:%SZ /tmp/ | grep zz-j05c4c3`) e pelo `setup.log`; nenhum conteúdo medido mudou. Daqui em diante cada seção leva a hora de `date -u` no momento da gravação.

### 1(d) parte 2 — T5/T6/T9 e T15 por execução (rodada 20:51:00–20:51:10Z; gravado 20:52Z)
- Limpeza do meu cluster ANTES (para o banco voltar ao estado pós-migração, como na CI): `DELETE` das 2 linhas semeadas de `tenant_settings` e das 2 de `tenants`; `DROP OWNED BY zz_j05c4c3_app, zz_j05c4c3_novo; DROP ROLE` ×2 → ec=0; depois: tenants 0 · tenant_settings 0 · papéis `zz_j05c4c3%` 0 · `pg_default_acl` 0 · views 0 · `pg_roles` 15. Arquivos de senha/URL do papel apagados do container.
- `timeout 900 npm test -- tests/san3-05-runtime-role-guard-db.test.ts` (o runner do repositório com alvo — mesmo modo do job `backend`: `CORE_SAAS_PERSISTENCE=memory — padrão do runner`, `DATABASE_URL` do meu Postgres) → **ec=0**; TAP: `# tests 12 · pass 12 · fail 0 · cancelled 0 · skipped 0 · todo 0`, duration 9608 ms; runner: "1 arquivo(s) · 12 teste(s) · pass 12 · fail 0 · skipped 0".
- `ok 1 - T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão` · `ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo` (os outros 9 subtestes também `ok`: T7/T8, T8b/T8c, T8c, T8d, T8e, T8f, T14a/b, T14c, T14d; + o teste de topo).
- Veredito parcial: T5/T6/T9 e T15 **verdes e sem diff no ciclo** (1(d) parte 1).

### Veredito do item 1 (20:52Z)
**VERDE.** O processo de produção (`src/server.ts`, `NODE_ENV=production`, papel limpo criado pelo script do operador) **recusa** com uma view de dono comum, sem grant a ninguém, sobre a tabela FORCE `public.tenant_settings` — `close` = 1 em 1,5–1,6 s, **com** `DATABASE_RUNTIME_ROLE_GUARD=enforce` (b2) **e sem** a variável (b3), 0 menção a Redis/job worker antes da falha, nomeando `escapes[].via="view"`, `rolname="zz_j05c4c3_dono"` — e **aceita** o mesmo papel no mesmo banco sem a view, antes (b1) e depois (b4) (`verified`, `"escapes":0`), e serve com Redis alcançável (b5: "API listening"). A guarda D4 do próprio objeto passa nos 5 logs e acusa os 3 controles positivos. Os 3 vermelho-controles acusaram. **Forma explorável não foi medida porque não houve vermelho** (o corpo a exige só para graduar um boot que sobe com a view). **Achado:** nenhum grave. **Nota (vai ao item 3):** o `message` do `RuntimeRoleGuardError` — o único texto que diz `view:<dono>` e o remédio — não chega ao log de produção.

## Item 3 — o texto diz a regra (só nota) (gravado 20:54Z)
- Verificador: `$SCRATCH/zz-j05c4c3-texto.mjs` md5 `2ea6d67278c5dfa4a18c310e9b1e2744` (normaliza acento/caixa/`*`/```; critérios por regex: (i) `view` E `matview|materialized view`; (ii) `(qualquer|nenhum) esquema`; (iii) `(qualquer|nenhum) dono`; (iv) `sem olhar…privilegio|qualquer privilegio`; (v) `force|tabela protegida`; (vi) `drop view` E `drop materialized view`; (x) CONTRADIZ `view de dono que escapa|dono que escapa|privilegio do papel`; (y) via atribuída ao papel `(papel|identidade)…escapa…view:`). Entradas no container: `docs/deployment.md` md5 `1f700ff126b7da649c3ddd79db94463b` = blob; `src/database/runtime-role.ts` md5 `9efee03db097f54e73178e1ec4c740d9` = blob; o stderr do MODO 6 capturado por execução (20:48:08Z); o `message` do `RuntimeRoleGuardError` capturado por execução na sonda (20:46–20:47Z) e copiado verbatim para `zz-j05c4c3-msg-guarderror.txt` md5 `1a14c19fa53911cb8a093f29742be61f`; as `msg` do log do b2.
- Âncoras em `docs/deployment.md` (contagem = 1 cada): T1 "`- **view** — existe no banco **qualquer** view ou matview`" → l.95-98; T2 "`- **MODO 6** — existe view/matview`" → l.128-130; T3 "`Regra operacional: nenhuma view`" → parágrafo l.132-138.

| texto | (i) view+matview | (ii) esquema | (iii) dono | (iv) sem privilégio | (v) FORCE | (vi) DROP | contradiz | via atribuída ao papel |
|---|---|---|---|---|---|---|---|---|
| T1 docs via `view` (l.95-98) | SIM | SIM | SIM | SIM | SIM | não (o remédio está no MODO 6) | não | não |
| T2 docs MODO 6 (l.128-130) | SIM | SIM | SIM | SIM | SIM | SIM | não | não |
| T3 docs compose (l.132-138) | SIM | SIM | SIM | não dito (proibição absoluta "nenhuma view") | SIM | não (remete ao MODO 6) | não | não |
| T4 comentário `runtime-role.ts` (l.1-12) | SIM | SIM | SIM | SIM | SIM | n/a | não | não |
| T5 `RAISE` do MODO 6 (execução, ec=3) | SIM | implícito ("nenhuma view/matview pode alcançar") | implícito | implícito | SIM | SIM | não | **SIM** ("papel zz_j05c4c3_novo ainda escapa de RLS por 1 via(s): view:zz_j05c4c3_v") |
| T6 `message` do `RuntimeRoleGuardError` (execução) | SIM | implícito ("nenhuma view/matview sobre tabela FORCE") | implícito | implícito | SIM | não (diz "nenhuma", sem DROP) | não | **SIM** ("a identidade … escapa … por 1 via(s): view:zz_j05c4c3_dono") |
| T7 o que o operador LÊ no log de produção (b2) | não | não | não | não | não | não | não | não |

- T7: as `msg` do log são "Login sem organização INATIVO…", "runtime database role can bypass RLS — refusing to start" e "Failed to start ERP Techsolutions API"; a regra só aparece estruturada (`escapes[].via = "view"`, `rolname` = dono). O `message` (T6, o único texto da recusa que nomeia `view:<dono>` e o remédio) **não vai ao log** — 1(b): `Object.keys(error)` = code, sessionUser, currentUser, escapes, name. Origem da forma: `src/server.ts:48` `logger.error({ error }, "Failed to start ERP Techsolutions API")` — `git blame -L 47,49 84831ad9 -- src/server.ts` → `1a4a3f97` 2026-05-29, presente na `main` a9bbde38 (l.46) → **pre-existente** ao bloco; `src/server.ts` é PROIBIDO ao dev neste ciclo (C4.4).
- **Vermelho-controles do item 3:** (1) frase fabricada "nenhuma view nem matview sobre tabela FORCE, em nenhum esquema, sem olhar privilegio" (sem dono) → `iii_qualquer_dono=nao` (acusou); (2) o RAISE vem de execução: a mesma execução SEM view → ec=0, `grep -c "MODO 6"` = 0 (1(b) passo 4, 20:49:18Z); (3) âncora inexistente `ancora-que-nao-existe-zz-j05c4c3` → contagem 0 (acusou).
- Fora do item (C4.6: o `env.ts` nem nota): `src/config/env.ts:567` ainda diz "posse de tabela FORCE ou view de dono que escapa" — vai a `pendencias_que_aceito` em 1 linha.
- Veredito parcial do item 3: os três trechos da documentação e o comentário da trava **dizem a regra** (T2 e T4 inteira; T1 sem o remédio, que está no T2; T3 sem "sem olhar privilégio", coberto pela proibição absoluta). **Notas (não graves, não bloqueiam):** N3-a — o `RAISE` do MODO 6 e o `message` do `RuntimeRoleGuardError` atribuem a via `view` ao papel ("papel … ainda escapa", "a identidade … escapa"), quando a regra diz que a via é do banco, não do papel (`dentro-do-bloco`); N3-b — o `message` da recusa não chega ao log de produção, e o que o operador lê ("runtime database role can bypass RLS — refusing to start") não diz a regra nem o remédio (forma do log `pre-existente`, `1a4a3f97` 2026-05-29; a frase do bootstrap nasceu no bloco, `d76b255f` 2026-10-02).

## Item 2 — suíte inteira e build; bootstrap 12, acessos 35 (T13), leituras 13 (em curso; gravado 20:54Z)
- Modo (lido no blob): job `backend` de `.github/workflows/ci.yml` (l.31-112) exporta `DATABASE_URL`, `REDIS_URL`, `CORE_SAAS_PERSISTENCE: memory`; passos `npm ci` → `sync-agent-agents --check` → `npm run db:generate` → guard de env → `npx prisma migrate deploy` → `npm run check` → **`npm test`** → **`npm run build`**. `scripts/run-backend-tests.mjs` (460 linhas): expande `tests/*.test.ts` em JS, `node --test --import tsx --test-reporter=tap`, modo `memory` se não exportado, guard de piso de denominador (arquivo mudo) e **`SKIP_BUDGET_DB = 2`** (l.82) com `DATABASE_URL` presente (os 2 nomeados: `permission-catalog-db-parity`, gated por `RBAC_DB_PARITY`). Rodo no mesmo modo: `docker exec -e REDIS_URL=redis://j05c4-c3-redis:6379 -e CORE_SAAS_PERSISTENCE=memory j05c4-c3-node … timeout 2400 npm test` (`DATABASE_URL` = meu Postgres, do ambiente do container), início 20:52:58Z.
- 2(b) parte git (sem execução): `git diff 7c63f920..84831ad9 -- scripts/san3-05-acessos-de-plataforma.mjs tests/san3-05-acessos-de-plataforma-guard.test.ts tests/fixtures/ | wc -l` = **0**; irmão não-vazio `-- tests/db-catalog-write-guard.test.ts` = 2+/2-; `src/` no ciclo = só `src/database/runtime-role.ts`; `tests/san3-05-runtime-role-bootstrap.test.ts` e `tests/san3-05-leituras-de-plataforma-db.test.ts` no ciclo = 0 linha. Origem (`git log --diff-filter=A 84831ad9`): `runtime-role.ts`/`runtime-role.bootstrap.ts` d76b255f 2026-10-02 · gerador e T13 05d7789f 2026-10-02 · leituras-db 4cb522dd 2026-10-02 · guard-db e0143db1 2026-10-03 · bootstrap.test f766fdd9 2026-10-02 · `db-runtime-role.sh` 041e414b 2026-10-02; todos **ausentes** na `main` a9bbde38 → nasceram neste bloco.
- **Vermelho-controle (1) — o leitor de TAP conta pelo corpo:** `zz-j05c4c3-tapler.mjs` md5 `5d19fd61c8ee41452795790296f0993f` (conta `(not )?ok N -` no corpo, `# SKIP`, `# TODO`, `XX000`, e lê o resumo). Real (guard-db): pontos 12, not ok 0, skip 0. Cópia com `not ok 98 - zz fabricado vermelho` + `ok 99 - zz fabricado pulado # SKIP fabricado` apensos (resumo intocado: tests 12, fail 0, skipped 0) → **not_ok_no_corpo 1, skip_no_corpo 1** → acusou os dois.

### 2(a) suíte inteira — rodada 1 (20:52:58–20:57:18Z; gravado 20:58Z)
- `npm test` (291 arquivos) → **ec=1**. Runner: `CORE_SAAS_PERSISTENCE=memory — herdado do ambiente`; "291 arquivo(s) · 3135 teste(s) · pass 3131 · fail 2 · skipped 2". Leitor no corpo do TAP: pontos 3135 (topo 2988), **not ok 2**, SKIP 2, TODO 0; `XX000` 2 — ambos são NOMES de teste ("(PA) sonda de barreira … não produz XX000", TAP l.3937-3938), não erro.
- Skips (2): `permission-catalog-db-parity` "toda permissão do catálogo existe na tabela `permissions`…" e "os grants do papel GLOBAL batem…" — `# SKIP RBAC_DB_PARITY não é "1"` — os 2 nomeados no orçamento do runner. O guard-db não está entre os skips.
- **Falha:** `not ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo` (e o pai `not ok 2251 - B-SAN3-05 · o papel de runtime não contorna FORCE RLS`, "1 subtest failed"): `error: 'processo filho não encerrou em 8540ms'`, `stack: Timeout._onTimeout (tests/san3-05-runtime-role-guard-db.test.ts:536:14)` (= `waitForCloseCode`), duration 15103 ms. Leitura: num dos `refuseBoot` o "Failed to start" apareceu a ~6,46 s do spawn (15 000 − 8 540) e o filho **não fechou** nos 8,54 s seguintes, sob a carga da suíte (291 arquivos em paralelo; outra cadeira com containers vivos na mesma máquina). Isolado (1(d) parte 2) o T15 passou; nos meus boots isolados b2/b3 o `close` veio ~140 ms depois da falha.
- Pendência existente para esta forma: nenhuma (`grep -n T15` em `pendencias.md` do objeto: só `P-SAN3-05-T15-FALSO-VERMELHO-PORTA` e `P-SAN3-05-RUNNER-SEM-TIMEOUT`, outras formas). O relatório do dev (D7, 18:14–18:18Z) publica a suíte verde 3135/3133/0/2 no head dele; o check-run `backend` do objeto está `success`.
- Próximo: re-executar a suíte (corpo: falha de terreno se re-executa e se declara) e medir o tempo de saída do processo recusado.

### 2(a) suíte inteira — rodada 2 e a forma da falha (20:58:31–21:05Z; gravado 21:05Z)
- Rodada 2 (`npm test`, mesmo modo; 20:58:31–21:02:58Z; os containers `j05c4-c2-*` já não estavam de pé): **ec=1**, "291 arquivo(s) · 3135 teste(s) · pass 3131 · fail 2 · skipped 2"; leitor: not ok 2 (`not ok 11 - T15 …` e o pai `not ok 2251`), SKIP 2 (os mesmos 2 nomeados), `XX000` 2 (nomes de teste). T15: `'processo filho não encerrou em 7462ms'` (`waitForCloseCode`, l.536), duration 15222 ms. → **2 de 2 rodadas da suíte com o T15 vermelho, sempre pela mesma forma; 1 de 1 isolado verde.** Container com 8 CPUs.
- **Medição do tempo recusa→saída** — `zz-j05c4c3-linger.sh` md5 `ea8a5a635641d20473232a5d1d3a1fa4` (K boots recusados em paralelo × R rodadas, pelo `boot.mjs`, `enforce`, com a URL do **superusuário** como o T15 — escrita no container com `umask 077` a partir do `DATABASE_URL` do ambiente; mede `close` − 1ª "Failed to start"):
  - isolado K=1 R=5: **5/5 código 1**, recusa a 1317–1558 ms, recusa→close **136–187 ms** (mediana 162), 0 > 5 s.
  - paralelo K=6 R=2 (carga gerada pelos próprios boots): **12/12 código 1**, recusa a 4078–5535 ms; recusa→close bimodal: 7 em 191–757 ms e **5 em 10 059–10 222 ms** (máx 10 222). Nenhum chegou a `listen`; `vivos_src_server=0` depois.
- **O que segura o processo** — gancho `zz-j05c4c3-hook.cjs` md5 `ded05064005909090346ad0e8b13f24a` (`NODE_OPTIONS=--require`, só no processo `src/server.ts`; a cada 1 s imprime `process.getActiveResourcesInfo()` e a porta remota dos sockets TCP; timer `unref`), K=6 R=1: 6/6 código 1; 2 de 6 com recusa→close > 5 s (máx 10 095 ms). Nos 2 lentos, depois da recusa: `recursos=PipeWrap,PipeWrap,TCPSocketWrap,Timeout sockets=tcp->5432` em t=11–13,6 s — **uma conexão ociosa ao Postgres (5432) e um timer**; nenhum socket para Redis. `pg-pool` no container: `idleTimeoutMillis = 10000` por padrão (`node_modules/pg-pool/index.js:98-99`) — casa com os ~10,1 s.
- **Origem provável (hipótese, não medida por execução):** `src/app.ts:263` `export const app = createApp(new MemoryCoreSaasAdapter(coreSaasService))` roda no IMPORT de `app.js` (`git blame` → `1a4a3f97` 2026-05-29) e `createApp` dispara a sonda de login sem organização (`src/app.ts:88-95`, `0a398246` 2026-08-19), que usa o mesmo `prisma` (`src/modules/auth/services/login-readiness.ts:146`) em paralelo com a trava; sob carga a consulta dela pode cair depois do `` da trava e abrir uma conexão que fica ociosa 10 s. Isolado a ordem é outra e o processo sai em ~150 ms.
- **Classificação (item 2):** a propriedade do bloco **não** falhou — o processo recusado sai com código 1, nunca escuta, antes de qualquer Redis; o que estoura é o teto de 15 s do T15 (`refuseBoot`: "Failed to start" + `close` em ≤ 15 s) sob a carga da suíte inteira neste terreno. É "duração acima do esperado com recusa correta" → **não grave**. O T15 nasceu no bloco (`tests/san3-05-runtime-role-guard-db.test.ts`, `e0143db1` 2026-10-03) e é byte-idêntico ao head do disparo (1(d)) → `dentro-do-bloco` para a forma do teste; as duas peças do mecanismo são anteriores ao bloco. O check-run `backend` do objeto (que roda esta mesma suíte) está `success` e o D7 do dev publicou 3135/3133/0/2: no terreno da CI o teto não estoura.

### 2 — controles (2)(3), build e os três dirigidos (21:05–21:07Z; gravado 21:07Z)
- **Vermelho-controle (2) — a suíte viu o Postgres** (TAP da rodada 2): 35 arquivos `tests/*-db.test.ts` no glob; os pontos do bloco aparecem EXECUTADOS — `ok 1 - T5/T6/T9…`, `ok 6 - T8e…`, `ok 10 - T14d…`, `ok 2238 - B-SAN3-05 · T10–T12…` (leituras-db), `ok 9 - T11g…`, `ok 12 - T12 · A14: o canário…`; pontos com `# SKIP` no TAP inteiro = **2** (os 2 de `permission-catalog-db-parity`, `RBAC_DB_PARITY`); o guard-db não está entre eles; "PISO DE DENOMINADOR" 0 e "GUARD DE SKIP" 0 no stderr do runner. → acusou (o leitor separa executado de pulado).
- **Build + vermelho-controle (3)** — `zz-j05c4c3-build-ctl.sh` md5 `07fe24e5c31a309a52fdc5a0814a604b`: `npm run build` (= `tsc -p tsconfig.json`) **ec=0**; mutação na cópia do container: âncora de linha inteira `export const RUNTIME_ROLE_CAN_BYPASS_RLS = "RUNTIME_ROLE_CAN_BYPASS_RLS";` contagem 1 → `…: number = …` (diff 2 linhas, mutante presente 1) → `npm run build` **ec=2**, `src/database/runtime-role.ts(52,14): error TS2322: Type 'string' is not assignable to type 'number'.` → restauro por `cp` do `.pristino`, md5 `9efee03db097f54e73178e1ec4c740d9` = blob → `npm run build` de novo **ec=0** (irmão verde).
- **Dirigidos** — `zz-j05c4c3-dirigidos.sh` md5 `5ad1e555620386eaec25ed0863da1432` (`timeout 900 npm test -- tests/<arquivo>`, mesmo modo do job `backend`): `san3-05-runtime-role-bootstrap` ec=0 `# tests 12 # pass 12 # fail 0 # skipped 0` — `ok 1 - T2 · produção sem a variável → o EXPORT resolve `enforce` (processo filho, módulo real)`, `ok 2 - T2 · produção com `enforce` explícito → `enforce``, `ok 3 - T2 · produção com `skip` → o import do env.ts RECUSA…`; `san3-05-acessos-de-plataforma-guard` ec=0 **35/35** — `ok 1 - T13 · ratchet semântico: congelado com motivo por chave, 31 formas vermelhas e a 'sumida' vermelha` (o assert "stderr do gerador precisa ser vazio" está no corpo do T13, l.171 do blob, e passou), `ok 1 - o inventário do head == congelado…`, 31 formas `ok`, `ok 33 - L0 exato…`, `ok 34 - 'sumida'…`; `san3-05-leituras-de-plataforma-db` ec=0 **13/13**. Leitor no corpo dos três: not ok 0, SKIP 0.

### Veredito do item 2 (21:07Z)
- Suíte inteira no modo do job `backend`: **N executado = 3135** (TAP, 2 rodadas iguais), **skipped 2 ≤ 2** (os nomeados), **fail 2 em 2 de 2 rodadas** — só o T15 (+ o pai), pela forma "processo filho não encerrou", explicada acima; 0 `XX000` de erro. Build ec=0 (e falha quando deve). Bootstrap **12**, acessos **35** (T13 ok, inventário sem diff no ciclo), leituras **13**. Os 3 vermelho-controles acusaram.
- **Achado A2-1 (não grave, não reprova):** sob a carga da suíte inteira neste terreno (8 CPUs, Docker/WSL2), o T15 estoura o teto de 15 s porque o processo recusado fica vivo ~10 s com uma conexão ociosa ao Postgres depois da recusa (5/12 e 2/6 nos boots paralelos; 0/5 isolado). A propriedade do bloco se mantém (código 1, sem `listen`, antes do Redis). Gravidade **ajuste**, escopo **dentro-do-bloco** (a forma e o teto do T15 nascem em `e0143db1` 2026-10-03; o mecanismo é anterior: `src/app.ts:263` `1a4a3f97` 2026-05-29 e `src/app.ts:88-95` `0a398246` 2026-08-19), classe **não grave**. Na CI o `backend` do objeto está verde.

## Apêndice — texto verbatim das minhas sondas (LF, 0 espaço no fim de linha, 0 CR; md5 = o publicado acima)

A variante `zz-j05c4c3-boot-redis.mjs` (md5 `ccdc86deb3255b38c6d0a8ea179a9440`) é `zz-j05c4c3-boot.mjs` + a linha mostrada no `diff` de 1(b) passo 4. `zz-j05c4c3-msg-guarderror.txt` (md5 `1a14c19fa53911cb8a093f29742be61f`) é a linha do `message` citada no item 1, verbatim.

### condutor-setup.sh — md5 `4a7a9ede8eb9a8a3da0506ad3167a2d7`

````
#!/usr/bin/env bash
# condutor-setup.sh — C3 da junta 4 do B-SAN3-05. Adaptado de C:/Users/AMP/erp-terreno/receita-pg16.sh (md5 9861a2aa...):
# mesmos passos 1-4 (rede propria, postgres:16 sem porta, git archive autocrlf=false + hash-object x ls-tree de TODOS os
# blobs, copia para o container + md5sum -c de TODOS, npm ci + prisma generate + prisma migrate deploy DENTRO), com:
#  - prefixo fixo j05c4-c3- (rede, pg, node, redis) e arvore temporaria /c/Users/AMP/t-j05c4c3-<rand> (remocao casa o MESMO prefixo);
#  - REPO = o meu worktree C:/Users/AMP/w-j05c4c3; um redis:7 PROPRIO (sem porta) para a suite;
#  - SEM trap EXIT de derrubada: os containers ficam de pe entre boots, testes e suite (teardown e outro script, pelo nome).
#  - senha do postgres: aleatoria, so no ambiente (export em subshell) e no ambiente dos containers pg/node; nunca argv/log.
set -uo pipefail
SHA=84831ad9796d8db29766b0ff6e0a1a894a9d45e7
REPO=C:/Users/AMP/w-j05c4c3
IMAGE=erp-junta-node20-pg16:local
PG_IMAGE=postgres:16
P=j05c4-c3
NET=$P-net; PGC=$P-pg; NODEC=$P-node; RDC=$P-redis
S=/c/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c3
OUT=$S/setup; mkdir -p "$OUT"; LOG=$OUT/setup.log
TMP_TREE="/c/Users/AMP/t-j05c4c3-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
dk() { MSYS_NO_PATHCONV=1 timeout "${DK_TIMEOUT:-120}" docker "$@"; }
say() { printf '%s %s\n' "$(date -u +%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
fail() { say "FALHA: $*"; exit 1; }
[ ! -e "$TMP_TREE" ] || fail "$TMP_TREE ja existe"
for n in $NET $PGC $NODEC $RDC; do case "$n" in j05c4-c3-*) ;; *) fail "nome fora do prefixo: $n";; esac; done
[ "$(dk ps -a --filter name=j05c4-c3- -q | wc -l)" -eq 0 ] || fail "ja existe container j05c4-c3-"
say "objeto=$SHA imagem=$(dk image inspect -f '{{.Id}}' $IMAGE | cut -c1-19) pg=$PG_IMAGE redis=$(dk image inspect -f '{{.Id}}' redis:7 | cut -c1-19)"
PGPW="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')"
dk network create $NET >/dev/null || fail "rede"
( export POSTGRES_PASSWORD="$PGPW"; dk run -d --name $PGC --network $NET -e POSTGRES_PASSWORD -e POSTGRES_USER=postgres -e POSTGRES_DB=erp_techsolutions $PG_IMAGE >/dev/null ) || fail "pg"
dk run -d --name $RDC --network $NET redis:7 >/dev/null || fail "redis"
( export PGPASSWORD="$PGPW" DATABASE_URL="postgresql://postgres:${PGPW}@${PGC}:5432/erp_techsolutions?schema=public"; dk run -d --init --name $NODEC --network $NET -w /work -e PGPASSWORD -e DATABASE_URL -e PGHOST=$PGC -e PGPORT=5432 -e PGUSER=postgres -e PGDATABASE=erp_techsolutions $IMAGE sleep infinity >/dev/null ) || fail "node"
unset PGPW
say "subiram: $(dk ps --filter name=j05c4-c3- --format '{{.Names}}[{{.Ports}}]' | tr '\n' ' ')"
ready=0; for _ in $(seq 1 90); do dk exec $PGC pg_isready -q -h 127.0.0.1 -p 5432 -U postgres -d erp_techsolutions >/dev/null 2>&1 && { ready=1; break; }; sleep 1; done
[ $ready -eq 1 ] || fail "pg nao ficou pronto"
say "postgres: $(dk exec $PGC postgres --version)"
mkdir -p "$TMP_TREE"
git -C "$REPO" -c core.autocrlf=false archive --format=tar "$SHA" | tar -x -C "$TMP_TREE" || fail "archive"
git -C "$REPO" -c core.quotePath=false ls-tree -r --format='%(objectname)%x09%(path)' "$SHA" > "$OUT/ls-tree.tsv"
cut -f2 "$OUT/ls-tree.tsv" > "$OUT/paths.txt"
( cd "$TMP_TREE" && git hash-object --no-filters --stdin-paths < "$OUT/paths.txt" ) > "$OUT/hash-extraido.txt"
total=$(wc -l < "$OUT/ls-tree.tsv"); iguais=$(paste <(cut -f1 "$OUT/ls-tree.tsv") "$OUT/hash-extraido.txt" | awk -F'\t' '$1==$2' | wc -l)
say "arvore: blobs_no_objeto=$total extraidos_byte_identicos=$iguais"
[ "$total" -gt 0 ] && [ "$iguais" -eq "$total" ] || fail "extracao nao byte-identica"
( cd "$TMP_TREE" && tr '\n' '\0' < "$OUT/paths.txt" | xargs -0 md5sum ) > "$OUT/md5-arvore.lst"
tar -C "$TMP_TREE" -cf - . | DK_TIMEOUT=300 dk exec -i $NODEC tar --no-same-owner -xf - -C /work || fail "copia"
dk exec -i -w /work $NODEC md5sum -c --quiet < "$OUT/md5-arvore.lst" > "$OUT/md5-container.txt" 2>&1 || fail "md5 diverge no container"
say "container: md5sum -c de $(wc -l < "$OUT/md5-arvore.lst") arquivos -> 0 divergencia"
case "$TMP_TREE" in /c/Users/AMP/t-j05c4c3-*) rm -rf -- "$TMP_TREE";; esac
[ -e "$TMP_TREE" ] && say "arvore temporaria PRESENTE" || say "arvore temporaria removida"
say "versoes: node $(dk exec $NODEC node -v) npm $(dk exec $NODEC npm -v) $(dk exec $NODEC psql --version) uname: $(dk exec $NODEC uname -a)"
DK_TIMEOUT=1200 dk exec -w /work $NODEC npm ci --no-audit --no-fund > "$OUT/npm-ci.log" 2>&1; ec=$?
say "npm ci ec=$ec ($(grep -E '^added [0-9]+ packages' "$OUT/npm-ci.log" | head -1))"; [ $ec -eq 0 ] || fail "npm ci"
DK_TIMEOUT=300 dk exec -w /work $NODEC npx prisma generate > "$OUT/prisma-generate.log" 2>&1; ec=$?
say "prisma generate ec=$ec"; [ $ec -eq 0 ] || fail "generate"
DK_TIMEOUT=600 dk exec -w /work $NODEC npx prisma migrate deploy > "$OUT/prisma-migrate.log" 2>&1; ec=$?
say "prisma migrate deploy ec=$ec ($(grep -oE '[0-9]+ migrations? found' "$OUT/prisma-migrate.log" | head -1))"; [ $ec -eq 0 ] || fail "migrate"
say "catalogo public (tabelas|FORCE|views|matviews): $(dk exec $NODEC psql -XAt -c "SELECT (SELECT count(*) FROM pg_tables WHERE schemaname='public')||'|'||(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relforcerowsecurity)||'|'||(SELECT count(*) FROM pg_class WHERE relkind='v' AND relnamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname IN ('pg_catalog','information_schema')))||'|'||(SELECT count(*) FROM pg_matviews)")"
say "redis: $(dk exec $RDC redis-cli ping)"
say "SETUP OK"
````

### zz-j05c4c3-boot.mjs — md5 `41ff0f334de177a39d071aafa5430ea5`

````
// zz-j05c4c3-boot.mjs — C3/junta 4/B-SAN3-05: sobe src/server.ts do objeto como o T15 (startBackend), mede e para.
// uso: node zz-j05c4c3-boot.mjs <rotulo> <enforce|unset> <refuse|accept>
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
const [label, guard, expect] = process.argv.slice(2);
const src = readFileSync("/work/tests/san3-05-runtime-role-guard-db.test.ts", "utf8");
const m = /^const PROD_BASE = (\{[\s\S]*?\n\}) as const;$/m.exec(src);
if (!m) { console.error("PROD_BASE nao achado no blob"); process.exit(2); }
const PROD_BASE = new Function(`return (${m[1]});`)();
const reserve = () => new Promise((res, rej) => { const s = net.createServer(); s.once("error", rej); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close((e) => (e ? rej(e) : res(p))); }); });
const [port, portalPort] = await Promise.all([reserve(), reserve()]);
const env = { ...process.env, ...PROD_BASE, DATABASE_URL: readFileSync("/tmp/zz-j05c4c3-app.url", "utf8").trim(), PORT: String(port), PORTAL_PORT: String(portalPort) };
for (const k of ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"]) delete env[k];
if (guard === "enforce") env.DATABASE_RUNTIME_ROLE_GUARD = "enforce"; else delete env.DATABASE_RUNTIME_ROLE_GUARD;
const started = Date.now();
const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], { cwd: "/work", env, stdio: ["ignore", "pipe", "pipe"] });
let out = "", err = "", seq = "";
child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
child.stdout.on("data", (c) => { out += c; seq += c; });
child.stderr.on("data", (c) => { err += c; seq += c; });
let verifiedAt = null, failedAt = null, stoppedBy = null;
const poll = setInterval(() => {
  if (verifiedAt === null && seq.includes("runtime database role verified")) verifiedAt = Date.now() - started;
  if (failedAt === null && seq.includes("Failed to start ERP Techsolutions API")) failedAt = Date.now() - started;
}, 20);
const alive = () => child.exitCode === null && child.signalCode === null;
const closed = new Promise((res) => child.once("close", (code, signal) => res({ code, signal, ms: Date.now() - started })));
const stop = (why) => { if (!alive()) return; stoppedBy = `${why}-SIGTERM`; child.kill("SIGTERM"); setTimeout(() => { if (alive()) { stoppedBy = `${why}-SIGKILL`; child.kill("SIGKILL"); } }, 3000); };
const hard = setTimeout(() => stop("teto60s"), 60_000);
if (expect === "accept") {
  const t0 = Date.now();
  while (verifiedAt === null && alive() && Date.now() - t0 < 60_000) await new Promise((r) => setTimeout(r, 50));
  if (alive()) { await new Promise((r) => setTimeout(r, 5000)); stop("condutor"); }
}
const close = await closed;
clearTimeout(hard); clearInterval(poll);
if (verifiedAt === null && seq.includes("runtime database role verified")) verifiedAt = close.ms;
if (failedAt === null && seq.includes("Failed to start ERP Techsolutions API")) failedAt = close.ms;
writeFileSync(`/tmp/zz-j05c4c3-boot-${label}.out`, out);
writeFileSync(`/tmp/zz-j05c4c3-boot-${label}.err`, err);
writeFileSync(`/tmp/zz-j05c4c3-boot-${label}.seq`, seq);
const lines = seq.split(/\r?\n/).filter(Boolean);
const iFail = lines.findIndex((l) => l.includes("Failed to start ERP Techsolutions API"));
const before = iFail >= 0 ? lines.slice(0, iFail) : lines;
const parsed = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } });
const failObj = iFail >= 0 ? parsed[iFail] : null;
console.log(JSON.stringify({
  label, guard, expect, close_code: close.code, close_signal: close.signal, duracao_ms: close.ms, stoppedBy,
  verified_ms: verifiedAt, failed_ms: failedAt, linhas: lines.length, linhas_antes_da_falha: before.length,
  redis_ou_job_worker_antes_da_falha: before.filter((l) => /redis|job worker/i.test(l)).length,
  redis_ou_job_worker_total: lines.filter((l) => /redis|job worker/i.test(l)).length,
  primeira_falha_tem_codigo: iFail >= 0 ? lines[iFail].includes("RUNTIME_ROLE_CAN_BYPASS_RLS") : null,
  error_keys: failObj && failObj.error ? Object.keys(failObj.error) : null,
  error_message: failObj?.error?.message ?? null, error_code: failObj?.error?.code ?? null,
  escapes_no_log: parsed.filter(Boolean).flatMap((e) => [e, e.error].filter((x) => x && Array.isArray(x.escapes)).flatMap((x) => x.escapes.map((y) => `${y.via}/${y.rolname}/objetos=${y.objetos}/is_self=${y.is_self}`))),
  escapes0: seq.includes('"escapes":0'), texto_view_dono: (seq.match(/view:[a-z0-9_]+/g) ?? []),
  mensagens: parsed.filter(Boolean).map((e) => `${e.level}:${e.msg}`),
  nao_json: lines.filter((_, i) => parsed[i] === null).map((l) => l.slice(0, 160)),
}, null, 1));
````

### zz-j05c4c3-vivos.sh — md5 `d345f8bb3c206922db57b4c29350bc07`

````
#!/bin/sh
# zz-j05c4c3-vivos.sh — conta processos node src/server.ts vivos no container (exclui a si mesmo)
n=0
for p in /proc/[0-9]*; do
  c=$(tr "\000" " " < "$p/cmdline" 2>/dev/null)
  case "$c" in sh\ -c*) continue;; esac
  case "$c" in *node*src/server.ts*) n=$((n+1)); echo "vivo: $p $c";; esac
done
echo "vivos_src_server=$n"
````

### zz-j05c4c3-probe.mts — md5 `d310efdc11ae1034a97b3cff67e2a489`

````
// zz-j05c4c3-probe.mts — C3/junta 4: probeRuntimeRolePosture e a mensagem do RuntimeRoleGuardError do OBJETO, como o papel limpo.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire("/work/package.json");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const rr = await import("/work/src/database/runtime-role.ts");
const url = readFileSync("/tmp/zz-j05c4c3-app.url", "utf8").trim();
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
try {
  const r = await rr.probeRuntimeRolePosture(p);
  const linhas = r.escapes.map((e: { via: string; rolname: string; objetos: number | null }) => `${e.via}/${e.rolname}/${e.objetos}`);
  let mensagem: string | null = null;
  try { rr.assertRuntimeRolePosture(r); } catch (e) { mensagem = (e as Error).message; }
  console.log(JSON.stringify({ sessionUser: r.sessionUser, currentUser: r.currentUser, escapes: linhas, mensagem_RuntimeRoleGuardError: mensagem }));
} finally {
  await p.$disconnect();
}
````

### zz-j05c4c3-view-up.sql — md5 `db3419ac63e5e50ec965e4eff23a1ab6`

````
\set ON_ERROR_STOP 1
INSERT INTO public.tenants (id, name, slug) VALUES ('c3c3c3c3-0000-4000-8000-00000000000a','zz j05c4c3 A','zz-j05c4c3-a'),('c3c3c3c3-0000-4000-8000-00000000000b','zz j05c4c3 B','zz-j05c4c3-b');
INSERT INTO public.tenant_settings (tenant_id, key, value) VALUES ('c3c3c3c3-0000-4000-8000-00000000000a','zz_j05c4c3','valor-A'),('c3c3c3c3-0000-4000-8000-00000000000b','zz_j05c4c3','valor-B');
CREATE ROLE zz_j05c4c3_dono NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT CREATE ON SCHEMA public TO zz_j05c4c3_dono;
SET ROLE zz_j05c4c3_dono;
CREATE VIEW public.zz_j05c4c3_v AS SELECT tenant_id, key, value FROM public.tenant_settings;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM zz_j05c4c3_dono;
SELECT 'view', c.oid::regclass, pg_get_userbyid(c.relowner), c.relkind, coalesce(c.relacl::text,'<null>') FROM pg_class c WHERE c.relname='zz_j05c4c3_v';
SELECT 'priv_tabela_app', has_table_privilege('zz_j05c4c3_app','public.zz_j05c4c3_v','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER');
SELECT 'priv_coluna_app', has_any_column_privilege('zz_j05c4c3_app','public.zz_j05c4c3_v','SELECT,INSERT,UPDATE,REFERENCES');
SELECT 'grants_na_view_alem_do_dono', count(*) FROM information_schema.role_table_grants WHERE table_name='zz_j05c4c3_v' AND grantee <> 'zz_j05c4c3_dono';
SELECT 'colgrants_na_view_alem_do_dono', count(*) FROM information_schema.column_privileges WHERE table_name='zz_j05c4c3_v' AND grantee <> 'zz_j05c4c3_dono';
SELECT 'dono', rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname='zz_j05c4c3_dono';
SELECT 'tabela_force', relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid='public.tenant_settings'::regclass;
SELECT 'views_total_nao_sistema', count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('v','m') AND n.nspname NOT IN ('pg_catalog','information_schema');
````

### zz-j05c4c3-d4-head.mts — md5 `6c1bb4c307191696e8b7d7587bee9b72`

````
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// --- funções D4 EXTRAÍDAS do blob tests/san3-05-runtime-role-guard-db.test.ts (awk, verbatim) ---
````

### zz-j05c4c3-d4-foot.mts — md5 `079744d8c32f27525c60baf1621ad183`

````
// --- condutor da C3 (meu) ---
const url = readFileSync("/tmp/zz-j05c4c3-app.url", "utf8").trim();
const curto = (e: unknown) => String((e as Error).message).split("\n")[0].slice(0, 160);
const julga = (rotulo: string, text: string) => {
  const entries = text.split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return l; } });
  const r: Record<string, string> = { linhas: String(entries.length) };
  try { assertConnectionSecretsAbsent(text, [url]); r.secretsAbsent = "ok"; } catch (e) { r.secretsAbsent = "FALHA: " + curto(e); }
  try { assertConnectionLogsSafe(entries, [url]); r.logsSafe = "ok"; } catch (e) { r.logsSafe = "FALHA: " + curto(e); }
  console.log(rotulo + " " + JSON.stringify(r));
};
const modo = process.argv[2];
if (modo === "logs") {
  for (const f of process.argv.slice(3)) julga(f, readFileSync(f, "utf8"));
} else {
  const p = connectionParts(url);
  console.log("partes examinadas: hostname=" + p.hostname + " port=" + p.port + " username=" + p.username + " database=" + p.database + " password=<" + p.password.length + " chars>");
  julga("CTRL+ postgresql://", JSON.stringify({ level: 50, msg: "x", dsn: "postgresql://alguem@outro-host/db" }));
  julga("CTRL+ host", JSON.stringify({ level: 50, msg: "x", target: p.hostname }));
  julga("CTRL+ papel fora de campo identidade", JSON.stringify({ level: 50, msg: "x", user: p.username }));
  julga("CTRL- formas permitidas", [
    JSON.stringify({ level: 30, guard: "enforce", session_user: p.username, current_user: p.username, escapes: 0, msg: "runtime database role verified" }),
    JSON.stringify({ level: 50, error: { code: "RUNTIME_ROLE_CAN_BYPASS_RLS", sessionUser: p.username, currentUser: p.username, escapes: [{ via: "view", rolname: "outro_dono", objetos: 1 }], name: "RuntimeRoleGuardError" }, msg: "Failed to start ERP Techsolutions API" }),
  ].join("\n"));
}
````

### zz-j05c4c3-texto.mjs — md5 `2ea6d67278c5dfa4a18c310e9b1e2744`

````
// zz-j05c4c3-texto.mjs — C3/junta 4, item 3: o texto diz a regra D-405-PROIBIR-VIEWS? (verificador por criterios)
import { readFileSync } from "node:fs";
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");
const C = {
  "i_view_e_matview": (t) => /\bview/.test(t) && /(matview|materialized view|materializada)/.test(t),
  "ii_qualquer_esquema": (t) => /(qualquer|nenhum) esquema/.test(t),
  "iii_qualquer_dono": (t) => /(qualquer|nenhum) dono/.test(t),
  "iv_sem_privilegio": (t) => /(sem olhar[^.;]*privilegio|qualquer privilegio|sem analisar[^.;]*privilegio)/.test(t),
  "v_tabela_force": (t) => /(force|tabela protegida)/.test(t),
  "vi_remedio_drop": (t) => /drop view/.test(t) && /drop materialized view/.test(t),
  "x_CONTRADIZ": (t) => /(view de dono que escapa|dono que escapa|privilegio do papel)/.test(t),
  "y_via_atribuida_ao_papel": (t) => /(papel|identidade)[^.]{0,120}escapa[^.]{0,80}view:/.test(t),
};
const avalia = (rotulo, texto) => {
  const t = norm(texto);
  const r = Object.fromEntries(Object.entries(C).map(([k, f]) => [k, f(t) ? "SIM" : "nao"]));
  console.log(`${rotulo} | ${Object.entries(r).map(([k, v]) => `${k}=${v}`).join(" ")}`);
  return r;
};
const doc = readFileSync("/work/docs/deployment.md", "utf8").split(/\r?\n/);
const trecho = (ancora) => {
  const idx = doc.map((l, i) => (l.includes(ancora) ? i : -1)).filter((i) => i >= 0);
  if (idx.length !== 1) return { n: idx.length, linhas: null, texto: "" };
  const i = idx[0];
  let a = i, b = i;
  if (doc[i].startsWith("- ")) { while (b + 1 < doc.length && doc[b + 1].trim() !== "" && !doc[b + 1].startsWith("- ")) b++; }
  else { while (a > 0 && doc[a - 1].trim() !== "") a--; while (b + 1 < doc.length && doc[b + 1].trim() !== "") b++; }
  return { n: 1, linhas: `${a + 1}-${b + 1}`, texto: doc.slice(a, b + 1).join("\n") };
};
const modo = process.argv[2] ?? "real";
if (modo === "real") {
  for (const [rot, anc] of [["T1 docs via view", "- **view** — existe no banco **qualquer** view ou matview"], ["T2 docs MODO 6", "- **MODO 6** — existe view/matview"], ["T3 docs compose", "Regra operacional: nenhuma view"]]) {
    const t = trecho(anc); console.log(`${rot}: ancora_n=${t.n} linhas=${t.linhas}`); if (t.n === 1) avalia(rot, t.texto);
  }
  const rr = readFileSync("/work/src/database/runtime-role.ts", "utf8").split(/\r?\n/);
  let k = 0; while (k < rr.length && rr[k].startsWith("//")) k++;
  console.log(`T4 comentario runtime-role.ts: linhas=1-${k}`); avalia("T4 comentario runtime-role.ts", rr.slice(0, k).join("\n"));
  avalia("T5 RAISE MODO 6 (stderr capturado)", readFileSync("/tmp/zz-j05c4c3-modo6-comview.err", "utf8"));
  avalia("T6 message RuntimeRoleGuardError (capturado)", readFileSync("/tmp/zz-j05c4c3-msg-guarderror.txt", "utf8"));
  const log = readFileSync("/tmp/zz-j05c4c3-boot-b2-comview-enforce.seq", "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l).msg).join(" | ");
  console.log(`T7 o que o operador le no log (msgs do b2): ${log}`); avalia("T7 msgs do log b2", log);
} else {
  avalia("CTRL1 frase fabricada sem 'qualquer dono'", "Regra: nenhuma view nem matview sobre tabela FORCE, em nenhum esquema, sem olhar privilegio.");
  const t = trecho("ancora-que-nao-existe-zz-j05c4c3"); console.log(`CTRL3 ancora inexistente: ancora_n=${t.n}`);
}
````

### zz-j05c4c3-tapler.mjs — md5 `5d19fd61c8ee41452795790296f0993f`

````
// zz-j05c4c3-tapler.mjs — C3/junta 4: le um TAP do node --test pelo CORPO (nao so pelo resumo).
import { readFileSync } from "node:fs";
const t = readFileSync(process.argv[2], "utf8").split(/\r?\n/);
const resumo = Object.fromEntries(t.filter((l) => /^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) /.test(l)).map((l) => { const [, k, v] = /^# (\w+) (.*)$/.exec(l); return [k, v]; }));
const pontos = t.filter((l) => /^\s*(not )?ok \d+ - /.test(l));
const notok = pontos.filter((l) => /^\s*not ok /.test(l));
const skip = pontos.filter((l) => /# SKIP\b/i.test(l));
const todo = pontos.filter((l) => /# TODO\b/i.test(l));
const topo = pontos.filter((l) => /^(not )?ok \d+ - /.test(l));
const xx = t.filter((l) => /XX000/.test(l)).length;
console.log(JSON.stringify({ resumo, pontos_total: pontos.length, pontos_topo: topo.length, not_ok_no_corpo: notok.length, skip_no_corpo: skip.length, todo_no_corpo: todo.length, XX000: xx,
  not_ok: notok.map((l) => l.trim().slice(0, 200)), skips: skip.map((l) => l.trim().slice(0, 220)) }, null, 1));
````

### zz-j05c4c3-build-ctl.sh — md5 `07fe24e5c31a309a52fdc5a0814a604b`

````
#!/bin/sh
# zz-j05c4c3-build-ctl.sh — C3/junta 4, item 2: build normal; vermelho-controle (3) com erro de tipo proposital; restauro.
set -u
cd /work
F=src/database/runtime-role.ts
A='export const RUNTIME_ROLE_CAN_BYPASS_RLS = "RUNTIME_ROLE_CAN_BYPASS_RLS";'
B='export const RUNTIME_ROLE_CAN_BYPASS_RLS: number = "RUNTIME_ROLE_CAN_BYPASS_RLS";'
timeout 600 npm run build > /tmp/zz-j05c4c3-build.log 2>&1; echo "build_normal ec=$?"
echo "md5 antes: $(md5sum < $F | cut -c1-32)"
n=$(grep -cxF "$A" $F); echo "ancora_n=$n"; [ "$n" -eq 1 ] || { echo "ancora nao unica: aborto"; exit 2; }
cp $F /tmp/zz-j05c4c3-runtime-role.ts.pristino
node -e 'const fs=require("fs");const [f,a,b]=process.argv.slice(1);const t=fs.readFileSync(f,"utf8");if(t.split(a).length!==2)process.exit(3);fs.writeFileSync(f,t.replace(a,b))' $F "$A" "$B"; echo "mutacao ec=$?"
echo "diff_linhas=$(diff /tmp/zz-j05c4c3-runtime-role.ts.pristino $F | grep -c '^[<>]') mutante_presente=$(grep -cxF "$B" $F)"
timeout 600 npm run build > /tmp/zz-j05c4c3-build-mut.log 2>&1; echo "build_mutado ec=$?"
grep -E "error TS" /tmp/zz-j05c4c3-build-mut.log | head -5
cp /tmp/zz-j05c4c3-runtime-role.ts.pristino $F
echo "md5 restaurado: $(md5sum < $F | cut -c1-32)"
timeout 600 npm run build > /tmp/zz-j05c4c3-build-irmao.log 2>&1; echo "build_restaurado ec=$?"
````

### zz-j05c4c3-dirigidos.sh — md5 `5ad1e555620386eaec25ed0863da1432`

````
#!/bin/sh
# zz-j05c4c3-dirigidos.sh — C3/junta 4, item 2(b): os tres arquivos dirigidos, um por vez, pelo runner do repositorio.
cd /work
for f in san3-05-runtime-role-bootstrap san3-05-acessos-de-plataforma-guard san3-05-leituras-de-plataforma-db; do
  timeout 900 npm test -- tests/$f.test.ts > /tmp/zz-j05c4c3-dir-$f.tap 2> /tmp/zz-j05c4c3-dir-$f.err; echo "$f ec=$?"
  grep -E "^# (tests|pass|fail|skipped|cancelled) " /tmp/zz-j05c4c3-dir-$f.tap | tr '\n' ' '; echo
done
````

### zz-j05c4c3-linger.sh — md5 `ea8a5a635641d20473232a5d1d3a1fa4`

````
#!/bin/sh
# zz-j05c4c3-linger.sh — C3/junta 4: R rodadas de K boots recusados em paralelo (superusuario, como o T15, com enforce);
# mede falha->close e a ordem da sonda de login. uso: sh zz-j05c4c3-linger.sh <K> <R> <tag>
K=${1:-1}; R=${2:-1}; tag=${3:-iso}
cd /work
r=0
while [ $r -lt $R ]; do
  r=$((r+1)); i=0
  while [ $i -lt $K ]; do i=$((i+1)); timeout 90 node /tmp/zz-j05c4c3-boot.mjs lg-$tag-$r-$i enforce refuse > /tmp/zz-j05c4c3-lg-$tag-$r-$i.json 2>&1 & done
  wait
done
node -e '
const fs=require("fs");const tag=process.argv[1];
const fs2=fs.readdirSync("/tmp").filter(f=>f.startsWith("zz-j05c4c3-lg-"+tag+"-")&&f.endsWith(".json")).sort();
const rows=fs2.map(f=>{const j=JSON.parse(fs.readFileSync("/tmp/"+f,"utf8"));const seq=fs.readFileSync("/tmp/zz-j05c4c3-boot-"+j.label+".seq","utf8");
 const iL=seq.indexOf("Login sem organiza");const iF=seq.indexOf("Failed to start");
 return {label:j.label,code:j.close_code,sig:j.close_signal,falha_ms:j.failed_ms,close_ms:j.duracao_ms,falha_ate_close_ms:j.failed_ms==null?null:j.duracao_ms-j.failed_ms,sonda_login:iL<0?"ausente":(iL<iF?"antes":"depois"),stoppedBy:j.stoppedBy,codigo:j.primeira_falha_tem_codigo}});
for(const r of rows)console.log(JSON.stringify(r));
const g=rows.map(r=>r.falha_ate_close_ms).filter(x=>x!=null).sort((a,b)=>a-b);
console.log(JSON.stringify({tag,N:rows.length,code1:rows.filter(r=>r.code===1).length,gap_min:g[0],gap_mediana:g[Math.floor(g.length/2)],gap_max:g[g.length-1],gap_maior_que_5s:g.filter(x=>x>5000).length,sonda_depois:rows.filter(r=>r.sonda_login==="depois").length}));
' "$tag"
````

### zz-j05c4c3-hook.cjs — md5 `ded05064005909090346ad0e8b13f24a`

````
// zz-j05c4c3-hook.cjs — C3/junta 4: so no processo src/server.ts, a cada 1 s, lista recursos ativos e sockets TCP (porta remota).
if (process.argv.some((a) => a.endsWith("src/server.ts"))) {
  const t0 = Date.now();
  setInterval(() => {
    const socks = process._getActiveHandles().filter((h) => h && h.constructor && h.constructor.name === "Socket" && typeof h.remotePort === "number").map((h) => `tcp->${h.remotePort}`);
    process.stderr.write(`ZZHOOK t=${Date.now() - t0} recursos=${process.getActiveResourcesInfo().join(",")} sockets=${socks.join(",")}\n`);
  }, 1000).unref();
}
````

## Objeto no fim e limpeza (21:08–21:11Z; gravado 21:10Z)
- Objeto no fim (21:08Z): `git ls-remote` = `gh pr view 405 headRefOid` = **`10fbbd983eb81243e424c011d4b922eb6434ccf2`** — andou. `git merge-base --is-ancestor 84831ad9 10fbbd98` → sim; `git log --format=%h 84831ad9..10fbbd98` = 1 commit; `git diff --name-only` = `ciclo4/C2-evidencia.md`, `ciclo4/C2-voto.json` (não abertos); fora de `agent-orchestration/` = 0 → delta só registro. **Medi `84831ad9`**; o produto de `10fbbd98` é o mesmo. `origin/main` no fim = `a9bbde382213627545e9d229c9ab616d83a0a840` (= início).
- Cluster: processos `src/server.ts` vivos 0; papéis `zz_j05c4c3%` 0, `s305%` 0, views 0, bancos extras 0; arquivos de URL/senha apagados no container antes da remoção.
- Containers: `docker rm -f -v` j05c4-c3-node / j05c4-c3-redis / j05c4-c3-pg → ec=0 ×3; `docker network rm j05c4-c3-net` ec=0; `docker ps -a --filter name=j05c4-c3-` = 0; redes = 0; volumes anônimos `8a2387444312…` (pg) e `a7bea646a896…` (redis) → removidos (`docker volume inspect` falha). Nenhum `volume prune`/`system prune`. `docker ps -a` no fim: só `erp-postgres-alt`, `pastrack-teste-banco-teste-1`, `erp-postgres`, `erp-redis` (Exited, nunca tocados).
- Árvore temporária `/c/Users/AMP/t-j05c4c3-*`: 0.
- Worktree: processos com `w-j05c4c3` na linha de comando (PowerShell `Get-CimInstance Win32_Process`) = **0**; `git status --short` = 0; `git -C C:/Users/AMP/w-o05 worktree remove --force C:/Users/AMP/w-j05c4c3` ec=0; diretório ausente; `worktree list | grep -ic w-j05c4c3` = 0 no `w-o05` e no checkout principal.
- `$SCRATCH` (`…/scratchpad/c3`) removido (sem segredo; textos e md5 no apêndice).
- `w-o05`: novos meus = só `ciclo4/C3-evidencia.md` e `ciclo4/C3-voto.json`; os 33 ` M` são os fantasmas de `.agents/` sob autocrlf e o `scratchpad/` (pl05c2/pl05c2s) é resíduo alheio de 08/10 (R1 do inspetor) — reportado, não varrido.
- Disco `df -h /c`: 13 GB no início · 12 GB depois do `npm ci` · 12 GB no fim.
- Base viva (`erp-postgres`/`erp-redis`, 5432/6379/55432 do host): nunca alvo; meus containers sem porta publicada.

## Fecho (21:10Z)
- Itens: 1 VERDE · 2 MEDIDO com achado não grave A2-1 · 3 diz a regra com notas N3-a/N3-b. Nenhum achado `grave`; nenhum item não medido.
- Voto: **APROVADO** (detalhe em `C3-voto.json`). Não li nenhum `ciclo4/C1-*` nem `ciclo4/C2-*`.
