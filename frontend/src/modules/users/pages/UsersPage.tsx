import { AlertTriangle, Ban, Plus, RotateCcw, ScrollText, Search, ShieldCheck, UserCheck, Users, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DENSE_LIST_FETCH_LIMIT } from "../../../components/dense-list";
import { InitialsAvatar, KpiStatCard, PageHeader, StatusPill, TablePager } from "../../../components/patterns";
import { Button, Modal, rowClickProps } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { UserFormModal } from "../components/UserFormModal";
import { filterUsers, formatUserDate, getUserStatusLabel, interpretUserSubmitError, roleLabel } from "../users.adapter";
import { updateUser } from "../users.service";
import type { User, UsersFilters, UsersStatusFilter, UserStatus } from "../users.types";
import { useUsers } from "../useUsers";

// "Usuários" — PR-C TELAS PADRONIZADAS. Reproduz o bloco `sc_users` do protótipo
// "ERP Web - Telas Padronizadas.dc.html" com os DADOS REAIS de /api/v1/users (useUsers + adapter).
// Nenhum número é fabricado (D-007). Degradações honestas documentadas inline:
//  · "ÚLTIMO ACESSO" do design não existe no contrato (o DTO só traz createdAt) → a coluna é
//    "CRIADO EM" (data real + relativo derivado). Pendência: last_login no DTO (P-USERS-LAST-ACCESS).
//  · "Convites pendentes" do design: o enum REAL é active|inactive (invited é só tolerância
//    defensiva) → o 3º KPI é "Inativos" (derivável); convites reais aparecem no hint se surgirem.
//  · "Ativos: acessaram nos últimos 30 dias" do design não é derivável → critério real é a
//    SITUAÇÃO ativa, com hint honesto.
//  · Os 3 primeiros KPIs são também o filtro REAL de situação (capacidade das antigas tabs
//    Todos/Ativos/Inativos preservada); o seletor de perfil filtra pelos papéis reais da janela.

const STABLE_FILTERS: UsersFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

// Tons do design (sc_users, mapa US): pill de situação com dot.
const STATUS_TONE: Record<UserStatus, { bg: string; fg: string; dot: string }> = {
  active: { bg: "#DCFCE7", fg: "#15803D", dot: "#22C55E" },
  invited: { bg: "#FEF3C7", fg: "#B45309", dot: "#F59E0B" },
  inactive: { bg: "#F1F5F9", fg: "#64748B", dot: "#94A3B8" },
};

// Tons do design (mapa RC) por CHAVE real de papel; papéis fora do design usam a família
// semântica mais próxima (finance → verde; field_dispatcher → família de campo) e o
// desconhecido cai no neutro (mesmo fallback do protótipo).
const ROLE_TONE: Record<string, { bg: string; fg: string }> = {
  tenant_admin: { bg: "#F3E8FF", fg: "#7E22CE" },
  super_admin: { bg: "#F3E8FF", fg: "#7E22CE" },
  platform_admin: { bg: "#F3E8FF", fg: "#7E22CE" },
  manager: { bg: "#EFF6FF", fg: "#2563EB" },
  operator: { bg: "#F0F9FF", fg: "#0369A1" },
  technician: { bg: "#F0F9FF", fg: "#0369A1" },
  field_technician: { bg: "#F0FDF4", fg: "#15803D" },
  field_dispatcher: { bg: "#F0FDF4", fg: "#15803D" },
  inventory: { bg: "#FFFBEB", fg: "#B45309" },
  support: { bg: "#EFF6FF", fg: "#2563EB" },
  finance: { bg: "#F0FDF4", fg: "#15803D" },
  auditor: { bg: "#F1F5F9", fg: "#475569" },
  viewer: { bg: "#F1F5F9", fg: "#475569" },
};
const ROLE_TONE_FALLBACK = { bg: "#F1F5F9", fg: "#475569" };

// Papéis com acesso total (selo roxo do design) — chaves administrativas reais (RBAC_MATRIX).
const ADMIN_ROLES = new Set(["tenant_admin", "super_admin", "platform_admin"]);

const DAY_MS = 86_400_000;

/** Relativo REAL derivado de createdAt ("hoje", "há 3 dias", "há 2 meses") — nunca fabricado. */
function relativeSince(iso: string, now: Date): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.floor((now.getTime() - date.getTime()) / DAY_MS);
  if (days < 0) return null;
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "há 1 mês" : `há ${months} meses`;
  const years = Math.floor(days / 365);
  return years <= 1 ? "há 1 ano" : `há ${years} anos`;
}

