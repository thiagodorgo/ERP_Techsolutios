import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptTagResponse, adaptTagsResponse } from "./tags.adapter";
import type {
  TagCreatePayload,
  TagItem,
  TagUpdatePayload,
  TagsApiContext,
  TagsData,
  TagsFilters,
} from "./tags.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listTagsFromApi(context: TagsApiContext, params: Partial<TagsFilters> = {}): Promise<TagsData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/tags${buildQuery(params)}`, context);
    return adaptTagsResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar as Etiquetas.",
    };
  }
}

export async function getTag(context: TagsApiContext, id: string): Promise<TagItem | null> {
  const response = await apiRequest<unknown>(`/tags/${id}`, context);
  return adaptTagResponse(response);
}

export async function createTag(context: TagsApiContext, payload: TagCreatePayload): Promise<TagItem | null> {
  const response = await apiRequest<unknown>("/tags", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptTagResponse(response);
}

export async function updateTag(context: TagsApiContext, id: string, patch: TagUpdatePayload): Promise<TagItem | null> {
  const response = await apiRequest<unknown>(`/tags/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptTagResponse(response);
}

function buildQuery(params: Partial<TagsFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
