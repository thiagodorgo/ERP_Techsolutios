import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryPlansRepository } from "../src/modules/subscription-billing/plans/plans.repository.js";
import { PlansService, type AddVersionInput } from "../src/modules/subscription-billing/plans/plans.service.js";
import { parseCreateVersionDto } from "../src/modules/subscription-billing/plans/route-validators.js";
import { InMemorySubscriptionsRepository } from "../src/modules/subscription-billing/plans/subscriptions.repository.js";
import { SubscriptionsService } from "../src/modules/subscription-billing/plans/subscriptions.service.js";
import { SubscriptionBillingError } from "../src/modules/subscription-billing/plans/plan-types.js";
import { InMemoryTenantLookup } from "../src/modules/subscription-billing/subscription-billing.service.js";
import { RecordingTenantModulesWriter } from "../src/modules/subscription-billing/plans/tenant-modules.sync.js";

// B-ASS-12 — as travas de ESCRITA do add-on de rastreamento (item 65): nenhuma versão de add-on nasce sem preço
// utilizável e nenhum add-on entra numa assinatura sem preço na data. Critério: no máximo 1 vigente por assinatura.
//
// MUTAÇÕES QUE ESTE ARQUIVO MATA (plano §4.3): M13 padrão `flat` para add-on → T-ADD-1; M14 add-on por veículo sem
// preço aceito → T-ADD-2; M15 plano base por veículo aceito → T-ADD-3; M16 add-on sem versão aceito no PUT → T-ADD-4;
// M18 a migração de add-on fura a trava → T-ADD-6. Emenda 1: a M17 sai (a sobrescrita por veículo passa a valer
// sobre versão `flat`: T-ADD-5 reescrito) e entra a E20 (add-on por veículo sem preço e sem sobrescrita → T-ADD-5).

const NOW = new Date("2026-11-05T12:00:00-03:00");
const spDate = (value: string) => new Date(`${value}T00:00:00-03:00`);

function newStack() {
  const plansRepo = new InMemoryPlansRepository();
  const subsRepo = new InMemorySubscriptionsRepository();
  const tenants = new InMemoryTenantLookup();
  const writer = new RecordingTenantModulesWriter();
  const plans = new PlansService(plansRepo, () => NOW);
  const subscriptions = new SubscriptionsService(subsRepo, plansRepo, tenants, writer, () => NOW);
  tenants.upsert({ id: "ten_1", slug: "acme" });
  return { plansRepo, subsRepo, tenants, writer, plans, subscriptions };
}

function versionInput(patch: Partial<AddVersionInput> = {}): AddVersionInput {
  return {
    validFrom: spDate("2026-11-05"), monthlyPriceCents: 19_990, includedUsers: 10, includedStorageGb: 10,
    extraUserPriceCents: 500, extraGbPriceCents: 200, perVehiclePriceCents: null, modules: [], notes: null, inaugural: false,
    ...patch,
  };
}

async function rejects(promise: Promise<unknown>, reason: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof SubscriptionBillingError, String(error));
    assert.deepEqual([error.statusCode, error.reason], [422, reason]);
    return true;
  });
}

test("T-ADD-1 · versão de add-on sem unidade informada nasce por veículo; a de plano base nasce com mensalidade fixa", async () => {
  const stack = newStack();
  const addon = await stack.plans.createPlan({ code: "tracking_basic", kind: "addon_tracking", name: "Rastreamento Basico", description: "" });
  const base = await stack.plans.createPlan({ code: "starter", kind: "base", name: "Starter", description: "" });
  const dto = parseCreateVersionDto({
    validFrom: "2026-11-05", monthlyPrice: "0.00", includedUsers: 0, includedStorageGb: "0", extraUserPrice: "0.00",
    extraGbPrice: "0.00", perVehiclePrice: "19.90", modules: [],
  });
  assert.equal("pricingUnit" in dto, false, "o validador não inventa a unidade: quem decide é o tipo do plano");
  assert.equal((await stack.plans.addVersion(addon.id, dto)).pricingUnit, "per_vehicle");
  assert.equal((await stack.plans.addVersion(base.id, versionInput())).pricingUnit, "flat");
});

