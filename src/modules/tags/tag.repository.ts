import { randomUUID } from "node:crypto";

import type {
  Tag,
  CreateTagInput,
  ListTagInput,
  ListTagResult,
  UpdateTagInput,
} from "./tag.types.js";
import { TagError } from "./tag.types.js";

export interface TagRepository {
  create(input: CreateTagInput): Promise<Tag>;
  list(input: ListTagInput): Promise<ListTagResult>;
  findById(tenantId: string, tagId: string): Promise<Tag | undefined>;
  update(input: UpdateTagInput): Promise<Tag | undefined>;
  reset?(): void;
}

export class InMemoryTagRepository implements TagRepository {
  private readonly tags = new Map<string, Tag>();

  async create(input: CreateTagInput): Promise<Tag> {
    if (this.hasName(input.tenantId, input.name)) {
      throw new TagError(409, "TAG_CONFLICT", "duplicate_name", "A tag with this name already exists.");
    }

    const now = new Date();
    const tag: Tag = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.tags.set(tag.id, tag);
    return tag;
  }

  async list(input: ListTagInput): Promise<ListTagResult> {
    const filtered = this.sorted()
      .filter((tag) => tag.tenantId === input.tenantId)
      .filter((tag) => input.isActive === undefined || tag.isActive === input.isActive)
      .filter((tag) => matchesSearch(tag, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, tagId: string): Promise<Tag | undefined> {
    const tag = this.tags.get(tagId);
    return tag?.tenantId === tenantId ? tag : undefined;
  }

  async update(input: UpdateTagInput): Promise<Tag | undefined> {
    const current = await this.findById(input.tenantId, input.tagId);
    if (!current) return undefined;

    if (input.name !== undefined && input.name !== current.name && this.hasName(input.tenantId, input.name)) {
      throw new TagError(409, "TAG_CONFLICT", "duplicate_name", "A tag with this name already exists.");
    }

    const updated: Tag = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.tags.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.tags.clear();
  }

  private hasName(tenantId: string, name: string): boolean {
    return [...this.tags.values()].some((tag) => tag.tenantId === tenantId && tag.name === name);
  }

  private sorted(): Tag[] {
    return [...this.tags.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(tag: Tag, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [tag.name, tag.description]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
