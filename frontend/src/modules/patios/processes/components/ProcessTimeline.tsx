import type { CSSProperties } from "react";

import { EmptyState } from "../../../../components/ui";
import { describeEventPayload, formatDateTime, truncateHash } from "../processes.adapter";
import type { CustodyEventItem } from "../processes.types";

// Timeline vertical densa (§11) da cadeia de custódia (I2). Ordenada por seq (garantido no adapter). Cada evento
// mostra o rótulo PT-BR (typeLabel do backend), a data/hora, o payload amigável e os hashes como PROVA (truncados,
// §2.8). Append-only na origem — a UI só lê.
const listStyle: CSSProperties = { listStyle: "none", margin: 0, padding: 0, position: "relative" };
const itemStyle: CSSProperties = { position: "relative", paddingLeft: 26, paddingBottom: 18, borderLeft: "2px solid #E2E8F0", marginLeft: 6 };
const dotStyle: CSSProperties = { position: "absolute", left: -7, top: 2, width: 12, height: 12, borderRadius: "50%", background: "#2563EB", border: "2px solid #fff" };
const seqStyle: CSSProperties = { display: "inline-flex", minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 6, background: "#EFF6FF", color: "#1D4ED8", fontSize: 11, fontWeight: 800, marginRight: 8, fontVariantNumeric: "tabular-nums" };
const titleRow: CSSProperties = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" };
const dateStyle: CSSProperties = { fontSize: 12, color: "var(--text-secondary)" };
const payloadRow: CSSProperties = { fontSize: 13, color: "#334155", marginTop: 4 };
const hashStyle: CSSProperties = { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: 11, color: "#94A3B8", marginTop: 3 };

export function ProcessTimeline({ events }: { readonly events: readonly CustodyEventItem[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="Nenhum evento de custódia registrado"
        detail="A linha do tempo é preenchida automaticamente conforme o processo avança (recepção, vaga, vistoria, mudanças de estado)."
      />
    );
  }

  // Ordem determinística por seq (append-only na origem) — garantida no componente (defense-in-depth).
  const ordered = [...events].sort((a, b) => a.seq - b.seq);

  return (
    <ol style={listStyle}>
      {ordered.map((event) => {
        const entries = describeEventPayload(event.payload);
        return (
          <li key={event.id} style={itemStyle}>
            <span style={dotStyle} aria-hidden />
            <div style={titleRow}>
              <span style={seqStyle} aria-label={`Evento número ${event.seq}`}>
                {event.seq}
              </span>
              <strong>{event.typeLabel}</strong>
              <span style={dateStyle}>· {formatDateTime(event.occurredAt)}</span>
            </div>
            {entries.length > 0 ? (
              <div style={payloadRow}>
                {entries.map((entry) => (
                  <span key={entry.label} style={{ marginRight: 12 }}>
                    <span style={{ color: "#64748B" }}>{entry.label}:</span> {entry.value}
                  </span>
                ))}
              </div>
            ) : null}
            <div style={hashStyle} title="Prova de integridade (cadeia de hash)">
              hash {truncateHash(event.hash)} · anterior {truncateHash(event.prevHash)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default ProcessTimeline;
