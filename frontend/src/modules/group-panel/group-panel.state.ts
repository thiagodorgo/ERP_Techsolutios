import { roleLabel } from "../users/users.adapter";
import type { GroupPanelBlockStatus, GroupPanelCoverage, GroupPanelFailure, GroupPanelOrganization, GroupPanelScope, GroupPanelSummary } from "./group-panel.types";

// B-GRUPO-GESTOR-1b — o que a tela MOSTRA, em funções puras (executadas pelos testes FRO). Regra do plano §6: a tela não
// soma nada. Cada valor aqui é um campo do servidor escolhido pela seleção (todos os pátios = `consolidated`; um pátio =
// o bloco dele); quando o servidor não deu o número (bloco fora de `ok`, pátio em erro, total não publicado) o valor é
// `null` e a tela escreve o porquê, nunca zero. Ordenar e formatar não é somar.

export type GroupPanelIndicatorKey = "receber" | "recebido" | "pagar" | "pago" | "caixa" | "chamados" | "chegada" | "funcionarios";

/** A ordem do lote aprovado: os 6 do lote (itens 2) e os 2 da Emenda 2 §2.4 (tempo de chegada e funcionários). */
export const GROUP_PANEL_INDICATORS: readonly { readonly key: GroupPanelIndicatorKey; readonly label: string; readonly unit: "money" | "count" | "minutes" }[] = [
  { key: "receber", label: "A receber", unit: "money" },
  { key: "recebido", label: "Recebido no mês", unit: "money" },
  { key: "pagar", label: "A pagar", unit: "money" },
  { key: "pago", label: "Pago no mês", unit: "money" },
  { key: "caixa", label: "Caixa", unit: "money" },
  { key: "chamados", label: "Chamados no mês", unit: "count" },
  { key: "chegada", label: "Tempo de chegada", unit: "minutes" },
  { key: "funcionarios", label: "Funcionários", unit: "count" },
];

export const ALL_ORGANIZATIONS = "todos";
export type GroupPanelSelection = typeof ALL_ORGANIZATIONS | string;

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Pátio em erro: falhou na leitura (está em `coverage.failed`) ou algum bloco veio `erro`. Sai inteiro SEM número (K1). */
export function isOrganizationFailed(organization: GroupPanelOrganization, coverage: GroupPanelCoverage): boolean {
  return (
    coverage.failed.includes(organization.id) ||
    organization.finance.status === "erro" ||
    organization.operations.status === "erro" ||
    organization.staff.status === "erro"
  );
}

function financeOf(organization: GroupPanelOrganization, failed: boolean) {
  return !failed && organization.finance.status === "ok" ? organization.finance.summary : null;
}

function operationsOf(organization: GroupPanelOrganization, failed: boolean) {
  return !failed && organization.operations.status === "ok" ? organization.operations.summary : null;
}

function staffOf(organization: GroupPanelOrganization, failed: boolean) {
  return !failed && organization.staff.status === "ok" ? organization.staff.summary : null;
}

/** O valor de UM pátio num indicador, exatamente o campo do servidor; `null` quando o servidor não o deu. */
export function organizationValue(organization: GroupPanelOrganization, coverage: GroupPanelCoverage, key: GroupPanelIndicatorKey): number | null {
  const failed = isOrganizationFailed(organization, coverage);
  const finance = financeOf(organization, failed);
  const operations = operationsOf(organization, failed);
  const staff = staffOf(organization, failed);
  switch (key) {
    case "receber":
      return finance?.receivable.openAmount ?? null;
    case "recebido":
      return finance?.settledThisMonth.inflow ?? null;
    case "pagar":
      return finance?.payable.openAmount ?? null;
    case "pago":
      return finance?.settledThisMonth.outflow ?? null;
    case "caixa":
      return finance?.cash.totalBalance ?? null;
    case "chamados":
      return operations?.openedThisMonth ?? null;
    case "chegada":
      return operations?.arrivalAvgMinutes ?? null;
    case "funcionarios":
      return staff?.activeUsers ?? null;
  }
}

/** O valor do GRUPO num indicador: só o `consolidated` do servidor. Total não publicado → `null` (nunca a soma dos pátios). */
export function consolidatedValue(summary: GroupPanelSummary, key: GroupPanelIndicatorKey): number | null {
  const consolidated = summary.consolidated;
  if (consolidated === null) return null;
  switch (key) {
    case "receber":
      return consolidated.finance.receivableOpen;
    case "recebido":
      return consolidated.finance.receivedThisMonth;
    case "pagar":
      return consolidated.finance.payableOpen;
    case "pago":
      return consolidated.finance.paidThisMonth;
    case "caixa":
      return consolidated.finance.cashBalance;
    case "chamados":
      return consolidated.operations.openedThisMonth;
    case "chegada":
      return consolidated.operations.arrivalAvgMinutes;
    case "funcionarios":
      return consolidated.staff.activeUsers;
  }
}

