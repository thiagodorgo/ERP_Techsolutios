// B-ASS-05 — o serviço do cofre com o dublê em memória (plano §4.5): sem chave (R-VLT-4), rotação (R-VLT-5),
// um segredo por kind (R-VLT-10) e a allowlist da trilha (R-VLT-7).
// Mutações do plano: recifrar só a primeira → T-VLT-10 vermelho; abortar na ilegível → T-VLT-17 vermelho;
// slot sem `kind` → T-VLT-20 vermelho.

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { RecordingPlatformAuditWriter } from "../src/modules/subscription-billing/plans/platform-audit.js";
import { pickBillingAuditMetadata } from "../src/modules/subscription-billing/platform-audit/audit-metadata.js";
import { fingerprintOf, sealSecret, vaultAad } from "../src/modules/subscription-billing/vault/vault.crypto.js";
import { EnvVaultKeyProvider } from "../src/modules/subscription-billing/vault/vault-keys.js";
import { InMemoryCredentialRepository, type StoredCredential } from "../src/modules/subscription-billing/vault/vault.repository.js";
import { VaultService, VaultServiceError } from "../src/modules/subscription-billing/vault/vault.service.js";

const SECRET = "SECRET-ABC123-XYZ";
const ACTOR = "11111111-1111-4111-8111-111111111111";
const K1 = randomBytes(32).toString("base64");
const K2 = randomBytes(32).toString("base64");

function setup(env: ConstructorParameters<typeof EnvVaultKeyProvider>[0] = { BILLING_VAULT_KEY: K1, BILLING_VAULT_KEY_VERSION: "1" }) {
  const repository = new InMemoryCredentialRepository();
  const audit = new RecordingPlatformAuditWriter();
  const service = new VaultService(repository, new EnvVaultKeyProvider(env), audit);
  return { repository, audit, service };
}

const rejects = (reason: string, status: number) => (error: unknown) =>
  error instanceof VaultServiceError && error.reason === reason && error.status === status && !error.message.includes("SECRET");

test("T-VLT-8 · sem chave: gravar credencial → 503 vault_unavailable, e nada é gravado", async () => {
  const { service, repository } = setup({});
  assert.equal(service.status(), "unavailable");
  await assert.rejects(service.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: SECRET }, actorId: ACTOR }), rejects("vault_unavailable", 503));
  assert.equal(repository.allForTests().length, 0);
});

test("T-VLT-9 · sem chave: o resumo segue (configured: true, readable: false) e decifrar → 503", async () => {
  const first = setup();
  await first.service.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: SECRET }, actorId: ACTOR });
  const keyless = new VaultService(first.repository, new EnvVaultKeyProvider({}), first.audit);
  assert.deepEqual(await keyless.readability("asaas", "sandbox"), { configured: true, readable: false });
  const [summary] = await keyless.list("asaas", "sandbox");
  assert.equal(summary!.last4, "-XYZ");
  await assert.rejects(keyless.readSecretForProvider("asaas", "sandbox", "api_token"), rejects("vault_unavailable", 503));
});

test("T-VLT-5b · o resumo é só kind, impressão digital, last4, data e versão; o claro só sai como VaultSecret", async () => {
  const { service } = setup();
  const summary = await service.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: SECRET }, actorId: ACTOR });
  assert.deepEqual(Object.keys(summary).sort(), ["createdAt", "fingerprint", "keyVersion", "kind", "last4"]);
  assert.equal(summary.fingerprint, fingerprintOf(SECRET));
  assert.match(summary.fingerprint, /^[0-9a-f]{16}$/);
  assert.equal(JSON.stringify(summary).includes("SECRET"), false);
  const secret = await service.readSecretForProvider("asaas", "sandbox", "api_token");
  assert.equal(secret!.reveal(), SECRET);
  assert.equal(String(secret), "[redacted]");
});

