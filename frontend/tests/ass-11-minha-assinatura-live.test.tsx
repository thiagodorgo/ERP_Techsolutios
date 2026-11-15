import assert from "node:assert/strict";
import test, { after } from "node:test";

import type { TenantSubscriptionView } from "../../src/modules/subscription-billing/statements/subscription-view";
import { elements, installMiniDom, propsOf, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// B-ASS-11 (F5, Emenda 1 §8.1 e Emenda 1.1 §5.1) — a tela "Minha assinatura" REAL montada com o menu de aparência REAL
// (`AppearanceChoices`) e a rede simulada, no molde de `b-san3-24-cheques-aparencias-live.test.tsx`:
//   T-L1 só `GET /api/v1/billing/subscription` (nada de tendência, plataforma nem `tenantId=`);
//   T-L2 escolher A, B e C no menu troca a raiz `[data-aparencia]`, com o mesmo conteúdo;
//   T-L3 o bloco abre o detalhe logo abaixo; abrir outro fecha o primeiro; Enter abre, Espaço fecha, Esc fecha;
//   T-L4 403 → "Acesso não permitido", sem dado;  T-L5 500 sem dado anterior → erro e "Tentar de novo", que recarrega;
//   T-L6 falha em 2º plano com dado anterior → o dado fica, com o aviso de desatualizado;
//   T-L7 "Ver usuários" só com `users.read` ou `users:read`;  T-L8 0 erro no console;
//   T-L9 "Copiar dados da fatura" grava o nome da organização DA SESSÃO e o vencimento, sem "R$"; recusada, avisa.
process.env.VITE_USE_MOCKS = "false";

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { MySubscriptionPage } = await import("../src/modules/settings/subscription/MySubscriptionPage");
const { AppearanceChoices } = await import("../src/modules/appearance");
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
const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const TENANT_ID = "org-assinatura";
/** O nome da organização NA SESSÃO (AuthTenant.name) — diferente do contexto, para provar de onde a tela o lê. */
const SESSION_ORG = "Guincho Sessão Ltda";
const BILLING = ["billing:read", "notifications:read"];

/** A resposta da rota real (forma de `subscription-view.ts`): em atraso, fatura de setembro, sem meio (a `main` de hoje). */
function overdueView(): TenantSubscriptionView {
  return {
    period: "2026-11",
    plan: { code: "plus", name: "Plus" },
    usage: {
      users: { used: 18, included: 20, overLimit: false },
      storageGb: { used: 42, included: 50, overLimit: false, measuredAt: "2026-11-13", estimate: true },
    },
    status: { inGoodStanding: false, overdueSince: "2026-10-11", nextDueDate: "2026-10-11" },
    payment: { statementId: "stm-1", dueDate: "2026-10-11", payUrl: null, pixCopyPaste: null, boletoLine: null, boletoUrl: null, invoicePdfAvailable: false },
  };
}

type Call = { readonly method: string; readonly url: string };
type Reply = (call: Call, count: number) => Response;
const calls: Call[] = [];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const okReply: Reply = () => json(200, { data: overdueView() });

function installFetch(reply: Reply) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = { method: init?.method ?? "GET", url: String(input) };
    calls.push(call);
    if (call.method === "GET" && /\/api\/v1\/billing\/subscription$/.test(call.url)) return reply(call, calls.filter((c) => c.url === call.url).length);
    return json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
}

function seed(permissions: readonly string[], appearance: "A" | "B" | "C" | null) {
  dom.storage.clear();
  // A preferência da aparência fica também em memória no módulo de aparência; gravá-la deixa cada teste no seu ponto de
  // partida. `null` = nada guardado (o padrão da tela).
  if (appearance) dom.storage.set(`techsol.aparencia.${TENANT_ID}.${mockSession.user.id}`, JSON.stringify({ "minha-assinatura": appearance }));
  setStoredAuthSession({ ...mockSession, tenant: { id: TENANT_ID, name: SESSION_ORG }, user: { ...mockSession.user, roles: ["Financeiro" as never], permissions: [...permissions] } });
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: TENANT_ID, tenantName: "Nome do Contexto", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role: "Financeiro", permissions, enabledModules: ["dashboard"], scope: "tenant" }),
  );
}