export function findOrganization(summary: GroupPanelSummary, selection: GroupPanelSelection): GroupPanelOrganization | null {
  if (selection === ALL_ORGANIZATIONS) return null;
  return summary.organizations.find((organization) => organization.id === selection) ?? null;
}

export function indicatorValue(summary: GroupPanelSummary, selection: GroupPanelSelection, key: GroupPanelIndicatorKey): number | null {
  const organization = findOrganization(summary, selection);
  return organization ? organizationValue(organization, summary.coverage, key) : consolidatedValue(summary, key);
}

/** Os 6 meses de entradas e saídas: do grupo (`consolidated`) ou do pátio escolhido. Sem dado → lista vazia. */
export function cashFlowFor(summary: GroupPanelSummary, selection: GroupPanelSelection) {
  const organization = findOrganization(summary, selection);
  if (organization) return financeOf(organization, isOrganizationFailed(organization, summary.coverage))?.cashFlow ?? [];
  return summary.consolidated?.finance.cashFlow ?? [];
}

/** Ordena os pátios pelo indicador clicado (maior primeiro; sem número no fim). Não soma, só compara. */
export function sortOrganizations(summary: GroupPanelSummary, key: GroupPanelIndicatorKey | null): GroupPanelOrganization[] {
  const rows = [...summary.organizations];
  if (key === null) return rows.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  return rows.sort((left, right) => {
    const a = organizationValue(left, summary.coverage, key);
    const b = organizationValue(right, summary.coverage, key);
    if (a === null && b === null) return left.name.localeCompare(right.name, "pt-BR");
    if (a === null) return 1;
    if (b === null) return -1;
    // Tempo de chegada: o menor é o melhor, e é ele que sobe.
    return key === "chegada" ? a - b : b - a;
  });
}

// ── Formatação (só apresentação) ───────────────────────────────────────────────────────────────────────────────

export function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatCount(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("pt-BR");
}

