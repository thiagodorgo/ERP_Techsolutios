// Ω5P PR-16 — validação dos corpos do owner-portal. Erros de FORMATO (400 genérico) NÃO são oráculo de
// enumeração (independem da existência da placa). O 2 fatores placa+Renavam são OBRIGATÓRIOS.

export class OwnerPortalBadRequestError extends Error {
  constructor(readonly reason: string, message: string) {
    super(message);
    this.name = "OwnerPortalBadRequestError";
  }
}

type RawRecord = Record<string, unknown>;

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new OwnerPortalBadRequestError("invalid_field", `${field} é obrigatório.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new OwnerPortalBadRequestError("invalid_field", `${field} é inválido.`);
  }
  return trimmed;
}

export type LookupRequest = {
  readonly plate: string;
  readonly renavam: string;
  readonly challengeId: string;
  readonly solution: string;
};

// Ω5P PR-17 — nota OPCIONAL da solicitação de liberação. Sanitiza (descarta caracteres de controle), colapsa
// espaços em branco em um só espaço e LIMITA a 500 chars. NUNCA exige/aceita dado pessoal — é texto livre curto.
// Ausente/vazia → undefined (a nota é opcional). O corpo NUNCA carrega processId (o backend o ignora — o processId
// vem SEMPRE da sessão JWE). Comprimento excedido → 400 genérico (não é oráculo: independe da existência do processo).
export function parseReleaseRequestNote(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new OwnerPortalBadRequestError("invalid_field", "Nota é inválida.");
  }
  // Descarta caracteres de controle (0x00–0x1F e 0x7F) sem regex de control-char; depois colapsa espaços.
  const stripped = Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
  const sanitized = stripped.replace(/\s+/g, " ").trim();
  if (sanitized.length === 0) return undefined;
  if (sanitized.length > 500) {
    throw new OwnerPortalBadRequestError("invalid_field", "Nota é inválida.");
  }
  return sanitized;
}

export function parseLookupRequest(body: RawRecord): LookupRequest {
  const plate = requireString(body.plate ?? body.vehicle_plate, "placa", 16);
  const renavam = requireString(body.renavam ?? body.vehicle_renavam, "Renavam", 20);
  // CRÍTICO-1 (defesa em profundidade) — o 2º fator precisa conter DÍGITO. Um Renavam sem dígito ("N/A", "-",
  // "SEM RENAVAM") normalizaria para "" e, contra um registro sem Renavam-dígito, degradaria os 2 fatores em 1
  // (placa só). Isto é erro de FORMATO (400 genérico, NÃO-oráculo: independe da existência da placa). O compare
  // do 2º fator permanece em tempo constante para os que passam. (Renavam real tem 9–11 dígitos; aqui exigimos ao
  // menos 1 dígito para não regredir consultas legítimas cujo dado foi cadastrado fora do formato canônico.)
  if (renavam.replace(/\D/g, "").length === 0) {
    throw new OwnerPortalBadRequestError("invalid_field", "Renavam é inválido.");
  }
  return {
    plate,
    renavam,
    challengeId: requireString(body.challengeId ?? body.challenge_id, "challengeId", 64),
    // solução do PoW: inteiro serializado como string; aceitamos número também.
    solution: requireString(
      typeof body.solution === "number" ? String(body.solution) : body.solution,
      "solution",
      64,
    ),
  };
}
