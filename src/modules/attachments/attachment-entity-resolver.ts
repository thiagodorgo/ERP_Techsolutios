import type { Permission } from "../core-saas/permissions/catalog.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import type { AttachmentActorContext } from "./attachment.types.js";

// coreService só é exigido pela ASSINATURA dos factories das entidades; `.get()` (posse) não o usa.
// Resolvido pelo runtime (memory/prisma) e cacheado uma vez.
let coreServicePromise: Promise<ICoreSaasService> | undefined;
async function getCoreService(): Promise<ICoreSaasService> {
  if (!coreServicePromise) {
    const { createCoreSaasService } = await import("../core-saas/core-saas-runtime.js");
    coreServicePromise = createCoreSaasService();
  }
  return coreServicePromise;
}

/**
 * D-Ω4C-ANEXOS-RBAC / RN-ANEXO-01/03 — resolve entity_type → { get(posse), permissões HERDADAS }.
 * Sem permissão nova no catálogo: read(list/download)=`<ent>:read`, write(upload)=`<ent>:create`,
 * delete=`<ent>:update`. O `get()` de cada módulo já é TENANT-SCOPED (404 cross-tenant), então a POSSE
 * cai naturalmente para 404. allow-list v1 (D-Ω4C-ANEXOS-ENTITYTYPES): damage / fine / insurance_policy
 * / maintenance_order.
 */
export type ResolvedAttachmentEntity = { readonly id: string };

export type AttachmentEntityDescriptor = {
  readonly permRead: Permission;
  readonly permCreate: Permission;
  readonly permUpdate: Permission;
  // Retorna a entidade se visível ao tenant do ator; undefined se ausente/cross-tenant (→ 404 posse).
  get(actor: AttachmentActorContext, entityId: string): Promise<ResolvedAttachmentEntity | undefined>;
};

export interface AttachmentEntityResolver {
  descriptorFor(entityType: string): AttachmentEntityDescriptor | undefined;
  entityTypes(): readonly string[];
}

class RegistryAttachmentEntityResolver implements AttachmentEntityResolver {
  constructor(private readonly registry: ReadonlyMap<string, AttachmentEntityDescriptor>) {}

  descriptorFor(entityType: string): AttachmentEntityDescriptor | undefined {
    return this.registry.get(entityType);
  }

  entityTypes(): readonly string[] {
    return [...this.registry.keys()];
  }
}

// Um erro "não encontrado" da entidade-alvo (statusCode 404) vira POSSE-falha (undefined). Qualquer
// outro erro (bug real) sobe — nunca é engolido.
function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "statusCode" in error && (error as { readonly statusCode?: unknown }).statusCode === 404;
}

async function resolveVia<T extends { readonly id: string }>(
  load: () => Promise<T>,
): Promise<ResolvedAttachmentEntity | undefined> {
  try {
    const entity = await load();
    return { id: entity.id };
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

let defaultResolver: AttachmentEntityResolver | undefined;

export function createDefaultAttachmentEntityResolver(): AttachmentEntityResolver {
  defaultResolver ??= buildDefaultResolver();
  return defaultResolver;
}

export function resetAttachmentEntityResolverForTests(): void {
  defaultResolver = undefined;
  coreServicePromise = undefined;
}

function buildDefaultResolver(): AttachmentEntityResolver {
  const registry = new Map<string, AttachmentEntityDescriptor>();

  registry.set("damage", {
    permRead: "damages:read",
    permCreate: "damages:create",
    permUpdate: "damages:update",
    get: (actor, entityId) =>
      resolveVia(async () => {
        const [{ createDefaultDamageService }, coreService] = await Promise.all([
          import("../damages/damage.service.js"),
          getCoreService(),
        ]);
        const service = await createDefaultDamageService(coreService);
        return service.get(actor, entityId);
      }),
  });

  registry.set("fine", {
    permRead: "fines:read",
    permCreate: "fines:create",
    permUpdate: "fines:update",
    get: (actor, entityId) =>
      resolveVia(async () => {
        const [{ createDefaultFineService }, coreService] = await Promise.all([
          import("../fines/fine.service.js"),
          getCoreService(),
        ]);
        const service = await createDefaultFineService(coreService);
        return service.get(actor, entityId);
      }),
  });

  registry.set("insurance_policy", {
    permRead: "insurance_policies:read",
    permCreate: "insurance_policies:create",
    permUpdate: "insurance_policies:update",
    get: (actor, entityId) =>
      resolveVia(async () => {
        const [{ createDefaultInsurancePolicyService }, coreService] = await Promise.all([
          import("../insurance-policies/insurance-policy.service.js"),
          getCoreService(),
        ]);
        const service = await createDefaultInsurancePolicyService(coreService);
        return service.get(actor, entityId);
      }),
  });

  registry.set("maintenance_order", {
    permRead: "maintenance_orders:read",
    permCreate: "maintenance_orders:create",
    permUpdate: "maintenance_orders:update",
    get: (actor, entityId) =>
      resolveVia(async () => {
        const { createDefaultMaintenanceOrderService } = await import("../maintenance-orders/maintenance-order.service.js");
        const service = await createDefaultMaintenanceOrderService();
        return service.get(actor, entityId);
      }),
  });

  return new RegistryAttachmentEntityResolver(registry);
}
