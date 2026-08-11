-- CHECKLIST P1 PR-04a (D-CHK-P1-APPLICABILITY) — REGRA DE APLICABILIDADE de modelo de vistoria.
--
-- O QUE RESOLVE: hoje a ordem de serviço aponta UM modelo (`work_orders.checklist_id`) escolhido à mão.
-- A decisão do dono quer que o sistema RESOLVA qual vistoria se aplica, por serviço concreto, por tipo de
-- serviço, por cliente e por FASE (coleta/entrega/genérico) — "vai depender do tipo do serviço ou exigência
-- do cliente".
--
-- NASCE INERTE: nada consome esta tabela nesta migração. A criação de OS, o despacho e o `available` do
-- aplicativo ficam byte-idênticos. O consumidor (vínculo N:N + sticky na criação) é a PR-04b — mesmo padrão
-- com que `resolveTariff` nasceu inerte no Ω5P PR-03 e só ganhou consumidor no charging.
--
-- ADITIVA E NÃO-DESTRUTIVA: tabela nova; `work_orders.checklist_id`/`checklist_snapshot` intactos.

-- CreateTable
CREATE TABLE "checklist_applicability_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    -- EIXO DE SERVIÇO, mutuamente exclusivo (CHECK abaixo): serviço CONCRETO do catálogo OU tipo de serviço
    -- (soft-enum configurável por organização — sem CHECK de valores, paridade com `service_catalog.service_type`).
    -- Ambos NULL = regra curinga daquele eixo.
    "service_catalog_id" UUID,
    "service_type" TEXT,
    -- EIXO DE CLIENTE: NULL = vale para qualquer cliente.
    "customer_id" UUID,
    -- FASE da vistoria. `custody_yard` NÃO entra aqui: a decisão do dono deixa em aberto se a custódia de
    -- pátio é um valor de `role` ou um discriminador próprio, e reservar o valor agora congelaria a escolha
    -- do eixo antes da decisão (achado A10 do critico-adversarial). Estender o CHECK depois é aditivo e
    -- barato — precedente 20260858000000/20260859000000.
    "role" TEXT NOT NULL DEFAULT 'generic',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    -- Por que a regra existe (o contrato do cliente, a exigência do órgão). Texto livre do administrador.
    "notes" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "checklist_applicability_rules_pkey" PRIMARY KEY ("id")
);

-- DETERMINISMO, PARTE 1 — "um modelo ativo por bucket".
--
-- O bucket é (serviço × tipo × cliente × fase). `NULLS NOT DISTINCT` é ESSENCIAL e é o oposto do que o índice
-- de reabertura de vistoria faz: lá (checklist_runs.reopened_from_run_id) NULLs PRECISAM ser distintos, senão
-- todas as vistorias normais colidiriam entre si. Aqui NULL é um VALOR de negócio — "vale para qualquer
-- cliente" — e duas regras curinga para o mesmo bucket são exatamente a ambiguidade que este índice existe
-- para tornar impossível. Com NULLs distintos (o padrão), N regras curinga conviveriam e o desempate cairia
-- todo no JS: rede furada.
--
-- PARCIAL (`WHERE is_active AND deleted_at IS NULL`): regra desativada ou apagada sai do caminho e libera o
-- bucket, sem precisar apagar linha (histórico preservado).
--
-- SQL BRUTO: o Prisma não expressa nem `NULLS NOT DISTINCT` nem índice parcial — precedente na casa em
-- 20260611000000_add_cloud_usage_metering (índice parcial com o nome default do Prisma).
CREATE UNIQUE INDEX "checklist_applicability_rules_bucket_key"
  ON "checklist_applicability_rules" ("tenant_id", "service_catalog_id", "service_type", "customer_id", "role")
  NULLS NOT DISTINCT
  WHERE "is_active" AND "deleted_at" IS NULL;

CREATE INDEX "checklist_applicability_rules_tenant_id_idx" ON "checklist_applicability_rules"("tenant_id");
CREATE INDEX "checklist_applicability_rules_tenant_id_template_id_idx" ON "checklist_applicability_rules"("tenant_id", "template_id");

-- FKs compostas tenant-first: a referência cruzada de organização é estruturalmente impossível, não só
-- barrada por filtro de aplicação. RESTRICT em todas: apagar um modelo/cliente/serviço com regra viva é
-- erro de integridade, não cascata silenciosa que muda qual vistoria o guincheiro preenche.
ALTER TABLE "checklist_applicability_rules" ADD CONSTRAINT "checklist_applicability_rules_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checklist_applicability_rules" ADD CONSTRAINT "checklist_applicability_rules_tenant_id_template_id_fkey"
  FOREIGN KEY ("tenant_id", "template_id") REFERENCES "checklist_templates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checklist_applicability_rules" ADD CONSTRAINT "checklist_applicability_rules_tenant_id_service_catalog_i_fkey"
  FOREIGN KEY ("tenant_id", "service_catalog_id") REFERENCES "service_catalog"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checklist_applicability_rules" ADD CONSTRAINT "checklist_applicability_rules_tenant_id_customer_id_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DETERMINISMO, PARTE 2 — os dois eixos de serviço são MUTUAMENTE EXCLUSIVOS.
-- `<= 1` (e não `= 1`) por desenho: ambos NULL é a regra curinga de serviço, que a decisão do dono prevê
-- ("serviço concreto > tipo > any(NULL)").
ALTER TABLE "checklist_applicability_rules"
  ADD CONSTRAINT "checklist_applicability_rules_service_axis_chk"
  CHECK (num_nonnulls("service_catalog_id", "service_type") <= 1);

ALTER TABLE "checklist_applicability_rules"
  ADD CONSTRAINT "checklist_applicability_rules_role_chk"
  CHECK ("role" IN ('collection', 'delivery', 'generic'));

-- `service_type` vazio não é curinga nem valor: seria um terceiro estado invisível que casa nada e parece
-- configurado.
ALTER TABLE "checklist_applicability_rules"
  ADD CONSTRAINT "checklist_applicability_rules_service_type_not_blank_chk"
  CHECK ("service_type" IS NULL OR length(btrim("service_type")) > 0);

-- RLS (clona o padrão de 20260855000000_add_impound_process_checklist_links).
ALTER TABLE "checklist_applicability_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_applicability_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_applicability_rules_tenant_isolation" ON "checklist_applicability_rules";
CREATE POLICY "checklist_applicability_rules_tenant_isolation" ON "checklist_applicability_rules"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
