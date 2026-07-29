import "./styles.css";
import { login, requestRemoval, type LoginOutcome, type RemovalInput } from "./api.js";

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
