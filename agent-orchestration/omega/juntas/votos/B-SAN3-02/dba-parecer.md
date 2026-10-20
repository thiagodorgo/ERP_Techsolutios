# B-SAN3-02 — Parecer de BANCO (dba-guardião) — PR #448, head `be344c85`

- **Identidade:** `dba-san302-opus` (nova; Claude Opus 5.5 — nível menor declarado, §C7.6). Parecer obrigatório de banco; **não é voto de cadeira**, é insumo das cadeiras.
- **Objeto:** `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql` e `prisma/schema.prisma` (modelo `FinancialTitle`), contra `docs/revisoes/SAN3/B-SAN3-02-plano.md` (v2 §5 + Anexo A v2.1 + Anexo B v2.2 + Anexo C Q1–Q4) e `docs/revisoes/SAN3/B-SAN3-02-dev.md`.
- **Onde medi (§A7):** ref `be344c85` (cópia própria `C:/Users/AMP/w-dba302`, `git worktree add … be344c85 --detach`); `main` = merge-base `bf83cda8` (= `origin/main` medido no início). Banco: Postgres 16 descartável via `teste-linux.sh` (rede própria, sem porta publicada; nunca a base viva).

## Item 1 — Migração ADITIVA; aplica limpo sobre a main (112) e sobre base com dado legado
**Roteiro:** `C:/Users/AMP/w-dba302/tmp-dba/cenario.sh`, rodado por `teste-linux.sh C:/Users/AMP/w-dba302 "bash tmp-dba/cenario.sh"` (contêiner `tl17924538919161`, ~23:51Z). Bases próprias por `CREATE DATABASE` no Postgres 16.15 efêmero. O nível da main é o mesmo checkout sem o diretório `20260878000000_…` (112 migrações).

- **Texto (estático):** 6 sentenças ativas. Fora dos comentários, nada de GRANT/REVOKE/SECURITY DEFINER/CONCURRENTLY/POLICY/ROW LEVEL/UPDATE-DELETE de dado/TRUNCATE/DROP TABLE/DROP COLUMN/ALTER COLUMN. O único acerto do grep é o `ON UPDATE CASCADE` da FK (l.10), um falso positivo. O SQL é idêntico ao §5 do plano. O único DROP é o do índice antigo `financial_titles_wo_direction_active_key`, depois de o novo existir, como manda o §5 do SAN3 (troca autorizada; nenhum dado sai). → **ADITIVA**.
- **Base vazia → head (113):** `migrate deploy` ec 0 (pelo teste-linux); `migrate status` "Database schema is up to date!" ec 0; `_prisma_migrations` 113/113 finalizadas, 0 falhas.
- **Base na main (112) + legado → head (`dbleg`):** deploy na main ec 0, 112/112.
  - O legado: 2 organizações; na OS-1, um título receivable removido, o original receivable ativo e um payable ativo; a OS-2 só com título removido; 2 avulsos ativos sem OS; na Org Dois, um original cancelado por status (deleted_at NULL). São 4 itens, 3 faturados (carimbo + title_id) e 1 não faturado.
  - `migrate status` antes: ec 1, "20260878… not yet applied". `migrate deploy` ec 0. Status depois: "up to date", ec 0.
  - md5 das linhas de `financial_titles` **sem a coluna nova**, antes × depois: `6e042d84…` = `6e042d84…`, logo **nenhum dado alterado**; `count(parent_title_id)` = 0 em 6 linhas.
  - `pg_relation_filenode(financial_titles)` antes = depois (22143), logo **sem rewrite**.
  - diff do snapshot completo pré × pós (contagens das 118 tabelas, constraints, índices, RLS/ACL, policies, triggers, funções, `_prisma_migrations`, hashes): **só** +CHECK, +FK, +2 índices, −índice antigo e +1 linha MIG (checksum `c8a80631…`, o mesmo do relatório do dev). Nada mais.
- **Lock e escala (`dbscale`: 50k OS / 200k títulos / 66 MB):** migração ensaiada em transação com ROLLBACK, lendo `pg_locks` antes do fim. Ela segura **AccessExclusiveLock** em `financial_titles` até o COMMIT. Tempos por sentença: ADD COLUMN 2,7 ms · índice auxiliar 446 ms · FK 80 ms · CHECK 51 ms · índice parcial 447 ms · DROP 1 ms, o que dá **≈1,0 s de bloqueio a 200k linhas**. Deploy real ec 0 em 4,7 s (com o arranque do CLI); filenode igual (25682); 200k linhas, 0 com pai.
- **NOT VALID/VALIDATE:** não usados. A FK e o CHECK validam por varredura sob o mesmo lock (~130 ms medidos a 200k linhas). Os índices não-CONCURRENTLY são a parte dominante: o CONCURRENTLY é vedado na transação do `migrate deploy` (H10). Com o volume real da tabela, a janela é desprezível.
- **Veredito item 1: VERDE.** Ressalva **R1** (operação, não bloqueia): se `financial_titles` passar de alguns milhões de linhas antes do deploy, reavaliar FK/CHECK com `NOT VALID` + `VALIDATE` e o índice em migração separada.

