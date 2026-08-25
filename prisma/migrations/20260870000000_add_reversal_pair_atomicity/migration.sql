-- B-O6R-02 ciclo 4 · C1 (P9, Ω6R-DIN-002 concorrente) — INVARIANTE DE BANCO CONTRA A METADE ÓRFÃ.
--
-- Aditiva pura: dois TRIGGERS de guarda em financial_entries + suas funções. NENHUM UPDATE/DELETE de
-- dado financeiro (censo de legado é WARNING informativo; higienizar órfão pré-existente é decisão
-- humana — §C7.5). prisma/schema.prisma NÃO muda: trigger não é modelado pelo Prisma — vive só aqui,
-- como o índice parcial vizinho (add_financial_invariants). Precedente da casa para trigger de guarda
-- cross-row: custody_events_block_mutation, impound_outbox_events_guard_update, auth_identity_link_events_*.
--
-- O QUE ESTA MIGRATION FECHA, e por que o índice parcial vizinho NÃO bastava:
-- `financial_entries_reversal_of_active_key (tenant_id, reversal_of) WHERE ... deleted_at IS NULL`
-- cobre só a metade DUPLICATA (dois estornos ativos do MESMO original). A metade ÓRFÃ — estorno VIVO
-- apontando um original com deleted_at — é um predicado ENTRE LINHAS que índice parcial nenhum
-- expressa. O idioma da casa para invariante cross-row é o trigger.
--
-- Camada de serviço (C1, financial-entry.service.ts) já serializa delete×reverse via uow.run +
-- FOR UPDATE + re-check. Estes triggers fecham a MESMA classe para o escritor que NÃO passa pelo
-- serviço (SQL cru, bug futuro, corrida no banco), e o FOR SHARE do Trigger B é o que serializa os
-- dois caminhos no row lock do ORIGINAL, no próprio Postgres.
--
-- FALHA = fail-closed: qualquer tentativa de criar a metade órfã ABORTA a transação (RAISE EXCEPTION),
-- nunca commita meio par. As funções rodam SECURITY INVOKER (default) e filtram tenant_id = NEW.tenant_id
-- EXPLICITAMENTE — sob RLS o WITH CHECK garante NEW.tenant_id == tenant corrente, logo o SELECT enxerga
-- o original do próprio tenant; para escritor que bypassa RLS (owner/superuser) o filtro explícito é a
-- defesa. Provado por tests/financial-entry-delete-reverse-race-db.test.ts (barrier, 2 ordens, SQL cru).

-- Trigger A — a PORTA DO DELETE. Bloqueia soft-delete de um ORIGINAL que ainda tem estorno VIVO
-- (apagar o original deixaria a contrapartida órfã, apontando linha morta). O EXISTS usa o índice
-- parcial financial_entries_reversal_of_active_key (barato; só varre estornos ativos do tenant).
CREATE OR REPLACE FUNCTION financial_entries_block_orphan_on_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  -- Só na transição vivo → deletado (o único momento em que a órfã pode nascer por esta porta).
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM financial_entries r
      WHERE r.tenant_id = NEW.tenant_id
        AND r.reversal_of = NEW.id
        AND r.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Ω6R-DIN-002: nao se apaga um lançamento que tem estorno ativo (a contrapartida ficaria orfa apontando linha morta). Estorne o par inteiro, nunca apague uma metade.'
        USING ERRCODE = 'raise_exception';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS "financial_entries_block_orphan_on_delete" ON "financial_entries";
CREATE TRIGGER "financial_entries_block_orphan_on_delete"
  BEFORE UPDATE ON "financial_entries"
  FOR EACH ROW
  EXECUTE FUNCTION financial_entries_block_orphan_on_delete();

-- Trigger B — a PORTA DO ESTORNO. Um estorno VIVO (reversal_of setado, deleted_at nulo) exige que o
-- ORIGINAL esteja VIVO, lido com FOR SHARE. O FOR SHARE é a peça que fecha o interleaving NO BANCO,
-- sozinho: o SELECT ... FOR SHARE do original conflita com o UPDATE de soft-delete do delete (e
-- vice-versa), então os dois caminhos SERIALIZAM no row lock do original; quem chega depois re-avalia
-- o predicado sob READ COMMITTED (EvalPlanQual) e vê o estado commitado do vencedor.
CREATE OR REPLACE FUNCTION financial_entries_block_orphan_on_reversal()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  original_alive boolean;
BEGIN
  IF NEW.reversal_of IS NOT NULL AND NEW.deleted_at IS NULL THEN
    SELECT true INTO original_alive
    FROM financial_entries o
    WHERE o.tenant_id = NEW.tenant_id
      AND o.id = NEW.reversal_of
      AND o.deleted_at IS NULL
    FOR SHARE;

    IF original_alive IS NOT TRUE THEN
      RAISE EXCEPTION 'Ω6R-DIN-002: estorno aponta um lançamento original inexistente ou ja apagado — a contrapartida ficaria orfa. O original tem de estar vivo.'
        USING ERRCODE = 'raise_exception';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS "financial_entries_block_orphan_on_reversal" ON "financial_entries";
CREATE TRIGGER "financial_entries_block_orphan_on_reversal"
  BEFORE INSERT OR UPDATE OF reversal_of, deleted_at ON "financial_entries"
  FOR EACH ROW
  EXECUTE FUNCTION financial_entries_block_orphan_on_reversal();

-- Censo INFORMATIVO de legado (zero mutação de dado): conta órfãos pré-existentes (estorno vivo cujo
-- original está apagado ou sumiu). >0 → RAISE WARNING + pendência P-O6R-B02-ORFAOS-LEGADOS (higiene é
-- decisão humana, §C7.5 — parada imediata; a migração NUNCA mexe no dado). Espelha as duas pontas
-- condicionais da migration vizinha add_financial_invariants.
DO $censo$
DECLARE
  orfaos bigint;
BEGIN
  SELECT count(*) INTO orfaos
  FROM financial_entries r
  WHERE r.reversal_of IS NOT NULL
    AND r.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM financial_entries o
      WHERE o.tenant_id = r.tenant_id
        AND o.id = r.reversal_of
        AND o.deleted_at IS NULL
    );
  IF orfaos > 0 THEN
    RAISE WARNING 'financial_entries: % estorno(s) ORFAO(S) de legado detectado(s) (contrapartida viva apontando original apagado/inexistente) — os triggers ja bloqueiam escritas NOVAS; o legado fica INTACTO (higiene = decisao humana). Abrir/consultar P-O6R-B02-ORFAOS-LEGADOS.', orfaos;
  END IF;
END $censo$;

-- down (provado no D28: aplicar → down → re-aplicar, em banco descartável):
--   DROP TRIGGER IF EXISTS "financial_entries_block_orphan_on_reversal" ON "financial_entries";
--   DROP TRIGGER IF EXISTS "financial_entries_block_orphan_on_delete" ON "financial_entries";
--   DROP FUNCTION IF EXISTS financial_entries_block_orphan_on_reversal();
--   DROP FUNCTION IF EXISTS financial_entries_block_orphan_on_delete();
