# B-TRC-01 ciclo 2 — evidência incremental do Guardião de Banco

- Instância: `dba-trc01-c2-cdx`
- Papel: Guardião de Banco, parecer pré-requisito da junta; não vota e não conserta
- Modelo declarado: `Codex GPT-5.6 Sol`
- Esforço declarado: `médio`
- Nível declarado: `menor (§C7.6)`
- PR: `#426`
- Objeto: `2043c5840c8f60fe91538840aaefb3420a11cfe3`

## Item 0 — objeto, contrato e terreno

**Comando:** leitura integral de `CLAUDE.md`, `PROJECT_MEMORY.md`, das skills
`backend-review-ts-prisma`/`saas-multi-tenant` e referências; `git -C C:/Users/AMP/w-trc01 show
2043c584...:.claude/agents/agente-dba-guardiao.md`; leitura da decisão
`D-TRC01-VEHICLE-ASSIGNED-AT` em `origin/main`; leitura do parecer do ciclo 1 no objeto.

**Saída resumida:** o papel exige up/down executados e parada para migration destrutiva. A decisão do dono autoriza
nominalmente a migration `20260876000000_work_orders_vehicle_assigned_at`, opção (i): coluna nullable, trigger
`SECURITY INVOKER`, linhas antigas nulas/inelegíveis. O ciclo 1 cobriu somente as migrations 74 e 75; esta cadeira
cobre a nova 76.

**Veredito parcial:** mandato e objeto delimitados; esta cadeira não vota e não conserta.

**Comando:** `git worktree add --detach C:/Users/AMP/w-dba-trc01c2 2043c584...`; `npm ci` executado dentro do
worktree; `git rev-parse HEAD`; `git branch --show-current`; `git status --short`; inspeção de atributos de
`node_modules`; `docker ps --format '{{.Names}}'` filtrado por `tl*`/`j*`.

**Saída resumida:** worktree próprio detached e limpo em
`2043c5840c8f60fe91538840aaefb3420a11cfe3`; `npm ci` próprio concluiu com 326 pacotes (Node `v20.19.5`, npm
`11.7.0`); `node_modules` é diretório normal, sem junction/symlink. Há um único trabalho Docker alheio contado,
grupo `tl179228797429743-*` (containers `run`, `redis`, `pg`); `erp-*` foi ignorado conforme mandato.

**Veredito parcial:** **CONFORME**. Terreno próprio, sem uso da árvore viva nem da base viva; o limite permite o
cluster `dba-trc01c2-*` como segundo trabalho.

## Item 1 — up 2×, rollback e equivalência dos dumps

**Comando:** em PostgreSQL `16.15` no container próprio `dba-trc01c2-pg16`, banco vazio `erp_item1c`: ocultação
temporária e restaurada da pasta da migration 76; `npx prisma migrate deploy` até a migration 75; `pg_dump
--schema-only --no-owner --no-privileges --restrict-key=dbaTRC01c2Roundtrip20261017`; restauração da pasta;
`npx prisma migrate deploy` duas vezes; consulta do ledger `_prisma_migrations`.

**Saída resumida:** baseline `110` migrations, última
`20260875000000_validate_location_source_check`; primeiro deploy aplicou
`20260876000000_work_orders_vehicle_assigned_at`; segundo respondeu `No pending migrations to apply`. Ledger da 76:
`finished=true`, `rolled_back_at IS NULL=true`, `logs IS NULL=true`.

**Veredito parcial:** **CONFORME**. Up real e idempotência por `migrate deploy` comprovados.

**Comando:** execução literal, na ordem documentada no topo da migration, de `DROP TRIGGER IF EXISTS`, `DROP
FUNCTION IF EXISTS` e `ALTER TABLE ... DROP COLUMN IF EXISTS`; segundo `pg_dump` com a mesma restrict-key; `diff -u
/tmp/before_fixed.sql /tmp/after_fixed.sql`; `sha256sum` dos dois dumps.

**Saída resumida:** rollback retornou `DROP TRIGGER`, `DROP FUNCTION`, `ALTER TABLE`; hashes antes/depois idênticos
`f57b7a086f6cf8cd32b58a8dd2dcb2da699c39f86e9c367456d3a588ee326a48`; o diff não publicou nenhuma linha e
encerrou com `DIFF_EXIT:0`.

**Diff publicado:** vazio.

**Nota de reexecução:** uma primeira captura sem `--restrict-key` diferiu somente nas duas sentinelas aleatórias
`\restrict`/`\unrestrict` introduzidas pelo `pg_dump 16.15`; isso foi publicado na saída da execução, não tratado como
equivalência. A prova acima foi repetida integralmente em banco novo com a opção nativa determinística. Uma tentativa
intermediária com `_` na chave foi rejeitada por `invalid restrict key` e não foi usada como prova.

