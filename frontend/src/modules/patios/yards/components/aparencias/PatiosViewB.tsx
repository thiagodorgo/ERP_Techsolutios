import { AlertTriangle, ArrowRight, Ban, ChevronDown, Gauge, MapPin, Pencil, PowerOff, Truck, Unlock } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { KpiStatCard, PageHeader, StatusPill, TablePager } from "../../../../../components/patterns";
import type { PatiosDashboardSummary } from "../../../dashboard/dashboard.types";
import { getYardActiveLabel } from "../../yards.adapter";
import {
  ACTIVE_TONE,
  ActiveFilterChip,
  DetailField,
  INACTIVE_TONE,
  OccupancyInline,
  PatiosHeaderActions,
  ariaSort,
  buildYardRows,
  computeYardKpis,
  networkTotals,
  occupancyBandTag,
  occupancyTone,
  rowKeyToggle,
  sortLabel,
  timezoneLabel,
  useYardRowList,
  type NetworkTotals,
  type OccupancyBand,
  type PatiosViewProps,
  type YardRow,
} from "./patiosAparencias.shared";
import { YardSpotMiniMap } from "./YardSpotBoard";

// B-APARENCIA-USUARIO — aparência B · Analítica (referência `patios-3opcoes.reference.html`, opção B; padrão de
// Pátios pela D-APARENCIA-RESPOSTAS (b)). KPIs clicáveis que filtram a lista, faixa analítica em SVG inline
// (PD-004: ocupação da rede, ocupação por pátio, processos por fase), abas por faixa de ocupação e linha de UMA
// linha que abre o detalhe embaixo com o mapa resumido das vagas (D-PADRAO-BLOCOS-CLICAVEIS).
// Fonte: cadastro (/yards) + resumo (/patios/dashboard/summary) — os dois chegam por props, uma requisição cada.
// Sem o resumo (sem impound:read, ou sem vaga cadastrada) a B DEGRADA honestamente para os números do cadastro,
// como a A: nenhum gráfico é desenhado sem dado (D-007).

type BandTab = "todos" | "critica" | "atencao" | "saudavel" | "inativo" | "ativos" | "inativos";
type Target = "ativos" | "ocupadas" | "criticos" | "bloqueadas";

const BAND_TABS: readonly { value: BandTab; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "critica", label: "Críticos (>85%)" },
  { value: "atencao", label: "Atenção (60–85%)" },
  { value: "saudavel", label: "Saudáveis (<60%)" },
  { value: "inativo", label: "Inativos" },
];
// Sem ocupação não há faixa: as abas voltam a ser a situação do cadastro.
const SITUATION_TABS: readonly { value: BandTab; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
];

const TARGET_LABEL: Readonly<Record<Target, string>> = {
  ativos: "Pátios ativos",
  ocupadas: "Ordenado por ocupação",
  criticos: "Ocupação crítica (acima de 85%)",
  bloqueadas: "Com vagas bloqueadas",
};

function applyTab(rows: readonly YardRow[], tab: BandTab): YardRow[] {
  if (tab === "todos") return [...rows];
  if (tab === "ativos") return rows.filter((row) => row.yard.active);
  if (tab === "inativos") return rows.filter((row) => !row.yard.active);
  return rows.filter((row) => row.band === (tab as OccupancyBand));
}

function applyTarget(rows: readonly YardRow[], target: Target | null): YardRow[] {
  if (target === "ativos") return rows.filter((row) => row.yard.active);
  if (target === "criticos") return rows.filter((row) => row.band === "critica");
  if (target === "bloqueadas") return rows.filter((row) => (row.occupancy?.blockedSpots ?? 0) > 0);
  return [...rows];
}

