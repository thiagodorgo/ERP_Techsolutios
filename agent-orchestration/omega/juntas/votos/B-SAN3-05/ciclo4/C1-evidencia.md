papel: C1 | identidade: jurado-san305-c4-catalogo-de-views | modelo: Claude Opus 5.5 (claude-opus-5-5) (substituição §C7.6-bis: D-FABLE-ASTRA-SO-DINHEIRO — Fable só em bloco de dinheiro; este bloco não toca dinheiro) | mandato_md5: d5848406ab33b7aa0aa192a6328e590c (declarado no disparo: d5848406ab33b7aa0aa192a6328e590c) | corpo_md5: 45b6126fee088767c15f736f0b1c717e (.claude/ no objeto; espelho .agents/ f6e0b15bd03cc82abdb41949e734e569 = só o cabeçalho Codex) (recebido no prompt: n/a — lançada como general-purpose e o corpo foi lido do blob por git show, md5 = o declarado no disparo 45b6126f…)

# Evidência — cadeira C1 — junta 4 (ciclo 4) do B-SAN3-05 (PR 405) — catálogo de views

Forma: cada item registra comando → saída resumida → veredito parcial, gravado ao ser medido (P1/P2). Hora em UTC por `date -u`.

## 0. Legalidade e terreno (antes do mérito)

### 0.1 Objeto (duas fontes) — 2026-10-09T19:43:07Z
- `git fetch origin main fix/runtime-role-sem-bypass` ec=0
- `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` → `79b0d594b137c4b65640a2da6ac4e61b8e3ddc7f`
- `gh pr view 405 --json headRefOid,baseRefName,state,isDraft,mergeable` → `{"baseRefName":"main","headRefOid":"79b0d594b137c4b65640a2da6ac4e61b8e3ddc7f","isDraft":true,"mergeable":"CONFLICTING","state":"OPEN"}`
- Coincidem: **objeto = 79b0d594b137c4b65640a2da6ac4e61b8e3ddc7f**. `origin/main` no início = `a9bbde382213627545e9d229c9ab616d83a0a840`.
- Cerca do mandato (pré-voo do C1c4) = `2400049bf8ec421c3f65a07884c6394d4ab208bc` (= objeto do inspetor). `git diff --name-only 2400049b 79b0d594` = 4 arquivos, todos registro: `00-mandatos/C1c4.md`, `00-mandatos/C2c4.md`, `00-mandatos/C3c4.md`, `ciclo4/00-inspetor-terreno.md`. **HC→H0: delta só registro** (R4 do inspetor).
- Objeto do dev `737e8cf3` → objeto: `git diff --name-only 737e8cf3 79b0d594 | grep -vE '^(agent-orchestration/|\.claude/agents/|\.agents/agents/)'` → vazio (ec=1). **Só registro.**

### 0.2 Check-runs no objeto
- `gh api 'repos/thiagodorgo/ERP_Techsolutios/commits/79b0d594…/check-runs?per_page=100' > checkruns.json` ec=0; filtro `node` (total_count; não-verdes = completed ∧ conclusion≠success; pendentes = status≠completed):
  `total=7 listados=7 · nao_verdes=0 · pendentes=0` — docker 19:40:54Z, backend 19:37:57Z, **backend-postgres completed success 19:33:17Z**, authority-portal, flutter, owner-portal, frontend: todos `completed success`.
- Veredito parcial: VERDE (R4 do inspetor cumprida: head novo com check-runs concluídos).

### 0.3 Parecer do inspetor da junta 4
- `git show 79b0d594:agent-orchestration/omega/juntas/votos/B-SAN3-05/ciclo4/00-inspetor-terreno.md` — instância `inspetor-de-terreno-da-junta` (Opus 5.5, substituição declarada), aberto 19:14Z, fechado 19:28Z, objeto `2400049b`, **LIBERADO COM RESSALVA** (R1 resíduo alheio inerte · R2 disco 11 GB · R3 disparo general-purpose com md5 do corpo · R4 objeto que andar).
- A tabela do veredito confere **este nome** (`jurado-san305-c4-catalogo-de-views`), **este corpo** (`45b6126fee088767c15f736f0b1c717e`, rastreado nos dois espelhos), worktree `C:/Users/AMP/w-j05c4c1` (livre) e containers `j05c4-c1-*` sem porta. Confere.
- Veredito parcial: VERDE — legalidade: LIBERADO COM RESSALVA vale para esta cadeira.

### 0.4 Decisões no objeto (§A7)
- `git show 79b0d594:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n …`: `D-FABLE-ASTRA-SO-DINHEIRO` l.2982 · R3 l.3004 · R4 l.3009 · **D-405-PROIBIR-VIEWS** l.3013. Lidas: R3/R4 verbatim iguais às do corpo; D-405-PROIBIR-VIEWS: "a trava recusa o boot (e o script recusa no MODO 6) se existir QUALQUER view ou matview cuja árvore alcance uma tabela com FORCE ROW LEVEL SECURITY, sem analisar dono nem privilégio. Hoje há 0 views; nenhuma funcionalidade quebra."

### 0.5 Corpo e mandato
- `git show <objeto>:.claude/agents/especialistas/jurado-san305-c4-catalogo-de-views.md | tr -d '\r' | md5sum` = `45b6126fee088767c15f736f0b1c717e` (= disparo). Espelho `.agents/` = `f6e0b15bd03cc82abdb41949e734e569`; `diff` dos dois = só `tools:` removida e o bloco "Papel para o Codex" (transformação do sync).
- Mandato `00-mandatos/C1c4.md`: disco `tr -d '\r' | md5sum` = `d5848406ab33b7aa0aa192a6328e590c` = blob no objeto = disparo.
- Nome desta sessão não coincide com nenhum inelegível (identidade nova; obituário conferido em 0.6).

### 0.6 Terreno do host
- `uname -a` (host): `MINGW64_NT-10.0-22631 N3SOH82 3.6.6-1cdd4371.x86_64 2026-01-15 22:20 UTC x86_64 Msys`; `docker version` servidor `29.6.1`; `df -h /c` = 11G livres (96%).
- `docker ps -a` no início: `erp-postgres-alt` (Exited 3 sem), `pastrack-teste-banco-teste-1` (Exited), `erp-postgres` (Exited 29 h), `erp-redis` (Exited 29 h). Nenhum `j05c4-` — nenhuma outra cadeira de pé. Base viva DESLIGADA e nunca alvo.
- `ls -d C:/Users/AMP/w-j05c4c1` → inexistente (livre).
- Ambiente: Git Bash (MSYS) no Windows 11; nenhuma variável exportada; `MSYS_NO_PATHCONV=1` só como prefixo. SCRATCH = `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c1`.

### 0.7 Normas citadas na ref julgada (§A7) — 19:46Z
- `md5 EOL-neutro CLAUDE.md` objeto = `a9419a55a77ea2adfd61a6ce80e77a27` = origin/main (idênticos: a norma é a mesma nas duas refs).
- `git show <ref>:CLAUDE.md | grep -c '<âncora>'` (obj/main): `INSPEÇÃO DE TERRENO ANTES DE TODA JUNTA` 1/1 · `ESCOPO DO VEREDITO E CALIBRAÇÃO` 1/1 · `4-bis. **SEPARAÇÃO DE PAPÉIS` 1/1 · `6-bis. **ESGOTADO O FABLE` 1/1 · `P7 — Pausa ordenada` 1/1 · `GOVERNANÇA PROPORCIONAL` 1/1 · `(1) Junta proporcional ao risco` 1/1 · `(2) Teto de 2 ciclos` 1/1 (l.624: "A partir do ciclo 3, só bloqueia…") · `(5) KPI congelado` 1/1 · `A7. Onde se MEDE` 1/1 · `A2. Regra de conflito` 1/1 · `Paradas imediatas irredutíveis` 1/1 · `C5. Limpeza` 1/1. (Âncoras com `\*\*` + prefixo "1-bis."/"1-ter." deram 0 por quebra de linha/escape — refeitas com texto da mesma linha: 1.)
- Veredito parcial: VERDE — todas as normas aplicadas existem na ref julgada.

### 0.8 Worktree próprio
- `git -C <principal> worktree add --detach C:/Users/AMP/w-j05c4c1 79b0d594` ec=0; `test -e C:/Users/AMP/w-j05c4c1/.git` → 0; `rev-parse HEAD` = `79b0d594b137c4b65640a2da6ac4e61b8e3ddc7f`.

### 0.9 Objeto do disparo e nascimento dos arquivos (escopo)
- `git show <objeto>:…/ciclo4/DEV-relatorio.md` l.7: "Head do disparo: `7c63f920c996cf105535f345eec2ee10461c77a3`". `git log --oneline 37c83064..79b0d594`: 7c63f920 (plano) → a10fc267 → **afb575b4 fix(database)** → d66eb178 → 941c9ea7 → 2fee8d28 → 737e8cf3 → 2400049b → 79b0d594. Uso `7c63f920..79b0d594` como o que o ciclo mudou.
- `git diff --stat 7c63f920 79b0d594 --`: `runtime-role.ts` 9+/16− · `runtime-role.bootstrap.ts` **sem diferença** · `db-runtime-role.sh` 8+/24− · `san3-05-runtime-role-guard-db.test.ts` 232+/185−.
- `git log --diff-filter=A` no objeto: `runtime-role.ts`/`runtime-role.bootstrap.ts` nasceram em `d76b255f` (2026-10-02), `db-runtime-role.sh` em `041e414b` (2026-10-02), o arquivo de guarda em `e0143db1` (2026-10-03); `git merge-base --is-ancestor <c> origin/main` ec=1 nos três (não estão na main; merge-base do ramo `c8af6458`). **Nasceram neste bloco** → defeito neles é `dentro-do-bloco`.

### 0.10 Condutor do terreno (adaptado da receita)
- Receita `C:/Users/AMP/erp-terreno/receita-pg16.sh` md5 EOL-neutro `9861a2aaa55fc49fcf1c4263261a3668` (= o citado pelo inspetor). Não a executei: ela derruba tudo no `trap EXIT`. Escrevi `$SCRATCH/condutor-setup.sh` (md5 EOL-neutro `2dcc134c4169539def0732c67b7ec933`, `bash -n` ec=0) com o MESMO procedimento das seções 1–4 da receita, prefixo `j05c4-c1-`, sem `trap EXIT` (containers ficam de pé até o meu teardown), e a segunda árvore do disparo. Diferenças à receita: (i) nomes fixos `j05c4-c1-net/-pg/-node` em vez de `pg16r-<sha>-<rand>`; (ii) árvore temporária `/c/Users/AMP/t-j05c4c1`, removida logo após a cópia; (iii) sem suíte nem teardown no mesmo script; (iv) +segunda árvore `7c63f920` com 3 arquivos em `/tmp/zz-j05c4c1-old/` no container; (v) senha num arquivo 600 do scratchpad (para os comandos seguintes a lerem por ambiente — nunca argv).
- Execução 19:49:16Z, `timeout 1500 bash condutor-setup.sh` → **ec=0**:
  - `subiram: rede=j05c4-c1-net pg=j05c4-c1-pg volume=e81906ca…(anônimo) node=j05c4-c1-node portas_pg=0 portas_node=0` (sem porta no host)
  - `postgres (PostgreSQL) 16.14 (Debian 16.14-1.pgdg13+1)`
  - `arvore objeto: blobs=3774 byte_identicos=3774` (`git hash-object --no-filters` × `ls-tree`) · `container: md5sum -c de 3774 arquivos -> 0 divergencia` · árvore temporária removida
  - segunda árvore (disparo `7c63f920`), md5 blob = container: `runtime-role.ts` `692d953d26aafa8d40d6902fca2bccfc` · `runtime-role.bootstrap.ts` `373cb2e22b979f0c7f4b8b2328716d57` · `db-runtime-role.sh` `911fddc132af8fa3c3d7fc976b7b6efe`
  - container: `node v20.20.2 · npm 10.8.2 · psql (PostgreSQL) 16.14 · Linux 6.18.33.2-microsoft-standard-WSL2`
  - `npm ci ec=0 (added 326 packages in 20s)` · `prisma generate ec=0` · `prisma migrate deploy ec=0 (107 migrations found)`
  - `senha nos logs do setup: 0`
