import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { createPortalApp } from "../src/portal-app.js";
import { createOwnerPortalRouter } from "../src/modules/owner-portal/index.js";
import { OwnerPortalService } from "../src/modules/owner-portal/owner-portal.service.js";
import {
  AntiAbuse,
  InMemoryChallengeStore,
  InMemoryPortalAccessLogRepository,
  issueChallenge,
  solveChallenge,
  verifySolution,
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
import { InMemoryPortalReleaseRequestRepository } from "../src/modules/owner-portal/index.js";
import type { ImpoundActorContext } from "../src/modules/impound/impound.types.js";

const TENANT = randomUUID();
const LOG_SECRET = "test-portal-log-secret";
const SESSION_SECRET = "test-portal-session-secret";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function actor(tenantId = TENANT): ImpoundActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["impound:read", "impound:create"],
  };
}

const BASE_ANTI_ABUSE: AntiAbuseConfig = {
  ipBucket: { capacity: 100, refillTokens: 100, refillIntervalMs: 60_000 },
  plateBucket: { capacity: 100, refillTokens: 100, refillIntervalMs: 60_000 },
  baseDifficulty: 2, // 2 nibbles — solve instantâneo em teste
  maxDifficulty: 5,
  failuresPerStep: 1,
  failureWindowMs: 60_000,
};

type Harness = {
  readonly accessLog: InMemoryPortalAccessLogRepository;
  readonly antiAbuse: AntiAbuse;
  readonly service: OwnerPortalService;
  readonly challengeStore: InMemoryChallengeStore;
};

function buildHarness(overrides: { antiAbuse?: Partial<AntiAbuseConfig>; minLatencyMs?: number; tenantId?: string } = {}): Harness {
  resetImpoundRuntimeForTests();
  resetChargeRuntimeForTests();
  resetYardRuntimeForTests();
  resetJurisdictionRuntimeForTests();
  const accessLog = new InMemoryPortalAccessLogRepository();
  const antiAbuse = new AntiAbuse({ ...BASE_ANTI_ABUSE, ...overrides.antiAbuse });
  const challengeStore = new InMemoryChallengeStore();
  const service = new OwnerPortalService({
    tenantId: overrides.tenantId ?? TENANT,
    impound: createMemoryImpoundService(),
    charge: createMemoryChargeService(),
    yard: createMemoryYardService(),
    jurisdiction: createMemoryJurisdictionService(),
    releaseRequests: new InMemoryPortalReleaseRequestRepository(),
    accessLog,
    antiAbuse,
    challengeStore,
    logSecret: LOG_SECRET,
    sessionSecret: SESSION_SECRET,
    minLatencyMs: overrides.minLatencyMs ?? 15,
    challengeTtlMs: 120_000,
  });
  return { accessLog, antiAbuse, service, challengeStore };
}

async function seedProcess(input: { plate: string; renavam: string; yardId?: string; originAuthority?: string }): Promise<void> {
  const impound = createMemoryImpoundService();
  await impound.create(actor(), {
    profile_id: randomUUID(),
    origin_authority: input.originAuthority ?? "Órgão Autuante XPTO",
    vehicle_plate: input.plate,
    vehicle_renavam: input.renavam,
    yard_id: input.yardId,
  });
}

async function seedYard(name: string, address: string): Promise<string> {
  const yardService = createMemoryYardService();
  const yard = await yardService.create(actor(), { name, address });
  return yard.id;
}

// ── harness HTTP (createPortalApp com router injetado) ─────────────────────────────────────────────────────────
async function withApp(service: OwnerPortalService, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const router = createOwnerPortalRouter(() => Promise.resolve(service));
  const app = createPortalApp({ ownerRouter: router });
  const server = app.listen(0);
  try {
    await run(await getBaseUrl(server));
  } finally {
    await closeServer(server);
  }
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}
function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function postRaw(baseUrl: string, path: string, body: unknown): Promise<{ status: number; text: string }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

// Um fluxo completo: /challenge → resolve o PoW → /lookup.
async function lookupFlow(baseUrl: string, input: { plate: string; renavam: string }): Promise<{ status: number; text: string }> {
  const ch = await postRaw(baseUrl, "/portal/v1/owner/challenge", {});
  const challenge = JSON.parse(ch.text).data as { challengeId: string; salt: string; difficulty: number };
  const solution = solveChallenge(challenge.salt, challenge.difficulty);
  return postRaw(baseUrl, "/portal/v1/owner/lookup", {
    plate: input.plate,
    renavam: input.renavam,
    challengeId: challenge.challengeId,
    solution,
  });
}

