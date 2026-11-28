import assert from "node:assert/strict";
import test from "node:test";

import React, { type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { OrganizationAdminDialog } from "../src/modules/platform/components/OrganizationAdminDialog";
import { OrganizationDetailPanelView } from "../src/modules/platform/components/OrganizationDetailPanel";
import { OrganizationStatusDialog, PLATFORM_STATUS_REASONS, activeUsersInDetail } from "../src/modules/platform/components/OrganizationStatusDialog";
import { adaptPlatformTenantDetail } from "../src/modules/platform/platform-tenant-detail.adapter";
import { updatePlatformTenantStatus } from "../src/modules/platform/platform.service";
import { ApiError } from "../src/services/api/client";
import { DETAIL_A, ORGANIZATION_A, ORGANIZATION_SYSTEM, jsonResponse } from "./helpers/plat-org.fixture";
import { elements, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

const detail = { detail: DETAIL_A, source: "api" as const, forbidden: false, notFound: false };
Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } } });

test("FS1 contagem usa somente usuários ativos da leitura nova", () => {
  const adapted = adaptPlatformTenantDetail(DETAIL_A);
  assert.ok(adapted);
  assert.equal(activeUsersInDetail({ ...detail, detail: adapted }), 2);
  assert.equal(activeUsersInDetail({ ...detail, detail: { ...DETAIL_A, users: [] } }), 0);
  assert.equal(activeUsersInDetail({ detail: null, source: "fallback", forbidden: true, notFound: false }), 0);
});

test("FS1 confirmação apresenta contagem consultada, nome atual e motivo", () => {
  const html = renderToString(<OrganizationStatusDialog organization={ORGANIZATION_A} detail={detail} onClose={() => undefined} onConfirm={async () => undefined} />);
  assert.match(html.replace(/<[^>]+>|<!--.*?-->/g, ""), /Usuários ativos no cadastro consultado: 2, às \d{2}:\d{2}\./);
  assert.match(html, /Digite o nome atual/);
  assert.match(html, /Motivo/);
  assert.match(html, /impede o acesso e encerra sessões/);
  assert.match(html, /ui-button--danger/);
  assert.match(html, />Suspender</);
  assert.doesNotMatch(html, />Confirmar</);
});

test("FS1-R reativação explica a nova entrada e usa o rótulo próprio", () => {
  const suspended = { ...ORGANIZATION_A, status: "suspended" as const };
  const html = renderToString(<OrganizationStatusDialog organization={suspended} detail={detail} onClose={() => undefined} onConfirm={async () => undefined} />);
  assert.match(html, /A filial volta a funcionar: a equipe pode entrar de novo\./);
  assert.match(html, /Ninguém volta conectado:/);
  assert.doesNotMatch(html, /impede o acesso/);
  assert.match(html, />Reativar</);
});

