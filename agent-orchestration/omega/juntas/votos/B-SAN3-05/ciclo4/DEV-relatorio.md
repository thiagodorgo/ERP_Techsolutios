# B-SAN3-05 · ciclo 4 · relatório do desenvolvedor

- **Identidade:** `dev-ciclo4-b-san3-05` (não achou, não planejou, não votou).
- **Modelo:** Claude Opus 5.5 (`claude-opus-5-5`) — substituição declarada (§C7.6-bis: o bloco não toca dinheiro; Fable só em bloco de dinheiro).
- **Plano:** `docs/revisoes/SAN3/B-SAN3-05-plano.md`, seção "## Ciclo 4 — planejador-ciclo4-b-san3-05" (STATUS: COMPLETO).
- **Fonte §A1.1:** `D-405-PROIBIR-VIEWS` (decisões, 2026-10-09).
- **Head do disparo:** `7c63f920c996cf105535f345eec2ee10461c77a3` (= `ls-remote origin fix/runtime-role-sem-bypass`, medido 17:52Z).
- **Worktree:** `C:/Users/AMP/w-o05` (ramo `fix/runtime-role-sem-bypass`). `scratchpad/` não rastreado não é meu: não apago nem commito.
- **Terreno:** Postgres 16 e Node 20 só em contêineres Linux próprios, prefixo `dev05c4-`, rede própria, sem porta no host;
  `erp-postgres`, `erp-redis`, 5432 e 6379 nunca são alvo. Tudo sob `timeout`; sem `tail -f`.

Formato de cada item (P1): comando → saída resumida → resultado.

## Terreno (18:02–18:04Z)

- `bash scratchpad-da-sessão/dev05c4/setup.sh 7c63f920…` (= passos 1–4 da `receita-pg16.sh`, prefixo `dev05c4-`, + `redis:7`
  próprio para a suíte inteira) → rede `dev05c4-net`; `dev05c4-pg` (`postgres:16`, 16.14), `dev05c4-redis`, `dev05c4-node`
  (`erp-junta-node20-pg16:local`, node v20.20.2, npm 10.8.2, psql 16.14); **sem porta no host**; senha do pg aleatória, só no
  ambiente e num arquivo de estado do scratchpad da sessão.
- Árvore do disparo por `git -c core.autocrlf=false archive` → `blobs=3760 byte_identicos=3760`; `md5sum -c` de 3760 arquivos no
  contêiner → 0 divergência; `npm ci` ec=0 (326 pacotes); `prisma generate` ec=0; `prisma migrate deploy` ec=0 (107 migrações).
- Catálogo migrado: **115 tabelas · 106 FORCE · 0 views/matviews** fora de `pg_catalog`/`information_schema`.
- Iteração: os arquivos do ramo entram no contêiner normalizados para LF (`sed 's/\r$//'`), com md5 local = md5 no contêiner
  conferido a cada cópia; restauro = blob do commit por `git show`, md5 conferido.

## Item 1 — Código (trava, script, documentação)

**Comando:** edições no `w-o05`; validação no contêiner: `bash -n scripts/db-runtime-role.sh` · `npx tsc --noEmit -p tsconfig.json`
· md5 diagnóstico da SQL (`node /tmp/sqlmd5.cjs`: md5 do template literal com LF).

**Saída resumida:**
- `src/database/runtime-role.ts` — sai o CTE `view_escape` (o `)` do `view_force` fecha o `WITH`); ramo `view` = `FROM view_force vf
  JOIN pg_class v ON v.oid = vf.root_oid JOIN pg_roles o ON o.oid = v.relowner`, **sem `WHERE`** (o `SELECT`/`GROUP BY` ficaram);
  comentário l.1-12 diz a propriedade nova (`D-405-PROIBIR-VIEWS`; "ATRIBUTO e POSSE são avaliadas para session_user E current_user");
  mensagem do `RuntimeRoleGuardError` ganhou "e nenhuma view/matview sobre tabela FORCE". Nada mais no arquivo.
- md5 diagnóstico: o método confere no blob do disparo (md5 do SQL = `ddd60b06688f7f4c103946decc780cb2` = o do comentário);
  regravado para **`2ed16571b942efbc8b48231469396786`** (= md5 do valor importado por `tsx`).
