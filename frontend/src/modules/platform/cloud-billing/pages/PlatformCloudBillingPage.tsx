import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  Clock,
  DollarSign,
  Download,
  Filter,
  ShieldCheck,
} from "lucide-react";
import type { CSSProperties } from "react";

// Tela "Cloud Billing" · perfil Plataforma. Alvo pixel a pixel:
// docs/claude-code-handoff/screen-refs/Cloud Billing.reference.html (padrão-ouro).

type Kpi = { label: string; value: string; note: string; noteColor: string; badge: string; badgeBg: string; badgeColor: string };
type Bar = { h: number; c: string };
type Track = { label: string; value: string; color: string; width: string };
type Insight = { tag: string; color: string; bg: string; icon: typeof ArrowUpRight; text: string };
type Row = {
  name: string; sub: string; org: string; use: string; cost: string;
  variation: string; variationColor: string; budget: string;
  status: string; statusBg: string; statusColor: string; action: string; actionColor: string;
};

const KPIS: Kpi[] = [
  { label: "Custo atual", value: "R$ 48,2k", note: "+12,4% vs maio", noteColor: "#DC2626", badge: "Médio", badgeBg: "#FFFBEB", badgeColor: "#D97706" },
  { label: "Projeção", value: "R$ 52,1k", note: "confiança 87%", noteColor: "#D97706", badge: "Médio", badgeBg: "#FFFBEB", badgeColor: "#D97706" },
  { label: "Orçamento", value: "R$ 63k", note: "76% consumido", noteColor: "#059669", badge: "Normal", badgeBg: "#ECFDF5", badgeColor: "#059669" },
  { label: "Desvio", value: "+R$ 4,2k", note: "acima do esperado", noteColor: "#DC2626", badge: "Atenção", badgeBg: "#FFFBEB", badgeColor: "#D97706" },
  { label: "Economia realizada", value: "R$ 6,4k", note: "3 ações aplicadas", noteColor: "#059669", badge: "Positivo", badgeBg: "#ECFDF5", badgeColor: "#059669" },
  { label: "Economia potencial", value: "R$ 8,1k", note: "5 recomendações", noteColor: "#2563EB", badge: "Disponível", badgeBg: "#EFF6FF", badgeColor: "#2563EB" },
  { label: "Alertas críticos", value: "3", note: "maior: R$ 7,9k egress", noteColor: "#DC2626", badge: "Crítico", badgeBg: "#FEF2F2", badgeColor: "#DC2626" },
  { label: "Custo / org ativa", value: "R$ 1.004", note: "48 orgs ativas", noteColor: "#475569", badge: "Normal", badgeBg: "#ECFDF5", badgeColor: "#059669" },
];

const BARS: Bar[] = [
  { h: 63.3, c: "#BFDBFE" }, { h: 68.3, c: "#BFDBFE" }, { h: 60, c: "#BFDBFE" }, { h: 71.7, c: "#BFDBFE" },
  { h: 75, c: "#BFDBFE" }, { h: 70, c: "#BFDBFE" }, { h: 80, c: "#BFDBFE" }, { h: 76.7, c: "#BFDBFE" },
  { h: 83.3, c: "#BFDBFE" }, { h: 78.3, c: "#BFDBFE" }, { h: 86.7, c: "#BFDBFE" }, { h: 85, c: "#BFDBFE" },
  { h: 80, c: "#BFDBFE" }, { h: 90, c: "#BFDBFE" }, { h: 93.3, c: "#BFDBFE" }, { h: 88.3, c: "#93C5FD" },
  { h: 96.7, c: "#93C5FD" }, { h: 91.7, c: "#93C5FD" }, { h: 100, c: "#93C5FD" }, { h: 86.7, c: "#1D4ED8" },
];

const BY_SERVICE: Track[] = [
  { label: "Compute", value: "R$ 18,4k", color: "#2563EB", width: "38%" },
  { label: "Database", value: "R$ 12,7k", color: "#7C3AED", width: "26%" },
  { label: "Storage", value: "R$ 9,1k", color: "#0891B2", width: "19%" },
  { label: "Egress", value: "R$ 7,9k", color: "#DC2626", width: "16%" },
  { label: "Outros", value: "R$ 3,3k", color: "#94A3B8", width: "7%" },
];

const BY_ORG: Track[] = [
  { label: "Techsolutions SP", value: "R$ 25,0k", color: "#2563EB", width: "52%" },
  { label: "AgroMax Coop.", value: "R$ 11,6k", color: "#DC2626", width: "24%" },
  { label: "Logística Delta", value: "R$ 5,8k", color: "#D97706", width: "12%" },
  { label: "Outros (45)", value: "R$ 5,8k", color: "#94A3B8", width: "12%" },
];