test("FS2 enumeração e PATCH são idênticos para suspender e reativar", async () => {
  assert.deepEqual(PLATFORM_STATUS_REASONS, ["nonpayment", "customer_request", "security", "other"]);
  const calls: { url: string; method?: string; body?: unknown }[] = [];
  const previous = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return jsonResponse({ data: { ...ORGANIZATION_A, status: calls.length === 1 ? "suspended" : "active" } });
  }) as typeof fetch;
  try {
    await updatePlatformTenantStatus(ORGANIZATION_A.id, { status: "suspended", reason: "security" });
    await updatePlatformTenantStatus(ORGANIZATION_A.id, { status: "active", reason: "customer_request" });
  } finally {
    globalThis.fetch = previous;
  }
  assert.deepEqual(calls.map((call) => call.method), ["PATCH", "PATCH"]);
  assert.equal(calls.every((call) => call.url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}/status`)), true);
  assert.deepEqual(calls.map((call) => call.body), [
    { status: "suspended", reason: "security" },
    { status: "active", reason: "customer_request" },
  ]);
  assert.doesNotMatch(JSON.stringify(calls), /payment_regularized|POST/);
});

const dom = installMiniDom();
const { createRoot } = await import("react-dom/client");
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const act = (React as unknown as { act: ActFn }).act;
const settle = async () => { for (let step = 0; step < 6; step += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); };

async function mount(element: ReactElement) {
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(element));
  await settle();
  return { container, unmount: async () => { await act(async () => root.unmount()); container.parentNode?.removeChild(container); } };
}

const button = (root: MiniDomElement, label: string) => elements(root, (element) => element.localName === "button" && text(element).includes(label))[0] as MiniDomElement | undefined;

test("AD1 organização suspensa mantém Criar administrador desligado e o clique forçado não abre", async () => {
  let opens = 0;
  const suspended = { ...ORGANIZATION_A, status: "suspended" as const };
  const page = await mount(<MemoryRouter><OrganizationDetailPanelView organization={suspended} data={detail} permissions={["platform:users:create_admin"]} onAction={() => { opens += 1; }} /></MemoryRouter>);
  const admin = button(page.container, "Criar administrador");
  assert.ok(admin);
  assert.equal(propsOf(admin).disabled, true);
  assert.equal(propsOf(admin).title, "Reative a organização para criar administrador");
  await act(async () => (propsOf(admin).onClick as () => void)());
  assert.equal(opens, 0);
  await page.unmount();
});

test("AD1-b ativa com administrador mantém a ação e AD1-c sistema não oferece", () => {
  const active = renderToString(<MemoryRouter><OrganizationDetailPanelView organization={{ ...ORGANIZATION_A, setup: { complete: true, missing: [] } }} data={detail} permissions={["platform:users:create_admin"]} /></MemoryRouter>);
  assert.match(active, /Criar administrador/);
  assert.doesNotMatch(active, /disabled=""/);
  const system = renderToString(<MemoryRouter><OrganizationDetailPanelView organization={ORGANIZATION_SYSTEM} data={{ ...detail, detail: { ...DETAIL_A, id: ORGANIZATION_SYSTEM.id, name: ORGANIZATION_SYSTEM.name } }} permissions={["platform:users:create_admin"]} /></MemoryRouter>);
  assert.doesNotMatch(system, /Criar administrador/);
});

test("AD2 inactive_tenant explica que é preciso reativar", async () => {
  const page = await mount(<OrganizationAdminDialog organization={ORGANIZATION_A} onClose={() => undefined} onDone={() => undefined} onConfirm={async () => { throw new ApiError(400, "erro", undefined, "inactive_tenant"); }} />);
  const inputs = elements(page.container, (element) => element.localName === "input");
  await act(async () => {
    (propsOf(inputs[0] as MiniDomElement).onChange as (event: unknown) => void)({ currentTarget: { value: "Administrador" } });
    (propsOf(inputs[1] as MiniDomElement).onChange as (event: unknown) => void)({ currentTarget: { value: "admin@example.com" } });
  });
  await settle();
  const submit = button(page.container, "Criar administrador");
  assert.ok(submit);
  await act(async () => (propsOf(submit).onClick as () => void)());
  await settle();
  assert.match(text(page.container), /A organização não está ativa\. Reative-a para criar o administrador\./);
  await page.unmount();
});

function statusDialog(onConfirm: () => Promise<void>, onRefresh = async () => undefined): ReactElement {
  return React.createElement(OrganizationStatusDialog as unknown as React.ComponentType<Record<string, unknown>>, { organization: ORGANIZATION_A, detail, onClose: () => undefined, onConfirm, onRefresh });
}

async function fillStatusDialog(root: MiniDomElement) {
  const name = elements(root, (element) => element.localName === "input")[0] as MiniDomElement;
  const reason = elements(root, (element) => element.localName === "select")[0] as MiniDomElement;
  await act(async () => {
    (propsOf(name).onChange as (event: unknown) => void)({ currentTarget: { value: ORGANIZATION_A.name } });
    (propsOf(reason).onChange as (event: unknown) => void)({ currentTarget: { value: "security" } });
  });
  await settle();
}

test("FS4-c dois cliques sem re-render enviam um PATCH", async () => {
  let calls = 0;
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const page = await mount(statusDialog(async () => { calls += 1; await pending; }));
  await fillStatusDialog(page.container);
  const submit = button(page.container, "Suspender");
  assert.ok(submit);
  await act(async () => {
    (propsOf(submit).onClick as () => void)();
    (propsOf(submit).onClick as () => void)();
  });
  assert.equal(calls, 1);
  release?.();
  await settle();
  await page.unmount();
});

test("FS4-a durante o envio o confirmar fica desligado e o clique forçado não envia", async () => {
  let calls = 0;
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const page = await mount(statusDialog(async () => { calls += 1; await pending; }));
  await fillStatusDialog(page.container);
  await act(async () => (propsOf(button(page.container, "Suspender") as MiniDomElement).onClick as () => void)());
  await settle();
  const submit = elements(page.container, (element) => element.localName === "button" && String(propsOf(element).className).includes("ui-button--danger"))[0] as MiniDomElement;
  assert.equal(propsOf(submit).disabled, true);
  await act(async () => (propsOf(submit).onClick as () => void)());
  assert.equal(calls, 1);
  release?.();
  await settle();
  await page.unmount();
});

test("FS4-b recusa exige atualizar e bloqueia nova confirmação", async () => {
  let calls = 0;
  const page = await mount(statusDialog(async () => { calls += 1; throw new ApiError(422, "recusada"); }));
  await fillStatusDialog(page.container);
  const submit = button(page.container, "Suspender");
  assert.ok(submit);
  await act(async () => (propsOf(submit).onClick as () => void)());
  await settle();
  const blocked = button(page.container, "Suspender");
  assert.ok(blocked);
  assert.equal(propsOf(blocked).disabled, true);
  await act(async () => (propsOf(blocked).onClick as () => void)());
  assert.equal(calls, 1);
  assert.ok(button(page.container, "Atualizar os dados"));
  await page.unmount();
});

test("FS4-d depois da recusa e da leitura nova confirma outra vez", async () => {
  let calls = 0;
  let refreshes = 0;
  const page = await mount(statusDialog(async () => { calls += 1; if (calls === 1) throw new ApiError(422, "recusada"); }, async () => { refreshes += 1; }));
  await fillStatusDialog(page.container);
  await act(async () => (propsOf(button(page.container, "Suspender") as MiniDomElement).onClick as () => void)());
  await settle();
  await act(async () => (propsOf(button(page.container, "Atualizar os dados") as MiniDomElement).onClick as () => void)());
  await settle();
  assert.equal(refreshes, 1);
  await fillStatusDialog(page.container);
  await act(async () => (propsOf(button(page.container, "Suspender") as MiniDomElement).onClick as () => void)());
  await settle();
  assert.equal(calls, 2);
  await page.unmount();
});
