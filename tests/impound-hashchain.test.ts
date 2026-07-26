import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import {
  canonicalJson,
  computeEventHash,
  genesisHash,
  verifyChain,
  type ChainEventLike,
} from "../src/modules/impound/impound.hashchain.js";
import {
  createMemoryImpoundService,
  resetImpoundRuntimeForTests,
} from "../src/modules/impound/impound.service.js";
import { ImpoundError, type ImpoundActorContext } from "../src/modules/impound/impound.types.js";

const TENANT = "11111111-1111-4111-8111-111111111111";
const PROCESS = "22222222-2222-4222-8222-222222222222";
const OCCURRED = new Date("2026-07-26T12:00:00.000Z");

function actor(tenantId = randomUUID()): ImpoundActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["impound:read", "impound:create", "impound:update", "impound:transition"],
  };
}

// Constrói uma cadeia VÁLIDA a partir do GENESIS(tenant,process) usando as MESMAS funções puras do módulo.
function buildChain(tenantId: string, processId: string, payloads: readonly unknown[]): ChainEventLike[] {
  let prevHash = genesisHash(tenantId, processId);
  const events: ChainEventLike[] = [];
  payloads.forEach((payload, index) => {
    const seq = index + 1;
    const hash = computeEventHash({ prevHash, seq, type: "STATUS_CHANGE", payload: payload as never, occurredAt: OCCURRED, actorId: null });
    events.push({ seq, type: "STATUS_CHANGE", payload: payload as never, occurredAt: OCCURRED, actorId: null, prevHash, hash });
    prevHash = hash;
  });
  return events;
}

const validPayloads = [
  { from: null, to: "IN_REMOVAL" },
  { from: "IN_REMOVAL", to: "RECEPTION" },
  { from: "RECEPTION", to: "ACTIVE_CUSTODY" },
];

function headOf(events: readonly ChainEventLike[]) {
  return events.length === 0 ? { seq: 0, hash: null } : { seq: events[events.length - 1].seq, hash: events[events.length - 1].hash };
}

// ── canonicalização determinística ─────────────────────────────────────────────────────────────────────────

test("canonicalJson: ordem de chaves NÃO altera a saída (determinismo)", () => {
  const a = canonicalJson({ b: 2, a: 1, nested: { y: "x", a: [3, 1] } });
  const b = canonicalJson({ nested: { a: [3, 1], y: "x" }, a: 1, b: 2 });
  assert.equal(a, b);
  assert.equal(a, '{"a":1,"b":2,"nested":{"a":[3,1],"y":"x"}}');
});

test("canonicalJson: ordem de ARRAY é semântica (preservada)", () => {
  assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
});

test("canonicalJson: número não-inteiro → 422 non_canonical_number", () => {
  assert.throws(() => canonicalJson({ n: 1.5 }), (e: unknown) => e instanceof ImpoundError && e.statusCode === 422 && e.reason === "non_canonical_number");
  assert.throws(() => canonicalJson({ n: Number.POSITIVE_INFINITY }), (e: unknown) => e instanceof ImpoundError && e.reason === "non_canonical_number");
});

test("canonicalJson: undefined/função no payload → 422 non_canonical_value", () => {
  assert.throws(() => canonicalJson({ x: undefined }), (e: unknown) => e instanceof ImpoundError && e.reason === "non_canonical_value");
  assert.throws(() => canonicalJson({ x: () => 1 }), (e: unknown) => e instanceof ImpoundError && e.reason === "non_canonical_value");
});

test("SEP injection: o RECORD SEPARATOR (0x1E) no texto do payload eh escapado — nao vaza a fronteira", () => {
  const SEP = String.fromCharCode(0x1e);
  const withSep = canonicalJson({ note: `a${SEP}b` });
  // o byte cru 0x1E NUNCA aparece na saida (JSON.stringify o escapa, 6 chars ASCII).
  assert.equal(withSep.includes(SEP), false);
  assert.equal(withSep, JSON.stringify({ note: `a${SEP}b` }));
  const base = { prevHash: genesisHash(TENANT, PROCESS), seq: 1, type: "STATUS_CHANGE" as const, occurredAt: OCCURRED, actorId: null };
  const hWith = computeEventHash({ ...base, payload: { note: `a${SEP}b` } as never });
  const hWithout = computeEventHash({ ...base, payload: { note: "ab" } as never });
  assert.notEqual(hWith, hWithout);
});

test("verifyChain: cadeia válida → valid=true, headHash da ponta", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const result = verifyChain({ tenantId: TENANT, processId: PROCESS, events, head: headOf(events) });
  assert.equal(result.valid, true);
  assert.equal(result.eventCount, 3);
  assert.equal(result.headHash, events[2].hash);
  assert.equal(result.brokenAt, undefined);
});

