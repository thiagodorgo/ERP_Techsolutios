import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptWorkOrderChecklistSet,
  adaptWorkOrderResponse,
  adaptWorkOrdersResponse,
  adaptWorkOrderTimelineResponse,
  calculateWorkOrdersSummary,
  filterWorkOrders,
  getWorkOrderChecklistLinkKey,
  getWorkOrderChecklistRoleLabel,
  getWorkOrderChecklistSourceLabel,
  validateWorkOrderForm,
} from "../src/modules/work-orders/work-orders.adapter";

test("work orders adapter tolera snake_case e camelCase", () => {
  const data = adaptWorkOrdersResponse({
    items: [
      {
        id: "wo-1",
        code: "OS-1",
        title: "Atendimento",
        status: "open",
        priority: "urgent",
        customer_name: "Cliente A",
        service_address: "Rua A",
        assigned_operator_id: "operator-1",
        scheduled_for: "2026-06-09T12:00:00.000Z",
        created_at: "2026-06-09T10:00:00.000Z",
      },
      {
        id: "wo-2",
        code: "OS-2",
        title: "Entrega",
        status: "completed",
        priority: "low",
        customerName: "Cliente B",
        createdAt: "2026-06-09T11:00:00.000Z",
      },
    ],
    pagination: { limit: 20, offset: 0, total: 2 },
  });

  assert.equal(data.items.length, 2);
  assert.equal(data.items[0].customerName, "Cliente A");
  assert.equal(data.items[0].assignedOperatorId, "operator-1");
  assert.equal(data.pagination.total, 2);
  assert.equal(calculateWorkOrdersSummary(data.items).urgent, 1);
});

test("work orders filtros aplicam status, prioridade e busca", () => {
  const data = adaptWorkOrdersResponse({
    items: [
      { id: "wo-1", code: "OS-1", title: "Coleta", status: "open", priority: "urgent", customerName: "Atlas", createdAt: "2026-06-09T10:00:00.000Z" },
      { id: "wo-2", code: "OS-2", title: "Entrega", status: "completed", priority: "low", customerName: "Beta", createdAt: "2026-06-09T11:00:00.000Z" },
    ],
  });

  const filtered = filterWorkOrders(data.items, {
    search: "atlas",
    status: "open",
    priority: "urgent",
    assignedOperatorId: "",
    from: "",
    to: "",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].code, "OS-1");
});

test("work orders timeline e formulario validam contrato", () => {
  const timeline = adaptWorkOrderTimelineResponse({
    data: [
      {
        id: "event-1",
        event_type: "work_order_created",
        message: "Criada",
        created_at: "2026-06-09T10:00:00.000Z",
      },
    ],
  });

  assert.equal(timeline[0].eventType, "work_order_created");
  assert.deepEqual(
    validateWorkOrderForm({ title: "", priority: "", serviceLatitude: "-91", serviceLongitude: "10", scheduledFor: "" }),
    ["Titulo obrigatorio.", "Prioridade obrigatoria.", "Latitude invalida."],
  );
});

// --- CHECKLIST P1 PR-04c-A — o conjunto de vistorias no adapter (§12.1 do plano) ---

test("04c-A: adapter lê o conjunto de vistorias do detalhe, camel/snake, ordenado pela fila", () => {
  const detail = adaptWorkOrderResponse({
    data: {
      id: "wo-1",
      code: "OS-1",
      title: "Reboque",
      status: "open",
      priority: "high",
      createdAt: "2026-06-09T10:00:00.000Z",
      checklist_id: "chk-coleta",
      checklists: [
        { checklist_id: "chk-entrega", role: "delivery", source: "manual", rule_id: null, order_index: 1 },
        { checklistId: "chk-coleta", role: "collection", source: "resolved", ruleId: "rule-1", orderIndex: 0 },
      ],
    },
  });

  assert.deepEqual(detail?.checklists, [
    { checklistId: "chk-coleta", role: "collection", source: "resolved", ruleId: "rule-1", orderIndex: 0 },
    { checklistId: "chk-entrega", role: "delivery", source: "manual", ruleId: null, orderIndex: 1 },
  ]);
  // O espelho legado continua exatamente onde estava (aditividade do DTO): é a vistoria PRIMÁRIA.
  assert.equal(detail?.checklistId, "chk-coleta");
});

