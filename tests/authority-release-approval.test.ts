import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { createPortalApp } from "../src/portal-app.js";
import { createAuthorityPortalRouter } from "../src/modules/authority/authority-portal.routes.js";
import { AuthorityReleaseApprovalService } from "../src/modules/authority/authority-release-approval.service.js";
import { InMemoryAuthorityReleaseApprovalRepository } from "../src/modules/authority/authority-release-approval.repository.js";
import { parseDecideRequest, parseProcessIdParam } from "../src/modules/authority/authority-release-approval.validators.js";
import { AuthorityPortalBadRequestError } from "../src/modules/authority/authority-portal.validators.js";
import { InMemoryAuthorityRemovalRepository } from "../src/modules/authority/authority-removal.repository.js";
import { InMemoryAuthorityCredentialRepository } from "../src/modules/authority/authority-credential.repository.js";
import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import {
  createMemoryReleaseService,
  getMemoryReleaseRepositoryForTests,
  resetReleaseRuntimeForTests,
} from "../src/modules/release/release.service.js";
import { resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import type { ReleaseActorContext } from "../src/modules/release/release.types.js";
import {
  AntiAbuse,
  InMemoryPortalAccessLogRepository,
  signAuthoritySession,
  signOwnerSession,
  type AntiAbuseConfig,
} from "../src/modules/portal-shared/index.js";

// Ω5P PR-19 — a autoridade APROVA/REJEITA a liberação in-system, SÓ nos processos que ELA PRÓPRIA originou (D-08).
// Sempre-roda (memory; sem Postgres). O append-only da tabela + a proveniência ponta-a-ponta contra o banco real
// se provam em authority-release-approval-rls.test.ts.

const LOG_SECRET = "test-approval-log-secret";
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

function actor(tenantId: string): ReleaseActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["impound:read", "impound:transition", "release:process", "release:approve"],
  };
}

async function reset(): Promise<string> {
  resetImpoundRuntimeForTests();
  resetChargeRuntimeForTests();
  resetReleaseRuntimeForTests();
  return randomUUID();
}

type Harness = {
  readonly service: AuthorityReleaseApprovalService;
  readonly removals: InMemoryAuthorityRemovalRepository;
  readonly credentials: InMemoryAuthorityCredentialRepository;
  readonly accessLog: InMemoryPortalAccessLogRepository;
  readonly approvals: InMemoryAuthorityReleaseApprovalRepository;
};

function buildHarness(tenantId: string, opts: { antiAbuse?: Partial<AntiAbuseConfig>; minLatencyMs?: number } = {}): Harness {
  const workOrders = new InMemoryWorkOrderRepository();
  const removals = new InMemoryAuthorityRemovalRepository(workOrders);
  const credentials = new InMemoryAuthorityCredentialRepository();
  const accessLog = new InMemoryPortalAccessLogRepository();
  const antiAbuse = new AntiAbuse({ ...BASE_ANTI_ABUSE, ...opts.antiAbuse });
  const impound = getMemoryImpoundRepositoryForTests();
  const release = getMemoryReleaseRepositoryForTests();
  const approvals = new InMemoryAuthorityReleaseApprovalRepository(removals, impound, release);
  const service = new AuthorityReleaseApprovalService({
    tenantId,
    credentials,
    approvals,
    accessLog,
    antiAbuse,
    logSecret: LOG_SECRET,
    sessionSecret: AUTHORITY_SECRET,
    minLatencyMs: opts.minLatencyMs ?? 0,
  });
  return { service, removals, credentials, accessLog, approvals };
}

async function seedCredential(credentials: InMemoryAuthorityCredentialRepository, tenantId: string): Promise<string> {
  const cred = await credentials.create({
    tenantId,
    authorityName: "Órgão de Teste",
    username: `u-${randomUUID().slice(0, 8)}`,
    passwordHash: "scrypt$1024$8$1$c2FsdA$aGFzaA",
    createdBy: null,
  });
  return cred.id;
}

