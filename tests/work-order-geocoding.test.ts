import assert from "node:assert/strict";
import test from "node:test";

import { buildGeocodeQueryString, GeocoderUnavailableError } from "../src/modules/work-orders/geocoding/geocoder.js";
import { NominatimGeocoder } from "../src/modules/work-orders/geocoding/nominatim-geocoder.js";
import { NoopGeocoder } from "../src/modules/work-orders/geocoding/noop-geocoder.js";

type Call = { readonly url: string; readonly headers: Record<string, string> };

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function recordingFetch(handler: (call: number) => ReturnType<typeof jsonResponse> | Promise<ReturnType<typeof jsonResponse>>) {
  const calls: Call[] = [];
  const impl = async (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => {
    calls.push({ url, headers: init.headers });
    return handler(calls.length);
  };
  return { calls, impl };
}

const HIT = [{ lat: "-23.561", lon: "-46.656" }];

function makeGeocoder(impl: ReturnType<typeof recordingFetch>["impl"], overrides = {}) {
  return new NominatimGeocoder({
    baseUrl: "https://nominatim.test/search",
    userAgent: "ERP-Test/1.0",
    countryCodes: "br",
    minIntervalMs: 0,
    timeoutMs: 500,
    fetchImpl: impl,
    ...overrides,
  });
}

test("G1: buildGeocodeQueryString junta partes não-vazias e retorna null quando tudo vazio", () => {
  assert.equal(buildGeocodeQueryString({ address: "Rua A", city: "SP", state: "SP" }), "Rua A, SP, SP");
  assert.equal(buildGeocodeQueryString({ address: "  ", city: null }), null);
  assert.equal(buildGeocodeQueryString({}), null);
});

test("G2: query vazia → null sem tocar o fetch", async () => {
  const { calls, impl } = recordingFetch(() => jsonResponse(HIT));
  const geocoder = makeGeocoder(impl);
  assert.equal(await geocoder.geocode({ address: "   " }), null);
  assert.equal(calls.length, 0);
});

test("G3/G4: request com User-Agent + params corretos; parse lat/lon → número + source", async () => {
  const { calls, impl } = recordingFetch(() => jsonResponse(HIT));
  const geocoder = makeGeocoder(impl);
  const result = await geocoder.geocode({ address: "Av. Paulista, 1000", city: "São Paulo" });
  assert.deepEqual(result, { latitude: -23.561, longitude: -46.656, source: "nominatim" });
  assert.equal(calls.length, 1);
  assert.match(calls[0]!.url, /format=jsonv2/);
  assert.match(calls[0]!.url, /limit=1/);
  assert.match(calls[0]!.url, /countrycodes=br/);
  assert.equal(calls[0]!.headers["User-Agent"], "ERP-Test/1.0");
});

test("G5: array vazio → null e cacheia o 'não encontrado' (2ª chamada não busca)", async () => {
  const { calls, impl } = recordingFetch(() => jsonResponse([]));
  const geocoder = makeGeocoder(impl);
  assert.equal(await geocoder.geocode({ address: "Rua Inexistente" }), null);
  assert.equal(await geocoder.geocode({ address: "Rua Inexistente" }), null);
  assert.equal(calls.length, 1);
});

test("G6: cache — query idêntica dispara um único fetch em duas chamadas", async () => {
  const { calls, impl } = recordingFetch(() => jsonResponse(HIT));
  const geocoder = makeGeocoder(impl);
  await geocoder.geocode({ address: "Av. Paulista", city: "SP" });
  await geocoder.geocode({ address: "Av. Paulista", city: "SP" });
  assert.equal(calls.length, 1);
});

test("G7: throttle respeita o intervalo mínimo entre chamadas reais", async () => {
  const { impl } = recordingFetch(() => jsonResponse(HIT));
  const geocoder = makeGeocoder(impl, { minIntervalMs: 60 });
  const start = Date.now();
  await geocoder.geocode({ address: "A" });
  await geocoder.geocode({ address: "B" });
  assert.ok(Date.now() - start >= 55, "segunda chamada deve esperar o intervalo mínimo");
});

test("G8/G9: 429 e 500 do provedor → GeocoderUnavailableError", async () => {
  const g429 = makeGeocoder(recordingFetch(() => jsonResponse([], false, 429)).impl);
  await assert.rejects(() => g429.geocode({ address: "A" }), GeocoderUnavailableError);
  const g500 = makeGeocoder(recordingFetch(() => jsonResponse([], false, 500)).impl);
  await assert.rejects(() => g500.geocode({ address: "A" }), GeocoderUnavailableError);
});

test("R3: fetch pendurado que respeita o abort → timeout vira GeocoderUnavailableError, não trava", async () => {
  const impl = (_url: string, init: { headers: Record<string, string>; signal: AbortSignal }) =>
    new Promise<ReturnType<typeof jsonResponse>>((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")));
    });
  const geocoder = makeGeocoder(impl, { timeoutMs: 40 });
  await assert.rejects(() => geocoder.geocode({ address: "hang" }), GeocoderUnavailableError);
});

test("R3: fetch que IGNORA o abort ainda resolve pela corrida de segurança (não trava a fila)", async () => {
  const impl = () => new Promise<ReturnType<typeof jsonResponse>>(() => {});
  const geocoder = makeGeocoder(impl, { timeoutMs: 40 });
  await assert.rejects(() => geocoder.geocode({ address: "hang-forever" }), GeocoderUnavailableError);
});

test("G10: NoopGeocoder sempre null, sem rede", async () => {
  assert.equal(await new NoopGeocoder().geocode(), null);
});
