import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { EncryptJWT } from "jose";

import { createPortalApp } from "../src/portal-app.js";
import {
  InMemoryPortalReleaseRequestRepository,
  OwnerPortalService,
  createOwnerPortalRouter,
  formatMoneyLabel,
} from "../src/modules/owner-portal/index.js";
import {
  AntiAbuse,
  InMemoryChallengeStore,
  InMemoryPortalAccessLogRepository,
  signOwnerSession,
  type AntiAbuseConfig,
} from "../src/modules/portal-shared/index.js";
import {
  createMemoryImpoundService,
  resetImpoundRuntimeForTests,
} from "../src/modules/impound/impound.service.js";
import {
  createMemoryChargeService,
  resetChargeRuntimeForTests,
} from "../src/modules/charging/charge.service.js";
import {
  createMemoryYardService,
  resetYardRuntimeForTests,
} from "../src/modules/yard/yard.service.js";
import {
  createMemoryJurisdictionService,
  resetJurisdictionRuntimeForTests,
} from "../src/modules/jurisdiction/jurisdiction.service.js";
import type { ImpoundActorContext } from "../src/modules/impound/impound.types.js";

const TENANT = randomUUID();
const LOG_SECRET = "test-portal-log-secret";
const SESSION_SECRET = "test-portal-session-secret";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function actor(tenantId = TENANT): ImpoundActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["impound:read", "impound:create"] };
}

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
  readonly accessLog: InMemoryPortalAccessLogRepository;
  readonly releaseRequests: InMemoryPortalReleaseRequestRepository;
  readonly service: OwnerPortalService;
};

function buildHarness(overrides: { antiAbuse?: Partial<AntiAbuseConfig>; minLatencyMs?: number } = {}): Harness {
  resetImpoundRuntimeForTests();
  resetChargeRuntimeForTests();
  resetYardRuntimeForTests();
  resetJurisdictionRuntimeForTests();
  const accessLog = new InMemoryPortalAccessLogRepository();
  const releaseRequests = new InMemoryPortalReleaseRequestRepository();
  const service = new OwnerPortalService({
    tenantId: TENANT,
    impound: createMemoryImpoundService(),
    charge: createMemoryChargeService(),
    yard: createMemoryYardService(),
    jurisdiction: createMemoryJurisdictionService(),
    releaseRequests,
    accessLog,
    antiAbuse: new AntiAbuse({ ...BASE_ANTI_ABUSE, ...overrides.antiAbuse }),
    challengeStore: new InMemoryChallengeStore(),
    logSecret: LOG_SECRET,
    sessionSecret: SESSION_SECRET,
    minLatencyMs: overrides.minLatencyMs ?? 0,
    challengeTtlMs: 120_000,
  });
  return { accessLog, releaseRequests, service };
}

// Seeds a full custody process (profile + process com enteredAt + charges + yard) e devolve o processId + a sessão.
async function seedProcessWithSession(input: {
  plate: string;
  renavam: string;
  originAuthority?: string;
}): Promise<{ processId: string; session: string; enteredAt: string; yardName: string }> {
  const jurisdiction = createMemoryJurisdictionService();
  const profile = await jurisdiction.create(actor(), {
    name: `Perfil ${input.plate}`,
    scope: "PUBLIC_AGREEMENT",
    release_requirements: [
      { code: "OWNER_ID", label: "Documento de identificação de quem retira", required: true },
      { code: "DEBTS_SETTLED", label: "Quitação de débitos", required: true },
    ],
  });

  const yardService = createMemoryYardService();
  const yardName = "Pátio Municipal Central";
  const yard = await yardService.create(actor(), { name: yardName, address: "Av. das Custódias, 1000 - Centro" });

  const impound = createMemoryImpoundService();
  const process = await impound.create(actor(), {
    profile_id: profile.id,
    origin_authority: input.originAuthority ?? "Órgão Autuante XPTO",
    vehicle_plate: input.plate,
    vehicle_renavam: input.renavam,
    vehicle_brand: "VW",
    vehicle_model: "Gol",
    vehicle_color: "Prata",
    vehicle_year: 2020,
    yard_id: yard.id,
  });
  // Transição p/ RECEPÇÃO ⇒ entered_at = t0 (necessário p/ os prazos derivados).
  const received = await impound.transition(actor(), process.id, { to: "RECEPTION" });

  const charge = createMemoryChargeService();
  await charge.createManual(actor(), process.id, { kind: "REMOVAL", unit_amount: "150.00", quantity: "1" });
  await charge.createManual(actor(), process.id, { kind: "ADDITIONAL", unit_amount: "40.00", quantity: "1", description: "Içamento" });

  const session = await signOwnerSession({ processId: process.id }, { secret: SESSION_SECRET });
  return { processId: process.id, session, enteredAt: received.enteredAt?.toISOString() ?? "", yardName };
}

