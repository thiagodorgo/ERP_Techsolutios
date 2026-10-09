import { AlertTriangle, CalendarDays, Cloud, Database, Info, ReceiptText, Server, Users } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { Alert, EmptyState, ErrorState, Skeleton } from "../../../../components/ui";
import { currentBillingMonth } from "../cloud-billing.service";
import type { CloudBillingData, CloudChargeTenant, CloudCostImport } from "../cloud-billing.types";
import { useCloudBilling } from "../useCloudBilling";

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13 };
const th: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };
const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const MONTH = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

function formatMoney(value: number, currency?: string): string {
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return `${NUMBER.format(value)} · moeda não informada`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

function formatPercent(value?: number): string | null {
  return value === undefined ? null : `${NUMBER.format(value)}%`;
}

function formatDate(value?: string): string {
  if (!value) return "não informada";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "não informada" : DATE_TIME.format(date);
}

function formatMonth(month: string): string {
  const date = new Date(`${month}-15T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? month : MONTH.format(date);
}

function statusLabel(status: string): string {
  if (status === "ready") return "Pronta";
  if (status === "locked") return "Travada";
  if (status === "voided") return "Anulada";
  if (status === "draft") return "Rascunho";
  return "Indefinida";
}

function importStatus(importItem?: CloudCostImport): string {
  if (!importItem) return "Nenhuma";
  if (importItem.status === "completed") return "Concluída";
  if (importItem.status === "processing") return "Em processamento";
  if (importItem.status === "failed") return "Falhou";
  return "Pendente";
}

function metricLabel(key: string): string {
  const labels: Record<string, string> = { api_requests_count: "Requisições da API", storage_gb_month: "Armazenamento", database_storage_gb_month: "Armazenamento do banco", active_users_count: "Usuários ativos" };
  return labels[key] ?? "Métrica medida";
}

function unitLabel(unit: string): string {
  if (unit === "count") return "unid.";
  if (unit === "gb_month") return "GB·mês";
  if (unit === "bytes") return "bytes";
  return "unidade não identificada";
}

type KpiProps = { readonly label: string; readonly value: string; readonly note: string; readonly icon: ReactNode; readonly warning?: boolean };
function Kpi({ label, value, note, icon, warning = false }: KpiProps) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>{label}</span>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: warning ? "#FFFBEB" : "#EFF6FF", color: warning ? "#D97706" : "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.35px", marginBottom: 5, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: warning ? "#D97706" : "#64748B" }}>{note}</div>
    </div>
  );
}

function HonestSeal({ title, detail }: { readonly title: string; readonly detail: string }) {
  return <div style={{ ...card, padding: 18, background: "#F8FAFC", borderStyle: "dashed", display: "flex", alignItems: "center", gap: 12 }}><Info size={18} style={{ color: "#2563EB", flexShrink: 0 }} /><div><div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div><div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{detail}</div></div></div>;
}

function monthOptions(baseMonth: string): readonly string[] {
  const [year, month] = baseMonth.split("-").map(Number);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 15));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function chargeRows(charges: CloudBillingData["charges"]): readonly CloudChargeTenant[] {
  return charges?.tenants ?? [];
}

export function PlatformCloudBillingView({ data, month, onMonthChange = () => undefined }: { readonly data: CloudBillingData; readonly month: string; readonly onMonthChange?: (month: string) => void }) {
  const { usage, costs, allocation, charges, imports } = data;
  const latestImport = imports[0];
  const currency = charges?.currency ?? allocation?.currency ?? costs?.currencies[0];
  const updatedAt = charges?.generatedAt || allocation?.generatedAt || costs?.generatedAt || usage?.generatedAt;
  const maxServiceCost = Math.max(0, ...(costs?.services.map((service) => service.unblendedCost) ?? []));
  const marginPercent = formatPercent(charges?.totalMarginPercentage);

  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
        <div><div style={{ fontSize: 20, fontWeight: 800 }}>Cloud Billing</div><div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>{formatMonth(month)} · atualizado {formatDate(updatedAt)}</div></div>
        <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 11px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#334155" }}><CalendarDays size={14} aria-hidden="true" /><span className="sr-only">Mês de referência</span><select aria-label="Mês de referência" value={month} onChange={(event) => onMonthChange(event.target.value)} style={{ border: 0, background: "transparent", font: "inherit", color: "inherit" }}>{monthOptions(currentBillingMonth()).map((option) => <option key={option} value={option}>{formatMonth(option)}</option>)}</select></label>
      </div>

      {data.stale ? <div style={{ marginBottom: 14 }}><Alert title="Dados desatualizados" tone="warning">A atualização falhou. Os últimos dados confirmados permanecem visíveis enquanto a plataforma tenta novamente.</Alert></div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <Kpi label="Custo importado" value={formatMoney(costs?.totalUnblendedCost ?? 0, costs?.currencies[0])} note={`${costs?.lineItemCount ?? 0} linhas de custo`} icon={<Cloud size={16} />} />
        <Kpi label="Linhas de custo" value={NUMBER.format(costs?.lineItemCount ?? 0)} note="quantidade informada pelo resumo" icon={<Database size={16} />} />
        <Kpi label="Custo rateado" value={formatMoney(allocation?.totalAllocatedCost ?? 0, allocation?.currency)} note="valor informado pelo rateio" icon={<Server size={16} />} />
        <Kpi label="Não rateado" value={formatMoney(allocation?.totalUnallocatedCost ?? 0, allocation?.currency)} note="exige classificação quando houver valor" icon={<AlertTriangle size={16} />} warning={(allocation?.totalUnallocatedCost ?? 0) > 0} />
        <Kpi label="Valor cobrável" value={formatMoney(charges?.totalChargeAmount ?? 0, charges?.currency)} note="valor informado pelo resumo" icon={<ReceiptText size={16} />} />
        <Kpi label="Margem" value={`${formatMoney(charges?.totalMarginAmount ?? 0, charges?.currency)}${marginPercent ? ` · ${marginPercent}` : ""}`} note={marginPercent ? "percentual informado pelo backend" : "percentual não informado"} icon={<ReceiptText size={16} />} />
        <Kpi label="Organizações com cobrança" value={NUMBER.format(charges?.tenants.length ?? 0)} note="linhas do resumo de cobrança" icon={<Users size={16} />} />
        <Kpi label="Última importação" value={importStatus(latestImport)} note={formatDate(latestImport?.importedAt)} icon={<CalendarDays size={16} />} warning={latestImport?.status === "failed"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
        <HonestSeal title="Série diária e projeção" detail="Ainda não há uma série temporal nem projeção fornecida pela API." />
        <div style={{ ...card, padding: 18 }}><div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Por serviço</div><div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 14 }}>Custos informados pelo resumo</div>{costs?.services.length ? costs.services.map((service) => <div key={`${service.serviceCode}-${service.currency}`} style={{ marginBottom: 11 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{service.serviceCode}</span><span style={{ fontSize: 12, fontWeight: 700 }}>{formatMoney(service.unblendedCost, service.currency)}</span></div><div style={{ height: 7, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: `${maxServiceCost > 0 ? Math.min(100, (service.unblendedCost / maxServiceCost) * 100) : 0}%`, background: "#2563EB", borderRadius: 99 }} /></div></div>) : <div style={{ fontSize: 12, color: "#64748B" }}>Nenhum serviço medido no período.</div>}</div>
        <div style={{ ...card, padding: 18 }}><div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Por organização</div><div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 14 }}>Rateio informado pela API</div>{allocation?.tenants.length ? allocation.tenants.map((tenant) => <div key={tenant.tenantId} style={{ marginBottom: 11 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{tenant.tenantName ?? "Organização sem nome"}</span><span style={{ fontSize: 12, fontWeight: 700 }}>{formatMoney(tenant.allocatedCost, allocation.currency)}</span></div><div style={{ height: 7, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, Math.max(0, tenant.allocationRatio * 100))}%`, background: "#7C3AED", borderRadius: 99 }} /></div></div>) : <div style={{ fontSize: 12, color: "#64748B" }}>Nenhuma organização rateada no período.</div>}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div style={{ ...card, overflow: "hidden" }}><div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 14, fontWeight: 800 }}>Uso medido</div>{usage?.metrics.length ? usage.metrics.map((metric) => <div key={metric.metricKey} style={{ display: "flex", justifyContent: "space-between", padding: "11px 18px", borderBottom: "1px solid #F8FAFC" }}><span style={{ fontSize: 12.5, color: "#475569" }}>{metricLabel(metric.metricKey)}</span><span style={{ fontSize: 12.5, fontWeight: 700 }}>{NUMBER.format(metric.quantity)} {unitLabel(metric.unit)}</span></div>) : <div style={{ padding: 18, fontSize: 12, color: "#64748B" }}>Nenhuma métrica de uso no período.</div>}</div>
        <div style={{ ...card, overflow: "hidden" }}><div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 14, fontWeight: 800 }}>Importações</div>{imports.length ? imports.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "11px 18px", borderBottom: "1px solid #F8FAFC", gap: 8 }}><span style={{ fontSize: 12.5, color: "#475569" }}>{formatDate(item.importedAt)}</span><span style={{ fontSize: 12.5, fontWeight: 700 }}>{importStatus(item)} · {NUMBER.format(item.rowCount)} linhas</span></div>) : <div style={{ padding: 18, fontSize: 12, color: "#64748B" }}>Nenhuma importação registrada no período.</div>}</div>
      </div>

      <div style={{ ...card, overflow: "hidden" }}><div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}><div style={{ fontSize: 14, fontWeight: 800 }}>Cobrança por organização</div><div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 3 }}>Valores informados pelo resumo de cobrança</div></div><div style={{ display: "flex", padding: "9px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}><span style={{ ...th, flex: 1.4 }}>ORGANIZAÇÃO</span><span style={{ ...th, flex: 1, textAlign: "right" }}>CUSTO RATEADO</span><span style={{ ...th, flex: 1, textAlign: "right" }}>VALOR COBRÁVEL</span><span style={{ ...th, flex: 1, textAlign: "right" }}>MARGEM</span><span style={{ ...th, flex: .8, textAlign: "right" }}>SITUAÇÃO</span></div>{chargeRows(charges).map((tenant) => <div key={tenant.tenantId} style={{ display: "flex", alignItems: "center", padding: "11px 18px", borderBottom: "1px solid #F8FAFC", gap: 10 }}><span style={{ flex: 1.4, fontSize: 12.5, fontWeight: 700 }}>{tenant.tenantName ?? "Organização sem nome"}</span><span style={{ flex: 1, textAlign: "right", fontSize: 12.5 }}>{formatMoney(tenant.allocatedCost, currency)}</span><span style={{ flex: 1, textAlign: "right", fontSize: 12.5 }}>{formatMoney(tenant.finalChargeAmount, currency)}</span><span style={{ flex: 1, textAlign: "right", fontSize: 12.5 }}>{formatMoney(tenant.marginAmount, currency)}{tenant.marginPercentage === undefined ? "" : ` · ${formatPercent(tenant.marginPercentage)}`}</span><span style={{ flex: .8, textAlign: "right", fontSize: 12, fontWeight: 700 }}>{statusLabel(tenant.status)}</span></div>)}</div>
    </div>
  );
}

