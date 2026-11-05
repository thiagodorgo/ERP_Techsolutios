-- B-ASS-02 (M1b) — PROVISIONA no BANCO as permissões de plataforma do billing: platform:billing:read/manage.
-- AUTORIZADA pela fala do dono de 31/10 ~22:15 (siga na recomendação de tudo, exceto p14), que respondeu a P1
-- (autorizar as 7 de esquema e 3 de dados, uma a uma) — §3.10 e §12.1 do plano.
--
-- POR QUE MIGRAÇÃO: produção roda só prisma migrate deploy (sem db:seed); o gate das rotas lê role_permissions.
-- Sem esta migração a permissão nasce MORTA no banco (403 para todos). O guard
-- tests/permission-catalog-migration-parity.test.ts exige isto para toda chave nova do catálogo.
--
-- SEGURANÇA: ADITIVA e IDEMPOTENTE (ON CONFLICT DO NOTHING nos dois passos). Nenhuma linha é reescrita.
-- Transação EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA). Concede a super_admin (único papel de plataforma
-- semeado; platform_admin é legado e não nasce no seed) — §12.1 M1b.
--
-- ROLLBACK (runbook, MANUAL; nesta ordem por causa da FK):
--   DELETE FROM role_permissions rp USING permissions p WHERE rp.permission_id = p.id
--     AND p.key IN ('platform:billing:read', 'platform:billing:manage');
--   DELETE FROM permissions WHERE key IN ('platform:billing:read', 'platform:billing:manage');

BEGIN;

INSERT INTO permissions (key, description)
VALUES
  ('platform:billing:read', 'Consultar planos, versoes e assinaturas de cobranca no Console da Plataforma.'),
  ('platform:billing:manage', 'Criar e editar planos, versoes e assinaturas de cobranca no Console da Plataforma.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key IN ('platform:billing:read', 'platform:billing:manage')
   AND r.key IN ('super_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
