-- Block Ω5P PR-13b (MÉDIO-3 da junta — determinismo do I7 base para o PR-14): 1 coluna ADITIVA
-- "defaulted_sale_round" em "auction_attempts". Só a linha NO_PAYMENT (inadimplência art. 42) a popula: aponta a
-- rodada da SOLD SUPERADA pelo re-leilão. Torna a SOLD EFETIVA determinística — sem esta amarração, uma venda
-- inadimplida + revenda deixaria 2 linhas outcome='SOLD' e o PR-14 (cascata §6º, I7 Σ SettlementAllocation=
-- hammerAmount) não saberia qual arremate é a base, dupla-contando dinheiro (tolerância-zero).
--
-- REGRA I7 (consumida pelo PR-14): a SOLD EFETIVA = a linha SOLD que atinge AUCTION_CLOSED (consumação) OU a linha
-- SOLD cuja round_number NÃO é referenciada por nenhum NO_PAYMENT.defaulted_sale_round. A linha SOLD superada
-- permanece IMUTÁVEL (I2/append-only) — a inadimplência é uma entrada COMPENSATÓRIA, nunca um UPDATE/DELETE.
--
-- ADITIVA / UP-ONLY (C7.5) — trilho abençoado: ADD COLUMN nullable em tabela VIVA (mesmo mecanismo de
-- 20260843000000). NENHUM DROP/ALTER destrutivo, NENHUMA tabela nova, NENHUM backfill (nullable ⇒ sem reescrita de
-- linha). A coluna HERDA a RLS de "auction_attempts" (ENABLE+FORCE+policy desde 20260841000000) — nenhuma policy
-- nova. Não entra em índice (leitura por processo/outcome já indexada).
--
-- CHECK ESTRUTURAL (belt-and-suspenders; IS NOT NULL explícito — lição PR-07 C1): defaulted_sale_round NULL
-- permitido (só a NO_PAYMENT o popula), mas quando PRESENTE tem de ser uma rodada 1-based válida (>= 1).
--
-- Rollback (runbook — coluna NOVA nullable; reverter o PR remove-a sem tocar dado existente):
--   ALTER TABLE "auction_attempts" DROP CONSTRAINT IF EXISTS "auction_attempts_defaulted_sale_round_chk";
--   ALTER TABLE "auction_attempts" DROP COLUMN IF EXISTS "defaulted_sale_round";

-- AddColumn (aditivo puro — nullable, sem default, sem backfill)
ALTER TABLE "auction_attempts" ADD COLUMN "defaulted_sale_round" INTEGER;

-- CHECK ESTRUTURAL (rodada 1-based quando presente; IS NOT NULL explícito).
ALTER TABLE "auction_attempts"
  ADD CONSTRAINT "auction_attempts_defaulted_sale_round_chk"
  CHECK ("defaulted_sale_round" IS NULL OR "defaulted_sale_round" >= 1);
