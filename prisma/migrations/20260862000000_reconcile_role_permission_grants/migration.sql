-- CHECKLIST P1 PR-03 — RECONCILIA grants que o catalogo em codigo declara ha tempo mas que NUNCA
-- foram persistidos em `role_permissions`. Achado do guard de paridade criado neste mesmo PR
-- (tests/permission-catalog-db-parity.test.ts), que nasceu do achado ALTA da junta.
--
-- O CASO MAIS GRAVE: `field_technician` — o usuario CENTRAL do produto — estava sem NENHUMA
-- permissao de checklist no banco. Medido na base viva, autenticado como tecnico.demo:
--   GET /api/v1/mobile/checklists/available  ->  HTTP 403
--   GET /api/v1/me   ->  permissoes de checklist: (NENHUMA)
--   POST /auth/login ->  anuncia checklist_runs:read/update/complete/acknowledge
-- Split-brain: o login (que le o CATALOGO) promete; o gate das rotas (que le o BANCO) recusa.
-- Em modo prisma o tecnico de campo nao conseguia nem LISTAR os checklists para preencher.
--
-- CAUSA: `field_technician` e `technician` sao papeis DISTINTOS (ambos existem no banco e no
-- catalogo). Os grants de checklist estavam so em `technician`.
--
-- ESTA MIGRACAO NAO CONCEDE NADA NOVO: apenas persiste o que o catalogo ja declara. E aditiva e
-- idempotente (ON CONFLICT DO NOTHING); rodar duas vezes nao duplica.
--
-- ROLLBACK (runbook): remover exatamente estes grants —
--   DELETE FROM role_permissions rp USING roles r, permissions p
--    WHERE rp.role_id = r.id AND rp.permission_id = p.id
--      AND ((r.key = 'field_technician' AND p.key LIKE 'checklist_runs:%')
--        OR (r.key IN ('operator','field_technician','auditor') AND p.key IN ('impound:read','charging:read')));
--   ATENCAO: reverter devolve o tecnico de campo ao estado quebrado (403 no app).

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.key IN (
    'checklist_runs:read',
    'checklist_runs:update',
    'checklist_runs:complete',
    'checklist_runs:acknowledge'
  )
 WHERE r.key = 'field_technician'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.key IN ('impound:read', 'charging:read')
 WHERE r.key IN ('operator', 'field_technician', 'auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
