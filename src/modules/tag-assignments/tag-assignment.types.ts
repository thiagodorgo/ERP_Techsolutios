import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type TagAssignmentActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω3F-5 (D-Ω3F-5-TAGASSIGN) — associação POLIMÓRFICA tag ↔ alvo. entity_type é livre
// ("work_order_comment" agora; outros depois). Sem soft-delete: detach = HARD-delete.
export const TAG_ASSIGNMENT_ENTITY_TYPES = ["work_order_comment"] as const;
export type TagAssignmentEntityType = (typeof TAG_ASSIGNMENT_ENTITY_TYPES)[number];

export type TagAssignment = {
  readonly id: string;
  readonly tenantId: string;
  readonly tagId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
};

export type CreateTagAssignmentInput = Omit<TagAssignment, "id" | "createdAt">;

// Referência ENXUTA da tag exposta junto do alvo (id/name/color) — §2.8: nunca tenant_id.
export type TagRef = {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
};

export class TagAssignmentError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "TagAssignmentError";
  }
}

export function duplicateTagAssignmentError(): TagAssignmentError {
  return new TagAssignmentError(
    409,
    "TAG_ASSIGNMENT_CONFLICT",
    "duplicate_tag_assignment",
    "This tag is already assigned to the entity.",
  );
}

export function tagNotFoundError(): TagAssignmentError {
  return new TagAssignmentError(
    422,
    "TAG_ASSIGNMENT_UNPROCESSABLE",
    "tag_not_found",
    "The referenced tag does not exist or is inactive for this tenant.",
  );
}

export function tagAssignmentNotFoundError(): TagAssignmentError {
  return new TagAssignmentError(
    404,
    "TAG_ASSIGNMENT_NOT_FOUND",
    "tag_assignment_not_found",
    "The tag assignment was not found.",
  );
}