- Disco: 11 GB livres antes e depois do `npm ci` (dentro do container).

## Item 1 — um banco por caso: COL, COM, MAT, cadeia, CTL e formas próprias (trava REAL, boot real, MODO 6)

### 1(a) A propriedade escrita no objeto (blob `79b0d594`, arquivo:linha) — 19:53Z
Comando: leitura de `git show <objeto>:<f>` + `grep -c` por arquivo.

| | trava `src/database/runtime-role.ts` | `DO` de `scripts/db-runtime-role.sh` | linha final do script |
|---|---|---|---|
| (1) raiz da recursão | l.14 `SELECT v.oid, v.oid FROM pg_class v WHERE v.relkind IN ('v','m')` — toda `v`/`m`, **sem filtro de esquema** | l.82, idem | l.125, idem |
| (2) descida | l.18-20 `JOIN pg_rewrite rw ON rw.ev_class = w.leaf_oid` (**toda regra** do nó, não só `_RETURN`) → `pg_depend` (`classid=pg_rewrite`, `objid=rw.oid`, `refclassid=pg_class`) → `dep.relkind IN ('v','m')`; `UNION` (profundidade ilimitada, termina por deduplicação) | l.86-88, idem | l.129-131, idem |
| (3) chegada (`view_force`) | l.21-27: para todo `(root, leaf)`, regra de `leaf` que depende de `t` com `relkind IN ('r','p') AND relforcerowsecurity` → `root_oid` | l.89-95, idem | l.132-138, idem |
| (4) filtro restante | **nenhum** de dono, privilégio, esquema ou pertença no CTE nem no ramo `view` (l.44-49 só agrupa por dono para relatar) | **nenhum** no ramo `view` (l.103) | — |
| (5) o que sai | `via='view'`, `rolname` = dono da RAIZ, `objetos = count(DISTINCT v.oid)` por dono (l.44-45) | `'view', v.oid::regclass::text` (l.103) → `RAISE … por % via(s): view:<regclass> … (MODO 6)` (l.105-106) | `(SELECT count(*) FROM view_force) AS views` (l.142) |
| (6) `view_escape` | `grep -c` = **0** | `grep -c` (arquivo inteiro) = **0** | — |

- Outros `grep -c` no objeto: `WITH RECURSIVE view_walk` trava=1, script=2; `has_table_privilege` trava=0, script=1 (l.143, só a coluna `dml` da linha final — não decide o `ec`); `o.rolsuper OR o.rolbypassrls` = 0 nos dois. No disparo `7c63f920`: `view_escape` trava=2, script=4 (o filtro antigo existia).
- Observação (leitura, a medir em (b)/(c)): a propriedade não olha `pg_depend` além de `pg_rewrite`→`pg_class`; dependência que não passe por regra de view/matview (corpo de função, regra em TABELA, herança, partição) fica fora do alcance — por construção, e coerente com o C4.6 (regra em tabela/`SECURITY DEFINER`/herança/partição lida direto = fora).
- Veredito parcial 1(a): a propriedade escrita = a da `D-405-PROIBIR-VIEWS` (qualquer v/m, qualquer esquema/dono/privilégio, árvore por regra → tabela FORCE). Sem divergência de propriedade nas três cópias.

### 1(b)/(c) Terreno das sondas — 20:00Z
- GUC e forma de política conferidos: `git grep -c "current_setting('app.current_tenant_id'" <objeto> -- prisma/migrations` = 64 arquivos / 208 ocorrências; no banco migrado `pg_policies` public = 107, 104 com `app.current_tenant_id`, forma real `USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)` e `WITH CHECK` idêntico. As fixtures usam `USING` **e** `WITH CHECK` por `current_setting('app.current_tenant_id', true)` (tenant `text`).
- Sonda `/tmp/zz-j05c4c1-sonda/caso.ts` (fonte em `$SCRATCH/caso.ts`, 238 linhas, md5 EOL-neutro **`dcd656f91264d2f6c7354da289ba85e4`** = md5 dentro do container). Roda com `cwd=/work`, `node --import tsx`; `pg`/Prisma por `createRequire('/work/package.json')`; importa **a trava REAL** `${base}/src/database/runtime-role.ts` (`probeRuntimeRolePosture`) e **o boot real** `${base}/src/database/runtime-role.bootstrap.ts` (`assertRuntimeDatabaseRoleIfEnforced({enforce:true, loadClient, logger: espião, attempts:1})`), com cliente `PrismaClient({adapter: PrismaPg})` do leitor; o MODO 6 é `bash ${base}/scripts/db-runtime-role.sh` com `PGDATABASE=<banco do caso>`, `DB_RUNTIME_ROLE=<papel novo>` e senha aleatória por execução **só no ambiente do filho**; `base=/work` (objeto) ou `/tmp/zz-j05c4c1-old` (disparo `7c63f920`; `src/config` → link para `/work/src/config` DENTRO do container, para o `env.ts` resolver — o bootstrap é byte-idêntico entre disparo e objeto).
- Ambiente das sondas: o do arquivo de guarda (`DATABASE_URL` só; `NODE_ENV` ausente → `development`). Senhas: superusuário do cluster e leitores por `docker exec -e PGPASSWORD -e RPW` sem valor; a sonda substitui as duas por `<PGPW>`/`<RPW>` em toda mensagem e conta a senha do script na saída dele.
- Um banco por caso: `CREATE DATABASE j05c4c1_<caso> TEMPLATE erp_techsolutions` (o banco migrado do objeto, 107 migrações); papéis `j05c4c1_<caso>_{own,rsel,rupd,rins,rnone,rdir,ranc,rt,rto}` (`own` NOLOGIN NOSUPERUSER NOBYPASSRLS; leitores `LOGIN NOSUPERUSER NOBYPASSRLS NOREPLICATION NOINHERIT`, nunca `GRANT … ON ALL TABLES`; `rt`/`rto` = papéis de runtime NOVOS, `NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOREPLICATION NOCREATEDB NOCREATEROLE`, nunca passaram pelo script). Fixture comum: `zz_t` ENABLE+**FORCE** com política USING+WITH CHECK e linhas A,B,B; `zz_n` RLS ligada **sem** FORCE, linhas A,B.

### 1 — ESPERADO escrito ANTES de medir (implicação da propriedade de 1(a))
| caso | montagem | trava (cada leitor) | boot | MODO 6 (papel novo) |
|---|---|---|---|---|
| COL | `zz_w` (dono postgres) → `zz_t`; rsel `SELECT(tenant_id,value)`, rupd `UPDATE(value)`, rins `INSERT(tenant_id,value)`; rt/rto `SELECT(cols)` | `["view/postgres/1"]` p/ rsel, rupd, rins, rnone | recusa `RuntimeRoleGuardError` `RUNTIME_ROLE_CAN_BYPASS_RLS`, escapes `view:postgres` | ec=3, `MODO 6`, `por 1 via(s): view:zz_w.` |
| COM | `zz_v` (dono own) → `zz_t`, sem grant | `["view/j05c4c1_com_own/1"]` (rnone) | recusa | ec=3, `view:zz_v` |
| MAT | matview `zz_m` (dono own, WITH NO DATA) → `zz_t`, sem grant | `["view/j05c4c1_mat_own/1"]` | recusa | ec=3, `view:zz_m` |
| cadeia | `zz_v` (dono own) → `zz_w` (dono postgres) → `zz_t`; rsel SELECT só em `zz_v` | as DUAS raízes alcançam `zz_t`: `["view/j05c4c1_cad_own/1","view/postgres/1"]` | recusa (2 escapes) | ec=3, `por 2 via(s): view:zz_v, view:zz_w.` |
| CTL | `zz_c` (dono postgres) → `zz_n` (sem FORCE); rsel SELECT | `[]` | aceito, `enforced:true`, 0 escape | ec=0; linha final `…|f|f|f|f|0|0|<dml>` (posse=0, views=0) |
| F1 (própria) | esquema `outro` (USAGE ao rsel): `v_sub` (só `EXISTS`), `v_cte` (só CTE), `v_lat` (só `LATERAL`), `v_agg` (`count(*)`) → `zz_t`, dono postgres | `["view/postgres/4"]` | recusa | ec=3, 4 vias `view:outro.v_agg/v_cte/v_lat/v_sub` |
| F2 (própria) | `zz_r` (dono postgres) → `zz_n` (SEM FORCE) na `_RETURN`; `CREATE RULE zz_r_ins AS ON INSERT TO zz_r DO INSTEAD INSERT INTO zz_t …`; rins INSERT na view | a regra NÃO-`_RETURN` tem `ev_class = zz_r` e depende de `zz_t` → `["view/postgres/1"]` | recusa | ec=3, `view:zz_r` |
| F3 (própria) | `zz_p` **particionada** (`relkind p`) ENABLE+FORCE, partições `zz_p_a/_b`; `outro.zz_v1` → `zz_p`; matview `zz_m2` → `outro.zz_v1`; `outro.zz_v3` (`security_barrier`) → `zz_m2`; `zz_inv` (`security_invoker`) → `zz_p`; dono postgres | 4 raízes alcançam `zz_p` (p, FORCE) → `["view/postgres/4"]` | recusa | ec=3, 4 vias |
| F4 (própria) | sessão VIVA do superusuário cria `TEMP VIEW zz_tv` → `zz_t` durante a medição | `pg_class` mostra a temp de outra sessão → `["view/postgres/1"]` | recusa | ec=3, `view:pg_temp_N.zz_tv` |
| F5 (própria, fronteira do `pg_depend`) | `zz_fv` (dono postgres) `SELECT … FROM zz_f()`, `zz_f` SQL `RETURNS TABLE(text,text)` SECURITY INVOKER que lê `zz_t` | a regra depende da FUNÇÃO, não de `zz_t` → `[]` (NÃO recusa) | aceito | ec=0 |

- Discriminação (controle 2): no código do disparo `7c63f920` (com `view_escape` por privilégio de TABELA), o COL tem de passar: trava `[]` para rsel/rupd/rins e script `ec=0`.
- F5: se a trava não recusa, o que decide a gravidade é o ESCAPE: espero rsel `42501` (a função roda como o invocador, sem privilégio em `zz_t`) e rdir (SELECT em `zz_fv` e em `zz_t`) só `A` sob A. Se o rsel ler B, é escape fora do alcance do `pg_depend` → grave.

### 1(b) Montagem — 19:58:47Z
- `for c in col com mat cad ctl f1 f2 f3 f4 f5: RPW=… PXENV='-e RPW' bash px.sh … node --import tsx /tmp/zz-j05c4c1-sonda/caso.ts montar $c` → ec=0 nos 10; views de usuário por banco: col 1 · com 1 · mat 1 · cad 2 · ctl 1 · f1 4 · f2 1 · f3 4 · f4 0 (a temp nasce na medição) · f5 1. Segredos nas saídas: RPW 0, PGPW 0.

