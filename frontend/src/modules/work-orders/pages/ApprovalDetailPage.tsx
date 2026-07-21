import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, ErrorState, Skeleton } from "../../../components/ui";
import { usePermissions } from "../../../providers/PermissionProvider";
import { ApiError } from "../../../services/api/client";
import { approveOperationalApproval, getOperationalApproval, rejectOperationalApproval } from "../approval.service";
import { entityTypeLabel } from "../approval.types";
import type { ApprovalApiContext, OperationalApproval } from "../approval.types";
import { useApprovalContext } from "../useApprovalsQueue";
import { formatPendingAge } from "./ApprovalsPage";

// "Aprovação · detalhe" (sc_approvalDetail) — Onda 1. Lê o :approvalId REAL da rota (useParams) e consome
// GET /api/v1/approvals/:approvalId. D-007: SÓ os campos reais do DTO — REMOVIDOS itens do pedido, centro
// de custo, alçada/threshold, trilha de 3 passos e "Solicitar revisão" (todos fabricados). Painel de
// decisão clonado do ApprovalPanel (GeneralInfoTab): recusa exige motivo (textarea inline), safeMessage,
// gating por permissão. §7: loading/skeleton, 403→acesso negado, 404→não encontrada, fallback honesto.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const cellLabel: CSSProperties = { fontSize: 12, color: "#94A3B8", width: 130, flexShrink: 0 };
const cellValue: CSSProperties = { fontSize: 13.5, fontWeight: 600, color: "#0F172A" };

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const btn = (bg: string, color: string, border?: string): CSSProperties => ({
  width: "100%",
  padding: 12,
  background: bg,
  border: border ?? "none",
  borderRadius: 11,
  fontSize: 14,
  fontWeight: 700,
  color,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
});

function BackLink() {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/approvals")}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2563EB", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}
    >
      <ArrowLeft size={16} />Voltar à fila
    </div>
  );
}

