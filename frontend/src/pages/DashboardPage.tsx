import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useScreenAppearance } from "../modules/appearance";
import { useDashboardData } from "../modules/dashboard/useDashboardData";
import { useWorkOrderTimeseries } from "../modules/dashboard/useWorkOrderTimeseries";
import type { BlockStatus, DashboardBlock, DashboardRowDetail, DashboardState, DashboardViewModel } from "../modules/dashboard/views/dashboard.view-model";
import { DashboardViewA } from "../modules/dashboard/views/DashboardViewA";
import { DashboardViewB } from "../modules/dashboard/views/DashboardViewB";
import { DashboardViewC } from "../modules/dashboard/views/DashboardViewC";
import { useLastGood } from "../modules/finance/pages/financeiro.state";
import type { OperationalApproval } from "../modules/work-orders/approval.types";
import { loadApprovalsQueue } from "../modules/work-orders/useApprovalsQueue";
import { getWorkOrderFromApi } from "../modules/work-orders/work-orders.service";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";
import { useTenantContext } from "../providers/TenantProvider";

// Dashboard. B-APAR-DASH — esta página é o CONTÊINER das 3 aparências aprovadas pelo dono
// (`screen-refs/dashboard-3opcoes.reference.html`: A · Padrão fiel, B · Analítica, C · Central de prioridades;
// D-APARENCIA-POR-USUARIO, padrão A por D-APARENCIA-RESPOSTAS (b)), no padrão do `WorkOrdersPage` (#493) e do
// `FinanceiroPage`: lê a aparência PESSOAL (`useScreenAppearance("dashboard")`), chama cada fonte UMA vez
// (`useDashboardData` + `useWorkOrderTimeseries(30)`, com a auto-atualização de hoje; trocar de aparência NÃO repete
// chamada; a B recorta 14 dias da MESMA série), monta UM modelo e entrega a uma view PURA. O que só uma aparência usa
// é pedido na primeira vez que ela abre e fica guardado aqui: as aprovações pendentes da C e o detalhe da linha da B
// (`GET /work-orders/:id`, só ao abrir a linha, guardado por id). O estado navegável fica na querystring (`?cartao=`,
// `?linha=`). Nenhum número é fabricado (D-007): o resumo é fail-closed (`checkDashboardSummary`), o 403 de uma fonte
// secundária vira "Acesso não permitido" dentro do bloco, e a falha em segundo plano mantém o último bom com a faixa
// de dado desatualizado.

