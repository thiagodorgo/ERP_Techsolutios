import { Coins, FileText, Scale } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Card, EmptyState, Input, Skeleton } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { normalizeMoneyInput } from "../../charges/charges.adapter";
import { useAuction } from "../../auction/useAuction";
import type { ProcessDetail } from "../../processes/processes.types";
import { formatMoney, resolveSettlementStage } from "../settlement.adapter";
import { SettlementActionError, claimBalance, distributeSettlement, revertToFunset } from "../settlement.service";
import type { CertameResult, DistributeInput, SettlementApiContext } from "../settlement.types";
import { useSettlement } from "../useSettlement";
import { CascataTable } from "./CascataTable";
import { ComprovanteLeilao } from "./ComprovanteLeilao";
import { SaldoCiclo } from "./SaldoCiclo";

// Ω5P PR-15b — painel de LIQUIDAÇÃO em cascata §6º (inserido no dossiê após o leilão, aditivo/merge-safe). Orquestra
// por process.status × existência de liquidação: AUCTION_CLOSED sem liquidação → distribuir a cascata; com liquidação
// → cascata (<CascataTable> com Σ=arremate) + ciclo do saldo (<SaldoCiclo>) + comprovante (<ComprovanteLeilao>). A UI
// é HINT — o backend é a AUTORIDADE (cascata I7, ciclo do saldo §12, hash-chain). HONESTIDADE DE DINHEIRO: a UI NUNCA
// calcula dinheiro; só exibe o que o backend gravou. §2.8/white-label: sem tenant_id; refs mascaradas; "liquidação/
// cascata/credores/multas/tributos/saldo ao proprietário/Funset", NUNCA "polícia".
const introStyle: CSSProperties = { fontSize: 13, color: "#475569", margin: "0 0 10px" };

export function LiquidacaoPanel({
  process,
  context,
  onDone,
}: {
  readonly process: ProcessDetail;
  readonly context: SettlementApiContext;
  readonly onDone: () => void;
}) {
  const { can } = usePermissions();
  const canTransition = can("impound:transition");

  const applicable = process.status === "AUCTION_CLOSED";
  const { settlement, allocations, loading, error, denied, loaded, reload } = useSettlement(process.id, applicable);
  // Resultado do certame (arremate/arrematante/nota) — só carregado quando aplicável (evita GET a mais). O hammer é
  // apurado da venda EFETIVA pelo backend; aqui é read-only/informativo. Sem coupling de regra (só leitura).
  const { auction } = useAuction(applicable ? process.id : undefined);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comprovanteOpen, setComprovanteOpen] = useState(false);

  const certame: CertameResult | null = useMemo(() => {
    if (!auction) return null;
    const sold = [...auction.attempts].reverse().find((attempt) => attempt.outcome === "SOLD" && attempt.soldAmount != null);
    return sold ? { roundNumber: sold.roundNumber, winnerRef: sold.winnerRef, soldAmount: sold.soldAmount, saleNoteReference: sold.saleNoteReference } : null;
  }, [auction]);

  const stage = resolveSettlementStage(process.status, settlement ? { settlement, allocations } : null);

  async function run(action: () => Promise<unknown>): Promise<void> {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload(true);
      onDone();
    } catch (err) {
      setActionError(err instanceof SettlementActionError ? err.message : "Não foi possível concluir a ação de liquidação.");
    } finally {
      setBusy(false);
    }
  }

  const handleDistribute = (input: DistributeInput) => void run(() => distributeSettlement(context, process.id, input));
  const handleClaim = (recipientRef: string) => void run(() => claimBalance(context, process.id, recipientRef ? { claimRecipientRef: recipientRef } : {}));
  const handleRevert = () => void run(() => revertToFunset(context, process.id));

  // Fora de AUCTION_CLOSED e sem liquidação → o painel é silencioso (o AuctionPanel conduz os demais estados).
  if (stage === "unavailable") return null;

  if (denied) {
    return (
      <Card title="Liquidação">
        <EmptyState title="Sem acesso à liquidação" detail="Você não tem permissão para consultar a liquidação deste processo de custódia." />
      </Card>
    );
  }

  if (loading && !loaded) {
    return (
      <Card title="Liquidação">
        <Skeleton lines={4} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Liquidação">
        <Alert title="Não foi possível carregar a liquidação" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void reload()}>
            Tentar novamente
          </Button>
        </Alert>
      </Card>
    );
  }

  // AUCTION_CLOSED sem liquidação distribuída → o formulário da cascata §6º.
  if (stage === "distribute" || !settlement) {
    return (
      <Card title="Liquidação">
        <p style={introStyle}>
          <Scale size={14} aria-hidden style={{ verticalAlign: "-2px", marginRight: 4 }} /> Venda consumada. Distribua o
          valor arrematado na ordem legal do §6º. O arremate é apurado da venda efetiva e a remoção/estada (item I) é
          computada — não são digitados aqui.
        </p>
        {canTransition ? (
          <DistribuicaoForm hammerDisplay={certame?.soldAmount ?? null} busy={busy} error={actionError} onDistribute={handleDistribute} />
        ) : (
          <EmptyState title="Somente leitura" detail="Você não tem permissão para distribuir a liquidação deste processo." />
        )}
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Liquidação"
        action={
          <Button type="button" variant="secondary" size="sm" onClick={() => setComprovanteOpen(true)} aria-label="Abrir comprovante de liquidação">
            <FileText size={14} aria-hidden /> Comprovante
          </Button>
        }
      >
        {actionError ? (
          <Alert title="Não foi possível concluir" tone="danger">
            {actionError}
          </Alert>
        ) : null}
        <CascataTable settlement={settlement} allocations={allocations} />
      </Card>

      <SaldoCiclo settlement={settlement} canTransition={canTransition} busy={busy} error={actionError} onClaim={handleClaim} onRevert={handleRevert} />

      {comprovanteOpen ? (
        <ComprovanteLeilao process={process} settlement={settlement} allocations={allocations} certame={certame} onClose={() => setComprovanteOpen(false)} />
      ) : null}
    </>
  );
}

