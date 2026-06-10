import { useState } from "react";

import { Alert, Button } from "../../../../components/ui";
import { DispatchReassignForm } from "../../dispatches/components/DispatchReassignForm";
import { DispatchStatusActions } from "../../dispatches/components/DispatchStatusActions";
import { reassignDispatch, updateDispatchStatus } from "../../dispatches/dispatches.service";
import type { DispatchesApiContext } from "../../dispatches/dispatches.types";
import type { OperationsMapDispatch } from "../operations-map.types";

type ActionMode = "status" | "cancel" | "reassign" | null;

export function OperationsDispatchActionsPanel({
  dispatch,
  context,
  canUpdate,
  canCancel,
  canReassign,
  onChanged,
}: {
  readonly dispatch: OperationsMapDispatch;
  readonly context: DispatchesApiContext;
  readonly canUpdate: boolean;
  readonly canCancel: boolean;
  readonly canReassign: boolean;
  readonly onChanged: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<ActionMode>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelObservation, setCancelObservation] = useState("Despacho cancelado pelo Mapa Operacional.");
  const [savingCancel, setSavingCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshAfterChange() {
    await onChanged();
    setMode(null);
  }

  async function cancelDispatch() {
    if (!globalThis.window.confirm("Confirmar cancelamento do despacho?")) return;

    setSavingCancel(true);
    setError(null);
    try {
      await updateDispatchStatus(context, dispatch.id, {
        status: "cancelled",
        observation: cancelObservation,
        reason: cancelReason,
      });
      setCancelReason("");
      await refreshAfterChange();
    } catch {
      setError("Nao foi possivel cancelar o despacho pelo mapa. Tente novamente ou acompanhe pela tela de Despachos.");
    } finally {
      setSavingCancel(false);
    }
  }

  const canUseActions = canUpdate || canCancel || canReassign;

  if (!canUseActions) return null;

  return (
    <section className="operations-map-dispatch-actions" aria-label="Acoes do despacho">
      <header>
        <strong>Acoes do despacho</strong>
        {mode ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
            Fechar
          </Button>
        ) : null}
      </header>

      {error ? (
        <Alert title="Acao nao concluida" tone="warning">
          {error}
        </Alert>
      ) : null}

      <div className="operations-map-dispatch-actions__toolbar">
        {canUpdate ? (
          <Button type="button" size="sm" variant={mode === "status" ? "primary" : "secondary"} onClick={() => setMode("status")}>
            Alterar status
          </Button>
        ) : null}
        {canReassign ? (
          <Button type="button" size="sm" variant={mode === "reassign" ? "primary" : "secondary"} onClick={() => setMode("reassign")}>
            Reatribuir
          </Button>
        ) : null}
        {canCancel ? (
          <Button type="button" size="sm" variant={mode === "cancel" ? "primary" : "secondary"} onClick={() => setMode("cancel")}>
            Cancelar
          </Button>
        ) : null}
      </div>

      {mode === "status" && canUpdate ? (
        <DispatchStatusActions
          currentStatus={dispatch.status}
          canCancel={canCancel}
          onSubmit={async (payload) => {
            setError(null);
            try {
              await updateDispatchStatus(context, dispatch.id, payload);
              await refreshAfterChange();
            } catch {
              setError("Nao foi possivel alterar o status pelo mapa. O despacho nao foi alterado localmente.");
            }
          }}
        />
      ) : null}

      {mode === "reassign" && canReassign ? (
        <DispatchReassignForm
          currentOperatorUserId={dispatch.operatorUserId}
          onSubmit={async (payload) => {
            setError(null);
            try {
              await reassignDispatch(context, dispatch.id, payload);
              await refreshAfterChange();
            } catch {
              setError("Nao foi possivel reatribuir o despacho pelo mapa. O despacho nao foi alterado localmente.");
            }
          }}
        />
      ) : null}

      {mode === "cancel" && canCancel ? (
        <div className="work-order-action-form">
          <label className="ui-field">
            <span>Observacao</span>
            <textarea value={cancelObservation} onChange={(event) => setCancelObservation(event.target.value)} disabled={savingCancel} />
          </label>
          <label className="ui-field">
            <span>Motivo do cancelamento</span>
            <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} disabled={savingCancel} />
          </label>
          <Button type="button" onClick={cancelDispatch} disabled={savingCancel || !cancelReason.trim()}>
            {savingCancel ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
