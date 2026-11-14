import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert } from "../../../../components/ui";
import { formatDueDate, getTitleStatusLabel, getTitleStatusTone } from "../../../finance/titles/financial-titles.adapter";
import {
  createManualFinancialItem,
  createTariffFinancialItem,
  deleteFinancialItem,
  formatMoney,
  getWorkOrderInvoiceTitle,
  listWorkOrderFinancials,
  patchFinancialItem,
} from "../../financials.service";
import type {
  WorkOrderFinancialApiContext,
  WorkOrderFinancialItem,
  WorkOrderFinancialList,
  WorkOrderInvoiceResult,
  WorkOrderInvoiceTitle,
} from "../../financials.types";
import {
  invoiceActionState,
  invoiceOutcomeCancelsWorkOrder,
  invoiceResultNotice,
  type InvoiceNotice,
  type InvoiceOutcome,
} from "../../work-order-invoice.model";
import type { WorkOrderStatus } from "../../work-orders.types";
import { listServiceCatalogFromApi } from "../../../registry/service-catalog/service-catalog.service";
import type { ServiceItem } from "../../../registry/service-catalog/service-catalog.types";
import { InvoiceWorkOrderDialog, type InvoiceShown } from "../InvoiceWorkOrderDialog";

// Ω3F-3b — aba "Financeiro" do Hub da OS (spec §1.3 / §1.1 0:24–1:08): itens da tabela de valores
// (valor CONGELADO no lançamento, anti-refaturamento) + item avulso ("+", ex.: pedágio) + edição
// inline + TOTAL automático (somado no BACKEND — o front nunca soma). Estados §7: loading/erro/vazio;
// "acesso não permitido" é tratado pelo shell (a aba exige work_order_financials:read).
// B-SAN3-25 (item 50) — a aba fatura a OS: botão "Faturar OS" (só com financial_titles:create, item pendente que vale mais
// que zero e OS não cancelada), diálogo de confirmação, aviso com o valor que o SERVIDOR faturou (e a divergência, se houver), chip
// "Faturado" sem editar nem excluir, e o quadro "Títulos desta OS". A recusa vira a frase da lista fechada do modelo.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const th: CSSProperties = { fontSize: 11.5, color: "#94A3B8", fontWeight: 700, textAlign: "left", padding: "10px 14px", textTransform: "uppercase", letterSpacing: ".3px" };
const td: CSSProperties = { fontSize: 13, color: "#0F172A", padding: "12px 14px", borderTop: "1px solid #F1F5F9", verticalAlign: "middle" };
const input: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
const iconBtn: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", cursor: "pointer" };
const primaryBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" };
const pill: CSSProperties = { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap" };
// O tom do "Pago" do Financeiro, pelo adaptador (J-559, C3-A4: sem o par de cores escrito à mão aqui).
const paidTone = getTitleStatusTone("paid");
const invoicedPill: CSSProperties = { ...pill, background: paidTone.bg, color: paidTone.color };
const errorBox: CSSProperties = { marginTop: 14, padding: "10px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, color: "#B91C1C" };

type TitleRow =
  | { readonly kind: "loaded"; readonly title: WorkOrderInvoiceTitle }
  | { readonly kind: "removed" | "failed"; readonly id: string };

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { readonly status?: unknown }).status === 404;
}

type EditState = { readonly quantity: string; readonly unitAmount: string; readonly notes: string };
type ManualState = { readonly description: string; readonly unitAmount: string; readonly quantity: string; readonly notes: string };
type TariffState = { readonly serviceCatalogId: string; readonly quantity: string; readonly notes: string };
const EMPTY_MANUAL: ManualState = { description: "", unitAmount: "", quantity: "1", notes: "" };
const EMPTY_TARIFF: TariffState = { serviceCatalogId: "", quantity: "1", notes: "" };