function makeSession(credentialId: string, opts: { secret?: string; ttlSeconds?: number } = {}): Promise<string> {
  return signAuthoritySession({ credentialId }, { secret: opts.secret ?? AUTHORITY_SECRET, ttlSeconds: opts.ttlSeconds });
}

// Origina uma AuthorityRemovalRequest (D-08 proveniência) + o ImpoundProcess EM ACTIVE_CUSTODY vinculado ao MESMO
// work_order_id (service_order_id) + a liberação IN_PROGRESS (release/start), pronta p/ decisão.
async function makeLinkedPendingProcess(
  tenantId: string,
  credentialId: string,
  removals: InMemoryAuthorityRemovalRepository,
  opts: { plate?: string; recipientName?: string } = {},
): Promise<{ processId: string; releaseId: string }> {
  const result = await removals.createRemoval({
    tenantId,
    credentialId,
    plate: opts.plate ?? "ABC1D23",
    removalServiceCatalogId: randomUUID(),
    requestedAt: new Date(),
  });
  const workOrderId = result.workOrderId as string;

  const impound = getMemoryImpoundRepositoryForTests();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: workOrderId,
    profileId: randomUUID(),
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: new Date(),
    actorId: undefined,
  });
  await impound.applyTransition({
    tenantId,
    processId: process.id,
    expectedFrom: "RECEPTION",
    to: "ACTIVE_CUSTODY",
    setEnteredAt: false,
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "ACTIVE_CUSTODY", reason: null }, occurredAt: new Date(), actorId: undefined },
  });
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, process.profileId, []);
  const release = createMemoryReleaseService();
  const started = await release.start(actor(tenantId), process.id, { recipient_name: opts.recipientName ?? "Fulano de Tal" });
  return { processId: process.id, releaseId: started.release.id };
}

async function withApp(service: AuthorityReleaseApprovalService, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const router = createAuthorityPortalRouter(undefined, undefined, () => Promise.resolve(service));
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
async function getApprovals(baseUrl: string, token: string | null): Promise<{ status: number; text: string }> {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}/portal/v1/authority/approvals`, { headers });
  return { status: response.status, text: await response.text() };
}
async function postDecide(baseUrl: string, token: string | null, processId: string, body: unknown): Promise<{ status: number; text: string }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}/portal/v1/authority/approvals/${processId}/decide`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: response.status, text: await response.text() };
}

// ── (1) Vinculação D-08 — credencial A NUNCA vê/decide o processo originado por B ──────────────────────────────
test("(1) D-08: credencial A não vê nem decide o processo originado pela credencial B (404 uniforme; lista vazia)", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credA = await seedCredential(h.credentials, tenantId);
  const credB = await seedCredential(h.credentials, tenantId);
  const { processId } = await makeLinkedPendingProcess(tenantId, credB, h.removals, { plate: "BBB2B22" });
  const tokenA = await makeSession(credA);

  const list = await h.service.listApprovals({ authorization: `Bearer ${tokenA}`, ip: "203.0.113.1" });
  assert.equal(list.kind, "ok");
  assert.equal((list as { items: unknown[] }).items.length, 0, "A não vê o processo de B");

  const decide = await h.service.decide({
    authorization: `Bearer ${tokenA}`,
    processId,
    body: { decision: "APPROVE" },
    ip: "203.0.113.1",
  });
  assert.equal(decide.kind, "not_found", "404 uniforme — não distingue 'não existe' de 'não é seu'");
});

test("(1b) D-08: processo inexistente e OS fora do fluxo de remoção → mesmo 404 uniforme", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credA = await seedCredential(h.credentials, tenantId);
  const token = await makeSession(credA);

  const ghost = await h.service.decide({ authorization: `Bearer ${token}`, processId: randomUUID(), body: { decision: "APPROVE" }, ip: "203.0.113.2" });
  assert.equal(ghost.kind, "not_found");
});