**Veredito parcial:** **CONFORME**. O rollback restaurou exatamente o schema anterior, byte a byte no dump
determinístico. O worktree voltou limpo após restaurar a pasta da migration.

## Item 2 — aditividade, catálogo, RLS, políticas e legado nulo

**Comando:** inspeção das instruções executáveis (linhas de comentário excluídas) da migration; baseline novo
`erp_behavior` até a migration 75; semente de duas `work_orders` antes do up; consultas a `pg_class`, `pg_policies`,
`pg_proc`, `pg_rules`, `pg_trigger` e `information_schema.columns` antes/depois de aplicar a 76.

**Saída resumida:** o up executável contém somente `ALTER TABLE ... ADD COLUMN`, `CREATE FUNCTION` e `CREATE
TRIGGER`; não contém `DROP` nem `ALTER` destrutivo. A coluna é `timestamp with time zone`, `nullable=YES`. A função
retornou `prosecdef=false` (`SECURITY INVOKER`); há `rules=0` e exatamente `trigger=1`.

**Comando:** digest ordenado de todas as políticas de `work_orders` antes/depois do up, mais flags RLS; contagem
da coluna nova nas duas linhas semeadas antes da migration.

**Saída resumida:** antes e depois, `relrowsecurity=true|relforcerowsecurity=true`; exatamente uma política
`work_orders_tenant_isolation|ALL`, com `USING` e `WITH CHECK` por
`app.current_tenant_id`; digest idêntico `801677c6527388407a204f6700c8bcac`. Após o up,
`legacy_null=2`: ambas as linhas antigas ficaram com `vehicle_assigned_at IS NULL`.

**Veredito parcial:** **CONFORME**. A migration é aditiva, preserva `ENABLE` + `FORCE ROW LEVEL SECURITY` e as
mesmas políticas, não cria RULE e implementa a opção (i) aprovada pelo dono.

## Item 3 — comportamento sob papel sem BYPASSRLS e integridade das linhas

**Comando:** antes do up, MD5 ordenado de `(to_jsonb(work_orders)-'vehicle_assigned_at')` sobre as duas linhas
semeadas; repetição imediata depois do up, antes de qualquer UPDATE comportamental.

**Saída resumida:** MD5 antes `c9a2f2b22198ee518e88657e620b8abc`; MD5 depois, excluindo somente a coluna
nova, `c9a2f2b22198ee518e88657e620b8abc`.

**Veredito parcial:** **CONFORME**. O up não alterou nenhum byte lógico das linhas semeadas fora da coluna nova.

**Comando:** criação da role exclusiva `dba_trc01c2_role LOGIN NOSUPERUSER NOBYPASSRLS`; grants mínimos de
`USAGE`, `SELECT` e `UPDATE`; transação com `SET LOCAL ROLE dba_trc01c2_role` e `SET LOCAL
app.current_tenant_id=<tenant-semente>`; três UPDATEs seguidos de `ROLLBACK`.

**Saída resumida:** catálogo da role: `super=false|bypass=false`; sob ela, as duas OS do tenant ficaram visíveis.
Ao trocar `vehicle_id` e mandar simultaneamente `vehicle_assigned_at='2000-01-01'`, o retorno foi
`change_overrode_arbitrary=true|near_now=true`: o gatilho gravou o instante atual, não o valor do cliente. Em novo
UPDATE sem trocar a viatura, a tentativa `1999-01-01` retornou
`unchanged_vehicle_preserved_trigger_value=true|arbitrary_rejected=true`. Na OS antiga sem viatura, a tentativa
`1998-01-01` retornou `null_vehicle_stays_null=true`. A transação foi revertida.

**Veredito parcial:** **CONFORME**. O comportamento foi executado sob papel sem bypass; o cliente não controla o
timestamp e o gatilho prevalece nos ramos de troca, manutenção e ausência de viatura.

## Item 4 — limpeza

**Comando:** confirmação dos alvos exatos por `docker inspect`, `Resolve-Path` e `git worktree list`; `docker rm -f
dba-trc01c2-pg16`; `git worktree remove --force C:/Users/AMP/w-dba-trc01c2`; verificação posterior por
`docker ps -a`, `Test-Path` e nova listagem de worktrees.

**Saída resumida:** foi removido somente o container próprio `/dba-trc01c2-pg16` (`postgres:16-alpine`, bind
exclusivo `127.0.0.1:49293`) e somente o worktree próprio detached no SHA julgado. Depois, o container não apareceu
na listagem, `Test-Path` retornou `False` e o worktree não apareceu no registro Git. A imagem compartilhada não foi
apagada; nenhum `erp-*`, `tl*`, outra porta, base viva ou worktree alheio foi tocado.

**Veredito parcial:** **CONFORME**. Limpeza própria concluída sem `docker prune`.
