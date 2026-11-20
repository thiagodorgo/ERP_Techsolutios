import { hasValue } from "./billing-ops.money";
import { monthLabel, monthName, METHOD_LABEL } from "./billing-ops.labels";
import { monthsEndingAt } from "./billing-ops.service";
import type { BacklogCategory, BillingOpsData, BillingProfileSummary, Organization, Provider, QueueLine, Statement } from "./billing-ops.types";

// B-ASS-10c-OPERACAO — o MODELO ÚNICO da tela (R-APAR): as 3 aparências recebem o mesmo `BillingOpsView`. Os indicadores
// CONTAM demonstrativos e linhas da fila; nunca somam dinheiro (R-T5-DIN, §4 do plano: a soma em reais entre organizações
// falta no servidor). Organização que não carregou NÃO entra como zero: o indicador mostra "—" e "N de M organizações
// carregaram" (R-PARCIAL). Um detalhe aberto por vez (`aberta`), um filtro por vez (`alvo`).

export type BillingOpsUi = {
  /** O bloco que filtra a lista (indicador, barra, item da mesa). `null` = todos. */
  readonly alvo: string | null;
  /** A linha aberta (chave da linha). */
  readonly aberta: string | null;
  /** O painel do canal aberto. */
  readonly canal: boolean;
  readonly busca: string;
};

export const INITIAL_UI: BillingOpsUi = { alvo: null, aberta: null, canal: false, busca: "" };

export type Bucket = "pago" | "enviada" | "semcobr" | "aberto";
export const BUCKETS: readonly Bucket[] = ["pago", "enviada", "semcobr", "aberto"];
export const BUCKET_LABEL: Readonly<Record<Bucket, string>> = { pago: "Pago", enviada: "Cobrança enviada", semcobr: "Sem cobrança enviada", aberto: "Em aberto (mês corrente)" };
export const BUCKET_COLOR: Readonly<Record<Bucket, string>> = { pago: "#10b981", enviada: "#2563eb", semcobr: "#f59e0b", aberto: "#94a3b8" };

export type Row = {
  readonly key: string;
  readonly org: Organization;
  readonly statement: Statement;
  readonly review: readonly QueueLine[];
  readonly failed: readonly QueueLine[];
  readonly backlog: BacklogCategory | null;
  readonly profile: BillingProfileSummary | null;
  readonly overdue: boolean;
  readonly partiallyPaid: boolean;
  readonly chargeAlive: boolean;
  readonly cancelInReview: boolean;
  readonly bucket: Bucket;
  /** Meses com saldo em aberto da organização (fechados, com saldo), entre os lidos: a coluna "Meses abertos" da C. */
  readonly openMonths: number;
};

export type KpiKey = "todos" | "acobrar" | "emitidas" | "pagos" | "atraso" | "revisao" | "falha" | "notas" | "perfil";
export const KPI_KEYS: readonly KpiKey[] = ["todos", "acobrar", "emitidas", "pagos", "atraso", "revisao", "falha", "notas", "perfil"];

export type Kpi = {
  readonly key: KpiKey;
  readonly label: string;
  /** O número, ou "—" quando falta organização. */
  readonly value: string;
  readonly count: number | null;
  readonly hint: string;
  readonly alert: boolean;
};

export type ChannelView = {
  readonly state: "loading" | "forbidden" | "failed" | "ok";
  readonly value: string;
  readonly hint: string;
  readonly on: boolean;
  readonly payment: Provider | null;
  readonly invoice: Provider | null;
  /** O servidor está com a cobrança desligada pela configuração dele (sabido por uma recusa recente), ou `null` = não sei. */
  readonly serverOff: boolean | null;
};

export type MonthBar = { readonly month: string; readonly counts: Readonly<Record<Bucket, number>> | null; readonly total: number | null };

export type BillingOpsView = {
  readonly month: string;
  readonly today: string;
  readonly currentMonth: string;
  readonly monthOptions: readonly string[];
  readonly ui: BillingOpsUi;
  readonly orgTotal: number;
  readonly orgLoaded: number;
  readonly orgFailed: readonly Organization[];
  readonly loadingOrgs: number;
  readonly partial: boolean;
  /** Todos os demonstrativos lidos (todos os meses), para os meses de cada organização na aparência C. */
  readonly allRows: readonly Row[];
  /** Os demonstrativos do mês (todas as organizações lidas), antes do filtro. */
  readonly monthRows: readonly Row[];
  /** A lista: filtrada pelo alvo e pela busca, na ordem do que pede ação primeiro. */
  readonly rows: readonly Row[];
  readonly kpis: Readonly<Record<KpiKey, Kpi>>;
  readonly channel: ChannelView;
  readonly months: readonly MonthBar[];
  readonly filterLabel: string | null;
};

