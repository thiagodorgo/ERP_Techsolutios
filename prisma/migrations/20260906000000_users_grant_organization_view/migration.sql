-- B-USERS-CONCESSAO-PAINEL — PROVISIONA no BANCO a permissao `users:grant_organization_view` (conceder e retirar so o papel
-- `organization_view`, a "Visao da organizacao"), concedida a super_admin, tenant_admin e manager.
-- AUTORIZADA pelo dono em 18/11 10:27 (`D-DONO-1811-MIGRACAO-CONCEDE-PAINEL`): so inclui a chave; nada apagado.
-- POR QUE MIGRACAO: producao roda so `prisma migrate deploy` (sem db:seed), e o guard
-- tests/permission-catalog-migration-parity.test.ts exige migracao de dados para toda chave nova do catalogo.
-- O PAPEL `organization_view` NAO nasce aqui: nenhuma migracao insere em `roles`; ele nasce no
-- `npm run db:provision-rbac` do deploy, depois do migrate e antes do app. Sem o papel, a rota responde 503 role_not_provisioned.
-- `platform_admin` nao tem linha em `roles` e recebe a chave pelo catalogo em codigo.
-- SEGURANCA: ADITIVA e IDEMPOTENTE (ON CONFLICT DO NOTHING nos dois passos). Nenhuma linha reescrita; nenhuma DDL.
-- Transacao EXPLICITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA).
-- ROLLBACK (runbook, MANUAL; nesta ordem por causa da FK; nao desmarca `_prisma_migrations` — reaplicar = migracao nova):
--   DELETE FROM user_role_assignments ura USING roles r WHERE ura.role_id = r.id AND r.key = 'organization_view';
--   DELETE FROM role_permissions rp USING permissions p WHERE rp.permission_id = p.id AND p.key = 'users:grant_organization_view';
--   DELETE FROM permissions WHERE key = 'users:grant_organization_view';
-- (o 1o DELETE so e necessario se o rollback do CODIGO tambem acontecer: sem a rota, quem tem o papel segue lendo a organizacao.)
-- Conferencia de 1 linha:
--   SELECT r.key FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
--    WHERE p.key = 'users:grant_organization_view';   -- espera-se manager, super_admin, tenant_admin

BEGIN;

INSERT INTO permissions (key, description)
VALUES ('users:grant_organization_view', 'Conceder e retirar a Visao da organizacao de um usuario da propria organizacao.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key = 'users:grant_organization_view'
   AND r.key IN ('super_admin', 'tenant_admin', 'manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;