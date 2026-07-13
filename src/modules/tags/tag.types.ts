import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type TagActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω2-d — Tag (marcador/etiqueta). Chave natural = [tenant_id, name] (409 duplicate_name).
// color opcional em hex (#RRGGBB). Desativação lógica via is_active=false (sem delete físico).
export type Tag = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly color?: string;
  readonly description?: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListTagInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListTagResult = {
  readonly items: readonly Tag[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateTagInput = Omit<
  Tag,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateTagInput = Partial<
  Pick<
    Tag,
    | "name"
    | "color"
    | "description"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly tagId: string;
};

export class TagError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "TagError";
  }
}
