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
import { isTemporaryPasswordExpired } from "../temporary-password.rules.js";
import type { SharedPasswordPair } from "./password-family.js";
import { verifyPassword } from "./password.service.js";

type LocalAuthCredentialRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly locked_until: Date | null;
  readonly must_change_password: boolean;
  // B-APP-ORG-2S (1.8.3 §2.2) — a hora em que a senha foi gravada: a validade da provisória conta dela.
  readonly password_updated_at: Date;
  // B-O6R-07a ciclo 2 (C2·3) — opcional para não quebrar dublês estruturais existentes; a linha
  // real do Prisma sempre o tem. Alimenta SÓ a escolha do candidato cobrado (menor contador).
  readonly failed_attempts?: number;
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
  readonly status: string;
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
type PairIdentityResolver = (tenantId: string, userId: string) => Promise<string | null>;

// B-APP-ORG-2S (1.8.3 §2.2 e 1.8.3.2 §1; P3 e P2 do dono) — a porta da senha COMPARTILHADA: com uma senha só
// em todos os pátios, cada tentativa errada soma 1 em todos os pares ativos que guardam aquela senha e o
// acerto zera todos (5 tentativas no total, por qualquer porta; o bloqueio de 15 min pega todos os pares
// juntos). `pairsOf` lê os pares (`readLoginPasswordPairs`, nunca do pedido); as duas escritas rodam na MESMA
// transação do login que as pediu, par a par (1.8.3.17 §2.2); `tenantId` é o pátio do login, onde o GUC volta.
// Sem a porta (dublês de teste), o serviço faz o que a `main` fazia: só o próprio par.
export type SharedPasswordPort = {
  pairsOf(tenantId: string, credentialId: string, email: string): Promise<readonly SharedPasswordPair[]>;
  registerFailureAcrossPairs(tenantId: string, pairs: readonly SharedPasswordPair[]): Promise<void>;
  clearAcrossPairs(tenantId: string, pairs: readonly SharedPasswordPair[], ownCredentialId: string): Promise<void>;
};

