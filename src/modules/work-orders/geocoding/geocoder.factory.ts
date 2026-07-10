import { env } from "../../../config/env.js";
import type { Geocoder } from "./geocoder.js";
import { NominatimGeocoder } from "./nominatim-geocoder.js";
import { NoopGeocoder } from "./noop-geocoder.js";

/**
 * Ω1b-2 — escolhe o geocoder pela env. `GEOCODING_ENABLED=false` (default) → NoopGeocoder, então
 * nenhuma chamada externa acontece em CI/prod por acidente. Ligado → NominatimGeocoder configurado.
 */
export function createDefaultGeocoder(): Geocoder {
  if (!env.GEOCODING_ENABLED) return new NoopGeocoder();
  return new NominatimGeocoder({
    baseUrl: env.NOMINATIM_BASE_URL,
    userAgent: env.NOMINATIM_USER_AGENT,
    countryCodes: env.NOMINATIM_COUNTRY_CODES,
    minIntervalMs: env.NOMINATIM_MIN_INTERVAL_MS,
    timeoutMs: env.NOMINATIM_TIMEOUT_MS,
  });
}
