// Ω4C PR-12 — haversine puro, ZERO dependência (matemática hand-rolled; GAP confirmado: não havia util
// haversine no backend). Distância do grande círculo entre dois pontos geográficos, em METROS. Usado só
// pelo agregado de km on-read (nunca fabrica ponto; sem ponto → 0). Raio médio da Terra = 6 371 000 m.
export type GeoPoint = {
  readonly lat: number;
  readonly lng: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}
