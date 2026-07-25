import { Download, Gauge, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";

import type { DenseColumn } from "../../../components/dense-list";
import { DenseListPagination, DenseTable, useDenseList } from "../../../components/dense-list";
import { Alert, Button, Card, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { downloadCsv } from "../../../lib/csv";
import { ProfessionalPicker } from "../components/ProfessionalPicker";
import { TELEMETRY_PERIOD_NOTE, TelemetryPeriodFilter } from "../components/TelemetryPeriodFilter";
import { formatKm, formatPoints, formatTelemetryDay } from "../telemetry.adapter";
import { DEFAULT_TELEMETRY_PERIOD } from "../telemetry.types";
import type { TelemetryKmView } from "../telemetry.types";
import { useTelemetryKm } from "../useTelemetryKm";

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const fieldStyle: CSSProperties = { minWidth: 220 };
const noteStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: "var(--space-6)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const totalsStyle: CSSProperties = { display: "flex", gap: "var(--space-16)", flexWrap: "wrap", marginBottom: "var(--space-10)", fontSize: "var(--text-sm)", fontWeight: 700 };

// Exporta SÓ a quilometragem real carregada (nunca dado fabricado — D-007). §2.8: sem coordenada crua.
function exportKmCsv(rows: readonly TelemetryKmView[]): void {
  const header = ["Profissional", "Dia", "Quilometragem", "Pontos usados"];
  const body = rows.map((row) => [row.professionalLabel, formatTelemetryDay(row.day), formatKm(row.kmTotal), formatPoints(row.pointsUsed)]);
  downloadCsv("quilometragem.csv", header, body);
}

// Ω4C PR-14 — Quilometragem (Telemetria): km por profissional/dia + totalizadores. §2.8: NENHUMA coordenada
// crua (o mapa/Rastreamento é o PR-15) — a tela só mostra dia, km e pontos usados. km 0 é honesto (sem trajeto).
export function QuilometragemPage() {
  const [professionalId, setProfessionalId] = useState("");
  const [period, setPeriod] = useState(DEFAULT_TELEMETRY_PERIOD);
  const { data, loading, isRefreshing, refresh } = useTelemetryKm(professionalId, period);
  const { items, source } = data;

  const totals = useMemo(
    () => ({
      km: Math.round(items.reduce((sum, row) => sum + row.kmTotal, 0) * 10) / 10,
      points: items.reduce((sum, row) => sum + row.pointsUsed, 0),
    }),
    [items],
  );

  const columns: DenseColumn<TelemetryKmView>[] = [
    { key: "day", header: "Dia", sortable: true, tabular: true, sortValue: (item) => item.day, render: (item) => formatTelemetryDay(item.day) },
    { key: "professional", header: "Profissional", sortable: true, sortValue: (item) => item.professionalLabel, render: (item) => <strong>{item.professionalLabel}</strong> },
    { key: "km", header: "Quilometragem", align: "right", tabular: true, sortable: true, sortValue: (item) => item.kmTotal, render: (item) => formatKm(item.kmTotal) },
    { key: "points", header: "Pontos usados", align: "right", tabular: true, sortable: true, sortValue: (item) => item.pointsUsed, render: (item) => formatPoints(item.pointsUsed) },
  ];

  const denseFilter = useCallback((rows: readonly TelemetryKmView[], base: { search: string }) => {
    const search = base.search.trim().toLowerCase();
    if (!search) return [...rows];
    return rows.filter((item) => item.professionalLabel.toLowerCase().includes(search) || item.day.includes(search));
  }, []);

  const dense = useDenseList<TelemetryKmView>({ items, columns, filter: denseFilter, defaultSort: { key: "day", dir: "desc" } });

  if (source === "forbidden") {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Controle · Telemetria</span>
          <h1>Quilometragem</h1>
        </header>
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar a telemetria desta organização. Fale com um administrador se precisar deste acesso."
        />
      </section>
    );
  }

  const canExport = items.length > 0;

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Controle · Telemetria</span>
          <h1>Quilometragem</h1>
          <p>Distância percorrida por profissional e por dia, somada a partir das leituras de localização consentidas.</p>
        </div>
        <div className="work-orders-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!canExport}
            title={canExport ? "Exportar a quilometragem carregada" : "Nenhuma quilometragem carregada para exportar."}
            onClick={() => exportKmCsv(items)}
          >
            <Download size={16} aria-hidden /> Exportar CSV
          </Button>
        </div>
      </header>

      <Card title="Filtros">
        <div style={filterRowStyle}>
          <div style={fieldStyle}>
            <ProfessionalPicker value={professionalId} onChange={setProfessionalId} />
          </div>
          <TelemetryPeriodFilter period={period} onChange={setPeriod} />
        </div>
        <p style={noteStyle}>{TELEMETRY_PERIOD_NOTE}</p>
      </Card>

      {source === "invalid_window" ? (
        <Alert title="Período muito longo" tone="warning">
          O intervalo selecionado é maior do que o permitido para esta consulta. Reduza o período de De/Até e tente novamente — nenhuma quilometragem é exibida enquanto isso para não apresentar dado incompleto.
        </Alert>
      ) : null}

      {source === "fallback" ? (
        <Alert title="Não foi possível carregar a quilometragem" tone="warning">
          Houve uma falha ao buscar a quilometragem. A tela volta a tentar automaticamente em alguns instantes — nenhum dado é exibido enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      ) : null}

      {source === "needs_professional" ? (
        <Card title="Quilometragem">
          <EmptyState title="Selecione um profissional" detail="Escolha um profissional no filtro acima para consultar a quilometragem do período." />
        </Card>
      ) : (
        <Card
          title="Quilometragem"
          action={
            <span style={countStyle}>
              {dense.total} dia(s){isRefreshing ? " · atualizando…" : ""}
            </span>
          }
        >
          {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

          {!loading && source !== "fallback" && source !== "invalid_window" && dense.total === 0 ? (
            <EmptyState
              title="Sem quilometragem no período"
              detail={
                dense.hasActiveFilters
                  ? "Ajuste a busca para encontrar dias com quilometragem."
                  : "Não há trajeto registrado para este profissional no período. Sem leituras de localização consentidas, a quilometragem é zero."
              }
            />
          ) : null}

          {dense.total > 0 ? (
            <>
              <div style={totalsStyle}>
                <span>
                  Total no período: <Gauge size={14} aria-hidden /> {formatKm(totals.km)}
                </span>
                <span>Pontos usados: {formatPoints(totals.points)}</span>
              </div>
              <DenseTable rows={dense.visibleItems} keyForRow={(item) => `${item.day}·${item.professionalLabel}`} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
              <DenseListPagination
                page={dense.page}
                pageSize={dense.pageSize}
                pageSizeOptions={dense.pageSizeOptions}
                total={dense.total}
                totalPages={dense.totalPages}
                pageStart={dense.pageStart}
                pageEnd={dense.pageEnd}
                onPageChange={dense.setPage}
                onPageSizeChange={dense.setPageSize}
              />
            </>
          ) : null}

          {source === "fallback" ? (
            <div style={{ marginTop: "var(--space-10)" }}>
              <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
                <RefreshCw size={14} aria-hidden /> Tentar novamente
              </Button>
            </div>
          ) : null}
        </Card>
      )}
    </section>
  );
}

export default QuilometragemPage;