// Estados §7 da tela, separados do hook para serem renderizáveis no teste (B-SAN3-06b E8): carregando, acesso não
// permitido, falha (nenhum valor), vazio e, por fim, a composição com os dados do backend.
export function PlatformCloudBillingScreen({ data, loading, month, onMonthChange = () => undefined }: { readonly data: CloudBillingData; readonly loading: boolean; readonly month: string; readonly onMonthChange?: (month: string) => void }) {
  const empty = !data.costs?.lineItemCount && !data.allocation?.tenants.length && !data.charges?.tenants.length && !data.usage?.metrics.length && data.imports.length === 0;
  const base: CSSProperties = { color: "#0F172A" };
  if (loading) return <div style={base}><div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Cloud Billing</div><div style={{ ...card, padding: 20 }}><Skeleton lines={8} /></div></div>;
  if (data.forbidden) return <div style={base}><div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Cloud Billing</div><ErrorState title="Acesso não permitido" detail="Seu perfil não tem permissão para consultar os dados de cobrança cloud." /></div>;
  if (data.source === "fallback") return <div style={base}><div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Cloud Billing</div><Alert title="Não foi possível carregar Cloud Billing" tone="warning">A plataforma tentará novamente. Nenhum valor é exibido enquanto não houver uma resposta confirmada.</Alert></div>;
  if (empty) return <div style={base}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}><div><div style={{ fontSize: 20, fontWeight: 800 }}>Cloud Billing</div><div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>{formatMonth(month)}</div></div></div><div style={{ ...card, padding: 8 }}><EmptyState title="Nenhum custo importado no período" detail="Selecione outro mês ou aguarde uma importação confirmada pela plataforma." /></div></div>;
  return <PlatformCloudBillingView data={data} month={month} onMonthChange={onMonthChange} />;
}

export function PlatformCloudBillingPage() {
  const [month, setMonth] = useState(currentBillingMonth());
  const { data, loading } = useCloudBilling(month);
  return <PlatformCloudBillingScreen data={data} loading={loading} month={month} onMonthChange={setMonth} />;
}

export default PlatformCloudBillingPage;
