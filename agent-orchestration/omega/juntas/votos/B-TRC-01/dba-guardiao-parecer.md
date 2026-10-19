# B-TRC-01 — parecer do agente-dba-guardiao

- Instância: `dba-trc01-cdx`
- Papel: `agente-dba-guardiao`
- Modelo declarado: `GPT-5.6 Sol`
- Esforço declarado: `medium`
- PR: `#426`
- Head sob julgamento: `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`
- Worktree: `C:/Users/AMP/w-trc01`
- Estado: `APROVA COM RESSALVA`

## 1. Identidade do objeto e contrato aplicável

**Comando:** `git -C C:/Users/AMP/w-trc01 rev-parse HEAD` e `git -C C:/Users/AMP/w-trc01 branch --show-current`

**Saída resumida:** head `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`; branch `feat/traccar-b-trc-01`.

**Veredito parcial:** objeto correto confirmado. Contrato, papel e skills especializadas lidos; avaliação será feita no blob do head, sem confiar em mutações da árvore da sessão.

## 2. Aditividade e aderência ao plano

**Comando:** `git -C C:/Users/AMP/w-trc01 merge-base origin/main 5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91` e `git -C C:/Users/AMP/w-trc01 diff <merge-base> 5abdf83b... -- prisma/schema.prisma prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql prisma/migrations/20260875000000_validate_location_source_check/migration.sql`.

**Saída resumida:** merge-base `9566d55bd719ce7d7a545281c57923a25f883ed3`; em `prisma/**`, o bloco acrescenta 86 linhas ao schema e duas migrações (189 + 12 linhas). No schema, os únicos acréscimos a modelos existentes são relações reversas sem coluna em `Tenant`, `FieldOperatorLocation` e `Vehicle`, e `FieldDispatch.operator_assigned_at`; nas migrações há três tabelas novas, alargamento do CHECK de `source` por `NOT VALID`, a coluna autorizada e seu trigger. Não há `DROP TABLE`, `DROP COLUMN` nem redução de domínio no up.

**Veredito parcial:** **CONFORME** com §3.1 e §8.3 na inspeção estática. O único `DROP` do up é o CHECK existente, imediatamente substituído por superset `('mobile','web','system','traccar') NOT VALID`, exatamente autorizado.

## 3. Up limpo e rollback manual documentado

**Comando:** `git show 5abdf83b...:prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` e `git show 5abdf83b...:prisma/migrations/20260875000000_validate_location_source_check/migration.sql`.

**Saída resumida:** rollback manual documentado nas linhas 28–38 da primeira migração, explicitamente limitado a ambiente sem dado real. Ordem reversa: trigger, função, coluna nova, re-estreitamento do CHECK somente após provar zero `source='traccar'`, e as três tabelas novas. A segunda migração declara corretamente que o `VALIDATE` não exige desfazer separado.

**Veredito parcial:** documentação de rollback **CONFORME**; execução real ainda pendente.

## 4. Tenant-first, FKs, RLS, política e quarentena global

**Comando:** leitura linha a linha, via `git show 5abdf83b...:<caminho>`, do §3.1, §4.5 e §8.3 do plano, das duas migrações e do diff de `prisma/schema.prisma` contra o merge-base.

**Saída resumida:** `vehicle_tracking_bindings` usa `tenant_id` como primeira coluna das chaves/índices tenant-scoped e FK composta `(tenant_id, vehicle_id)`; `traccar_ingress_receipts` usa FKs compostas `(tenant_id,binding_id)` e `(tenant_id,location_id)`. Ambas têm `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` e política `USING`/`WITH CHECK` baseada em `app.current_tenant_id`. `traccar_quarantine_items` não tem `tenant_id`, coordenada nem payload; guarda identificador externo do dispositivo, motivo, janela temporal, chave/digest do último evento e estado de resolução; é global e sem RLS por desenho (§4.5).

