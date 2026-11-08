// B-ASS-05 · F1 — a cifra do cofre e o VaultSecret (plano §4.5, R-VLT-1 e R-VLT-3).
// Mutações do plano: IV fixo → T-VLT-4 vermelho; ignorar a AAD → T-VLT-3 vermelho.

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { inspect } from "node:util";

import {
  fingerprintOf,
  last4Of,
  openSecret,
  sealSecret,
  vaultAad,
  VaultError,
  type VaultKey,
} from "../src/modules/subscription-billing/vault/vault.crypto.js";
import { EnvVaultKeyProvider, keyForVersion, parseVaultKey, vaultStatus } from "../src/modules/subscription-billing/vault/vault-keys.js";
import { VaultSecret } from "../src/modules/subscription-billing/vault/vault-secret.js";

const SECRET = "SECRET-ABC123-XYZ";
const KEY: VaultKey = { key: randomBytes(32), version: 1 };
const AAD = vaultAad("asaas", "sandbox", "00000000-0000-0000-0000-000000000001");

const isVaultError = (code: string) => (error: unknown) => error instanceof VaultError && error.code === code;

test("T-VLT-1 · cifrar e decifrar devolve o claro", () => {
  const sealed = sealSecret(SECRET, KEY, AAD);
  assert.equal(sealed.iv.length, 12);
  assert.equal(sealed.authTag.length, 16);
  assert.equal(sealed.keyVersion, 1);
  assert.ok(!sealed.ciphertext.toString("utf8").includes("SECRET"), "o ciphertext não carrega o claro");
  assert.equal(openSecret(sealed, KEY, AAD).reveal(), SECRET);
});

test("T-VLT-2 · authTag alterado em 1 bit → lança decrypt_failed, sem conteúdo", () => {
  const sealed = sealSecret(SECRET, KEY, AAD);
  const tag = Buffer.from(sealed.authTag);
  tag[0] = tag[0]! ^ 0b0000_0001;
  assert.throws(() => openSecret({ ...sealed, authTag: tag }, KEY, AAD), (error: unknown) => {
    assert.ok(isVaultError("decrypt_failed")(error));
    assert.ok(!String((error as Error).message).includes("SECRET"));
    return true;
  });
  // Chave errada: mesmo tratamento.
  assert.throws(() => openSecret(sealed, { key: randomBytes(32), version: 1 }, AAD), isVaultError("decrypt_failed"));
});

test("T-VLT-3 · AAD de outra linha → lança (não dá para recolar a credencial em outro provedor ou ambiente)", () => {
  const sealed = sealSecret(SECRET, KEY, AAD);
  assert.throws(() => openSecret(sealed, KEY, vaultAad("asaas", "production", "00000000-0000-0000-0000-000000000001")), isVaultError("decrypt_failed"));
  assert.throws(() => openSecret(sealed, KEY, vaultAad("iugu", "sandbox", "00000000-0000-0000-0000-000000000001")), isVaultError("decrypt_failed"));
  assert.throws(() => openSecret(sealed, KEY, vaultAad("asaas", "sandbox", "00000000-0000-0000-0000-000000000002")), isVaultError("decrypt_failed"));
});

test("T-VLT-4 · dois cifrados do mesmo claro têm IV e ciphertext distintos", () => {
  const first = sealSecret(SECRET, KEY, AAD);
  const second = sealSecret(SECRET, KEY, AAD);
  assert.notDeepEqual(first.iv, second.iv);
  assert.notDeepEqual(first.ciphertext, second.ciphertext);
});

test("T-VLT-6 · JSON.stringify de um VaultSecret lança never_serialize_secret", () => {
  const secret = new VaultSecret(SECRET);
  assert.throws(() => JSON.stringify({ s: secret }), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "never_serialize_secret");
    assert.ok(!String((error as Error).message).includes("SECRET"));
    return true;
  });
});

test("T-VLT-7 · String, template e inspect de um VaultSecret dão [redacted]", () => {
  const secret = new VaultSecret(SECRET);
  assert.equal(String(secret), "[redacted]");
  assert.equal(`${secret}`, "[redacted]");
  assert.equal(inspect({ s: secret }).includes("SECRET"), false);
  assert.equal(secret.reveal(), SECRET);
});

test("T-VLT-1b · impressão digital de 16 hex e last4", () => {
  assert.match(fingerprintOf(SECRET), /^[0-9a-f]{16}$/);
  assert.equal(fingerprintOf(SECRET), fingerprintOf(SECRET));
  assert.notEqual(fingerprintOf(SECRET), fingerprintOf(`${SECRET}!`));
  assert.equal(last4Of(SECRET), "-XYZ");
});

test("T-VLT-1c · chave do ambiente: só base64 de 32 bytes vale; versão e chave anterior", () => {
  const current = randomBytes(32).toString("base64");
  const previous = randomBytes(32).toString("base64");
  assert.equal(parseVaultKey(""), null);
  assert.equal(parseVaultKey(randomBytes(31).toString("base64")), null);
  assert.equal(parseVaultKey("não-é-base64!"), null);
  assert.equal(parseVaultKey(current)?.length, 32);

  const keys = new EnvVaultKeyProvider({ BILLING_VAULT_KEY: current, BILLING_VAULT_KEY_VERSION: "2", BILLING_VAULT_KEY_PREVIOUS: previous, BILLING_VAULT_KEY_PREVIOUS_VERSION: "1" });
  assert.equal(vaultStatus(keys), "available");
  assert.equal(keys.current()?.version, 2);
  assert.equal(keys.previous()?.version, 1);
  assert.equal(keyForVersion(keys, 2), keys.current());
  assert.equal(keyForVersion(keys, 1), keys.previous());
  assert.equal(keyForVersion(keys, 7), null, "versão desconhecida → linha ilegível");

  assert.equal(vaultStatus(new EnvVaultKeyProvider({})), "unavailable");
  assert.equal(new EnvVaultKeyProvider({ BILLING_VAULT_KEY: current, BILLING_VAULT_KEY_PREVIOUS: current, BILLING_VAULT_KEY_PREVIOUS_VERSION: "1", BILLING_VAULT_KEY_VERSION: "2" }).previous(), null, "anterior igual à atual não vale");
  assert.equal(new EnvVaultKeyProvider({ BILLING_VAULT_KEY: current, BILLING_VAULT_KEY_VERSION: "2", BILLING_VAULT_KEY_PREVIOUS: previous, BILLING_VAULT_KEY_PREVIOUS_VERSION: "3" }).previous(), null, "versão anterior >= atual não vale");
});
