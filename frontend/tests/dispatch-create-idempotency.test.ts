import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Shim NÃO-destrutivo de window/localStorage: o service importa api/client (auth.storage).
const g = globalThis as unknown as { window?: { localStorage?: unknown; dispatchEvent?: unknown } };
g.window ??= {};
g.window.localStorage ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
g.window.dispatchEvent ??= () => true;

// B-O6R-09 · T12 (item 7 do portão; Pergunta 1 = (A), `D-PORTAO-3-RECOMENDACOES-1111`) — a web ENVIA a chave de
// repetição na criação do despacho, e a chave é POR INTENÇÃO:
//   - o POST leva `idempotencyKey`;
//   - a nova tentativa depois de um erro reusa a MESMA chave (é ela que faz o servidor devolver o despacho já criado
//     quando a 1ª resposta se perdeu, em vez de criar um 2º);
//   - depois do sucesso, a chave muda (o próximo despacho é outra intenção);
//   - mudar a OS, o técnico ou o status muda a chave (assim o 422 de reuso, que a tela traduziria como "alvo não é
//     técnico", nunca é provocado por ela).
// Os dois chamadores reais (`useAllocateDispatch` do mapa e a página de despachos) passam pela mesma fonte de chave.

const DISPATCHES_DIR = new URL("../src/modules/operations/", import.meta.url);
const readSrc = (rel: string) => readFileSync(fileURLToPath(new URL(rel, DISPATCHES_DIR)), "utf8");

test("POST /operations/dispatches leva idempotencyKey no corpo", async () => {
  const { createDispatch } = await import("../src/modules/operations/dispatches/dispatches.service");
  const original = globalThis.fetch;
  const bodies: unknown[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    bodies.push(init?.body ? JSON.parse(String(init.body)) : undefined);
    return new Response(
      JSON.stringify({ data: { id: "11111111-1111-4111-8111-111111111111", workOrderId: "w", operatorUserId: "o", status: "assigned", timeline: [] } }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    await createDispatch({ token: "t", tenantId: "tenant-1", permissions: ["field_dispatch:create"] }, {
      workOrderId: "w",
      operatorUserId: "o",
      idempotencyKey: "web-chave-0001",
    });
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(bodies.length, 1);
  assert.equal((bodies[0] as { idempotencyKey?: string }).idempotencyKey, "web-chave-0001");
});

test("nova tentativa depois de erro reusa a MESMA; depois de sucesso muda; mudar OS, técnico ou status muda a chave", async () => {
  const { createDispatchIntentKeySource } = await import("../src/modules/operations/dispatches/useDispatchIntentKey");
  let seq = 0;
  const source = createDispatchIntentKeySource(() => `chave-${(seq += 1)}`);
  const intent = { workOrderId: "os-1", operatorUserId: "tec-1", status: "assigned" as const };

  const first = source.keyFor(intent);
  assert.match(first, /^[A-Za-z0-9._:-]{8,128}$/, "a chave tem o formato que o servidor aceita");
  assert.equal(source.keyFor({ ...intent }), first, "a nova tentativa (mesma intenção, depois de erro) trocou a chave");

  source.succeeded();
  const afterSuccess = source.keyFor(intent);
  assert.notEqual(afterSuccess, first, "depois do sucesso a chave continuou a mesma");

  const otherWorkOrder = source.keyFor({ ...intent, workOrderId: "os-2" });
  assert.notEqual(otherWorkOrder, afterSuccess, "mudar a OS não trocou a chave");
  const otherTechnician = source.keyFor({ ...intent, workOrderId: "os-2", operatorUserId: "tec-2" });
  assert.notEqual(otherTechnician, otherWorkOrder, "mudar o técnico não trocou a chave");
  const otherStatus = source.keyFor({ ...intent, workOrderId: "os-2", operatorUserId: "tec-2", status: "draft" });
  assert.notEqual(otherStatus, otherTechnician, "mudar o status não trocou a chave");
  assert.equal(source.keyFor({ ...intent, workOrderId: "os-2", operatorUserId: "tec-2", status: "draft" }), otherStatus);

  const real = createDispatchIntentKeySource();
  assert.match(real.keyFor(intent), /^[A-Za-z0-9._:-]{8,128}$/, "a chave padrão (UUID) cabe no formato do servidor");
});

test("os dois chamadores reais criam o despacho com a chave por intenção e só a trocam depois do sucesso", () => {
  for (const rel of ["map/hooks/useAllocateDispatch.ts", "dispatches/pages/OperationsDispatchesPage.tsx"]) {
    const src = readSrc(rel);
    assert.match(src, /useDispatchIntentKey\(\)/, `${rel} não usa a fonte de chave por intenção`);
    const call = src.indexOf("createDispatch(context, {");
    assert.ok(call >= 0, `${rel} não passa um payload com a chave a createDispatch`);
    const window = src.slice(call, call + 200);
    assert.match(window, /idempotencyKey: \w+\.keyFor\(payload\)/, `${rel} não envia a chave da intenção`);
    const succeeded = src.indexOf(".succeeded();", call);
    assert.ok(succeeded > call, `${rel} não troca a chave depois do sucesso`);
    const catchAt = src.indexOf("catch", call);
    assert.ok(catchAt < 0 || succeeded < catchAt, `${rel} troca a chave também no erro (a nova tentativa criaria um 2º despacho)`);
  }
});
