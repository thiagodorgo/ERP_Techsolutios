import type { Request } from "express";

import { OwnerPortalBadRequestError, parseLookupRequest, parseReleaseRequestNote } from "./owner-portal.validators.js";
import type { OwnerPortalService } from "./owner-portal.service.js";

export type OwnerPortalServiceResolver = () => Promise<OwnerPortalService>;

export type ControllerResult = {
  readonly status: number;
  readonly body: unknown;
  // Ω5P PR-17b — presente SÓ na resposta binária de foto (image/jpeg); ausente → o router serializa `body` como
  // JSON (default de todas as demais rotas). Nunca ambos.
  readonly contentType?: string;
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

// Ω5P PR-17 — o transporte da sessão é SÓ o header Authorization (Bearer <jwe>). NUNCA lemos processId do corpo/
// query: a sessão é a única autorização; o serviço a verifica e extrai o processId da JWE.
function authorization(request: Request): string | undefined {
  const value = request.headers["authorization"];
  return typeof value === "string" ? value : undefined;
}

// 401 uniforme p/ sessão ausente/expirada/forjada/audience-errada (sem oráculo — nenhuma razão vaza).
const SESSION_INVALID_BODY = {
  error: { code: "SESSION_INVALID", message: "Sua consulta expirou por segurança. Refaça a consulta." },
};
const RATE_LIMITED_BODY = {
  error: { code: "RATE_LIMITED", message: "Muitas tentativas. Tente novamente mais tarde." },
};
// Ω5P PR-17b — 404 uniforme (não distingue "não existe" de "opaqueRef não bate" — anti-oráculo).
const PHOTO_NOT_FOUND_BODY = {
  error: { code: "PHOTO_NOT_FOUND", message: "Não foi possível carregar a imagem." },
};
const PHOTO_SATURATED_BODY = {
  error: { code: "PHOTO_PROCESSING_SATURATED", message: "Muitas solicitações de imagem em processamento. Tente novamente em instantes." },
};

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

  // GET /portal/v1/owner/dossier — exige sessão JWE (Authorization: Bearer). O processId vem SEMPRE da sessão.
  async dossier(request: Request): Promise<ControllerResult> {
    const service = await this.resolveService();
    const result = await service.dossier({
      authorization: authorization(request),
      ip: clientIp(request),
      userAgent: userAgent(request),
    });
    switch (result.kind) {
      case "ok":
        return { status: 200, body: { data: result.dossier } };
      case "session_invalid":
        return { status: 401, body: SESSION_INVALID_BODY };
      case "rate_limited":
        return { status: 429, body: RATE_LIMITED_BODY };
      case "not_found":
        // Genérico: cross-tenant / processo removido → NÃO devolve o processo (não revela nada).
        return { status: 404, body: { error: { code: "DOSSIER_NOT_FOUND", message: "Não foi possível carregar os dados." } } };
    }
  }

  // GET /portal/v1/owner/photos/:opaqueRef — exige sessão JWE. O opaqueRef vem SÓ do path (nunca attachmentId).
  async photo(request: Request): Promise<ControllerResult> {
    const service = await this.resolveService();
    const opaqueRefRaw = request.params.opaqueRef;
    if (typeof opaqueRefRaw !== "string" || opaqueRefRaw.length === 0 || opaqueRefRaw.length > 256) {
      // Formato claramente inválido — NÃO vale a pena nem tentar (mesmo desfecho 404 uniforme; sem oráculo).
      return { status: 404, body: PHOTO_NOT_FOUND_BODY };
    }
    const result = await service.photo({
      authorization: authorization(request),
      opaqueRef: opaqueRefRaw,
      ip: clientIp(request),
      userAgent: userAgent(request),
    });
    switch (result.kind) {
      case "ok":
        return { status: 200, body: result.buffer, contentType: result.contentType };
      case "session_invalid":
        return { status: 401, body: SESSION_INVALID_BODY };
      case "rate_limited":
        return { status: 429, body: RATE_LIMITED_BODY };
      case "not_found":
        return { status: 404, body: PHOTO_NOT_FOUND_BODY };
      case "saturated":
        return { status: 503, body: PHOTO_SATURATED_BODY };
    }
  }

  // POST /portal/v1/owner/release-request — exige sessão JWE. `processId` do corpo é IGNORADO (só a sessão autoriza).
  async releaseRequest(request: Request): Promise<ControllerResult> {
    let note: string | undefined;
    try {
      note = parseReleaseRequestNote((request.body as Record<string, unknown> | undefined)?.note);
    } catch (error) {
      if (error instanceof OwnerPortalBadRequestError) {
        return { status: 400, body: { error: { code: "BAD_REQUEST", message: "Requisição inválida." } } };
      }
      throw error;
    }
    const service = await this.resolveService();
    const result = await service.releaseRequest({
      authorization: authorization(request),
      note,
      ip: clientIp(request),
      userAgent: userAgent(request),
    });
    switch (result.kind) {
      case "ok":
        // Resposta SEMPRE genérica (idempotente/anti-oráculo): não confirma/nega existência nem criação.
        return { status: 200, body: { data: { received: true } } };
      case "session_invalid":
        return { status: 401, body: SESSION_INVALID_BODY };
      case "rate_limited":
        return { status: 429, body: RATE_LIMITED_BODY };
    }
  }
}
