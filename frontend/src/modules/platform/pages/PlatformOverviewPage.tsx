import { Building2, Info, Users, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { usePlatformOverview } from "../usePlatformOverview";
import type { PlatformOverviewData, PlatformOverviewOrg } from "../platform-overview.types";

// PR-SCALE-5a — "Visão Geral da Plataforma" (sc platformDashboard). Consome GET /api/v1/platform/overview
// via usePlatformOverview. D-007: NENHUM número fabricado — KPIs e tabela vêm SÓ do endpoint real. O
// backend não expõe receita/uptime/atividade, então esses blocos são OMITIDOS honestamente: no lugar do
// par de cards de MRR/uptime entra um SELO §7 ("Receita e disponibilidade — após a ativação cloud"), e o
// gráfico de receita + o feed de atividade fabricados foram REMOVIDOS. §2.8: o id da organização só
// alimenta o link de rota, nunca é exibido. §3: "Organização", nunca "Tenant". Estados §7 tratados antes
// da composição rica.

const SUBTITLE = "governança e saúde das organizações da plataforma";

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13 };
const th: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };

const NUMBER_FORMAT = new Intl.NumberFormat("pt-BR");
const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

function formatCount(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function formatCreatedAt(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_FORMAT.format(date);
}

// Rótulo/cor PT-BR do status REAL da organização (active/suspended/pending do backend). Sem termo técnico
// na UI (§3); status desconhecido → rótulo neutro (nunca exibe a string crua inglesa).
type StatusView = { label: string; color: string; dot: string };
function statusView(status: string): StatusView {
  switch (status) {
    case "active":
      return { label: "Ativa", color: "#059669", dot: "#22C55E" };
    case "suspended":
      return { label: "Suspensa", color: "#DC2626", dot: "#EF4444" };
    case "pending":
      return { label: "Pendente", color: "#D97706", dot: "#F59E0B" };
    default:
      return { label: "Indefinida", color: "#64748B", dot: "#94A3B8" };
  }
}

// Cabeçalho comum a todos os estados: título + subtítulo + ação primária (§11 rule 4). "Ver organizações"
// navega ao console real (/platform/tenants) — ação honesta e funcional, sem botão fantasma.
function PlatformHeader() {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Visão Geral da Plataforma</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>{SUBTITLE}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => navigate("/platform/tenants")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
        >
          <Building2 size={14} />
          Ver organizações
        </button>
      </div>
    </div>
  );
}

// Card de KPI REAL (mesmo visual da referência), alimentado só por dado do endpoint.
type KpiCardProps = { icon: LucideIcon; iconBg: string; iconColor: string; risk: string; riskBg: string; riskColor: string; value: string; label: string; sub: string; subColor: string };
function KpiCard({ icon: Icon, iconBg, iconColor, risk, riskBg, riskColor, value, label, sub, subColor }: KpiCardProps) {
  return (
    <div style={{ ...card, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
          <Icon size={18} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: riskBg, color: riskColor }}>{risk}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 3, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: subColor }}>{sub}</div>
    </div>
  );
}