### 1(b) COL — objeto (`medir col new`, 19:59:03Z, ec=0; saída íntegra em `$SCRATCH/med/medir-col-new.jsonl`)
```
{"caso":"col","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"public.zz_w","tabela":false,"coluna":true}
{"caso":"col","arvore":"new","passo":"ancora","leitor":"rupd","objeto":"public.zz_w","tabela":false,"coluna":true}
{"caso":"col","arvore":"new","passo":"ancora","leitor":"rins","objeto":"public.zz_w","tabela":false,"coluna":true}
{"caso":"col","arvore":"new","passo":"ancora","leitor":"rnone","objeto":"public.zz_w","tabela":false,"coluna":false}
{"caso":"col","arvore":"new","passo":"efeito","superusuario_le":"A,B,B","rdir_sem_guc":0,"rdir_ctx_A":["A"],"rsel_view_ctx_A":["A","B","B"],"rupd_rowCount":3,"linhas_B_tocadas":2,"rins_ok":true,"linhas_B_inseridas":1}
{"caso":"col","arvore":"new","passo":"trava","leitor":"rsel","session_user":"j05c4c1_col_rsel","linhas":["view/postgres/1"]}
{"caso":"col","arvore":"new","passo":"boot","leitor":"rsel","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"col","arvore":"new","passo":"boot_log_segredo","leitor":"rsel","ocorrencias_rpw":0,"ocorrencias_pgpw":0}
{"caso":"col","arvore":"new","passo":"trava","leitor":"rupd","session_user":"j05c4c1_col_rupd","linhas":["view/postgres/1"]}
{"caso":"col","arvore":"new","passo":"boot","leitor":"rupd","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"col","arvore":"new","passo":"boot_log_segredo","leitor":"rupd","ocorrencias_rpw":0,"ocorrencias_pgpw":0}
{"caso":"col","arvore":"new","passo":"trava","leitor":"rins","session_user":"j05c4c1_col_rins","linhas":["view/postgres/1"]}
{"caso":"col","arvore":"new","passo":"boot","leitor":"rins","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"col","arvore":"new","passo":"boot_log_segredo","leitor":"rins","ocorrencias_rpw":0,"ocorrencias_pgpw":0}
{"caso":"col","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_col_rnone","linhas":["view/postgres/1"]}
{"caso":"col","arvore":"new","passo":"boot","leitor":"rnone","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"col","arvore":"new","passo":"boot_log_segredo","leitor":"rnone","ocorrencias_rpw":0,"ocorrencias_pgpw":0}
{"caso":"col","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_col_rt","ec":3,"sinal":null,"ms":26,"stderr_linhas":["ERROR:  papel j05c4c1_col_rt ainda escapa de RLS por 1 via(s): view:zz_w. posse → ALTER TABLE ... OWNER TO postgres e rode de novo (MODO 3); view → nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma e rode de novo (MODO 6)"],"stdout_ultima":"","senha_script_em_saida":0}
```
- Âncora: rsel/rupd/rins tabela=f coluna=t; rnone f/f — **privilégio só de coluna** (= esperado).
- Efeito real: superusuário lê `A,B,B`; rsel pela view sob A lê `A,B,B` (**lê B**); rupd `UPDATE` sem WHERE altera 3 linhas, **2 de B** (contadas pelo superusuário); rins grava **1 linha de B** sob A. O escape que a regra fecha EXISTE na montagem.
- Trava REAL: `["view/postgres/1"]` para rsel, rupd, rins e rnone (= esperado). Boot real: `RuntimeRoleGuardError` `RUNTIME_ROLE_CAN_BYPASS_RLS`, escapes `view:postgres`, nos 4; log do boot sem RPW/PGPW (0/0). MODO 6: **ec=3**, `por 1 via(s): view:zz_w.` … `(MODO 6)`; senha do script na saída = 0.
- Veredito parcial COL (objeto): RECUSADO pela trava, pelo boot e pelo MODO 6. VERDE.

### 1(b) COL — código do DISPARO `7c63f920` (controle de discriminação, `medir col old`, ec=0)
```
{"caso":"col","arvore":"old","passo":"trava","leitor":"rsel","session_user":"j05c4c1_col_rsel","linhas":[]}
{"caso":"col","arvore":"old","passo":"boot","leitor":"rsel","resultado":"aceito","enforced":true,"escapes":0,"log":["info:runtime database role verified"]}
{"caso":"col","arvore":"old","passo":"boot_log_segredo","leitor":"rsel","ocorrencias_rpw":0,"ocorrencias_pgpw":0}
{"caso":"col","arvore":"old","passo":"trava","leitor":"rupd","session_user":"j05c4c1_col_rupd","linhas":[]}
{"caso":"col","arvore":"old","passo":"boot","leitor":"rupd","resultado":"aceito","enforced":true,"escapes":0,"log":["info:runtime database role verified"]}
{"caso":"col","arvore":"old","passo":"boot_log_segredo","leitor":"rupd","ocorrencias_rpw":0,"ocorrencias_pgpw":0}
{"caso":"col","arvore":"old","passo":"trava","leitor":"rins","session_user":"j05c4c1_col_rins","linhas":[]}
{"caso":"col","arvore":"old","passo":"boot","leitor":"rins","resultado":"aceito","enforced":true,"escapes":0,"log":["info:runtime database role verified"]}
{"caso":"col","arvore":"old","passo":"boot_log_segredo","leitor":"rins","ocorrencias_rpw":0,"ocorrencias_pgpw":0}
{"caso":"col","arvore":"old","passo":"trava","leitor":"rnone","session_user":"j05c4c1_col_rnone","linhas":[]}
{"caso":"col","arvore":"old","passo":"boot","leitor":"rnone","resultado":"aceito","enforced":true,"escapes":0,"log":["info:runtime database role verified"]}
{"caso":"col","arvore":"old","passo":"boot_log_segredo","leitor":"rnone","ocorrencias_rpw":0,"ocorrencias_pgpw":0}
{"caso":"col","arvore":"old","passo":"modo6","script":"/tmp/zz-j05c4c1-old/scripts/db-runtime-role.sh","papel":"j05c4c1_col_rto","ec":0,"sinal":null,"ms":68,"stderr_linhas":[],"stdout_ultima":"j05c4c1_col_rto|f|f|f|f|0|0|117","senha_script_em_saida":0}
```
- Código antigo: trava `[]` para rsel/rupd/rins/rnone, boot **aceito** (`enforced:true`, 0 escape), script **ec=0** com linha final `j05c4c1_col_rto|f|f|f|f|0|0|117` (views=0). **O caso COL discrimina o antes do depois** (controle 2 do item 1: VERDE).

### 1(b) COM, MAT, cadeia, CTL — objeto (`medir <c> new`, 19:59:33Z, ec=0 nos 4; logs de boot sem RPW/PGPW em todos)
```
{"caso":"com","arvore":"new","passo":"ancora","leitor":"rnone","objeto":"public.zz_v","tabela":false,"coluna":false}
{"caso":"com","arvore":"new","passo":"efeito","rnone_view":"42501 permission denied for view zz_v"}
{"caso":"com","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_com_rnone","linhas":["view/j05c4c1_com_own/1"]}
{"caso":"com","arvore":"new","passo":"boot","leitor":"rnone","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:j05c4c1_com_own"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"com","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_com_rt","ec":3,"sinal":null,"ms":31,"stderr_linhas":["ERROR:  papel j05c4c1_com_rt ainda escapa de RLS por 1 via(s): view:zz_v. posse → ALTER TABLE ... OWNER TO postgres e rode de novo (MODO 3); view → nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma e rode de novo (MODO 6)"],"stdout_ultima":"","senha_script_em_saida":0}
{"caso":"mat","arvore":"new","passo":"ancora","leitor":"rnone","objeto":"public.zz_m","tabela":false,"coluna":false}
{"caso":"mat","arvore":"new","passo":"efeito","rnone_matview":"42501 permission denied for materialized view zz_m"}
{"caso":"mat","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_mat_rnone","linhas":["view/j05c4c1_mat_own/1"]}
{"caso":"mat","arvore":"new","passo":"boot","leitor":"rnone","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:j05c4c1_mat_own"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"mat","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_mat_rt","ec":3,"sinal":null,"ms":28,"stderr_linhas":["ERROR:  papel j05c4c1_mat_rt ainda escapa de RLS por 1 via(s): view:zz_m. posse → ALTER TABLE ... OWNER TO postgres e rode de novo (MODO 3); view → nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma e rode de novo (MODO 6)"],"stdout_ultima":"","senha_script_em_saida":0}
{"caso":"cad","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"public.zz_v","tabela":true,"coluna":true}
{"caso":"cad","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"public.zz_w","tabela":false,"coluna":false}
{"caso":"cad","arvore":"new","passo":"ancora","leitor":"rnone","objeto":"public.zz_v","tabela":false,"coluna":false}
{"caso":"cad","arvore":"new","passo":"efeito","rsel_cadeia_ctx_A":["A","B","B"]}
{"caso":"cad","arvore":"new","passo":"trava","leitor":"rsel","session_user":"j05c4c1_cad_rsel","linhas":["view/j05c4c1_cad_own/1","view/postgres/1"]}
{"caso":"cad","arvore":"new","passo":"boot","leitor":"rsel","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:j05c4c1_cad_own","view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"cad","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_cad_rnone","linhas":["view/j05c4c1_cad_own/1","view/postgres/1"]}
{"caso":"cad","arvore":"new","passo":"boot","leitor":"rnone","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:j05c4c1_cad_own","view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"cad","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_cad_rt","ec":3,"sinal":null,"ms":25,"stderr_linhas":["ERROR:  papel j05c4c1_cad_rt ainda escapa de RLS por 2 via(s): view:zz_v, view:zz_w. posse → ALTER TABLE ... OWNER TO postgres e rode de novo (MODO 3); view → nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma e rode de novo (MODO 6)"],"stdout_ultima":"","senha_script_em_saida":0}
{"caso":"ctl","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"public.zz_c","tabela":true,"coluna":true}
{"caso":"ctl","arvore":"new","passo":"ancora","leitor":"rnone","objeto":"public.zz_c","tabela":false,"coluna":false}
{"caso":"ctl","arvore":"new","passo":"efeito","rsel_view_sobre_N_ctx_A":["A","B"]}
{"caso":"ctl","arvore":"new","passo":"trava","leitor":"rsel","session_user":"j05c4c1_ctl_rsel","linhas":[]}
{"caso":"ctl","arvore":"new","passo":"boot","leitor":"rsel","resultado":"aceito","enforced":true,"escapes":0,"log":["info:runtime database role verified"]}
{"caso":"ctl","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_ctl_rnone","linhas":[]}
{"caso":"ctl","arvore":"new","passo":"boot","leitor":"rnone","resultado":"aceito","enforced":true,"escapes":0,"log":["info:runtime database role verified"]}
{"caso":"ctl","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_ctl_rt","ec":0,"sinal":null,"ms":61,"stderr_linhas":[],"stdout_ultima":"j05c4c1_ctl_rt|f|f|f|f|0|0|117","senha_script_em_saida":0}
```
- COM: âncora rnone f/f; efeito `42501 permission denied for view zz_v` (a view existe e ninguém a usa); trava `["view/j05c4c1_com_own/1"]`; boot recusa `RUNTIME_ROLE_CAN_BYPASS_RLS`; MODO 6 ec=3 `view:zz_v`. = esperado.
- MAT: âncora f/f; efeito `42501 permission denied for materialized view zz_m`; trava `["view/j05c4c1_mat_own/1"]`; boot recusa; MODO 6 ec=3 `view:zz_m`. = esperado.
- cadeia: âncora rsel em zz_v t/t, em zz_w f/f; efeito: rsel lê `A,B,B` pela cadeia sob A (**lê B**); trava `["view/j05c4c1_cad_own/1","view/postgres/1"]` (as duas raízes); boot recusa com 2 escapes; MODO 6 ec=3 `por 2 via(s): view:zz_v, view:zz_w.` = esperado.
- CTL: âncora rsel t/t, rnone f/f; efeito: rsel lê `A,B` de N (RLS de N não forçado ao dono; nada de T); trava `[]`; boot **aceito** (`enforced:true`, 0 escape); MODO 6 **ec=0**, linha final `j05c4c1_ctl_rt|f|f|f|f|0|0|117` (posse=0, views=0). = esperado.
- Veredito parcial: COL, COM, MAT, cadeia RECUSADOS pelos três; CTL passa nos três. VERDE.

