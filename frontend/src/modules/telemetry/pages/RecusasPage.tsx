import { Download, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useState } from "react";

import type { DenseColumn } from "../../../components/dense-list";
import { DenseListPagination, DenseTable, useDenseList } from "../../../components/dense-list";
import { Alert, Badge, Button, Card, Chip, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { downloadCsv } from "../../../lib/csv";
import { ProfessionalPicker } from "../components/ProfessionalPicker";
import { TELEMETRY_PERIOD_NOTE, TelemetryPeriodFilter } from "../components/TelemetryPeriodFilter";
import { DEFAULT_TELEMETRY_PERIOD } from "../telemetry.types";
import type { TelemetryRefusalView } from "../telemetry.types";
import { useTelemetryRefusals } from "../useTelemetryRefusals";

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const fieldStyle: CSSProperties = { minWidth: 220 };
const noteStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: "var(--space-6)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

// Exporta SÓ as recusas reais carregadas (D-007). §2.8: só profissional/quando/motivo/OS — nunca IP/coordenada.
function exportRefusalsCsv(rows: readonly TelemetryRefusalView[]): void {
  const header = ["Profissional", "Quando", "Motivo", "Ordem de Serviço"];
  const body = rows.map((row) => [row.professionalLabel, row.when, row.reason ?? "—", row.workOrderRef ?? "—"]);
  downloadCsv("recusas.csv", header, body);
}

// Ω4C PR-14 — Recusas (Telemetria): SERVICE_REFUSAL por profissional, com motivo (badge de atenção) e a
// referência de OS (chip) quando houver. §2.8: sem coordenada/IP. `null` → "—" (honesto, nunca inventa).
export function RecusasPage() {
  const [professionalId, setProfessionalId] = useState("");
  const [period, setPeriod] = useState(DEFAULT_TELEMETRY_PERIOD);
  const { data, loading, isRefreshing, refresh } = useTelemetryRefusals(professionalId, period);
  const { items, source } = data;

  const columns: DenseColumn<TelemetryRefusalView>[] = [
    { key: "professional", header: "Profissional", sortable: true, sortValue: (item) => item.professionalLabel, render: (item) => <strong>{item.professionalLabel}</strong> },
    { key: "when", header: "Quando", tabular: true, sortable: true, sortValue: (item) => item.when, render: (item) => item.when },
    { key: "reason", header: "Motivo", sortable: true, sortValue: (item) => item.reason ?? "", render: (item) => (item.reason ? <Badge tone="warning">{item.reason}</Badge> : "—") },
    { key: "workOrder", header: "Ordem de Serviço", align: "right", sortable: true, sortValue: (item) => item.workOrderRef ?? "", render: (item) => (item.workOrderRef ? <Chip tone="info">{item.workOrderRef}</Chip> : "—") },
  ];

  const denseFilter = useCallback((rows: readonly TelemetryRefusalView[], base: { search: string }) => {
    const search = base.search.trim().toLowerCase();
    if (!search) return [...rows];
    return rows.filter(
      (item) =>
        item.professionalLabel.toLowerCase().includes(search) ||
        (item.reason ?? "").toLowerCase().includes(search) ||
        (item.workOrderRef ?? "").toLowerCase().includes(search),
    );
  }, []);

  const dense = useDenseList<TelemetryRefusalView>({ items, columns, filter: denseFilter, defaultSort: { key: "when", dir: "desc" } });

  if (source === "forbidden") {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Controle · Telemetria</span>
          <h1>Recusas</h1>
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
          <h1>Recusas</h1>
          <p>Serviços recusados em campo por profissional, com o motivo informado e a ordem de serviço relacionada.</p>
        </div>
        <div className="work-orders-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!canExport}
            title={canExport ? "Exportar as recusas carregadas" : "Nenhuma recusa carregada para exportar."}
            onClick={() => exportRefusalsCsv(items)}
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
          O intervalo selecionado é maior do que o permitido para esta consulta. Reduza o período de De/Até e tente novamente.
        </Alert>
      ) : null}

      {source === "fallback" ? (
        <Alert title="Não foi possível carregar as recusas" tone="warning">
          Houve uma falha ao buscar as recusas. A tela volta a tentar automaticamente em alguns instantes — nenhum dado é exibido enquanto isso.
        </Alert>
      ) : null}

      {source === "needs_professional" ? (
        <Card title="Recusas de serviço">
          <EmptyState title="Selecione um profissional" detail="Escolha um profissional no filtro acima para consultar as recusas do período." />
        </Card>
      ) : (
        <Card
          title="Recusas de serviço"
          action={
            <span style={countStyle}>
              {dense.total} recusa(s){isRefreshing ? " · atualizando…" : ""}
            </span>
          }
        >
          {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

          {!loading && source !== "fallback" && source !== "invalid_window" && dense.total === 0 ? (
            <EmptyState
              title="Sem recusas no período"
              detail={
                dense.hasActiveFilters
                  ? "Ajuste a busca para encontrar recusas."
                  : "Este profissional não registrou recusas de serviço no período."
              }
            />
          ) : null}

          {dense.total > 0 ? (
            <>
              <DenseTable rows={dense.visibleItems} keyForRow={(item) => item.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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

export default RecusasPage;
