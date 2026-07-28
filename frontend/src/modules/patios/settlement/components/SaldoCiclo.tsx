import { CalendarClock, HandCoins, Landmark } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Alert, Button, Card, EmptyState, Input } from "../../../../components/ui";
import {
  canClaimBalance,
  canRevertToFunset,
  formatDateTime,
  formatMoney,
  hasOwnerBalance,
  isClaimWindowExpired,
} from "../settlement.adapter";
import type { SettlementDto } from "../settlement.types";

// §11 — CICLO do saldo ao ex-proprietário (§12). Sobre uma liquidação DISTRIBUÍDA com saldo>0: mostra os prazos
// (notificação +30d / reclamação +5a) e as DUAS ações MUTUAMENTE EXCLUSIVAS, gated pelo prazo — "Registrar retirada
// do saldo" (dentro do prazo) OU "Reverter saldo ao Funset" (após o prazo). O gate client-side é HINT; o backend
// re-verifica sob lock (409 recarrega). D-Ω5P-07: o pagamento é MANUAL/presencial (SEM PSP) — o sistema REGISTRA a
// retirada, NÃO movimenta dinheiro. §2.8: claimRecipientRef já vem mascarado; nenhum UUID de ator é exibido.
const introStyle: CSSProperties = { fontSize: 13, color: "#475569", margin: "0 0 10px" };
const prazoRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 16, margin: "0 0 12px" };
const prazoLabel: CSSProperties = { fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" };
const prazoValue: CSSProperties = { fontSize: 14, color: "#0F172A" };
const actionRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const hintStyle: CSSProperties = { fontSize: 12, color: "#94A3B8", margin: "6px 0 0" };

export function SaldoCiclo({
  settlement,
  canTransition,
  busy,
  error,
  onClaim,
  onRevert,
}: {
  readonly settlement: SettlementDto;
  readonly canTransition: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onClaim: (recipientRef: string) => void;
  readonly onRevert: () => void;
}) {
  const [confirm, setConfirm] = useState<"claim" | "revert" | null>(null);
  const [recipientRef, setRecipientRef] = useState("");

  const currency = settlement.currency || "BRL";
  const balance = hasOwnerBalance(settlement);
  const expired = isClaimWindowExpired(settlement);
  const claimEnabled = canClaimBalance(settlement);
  const revertEnabled = canRevertToFunset(settlement);

  // Desfecho terminal (14b): o saldo já foi reclamado ou revertido — sem ações.
  if (settlement.status === "BALANCE_CLAIMED") {
    return (
      <Card title="Saldo ao proprietário">
        <Alert title="Saldo retirado pelo proprietário" tone="info">
          Retirada registrada em {formatDateTime(settlement.claimedAt)}
          {settlement.claimRecipientRef ? ` · recebedor ${settlement.claimRecipientRef}` : ""}. Registro do ato — sem
          movimentação financeira pelo sistema.
        </Alert>
      </Card>
    );
  }
  if (settlement.status === "BALANCE_REVERTED_FUNSET") {
    return (
      <Card title="Saldo ao proprietário">
        <Alert title="Saldo revertido ao Funset" tone="info">
          Reversão registrada em {formatDateTime(settlement.revertedAt)} (prazo de reclamação encerrado, §12).
        </Alert>
      </Card>
    );
  }

  // DISTRIBUTED sem saldo: a cascata consumiu todo o arremate — não há ciclo a conduzir.
  if (!balance) {
    return (
      <Card title="Saldo ao proprietário">
        <EmptyState
          title="Sem saldo ao proprietário"
          detail="A cascata consumiu todo o valor arrematado; não há resíduo a restituir ao proprietário."
        />
      </Card>
    );
  }

  return (
    <Card title="Saldo ao proprietário">
      {error ? (
        <Alert title="Não foi possível concluir" tone="danger">
          {error}
        </Alert>
      ) : null}

      <p style={introStyle}>
        Há saldo de {formatMoney(settlement.ownerBalanceAmount, currency)} a restituir ao proprietário (§12). O
        pagamento é presencial: o sistema apenas REGISTRA a retirada. Após o prazo de reclamação, o saldo reverte ao
        Funset.
      </p>

      <div style={prazoRow}>
        <div>
          <span style={prazoLabel}>
            <CalendarClock size={11} aria-hidden style={{ verticalAlign: "-1px", marginRight: 3 }} /> Notificar até
          </span>
          <div style={prazoValue}>{formatDateTime(settlement.ownerNotifyDueAt)}</div>
        </div>
        <div>
          <span style={prazoLabel}>
            <CalendarClock size={11} aria-hidden style={{ verticalAlign: "-1px", marginRight: 3 }} /> Reclamar até
          </span>
          <div style={prazoValue}>{formatDateTime(settlement.ownerClaimExpiresAt)}</div>
        </div>
      </div>

      {canTransition ? (
        <div style={actionRow}>
          <Button type="button" onClick={() => setConfirm("claim")} disabled={busy || !claimEnabled} aria-label="Registrar retirada do saldo pelo proprietário">
            <HandCoins size={15} aria-hidden /> Registrar retirada do saldo
          </Button>
          <Button type="button" variant="secondary" onClick={() => setConfirm("revert")} disabled={busy || !revertEnabled} aria-label="Reverter saldo ao Funset">
            <Landmark size={15} aria-hidden /> Reverter saldo ao Funset
          </Button>
        </div>
      ) : (
        <EmptyState title="Somente leitura" detail="Você não tem permissão para conduzir o ciclo do saldo desta liquidação." />
      )}

      {canTransition ? (
        <p style={hintStyle}>
          {expired
            ? "Prazo de reclamação encerrado: a retirada pelo proprietário não está mais disponível; o saldo pode reverter ao Funset."
            : "Dentro do prazo de reclamação: a reversão ao Funset só fica disponível após o prazo."}
        </p>
      ) : null}

      {confirm === "claim" ? (
        <div className="ui-overlay ui-overlay--center" role="presentation">
          <section className="ui-modal" role="dialog" aria-modal="true" aria-label="Registrar retirada do saldo">
            <header>
              <h2>Registrar retirada do saldo</h2>
              <button type="button" onClick={() => setConfirm(null)} aria-label="Fechar">
                ×
              </button>
            </header>
            <p style={{ fontSize: 14, color: "#334155" }}>
              Confirma o registro da retirada de {formatMoney(settlement.ownerBalanceAmount, currency)} pelo
              proprietário? O pagamento é presencial — o sistema REGISTRA o ato, sem movimentar dinheiro.
            </p>
            <Input
              label="Referência de quem recebe (opcional)"
              value={recipientRef}
              onChange={(event) => setRecipientRef(event.target.value)}
              maxLength={200}
              helper="Rótulo minimizado (ex.: iniciais + sufixo de documento) — não dados pessoais completos."
            />
            <footer style={footerStyle}>
              <Button type="button" variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirm(null);
                  onClaim(recipientRef.trim());
                }}
              >
                {busy ? "Processando…" : "Confirmar retirada"}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}

      {confirm === "revert" ? (
        <div className="ui-overlay ui-overlay--center" role="presentation">
          <section className="ui-modal" role="dialog" aria-modal="true" aria-label="Reverter saldo ao Funset">
            <header>
              <h2>Reverter saldo ao Funset</h2>
              <button type="button" onClick={() => setConfirm(null)} aria-label="Fechar">
                ×
              </button>
            </header>
            <p style={{ fontSize: 14, color: "#334155" }}>
              Confirma a reversão de {formatMoney(settlement.ownerBalanceAmount, currency)} ao Funset (§12)? O prazo de
              reclamação pelo proprietário está encerrado. Este ato é definitivo.
            </p>
            <footer style={footerStyle}>
              <Button type="button" variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={busy}
                onClick={() => {
                  setConfirm(null);
                  onRevert();
                }}
              >
                {busy ? "Processando…" : "Confirmar reversão"}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </Card>
  );
}

export default SaldoCiclo;
