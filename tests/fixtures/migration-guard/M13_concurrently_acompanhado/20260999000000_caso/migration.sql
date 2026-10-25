-- M13 (A10): DDL não transacional acompanhada de outra sentença -> G3.
-- NAO-ATOMICA: índice em tabela volumosa; aplicar fora da janela, ver docs/deployment.md
CREATE INDEX CONCURRENTLY "caso_a_idx" ON "caso" ("a");
ALTER TABLE "caso" ADD COLUMN "b" TEXT;
