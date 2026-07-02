import { Check, Plus } from "lucide-react";
import type { CSSProperties } from "react";

// "Planos e Módulos" (sc_plans). Alvo: ERP Web.dc.html.

type Plan = { name: string; chip: string; chipBg: string; chipColor: string; price: string; mods: string; tenants: string };
type Module = { name: string; key: string; starter: boolean; pro: boolean; ent: boolean };

const PLANS: Plan[] = [
  { name: "Starter", chip: "Comercial", chipBg: "#F1F5F9", chipColor: "#475569", price: "R$ 490/mês", mods: "5 módulos", tenants: "até 10 usuários" },
  { name: "Professional", chip: "Mais vendido", chipBg: "#EFF6FF", chipColor: "#2563EB", price: "R$ 1.290/mês", mods: "9 módulos", tenants: "até 50 usuários" },
  { name: "Enterprise", chip: "Sob consulta", chipBg: "#F5F3FF", chipColor: "#7C3AED", price: "Personalizado", mods: "Todos os módulos", tenants: "usuários ilimitados" },
];

const MODULES: Module[] = [
  { name: "Ordens de Serviço", key: "work_orders", starter: true, pro: true, ent: true },
  { name: "Checklists Operacionais", key: "checklists", starter: true, pro: true, ent: true },
  { name: "Despacho e Rotas", key: "field_dispatch", starter: false, pro: true, ent: true },
  { name: "Estoque de Campo", key: "inventory", starter: false, pro: true, ent: true },
  { name: "Despesas / RDV", key: "expenses", starter: true, pro: true, ent: true },
  { name: "Analytics e BI", key: "analytics", starter: false, pro: false, ent: true },
  { name: "APIs e Integrações", key: "integrations", starter: false, pro: false, ent: true },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const grid4 = "2fr 1fr 1fr 1fr";

export function PlatformPlansModulesPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Planos e Módulos</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>controle de planos, módulos ativos e disponibilidade comercial</div>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><Plus size={15} />Novo plano</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
        {PLANS.map((p) => (
          <div key={p.name} style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</div>
              <span style={{ background: p.chipBg, color: p.chipColor, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>{p.chip}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px" }}>{p.price}</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 6 }}>{p.mods} · {p.tenants}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 15, fontWeight: 800 }}>Disponibilidade de módulos por plano</div>
        <div style={{ display: "grid", gridTemplateColumns: grid4, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".03em" }}>
          <span>MÓDULO</span><span style={{ textAlign: "center" }}>STARTER</span><span style={{ textAlign: "center" }}>PROFESSIONAL</span><span style={{ textAlign: "center" }}>ENTERPRISE</span>
        </div>
        {MODULES.map((m) => (
          <div key={m.key} style={{ display: "grid", gridTemplateColumns: grid4, padding: "13px 18px", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{m.key}</div>
            </div>
            <span style={{ textAlign: "center" }}>{m.starter ? <Check size={17} style={{ color: "#10B981" }} /> : null}</span>
            <span style={{ textAlign: "center" }}>{m.pro ? <Check size={17} style={{ color: "#10B981" }} /> : null}</span>
            <span style={{ textAlign: "center" }}>{m.ent ? <Check size={17} style={{ color: "#10B981" }} /> : null}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlatformPlansModulesPage;
