import { CheckCircle2, ClipboardList, MapPin, RefreshCw, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { usePermissions } from "../../../providers/PermissionProvider";
import { approveOperationalApproval, listPendingApprovals, rejectOperationalApproval } from "../approval.service";
import type { OperationalApproval } from "../approval.types";
import { WorkOrderRegistryLinksCard } from "../components/WorkOrderRegistryLinksCard";
import { useWorkOrderDetail } from "../useWorkOrderDetail";
import type { WorkOrderPriority, WorkOrderStatus } from "../work-orders.types";

// "Ordem de Serviço · detalhe" — ligada a getWorkOrder + timeline + approvals
// reais (mock atrás de VITE_USE_MOCKS; fallback local). Alvo visual: screen-refs.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const cellLabel: CSSProperties = { fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginBottom: 4 };

const STATUS_META: Record<WorkOrderStatus, { label: string; bg: string; color: string }> = {
  open: { label: "Aberta", bg: "#F1F5F9", color: "#475569" },
  assigned: { label: "Atribuída", bg: "#EFF6FF", color: "#2563EB" },
  accepted: { label: "Aceita", bg: "#EFF6FF", color: "#2563EB" },
  on_route: { label: "Em rota", bg: "#EFF6FF", color: "#2563EB" },
  on_site: { label: "No local", bg: "#ECFDF5", color: "#059669" },
  in_progress: { label: "Em atendimento", bg: "#FFFBEB", color: "#D97706" },
  paused: { label: "Pausada", bg: "#FFFBEB", color: "#D97706" },
  completed: { label: "Concluída", bg: "#ECFDF5", color: "#059669" },
  cancelled: { label: "Cancelada", bg: "#FEF2F2", color: "#DC2626" },
  rejected: { label: "Recusada", bg: "#FEF2F2", color: "#DC2626" },
};
const PRIORITY_LABEL: Record<WorkOrderPriority, string> = { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" };
const PRIORITY_COLOR: Record<WorkOrderPriority, string> = { low: "#059669", medium: "#2563EB", high: "#D97706", urgent: "#DC2626" };

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function InfoCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={cellLabel}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: valueColor ?? "#0F172A" }}>{value}</div>
    </div>
  );
}