async function mount(options: { reply?: Reply; permissions?: readonly string[]; appearance?: "A" | "B" | "C" | null } = {}) {
  seed(options.permissions ?? BILLING, options.appearance === undefined ? "A" : options.appearance);
  installFetch(options.reply ?? okReply);
  dom.intervals.length = 0;
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(MemoryRouter, { initialEntries: ["/administrator/subscription"] },
        h(AuthProvider, null,
          h(TenantProvider, null,
            h(PermissionProvider, null, h("div", { "data-menu": "" }, h(AppearanceChoices, { onChosen: () => undefined })), h(MySubscriptionPage))))),
    );
  });
  await settle();
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

const pageRoot = (container: MiniDomNode) => elements(container, (el) => el.hasAttribute("data-aparencia"))[0];
const block = (container: MiniDomNode, id: string) => elements(pageRoot(container), (el) => el.localName === "button" && el.getAttribute("data-bloco") === id)[0];
const details = (container: MiniDomNode) => elements(pageRoot(container), (el) => el.getAttribute("role") === "region" && (el.getAttribute("aria-label") ?? "").startsWith("Detalhe:"));
const button = (container: MiniDomNode, label: string) => elements(container, (el) => (el.localName === "button" || el.localName === "a") && text(el).trim() === label)[0];
const menuItem = (container: MiniDomNode, label: string) =>
  elements(container, (el) => el.getAttribute("role") === "group" && el.getAttribute("aria-labelledby") === "aparencia-minha-assinatura").flatMap((group) =>
    elements(group, (el) => el.getAttribute("role") === "menuitemradio" && text(el).includes(label)),
  )[0];
const pageText = (container: MiniDomNode) => text(pageRoot(container)).replace(/\s+/g, " ");
const clickProps = (el: MiniDomElement) => ({ preventDefault() {}, stopPropagation() {}, target: el, currentTarget: el });

async function press(el: MiniDomElement | undefined) {
  assert.ok(el, "elemento a acionar não encontrado");
  const onClick = propsOf(el).onClick as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onClick, "function", `onClick ausente em <${el.localName}> "${text(el)}"`);
  await act(async () => {
    onClick!(clickProps(el));
  });
  await settle();
}

/**
 * Tecla num bloco. O bloco é um `<button type="button">` nativo: Enter e Espaço o acionam pelo próprio navegador (o clique),
 * sem tratador de tecla que o engula. O teste confere essas duas condições e então dispara o clique que o navegador dispara.
 */
async function keyOnBlock(el: MiniDomElement | undefined, key: "Enter" | " ") {
  assert.ok(el, "bloco não encontrado");
  assert.equal(el.localName, "button", "o bloco é um botão nativo");
  assert.equal(el.getAttribute("type"), "button");
  let prevented = false;
  const onKeyDown = propsOf(el).onKeyDown as ((ev: unknown) => void) | undefined;
  onKeyDown?.({ key, preventDefault: () => (prevented = true), stopPropagation() {}, currentTarget: el, target: el });
  assert.equal(prevented, false, `nenhum tratador impede o "${key}" nativo do botão`);
  await press(el);
}

async function escapeOn(container: MiniDomNode) {
  const root = pageRoot(container);
  const onKeyDown = propsOf(root).onKeyDown as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onKeyDown, "function", "a raiz da vista trata o Esc");
  await act(async () => {
    onKeyDown!({ key: "Escape", preventDefault() {}, stopPropagation() {}, currentTarget: root, target: root });
  });
  await settle();
}

async function tickBackground() {
  const live = dom.intervals.filter((interval) => interval.fn);
  assert.ok(live.length > 0, "a tela registrou a atualização em 2º plano");
  await act(async () => {
    for (const interval of live) interval.fn!();
  });
  await settle();
}