// ── (2) APPROVE carimba authority_approved_at + authorityCredentialId; idempotente na 2ª chamada ─────────────────
test("(2) APPROVE carimba autoridade + credencial; grava decisão; idempotente na 2ª chamada (não regride, não falha)", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credId = await seedCredential(h.credentials, tenantId);
  const { processId, releaseId } = await makeLinkedPendingProcess(tenantId, credId, h.removals);
  const token = await makeSession(credId);

  const first = await h.service.decide({ authorization: `Bearer ${token}`, processId, body: { decision: "APPROVE", reference: "OF-123" }, ip: "203.0.113.3" });
  assert.equal(first.kind, "approved");

  const release = await getMemoryReleaseRepositoryForTests().findReleaseById(tenantId, releaseId);
  assert.ok(release);
  assert.equal(release?.status, "AUTHORIZED");
  assert.ok(release?.authorityApprovedAt, "authority_approved_at carimbado");
  assert.equal(release?.authorityCredentialId, credId, "proveniência = a credencial da sessão");
  const stampedAt = release?.authorityApprovedAt?.getTime();

  const decisions = h.approvals.readDecisionsForTests().filter((d) => d.releaseId === releaseId);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].decision, "APPROVED");
  assert.equal(decisions[0].credentialId, credId);

  // 2ª chamada — idempotente: sucesso, SEM regredir o timestamp (release.repository.approve() é no-op).
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await h.service.decide({ authorization: `Bearer ${token}`, processId, body: { decision: "APPROVE", reference: "OF-456" }, ip: "203.0.113.3" });
  assert.equal(second.kind, "approved");
  const releaseAfter = await getMemoryReleaseRepositoryForTests().findReleaseById(tenantId, releaseId);
  assert.equal(releaseAfter?.authorityApprovedAt?.getTime(), stampedAt, "authority_approved_at NÃO regride (idempotência do release.repository.approve)");

  // Ledger append-only (ato jurídico formal): a 2ª chamada NÃO insere uma 2ª linha APPROVED — reaprovar não pode
  // poluir o registro formal de custódia com N linhas divergentes de reference/note (CONSERTO PR-19 ciclo 1).
  const decisionsAfter = h.approvals.readDecisionsForTests().filter((d) => d.releaseId === releaseId);
  assert.equal(decisionsAfter.length, 1, "idempotência real: nenhuma linha extra no ledger ao reaprovar");
  assert.equal(decisionsAfter[0].decision, "APPROVED");
});

// ── (3) REJECT NÃO altera ImpoundRelease; note obrigatória ────────────────────────────────────────────────────
test("(3) REJECT não muda ImpoundRelease (continua IN_PROGRESS, sem aprovação); grava SÓ a decisão", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credId = await seedCredential(h.credentials, tenantId);
  const { processId, releaseId } = await makeLinkedPendingProcess(tenantId, credId, h.removals);
  const token = await makeSession(credId);

  const result = await h.service.decide({ authorization: `Bearer ${token}`, processId, body: { decision: "REJECT", note: "Documentação insuficiente" }, ip: "203.0.113.4" });
  assert.equal(result.kind, "rejected");

  const release = await getMemoryReleaseRepositoryForTests().findReleaseById(tenantId, releaseId);
  assert.equal(release?.status, "IN_PROGRESS", "ImpoundRelease intacto — D-10");
  assert.equal(release?.authorityApprovedAt, undefined);
  assert.equal(release?.authorityCredentialId, undefined);

  const decisions = h.approvals.readDecisionsForTests().filter((d) => d.releaseId === releaseId);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].decision, "REJECTED");
  assert.equal(decisions[0].note, "Documentação insuficiente");
});

test("(3b) REJECT sem nota → BAD_REQUEST no validador (formato, independe da sessão)", () => {
  assert.throws(() => parseDecideRequest({ decision: "REJECT" }), AuthorityPortalBadRequestError);
  assert.throws(() => parseDecideRequest({ decision: "REJECT", note: "   " }), AuthorityPortalBadRequestError);
  assert.doesNotThrow(() => parseDecideRequest({ decision: "REJECT", note: "Motivo" }));
  assert.doesNotThrow(() => parseDecideRequest({ decision: "APPROVE" }));
  assert.throws(() => parseDecideRequest({ decision: "MAYBE" }), AuthorityPortalBadRequestError);
});

