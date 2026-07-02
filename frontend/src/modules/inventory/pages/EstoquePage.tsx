import { AlertTriangle, Download, Package, Plus, Settings } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// "Estoque" (sc_estoque). Alvo: screen-refs/web/estoque.png.

type Kpi = { value: string; label: string; tag: string; tagBg: string; tagCl: string; iconBg: string; iconColor: string };
type Alert = { dot: string; bg: string; border: string; title: string; desc: string; action: string };
type Movement = { type: string; typeBg: string; typeCl: string; name: string; sku: string; qty: string; qtyColor: string; who: string; when: string };

const KPIS: Kpi[] = [
  { value: "1.284", label: "Produtos ativos", tag: "Normal", tagBg: "#EFF6FF", tagCl: "#2563EB", iconBg: "#EFF6FF", iconColor: "#2563EB" },
  { value: "R$ 1,4M", label: "Valor em estoque", tag: "Atualizado", tagBg: "#ECFDF5", tagCl: "#059669", iconBg: "#ECFDF5", iconColor: "#059669" },
  { value: "23", label: "Abaixo do mínimo", tag: "Atenção", tagBg: "#FFFBEB", tagCl: "#D97706", iconBg: "#FFFBEB", iconColor: "#D97706" },
  { value: "7", label: "Críticos", tag: "Crítico", tagBg: "#FEF2F2", tagCl: "#DC2626", iconBg: "#FEF2F2", iconColor: "#DC2626" },
  { value: "38", label: "Reservados para OS", tag: "Operação", tagBg: "#F5F3FF", tagCl: "#7C3AED", iconBg: "#F5F3FF", iconColor: "#7C3AED" },
  { value: "142", label: "Entradas no mês", tag: "+12%", tagBg: "#ECFDF5", tagCl: "#059669", iconBg: "#ECFDF5", iconColor: "#059669" },
  { value: "89", label: "Saídas no mês", tag: "Normal", tagBg: "#EFF6FF", tagCl: "#2563EB", iconBg: "#EFF6FF", iconColor: "#2563EB" },
  { value: "4", label: "Ajustes em aprovação", tag: "Pendente", tagBg: "#FFFBEB", tagCl: "#D97706", iconBg: "#FFFBEB", iconColor: "#D97706" },
];

const ALERT_COUNT = 6;
const ALERTS: Alert[] = [
  { dot: "#DC2626", bg: "#FEF2F2", border: "#FECACA", title: "7 produtos em nível crítico", desc: "Resistor 10kΩ, Cabo USB-C (2m) e mais 5 estão zerados ou abaixo do crítico.", action: "Ver produtos" },
  { dot: "#D97706", bg: "#FFFBEB", border: "#FDE68A", title: "3 notas aguardando conferência", desc: "NF-e 4471, 4468, 4461 — entrada sem conferência há mais de 24h.", action: "Conferir notas" },
  { dot: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", title: "8 reservas vencem em 48h", desc: "OS-2891 (Indústria Alfa), OS-2888 e mais 6 têm itens reservados prestes a expirar.", action: "Ver reservas" },
  { dot: "#D97706", bg: "#FFFBEB", border: "#FDE68A", title: "Saídas 34% acima da média semanal", desc: "Volume de saídas de consumíveis elétricos está elevado nesta semana.", action: "Ver saídas" },
  { dot: "#D97706", bg: "#FFFBEB", border: "#FDE68A", title: "4 ajustes aguardando aprovação", desc: "Ajustes de inventário físico pendentes há mais de 2 dias.", action: "Aprovar" },
  { dot: "#DC2626", bg: "#FEF2F2", border: "#FECACA", title: "2 divergências de nota detectadas", desc: "Quantidade recebida difere da NF-e 4465 e 4462.", action: "Resolver" },
];

const MOVEMENTS: Movement[] = [
  { type: "Entrada", typeBg: "#ECFDF5", typeCl: "#059669", name: "Cabo USB-C 2m", sku: "ELE-0021", qty: "+50 un", qtyColor: "#059669", who: "Bruno Lima", when: "há 22 min" },
  { type: "Saída", typeBg: "#FEF2F2", typeCl: "#DC2626", name: "Resistor 10kΩ", sku: "ELE-0008", qty: "-12 un", qtyColor: "#DC2626", who: "OS-2891", when: "há 1 h" },
  { type: "Reserva", typeBg: "#F5F3FF", typeCl: "#7C3AED", name: "Fusível 20A", sku: "ELE-0031", qty: "×8 un", qtyColor: "#7C3AED", who: "OS-2892", when: "há 2 h" },
  { type: "Ajuste", typeBg: "#FFFBEB", typeCl: "#D97706", name: "Fio PP 2,5mm", sku: "CAB-0004", qty: "−3 un", qtyColor: "#D97706", who: "Helena Castro", when: "há 3 h" },
  { type: "Entrada", typeBg: "#ECFDF5", typeCl: "#059669", name: "Disjuntor 25A", sku: "ELE-0044", qty: "+20 un", qtyColor: "#059669", who: "NF-e 4471", when: "ontem" },
];

const TABS = ["Visão Geral", "Produtos", "Entradas", "Saídas", "Notas", "Reservas", "Ajustes", "Relatórios", "Configurações"] as const;
type Tab = (typeof TABS)[number];

const DETAIL_SKU = "SKU-RES-10K";

const mono = "'JetBrains Mono', monospace";
const ghostBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" };
const headCell: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };

export function EstoquePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Visão Geral");

  return (
    <div style={{ color: "#0F172A" }}>
      {/* page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Estoque</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>produtos, movimentações, reservas, notas e controle operacional</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={ghostBtn}><Download size={15} />Exportar</button>
          <button style={ghostBtn}>Relatório</button>
          <button style={ghostBtn}><Plus size={15} />Novo produto</button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><Plus size={15} />Movimentar</button>
        </div>
      </div>

      {/* barra interna de abas */}
      <div style={{ display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 10, padding: 4, marginBottom: 18, overflowX: "auto", flexWrap: "nowrap" }}>
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", background: active ? "#2563EB" : "transparent", color: active ? "#fff" : "#64748B" }}>{t}</button>
          );
        })}
      </div>

      {tab === "Visão Geral" ? (
        <>
          {/* KPIs 8 cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
            {KPIS.map((k) => (
              <div key={k.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 14, height: 14, background: k.iconColor, borderRadius: 2, opacity: 0.8 }} />
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: k.tagBg, color: k.tagCl }}>{k.tag}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-.4px", marginBottom: 2 }}>{k.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* O que exige atenção? */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>O que exige atenção?</div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#FEF2F2", color: "#DC2626" }}>{ALERT_COUNT} alertas</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ALERTS.map((a) => (
                <div key={a.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: a.bg, border: `1px solid ${a.border}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>{a.desc}</div>
                  </div>
                  <button style={{ padding: "5px 12px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>{a.action}</button>
                </div>
              ))}
            </div>
          </div>

          {/* Últimas movimentações */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Últimas movimentações</div>
              <button onClick={() => setTab("Entradas")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Ver todas</button>
            </div>
            <div style={{ display: "flex", padding: "10px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
              <span style={{ flex: 0.6, ...headCell }}>TIPO</span>
              <span style={{ flex: 2, ...headCell }}>PRODUTO / SKU</span>
              <span style={{ flex: 0.8, ...headCell }}>QTD</span>
              <span style={{ flex: 1, ...headCell }}>RESPONSÁVEL</span>
              <span style={{ flex: 0.8, ...headCell }}>QUANDO</span>
            </div>
            {MOVEMENTS.map((m) => (
              <div key={`${m.sku}-${m.when}`} onClick={() => navigate(`/inventory/${DETAIL_SKU}`)} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #F8FAFC", gap: 10, cursor: "pointer" }}>
                <div style={{ flex: 0.6 }}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: m.typeBg, color: m.typeCl }}>{m.type}</span></div>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: mono }}>{m.sku}</div>
                </div>
                <span style={{ flex: 0.8, fontSize: 13.5, fontWeight: 700, color: m.qtyColor }}>{m.qty}</span>
                <span style={{ flex: 1, fontSize: 13, color: "#475569" }}>{m.who}</span>
                <span style={{ flex: 0.8, fontSize: 12, color: "#94A3B8" }}>{m.when}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB" }}>
            {tab === "Configurações" ? <Settings size={22} /> : tab === "Ajustes" ? <AlertTriangle size={22} /> : <Package size={22} />}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{tab}</div>
          <div style={{ fontSize: 13, color: "#64748B", maxWidth: 360 }}>Selecione a aba Visão Geral para acompanhar os indicadores e as últimas movimentações do estoque.</div>
        </div>
      )}
    </div>
  );
}

export default EstoquePage;
