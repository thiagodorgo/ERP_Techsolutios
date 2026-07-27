import { Clock, Hammer, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Alert, Badge, Button, Card } from "../../../../components/ui";
import { formatDateTime } from "../../processes/processes.adapter";
import type { ForRepairInput, ReleaseDto } from "../release.types";

// Saída para reparo (CTB art. 271 §2º / Res. 1025 art. 23 §1º). 3 modos: preparar (monta o dossiê FOR_REPAIR),
// efetivar (dispara a saída ACTIVE_CUSTODY→RELEASED_FOR_REPAIR) e retornar (RELEASED_FOR_REPAIR→ACTIVE_CUSTODY).
// D-Ω5P-REL-07: a diária SEGUE correndo durante o reparo (o veículo continua sob custódia jurídica). O selo
// repairOverdue (âmbar) sinaliza o estouro do prazo — a coerção é Fase 4 (NÃO muda o estado aqui).
const warnBox: CSSProperties = { fontSize: 12, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "8px 10px", margin: "0 0 12px" };
const infoRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", marginBottom: 10 };

export function ReparoPanel({
  mode,
  release,
  canTransition,
  busy,
  error,
  onPrepare,
  onEffect,
  onReturn,
}: {
  readonly mode: "prepare" | "effect" | "return";
  readonly release: ReleaseDto | null;
  readonly canTransition: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onPrepare: (input: ForRepairInput) => void;
  readonly onEffect: () => void;
  readonly onReturn: () => void;
}) {
  const [deadline, setDeadline] = useState("");

  return (
    <Card title="Saída para reparo">
      {error ? (
        <Alert title="Não foi possível concluir a saída para reparo" tone="danger">
          {error}
        </Alert>
      ) : null}

      <p style={warnBox}>A diária segue correndo durante o reparo: o veículo permanece sob custódia jurídica, apenas fisicamente fora do pátio.</p>

      {release?.repairDeadline ? (
        <div style={infoRow}>
          <Clock size={15} aria-hidden color={release.repairOverdue ? "#B45309" : "#2563EB"} />
          <span>Prazo de reparo até {formatDateTime(release.repairDeadline)}.</span>
          {release.repairOverdue ? <Badge tone="warning">Prazo estourado</Badge> : null}
        </div>
      ) : null}

      {mode === "prepare" ? (
        canTransition ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="ui-field" htmlFor="release-repair-deadline">
              <span>Prazo de reparo (até 60 dias, art. 23 §1º)</span>
              <input id="release-repair-deadline" className="ui-input" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="button" onClick={() => onPrepare({ repairDeadline: toDeadlineIso(deadline) })} disabled={busy || !deadline} aria-label="Preparar saída para reparo">
                <Hammer size={15} aria-hidden /> {busy ? "Preparando…" : "Preparar saída para reparo"}
              </Button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>Você não tem permissão para preparar a saída para reparo.</p>
        )
      ) : null}

      {mode === "effect" ? (
        canTransition ? (
          <div>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>
              Com o prazo definido, quem transporta identificado e a autorização da autoridade registrada, efetive a saída para reparo.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="button" onClick={onEffect} disabled={busy} aria-label="Efetivar saída para reparo">
                <Hammer size={15} aria-hidden /> {busy ? "Efetivando…" : "Efetivar saída para reparo"}
              </Button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>Você não tem permissão para efetivar a saída para reparo.</p>
        )
      ) : null}

      {mode === "return" ? (
        canTransition ? (
          <div>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>
              Registre o retorno do veículo ao pátio. A restituição definitiva segue pelo caminho padrão (reapresentação em custódia ativa).
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="button" onClick={onReturn} disabled={busy} aria-label="Registrar retorno do reparo">
                <RotateCcw size={15} aria-hidden /> {busy ? "Registrando…" : "Registrar retorno do reparo"}
              </Button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>Você não tem permissão para registrar o retorno do reparo.</p>
        )
      ) : null}
    </Card>
  );
}

// Prazo digitado (YYYY-MM-DD) → ISO no fim do dia selecionado (evita "no passado" por meia-noite; o backend
// re-valida ≤60d / não-passado e é a autoridade).
function toDeadlineIso(date: string): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export default ReparoPanel;
