#!/usr/bin/env bash
# B-SAN3-05 (v3) — cria/converge o PAPEL DE RUNTIME da API: LOGIN, NOSUPERUSER, NOBYPASSRLS, NOREPLICATION, sem posse de
# tabela FORCE RLS, sem pertenca (direta ou por cadeia) a papel que escape de RLS, sem SELECT em view de dono que escapa;
# so DML + USAGE em sequencias. Idempotente. FALHA (psql ec=3, ROLLBACK de tudo) nomeando o MODO se nao puder corrigir.
#
# A SENHA NOVA NUNCA aparece em argv, no terminal nem no log do servidor (critica r2, F2-02):
#   - entra no psql por `\set` com backtick (`printf` builtin do sh — nao ha exec, nao ha argv);
#   - vai ao servidor UMA vez, num `set_config` (statement que so e logado sob log_statement=all / log_min_duration_statement=0,
#     que este script RECUSA antes de enviar a senha, salvo DB_RUNTIME_ALLOW_LOG_ALL=1 — decisao consciente do dono);
#   - os EXECUTE que a carregam ficam em bloco proprio BEGIN/EXCEPTION: o CONTEXT do erro re-emitido nao traz o SQL dinamico;
#   - e definida POR ULTIMO, depois de tudo o que podia falhar;
#   - exposicao residual DECLARADA: /proc/<pid>/environ do psql (mesma classe de PGPASSWORD; legivel so pelo mesmo usuario/root).
# Entradas (ambiente): DB_RUNTIME_ROLE (default erp_runtime) · DB_RUNTIME_PASSWORD (obrigatoria; sem quebra de linha)
#   · DB_MIGRATOR_ROLE (default: o usuario desta conexao) · DB_RUNTIME_ALLOW_LOG_ALL (default 0)
# Conexao: no initdb.d do postgres:16 usa POSTGRES_USER/POSTGRES_DB (socket local); fora dele, PGHOST/PGPORT/PGUSER/
#   PGPASSWORD/PGDATABASE (PGDATABASE obrigatoria: GRANTs e DEFAULT PRIVILEGES sao POR BANCO — o banco da app).
# Modos de falha (todos nomeados na mensagem, nenhum com a senha): MODO 1 sem CREATEROLE · MODO 2 atributo que o executor nao
#   pode tirar · MODO 3 tabela/sequencia alheia ou POSSE de tabela FORCE · MODO 4 papel ja existe e o executor nao tem ADMIN
#   OPTION · MODO 5 pertenca que o executor nao pode revogar · MODO 6 view de dono que escapa com SELECT para o papel.
# Todo o corpo roda numa FUNCAO em SUBSHELL (source pelo entrypoint nao vaza set -u/exit); versionar com modo 100755 e
#   `.gitattributes` eol=lf (CRLF quebra o bash do conteiner — critica r2, N2-03).
db_runtime_role_main() (
  set -euo pipefail
  : "${DB_RUNTIME_PASSWORD:?DB_RUNTIME_PASSWORD obrigatória}"
  local role="${DB_RUNTIME_ROLE:-erp_runtime}" migrator="${DB_MIGRATOR_ROLE:-}" allow_log_all="${DB_RUNTIME_ALLOW_LOG_ALL:-0}"
  local -a conn=()
  if [ -n "${POSTGRES_DB:-}" ]; then conn=(--username "${POSTGRES_USER:-postgres}" --dbname "$POSTGRES_DB")
  else : "${PGDATABASE:?PGDATABASE obrigatória (o banco da aplicação)}"; fi
  export DB_RUNTIME_PASSWORD
  psql -X -v ON_ERROR_STOP=1 -At "${conn[@]}" -v role="$role" -v migrator="$migrator" -v allow_log_all="$allow_log_all" <<'SQL'
SELECT set_config('san3.role', :'role', false), set_config('san3.allow_log_all', :'allow_log_all', false),
       set_config('san3.migrator', coalesce(nullif(:'migrator', ''), current_user::text), false) \gset _
-- (0) ANTES de a senha ir ao servidor: ele registraria o texto de todo statement?
DO $$ BEGIN
  IF current_setting('san3.allow_log_all') IS DISTINCT FROM '1'
     AND (current_setting('log_statement') = 'all' OR current_setting('log_min_duration_statement') = '0') THEN
    RAISE EXCEPTION 'MODO 0 — o servidor registra o texto de todo statement (log_statement=%, log_min_duration_statement=%): a senha nova iria ao log. Desligue isso (superusuario: ALTER SYSTEM SET ... / ALTER DATABASE ... SET ...) ou aceite conscientemente com DB_RUNTIME_ALLOW_LOG_ALL=1', current_setting('log_statement'), current_setting('log_min_duration_statement');
  END IF; END $$;
-- (1) a senha entra pelo psql, nao pelo argv
\set password `printf '%s' "$DB_RUNTIME_PASSWORD"`
SELECT set_config('san3.password', :'password', false) \gset _
\unset password
DO $$
DECLARE
  v_role text := current_setting('san3.role'); v_password text := current_setting('san3.password'); v_migrator text := current_setting('san3.migrator');
  me pg_roles%ROWTYPE; alvo pg_roles%ROWTYPE; r record; n int; vias text;
BEGIN
  SELECT * INTO me FROM pg_roles WHERE rolname = current_user;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
    BEGIN EXECUTE format('CREATE ROLE %I LOGIN NOINHERIT', v_role);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'MODO 1 — nao foi possivel criar o papel % (% %): o executor % precisa de CREATEROLE — decisao de provedor', v_role, SQLSTATE, SQLERRM, current_user; END;
  ELSIF NOT (me.rolsuper OR pg_has_role(current_user, v_role, 'MEMBER WITH ADMIN OPTION')) THEN
    RAISE EXCEPTION 'MODO 4 — o papel % ja existe e % nao tem ADMIN OPTION sobre ele (foi criado por outro executor): use outro nome (DB_RUNTIME_ROLE) ou, com a credencial que o criou, GRANT % TO % WITH ADMIN OPTION e rode de novo', v_role, current_user, v_role, current_user;
  END IF;
  SELECT * INTO alvo FROM pg_roles WHERE rolname = v_role;
  -- atributos que escapam ou excedem: corrige se este executor puder; senao FALHA nomeando (MODO 2)
  IF alvo.rolsuper       THEN IF me.rolsuper       THEN EXECUTE format('ALTER ROLE %I NOSUPERUSER', v_role);   ELSE RAISE EXCEPTION 'MODO 2 — papel % tem SUPERUSER e % nao pode remover (precisa de SUPERUSER): corrija com outro executor ou use outro nome', v_role, current_user; END IF; END IF;
  IF alvo.rolbypassrls   THEN IF me.rolbypassrls   THEN EXECUTE format('ALTER ROLE %I NOBYPASSRLS', v_role);   ELSE RAISE EXCEPTION 'MODO 2 — papel % tem BYPASSRLS e % nao pode remover (precisa de BYPASSRLS)', v_role, current_user; END IF; END IF;
  IF alvo.rolreplication THEN IF me.rolsuper       THEN EXECUTE format('ALTER ROLE %I NOREPLICATION', v_role); ELSE RAISE EXCEPTION 'MODO 2 — papel % tem REPLICATION e % nao pode remover (precisa de SUPERUSER)', v_role, current_user; END IF; END IF;
  IF alvo.rolcreatedb    THEN IF me.rolcreatedb    THEN EXECUTE format('ALTER ROLE %I NOCREATEDB', v_role);    ELSE RAISE EXCEPTION 'MODO 2 — papel % tem CREATEDB e % nao pode remover', v_role, current_user; END IF; END IF;
  IF alvo.rolcreaterole  THEN IF me.rolcreaterole  THEN EXECUTE format('ALTER ROLE %I NOCREATEROLE', v_role);  ELSE RAISE EXCEPTION 'MODO 2 — papel % tem CREATEROLE e % nao pode remover', v_role, current_user; END IF; END IF;
  EXECUTE format('ALTER ROLE %I WITH LOGIN NOINHERIT', v_role);
  -- pertenca: revoga o PRIMEIRO SALTO de toda cadeia que leve a papel que escapa (atributo, papel de servidor, dono de tabela FORCE)
  FOR r IN SELECT m.roleid::regrole::text AS direto FROM pg_auth_members m WHERE m.member = alvo.oid
             AND (EXISTS (SELECT 1 FROM pg_roles b WHERE (b.rolsuper OR b.rolbypassrls OR b.rolreplication OR b.rolname IN ('pg_execute_server_program','pg_read_server_files','pg_write_server_files')) AND pg_has_role(m.roleid, b.oid, 'MEMBER'))
                  OR EXISTS (SELECT 1 FROM pg_class c WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity AND pg_has_role(m.roleid, c.relowner, 'MEMBER')))
  LOOP
    BEGIN EXECUTE format('REVOKE %s FROM %I', r.direto, v_role);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'MODO 5 — a pertenca de % a % (que leva a papel que escapa de RLS) nao pode ser revogada por % (% %): com credencial que tenha ADMIN OPTION sobre %, REVOKE % FROM % e rode de novo', v_role, r.direto, current_user, SQLSTATE, SQLERRM, r.direto, r.direto, v_role; END;
  END LOOP;
  -- privilegios: so DML + USAGE/SELECT em sequencias (existentes) e DEFAULT PRIVILEGES do migrador (futuras)
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), v_role);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_role);
  FOR r IN SELECT c.relname, c.relkind, pg_get_userbyid(c.relowner) AS dono, pg_has_role(current_user, c.relowner, 'USAGE') AS posso
           FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
           WHERE ns.nspname = 'public' AND c.relkind IN ('r','p','S') ORDER BY c.relname
  LOOP
    IF NOT r.posso THEN RAISE EXCEPTION 'MODO 3 — tabela/sequencia public.% pertence a % e % nao pode conceder DML nela: ALTER ... OWNER TO % e rode de novo', r.relname, r.dono, current_user, v_migrator; END IF;
    IF r.relkind = 'S' THEN EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO %I', r.relname, v_role);
    ELSE EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO %I', r.relname, v_role); END IF;
  END LOOP;
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', v_migrator, v_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', v_migrator, v_role);
  -- AUTO-VERIFICACAO = a propriedade da trava de boot (v3), avaliada para o papel, com a VIA de cada linha
  SELECT string_agg(via || ':' || nome, ', ' ORDER BY via, nome), count(*) INTO vias, n FROM (
    SELECT 'atributo' AS via, b.rolname::text AS nome FROM pg_roles b
     WHERE (b.rolsuper OR b.rolbypassrls OR b.rolreplication OR b.rolname IN ('pg_execute_server_program','pg_read_server_files','pg_write_server_files')) AND pg_has_role(alvo.oid, b.oid, 'MEMBER')
    UNION ALL
    SELECT DISTINCT 'posse', o.rolname::text FROM pg_class c JOIN pg_roles o ON o.oid = c.relowner
     WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity AND pg_has_role(alvo.oid, c.relowner, 'MEMBER')
    UNION ALL
    SELECT DISTINCT 'view', v.relname::text FROM pg_class v JOIN pg_roles o ON o.oid = v.relowner
      JOIN pg_rewrite rw ON rw.ev_class = v.oid
      JOIN pg_depend d ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid AND d.refclassid = 'pg_class'::regclass
      JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r','p') AND t.relforcerowsecurity
     WHERE v.relkind IN ('v','m') AND (o.rolsuper OR o.rolbypassrls) AND has_table_privilege(alvo.oid, v.oid, 'SELECT')
  ) q;
  IF n > 0 THEN
    RAISE EXCEPTION 'papel % ainda escapa de RLS por % via(s): %. posse → ALTER TABLE ... OWNER TO % e rode de novo (MODO 3); view de dono que escapa → REVOKE SELECT ON <view> FROM % ou troque o dono da view (MODO 6)', v_role, n, vias, v_migrator, v_role;
  END IF;
  -- SENHA POR ULTIMO: tudo o que podia falhar ja passou; um erro aqui e re-emitido SEM o SQL dinamico
  BEGIN EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', v_role, v_password);
  EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'nao foi possivel definir a senha do papel % (% %)', v_role, SQLSTATE, SQLERRM; END;
