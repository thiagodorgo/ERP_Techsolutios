import "./styles.css";
import {
  decideApproval,
  listApprovals,
  login,
  requestRemoval,
  type DecideInput,
  type LoginOutcome,
  type PendingApprovalItem,
  type RemovalInput,
} from "./api.js";

// Ω5P PR-18a/b — shell do authority-portal (PWA mobile-first, white-label, PT-BR). LOGIN (18a) + SOLICITAR REMOÇÃO
// (18b: placa → local → fundamento → confirmação). A SESSÃO (JWE) vive só em MEMÓRIA (nunca persistida); expira em
// ~30min → 401 devolve ao login. Alvos de toque ≥44px; estados loading/vazio/erro/sessão-expirada/offline.
// White-label: "autoridade solicitante/órgão/pátio", NUNCA "polícia".

const root = document.querySelector<HTMLDivElement>("#app");

// Sessão da autoridade (efêmera, em memória). Emitida no login OK; consumida pela solicitar-remoção (18b).
let authoritySession: string | null = null;
let authorityName: string | null = null;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: className, ...rest } = props;
  if (className) node.className = className;
  Object.assign(node, rest);
  for (const child of children) node.append(typeof child === "string" ? document.createTextNode(child) : child);
  return node;
}

function header(): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("div", { class: "brand" }, [
      el("span", { class: "brand-mark", ariaHidden: "true" }, ["▤"]),
      el("span", { class: "brand-text" }, ["Portal da autoridade solicitante"]),
    ]),
  ]);
}

// Ω5P PR-19 — navegação entre "Solicitar remoção" (18b) e "Aprovações pendentes" (19), só quando autenticado.
function nav(active: "removal" | "approvals"): HTMLElement {
  const removalBtn = el(
    "button",
    { class: active === "removal" ? "nav-tab nav-tab-active" : "nav-tab", type: "button", onclick: () => renderRemovalForm() },
    ["Solicitar remoção"],
  );
  const approvalsBtn = el(
    "button",
    { class: active === "approvals" ? "nav-tab nav-tab-active" : "nav-tab", type: "button", onclick: () => renderApprovals() },
    ["Aprovações pendentes"],
  );
  removalBtn.setAttribute("aria-current", active === "removal" ? "page" : "false");
  approvalsBtn.setAttribute("aria-current", active === "approvals" ? "page" : "false");
  return el("nav", { class: "nav-tabs", ariaLabel: "Navegação do portal" }, [removalBtn, approvalsBtn]);
}

// ── LOGIN ────────────────────────────────────────────────────────────────────────────────────────────────────────
function renderLogin(prefillUsername = ""): void {
  if (!root) return;
  root.replaceChildren();

  const usernameInput = el("input", {
    class: "field-input", id: "username", name: "username", type: "text", autocomplete: "username",
    inputMode: "text", maxLength: 64, placeholder: "usuario.orgao", value: prefillUsername,
  });
  usernameInput.setAttribute("aria-label", "Usuário");

  const passwordInput = el("input", {
    class: "field-input", id: "password", name: "password", type: "password", autocomplete: "current-password",
    maxLength: 200, placeholder: "Sua senha",
  });
  passwordInput.setAttribute("aria-label", "Senha");

  const error = el("p", { class: "form-error", role: "alert" });
  const submit = el("button", { class: "btn-primary", type: "submit" }, ["Entrar"]);

  const form = el("form", { class: "card form", noValidate: true }, [
    el("label", { class: "field-label", htmlFor: "username" }, ["Usuário"]),
    usernameInput,
    el("label", { class: "field-label", htmlFor: "password" }, ["Senha"]),
    passwordInput,
    el("p", { class: "field-hint" }, ["Acesso restrito à autoridade solicitante credenciada. A verificação de segurança é automática."]),
    error,
    submit,
  ]);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (username.length < 3 || password.length < 1) {
      error.textContent = "Informe o usuário e a senha.";
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      renderMessage("Você está offline", "Conecte-se à internet para acessar o portal.", username);
      return;
    }
    error.textContent = "";
    runLogin(username, password);
  });

  root.append(
    header(),
    el("main", { class: "screen" }, [
      el("h1", { class: "screen-title" }, ["Acesso da autoridade"]),
      el("p", { class: "screen-lead" }, ["Entre com suas credenciais para solicitar a remoção de veículo e acompanhar os pátios do órgão."]),
      form,
      el("p", { class: "legal-note" }, ["Acesso oficial e auditado. Uso exclusivo da autoridade solicitante credenciada."]),
    ]),
  );
}

