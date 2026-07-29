import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { createPortalApp } from "../src/portal-app.js";
import { AuthorityRemovalService } from "../src/modules/authority/authority-removal.service.js";
import { createAuthorityPortalRouter } from "../src/modules/authority/authority-portal.routes.js";
import {
  AuthorityRemovalConsumptionAdapter,
  InMemoryAuthorityRemovalRepository,
} from "../src/modules/authority/authority-removal.repository.js";
import { InMemoryAuthorityCredentialRepository } from "../src/modules/authority/authority-credential.repository.js";
import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import type { AuthorityCredentialStatus } from "../src/modules/authority/authority-credential.types.js";
import {
  AntiAbuse,
  InMemoryPortalAccessLogRepository,
  signAuthoritySession,
  signOwnerSession,
  type AntiAbuseConfig,
} from "../src/modules/portal-shared/index.js";

// Ω5P PR-18b — solicitar remoção (memory). A ORIGEM da OS(open)→custódia se prova a fundo nos testes DB-gated
// (authority-removal-rls.test.ts: partial-unique 23505, FK RESTRICT, RLS cross-tenant, sweep→RECEPÇÃO). Aqui: SoD
// (OS 'open' nunca 'completed'), revogação no consumo, anti-spoof do órgão, fail-closed do catálogo, anti-spam,
// §2.8, 401 uniforme, rate-limit. Sempre-roda (não precisa de Postgres).

const TENANT = randomUUID();
const LOG_SECRET = "test-removal-log-secret";
const AUTHORITY_SECRET = "test-authority-session-secret";
const OWNER_SECRET = "test-owner-session-secret";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const BASE_ANTI_ABUSE: AntiAbuseConfig = {
  ipBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
  plateBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
  readBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
  baseDifficulty: 2,
  maxDifficulty: 5,
  failuresPerStep: 1,
  failureWindowMs: 60_000,
};

type Harness = {
  readonly service: AuthorityRemovalService;
  readonly removals: InMemoryAuthorityRemovalRepository;
  readonly workOrders: InMemoryWorkOrderRepository;
  readonly credentials: InMemoryAuthorityCredentialRepository;
  readonly accessLog: InMemoryPortalAccessLogRepository;
};

// catalogId: string → o resolver devolve esse id (1 catálogo → origina); null → fail-closed (0 ou ≥2 → enfileira).
function buildHarness(opts: { catalogId: string | null; antiAbuse?: Partial<AntiAbuseConfig>; minLatencyMs?: number }): Harness {
  const workOrders = new InMemoryWorkOrderRepository();
  const removals = new InMemoryAuthorityRemovalRepository(workOrders);
  const credentials = new InMemoryAuthorityCredentialRepository();
  const accessLog = new InMemoryPortalAccessLogRepository();
  const antiAbuse = new AntiAbuse({ ...BASE_ANTI_ABUSE, ...opts.antiAbuse });
  const consumption = new AuthorityRemovalConsumptionAdapter(credentials, async () => opts.catalogId);
  const service = new AuthorityRemovalService({
    tenantId: TENANT,
    consumption,
    removals,
    accessLog,
    antiAbuse,
    logSecret: LOG_SECRET,
    sessionSecret: AUTHORITY_SECRET,
    minLatencyMs: opts.minLatencyMs ?? 0,
  });
  return { service, removals, workOrders, credentials, accessLog };
}

async function seedCredential(
  credentials: InMemoryAuthorityCredentialRepository,
  opts: { status?: AuthorityCredentialStatus; authorityName?: string } = {},
): Promise<string> {
  const cred = await credentials.create({
    tenantId: TENANT,
    authorityName: opts.authorityName ?? "Órgão Municipal de Trânsito",
    username: `u-${randomUUID().slice(0, 8)}`,
    passwordHash: "scrypt$1024$8$1$c2FsdA$aGFzaA",
    createdBy: null,
  });
  if (opts.status && opts.status !== "ACTIVE") await credentials.updateStatus(TENANT, cred.id, opts.status);
  return cred.id;
}

function makeSession(credentialId: string, opts: { secret?: string; ttlSeconds?: number } = {}): Promise<string> {
  return signAuthoritySession({ credentialId }, { secret: opts.secret ?? AUTHORITY_SECRET, ttlSeconds: opts.ttlSeconds });
}

async function totalWorkOrders(h: Harness): Promise<number> {
  return (await h.workOrders.list({ tenantId: TENANT, limit: 1000, offset: 0 })).total;
}