// ── (1) ANTI-ENUMERAÇÃO: placa-existe+Renavam-errado ≡ placa-inexistente (byte-idêntico) ────────────────────────
test("enumeração: placa existente + Renavam errado devolve resposta BYTE-IDÊNTICA a placa inexistente", async () => {
  const { service } = buildHarness();
  await seedProcess({ plate: "ABC1D23", renavam: "12345678901" });
  await withApp(service, async (baseUrl) => {
    const mismatch = await lookupFlow(baseUrl, { plate: "ABC1D23", renavam: "00000000000" }); // existe, Renavam errado
    const absent = await lookupFlow(baseUrl, { plate: "ZZZ9Z99", renavam: "00000000000" }); // não existe
    assert.equal(mismatch.status, 200);
    assert.equal(absent.status, 200);
    assert.equal(mismatch.text, absent.text, "os dois desfechos negativos devem ser byte-idênticos");
    assert.equal(mismatch.text, JSON.stringify({ data: { found: false, process: null, session: null } }));
  });
});

// ── (2) TIMING: o piso constante normaliza a latência (negativa e FOUND ≥ piso) ─────────────────────────────────
test("timing: lookup FOUND e NOT_FOUND respeitam o piso mínimo de latência (normaliza o oráculo de timing)", async () => {
  const floor = 160;
  const { service } = buildHarness({ minLatencyMs: floor });
  await seedProcess({ plate: "TIM1I11", renavam: "22222222222" });
  await withApp(service, async (baseUrl) => {
    const t0 = Date.now();
    const found = await lookupFlow(baseUrl, { plate: "TIM1I11", renavam: "22222222222" });
    const foundMs = Date.now() - t0;
    const t1 = Date.now();
    const miss = await lookupFlow(baseUrl, { plate: "NOP0Q00", renavam: "22222222222" });
    const missMs = Date.now() - t1;
    assert.equal(JSON.parse(found.text).data.found, true);
    assert.equal(JSON.parse(miss.text).data.found, false);
    assert.ok(foundMs >= floor - 25, `FOUND deve respeitar o piso (~${floor}ms), levou ${foundMs}ms`);
    assert.ok(missMs >= floor - 25, `NOT_FOUND deve respeitar o piso (~${floor}ms), levou ${missMs}ms`);
  });
});

// ── (3) RATE-LIMIT por IP → 429 genérico ────────────────────────────────────────────────────────────────────────
test("rate-limit por IP: estourar o balde do IP → 429 genérico + RATE_LIMITED no log", async () => {
  const { service, accessLog } = buildHarness({
    antiAbuse: { ipBucket: { capacity: 2, refillTokens: 2, refillIntervalMs: 3_600_000 } },
  });
  await withApp(service, async (baseUrl) => {
    const r1 = await lookupFlow(baseUrl, { plate: "AAA1A11", renavam: "1" });
    const r2 = await lookupFlow(baseUrl, { plate: "BBB2B22", renavam: "2" });
    const r3 = await lookupFlow(baseUrl, { plate: "CCC3C33", renavam: "3" });
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429, "o 3º pedido do mesmo IP estoura o balde");
    assert.equal(JSON.parse(r3.text).error.code, "RATE_LIMITED");
    assert.ok(accessLog.readForTests().some((row) => row.outcome === "RATE_LIMITED"));
  });
});

// ── (3b) RATE-LIMIT por PLACA → 429 genérico ────────────────────────────────────────────────────────────────────
test("rate-limit por PLACA: repetir a MESMA placa → 429 (o brute-force de Renavam numa placa é barrado)", async () => {
  const { service } = buildHarness({
    antiAbuse: {
      ipBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 3_600_000 },
      plateBucket: { capacity: 2, refillTokens: 2, refillIntervalMs: 3_600_000 },
    },
  });
  await withApp(service, async (baseUrl) => {
    // MESMA placa, Renavam variando (o atacante tentando adivinhar o 2º fator) — a chave de placa é a mesma.
    const r1 = await lookupFlow(baseUrl, { plate: "DDD4D44", renavam: "1" });
    const r2 = await lookupFlow(baseUrl, { plate: "DDD-4D44", renavam: "2" }); // hífen → mesma chave normalizada
    const r3 = await lookupFlow(baseUrl, { plate: "ddd4d44", renavam: "3" }); // caixa → mesma chave
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429, "3 palpites na mesma placa estouram o balde por-placa");
    assert.equal(JSON.parse(r3.text).error.code, "RATE_LIMITED");
  });
});

