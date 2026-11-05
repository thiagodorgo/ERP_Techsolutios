-- B-ASS-02 (M1-d) — catálogo inicial de quatro planos-base e dois add-ons de rastreamento.
-- AUTORIZADA pela fala literal do dono em 05/11 ~02:00 SP: "manda o deepsek fazer".
-- ADITIVA e idempotente: cria somente os códigos ausentes, sem versão e sem preço. Não altera nem
-- remove plano preexistente. `created_by = NULL` identifica o ato de migração; a primeira leitura
-- registra `plans.bootstrapped_by_migration` na trilha de plataforma.
-- Transação explícita exigida por D-MIGRACAO-COM-TRANSACAO-EXPLICITA.

BEGIN;

INSERT INTO subscription_plans (id, code, kind, name, description, active, created_by)
VALUES
  (gen_random_uuid(), 'starter', 'base', 'Starter',
   'Core, cadastros, ordens de servico, painel basico, financeiro basico e relatorios basicos.', true, NULL),
  (gen_random_uuid(), 'professional', 'base', 'Professional',
   'Mobile, estoque, frota, checklists, orcamento, faturamento e alertas.', true, NULL),
  (gen_random_uuid(), 'business', 'base', 'Business',
   'Estoque por viatura, manutencao, multas, remuneracoes, pre-faturamento e integracoes.', true, NULL),
  (gen_random_uuid(), 'enterprise', 'base', 'Enterprise',
   'IA, SSO, auditoria avancada, BI, isolamento premium, regras complexas e ESG.', true, NULL),
  (gen_random_uuid(), 'tracking_basic', 'addon_tracking', 'Rastreamento Basico',
   'Add-on de rastreamento com posicao.', true, NULL),
  (gen_random_uuid(), 'tracking_plus', 'addon_tracking', 'Rastreamento Plus',
   'Add-on de rastreamento com eventos e telemetria.', true, NULL)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- Rollback MANUAL, somente para ambiente sem dado real:
-- DELETE FROM subscription_plans AS p
--  WHERE p.code IN ('starter','professional','business','enterprise','tracking_basic','tracking_plus')
--    AND NOT EXISTS (SELECT 1 FROM subscription_plan_versions AS v WHERE v.plan_id = p.id);
-- DELETE FROM "_prisma_migrations"
--  WHERE migration_name = '20260895000000_ass02_seed_subscription_plans';