export function PatiosViewB({ items, serverTotal, partialWindow, loading, error, onRetry, summary, summaryDenied, canCreate, canUpdate, onCreate, onEdit, apiContext }: PatiosViewProps) {
  const navigate = useNavigate();
  const rows = useMemo(() => buildYardRows(items, summary), [items, summary]);
  const totals = useMemo(() => networkTotals(summary), [summary]);
  const kpis = useMemo(() => computeYardKpis(items), [items]);
  const hasOccupancy = totals.total > 0;
  const kpisUnavailable = Boolean(error) && items.length === 0;
  const windowNote = partialWindow ? " · na janela carregada" : "";

  const [tab, setTab] = useState<BandTab>("todos");
  const [target, setTarget] = useState<Target | null>(null);
  const tabs = hasOccupancy ? BAND_TABS : SITUATION_TABS;
  const effectiveTab = tabs.some((item) => item.value === tab) ? tab : "todos";

  const filteredRows = useMemo(() => applyTarget(applyTab(rows, effectiveTab), target), [rows, effectiveTab, target]);
  const list = useYardRowList(filteredRows);

  const critical = rows.filter((row) => row.band === "critica");
  const pickTarget = (next: Target) => {
    setTarget((current) => (current === next ? null : next));
    list.setOpenId(null);
    if (next === "ocupadas") list.setSort({ key: "occupancy", dir: "desc" });
  };

  return (
    <div style={{ color: "#0F172A" }} data-aparencia="B">
      <PageHeader
        kicker="PÁTIOS · VISÃO ANALÍTICA"
        title="Pátios"
        subtitle="Locais de guarda da organização — ocupação da rede, pátios sob pressão e o que está em cada vaga, sem sair da lista."
        actions={<PatiosHeaderActions search={list.search} onSearch={list.setSearch} canCreate={canCreate} onCreate={onCreate} />}
      />

      {error ? (
        <div role="alert" className="pat-banner pat-banner--warning">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Não foi possível carregar os pátios.</span>
          <button type="button" className="pat-link" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className={`pat-kpi-row ${hasOccupancy ? "pat-kpi-row--5" : "pat-kpi-row--4"}`} aria-live="polite">
        {loading && items.length === 0 ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="pat-kpi" aria-hidden="true">
              <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
              <div className="pat-skel" style={{ width: 54, height: 24, marginTop: 12 }} />
              <div className="pat-skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
            </div>
          ))
        ) : kpisUnavailable ? (
          ["Pátios ativos", "Vagas ocupadas", "Pátios em nível crítico", "Vagas bloqueadas", "Liberações pendentes"].map((label) => (
            <KpiStatCard key={label} icon={MapPin} iconColor="#94A3B8" iconBg="#F1F5F9" value="—" label={label} hint="dados indisponíveis" />
          ))
        ) : hasOccupancy && summary ? (
          <AnalyticKpis
            summary={summary}
            totals={totals}
            ativos={kpis.ativos}
            serverTotal={serverTotal}
            critical={critical}
            onTarget={pickTarget}
            onReleases={() => navigate("/patios/liberacoes")}
          />
        ) : (
          <>
            <KpiStatCard
              icon={MapPin}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
              value={kpis.ativos}
              label="Pátios ativos"
              hint={`locais de guarda em operação${windowNote}`}
              tag={{ label: `${serverTotal} cadastrados`, bg: "#EFF6FF", fg: "#2563EB" }}
              onClick={() => pickTarget("ativos")}
              ariaLabel={`Pátios ativos: ${kpis.ativos} — filtrar a lista`}
            />
            <KpiStatCard
              icon={Truck}
              iconColor="#0369A1"
              iconBg="#F0F9FF"
              value={kpis.capacidadePrevista}
              label="Capacidade prevista"
              hint={`referência informada no cadastro${windowNote}`}
              tag={{ label: summaryDenied ? "sem acesso à custódia" : "cadastro", bg: "#F1F5F9", fg: "#475569" }}
            />
            <KpiStatCard
              icon={Gauge}
              iconColor="#B45309"
              iconBg="#FFFBEB"
              value={kpis.semCapacidade}
              label="Sem capacidade informada"
              hint={`pátios ativos sem número de vagas${windowNote}`}
              tag={kpis.semCapacidade > 0 ? { label: "informar", bg: "#FEF3C7", fg: "#B45309" } : { label: "completo", bg: "#DCFCE7", fg: "#15803D" }}
            />
            <KpiStatCard
              icon={PowerOff}
              iconColor="#64748B"
              iconBg="#F1F5F9"
              value={kpis.inativos}
              label="Inativos"
              hint={`fora de operação no momento${windowNote}`}
              tag={{ label: kpis.inativos > 0 ? "revisar" : "nenhum", bg: "#F1F5F9", fg: "#475569" }}
              onClick={() => {
                setTab("inativos");
                setTarget(null);
              }}
              ariaLabel={`Inativos: ${kpis.inativos} — filtrar a lista`}
            />
          </>
        )}
      </div>

      {hasOccupancy && summary && !kpisUnavailable ? (
        <div className="pat-analitico">
          <NetworkDonut totals={totals} releaseQueueDepth={summary.releaseQueueDepth} activeYards={kpis.ativos} />
          <OccupancyBars rows={rows} onOpen={(yardId) => navigate(`/patios/patios/${yardId}`)} />
          <PhasePanel summary={summary} rows={rows} />
        </div>
      ) : null}

      <div className="pat-table">
        <div className="pat-table__topbar">
          <div className="pat-os-tabs" role="group" aria-label={hasOccupancy ? "Filtrar por faixa de ocupação" : "Filtrar por situação"}>
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                className={effectiveTab === item.value ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                aria-pressed={effectiveTab === item.value}
                onClick={() => {
                  setTab(item.value);
                  list.setOpenId(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="pat-table__count">
            {loading && items.length === 0 ? (
              <span className="pat-skel" style={{ display: "inline-block", width: 110, height: 12 }} aria-hidden="true" />
            ) : kpisUnavailable ? (
              "—"
            ) : list.total !== serverTotal ? (
              `${list.total} de ${serverTotal} pátios`
            ) : (
              `${serverTotal} ${serverTotal === 1 ? "pátio cadastrado" : "pátios cadastrados"}`
            )}
          </span>
        </div>
        <ActiveFilterChip label={target ? TARGET_LABEL[target] : null} onClear={() => setTarget(null)} />

        <table className="pat-ab-table">
          <colgroup>
            <col style={{ width: "30%" }} />
            <col />
            <col style={{ width: 78 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th aria-sort={ariaSort(list.sort, "name")}>
                <button type="button" className="pat-table__sort" onClick={() => list.toggleSort("name")}>
                  {`PÁTIO${sortLabel(list.sort, "name")}`}
                </button>
              </th>
              <th aria-sort={ariaSort(list.sort, "occupancy")}>
                <button type="button" className="pat-table__sort" onClick={() => list.toggleSort("occupancy")}>
                  {`${hasOccupancy ? "OCUPAÇÃO" : "CAPACIDADE PREVISTA"}${sortLabel(list.sort, "occupancy")}`}
                </button>
              </th>
              <th>LIVRES</th>
              <th>BLOQUEADAS</th>
              <th aria-sort={ariaSort(list.sort, "active")}>
                <button type="button" className="pat-table__sort" onClick={() => list.toggleSort("active")}>
                  {`SITUAÇÃO${sortLabel(list.sort, "active")}`}
                </button>
              </th>
              <th>
                <span className="sr-only">Abrir detalhe</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0
              ? [0, 1, 2].map((index) => (
                  <tr key={index} className="pat-ab-row" aria-hidden="true">
                    {Array.from({ length: 6 }).map((_, cell) => (
                      <td key={cell}>
                        <span className="pat-skel" style={{ display: "inline-block", width: "80%", height: 12, verticalAlign: "middle" }} />
                      </td>
                    ))}
                  </tr>
                ))
              : null}
            {error && list.total === 0 && !loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="pat-table__empty">
                    <div className="pat-table__empty-title">Não foi possível carregar os pátios</div>
                    <div className="pat-table__empty-detail">
                      Verifique a conexão e tente novamente —{" "}
                      <button type="button" className="pat-link" onClick={onRetry}>
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : null}
            {!loading && !error && list.total === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="pat-table__empty">
                    <div className="pat-table__empty-title">Nenhum pátio encontrado</div>
                    <div className="pat-table__empty-detail">
                      {items.length > 0 ? "Ajuste a busca, a faixa ou o filtro para encontrar pátios." : "Cadastre o primeiro pátio para organizar as áreas e vagas de guarda."}
                    </div>
                  </div>
                </td>
              </tr>
            ) : null}
            {!error || list.total > 0
              ? list.visible.map((row) => {
                  const open = list.openId === row.yard.id;
                  const tone = row.yard.active ? ACTIVE_TONE : INACTIVE_TONE;
                  const count = (value: number | undefined, color: string) =>
                    row.occupancy && row.occupancy.totalSpots > 0 ? (
                      <span className="pat-mono" style={{ fontWeight: 700, color: value ? color : "#94A3B8" }}>
                        {value ?? 0}
                      </span>
                    ) : (
                      "—"
                    );
                  return (
                    <Fragment key={row.yard.id}>
                      <tr
                        className="pat-ab-row"
                        tabIndex={0}
                        aria-expanded={open}
                        onClick={() => list.toggleOpen(row.yard.id)}
                        onKeyDown={(event) => rowKeyToggle(event, () => list.toggleOpen(row.yard.id))}
                      >
                        <td title={row.yard.name}>
                          <span className="pat-patio-tile pat-patio-tile--sm" aria-hidden="true">
                            <MapPin size={14} />
                          </span>
                          <span className="pat-nome-patio">{row.yard.name}</span>
                        </td>
                        <td>
                          <OccupancyInline row={row} />
                        </td>
                        <td>{count(row.occupancy?.freeSpots, "#059669")}</td>
                        <td>{count(row.occupancy?.blockedSpots, "#DC2626")}</td>
                        <td>
                          <StatusPill label={getYardActiveLabel(row.yard.active)} bg={tone.bg} fg={tone.fg} dot={tone.dot} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="pat-chevron-icon" aria-hidden="true">
                            <ChevronDown size={15} />
                          </span>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="pat-ab-detail-row">
                          <td colSpan={6} className="pat-ab-detail-cell">
                            <div className="pat-ab-detail-content">
                              <div className="pat-b-detalhe">
                                <YardSpotMiniMap yard={row.yard} apiContext={apiContext} />
                                <div className="pat-b-props">
                                  <DetailField label="Endereço">{row.yard.address || "—"}</DetailField>
                                  <DetailField label="Fuso horário">{timezoneLabel(row.yard.timezone)}</DetailField>
                                  {row.occupancy && row.occupancy.totalSpots > 0 ? (
                                    <DetailField label="Vagas">
                                      {`${row.occupancy.totalSpots} · ${row.occupancy.freeSpots} livres · ${row.occupancy.occupiedSpots} ocupadas · ${row.occupancy.blockedSpots} bloqueadas`}
                                    </DetailField>
                                  ) : (
                                    <DetailField label="Capacidade prevista">{row.yard.capacityHint !== null ? `${row.yard.capacityHint} vagas` : "não informada"}</DetailField>
                                  )}
                                  {row.pct !== null ? (
                                    <DetailField label="Ocupação">
                                      <b style={{ color: occupancyTone(row.pct).fg }}>{`${row.pct}% · ${occupancyBandTag(row.pct).label}`}</b>
                                    </DetailField>
                                  ) : null}
                                  <DetailField label="Situação">{getYardActiveLabel(row.yard.active)}</DetailField>
                                </div>
                              </div>
                              <div className="pat-ab-detail-actions">
                                <Link to={`/patios/patios/${row.yard.id}`} className="pat-btn pat-btn--primary">
                                  <ArrowRight size={14} aria-hidden="true" /> Abrir vagas
                                </Link>
                                {canUpdate ? (
                                  <button type="button" className="pat-btn" onClick={() => onEdit(row.yard)}>
                                    <Pencil size={13} aria-hidden="true" /> Editar pátio
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              : null}
          </tbody>
        </table>

        {!error && list.total > 0 ? (
          <TablePager
            pageSize={list.pageSize}
            onPageSize={list.setPageSize}
            pageSizeOptions={[20, 50, 100]}
            rangeLabel={`${list.pageStart}–${list.pageEnd} de ${list.total}`}
            onPrev={() => list.setPage(list.page - 1)}
            onNext={() => list.setPage(list.page + 1)}
            canPrev={list.page > 1}
            canNext={list.page < list.totalPages}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Rótulo curto dos gráficos e do KPI de crítico (referência: o prefixo "Pátio " sai). */
function shortYardName(name: string): string {
  return name.replace(/^Pátio\s+/i, "");
}

function AnalyticKpis({
  summary,
  totals,
  ativos,
  serverTotal,
  critical,
  onTarget,
  onReleases,
}: {
  readonly summary: PatiosDashboardSummary;
  readonly totals: NetworkTotals;
  readonly ativos: number;
  readonly serverTotal: number;
  readonly critical: readonly YardRow[];
  readonly onTarget: (target: Target) => void;
  readonly onReleases: () => void;
}) {
  const pct = totals.pct ?? 0;
  const band = occupancyBandTag(pct);
  const criticalNames = critical.map((row) => `${shortYardName(row.yard.name).split(" — ")[0]} ${row.pct ?? 0}%`).join(" · ");
  return (
    <>
      <KpiStatCard
        icon={MapPin}
        iconColor="#2563EB"
        iconBg="#EFF6FF"
        value={ativos}
        label="Pátios ativos"
        hint="locais de guarda em operação"
        tag={{ label: `${serverTotal} cadastrados`, bg: "#EFF6FF", fg: "#2563EB" }}
        onClick={() => onTarget("ativos")}
        ariaLabel={`Pátios ativos: ${ativos} — filtrar a lista`}
      />
      <KpiStatCard
        icon={Gauge}
        iconColor={occupancyTone(pct).fg}
        iconBg={band.bg}
        value={totals.occupied}
        label="Vagas ocupadas"
        hint={`de ${totals.total} vagas · ${totals.free} livres`}
        tag={{ label: `${pct}% · ${band.label}`, bg: band.bg, fg: band.fg }}
        onClick={() => onTarget("ocupadas")}
        ariaLabel={`Vagas ocupadas: ${totals.occupied} — ordenar a lista por ocupação`}
      />
      <KpiStatCard
        icon={AlertTriangle}
        iconColor="#DC2626"
        iconBg="#FEF2F2"
        value={critical.length}
        label="Pátios em nível crítico"
        hint={critical.length > 0 ? criticalNames : "nenhum pátio acima de 85%"}
        tag={critical.length > 0 ? { label: "ação imediata", bg: "#FEE2E2", fg: "#B91C1C" } : { label: "em dia", bg: "#DCFCE7", fg: "#15803D" }}
        border={critical.length > 0 ? "#FCA5A5" : undefined}
        onClick={() => onTarget("criticos")}
        ariaLabel={`Pátios em nível crítico: ${critical.length} — filtrar a lista`}
      />
      <KpiStatCard
        icon={Ban}
        iconColor="#B91C1C"
        iconBg="#FEF2F2"
        value={totals.blocked}
        label="Vagas bloqueadas"
        hint="fora de uso por bloqueio operacional"
        tag={{ label: totals.blocked > 0 ? "revisar" : "nenhuma", bg: "#F1F5F9", fg: "#475569" }}
        onClick={() => onTarget("bloqueadas")}
        ariaLabel={`Vagas bloqueadas: ${totals.blocked} — filtrar a lista`}
      />
      <KpiStatCard
        icon={Unlock}
        iconColor="#7E22CE"
        iconBg="#FAF5FF"
        value={summary.releaseQueueDepth}
        label="Liberações pendentes"
        hint="processos aguardando restituição"
        tag={summary.releaseQueueDepth > 0 ? { label: "revisar", bg: "#F3E8FF", fg: "#7E22CE" } : { label: "em dia", bg: "#DCFCE7", fg: "#15803D" }}
        onClick={onReleases}
        ariaLabel={`Liberações pendentes: ${summary.releaseQueueDepth} — abrir a fila de liberações`}
      />
    </>
  );
}

function NetworkDonut({ totals, releaseQueueDepth, activeYards }: { readonly totals: NetworkTotals; readonly releaseQueueDepth: number; readonly activeYards: number }) {
  const segments = [
    { value: totals.occupied, color: "#F59E0B", label: "Ocupadas" },
    { value: totals.free, color: "#22C55E", label: "Livres" },
    { value: totals.blocked, color: "#DC2626", label: "Bloqueadas" },
  ];
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="pat-an-card">
      <div className="pat-an-card__title">
        <span>Ocupação da rede</span>
        <small>{`${totals.total} vagas · ${activeYards} ${activeYards === 1 ? "pátio ativo" : "pátios ativos"}`}</small>
      </div>
      <div className="pat-donut-wrap">
        <svg width="110" height="110" viewBox="0 0 110 110" role="img" aria-label={`${totals.pct ?? 0}% das vagas ocupadas`}>
          <circle cx="55" cy="55" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="16" />
          {segments.map((segment) => {
            const length = totals.total > 0 ? (segment.value / totals.total) * circumference : 0;
            const element = (
              <circle
                key={segment.label}
                cx="55"
                cy="55"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={`${length.toFixed(2)} ${(circumference - length).toFixed(2)}`}
                strokeDashoffset={(-offset).toFixed(2)}
                transform="rotate(-90 55 55)"
              >
                <title>{`${segment.label}: ${segment.value}`}</title>
              </circle>
            );
            offset += length;
            return element;
          })}
          <text x="55" y="53" textAnchor="middle" fontSize="20" fontWeight="800" fill="#0F172A">{`${totals.pct ?? 0}%`}</text>
          <text x="55" y="69" textAnchor="middle" fontSize="10" fill="#64748B">
            ocupadas
          </text>
        </svg>
        <div className="pat-lg-list" style={{ flex: 1 }}>
          {segments.map((segment) => (
            <div key={segment.label}>
              <span className="pat-lg-sw" style={{ background: segment.color }} />
              {segment.label}
              <b>{segment.value}</b>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 6 }}>
            <span className="pat-lg-sw" style={{ background: "#7E22CE" }} />
            Liberações pendentes
            <b>{releaseQueueDepth}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function OccupancyBars({ rows, onOpen }: { readonly rows: readonly YardRow[]; readonly onOpen: (yardId: string) => void }) {
  const bars = rows.filter((row) => row.yard.active && row.pct !== null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const width = 440;
  const rowHeight = 22;
  const top = 16;
  const left = 150;
  const barWidth = width - left - 44;
  const height = top + bars.length * rowHeight + 6;
  const guide = (pct: number) => {
    const x = left + (barWidth * pct) / 100;
    return (
      <g key={`guia-${pct}`} aria-hidden="true">
        <line x1={x} y1={top - 6} x2={x} y2={height - 4} stroke="#CBD5E1" strokeDasharray="3 3" />
        <text x={x} y={top - 8} textAnchor="middle" fontSize="9" fill="#94A3B8">{`${pct}%`}</text>
      </g>
    );
  };
  return (
    <div className="pat-an-card">
      <div className="pat-an-card__title">
        <span>Ocupação por pátio</span>
        <small>clique numa barra para abrir as vagas</small>
      </div>
      {bars.length === 0 ? (
        <div className="pat-cell-muted">Nenhum pátio ativo com vagas cadastradas.</div>
      ) : (
        <svg className="pat-bars-svg" viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Ocupação por pátio">
          {guide(60)}
          {guide(85)}
          {bars.map((row, index) => {
            const y = top + index * rowHeight;
            const pct = row.pct ?? 0;
            const tone = occupancyTone(pct);
            const short = shortYardName(row.yard.name);
            const name = short.length > 24 ? `${short.slice(0, 23)}…` : short;
            return (
              <g
                key={row.yard.id}
                role="button"
                tabIndex={0}
                aria-label={`${row.yard.name}: ${pct}% ocupado — abrir as vagas`}
                onClick={() => onOpen(row.yard.id)}
                onKeyDown={(event) => rowKeyToggle(event, () => onOpen(row.yard.id))}
              >
                <title>{`${row.yard.name}: ${pct}% ocupado`}</title>
                <rect className="pat-bar-bg" x="0" y={y} width={width} height={rowHeight - 2} rx="4" fill="transparent" />
                <text x="6" y={y + 14} fontSize="11" fontWeight="600" fill="#334155">
                  {name}
                </text>
                <rect x={left} y={y + 5} width={barWidth} height="9" rx="4.5" fill="#F1F5F9" />
                <rect x={left} y={y + 5} width={((barWidth * Math.min(100, pct)) / 100).toFixed(1)} height="9" rx="4.5" fill={tone.bar} />
                <text x={width - 4} y={y + 14} textAnchor="end" fontSize="11" fontWeight="800" fill={tone.fg}>{`${pct}%`}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function PhasePanel({ summary, rows }: { readonly summary: PatiosDashboardSummary; readonly rows: readonly YardRow[] }) {
  const phases = [
    { label: "Recepção", value: summary.processesByPhase.RECEPTION, color: "#0EA5E9" },
    { label: "Custódia", value: summary.processesByPhase.CUSTODY, color: "#22C55E" },
    { label: "Liberação", value: summary.processesByPhase.RELEASE, color: "#7E22CE" },
    { label: "Leilão", value: summary.processesByPhase.AUCTION, color: "#F59E0B" },
  ];
  const total = phases.reduce((sum, phase) => sum + phase.value, 0);
  const bands: readonly { key: OccupancyBand; label: string; color: string }[] = [
    { key: "critica", label: "Crítica (>85%)", color: "#DC2626" },
    { key: "atencao", label: "Atenção (60–85%)", color: "#F59E0B" },
    { key: "saudavel", label: "Saudável (<60%)", color: "#22C55E" },
    { key: "inativo", label: "Inativos", color: "#94A3B8" },
  ];
  return (
    <div className="pat-an-card">
      <div className="pat-an-card__title">
        <span>Processos por fase</span>
        <small>{`${total} veículos nos pátios`}</small>
      </div>
      <div className="pat-fase-bar" role="img" aria-label={phases.map((phase) => `${phase.label}: ${phase.value}`).join(", ")}>
        {total > 0
          ? phases
              .filter((phase) => phase.value > 0)
              .map((phase) => <span key={phase.label} style={{ width: `${(phase.value / total) * 100}%`, background: phase.color }} title={`${phase.label}: ${phase.value}`} />)
          : null}
      </div>
      <div className="pat-lg-list">
        {phases.map((phase) => (
          <div key={phase.label}>
            <span className="pat-lg-sw" style={{ background: phase.color }} />
            {phase.label}
            <b>{phase.value}</b>
          </div>
        ))}
      </div>
      <div className="pat-an-card__title" style={{ margin: "12px 0 6px" }}>
        <span style={{ fontSize: 12 }}>Pátios por faixa de ocupação</span>
      </div>
      <div className="pat-lg-list">
        {bands.map((band) => (
          <div key={band.key}>
            <span className="pat-lg-sw" style={{ background: band.color }} />
            {band.label}
            <b>{rows.filter((row) => row.band === band.key).length}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
