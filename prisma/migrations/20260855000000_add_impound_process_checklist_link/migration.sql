-- Block Ω-VID PR-04 (merge manual + unmerge-admin + vínculo dossiê↔checklist): tabela NOVA
-- "impound_process_checklist_links" — junção EXPLÍCITA (NÃO polimórfica) ligando ChecklistRun (checklist do
-- guincho, mobile) a ImpoundProcess (dossiê de custódia do pátio). A junta de arquitetura original propunha um
-- elo "solto" ("para preservar polimorfismo") — o crítico-adversarial BLOQUEOU essa versão (o vínculo real não é
-- polimórfico: é sempre ChecklistRun→ImpoundProcess) e exigiu FK dura RESTRICT nos dois lados
-- (docs/juntas/J-OMEGA-VID.md §3). Esta migração implementa a versão corrigida.
--
-- ADITIVA / UP-ONLY (C7.5): CREATE TABLE (NOVA) + índices tenant-first + 2 FKs compostas tenant-first RESTRICT
-- (process_id → impound_processes, checklist_run_id → checklist_runs) + CHECK de enum fechado (link_source) +
-- RLS ENABLE+FORCE+POLICY. ZERO ALTER em impound_processes/checklist_runs (só back-relations Prisma,
-- metadata-only). Sem trigger append-only aqui: ao contrário de custody_events/merge_events, um vínculo
-- MANUAL pode legitimamente ser desfeito no futuro (fora de escopo deste PR) — não é trilha probatória de
-- custódia, é só um elo de navegação do dossiê; por isso NÃO copia o padrão block_mutation.
--
-- link_source: CHECK de enum fechado de 2 valores (domínio pequeno/estável — mesmo padrão de
-- third_party_vehicle_identities_confidence_chk/impound_outbox_events_status_chk). AUTO = o sweep de resolução
-- de identidade na criação do processo (PR-05, ainda não implementado) vincula automaticamente; MANUAL = este
-- PR, POST /impound-processes/:id/link-checklist-run (operador vincula manualmente, permissão impound:update
-- REUSADA — decisão da junta de arquitetura: ação reversível/aditiva, diferente do merge de identidade que é
-- irreversível na prática).
--
-- @@unique(tenant_id, process_id, checklist_run_id): impede duplicar o MESMO par (idempotência do sweep futuro
-- e do endpoint manual); não impede múltiplos runs para o mesmo processo nem o mesmo run linkado a processos
-- distintos (a junção é N:N por desenho, mesmo que o produto hoje só use 1:N na prática).
--
-- Rollback (runbook — tabela NOVA; reverter o PR remove tudo sem afetar dado existente):
--   DROP TABLE IF EXISTS "impound_process_checklist_links" CASCADE;
-- (policy, índices e CHECK caem junto da tabela — nenhum outro objeto a desfazer à parte.)

-- CreateTable
CREATE TABLE "impound_process_checklist_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "checklist_run_id" UUID NOT NULL,
    "link_source" TEXT NOT NULL DEFAULT 'AUTO',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "impound_process_checklist_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (tenant_id 1º em todos)
CREATE UNIQUE INDEX "impound_process_checklist_links_tenant_id_process_id_chec_key" ON "impound_process_checklist_links"("tenant_id", "process_id", "checklist_run_id");
CREATE INDEX "impound_process_checklist_links_tenant_id_process_id_idx" ON "impound_process_checklist_links"("tenant_id", "process_id");

-- AddForeignKey (compostas tenant-first; AMBAS RESTRICT — o achado do crítico-adversarial exigia exatamente
-- isso: sem elo polimórfico solto, o vínculo é sempre ChecklistRun↔ImpoundProcess com integridade referencial
-- real dos dois lados).
ALTER TABLE "impound_process_checklist_links" ADD CONSTRAINT "impound_process_checklist_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_process_checklist_links" ADD CONSTRAINT "impound_process_checklist_links_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_process_checklist_links" ADD CONSTRAINT "impound_process_checklist_links_tenant_id_checklist_run_i_fkey" FOREIGN KEY ("tenant_id", "checklist_run_id") REFERENCES "checklist_runs"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK ESTRUTURAL (enum fechado — domínio pequeno/estável, padrão da casa; belt-and-suspenders sobre o
-- validator da APP).
ALTER TABLE "impound_process_checklist_links"
  ADD CONSTRAINT "impound_process_checklist_links_link_source_chk"
  CHECK ("link_source" IN ('AUTO', 'MANUAL'));

-- RLS (clona 20260836000000_add_impound:166-172 / 20260854000000_add_vehicle_identity).
ALTER TABLE "impound_process_checklist_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "impound_process_checklist_links" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "impound_process_checklist_links_tenant_isolation" ON "impound_process_checklist_links";
CREATE POLICY "impound_process_checklist_links_tenant_isolation" ON "impound_process_checklist_links"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