const INSIGHTS: Insight[] = [
  { tag: "ANOMALIA", color: "#DC2626", bg: "#FEF2F2", icon: ArrowUpRight, text: "Egress subiu 31% nos últimos 7 dias — AgroMax Cooperativa." },
  { tag: "ATENÇÃO", color: "#D97706", bg: "#FFFBEB", icon: AlertTriangle, text: "Banco gerenciado 18% acima do orçamento mensal." },
  { tag: "CONCENTRAÇÃO", color: "#DC2626", bg: "#FEF2F2", icon: ArrowUpRight, text: "AgroMax representa 42% do aumento de custo do mês." },
  { tag: "GOVERNANÇA", color: "#7C3AED", bg: "#F5F3FF", icon: ShieldCheck, text: "3 recursos identificados sem tag de organização." },
  { tag: "OTIMIZAÇÃO", color: "#059669", bg: "#ECFDF5", icon: DollarSign, text: "R$ 8,1k de economia potencial com 5 ações disponíveis." },
  { tag: "RISCO", color: "#DC2626", bg: "#FEF2F2", icon: Clock, text: "Projeção indica estouro de orçamento em 8 dias." },
];

const ROWS: Row[] = [
  { name: "Compute (API)", sub: "Compute · Prod", org: "Rateio multi-organização", use: "1.284 h", cost: "R$ 18.400", variation: "+4,2%", variationColor: "#D97706", budget: "R$ 20k", status: "Normal", statusBg: "#ECFDF5", statusColor: "#059669", action: "—", actionColor: "#94A3B8" },
  { name: "Banco gerenciado", sub: "Database · Prod", org: "Rateio multi-organização", use: "99,98% uptime", cost: "R$ 12.700", variation: "+18,3%", variationColor: "#DC2626", budget: "R$ 10,7k", status: "Acima orçamento", statusBg: "#FEF2F2", statusColor: "#DC2626", action: "Investigar", actionColor: "#2563EB" },
  { name: "Storage (S3)", sub: "Storage · Prod", org: "Techsolutions SP", use: "2,1 TB", cost: "R$ 9.120", variation: "+1,8%", variationColor: "#059669", budget: "R$ 10k", status: "Normal", statusBg: "#ECFDF5", statusColor: "#059669", action: "—", actionColor: "#94A3B8" },
  { name: "Egress", sub: "Rede · Prod", org: "AgroMax Cooperativa", use: "840 GB", cost: "R$ 7.980", variation: "+31,4%", variationColor: "#DC2626", budget: "R$ 6k", status: "Anomalia", statusBg: "#FEF2F2", statusColor: "#DC2626", action: "Aprovar excedente", actionColor: "#2563EB" },
  { name: "Observability", sub: "Monitoramento · Prod", org: "Rateio multi-organização", use: "12,4M spans", cost: "R$ 2.100", variation: "+2,1%", variationColor: "#059669", budget: "R$ 2,5k", status: "Normal", statusBg: "#ECFDF5", statusColor: "#059669", action: "—", actionColor: "#94A3B8" },
  { name: "Redis Cache", sub: "Cache · Prod", org: "Rateio multi-organização", use: "1,2 GB hit 98,7%", cost: "R$ 1.220", variation: "-0,8%", variationColor: "#059669", budget: "R$ 1,5k", status: "Normal", statusBg: "#ECFDF5", statusColor: "#059669", action: "—", actionColor: "#94A3B8" },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13, padding: 16 };
const badge = (bg: string, color: string): CSSProperties => ({ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color });
const th: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };
const mono = "'JetBrains Mono', monospace";

