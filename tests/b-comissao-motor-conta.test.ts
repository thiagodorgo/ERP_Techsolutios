import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyCalculationKey,
  isCommissionCalculationKey,
} from "../src/modules/commissions/commission-calculation-kind.js";
import {
  buildCommissionSnapshot,
  computeCommissionCents,
  decimalTextToCents,
  isReservedBasisEventInput,
  isReservedPolicyInput,
  resolveEffectiveEngineRule,
  type EngineRuleCandidate,
} from "../src/modules/commissions/commission-engine.js";

test("[R1/M1] computeCommissionCents arredonda meio centavo para cima (R$ 33,35 a 10% = R$ 3,34)", () => {
  // 3335 centavos * 10% = 333,5 centavos -> 334 centavos (R$ 3,34)
  assert.equal(computeCommissionCents({ baseCents: 3335n, rateType: "percent", rateValueText: "10" }), 334n);
  // 1005 centavos * 10% = 100,5 centavos -> 101 centavos
  assert.equal(computeCommissionCents({ baseCents: 1005n, rateType: "percent", rateValueText: "10" }), 101n);
  // 1004 centavos * 10% = 100,4 centavos -> 100 centavos
  assert.equal(computeCommissionCents({ baseCents: 1004n, rateType: "percent", rateValueText: "10" }), 100n);
});

test("[R1/M21] base de R$ 99.999.999.999,99 a 33,3333% não perde centavo (aritmética inteira BigInt)", () => {
  const baseCents = decimalTextToCents("99999999999.99");
  assert.equal(baseCents, 9999999999999n);
  // 9999999999999 * 333333 / 1000000 = 3333329999999,666667 -> 3333330000000n
  const amountCents = computeCommissionCents({
    baseCents,
    rateType: "percent",
    rateValueText: "33.3333",
  });
  assert.equal(amountCents, 3333330000000n);
});

test("[R1/M22] fixo com OS de valor zero = o fixo; fixo não depende da base", () => {
  assert.equal(computeCommissionCents({ baseCents: 0n, rateType: "fixed", rateValueText: "95.00" }), 9500n);
  assert.equal(computeCommissionCents({ baseCents: 250000n, rateType: "fixed", rateValueText: "95.00" }), 9500n);
});

test("[R1] percentual com taxa zero ou base zero resulta em 0 centavos", () => {
  assert.equal(computeCommissionCents({ baseCents: 0n, rateType: "percent", rateValueText: "15.5" }), 0n);
  assert.equal(computeCommissionCents({ baseCents: 50000n, rateType: "percent", rateValueText: "0" }), 0n);
  assert.equal(computeCommissionCents({ baseCents: 50000n, rateType: "fixed", rateValueText: "0.00" }), 0n);
});

test("[R1] taxa percentual com até 4 casas decimais calcula centavos exatos", () => {
  // R$ 1.000,00 (100000 centavos) a 12,3456% = 12345,6 centavos -> 12346 centavos
  assert.equal(computeCommissionCents({ baseCents: 100000n, rateType: "percent", rateValueText: "12.3456" }), 12346n);
  // R$ 1.000,00 (100000 centavos) a 12,3454% = 12345,4 centavos -> 12345 centavos
  assert.equal(computeCommissionCents({ baseCents: 100000n, rateType: "percent", rateValueText: "12.3454" }), 12345n);
});