## Item 2 — RESTORE COMPROVADO (pg_dump → base nova → contagens e constraints iguais)
- **Origem:** `dbleg` no head, com o legado **mais 1 complementar ativo** (pai = original receivable da OS-1) e o item "Pedagio" carimbado nele: 7 títulos, 1 com pai.
- **Comando:** `pg_dump -Fc -d dbleg -f /tmp/dbleg.dump` → ec 0, 441 ms, 647 020 bytes. `CREATE DATABASE dbrest` (template0) + `pg_restore --exit-on-error -d dbrest` → ec 0, **14,3 s** (RTO de banco nesta escala).
- **Comparação:** snapshot completo nas duas bases, 1677 linhas cada. Cobre 118 tabelas com contagem, 537 constraints (`pg_get_constraintdef` + `convalidated`), 618 índices (`indexdef`), RLS/FORCE/ACL por tabela, 109 policies, 12 triggers, 48 funções (`prosecdef` + md5 do corpo), 113 linhas de `_prisma_migrations` (nome, checksum, finalizada, não revertida, passos) e o md5 das linhas de financial_titles, itens, tenants e work_orders. `diff` origem × restaurada: **ec 0, 0 linhas**.
- **Catálogo na restaurada:** FK de 4 colunas e CHECK com `convalidated = t`; os 2 índices novos presentes, o antigo ausente; `financial_titles` e `work_order_financial_items` com RLS/FORCE = t/t. `migrate status dbrest` "up to date", ec 0.
- **Isolamento por organização** (papel efêmero NOSUPERUSER NOBYPASSRLS + `app.current_tenant_id`): na origem e na restaurada, a Org Um vê 6 (0 de outra org, 1 complementar), a Org Dois vê 1 (0 de outra) e sem contexto o papel vê 0. **Idêntico** nas duas: o dump não vaza escopo nem o perde. Os grants do papel foram revogados depois.
- **App sobre a base RESTAURADA:** `DATABASE_URL=<dbrest> node --test --import tsx tests/auth-login-anonymous-db.test.ts tests/work-order-invoicing-atomic-db.test.ts` → **23/23 pass, 0 fail, 0 skip**, ec 0. Inclui o login real ponta a ponta e o faturamento atômico com complementar.
- **Fora deste PR:** PITR/backup nativo do provedor e `pg_dump` agendado para S3 são estado de plataforma (AWS não provisionada), pré-existente e fora do escopo do bloco. Não é achado do B-SAN3-02. O restore aqui prova a **forma do schema migrado com dado**.
- **Veredito item 2: VERDE.**

## Item 3 — Rollback: ponta A (sem complementar) e ponta B (complementar ativo → 23505 antes de remover objetos); `_prisma_migrations` limpo
**Roteiro:** `C:/Users/AMP/w-dba302/tmp-dba/c3.sh`, 2º lote do `teste-linux.sh` (~00:2xZ). O 1º lote saiu inválido para este item por defeito do MEU arnês: `CREATE DATABASE dbA` sem aspas cria `dba`, o `psql -d dbA` não achou a base, e o `migrate deploy` criou uma `dbA` vazia. Nada daquele lote foi aproveitado aqui; tudo foi refeito com nomes em minúsculas. O down usado é o **texto do comentário da própria migração** (extraído por `sed`, 6 sentenças), o mesmo do §5 do plano. Quedas do WSL às 23:51Z e ~00:10Z não atingiram contêiner meu: o 1º lote já tinha subido depois do 1º reinício, e este depois do 2º.

- **Ponta A** (`dbpa` = clone do legado no head, **sem** complementar):
  - `psql -v ON_ERROR_STOP=1 -1 -f down.sql` → 6 sentenças OK, ec 0. Depois, `DELETE FROM _prisma_migrations WHERE migration_name='20260878000000_invoice_complementary_title'`, ec 0.
  - Catálogo: índice antigo de volta com a definição original da 20260811; os 2 índices novos, a FK, o CHECK e a coluna saíram; RLS t/t; `_prisma_migrations` 112, 0 falhas.
  - **diff do snapshot completo (main + legado ANTES do up) × (depois do down): ec 0, 0 linhas.** Volta bit a bit ao estado da main, inclusive o md5 dos dados.
  - `migrate status` ec 1, "20260878 not yet applied". **re-up** (`migrate deploy`) ec 0; status "up to date" ec 0; `_prisma_migrations` 113, 1 linha da 20260878 finalizada, 0 falhas.
  - **diff do snapshot (up) × (re-up): ec 0, 0 linhas.**
  - → ponta A **VERDE**: up → down → re-up idempotente e `_prisma_migrations` limpo.
