// B-ASS-02 — validadores da fronteira HTTP (zod). A forma do corpo é validada aqui; o DOMÍNIO
// (preços em centavos, vigência, módulos) continua nos serviços. Erro de forma sai 400; regra de
// negócio sai 422 pelos serviços. Dinheiro entra como string decimal ("199.90") e sai em centavos.

import { z } from "zod";

import { parseBusinessDate } from "../../../config/business-time.js";
import { moneyToCents, parseStorageGb } from "./plan-money.js";
import { SubscriptionBillingError } from "./plan-types.js";
import type { CreatePlanInput, PatchPlanInput, AddVersionInput } from "./plans.service.js";
import type {
  AddonAssignment,
  DeleteSubscriptionInput,
  PutSubscriptionInput,
  SubscriptionOverrides,
} from "./subscriptions.service.js";

const decimalAmount = z.union([z.string().trim().min(1), z.number().finite()]);
const businessDate = z.string().trim().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
const planKind = z.enum(["base", "addon_tracking"]);
const pricingUnit = z.enum(["flat", "per_vehicle"]);

const createPlanBodySchema = z
  .object({
    code: z.string().trim().min(1),
    kind: planKind,
    name: z.string().trim().min(1),
    description: z.string(),
  })
  .strict();

const patchPlanBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
  })
  .strict();

const createVersionBodySchema = z
  .object({
    validFrom: businessDate,
    monthlyPrice: decimalAmount,
    includedUsers: z.number().int().nonnegative(),
    includedStorageGb: decimalAmount,
    extraUserPrice: decimalAmount,
    extraGbPrice: decimalAmount,
    perVehiclePrice: decimalAmount.nullable().optional(),
    pricingUnit: pricingUnit.optional(),
    modules: z.array(z.string().trim().min(1)),
    notes: z.string().nullable().optional(),
    inaugural: z.boolean().optional(),
  })
  .strict();

const overridesSchema = z
  .object({
    monthlyPrice: decimalAmount.optional(),
    includedUsers: z.number().int().nonnegative().optional(),
    includedStorageGb: decimalAmount.optional(),
    extraUserPrice: decimalAmount.optional(),
    extraGbPrice: decimalAmount.optional(),
  })
  .strict();

const addonAssignmentSchema = z
  .object({
    planCode: z.string().trim().min(1),
    perVehiclePriceOverride: decimalAmount.nullable().optional(),
  })
  .strict();