### 1(b) COM/MAT/cadeia/CTL — código do DISPARO (`medir <c> old`, ec=0 nos 4)
- COM: trava `[]`, boot aceito, script ec=0 (`…|0|0|117`) · MAT: trava `[]`, boot aceito, script ec=0 · cadeia: trava rsel `["view/postgres/1"]` (pego pelo privilégio de tabela), **rnone `[]`**, script ec=0 (`…|0|0|117`) · CTL: trava `[]`, boot aceito (2), script ec=0. O código antigo deixava passar COM, MAT e a cadeia para quem não tem grant; o objeto recusa os três. (Saídas em `$SCRATCH/med/medir-*-old.jsonl`.)

### 1(c) Formas PRÓPRIAS — objeto (`medir f1..f5 new`, 20:00:07Z, ec=0 nas 5; RPW/PGPW nas saídas = 0)
```
{"caso":"f1","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"outro.v_sub","tabela":true,"coluna":true}
{"caso":"f1","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"outro.v_agg","tabela":true,"coluna":true}
{"caso":"f1","arvore":"new","passo":"efeito","v_sub":[{"k":"B"}],"v_cte":["A","B","B"],"v_lat":[{"k":"B","n":2}],"v_agg":[{"n_total":3}],"controle_rsel_direto_T":"42501"}
{"caso":"f1","arvore":"new","passo":"trava","leitor":"rsel","session_user":"j05c4c1_f1_rsel","linhas":["view/postgres/4"]}
{"caso":"f1","arvore":"new","passo":"boot","leitor":"rsel","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"f1","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_f1_rnone","linhas":["view/postgres/4"]}
{"caso":"f1","arvore":"new","passo":"boot","leitor":"rnone","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"f1","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_f1_rt","ec":3,"sinal":null,"ms":24,"stderr_linhas":["ERROR:  papel j05c4c1_f1_rt ainda escapa de RLS por 4 via(s): view:outro.v_agg, view:outro.v_cte, view:outro.v_lat, view:outro.v_sub. posse → ALTER TABLE ... OWNER TO postgres e rode de novo (MODO 3); view → nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma e rode de novo (MODO 6)"],"stdout_ultima":"","senha_script_em_saida":0}
{"caso":"f2","arvore":"new","passo":"ancora","leitor":"rins","objeto":"public.zz_r","tabela":true,"coluna":true}
{"caso":"f2","arvore":"new","passo":"efeito","regras_e_deps":[{"rulename":"_RETURN","deps":"zz_n"},{"rulename":"zz_r_ins","deps":"zz_t"}],"rins_insert_via_regra":true,"linhas_B_gravadas_via_regra":1,"controle_rins_direto_T":"42501"}
{"caso":"f2","arvore":"new","passo":"trava","leitor":"rins","session_user":"j05c4c1_f2_rins","linhas":["view/postgres/1"]}
{"caso":"f2","arvore":"new","passo":"boot","leitor":"rins","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"f2","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_f2_rnone","linhas":["view/postgres/1"]}
{"caso":"f2","arvore":"new","passo":"boot","leitor":"rnone","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"f2","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_f2_rt","ec":3,"sinal":null,"ms":25,"stderr_linhas":["ERROR:  papel j05c4c1_f2_rt ainda escapa de RLS por 1 via(s): view:zz_r. posse → ALTER TABLE ... OWNER TO postgres e rode de novo (MODO 3); view → nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma e rode de novo (MODO 6)"],"stdout_ultima":"","senha_script_em_saida":0}
{"caso":"f3","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"outro.zz_v3","tabela":true,"coluna":true}
{"caso":"f3","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"public.zz_inv","tabela":true,"coluna":true}
{"caso":"f3","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"public.zz_m2","tabela":false,"coluna":false}
{"caso":"f3","arvore":"new","passo":"efeito","relkind_zz_p":"p|true","rsel_v3_ctx_A":["A","B","B"],"rsel_inv_ctx_A":"42501 permission denied for table zz_p"}
{"caso":"f3","arvore":"new","passo":"trava","leitor":"rsel","session_user":"j05c4c1_f3_rsel","linhas":["view/postgres/4"]}
{"caso":"f3","arvore":"new","passo":"boot","leitor":"rsel","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"f3","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_f3_rnone","linhas":["view/postgres/4"]}
{"caso":"f3","arvore":"new","passo":"boot","leitor":"rnone","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"f3","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_f3_rt","ec":3,"sinal":null,"ms":25,"stderr_linhas":["ERROR:  papel j05c4c1_f3_rt ainda escapa de RLS por 4 via(s): view:outro.zz_v1, view:outro.zz_v3, view:zz_inv, view:zz_m2. posse → ALTER TABLE ... OWNER TO postgres e rode de novo (MODO 3); view → nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma e rode de novo (MODO 6)"],"stdout_ultima":"","senha_script_em_saida":0}
{"caso":"f4","arvore":"new","passo":"f4_temp","esquema_temp":"pg_temp_3","rsel_le_view_temp_de_outra_sessao":"42501 permission denied for schema pg_temp_3"}
{"caso":"f4","arvore":"new","passo":"efeito"}
{"caso":"f4","arvore":"new","passo":"trava","leitor":"rsel","session_user":"j05c4c1_f4_rsel","linhas":["view/postgres/1"]}
{"caso":"f4","arvore":"new","passo":"boot","leitor":"rsel","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"f4","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_f4_rnone","linhas":["view/postgres/1"]}
{"caso":"f4","arvore":"new","passo":"boot","leitor":"rnone","resultado":"recusado","nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"],"log":["error:runtime database role can bypass RLS — refusing to start"]}
{"caso":"f4","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_f4_rt","ec":3,"sinal":null,"ms":28,"stderr_linhas":["ERROR:  papel j05c4c1_f4_rt ainda escapa de RLS por 1 via(s): view:pg_temp_3.zz_tv. posse → ALTER TABLE ... OWNER TO postgres e rode de novo (MODO 3); view → nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma e rode de novo (MODO 6)"],"stdout_ultima":"","senha_script_em_saida":0}
{"caso":"f4","arvore":"new","passo":"f4_temp_fechada"}
{"caso":"f5","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"public.zz_fv","tabela":true,"coluna":true}
{"caso":"f5","arvore":"new","passo":"ancora","leitor":"rsel","objeto":"public.zz_t","tabela":false,"coluna":false}
{"caso":"f5","arvore":"new","passo":"efeito","deps_da_regra":"pg_proc:zz_f()","rsel_fv_ctx_A":"42501 permission denied for table zz_t","rdir_fv_ctx_A":["A"],"rdir_fv_sem_guc":[]}
{"caso":"f5","arvore":"new","passo":"trava","leitor":"rsel","session_user":"j05c4c1_f5_rsel","linhas":[]}
{"caso":"f5","arvore":"new","passo":"boot","leitor":"rsel","resultado":"aceito","enforced":true,"escapes":0,"log":["info:runtime database role verified"]}
{"caso":"f5","arvore":"new","passo":"trava","leitor":"rnone","session_user":"j05c4c1_f5_rnone","linhas":[]}
{"caso":"f5","arvore":"new","passo":"boot","leitor":"rnone","resultado":"aceito","enforced":true,"escapes":0,"log":["info:runtime database role verified"]}
{"caso":"f5","arvore":"new","passo":"modo6","script":"/work/scripts/db-runtime-role.sh","papel":"j05c4c1_f5_rt","ec":0,"sinal":null,"ms":65,"stderr_linhas":[],"stdout_ultima":"j05c4c1_f5_rt|f|f|f|f|0|0|117","senha_script_em_saida":0}
```
Montagens verbatim (fonte: `caso.ts`, objeto `DEFS`, md5 `dcd656f9…`):
- **F1** `CREATE SCHEMA outro`; `CREATE VIEW outro.v_sub AS SELECT x.k FROM (VALUES ('B')) x(k) WHERE EXISTS (SELECT 1 FROM public.zz_t t WHERE t.tenant_id = x.k)`; `CREATE VIEW outro.v_cte AS WITH c AS (SELECT tenant_id FROM public.zz_t) SELECT tenant_id FROM c`; `CREATE VIEW outro.v_lat AS SELECT x.k, l.n FROM (VALUES ('B')) x(k), LATERAL (SELECT count(*) AS n FROM public.zz_t t WHERE t.tenant_id = x.k) l`; `CREATE VIEW outro.v_agg AS SELECT count(*) AS n_total FROM public.zz_t`; `GRANT USAGE ON SCHEMA outro` + `GRANT SELECT` em cada uma ao rsel.
- **F2** `CREATE VIEW public.zz_r AS SELECT tenant_id, value FROM public.zz_n`; `CREATE RULE zz_r_ins AS ON INSERT TO public.zz_r DO INSTEAD INSERT INTO public.zz_t (tenant_id, value) VALUES (NEW.tenant_id, NEW.value)`; `GRANT INSERT ON public.zz_r` ao rins.
- **F3** `zz_p` `PARTITION BY LIST (tenant_id)` + partições `zz_p_a`/`zz_p_b`, ENABLE+FORCE + política; `outro.zz_v1` → `zz_p`; `CREATE MATERIALIZED VIEW public.zz_m2 AS … FROM outro.zz_v1` (WITH DATA, pelo postgres); `outro.zz_v3 WITH (security_barrier = true)` → `zz_m2`; `public.zz_inv WITH (security_invoker = true)` → `zz_p`; rsel: USAGE em `outro`, SELECT em `zz_v3` e `zz_inv`.
- **F4** na medição: uma conexão VIVA do superusuário faz `CREATE TEMP VIEW zz_tv AS SELECT tenant_id, value FROM public.zz_t` e `GRANT SELECT ON zz_tv` ao rsel, e fica aberta durante trava, boot e MODO 6.
- **F5** `CREATE FUNCTION public.zz_f() RETURNS TABLE(tenant_id text, value text) LANGUAGE sql STABLE AS 'SELECT tenant_id, value FROM public.zz_t'`; `CREATE VIEW public.zz_fv AS SELECT tenant_id, value FROM public.zz_f()`; rsel SELECT em `zz_fv`; rdir SELECT em `zz_fv` e em `zz_t`.