function runLogin(username: string, password: string): void {
  renderLoading("Verificando a segurança e autenticando…");
  void login(username, password).then((outcome) => onLogin(outcome, username));
}

function onLogin(outcome: LoginOutcome, username: string): void {
  if (outcome.kind === "authenticated") {
    authoritySession = outcome.session;
    authorityName = outcome.authorityName;
    renderAuthenticated();
    return;
  }
  if (outcome.kind === "rate_limited") {
    // Bloqueio genérico — NÃO revela se a conta está travada por lockout ou o IP por rate-limit.
    renderMessage("Muitas tentativas", "Foram feitas muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.", username);
    return;
  }
  if (outcome.kind === "error") {
    renderMessage("Não foi possível acessar", "Ocorreu um problema ao concluir o acesso. Verifique sua conexão e tente novamente.", username);
    return;
  }
  // invalid — mensagem UNIFORME (não revela se o usuário existe, se a senha errou ou se a conta está bloqueada).
  renderLoginError(username, "Usuário ou senha inválidos.");
}

// Sucesso do login → tela de SOLICITAR REMOÇÃO (18b). Guarda de sessão: sem a JWE em memória, volta ao login.
function renderAuthenticated(): void {
  renderRemovalForm();
}

// ── SOLICITAR REMOÇÃO (18b) ──────────────────────────────────────────────────────────────────────────────────────
// Formulário: placa (obrigatória) → local (opcional) → fundamento (opcional) → confirmação. A sessão JWE do login
// autoriza (Bearer); o órgão vem da credencial (nunca digitado aqui — anti-spoof).
function renderRemovalForm(error = ""): void {
  if (!root) return;
  if (!authoritySession) {
    renderLogin();
    return;
  }

  const plateInput = el("input", {
    class: "field-input", id: "plate", name: "plate", type: "text", autocomplete: "off",
    inputMode: "text", maxLength: 10, placeholder: "ABC1D23",
  });
  plateInput.setAttribute("aria-label", "Placa do veículo");
  plateInput.style.textTransform = "uppercase";

  const locationInput = el("input", {
    class: "field-input", id: "location", name: "location", type: "text", autocomplete: "off",
    maxLength: 200, placeholder: "Endereço ou ponto de referência",
  });
  locationInput.setAttribute("aria-label", "Local do veículo");

  const basisInput = el("textarea", {
    class: "field-input", id: "legalBasis", name: "legalBasis", maxLength: 240, rows: 3,
    placeholder: "Fundamento legal da remoção (opcional)",
  });
  basisInput.setAttribute("aria-label", "Fundamento legal");

  const errorNode = el("p", { class: "form-error", role: "alert" }, [error]);
  const submit = el("button", { class: "btn-primary", type: "submit" }, ["Solicitar remoção"]);

  const form = el("form", { class: "card form", noValidate: true }, [
    el("label", { class: "field-label", htmlFor: "plate" }, ["Placa do veículo"]),
    plateInput,
    el("label", { class: "field-label", htmlFor: "location" }, ["Local do veículo"]),
    locationInput,
    el("label", { class: "field-label", htmlFor: "legalBasis" }, ["Fundamento legal"]),
    basisInput,
    el("p", { class: "field-hint" }, ["A solicitação origina o atendimento e é registrada de forma auditada. O órgão é identificado pela sua credencial."]),
    errorNode,
    submit,
  ]);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const plate = plateInput.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (plate.length < 5) {
      errorNode.textContent = "Informe a placa do veículo.";
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      errorNode.textContent = "Você está offline. Conecte-se para enviar a solicitação.";
      return;
    }
    errorNode.textContent = "";
    runRemoval({
      plate,
      location: locationInput.value.trim() || undefined,
      legalBasis: (basisInput as HTMLTextAreaElement).value.trim() || undefined,
    });
  });

  root.replaceChildren(
    header(),
    nav("removal"),
    el("main", { class: "screen" }, [
      el("h1", { class: "screen-title" }, ["Solicitar remoção"]),
      el("p", { class: "screen-lead" }, [
        authorityName ? `${authorityName} — informe os dados do veículo a ser removido.` : "Informe os dados do veículo a ser removido.",
      ]),
      form,
      el("button", { class: "btn-secondary", type: "button", onclick: () => signOut() }, ["Sair"]),
    ]),
  );
}

