import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";

import { formatBRL, formatDueDate } from "../../titles/financial-titles.adapter";
import { financeErrorMessage } from "../finance-errors";
import type { DivergenceType, FinancialEntry, ReconcilePayload } from "../financial-entries.types";
import { reconcilePayloadFor } from "../useFinanceActions";

// B-SAN3-12b — CONCILIAR com o extrato do banco (opção A: em janela). O corpo SEMPRE leva o estado lido da linha (F10).
// Qualquer falha relê o lançamento ANTES de falar, entrega o estado novo para a página repintar a linha e só então
// decide: se outra pessoa já conciliou, não há o que reenviar; senão, a nova tentativa usa o estado relido (F22).

type Phase = "form" | "sending" | "rereading" | "taken" | "reread_failed";

export type ConciliarActions = {
  readonly reconcile: (entryId: string, payload: ReconcilePayload) => Promise<FinancialEntry>;
  readonly rereadEntry: (entryId: string) => Promise<FinancialEntry>;
};

const CHOICES: readonly { readonly value: DivergenceType | "none"; readonly label: string }[] = [
  { value: "none", label: "Bate com o extrato" },
  { value: "value", label: "Bate, com ressalva de valor" },
  { value: "date", label: "Bate, com ressalva de data" },
];

export function ConciliarForm({
  entry,
  actions,
  onDone,
  onReread,
  onClose,
}: {
  readonly entry: FinancialEntry;
  readonly actions: ConciliarActions;
  readonly onDone: (entry: FinancialEntry) => void;
  readonly onReread: (entry: FinancialEntry) => void;
  readonly onClose: () => void;
}) {
  const [current, setCurrent] = useState(entry);
  const [divergence, setDivergence] = useState<DivergenceType | "none">("none");
  const [ref, setRef] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [message, setMessage] = useState<string | null>(null);

  async function reread(): Promise<FinancialEntry | null> {
    try {
      const fresh = await actions.rereadEntry(current.id);
      setCurrent(fresh);
      onReread(fresh);
      return fresh;
    } catch {
      return null;
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (phase !== "form") return;
    setPhase("sending");
    setMessage(null);
    try {
      onDone(await actions.reconcile(current.id, reconcilePayloadFor(current, { reconciled: true, divergence, ref })));
    } catch (error) {
      setMessage(financeErrorMessage(error));
      setPhase("rereading");
      const fresh = await reread();
      if (!fresh) setPhase("reread_failed");
      else setPhase(fresh.reconciled ? "taken" : "form");
    }
  }

  async function retryReread() {
    setPhase("rereading");
    const fresh = await reread();
    if (!fresh) setPhase("reread_failed");
    else setPhase(fresh.reconciled ? "taken" : "form");
  }

  const locked = phase !== "form";
  return (
    <form onSubmit={submit} aria-label="Conciliar com o extrato do banco" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>
        {`${current.description ?? "Lançamento"} · ${formatDueDate(current.occurredAt)} · ${current.direction === "in" ? "entrada" : "saída"} de ${formatBRL(current.amount)}`}
      </p>
      {phase !== "taken" ? (
        <>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <legend style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>Como o lançamento aparece no extrato do banco?</legend>
            {CHOICES.map((choice) => (
              <label key={choice.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="radio" name="divergencia" value={choice.value} checked={divergence === choice.value} disabled={locked} onChange={() => setDivergence(choice.value)} />
                {choice.label}
              </label>
            ))}
          </fieldset>
          <label className="ui-field" style={{ maxWidth: 340 }}>
            <span>Referência no extrato (opcional — ex.: número do documento)</span>
            <input className="ui-input" name="referencia" maxLength={60} value={ref} disabled={locked} onChange={(event) => setRef(event.target.value)} />
          </label>
        </>
      ) : null}
      {phase === "rereading" ? (
        <div className="ui-alert" role="status">
          Conferindo a situação do lançamento antes de responder…
        </div>
      ) : null}
      {message ? (
        <div className="ui-alert ui-alert--danger" role="alert">
          {message}
        </div>
      ) : null}
      {phase === "taken" ? (
        <div className="ui-alert" role="status">
          Outra pessoa já conciliou este lançamento. A linha foi atualizada com a situação do servidor.
        </div>
      ) : null}
      {phase === "reread_failed" ? (
        <div className="ui-alert ui-alert--danger" role="alert">
          Não foi possível confirmar a situação do lançamento.{" "}
          <button type="button" className="pat-link" onClick={() => void retryReread()}>
            Conferir de novo
          </button>
        </div>
      ) : null}
      <div className="pat-ab-detail-actions" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="pat-btn" onClick={onClose} disabled={phase === "sending"}>
          {phase === "taken" ? "Fechar" : "Cancelar"}
        </button>
        {phase !== "taken" ? (
          <button type="submit" className="pat-btn pat-btn--primary" disabled={locked}>
            <Check size={14} aria-hidden="true" />
            {phase === "sending" ? "Conciliando…" : "Conciliar"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
