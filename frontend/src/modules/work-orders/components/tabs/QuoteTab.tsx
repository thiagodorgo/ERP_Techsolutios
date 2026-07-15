import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Share2 } from "lucide-react";

import {
  formatMoney,
  formatServiceQuoteDate,
  getServiceQuoteStatusLabel,
  getServiceQuoteStatusTone,
} from "../../../registry/service-quotes/service-quotes.adapter";
import {
  approveServiceQuote,
  listServiceQuoteItems,
  listServiceQuotesFromApi,
  shareServiceQuote,
} from "../../../registry/service-quotes/service-quotes.service";
import type {
  ServiceQuoteApproveResult,
  ServiceQuoteLineList,
  ServiceQuoteRow,
  ServiceQuotesApiContext,
} from "../../../registry/service-quotes/service-quotes.types";
import { ApiError } from "../../../../services/api/client";

// Ω3F-4c — aba "Orçamento" do Hub da OS (espelho do FinancialTab). Lista os orçamentos DA OS (filtro por
// work_order_id), cada um com número/situação/validade/total (do BACKEND, o front nunca soma) e suas
// linhas. Ações gated: Aprovar (draft + service_quotes:approve → cria OS) e Compartilhar
// (service_quotes:update → link). Estados §7: loading/erro/vazio. "Acesso não permitido" fica no shell.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const th: CSSProperties = { fontSize: 11.5, color: "#94A3B8", fontWeight: 700, textAlign: "left", padding: "8px 12px", textTransform: "uppercase", letterSpacing: ".3px" };
const td: CSSProperties = { fontSize: 12.5, color: "#0F172A", padding: "9px 12px", borderTop: "1px solid #F1F5F9", verticalAlign: "middle" };
const primaryBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" };
const ghostBtn: CSSProperties = { ...primaryBtn, background: "#fff", color: "#2563EB", border: "1px solid #BFDBFE" };

const TONE_STYLE: Record<string, { color: string; background: string }> = {
  info: { color: "#2563EB", background: "#EFF6FF" },
  success: { color: "#16A34A", background: "#F0FDF4" },
  danger: { color: "#DC2626", background: "#FEF2F2" },
  default: { color: "#475569", background: "#F1F5F9" },
};

function messageForError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return "Não foi possível concluir: o orçamento pode estar vencido ou sem itens.";
    if (err.status === 409) return "O orçamento já foi aprovado ou não está em situação aprovável.";
    if (err.status === 404) return "Orçamento não encontrado.";
    return err.safeMessage;
  }
  return fallback;
}