test("T-L1 a tela chama SÓ GET /api/v1/billing/subscription (nada de tendência, plataforma nem tenantId=)", async () => {
  const { container, unmount } = await mount();
  try {
    assert.match(pageText(container), /18 de 20 usuários/);
    await tickBackground();
    assert.ok(calls.length >= 2, `chamadas: ${calls.length}`);
    for (const call of calls) {
      assert.equal(call.method, "GET");
      assert.match(call.url, /\/api\/v1\/billing\/subscription$/, call.url);
      assert.doesNotMatch(call.url, /usage-history|\/platform\/|tenantId=/, call.url);
    }
  } finally {
    await unmount();
  }
});

const OPTIONS = [
  ["A", "A · Padrão fiel"],
  ["B", "B · Analítica"],
  ["C", "C · Situação primeiro"],
] as const;

test("T-L2 escolher A, B e C no menu real troca a raiz [data-aparencia], com o mesmo conteúdo", async () => {
  const { container, unmount } = await mount({ appearance: null });
  try {
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A", "sem nada guardado abre na A");
    for (const [letter, label] of OPTIONS) {
      await press(menuItem(container, label));
      assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), letter, `escolhi ${label}`);
      const content = pageText(container);
      for (const expected of ["Minha assinatura", "Plus", "18 de 20 usuários", "42 de 50 GB", "Em atraso", "11/10/2026", "Fatura em aberto"]) {
        assert.ok(content.includes(expected), `${letter}: sem "${expected}"`);
      }
      assert.equal(elements(pageRoot(container), (el) => el.hasAttribute("data-bloco")).length, 5, `${letter}: os 5 blocos (com fatura em aberto)`);
    }
  } finally {
    await unmount();
  }
});

test("T-L3 o bloco abre o detalhe logo abaixo; abrir outro fecha o primeiro; Enter abre, Espaço fecha, Esc fecha", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(details(container).length, 0, "na A, tudo começa fechado");
    await press(block(container, "usuarios"));
    assert.equal(block(container, "usuarios").getAttribute("aria-expanded"), "true");
    assert.deepEqual(details(container).map((el) => el.getAttribute("aria-label")), ["Detalhe: Usuários"]);
    assert.equal(block(container, "usuarios").getAttribute("aria-controls"), details(container)[0].getAttribute("id"));
    await press(block(container, "espaco"));
    assert.deepEqual(details(container).map((el) => el.getAttribute("aria-label")), ["Detalhe: Espaço"], "um aberto por vez");
    assert.equal(block(container, "usuarios").getAttribute("aria-expanded"), "false");
    await press(block(container, "espaco"));
    assert.equal(details(container).length, 0, "o mesmo bloco fecha");

    await keyOnBlock(block(container, "situacao"), "Enter");
    assert.deepEqual(details(container).map((el) => el.getAttribute("aria-label")), ["Detalhe: Situação"], "Enter abre");
    await keyOnBlock(block(container, "situacao"), " ");
    assert.equal(details(container).length, 0, "Espaço fecha");

    await keyOnBlock(block(container, "plano"), "Enter");
    assert.equal(details(container).length, 1);
    await escapeOn(container);
    assert.equal(details(container).length, 0, "Esc fecha");
    assert.equal(dom.doc.activeElement, block(container, "plano"), "o foco volta ao bloco");

    await press(block(container, "pagar"));
    await press(button(container, "Fechar"));
    assert.equal(details(container).length, 0, "\"Fechar\" fecha");
  } finally {
    await unmount();
  }
});

test("T-L4 403 → \"Acesso não permitido\", sem dado nenhum", async () => {
  const { container, unmount } = await mount({ reply: () => json(403, { error: { code: "FORBIDDEN", reason: "platform_actor_not_a_customer", message: "x" } }) });
  try {
    const content = pageText(container);
    assert.match(content, /Acesso não permitido/);
    for (const data of [/Plus/, /de 20 usuários/, /Em atraso/, /Em dia/, /Fatura em aberto/]) assert.doesNotMatch(content, data);
    assert.equal(elements(pageRoot(container), (el) => el.hasAttribute("data-bloco")).length, 0);
  } finally {
    await unmount();
  }
});

