-- B-COMISSAO-MOTOR (Emenda 1 §E1.9, Emenda 1.1 §B; D-DONO-2011-COMISSAO-MIGRACAO-INDICES)
-- Os 4 índices únicos parciais do espaço reservado do motor de comissão.
-- B-COMISSAO:indice-reservado
BEGIN;
CREATE UNIQUE INDEX "commission_policies_engine_key"
  ON "commission_policies" ("tenant_id") WHERE "scope" = 'engine';
CREATE UNIQUE INDEX "commission_policy_rules_engine_payee_live_key"
  ON "commission_policy_rules" ("tenant_id", "policy_id", (("conditions" ->> 'payeeUserId')))
  WHERE "active" AND "rule_type" = 'engine_payee';
CREATE UNIQUE INDEX "commission_basis_events_engine_live_key"
  ON "commission_basis_events" ("tenant_id", "source_id")
  WHERE "idempotency_key" LIKE 'engine:wo:%' AND "status" <> 'superseded';
CREATE UNIQUE INDEX "commission_calculations_engine_primary_live_key"
  ON "commission_calculations" ("tenant_id", "basis_event_id")
  WHERE "idempotency_key" LIKE 'engine:calc:%' AND "status" <> 'reversed';
COMMIT;
