import { Boxes, ChevronLeft, Info, Users, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { usePlatformTenantDetail } from "../usePlatformTenantDetail";
import type { PlatformTenantDetailData, PlatformTenantDetailInfo } from "../platform-tenant-detail.types";

// PR-SCALE-5c — "Detalhe da Organização" (sc tenantDetail). Consome GET
// /api/v1/platform/tenants/:tenantId/detail via usePlatformTenantDetail, lendo o :tenantId REAL da rota
// (antes ignorava o parâmetro e mostrava o MESMO mock "Techsolutions BH" para qualquer org — violava
// D-007). NENHUM número fabricado: stats, módulos e usuários vêm SÓ do endpoint real. O backend não expõe
// MRR/uptime/saúde do sistema/endereço, então esses blocos são OMITIDOS honestamente — no lugar do par de
// cards MRR/uptime entra um SELO §7. §2.8: o id da organização só alimenta rota/fetch, nunca é exibido;
// e-mail/nome dos usuários são PII by-design desta tela platform-only. §3: "Organização", nunca "Tenant".
// Estados §7 (loading/forbidden/notFound/fallback/vazio) tratados antes da composição rica.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13 };
const th: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

function formatCreatedAt(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_FORMAT.format(date);
}

// Iniciais derivadas do NOME real da org (nada fabricado) para o avatar do cabeçalho.
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.slice(0, 2).map((part) => part[0] ?? "");
  return letters.join("").toUpperCase();
}

