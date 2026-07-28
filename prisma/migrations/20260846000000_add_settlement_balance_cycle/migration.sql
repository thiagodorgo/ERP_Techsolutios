-- Block Ω5P PR-14b (Ciclo do SALDO ao ex-proprietário — completa o I7, CTB art. 328 §12 / Lei 13.160/2015): 4 colunas
-- ADITIVAS nullable em "settlements" para registrar a CONSUMAÇÃO do saldo residual apurado no PR-14a:
--   claimed_by           = ator interno (console) que REGISTROU a retirada presencial do saldo pelo ex-dono (UUID; NÃO
--                          é PII do proprietário — é o operador autenticado, igual a distributed_by)
--   claimed_at           = quando a retirada foi registrada (art. 328 §12: identificação de quem retira, análogo ao I5)
--   claim_recipient_ref  = referência MINIMIZADA/MASCARADA do recebedor (§2.8: NUNCA CPF/nome cru; vive SÓ nesta tabela
--                          RLS'd — JAMAIS na cadeia hash). Nullable — o operador pode registrar sem ref.
--   reverted_at          = quando o saldo NÃO reclamado reverteu ao Funset (art. 328 §12 — após o prazo de 5 anos)
--
-- O ciclo do saldo é uma MUDANÇA DE ESTADO no Settlement (settlements.status DISTRIBUTED → BALANCE_CLAIMED OU
-- BALANCE_REVERTED_FUNSET — mutuamente exclusivos), NÃO uma redistribuição: as settlement_allocations e a Σ==hammer do
-- PR-14a permanecem INTOCADAS (o owner_balance_amount já foi alocado como OWNER_BALANCE no 14a). A PROVA de cada
-- transição vive no CustodyEvent AUCTION_SETTLEMENT (append-only, hash-encadeado I2) com { event, phase:CLAIM|
-- FUNSET_REVERSION, settlementId } — SEM PII do ex-dono. status/timestamps já existiam (owner_notify_due_at/
-- owner_claim_expires_at criados no 14a) — ESTA migração só soma os campos de "quem retirou / quando reverteu".
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo. Só ADD COLUMN nullable (sem DEFAULT de backfill; linhas
-- existentes ficam NULL — a coluna nasce sem valor, o que é o estado correto de uma liquidação ainda DISTRIBUTED).
-- SEM índice/CHECK novo (os 4 campos são metadados de consumação; a integridade financeira é do 14a). RLS/policy da
-- tabela settlements já vigora (migração 20260845000000) — as novas colunas herdam a mesma isolação por tenant.
--
-- Rollback (runbook — colunas NOVAS nullable; reverter o PR remove-as sem tocar dado existente):
--   ALTER TABLE "settlements" DROP COLUMN IF EXISTS "reverted_at";
--   ALTER TABLE "settlements" DROP COLUMN IF EXISTS "claim_recipient_ref";
--   ALTER TABLE "settlements" DROP COLUMN IF EXISTS "claimed_at";
--   ALTER TABLE "settlements" DROP COLUMN IF EXISTS "claimed_by";

ALTER TABLE "settlements" ADD COLUMN "claimed_by" UUID;
ALTER TABLE "settlements" ADD COLUMN "claimed_at" TIMESTAMPTZ(6);
ALTER TABLE "settlements" ADD COLUMN "claim_recipient_ref" TEXT;
ALTER TABLE "settlements" ADD COLUMN "reverted_at" TIMESTAMPTZ(6);
