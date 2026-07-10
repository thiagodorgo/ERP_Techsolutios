import { buildGeocodeQueryString, GeocoderUnavailableError, type GeocodeQuery, type GeocodeResult, type Geocoder } from "./geocoder.js";

/**
 * Ω1b-2 — geocodificação via Nominatim (OpenStreetMap), apenas em DEV. Regras herdadas de PD-002/PD-003:
 * máx. ~1 req/s (throttle serial), User-Agent identificável, cache para nunca repetir a mesma query,
 * e — R3 do critico-adversarial — TIMEOUT via AbortController + corrida de segurança, para que um fetch
 * pendurado nunca bloqueie a fila serial nem o endpoint. `fetchImpl` é injetável para testar sem rede.
 */

type FetchResponseLike = { readonly ok: boolean; readonly status: number; json(): Promise<unknown> };
type FetchLike = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<FetchResponseLike>;

export type NominatimGeocoderOptions = {
  readonly baseUrl: string;
  readonly userAgent: string;
  readonly countryCodes?: string;
  readonly minIntervalMs?: number;
  readonly timeoutMs?: number;
  readonly fetchImpl?: FetchLike;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class NominatimGeocoder implements Geocoder {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly countryCodes: string;
  private readonly minIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  // Cache durável (resolvido) + in-flight (dedupe de queries idênticas concorrentes).
  private readonly cache = new Map<string, GeocodeResult | null>();
  private readonly inflight = new Map<string, Promise<GeocodeResult | null>>();
  // Fila serial + carimbo do último disparo real, para o throttle de 1 req/s.
  private chain: Promise<unknown> = Promise.resolve();
  private lastCallAt = 0;

  constructor(options: NominatimGeocoderOptions) {
    this.baseUrl = options.baseUrl;
    this.userAgent = options.userAgent;
    this.countryCodes = options.countryCodes ?? "br";
    this.minIntervalMs = options.minIntervalMs ?? 1100;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async geocode(query: GeocodeQuery): Promise<GeocodeResult | null> {
    const queryString = buildGeocodeQueryString(query);
    if (!queryString) return null;
    const key = queryString.toLowerCase();

    if (this.cache.has(key)) return this.cache.get(key) ?? null;
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const task = this.enqueue(() => this.fetchOnce(queryString))
      .then((result) => {
        this.cache.set(key, result);
        return result;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    this.inflight.set(key, task);
    return task;
  }

  // Serializa e espaça as chamadas reais; um erro não quebra a cadeia (fila continua).
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      const wait = this.minIntervalMs - (Date.now() - this.lastCallAt);
      if (wait > 0) await delay(wait);
      try {
        return await task();
      } finally {
        this.lastCallAt = Date.now();
      }
    });
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run as Promise<T>;
  }

  private async fetchOnce(queryString: string): Promise<GeocodeResult | null> {
    const url =
      `${this.baseUrl}?q=${encodeURIComponent(queryString)}` +
      `&format=jsonv2&limit=1&addressdetails=1&countrycodes=${encodeURIComponent(this.countryCodes)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: FetchResponseLike;
    try {
      // R3 — corrida de segurança: mesmo que a impl ignore o signal, a fila avança após timeoutMs.
      response = await this.withTimeout(
        this.fetchImpl(url, {
          headers: { "User-Agent": this.userAgent, Accept: "application/json" },
          signal: controller.signal,
        }),
      );
    } catch {
      throw new GeocoderUnavailableError();
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new GeocoderUnavailableError(`Nominatim respondeu ${response.status}.`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) return null;
    const first = payload[0] as { lat?: unknown; lon?: unknown };
    const latitude = Number.parseFloat(String(first?.lat));
    const longitude = Number.parseFloat(String(first?.lon));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    if (latitude === 0 && longitude === 0) return null;
    return { latitude, longitude, source: "nominatim" };
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new GeocoderUnavailableError("timeout")), this.timeoutMs + 100);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }
}