const putSubscriptionBodySchema = z
  .object({
    planCode: z.string().trim().min(1),
    validFrom: businessDate,
    overrides: overridesSchema.optional(),
    dueDays: z.number().int().nonnegative().optional(),
    addons: z.array(addonAssignmentSchema).optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

const deleteSubscriptionBodySchema = z
  .object({
    validTo: businessDate.optional(),
    reason: z.string().optional(),
  })
  .strict();

export function parseCreatePlanDto(body: unknown): CreatePlanInput {
  const parsed = parse(createPlanBodySchema, body, "plan");
  return {
    code: parsed.code,
    kind: parsed.kind,
    name: parsed.name,
    description: parsed.description,
  };
}

export function parsePatchPlanDto(body: unknown): PatchPlanInput {
  const parsed = parse(patchPlanBodySchema, body, "plan patch");
  return {
    ...(parsed.name !== undefined ? { name: parsed.name } : {}),
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    ...(parsed.active !== undefined ? { active: parsed.active } : {}),
  };
}

export function parseCreateVersionDto(body: unknown): AddVersionInput {
  const parsed = parse(createVersionBodySchema, body, "plan version");
  return {
    validFrom: parseDate(parsed.validFrom, "validFrom"),
    monthlyPriceCents: moneyToCents(parsed.monthlyPrice, "monthlyPrice"),
    includedUsers: parsed.includedUsers,
    includedStorageGb: parseStorageGb(parsed.includedStorageGb, "includedStorageGb"),
    extraUserPriceCents: moneyToCents(parsed.extraUserPrice, "extraUserPrice"),
    extraGbPriceCents: moneyToCents(parsed.extraGbPrice, "extraGbPrice"),
    perVehiclePriceCents:
      parsed.perVehiclePrice === undefined || parsed.perVehiclePrice === null
        ? null
        : moneyToCents(parsed.perVehiclePrice, "perVehiclePrice"),
    pricingUnit: parsed.pricingUnit ?? "flat",
    modules: parsed.modules,
    notes: parsed.notes ?? null,
    inaugural: parsed.inaugural ?? false,
  };
}

export function parsePutSubscriptionDto(body: unknown): PutSubscriptionInput {
  const parsed = parse(putSubscriptionBodySchema, body, "subscription");
  return {
    planCode: parsed.planCode,
    validFrom: parseDate(parsed.validFrom, "validFrom"),
    ...(parsed.overrides ? { overrides: parseOverrides(parsed.overrides) } : {}),
    ...(parsed.dueDays !== undefined ? { dueDays: parsed.dueDays } : {}),
    ...(parsed.addons !== undefined
      ? { addons: parsed.addons.map((addon) => parseAddon(addon)) }
      : {}),
    ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
  };
}

export function parseDeleteSubscriptionDto(body: unknown): DeleteSubscriptionInput {
  const parsed = parse(deleteSubscriptionBodySchema, body, "subscription delete");
  return {
    ...(parsed.validTo !== undefined ? { validTo: parseDate(parsed.validTo, "validTo") } : {}),
    ...(parsed.reason !== undefined ? { reason: parsed.reason } : {}),
  };
}

function parseOverrides(overrides: {
  readonly monthlyPrice?: string | number;
  readonly includedUsers?: number;
  readonly includedStorageGb?: string | number;
  readonly extraUserPrice?: string | number;
  readonly extraGbPrice?: string | number;
}): SubscriptionOverrides {
  return {
    ...(overrides.monthlyPrice !== undefined
      ? { monthlyPriceCents: moneyToCents(overrides.monthlyPrice, "monthlyPrice") }
      : {}),
    ...(overrides.includedUsers !== undefined ? { includedUsers: overrides.includedUsers } : {}),
    ...(overrides.includedStorageGb !== undefined
      ? { includedStorageGb: parseStorageGb(overrides.includedStorageGb, "includedStorageGb") }
      : {}),
    ...(overrides.extraUserPrice !== undefined
      ? { extraUserPriceCents: moneyToCents(overrides.extraUserPrice, "extraUserPrice") }
      : {}),
    ...(overrides.extraGbPrice !== undefined
      ? { extraGbPriceCents: moneyToCents(overrides.extraGbPrice, "extraGbPrice") }
      : {}),
  };
}

function parseAddon(addon: {
  readonly planCode: string;
  readonly perVehiclePriceOverride?: string | number | null;
}): AddonAssignment {
  return {
    planCode: addon.planCode,
    ...(addon.perVehiclePriceOverride !== undefined && addon.perVehiclePriceOverride !== null
      ? {
          perVehiclePriceOverrideCents: moneyToCents(
            addon.perVehiclePriceOverride,
            "perVehiclePriceOverride",
          ),
        }
      : {}),
  };
}

function parseDate(value: string, field: string): Date {
  const date = parseBusinessDate(value);
  if (Number.isNaN(date.getTime())) {
    throw new SubscriptionBillingError(
      400,
      "SUBSCRIPTION_BILLING_INVALID",
      "invalid_date",
      field + " must be a valid calendar date (YYYY-MM-DD).",
    );
  }
  return date;
}

function parse<T>(schema: z.ZodType<T>, body: unknown, field: string): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const path = issue?.path?.join(".") || "body";
  const isUnknownField = issue?.code === "unrecognized_keys";
  throw new SubscriptionBillingError(
    400,
    "SUBSCRIPTION_BILLING_INVALID",
    isUnknownField ? "unknown_field" : "invalid_body",
    "Invalid " + field + " at " + path + ": " + (issue?.message ?? "invalid value") + ".",
  );
}