Leitura (cada forma, contra a letra do C4.2(1) e da `D-405-PROIBIR-VIEWS` — "QUALQUER view ou matview cuja árvore alcance uma tabela com FORCE"):
- **F1 — dentro** (4 relações `v`, esquema ≠ public, tabela FORCE só em `EXISTS`/CTE/`LATERAL`/agregado). Efeito: sob A o rsel vê que B existe (`v_sub` → `B`), lê `A,B,B` (`v_cte`), conta 2 de B (`v_lat`) e o total de todas as organizações (`v_agg` → 3); direto em `zz_t` recebe `42501`. Trava `["view/postgres/4"]`, boot recusa, MODO 6 ec=3 nomeando as 4. **RECUSADO pelos três** (= esperado).
- **F2 — dentro** (regra **em view**, `ev_class = zz_r`, não regra em tabela; a `_RETURN` depende só de `zz_n` sem FORCE e a `zz_r_ins` depende de `zz_t` — medido em `pg_rewrite`/`pg_depend`). Efeito: o rins grava **1 linha de B sob A** pela regra (direto em `zz_t`: `42501`) — escape real. Trava `["view/postgres/1"]`, boot recusa, MODO 6 ec=3 `view:zz_r`. **RECUSADO pelos três** (= esperado): a descida por TODA regra do nó cobre a regra não-`_RETURN`.
- **F3 — dentro** (`relkind 'p'` com FORCE, medido `p|true`; 3 níveis view→matview→view com esquemas mistos; `security_barrier` e `security_invoker`). Efeito: rsel lê `A,B,B` por `outro.zz_v3` sob A; por `zz_inv` (invoker) recebe `42501` (sobre-recusa = a regra do dono). Trava `["view/postgres/4"]`, boot recusa, MODO 6 ec=3 nomeando `outro.zz_v1`, `outro.zz_v3`, `zz_inv`, `zz_m2`. **RECUSADO pelos três** (= esperado).
- **F4 — dentro** (relação `v` viva no boot, em `pg_temp_3`). Efeito: o rsel recebe `42501 permission denied for schema pg_temp_3` — a view TEMP de outra sessão não é usável por ele (sem escape). Trava `["view/postgres/1"]`, boot recusa, MODO 6 ec=3 `view:pg_temp_3.zz_tv`. Recusa a mais, que é a regra (= esperado).
- **F5 — FRONTEIRA do `pg_depend`** (a regra de `zz_fv` depende só de `pg_proc:zz_f()`; o corpo da função não é árvore de regra). Trava `[]`, boot **aceito**, MODO 6 **ec=0** (`…|0|0|117`) — a trava NÃO recusa (= o esperado escrito antes). **Escape medido: nenhum** — rsel `42501 permission denied for table zz_t` (a função roda como o invocador); rdir (com SELECT em `zz_t`) lê só `A` sob A e `[]` sem GUC (o RLS morde o invocador). Não é escape; não é view cuja árvore de regras alcança FORCE. Classe: `nota`, `não grave` (a forma sem escape fica fora do alcance por construção; com `SECURITY DEFINER` seria matéria do `B-SAN3-10` — fora, C4.6).
- Veredito parcial 1(c): nenhuma forma dentro da decisão que alcança FORCE passou na trava, no boot ou no MODO 6. Nenhum sinal de não-convergência.

### 1 — Vermelho-controle (os três) — 20:02Z
- **(1) o RLS morde e o efeito existe** (COL, `medir col new`): superusuário lê `A,B,B`; `rdir` (papel comum, `GRANT SELECT` direto em `zz_t`) lê **0** sem GUC e **só `A`** com contexto A; `rsel` lê **B** pela view `zz_w`. ACUSOU (o RLS filtra o papel comum e a view o contorna) → a montagem mede o que a regra fecha.
- **(2) o caso discrimina** (`medir col old`, código do disparo `7c63f920`): trava `[]` para rsel/rupd/rins/rnone, boot aceito, script **ec=0** (`views=0`). ACUSOU: o código antigo deixa passar o COL; o objeto recusa.
- **(3) a âncora acusa**: `PXDB=j05c4c1_col bash px.sh … psql -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO j05c4c1_col_ranc" -c "SELECT has_table_privilege(…ranc, 'public.zz_w', 'SELECT') …"` → `ranc|true|true`; controle negativo `rnone|false`. ACUSOU.
- Âncora do papel do script no COL (medida depois do MODO 6, que fez ROLLBACK): `rt|tabela=false|coluna=true` — privilégio **só de coluna** na view, como manda o corpo.
- **Veredito do item 1: VERDE.** COL (SELECT/UPDATE/INSERT de coluna, efeito medido), COM, MAT e cadeia recusados pela trava REAL, pelo boot real e pelo MODO 6 (`view:<objeto>`); CTL passa nos três; formas próprias F1 (outro esquema, EXISTS/CTE/LATERAL/agregado), F2 (regra não-`_RETURN` em view, escrita de B medida), F3 (particionada `p` FORCE, 3 níveis mistos, `security_barrier`/`security_invoker`) e F4 (TEMP de outra sessão) recusadas; F5 (função SQL invoker) não recusada e **sem escape medido** (nota, não grave). Não-convergência: **não**.

## Item 2 — M4a/b/c × (t)/(s), T8f

### 2(a) Linha de base — 20:01:29Z
- `bash px.sh … timeout 900 node --test --test-reporter=tap --import tsx tests/san3-05-runtime-role-guard-db.test.ts > base.tap` (container `j05c4-c1-node`, `DATABASE_URL` = superusuário do banco migrado `erp_techsolutions`, só por ambiente) → **ec=0**, 21 s:
```
# tests 12
# pass 12
# fail 0
# cancelled 0
# skipped 0
    ok 1 - T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão
    ok 2 - T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam
    ok 3 - T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE
    ok 4 - T8c · dois semi-mutantes session_user→current_user perdem exatamente a via do login
    ok 5 - T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados
    ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS)
    ok 7 - T8f · a trava e o MODO 6 avaliam o mesmo CTE, sem view_escape
    ok 8 - T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados
    ok 9 - T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada
    ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio
    ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo
ok 1 - B-SAN3-05 · o papel de runtime não contorna FORCE RLS
```
- **12 testes, 12 pass, 0 fail/cancelled/skipped** (11 subtestes + o pai). T5/T6/T9, T8c (2), T8d, T8e, T8f, T14d e T15 `ok`. RPW/PGPW no TAP = 0.
- Ordem lida no blob do objeto: `VIEW_RULE_CASES = ["COL","COM","MAT","CTL"]` (l.123). **T8e** (l.883-979): cria os 4 leitores; por caso, em sequência — COL: âncora (3 leitores) → efeito (lê/UPDATE/INSERT de B) → `deepEqual(lines, ["view/postgres/1"])` para rsel/rupd/rins/rnone; COM/MAT: âncora → `deepEqual(lines, ["view/<comum>/1"])`; CTL: `deepEqual(lines, [])` para rsel/rnone. **T14d** (l.1379-1428): por caso, papel novo → objeto → âncora → `runRoleScript` → COL/COM/MAT: `status 3`, `/MODO 6/`, `por 1 via\(s\): view:<objeto>\.`; CTL: `status 0` e `^<papel>\|f\|f\|f\|f\|0\|0\|`. A 1ª asserção que falha encerra o subteste (os casos seguintes não são alcançados).
- Mutador `/tmp/zz-j05c4c1-sonda/mut.mjs` (md5 `b539afdffd61408f44111e66924d841b`): conta a âncora ANTES e falha fechado se ≠ esperado (1; o controle CTL1_s pede 2 de propósito). Executor `$SCRATCH/mutrun.sh` (md5 `456e8b1b1e427e1c9696641bed8932f5`): 1 `.pristino` → 2 mutação → 3 `diff` (linhas) → 4 carga (`import` do módulo por tsx em (t); `bash -n` em (s)) → 5 arquivo de guarda (`timeout 900`, TAP, duração por subteste) → 6 sondas do item 1 sob o mutante (papel de runtime NOVO por mutação, `j05c4c1_<caso>_<id>`) → 7 restauro por `cp` e md5 = blob. Sonda v2 `caso.ts` md5 `bd3ee173d91acb4f4e0f7461fa5e0d72` (v1 + modo `mut` + teardown de todos os papéis do caso; `diff` v1×v2 = 2 trechos).

### 2(b) M4a (t) — `bash mutrun.sh $S M4a_t col com mat cad` (20:04:34Z)
```
20:04:34Z 1 pre: src/database/runtime-role.ts md5_container=9efee03db097f54e73178e1ec4c740d9 md5_blob=9efee03db097f54e73178e1ec4c740d9
20:04:35Z 1 pristino: /tmp/runtime-role.ts.pristino md5=9efee03db097f54e73178e1ec4c740d9
20:04:35Z 2 mut M4a_t: arquivo=src/database/runtime-role.ts ancora_ocorrencias=1 esperado=1 CR_no_arquivo=0
20:04:35Z 2 mut M4a_t: aplicada
20:04:36Z 3 diff pristino x mutante: linhas_mudadas(<>)=1
20:04:36Z 4 carga: ec=0 carrega len=2307
20:04:45Z 5 arquivo de guarda: ec=1 dur=9s · # tests 12 # pass 9 # fail 3 # cancelled 0 # skipped 0
20:04:45Z 5     ok 1 - T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão [299.327429 ms]
20:04:45Z 5     ok 2 - T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam [367.757427 ms]
20:04:45Z 5     ok 3 - T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE [243.575357 ms]
20:04:45Z 5     ok 4 - T8c · dois semi-mutantes session_user→current_user perdem exatamente a via do login [179.702915 ms]
20:04:45Z 5     not ok 5 - T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados [401.130227 ms]
20:04:45Z 5     not ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS) [315.92955 ms]
20:04:45Z 5     ok 7 - T8f · a trava e o MODO 6 avaliam o mesmo CTE, sem view_escape [0.718289 ms]
20:04:45Z 5     ok 8 - T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados [1127.46584 ms]
20:04:45Z 5     ok 9 - T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada [593.275444 ms]
20:04:45Z 5     ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio [271.849039 ms]
20:04:45Z 5     ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo [3932.554758 ms]
20:04:47Z 6 sonda col ec=0 trava=rsel=[] rupd=[] rins=[] rnone=[]  boot=rsel=aceito rupd=aceito rins=aceito rnone=aceito  modo6=ec=3
20:04:48Z 6 sonda com ec=0 trava=rnone=[]  boot=rnone=aceito  modo6=ec=3
20:04:49Z 6 sonda mat ec=0 trava=rnone=[]  boot=rnone=aceito  modo6=ec=3
20:04:50Z 6 sonda cad ec=0 trava=rsel=["view/j05c4c1_cad_own/1"] rnone=[]  boot=rsel=recusado rnone=aceito  modo6=ec=3
20:04:51Z 7 restauro: md5_container=9efee03db097f54e73178e1ec4c740d9 md5_blob=9efee03db097f54e73178e1ec4c740d9 IGUAL
20:04:51Z segredos: rpw=0 pgpw=0
--- mensagens (bash msgs.sh test.tap)
    not ok 5 - T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados
      error: |-
      expected: 2
      actual: 1
    not ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS)
      error: |-
        caso COL: a trava de s305_c4_rsel_1791576279091_d706fb40 precisa recusar exatamente a view s305_c4_col_1791576279107_648293f0
        + actual - expected
        + []
        - [
        -   'view/postgres/1'
        - ]
      expected:
      actual:
--- diff
48a49
>   WHERE (has_table_privilege(session_user, v.oid, 'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user, v.oid, 'SELECT,INSERT,UPDATE,DELETE'))
```
- Leitura: âncora 1/1, 1 linha mudada, módulo carrega; **T8e vermelho pela asserção do caso COL** (`caso COL: a trava de … precisa recusar exatamente a view …`, actual `[]`); T8d também cai (`objetos` 2→1 — não serve de irmão); irmãos verdes: T5/T6/T9, T7/T8, T8b/T8c, T8c, T8f, T14a/b, T14c, T14d, T15. Sondas sob o mutante: **COL, COM e MAT reabertos** na trava (`[]`) e no boot (aceito) para todos os leitores; **cadeia reaberta para o rnone** (`[]`, aceito) e pega para o rsel (`view/j05c4c1_cad_own/1`); MODO 6 (script intacto) ec=3. Restauro md5 = blob.

