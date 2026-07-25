import { RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Card, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { ProfessionalPicker } from "../components/ProfessionalPicker";
import { TELEMETRY_PERIOD_NOTE, TelemetryPeriodFilter } from "../components/TelemetryPeriodFilter";
import { TrackMapCanvas } from "../components/TrackMapCanvas";
import { summarizeTrack } from "../map/trackGeometry";
import { DEFAULT_TELEMETRY_PERIOD } from "../telemetry.types";
import type { TelemetryPeriod, TelemetrySource } from "../telemetry.types";
import { useTelemetryTrack } from "../useTelemetryTrack";

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const fieldStyle: CSSProperties = { minWidth: 220 };
const noteStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: "var(--space-6)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const captionStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-10)", fontWeight: 600 };
const mapWrapStyle: CSSProperties = { position: "relative" };
const emptyOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#e2e8f0",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  background: "rgba(15, 23, 34, 0.55)",
  borderRadius: "var(--radius-md, 10px)",
  pointerEvents: "none",
};

// Texto honesto de mapa vazio (D-Ω4C-TELE-MAP-EMPTY): NÃO distingue "sem consentimento" de "sem movimento" —
// ambos caem aqui; nunca vaza status de consentimento; nunca desenha trajeto fabricado.
export const TRACK_EMPTY_MESSAGE = "Sem pontos de localização no período";

export type TrackDisplayKind =
  | "forbidden"
  | "needs_professional"
  | "invalid_window"
  | "fallback"
  | "loading"
  | "empty"
  | "track";

// Classificador PURO do estado §7 da tela — separa a decisão de render (testável sem WebGL). "empty" e "track"
// derivam do nº REAL de pontos: 0 → empty honesto; >0 → track. Nunca fabrica um "track" quando count===0.
export function classifyTrackDisplay(source: TelemetrySource, count: number, loading: boolean): TrackDisplayKind {
  if (source === "forbidden") return "forbidden";
  if (source === "needs_professional") return "needs_professional";
  if (source === "invalid_window") return "invalid_window";
  if (source === "fallback") return "fallback";
  if (loading && count === 0) return "loading";
  if (count === 0) return "empty";
  return "track";
}

function formatAccuracy(accuracyM: number | null): string {
  return accuracyM === null ? "—" : `${accuracyM} m`;
}

function describePeriod(period: TelemetryPeriod): string {
  const from = period.from.trim();
  const to = period.to.trim();
  if (from && to) return `${from} a ${to}`;
  if (from) return `desde ${from}`;
  if (to) return `até ${to}`;
  return "últimas 24 horas";
}

// Ω4C PR-15 (Junta de Mapas J-MAPAS-9) — Rastreamento: trajeto (polyline) dos pontos brutos de um profissional
// no período, consumindo GET /telemetry/track (ÚNICO endpoint com coordenada crua, gated telemetry:read +
// consent na origem). §2.8/LGPD: a coordenada crua É exibida (é o propósito) SÓ na polyline/markers do mapa;
// a caption e o resto da tela NUNCA carregam lat/lng; sem CSV de coordenada; sem cor por velocidade (diferida).
export function RastreamentoPage() {
  const [professionalId, setProfessionalId] = useState("");
  const [period, setPeriod] = useState(DEFAULT_TELEMETRY_PERIOD);
  const { data, loading, isRefreshing, refresh } = useTelemetryTrack(professionalId, period);
  const { items, source } = data;

  const summary = useMemo(() => summarizeTrack(items), [items]);
  const display = classifyTrackDisplay(source, summary.count, loading);

  if (display === "forbidden") {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Controle · Telemetria</span>
          <h1>Rastreamento</h1>
        </header>
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar o rastreamento desta organização. Fale com um administrador se precisar deste acesso."
        />
      </section>
    );
  }

  const showMap = display === "track" || display === "empty";

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Controle · Telemetria</span>
          <h1>Rastreamento</h1>
          <p>Trajeto percorrido por um profissional no período, traçado a partir das leituras de localização consentidas do app de campo.</p>
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

      {display === "invalid_window" ? (
        <Alert title="Período muito longo" tone="warning">
          O intervalo selecionado é maior do que o permitido para esta consulta. Reduza o período de De/Até e tente novamente — nenhum trajeto é exibido enquanto isso para não apresentar posição incompleta.
        </Alert>
      ) : null}

      {display === "fallback" ? (
        <Alert title="Não foi possível carregar o rastreamento" tone="warning">
          Houve uma falha ao buscar o trajeto. A tela volta a tentar automaticamente em alguns instantes — nenhuma posição é exibida enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      ) : null}

      {display === "needs_professional" ? (
        <Card title="Rastreamento">
          <EmptyState title="Selecione um profissional" detail="Escolha um profissional no filtro acima para consultar o trajeto do período." />
        </Card>
      ) : null}

      {display === "loading" ? (
        <Card title="Trajeto">
          <Skeleton lines={6} />
        </Card>
      ) : null}

      {showMap ? (
        <Card
          title="Trajeto"
          action={
            <span style={countStyle}>
              {summary.count} ponto(s){isRefreshing ? " · atualizando…" : ""}
            </span>
          }
        >
          {display === "track" ? (
            <p style={captionStyle}>
              {summary.count} ponto(s) · {describePeriod(period)} · precisão média {formatAccuracy(summary.averageAccuracyM)}
            </p>
          ) : null}
          <div style={mapWrapStyle}>
            <TrackMapCanvas points={items} />
            {display === "empty" ? (
              <div style={emptyOverlayStyle} role="status">
                {TRACK_EMPTY_MESSAGE}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {display === "fallback" ? (
        <div style={{ marginTop: "var(--space-10)" }}>
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export default RastreamentoPage;
