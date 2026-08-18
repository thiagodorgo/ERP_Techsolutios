-- B-O6R-01 (Ω6R-SEC-001 + Ω6R-TEN-001) — identidade global + vínculo explícito + trilha.
-- Plano vinculante: agent-orchestration/omega/planos/B-O6R-01-plano-v6-aprovado.md (§3).
--
-- ADITIVA / UP-ONLY (C7.5): 3 tabelas NOVAS + 1 função + triggers + políticas. Toque em tabela
-- existente = ZERO (só back-relations no schema Prisma; nenhuma coluna nova, nenhum ALTER/DROP
-- em tabela que já existia). O backfill é INSERT idempotente (NOT EXISTS) — nunca UPDATE/DELETE.
--
-- ORDEM DO DESFAZER (§3.3 do plano — ato de junta, COM PERDA DECLARADA):
--   revert do código → deploy → migração reversa:
--     DROP FUNCTION IF EXISTS public.auth_login_candidates(text);
--     DROP TRIGGER IF EXISTS "auth_identity_link_events_block_mutation" ON "auth_identity_link_events";
--     DROP TRIGGER IF EXISTS "auth_identity_link_events_block_truncate" ON "auth_identity_link_events";
--     DROP FUNCTION IF EXISTS auth_identity_link_events_block_mutation();
--     DROP TABLE IF EXISTS "auth_identity_link_events";
--     DROP TABLE IF EXISTS "auth_identity_links";
--     DROP TABLE IF EXISTS "auth_identities";
--   "Desfazer seguro" ≠ "desfazer sem perda": o DROP perde os vínculos movidos E a trilha de
--   eventos — exatamente a prova que o C3 mandou criar. Perda declarada; ratificação §12.5.
--   O ESTADO PARCIAL de deploy (migrate ok + imagem antiga servindo) é seguro por construção:
--   tabelas aditivas invisíveis ao código antigo; a função nasce sem EXECUTE para PUBLIC e sem
--   call-site na imagem antiga. Recuperação = re-rodar o deploy (idempotente). A migração
--   reversa NÃO entra nesse cenário.
--
-- RAZÃO DE CADA POLÍTICA:
--   auth_identities — SELECT só da identidade do GUC corrente (id opaco; nem a própria aplicação
--     enumera identidades); INSERT livre (a linha não carrega nada além do id); SEM política de
--     UPDATE/DELETE: sob a role da aplicação identidade não se altera nem se apaga (higiene de
--     órfãs = pendência P-O6R-B01-IDENTIDADE-ORFA, com privilégio e junta).
--   auth_identity_links — DOIS braços (forma da casa, molde 20260608000000:5-6): o braço de
--     TENANT autoriza os fluxos tenant-scoped (criação de usuário, resolução do par do token,
--     gancho de senha) e o braço de IDENTIDADE é a única autorização de leitura cross-organização
--     do sistema (listagem dos próprios vínculos). A amarração identidade↔tenant NÃO pode viver
--     na política (consultaria a própria tabela = recursão); ela vive no formato da API e nos
--     guards (§3.7 do plano — arbitragem do C6, com as 3 condições).
--   auth_identity_link_events — ÚNICA política = INSERT WITH CHECK (true); SEM política de
--     SELECT: ilegível sob QUALQUER role sem BYPASSRLS, de propósito — a trilha não pode virar
--     chave de junção entre organizações. RLS não vincula superusuário; quem vincula superusuário
--     é o TRIGGER (UPDATE/DELETE por linha + TRUNCATE por statement — o de TRUNCATE é além do
--     molde 20260847, declarado: TRUNCATE não dispara trigger de linha e exige só o privilégio
--     TRUNCATE, não superusuário). CONTORNOS CONHECIDOS do trigger — enumeração honesta
--     (R-B-O6R-01-ciclo1, M-1/M-2; a frase anterior dizia "contorno único, só superusuário" e a
--     execução desmente — caracterizado em tests/auth-identity-link-events-db.test.ts):
--       (a) session_replication_role=replica (só superusuário) — o trigger não dispara em modo
--           replica (molde: 20260847000000:24 e :75-76; 20260836000000:151-153);
--       (b) o DONO da tabela, mesmo NOSUPERUSER, desliga o trigger com ALTER TABLE … DISABLE
--           TRIGGER — e na topologia em que quem migra é quem serve, a aplicação nasce DONA e
--           pode desligar o próprio trigger. A inviolabilidade da trilha é da TOPOLOGIA
--           dono ≠ app (discriminante: pg_class.relowner das três tabelas ≠ role da aplicação,
--           medido na ativação — runbook docs/deployment.md §3.8, passo 6), não do trigger.
--
-- TRÊS DEPENDÊNCIAS DE PRIVILÉGIO, NOMEADAS — cada uma com canal de detecção MEDIDO (§0/§3.2.3):
--   (1) DONO da função auth_login_candidates: SECURITY DEFINER lê users/tenants/credenciais sob
--       FORCE RLS com o privilégio do DONO. Se o dono não tiver rolsuper/rolbypassrls, a função
--       devolve zero linhas para todo e-mail (login anônimo morre em 401, falha-fechada).
--       Detecção: a SONDA de runtime (src/modules/auth/services/login-readiness.ts) + o booleano
--       em /health/ready — nunca o output do migrate.
--   (2) EXECUTE de quem chama: REVOKE ALL FROM PUBLIC abaixo é incondicional e NENHUM GRANT vive
--       em migração (guard 8: `^\s*GRANT\b` em prisma/migrations/** = 0). Se a role que serve não
--       for a DONA, a função nasce INERTE até o GRANT humano (runbook docs/deployment.md). EXCEÇÃO
--       DO DONO, escrita (especialista 1): se a role do migrate deploy for a MESMA que serve, a
--       aplicação nasce DONA (EXECUTE implícito de dono — REVOKE FROM PUBLIC não alcança o dono) e
--       o caminho nasce ATIVO sem ato humano. Quem responde é a sonda; o runbook confere
--       /health/ready ANTES de conceder.
--   (3) ROLE do backfill: o INSERT…SELECT lê public.users sob FORCE RLS, sem GUC. Se a role da
--       migração tiver rolsuper/rolbypassrls, cobre a base; se NÃO tiver, lê ZERO, insere ZERO, e
--       o migrate deploy termina VERDE tendo criado nada. O RAISE WARNING do bloco DO abaixo vai
--       ao LOG DO SERVIDOR Postgres — o `prisma migrate deploy` DESCARTA warnings/notices [medido,
--       2 cadeiras — V-DEVOPS-1/dba 2]: NENHUMA detecção depende dele. Detecção real: (i) teste
--       que reexecuta o SQL do backfill nas DUAS configurações (privilegiada e role efêmera
--       NOSUPERUSER); (ii) discriminantes pré-seed anexados ao PR (§8); (iii) runbook §3.8(vi) no
--       ambiente ativado.

-- CreateTable — identidade global (sem PII, sem updated_at; id gerado na aplicação/no backfill).
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable — vínculo explícito identidade↔conta. `attached_via` = modo de chegada ATUAL do
-- vínculo à identidade corrente (terceira armadilha, opção A: o gancho da troca de senha decide
-- por ESTA coluna, sob o braço de tenant — nunca pela trilha, ilegível sob a role real).
CREATE TABLE "auth_identity_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identity_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "attached_via" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "auth_identity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable — trilha append-only (registro de plataforma). SEM FKs, DE PROPÓSITO: a trilha
-- sobrevive ao vínculo, ao usuário e à identidade que referencia.
CREATE TABLE "auth_identity_link_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "link_id" UUID NOT NULL,
    "from_identity_id" UUID,
    "to_identity_id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_tenant_id" UUID,
    "actor_user_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "auth_identity_link_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_identity_links_tenant_id_user_id_key" ON "auth_identity_links"("tenant_id", "user_id");
CREATE UNIQUE INDEX "auth_identity_links_identity_id_tenant_id_key" ON "auth_identity_links"("identity_id", "tenant_id");
CREATE INDEX "auth_identity_links_tenant_id_idx" ON "auth_identity_links"("tenant_id");
CREATE INDEX "auth_identity_link_events_link_id_occurred_at_idx" ON "auth_identity_link_events"("link_id", "occurred_at");
CREATE INDEX "auth_identity_link_events_tenant_id_user_id_idx" ON "auth_identity_link_events"("tenant_id", "user_id");

-- AddForeignKey (só nas duas primeiras tabelas; a trilha não tem FK de propósito).
ALTER TABLE "auth_identity_links" ADD CONSTRAINT "auth_identity_links_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "auth_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_identity_links" ADD CONSTRAINT "auth_identity_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_identity_links" ADD CONSTRAINT "auth_identity_links_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECKs (domínios pequenos e estáveis; espelham os enums validados na aplicação).
ALTER TABLE "auth_identity_links"
  ADD CONSTRAINT "auth_identity_links_attached_via_chk" CHECK ("attached_via" IN ('backfill', 'religacao', 'desvinculo'));
ALTER TABLE "auth_identity_link_events"
  ADD CONSTRAINT "auth_identity_link_events_event_chk" CHECK ("event" IN ('backfill', 'religacao', 'desvinculo'));

-- TRIGGER append-only da trilha — vincula QUALQUER role, inclusive superusuário. Molde:
-- custody_events_block_mutation (20260836000000:162-164) + portal_access_logs_block_mutation
-- (20260847000000:85-87). DESVIO A FAVOR, declarado (§3.1): BEFORE TRUNCATE FOR EACH STATEMENT —
-- TRUNCATE não dispara trigger de linha e exige só o privilégio TRUNCATE; sem ele, TRUNCATE
-- apagaria a trilha sem tocar a trava. CONTORNOS (M-1 — enumeração honesta no header acima):
-- (a) session_replication_role=replica (só superusuário); (b) o DONO da tabela, mesmo
-- NOSUPERUSER, via ALTER TABLE … DISABLE TRIGGER — a inviolabilidade é da topologia dono ≠ app.
CREATE OR REPLACE FUNCTION auth_identity_link_events_block_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'auth_identity_link_events is append-only (C3): % is forbidden.', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "auth_identity_link_events_block_mutation"
  BEFORE UPDATE OR DELETE ON "auth_identity_link_events"
  FOR EACH ROW EXECUTE FUNCTION auth_identity_link_events_block_mutation();

CREATE TRIGGER "auth_identity_link_events_block_truncate"
  BEFORE TRUNCATE ON "auth_identity_link_events"
  FOR EACH STATEMENT EXECUTE FUNCTION auth_identity_link_events_block_mutation();

-- RLS de auth_identities: SELECT só da identidade do GUC; INSERT livre; sem UPDATE/DELETE.
ALTER TABLE "auth_identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_identities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_identities_select_own" ON "auth_identities";
CREATE POLICY "auth_identities_select_own" ON "auth_identities"
  FOR SELECT USING ("id"::text = current_setting('app.current_identity_id', true));
DROP POLICY IF EXISTS "auth_identities_insert" ON "auth_identities";
CREATE POLICY "auth_identities_insert" ON "auth_identities"
  FOR INSERT WITH CHECK (true);

-- RLS de auth_identity_links: dois braços (tenant OR identidade), USING e WITH CHECK — a forma
-- do braço de tenant é verbatim do molde 20260608000000:5-6.
ALTER TABLE "auth_identity_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_identity_links" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_identity_links_tenant_or_identity" ON "auth_identity_links";
CREATE POLICY "auth_identity_links_tenant_or_identity" ON "auth_identity_links"
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
    OR "identity_id"::text = current_setting('app.current_identity_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
    OR "identity_id"::text = current_setting('app.current_identity_id', true)
  );

-- RLS da trilha: FORCE + única política = INSERT. Sem SELECT: ilegível sob role sem BYPASSRLS.
ALTER TABLE "auth_identity_link_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_identity_link_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_identity_link_events_insert_only" ON "auth_identity_link_events";
CREATE POLICY "auth_identity_link_events_insert_only" ON "auth_identity_link_events"
  FOR INSERT WITH CHECK (true);

-- BACKFILL:BEGIN
-- Statement ÚNICO, idempotente (NOT EXISTS), POR USUÁRIO — jamais por e-mail (homônimos nascem
-- em identidades DISTINTAS). O terceiro INSERT (evento 'backfill') vai na MESMA cadeia. As duas
-- pontas (§0 regra 1): se a role da migração tiver rolsuper/rolbypassrls, cobre a base inteira;
-- se não tiver, o SELECT sob FORCE RLS lê ZERO e os três INSERTs criam ZERO — detecção pelos
-- canais do header (testes das duas configurações + discriminantes), nunca pelo output do migrate.
WITH missing AS MATERIALIZED (
  SELECT u.tenant_id, u.id AS user_id, gen_random_uuid() AS identity_id, gen_random_uuid() AS link_id
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.auth_identity_links l
    WHERE l.tenant_id = u.tenant_id AND l.user_id = u.id
  )
),
ins_identities AS (
  INSERT INTO public.auth_identities (id, created_at)
  SELECT identity_id, now() FROM missing
),
ins_links AS (
  INSERT INTO public.auth_identity_links (id, identity_id, tenant_id, user_id, attached_via, created_at)
  SELECT link_id, identity_id, tenant_id, user_id, 'backfill', now() FROM missing
)
INSERT INTO public.auth_identity_link_events (id, link_id, from_identity_id, to_identity_id, event, tenant_id, user_id, occurred_at)
SELECT gen_random_uuid(), link_id, NULL, identity_id, 'backfill', tenant_id, user_id, now() FROM missing;
-- BACKFILL:END

-- Diagnóstico do backfill — NUNCA concessão. O WARNING vai ao LOG DO SERVIDOR Postgres (em
-- gerenciado, à superfície de logs do provedor); o `prisma migrate deploy` o DESCARTA [medido,
-- 2 cadeiras]. Custa nada e serve a quem lê o log do banco; NENHUM mecanismo depende dele.
DO $$
DECLARE
  users_without_link bigint;
BEGIN
  SELECT count(*) INTO users_without_link
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.auth_identity_links l
    WHERE l.tenant_id = u.tenant_id AND l.user_id = u.id
  );
  IF users_without_link > 0 THEN
    RAISE WARNING 'B-O6R-01 backfill: % usuario(s) sem vinculo de identidade apos o backfill — a role desta migracao provavelmente nao enxerga public.users sob FORCE RLS (sem rolsuper/rolbypassrls). Ver runbook de ativacao em docs/deployment.md.', users_without_link;
  END IF;
END;
$$;

-- FUNCTION:BEGIN
-- A ÚNICA SECURITY DEFINER do repositório (guard: SECURITY DEFINER em prisma/migrations/** além
-- desta ocorrência reprova). Leitura pré-autenticação: o único ponto onde, por definição, não
-- existe contexto de organização (§13.2 do plano). Devolve APENAS (tenant_id, user_id); igualdade
-- sobre e-mail NORMALIZADO trim+lower (espelho de normalizeCredentialEmail,
-- local-auth-credential.repository.ts) — jamais LIKE/ILIKE/ANY. NULL e vazio devolvem zero linhas
-- por especificação (podem curto-circuitar sem tocar as fontes — por isso a sonda usa
-- e-mail-sentinela, nunca ''). Teto DENTRO da função: ORDER BY tenant_id determinístico +
-- LIMIT 4 = MAX_LOGIN_CANDIDATES (3) + 1 — a 4ª linha é o sentinela de teto (400 na aplicação).
CREATE FUNCTION public.auth_login_candidates(p_email text)
RETURNS TABLE (tenant_id uuid, user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $func$
  SELECT u.tenant_id, u.id
  FROM public.users u
  JOIN public.tenants t ON t.id = u.tenant_id
  JOIN public.local_auth_credentials c ON c.tenant_id = u.tenant_id AND c.user_id = u.id
  WHERE btrim(lower(p_email)) <> ''
    AND u.email = btrim(lower(p_email))
    AND u.status = 'active'
    AND t.status = 'active'
  ORDER BY u.tenant_id
  LIMIT 4
$func$;

-- Privilégios: REVOKE incondicional; NENHUM GRANT nesta migração (guard 8). A ativação é ato
-- humano (runbook docs/deployment.md, passos 0–vii) — com a exceção do DONO escrita no header.
REVOKE ALL ON FUNCTION public.auth_login_candidates(text) FROM PUBLIC;
-- FUNCTION:END
