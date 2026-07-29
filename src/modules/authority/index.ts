// Ω5P PR-18a — módulo AUTHORITY (2ª superfície pública ISOLADA do módulo Pátios). Duas faces: (1) PROVISIONAMENTO
// no console /api/v1 sob RBAC authority_credentials:manage (credencial PRÓPRIA ≠ User do ERP); (2) BFF do
// authority-portal (login anti-brute-force, sessão JWE própria). Zero dependência nova (scrypt do node:crypto).
export {
  AuthorityCredentialService,
  createDefaultAuthorityCredentialService,
  createMemoryAuthorityCredentialService,
  resetAuthorityCredentialRuntimeForTests,
  type ProvisionResult,
} from "./authority-credential.service.js";
export {
  createAuthorityCredentialRouter,
  AUTHORITY_CREDENTIAL_PERMISSIONS,
} from "./authority-credential.routes.js";
export { AuthorityCredentialController, type AuthorityCredentialServiceResolver } from "./authority-credential.controller.js";
export {
  InMemoryAuthorityCredentialRepository,
  PrismaAuthorityCredentialRepository,
  createPrismaAuthorityCredentialRepository,
  getMemoryAuthorityCredentialRepository,
  type AuthorityCredentialRepository,
  type AuthorityCredentialLoginPort,
  type CreateAuthorityCredentialInput,
} from "./authority-credential.repository.js";
export {
  AUTHORITY_CREDENTIAL_STATUSES,
  AuthorityCredentialError,
  type AuthorityCredential,
  type AuthorityCredentialStatus,
  type AuthorityActorContext,
} from "./authority-credential.types.js";
export {
  hashPassword,
  verifyPassword,
  verifyPasswordDummy,
  generateInitialPassword,
  AUTHORITY_SCRYPT_PARAMS,
  type ScryptParams,
} from "./authority-password.js";
export { toAuthorityCredentialDto, toAuthorityCredentialListDto, type AuthorityCredentialDto } from "./authority-credential.dto.js";
export {
  AuthorityPortalService,
  type AuthorityPortalDeps,
  type AuthorityLoginResult,
  type AuthorityChallengeResult,
} from "./authority-portal.service.js";
export { AuthorityPortalController, type AuthorityPortalServiceResolver } from "./authority-portal.controller.js";
export { createAuthorityPortalRouter } from "./authority-portal.routes.js";
export { createDefaultAuthorityPortalService, resetAuthorityPortalRuntimeForTests } from "./authority-portal.runtime.js";
export { resolveAuthoritySession, readBearerToken } from "./authority-portal.session.js";
export { parseLoginRequest, AuthorityPortalBadRequestError, type LoginRequest } from "./authority-portal.validators.js";
export { toAuthorityLoginResponse, type AuthorityLoginResponse } from "./authority-portal.dto.js";