// ── HTTP harness ────────────────────────────────────────────────────────────────────────────────────────────────
async function withApp(service: OwnerPortalService, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = createPortalApp({ ownerRouter: createOwnerPortalRouter(() => Promise.resolve(service)) });
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
async function getJson(baseUrl: string, path: string, headers: Record<string, string> = {}): Promise<{ status: number; text: string }> {
  const response = await fetch(`${baseUrl}${path}`, { method: "GET", headers });
  return { status: response.status, text: await response.text() };
}
async function postJson(
  baseUrl: string,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; text: string }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}
function bearer(session: string): Record<string, string> {
  return { authorization: `Bearer ${session}` };
}

// ── (0) HAPPY PATH — dossiê agregado minimizado ─────────────────────────────────────────────────────────────────
test("dossiê: agregado minimizado (situação/pátio/veículo/débitos itemizados/prazos/exigências/fotos-placeholder)", async () => {
  const { service } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "ABC1D23", renavam: "12345678901" });
  await withApp(service, async (baseUrl) => {
    const res = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(seeded.session));
    assert.equal(res.status, 200);
    const dossier = JSON.parse(res.text).data as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(dossier).sort(),
      ["charges", "deadlines", "enteredAt", "photos", "requirements", "status", "statusLabel", "vehicle", "yardPublicName", "yardPublicAddress"].sort(),
    );
    assert.equal(dossier.yardPublicName, seeded.yardName);
    assert.deepEqual(dossier.vehicle, { brand: "VW", model: "Gol", color: "Prata", year: 2020 });
    const charges = dossier.charges as { items: Array<Record<string, unknown>>; totalDueLabel: string };
    // REMOVAL R$150 + ADDITIONAL R$40 = R$190.
    assert.equal(charges.totalDueLabel, "R$ 190,00");
    assert.deepEqual(charges.items.map((i) => i.kindLabel).sort(), ["Encargos adicionais", "Remoção"].sort());
    // Prazos derivados do t0 (10/30/60 federais) — 3 marcos com dueDate ISO + rótulo "Faltam N dias".
    const deadlines = dossier.deadlines as Array<{ label: string; dueDate: string; elapsedLabel: string }>;
    assert.equal(deadlines.length, 3);
    assert.ok(deadlines.every((d) => /^\d{4}-\d{2}-\d{2}T/.test(d.dueDate)));
    assert.ok(deadlines[0].elapsedLabel.startsWith("Faltam ") || deadlines[0].elapsedLabel === "Vence hoje");
    // Exigências: só {label, required} (nunca o code/satisfied internos).
    const reqs = dossier.requirements as Array<Record<string, unknown>>;
    assert.deepEqual(reqs.map((r) => Object.keys(r).sort()), [["label", "required"], ["label", "required"]]);
    // Fotos: placeholder honesto (contagem 0 — sem vistoria com fotos; NENHUM byte de foto).
    const photos = dossier.photos as { setsAvailableCount: number; availabilityLabel: string };
    assert.equal(photos.setsAvailableCount, 0);
    assert.ok(photos.availabilityLabel.length > 0);
  });
});

// ── (1) A SESSÃO É A AUTORIZAÇÃO — processId do corpo/query IGNORADO ─────────────────────────────────────────────
test("sessão como autz: trocar o processId no corpo/query NÃO lê processo alheio (só a sessão autoriza)", async () => {
  const { service, releaseRequests } = buildHarness();
  const a = await seedProcessWithSession({ plate: "AAA1A11", renavam: "11111111111" });
  const b = await seedProcessWithSession({ plate: "BBB2B22", renavam: "22222222222" });
  await withApp(service, async (baseUrl) => {
    // GET dossiê com a sessão de A + query processId=B → devolve o dossiê de A (nunca de B).
    const res = await getJson(baseUrl, `/portal/v1/owner/dossier?processId=${b.processId}`, bearer(a.session));
    assert.equal(res.status, 200);
    // O UUID de B jamais aparece no corpo; a resposta é de A.
    assert.equal(res.text.includes(b.processId), false);
    // POST solicitar liberação com a sessão de A + body {processId: B} → o pedido é de A (o body é ignorado).
    const rr = await postJson(baseUrl, "/portal/v1/owner/release-request", { processId: b.processId, note: "por favor" }, bearer(a.session));
    assert.equal(rr.status, 200);
    const rows = releaseRequests.readForTests();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].processId, a.processId, "o pedido é do processo DA SESSÃO (A), nunca do body (B)");
    assert.notEqual(rows[0].processId, b.processId);
  });
});