**Veredito parcial:** estrutura estática tenant-first/RLS **CONFORME**. A superfície efetiva do papel runtime e o risco de leitura transversal da quarentena seguem `EM APURAÇÃO` até consulta sob role não-superusuária.

## 5. Prova em PostgreSQL 16 descartável e catálogo

**Tentativa 1 — comando:** `docker run -d --name dba-trc01-pg16 ... -p 127.0.0.1:58491:5432 postgres:16-alpine`.

**Saída resumida:** Docker recusou o bind de `127.0.0.1:58491` com erro de socket proibido pelas permissões do Windows; o Postgres não iniciou e nenhuma migração foi executada.

**Veredito parcial:** falha de ambiente/porta reservada, não resultado do bloco. O container próprio parado será removido e a prova repetida em porta alta não excluída; nenhum container alheio será tocado.

**Tentativa 2 — comando:** após confirmar as faixas excluídas com `netsh interface ipv4 show excludedportrange protocol=tcp`, `docker run -d --name dba-trc01-pg16 ... -p 127.0.0.1:49291:5432 postgres:16-alpine`; readiness por `docker exec dba-trc01-pg16 pg_isready`; versão por `SHOW server_version`.

**Saída resumida:** container próprio `dba-trc01-pg16` iniciado, bind exclusivo `127.0.0.1:49291`; PostgreSQL `16.15` pronto.

**Veredito parcial:** ambiente descartável próprio e versão exigida confirmados. `migrate deploy`, catálogo, role runtime e rollback ainda pendentes.

**Comando:** `DATABASE_URL=postgresql://postgres:***@127.0.0.1:49291/erp_techsolutions?schema=public npx prisma migrate deploy`; confirmação independente via `psql` em `"_prisma_migrations"`.

**Saída resumida:** o processo concluiu após a primeira janela de captura; catálogo mostra `110` migrações aplicadas, latest `20260875000000_validate_location_source_check`; as duas migrações do bloco têm `finished=true`, `rolled_back=false`, `logs IS NULL`.

**Veredito parcial:** **UP LIMPO** em PostgreSQL 16.15. A migração separada de `VALIDATE` foi realmente aplicada; catálogo detalhado ainda pendente.

## 6. Achados, escopo e gravidade

Nenhum defeito bloqueante confirmado.

### [RESSALVA DE SEGURANÇA · dentro-do-bloco] Quarentena global é transversal ao papel runtime

- **Local:** `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql`, tabela `traccar_quarantine_items`.
- **Gravidade:** residual baixa no head atual; seria alta se surgir uma rota/query tenant-facing que devolva esses campos sem mediação.
- **Escopo:** `dentro-do-bloco`, pois a tabela nasce nesta migration; a forma global e os privilégios são explicitamente autorizados pelos §§3.1/4.5 e pelo mecanismo preexistente de DEFAULT PRIVILEGES.
- **Evidência executada:** role `NOSUPERUSER NOBYPASSRLS`, `tabelas_com_dml=118`; com GUC de tenant B, a role leu uma linha sintética `device-org-a`. A transação foi revertida.
- **Impacto observado:** não existe isolamento por organização nessa tabela; o papel runtime compartilhado enxerga todos os episódios. O dado foi minimizado (sem coordenada/payload/tenant_id), e não foi encontrada superfície HTTP de leitura no escopo julgado, portanto não há vazamento entre clientes demonstrado neste head.
- **Confiança:** alta.

### [RESSALVA OPERACIONAL · dentro-do-bloco] Rollback SQL não reconcilia o ledger Prisma

- **Local:** comentário de rollback da primeira migration.
- **Gravidade:** baixa, dadas as pré-condições expressas de banco descartável/sem dado real.
- **Evidência executada:** após o rollback restaurar o schema anterior, `_prisma_migrations` manteve ambas as migrations como concluídas; `migrate deploy` não as reaplicaria no mesmo banco sem reconciliação explícita.
- **Impacto observado:** o rollback é suficiente para voltar o schema, mas não para reutilizar o mesmo banco num novo forward deploy. Isso não afetou a prova, pois o cluster era descartável e foi removido.
- **Confiança:** alta.