function runRemoval(input: RemovalInput): void {
  if (!authoritySession) {
    renderLogin();
    return;
  }
  renderLoading("Registrando a solicitação de remoção…");
  void requestRemoval(authoritySession, input).then((outcome) => {
    if (outcome.kind === "received") {
      renderRemovalConfirmed();
      return;
    }
    if (outcome.kind === "session_expired") {
      // Sessão expirada/revogada → volta ao login (a JWE em memória não vale mais).
      authoritySession = null;
      authorityName = null;
      renderLogin();
      const err = root?.querySelector<HTMLParagraphElement>(".form-error");
      if (err) err.textContent = "Sua sessão expirou. Entre novamente para continuar.";
      return;
    }
    if (outcome.kind === "rate_limited") {
      renderRemovalForm("Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente.");
      return;
    }
    if (outcome.kind === "invalid") {
      renderRemovalForm("Verifique os dados informados e tente novamente.");
      return;
    }
    renderRemovalForm("Não foi possível enviar a solicitação. Verifique sua conexão e tente novamente.");
  });
}

function renderRemovalConfirmed(): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("span", { class: "confirm-icon", ariaHidden: "true" }, ["✓"]),
        el("h2", { class: "message-title" }, ["Solicitação registrada"]),
        el("p", { class: "message-body" }, [
          "A solicitação de remoção foi registrada e encaminhada para atendimento. O acompanhamento fica disponível no console do órgão.",
        ]),
      ]),
      el("button", { class: "btn-primary", type: "button", onclick: () => renderRemovalForm() }, ["Nova solicitação"]),
      el("button", { class: "btn-secondary", type: "button", onclick: () => signOut() }, ["Sair"]),
    ]),
  );
}

// ── APROVAÇÕES PENDENTES (PR-19) ────────────────────────────────────────────────────────────────────────────────
// Lista → decisão (aprovar/rejeitar com motivo) → confirmação. Estados: loading/vazio/erro/sessão-expirada/offline.
function renderApprovals(): void {
  if (!root) return;
  if (!authoritySession) {
    renderLogin();
    return;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    renderApprovalsOffline();
    return;
  }
  renderApprovalsLoading();
  void listApprovals(authoritySession).then((outcome) => {
    if (outcome.kind === "ok") {
      renderApprovalsList(outcome.items);
      return;
    }
    if (outcome.kind === "session_expired") {
      authoritySession = null;
      authorityName = null;
      renderLogin();
      const err = root?.querySelector<HTMLParagraphElement>(".form-error");
      if (err) err.textContent = "Sua sessão expirou. Entre novamente para continuar.";
      return;
    }
    if (outcome.kind === "rate_limited") {
      renderApprovalsError("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
      return;
    }
    renderApprovalsError("Não foi possível carregar as aprovações pendentes. Verifique sua conexão e tente novamente.");
  });
}

function renderApprovalsLoading(): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    nav("approvals"),
    el("main", { class: "screen" }, [
      el("div", { class: "card loading", role: "status", ariaLive: "polite" }, [
        el("div", { class: "spinner", ariaHidden: "true" }),
        el("p", { class: "loading-text" }, ["Carregando aprovações pendentes…"]),
      ]),
    ]),
  );
}

