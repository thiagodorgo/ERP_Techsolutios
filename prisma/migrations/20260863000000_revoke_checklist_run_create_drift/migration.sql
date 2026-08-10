-- CHECKLIST P1 PR-03 (2ª rodada da junta) — RECONCILIAÇÃO DE RETIRADA (a direção que faltava).
--
-- O QUE: remove `checklist_runs:create` dos papéis GLOBAIS `manager` e `technician`.
--
-- POR QUÊ: a decisão D-CHK-DISPATCH-CREATE (PR-A, #320) tirou a criação de vistoria desses papéis no
-- CATÁLOGO — o despacho cria a run como efeito de domínio; manager/technician não criam direto. Mas
-- nenhuma migração entregou o DELETE, e em `CORE_SAAS_PERSISTENCE=prisma` quem manda é a TABELA:
-- os dois papéis continuavam PODENDO o que o código diz que eles não podem. O guard bidirecional
-- (tests/permission-catalog-db-parity.test.ts) passou a acusar exatamente esta deriva.
--
-- ESCOPO: SÓ papéis globais (tenant_id IS NULL). Papéis por organização de mesmo nome podem ter o
-- grant LEGITIMAMENTE (o provisionamento de demonstração concede o conjunto do papel; um administrador
-- da organização pode conceder o que quiser) — retirar deles seria mexer no que é do cliente.
--
-- NOTA sobre as migrações 20260861000000/20260862000000: elas concedem por `r.key IN (...)` SEM o
-- filtro de escopo. NÃO foram editadas — migração aplicada é imutável (checksum em _prisma_migrations).
-- Exposição analisada: numa base NOVA elas rodam antes de existir qualquer organização (nenhum papel
-- de organização para receber grant indevido); na base de desenvolvimento os papéis por organização
-- já recebem o conjunto inteiro do provisionamento de demonstração. Toda migração de dados FUTURA
-- segue o padrão deste arquivo: sempre `tenant_id IS NULL`.
--
-- Idempotente: DELETE de linha ausente é no-op.

DELETE FROM role_permissions rp
 USING roles r, permissions p
 WHERE rp.role_id = r.id
   AND rp.permission_id = p.id
   AND r.tenant_id IS NULL
   AND r.key IN ('manager', 'technician')
   AND p.key = 'checklist_runs:create';
