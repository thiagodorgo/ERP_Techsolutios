-- B-O6R-07c-b1 (Ω6R-SEC-002) — P6 de `D-07CB-EMENDA-RECOMENDACOES` (decisão do dono, 2026-10-15): "a migração de
-- dados que preenche a atribuição dos despachos ativos de antes do 07c-b, idempotente, contando antes os casos em
-- que o atribuído e o alvo divergem (autorização nominal de migrations/** para isso)".
--
-- POR QUE: até este bloco o despacho NÃO gravava a atribuição da OS. A partir dele, escrever na OS (vistoria,
-- evidência, status, km, comentário, anexo...) exige a atribuição (`D1-07c` = (c)). Sem este preenchimento, o
-- técnico que está com um despacho ATIVO de antes do deploy perde a escrita no meio do serviço.
--
-- O QUE FAZ, por organização (o GUC `app.current_tenant_id` é setado a cada volta: funciona sob FORCE ROW LEVEL
-- SECURITY com papel sem BYPASSRLS, e não depende de superusuário):
--   1. CONTA ANTES, por despacho ativo (`assigned`, `accepted`, `on_route`, `arrived`, `in_service`, `reassigned`) de
--      OS não encerrada (fora de `completed`, `cancelled`, `rejected`):
--        coerentes   — a OS já está atribuída ao alvo do despacho (perfil dele ou o user id, o casamento do 07a);
--        a_preencher — a OS não tem atribuição e este é o despacho ativo MAIS RECENTE dela;
--        divergentes — a OS está atribuída a OUTRA pessoa, ou não tem atribuição mas há despacho ativo mais
--                      recente para ela (dois despachos ativos na mesma OS).
--      As contagens saem em RAISE NOTICE (totais, sem id nem dado pessoal).
--   2. PREENCHE só os `a_preencher`: `assigned_operator_id` = perfil do alvo (ou o user id, sem perfil — a mesma
--      forma do `assignFromDispatch`), `assigned_user_id` = alvo, `open` → `assigned` (outro status fica), uma linha
--      em `work_order_assignments` (`metadata.source = 'field_dispatch_backfill'`, com o `dispatchId`) e um evento
--      `work_order_assigned` na linha do tempo da OS.
--   3. NÃO MEXE nos divergentes: a OS segue com quem ela tem (tirar a atribuição de alguém no meio do serviço seria
--      pior); o alvo do despacho segue mudando o status do PRÓPRIO despacho (`D-07c-DESPACHO-ALVO`, Traccar). Os
--      divergentes ficam contados para o despachante resolver reatribuindo.
--
-- IDEMPOTENTE: só escreve onde `assigned_operator_id IS NULL`; depois da 1ª execução o caso vira "coerente". Reexecutar
-- não duplica linha nem evento.
--
-- ROLLBACK (runbook): as linhas e os eventos criados aqui são identificáveis pelo `metadata.source`:
--   UPDATE work_orders w SET assigned_operator_id = NULL, assigned_user_id = NULL,
--          status = CASE WHEN e.from_status = 'open' THEN 'open' ELSE w.status END
--     FROM work_order_events e
--    WHERE e.tenant_id = w.tenant_id AND e.work_order_id = w.id AND e.metadata->>'source' = 'field_dispatch_backfill';
--   DELETE FROM work_order_events WHERE metadata->>'source' = 'field_dispatch_backfill';
--   DELETE FROM work_order_assignments WHERE metadata->>'source' = 'field_dispatch_backfill';
-- (cada um sob o GUC da organização, ou por papel com BYPASSRLS). O rollback não desmarca a migração em
-- `_prisma_migrations` (mesmo aviso da 20260871000000).
--
-- O TESTE (`tests/o6r07c-b-scope-db.test.ts`) executa ESTE corpo, escopado às organizações da fixture pela âncora
-- do laço de organizações (o SELECT do FOR abaixo, ocorrência única no arquivo), e confere as contagens, o
-- preenchimento e a idempotência.
DO $$
DECLARE
  v_tenant uuid;
  v_coerentes bigint := 0;
  v_preencher bigint := 0;
  v_divergentes bigint := 0;
  v_preenchidos bigint := 0;
  v_alvo record;
BEGIN
  FOR v_tenant IN SELECT id FROM tenants ORDER BY id LOOP
    PERFORM set_config('app.current_tenant_id', v_tenant::text, true);

    FOR v_alvo IN
      SELECT d.id AS dispatch_id,
             d.work_order_id,
             d.operator_user_id,
             w.status AS wo_status,
             w.assigned_operator_id,
             p.id AS profile_id,
             row_number() OVER (PARTITION BY d.work_order_id ORDER BY d.created_at DESC, d.id DESC) AS ordem
        FROM field_dispatches d
        JOIN work_orders w ON w.tenant_id = d.tenant_id AND w.id = d.work_order_id
        LEFT JOIN operator_profiles p ON p.tenant_id = d.tenant_id AND p.user_id = d.operator_user_id
       WHERE d.tenant_id = v_tenant
         AND d.status IN ('assigned', 'accepted', 'on_route', 'arrived', 'in_service', 'reassigned')
         AND w.status NOT IN ('completed', 'cancelled', 'rejected')
       ORDER BY d.work_order_id, ordem
    LOOP
      IF v_alvo.assigned_operator_id IS NOT NULL
         AND (v_alvo.assigned_operator_id = v_alvo.operator_user_id OR v_alvo.assigned_operator_id = v_alvo.profile_id) THEN
        v_coerentes := v_coerentes + 1;
      ELSIF v_alvo.assigned_operator_id IS NULL AND v_alvo.ordem = 1 THEN
        v_preencher := v_preencher + 1;
      ELSE
        v_divergentes := v_divergentes + 1;
      END IF;
    END LOOP;

    FOR v_alvo IN
      SELECT DISTINCT ON (d.work_order_id)
             d.id AS dispatch_id,
             d.work_order_id,
             d.operator_user_id,
             w.status AS wo_status,
             COALESCE(p.id, d.operator_user_id) AS operator_id
        FROM field_dispatches d
        JOIN work_orders w ON w.tenant_id = d.tenant_id AND w.id = d.work_order_id
        LEFT JOIN operator_profiles p ON p.tenant_id = d.tenant_id AND p.user_id = d.operator_user_id
       WHERE d.tenant_id = v_tenant
         AND d.status IN ('assigned', 'accepted', 'on_route', 'arrived', 'in_service', 'reassigned')
         AND w.status NOT IN ('completed', 'cancelled', 'rejected')
         AND w.assigned_operator_id IS NULL
       ORDER BY d.work_order_id, d.created_at DESC, d.id DESC
    LOOP
      UPDATE work_orders
         SET assigned_operator_id = v_alvo.operator_id,
             assigned_user_id = v_alvo.operator_user_id,
             status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END,
             updated_at = now()
       WHERE tenant_id = v_tenant
         AND id = v_alvo.work_order_id
         AND assigned_operator_id IS NULL;

      IF FOUND THEN
        v_preenchidos := v_preenchidos + 1;

        INSERT INTO work_order_assignments (tenant_id, work_order_id, operator_id, user_id, status, metadata)
        VALUES (
          v_tenant,
          v_alvo.work_order_id,
          v_alvo.operator_id,
          v_alvo.operator_user_id,
          'assigned',
          jsonb_build_object('source', 'field_dispatch_backfill', 'dispatchId', v_alvo.dispatch_id)
        );

        INSERT INTO work_order_events (tenant_id, work_order_id, event_type, from_status, to_status, message, metadata)
        VALUES (
          v_tenant,
          v_alvo.work_order_id,
          'work_order_assigned',
          v_alvo.wo_status,
          CASE WHEN v_alvo.wo_status = 'open' THEN 'assigned' ELSE v_alvo.wo_status END,
          'Ordem de serviço atribuída ao técnico do despacho ativo (migração do B-O6R-07c-b1).',
          jsonb_build_object(
            'source', 'field_dispatch_backfill',
            'dispatchId', v_alvo.dispatch_id,
            'operatorId', v_alvo.operator_id,
            'userId', v_alvo.operator_user_id
          )
        );
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'B-O6R-07c-b1 backfill: despachos ativos coerentes=%, a_preencher=%, divergentes=% (nao tocados); OS preenchidas=%',
    v_coerentes, v_preencher, v_divergentes, v_preenchidos;
END $$;
