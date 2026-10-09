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

EM APURAÇÃO

## Item 4 — Bateria do C4.5 (D0–D10)

EM APURAÇÃO

## Teardown

EM APURAÇÃO