test("T-VLT-20 · um segredo vivo por kind: webhook_secret não revoga o api_token; um 2º api_token revoga o 1º", async () => {
  const { service, repository } = setup();
  await service.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: "token-1-AAAA" }, actorId: ACTOR });
  await service.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "webhook_secret", secret: "hook-1-BBBB" }, actorId: ACTOR });
  assert.deepEqual((await service.list("asaas", "sandbox")).map((row) => row.kind).sort(), ["api_token", "webhook_secret"]);
  await service.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: "token-2-CCCC" }, actorId: ACTOR });
  const active = await service.list("asaas", "sandbox");
  assert.deepEqual(active.map((row) => [row.kind, row.last4]).sort(), [["api_token", "CCCC"], ["webhook_secret", "BBBB"]]);
  const all = repository.allForTests();
  assert.equal(all.length, 3, "nunca DELETE: a revogada fica");
  assert.equal(all.filter((row) => row.revokedAt !== null).length, 1);
  // O ambiente faz parte do slot: produção não revoga sandbox.
  await service.setCredential({ provider: "asaas", environment: "production", credential: { kind: "api_token", secret: "prod-DDDD" }, actorId: ACTOR });
  assert.equal((await service.list("asaas", "sandbox")).length, 2);
});

test("T-VLT-21 · kind inválido → 400; secret vazio → 400", async () => {
  const { service } = setup();
  await assert.rejects(service.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "password", secret: SECRET } as never, actorId: ACTOR }), rejects("invalid_credential_kind", 400));
  await assert.rejects(service.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: "  " }, actorId: ACTOR }), rejects("invalid_secret", 400));
});

test("T-VLT-22 · certificate exige pfxBase64 e password; o last4 é do PFX, nunca da senha", async () => {
  const { service } = setup();
  await assert.rejects(service.setCredential({ provider: "focusnfe", environment: "sandbox", credential: { kind: "certificate", pfxBase64: "", password: "x" }, actorId: ACTOR }), rejects("certificate_requires_pfx_and_password", 400));
  await assert.rejects(service.setCredential({ provider: "focusnfe", environment: "sandbox", credential: { kind: "certificate", pfxBase64: "TUlJQ0VSVA==", password: "" }, actorId: ACTOR }), rejects("certificate_requires_pfx_and_password", 400));
  const summary = await service.setCredential({ provider: "focusnfe", environment: "sandbox", credential: { kind: "certificate", pfxBase64: "TUlJQ0VSVA==", password: "SENHA-9876" }, actorId: ACTOR });
  assert.equal(summary.last4, "VA==");
  const secret = await service.readSecretForProvider("focusnfe", "sandbox", "certificate");
  assert.deepEqual(JSON.parse(secret!.reveal()), { pfxBase64: "TUlJQ0VSVA==", password: "SENHA-9876" });
});

function legacyRow(key: Buffer, version: number, plaintext: string, kind: StoredCredential["kind"], revoked = false): StoredCredential {
  const id = randomUUID();
  const sealed = sealSecret(plaintext, { key, version }, vaultAad("asaas", "sandbox", id));
  return {
    id, provider: "asaas", environment: "sandbox", kind, ...sealed,
    fingerprint: fingerprintOf(plaintext), last4: plaintext.slice(-4), createdBy: null,
    createdAt: new Date("2026-11-01T12:00:00Z"), rotatedFromId: null, revokedAt: revoked ? new Date("2026-11-02T12:00:00Z") : null,
  };
}