### 2(b) M4a (s) — `bash mutrun.sh $S M4a_s col com mat cad` (20:05:13Z)
```
20:05:13Z 1 pre: scripts/db-runtime-role.sh md5_container=5cab4f63b1259450acf68675205d5908 md5_blob=5cab4f63b1259450acf68675205d5908
20:05:14Z 1 pristino: /tmp/db-runtime-role.sh.pristino md5=5cab4f63b1259450acf68675205d5908
20:05:14Z 2 mut M4a_s: arquivo=scripts/db-runtime-role.sh ancora_ocorrencias=1 esperado=1 CR_no_arquivo=0
20:05:14Z 2 mut M4a_s: aplicada
20:05:14Z 3 diff pristino x mutante: linhas_mudadas(<>)=2
20:05:15Z 4 carga: bash -n ec=0
20:05:24Z 5 arquivo de guarda: ec=1 dur=9s · # tests 12 # pass 10 # fail 2 # cancelled 0 # skipped 0
20:05:24Z 5     ok 1 - T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão [300.427593 ms]
20:05:24Z 5     ok 2 - T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam [368.269763 ms]
20:05:24Z 5     ok 3 - T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE [256.838576 ms]
20:05:24Z 5     ok 4 - T8c · dois semi-mutantes session_user→current_user perdem exatamente a via do login [170.536186 ms]
20:05:24Z 5     ok 5 - T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados [587.210058 ms]
20:05:24Z 5     ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS) [783.430971 ms]
20:05:24Z 5     ok 7 - T8f · a trava e o MODO 6 avaliam o mesmo CTE, sem view_escape [0.535037 ms]
20:05:24Z 5     ok 8 - T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados [1055.441424 ms]
20:05:24Z 5     ok 9 - T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada [603.730863 ms]
20:05:24Z 5     not ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio [174.344468 ms]
20:05:24Z 5     ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo [4003.80402 ms]
20:05:26Z 6 sonda col ec=0 trava=rsel=["view/postgres/1"] rupd=["view/postgres/1"] rins=["view/postgres/1"] rnone=["view/postgres/1"]  boot=rsel=recusado rupd=recusado rins=recusado rnone=recusado  modo6=ec=0
20:05:27Z 6 sonda com ec=0 trava=rnone=["view/j05c4c1_com_own/1"]  boot=rnone=recusado  modo6=ec=0
20:05:28Z 6 sonda mat ec=0 trava=rnone=["view/j05c4c1_mat_own/1"]  boot=rnone=recusado  modo6=ec=0
20:05:29Z 6 sonda cad ec=0 trava=rsel=["view/j05c4c1_cad_own/1","view/postgres/1"] rnone=["view/j05c4c1_cad_own/1","view/postgres/1"]  boot=rsel=recusado rnone=recusado  modo6=ec=0
20:05:30Z 7 restauro: md5_container=5cab4f63b1259450acf68675205d5908 md5_blob=5cab4f63b1259450acf68675205d5908 IGUAL
20:05:30Z segredos: rpw=0 pgpw=0
--- mensagens
    not ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio
      error: |-
        caso COL: status deveria ser 3
      expected: 3
      actual: 0
--- diff
103c103
<     SELECT DISTINCT 'view', v.oid::regclass::text FROM view_force vf JOIN pg_class v ON v.oid = vf.root_oid
---
>     SELECT DISTINCT 'view', v.oid::regclass::text FROM view_force vf JOIN pg_class v ON v.oid = vf.root_oid WHERE has_table_privilege(alvo.oid, v.oid, 'SELECT,INSERT,UPDATE,DELETE')
```
- Leitura: âncora 1/1 (a do `DO`; a linha final não tem ramo `view`), `bash -n` ec=0; **T14d vermelho pela asserção do caso COL** (`caso COL: status deveria ser 3`, actual 0); irmãos verdes (T8e, T8f, T14a/b, T15…). Sondas: o script mutado dá **ec=0** para o papel novo de COL (só coluna), COM, MAT e cadeia — **os quatro reabertos no MODO 6**; a trava (intacta) segue recusando. Restauro md5 = blob.

### 2(b) M4b_t — `bash mutrun.sh $S M4b_t col com mat cad`
```
20:05:44Z 1 pre: src/database/runtime-role.ts md5_container=9efee03db097f54e73178e1ec4c740d9 md5_blob=9efee03db097f54e73178e1ec4c740d9
20:05:44Z 1 pristino: /tmp/runtime-role.ts.pristino md5=9efee03db097f54e73178e1ec4c740d9
20:05:45Z 2 mut M4b_t: arquivo=src/database/runtime-role.ts ancora_ocorrencias=1 esperado=1 CR_no_arquivo=0
20:05:45Z 2 mut M4b_t: aplicada
20:05:45Z 3 diff pristino x mutante: linhas_mudadas(<>)=1
20:05:46Z 4 carga: ec=0 carrega len=2189
20:05:54Z 5 arquivo de guarda: ec=1 dur=8s · # tests 12 # pass 10 # fail 2 # cancelled 0 # skipped 0
20:05:54Z 5     ok 1 - T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão [294.802188 ms]
20:05:54Z 5     ok 2 - T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam [363.434425 ms]
20:05:55Z 5     ok 3 - T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE [274.901292 ms]
20:05:55Z 5     ok 4 - T8c · dois semi-mutantes session_user→current_user perdem exatamente a via do login [161.768682 ms]
20:05:55Z 5     ok 5 - T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados [578.650875 ms]
20:05:55Z 5     not ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS) [536.882244 ms]
20:05:55Z 5     ok 7 - T8f · a trava e o MODO 6 avaliam o mesmo CTE, sem view_escape [1.090475 ms]
20:05:55Z 5     ok 8 - T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados [1080.981126 ms]
20:05:55Z 5     ok 9 - T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada [575.31631 ms]
20:05:55Z 5     ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio [318.619482 ms]
20:05:55Z 5     ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo [3905.143108 ms]
20:05:56Z 6 sonda col ec=0 trava=rsel=["view/postgres/1"] rupd=["view/postgres/1"] rins=["view/postgres/1"] rnone=["view/postgres/1"]  boot=rsel=recusado rupd=recusado rins=recusado rnone=recusado  modo6=ec=3
20:05:57Z 6 sonda com ec=0 trava=rnone=[]  boot=rnone=aceito  modo6=ec=3
20:05:59Z 6 sonda mat ec=0 trava=rnone=[]  boot=rnone=aceito  modo6=ec=3
20:06:00Z 6 sonda cad ec=0 trava=rsel=["view/postgres/1"] rnone=["view/postgres/1"]  boot=rsel=recusado rnone=recusado  modo6=ec=3
20:06:00Z 7 restauro: md5_container=9efee03db097f54e73178e1ec4c740d9 md5_blob=9efee03db097f54e73178e1ec4c740d9 IGUAL
20:06:01Z segredos: rpw=0 pgpw=0
--- mensagens
    not ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS)
      error: |-
        caso COM: a trava precisa recusar a view de dono comum sem grant
        + actual - expected
        + []
        - [
        -   'view/s305_c4_common_1791576348310_b209fd3b/1'
        - ]
      expected:
      actual:
--- diff
48a49
>   WHERE (o.rolsuper OR o.rolbypassrls)
```

### 2(b) M4b_s — `bash mutrun.sh $S M4b_s col com mat cad`
```
20:06:01Z 1 pre: scripts/db-runtime-role.sh md5_container=5cab4f63b1259450acf68675205d5908 md5_blob=5cab4f63b1259450acf68675205d5908
20:06:02Z 1 pristino: /tmp/db-runtime-role.sh.pristino md5=5cab4f63b1259450acf68675205d5908
20:06:02Z 2 mut M4b_s: arquivo=scripts/db-runtime-role.sh ancora_ocorrencias=1 esperado=1 CR_no_arquivo=0
20:06:02Z 2 mut M4b_s: aplicada
20:06:02Z 3 diff pristino x mutante: linhas_mudadas(<>)=2
20:06:03Z 4 carga: bash -n ec=0
20:06:12Z 5 arquivo de guarda: ec=1 dur=9s · # tests 12 # pass 10 # fail 2 # cancelled 0 # skipped 0
20:06:12Z 5     ok 1 - T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão [282.613267 ms]
20:06:12Z 5     ok 2 - T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam [373.569854 ms]
20:06:12Z 5     ok 3 - T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE [264.686373 ms]
20:06:12Z 5     ok 4 - T8c · dois semi-mutantes session_user→current_user perdem exatamente a via do login [165.158564 ms]
20:06:12Z 5     ok 5 - T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados [588.441023 ms]
20:06:12Z 5     ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS) [736.598982 ms]
20:06:12Z 5     ok 7 - T8f · a trava e o MODO 6 avaliam o mesmo CTE, sem view_escape [0.564971 ms]
20:06:12Z 5     ok 8 - T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados [1138.492164 ms]
20:06:12Z 5     ok 9 - T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada [580.318832 ms]
20:06:12Z 5     not ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio [182.065173 ms]
20:06:12Z 5     ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo [4103.988308 ms]
20:06:14Z 6 sonda col ec=0 trava=rsel=["view/postgres/1"] rupd=["view/postgres/1"] rins=["view/postgres/1"] rnone=["view/postgres/1"]  boot=rsel=recusado rupd=recusado rins=recusado rnone=recusado  modo6=ec=3
20:06:15Z 6 sonda com ec=0 trava=rnone=["view/j05c4c1_com_own/1"]  boot=rnone=recusado  modo6=ec=0
20:06:16Z 6 sonda mat ec=0 trava=rnone=["view/j05c4c1_mat_own/1"]  boot=rnone=recusado  modo6=ec=0
20:06:17Z 6 sonda cad ec=0 trava=rsel=["view/j05c4c1_cad_own/1","view/postgres/1"] rnone=["view/j05c4c1_cad_own/1","view/postgres/1"]  boot=rsel=recusado rnone=recusado  modo6=ec=3
20:06:18Z 7 restauro: md5_container=5cab4f63b1259450acf68675205d5908 md5_blob=5cab4f63b1259450acf68675205d5908 IGUAL
20:06:18Z segredos: rpw=0 pgpw=0
--- mensagens
    not ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio
      error: |-
        caso COM: status deveria ser 3
      expected: 3
      actual: 0
--- diff
103c103
<     SELECT DISTINCT 'view', v.oid::regclass::text FROM view_force vf JOIN pg_class v ON v.oid = vf.root_oid
---
>     SELECT DISTINCT 'view', v.oid::regclass::text FROM view_force vf JOIN pg_class v ON v.oid = vf.root_oid JOIN pg_roles o ON o.oid = v.relowner WHERE (o.rolsuper OR o.rolbypassrls)
```
- Leitura M4b (t): âncora 1/1, carrega; **T8e vermelho pela asserção do caso COM** (`caso COM: a trava precisa recusar a view de dono comum sem grant`, actual `[]`); T8d e T8f verdes (irmãos). Sondas: **COM e MAT reabertos** na trava e no boot; COL e cadeia seguem recusados (`view/postgres/1` — dono superusuário). Restauro = blob.
- Leitura M4b (s): âncora 1/1, `bash -n` ec=0; **T14d vermelho pela asserção do caso COM** (`caso COM: status deveria ser 3`, actual 0); T8e/T8f verdes. Sondas: script **ec=0 em COM e MAT** (reabertos); COL e cadeia ec=3. Restauro = blob.

