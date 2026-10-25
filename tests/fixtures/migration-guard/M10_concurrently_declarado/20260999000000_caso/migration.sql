-- M10 (A8, verde): a exceção estrutural completa: sozinha, sem BEGIN/COMMIT, declarada.
-- NAO-ATOMICA: índice em tabela volumosa; aplicar fora da janela, ver docs/deployment.md
CREATE INDEX CONCURRENTLY "caso_a_idx" ON "caso" ("a");
