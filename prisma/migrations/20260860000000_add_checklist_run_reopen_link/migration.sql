-- CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE, decisao do dono) — CICLO DE VIDA DA VISTORIA:
-- "responder a qualquer momento" = TRAVA AO CONCLUIR/ASSINAR. A vistoria concluida e a prova juridica do
-- estado do veiculo e fica IMUTAVEL; corrigir depois NAO edita a concluida — cria uma NOVA VERSAO vinculada
-- (append-only), com trilha de auditoria de quem reabriu, quando e a partir de qual vistoria.
--
-- O que muda (ADITIVO, nenhuma linha existente e reescrita):
--   1) "reopened_from_run_id" UUID NULL — id da vistoria de onde esta versao nasceu (mesma organizacao).
--   2) "reopen_reason"        TEXT NULL — motivo declarado pelo gestor na reabertura (a auditoria mostra
--      "por que a prova foi reaberta"; sem ele a reabertura seria ato anonimo sobre documento assinado).
--   3) CHECK biconditional: os dois campos andam juntos (ou ambos nulos = vistoria original, ou ambos
--      preenchidos = versao reaberta). Mesmo padrao ja usado em
--      20260856000000_add_identity_canonical_biconditional_chk.
--   4) CHECK anti-auto-referencia: uma vistoria nao pode ser a versao anterior de si mesma (cadeia sem laco).
--   5) UNIQUE (tenant_id, reopened_from_run_id) — ANTI-DUPLA-REABERTURA. NULLs sao DISTINTOS no Postgres,
--      entao as vistorias originais (a esmagadora maioria) NAO colidem entre si; so duas reaberturas da
--      MESMA vistoria concluida colidem, que e exatamente a ambiguidade que queremos impedir (qual versao
--      seria a vigente?). Tambem resolve a CORRIDA entre duas reaberturas concorrentes no banco, nao no app.
--   6) FK COMPOSTA TENANT-FIRST (tenant_id, reopened_from_run_id) -> checklist_runs(tenant_id, id),
--      ON DELETE RESTRICT: a versao anterior nunca some por baixo da nova, e o vinculo NAO atravessa
--      organizacao (isolamento reforcado no banco, alem da RLS).
--
-- RLS: HERDADA. "checklist_runs" ja tem ENABLE + FORCE ROW LEVEL SECURITY + policy de isolamento por tenant
-- (20260608000000_enable_tenant_rls). Adicionar colunas/indice/constraints NAO altera a policy (ela filtra
-- por tenant_id, que continua presente e e a 1a coluna do indice e da FK novos). Nada a re-emitir aqui.
--
-- SEGURANCA DA MIGRACAO: colunas NULLABLE sem default (backfill implicito NULL, sem reescrita de linha).
-- Os dois CHECKs sao satisfeitos por TODAS as linhas existentes (ambos os campos ficam NULL), entao a
-- validacao e trivial. NOTA DE OPS (mesmo alerta da 20260857000000): o CREATE UNIQUE INDEX abaixo NAO e
-- CONCURRENTLY (e o SQL que o Prisma gera para @@unique; nao alterar aqui para nao divergir do schema). Em
-- "checklist_runs" volumosa, aplique-o FORA DE BANDA e CONCURRENTLY antes do `migrate deploy`:
--   CREATE UNIQUE INDEX CONCURRENTLY "checklist_runs_tenant_id_reopened_from_run_id_key"
--     ON "checklist_runs"("tenant_id", "reopened_from_run_id");
--
-- ROLLBACK (runbook — testado UP/DOWN no Postgres local; o DOWN so e seguro enquanto nenhuma vistoria tiver
-- sido reaberta. Se houver linhas com "reopened_from_run_id" NOT NULL, a cadeia de versoes se perde ao
-- dropar as colunas: exporte-as antes):
--   ALTER TABLE "checklist_runs" DROP CONSTRAINT IF EXISTS "checklist_runs_tenant_id_reopened_from_run_id_fkey";
--   DROP INDEX IF EXISTS "checklist_runs_tenant_id_reopened_from_run_id_key";
--   ALTER TABLE "checklist_runs" DROP CONSTRAINT IF EXISTS "checklist_runs_reopen_no_self_reference_chk";
--   ALTER TABLE "checklist_runs" DROP CONSTRAINT IF EXISTS "checklist_runs_reopen_link_biconditional_chk";
--   ALTER TABLE "checklist_runs" DROP COLUMN IF EXISTS "reopen_reason";
--   ALTER TABLE "checklist_runs" DROP COLUMN IF EXISTS "reopened_from_run_id";

-- AlterTable
ALTER TABLE "checklist_runs" ADD COLUMN "reopened_from_run_id" UUID;
ALTER TABLE "checklist_runs" ADD COLUMN "reopen_reason" TEXT;

-- CreateCheck (biconditional: vinculo e motivo andam juntos)
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_reopen_link_biconditional_chk"
  CHECK (("reopened_from_run_id" IS NULL) = ("reopen_reason" IS NULL));

-- CreateCheck (uma vistoria nao e a versao anterior de si mesma)
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_reopen_no_self_reference_chk"
  CHECK ("reopened_from_run_id" IS NULL OR "reopened_from_run_id" <> "id");

-- CreateIndex (anti-dupla-reabertura; nome = default do Prisma para @@unique([tenant_id, reopened_from_run_id]))
CREATE UNIQUE INDEX "checklist_runs_tenant_id_reopened_from_run_id_key"
  ON "checklist_runs"("tenant_id", "reopened_from_run_id");

-- AddForeignKey (composta tenant-first; nome = default do Prisma para a relacao auto-referente)
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_tenant_id_reopened_from_run_id_fkey"
  FOREIGN KEY ("tenant_id", "reopened_from_run_id") REFERENCES "checklist_runs"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
