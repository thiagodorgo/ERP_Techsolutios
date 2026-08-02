import { ArrowLeft, PackageOpen, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Alert, Button, Card, EmptyState, Skeleton } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { AuctionPanel } from "../../auction/components/AuctionPanel";
import { GuiaDebitos } from "../../charges/components/GuiaDebitos";
import { LancamentoChargeModal } from "../../charges/components/LancamentoChargeModal";
import { useStatement } from "../../charges/useStatement";
import { LiberacaoPanel } from "../../release/components/LiberacaoPanel";
import { LiquidacaoPanel } from "../../settlement/components/LiquidacaoPanel";
import { ChecklistRunsPanel } from "../components/ChecklistRunsPanel";
import { CustodyHistoryPanel } from "../components/CustodyHistoryPanel";
import { IntegritySeal } from "../components/IntegritySeal";
import { InspectionSection } from "../components/InspectionSection";
import { ProcessIdentityCard } from "../components/ProcessIdentityCard";
import { ProcessStatusChip } from "../components/ProcessStatusChip";
import { ProcessTimeline } from "../components/ProcessTimeline";
import { SpotPickerModal } from "../components/SpotPickerModal";
import { TransicaoFsmPanel } from "../components/TransicaoFsmPanel";
import { VacateSpotModal } from "../components/VacateSpotModal";
import { getVehicleLabel } from "../processes.adapter";
import { useCustodyHistory } from "../useCustodyHistory";
import { useProcessChecklistRuns } from "../useProcessChecklistRuns";
import { useProcessDossie } from "../useProcessDossie";

const backLinkStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, color: "#2563EB", fontSize: 13, fontWeight: 700, marginBottom: 14, textDecoration: "none" };

type MoveState = { readonly kind: "allocate" } | { readonly kind: "move"; readonly fromSpotId: string } | { readonly kind: "vacate"; readonly spotId: string; readonly spotCode: string } | null;

