import "./styles.css";
import { login, type LoginOutcome } from "./api.js";

// Ω5P PR-18a — shell do authority-portal (PWA mobile-first, white-label, PT-BR). FUNDAÇÃO de auth (18a): tela de
// LOGIN (usuário/senha + PoW transparente). A solicitar-remoção é 18b. A SESSÃO (JWE) vive só em MEMÓRIA (nunca
// persistida); expira em ~30min. Alvos de toque ≥44px; estados loading/erro-genérico/bloqueado-genérico/offline.
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

// Sucesso do login (18a). A solicitar-remoção é 18b; aqui é o placeholder honesto do próximo passo.
function renderAuthenticated(): void {
  if (!root) return;
  // Guarda de sessão: sem a JWE em memória não há acesso (a solicitar-remoção 18b a enviará no Bearer).
  if (!authoritySession) {
    renderLogin();
    return;
  }
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("span", { class: "confirm-icon", ariaHidden: "true" }, ["✓"]),
        el("h2", { class: "message-title" }, ["Acesso autorizado"]),
        el("p", { class: "message-body" }, [
          authorityName
            ? `Você está autenticado como ${authorityName}. A solicitação de remoção estará disponível nesta área.`
            : "Você está autenticado. A solicitação de remoção estará disponível nesta área.",
        ]),
      ]),
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
