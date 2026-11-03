-- B-PATIO-REC-01 (plano v3 §7 M-REC-7a; emenda 1 §8.6) — PROVISIONA no BANCO a permissão nova `charging:online_payment` (gerar a
-- cobrança on-line da taxa de pátio). Autorização do dono: "Q12 autorizo" (02/11 ~23:50). Texto ao dono: "concede a permissão de
-- gerar cobrança on-line aos papéis que dão baixa".
--
-- POR QUE MIGRAÇÃO: produção roda só `prisma migrate deploy` (sem `db:seed`); o gate da rota lê `role_permissions`. Sem esta migração
-- a permissão nasce MORTA no banco (403 para todos). O guard `tests/permission-catalog-migration-parity.test.ts` exige isto.
--
-- DISTRIBUIÇÃO: a MESMA de `charging:settle` (quem dá baixa é quem cobra): super_admin, tenant_admin e manager. NÃO vai para operator,
-- finance, auditor nem os demais. `platform_admin` não existe como role no banco (pseudo-papel de plataforma; molde 20260882000000).
--
-- SEGURANÇA: ADITIVA e IDEMPOTENTE (ON CONFLICT DO NOTHING nos dois passos). Nenhuma linha é reescrita; rodar duas vezes não duplica.
-- Transação EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA). Drill: tests/rec-01-migration-drill-db.test.ts.

BEGIN;

INSERT INTO permissions (key, description)
VALUES ('charging:online_payment', 'Gerar a cobrança on-line da taxa de pátio (Pix, crédito e débito).')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key = 'charging:online_payment'
   AND r.key IN ('super_admin', 'tenant_admin', 'manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;

-- ROLLBACK (runbook, MANUAL, só em drill; nesta ordem por causa da FK):
--   DELETE FROM role_permissions rp USING permissions p WHERE rp.permission_id = p.id AND p.key = 'charging:online_payment';
--   DELETE FROM permissions WHERE key = 'charging:online_payment';
