-- Ω3F-8a — Índice de LEITURA da auditoria por entidade (aba "Logs da OS").
-- Aditivo puro (nenhuma coluna/tabela alterada; nenhum dado tocado).
-- Objetivo: o GET /api/v1/work-orders/:id/audit-logs filtra por
-- (tenant_id, entity, entity_id) e ordena por created_at DESC. Sem este índice
-- a consulta varreria toda a auditoria do tenant. A ordem das colunas casa o
-- filtro de igualdade (tenant_id, entity, entity_id) + a ordenação (created_at).
CREATE INDEX "audit_logs_tenant_entity_idx"
  ON "audit_logs" ("tenant_id", "entity", "entity_id", "created_at");

-- Rollback:
-- DROP INDEX "audit_logs_tenant_entity_idx";
