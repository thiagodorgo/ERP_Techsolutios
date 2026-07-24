import { Download, Filter, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";

import { Alert, Button, Card, EmptyState, ErrorState, Input, Skeleton } from "../../../components/ui";
import { downloadCsv } from "../../../lib/csv";
import { useAuditEvents } from "../useAuditEvents";
import type { AuditEventView } from "../audit-events.types";

// PR-SCALE-3 + Ω4C PR-11 — "Auditoria" da organização (Logs globais). Consome GET /api/v1/audit-events com
// filtros server-side (ação/ator/período) + paginação por janela crescente (D-Ω4C-AUD-FILTERS). D-007:
// NENHUMA linha fabricada — as linhas e o CSV vêm só da lista REAL carregada. §2.8: o view não carrega
// tenant_id/ip/token (o DTO já não traz). Estados §7 tratados explicitamente.

const SUBTITLE = "trilha de eventos e auditoria da organização";

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const filterFieldStyle: CSSProperties = { minWidth: 180 };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const tableWrapStyle: CSSProperties = { overflowX: "auto" };
const thStyle: CSSProperties = { textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".03em", padding: "8px 12px", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" };
const tdStyle: CSSProperties = { fontSize: 13, color: "#475569", padding: "11px 12px", borderBottom: "1px solid #F1F5F9" };
const monoStyle: CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#2563EB" };

// Exporta SOMENTE os eventos reais carregados (nunca dado fabricado). Delega ao util compartilhado
// (BOM UTF-8, `;`, `\r\n` — D-Ω4C-REM-CSV). §2.8: o CSV só carrega o que o view já expõe.
function exportAuditCsv(events: readonly AuditEventView[]): void {
  const header = ["Quando", "Ator", "Evento"];
  const rows = events.map((event) => [event.when, event.actor, event.action]);
  downloadCsv("auditoria.csv", header, rows);
}

export function AuditTenantPage() {
  const { data, loading, isRefreshing, refresh, filters, setFilter, clearFilters, loadMore, hasMore, hasActiveFilters } = useAuditEvents();
  const { events, forbidden, source } = data;

  // §7 — acesso não permitido: gate `audit.read` respondeu 403. Não é erro de sistema.
  if (forbidden) {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Controle · Usuários</span>
          <h1>Auditoria</h1>
        </header>
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar a trilha de auditoria desta organização. Fale com um administrador se precisar deste acesso."
        />
      </section>
    );
  }

  const canExport = events.length > 0;

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Controle · Usuários</span>
          <h1>Auditoria</h1>
          <p>{SUBTITLE}.</p>
        </div>
        <div className="work-orders-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!canExport}
            title={canExport ? "Exportar os eventos carregados" : "Nenhum evento carregado para exportar."}
            onClick={() => exportAuditCsv(events)}
          >
            <Download size={16} aria-hidden /> Exportar CSV
          </Button>
        </div>
      </header>

      <Card title="Filtros">
        <div style={filterRowStyle}>
          <div style={filterFieldStyle}>
            <Input
              label="Ação"
              placeholder="ex.: auth.login.success"
              value={filters.action}
              onChange={(event) => setFilter("action", event.target.value)}
              aria-label="Filtrar por ação"
            />
          </div>
          <div style={filterFieldStyle}>
            <Input
              label="Ator"
              placeholder="identificador do usuário"
              value={filters.actorId}
              onChange={(event) => setFilter("actorId", event.target.value)}
              aria-label="Filtrar por ator"
            />
          </div>
          <div style={{ minWidth: 150 }}>
            <Input label="De" type="date" value={filters.from} onChange={(event) => setFilter("from", event.target.value)} aria-label="Início do período" />
          </div>
          <div style={{ minWidth: 150 }}>
            <Input label="Até" type="date" value={filters.to} onChange={(event) => setFilter("to", event.target.value)} aria-label="Fim do período" />
          </div>
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <Filter size={14} aria-hidden /> Limpar filtros
            </Button>
          ) : null}
        </div>
      </Card>

      {source === "fallback" ? (
        <Alert title="Não foi possível carregar a auditoria" tone="warning">
          Houve uma falha ao buscar os eventos de auditoria. A tela volta a tentar automaticamente em alguns instantes — nenhum dado é exibido enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      ) : null}

      <Card
        title="Eventos"
        action={
          <span style={countStyle}>
            {events.length} evento(s){hasMore ? "+" : ""}{isRefreshing ? " · atualizando…" : ""}
          </span>
        }
      >
        {loading && events.length === 0 ? <Skeleton lines={6} /> : null}

        {!loading && source !== "fallback" && events.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "Nenhum evento para o filtro" : "Sem eventos de auditoria"}
            detail={
              hasActiveFilters
                ? "Nenhum evento de auditoria corresponde aos filtros. Ajuste a ação, o ator ou o período."
                : "Ainda não há registros de auditoria para esta organização. Assim que ações auditáveis acontecerem, elas aparecerão aqui."
            }
          />
        ) : null}

        {events.length > 0 ? (
          <div style={tableWrapStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Quando</th>
                  <th style={thStyle}>Ator</th>
                  <th style={thStyle}>Evento</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td style={{ ...tdStyle, ...monoStyle }}>{event.when}</td>
                    <td style={tdStyle}>{event.actor}</td>
                    <td style={tdStyle}>{event.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {hasMore ? (
          <div style={{ marginTop: "var(--space-12)", display: "flex", justifyContent: "center" }}>
            <Button type="button" variant="secondary" onClick={loadMore}>
              Carregar mais eventos
            </Button>
          </div>
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

export default AuditTenantPage;
