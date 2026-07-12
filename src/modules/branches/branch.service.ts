import { env } from "../../config/env.js";
import {
  InMemoryBranchRepository,
  type BranchRepository,
} from "./branch.repository.js";
import type {
  Branch,
  BranchActorContext,
  ListBranchInput,
  ListBranchResult,
  UpdateBranchInput,
} from "./branch.types.js";
import { BranchError } from "./branch.types.js";
import {
  parseCode,
  parseLimit,
  parseName,
  parseOffset,
  parseOptionalSearch,
  parseOptionalStatus,
  parseRequiredUuid,
} from "./branch.validators.js";

type RawRecord = Record<string, unknown>;

export class BranchService {
  constructor(private readonly repository: BranchRepository) {}

  async list(actor: BranchActorContext, query: RawRecord): Promise<ListBranchResult> {
    const input: ListBranchInput = {
      tenantId: actor.tenantId,
      status: parseOptionalStatus(query.status),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: BranchActorContext, body: RawRecord): Promise<Branch> {
    // Tenant vem SEMPRE do ator autenticado; tenant_id no body é ignorado.
    return this.repository.create({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      code: parseCode(body.code),
      status: parseOptionalStatus(body.status) ?? "active",
    });
  }

  async get(actor: BranchActorContext, branchId: string): Promise<Branch> {
    const branch = await this.repository.findById(actor.tenantId, parseRequiredUuid(branchId, "branchId"));
    if (!branch) {
      throw new BranchError(404, "BRANCH_NOT_FOUND", "not_found", "Branch was not found.");
    }
    return branch;
  }

  async update(actor: BranchActorContext, branchId: string, body: RawRecord): Promise<Branch> {
    const input: UpdateBranchInput = {
      tenantId: actor.tenantId,
      branchId: parseRequiredUuid(branchId, "branchId"),
      name: body.name === undefined ? undefined : parseName(body.name),
      code: body.code === undefined ? undefined : parseCode(body.code),
      // Soft-delete = status "inactive" (o model Branch não tem is_active).
      status: parseOptionalStatus(body.status),
    };
    const updated = await this.repository.update(input);
    if (!updated) {
      throw new BranchError(404, "BRANCH_NOT_FOUND", "not_found", "Branch was not found.");
    }
    return updated;
  }
}

const memoryRepository = new InMemoryBranchRepository();
let defaultServicePromise: Promise<BranchService> | undefined;

export function createMemoryBranchService(): BranchService {
  return new BranchService(memoryRepository);
}

export function getMemoryBranchRepositoryForTests(): InMemoryBranchRepository {
  return memoryRepository;
}

export async function createDefaultBranchService(): Promise<BranchService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryBranchService();
  }
  defaultServicePromise ??= createPrismaBranchService();
  return defaultServicePromise;
}

export function resetBranchRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaBranchService(): Promise<BranchService> {
  const { createPrismaBranchRepository } = await import("./branch-prisma.repository.js");
  const repository = await createPrismaBranchRepository();
  return new BranchService(repository);
}