function renderApprovalsOffline(): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    nav("approvals"),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("h2", { class: "message-title" }, ["Você está offline"]),
        el("p", { class: "message-body" }, ["Conecte-se à internet para ver as aprovações pendentes."]),
      ]),
      el("button", { class: "btn-primary", type: "button", onclick: () => renderApprovals() }, ["Tentar novamente"]),
    ]),
  );
}

function renderApprovalsError(message: string): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    nav("approvals"),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("h2", { class: "message-title" }, ["Não foi possível carregar"]),
        el("p", { class: "message-body" }, [message]),
      ]),
      el("button", { class: "btn-primary", type: "button", onclick: () => renderApprovals() }, ["Tentar novamente"]),
    ]),
  );
}

function formatRequestedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function renderApprovalsList(items: readonly PendingApprovalItem[]): void {
  if (!root) return;
  if (items.length === 0) {
    root.replaceChildren(
      header(),
      nav("approvals"),
      el("main", { class: "screen" }, [
        el("h1", { class: "screen-title" }, ["Aprovações pendentes"]),
        el("div", { class: "card message" }, [
          el("p", { class: "message-body" }, ["Nenhuma liberação aguardando sua aprovação no momento."]),
        ]),
      ]),
    );
    return;
  }

  const cards = items.map((item) => renderApprovalCard(item));
  root.replaceChildren(
    header(),
    nav("approvals"),
    el("main", { class: "screen" }, [
      el("h1", { class: "screen-title" }, ["Aprovações pendentes"]),
      el("p", { class: "screen-lead" }, ["Só aparecem aqui os processos originados pela sua credencial."]),
      el("div", { class: "approvals-list" }, cards),
    ]),
  );
}

function renderApprovalCard(item: PendingApprovalItem): HTMLElement {
  const errorNode = el("p", { class: "form-error", role: "alert" });
  const noteInput = el("textarea", {
    class: "field-input", maxLength: 500, rows: 2, placeholder: "Motivo (obrigatório para rejeitar)",
  });
  noteInput.setAttribute("aria-label", "Motivo da decisão");
  const referenceInput = el("input", {
    class: "field-input", type: "text", maxLength: 120, placeholder: "Nº do ato/decisão (opcional)",
  });
  referenceInput.setAttribute("aria-label", "Referência do ato");

  const approveBtn = el("button", { class: "btn-primary", type: "button" }, ["Aprovar"]);
  const rejectBtn = el("button", { class: "btn-secondary", type: "button" }, ["Rejeitar"]);

  const submit = (decision: DecideInput["decision"]) => {
    errorNode.textContent = "";
    const note = (noteInput as HTMLTextAreaElement).value.trim() || undefined;
    if (decision === "REJECT" && !note) {
      errorNode.textContent = "Informe o motivo da rejeição.";
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      errorNode.textContent = "Você está offline. Conecte-se para enviar a decisão.";
      return;
    }
    runDecide(item.processId, { decision, reference: referenceInput.value.trim() || undefined, note });
  };
  approveBtn.addEventListener("click", () => submit("APPROVE"));
  rejectBtn.addEventListener("click", () => submit("REJECT"));

  return el("article", { class: "card approval-card" }, [
    el("h2", { class: "message-title" }, [item.vehiclePlate ?? "Placa não identificada"]),
    el("p", { class: "field-hint" }, [`Solicitado em ${formatRequestedAt(item.requestedAt)} · ${item.kind === "FOR_REPAIR" ? "Saída para reparo" : "Restituição"}`]),
    item.pendingRequirements.length > 0
      ? el("p", { class: "field-hint" }, [`Requisitos pendentes: ${item.pendingRequirements.join(", ")}`])
      : el("p", { class: "field-hint" }, ["Nenhum requisito pendente."]),
    el("label", { class: "field-label" }, ["Referência do ato (aprovação)"]),
    referenceInput,
    el("label", { class: "field-label" }, ["Motivo (rejeição)"]),
    noteInput,
    errorNode,
    el("div", { class: "approval-actions" }, [approveBtn, rejectBtn]),
  ]);
}

