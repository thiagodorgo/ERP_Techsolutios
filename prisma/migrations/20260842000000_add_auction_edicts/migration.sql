-- Block Ω5P PR-13a (Edital + reciclagem gated — núcleo probatório da Fase 4): tabela "auction_edicts" — a
-- DESIGNAÇÃO de leilão POR RODADA (edital do certame administrativo: CTB art. 328 / Lei 13.160/2015 / Res. CONTRAN
-- 1025 arts. 25-34 / Lei 14.133 edital >=15 d.u.). É uma PROJEÇÃO MUTÁVEL da designação — a PROVA de integridade
-- de cada rodada vive no CustodyEvent (AUCTION_LOTTED no registro do edital; AUCTION_CLOSED no fecho da rodada
-- deserta), append-only, hash-encadeado (I2, migração 20260836000000), escrito na MESMA tx do INSERT desta tabela.
--
-- É o GATE PROBATÓRIO da sucata (I8 — a destruição de patrimônio de 3º, tolerância-zero, que o PR-12 diferiu):
--   (a) um strike DESERTED só conta se houve um certame REAL designado (edital registrado) para aquela rodada;
--   (b) a reciclagem AUCTION_ELIGIBLE→DIRECT_RECYCLING exige 2 strikes edict-backed (encerra R-omega5p-pr12-ciclo1).
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva. Só CREATE TABLE nova +
-- back-relation aditiva em impound_processes (metadata-only no Prisma; NENHUMA coluna em tabela existente):
--   CREATE TABLE "auction_edicts" (NOVA) + índices tenant-first + FK compostas tenant-first RESTRICT (I9)
--   + @@unique(tenant,id) + índice PARCIAL único raw-only de idempotência por round_number + CHECKs estruturais
--   + RLS ENABLE+FORCE+policy.
--
-- Enums em INGLÊS validados na APP (classification CONSERVED|SCRAP|UNRECOVERABLE; status DESIGNATED|CLOSED) — SEM
-- CHECK de enum no banco (padrão FASE0 §3.5). Labels PT-BR no DTO. tenant_id 1º em todo índice composto.
-- RLS clona 20260841000000_add_auction_attempts:73-78.
--
-- SIGILO (art. 28): appraisal_amount/min_bid_amount são a avaliação SIGILOSA — NÃO povoadas em 13a (só emergem em
-- 13b sob a permissão auction:appraise). As colunas nascem aqui (aditivo-friendly) mas o endpoint de 13a não as
-- escreve nem o DTO as expõe. Dinheiro Decimal(12,2). auctioneer_ref/notes minimizados (§2.8: sem PII; NUNCA na
-- cadeia). pncp_url = guard-rail p/ o adapter PNCP (Ω6).
--
-- IDEMPOTÊNCIA (1 edital/rodada) = índice PARCIAL único raw-only (tenant_id, process_id, round_number) — no máx. 1
-- edital por rodada por processo. É PARCIAL (WHERE round_number IS NOT NULL, sempre-verdadeiro pois a coluna é
-- NOT NULL) SÓ para permanecer raw-only — Prisma não modela índices parciais, então não há drift (mesmo mecanismo
-- de auction_attempts_round_idem_key / process_notifications_kind_idem_key). O @@index NÃO-único
-- (tenant,process,round_number) do model é a consulta do gate; este é o backstop de unicidade sob corrida (23505
-- ENGOLIDO sob o lock FOR UPDATE do processo — nunca no catch, que abortaria a tx; pré-check sob o lock).
--
-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator). IS NOT NULL EXPLÍCITO (lição PR-07 C1
-- / lógica-3-valores do Postgres): round_number >= 1 (rodada 1-based; sem o IS NOT NULL um NULL passaria o >= 1 —
-- NULL → CHECK não reprova). business_days/appraisal/min_bid: NULL permitido (opcionais), mas quando presentes têm
-- de ser válidos.
--
-- Rollback (runbook — objeto NOVO; reverter o PR remove tudo sem tocar dado existente):
--   DROP TABLE IF EXISTS "auction_edicts" CASCADE;
-- (policy, índices, índice parcial único raw-only e CHECKs caem junto do DROP TABLE.)

-- CreateTable
CREATE TABLE "auction_edicts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "round_number" INTEGER NOT NULL,
    "classification" TEXT,
    "appraisal_amount" DECIMAL(12,2),
    "min_bid_amount" DECIMAL(12,2),
    "edict_reference" TEXT,
    "edict_platform" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "auctioneer_ref" TEXT,
    "pncp_url" TEXT,
    "business_days" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DESIGNATED',
    "notes" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "auction_edicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auction_edicts_tenant_id_id_key" ON "auction_edicts"("tenant_id", "id");
CREATE INDEX "auction_edicts_tenant_id_process_id_idx" ON "auction_edicts"("tenant_id", "process_id");
CREATE INDEX "auction_edicts_tenant_id_process_id_round_number_idx" ON "auction_edicts"("tenant_id", "process_id", "round_number");

-- Idempotência (1 edital/rodada): índice PARCIAL único raw-only por (tenant, process, round_number) — no máx. 1
-- edital por rodada por processo. PARCIAL (WHERE round_number IS NOT NULL, sempre-verdadeiro) só para permanecer
-- raw-only (Prisma não modela índice parcial ⇒ sem drift). 2º registro da MESMA rodada → 23505 → engolido sob o
-- lock do processo (o edital não é duplicado; o pré-check sob FOR UPDATE serializa os registros).
CREATE UNIQUE INDEX "auction_edicts_round_idem_key"
  ON "auction_edicts"("tenant_id", "process_id", "round_number")
  WHERE "round_number" IS NOT NULL;

-- AddForeignKey (compostas tenant-first; TODAS RESTRICT — I9: nada de custódia cascateia; retenção >=5 anos)
ALTER TABLE "auction_edicts" ADD CONSTRAINT "auction_edicts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auction_edicts" ADD CONSTRAINT "auction_edicts_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator). round_number 1-based (IS NOT NULL
-- EXPLÍCITO — lição PR-07 C1: fecha o furo da lógica-3-valores do Postgres). business_days/appraisal/min_bid
-- opcionais mas válidos quando presentes.
ALTER TABLE "auction_edicts"
  ADD CONSTRAINT "auction_edicts_round_number_chk"
  CHECK ("round_number" IS NOT NULL AND "round_number" >= 1);
ALTER TABLE "auction_edicts"
  ADD CONSTRAINT "auction_edicts_business_days_chk"
  CHECK ("business_days" IS NULL OR "business_days" >= 1);
ALTER TABLE "auction_edicts"
  ADD CONSTRAINT "auction_edicts_appraisal_amount_chk"
  CHECK ("appraisal_amount" IS NULL OR "appraisal_amount" >= 0);
ALTER TABLE "auction_edicts"
  ADD CONSTRAINT "auction_edicts_min_bid_amount_chk"
  CHECK ("min_bid_amount" IS NULL OR "min_bid_amount" >= 0);

-- RLS por tabela (clona 20260841000000_add_auction_attempts:73-78).
ALTER TABLE "auction_edicts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auction_edicts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auction_edicts_tenant_isolation" ON "auction_edicts";
CREATE POLICY "auction_edicts_tenant_isolation" ON "auction_edicts"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