## Sucessor 12:38 UTC (Codex 2)

- Instância sucessora: `dba-trc01-cdx2`
- Modelo declarado: `GPT-5.6 Sol`
- Esforço declarado: `medium`
- Regra P3: nenhuma conclusão anterior será herdada sem reexecução do comando registrado.

### S0. Reexecução literal das tentativas de porta do antecessor

**Comando:** `netsh interface ipv4 show excludedportrange protocol=tcp`; `docker run ... --name dba-trc01-cdx2-replay58491 -p 127.0.0.1:58491:5432 postgres:16-alpine`; remoção pelo nome exato após o resultado; inspeção exata de `dba-trc01-pg16`.

**Saída resumida:** a faixa atual excluída não contém `58491`; diferentemente da execução anterior, o bind em `127.0.0.1:58491` concluiu (`ec=0`), evidenciando que a falha anterior era transitória do ambiente. O container de replay foi removido. O container do antecessor reapareceu após o Docker Desktop iniciar como `Exited (255)` em `127.0.0.1:49291`; como pertencia a esta mesma cadeira e já havia sido substituído pela prova própria, foi removido pelo nome exato.

**Comparação com o antecessor:** tentativa 1 divergiu por mudança ambiental (agora verde); tentativa 2 foi reproduzida funcionalmente no container exclusivo do sucessor em `49292`, com o mesmo PostgreSQL `16.15` e os mesmos resultados de migration. Nenhuma conclusão do PR depende da falha transitória antiga.

**Veredito parcial:** todos os comandos de infraestrutura registrados pelo antecessor foram reexecutados ou reproduzidos com isolamento equivalente; nenhuma base viva ou porta proibida foi usada.

### S1. Reexecução — identidade do objeto e dimensão do diff

**Comando:** `git -C C:/Users/AMP/w-trc01 rev-parse HEAD`; `git -C C:/Users/AMP/w-trc01 branch --show-current`; `git -C C:/Users/AMP/w-trc01 merge-base origin/main 5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`; `git diff --stat/--numstat <merge-base> <head> -- <3 caminhos Prisma>`.

**Saída resumida:** head `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`; branch `feat/traccar-b-trc-01`; merge-base `9566d55bd719ce7d7a545281c57923a25f883ed3`; `287` inserções e `0` remoções nos três arquivos (`189 + 12 + 86`). A árvore já continha mutações/untracked de outras cadeiras e o parecer atual; não foram tocadas.

**Comparação com o antecessor:** resultados idênticos aos registrados nos itens 1 e 2.

**Veredito parcial:** objeto correto e dimensão do diff reconfirmados por execução própria; `EM APURAÇÃO` até reexecutar a inspeção de conteúdo e as provas no PostgreSQL.

### S2. Reexecução — conteúdo, plano e rollback documentado

**Comando:** `git show <head>:package.json`; `git show <head>:tsconfig.json`; `git show <head>:agent-orchestration/codex/comandos/B-TRC-01-traccar-posicao-no-mapa.md`; extração de `PLANO_TRACCAR.md` §§3.1, 4.5, 8.3 e 8.10; `git show <head>:<cada migration>`; `git diff <merge-base> <head> -- prisma/schema.prisma`; `git grep -n -E 'DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|ALTER COLUMN' <head> -- <duas migrations>`.

**Saída resumida:** reexecução confirmou os três modelos do §3.1, somente relações reversas nos modelos existentes e somente `operator_assigned_at` em `FieldDispatch`. O up contém as três tabelas novas, FKs compostas tenant-first, dois pares `ENABLE`/`FORCE` + políticas, o CHECK de `source` substituído por superset `NOT VALID`, a coluna e o gatilho autorizados; a segunda migration contém somente `VALIDATE CONSTRAINT`. A busca por operações destrutivas encontrou `DROP TABLE`/`DROP COLUMN` apenas nos comentários do rollback. O `DROP CONSTRAINT` executável é seguido no mesmo up pelo CHECK superset autorizado.