function runDecide(processId: string, input: DecideInput): void {
  if (!authoritySession) {
    renderLogin();
    return;
  }
  renderApprovalsLoading();
  void decideApproval(authoritySession, processId, input).then((outcome) => {
    if (outcome.kind === "decided") {
      renderApprovalDecided(outcome.decision);
      return;
    }
    if (outcome.kind === "session_expired") {
      authoritySession = null;
      authorityName = null;
      renderLogin();
      const err = root?.querySelector<HTMLParagraphElement>(".form-error");
      if (err) err.textContent = "Sua sessão expirou. Entre novamente para continuar.";
      return;
    }
    // not_found/conflict/rate_limited/invalid/error → volta à lista atualizada com mensagem genérica.
    void listApprovals(authoritySession as string).then((listOutcome) => {
      if (listOutcome.kind === "ok") {
        renderApprovalsList(listOutcome.items);
        const hint = root?.querySelector<HTMLParagraphElement>(".screen-lead");
        if (hint) {
          const messages: Record<string, string> = {
            not_found: "Este processo não está mais disponível para decisão.",
            conflict: "Esta liberação já foi decidida.",
            rate_limited: "Muitas tentativas em pouco tempo. Aguarde alguns minutos.",
            invalid: "Verifique os dados informados.",
            error: "Não foi possível concluir a decisão. Tente novamente.",
          };
          hint.textContent = messages[outcome.kind] ?? messages.error;
        }
        return;
      }
      renderApprovalsError("Não foi possível concluir a decisão. Verifique sua conexão e tente novamente.");
    });
  });
}

function renderApprovalDecided(decision: "APPROVED" | "REJECTED"): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    nav("approvals"),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("span", { class: "confirm-icon", ariaHidden: "true" }, [decision === "APPROVED" ? "✓" : "✕"]),
        el("h2", { class: "message-title" }, [decision === "APPROVED" ? "Liberação aprovada" : "Liberação rejeitada"]),
        el("p", { class: "message-body" }, [
          decision === "APPROVED"
            ? "A liberação foi autorizada e a decisão foi registrada."
            : "A rejeição foi registrada com o motivo informado.",
        ]),
      ]),
      el("button", { class: "btn-primary", type: "button", onclick: () => renderApprovals() }, ["Ver aprovações pendentes"]),
      el("button", { class: "btn-secondary", type: "button", onclick: () => signOut() }, ["Sair"]),
    ]),
  );
}

function signOut(): void {
  authoritySession = null;
  authorityName = null;
  renderLogin();
}

// ── ESTADOS GENÉRICOS ────────────────────────────────────────────────────────────────────────────────────────────
function renderLoading(text: string): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card loading", role: "status", ariaLive: "polite" }, [
        el("div", { class: "spinner", ariaHidden: "true" }),
        el("p", { class: "loading-text" }, [text]),
        el("p", { class: "loading-sub" }, ["Isto pode levar alguns segundos."]),
      ]),
    ]),
  );
}

// Erro de login: volta ao formulário (prefill do usuário) com a mensagem genérica.
function renderLoginError(username: string, message: string): void {
  renderLogin(username);
  if (!root) return;
  const error = root.querySelector<HTMLParagraphElement>(".form-error");
  if (error) error.textContent = message;
}

function renderMessage(title: string, body: string, username: string): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("h2", { class: "message-title" }, [title]),
        el("p", { class: "message-body" }, [body]),
      ]),
      el("button", { class: "btn-primary", type: "button", onclick: () => renderLogin(username) }, ["Voltar ao acesso"]),
    ]),
  );
}

renderLogin();

// Registro do service worker (PWA installable / offline-tolerante). Falha silenciosa não quebra o acesso.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
