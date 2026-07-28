-- Block Ω5P PR-14a (Liquidação em cascata §6º — núcleo I7, INVARIANTE FINANCEIRO FORTE): tabelas "settlements"
-- (1 por processo) + "settlement_allocations" (append-only) — a DISTRIBUIÇÃO do PRODUTO do leilão na ordem legal
-- (CTB art. 328 §6º / Lei 13.160/2015 / Res. CONTRAN 1025 arts. 25-39; ESTUDO §6/§4.3 I7): custeio do leilão →
-- I remoção/estada → II tributos do veículo → III credores preferenciais → IV multas do órgão realizador →
-- V demais multas SNT → VI demais débitos; o RESÍDUO é o SALDO ao ex-dono (art. 328 §12). Dinheiro em CENTAVOS
-- INTEIROS EXATOS na app (nunca float); Decimal(12,2) no banco. A PROVA de integridade da distribuição vive no
-- CustodyEvent AUCTION_SETTLEMENT (append-only, hash-encadeado I2, migração 20260836000000), escrito na MESMA tx do
-- INSERT destas tabelas. I7: Σ settlement_allocations.amount == hammer_amount (produto distribuído INTEGRALMENTE,
-- OWNER_BALANCE incluído — sem sobra nem falta).
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva. Só CREATE TABLE novas (2) +
-- back-relation aditiva em impound_processes/tenants (metadata-only no Prisma; NENHUMA coluna em tabela existente):
--   CREATE TABLE "settlements" + "settlement_allocations" (NOVAS) + índices tenant-first + FK compostas tenant-first
--   RESTRICT (I9) + @@unique(tenant,id) + índices PARCIAIS únicos raw-only (idempotência) + CHECKs estruturais
--   + RLS ENABLE+FORCE+policy.
--
-- Enums em INGLÊS validados na APP (status DISTRIBUTED|BALANCE_CLAIMED|BALANCE_REVERTED_FUNSET — 14a só grava
-- DISTRIBUTED; os demais são declarados p/ o 14b USÁ-LOS, aditivo-friendly. beneficiary_kind AUCTION_COST/
-- REMOVAL_STORAGE/VEHICLE_TAXES/PRIORITY_CREDITORS/REALIZING_AGENCY_FINES/OTHER_SNT_FINES/OTHER_DEBITS/
-- OWNER_BALANCE/FUNSET) — SEM CHECK de enum no banco (padrão FASE0 §3.5). Labels PT-BR no DTO. tenant_id 1º em
-- todo índice composto. RLS clona 20260842000000_add_auction_edicts:100-105.
--
-- IDEMPOTÊNCIA (1 settlement/processo) = índice PARCIAL único raw-only (tenant_id, process_id) — no máx. 1
-- liquidação por processo (a distribuição nunca dupla-distribui; 23505 é ENGOLIDO sob o lock FOR UPDATE do
-- processo). É PARCIAL (WHERE process_id IS NOT NULL, sempre-verdadeiro pois a coluna é NOT NULL) SÓ para permanecer
-- raw-only — Prisma não modela índices parciais, então não há drift (mesmo mecanismo de auction_edicts_round_idem_key
-- / auction_attempts_round_idem_key). Idem p/ settlement_allocations (tenant_id, settlement_id, order_seq).
--
-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator + a aritmética de centavos). IS NOT NULL
-- EXPLÍCITO (lição PR-07 C1 / lógica-3-valores do Postgres): hammer_amount >= 0 (obrigatório); amount >= 0
-- (obrigatório); order_seq >= 1 (1-based); sold_round/opcionais monetários NULL permitido mas válido quando presente.
--
-- Rollback (runbook — objeto NOVO; reverter o PR remove tudo sem tocar dado existente):
--   DROP TABLE IF EXISTS "settlement_allocations" CASCADE;
--   DROP TABLE IF EXISTS "settlements" CASCADE;
-- (policies, índices, índices parciais únicos raw-only e CHECKs caem junto do DROP TABLE. A ORDEM importa: a filha
-- settlement_allocations (FK RESTRICT → settlements) cai ANTES da mãe.)

-- CreateTable — settlements (1 por processo)
CREATE TABLE "settlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "sold_round" INTEGER,
    "hammer_amount" DECIMAL(12,2) NOT NULL,
    "auction_cost_amount" DECIMAL(12,2),
    "removal_storage_claim" DECIMAL(12,2),
    "owner_balance_amount" DECIMAL(12,2),
    "shortfall_amount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'DISTRIBUTED',
    "owner_notify_due_at" TIMESTAMPTZ(6),
    "owner_claim_expires_at" TIMESTAMPTZ(6),
    "distributed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable — settlement_allocations (append-only; a linha do rateio por beneficiário na ordem §6º)
