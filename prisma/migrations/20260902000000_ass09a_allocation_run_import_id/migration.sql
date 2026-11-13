-- B-ASS-09a · M-09a — a importação da run de rateio em coluna própria, com FK (fecha `P-SAN3-03-IMPORT-ID-EM-COLUNA`).
-- Autorizada pelo dono em 31/10 (`decisoes.md:4183`, P1: "a do rateio automático acrescenta uma coluna").
-- ADITIVA: coluna nula, FK `ON DELETE SET NULL` (apagar a importação não apaga a run; o `metadata.importId` continua com
-- a referência), índice e backfill a partir de `metadata.importId`. Mais de uma sentença → `BEGIN;`/`COMMIT;`
-- (`D-MIGRACAO-COM-TRANSACAO-EXPLICITA`); drill por prefixo em `tests/ass-09a-import-id-migration-drill-db.test.ts`.
-- Backfill (R2-08): o cast para uuid fica DENTRO do `CASE`, nunca num `AND` ao lado do regex (o Postgres não garante a
-- ordem de avaliação do `AND`). `importId` que não é UUID, UUID sem importação e `null` ficam com `import_id` NULL.
BEGIN;

ALTER TABLE "cloud_cost_allocation_runs" ADD COLUMN "import_id" UUID;

ALTER TABLE "cloud_cost_allocation_runs" ADD CONSTRAINT "cloud_cost_allocation_runs_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "cloud_cost_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "cloud_cost_allocation_runs_import_id_idx" ON "cloud_cost_allocation_runs"("import_id");

UPDATE "cloud_cost_allocation_runs" AS r
SET "import_id" = i."id"
FROM "cloud_cost_imports" AS i
WHERE i."id" = CASE
  WHEN r."metadata"->>'importId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (r."metadata"->>'importId')::uuid
END;

COMMIT;

-- down (runbook; NÃO é executado pelo deploy). `DROP COLUMN` é destrutiva: só com decisão do dono (§C7.5).
--   DROP INDEX IF EXISTS "cloud_cost_allocation_runs_import_id_idx";
--   ALTER TABLE "cloud_cost_allocation_runs" DROP CONSTRAINT IF EXISTS "cloud_cost_allocation_runs_import_id_fkey";
--   ALTER TABLE "cloud_cost_allocation_runs" DROP COLUMN IF EXISTS "import_id";
