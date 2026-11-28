import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { NewOrganizationDialog, NewOrganizationResultView, pendingProvisioningSteps } from "../src/modules/platform/components/NewOrganizationDialog";
import { PlatformTenantsView } from "../src/modules/platform/pages/PlatformTenantsPage";
import { composePlatformOrganizations } from "../src/modules/platform/platform-organizations.state";
import { createPlatformTenant } from "../src/modules/platform/platform.service";
import type { CreatePlatformOrganizationResult, PlatformCatalogPlan, PlatformEconomicGroup } from "../src/modules/platform/platform.types";
import { ORGANIZATION_A, jsonResponse } from "./helpers/plat-org.fixture";
import { elements, installMiniDom, propsOf, text } from "./helpers/mini-dom";

const dom = installMiniDom();

const groups: PlatformEconomicGroup[] = [{ id: "group-1", name: "Grupo Norte", memberCount: 2 }];
const plans: PlatformCatalogPlan[] = [{ id: "plan-1", code: "business", name: "Plano Regional Teste", active: true, currentVersion: { version: 3, validFrom: "2026-11-01" } }];
const profile = { complete: false, missing: ["email"], legalName: "Empresa Existente", document: "00000000000191", email: null, address: { postalCode: null, street: null, number: null, district: null, city: null, cityIbge: null, state: null }, paymentMethod: "pix" } as const;
const result: CreatePlatformOrganizationResult = {
  organization: ORGANIZATION_A,
  provisioning: { group: { status: "done" }, profile: { status: "skipped" }, subscription: { status: "skipped" }, admin: { status: "skipped" } },
};

const settle = async () => {
  for (let step = 0; step < 8; step += 1) await React.act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
};

const button = (container: ReturnType<typeof dom.doc.createElement>, label: string) => elements(container, (element) => element.localName === "button" && text(element) === label)[0];

async function mountFt7(permissions: readonly string[], fetchImpl: typeof fetch) {
  const { createRoot } = await import("react-dom/client");
  globalThis.fetch = fetchImpl;
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await React.act(async () => root.render(<NewOrganizationResultView result={result} onClose={() => undefined} permissions={permissions} />));
  await settle();
  return {
    container,
    unmount: async () => {
      await React.act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

test("FT1/FT2 diálogo tem quatro passos e torna grupo obrigatório sem pedir slug", () => {
  const html = renderToString(<NewOrganizationDialog onClose={() => undefined} onCreated={() => undefined} groups={groups} plans={plans} />);
  assert.match(html, /class="ui-steps"/);
  assert.match(html, /Etapa 1 de 4 · Grupo \(matriz\)/);
  assert.match(html, /Etapa 2 de 4 · Filial/);
  assert.match(html, /Etapa 3 de 4 · Plano/);
  assert.match(html, /Etapa 4 de 4 · Administrador/);
  assert.match(html, /Grupo Norte/);
  assert.doesNotMatch(html, /slug|papéis|roles/i);
});

test("FT8 Alterar fica desligado durante o envio e não troca o passo corrente", async () => {
  const { createRoot } = await import("react-dom/client");
  const previous = globalThis.fetch;
  let finish!: (value: Response) => void;
  globalThis.fetch = (() => new Promise<Response>((resolve) => { finish = resolve; })) as typeof fetch;
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  const settle = async () => { for (let index = 0; index < 5; index += 1) await React.act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); };
  try {
    await React.act(async () => root.render(<NewOrganizationDialog onClose={() => undefined} onCreated={() => undefined} groups={groups} plans={plans} />));
    const select = elements(container, (element) => element.localName === "select")[0];
    const organizationName = elements(container, (element) => element.localName === "input" && propsOf(element).className === "ui-input")[0];
    assert.ok(select && organizationName);
    await React.act(async () => {
      (propsOf(select).onChange as (event: { currentTarget: { value: string } }) => void)({ currentTarget: { value: "group-1" } });
      (propsOf(organizationName).onChange as (event: { currentTarget: { value: string } }) => void)({ currentTarget: { value: "Filial Norte" } });
    });
    for (let index = 0; index < 3; index += 1) {
      const next = elements(container, (element) => element.localName === "button" && text(element) === "Continuar")[0];
      assert.ok(next);
      await React.act(async () => (propsOf(next).onClick as () => void)());
    }
    const create = elements(container, (element) => element.localName === "button" && text(element) === "Criar organização")[0];
    assert.ok(create);
    await React.act(async () => (propsOf(create).onClick as () => void)());
    await settle();
    const alter = elements(container, (element) => element.localName === "button" && text(element) === "Alterar")[0];
    assert.ok(alter);
    assert.equal(propsOf(alter).disabled, true);
    await React.act(async () => (propsOf(alter).onClick as () => void)());
    assert.match(text(elements(container, (element) => element.getAttribute("aria-current") === "step")[0]!), /Etapa 4 de 4/);
    finish(jsonResponse({ data: { organization: ORGANIZATION_A, provisioning: { group: { status: "done" }, profile: { status: "skipped" }, subscription: { status: "skipped" }, admin: { status: "skipped" } } } }));
    await settle();
  } finally {
    globalThis.fetch = previous;
    await React.act(async () => root.unmount());
    dom.doc.body.removeChild(container);
  }
});

test("FT2 grupo e nome chegam ao POST real, sem slug ou roles", async () => {
  const calls: { method?: string; body?: Record<string, unknown> }[] = [];
  const previous = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return jsonResponse({ data: { organization: ORGANIZATION_A, provisioning: { group: { status: "done" }, profile: { status: "skipped" }, subscription: { status: "skipped" }, admin: { status: "skipped" } } } });
  }) as typeof fetch;
  try { await createPlatformTenant({ name: "Filial Norte", group: { id: "group-1" } }); }
  finally { globalThis.fetch = previous; }
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, "POST");
  assert.deepEqual(calls[0]?.body, { name: "Filial Norte", group: { id: "group-1" } });
  assert.equal("slug" in (calls[0]?.body ?? {}), false);
  assert.equal("roles" in (calls[0]?.body ?? {}), false);
});