END $$;
SELECT set_config('san3.password', '', false) \gset _
-- linha final (uma so, -At): rolname|rolsuper|rolbypassrls|rolreplication|escapa_por_pertenca|posse_force|views_de_dono_que_escapa|tabelas_com_dml
SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolreplication,
       EXISTS (SELECT 1 FROM pg_roles b WHERE (b.rolsuper OR b.rolbypassrls OR b.rolreplication OR b.rolname IN ('pg_execute_server_program','pg_read_server_files','pg_write_server_files')) AND pg_has_role(r.oid, b.oid, 'MEMBER')) AS escapa,
       (SELECT count(*) FROM pg_class c WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity AND pg_has_role(r.oid, c.relowner, 'MEMBER')) AS posse,
       (SELECT count(DISTINCT v.oid) FROM pg_class v JOIN pg_roles o ON o.oid = v.relowner JOIN pg_rewrite rw ON rw.ev_class = v.oid JOIN pg_depend d ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid AND d.refclassid = 'pg_class'::regclass JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r','p') AND t.relforcerowsecurity WHERE v.relkind IN ('v','m') AND (o.rolsuper OR o.rolbypassrls) AND has_table_privilege(r.oid, v.oid, 'SELECT')) AS views,
       (SELECT count(*) FROM pg_tables t WHERE t.schemaname = 'public' AND has_table_privilege(r.oid, format('%I.%I', t.schemaname, t.tablename), 'SELECT,INSERT,UPDATE,DELETE')) AS dml
FROM pg_roles r WHERE r.rolname = :'role';
SQL
)
db_runtime_role_main "$@"
