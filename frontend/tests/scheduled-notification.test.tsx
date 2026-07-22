import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { CreateNotificationForm } from "../src/modules/notifications/components/CreateNotificationDialog";
import { ApiError } from "../src/services/api/client";
import {
  adaptScheduledNotification,
  getScheduledStatusLabel,
  getVisibilityLabel,
  interpretCreateError,
  toCreateBody,
  validateScheduledNotification,
} from "../src/modules/notifications/scheduled-notification.adapter";
import type {
  RecipientOption,
  ScheduledNotificationVisibility,
} from "../src/modules/notifications/scheduled-notification.types";

// Ω4C PR-04 (D-Ω4C-NOTIF-CENTRAL-SPLIT) — popup reutilizável de criação + montagem na NotificationsPage.
// Recria o COMPORTAMENTO do modal "Cadastrar notificação (avulsa)" do AutEM (campos + Tipo PRIVADA/PÚBLICA/
// PERSONALIZADA + picker no PERSONALIZADA) no visual do ERP. Cobre: render do dialog, validação client,
// troca de Tipo mostra/esconde picker, rótulos PT-BR de situação, gating (sem create → sem botão),
// §2.8 (nada sensível no render) e §3 PT-BR.

const SAMPLE_ID = "11111111-1111-4111-8111-111111111111";
const RECIPIENTS: RecipientOption[] = [
  { id: "aaaaaaaa-1111-4111-8111-111111111111", name: "Maria Souza" },
  { id: "bbbbbbbb-1111-4111-8111-111111111111", name: "João Lima" },
];

type FormProps = Parameters<typeof CreateNotificationForm>[0];

function renderForm(overrides: Partial<FormProps> = {}): string {
  const base: FormProps = {
    notifyAt: "",
    remindBefore: "",
    title: "",
    message: "",
    visibility: "private",
    recipients: [],
    recipientsLoading: false,
    recipientsUnavailable: false,
    selectedRecipientIds: [],
    feedback: null,
    fieldError: null,
    busy: false,
    onNotifyAtChange: () => {},
    onRemindBeforeChange: () => {},
    onTitleChange: () => {},
    onMessageChange: () => {},
    onVisibilityChange: () => {},
    onToggleRecipient: () => {},
    onSubmit: () => {},
    onCancel: () => {},
  };
  return renderToString(<CreateNotificationForm {...base} {...overrides} />);
}

// ── Render do dialog (campos AutEM) ──────────────────────────────────────────────
test("dialog: renderiza os campos do AutEM (Data e Hora, Antecedência, Título, Mensagem, Tipo)", () => {
  const html = renderForm();
  assert.match(html, /Data e Hora/);
  assert.match(html, /Antecedência/);
  assert.match(html, /Título/);
  assert.match(html, /Mensagem/);
  assert.match(html, /Tipo/);
  // Seções tituladas (agrupamento claro, não formulário achatado).
  assert.match(html, /Quando/);
  assert.match(html, /Conteúdo/);
  assert.match(html, /Destinatários/);
  // Ação primária de submit.
  assert.match(html, /Agendar notificação/);
});

test("dialog: rótulos PT-BR do Tipo (Privada/Pública/Personalizada), nunca o token cru", () => {
  const html = renderForm();
  assert.match(html, /Privada/);
  assert.match(html, /Pública/);
  assert.match(html, /Personalizada/);
  // §3 — enum interno nunca vira texto na UI.
  assert.doesNotMatch(html, />private</);
  assert.doesNotMatch(html, />public</);
  assert.doesNotMatch(html, />custom</);
});

// ── Troca de Tipo mostra/esconde o picker de destinatários ───────────────────────
// O sinal do picker é o CONTEÚDO (checkboxes de destinatário), que só existe no PERSONALIZADA — o
// rótulo "Selecionar destinatários" também aparece como dica da opção do Tipo, então não serve de sinal.
test("dialog: PERSONALIZADA mostra o picker de destinatários (só nome, §2.8)", () => {
  const html = renderForm({ visibility: "custom", recipients: RECIPIENTS });
  assert.match(html, /Maria Souza/);
  assert.match(html, /João Lima/);
});