export function QuoteTab({
  workOrderId,
  context,
  permissions,
}: {
  workOrderId: string;
  context: ServiceQuotesApiContext;
  permissions: readonly string[];
}) {
  const [quotes, setQuotes] = useState<ServiceQuoteRow[] | null>(null);
  const [itemsByQuote, setItemsByQuote] = useState<Record<string, ServiceQuoteLineList>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approvedByQuote, setApprovedByQuote] = useState<Record<string, string>>({});
  const [sharedByQuote, setSharedByQuote] = useState<Record<string, string>>({});

  const canApprove = permissions.includes("service_quotes:approve");
  const canShare = permissions.includes("service_quotes:update");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listServiceQuotesFromApi(context, { workOrderId });
      setQuotes(data.items);
      // Carrega as linhas de cada orçamento em paralelo (total agregado do backend).
      const entries = await Promise.all(
        data.items.map(async (quote) => {
          try {
            return [quote.id, await listServiceQuoteItems(context, quote.id)] as const;
          } catch {
            return [quote.id, { items: [], totalAmount: 0, currency: quote.frozenCurrency } as ServiceQuoteLineList] as const;
          }
        }),
      );
      setItemsByQuote(Object.fromEntries(entries));
    } catch {
      setError("Não foi possível carregar os orçamentos desta ordem de serviço.");
    } finally {
      setLoading(false);
    }
  }, [context, workOrderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (quote: ServiceQuoteRow) => {
    setBusyId(quote.id);
    setActionError(null);
    try {
      const result: ServiceQuoteApproveResult = await approveServiceQuote(context, quote.id, {});
      if (result.workOrderId) setApprovedByQuote((prev) => ({ ...prev, [quote.id]: result.workOrderId! }));
      await load();
    } catch (err) {
      setActionError(messageForError(err, "Não foi possível aprovar o orçamento."));
    } finally {
      setBusyId(null);
    }
  };

  const share = async (quote: ServiceQuoteRow) => {
    setBusyId(quote.id);
    setActionError(null);
    try {
      const result = await shareServiceQuote(context, quote.id);
      if (result.sharePath) setSharedByQuote((prev) => ({ ...prev, [quote.id]: result.sharePath! }));
      else setActionError("O orçamento não retornou um link de compartilhamento.");
    } catch (err) {
      setActionError(messageForError(err, "Não foi possível compartilhar o orçamento."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Orçamentos da OS</div>
        <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>Documentos de preço congelado vinculados a esta ordem de serviço. O total vem do backend.</div>
      </div>

      {error ? (
        <div style={{ ...card, padding: "12px 16px", background: "#FEF2F2", borderColor: "#FECACA", fontSize: 12.5, color: "#B91C1C" }}>{error}</div>
      ) : null}

      {actionError ? (
        <div style={{ ...card, padding: "12px 16px", background: "#FEF2F2", borderColor: "#FECACA", fontSize: 12.5, color: "#B91C1C" }}>{actionError}</div>
      ) : null}

      {loading ? (
        <div style={{ ...card, padding: 20, fontSize: 13, color: "#94A3B8" }}>Carregando orçamentos…</div>
      ) : !quotes || quotes.length === 0 ? (
        <div style={{ ...card, padding: "28px 20px", textAlign: "center", borderStyle: "dashed" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>Nenhum orçamento para esta OS</div>
          <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>Crie um orçamento e vincule-o a esta ordem de serviço para vê-lo aqui.</div>
        </div>
      ) : (
        quotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            items={itemsByQuote[quote.id] ?? null}
            canApprove={canApprove}
            canShare={canShare}
            busy={busyId === quote.id}
            approvedWorkOrderId={approvedByQuote[quote.id] ?? quote.createdWorkOrderId ?? null}
            sharePath={sharedByQuote[quote.id] ?? null}
            onApprove={() => void approve(quote)}
            onShare={() => void share(quote)}
          />
        ))
      )}
    </div>
  );
}

export function QuoteCard({
  quote,
  items,
  canApprove,
  canShare,
  busy,
  approvedWorkOrderId,
  sharePath,
  onApprove,
  onShare,
}: {
  quote: ServiceQuoteRow;
  items: ServiceQuoteLineList | null;
  canApprove: boolean;
  canShare: boolean;
  busy: boolean;
  approvedWorkOrderId: string | null;
  sharePath: string | null;
  onApprove: () => void;
  onShare: () => void;
}) {
  const tone = TONE_STYLE[getServiceQuoteStatusTone(quote.status)] ?? TONE_STYLE.default;
  // §11.2 (cognicao J-Ω3F-4C) — sem andaime técnico: quando o backend não traz número, rótulo de negócio
  // neutro (nunca fragmento de UUID cru, nem no hover).
  const title = quote.number ?? "Orçamento sem número";
  const lineItems = items?.items ?? [];
  const [copied, setCopied] = useState(false);

  return (
    <div style={{ ...card, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14.5, fontWeight: 800 }}>{title}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: tone.color, background: tone.background }}>
              {getServiceQuoteStatusLabel(quote.status)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
            Validade: {formatServiceQuoteDate(quote.validUntil)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>Total</div>
          <div style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatMoney(quote.frozenTotal, quote.frozenCurrency)}</div>
        </div>
      </div>

      {lineItems.length > 0 ? (
        <div style={{ marginTop: 14, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr>
                <th style={th}>Descrição</th>
                <th style={{ ...th, textAlign: "right" }}>Qtd</th>
                <th style={{ ...th, textAlign: "right" }}>Valor unit.</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{item.description}</div>
                    {item.notes ? <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{item.notes}</div> : null}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{item.quantity}</td>
                  <td style={{ ...td, textAlign: "right" }}>{formatMoney(item.unitAmount, item.currency)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{formatMoney(item.totalAmount, item.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...td, fontWeight: 800 }} colSpan={3}>Total do orçamento</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{formatMoney(items?.totalAmount ?? 0, items?.currency ?? quote.frozenCurrency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 12, color: "#94A3B8" }}>Este orçamento não tem linhas de item.</div>
      )}

      {approvedWorkOrderId ? (
        <div style={{ marginTop: 14, padding: "10px 13px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 9, fontSize: 12.5, color: "#166534" }}>
          OS gerada a partir deste orçamento: <a href={`/work-orders/${approvedWorkOrderId}`} style={{ color: "#15803D", fontWeight: 700 }}>abrir OS</a>
        </div>
      ) : null}

      {sharePath ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>Link de compartilhamento</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input readOnly value={sharePath} style={{ flex: 1, minWidth: 220, padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit" }} />
            <button
              type="button"
              style={ghostBtn}
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  void navigator.clipboard.writeText(sharePath);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }
              }}
            >
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          </div>
        </div>
      ) : null}

      {(canApprove && quote.status === "draft") || canShare ? (
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {canApprove && quote.status === "draft" ? (
            <button type="button" style={primaryBtn} disabled={busy} onClick={onApprove}>
              <BadgeCheck size={15} aria-hidden /> Aprovar
            </button>
          ) : null}
          {canShare ? (
            <button type="button" style={ghostBtn} disabled={busy} onClick={onShare}>
              <Share2 size={15} aria-hidden /> Compartilhar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default QuoteTab;
