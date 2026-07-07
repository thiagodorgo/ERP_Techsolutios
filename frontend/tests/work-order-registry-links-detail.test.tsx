import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { adaptWorkOrderRegistryLinks, adaptWorkOrderResponse } from "../src/modules/work-orders/work-orders.adapter";
import { WorkOrderRegistryLinksCard } from "../src/modules/work-orders/components/WorkOrderRegistryLinksCard";
import type { WorkOrderDetail } from "../src/modules/work-orders/work-orders.types";

// --- Unit: adaptWorkOrderRegistryLinks (C2 Detalhe de OS enriquecido) ---

test("adaptWorkOrderRegistryLinks resolve todos os vínculos presentes (camel + snake)", () => {
  const links = adaptWorkOrderRegistryLinks({
    customer: { id: "cus-1", name: "Atlas Refrigeração", isActive: true },
    vehicle: { id: "veh-1", plate: "ABC-1D23", model: "Iveco Daily" },
    team: { id: "team-1", name: "Equipe Norte" },
    // snake_case tolerado tanto no wrapper quanto nos campos internos
    service_catalog: { id: "svc-1", name: "Reboque leve", base_price: 320 },
  });

  assert.ok(links);
  assert.deepEqual(links.customer, { id: "cus-1", name: "Atlas Refrigeração", isActive: true });
  assert.deepEqual(links.vehicle, { id: "veh-1", plate: "ABC-1D23", model: "Iveco Daily" });
  assert.deepEqual(links.team, { id: "team-1", name: "Equipe Norte" });
  assert.deepEqual(links.serviceCatalog, { id: "svc-1", name: "Reboque leve", basePrice: 320 });
});

test("adaptWorkOrderRegistryLinks aceita vínculos ausentes (todos null)", () => {
  const links = adaptWorkOrderRegistryLinks({ customer: null, vehicle: null, team: null, serviceCatalog: null });
  assert.deepEqual(links, { customer: null, vehicle: null, team: null, serviceCatalog: null });

  // `links` inexistente => null (OS antiga / backend sem C2).
  assert.equal(adaptWorkOrderRegistryLinks(undefined), null);
  assert.equal(adaptWorkOrderRegistryLinks(null), null);
});

test("adaptWorkOrderRegistryLinks é parcial e ignora registros sem identificador humano", () => {
  const links = adaptWorkOrderRegistryLinks({
    customer: { id: "cus-9", name: "Cliente Único" }, // isActive ausente => default true
    vehicle: { id: "veh-9" }, // sem placa => descartado (nunca expõe UUID cru)
    team: { name: "Sem id" }, // sem id => descartado
    serviceCatalog: { id: "svc-9", name: "Serviço Sem Preço" }, // basePrice ausente => null
  });

  assert.ok(links);
  assert.deepEqual(links.customer, { id: "cus-9", name: "Cliente Único", isActive: true });
  assert.equal(links.vehicle, null);
  assert.equal(links.team, null);
  assert.deepEqual(links.serviceCatalog, { id: "svc-9", name: "Serviço Sem Preço", basePrice: null });
});

test("adaptWorkOrderResponse anexa links ao detalhe e cliente inativo é preservado", () => {
  const detail = adaptWorkOrderResponse({
    data: {
      id: "wo-1",
      code: "OS-1",
      title: "Coleta",
      status: "open",
      priority: "high",
      customer_name: "Atlas",
      links: {
        customer: { id: "cus-1", name: "Atlas Refrigeração", is_active: false },
        vehicle: { id: "veh-1", plate: "ABC-1D23", model: "Iveco Daily" },
        team: { id: "team-1", name: "Equipe Norte" },
        serviceCatalog: { id: "svc-1", name: "Reboque leve", basePrice: 320 },
      },
    },
  });

  assert.ok(detail);
  assert.equal(detail.links?.customer?.isActive, false);
  assert.equal(detail.links?.vehicle?.plate, "ABC-1D23");
});

// --- SSR: a seção "Cadastros vinculados" renderiza snapshot + vínculos ---

const seededDetail: WorkOrderDetail = {
  id: "11111111-1111-4111-8111-000000000001",
  code: "OS-000101",
  title: "Coleta de veículo",
  status: "open",
  priority: "high",
  customerName: "Atlas Refrigeração",
  customerDocument: "12.345.678/0001-90",
  customerPhone: "+55 41 99999-0101",
  createdAt: "2026-06-09T11:20:00.000Z",
  links: {
    customer: { id: "11111111-1111-4111-8111-0000000000c1", name: "Atlas Refrigeração", isActive: true },
    vehicle: { id: "11111111-1111-4111-8111-0000000000v1", plate: "ABC-1D23", model: "Iveco Daily 35S14" },
    team: { id: "11111111-1111-4111-8111-0000000000t1", name: "Equipe Guincho Norte" },
    serviceCatalog: { id: "11111111-1111-4111-8111-0000000000s1", name: "Reboque leve até 20 km", basePrice: 320 },
  },
};

test("WorkOrderRegistryLinksCard renderiza a seção com snapshot do cliente e vínculos", () => {
  const html = renderToString(<WorkOrderRegistryLinksCard workOrder={seededDetail} />);

  assert.match(html, /Cadastros vinculados/);
  // Snapshot do cliente = fonte da verdade + reforço de vínculo com o cadastro.
  assert.match(html, /Atlas Refrigeração/);
  assert.match(html, /Dados no momento da criação/);
  assert.match(html, /Vinculado ao cadastro/);
  // Viatura / Equipe / Serviço resolvidos por nome/placa/valor (nunca UUID).
  assert.match(html, /ABC-1D23/);
  assert.match(html, /Iveco Daily 35S14/);
  assert.match(html, /Equipe Guincho Norte/);
  assert.match(html, /Reboque leve até 20 km/);
  assert.match(html, /R\$\s*320,00/);
  // Nenhum UUID cru vaza para a UI.
  assert.doesNotMatch(html, /0000000000c1|0000000000v1|0000000000t1|0000000000s1/);
});

test("WorkOrderRegistryLinksCard degrada para snapshot-only e sinaliza cliente inativo", () => {
  const inactiveLinked: WorkOrderDetail = {
    ...seededDetail,
    links: {
      customer: { id: "cus-x", name: "Atlas Refrigeração", isActive: false },
      vehicle: null,
      team: null,
      serviceCatalog: null,
    },
  };
  const html = renderToString(<WorkOrderRegistryLinksCard workOrder={inactiveLinked} />);
  assert.match(html, /Cadastro inativo/);
  assert.match(html, /Sem viatura vinculada/);
  assert.match(html, /Sem equipe vinculada/);
  assert.match(html, /Sem serviço vinculado/);

  // Sem links (OS antiga): snapshot segue visível, sem chip de vínculo.
  const noLinks: WorkOrderDetail = { ...seededDetail, links: null };
  const bare = renderToString(<WorkOrderRegistryLinksCard workOrder={noLinks} />);
  assert.match(bare, /Atlas Refrigeração/);
  assert.match(bare, /Sem viatura vinculada/);
  assert.doesNotMatch(bare, /Vinculado ao cadastro/);

  // Sem snapshot e sem vínculo: affordance vazia.
  const empty: WorkOrderDetail = {
    id: "wo-empty",
    code: "OS-EMPTY",
    title: "Sem cadastro",
    status: "open",
    priority: "low",
    createdAt: "2026-06-09T11:20:00.000Z",
    links: null,
  };
  const emptyHtml = renderToString(<WorkOrderRegistryLinksCard workOrder={empty} />);
  assert.match(emptyHtml, /Sem cliente vinculado/);
});
