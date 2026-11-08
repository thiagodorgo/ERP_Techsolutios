// B-ASS-05 · F1 — a CIFRA do cofre de credenciais (plano §4.5, "Desenho do cofre").
//
//  - AES-256-GCM (`node:crypto`), IV de 12 bytes aleatórios por cifragem, authTag de 16 bytes.
//  - AAD = `${provider}:${environment}:${rowId}`: uma credencial cifrada para uma linha NÃO decifra em outra
//    (não dá para recolar o ciphertext de um provedor ou de um ambiente em outro).
//  - O claro só existe dentro de `VaultSecret`, que não se serializa (R-VLT-3).
//  - Nenhuma dependência nova: só `node:crypto`.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { VaultSecret } from "./vault-secret.js";

export const VAULT_CIPHER = "aes-256-gcm";
export const VAULT_IV_BYTES = 12;
export const VAULT_AUTH_TAG_BYTES = 16;
export const VAULT_KEY_BYTES = 32;

export type VaultKey = { readonly key: Buffer; readonly version: number };

export type SealedSecret = {
  readonly ciphertext: Buffer;
  readonly iv: Buffer;
  readonly authTag: Buffer;
  readonly keyVersion: number;
};

export type VaultErrorCode =
  | "vault_unavailable"
  | "decrypt_failed"
  | "unknown_key_version"
  | "invalid_key"
  | "never_serialize_secret";

/** Erro do cofre. A mensagem NUNCA carrega o claro, o ciphertext nem a chave. */
export class VaultError extends Error {
  readonly code: VaultErrorCode;

  constructor(code: VaultErrorCode, message: string) {
    super(message);
    this.name = "VaultError";
    this.code = code;
  }
}

/** A AAD que amarra o ciphertext à linha (provedor, ambiente, id). */
export function vaultAad(provider: string, environment: string, rowId: string): string {
  return `${provider}:${environment}:${rowId}`;
}

function assertKey(key: VaultKey): void {
  if (key.key.length !== VAULT_KEY_BYTES) {
    throw new VaultError("invalid_key", "The vault key must have 32 bytes.");
  }
  if (!Number.isInteger(key.version) || key.version < 1) {
    throw new VaultError("invalid_key", "The vault key version must be an integer >= 1.");
  }
}

/** Cifra `plaintext` com a chave `key`, amarrado à `aad`. Duas chamadas com o mesmo claro dão IV e ciphertext distintos. */
export function sealSecret(plaintext: string, key: VaultKey, aad: string): SealedSecret {
  assertKey(key);
  const iv = randomBytes(VAULT_IV_BYTES);
  const cipher = createCipheriv(VAULT_CIPHER, key.key, iv, { authTagLength: VAULT_AUTH_TAG_BYTES });
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyVersion: key.version };
}

/**
 * Decifra. authTag alterado, AAD diferente ou chave errada → `VaultError("decrypt_failed")`, sem conteúdo.
 * O resultado só existe como `VaultSecret`.
 */
export function openSecret(sealed: SealedSecret, key: VaultKey, aad: string): VaultSecret {
  assertKey(key);
  if (sealed.keyVersion !== key.version) {
    throw new VaultError("unknown_key_version", "The row was sealed with another key version.");
  }
  if (sealed.iv.length !== VAULT_IV_BYTES || sealed.authTag.length !== VAULT_AUTH_TAG_BYTES) {
    throw new VaultError("decrypt_failed", "The sealed secret is malformed.");
  }
  try {
    const decipher = createDecipheriv(VAULT_CIPHER, key.key, sealed.iv, { authTagLength: VAULT_AUTH_TAG_BYTES });
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(sealed.authTag);
    const plaintext = Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]).toString("utf8");
    return new VaultSecret(plaintext);
  } catch {
    // Nunca propaga a mensagem do OpenSSL: ela não tem segredo, mas o contrato é "sem conteúdo".
    throw new VaultError("decrypt_failed", "The secret could not be decrypted.");
  }
}

/** 16 hex do SHA-256 do claro: identifica a credencial sem revelá-la. */
export function fingerprintOf(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex").slice(0, 16);
}

/** Os 4 últimos caracteres do claro (o que a tela mostra para o dono reconhecer a credencial). */
export function last4Of(plaintext: string): string {
  return plaintext.slice(-4);
}