// Rótulo/cor PT-BR do status REAL da org (active/suspended/pending/blocked do backend). Sem termo técnico
// na UI (§3); status desconhecido → rótulo neutro (nunca exibe a string crua inglesa).
type StatusView = { label: string; color: string; bg: string; border: string; dot: string };
function orgStatusView(status: string): StatusView {
  switch (status) {
    case "active":
      return { label: "Ativa", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" };
    case "suspended":
      return { label: "Suspensa", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" };
    case "blocked":
      return { label: "Bloqueada", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" };
    case "pending":
      return { label: "Pendente", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" };
    default:
      return { label: "Indefinida", color: "#64748B", bg: "#F1F5F9", border: "#E2E8F0", dot: "#94A3B8" };
  }
}

// Status PT-BR do usuário (active/inactive do backend). Desconhecido → rótulo neutro (nunca a string crua).
function userStatusView(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case "active":
      return { label: "Ativo", color: "#059669", bg: "#ECFDF5" };
    case "inactive":
      return { label: "Inativo", color: "#94A3B8", bg: "#F1F5F9" };
    default:
      return { label: "Indefinido", color: "#64748B", bg: "#F1F5F9" };
  }
}

// Barra de topo comum a TODOS os estados: botão voltar honesto → console de organizações.
function DetailTopBar() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/platform/tenants")}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16, padding: "6px 10px 6px 6px", background: "none", border: "none", fontSize: 13, fontWeight: 700, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}
    >
      <ChevronLeft size={16} />
      Voltar para organizações
    </button>
  );
}

// Card de estatística REAL (só dado do endpoint). Sem variação/selo inventado.
type StatCardProps = { icon: LucideIcon; iconBg: string; iconColor: string; value: string; label: string; sub: string };
function StatCard({ icon: Icon, iconBg, iconColor, value, label, sub }: StatCardProps) {
  return (
    <div style={{ ...card, padding: 18 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, marginBottom: 14 }}>
        <Icon size={18} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 3, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{sub}</div>
    </div>
  );
}

// Composição rica com DADO REAL (cabeçalho + stats reais + selo honesto + módulos + usuários). Exportada
// para teste direto (render síncrono com dado real, sem depender do fetch assíncrono do hook).
export function PlatformTenantDetailView({ detail }: { detail: PlatformTenantDetailInfo }) {
  const status = orgStatusView(detail.status);

  return (
    <div style={{ color: "#0F172A" }}>
      <DetailTopBar />

      {/* Cabeçalho: avatar (iniciais reais) + nome + status + criada em (§11 rule 4) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#2563EB", flexShrink: 0 }}>
            {initialsFor(detail.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{detail.name}</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>
              {detail.slug ? <span style={{ fontWeight: 600 }}>{detail.slug}</span> : null}
              {detail.slug ? " · " : null}
              criada em {formatCreatedAt(detail.createdAt)}
            </div>
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 99, background: status.bg, border: `1px solid ${status.border}`, fontSize: 13, fontWeight: 700, color: status.color, flexShrink: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: status.dot }} />
          {status.label}
        </span>
      </div>

      {/* Stats REAIS + SELO HONESTO (MRR/uptime omitidos por não terem fonte — D-007) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        <StatCard
          icon={Users}
          iconBg="#ECFDF5"
          iconColor="#059669"
          value={String(detail.users.length)}
          label="Usuários"
          sub="cadastrados na organização"
        />
        <StatCard
          icon={Boxes}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          value={`${detail.modules.filter((m) => m.enabled).length} de ${detail.modules.length}`}
          label="Módulos habilitados"
          sub="do catálogo disponível"
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

      {/* Módulos contratados (catálogo REAL com flag habilitado/não) */}
      <div style={{ ...card, padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Módulos contratados</div>
        {detail.modules.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8" }}>Nenhum módulo cadastrado para esta organização.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {detail.modules.map((module) => (
              <span
                key={module.key}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, background: module.enabled ? "#ECFDF5" : "#F1F5F9", color: module.enabled ? "#059669" : "#94A3B8" }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: module.enabled ? "#10B981" : "#CBD5E1" }} />
                {module.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Usuários da organização (REAL — PII by-design da tela platform-only, §2.8) */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 15, fontWeight: 800 }}>Usuários</div>
        {detail.users.length === 0 ? (
          <div style={{ padding: "18px", fontSize: 13, color: "#94A3B8" }}>Nenhum usuário cadastrado nesta organização.</div>
        ) : (
          <>
            <div style={{ display: "flex", padding: "9px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
              <span style={{ ...th, flex: 1.8 }}>USUÁRIO</span>
              <span style={{ ...th, flex: 1.4 }}>PERFIL</span>
              <span style={{ ...th, flex: 0.6, textAlign: "right" }}>STATUS</span>
            </div>
            {detail.users.map((user, index) => {
              const userStatus = userStatusView(user.status);
              return (
                <div key={user.email} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: index === detail.users.length - 1 ? "none" : "1px solid #F8FAFC", gap: 10 }}>
                  <div style={{ flex: 1.8, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                  </div>
                  <span style={{ flex: 1.4, fontSize: 13, color: "#475569" }}>{user.roleLabel ?? "—"}</span>
                  <div style={{ flex: 0.6, display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: userStatus.bg, color: userStatus.color }}>{userStatus.label}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// Decisão de estados §7 → tela (pura; exportada para teste direto de cada estado sem o fetch do hook).
export function PlatformTenantDetailContent({ data, loading }: { data: PlatformTenantDetailData; loading: boolean }) {
  const { detail, forbidden, notFound, source } = data;

  // §7 — carregando: skeleton (sem inventar número enquanto a resposta não chega).
  if (loading) {
    return (
      <div style={{ color: "#0F172A" }}>
        <DetailTopBar />
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
        <DetailTopBar />
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar o detalhe desta organização. Fale com um administrador se precisar deste acesso."
        />
      </div>
    );
  }

  // §7 — não encontrada: backend respondeu 404 (organização inexistente) ou a rota veio sem id.
  if (notFound) {
    return (
      <div style={{ color: "#0F172A" }}>
        <DetailTopBar />
        <div style={{ ...card, padding: 8 }}>
          <EmptyState
            title="Organização não encontrada"
            detail="Não localizamos esta organização. Ela pode ter sido removida ou o endereço acessado está incorreto."
          />
        </div>
      </div>
    );
  }

  // §7 — falha de carregamento (5xx/rede): aviso honesto, sem dado fabricado. O auto-refresh tenta de novo.
  if (source === "fallback") {
    return (
      <div style={{ color: "#0F172A" }}>
        <DetailTopBar />
        <Alert title="Não foi possível carregar a organização" tone="warning">
          Houve uma falha ao buscar os dados desta organização. A tela volta a tentar automaticamente em alguns instantes — nenhum número é exibido enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      </div>
    );
  }

  // §7 — sem detalhe (inclui o modo demonstração/mock, sem dado real de plataforma).
  if (!detail) {
    return (
      <div style={{ color: "#0F172A" }}>
        <DetailTopBar />
        <div style={{ ...card, padding: 8 }}>
          <EmptyState
            title="Detalhe indisponível no modo demonstração"
            detail="O detalhe real da organização aparece aqui quando a plataforma está conectada aos dados de produção."
          />
        </div>
      </div>
    );
  }

  // Populado: dado REAL → composição rica (stats reais + selo honesto + módulos + usuários).
  return <PlatformTenantDetailView detail={detail} />;
}

export function PlatformTenantDetailPage() {
  const { tenantId } = useParams();
  const { data, loading } = usePlatformTenantDetail(tenantId);
  return <PlatformTenantDetailContent data={data} loading={loading} />;
}

export default PlatformTenantDetailPage;
