import type { Request } from "express";

import { AuthorityPortalBadRequestError } from "./authority-portal.validators.js";
import type { AuthorityReleaseApprovalService } from "./authority-release-approval.service.js";
import { parseDecideRequest, parseProcessIdParam } from "./authority-release-approval.validators.js";

export type AuthorityReleaseApprovalServiceResolver = () => Promise<AuthorityReleaseApprovalService>;

export type ControllerResult = {
  readonly status: number;
  readonly body: unknown;
};

// Ω5P PR-19 — controller do BFF: GET fila pendente + POST decidir. Espelha o formato de resposta/erro do
// authority-portal.controller.ts (401/429/400/404 uniformes, §2.8).

function clientIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}

function userAgent(request: Request): string | undefined {
  const value = request.headers["user-agent"];
  return typeof value === "string" ? value : undefined;
}

function authorization(request: Request): string | undefined {
  const value = request.headers["authorization"];
  return typeof value === "string" ? value : undefined;
}

const SESSION_INVALID_BODY = {
  error: { code: "SESSION_INVALID", message: "Sua sessão expirou por segurança. Entre novamente." },
};
const RATE_LIMITED_BODY = {
  error: { code: "RATE_LIMITED", message: "Muitas tentativas. Tente novamente mais tarde." },
};
// 404 UNIFORME (D-08 anti-enumeração): "processo não vinculado à sua credencial" ≡ "processo inexistente" ≡ "sem
// liberação em curso" — nenhuma razão vaza.
const NOT_FOUND_BODY = {
  error: { code: "NOT_FOUND", message: "Processo não encontrado ou sem liberação pendente para esta credencial." },
};
const CONFLICT_BODY = {
  error: { code: "RELEASE_CONFLICT", message: "Esta liberação já foi decidida." },
};

export class AuthorityReleaseApprovalController {
  constructor(private readonly resolveService: AuthorityReleaseApprovalServiceResolver) {}

  async list(request: Request): Promise<ControllerResult> {
    const service = await this.resolveService();
    const result = await service.listApprovals({ authorization: authorization(request), ip: clientIp(request), userAgent: userAgent(request) });
    switch (result.kind) {
      case "ok":
        // Resposta MINIMIZADA (§2.8): releaseId NUNCA vaza (id interno de custódia) — só o que a autoridade precisa.
        return {
          status: 200,
          body: {
            data: result.items.map((item) => ({
              processId: item.processId,
              kind: item.kind,
              vehiclePlate: item.vehiclePlate,
              requestedAt: item.requestedAt.toISOString(),
              pendingRequirements: item.pendingRequirements,
            })),
          },
        };
      case "session_invalid":
        return { status: 401, body: SESSION_INVALID_BODY };
      case "rate_limited":
        return { status: 429, body: RATE_LIMITED_BODY };
    }
  }

  async decide(request: Request): Promise<ControllerResult> {
    let processId: string;
    let body;
    try {
      processId = parseProcessIdParam(request.params.processId);
      body = parseDecideRequest((request.body ?? {}) as Record<string, unknown>);
    } catch (error) {
      if (error instanceof AuthorityPortalBadRequestError) {
        return { status: 400, body: { error: { code: "BAD_REQUEST", message: "Requisição inválida." } } };
      }
      throw error;
    }

    const service = await this.resolveService();
    const result = await service.decide({ authorization: authorization(request), processId, body, ip: clientIp(request), userAgent: userAgent(request) });
    switch (result.kind) {
      case "approved":
        return { status: 200, body: { data: { decision: "APPROVED" } } };
      case "rejected":
        return { status: 200, body: { data: { decision: "REJECTED" } } };
      case "not_found":
        return { status: 404, body: NOT_FOUND_BODY };
      case "conflict":
        return { status: 409, body: CONFLICT_BODY };
      case "session_invalid":
        return { status: 401, body: SESSION_INVALID_BODY };
      case "rate_limited":
        return { status: 429, body: RATE_LIMITED_BODY };
    }
  }
}
