import "./styles.css";
import {
  fetchDossier,
  lookupVehicle,
  submitReleaseRequest,
  type DossierOutcome,
  type LookupOutcome,
  type OwnerDossier,
} from "./api.js";

// Ω5P PR-16/17 — shell do owner-portal (PWA mobile-first, white-label, PT-BR). Fluxo: consulta (placa+Renavam +
// PoW) → dossiê detalhado minimizado (situação · veículo · débitos itemizados · prazos · exigências · fotos-
// placeholder) → solicitar liberação. A SESSÃO (JWE) vive só em MEMÓRIA (nunca persistida); expira em ~15min → o
// PWA pede refazer a consulta. Alvos de toque ≥44px; estados loading/erro/sessão-expirada/offline/uniforme.

const root = document.querySelector<HTMLDivElement>("#app");

// Sessão do proprietário (efêmera, em memória). Emitida no lookup FOUND, consumida no dossiê / solicitar liberação.
let ownerSession: string | null = null;
let lastQuery: { plate: string; renavam: string } = { plate: "", renavam: "" };

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

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function header(): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("div", { class: "brand" }, [
      el("span", { class: "brand-mark", ariaHidden: "true" }, ["◈"]),
      el("span", { class: "brand-text" }, ["Consulta de veículo em pátio"]),
    ]),
  ]);
}

// ── CONSULTA (placa + Renavam) ───────────────────────────────────────────────────────────────────────────────────
function renderConsulta(prefill?: { plate: string; renavam: string }): void {
  if (!root) return;
  root.replaceChildren();

  const plateInput = el("input", {
    class: "field-input", id: "plate", name: "plate", type: "text", autocomplete: "off",
    inputMode: "text", maxLength: 10, placeholder: "ABC1D23", value: prefill?.plate ?? "",
  });
  plateInput.setAttribute("aria-label", "Placa do veículo");
  plateInput.addEventListener("input", () => {
    plateInput.value = plateInput.value.toUpperCase();
  });

  const renavamInput = el("input", {
    class: "field-input", id: "renavam", name: "renavam", type: "text", autocomplete: "off",
    inputMode: "numeric", maxLength: 20, placeholder: "Somente números", value: prefill?.renavam ?? "",
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
      el("p", { class: "screen-lead" }, ["Informe a placa e o Renavam para ver a situação do veículo no pátio, o local, os débitos e as pendências."]),
      form,
      el("p", { class: "legal-note" }, ["Consulta oficial do órgão responsável. Nenhum dado pessoal do proprietário é exibido."]),
    ]),
  );
}

function runLookup(plate: string, renavam: string): void {
  lastQuery = { plate, renavam };
  renderLoading("Verificando a segurança e consultando…");
  void lookupVehicle(plate, renavam).then((outcome) => onLookup(outcome));
}

function onLookup(outcome: LookupOutcome): void {
  if (outcome.kind === "found") {
    ownerSession = outcome.session;
    loadDossier(); // FOUND → navega ao dossiê detalhado usando a sessão
    return;
  }
  if (outcome.kind === "rate_limited") {
    renderMessage("Muitas tentativas", "Você fez muitas consultas em pouco tempo. Aguarde alguns minutos e tente novamente.", "retry");
    return;
  }
  if (outcome.kind === "error") {
    renderMessage("Não foi possível consultar", "Ocorreu um problema ao concluir a consulta. Verifique sua conexão e tente novamente.", "retry");
    return;
  }
  // not_found — mensagem UNIFORME e honesta (não revela se a placa existe).
  renderMessage(
    "Sem resultado para os dados informados",
    "Se houver um processo correspondente à placa e ao Renavam informados, ele aparecerá aqui. Confira os dados e tente novamente.",
    "retry",
  );
}

// ── DOSSIÊ DETALHADO ─────────────────────────────────────────────────────────────────────────────────────────────
function loadDossier(): void {
  if (!ownerSession) {
    renderExpired();
    return;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    renderMessage("Você está offline", "Conecte-se à internet para carregar os dados do veículo.", "reloadDossier");
    return;
  }
  renderLoading("Carregando os dados do veículo…");
  const session = ownerSession;
  void fetchDossier(session).then((outcome) => onDossier(outcome));
}

function onDossier(outcome: DossierOutcome): void {
  if (outcome.kind === "ok") {
    renderDossier(outcome.dossier);
    return;
  }
  if (outcome.kind === "session_invalid") {
    renderExpired();
    return;
  }
  if (outcome.kind === "rate_limited") {
    renderMessage("Muitas tentativas", "Aguarde alguns minutos antes de consultar novamente.", "reloadDossier");
    return;
  }
  renderMessage("Não foi possível carregar", "Ocorreu um problema ao carregar os dados. Tente novamente.", "reloadDossier");
}

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

