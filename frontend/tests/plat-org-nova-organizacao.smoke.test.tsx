import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { NewOrganizationDialog, NewOrganizationResultView, pendingProvisioningSteps } from "../src/modules/platform/components/NewOrganizationDialog";
import { OrganizationAdminDialog } from "../src/modules/platform/components/OrganizationAdminDialog";
import { OrganizationSetupDialog } from "../src/modules/platform/components/OrganizationSetupDialog";
import { PlatformTenantsView } from "../src/modules/platform/pages/PlatformTenantsPage";
import { composePlatformOrganizations } from "../src/modules/platform/platform-organizations.state";
import { createPlatformTenant, createTenantAdminUser, getPlatformBillingProfile, putPlatformBillingProfile, putPlatformSubscription } from "../src/modules/platform/platform.service";
import type { CreatePlatformOrganizationResult, PlatformCatalogPlan, PlatformEconomicGroup } from "../src/modules/platform/platform.types";
import { ORGANIZATION_A, jsonResponse } from "./helpers/plat-org.fixture";
import { elements, installMiniDom, propsOf, text } from "./helpers/mini-dom";

const dom = installMiniDom();

const groups: PlatformEconomicGroup[] = [{ id: "group-1", name: "Grupo Norte", memberCount: 2 }];
const plans: PlatformCatalogPlan[] = [{ id: "plan-1", code: "business", name: "Plano Regional Teste", active: true, currentVersion: { version: 3, validFrom: "2026-11-01" } }];

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

test("FT7 complementos separam plano, dados da empresa e administrador por ação específica", () => {
  const permissions = ["platform:billing:read", "platform:billing:manage"];
  const plan = renderToString(<OrganizationSetupDialog organization={ORGANIZATION_A} item="plan" permissions={permissions} onClose={() => undefined} onChanged={() => undefined} />);
  const profile = renderToString(<OrganizationSetupDialog organization={ORGANIZATION_A} item="profile" permissions={permissions} onClose={() => undefined} onChanged={() => undefined} />);
  const admin = renderToString(<OrganizationAdminDialog organization={ORGANIZATION_A} onClose={() => undefined} onConfirm={async () => ({ user: { id: "u1", name: "Admin", email: "admin@example.invalid" } })} onDone={() => undefined} />);
  assert.match(plan, /Escolher plano/);
  assert.match(profile, /Dados da empresa/);
  assert.match(admin, /Criar administrador/);
  assert.doesNotMatch(`${plan}${profile}${admin}`, /Criar organização|POST \/tenants/);
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

test("FT7 complemento usa somente PUT de plano/perfil e POST de administrador", async () => {
  const calls: { url: string; method?: string; body?: unknown }[] = [];
  const previous = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const url = String(input);
    if ((init?.method ?? "GET") === "GET") return jsonResponse({ data: { complete: false, missing: ["email"], legalName: "Empresa Existente", document: "123", email: null, address: { postalCode: null, street: null, number: null, district: null, city: null, cityIbge: null, state: null }, paymentMethod: "pix" } });
    if (url.endsWith("/admin-user")) return jsonResponse({ data: { user: { id: "u1", name: "Admin", email: "admin@example.invalid" }, temporaryPassword: "UmaVez" } });
    return jsonResponse({ data: { ok: true } });
  }) as typeof fetch;
  try {
    const profile = await getPlatformBillingProfile(ORGANIZATION_A.id);
    await putPlatformSubscription(ORGANIZATION_A.id, "business", "2026-11-27");
    await putPlatformBillingProfile(ORGANIZATION_A.id, { legalName: profile.legalName, document: profile.document, email: "financeiro@example.invalid", address: { ...profile.address }, paymentMethod: profile.paymentMethod });
    await createTenantAdminUser(ORGANIZATION_A.id, { name: "Admin", email: "admin@example.invalid" });
  } finally { globalThis.fetch = previous; }
  assert.deepEqual(calls.map((call) => call.method ?? "GET"), ["GET", "PUT", "PUT", "POST"]);
  assert.match(calls[1]?.url ?? "", /\/billing\/tenants\/[^/]+\/subscription$/);
  assert.match(calls[2]?.url ?? "", /\/billing\/tenants\/[^/]+\/billing-profile$/);
  assert.match(calls[3]?.url ?? "", /\/tenants\/[^/]+\/admin-user$/);
  assert.equal(calls.some((call, index) => index > 0 && call.url.endsWith("/platform/tenants")), false);
  assert.deepEqual(calls[2]?.body, { legalName: "Empresa Existente", document: "123", email: "financeiro@example.invalid", address: { postalCode: null, street: null, number: null, district: null, city: null, cityIbge: null, state: null }, paymentMethod: "pix" });
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
