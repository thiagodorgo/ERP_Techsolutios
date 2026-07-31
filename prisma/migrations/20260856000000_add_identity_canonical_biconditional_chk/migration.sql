-- Block Ω-VID PR-04 rework (item 2 da junta de revisão adversarial): CHECK ESTRUTURAL fecha o bicondicional
-- "canonical_identity_id preenchido ⟺ confidence='MERGED'" em "third_party_vehicle_identities".
--
-- CONTEXTO — o que este CHECK barra: a migração 20260854000000 já criou "..._merge_chk"
--   CHECK ("confidence" <> 'MERGED' OR "canonical_identity_id" IS NOT NULL)  -- MERGED ⇒ canonical NOT NULL
-- que cobre só UMA direção. O secops (item 2 ALTA) provou que o PATCH /vehicle-identities/:id (permissão
-- impound:update, que tenant_admin/manager têm) conseguia levar uma identidade MERGED de volta a
-- confidence='PROVISIONAL' SEM tocar canonical_identity_id — reversão parcial do merge SEM a permissão
-- platform-only do unmerge-admin, deixando o estado contraditório (confidence≠MERGED E canonical_identity_id
-- pendurado) que NENHUM check anterior bloqueava. A correção da APP (service.update rejeita 422
-- merged_identity_read_only) tapa o caminho conhecido; este CHECK é o belt-and-suspenders do BANCO: a direção
-- INVERSA do merge_chk.
--
--   canonical_biconditional_chk: CHECK ("confidence" = 'MERGED' OR "canonical_identity_id" IS NULL)
--     -- canonical_identity_id preenchido ⇒ confidence='MERGED'
--
-- Juntos, merge_chk (MERGED ⇒ canonical setado) + canonical_biconditional_chk (canonical setado ⇒ MERGED) formam
-- o bicondicional completo: canonical_identity_id NÃO-NULO ⟺ confidence='MERGED'. Qualquer estado PROVISIONAL/
-- CONFIRMED com canonical pendurado passa a ser rejeitado com 23514 no próprio banco.
--
-- ADITIVA / UP-ONLY (C7.5): só ADD CONSTRAINT (CHECK) em tabela existente — ZERO alteração de dado, ZERO nova
-- tabela/coluna/índice/policy. CHECK cru NÃO faz parte do datamodel Prisma (o merge_chk/identity_chk/
-- confidence_chk existentes também vivem só nas migrações, não no schema.prisma) — por isso NÃO há mudança em
-- prisma/schema.prisma e NÃO há drift.
--
-- SEGURANÇA DE APLICAÇÃO (verificada antes de escrever esta migração): 0 linhas violando
--   (SELECT count(*) FROM third_party_vehicle_identities WHERE confidence <> 'MERGED' AND canonical_identity_id IS NOT NULL) = 0
-- O backfill do PR-03 sempre criou canonical_identity_id = NULL; merges legítimos criam MERGED + canonical; só o
-- bypass do item 2 criaria a violação — nenhum resíduo desse tipo existe. A migração aplica sem NOT VALID.
--
-- Compatibilidade com merge/unmerge: o merge grava confidence='MERGED' e canonical no MESMO UPDATE; o unmerge
-- grava confidence (PROVISIONAL/CONFIRMED restaurado) e canonical=NULL no MESMO UPDATE — nenhum estado
-- intermediário viola o CHECK (avaliado por linha ao fim do statement).
--
-- Rollback (runbook — só remove o CHECK; reverter o PR não afeta dado existente):
--   ALTER TABLE "third_party_vehicle_identities" DROP CONSTRAINT IF EXISTS "third_party_vehicle_identities_canonical_biconditional_chk";

ALTER TABLE "third_party_vehicle_identities"
  ADD CONSTRAINT "third_party_vehicle_identities_canonical_biconditional_chk"
  CHECK ("confidence" = 'MERGED' OR "canonical_identity_id" IS NULL);