test("FT3 resultado parcial lista somente complementos específicos e nunca recria", () => {
  const result: CreatePlatformOrganizationResult = {
    organization: ORGANIZATION_A,
    provisioning: { group: { status: "done" }, profile: { status: "failed" }, subscription: { status: "skipped" }, admin: { status: "failed" } },
  };
  assert.deepEqual(pendingProvisioningSteps(result), ["profile", "subscription", "admin"]);
});

test("FT5/FT6 nomes literais e papel Administrador aparecem; códigos não vazam", () => {
  const html = renderToString(<NewOrganizationDialog onClose={() => undefined} onCreated={() => undefined} groups={groups} plans={plans} />);
  assert.match(html, /Plano Regional Teste/);
  assert.match(html, /Administrador/);
  assert.doesNotMatch(html, />business<|tenant_admin|Usuário genérico/);
});

test("FT7-plano abre o complemento do plano pela tela real e relê o setup", async () => {
  let tenantGets = 0;
  const page = await mountFt7(["platform:billing:read", "platform:billing:manage"], (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (method === "GET" && url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}`)) { tenantGets += 1; return jsonResponse({ data: ORGANIZATION_A }); }
    if (method === "GET" && url.endsWith("/subscription")) return jsonResponse({ data: null });
    if (method === "GET" && url.endsWith("/platform/billing/plans")) return jsonResponse({ data: plans });
    if (method === "PUT" && url.endsWith("/subscription")) return jsonResponse({ data: {} });
    return jsonResponse({ error: { code: "sem_fixture" } }, 599);
  }) as typeof fetch);
  try {
    const open = button(page.container, "Escolher plano");
    assert.ok(open, "a permissão de cobrança oferece Escolher plano");
    await React.act(async () => open.click()); await settle();
    assert.match(text(page.container), /Escolher plano · Organização A/);
    assert.doesNotMatch(text(page.container), /Dados da empresa ·|Criar administrador em/);
    const select = elements(page.container, (element) => element.localName === "select")[0];
    assert.ok(select);
    await React.act(async () => (propsOf(select).onChange as (event: { currentTarget: { value: string } }) => void)({ currentTarget: { value: "business" } }));
    await settle();
    await React.act(async () => button(page.container, "Ligar o plano").click()); await settle();
    assert.equal(tenantGets, 2, "o setup é relido depois de ligar o plano");
  } finally { await page.unmount(); }
});

test("FT7-perfil abre o complemento dos dados pela tela real e relê o setup", async () => {
  let tenantGets = 0;
  const page = await mountFt7(["platform:billing:read", "platform:billing:manage"], (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (method === "GET" && url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}`)) { tenantGets += 1; return jsonResponse({ data: ORGANIZATION_A }); }
    if (url.endsWith("/billing-profile") && method === "GET") return jsonResponse({ data: profile });
    if (url.endsWith("/billing-profile") && method === "PUT") return jsonResponse({ data: { ...profile, complete: true, missing: [] } });
    return jsonResponse({ error: { code: "sem_fixture" } }, 599);
  }) as typeof fetch);
  try {
    const open = button(page.container, "Preencher");
    assert.ok(open, "as permissões de leitura e gestão oferecem Preencher");
    await React.act(async () => open.click()); await settle();
    assert.match(text(page.container), /Dados da empresa · Organização A/);
    assert.doesNotMatch(text(page.container), /Escolher plano ·|Criar administrador em/);
    await React.act(async () => button(page.container, "Salvar dados da empresa").click()); await settle();
    assert.equal(tenantGets, 2, "o setup é relido depois de salvar os dados");
  } finally { await page.unmount(); }
});

