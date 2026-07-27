-- Block Ω5P PR-09 (Trilha de notificações legais I6): tabela "process_notifications" — projeção consultável
-- MUTÁVEL do rito administrativo do art. 328 (marco DEVIDO no vencimento → carimbo ISSUED/WAIVED). É a
-- materialização do acumulador de notificações; a PROVA de integridade vive no CustodyEvent NOTIFICATION
-- (append-only, migração 20260836000000), escrito na MESMA tx do INSERT/UPDATE deste projeção.
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva. Só CREATE TABLE nova +
-- back-relation aditiva em impound_processes (metadata-only no Prisma; nenhuma coluna em tabela existente):
--   CREATE TABLE "process_notifications" (NOVA) + índices tenant-first + FK compostas tenant-first RESTRICT (I9)
--   + @@unique(tenant,id) + índice único raw-only de idempotência + CHECK estrutural + RLS ENABLE+FORCE+policy.
--
-- Enums em INGLÊS validados na APP (kind OWNER_INITIAL|COMPLEMENTARY_EDICT|AUCTION_EDICT; status
-- DUE|ISSUED|WAIVED|FAILED; channel POSTAL|SNE|EDICT|IN_PERSON) — SEM CHECK de enum no banco (padrão FASE0 §3.5).
-- Labels PT-BR no DTO. tenant_id 1º em todo índice composto. RLS clona 20260838000000_add_charging:122-134.
--
-- IDEMPOTÊNCIA (D-Ω5P-NOTIF-01) = índice único raw-only (tenant_id, process_id, kind) — no máx. 1 notificação
-- por kind por processo (o sweep nunca dupla-marca; a EMISSÃO muta a MESMA linha via status, não cria linha). É
-- PARCIAL (WHERE "kind" IS NOT NULL, sempre-verdadeiro pois kind é NOT NULL) SÓ para permanecer raw-only —
-- Prisma não modela índices parciais, então não há drift (mesmo mecanismo de yard_spots_current_process_key /
-- process_charges_daily_idem_key). O @@index NÃO-único (tenant,process,kind) do model é a consulta; este é o
-- backstop de unicidade sob corrida (23505 engolido pelo repo, que já serializa por FOR UPDATE do processo).
--
-- CHECK ESTRUTURAL (NÃO enum-CHECK; belt-and-suspenders sobre o validator): status ISSUED ⇒ issued_at E channel
-- NOT NULL. IS NOT NULL EXPLÍCITO (lição PR-07 C1 / lógica-3-valores do Postgres): sem ele, um ISSUED com
-- issued_at/channel NULL passaria (NULL → CHECK não reprova). Espelha IntakeInspection completed⇒completed_by.
--
-- Rollback (runbook — objeto NOVO; reverter o PR remove tudo sem tocar dado existente):
--   DROP TABLE IF EXISTS "process_notifications" CASCADE;
-- (policy, índices, índice único raw-only e CHECK caem junto do DROP TABLE.)

-- CreateTable
CREATE TABLE "process_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DUE',
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "issued_at" TIMESTAMPTZ(6),
    "channel" TEXT,
    "recipient_ref" TEXT,
    "reason" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "process_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "process_notifications_tenant_id_id_key" ON "process_notifications"("tenant_id", "id");
CREATE INDEX "process_notifications_tenant_id_process_id_idx" ON "process_notifications"("tenant_id", "process_id");
CREATE INDEX "process_notifications_tenant_id_process_id_kind_idx" ON "process_notifications"("tenant_id", "process_id", "kind");
CREATE INDEX "process_notifications_tenant_id_status_idx" ON "process_notifications"("tenant_id", "status");

-- Idempotência (D-Ω5P-NOTIF-01): índice único raw-only por (tenant, process, kind) — no máx. 1 notificação por
-- kind por processo. PARCIAL (WHERE kind IS NOT NULL, sempre-verdadeiro) só para permanecer raw-only (Prisma não
-- modela índice parcial ⇒ sem drift). 2ª marcação do MESMO kind → 23505 → engolida sob o lock do processo.
CREATE UNIQUE INDEX "process_notifications_kind_idem_key"
  ON "process_notifications"("tenant_id", "process_id", "kind")
  WHERE "kind" IS NOT NULL;

-- AddForeignKey (compostas tenant-first; TODAS RESTRICT — I9: nada de custódia cascateia)
ALTER TABLE "process_notifications" ADD CONSTRAINT "process_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "process_notifications" ADD CONSTRAINT "process_notifications_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK ESTRUTURAL (NÃO enum-CHECK; belt-and-suspenders sobre o validator). ISSUED exige issued_at E channel
-- (IS NOT NULL EXPLÍCITO — lição PR-07 C1: fecha o furo da lógica-3-valores do Postgres).
ALTER TABLE "process_notifications"
  ADD CONSTRAINT "process_notifications_issued_shape_chk"
  CHECK ("status" <> 'ISSUED' OR ("issued_at" IS NOT NULL AND "channel" IS NOT NULL));

-- RLS por tabela (clona 20260838000000_add_charging:122-134).
ALTER TABLE "process_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_notifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "process_notifications_tenant_isolation" ON "process_notifications";
CREATE POLICY "process_notifications_tenant_isolation" ON "process_notifications"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
