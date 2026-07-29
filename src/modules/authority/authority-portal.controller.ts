import type { Request } from "express";

import type { AuthorityPortalService } from "./authority-portal.service.js";
import { AuthorityPortalBadRequestError, parseLoginRequest } from "./authority-portal.validators.js";
import type { AuthorityRemovalService } from "./authority-removal.service.js";
import { parseRemovalRequest } from "./authority-removal.validators.js";

export type AuthorityPortalServiceResolver = () => Promise<AuthorityPortalService>;
export type AuthorityRemovalServiceResolver = () => Promise<AuthorityRemovalService>;

export type ControllerResult = {
  readonly status: number;
  readonly body: unknown;
};

// trust proxy fica DESLIGADO no portal-app (default do Express) → req.ip = socket, NÃO um X-Forwarded-For spoofável.
function clientIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}

function userAgent(request: Request): string | undefined {
  const value = request.headers["user-agent"];
  return typeof value === "string" ? value : undefined;
}

// 401 UNIFORME para não-encontrado ≡ senha-errada ≡ status≠ACTIVE ≡ bloqueado — nenhuma razão vaza (§2.8/anti-oráculo).
const AUTH_FAILED_BODY = {
  error: { code: "AUTHENTICATION_FAILED", message: "Usuário ou senha inválidos." },
};
const RATE_LIMITED_BODY = {
  error: { code: "RATE_LIMITED", message: "Muitas tentativas. Tente novamente mais tarde." },
};
const CHALLENGE_FAILED_BODY = {
  error: { code: "CHALLENGE_FAILED", message: "Verificação de segurança inválida. Recarregue e tente novamente." },
};
// 401 UNIFORME para sessão ausente/expirada/forjada/audience-errada ≡ credencial não-ACTIVE (sem oráculo de revogação).
const SESSION_INVALID_BODY = {
  error: { code: "SESSION_INVALID", message: "Sua sessão expirou por segurança. Entre novamente." },
};

// Transporte da sessão = SÓ o header Authorization (Bearer <jwe>). NUNCA lemos credentialId do corpo/query (anti-spoof
// do órgão): a sessão é a única autorização; o serviço a verifica e extrai o credentialId da JWE.
function authorization(request: Request): string | undefined {
  const value = request.headers["authorization"];
  return typeof value === "string" ? value : undefined;
}

export class AuthorityPortalController {
  constructor(
    private readonly resolveService: AuthorityPortalServiceResolver,
    private readonly resolveRemovalService: AuthorityRemovalServiceResolver,
  ) {}

  async challenge(request: Request): Promise<ControllerResult> {
    const service = await this.resolveService();
    const result = await service.challenge({ ip: clientIp(request), userAgent: userAgent(request) });
    if (result.kind === "rate_limited") {
      return { status: 429, body: RATE_LIMITED_BODY };
    }
    return { status: 200, body: { data: result.challenge } };
  }

  async login(request: Request): Promise<ControllerResult> {
    const service = await this.resolveService();
    let parsed;
    try {
      parsed = parseLoginRequest((request.body ?? {}) as Record<string, unknown>);
    } catch (error) {
      if (error instanceof AuthorityPortalBadRequestError) {
        // Erro de FORMATO — genérico (independe da existência do username → não é oráculo).
        return { status: 400, body: { error: { code: "BAD_REQUEST", message: "Requisição inválida." } } };
      }
      throw error;
    }

    const result = await service.login({ ...parsed, ip: clientIp(request), userAgent: userAgent(request) });
    switch (result.kind) {
      case "authenticated":
        // §2.8: SÓ { session, authorityName } — nunca credentialId/tenant_id/hash/contador.
        return { status: 200, body: { data: result.response } };
      case "invalid":
        return { status: 401, body: AUTH_FAILED_BODY };
      case "rate_limited":
        return { status: 429, body: RATE_LIMITED_BODY };
      case "challenge_failed":
        return { status: 400, body: CHALLENGE_FAILED_BODY };
    }
  }

  // POST /portal/v1/authority/removals — exige sessão JWE (Authorization: Bearer). O credentialId vem SEMPRE da
  // sessão; credentialId/authority_name/tenant/service_catalog do CORPO são IGNORADOS (anti-spoof). O corpo só traz
  // placa (obrig)/local/fundamento. Resposta genérica 200 {received:true} p/ {originada, enfileirada, duplicada}.
  async requestRemoval(request: Request): Promise<ControllerResult> {
    let body;
    try {
      body = parseRemovalRequest((request.body ?? {}) as Record<string, unknown>);
    } catch (error) {
      if (error instanceof AuthorityPortalBadRequestError) {
        // Erro de FORMATO — genérico (independe da sessão/credencial → não é oráculo).
        return { status: 400, body: { error: { code: "BAD_REQUEST", message: "Requisição inválida." } } };
      }
      throw error;
    }

    const service = await this.resolveRemovalService();
    const result = await service.requestRemoval({
      authorization: authorization(request),
      body,
      ip: clientIp(request),
      userAgent: userAgent(request),
    });
    switch (result.kind) {
      case "ok":
        // SEMPRE genérica (anti-oráculo/§2.8): não confirma/nega origem, fila ou duplicata; sem WorkOrder/process id.
        return { status: 200, body: { data: { received: true } } };
      case "session_invalid":
        return { status: 401, body: SESSION_INVALID_BODY };
      case "rate_limited":
        return { status: 429, body: RATE_LIMITED_BODY };
    }
  }
}
