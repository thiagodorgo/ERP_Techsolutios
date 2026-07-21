import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import {
  adaptStatementLedger,
  describeBalance,
  formatBalance,
  formatInstallment,
  formatSignedAmount,
  getEntryTypeLabel,
  interpretRemoveError,
  STATEMENT_LOCKED_MESSAGE,
} from "../src/modules/fleet/statement/statement.adapter";

// Traço de menos tipográfico (U+2212) usado nos valores/saldo com sinal.
const MINUS = "−";
const SAMPLE_ID = "11111111-1111-4111-8111-111111111111";

// ── Adapter (puro) — rótulos PT-BR, sinal/semântica de valor e saldo, trava RN-EXT-01, §2.8 ──

test("extrato: rótulos PT-BR dos tipos de lançamento (§3)", () => {
  assert.equal(getEntryTypeLabel("damage"), "Dano");
  assert.equal(getEntryTypeLabel("fine"), "Multa");
  assert.equal(getEntryTypeLabel("remuneration"), "Remuneração");
  assert.equal(getEntryTypeLabel("adjustment"), "Ajuste");
  assert.equal(getEntryTypeLabel("unknown"), "—");
});

test("extrato: valor da parcela com sinal por direção (crédito + / débito −)", () => {
  const credit = formatSignedAmount(100, "credit");
  const debit = formatSignedAmount(100, "debit");
  assert.ok(credit.startsWith("+"), `crédito deve começar com +: ${credit}`);
  assert.ok(debit.startsWith(MINUS), `débito deve começar com −: ${debit}`);
  assert.match(credit, /R\$/);
  assert.match(debit, /R\$/);
});

test("extrato: saldo com sinal e semântica (positivo = a empresa deve ao profissional)", () => {
  assert.ok(formatBalance(150.5).startsWith("+"));
  assert.ok(formatBalance(-150.5).startsWith(MINUS));
  assert.equal(describeBalance(150), "A empresa deve ao profissional");
  assert.equal(describeBalance(-150), "O profissional deve à empresa");
  assert.equal(describeBalance(0), "Sem saldo em aberto");
});

test("extrato: parcela n/N e lançamento único", () => {
  assert.equal(formatInstallment(1, 3), "1/3");
  assert.equal(formatInstallment(2, 3), "2/3");
  assert.equal(formatInstallment(1, 1), "Única");
});

test("extrato: trava RN-EXT-01 — 409 mapeia a mensagem do AutEM", () => {
  assert.match(STATEMENT_LOCKED_MESSAGE, /não podem ser feitas até que todas as parcelas sejam removidas/);
  assert.equal(interpretRemoveError({ status: 409 }), STATEMENT_LOCKED_MESSAGE);
  // 404/erro genérico NÃO usa a mensagem da trava.
  assert.notEqual(interpretRemoveError({ status: 404 }), STATEMENT_LOCKED_MESSAGE);
});

test("extrato: §2.8/LGPD — o adapter só surfacea campos allowlistados (sem tenant_id/CNH)", () => {
  const ledger = adaptStatementLedger(
    {
      operatorProfileId: SAMPLE_ID,
      professionalName: "Maria Souza",
      summary: { currentBalance: -50, totalDebits: 50, totalCredits: 0, count: 1 },
      items: [
        {
          id: "aaaaaaaa-1111-4111-8111-111111111111",
          operatorProfileId: SAMPLE_ID,
          groupId: "bbbbbbbb-1111-4111-8111-111111111111",
          entryType: "adjustment",
          direction: "debit",
          amount: 50,
          installmentNumber: 1,
          installmentTotal: 1,
          dueDate: "2026-08-01T00:00:00.000Z",
          status: "pending",
          runningBalance: -50,
          // campos que o backend NUNCA envia — se vazarem, o adapter deve descartá-los:
          tenantId: "ten-secreto",
          cnhNumber: "123456789",
          sourceId: "src-cru",
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
    SAMPLE_ID,
    "api",
  );

  assert.equal(ledger.items.length, 1);
  const entry = ledger.items[0];
  assert.equal(entry.amount, 50);
  assert.equal(entry.runningBalance, -50);
  assert.ok(!("tenantId" in entry), "adapter não deve carregar tenantId");
  assert.ok(!("cnhNumber" in entry), "adapter não deve carregar cnhNumber");
  assert.ok(!("sourceId" in entry), "adapter não deve carregar sourceId cru");
});

// ── Render (SSR) — cabeçalho, seleção, estados §7 e gating de ação ──

function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const listeners = new Map<string, Set<EventListener>>();

  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: (event: string, listener: EventListener) => {
      const eventListeners = listeners.get(event) ?? new Set<EventListener>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    },
    removeEventListener: (event: string, listener: EventListener) => {
      listeners.get(event)?.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
  };

  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });

  return { clear: () => storage.clear(), localStorage };
}

const browser = installBrowserTestGlobals();

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard", "work-orders"],
      scope: "branch",
    }),
  );
}

async function renderStatement(permissions: readonly string[], path: string): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { ExtratoProfissionalPage } = await import("../src/modules/fleet/statement/pages/ExtratoProfissionalPage");
  const { Routes, Route } = await import("react-router-dom");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Routes>
              <Route path="/fleet/statement" element={<ExtratoProfissionalPage />} />
              <Route path="/fleet/statement/:operatorProfileId" element={<ExtratoProfissionalPage />} />
            </Routes>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("extrato: cabeçalho, seletor de profissional e ação 'Novo ajuste' (com create)", async () => {
  const html = await renderStatement(
    ["professional_statements:read", "professional_statements:create", "professional_statements:update"],
    "/fleet/statement",
  );

  assert.match(html, /Extrato do Profissional/);
  assert.match(html, /Selecionar profissional/); // aria-label do seletor
  assert.match(html, /Selecione um profissional/); // prompt de seleção (§7 sem seleção)
  assert.match(html, /Novo ajuste/);
  // §2.8/LGPD — nenhum dado sensível na tela.
  assert.doesNotMatch(html, /CNH/i);
});

test("extrato: esconde 'Novo ajuste' sem permissão de criação (backend é a autoridade)", async () => {
  const html = await renderStatement(["professional_statements:read"], "/fleet/statement");

  assert.match(html, /Extrato do Profissional/);
  assert.doesNotMatch(html, /Novo ajuste/);
});

test("extrato: deep-link por profissional mostra saldo corrente e estado vazio (D-007, mock não fabrica)", async () => {
  const html = await renderStatement(
    ["professional_statements:read", "professional_statements:create", "professional_statements:update"],
    `/fleet/statement/${SAMPLE_ID}`,
  );

  assert.match(html, /Extrato do Profissional/);
  assert.match(html, /Saldo corrente/);
  // Saldo derivado 0 no mock → semântica "Sem saldo em aberto".
  assert.match(html, /Sem saldo em aberto/);
  // §7 empty — mock honesto não fabrica linhas.
  assert.match(html, /Sem lançamentos/);
  assert.doesNotMatch(html, /CNH/i);
});
