-- Block Ω3F-5 (D-Ω3F-5) — comentário como AGREGADO PRÓPRIO mutável ("work_order_comments") +
-- junção POLIMÓRFICA tag↔alvo ("tag_assignments"). Aditiva pura (CREATE TABLE de ambas). Sem DECIMAL.
-- Timestamptz(6). FKs compostas (tenant_id, X) → (tenant_id, id) TODAS RESTRICT (precedente
-- work_order_financial_items 20260803000000). RLS ENABLE+FORCE+policy tenant_isolation em
-- app.current_tenant_id nas DUAS tabelas.
--
-- work_order_comments: excluir = delete LÓGICO (deleted_at); editar carimba edited_at. FKs
--   (tenant_id, work_order_id) → work_orders e (tenant_id, author_user_id) → users.
-- tag_assignments: @@unique polimórfico (tenant_id, entity_type, entity_id, tag_id) → 409 em duplicata.
--   SEM FK ao alvo polimórfico (integridade app-level). FK (tenant_id, tag_id) → tags RESTRICT.
--   Detach = HARD-delete (DELETE físico da associação).
--
-- Rollback (ordem reversa):
--   ALTER TABLE "tag_assignments" DROP CONSTRAINT IF EXISTS "tag_assignments_tenant_id_tag_id_fkey";
--   ALTER TABLE "tag_assignments" DROP CONSTRAINT IF EXISTS "tag_assignments_tenant_id_fkey";
--   DROP TABLE IF EXISTS "tag_assignments";
--   ALTER TABLE "work_order_comments" DROP CONSTRAINT IF EXISTS "work_order_comments_tenant_id_author_user_id_fkey";
--   ALTER TABLE "work_order_comments" DROP CONSTRAINT IF EXISTS "work_order_comments_tenant_id_work_order_id_fkey";
--   ALTER TABLE "work_order_comments" DROP CONSTRAINT IF EXISTS "work_order_comments_tenant_id_fkey";
--   DROP TABLE IF EXISTS "work_order_comments";

-- =============================== work_order_comments ===============================
CREATE TABLE "work_order_comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "author_user_id" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "edited_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "work_order_comments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_order_comments_tenant_id_id_key" ON "work_order_comments"("tenant_id", "id");
CREATE INDEX "work_order_comments_tenant_id_work_order_id_idx" ON "work_order_comments"("tenant_id", "work_order_id");

ALTER TABLE "work_order_comments"
  ADD CONSTRAINT "work_order_comments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_comments"
  ADD CONSTRAINT "work_order_comments_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_comments"
  ADD CONSTRAINT "work_order_comments_tenant_id_author_user_id_fkey"
  FOREIGN KEY ("tenant_id", "author_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_order_comments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_comments_tenant_isolation" ON "work_order_comments";
CREATE POLICY "work_order_comments_tenant_isolation" ON "work_order_comments"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ================================= tag_assignments =================================
CREATE TABLE "tag_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "tag_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tag_assignments_tenant_id_id_key" ON "tag_assignments"("tenant_id", "id");
-- Chave natural polimórfica (409 duplicate_tag_assignment): uma tag por (entity_type, entity_id).
CREATE UNIQUE INDEX "tag_assignments_tenant_entity_tag_key"
  ON "tag_assignments"("tenant_id", "entity_type", "entity_id", "tag_id");
CREATE INDEX "tag_assignments_tenant_id_entity_type_entity_id_idx"
  ON "tag_assignments"("tenant_id", "entity_type", "entity_id");
CREATE INDEX "tag_assignments_tenant_id_tag_id_idx" ON "tag_assignments"("tenant_id", "tag_id");

ALTER TABLE "tag_assignments"
  ADD CONSTRAINT "tag_assignments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- FK só ao lado da TAG (RESTRICT): remover uma tag em uso é barrado. O ALVO polimórfico não tem FK
-- (integridade app-level valida existência do alvo no attach).
ALTER TABLE "tag_assignments"
  ADD CONSTRAINT "tag_assignments_tenant_id_tag_id_fkey"
  FOREIGN KEY ("tenant_id", "tag_id") REFERENCES "tags"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tag_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tag_assignments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tag_assignments_tenant_isolation" ON "tag_assignments";
CREATE POLICY "tag_assignments_tenant_isolation" ON "tag_assignments"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
