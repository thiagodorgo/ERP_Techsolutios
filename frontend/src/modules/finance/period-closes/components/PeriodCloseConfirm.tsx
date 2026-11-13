import { AlertTriangle, Lock, Unlock } from "lucide-react";
import { useState } from "react";

import type { PeriodAction, PeriodDetail } from "../period-closes.types";
import { periodLabel, periodName } from "../period-keys";

// B-SAN3-24 (24b, R-DISPUTA-DO-GET, `D-PORTAO-7-RECOMENDACOES-1011`) — fechar e reabrir em 2 passos, IGUAL nas 3
// aparências. Fechar: o 1º clique só abre esta confirmação, com o texto da trava; sem título em contestação o 2º clique
// fecha (corpo `{}`); com contestação (contagem do checklist JÁ LIDO), o 1º passo explica o bloqueio e o 2º é "Fechar
// mesmo assim", com motivo obrigatório. Reabrir (só administradores) pede o motivo, que vai para a auditoria.

export function PeriodCloseConfirm({
  action,
  detail,
  sending,
  message,
  onConfirm,
  onCancel,
}: {
  readonly action: PeriodAction;
  readonly detail: PeriodDetail;
  readonly sending: boolean;
  readonly message: string | null;
  readonly onConfirm: (forcing: boolean, reason: string) => void;
  readonly onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState("");
  const label = periodLabel(detail.period);
  const disputes = detail.checklist?.inDisputeTitles ?? 0;
  const forcing = action === "close" && disputes > 0;
  const textarea = (title: string) => (
    <label style={{ display: "grid", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
      {title}
      <textarea
        value={reason}
        rows={3}
        maxLength={2000}
        onChange={(event) => setReason(event.currentTarget.value)}
        style={{ font: "inherit", fontWeight: 400, border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 10px", resize: "vertical" }}
      />
    </label>
  );

  return (
    <div style={{ display: "grid", gap: 14, color: "#0F172A" }}>
      {action === "close" ? (
        <p role="note" style={{ margin: 0, display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#1E3A8A", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 12px" }}>
          <Lock size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{`Depois de fechado, nada mais é lançado em ${label}; só um administrador reabre.`}</span>
        </p>
      ) : (
        <p role="note" style={{ margin: 0, display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#6D28D9", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "10px 12px" }}>
          <Unlock size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{`Reabrir ${label} volta a permitir lançamentos nesta competência. O motivo fica na auditoria.`}</span>
        </p>
      )}
      {action === "close" && detail.checklist ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#334155", display: "grid", gap: 4 }}>
          <li>
            <b style={{ color: disputes > 0 ? "#B91C1C" : "#047857" }}>{`${disputes} ${disputes === 1 ? "título em contestação" : "títulos em contestação"}`}</b>
            {disputes > 0 ? " — impede o fechamento" : " — nada impede"}
          </li>
          <li>{`${detail.checklist.unpaidTitles} títulos não liquidados (não impede; passam para o mês seguinte)`}</li>
          <li>{`${detail.checklist.unreconciledEntries} lançamentos a conciliar (não impede; a conciliação segue depois de fechado)`}</li>
        </ul>
      ) : null}
      {forcing && step === 1 ? (
        <p role="alert" style={{ margin: 0, display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#B91C1C" }}>
          <AlertTriangle size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{`${disputes === 1 ? "Há 1 título em contestação" : `Há ${disputes} títulos em contestação`} em ${periodName(detail.period)}. Para fechar mesmo assim, o próximo passo pede o motivo.`}</span>
        </p>
      ) : null}
      {forcing && step === 2 ? textarea("Motivo para fechar mesmo assim (obrigatório)") : null}
      {action === "reopen" ? textarea("Motivo da reabertura (obrigatório)") : null}
      {message ? (
        <p role="alert" className="pat-banner pat-banner--error" style={{ margin: 0 }}>
          {message}
        </p>
      ) : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="pat-btn" onClick={onCancel} disabled={sending}>
          Voltar
        </button>
        {action === "reopen" ? (
          <button type="button" className="pat-btn pat-btn--primary" disabled={sending || reason.trim() === ""} onClick={() => onConfirm(false, reason)}>
            {sending ? "Enviando…" : `Reabrir ${label}`}
          </button>
        ) : !forcing ? (
          <button type="button" className="pat-btn pat-btn--primary" disabled={sending} onClick={() => onConfirm(false, "")}>
            {sending ? "Enviando…" : `Fechar ${label}`}
          </button>
        ) : step === 1 ? (
          <button type="button" className="pat-btn pat-btn--primary" disabled={sending} onClick={() => setStep(2)}>
            Fechar mesmo assim…
          </button>
        ) : (
          <button type="button" className="pat-btn pat-btn--primary" disabled={sending || (forcing && reason.trim() === "")} onClick={() => onConfirm(true, reason)}>
            {sending ? "Enviando…" : "Fechar mesmo assim"}
          </button>
        )}
      </div>
    </div>
  );
}