test("T-ADD-2 · add-on por veículo sem preço por veículo → 422; add-on de mensalidade fixa com preço por veículo → 422", async () => {
  const stack = newStack();
  const addon = await stack.plans.createPlan({ code: "tracking_basic", kind: "addon_tracking", name: "Rastreamento Basico", description: "" });
  await rejects(stack.plans.addVersion(addon.id, versionInput()), "addon_version_requires_per_vehicle_price");
  await rejects(stack.plans.addVersion(addon.id, versionInput({ pricingUnit: "per_vehicle" })), "addon_version_requires_per_vehicle_price");
  await rejects(stack.plans.addVersion(addon.id, versionInput({ pricingUnit: "flat", perVehiclePriceCents: 1_990 })), "addon_flat_rejects_per_vehicle_price");
  assert.equal((await stack.plans.listVersions(addon.id)).length, 0, "nenhuma versão nasceu");
  assert.equal((await stack.plans.addVersion(addon.id, versionInput({ pricingUnit: "flat" }))).pricingUnit, "flat");
});

test("T-ADD-3 · plano base por veículo → 422 base_plan_requires_flat", async () => {
  const stack = newStack();
  const base = await stack.plans.createPlan({ code: "starter", kind: "base", name: "Starter", description: "" });
  await rejects(stack.plans.addVersion(base.id, versionInput({ pricingUnit: "per_vehicle", perVehiclePriceCents: 1_990 })), "base_plan_requires_flat");
  assert.equal((await stack.plans.listVersions(base.id)).length, 0);
});

async function seedBase(stack: ReturnType<typeof newStack>) {
  const base = await stack.plans.createPlan({ code: "starter", kind: "base", name: "Starter", description: "" });
  await stack.plans.addVersion(base.id, versionInput({ modules: ["dashboard"] }));
}

test("T-ADD-4 · PUT com add-on sem versão vigente na data → 422 addon_without_price, e NADA é escrito", async () => {
  const stack = newStack();
  await seedBase(stack);
  await stack.plans.createPlan({ code: "tracking_basic", kind: "addon_tracking", name: "Rastreamento Basico", description: "" });
  await rejects(
    stack.subscriptions.putSubscription("ten_1", { planCode: "starter", validFrom: spDate("2026-11-05"), addons: [{ planCode: "tracking_basic" }] }),
    "addon_without_price",
  );
  assert.equal(await stack.subsRepo.getActiveSubscription("ten_1"), null, "a assinatura não nasceu");
  assert.equal(stack.writer.calls.length, 0, "os módulos da organização não foram tocados");
});

test("T-ADD-5 · a sobrescrita por veículo é aceita também em add-on de mensalidade fixa; por veículo sem preço e sem sobrescrita → 422", async () => {
  const stack = newStack();
  await seedBase(stack);
  const addon = await stack.plans.createPlan({ code: "tracking_basic", kind: "addon_tracking", name: "Rastreamento Basico", description: "" });
  await stack.plans.addVersion(addon.id, versionInput({ pricingUnit: "flat", monthlyPriceCents: 5_000 }));
  // Emenda 1 (A2): a sobrescrita define o regime da organização (por veículo, pelo preço combinado; 0 = cortesia).
  const cortesia = await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter", validFrom: spDate("2026-11-05"), addons: [{ planCode: "tracking_basic", perVehiclePriceOverrideCents: 0 }],
  });
  assert.deepEqual(cortesia.addons.map((row) => row.perVehiclePriceOverrideCents), [0]);

  // Dado legado: versão por veículo com preço nulo (o addVersion já não deixa nascer — T-ADD-2).
  const plus = await stack.plans.createPlan({ code: "tracking_plus", kind: "addon_tracking", name: "Rastreamento Plus", description: "" });
  const criada = await stack.plans.addVersion(plus.id, versionInput({ perVehiclePriceCents: 1_990 }));
  const stored = (stack.plansRepo as unknown as { versions: Map<string, { perVehiclePriceCents: number | null }> }).versions;
  stored.set(criada.id, { ...stored.get(criada.id)!, perVehiclePriceCents: null });
  await rejects(
    stack.subscriptions.putSubscription("ten_1", { planCode: "starter", validFrom: spDate("2026-11-06"), addons: [{ planCode: "tracking_plus" }] }),
    "addon_without_price",
  );
  const active = await stack.subsRepo.getActiveSubscription("ten_1");
  assert.deepEqual([active?.id, active?.validTo], [cortesia.subscription.id, null], "a recusa veio antes da primeira escrita");
  const comPreco = await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter", validFrom: spDate("2026-11-06"), addons: [{ planCode: "tracking_plus", perVehiclePriceOverrideCents: 990 }],
  });
  assert.deepEqual(comPreco.addons.map((row) => row.perVehiclePriceOverrideCents), [990], "a sobrescrita é preço utilizável");
});

