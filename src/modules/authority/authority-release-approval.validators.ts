import { AuthorityPortalBadRequestError } from "./authority-portal.validators.js";
import { RELEASE_DECISION_KINDS, type ReleaseDecisionRequestKind } from "./authority-release-approval.types.js";

// Ω5P PR-19 — validador de POST /portal/v1/authority/approvals/:processId/decide. Erro de FORMATO é genérico (400
// BAD_REQUEST) — independe da sessão/vínculo, não é oráculo (mesmo espírito de authority-removal.validators.ts).

const REFERENCE_MAX = 120;
const NOTE_MAX = 500;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DecideRequestBody = {
  readonly decision: ReleaseDecisionRequestKind;
  readonly reference?: string;
  readonly note?: string;
};

function optionalTrimmed(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new AuthorityPortalBadRequestError();
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > max) throw new AuthorityPortalBadRequestError();
  return trimmed;
}

// Formato do :processId (rota) — malformado é erro de FORMATO (não confunde com "não encontrado"/"não vinculado";
// aquele é sempre 404 uniforme resolvido pelo serviço, D-08 anti-enumeração).
export function parseProcessIdParam(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || !uuidPattern.test(normalized)) throw new AuthorityPortalBadRequestError();
  return normalized;
}

export function parseDecideRequest(body: Record<string, unknown>): DecideRequestBody {
  const rawDecision = body.decision;
  if (typeof rawDecision !== "string" || !(RELEASE_DECISION_KINDS as readonly string[]).includes(rawDecision.toUpperCase())) {
    throw new AuthorityPortalBadRequestError();
  }
  const decision = rawDecision.toUpperCase() as ReleaseDecisionRequestKind;
  const reference = optionalTrimmed(body.reference, REFERENCE_MAX);
  const note = optionalTrimmed(body.note, NOTE_MAX);
  // REJECT exige nota (motivo da negativa) — sem ela a rejeição vira uma negação indefinida (D-Ω5P-AUTH-10).
  if (decision === "REJECT" && !note) throw new AuthorityPortalBadRequestError();
  return { decision, reference, note };
}