export function ApprovalDetailView({
  approval: initial,
  context,
  canDecide,
  onChanged,
  now,
}: {
  approval: OperationalApproval;
  context: ApprovalApiContext;
  canDecide: boolean;
  onChanged?: () => void;
  now?: Date;
}) {
  const navigate = useNavigate();
  const [approval, setApproval] = useState<OperationalApproval>(initial);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const age = formatPendingAge(approval.requestedAt, now);
  const statusChip = (() => {
    if (approval.status === "approved") return { text: "Aprovada", bg: "#ECFDF5", color: "#059669" };
    if (approval.status === "rejected") return { text: "Reprovada", bg: "#FEF2F2", color: "#DC2626" };
    return { text: "Aguardando decisão", bg: "#FFFBEB", color: "#D97706" };
  })();

  async function approve() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await approveOperationalApproval(context, approval.id);
      setApproval(updated);
      setMessage(updated.safeMessage);
      onChanged?.();
    } catch {
      setError("Não foi possível registrar a aprovação.");
    }
    setSubmitting(false);
  }

  async function reject() {
    // Recusa exige motivo — bloqueio CLIENT-SIDE (o backend responde 400 APPROVAL_INVALID sem `reason`).
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
      onChanged?.();
    } catch {
      setError("Não foi possível registrar a reprovação.");
    }
    setSubmitting(false);
  }

  const rows: { k: string; v: string; mono?: boolean }[] = [
    { k: "Tipo", v: entityTypeLabel(approval.entityType) },
    { k: "Registro", v: approval.entityId, mono: true },
    { k: "Pendência", v: approval.pendingReason },
    { k: "Solicitado por", v: approval.requestedBy, mono: true },
    { k: "Solicitado em", v: `${fmtDate(approval.requestedAt)} · ${age.label}` },
    ...(approval.decidedBy ? [{ k: "Decidido por", v: approval.decidedBy, mono: true }] : []),
    ...(approval.decidedAt ? [{ k: "Decidido em", v: fmtDate(approval.decidedAt) }] : []),
    ...(approval.note ? [{ k: "Observação", v: approval.note }] : []),
    ...(approval.reason ? [{ k: "Motivo", v: approval.reason }] : []),
  ];

  return (
    <div style={{ color: "#0F172A" }}>
      <BackLink />
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        {/* left — dados reais da aprovação (só o DTO) */}
        <div style={{ ...card, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Aprovação operacional</span>
            <span style={{ background: statusChip.bg, color: statusChip.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>{statusChip.text}</span>
          </div>
          <div style={{ border: "1px solid #F1F5F9", borderRadius: 12, overflow: "hidden" }}>
            {rows.map((r, i) => (
              <div key={r.k} style={{ display: "flex", gap: 10, padding: "11px 14px", borderBottom: i < rows.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <span style={cellLabel}>{r.k}</span>
                <span style={{ ...cellValue, fontFamily: r.mono ? "'JetBrains Mono', monospace" : "inherit", wordBreak: "break-word" }}>{r.v}</span>
              </div>
            ))}
          </div>
          {approval.workOrderId ? (
            <div
              onClick={() => navigate(`/work-orders/${approval.workOrderId}`)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}
            >
              Abrir ordem de serviço <ArrowRight size={14} />
            </div>
          ) : null}
        </div>

        {/* right — decisão (clone do ApprovalPanel: motivo obrigatório na recusa, gating, safeMessage) */}
        <div style={{ ...card, padding: 20, alignSelf: "flex-start" }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Decisão</div>

          {message ? <div style={{ fontSize: 12.5, color: "#059669", fontWeight: 600, marginBottom: 12 }}>{message}</div> : null}
          {error ? <div style={{ fontSize: 12.5, color: "#DC2626", fontWeight: 600, marginBottom: 12 }}>{error}</div> : null}

          {approval.status !== "pending_approval" ? (
            <div style={{ fontSize: 13, color: "#475569" }}>{approval.safeMessage}</div>
          ) : !canDecide ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8" }}>Você não tem permissão para decidir esta aprovação.</div>
          ) : rejecting ? (
            <div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo da reprovação (obrigatório)"
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #E2E8F0", borderRadius: 10, padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 10 }}
              />
              <button type="button" onClick={() => void reject()} disabled={submitting} style={{ ...btn("#DC2626", "#fff"), marginBottom: 10, opacity: submitting ? 0.6 : 1 }}>Confirmar reprovação</button>
              <button type="button" onClick={() => { setRejecting(false); setReason(""); setError(null); }} disabled={submitting} style={btn("#fff", "#334155", "1px solid #E2E8F0")}>Cancelar</button>
            </div>
          ) : (
            <>
              <button type="button" onClick={() => void approve()} disabled={submitting} style={{ ...btn("#059669", "#fff"), marginBottom: 10, opacity: submitting ? 0.6 : 1 }}>
                <CheckCircle2 size={17} />Aprovar
              </button>
              <button type="button" onClick={() => { setRejecting(true); setError(null); }} disabled={submitting} style={btn("#fff", "#DC2626", "1px solid #FECACA")}>
                <XCircle size={17} />Recusar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type DetailStatus = "loading" | "ready" | "forbidden" | "not_found" | "fallback";

export function ApprovalDetailPage() {
  const { approvalId } = useParams<{ approvalId: string }>();
  const navigate = useNavigate();
  const context = useApprovalContext();
  const { permissions } = usePermissions();
  const canDecide = permissions.includes("work_orders:cancel") || permissions.includes("work_orders:approve");

  const [approval, setApproval] = useState<OperationalApproval | null>(null);
  const [status, setStatus] = useState<DetailStatus>("loading");

  const load = useCallback(async () => {
    if (!approvalId) {
      setStatus("not_found");
      return;
    }
    setStatus("loading");
    try {
      const loaded = await getOperationalApproval(context, approvalId);
      setApproval(loaded);
      setStatus("ready");
    } catch (err) {
      setApproval(null);
      if (err instanceof ApiError && err.status === 404) setStatus("not_found");
      else if (err instanceof ApiError && err.status === 403) setStatus("forbidden");
      else setStatus("fallback");
    }
  }, [approvalId, context]);

  useEffect(() => {
    void load();
  }, [load]);

  const onChanged = useCallback(() => {
    // O badge de pendências no shell escuta este evento para recontar.
    window.dispatchEvent(new Event("approvals:changed"));
  }, []);

  if (status === "loading") {
    return (
      <div style={{ color: "#0F172A" }}>
        <BackLink />
        <div style={{ ...card, padding: 20 }}>
          <Skeleton lines={6} />
        </div>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div style={{ color: "#0F172A" }}>
        <BackLink />
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar esta aprovação. Fale com um administrador se precisar deste acesso."
        />
      </div>
    );
  }

  if (status === "not_found" || !approval) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Aprovação não encontrada</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>Ela pode já ter sido decidida ou não pertence a esta organização.</div>
        <button onClick={() => navigate("/approvals")} style={{ marginTop: 16, padding: "9px 16px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Voltar à fila</button>
      </div>
    );
  }

  if (status === "fallback") {
    return (
      <div style={{ color: "#0F172A" }}>
        <BackLink />
        <Alert title="Não foi possível carregar a aprovação" tone="warning">
          Houve uma falha ao buscar os dados desta aprovação. Volte à fila e tente novamente em alguns instantes.
        </Alert>
      </div>
    );
  }

  return <ApprovalDetailView approval={approval} context={context} canDecide={canDecide} onChanged={onChanged} />;
}

export default ApprovalDetailPage;
