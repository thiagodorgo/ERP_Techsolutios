import { EnterpriseAuditLogService } from "../../core-saas/audit/audit-log.service.js";
import type { AuditLogWriter } from "../../core-saas/audit/audit-log.service.js";
import type { EnterpriseAuditLogInput } from "../../core-saas/audit/audit-log.types.js";
import { normalizeCredentialEmail } from "../repositories/local-auth-credential.repository.js";
import {
  type LocalAuthLoginInput,
  type LocalAuthLoginResult,
  type LocalAuthLoginRole,
  type LocalAuthLoginUser,
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

// Resultado da verificação anônima de um candidato (interno; `credential_id` alimenta só a
// finalização — nunca sai da borda do serviço).
export type AnonymousCandidateResult =
  | {
      readonly ok: true;
      readonly credential_id: string;
      readonly user: LocalAuthLoginUser;
      readonly tenant: { readonly id: string; readonly name: string };
      readonly roles: readonly LocalAuthLoginRole[];
    }
  | {
      readonly ok: false;
      readonly reason: "invalid_credentials" | "locked" | "inactive";
    };
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

  // B-O6R-01 (§6.2/§6.4 do plano) — verificação de UM candidato do caminho anônimo. O scrypt é
  // executado pela função INJETADA (espião do contador nos testes — §6.4.4).
  //
  // B-O6R-07a (§3.4 do plano) — o B01 deixou esta via SEM efeito colateral ("falha anônima não
  // incrementa contador de candidato nem audita"), e a medição do secops mostrou o preço:
  // 12 tentativas em banco real com o contador PARADO em 0 e zero rastro — força bruta ilimitada
  // por um caminho que sequer exige conhecer a organização (`P-O6R-B01-ANONIMO-SEM-LOCKOUT`).
  // A falha de SENHA passa a chamar o MESMO `incrementFailedAttempts` atômico do B01 (reuso
  // obrigatório: nenhum contador novo, nenhum read-modify-write novo) e a deixar UMA linha de
  // auditoria na organização do candidato — rastro INTERNO, jamais na resposta.
  //
  // O que NÃO muda, e é o que o B01 comprou: candidato em lock → reason "locked", que o caminho
  // anônimo achata em 401 uniforme; o 423 NUNCA existe aqui; a resposta não enumera organizações.
  //
  // TRADE-OFF DECLARADO À JUNTA (§3.4, decisão dela, não minha): armar lockout por via anônima
  // cria vetor de negação de acesso à conta a custo baixo — quem souber o e-mail tranca a conta
  // por 15 min. Mitigações medidas: TTL de 15 min (não é banimento), balde por e-mail do B01
  // (10/15 min) somado ao balde por IP do §3.5, e o rastro auditável que antes não existia. A
  // alternativa — não armar — mantém força bruta ilimitada e sem rastro, que é exatamente o
  // achado Ω6R-SEC-003.
  //
  // RESIDUAL DECLARADO: esta linha de auditoria NÃO carrega ipAddress/userAgent. Encaminhá-los
  // exigiria alterar `auth-runtime.ts` (o adaptador que envolve cada candidato em withTenantRls),
  // que está FORA do §5 PERMITIDO deste bloco. Fica registrado em `pendencias.md`
  // (`P-O6R-B07A-RASTRO-ANONIMO-SEM-IP`); o rastro do sucesso anônimo já carrega o contexto.
  async verifyAnonymousCandidate(
    input: Pick<LocalAuthLoginInput, "tenant_id" | "email" | "password">,
    verifyPasswordFn: typeof verifyPassword = verifyPassword,
  ): Promise<AnonymousCandidateResult> {
    const tenantId = input.tenant_id.trim();
    const email = normalizeCredentialEmail(input.email);
    const tenant = await this.tenants.findById(tenantId);

    if (!tenant) {
      return { ok: false, reason: "invalid_credentials" };
    }

    const credential = await this.credentials.findByEmailForTenant(email, tenantId);

    if (!credential) {
      return { ok: false, reason: "invalid_credentials" };
    }

    if (credential.locked_until && credential.locked_until > new Date()) {
      return { ok: false, reason: "locked" };
    }

    const passwordMatches = await verifyPasswordFn(input.password, credential.password_hash);

    if (!passwordMatches) {
      // B-O6R-07a (§3.4) — MESMO UPDATE atômico do B01 (threshold → locked_until num único
      // statement). Sem contador novo, sem read-modify-write.
      await this.credentials.incrementFailedAttempts(credential.id, tenantId);
      await this.recordLoginFailure(tenantId, email, "invalid_credentials", {}, "without_org");

      return { ok: false, reason: "invalid_credentials" };
    }

    const user = await this.users.findByIdForTenant(credential.user_id, tenantId);

    if (!user || user.status !== "active") {
      return { ok: false, reason: "inactive" };
    }

    const roles = await this.userRoles.listByUserForTenant(user.id, tenantId);

    return {
      ok: true,
      credential_id: credential.id,
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

  // B-O6R-01 — finalização do sucesso anônimo ÚNICO: zera contadores e audita NA ORGANIZAÇÃO
  // QUE AUTENTICOU (§6.4.3). Sem scrypt aqui — a verificação já aconteceu.
  async finalizeAnonymousLogin(
    tenantId: string,
    credentialId: string,
    user: { readonly id: string; readonly email: string },
    roleCount: number,
    auditContext: LocalAuthAuditContext,
  ): Promise<void> {
    await this.credentials.markSuccessfulLogin(credentialId, tenantId);
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
        email: normalizeCredentialEmail(user.email),
        roleCount,
        loginMode: "without_org",
      },
    });
  }

  // `loginMode` distingue o rastro do caminho SEM organização (B-O6R-07a §3.4) do rastro do
  // login direcionado — espelho do que `finalizeAnonymousLogin` já faz no sucesso. A allowlist do
  // metadado não muda: e-mail normalizado e motivo, nada de senha, hash ou identificador externo.
  private async recordLoginFailure(
    tenantId: string,
    email: string,
    reason: "invalid_credentials" | "locked" | "inactive",
    auditContext: LocalAuthAuditContext,
    loginMode?: "without_org",
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
        ...(loginMode ? { loginMode } : {}),
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