- **Ponta B** (`dbpb`, **com** complementar ativo na OS-1):
  - `psql -v ON_ERROR_STOP=1 -f down.sql` (sem `-1`) → **ec 3**, `ERROR: 23505: could not create unique index "financial_titles_wo_direction_active_key" … Key (tenant_id, work_order_id, direction)=(…, …, receivable) is duplicated`, **na sentença 1, antes de remover qualquer objeto**.
  - Catálogo intacto: coluna, FK, CHECK e os 2 índices novos; o antigo ausente, porque o CREATE falho não deixa resíduo.
  - **diff do snapshot pré × pós: ec 0, 0 linhas.** `_prisma_migrations` intacto (linha 20260878 aplicada); status "up to date".
  - Com `-1` (transação única) + ON_ERROR_STOP (`dbpb3`): ec 3 e diff 0 também.
  - → ponta B **VERDE como descrita no plano**.
- **ACHADO R2 — o down só para na ponta B se for rodado com `ON_ERROR_STOP`** (`dbpb2`, mesmo down, `psql` no padrão sem `ON_ERROR_STOP`):
  - **ec 0**. O 23505 sai só como mensagem e o psql **segue**: derruba o índice de originais, o CHECK, a FK, o índice auxiliar e **a coluna `parent_title_id`**.
  - Estado final: **nenhum** índice único de backstop em `financial_titles` (`B2-BACKSTOP = 0`); a OS-1 fica com **2 títulos receivable ativos** sem marca de qual é complementar (o vínculo do complementar se perde, o dado de linha fica: 7 títulos).
  - E a `_prisma_migrations` continua dizendo 20260878 aplicada (`migrate status` "up to date", ec 0): **drift silencioso**.
  - É exatamente o desfecho que o comentário diz que "NUNCA" é automático. O comentário e o plano dizem "o down PARA aqui", mas **não dizem como invocá-lo** para que pare. Quem copiar o comentário para um `psql -f` comum (ou para um cliente gráfico que segue no erro) perde o vínculo e o backstop sem nenhum erro de saída.
  - **escopo:** `dentro-do-bloco` (o texto do down nasce nesta migração, 20260878). **gravidade:** ressalva de operação; **não bloqueia**: o down é manual (§11, forward-only P-007, `docs/deployment.md` Runbook A item 3), nenhum caminho automático o executa, e a pendência `P-SAN3-02-DOWN-COM-COMPLEMENTAR` já existe para o runbook.
  - **O que fecha:** o comentário do down (ou o runbook da pendência) passa a nomear a invocação `psql -v ON_ERROR_STOP=1 --single-transaction -f …`, e o teste de encerramento da pendência inclui este caso negativo (sem ON_ERROR_STOP → perda), medido aqui.
  - Insumo para a C2/C3 decidirem se o conserto do comentário entra neste PR ou na pendência.
- **Limpeza de `_prisma_migrations`:** medido só o `DELETE` da linha (ponta A). O `migrate resolve --rolled-back` não foi exercido. O Runbook A proíbe usá-lo às cegas em produção, e o runbook da pendência deve escolher e nomear um dos dois.
- **Veredito item 3: VERDE com ressalva R2** (as duas pontas se comportam como o plano descreve **quando o down é invocado com `ON_ERROR_STOP`**; a invocação não está escrita).

## Item 4 — Catálogo (FK 4 colunas, CHECK, índice parcial) × plano; sem GRANT/REVOKE/SECURITY DEFINER; RLS intacto
- **`pg_constraint`** (iguais nas três bases: vazia→head, legado→head e restaurada):
  - `financial_titles_parent_title_fkey`: f, convalidated t, `confdeltype=r`, `confupdtype=c`, `confmatchtype=s`. Definição: `FOREIGN KEY (tenant_id, work_order_id, direction, parent_title_id) REFERENCES financial_titles(tenant_id, work_order_id, direction, id) ON UPDATE CASCADE ON DELETE RESTRICT`. **Igual ao §5/Q4.**
  - `financial_titles_parent_requires_work_order_check`: c, validado, `CHECK (((parent_title_id IS NULL) OR ((work_order_id IS NOT NULL) AND (parent_title_id <> id))))`. **Igual ao §5/Q4.**
