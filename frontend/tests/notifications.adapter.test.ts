import assert from "node:assert/strict";
import test from "node:test";

import type { NotificationItem } from "../src/modules/notifications/notification.types";

// Shim NÃO-destrutivo: o caminho de fetch (listNotificationsFromApi) lê getStoredToken → window.localStorage.
// Só preenche o que faltar, para não sobrescrever um window já configurado por outro teste no mesmo processo.
const g = globalThis as unknown as { window?: { localStorage?: unknown; dispatchEvent?: unknown; setTimeout?: unknown } };
g.window ??= {};
g.window.localStorage ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
g.window.dispatchEvent ??= () => true;
g.window.setTimeout ??= globalThis.setTimeout.bind(globalThis);

function makeNotification(partial: Partial<NotificationItem> & Pick<NotificationItem, "id" | "type">): NotificationItem {
  return {
    title: "Aviso",
    message: "Mensagem operacional.",
    severity: "info",
    status: "unread",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...partial,
  };
}

test("getNotificationCategory: mapeia manutenção/multas/seguros/estoque/outros por type e sourceType", async () => {
  const { getNotificationCategory, NOTIFICATION_CATEGORY_LABELS, NOTIFICATION_CATEGORY_ORDER } = await import(
    "../src/modules/notifications/notification.adapter"
  );

  // Por `type` (produtores de frota F2/F3/F4/F7).
  assert.equal(getNotificationCategory("maintenance.due"), "maintenance");
  assert.equal(getNotificationCategory("fine.due"), "fines");
  assert.equal(getNotificationCategory("insurance.renewal"), "insurance");
  assert.equal(getNotificationCategory("stock.reorder"), "stock");
  assert.equal(getNotificationCategory("inventory.low"), "stock");

  // Reforço por `sourceType` quando o `type` não é conclusivo.
  assert.equal(getNotificationCategory(undefined, "maintenance_order"), "maintenance");
  assert.equal(getNotificationCategory(undefined, "fine"), "fines");
  assert.equal(getNotificationCategory(undefined, "insurance_policy"), "insurance");
  assert.equal(getNotificationCategory(undefined, "inventory_item"), "stock");

  // Sem correspondência (checklist, sistema, acesso) → Outros; robusto a valor ausente.
  assert.equal(getNotificationCategory("checklist_run.completed", "checklist_run"), "outros");
  assert.equal(getNotificationCategory("system.critical", "system"), "outros");
  assert.equal(getNotificationCategory(undefined, undefined), "outros");
  assert.equal(getNotificationCategory(null, null), "outros");

  // Rótulos PT-BR (nunca token cru) e ordem estável dos chips.
  assert.equal(NOTIFICATION_CATEGORY_LABELS.maintenance, "Manutenção");
  assert.equal(NOTIFICATION_CATEGORY_LABELS.fines, "Multas");
  assert.equal(NOTIFICATION_CATEGORY_LABELS.insurance, "Seguros");
  assert.equal(NOTIFICATION_CATEGORY_LABELS.stock, "Estoque");
  assert.equal(NOTIFICATION_CATEGORY_LABELS.outros, "Outros");
  assert.deepEqual([...NOTIFICATION_CATEGORY_ORDER], ["maintenance", "fines", "insurance", "stock", "outros"]);
});

test("filterNotificationsByCategory: filtra por categoria e combina com a situação já carregada", async () => {
  const { filterNotificationsByCategory, isNotificationCategory } = await import(
    "../src/modules/notifications/notification.adapter"
  );

  // Janela já filtrada por situação (todas 'unread') que a Central recebe do endpoint.
  const unread: NotificationItem[] = [
    makeNotification({ id: "m1", type: "maintenance.due", sourceType: "maintenance_order" }),
    makeNotification({ id: "f1", type: "fine.due", sourceType: "fine" }),
    makeNotification({ id: "i1", type: "insurance.renewal", sourceType: "insurance_policy" }),
    makeNotification({ id: "s1", type: "stock.reorder", sourceType: "inventory_item" }),
    makeNotification({ id: "o1", type: "checklist_run.completed", sourceType: "checklist_run" }),
  ];

  // Categoria + situação: só manutenção não lida.
  assert.deepEqual(filterNotificationsByCategory(unread, "maintenance").map((n) => n.id), ["m1"]);
  assert.deepEqual(filterNotificationsByCategory(unread, "fines").map((n) => n.id), ["f1"]);
  assert.deepEqual(filterNotificationsByCategory(unread, "outros").map((n) => n.id), ["o1"]);
  // "all" devolve a janela inteira (cópia, não a mesma referência).
  const all = filterNotificationsByCategory(unread, "all");
  assert.equal(all.length, 5);
  assert.notEqual(all, unread);

  // Guarda de tipo do parâmetro de URL.
  assert.equal(isNotificationCategory("stock"), true);
  assert.equal(isNotificationCategory("nope"), false);
  assert.equal(isNotificationCategory(null), false);
});

