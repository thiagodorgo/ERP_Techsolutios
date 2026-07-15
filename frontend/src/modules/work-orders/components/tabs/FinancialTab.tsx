import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  createManualFinancialItem,
  createTariffFinancialItem,
  deleteFinancialItem,
  formatMoney,
  listWorkOrderFinancials,
  patchFinancialItem,
} from "../../financials.service";
import type { WorkOrderFinancialApiContext, WorkOrderFinancialItem, WorkOrderFinancialList } from "../../financials.types";
import { listServiceCatalogFromApi } from "../../../registry/service-catalog/service-catalog.service";
import type { ServiceItem } from "../../../registry/service-catalog/service-catalog.types";

// Ω3F-3b — aba "Financeiro" do Hub da OS (spec §1.3 / §1.1 0:24–1:08): itens da tabela de valores
// (valor CONGELADO no lançamento, anti-refaturamento) + item avulso ("+", ex.: pedágio) + edição
// inline + TOTAL automático (somado no BACKEND — o front nunca soma). Estados §7: loading/erro/vazio;
// "acesso não permitido" é tratado pelo shell (a aba exige work_order_financials:read).

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const th: CSSProperties = { fontSize: 11.5, color: "#94A3B8", fontWeight: 700, textAlign: "left", padding: "10px 14px", textTransform: "uppercase", letterSpacing: ".3px" };
const td: CSSProperties = { fontSize: 13, color: "#0F172A", padding: "12px 14px", borderTop: "1px solid #F1F5F9", verticalAlign: "middle" };
const input: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
const iconBtn: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", cursor: "pointer" };
const primaryBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" };

type EditState = { readonly quantity: string; readonly unitAmount: string; readonly notes: string };
type ManualState = { readonly description: string; readonly unitAmount: string; readonly quantity: string; readonly notes: string };
type TariffState = { readonly serviceCatalogId: string; readonly quantity: string; readonly notes: string };
const EMPTY_MANUAL: ManualState = { description: "", unitAmount: "", quantity: "1", notes: "" };
const EMPTY_TARIFF: TariffState = { serviceCatalogId: "", quantity: "1", notes: "" };

export function FinancialTab({
  workOrderId,
  context,
  permissions,
}: {
  workOrderId: string;
  context: WorkOrderFinancialApiContext;
  permissions: readonly string[];
}) {
  const [data, setData] = useState<WorkOrderFinancialList | null>(null);
  const [loading, setLoading] = useState(true);
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

  const canCreate = permissions.includes("work_order_financials:create");
  const canUpdate = permissions.includes("work_order_financials:update");

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

  const items = data?.items ?? [];
  const currency = data?.currency ?? "BRL";

  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Itens financeiros</div>
          <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>Serviços da tabela de valores do cliente (valor congelado no lançamento) e itens avulsos.</div>
        </div>
        {canCreate ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={primaryBtn} disabled={busy} onClick={() => void openTariffForm()}>
              <Plus size={16} /> Lançar da tabela
            </button>
            <button type="button" style={{ ...primaryBtn, background: "#fff", color: "#2563EB", border: "1px solid #BFDBFE" }} disabled={busy} onClick={() => { setAdding((v) => !v); setAddingTariff(false); }}>
              <Plus size={16} /> Item avulso
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div style={{ marginTop: 14, padding: "10px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, color: "#B91C1C" }}>{error}</div>
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
                      <div style={{ fontWeight: 600 }}>{item.description}</div>
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
                      {canUpdate ? (
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
    </div>
  );
}

export default FinancialTab;