export function ProcessoDossiePage() {
  const { processId } = useParams<{ processId: string }>();
  const { can } = usePermissions();

  const canAllocate = can("impound:allocate");
  const canTransition = can("impound:transition");
  const canCreateCharge = can("charging:create");
  const canReadChecklist = can("checklist_runs:read");

  // Ω-VID PR-07 — mesma lógica de fetch agora no hook COMPARTILHADO useProcessDossie (reusado pelo VehicleDossieModal).
  // Comportamento da página inalterado (mesmas chamadas/ordem/auto-refresh); a página segue como deep-link/fallback.
  const { process, events, verify, inspection, yardName, currentSpot, loading, error, notFound, reload, context } = useProcessDossie(processId);

  const [moveState, setMoveState] = useState<MoveState>(null);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);

  // Guia de débitos (PR-08b) — hook próprio (auto-refresh; o motor de diárias acumula por job). D-007: mock → vazio.
  const {
    statement,
    loading: statementLoading,
    error: statementError,
    denied: statementDenied,
    reload: reloadStatement,
  } = useStatement(processId);

  // P-DOSSIE-PAGE-TABS — a página fallback passa a refletir as mesmas seções do modal (PR-08/09): Checklist do Guincho
  // (gate duplo impound:read + checklist_runs:read) e Histórico de Custódias. Reusa os MESMOS painéis puros e hooks.
  const {
    runs: checklistRuns,
    loading: checklistLoading,
    error: checklistError,
    denied: checklistDenied,
    reload: reloadChecklist,
  } = useProcessChecklistRuns(processId);
  const { items: historyItems, loading: historyLoading, error: historyError, reload: reloadHistory } = useCustodyHistory(processId);

  return (
    <section className="page-stack work-orders-page">
      <Link to="/patios/processos" style={backLinkStyle}>
        <ArrowLeft size={16} aria-hidden /> Voltar aos processos
      </Link>

      {loading && !process ? <Skeleton lines={8} /> : null}

      {error ? (
        <Alert title="Não foi possível carregar o dossiê" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void reload()}>
            Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {!loading && !error && notFound ? (
        <EmptyState title="Processo não encontrado" detail="O processo pode ter sido removido ou o endereço está incorreto. Volte à lista de processos." />
      ) : null}

      {process ? (
        <>
          <header className="page-heading page-heading--row">
            <div>
              <span>Pátios · Processos</span>
              <h1>
                {getVehicleLabel(process)} <ProcessStatusChip status={process.status} label={process.statusLabel} />
              </h1>
              <p>
                Autoridade solicitante: {process.originAuthority || "—"}
                {process.legalBasis ? ` · ${process.legalBasis}` : ""}
              </p>
            </div>
            <div className="work-orders-actions">
              {canAllocate ? (
                currentSpot ? (
                  <>
                    <Button type="button" variant="secondary" onClick={() => setMoveState({ kind: "move", fromSpotId: currentSpot.id })}>
                      <PackageOpen size={15} aria-hidden /> Mover vaga
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setMoveState({ kind: "vacate", spotId: currentSpot.id, spotCode: currentSpot.code })}>
                      Liberar vaga
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setMoveState({ kind: "allocate" })}>
                    <Plus size={15} aria-hidden /> Alocar vaga
                  </Button>
                )
              ) : null}
            </div>
          </header>

          <ProcessIdentityCard process={process} yardName={yardName} currentSpot={currentSpot} />

          <Card title="Integridade do registro">
            <IntegritySeal verify={verify} loading={loading} />
          </Card>

          <Card title="Linha do tempo da custódia">
            <ProcessTimeline events={events} />
          </Card>

          {/* P-DOSSIE-PAGE-TABS — Histórico de Custódias (PR-09): as passagens do mesmo veículo. impound:read. */}
          <CustodyHistoryPanel items={historyItems} loading={historyLoading} error={historyError} onRetry={() => void reloadHistory()} />

          <Card title="Vistoria de recepção">
            <InspectionSection view={inspection} />
          </Card>

          {/* P-DOSSIE-PAGE-TABS — Checklist do Guincho (PR-08): só para quem tem checklist_runs:read (gate duplo). */}
          {canReadChecklist ? (
            <ChecklistRunsPanel runs={checklistRuns} loading={checklistLoading} error={checklistError} denied={checklistDenied} onRetry={() => void reloadChecklist()} />
          ) : null}

          <TransicaoFsmPanel
            processId={process.id}
            status={process.status}
            inspectionComplete={inspection?.complete ?? false}
            canTransition={canTransition}
            context={context}
            onDone={() => {
              void reload();
              void reloadStatement();
            }}
          />

          <GuiaDebitos
            statement={statement}
            loading={statementLoading}
            error={statementError}
            denied={statementDenied}
            canCreate={canCreateCharge}
            onRetry={() => void reloadStatement()}
            onLaunch={() => setChargeModalOpen(true)}
          />

          {/* Ω5P PR-11 — Liberação I5 (aditivo/merge-safe: os painéis acima ficam intactos). O painel orquestra por
              process.status × liberação em curso e consome os módulos backend release/charging:settle. */}
          <LiberacaoPanel
            process={process}
            statement={statement}
            context={context}
            onDone={() => {
              void reload();
              void reloadStatement();
            }}
          />

          {/* Ω5P PR-15a — Leilão administrativo (aditivo/merge-safe: os painéis acima ficam intactos). O painel
              orquestra por process.status e consome o módulo backend auction (FSM de leilão, gate I8, sigilo art. 28).
              A liquidação em cascata (§6º) é a seção 15b, no <LiquidacaoPanel> logo abaixo. */}
          <AuctionPanel
            process={process}
            context={context}
            onDone={() => {
              void reload();
              void reloadStatement();
            }}
          />

          {/* Ω5P PR-15b — Liquidação em cascata §6º (aditivo/merge-safe: os painéis acima ficam intactos). O painel
              orquestra por process.status × existência de liquidação e consome o módulo backend auction.settlement
              (cascata I7 + ciclo do saldo §12). Silencioso fora de AUCTION_CLOSED sem liquidação. */}
          <LiquidacaoPanel
            process={process}
            context={context}
            onDone={() => {
              void reload();
              void reloadStatement();
            }}
          />
        </>
      ) : null}

      {chargeModalOpen && process ? (
        <LancamentoChargeModal
          processId={process.id}
          lines={statement?.lines ?? []}
          currency={statement?.currency ?? "BRL"}
          context={context}
          onClose={() => setChargeModalOpen(false)}
          onDone={() => {
            setChargeModalOpen(false);
            void reloadStatement();
          }}
        />
      ) : null}

      {moveState && process && moveState.kind !== "vacate" ? (
        <SpotPickerModal
          processId={process.id}
          mode={moveState.kind}
          fromSpotId={moveState.kind === "move" ? moveState.fromSpotId : null}
          context={context}
          onClose={() => setMoveState(null)}
          onDone={() => {
            setMoveState(null);
            void reload();
          }}
        />
      ) : null}

      {moveState && process && moveState.kind === "vacate" ? (
        <VacateSpotModal
          processId={process.id}
          spotId={moveState.spotId}
          spotCode={moveState.spotCode}
          context={context}
          onClose={() => setMoveState(null)}
          onDone={() => {
            setMoveState(null);
            void reload();
          }}
        />
      ) : null}
    </section>
  );
}

export default ProcessoDossiePage;