function infoRow(label: string, value: string): HTMLElement {
  return el("div", { class: "info-row" }, [
    el("span", { class: "info-label" }, [label]),
    el("span", { class: "info-value" }, [value]),
  ]);
}

function sectionTitle(text: string): HTMLElement {
  return el("h2", { class: "section-title" }, [text]);
}

function vehicleDescriptor(vehicle: OwnerDossier["vehicle"]): string {
  const parts = [vehicle.brand, vehicle.model, vehicle.color, vehicle.year ? String(vehicle.year) : null].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : "Veículo em identificação";
}

function chargesCard(charges: OwnerDossier["charges"]): HTMLElement {
  const items = charges.items.length
    ? charges.items.map((item) =>
        el("div", { class: "charge-item" }, [
          el("div", { class: "charge-item-head" }, [
            el("span", { class: "charge-kind" }, [item.kindLabel]),
            el("strong", { class: "charge-subtotal" }, [item.subtotalLabel]),
          ]),
          ...(item.dailyCount !== undefined
            ? [el("span", { class: "charge-meta" }, [`${item.dailyCount} diária(s)`])]
            : []),
          ...(item.capReachedLabel ? [el("span", { class: "charge-cap" }, [item.capReachedLabel])] : []),
        ]),
      )
    : [el("p", { class: "empty-note" }, ["Nenhum débito em aberto no momento."])];

  return el("div", { class: "card" }, [
    sectionTitle("Débitos atualizados"),
    el("div", { class: "charge-list" }, items),
    el("div", { class: "due-total" }, [
      el("span", { class: "due-label" }, ["Total devido"]),
      el("strong", { class: "due-value" }, [charges.totalDueLabel]),
    ]),
    el("p", { class: "due-note" }, ["Valor de referência. O pagamento é registrado junto ao órgão/pátio responsável."]),
  ]);
}

function deadlinesCard(deadlines: OwnerDossier["deadlines"]): HTMLElement {
  if (deadlines.length === 0) {
    return el("div", { class: "card" }, [
      sectionTitle("Prazos"),
      el("p", { class: "empty-note" }, ["Os prazos legais aparecem após a entrada do veículo no pátio."]),
    ]);
  }
  const timeline = el(
    "ol",
    { class: "timeline" },
    deadlines.map((deadline) => {
      const expired = deadline.elapsedLabel === "Prazo encerrado";
      return el("li", { class: `timeline-item${expired ? " timeline-item-past" : ""}` }, [
        el("span", { class: "timeline-dot", ariaHidden: "true" }),
        el("div", { class: "timeline-body" }, [
          el("span", { class: "timeline-label" }, [deadline.label]),
          el("span", { class: "timeline-date" }, [formatDay(deadline.dueDate)]),
          el("span", { class: `timeline-elapsed${expired ? " is-past" : ""}` }, [deadline.elapsedLabel]),
        ]),
      ]);
    }),
  );
  return el("div", { class: "card" }, [sectionTitle("Prazos legais"), timeline]);
}

function requirementsCard(requirements: OwnerDossier["requirements"]): HTMLElement {
  if (requirements.length === 0) {
    return el("div", { class: "card" }, [
      sectionTitle("Documentos para liberação"),
      el("p", { class: "empty-note" }, ["Consulte o órgão/pátio responsável sobre os documentos exigidos."]),
    ]);
  }
  const list = el(
    "ul",
    { class: "req-list" },
    requirements.map((requirement) =>
      el("li", { class: "req-item" }, [
        el("span", { class: "req-check", ariaHidden: "true" }, ["✓"]),
        el("span", { class: "req-label" }, [requirement.label]),
        requirement.required
          ? el("span", { class: "req-tag req-required" }, ["Obrigatório"])
          : el("span", { class: "req-tag" }, ["Opcional"]),
      ]),
    ),
  );
  return el("div", { class: "card" }, [
    sectionTitle("Documentos para liberação"),
    list,
    el("p", { class: "due-note" }, ["A liberação é aprovada pelo órgão/autoridade responsável junto ao pátio."]),
  ]);
}

function photosCard(photos: OwnerDossier["photos"]): HTMLElement {
  return el("div", { class: "card photos-card" }, [
    sectionTitle("Fotos da vistoria"),
    el("div", { class: "photos-placeholder" }, [
      el("span", { class: "photos-icon", ariaHidden: "true" }, ["▣"]),
      el("span", { class: "photos-count" }, [
        photos.setsAvailableCount > 0 ? `${photos.setsAvailableCount} conjunto(s) registrado(s)` : "Sem fotos registradas",
      ]),
    ]),
    el("p", { class: "due-note" }, [photos.availabilityLabel]),
  ]);
}

