import type { CSSProperties } from "react";
import { useState } from "react";

import { Alert, Button, Card, EmptyState, Modal, Skeleton, Tabs } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { AuctionPanel } from "../../auction/components/AuctionPanel";
import { GuiaDebitos } from "../../charges/components/GuiaDebitos";
import { LancamentoChargeModal } from "../../charges/components/LancamentoChargeModal";
import type { ChargeStatementView } from "../../charges/charges.types";
import { useStatement } from "../../charges/useStatement";
import { LiberacaoPanel } from "../../release/components/LiberacaoPanel";
import { LiquidacaoPanel } from "../../settlement/components/LiquidacaoPanel";
import { getVehicleLabel } from "../processes.adapter";
import type { CustodyEventItem, InspectionView, ProcessDetail, ProcessesApiContext, VerifyResult } from "../processes.types";
import { useProcessDossie } from "../useProcessDossie";
import { InspectionSection } from "./InspectionSection";
import { IntegritySeal } from "./IntegritySeal";
import { ProcessIdentityCard } from "./ProcessIdentityCard";
import { ProcessStatusChip } from "./ProcessStatusChip";
import { ProcessTimeline } from "./ProcessTimeline";
import { TransicaoFsmPanel } from "./TransicaoFsmPanel";

// Ω-VID PR-07 — Dossiê do veículo num modal GRANDE (Modal size="lg" do PR-06) com ABAS (Tabs do design system),
// aberto ao clicar na vaga ocupada (OccupancyMap → PatioDetailPage) e por deep-link ?dossie=<processId>. Reaproveita
// os MESMOS componentes e a MESMA lógica de fetch da ProcessoDossiePage (via useProcessDossie), agora reorganizados
// em abas em vez de empilhados. A rota /patios/processos/:processId segue existindo como fallback direto.
// Guarda: impound:read (mesma da página) — sem acesso → estado "acesso-negado" honesto. §allowlist: processId nunca
// renderizado como texto; só placa/status no cabeçalho. As abas "Checklist do Guincho" (PR-08) e "Histórico de
// Custódias" (PR-09) entram depois — a estrutura de abas já está pronta para recebê-las (só as 6 abaixo por ora).
//
// A camada de APRESENTAÇÃO (VehicleDossieView) é separada da fiação de hooks (VehicleDossieModal) — o mesmo padrão
// dos demais painéis puros do módulo (GuiaDebitos, InspectionSection…) — para ser testável com fixtures em SSR.

export type DossieTabId = "overview" | "inspection" | "timeline" | "charges" | "release" | "auction";

export const DOSSIE_TABS: readonly { id: DossieTabId; label: string }[] = [
  { id: "overview", label: "Visão Geral" },
  { id: "inspection", label: "Vistoria de Recepção" },
  { id: "timeline", label: "Linha do Tempo" },
  { id: "charges", label: "Débitos" },
  { id: "release", label: "Liberação" },
  { id: "auction", label: "Leilão/Liquidação" },
];

// Ω-VID PR-07 (junta, MÉDIA) — a identidade (placa+status) e as abas ficam FIXAS no topo do corpo scrollável do modal:
// em abas altas (Débitos, Vistoria com galeria) o usuário não perde a navegação por abas nem a identidade do veículo
// ao rolar. `.ui-modal--lg > .ui-modal__body` é o container de scroll → sticky top:0 pina neste container.
const stickyHead: CSSProperties = { position: "sticky", top: 0, zIndex: 2, background: "var(--surface-panel)", paddingBottom: 12, marginBottom: 2 };
const headRow: CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 };
const titleStyle: CSSProperties = { fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0 };
const tabsRow: CSSProperties = { marginBottom: 0 };
const panelStack: CSSProperties = { display: "flex", flexDirection: "column", gap: 14 };

export type VehicleDossieViewProps = {
  readonly canRead: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  readonly notFound: boolean;
  readonly process: ProcessDetail | null;
  readonly events: readonly CustodyEventItem[];
  readonly verify: VerifyResult | null;
  readonly inspection: InspectionView;
  readonly yardName: string | null;
  readonly currentSpot: { readonly code: string } | null;
  readonly statement: ChargeStatementView | null;
  readonly statementLoading: boolean;
  readonly statementError: string | null;
  readonly statementDenied: boolean;
  readonly canCreateCharge: boolean;
  readonly canTransition: boolean;
  readonly context: ProcessesApiContext;
  readonly activeTab: DossieTabId;
  readonly onTabChange: (id: DossieTabId) => void;
  readonly onReload: () => void;
  readonly onReloadStatement: () => void;
  readonly onReloadAll: () => void;
  readonly onLaunchCharge: () => void;
};

