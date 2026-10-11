import assert from "node:assert/strict";
import test from "node:test";

import { createTraccarIngestLimiter } from "../src/integrations/traccar/traccar-rate-limit.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · taxa e concorrência da ingestão (plano v2.1 §4.6; A2-11; MUT-30). Token bucket por processo
// (20/s sustentadas, rajada de 100) e no máximo 10 em processamento; relógio injetado, sem dependência nova.
// -----------------------------------------------------------------------------------------------

function limiter(start = 1_000_000) {
  let now = start;
  const instance = createTraccarIngestLimiter({
    ratePerSecond: 20,
    burst: 100,
    maxConcurrency: 1_000,
    now: () => now,
  });
  return { instance, advance: (ms: number) => (now += ms) };
}

test("taxa: a rajada de 100 passa e a 101ª é recusada (429)", { timeout: 30_000 }, () => {
  const { instance } = limiter();
  for (let index = 0; index < 100; index++) {
    const slot = instance.tryEnter();
    assert.equal(slot.ok, true, `a ${index + 1}ª da rajada devia passar`);
    if (slot.ok) slot.release();
  }
  const extra = instance.tryEnter();
  assert.equal(extra.ok, false);
  if (!extra.ok) assert.equal(extra.reason, "rate");
});

test("taxa: depois de 1 s, 20 novas passam e a 21ª não", { timeout: 30_000 }, () => {
  const { instance, advance } = limiter();
  for (let index = 0; index < 100; index++) {
    const slot = instance.tryEnter();
    if (slot.ok) slot.release();
  }
  assert.equal(instance.tryEnter().ok, false);
  advance(1_000);
  for (let index = 0; index < 20; index++) {
    const slot = instance.tryEnter();
    assert.equal(slot.ok, true, `a ${index + 1}ª depois de 1 s devia passar`);
    if (slot.ok) slot.release();
  }
  assert.equal(instance.tryEnter().ok, false);
});

test("concorrência: com 10 em processamento, a 11ª é recusada (429)", { timeout: 30_000 }, () => {
  let now = 0;
  const instance = createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10, now: () => now });
  const held = [];
  for (let index = 0; index < 10; index++) {
    const slot = instance.tryEnter();
    assert.equal(slot.ok, true);
    held.push(slot);
  }
  const eleventh = instance.tryEnter();
  assert.equal(eleventh.ok, false);
  if (!eleventh.ok) assert.equal(eleventh.reason, "concurrency");
  now += 1;
});

test("concorrência: liberada uma vaga, a seguinte passa", { timeout: 30_000 }, () => {
  const instance = createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10, now: () => 0 });
  const held: Array<{ ok: true; release: () => void }> = [];
  for (let index = 0; index < 10; index++) {
    const slot = instance.tryEnter();
    assert.ok(slot.ok);
    held.push(slot);
  }
  assert.equal(instance.tryEnter().ok, false);
  held[0]!.release();
  held[0]!.release(); // liberar duas vezes não abre vaga extra
  const next = instance.tryEnter();
  assert.equal(next.ok, true);
  assert.equal(instance.tryEnter().ok, false, "liberação dupla não pode abrir duas vagas");
});
