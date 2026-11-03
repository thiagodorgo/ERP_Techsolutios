-- B-PATIO-REC-01 (plano v3 §5.5 L12, §7 M-REC-2; emenda 1 §2.1, §3.1, §3.2, §6.2.2, X-45) — M-REC-2: a referência GLOBAL de cada
-- cobrança on-line da taxa de pátio. Autorização do dono: "Q12 autorizo" (02/11 ~23:50). Texto ao dono: "tabela global só com
-- identificadores e datas, para achar a organização de cada aviso e vigiar as cobranças".
--
-- EXCEÇÃO DECLARADA (sem RLS, por desenho; espelho de billing_statement_refs do B-ASSINATURA): o aviso do provedor e a
-- vigilância precisam achar a organização e a conta de uma cobrança ANTES de abrir a transação dela. Só ids, a conta, o
-- provedor e datas: nem valor, nem PII, nem estado de dinheiro. As FKs compostas para a intenção, a pertença ao grupo e as
-- conexões nascem no REC-04 (M-REC-14, emenda §6.2.2 e §7.1).
--
-- ADITIVA: só CREATE TABLE, índices, FK para tenants e CHECKs NESTA tabela nova. Transação EXPLÍCITA.
-- down (SÓ em drill, tests/rec-01-migration-drill-db.test.ts): DROP TABLE "impound_payment_refs".

BEGIN;

CREATE TABLE "impound_payment_refs" (
    "intent_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "payment_connection_id" UUID,
    "payment_group_id" UUID,
    "payment_group_connection_id" UUID,
    "external_charge_id" TEXT,
    "watch" TEXT NOT NULL DEFAULT 'open',
    "next_check_at" TIMESTAMPTZ(6),
    "watch_until" TIMESTAMPTZ(6),
    "refund_requested_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impound_payment_refs_pkey" PRIMARY KEY ("intent_id"),
    CONSTRAINT "impound_payment_refs_watch_chk" CHECK ("watch" IN ('open', 'hot', 'warm', 'cold', 'none'))
);

CREATE INDEX "impound_payment_refs_next_check_at_idx" ON "impound_payment_refs"("next_check_at");
CREATE INDEX "impound_payment_refs_tenant_id_idx" ON "impound_payment_refs"("tenant_id");

ALTER TABLE "impound_payment_refs" ADD CONSTRAINT "impound_payment_refs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
