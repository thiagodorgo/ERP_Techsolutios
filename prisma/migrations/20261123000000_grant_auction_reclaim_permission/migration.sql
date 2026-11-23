-- B-PATIO-LEILAO-DIARIAS (F11) — provisiona `auction:reclaim` no banco (RBAC persistido).
--
-- Problema que corrige: o gate persistente usa `role_permissions`; sem migração de dados, a rota
-- de resgate responde 403 para todos os papéis em produção (deploy roda `prisma migrate deploy`,
-- sem `db:seed`).
--
-- Segurança: aditiva e idempotente (ON CONFLICT nos dois passos).
-- Distribuição deliberada: super_admin, tenant_admin e manager. `platform_admin` segue pseudo-perfil
-- resolvido pela sessão (não existe linha em `roles`).
--
-- ROLLBACK (manual):
--   DELETE FROM role_permissions rp USING permissions p
--     WHERE rp.permission_id = p.id AND p.key = 'auction:reclaim';
--   DELETE FROM permissions WHERE key = 'auction:reclaim';

BEGIN;

INSERT INTO permissions (key, description)
VALUES ('auction:reclaim', 'Resgatar antes da venda um processo em lote (LOTTED -> ACTIVE_CUSTODY), com fundamento registrado.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key = 'auction:reclaim'
   AND r.key IN ('super_admin', 'tenant_admin', 'manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