test("T-ADD-6 · add-on que MIGRA (addons omitido) passa pela mesma trava, antes de a assinatura vigente ser fechada", async () => {
  const stack = newStack();
  await seedBase(stack);
  const addon = await stack.plans.createPlan({ code: "tracking_basic", kind: "addon_tracking", name: "Rastreamento Basico", description: "" });
  await stack.plans.addVersion(addon.id, versionInput({ perVehiclePriceCents: 1_990 }));
  const first = await stack.subscriptions.putSubscription("ten_1", { planCode: "starter", validFrom: spDate("2026-11-05"), addons: [{ planCode: "tracking_basic" }] });
  // Dado legado: a versão do add-on some do catálogo em memória (equivale ao add-on vigente sem versão — sonda S2).
  const stored = (stack.plansRepo as unknown as { versions: Map<string, { planId: string }> }).versions;
  for (const [id, row] of stored) if (row.planId === addon.id) stored.delete(id);
  assert.equal((await stack.plans.listVersions(addon.id)).length, 0, "pré-condição: add-on sem versão");
  await rejects(stack.subscriptions.putSubscription("ten_1", { planCode: "starter", validFrom: spDate("2026-11-06") }), "addon_without_price");
  const active = await stack.subsRepo.getActiveSubscription("ten_1");
  assert.deepEqual([active?.id, active?.validTo], [first.subscription.id, null], "a vigente continua aberta");
  assert.equal((await stack.subsRepo.listActiveAddons("ten_1", first.subscription.id)).length, 1, "o add-on vigente continua aberto");
});

test("T-ADD-7 · regressão do critério: Básico e Plus juntos → 422 addon_duplicate_tracking; add-on como plano base → 422", async () => {
  const stack = newStack();
  await seedBase(stack);
  for (const code of ["tracking_basic", "tracking_plus"]) {
    const plan = await stack.plans.createPlan({ code, kind: "addon_tracking", name: code, description: "" });
    await stack.plans.addVersion(plan.id, versionInput({ perVehiclePriceCents: 1_990 }));
  }
  await rejects(
    stack.subscriptions.putSubscription("ten_1", { planCode: "starter", validFrom: spDate("2026-11-05"), addons: [{ planCode: "tracking_basic" }, { planCode: "tracking_plus" }] }),
    "addon_duplicate_tracking",
  );
  await rejects(stack.subscriptions.putSubscription("ten_1", { planCode: "tracking_basic", validFrom: spDate("2026-11-05") }), "addon_requires_base_plan");
});

// Emenda 1.4 (J-573, C1-02, C2-01 e C2-02): a trava de escrita decide pela MESMA autoridade do montador
// (`resolveAddonPricing`): o que o fechamento pularia, a escrita recusa — antes da primeira escrita.
test("T-ADD-8 · add-on flat sem mensalidade positiva → 422 addon_flat_requires_monthly_price, e nada nasce; flat com mensalidade nasce", async () => {
  const stack = newStack();
  const addon = await stack.plans.createPlan({ code: "tracking_basic", kind: "addon_tracking", name: "Rastreamento Basico", description: "" });
  await rejects(stack.plans.addVersion(addon.id, versionInput({ pricingUnit: "flat", monthlyPriceCents: 0 })), "addon_flat_requires_monthly_price");
  assert.equal((await stack.plans.listVersions(addon.id)).length, 0, "nenhuma versão nasceu");
  assert.equal((await stack.plans.addVersion(addon.id, versionInput({ pricingUnit: "flat", monthlyPriceCents: 5_000 }))).pricingUnit, "flat");
});