export function PlatformCloudBillingPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      {/* PAGE HEADER: título + subtítulo + ações à direita */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Cloud Billing</div>
          <div style={{ fontFamily: mono, fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Junho 2026 · Produção · atualizado há 4 min</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>
            <Clock size={14} style={{ color: "#94A3B8" }} />Junho 2026<ChevronDown size={13} style={{ color: "#94A3B8" }} />
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>
            Produção<ChevronDown size={13} style={{ color: "#94A3B8" }} />
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Exportar</button>
        </div>
      </div>

      {/* KPIs 4×2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.4px", marginBottom: 6 }}>{k.value}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.5, color: k.noteColor }}>{k.note}</span>
              <span style={badge(k.badgeBg, k.badgeColor)}>{k.badge}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Custo diário + projeção</div>
              <div style={{ fontSize: 11.5, color: "#94A3B8" }}>Junho 2026 · R$ mil</div>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#475569" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#2563EB" }} />Real</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#475569" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#BFDBFE" }} />Projeção</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110 }}>
            {BARS.map((b, i) => (
              <div key={i} style={{ flex: 1, height: `${b.h}%`, borderRadius: "3px 3px 0 0", background: b.c }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            {["1/06", "6/06", "11/06", "16/06"].map((d) => <span key={d} style={{ fontSize: 10, color: "#94A3B8" }}>{d}</span>)}
            <span style={{ fontSize: 10, fontWeight: 700, color: "#2563EB" }}>Hoje</span>
          </div>
        </div>

        <div style={{ ...card, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Por serviço</div>
          <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 14 }}>Distribuição do custo</div>
          {BY_SERVICE.map((t, i) => (
            <div key={t.label} style={{ marginBottom: i === BY_SERVICE.length - 1 ? 0 : 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{t.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{t.value}</span>
              </div>
              <div style={{ height: 7, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: t.color, width: t.width }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Por organização</div>
          <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 14 }}>Consumo por organização</div>
          {BY_ORG.map((t, i) => (
            <div key={t.label} style={{ marginBottom: i === BY_ORG.length - 1 ? 0 : 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{t.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{t.value}</span>
              </div>
              <div style={{ height: 7, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: t.color, width: t.width }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IA + TABELA */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={16} style={{ color: "#2563EB" }} />
            <span style={{ fontSize: 14, fontWeight: 800 }}>O que mudou?</span>
            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, background: "#EFF6FF", color: "#2563EB", padding: "2px 8px", borderRadius: 99 }}>IA</span>
          </div>
          {INSIGHTS.map((it) => (
            <div key={it.tag} style={{ padding: "12px 16px", borderBottom: "1px solid #F8FAFC", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: it.bg, display: "flex", alignItems: "center", justifyContent: "center", color: it.color, flexShrink: 0 }}>
                <it.icon size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: it.color, letterSpacing: ".06em", marginBottom: 2 }}>{it.tag}</div>
                <div style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.45 }}>{it.text}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: "12px 16px" }}>
            <button style={{ width: "100%", padding: 9, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}>Ver todas as recomendações</button>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Recursos · detalhe</div>
              <div style={{ fontSize: 11.5, color: "#94A3B8" }}>Consumo por recurso · rateio e orçamento</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ padding: "7px 11px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Filter size={13} />Filtrar</button>
              <button style={{ padding: "7px 11px", background: "#2563EB", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Download size={13} />Exportar</button>
            </div>
          </div>
          <div style={{ display: "flex", padding: "9px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
            <span style={{ ...th, flex: 1.4 }}>RECURSO</span>
            <span style={{ ...th, flex: 0.9 }}>ORGANIZAÇÃO</span>
            <span style={{ ...th, flex: 0.7 }}>USO</span>
            <span style={{ ...th, flex: 0.7 }}>CUSTO</span>
            <span style={{ ...th, flex: 0.6 }}>VARIAÇÃO</span>
            <span style={{ ...th, flex: 0.6 }}>ORÇAMENTO</span>
            <span style={{ ...th, flex: 0.9, textAlign: "right" }}>STATUS</span>
            <span style={{ ...th, flex: 0.9, textAlign: "right" }}>AÇÃO</span>
          </div>
          {ROWS.map((r, i) => (
            <div key={r.name} style={{ display: "flex", alignItems: "center", padding: "11px 18px", borderBottom: i === ROWS.length - 1 ? "none" : "1px solid #F8FAFC", gap: 10 }}>
              <div style={{ flex: 1.4 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{r.sub}</div>
              </div>
              <span style={{ flex: 0.9, fontSize: 12.5, color: "#475569" }}>{r.org}</span>
              <span style={{ flex: 0.7, fontSize: 12, color: "#475569", fontFamily: mono }}>{r.use}</span>
              <span style={{ flex: 0.7, fontSize: 13, fontWeight: 700 }}>{r.cost}</span>
              <span style={{ flex: 0.6, fontSize: 12.5, fontWeight: 700, color: r.variationColor }}>{r.variation}</span>
              <span style={{ flex: 0.6, fontSize: 12.5, color: "#64748B" }}>{r.budget}</span>
              <div style={{ flex: 0.9, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: r.statusBg, color: r.statusColor, whiteSpace: "nowrap" }}>{r.status}</span>
              </div>
              <div style={{ flex: 0.9, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.actionColor }}>{r.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PlatformCloudBillingPage;
