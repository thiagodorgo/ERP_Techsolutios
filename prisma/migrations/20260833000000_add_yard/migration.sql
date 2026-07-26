-- Block Ω5P PR-01 (Pátios de recolhimento): tabelas "yards", "yard_areas", "yard_spots" — o domínio FÍSICO
-- do centro de custódia (Res. CONTRAN 1025/2026 art. 9º/14: o "local de guarda" com informações
-- permanentemente atualizadas). Net-new: Branch é organizacional, não físico (FASE0 §3-Alvo3). A VAGA
-- (yard_spots) é a unidade de ocupação do invariante I1 (1-para-1 vaga×processo).
--
-- ADITIVA / UP-ONLY (C7.5): CREATE TABLE + índices + FK compostas tenant-first + RLS das 3 tabelas novas,
-- MAIS um único toque ADITIVO em tabela existente — o índice UNIQUE "branches_tenant_id_id_key" que
-- HABILITA a FK composta yards→branches(tenant_id, id) (mesma razão do users.@@unique([tenant_id, id])).
-- NENHUMA coluna nova, ALTER de coluna ou DROP em objeto existente. Enums em INGLÊS validados na APP
-- (kind BLOCK|CORRIDOR|ROW; vehicle_class ANY|MOTORCYCLE|HEAVY; status FREE|OCCUPIED|BLOCKED) — SEM CHECK
-- de enum no banco (padrão FASE0 §3.5). Labels PT-BR na fronteira do DTO. Sem dinheiro/km nesta fatia.
-- timezone (default America/Sao_Paulo) é fundação DST-safe do motor de diárias (charging PR-07 lê daqui).
--
-- I1 (1-para-1 vaga×processo) tem DUAS metades, cada uma com garantia de banco distinta (belt-and-suspenders):
--   I1b "um processo ≤ 1 vaga"  => índice PARCIAL único (tenant_id, current_process_id) WHERE NOT NULL
--       (precedente vivo: attachments_idem_key 20260821000000:43-45). Raw-only (não declarado no Prisma model,
--       como todos os partial-unique da casa). 2ª tentativa de estacionar o mesmo processId numa vaga distinta
--       viola o índice no commit -> a app traduz para 409 PROCESS_ALREADY_PARKED.
--   I1a "uma vaga ≤ 1 processo"  => lock de linha (SELECT ... FOR UPDATE) + guarda de status='FREE' na MESMA
--       transação (yard.service.ts / OccupancyService). O CHECK de coerência status⇄current_process_id abaixo
--       é o invariante ESTRUTURAL (não enum-CHECK): OCCUPIED sse-e-somente-se há processo.
--
-- current_process_id: SEM FK dura em PR-01 (ImpoundProcess = PR-05; wire real = PR-06). Integridade referencial
-- do processo fica app-level até lá (mesma disciplina de attachments.entity_id / financial_titles.source_id).
--
-- RLS ENABLE+FORCE+policy (USING + WITH CHECK em app.current_tenant_id) obrigatória nas 3 tabelas — clonada de
-- 20260831000000_add_telemetry_events:75-80. tenant_id 1º em todo índice composto.
--
-- Rollback (runbook — tabelas NOVAS + 1 índice aditivo; reverter o PR remove tudo sem afetar dado existente):
--   DROP TABLE IF EXISTS "yard_spots", "yard_areas", "yards" CASCADE;
--   DROP INDEX IF EXISTS "branches_tenant_id_id_key";
-- (policies, índices, partial-unique e CHECK caem junto das tabelas; o índice de branches é o único a desfazer
-- à parte, e branches segue intocada no restante.)

-- Índice ADITIVO em tabela existente (habilita a FK composta yards→branches). branches_tenant_id_code_key e
-- branches_tenant_id_idx seguem vivos; nenhuma coluna/constraint existente é tocada.
CREATE UNIQUE INDEX "branches_tenant_id_id_key" ON "branches"("tenant_id", "id");

-- CreateTable
CREATE TABLE "yards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "capacity_hint" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "yards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yard_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "yard_id" UUID NOT NULL,
    "parent_id" UUID,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "covered" BOOLEAN NOT NULL DEFAULT false,
    "vehicle_class" TEXT NOT NULL DEFAULT 'ANY',
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "yard_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yard_spots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "covered" BOOLEAN NOT NULL DEFAULT false,
    "vehicle_class" TEXT NOT NULL DEFAULT 'ANY',
    "status" TEXT NOT NULL DEFAULT 'FREE',
    "current_process_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "yard_spots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "yards_tenant_id_idx" ON "yards"("tenant_id");
