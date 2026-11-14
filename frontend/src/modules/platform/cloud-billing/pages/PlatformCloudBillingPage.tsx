import { CalendarDays, Cloud, Server } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { Alert, EmptyState, ErrorState, Skeleton } from "../../../../components/ui";
import { formatBRL } from "../cloud-billing.money";
import { currentBillingMonth } from "../cloud-billing.service";
import { isPeriodOfMonth } from "../cloud-billing.state";
import type { CloudBillingData, CloudCostImport } from "../cloud-billing.types";
import { useCloudBilling } from "../useCloudBilling";

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13 };
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const MONTH = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

function formatDate(value?: string): string {
  if (!value) return "não informada";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "não informada" : DATE_TIME.format(date);
}

function formatMonth(month: string): string {
  const date = new Date(`${month}-15T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? month : MONTH.format(date);
}

function importStatus(importItem?: CloudCostImport): string {
  if (!importItem) return "Nenhuma";
  if (importItem.status === "completed") return "Concluída";
  if (importItem.status === "processing") return "Em processamento";
  if (importItem.status === "failed") return "Falhou";
  return "Pendente";
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

function monthOptions(baseMonth: string): readonly string[] {
  const [year, month] = baseMonth.split("-").map(Number);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 15));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

// Seletor de mês único da tela: o cabeçalho com dados e o estado vazio usam o mesmo (A2 da revisão do PR 411 — o vazio
// diz "Selecione outro mês", então tem de oferecer o seletor).
function MonthSelect({ month, onMonthChange }: { readonly month: string; readonly onMonthChange: (month: string) => void }) {
  return <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 11px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#334155" }}><CalendarDays size={14} aria-hidden="true" /><span className="sr-only">Mês de referência</span><select aria-label="Mês de referência" value={month} onChange={(event) => onMonthChange(event.target.value)} style={{ border: 0, background: "transparent", font: "inherit", color: "inherit" }}>{monthOptions(currentBillingMonth()).map((option) => <option key={option} value={option}>{formatMonth(option)}</option>)}</select></label>;
}

export function PlatformCloudBillingView({ data, month, onMonthChange = () => undefined }: { readonly data: CloudBillingData; readonly month: string; readonly onMonthChange?: (month: string) => void }) {
  const global = data.global?.global ?? null;
  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
        <div><div style={{ fontSize: 20, fontWeight: 800 }}>Cloud Billing</div><div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>{formatMonth(month)} · atualizado {formatDate(data.global?.generatedAt)}</div></div>
        <MonthSelect month={month} onMonthChange={onMonthChange} />
      </div>
      {data.stale ? <div style={{ marginBottom: 14 }}><Alert title="Dados desatualizados" tone="warning">A atualização falhou. Os últimos dados confirmados permanecem visíveis enquanto a plataforma tenta novamente.</Alert></div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        <Kpi label="Custo total do mês" value={formatBRL(global?.totalCost ?? null)} note="informado pela visão do servidor" icon={<Cloud size={16} />} />
        <Kpi label="Assinaturas do mês" value={formatBRL(global?.subscriptionTotal ?? null)} note="antes do crédito aplicado" icon={<Server size={16} />} />
        <Kpi label="Última importação" value={importStatus(data.imports?.[0])} note={formatDate(data.imports?.[0]?.importedAt ?? undefined)} icon={<CalendarDays size={16} />} warning={data.imports?.[0]?.status === "failed"} />
      </div>
    </div>
  );
}

// Estados §7 da tela, separados do hook para serem renderizáveis no teste (B-SAN3-06b E8): carregando, acesso não
// permitido, falha (nenhum valor), vazio e, por fim, a composição com os dados do backend. Dado de um período que não
// é o do mês rotulado (troca de mês com resposta em voo) é tratado como carregando: nunca aparece sob outro rótulo (A1).
export function PlatformCloudBillingScreen({ data, loading, month, onMonthChange = () => undefined }: { readonly data: CloudBillingData; readonly loading: boolean; readonly month: string; readonly onMonthChange?: (month: string) => void }) {
  const empty = !data.tenant?.lines.length && !data.global?.global.subscriptionTotal && !data.global?.global.totalCost;
  const base: CSSProperties = { color: "#0F172A" };
  if (loading || !isPeriodOfMonth(data.period, month)) return <div style={base}><div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Cloud Billing</div><div style={{ ...card, padding: 20 }}><Skeleton lines={8} /></div></div>;
  if (data.forbidden) return <div style={base}><div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Cloud Billing</div><ErrorState title="Acesso não permitido" detail="Seu perfil não tem permissão para consultar os dados de cobrança cloud." /></div>;
  if (data.source === "fallback") return <div style={base}><div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Cloud Billing</div><Alert title="Não foi possível carregar Cloud Billing" tone="warning">A plataforma tentará novamente. Nenhum valor é exibido enquanto não houver uma resposta confirmada.</Alert></div>;
  if (empty) return <div style={base}><div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}><div><div style={{ fontSize: 20, fontWeight: 800 }}>Cloud Billing</div><div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>{formatMonth(month)}</div></div><MonthSelect month={month} onMonthChange={onMonthChange} /></div><div style={{ ...card, padding: 8 }}><EmptyState title="Nenhum custo importado no período" detail="Selecione outro mês ou aguarde uma importação confirmada pela plataforma." /></div></div>;
  return <PlatformCloudBillingView data={data} month={month} onMonthChange={onMonthChange} />;
}

export function PlatformCloudBillingPage() {
  const [month, setMonth] = useState(currentBillingMonth());
  const { data, loading } = useCloudBilling(month);
  return <PlatformCloudBillingScreen data={data} loading={loading} month={month} onMonthChange={setMonth} />;
}

export default PlatformCloudBillingPage;
