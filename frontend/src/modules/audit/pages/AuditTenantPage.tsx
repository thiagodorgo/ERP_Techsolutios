import type { CSSProperties } from "react";

import { TablePage, type TableKpi, type TableRow } from "../../../components/TablePage";
import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { downloadCsv } from "../../../lib/csv";
import { useAuditEvents } from "../useAuditEvents";
import type { AuditEventView } from "../audit-events.types";

// PR-SCALE-3 — "Auditoria" da organização (sc auditTenant). Consome GET /api/v1/audit-events via
// useAuditEvents. D-007: NENHUM número/linha fabricado — os KPIs e as linhas são computados só da lista
// REAL carregada; sem eventos → estado honesto. §2.8: o view não carrega tenant_id. Estados §7 tratados
// ANTES do TablePage (loading/acesso-negado/fallback/vazio); o TablePage entra só quando há dado real.

const SUBTITLE = "trilha de eventos e auditoria da organização";

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

// Cabeçalho comum aos estados honestos (o TablePage traz o seu próprio). Botão "Exportar CSV"
// desabilitado enquanto não há evento real carregado — nunca exporta dado fabricado (D-007).
function AuditHeader({ exportDisabledReason }: { exportDisabledReason: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Auditoria</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{SUBTITLE}</div>
      </div>
      <button
        type="button"
        disabled
        title={exportDisabledReason}
        style={{ padding: "9px 14px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#94A3B8", cursor: "not-allowed", fontFamily: "inherit" }}
      >
        Exportar CSV
      </button>
    </div>
  );
}

// Exporta SOMENTE os eventos reais carregados (nunca dado fabricado). Monta o CSV a partir da lista já em
// memória e delega ao util compartilhado (BOM UTF-8, `;`, `\r\n` — D-Ω4C-REM-CSV). Comportamento inalterado.
function exportAuditCsv(events: readonly AuditEventView[]): void {
  const header = ["Quando", "Ator", "Evento"];
  const rows = events.map((event) => [event.when, event.actor, event.action]);
  downloadCsv("auditoria.csv", header, rows);
}

// KPIs HONESTOS: derivados só da lista carregada. Sem categorias inventadas (não há campo de resultado/
// login/negado no AuditEvent) — apenas contagens verificáveis sobre os eventos reais.
function honestKpis(events: readonly AuditEventView[]): TableKpi[] {
  const actors = new Set(events.map((event) => event.actor));
  const actions = new Set(events.map((event) => event.action));
  return [
    { label: "Eventos carregados", value: String(events.length), color: "#2563EB" },
    { label: "Atores distintos", value: String(actors.size), color: "#059669" },
    { label: "Ações distintas", value: String(actions.size), color: "#7C3AED" },
    { label: "Evento mais recente", value: events[0]?.when ?? "—", color: "#334155" },
  ];
}

function eventToRow(event: AuditEventView): TableRow {
  return {
    cells: [
      { kind: "mono", text: event.when, flex: 1.2 },
      { kind: "text", text: event.actor, flex: 1.8 },
      { kind: "text", text: event.action, flex: 2.4 },
    ],
  };
}

export function AuditTenantPage() {
  const { data, loading } = useAuditEvents();
  const { events, forbidden, source } = data;

  // §7 — carregando: skeleton (sem inventar linha enquanto a resposta não chega).
  if (loading) {
    return (
      <div style={{ color: "#0F172A" }}>
        <AuditHeader exportDisabledReason="Carregando eventos de auditoria…" />
        <div style={{ ...card, padding: 20 }}>
          <Skeleton lines={6} />
        </div>
      </div>
    );
  }

  // §7 — acesso não permitido: gate `audit.read` respondeu 403. Não é erro de sistema.
  if (forbidden) {
    return (
      <div style={{ color: "#0F172A" }}>
        <AuditHeader exportDisabledReason="Sem permissão para a auditoria desta organização." />
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar a trilha de auditoria desta organização. Fale com um administrador se precisar deste acesso."
        />
      </div>
    );
  }

  // §7 — falha de carregamento (5xx/rede): aviso honesto, sem dado fabricado. O auto-refresh tenta de novo.
  if (source === "fallback") {
    return (
      <div style={{ color: "#0F172A" }}>
        <AuditHeader exportDisabledReason="Nenhum evento carregado para exportar." />
        <Alert title="Não foi possível carregar a auditoria" tone="warning">
          Houve uma falha ao buscar os eventos de auditoria. A tela volta a tentar automaticamente em alguns instantes — nenhum dado é exibido enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      </div>
    );
  }

  // §7 — vazio: sem eventos (inclui o modo demonstração/mock, que não tem auditoria real).
  if (events.length === 0) {
    return (
      <div style={{ color: "#0F172A" }}>
        <AuditHeader exportDisabledReason="Nenhum evento carregado para exportar." />
        <div style={{ ...card, padding: 8 }}>
          <EmptyState
            title="Sem eventos de auditoria"
            detail="Ainda não há registros de auditoria para esta organização. Assim que ações auditáveis acontecerem, elas aparecerão aqui."
          />
        </div>
      </div>
    );
  }

  // Populado: dado REAL → TablePage. KPIs e linhas computados da lista carregada (nada fabricado).
  return (
    <TablePage
      title="Auditoria"
      subtitle={SUBTITLE}
      actionLabel="Exportar CSV"
      onAction={() => exportAuditCsv(events)}
      searchPlaceholder="Buscar evento…"
      kpis={honestKpis(events)}
      columns={[
        { label: "QUANDO", flex: 1.2 },
        { label: "ATOR", flex: 1.8 },
        { label: "EVENTO", flex: 2.4 },
      ]}
      rows={events.map(eventToRow)}
    />
  );
}

export default AuditTenantPage;