CREATE INDEX "yards_tenant_id_active_idx" ON "yards"("tenant_id", "active");
CREATE INDEX "yards_tenant_id_branch_id_idx" ON "yards"("tenant_id", "branch_id");
CREATE UNIQUE INDEX "yards_tenant_id_id_key" ON "yards"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "yard_areas_tenant_id_yard_id_idx" ON "yard_areas"("tenant_id", "yard_id");
CREATE INDEX "yard_areas_tenant_id_parent_id_idx" ON "yard_areas"("tenant_id", "parent_id");
CREATE UNIQUE INDEX "yard_areas_tenant_id_id_key" ON "yard_areas"("tenant_id", "id");
-- Natural-key soft: NULLs distintos no Postgres (2 BLOCKs de topo homônimos NÃO colidem) — unicidade de nome
-- no topo fica no guard app-level do validator (D-Ω5P-YARD-04).
CREATE UNIQUE INDEX "yard_areas_tenant_id_yard_id_parent_id_name_key" ON "yard_areas"("tenant_id", "yard_id", "parent_id", "name");

-- CreateIndex
CREATE INDEX "yard_spots_tenant_id_status_idx" ON "yard_spots"("tenant_id", "status");
CREATE INDEX "yard_spots_tenant_id_area_id_idx" ON "yard_spots"("tenant_id", "area_id");
CREATE UNIQUE INDEX "yard_spots_tenant_id_id_key" ON "yard_spots"("tenant_id", "id");
CREATE UNIQUE INDEX "yard_spots_tenant_id_area_id_code_key" ON "yard_spots"("tenant_id", "area_id", "code");

-- AddForeignKey (compostas tenant-first: tenant->RESTRICT; branch->RESTRICT; yard->CASCADE; area->CASCADE;
-- parent self-ref->NO ACTION para o CASCADE do yard varrer a árvore num só statement)
ALTER TABLE "yards" ADD CONSTRAINT "yards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "yards" ADD CONSTRAINT "yards_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "yard_areas" ADD CONSTRAINT "yard_areas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "yard_areas" ADD CONSTRAINT "yard_areas_tenant_id_yard_id_fkey" FOREIGN KEY ("tenant_id", "yard_id") REFERENCES "yards"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "yard_areas" ADD CONSTRAINT "yard_areas_tenant_id_parent_id_fkey" FOREIGN KEY ("tenant_id", "parent_id") REFERENCES "yard_areas"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "yard_spots" ADD CONSTRAINT "yard_spots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "yard_spots" ADD CONSTRAINT "yard_spots_tenant_id_area_id_fkey" FOREIGN KEY ("tenant_id", "area_id") REFERENCES "yard_areas"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- I1b — índice PARCIAL único: um process aparece em no MÁXIMO 1 vaga (raw-only, não declarado no Prisma model,
-- como todos os partial-unique da casa: attachments_idem_key, financial_entries). Duas tx que estacionam o
-- MESMO processId em vagas diferentes travam linhas diferentes (sem contenção de lock); o 2º commit viola o
-- índice -> a app traduz para 409 PROCESS_ALREADY_PARKED.
CREATE UNIQUE INDEX "yard_spots_tenant_current_process_key"
  ON "yard_spots"("tenant_id", "current_process_id")
  WHERE "current_process_id" IS NOT NULL;

-- CHECK de coerência status⇄ocupação (invariante ESTRUTURAL, NÃO enum-CHECK): OCCUPIED se-e-somente-se há
-- processo. FREE/BLOCKED nunca carregam processo; nenhum processo fica órfão de status.
ALTER TABLE "yard_spots"
  ADD CONSTRAINT "yard_spots_status_process_coherence_chk"
  CHECK (
    (status = 'OCCUPIED' AND current_process_id IS NOT NULL)
    OR (status <> 'OCCUPIED' AND current_process_id IS NULL)
  );

-- RLS por tabela (clona 20260831000000_add_telemetry_events:75-80).
ALTER TABLE "yards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "yards" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "yards_tenant_isolation" ON "yards";
CREATE POLICY "yards_tenant_isolation" ON "yards"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "yard_areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "yard_areas" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "yard_areas_tenant_isolation" ON "yard_areas";
CREATE POLICY "yard_areas_tenant_isolation" ON "yard_areas"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "yard_spots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "yard_spots" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "yard_spots_tenant_isolation" ON "yard_spots";
CREATE POLICY "yard_spots_tenant_isolation" ON "yard_spots"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