const FORMAS_SEM_PRECO = [
  ["G1 (flat, 0, por veículo)", { pricingUnit: "flat", monthlyPriceCents: 0, perVehiclePriceCents: 1_990 }],
  ["LB (flat, 50,00, por veículo)", { pricingUnit: "flat", monthlyPriceCents: 5_000, perVehiclePriceCents: 1_990 }],
  ["LC (flat, 0, sem preço por veículo)", { pricingUnit: "flat", monthlyPriceCents: 0, perVehiclePriceCents: null }],
  ["unidade fora da lista", { pricingUnit: "per_km" as never, monthlyPriceCents: 0, perVehiclePriceCents: 1_990 }],
] as const;

test("T-ADD-9 · PUT com versão de add-on antiga e ambígua (G1, LB, LC) ou de unidade fora da lista → 422 addon_without_price pela lista e pela migração, sem nenhuma escrita; com sobrescrita, só a unidade fora da lista continua recusada", async () => {
  for (const [nome, forma] of FORMAS_SEM_PRECO) {
    const stack = newStack();
    await seedBase(stack);
    const plan = await stack.plans.createPlan({ code: "tracking_basic", kind: "addon_tracking", name: "Rastreamento Basico", description: "" });
    const criada = await stack.plans.addVersion(plan.id, versionInput({ perVehiclePriceCents: 1_990 }));
    const first = await stack.subscriptions.putSubscription("ten_1", { planCode: "starter", validFrom: spDate("2026-11-05"), addons: [{ planCode: "tracking_basic" }] });
    // Dado legado: a versão passa a ter a forma antiga (o addVersion de hoje não a deixa nascer — T-ADD-2, T-ADD-8, T-ADD-10).
    const stored = (stack.plansRepo as unknown as { versions: Map<string, Record<string, unknown>> }).versions;
    stored.set(criada.id, { ...stored.get(criada.id)!, ...forma });
    const calls = stack.writer.calls.length;
    for (const input of [
      { planCode: "starter", validFrom: spDate("2026-11-06"), addons: [{ planCode: "tracking_basic" }] },
      { planCode: "starter", validFrom: spDate("2026-11-06") },
    ]) {
      await rejects(stack.subscriptions.putSubscription("ten_1", input), "addon_without_price");
      const active = await stack.subsRepo.getActiveSubscription("ten_1");
      assert.deepEqual([active?.id, active?.validTo], [first.subscription.id, null], `${nome}: a vigente continua aberta`);
      assert.equal((await stack.subsRepo.listActiveAddons("ten_1", first.subscription.id)).length, 1, `${nome}: o add-on vigente continua aberto`);
      assert.equal(stack.writer.calls.length, calls, `${nome}: os módulos não foram tocados`);
    }
    const comSobrescrita = stack.subscriptions.putSubscription("ten_1", {
      planCode: "starter", validFrom: spDate("2026-11-06"), addons: [{ planCode: "tracking_basic", perVehiclePriceOverrideCents: 990 }],
    });
    if (nome === "unidade fora da lista") await rejects(comSobrescrita, "addon_without_price");
    else assert.deepEqual((await comSobrescrita).addons.map((row) => row.perVehiclePriceOverrideCents), [990], `${nome}: a sobrescrita é preço utilizável`);
  }
});

test("T-ADD-10 · versão de add-on com unidade fora da lista → 422 addon_version_unknown_pricing_unit, e nada nasce", async () => {
  const stack = newStack();
  const addon = await stack.plans.createPlan({ code: "tracking_basic", kind: "addon_tracking", name: "Rastreamento Basico", description: "" });
  await rejects(stack.plans.addVersion(addon.id, versionInput({ pricingUnit: "per_km" as never, perVehiclePriceCents: 1_990 })), "addon_version_unknown_pricing_unit");
  assert.equal((await stack.plans.listVersions(addon.id)).length, 0, "nenhuma versão nasceu");
});
