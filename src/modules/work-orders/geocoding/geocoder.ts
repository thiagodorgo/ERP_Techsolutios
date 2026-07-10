/**
 * Ω1b-2 — contrato de geocodificação (endereço → coordenada). Implementações: NominatimGeocoder
 * (dev, throttle + cache + timeout) e NoopGeocoder (CI/prod/desligado). O serviço de OS decide QUANDO
 * chamar (só quando falta coord) e persiste o resultado nas colunas da OS, que são o cache durável.
 */

export type GeocodeQuery = {
  readonly address?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly zipCode?: string | null;
};

export type GeocodeResult = {
  readonly latitude: number;
  readonly longitude: number;
  readonly source: string;
};

export interface Geocoder {
  /** Resolve a query para uma coordenada; `null` quando o provedor não encontra o endereço. */
  geocode(query: GeocodeQuery): Promise<GeocodeResult | null>;
  /**
   * `false` quando a geocodificação está desabilitada (NoopGeocoder). Permite ao serviço dar uma
   * razão HONESTA ("desabilitada") em vez de "endereço não localizado" — o botão nunca mente.
   */
  isEnabled(): boolean;
}

/** Monta a string de busca a partir das partes não-vazias; `null` quando não há nada para geocodificar. */
export function buildGeocodeQueryString(query: GeocodeQuery): string | null {
  const parts = [query.address, query.city, query.state, query.zipCode]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

/** Erro do provedor (rede/429/timeout) — o serviço mapeia para 502 sem persistir nada (fail-open). */
export class GeocoderUnavailableError extends Error {
  constructor(message = "Provedor de geocodificação indisponível.") {
    super(message);
    this.name = "GeocoderUnavailableError";
  }
}
