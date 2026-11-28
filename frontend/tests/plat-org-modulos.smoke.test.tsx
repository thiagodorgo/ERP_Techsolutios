// FM1 a FM4 da Emenda 1.6: a página de módulos diante do contrato do PATCH /platform/tenants/:id/modules.
// Página real, provedores reais, dublê só na fronteira HTTP. O selo e a chave saem da lista do servidor:
// 200 recarrega com o que voltou, 409 da assinatura avisa e devolve o selo, 4xx recusado afirma que nada
// foi alterado, rede caída ou 5xx não afirmam isso porque o resultado é desconhecido.
import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, hasClass, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

process.env.VITE_USE_MOCKS = "false";
const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(" "));
};
after(async () => {
  if (leftover) await leftover();
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Route, Routes } = await import("react-router-dom");
const { PlatformTenantModulesPage } = await import("../src/modules/platform/pages/PlatformTenantModulesPage");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");

const createElement = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};
const settle = async () => {
  for (let passo = 0; passo < 8; passo++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const ORG = {
  id: ORG_ID,
  name: "Organização A",
  slug: "organizacao-a",
  status: "active",
  createdAt: "2026-11-27T12:00:00.000Z",
  system: false,
  group: { id: "22222222-2222-4222-8222-222222222222", name: "Grupo Teste" },
  setup: { complete: false, missing: ["plan"] },
};
const detail = (subscription: unknown) => ({
  id: ORG_ID,
  name: ORG.name,
  slug: ORG.slug,
  status: "active",
  createdAt: ORG.createdAt,
  moduleCount: 1,
  modules: [{ key: "dashboard", label: "Dashboard", enabled: true }],
  users: [],
  subscription,
});

type Mod = { key: string; name: string; description: string; category: "MVP" | "Fase 2" | "Enterprise"; status: "enabled" | "disabled" | "blocked_by_plan"; availableInPlan: boolean };
const CATALOG = [
  { key: "dashboard", name: "Dashboard", description: "Indicadores.", category: "MVP" },
  { key: "work_orders", name: "Ordens de Serviço", description: "OS.", category: "MVP" },
  { key: "patios", name: "Pátios", description: "Pátios.", category: "Fase 2" },
] as const;
const semAssinatura = (ligados: readonly string[]): Mod[] => CATALOG.map((module) => ({ ...module, availableInPlan: true, status: ligados.includes(module.key) ? "enabled" : "disabled" }));
const comAssinatura = (ligados: readonly string[]): Mod[] => CATALOG.map((module) => ({ ...module, availableInPlan: ligados.includes(module.key), status: ligados.includes(module.key) ? "enabled" : "blocked_by_plan" }));

type PatchReply = { kind: "json"; status: number; body: unknown } | { kind: "network" };
let patchBodies: unknown[] = [];
function installFetch(modules: Mod[], subscription: unknown, patch: PatchReply) {
  patchBodies = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (method === "PATCH" && url.endsWith(`/platform/tenants/${ORG_ID}/modules`)) {
      patchBodies.push(typeof init?.body === "string" ? JSON.parse(init.body) : undefined);
      if (patch.kind === "network") throw new TypeError("Failed to fetch");
      return json(patch.status, patch.body);
    }
    if (method === "GET" && url.endsWith(`/platform/tenants/${ORG_ID}/modules`)) return json(200, { data: modules });
    if (method === "GET" && url.endsWith(`/platform/tenants/${ORG_ID}/detail`)) return json(200, { data: detail(subscription) });
    if (method === "GET" && url.endsWith(`/platform/tenants/${ORG_ID}`)) return json(200, { data: ORG });
    return json(599, { error: { code: "sem_fixture" } });
  }) as typeof fetch;
}

let leftover: (() => Promise<void>) | null = null;
async function mount(modules: Mod[], subscription: unknown, patch: PatchReply) {
  if (leftover) await leftover();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: ["platform:tenants:read", "platform:modules:manage"] } });
  installFetch(modules, subscription, patch);
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      createElement(MemoryRouter, { initialEntries: [`/platform/tenants/${ORG_ID}/modules`] },
        createElement(AuthProvider, null, createElement(TenantProvider, null, createElement(PermissionProvider, null,
          createElement(Routes, null, createElement(Route, { path: "/platform/tenants/:tenantId/modules", element: createElement(PlatformTenantModulesPage) })))))),
    );
  });
  await settle();
  const card = (name: string) => {
    const article = elements(container, (element) => hasClass(element, "platform-module-card")).find((element) => text(elements(element, (node) => node.localName === "strong")[0] as MiniDomElement) === name);
    assert.ok(article, `cartão ${name}`);
    const input = elements(article, (element) => element.localName === "input")[0] as MiniDomElement;
    return { badge: text(elements(article, (element) => hasClass(element, "ui-badge"))[0] as MiniDomElement), checked: Boolean(propsOf(input).checked), input };
  };
  const toggle = async (name: string) => {
    const { input } = card(name);
    await act(async () => {
      (propsOf(input).onChange as (event: unknown) => void)({ target: input, currentTarget: input });
    });
    await settle();
  };
  const save = async () => {
    const button = elements(container, (element) => element.localName === "button").find((element) => text(element).includes("Salvar alterações"));
    assert.ok(button, "botão Salvar alterações");
    await act(async () => {
      button.click();
    });
    await settle();
  };
  const unmount = async () => {
    leftover = null;
    await act(async () => {
      root.unmount();
    });
    container.parentNode?.removeChild(container);
  };
  leftover = unmount;
  return { card, toggle, save, unmount, pageText: () => text(container).replace(/\s+/g, " ") };
}

