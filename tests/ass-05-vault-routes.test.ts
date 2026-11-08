// B-ASS-05 · F4/F5 — rotas do cofre e dos provedores pelo app real, num processo PRÓPRIO (o teste lê o stdout e o
// stderr reais): o segredo não sai em resposta, log, trilha nem erro (R-VLT-2, T-VLT-5); JSON malformado não ecoa o
// corpo (R-VLT-11, T-VLT-23); sem chave (R-VLT-4); permissão e trilha (R-VLT-7); kinds por provedor.
// Mutações do plano: devolver o segredo no GET → T-VLT-5 vermelho; logar o corpo → T-VLT-5 vermelho; remover o
// tratador `entity.parse.failed` do app.ts → T-VLT-23 vermelho.

import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECRET = "SECRET-ABC123-XYZ";
const CERT_PASSWORD = "CERT-PASSWORD-7788";
const PFX = Buffer.from("PFX-BINARIO-DE-TESTE-0001").toString("base64");
const K1 = randomBytes(32).toString("base64");
const K2 = randomBytes(32).toString("base64");
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const TENANT_MANAGER = { "x-tenant-id": "ten_demo", "x-user-id": "usr_demo", "x-role": "manager" } as const;

type Server = {
  readonly baseUrl: string;
  readonly output: () => string;
  command(line: string, prefix: string): Promise<string>;
  stop(): Promise<void>;
};

