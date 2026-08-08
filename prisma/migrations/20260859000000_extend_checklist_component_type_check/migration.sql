-- HOTFIX (achado ALTA do dba-guardiao na junta do CHECKLIST P1 PR-02c) — ESTENDE o CHECK de
-- `type` em `checklist_template_components` para os 3 tipos que o PR-01 (#330) introduziu no
-- codigo SEM migracao: `single_choice`, `multi_choice` e `signature`.
--
-- PROBLEMA QUE CONSERTA (bug VIVO na main desde o #330):
-- o CHECK original (migracao 20260607000000, linha 36) restringe `type` a EXATAMENTE 7 valores.
-- O PR-01 acrescentou os 3 tipos novos ao enum TS (src/modules/checklists/checklist.types.ts) e ao
-- catalogo servido a paleta do builder (src/modules/checklists/checklist.components.ts), mas o
-- banco continuou recusando. Em `CORE_SAAS_PERSISTENCE=prisma` (o modo REAL/producao), criar ou
-- salvar um modelo com "Escolha unica", "Multipla escolha" ou "Assinatura" estoura 23514
-- (check_violation) e o tenant admin recebe HTTP 400 com a mensagem CRUA do Postgres.
--
-- REPRODUZIDO ponta a ponta contra a API viva (:3000, admin.demo), antes deste hotfix:
--   POST /api/v1/tenant/checklists  (componente single_choice com config.options validas)
--   -> HTTP 400 {"message":"new row for relation \"checklist_template_components\" violates
--      check constraint \"checklist_template_components_type_check\""}
--
-- POR QUE NINGUEM VIU: toda a suite de checklist roda em `CORE_SAAS_PERSISTENCE=memory`
-- (tests/checklist-routes.test.ts:472 forca o modo), entao os 6/6 verdes NUNCA tocam o CHECK.
-- Blindagem contra recorrencia entra em tests/checklist-template-prisma-db.test.ts (DB-gated).
--
-- SEGURANCA DA MIGRACAO: ADITIVA — apenas ALARGA o conjunto permitido. Nenhuma linha e reescrita
-- e a validacao e instantanea (nenhuma linha existente usa os valores novos, justamente porque o
-- banco os recusava). Mesmo padrao da ja-mergeada
-- 20260858000000_extend_field_dispatch_event_type_check.
--
-- ROLLBACK (runbook): o DOWN abaixo so e seguro enquanto NAO existirem linhas com os 3 tipos
-- novos. Se existirem, remova-as ou converta-as ANTES de reverter, senao o ADD CONSTRAINT falha
-- com "is violated by some row". Verificado em BEGIN/ROLLBACK na base local.
--   ALTER TABLE "checklist_template_components" DROP CONSTRAINT "checklist_template_components_type_check";
--   ALTER TABLE "checklist_template_components" ADD CONSTRAINT "checklist_template_components_type_check"
--     CHECK ("type" IN ('vehicle_selector','damage_map','photo_upload','observation','comparison','acknowledgement','before_after'));

ALTER TABLE "checklist_template_components" DROP CONSTRAINT "checklist_template_components_type_check";

ALTER TABLE "checklist_template_components" ADD CONSTRAINT "checklist_template_components_type_check"
  CHECK ("type" IN (
    'vehicle_selector',
    'damage_map',
    'photo_upload',
    'observation',
    'comparison',
    'acknowledgement',
    'before_after',
    'single_choice',
    'multi_choice',
    'signature'
  ));