test("dialog: PRIVADA/PÚBLICA escondem o picker de destinatários", () => {
  const privateHtml = renderForm({ visibility: "private", recipients: RECIPIENTS });
  assert.doesNotMatch(privateHtml, /Maria Souza/);
  assert.doesNotMatch(privateHtml, /João Lima/);

  const publicHtml = renderForm({ visibility: "public", recipients: RECIPIENTS });
  assert.doesNotMatch(publicHtml, /Maria Souza/);
});

test("dialog: PERSONALIZADA sem usuários → estado vazio honesto (D-007, mock não fabrica)", () => {
  const html = renderForm({ visibility: "custom", recipients: [] });
  assert.match(html, /Nenhum usuário disponível/);
});

test("dialog: feedback inline por Alert (o design system não tem toast)", () => {
  const ok = renderForm({ feedback: { tone: "success", message: "Notificação agendada com sucesso." } });
  assert.match(ok, /Notificação agendada com sucesso/);
  const err = renderForm({ feedback: { tone: "danger", message: "Dados inválidos. Revise os campos e tente novamente." } });
  assert.match(err, /Dados inválidos/);
});

// ── Validação client (título/mensagem obrigatórios, notify_at válido, custom precisa de destinatário) ──
test("validação: título e mensagem são obrigatórios", () => {
  const problems = validateScheduledNotification({
    title: "",
    message: "",
    notifyAt: "2026-08-01T10:00",
    visibility: "private",
    selectedRecipientIds: [],
  });
  assert.ok(problems.some((p) => /título/i.test(p)));
  assert.ok(problems.some((p) => /mensagem/i.test(p)));
});

test("validação: notify_at inválido é rejeitado; válido passa", () => {
  const invalid = validateScheduledNotification({
    title: "Aviso",
    message: "Corpo",
    notifyAt: "data-invalida",
    visibility: "private",
    selectedRecipientIds: [],
  });
  assert.ok(invalid.some((p) => /data e hora/i.test(p)));

  const valid = validateScheduledNotification({
    title: "Aviso",
    message: "Corpo",
    notifyAt: "2026-08-01T10:00",
    visibility: "private",
    selectedRecipientIds: [],
  });
  assert.equal(valid.length, 0);
});

test("validação: PERSONALIZADA exige ao menos um destinatário", () => {
  const semDestinatario = validateScheduledNotification({
    title: "Aviso",
    message: "Corpo",
    notifyAt: "2026-08-01T10:00",
    visibility: "custom",
    selectedRecipientIds: [],
  });
  assert.ok(semDestinatario.some((p) => /destinatário/i.test(p)));

  const comDestinatario = validateScheduledNotification({
    title: "Aviso",
    message: "Corpo",
    notifyAt: "2026-08-01T10:00",
    visibility: "custom",
    selectedRecipientIds: [RECIPIENTS[0].id],
  });
  assert.equal(comDestinatario.length, 0);
});

// ── Rótulos PT-BR de situação (Pendente/Disparada/Cancelada) ─────────────────────
test("situação: rótulos PT-BR (§3) — Pendente/Disparada/Cancelada", () => {
  assert.equal(getScheduledStatusLabel("pending"), "Pendente");
  assert.equal(getScheduledStatusLabel("fired"), "Disparada");
  assert.equal(getScheduledStatusLabel("cancelled"), "Cancelada");
  assert.equal(getVisibilityLabel("private"), "Privada");
  assert.equal(getVisibilityLabel("public"), "Pública");
  assert.equal(getVisibilityLabel("custom"), "Personalizada");
});