// ---- regras por demonstrativo -----------------------------------------------------------------------------------------
const chargeAlive = (statement: Statement) => statement.chargeStatus === "pending";

function bucketOf(statement: Statement): Bucket {
  if (statement.status === "open" || statement.status === "reopened") return "aberto";
  if (statement.status === "paid") return "pago";
  return chargeAlive(statement) ? "enviada" : "semcobr";
}

export const FILTERS: Readonly<Record<KpiKey | "fila", (row: Row) => boolean>> = {
  todos: () => true,
  acobrar: (row) => row.statement.status === "closed" && !row.chargeAlive && hasValue(row.statement.balance) && row.review.length + row.failed.length === 0 && !row.cancelInReview,
  emitidas: (row) => row.statement.status === "closed" && row.chargeAlive,
  pagos: (row) => row.statement.status === "paid",
  atraso: (row) => row.overdue,
  revisao: (row) => row.review.length > 0,
  falha: (row) => row.failed.length > 0,
  fila: (row) => row.review.length + row.failed.length > 0,
  notas: (row) => row.backlog !== null,
  perfil: (row) => row.profile !== null && !row.profile.complete,
};

const FILTER_LABEL: Readonly<Record<string, string>> = {
  acobrar: "A cobrar",
  emitidas: "Cobranças emitidas",
  pagos: "Pagos",
  atraso: "Em atraso",
  revisao: "Em revisão",
  falha: "Com falha",
  fila: "Fila de envio com pendência",
  notas: "Notas pendentes",
  perfil: "Perfil incompleto",
};

/** A ordem da lista: o que pede ação primeiro (fila, atraso, a cobrar, nota, emitidas). */
function priority(row: Row): number {
  if (FILTERS.revisao(row) || FILTERS.falha(row)) return 0;
  if (FILTERS.atraso(row)) return 1;
  if (FILTERS.acobrar(row)) return 2;
  if (FILTERS.notas(row)) return 3;
  if (FILTERS.emitidas(row)) return 4;
  return 5;
}

export function matchesTarget(row: Row, alvo: string | null): boolean {
  if (!alvo) return true;
  if (Object.prototype.hasOwnProperty.call(FILTERS, alvo)) return FILTERS[alvo as KpiKey](row);
  if (alvo.startsWith("b:")) return row.bucket === alvo.slice(2);
  if (alvo.startsWith("s:")) return row.statement.id === alvo.slice(2);
  if (alvo.startsWith("q:")) return [...row.review, ...row.failed].some((line) => line.id === alvo.slice(2));
  if (alvo.startsWith("org:")) return row.org.id === alvo.slice(4);
  return true;
}

function targetLabel(alvo: string, rows: readonly Row[]): string {
  if (FILTER_LABEL[alvo]) return FILTER_LABEL[alvo]!;
  if (alvo.startsWith("b:")) return BUCKET_LABEL[alvo.slice(2) as Bucket] ?? "Situação";
  const row = rows.find((item) => matchesTarget(item, alvo));
  return row ? row.org.name : "Demonstrativo";
}

// ---- contagens (R-PARCIAL) ---------------------------------------------------------------------------------------------
/** Soma de contagens por organização; se ALGUMA organização não tem número (não carregou), o total é `null`, nunca parcial. */
function sumCounts(perOrg: readonly (number | null)[]): number | null {
  let total = 0;
  for (const value of perOrg) {
    if (value === null) return null;
    total += value;
  }
  return total;
}

const plural = (count: number | null, one: string, many: string) => (count === 1 ? one : many);

export type BuildInput = {
  readonly data: BillingOpsData;
  readonly month: string;
  readonly ui: BillingOpsUi;
  readonly today: string;
  readonly currentMonth: string;
  readonly serverOff: boolean | null;
};

