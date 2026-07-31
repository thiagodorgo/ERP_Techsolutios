-- Block Ω-VID PR-02 (identidade unificada de veículo de terceiro): tabelas NOVAS "third_party_vehicle_identities"
-- (entidade de 1ª classe do veículo de TERCEIRO — DISTINTA de "vehicles", frota própria com plate NOT NULL+unique,
-- D-Ω5P-09/D-Ω5P-RECON-A intocados) e "third_party_vehicle_identity_merge_events" (trilha append-only do merge,
-- escrita só a partir do PR-04) + coluna ADITIVA "impound_processes.identity_id" (FK opcional, RESTRICT).
--
-- ADITIVA / UP-ONLY (C7.5): CREATE TABLE das 2 tabelas NOVAS + índices tenant-first + FK compostas tenant-first
-- RESTRICT + CHECKs estruturais (enum fechado + identidade + merge) + índice PARCIAL não-único (comentado abaixo)
-- + TRIGGER append-only (por tabela, nome próprio) + RLS ENABLE+FORCE+POLICY nas 2 tabelas novas. ALTER TABLE em
-- "impound_processes" é SÓ ADD COLUMN (nullable, sem default estrutural) — a tabela JÁ TEM RLS habilitada desde
-- 20260836000000_add_impound; uma coluna nova não precisa de ALTER POLICY (a policy existente já cobre TODAS as
-- colunas da linha via `tenant_id = app.current_tenant_id`, não é por coluna). SEM backfill (PR-03) e SEM
-- endpoint de merge (PR-04) — este bloco só monta o schema + CRUD básico de leitura/criação/correção de
-- identidade (sem merge/unmerge).
--
-- Ponto de agregação: 1 ThirdPartyVehicleIdentity → N ImpoundProcess ao longo do tempo (histórico real do
-- veículo). plate_key = normalizePlateKey (canônica, portal-shared) — NULLABLE (identidade pode nascer "não
-- identificada"). confidence: PROVISIONAL (aberto sem confirmação) | CONFIRMED (vistoria bateu) | MERGED
-- (aponta canonical_identity_id). Merge NUNCA automático/silencioso — reconciliação sempre manual e auditada.
--
-- CHECKs ESTRUTURAIS (belt-and-suspenders sobre o validator da APP, espírito de impound_processes_identity_chk):
--   - confidence_chk: enum fechado de 3 valores (domínio pequeno/estável — padrão da casa, espelha
--     impound_outbox_events_status_chk).
--   - identity_chk: mesma lógica de impound_processes_identity_chk — não-identificado ⇒ justificativa não
--     vazia; identificado ⇒ ≥1 identificador (plate_key/chassis/renavam_key) não-nulo.
--   - merge_chk: confidence='MERGED' ⇒ canonical_identity_id preenchido (não pode apontar para "mesclado" sem
--     dizer para onde).
--
-- Índice PARCIAL NÃO-ÚNICO deliberado (third_party_vehicle_identities_plate_key_active_idx): duas identidades
-- PROVISIONAL da MESMA placa podem coexistir (ex.: dois pátios diferentes abrem processo para o mesmo veículo
-- antes de qualquer reconciliação) — o merge nunca é automático, então NÃO há unicidade de placa entre
-- identidades ativas (confidence <> 'MERGED'). Uma vez MERGED, a identidade sai do escopo do índice (o
-- canonical_identity_id é que passa a ser a referência viva). Isto é intencional: NÃO adicionar UNIQUE aqui.
--
-- Self-FK canonical_identity_id (D-Ω-VID-01 achado #6): nomeada "IdentityMerge" no Prisma; onDelete: Restrict
-- explícito. O `@@unique([tenant_id, id])` do lado referenciado (mesmo padrão de TODAS as FKs compostas
-- tenant-first da casa) garante que canonical_identity_id só pode apontar para uma linha (tenant_id, id) que
-- exista — inclusive impedindo apontar para identidade de OUTRO tenant (a FK composta exige o MESMO tenant_id
-- em ambos os lados). Prova viva em tests/vehicle-identity-schema.test.ts (cenário 4).
--
-- third_party_vehicle_identity_merge_events é append-only por TRIGGER NOMEADO POR TABELA (não reusa função
-- genérica — mesmo padrão de custody_events_block_mutation/impound_outbox_events_block_delete, cada tabela tem
-- sua própria função/trigger). UPDATE e DELETE são SEMPRE bloqueados (a trilha de merge é prova de auditoria —
-- correção retroativa exige um novo registro de merge/unmerge no PR-04, nunca mutação).
--
-- Rollback (runbook — tabelas NOVAS + funções/triggers; reverter o PR remove tudo sem afetar dado existente):
--   DROP TRIGGER IF EXISTS "third_party_vehicle_identity_merge_events_block_mutation" ON "third_party_vehicle_identity_merge_events";
--   DROP FUNCTION IF EXISTS third_party_vehicle_identity_merge_events_block_mutation();
--   ALTER TABLE "impound_processes" DROP CONSTRAINT IF EXISTS "impound_processes_tenant_id_identity_id_fkey";
--   ALTER TABLE "impound_processes" DROP COLUMN IF EXISTS "identity_id";
--   DROP TABLE IF EXISTS "third_party_vehicle_identity_merge_events" CASCADE;
--   DROP TABLE IF EXISTS "third_party_vehicle_identities" CASCADE;
-- (policies, índices, partial-index e CHECKs caem junto das tabelas; a função/trigger e a coluna aditiva são os
--  únicos objetos a desfazer à parte.)

-- CreateTable
CREATE TABLE "third_party_vehicle_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plate_raw" TEXT,
    "plate_key" TEXT,
    "chassis" TEXT,
    "renavam_key" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "year" INTEGER,
    "unidentified" BOOLEAN NOT NULL DEFAULT false,
    "unidentified_reason" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'PROVISIONAL',
    "canonical_identity_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "third_party_vehicle_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "third_party_vehicle_identity_merge_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "target_identity_id" UUID NOT NULL,
    "merged_identity_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "actor_id" UUID,
    "snapshot_before" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "third_party_vehicle_identity_merge_events_pkey" PRIMARY KEY ("id")
);

-- AlterTable (aditiva, nullable — herda a RLS existente de impound_processes sem policy nova, ver nota acima)
ALTER TABLE "impound_processes" ADD COLUMN "identity_id" UUID;

-- CreateIndex (tenant_id 1º em todos)
CREATE UNIQUE INDEX "third_party_vehicle_identities_tenant_id_id_key" ON "third_party_vehicle_identities"("tenant_id", "id");
CREATE INDEX "third_party_vehicle_identities_tenant_id_plate_key_idx" ON "third_party_vehicle_identities"("tenant_id", "plate_key");
CREATE INDEX "third_party_vehicle_identities_tenant_id_renavam_key_idx" ON "third_party_vehicle_identities"("tenant_id", "renavam_key");
CREATE INDEX "third_party_vehicle_identities_tenant_id_confidence_idx" ON "third_party_vehicle_identities"("tenant_id", "confidence");

-- CreateIndex (nomes truncados a 63 bytes — limite NAMEDATALEN do Postgres; mesma truncagem que o Prisma
-- geraria a partir do datamodel).
CREATE UNIQUE INDEX "third_party_vehicle_identity_merge_events_tenant_id_id_key" ON "third_party_vehicle_identity_merge_events"("tenant_id", "id");
CREATE INDEX "third_party_vehicle_identity_merge_events_tenant_id_target__idx" ON "third_party_vehicle_identity_merge_events"("tenant_id", "target_identity_id");
CREATE INDEX "third_party_vehicle_identity_merge_events_tenant_id_merged__idx" ON "third_party_vehicle_identity_merge_events"("tenant_id", "merged_identity_id");

-- CreateIndex (impound_processes.identity_id — não-único, mesmo padrão de vehicle_plate/status)
CREATE INDEX "impound_processes_tenant_id_identity_id_idx" ON "impound_processes"("tenant_id", "identity_id");

-- Índice PARCIAL NÃO-ÚNICO deliberado (ver nota acima) — duas identidades PROVISIONAL da mesma placa coexistem
-- até reconciliação manual (merge nunca é automático); MERGED sai do escopo.
CREATE INDEX "third_party_vehicle_identities_plate_key_active_idx"
  ON "third_party_vehicle_identities" ("tenant_id", "plate_key")
  WHERE "confidence" <> 'MERGED' AND "plate_key" IS NOT NULL;

-- AddForeignKey (compostas tenant-first; TODAS RESTRICT — nada de identidade/merge cascateia)
ALTER TABLE "third_party_vehicle_identities" ADD CONSTRAINT "third_party_vehicle_identities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "third_party_vehicle_identities" ADD CONSTRAINT "third_party_vehicle_identities_tenant_id_canonical_identit_fkey" FOREIGN KEY ("tenant_id", "canonical_identity_id") REFERENCES "third_party_vehicle_identities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "third_party_vehicle_identity_merge_events" ADD CONSTRAINT "third_party_vehicle_identity_merge_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "third_party_vehicle_identity_merge_events" ADD CONSTRAINT "third_party_vehicle_identity_merge_events_tenant_id_target_fkey" FOREIGN KEY ("tenant_id", "target_identity_id") REFERENCES "third_party_vehicle_identities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_processes" ADD CONSTRAINT "impound_processes_tenant_id_identity_id_fkey" FOREIGN KEY ("tenant_id", "identity_id") REFERENCES "third_party_vehicle_identities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs ESTRUTURAIS
-- enum fechado (domínio pequeno/estável — espelha impound_outbox_events_status_chk).
ALTER TABLE "third_party_vehicle_identities"
  ADD CONSTRAINT "third_party_vehicle_identities_confidence_chk"
  CHECK ("confidence" IN ('PROVISIONAL', 'CONFIRMED', 'MERGED'));
-- identidade: não-identificado ⇒ justificativa não vazia; identificado ⇒ ≥1 identificador (mesma lógica de
-- impound_processes_identity_chk, migração 20260836000000).
ALTER TABLE "third_party_vehicle_identities"
  ADD CONSTRAINT "third_party_vehicle_identities_identity_chk"
  CHECK (
    ("unidentified" = true
       AND "unidentified_reason" IS NOT NULL
       AND length(btrim("unidentified_reason")) > 0)
    OR ("unidentified" = false
       AND ("plate_key" IS NOT NULL OR "chassis" IS NOT NULL OR "renavam_key" IS NOT NULL))
  );
-- merge: confidence='MERGED' ⇒ aponta para onde foi mesclada.
ALTER TABLE "third_party_vehicle_identities"
  ADD CONSTRAINT "third_party_vehicle_identities_merge_chk"
  CHECK ("confidence" <> 'MERGED' OR "canonical_identity_id" IS NOT NULL);

-- TRIGGER append-only NOMEADO POR TABELA (não reusa função genérica — cada tabela tem a sua, mesmo padrão de
-- custody_events_block_mutation / impound_outbox_events_block_delete). Bloqueia QUALQUER UPDATE ou DELETE em
-- third_party_vehicle_identity_merge_events. A role da app (NOSUPERUSER) não consegue contornar; manutenção/
-- teardown usa session_replication_role=replica (só superuser), o caminho padrão do Postgres (o trigger não
-- dispara em modo replica).
CREATE OR REPLACE FUNCTION third_party_vehicle_identity_merge_events_block_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'third_party_vehicle_identity_merge_events is append-only: % is forbidden. Correction = new merge/unmerge event (PR-04), never mutation.', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "third_party_vehicle_identity_merge_events_block_mutation"
  BEFORE UPDATE OR DELETE ON "third_party_vehicle_identity_merge_events"
  FOR EACH ROW EXECUTE FUNCTION third_party_vehicle_identity_merge_events_block_mutation();

-- RLS por tabela (clona 20260836000000_add_impound:166-172). impound_processes JÁ TEM RLS (não precisa de
-- ALTER POLICY para a coluna nova — a policy é por linha via tenant_id, não por coluna).
ALTER TABLE "third_party_vehicle_identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "third_party_vehicle_identities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "third_party_vehicle_identities_tenant_isolation" ON "third_party_vehicle_identities";
CREATE POLICY "third_party_vehicle_identities_tenant_isolation" ON "third_party_vehicle_identities"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "third_party_vehicle_identity_merge_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "third_party_vehicle_identity_merge_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "third_party_vehicle_identity_merge_events_tenant_isolation" ON "third_party_vehicle_identity_merge_events";
CREATE POLICY "third_party_vehicle_identity_merge_events_tenant_isolation" ON "third_party_vehicle_identity_merge_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