test("verifyChain: adulterar PAYLOAD de um evento → hash_mismatch no seq certo", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const tampered = events.map((e, i) => (i === 1 ? { ...e, payload: { from: "IN_REMOVAL", to: "HACKED" } } : e));
  const result = verifyChain({ tenantId: TENANT, processId: PROCESS, events: tampered, head: headOf(events) });
  assert.equal(result.valid, false);
  assert.deepEqual(result.brokenAt, { seq: 2, reason: "hash_mismatch" });
});

test("verifyChain: adulterar occurred_at / actor_id / type → hash_mismatch", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const head = headOf(events);
  const occ = events.map((e, i) => (i === 1 ? { ...e, occurredAt: new Date("2000-01-01T00:00:00.000Z") } : e));
  assert.deepEqual(verifyChain({ tenantId: TENANT, processId: PROCESS, events: occ, head }).brokenAt, { seq: 2, reason: "hash_mismatch" });
  const act = events.map((e, i) => (i === 1 ? { ...e, actorId: randomUUID() } : e));
  assert.deepEqual(verifyChain({ tenantId: TENANT, processId: PROCESS, events: act, head }).brokenAt, { seq: 2, reason: "hash_mismatch" });
  const typ = events.map((e, i) => (i === 1 ? { ...e, type: "ADJUSTMENT" } : e));
  assert.deepEqual(verifyChain({ tenantId: TENANT, processId: PROCESS, events: typ, head }).brokenAt, { seq: 2, reason: "hash_mismatch" });
});

test("verifyChain: pular um seq (reordenar/remover meio) → seq_gap", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const gapped = [events[0], events[2]]; // remove o seq=2
  const result = verifyChain({ tenantId: TENANT, processId: PROCESS, events: gapped, head: headOf(events) });
  assert.deepEqual(result.brokenAt, { seq: 3, reason: "seq_gap" });
});

test("verifyChain: trocar prev_hash → prev_hash_mismatch", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const broken = events.map((e, i) => (i === 2 ? { ...e, prevHash: "0".repeat(64) } : e));
  const result = verifyChain({ tenantId: TENANT, processId: PROCESS, events: broken, head: headOf(events) });
  assert.deepEqual(result.brokenAt, { seq: 3, reason: "prev_hash_mismatch" });
});

test("verifyChain: DELETE da ponta (âncora intacta) → count_mismatch", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const head = headOf(events); // âncora ainda em seq=3
  const truncated = events.slice(0, 2);
  const result = verifyChain({ tenantId: TENANT, processId: PROCESS, events: truncated, head });
  assert.deepEqual(result.brokenAt, { seq: 3, reason: "count_mismatch" });
});

test("verifyChain: adulterar a ÂNCORA custody_hash_head (sem mexer nos eventos) → head_mismatch", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const result = verifyChain({ tenantId: TENANT, processId: PROCESS, events, head: { seq: 3, hash: "f".repeat(64) } });
  assert.deepEqual(result.brokenAt, { seq: 3, reason: "head_mismatch" });
});

test("verifyChain: enxertar evento forjado no MEIO → prev_hash_mismatch no elo seguinte", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  // Forja e2': seq/prev corretos, payload do atacante, hash recomputado — mas e3 ainda aponta o prev ORIGINAL.
  const forgedPrev = events[0].hash;
  const forgedPayload = { from: "IN_REMOVAL", to: "INJECTED" };
  const forgedHash = computeEventHash({ prevHash: forgedPrev, seq: 2, type: "STATUS_CHANGE", payload: forgedPayload as never, occurredAt: OCCURRED, actorId: null });
  const forged: ChainEventLike = { seq: 2, type: "STATUS_CHANGE", payload: forgedPayload as never, occurredAt: OCCURRED, actorId: null, prevHash: forgedPrev, hash: forgedHash };
  const graftedChain = [events[0], forged, events[2]];
  const result = verifyChain({ tenantId: TENANT, processId: PROCESS, events: graftedChain, head: headOf(events) });
  assert.deepEqual(result.brokenAt, { seq: 3, reason: "prev_hash_mismatch" });
});

test("verifyChain: enxerto CROSS-PROCESS (cadeia válida de A sob B) quebra no seq=1 — GENESIS amarrado a tenant+process", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const otherProcess = "33333333-3333-4333-8333-333333333333";
  const result = verifyChain({ tenantId: TENANT, processId: otherProcess, events, head: headOf(events) });
  assert.deepEqual(result.brokenAt, { seq: 1, reason: "prev_hash_mismatch" });
  // e sob outro TENANT também quebra no seq=1.
  const otherTenant = "44444444-4444-4444-8444-444444444444";
  assert.deepEqual(
    verifyChain({ tenantId: otherTenant, processId: PROCESS, events, head: headOf(events) }).brokenAt,
    { seq: 1, reason: "prev_hash_mismatch" },
  );
});

// ── reconciliação do CROSS-ANCHOR (audit_logs, store independente) — F1 da junta ────────────────────────────

