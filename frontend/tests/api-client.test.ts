import assert from "node:assert/strict";
import test from "node:test";

// Shim NÃO-destrutivo: só preenche o que faltar, para não sobrescrever um
// window/jsdom já configurado por outros testes no mesmo processo node --test.
const g = globalThis as unknown as {
  window?: { localStorage?: unknown; dispatchEvent?: unknown };
};
g.window ??= {};
g.window.localStorage ??= {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};
g.window.dispatchEvent ??= () => true;

test("apiData desembrulha o envelope { data }", async () => {
  const { apiData } = await import("../src/services/api/client");
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: { ok: 1 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  try {
    const result = await apiData<{ ok: number }>("/x");
    assert.equal(result.ok, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("apiRequest lança ApiError com status em falha", async () => {
  const { apiRequest, ApiError } = await import("../src/services/api/client");
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("boom", { status: 500 })) as typeof fetch;
  try {
    await assert.rejects(
      () => apiRequest("/x"),
      (error: unknown) => error instanceof ApiError && error.status === 500,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("ApiError expõe safeMessage sem vazar corpo cru", async () => {
  const { ApiError } = await import("../src/services/api/client");
  const err = new ApiError(409, "Conflito de dados. Recarregue e tente novamente.");
  assert.equal(err.status, 409);
  assert.match(err.safeMessage, /Conflito/);
});
