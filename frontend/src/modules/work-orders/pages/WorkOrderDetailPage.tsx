import { ClipboardList } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useAuth } from "../../../providers/AuthProvider";
import { StaleDataBanner } from "../components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../components/StatePanel";
import { WorkOrderActionBar } from "../components/WorkOrderActionBar";
import { WorkOrderTabsShell } from "../components/WorkOrderTabsShell";
import { AttachmentsTab } from "../components/tabs/AttachmentsTab";
import { CommentsTab } from "../components/tabs/CommentsTab";
import { FinancialTab } from "../components/tabs/FinancialTab";
import { GeneralInfoTab } from "../components/tabs/GeneralInfoTab";
import { LogsTab } from "../components/tabs/LogsTab";
import { MapTab } from "../components/tabs/MapTab";
import { MileageTab } from "../components/tabs/MileageTab";
import { MobileTab } from "../components/tabs/MobileTab";
import { QuoteTab } from "../components/tabs/QuoteTab";
import { canAccessTab, findTab, resolveActiveTab, visibleTabs, type WorkOrderTabSlug } from "../tabs.config";
import { useWorkOrderDetail } from "../useWorkOrderDetail";
import type { WorkOrderDetailStatus } from "../work-orders.state";
import type { WorkOrderDetail, WorkOrderEvent, WorkOrdersApiContext } from "../work-orders.types";

// Ω3F-1 — Hub da OS: shell de abas com menu lateral interno + barra de ações. A antiga página de
// detalhe (card único) vira a aba "Informações gerais" (GeneralInfoTab). As demais 10 abas ficam
// OCULTAS (C2 — revelação progressiva) até seu bloco entregar. Aba na URL (`?aba=`) para deep-link.
//
// B-SAN3-01 (P-008) — a página é a fiação (hooks) e o corpo é `WorkOrderDetailView`, PURO e testável em SSR
// (work-orders-honest-errors P4). Sem OS o corpo mostra um ESTADO — não encontrada · acesso não permitido ·
// erro — nunca uma OS de demonstração; com OS e falha em segundo plano, a OS fica e a faixa "dados
// desatualizados" acende. O banner "exibindo dados locais desta OS" saiu: não há dados locais.

export function WorkOrderDetailPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workOrder, timeline, loading, status, error, stale, lastUpdatedAt, timelineUnavailable, context, refresh } = useWorkOrderDetail(workOrderId);
  // WS-UI-REFRESH — o hub recarrega sozinho em segundo plano (sem botão "Atualizar" na barra de ações).
  useAutoRefresh(refresh, { enabled: Boolean(workOrderId) });
  const { permissions } = usePermissions();
  const { session } = useAuth();

  const activeTab = resolveActiveTab(searchParams.get("aba"));

  function selectTab(slug: WorkOrderTabSlug) {
    const next = new URLSearchParams(searchParams);
    next.set("aba", slug);
    setSearchParams(next, { replace: true });
  }

  return (
    <WorkOrderDetailView
      workOrder={workOrder}
      timeline={timeline}
      loading={loading}
      status={status}
      error={error}
      stale={stale}
      lastUpdatedAt={lastUpdatedAt}
      timelineUnavailable={timelineUnavailable}
      context={context}
      permissions={permissions}
      currentUserId={session?.user.id}
      activeTab={activeTab}
      onSelectTab={selectTab}
      onRefresh={() => void refresh()}
    />
  );
}

export type WorkOrderDetailViewProps = {
  readonly workOrder: WorkOrderDetail | null;
  readonly timeline: WorkOrderEvent[];
  readonly loading: boolean;
  readonly status: WorkOrderDetailStatus;
  readonly error: string | null;
  readonly stale: boolean;
  readonly lastUpdatedAt: string | null;
  readonly timelineUnavailable: boolean;
  readonly context: WorkOrdersApiContext;
  readonly permissions: readonly string[];
  readonly currentUserId?: string;
  readonly activeTab: WorkOrderTabSlug;
  readonly onSelectTab: (slug: WorkOrderTabSlug) => void;
  readonly onRefresh: () => void;
};

const loadingPanel: CSSProperties = { padding: 40, textAlign: "center", color: "#64748B" };