async function startServer(env: Record<string, string>): Promise<Server> {
  const child: ChildProcessWithoutNullStreams = spawn(process.execPath, ["--import", "tsx", path.join(ROOT, "tests/helpers/ass-05-vault-server.ts")], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "development", LOG_LEVEL: "trace", JWT_SECRET: "dev-only-change-me", CORE_SAAS_PERSISTENCE: "memory", ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });

  const waitFor = async (prefix: string, after: number): Promise<string> => {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const line = stdout.slice(after).split("\n").find((candidate) => candidate.startsWith(prefix));
      if (line !== undefined) return line;
      if (child.exitCode !== null) throw new Error(`servidor saiu (${child.exitCode}): ${stderr.slice(-2000)}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`sem "${prefix}" em 30 s: ${stderr.slice(-2000)}`);
  };

  const port = (await waitFor("PORT ", 0)).slice(5).trim();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    output: () => stdout + stderr,
    async command(line, prefix) {
      const mark = stdout.length;
      child.stdin.write(`${line}\n`);
      return (await waitFor(prefix, mark)).slice(prefix.length);
    },
    async stop() {
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    },
  };
}

async function call(server: Server, method: string, route: string, options: { headers?: Record<string, string>; body?: unknown; raw?: string } = {}) {
  const response = await fetch(server.baseUrl + route, {
    method,
    headers: { "content-type": "application/json", ...(options.headers ?? PLATFORM) },
    body: method === "GET" ? undefined : (options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body))),
  });
  const text = await response.text();
  return { status: response.status, text, body: text ? (JSON.parse(text) as Record<string, any>) : {} };
}

const FOCUS = { cnpj: "11222333000181", regimeTributario: "simples_nacional", municipioIbge: "3550308", cTribNac: "010701", tributacaoIss: "1", regimeEspecialTributacao: "0", codigoOpcaoSimplesNacional: "1", serieDps: "1" };

test("T-VLT-5 · o segredo não sai: nenhuma resposta, log, trilha ou erro de todas as rotas do cofre o carrega", async () => {
  const server = await startServer({ BILLING_VAULT_KEY: K1, BILLING_VAULT_KEY_VERSION: "1" });
  try {
    const responses: string[] = [];
    const record = (result: { text: string }) => { responses.push(result.text); return result; };

    assert.equal(record(await call(server, "PUT", "/api/v1/platform/billing/providers/asaas", { body: { environment: "sandbox", settings: {} } })).status, 200);
    const set = record(await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { body: { kind: "api_token", secret: SECRET } }));
    assert.equal(set.status, 200, set.text);
    assert.match(set.body.data.fingerprint, /^[0-9a-f]{16}$/);
    assert.equal(set.body.data.last4, "-XYZ");
    assert.deepEqual(Object.keys(set.body.data).sort(), ["createdAt", "environment", "fingerprint", "keyVersion", "kind", "last4", "provider"]);

    record(await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { body: { kind: "webhook_secret", secret: `${SECRET}-HOOK` } }));
    record(await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { body: { kind: "api_token", secret: `${SECRET}-2` } }));
    record(await call(server, "PUT", "/api/v1/platform/billing/providers/focusnfe", { body: { settings: FOCUS } }));
    const cert = record(await call(server, "PUT", "/api/v1/platform/billing/providers/focusnfe/credentials", { body: { kind: "certificate", pfxBase64: PFX, password: CERT_PASSWORD } }));
    assert.equal(cert.status, 200, cert.text);
    const list = record(await call(server, "GET", "/api/v1/platform/billing/providers"));
    assert.equal(list.status, 200);
    const one = record(await call(server, "GET", "/api/v1/platform/billing/providers/asaas"));
    assert.deepEqual(one.body.data.credentials.map((row: { kind: string }) => row.kind).sort(), ["api_token", "webhook_secret"]);
    assert.equal(record(await call(server, "POST", "/api/v1/platform/billing/vault/rotate")).status, 200);

    // Os 3 erros forçados: corpo inválido, chave errada e authTag quebrado.
    const malformed = record(await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { raw: `{"kind":"api_token","secret":${SECRET}}` }));
    assert.deepEqual([malformed.status, malformed.body.error.reason], [400, "invalid_json"]);
    assert.equal(await server.command(`keys ${K2} 1`, "OK "), "keys");
    assert.equal(await server.command("read asaas api_token", "READ "), "vault_unavailable", "chave errada: 503, sem conteúdo");
    assert.equal(await server.command(`keys ${K2} 2 ${K1} 1`, "OK "), "keys");
    await server.command("breaktag", "OK ");
    const rotated = record(await call(server, "POST", "/api/v1/platform/billing/vault/rotate"));
    assert.equal(rotated.status, 200);
    assert.equal(rotated.body.data.unreadable.length, 3, "authTag quebrado: as 3 vivas listadas, sem travar");

    const dump = await server.command("dump", "DUMP ");
    const trail = JSON.parse(dump) as { audit: unknown[]; rows: { ciphertextHex: string }[] };
    const serializedTrail = JSON.stringify(trail.audit);
    const everything = [...responses, server.output(), serializedTrail];
    for (const forbidden of [SECRET, "ABC123", CERT_PASSWORD, PFX]) {
      assert.equal(everything.some((chunk) => chunk.includes(forbidden)), false, `"${forbidden}" vazou`);
    }
    // O claro também não está guardado como texto: o banco só tem ciphertext.
    assert.equal(trail.rows.some((row) => Buffer.from(row.ciphertextHex, "hex").toString("utf8").includes("SECRET")), false);
  } finally {
    await server.stop();
  }
});

test("T-VLT-23 · JSON malformado em desenvolvimento → 400 invalid_json, e o trecho do corpo não vai ao stderr/stdout", async () => {
  const server = await startServer({ BILLING_VAULT_KEY: K1 });
  try {
    const result = await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { raw: `{"secret":${SECRET}}` });
    assert.equal(result.status, 400);
    assert.deepEqual(result.body.error, { code: "BAD_REQUEST", reason: "invalid_json", message: "The request body is not valid JSON." });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(server.output().includes("SECRET-ABC"), false);
  } finally {
    await server.stop();
  }
});

test("T-VLT-8/9 · sem chave: gravar credencial → 503 vault_unavailable; a leitura e o resto do app seguem (health 200)", async () => {
  const server = await startServer({ BILLING_VAULT_KEY: "" });
  try {
    const put = await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { body: { kind: "api_token", secret: SECRET } });
    assert.deepEqual([put.status, put.body.error.reason], [503, "vault_unavailable"]);
    const get = await call(server, "GET", "/api/v1/platform/billing/providers/asaas");
    assert.equal(get.status, 200);
    assert.equal(get.body.vault.status, "unavailable");
    assert.deepEqual(get.body.data.credentials, []);
    assert.equal((await call(server, "POST", "/api/v1/platform/billing/vault/rotate")).status, 503);
    assert.equal((await call(server, "GET", "/api/v1/health", { headers: {} })).status, 200);
    assert.equal(server.output().includes(SECRET), false);
  } finally {
    await server.stop();
  }
});

test("T-VLT-12/14 · permissão e contrato: ator de organização ou sem ator → 403 (guarda de plataforma da casa); provedor desconhecido → 404; certificado em provedor de pagamento → 400", async () => {
  const server = await startServer({ BILLING_VAULT_KEY: K1 });
  try {
    const routes: [string, string][] = [
      ["GET", "/api/v1/platform/billing/providers"],
      ["GET", "/api/v1/platform/billing/providers/asaas"],
      ["PUT", "/api/v1/platform/billing/providers/asaas"],
      ["PUT", "/api/v1/platform/billing/providers/asaas/credentials"],
      ["POST", "/api/v1/platform/billing/vault/rotate"],
    ];
    for (const [method, route] of routes) {
      const tenant = await call(server, method, route, { headers: TENANT_MANAGER, body: { kind: "api_token", secret: SECRET } });
      assert.deepEqual([tenant.status, tenant.body.error?.reason], [403, "platform_permission_required"], `${method} ${route}: ${tenant.text}`);
      const anonymous = await call(server, method, route, { headers: {}, body: {} });
      assert.deepEqual([anonymous.status, anonymous.body.error?.reason], [403, "platform_actor_required"], `${method} ${route}`);
    }
    assert.equal((await call(server, "GET", "/api/v1/platform/billing/providers/pagseguro")).status, 404);
    const certificate = await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { body: { kind: "certificate", pfxBase64: PFX, password: CERT_PASSWORD } });
    assert.deepEqual([certificate.status, certificate.body.error.reason], [400, "credential_kind_not_supported"]);
    const kind = await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { body: { kind: "senha", secret: SECRET } });
    assert.deepEqual([kind.status, kind.body.error.reason], [400, "invalid_credential_kind"]);
    const secretInSettings = await call(server, "PUT", "/api/v1/platform/billing/providers/asaas", { body: { settings: { apiToken: SECRET } } });
    assert.deepEqual([secretInSettings.status, secretInSettings.body.error.reason], [400, "secret_in_settings"]);
    assert.equal(server.output().includes(SECRET), false);
  } finally {
    await server.stop();
  }
});

test("T-VLT-18 · cada escrita gera a sua linha de trilha, só com chaves da allowlist", async () => {
  const server = await startServer({ BILLING_VAULT_KEY: K1 });
  try {
    await call(server, "PUT", "/api/v1/platform/billing/providers/asaas", { body: { environment: "sandbox", settings: {} } });
    await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { body: { kind: "api_token", secret: SECRET } });
    await call(server, "PUT", "/api/v1/platform/billing/providers/asaas/credentials", { body: { kind: "api_token", secret: `${SECRET}-2` } });
    await call(server, "POST", "/api/v1/platform/billing/vault/rotate");
    const { audit } = JSON.parse(await server.command("dump", "DUMP ")) as { audit: { action: string; metadata: Record<string, unknown> }[] };
    assert.deepEqual(audit.map((entry) => entry.action), [
      "billing_provider.settings_updated",
      "billing_provider.credential_set",
      "billing_provider.credential_revoked",
      "billing_provider.credential_set",
      "vault.rotated",
    ]);
    const allowed = new Set(["actor_user_id", "provider", "environment", "kind", "fingerprint", "credential_ids", "unreadable_ids", "rotated_count", "unreadable_count"]);
    for (const entry of audit) {
      for (const key of Object.keys(entry.metadata)) assert.ok(allowed.has(key), `${entry.action}: chave ${key} fora da allowlist`);
    }
    assert.match(String(audit[1]!.metadata.fingerprint), /^[0-9a-f]{16}$/);
  } finally {
    await server.stop();
  }
});
