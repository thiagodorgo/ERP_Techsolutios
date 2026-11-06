-- B-ASS-04 (M3b) — PROVISIONA no BANCO as permissões do demonstrativo mensal:
--   * `platform:billing:settle` (nova) → super_admin (baixa manual, estorno manual, reabrir, cancelar, ajustar, créditos);
--   * `billing:read` (já no catálogo, ÓRFÃ até aqui) → tenant_admin, manager, finance, auditor e support
--     (RBAC_MATRIX.md:50, linha Billing: tenant_admin full, manager read, finance full, auditor read, support-view).
-- AUTORIZADA pela fala do dono de 31/10 ~22:15 ("siga na recomendação de tudo, exceto p14"), que respondeu a P1
-- (autorizar as 7 de esquema e 3 de dados, uma a uma) — plano §3.10 e §12.1 (M3b é uma das 3 de dados).
--
-- POR QUE MIGRAÇÃO: produção roda só `prisma migrate deploy` (sem db:seed); o gate das rotas lê `role_permissions`.
-- Sem esta migração a permissão nasce MORTA no banco. O guard tests/permission-catalog-migration-parity.test.ts
-- exige isto para toda chave nova do catálogo.
--
-- SEGURANÇA: ADITIVA e IDEMPOTENTE (ON CONFLICT DO NOTHING nos três passos). Nenhuma linha é reescrita. Transação
-- EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA). `operator`, `inventory` e `field_technician` NÃO recebem
-- `billing:read` (RBAC_MATRIX.md:50 = none).
--
-- ROLLBACK (runbook, MANUAL; nesta ordem por causa da FK):
--   DELETE FROM role_permissions rp USING permissions p, roles r
--    WHERE rp.permission_id = p.id AND rp.role_id = r.id
--      AND ((p.key = 'platform:billing:settle')
--        OR (p.key = 'billing:read' AND r.key IN ('tenant_admin', 'manager', 'finance', 'auditor', 'support')));
--   DELETE FROM permissions WHERE key = 'platform:billing:settle';

BEGIN;

INSERT INTO permissions (key, description)
VALUES
  ('platform:billing:settle', 'Baixar, estornar, reabrir, cancelar e ajustar demonstrativos de assinatura no Console da Plataforma.'),
  ('billing:read', 'Ver a propria assinatura: plano, uso da franquia e situacao de pagamento.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key = 'platform:billing:settle'
   AND r.key IN ('super_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key = 'billing:read'
   AND r.key IN ('tenant_admin', 'manager', 'finance', 'auditor', 'support')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
