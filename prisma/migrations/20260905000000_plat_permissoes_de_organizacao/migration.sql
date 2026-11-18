-- B-PLAT-PERMISSAO (item 72 do portão) — PROVISIONA no BANCO as 6 permissões de plataforma que as rotas e as telas
-- já pediam e que não estavam no catálogo:
--   * `platform:tenants:create`, `platform:tenants:update`, `platform:tenants:suspend` (criar, editar e suspender
--     organização), `platform:modules:manage` (ligar módulos), `platform:users:create_admin` (criar o administrador da
--     organização) e `platform:health:read` (as telas de saúde da plataforma)  →  SÓ super_admin.
-- AUTORIZADA pelo dono em 17/11, pelo canal do artefato (pergunta `d72-p1` = "sim", `D-DONO-1711-72-P1`): a migração em
-- `prisma/` das 6 chaves, concedidas só ao `super_admin`. `platform_admin` não tem linha em `roles` (pseudo-papel, fora
-- do seed e do provisionamento) e recebe as 6 pelo catálogo em código, como já recebe o resto.
--
-- POR QUE MIGRAÇÃO: o portão das rotas da plataforma passa a conferir a permissão pedida no catálogo; sem as 6 chaves o
-- `super_admin` perderia 5 rotas de produto. Produção roda só `prisma migrate deploy` (sem db:seed), e o guard
-- tests/permission-catalog-migration-parity.test.ts exige uma migração de dados para toda chave nova do catálogo.
--
-- SEGURANÇA: ADITIVA e IDEMPOTENTE (ON CONFLICT DO NOTHING nos dois passos). Nenhuma linha é reescrita; nenhuma DDL.
-- Transação EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA); drill por prefixo em
-- tests/plat-perm-migration-drill-db.test.ts.
--
-- ROLLBACK (runbook, MANUAL; nesta ordem por causa da FK):
--   DELETE FROM role_permissions rp USING permissions p
--    WHERE rp.permission_id = p.id
--      AND p.key IN ('platform:tenants:create', 'platform:tenants:update', 'platform:tenants:suspend', 'platform:modules:manage', 'platform:users:create_admin', 'platform:health:read');
--   DELETE FROM permissions WHERE key IN ('platform:tenants:create', 'platform:tenants:update', 'platform:tenants:suspend', 'platform:modules:manage', 'platform:users:create_admin', 'platform:health:read');

BEGIN;

INSERT INTO permissions (key, description)
VALUES
  ('platform:tenants:create', 'Criar organizacao no Console da Plataforma.'),
  ('platform:tenants:update', 'Editar os dados de uma organizacao no Console da Plataforma.'),
  ('platform:tenants:suspend', 'Suspender ou reativar uma organizacao no Console da Plataforma.'),
  ('platform:modules:manage', 'Ligar e desligar os modulos de uma organizacao no Console da Plataforma.'),
  ('platform:users:create_admin', 'Criar o administrador de uma organizacao no Console da Plataforma.'),
  ('platform:health:read', 'Ver a saude da plataforma no Console da Plataforma.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key IN ('platform:tenants:create', 'platform:tenants:update', 'platform:tenants:suspend', 'platform:modules:manage', 'platform:users:create_admin', 'platform:health:read')
   AND r.key IN ('super_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
