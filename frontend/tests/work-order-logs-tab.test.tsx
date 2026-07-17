import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { LogsTab, humanizeAction } from "../src/modules/work-orders/components/tabs/LogsTab";

// Ω3F-8a — aba Logs (front): estados §7 (cabeçalho + carregamento no primeiro render SSR) e humanização
// PT-BR das ações. §11.2 — nunca renderiza UUID/tenant crus.

const ctx = { tenantId: "t1", token: "tok" };

test("LogsTab: cabeçalho + estado de carregamento (§7) no primeiro render (SSR)", () => {
  const html = renderToString(
    <LogsTab workOrderId="wo-1" context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.match(html, /Logs/);
  assert.match(html, /Trilha de auditoria/);
  assert.match(html, /Carregando registros de auditoria/);
});

test("LogsTab: sem termo técnico cru na UI (§11) — nada de tenant/UUID de OS", () => {
  const html = renderToString(
    <LogsTab workOrderId="11111111-1111-4111-8111-111111111111" context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.doesNotMatch(html, /tenant|Tenant/);
  // O id da OS (passado como prop) não pode aparecer renderizado na tela.
  assert.doesNotMatch(html, /11111111-1111-4111-8111-111111111111/);
});

test("humanizeAction: ações conhecidas → rótulo PT-BR acentuado", () => {
  assert.equal(humanizeAction("work_order.cancelled"), "OS cancelada");
  assert.equal(humanizeAction("work_order.comment_added"), "Comentário adicionado");
  assert.equal(humanizeAction("work_order.mileage_updated"), "Quilometragem atualizada");
});

test("humanizeAction: ação desconhecida → legível (nunca o enum cru feio)", () => {
  const label = humanizeAction("billing.invoice_sent");
  assert.equal(label, "Invoice sent");
  assert.doesNotMatch(label, /billing\.|_/);
});
