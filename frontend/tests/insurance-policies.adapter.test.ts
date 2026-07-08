import assert from "node:assert/strict";
import test from "node:test";

import type { InsurancePolicy } from "../src/modules/fleet/insurance/insurance.types";

function makePolicy(partial: Partial<InsurancePolicy> & Pick<InsurancePolicy, "id" | "vehicleId">): InsurancePolicy {
  return {
    seguradora: "Porto Seguro",
    numeroApolice: "AP-0001",
    vigenciaInicio: "2026-01-01",
    vigenciaFim: "2026-12-31",
    valor: 2480.0,
    cobertura: null,
    status: "vigente",
    isActive: true,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    ...partial,
  };
}

test("insurance adapter normaliza envelope de lista, snake_case e paginação", async () => {
  const { adaptInsurancePoliciesResponse } = await import("../src/modules/fleet/insurance/insurance.adapter");

  const data = adaptInsurancePoliciesResponse({
    data: {
      items: [
        {
          id: "pol-1",
          vehicle_id: "veh-1",
          seguradora: "Bradesco Seguros",
          numero_apolice: "AP-2026-9988",
          vigencia_inicio: "2026-02-01",
          vigencia_fim: "2027-01-31",
          valor: 3125.5,
          cobertura: "Casco + terceiros",
          status: "vigente",
          is_active: true,
          created_at: "2026-01-15T08:30:00.000Z",
        },
        { id: "", vehicle_id: "veh-x", numero_apolice: "sem id" },
        { id: "pol-2", vehicle_id: "veh-2" }, // sem numero_apolice → descartada
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  });

  assert.equal(data.items.length, 1); // linhas sem id/numero_apolice são descartadas
  assert.equal(data.source, "api");
  const policy = data.items[0];
  assert.equal(policy.vehicleId, "veh-1");
  assert.equal(policy.seguradora, "Bradesco Seguros");
  assert.equal(policy.numeroApolice, "AP-2026-9988");
  assert.equal(policy.vigenciaInicio, "2026-02-01");
  assert.equal(policy.vigenciaFim, "2027-01-31");
  assert.equal(policy.valor, 3125.5);
  assert.equal(policy.cobertura, "Casco + terceiros");
  assert.equal(policy.status, "vigente");
  assert.equal(data.pagination.total, 1);
});

test("insurance adapter: rótulos/tons de situação DERIVADA (vigente/vencida/cancelada) + alternância", async () => {
  const { getPolicyStatusLabel, getPolicyStatusTone, getInsuranceToggleAction, INSURANCE_STATUS_OPTIONS } = await import(
    "../src/modules/fleet/insurance/insurance.adapter"
  );

  assert.equal(getPolicyStatusLabel("vigente"), "Vigente");
  assert.equal(getPolicyStatusLabel("vencida"), "Vencida");
  assert.equal(getPolicyStatusLabel("cancelada"), "Cancelada");

  assert.equal(getPolicyStatusTone("vigente"), "success");
  assert.equal(getPolicyStatusTone("vencida"), "danger");
  assert.equal(getPolicyStatusTone("cancelada"), "audit");

  // Alternância única por situação derivada (nunca envia "vencida").
  const fromVigente = getInsuranceToggleAction("vigente");
  assert.equal(fromVigente.to, "cancelada");
  assert.equal(fromVigente.kind, "cancel");

  const fromVencida = getInsuranceToggleAction("vencida");
  assert.equal(fromVencida.to, "cancelada"); // vencida também é cancelável
  assert.equal(fromVencida.kind, "cancel");

  const fromCancelada = getInsuranceToggleAction("cancelada");
  assert.equal(fromCancelada.to, "vigente"); // cancelada reativa para vigente
  assert.equal(fromCancelada.kind, "reactivate");

  assert.equal(INSURANCE_STATUS_OPTIONS.length, 3);
});

test("insurance adapter: barra de vigência (>30d neutro, ≤30d aviso, vencida perigo) + rótulo acessível", async () => {
  const { computeVigencia, isExpiringSoon } = await import("../src/modules/fleet/insurance/insurance.adapter");
  const now = new Date("2026-07-10T09:00:00.000Z");

  // >30 dias para o fim → neutro (default), rótulo acessível.
  const far = computeVigencia("2026-01-01", "2026-12-31", now);
  assert.equal(far.tone, "default");
  assert.equal(far.hasRange, true);
  assert.match(far.label, /Vence em \d+ dia/);
  assert.ok(far.percent > 0 && far.percent < 100);

  // ≤30 dias → aviso (warning).
  const soon = computeVigencia("2026-01-01", "2026-07-30", now);
  assert.equal(soon.tone, "warning");
  assert.match(soon.label, /Vence em 20 dia/);

  // Fim no passado → perigo (danger) + "Vencida há N dias" + barra cheia.
  const expired = computeVigencia("2026-01-01", "2026-06-30", now);
  assert.equal(expired.tone, "danger");
  assert.match(expired.label, /Vencida há 10 dia/);
  assert.equal(expired.percent, 100);

  // Situação cancelada neutraliza o tom (histórico, não pressiona).
  const cancelled = computeVigencia("2026-01-01", "2026-06-30", now, "cancelada");
  assert.equal(cancelled.tone, "default");

  // Sem fim de vigência → sem barra.
  const none = computeVigencia("2026-01-01", null, now);
  assert.equal(none.hasRange, false);
  assert.equal(none.tone, "default");

  // "A vencer" só considera apólice vigente dentro da janela de 30 dias.
  assert.equal(isExpiringSoon(makePolicy({ id: "1", vehicleId: "A", vigenciaFim: "2026-07-30" }), 30, now), true);
  assert.equal(isExpiringSoon(makePolicy({ id: "2", vehicleId: "A", vigenciaFim: "2026-09-30" }), 30, now), false); // distante
  assert.equal(isExpiringSoon(makePolicy({ id: "3", vehicleId: "A", status: "vencida", vigenciaFim: "2026-07-30" }), 30, now), false); // não-vigente
});

test("insurance adapter: valor BRL / data pt-BR e '—' para nulos + parse pt-BR", async () => {
  const { formatValor, formatPolicyDate, parsePtBrNumber } = await import("../src/modules/fleet/insurance/insurance.adapter");

  assert.match(formatValor(2480), /R\$/);
  assert.equal(formatValor(null), "—");
  assert.equal(formatValor(undefined), "—");

  assert.match(formatPolicyDate("2026-12-31"), /31\/12\/2026/);
  assert.equal(formatPolicyDate(null), "—");
  assert.equal(formatPolicyDate("not-a-date"), "—");

  assert.equal(parsePtBrNumber("2.480,00"), 2480);
  assert.equal(parsePtBrNumber("3.125,50"), 3125.5);
  assert.equal(parsePtBrNumber(""), undefined);
});

test("insurance adapter: lista vazia e fonte fallback preservadas (D-007)", async () => {
  const { adaptInsurancePoliciesResponse } = await import("../src/modules/fleet/insurance/insurance.adapter");

  const data = adaptInsurancePoliciesResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");

  // Resposta sem itens/paginação degrada para lista vazia sem lançar.
  const bare = adaptInsurancePoliciesResponse(null);
  assert.equal(bare.items.length, 0);
  assert.equal(bare.pagination.total, 0);
});

test("insurance adapter: filtro por situação, viatura, 'A vencer', situação lógica e busca", async () => {
  const { filterInsurancePolicies } = await import("../src/modules/fleet/insurance/insurance.adapter");
  const now = new Date("2026-07-10T09:00:00.000Z");

  const items = [
    makePolicy({ id: "1", vehicleId: "A", status: "vigente", numeroApolice: "AP-1", vigenciaFim: "2026-07-30" }), // a vencer
    makePolicy({ id: "2", vehicleId: "B", status: "vencida", numeroApolice: "AP-2", seguradora: "SulAmérica" }),
    makePolicy({ id: "3", vehicleId: "A", status: "vigente", numeroApolice: "AP-3", vigenciaFim: "2026-12-31" }), // distante → não a vencer
    makePolicy({ id: "4", vehicleId: "C", status: "cancelada", numeroApolice: "AP-4", isActive: false }),
  ];

  // Situação (chip) vigente.
  assert.deepEqual(filterInsurancePolicies(items, { search: "", isActive: "all", status: "vigente", now }).map((p) => p.id), ["1", "3"]);
  // Viatura A.
  assert.deepEqual(filterInsurancePolicies(items, { search: "", isActive: "all", vehicleId: "A", now }).map((p) => p.id), ["1", "3"]);
  // "A vencer" (vigente com fim ≤30d).
  assert.deepEqual(filterInsurancePolicies(items, { search: "", isActive: "all", expiringSoon: true, now }).map((p) => p.id), ["1"]);
  // Situação lógica inativa.
  assert.deepEqual(filterInsurancePolicies(items, { search: "", isActive: "inactive", now }).map((p) => p.id), ["4"]);
  // Busca por seguradora.
  assert.deepEqual(filterInsurancePolicies(items, { search: "sulamérica", isActive: "all", now }).map((p) => p.id), ["2"]);
  // Busca pelo nome resolvido da viatura.
  const resolveVehicleName = (id: string) => (id === "A" ? "ABC-1234 Sprinter" : undefined);
  assert.deepEqual(filterInsurancePolicies(items, { search: "sprinter", isActive: "all", now, resolveVehicleName }).map((p) => p.id), ["1", "3"]);
});

test("insurance adapter: totais agregados da janela (total, vigentes, a vencer ≤30d, vencidas)", async () => {
  const { computeInsuranceTotals } = await import("../src/modules/fleet/insurance/insurance.adapter");
  const now = new Date("2026-07-10T09:00:00.000Z");

  const items = [
    makePolicy({ id: "1", vehicleId: "A", status: "vigente", vigenciaFim: "2026-07-25" }), // vigente + a vencer
    makePolicy({ id: "2", vehicleId: "B", status: "vigente", vigenciaFim: "2026-12-31" }), // vigente, distante
    makePolicy({ id: "3", vehicleId: "C", status: "vencida", vigenciaFim: "2026-06-01" }), // vencida
    makePolicy({ id: "4", vehicleId: "D", status: "cancelada", vigenciaFim: "2026-08-01" }), // cancelada → fora
  ];

  const totals = computeInsuranceTotals(items, now);
  assert.equal(totals.count, 4);
  assert.equal(totals.vigenteCount, 2);
  assert.equal(totals.expiringSoonCount, 1);
  assert.equal(totals.vencidaCount, 1);
});

test("insurance adapter: interpreta motivos de domínio (409/422/400) por reason e por status", async () => {
  const { interpretInsuranceSubmitError } = await import("../src/modules/fleet/insurance/insurance.adapter");

  // Motivo explícito → campo/mensagem corretos.
  const duplicate = interpretInsuranceSubmitError({ status: 409, error: { reason: "duplicate_numero_apolice" } });
  assert.equal(duplicate.reason, "duplicate_numero_apolice");
  assert.equal(duplicate.field, "numeroApolice");

  const derived = interpretInsuranceSubmitError({ status: 422, reason: "cannot_set_derived_status" }, "transition");
  assert.equal(derived.reason, "cannot_set_derived_status");
  assert.equal(derived.field, undefined); // só Alerta

  const invalidVehicle = interpretInsuranceSubmitError({ status: 400, reason: "invalid_vehicle_reference" });
  assert.equal(invalidVehicle.reason, "invalid_vehicle_reference");
  assert.equal(invalidVehicle.field, "vehicleId");

  // Sem motivo explícito, infere pelo status.
  assert.equal(interpretInsuranceSubmitError({ status: 409 }, "form").reason, "duplicate_numero_apolice");
  assert.equal(interpretInsuranceSubmitError({ status: 422 }, "transition").reason, "cannot_set_derived_status");
  assert.equal(interpretInsuranceSubmitError({ status: 400 }, "form").field, "vehicleId");

  // Erro genérico preserva a mensagem.
  const generic = interpretInsuranceSubmitError(new Error("Falha genérica"));
  assert.equal(generic.field, undefined);
  assert.equal(generic.message, "Falha genérica");
});

test("insurance adapter: validação de campos obrigatórios e fim > início", async () => {
  const { validateInsurancePolicy } = await import("../src/modules/fleet/insurance/insurance.adapter");

  const errors = validateInsurancePolicy({ vehicleId: "", seguradora: "", numeroApolice: "", vigenciaInicio: "", vigenciaFim: "" });
  const fields = errors.map((e) => e.field);
  assert.ok(fields.includes("vehicleId"));
  assert.ok(fields.includes("seguradora"));
  assert.ok(fields.includes("numeroApolice"));
  assert.ok(fields.includes("vigenciaInicio"));
  assert.ok(fields.includes("vigenciaFim"));
  assert.ok(fields.includes("valor")); // valor ausente é obrigatório

  // fim <= início → erro no campo vigenciaFim.
  const badRange = validateInsurancePolicy({
    vehicleId: "veh-1",
    seguradora: "Porto",
    numeroApolice: "AP-1",
    vigenciaInicio: "2026-12-31",
    vigenciaFim: "2026-01-01",
    valor: 2480,
  });
  assert.ok(badRange.some((e) => e.field === "vigenciaFim"));

  // Rascunho completo e válido não gera erros.
  assert.equal(
    validateInsurancePolicy({
      vehicleId: "veh-1",
      seguradora: "Porto Seguro",
      numeroApolice: "AP-1",
      vigenciaInicio: "2026-01-01",
      vigenciaFim: "2026-12-31",
      valor: 2480,
      cobertura: "Casco",
    }).length,
    0,
  );
});
