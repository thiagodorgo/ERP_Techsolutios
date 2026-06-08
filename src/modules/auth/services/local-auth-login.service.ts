import { EnterpriseAuditLogService } from "../../core-saas/audit/audit-log.service.js";
import type { AuditLogWriter } from "../../core-saas/audit/audit-log.service.js";
import type { EnterpriseAuditLogInput } from "../../core-saas/audit/audit-log.types.js";
import { normalizeCredentialEmail } from "../repositories/local-auth-credential.repository.js";
import {
  type LocalAuthLoginInput,
  type LocalAuthLoginResult,
  type LocalAuthLoginRole,
} from "../types/auth.types.js";
import { verifyPassword } from "./password.service.js";

type LocalAuthCredentialRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly locked_until: Date | null;
};

type LocalAuthCredentialRepositoryLike = {
  findByEmailForTenant(
    email: string,
    tenantId: string,
  ): Promise<LocalAuthCredentialRecord | null>;
  incrementFailedAttempts(id: string, tenantId: string): Promise<unknown>;
  markSuccessfulLogin(id: string, tenantId: string): Promise<unknown>;
};

type TenantRecord = {
  readonly id: string;
  readonly name: string;
};

type UserRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly email: string;
  readonly name: string;
  readonly status: string;
};

type RoleAssignmentRecord = {
  readonly role: {
    readonly id: string;
    readonly key: string;
    readonly name: string;
  };
};

type TenantRepositoryLike = {
  findById(tenantId: string): Promise<TenantRecord | null>;
};

type UserRepositoryLike = {
  findByIdForTenant(userId: string, tenantId: string): Promise<UserRecord | null>;
};

type UserRoleRepositoryLike = {
  listByUserForTenant(
    userId: string,
    tenantId: string,
  ): Promise<readonly RoleAssignmentRecord[]>;
};

type TenantContextRunner = <T>(tenantId: string, work: () => Promise<T>) => Promise<T>;
type LocalAuthAuditContext = Pick<
  EnterpriseAuditLogInput,
  "requestId" | "correlationId" | "ipAddress" | "userAgent"
>;

export class LocalAuthLoginService {
  constructor(
    private readonly credentials: LocalAuthCredentialRepositoryLike,
    private readonly tenants: TenantRepositoryLike,
    private readonly users: UserRepositoryLike,
    private readonly userRoles: UserRoleRepositoryLike,
    private readonly auditLogs: AuditLogWriter,
    private readonly runWithTenantContext: TenantContextRunner = async (_tenantId, work) => work(),
  ) {}

  async authenticateLocalCredential(
    input: LocalAuthLoginInput,
  ): Promise<LocalAuthLoginResult> {
    const tenantId = input.tenant_id.trim();
    const email = normalizeCredentialEmail(input.email);

    return this.runWithTenantContext(tenantId, () =>
      this.authenticateLocalCredentialWithContext(tenantId, email, input.password, {
        requestId: input.request_id,
        correlationId: input.correlation_id,
        ipAddress: input.ip_address,
        userAgent: input.user_agent,
      }),
    );
  }

  private async authenticateLocalCredentialWithContext(
    tenantId: string,
    email: string,
    password: string,
    auditContext: LocalAuthAuditContext,
  ): Promise<LocalAuthLoginResult> {
    const tenant = await this.tenants.findById(tenantId);

    if (!tenant) {
      return {
        ok: false,
        reason: "invalid_credentials",
      };
    }

    const credential = await this.credentials.findByEmailForTenant(email, tenantId);

    if (!credential) {
      await this.recordLoginFailure(tenantId, email, "invalid_credentials", auditContext);

      return {
        ok: false,
        reason: "invalid_credentials",
      };
    }

    if (credential.locked_until && credential.locked_until > new Date()) {
      await this.recordLoginFailure(tenantId, email, "locked", auditContext);

      return {
        ok: false,
        reason: "locked",
      };
    }

    const passwordMatches = await verifyPassword(password, credential.password_hash);

    if (!passwordMatches) {
      await this.credentials.incrementFailedAttempts(credential.id, tenantId);
      await this.recordLoginFailure(tenantId, email, "invalid_credentials", auditContext);

      return {
        ok: false,
        reason: "invalid_credentials",
      };
    }

    const user = await this.users.findByIdForTenant(credential.user_id, tenantId);

    if (!user || user.status !== "active") {
      await this.recordLoginFailure(tenantId, email, "inactive", auditContext);

      return {
        ok: false,
        reason: "inactive",
      };
    }

    const roles = await this.userRoles.listByUserForTenant(user.id, tenantId);

    await this.credentials.markSuccessfulLogin(credential.id, tenantId);
    await new EnterpriseAuditLogService(this.auditLogs).record({
      tenantId,
      actorId: user.id,
      actorType: "user",
      actorEmail: user.email,
      action: "auth.login.success",
      resourceType: "auth_session",
      resourceId: user.id,
      outcome: "success",
      severity: "info",
      ...auditContext,
      metadata: {
        email,
        roleCount: roles.length,
      },
    });

    return {
      ok: true,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      roles: mapLoginRoles(roles),
    };
  }

  private async recordLoginFailure(
    tenantId: string,
    email: string,
    reason: "invalid_credentials" | "locked" | "inactive",
    auditContext: LocalAuthAuditContext,
  ): Promise<void> {
    await new EnterpriseAuditLogService(this.auditLogs).record({
      tenantId,
      actorId: null,
      actorType: "anonymous",
      action: "auth.login.failed",
      resourceType: "auth_session",
      resourceId: null,
      outcome: "failure",
      severity: "warning",
      ...auditContext,
      metadata: {
        email,
        reason,
      },
    });
  }
}

function mapLoginRoles(
  assignments: readonly RoleAssignmentRecord[],
): LocalAuthLoginRole[] {
  const roles = new Map<string, LocalAuthLoginRole>();

  for (const assignment of assignments) {
    roles.set(assignment.role.id, {
      id: assignment.role.id,
      key: assignment.role.key,
      name: assignment.role.name,
    });
  }

  return [...roles.values()];
}
