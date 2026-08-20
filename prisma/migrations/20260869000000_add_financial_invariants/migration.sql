-- B-O6R-02 (Ω6R-DIN-004 + backstop do Ω6R-DIN-002) — INVARIANTES FINANCEIRAS NO BANCO.
-- Aditiva pura (ADD CONSTRAINT NOT VALID + CREATE UNIQUE INDEX parcial). NENHUM UPDATE/DELETE de dado
-- financeiro: corrigir legado violador é decisão humana (§C7.5 — parada imediata), nunca desta migração.
-- Precedente da casa: 20260816000000_add_cancel_decision_check (CHECK NOT VALID, duas pontas).
--
-- 1) CHECK 0 <= paid_amount <= amount (DIN-004): até aqui a invariante só existia em comentário e no
--    guard de serviço — SQL cru, bug futuro ou corrida podiam gravar paid_amount > amount. NOT VALID:
--    INSERT/UPDATE novos são bloqueados JÁ; as linhas existentes não são varridas na criação.
--    O VALIDATE logo abaixo é CONDICIONAL (duas pontas, decisão do plano §D2):
--      · Ponta A (esperada): zero legado violador → VALIDATE passa → constraint plena (convalidated).
--      · Ponta B: legado violador existe → VALIDATE falha DENTRO do bloco DO → WARNING e a migração
--        SEGUE; a constraint fica NOT VALID (escritas novas continuam bloqueadas), o legado fica
--        INTACTO e abre-se a pendência P-O6R-B02-PAID-LEGADO (higiene = decisão humana).
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_paid_amount_check"
  CHECK (paid_amount >= 0 AND paid_amount <= amount)
  NOT VALID;

DO $$
BEGIN
  ALTER TABLE "financial_titles" VALIDATE CONSTRAINT "financial_titles_paid_amount_check";
EXCEPTION
  WHEN check_violation THEN
    RAISE WARNING 'financial_titles_paid_amount_check: legado violador de 0 <= paid_amount <= amount detectado — a constraint permanece NOT VALID (escritas novas JA sao bloqueadas; o legado fica intacto). Abrir/consultar P-O6R-B02-PAID-LEGADO.';
END $$;

-- 2) Índice ÚNICO PARCIAL de reversal_of (backstop do DIN-002): no máximo UM contra-lançamento ATIVO
--    por lançamento original — a rede de banco da idempotência do estorno (o serviço já dá 409
--    already_reversed; numa corrida, o índice é quem decide). Mesmo idioma dos vizinhos
--    (financial_titles_wo_direction_active_key / financial_entries_title_client_action_active_key):
--    parcial, então o Prisma NÃO o modela — vive só nesta migration. Também CONDICIONAL (duas pontas):
--      · Ponta A (esperada): sem duplicata legada → índice criado.
--      · Ponta B: duplicata legada de estorno → WARNING e a migração SEGUE SEM o índice (deduplicar é
--        mutação de dado financeiro = decisão humana); as escritas novas ficam sob o guard de serviço
--        e, na F4 deste bloco, sob o FOR UPDATE do estorno — o índice é backstop, não a única defesa.
DO $$
BEGIN
  CREATE UNIQUE INDEX "financial_entries_reversal_of_active_key"
    ON "financial_entries" (tenant_id, reversal_of)
    WHERE reversal_of IS NOT NULL AND deleted_at IS NULL;
EXCEPTION
  WHEN unique_violation THEN
    RAISE WARNING 'financial_entries_reversal_of_active_key: duplicata legada de estorno ativo detectada — indice NAO criado (deduplicar e decisao humana). Escritas novas seguem sob o guard de servico/FOR UPDATE. Abrir pendencia.';
END $$;

-- down (provado na bateria do bloco: aplicar → down → re-aplicar, em banco descartável):
--   DROP INDEX IF EXISTS "financial_entries_reversal_of_active_key";
--   ALTER TABLE "financial_titles" DROP CONSTRAINT IF EXISTS "financial_titles_paid_amount_check";
