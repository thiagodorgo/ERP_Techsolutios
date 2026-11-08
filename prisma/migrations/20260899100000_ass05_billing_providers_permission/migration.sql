-- B-ASS-05 (M4b) — PROVISIONA no BANCO a permissão do cofre e da configuração dos provedores:
--   * `platform:billing-providers:manage` (nova) → super_admin (configurar provedor, gravar credencial, rotacionar a
--     chave do cofre). Plano §3.7: "idem" às de billing (catálogo integral de plataforma).
-- AUTORIZADA pela fala do dono de 31/10 ~22:15 ("siga na recomendação de tudo, exceto p14"), que respondeu a P1
-- (autorizar as 7 de esquema e 3 de dados, uma a uma) — plano §3.10 e §12.1 (M4b é uma das 3 de dados).
--
-- POR QUE MIGRAÇÃO: produção roda só `prisma migrate deploy` (sem db:seed); o gate das rotas lê `role_permissions`.
-- Sem esta migração a permissão nasce MORTA no banco. O guard tests/permission-catalog-migration-parity.test.ts
-- exige isto para toda chave nova do catálogo.
--
-- SEGURANÇA: ADITIVA e IDEMPOTENTE (ON CONFLICT DO NOTHING). Nenhuma linha é reescrita. Transação EXPLÍCITA
-- (D-MIGRACAO-COM-TRANSACAO-EXPLICITA). Nenhum papel de organização recebe a chave.
--
-- ROLLBACK (runbook, MANUAL; nesta ordem por causa da FK):
--   DELETE FROM role_permissions rp USING permissions p
--    WHERE rp.permission_id = p.id AND p.key = 'platform:billing-providers:manage';
--   DELETE FROM permissions WHERE key = 'platform:billing-providers:manage';

BEGIN;

INSERT INTO permissions (key, description)
VALUES
  ('platform:billing-providers:manage', 'Configurar os provedores de pagamento e nota e guardar as credenciais deles no cofre, no Console da Plataforma.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key = 'platform:billing-providers:manage'
   AND r.key IN ('super_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
