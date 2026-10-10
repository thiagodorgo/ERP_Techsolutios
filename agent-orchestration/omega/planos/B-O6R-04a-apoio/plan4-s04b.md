
### 4.2 `scripts/inventory-duplicates-census.sql` (NOVO, autorizado nominalmente — emenda 2-g) — somente leitura (N-C6)
Mesmas duas consultas do v2 (grupo por `tenant_id` + chave, `array_agg(id ORDER BY created_at)`, e o resumo), com a **linha 1 reescrita**: `-- … SOMENTE LEITURA: o arquivo contém apenas
consultas (SELECT); nada é gravado.` O T-C6 remove comentários (`--…`, `/*…*/`) **antes** de aplicar a regex `\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|COPY|MERGE)\b` (`[05]`: texto
cru 3 casamentos → sem comentários 0) e executa o arquivo por stdin contra a base com 1 grupo semeado: linhas com `tipo`, `chave_1`, `chave_2`, `linhas`, `movimentos`; contagem antes = depois
(`[09]`: 22 linhas para 21 grupos; 59 = 59).

### 4.3 Roteiro do censo e do deploy — ato do dono (`P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD`, §13-1) — com a trava do M-02
1. **Antes do próximo deploy** de staging (`STAGING_DATABASE_URL` — `deploy-staging.yml:44` migra) e de produção (`PROD_DATABASE_URL` — `deploy-production.yml:136`): `psql "$URL" -f
   scripts/inventory-duplicates-census.sql`; guardar a saída fora do repositório. **Aviso do gatilho:** `deploy-staging.yml` dispara em `push: main` com `if: vars.STAGING_DEPLOY_ENABLED == 'true'`
   (hoje `skipped`, `gh variable list` vazio — crítico `[k2]`); no dia em que a variável for ligada, **o merge deste bloco na `main` já é o deploy** — o censo tem de vir antes.
2. N = 0 nas duas → o deploy passa. N > 0 → decisão humana por grupo (qual compensação/ajuste vale; o outro é estornado por movimento compensatório, nunca apagado — ledger imutável).
3. **Se a migração abortar num ambiente** (censo não rodado ou dado novo): `_prisma_migrations` fica com `20260873…` e `finished_at NULL`, e **todo `migrate deploy` seguinte falha com `P3009`
   mesmo depois de sanear o dado** (`[08]`: 3º deploy com dado limpo → `P3009`). Saída, nesta ordem: sanear → `npx prisma migrate resolve --rolled-back
   20260873000000_add_stock_movements_unique_backstops` (contra a mesma `DATABASE_URL`) → `migrate deploy` (`[08]`: 4º deploy aplicado). Enquanto isso, **a fila de `prisma/`** (`03a → SAN3-02 → SAN3-20
   → B-O6R-12 → B-O6R-09`, §6 do SAN3) fica presa nesse ambiente — por isso o censo é a 1ª pendência da ata e o texto da exceção já nomeia o comando.
4. O merge do bloco **não** depende do censo; o deploy, sim. O ato entra na recontagem do `B-SAN3-10` (§4.2 do plano SAN3).

### 4.4 Drill de DDL em base PRÓPRIA (T-04) — `tests/inventory-migration-drill-db.test.ts`
C4 (up→down→re-up) e C5 (censo fail-closed com duplicatas semeadas) fazem `DROP INDEX`/`CREATE UNIQUE INDEX` em `stock_movements`; o DDL pega ACCESS EXCLUSIVE e, na fila atrás de uma tx que
segure a tabela (A2/A14/B3 seguram 1,5–5,5 s), **bloqueia toda leitura e escrita da tabela** — na CI o job roda os arquivos em processos paralelos (`ci.yml:244-246`) → `P2028` nas irmãs (crítico
`[f6]`). Isolação: a suíte deriva o nome `erp_<db>_drill_<random>` da `DATABASE_URL`, faz `CREATE DATABASE` pelo cliente admin, roda `npx prisma migrate deploy` por `execFileSync` com
`DATABASE_URL` apontando para ela (16 s `[02]`; sem `db:seed`), executa C4/C5 lá com um `PrismaClient` próprio e faz `DROP DATABASE … WITH (FORCE)` no teardown. Sem permissão de `CREATE DATABASE`
→ **vermelho, nunca skip** (na CI o usuário é `postgres`; localmente é o dono do cluster). `[09]` DDLISO: DDL na base própria (151 ms) com H segurando `stock_movements` na base das suítes 3,4 s
→ V `createMovement` na base das suítes em **95 ms, sem bloquear**. As demais suítes `-db` do bloco **não fazem DDL** (D9 no T-D reprova `DROP|CREATE INDEX` fora do drill).
