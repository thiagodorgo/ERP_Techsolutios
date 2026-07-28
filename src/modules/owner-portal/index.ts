// Ω5P PR-16 — owner-portal (BFF público ISOLADO). Superfície do PROPRIETÁRIO (posse: placa+Renavam). Sem RBAC do
// ERP, sem attachAuthenticatedActor, sessão própria (jose). ABRE a Fase 5.
export { createOwnerPortalRouter } from "./owner-portal.routes.js";
export { OwnerPortalController, type OwnerPortalServiceResolver } from "./owner-portal.controller.js";
export {
  OwnerPortalService,
  type OwnerPortalDeps,
  type OwnerLookupResult,
  type OwnerPortalImpoundPort,
  type OwnerPortalChargePort,
  type OwnerPortalYardPort,
} from "./owner-portal.service.js";
export { createDefaultOwnerPortalService, resetOwnerPortalRuntimeForTests } from "./owner-portal.runtime.js";
export { toOwnerPortalProcessDto, formatMoneyLabel, type OwnerPortalProcessDto } from "./owner-portal.dto.js";
export { parseLookupRequest, OwnerPortalBadRequestError, type LookupRequest } from "./owner-portal.validators.js";
