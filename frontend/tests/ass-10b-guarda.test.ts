import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { installMiniDom, text, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10b (T5, F9) — T-GRD-1 e T-GRD-2 do plano v2 (§8.1, §6.7).
//   T-GRD-1: a rota `/platform/cloud-billing` tem DOIS `PermissionGuard` aninhados, um com
//            `platform:cloud-cost-allocation:read` e outro com `platform:billing:read`, lidos do `App.tsx`; e, por render
//            com o `PermissionGuard` REAL, com só uma das duas permissões a tela não aparece. A navegação do front pede as
//            mesmas duas.
//            LIMITE DECLARADO (achado A-B1 do diário do Dev-B): `hasAny()` libera tudo para quem é Admin Plataforma
//            (papel "Super Admin" ou `platform:tenants:read`), e o `PlatformGuard` só deixa entrar esse perfil. Na rota real,
//            portanto, os dois guards não estreitam nada; o render abaixo usa um perfil SEM os marcadores de Admin
//            Plataforma, o único em que o guard decide. O servidor continua sendo a autoridade (`requirePlatformPermission`).
//   T-GRD-2: (A9) a sessão de demonstração de plataforma e o mapa de reserva de `super_admin` e `platform_admin` têm as
//            duas permissões da rota; NENHUM papel de organização do mapa de reserva tem `platform:`.
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
const { MemoryRouter } = await import("react-router-dom");
const { PermissionGuard } = await import("../src/guards/PermissionGuard");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession, mockSessionForEmail } = await import("../src/mocks/auth/context");
const { resolveFrontendPermissions } = await import("../src/modules/auth/auth.adapter");
const { platformNavigation } = await import("../src/navigation/platformNavigation");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "../src");
const ROUTE_PERMISSIONS = ["platform:cloud-cost-allocation:read", "platform:billing:read"] as const;

/** O `element` da rota `/platform/cloud-billing` em `App.tsx`, sem espaços, e a cadeia de guards lida dele. */
function routeGuards(): { readonly element: string; readonly guards: readonly (readonly string[])[] } {
  const app = readFileSync(resolve(SRC, "App.tsx"), "utf8");
  const start = app.indexOf('path="/platform/cloud-billing"');
  assert.ok(start > 0, "a rota existe no App.tsx");
  const open = app.indexOf("element={", start);
  let depth = 0;
  let end = open + "element=".length;
  for (; end < app.length; end++) {
    if (app[end] === "{") depth++;
    if (app[end] === "}") depth--;
    if (depth === 0) break;
  }
  const element = app.slice(open + "element={".length, end).replace(/\s+/g, "");
  const guards = [...element.matchAll(/<PermissionGuardpermissions=\{\[([^\]]*)\]\}>/g)].map((match) =>
    match[1].split(",").filter(Boolean).map((item) => item.replace(/^"|"$/g, "")),
  );
  return { element, guards };
}

test("T-GRD-1 (a) a rota tem os dois PermissionGuard aninhados, um por permissão, em volta da página", () => {
  const { element, guards } = routeGuards();
  assert.deepEqual(guards, ROUTE_PERMISSIONS.map((permission) => [permission]), "dois guards, cada um com UMA permissão");
  assert.equal(
    element,
    '<PermissionGuardpermissions={["platform:cloud-cost-allocation:read"]}><PermissionGuardpermissions={["platform:billing:read"]}><PlatformCloudBillingPage/></PermissionGuard></PermissionGuard>',
    "aninhados, sem nada no meio",
  );
});

async function renderGuards(permissions: readonly string[]): Promise<string> {
  // Perfil SEM os marcadores de Admin Plataforma (nem "Super Admin" nem `platform:tenants:read`): o único em que o
  // `PermissionGuard` decide (LIMITE DECLARADO no topo).
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Financeiro" as never], permissions: [...permissions] } });
  const { guards } = routeGuards();
  const page = h("main", { "data-pagina": "cloud-billing" }, "Cloud Billing");
  const tree = guards.reduceRight<unknown>((child, list) => h(PermissionGuard, { permissions: [...list] }, child as never), page);
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(h(MemoryRouter, null, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, tree as never)))));
  });
  const html = text(container as MiniDomElement);
  await act(async () => root.unmount());
  container.parentNode?.removeChild(container);
  return html;
}

test("T-GRD-1 (b) por render, com só uma das duas permissões a tela não aparece; com as duas, aparece", async () => {
  for (const only of ROUTE_PERMISSIONS) {
    const html = await renderGuards([only]);
    assert.match(html, /Acesso não autorizado/, `só ${only}`);
    assert.doesNotMatch(html, /Cloud Billing/, `só ${only}: a página não aparece`);
  }
  const both = await renderGuards([...ROUTE_PERMISSIONS]);
  assert.match(both, /Cloud Billing/);
  assert.doesNotMatch(both, /Acesso não autorizado/);
});

test("T-GRD-1 (c) a navegação do front pede as mesmas duas permissões da rota", () => {
  const item = platformNavigation.find((entry) => entry.id === "platform-cloud-billing");
  assert.ok(item, "item de navegação da tela");
  assert.deepEqual([...item.requiredPermissions].sort(), [...ROUTE_PERMISSIONS].sort());
});

/** As chaves de papel do mapa de reserva (`rolePermissions` de `auth.adapter.ts`), lidas do código. */
function fallbackRoleKeys(): string[] {
  const source = readFileSync(resolve(SRC, "modules/auth/auth.adapter.ts"), "utf8");
  const start = source.indexOf("const rolePermissions: Record<string, string[]> = {");
  assert.ok(start > 0, "o mapa de reserva existe");
  const end = source.indexOf("\n};", start);
  const body = source.slice(start, end);
  return [...body.matchAll(/^ {2}([a-z_]+): \[/gm)].map((match) => match[1]);
}

test("T-GRD-2 (a) a sessão de demonstração de plataforma tem as duas permissões da rota", () => {
  for (const permission of ROUTE_PERMISSIONS) {
    assert.ok(mockSession.user.permissions.includes(permission), `sessão de demonstração: ${permission}`);
    assert.ok(mockSessionForEmail("admin.plataforma@techsolutions.example").user.permissions.includes(permission), `perfil de plataforma: ${permission}`);
  }
  assert.ok(mockSession.user.permissions.includes("platform:billing:manage"), "a escrita do dólar e dos grupos (§6.7)");
});

test("T-GRD-2 (b) o mapa de reserva dá as duas permissões aos 2 papéis de plataforma e nenhum platform: aos papéis de organização", () => {
  const keys = fallbackRoleKeys();
  assert.ok(keys.length >= 10, `papéis medidos no mapa de reserva: ${keys.length}`);
  for (const role of ["super_admin", "platform_admin"]) {
    assert.ok(keys.includes(role), `papel ${role} no mapa`);
    const permissions = resolveFrontendPermissions([role]);
    for (const permission of [...ROUTE_PERMISSIONS, "platform:billing:manage"]) assert.ok(permissions.includes(permission), `${role}: ${permission}`);
  }
  const leaking = keys
    .filter((role) => role !== "super_admin" && role !== "platform_admin")
    .flatMap((role) => resolveFrontendPermissions([role]).filter((permission) => permission.startsWith("platform:")).map((permission) => `${role}: ${permission}`));
  assert.deepEqual(leaking, [], "papel de organização com permissão de plataforma");
});