export function buildBillingOpsView({ data, month, ui, today, currentMonth, serverOff }: BuildInput): BillingOpsView {
  const organizations = data.organizations;
  const allRows: Row[] = [];
  const periods = new Set<string>([currentMonth]);
  for (const org of organizations) {
    const reading = data.readings[org.id];
    if (!reading || reading.state !== "ok") continue;
    const openMonths = reading.statements.filter((item) => item.status === "closed" && hasValue(item.balance)).length;
    for (const statement of reading.statements) {
      if (/^\d{4}-\d{2}$/.test(statement.period)) periods.add(statement.period);
      const review = reading.review.filter((line) => line.statementId === statement.id);
      const failed = reading.failedLines.filter((line) => line.statementId === statement.id);
      const backlog = reading.backlog.find((line) => line.statementId === statement.id)?.category ?? null;
      allRows.push({
        key: `${org.id}:${statement.id}`,
        org,
        statement,
        review,
        failed,
        backlog,
        profile: reading.profile,
        overdue: statement.status === "closed" && hasValue(statement.balance) && statement.dueDate !== null && statement.dueDate.slice(0, 10) < today,
        partiallyPaid: statement.status === "closed" && hasValue(statement.paidAmount),
        chargeAlive: chargeAlive(statement),
        cancelInReview: review.some((line) => line.kind === "charge_cancel"),
        bucket: bucketOf(statement),
        openMonths,
      });
    }
  }

  const orgFailed = organizations.filter((org) => data.readings[org.id]?.state === "failed");
  const loadingOrgs = organizations.filter((org) => !data.readings[org.id] || data.readings[org.id]!.state === "loading").length;
  const orgLoaded = organizations.length - orgFailed.length - loadingOrgs;
  const partial = orgFailed.length > 0 || loadingOrgs > 0;

  const monthRows = allRows.filter((row) => row.statement.period === month);
  const rowsOfOrg = (org: Organization) => monthRows.filter((row) => row.org.id === org.id);
  const okOrg = (org: Organization) => data.readings[org.id]?.state === "ok";
  /** Contagem por organização: `null` para a que não carregou (M13 do plano: nunca `?? 0`). */
  const countWhere = (predicate: (row: Row) => boolean) => sumCounts(organizations.map((org) => (okOrg(org) ? rowsOfOrg(org).filter(predicate).length : null)));
  const linesWhere = (pick: (row: Row) => readonly QueueLine[]) => sumCounts(organizations.map((org) => (okOrg(org) ? rowsOfOrg(org).reduce((acc, row) => acc + pick(row).length, 0) : null)));
  const orgsWithLines = (pick: (row: Row) => readonly QueueLine[]) => new Set(monthRows.filter((row) => pick(row).length > 0).map((row) => row.org.id)).size;

  const partialHint = loadingOrgs > 0 && orgFailed.length === 0 ? `carregando ${orgLoaded} de ${organizations.length} organizações` : `${orgLoaded} de ${organizations.length} organizações carregaram`;
  const kpi = (key: KpiKey, label: string, count: number | null, hint: string, alert = false): Kpi => ({
    key,
    label,
    count,
    value: count === null ? "—" : String(count),
    hint: count === null ? partialHint : hint,
    alert: count !== null && alert && count > 0,
  });

  const review = linesWhere((row) => row.review);
  const failed = linesWhere((row) => row.failed);
  const notes = countWhere(FILTERS.notas);
  const liveOnUnpaid = monthRows.filter((row) => row.backlog === "live_on_unpaid").length;
  const kpis: Record<KpiKey, Kpi> = {
    todos: kpi("todos", "Demonstrativos", countWhere(FILTERS.todos), `de ${monthLabel(month)}`),
    acobrar: kpi("acobrar", "A cobrar", countWhere(FILTERS.acobrar), "fechados, sem cobrança enviada"),
    emitidas: kpi("emitidas", "Cobranças emitidas", countWhere(FILTERS.emitidas), "aguardando pagamento"),
    pagos: kpi("pagos", "Pagos", countWhere(FILTERS.pagos), "quitados"),
    atraso: kpi("atraso", "Em atraso", countWhere(FILTERS.atraso), "vencimento passou, com saldo", true),
    revisao: kpi("revisao", "Em revisão", review, `${plural(review, "linha", "linhas")} na fila de envio · ${orgsWithLines((row) => row.review)} ${plural(orgsWithLines((row) => row.review), "organização", "organizações")}`, true),
    falha: kpi("falha", "Com falha", failed, `${plural(failed, "linha", "linhas")} na fila de envio · ${orgsWithLines((row) => row.failed)} ${plural(orgsWithLines((row) => row.failed), "organização", "organizações")}`, true),
    notas: { ...kpi("notas", "Notas pendentes", notes, liveOnUnpaid ? `${liveOnUnpaid} ${plural(liveOnUnpaid, "emitida", "emitidas")} sem pagamento` : "a emitir ou na fila"), alert: notes !== null && liveOnUnpaid > 0 },
    perfil: kpi("perfil", "Perfil incompleto", countWhere(FILTERS.perfil), "sem dados para cobrar"),
  };

  const months = monthsEndingAt(currentMonth, 6).map((item): MonthBar => {
    if (partial) return { month: item, counts: null, total: null };
    const counts: Record<Bucket, number> = { pago: 0, enviada: 0, semcobr: 0, aberto: 0 };
    let total = 0;
    for (const row of allRows) {
      if (row.statement.period !== item || row.statement.status === "cancelled") continue;
      counts[row.bucket] += 1;
      total += 1;
    }
    return { month: item, counts, total };
  });

  const filtered = monthRows
    .filter((row) => matchesTarget(row, ui.alvo))
    .filter((row) => !ui.busca.trim() || row.org.name.toLocaleLowerCase("pt-BR").includes(ui.busca.trim().toLocaleLowerCase("pt-BR")))
    .sort((a, b) => priority(a) - priority(b) || a.org.name.localeCompare(b.org.name, "pt-BR"));

  return {
    month,
    today,
    currentMonth,
    monthOptions: [...periods].filter((item) => item <= currentMonth).sort().reverse().slice(0, 12),
    ui,
    orgTotal: organizations.length,
    orgLoaded,
    orgFailed,
    loadingOrgs,
    partial,
    allRows,
    monthRows,
    rows: filtered,
    kpis,
    channel: channelView(data, serverOff),
    months,
    filterLabel: ui.alvo ? targetLabel(ui.alvo, monthRows) : null,
  };
}

