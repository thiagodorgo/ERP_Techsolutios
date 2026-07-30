-- Block Ω5P PR-17b (owner-portal, superfície PÚBLICA) — fotos de evidência MINIMIZADAS + marca-d'água
-- (server-side, jimp) servidas via GET /portal/v1/owner/photos/:opaqueRef. Loga PHOTO_VIEWED (I10 — requisito
-- A1 da junta-5): MESMO allowlist do DOSSIER_VIEWED (só ip_hash/ua truncada + outcome; nunca attachmentId/
-- opaqueRef em claro).
--
-- ADITIVA / UP-ONLY (C7.5) — SÓ widening do CHECK de allowlist de "action" (aceita MAIS valores, nunca reprova
-- linha existente). O outcome AUTHORIZED (com process_id) e os outcomes SESSION_INVALID/RATE_LIMITED/NOT_FOUND
-- (sem process_id) já cabem nos CHECKs existentes — "portal_access_logs_process_found_chk" já aceita AUTHORIZED
-- desde 20260847000000/20260848000000. NENHUM outro widening necessário; NENHUMA tabela nova; NENHUMA coluna nova.
--
-- Rollback (runbook):
--   ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
--   ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_action_chk"
--     CHECK ("action" IN ('CHALLENGE_ISSUED','LOOKUP','DOSSIER_VIEWED','RELEASE_REQUESTED','LOGIN','REMOVAL_REQUESTED','RELEASE_DECIDED'));
-- (reverter exige que não haja linha com action='PHOTO_VIEWED' — reverter o PR remove-as junto.)

ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_action_chk"
  CHECK ("action" IN ('CHALLENGE_ISSUED', 'LOOKUP', 'DOSSIER_VIEWED', 'RELEASE_REQUESTED', 'LOGIN', 'REMOVAL_REQUESTED', 'RELEASE_DECIDED', 'PHOTO_VIEWED'));