test("(3c) processId malformado → BAD_REQUEST (não confunde com 404 de vínculo)", () => {
  assert.throws(() => parseProcessIdParam("not-a-uuid"), AuthorityPortalBadRequestError);
  assert.doesNotThrow(() => parseProcessIdParam(randomUUID()));
});

// ── REJECT após já aprovada (via stand-in OU portal) → 409 conflito de estado (não é enumeração; vínculo provado) ─
test("REJECT sobre release JÁ aprovada → 409 conflito (vínculo já provado; FSM não regride)", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credId = await seedCredential(h.credentials, tenantId);
  const { processId } = await makeLinkedPendingProcess(tenantId, credId, h.removals);
  const token = await makeSession(credId);

  const approved = await h.service.decide({ authorization: `Bearer ${token}`, processId, body: { decision: "APPROVE" }, ip: "203.0.113.5" });
  assert.equal(approved.kind, "approved");
  const rejected = await h.service.decide({ authorization: `Bearer ${token}`, processId, body: { decision: "REJECT", note: "Tarde demais" }, ip: "203.0.113.5" });
  assert.equal(rejected.kind, "conflict");
});

// ── (5) Sessão ausente/expirada/forjada/audience-owner → 401 UNIFORME; nada decidido ──────────────────────────
test("(5) sessão ausente/expirada/forjada/audience-owner → 401 UNIFORME (mesmo corpo), NADA decidido", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credId = await seedCredential(h.credentials, tenantId);
  const { processId, releaseId } = await makeLinkedPendingProcess(tenantId, credId, h.removals);
  const expired = await makeSession(credId, { ttlSeconds: -10 });
  const forged = await makeSession(credId, { secret: "outro-secret-qualquer" });
  const ownerAudience = await signOwnerSession({ processId: randomUUID() }, { secret: OWNER_SECRET });

  await withApp(h.service, async (baseUrl) => {
    const none = await postDecide(baseUrl, null, processId, { decision: "APPROVE" });
    const exp = await postDecide(baseUrl, expired, processId, { decision: "APPROVE" });
    const frg = await postDecide(baseUrl, forged, processId, { decision: "APPROVE" });
    const own = await postDecide(baseUrl, ownerAudience, processId, { decision: "APPROVE" });
    for (const r of [none, exp, frg, own]) assert.equal(r.status, 401);
    assert.equal(none.text, exp.text);
    assert.equal(none.text, frg.text);
    assert.equal(none.text, own.text);

    const listNone = await getApprovals(baseUrl, null);
    assert.equal(listNone.status, 401);
  });

  const release = await getMemoryReleaseRepositoryForTests().findReleaseById(tenantId, releaseId);
  assert.equal(release?.authorityApprovedAt, undefined, "nada decidido sem sessão válida");
});

// ── credencial REVOGADA/SUSPENSA com JWE válida → 401 no consumo; nada decidido (D-07) ────────────────────────
test("credencial REVOGADA/SUSPENSA com JWE válida → 401 uniforme; nada decidido", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credId = await seedCredential(h.credentials, tenantId);
  const { processId, releaseId } = await makeLinkedPendingProcess(tenantId, credId, h.removals);
  await h.credentials.updateStatus(tenantId, credId, "REVOKED");
  const token = await makeSession(credId);

  const result = await h.service.decide({ authorization: `Bearer ${token}`, processId, body: { decision: "APPROVE" }, ip: "203.0.113.6" });
  assert.equal(result.kind, "session_invalid");
  const release = await getMemoryReleaseRepositoryForTests().findReleaseById(tenantId, releaseId);
  assert.equal(release?.authorityApprovedAt, undefined);
});