// ── (2)+(8) SESSÃO INVÁLIDA — ausente/forjada/expirada/audience-errada → 401 SESSION_INVALID uniforme + log ──────
test("sessão inválida: ausente/forjada/expirada/audience-errada → 401 SESSION_INVALID uniforme + log; nada difere", async () => {
  const { service, accessLog } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "CCC3C33", renavam: "33333333333" });
  // Token com AUDIENCE errada (secret correto, mas aud != owner) — verifyOwnerSession deve rejeitar.
  const key = createHash("sha256").update(SESSION_SECRET, "utf8").digest();
  const now = Math.floor(Date.now() / 1000);
  const wrongAudience = await new EncryptJWT({ process_id: seeded.processId })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(now)
    .setExpirationTime(now + 600)
    .setIssuer("erp-portal")
    .setAudience("erp-authority-portal")
    .encrypt(key);
  // Token EXPIRADO (secret+audience corretos, exp no passado).
  const expired = await signOwnerSession({ processId: seeded.processId }, { secret: SESSION_SECRET, ttlSeconds: -10 });
  // Token forjado com OUTRO secret.
  const forged = await signOwnerSession({ processId: seeded.processId }, { secret: "outro-secret-qualquer" });

  await withApp(service, async (baseUrl) => {
    const noHeader = await getJson(baseUrl, "/portal/v1/owner/dossier");
    const garbage = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer("nao-e-um-token"));
    const aud = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(wrongAudience));
    const exp = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(expired));
    const fake = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(forged));
    for (const r of [noHeader, garbage, aud, exp, fake]) {
      assert.equal(r.status, 401);
      assert.equal(JSON.parse(r.text).error.code, "SESSION_INVALID");
    }
    // Uniforme: todas as rejeições devolvem o MESMO corpo (sem oráculo de razão).
    assert.equal(new Set([noHeader.text, garbage.text, aud.text, exp.text, fake.text]).size, 1);
    // release-request sem sessão → também 401 SESSION_INVALID (nenhuma rota detalhada difere).
    const rr = await postJson(baseUrl, "/portal/v1/owner/release-request", { note: "x" });
    assert.equal(rr.status, 401);
    assert.equal(JSON.parse(rr.text).error.code, "SESSION_INVALID");
  });
  const invalidLogs = accessLog.readForTests().filter((r) => r.outcome === "SESSION_INVALID");
  assert.ok(invalidLogs.length >= 5, "cada tentativa inválida vira 1 linha SESSION_INVALID");
  assert.ok(invalidLogs.every((r) => !r.processId), "SESSION_INVALID nunca amarra process_id (sessão não resolvida)");
});

// ── (3) §2.8 — dossiê minimizado: sem UUID/tenant_id/storage_key/fileUrl/origem/placa/Renavam ────────────────────
test("§2.8: dossiê/charges/deadlines minimizados — sem UUID/tenant_id/storage_key/fileUrl/origem/placa/Renavam", async () => {
  const { service } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "GGG7G77", renavam: "44444444444", originAuthority: "Delegacia-Fantasma-SECRETA" });
  await withApp(service, async (baseUrl) => {
    const res = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(seeded.session));
    assert.equal(res.status, 200);
    const text = res.text;
    assert.equal(UUID_RE.test(text), false, "nenhum UUID interno pode vazar no dossiê");
    assert.equal(text.includes(TENANT), false);
    assert.equal(text.toLowerCase().includes("tenant"), false);
    assert.equal(text.includes("Delegacia-Fantasma-SECRETA"), false, "origem/autoridade nunca vaza");
    assert.equal(text.includes("44444444444"), false, "Renavam nunca vaza");
    assert.equal(text.includes("GGG7G77"), false, "placa nunca vaza");
    for (const forbidden of ["storage_key", "storageKey", "fileUrl", "file_url", "s3://", "bucket", "tariffId", "periodSeq", "profileId", "profile_id", "originAuthority"]) {
      assert.equal(text.includes(forbidden), false, `campo proibido §2.8 não pode aparecer: ${forbidden}`);
    }
  });
});

