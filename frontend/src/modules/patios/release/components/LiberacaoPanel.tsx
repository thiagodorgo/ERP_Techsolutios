import { FileText, Unlock } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Alert, Badge, Button, Card, Chip, EmptyState, Skeleton } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { formatMoney } from "../../charges/charges.adapter";
import type { ChargeStatementView } from "../../charges/charges.types";
import { formatDateTime } from "../../processes/processes.adapter";
import type { ProcessDetail } from "../../processes/processes.types";
import { deriveReleaseGate, resolveReleaseStage } from "../release.adapter";
import {
  approveRelease,
  consumeRelease,
  returnFromRepair,
  ReleaseActionError,
  setRecipient,
  setRequirementCheck,
  settleCharges,
  startForRepair,
  startRelease,
} from "../release.service";
import type { ApproveInput, ForRepairInput, RecipientInput, ReleaseApiContext, SettleResult } from "../release.types";
import { useRelease } from "../useRelease";
import { AprovacaoAutoridade } from "./AprovacaoAutoridade";
import { ComprovanteLiberacao } from "./ComprovanteLiberacao";
import { DossieLiberacao } from "./DossieLiberacao";
import { GateLiberacaoChecklist } from "./GateLiberacaoChecklist";
import { QuitacaoPanel } from "./QuitacaoPanel";
import { ReparoPanel } from "./ReparoPanel";

// Ω5P PR-11 — painel de Liberação I5 (inserido no dossiê após a Guia de débitos, aditivo/merge-safe). Orquestra
// por process.status × liberação em curso: iniciar → dossiê (quem retira + checklist) + quitação + autorização +
// gate visível → consumar; saída/retorno para reparo; comprovante art. 24. A UI é HINT — o backend é a autoridade
// (gate I5, freeze, hash-chain, reconciliação).
const chipRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 };
const subtitle: CSSProperties = { fontSize: 13, color: "#475569", margin: "0 0 10px" };