function isAdminUser(user: User): boolean {
  return user.roles.some((role) => ADMIN_ROLES.has(role.trim().toLowerCase()));
}

export function UsersPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useUsers(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UsersStatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [editing, setEditing] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = can("users.manage");
  // Trilha de auditoria visível para quem enxerga auditoria (auditor/tenant_admin/manager/support).
  const canSeeAudit = can("audit.read") || can("audit:read");

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  // Ativação/desativação lógica (PATCH status) com confirmação (capacidade preservada da tela antiga).
  async function confirmToggle() {
    const target = pendingToggle;
    if (!target) return;
    setBusyId(target.id);
    setActionError(null);
    try {
      await updateUser(context, target.id, { status: target.status === "active" ? "inactive" : "active" });
      setPendingToggle(null);
      await refresh();
    } catch (submitError) {
      const feedback = interpretUserSubmitError(submitError, "update");
      setActionError(feedback.message);
    } finally {
      setBusyId(null);
    }
  }

  // KPIs 100% derivados da janela REAL carregada (D-007 — nada fabricado).
  const stats = useMemo(() => {
    let ativos = 0;
    let inativos = 0;
    let convidados = 0;
    let admins = 0;
    let novosNoMes = 0;
    const cutoff = Date.now() - 30 * DAY_MS;
    for (const user of items) {
      if (user.status === "active") ativos += 1;
      else if (user.status === "invited") convidados += 1;
      else inativos += 1;
      if (isAdminUser(user)) admins += 1;
      const created = new Date(user.createdAt).getTime();
      if (Number.isFinite(created) && created >= cutoff) novosNoMes += 1;
    }
    return { total: items.length, ativos, inativos, convidados, admins, novosNoMes };
  }, [items]);

  // Opções REAIS do seletor de perfil: só papéis presentes na janela carregada (nunca inventadas).
  const roleOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const user of items) for (const role of user.roles) keys.add(role);
    return [...keys]
      .map((value) => ({ value, label: roleLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [items]);

  const now = new Date();
  const filtered = useMemo(() => {
    const base = filterUsers(items, { search, isActive: status });
    return roleFilter === "all" ? base : base.filter((user) => user.roles.includes(roleFilter));
  }, [items, search, status, roleFilter]);

  // Paginação client-side (TablePager padronizado); página "clampada" quando o filtro encolhe.
  const total = filtered.length;
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const effectivePage = Math.min(page, maxPage);
  const start = effectivePage * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageItems = filtered.slice(start, end);

  // Janela parcial (o hook carrega os primeiros N do servidor) — declarada no pager e no hint do KPI.
  const windowPartial = pagination.total > items.length;

  const hasFilters = Boolean(search.trim()) || status !== "all" || roleFilter !== "all";
  const kpiSkeleton = loading && items.length === 0;

  // Os 3 primeiros KPIs filtram por situação (toggle) — capacidade das antigas tabs preservada.
  const toggleStatus = (value: UsersStatusFilter) => {
    setStatus((current) => (current === value ? "all" : value));
    setPage(0);
  };

  return (
    <div style={{ color: "#0F172A" }}>
      <PageHeader
        kicker="ADMINISTRAÇÃO"
        title="Usuários"
        subtitle="Quem acessa a organização, com qual perfil e desde quando — com trilha de auditoria."
        actions={
          <>
            <div className="pat-header-search">
              <Search size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Buscar por nome ou e-mail…"
                aria-label="Buscar por nome ou e-mail"
              />
            </div>
            <select
              className="pat-select"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPage(0);
              }}
              aria-label="Filtrar por perfil de acesso"
            >
              <option value="all">Todos os perfis</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {canManage ? (
              <button type="button" className="pat-btn pat-btn--primary" onClick={openCreate}>
                <Plus size={15} aria-hidden="true" />
                Novo usuário
              </button>
            ) : null}
          </>
        }
      />

      {/* KPIs de decisão — contagens reais da janela; os 3 primeiros também filtram a lista */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 14 }} aria-live="polite">
        {kpiSkeleton ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="pat-kpi" aria-hidden="true">
              <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
              <div className="pat-skel" style={{ width: 54, height: 24, marginTop: 12 }} />
              <div className="pat-skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
            </div>
          ))
        ) : (
          <>
            <KpiStatCard
              icon={Users}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
              value={stats.total}
              label="Usuários com acesso"
              hint={
                windowPartial
                  ? `primeiros ${items.length} de ${pagination.total} carregados`
                  : `na organização ${activeContext?.tenantName ?? "ativa"}`
              }
              tag={stats.novosNoMes > 0 ? { label: `+${stats.novosNoMes} no mês`, bg: "#DCFCE7", fg: "#15803D" } : undefined}
              onClick={() => toggleStatus("all")}
              ariaLabel="Mostrar todos os usuários"
            />
            <KpiStatCard
              icon={UserCheck}
              iconColor="#15803D"
              iconBg="#F0FDF4"
              value={stats.ativos}
              label="Ativos"
              hint="com situação ativa na organização"
              tag={stats.total > 0 ? { label: `${Math.round((stats.ativos / stats.total) * 100)}% do total`, bg: "#DCFCE7", fg: "#15803D" } : undefined}
              border={status === "active" ? "#93C5FD" : undefined}
              onClick={() => toggleStatus("active")}
              ariaLabel={status === "active" ? "Remover o filtro de usuários ativos" : "Mostrar somente usuários ativos"}
            />
            {/* 3º slot do design ("Convites pendentes") → "Inativos": o enum real é active|inactive.
                Convites reais (se o backend passar a emitir) aparecem no hint — nunca fabricados. */}
            <KpiStatCard
              icon={UserX}
              iconColor="#B45309"
              iconBg="#FFFBEB"
              value={stats.inativos}
              label="Inativos"
              hint={stats.convidados > 0 ? `${stats.convidados} convite(s) aguardando primeiro acesso` : "sem acesso até serem reativados"}
              tag={stats.inativos > 0 ? { label: "revisar", bg: "#FEF3C7", fg: "#B45309" } : { label: "nenhum", bg: "#DCFCE7", fg: "#15803D" }}
              border={status === "inactive" ? "#93C5FD" : undefined}
              onClick={() => toggleStatus("inactive")}
              ariaLabel={status === "inactive" ? "Remover o filtro de usuários inativos" : "Mostrar somente usuários inativos"}
            />
            <KpiStatCard
              icon={ShieldCheck}
              iconColor="#7E22CE"
              iconBg="#FAF5FF"
              value={stats.admins}
              label="Com acesso total"
              hint="perfis administrativos"
              tag={stats.admins > 0 ? { label: "revisar", bg: "#F3E8FF", fg: "#7E22CE" } : undefined}
            />
          </>
        )}
      </div>

      {error ? (
        <div role="alert" className="pat-banner pat-banner--warning">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Não foi possível carregar os usuários.</span>
          <button type="button" className="pat-link" onClick={() => void refresh()}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      {actionError ? (
        <div role="alert" className="pat-banner pat-banner--error">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {/* Tabela padronizada (card 14px, grade do design) */}
      <div className="pat-table">
        <div className="pat-table__head pat-users-grid" aria-hidden="true">
          <div>USUÁRIO</div>
          <div>PERFIL DE ACESSO</div>
          <div>SITUAÇÃO</div>
          <div>CRIADO EM</div>
          <div style={{ textAlign: "right" }}>AÇÕES</div>
        </div>

        {loading && items.length === 0 ? (
          [0, 1, 2, 3].map((index) => (
            <div key={index} className="pat-table__row pat-users-grid" aria-hidden="true">
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
            </div>
          ))
        ) : !error && total === 0 ? (
          <div className="pat-table__empty">
            <div className="pat-table__empty-title">Nenhum usuário encontrado</div>
            <div className="pat-table__empty-detail">
              {hasFilters
                ? "Ajuste a busca ou os filtros para encontrar usuários."
                : "Cadastre o primeiro usuário para dar acesso à organização."}
            </div>
          </div>
        ) : (
          pageItems.map((user) => {
            const tone = STATUS_TONE[user.status] ?? STATUS_TONE.inactive;
            const since = relativeSince(user.createdAt, now);
            const admin = isAdminUser(user);
            return (
              // Padrão "linha clicável" (2026-08-24): a linha abre o cadastro do usuário — o mesmo modal
              // que o lápis abria, e por isso o lápis saiu. FAIL-HONESTO: sem `users.manage` não há nada
              // para abrir (não existe tela de detalhe de usuário), então a linha fica estática — sem
              // cursor, sem realce, sem foco por teclado.
              <div
                key={user.id}
                {...rowClickProps({ role: "button",
                  className: "pat-table__row pat-users-grid",
                  onOpen: canManage ? () => openEdit(user) : null,
                  label: `Abrir o cadastro de ${user.name}`,
                })}
              >
                {/* USUÁRIO — avatar de iniciais + nome + e-mail */}
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <InitialsAvatar name={user.name} size={34} />
                  <span style={{ minWidth: 0 }}>
                    <span className="pat-cell-main">{user.name}</span>
                    {user.email ? <span className="pat-cell-sub">{user.email}</span> : null}
                  </span>
                </div>

                {/* PERFIL DE ACESSO — um chip por papel REAL + selo "acesso total" p/ administradores */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flexWrap: "wrap" }}>
                  {user.roles.length === 0 ? (
                    <span className="pat-cell-sub">—</span>
                  ) : (
                    user.roles.map((role) => {
                      const roleTone = ROLE_TONE[role.trim().toLowerCase()] ?? ROLE_TONE_FALLBACK;
                      return (
                        <span key={role} className="pat-role-chip" style={{ background: roleTone.bg, color: roleTone.fg }}>
                          {roleLabel(role)}
                        </span>
                      );
                    })
                  )}
                  {admin ? <span className="pat-admin-badge">acesso total</span> : null}
                </div>

                {/* SITUAÇÃO — pill com dot (tamanho base: precedente da junta do PR-B) */}
                <div>
                  <StatusPill label={getUserStatusLabel(user.status)} bg={tone.bg} fg={tone.fg} dot={tone.dot} />
                </div>

                {/* CRIADO EM — dado temporal REAL do contrato (último acesso não existe no DTO) */}
                <div>
                  <div style={{ fontSize: 12.5, color: "#334155", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {formatUserDate(user.createdAt)}
                  </div>
                  {since ? <div style={{ fontSize: 11, color: "#94A3B8" }}>{since}</div> : null}
                </div>

                {/* AÇÕES — só o que NÃO é o clique da linha: desativar/reativar acesso e a trilha de
                    auditoria. O lápis "Editar" saiu (padrão "linha clicável", 2026-08-24). */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 5 }}>
                  {canManage ? (
                    <button
                      type="button"
                      className={user.status === "active" ? "pat-icon-btn pat-icon-btn--danger" : "pat-icon-btn"}
                      disabled={busyId === user.id}
                      title={user.status === "active" ? "Desativar acesso" : "Reativar acesso"}
                      aria-label={user.status === "active" ? `Desativar ${user.name}` : `Reativar ${user.name}`}
                      onClick={() => setPendingToggle(user)}
                    >
                      {user.status === "active" ? <Ban size={14} aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />}
                    </button>
                  ) : null}
                  {canSeeAudit ? (
                    <Link
                      className="pat-icon-btn"
                      to={`/audit?actorId=${user.id}`}
                      title="Ver auditoria deste usuário"
                      aria-label={`Ver auditoria de ${user.name}`}
                    >
                      <ScrollText size={14} aria-hidden="true" />
                    </Link>
                  ) : null}
                  {!canManage && !canSeeAudit ? <span className="pat-cell-sub">—</span> : null}
                </div>
              </div>
            );
          })
        )}

        {!loading && !error && total > 0 ? (
          <TablePager
            pageSize={pageSize}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(0);
            }}
            rangeLabel={`${start + 1}–${end} de ${total}${windowPartial ? ` (de ${pagination.total} no total)` : ""}`}
            onPrev={() => setPage(Math.max(0, effectivePage - 1))}
            onNext={() => setPage(Math.min(maxPage, effectivePage + 1))}
            canPrev={effectivePage > 0}
            canNext={end < total}
          />
        ) : null}
      </div>

      {modalOpen ? (
        <UserFormModal
          key={editing?.id ?? "new"}
          user={editing}
          context={context}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            void refresh();
          }}
        />
      ) : null}

      {pendingToggle ? (
        <Modal
          title={pendingToggle.status === "active" ? "Desativar usuário" : "Ativar usuário"}
          open
          onClose={() => setPendingToggle(null)}
        >
          <p>
            {pendingToggle.status === "active"
              ? `Desativar o acesso de ${pendingToggle.name}? A pessoa deixa de entrar na organização até ser reativada.`
              : `Reativar o acesso de ${pendingToggle.name}?`}
          </p>
          <footer style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" }}>
            <Button type="button" variant="ghost" onClick={() => setPendingToggle(null)} disabled={busyId === pendingToggle.id}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={pendingToggle.status === "active" ? "danger" : "primary"}
              disabled={busyId === pendingToggle.id}
              onClick={() => void confirmToggle()}
            >
              {busyId === pendingToggle.id ? "Salvando…" : pendingToggle.status === "active" ? "Desativar" : "Ativar"}
            </Button>
          </footer>
        </Modal>
      ) : null}
    </div>
  );
}

export default UsersPage;