function renderDossier(dossier: OwnerDossier): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card" }, [
        el("div", { class: "result-head" }, [
          el("span", { class: "result-eyebrow" }, ["Situação atual"]),
          statusChip(dossier.status, dossier.statusLabel),
        ]),
        el("div", { class: "info-list" }, [
          infoRow("Veículo", vehicleDescriptor(dossier.vehicle)),
          infoRow("Pátio", dossier.yardPublicName ?? "—"),
          infoRow("Endereço", dossier.yardPublicAddress ?? "—"),
          infoRow("Entrada no pátio", formatDate(dossier.enteredAt)),
        ]),
      ]),
      chargesCard(dossier.charges),
      deadlinesCard(dossier.deadlines),
      requirementsCard(dossier.requirements),
      photosCard(dossier.photos),
      el("button", { class: "btn-primary", type: "button", onclick: () => renderReleaseForm() }, ["Solicitar liberação"]),
      el("button", { class: "btn-secondary", type: "button", onclick: () => renderConsulta() }, ["Nova consulta"]),
    ]),
  );
}

// ── SOLICITAR LIBERAÇÃO ──────────────────────────────────────────────────────────────────────────────────────────
function renderReleaseForm(): void {
  if (!root || !ownerSession) {
    renderExpired();
    return;
  }
  const note = el("textarea", {
    class: "field-textarea", id: "note", name: "note", rows: 4, maxLength: 500,
    placeholder: "Ex.: gostaria de retirar o veículo. (opcional)",
  });
  note.setAttribute("aria-label", "Observação da solicitação (opcional)");
  const error = el("p", { class: "form-error", role: "alert" });
  const submit = el("button", { class: "btn-primary", type: "submit" }, ["Enviar solicitação"]);

  const form = el("form", { class: "card form", noValidate: true }, [
    sectionTitle("Solicitar liberação"),
    el("p", { class: "field-hint" }, ["Registre sua intenção de retirar o veículo. O órgão/pátio responsável dará andamento e informará os próximos passos. Não anexe documentos aqui."]),
    el("label", { class: "field-label", htmlFor: "note" }, ["Observação (opcional)"]),
    note,
    error,
    submit,
  ]);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!ownerSession) {
      renderExpired();
      return;
    }
    error.textContent = "";
    submit.disabled = true;
    submit.textContent = "Enviando…";
    void submitReleaseRequest(ownerSession, note.value).then((outcome) => {
      if (outcome.kind === "ok") {
        renderReleaseConfirmation();
        return;
      }
      if (outcome.kind === "session_invalid") {
        renderExpired();
        return;
      }
      submit.disabled = false;
      submit.textContent = "Enviar solicitação";
      error.textContent =
        outcome.kind === "rate_limited"
          ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          : "Não foi possível enviar. Verifique sua conexão e tente novamente.";
    });
  });

  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      form,
      el("button", { class: "btn-secondary", type: "button", onclick: () => loadDossier() }, ["Voltar aos dados"]),
    ]),
  );
}

function renderReleaseConfirmation(): void {
  if (!root) return;
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("span", { class: "confirm-icon", ariaHidden: "true" }, ["✓"]),
        el("h2", { class: "message-title" }, ["Solicitação registrada"]),
        el("p", { class: "message-body" }, ["Sua solicitação de liberação foi registrada. O órgão/pátio responsável dará andamento e informará os próximos passos junto ao balcão de atendimento."]),
      ]),
      el("button", { class: "btn-primary", type: "button", onclick: () => loadDossier() }, ["Voltar aos dados"]),
      el("button", { class: "btn-secondary", type: "button", onclick: () => renderConsulta() }, ["Nova consulta"]),
    ]),
  );
}

// ── ESTADOS GENÉRICOS ────────────────────────────────────────────────────────────────────────────────────────────
type MessageAction = "retry" | "reloadDossier";

function renderMessage(title: string, body: string, action: MessageAction): void {
  if (!root) return;
  const button =
    action === "reloadDossier"
      ? el("button", { class: "btn-primary", type: "button", onclick: () => loadDossier() }, ["Tentar novamente"])
      : el("button", { class: "btn-primary", type: "button", onclick: () => renderConsulta(lastQuery) }, ["Tentar novamente"]);
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("h2", { class: "message-title" }, [title]),
        el("p", { class: "message-body" }, [body]),
      ]),
      button,
    ]),
  );
}

// Sessão expirada (~15min) — o único caminho é refazer a consulta (a sessão nasce só de um lookup FOUND).
function renderExpired(): void {
  ownerSession = null;
  if (!root) return;
  root.replaceChildren(
    header(),
    el("main", { class: "screen" }, [
      el("div", { class: "card message" }, [
        el("h2", { class: "message-title" }, ["Consulta expirada"]),
        el("p", { class: "message-body" }, ["Sua consulta expirou por segurança. Refaça a consulta com a placa e o Renavam."]),
      ]),
      el("button", { class: "btn-primary", type: "button", onclick: () => renderConsulta() }, ["Refazer consulta"]),
    ]),
  );
}

renderConsulta();

// Registro do service worker (PWA installable / offline-tolerante). Falha silenciosa não quebra a consulta.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
