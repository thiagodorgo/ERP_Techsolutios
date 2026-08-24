import { AlertTriangle, Ban, Download, FileText, Filter, KeyRound, UserRoundSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { InitialsAvatar, KpiStatCard, PageHeader } from "../../../components/patterns";
import { ErrorState } from "../../../components/ui";
import { rowClickProps } from "../../../components/ui/clickable-row";
import { downloadCsv } from "../../../lib/csv";
import {
  auditActionMeta,
  auditActorPresentation,
  computeAuditKpis,
  formatEventTime,
  groupAuditEventsByDay,
} from "../audit-events.presenter";
import { useAuditEvents, type AuditFilters } from "../useAuditEvents";
import type { AuditEventView } from "../audit-events.types";

// "Auditoria" — PR-C TELAS PADRONIZADAS. Reproduz o bloco `sc_audit` do protótipo
// "ERP Web - Telas Padronizadas.dc.html" com os DADOS REAIS de GET /api/v1/audit-events
// (useAuditEvents + adapter — contratos intocados). Nenhum evento/número fabricado (D-007).
// Degradações honestas documentadas inline:
//  · Coluna "ORIGEM" (dispositivo + IP) OMITIDA: o DTO real é a allowlist §2.8
//    {id, action, actor_user_id, timestamp} — metadata (ipAddress/userAgent) NUNCA sai do backend.
//  · "QUEM" sem nome/perfil: o DTO só traz o id opaco do ator → exibimos "Usuário" com cor
//    determinística por ator (NUNCA UUID cru na UI; o CSV exportado preserva o id para correlação).
//    Pendência: nome do ator no DTO (P-AUD-ACTOR-NAME).
//  · "Últimas 24 horas" do design → "Hoje" (o filtro real é por data, não por hora).
//  · "DETALHE" do design não tem destino real → a coluna de ação filtra pelos eventos do ator
//    (usa o filtro server-side REAL já existente).
//  · KPIs derivados das actions REAIS da janela carregada (auth.login/logout/session/refresh).

const PAGE_TEXT = {
  emptyFiltered: "Nenhum evento para o filtro",
  empty: "Sem eventos de auditoria",
};

// Exporta SOMENTE os eventos reais carregados (nunca dado fabricado). Delega ao util compartilhado
// (BOM UTF-8, `;`, `\r\n` — D-Ω4C-REM-CSV). §2.8: o CSV só carrega o que o view já expõe.
function exportAuditCsv(events: readonly AuditEventView[]): void {
  const header = ["Quando", "Ator", "Evento"];
  const rows = events.map((event) => [event.when, event.actor, event.action]);
  downloadCsv("auditoria.csv", header, rows);
}

// ── Seletor de período (real: escreve nos filtros de data server-side do hook) ──
type PeriodKey = "all" | "today" | "7d" | "30d" | "custom";

const PERIOD_OPTIONS: readonly { key: Exclude<PeriodKey, "custom">; label: string }[] = [
  { key: "all", label: "Todo o período" },
  { key: "today", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
];

const PERIOD_HINT: Record<PeriodKey, string> = {
  all: "todo o período registrado",
  today: "eventos de hoje",
  "7d": "últimos 7 dias",
  "30d": "últimos 30 dias",
  custom: "período personalizado",
};

function localDateString(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function periodRange(key: Exclude<PeriodKey, "custom">, now: Date): { from: string; to: string } {
  if (key === "all") return { from: "", to: "" };
  const today = localDateString(now);
  if (key === "today") return { from: today, to: today };
  const days = key === "7d" ? 6 : 29;
  return { from: localDateString(new Date(now.getTime() - days * 86_400_000)), to: "" };
}

function derivePeriod(filters: AuditFilters, now: Date): PeriodKey {
  if (!filters.from && !filters.to) return "all";
  for (const option of PERIOD_OPTIONS) {
    if (option.key === "all") continue;
    const range = periodRange(option.key, now);
    if (filters.from === range.from && filters.to === range.to) return option.key;
  }
  return "custom";
}

// Junta PR-C (MÉDIA-1) — id opaco de ator NUNCA ecoa cru na UI (§2.8/§11): vira chip "Filtrando por 1 usuário".
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AuditTenantPage() {
  const { data, loading, isRefreshing, refresh, filters, setFilter, clearFilters, loadMore, hasMore, hasActiveFilters } = useAuditEvents();
  const { events, forbidden, source } = data;
  const [filtersOpen, setFiltersOpen] = useState(true);
  // Junta PR-C (MÉDIA-2) — deeplink real: /audit?actorId=<id> (vindo de "Ver auditoria deste usuário" na tela de
  // Usuários) semeia o filtro por ator no mount e some da URL (replace) — o id fica só no estado.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const seeded = searchParams.get("actorId");
    if (seeded && UUID_RE.test(seeded)) {
      setFilter("actorId", seeded);
      const next = new URLSearchParams(searchParams);
      next.delete("actorId");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só no mount (seed único do deeplink)
  }, []);
  // Ações REAIS já vistas nesta sessão (para o seletor "Tipo de evento" não encolher ao filtrar).
  const [knownActions, setKnownActions] = useState<readonly string[]>([]);

  useEffect(() => {
    setKnownActions((current) => {
      const merged = new Set(current);
      for (const event of events) merged.add(event.action);
      return merged.size === current.length ? current : [...merged];
    });
  }, [events]);

  const now = new Date();
  const kpis = useMemo(() => computeAuditKpis(events), [events]);
  const groups = useMemo(() => groupAuditEventsByDay(events), [events]);
  const period = derivePeriod(filters, now);

  // Opções do seletor de tipo: ações reais conhecidas (+ a filtrada, se veio de fora), rotuladas em PT-BR.
  const actionOptions = useMemo(() => {
    const values = new Set(knownActions);
    if (filters.action) values.add(filters.action);
    return [...values]
      .map((value) => ({ value, label: auditActionMeta(value).label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [knownActions, filters.action]);

  // §7 — acesso não permitido: gate `audit.read` respondeu 403. Não é erro de sistema.
  if (forbidden) {
    return (
      <div style={{ color: "#0F172A" }}>
        <PageHeader kicker="ADMINISTRAÇÃO" title="Auditoria" subtitle="Trilha de acessos, alterações sensíveis e eventos críticos da organização." />
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar a trilha de auditoria desta organização. Fale com um administrador se precisar deste acesso."
        />
      </div>
    );
  }

  const canExport = events.length > 0;
  const kpiSkeleton = loading && events.length === 0;

  function applyPeriod(key: string) {
    const option = PERIOD_OPTIONS.find((candidate) => candidate.key === key);
    if (!option) return;
    const range = periodRange(option.key, new Date());
    setFilter("from", range.from);
    setFilter("to", range.to);
  }

  return (
    <div style={{ color: "#0F172A" }}>
      <PageHeader
        kicker="ADMINISTRAÇÃO"
        title="Auditoria"
        subtitle="Trilha de acessos, alterações sensíveis e eventos críticos da organização."
        actions={
          <>
            <select
              className="pat-select"
              value={period}
              onChange={(event) => applyPeriod(event.target.value)}
              aria-label="Filtrar por período"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
              {period === "custom" ? <option value="custom">Período personalizado</option> : null}
            </select>
            <button
              type="button"
              className="pat-btn"
              aria-expanded={filtersOpen}
              aria-controls="audit-filtros"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Filter size={15} aria-hidden="true" />
              Filtros
            </button>
            <button
              type="button"
              className="pat-btn pat-btn--primary"
              disabled={!canExport}
              style={canExport ? undefined : { opacity: 0.55, cursor: "not-allowed" }}
              title={canExport ? "Exportar os eventos carregados" : "Nenhum evento carregado para exportar."}
              onClick={() => exportAuditCsv(events)}
            >
              <Download size={15} aria-hidden="true" />
              Exportar
            </button>
          </>
        }
      />

      {/* KPIs derivados das actions REAIS carregadas (D-007) */}
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
              icon={FileText}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
              value={kpis.total}
              label="Eventos no período"
              hint={PERIOD_HINT[period]}
              tag={
                hasMore
                  ? { label: "há mais para carregar", bg: "#FEF3C7", fg: "#B45309" }
                  : { label: "tudo carregado", bg: "#EFF6FF", fg: "#2563EB" }
              }
            />
            <KpiStatCard
              icon={KeyRound}
              iconColor="#15803D"
              iconBg="#F0FDF4"
              value={kpis.logins}
              label="Entradas no sistema"
              hint={`${kpis.loginActors} usuário(s) distinto(s)`}
              tag={
                kpis.denied === 0
                  ? { label: "sem recusas", bg: "#DCFCE7", fg: "#15803D" }
                  : { label: `${kpis.denied} recusada(s)`, bg: "#FEF3C7", fg: "#B45309" }
              }
            />
            <KpiStatCard
              icon={Ban}
              iconColor="#B45309"
              iconBg="#FFFBEB"
              value={kpis.ended}
              label="Sessões encerradas"
              hint={`${kpis.endedBySystem} pelo sistema`}
              tag={kpis.endedBySystem > 0 ? { label: "revisar", bg: "#FEF3C7", fg: "#B45309" } : undefined}
            />
            <KpiStatCard
              icon={AlertTriangle}
              iconColor={kpis.denied > 0 ? "#DC2626" : "#15803D"}
              iconBg={kpis.denied > 0 ? "#FEF2F2" : "#F0FDF4"}
              value={kpis.denied}
              label={kpis.denied === 1 ? "Tentativa recusada" : "Tentativas recusadas"}
              hint="acessos e renovações negados"
              tag={
                kpis.denied > 0
                  ? { label: "atenção", bg: "#FEE2E2", fg: "#B91C1C" }
                  : { label: "nenhuma", bg: "#DCFCE7", fg: "#15803D" }
              }
              border={kpis.denied > 0 ? "#FCA5A5" : undefined}
            />
          </>
        )}
      </div>

      {/* Card de filtros — filtros server-side REAIS do hook */}
      {filtersOpen ? (
        <div className="pat-filter-card" id="audit-filtros">
          <div className="pat-filter-grid">
            <div className="pat-filter-field">
              <label htmlFor="audit-filtro-tipo">Tipo de evento</label>
              <select
                id="audit-filtro-tipo"
                value={filters.action}
                onChange={(event) => setFilter("action", event.target.value)}
              >
                <option value="">Todos os eventos</option>
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pat-filter-field">
              <label htmlFor="audit-filtro-usuario">Usuário</label>
              {/* Junta PR-C (MÉDIA-1) — id técnico NUNCA ecoa cru na UI: quando o filtro veio do gesto
                  "ver só os eventos deste usuário" (id opaco), mostra um chip honesto com "limpar". */}
              {UUID_RE.test(filters.actorId) ? (
                <span className="pat-actor-filter-chip">
                  Filtrando por 1 usuário
                  <button type="button" onClick={() => setFilter("actorId", "")} aria-label="Limpar o filtro de usuário">
                    limpar
                  </button>
                </span>
              ) : (
                <input
                  id="audit-filtro-usuario"
                  value={filters.actorId}
                  onChange={(event) => setFilter("actorId", event.target.value)}
                  placeholder="Todos os usuários"
                  aria-label="Filtrar pelo identificador do usuário"
                />
              )}
            </div>
            <div className="pat-filter-field">
              <label htmlFor="audit-filtro-de">De</label>
              <input id="audit-filtro-de" type="date" value={filters.from} onChange={(event) => setFilter("from", event.target.value)} />
            </div>
            <div className="pat-filter-field">
              <label htmlFor="audit-filtro-ate">Até</label>
              <input id="audit-filtro-ate" type="date" value={filters.to} onChange={(event) => setFilter("to", event.target.value)} />
            </div>
            <button type="button" className="pat-btn" disabled={!hasActiveFilters} onClick={clearFilters}>
              Limpar
            </button>
          </div>
        </div>
      ) : null}

      {source === "fallback" ? (
        <div role="alert" className="pat-banner pat-banner--warning">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            Não foi possível carregar a auditoria. A tela volta a tentar automaticamente — nenhum dado é exibido enquanto isso para não
            apresentar informação que ainda não existe.
          </span>
          <button type="button" className="pat-link" onClick={() => void refresh()}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      {/* Tabela de eventos agrupada por dia */}
      <div className="pat-table">
        <div className="pat-table__topbar">
          <div>
            <div className="pat-table__title">Eventos</div>
            <div className="pat-table__subtitle">Ordenados do mais recente para o mais antigo</div>
          </div>
          <span className="pat-table__count">
            {events.length === 1 ? "1 evento no período" : `${events.length} eventos no período`}
            {hasMore ? " · há mais" : ""}
            {isRefreshing ? " · atualizando…" : ""}
          </span>
        </div>

        <div className="pat-table__head pat-audit-grid" aria-hidden="true">
          <div>QUANDO</div>
          <div>QUEM</div>
          <div>O QUE ACONTECEU</div>
          <div style={{ textAlign: "right" }}>AÇÕES</div>
        </div>

        {loading && events.length === 0 ? (
          [0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="pat-table__row pat-audit-grid" aria-hidden="true">
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
            </div>
          ))
        ) : source !== "fallback" && events.length === 0 ? (
          <div className="pat-table__empty">
            <div className="pat-table__empty-title">{hasActiveFilters ? PAGE_TEXT.emptyFiltered : PAGE_TEXT.empty}</div>
            <div className="pat-table__empty-detail">
              {hasActiveFilters
                ? "Nenhum evento de auditoria corresponde aos filtros. Ajuste o tipo, o usuário ou o período."
                : "Ainda não há registros de auditoria para esta organização. Assim que ações auditáveis acontecerem, elas aparecerão aqui."}
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.key}>
              <div className="pat-table__daybar">{group.label}</div>
              {group.events.map((event) => {
                const meta = auditActionMeta(event.action);
                const actor = auditActorPresentation(event.actor);
                return (
                  <div key={event.id} {...rowClickProps({ onOpen: null, className: "pat-table__row pat-audit-grid" })}>
                    {/* QUANDO — hora mono (America/Sao_Paulo) */}
                    <div className="pat-mono" style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                      {formatEventTime(event.whenIso)}
                    </div>

                    {/* QUEM — id opaco no DTO → "Usuário" com cor determinística (nunca UUID cru) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <InitialsAvatar name={actor.name} size={28} bg={actor.bg} fg={actor.fg} />
                      <span style={{ minWidth: 0 }}>
                        <span className="pat-cell-main" style={{ fontSize: 12.5 }}>
                          {actor.name}
                        </span>
                        {actor.isSystem ? <span className="pat-cell-sub" style={{ fontSize: 11 }}>ação automática</span> : null}
                      </span>
                    </div>

                    {/* O QUE ACONTECEU — dot semântico + rótulo PT-BR humanizado da action real */}
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.dot, flexShrink: 0 }} aria-hidden="true" />
                      <span
                        style={{ fontSize: 12.5, fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {/* AÇÕES — filtra pelos eventos deste ator (filtro server-side real) */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      {!actor.isSystem ? (
                        <button
                          type="button"
                          className="pat-icon-btn"
                          title="Ver só os eventos deste usuário"
                          aria-label="Ver só os eventos deste usuário"
                          onClick={() => setFilter("actorId", event.actor)}
                        >
                          <UserRoundSearch size={14} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {hasMore ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
            <button type="button" className="pat-btn" onClick={loadMore}>
              Carregar mais eventos
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AuditTenantPage;
