import { MapPin } from "lucide-react";
import type { CSSProperties } from "react";

import { Card } from "../../../../components/ui";
import { formatDateTime } from "../processes.adapter";
import type { ProcessDetail } from "../processes.types";

// Ω-VID PR-07 — Identificação/origem + Local de guarda extraídos da ProcessoDossiePage para reuso na aba "Visão
// Geral" do VehicleDossieModal (mesmo conteúdo, sem duplicar). §allowlist: currentProcessId/tenant_id NUNCA
// renderizados; só placa/marca/modelo/cor/ano/chassi/RENAVAM, órgão/agente, nº do procedimento e datas.
const infoGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 };
const labelStyle: CSSProperties = { fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" };
const valueStyle: CSSProperties = { fontSize: 14, color: "#0F172A" };
const spotRow: CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };

export function ProcessIdentityCard({
  process,
  yardName,
  currentSpot,
}: {
  readonly process: ProcessDetail;
  readonly yardName: string | null;
  readonly currentSpot: { readonly code: string } | null;
}) {
  return (
    <>
      <Card title="Identificação e origem">
        <div style={infoGrid}>
          <Info label="Placa" value={process.vehiclePlate ?? (process.vehicleUnidentified ? "Não identificado" : "—")} />
          <Info label="Marca / Modelo" value={[process.vehicleBrand, process.vehicleModel].filter(Boolean).join(" ") || "—"} />
          <Info label="Cor" value={process.vehicleColor ?? "—"} />
          <Info label="Ano" value={process.vehicleYear != null ? String(process.vehicleYear) : "—"} />
          <Info label="Chassi" value={process.vehicleChassis ?? "—"} />
          <Info label="RENAVAM" value={process.vehicleRenavam ?? "—"} />
          <Info label="Órgão / agente" value={process.originAgentName ?? "—"} />
          <Info label="Nº do procedimento" value={process.authorityCaseNumber ?? "—"} />
          <Info label="Nº do auto/BO" value={process.incidentReportNumber ?? "—"} />
          <Info label="Entrada no pátio" value={formatDateTime(process.enteredAt)} />
          {process.frozenAt ? <Info label="Congelamento" value={formatDateTime(process.frozenAt)} /> : null}
          {process.vehicleUnidentified && process.unidentifiedReason ? <Info label="Justificativa (não identificado)" value={process.unidentifiedReason} /> : null}
        </div>
      </Card>

      <Card title="Local de guarda">
        <div style={spotRow}>
          <MapPin size={16} aria-hidden color="#2563EB" />
          <span style={valueStyle}>
            {yardName ? yardName : process.yardId ? "Pátio" : "Ainda sem pátio definido"}
            {currentSpot ? ` · Vaga ${currentSpot.code}` : process.yardId ? " · Sem vaga alocada" : ""}
          </span>
        </div>
      </Card>
    </>
  );
}

function Info({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

export default ProcessIdentityCard;