/** Corpo puro do dossiê (sem fiação de hooks) — os 5 estados obrigatórios (§7) + as 6 abas reorganizadas. */
export function VehicleDossieView({
  canRead,
  loading,
  error,
  notFound,
  process,
  events,
  verify,
  inspection,
  yardName,
  currentSpot,
  statement,
  statementLoading,
  statementError,
  statementDenied,
  canCreateCharge,
  canTransition,
  context,
  activeTab,
  onTabChange,
  onReload,
  onReloadStatement,
  onReloadAll,
  onLaunchCharge,
}: VehicleDossieViewProps) {
  if (!canRead) {
    return <EmptyState title="Sem acesso ao dossiê" detail="Você não tem permissão para consultar o dossiê deste processo de custódia." />;
  }

  if (loading && !process) {
    return <Skeleton lines={8} />;
  }

  if (error) {
    return (
      <Alert title="Não foi possível carregar o dossiê" tone="warning">
        {error}{" "}
        <Button type="button" size="sm" variant="secondary" onClick={onReload}>
          Tentar novamente
        </Button>
      </Alert>
    );
  }

  if (notFound) {
    return <EmptyState title="Processo não encontrado" detail="O processo pode ter sido removido ou o vínculo está desatualizado. Atualize a ocupação do pátio e tente de novo." />;
  }

  if (!process) return null;

  return (
    <>
      <div style={stickyHead}>
        <div style={headRow}>
          <h3 style={titleStyle}>{getVehicleLabel(process)}</h3>
          <ProcessStatusChip status={process.status} label={process.statusLabel} />
        </div>

        <div style={tabsRow}>
          <Tabs tabs={[...DOSSIE_TABS]} active={activeTab} onChange={(id) => onTabChange(id as DossieTabId)} />
        </div>
      </div>

      <div role="tabpanel" aria-label={DOSSIE_TABS.find((item) => item.id === activeTab)?.label} style={panelStack}>
        {activeTab === "overview" ? (
          <>
            <ProcessIdentityCard process={process} yardName={yardName} currentSpot={currentSpot} />
            {/* Ω-VID PR-07 (junta, MÉDIA) — como a vaga do mapa deixou de navegar para a página e passou a abrir ESTE
                modal, a transição da FSM de custódia (impound:transition) precisa viver aqui também, senão o operador
                perderia a ação no novo ponto de entrada. Mesmo componente/props/onDone da página; silencioso-honesto
                ("Somente leitura") para quem não pode transicionar. */}
            <TransicaoFsmPanel
              processId={process.id}
              status={process.status}
              inspectionComplete={inspection?.complete ?? false}
              canTransition={canTransition}
              context={context}
              onDone={onReloadAll}
            />
          </>
        ) : null}

        {activeTab === "inspection" ? (
          <Card title="Vistoria de recepção">
            <InspectionSection view={inspection} />
          </Card>
        ) : null}

        {activeTab === "timeline" ? (
          <>
            <Card title="Integridade do registro">
              <IntegritySeal verify={verify} loading={loading} />
            </Card>
            <Card title="Linha do tempo da custódia">
              <ProcessTimeline events={events} />
            </Card>
          </>
        ) : null}

        {activeTab === "charges" ? (
          <GuiaDebitos
            statement={statement}
            loading={statementLoading}
            error={statementError}
            denied={statementDenied}
            canCreate={canCreateCharge}
            onRetry={onReloadStatement}
            onLaunch={onLaunchCharge}
          />
        ) : null}

        {activeTab === "release" ? <LiberacaoPanel process={process} statement={statement} context={context} onDone={onReloadAll} /> : null}

        {activeTab === "auction" ? (
          <>
            <AuctionPanel process={process} context={context} onDone={onReloadAll} />
            <LiquidacaoPanel process={process} context={context} onDone={onReloadAll} />
          </>
        ) : null}
      </div>
    </>
  );
}

/** Casca do modal: fia os hooks (useProcessDossie/useStatement/permissões) e delega o corpo ao VehicleDossieView. */
export function VehicleDossieModal({ processId, onClose }: { readonly processId: string; readonly onClose: () => void }) {
  const { can } = usePermissions();
  const canRead = can("impound:read");
  const canCreateCharge = can("charging:create");
  const canTransition = can("impound:transition");

  const [tab, setTab] = useState<DossieTabId>("overview");
  const [chargeModalOpen, setChargeModalOpen] = useState(false);

  const { process, events, verify, inspection, yardName, currentSpot, loading, error, notFound, reload, context } = useProcessDossie(processId, canRead);

  const {
    statement,
    loading: statementLoading,
    error: statementError,
    denied: statementDenied,
    reload: reloadStatement,
  } = useStatement(canRead ? processId : undefined);

  const reloadAll = () => {
    void reload();
    void reloadStatement();
  };

  return (
    <Modal title="Dossiê do veículo" open size="lg" onClose={onClose}>
      <VehicleDossieView
        canRead={canRead}
        loading={loading}
        error={error}
        notFound={notFound}
        process={process}
        events={events}
        verify={verify}
        inspection={inspection}
        yardName={yardName}
        currentSpot={currentSpot}
        statement={statement}
        statementLoading={statementLoading}
        statementError={statementError}
        statementDenied={statementDenied}
        canCreateCharge={canCreateCharge}
        canTransition={canTransition}
        context={context}
        activeTab={tab}
        onTabChange={setTab}
        onReload={() => void reload()}
        onReloadStatement={() => void reloadStatement()}
        onReloadAll={reloadAll}
        onLaunchCharge={() => setChargeModalOpen(true)}
      />

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
    </Modal>
  );
}

export default VehicleDossieModal;
