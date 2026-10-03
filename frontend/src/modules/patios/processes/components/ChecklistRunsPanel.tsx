import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

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

// B-SAN3-11 (ciclo 2, D-C2-4) — os links de versão usam o idioma de link da casa (`.pat-link`: cor, peso, hover e foco
// visível) e NÃO navegam: o clique procura a linha-alvo DENTRO da própria tabela (escopo pelo `ref`, nunca o documento —
// a impressão monta uma segunda cópia do painel), centraliza-a (fora do cabeçalho fixo do modal), dá-lhe o foco e a
// realça por ~1,6 s, sem tocar a URL nem o histórico. Sem alvo, nada é prevenido e o `href` nativo vale.
const highlightStyle: CSSProperties = { outline: "2px solid #2563EB", outlineOffset: -2 };
const HIGHLIGHT_MS = 1600;

type VersionRowEvent = { preventDefault(): void };
type VersionRowTarget = { scrollIntoView(options?: ScrollIntoViewOptions): void; focus(options?: FocusOptions): void };
type VersionRowScope = { querySelector(selectors: string): unknown };

function isVersionRowTarget(value: unknown): value is VersionRowTarget {
  const candidate = value as Partial<VersionRowTarget> | null | undefined;
  return typeof candidate?.scrollIntoView === "function" && typeof candidate?.focus === "function";
}

export function focusVersionRow(event: VersionRowEvent, scope: VersionRowScope | null, targetId: string): string | null {
  const target = scope?.querySelector(`[id="${targetId.replace(/["\\]/g, "\\$&")}"]`);
  if (!isVersionRowTarget(target)) return null;
  event.preventDefault();
  target.scrollIntoView({ block: "center" });
  target.focus({ preventScroll: true });
  return targetId;
}

export function ChecklistRunsPanel({
  runs,
  loading,
  error,
  denied,
  onRetry,
  idPrefix = "vistoria",
}: {
  readonly runs: readonly ChecklistRunSummaryItem[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly denied: boolean;
  readonly onRetry: () => void;
  /** Prefixo dos ids das linhas (`<prefixo>-<id>`): ids únicos no DOM quando o painel aparece duas vezes (impressão). */
  readonly idPrefix?: string;
}) {
  const hasRuns = runs.length > 0;
  const tableRef = useRef<HTMLTableElement>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  useEffect(() => {
    if (highlightedRowId === null) return;
    const timer = setTimeout(() => setHighlightedRowId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightedRowId]);

  const goToVersionRow = (event: ReactMouseEvent<HTMLAnchorElement>, targetId: string) => {
    const focused = focusVersionRow(event, tableRef.current, targetId);
    if (focused !== null) setHighlightedRowId(focused);
  };

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
            <table className="ui-table" ref={tableRef}>
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
                  const rowId = `${idPrefix}-${run.id}`;
                  return (
                    <tr key={run.id} id={rowId} tabIndex={-1} style={highlightedRowId === rowId ? highlightStyle : undefined}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {/* Ω-VID PR-08 (junta, MÉDIA) — identidade real da linha pelo NOME do formulário; fallback ao
                              rótulo genérico só quando o backend não resolve o nome. */}
                          <span style={primaryStyle}>{run.templateName ?? "Checklist do guincho"}</span>
                          <small style={legendStyle}>{`Formulário v${run.templateVersion}`}</small>
                          {isSuperseded && currentInList && (
                            <small style={legendStyle}>
                              {`Versão vigente: ${currentInList.templateName ?? "Checklist do guincho"} · Formulário v${currentInList.templateVersion} · iniciada em ${formatDateTime(currentInList.startedAt)}`}{" "}
                              <a
                                className="pat-link"
                                href={`#${idPrefix}-${run.currentRunId}`}
                                onClick={(event) => goToVersionRow(event, `${idPrefix}-${run.currentRunId}`)}
                              >
                                Ver versão vigente
                              </a>
                            </small>
                          )}
                          {isSuperseded && !currentInList && (
                            <small style={legendStyle}>A versão vigente desta vistoria não está vinculada a este dossiê.</small>
                          )}
                          {isReopenedCurrent && (
                            <small style={legendStyle}>
                              Versão atual — substitui uma vistoria anterior.{" "}
                              {previousInList && (
                                <a
                                  className="pat-link"
                                  href={`#${idPrefix}-${run.reopenedFromRunId}`}
                                  onClick={(event) => goToVersionRow(event, `${idPrefix}-${run.reopenedFromRunId}`)}
                                >
                                  Ver versão anterior
                                </a>
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