// ── (4) PoW inválida/expirada/reusada → falha; dificuldade progressiva ──────────────────────────────────────────
test("PoW: solução errada → wrong_solution; expirada → expired; reusada → reused (uso único)", () => {
  const store = new InMemoryChallengeStore();

  const expiring = issueChallenge(store, 2, 1_000, 0);
  assert.equal(verifySolution(store, { challengeId: expiring.challengeId, solution: "0" }, 2_000).ok, false);
  assert.equal(
    verifySolution(store, { challengeId: issueChallenge(store, 2, 1_000, 0).challengeId, solution: "0" }, 2_000).reason,
    "expired",
  );

  const c = issueChallenge(store, 2, 100_000, 0);
  const wrong = verifySolution(store, { challengeId: c.challengeId, solution: "definitely-not-a-solution" }, 1);
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "wrong_solution");
  // uso único: mesmo com a solução CORRETA agora, o desafio já foi consumido.
  const correct = solveChallenge(c.salt, c.difficulty);
  assert.equal(verifySolution(store, { challengeId: c.challengeId, solution: correct }, 2).reason, "reused");

  // desconhecido/forjado → unknown.
  assert.equal(verifySolution(store, { challengeId: "forged", solution: "0" }, 1).reason, "unknown");
});

test("PoW no lookup: challengeId forjado → 400 CHALLENGE_FAILED + log + dificuldade do IP SOBE", async () => {
  const { service, accessLog } = buildHarness({ antiAbuse: { baseDifficulty: 2, failuresPerStep: 1 } });
  await withApp(service, async (baseUrl) => {
    const before = JSON.parse((await postRaw(baseUrl, "/portal/v1/owner/challenge", {})).text).data.difficulty as number;
    const failed = await postRaw(baseUrl, "/portal/v1/owner/lookup", {
      plate: "EEE5E55",
      renavam: "9",
      challengeId: "forged-challenge-id",
      solution: "0",
    });
    assert.equal(failed.status, 400);
    assert.equal(JSON.parse(failed.text).error.code, "CHALLENGE_FAILED");
    const after = JSON.parse((await postRaw(baseUrl, "/portal/v1/owner/challenge", {})).text).data.difficulty as number;
    assert.ok(after > before, `a dificuldade deve subir após falha (${before} → ${after})`);
    assert.ok(accessLog.readForTests().some((row) => row.outcome === "CHALLENGE_FAILED"));
  });
});

test("PoW reusado no lookup: mesmo challengeId+solução 2× → 2ª vez 400 CHALLENGE_FAILED", async () => {
  const { service } = buildHarness();
  await seedProcess({ plate: "FFF6F66", renavam: "33333333333" });
  await withApp(service, async (baseUrl) => {
    const ch = JSON.parse((await postRaw(baseUrl, "/portal/v1/owner/challenge", {})).text).data as {
      challengeId: string;
      salt: string;
      difficulty: number;
    };
    const solution = solveChallenge(ch.salt, ch.difficulty);
    const body = { plate: "FFF6F66", renavam: "33333333333", challengeId: ch.challengeId, solution };
    const first = await postRaw(baseUrl, "/portal/v1/owner/lookup", body);
    const second = await postRaw(baseUrl, "/portal/v1/owner/lookup", body);
    assert.equal(JSON.parse(first.text).data.found, true);
    assert.equal(second.status, 400);
    assert.equal(JSON.parse(second.text).error.code, "CHALLENGE_FAILED");
  });
});