const LOCAL_DEFAULTS = { aba: "todas", etapa: null, dia: null, campo: null, bloco: "todas", rail: "campo" } as const;
type LocalState = Pick<DashboardState, "aba" | "etapa" | "dia" | "campo" | "bloco" | "rail">;

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { appearance } = useScreenAppearance("dashboard");
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const readWorkOrders = can("work_orders:read");
  const access = {
    readWorkOrders,
    createWorkOrder: can("work_orders:create"),
    readDispatches: can("field_dispatch:read"),
    readLocations: can("field_location:read"),
    // `GET /approvals/pending` exige `work_orders:read` (work-order.routes.ts) — é o mesmo gate.
    readApprovals: readWorkOrders,
    can,
  };

  const data = useDashboardData();
  // Série diária carregada UMA vez; sem work_orders:read o hook não dispara fetch (gate por `enabled`).
  const timeseries = useWorkOrderTimeseries(30, readWorkOrders);
  // Painel e série recarregam sozinhos em segundo plano (sem botão "Atualizar").
  useAutoRefresh(data.refresh, { enabled: Boolean(activeContext) });
  useAutoRefresh(timeseries.refresh, { enabled: Boolean(activeContext) && readWorkOrders });

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  // Série: falha numa atualização em segundo plano mantém o último bom (e acende a faixa de desatualizado).
  const seriesGood = !timeseries.loading && timeseries.data.source !== "fallback" && !timeseries.data.forbidden;
  const series = useLastGood(timeseries.data, seriesGood);
  const seriesStatus: BlockStatus = !readWorkOrders || series.value.forbidden ? "forbidden" : timeseries.loading && !series.stale ? "loading" : series.value.source === "fallback" ? "error" : "ready";

  // ---- Extras da C: pedidos só na primeira vez que a C abre, por organização; voltar à C não pede de novo. ----
  const tenantKey = activeContext?.tenantId ?? "";
  const [approvals, setApprovals] = useState<DashboardBlock<OperationalApproval> | null>(null);
  const approvalsFor = useRef<string | null>(null);
  const loadApprovals = useCallback(() => {
    if (!access.readApprovals) {
      setApprovals({ status: "forbidden", items: [] });
      return;
    }
    setApprovals((current) => current ?? { status: "loading", items: [] });
    void loadApprovalsQueue(context).then((result) =>
      setApprovals({ status: result.forbidden ? "forbidden" : result.source === "fallback" ? "error" : "ready", items: result.items }),
    );
  }, [access.readApprovals, context]);
  useEffect(() => {
    if (appearance !== "C" || !tenantKey || approvalsFor.current === tenantKey) return;
    approvalsFor.current = tenantKey;
    setApprovals(null);
    loadApprovals();
  }, [appearance, tenantKey, loadApprovals]);

  // ---- Estado navegável: `?cartao=` e `?linha=`; os recortes de B e C ficam aqui (não precisam de link). ----
  const [local, setLocal] = useState<LocalState>(LOCAL_DEFAULTS);
  const state: DashboardState = { cartao: searchParams.get("cartao") || null, linha: searchParams.get("linha") || null, ...local };
  const onState = (next: DashboardState) => {
    const params = new URLSearchParams(searchParams);
    const put = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
    put("cartao", next.cartao);
    put("linha", next.linha);
    if (params.toString() !== searchParams.toString()) setSearchParams(params, { replace: true });
    setLocal({ aba: next.aba, etapa: next.etapa, dia: next.dia, campo: next.campo, bloco: next.bloco, rail: next.rail });
  };

  // ---- B: endereço e técnico da linha crítica, `GET /work-orders/:id` só ao abrir a linha, guardado por id. ----
  const [rowDetail, setRowDetail] = useState<Record<string, DashboardRowDetail>>({});
  const requested = useRef(new Set<string>());
  const openCriticalId = appearance === "B" && state.linha?.startsWith("crit:") ? state.linha.slice("crit:".length) : null;
  useEffect(() => {
    if (!openCriticalId || !readWorkOrders || requested.current.has(openCriticalId)) return;
    requested.current.add(openCriticalId);
    setRowDetail((current) => ({ ...current, [openCriticalId]: { status: "loading" } }));
    void getWorkOrderFromApi(context, openCriticalId).then((result) => {
      const next: DashboardRowDetail = result.workOrder
        ? { status: "ready", workOrder: result.workOrder }
        : result.forbidden
          ? { status: "forbidden" }
          : result.notFound
            ? { status: "not_found" }
            : { status: "error" };
      setRowDetail((current) => ({ ...current, [openCriticalId]: next }));
    });
  }, [openCriticalId, readWorkOrders, context]);

  const now = new Date();
  const summaryReady = data.summaryStatus === "ready";
  const model: DashboardViewModel = {
    now,
    userName: (session?.user?.name ?? "").split(" ")[0] || "operação",
    orgName: activeContext?.tenantName ?? "sua organização",
    summary: {
      status: data.summaryStatus,
      reason: data.summaryReason,
      kpis: data.kpis,
      byStatus: summaryReady ? data.byStatus : null,
      critical: data.criticalWorkOrders,
      events: data.recentEvents,
      source: data.summarySource,
    },
    series: { status: seriesStatus, items: seriesStatus === "ready" ? series.value.points : [], source: series.value.source },
    dispatches: { status: access.readDispatches ? data.dispatchesStatus : "forbidden", items: data.dispatches },
    locations: { status: access.readLocations ? data.locationsStatus : "forbidden", items: data.locations },
    approvals,
    // "OS sem operador" da C: a última fatia do bloco (Emenda 1 ao §2), ainda não ligada.
    workOrders: null,
    rowDetail,
    access,
    state,
    stale: data.stale || series.stale,
    lastUpdatedAt: data.lastUpdatedAt,
    demo: data.summarySource === "mock" && !data.stale,
    onState,
    onRetry: () => {
      void data.refresh();
      if (readWorkOrders) void timeseries.refresh();
      if (appearance === "C" && approvals && approvals.status !== "ready") loadApprovals();
    },
    onNavigate: (to) => navigate(to),
    // "Abrir OS" leva sempre à PÁGINA da OS, com a volta ao Dashboard (e ao filtro) no estado da navegação.
    onOpenWorkOrder: (id) => navigate(`/work-orders/${id}`, { state: { from: `${location.pathname}${location.search}` } }),
    onCreate: () => navigate("/work-orders/new"),
  };

  return appearance === "B" ? <DashboardViewB {...model} /> : appearance === "C" ? <DashboardViewC {...model} /> : <DashboardViewA {...model} />;
}

export default DashboardPage;
