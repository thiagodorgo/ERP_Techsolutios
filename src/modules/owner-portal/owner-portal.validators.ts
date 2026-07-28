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