test("T-L5 500 sem dado anterior → erro e \"Tentar de novo\"; o clique recarrega", async () => {
  const { container, unmount } = await mount({ reply: (_call, count) => (count === 1 ? json(500, { error: { code: "INTERNAL", message: "x" } }) : json(200, { data: overdueView() })) });
  try {
    assert.match(pageText(container), /Não foi possível carregar a assinatura/);
    assert.doesNotMatch(pageText(container), /de 20 usuários/);
    const before = calls.length;
    await press(button(container, "Tentar de novo"));
    assert.equal(calls.length, before + 1, "o clique pede de novo");
    assert.match(pageText(container), /18 de 20 usuários/);
    assert.doesNotMatch(pageText(container), /Não foi possível carregar/);
  } finally {
    await unmount();
  }
});

test("T-L6 falha em 2º plano com dado anterior → o dado fica, com o aviso de desatualizado", async () => {
  const { container, unmount } = await mount({ reply: (_call, count) => (count === 1 ? json(200, { data: overdueView() }) : json(500, { error: { code: "INTERNAL", message: "x" } })) });
  try {
    assert.match(pageText(container), /18 de 20 usuários/);
    assert.doesNotMatch(pageText(container), /Dados desatualizados/);
    await tickBackground();
    const content = pageText(container);
    assert.match(content, /18 de 20 usuários/, "o dado anterior fica");
    assert.match(content, /Dados desatualizados — última atualização às \d{2}:\d{2}/);
    assert.ok(button(container, "Tentar de novo"), "com \"Tentar de novo\"");
    assert.equal(elements(pageRoot(container), (el) => el.getAttribute("data-state") === "stale").length, 1);
  } finally {
    await unmount();
  }
});

test("T-L7 \"Ver usuários\" aparece com users.read ou users:read e some sem as duas", async () => {
  for (const [permissions, expected] of [
    [[...BILLING, "users.read"], true],
    [[...BILLING, "users:read"], true],
    [BILLING, false],
  ] as const) {
    const { container, unmount } = await mount({ permissions });
    try {
      await press(block(container, "usuarios"));
      assert.equal(Boolean(button(container, "Ver usuários")), expected, `permissões ${JSON.stringify(permissions)}`);
    } finally {
      await unmount();
    }
  }
});

function installClipboard(writeText: (copied: string) => Promise<void>) {
  const nav = globalThis.navigator as unknown as Record<string, unknown>;
  Object.defineProperty(nav, "clipboard", { configurable: true, value: { writeText } });
  return () => {
    delete nav.clipboard;
  };
}

test("T-L9 \"Copiar dados da fatura\" grava o nome da organização da sessão e o vencimento, sem R$; recusada, avisa e não diz que copiou", async () => {
  const written: string[] = [];
  let restore = installClipboard(async (copied) => {
    written.push(copied);
  });
  const { container, unmount } = await mount();
  try {
    await press(block(container, "pagar"));
    await press(button(container, "Copiar dados da fatura"));
    assert.deepEqual(written, [`${SESSION_ORG} · fatura em aberto · vencimento 11/10/2026`]);
    assert.doesNotMatch(written[0], /R\$|Nome do Contexto/);
    assert.match(pageText(container), /Dados da fatura copiados/);

    restore();
    restore = installClipboard(async () => {
      throw new Error("negado");
    });
    await press(button(container, "Copiar dados da fatura"));
    const content = pageText(container);
    assert.match(content, /Não foi possível copiar os dados da fatura/);
    assert.match(content, new RegExp(`Anote: ${SESSION_ORG} · vencimento 11/10/2026`));
    assert.doesNotMatch(content, /Dados da fatura copiados/, "sem a mensagem de sucesso");
  } finally {
    restore();
    await unmount();
  }
});

test("T-L8 0 erro no console em todo o arquivo", () => {
  assert.deepEqual(consoleErrors, []);
});