// ── (5) §2.8 — a resposta do lookup NÃO contém tenant_id/origem/storage_key/UUID; allowlist de campos ────────────
test("§2.8: resposta FOUND minimizada — allowlist de 6 campos, SEM UUID/origem/Renavam/tenant_id", async () => {
  const { service } = buildHarness();
  const yardId = await seedYard("Pátio Municipal Central", "Av. das Custódias, 1000 - Centro");
  await seedProcess({ plate: "GGG7G77", renavam: "44444444444", yardId, originAuthority: "Delegacia-Fantasma-SECRETA" });
  await withApp(service, async (baseUrl) => {
    const res = await lookupFlow(baseUrl, { plate: "GGG7G77", renavam: "44444444444" });
    assert.equal(res.status, 200);
    const parsed = JSON.parse(res.text) as { data: { found: boolean; process: Record<string, unknown>; session: string } };
    assert.equal(parsed.data.found, true);
    // allowlist EXATA dos campos do process minimizado.
    assert.deepEqual(
      Object.keys(parsed.data.process).sort(),
      ["enteredAt", "statusLabel", "status", "totalDueLabel", "yardPublicAddress", "yardPublicName"].sort(),
    );
    assert.equal(parsed.data.process.yardPublicName, "Pátio Municipal Central");
    // NENHUM UUID em lugar nenhum do corpo (nem o processId — a sessão é JWE opaco, não base64-decodável).
    assert.equal(UUID_RE.test(res.text), false, "a resposta pública não pode conter UUID");
    // origem/Renavam/tenant_id NUNCA vazam.
    assert.equal(res.text.includes("Delegacia-Fantasma-SECRETA"), false);
    assert.equal(res.text.includes("44444444444"), false);
    assert.equal(res.text.toLowerCase().includes("tenant"), false);
    assert.equal(res.text.includes(TENANT), false);
  });
});

// ── (6) PortalAccessLog — 1 linha/tentativa, sem placa/Renavam/IP crus (só fingerprint/hash) ────────────────────
test("PortalAccessLog: 1 linha por tentativa; NUNCA placa/Renavam/IP crus (só HMAC fingerprint/ip_hash)", async () => {
  const { service, accessLog } = buildHarness();
  await seedProcess({ plate: "HHH8H88", renavam: "55555555555" });
  await withApp(service, async (baseUrl) => {
    await lookupFlow(baseUrl, { plate: "HHH8H88", renavam: "55555555555" }); // 1 CHALLENGE_ISSUED + 1 LOOKUP(FOUND)
    await lookupFlow(baseUrl, { plate: "HHH8H88", renavam: "00000000000" }); // 1 CHALLENGE_ISSUED + 1 LOOKUP(FACTOR_MISMATCH)
  });
  const rows = accessLog.readForTests();
  assert.equal(rows.length, 4, "2 fluxos = 2 challenge + 2 lookup = 4 linhas");
  const outcomes = rows.map((r) => r.outcome).sort();
  assert.deepEqual(outcomes, ["FACTOR_MISMATCH", "FOUND", "ISSUED", "ISSUED"]);
  const blob = JSON.stringify(rows);
  assert.equal(blob.includes("HHH8H88"), false, "placa crua não pode aparecer no log");
  assert.equal(blob.includes("55555555555"), false, "Renavam cru não pode aparecer no log");
  assert.equal(blob.includes("127.0.0.1"), false, "IP cru não pode aparecer no log");
  // toda linha tem ip_hash (HMAC hex 64); os LOOKUP têm query_fingerprint HMAC hex 64.
  for (const row of rows) {
    assert.match(row.ipHash, /^[0-9a-f]{64}$/);
    if (row.action === "LOOKUP") assert.match(row.queryFingerprint ?? "", /^[0-9a-f]{64}$/);
  }
  // process_id só na linha FOUND (I9).
  assert.equal(rows.filter((r) => r.processId).length, 1);
  assert.equal(rows.find((r) => r.processId)?.outcome, "FOUND");
});