// Formulário da DISTRIBUIÇÃO em cascata §6º (inline — respeita o conjunto de 4 componentes da fatia). Coleta SÓ os 6
// tiers declarados (≥0); o arremate (read-only) e a remoção/estada (computada) NÃO são inputs. Normaliza cada valor à
// string canônica "0.00" antes de enviar. Confirma o ato (financeiro/consequente, §11) num modal com o resumo.
const TIER_FIELDS = [
  { key: "auctionCost", label: "Custeio do leilão" },
  { key: "vehicleTaxes", label: "Tributos do veículo" },
  { key: "priorityCreditors", label: "Credores preferenciais" },
  { key: "realizingAgencyFines", label: "Multas do órgão realizador" },
  { key: "otherSntFines", label: "Demais multas do SNT" },
  { key: "otherDebits", label: "Demais débitos" },
] as const;

type TierKey = (typeof TIER_FIELDS)[number]["key"];

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
const readonlyBox: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 12 };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

function DistribuicaoForm({
  hammerDisplay,
  busy,
  error,
  onDistribute,
}: {
  readonly hammerDisplay: string | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onDistribute: (input: DistributeInput) => void;
}) {
  const [values, setValues] = useState<Record<TierKey, string>>({
    auctionCost: "",
    vehicleTaxes: "",
    priorityCreditors: "",
    realizingAgencyFines: "",
    otherSntFines: "",
    otherDebits: "",
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function buildInput(): DistributeInput | null {
    const input: Record<string, string> = {};
    for (const field of TIER_FIELDS) {
      const raw = values[field.key].trim();
      if (!raw) continue;
      const canonical = normalizeMoneyInput(raw);
      if (canonical === null) {
        setLocalError(`Informe um valor válido em "${field.label}" (ex.: 1.500,00).`);
        return null;
      }
      input[field.key] = canonical;
    }
    return input as DistributeInput;
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setLocalError(null);
    const input = buildInput();
    if (!input) return;
    setConfirmOpen(true);
  }

  function handleConfirm() {
    const input = buildInput();
    if (!input) return;
    setConfirmOpen(false);
    onDistribute(input);
  }

  return (
    <>
      {error || localError ? (
        <Alert title="Não foi possível distribuir a liquidação" tone="danger">
          {localError ?? error}
        </Alert>
      ) : null}

      <div style={readonlyBox}>
        <Coins size={16} aria-hidden color="#2563EB" />
        <span style={{ fontSize: 13, color: "#334155" }}>
          Valor arrematado (apurado da venda efetiva): <strong>{hammerDisplay ? formatMoney(hammerDisplay) : "definido pelo servidor"}</strong>. Remoção e estada (item I): computada pelo sistema.
        </span>
      </div>

      <form onSubmit={handleReview} noValidate>
        <div style={gridStyle}>
          {TIER_FIELDS.map((field) => (
            <Input
              key={field.key}
              label={`${field.label} (R$)`}
              value={values[field.key]}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              inputMode="decimal"
              placeholder="0,00"
            />
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#94A3B8", margin: "8px 0 0" }}>
          Deixe em branco os níveis sem reclamação. A cascata paga na ordem legal §6º até esgotar o arremate; o resíduo é
          o saldo ao proprietário.
        </p>
        <div style={footerStyle}>
          <Button type="submit" disabled={busy} aria-label="Distribuir liquidação em cascata">
            <Scale size={15} aria-hidden /> {busy ? "Distribuindo…" : "Distribuir liquidação (cascata §6º)"}
          </Button>
        </div>
      </form>

      {confirmOpen ? (
        <div className="ui-overlay ui-overlay--center" role="presentation">
          <section className="ui-modal" role="dialog" aria-modal="true" aria-label="Distribuir liquidação em cascata">
            <header>
              <h2>Distribuir liquidação (cascata §6º)</h2>
              <button type="button" onClick={() => setConfirmOpen(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            <p style={{ fontSize: 14, color: "#334155" }}>
              Confirma a distribuição do valor arrematado na cascata §6º? A soma das alocações é garantida igual ao
              arremate pelo servidor (invariante I7). A distribuição é registrada uma única vez.
            </p>
            <footer style={footerStyle}>
              <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button type="button" disabled={busy} onClick={handleConfirm}>
                {busy ? "Processando…" : "Confirmar distribuição"}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default LiquidacaoPanel;