test("04c-A (D-007): chave `checklists` AUSENTE vira undefined — nunca um conjunto vazio fabricado", () => {
  const detail = adaptWorkOrderResponse({
    data: { id: "wo-2", code: "OS-2", title: "Reboque", status: "open", priority: "low", createdAt: "2026-06-09T10:00:00.000Z", checklist_id: "chk-legado" },
  });

  // `undefined` = "o servidor não informou" (ordem legada / DTO de lista). Se isto virasse `[]`, a tela leria
  // "sem vistoria" numa ordem que TEM vistoria — o sumiço silencioso que este bloco existe para acabar.
  assert.equal(detail?.checklists, undefined);
  assert.equal(detail?.checklistId, "chk-legado");
  // E um array vazio de verdade continua sendo array vazio: os dois casos não se confundem.
  assert.deepEqual(adaptWorkOrderChecklistSet([]), []);
});

test("04c-A: etapa/origem desconhecidas viram null (a linha sobrevive); linha sem modelo é descartada", () => {
  const links = adaptWorkOrderChecklistSet([
    { checklistId: "chk-futuro", role: "custody_yard", source: "carimbada", orderIndex: 0 },
    { role: "collection", source: "manual", orderIndex: 1 },
  ]);

  assert.equal(links?.length, 1);
  assert.equal(links?.[0].checklistId, "chk-futuro");
  assert.equal(links?.[0].role, null);
  assert.equal(links?.[0].source, null);
});

test("04c-A (§3): os rótulos do conjunto são PT-BR de negócio; sem etapa, o rótulo não inventa uma", () => {
  assert.equal(getWorkOrderChecklistRoleLabel("collection"), "Vistoria de coleta");
  assert.equal(getWorkOrderChecklistRoleLabel("delivery"), "Vistoria de entrega");
  assert.equal(getWorkOrderChecklistRoleLabel("generic"), "Vistoria geral");
  assert.equal(getWorkOrderChecklistRoleLabel(null), "Vistoria");
  assert.equal(getWorkOrderChecklistSourceLabel("resolved"), "definida por regra");
  // `manual` é o BALDE DO RESTO (override, ajuste, cópia do duplicate, visão sintética da ordem legada), e o
  // CHECK biconditional do banco só garante uma coisa sobre ele: NÃO há regra registrada. O rótulo diz isso e
  // para por aí — "adicionada manualmente" afirmaria autoria humana que nenhum desses casos prova.
  assert.equal(getWorkOrderChecklistSourceLabel("manual"), "sem regra registrada");
  assert.doesNotMatch(getWorkOrderChecklistSourceLabel("manual") ?? "", /manualmente|à mão/i);
  assert.equal(getWorkOrderChecklistSourceLabel(null), null);
});

test("04c-A (chave de lista): o DTO não manda o id da linha, e a chave composta não colide em etapa nova", () => {
  // O eixo de etapas VAI crescer; este build normaliza `custody_field`/`custody_yard` para `null`. Duas linhas
  // do MESMO modelo nessas duas etapas precisam de chaves distintas — senão React reconcilia duas vistorias
  // diferentes como se fossem a mesma.
  const desconhecidas = adaptWorkOrderChecklistSet([
    { checklistId: "chk-custodia", role: "custody_field", source: "manual", orderIndex: 0 },
    { checklistId: "chk-custodia", role: "custody_yard", source: "manual", orderIndex: 1 },
  ]) ?? [];

  assert.equal(desconhecidas.length, 2);
  const chaves = desconhecidas.map((link, index) => getWorkOrderChecklistLinkKey(link, index));
  assert.equal(new Set(chaves).size, 2, `chave duplicada: ${chaves.join(" | ")}`);

  // Etapa conhecida → chave é a identidade do domínio `(modelo, etapa)`, estável e independente da posição.
  assert.equal(getWorkOrderChecklistLinkKey({ checklistId: "chk-a", role: "collection" }, 0), "chk-a:collection");
  assert.equal(getWorkOrderChecklistLinkKey({ checklistId: "chk-a", role: "collection" }, 7), "chk-a:collection");
  // Modelos distintos na mesma posição também não colidem.
  assert.notEqual(
    getWorkOrderChecklistLinkKey({ checklistId: "chk-a", role: null }, 0),
    getWorkOrderChecklistLinkKey({ checklistId: "chk-b", role: null }, 0),
  );
});
