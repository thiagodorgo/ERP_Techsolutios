-- B-SAN3-10b-F4-SEED-ISOLADO — censo de LEITURA da organizacao da demonstracao isolada (aceite V3 e V4).
-- So SELECT. Uma linha por tabela, `<tabela> <contagem>`, em ordem. Rodar com PGCLIENTENCODING=UTF8 e o prefixo
-- ASCII do slug (o nome acentuado quebra o psql do Git Bash):
--   psql -At -F' ' -v org_prefixo=organizacao-exemplo-% -f censo.sql
-- Conta tudo o que o motor escreve. O unico filtro de auditoria permitido e o das acoes de login (`auth.`),
-- porque todo login grava trilha e sessao. Tirar outra acao daqui para o diff fechar e proibido.
\set ON_ERROR_STOP on
WITH org AS (SELECT id FROM tenants WHERE slug LIKE :'org_prefixo')
SELECT 'tenants_total', count(*) FROM tenants
UNION ALL SELECT 'users', count(*) FROM users WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'customers', count(*) FROM customers WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'vehicles', count(*) FROM vehicles WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'teams', count(*) FROM teams WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'team_members', count(*) FROM team_members WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'service_catalog', count(*) FROM service_catalog WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'price_tables', count(*) FROM price_tables WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'tariffs', count(*) FROM tariffs WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'jurisdiction_profiles', count(*) FROM jurisdiction_profiles WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'yards', count(*) FROM yards WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'yard_areas', count(*) FROM yard_areas WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'yard_spots', count(*) FROM yard_spots WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'impound_processes', count(*) FROM impound_processes WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'impound_intake_inspections', count(*) FROM impound_intake_inspections WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'custody_events', count(*) FROM custody_events WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'attachments', count(*) FROM attachments WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'process_charges', count(*) FROM process_charges WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'field_operator_locations', count(*) FROM field_operator_locations WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'work_orders', count(*) FROM work_orders WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'work_order_events', count(*) FROM work_order_events WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'financial_accounts', count(*) FROM financial_accounts WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'financial_titles', count(*) FROM financial_titles WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'financial_entries', count(*) FROM financial_entries WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'financial_entries_conciliados', count(*) FROM financial_entries WHERE tenant_id IN (SELECT id FROM org) AND reconciled
UNION ALL SELECT 'tenant_settings', count(*) FROM tenant_settings WHERE tenant_id IN (SELECT id FROM org)
UNION ALL SELECT 'audit_logs_sem_auth', count(*) FROM audit_logs WHERE tenant_id IN (SELECT id FROM org) AND action not like 'auth.%'
ORDER BY 1;
