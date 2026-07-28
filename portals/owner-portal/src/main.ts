import "./styles.css";
import { lookupVehicle, type LookupOutcome, type OwnerProcess } from "./api.js";

// Ω5P PR-16 — shell do owner-portal (PWA mobile-first, white-label, PT-BR). Duas telas: consulta (placa+Renavam +
// verificação de segurança PoW no Web Worker) e resultado minimizado. Sessão em memória (uso pela PR-17); nunca
// persistida. Alvos de toque ≥44px; estados loading/erro/uniforme.

const root = document.querySelector<HTMLDivElement>("#app");

// Sessão retornada pelo BFF em FOUND (será consumida pela PR-17 p/ fotos/débitos itemizados). Efêmera, em memória.
let ownerSession: string | null = null;

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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function header(): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("div", { class: "brand" }, [
      el("span", { class: "brand-mark", ariaHidden: "true" }, ["◈"]),
      el("span", { class: "brand-text" }, ["Consulta de veículo em pátio"]),
    ]),
  ]);
}

function renderConsulta(prefill?: { plate: string; renavam: string }): void {
  if (!root) return;
  root.replaceChildren();

  const plateInput = el("input", {
    class: "field-input",
    id: "plate",
    name: "plate",
    type: "text",
    autocomplete: "off",
    inputMode: "text",
    maxLength: 10,
    placeholder: "ABC1D23",
    value: prefill?.plate ?? "",
  });
  plateInput.setAttribute("aria-label", "Placa do veículo");
  plateInput.addEventListener("input", () => {
    plateInput.value = plateInput.value.toUpperCase();
  });

  const renavamInput = el("input", {
    class: "field-input",
    id: "renavam",
    name: "renavam",
    type: "text",
    autocomplete: "off",
    inputMode: "numeric",
    maxLength: 20,
    placeholder: "Somente números",
    value: prefill?.renavam ?? "",
  });
  renavamInput.setAttribute("aria-label", "Renavam do veículo");

  const error = el("p", { class: "form-error", role: "alert" });

  const submit = el("button", { class: "btn-primary", type: "submit" }, ["Consultar situação"]);

  const form = el("form", { class: "card form", noValidate: true }, [
    el("label", { class: "field-label", htmlFor: "plate" }, ["Placa"]),
    plateInput,
    el("label", { class: "field-label", htmlFor: "renavam" }, ["Renavam"]),
    renavamInput,
    el("p", { class: "field-hint" }, ["Os dois dados são exigidos para localizar o processo. A verificação de segurança é automática."]),
    error,
    submit,
  ]);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const plate = plateInput.value.trim();
    const renavam = renavamInput.value.trim();
    if (plate.length < 5 || renavam.length < 4) {
      error.textContent = "Informe a placa e o Renavam do veículo.";
      return;
    }
    error.textContent = "";
    runLookup(plate, renavam);
  });

  root.append(
    header(),
    el("main", { class: "screen" }, [
      el("h1", { class: "screen-title" }, ["Situação do veículo"]),
      el("p", { class: "screen-lead" }, ["Informe a placa e o Renavam para ver a situação do veículo no pátio, o local e os débitos atualizados."]),
      form,
      el("p", { class: "legal-note" }, ["Consulta oficial do órgão responsável. Nenhum dado pessoal do proprietário é exibido."]),
    ]),
  );
}

function runLookup(plate: string, renavam: string): void {
  renderLoading();
  void lookupVehicle(plate, renavam).then((outcome) => renderResult(outcome, { plate, renavam }));
}

function renderLoading(): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card loading", role: "status", ariaLive: "polite" }, [
        el("div", { class: "spinner", ariaHidden: "true" }),
        el("p", { class: "loading-text" }, ["Verificando a segurança e consultando…"]),
        el("p", { class: "loading-sub" }, ["Isto pode levar alguns segundos."]),
      ]),
    ]),
  );
}

function statusChip(status: string, label: string): HTMLElement {
  const tone =
    status === "RELEASED" || status === "RELEASED_FOR_REPAIR"
      ? "ok"
      : status === "AUCTIONED" || status === "AUCTION_CLOSED" || status === "DIRECT_RECYCLING" || status === "CLOSED"
        ? "danger"
        : status.startsWith("AUCTION") || status === "JUDICIAL_HOLD"
          ? "warn"
          : "info";
  return el("span", { class: `chip chip-${tone}` }, [label]);
}

function renderResult(outcome: LookupOutcome, last: { plate: string; renavam: string }): void {
  if (!root) return;
  if (outcome.kind === "found") {
    ownerSession = outcome.session;
    renderFound(outcome.process);
    return;
  }
  if (outcome.kind === "rate_limited") {
    renderMessage("Muitas tentativas", "Você fez muitas consultas em pouco tempo. Aguarde alguns minutos e tente novamente.", last);
    return;
  }
  if (outcome.kind === "error") {
    renderMessage("Não foi possível consultar", "Ocorreu um problema ao concluir a consulta. Verifique sua conexão e tente novamente.", last);
    return;
  }
  // not_found — mensagem UNIFORME e honesta (não revela se a placa existe).
  renderMessage(
    "Sem resultado para os dados informados",
    "Se houver um processo correspondente à placa e ao Renavam informados, ele aparecerá aqui. Confira os dados e tente novamente.",
    last,
  );
}

function infoRow(label: string, value: string): HTMLElement {
  return el("div", { class: "info-row" }, [
    el("span", { class: "info-label" }, [label]),
    el("span", { class: "info-value" }, [value]),
  ]);
}

function renderFound(process: OwnerProcess): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card result" }, [
        el("div", { class: "result-head" }, [
          el("span", { class: "result-eyebrow" }, ["Situação atual"]),
          statusChip(process.status, process.statusLabel),
        ]),
        el("div", { class: "info-list" }, [
          infoRow("Pátio", process.yardPublicName ?? "—"),
          infoRow("Endereço", process.yardPublicAddress ?? "—"),
          infoRow("Entrada no pátio", formatDate(process.enteredAt)),
        ]),
        el("div", { class: "due-box" }, [
          el("span", { class: "due-label" }, ["Débitos atualizados"]),
          el("strong", { class: "due-value" }, [process.totalDueLabel]),
          el("span", { class: "due-note" }, ["Valor de referência. A liberação e o pagamento são feitos junto ao órgão/pátio responsável."]),
        ]),
      ]),
      el("button", { class: "btn-secondary", type: "button", onclick: () => renderConsulta() }, ["Nova consulta"]),
    ]),
  );
}

function renderMessage(title: string, body: string, last: { plate: string; renavam: string }): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("h2", { class: "message-title" }, [title]),
        el("p", { class: "message-body" }, [body]),
      ]),
      el("button", { class: "btn-primary", type: "button", onclick: () => renderConsulta(last) }, ["Tentar novamente"]),
    ]),
  );
}

// Sessão do proprietário (efêmera) — exposta p/ a PR-17 (fotos/débitos itemizados). Marcada como usada aqui.
export function getOwnerSession(): string | null {
  return ownerSession;
}

renderConsulta();

// Registro do service worker (PWA installable / offline-tolerante). Falha silenciosa não quebra a consulta.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