### 2(b) M4c_t — `bash mutrun.sh $S M4c_t ctl f5`
```
20:06:33Z 1 pre: src/database/runtime-role.ts md5_container=9efee03db097f54e73178e1ec4c740d9 md5_blob=9efee03db097f54e73178e1ec4c740d9
20:06:34Z 1 pristino: /tmp/runtime-role.ts.pristino md5=9efee03db097f54e73178e1ec4c740d9
20:06:34Z 2 mut M4c_t: arquivo=src/database/runtime-role.ts ancora_ocorrencias=1 esperado=1 CR_no_arquivo=0
20:06:34Z 2 mut M4c_t: aplicada
20:06:34Z 3 diff pristino x mutante: linhas_mudadas(<>)=2
20:06:35Z 4 carga: ec=0 carrega len=2124
20:06:44Z 5 arquivo de guarda: ec=1 dur=9s · # tests 12 # pass 9 # fail 3 # cancelled 0 # skipped 0
20:06:44Z 5     ok 1 - T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão [310.186352 ms]
20:06:44Z 5     ok 2 - T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam [367.189379 ms]
20:06:44Z 5     ok 3 - T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE [263.34371 ms]
20:06:44Z 5     ok 4 - T8c · dois semi-mutantes session_user→current_user perdem exatamente a via do login [178.3671 ms]
20:06:44Z 5     ok 5 - T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados [582.754993 ms]
20:06:44Z 5     not ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS) [705.5834 ms]
20:06:44Z 5     not ok 7 - T8f · a trava e o MODO 6 avaliam o mesmo CTE, sem view_escape [1.118895 ms]
20:06:44Z 5     ok 8 - T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados [1091.833889 ms]
20:06:44Z 5     ok 9 - T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada [584.372672 ms]
20:06:44Z 5     ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio [349.889165 ms]
20:06:44Z 5     ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo [3992.258923 ms]
20:06:46Z 6 sonda ctl ec=0 trava=rsel=["view/postgres/1"] rnone=["view/postgres/1"]  boot=rsel=recusado rnone=recusado  modo6=ec=0
20:06:47Z 6 sonda f5 ec=0 trava=rsel=[] rnone=[]  boot=rsel=aceito rnone=aceito  modo6=ec=0
20:06:48Z 7 restauro: md5_container=9efee03db097f54e73178e1ec4c740d9 md5_blob=9efee03db097f54e73178e1ec4c740d9 IGUAL
20:06:48Z segredos: rpw=0 pgpw=0
--- mensagens (cortadas)
    not ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS)
      error: |-
        caso CTL: view sobre tabela SEM FORCE não pode produzir escape para s305_c4_rsel_1791576397718_0ad5ab2f
        + actual - expected
        + [
        +   'view/postgres/1'
        + ]
        - []
      expected:
      actual:
    not ok 7 - T8f · a trava e o MODO 6 avaliam o mesmo CTE, sem view_escape
      error: |-
        o CTE do DO divergiu da trava
        + actual - expected
        + "WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_
        - "WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_
      expected: "WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJ
      actual: "WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOI
--- diff
26c26
<   JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r', 'p') AND t.relforcerowsecurity
---
>   JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r', 'p')
```

### 2(b) M4c_s — `bash mutrun.sh $S M4c_s ctl f5`
```
20:06:48Z 1 pre: scripts/db-runtime-role.sh md5_container=5cab4f63b1259450acf68675205d5908 md5_blob=5cab4f63b1259450acf68675205d5908
20:06:49Z 1 pristino: /tmp/db-runtime-role.sh.pristino md5=5cab4f63b1259450acf68675205d5908
20:06:49Z 2 mut M4c_s: arquivo=scripts/db-runtime-role.sh ancora_ocorrencias=1 esperado=1 CR_no_arquivo=0
20:06:49Z 2 mut M4c_s: aplicada
20:06:50Z 3 diff pristino x mutante: linhas_mudadas(<>)=2
20:06:50Z 4 carga: bash -n ec=0
20:06:59Z 5 arquivo de guarda: ec=1 dur=9s · # tests 12 # pass 9 # fail 3 # cancelled 0 # skipped 0
20:06:59Z 5     ok 1 - T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão [308.709935 ms]
20:06:59Z 5     ok 2 - T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam [362.861194 ms]
20:06:59Z 5     ok 3 - T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE [286.01512 ms]
20:06:59Z 5     ok 4 - T8c · dois semi-mutantes session_user→current_user perdem exatamente a via do login [194.189813 ms]
20:06:59Z 5     ok 5 - T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados [617.586389 ms]
20:06:59Z 5     ok 6 - T8e · qualquer view/matview sobre tabela FORCE recusa, sem olhar dono nem privilégio (D-405-PROIBIR-VIEWS) [763.701812 ms]
20:06:59Z 5     not ok 7 - T8f · a trava e o MODO 6 avaliam o mesmo CTE, sem view_escape [0.94775 ms]
20:06:59Z 5     ok 8 - T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados [1025.01333 ms]
20:06:59Z 5     ok 9 - T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada [576.791967 ms]
20:07:00Z 5     not ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio [291.520029 ms]
20:07:00Z 5     ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo [3855.324018 ms]
20:07:01Z 6 sonda ctl ec=0 trava=rsel=[] rnone=[]  boot=rsel=aceito rnone=aceito  modo6=ec=3
20:07:02Z 6 sonda f5 ec=0 trava=rsel=[] rnone=[]  boot=rsel=aceito rnone=aceito  modo6=ec=0
20:07:03Z 7 restauro: md5_container=5cab4f63b1259450acf68675205d5908 md5_blob=5cab4f63b1259450acf68675205d5908 IGUAL
20:07:03Z segredos: rpw=0 pgpw=0
--- mensagens (cortadas)
    not ok 7 - T8f · a trava e o MODO 6 avaliam o mesmo CTE, sem view_escape
      error: |-
        o CTE do DO divergiu da trava
        + actual - expected
        + "WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_
        - "WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_
      expected: "WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJ
      actual: "WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOI
    not ok 10 - T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar dono nem privilégio
      error: |-
        caso CTL: view sobre tabela SEM FORCE deveria convergir
      expected: 0
      actual: 3
--- diff
94c94
<       JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r','p') AND t.relforcerowsecurity
---
>       JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r','p')
```
- Leitura M4c (t): **T8e vermelho pela asserção do caso CTL** (`caso CTL: view sobre tabela SEM FORCE não pode produzir escape`, actual `[view/postgres/1]`) **e T8f vermelho** (`o CTE do DO divergiu da trava`). Sonda CTL: trava `[view/postgres/1]` (sobre-recusa reaberta), boot recusa; F5 inalterada. Restauro = blob.
- Leitura M4c (s): **T14d vermelho pela asserção do caso CTL** (`caso CTL: view sobre tabela SEM FORCE deveria convergir`, actual 3) **e T8f vermelho**. Sonda CTL: script ec=3. Restauro = blob.

### 2(b)/(c) Tabela 6 × — subteste vermelho · caso que a mensagem nomeia · T8f · T8d · duração do subteste · casos reabertos pelas sondas sob o mutante
| id | subteste vermelho | caso na mensagem | T8f | T8d | duração (ms) | sondas sob o mutante (casos reabertos) |
|---|---|---|---|---|---|---|
| M4a (t) | T8e | COL (`a trava de … precisa recusar exatamente a view`) | verde | **vermelho** (objetos 2→1) | 315.92955 | trava+boot: **COL, COM, MAT** (todos os leitores) e cadeia p/ rnone |
| M4a (s) | T14d | COL (`status deveria ser 3`) | verde | verde | 174.344468 | MODO 6 ec=0: **COL, COM, MAT, cadeia** |
| M4b (t) | T8e | COM (`a trava precisa recusar a view de dono comum sem grant`) | verde | verde | 536.882244 | trava+boot: **COM, MAT** (COL e cadeia seguem pegos pelo dono postgres) |
| M4b (s) | T14d | COM (`status deveria ser 3`) | verde | verde | 182.065173 | MODO 6 ec=0: **COM, MAT** |
| M4c (t) | T8e | CTL (`view sobre tabela SEM FORCE não pode produzir escape`) | **vermelho** | verde | 705.5834 | trava+boot: **CTL** recusado (sobre-recusa) |
| M4c (s) | T14d | CTL (`deveria convergir`) | **vermelho** | verde | 291.520029 | MODO 6 ec=3 no **CTL** |
- Cada caso indicado (não só o 1º) confirmado pelas sondas: M4a reabre COL, COM e MAT nas duas cópias; M4b reabre COM e MAT nas duas; M4c reabre o CTL nas duas. Irmão verde em toda execução: T5/T6/T9, T7/T8, T14a/b, T15 (e T8f nas M4a/M4b). Prova de carga: `import` ec=0 (t), `bash -n` ec=0 (s). Âncora = 1 em todas. Restauro md5 container = blob (`9efee03d…`/`5cab4f63…`) nas 6.
- Veredito parcial 2(b)/(c): **6/6 vermelhas pela asserção do caso indicado** (AC4-3 medido).

### 2(d) T8f — 20:07:30Z
- `$SCRATCH/t8f.mjs` (md5 `f107d41876af7c17c31eed9926d398a2`) lê a regex do PRÓPRIO blob do teste (linha `const ctePattern =`, l.982) — `/WITH RECURSIVE view_walk[\s\S]*?view_force AS \([\s\S]*?\n\s*\)(?=\s*\n\s*SELECT)/g` — e a aplica à constante da trava e ao script do objeto, no container: **trava = 1 bloco, script = 2 blocos**, iguais depois de tirar espaço (**616, 616, 616** caracteres), `view_escape`: trava **0**, script **0**. ec=0.
- Asserção (l.986-987): `assert.equal(guardCtes.length, 1)` e `assert.equal(scriptCtes.length, 2)` — **exatamente** 1 e 2, não "pelo menos"; igualdade normalizada dos três (l.988-990); `doesNotMatch(/view_escape/)` na constante e no script (l.991-992). T8f `ok` na linha de base. Não passa com zero blocos nem com blocos diferentes (os controles abaixo e a M4c provam o 2º).

### 2 — Vermelho-controle (os três)
- **(1) o arquivo lê a trava** (20:07:54Z): `CTL1_s` (âncora `AND t.relforcerowsecurity\n`, **2/2** no script, 4 linhas mudadas, `bash -n` ec=0) + `CTL1_t` (1/1 na trava) → `view_force` que nada devolve **nas três cópias** → arquivo ec=1, 12/7 pass/5 fail: **T8e vermelho** (`caso COL: … precisa recusar exatamente a view`, actual `[]`) e **T14d vermelho** (`caso COL: status deveria ser 3`, actual 0); também T8d (`escape view/postgres não encontrado`) e T14a/b; **T8f verde** (as três cópias mudaram igual). Restauro: trava `9efee03d…` = blob; script `5cab4f63…` = blob. ACUSOU.
- **(2) T8f vigia deriva, T8e/T14d vigiam comportamento** (20:08:14Z): `CTL2_s` = `UNION` → `UNION ALL` só no `view_walk` da **linha final** (âncora `\n  UNION\n` 1/1; `diff`: `126c126 <   UNION >   UNION ALL`) → **T8f vermelho** (`o CTE da linha final divergiu da trava`) e **T14d verde**, T8e verde; sonda CTL: script ec=0. Restauro = blob. ACUSOU.
- **(3) o leitor de TAP acusa**: cópia de `base.tap` com `    ok 6 - T8e` → `    not ok 6 - T8e` (`diff` 2 linhas): original `nao_ok=0 ok=12 vermelhos=[]`; cópia `nao_ok=1 ok=11 vermelhos=[T8e]`; o `awk` do `mutrun.sh` também lista 1 `not ok`. ACUSOU.
- **Veredito do item 2: VERDE.** 6/6 mutações vermelhas no T8e (t) / T14d (s) pela asserção do caso indicado, cada caso indicado confirmado pelas sondas sob o mutante; T8f com 1 + 2 blocos iguais, exatamente, `view_escape` 0; os três controles acusaram. Nenhuma forma de teste cega achada.

## Item 3 — sem falso positivo no produto