test("T-VLT-10/11/17 · rotação: 2 vivas v1 recifradas em v2, a revogada intocada, a ilegível listada e sem travar", async () => {
  const repository = new InMemoryCredentialRepository();
  const k1 = Buffer.from(K1, "base64");
  const live1 = legacyRow(k1, 1, "token-AAAA", "api_token");
  const live2 = { ...legacyRow(k1, 1, "hook-BBBB", "webhook_secret") };
  const revoked = legacyRow(k1, 1, "old-CCCC", "api_token", true);
  const unknown = { ...legacyRow(randomBytes(32), 7, "lost-DDDD", "certificate") };
  for (const row of [unknown, live1, revoked, live2]) repository.seedForTests(row);

  const audit = new RecordingPlatformAuditWriter();
  const v2 = new VaultService(repository, new EnvVaultKeyProvider({ BILLING_VAULT_KEY: K2, BILLING_VAULT_KEY_VERSION: "2", BILLING_VAULT_KEY_PREVIOUS: K1, BILLING_VAULT_KEY_PREVIOUS_VERSION: "1" }), audit);
  const result = await v2.rotate(ACTOR);

  assert.equal(result.rotated.length, 2, "as 2 vivas de v1");
  assert.deepEqual(result.unreadable, [unknown.id], "a de versão 7 é listada, a ilegível não trava as outras");
  const all = repository.allForTests();
  const fresh = all.filter((row) => result.rotated.includes(row.id));
  assert.ok(fresh.every((row) => row.keyVersion === 2 && row.revokedAt === null));
  assert.deepEqual(fresh.map((row) => row.rotatedFromId).sort(), [live1.id, live2.id].sort());
  assert.ok(all.find((row) => row.id === live1.id)!.revokedAt, "a antiga ganha revoked_at");
  assert.equal(all.find((row) => row.id === revoked.id)!.revokedAt!.toISOString(), "2026-11-02T12:00:00.000Z", "a já revogada não é tocada");
  assert.equal(all.filter((row) => row.id === revoked.id || row.rotatedFromId === revoked.id).length, 1);

  // T-VLT-11: sem a chave anterior, as linhas novas decifram com a atual.
  const onlyV2 = new VaultService(repository, new EnvVaultKeyProvider({ BILLING_VAULT_KEY: K2, BILLING_VAULT_KEY_VERSION: "2" }), audit);
  assert.equal((await onlyV2.readSecretForProvider("asaas", "sandbox", "api_token"))!.reveal(), "token-AAAA");
  assert.equal((await onlyV2.readSecretForProvider("asaas", "sandbox", "webhook_secret"))!.reveal(), "hook-BBBB");

  const trail = audit.list().find((entry) => entry.action === "vault.rotated")!;
  assert.deepEqual(trail.metadata, { actor_user_id: ACTOR, credential_ids: result.rotated, unreadable_ids: [unknown.id], rotated_count: 2, unreadable_count: 1 });
});

test("T-VLT-17b · chave errada no lugar da certa: decifrar → 503 sem conteúdo e trilha vault.decrypt_failed", async () => {
  const first = setup();
  await first.service.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: SECRET }, actorId: ACTOR });
  const wrong = new VaultService(first.repository, new EnvVaultKeyProvider({ BILLING_VAULT_KEY: K2, BILLING_VAULT_KEY_VERSION: "1" }), first.audit);
  await assert.rejects(wrong.readSecretForProvider("asaas", "sandbox", "api_token"), rejects("vault_unavailable", 503));
  const failed = first.audit.list().find((entry) => entry.action === "vault.decrypt_failed")!;
  assert.equal(JSON.stringify(failed).includes("SECRET"), false);
  assert.deepEqual(Object.keys(failed.metadata!).sort(), ["actor_user_id", "credential_ids", "environment", "kind", "provider"]);
  assert.equal(failed.metadata!.actor_user_id, null, "ninguém agiu: foi a leitura de um adaptador");
});

test("T-VLT-13 · a trilha passa pela allowlist própria: token, PFX e senha injetados não saem", async () => {
  const injected = {
    actor_user_id: ACTOR,
    provider: "focusnfe",
    environment: "sandbox",
    kind: "certificate",
    fingerprint: "0123456789abcdef",
    token: SECRET,
    certificatePfxBase64: "TUlJQ0VSVA==",
    password: "SENHA-9876",
    secret: SECRET,
    note: "texto livre",
  };
  const picked = pickBillingAuditMetadata(injected);
  assert.deepEqual(Object.keys(picked).sort(), ["actor_user_id", "environment", "fingerprint", "kind", "provider"]);
  assert.deepEqual(pickBillingAuditMetadata({ fingerprint: SECRET, provider: "Asaas Pago!" }), {}, "valor fora da forma também cai");

  const { service, audit } = setup();
  await service.setCredential({ provider: "focusnfe", environment: "sandbox", credential: { kind: "certificate", pfxBase64: "TUlJQ0VSVA==", password: "SENHA-9876" }, actorId: ACTOR });
  await service.setCredential({ provider: "focusnfe", environment: "sandbox", credential: { kind: "certificate", pfxBase64: "T1VUUk8=", password: "SENHA-1111" }, actorId: ACTOR });
  const serialized = JSON.stringify(audit.list());
  for (const forbidden of ["TUlJQ0VSVA", "T1VUUk8", "SENHA-", "pfxBase64", "password"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(audit.list().map((entry) => entry.action), ["billing_provider.credential_set", "billing_provider.credential_revoked", "billing_provider.credential_set"]);
});
