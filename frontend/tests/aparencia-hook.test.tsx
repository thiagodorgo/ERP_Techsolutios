import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// B-APARENCIA-USUARIO — contrato que o B-SAN3-22 consome (decisão do dono de 25/10):
// `useScreenAppearance(screenKey)` → `{ appearance: "A"|"B"|"C", setAppearance }`, exportado de
// `frontend/src/modules/appearance/`; padrão por tela (`patios` → B, as demais → A); valor inválido cai no padrão.

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
  },
});
Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: () => null } });

const TENANT_ID = "ten-industrial-01";

function seedContext(tenantId: string | null) {
  if (!tenantId) return;
  storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId,
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions: ["yard:read"],
      enabledModules: ["dashboard"],
      scope: "branch",
    }),
  );
}

type Captured = { appearance: string; setAppearance: (next: "A" | "B" | "C") => void };

async function renderProbe(screenKey: string, options: { tenantId?: string | null } = {}): Promise<{ captured: Captured; userId: string }> {
  process.env.VITE_USE_MOCKS = "true";
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredSessionPermissions } = await import("./helpers/session-permissions");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { useScreenAppearance } = await import("../src/modules/appearance");

  const session = mockSessionForEmail("gestor.web@techsolutions.example");
  setStoredSessionPermissions(session, ["yard:read"]);
  seedContext(options.tenantId === undefined ? TENANT_ID : options.tenantId);

  const captured: Captured = { appearance: "", setAppearance: () => undefined };
  function Probe() {
    const result = useScreenAppearance(screenKey);
    captured.appearance = result.appearance;
    captured.setAppearance = result.setAppearance;
    return <span data-aparencia={result.appearance} />;
  }
  renderToString(
    <MemoryRouter>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Probe />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return { captured, userId: session.user.id };
}

test("contrato: o hook sai do índice do módulo e devolve { appearance, setAppearance }", async () => {
  storage.clear();
  const appearanceModule = await import("../src/modules/appearance");
  assert.equal(typeof appearanceModule.useScreenAppearance, "function");
  const { captured } = await renderProbe("patios");
  assert.ok(["A", "B", "C"].includes(captured.appearance));
  assert.equal(typeof captured.setAppearance, "function");
});

test("contrato: sem nada guardado, Pátios abre na B e as demais telas na A", async () => {
  storage.clear();
  assert.equal((await renderProbe("patios")).captured.appearance, "B");
  storage.clear();
  assert.equal((await renderProbe("dashboard")).captured.appearance, "A");
  storage.clear();
  assert.equal((await renderProbe("usuarios")).captured.appearance, "A");
});

test("contrato: setAppearance grava na chave da organização e do usuário, e o próximo render já usa a escolha", async () => {
  storage.clear();
  const first = await renderProbe("patios");
  first.captured.setAppearance("C");
  const key = `techsol.aparencia.${TENANT_ID}.${first.userId}`;
  assert.deepEqual(JSON.parse(storage.get(key) ?? "null"), { patios: "C" });
  const second = await renderProbe("patios");
  assert.equal(second.captured.appearance, "C");
});

test("contrato: valor inválido guardado cai no padrão DA TELA", async () => {
  storage.clear();
  const { userId } = await renderProbe("patios");
  storage.set(`techsol.aparencia.${TENANT_ID}.${userId}`, JSON.stringify({ patios: "X", dashboard: "Q" }));
  assert.equal((await renderProbe("patios")).captured.appearance, "B");
  assert.equal((await renderProbe("dashboard")).captured.appearance, "A");
});

test("contrato: sem organização ativa, fica no padrão e setAppearance não grava nada", async () => {
  storage.clear();
  const { captured } = await renderProbe("patios", { tenantId: null });
  assert.equal(captured.appearance, "B");
  captured.setAppearance("A");
  const keys = [...storage.keys()].filter((key) => key.startsWith("techsol.aparencia"));
  assert.deepEqual(keys, []);
});
