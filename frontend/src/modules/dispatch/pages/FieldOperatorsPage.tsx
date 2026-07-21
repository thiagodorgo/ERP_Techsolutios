import type { CSSProperties } from "react";

import { CH, TablePage, type TableCell, type TableKpi, type TableRow } from "../../../components/TablePage";
import { Alert, EmptyState, Skeleton } from "../../../components/ui";
import { summarizeFieldOperatorStatuses } from "../field-operators.adapter";
import { useFieldOperators } from "../useFieldOperators";
import type { FieldOperatorRow, FieldOperatorStatusTone } from "../field-operators.types";

// PR-SCALE-4 — "Operadores de Campo" (sc fieldOperators). Consome useFieldOperators, que REUSA a camada
// de dados do Mapa (getLatestFieldLocations). D-007: NENHUM operador/número fabricado — KPIs e linhas
// vêm só da lista REAL; sem operador → estado honesto. LGPD §12: a tela NUNCA renderiza/exporta
// latitude/longitude — só nome, equipe, OS, frescor ("há X min") e status. Estados §7 tratados ANTES do
// TablePage (loading/fallback/vazio); o TablePage entra só quando há dado real.

const SUBTITLE = "disponibilidade, atendimento e última atualização de posição da equipe de campo";

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

// Chip de status → paleta do TablePage (mesma semântica de cor do Mapa via getFieldLocationStatusTone).
const TONE_TO_CHIP: Record<FieldOperatorStatusTone, { bg: string; color: string }> = {
  success: CH.ok,
  info: CH.info,
  warning: CH.warn,
  danger: CH.err,
  pending: CH.purple,
  default: CH.gray,
};

// Cabeçalho comum aos estados honestos (o TablePage traz o seu próprio). Botão "Exportar CSV"
// desabilitado enquanto não há operador real carregado — nunca exporta dado fabricado (D-007).
// NÃO há botão "Convidar operador": não existe endpoint real de convite (só após a ativação cloud),
// então a tela não finge uma ação que não funciona.
function FieldOperatorsHeader({ exportDisabledReason }: { exportDisabledReason: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Operadores de Campo</div>
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

// KPIs HONESTOS: contagem por categoria REAL do enum FieldLocationStatus (available / on_route+on_site+
// in_service / paused / offline+blocked+unknown). Sem categoria inventada (D-007).
function honestKpis(operators: readonly FieldOperatorRow[]): TableKpi[] {
  const summary = summarizeFieldOperatorStatuses(operators);
  return [
    { label: "Disponíveis", value: String(summary.available), color: "#059669" },
    { label: "Em atendimento", value: String(summary.engaged), color: "#2563EB" },
    { label: "Em pausa", value: String(summary.paused), color: "#D97706" },
    { label: "Fora de operação", value: String(summary.offDuty), color: "#94A3B8" },
  ];
}

function operatorToRow(operator: FieldOperatorRow): TableRow {
  const chip = TONE_TO_CHIP[operator.statusTone];
  // OS atual: código humano em destaque quando há atendimento; "—" neutro quando não há.
  const osCell: TableCell =
    operator.currentOs === "—"
      ? { kind: "text", text: "—", flex: 1.2 }
      : { kind: "mono", text: operator.currentOs, flex: 1.2 };

  return {
    cells: [
      { kind: "strong", text: operator.name, flex: 2 },
      { kind: "text", text: operator.team, flex: 1.4 },
      osCell,
      { kind: "text", text: operator.lastSeen, flex: 1.4 },
      { kind: "chip", text: operator.statusLabel, bg: chip.bg, color: chip.color, flex: 1.1 },
    ],
  };
}

function csvCell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Exporta SOMENTE os operadores reais carregados (nunca dado fabricado). LGPD §12: o CSV NÃO tem coluna
// de coordenada — só nome, equipe, OS atual, frescor e status. §2.8: sem tenant_id/token.
function exportFieldOperatorsCsv(operators: readonly FieldOperatorRow[]): void {
  const header = ["Operador", "Equipe", "OS atual", "Última posição", "Status"];
  const lines = [header, ...operators.map((operator) => [operator.name, operator.team, operator.currentOs, operator.lastSeen, operator.statusLabel])];
  const csv = lines.map((cells) => cells.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "operadores-de-campo.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function FieldOperatorsPage() {
  const { data, loading } = useFieldOperators();
  const { operators, source, fallbackReason } = data;

  // §7 — carregando: skeleton (sem inventar linha enquanto a resposta não chega).
  if (loading) {
    return (
      <div style={{ color: "#0F172A" }}>
        <FieldOperatorsHeader exportDisabledReason="Carregando operadores de campo…" />
        <div style={{ ...card, padding: 20 }}>
          <Skeleton lines={6} />
        </div>
      </div>
    );
  }

  // §7 — falha de carregamento (rede/API): aviso honesto, sem dado fabricado. O auto-refresh tenta de novo.
  if (source === "fallback") {
    return (
      <div style={{ color: "#0F172A" }}>
        <FieldOperatorsHeader exportDisabledReason="Nenhum operador carregado para exportar." />
        <Alert title="Não foi possível carregar os operadores de campo" tone="warning">
          {fallbackReason ?? "Houve uma falha ao consultar a localização da equipe de campo."} A tela volta a tentar automaticamente em alguns instantes — nenhum operador é exibido enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      </div>
    );
  }

  // §7 — vazio: sem operadores em campo (inclui o modo demonstração/mock, que não tem posição real).
  if (operators.length === 0) {
    return (
      <div style={{ color: "#0F172A" }}>
        <FieldOperatorsHeader exportDisabledReason="Nenhum operador carregado para exportar." />
        <div style={{ ...card, padding: 8 }}>
          <EmptyState
            title="Sem operadores em campo"
            detail="Ainda não há operadores com posição registrada nesta organização. Assim que a equipe de campo enviar localização, os operadores aparecerão aqui."
          />
        </div>
      </div>
    );
  }

  // Populado: dado REAL → TablePage. KPIs e linhas computados da lista carregada (nada fabricado).
  return (
    <TablePage
      title="Operadores de Campo"
      subtitle={SUBTITLE}
      actionLabel="Exportar CSV"
      onAction={() => exportFieldOperatorsCsv(operators)}
      searchPlaceholder="Buscar operador…"
      kpis={honestKpis(operators)}
      columns={[
        { label: "OPERADOR", flex: 2 },
        { label: "EQUIPE", flex: 1.4 },
        { label: "OS ATUAL", flex: 1.2 },
        { label: "ÚLTIMA POSIÇÃO", flex: 1.4 },
        { label: "STATUS", flex: 1.1 },
      ]}
      rows={operators.map(operatorToRow)}
    />
  );
}

export default FieldOperatorsPage;
