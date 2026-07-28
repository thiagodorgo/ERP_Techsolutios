import { Boxes, Gavel, PackageCheck, Undo2, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Card, EmptyState, Select, Skeleton } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import type { ProcessDetail } from "../../processes/processes.types";
import { defaultRoundForStage, deriveScrapGate, resolveAuctionStage } from "../auction.adapter";
import {
  AuctionActionError,
  closeAuction,
  defaultAuction,
  lotForAuction,
  markEligible,
  prepareForAuction,
  reclaimBeforeSale,
  reclassifyScrap,
  reclassifyUnrecoverable,
  recordDesertedAttempt,
  recordSale,
  registerEdict,
  setAppraisal,
} from "../auction.service";
import type { AppraisalInput, AuctionApiContext, DesertedAttemptInput, EdictInput, SaleInput, UnrecoverableInput } from "../auction.types";
import { useAuction } from "../useAuction";
import { AppraisalForm } from "./AppraisalForm";
import { AuctionStatePanel } from "./AuctionStatePanel";
import { DesertedAttemptForm } from "./DesertedAttemptForm";
import { EditalModal } from "./EditalModal";
import { EligibilityPanel } from "./EligibilityPanel";
import { SaleForm } from "./SaleForm";
import { ScrapGateChecklist } from "./ScrapGateChecklist";

