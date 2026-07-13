import type { Tag, ListTagResult } from "./tag.types.js";

export function toTagDto(tag: Tag) {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color ?? null,
    description: tag.description ?? null,
    isActive: tag.isActive,
    createdBy: tag.createdBy ?? null,
    updatedBy: tag.updatedBy ?? null,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}

export function toTagListDto(result: ListTagResult) {
  return {
    items: result.items.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color ?? null,
      description: tag.description ?? null,
      isActive: tag.isActive,
      createdAt: tag.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
