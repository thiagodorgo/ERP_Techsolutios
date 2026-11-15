import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { elements, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10b (T5, F9) — T-APAR-1 do plano v2 (§8.1, §6.6): o seletor de aparência chega ao console da plataforma.
//   (a) o menu do shell da organização (`AppShell`, `AppearanceMenu` sem escopo) NÃO lista "Cloud Billing";
//   (b) o do `PlatformLayout`, montado de verdade e aberto pelo gatilho, lista SÓ as telas de plataforma (as 3 opções da
//       referência aprovada);
//   (c) a escolha grava sem organização ativa, na chave `techsol.aparencia.plataforma.<userId>`, e nada na chave de
//       organização; o hook lê dali; uma tela de organização continua na chave da organização.
process.env.VITE_USE_MOCKS = "false";

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};
after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Route, Routes } = await import("react-router-dom");
const { PlatformLayout } = await import("../src/layouts/PlatformLayout");
const { AppearanceChoices, APPEARANCE_SCREENS, useScreenAppearance } = await import("../src/modules/appearance");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "../src");
const PLATFORM_LABELS = ["A · Fiel à referência", "B · Analítica", "C · Fechamento e grupos"];
const USER_ID = mockSession.user.id;

function providers(child: unknown, path = "/platform/overview") {
  return h(MemoryRouter, { initialEntries: [path] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, child as never))));
}

async function mount(node: unknown) {
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(node as never);
  });
  return {
    container: container as MiniDomElement,
    unmount: async () => {
      await act(async () => root.unmount());
      container.parentNode?.removeChild(container);
    },
  };
}

const radios = (root: MiniDomElement) => elements(root, (el) => el.getAttribute("role") === "menuitemradio");

function seedPlatformSession() {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: [...mockSession.user.permissions] } });
}

test("T-APAR-1 (a) o menu do shell da organização não lista \"Cloud Billing\"; o AppShell monta o menu sem escopo de plataforma", async () => {
  seedPlatformSession();
  const { container, unmount } = await mount(providers(h("div", { role: "menu" }, h(AppearanceChoices, { onChosen: () => undefined }))));
  try {
    const html = text(container);
    assert.doesNotMatch(html, /Cloud Billing/);
    const tenantScreens = APPEARANCE_SCREENS.filter((screen) => (screen.scope ?? "tenant") === "tenant");
    assert.ok(tenantScreens.length >= 5, `telas de organização no registro: ${tenantScreens.length}`);
    assert.equal(radios(container).length, 3 * tenantScreens.length, "3 opções por tela de organização, nenhuma de plataforma");
  } finally {
    await unmount();
  }
  const shell = readFileSync(resolve(SRC, "layouts/AppShell.tsx"), "utf8");
  const uses = [...shell.matchAll(/<AppearanceMenu\b[^>]*\/>/g)].map((match) => match[0]);
  assert.ok(uses.length >= 1, "o AppShell monta o menu");
  assert.deepEqual(uses.filter((use) => /scope=/.test(use)), [], "o AppShell não pede o escopo de plataforma");
});

test("T-APAR-1 (b) o PlatformLayout, montado e aberto pelo gatilho, lista só as telas de plataforma", async () => {
  seedPlatformSession();
  const tree = providers(h(Routes, null, h(Route, { element: h(PlatformLayout) }, h(Route, { path: "/platform/overview", element: h("div", null, "Visão Geral") }))));
  const { container, unmount } = await mount(tree);
  try {
    const triggers = elements(container, (el) => el.getAttribute("aria-label") === "Aparência das telas" && el.localName === "button");
    assert.equal(triggers.length, 1, "um gatilho de aparência no rodapé da barra lateral");
    await act(async () => {
      (propsOf(triggers[0]).onClick as () => void)();
    });
    const options = radios(container).map((el) => text(el).replace(/padrão$/, "").trim());
    assert.deepEqual(options, PLATFORM_LABELS, "só as 3 opções de Cloud Billing");
    assert.match(text(radios(container)[0]), /padrão$/, "a A é o padrão da tela");
    const groups = elements(container, (el) => (el.getAttribute("id") ?? "").startsWith("aparencia-")).map((el) => text(el).trim());
    assert.deepEqual(groups, ["Cloud Billing"], "um grupo só, o da tela de plataforma");
    assert.match(text(container), /no console da plataforma/);
  } finally {
    await unmount();
  }
});

test("T-APAR-1 (c) a escolha grava sem organização ativa, na chave da plataforma, e o hook lê dali", async () => {
  seedPlatformSession();
  assert.equal(dom.storage.has("erp-techsolutions.active-context"), false, "sem organização ativa");
  const tree = providers(h(Routes, null, h(Route, { element: h(PlatformLayout) }, h(Route, { path: "/platform/overview", element: h("div", null, "Visão Geral") }))));
  const { container, unmount } = await mount(tree);
  try {
    const trigger = elements(container, (el) => el.getAttribute("aria-label") === "Aparência das telas" && el.localName === "button")[0];
    await act(async () => {
      (propsOf(trigger).onClick as () => void)();
    });
    const optionB = radios(container).find((el) => text(el).includes("B · Analítica"));
    assert.ok(optionB, "a opção B existe");
    await act(async () => {
      (propsOf(optionB).onClick as () => void)();
    });
  } finally {
    await unmount();
  }
  const key = `techsol.aparencia.plataforma.${USER_ID}`;
  assert.deepEqual(JSON.parse(dom.storage.get(key) ?? "null"), { "platform-cloud-billing": "B" });
  assert.deepEqual([...dom.storage.keys()].filter((name) => name.startsWith("techsol.aparencia.") && name !== key), [], "nada na chave de organização");

  const seen: string[] = [];
  function Probe({ screen }: { readonly screen: string }) {
    seen.push(`${screen}=${useScreenAppearance(screen).appearance}`);
    return null;
  }
  const probe = await mount(providers(h("div", null, h(Probe, { screen: "platform-cloud-billing" }), h(Probe, { screen: "patios" }))));
  await probe.unmount();
  assert.ok(seen.includes("platform-cloud-billing=B"), `o hook lê a chave da plataforma: ${seen.join(", ")}`);
  assert.ok(seen.includes("patios=B"), "tela de organização sem organização ativa fica no padrão dela (Pátios = B)");
});
