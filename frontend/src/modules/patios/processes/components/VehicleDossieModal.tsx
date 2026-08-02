import { Printer } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Alert, Button, Card, EmptyState, Modal, Skeleton, Tabs } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { AuctionPanel } from "../../auction/components/AuctionPanel";
import { GuiaDebitos } from "../../charges/components/GuiaDebitos";
import { LancamentoChargeModal } from "../../charges/components/LancamentoChargeModal";
import type { ChargeStatementView } from "../../charges/charges.types";
import { useStatement } from "../../charges/useStatement";
import { LiberacaoPanel } from "../../release/components/LiberacaoPanel";
import { LiquidacaoPanel } from "../../settlement/components/LiquidacaoPanel";
import { getVehicleLabel } from "../processes.adapter";
import type { ChecklistRunSummaryItem, CustodyEventItem, CustodyHistoryItem, InspectionView, ProcessDetail, ProcessesApiContext, VerifyResult } from "../processes.types";
import { useCustodyHistory } from "../useCustodyHistory";
import { useProcessChecklistRuns } from "../useProcessChecklistRuns";
import { useProcessDossie } from "../useProcessDossie";
import { ChecklistRunsPanel } from "./ChecklistRunsPanel";
import { CustodyHistoryPanel } from "./CustodyHistoryPanel";
import { DossiePrintDocument } from "./DossiePrintDocument";
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
// renderizado como texto; só placa/status no cabeçalho. A aba "Checklist do Guincho" (PR-08) entra sob gate DUPLO
// (impound:read + checklist_runs:read); "Histórico de Custódias" (PR-09) entra depois.
//
// A camada de APRESENTAÇÃO (VehicleDossieView) é separada da fiação de hooks (VehicleDossieModal) — o mesmo padrão
// dos demais painéis puros do módulo (GuiaDebitos, InspectionSection…) — para ser testável com fixtures em SSR.

export type DossieTabId = "overview" | "inspection" | "checklist" | "timeline" | "history" | "charges" | "release" | "auction";

// Abas SEM o "Checklist do Guincho" — base do dossiê (usada quando o ator não tem checklist_runs:read; a UI molda).
// A aba "Histórico de Custódias" (PR-09) fica sob a MESMA guarda do dossiê (impound:read) → sempre presente aqui.
export const DOSSIE_TABS: readonly { id: DossieTabId; label: string }[] = [
  { id: "overview", label: "Visão Geral" },
  { id: "inspection", label: "Vistoria de Recepção" },
  { id: "timeline", label: "Linha do Tempo" },
  { id: "history", label: "Histórico de Custódias" },
  { id: "charges", label: "Débitos" },
  { id: "release", label: "Liberação" },
  { id: "auction", label: "Leilão/Liquidação" },
];

const CHECKLIST_TAB = { id: "checklist" as DossieTabId, label: "Checklist do Guincho" };

