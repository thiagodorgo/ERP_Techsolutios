-- P0a (backend do ciclo completo de sincronização de checklist do mobile) — fecha a PERDA SILENCIOSA DE DADO
-- onde a criação de run preenchida offline nunca persistia no servidor de forma DURAVELMENTE IDEMPOTENTE.
--
-- O que muda: adiciona a coluna NULLABLE "client_run_key" em "checklist_runs" + um índice UNIQUE
-- (tenant_id, client_run_key). Essa coluna guarda o `local_run_id` que o app gera ANTES de ter o id do
-- servidor. O dedup in-memory do sync (`syncReceipts`, um Map) NÃO sobrevive a restart — sem esta chave
-- durável, reenviar `checklist.run_create` após um restart criaria uma run DUPLICADA. Com o unique, a 2ª
-- inserção com o mesmo (tenant, local_run_id) colide (P2002) e o caller resolve buscando a run existente;
-- é idempotente também SOB CONCORRÊNCIA (não só restart).
--
-- ADITIVA / tenant-first (C4/C7.5): apenas ADD COLUMN (nullable, sem default) + CREATE UNIQUE INDEX. ZERO
-- reescrita de linha (coluna nullable → backfill implícito NULL, sem lock pesado de reescrita). Runs
-- existentes (web/despacho) ficam com client_run_key = NULL; no Postgres NULLs são DISTINTOS no índice
-- unique, então múltiplas runs sem chave NÃO colidem entre si — só duas runs com o MESMO local_run_id no
-- MESMO tenant colidem (que é exatamente a duplicata que queremos impedir).
--
-- RLS: HERDADA. "checklist_runs" já tem ENABLE+FORCE ROW LEVEL SECURITY + policy de isolamento por tenant
-- (20260608000000_enable_tenant_rls). Adicionar coluna/índice NÃO altera a policy (ela filtra por tenant_id,
-- que continua presente e é a 1ª coluna do índice novo). Nada a re-emitir aqui.
--
-- Rollback (runbook — reverter o PR desfaz tudo sem afetar dado existente; a coluna só é escrita pelo sync
-- do mobile, nunca por caminho legado):
--   DROP INDEX IF EXISTS "checklist_runs_tenant_id_client_run_key_key";
--   ALTER TABLE "checklist_runs" DROP COLUMN IF EXISTS "client_run_key";

-- AlterTable
ALTER TABLE "checklist_runs" ADD COLUMN "client_run_key" TEXT;

-- CreateIndex (tenant_id 1º; nome = default do Prisma para @@unique([tenant_id, client_run_key]))
-- NOTA DE OPS (achado BAIXO do dba-guardião): este `CREATE UNIQUE INDEX` NÃO é CONCURRENTLY (é o SQL padrão
-- que o Prisma gera; NÃO alterar aqui para não divergir do schema). Em `checklist_runs` VOLUMOSA em produção,
-- ele causa um breve WRITE-STALL (lock ACCESS EXCLUSIVE curto) no deploy. Se a tabela for grande no ambiente
-- de produção, o time de ops deve aplicar o índice FORA DE BANDA e CONCURRENTLY antes de rodar o
-- `migrate deploy` (que então encontra o índice já existente), ex.:
--   CREATE UNIQUE INDEX CONCURRENTLY "checklist_runs_tenant_id_client_run_key_key"
--     ON "checklist_runs"("tenant_id", "client_run_key");
CREATE UNIQUE INDEX "checklist_runs_tenant_id_client_run_key_key" ON "checklist_runs"("tenant_id", "client_run_key");
