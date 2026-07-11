-- Block Ω-ACESSO (provisionamento dinâmico de módulos por tenant): coluna ADITIVA "modules" em
-- "tenants". Governa a visibilidade dos itens de menu com requiredModules (ex.: field_operations
-- habilita o Mapa Operacional). Antes, o backend devolvia "modules: []" hardcoded (prisma-core-saas.store),
-- então GET /navigation/menu vinha VAZIO para todo tenant real — menu oculto para todos os papéis.
--
--   - "modules" (TEXT[] NOT NULL DEFAULT '{}'): módulos concedidos ao tenant. Vazio = nenhum módulo.
--
-- Aditivo: coluna com default, nenhuma linha existente quebra. Sem RLS/FK/índice (a coluna é lida
-- apenas na resolução do menu, tenant-scoped pelo id). O tenant de demonstração ('demo') é provisionado
-- aqui com o conjunto padrão (idempotente por slug) para o menu funcionar já no deploy; o seed também
-- o define para bases novas.
--
-- Rollback:
--   ALTER TABLE "tenants" DROP COLUMN IF EXISTS "modules";

ALTER TABLE "tenants" ADD COLUMN "modules" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "tenants"
SET "modules" = ARRAY[
  'dashboard', 'work_orders', 'field_operations', 'logistics', 'finance',
  'checklists', 'tenant_checklist', 'notifications', 'users', 'audit'
]
WHERE "slug" = 'demo';