test("[R2/M2] regra da pessoa vence a de serviço e a padrão (precedência pessoa > tipo > padrão > zero)", () => {
  const at = new Date("2026-07-10T12:00:00.000Z");
  const rules: EngineRuleCandidate[] = [
    {
      id: "rule-default",
      ruleType: "engine_default",
      basisType: "work_order_total",
      rateType: "percent",
      rateValue: "5",
      active: true,
      conditions: { effectiveFrom: "2026-07-01T00:00:00.000Z", effectiveTo: null },
    },
    {
      id: "rule-service",
      ruleType: "engine_service",
      basisType: "work_order_total",
      rateType: "percent",
      rateValue: "8",
      active: true,
      conditions: { serviceCatalogId: "srv-1", effectiveFrom: "2026-07-01T00:00:00.000Z", effectiveTo: null },
    },
    {
      id: "rule-payee",
      ruleType: "engine_payee",
      basisType: "work_order_total",
      rateType: "fixed",
      rateValue: "120.00",
      active: true,
      conditions: { payeeUserId: "user-1", effectiveFrom: "2026-07-01T00:00:00.000Z", effectiveTo: null },
    },
  ];

  const chosenPayee = resolveEffectiveEngineRule(rules, {
    payeeUserId: "user-1",
    serviceCatalogId: "srv-1",
    completedAt: at,
  });
  assert.equal(chosenPayee.status, "matched");
  assert.equal(chosenPayee.rule?.id, "rule-payee");

  const chosenService = resolveEffectiveEngineRule(rules, {
    payeeUserId: "user-2",
    serviceCatalogId: "srv-1",
    completedAt: at,
  });
  assert.equal(chosenService.status, "matched");
  assert.equal(chosenService.rule?.id, "rule-service");

  const chosenDefault = resolveEffectiveEngineRule(rules, {
    payeeUserId: "user-2",
    serviceCatalogId: "srv-other",
    completedAt: at,
  });
  assert.equal(chosenDefault.status, "matched");
  assert.equal(chosenDefault.rule?.id, "rule-default");
});

test("[R2/M3] vigência usa a regra vigente no instante da conclusão da OS (effectiveFrom <= conclusão < effectiveTo)", () => {
  const rules: EngineRuleCandidate[] = [
    {
      id: "rule-old",
      ruleType: "engine_payee",
      basisType: "work_order_total",
      rateType: "percent",
      rateValue: "10",
      active: false,
      conditions: {
        payeeUserId: "user-1",
        effectiveFrom: "2026-07-01T00:00:00.000Z",
        effectiveTo: "2026-07-10T00:00:00.000Z",
      },
    },
    {
      id: "rule-new",
      ruleType: "engine_payee",
      basisType: "work_order_total",
      rateType: "percent",
      rateValue: "20",
      active: true,
      conditions: {
        payeeUserId: "user-1",
        effectiveFrom: "2026-07-10T00:00:00.000Z",
        effectiveTo: null,
      },
    },
  ];

  const atOld = resolveEffectiveEngineRule(rules, {
    payeeUserId: "user-1",
    serviceCatalogId: null,
    completedAt: new Date("2026-07-05T15:00:00.000Z"),
  });
  assert.equal(atOld.status, "matched");
  assert.equal(atOld.rule?.id, "rule-old");

  const atNew = resolveEffectiveEngineRule(rules, {
    payeeUserId: "user-1",
    serviceCatalogId: null,
    completedAt: new Date("2026-07-10T00:00:00.000Z"),
  });
  assert.equal(atNew.status, "matched");
  assert.equal(atNew.rule?.id, "rule-new");
});

test("[R2/R4/R5] regra desconhecida ou fora do espaço reservado é ignorada; sem regra devolve no_rule", () => {
  const at = new Date("2026-07-10T12:00:00.000Z");
  const rules: EngineRuleCandidate[] = [
    {
      id: "legacy-payee",
      ruleType: "payee",
      basisType: "work_order_total",
      rateType: "percent",
      rateValue: "50",
      active: true,
      conditions: { payeeUserId: "user-1", effectiveFrom: "2026-07-01T00:00:00.000Z", effectiveTo: null },
    },
    {
      id: "bad-basis",
      ruleType: "engine_payee",
      basisType: "unknown_basis",
      rateType: "percent",
      rateValue: "50",
      active: true,
      conditions: { payeeUserId: "user-1", effectiveFrom: "2026-07-01T00:00:00.000Z", effectiveTo: null },
    },
    {
      id: "bad-rate",
      ruleType: "engine_payee",
      basisType: "work_order_total",
      rateType: "tiered",
      rateValue: "50",
      active: true,
      conditions: { payeeUserId: "user-1", effectiveFrom: "2026-07-01T00:00:00.000Z", effectiveTo: null },
    },
  ];

  const resolved = resolveEffectiveEngineRule(rules, {
    payeeUserId: "user-1",
    serviceCatalogId: "srv-1",
    completedAt: at,
  });
  assert.equal(resolved.status, "no_rule");
  assert.equal(resolved.rule, null);
});