// Ω-VID PR-08 — a aba "Checklist do Guincho" só entra para quem tem checklist_runs:read (gate duplo no backend com
// impound:read; a UI molda/esconde, o backend é a autoridade). Posicionada logo após a Vistoria de Recepção — ambas
// são artefatos capturados em campo na recepção do veículo.
export function dossieTabsFor(canReadChecklist: boolean): readonly { id: DossieTabId; label: string }[] {
  if (!canReadChecklist) return DOSSIE_TABS;
  // Insere logo APÓS a "Vistoria de Recepção" por id (robusto a novas abas — não depende de índices fixos).
  const at = DOSSIE_TABS.findIndex((tab) => tab.id === "inspection");
  return [...DOSSIE_TABS.slice(0, at + 1), CHECKLIST_TAB, ...DOSSIE_TABS.slice(at + 1)];
}

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
  readonly canReadChecklist: boolean;
  readonly checklistRuns: readonly ChecklistRunSummaryItem[];
  readonly checklistLoading: boolean;
  readonly checklistError: string | null;
  readonly checklistDenied: boolean;
  readonly historyItems: readonly CustodyHistoryItem[];
  readonly historyLoading: boolean;
  readonly historyError: string | null;
  readonly context: ProcessesApiContext;
  readonly activeTab: DossieTabId;
  readonly onTabChange: (id: DossieTabId) => void;
  readonly onReload: () => void;
  readonly onReloadStatement: () => void;
  readonly onReloadChecklist: () => void;
  readonly onReloadHistory: () => void;
  readonly onReloadAll: () => void;
  readonly onLaunchCharge: () => void;
  readonly onPrint: () => void;
  readonly printReady: boolean;
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
  canReadChecklist,
  checklistRuns,
  checklistLoading,
  checklistError,
  checklistDenied,
  historyItems,
  historyLoading,
  historyError,
  context,
  activeTab,
  onTabChange,
  onReload,
  onReloadStatement,
  onReloadChecklist,
  onReloadHistory,
  onReloadAll,
  onLaunchCharge,
  onPrint,
  printReady,
}: VehicleDossieViewProps) {
  const tabs = dossieTabsFor(canReadChecklist);
  // Ω-VID PR-08 (junta, MÉDIA) — auto-cura: se a aba ativa não é mais válida (ex.: a permissão de checklist caiu com
  // o modal aberto e activeTab==="checklist"), degrada para a Visão Geral em vez de um painel VAZIO sem aria-label.
  const effectiveTab: DossieTabId = tabs.some((item) => item.id === activeTab) ? activeTab : "overview";
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
          {/* Ω-VID PR-10 — Imprimir / Salvar (window.print → o diálogo do navegador cobre imprimir E "Salvar como
              PDF"). Escondido na impressão (dossie-print__hide) — o botão não sai no documento. */}
          <div className="dossie-print__hide" style={{ marginLeft: "auto" }}>
            {/* Ω-VID PR-10 (junta MÉDIA) — só habilita quando os dados do documento terminaram de carregar, senão o
                documento sairia com seções vazias ("carregando" ≠ "vazio" num documento de custódia). */}
            <Button type="button" size="sm" variant="secondary" onClick={onPrint} disabled={!printReady} aria-label="Imprimir ou salvar o dossiê">
              <Printer size={14} aria-hidden /> {printReady ? "Imprimir / Salvar" : "Preparando…"}
            </Button>
          </div>
        </div>

        <div style={tabsRow}>
          <Tabs tabs={[...tabs]} active={effectiveTab} onChange={(id) => onTabChange(id as DossieTabId)} />
        </div>
      </div>

      <div role="tabpanel" aria-label={tabs.find((item) => item.id === effectiveTab)?.label} style={panelStack}>
        {effectiveTab === "overview" ? (
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

        {effectiveTab === "inspection" ? (
          <Card title="Vistoria de recepção">
            <InspectionSection view={inspection} />
          </Card>
        ) : null}

        {/* Ω-VID PR-08 — aba "Checklist do Guincho": só é ALCANÇÁVEL para quem tem checklist_runs:read (a aba nem
            aparece sem a permissão — dossieTabsFor); o painel ainda defende com o estado "denied" (backend é a
            autoridade do gate duplo). Somente leitura: o guincheiro preenche no mobile. */}
        {effectiveTab === "checklist" && canReadChecklist ? (
          <ChecklistRunsPanel runs={checklistRuns} loading={checklistLoading} error={checklistError} denied={checklistDenied} onRetry={onReloadChecklist} />
        ) : null}

        {effectiveTab === "timeline" ? (
          <>
            <Card title="Integridade do registro">
              <IntegritySeal verify={verify} loading={loading} />
            </Card>
            <Card title="Linha do tempo da custódia">
              <ProcessTimeline events={events} />
            </Card>
          </>
        ) : null}

        {/* Ω-VID PR-09 — aba "Histórico de Custódias": as outras passagens do MESMO veículo (identidade) pelo pátio.
            Mesma guarda do dossiê (impound:read); o backend resolve a identidade server-side (§allowlist). */}
        {effectiveTab === "history" ? (
          <CustodyHistoryPanel items={historyItems} loading={historyLoading} error={historyError} onRetry={onReloadHistory} />
        ) : null}

        {effectiveTab === "charges" ? (
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

        {effectiveTab === "release" ? <LiberacaoPanel process={process} statement={statement} context={context} onDone={onReloadAll} /> : null}

        {effectiveTab === "auction" ? (
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
  const { activeContext } = useTenantContext();
  const canRead = can("impound:read");
  const canCreateCharge = can("charging:create");
  const canTransition = can("impound:transition");
  const canReadChecklist = can("checklist_runs:read");
  const orgName = activeContext?.tenantName ?? null;

  const [tab, setTab] = useState<DossieTabId>("overview");
  const [chargeModalOpen, setChargeModalOpen] = useState(false);

  const { process, events, verify, inspection, yardName, currentSpot, loading, error, notFound, reload, context } = useProcessDossie(processId, canRead);

  const {
    statement,
    loading: statementLoading,
    error: statementError,
    denied: statementDenied,
    loaded: statementLoaded,
    reload: reloadStatement,
  } = useStatement(canRead ? processId : undefined);

  // Ω-VID PR-08 — checklists do guincho vinculados (aba sob gate duplo). Só busca quando o ator tem impound:read
  // (dossiê aberto) E checklist_runs:read (o hook checa a 2ª; o backend é a autoridade final do gate duplo).
  const {
    runs: checklistRuns,
    loading: checklistLoading,
    error: checklistError,
    denied: checklistDenied,
    loaded: checklistLoaded,
    reload: reloadChecklist,
  } = useProcessChecklistRuns(processId, canRead);

  // Ω-VID PR-09 — histórico de custódias do mesmo veículo (impound:read, a mesma do dossiê — só busca com canRead).
  const {
    items: historyItems,
    loading: historyLoading,
    error: historyError,
    loaded: historyLoaded,
    reload: reloadHistory,
  } = useCustodyHistory(processId, canRead);

  const reloadAll = () => {
    void reload();
    void reloadStatement();
    void reloadChecklist();
    void reloadHistory();
  };

  // Ω-VID PR-10 — Imprimir/Salvar. printReady: só imprime quando o núcleo E os painéis do documento terminaram de
  // carregar (senão o documento sairia com seções "vazias" que na verdade estão carregando — achado MÉDIA da junta).
  // Guarda cada painel pela SUA permissão opcional (ciclo 2, MÉDIA): sem charging:read o useStatement nem carrega
  // (early-return sem setar loaded) — exigir statementLoaded travaria o botão em "Preparando…" para sempre.
  const canReadCharging = can("charging:read");
  const printReady = Boolean(
    process && !loading && historyLoaded && (!canReadCharging || statementLoaded) && (!canReadChecklist || checklistLoaded),
  );

  // O carimbo "Emitido em" reflete a HORA do clique. Escopa a supressão do app à classe body.dossie-printing (só
  // durante ESTE print — achado CRÍTICO: uma regra global quebraria todos os outros fluxos de impressão). O effect
  // dispara window.print() DEPOIS de o issuedAt fresco entrar no DOM; a classe é removida no afterprint.
  const [issuedAt, setIssuedAt] = useState<string>(() => new Date().toISOString());
  const printPendingRef = useRef(false);
  useEffect(() => {
    if (!printPendingRef.current) return;
    printPendingRef.current = false;
    const body = document.body;
    const done = () => body.classList.remove("dossie-printing");
    body.classList.remove("dossie-printing"); // limpa resíduo de um ciclo anterior cujo afterprint não disparou
    body.classList.add("dossie-printing");
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    // Ω-VID PR-10 (junta ciclo 2, MÉDIA) — cleanup REDUNDANTE: se o afterprint não disparar (Safari<13/webviews) e o
    // modal for fechado, esta função garante que a classe NUNCA fica presa no <body> (senão TODA impressão do app
    // sairia em branco — a própria falha da CRÍTICA original, por gatilho mais estreito).
    return () => {
      window.removeEventListener("afterprint", done);
      body.classList.remove("dossie-printing");
    };
  }, [issuedAt]);
  const handlePrint = () => {
    printPendingRef.current = true;
    setIssuedAt(new Date().toISOString());
  };

  return (
    <>
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
        canReadChecklist={canReadChecklist}
        checklistRuns={checklistRuns}
        checklistLoading={checklistLoading}
        checklistError={checklistError}
        checklistDenied={checklistDenied}
        historyItems={historyItems}
        historyLoading={historyLoading}
        historyError={historyError}
        context={context}
        activeTab={tab}
        onTabChange={setTab}
        onReload={() => void reload()}
        onReloadStatement={() => void reloadStatement()}
        onReloadChecklist={() => void reloadChecklist()}
        onReloadHistory={() => void reloadHistory()}
        onReloadAll={reloadAll}
        onLaunchCharge={() => setChargeModalOpen(true)}
        onPrint={handlePrint}
        printReady={printReady}
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

      {/* Ω-VID PR-10 — documento de impressão/salvamento: portal no <body>, ESCONDIDO em tela e revelado só no
          `@media print` (o dossiê completo, todas as seções read-only empilhadas). Fora do modal para não herdar o
          overflow/sticky do `.ui-modal--lg` na paginação de impressão. */}
      {canRead && process
        ? createPortal(
            <div className="dossie-print">
              <DossiePrintDocument
                process={process}
                issuedAt={issuedAt}
                orgName={orgName}
                yardName={yardName}
                currentSpot={currentSpot}
                inspection={inspection}
                verify={verify}
                events={events}
                statement={statement}
                canReadChecklist={canReadChecklist}
                checklistRuns={checklistRuns}
                historyItems={historyItems}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default VehicleDossieModal;
