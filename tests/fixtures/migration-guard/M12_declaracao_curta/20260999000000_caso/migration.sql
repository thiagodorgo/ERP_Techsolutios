-- M12 (A9): declaração com motivo curto (menos de 20 caracteres não brancos) -> G5.
-- NAO-ATOMICA: x
CREATE INDEX CONCURRENTLY "caso_a_idx" ON "caso" ("a");
