import type { CSSProperties } from "react";

import { Badge, Card, Chip, EmptyState } from "../../../../components/ui";
import { ProcessStatusChip } from "../../processes/components/ProcessStatusChip";
import type { ImpoundStatus } from "../../processes/processes.types";
import {
  buildRoundRows,
  formatMoney,
  getEdictStatusTone,
  getOutcomeTone,
} from "../auction.adapter";
import type { AuctionView } from "../auction.types";

// §11 — painel de ESTADO do leilão: chips do estado + contadores de strike + tabela de rodadas (edital × resultado
// por rodada). Leitura pura; nenhum valor sigiloso é exibido sem canAppraise (SIGILO art. 28). §2.8: winnerRef/
// auctioneerRef já vêm mascarados do backend (renderiza a máscara); nenhum UUID de ator é exibido.
const cellStyle: CSSProperties = { padding: "8px 10px", fontSize: 13, color: "#0F172A", borderTop: "1px solid #F1F5F9", verticalAlign: "top" };
const headCellStyle: CSSProperties = { padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".03em", textAlign: "left" };
const chipRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 };
const mutedStyle: CSSProperties = { color: "#94A3B8" };

export function AuctionStatePanel({
  view,
  status,
  statusLabel,
  canAppraise,
}: {
  readonly view: AuctionView;
  readonly status: ImpoundStatus;
  readonly statusLabel: string;
  readonly canAppraise: boolean;
}) {
  const rows = buildRoundRows(view);

  return (
    <Card title="Situação do leilão">
      <div style={chipRow}>
        <ProcessStatusChip status={status} label={statusLabel} />
        <Chip tone={view.strikeCount >= view.maxAttempts ? "danger" : "warning"}>
          Rodadas desertas: {view.strikeCount}/{view.maxAttempts}
        </Chip>
        {view.strikesRemaining > 0 ? (
          <Badge tone="default">
            {view.strikesRemaining} {view.strikesRemaining === 1 ? "rodada restante" : "rodadas restantes"}
          </Badge>
        ) : (
          <Badge tone="warning">Teto de rodadas atingido</Badge>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhuma rodada registrada"
          detail="Ainda não há editais nem rodadas do certame registrados para este processo."
        />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headCellStyle}>Rodada</th>
                <th style={headCellStyle}>Edital</th>
                <th style={headCellStyle}>Classificação</th>
                <th style={headCellStyle}>Situação do edital</th>
                {canAppraise ? <th style={headCellStyle}>Avaliação · Lance mínimo</th> : null}
                <th style={headCellStyle}>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.roundNumber}>
                  <td style={cellStyle}>
                    <strong>{row.roundNumber}ª</strong>
                  </td>
                  <td style={cellStyle}>
                    {row.edict ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>{row.edict.edictReference ?? <span style={mutedStyle}>Sem referência</span>}</span>
                        {row.edict.edictPlatform ? <span style={{ fontSize: 11, color: "#64748B" }}>{row.edict.edictPlatform}</span> : null}
                      </div>
                    ) : (
                      <span style={mutedStyle}>—</span>
                    )}
                  </td>
                  <td style={cellStyle}>{row.edict?.classificationLabel ?? <span style={mutedStyle}>—</span>}</td>
                  <td style={cellStyle}>
                    {row.edict ? <Chip tone={getEdictStatusTone(row.edict.status)}>{row.edict.statusLabel}</Chip> : <span style={mutedStyle}>—</span>}
                  </td>
                  {canAppraise ? (
                    <td style={cellStyle}>
                      {/* SIGILO art. 28 — só quem tem auction:appraise chega aqui (canAppraise). Sem valor registrado
                          → "não registrada", NUNCA um placeholder numérico. */}
                      {row.edict && (row.edict.appraisalAmount || row.edict.minBidAmount) ? (
                        <span>
                          {formatMoney(row.edict.appraisalAmount)} · {formatMoney(row.edict.minBidAmount)}
                        </span>
                      ) : (
                        <span style={mutedStyle}>Não registrada</span>
                      )}
                    </td>
                  ) : null}
                  <td style={cellStyle}>
                    {row.attempt ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <Chip tone={getOutcomeTone(row.attempt.outcome)}>{row.attempt.outcomeLabel}</Chip>
                        {row.attempt.outcome === "SOLD" ? (
                          <span style={{ fontSize: 11, color: "#166534" }}>
                            Arremate: {formatMoney(row.attempt.soldAmount)}
                            {row.attempt.winnerRef ? ` · arrematante ${row.attempt.winnerRef}` : ""}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span style={mutedStyle}>Sem resultado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default AuctionStatePanel;
