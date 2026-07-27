-- Block Ω5P PR-12 (Elegibilidade ao leilão + regra dos 2-strikes I8 — ABRE a Fase 4): tabela "auction_attempts"
-- — o CONTADOR APPEND-ONLY das rodadas de leilão desertas (sem arremate). É a materialização consultável do
-- strikeCount (DERIVADO = COUNT(outcome='DESERTED')), NUNCA uma coluna mutável em impound_processes. A PROVA de
-- integridade de cada strike vive no CustodyEvent AUCTION_CLOSED (append-only, hash-encadeado I2, migração
-- 20260836000000), escrito na MESMA tx do INSERT desta tabela; a reclassificação AUCTION_ELIGIBLE→DIRECT_RECYCLING
-- no 2º strike encadeia um STATUS_CHANGE na MESMA tx. I8: 2 leilões desertos ⇒ sucata/reciclagem, sem retorno à
-- circulação (CTB art. 328 / Lei 13.160/2015 / Res. 1025 art. 25-26).
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva. Só CREATE TABLE nova +
-- back-relation aditiva em impound_processes (metadata-only no Prisma; NENHUMA coluna em tabela existente):
--   CREATE TABLE "auction_attempts" (NOVA) + índices tenant-first + FK compostas tenant-first RESTRICT (I9)
--   + @@unique(tenant,id) + índice PARCIAL único raw-only de idempotência por round_number + CHECK estrutural
--   + RLS ENABLE+FORCE+policy.
--
-- Enums em INGLÊS validados na APP (outcome DESERTED|SOLD|NO_PAYMENT — PR-12 só GRAVA 'DESERTED'; SOLD/NO_PAYMENT
-- são declarados na union da APP p/ o PR-13 USÁ-LOS, aditivo-friendly) — SEM CHECK de enum no banco (padrão FASE0
-- §3.5). Labels PT-BR no DTO ("leilão deserto / arrematado / não pago"). tenant_id 1º em todo índice composto.
-- RLS clona 20260840000000_add_release:115-127.
--
-- IDEMPOTÊNCIA (D-Ω5P-AUC-03) = índice PARCIAL único raw-only (tenant_id, process_id, round_number) — no máx. 1
-- registro por rodada por processo (o fecho de rodada nunca dupla-conta nem dupla-transiciona; 23505 é ENGOLIDO
-- sob o lock FOR UPDATE do processo). É PARCIAL (WHERE round_number IS NOT NULL, sempre-verdadeiro pois a coluna é
-- NOT NULL) SÓ para permanecer raw-only — Prisma não modela índices parciais, então não há drift (mesmo mecanismo de
-- process_notifications_kind_idem_key / impound_releases_active_release_key). O @@index NÃO-único
-- (tenant,process,outcome) do model é a consulta do strikeCount; este é o backstop de unicidade sob corrida.
--
-- CHECK ESTRUTURAL (NÃO enum-CHECK; belt-and-suspenders sobre o validator). IS NOT NULL EXPLÍCITO (lição PR-07 C1 /
-- lógica-3-valores do Postgres): round_number >= 1 (rodada 1-based; sem o IS NOT NULL um round_number NULL passaria
-- o >= 1 — NULL → CHECK não reprova).
--
-- Rollback (runbook — objeto NOVO; reverter o PR remove tudo sem tocar dado existente):
--   DROP TABLE IF EXISTS "auction_attempts" CASCADE;
-- (policy, índices, índice parcial único raw-only e CHECK caem junto do DROP TABLE.)

-- CreateTable
CREATE TABLE "auction_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "round_number" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'DESERTED',
    "notes" TEXT,
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "auction_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auction_attempts_tenant_id_id_key" ON "auction_attempts"("tenant_id", "id");
CREATE INDEX "auction_attempts_tenant_id_process_id_idx" ON "auction_attempts"("tenant_id", "process_id");
CREATE INDEX "auction_attempts_tenant_id_process_id_outcome_idx" ON "auction_attempts"("tenant_id", "process_id", "outcome");

-- Idempotência (D-Ω5P-AUC-03): índice PARCIAL único raw-only por (tenant, process, round_number) — no máx. 1 registro
-- por rodada por processo. PARCIAL (WHERE round_number IS NOT NULL, sempre-verdadeiro) só para permanecer raw-only
-- (Prisma não modela índice parcial ⇒ sem drift). 2º registro da MESMA rodada → 23505 → engolido sob o lock do
-- processo (não dupla-conta o strike nem dupla-transiciona à reciclagem).
CREATE UNIQUE INDEX "auction_attempts_round_idem_key"
  ON "auction_attempts"("tenant_id", "process_id", "round_number")
  WHERE "round_number" IS NOT NULL;

-- AddForeignKey (compostas tenant-first; TODAS RESTRICT — I9: nada de custódia cascateia; retenção >=5 anos)
ALTER TABLE "auction_attempts" ADD CONSTRAINT "auction_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auction_attempts" ADD CONSTRAINT "auction_attempts_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK ESTRUTURAL (NÃO enum-CHECK; belt-and-suspenders sobre o validator). round_number 1-based (IS NOT NULL
-- EXPLÍCITO — lição PR-07 C1: fecha o furo da lógica-3-valores do Postgres).
ALTER TABLE "auction_attempts"
  ADD CONSTRAINT "auction_attempts_round_number_chk"
  CHECK ("round_number" IS NOT NULL AND "round_number" >= 1);

-- RLS por tabela (clona 20260840000000_add_release:115-127).
ALTER TABLE "auction_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auction_attempts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auction_attempts_tenant_isolation" ON "auction_attempts";
CREATE POLICY "auction_attempts_tenant_isolation" ON "auction_attempts"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
