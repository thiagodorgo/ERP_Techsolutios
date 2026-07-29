import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toAuthorityCredentialDto, toAuthorityCredentialListDto } from "./authority-credential.dto.js";
import type { AuthorityCredentialService } from "./authority-credential.service.js";
import type { AuthorityActorContext } from "./authority-credential.types.js";

export type AuthorityCredentialServiceResolver = () => Promise<AuthorityCredentialService>;

// Ω5P PR-18a — controller do PROVISIONAMENTO (console /api/v1). Toda ESCRITA é auditada pela auditoria global do
// ERP (Ω4C) com allowlist §2.8: NUNCA a senha/hash, NUNCA contadores; só `{status}` + o id do recurso. A senha
// gerada volta UMA vez no corpo da resposta (nunca na auditoria/log).
export class AuthorityCredentialController {
  constructor(private readonly resolveService: AuthorityCredentialServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolve(request);
    const credentials = await service.list(actor);
    return { body: toAuthorityCredentialListDto(credentials) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolve(request);
    const { credential, generatedPassword } = await service.create(actor, (request.body ?? {}) as Record<string, unknown>);
    await recordRequestAuditBestEffort(request, {
      action: "authority_credential.created",
      resourceType: "authority_credential",
      resourceId: credential.id,
      outcome: "success",
      severity: "info",
      metadata: { status: credential.status, passwordGenerated: generatedPassword !== undefined },
    });
    return { status: 201, body: { data: { ...toAuthorityCredentialDto(credential), generatedPassword: generatedPassword ?? null } } };
  }

  async rotatePassword(request: Request) {
    const [service, actor] = await this.resolve(request);
    const id = readRouteParam(request.params.credentialId);
    const { credential, generatedPassword } = await service.rotatePassword(actor, id, (request.body ?? {}) as Record<string, unknown>);
    await recordRequestAuditBestEffort(request, {
      action: "authority_credential.password_rotated",
      resourceType: "authority_credential",
      resourceId: credential.id,
      outcome: "success",
      severity: "info",
      metadata: { status: credential.status, passwordGenerated: generatedPassword !== undefined },
    });
    return { body: { data: { ...toAuthorityCredentialDto(credential), generatedPassword: generatedPassword ?? null } } };
  }

  async suspend(request: Request) {
    const [service, actor] = await this.resolve(request);
    const credential = await service.suspend(actor, readRouteParam(request.params.credentialId));
    await recordRequestAuditBestEffort(request, {
      action: "authority_credential.suspended",
      resourceType: "authority_credential",
      resourceId: credential.id,
      outcome: "success",
      severity: "warning",
      metadata: { status: credential.status },
    });
    return { body: { data: toAuthorityCredentialDto(credential) } };
  }

  async revoke(request: Request) {
    const [service, actor] = await this.resolve(request);
    const credential = await service.revoke(actor, readRouteParam(request.params.credentialId));
    await recordRequestAuditBestEffort(request, {
      action: "authority_credential.revoked",
      resourceType: "authority_credential",
      resourceId: credential.id,
      outcome: "success",
      severity: "warning",
      metadata: { status: credential.status },
    });
    return { body: { data: toAuthorityCredentialDto(credential) } };
  }

  private async resolve(request: Request): Promise<readonly [AuthorityCredentialService, AuthorityActorContext]> {
    const context = requireTenantContext(request);
    return [await this.resolveService(), { tenantId: context.tenantId, userId: context.userId }] as const;
  }
}
