-- Block Ω5P PR-13b (Máquina de VENDA do leilão — Fase 4): 3 colunas ADITIVAS em "auction_attempts" — o RESULTADO
-- do certame ARREMATADO (CTB art. 328 / Lei 13.160/2015 / Res. CONTRAN 1025 arts. 25-34). A linha SOLD de uma
-- rodada passa a carregar quem arrematou (MINIMIZADO), o valor arrematado e a referência da nota de leilão:
--   (1) ADD COLUMN "winner_ref" TEXT (nullable): arrematante MINIMIZADO (§2.8 — rótulo/máscara; NUNCA CPF/nome/PII;
--       o dado sensível vive só na tabela RLS'd, NUNCA no payload da cadeia).
--   (2) ADD COLUMN "sold_amount" DECIMAL(12,2) (nullable): valor ARREMATADO — a BASE de I7 (Σ SettlementAllocation
--       = hammerAmount, CTB art. 328 §6º) que o PR-14 distribui. Dinheiro Decimal(12,2). auditável/imutável na
--       cadeia via AUCTION_SOLD (soldAmount como STRING — canonicalJson rejeita não-inteiro).
--   (3) ADD COLUMN "sale_note_reference" TEXT (nullable): referência da NOTA de leilão do arrematante (art. 34); o
--       anexo/assinatura ICP-Brasil da nota = Ω6 (PD-Ω5P-SIGN Opção A — o sistema REGISTRA a referência, não assina).
--
-- ADITIVA / UP-ONLY (C7.5) — trilho abençoado: ADD COLUMN nullable em tabela VIVA (mesmo mecanismo de
-- required_photo_sets / daily_service_catalog_id). NENHUM DROP/ALTER destrutivo, NENHUMA tabela nova, NENHUM
-- backfill (colunas nullable — sem reescrita de linha). As colunas HERDAM a RLS da tabela: "auction_attempts" já
-- tem ENABLE/FORCE ROW LEVEL SECURITY + policy "auction_attempts_tenant_isolation" desde 20260841000000 — NENHUMA
-- policy nova. tenant_id 1º em todo índice já vigente; estas colunas não entram em índice (o gate lê por round_number).
--
-- CHECK ESTRUTURAL (belt-and-suspenders sobre o validator; NÃO enum-CHECK). IS NOT NULL EXPLÍCITO (lição PR-07 C1 /
-- lógica-3-valores do Postgres): sold_amount NULL permitido (rodada DESERTED/NO_PAYMENT não tem valor arrematado),
-- mas quando PRESENTE tem de ser >= 0 (dinheiro não-negativo). Sem o "IS NOT NULL" explícito um NULL passaria o >= 0
-- (NULL → CHECK não reprova, mas o padrão da casa carrega o IS NOT NULL para deixar a intenção clara e simétrica).
--
-- Rollback (runbook — colunas NOVAS nullable; reverter o PR remove-as sem tocar dado existente):
--   ALTER TABLE "auction_attempts" DROP CONSTRAINT IF EXISTS "auction_attempts_sold_amount_chk";
--   ALTER TABLE "auction_attempts" DROP COLUMN IF EXISTS "sale_note_reference";
--   ALTER TABLE "auction_attempts" DROP COLUMN IF EXISTS "sold_amount";
--   ALTER TABLE "auction_attempts" DROP COLUMN IF EXISTS "winner_ref";

-- AddColumn (aditivo puro — nullable, sem default, sem backfill)
ALTER TABLE "auction_attempts" ADD COLUMN "winner_ref" TEXT;
ALTER TABLE "auction_attempts" ADD COLUMN "sold_amount" DECIMAL(12,2);
ALTER TABLE "auction_attempts" ADD COLUMN "sale_note_reference" TEXT;

-- CHECK ESTRUTURAL (dinheiro não-negativo quando presente; IS NOT NULL explícito — lição PR-07 C1).
ALTER TABLE "auction_attempts"
  ADD CONSTRAINT "auction_attempts_sold_amount_chk"
  CHECK ("sold_amount" IS NULL OR "sold_amount" >= 0);