// ── (7) CRÍTICO-1 — bypass do 2º fator por normalização vazia (PoC do ciclo 1) ──────────────────────────────────
// PoC ciclo 1: processo com Renavam SEM dígito ("N/A" → stored "") + lookup com Renavam sem dígito ("zzz" → "") →
// `constantTimeEqual("","")===true` emitia FOUND + sessão só com a placa. Agora a guarda de comprimento no serviço
// (provided.length>0 && stored.length>0) força NOT_FOUND. Testado NO SERVIÇO (defesa em profundidade — vale mesmo
// se o dado sujo já estiver na base e o validador HTTP for contornado).
test("CRÍTICO-1: registro sem Renavam-dígito + lookup Renavam sem dígito → not_found (nunca FOUND/sessão)", async () => {
  const { service, challengeStore } = buildHarness();
  await seedProcess({ plate: "PWN1E11", renavam: "N/A" }); // stored normaliza para "" (o exato registro do PoC)
  const nowMs = Date.now();
  const ch = issueChallenge(challengeStore, BASE_ANTI_ABUSE.baseDifficulty, 120_000, nowMs);
  const solution = solveChallenge(ch.salt, ch.difficulty);
  const result = await service.lookup({
    plate: "PWN1E11",
    renavam: "zzz", // provided normaliza para "" — antes casava com o stored vazio
    challengeId: ch.challengeId,
    solution,
    ip: "203.0.113.9",
  });
  assert.equal(result.kind, "not_found", "digitless×digitless NÃO pode autenticar (era o bypass do PoC)");
  assert.equal("session" in result, false, "nenhuma sessão pode ser emitida");
});

test("CRÍTICO-1: HTTP — lookup com Renavam SEM dígito → 400 genérico (validador rejeita formato); nunca sessão", async () => {
  const { service } = buildHarness();
  await seedProcess({ plate: "PWN1E11", renavam: "N/A" });
  await withApp(service, async (baseUrl) => {
    const res = await postRaw(baseUrl, "/portal/v1/owner/lookup", {
      plate: "PWN1E11",
      renavam: "N/A", // sem dígito → rejeitado no validador ANTES de qualquer resolução
      challengeId: "any-non-empty-id",
      solution: "0",
    });
    assert.equal(res.status, 400);
    assert.equal(JSON.parse(res.text).error.code, "BAD_REQUEST");
    assert.equal(res.text.includes("session"), false);
  });
});

// ── (8) HIGH-1 — /challenge com rate-limit por IP (contenção de flood/exaustão) ──────────────────────────────────
test("HIGH-1: flood de /challenge do mesmo IP → 429 após o teto; log limitado ao teto (não cresce sem limite)", async () => {
  const { service, accessLog } = buildHarness({
    antiAbuse: { challengeBucket: { capacity: 3, refillTokens: 3, refillIntervalMs: 3_600_000 } },
  });
  await withApp(service, async (baseUrl) => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      statuses.push((await postRaw(baseUrl, "/portal/v1/owner/challenge", {})).status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429, 429], "o 4º /challenge do mesmo IP estoura o balde");
    // O rate-limit também bounda a ESCRITA no log: só os desafios EMITIDOS (dentro do teto) geram linha.
    const issued = accessLog.readForTests().filter((r) => r.action === "CHALLENGE_ISSUED");
    assert.equal(issued.length, 3, "os /challenge barrados por rate-limit NÃO gravam PortalAccessLog");
  });
});

// ── (9) HIGH-1 — InMemoryChallengeStore com cap + eviction (o Map não cresce indefinidamente) ────────────────────
test("HIGH-1: InMemoryChallengeStore aplica cap FIFO + sweep de expirados (store não cresce indefinidamente)", () => {
  // (a) cap FIFO: 50 desafios VIVOS num store de teto 5 → o tamanho nunca ultrapassa 5.
  const capped = new InMemoryChallengeStore(5);
  for (let i = 0; i < 50; i += 1) issueChallenge(capped, 2, 120_000, Date.now());
  assert.ok(capped.size() <= 5, `cap FIFO deve segurar o tamanho (<=5), tem ${capped.size()}`);

  // (b) sweep de expirados: um store cheio de desafios EXPIRADOS abre espaço no próximo put (não estoura o teto).
  const sweeping = new InMemoryChallengeStore(3);
  issueChallenge(sweeping, 2, 1, 0); // expiresAtMs = 1
  issueChallenge(sweeping, 2, 1, 0);
  issueChallenge(sweeping, 2, 1, 0);
  issueChallenge(sweeping, 2, 120_000, Date.now()); // dispara evict → varre os 3 expirados
  assert.ok(sweeping.size() <= 3, `store deve respeitar o teto após sweep, tem ${sweeping.size()}`);
  assert.ok(sweeping.size() >= 1, "o desafio novo (vivo) permanece");
});