// Resultado da verificação anônima de um candidato (interno; `credential_id` alimenta só a
// finalização — nunca sai da borda do serviço).
export type AnonymousCandidateResult =
  | {
      readonly ok: true;
      readonly credential_id: string;
      readonly identityId?: string | null;
      readonly user: LocalAuthLoginUser;
      readonly tenant: { readonly id: string; readonly name: string };
      readonly roles: readonly LocalAuthLoginRole[];
      readonly mustChangePassword: boolean;
    }
  | {
      readonly ok: false;
      readonly reason: "invalid_credentials" | "locked" | "inactive";
      // B-O6R-07a ciclo 2 (C2·3) — dados INTERNOS de cobrança, presentes SÓ quando a SENHA falhou
      // (nunca em lock, nunca inexistente, nunca inativo). Alimentam o ato único pós-veredicto em
      // `AnonymousLoginService.attempt`; JAMAIS são serializados na resposta HTTP (o desfecho
      // anônimo continua achatado em `{kind:"invalid"}`).
      readonly charge?: {
        readonly credential_id: string;
        readonly failed_attempts: number;
      };
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
    private readonly resolvePairIdentity: PairIdentityResolver = async () => null,
    private readonly sharedPassword?: SharedPasswordPort,
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
      await this.chargeSharedPassword(credential, tenantId, email);
      await this.recordLoginFailure(tenantId, email, "invalid_credentials", auditContext);

      return {
        ok: false,
        reason: "invalid_credentials",
      };
    }

    if (tenant.status !== "active") {
      await this.recordLoginFailure(tenantId, email, "tenant_suspended", auditContext);
      return { ok: false, reason: "tenant_suspended" };
    }

    if (isTemporaryPasswordExpired(credential)) return this.refuseExpired(tenantId, email, auditContext);

    const user = await this.users.findByIdForTenant(credential.user_id, tenantId);

    if (!user || user.status !== "active") {
      await this.recordLoginFailure(tenantId, email, "inactive", auditContext);

      return {
        ok: false,
        reason: "inactive",
      };
    }

    const roles = await this.userRoles.listByUserForTenant(user.id, tenantId);

    await this.clearSharedPassword(credential, tenantId, email);
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
      mustChangePassword: credential.must_change_password,
    };
  }

  // B-O6R-01 (§6.2/§6.4 do plano) — verificação de UM candidato do caminho anônimo. O scrypt é
  // executado pela função INJETADA (espião do contador nos testes — §6.4.4).
  //
  // B-O6R-07a CICLO 2 (C2·3 do plano) — esta função é SEM efeito colateral, e isso é invariante
  // restaurado: o ciclo 1 plugou a cobrança AQUI DENTRO, e como o laço de `attempt` roda por
  // candidato sem curto-circuito, o uso CORRETO do dono (mesmo e-mail em 2 organizações, senhas
  // distintas) trancava a organização irmã e todo login bem-sucedido fabricava uma linha de falha
  // (achado `C2-A1`, bloqueia). Na falha de SENHA a função devolve os dados internos de cobrança
  // (`charge`) e QUEM cobra é `AnonymousLoginService.attempt`, uma única vez por requisição,
  // DEPOIS do veredicto (só quando nenhum candidato autenticou) — via `registerAnonymousFailure`
  // abaixo, que reusa o MESMO `incrementFailedAttempts` atômico do B01 e o MESMO
  // `recordLoginFailure` append-only. Força bruta anônima segue armando lockout e deixando rastro
  // (Ω6R-SEC-003 continua fechado); o que morre é o multiplicador por candidato.
  //
  // O que NÃO muda, e é o que o B01 comprou: candidato em lock → reason "locked" SEM charge (o
  // lock não é combustível), que o caminho anônimo achata em 401 uniforme; o 423 NUNCA existe
  // aqui; e-mail inexistente não tem o que cobrar; a resposta não enumera organizações.
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
      // C2·3 — nenhuma escrita aqui: só os dados de cobrança para o ato único pós-veredicto.
      return {
        ok: false,
        reason: "invalid_credentials",
        charge: {
          credential_id: credential.id,
          failed_attempts: credential.failed_attempts ?? 0,
        },
      };
    }

    if (tenant.status !== "active") {
      return { ok: false, reason: "inactive" };
    }

    if (isTemporaryPasswordExpired(credential)) return { ok: false, reason: "invalid_credentials" };

    const user = await this.users.findByIdForTenant(credential.user_id, tenantId);

    if (!user || user.status !== "active") {
      return { ok: false, reason: "inactive" };
    }

    const roles = await this.userRoles.listByUserForTenant(user.id, tenantId);

    return {
      ok: true,
      credential_id: credential.id,
      identityId: await this.resolvePairIdentity(tenantId, user.id),
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
      mustChangePassword: credential.must_change_password,
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
    await this.clearSharedPassword({ id: credentialId }, tenantId, user.email);
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

  // B-O6R-07a CICLO 2 (C2·3) — a cobrança da falha anônima como ATO ÚNICO PÓS-VEREDICTO: chamada
  // por `AnonymousLoginService.attempt` no ramo `successes.length === 0`, exatamente UMA vez por
  // requisição falhada, para o candidato escolhido (menor `failed_attempts` entre os que falharam
  // a SENHA). Reusa o MESMO `incrementFailedAttempts` atômico do B01 (UPDATE único
  // threshold → locked_until; nenhum contador novo, nenhum read-modify-write) e o MESMO
  // `recordLoginFailure` append-only — agora COM ipAddress/userAgent (fecha
  // `P-O6R-B07A-RASTRO-ANONIMO-SEM-IP`). Rastro INTERNO, jamais na resposta.
  async registerAnonymousFailure(
    tenantId: string,
    credentialId: string,
    email: string,
    auditContext: LocalAuthAuditContext,
  ): Promise<void> {
    await this.chargeSharedPassword({ id: credentialId }, tenantId, email);
    await this.recordLoginFailure(
      tenantId,
      normalizeCredentialEmail(email),
      "invalid_credentials",
      auditContext,
      "without_org",
    );
  }

  // B-APP-ORG-2S (1.8.3.2 §1) — o primitivo POR PAR das voltas dos espelhos: soma 1 na credencial daquele par,
  // com o MESMO UPDATE atômico do B01 (limite → `locked_until`). Roda sob o GUC do par da volta.
  async registerFailure(credentialId: string, tenantId: string): Promise<void> {
    await this.credentials.incrementFailedAttempts(credentialId, tenantId);
  }

  // B-APP-ORG-2S (1.8.3 §2.2) — a tentativa errada conta para a SENHA, não para o par: soma em todos os pares
  // que a guardam (porta presente) ou só no próprio (sem porta).
  private async chargeSharedPassword(
    credential: Pick<LocalAuthCredentialRecord, "id">,
    tenantId: string,
    email: string,
  ): Promise<void> {
    if (!this.sharedPassword) {
      await this.credentials.incrementFailedAttempts(credential.id, tenantId);
      return;
    }

    const pairs = await this.sharedPassword.pairsOf(tenantId, credential.id, email);

    if (pairs.length === 0) {
      await this.credentials.incrementFailedAttempts(credential.id, tenantId);
      return;
    }

    await this.sharedPassword.registerFailureAcrossPairs(tenantId, pairs);
  }

  // B-APP-ORG-2S (1.8.3 §2.2, 1.8.3.1 §1) — o acerto zera a conta em todos os pares da senha; no próprio par
  // também grava o último acesso.
  private async clearSharedPassword(
    credential: Pick<LocalAuthCredentialRecord, "id">,
    tenantId: string,
    email: string,
  ): Promise<void> {
    if (!this.sharedPassword) {
      await this.credentials.markSuccessfulLogin(credential.id, tenantId);
      return;
    }

    const pairs = await this.sharedPassword.pairsOf(tenantId, credential.id, email);

    if (pairs.length === 0) {
      await this.credentials.markSuccessfulLogin(credential.id, tenantId);
      return;
    }

    await this.sharedPassword.clearAcrossPairs(tenantId, pairs, credential.id);
  }

  // B-APP-ORG-2S (1.8.3 §2.2) — provisória vencida: o MESMO 401 da senha errada, sem contar como tentativa
  // errada; a auditoria interna grava o motivo.
  private async refuseExpired(
    tenantId: string,
    email: string,
    auditContext: LocalAuthAuditContext,
  ): Promise<LocalAuthLoginResult> {
    await this.recordLoginFailure(tenantId, email, "temporary_password_expired", auditContext);

    return {
      ok: false,
      reason: "invalid_credentials",
    };
  }

  // `loginMode` distingue o rastro do caminho SEM organização (B-O6R-07a §3.4) do rastro do
  // login direcionado — espelho do que `finalizeAnonymousLogin` já faz no sucesso. A allowlist do
  // metadado não muda: e-mail normalizado e motivo, nada de senha, hash ou identificador externo.
  private async recordLoginFailure(
    tenantId: string,
    email: string,
    reason: "invalid_credentials" | "locked" | "inactive" | "temporary_password_expired" | "tenant_suspended",
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
