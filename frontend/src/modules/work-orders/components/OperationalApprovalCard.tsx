import { Check, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, Button, Card, Chip } from "../../../components/ui";
import {
  approveOperationalApproval,
  listPendingApprovals,
  rejectOperationalApproval,
} from "../approval.service";
import { entityTypeLabel } from "../approval.types";
import type { OperationalApproval } from "../approval.types";
import type { WorkOrdersApiContext } from "../work-orders.types";

export function OperationalApprovalCard({
  context,
  workOrderId,
  canDecide,
}: {
  readonly context: WorkOrdersApiContext;
  readonly workOrderId: string;
  readonly canDecide: boolean;
}) {
  const [approval, setApproval] = useState<OperationalApproval | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "info" | "warning"; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listPendingApprovals(context, workOrderId)
      .then((items) => {
        if (active) setApproval(items[0] ?? null);
      })
      .catch(() => {
        if (active) setFeedback({ tone: "warning", message: "Nao foi possivel carregar a aprovacao operacional." });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [context, workOrderId]);

  async function approve() {
    if (!approval) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const updated = await approveOperationalApproval(context, approval.id);
      setApproval(updated);
      setFeedback({ tone: "info", message: updated.safeMessage });
    } catch {
      setFeedback({ tone: "warning", message: "Nao foi possivel registrar a aprovacao." });
    } finally {
      setSubmitting(false);
    }
  }

  async function reject() {
    if (!approval) return;
    if (!reason.trim()) {
      setFeedback({ tone: "warning", message: "Informe o motivo da reprovacao." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const updated = await rejectOperationalApproval(context, approval.id, reason);
      setApproval(updated);
      setRejecting(false);
      setFeedback({ tone: "info", message: updated.safeMessage });
    } catch {
      setFeedback({ tone: "warning", message: "Nao foi possivel registrar a reprovacao." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Aprovacao operacional" action={<ShieldCheck size={18} aria-hidden />}>
      {loading ? <p className="work-order-helper">Carregando aprovacao...</p> : null}
      {!loading && !approval ? <p className="work-order-helper">Sem pendencia de aprovacao para esta OS.</p> : null}
      {approval ? (
        <div className="page-stack">
          <div className="work-orders-actions">
            <Chip tone={approvalTone(approval)}>
              {approvalLabel(approval)}
            </Chip>
            <span>{entityLabel(approval)}</span>
          </div>
          <div className="work-order-date-grid">
            <span>Solicitada por: {approval.requestedBy}</span>
            <span>Data: {formatDate(approval.requestedAt)}</span>
            <span>Motivo: {approval.pendingReason}</span>
            {approval.decidedBy ? <span>Decidida por: {approval.decidedBy}</span> : null}
            {approval.decidedAt ? <span>Decisao: {formatDate(approval.decidedAt)}</span> : null}
            {approval.reason ? <span>Reprovacao: {approval.reason}</span> : null}
          </div>

          {approval.status === "pending_approval" ? (
            canDecide ? (
              <>
                {rejecting ? (
                  <label className="ui-field">
                    <span>Motivo da reprovacao</span>
                    <textarea
                      className="ui-input"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      disabled={submitting}
                    />
                  </label>
                ) : null}
                <div className="work-orders-actions">
                  <Button type="button" onClick={() => void approve()} disabled={submitting}>
                    <Check size={16} /> Aprovar
                  </Button>
                  {rejecting ? (
                    <Button type="button" variant="danger" onClick={() => void reject()} disabled={submitting}>
                      <X size={16} /> Confirmar reprovacao
                    </Button>
                  ) : (
                    <Button type="button" variant="danger" onClick={() => setRejecting(true)} disabled={submitting}>
                      <X size={16} /> Reprovar
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="work-order-helper">Seu usuario nao possui `work_orders:update` para decidir.</p>
            )
          ) : null}
        </div>
      ) : null}
      {feedback ? <Alert title="Aprovacao operacional" tone={feedback.tone}>{feedback.message}</Alert> : null}
    </Card>
  );
}

function approvalLabel(approval: OperationalApproval): string {
  if (approval.status === "approved") return "Aprovado";
  if (approval.status === "rejected") return "Reprovado";
  return "Pendente";
}

function approvalTone(approval: OperationalApproval): "success" | "danger" | "pending" {
  if (approval.status === "approved") return "success";
  if (approval.status === "rejected") return "danger";
  return "pending";
}

function entityLabel(approval: OperationalApproval): string {
  return entityTypeLabel(approval.entityType);
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString("pt-BR");
}