export function LiberacaoPanel({
  process,
  statement,
  context,
  onDone,
}: {
  readonly process: ProcessDetail;
  readonly statement: ChargeStatementView | null;
  readonly context: ReleaseApiContext;
  readonly onDone: () => void;
}) {
  const { can } = usePermissions();
  const { release, checks, loading, error, denied, loaded, reload } = useRelease(process.id);

  const canTransition = can("impound:transition");
  const canProcess = can("release:process");
  const canApprove = can("release:approve");
  const canSettle = can("charging:settle");

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);
  const [comprovanteOpen, setComprovanteOpen] = useState(false);

  const stage = resolveReleaseStage(process.status, release);
  const preconditions = release ? deriveReleaseGate(release, checks, statement) : [];

  async function run(action: () => Promise<unknown>): Promise<void> {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload(true);
      onDone();
    } catch (err) {
      setActionError(err instanceof ReleaseActionError ? err.message : "Não foi possível concluir a ação de liberação.");
    } finally {
      setBusy(false);
    }
  }

  function handleSettle(): void {
    void run(async () => {
      const result = await settleCharges(context, process.id);
      setSettleResult(result);
    });
  }

  const handleStart = () => void run(() => startRelease(context, process.id));
  const handleRecipient = (input: RecipientInput) => void run(() => setRecipient(context, process.id, input));
  const handleCheck = (code: string, satisfied: boolean) => void run(() => setRequirementCheck(context, process.id, { code, satisfied }));
  const handleApprove = (input: ApproveInput) => void run(() => approveRelease(context, process.id, input));
  const handleConsume = () => void run(() => consumeRelease(context, process.id));
  const handlePrepareRepair = (input: ForRepairInput) => void run(() => startForRepair(context, process.id, input));
  const handleEffectRepair = () => void run(() => startForRepair(context, process.id));
  const handleReturnRepair = () => void run(() => returnFromRepair(context, process.id));

  if (denied) {
    return (
      <Card title="Liberação">
        <EmptyState title="Sem acesso à liberação" detail="Você não tem permissão para consultar a liberação deste processo de custódia." />
      </Card>
    );
  }

  if (loading && !loaded) {
    return (
      <Card title="Liberação">
        <Skeleton lines={4} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Liberação">
        <Alert title="Não foi possível carregar a liberação" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void reload()}>
            Tentar novamente
          </Button>
        </Alert>
      </Card>
    );
  }

  const comprovanteAvailable = Boolean(release && (release.releasedAt || stage === "for_repair_out"));

  return (
    <>
      <Card title="Liberação">
        {actionError ? (
          <Alert title="Não foi possível concluir" tone="danger">
            {actionError}
          </Alert>
        ) : null}

        {release ? (
          <div style={chipRow}>
            <Chip tone={release.kind === "FOR_REPAIR" ? "warning" : "info"}>{release.kindLabel}</Chip>
            <Chip tone={release.status === "COMPLETED" ? "success" : release.status === "RETURNED" ? "default" : "info"}>{release.statusLabel}</Chip>
            {release.repairOverdue ? <Badge tone="warning">Prazo de reparo estourado</Badge> : null}
          </div>
        ) : null}

        {stage === "start" ? (
          <>
            <p style={subtitle}>Inicie a restituição definitiva (congela o total para quitação) ou prepare a saída para reparo (art. 271 §2º).</p>
            {canTransition ? (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <Button type="button" onClick={handleStart} disabled={busy} aria-label="Iniciar liberação">
                  <Unlock size={15} aria-hidden /> {busy ? "Iniciando…" : "Iniciar liberação"}
                </Button>
              </div>
            ) : (
              <EmptyState title="Somente leitura" detail="Você não tem permissão para iniciar a liberação deste processo." />
            )}
          </>
        ) : null}

        {stage === "for_repair_prep" ? (
          <p style={subtitle}>Saída para reparo em preparação: identifique quem transporta e registre a autorização da autoridade, depois efetive a saída.</p>
        ) : null}

        {stage === "standard" ? (
          <p style={subtitle}>Monte o dossiê (quem retira e requisitos), registre a quitação e a autorização da autoridade; então consuma a liberação.</p>
        ) : null}

        {stage === "completed" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={subtitle}>Restituição definitiva concluída{release?.releasedAt ? ` em ${formatDateTime(release.releasedAt)}` : ""}.</p>
            {release?.settledTotal != null ? (
              <p style={{ fontSize: 13, color: "#166534", margin: 0 }}>Total quitado: {formatMoney(release.settledTotal, statement?.currency ?? "BRL")}.</p>
            ) : null}
          </div>
        ) : null}

        {stage === "for_repair_out" ? (
          <p style={subtitle}>Veículo em reparo fora do pátio (custódia jurídica ativa). Registre o retorno quando reapresentado.</p>
        ) : null}

        {stage === "unavailable" ? (
          <EmptyState title="Liberação indisponível" detail="Não há ato de liberação disponível a partir do estado atual do processo." />
        ) : null}

        {comprovanteAvailable ? (
          <div style={{ marginTop: 12 }}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setComprovanteOpen(true)} aria-label="Abrir comprovante de liberação">
              <FileText size={14} aria-hidden /> Comprovante de liberação
            </Button>
          </div>
        ) : null}
      </Card>

      {stage === "standard" && release ? (
        <>
          <DossieLiberacao release={release} checks={checks} canProcess={canProcess} busy={busy} error={null} onRecipient={handleRecipient} onCheck={handleCheck} />
          <QuitacaoPanel statement={statement} settleResult={settleResult} canSettle={canSettle} busy={busy} error={null} onSettle={handleSettle} />
          <AprovacaoAutoridade release={release} canApprove={canApprove} busy={busy} error={null} onApprove={handleApprove} />
          <GateLiberacaoChecklist preconditions={preconditions} canConsume={canTransition} busy={busy} error={null} onConsume={handleConsume} />
        </>
      ) : null}

      {stage === "for_repair_prep" && release ? (
        <>
          <DossieLiberacao release={release} checks={checks} canProcess={canProcess} busy={busy} error={null} onRecipient={handleRecipient} onCheck={handleCheck} />
          <AprovacaoAutoridade release={release} canApprove={canApprove} busy={busy} error={null} onApprove={handleApprove} />
          <ReparoPanel mode="effect" release={release} canTransition={canTransition} busy={busy} error={null} onPrepare={handlePrepareRepair} onEffect={handleEffectRepair} onReturn={handleReturnRepair} />
        </>
      ) : null}

      {stage === "start" ? (
        <ReparoPanel mode="prepare" release={null} canTransition={canTransition} busy={busy} error={null} onPrepare={handlePrepareRepair} onEffect={handleEffectRepair} onReturn={handleReturnRepair} />
      ) : null}

      {stage === "for_repair_out" && release ? (
        <ReparoPanel mode="return" release={release} canTransition={canTransition} busy={busy} error={null} onPrepare={handlePrepareRepair} onEffect={handleEffectRepair} onReturn={handleReturnRepair} />
      ) : null}

      {comprovanteOpen && release ? <ComprovanteLiberacao release={release} process={process} onClose={() => setComprovanteOpen(false)} /> : null}
    </>
  );
}

export default LiberacaoPanel;
