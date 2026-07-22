import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import type { OperatorProfileItem } from "../src/modules/registry/operator-profiles/operator-profiles.types";
import type { Fine } from "../src/modules/fleet/fines/fines.types";
import type { Vehicle } from "../src/modules/registry/vehicles/vehicles.types";

// Ω4C PR-07 — Multas + condutor responsável / disposição / impressão. Recria o COMPORTAMENTO do AutEM
// (RN-MUL-01: SIM→extrato do profissional / NÃO→contas a pagar, either/or) no visual do ERP. Cobre:
// select de condutor responsável, parcelas do desconto, badge de disposição (statement/payable/none),
// either/or 409 honesto, impressão client-side, §3 PT-BR, §2.8 (NUNCA CNH — o nome vem da lista de
// Profissionais, não do DTO). Insurance: aviso de lembrete PRIVADO, SEM seletor de visibilidade público
// (lição PR-06). PayableToggle intocado.

// ── Fixtures de navegador (SSR) ──────────────────────────────────────────────
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

const VEHICLES: Vehicle[] = [
  { id: "veh-1", plate: "ABC1D23", model: "Guincho Pesado", isActive: true } as Vehicle,
];

// §2.8: o Profissional carrega CNH no objeto (dado sensível), mas a UI da multa só usa `fullName`. O teste
// prova que o número da CNH NUNCA vaza para o HTML da multa.
const CNH_SECRET = "98765432100";
const PROFILES: OperatorProfileItem[] = [
  {
    id: "op-1",
    userId: "usr-1",
    fullName: "Marcos Guincheiro",
    cnhNumber: CNH_SECRET,
    hasCnh: true,
    cnhCategory: "D",
    cnhExpiresAt: null,
    trackingConsent: true,
    trackingConsentAt: null,
    phone: null,
    notes: null,
    isActive: true,
    createdAt: "2026-06-01T10:00:00.000Z",
  },
];