CREATE TABLE "settlement_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "settlement_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "order_seq" INTEGER NOT NULL,
    "beneficiary_kind" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "claim_amount" DECIMAL(12,2),
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "settlement_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — settlements
CREATE UNIQUE INDEX "settlements_tenant_id_id_key" ON "settlements"("tenant_id", "id");
CREATE INDEX "settlements_tenant_id_process_id_idx" ON "settlements"("tenant_id", "process_id");

-- Idempotência (1 settlement/processo): índice PARCIAL único raw-only (tenant, process) — no máx. 1 liquidação por
-- processo. PARCIAL (WHERE process_id IS NOT NULL, sempre-verdadeiro) só para permanecer raw-only (Prisma não modela
-- índice parcial ⇒ sem drift). 2ª distribuição do MESMO processo → 23505 → engolido sob o lock (devolve a existente,
-- nunca sobrescreve — a distribuição de dinheiro jamais dobra).
CREATE UNIQUE INDEX "settlements_process_idem_key"
  ON "settlements"("tenant_id", "process_id")
  WHERE "process_id" IS NOT NULL;

-- CreateIndex — settlement_allocations
CREATE UNIQUE INDEX "settlement_allocations_tenant_id_id_key" ON "settlement_allocations"("tenant_id", "id");
CREATE INDEX "settlement_allocations_tenant_id_settlement_id_order_seq_idx" ON "settlement_allocations"("tenant_id", "settlement_id", "order_seq");

-- Idempotência da ordem do rateio: índice PARCIAL único raw-only (tenant, settlement, order_seq) — no máx. 1 linha
-- por posição da cascata dentro de uma liquidação. PARCIAL (WHERE order_seq IS NOT NULL, sempre-verdadeiro) só para
-- permanecer raw-only (Prisma não modela índice parcial ⇒ sem drift).
CREATE UNIQUE INDEX "settlement_allocations_order_idem_key"
  ON "settlement_allocations"("tenant_id", "settlement_id", "order_seq")
  WHERE "order_seq" IS NOT NULL;

-- AddForeignKey (compostas tenant-first; TODAS RESTRICT — I9: nada de custódia/liquidação cascateia; retenção >=5 anos)
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlement_allocations" ADD CONSTRAINT "settlement_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlement_allocations" ADD CONSTRAINT "settlement_allocations_tenant_id_settlement_id_fkey" FOREIGN KEY ("tenant_id", "settlement_id") REFERENCES "settlements"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlement_allocations" ADD CONSTRAINT "settlement_allocations_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator + a aritmética de centavos). IS NOT NULL
-- EXPLÍCITO (lição PR-07 C1: fecha o furo da lógica-3-valores do Postgres — sem o IS NOT NULL um NULL passaria o >= 0).
ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_hammer_amount_chk"
  CHECK ("hammer_amount" IS NOT NULL AND "hammer_amount" >= 0);
ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_auction_cost_amount_chk"
  CHECK ("auction_cost_amount" IS NULL OR "auction_cost_amount" >= 0);
ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_removal_storage_claim_chk"
  CHECK ("removal_storage_claim" IS NULL OR "removal_storage_claim" >= 0);
ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_owner_balance_amount_chk"
  CHECK ("owner_balance_amount" IS NULL OR "owner_balance_amount" >= 0);
ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_shortfall_amount_chk"
  CHECK ("shortfall_amount" IS NULL OR "shortfall_amount" >= 0);
ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_sold_round_chk"
  CHECK ("sold_round" IS NULL OR "sold_round" >= 1);
ALTER TABLE "settlement_allocations"
  ADD CONSTRAINT "settlement_allocations_order_seq_chk"
  CHECK ("order_seq" IS NOT NULL AND "order_seq" >= 1);
ALTER TABLE "settlement_allocations"
  ADD CONSTRAINT "settlement_allocations_amount_chk"
  CHECK ("amount" IS NOT NULL AND "amount" >= 0);
ALTER TABLE "settlement_allocations"
  ADD CONSTRAINT "settlement_allocations_claim_amount_chk"
  CHECK ("claim_amount" IS NULL OR "claim_amount" >= 0);

-- RLS por tabela (clona 20260842000000_add_auction_edicts:100-105).
ALTER TABLE "settlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settlements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settlements_tenant_isolation" ON "settlements";
CREATE POLICY "settlements_tenant_isolation" ON "settlements"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "settlement_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settlement_allocations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settlement_allocations_tenant_isolation" ON "settlement_allocations";
CREATE POLICY "settlement_allocations_tenant_isolation" ON "settlement_allocations"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