// ── (7) §2.8 — resposta minimizada (sem releaseId/tenantId); log sem reference/note/plate ─────────────────────
test("(7) §2.8: lista/decisão minimizadas (sem releaseId/tenantId/UUID extra); log sem reference/note", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credId = await seedCredential(h.credentials, tenantId);
  const { processId } = await makeLinkedPendingProcess(tenantId, credId, h.removals, { plate: "SEGREDO1" });
  const token = await makeSession(credId);

  await withApp(h.service, async (baseUrl) => {
    const list = await getApprovals(baseUrl, token);
    assert.equal(list.status, 200);
    const parsed = JSON.parse(list.text) as { data: Array<Record<string, unknown>> };
    assert.equal(parsed.data.length, 1);
    assert.equal("releaseId" in parsed.data[0], false, "releaseId (id interno de custódia) NUNCA na resposta pública");
    assert.equal(parsed.data[0].processId, processId);

    const decide = await postDecide(baseUrl, token, processId, { decision: "APPROVE", reference: "OF-SEGREDO", note: "nota confidencial" });
    assert.equal(decide.status, 200);
    assert.equal(decide.text, JSON.stringify({ data: { decision: "APPROVED" } }));
  });

  const rows = h.accessLog.readForTests().filter((r) => r.action === "RELEASE_DECIDED");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].outcome, "APPROVED");
  assert.equal(rows[0].processId, processId, "process_id presente — I10");
  const blob = JSON.stringify(rows);
  assert.equal(blob.includes("OF-SEGREDO"), false, "reference NÃO persiste no log");
  assert.equal(blob.includes("nota confidencial"), false, "note NÃO persiste no log");
  assert.equal(blob.includes("SEGREDO1"), false, "placa NÃO persiste no log (nem consultada por este BFF)");
  assert.match(rows[0].ipHash, /^[0-9a-f]{64}$/);
});

test("§2.8: sessão inválida ao decidir NÃO loga o processId cru (evita FK-violation/enumeração no log real)", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credId = await seedCredential(h.credentials, tenantId);
  const forged = await makeSession(credId, { secret: "outro-secret-qualquer" });
  await h.service.decide({ authorization: `Bearer ${forged}`, processId: randomUUID(), body: { decision: "APPROVE" }, ip: "203.0.113.7" });
  const rows = h.accessLog.readForTests().filter((r) => r.action === "RELEASE_DECIDED");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].outcome, "SESSION_INVALID");
  assert.equal(rows[0].processId, undefined, "processId NUNCA logado em SESSION_INVALID (cru/não confirmado)");
});

test("§2.8: 404 (sem vínculo) NÃO loga o processId cru", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credId = await seedCredential(h.credentials, tenantId);
  const token = await makeSession(credId);
  await h.service.decide({ authorization: `Bearer ${token}`, processId: randomUUID(), body: { decision: "APPROVE" }, ip: "203.0.113.8" });
  const rows = h.accessLog.readForTests().filter((r) => r.action === "RELEASE_DECIDED");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].outcome, "NOT_FOUND");
  assert.equal(rows[0].processId, undefined, "processId NUNCA logado em NOT_FOUND (evita FK-violation em produção)");
});

// ── Rate-limit por sessão+IP → 429 ──────────────────────────────────────────────────────────────────────────────
test("rate-limit sessão+IP → 429 quando o readBucket esgota (list e decide)", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId, { antiAbuse: { readBucket: { capacity: 1, refillTokens: 1, refillIntervalMs: 3_600_000 } } });
  const credId = await seedCredential(h.credentials, tenantId);
  const token = await makeSession(credId);

  const r1 = await h.service.listApprovals({ authorization: `Bearer ${token}`, ip: "203.0.113.9" });
  assert.equal(r1.kind, "ok");
  const r2 = await h.service.listApprovals({ authorization: `Bearer ${token}`, ip: "203.0.113.9" });
  assert.equal(r2.kind, "rate_limited");
});

test("resposta pública nunca contém UUID cru fora de processId (regex de allowlist)", async () => {
  const tenantId = await reset();
  const h = buildHarness(tenantId);
  const credId = await seedCredential(h.credentials, tenantId);
  const { processId } = await makeLinkedPendingProcess(tenantId, credId, h.removals);
  const token = await makeSession(credId);

  await withApp(h.service, async (baseUrl) => {
    const list = await getApprovals(baseUrl, token);
    const uuidMatches = list.text.match(new RegExp(UUID_RE, "g")) ?? [];
    assert.deepEqual(uuidMatches, [processId], "o ÚNICO UUID na resposta é o processId (nunca releaseId/credentialId/tenantId)");
  });
});
