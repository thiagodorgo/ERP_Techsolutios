import assert from "node:assert/strict";
import test from "node:test";

import type { Fine } from "../src/modules/fleet/fines/fines.types";

function makeFine(partial: Partial<Fine> & Pick<Fine, "id" | "vehicleId">): Fine {
  return {
    driverId: null,
    numeroAuto: "AUTO-0001",
    dataInfracao: "2026-06-10",
    orgao: "DETRAN-SP",
    descricao: null,
    valor: 293.47,
    pontos: 5,
    prazoRecurso: null,
    prazoPagamento: null,
    status: "recebida",
    isActive: true,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

test("fines adapter normaliza envelope de lista, snake_case e paginação", async () => {
  const { adaptFinesResponse } = await import("../src/modules/fleet/fines/fines.adapter");

  const data = adaptFinesResponse({
    data: {
      items: [
        {
          id: "fine-1",
          vehicle_id: "veh-1",
          driver_id: "usr-9",
          numero_auto: "AI-2026-12345",
          data_infracao: "2026-06-12",
          orgao: "DER-SP",
          descricao: "Excesso de velocidade",
          valor: 195.23,
          pontos: 4,
          prazo_recurso: "2026-07-01",
          prazo_pagamento: "2026-07-15",
          status: "em_recurso",
          is_active: true,
          created_at: "2026-06-11T08:30:00.000Z",
        },
        { id: "", vehicle_id: "veh-x", numero_auto: "sem id" },
        { id: "fine-2", vehicle_id: "veh-2" }, // sem numero_auto → descartada
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  });

  assert.equal(data.items.length, 1); // linhas sem id/numero_auto são descartadas
  assert.equal(data.source, "api");
  const fine = data.items[0];
  assert.equal(fine.vehicleId, "veh-1");
  assert.equal(fine.driverId, "usr-9");
  assert.equal(fine.numeroAuto, "AI-2026-12345");
  assert.equal(fine.orgao, "DER-SP");
  assert.equal(fine.valor, 195.23);
  assert.equal(fine.pontos, 4);
  assert.equal(fine.status, "em_recurso");
  assert.equal(fine.prazoRecurso, "2026-07-01");
  assert.equal(fine.prazoPagamento, "2026-07-15");
  assert.equal(data.pagination.total, 1);
});

test("fines adapter: rótulos/tons de situação PT-BR + transições válidas (Cancelar admin-only)", async () => {
  const { getFineStatusLabel, getFineStatusTone, getValidFineTransitions, isFinalStatus, FINE_STATUS_OPTIONS } = await import(
    "../src/modules/fleet/fines/fines.adapter"
  );

  assert.equal(getFineStatusLabel("recebida"), "Recebida");
  assert.equal(getFineStatusLabel("em_recurso"), "Em recurso");
  assert.equal(getFineStatusLabel("deferida"), "Deferida");
  assert.equal(getFineStatusLabel("indeferida"), "Indeferida");
  assert.equal(getFineStatusLabel("paga"), "Paga");
  assert.equal(getFineStatusLabel("cancelada"), "Cancelada");

  assert.equal(getFineStatusTone("recebida"), "default");
  assert.equal(getFineStatusTone("em_recurso"), "warning");
  assert.equal(getFineStatusTone("deferida"), "success");
  assert.equal(getFineStatusTone("indeferida"), "danger");
  assert.equal(getFineStatusTone("paga"), "success");
  assert.equal(getFineStatusTone("cancelada"), "audit");

  // Só as próximas situações válidas são oferecidas (com Cancelar para admin).
  assert.deepEqual(getValidFineTransitions("recebida").map((t) => t.to), ["em_recurso", "paga", "cancelada"]);
  assert.deepEqual(getValidFineTransitions("em_recurso").map((t) => t.to), ["deferida", "indeferida", "cancelada"]);
  assert.deepEqual(getValidFineTransitions("indeferida").map((t) => t.to), ["paga", "cancelada"]);
  assert.equal(getValidFineTransitions("deferida").length, 0);
  assert.equal(getValidFineTransitions("paga").length, 0);
  assert.equal(getValidFineTransitions("cancelada").length, 0);

  // Sem admin: nenhuma transição de cancelamento é oferecida.
  assert.deepEqual(getValidFineTransitions("recebida", false).map((t) => t.to), ["em_recurso", "paga"]);
  assert.ok(getValidFineTransitions("recebida", false).every((t) => t.kind !== "cancel"));

  assert.equal(isFinalStatus("paga"), true);
  assert.equal(isFinalStatus("deferida"), true);
  assert.equal(isFinalStatus("cancelada"), true);
  assert.equal(isFinalStatus("recebida"), false);
  assert.equal(isFinalStatus("indeferida"), false);

  assert.equal(FINE_STATUS_OPTIONS.length, 6);
});

test("fines adapter: coloração de prazo (≤7d aviso, vencido perigo, neutro; final não pressiona)", async () => {
  const { formatDeadline } = await import("../src/modules/fleet/fines/fines.adapter");
  const now = new Date("2026-07-10T09:00:00.000Z");

  // Dentro de 7 dias → aviso (warning), com rótulo acessível.
  const soon = formatDeadline("2026-07-15", "recebida", now);
  assert.equal(soon.tone, "warning");
  assert.equal(soon.hasDate, true);
  assert.match(soon.date, /2026/);
  assert.match(soon.label, /Vence em 5 dia/);

  // Vencido em multa não-final → perigo (danger).
  const overdue = formatDeadline("2026-07-05", "em_recurso", now);
  assert.equal(overdue.tone, "danger");
  assert.match(overdue.label, /Vencido há 5 dia/);

  // Prazo distante → neutro (default).
  const far = formatDeadline("2026-08-30", "recebida", now);
  assert.equal(far.tone, "default");
  assert.equal(far.label, "No prazo");

  // Situação final: prazo vencido não fica vermelho (histórico, tom neutro).
  const finalOverdue = formatDeadline("2026-07-05", "paga", now);
  assert.equal(finalOverdue.tone, "default");

  // Sem prazo → neutro, sem data.
  const none = formatDeadline(null, "recebida", now);
  assert.equal(none.hasDate, false);
  assert.equal(none.tone, "default");
  assert.equal(none.date, "—");
});

test("fines adapter: valor BRL / pontos / data pt-BR e '—' para nulos", async () => {
  const { formatValor, formatPontos, formatFineDate, parsePtBrNumber, parseIntStrict } = await import(
    "../src/modules/fleet/fines/fines.adapter"
  );

  assert.match(formatValor(293.47), /R\$/);
  assert.equal(formatValor(null), "—");
  assert.equal(formatValor(undefined), "—");

  assert.equal(formatPontos(7), "7");
  assert.equal(formatPontos(null), "—");

  assert.match(formatFineDate("2026-07-15"), /15\/07\/2026/);
  assert.equal(formatFineDate(null), "—");
  assert.equal(formatFineDate("not-a-date"), "—");

  assert.equal(parsePtBrNumber("1.250,00"), 1250);
  assert.equal(parsePtBrNumber("293,47"), 293.47);
  assert.equal(parsePtBrNumber(""), undefined);
  assert.equal(parseIntStrict("5"), 5);
  assert.equal(parseIntStrict("4,5"), undefined);
});

test("fines adapter: lista vazia e fonte fallback preservadas (D-007)", async () => {
  const { adaptFinesResponse } = await import("../src/modules/fleet/fines/fines.adapter");

  const data = adaptFinesResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");

  // Resposta sem itens/paginação degrada para lista vazia sem lançar.
  const bare = adaptFinesResponse(null);
  assert.equal(bare.items.length, 0);
  assert.equal(bare.pagination.total, 0);
});

test("fines adapter: filtro por situação, viatura, 'A vencer', situação lógica e busca", async () => {
  const { filterFines } = await import("../src/modules/fleet/fines/fines.adapter");
  const now = new Date("2026-07-10T09:00:00.000Z");

  const items = [
    makeFine({ id: "1", vehicleId: "A", status: "recebida", numeroAuto: "AI-1", prazoPagamento: "2026-07-12" }), // a vencer
    makeFine({ id: "2", vehicleId: "B", status: "em_recurso", numeroAuto: "AI-2", orgao: "DER-SP" }),
    makeFine({ id: "3", vehicleId: "A", status: "paga", numeroAuto: "AI-3", prazoPagamento: "2026-07-12" }), // final → não a vencer
    makeFine({ id: "4", vehicleId: "C", status: "recebida", numeroAuto: "AI-4", isActive: false }),
  ];

  // Situação (chip) recebida.
  assert.deepEqual(filterFines(items, { search: "", isActive: "all", status: "recebida", now }).map((f) => f.id), ["1", "4"]);
  // Viatura A.
  assert.deepEqual(filterFines(items, { search: "", isActive: "all", vehicleId: "A", now }).map((f) => f.id), ["1", "3"]);
  // "A vencer" (não-final com prazo ≤7d) → exclui a paga (final).
  assert.deepEqual(filterFines(items, { search: "", isActive: "all", dueSoon: true, now }).map((f) => f.id), ["1"]);
  // Situação lógica inativa.
  assert.deepEqual(filterFines(items, { search: "", isActive: "inactive", now }).map((f) => f.id), ["4"]);
  // Busca por órgão.
  assert.deepEqual(filterFines(items, { search: "der-sp", isActive: "all", now }).map((f) => f.id), ["2"]);
  // Busca pelo nome resolvido do condutor.
  const withDriver = [makeFine({ id: "5", vehicleId: "A", driverId: "usr-1", numeroAuto: "AI-5" })];
  const resolveDriverName = (id: string) => (id === "usr-1" ? "João Motorista" : undefined);
  assert.deepEqual(filterFines(withDriver, { search: "joão", isActive: "all", now, resolveDriverName }).map((f) => f.id), ["5"]);
});

test("fines adapter: totais agregados da janela (contagem, valor, a vencer ≤7d)", async () => {
  const { computeFinesTotals } = await import("../src/modules/fleet/fines/fines.adapter");
  const now = new Date("2026-07-10T09:00:00.000Z");

  const items = [
    makeFine({ id: "1", vehicleId: "A", status: "recebida", valor: 100, prazoRecurso: "2026-07-14" }), // a vencer
    makeFine({ id: "2", vehicleId: "B", status: "em_recurso", valor: 200, prazoPagamento: "2026-07-03" }), // vencido, não-final → a vencer
    makeFine({ id: "3", vehicleId: "C", status: "paga", valor: 300, prazoPagamento: "2026-07-11" }), // final → fora
    makeFine({ id: "4", vehicleId: "D", status: "recebida", valor: 50, prazoRecurso: "2026-09-01" }), // distante → fora
  ];

  const totals = computeFinesTotals(items, now);
  assert.equal(totals.count, 4);
  assert.equal(totals.totalValor, 650);
  assert.equal(totals.dueSoonCount, 2);
});

test("fines adapter: interpreta motivos de domínio (409/422/403/400) por reason e por status", async () => {
  const { interpretFineSubmitError } = await import("../src/modules/fleet/fines/fines.adapter");

  // Motivo explícito → campo/mensagem corretos.
  const duplicate = interpretFineSubmitError({ status: 409, error: { reason: "duplicate_numero_auto" } });
  assert.equal(duplicate.reason, "duplicate_numero_auto");
  assert.equal(duplicate.field, "numeroAuto");

  const invalidTransition = interpretFineSubmitError({ status: 422, reason: "invalid_status_transition" });
  assert.equal(invalidTransition.reason, "invalid_status_transition");
  assert.equal(invalidTransition.field, undefined); // só Alerta

  const cancelAdmin = interpretFineSubmitError({ status: 403, reason: "cancel_requires_admin" });
  assert.equal(cancelAdmin.reason, "cancel_requires_admin");
  assert.equal(cancelAdmin.field, undefined);

  const invalidDriver = interpretFineSubmitError({ status: 400, reason: "invalid_driver_reference" });
  assert.equal(invalidDriver.field, "driverId");

  const invalidVehicle = interpretFineSubmitError({ status: 400, reason: "invalid_vehicle_reference" });
  assert.equal(invalidVehicle.field, "vehicleId");

  // Sem motivo explícito, infere pelo status + contexto.
  assert.equal(interpretFineSubmitError({ status: 409 }, "form").reason, "duplicate_numero_auto");
  assert.equal(interpretFineSubmitError({ status: 422 }, "transition").reason, "invalid_status_transition");
  assert.equal(interpretFineSubmitError({ status: 403 }, "transition").reason, "cancel_requires_admin");
  // 400 sem motivo é ambíguo (condutor × viatura) → Alerta genérico, sem campo.
  assert.equal(interpretFineSubmitError({ status: 400 }, "form").field, undefined);

  // Erro genérico preserva a mensagem.
  const generic = interpretFineSubmitError(new Error("Falha genérica"));
  assert.equal(generic.field, undefined);
  assert.equal(generic.message, "Falha genérica");
});

test("fines adapter: validação de campos obrigatórios e opcionais", async () => {
  const { validateFine } = await import("../src/modules/fleet/fines/fines.adapter");

  const errors = validateFine({ vehicleId: "", numeroAuto: "", orgao: "", dataInfracao: "", pontos: 1.5 });
  const fields = errors.map((e) => e.field);
  assert.ok(fields.includes("vehicleId"));
  assert.ok(fields.includes("numeroAuto"));
  assert.ok(fields.includes("orgao"));
  assert.ok(fields.includes("dataInfracao"));
  assert.ok(fields.includes("valor")); // valor ausente é obrigatório
  assert.ok(fields.includes("pontos")); // pontos não-inteiro

  // Rascunho completo e válido não gera erros.
  assert.equal(
    validateFine({
      vehicleId: "veh-1",
      numeroAuto: "AI-1",
      orgao: "DETRAN-SP",
      dataInfracao: "2026-06-10",
      valor: 293.47,
      pontos: 5,
      prazoRecurso: "2026-07-01",
      prazoPagamento: "2026-07-15",
    }).length,
    0,
  );
});