// Deriva a trilha de anchors (seq/hash) que o audit_logs teria para uma cadeia.
function anchorsOf(events: readonly ChainEventLike[]) {
  return events.map((e) => ({ seq: e.seq, hash: e.hash }));
}

test("cross-anchor: cadeia válida + trilha coerente → valid=true", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const result = verifyChain({ tenantId: TENANT, processId: PROCESS, events, head: headOf(events), crossAnchors: anchorsOf(events) });
  assert.equal(result.valid, true);
});

test("cross-anchor: TIP truncado + custody_hash_head AJUSTADO (âncora do agregado coerente) → cross_anchor_mismatch", () => {
  // O ataque que a âncora do agregado sozinha NÃO pega: apaga o evento da ponta E ajusta seq/hash do head para o
  // penúltimo. Sem cross-anchor, verify PASSA. Com a trilha do audit_logs (que ainda tem o anchor do seq apagado),
  // é detectado.
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const truncated = events.slice(0, 2); // remove a ponta (seq=3)
  const adjustedHead = { seq: 2, hash: events[1].hash }; // custody_hash_head "consertado" para o penúltimo
  const fullAnchors = anchorsOf(events); // audit_logs ainda conhece o seq=3

  // Sem cross-anchor: o ataque PASSA (âncora do agregado coerente com a cadeia truncada).
  const withoutAnchor = verifyChain({ tenantId: TENANT, processId: PROCESS, events: truncated, head: adjustedHead });
  assert.equal(withoutAnchor.valid, true, "sem cross-anchor o ataque de tip-truncation passa (limitação declarada)");

  // Com cross-anchor: DETECTADO no seq da ponta apagada.
  const withAnchor = verifyChain({ tenantId: TENANT, processId: PROCESS, events: truncated, head: adjustedHead, crossAnchors: fullAnchors });
  assert.deepEqual(withAnchor.brokenAt, { seq: 3, reason: "cross_anchor_mismatch" });
});

test("cross-anchor: hash do anchor diverge do hash da cadeia (reescrita sem reescrever o audit_logs) → cross_anchor_mismatch", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  // audit_logs guarda o hash ORIGINAL do seq=2; a cadeia foi reescrita coerentemente (outra realidade).
  const rewritten = buildChain(TENANT, PROCESS, [validPayloads[0], { from: "IN_REMOVAL", to: "REWRITTEN" }, validPayloads[2]]);
  const result = verifyChain({
    tenantId: TENANT,
    processId: PROCESS,
    events: rewritten,
    head: headOf(rewritten),
    crossAnchors: anchorsOf(events), // trilha da realidade ORIGINAL
  });
  assert.deepEqual(result.brokenAt, { seq: 2, reason: "cross_anchor_mismatch" });
});

test("cross-anchor: anchor FALTANDO para um evento existente → cross_anchor_mismatch", () => {
  const events = buildChain(TENANT, PROCESS, validPayloads);
  const partialAnchors = anchorsOf(events).filter((a) => a.seq !== 2); // audit_logs do seq=2 foi apagado
  const result = verifyChain({ tenantId: TENANT, processId: PROCESS, events, head: headOf(events), crossAnchors: partialAnchors });
  assert.deepEqual(result.brokenAt, { seq: 2, reason: "cross_anchor_mismatch" });
});

// ── end-to-end pelo serviço InMemory (create + transições → verify válido) ──────────────────────────────────

test("serviço: create + transições reais → verify.valid=true e seq/head coerentes", async () => {
  resetImpoundRuntimeForTests();
  const service = createMemoryImpoundService();
  const a = actor();
  const process = await service.create(a, { profile_id: randomUUID(), origin_authority: "Órgão X", vehicle_plate: "ABC1D23" });
  assert.equal(process.status, "IN_REMOVAL");
  assert.equal(process.custodySeqHead, 1); // evento de abertura

  await service.transition(a, process.id, { to: "RECEPTION" });
  const active = await service.transition(a, process.id, { to: "ACTIVE_CUSTODY", inspection_complete: true });
  assert.equal(active.status, "ACTIVE_CUSTODY");
  assert.equal(active.custodySeqHead, 3);

  const verify = await service.verify(a, process.id);
  assert.equal(verify.valid, true);
  assert.equal(verify.eventCount, 3);
  assert.equal(verify.headHash, active.custodyHashHead);
});

test("serviço: append-only — não há método para UPDATE/DELETE de evento (correção = novo ADJUSTMENT)", async () => {
  resetImpoundRuntimeForTests();
  const service = createMemoryImpoundService();
  const surface = service as unknown as Record<string, unknown>;
  assert.equal(typeof surface.updateEvent, "undefined");
  assert.equal(typeof surface.deleteEvent, "undefined");
  assert.equal(typeof surface.editEvent, "undefined");
});
