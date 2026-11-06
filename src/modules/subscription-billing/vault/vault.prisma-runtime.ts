// B-ASS-05 — PROVISÓRIO até a F6 (M4 + repositórios Prisma), dentro deste mesmo PR: o modo Prisma recusa de forma
// explícita em vez de cair em memória em silêncio.

import type { VaultKeyProvider } from "./vault-keys.js";
import type { VaultRuntime } from "./vault.factory.js";

export async function createPrismaVaultRuntime(_keys: VaultKeyProvider): Promise<VaultRuntime> {
  throw new Error("vault_prisma_runtime_not_built");
}