- **`pg_indexes`:**
  - `financial_titles_tenant_wo_direction_id_key` = UNIQUE btree `(tenant_id, work_order_id, direction, id)`;
  - `financial_titles_wo_direction_original_active_key` = UNIQUE btree `(tenant_id, work_order_id, direction) WHERE deleted_at IS NULL AND work_order_id IS NOT NULL AND parent_title_id IS NULL`;
  - `financial_titles_wo_direction_active_key` **ausente**. **Igual ao §5.**
  - Coluna `parent_title_id uuid`, anulável, sem default.
- **Comportamento** (base `dbneg`; SQLSTATE e constraint nominais):
  - pai de outra OS / de outra direção / de outra org → 23503 `…parent_title_fkey` (×3);
  - complementar sem OS → 23514 `…parent_requires_work_order_check`; pai = si mesmo → 23514 (idem);
  - 2º original ativo → 23505 `…original_active_key`;
  - 2º complementar do mesmo pai → `INSERT 0 1`, como desenhado;
  - DELETE físico do pai → 23503. Se o pai tem itens, quem barra é a FK dos itens; num pai **sem** itens, é a `…parent_title_fkey` (o RESTRICT da FK nova provado isolado).
- **Privilégio e RLS:** a migração não tem GRANT/REVOKE/SECURITY DEFINER (grep do texto ativo, item 1). No diff do snapshot pré × pós do item 1, as linhas de `relrowsecurity`/`relforcerowsecurity`/`relacl`, policies e funções (`prosecdef`) **não mudaram** em nenhuma tabela. `financial_titles` e `work_order_financial_items` seguem t/t, e a policy `financial_titles_tenant_isolation` está inalterada. A FK não passa pela RLS, mas tem `tenant_id` na chave: o 23503 "pai de outra org" prova isso.
- **`schema.prisma`** (FinancialTitle, diff `bf83cda8..be344c85`): `parent_title_id String? @db.Uuid` scalar-only e `@@unique([tenant_id, work_order_id, direction, id], map: "financial_titles_tenant_wo_direction_id_key")`, mais o comentário que nomeia o índice parcial novo. Bate com o §5; nenhum outro modelo foi tocado. O delta de drift (B4/v2.2) fica fora destes 4 itens: foi medido 2× pelo dev e não o reexecutei.
- **Veredito item 4: VERDE.**

## Veredito
**FAVORÁVEL COM RESSALVA.**

- Itens 1, 2 e 4 **VERDES** por execução:
  - migração aditiva, sem rewrite (filenode igual), sem mudança de dado legado (md5 igual), aplica limpo na base vazia (113) e sobre a main com legado (112→113); ≈1 s de AccessExclusiveLock a 200k títulos;
  - **restore comprovado**: pg_dump → base nova → snapshot de 1677 linhas idêntico (contagens de 118 tabelas, 537 constraints, 618 índices, RLS/policies/funções, `_prisma_migrations`, hashes de dado); isolamento por organização igual; login real + faturamento **23/23** sobre a base restaurada;
  - catálogo idêntico ao §5/Q4: FK de 4 colunas RESTRICT/CASCADE/SIMPLE validada, CHECK validado, índice parcial de originais, antigo ausente; 23503/23514/23505 nominais; sem GRANT/REVOKE/SECURITY DEFINER; RLS t/t e policies/ACL inalteradas.
- Item 3 **VERDE com ressalva**: ponta A volta bit a bit à main e o re-up é idempotente; ponta B para em 23505 sem tocar em nada.
- **Ressalvas (nenhuma bloqueia):**
  - **R2** (`dentro-do-bloco`, operação). Sem `ON_ERROR_STOP` o down **não para**: derruba coluna e backstops com ec 0 e deixa a `_prisma_migrations` dizendo "aplicada". O comentário do down e/ou o runbook da `P-SAN3-02-DOWN-COM-COMPLEMENTAR` devem nomear `psql -v ON_ERROR_STOP=1 --single-transaction`.
  - **R1** (operação). Janela de lock proporcional ao volume; reavaliar `NOT VALID`/`VALIDATE` se a tabela crescer a milhões de linhas.
  - **Pré-existente / fora do escopo:** PITR e pg_dump agendado para S3 são estado de plataforma (AWS não provisionada), não deste PR.
- **RPO/RTO medidos (só banco, nesta escala):** pg_dump 0,44 s; restore 14,3 s em base nova; o RPO depende do agendamento, que inexiste na plataforma (fora do PR).

**Limpeza:** cópia `C:/Users/AMP/w-dba302` removida por `git worktree remove --force`; contêineres/redes `tl*` dos dois lotes removidos pelo trap do `teste-linux.sh` (conferido por `docker ps -a`/`docker network ls`). Nada commitado. **P7:** não recebi PAUSA.
