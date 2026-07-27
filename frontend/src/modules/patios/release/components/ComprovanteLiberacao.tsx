import { Printer, X } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "../../../../components/ui";
import { formatMoney } from "../../charges/charges.adapter";
import { formatDateTime, getVehicleLabel } from "../../processes/processes.adapter";
import type { ProcessDetail } from "../../processes/processes.types";
import type { ReleaseDto } from "../release.types";

// Comprovante de liberação (art. 24) — impressão CLIENT-SIDE (window.print, SEM PSP). §2.8: este é o ÚNICO lugar
// do console onde recipientDocument e authorityReference renderizam (comprovante autenticado) — JAMAIS em log/
// telemetria. White-label: "comprovante de liberação / autoridade solicitante / quem retira", NUNCA "polícia".
// O container tem escopo de impressão (@media print oculta o chrome do app; só o comprovante é impresso).
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflow: "auto", zIndex: 60 };
const sheet: CSSProperties = { background: "#FFFFFF", borderRadius: 12, width: "min(720px, 100%)", boxShadow: "0 20px 45px rgba(15,23,42,.25)" };
const header: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0" };
const body: CSSProperties = { padding: "20px 24px" };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 12 };
const label: CSSProperties = { fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" };
const value: CSSProperties = { fontSize: 14, color: "#0F172A" };

const PRINT_STYLE = `@media print {
  body * { visibility: hidden !important; }
  .comprovante-liberacao-print, .comprovante-liberacao-print * { visibility: visible !important; }
  .comprovante-liberacao-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; }
  .comprovante-liberacao-noprint { display: none !important; }
}`;

export function ComprovanteLiberacao({
  release,
  process,
  onClose,
}: {
  readonly release: ReleaseDto;
  readonly process: ProcessDetail;
  readonly onClose: () => void;
}) {
  const isForRepair = release.kind === "FOR_REPAIR";
  const saida = release.releasedAt ?? release.updatedAt;

  return (
    <div style={overlay} role="presentation">
      <style>{PRINT_STYLE}</style>
      <section className="comprovante-liberacao-print" style={sheet} role="dialog" aria-modal="true" aria-label="Comprovante de liberação">
        <header style={header}>
          <div>
            <strong style={{ fontSize: 16, color: "#0F172A" }}>Comprovante de liberação</strong>
            <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>{release.kindLabel} · art. 24</p>
          </div>
          <div className="comprovante-liberacao-noprint" style={{ display: "flex", gap: 8 }}>
            <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} aria-label="Imprimir comprovante">
              <Printer size={14} aria-hidden /> Imprimir
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar comprovante">
              <X size={14} aria-hidden />
            </Button>
          </div>
        </header>

        <div style={body}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={label}>Veículo</span>
            <span style={{ ...value, fontSize: 16, fontWeight: 700 }}>{getVehicleLabel(process)}</span>
          </div>

          <div style={grid}>
            <Field label="Marca / Modelo" text={[process.vehicleBrand, process.vehicleModel].filter(Boolean).join(" ") || "—"} />
            <Field label="Autoridade solicitante" text={process.originAuthority || "—"} />
            <Field label="Entrada no pátio" text={formatDateTime(process.enteredAt)} />
            <Field label={isForRepair ? "Saída para reparo" : "Restituição em"} text={formatDateTime(saida)} />
            {isForRepair && release.repairDeadline ? <Field label="Prazo de reparo" text={formatDateTime(release.repairDeadline)} /> : null}
            <Field label="Quem retira" text={release.recipientName ?? "—"} />
            {/* §2.8 — documento e referência do ato renderizam SÓ AQUI (comprovante autenticado). */}
            <Field label="Documento de quem retira" text={release.recipientDocument ?? "—"} />
            <Field label="Relação com o veículo" text={release.recipientRelationshipLabel ?? "—"} />
            <Field label="Referência do ato da autoridade" text={release.authorityReference ?? "—"} />
            <Field label="Autorizada em" text={formatDateTime(release.authorityApprovedAt)} />
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{isForRepair ? "Débitos" : "Total quitado"}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
              {release.settledTotal != null ? formatMoney(release.settledTotal, "BRL") : isForRepair ? "Em aberto (art. 271 §2º)" : "—"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label: fieldLabel, text }: { readonly label: string; readonly text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={label}>{fieldLabel}</span>
      <span style={value}>{text}</span>
    </div>
  );
}

export default ComprovanteLiberacao;