/** O provedor que o cartão de um tipo mostra: o ligado; senão o configurado; senão o primeiro do catálogo. */
export function providerOfKind(providers: readonly Provider[], kind: Provider["kind"]): Provider | null {
  const ofKind = providers.filter((item) => item.kind === kind);
  return ofKind.find((item) => item.enabled) ?? ofKind.find((item) => item.configured) ?? ofKind[0] ?? null;
}

function channelView(data: BillingOpsData, serverOff: boolean | null): ChannelView {
  const base = { payment: null, invoice: null, serverOff, on: false } as const;
  if (data.providers.state === "forbidden") return { ...base, state: "forbidden", value: "—", hint: "Sem permissão para ver os provedores" };
  if (data.providers.state === "loading") return { ...base, state: "loading", value: "—", hint: "carregando o canal" };
  if (data.providers.state === "failed") return { ...base, state: "failed", value: "—", hint: "não foi possível ler o canal" };
  const payment = providerOfKind(data.providers.providers, "payment");
  const invoice = providerOfKind(data.providers.providers, "invoice");
  const on = payment?.enabled === true;
  if (on && payment) {
    return { state: "ok", payment, invoice, serverOff, on, value: "Pagamento ligado", hint: `${payment.label} · ${payment.environment === "sandbox" ? "sandbox" : "produção"} · nota ${invoice?.enabled ? "ligada" : "desligada"}` };
  }
  return {
    state: "ok",
    payment,
    invoice,
    serverOff,
    on,
    value: "Desligado",
    hint: serverOff ? "Pagamento e nota: desligados pelo servidor" : invoice?.enabled ? "Pagamento desligado; nota ligada" : "Pagamento e nota: desligados",
  };
}

// ---- transições da interface ------------------------------------------------------------------------------------------
export function selectTarget(ui: BillingOpsUi, key: string): BillingOpsUi {
  if (key === "canal") return { ...ui, canal: !ui.canal };
  if (key === "todos") return { ...ui, alvo: null, aberta: null };
  return { ...ui, alvo: ui.alvo === key ? null : key, aberta: null };
}
export const clearTarget = (ui: BillingOpsUi): BillingOpsUi => ({ ...ui, alvo: null });
export const toggleRow = (ui: BillingOpsUi, key: string): BillingOpsUi => ({ ...ui, aberta: ui.aberta === key ? null : key });
export const setSearch = (ui: BillingOpsUi, busca: string): BillingOpsUi => ({ ...ui, busca });

/** As formas de pagamento conhecidas, para a janela de emitir cobrança. */
export const METHOD_OPTIONS = Object.entries(METHOD_LABEL) as readonly (readonly [keyof typeof METHOD_LABEL, string])[];

/** "Situação de outubro". */
export const monthTitle = (month: string) => `Situação de ${monthName(month)}`;
