import type { OperationalApproval } from "../../work-orders/approval.types";
import type { WorkOrderDetail, WorkOrderListItem } from "../../work-orders/work-orders.types";
import type { DispatchListItem } from "../../operations/dispatches/dispatches.types";
import type { FieldLocationItem } from "../../operations/map/operations-map.types";
import type { DashboardCriticalOrder, DashboardRecentEvent, DashboardSummaryByStatus } from "../dashboard.adapter";
import type { DashboardSource } from "../repository";
import type { OperationalKpi } from "../types";
import type { WorkOrderTimeseriesPoint, WorkOrderTimeseriesSource } from "../work-order-timeseries.types";

// B-APAR-DASH — o MODELO que o contêiner (`DashboardPage`) monta UMA vez e entrega às três aparências aprovadas
// (`screen-refs/dashboard-3opcoes.reference.html`: A · Padrão fiel, B · Analítica, C · Central de prioridades). As views
// são PURAS: não importam service nem hook de dados e não leem permissão da sessão; recebem tudo aqui (padrão do
// `WorkOrdersViewModel` do #493 e do `FinanceiroViewModel`). Cada fonte tem o seu estado §7 (carregando · pronto · erro ·
// acesso não permitido): o 403 de uma fonte secundária vira "Acesso não permitido" DENTRO do bloco dela.

export type BlockStatus = "loading" | "ready" | "error" | "forbidden";

export type DashboardBlock<T> = {
  readonly status: BlockStatus;
  readonly items: readonly T[];
};

export type DashboardSummaryView = {
  readonly status: BlockStatus;
  /** Motivo da falha do resumo (fail-closed): campo obrigatório ausente ou inválido, ou falha de rede. */
  readonly reason: string | null;
  readonly kpis: readonly OperationalKpi[];
  /** As 10 situações do agregado (`workOrders.byStatus`); `null` enquanto o resumo não veio bom. */
  readonly byStatus: DashboardSummaryByStatus | null;
  /** Até 8 OS críticas que o servidor manda (já sem finalizadas, #446). */
  readonly critical: readonly DashboardCriticalOrder[];
  /** Até 10 eventos recentes (o servidor manda a mensagem e o `workOrderId`, sem o código da OS). */
  readonly events: readonly DashboardRecentEvent[];
  readonly source: DashboardSource;
};

/** A lista de OS da C ("OS sem operador"): a página que o serviço devolve, com o total que o servidor informa. */
export type DashboardWorkOrdersPage = {
  readonly status: BlockStatus;
  readonly items: readonly WorkOrderListItem[];
  readonly loaded: number;
  readonly serverTotal: number;
  /** O servidor tem mais OS do que as lidas: a contagem diz o universo e há "ver todas" (Emenda 4). */
  readonly partial: boolean;
};

/** Endereço e técnico da linha crítica da B: `GET /work-orders/:id` só ao abrir a linha, guardado por id. */
export type DashboardRowDetail = { readonly status: "loading" } | { readonly status: "ready"; readonly workOrder: WorkOrderDetail } | { readonly status: "error" | "forbidden" | "not_found" };

export type DashboardAccess = {
  /** `work_orders:read`: "Abrir OS", série diária, extras da C. Sem ela a linha não mostra "Abrir OS". */
  readonly readWorkOrders: boolean;
  /** `work_orders:create`: "Nova OS". */
  readonly createWorkOrder: boolean;
  /** `field_dispatch:read`: bloco "Despachos ativos". */
  readonly readDispatches: boolean;
  /** `field_location:read`: bloco "Status de campo", "Campo agora", "Abrir mapa". */
  readonly readLocations: boolean;
  /** `work_orders:read` (é o gate de `GET /approvals/pending`): tipo "Aprovação" da fila da C. */
  readonly readApprovals: boolean;
  /** Predicado de permissão já resolvido (para `buildDashboardKpiDetail`, que esconde o botão sem a rota). */
  readonly can: (permission: string) => boolean;
};

/** Estado navegável: `?cartao=` e `?linha=` na querystring; os recortes de B e C ficam no contêiner. */
export type DashboardState = {
  /** Cartão (indicador ou cadastro) aberto no painel embaixo dos cartões; filtra a fila nas OS críticas. */
  readonly cartao: string | null;
  /** Linha aberta (uma por vez, em qualquer bloco). */
  readonly linha: string | null;
  /** B: aba da lista "OS que exigem atenção". */
  readonly aba: string;
  /** B: etapa da carteira ativa que filtra a lista. */
  readonly etapa: string | null;
  /** B: dia escolhido no volume (índice na série). */
  readonly dia: number | null;
  /** B: situação de campo que filtra "Status de campo". */
  readonly campo: string | null;
  /** C: bloco que filtra a fila de prioridades. */
  readonly bloco: string;
  /** C: o que a coluna "Agora" mostra. */
  readonly rail: "campo" | "desp" | "evt";
};

export type DashboardViewModel = {
  readonly now: Date;
  readonly userName: string;
  readonly orgName: string;
  readonly summary: DashboardSummaryView;
  /** Série diária de 30 dias (`GET /operations/work-orders-timeseries?days=30`); a B recorta 14 dias da MESMA série. */
  readonly series: DashboardBlock<WorkOrderTimeseriesPoint> & { readonly source: WorkOrderTimeseriesSource };
  readonly dispatches: DashboardBlock<DispatchListItem>;
  readonly locations: DashboardBlock<FieldLocationItem>;
  /** Extras da C, pedidos só na primeira vez que a C abre (`null` antes disso). */
  readonly approvals: DashboardBlock<OperationalApproval> | null;
  readonly workOrders: DashboardWorkOrdersPage | null;
  readonly rowDetail: Readonly<Record<string, DashboardRowDetail>>;
  readonly access: DashboardAccess;
  readonly state: DashboardState;
  /** Falha numa atualização em segundo plano: a tela mantém o último dado bom e acende a faixa com a hora. */
  readonly stale: boolean;
  readonly lastUpdatedAt: string | null;
  /** Modo demonstração (`VITE_USE_MOCKS`): o selo "Dados demonstrativos" de hoje. */
  readonly demo: boolean;
  readonly onState: (next: DashboardState) => void;
  readonly onRetry: () => void;
  /** Navega para uma rota do sistema (lista de OS filtrada, mapa, despachos, cadastros). */
  readonly onNavigate: (to: string) => void;
  /** "Abrir OS": sempre a PÁGINA `/work-orders/:id`, levando a volta ao Dashboard no estado da navegação. */
  readonly onOpenWorkOrder: (id: string) => void;
  readonly onCreate: () => void;
};
