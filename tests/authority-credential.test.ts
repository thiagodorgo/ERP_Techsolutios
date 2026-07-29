import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { app } from "../src/app.js";
import {
  AuthorityCredentialService,
  createMemoryAuthorityCredentialService,
  resetAuthorityCredentialRuntimeForTests,
} from "../src/modules/authority/authority-credential.service.js";
import { InMemoryAuthorityCredentialRepository } from "../src/modules/authority/authority-credential.repository.js";
import { verifyPassword, type ScryptParams } from "../src/modules/authority/authority-password.js";
import type { AuthorityActorContext } from "../src/modules/authority/authority-credential.types.js";

const FAST_PARAMS: ScryptParams = { N: 2 ** 10, r: 8, p: 1, keylen: 32 };

function actor(): AuthorityActorContext {
  return { tenantId: randomUUID(), userId: randomUUID() };
}

// ── serviço de provisionamento (unit) ───────────────────────────────────────────────────────────────────────────
test("provisionamento: create GERA senha aleatória (devolvida UMA vez), o hash verifica, o DTO nunca traz o hash", async () => {
  const repo = new InMemoryAuthorityCredentialRepository();
  const service = new AuthorityCredentialService(repo, FAST_PARAMS);
  const a = actor();
  const { credential, generatedPassword } = await service.create(a, { authority_name: "Órgão XPTO", username: "Orgao.XPTO" });

  assert.ok(generatedPassword && generatedPassword.length >= 20, "senha inicial gerada e devolvida uma vez");
  assert.equal(credential.username, "orgao.xpto", "username normalizado (minúsculas)");
  assert.equal(credential.status, "ACTIVE");
  // A senha NUNCA fica em claro no banco — só o hash, que VERIFICA a senha devolvida.
  const stored = await repo.findByUsername(a.tenantId, "orgao.xpto");
  assert.ok(stored && stored.passwordHash.startsWith("scrypt$"));
  assert.equal(await verifyPassword(generatedPassword!, stored!.passwordHash), true);
  // O objeto de domínio tem o hash, mas o "credential" retornado nunca é servido cru — o controller usa o DTO.
  // (o DTO é testado no fluxo HTTP abaixo).
});

test("provisionamento: create com senha DEFINIDA pelo admin → generatedPassword ausente; hash verifica a definida", async () => {
  const repo = new InMemoryAuthorityCredentialRepository();
  const service = new AuthorityCredentialService(repo, FAST_PARAMS);
  const a = actor();
  const { credential, generatedPassword } = await service.create(a, {
    authority_name: "Órgão YWZ",
    username: "orgao.ywz",
    password: "senha-definida-pelo-admin",
  });
  assert.equal(generatedPassword, undefined, "admin definiu a senha → nada é devolvido");
  const stored = await repo.findByUsername(a.tenantId, "orgao.ywz");
  assert.equal(await verifyPassword("senha-definida-pelo-admin", stored!.passwordHash), true);
  assert.equal(credential.status, "ACTIVE");
});

test("provisionamento: rotate troca o hash e ZERA o lockout; suspend/revoke mudam o status; username duplicado → 409", async () => {
  const repo = new InMemoryAuthorityCredentialRepository();
  const service = new AuthorityCredentialService(repo, FAST_PARAMS);
  const a = actor();
  const { credential } = await service.create(a, { authority_name: "Órgão Z", username: "orgao.z", password: "senha-inicial-000" });
  // trava artificialmente e rotaciona → destrava + hash novo.
  await repo.applyFailedLogin(a.tenantId, credential.id, 9, new Date(Date.now() + 3_600_000));
  const rotated = await service.rotatePassword(a, credential.id, { password: "senha-rotacionada-111" });
  assert.equal(rotated.credential.failedLoginCount, 0);
  assert.equal(rotated.credential.lockedUntil, null);
  const stored = await repo.findByUsername(a.tenantId, "orgao.z");
  assert.equal(await verifyPassword("senha-rotacionada-111", stored!.passwordHash), true);

  const suspended = await service.suspend(a, credential.id);
  assert.equal(suspended.status, "SUSPENDED");
  const revoked = await service.revoke(a, credential.id);
  assert.equal(revoked.status, "REVOKED");

  await assert.rejects(
    () => service.create(a, { authority_name: "Órgão Z2", username: "ORGAO.Z", password: "outra-senha-222" }),
    /already exists/i,
    "username duplicado (mesma chave normalizada) → 409",
  );
});

