import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import {
  WORK_ORDER_TABS,
  DEFAULT_TAB,
  visibleTabs,
  canAccessTab,
  resolveActiveTab,
  findTab,
} from "../src/modules/work-orders/tabs.config";
import { buildWorkOrderDeepLink, composeWhatsAppText } from "../src/modules/work-orders/work-order-share";
import { WorkOrderTabsShell } from "../src/modules/work-orders/components/WorkOrderTabsShell";
import { WorkOrderActionBar } from "../src/modules/work-orders/components/WorkOrderActionBar";
import { GeneralInfoTab } from "../src/modules/work-orders/components/tabs/GeneralInfoTab";
import type { WorkOrderDetail } from "../src/modules/work-orders/work-orders.types";

// Ω3F-1 — Hub da OS. C2 (revelação progressiva, sem "em breve"), #22 Copiar URL, #32 texto WhatsApp,
// aba na URL com fallback, §7 acesso não permitido, reuso do corpo vivo em "Informações gerais".

// --- tabs.config ---
test("WORK_ORDER_TABS: 11 abas na ordem exata da spec §1.3", () => {
  assert.equal(WORK_ORDER_TABS.length, 11);
  assert.deepEqual(
    WORK_ORDER_TABS.map((t) => t.slug),
    ["informacoes-gerais", "financeiro", "orcamento", "estoque", "comentarios", "arquivos", "mobile", "quilometragem", "base", "mapa", "logs"],
  );
});

test("C2: 9 abas visíveis (Ω3F-8b acende Mapa); base/estoque seguem ocultas", () => {
  const vis = visibleTabs();
  assert.deepEqual(vis.map((t) => t.slug), ["informacoes-gerais", "financeiro", "orcamento", "comentarios", "arquivos", "mobile", "quilometragem", "mapa", "logs"]);
  const financeiro = vis.find((t) => t.slug === "financeiro");
  assert.equal(financeiro?.label, "Financeiro");
  // A aba Financeiro é governada: exige work_order_financials:read (§7).
  assert.equal(financeiro?.requiredPermission, "work_order_financials:read");
  const orcamento = vis.find((t) => t.slug === "orcamento");
  assert.equal(orcamento?.label, "Orçamento");
  // A aba Orçamento é governada: exige service_quotes:read (§7).
  assert.equal(orcamento?.requiredPermission, "service_quotes:read");
  const comentarios = vis.find((t) => t.slug === "comentarios");
  assert.equal(comentarios?.label, "Comentários");
  // Comentários e Arquivos exigem work_orders:read (§7).
  assert.equal(comentarios?.requiredPermission, "work_orders:read");
  const arquivos = vis.find((t) => t.slug === "arquivos");
  assert.equal(arquivos?.label, "Arquivos");
  assert.equal(arquivos?.requiredPermission, "work_orders:read");
  // Ω3F-7b — Mobile e Quilometragem exigem work_orders:read (§7).
  const mobile = vis.find((t) => t.slug === "mobile");
  assert.equal(mobile?.label, "Mobile");
  assert.equal(mobile?.requiredPermission, "work_orders:read");
  const quilometragem = vis.find((t) => t.slug === "quilometragem");
  assert.equal(quilometragem?.label, "Quilometragem");
  assert.equal(quilometragem?.requiredPermission, "work_orders:read");
  // Ω3F-8b — Mapa da OS exige work_orders:read (§7).
  const mapa = vis.find((t) => t.slug === "mapa");
  assert.equal(mapa?.label, "Mapa");
  assert.equal(mapa?.requiredPermission, "work_orders:read");
  // Ω3F-8a — Logs (leitura da auditoria) exige work_orders:read (§7).
  const logs = vis.find((t) => t.slug === "logs");
  assert.equal(logs?.label, "Logs");
  assert.equal(logs?.requiredPermission, "work_orders:read");
});

test("resolveActiveTab: slug visível → ele mesmo", () => {
  assert.equal(resolveActiveTab("informacoes-gerais"), "informacoes-gerais");
  assert.equal(resolveActiveTab("financeiro"), "financeiro");
  assert.equal(resolveActiveTab("orcamento"), "orcamento");
  assert.equal(resolveActiveTab("comentarios"), "comentarios");
  assert.equal(resolveActiveTab("arquivos"), "arquivos");
  assert.equal(resolveActiveTab("mobile"), "mobile");
  assert.equal(resolveActiveTab("quilometragem"), "quilometragem");
  assert.equal(resolveActiveTab("mapa"), "mapa");
  assert.equal(resolveActiveTab("logs"), "logs");
});

test("resolveActiveTab: aba OCULTA (flag OFF) cai no default, não 404", () => {
  // base/estoque seguem ocultas (entram em blocos futuros) → fallback ao default.
  assert.equal(resolveActiveTab("base"), DEFAULT_TAB);
  assert.equal(resolveActiveTab("estoque"), DEFAULT_TAB);
});

test("resolveActiveTab: slug inexistente / nulo / vazio → default", () => {
  assert.equal(resolveActiveTab("inexistente"), DEFAULT_TAB);
  assert.equal(resolveActiveTab(null), DEFAULT_TAB);
  assert.equal(resolveActiveTab(undefined), DEFAULT_TAB);
  assert.equal(resolveActiveTab(""), DEFAULT_TAB);
});