**Comparação com o antecessor:** conteúdo e conclusão estática idênticos aos itens 2–4. O rollback documentado remove, em ordem reversa, somente gatilho/função/coluna e as três tabelas novas; o re-estreitamento do CHECK exige contagem zero de `source='traccar'` e está limitado a ambiente sem dado real.

**Veredito parcial:** **CONFORME** na inspeção estática de aditividade, schema e documentação de rollback. Falta executar novamente o up, conferir catálogo e executar o rollback.

### S3. Reexecução — PostgreSQL 16 descartável e `migrate deploy`

**Comando:** `docker info --format '{{.ServerVersion}}'`; criação exclusiva de `dba-trc01-cdx2-pg16` com `postgres:16-alpine`, bind `127.0.0.1:49292:5432`; readiness por `pg_isready`; `SHOW server_version`; `DATABASE_URL=postgresql://postgres:***@127.0.0.1:49292/erp_techsolutions?schema=public npx prisma migrate deploy`; consulta independente por `psql` em `"_prisma_migrations"`.

**Saída resumida:** o Docker Engine precisou ser iniciado e respondeu `29.6.1`; container próprio pronto em PostgreSQL `16.15`. O deploy concluiu e o catálogo contém `110` migrations aplicadas, latest `20260875000000_validate_location_source_check`; as migrations `20260874000000...` e `20260875000000...` têm `finished=true`, `rolled_back=false`, `logs IS NULL`.

**Comparação com o antecessor:** mesma versão de PostgreSQL, mesma contagem `110`, mesma latest e mesmos estados das duas migrations; a única diferença é o container/porta exclusivos do sucessor (`dba-trc01-cdx2-pg16`, `49292`).

**Veredito parcial:** **UP LIMPO e VALIDATE EXECUTADO** reconfirmados por execução própria em banco vazio descartável.

### S4. Catálogo e superfície do papel runtime

**Comando:** consultas a `pg_class`, `pg_policies`, `pg_indexes`, `pg_constraint` e `pg_proc`; execução de `scripts/db-runtime-role.sh` para o papel exclusivo `dba_trc01_runtime`; consulta de atributos e `tabelas_com_dml`; transação de prova com uma linha sintética de quarentena, `SET LOCAL ROLE dba_trc01_runtime`, `SET LOCAL app.current_tenant_id='<tenant-B>'`, leitura e `ROLLBACK`.

**Saída resumida:** `vehicle_tracking_bindings` e `traccar_ingress_receipts` têm `relrowsecurity=true` e `relforcerowsecurity=true`, com exatamente uma política `ALL` cada e `USING/WITH CHECK` por `app.current_tenant_id`; `traccar_quarantine_items` tem ambos `false` e nenhuma política. Os três índices parciais de binding e quarentena existem com os predicados previstos; o índice global de recibo existe. O CHECK de `source` está `convalidated=true`; a função do gatilho tem `prosecdef=false`. O script criou/convergiu o papel, mas no Git Bash encerrou antes de definir a senha porque `setsid` não existe nesse ambiente; isso não invalida a prova de catálogo: `dba_trc01_runtime|rolsuper=f|rolbypassrls=f|rolreplication=f|rolcreaterole=f|rolcreatedb=f`, `tabelas_com_dml=118`, e o papel tem DML na quarentena.

**Prova de leitura transversal:** sob `current_user=dba_trc01_runtime` e GUC de um tenant B, o `SELECT` retornou a linha sintética `device-org-a` da tabela global; a transação foi revertida. Portanto **sim**, no nível SQL o papel runtime compartilhado pode ler dados de quarentena independentemente da organização ativa. A tabela não guarda coordenada nem payload, mas expõe identificador externo do dispositivo, motivo, janela temporal, chave e digest. Isso é consequência direta do desenho global aprovado em §§3.1/4.5 e dos DEFAULT PRIVILEGES (`118` tabelas com DML), não uma proteção por tenant. No head julgado não há rota pública/tenant de leitura dessa tabela; assim, não há vazamento HTTP demonstrado, mas RLS não contém um eventual caminho de leitura indevido.

