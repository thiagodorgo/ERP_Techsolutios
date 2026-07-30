// Ω5P PR-16 — owner-portal (BFF público ISOLADO). Superfície do PROPRIETÁRIO (posse: placa+Renavam). Sem RBAC do
// ERP, sem attachAuthenticatedActor, sessão própria (jose). ABRE a Fase 5.
export { createOwnerPortalRouter } from "./owner-portal.routes.js";
export { OwnerPortalController, type OwnerPortalServiceResolver } from "./owner-portal.controller.js";
export {
  OwnerPortalService,
  PHOTO_READ_BUCKET_DEFAULT,
  type OwnerPortalDeps,
  type OwnerLookupResult,
  type OwnerDossierResult,
  type OwnerReleaseRequestResult,
  type OwnerPhotoResult,
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
  formatDateLabelPtBr,
  type OwnerPortalProcessDto,
  type OwnerDossierDto,
  type OwnerDossierPhotoItem,
  type OwnerDossierPhotos,
} from "./owner-portal.dto.js";
export {
  assertSafeImageDimensions,
  ImageHeaderRejectedError,
  MAX_DECODED_PIXELS,
  MAX_IMAGE_DIMENSION_PX,
} from "./image-header-guard.js";
export {
  PhotoConcurrencyGuard,
  PhotoConcurrencySaturatedError,
  defaultPhotoConcurrencyGuard,
  PHOTO_PIPELINE_MAX_CONCURRENCY,
} from "./photo-concurrency-guard.js";
export {
  minimizePhotoBuffer,
  runPipeline as runPhotoPipeline,
  withTimeout as withPhotoPipelineTimeout,
  PhotoPipelineError,
  PHOTO_MAX_SOURCE_BYTES,
  PHOTO_MAX_LONGEST_SIDE_PX,
  PHOTO_JPEG_QUALITY,
  PHOTO_PIPELINE_TIMEOUT_MS,
  type PhotoPipelineResult,
} from "./owner-portal.photo-pipeline.js";
export {
  PhotoLruCache,
  defaultPhotoLruCache,
  PHOTO_CACHE_MAX_ENTRIES,
  PHOTO_CACHE_MAX_BYTES,
  PHOTO_CACHE_TTL_MS,
  type CachedPhoto,
} from "./owner-portal.photo-cache.js";
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
