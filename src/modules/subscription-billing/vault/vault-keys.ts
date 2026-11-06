// B-ASS-05 · F1 — de onde vem a chave do cofre (plano §4.5 "Chave" e "Rotação", §3.9).
//
// A chave NUNCA fica no banco. Hoje vem do ambiente (`EnvVaultKeyProvider`):
//   BILLING_VAULT_KEY              base64 de 32 bytes (a chave atual, que cifra)
//   BILLING_VAULT_KEY_VERSION      inteiro >= 1, gravado em `key_version` de toda linha cifrada
//   BILLING_VAULT_KEY_PREVIOUS     base64 de 32 bytes, só para DECIFRAR linhas da versão anterior (rotação)
//   BILLING_VAULT_KEY_PREVIOUS_VERSION
// Sem a chave atual (ou com ela inválida), o cofre fica `unavailable`: gravar credencial responde 503 e nada mais
// quebra (R-VLT-4). Os gates de boot (G-BILLING-VAULT e G-BILLING-VAULT-PREV) ficam em `src/config/env.ts`.
//
// PORTA DOCUMENTADA, NÃO IMPLEMENTADA — `AwsSecretsManagerVaultKeyProvider`:
//   current(): lê o segredo cujo ARN está em `BILLING_VAULT_KEY_SECRET_ARN` (JSON `{ key, version }`, chave em
//   base64) pelo `GetSecretValue`; previous(): o mesmo segredo na versão de estágio `AWSPREVIOUS`.
//   Exige `@aws-sdk/client-secrets-manager` (dependência nova → junta de 5, §C7 item 1) e o deploy AWS
//   (`D-INFRA-PROVIDER-AWS`); nasce no bloco de infra AWS, não aqui.

import { VAULT_KEY_BYTES, type VaultKey } from "./vault.crypto.js";

export type VaultStatus = "available" | "unavailable";

export interface VaultKeyProvider {
  /** A chave que cifra. `null` = cofre indisponível. */
  current(): VaultKey | null;
  /** A chave anterior, que só decifra (rotação). */
  previous(): VaultKey | null;
}

export type VaultKeyEnv = {
  readonly BILLING_VAULT_KEY?: string;
  readonly BILLING_VAULT_KEY_VERSION?: number | string;
  readonly BILLING_VAULT_KEY_PREVIOUS?: string;
  readonly BILLING_VAULT_KEY_PREVIOUS_VERSION?: number | string;
};

/** base64 de exatamente 32 bytes → Buffer; qualquer outra coisa → `null`. */
export function parseVaultKey(value: string | undefined): Buffer | null {
  const text = (value ?? "").trim();
  if (text === "") return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return null;
  const key = Buffer.from(text, "base64");
  // Recodificar evita aceitar base64 "frouxo" que o Node decodifica ignorando caracteres.
  if (key.length !== VAULT_KEY_BYTES || key.toString("base64") !== text) return null;
  return key;
}

function parseVersion(value: number | string | undefined, fallback: number | null): number | null {
  if (value === undefined || value === "") return fallback;
  const version = typeof value === "number" ? value : Number(value);
  return Number.isInteger(version) && version >= 1 ? version : null;
}

export class EnvVaultKeyProvider implements VaultKeyProvider {
  readonly #current: VaultKey | null;
  readonly #previous: VaultKey | null;

  constructor(source: VaultKeyEnv) {
    const key = parseVaultKey(source.BILLING_VAULT_KEY);
    const version = parseVersion(source.BILLING_VAULT_KEY_VERSION, 1);
    this.#current = key && version ? { key, version } : null;

    const previousKey = parseVaultKey(source.BILLING_VAULT_KEY_PREVIOUS);
    const previousVersion = parseVersion(source.BILLING_VAULT_KEY_PREVIOUS_VERSION, null);
    const valid =
      previousKey !== null &&
      previousVersion !== null &&
      this.#current !== null &&
      previousVersion < this.#current.version &&
      !previousKey.equals(this.#current.key);
    this.#previous = valid ? { key: previousKey, version: previousVersion } : null;
  }

  current(): VaultKey | null {
    return this.#current;
  }

  previous(): VaultKey | null {
    return this.#previous;
  }
}

export function vaultStatus(keys: VaultKeyProvider): VaultStatus {
  return keys.current() ? "available" : "unavailable";
}

/** A chave capaz de decifrar uma linha de `keyVersion`: a atual ou a anterior; senão `null` (linha ilegível). */
export function keyForVersion(keys: VaultKeyProvider, keyVersion: number): VaultKey | null {
  const current = keys.current();
  if (current && current.version === keyVersion) return current;
  const previous = keys.previous();
  if (previous && previous.version === keyVersion) return previous;
  return null;
}
