-- M16 (A13): multi-sentença transacional com a declaração e sem BEGIN -> G2 e G7.
-- NAO-ATOMICA: índice em tabela volumosa; aplicar fora da janela, ver docs/deployment.md
ALTER TABLE "caso" ADD COLUMN "a" TEXT;
ALTER TABLE "caso" ADD COLUMN "b" TEXT;