test("canAccessTab: sem exigência sempre acessível; com exigência respeita as permissões (§7)", () => {
  const open = findTab("informacoes-gerais");
  assert.equal(canAccessTab(open, []), true);
  const restricted = { ...open, requiredPermission: "audit:read" };
  assert.equal(canAccessTab(restricted, []), false);
  assert.equal(canAccessTab(restricted, ["audit:read"]), true);
});

// --- work-order-share (#22 / #32) ---
test("buildWorkOrderDeepLink: URL com ?aba= preservando a aba corrente (#22)", () => {
  assert.equal(
    buildWorkOrderDeepLink("https://erp.exemplo.com/", "wo-1", "financeiro"),
    "https://erp.exemplo.com/work-orders/wo-1?aba=financeiro",
  );
});

test("composeWhatsAppText: protocolo + cliente + endereço (#32)", () => {
  const txt = composeWhatsAppText({
    id: "wo-1", code: "OS-000101", title: "Reboque", customerName: "Atlas",
    serviceAddress: "Rua A, 100", serviceCity: "Curitiba", serviceState: "PR", serviceZipCode: "80000-000",
  });
  assert.match(txt, /Protocolo: OS-000101 — Reboque/);
  assert.match(txt, /Cliente: Atlas/);
  assert.match(txt, /Endereço: Rua A, 100, Curitiba, PR, 80000-000/);
});

test("composeWhatsAppText: omite campos ausentes graciosamente", () => {
  const txt = composeWhatsAppText({ id: "wo-2", code: "OS-2" });
  assert.match(txt, /Protocolo: OS-2/);
  assert.doesNotMatch(txt, /Cliente:/);
  assert.doesNotMatch(txt, /Endereço:/);
});

// --- WorkOrderTabsShell (SSR) ---
test("WorkOrderTabsShell: menu só com abas visíveis; ocultas AUSENTES (C2, sem 'em breve'/PLANNED)", () => {
  const html = renderToString(
    <WorkOrderTabsShell tabs={visibleTabs()} activeTab="informacoes-gerais" onSelect={() => {}}>
      <div>conteudo-da-aba</div>
    </WorkOrderTabsShell>,
  );
  assert.match(html, /Informações gerais/);
  assert.match(html, /Financeiro/); // Ω3F-3 acendeu a aba
  assert.match(html, /Orçamento/); // Ω3F-4 acendeu a aba
  assert.match(html, /Mobile/); // Ω3F-7b acendeu a aba
  assert.match(html, /Quilometragem/); // Ω3F-7b acendeu a aba
  assert.match(html, /Mapa/); // Ω3F-8b acendeu a aba
  assert.match(html, /Logs/); // Ω3F-8a acendeu a aba
  assert.doesNotMatch(html, /Estoque/); // Estoque/Base ainda ocultas (C2)
  assert.doesNotMatch(html, /em breve|PLANNED|TODO/i);
  assert.match(html, /conteudo-da-aba/);
});

test("WorkOrderTabsShell: accessAllowed=false → 'Acesso não permitido' e conteúdo escondido (§7)", () => {
  const html = renderToString(
    <WorkOrderTabsShell tabs={visibleTabs()} activeTab="informacoes-gerais" accessAllowed={false} onSelect={() => {}}>
      <div>conteudo-restrito</div>
    </WorkOrderTabsShell>,
  );
  assert.match(html, /Acesso não permitido/);
  assert.doesNotMatch(html, /conteudo-restrito/);
});

// --- WorkOrderActionBar (SSR) ---
const actionBarWorkOrder: WorkOrderDetail = {
  id: "wo-1", code: "OS-1", title: "Reboque", status: "open", priority: "high",
  checklistId: null, createdAt: "2026-06-09T11:20:00.000Z", links: null,
};

test("WorkOrderActionBar: Copiar + Imprimir + menu ⋮ (Ω3F-6b acendeu as 3 ações reservadas)", () => {
  const html = renderToString(
    <MemoryRouter>
      <WorkOrderActionBar
        workOrder={actionBarWorkOrder}
        activeTab="informacoes-gerais"
        context={{ tenantId: "t1" }}
        permissions={["work_orders:cancel", "work_orders:create"]}
        onRefresh={() => {}}
      />
    </MemoryRouter>,
  );
  assert.match(html, /Copiar/);
  assert.match(html, /Mais ações/);
  // Imprimir fica na barra; Duplicar e Cancelar moram no ⋮ (só montam no clique) — gating coberto em
  // tests/work-order-cancel-duplicate-tab.test.tsx.
  assert.match(html, /Imprimir/);
});

// --- GeneralInfoTab (SSR) — reuso do corpo vivo ---
test("GeneralInfoTab: migra o corpo vivo (status, cliente/endereço, histórico, aprovação)", () => {
  const wo: WorkOrderDetail = {
    id: "wo-1", code: "OS-1", title: "Reboque", status: "open", priority: "high",
    customerName: "Atlas Refrigeração", serviceAddress: "Rua A", createdAt: "2026-06-09T11:20:00.000Z", links: null,
  };
  const html = renderToString(
    <MemoryRouter>
      <GeneralInfoTab workOrder={wo} timeline={[]} context={{ tenantId: "t1", permissions: [] }} canDecide={false} />
    </MemoryRouter>,
  );
  assert.match(html, /Aberta/);
  assert.match(html, /Cliente e endereço/);
  assert.match(html, /Atlas Refrigeração/);
  assert.match(html, /Histórico/);
  assert.match(html, /Aprovação operacional/);
});