// Composição rica com DADO REAL (KPIs + selo honesto de omissão + tabela de organizações). Exportada para
// teste direto (render síncrono com dado real, sem depender do fetch assíncrono do hook).
export function PlatformOverviewView({ data }: { data: PlatformOverviewData }) {
  const navigate = useNavigate();
  const { activeOrgs, totalOrgs, totalUsers, orgs } = data;

  return (
    <div style={{ color: "#0F172A" }}>
      <PlatformHeader />

      {/* KPIs REAIS + SELO HONESTO (receita/uptime omitidos por não terem fonte — D-007) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        <KpiCard
          icon={Building2}
          iconBg="#F1F5F9"
          iconColor="#334155"
          risk="Ativas"
          riskBg="#ECFDF5"
          riskColor="#059669"
          value={formatCount(activeOrgs)}
          label="Organizações ativas"
          sub={`de ${formatCount(totalOrgs)} organizações`}
          subColor="#64748B"
        />
        <KpiCard
          icon={Users}
          iconBg="#ECFDF5"
          iconColor="#059669"
          risk="Total"
          riskBg="#ECFDF5"
          riskColor="#059669"
          value={formatCount(totalUsers)}
          label="Usuários totais"
          sub="somando todas as organizações"
          subColor="#64748B"
        />
        {/* Selo §7: receita e disponibilidade não têm fonte real ainda — dito com honestidade, sem número
            fabricado no lugar. Ocupa as duas colunas do antigo par MRR/uptime. */}
        <div style={{ ...card, gridColumn: "span 2", padding: 18, background: "#F8FAFC", borderStyle: "dashed", display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flexShrink: 0 }}>
            <Info size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Receita e disponibilidade</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, lineHeight: 1.45 }}>
              Métricas de receita recorrente e disponibilidade ficam disponíveis após a ativação da infraestrutura cloud — nenhuma estimativa é exibida enquanto não houver medição real.
            </div>
          </div>
        </div>
      </div>

      {/* ORGANIZAÇÕES (dado REAL do endpoint) */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Organizações</div>
          <button
            type="button"
            onClick={() => navigate("/platform/tenants")}
            style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", background: "none", border: "none", padding: 0, fontFamily: "inherit" }}
          >
            Ver todas
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
          <span style={{ ...th, flex: 2.4 }}>NOME</span>
          <span style={{ ...th, flex: 1.2 }}>STATUS</span>
          <span style={{ ...th, flex: 0.9, textAlign: "right" }}>USUÁRIOS</span>
          <span style={{ ...th, flex: 0.9, textAlign: "right" }}>MÓDULOS</span>
          <span style={{ ...th, flex: 1.1, textAlign: "right" }}>CRIADA EM</span>
        </div>
        {orgs.map((org: PlatformOverviewOrg, index) => {
          const status = statusView(org.status);
          return (
            <div
              key={org.id}
              onClick={() => navigate(`/platform/tenants/${org.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/platform/tenants/${org.id}`);
                }
              }}
              style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: index === orgs.length - 1 ? "none" : "1px solid #F8FAFC", gap: 10, cursor: "pointer" }}
            >
              <div style={{ flex: 2.4, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flexShrink: 0 }}>
                  <Building2 size={14} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{org.name}</span>
              </div>
              <div style={{ flex: 1.2, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: status.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: status.color }}>{status.label}</span>
              </div>
              <span style={{ flex: 0.9, fontSize: 13, color: "#475569", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCount(org.userCount)}</span>
              <span style={{ flex: 0.9, fontSize: 13, color: "#475569", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCount(org.moduleCount)}</span>
              <span style={{ flex: 1.1, fontSize: 12.5, color: "#64748B", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCreatedAt(org.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlatformOverviewPage() {
  const { data, loading } = usePlatformOverview();
  const { orgs, forbidden, source } = data;

  // §7 — carregando: skeleton (sem inventar número enquanto a resposta não chega).
  if (loading) {
    return (
      <div style={{ color: "#0F172A" }}>
        <PlatformHeader />
        <div style={{ ...card, padding: 20 }}>
          <Skeleton lines={6} />
        </div>
      </div>
    );
  }

  // §7 — acesso não permitido: gate `platform:tenants:read` respondeu 403. Não é erro de sistema.
  if (forbidden) {
    return (
      <div style={{ color: "#0F172A" }}>
        <PlatformHeader />
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar a visão geral da plataforma. Fale com um administrador se precisar deste acesso."
        />
      </div>
    );
  }

  // §7 — falha de carregamento (5xx/rede): aviso honesto, sem dado fabricado. O auto-refresh tenta de novo.
  if (source === "fallback") {
    return (
      <div style={{ color: "#0F172A" }}>
        <PlatformHeader />
        <Alert title="Não foi possível carregar a visão geral" tone="warning">
          Houve uma falha ao buscar os dados da plataforma. A tela volta a tentar automaticamente em alguns instantes — nenhum número é exibido enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      </div>
    );
  }

  // §7 — vazio: nenhuma organização (inclui o modo demonstração/mock, sem dado real de plataforma).
  if (orgs.length === 0) {
    return (
      <div style={{ color: "#0F172A" }}>
        <PlatformHeader />
        <div style={{ ...card, padding: 8 }}>
          <EmptyState
            title="Nenhuma organização"
            detail="Ainda não há organizações cadastradas na plataforma. Assim que uma for criada, ela aparecerá aqui com seus indicadores reais."
          />
        </div>
      </div>
    );
  }

  // Populado: dado REAL → composição rica (KPIs reais + selo honesto + tabela de organizações).
  return <PlatformOverviewView data={data} />;
}

export default PlatformOverviewPage;
