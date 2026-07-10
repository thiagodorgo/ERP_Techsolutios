import type { GeocodeResult, Geocoder } from "./geocoder.js";

/**
 * Ω1b-2 — geocoder no-op: nunca faz rede, sempre devolve `null`. É o default do serviço em memória e
 * quando `GEOCODING_ENABLED=false` — garante que CI e produção não toquem provedores externos.
 */
export class NoopGeocoder implements Geocoder {
  async geocode(): Promise<GeocodeResult | null> {
    return null;
  }

  isEnabled(): boolean {
    return false;
  }
}
