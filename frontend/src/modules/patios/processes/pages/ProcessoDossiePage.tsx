import { ArrowLeft, MapPin, PackageOpen, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Alert, Button, Card, EmptyState, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { AuctionPanel } from "../../auction/components/AuctionPanel";
import { GuiaDebitos } from "../../charges/components/GuiaDebitos";
import { LancamentoChargeModal } from "../../charges/components/LancamentoChargeModal";
import { useStatement } from "../../charges/useStatement";
import { LiberacaoPanel } from "../../release/components/LiberacaoPanel";
import { getYardOccupancy, listYardsFromApi } from "../../yards/yards.service";
import { IntegritySeal } from "../components/IntegritySeal";
import { InspectionSection } from "../components/InspectionSection";
import { ProcessStatusChip } from "../components/ProcessStatusChip";
import { ProcessTimeline } from "../components/ProcessTimeline";
import { SpotPickerModal } from "../components/SpotPickerModal";
import { TransicaoFsmPanel } from "../components/TransicaoFsmPanel";
import { VacateSpotModal } from "../components/VacateSpotModal";
import { formatDateTime, getVehicleLabel } from "../processes.adapter";
import { getInspection, getProcess, listEvents, verifyChain } from "../processes.service";
import type { CustodyEventItem, InspectionView, ProcessDetail, VerifyResult } from "../processes.types";

const backLinkStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, color: "#2563EB", fontSize: 13, fontWeight: 700, marginBottom: 14, textDecoration: "none" };
const infoGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 };
const labelStyle: CSSProperties = { fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" };
const valueStyle: CSSProperties = { fontSize: 14, color: "#0F172A" };
const spotRow: CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };

type CurrentSpot = { readonly id: string; readonly code: string };
type MoveState = { readonly kind: "allocate" } | { readonly kind: "move"; readonly fromSpotId: string } | { readonly kind: "vacate"; readonly spotId: string; readonly spotCode: string } | null;

export function ProcessoDossiePage() {
  const { processId } = useParams<{ processId: string }>();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canAllocate = can("impound:allocate");
  const canTransition = can("impound:transition");
  const canCreateCharge = can("charging:create");

  const [process, setProcess] = useState<ProcessDetail | null>(null);
  const [events, setEvents] = useState<CustodyEventItem[]>([]);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [inspection, setInspection] = useState<InspectionView>(null);
  const [yardName, setYardName] = useState<string | null>(null);
  const [currentSpot, setCurrentSpot] = useState<CurrentSpot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
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

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  const load = useCallback(async () => {
    if (!processId || !activeContext) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const detail = await getProcess(context, processId);
      if (!detail) {
        setNotFound(true);
        setProcess(null);
        return;
      }
      setProcess(detail);

      const [eventList, verifyResult, inspectionView] = await Promise.all([
        listEvents(context, processId).catch(() => []),
        verifyChain(context, processId).catch(() => null),
        getInspection(context, processId).catch(() => null),
      ]);
      setEvents(eventList);
      setVerify(verifyResult);
      setInspection(inspectionView);

      // Nome do pátio + vaga atual (join client-side: a vaga onde currentProcessId === este processo).
      if (detail.yardId) {
        const [yardsData, occupancy] = await Promise.all([
          listYardsFromApi(context, { limit: 100 }).catch(() => null),
          getYardOccupancy(context, detail.yardId).catch(() => null),
        ]);
        setYardName(yardsData?.items.find((yard) => yard.id === detail.yardId)?.name ?? null);
        const spot = occupancy?.items.find((item) => item.currentProcessId === processId);
        setCurrentSpot(spot ? { id: spot.id, code: spot.code } : null);
      } else {
        setYardName(null);
        setCurrentSpot(null);
      }
    } catch (err) {
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
      if (status === 404) setNotFound(true);
      else setError("Não foi possível carregar o dossiê do processo.");
    } finally {
      setLoading(false);
    }
  }, [processId, activeContext, context]);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(load, { enabled: Boolean(processId && activeContext) });

  return (
    <section className="page-stack work-orders-page">
      <Link to="/patios/processos" style={backLinkStyle}>
        <ArrowLeft size={16} aria-hidden /> Voltar aos processos
      </Link>

      {loading && !process ? <Skeleton lines={8} /> : null}

      {error ? (
        <Alert title="Não foi possível carregar o dossiê" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
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

          <Card title="Integridade do registro">
            <IntegritySeal verify={verify} loading={loading} />
          </Card>

          <Card title="Linha do tempo da custódia">
            <ProcessTimeline events={events} />
          </Card>

          <Card title="Vistoria de recepção">
            <InspectionSection view={inspection} />
          </Card>

          <TransicaoFsmPanel
            processId={process.id}
            status={process.status}
            inspectionComplete={inspection?.complete ?? false}
            canTransition={canTransition}
            context={context}
            onDone={() => {
              void load();
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
              void load();
              void reloadStatement();
            }}
          />

          {/* Ω5P PR-15a — Leilão administrativo (aditivo/merge-safe: os painéis acima ficam intactos). O painel
              orquestra por process.status e consome o módulo backend auction (FSM de leilão, gate I8, sigilo art. 28).
              A liquidação em cascata (§6º) é a seção 15b, ainda não implementada. */}
          <AuctionPanel
            process={process}
            context={context}
            onDone={() => {
              void load();
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
            void load();
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
            void load();
          }}
        />
      ) : null}
    </section>
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

export default ProcessoDossiePage;
