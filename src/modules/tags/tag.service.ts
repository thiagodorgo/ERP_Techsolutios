import { env } from "../../config/env.js";
import {
  InMemoryTagRepository,
  type TagRepository,
} from "./tag.repository.js";
import type {
  Tag,
  TagActorContext,
  ListTagInput,
  ListTagResult,
  UpdateTagInput,
} from "./tag.types.js";
import { TagError } from "./tag.types.js";
import {
  parseLimit,
  parseName,
  parseOffset,
  parseOptionalColor,
  parseOptionalDescription,
  parseOptionalSearch,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./tag.validators.js";

type RawRecord = Record<string, unknown>;

export class TagService {
  constructor(private readonly repository: TagRepository) {}

  async list(actor: TagActorContext, query: RawRecord): Promise<ListTagResult> {
    const input: ListTagInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: TagActorContext, body: RawRecord): Promise<Tag> {
    // Tenant vem SEMPRE do ator autenticado; tenant_id no body é ignorado.
    return this.repository.create({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      color: parseOptionalColor(body.color),
      description: parseOptionalDescription(body.description),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: TagActorContext, tagId: string): Promise<Tag> {
    const tag = await this.repository.findById(actor.tenantId, parseRequiredUuid(tagId, "tagId"));
    if (!tag) {
      throw new TagError(404, "TAG_NOT_FOUND", "not_found", "Tag was not found.");
    }
    return tag;
  }

  async update(actor: TagActorContext, tagId: string, body: RawRecord): Promise<Tag> {
    const input: UpdateTagInput = {
      tenantId: actor.tenantId,
      tagId: parseRequiredUuid(tagId, "tagId"),
      name: body.name === undefined ? undefined : parseName(body.name),
      color: parseOptionalColor(body.color),
      description: parseOptionalDescription(body.description),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);
    if (!updated) {
      throw new TagError(404, "TAG_NOT_FOUND", "not_found", "Tag was not found.");
    }
    return updated;
  }
}

const memoryRepository = new InMemoryTagRepository();
let defaultServicePromise: Promise<TagService> | undefined;

export function createMemoryTagService(): TagService {
  return new TagService(memoryRepository);
}

export function getMemoryTagRepositoryForTests(): InMemoryTagRepository {
  return memoryRepository;
}

export async function createDefaultTagService(): Promise<TagService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryTagService();
  }
  defaultServicePromise ??= createPrismaTagService();
  return defaultServicePromise;
}

export function resetTagRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaTagService(): Promise<TagService> {
  const { createPrismaTagRepository } = await import("./tag-prisma.repository.js");
  const repository = await createPrismaTagRepository();
  return new TagService(repository);
}