export function FinancialTab({
  workOrderId,
  workOrderStatus,
  workOrderCode,
  workOrderTitle,
  context,
  permissions,
  initialData,
}: {
  workOrderId: string;
  // B-SAN3-25 — a situação da OS (o botão some na cancelada) e o código e o título para o subtítulo do diálogo (E2.2).
  workOrderStatus?: WorkOrderStatus;
  workOrderCode?: string;
  workOrderTitle?: string;
  context: WorkOrderFinancialApiContext;
  permissions: readonly string[];
  // Lista já conhecida (teste, SSR). Sem ela, a aba lê do servidor ao abrir.
  initialData?: WorkOrderFinancialList;
}) {
  const [data, setData] = useState<WorkOrderFinancialList | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState>({ quantity: "", unitAmount: "", notes: "" });
  const [adding, setAdding] = useState(false);
  const [manual, setManual] = useState<ManualState>(EMPTY_MANUAL);
  // Lançamento a partir da TABELA DE VALORES do cliente (capacidade #6): escolhe um serviço do catálogo
  // → o backend resolve a tarifa vigente do cliente e CONGELA o valor (anti-refaturamento).
  const [addingTariff, setAddingTariff] = useState(false);
  const [tariff, setTariff] = useState<TariffState>(EMPTY_TARIFF);
  const [services, setServices] = useState<readonly ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // B-SAN3-25 — faturamento e títulos da OS.
  const [invoicing, setInvoicing] = useState(false);
  const [notice, setNotice] = useState<InvoiceNotice | null>(null);
  const [invoiceMessage, setInvoiceMessage] = useState<string | null>(null);
  const [titles, setTitles] = useState<readonly TitleRow[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(false);
  // J-559 (C3-A2) — a OS que o servidor disse estar cancelada (422 `work_order_cancelled`) depois que a página a leu: o
  // botão some até a página reler a OS. Guardado com o id, para não valer para outra OS aberta na mesma aba.
  const [cancelledByServerId, setCancelledByServerId] = useState<string | null>(null);

  const canCreate = permissions.includes("work_order_financials:create");
  const canUpdate = permissions.includes("work_order_financials:update");
  const canReadTitles = permissions.includes("financial_titles:read");
  // A guarda da rota do Financeiro (`App.tsx`, `/finance`): basta uma das duas.
  const canOpenFinance = permissions.includes("financial_entries:read") || permissions.includes("finance:read");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listWorkOrderFinancials(context, workOrderId));
    } catch {
      setError("Não foi possível carregar os itens financeiros desta OS.");
    } finally {
      setLoading(false);
    }
  }, [context, workOrderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (item: WorkOrderFinancialItem) => {
    setEditingId(item.id);
    setEdit({ quantity: String(item.quantity), unitAmount: String(item.unitAmount), notes: item.notes ?? "" });
  };

  const saveEdit = async (item: WorkOrderFinancialItem) => {
    setBusy(true);
    setError(null);
    try {
      await patchFinancialItem(context, workOrderId, item.id, {
        quantity: Number(edit.quantity),
        // Valor unitário só é editável em item MANUAL (tarifa é congelada — backend rejeita).
        unitAmount: item.source === "manual" ? Number(edit.unitAmount) : undefined,
        notes: edit.notes,
      });
      setEditingId(null);
      await load();
    } catch {
      setError("Não foi possível salvar a alteração do item.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: WorkOrderFinancialItem) => {
    setBusy(true);
    setError(null);
    try {
      await deleteFinancialItem(context, workOrderId, item.id);
      await load();
    } catch {
      setError("Não foi possível excluir o item.");
    } finally {
      setBusy(false);
    }
  };

  const addManual = async () => {
    if (!manual.description.trim() || !Number.isFinite(Number(manual.unitAmount))) {
      setError("Informe a descrição e o valor unitário do item avulso.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createManualFinancialItem(context, workOrderId, {
        description: manual.description,
        unitAmount: Number(manual.unitAmount),
        quantity: Number(manual.quantity) || 1,
        notes: manual.notes,
      });
      setManual(EMPTY_MANUAL);
      setAdding(false);
      await load();
    } catch {
      setError("Não foi possível lançar o item avulso.");
    } finally {
      setBusy(false);
    }
  };

  const openTariffForm = async () => {
    const next = !addingTariff;
    setAddingTariff(next);
    setAdding(false);
    if (next && services.length === 0) {
      setServicesLoading(true);
      try {
        const catalog = await listServiceCatalogFromApi(context, { isActive: "active" });
        setServices(catalog.items);
      } catch {
        setError("Não foi possível carregar o catálogo de serviços.");
      } finally {
        setServicesLoading(false);
      }
    }
  };

  const addTariff = async () => {
    if (!tariff.serviceCatalogId) {
      setError("Selecione um serviço da tabela de valores.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createTariffFinancialItem(context, workOrderId, {
        serviceCatalogId: tariff.serviceCatalogId,
        quantity: Number(tariff.quantity) || 1,
        notes: tariff.notes,
      });
      setTariff(EMPTY_TARIFF);
      setAddingTariff(false);
      await load();
    } catch {
      // O backend recusa (422) quando o serviço não tem tarifa vigente na tabela do cliente.
      setError("Não foi possível lançar o serviço: verifique se há tarifa vigente na tabela de valores deste cliente.");
    } finally {
      setBusy(false);
    }
  };

  // ---------- B-SAN3-25 — faturar ----------

  const openInvoice = () => {
    setNotice(null);
    setInvoiceMessage(null);
    setInvoicing(true);
  };

  const handleInvoiced = async (result: WorkOrderInvoiceResult, shown: InvoiceShown) => {
    setInvoicing(false);
    setNotice(
      invoiceResultNotice(shown, {
        invoicedTotal: result.invoicedTotal,
        currency: result.currency,
        invoicedItemCount: result.invoicedItemCount,
        parentTitleId: result.title.parentTitleId,
      }),
    );
    await load();
  };

  const handleInvoiceFailed = (outcome: InvoiceOutcome) => {
    setInvoicing(false);
    setInvoiceMessage(outcome.message);
    if (invoiceOutcomeCancelsWorkOrder(outcome)) setCancelledByServerId(workOrderId);
    if (outcome.reload) void load();
  };

  const items = data?.items ?? [];
  const currency = data?.currency ?? "BRL";
  const effectiveStatus: WorkOrderStatus | undefined = cancelledByServerId === workOrderId ? "cancelled" : workOrderStatus;
  const invoiceAction = data ? invoiceActionState(data, permissions, effectiveStatus) : null;

  // ---------- B-SAN3-25 — títulos desta OS: uma leitura por título distinto ----------
  const titleKey = useMemo(() => [...new Set(items.map((item) => item.titleId).filter((id): id is string => id !== null))].join("|"), [items]);

  useEffect(() => {
    if (!canReadTitles || titleKey === "") {
      setTitles((current) => (current.length === 0 ? current : []));
      setTitlesLoading(false);
      return;
    }
    let cancelled = false;
    setTitlesLoading(true);
    void Promise.all(
      titleKey.split("|").map(async (id): Promise<TitleRow> => {
        try {
          const title = await getWorkOrderInvoiceTitle(context, id);
          // J-559 (C3-A1) — o servidor devolve o título apagado com 200 e `active: false`, e não com 404.
          return title.active ? { kind: "loaded", title } : { kind: "removed", id };
        } catch (error) {
          return { kind: isNotFoundError(error) ? "removed" : "failed", id };
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      setTitles(rows);
      setTitlesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canReadTitles, context, titleKey]);

  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Itens financeiros</div>
          <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>Serviços da tabela de valores do cliente (valor congelado no lançamento) e itens avulsos.</div>
        </div>
        {canCreate || invoiceAction?.visible ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {invoiceAction?.visible ? (
              <button type="button" style={primaryBtn} disabled={busy || loading || invoicing} onClick={openInvoice}>
                <Receipt size={16} /> Faturar OS
              </button>
            ) : null}
            {canCreate ? (
              <>
                <button type="button" style={primaryBtn} disabled={busy} onClick={() => void openTariffForm()}>
                  <Plus size={16} /> Lançar da tabela
                </button>
                <button type="button" style={{ ...primaryBtn, background: "#fff", color: "#2563EB", border: "1px solid #BFDBFE" }} disabled={busy} onClick={() => { setAdding((v) => !v); setAddingTariff(false); }}>
                  <Plus size={16} /> Item avulso
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <div style={errorBox}>{error}</div>
      ) : null}

      {/* B-SAN3-25 — o desfecho do faturamento. Sucesso: o valor que o SERVIDOR faturou; se ele difere do que a
          confirmação mostrou, a frase de divergência (R-DIVERGE). Recusa: a frase da lista fechada do modelo. */}
      {notice ? (
        <div role="status" style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <Alert title="Faturamento concluído" tone="info">{notice.message}</Alert>
          {notice.divergence ? <Alert title="Confira os valores" tone="warning">{notice.divergence}</Alert> : null}
        </div>
      ) : null}
      {invoiceMessage ? (
        <div role="alert" style={errorBox}>{invoiceMessage}</div>
      ) : null}

      {invoicing && invoiceAction ? (
        <InvoiceWorkOrderDialog
          context={context}
          workOrderId={workOrderId}
          workOrderCode={workOrderCode}
          workOrderTitle={workOrderTitle}
          pendingItems={invoiceAction.pendingItems}
          originalAmount={invoiceAction.originalAmount}
          currency={currency}
          onInvoiced={(result, shown) => void handleInvoiced(result, shown)}
          onFailed={handleInvoiceFailed}
          onClose={() => setInvoicing(false)}
        />
      ) : null}

      {addingTariff && canCreate ? (
        <div style={{ marginTop: 14, padding: 14, border: "1px solid #BFDBFE", borderRadius: 12, background: "#F8FAFF" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1E40AF", marginBottom: 10 }}>Lançar serviço da tabela de valores do cliente</div>
          {servicesLoading ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8" }}>Carregando serviços…</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Serviço
                  <select style={input} value={tariff.serviceCatalogId} onChange={(e) => setTariff({ ...tariff, serviceCatalogId: e.target.value })}>
                    <option value="">Selecione um serviço…</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Quantidade
                  <input style={input} value={tariff.quantity} inputMode="decimal" onChange={(e) => setTariff({ ...tariff, quantity: e.target.value })} />
                </label>
              </div>
              <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginTop: 10 }}>Observação (opcional)
                <input style={input} value={tariff.notes} onChange={(e) => setTariff({ ...tariff, notes: e.target.value })} />
              </label>
              <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 8 }}>O valor é congelado a partir da tarifa vigente do cliente no momento do lançamento.</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" style={primaryBtn} disabled={busy} onClick={() => void addTariff()}>Lançar</button>
                <button type="button" style={{ ...primaryBtn, background: "#fff", color: "#475569", border: "1px solid #E2E8F0" }} disabled={busy} onClick={() => { setAddingTariff(false); setTariff(EMPTY_TARIFF); }}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {adding && canCreate ? (
        <div style={{ marginTop: 14, padding: 14, border: "1px solid #E2E8F0", borderRadius: 12, background: "#F8FAFC" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Descrição
              <input style={input} value={manual.description} placeholder="Ex.: Pedágio BR-101" onChange={(e) => setManual({ ...manual, description: e.target.value })} />
            </label>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Valor unitário
              <input style={input} value={manual.unitAmount} inputMode="decimal" placeholder="0,00" onChange={(e) => setManual({ ...manual, unitAmount: e.target.value })} />
            </label>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Quantidade
              <input style={input} value={manual.quantity} inputMode="decimal" onChange={(e) => setManual({ ...manual, quantity: e.target.value })} />
            </label>
          </div>
          <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginTop: 10 }}>Observação (opcional)
            <input style={input} value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" style={primaryBtn} disabled={busy} onClick={() => void addManual()}>Lançar</button>
            <button type="button" style={{ ...primaryBtn, background: "#fff", color: "#475569", border: "1px solid #E2E8F0" }} disabled={busy} onClick={() => { setAdding(false); setManual(EMPTY_MANUAL); }}>Cancelar</button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 18, fontSize: 13, color: "#94A3B8" }}>Carregando itens financeiros…</div>
      ) : items.length === 0 ? (
        <div style={{ marginTop: 18, padding: "28px 20px", textAlign: "center", border: "1px dashed #E2E8F0", borderRadius: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>Nenhum item financeiro lançado</div>
          <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>Lance serviços da tabela do cliente ou um item avulso para compor o valor da OS.</div>
        </div>
      ) : (
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={th}>Descrição</th>
                <th style={th}>Origem</th>
                <th style={{ ...th, textAlign: "right" }}>Qtd</th>
                <th style={{ ...th, textAlign: "right" }}>Valor unit.</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th>
                <th style={{ ...th, textAlign: "right", width: 90 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const editing = editingId === item.id;
                return (
                  <tr key={item.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {item.description}
                        {item.invoiced ? <span style={invoicedPill}>Faturado</span> : null}
                      </div>
                      {editing ? (
                        <input style={{ ...input, marginTop: 6 }} value={edit.notes} placeholder="Observação" onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
                      ) : item.notes ? (
                        <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 3 }}>{item.notes}</div>
                      ) : null}
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: item.source === "tariff" ? "#EFF6FF" : "#F1F5F9", color: item.source === "tariff" ? "#2563EB" : "#475569" }}>
                        {item.source === "tariff" ? "Tabela" : "Avulso"}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {editing ? (
                        <input style={{ ...input, textAlign: "right", maxWidth: 80 }} value={edit.quantity} inputMode="decimal" onChange={(e) => setEdit({ ...edit, quantity: e.target.value })} />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {editing && item.source === "manual" ? (
                        <input style={{ ...input, textAlign: "right", maxWidth: 100 }} value={edit.unitAmount} inputMode="decimal" onChange={(e) => setEdit({ ...edit, unitAmount: e.target.value })} />
                      ) : (
                        formatMoney(item.unitAmount, item.currency)
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{formatMoney(item.totalAmount, item.currency)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {/* Item faturado não se edita nem se exclui (o servidor recusa com 422 item_invoiced). */}
                      {canUpdate && !item.invoiced ? (
                        editing ? (
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button type="button" style={{ ...iconBtn, borderColor: "#2563EB", color: "#2563EB" }} disabled={busy} onClick={() => void saveEdit(item)} aria-label="Salvar item">✓</button>
                            <button type="button" style={iconBtn} disabled={busy} onClick={() => setEditingId(null)} aria-label="Cancelar edição">✕</button>
                          </div>
                        ) : (
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button type="button" style={iconBtn} disabled={busy} onClick={() => startEdit(item)} aria-label="Editar item"><Pencil size={15} /></button>
                            <button type="button" style={{ ...iconBtn, color: "#DC2626" }} disabled={busy} onClick={() => void remove(item)} aria-label="Excluir item"><Trash2 size={15} /></button>
                          </div>
                        )
                      ) : (
                        <span style={{ fontSize: 11.5, color: "#CBD5E1" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...td, fontWeight: 800 }} colSpan={4}>Total</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800, fontSize: 14 }}>{formatMoney(data?.totalAmount ?? 0, currency)}</td>
                <td style={td} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* B-SAN3-25 — "Títulos desta OS": só com financial_titles:read; uma leitura por título distinto dos itens. */}
      {canReadTitles && titleKey !== "" ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Títulos desta OS</div>
            {canOpenFinance ? (
              <Link to="/finance?aba=rec" style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB" }}>Ver no Financeiro</Link>
            ) : null}
          </div>
          {titlesLoading && titles.length === 0 ? (
            <div style={{ marginTop: 10, fontSize: 12.5, color: "#94A3B8" }}>Carregando títulos desta OS…</div>
          ) : (
            <div style={{ marginTop: 10, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr>
                    <th style={th}>Título</th>
                    <th style={{ ...th, textAlign: "right" }}>Valor</th>
                    <th style={th}>Vencimento</th>
                    <th style={th}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {titles.map((row) =>
                    row.kind === "loaded" ? (
                      <tr key={row.title.id}>
                        <td style={td}>{row.title.parentTitleId ? "Complementar" : "Original"}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatMoney(row.title.amount, row.title.currency)}</td>
                        <td style={td}>{formatDueDate(row.title.dueDate)}</td>
                        <td style={td}>
                          {row.title.status ? (
                            <span style={{ ...pill, background: getTitleStatusTone(row.title.status).bg, color: getTitleStatusTone(row.title.status).color }}>
                              {getTitleStatusLabel(row.title.status)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.id}>
                        <td style={{ ...td, color: "#64748B" }} colSpan={4}>
                          {row.kind === "removed" ? "Título removido" : "Não foi possível carregar este título."}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default FinancialTab;
