import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { CommentsTab } from "../src/modules/work-orders/components/tabs/CommentsTab";

// Ω3F-5b — aba Comentários (front): estados §7 (cabeçalho + carregamento) e gating por permissão
// (Comentar exige work_orders:comment; editar/excluir por autoria OU work_orders:update).

const ctx = { tenantId: "t1", token: "tok" };

test("CommentsTab: cabeçalho + estado de carregamento (§7) no primeiro render (SSR)", () => {
  const html = renderToString(
    <CommentsTab workOrderId="wo-1" context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.match(html, /Comentários/);
  assert.match(html, /Carregando comentários/);
});

test("CommentsTab: 'Comentar' só com work_orders:comment", () => {
  const withComment = renderToString(
    <CommentsTab workOrderId="wo-1" context={ctx} permissions={["work_orders:read", "work_orders:comment"]} />,
  );
  assert.match(withComment, /Comentar/);
  assert.match(withComment, /Escreva um comentário/);

  const withoutComment = renderToString(
    <CommentsTab workOrderId="wo-1" context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.doesNotMatch(withoutComment, /Escreva um comentário/);
});

test("CommentsTab: sem termo técnico cru na UI (§11)", () => {
  const html = renderToString(
    <CommentsTab workOrderId="wo-1" context={ctx} permissions={["work_orders:read", "work_orders:comment"]} />,
  );
  assert.doesNotMatch(html, /tenant|Tenant|work_orders:comment/);
});
