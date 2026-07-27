import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Input, Modal, Select } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { adjustableLines, formatMoney, getLinePrimaryLabel, normalizeMoneyInput } from "../charges.adapter";
import { createCharge } from "../charges.service";
import type { ChargeCreateInput, ChargeLine, ChargesApiContext, ManualChargeKind } from "../charges.types";

// Lançamento manual de encargo (charging:create). SÓ ADDITIONAL | ADJUSTMENT — DAILY é PRIVATIVA do motor (o
// seletor nem a oferece; o backend recusaria com 422 daily_is_engine_only). ADJUSTMENT = correção append-only
// (RN-DIA-05): delta ASSINADO + encargo-alvo obrigatório. §2.8: o alvo é escolhido por rótulo+valor, nunca UUID cru.
const footerStyle = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" } as const;

// Opções do seletor de tipo — a ORDEM/valores espelham ManualChargeKind. DAILY/REMOVAL ausentes por decisão.
export const MANUAL_CHARGE_OPTIONS: readonly { value: ManualChargeKind; label: string }[] = [
  { value: "ADDITIONAL", label: "Adicional (guincho especial, içamento, etc.)" },
  { value: "ADJUSTMENT", label: "Ajuste (correção retroativa)" },
];

export function LancamentoChargeModal({
  processId,
  lines,
  currency,
  context,
  onClose,
  onDone,
}: {
  readonly processId: string;
  readonly lines: readonly ChargeLine[];
  readonly currency: string;
  readonly context: ChargesApiContext;
  readonly onClose: () => void;
  readonly onDone: () => void;
}) {
  const [kind, setKind] = useState<ManualChargeKind>("ADDITIONAL");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitValue, setUnitValue] = useState("");
  const [adjustmentTarget, setAdjustmentTarget] = useState("");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Só encargos NÃO-ADJUSTMENT podem ser corrigidos (o backend recusa ajuste-de-ajuste).
  const targets = useMemo(() => adjustableLines(lines), [lines]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return; // B1 — guarda de reentrância (belt-and-suspenders sobre o disabled): blinda duplo-clique.
    setError(null);

    if (!description.trim()) {
      setError("Descreva o encargo (fica registrado na cadeia de eventos).");
      return;
    }

    const input = buildInput(kind, { description, quantity, unitValue, adjustmentTarget, adjustmentValue, currency });
    if (typeof input === "string") {
      setError(input);
      return;
    }

    setSaving(true);
    try {
      await createCharge(context, processId, input);
      onDone();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Lançar encargo manual" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {error ? (
          <Alert title="Não foi possível lançar" tone="danger">
            {error}
          </Alert>
        ) : null}

        <Select label="Tipo de encargo *" value={kind} onChange={(event) => setKind(event.target.value as ManualChargeKind)} required>
          {MANUAL_CHARGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Input label="Descrição *" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={280} required />

        {kind === "ADDITIONAL" ? (
          <>
            <Input label="Quantidade *" value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" required />
            <Input
              label="Valor unitário (R$) *"
              value={unitValue}
              onChange={(event) => setUnitValue(event.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              required
            />
          </>
        ) : (
          <>
            <Select label="Encargo a corrigir *" value={adjustmentTarget} onChange={(event) => setAdjustmentTarget(event.target.value)} required>
              <option value="">Selecione o encargo…</option>
              {targets.map((line) => (
                <option key={line.id} value={line.id}>
                  {getLinePrimaryLabel(line)} · {formatMoney(line.totalAmount, line.currency)}
                </option>
              ))}
            </Select>
            <Input
              label="Valor do ajuste (R$) *"
              value={adjustmentValue}
              onChange={(event) => setAdjustmentValue(event.target.value)}
              inputMode="decimal"
              placeholder="-0,00"
              helper="Use valor negativo para estorno/redução. A correção é registrada como novo lançamento (sem apagar o original)."
              required
            />
          </>
        )}

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Registrando…" : "Registrar encargo"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

type RawForm = {
  readonly description: string;
  readonly quantity: string;
  readonly unitValue: string;
  readonly adjustmentTarget: string;
  readonly adjustmentValue: string;
  readonly currency: string;
};

// Constrói e VALIDA o input (retorna string com a mensagem de erro quando inválido). Dinheiro sempre canônico.
export function buildInput(kind: ManualChargeKind, form: RawForm): ChargeCreateInput | string {
  const description = form.description.trim();

  if (kind === "ADJUSTMENT") {
    if (!form.adjustmentTarget) return "Selecione o encargo a corrigir.";
    const delta = normalizeMoneyInput(form.adjustmentValue, true);
    if (delta === null) return "Informe um valor de ajuste válido (ex.: -50,00).";
    if (Number(delta) === 0) return "O valor do ajuste não pode ser zero.";
    const magnitude = Math.abs(Number(delta)).toFixed(2);
    return {
      kind,
      description,
      adjustmentOfChargeId: form.adjustmentTarget,
      totalAmount: delta, // assinado (delta de correção)
      unitAmount: magnitude, // magnitude (>= 0, exigida pelo CHECK do ledger)
      quantity: "1",
      currency: form.currency,
    };
  }

  const quantity = normalizeMoneyInput(form.quantity);
  if (quantity === null || Number(quantity) <= 0) return "Informe uma quantidade válida (maior que zero).";
  const unitAmount = normalizeMoneyInput(form.unitValue);
  if (unitAmount === null) return "Informe um valor unitário válido (ex.: 150,00).";
  return { kind, description, quantity, unitAmount, currency: form.currency };
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return "Lançamento não permitido: verifique o tipo, o valor e (no ajuste) o encargo de destino.";
    if (err.status === 409) return "Conflito ao registrar o encargo. Recarregue a guia e tente novamente.";
    return err.safeMessage;
  }
  return err instanceof Error ? err.message : "Não foi possível registrar o encargo.";
}

export default LancamentoChargeModal;
