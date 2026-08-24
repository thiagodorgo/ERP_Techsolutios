import { AlertTriangle, Gauge, MapPin, Plus, PowerOff, Search, Truck, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { KpiStatCard, PageHeader, StatusPill, TablePager } from "../../../../components/patterns";
import { rowClickProps } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { usePatiosDashboardSummary } from "../../dashboard/usePatiosDashboardSummary";
import type { YardOccupancySummary } from "../../dashboard/dashboard.types";
import { YardFormModal } from "../components/YardFormModal";
import { filterYards, getYardActiveLabel } from "../yards.adapter";
import type { YardActiveFilter, YardItem, YardsFilters } from "../yards.types";
import { useYards } from "../useYards";

// PADRÃO "LINHA CLICÁVEL" (decisão do dono, 2026-08-24) — clicar em QUALQUER ponto da linha abre o pátio
// (rota /patios/patios/:yardId, o mesmo destino do nome). A coluna AÇÕES saiu inteira: o link "Abrir" duplicava
// o clique na linha e o lápis "Editar" saiu do padrão — a edição continua no cabeçalho do detalhe do pátio
// ("Editar pátio", sob yard:update). Affordance/teclado/seleção de texto ficam com `rowClickProps`.
// TELAS PADRONIZADAS PR-D — Pátios no padrão do protótipo do dono (sc_patios).
// Fontes REAIS: /api/v1/yards (useYards) para o cadastro + /patios/dashboard/summary (usePatiosDashboardSummary,
// sob impound:read) para a OCUPAÇÃO por pátio, veículos em custódia e fila de liberações — é UMA requisição e o
// app já a consome no Painel (achado da junta do PR-D: a degradação "não há ocupação na lista" era FALSA).
// Sem impound:read (ou com o resumo indisponível) a coluna degrada honestamente para CAPACIDADE PREVISTA.
const STABLE_FILTERS: YardsFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const ACTIVE_TABS: readonly { value: YardActiveFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

// Tons de situação do protótipo (Ativo verde com dot; Inativo neutro).
const ACTIVE_TONE = { bg: "#DCFCE7", fg: "#15803D", dot: "#22C55E" } as const;
const INACTIVE_TONE = { bg: "#F1F5F9", fg: "#64748B", dot: "#94A3B8" } as const;

/** Faixas de ocupação do protótipo: <60% saudável, 60–85% atenção, >85% crítico. */
export function occupancyTone(pct: number): { fg: string; bar: string } {
  if (pct > 85) return { fg: "#B91C1C", bar: "#DC2626" };
  if (pct >= 60) return { fg: "#B45309", bar: "#F59E0B" };
  return { fg: "#15803D", bar: "#22C55E" };
}

/** KPIs derivados SÓ de dados reais. `summary` ausente/negado → recai nas contagens do cadastro (honesto). */
export function computeYardKpis(items: readonly YardItem[]) {
  const ativos = items.filter((yard) => yard.active);
  return {
    total: items.length,
    ativos: ativos.length,
    inativos: items.length - ativos.length,
    capacidadePrevista: ativos.reduce((sum, yard) => sum + (yard.capacityHint ?? 0), 0),
    semCapacidade: ativos.filter((yard) => yard.capacityHint === null).length,
  };
}

/** Convite do protótipo: só com 1 pátio REAL (total do servidor), sem filtro e para quem pode criar. */
export function shouldShowInvite(input: {
  readonly canCreate: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  readonly serverTotal: number;
  readonly hasActiveFilters: boolean;
}): boolean {
  return input.canCreate && !input.loading && !input.error && input.serverTotal === 1 && !input.hasActiveFilters;
}

/** Colunas só para a mecânica de ordenação da dense-list (a renderização é a grade padronizada abaixo). */
const SORT_COLUMNS: readonly DenseColumn<YardItem>[] = [
  { key: "name", header: "Pátio", sortable: true, sortValue: (yard) => yard.name, render: () => null },
  { key: "address", header: "Endereço", sortable: true, sortValue: (yard) => yard.address, render: () => null },
  { key: "timezone", header: "Fuso horário", sortable: true, sortValue: (yard) => yard.timezone, render: () => null },
  // null → vazio: a dense-list já joga vazios para o fim (convenção das listas irmãs).
  { key: "capacity", header: "Ocupação", sortable: true, sortValue: (yard) => yard.capacityHint, render: () => null },
  { key: "active", header: "Situação", sortable: true, sortValue: (yard) => getYardActiveLabel(yard.active), render: () => null },
];

export function PatiosPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { items, pagination, loading, error, refresh } = useYards(STABLE_FILTERS);
  const { summary, denied: summaryDenied } = usePatiosDashboardSummary();
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("yard:create");

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

  const dense = useDenseList<YardItem>({ items, columns: SORT_COLUMNS, filter: filterYards, defaultSort: { key: "name", dir: "asc" } });

  // Ocupação REAL indexada por pátio (uma requisição). Ausente/negada → a coluna mostra a capacidade prevista.
  const occupancyByYard = useMemo(() => {
    const index = new Map<string, YardOccupancySummary>();
    for (const yard of summary?.occupancy ?? []) index.set(yard.yardId, yard);
    return index;
  }, [summary]);
  const hasOccupancy = occupancyByYard.size > 0;

  const kpis = useMemo(() => computeYardKpis(items), [items]);
  const serverTotal = pagination.total || items.length;
  const partialWindow = pagination.total > items.length;
  const windowNote = partialWindow ? " · na janela carregada" : "";
  // §7 — com erro e sem dado carregado, os KPIs NÃO afirmam zeros como fato (achado ALTA da junta).
  const kpisUnavailable = Boolean(error) && items.length === 0;

  const custodia = summary?.processesByPhase?.CUSTODY ?? null;
  const liberacoes = summary?.releaseQueueDepth ?? null;
  const ocupacaoMedia = useMemo(() => {
    const totals = (summary?.occupancy ?? []).reduce(
      (acc, yard) => ({ total: acc.total + yard.totalSpots, ocupadas: acc.ocupadas + yard.occupiedSpots }),
      { total: 0, ocupadas: 0 },
    );
    return totals.total > 0 ? Math.round((totals.ocupadas / totals.total) * 100) : null;
  }, [summary]);

  function openCreate() {
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  const showInvite = shouldShowInvite({ canCreate, loading, error, serverTotal, hasActiveFilters: dense.hasActiveFilters });

  return (
    <div style={{ color: "#0F172A" }}>
      <PageHeader
        kicker="PÁTIOS"
        title="Pátios"
        subtitle="Locais de guarda da organização — endereço, capacidade, custódia e situação de cada pátio."
        actions={
          <>
            <div className="pat-header-search">
              <Search size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
              <input
                type="search"
                value={dense.search}
                onChange={(event) => dense.setSearch(event.target.value)}
                placeholder="Buscar por nome ou endereço…"
                aria-label="Buscar por nome ou endereço"
              />
            </div>
            {canCreate ? (
              <button type="button" className="pat-btn pat-btn--primary" onClick={openCreate}>
                <Plus size={15} aria-hidden="true" /> Novo pátio
              </button>
            ) : null}
          </>
        }
      />

      {error ? (
        <div role="alert" className="pat-banner pat-banner--warning">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Não foi possível carregar os pátios.</span>
          <button type="button" className="pat-link" onClick={() => void refresh()}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      {/* KPIs de decisão — ocupação/custódia/liberações vêm do resumo REAL; sem impound:read recaem em contagens
          do cadastro (declarado no hint). Com erro e sem dado, não renderizam número nenhum. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 14 }} aria-live="polite">
        {loading && items.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="pat-kpi" aria-hidden="true">
              <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
              <div className="pat-skel" style={{ width: 54, height: 24, marginTop: 12 }} />
              <div className="pat-skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
            </div>
          ))
        ) : kpisUnavailable ? (
          <>
            <KpiStatCard icon={MapPin} iconColor="#94A3B8" iconBg="#F1F5F9" value="—" label="Pátios ativos" hint="dados indisponíveis" />
            <KpiStatCard icon={Truck} iconColor="#94A3B8" iconBg="#F1F5F9" value="—" label="Veículos em custódia" hint="dados indisponíveis" />
            <KpiStatCard icon={Gauge} iconColor="#94A3B8" iconBg="#F1F5F9" value="—" label="Ocupação média" hint="dados indisponíveis" />
            <KpiStatCard icon={Unlock} iconColor="#94A3B8" iconBg="#F1F5F9" value="—" label="Liberações pendentes" hint="dados indisponíveis" />
          </>
        ) : (
          <>
            <KpiStatCard
              icon={MapPin}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
              value={kpis.ativos}
              label="Pátios ativos"
              hint={`locais de guarda em operação${windowNote}`}
              tag={serverTotal === 1 ? { label: "único local", bg: "#FEF3C7", fg: "#B45309" } : { label: `${serverTotal} cadastrados`, bg: "#EFF6FF", fg: "#2563EB" }}
            />
            {custodia !== null ? (
              <KpiStatCard
                icon={Truck}
                iconColor="#0369A1"
                iconBg="#F0F9FF"
                value={custodia}
                label="Veículos em custódia"
                hint="sob responsabilidade da organização"
                tag={{ label: "em guarda", bg: "#DCFCE7", fg: "#15803D" }}
              />
            ) : (
              <KpiStatCard
                icon={Truck}
                iconColor="#0369A1"
                iconBg="#F0F9FF"
                value={kpis.capacidadePrevista}
                label="Capacidade prevista"
                hint={`referência informada no cadastro${windowNote}`}
                tag={{ label: summaryDenied ? "sem acesso à custódia" : "cadastro", bg: "#F1F5F9", fg: "#475569" }}
              />
            )}
            {ocupacaoMedia !== null ? (
              <KpiStatCard
                icon={Gauge}
                iconColor={occupancyTone(ocupacaoMedia).fg}
                iconBg={ocupacaoMedia > 85 ? "#FEF2F2" : ocupacaoMedia >= 60 ? "#FFFBEB" : "#F0FDF4"}
                value={`${ocupacaoMedia}%`}
                label="Ocupação média"
                hint="vagas ocupadas sobre o total cadastrado"
                tag={ocupacaoMedia > 85 ? { label: "crítica", bg: "#FEE2E2", fg: "#B91C1C" } : ocupacaoMedia >= 60 ? { label: "atenção", bg: "#FEF3C7", fg: "#B45309" } : { label: "saudável", bg: "#DCFCE7", fg: "#15803D" }}
                border={ocupacaoMedia > 85 ? "#FCA5A5" : undefined}
              />
            ) : (
              <KpiStatCard
                icon={Gauge}
                iconColor="#B45309"
                iconBg="#FFFBEB"
                value={kpis.semCapacidade}
                label="Sem capacidade informada"
                hint={`pátios ativos sem número de vagas${windowNote}`}
                tag={kpis.semCapacidade > 0 ? { label: "informar", bg: "#FEF3C7", fg: "#B45309" } : { label: "completo", bg: "#DCFCE7", fg: "#15803D" }}
                border={kpis.semCapacidade > 0 ? "#FCA5A5" : undefined}
              />
            )}
            {liberacoes !== null ? (
              <KpiStatCard
                icon={Unlock}
                iconColor="#7E22CE"
                iconBg="#FAF5FF"
                value={liberacoes}
                label="Liberações pendentes"
                hint="processos aguardando restituição"
                tag={liberacoes > 0 ? { label: "revisar", bg: "#F3E8FF", fg: "#7E22CE" } : { label: "em dia", bg: "#DCFCE7", fg: "#15803D" }}
              />
            ) : (
              <KpiStatCard
                icon={PowerOff}
                iconColor="#64748B"
                iconBg="#F1F5F9"
                value={kpis.inativos}
                label="Inativos"
                hint={`fora de operação no momento${windowNote}`}
                tag={{ label: kpis.inativos > 0 ? "revisar" : "nenhum", bg: "#F1F5F9", fg: "#475569" }}
              />
            )}
          </>
        )}
      </div>

      <div className="pat-table">
        <div className="pat-table__topbar">
          <div className="pat-os-tabs" role="group" aria-label="Filtrar por situação">
            {ACTIVE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={dense.status === tab.value ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                aria-pressed={dense.status === tab.value}
                onClick={() => dense.setStatus(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="pat-table__count">
            {loading && items.length === 0 ? (
              <span className="pat-skel" style={{ display: "inline-block", width: 110, height: 12 }} aria-hidden="true" />
            ) : kpisUnavailable ? (
              "—"
            ) : dense.hasActiveFilters ? (
              `${dense.total} de ${serverTotal} pátios`
            ) : (
              `${serverTotal} ${serverTotal === 1 ? "pátio cadastrado" : "pátios cadastrados"}`
            )}
          </span>
        </div>

        <div className="pat-table__head pat-patios-grid">
          {SORT_COLUMNS.map((column) => {
            const label = column.key === "capacity" ? (hasOccupancy ? "OCUPAÇÃO" : "CAPACIDADE PREVISTA") : column.header.toUpperCase();
            const sorted = dense.sort?.key === column.key;
            return (
              <div key={column.key} aria-sort={sorted ? (dense.sort?.dir === "asc" ? "ascending" : "descending") : "none"}>
                <button
                  type="button"
                  className="pat-table__sort"
                  aria-label={`Ordenar por ${label.toLowerCase()}${sorted ? (dense.sort?.dir === "asc" ? " (crescente)" : " (decrescente)") : ""}`}
                  onClick={() => dense.toggleSort(column.key)}
                >
                  {label}
                  {sorted ? <span aria-hidden="true">{dense.sort?.dir === "asc" ? " ↑" : " ↓"}</span> : null}
                </button>
              </div>
            );
          })}
        </div>

        {loading && items.length === 0
          ? [0, 1, 2].map((index) => (
              <div key={index} className="pat-table__row pat-patios-grid" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, cell) => (
                  <div key={cell} className="pat-skel" style={{ height: 14 }} />
                ))}
              </div>
            ))
          : null}

        {error && dense.total === 0 && !loading ? (
          <div className="pat-table__empty">
            <div className="pat-table__empty-title">Não foi possível carregar os pátios</div>
            <div className="pat-table__empty-detail">
              Verifique a conexão e tente novamente —{" "}
              <button type="button" className="pat-link" onClick={() => void refresh()}>
                Tentar novamente
              </button>
            </div>
          </div>
        ) : null}

        {!loading && !error && dense.total === 0 ? (
          <div className="pat-table__empty">
            <div className="pat-table__empty-title">Nenhum pátio encontrado</div>
            <div className="pat-table__empty-detail">
              {dense.hasActiveFilters
                ? "Ajuste a busca ou a situação para encontrar pátios."
                : "Cadastre o primeiro pátio para organizar as áreas e vagas de guarda."}
            </div>
          </div>
        ) : null}

        {!error && dense.total > 0
          ? dense.visibleItems.map((yard) => {
              const tone = yard.active ? ACTIVE_TONE : INACTIVE_TONE;
              const occupancy = occupancyByYard.get(yard.id);
              const pct = occupancy && occupancy.totalSpots > 0 ? Math.round((occupancy.occupiedSpots / occupancy.totalSpots) * 100) : null;
              return (
                <div
                  key={yard.id}
                  {...rowClickProps({
                    onOpen: () => navigate(`/patios/patios/${yard.id}`),
                    label: `Abrir o pátio ${yard.name}`,
                    className: "pat-table__row pat-patios-grid",
                  })}
                >
                  <div className="pat-patio-name">
                    <span className="pat-patio-tile" aria-hidden="true">
                      <MapPin size={16} />
                    </span>
                    <Link to={`/patios/patios/${yard.id}`} className="pat-cell-main pat-cell-truncate" aria-label={`Abrir o pátio ${yard.name}`}>
                      {yard.name}
                    </Link>
                  </div>
                  <div className="pat-cell-body pat-cell-truncate">
                    {yard.address || "—"}
                  </div>
                  <div className="pat-cell-body">
                    {yard.timezone}
                  </div>
                  <div>
                    {pct !== null && occupancy ? (
                      <>
                        <div className="pat-occ-head">
                          <span className="pat-occ-count">{`${occupancy.occupiedSpots} de ${occupancy.totalSpots} vagas`}</span>
                          <span className="pat-occ-pct" style={{ color: occupancyTone(pct).fg }}>{`${pct}%`}</span>
                        </div>
                        <div className="pat-occ-bar">
                          <span style={{ width: `${Math.min(100, pct)}%`, background: occupancyTone(pct).bar }} />
                        </div>
                      </>
                    ) : yard.capacityHint !== null ? (
                      <span className="pat-cell-body">
                        <strong className="pat-occ-count">{yard.capacityHint}</strong> vagas previstas
                      </span>
                    ) : (
                      <span className="pat-cell-muted">não informada</span>
                    )}
                  </div>
                  <div>
                    <StatusPill label={getYardActiveLabel(yard.active)} bg={tone.bg} fg={tone.fg} dot={tone.dot} />
                  </div>
                </div>
              );
            })
          : null}

        {!error && dense.total > 0 ? (
          <TablePager
            pageSize={dense.pageSize}
            onPageSize={dense.setPageSize}
            pageSizeOptions={dense.pageSizeOptions}
            rangeLabel={`${dense.pageStart}–${dense.pageEnd} de ${dense.total}`}
            onPrev={() => dense.setPage(dense.page - 1)}
            onNext={() => dense.setPage(dense.page + 1)}
            canPrev={dense.page > 1}
            canNext={dense.page < dense.totalPages}
          />
        ) : null}
      </div>

      {/* Convite honesto do protótipo — só com 1 pátio REAL no servidor, sem filtro e para quem pode criar. */}
      {showInvite ? (
        <div className="pat-invite">
          <span className="pat-invite__icon" aria-hidden="true">
            <MapPin size={20} />
          </span>
          <div className="pat-invite__body">
            <strong>Sua organização tem apenas 1 pátio cadastrado</strong>
            <p>Cadastre os demais locais de guarda para distribuir a custódia e acompanhar a ocupação por unidade.</p>
          </div>
          <button type="button" className="pat-btn pat-btn--primary" onClick={openCreate}>
            <Plus size={14} aria-hidden="true" /> Novo pátio
          </button>
        </div>
      ) : null}

      {modalOpen ? (
        <YardFormModal
          key="new"
          yard={null}
          context={context}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}

export default PatiosPage;
