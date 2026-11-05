// B-ASS-02 — serviço de planos/versões (regras de vigência + CRUD de catálogo). Persistence-aware:
// o caminho Prisma chega na F4; em memória (dev/teste) usa o dublê.

import { PLAN_MODULE_KEY_SET } from "./plan-catalog.js";
import {
  latestVersion,
  validateNewVersionDate,
} from "./plan-versioning.js";
import {
  SubscriptionBillingError,
  type PlanKind,
  type PricingUnit,
  type SubscriptionPlan,
  type SubscriptionPlanVersion,
} from "./plan-types.js";
import type {
  CreatePlanRecord,
  PlansRepository,
} from "./plans.repository.js";

const PLAN_CODE_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

export type CreatePlanInput = {
  readonly code: string;
  readonly kind: PlanKind;
  readonly name: string;
  readonly description: string;
};

export type PatchPlanInput = {
  readonly name?: string;
  readonly description?: string;
  readonly active?: boolean;
};

export type AddVersionInput = {
  readonly validFrom: Date;
  readonly monthlyPriceCents: number;
  readonly includedUsers: number;
  readonly includedStorageGb: number;
  readonly extraUserPriceCents: number;
  readonly extraGbPriceCents: number;
  readonly perVehiclePriceCents: number | null;
  readonly pricingUnit: PricingUnit;
  readonly modules: readonly string[];
  readonly notes: string | null;
  readonly inaugural: boolean;
};

export class PlansService {
  constructor(
    private readonly repository: PlansRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  listPlans(): Promise<SubscriptionPlan[]> {
    return this.repository.listPlans();
  }

  async getPlan(id: string): Promise<SubscriptionPlan> {
    const plan = await this.repository.getPlanById(id);
    if (!plan) {
      throw new SubscriptionBillingError(
        404,
        "NOT_FOUND",
        "plan_not_found",
        "Subscription plan not found.",
      );
    }
    return plan;
  }

  async createPlan(input: CreatePlanInput): Promise<SubscriptionPlan> {
    const code = this.normalizePlanCode(input.code);
    this.assertKind(input.kind);
    const name = input.name.trim();
    if (!name) {
      throw new SubscriptionBillingError(
        400,
        "SUBSCRIPTION_BILLING_INVALID",
        "name_required",
        "Plan name is required.",
      );
    }

    const existing = await this.repository.getPlanByCode(code);
    if (existing) {
      throw new SubscriptionBillingError(
        409,
        "CONFLICT",
        "plan_code_exists",
        `A plan with code "${code}" already exists.`,
      );
    }

    const record: CreatePlanRecord = {
      code,
      kind: input.kind,
      name,
      description: input.description.trim(),
      active: true,
      createdBy: null,
    };
    return this.repository.createPlan(record);
  }

  async patchPlan(id: string, patch: PatchPlanInput): Promise<SubscriptionPlan> {
    await this.getPlan(id);

    let name: string | undefined;
    let description: string | undefined;
    let active: boolean | undefined;

    for (const [key, value] of Object.entries(patch)) {
      if (key === "name") {
        const trimmed = typeof value === "string" ? value.trim() : "";
        if (!trimmed) {
          throw new SubscriptionBillingError(
            400,
            "SUBSCRIPTION_BILLING_INVALID",
            "name_required",
            "Plan name is required.",
          );
        }
        name = trimmed;
      } else if (key === "description") {
        description = typeof value === "string" ? value.trim() : "";
      } else if (key === "active") {
        if (typeof value !== "boolean") {
          throw new SubscriptionBillingError(
            400,
            "SUBSCRIPTION_BILLING_INVALID",
            "active_must_be_boolean",
            "Plan active must be a boolean.",
          );
        }
        active = value;
      } else {
        // R-PLAN-1: preço (e qualquer campo fora da lista) nunca é aceito no PATCH de plano.
        throw new SubscriptionBillingError(
          400,
          "SUBSCRIPTION_BILLING_INVALID",
          "unknown_field",
          `Unknown plan field "${key}".`,
        );
      }
    }

    const updated = await this.repository.updatePlan(id, {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(active !== undefined ? { active } : {}),
    });
    if (!updated) {
      throw new SubscriptionBillingError(
        404,
        "NOT_FOUND",
        "plan_not_found",
        "Subscription plan not found.",
      );
    }
    return updated;
  }

  listVersions(planId: string): Promise<SubscriptionPlanVersion[]> {
    return this.repository.listVersions(planId);
  }

  async addVersion(planId: string, input: AddVersionInput): Promise<SubscriptionPlanVersion> {
    await this.getPlan(planId);
    const existing = await this.repository.listVersions(planId);

    const validation = validateNewVersionDate({
      existingVersions: existing,
      validFrom: input.validFrom,
      inaugural: input.inaugural,
      now: this.clock(),
    });
    if (!validation.ok) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        validation.reason,
        this.versionErrorMessage(validation.reason),
      );
    }

    this.assertKnownModules(input.modules);

    const previousLatest =
      existing.length === 0
        ? null
        : existing.reduce((latest, version) =>
            version.validFrom.getTime() > latest.validFrom.getTime() ? version : latest,
          );
    if (previousLatest) {
      await this.repository.setVersionValidTo(previousLatest.id, input.validFrom);
    }

    const nextVersion = existing.reduce((max, version) => Math.max(max, version.version), 0) + 1;

    return this.repository.createVersion({
      planId,
      version: nextVersion,
      validFrom: input.validFrom,
      validTo: null,
      monthlyPriceCents: input.monthlyPriceCents,
      includedUsers: input.includedUsers,
      includedStorageGb: input.includedStorageGb,
      extraUserPriceCents: input.extraUserPriceCents,
      extraGbPriceCents: input.extraGbPriceCents,
      perVehiclePriceCents: input.perVehiclePriceCents,
      pricingUnit: input.pricingUnit,
      modules: input.modules,
      notes: input.notes,
      inaugural: input.inaugural,
    });
  }

  assertKnownModules(modules: readonly string[]): void {
    for (const moduleKey of modules) {
      if (!PLAN_MODULE_KEY_SET.has(moduleKey)) {
        throw new SubscriptionBillingError(
          422,
          "SUBSCRIPTION_BILLING_INVALID",
          "module_unknown",
          `Unknown module "${moduleKey}".`,
        );
      }
    }
  }

  private normalizePlanCode(value: string): string {
    const code = value.trim().toLowerCase();
    if (!PLAN_CODE_PATTERN.test(code)) {
      throw new SubscriptionBillingError(
        400,
        "SUBSCRIPTION_BILLING_INVALID",
        "invalid_plan_code",
        "Plan code must be a lowercase slug (letters, digits, - and _).",
      );
    }
    return code;
  }

  private assertKind(kind: PlanKind): void {
    if (kind !== "base" && kind !== "addon_tracking") {
      throw new SubscriptionBillingError(
        400,
        "SUBSCRIPTION_BILLING_INVALID",
        "invalid_plan_kind",
        "Plan kind must be base or addon_tracking.",
      );
    }
  }

  private versionErrorMessage(reason: string): string {
    switch (reason) {
      case "version_retroactive":
        return "validFrom cannot be before today (America/Sao_Paulo).";
      case "version_not_after_latest":
        return "validFrom must be after the latest version's valid_from.";
      case "inaugural_not_allowed":
        return "Inaugural version is not allowed here.";
      default:
        return "Invalid version.";
    }
  }
}
