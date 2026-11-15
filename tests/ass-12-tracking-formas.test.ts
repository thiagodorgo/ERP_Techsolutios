import assert from "node:assert/strict";
import test from "node:test";

import { parseBusinessDate } from "../src/config/business-time.js";
import { PRICING_UNITS, SubscriptionBillingError, type PricingUnit, type SubscriptionPlanVersion } from "../src/modules/subscription-billing/plans/plan-types.js";
import { InMemoryPlansRepository } from "../src/modules/subscription-billing/plans/plans.repository.js";
import { PlansService, type AddVersionInput } from "../src/modules/subscription-billing/plans/plans.service.js";
import { InMemorySubscriptionsRepository } from "../src/modules/subscription-billing/plans/subscriptions.repository.js";
import { SubscriptionsService } from "../src/modules/subscription-billing/plans/subscriptions.service.js";
import { RecordingTenantModulesWriter } from "../src/modules/subscription-billing/plans/tenant-modules.sync.js";
import { computeStatement } from "../src/modules/subscription-billing/statements/statement.engine.js";
import { buildStatementInputs } from "../src/modules/subscription-billing/statements/statement.inputs.js";
import { InMemoryTenantLookup } from "../src/modules/subscription-billing/subscription-billing.service.js";

// B-ASS-12 (Emenda 1.4, J-573) — a trava de escrita e o montador do demonstrativo NUNCA divergem. Para cada forma de
// versão de add-on (unidade × mensalidade × preço por veículo) e cada sobrescrita da contratação: o PUT aceita (pela
// lista e pela migração) se e só se o montador fecha o mês; e, sem sobrescrita, o addVersion aceita se e só se o
// montador fecha. A grade cobre as classes de equivalência inteiras (3 unidades — as 2 da lista e 1 fora dela — × 2 mensalidades × 3
// preços × 3 sobrescritas = 54), com o valor conferido contra um oráculo escrito aqui, fora do código de produto. Valores fictícios.
//
// MUTAÇÕES QUE ESTE ARQUIVO MATA: a tabela da Emenda 1.4 (§6), as que tocam a trava ou o montador.

const NOW = new Date("2026-11-05T12:00:00-03:00");
const spDate = (value: string) => new Date(`${value}T00:00:00-03:00`);
const FORA_DA_LISTA = "per_km";
const UNITS: readonly string[] = [...PRICING_UNITS, FORA_DA_LISTA];
const MONTHLY = [0, 5_000] as const;
const PER_VEHICLE = [null, 0, 1_990] as const;
const OVERRIDES = [null, 0, 990] as const;
const VEICULOS = 3;

type Forma = { readonly unit: string; readonly monthly: number; readonly pv: number | null; readonly override: number | null };

/** O oráculo, escrito à mão a partir da Emenda 1.4 §2: `null` = sem preço utilizável (pula / recusa). */
function oraculo(forma: Forma): number | null {
  if (forma.unit !== "flat" && forma.unit !== "per_vehicle") return null;
  if (forma.override !== null) return VEICULOS * forma.override;
  if (forma.unit === "per_vehicle") return forma.pv === null ? null : VEICULOS * forma.pv;
  if (forma.pv !== null) return null;
  return forma.monthly > 0 ? forma.monthly : null;
}

function newStack() {
  const plansRepo = new InMemoryPlansRepository();
  const subsRepo = new InMemorySubscriptionsRepository();
  const tenants = new InMemoryTenantLookup();
  const writer = new RecordingTenantModulesWriter();
  const plans = new PlansService(plansRepo, () => NOW);
  const subscriptions = new SubscriptionsService(subsRepo, plansRepo, tenants, writer, () => NOW);
  tenants.upsert({ id: "ten_1", slug: "acme" });
  return { plansRepo, subsRepo, writer, plans, subscriptions };
}

function versionInput(patch: Partial<AddVersionInput> = {}): AddVersionInput {
  return {
    validFrom: spDate("2026-11-05"), monthlyPriceCents: 19_990, includedUsers: 10, includedStorageGb: 10,
    extraUserPriceCents: 500, extraGbPriceCents: 200, perVehiclePriceCents: null, modules: [], notes: null, inaugural: false,
    ...patch,
  };
}

/** Base + o add-on com uma versão boa; depois a versão é trocada pela forma (dado legado, fora do addVersion). */
async function stackCom(forma: Forma, contratar: boolean) {
  const stack = newStack();
  const base = await stack.plans.createPlan({ code: "starter", kind: "base", name: "Starter", description: "" });
  await stack.plans.addVersion(base.id, versionInput({ modules: ["dashboard"] }));
  const plan = await stack.plans.createPlan({ code: "tracking_basic", kind: "addon_tracking", name: "Rastreamento Basico", description: "" });
  const criada = await stack.plans.addVersion(plan.id, versionInput({ perVehiclePriceCents: 1_990 }));
  const first = await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter", validFrom: spDate("2026-11-05"),
    addons: contratar ? [{ planCode: "tracking_basic", perVehiclePriceOverrideCents: forma.override }] : [],
  });
  const stored = (stack.plansRepo as unknown as { versions: Map<string, Record<string, unknown>> }).versions;
  stored.set(criada.id, { ...stored.get(criada.id)!, pricingUnit: forma.unit, monthlyPriceCents: forma.monthly, perVehiclePriceCents: forma.pv });
  return { stack, first };
}

