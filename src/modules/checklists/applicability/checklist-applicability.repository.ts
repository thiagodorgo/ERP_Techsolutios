import { randomUUID } from "node:crypto";

import {
  checklistApplicabilityBucketConflictError,
  type ChecklistApplicabilityRule,
  type CreateChecklistApplicabilityRuleInput,
  type ListChecklistApplicabilityRulesFilter,
  type UpdateChecklistApplicabilityRuleInput,
} from "./checklist-applicability.types.js";

// CHECKLIST P1 PR-04a — repositório da regra de aplicabilidade. A interface é a mesma dos dois lados
// (memória e Prisma) e o desempate mora numa função pura compartilhada (`compareApplicabilityRules`), pelo
// mesmo motivo do Tariff: o vínculo é sticky na criação da ordem de serviço, então uma divergência entre os
// modos de persistência congelaria vistorias diferentes conforme o ambiente.

export interface ChecklistApplicabilityRepository {
  create(input: CreateChecklistApplicabilityRuleInput): Promise<ChecklistApplicabilityRule>;
  findById(tenantId: string, ruleId: string): Promise<ChecklistApplicabilityRule | undefined>;
  list(filter: ListChecklistApplicabilityRulesFilter): Promise<readonly ChecklistApplicabilityRule[]>;
  /** Regras VIVAS do tenant — a entrada da resolução. */
  listActive(tenantId: string): Promise<readonly ChecklistApplicabilityRule[]>;
  update(input: UpdateChecklistApplicabilityRuleInput): Promise<ChecklistApplicabilityRule | undefined>;
  /** Soft-delete: libera o bucket sem apagar o histórico de por que a regra existiu. */
  softDelete(tenantId: string, ruleId: string, actorUserId?: string): Promise<ChecklistApplicabilityRule | undefined>;
  reset?(): void;
}

/**
 * A chave do bucket, exatamente como o índice único parcial do banco a enxerga.
 *
 * `NULL` participa da chave como VALOR ("qualquer"), não como ausência — é por isso que o índice usa
 * `NULLS NOT DISTINCT`. Aqui o `??` para uma sentinela reproduz esse comportamento: sem ela, duas regras
 * curinga do mesmo bucket não colidiriam em memória e colidiriam no Postgres, e o mesmo payload daria 201 num
 * modo e 409 no outro.
 */
export function applicabilityBucketKey(rule: {
  readonly tenantId: string;
  readonly serviceCatalogId?: string;
  readonly serviceType?: string;
  readonly customerId?: string;
  readonly role: string;
}): string {
  const qualquer = "\u0000";
  return [
    rule.tenantId,
    rule.serviceCatalogId ?? qualquer,
    rule.serviceType ?? qualquer,
    rule.customerId ?? qualquer,
    rule.role,
  ].join("|");
}

export class InMemoryChecklistApplicabilityRepository implements ChecklistApplicabilityRepository {
  private readonly rules = new Map<string, ChecklistApplicabilityRule>();

  async create(input: CreateChecklistApplicabilityRuleInput): Promise<ChecklistApplicabilityRule> {
    const now = new Date();
    const rule: ChecklistApplicabilityRule = {
      id: randomUUID(),
      tenantId: input.tenantId,
      templateId: input.templateId,
      serviceCatalogId: input.serviceCatalogId,
      serviceType: input.serviceType,
      customerId: input.customerId,
      role: input.role,
      isActive: input.isActive ?? true,
      notes: input.notes,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    if (rule.isActive && this.bucketOcupado(rule)) {
      throw checklistApplicabilityBucketConflictError();
    }

    this.rules.set(rule.id, rule);
    return rule;
  }

  async findById(tenantId: string, ruleId: string): Promise<ChecklistApplicabilityRule | undefined> {
    const rule = this.rules.get(ruleId);
    return rule && rule.tenantId === tenantId ? rule : undefined;
  }

  async list(filter: ListChecklistApplicabilityRulesFilter): Promise<readonly ChecklistApplicabilityRule[]> {
    return [...this.rules.values()]
      .filter((rule) => rule.tenantId === filter.tenantId)
      .filter((rule) => (filter.includeDeleted ? true : !rule.deletedAt))
      .filter((rule) => (filter.templateId ? rule.templateId === filter.templateId : true))
      .filter((rule) => (filter.role ? rule.role === filter.role : true))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async listActive(tenantId: string): Promise<readonly ChecklistApplicabilityRule[]> {
    return [...this.rules.values()].filter(
      (rule) => rule.tenantId === tenantId && rule.isActive && !rule.deletedAt,
    );
  }

  async update(input: UpdateChecklistApplicabilityRuleInput): Promise<ChecklistApplicabilityRule | undefined> {
    const current = await this.findById(input.tenantId, input.ruleId);
    if (!current || current.deletedAt) return undefined;

    const updated: ChecklistApplicabilityRule = {
      ...current,
      // `null` explícito limpa o eixo (volta a "qualquer"); `undefined` não mexe. Tri-state, como a decisão pede.
      serviceCatalogId: input.serviceCatalogId === null ? undefined : input.serviceCatalogId ?? current.serviceCatalogId,
      serviceType: input.serviceType === null ? undefined : input.serviceType ?? current.serviceType,
      customerId: input.customerId === null ? undefined : input.customerId ?? current.customerId,
      role: input.role ?? current.role,
      isActive: input.isActive ?? current.isActive,
      notes: input.notes === null ? undefined : input.notes ?? current.notes,
      updatedBy: input.updatedBy ?? current.updatedBy,
      updatedAt: new Date(),
    };

    if (updated.isActive && this.bucketOcupado(updated)) {
      throw checklistApplicabilityBucketConflictError();
    }

    this.rules.set(updated.id, updated);
    return updated;
  }

  async softDelete(
    tenantId: string,
    ruleId: string,
    actorUserId?: string,
  ): Promise<ChecklistApplicabilityRule | undefined> {
    const current = await this.findById(tenantId, ruleId);
    if (!current || current.deletedAt) return undefined;

    const now = new Date();
    const deleted: ChecklistApplicabilityRule = {
      ...current,
      isActive: false,
      deletedAt: now,
      updatedAt: now,
      updatedBy: actorUserId ?? current.updatedBy,
    };
    this.rules.set(deleted.id, deleted);
    return deleted;
  }

  reset(): void {
    this.rules.clear();
  }

  /** Espelha o índice parcial: só as VIVAS ocupam bucket. */
  private bucketOcupado(candidata: ChecklistApplicabilityRule): boolean {
    const chave = applicabilityBucketKey(candidata);
    return [...this.rules.values()].some(
      (rule) =>
        rule.id !== candidata.id &&
        rule.isActive &&
        !rule.deletedAt &&
        applicabilityBucketKey(rule) === chave,
    );
  }
}