// ── HTTP harness (createPortalApp com o authorityRouter injetado; só a rota /removals é exercitada) ────────────────
async function withApp(service: AuthorityRemovalService, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const router = createAuthorityPortalRouter(undefined, () => Promise.resolve(service));
  const app = createPortalApp({ authorityRouter: router });
  const server = app.listen(0);
  try {
    await run(await getBaseUrl(server));
  } finally {
    await closeServer(server);
  }
}
async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
async function postRemoval(baseUrl: string, token: string | null, body: unknown): Promise<{ status: number; text: string }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}/portal/v1/authority/removals`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: response.status, text: await response.text() };
}

// ── (1) SoD — a OS nasce 'open' (NUNCA 'completed'), vinculada ao catálogo de remoção, veículo NÃO identificado ────
test("(1) removal cria OS OPEN (nunca completed) no catálogo de remoção; ator SISTEMA; white-label", async () => {
  const catalogId = randomUUID();
  const h = buildHarness({ catalogId });
  const credId = await seedCredential(h.credentials, { authorityName: "Departamento de Trânsito XYZ" });
  const token = await makeSession(credId);

  const result = await h.service.requestRemoval({ authorization: `Bearer ${token}`, body: { plate: "ABC1D23" }, ip: "203.0.113.5" });
  assert.equal(result.kind, "ok");

  const rows = h.removals.readForTests();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "OPEN");
  assert.equal(rows[0].credentialId, credId);
  assert.notEqual(rows[0].workOrderId, null, "catálogo resolvido → origina a OS");

  const wo = await h.workOrders.findById(TENANT, rows[0].workOrderId as string);
  assert.ok(wo, "a OS foi criada");
  assert.equal(wo?.status, "open", "SoD: a OS nasce OPEN — a custódia só abre na CONCLUSÃO pelo operador");
  assert.notEqual(wo?.status, "completed");
  assert.equal(wo?.completedAt, undefined, "nunca auto-completed");
  assert.equal(wo?.serviceCatalogId, catalogId, "vinculada ao catálogo de remoção resolvido");
  assert.equal(wo?.createdBy, undefined, "ator SISTEMA (created_by NULL)");
  assert.equal(wo?.vehicleId, undefined, "veículo NÃO identificado (só a placa)");
  assert.ok(wo?.title.includes("ABC1D23"), "white-label: título carrega a placa");
  const blob = JSON.stringify(wo).toLowerCase();
  assert.equal(blob.includes("polícia") || blob.includes("policia"), false, "nunca 'polícia' (white-label)");
  assert.equal(JSON.stringify(wo).includes("Departamento de Trânsito XYZ"), false, "o nome do órgão NÃO entra na OS");
});

// ── (2) Revogação vale no CONSUMO — credencial não-ACTIVE com JWE válida NÃO origina (D-Ω5P-AUTH-07) ───────────────
test("(2) credencial REVOGADA/SUSPENSA com JWE válida → 401 no consumo; NADA criado", async () => {
  for (const status of ["REVOKED", "SUSPENDED"] as const) {
    const h = buildHarness({ catalogId: randomUUID() });
    const credId = await seedCredential(h.credentials, { status });
    const token = await makeSession(credId); // JWE assinada com o secret CERTO — só o status barra
    const result = await h.service.requestRemoval({ authorization: `Bearer ${token}`, body: { plate: "ABC1D23" }, ip: "203.0.113.5" });
    assert.equal(result.kind, "session_invalid", `status ${status} → rejeição uniforme no consumo`);
    assert.equal(h.removals.readForTests().length, 0, "nenhuma solicitação");
    assert.equal(await totalWorkOrders(h), 0, "nenhuma OS");
  }
});

// ── (3) Anti-spoof — credentialId/authority_name/service_catalog do CORPO são IGNORADOS ───────────────────────────
test("(3) credentialId/authority_name/service_catalog do corpo IGNORADOS (autor=sessão; OS sem órgão; catálogo server-side)", async () => {
  const catalogId = randomUUID();
  const h = buildHarness({ catalogId });
  const realCred = await seedCredential(h.credentials, { authorityName: "Órgão Verdadeiro" });
  const attackerCred = randomUUID();
  const attackerCatalog = randomUUID();
  const token = await makeSession(realCred);

  await withApp(h.service, async (baseUrl) => {
    const res = await postRemoval(baseUrl, token, {
      plate: "xyz-9k88",
      credentialId: attackerCred,
      credential_id: attackerCred,
      authority_name: "FALSO ÓRGÃO FEDERAL",
      authorityName: "FALSO ÓRGÃO FEDERAL",
      tenant_id: randomUUID(),
      service_catalog_id: attackerCatalog,
    });
    assert.equal(res.status, 200);
  });

  const rows = h.removals.readForTests();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].credentialId, realCred, "autoria = credentialId da SESSÃO, nunca do corpo");
  assert.notEqual(rows[0].credentialId, attackerCred);
  const wo = await h.workOrders.findById(TENANT, rows[0].workOrderId as string);
  assert.equal(wo?.serviceCatalogId, catalogId, "catálogo resolvido server-side, nunca do corpo");
  assert.notEqual(wo?.serviceCatalogId, attackerCatalog);
  assert.equal(JSON.stringify(wo).includes("FALSO"), false, "o nome de órgão do corpo NÃO entra na OS");
});

// ── (4) Anti-spam partial-unique — 2ª OPEN mesma placa (normalizada) → 1 solicitação/1 OS; ambas genéricas ────────
test("(4) anti-spam: 2ª solicitação OPEN da MESMA placa → 1 solicitação/1 OS; ambas {received:true}", async () => {
  const h = buildHarness({ catalogId: randomUUID() });
  const credId = await seedCredential(h.credentials);
  const token = await makeSession(credId);

  await withApp(h.service, async (baseUrl) => {
    const r1 = await postRemoval(baseUrl, token, { plate: "ABC1D23" });
    const r2 = await postRemoval(baseUrl, token, { plate: "abc-1d23" }); // normaliza → MESMA placa
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200, "resposta genérica também na duplicata (anti-oráculo)");
    assert.equal(r1.text, r2.text);
  });

  assert.equal(h.removals.readForTests().length, 1, "no máx. 1 solicitação ABERTA por placa");
  assert.equal(await totalWorkOrders(h), 1, "exatamente 1 OS");
});

// ── (6) Fail-closed do catálogo — 0/≥2 catálogos → ENFILEIRADA (work_order_id NULL), sem OS ───────────────────────
test("(6) fail-closed: sem catálogo de remoção resolvido → ENFILEIRADA (work_order_id NULL), sem OS, resposta genérica", async () => {
  const h = buildHarness({ catalogId: null }); // resolver null = 0 ou ≥2 catálogos
  const credId = await seedCredential(h.credentials);
  const token = await makeSession(credId);

  const result = await h.service.requestRemoval({ authorization: `Bearer ${token}`, body: { plate: "ABC1D23" }, ip: "203.0.113.5" });
  assert.equal(result.kind, "ok", "resposta genérica mesmo enfileirando");

  const rows = h.removals.readForTests();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].workOrderId, null, "enfileirada: NUNCA chuta um catálogo → sem OS");
  assert.equal(await totalWorkOrders(h), 0, "nenhuma OS originada");
});

// ── (7) §2.8 — resposta genérica, sem WorkOrder/tenant_id/process id (regex UUID + allowlist) ─────────────────────
test("(7) §2.8: resposta = {data:{received:true}}, SEM UUID (WorkOrder/tenant/process/credential)", async () => {
  const h = buildHarness({ catalogId: randomUUID() });
  const credId = await seedCredential(h.credentials);
  const token = await makeSession(credId);

  await withApp(h.service, async (baseUrl) => {
    const res = await postRemoval(baseUrl, token, { plate: "ABC1D23", legalBasis: "Art. 269 CTB", location: { address: "Rua X, 100" } });
    assert.equal(res.status, 200);
    assert.equal(res.text, JSON.stringify({ data: { received: true } }));
    assert.equal(UUID_RE.test(res.text), false, "nenhum UUID na resposta pública");
  });
  // a OS existe internamente, mas o id NUNCA vazou na resposta.
  const wo = await h.workOrders.findById(TENANT, h.removals.readForTests()[0].workOrderId as string);
  assert.ok(wo);
});

// ── §2.8 — o PortalAccessLog minimiza (só HMAC); NUNCA placa/fundamento/local/credentialId crus ───────────────────
test("§2.8: PortalAccessLog — 1 linha REMOVAL_REQUESTED/AUTHORIZED; só HMAC (nada cru); process_id ausente", async () => {
  const h = buildHarness({ catalogId: randomUUID() });
  const credId = await seedCredential(h.credentials);
  const token = await makeSession(credId);

  await h.service.requestRemoval({
    authorization: `Bearer ${token}`,
    body: { plate: "ABC1D23", legalBasis: "Art. 269 CTB", locationNote: "Rua Segredo, 42" },
    ip: "198.51.100.7",
  });

  const rows = h.accessLog.readForTests().filter((r) => r.action === "REMOVAL_REQUESTED");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].outcome, "AUTHORIZED");
  assert.equal(rows[0].portal, "AUTHORITY");
  assert.equal(rows[0].processId, undefined, "REMOVAL_REQUESTED nunca amarra processo/OS");
  assert.match(rows[0].ipHash, /^[0-9a-f]{64}$/, "ip_hash é HMAC hex 64");
  assert.match(rows[0].queryFingerprint ?? "", /^[0-9a-f]{64}$/, "credKey é HMAC hex 64");
  const blob = JSON.stringify(rows);
  assert.equal(blob.includes("ABC1D23"), false, "placa crua não persiste no log");
  assert.equal(blob.includes("Art. 269"), false, "fundamento não persiste no log");
  assert.equal(blob.includes("Rua Segredo"), false, "local não persiste no log");
  assert.equal(blob.includes(credId), false, "credentialId cru não persiste no log");
  assert.equal(blob.includes("198.51.100.7"), false, "IP cru não persiste no log");
});

// ── (9) Sessão ausente/expirada/forjada/audience-owner → 401 UNIFORME; nada criado ───────────────────────────────
test("(9) sessão ausente/expirada/forjada/audience-owner → 401 UNIFORME (mesmo corpo), NADA criado", async () => {
  const h = buildHarness({ catalogId: randomUUID() });
  const credId = await seedCredential(h.credentials);
  const expired = await makeSession(credId, { ttlSeconds: -10 });
  const forged = await makeSession(credId, { secret: "outro-secret-qualquer" });
  const ownerAudience = await signOwnerSession({ processId: randomUUID() }, { secret: OWNER_SECRET });

  await withApp(h.service, async (baseUrl) => {
    const none = await postRemoval(baseUrl, null, { plate: "ABC1D23" });
    const exp = await postRemoval(baseUrl, expired, { plate: "ABC1D23" });
    const frg = await postRemoval(baseUrl, forged, { plate: "ABC1D23" });
    const own = await postRemoval(baseUrl, ownerAudience, { plate: "ABC1D23" });
    for (const r of [none, exp, frg, own]) assert.equal(r.status, 401);
    assert.equal(none.text, exp.text, "ausente ≡ expirada");
    assert.equal(none.text, frg.text, "ausente ≡ forjada");
    assert.equal(none.text, own.text, "ausente ≡ audience-owner (isolamento authority×owner)");
    assert.equal(none.text, JSON.stringify({ error: { code: "SESSION_INVALID", message: "Sua sessão expirou por segurança. Entre novamente." } }));
  });
  assert.equal(h.removals.readForTests().length, 0);
  assert.equal(await totalWorkOrders(h), 0);
});

// ── (10) Rate-limit por sessão+IP → 429 ──────────────────────────────────────────────────────────────────────────
test("(10) rate-limit sessão+IP → 429 quando o readBucket esgota", async () => {
  const h = buildHarness({ catalogId: null, antiAbuse: { readBucket: { capacity: 2, refillTokens: 2, refillIntervalMs: 3_600_000 } } });
  const credId = await seedCredential(h.credentials);
  const token = await makeSession(credId);

  await withApp(h.service, async (baseUrl) => {
    // placas DIFERENTES (o alvo é o rate-limit, não a anti-spam).
    const r1 = await postRemoval(baseUrl, token, { plate: "AAA1A11" });
    const r2 = await postRemoval(baseUrl, token, { plate: "BBB2B22" });
    const r3 = await postRemoval(baseUrl, token, { plate: "CCC3C33" });
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429, "a 3ª sob a mesma sessão+IP estoura o readBucket");
    assert.equal(JSON.parse(r3.text).error.code, "RATE_LIMITED");
  });
});

// ── Formato inválido → 400 BAD_REQUEST (não é oráculo; independe da sessão) ───────────────────────────────────────
test("400: placa ausente/curta → BAD_REQUEST (genérico, independe da sessão)", async () => {
  const h = buildHarness({ catalogId: randomUUID() });
  const credId = await seedCredential(h.credentials);
  const token = await makeSession(credId);
  await withApp(h.service, async (baseUrl) => {
    const noPlate = await postRemoval(baseUrl, token, { legalBasis: "x" });
    const shortPlate = await postRemoval(baseUrl, token, { plate: "A1" });
    assert.equal(noPlate.status, 400);
    assert.equal(shortPlate.status, 400);
    assert.equal(JSON.parse(noPlate.text).error.code, "BAD_REQUEST");
  });
  assert.equal(h.removals.readForTests().length, 0, "formato inválido não cria nada");
});
