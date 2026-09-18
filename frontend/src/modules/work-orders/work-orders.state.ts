import type { WorkOrderDetail, WorkOrderDetailResult, WorkOrderEvent, WorkOrdersData, WorkOrdersSource } from "./work-orders.types";

// B-SAN3-01 (P-008) — reducers PUROS que decidem o estado da lista e do detalhe a partir do que o service
// devolveu. Vivem fora dos hooks para serem testáveis no harness SSR (sem React), e porque a regra que eles
// carregam é a que o auto-refresh precisa (§4.3-3 do plano): falha em segundo plano NÃO apaga o que já
// estava na tela — o dado fica e a tela é marcada como DESATUALIZADA; só a primeira carga ou o refresh
// explícito trocam a tela pelo estado de erro. Vazio ≠ erro ≠ sem permissão ≠ não encontrada: cada um é um
// `status` próprio, e é por ele que a página escolhe o painel (§7). Nada aqui fabrica item.
//
// Ciclo 2 (plano `B-SAN3-01-ciclo2-plano.md`):
//  · P1 — UMA verdade para "sem permissão": o `forbidden` do RESULTADO do service decide ANTES de qualquer outra
//    classificação (`source`, refresh em segundo plano). O estado não carrega `forbidden`/`notFound` como campos:
//    `status` é a única verdade. Permissão revogada em sessão não deixa a lista antiga "desatualizada" — ela sai.

export type WorkOrdersListStatus = "loading" | "ready" | "empty" | "error" | "forbidden";

export type WorkOrdersListState = {
  readonly data: WorkOrdersData;
  readonly status: WorkOrdersListStatus;
  /** Mensagem honesta do último erro (também preenchida quando `stale`). */
  readonly error: string | null;
  /** Há dado na tela, mas a última tentativa de atualizar falhou. */
  readonly stale: boolean;
  /** ISO da última carga bem-sucedida; `null` enquanto nada carregou. */
  readonly lastUpdatedAt: string | null;
};

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

export const initialListState: WorkOrdersListState = {
  data: { items: [], pagination: EMPTY_PAGINATION, source: "api" },
  status: "loading",
  error: null,
  stale: false,
  lastUpdatedAt: null,
};

const LIST_ERROR = "Não foi possível consultar as ordens de serviço.";
const LIST_FORBIDDEN = "Sem permissão para consultar as ordens de serviço.";

export function nextListState(
  prev: WorkOrdersListState,
  result: WorkOrdersData,
  background: boolean,
  now: string = new Date().toISOString(),
): WorkOrdersListState {
  // P1 — o 403 decide primeiro, inclusive em segundo plano com dado na tela (fail-closed: a lista sai).
  if (result.forbidden === true) {
    const reason = result.fallbackReason ?? LIST_FORBIDDEN;
    return {
      data: { items: [], pagination: result.pagination, source: "fallback", fallbackReason: reason },
      status: "forbidden",
      error: reason,
      stale: false,
      lastUpdatedAt: prev.lastUpdatedAt,
    };
  }

  if (result.source !== "fallback") {
    return {
      data: { items: result.items, pagination: result.pagination, source: result.source, fallbackReason: result.fallbackReason },
      status: result.items.length > 0 ? "ready" : "empty",
      error: null,
      stale: false,
      lastUpdatedAt: now,
    };
  }

  const reason = result.fallbackReason ?? LIST_ERROR;
  // Falha em segundo plano com dado já carregado: mantém a lista e marca como desatualizada.
  if (background && prev.lastUpdatedAt !== null) {
    return { ...prev, error: reason, stale: true };
  }
  return {
    data: { items: [], pagination: result.pagination, source: "fallback", fallbackReason: reason },
    status: "error",
    error: reason,
    stale: false,
    lastUpdatedAt: prev.lastUpdatedAt,
  };
}

export type WorkOrderDetailStatus = "loading" | "ready" | "not-found" | "forbidden" | "error";

export type WorkOrderDetailState = {
  readonly workOrder: WorkOrderDetail | null;
  readonly timeline: WorkOrderEvent[];
  readonly source: WorkOrdersSource;
  readonly fallbackReason?: string;
  readonly status: WorkOrderDetailStatus;
  readonly error: string | null;
  readonly stale: boolean;
  /** A OS carregou, mas o histórico não — distinto de "sem eventos registrados". */
  readonly timelineUnavailable: boolean;
  readonly lastUpdatedAt: string | null;
};

export const initialDetailState: WorkOrderDetailState = {
  workOrder: null,
  timeline: [],
  source: "api",
  status: "loading",
  error: null,
  stale: false,
  timelineUnavailable: false,
  lastUpdatedAt: null,
};

export type WorkOrderDetailSettled = {
  readonly detail: PromiseSettledResult<WorkOrderDetailResult>;
  readonly timeline: PromiseSettledResult<WorkOrderEvent[]>;
};

const DETAIL_ERROR = "Não foi possível consultar a ordem de serviço.";
const DETAIL_FORBIDDEN = "Sem permissão para consultar esta ordem de serviço.";

export function nextDetailState(
  prev: WorkOrderDetailState,
  settled: WorkOrderDetailSettled,
  background: boolean,
  now: string = new Date().toISOString(),
): WorkOrderDetailState {
  const detail = settled.detail.status === "fulfilled" ? settled.detail.value : null;

  // P1 — o 403 decide primeiro, inclusive em segundo plano com a OS na tela (fail-closed: a OS sai).
  if (detail?.forbidden === true) {
    const reason = detail.fallbackReason ?? DETAIL_FORBIDDEN;
    return {
      workOrder: null,
      timeline: [],
      source: detail.source,
      fallbackReason: reason,
      status: "forbidden",
      error: reason,
      stale: false,
      timelineUnavailable: false,
      lastUpdatedAt: prev.lastUpdatedAt,
    };
  }

  if (detail?.workOrder) {
    const timelineOk = settled.timeline.status === "fulfilled";
    return {
      workOrder: detail.workOrder,
      timeline: timelineOk ? settled.timeline.value : [],
      source: detail.source,
      fallbackReason: detail.fallbackReason,
      status: "ready",
      error: null,
      stale: false,
      timelineUnavailable: !timelineOk,
      lastUpdatedAt: now,
    };
  }

  const notFound = detail?.notFound === true;
  const reason = detail?.fallbackReason ?? (notFound ? "Ordem de serviço não encontrada." : DETAIL_ERROR);

  // Falha em segundo plano com OS já na tela: mantém a OS (e o histórico) e marca como desatualizada.
  if (background && prev.workOrder) {
    return { ...prev, error: reason, stale: true };
  }

  return {
    workOrder: null,
    timeline: [],
    source: detail?.source ?? "fallback",
    fallbackReason: detail?.fallbackReason,
    status: notFound ? "not-found" : "error",
    error: reason,
    stale: false,
    timelineUnavailable: false,
    lastUpdatedAt: prev.lastUpdatedAt,
  };
}
