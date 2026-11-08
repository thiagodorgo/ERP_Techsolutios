// B-ASS-05 · F6 — o cofre, a configuração dos provedores e a trilha de plataforma no PostgreSQL (M4).
// As três tabelas são GLOBAIS (sem tenant_id, sem RLS — exceção declarada no plano §3.2), então não há GUC de
// organização: o acesso é só por este módulo, e só o serviço do cofre lê `billing_provider_credentials`.

import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { PrismaPlatformAuditWriter } from "../platform-audit/platform-audit.prisma.js";
import type { ProviderKind } from "../providers/provider.catalog.js";
import type { ProviderConfig, ProviderConfigRepository, ProviderConfigUpsert, ProviderSettings } from "../providers/provider-config.repository.js";
import type { VaultKeyProvider } from "./vault-keys.js";
import { buildVaultRuntime, type VaultRuntime } from "./vault.factory.js";
import type { CredentialKind, CredentialRepository, NewCredential, ProviderEnvironment, StoredCredential } from "./vault.repository.js";
import { VaultServiceError } from "./vault.service.js";

type CredentialRecord = {
  id: string;
  provider: string;
  environment: string;
  kind: string;
  ciphertext: Uint8Array;
  iv: Uint8Array;
  auth_tag: Uint8Array;
  key_version: number;
  fingerprint: string;
  last4: string;
  created_by: string | null;
  created_at: Date;
  rotated_from_id: string | null;
  revoked_at: Date | null;
};

function mapCredential(record: CredentialRecord): StoredCredential {
  return {
    id: record.id,
    provider: record.provider,
    environment: record.environment as ProviderEnvironment,
    kind: record.kind as CredentialKind,
    ciphertext: Buffer.from(record.ciphertext),
    iv: Buffer.from(record.iv),
    authTag: Buffer.from(record.auth_tag),
    keyVersion: record.key_version,
    fingerprint: record.fingerprint,
    last4: record.last4,
    createdBy: record.created_by,
    createdAt: record.created_at,
    rotatedFromId: record.rotated_from_id,
    revokedAt: record.revoked_at,
  };
}