test("FT7-admin abre o complemento do administrador pela tela real e relê o setup", async () => {
  let tenantGets = 0;
  const page = await mountFt7(["platform:users:create_admin"], (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (method === "GET" && url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}`)) { tenantGets += 1; return jsonResponse({ data: ORGANIZATION_A }); }
    if (method === "POST" && url.endsWith("/admin-user")) return jsonResponse({ data: { user: { id: "u1", name: "Administrador Teste", email: "admin@example.invalid" } } });
    return jsonResponse({ error: { code: "sem_fixture" } }, 599);
  }) as typeof fetch);
  try {
    const open = button(page.container, "Criar administrador");
    assert.ok(open, "a permissão de criar administrador oferece a ação");
    await React.act(async () => open.click()); await settle();
    assert.match(text(page.container), /Criar administrador em Organização A/);
    assert.doesNotMatch(text(page.container), /Escolher plano ·|Dados da empresa ·/);
    const inputs = elements(page.container, (element) => element.localName === "input");
    await React.act(async () => {
      (propsOf(inputs[0]!).onChange as (event: { currentTarget: { value: string } }) => void)({ currentTarget: { value: "Administrador Teste" } });
      (propsOf(inputs[1]!).onChange as (event: { currentTarget: { value: string } }) => void)({ currentTarget: { value: "admin@example.invalid" } });
    });
    await settle();
    await React.act(async () => button(page.container, "Criar administrador").click()); await settle();
    assert.equal(tenantGets, 2, "o setup é relido depois de criar o administrador");
  } finally { await page.unmount(); }
});

test("FT4 senha efêmera copia no clique e não reaparece ao reabrir", async () => {
  const copied: string[] = [];
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent: "node", clipboard: { writeText: async (value: string) => { copied.push(value); } } } });
  const { createRoot } = await import("react-dom/client");
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  const result: CreatePlatformOrganizationResult = { organization: ORGANIZATION_A, provisioning: { group: { status: "done" }, profile: { status: "skipped" }, subscription: { status: "skipped" }, admin: { status: "done" } }, temporaryPassword: "Unica-9x!" };
  await React.act(async () => root.render(<NewOrganizationResultView result={result} onClose={() => undefined} />));
  const copy = elements(container, (element) => element.localName === "button" && text(element) === "Copiar")[0];
  assert.ok(copy);
  await React.act(async () => { await (propsOf(copy).onClick as () => Promise<void>)(); });
  assert.deepEqual(copied, ["Unica-9x!"]);
  assert.match(text(container), /Copiada/);
  assert.equal([...dom.storage.values()].some((value) => value.includes("Unica-9x!")), false);
  await React.act(async () => root.unmount());
  dom.doc.body.removeChild(container);
  const reopened = renderToString(<NewOrganizationDialog onClose={() => undefined} onCreated={() => undefined} groups={groups} plans={plans} />);
  assert.doesNotMatch(reopened, /Unica-9x!/);
});

test("FT1 cabeçalho abre criação somente quando a permissão foi concedida", async () => {
  const { createRoot } = await import("react-dom/client");
  const container = dom.doc.createElement("div"); dom.doc.body.appendChild(container); const root = createRoot(container as unknown as Element);
  const rows = composePlatformOrganizations([ORGANIZATION_A], { activeOrgs: 1, totalOrgs: 1, totalUsers: 0, orgs: [], source: "api", forbidden: false, stale: false });
  let opens = 0;
  await React.act(async () => root.render(<MemoryRouter><PlatformTenantsView rows={rows} canCreate onCreate={() => { opens += 1; }} /></MemoryRouter>));
  const button = elements(container, (element) => element.localName === "button" && text(element).includes("Nova organização"))[0];
  assert.ok(button);
  await React.act(async () => (propsOf(button).onClick as () => void)());
  assert.equal(opens, 1);
  await React.act(async () => root.render(<MemoryRouter><PlatformTenantsView rows={rows} canCreate={false} /></MemoryRouter>));
  assert.equal(elements(container, (element) => element.localName === "button" && text(element).includes("Nova organização")).length, 0);
  await React.act(async () => root.unmount()); dom.doc.body.removeChild(container);
});
