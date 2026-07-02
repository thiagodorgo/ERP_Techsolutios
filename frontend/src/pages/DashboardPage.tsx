import { Bell, CheckSquare, Download, ListChecks, MapPin, Plus, Send } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

// Dashboard Operacional (gestor). Alvo: screen-refs/web/dashboard-operacional.png.

type Tile = { n: string; label: string; color: string };
type Crit = { sla: string; slaColor: string; code: string; client: string; type: string; status: string; stBg: string; stColor: string };
type Alert = { title: string; meta: string; bg: string; color: string; icon: ReactNode };
type FieldOp = { initials: string; name: string; loc: string; dot: string; x: string; y: string };
type Ev = { who: string; action: string; tag: string; dot: string; time: string };

const TILES: Tile[] = [
  { n: "38", label: "OS abertas", color: "#2563EB" },
  { n: "7", label: "Em andamento", color: "#D97706" },
  { n: "3", label: "Atrasadas (SLA)", color: "#DC2626" },
  { n: "12", label: "Concluídas hoje", color: "#059669" },
  { n: "5", label: "Pend. aprovação", color: "#7C3AED" },
  { n: "9", label: "Checklists pend.", color: "#D97706" },
  { n: "4", label: "Evidências pend.", color: "#7C3AED" },
  { n: "12", label: "Operadores campo", color: "#2563EB" },
  { n: "2", label: "Localizações stale", color: "#DC2626" },
  { n: "6", label: "Não lidas", color: "#64748B" },
];

const CRIT: Crit[] = [
  { sla: "28 min", slaColor: "#DC2626", code: "OS-2891", client: "Indústria Alfa", type: "Reboque · veículo avariado", status: "SLA em risco", stBg: "#FEF2F2", stColor: "#DC2626" },
  { sla: "52 min", slaColor: "#D97706", code: "OS-2884", client: "Cooperativa AgroMax", type: "Assistência técnica", status: "Atenção", stBg: "#FFFBEB", stColor: "#D97706" },
  { sla: "1 h 10", slaColor: "#D97706", code: "OS-2879", client: "Logística Delta", type: "Guincho · pátio", status: "Atenção", stBg: "#FFFBEB", stColor: "#D97706" },
  { sla: "2 h 05", slaColor: "#059669", code: "OS-2872", client: "Minas Norte", type: "Prestador · elétrica", status: "No prazo", stBg: "#ECFDF5", stColor: "#059669" },
];

const ALERTS: Alert[] = [
  { title: "3 OS com SLA em risco", meta: "ação imediata recomendada", bg: "#FEF2F2", color: "#DC2626", icon: "!" },
  { title: "2 localizações desatualizadas", meta: "operadores sem ping há 30 min", bg: "#FFFBEB", color: "#D97706", icon: "◔" },
  { title: "5 aprovações pendentes", meta: "acima da alçada do operador", bg: "#F5F3FF", color: "#7C3AED", icon: "✓" },
  { title: "9 checklists a revisar", meta: "coleta/entrega aguardando", bg: "#EFF6FF", color: "#2563EB", icon: "≣" },
];

const FIELD: FieldOp[] = [
  { initials: "CN", name: "Carlos Nunes", loc: "Contagem/MG", dot: "#22C55E", x: "28%", y: "40%" },
  { initials: "BA", name: "Bruna Alves", loc: "BH · Centro", dot: "#2563EB", x: "62%", y: "30%" },
  { initials: "RS", name: "Rafael Silva", loc: "Betim/MG", dot: "#F59E0B", x: "45%", y: "68%" },
  { initials: "LM", name: "Lucas Melo", loc: "Sabará/MG", dot: "#EF4444", x: "78%", y: "58%" },
];