function credentialData(row: NewCredential, now: Date) {
  return {
    id: row.id,
    provider: row.provider,
    environment: row.environment,
    kind: row.kind,
    ciphertext: new Uint8Array(row.ciphertext),
    iv: new Uint8Array(row.iv),
    auth_tag: new Uint8Array(row.authTag),
    key_version: row.keyVersion,
    fingerprint: row.fingerprint,
    last4: row.last4,
    created_by: row.createdBy,
    created_at: now,
    rotated_from_id: row.rotatedFromId,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ator que não é UUID (cabeçalho legado de dev) vira `null` na coluna uuid, como no demonstrativo. */
function uuidOrNull(value: string | null): string | null {
  return value && UUID.test(value) ? value : null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

export class PrismaCredentialRepository implements CredentialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listActive(filter: { readonly provider?: string; readonly environment?: ProviderEnvironment } = {}): Promise<readonly StoredCredential[]> {
    const rows = await this.prisma.billingProviderCredential.findMany({
      where: { revoked_at: null, ...(filter.provider ? { provider: filter.provider } : {}), ...(filter.environment ? { environment: filter.environment } : {}) },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    });
    return rows.map((row) => mapCredential(row as CredentialRecord));
  }

  async replaceActive(row: NewCredential, now: Date) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Trava a viva do slot (se houver) antes de revogar: duas gravações simultâneas do mesmo kind serializam.
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM billing_provider_credentials
           WHERE provider = ${row.provider} AND environment = ${row.environment} AND kind = ${row.kind} AND revoked_at IS NULL
           FOR UPDATE`;
        let revoked: StoredCredential | null = null;
        if (locked.length > 0) {
          const updated = await tx.billingProviderCredential.update({ where: { id: locked[0]!.id }, data: { revoked_at: now } });
          revoked = mapCredential(updated as CredentialRecord);
        }
        const created = await tx.billingProviderCredential.create({ data: { ...credentialData(row, now), created_by: uuidOrNull(row.createdBy) } });
        return { stored: mapCredential(created as CredentialRecord), revoked };
      });
    } catch (error) {
      // Duas primeiras gravações simultâneas do mesmo slot: o UNIQUE parcial segura a segunda.
      if (isUniqueViolation(error)) throw new VaultServiceError(409, "credential_conflict", "Another credential of this kind was saved at the same time; try again.");
      throw error;
    }
  }

  async rotateRow(fromId: string, row: NewCredential, now: Date): Promise<StoredCredential | null> {
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.billingProviderCredential.updateMany({ where: { id: fromId, revoked_at: null }, data: { revoked_at: now } });
      if (revoked.count === 0) return null;
      const created = await tx.billingProviderCredential.create({
        data: { ...credentialData({ ...row, rotatedFromId: fromId }, now), created_by: uuidOrNull(row.createdBy) },
      });
      return mapCredential(created as CredentialRecord);
    });
  }

  async revokeActive(provider: string, environment: ProviderEnvironment, kind: CredentialKind, now: Date): Promise<StoredCredential | null> {
    return this.prisma.$transaction(async (tx) => {
      const live = await tx.billingProviderCredential.findFirst({ where: { provider, environment, kind, revoked_at: null } });
      if (!live) return null;
      const updated = await tx.billingProviderCredential.update({ where: { id: live.id }, data: { revoked_at: now } });
      return mapCredential(updated as CredentialRecord);
    });
  }
}

type ConfigRecord = {
  provider: string;
  kind: string;
  environment: string;
  enabled: boolean;
  enabled_environment: string | null;
  settings: unknown;
  last_test_at: Date | null;
  last_test_ok: boolean | null;
  last_test_environment: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapConfig(record: ConfigRecord): ProviderConfig {
  return {
    provider: record.provider,
    kind: record.kind as ProviderKind,
    environment: record.environment as ProviderEnvironment,
    enabled: record.enabled,
    enabledEnvironment: record.enabled_environment as ProviderEnvironment | null,
    settings: (record.settings && typeof record.settings === "object" ? record.settings : {}) as ProviderSettings,
    lastTestAt: record.last_test_at,
    lastTestOk: record.last_test_ok,
    lastTestEnvironment: record.last_test_environment as ProviderEnvironment | null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export class PrismaProviderConfigRepository implements ProviderConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(provider: string): Promise<ProviderConfig | null> {
    const row = await this.prisma.billingProviderConfig.findUnique({ where: { provider } });
    return row ? mapConfig(row as ConfigRecord) : null;
  }

  async list(): Promise<readonly ProviderConfig[]> {
    const rows = await this.prisma.billingProviderConfig.findMany({ orderBy: { provider: "asc" } });
    return rows.map((row) => mapConfig(row as ConfigRecord));
  }

  async upsert(input: ProviderConfigUpsert, now: Date): Promise<ProviderConfig> {
    const settings = { ...input.settings };
    const row = await this.prisma.billingProviderConfig.upsert({
      where: { provider: input.provider },
      create: { id: randomUUID(), provider: input.provider, kind: input.kind, environment: input.environment, settings, created_at: now, updated_at: now },
      update: { environment: input.environment, settings, updated_at: now },
    });
    return mapConfig(row as ConfigRecord);
  }
}

export async function createPrismaVaultRuntime(keys: VaultKeyProvider): Promise<VaultRuntime> {
  const { prisma } = await import("../../../database/prisma.js");
  return buildVaultRuntime({
    credentials: new PrismaCredentialRepository(prisma),
    configs: new PrismaProviderConfigRepository(prisma),
    audit: new PrismaPlatformAuditWriter(prisma),
    keys,
  });
}
