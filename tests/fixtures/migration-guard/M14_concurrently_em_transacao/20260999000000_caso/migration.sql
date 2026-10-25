-- M14 (A11): DDL não transacional dentro de BEGIN/COMMIT -> G4 (e não G3: é uma sentença só).
-- NAO-ATOMICA: índice em tabela volumosa; aplicar fora da janela, ver docs/deployment.md
BEGIN;
CREATE INDEX CONCURRENTLY "caso_a_idx" ON "caso" ("a");
COMMIT;
