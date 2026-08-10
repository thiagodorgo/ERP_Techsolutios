-- CHECKLIST P1 PR-03 (achado ALTA UNANIME da junta: dba + acessos + critico) — PROVISIONA a
-- permissao `checklist_runs:reopen` no BANCO.
--
-- PROBLEMA QUE CONSERTA: o gate das rotas (createPersistentRbacContextMiddleware ->
-- PersistentAuthorizationService) resolve permissoes da tabela PERSISTIDA `role_permissions`,
-- nao do catalogo em codigo. O catalogo so chega ao banco por `prisma/seed.ts`, e
-- `deploy-production.yml` roda APENAS `prisma migrate deploy` ("SEM db:seed — producao NUNCA
-- semeia"). Resultado medido na base viva: a rota POST /mobile/checklist-runs/:runId/reopen
-- nascia MORTA, respondendo 403 para TODOS os papeis — inclusive tenant_admin e super_admin.
--
-- AGRAVANTE MEDIDO: o corpo do LOGIN anuncia a permissao (vem do catalogo em codigo) enquanto
-- /me e o middleware nao a tem (vem do banco). A UI habilitaria "Reabrir" e a API responderia
-- 403 — split-brain entre as duas fontes de autorizacao.
--
-- POR QUE PASSOU BATIDO: `tests/checklist-routes.test.ts` forca CORE_SAAS_PERSISTENCE=memory,
-- e em memoria o persistent-rbac faz short-circuit lendo o catalogo em codigo. Nenhum teste
-- comparava PERMISSION_CATALOG com a tabela `permissions`. A blindagem entra neste mesmo PR
-- (tests/permission-catalog-db-parity.test.ts).
--
-- SEGURANCA: ADITIVA e IDEMPOTENTE (ON CONFLICT DO NOTHING nos dois passos). `roles` sao globais
-- (tenant_id NULL) e `role_permissions` tem UNIQUE (role_id, permission_id). Nenhuma linha e
-- reescrita; rodar duas vezes nao duplica nada.
--
-- DISTRIBUICAO (D-CHK-P1-REOPEN-RBAC): super_admin, tenant_admin e manager. NAO vai para
-- `technician`/`field_technician`/`operator` — quem preenche e assina nao pode destravar a
-- propria assinatura. `platform_admin` nao existe como role no banco (e pseudo-papel de
-- plataforma), por isso nao aparece aqui.
--
-- ROLLBACK (runbook): remover os grants e a permissao (nesta ordem, por causa da FK):
--   DELETE FROM role_permissions rp USING permissions p
--     WHERE rp.permission_id = p.id AND p.key = 'checklist_runs:reopen';
--   DELETE FROM permissions WHERE key = 'checklist_runs:reopen';

INSERT INTO permissions (key, description)
VALUES ('checklist_runs:reopen', 'Reabrir vistoria concluída criando uma nova versão vinculada e auditada.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key = 'checklist_runs:reopen'
   AND r.key IN ('super_admin', 'tenant_admin', 'manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;
