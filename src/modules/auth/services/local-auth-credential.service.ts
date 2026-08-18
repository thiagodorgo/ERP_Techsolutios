import type { Prisma } from "@prisma/client";

import {
  LocalAuthCredentialRepository,
  normalizeCredentialEmail,
  type CreateLocalAuthCredentialData,
} from "../repositories/local-auth-credential.repository.js";
import {
  AuthCredentialError,
  type AuthenticatedActor,
  type CreateLocalCredentialInput,
  type LocalCredentialPublic,
  type VerifyLocalCredentialInput,
  type VerifyLocalCredentialResult,
} from "../types/auth.types.js";
import type { PasswordChangeHookResult } from "./identity-link.service.js";
import { hashPassword, verifyPassword } from "./password.service.js";

type LocalAuthCredentialRecord = LocalCredentialPublic & {
  readonly password_hash: string;
  readonly password_algorithm: string;
};

type LocalAuthCredentialRepositoryLike = {
  create(data: CreateLocalAuthCredentialData): Promise<LocalAuthCredentialRecord>;
  upsertForUser(data: CreateLocalAuthCredentialData): Promise<LocalAuthCredentialRecord>;
  findByEmailForTenant(
    email: string,
    tenantId: string,
  ): Promise<LocalAuthCredentialRecord | null>;
  findByUserForTenant(
    userId: string,
    tenantId: string,
  ): Promise<LocalAuthCredentialRecord | null>;
  updatePassword(
    userId: string,
    tenantId: string,
    data: Pick<CreateLocalAuthCredentialData, "password_hash" | "password_algorithm">,
  ): Promise<LocalAuthCredentialRecord>;
  incrementFailedAttempts(id: string, tenantId: string): Promise<unknown>;
  resetFailedAttempts(id: string, tenantId: string): Promise<unknown>;
  markSuccessfulLogin(id: string, tenantId: string): Promise<unknown>;
};

type TenantUserRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly email: string;
};

type TenantUserLookup = {
  findByIdForTenant(userId: string, tenantId: string): Promise<TenantUserRecord | null>;
};

export class LocalAuthCredentialService {
  constructor(
    private readonly credentials: LocalAuthCredentialRepositoryLike,
    private readonly users: TenantUserLookup,
  ) {}

  async createCredentialForUser(
    input: CreateLocalCredentialInput,
  ): Promise<LocalCredentialPublic> {
    const data = await this.buildCredentialData(input);
    const credential = await this.credentials.create(data);

    return stripPasswordHash(credential);
  }

  async upsertCredentialForUser(
    input: CreateLocalCredentialInput,
  ): Promise<LocalCredentialPublic> {
    const data = await this.buildCredentialData(input);
    const credential = await this.credentials.upsertForUser(data);

    return stripPasswordHash(credential);
  }

  async verifyCredential(
    input: VerifyLocalCredentialInput,
  ): Promise<VerifyLocalCredentialResult> {
    const tenantId = input.tenant_id.trim();
    const email = normalizeCredentialEmail(input.email);

    if (!tenantId || !email || !input.password) {
      return {
        ok: false,
        reason: "invalid_credentials",
      };
    }

    const credential = await this.credentials.findByEmailForTenant(email, tenantId);

    if (!credential) {
      return {
        ok: false,
        reason: "not_found",
      };
    }

    if (credential.locked_until && credential.locked_until > new Date()) {
      return {
        ok: false,
        reason: "locked",
      };
    }

    const passwordMatches = await verifyPassword(input.password, credential.password_hash);

    if (!passwordMatches) {
      await this.credentials.incrementFailedAttempts(credential.id, tenantId);

      return {
        ok: false,
        reason: "invalid_credentials",
      };
    }

    await this.credentials.markSuccessfulLogin(credential.id, tenantId);

    return {
      ok: true,
      tenant_id: credential.tenant_id,
      user_id: credential.user_id,
    };
  }

  // B-O6R-01 (§5.5 do plano) — o GANCHO da troca de senha, ARMADO E INERTE: não existe rota de
  // troca/reset neste bloco (pendência P-O6R-B01-TROCA-SENHA; o RESET, sem ator autenticado,
  // REABRE o contrato do setter em junta — não pode chamar setIdentityRlsContext). O que este
  // método FAZ: valida a senha nova, e delega ao serviço de identidade UMA transação que aplica
  // o UPDATE da senha, desvincula o par se o vínculo chegou por 'religacao' (lido de
  // auth_identity_links.attached_via — nunca da trilha) e a identidade tem 2+ vínculos, e revoga
  // TODAS as sessões do par em qualquer troca (§5.5 a+b). O ator vem de JWT real
  // (getAuthenticatedActor) — o teste o obtém por login, jamais fabricando o literal.
  async changePasswordWithIdentityHook(
    actor: AuthenticatedActor,
    newPassword: string,
    identityHook: {
      handlePasswordChange(
        hookActor: AuthenticatedActor,
        applyPasswordUpdate?: (tx: Prisma.TransactionClient) => Promise<void>,
      ): Promise<PasswordChangeHookResult>;
    },
  ): Promise<PasswordChangeHookResult> {
    const user = await this.users.findByIdForTenant(actor.userId, actor.tenantId);

    if (!user) {
      throw new AuthCredentialError("User not found for tenant.");
    }

    validateLocalPassword(newPassword, normalizeCredentialEmail(user.email));

    const password = await hashPassword(newPassword);

    return identityHook.handlePasswordChange(actor, async (tx) => {
      await new LocalAuthCredentialRepository(tx).updatePassword(actor.userId, actor.tenantId, {
        password_hash: password.password_hash,
        password_algorithm: password.password_algorithm,
      });
    });
  }

  private async buildCredentialData(
    input: CreateLocalCredentialInput,
  ): Promise<CreateLocalAuthCredentialData> {
    const tenantId = input.tenant_id.trim();
    const userId = input.user_id.trim();
    const email = normalizeCredentialEmail(input.email);

    assertCredentialScope(tenantId, userId, email);
    validateLocalPassword(input.password, email);

    const user = await this.users.findByIdForTenant(userId, tenantId);

    if (!user) {
      throw new AuthCredentialError("User not found for tenant.");
    }

    if (normalizeCredentialEmail(user.email) !== email) {
      throw new AuthCredentialError("Credential email must match the tenant user email.");
    }

    const password = await hashPassword(input.password);

    return {
      tenant_id: tenantId,
      user_id: userId,
      email,
      password_hash: password.password_hash,
      password_algorithm: password.password_algorithm,
    };
  }
}

export function validateLocalPassword(password: string, normalizedEmail: string): void {
  if (!password || password.length < 8) {
    throw new AuthCredentialError("Password must have at least 8 characters.");
  }

  if (password.trim().toLowerCase() === normalizedEmail) {
    throw new AuthCredentialError("Password must not be equal to the email.");
  }
}

function assertCredentialScope(tenantId: string, userId: string, email: string): void {
  if (!tenantId) {
    throw new AuthCredentialError("Tenant id is required.");
  }

  if (!userId) {
    throw new AuthCredentialError("User id is required.");
  }

  if (!email) {
    throw new AuthCredentialError("Email is required.");
  }
}

function stripPasswordHash(credential: LocalAuthCredentialRecord): LocalCredentialPublic {
  const { password_hash: _passwordHash, ...publicCredential } = credential;

  return publicCredential;
}
