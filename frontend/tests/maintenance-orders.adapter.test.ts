import assert from "node:assert/strict";
import test from "node:test";

import type { MaintenanceOrder } from "../src/modules/fleet/maintenance/maintenance-orders.types";

function makeOrder(partial: Partial<MaintenanceOrder> & Pick<MaintenanceOrder, "id" | "vehicleId">): MaintenanceOrder {
  return {
    type: "preventiva",
    status: "agendada",
    scheduledFor: "2026-06-10T09:00:00.000Z",
    completedAt: null,
    cost: null,
    supplier: null,
    odometer: null,
    description: "Troca de óleo",
    isActive: true,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

test("maintenance adapter normaliza envelope de lista, snake_case e paginação", async () => {
  const { adaptMaintenanceOrdersResponse } = await import("../src/modules/fleet/maintenance/maintenance-orders.adapter");

  const data = adaptMaintenanceOrdersResponse({
    data: {
      items: [
        {
          id: "mo-1",
          vehicle_id: "veh-1",
          type: "corretiva",
          status: "em_execucao",
          scheduled_for: "2026-06-12T08:30:00.000Z",
          completed_at: null,
          cost: 1250.5,
          supplier: "Oficina Central",
          odometer: 120500,
          description: "Troca de embreagem",
          is_active: true,
          created_at: "2026-06-11T08:30:00.000Z",
        },
        { id: "", vehicle_id: "veh-x", description: "sem id" },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  });

  assert.equal(data.items.length, 1); // linha sem id é descartada
  assert.equal(data.source, "api");
  const order = data.items[0];
  assert.equal(order.vehicleId, "veh-1");
  assert.equal(order.type, "corretiva");
  assert.equal(order.status, "em_execucao");
  assert.equal(order.cost, 1250.5);
  assert.equal(order.supplier, "Oficina Central");
  assert.equal(order.odometer, 120500);
  assert.equal(order.scheduledFor, "2026-06-12T08:30:00.000Z");
  assert.equal(order.completedAt, null);
  assert.equal(data.pagination.total, 1);
});

test("maintenance adapter: filtro por aba (tipo/situação), situação lógica e busca", async () => {
  const { filterMaintenanceOrders } = await import("../src/modules/fleet/maintenance/maintenance-orders.adapter");

  const items = [
    makeOrder({ id: "1", vehicleId: "A", type: "preventiva", status: "agendada", description: "Revisão" }),
    makeOrder({ id: "2", vehicleId: "B", type: "corretiva", status: "em_execucao", description: "Freio" }),
    makeOrder({ id: "3", vehicleId: "A", type: "preventiva", status: "concluida", completedAt: "2026-06-20T10:00:00.000Z", cost: 300 }),
    makeOrder({ id: "4", vehicleId: "C", type: "corretiva", status: "cancelada" }),
    makeOrder({ id: "5", vehicleId: "A", type: "preventiva", status: "agendada", isActive: false, description: "Filtro" }),
  ];

  // Preventivas = type=preventiva e não-final (agendada/em_execucao).
  assert.deepEqual(
    filterMaintenanceOrders(items, { search: "", isActive: "all", tab: "preventivas" }).map((o) => o.id),
    ["1", "5"],
  );
  // Corretivas = type=corretiva e não-final.
  assert.deepEqual(
    filterMaintenanceOrders(items, { search: "", isActive: "all", tab: "corretivas" }).map((o) => o.id),
    ["2"],
  );
  // Histórico = concluída/cancelada (qualquer tipo).
  assert.deepEqual(
    filterMaintenanceOrders(items, { search: "", isActive: "all", tab: "historico" }).map((o) => o.id),
    ["3", "4"],
  );
  // Situação lógica (is_active) combinada com a aba.
  assert.deepEqual(
    filterMaintenanceOrders(items, { search: "", isActive: "inactive", tab: "preventivas" }).map((o) => o.id),
    ["5"],
  );
  // Busca por descrição dentro da aba.
  assert.deepEqual(
    filterMaintenanceOrders(items, { search: "freio", isActive: "all", tab: "corretivas" }).map((o) => o.id),
    ["2"],
  );
  // Busca pelo nome resolvido da viatura.
  const resolveVehicleName = (id: string) => (id === "A" ? "RTA1B23 Constellation" : undefined);
  assert.deepEqual(
    filterMaintenanceOrders(items, { search: "rta1b23", isActive: "all", tab: "preventivas", resolveVehicleName }).map((o) => o.id),
    ["1", "5"],
  );
});

test("maintenance adapter: rótulos/tons de situação e tipo + transições válidas", async () => {
  const { getMaintenanceStatusLabel, getMaintenanceStatusTone, getMaintenanceTypeLabel, getMaintenanceTypeTone, getValidTransitions, isFinalStatus } =
    await import("../src/modules/fleet/maintenance/maintenance-orders.adapter");

  assert.equal(getMaintenanceStatusLabel("agendada"), "Agendada");
  assert.equal(getMaintenanceStatusLabel("em_execucao"), "Em execução");
  assert.equal(getMaintenanceStatusLabel("concluida"), "Concluída");
  assert.equal(getMaintenanceStatusLabel("cancelada"), "Cancelada");

  assert.equal(getMaintenanceStatusTone("agendada"), "default");
  assert.equal(getMaintenanceStatusTone("em_execucao"), "warning");
  assert.equal(getMaintenanceStatusTone("concluida"), "success");
  assert.equal(getMaintenanceStatusTone("cancelada"), "audit");

  assert.equal(getMaintenanceTypeLabel("preventiva"), "Preventiva");
  assert.equal(getMaintenanceTypeLabel("corretiva"), "Corretiva");
  assert.equal(getMaintenanceTypeTone("preventiva"), "info");
  assert.equal(getMaintenanceTypeTone("corretiva"), "pending");

  // Só as próximas situações válidas são oferecidas.
  assert.deepEqual(getValidTransitions("agendada").map((t) => t.to), ["em_execucao", "cancelada"]);
  assert.deepEqual(getValidTransitions("em_execucao").map((t) => t.to), ["concluida", "cancelada"]);
  assert.deepEqual(getValidTransitions("em_execucao").map((t) => t.kind), ["complete", "cancel"]);
  assert.equal(getValidTransitions("concluida").length, 0);
  assert.equal(getValidTransitions("cancelada").length, 0);

  assert.equal(isFinalStatus("concluida"), true);
  assert.equal(isFinalStatus("agendada"), false);
});

test("maintenance adapter: moeda/data pt-BR e '—' para nulos", async () => {
  const { formatCost, formatMaintenanceDate, parsePtBrNumber, parseIntStrict } = await import(
    "../src/modules/fleet/maintenance/maintenance-orders.adapter"
  );

  assert.match(formatCost(1250.5), /R\$/);
  assert.equal(formatCost(null), "—");
  assert.equal(formatCost(undefined), "—");

  assert.match(formatMaintenanceDate("2026-06-20T10:00:00.000Z"), /2026/);
  assert.equal(formatMaintenanceDate(null), "—");
  assert.equal(formatMaintenanceDate("not-a-date"), "—");

  assert.equal(parsePtBrNumber("1.250,00"), 1250);
  assert.equal(parsePtBrNumber(""), undefined);
  assert.equal(parseIntStrict("120500"), 120500);
  assert.equal(parseIntStrict("12,5"), undefined);
});

test("maintenance adapter: lista vazia e fonte fallback preservadas (D-007)", async () => {
  const { adaptMaintenanceOrdersResponse } = await import("../src/modules/fleet/maintenance/maintenance-orders.adapter");

  const data = adaptMaintenanceOrdersResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");

  // Resposta sem itens/paginação degrada para lista vazia sem lançar.
  const bare = adaptMaintenanceOrdersResponse(null);
  assert.equal(bare.items.length, 0);
  assert.equal(bare.pagination.total, 0);
});

test("maintenance adapter: validação e interpretação dos 3 motivos 422", async () => {
  const { validateMaintenanceOrder, validateCompletion, interpretMaintenanceSubmitError } = await import(
    "../src/modules/fleet/maintenance/maintenance-orders.adapter"
  );

  // Formulário: obrigatórios ausentes + odômetro inválido.
  const formErrors = validateMaintenanceOrder({ vehicleId: "", type: "preventiva", description: "", odometer: 1.5 });
  const formFields = formErrors.map((error) => error.field);
  assert.ok(formFields.includes("vehicleId"));
  assert.ok(formFields.includes("description"));
  assert.ok(formFields.includes("odometer"));
  assert.equal(validateMaintenanceOrder({ vehicleId: "veh-1", type: "corretiva", description: "Freio", odometer: 1000 }).length, 0);

  // Conclusão exige custo + data.
  const completionErrors = validateCompletion({});
  assert.deepEqual(completionErrors.map((e) => e.field).sort(), ["completedAt", "cost"]);
  assert.equal(validateCompletion({ cost: 300, completedAt: "2026-06-20" }).length, 0);

  // Os 3 motivos de domínio 422 mapeiam para campo/mensagem corretos (motivo explícito).
  const invalid = interpretMaintenanceSubmitError({ status: 422, error: { reason: "invalid_status_transition" } });
  assert.equal(invalid.reason, "invalid_status_transition");
  assert.equal(invalid.field, undefined); // só Alerta de perigo

  const completion = interpretMaintenanceSubmitError({ status: 422, reason: "completion_requires_cost_and_date" });
  assert.equal(completion.field, "cost");

  const odometer = interpretMaintenanceSubmitError({ status: 422, reason: "odometer_regressive" });
  assert.equal(odometer.field, "odometer");

  // Sem motivo explícito, infere pelo contexto da operação.
  assert.equal(interpretMaintenanceSubmitError({ status: 422 }, "transition").reason, "invalid_status_transition");
  assert.equal(interpretMaintenanceSubmitError({ status: 422 }, "completion").reason, "completion_requires_cost_and_date");
  assert.equal(interpretMaintenanceSubmitError({ status: 422 }, "form").reason, "odometer_regressive");

  // Erro genérico preserva a mensagem.
  const generic = interpretMaintenanceSubmitError(new Error("Falha genérica"));
  assert.equal(generic.field, undefined);
  assert.equal(generic.message, "Falha genérica");
});