**Veredito parcial:** estrutura de catálogo **CONFORME**. A superfície transversal da quarentena é uma **RESSALVA de segurança dentro do desenho autorizado**, não uma divergência oculta: o isolamento depende da ausência de caminho de leitura para usuário de organização e da allowlist da aplicação.

### S5. Rollback manual realmente executado

**Comando:** no mesmo PostgreSQL descartável, `SELECT count(*) ... WHERE source='traccar'`; em transação, execução literal e na ordem documentada dos oito comandos de rollback (trigger, função, coluna, CHECK, três tabelas); pós-condições por `to_regclass`, `information_schema.columns`, `pg_trigger`, `pg_proc`, `pg_constraint`, contagem de tabelas e contagem de DML do papel runtime.

**Saída resumida:** pré-condição `source='traccar' = 0`; todos os oito passos concluíram e `COMMIT` foi bem-sucedido. As três tabelas retornaram `NULL` em `to_regclass`; coluna, trigger e função retornaram contagem `0`; o CHECK voltou validado a `mobile|web|system`. A superfície caiu de `118` para `115` tabelas com DML, exatamente as três tabelas novas removidas. Nenhuma tabela preexistente foi removida.

**Observação operacional:** por ser rollback SQL manual de migrations forward-only já registradas como concluídas, as duas linhas de `_prisma_migrations` continuam `finished=true/rolled_back=false`; o cluster é descartável e será destruído. O runbook restaura o schema anterior, mas não torna o mesmo banco reaplicável por `migrate deploy` sem reconciliação explícita do ledger — limitação não cobrada pelo §3.1 e coerente com o aviso “só antes de dado real”.

**Veredito parcial:** **ROLLBACK EXECUTADO E CONFORME**: removeu somente os três objetos de negócio novos e as alterações autorizadas em tabelas existentes, após provar ausência de dado Traccar.

### S6. Reprova final de FK/schema e limpeza

**Comando:** criação de segundo banco vazio no mesmo container próprio; novo `npx prisma migrate deploy`; consulta executada das FKs em `pg_constraint`; consulta consolidada de RLS/policies; `npx prisma validate`; remoção por nome exato de `dba-trc01-cdx2-pg16` e verificação de ausência.

**Saída resumida:** segundo up aplicou `110/110` migrations. Catálogo provou FKs compostas `(tenant_id,vehicle_id)`, `(tenant_id,binding_id)` e `(tenant_id,location_id)`, além das FKs tenant; duas tabelas tenant-scoped permaneceram `ENABLE+FORCE` com uma policy cada, quarentena `false/false/0 policy`. `prisma validate` respondeu `The schema ... is valid`. O container exclusivo foi removido; nenhum container alheio foi parado, removido ou inspecionado por nome.

**Veredito parcial:** schema e relações **CONFORMES** com §§3.1, 4.5 e 8.3; limpeza concluída.

## 7. Veredito

## APROVA COM RESSALVA

As migrations são aditivas dentro do autorizado, o schema adere ao plano, o up/`VALIDATE` passou duas vezes em PostgreSQL 16.15, RLS/policies/FKs/índices foram comprovados por catálogo e o rollback manual foi executado com sucesso antes de qualquer dado real. A aprovação fica com duas ressalvas explícitas: a quarentena global é legível transversalmente pelo papel runtime compartilhado (`118` tabelas com DML), embora não haja rota tenant-facing demonstrada e o conteúdo seja minimizado; e o SQL manual restaura o schema mas não reconcilia o ledger Prisma do mesmo banco.