// Ω5P PR-15a — painel de Leilão administrativo (inserido no dossiê após a Liberação, aditivo/merge-safe). Orquestra
// por process.status: custódia (elegibilidade + reciclagem inservível) → elegível (edital + avaliação sigilosa +
// rodada deserta + gate de sucata + preparar) → preparação (lotear) → lotado (arremate + reclamar) → arrematado
// (consumar + inadimplência) → encerrado/reciclagem (terminais). A UI é HINT — o backend é a AUTORIDADE (FSM de
// leilão, gate I8, sigilo art. 28, hash-chain). §2.8/white-label: sem tenant_id; refs mascaradas; "leilão/edital/
// lote/arrematante/reciclagem/sucata/proprietário", NUNCA "polícia".
const introStyle: CSSProperties = { fontSize: 13, color: "#475569", margin: "0 0 10px" };
const actionRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function AuctionPanel({
  process,
  context,
  onDone,
}: {
  readonly process: ProcessDetail;
  readonly context: AuctionApiContext;
  readonly onDone: () => void;
}) {
  const { can } = usePermissions();
  const { auction, loading, error, denied, loaded, reload } = useAuction(process.id);

  const canTransition = can("impound:transition");
  const canAppraise = can("auction:appraise");

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editalOpen, setEditalOpen] = useState(false);
  const [reclaimOpen, setReclaimOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDefault, setConfirmDefault] = useState(false);
  const [reclaimReason, setReclaimReason] = useState("");
  const [roundOverride, setRoundOverride] = useState<number | null>(null);

  const stage = resolveAuctionStage(process.status);
  const defaultRound = useMemo(() => (auction ? defaultRoundForStage(auction, stage) : 1), [auction, stage]);
  const actionRound = roundOverride ?? defaultRound;
  const roundChoices = useMemo(() => (auction ? [...new Set(auction.edicts.map((edict) => edict.roundNumber))].sort((a, b) => a - b) : []), [auction]);
  const scrapGate = useMemo(() => (auction ? deriveScrapGate(auction) : []), [auction]);
  const activeEdict = useMemo(() => auction?.edicts.find((edict) => edict.roundNumber === actionRound) ?? null, [auction, actionRound]);

  async function run(action: () => Promise<unknown>): Promise<void> {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload(true);
      onDone();
    } catch (err) {
      setActionError(err instanceof AuctionActionError ? err.message : "Não foi possível concluir a ação do leilão.");
    } finally {
      setBusy(false);
    }
  }

  const handleMarkEligible = () => void run(() => markEligible(context, process.id));
  const handleRecycleUnrecoverable = (input: UnrecoverableInput) => void run(() => reclassifyUnrecoverable(context, process.id, input));
  const handleRegisterEdict = (input: EdictInput) => void run(async () => {
    await registerEdict(context, process.id, input);
    setEditalOpen(false);
  });
  const handleAppraisal = (input: AppraisalInput) => void run(() => setAppraisal(context, process.id, input));
  const handleDeserted = (input: DesertedAttemptInput) => void run(() => recordDesertedAttempt(context, process.id, input));
  const handleScrap = () => void run(() => reclassifyScrap(context, process.id));
  const handlePrepare = () => void run(() => prepareForAuction(context, process.id, actionRound));
  const handleLot = () => void run(() => lotForAuction(context, process.id, actionRound));
  const handleSale = (input: SaleInput) => void run(() => recordSale(context, process.id, input));
  const handleClose = () => void run(() => closeAuction(context, process.id, actionRound));
  const handleDefault = () => void run(() => defaultAuction(context, process.id, actionRound));
  const handleReclaim = () => void run(async () => {
    await reclaimBeforeSale(context, process.id, reclaimReason);
    setReclaimOpen(false);
    setReclaimReason("");
  });

  if (denied) {
    return (
      <Card title="Leilão">
        <EmptyState title="Sem acesso ao leilão" detail="Você não tem permissão para consultar o leilão deste processo de custódia." />
      </Card>
    );
  }

  if (loading && !loaded) {
    return (
      <Card title="Leilão">
        <Skeleton lines={4} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Leilão">
        <Alert title="Não foi possível carregar o leilão" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void reload()}>
            Tentar novamente
          </Button>
        </Alert>
      </Card>
    );
  }

  if (!auction) {
    return (
      <Card title="Leilão">
        <EmptyState title="Leilão indisponível" detail="Não há informação de leilão disponível para este processo." />
      </Card>
    );
  }

  const roundSelector = roundChoices.length > 1 ? (
    <Select label="Rodada" value={String(actionRound)} onChange={(event) => setRoundOverride(Number(event.target.value))}>
      {roundChoices.map((round) => (
        <option key={round} value={round}>
          {round}ª rodada
        </option>
      ))}
    </Select>
  ) : null;

  return (
    <>
      {stage === "custody" ? (
        <EligibilityPanel
          canTransition={canTransition}
          busy={busy}
          error={actionError}
          onMarkEligible={handleMarkEligible}
          onRecycleUnrecoverable={handleRecycleUnrecoverable}
        />
      ) : null}

      {stage === "eligible" ? (
        <>
          <Card title="Leilão">
            {actionError ? (
              <Alert title="Não foi possível concluir" tone="danger">
                {actionError}
              </Alert>
            ) : null}
            <p style={introStyle}>
              Certame em curso: registre o edital de cada rodada, a avaliação sigilosa e as rodadas desertas. Com o bem
              conservado e a avaliação registrada, prepare-o para o leilão.
            </p>
            {canTransition ? (
              <div style={actionRow}>
                <Button type="button" variant="secondary" onClick={() => setEditalOpen(true)} disabled={busy}>
                  <Boxes size={15} aria-hidden /> Registrar edital
                </Button>
                {roundSelector}
                <Button type="button" onClick={handlePrepare} disabled={busy} aria-label="Preparar para leilão">
                  <PackageCheck size={15} aria-hidden /> {busy ? "Processando…" : "Preparar para leilão"}
                </Button>
              </div>
            ) : (
              <EmptyState title="Somente leitura" detail="Você não tem permissão para conduzir o leilão deste processo." />
            )}
          </Card>

          {canAppraise ? (
            <AppraisalForm
              defaultRound={defaultRound}
              appraisalAmount={activeEdict?.appraisalAmount ?? null}
              minBidAmount={activeEdict?.minBidAmount ?? null}
              busy={busy}
              error={actionError}
              onSubmit={handleAppraisal}
            />
          ) : null}

          {canTransition ? (
            <Card title="Rodada deserta">
              <DesertedAttemptForm defaultRound={defaultRound} busy={busy} error={actionError} onSubmit={handleDeserted} />
            </Card>
          ) : null}

          <ScrapGateChecklist preconditions={scrapGate} canReclassify={canTransition} busy={busy} error={actionError} onReclassify={handleScrap} />
        </>
      ) : null}

      {stage === "prep" ? (
        <Card title="Leilão">
          {actionError ? (
            <Alert title="Não foi possível concluir" tone="danger">
              {actionError}
            </Alert>
          ) : null}
          <p style={introStyle}>Processo preparado para o leilão. Lote a rodada para abrir a arrematação.</p>
          {canTransition ? (
            <div style={actionRow}>
              {roundSelector}
              <Button type="button" onClick={handleLot} disabled={busy} aria-label="Lotear">
                <Boxes size={15} aria-hidden /> {busy ? "Loteando…" : "Lotear"}
              </Button>
            </div>
          ) : (
            <EmptyState title="Somente leitura" detail="Você não tem permissão para lotear este processo." />
          )}
        </Card>
      ) : null}

      {stage === "lotted" ? (
        <>
          {canTransition ? (
            <SaleForm defaultRound={defaultRound} busy={busy} error={actionError} onSubmit={handleSale} />
          ) : (
            <Card title="Registrar arremate">
              <EmptyState title="Somente leitura" detail="Você não tem permissão para registrar o arremate deste processo." />
            </Card>
          )}
          {canTransition ? (
            <Card title="Reclamado antes da venda">
              <p style={introStyle}>O proprietário pode reclamar o veículo antes da consumação da venda (art. 26 §1º). Reabre a liberação.</p>
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <Button type="button" variant="secondary" onClick={() => setReclaimOpen(true)} disabled={busy} aria-label="Reclamado antes da venda">
                  <Undo2 size={15} aria-hidden /> Reclamado antes da venda
                </Button>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      {stage === "auctioned" ? (
        <Card title="Leilão">
          {actionError ? (
            <Alert title="Não foi possível concluir" tone="danger">
              {actionError}
            </Alert>
          ) : null}
          <p style={introStyle}>Veículo arrematado. Consume a venda quando o pagamento e a nota estiverem confirmados, ou registre a inadimplência do arrematante (art. 42).</p>
          {canTransition ? (
            <div style={actionRow}>
              <Button type="button" onClick={() => setConfirmClose(true)} disabled={busy} aria-label="Consumar leilão">
                <PackageCheck size={15} aria-hidden /> Consumar (pagamento confirmado)
              </Button>
              <Button type="button" variant="danger" onClick={() => setConfirmDefault(true)} disabled={busy} aria-label="Registrar inadimplência do arrematante">
                <XCircle size={15} aria-hidden /> Inadimplência do arrematante
              </Button>
            </div>
          ) : (
            <EmptyState title="Somente leitura" detail="Você não tem permissão para consumar ou inadimplir a venda deste processo." />
          )}
        </Card>
      ) : null}

      {stage === "closed" ? (
        <Card title="Leilão encerrado">
          <p style={introStyle}>
            <Gavel size={14} aria-hidden style={{ verticalAlign: "-2px", marginRight: 4 }} /> Venda consumada. A
            liquidação do valor arrematado em cascata (§6º) é conduzida na seção de liquidação, logo abaixo.
          </p>
        </Card>
      ) : null}

      {stage === "recycling" ? (
        <Card title="Reciclagem direta">
          <p style={introStyle}>Veículo reciclado (sucata/inservível). Estado terminal — segue para baixa no Renavam.</p>
        </Card>
      ) : null}

      {stage === "unavailable" ? (
        <Card title="Leilão">
          <EmptyState title="Leilão indisponível" detail="Não há ato de leilão disponível a partir do estado atual do processo." />
        </Card>
      ) : null}

      {stage !== "custody" && stage !== "unavailable" ? (
        <AuctionStatePanel view={auction} status={process.status} statusLabel={process.statusLabel} canAppraise={canAppraise} />
      ) : null}

      {editalOpen ? (
        <EditalModal defaultRound={defaultRound} busy={busy} error={actionError} onClose={() => setEditalOpen(false)} onSubmit={handleRegisterEdict} />
      ) : null}

      {reclaimOpen ? (
        <div className="ui-overlay ui-overlay--center" role="presentation">
          <section className="ui-modal" role="dialog" aria-modal="true" aria-label="Reclamado antes da venda">
            <header>
              <h2>Reclamado antes da venda</h2>
              <button type="button" onClick={() => setReclaimOpen(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            {actionError ? (
              <Alert title="Não foi possível concluir" tone="danger">
                {actionError}
              </Alert>
            ) : null}
            <label className="ui-field">
              <span>Fundamento do resgate *</span>
              <textarea
                className="ui-input"
                value={reclaimReason}
                onChange={(event) => setReclaimReason(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Fundamento do resgate (art. 26 §1º)."
              />
            </label>
            <footer style={footerStyle}>
              <Button type="button" variant="ghost" onClick={() => setReclaimOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleReclaim} disabled={busy || !reclaimReason.trim()}>
                {busy ? "Processando…" : "Confirmar resgate"}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}

      {confirmClose ? (
        <div className="ui-overlay ui-overlay--center" role="presentation">
          <section className="ui-modal" role="dialog" aria-modal="true" aria-label="Consumar leilão">
            <header>
              <h2>Consumar o leilão</h2>
              <button type="button" onClick={() => setConfirmClose(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            <p style={{ fontSize: 14, color: "#334155" }}>
              Confirma que o pagamento e a nota do leilão (art. 34) foram confirmados? A consumação encerra o certame.
            </p>
            <footer style={footerStyle}>
              <Button type="button" variant="ghost" onClick={() => setConfirmClose(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirmClose(false);
                  handleClose();
                }}
              >
                {busy ? "Processando…" : "Confirmar consumação"}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}

      {confirmDefault ? (
        <div className="ui-overlay ui-overlay--center" role="presentation">
          <section className="ui-modal" role="dialog" aria-modal="true" aria-label="Inadimplência do arrematante">
            <header>
              <h2>Inadimplência do arrematante</h2>
              <button type="button" onClick={() => setConfirmDefault(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            <p style={{ fontSize: 14, color: "#334155" }}>
              Confirma a inadimplência do arrematante (art. 42)? O veículo é reintegrado ao lote para nova arrematação.
            </p>
            <footer style={footerStyle}>
              <Button type="button" variant="ghost" onClick={() => setConfirmDefault(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={busy}
                onClick={() => {
                  setConfirmDefault(false);
                  handleDefault();
                }}
              >
                {busy ? "Processando…" : "Confirmar inadimplência"}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default AuctionPanel;
