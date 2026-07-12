import type { Branch, ListBranchResult } from "./branch.types.js";

export function toBranchDto(branch: Branch) {
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    status: branch.status,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
  };
}

export function toBranchListDto(result: ListBranchResult) {
  return {
    items: result.items.map((branch) => ({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      status: branch.status,
      createdAt: branch.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