### 3(a) Banco migrado do objeto (`erp_techsolutions`, onde rodou `prisma migrate deploy`) — 20:10:57Z
- Sonda `/tmp/zz-j05c4c1-sonda/mig.ts` (`$SCRATCH/mig.ts`, md5 **`1a5e1fb952dbce1d969964867f40736f`** = container). **Extrator**: lê a regex do T8f do blob do teste e a aplica à constante `RUNTIME_ROLE_GUARD_SQL` do blob da trava → exatamente 1 bloco (falha fechado se ≠ 1); a consulta é `<CTE extraído>\nSELECT count(*) FROM view_force` — nada redigitado. `mig.ts extrator` → `cte_md5_lf=cd8af430299f543f3838ca4d0d61d83b`, 744 caracteres, de `WITH RECURSIVE view_walk(root_oid, leaf_` a `… AND t.relforcerowsecurity\n)`.
- `mig.ts migrado` (ec=0):
```
{"migracoes_aplicadas":107,"migracoes_total":107}
{"catalogo":{"tabelas":115,"force":106,"particionadas":0,"views":0}}
{"views_de_usuario":[]}
{"heranca_pg_inherits":0,"sem_force":["_prisma_migrations:false","cloud_charge_calculation_runs:false","cloud_charge_rules:false","cloud_cost_allocation_runs:false","cloud_cost_imports:false","cloud_cost_line_items:false","permissions:false","role_permissions:false","tenants:false"]}
{"view_force_superusuario":0}
{"papel_limpo":"j05c4c1_mig_clean","linhas":[],"boot":{"aceito":true,"enforced":true,"escapes":0}}
{"script":"j05c4c1_mig_rt","ec":0,"stdout_ultima":"j05c4c1_mig_rt|f|f|f|f|0|0|115","stderr_erros":[],"senha_na_saida":0}
{"controle3_superusuario_no_migrado":{"linhas":["atributo/pg_execute_server_program/null","atributo/pg_read_server_files/null","atributo/pg_write_server_files/null","atributo/postgres/null","posse/postgres/106"],"boot":{"aceito":false,"nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["atributo:pg_execute_server_program","atributo:pg_read_server_files","atributo:pg_write_server_files","atributo:postgres","posse:postgres"]}}}
```
- Leitura: **107/107 migrações** aplicadas; **115 tabelas** `r`/`p` fora do catálogo, **106 com FORCE**, **0 particionadas**, **0 relações `v`/`m`** em qualquer esquema que não seja `pg_catalog`/`information_schema` (lista vazia), `pg_inherits` = **0**; as 9 sem FORCE (`_prisma_migrations`, `cloud_charge_calculation_runs`, `cloud_charge_rules`, `cloud_cost_allocation_runs`, `cloud_cost_imports`, `cloud_cost_line_items`, `permissions`, `role_permissions`, `tenants`) têm RLS **desligada** (`:false`) — não há tabela com RLS ligada sem FORCE no produto.
- `count(*) FROM view_force` (CTE do blob, superusuário) = **0**.
- Trava REAL como papel limpo `j05c4c1_mig_clean` (`LOGIN NOSUPERUSER NOBYPASSRLS NOREPLICATION NOINHERIT`, DML nas tabelas de `public`) → **`[]`**; boot real → **aceito, `enforced:true`, 0 escape**.
- Script do objeto para o papel novo `j05c4c1_mig_rt` → **ec=0**, linha final `j05c4c1_mig_rt|f|f|f|f|0|0|115` (**posse=0, views=0**, 115 tabelas com DML); senha na saída = 0.
- Premissa do dono ("hoje há 0 views; nenhuma funcionalidade quebra") **confirmada** no banco migrado do objeto.

### 3(b) O catálogo do sistema — 20:11:08Z
- `mig.ts sistema` (ec=0):
```
{"sistema":[{"nspname":"information_schema","relacoes_vm":65,"com_dep_registrada":18,"sem_dep_registrada":47,"menor_oid":13296,"maior_oid":13624},{"nspname":"pg_catalog","relacoes_vm":76,"com_dep_registrada":14,"sem_dep_registrada":62,"menor_oid":12000,"maior_oid":12340}]}
{"variante_sem_force_raizes_do_sistema":{"raizes":0,"tabelas":0,"force":0,"quais":null}}
{"view_force_original":0}
{"controle2_variante_view_de_usuario_sobre_N":{"raizes":1,"tabelas":1,"force":0,"quais":"zz_n"}}
```
- `pg_catalog`: **76** relações `v`/`m` (OID 12000–12340), 14 com dependência de regra registrada para outra `pg_class`, 62 sem; `information_schema`: **65** (OID 13296–13624), 18 com, 47 sem. As dependências registradas (psql: agrupadas por alvo) são **todas para views**: `v/information_schema` 111, `v/pg_catalog` 150 — **nenhuma para tabela**. `deps de regra para OID < 12000` = **0** (os catálogos fixados do `initdb` não recebem registro); tabelas `r` do catálogo: 68, **0 com FORCE, 0 com RLS**; menor OID de tabela de usuário = **16389**.
- Variante MINHA do `view_force` **sem** o filtro FORCE (o `view_walk` do blob, raízes restritas a `pg_catalog`/`information_schema`, alvo `relkind IN ('r','p')`): **raízes que alcançam tabela = 0, tabelas = 0, com FORCE = 0**. O `view_force` original (todas as raízes) = **0**.
- **Implicação para o falso negativo (1 linha):** o `pg_depend` só deixa de registrar dependência para objeto FIXADO (OID < 12000, catálogos do `initdb`, sem RLS e sem FORCE); tabela de usuário (OID ≥ 16384) nunca é fixada, e nas 17 views/matviews de usuário que montei (itens 1(b)/(c)) — 13 com a tabela na regra, 3 sobre view/matview (cadeia seguida), 1 sobre função (F5) — toda regra que cita tabela registrou a tabela — não existe forma de view de usuário cuja dependência de tabela FORCE de usuário fique fora do `pg_depend`; o que fica fora é o que não é dependência de regra (corpo de função — F5, sem escape).

### 3(c) T5/T15 e o banco depois da suíte
- Do TAP da linha de base (`$SCRATCH/med/base.tap`, 20:01:29Z): `ok 1 - T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão` e `ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo`.
- O T8e/T14d criam e derrubam views sobre FORCE nesse mesmo `erp_techsolutions`: depois da linha de base e das 8 execuções do arquivo sob mutação/controle, `view_force` (CTE extraído do blob) = **0** (20:11:08Z, `view_force_original`); views de usuário = 0 (20:10:57Z). Sem resíduo.

### 3 — Vermelho-controle (os três)
- **(1) o contador acusa** (`mig.ts controle1`, ec=0): banco `j05c4c1_migctl` = `TEMPLATE erp_techsolutions`; alvo real `public.attachments` (`relforcerowsecurity=true`):
```
{"alvo_force":{"relname":"attachments","relforcerowsecurity":true}}
{"antes":0,"trava_limpo_antes":[]}
{"com_view":1,"linhas":["view/postgres/1"],"boot":{"aceito":false,"nome":"RuntimeRoleGuardError","code":"RUNTIME_ROLE_CAN_BYPASS_RLS","escapes":["view:postgres"]}}
{"depois_do_drop":0,"trava_limpo_depois":[]}
```
  antes **0** e trava `[]`; com `CREATE VIEW public.zz_ctl_v AS SELECT * FROM public.attachments` (sem grant a ninguém) → **1**, trava do papel limpo `["view/postgres/1"]`, boot **recusa** `RUNTIME_ROLE_CAN_BYPASS_RLS`; depois do `DROP VIEW` → **0** e `[]`. ACUSOU (banco de controle removido).
- **(2) a variante sem FORCE enxerga**: aplicada às raízes de `public` no banco `j05c4c1_ctl` (view de usuário `zz_c` sobre `zz_n`, sem FORCE) → `raizes=1, tabelas=1, force=0, quais=zz_n`. ACUSOU — o "catálogo não dispara" do (b) não é vácuo.
- **(3) a trava está viva no banco migrado**: o superusuário `postgres` conectado em `erp_techsolutions` → trava `atributo/pg_execute_server_program`, `atributo/pg_read_server_files`, `atributo/pg_write_server_files`, `atributo/postgres`, `posse/postgres/106`; boot **recusa**. ACUSOU.
- **Veredito do item 3: VERDE.** Banco migrado com `view_force` 0, 0 views, papel limpo aceito pela trava, pelo boot e pelo script (views=0); catálogo do sistema não dispara (0 tabela alcançada, 0 FORCE); T5/T6/T9 e T15 verdes; `view_force` 0 depois da suíte. Premissa da `D-405-PROIBIR-VIEWS` confirmada: sem `sinal_ao_dono`.

## Fecho — 20:13Z
- Objeto re-resolvido no fim (20:12:45Z): `git ls-remote` = `gh pr view 405 headRefOid` = **79b0d594b137c4b65640a2da6ac4e61b8e3ddc7f** (não andou); `origin/main` no fim = **a9bbde382213627545e9d229c9ab616d83a0a840** (= início).
- Obituário no objeto (`OBITUARIO-IDENTIDADES.md`): 301 linhas, 34 `SEPULTADA`, 7 `RESERVADA`; `grep -c jurado-san305-c4-catalogo-de-views` = **0**, `san305|SAN3-05` = 0. Elegível.
- Lidos como insumo (roteiro, re-medidos): parecer do inspetor da junta 4; `decisoes.md` (R3/R4, `D-405-PROIBIR-VIEWS`, `D-FABLE-ASTRA-SO-DINHEIRO`); plano `## Ciclo 4` (C4.2–C4.3, l.2225-2270); `ciclo4/DEV-relatorio.md` (l.1-14); o blob do arquivo de guarda, da trava, do bootstrap e do script. **Nenhum arquivo `ciclo4/C2-*` ou `ciclo4/C3-*` aberto** (não existiam no disco quando listei o diretório, 19:4xZ).

## Limpeza (teardown)
- Cluster (antes de derrubar): `mig.ts desmontar` → papéis `j05c4c1_mig%` = 0; `caso.ts desmontar` × 10 → cada caso `papeis_restantes=0 bancos_restantes=0`; contagem final: papéis `j05c4c1%` = 0, bancos `j05c4c1%` = 0, papéis `s305%` = 0, slots = 0, views fora do catálogo no migrado = 0, tabelas `zz%` = 0.
- Mutações: as 9 execuções (M4a/b/c × t/s, CTL1_t, CTL1_s, CTL2_s) restauradas por `cp` do `.pristino`, md5 container = blob (`9efee03d…` trava, `5cab4f63…` script) em todas, antes de derrubar o container.
- Containers: `docker rm -f -v j05c4-c1-node` ec=0, `docker rm -f -v j05c4-c1-pg` ec=0 (volume anônimo `e81906ca…` → **removido**), `docker network rm j05c4-c1-net` ec=0; `docker ps -a --filter name=j05c4-c1` = **0**, redes = **0**. Restam só `erp-postgres-alt`, `pastrack-teste-banco-teste-1`, `erp-postgres`, `erp-redis` — todos **parados e nunca tocados** (base viva fora de alvo; nenhuma porta 5432/6379/55432 usada).
- Árvore temporária `/c/Users/AMP/t-j05c4c1`: removida no setup (inexistente).
- Worktree: processos vivos com `w-j05c4c1` na linha de comando = **0**; `git worktree remove --force C:/Users/AMP/w-j05c4c1` ec=0; `worktree list | grep -c w-j05c4c1` = **0**.
- Scratchpad `$SCRATCH` (c1): **273 arquivos apagados** (senhas descartáveis `pgpw`/`rpw`, condutor, sondas, mutador, logs JSONL/TAP) — as saídas que sustentam o voto estão coladas neste arquivo; os md5 das sondas estão acima.
- No `w-o05` escrevi só `ciclo4/C1-evidencia.md` e `ciclo4/C1-voto.json`. Nenhum commit, nenhum push. Disco: 11 GB livres no início e no fim.

## Veredito
- Achados: (1) F5 — view sobre função SQL invoker não recusada, sem escape medido: `nota`, `dentro-do-bloco`, `não grave`; (2) a suíte não fixa as formas F1–F3 que o produto recusa (leitura; mutação de restrição à `_RETURN` não executada): `nota`, `dentro-do-bloco`, `não grave`. Nenhum achado `bloqueia` + `grave`. Nenhum item sem medir. Não-convergência: não. Sinal ao dono: nenhum.
- VOTO: **APROVADO** — voto em `ciclo4/C1-voto.json`.
