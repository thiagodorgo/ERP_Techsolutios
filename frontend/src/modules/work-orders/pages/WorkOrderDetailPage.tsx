import { ClipboardList } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useAuth } from "../../../providers/AuthProvider";
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

// Ω3F-1 — Hub da OS: shell de abas com menu lateral interno + barra de ações. A antiga página de
// detalhe (card único) vira a aba "Informações gerais" (GeneralInfoTab). As demais 10 abas ficam
// OCULTAS (C2 — revelação progressiva) até seu bloco entregar. Aba na URL (`?aba=`) para deep-link.

export function WorkOrderDetailPage() {
  const navigate = useNavigate();
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workOrder, timeline, loading, source, context, refresh } = useWorkOrderDetail(workOrderId);
  // WS-UI-REFRESH — o hub recarrega sozinho em segundo plano (sem botão "Atualizar" na barra de ações).
  useAutoRefresh(refresh, { enabled: Boolean(workOrderId) });
  const { permissions } = usePermissions();
  const { session } = useAuth();
  const currentUserId = session?.user.id;
  const canDecide = permissions.includes("work_orders:cancel") || permissions.includes("work_orders:approve");

  const activeTab = resolveActiveTab(searchParams.get("aba"));
  const activeTabDef = findTab(activeTab);
  const accessAllowed = canAccessTab(activeTabDef, permissions);

  function selectTab(slug: WorkOrderTabSlug) {
    const next = new URLSearchParams(searchParams);
    next.set("aba", slug);
    setSearchParams(next, { replace: true });
  }

  if (loading && !workOrder) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Carregando ordem de serviço…</div>;
  }
  if (!workOrder) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Ordem de serviço não encontrada</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>Ela pode ter sido removida ou não pertence a esta organização.</div>
        <button onClick={() => navigate("/work-orders")} style={{ marginTop: 16, padding: "9px 16px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Voltar às ordens</button>
      </div>
    );
  }

  return (
    <div style={{ color: "#0F172A" }}>
      <div onClick={() => navigate("/work-orders")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#2563EB", cursor: "pointer", marginBottom: 14 }}>← Voltar às ordens</div>

      {source === "fallback" ? (
        <div style={{ padding: "9px 13px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, marginBottom: 12, fontSize: 12.5, color: "#92400E" }}>Sem conexão com a API — exibindo dados locais desta OS.</div>
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
        <WorkOrderActionBar workOrder={workOrder} activeTab={activeTab} context={context} permissions={permissions} onRefresh={() => void refresh()} />
      </div>

      <WorkOrderTabsShell tabs={visibleTabs()} activeTab={activeTab} accessAllowed={accessAllowed} onSelect={selectTab}>
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
          <MileageTab workOrder={workOrder} context={context} permissions={permissions} onRefresh={() => void refresh()} />
        ) : activeTab === "mapa" ? (
          <MapTab workOrder={workOrder} context={context} permissions={permissions} />
        ) : activeTab === "logs" ? (
          <LogsTab workOrderId={workOrder.id} context={context} permissions={permissions} />
        ) : (
          <GeneralInfoTab workOrder={workOrder} timeline={timeline} context={context} canDecide={canDecide} />
        )}
      </WorkOrderTabsShell>
    </div>
  );
}

export default WorkOrderDetailPage;
