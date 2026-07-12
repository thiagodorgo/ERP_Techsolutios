import { randomUUID } from "node:crypto";

import type {
  Branch,
  CreateBranchInput,
  ListBranchInput,
  ListBranchResult,
  UpdateBranchInput,
} from "./branch.types.js";
import { BranchError } from "./branch.types.js";

export interface BranchRepository {
  create(input: CreateBranchInput): Promise<Branch>;
  list(input: ListBranchInput): Promise<ListBranchResult>;
  findById(tenantId: string, branchId: string): Promise<Branch | undefined>;
  update(input: UpdateBranchInput): Promise<Branch | undefined>;
  reset?(): void;
}

export class InMemoryBranchRepository implements BranchRepository {
  private readonly branches = new Map<string, Branch>();

  async create(input: CreateBranchInput): Promise<Branch> {
    if (this.hasCode(input.tenantId, input.code)) {
      throw new BranchError(409, "BRANCH_CONFLICT", "duplicate_code", "A branch with this code already exists.");
    }

    const now = new Date();
    const branch: Branch = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    this.branches.set(branch.id, branch);
    return branch;
  }

  async list(input: ListBranchInput): Promise<ListBranchResult> {
    const filtered = this.sorted()
      .filter((branch) => branch.tenantId === input.tenantId)
      .filter((branch) => input.status === undefined || branch.status === input.status)
      .filter((branch) => matchesSearch(branch, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, branchId: string): Promise<Branch | undefined> {
    const branch = this.branches.get(branchId);
    return branch?.tenantId === tenantId ? branch : undefined;
  }

  async update(input: UpdateBranchInput): Promise<Branch | undefined> {
    const current = await this.findById(input.tenantId, input.branchId);
    if (!current) return undefined;

    if (input.code !== undefined && input.code !== current.code && this.hasCode(input.tenantId, input.code)) {
      throw new BranchError(409, "BRANCH_CONFLICT", "duplicate_code", "A branch with this code already exists.");
    }

    const updated: Branch = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.branches.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.branches.clear();
  }

  private hasCode(tenantId: string, code: string): boolean {
    return [...this.branches.values()].some((branch) => branch.tenantId === tenantId && branch.code === code);
  }

  private sorted(): Branch[] {
    return [...this.branches.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(branch: Branch, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [branch.name, branch.code].some((value) => value.toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