test("parseFleetAlertsRun: lê o envelope { data: {...} } dos produtores de frota", async () => {
  const { parseFleetAlertsRun } = await import("../src/modules/notifications/notification.adapter");

  const parsed = parseFleetAlertsRun({
    data: { maintenance: 2, fines: 1, insurance: 0, reorder: 3, ranAt: "2026-07-09T12:00:00.000Z" },
  });

  assert.equal(parsed.maintenance, 2);
  assert.equal(parsed.fines, 1);
  assert.equal(parsed.insurance, 0);
  assert.equal(parsed.reorder, 3);
  assert.equal(parsed.ranAt, "2026-07-09T12:00:00.000Z");
});

test("parseFleetAlertsRun (D-007): resposta ausente/parcial/negativa degrada para zeros e ranAt null", async () => {
  const { parseFleetAlertsRun } = await import("../src/modules/notifications/notification.adapter");

  const empty = parseFleetAlertsRun(null);
  assert.deepEqual(empty, { maintenance: 0, fines: 0, insurance: 0, reorder: 0, ranAt: null });

  // Campos ausentes/ inválidos não contaminam a UI (nunca NaN, nunca negativo).
  const partial = parseFleetAlertsRun({ data: { maintenance: 4, reorder: -2, insurance: "x" } });
  assert.equal(partial.maintenance, 4);
  assert.equal(partial.fines, 0);
  assert.equal(partial.insurance, 0);
  assert.equal(partial.reorder, 0);
  assert.equal(partial.ranAt, null);
});

test("mapNotification: preserva actionUrl (camelCase e snake_case) para navegação sem link morto", async () => {
  const { listNotificationsFromApi } = await import("../src/modules/notifications/notification.adapter");

  // Sequestra o fetch global para inspecionar o mapeamento do envelope real.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [
          {
            id: "n-camel",
            type: "maintenance.due",
            title: "Manutenção vencendo",
            message: "OS de manutenção próxima do vencimento.",
            severity: "warning",
            status: "unread",
            sourceType: "maintenance_order",
            sourceId: "mo-1",
            actionUrl: "/fleet/maintenance",
          },
          {
            id: "n-snake",
            type: "fine.due",
            title: "Multa a vencer",
            message: "Prazo de pagamento próximo.",
            severity: "warning",
            status: "unread",
            source_type: "fine",
            source_id: "fine-9",
            action_url: "/fleet/fines",
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch;

  try {
    const items = await listNotificationsFromApi({ tenantId: "ten-1" });
    assert.equal(items.length, 2);
    assert.equal(items[0].actionUrl, "/fleet/maintenance");
    assert.equal(items[0].sourceType, "maintenance_order");
    assert.equal(items[1].actionUrl, "/fleet/fines");
    assert.equal(items[1].sourceType, "fine");
    assert.equal(items[1].sourceId, "fine-9");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("mock (D-007): produtores e lista só existem em modo mock; execução é idempotente e vazia", async () => {
  const { runMockFleetAlerts, listMockNotifications, resetMockNotificationsForTests } = await import(
    "../src/modules/notifications/notification.mock"
  );
  resetMockNotificationsForTests();

  const run = await runMockFleetAlerts();
  assert.equal(run.maintenance, 0);
  assert.equal(run.fines, 0);
  assert.equal(run.insurance, 0);
  assert.equal(run.reorder, 0);
  assert.equal(typeof run.ranAt, "string");

  // A lista mock não contém notificações de frota fabricadas (só eventos de checklist/sistema).
  const items = await listMockNotifications();
  assert.ok(items.length > 0);
  assert.ok(items.every((n) => !["maintenance_order", "fine", "insurance_policy", "inventory_item"].includes(n.sourceType ?? "")));
});
