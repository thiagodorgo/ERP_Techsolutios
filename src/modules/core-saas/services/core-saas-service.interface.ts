import type { RoleDefinition } from "../permissions/catalog.js";
import type {
  AuditEvent,
  AuthenticatedActor,
  CreateTenantInput,
  CreateUserInput,
  ListTenantOptions,
  LoginCandidate,
  Tenant,
  TenantMembership,
  UpdateUserInput,
  User,
} from "../types/core-saas.types.js";
// B-O6R-01 — o ator dos fluxos de IDENTIDADE é o do JWT (auth.types.ts), NUNCA o homônimo
// deste módulo (request.tenantContext, forjável por header em dev/test). Import type-only,
// aliasado para não colidir com o AuthenticatedActor local.
import type { AuthenticatedActor as AuthJwtActor } from "../../auth/types/auth.types.js";

export type ICoreSaasService = {
  createTenant(input: CreateTenantInput, actor?: AuthenticatedActor): Promise<Tenant>;
  listTenantsForTenant(tenantId: string, options?: ListTenantOptions): Promise<Tenant[]>;
  getTenantForActor(tenantId: string, actorTenantId: string): Promise<Tenant>;

  createUser(input: CreateUserInput, actor?: AuthenticatedActor): Promise<User>;
  updateUser(input: UpdateUserInput, actor?: AuthenticatedActor): Promise<User>;
  listUsersForTenant(tenantId: string): Promise<User[]>;
  getUserForTenant(userId: string, tenantId: string): Promise<User>;

  listRoles(): Promise<RoleDefinition[]>;
  getRoleDefinition(role: string): Promise<RoleDefinition>;

  // B-O6R-01 (Ω6R-TEN-001) — `listTenantsForUserEmail` foi REMOVIDA: o e-mail nunca decide entre
  // organizações (I1). Os quatro consumidores migraram para os métodos abaixo.

  // Leitura PRÉ-autenticação (login sem organização): candidatos INTERNOS (tenant_id, user_id)
  // para o e-mail normalizado — a CREDENCIAL decide, nunca esta lista. Teto dentro da fonte
  // (MAX_LOGIN_CANDIDATES + 1 linhas no máximo); a lista nunca sai do processo.
  listLoginCandidates(email: string): Promise<LoginCandidate[]>;

  // Pós-autenticação: organizações da IDENTIDADE do ator (vínculos explícitos), com os filtros
  // de usuário ativo + organização ativa. Normaliza preguiçosamente o par do token (§3.4).
  listTenantsForIdentity(actor: AuthJwtActor): Promise<TenantMembership[]>;

  // Troca de organização (active-tenant): membership da organização pedida SOMENTE se a
  // identidade do ator tem vínculo nela. Ausência de vínculo/usuário inativo/organização
  // suspensa → null (a rota converte em 403 — fail-closed, jamais fallback por e-mail).
  findMembershipForIdentity(actor: AuthJwtActor, requestedTenantId: string): Promise<TenantMembership | null>;

  // Normalização preguiçosa do PAR DO TOKEN CORRENTE (exclusivamente — jamais usuário achado
  // por e-mail, jamais o usuário da organização pedida). Devolve o identity_id (dica para o
  // claim do JWT — nunca fonte de GUC/autorização) ou null quando o par não resolve.
  resolveIdentityForUser(actor: { readonly tenantId: string; readonly userId: string }): Promise<string | null>;

  getAuditEventsForTenant(tenantId: string): Promise<AuditEvent[]>;
};
