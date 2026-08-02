import type { CSSProperties } from "react";

import { Card } from "../../../../components/ui";
import type { ChargeStatementView } from "../../charges/charges.types";
import { GuiaDebitos } from "../../charges/components/GuiaDebitos";
import { formatDateTime, getVehicleLabel } from "../processes.adapter";
import type { ChecklistRunSummaryItem, CustodyEventItem, CustodyHistoryItem, InspectionView, ProcessDetail, VerifyResult } from "../processes.types";
import { ChecklistRunsPanel } from "./ChecklistRunsPanel";
import { CustodyHistoryPanel } from "./CustodyHistoryPanel";
import { InspectionSection } from "./InspectionSection";
import { IntegritySeal } from "./IntegritySeal";
import { ProcessIdentityCard } from "./ProcessIdentityCard";
import { ProcessStatusChip } from "./ProcessStatusChip";
import { ProcessTimeline } from "./ProcessTimeline";

// Ω-VID PR-10 — documento de IMPRESSÃO/SALVAMENTO do dossiê. O dono pediu "salvar e imprimir" (e-mail/WhatsApp
// FORA de escopo). window.print() cobre os dois (o diálogo do navegador oferece "Salvar como PDF"). Diferente do
// modal (que mostra UMA aba por vez), este documento EMPILHA todas as seções READ-ONLY num único fluxo imprimível —
// o dossiê completo do veículo. Sem ações (sem "Lançar encargo"/transições/liberação): é um documento, não a tela de
// operação. Componente PURO (SSR-testável); a casca (VehicleDossieModal) o renderiza num portal escondido em tela e
// revelado só no `@media print`.
const titleRow: CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 };
const h1: CSSProperties = { fontSize: 20, fontWeight: 800, color: "#0F172A", margin: 0 };
const metaLine: CSSProperties = { fontSize: 12, color: "#475569", margin: "2px 0" };
const stack: CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };

export type DossiePrintDocumentProps = {
  readonly process: ProcessDetail;
  // Ω-VID PR-10 (junta) — carimbo de EMISSÃO (o documento é temporal: status e diárias mudam) + organização emissora
  // (white-label, §allowlist: rótulo `tenantName`, nunca tenant_id). Passados pela casca (issuedAt = hora do print).
  readonly issuedAt: string;
  readonly orgName: string | null;
  readonly yardName: string | null;
  readonly currentSpot: { readonly code: string } | null;
  readonly inspection: InspectionView;
  readonly verify: VerifyResult | null;
  readonly events: readonly CustodyEventItem[];
  readonly statement: ChargeStatementView | null;
  readonly canReadChecklist: boolean;
  readonly checklistRuns: readonly ChecklistRunSummaryItem[];
  readonly historyItems: readonly CustodyHistoryItem[];
};

const noop = () => {};

export function DossiePrintDocument({
  process,
  issuedAt,
  orgName,
  yardName,
  currentSpot,
  inspection,
  verify,
  events,
  statement,
  canReadChecklist,
  checklistRuns,
  historyItems,
}: DossiePrintDocumentProps) {
  return (
    <article className="dossie-print__doc">
      <header className="dossie-print__head">
        {orgName ? <p style={{ ...metaLine, fontWeight: 700, color: "#0F172A" }}>{orgName}</p> : null}
        <div style={titleRow}>
          <h1 style={h1}>{`Dossiê do veículo · ${getVehicleLabel(process)}`}</h1>
          <ProcessStatusChip status={process.status} label={process.statusLabel} />
        </div>
        <p style={metaLine}>
          Autoridade solicitante: {process.originAuthority || "—"}
          {process.legalBasis ? ` · ${process.legalBasis}` : ""}
        </p>
        <p style={metaLine}>
          Local de guarda: {yardName ?? "—"}
          {currentSpot ? ` · Vaga ${currentSpot.code}` : ""}
        </p>
        <p style={metaLine}>{`Emitido em ${formatDateTime(issuedAt)} · documento de acompanhamento (não substitui os comprovantes de liberação/leilão).`}</p>
      </header>

      <div style={stack}>
        <ProcessIdentityCard process={process} yardName={yardName} currentSpot={currentSpot} />

        <Card title="Vistoria de recepção">
          <InspectionSection view={inspection} />
        </Card>

        <Card title="Integridade do registro">
          <IntegritySeal verify={verify} loading={false} />
        </Card>

        <Card title="Linha do tempo da custódia">
          <ProcessTimeline events={events} />
        </Card>

        {canReadChecklist ? (
          <ChecklistRunsPanel runs={checklistRuns} loading={false} error={null} denied={false} onRetry={noop} />
        ) : null}

        <CustodyHistoryPanel items={historyItems} loading={false} error={null} onRetry={noop} />

        {/* Guia de débitos como DOCUMENTO (sem a ação de lançar encargo). */}
        <GuiaDebitos statement={statement} loading={false} error={null} denied={false} canCreate={false} onRetry={noop} onLaunch={noop} />
      </div>
    </article>
  );
}

export default DossiePrintDocument;
