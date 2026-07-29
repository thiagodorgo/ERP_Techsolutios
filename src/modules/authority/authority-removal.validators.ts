import { normalizePlateKey } from "../portal-shared/index.js";
import { AuthorityPortalBadRequestError } from "./authority-portal.validators.js";

// Ω5P PR-18b — validador do corpo de POST /portal/v1/authority/removals. Erro de FORMATO é genérico (400
// BAD_REQUEST) — independe da sessão/credencial, não é oráculo. Limites apertados (corpo minúsculo). A placa é
// NORMALIZADA (maiúsculas + alfanumérico) → é a MESMA chave anti-spam da partial-unique (tenant, plate) WHERE OPEN,
// então "abc-1234", "ABC1234" e "abc 1234" colidem no mesmo registro aberto. credentialId/authority_name/tenant/
// service_catalog do corpo são IGNORADOS aqui (o serviço usa a SESSÃO + resolução server-side — anti-spoof).

const PLATE_MIN = 5;
const PLATE_MAX = 10; // BR = 7; folga para formatos vizinhos, sem aceitar lixo
const LEGAL_BASIS_MAX = 240;
const LOCATION_MAX = 500;

export type RemovalRequestBody = {
  readonly plate: string; // normalizada
  readonly legalBasis?: string;
  readonly locationNote?: string;
};

function optionalTrimmed(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new AuthorityPortalBadRequestError();
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > max) throw new AuthorityPortalBadRequestError();
  return trimmed;
}

// Local do bem (art.14 do Termo): aceita `location` string, `location{address}` estruturado, `location{lat,lng}`
// ou `freeText`. Colapsa tudo num NOTE curto (§2.8: sem PII exigida do proprietário). Coordenada vira texto (nunca
// número persistido em coluna dedicada neste PR). freeText/objeto malformado além do limite → 400.
function parseLocation(body: Record<string, unknown>): string | undefined {
  const location = body.location;
  const parts: string[] = [];
  if (typeof location === "string") {
    const note = optionalTrimmed(location, LOCATION_MAX);
    if (note) parts.push(note);
  } else if (location && typeof location === "object") {
    const record = location as Record<string, unknown>;
    const address = optionalTrimmed(record.address, LOCATION_MAX);
    if (address) parts.push(address);
    const lat = record.lat ?? record.latitude;
    const lng = record.lng ?? record.longitude;
    if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
      parts.push(`(${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    }
  }
  const free = optionalTrimmed(body.freeText, LOCATION_MAX);
  if (free) parts.push(free);
  const note = parts.join(" ").trim();
  if (note.length === 0) return undefined;
  return note.length > LOCATION_MAX ? note.slice(0, LOCATION_MAX) : note;
}

export function parseRemovalRequest(body: Record<string, unknown>): RemovalRequestBody {
  const rawPlate = body.plate;
  if (typeof rawPlate !== "string") throw new AuthorityPortalBadRequestError();
  const plate = normalizePlateKey(rawPlate);
  if (plate.length < PLATE_MIN || plate.length > PLATE_MAX) throw new AuthorityPortalBadRequestError();
  // legalBasis OU reason (fundamento do art.14); ambos opcionais.
  const legalBasis = optionalTrimmed(body.legalBasis ?? body.reason, LEGAL_BASIS_MAX);
  const locationNote = parseLocation(body);
  return { plate, legalBasis, locationNote };
}