async function aceita(promise: Promise<unknown>): Promise<boolean> {
  try {
    await promise;
    return true;
  } catch (error) {
    assert.ok(error instanceof SubscriptionBillingError, String(error));
    assert.equal(error.statusCode, 422);
    return false;
  }
}

function montador(forma: Forma): number | null {
  const sp = (date: string) => parseBusinessDate(date);
  const STARTER = { id: "v-starter", planId: "starter", version: 1, validFrom: sp("2026-01-01"), validTo: null, monthlyPriceCents: 31_000, includedUsers: 5, includedStorageGb: 5, extraUserPriceCents: 0, extraGbPriceCents: 0, perVehiclePriceCents: null, pricingUnit: "flat", modules: [], notes: null, inaugural: false, createdAt: sp("2026-01-01"), updatedAt: sp("2026-01-01") } as SubscriptionPlanVersion;
  const ADDON = { ...STARTER, id: "v-forma", planId: "tracking_basic", pricingUnit: forma.unit as PricingUnit, monthlyPriceCents: forma.monthly, perVehiclePriceCents: forma.pv } as SubscriptionPlanVersion;
  const inputs = buildStatementInputs("2026-10", {
    tenantSlug: "acme",
    subscriptions: [{ id: "s1", tenantId: "t", planId: "starter", validFrom: sp("2026-09-01"), validTo: null, monthlyPriceOverrideCents: null, includedUsersOverride: null, includedStorageGbOverride: null, extraUserPriceOverrideCents: null, extraGbPriceOverrideCents: null, dueDays: 10, status: "active", endedReason: null, endedBy: null, notes: null, createdAt: sp("2026-09-01"), updatedAt: sp("2026-09-01") }],
    addons: [{ id: "a1", tenantId: "t", subscriptionId: "s1", planId: "tracking_basic", validFrom: sp("2026-09-01"), validTo: null, perVehiclePriceOverrideCents: forma.override, createdAt: sp("2026-09-01"), updatedAt: sp("2026-09-01") }],
    versionsByPlan: new Map([["starter", [STARTER]], ["tracking_basic", [ADDON]]]),
    usage: [],
    bindings: Array.from({ length: VEICULOS }, (_, index) => ({ vehicleId: `v${index}`, validFrom: "2026-09-01", validTo: null })),
  }, { pin: null });
  if (inputs.kind === "skip") {
    assert.equal(inputs.reason, "addon_without_price", JSON.stringify(forma));
    return null;
  }
  return computeStatement({ ...inputs.computation, adjustmentsCents: 0, creditsAppliedCents: 0 }).trackingCents;
}

const GRADE: Forma[] = UNITS.flatMap((unit) => MONTHLY.flatMap((monthly) => PER_VEHICLE.flatMap((pv) => OVERRIDES.map((override) => ({ unit, monthly, pv, override })))));

test("T-FORMA-1 · a grade inteira (54 formas): PUT pela lista = PUT pela migração = o montador fecha; sem sobrescrita, addVersion = o montador; o valor bate com o oráculo", async () => {
  assert.equal(GRADE.length, 54, "unidade nova em PRICING_UNITS muda a grade: classifique-a na autoridade e reveja o oráculo");
  const divergencias: string[] = [];
  for (const forma of GRADE) {
    const esperado = oraculo(forma);
    const fechado = montador(forma);
    const lista = await stackCom(forma, false);
    const pelaLista = await aceita(lista.stack.subscriptions.putSubscription("ten_1", {
      planCode: "starter", validFrom: spDate("2026-11-06"), addons: [{ planCode: "tracking_basic", perVehiclePriceOverrideCents: forma.override }],
    }));
    const migra = await stackCom(forma, true);
    const pelaMigracao = await aceita(migra.stack.subscriptions.putSubscription("ten_1", { planCode: "starter", validFrom: spDate("2026-11-06") }));
    let peloAddVersion: boolean | null = null;
    if (forma.override === null) {
      const stack = newStack();
      const plan = await stack.plans.createPlan({ code: "tracking_x", kind: "addon_tracking", name: "X", description: "" });
      peloAddVersion = await aceita(stack.plans.addVersion(plan.id, versionInput({ pricingUnit: forma.unit as PricingUnit, monthlyPriceCents: forma.monthly, perVehiclePriceCents: forma.pv })));
      if (!peloAddVersion) assert.equal((await stack.plans.listVersions(plan.id)).length, 0, `${JSON.stringify(forma)}: a versão recusada não nasce`);
    }
    if (!pelaMigracao) {
      const active = await migra.stack.subsRepo.getActiveSubscription("ten_1");
      assert.deepEqual([active?.id, active?.validTo], [migra.first.subscription.id, null], `${JSON.stringify(forma)}: a recusa vem antes da 1ª escrita`);
    }
    const cobra = fechado !== null;
    if (fechado !== esperado || pelaLista !== cobra || pelaMigracao !== cobra || (peloAddVersion !== null && peloAddVersion !== cobra)) {
      divergencias.push(`${JSON.stringify(forma)} → montador ${String(fechado)} (oráculo ${String(esperado)}) · lista ${pelaLista} · migração ${pelaMigracao} · addVersion ${String(peloAddVersion)}`);
    }
  }
  assert.deepEqual(divergencias, [], "a trava e o montador são a mesma autoridade");
});
