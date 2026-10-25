-- B-SAN3-20 — vínculo ADITIVO e ANULÁVEL cheque → título (D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO revê D-Ω4-7-NO-TITLE).
-- Transação EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA): o `prisma migrate deploy` 7.8 roda sentença a sentença em
-- autocommit; falha em qualquer sentença → nada aplicado; recuperação = `prisma migrate resolve --rolled-back
-- 20260881000000_cheque_title_link` + `prisma migrate deploy`. Nenhum UPDATE/DELETE de dado. RLS herdada
-- (cheques_tenant_isolation, 20260815); a FK não passa pela RLS, mas tenant_id está na chave.
BEGIN;
ALTER TABLE "cheques" ADD COLUMN "title_id" UUID;
ALTER TABLE "cheques"
  ADD CONSTRAINT "cheques_tenant_id_title_id_fkey"
  FOREIGN KEY ("tenant_id", "title_id") REFERENCES "financial_titles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "cheques_tenant_id_title_id_idx" ON "cheques"("tenant_id", "title_id");
COMMIT;
-- down (MANUAL, nunca automático; psql -v ON_ERROR_STOP=1 --single-transaction -f down.sql):
--   DROP INDEX IF EXISTS "cheques_tenant_id_title_id_idx";
--   ALTER TABLE "cheques" DROP CONSTRAINT IF EXISTS "cheques_tenant_id_title_id_fkey";
--   ALTER TABLE "cheques" DROP COLUMN IF EXISTS "title_id";   -- perde o vínculo se houver cheque vinculado: NUNCA automático
