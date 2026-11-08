// B-ASS-05 — fábrica do cofre e da configuração dos provedores. A chave vem SEMPRE do ambiente
// (`EnvVaultKeyProvider`), nunca do banco. Memória: dublês (dev e testes). Prisma: as 3 tabelas globais da M4 (F6).

import { env } from "../../../config/env.js";
import { RecordingPlatformAuditWriter, type PlatformAuditWriter } from "../plans/platform-audit.js";
import { InMemoryProviderConfigRepository, type ProviderConfigRepository } from "../providers/provider-config.repository.js";
import { ProviderConfigService } from "../providers/provider-config.service.js";
import { EnvVaultKeyProvider, type VaultKeyProvider } from "./vault-keys.js";
import { InMemoryCredentialRepository, type CredentialRepository } from "./vault.repository.js";
import { VaultService } from "./vault.service.js";

export type VaultRuntime = {
  readonly vault: VaultService;
  readonly providers: ProviderConfigService;
  readonly credentials: CredentialRepository;
  readonly configs: ProviderConfigRepository;
  readonly audit: PlatformAuditWriter;
  readonly keys: VaultKeyProvider;
};

function envKeys(): VaultKeyProvider {
  return new EnvVaultKeyProvider({
    BILLING_VAULT_KEY: env.BILLING_VAULT_KEY,
    BILLING_VAULT_KEY_VERSION: env.BILLING_VAULT_KEY_VERSION,
    BILLING_VAULT_KEY_PREVIOUS: env.BILLING_VAULT_KEY_PREVIOUS,
    BILLING_VAULT_KEY_PREVIOUS_VERSION: env.BILLING_VAULT_KEY_PREVIOUS_VERSION,
  });
}

export function buildVaultRuntime(parts: {
  readonly credentials: CredentialRepository;
  readonly configs: ProviderConfigRepository;
  readonly audit: PlatformAuditWriter;
  readonly keys: VaultKeyProvider;
  readonly clock?: () => Date;
}): VaultRuntime {
  const vault = new VaultService(parts.credentials, parts.keys, parts.audit, parts.clock);
  return { ...parts, vault, providers: new ProviderConfigService(parts.configs, vault, parts.clock) };
}

let memoryCredentials = new InMemoryCredentialRepository();
let memoryConfigs = new InMemoryProviderConfigRepository();
let memoryAudit = new RecordingPlatformAuditWriter();
let keysOverride: VaultKeyProvider | null = null;

export function getMemoryVaultForTests() {
  return { credentials: memoryCredentials, configs: memoryConfigs, audit: memoryAudit };
}

/** Só para testes: troca as chaves do cofre sem mexer no ambiente do processo. `null` volta às do ambiente. */
export function setVaultKeysForTests(keys: VaultKeyProvider | null): void {
  keysOverride = keys;
}

export function resetVaultRuntimeForTests(): void {
  memoryCredentials = new InMemoryCredentialRepository();
  memoryConfigs = new InMemoryProviderConfigRepository();
  memoryAudit = new RecordingPlatformAuditWriter();
  keysOverride = null;
  prismaRuntime = undefined;
}

let prismaRuntime: Promise<VaultRuntime> | undefined;

export async function createDefaultVaultRuntime(): Promise<VaultRuntime> {
  const keys = keysOverride ?? envKeys();
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return buildVaultRuntime({ credentials: memoryCredentials, configs: memoryConfigs, audit: memoryAudit, keys });
  }
  prismaRuntime ??= import("./vault.prisma-runtime.js").then((module) => module.createPrismaVaultRuntime(keys));
  return prismaRuntime;
}