export function WorkOrderDetailPage() {
  const navigate = useNavigate();
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const { workOrder, timeline, loading, source, context, refresh } = useWorkOrderDetail(workOrderId);
  const { permissions } = usePermissions();
  const canDecide = permissions.includes("work_orders:cancel") || permissions.includes("work_orders:approve");

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

  const sm = STATUS_META[workOrder.status];
  const initials = (workOrder.customerName ?? "OS").slice(0, 2).toUpperCase();

  return (
    <div style={{ color: "#0F172A" }}>
      <div onClick={() => navigate("/work-orders")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#2563EB", cursor: "pointer", marginBottom: 14 }}>← Voltar às ordens</div>

      {source === "fallback" ? (
        <div style={{ padding: "9px 13px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, marginBottom: 12, fontSize: 12.5, color: "#92400E" }}>Sem conexão com a API — exibindo dados locais desta OS.</div>
      ) : null}

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flexShrink: 0 }}><ClipboardList size={22} /></div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>{workOrder.code} · {workOrder.title}</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>{[workOrder.customerName, workOrder.serviceAddress].filter(Boolean).join(" · ") || "Sem cliente/endereço informado"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => void refresh()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}><RefreshCw size={14} />Atualizar</button>
          {workOrder.checklistId ? (
            <button onClick={() => navigate(`/operations/checklists/${workOrder.checklistId}/run`)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><ClipboardList size={15} />Abrir checklist</button>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        {/* left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ borderRight: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ padding: 16 }}>
                  <div style={cellLabel}>Status</div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: sm.bg, color: sm.color }}>{sm.label}</span>
                </div>
              </div>
              <div style={{ borderBottom: "1px solid #F1F5F9" }}><InfoCell label="Prioridade" value={PRIORITY_LABEL[workOrder.priority]} valueColor={PRIORITY_COLOR[workOrder.priority]} /></div>
              <div style={{ borderRight: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}><InfoCell label="Técnico" value={workOrder.assignedOperatorId ? "Atribuída" : "A atribuir"} /></div>
              <div style={{ borderBottom: "1px solid #F1F5F9" }}><InfoCell label="Agenda" value={fmtDate(workOrder.scheduledFor)} /></div>
              <div style={{ borderRight: "1px solid #F1F5F9" }}><InfoCell label="Criada em" value={fmtDate(workOrder.createdAt)} /></div>
              <div><InfoCell label="Checklist" value={workOrder.checklistId ? "Vinculado" : "—"} /></div>
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Cliente e endereço</div>
              {workOrder.serviceLatitude != null && workOrder.serviceLongitude != null ? (
                <span onClick={() => navigate(`/operations/map?workOrderId=${workOrder.id}`)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}><MapPin size={14} />Abrir no mapa</span>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#2563EB", flexShrink: 0 }}>{initials}</div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{workOrder.customerName ?? "Cliente não informado"}</div>
                {workOrder.customerPhone ? <div style={{ fontSize: 12, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>{workOrder.customerPhone}</div> : null}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{[workOrder.serviceAddress, workOrder.serviceCity, workOrder.serviceState, workOrder.serviceZipCode].filter(Boolean).join(" · ") || "Endereço não informado"}</div>
          </div>

          {/* C2: cadastros vinculados (cliente/viatura/equipe/serviço) */}
          <WorkOrderRegistryLinksCard workOrder={workOrder} />

          {/* timeline */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Histórico</div>
            {timeline.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#94A3B8" }}>Sem eventos registrados.</div>
            ) : (
              timeline.map((ev, i) => (
                <div key={ev.id} style={{ display: "flex", gap: 12, paddingBottom: i < timeline.length - 1 ? 14 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#2563EB", marginTop: 4 }} />
                    {i < timeline.length - 1 ? <div style={{ width: 2, flex: 1, background: "#E2E8F0", marginTop: 2 }} /> : null}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{ev.message}</div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{fmtDate(ev.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* right — aprovação operacional (real) */}
        <ApprovalPanel workOrderId={workOrder.id} workOrderCode={workOrder.code} context={context} canDecide={canDecide} />
      </div>
    </div>
  );
}

function ApprovalPanel({
  workOrderId,
  workOrderCode,
  context,
  canDecide,
}: {
  workOrderId: string;
  workOrderCode: string;
  context: Parameters<typeof listPendingApprovals>[0];
  canDecide: boolean;
}) {
  const [approval, setApproval] = useState<OperationalApproval | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPendingApprovals(context, workOrderId);
      setApproval(list[0] ?? null);
    } catch {
      setApproval(null);
    }
    setLoading(false);
  }, [context, workOrderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve() {
    if (!approval) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await approveOperationalApproval(context, approval.id);
      setApproval(updated);
      setMessage(updated.safeMessage);
    } catch {
      setError("Não foi possível registrar a aprovação.");
    }
    setSubmitting(false);
  }

  async function reject() {
    if (!approval) return;
    if (!reason.trim()) {
      setError("Informe o motivo da reprovação.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await rejectOperationalApproval(context, approval.id, reason);
      setApproval(updated);
      setMessage(updated.safeMessage);
      setRejecting(false);
    } catch {
      setError("Não foi possível registrar a reprovação.");
    }
    setSubmitting(false);
  }

  const statusChip = (() => {
    if (!approval || approval.status === "pending_approval") return { text: "Aguardando decisão", bg: "#FFFBEB", color: "#D97706" };
    if (approval.status === "approved") return { text: "Aprovada", bg: "#ECFDF5", color: "#059669" };
    return { text: "Reprovada", bg: "#FEF2F2", color: "#DC2626" };
  })();

  return (
    <div style={{ ...card, padding: 20, alignSelf: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Aprovação operacional</div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: statusChip.bg, color: statusChip.color }}>{statusChip.text}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 16, lineHeight: 1.45 }}>Decisão sobre a execução desta OS antes de liberar o faturamento.</div>

      {loading ? (
        <div style={{ fontSize: 12.5, color: "#94A3B8" }}>Carregando aprovação…</div>
      ) : !approval ? (
        <div style={{ fontSize: 13, color: "#475569" }}>Nenhuma aprovação pendente para esta OS.</div>
      ) : (
        <>
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            {[
              { k: "Entidade", v: `${approval.entityType} · ${workOrderCode}` },
              { k: "Pendência", v: approval.pendingReason },
              { k: "Solicitado por", v: `${approval.requestedBy} · ${fmtDate(approval.requestedAt)}` },
              ...(approval.decidedBy ? [{ k: "Decidido por", v: `${approval.decidedBy} · ${fmtDate(approval.decidedAt)}` }] : []),
              ...(approval.reason ? [{ k: "Motivo", v: approval.reason }] : []),
            ].map((r, i, arr) => (
              <div key={r.k} style={{ display: "flex", gap: 10, padding: "11px 14px", borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <span style={{ fontSize: 12, color: "#94A3B8", width: 100, flexShrink: 0 }}>{r.k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{r.v}</span>
              </div>
            ))}
          </div>

          {message ? <div style={{ fontSize: 12.5, color: "#059669", fontWeight: 600, marginBottom: 12 }}>{message}</div> : null}
          {error ? <div style={{ fontSize: 12.5, color: "#DC2626", fontWeight: 600, marginBottom: 12 }}>{error}</div> : null}

          {approval.status === "pending_approval" && canDecide ? (
            rejecting ? (
              <div>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo da reprovação (obrigatório)" rows={3} style={{ width: "100%", boxSizing: "border-box", border: "1px solid #E2E8F0", borderRadius: 10, padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => void reject()} disabled={submitting} style={{ flex: 1, padding: "11px", background: "#DC2626", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#fff", cursor: submitting ? "default" : "pointer", fontFamily: "inherit", opacity: submitting ? 0.6 : 1 }}>Confirmar reprovação</button>
                  <button onClick={() => { setRejecting(false); setError(null); }} disabled={submitting} style={{ padding: "11px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => void approve()} disabled={submitting} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", background: "#059669", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#fff", cursor: submitting ? "default" : "pointer", fontFamily: "inherit", opacity: submitting ? 0.6 : 1 }}><CheckCircle2 size={16} />Aprovar</button>
                <button onClick={() => { setRejecting(true); setError(null); }} disabled={submitting} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", background: "#fff", border: "1px solid #FECACA", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#DC2626", cursor: "pointer", fontFamily: "inherit" }}><XCircle size={16} />Reprovar</button>
              </div>
            )
          ) : approval.status === "pending_approval" && !canDecide ? (
            <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center" }}>Você não tem permissão para decidir esta aprovação.</div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default WorkOrderDetailPage;
