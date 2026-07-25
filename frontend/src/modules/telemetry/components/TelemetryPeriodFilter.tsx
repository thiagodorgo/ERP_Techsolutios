import { Input } from "../../../components/ui";
import { TELEMETRY_DEFAULT_WINDOW_HOURS } from "../telemetry.types";
import type { TelemetryPeriod } from "../telemetry.types";

// Ω4C PR-14 — filtro de período De/Até (reusa o par <Input type="date"> da Auditoria/PR-11). Sem seleção →
// últimas 24h (default do backend). Teto de 168h validado no backend → 422 window_too_large tratado honesto
// na tela. O filtro apenas coleta as datas; nunca trunca nem fabrica janela.

export const TELEMETRY_PERIOD_NOTE = `Sem período selecionado: últimas ${TELEMETRY_DEFAULT_WINDOW_HOURS} horas.`;

export function TelemetryPeriodFilter({ period, onChange }: { period: TelemetryPeriod; onChange: (period: TelemetryPeriod) => void }) {
  return (
    <>
      <div style={{ minWidth: 150 }}>
        <Input
          label="De"
          type="date"
          value={period.from}
          onChange={(event) => onChange({ ...period, from: event.target.value })}
          aria-label="Início do período"
        />
      </div>
      <div style={{ minWidth: 150 }}>
        <Input
          label="Até"
          type="date"
          value={period.to}
          onChange={(event) => onChange({ ...period, to: event.target.value })}
          aria-label="Fim do período"
        />
      </div>
    </>
  );
}

export default TelemetryPeriodFilter;
