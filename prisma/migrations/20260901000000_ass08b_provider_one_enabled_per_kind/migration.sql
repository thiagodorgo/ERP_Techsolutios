-- B-ASS-08b · G14 (decisão do dono, 2026-11-09, `D-ASS08B-INDICE-G14`): UM provedor LIGADO por `kind` (pagamento, nota),
-- garantido pelo BANCO além do gate em código (`evaluateEnablePreconditions` → `another_provider_enabled_for_kind`).
-- Aditiva, idempotente, 1 sentença (sem BEGIN/COMMIT — D-MIGRACAO-COM-TRANSACAO-EXPLICITA). Tabela GLOBAL da plataforma (M4).
CREATE UNIQUE INDEX IF NOT EXISTS "billing_provider_configs_one_enabled_per_kind" ON "billing_provider_configs" ("kind") WHERE "enabled" = true;
