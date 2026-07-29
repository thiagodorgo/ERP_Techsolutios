import { env } from "../../config/env.js";
import { generateInitialPassword, hashPassword, AUTHORITY_SCRYPT_PARAMS, type ScryptParams } from "./authority-password.js";
import {
  getMemoryAuthorityCredentialRepository,
  type AuthorityCredentialRepository,
} from "./authority-credential.repository.js";
import { AuthorityCredentialError, type AuthorityActorContext, type AuthorityCredential } from "./authority-credential.types.js";
import { parseAuthorityName, parseOptionalPassword, parseUsername } from "./authority-credential.validators.js";

type RawRecord = Record<string, unknown>;

// Resultado de create/rotate: a credencial + a senha em CLARO SÓ quando o serviço a GEROU (admin não definiu). A
// senha gerada é devolvida UMA vez ao admin (nunca persistida em claro; no banco só o hash scrypt).
export type ProvisionResult = {
  readonly credential: AuthorityCredential;
  readonly generatedPassword?: string;
};

// Ω5P PR-18a — serviço de PROVISIONAMENTO da AuthorityCredential (console /api/v1, sob RBAC authority_credentials:
// manage). SoD: quem PROVISIONA a autoridade (tenant_admin/admins) ≠ quem OPERA o pátio (manager/operator não têm a
// permissão) ≠ a própria autoridade que faz login no portal. `scryptParams` injetável (default OWASP) para testes
// rápidos; produção usa OWASP.
export class AuthorityCredentialService {
  constructor(
    private readonly repository: AuthorityCredentialRepository,
    private readonly scryptParams: ScryptParams = AUTHORITY_SCRYPT_PARAMS,
  ) {}

  async create(actor: AuthorityActorContext, body: RawRecord): Promise<ProvisionResult> {
    const authorityName = parseAuthorityName(body.authority_name ?? body.authorityName);
    const username = parseUsername(body.username);
    const provided = parseOptionalPassword(body.password);
    const password = provided ?? generateInitialPassword();
    const passwordHash = await hashPassword(password, this.scryptParams);
    const credential = await this.repository.create({
      tenantId: actor.tenantId,
      authorityName,
      username,
      passwordHash,
      createdBy: actor.userId,
    });
    return { credential, generatedPassword: provided ? undefined : password };
  }

  async list(actor: AuthorityActorContext): Promise<readonly AuthorityCredential[]> {
    return this.repository.list(actor.tenantId);
  }

  async get(actor: AuthorityActorContext, id: string): Promise<AuthorityCredential> {
    const credential = await this.repository.findById(actor.tenantId, id);
    if (!credential) throw this.notFound();
    return credential;
  }

  // Rotaciona a senha (gerada aleatória OU definida pelo admin). Também ZERA o lockout (senha nova = conta
  // destravada) — é o caminho administrativo de desbloqueio.
  async rotatePassword(actor: AuthorityActorContext, id: string, body: RawRecord): Promise<ProvisionResult> {
    const provided = parseOptionalPassword(body.password);
    const password = provided ?? generateInitialPassword();
    const passwordHash = await hashPassword(password, this.scryptParams);
    const credential = await this.repository.rotatePassword(actor.tenantId, id, passwordHash);
    if (!credential) throw this.notFound();
    return { credential, generatedPassword: provided ? undefined : password };
  }

  async suspend(actor: AuthorityActorContext, id: string): Promise<AuthorityCredential> {
    const credential = await this.repository.updateStatus(actor.tenantId, id, "SUSPENDED");
    if (!credential) throw this.notFound();
    return credential;
  }

  async revoke(actor: AuthorityActorContext, id: string): Promise<AuthorityCredential> {
    const credential = await this.repository.updateStatus(actor.tenantId, id, "REVOKED");
    if (!credential) throw this.notFound();
    return credential;
  }

  private notFound(): AuthorityCredentialError {
    return new AuthorityCredentialError(404, "AUTHORITY_CREDENTIAL_NOT_FOUND", "not_found", "Authority credential was not found.");
  }
}

// ── wiring DEFAULT (memory×prisma pelo env-gate) ───────────────────────────────────────────────────────────────
let defaultServicePromise: Promise<AuthorityCredentialService> | undefined;

export function createMemoryAuthorityCredentialService(scryptParams?: ScryptParams): AuthorityCredentialService {
  return new AuthorityCredentialService(getMemoryAuthorityCredentialRepository(), scryptParams);
}

export async function createDefaultAuthorityCredentialService(): Promise<AuthorityCredentialService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryAuthorityCredentialService();
  }
  defaultServicePromise ??= (async () => {
    const { createPrismaAuthorityCredentialRepository } = await import("./authority-credential.repository.js");
    return new AuthorityCredentialService(await createPrismaAuthorityCredentialRepository());
  })();
  return defaultServicePromise;
}

export function resetAuthorityCredentialRuntimeForTests(): void {
  getMemoryAuthorityCredentialRepository().reset();
  defaultServicePromise = undefined;
}
