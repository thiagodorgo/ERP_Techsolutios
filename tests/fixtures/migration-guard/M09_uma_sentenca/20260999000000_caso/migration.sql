-- B-TRC-02 — valida o CHECK alargado em transação própria (N2-06). Rollback: nenhum aqui (o VALIDATE não muda dado);
-- o re-estreitamento e a limpeza de _prisma_migrations estão no rollback da 20260879000000.
ALTER TABLE "traccar_ingress_receipts" VALIDATE CONSTRAINT "traccar_ingress_receipts_message_kind_check";
