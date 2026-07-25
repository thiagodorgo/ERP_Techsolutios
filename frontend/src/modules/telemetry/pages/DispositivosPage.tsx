import { Download, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useState } from "react";

import type { DenseColumn } from "../../../components/dense-list";
import { DenseListPagination, DenseTable, useDenseList } from "../../../components/dense-list";
import { Alert, Button, Card, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { downloadCsv } from "../../../lib/csv";
import { TELEMETRY_PERIOD_NOTE, TelemetryPeriodFilter } from "../components/TelemetryPeriodFilter";
import { formatLastSeen } from "../telemetry.adapter";
import { DEFAULT_TELEMETRY_PERIOD } from "../telemetry.types";
import type { TelemetryDeviceView } from "../telemetry.types";
import { useTelemetryDevices } from "../useTelemetryDevices";

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const noteStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: "var(--space-6)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

// Exporta SÓ os dispositivos reais carregados (D-007). §2.8: rótulo grosseiro — nunca sdk_int cru/IP/coordenada.
function exportDevicesCsv(rows: readonly TelemetryDeviceView[]): void {
  const header = ["Profissional", "Dispositivo", "Versão do app", "Último acesso"];
  const body = rows.map((row) => [row.professionalLabel, row.deviceLabel, row.appVersion ?? "—", formatLastSeen(row.lastSeenAt)]);
  downloadCsv("dispositivos.csv", header, body);
}

// Ω4C PR-14 — Dispositivos (Telemetria): aparelho por profissional (rótulo GROSSEIRO, anti-fingerprint) +
// versão do app + último acesso. SEM seletor de profissional (lista do tenant inteiro). §2.8: nunca sdk_int
// cru/IP — o DTO já não os traz.
export function DispositivosPage() {
  const [period, setPeriod] = useState(DEFAULT_TELEMETRY_PERIOD);
  const { data, loading, isRefreshing, refresh } = useTelemetryDevices(period);
  const { items, source } = data;

  const columns: DenseColumn<TelemetryDeviceView>[] = [
    { key: "professional", header: "Profissional", sortable: true, sortValue: (item) => item.professionalLabel, render: (item) => <strong>{item.professionalLabel}</strong> },
    { key: "device", header: "Dispositivo", sortable: true, sortValue: (item) => item.deviceLabel, render: (item) => item.deviceLabel },
    { key: "appVersion", header: "Versão do app", sortable: true, sortValue: (item) => item.appVersion ?? "", render: (item) => item.appVersion ?? "—" },
    { key: "lastSeen", header: "Último acesso", align: "right", tabular: true, sortable: true, sortValue: (item) => item.lastSeenAt, render: (item) => formatLastSeen(item.lastSeenAt) },
  ];

  const denseFilter = useCallback((rows: readonly TelemetryDeviceView[], base: { search: string }) => {
    const search = base.search.trim().toLowerCase();
    if (!search) return [...rows];
    return rows.filter((item) => item.professionalLabel.toLowerCase().includes(search) || item.deviceLabel.toLowerCase().includes(search));
  }, []);

  const dense = useDenseList<TelemetryDeviceView>({ items, columns, filter: denseFilter, defaultSort: { key: "lastSeen", dir: "desc" } });

  if (source === "forbidden") {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Controle · Telemetria</span>
          <h1>Dispositivos</h1>
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
          <h1>Dispositivos</h1>
          <p>Aparelhos usados pelos profissionais no aplicativo de campo, com a versão do app e o último acesso.</p>
        </div>
        <div className="work-orders-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!canExport}
            title={canExport ? "Exportar os dispositivos carregados" : "Nenhum dispositivo carregado para exportar."}
            onClick={() => exportDevicesCsv(items)}
          >
            <Download size={16} aria-hidden /> Exportar CSV
          </Button>
        </div>
      </header>

      <Card title="Filtros">
        <div style={filterRowStyle}>
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
        <Alert title="Não foi possível carregar os dispositivos" tone="warning">
          Houve uma falha ao buscar os dispositivos. A tela volta a tentar automaticamente em alguns instantes — nenhum dado é exibido enquanto isso.
        </Alert>
      ) : null}

      <Card
        title="Dispositivos"
        action={
          <span style={countStyle}>
            {dense.total} dispositivo(s){isRefreshing ? " · atualizando…" : ""}
          </span>
        }
      >
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && source !== "fallback" && source !== "invalid_window" && dense.total === 0 ? (
          <EmptyState
            title="Sem dispositivos no período"
            detail={
              dense.hasActiveFilters
                ? "Ajuste a busca para encontrar dispositivos."
                : "Nenhum profissional acessou o aplicativo de campo no período."
            }
          />
        ) : null}

        {dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(item) => `${item.professionalLabel}·${item.deviceLabel}`} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
    </section>
  );
}

export default DispositivosPage;