- `scripts/db-runtime-role.sh` — sai o `view_escape` do `DO` e da linha final; ramo `view` do `DO` = `SELECT DISTINCT 'view',
  v.oid::regclass::text FROM view_force vf JOIN pg_class v ON v.oid = vf.root_oid`; coluna `views` = `(SELECT count(*) FROM
  view_force)`; `RAISE` com o remédio novo ("nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de
  cada uma e rode de novo (MODO 6)") e **4 `%` × 4 argumentos** (saíram juntos o último `%` e o último `v_role`); cabeçalho l.3-4 e
  l.20-21. **Declarado:** o comentário-cabeçalho da linha final (`-- linha final … |views_de_dono_que_escapa|…`) passou a
  `views_sobre_force` — é o nome da coluna `views`, que mudou de significado; tratei como parte de "a coluna `views`" do C4.4.
  B1 (`\password`, `setsid`, `password_encryption`) intacto; arquivo segue LF (0 CR por `tr -cd '\r'`).
- `docs/deployment.md` — só os 3 trechos: via `view` (regra operacional "nenhuma view nem matview sobre tabela protegida (FORCE
  RLS), em nenhum esquema, de nenhum dono"), MODO 6 (lista cada view, `DROP VIEW`/`DROP MATERIALIZED VIEW`) e a frase do compose
  (a migração que crie uma deixa T5/T15 vermelhos na CI; se chegar ao banco a trava recusa o boot e o MODO 6 lista cada view).
- `bash -n` ok; `tsc --noEmit` ec=0.

**Resultado:** item 1 feito conforme C4.2(3).

## Item 2 — Testes (T8c, T8d, T8e, T8f, T14d)

**Comando:** reescrita só de T8c (sai o caso `view` e os objetos dele), T8d (`objetos` 1 → 2), T8e, T8f, T14d e dos helpers
deles (saem `createViewEscapeFixture`/`dropViewEscapeFixture`/`assertNoInnerSelect`/tipos `ViewEscape*`; entram
`createViewRuleTables`/`dropViewRuleTables`/`createViewRuleObject`/`dropViewRuleObject`/`viewRuleAnchor`/`escapeLines`/
`updateThroughView`). T8e: leitores `LOGIN` por `CREATE ROLE` (nunca `createLogin`) `rnone`/`rsel`/`rupd`/`rins`; casos
COL/COM/MAT/CTL **um por vez** (cria → mede → derruba no `finally`), cada um com `deepEqual` do conjunto exato de linhas. T14d:
mesmos casos, papel de runtime novo `NOLOGIN NOINHERIT` por caso, âncora imediatamente antes, `runRoleScript` uma vez; COL/COM/MAT
→ `status 3`, `/MODO 6/` e `por 1 via(s): view:<objeto do caso>.`; CTL → `status 0` e `^<papel>|f|f|f|f|0|0|`. N é tabela com RLS
ligada **sem** FORCE (controle mais forte que tabela sem RLS). Nenhum subteste novo (o arquivo continua 12).

**Vermelho-controle (testes novos × trava/script do objeto, blobs `692d953d…`/`911fddc1…` restaurados no contêiner):**
`node --test tests/san3-05-runtime-role-guard-db.test.ts` → `# tests 12 # pass 7 # fail 5` — vermelhos:
- T8d — `expected: 2 · actual: 1`;
- T8e — `caso COL: a trava de s305_c4_rsel_… precisa recusar exatamente a view s305_c4_col_…` (`actual []`), **depois** de a âncora
  (tabela=f, coluna=t) e os três efeitos de coluna passarem (SELECT lê B sob A; UPDATE sem WHERE altera B; INSERT grava B) —
  C1-c3-01 reproduzido;
- T8f — `a trava não pode conservar o filtro view_escape`;
- T14d — `caso COL: status deveria ser 3`, `actual 0`, linha final `…|f|f|f|f|0|0|117` — C1-c3-02 reproduzido (papel novo com
  privilégio só de coluna convergiu);
- e o teste-pai (4 subtestes). T5/T7/T8b-T8c/T8c/T14a-b/T14c/T15 verdes.

**Head (código novo no contêiner):** `# tests 12 # pass 12 # fail 0 # skipped 0` (ok 1–11 + pai).

**Travas do arnês re-medidas (`node /tmp/catcount.cjs`, as regexes exatas do T14c e do ratchet):**
- T14c `spawnCommand(`·`runCatalogCommand(`·`ROLE_SCRIPT`·`spawn(`·`spawnSync(` = **2·4·5·2·3** antes e depois (intactas).
- Ratchet do arquivo de guarda: **82 → 72** (`CREATE ROLE` 31→31 · `DROP ROLE` 0 · `ALTER ROLE` 2→2 · `GRANT` 34→30 · `REVOKE` 1→1 ·
  `OWNER TO` 14→8). Entrada do `tests/db-catalog-write-guard.test.ts` atualizada (só ela: `count` e `reason`).
- `node --test tests/db-catalog-write-guard.test.ts` → `# tests 5 # pass 5 # fail 0`.

**Resultado:** item 2 feito; os 5 testes reescritos ficam vermelhos no objeto pelo caso certo e verdes no head.

## Item 3 — Mutações M4a/M4b/M4c × (t)/(s)

**Comando (18:08–18:11Z):** `bash mutrun.sh afb575b4… M4a-t M4a-s M4b-t M4b-s M4c-t M4c-s` (scratchpad da sessão). Para cada uma:
restaura os 2 blobs do head `afb575b4` no contêiner → `node /tmp/mutate.cjs <id>` (âncora literal com **contagem = 1** exigida,
arquivo sem CR, prova `substituida=sim`) → `bash -n` → `npx tsc --noEmit` → `node --test tests/san3-05-runtime-role-guard-db.test.ts`
→ restaura os blobs e confere md5. Só a cópia do contêiner é mutada; o `w-o05` nunca.

| id | mutação (só um arquivo) | `bash -n` / `tsc` | resultado da suíte | subteste · caso · mensagem |
|---|---|---|---|---|
| M4a-t | trava: ramo `view` volta a filtrar por `has_table_privilege(session_user\|current_user, v.oid, 'SELECT,INSERT,UPDATE,DELETE')` | 0 / 0 | 12 · pass 9 · fail 3 | **T8e · COL** · "caso COL: a trava de s305_c4_rsel_… precisa recusar exatamente a view s305_c4_col_…"; também T8d ("Expected values to be strictly equal": `objetos` cai para 1) |
| M4a-s | script: ramo `view` do `DO` ganha `WHERE has_table_privilege(alvo.oid, v.oid, …)` | 0 / 0 | 12 · pass 10 · fail 2 | **T14d · COL** · "caso COL: status deveria ser 3" |
| M4b-t | trava: ramo `view` ganha `WHERE o.rolsuper OR o.rolbypassrls` | 0 / 0 | 12 · pass 10 · fail 2 | **T8e · COM** · "caso COM: a trava precisa recusar a view de dono comum sem grant" |
| M4b-s | script: ramo `view` do `DO` ganha `JOIN pg_roles o … WHERE o.rolsuper OR o.rolbypassrls` | 0 / 0 | 12 · pass 10 · fail 2 | **T14d · COM** · "caso COM: status deveria ser 3" |
| M4c-t | trava: sai `AND t.relforcerowsecurity` do `view_force` | 0 / 0 | 12 · pass 9 · fail 3 | **T8e · CTL** · "caso CTL: view sobre tabela SEM FORCE não pode produzir escape para s305_c4_rsel_…"; também T8f ("o CTE do DO divergiu da trava") |
| M4c-s | script: sai `AND t.relforcerowsecurity` só do `view_force` do `DO` (âncora inclui `\n  )\n  SELECT string_agg`) | 0 / 0 | 12 · pass 9 · fail 3 | **T14d · CTL** · "caso CTL: view sobre tabela SEM FORCE deveria convergir"; também T8f ("o CTE do DO divergiu da trava") |

("fail" conta o teste-pai.) Os casos rodam em sequência COL → COM → MAT → CTL; sob M4a o primeiro caso da lista do plano (COL)
é o que reporta, e sob M4b o primeiro (COM) — os seguintes não são alcançados no mesmo subteste.

**Restauro:** depois de cada mutação, md5 no contêiner = blob do head: trava `9efee03db097f54e73178e1ec4c740d9`, script
`5cab4f63b1259450acf68675205d5908` (6 × 2 conferências, todas iguais). `mutrun ec=0`.

**Resultado:** 6/6 vermelhas pela asserção do caso indicado (AC4-3), com `bash -n`/`tsc` ec=0 em todas; restauro conferido.

## Item 4 — Bateria do C4.5 (D0–D10)

Linha de base do planejador no objeto `37c83064`: guard-db 12 · bootstrap 12 · acessos 35 · leituras 13 · catalog-guard 5.
Contêiner conferido no head `d66eb178` antes da bateria: md5 dos 5 arquivos de código/teste/doc tocados = blob do head (5/5 IGUAL).

### D1–D2 — check e lint (18:12Z)

- **Comando:** `dk exec dev05c4-node timeout 600 npm run check` · `… npm run lint` (`lint` = `npm run check` = `tsc -p tsconfig.json --noEmit`).
- **Saída:** `npm run check ec=0` · `npm run lint ec=0`.
- **Resultado:** verde.

### D3 — guard-db 3× + controle sem psql (18:13Z)

- **Comando:** 3 × `timeout 900 node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts` no mesmo contêiner; antes e
  depois de cada rodada, resíduo (`pg_roles`/`pg_class`/`pg_database` `LIKE 's305%'`, views/matviews fora do sistema, slots);
  4ª execução com `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin` (`command -v psql` → ausente).
- **Saída:** r1/r2/r3 = `# tests 12 # pass 12 # fail 0 # skipped 0` (denominador idêntico); `XX000|23505|40P01` no TAP = 0, 0, 0;
  resíduo antes e depois de cada rodada = papéis 0 · relações 0 · bancos 0 · views 0 · slots 0. Sem psql: ec=1,
  `# tests 12 # pass 8 # fail 4` — T14a/b ("psql: ausente — pré-requisito da suíte -db"), T14c, T14d ("caso COL: status deveria ser
  3 … psql: command not found") e o pai; resíduo 0.
- **Resultado:** verde; sem psql falha fechado nomeando o pré-requisito.

### D4 — regressões dirigidas (18:14Z)

- **Comando:** 4 execuções separadas de `node --test --import tsx` com `DATABASE_URL` do pg descartável.
- **Saída:** `san3-05-runtime-role-bootstrap` **12/12** · `san3-05-acessos-de-plataforma-guard` **35/35** ·
  `san3-05-leituras-de-plataforma-db` **13/13** · `db-catalog-write-guard` **5/5** — todos fail 0, skipped 0; resíduo 0.
- **Resultado:** verde; N = linha de base.

### D5 — mutações

- Ver item 3: 6/6 vermelhas pelo caso indicado, restauro conferido.

### D6 — B7 mínima (18:14Z)

- **Comando:** `bash b7.sh` (scratchpad da sessão): `ALTER SYSTEM SET log_statement='all'` + reload; script do head (do contêiner, =
  blob) com senha-sentinela só por ambiente (`-e DB_RUNTIME_PASSWORD` sem valor em argv) para (1) papel novo e (2) o caso COL (tabela
  FORCE, view de dono `postgres`, papel `NOLOGIN NOINHERIT` com `GRANT SELECT (tenant_id, value)` só na view; âncora tabela=f,
  coluna=t); leitor de controle `SELECT 'dev05c4-b7-control-…'`; `docker logs --since` do pg; busca por descritor (`grep -F -f`).
- **Saída:** (1) ec=0, linha final `s305_b7_ok_…|f|f|f|f|0|0|115`, `rolpassword LIKE 'SCRAM-SHA-256$%'` = t; (2) ec=3, `MODO 6` 1×,
  `view:s305_b7_w_…` nomeada, `rolpassword` do papel continua nulo (nada persistiu). Sentinela 1 e 2 = **0** no `server.log` (252
  linhas) e no stdout/stderr das duas execuções; controle no `server.log` = **1**; `SCRAM-SHA-256$` no log = 1 do `\password`
  (`ALTER USER … PASSWORD 'SCRAM-SHA-256$<verificador>'`) + 1 da minha própria consulta de conferência. Limpeza: `log_statement=none`,
  papéis/relações `s305_b7%` = 0.
- **Resultado:** verde.

### D7 — suíte inteira e build (18:14–18:18Z)

- **Comando:** `DATABASE_URL=<dev05c4-pg> REDIS_URL=redis://dev05c4-redis:6379 dk exec … timeout 2400 npm test` (runner
  `scripts/run-backend-tests.mjs`; `CORE_SAAS_PERSISTENCE` não exportado → `memory`, como a CI); depois `npm run build`.
- **Saída:** `[run-backend-tests] 291 arquivo(s) · 3135 teste(s) · pass 3133 · fail 0 · skipped 2`, `npm test ec=0` — os 2 skips são
  os conhecidos do orçamento (`permission-catalog-db-parity`, `RBAC_DB_PARITY` ≠ "1"); `ECONNREFUSED` = 0; `XX000`/`40P01` só no
  título do teste (PA) do catalog-guard; resíduo `s305%` = 0, views fora do sistema = 0. `npm run build` ec=0 (`dist/database/
  runtime-role.js` sem `view_escape`).
- **Resultado:** verde; N executado = 3135 (= ciclo 3: o ciclo troca a prova, não acrescenta subteste), skipped 2 ≤ 2.

### D8–D9 — modo, EOL, `diff --check`, catalog-guard

- **Comando:** `git ls-files -s scripts/db-runtime-role.sh` · `git ls-files --eol …` · `git diff --check 7c63f920..HEAD` ·
  `git diff -U0 7c63f920..HEAD -- tests/db-catalog-write-guard.test.ts`.
- **Saída:** `100755 c0d51635…` · `i/lf w/lf attr/text eol=lf` · `diff --check ec=0` · o diff do catalog-guard é só a entrada
  `san3-05-runtime-role-guard-db.test.ts` (`count: 82` → `72` e a `reason`), 2+/2−.
- **Resultado:** verde.

### D0 — head, escopo e KPI (no head `2fee8d28`, 18:20Z)

- **Comando:** `git rev-parse HEAD` × `git ls-remote origin fix/runtime-role-sem-bypass`; `git diff --name-only 7c63f920..HEAD` contra o
  PERMITIDO do C4.4 (regex dos 8 caminhos); `git diff --quiet 7c63f920 HEAD -- Kpis/`; `git diff --numstat 7c63f920..HEAD`.
- **Saída:** HEAD = ls-remote = `2fee8d28810086d5dc924fa22e99c6fce73a2cde`; 8 arquivos, **0 fora do PERMITIDO**; `Kpis/` ec=0 (sem diff).
  numstat: trava 9+/16− · script 8+/24− · `deployment.md` 11+/9− · arquivo de guarda 232+/185− · catalog-guard 2+/2− · log 6+ ·
  status 8+ · relatório 174+. Os ` M` fantasmas de `.agents/` e o `scratchpad/` não rastreado nunca entraram em commit (staging nominal).
- **Resultado:** verde.

### D10 — push e check-runs (head `2fee8d28`)

- **Comando:** `gh api repos/thiagodorgo/ERP_Techsolutios/commits/2fee8d28…/check-runs` em laço até nenhum pendente.
- **Saída:** `total=7` — docker · backend · owner-portal · backend-postgres · flutter · frontend · authority-portal, todos
  `completed | success` (último às 18:30:45Z). Os runs dos heads intermediários (`afb575b4`, `d66eb178`, `941c9ea7`) foram cancelados
  pelo grupo de concorrência do CI ao chegar o push seguinte — não são falha.
- **Resultado:** verde. O commit de fecho deste relatório (só este arquivo) gera head novo; os check-runs dele vão na mensagem final.

## Teardown (18:31Z)

- **Comando:** `docker rm -f -v dev05c4-node dev05c4-pg dev05c4-redis` · `docker network rm dev05c4-net` · contagem por filtro de nome ·
  `docker volume inspect` dos 2 volumes anônimos registrados antes · `ls /c/Users/AMP/t-dev05c4`.
- **Saída:** rm ec=0, network rm ec=0; contêineres `dev05c4` = 0, redes = 0; os 2 volumes anônimos removidos; árvore temporária ausente
  (já removida no setup); arquivo da senha descartável e saídas da B7 apagados do scratchpad da sessão; nenhum outro contêiner tocado;
  `erp-postgres`, `erp-redis`, 5432 e 6379 nunca foram alvo; disco 11 GB livres (igual ao início).
- **Resultado:** terreno limpo.

## Checklist do dev

- [x] Código: trava sem `view_escape` e sem filtro de dono/privilégio na via `view`; script idem no `DO` e na linha final; `RAISE`
      4 × 4; mensagem; comentário e md5 diagnóstico; `docs/deployment.md` nos 3 trechos (`afb575b4`).
- [x] Testes: T8c, T8d, T8e, T8f, T14d reescritos; 12 testes no arquivo; T14c intacto; ratchet 82 → 72 (`afb575b4`).
- [x] Mutações: 6/6 vermelhas pelo caso indicado, restauro por md5 (`d66eb178`).
- [x] Bateria: D0–D10 verdes com os N do plano (12 · 12 · 35 · 13 · 5; suíte 3135/3133/0/2) (`941c9ea7`, `2fee8d28`).
- [x] Registro: 1 entrada no log de execução e 1 no status geral (`2fee8d28`).
- [x] Não abri/fechei PR nem fiz merge.

### Divergências declaradas

- O comentário-cabeçalho da linha final do script (`views_de_dono_que_escapa` → `views_sobre_force`) foi tratado como parte de "a
  coluna `views`" do C4.4 (o significado da coluna mudou; manter o nome antigo deixaria o texto mentindo).
- T8c teve o título ajustado de "três semi-mutantes" para "dois semi-mutantes" (o caso `view` saiu, como o plano manda).
- Nos casos em sequência (COL → COM → MAT → CTL), cada mutação reporta o PRIMEIRO caso indicado pelo plano que ela derruba (M4a → COL,
  M4b → COM, M4c → CTL); os casos seguintes do mesmo subteste não são alcançados naquela execução.
- O prefixo do terreno é `dev05c4-` (o do disparo do orquestrador), não `dv05c4-` (o do C4.5).