const EVENTS: Ev[] = [
  { who: "Carlos Nunes", action: "concluiu a OS-2870.", tag: "Concluído", dot: "#059669", time: "há 8 min" },
  { who: "Bruna Alves", action: "iniciou atendimento OS-2891.", tag: "Em campo", dot: "#2563EB", time: "há 21 min" },
  { who: "Sistema", action: "sinalizou SLA em risco em 3 OS.", tag: "Alerta", dot: "#DC2626", time: "há 34 min" },
  { who: "Rafael Silva", action: "enviou evidências da OS-2884.", tag: "Evidência", dot: "#7C3AED", time: "há 1 h" },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

export function DashboardPage() {
  const navigate = useNavigate();

  const quick: { label: string; icon: ReactNode; to: string; primary?: boolean }[] = [
    { label: "Nova OS", icon: <Plus size={16} />, to: "/work-orders/new", primary: true },
    { label: "Despachos", icon: <Send size={16} />, to: "/operations/dispatches" },
    { label: "Mapa", icon: <MapPin size={16} />, to: "/operations/map" },
    { label: "Checklists", icon: <ListChecks size={16} />, to: "/operations/checklists" },
    { label: "Notificações", icon: <Bell size={16} />, to: "/notifications" },
  ];

  return (
    <div style={{ color: "#0F172A" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Bom dia, Rafael.</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>operação, faturamento, estoque e aprovações · Techsolutions BH · 13 jun 2026</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><Download size={14} />Exportar</button>
          <button onClick={() => navigate("/approvals")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><CheckSquare size={14} />Aprovações</button>
          <button onClick={() => navigate("/work-orders/new")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Nova OS</button>
        </div>
      </div>

      {/* quick actions */}
      <div style={{ display: "flex", gap: 9, marginBottom: 16, flexWrap: "wrap" }}>
        {quick.map((q) => (
          <button key={q.label} onClick={() => navigate(q.to)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 15px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: q.primary ? "1px solid #2563EB" : "1px solid #E2E8F0", background: q.primary ? "#2563EB" : "#fff", color: q.primary ? "#fff" : "#475569" }}>
            {q.icon}{q.label}
          </button>
        ))}
      </div>

      {/* 10 tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 16 }}>
        {TILES.map((t) => (
          <div key={t.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 15px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.5px", lineHeight: 1 }}>{t.n}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", lineHeight: 1.3 }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* fila crítica + alertas */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Fila crítica</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>SLA em risco · ação imediata</div>
            </div>
            <span onClick={() => navigate("/work-orders")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}>Ver todas</span>
          </div>
          {CRIT.map((c) => (
            <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 0", borderTop: "1px solid #F1F5F9", cursor: "pointer" }}>
              <div style={{ width: 46, textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: c.slaColor, fontVariantNumeric: "tabular-nums" }}>{c.sla}</div>
                <div style={{ fontSize: 9.5, color: "#94A3B8", letterSpacing: ".05em" }}>SLA</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", fontFamily: "'JetBrains Mono', monospace" }}>{c.code}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{c.client}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{c.type}</div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: c.stBg, color: c.stColor, whiteSpace: "nowrap", flexShrink: 0 }}>{c.status}</span>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Alertas operacionais</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>Requerem atenção agora</div>
          {ALERTS.map((a) => (
            <div key={a.title} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 0", borderTop: "1px solid #F1F5F9", cursor: "pointer" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0, fontWeight: 800 }}>{a.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{a.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* status de campo + últimos eventos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Status de campo</div>
            <span onClick={() => navigate("/operations/map")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}>Abrir mapa</span>
          </div>
          <div style={{ position: "relative", height: 118, borderRadius: 11, overflow: "hidden", background: "linear-gradient(135deg,#EFF4FB,#E4EBF5)", border: "1px solid #E2E8F0", marginBottom: 12 }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#dbe4f0 1px,transparent 1px),linear-gradient(90deg,#dbe4f0 1px,transparent 1px)", backgroundSize: "24px 24px", opacity: 0.6 }} />
            {FIELD.map((f) => (
              <div key={f.initials} style={{ position: "absolute", left: f.x, top: f.y, transform: "translate(-50%,-50%)", width: 24, height: 24, borderRadius: "50%", background: "#fff", border: `2px solid ${f.dot}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 800, color: f.dot, boxShadow: "0 2px 6px rgba(15,23,41,.18)" }}>{f.initials}</div>
            ))}
          </div>
          {FIELD.map((f) => (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: "1px solid #F1F5F9" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: f.dot, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{f.name}</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{f.loc}</span>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Últimos eventos</div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}>Ver tudo</span>
          </div>
          {EVENTS.map((a, i) => (
            <div key={a.who + a.time} style={{ display: "flex", gap: 11, paddingBottom: 13 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: a.dot, marginTop: 4 }} />
                {i < EVENTS.length - 1 ? <div style={{ flex: 1, width: 1.5, background: "#E2E8F0", marginTop: 4 }} /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.4 }}><strong style={{ fontWeight: 700 }}>{a.who}</strong> {a.action}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: a.dot }}>{a.tag}</span><span>·</span><span>{a.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