// ── Contrato do POST (camelCase → snake_case) ────────────────────────────────────
test("toCreateBody: traduz para o contrato snake_case do backend; custom leva os destinatários", () => {
  const body = toCreateBody({
    title: "  Aviso  ",
    message: "  Corpo  ",
    notifyAt: "2026-08-01T10:00",
    remindBeforeMinutes: 30,
    visibility: "custom",
    customRecipientIds: [RECIPIENTS[0].id],
  });
  assert.equal(body.title, "Aviso");
  assert.equal(body.message, "Corpo");
  assert.equal(body.notify_at, "2026-08-01T10:00");
  assert.equal(body.remind_before_minutes, 30);
  assert.equal(body.visibility, "custom");
  assert.deepEqual(body.custom_recipient_ids, [RECIPIENTS[0].id]);

  // PRIVADA não envia destinatários nem lembrete quando ausentes.
  const priv = toCreateBody({ title: "A", message: "B", notifyAt: "2026-08-01T10:00", visibility: "private" });
  assert.ok(!("custom_recipient_ids" in priv));
  assert.ok(!("remind_before_minutes" in priv));
});

test("interpretCreateError: 403 → acesso não permitido; 400 → validação", () => {
  assert.match(interpretCreateError(new ApiError(403, "x")), /Acesso não permitido/);
  assert.match(interpretCreateError(new ApiError(400, "x")), /Dados inválidos/);
});

// ── §2.8 — adapter só surfacea a projeção mínima (sem tenant_id/custom_recipient_ids/source_id crus) ──
test("§2.8: adapter descarta campos sensíveis mesmo se o backend os enviar", () => {
  const view = adaptScheduledNotification({
    id: SAMPLE_ID,
    title: "Aviso",
    message: "Corpo",
    notifyAt: "2026-08-01T13:00:00.000Z",
    remindBeforeMinutes: 30,
    visibility: "custom",
    status: "pending",
    createdAt: "2026-07-21T00:00:00.000Z",
    // campos que a UI NUNCA deve carregar:
    tenantId: "ten-secreto",
    clientActionId: "cli-cru",
    customRecipientIds: ["usr-secreto"],
    sourceId: "src-cru",
  });
  assert.ok(view);
  assert.equal(view.id, SAMPLE_ID);
  assert.equal(view.visibility, "custom");
  const serialized = JSON.stringify(view);
  assert.doesNotMatch(serialized, /ten-secreto|tenantId/i);
  assert.doesNotMatch(serialized, /cli-cru|clientActionId/i);
  assert.doesNotMatch(serialized, /usr-secreto|customRecipientIds/i);
  assert.doesNotMatch(serialized, /src-cru|sourceId/i);
});

test("adapter: sem id → null (D-007, nada fabricado)", () => {
  assert.equal(adaptScheduledNotification(null), null);
  assert.equal(adaptScheduledNotification({}), null);
  assert.equal(adaptScheduledNotification({ title: "x" }), null);
});

// ── Montagem na NotificationsPage: gating por `notifications:create` + §7 estados ──
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
      enabledModules: ["dashboard", "work-orders", "notifications"],
      scope: "branch",
    }),
  );
}

async function renderNotifications(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { NotificationsPage } = await import("../src/modules/notifications/pages/NotificationsPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/notifications"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <NotificationsPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("montagem: com notifications:create → botão 'Nova notificação' + seção de agendadas (empty §7)", async () => {
  const html = await renderNotifications(["notifications:read", "notifications:create"]);

  assert.match(html, /Notificações/);
  assert.match(html, /Nova notificação/);
  assert.match(html, /Notificações agendadas/);
  // §7 empty — mock honesto não fabrica agendadas.
  assert.match(html, /Sem notificações agendadas/);
});

test("montagem: sem notifications:create → esconde 'Nova notificação' e a seção (backend é a autoridade)", async () => {
  const html = await renderNotifications(["notifications:read"]);

  assert.match(html, /Notificações/);
  assert.doesNotMatch(html, /Nova notificação/);
  assert.doesNotMatch(html, /Notificações agendadas/);
});