// ── (4) RATE-LIMIT por sessão+IP → 429 ──────────────────────────────────────────────────────────────────────────
test("rate-limit por sessão+IP: estourar o balde de reads → 429 genérico + RATE_LIMITED no log", async () => {
  const { service, accessLog } = buildHarness({
    antiAbuse: { readBucket: { capacity: 2, refillTokens: 2, refillIntervalMs: 3_600_000 } },
  });
  const seeded = await seedProcessWithSession({ plate: "RAT1E11", renavam: "55555555555" });
  await withApp(service, async (baseUrl) => {
    const r1 = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(seeded.session));
    const r2 = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(seeded.session));
    const r3 = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(seeded.session));
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429, "o 3º read da mesma sessão+IP estoura o balde");
    assert.equal(JSON.parse(r3.text).error.code, "RATE_LIMITED");
    assert.ok(accessLog.readForTests().some((r) => r.action === "DOSSIER_VIEWED" && r.outcome === "RATE_LIMITED"));
  });
});

// ── (6) RELEASE-REQUEST idempotente (1 aberto/processo) + resposta genérica ──────────────────────────────────────
test("release-request: idempotente (1 aberto por processo) + resposta SEMPRE genérica {received:true}", async () => {
  const { service, releaseRequests } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "REL1E11", renavam: "66666666666" });
  await withApp(service, async (baseUrl) => {
    const first = await postJson(baseUrl, "/portal/v1/owner/release-request", { note: "Quero retirar meu veículo." }, bearer(seeded.session));
    const second = await postJson(baseUrl, "/portal/v1/owner/release-request", { note: "De novo." }, bearer(seeded.session));
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    // Resposta genérica idêntica (não revela se criou ou se já havia aberto).
    assert.equal(first.text, JSON.stringify({ data: { received: true } }));
    assert.equal(second.text, first.text);
    // Idempotência: no máx. 1 pedido ABERTO por processo (partial-unique espelhada em memória).
    assert.equal(releaseRequests.readForTests().length, 1);
    assert.equal(releaseRequests.readForTests()[0].note, "Quero retirar meu veículo.");
  });
});

// ── (7) PortalAccessLog — 1 linha/ação, sem PII; AUTHORIZED amarra process_id ────────────────────────────────────
test("PortalAccessLog: DOSSIER_VIEWED/RELEASE_REQUESTED 1 linha/ação, sem PII; AUTHORIZED amarra process_id", async () => {
  const { service, accessLog } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "LOG1G11", renavam: "77777777777" });
  await withApp(service, async (baseUrl) => {
    await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(seeded.session));
    await postJson(baseUrl, "/portal/v1/owner/release-request", { note: "retirar" }, bearer(seeded.session));
  });
  const rows = accessLog.readForTests();
  const dossierRows = rows.filter((r) => r.action === "DOSSIER_VIEWED");
  const releaseRows = rows.filter((r) => r.action === "RELEASE_REQUESTED");
  assert.equal(dossierRows.length, 1);
  assert.equal(releaseRows.length, 1);
  assert.equal(dossierRows[0].outcome, "AUTHORIZED");
  assert.equal(releaseRows[0].outcome, "AUTHORIZED");
  assert.equal(dossierRows[0].processId, seeded.processId, "AUTHORIZED amarra o process_id (I10/I9)");
  assert.equal(releaseRows[0].processId, seeded.processId);
  const blob = JSON.stringify(rows);
  assert.equal(blob.includes("LOG1G11"), false, "placa crua nunca no log");
  assert.equal(blob.includes("77777777777"), false, "Renavam cru nunca no log");
  assert.equal(blob.includes("127.0.0.1"), false, "IP cru nunca no log");
  for (const row of rows) assert.match(row.ipHash, /^[0-9a-f]{64}$/);
});

