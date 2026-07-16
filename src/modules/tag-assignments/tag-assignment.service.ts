import { env } from "../../config/env.js";
import {
  createDefaultTagService,
  createMemoryTagService,
  type TagService,
} from "../tags/tag.service.js";
import { TagError } from "../tags/tag.types.js";
import {
  InMemoryTagAssignmentRepository,
  type TagAssignmentRepository,
} from "./tag-assignment.repository.js";
import type {
  TagAssignment,
  TagAssignmentActorContext,
  TagRef,
} from "./tag-assignment.types.js";
import { tagAssignmentNotFoundError, tagNotFoundError } from "./tag-assignment.types.js";

export class TagAssignmentService {
  constructor(
    private readonly repository: TagAssignmentRepository,
    private readonly tagService: TagService,
  ) {}

  // Attach — valida tag existe+ativa (422 tag_not_found) e cria a associação (409 duplicate no repo).
  // A existência do ALVO polimórfico é garantida pelo chamador (o comment service resolve o comentário
  // antes de chamar aqui → 404) — integridade app-level do alvo sem FK nativa.
  async attach(actor: TagAssignmentActorContext, entityType: string, entityId: string, tagId: string): Promise<TagAssignment> {
    await this.assertTagActive(actor, tagId);
    return this.repository.create({
      tenantId: actor.tenantId,
      tagId,
      entityType,
      entityId,
      createdBy: actor.userId,
    });
  }

  // Detach = HARD-delete. 404 se a associação não existe.
  async detach(actor: TagAssignmentActorContext, entityType: string, entityId: string, tagId: string): Promise<void> {
    const removed = await this.repository.hardDelete(actor.tenantId, entityType, entityId, tagId);
    if (!removed) {
      throw tagAssignmentNotFoundError();
    }
  }

  // Lista as tags do alvo já ENRIQUECIDAS (id/name/color) — §2.8: nunca tenant_id.
  async listForEntity(actor: TagAssignmentActorContext, entityType: string, entityId: string): Promise<readonly TagRef[]> {
    const assignments = await this.repository.listForEntity(actor.tenantId, entityType, entityId);
    const refs: TagRef[] = [];
    for (const assignment of assignments) {
      try {
        const tag = await this.tagService.get(actor, assignment.tagId);
        refs.push({ id: tag.id, name: tag.name, color: tag.color ?? null });
      } catch (error) {
        // A FK RESTRICT garante que a tag exista; se por algum motivo não resolver, omite (nunca quebra
        // a leitura do comentário por um enriquecimento).
        if (!(error instanceof TagError)) throw error;
      }
    }
    return refs;
  }

  // Valida um lote de tag_ids ANTES de criar o comentário (evita comentário órfão quando alguma tag
  // é inválida). Reusa a mesma regra do attach (422 tag_not_found).
  async assertTagsActive(actor: TagAssignmentActorContext, tagIds: readonly string[]): Promise<void> {
    for (const tagId of tagIds) {
      await this.assertTagActive(actor, tagId);
    }
  }

  private async assertTagActive(actor: TagAssignmentActorContext, tagId: string): Promise<void> {
    let tag;
    try {
      tag = await this.tagService.get(actor, tagId);
    } catch (error) {
      if (error instanceof TagError) {
        // inexistente/cross-tenant → 422 tag_not_found (nunca vaza existência cross-tenant).
        throw tagNotFoundError();
      }
      throw error;
    }
    if (!tag.isActive) {
      throw tagNotFoundError();
    }
  }
}

const memoryRepository = new InMemoryTagAssignmentRepository();
let defaultServicePromise: Promise<TagAssignmentService> | undefined;

export function createMemoryTagAssignmentService(): TagAssignmentService {
  return new TagAssignmentService(memoryRepository, createMemoryTagService());
}

export function getMemoryTagAssignmentRepositoryForTests(): InMemoryTagAssignmentRepository {
  return memoryRepository;
}

export async function createDefaultTagAssignmentService(): Promise<TagAssignmentService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryTagAssignmentService();
  }
  defaultServicePromise ??= createPrismaTagAssignmentService();
  return defaultServicePromise;
}

export function resetTagAssignmentRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaTagAssignmentService(): Promise<TagAssignmentService> {
  const { createPrismaTagAssignmentRepository } = await import("./tag-assignment-prisma.repository.js");
  const repository = await createPrismaTagAssignmentRepository();
  const tagService = await createDefaultTagService();
  return new TagAssignmentService(repository, tagService);
}