test("provisionamento: create com senha curta (<10) → 400 password_invalid", async () => {
  const service = createMemoryAuthorityCredentialService(FAST_PARAMS);
  resetAuthorityCredentialRuntimeForTests();
  await assert.rejects(
    () => service.create(actor(), { authority_name: "Órgão", username: "curta.org", password: "123" }),
    /between 10 and 200/i,
  );
});

// ── (7) SoD — provisionamento sob /api/v1 negado a manager/operator; concedido a tenant_admin; a credencial não
//    alcança /api/v1 (o login é o BFF isolado, não /api/v1) ───────────────────────────────────────────────────────
async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = app.listen(0);
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = (server as Server).address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function headers(roles: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": randomUUID(),
    "x-user-id": randomUUID(),
    "x-roles": roles,
  };
}

test("SoD: POST /api/v1/authority-credentials — manager e operator → 403; tenant_admin → 201; sem auth → 403", async () => {
  resetAuthorityCredentialRuntimeForTests();
  await withServer(async (baseUrl) => {
    // Sem senha no corpo → o serviço GERA uma e a devolve UMA vez (prova do fluxo de provisionamento).
    const body = JSON.stringify({ authority_name: "Órgão HTTP", username: `org.${Date.now()}` });

    for (const role of ["manager", "operator", "finance", "auditor"]) {
      const res = await fetch(`${baseUrl}/api/v1/authority-credentials`, { method: "POST", headers: headers(role), body });
      assert.equal(res.status, 403, `${role} não pode provisionar (SoD)`);
      assert.equal((await res.json()).error.code, "FORBIDDEN");
    }

    // sem NENHUM header de auth → 403 (tenant_required): a superfície /api/v1 exige auth do ERP — que a credencial
    // da autoridade JAMAIS possui (ela não recebe roles/permissions do ERP).
    const anon = await fetch(`${baseUrl}/api/v1/authority-credentials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    assert.equal(anon.status, 403);

    // tenant_admin PASSA o gate de SoD (não é bloqueado por permissão). O create em si depende do backing store:
    // em memory (CI) → 201; contra o Postgres com um tenant sintético do header → a inserção falha na FK do tenant
    // (o gate JÁ abriu). O teste SoD prova o GATE; a mecânica do create é coberta pelos testes de serviço acima.
    const ok = await fetch(`${baseUrl}/api/v1/authority-credentials`, { method: "POST", headers: headers("tenant_admin"), body });
    assert.notEqual(ok.status, 403, "tenant_admin passa o gate de authority_credentials:manage (SoD)");
    if (ok.status === 201) {
      const created = (await ok.json()).data as Record<string, unknown>;
      assert.ok(typeof created.id === "string");
      assert.ok(typeof created.generatedPassword === "string", "a senha gerada volta UMA vez");
      assert.equal("passwordHash" in created, false, "o DTO NUNCA expõe o hash (§2.8)");
      assert.equal("tenantId" in created, false, "o DTO NUNCA ecoa o tenant_id");
    }

    // list como tenant_admin → 200 (autorizado; tenant sintético → lista vazia, mas passa o gate).
    const list = await fetch(`${baseUrl}/api/v1/authority-credentials`, { method: "GET", headers: headers("tenant_admin") });
    assert.equal(list.status, 200);
  });
});

test("isolamento: o LOGIN da autoridade NÃO vive em /api/v1 (a credencial não alcança o ERP)", async () => {
  await withServer(async (baseUrl) => {
    // Não existe rota de login da autoridade sob /api/v1 — ela é o BFF ISOLADO (portal-app). → 404 route_not_found.
    const res = await fetch(`${baseUrl}/api/v1/authority/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "x", password: "y" }),
    });
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.reason, "route_not_found");
  });
});