const ERRO_409 = { error: { code: "CONFLICT", reason: "module_change_requires_subscription", message: "não expor" } };

test("FM0 cabeçalho mostra o nome literal do plano sem vazar código interno", async () => {
  const withPlan = await mount(semAssinatura(["dashboard"]), { planCode: "starter", planName: "Plano Regional Teste", validFrom: "2026-11-05T15:00:00.000Z", overrides: {}, addons: [], modules: [] }, { kind: "json", status: 200, body: { data: semAssinatura(["dashboard"]) } });
  assert.match(withPlan.pageText(), /Organização A · Plano: Plano Regional Teste/);
  assert.doesNotMatch(withPlan.pageText(), /starter|plano Plano/);
  await withPlan.unmount();

  const withoutPlan = await mount(semAssinatura(["dashboard"]), null, { kind: "json", status: 200, body: { data: semAssinatura(["dashboard"]) } });
  assert.match(withoutPlan.pageText(), /Organização A · Sem plano contratado/);
  assert.doesNotMatch(withoutPlan.pageText(), /plano Sem/);
  await withoutPlan.unmount();
});

test("FM1 200: o selo e a chave saem da lista que o servidor devolveu, não do rascunho", async () => {
  const espelho = await mount(semAssinatura(["dashboard"]), null, { kind: "json", status: 200, body: { data: semAssinatura(["dashboard", "work_orders"]) } });
  await espelho.toggle("Ordens de Serviço");
  await espelho.save();
  assert.deepEqual(patchBodies, [{ enabledModules: ["dashboard", "work_orders"] }]);
  assert.equal(espelho.card("Ordens de Serviço").badge, "habilitado");
  assert.doesNotMatch(espelho.pageText(), /Alteração não concluída/);
  await espelho.unmount();

  const divergente = await mount(semAssinatura(["dashboard"]), null, { kind: "json", status: 200, body: { data: semAssinatura(["dashboard"]) } });
  await divergente.toggle("Ordens de Serviço");
  await divergente.save();
  const os = divergente.card("Ordens de Serviço");
  assert.equal(os.badge, "desabilitado", "o servidor devolveu OS desligada: o selo segue o servidor");
  assert.equal(os.checked, false);
  await divergente.unmount();
});

test("FM2 409 module_change_requires_subscription: avisa da assinatura e o selo volta ao que o servidor tem", async () => {
  const page = await mount(comAssinatura(["dashboard"]), { planCode: "starter", planName: "Plano Regional Teste", validFrom: "2026-11-05T15:00:00.000Z", overrides: { monthlyPrice: null, includedUsers: null, includedStorageGb: null, extraUserPrice: null, extraGbPrice: null }, addons: [], modules: [] }, { kind: "json", status: 409, body: ERRO_409 });
  await page.toggle("Dashboard");
  await page.save();
  assert.match(page.pageText(), /Alteração não concluída/);
  assert.match(page.pageText(), /Os módulos são definidos pela assinatura\./);
  const dashboard = page.card("Dashboard");
  assert.equal(dashboard.badge, "habilitado", "o 409 não mudou nada: o Dashboard continua ligado na tela");
  assert.equal(dashboard.checked, true);
  await page.unmount();
});

test("FM3 rede caída ou 5xx: a tela não afirma que nada foi alterado", async () => {
  for (const patch of [{ kind: "network" } as const, { kind: "json", status: 500, body: { error: { code: "INTERNAL_ERROR", reason: "unknown_error", message: "x" } } } as const]) {
    const page = await mount(semAssinatura(["dashboard"]), null, patch);
    await page.toggle("Ordens de Serviço");
    await page.save();
    const texto = page.pageText();
    assert.match(texto, /Alteração não concluída/);
    assert.doesNotMatch(texto, /Nada foi alterado/, `${patch.kind}: resultado desconhecido não vira "nada foi alterado"`);
    assert.match(texto, /Não foi possível confirmar/);
    assert.equal(page.card("Ordens de Serviço").badge, "desabilitado", "a tela mostra a última lista lida do servidor, não o rascunho");
    await page.unmount();
  }
});

test("FM4 recusa 4xx (400, 422, outro 409): afirma que nada foi alterado e devolve o selo", async () => {
  for (const [status, reason] of [[400, "invalid_field"], [422, "module_unknown"], [409, "outro_conflito"]] as const) {
    const page = await mount(semAssinatura(["dashboard"]), null, { kind: "json", status, body: { error: { code: "X", reason, message: "x" } } });
    await page.toggle("Ordens de Serviço");
    await page.save();
    const texto = page.pageText();
    assert.match(texto, /Não foi possível salvar os módulos\. Nada foi alterado\./, `${status} ${reason}`);
    assert.doesNotMatch(texto, /definidos pela assinatura/);
    assert.equal(page.card("Ordens de Serviço").badge, "desabilitado", `${status} ${reason}: selo volta ao servidor`);
    await page.unmount();
  }
});
