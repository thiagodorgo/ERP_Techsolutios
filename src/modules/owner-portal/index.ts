// Ω5P PR-16 — owner-portal (BFF público ISOLADO). Superfície do PROPRIETÁRIO (posse: placa+Renavam). Sem RBAC do
// ERP, sem attachAuthenticatedActor, sessão própria (jose). ABRE a Fase 5.
export { createOwnerPortalRouter } from "./owner-portal.routes.js";
export { OwnerPortalController, type OwnerPortalServiceResolver } from "./owner-portal.controller.js";
export {
  OwnerPortalService,
  type OwnerPortalDeps,
  type OwnerLookupResult,
  type OwnerDossierResult,
  type OwnerReleaseRequestResult,
  type OwnerPortalImpoundPort,
  type OwnerPortalChargePort,
  type OwnerPortalYardPort,
  type OwnerPortalJurisdictionPort,
} from "./owner-portal.service.js";
export { createDefaultOwnerPortalService, resetOwnerPortalRuntimeForTests } from "./owner-portal.runtime.js";
export {
  toOwnerPortalProcessDto,
  toOwnerDossierDto,
  buildOwnerDossierDeadlines,
  formatMoneyLabel,
  type OwnerPortalProcessDto,
  type OwnerDossierDto,
} from "./owner-portal.dto.js";
export {
  parseLookupRequest,
  parseReleaseRequestNote,
  OwnerPortalBadRequestError,
  type LookupRequest,
} from "./owner-portal.validators.js";
export { readBearerToken, resolveOwnerSession } from "./owner-portal.session.js";
export {
  InMemoryPortalReleaseRequestRepository,
  PrismaPortalReleaseRequestRepository,
  createPrismaPortalReleaseRequestRepository,
} from "./portal-release-request.repository.js";
export {
  type PortalReleaseRequestRepository,
  type PortalReleaseRequestStatus,
  PORTAL_RELEASE_REQUEST_STATUSES,
} from "./portal-release-request.types.js";
