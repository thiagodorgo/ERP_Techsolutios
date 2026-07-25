import { Download, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useState } from "react";

import type { DenseColumn } from "../../../components/dense-list";
import { DenseListPagination, DenseTable, useDenseList } from "../../../components/dense-list";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { downloadCsv } from "../../../lib/csv";
import { ProfessionalPicker } from "../components/ProfessionalPicker";
import { TELEMETRY_PERIOD_NOTE, TelemetryPeriodFilter } from "../components/TelemetryPeriodFilter";
import { getAccessTone } from "../telemetry.adapter";
import { DEFAULT_TELEMETRY_PERIOD } from "../telemetry.types";
import type { TelemetryAccessView } from "../telemetry.types";
import { useTelemetryAccess } from "../useTelemetryAccess";

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const fieldStyle: CSSProperties = { minWidth: 220 };
const noteStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: "var(--space-6)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

// Exporta SÓ os acessos reais carregados (D-007). §2.8: só profissional/evento/quando — nunca IP/coordenada.
function exportAccessCsv(rows: readonly TelemetryAccessView[]): void {
  const header = ["Profissional", "Evento", "Quando"];
  const body = rows.map((row) => [row.professionalLabel, row.event, row.when]);
  downloadCsv("acessos-app.csv", header, body);
}

// Ω4C PR-14 — Acessos (Telemetria): conectou/desconectou do APP de campo por profissional/dispositivo.
// DISTINTO de Controle·Usuários·Acessos (login web, PR-11) — breadcrumb "Controle · Telemetria" desambigua.
export function AcessosTelemetriaPage() {
  const [professionalId, setProfessionalId] = useState("");
  const [period, setPeriod] = useState(DEFAULT_TELEMETRY_PERIOD);
  const { data, loading, isRefreshing, refresh } = useTelemetryAccess(professionalId, period);
  const { items, source } = data;

  const columns: DenseColumn<TelemetryAccessView>[] = [
    { key: "professional", header: "Profissional", sortable: true, sortValue: (item) => item.professionalLabel, render: (item) => <strong>{item.professionalLabel}</strong> },
    {
      key: "event",
      header: "Evento",
      sortable: true,
      sortValue: (item) => item.event,
      render: (item) => <Badge tone={getAccessTone(item.event)}>{item.event === "conectou" ? "Conectou" : "Desconectou"}</Badge>,
    },
    { key: "when", header: "Quando", align: "right", tabular: true, sortable: true, sortValue: (item) => item.when, render: (item) => item.when },
  ];

  const denseFilter = useCallback((rows: readonly TelemetryAccessView[], base: { search: string }) => {
    const search = base.search.trim().toLowerCase();
    if (!search) return [...rows];
    return rows.filter((item) => item.professionalLabel.toLowerCase().includes(search));
  }, []);

  const dense = useDenseList<TelemetryAccessView>({ items, columns, filter: denseFilter, defaultSort: { key: "when", dir: "desc" } });

  if (source === "forbidden") {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Controle · Telemetria</span>
          <h1>Acessos</h1>
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
          <h1>Acessos</h1>
          <p>Entradas e saídas do aplicativo de campo por profissional, com o horário de cada conexão.</p>
        </div>
        <div className="work-orders-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!canExport}
            title={canExport ? "Exportar os acessos carregados" : "Nenhum acesso carregado para exportar."}
            onClick={() => exportAccessCsv(items)}
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
        <Alert title="Não foi possível carregar os acessos" tone="warning">
          Houve uma falha ao buscar os acessos do aplicativo. A tela volta a tentar automaticamente em alguns instantes — nenhum dado é exibido enquanto isso.
        </Alert>
      ) : null}

      {source === "needs_professional" ? (
        <Card title="Acessos do aplicativo">
          <EmptyState title="Selecione um profissional" detail="Escolha um profissional no filtro acima para consultar os acessos do período." />
        </Card>
      ) : (
        <Card
          title="Acessos do aplicativo"
          action={
            <span style={countStyle}>
              {dense.total} evento(s){isRefreshing ? " · atualizando…" : ""}
            </span>
          }
        >
          {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

          {!loading && source !== "fallback" && source !== "invalid_window" && dense.total === 0 ? (
            <EmptyState
              title="Sem acessos no período"
              detail={
                dense.hasActiveFilters
                  ? "Ajuste a busca para encontrar acessos."
                  : "Não há registros de entrada ou saída do aplicativo para este profissional no período."
              }
            />
          ) : null}

          {dense.total > 0 ? (
            <>
              <DenseTable rows={dense.visibleItems} keyForRow={(item) => `${item.when}·${item.event}·${item.professionalLabel}`} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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

export default AcessosTelemetriaPage;
