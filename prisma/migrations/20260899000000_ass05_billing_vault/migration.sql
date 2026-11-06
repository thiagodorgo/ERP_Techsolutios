-- B-ASS-05 (M4) — cofre de credenciais dos provedores, configuração dos provedores e trilha de plataforma.
-- ADITIVA e forward-only; nenhuma tabela existente é alterada. AUTORIZADA pela fala do dono de 31/10 ~22:15
-- ("siga na recomendação de tudo, exceto p14"), que respondeu a P1 (autorizar as 7 de esquema e 3 de dados, uma
-- a uma) — §3.10 e §12.1 do plano (M4 é uma das 7 de esquema).
-- O QUE TOCA: cria billing_provider_configs, billing_provider_credentials e platform_audit_logs. As três são
-- GLOBAIS da plataforma (sem tenant_id): SEM política de RLS, exceção declarada no plano (§3.2; precedente
-- `tenants`). O papel de runtime lê e escreve nelas pelos privilégios padrão do migrador (docs/deployment.md).
-- O segredo só existe cifrado (AES-256-GCM, chave fora do banco); nenhuma coluna guarda o claro.
-- TRANSAÇÃO EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA): falha em qualquer sentença -> nada aplicado.
-- ROLLBACK (runbook, MANUAL): bloco -- down no fim deste arquivo.

BEGIN;

CREATE TABLE "billing_provider_configs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'sandbox',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "enabled_environment" TEXT,
  "enabled_at" TIMESTAMPTZ(6),
  "enabled_by" UUID,
  "last_test_at" TIMESTAMPTZ(6),
  "last_test_ok" BOOLEAN,
  "last_test_environment" TEXT,
  "last_test_error" TEXT,
  "webhook_registered_at" TIMESTAMPTZ(6),
  "webhook_registered_environment" TEXT,
  "webhook_external_id" TEXT,
  "webhook_public_url" TEXT,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_provider_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_provider_configs_provider_check" CHECK ("provider" IN ('asaas', 'iugu', 'mercadopago', 'focusnfe', 'nfeio', 'plugnotas')),
  CONSTRAINT "billing_provider_configs_kind_check" CHECK ("kind" IN ('payment', 'invoice')),
  CONSTRAINT "billing_provider_configs_environment_check" CHECK ("environment" IN ('sandbox', 'production')),
  CONSTRAINT "billing_provider_configs_enabled_environment_check" CHECK ("enabled_environment" IS NULL OR "enabled_environment" IN ('sandbox', 'production')),
  CONSTRAINT "billing_provider_configs_last_test_environment_check" CHECK ("last_test_environment" IS NULL OR "last_test_environment" IN ('sandbox', 'production')),
  CONSTRAINT "billing_provider_configs_webhook_environment_check" CHECK ("webhook_registered_environment" IS NULL OR "webhook_registered_environment" IN ('sandbox', 'production')),
  CONSTRAINT "billing_provider_configs_settings_object_check" CHECK (jsonb_typeof("settings") = 'object')
);

CREATE UNIQUE INDEX "billing_provider_configs_provider_key" ON "billing_provider_configs"("provider");

CREATE TABLE "billing_provider_credentials" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "ciphertext" BYTEA NOT NULL,
  "iv" BYTEA NOT NULL,
  "auth_tag" BYTEA NOT NULL,
  "key_version" INTEGER NOT NULL,
  "fingerprint" CHAR(16) NOT NULL,
  "last4" TEXT NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotated_from_id" UUID,
  "revoked_at" TIMESTAMPTZ(6),
  CONSTRAINT "billing_provider_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_provider_credentials_provider_check" CHECK ("provider" IN ('asaas', 'iugu', 'mercadopago', 'focusnfe', 'nfeio', 'plugnotas')),
  CONSTRAINT "billing_provider_credentials_environment_check" CHECK ("environment" IN ('sandbox', 'production')),
  CONSTRAINT "billing_provider_credentials_kind_check" CHECK ("kind" IN ('api_token', 'webhook_secret', 'certificate')),
  CONSTRAINT "billing_provider_credentials_iv_check" CHECK (octet_length("iv") = 12),
  CONSTRAINT "billing_provider_credentials_auth_tag_check" CHECK (octet_length("auth_tag") = 16),
  CONSTRAINT "billing_provider_credentials_ciphertext_check" CHECK (octet_length("ciphertext") > 0),
  CONSTRAINT "billing_provider_credentials_key_version_check" CHECK ("key_version" >= 1),
  CONSTRAINT "billing_provider_credentials_fingerprint_check" CHECK ("fingerprint" ~ '^[0-9a-f]{16}$'),
  CONSTRAINT "billing_provider_credentials_last4_check" CHECK (char_length("last4") <= 4),
  CONSTRAINT "billing_provider_credentials_rotated_from_id_fkey" FOREIGN KEY ("rotated_from_id") REFERENCES "billing_provider_credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Um segredo VIVO por (provedor, ambiente, kind) — G13. A revogada fica (nunca DELETE).
CREATE UNIQUE INDEX "billing_provider_credentials_active_slot_key" ON "billing_provider_credentials"("provider", "environment", "kind") WHERE "revoked_at" IS NULL;
CREATE INDEX "billing_provider_credentials_provider_environment_idx" ON "billing_provider_credentials"("provider", "environment");

CREATE TABLE "platform_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_user_id" UUID,
  "actor_email_hash" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT,
  "tenant_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_audit_logs_metadata_object_check" CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "platform_audit_logs_entity_entity_id_idx" ON "platform_audit_logs"("entity", "entity_id");
CREATE INDEX "platform_audit_logs_created_at_idx" ON "platform_audit_logs"("created_at");

COMMIT;

-- down (MANUAL, nunca automático; só em ambiente SEM dado real; psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>):
--   DROP TABLE IF EXISTS "platform_audit_logs";
--   DROP TABLE IF EXISTS "billing_provider_credentials";
--   DROP TABLE IF EXISTS "billing_provider_configs";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260899000000_ass05_billing_vault';
--   -- os índices, CHECKs e a FK de rotação caem junto com as tabelas; nenhuma outra tabela é tocada.
