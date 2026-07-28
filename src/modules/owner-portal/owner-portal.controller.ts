import type { Request } from "express";

import { OwnerPortalBadRequestError, parseLookupRequest } from "./owner-portal.validators.js";
import type { OwnerPortalService } from "./owner-portal.service.js";

export type OwnerPortalServiceResolver = () => Promise<OwnerPortalService>;

export type ControllerResult = {
  readonly status: number;
  readonly body: unknown;
};

// IP do cliente. trust proxy fica DESLIGADO no portal-app (default do Express) → req.ip = socket remoto, NÃO um
// X-Forwarded-For spoofável. Em produção, atrás de um proxy CONFIÁVEL, configurar trust proxy com a contagem de
// saltos exata (nunca `true` cego, que deixaria o cliente forjar o IP e furar o rate-limit por IP).
function clientIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}

function userAgent(request: Request): string | undefined {
  const value = request.headers["user-agent"];
  return typeof value === "string" ? value : undefined;
}

export class OwnerPortalController {
  constructor(private readonly resolveService: OwnerPortalServiceResolver) {}

  async challenge(request: Request): Promise<ControllerResult> {
    const service = await this.resolveService();
    const result = await service.challenge({ ip: clientIp(request), userAgent: userAgent(request) });
    if (result.kind === "rate_limited") {
      // HIGH-1: flood de /challenge do mesmo IP → 429 genérico (mesmo código/shape do rate-limit do lookup).
      return {
        status: 429,
        body: { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Tente novamente mais tarde." } },
      };
    }
    return { status: 200, body: { data: result.challenge } };
  }

  async lookup(request: Request): Promise<ControllerResult> {
    const service = await this.resolveService();
    let parsed;
    try {
      parsed = parseLookupRequest((request.body ?? {}) as Record<string, unknown>);
    } catch (error) {
      if (error instanceof OwnerPortalBadRequestError) {
        // Erro de FORMATO — genérico, NÃO é oráculo (independe da existência da placa).
        return { status: 400, body: { error: { code: "BAD_REQUEST", message: "Requisição inválida." } } };
      }
      throw error;
    }

    const result = await service.lookup({ ...parsed, ip: clientIp(request), userAgent: userAgent(request) });
    switch (result.kind) {
      case "found":
        return {
          status: 200,
          body: { data: { found: true, process: result.process, session: result.session } },
        };
      case "not_found":
        // RESPOSTA UNIFORME: não-encontrado × Renavam-errado × não-autorizado → constante IDÊNTICA.
        return { status: 200, body: { data: { found: false, process: null, session: null } } };
      case "rate_limited":
        return {
          status: 429,
          body: { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Tente novamente mais tarde." } },
        };
      case "challenge_failed":
        return {
          status: 400,
          body: {
            error: { code: "CHALLENGE_FAILED", message: "Verificação de segurança inválida. Recarregue e tente novamente." },
          },
        };
    }
  }
}
