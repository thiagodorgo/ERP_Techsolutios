-- D-CHK-DISPATCH-CREATE (PR-A, achado ALTA do dba-guardião) — ESTENDE o CHECK de `event_type` de
-- `field_dispatch_events` para incluir o valor novo `field_dispatch_checklist_run_failed`.
--
-- PROBLEMA QUE CONSERTA: o CHECK original `field_dispatch_events_event_type_check` (migração
-- 20260617000000) restringe `event_type` a EXATAMENTE 4 valores. O ramo FAIL-OPEN de
-- `FieldDispatchService.create` grava o 5º valor `field_dispatch_checklist_run_failed` na timeline quando a
-- provisão da run do checklist falha. Como `create` NÃO envolve `create + createEvent` numa `$transaction`,
-- um INSERT desse evento estourava `23514` (check_violation) NÃO-capturado → HTTP 500 com o despacho já
-- gravado (órfão), evento de domínio `field_dispatch.created` nunca publicado (Outbox perdia) e auditoria
-- perdida. Ou seja: o "fail-open AUDITADO" virava fail-closed-500. Este é o conserto PRIMÁRIO (a
-- defesa-em-profundidade try/catch no serviço é só rede secundária).
--
-- ADITIVA / valida na hora: NENHUMA linha existente usa o valor novo (ele nunca pôde ser inserido antes,
-- justamente porque o CHECK antigo o barrava), então o ADD CONSTRAINT valida instantaneamente sem varrer/
-- reescrever dado. Só DROP + ADD do CHECK; zero coluna nova, zero reescrita de linha.
--
-- RLS: HERDADA. `field_dispatch_events` já tem ENABLE+FORCE ROW LEVEL SECURITY + policy de isolamento por
-- tenant (20260617000000). Trocar um CHECK NÃO altera a policy. Nada a re-emitir aqui.
--
-- ROLLBACK (runbook — reverter o PR desfaz o efeito; nenhuma linha nova depende do valor ampliado se o
-- código do fail-open também for revertido):
--   ALTER TABLE "field_dispatch_events" DROP CONSTRAINT "field_dispatch_events_event_type_check";
--   ALTER TABLE "field_dispatch_events" ADD CONSTRAINT "field_dispatch_events_event_type_check"
--     CHECK ("event_type" IN ('field_dispatch_created', 'field_dispatch_status_changed',
--       'field_dispatch_reassigned', 'field_dispatch_cancelled'));
--   -- ATENÇÃO: só re-adicione o CHECK ANTIGO depois de garantir que nenhuma linha usa
--   -- 'field_dispatch_checklist_run_failed' (senão o ADD do CHECK antigo falha com 23514).

ALTER TABLE "field_dispatch_events" DROP CONSTRAINT "field_dispatch_events_event_type_check";
ALTER TABLE "field_dispatch_events" ADD CONSTRAINT "field_dispatch_events_event_type_check"
  CHECK ("event_type" IN ('field_dispatch_created', 'field_dispatch_status_changed', 'field_dispatch_reassigned', 'field_dispatch_cancelled', 'field_dispatch_checklist_run_failed'));
