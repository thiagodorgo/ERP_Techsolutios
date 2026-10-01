import type { CSSProperties } from "react";

import { Alert, Button, Card, Chip, EmptyState, Skeleton } from "../../../../components/ui";
import { formatDateTime, getChecklistRunStatusLabel, getChecklistRunStatusTone } from "../processes.adapter";
import type { ChecklistRunSummaryItem } from "../processes.types";

// Ω-VID PR-08 — aba "Checklist do Guincho" do dossiê. Componente PURO (presentational): recebe os runs já adaptados
// + estados. O guincheiro PREENCHE no mobile; aqui é SÓ LEITURA (D-decisão do dono: "na web só visualização").
// Consome o AUTO-link criado na criação do processo (PR-05) via GET /impound-processes/:id/checklist-runs (guarda
// DUPLA impound:read + checklist_runs:read no backend). §allowlist: NUNCA renderiza templateId/relatedEntityId cru
// (UUID) — o resumo é ESTREITO por desenho (P-IMPOUND-CHK-VISIBILITY); identifica pela versão do formulário + estado.
const legendStyle: CSSProperties = { fontSize: 11, color: "#64748B" };
const primaryStyle: CSSProperties = { fontSize: 14, color: "#0F172A", fontWeight: 600 };
const numCell: CSSProperties = { whiteSpace: "nowrap" };

export function ChecklistRunsPanel({
  runs,
  loading,
  error,
  denied,
  onRetry,
}: {
  readonly runs: readonly ChecklistRunSummaryItem[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly denied: boolean;
  readonly onRetry: () => void;
}) {
  const hasRuns = runs.length > 0;

  return (
    <Card title="Checklist do guincho">
      {denied ? (
        <EmptyState
          title="Sem acesso aos checklists do guincho"
          detail="Você não tem permissão para consultar os checklists preenchidos em campo neste processo de custódia."
        />
      ) : loading && !hasRuns ? (
        <Skeleton lines={4} />
      ) : error && !hasRuns ? (
        <Alert title="Não foi possível carregar os checklists" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </Alert>
      ) : !hasRuns ? (
        <EmptyState
          title="Nenhum checklist do guincho vinculado"
          detail="Quando o despacho gera a ordem de serviço com um checklist, o vínculo aparece aqui automaticamente. O guincheiro preenche em campo pelo aplicativo; esta tela apenas acompanha o preenchimento."
        />
      ) : (
        <>
          {/* Ω-VID PR-08 (junta, BAIXA) — falha de auto-refresh em segundo plano NÃO apaga a tabela já carregada:
              aviso inline não-destrutivo acima dela (os runs seguem visíveis), em vez de trocar tudo por um Alert. */}
          {error ? (
            <Alert title="Atualização em segundo plano falhou" tone="warning">
              {error}{" "}
              <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
                Tentar novamente
              </Button>
            </Alert>
          ) : null}
          <p style={{ ...legendStyle, marginBottom: 10 }}>
            Preenchido em campo pelo guincheiro (aplicativo). Esta é a visão de acompanhamento — somente leitura.{" "}
            Vistoria reaberta gera uma nova versão; a anterior fica preservada e marcada como substituída.
          </p>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Checklist</th>
                  <th>Situação</th>
                  <th style={numCell}>Iniciado</th>
                  <th style={numCell}>Concluído</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const isSuperseded = run.supersededByRunId !== null;
                  const isReopenedCurrent = !isSuperseded && run.reopenedFromRunId !== null;
                  const currentInList = isSuperseded ? (runs.find((r) => r.id === run.currentRunId) ?? null) : null;
                  const previousInList = isReopenedCurrent ? (runs.find((r) => r.id === run.reopenedFromRunId) ?? null) : null;
                  return (
                    <tr key={run.id} id={`vistoria-${run.id}`} tabIndex={-1}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {/* Ω-VID PR-08 (junta, MÉDIA) — identidade real da linha pelo NOME do formulário; fallback ao
                              rótulo genérico só quando o backend não resolve o nome. */}
                          <span style={primaryStyle}>{run.templateName ?? "Checklist do guincho"}</span>
                          <small style={legendStyle}>{`Formulário v${run.templateVersion}`}</small>
                          {isSuperseded && currentInList && (
                            <small style={legendStyle}>
                              {`Versão vigente: ${currentInList.templateName ?? "Checklist do guincho"} · Formulário v${currentInList.templateVersion} · iniciada em ${formatDateTime(currentInList.startedAt)}`}{" "}
                              <a href={`#vistoria-${run.currentRunId}`}>Ver versão vigente</a>
                            </small>
                          )}
                          {isSuperseded && !currentInList && (
                            <small style={legendStyle}>A versão vigente desta vistoria não está vinculada a este dossiê.</small>
                          )}
                          {isReopenedCurrent && (
                            <small style={legendStyle}>
                              Versão atual — substitui uma vistoria anterior.{" "}
                              {previousInList && (
                                <a href={`#vistoria-${run.reopenedFromRunId}`}>Ver versão anterior</a>
                              )}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        {isSuperseded ? (
                          <>
                            <Chip tone="default">Versão substituída</Chip>
                            <br />
                            <small style={legendStyle}>{`Situação na época: ${getChecklistRunStatusLabel(run.status)}`}</small>
                          </>
                        ) : (
                          <Chip tone={getChecklistRunStatusTone(run.status)}>{getChecklistRunStatusLabel(run.status)}</Chip>
                        )}
                      </td>
                      <td style={numCell}>{formatDateTime(run.startedAt)}</td>
                      <td style={numCell}>{run.completedAt ? formatDateTime(run.completedAt) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

export default ChecklistRunsPanel;
