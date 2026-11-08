// B-ASS-05 — servidor de teste do cofre, num processo PRÓPRIO, para a prova de não vazamento (T-VLT-5, T-VLT-23):
// assim o teste lê o stdout e o stderr reais do processo (o pino escreve direto no descritor, não passa por
// `process.stdout.write`). Imprime `PORT <n>` ao subir e aceita comandos no stdin, um por linha:
//   dump              → imprime `DUMP <json>` com a trilha de plataforma e as linhas do cofre (sem o claro)
//   breaktag          → inverte 1 bit do authTag de toda credencial viva (simula banco adulterado)
//   keys <b64> <v> [<prev_b64> <prev_v>] → troca as chaves do cofre
//   read <provider> <kind> → força a leitura interna (`readSecretForProvider`) e imprime `READ ok|<reason>`

import { createInterface } from "node:readline";

import { CoreSaasRegistry } from "../../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../../src/modules/core-saas/store/core-saas.store.js";
import { createDefaultVaultRuntime, getMemoryVaultForTests, setVaultKeysForTests } from "../../src/modules/subscription-billing/vault/vault.factory.js";
import { EnvVaultKeyProvider } from "../../src/modules/subscription-billing/vault/vault-keys.js";

const { createApp } = await import("../../src/app.js");
const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
const server = app.listen(0, "127.0.0.1", () => {
  const address = server.address();
  process.stdout.write(`PORT ${typeof address === "object" && address ? address.port : 0}\n`);
});

const lines = createInterface({ input: process.stdin });
lines.on("line", async (line) => {
  const [command, ...args] = line.trim().split(/\s+/);
  const memory = getMemoryVaultForTests();
  if (command === "dump") {
    const rows = memory.credentials.allForTests().map((row) => ({
      id: row.id, provider: row.provider, environment: row.environment, kind: row.kind, keyVersion: row.keyVersion,
      fingerprint: row.fingerprint, last4: row.last4, revoked: row.revokedAt !== null,
      ciphertextHex: row.ciphertext.toString("hex"),
    }));
    process.stdout.write(`DUMP ${JSON.stringify({ audit: memory.audit.list(), rows })}\n`);
  } else if (command === "breaktag") {
    for (const row of memory.credentials.allForTests()) {
      if (row.revokedAt === null) row.authTag[0] = row.authTag[0]! ^ 1;
    }
    process.stdout.write("OK breaktag\n");
  } else if (command === "keys") {
    setVaultKeysForTests(new EnvVaultKeyProvider({
      BILLING_VAULT_KEY: args[0], BILLING_VAULT_KEY_VERSION: args[1], BILLING_VAULT_KEY_PREVIOUS: args[2], BILLING_VAULT_KEY_PREVIOUS_VERSION: args[3],
    }));
    process.stdout.write("OK keys\n");
  } else if (command === "read") {
    const runtime = await createDefaultVaultRuntime();
    try {
      const secret = await runtime.vault.readSecretForProvider(args[0]!, "sandbox", args[1] as "api_token");
      process.stdout.write(`READ ${secret ? "ok" : "none"}\n`);
    } catch (error) {
      process.stdout.write(`READ ${(error as { reason?: string }).reason ?? "error"}\n`);
    }
  }
});