// ── (9) MÉDIA-1 (R-omega5p-pr17) — total do dossiê BYTE-IDÊNTICO ao da consulta, mesmo com kind de líquido NEGATIVO ─
// Dinheiro em superfície pública = tolerância zero: o `charges.totalDueLabel` do dossiê tem de bater com o
// `totalDueLabel` da CONSULTA (getPublicSummary, clamp GLOBAL). O bug era clampar por-kind e somar os subtotais.
test("dossiê: total == consulta (byte-idêntico) mesmo com kind de líquido NEGATIVO (over-crédito) + caso positivo intacto", async () => {
  const { service } = buildHarness();

  // (a) CASO TODO-POSITIVO — total do dossiê == total da consulta (nada regride).
  const pos = await seedProcessWithSession({ plate: "POS1P11", renavam: "10101010101" });
  const chargePos = createMemoryChargeService();
  const consultaPos = await chargePos.getPublicSummary(TENANT, pos.processId);
  assert.equal(consultaPos.totalDueCents, 19000, "consulta positiva: REMOVAL 150,00 + ADDITIONAL 40,00 = 190,00");

  // (b) KIND DE LÍQUIDO NEGATIVO — um ADJUSTMENT sobre-credita a ADDITIONAL ALÉM do valor (cenário insider do M1):
  //     ADDITIONAL 40,00 + ADJUSTMENT −40,20 ⇒ líquido do kind ADDITIONAL = −0,20; global = 150,00 − 0,20 = 149,80.
  const neg = await seedProcessWithSession({ plate: "NEG1N11", renavam: "20202020202" });
  const chargeNeg = createMemoryChargeService();
  const additional = (await chargeNeg.list(actor(), neg.processId)).find((c) => c.kind === "ADDITIONAL");
  assert.ok(additional, "processo semeado tem uma ADDITIONAL");
  await chargeNeg.createManual(actor(), neg.processId, {
    kind: "ADJUSTMENT",
    unit_amount: "40.20",
    total_amount: "-40.20",
    quantity: "1",
    adjustment_of_charge_id: additional.id,
    description: "Estorno do encargo adicional com crédito de 0,20 (over-crédito)",
  });
  // A CONSULTA (getPublicSummary — o totalDueLabel do PR-16) usa o clamp GLOBAL: 149,80 (NÃO 150,00).
  const consultaNeg = await chargeNeg.getPublicSummary(TENANT, neg.processId);
  assert.equal(consultaNeg.totalDueCents, 14980, "consulta: 150,00 − 0,20 = 149,80 (clamp global)");

  await withApp(service, async (baseUrl) => {
    // (a) dossiê positivo == consulta positiva.
    const resPos = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(pos.session));
    assert.equal(resPos.status, 200);
    const chargesPos = (JSON.parse(resPos.text).data as { charges: { totalDueLabel: string } }).charges;
    assert.equal(chargesPos.totalDueLabel, formatMoneyLabel(consultaPos.totalDueCents, consultaPos.currency));
    assert.equal(chargesPos.totalDueLabel, "R$ 190,00");

    // (b) dossiê negativo: total BYTE-IDÊNTICO à consulta (149,80), JAMAIS 150,00 (bug do clamp por-kind).
    const resNeg = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(neg.session));
    assert.equal(resNeg.status, 200);
    const chargesNeg = (JSON.parse(resNeg.text).data as {
      charges: { items: Array<{ kindLabel: string; subtotalLabel: string }>; totalDueLabel: string };
    }).charges;
    assert.equal(
      chargesNeg.totalDueLabel,
      formatMoneyLabel(consultaNeg.totalDueCents, consultaNeg.currency),
      "total do dossiê == total da consulta (byte-idêntico)",
    );
    assert.equal(chargesNeg.totalDueLabel, "R$ 149,80");
    assert.notEqual(chargesNeg.totalDueLabel, "R$ 150,00", "não pode somar subtotais clampados por-kind");
    // Subtotais refletem a REALIDADE (o total é a autoridade): ADDITIONAL aparece como crédito −R$ 0,20; REMOVAL 150,00.
    const additionalItem = chargesNeg.items.find((i) => i.kindLabel === "Encargos adicionais");
    const removalItem = chargesNeg.items.find((i) => i.kindLabel === "Remoção");
    assert.ok(additionalItem, "há linha de Encargos adicionais");
    assert.ok(removalItem, "há linha de Remoção");
    assert.equal(additionalItem.subtotalLabel, "-R$ 0,20");
    assert.equal(removalItem.subtotalLabel, "R$ 150,00");
  });
});
