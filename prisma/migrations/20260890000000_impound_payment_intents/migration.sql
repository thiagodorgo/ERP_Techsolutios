-- B-PATIO-REC-01 (plano v3 §4.1, §4.2, §7 M-REC-1; emenda 1 §3.1, §3.2, §6.2.2, §8.2.5) — M-REC-1: a cobrança ON-LINE da
-- taxa de pátio. Autorização do dono: "Q12 autorizo" (02/11 ~23:50; leitura do orquestrador: migrações do plano, não
-- destrutivas no up, com BEGIN/COMMIT). Texto ao dono: "tabela nova das cobranças on-line da taxa de pátio; a conta de cada
-- cobrança (do grupo ou própria) e o escopo dela ficam gravados e conferidos pelo banco".
--
-- ADITIVA: só CREATE TABLE, índices, FKs para tabelas existentes, CHECKs, coluna gerada e RLS NESTA tabela nova. Nenhuma
-- tabela existente muda. Transação EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA): falha em qualquer sentença = nada aplicado.
-- down (SÓ em drill, tests/rec-01-migration-drill-db.test.ts): DROP TABLE "impound_payment_intents".
--
-- DINHEIRO: as colunas *_cents (nomes do plano, §4.1) guardam REAIS em DECIMAL(12,2) (regra de dinheiro do plano, §7); a app
-- converte para centavos inteiros de forma exata. Os CHECKs abaixo são a autoridade (P-REC-16), uma restrição por linha,
-- para cada mutação ter âncora única.
-- CONTA (P-REC-22b): payment_connection_id (conexão própria) XOR payment_group_connection_id (conexão do grupo), e o grupo
-- vem junto da conexão de grupo. A conta da plataforma não é representável. As FKs das três colunas nascem no REC-04
-- (M-REC-14), quando as tabelas de conexão existirem; até lá a porta de conexão recusa por padrão e esta tabela fica vazia.
-- LINK ABERTO (§4.2, §4.8, F-1): UNIQUE parcial só em pending/cancel_requested — nenhuma transição de dinheiro entra nesses
-- estados, e por isso a UNIQUE nunca derruba o destino do dinheiro (P-REC-27).

BEGIN;

CREATE TABLE "impound_payment_intents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cancel_reason" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "amount_cents" DECIMAL(12,2) NOT NULL,
    "paid_cents" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "applied_cents" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "held_cents" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "held_reason" TEXT,
    "refunded_cents" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "methods" TEXT[],
    "payer_name" TEXT NOT NULL,
    "payer_document" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payment_connection_id" UUID,
    "payment_group_id" UUID,
    "payment_group_connection_id" UUID,
    "account_scope" TEXT GENERATED ALWAYS AS (CASE WHEN "payment_group_connection_id" IS NULL THEN 'organization' ELSE 'group' END) STORED NOT NULL,
    "external_charge_id" TEXT,
    "pay_url" TEXT,
    "pix_copy_paste" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "settled_charge_ids" UUID[],
    "settled_at" TIMESTAMPTZ(6),
    "reversed_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impound_payment_intents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "impound_payment_intents_status_chk" CHECK ("status" IN ('pending', 'cancel_requested', 'cancelled', 'expired', 'settled', 'funds_held', 'disputed', 'reversed')),
    CONSTRAINT "impound_payment_intents_cancel_reason_chk" CHECK ("cancel_reason" IS NULL OR "cancel_reason" IN ('cancel', 'expire', 'manual_settlement', 'due_changed', 'sibling_funds_held', 'connection_retired')),
    CONSTRAINT "impound_payment_intents_cancel_requested_reason_chk" CHECK ("status" <> 'cancel_requested' OR "cancel_reason" IS NOT NULL),
    CONSTRAINT "impound_payment_intents_money_nonnegative_chk" CHECK ("amount_cents" > 0 AND "paid_cents" >= 0 AND "applied_cents" >= 0 AND "held_cents" >= 0 AND "refunded_cents" >= 0),
    CONSTRAINT "impound_payment_intents_money_identity_chk" CHECK (paid_cents = applied_cents + held_cents + refunded_cents),
    CONSTRAINT "impound_payment_intents_held_reason_pair_chk" CHECK (("held_cents" > 0) = ("held_reason" IS NOT NULL)),
    CONSTRAINT "impound_payment_intents_held_reason_chk" CHECK ("held_reason" IS NULL OR "held_reason" IN ('amount_short', 'overpayment', 'duplicate_payment', 'paid_after_cancel', 'paid_after_expire', 'paid_after_manual_settlement', 'paid_after_reversal', 'reversal_remainder', 'refund_requested', 'refund_unclassified', 'chargeback_disputed')),
    CONSTRAINT "impound_payment_intents_open_states_money_chk" CHECK ("status" NOT IN ('pending', 'cancel_requested', 'cancelled', 'expired') OR ("applied_cents" = 0 AND "held_cents" = 0)),
    CONSTRAINT "impound_payment_intents_held_states_money_chk" CHECK ("status" NOT IN ('funds_held', 'disputed') OR ("applied_cents" = 0 AND "held_cents" > 0)),
    CONSTRAINT "impound_payment_intents_reversed_money_chk" CHECK ("status" <> 'reversed' OR ("applied_cents" = 0 AND "held_cents" = 0 AND "refunded_cents" > 0)),
    CONSTRAINT "impound_payment_intents_settled_money_chk" CHECK ("status" <> 'settled' OR ("applied_cents" > 0 AND ("held_reason" IS NULL OR "held_reason" IN ('overpayment', 'duplicate_payment')))),
    CONSTRAINT "impound_payment_intents_methods_chk" CHECK ("methods" IS NOT NULL AND cardinality("methods") >= 1 AND "methods" <@ ARRAY['pix', 'credit_card', 'debit_card']::TEXT[]),
    CONSTRAINT "impound_payment_intents_one_connection_chk" CHECK (num_nonnulls(payment_connection_id, payment_group_connection_id) = 1),
    CONSTRAINT "impound_payment_intents_group_pair_chk" CHECK (("payment_group_id" IS NULL) = ("payment_group_connection_id" IS NULL)),
    CONSTRAINT "impound_payment_intents_settled_charge_ids_chk" CHECK ("settled_charge_ids" IS NOT NULL)
);

CREATE UNIQUE INDEX "impound_payment_intents_external_charge_id_key" ON "impound_payment_intents"("external_charge_id");
CREATE INDEX "impound_payment_intents_tenant_id_process_id_idx" ON "impound_payment_intents"("tenant_id", "process_id");
CREATE INDEX "impound_payment_intents_tenant_id_status_idx" ON "impound_payment_intents"("tenant_id", "status");
CREATE UNIQUE INDEX "impound_payment_intents_tenant_id_id_key" ON "impound_payment_intents"("tenant_id", "id");
CREATE UNIQUE INDEX "impound_payment_intents_live_link_key" ON "impound_payment_intents" ("tenant_id", "process_id") WHERE "status" IN ('pending', 'cancel_requested');

ALTER TABLE "impound_payment_intents" ADD CONSTRAINT "impound_payment_intents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_payment_intents" ADD CONSTRAINT "impound_payment_intents_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "impound_payment_intents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "impound_payment_intents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "impound_payment_intents_tenant_isolation" ON "impound_payment_intents"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;
