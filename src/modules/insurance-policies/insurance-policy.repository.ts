import { randomUUID } from "node:crypto";

import type {
  CreateInsurancePolicyInput,
  InsurancePolicy,
  ListInsurancePoliciesInput,
  ListInsurancePoliciesResult,
  UpdateInsurancePolicyInput,
} from "./insurance-policy.types.js";
import { InsurancePolicyError } from "./insurance-policy.types.js";

export interface InsurancePolicyRepository {
  create(input: CreateInsurancePolicyInput): Promise<InsurancePolicy>;
  list(input: ListInsurancePoliciesInput): Promise<ListInsurancePoliciesResult>;
  findById(tenantId: string, insurancePolicyId: string): Promise<InsurancePolicy | undefined>;
  update(input: UpdateInsurancePolicyInput): Promise<InsurancePolicy | undefined>;
  /**
   * R4.2 — stored-`vigente`, active policies whose `vigencia_fim` is in `(now, until]`
   * (still valid but expiring within the widest renewal window). Tenant-scoped.
   */
  listExpiringVigente(tenantId: string, now: Date, until: Date): Promise<InsurancePolicy[]>;
  reset?(): void;
}

export class InMemoryInsurancePolicyRepository implements InsurancePolicyRepository {
  private readonly policies = new Map<string, InsurancePolicy>();

  async create(input: CreateInsurancePolicyInput): Promise<InsurancePolicy> {
    // Composite unique (tenant_id, numero_apolice). The same number in another
    // tenant is allowed; a duplicate in the SAME tenant is a 409.
    if (this.hasNumeroApolice(input.tenantId, input.numeroApolice)) {
      throw duplicateNumeroApolice();
    }

    const now = new Date();
    const policy: InsurancePolicy = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(policy.id, policy);

    return policy;
  }

  async list(input: ListInsurancePoliciesInput): Promise<ListInsurancePoliciesResult> {
    const filtered = this.sortedPolicies()
      .filter((policy) => policy.tenantId === input.tenantId)
      .filter((policy) => input.vehicleId === undefined || policy.vehicleId === input.vehicleId)
      .filter((policy) => input.storedStatus === undefined || policy.status === input.storedStatus)
      .filter((policy) => input.isActive === undefined || policy.isActive === input.isActive)
      .filter((policy) => input.vigenciaFimGte === undefined || policy.vigenciaFim.getTime() >= input.vigenciaFimGte.getTime())
      .filter((policy) => input.vigenciaFimLt === undefined || policy.vigenciaFim.getTime() < input.vigenciaFimLt.getTime())
      .filter((policy) => input.vigenciaFimLte === undefined || policy.vigenciaFim.getTime() <= input.vigenciaFimLte.getTime())
      .filter((policy) => matchesSearch(policy, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, insurancePolicyId: string): Promise<InsurancePolicy | undefined> {
    const policy = this.policies.get(insurancePolicyId);
    return policy?.tenantId === tenantId ? policy : undefined;
  }

  async update(input: UpdateInsurancePolicyInput): Promise<InsurancePolicy | undefined> {
    const current = await this.findById(input.tenantId, input.insurancePolicyId);
    if (!current) return undefined;

    // Changing numero_apolice to one already used by ANOTHER policy of the same
    // tenant is a 409.
    if (
      input.numeroApolice !== undefined &&
      input.numeroApolice !== current.numeroApolice &&
      this.hasNumeroApolice(input.tenantId, input.numeroApolice, current.id)
    ) {
      throw duplicateNumeroApolice();
    }

    const updated: InsurancePolicy = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.policies.set(updated.id, updated);

    return updated;
  }

  async listExpiringVigente(tenantId: string, now: Date, until: Date): Promise<InsurancePolicy[]> {
    return this.sortedPolicies().filter(
      (policy) =>
        policy.tenantId === tenantId &&
        policy.isActive &&
        policy.status === "vigente" &&
        policy.vigenciaFim.getTime() > now.getTime() &&
        policy.vigenciaFim.getTime() <= until.getTime(),
    );
  }

  reset(): void {
    this.policies.clear();
  }

  private hasNumeroApolice(tenantId: string, numeroApolice: string, excludeId?: string): boolean {
    return [...this.policies.values()].some(
      (policy) => policy.tenantId === tenantId && policy.numeroApolice === numeroApolice && policy.id !== excludeId,
    );
  }

  private sortedPolicies(): InsurancePolicy[] {
    return [...this.policies.values()].sort((left, right) => {
      const byCreatedAt = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreatedAt !== 0) return byCreatedAt;

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  }
}

function matchesSearch(policy: InsurancePolicy, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [policy.seguradora, policy.numeroApolice, policy.cobertura]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function duplicateNumeroApolice(): InsurancePolicyError {
  return new InsurancePolicyError(
    409,
    "INSURANCE_CONFLICT",
    "duplicate_numero_apolice",
    "An insurance policy with this numeroApolice already exists in this organization.",
  );
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
