import { Printer, X } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "../../../../components/ui";
import { formatDateTime as formatProcessDateTime, getVehicleLabel } from "../../processes/processes.adapter";
import type { ProcessDetail } from "../../processes/processes.types";
import { formatMoney } from "../settlement.adapter";
import type { CertameResult, SettlementAllocationDto, SettlementDto } from "../settlement.types";
import { CascataTable } from "./CascataTable";

// Comprovante de LIQUIDAÇÃO do leilão (art. 328 §6º) — impressão CLIENT-SIDE (window.print, SEM PSP). Reúne
// identificação + resultado do certame + a cascata (via <CascataTable>) + o saldo ao proprietário. §2.8: winnerRef
// já vem MASCARADO do backend (renderiza a máscara, jamais PII); nenhum tenant_id/UUID de ator. White-label:
// "liquidação / arremate / cascata / saldo ao proprietário / Funset", NUNCA "polícia". O container tem escopo de
// impressão (@media print oculta o chrome do app; só o comprovante é impresso).
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflow: "auto", zIndex: 60 };
const sheet: CSSProperties = { background: "#FFFFFF", borderRadius: 12, width: "min(760px, 100%)", boxShadow: "0 20px 45px rgba(15,23,42,.25)" };
const header: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0" };
const body: CSSProperties = { padding: "20px 24px" };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 12 };
const label: CSSProperties = { fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" };
const value: CSSProperties = { fontSize: 14, color: "#0F172A" };
const sectionTitle: CSSProperties = { fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: ".03em", margin: "20px 0 4px" };

const PRINT_STYLE = `@media print {
  body * { visibility: hidden !important; }
  .comprovante-leilao-print, .comprovante-leilao-print * { visibility: visible !important; }
  .comprovante-leilao-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; }
  .comprovante-leilao-noprint { display: none !important; }
}`;

function saldoDesfecho(settlement: SettlementDto): string {
  if (settlement.status === "BALANCE_CLAIMED") return `Saldo retirado pelo proprietário em ${formatProcessDateTime(settlement.claimedAt)}`;
  if (settlement.status === "BALANCE_REVERTED_FUNSET") return `Saldo revertido ao Funset em ${formatProcessDateTime(settlement.revertedAt)}`;
  return `Reclamável até ${formatProcessDateTime(settlement.ownerClaimExpiresAt)}`;
}

export function ComprovanteLeilao({
  process,
  settlement,
  allocations,
  certame,
  onClose,
}: {
  readonly process: ProcessDetail;
  readonly settlement: SettlementDto;
  readonly allocations: readonly SettlementAllocationDto[];
  readonly certame?: CertameResult | null;
  readonly onClose: () => void;
}) {
  const currency = settlement.currency || "BRL";

  return (
    <div style={overlay} role="presentation">
      <style>{PRINT_STYLE}</style>
      <section className="comprovante-leilao-print" style={sheet} role="dialog" aria-modal="true" aria-label="Comprovante de liquidação do leilão">
        <header style={header}>
          <div>
            <strong style={{ fontSize: 16, color: "#0F172A" }}>Comprovante de liquidação do leilão</strong>
            <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>{settlement.statusLabel} · cascata §6º</p>
          </div>
          <div className="comprovante-leilao-noprint" style={{ display: "flex", gap: 8 }}>
            <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} aria-label="Imprimir ou salvar em PDF">
              <Printer size={14} aria-hidden /> Imprimir / Salvar PDF
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
            <Field label="Entrada no pátio" text={formatProcessDateTime(process.enteredAt)} />
            <Field label="Rodada da venda" text={settlement.soldRound != null ? `${settlement.soldRound}ª` : "—"} />
          </div>

          <p style={sectionTitle}>Resultado do certame</p>
          <div style={grid}>
            <Field label="Valor arrematado" text={formatMoney(settlement.hammerAmount, currency)} />
            {/* §2.8 — arrematante já vem mascarado do backend (nunca PII crua). */}
            <Field label="Arrematante" text={certame?.winnerRef ?? "—"} />
            <Field label="Nota do leilão (art. 34)" text={certame?.saleNoteReference ?? "—"} />
          </div>

          <p style={sectionTitle}>Distribuição em cascata (§6º)</p>
          <CascataTable settlement={settlement} allocations={allocations} />

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Saldo ao proprietário</span>
              <span style={{ fontSize: 12, color: "#64748B" }}>{saldoDesfecho(settlement)}</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{formatMoney(settlement.ownerBalanceAmount, currency)}</span>
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

export default ComprovanteLeilao;
