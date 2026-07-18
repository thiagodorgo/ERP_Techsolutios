import type { CSSProperties } from "react";
import { useState } from "react";

import { ApiError } from "../../../../services/api/client";
import { createFinancialTitle } from "../financial-titles.service";
import type { FinancialTitleDirection, FinancialTitlesApiContext } from "../financial-titles.types";

// Ω4-2b — modal de criação de Título. direction é FIXADO pela tela (Cobranças→receivable, Pagamentos→
// payable); party_type é derivado da direction (customer/supplier). Validação client-side espelha o backend
// (party_name/amount/due_date obrigatórios; amount > 0); os erros do backend (400/422) aparecem no modal.

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.45)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "48px 16px",
  zIndex: 60,
  overflowY: "auto",
};

const card: CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  width: "100%",
  maxWidth: 520,
  boxShadow: "0 24px 60px rgba(15,23,42,.24)",
  overflow: "hidden",
};

const label: CSSProperties = { fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5, display: "block" };
const input: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #E2E8F0",
  borderRadius: 9,
  fontSize: 13,
  color: "#0F172A",
  fontFamily: "inherit",
  boxSizing: "border-box",
  background: "#fff",
};

type Copy = { title: string; subtitle: string; partyLabel: string; submit: string };

const COPY: Record<FinancialTitleDirection, Copy> = {
  receivable: {
    title: "Nova cobrança",
    subtitle: "título a receber de um cliente",
    partyLabel: "Cliente",
    submit: "Criar cobrança",
  },
  payable: {
    title: "Agendar pagamento",
    subtitle: "título a pagar a um fornecedor",
    partyLabel: "Fornecedor",
    submit: "Agendar pagamento",
  },
};

export function TitleFormModal({
  direction,
  context,
  onClose,
  onSaved,
}: {
  direction: FinancialTitleDirection;
  context: FinancialTitlesApiContext;
  onClose: () => void;
  onSaved: () => void;
}) {
  const copy = COPY[direction];
  const [partyName, setPartyName] = useState("");
  const [documentValue, setDocumentValue] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string[] => {
    const found: string[] = [];
    if (!partyName.trim()) found.push(`${copy.partyLabel} é obrigatório.`);
    const parsedAmount = Number(amount.replace(",", "."));
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) found.push("Informe um valor maior que zero.");
    if (!dueDate.trim() || Number.isNaN(Date.parse(dueDate))) found.push("Informe uma data de vencimento válida.");
    return found;
  };

  const handleSubmit = async () => {
    const found = validate();
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setSubmitting(true);
    setErrors([]);
    try {
      await createFinancialTitle(context, {
        direction,
        party_type: direction === "receivable" ? "customer" : "supplier",
        party_name: partyName.trim(),
        document: documentValue.trim() || undefined,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        amount: Number(amount.replace(",", ".")),
        due_date: new Date(dueDate).toISOString(),
      });
      onSaved();
    } catch (error) {
      const message = error instanceof ApiError ? error.safeMessage : "Não foi possível salvar. Tente novamente.";
      setErrors([message]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label={copy.title} onClick={onClose}>
      <div style={card} onClick={(event) => event.stopPropagation()}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", letterSpacing: "-.2px" }}>{copy.title}</div>
          <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>{copy.subtitle}</div>
        </div>

        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {errors.length > 0 ? (
            <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, padding: "10px 12px" }}>
              {errors.map((message) => (
                <div key={message} style={{ fontSize: 12, color: "#B91C1C", fontWeight: 600 }}>
                  {message}
                </div>
              ))}
            </div>
          ) : null}

          <div>
            <label style={label} htmlFor="title-party-name">
              {copy.partyLabel} *
            </label>
            <input
              id="title-party-name"
              style={input}
              value={partyName}
              onChange={(event) => setPartyName(event.target.value)}
              placeholder={direction === "receivable" ? "Nome do cliente" : "Nome do fornecedor"}
              maxLength={160}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label} htmlFor="title-document">
                Documento
              </label>
              <input
                id="title-document"
                style={input}
                value={documentValue}
                onChange={(event) => setDocumentValue(event.target.value)}
                placeholder="CNPJ/CPF"
                maxLength={60}
              />
            </div>
            <div>
              <label style={label} htmlFor="title-category">
                Categoria
              </label>
              <input
                id="title-category"
                style={input}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Ex.: Serviços"
                maxLength={80}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label} htmlFor="title-amount">
                Valor (R$) *
              </label>
              <input
                id="title-amount"
                style={input}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <div>
              <label style={label} htmlFor="title-due-date">
                Vencimento *
              </label>
              <input
                id="title-due-date"
                type="date"
                style={input}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={label} htmlFor="title-description">
              Descrição
            </label>
            <textarea
              id="title-description"
              style={{ ...input, minHeight: 72, resize: "vertical" }}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Detalhes do título (opcional)"
              maxLength={2000}
            />
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ padding: "9px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{ padding: "9px 16px", background: submitting ? "#93C5FD" : "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: submitting ? "default" : "pointer", fontFamily: "inherit" }}
          >
            {submitting ? "Salvando…" : copy.submit}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TitleFormModal;
