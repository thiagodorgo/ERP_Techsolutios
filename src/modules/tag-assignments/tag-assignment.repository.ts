import { randomUUID } from "node:crypto";

import type { CreateTagAssignmentInput, TagAssignment } from "./tag-assignment.types.js";
import { duplicateTagAssignmentError } from "./tag-assignment.types.js";

export interface TagAssignmentRepository {
  create(input: CreateTagAssignmentInput): Promise<TagAssignment>;
  listForEntity(tenantId: string, entityType: string, entityId: string): Promise<readonly TagAssignment[]>;
  // Detach = HARD-delete. Retorna a associação removida (undefined se não existia).
  hardDelete(tenantId: string, entityType: string, entityId: string, tagId: string): Promise<TagAssignment | undefined>;
  reset?(): void;
}

export class InMemoryTagAssignmentRepository implements TagAssignmentRepository {
  private readonly assignments = new Map<string, TagAssignment>();

  async create(input: CreateTagAssignmentInput): Promise<TagAssignment> {
    // Chave natural polimórfica (409 duplicate_tag_assignment) — espelha o unique do Postgres.
    if (this.findKey(input.tenantId, input.entityType, input.entityId, input.tagId)) {
      throw duplicateTagAssignmentError();
    }
    const assignment: TagAssignment = { ...input, id: randomUUID(), createdAt: new Date() };
    this.assignments.set(assignment.id, assignment);
    return assignment;
  }

  async listForEntity(tenantId: string, entityType: string, entityId: string): Promise<readonly TagAssignment[]> {
    return [...this.assignments.values()]
      .filter((a) => a.tenantId === tenantId && a.entityType === entityType && a.entityId === entityId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async hardDelete(tenantId: string, entityType: string, entityId: string, tagId: string): Promise<TagAssignment | undefined> {
    const found = this.findKey(tenantId, entityType, entityId, tagId);
    if (!found) return undefined;
    this.assignments.delete(found.id);
    return found;
  }

  reset(): void {
    this.assignments.clear();
  }

  private findKey(tenantId: string, entityType: string, entityId: string, tagId: string): TagAssignment | undefined {
    return [...this.assignments.values()].find(
      (a) => a.tenantId === tenantId && a.entityType === entityType && a.entityId === entityId && a.tagId === tagId,
    );
  }
}
