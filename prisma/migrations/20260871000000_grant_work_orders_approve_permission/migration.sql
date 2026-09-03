-- B-O6R-07a (achado Ω6R-SEC-002, P0 — EMENDA E1 do plano, E3.1) — PROVISIONA a permissao
-- `work_orders:approve` no BANCO.
--
-- PROBLEMA QUE CONSERTA: o gate das rotas (createPersistentRbacContextMiddleware ->
-- PersistentAuthorizationService) resolve permissoes da tabela PERSISTIDA `role_permissions`,
-- nao do catalogo em codigo. O catalogo so chega ao banco por `prisma/seed.ts`, e
-- `deploy-production.yml` roda APENAS `prisma migrate deploy` ("SEM db:seed — producao NUNCA
-- semeia"). Sem esta migracao, as rotas POST /approvals/:id/approve e /reject — que neste mesmo
-- PR passam de `work_orders:update` para `work_orders:approve` — nasceriam MORTAS no banco,
-- respondendo 403 para TODOS os papeis, inclusive tenant_admin e super_admin.
--
-- AGRAVANTE (mesma familia de `checklist_runs:reopen`, migracao 20260861000000): o corpo do LOGIN
-- anuncia a permissao (vem do catalogo em codigo) enquanto /me e o middleware nao a tem (vem do
-- banco). A UI habilitaria "Aprovar"/"Reprovar" e a API responderia 403 — split-brain entre as
-- duas fontes de autorizacao.
--
-- POR QUE E NECESSARIA AGORA: `tests/permission-catalog-migration-parity.test.ts` (guard estatico,
-- sem banco) reprova toda chave nova do catalogo que nao tenha migracao de dados no MESMO PR, e a
-- valvula de isencao `PERMISSOES_HERDADAS_DO_SEED` esta congelada em 189 chaves (nao cresce).
-- `tests/permission-catalog-db-parity.test.ts` cobre a mesma fronteira COM banco provisionado.
--
-- SEGURANCA: ADITIVA e IDEMPOTENTE (ON CONFLICT DO NOTHING nos dois passos). `roles` globais tem
-- `tenant_id NULL` e `role_permissions` tem UNIQUE (role_id, permission_id). Nenhuma linha e
-- reescrita; rodar duas vezes nao duplica nada.
--
-- DISTRIBUICAO: super_admin, tenant_admin e manager. NAO vai para `technician`/`field_technician`/
-- `operator` — quem executa a OS nao decide a propria aprovacao (a Segregacao de Funcoes do mesmo
-- bloco fecha a autoaprovacao; esta permissao fecha o "quem pode decidir"). `platform_admin` NAO
-- existe como role no banco (e pseudo-papel de plataforma, e nenhuma migracao insere em `roles`),
-- por isso nao aparece aqui; no catalogo em CODIGO ele herda a permissao normalmente.
--
-- ROLLBACK (runbook): remover os grants e a permissao (nesta ordem, por causa da FK):
--   DELETE FROM role_permissions rp USING permissions p
--     WHERE rp.permission_id = p.id AND p.key = 'work_orders:approve';
--   DELETE FROM permissions WHERE key = 'work_orders:approve';
--
-- AVISO 1 SOBRE O ROLLBACK ACIMA (achado C3-A4 da junta do ciclo 1) — o DOWN desfaz os DADOS, mas
-- NAO desmarca a migracao em `_prisma_migrations`. Depois de rodar esses dois DELETE, o Prisma
-- continua considerando `20260871000000` APLICADA, e `prisma migrate deploy` NAO a reaplica: o
-- banco fica sem a permissao e sem ninguem para reconceder. Reaplicar exige uma das duas coisas,
-- conscientemente:
--   (a) rodar o corpo desta migracao a mao (ele e idempotente: ON CONFLICT DO NOTHING nos 2 passos); ou
--   (b) criar uma migracao NOVA com o mesmo corpo (caminho recomendado em producao, porque deixa
--       rastro no historico em vez de divergir o banco do que `_prisma_migrations` afirma).
-- Nao existe caminho automatico: `prisma migrate resolve --rolled-back` mexe no registro mas nao
-- reexecuta, e apagar a linha de `_prisma_migrations` a mao e drift silencioso.
--
-- AVISO 2 SOBRE O SEGUNDO INSERT (achado C3-A5 da junta do ciclo 1) — o grant depende de `roles`
-- JA estar populada. Num banco criado so por `prisma migrate deploy`, sem bootstrap/seed, a tabela
-- `roles` esta VAZIA: o `CROSS JOIN` nao encontra nenhuma das tres chaves, o segundo INSERT insere
-- **0 linhas** e a migracao termina com `ec=0` — sucesso aparente, permissao concedida a ninguem.
-- Isso NAO e um defeito desta migracao (ela e aditiva e idempotente por desenho, e reexecutar
-- depois do seed concede corretamente); e uma DEPENDENCIA DE ORDEM que o runbook precisa declarar:
-- em ambiente novo, o seed/bootstrap de papeis roda ANTES, ou este corpo e reexecutado DEPOIS.
-- Verificacao de 1 linha para o operador conferir que o grant pegou de verdade:
--   SELECT r.key FROM role_permissions rp
--     JOIN roles r ON r.id = rp.role_id
--     JOIN permissions p ON p.id = rp.permission_id
--    WHERE p.key = 'work_orders:approve';   -- espera-se super_admin, tenant_admin, manager

INSERT INTO permissions (key, description)
VALUES ('work_orders:approve', 'Decidir (aprovar ou reprovar) uma solicitação de aprovação operacional da OS.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN permissions p
 WHERE p.key = 'work_orders:approve'
   AND r.key IN ('super_admin', 'tenant_admin', 'manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;