export function WorkOrderDetailView({
  workOrder,
  timeline,
  loading,
  status,
  error,
  stale,
  lastUpdatedAt,
  timelineUnavailable,
  context,
  permissions,
  currentUserId,
  activeTab,
  onSelectTab,
  onRefresh,
}: WorkOrderDetailViewProps) {
  const navigate = useNavigate();
  const canDecide = permissions.includes("work_orders:cancel") || permissions.includes("work_orders:approve");
  const activeTabDef = findTab(activeTab);
  const accessAllowed = canAccessTab(activeTabDef, permissions);

  if (loading && !workOrder) {
    return <div data-state="loading" style={loadingPanel}>Carregando ordem de serviço…</div>;
  }
  // Ciclo 2 (P5 — C3-A1/A2): os três estados sem OS usam a MESMA ficha da lista (`StatePanel`): sem permissão
  // (escudo) × não encontrada (prancheta de OS) × erro (alerta vermelho, borda #FECACA, role="alert") se distinguem
  // a olho, e os botões são os do padrão (hover/foco das classes `.pat-btn`). Status não previsto cai no ERRO.
  if (!workOrder) {
    const backToList = () => navigate("/work-orders");
    if (status === "forbidden") {
      return (
        <StatePanel
          tone="forbidden"
          title="Acesso não permitido"
          detail="Você não tem permissão para ver esta ordem de serviço."
          actions={<StatePanelAction label="Voltar às ordens" onClick={backToList} />}
        />
      );
    }
    if (status === "not-found") {
      return (
        <StatePanel
          tone="not-found"
          title="Ordem de serviço não encontrada"
          detail="Ela pode ter sido removida ou não pertence a esta organização."
          actions={<StatePanelAction label="Voltar às ordens" onClick={backToList} />}
        />
      );
    }
    return (
      <StatePanel
        tone="error"
        title="Não foi possível carregar a ordem de serviço"
        detail={error ?? "Tente novamente em instantes."}
        actions={
          <>
            <StatePanelAction label="Tentar novamente" onClick={onRefresh} />
            <StatePanelAction label="Voltar às ordens" variant="secondary" onClick={backToList} />
          </>
        }
      />
    );
  }

  return (
    <div style={{ color: "#0F172A" }}>
      <div onClick={() => navigate("/work-orders")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#2563EB", cursor: "pointer", marginBottom: 14 }}>← Voltar às ordens</div>

      {stale ? (
        <div style={{ marginBottom: 12 }}>
          <StaleDataBanner lastUpdatedAt={lastUpdatedAt} onRetry={onRefresh} />
        </div>
      ) : null}

      {/* page-header (§11 regra 4): título + subtítulo + ações à direita — persistente em qualquer aba */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flexShrink: 0 }}><ClipboardList size={22} /></div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>{workOrder.code} · {workOrder.title}</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>{[workOrder.customerName, workOrder.serviceAddress].filter(Boolean).join(" · ") || "Sem cliente/endereço informado"}</div>
          </div>
        </div>
        {/* Ω3F-6b — a barra passa a gatilhar Cancelar/Duplicar/Imprimir: precisa do contexto de API
            (chamadas reais) e das permissões do ator (gating das ações). */}
        <WorkOrderActionBar workOrder={workOrder} activeTab={activeTab} context={context} permissions={permissions} onRefresh={onRefresh} />
      </div>

      <WorkOrderTabsShell tabs={visibleTabs()} activeTab={activeTab} accessAllowed={accessAllowed} onSelect={onSelectTab}>
        {/* Conteúdo por aba (C2: só abas acesas chegam aqui). Ω3F-3 acende "Financeiro"; as demais
            entram nos blocos seguintes. `accessAllowed=false` já é tratado pelo shell (§7). */}
        {activeTab === "financeiro" ? (
          <FinancialTab workOrderId={workOrder.id} context={context} permissions={permissions} />
        ) : activeTab === "orcamento" ? (
          <QuoteTab workOrderId={workOrder.id} context={context} permissions={permissions} />
        ) : activeTab === "comentarios" ? (
          <CommentsTab workOrderId={workOrder.id} context={context} permissions={permissions} currentUserId={currentUserId} />
        ) : activeTab === "arquivos" ? (
          <AttachmentsTab workOrderId={workOrder.id} context={context} permissions={permissions} />
        ) : activeTab === "mobile" ? (
          <MobileTab workOrder={workOrder} context={context} permissions={permissions} />
        ) : activeTab === "quilometragem" ? (
          <MileageTab workOrder={workOrder} context={context} permissions={permissions} onRefresh={onRefresh} />
        ) : activeTab === "mapa" ? (
          <MapTab workOrder={workOrder} context={context} permissions={permissions} />
        ) : activeTab === "logs" ? (
          <LogsTab workOrderId={workOrder.id} context={context} permissions={permissions} />
        ) : (
          <GeneralInfoTab workOrder={workOrder} timeline={timeline} timelineUnavailable={timelineUnavailable} context={context} canDecide={canDecide} />
        )}
      </WorkOrderTabsShell>
    </div>
  );
}

export default WorkOrderDetailPage;