/** "1 h 12 min" (Emenda 2 §3.2). */
export function formatMinutes(value: number | null): string {
  if (value === null) return "—";
  const total = Math.max(0, Math.round(value));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function formatIndicator(key: GroupPanelIndicatorKey, value: number | null): string {
  const unit = GROUP_PANEL_INDICATORS.find((indicator) => indicator.key === key)?.unit ?? "count";
  if (unit === "money") return formatMoney(value);
  if (unit === "minutes") return formatMinutes(value);
  return formatCount(value);
}

export function monthName(competencia: string): string {
  const month = Number(competencia.slice(5, 7));
  return Number.isInteger(month) && month >= 1 && month <= 12 ? MONTHS[month - 1] : competencia;
}

export function monthShort(competencia: string): string {
  const month = Number(competencia.slice(5, 7));
  return Number.isInteger(month) && month >= 1 && month <= 12 ? MONTHS_SHORT[month - 1] : competencia;
}

/** O mês anterior a uma competência `AAAA-MM`, só para o rótulo ("sobre outubro"). */
export function previousMonthName(competencia: string): string {
  const month = Number(competencia.slice(5, 7));
  if (!Number.isInteger(month) || month < 1 || month > 12) return "o mês anterior";
  return MONTHS[(month + 10) % 12];
}

/** "+8% sobre outubro, até agora" — o percentual vem pronto do servidor; nulo = mês anterior zero. */
export function variationText(pct: number | null, competencia: string): string {
  if (pct === null) return `sem base em ${previousMonthName(competencia)}`;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% sobre ${previousMonthName(competencia)}, até agora`;
}

/** Rótulo de perfil para a tela; chave sem rótulo conhecido vira "Outro perfil", nunca a chave técnica (§3). */
export function profileLabel(profile: string): string {
  const label = roleLabel(profile);
  return label === profile || label.trim() === "" ? "Outro perfil" : label;
}

/** Por que um bloco de um pátio não tem número, em linguagem de dono. */
export function blockStatusLabel(status: GroupPanelBlockStatus | "pátio_em_erro"): string {
  if (status === "pátio_em_erro" || status === "erro") return "erro na leitura";
  if (status === "sem_permissao") return "sem acesso";
  if (status === "modulo_desligado") return "módulo desligado";
  return "";
}

/** O motivo de o valor de um pátio faltar num indicador, para a célula e o detalhe. */
export function missingReason(organization: GroupPanelOrganization, coverage: GroupPanelCoverage, key: GroupPanelIndicatorKey): string {
  if (isOrganizationFailed(organization, coverage)) return blockStatusLabel("pátio_em_erro");
  if (key === "chamados" || key === "chegada") {
    if (organization.operations.status !== "ok") return blockStatusLabel(organization.operations.status);
    return key === "chegada" ? "sem chegada no mês" : "";
  }
  if (key === "funcionarios") return organization.staff.status !== "ok" ? blockStatusLabel(organization.staff.status) : "";
  return organization.finance.status !== "ok" ? blockStatusLabel(organization.finance.status) : "";
}

export type CoverageNotice = { readonly tone: "info" | "warning" | "error"; readonly text: string };

/** A faixa de cobertura (lote item 7, Emenda 1 §5.1 item 5, Emenda 2 §2.4 e K9). */
export function coverageNotices(summary: GroupPanelSummary, scope: GroupPanelScope | null): CoverageNotice[] {
  const notices: CoverageNotice[] = [];
  const total = summary.organizations.length;
  const { coverage } = summary;
  const shown = `Mostrando ${total === 1 ? "o pátio" : `os ${total} pátios`} em que você tem acesso.`;
  if (coverage.withoutAccess.length === 0) notices.push({ tone: "info", text: shown });
  else {
    const names = coverage.withoutAccess.map((organization) => organization.name).join(", ");
    notices.push({
      tone: "info",
      text: `${shown} ${coverage.withoutAccess.length === 1 ? "1 pátio está" : `${coverage.withoutAccess.length} pátios estão`} sem acesso ao Financeiro e não entra${coverage.withoutAccess.length === 1 ? "" : "m"} na soma: ${names}. A soma é de ${coverage.included} ${coverage.included === 1 ? "pátio" : "pátios"}.`,
    });
  }
  if (!coverage.complete) {
    const failedNames = summary.organizations.filter((organization) => coverage.failed.includes(organization.id)).map((organization) => organization.name);
    if (coverage.reason === "erro_de_leitura") {
      notices.push({
        tone: "error",
        text: `O total do grupo não foi somado: ${failedNames.length > 0 ? failedNames.join(", ") : "um pátio"} não respondeu à leitura. Os outros pátios aparecem normalmente; tente atualizar em instantes.`,
      });
    } else if (coverage.reason === "teto") {
      notices.push({ tone: "warning", text: "O total do grupo não foi somado: o Painel lê até 30 pátios por vez, e este grupo passa disso." });
    } else if (coverage.reason === "moedas_diferentes") {
      notices.push({ tone: "warning", text: "O total do grupo não foi somado: os pátios usam moedas diferentes." });
    } else {
      notices.push({ tone: "warning", text: "O total do grupo não foi somado nesta leitura." });
    }
  }
  if (scope?.overLimit && scope.omittedCount > 0) {
    notices.push({ tone: "warning", text: `${scope.omittedCount === 1 ? "1 pátio ficou" : `${scope.omittedCount} pátios ficaram`} de fora desta leitura (limite de 30 pátios).` });
  }
  return notices;
}

/** "leitura às 14:05" — a hora em que o servidor leu (`generatedAt`). */
export function readingTime(generatedAt: string): string | null {
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── O estado da tela (§7) ─────────────────────────────────────────────────────────────────────────────────────

export type GroupPanelState =
  | { readonly status: "loading" }
  | { readonly status: "forbidden"; readonly reason: "not_group_manager" | "sem_permissao" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty"; readonly summary: GroupPanelSummary | null }
  | {
      readonly status: "ready";
      readonly summary: GroupPanelSummary;
      readonly scope: GroupPanelScope | null;
      /** A última atualização falhou; o que está na tela é a leitura anterior. */
      readonly stale: boolean;
      readonly lastGoodAt: string;
    };

export type GroupPanelGood = { readonly summary: GroupPanelSummary; readonly scope: GroupPanelScope | null; readonly at: string };

/** O Painel só tem sentido com 2 ou mais pátios (plano §4.1: 0 ou 1 = estado vazio). */
export function groupPanelStateFrom(input: {
  readonly summary: { readonly ok: true; readonly data: GroupPanelSummary } | { readonly ok: false; readonly failure: GroupPanelFailure };
  readonly scope: { readonly ok: true; readonly data: GroupPanelScope } | { readonly ok: false; readonly failure: GroupPanelFailure };
  readonly lastGood: GroupPanelGood | null;
  readonly now: string;
}): { readonly state: GroupPanelState; readonly good: GroupPanelGood | null } {
  const { summary, scope, lastGood } = input;
  if (!summary.ok) {
    if (summary.failure.kind === "forbidden") return { state: { status: "forbidden", reason: summary.failure.reason }, good: null };
    if (lastGood) return { state: { status: "ready", summary: lastGood.summary, scope: lastGood.scope, stale: true, lastGoodAt: lastGood.at }, good: lastGood };
    return { state: { status: "error", message: summary.failure.message }, good: null };
  }
  const scopeData = scope.ok ? scope.data : null;
  if (summary.data.organizations.length < 2) return { state: { status: "empty", summary: summary.data }, good: null };
  const good: GroupPanelGood = { summary: summary.data, scope: scopeData, at: input.now };
  return { state: { status: "ready", summary: summary.data, scope: scopeData, stale: false, lastGoodAt: good.at }, good };
}

