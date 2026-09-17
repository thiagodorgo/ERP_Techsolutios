import type { WorkOrderDetail, WorkOrderDetailResult, WorkOrderEvent, WorkOrdersData, WorkOrdersSource } from "./work-orders.types";

// B-SAN3-01 (P-008) — reducers PUROS que decidem o estado da lista e do detalhe a partir do que o service
// devolveu. Vivem fora dos hooks para serem testáveis no harness SSR (sem React), e porque a regra que eles
// carregam é a que o auto-refresh precisa (§4.3-3 do plano): falha em segundo plano NÃO apaga o que já
// estava na tela — o dado fica e a tela é marcada como DESATUALIZADA; só a primeira carga ou o refresh
// explícito trocam a tela pelo estado de erro. Vazio ≠ erro ≠ sem permissão ≠ não encontrada: cada um é um
// `status` próprio, e é por ele que a página escolhe o painel (§7). Nada aqui fabrica item.

export type WorkOrdersListStatus = "loading" | "ready" | "empty" | "error" | "forbidden";

export type WorkOrdersListState = {
  readonly data: WorkOrdersData;
  readonly status: WorkOrdersListStatus;
  /** Mensagem honesta do último erro (também preenchida quando `stale`). */
  readonly error: string | null;
  readonly forbidden: boolean;
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
  forbidden: false,
  stale: false,
  lastUpdatedAt: null,
};

export function nextListState(
  prev: WorkOrdersListState,
  result: WorkOrdersData,
  background: boolean,
  now: string = new Date().toISOString(),
): WorkOrdersListState {
  if (result.source !== "fallback") {
    return {
      data: result,
      status: result.items.length > 0 ? "ready" : "empty",
      error: null,
      forbidden: false,
      stale: false,
      lastUpdatedAt: now,
    };
  }

  const reason = result.fallbackReason ?? "Não foi possível consultar as ordens de serviço.";

  // Falha em segundo plano com dado já carregado: mantém a lista e marca como desatualizada.
  if (background && prev.lastUpdatedAt !== null) {
    return { ...prev, error: reason, stale: true };
  }

  return {
    data: { items: [], pagination: result.pagination, source: "fallback", fallbackReason: reason, forbidden: result.forbidden },
    status: result.forbidden ? "forbidden" : "error",
    error: reason,
    forbidden: result.forbidden === true,
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
  readonly notFound: boolean;
  readonly forbidden: boolean;
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
  notFound: false,
  forbidden: false,
  stale: false,
  timelineUnavailable: false,
  lastUpdatedAt: null,
};

export type WorkOrderDetailSettled = {
  readonly detail: PromiseSettledResult<WorkOrderDetailResult>;
  readonly timeline: PromiseSettledResult<WorkOrderEvent[]>;
};

const DETAIL_ERROR = "Não foi possível consultar a ordem de serviço.";

export function nextDetailState(
  prev: WorkOrderDetailState,
  settled: WorkOrderDetailSettled,
  background: boolean,
  now: string = new Date().toISOString(),
): WorkOrderDetailState {
  const detail = settled.detail.status === "fulfilled" ? settled.detail.value : null;

  if (detail?.workOrder) {
    const timelineOk = settled.timeline.status === "fulfilled";
    return {
      workOrder: detail.workOrder,
      timeline: timelineOk ? settled.timeline.value : [],
      source: detail.source,
      fallbackReason: detail.fallbackReason,
      status: "ready",
      error: null,
      notFound: false,
      forbidden: false,
      stale: false,
      timelineUnavailable: !timelineOk,
      lastUpdatedAt: now,
    };
  }

  const reason = detail?.fallbackReason ?? (detail?.notFound ? "Ordem de serviço não encontrada." : DETAIL_ERROR);

  // Falha em segundo plano com OS já na tela: mantém a OS (e o histórico) e marca como desatualizada.
  if (background && prev.workOrder) {
    return { ...prev, error: reason, stale: true };
  }

  const notFound = detail?.notFound === true;
  const forbidden = detail?.forbidden === true;
  return {
    workOrder: null,
    timeline: [],
    source: detail?.source ?? "fallback",
    fallbackReason: detail?.fallbackReason,
    status: notFound ? "not-found" : forbidden ? "forbidden" : "error",
    error: reason,
    notFound,
    forbidden,
    stale: false,
    timelineUnavailable: false,
    lastUpdatedAt: prev.lastUpdatedAt,
  };
}
