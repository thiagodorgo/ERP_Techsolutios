-- B-SAN3-12a (§5.1 do plano v3; R2-01) — PROVISIONA no BANCO as duas permissoes novas do web financeiro:
--   `financial_entries:unreconcile` (desfazer conciliacao — decisao do dono 24/10: "admin, mas deve existir a opcao do
--                                     financeiro receber esse privilegio"; a delegacao ao Financeiro e POLITICA da
--                                     organizacao, `finance.unreconcile_delegated_to_finance`, nao concessao de papel);
--   `cheques:unlink_title`          (trocar a vinculacao do cheque ao titulo — "requer privilegios altos").
-- Autorizacao NOMINAL do dono (25/10): "Autorizo (Recomendado)" — migracao de DADOS, aditiva, BEGIN/COMMIT, drill.
--
-- POR QUE MIGRACAO: producao roda so `prisma migrate deploy` (sem `db:seed`); o gate das rotas le `role_permissions`.
-- Sem esta migracao a permissao nasce MORTA no banco (403 para todos, inclusive tenant_admin). O guard
-- `tests/permission-catalog-migration-parity.test.ts` exige isto para toda chave nova do catalogo.
--
-- SEGURANCA: ADITIVA e IDEMPOTENTE (ON CONFLICT DO NOTHING nos dois passos). `roles` sao globais (tenant_id NULL) e
-- `role_permissions` tem UNIQUE (role_id, permission_id). Nenhuma linha e reescrita; rodar duas vezes nao duplica nada.
-- Transacao EXPLICITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA): falha em qualquer sentenca -> nada aplicado; recuperacao =
-- `prisma migrate resolve --rolled-back 20260882000000_grant_finance_unreconcile_and_cheque_unlink_permissions` +
-- `prisma migrate deploy`.
--
-- DISTRIBUICAO: super_admin e tenant_admin. NAO vai para `finance`, `manager` nem `auditor`. `platform_admin` nao existe
-- como role no banco (pseudo-papel de plataforma), por isso nao aparece aqui (molde 20260861000000).
--
-- ROLLBACK (runbook, MANUAL; nesta ordem por causa da FK):
--   DELETE FROM role_permissions rp USING permissions p
--     WHERE rp.permission_id = p.id AND p.key IN ('financial_entries:unreconcile', 'cheques:unlink_title');
--   DELETE FROM permissions WHERE key IN ('financial_entries:unreconcile', 'cheques:unlink_title');

BEGIN;

INSERT INTO permissions (key, description)
VALUES
  ('financial_entries:unreconcile', 'Desfazer a conciliação bancária de um lançamento (delegável ao Financeiro por política da organização).'),
  ('cheques:unlink_title', 'Trocar a vinculação de um cheque ao título, com justificativa e auditoria crítica.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key IN ('financial_entries:unreconcile', 'cheques:unlink_title')
   AND r.key IN ('super_admin', 'tenant_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
