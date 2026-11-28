-- B-EVIDENCIA-INDICE — índice durável da evidência do app de campo: metadado aceito, recibo de idempotência
-- (organização + usuário + client_evidence_id) e vínculo com o arquivo guardado. Tabela NOVA e aditiva:
-- "mobile_evidences". Nenhuma tabela existente muda. Nenhuma concessão de privilégio neste arquivo: o papel
-- de execução recebe a tabela pelo privilégio padrão do migrador (scripts/db-runtime-role.sh).
-- RLS ENABLE + FORCE + política por organização. "storage_provider" e "storage_key" são colunas INTERNAS:
-- nenhuma resposta, trilha ou log as expõe.
-- Rollback: DROP TABLE IF EXISTS "mobile_evidences"; (política, índices, FKs e CHECKs caem junto).

BEGIN;

CREATE TABLE "mobile_evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "client_evidence_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "work_order_id" UUID,
    "metadata" JSONB NOT NULL,
    "fingerprint_sha256" TEXT NOT NULL,
    "local_created_at" TIMESTAMPTZ(6) NOT NULL,
    "file_status" TEXT NOT NULL,
    "file_id" TEXT,
    "storage_provider" TEXT,
    "storage_key" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "checksum_sha256" TEXT,
    "stored_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "mobile_evidences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mobile_evidences_client_evidence_id_chk"
      CHECK (char_length("client_evidence_id") BETWEEN 1 AND 255),
    CONSTRAINT "mobile_evidences_action_type_chk"
      CHECK ("action_type" IN ('evidence.work_order_photo', 'evidence.work_order_signature',
                               'evidence.work_order_observation', 'evidence.field_photo',
                               'evidence.field_signature', 'evidence.field_observation')),
    CONSTRAINT "mobile_evidences_scope_chk" CHECK ("scope" IN ('work_order', 'field')),
    CONSTRAINT "mobile_evidences_kind_chk" CHECK ("kind" IN ('photo', 'signature', 'observation')),
    CONSTRAINT "mobile_evidences_scope_work_order_chk"
      CHECK (("scope" = 'work_order') = ("work_order_id" IS NOT NULL)),
    -- Teto do metadado: 16 KB (16384 bytes) do texto do JSONB. É o mesmo número do serviço.
    CONSTRAINT "mobile_evidences_metadata_chk"
      CHECK (jsonb_typeof("metadata") = 'object' AND octet_length("metadata"::text) <= 16384),
    -- Nenhuma chave proibida no metadado, em nenhum nível, sem diferenciar maiúsculas de minúsculas.
    CONSTRAINT "mobile_evidences_metadata_keys_chk"
      CHECK (NOT jsonb_path_exists("metadata",
        '$.** ? (@.type() == "object").keyvalue() ? (@.key like_regex "^(token|access[_-]?token|refresh[_-]?token|authorization|bearer|password|secret|bucket|storage[_-]?key|file[_-]?url|absolute[_-]?path|local[_-]?path|path|base64|file[_-]?data|tenant[_-]?id)$" flag "i")')),
    CONSTRAINT "mobile_evidences_fingerprint_chk" CHECK ("fingerprint_sha256" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "mobile_evidences_file_status_chk" CHECK ("file_status" IN ('none', 'awaiting_file', 'stored')),
    CONSTRAINT "mobile_evidences_kind_file_chk"
      CHECK (("kind" = 'observation') = ("file_status" = 'none')),
    CONSTRAINT "mobile_evidences_stored_chk"
      CHECK (
        ("file_status" = 'stored'
          AND "file_id" IS NOT NULL AND "storage_provider" IS NOT NULL AND "storage_key" IS NOT NULL
          AND "mime_type" IS NOT NULL AND "size_bytes" IS NOT NULL AND "checksum_sha256" IS NOT NULL
          AND "stored_at" IS NOT NULL)
        OR
        ("file_status" <> 'stored'
          AND "file_id" IS NULL AND "storage_provider" IS NULL AND "storage_key" IS NULL
          AND "mime_type" IS NULL AND "size_bytes" IS NULL AND "checksum_sha256" IS NULL
          AND "stored_at" IS NULL)
      ),
    CONSTRAINT "mobile_evidences_storage_provider_chk"
      CHECK ("storage_provider" IS NULL OR "storage_provider" IN ('local', 's3')),
    -- A organização da linha tem de ser um SEGMENTO inteiro da chave (no início ou logo depois de uma barra).
    CONSTRAINT "mobile_evidences_storage_key_tenant_chk"
      CHECK ("storage_key" IS NULL OR "storage_key" ~ ('(^|/)' || "tenant_id"::text || '/')),
    CONSTRAINT "mobile_evidences_size_bytes_chk"
      CHECK ("size_bytes" IS NULL OR ("size_bytes" > 0 AND "size_bytes" <= 10485760)),
    CONSTRAINT "mobile_evidences_checksum_chk"
      CHECK ("checksum_sha256" IS NULL OR "checksum_sha256" ~ '^[a-f0-9]{64}$')
);

CREATE UNIQUE INDEX "mobile_evidences_tenant_id_id_key"
  ON "mobile_evidences"("tenant_id", "id");
-- Idempotência: organização + usuário + código do app. Sem filtro por deleted_at (excluída não renasce).
CREATE UNIQUE INDEX "mobile_evidences_idem_key"
  ON "mobile_evidences"("tenant_id", "actor_user_id", "client_evidence_id");
-- Um objeto guardado pertence a uma linha só.
CREATE UNIQUE INDEX "mobile_evidences_storage_key_key"
  ON "mobile_evidences"("tenant_id", "storage_key")
  WHERE "storage_key" IS NOT NULL;
CREATE INDEX "mobile_evidences_tenant_id_work_order_id_created_at_idx"
  ON "mobile_evidences"("tenant_id", "work_order_id", "created_at");

ALTER TABLE "mobile_evidences"
  ADD CONSTRAINT "mobile_evidences_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mobile_evidences"
  ADD CONSTRAINT "mobile_evidences_tenant_id_actor_user_id_fkey"
  FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mobile_evidences"
  ADD CONSTRAINT "mobile_evidences_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mobile_evidences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mobile_evidences" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mobile_evidences_tenant_isolation" ON "mobile_evidences";
CREATE POLICY "mobile_evidences_tenant_isolation" ON "mobile_evidences"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;