test("[R22/M27] duas regras vigentes para a mesma pessoa no instante da conclusão devolvem ambiguous_rule", () => {
  const at = new Date("2026-07-10T12:00:00.000Z");
  const rules: EngineRuleCandidate[] = [
    {
      id: "rule-a",
      ruleType: "engine_payee",
      basisType: "work_order_total",
      rateType: "percent",
      rateValue: "10",
      active: true,
      conditions: { payeeUserId: "user-1", effectiveFrom: "2026-07-01T00:00:00.000Z", effectiveTo: null },
    },
    {
      id: "rule-b",
      ruleType: "engine_payee",
      basisType: "work_order_total",
      rateType: "percent",
      rateValue: "15",
      active: true,
      conditions: { payeeUserId: "user-1", effectiveFrom: "2026-07-02T00:00:00.000Z", effectiveTo: null },
    },
  ];

  const resolved = resolveEffectiveEngineRule(rules, {
    payeeUserId: "user-1",
    serviceCatalogId: null,
    completedAt: at,
  });
  assert.equal(resolved.status, "ambiguous_rule");
  assert.equal(resolved.rule, null);
});

test("[R5/R19] buildCommissionSnapshot monta lista fechada de chaves para calculated e no_rule", () => {
  const computedAt = new Date("2026-07-10T15:00:00.000Z");
  const snapNoRule = buildCommissionSnapshot({
    outcome: "no_rule",
    workOrderId: "wo-1",
    workOrderCode: "OS-001",
    serviceCatalogId: "srv-1",
    baseCents: 15000n,
    itemCount: 2,
    rule: null,
    amountCents: 0n,
    computedAt,
  });
  assert.deepEqual(Object.keys(snapNoRule).sort(), [
    "amountCents",
    "baseCents",
    "computedAt",
    "engineVersion",
    "itemCount",
    "outcome",
    "rateType",
    "rateValue",
    "rounding",
    "ruleId",
    "ruleType",
    "serviceCatalogId",
    "workOrderCode",
    "workOrderId",
  ]);
  assert.equal(snapNoRule.outcome, "no_rule");
  assert.equal(snapNoRule.amountCents, 0);
  assert.equal(snapNoRule.baseCents, 15000);
  assert.equal(snapNoRule.ruleId, null);
});

test("[R21/M25] isReservedPolicyInput e isReservedBasisEventInput detectam o espaço reservado do motor (case/trim-insensitive)", () => {
  assert.equal(isReservedPolicyInput({ scope: "  ENGINE ", rules: [] }), true);
  assert.equal(isReservedPolicyInput({ scope: "tenant", rules: [{ ruleType: " Engine_Payee " }] }), true);
  assert.equal(isReservedPolicyInput({ scope: "tenant", rules: [{ ruleType: "percentage" }] }), false);

  assert.equal(isReservedBasisEventInput({ idempotencyKey: " engine:wo:123:v1 ", sourceEventName: "work_order.completed" }), true);
  assert.equal(isReservedBasisEventInput({ idempotencyKey: "custom-1", sourceEventName: " ENGINE.work_order.completed " }), true);
  assert.equal(isReservedBasisEventInput({ idempotencyKey: "custom-1", sourceEventName: "work_order.completed" }), false);
});

test("[R30/M58/M73/M74] classifyCalculationKey distingue comissão principal, comissão legada, ajuste e reservado desconhecido", () => {
  assert.equal(classifyCalculationKey("engine:calc:evt-1"), "commission");
  assert.equal(classifyCalculationKey("legado-a-receber-1"), "commission");
  assert.equal(classifyCalculationKey("engine:adj:calc-1:1"), "adjustment");
  assert.equal(classifyCalculationKey("engine:x:1"), "unknown_reserved");

  assert.equal(isCommissionCalculationKey("engine:calc:evt-1"), true);
  assert.equal(isCommissionCalculationKey("legado-1"), true);
  assert.equal(isCommissionCalculationKey("engine:adj:calc-1:1"), false);
  assert.equal(isCommissionCalculationKey("engine:x:1"), false);
});