function makeFine(partial: Partial<Fine> & Pick<Fine, "id">): Fine {
  return {
    vehicleId: "veh-1",
    driverId: null,
    responsibleOperatorProfileId: null,
    disposition: "none",
    numeroAuto: "AI-2026-77123",
    dataInfracao: "2026-06-10",
    orgao: "DETRAN-SP",
    descricao: "Excesso de velocidade",
    valor: 293.47,
    pontos: 5,
    prazoRecurso: null,
    prazoPagamento: "2026-07-20",
    status: "recebida",
    isActive: true,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

async function renderFineModal(options: {
  readonly fine: Fine | null;
  readonly permissions?: readonly string[];
}): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const permissions = options.permissions ?? ["fines:read", "fines:create", "fines:update", "financial_titles:create", "financial_titles:update"];
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { FineFormModal } = await import("../src/modules/fleet/fines/components/FineFormModal");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/fleet/fines"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <FineFormModal
              fine={options.fine}
              vehicles={VEHICLES}
              drivers={[]}
              operatorProfiles={PROFILES}
              context={{ tenantId: "ten-industrial-01" }}
              canLaunchPayable={permissions.includes("financial_titles:create")}
              canRemovePayable={permissions.includes("financial_titles:update")}
              onClose={() => {}}
              onSaved={() => {}}
            />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// ── 1. Modal: create (select condutor responsável + either/or + PT-BR + §2.8) ─
test("nova multa: seção 'Disposição' com select 'Condutor responsável' e PayableToggle (empresa paga)", async () => {
  const html = await renderFineModal({ fine: null });

  // §3 PT-BR: rótulos de negócio, sem termo técnico.
  assert.match(html, /Disposição/);
  assert.match(html, /Condutor responsável/);
  // Select reusa a lista de Profissionais (nome como label).
  assert.match(html, /Marcos Guincheiro/);
  assert.match(html, /Sem responsável \(empresa paga\)/);
  // Sem responsável escolhido → caminho empresa paga (PayableToggle create).
  assert.match(html, /Gerar lançamento em contas a pagar/);
  // §2.8: a CNH do profissional NUNCA aparece no HTML da multa (nome vem da lista, CNH jamais).
  assert.doesNotMatch(html, new RegExp(CNH_SECRET));
});

// ── 2. Modal: edit statement → badge + either/or honesto + Imprimir ──────────
test("multa lançada no extrato: badge 'Lançado no extrato do condutor' (verde) + aviso either/or + Imprimir", async () => {
  const fine = makeFine({ id: "fine-1", responsibleOperatorProfileId: "op-1", disposition: "statement" });
  const html = await renderFineModal({ fine });

  // Badge de disposição derivado (statement vence — either/or garantido no backend).
  assert.match(html, /Lançado no extrato do condutor/);
  assert.match(html, /ui-tone-success/);
  // Aviso honesto do either/or: para lançar em contas a pagar, retire o responsável.
  assert.match(html, /retire o condutor responsável|deixe o campo acima em branco/i);
  // Impressão client-side disponível na edição.
  assert.match(html, /Imprimir multa/);
  // §2.8: sem CNH.
  assert.doesNotMatch(html, new RegExp(CNH_SECRET));
});

// ── 3. Modal: edit none → caminho contas a pagar (PayableToggle edit) ────────
test("multa sem responsável: caminho empresa paga mostra 'Contas a pagar' (PayableToggle edit, intocado)", async () => {
  const fine = makeFine({ id: "fine-2", responsibleOperatorProfileId: null, disposition: "none" });
  const html = await renderFineModal({ fine });

  // O painel de contas a pagar (PayableToggle edit) aparece — mesmo componente do PR-02, intocado.
  assert.match(html, /Contas a pagar/);
  // Ainda oferece o select de responsável (poder trocar para o extrato).
  assert.match(html, /Condutor responsável/);
  assert.match(html, /Imprimir multa/);
});

// ── 4. Adapter: disposição derivada (statement/payable/none) ─────────────────
test("disposição derivada: statement vence; none+payable → 'em contas a pagar'; none puro → '—'", async () => {
  const { resolveFineDisposition, getFineDispositionLabel, getFineDispositionTone } = await import(
    "../src/modules/fleet/fines/fines.adapter"
  );

  assert.equal(resolveFineDisposition("statement", false), "statement");
  assert.equal(resolveFineDisposition("statement", true), "statement"); // statement sempre vence
  assert.equal(resolveFineDisposition("none", true), "payable");
  assert.equal(resolveFineDisposition("none", false), "none");

  assert.equal(getFineDispositionLabel("statement"), "Lançado no extrato do condutor");
  assert.equal(getFineDispositionLabel("payable"), "Lançado em contas a pagar");
  assert.equal(getFineDispositionLabel("none"), "—");

  assert.equal(getFineDispositionTone("statement"), "success");
  assert.equal(getFineDispositionTone("payable"), "warning");
  assert.equal(getFineDispositionTone("none"), "default");
});

// ── 5. Adapter: 409 either/or honesto + trava do extrato + ref inválida ──────
test("interpreta 409 fine_disposition_conflict / statement_entry_locked / 400 responsável inválido", async () => {
  const { interpretFineSubmitError } = await import("../src/modules/fleet/fines/fines.adapter");

  // Motivo explícito → mensagem honesta do either/or.
  const conflictExplicit = interpretFineSubmitError({ status: 409, error: { reason: "fine_disposition_conflict" } }, "form");
  assert.equal(conflictExplicit.reason, "fine_disposition_conflict");
  assert.match(conflictExplicit.message, /extrato do condutor|contas a pagar/i);

  // Sem motivo no corpo (ApiError esconde), mas SETANDO responsável → either/or.
  const conflictByIntent = interpretFineSubmitError({ status: 409 }, "form", "set");
  assert.equal(conflictByIntent.reason, "fine_disposition_conflict");

  // LIMPANDO responsável já lançado com 409 → trava RN-EXT-01 (parcela liquidada).
  const locked = interpretFineSubmitError({ status: 409 }, "form", "clear");
  assert.equal(locked.reason, "statement_entry_locked");
  assert.match(locked.message, /liquidada|ajuste/i);

  // 409 sem intenção de disposição continua sendo duplicidade de nº do auto (legado intocado).
  assert.equal(interpretFineSubmitError({ status: 409 }, "form").reason, "duplicate_numero_auto");

  // Condutor responsável inválido/de outra organização → sob o campo.
  const invalidRef = interpretFineSubmitError({ status: 400, reason: "invalid_operator_profile_reference" });
  assert.equal(invalidRef.field, "responsibleOperatorProfileId");
});

// ── 6. Adapter: DTO da lista traz responsibleOperatorProfileId + disposition ─
test("adaptFinesResponse normaliza responsibleOperatorProfileId e disposition (snake/camel)", async () => {
  const { adaptFinesResponse } = await import("../src/modules/fleet/fines/fines.adapter");

  const data = adaptFinesResponse({
    data: {
      items: [
        {
          id: "fine-1",
          vehicle_id: "veh-1",
          numero_auto: "AI-1",
          responsible_operator_profile_id: "op-1",
          disposition: "statement",
        },
        {
          id: "fine-2",
          vehicle_id: "veh-2",
          numero_auto: "AI-2",
          responsible_operator_profile_id: null,
          disposition: "none",
        },
      ],
      pagination: { limit: 20, offset: 0, total: 2 },
    },
  });

  assert.equal(data.items.length, 2);
  assert.equal(data.items[0].responsibleOperatorProfileId, "op-1");
  assert.equal(data.items[0].disposition, "statement");
  assert.equal(data.items[1].responsibleOperatorProfileId, null);
  assert.equal(data.items[1].disposition, "none");
});

// ── 7. Validação: parcelas do desconto só entram com responsável (1..240) ────
test("validação: parcelas do desconto exige inteiro 1..240 quando há responsável", async () => {
  const { validateFine } = await import("../src/modules/fleet/fines/fines.adapter");

  const base = { vehicleId: "veh-1", numeroAuto: "AI-1", orgao: "DETRAN-SP", dataInfracao: "2026-06-10", valor: 293.47 };

  // Com responsável e parcelas inválidas → erro.
  const bad = validateFine({ ...base, responsibleOperatorProfileId: "op-1", responsibleInstallmentTotal: 0 });
  assert.ok(bad.some((e) => e.field === "responsibleInstallmentTotal"));

  // Com responsável e parcelas válidas → sem erro.
  const good = validateFine({ ...base, responsibleOperatorProfileId: "op-1", responsibleInstallmentTotal: 3 });
  assert.equal(good.length, 0);

  // Sem responsável, parcelas são ignoradas (não valida).
  const ignored = validateFine({ ...base, responsibleInstallmentTotal: 999 });
  assert.equal(ignored.length, 0);
});

// ── 8. Insurance: aviso de lembrete PRIVADO, SEM seletor de visibilidade ─────
test("apólice: aviso honesto de lembrete PRIVADO de vencimento, SEM seletor de visibilidade público", async () => {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { InsurancePolicyFormModal } = await import("../src/modules/fleet/insurance/components/InsurancePolicyFormModal");

  const html = renderToString(
    <MemoryRouter initialEntries={["/fleet/insurance"]}>
      <InsurancePolicyFormModal
        policy={null}
        vehicles={VEHICLES}
        context={{ tenantId: "ten-industrial-01" }}
        canLaunchPayable={false}
        canRemovePayable={false}
        onClose={() => {}}
        onSaved={() => {}}
      />
    </MemoryRouter>,
  );

  // Vencimento (vigência fim) + aviso de lembrete privado.
  assert.match(html, /Vencimento/);
  assert.match(html, /lembrete privado/i);
  assert.match(html, /visível apenas ao seu usuário|apenas ao seu usuário/i);
  // Lição PR-06: NENHUM seletor de visibilidade público (nada de PÚBLICA/PERSONALIZADA/broadcast).
  assert.doesNotMatch(html, /P[uú]blica|Personalizada|Todos os usu[aá]rios|visibilidade/i);
});
