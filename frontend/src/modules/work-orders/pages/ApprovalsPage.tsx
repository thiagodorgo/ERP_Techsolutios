import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { usePermissions } from "../../../providers/PermissionProvider";
import { approveOperationalApproval, rejectOperationalApproval } from "../approval.service";
import { entityTypeLabel } from "../approval.types";
import type { ApprovalApiContext, OperationalApproval, OperationalApprovalStatus } from "../approval.types";
import { useApprovalsQueue, type ApprovalsQueueSource } from "../useApprovalsQueue";

// "Fila de Aprovações" (sc_approvals) — Onda 1. Consome a fonte REAL (GET /api/v1/approvals/pending via
// useApprovalsQueue). D-007: SÓ os campos reais do DTO (id, tipo, status, pendência, solicitante-UUID,
// requested_at) — ZERO valor em R$, código "APR-00xx", nome do solicitante, urgência, "acima da alçada",
// centro de custo, itens do pedido ou abas de histórico (não há endpoint de histórico — só pendentes).
// §7: loading/skeleton, forbidden(403)→acesso negado, fallback→aviso honesto, vazio→estado honesto.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

const SUBTITLE = "aprovações operacionais aguardando decisão";

const btn = (bg: string, color: string, border?: string): CSSProperties => ({
  padding: "10px 16px",
  background: bg,
  border: border ?? "none",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  color,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
});

const STATUS_CHIP: Record<OperationalApprovalStatus, { text: string; bg: string; color: string }> = {
  pending_approval: { text: "Aguardando decisão", bg: "#FFFBEB", color: "#D97706" },
  approved: { text: "Aprovada", bg: "#ECFDF5", color: "#059669" },
  rejected: { text: "Reprovada", bg: "#FEF2F2", color: "#DC2626" },
};

// Escala de duração PT-BR (minutos → horas → dias). Local ao módulo para não acoplar a fila ao pacote de
// mapa; mesma intenção do "Último visto há X".
function formatAgeDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "menos de 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days > 1 ? "s" : ""}`;
}

export type PendingAgeTone = "normal" | "warn" | "alert";

// "Pendente há X" — tempo decorrido REAL desde requested_at (honesto; NÃO é um prazo/SLA, como o SLA-proxy
// do mapa). A cor é heurística documentada de destaque, não um deadline: âmbar após 24 h, vermelho após
// 72 h aguardando decisão. D-007: nada de threshold/alçada fabricados.
export function formatPendingAge(requestedAt: string, now: Date = new Date()): { label: string; tone: PendingAgeTone } {
  const requestedTime = Date.parse(requestedAt);
  if (Number.isNaN(requestedTime)) return { label: "Pendente", tone: "normal" };
  const diffMs = Math.max(0, now.getTime() - requestedTime);
  const hours = diffMs / 3_600_000;
  const tone: PendingAgeTone = hours >= 72 ? "alert" : hours >= 24 ? "warn" : "normal";
  return { label: `Pendente há ${formatAgeDuration(diffMs)}`, tone };
}

const AGE_COLOR: Record<PendingAgeTone, { bg: string; color: string }> = {
  normal: { bg: "#F1F5F9", color: "#475569" },
  warn: { bg: "#FFFBEB", color: "#D97706" },
  alert: { bg: "#FEF2F2", color: "#DC2626" },
};

function fmtRequestedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ApprovalQueueCard({
  approval,
  context,
  canDecide,
  onChanged,
  now,
}: {
  approval: OperationalApproval;
  context: ApprovalApiContext;
  canDecide: boolean;
  onChanged: () => void;
  now?: Date;
}) {
  const navigate = useNavigate();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = STATUS_CHIP[approval.status];
  const age = formatPendingAge(approval.requestedAt, now);
  const ageColor = AGE_COLOR[age.tone];

  async function approve() {
    setSubmitting(true);
    setError(null);
    try {
      await approveOperationalApproval(context, approval.id);
      onChanged();
    } catch {
      setError("Não foi possível registrar a aprovação.");
      setSubmitting(false);
    }
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
      await rejectOperationalApproval(context, approval.id, reason);
      onChanged();
    } catch {
      setError("Não foi possível registrar a reprovação.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ ...card, padding: 18, marginBottom: 13, display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99 }}>{entityTypeLabel(approval.entityType)}</span>
          <span style={{ background: status.bg, color: status.color, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99 }}>{status.text}</span>
          <span style={{ background: ageColor.bg, color: ageColor.color, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99 }}>{age.label}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 4, lineHeight: 1.4 }}>{approval.pendingReason}</div>
        <div style={{ fontSize: 12.5, color: "#64748B" }}>
          Solicitado por <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{approval.requestedBy}</span> · {fmtRequestedAt(approval.requestedAt)}
        </div>
        {approval.workOrderId ? (
          <div
            onClick={() => navigate(`/work-orders/${approval.workOrderId}`)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}
          >
            Abrir ordem de serviço <ArrowRight size={13} />
          </div>
        ) : null}
        {error ? <div style={{ fontSize: 12.5, color: "#DC2626", fontWeight: 600, marginTop: 10 }}>{error}</div> : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, alignItems: "flex-end" }}>
        <button type="button" onClick={() => navigate(`/approvals/${approval.id}`)} style={btn("#fff", "#334155", "1px solid #E2E8F0")}>
          Detalhar
        </button>
        {canDecide ? (
          rejecting ? null : (
            <div style={{ display: "flex", gap: 9 }}>
              <button type="button" onClick={() => void approve()} disabled={submitting} style={{ ...btn("#059669", "#fff"), opacity: submitting ? 0.6 : 1 }}>
                <CheckCircle2 size={15} />Aprovar
              </button>
              <button type="button" onClick={() => { setRejecting(true); setError(null); }} disabled={submitting} style={btn("#fff", "#DC2626", "1px solid #FECACA")}>
                <XCircle size={15} />Recusar
              </button>
            </div>
          )
        ) : (
          <span style={{ fontSize: 11.5, color: "#94A3B8", textAlign: "right", maxWidth: 180 }}>Você não tem permissão para decidir esta aprovação.</span>
        )}
      </div>

      {canDecide && rejecting ? (
        <div style={{ flexBasis: "100%" }}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da reprovação (obrigatório)"
            rows={3}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #E2E8F0", borderRadius: 10, padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => void reject()} disabled={submitting} style={{ ...btn("#DC2626", "#fff"), opacity: submitting ? 0.6 : 1 }}>Confirmar reprovação</button>
            <button type="button" onClick={() => { setRejecting(false); setReason(""); setError(null); }} disabled={submitting} style={btn("#fff", "#334155", "1px solid #E2E8F0")}>Cancelar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QueueHeader({ count }: { count: number | null }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Fila de Aprovações</div>
      <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
        {count === null ? SUBTITLE : `${count} ${count === 1 ? "aprovação aguardando decisão" : "aprovações aguardando decisão"}`}
      </div>
    </div>
  );
}

export function ApprovalsQueueContent({
  items,
  loading,
  forbidden,
  source,
  canDecide,
  context,
  onChanged,
  now,
}: {
  items: readonly OperationalApproval[];
  loading: boolean;
  forbidden: boolean;
  source: ApprovalsQueueSource;
  canDecide: boolean;
  context: ApprovalApiContext;
  onChanged: () => void;
  now?: Date;
}) {
  // §7 — carregando: skeleton (sem inventar linha enquanto a resposta não chega).
  if (loading) {
    return (
      <div style={{ color: "#0F172A" }}>
        <QueueHeader count={null} />
        <div style={{ ...card, padding: 20 }}>
          <Skeleton lines={6} />
        </div>
      </div>
    );
  }

  // §7 — acesso não permitido: gate `work_orders:read` respondeu 403. Não é erro de sistema.
  if (forbidden) {
    return (
      <div style={{ color: "#0F172A" }}>
        <QueueHeader count={null} />
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar a fila de aprovações desta organização. Fale com um administrador se precisar deste acesso."
        />
      </div>
    );
  }

  // §7 — falha de carregamento (5xx/rede): aviso honesto, sem dado fabricado. O auto-refresh tenta de novo.
  if (source === "fallback") {
    return (
      <div style={{ color: "#0F172A" }}>
        <QueueHeader count={null} />
        <Alert title="Não foi possível carregar as aprovações" tone="warning">
          Houve uma falha ao buscar a fila de aprovações. A tela volta a tentar automaticamente em alguns instantes — nenhum item é exibido enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      </div>
    );
  }

  // §7 — vazio: sem aprovações pendentes (inclui o modo demonstração).
  if (items.length === 0) {
    return (
      <div style={{ color: "#0F172A" }}>
        <QueueHeader count={0} />
        <div style={{ ...card, padding: 8 }}>
          <EmptyState
            title="Sem aprovações pendentes"
            detail="Nenhuma aprovação operacional aguarda decisão nesta organização. Assim que uma pendência for aberta, ela aparecerá aqui."
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: "#0F172A" }}>
      <QueueHeader count={items.length} />
      {items.map((approval) => (
        <ApprovalQueueCard key={approval.id} approval={approval} context={context} canDecide={canDecide} onChanged={onChanged} now={now} />
      ))}
    </div>
  );
}

export function ApprovalsPage() {
  const { items, loading, forbidden, source, refresh, context } = useApprovalsQueue();
  const { permissions } = usePermissions();
  // Paridade EXATA com WorkOrderDetailPage/ApprovalPanel: decidir = work_orders:cancel OU :approve.
  const canDecide = permissions.includes("work_orders:cancel") || permissions.includes("work_orders:approve");

  const onChanged = useCallback(() => {
    void refresh();
    // O badge de pendências no shell escuta este evento para recontar.
    window.dispatchEvent(new Event("approvals:changed"));
  }, [refresh]);

  return (
    <ApprovalsQueueContent
      items={items}
      loading={loading}
      forbidden={forbidden}
      source={source}
      canDecide={canDecide}
      context={context}
      onChanged={onChanged}
    />
  );
}

export default ApprovalsPage;
