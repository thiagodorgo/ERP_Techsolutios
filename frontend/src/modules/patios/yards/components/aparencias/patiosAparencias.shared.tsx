import { Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE, paginate } from "../../../../../components/dense-list";
import type { PatiosDashboardSummary, YardOccupancySummary } from "../../../dashboard/dashboard.types";
import type { YardItem, YardsApiContext } from "../../yards.types";

// B-APARENCIA-USUARIO — o que as 3 aparências de Pátios (A Padrão, B Analítica, C Mesa de pátio) compartilham.
// As views são PURAS quanto aos dados da lista: o cadastro (useYards), o resumo de ocupação
// (usePatiosDashboardSummary) e a auto-atualização (useAutoRefresh) são chamados UMA vez, em PatiosPage, e
// chegam aqui por props. Trocar de aparência não refaz requisição nenhuma da lista.

/** Faixas de ocupação do protótipo: <60% saudável, 60–85% atenção, >85% crítico. */
export function occupancyTone(pct: number): { fg: string; bar: string } {
  if (pct > 85) return { fg: "#B91C1C", bar: "#DC2626" };
  if (pct >= 60) return { fg: "#B45309", bar: "#F59E0B" };
  return { fg: "#15803D", bar: "#22C55E" };
}

/** Rótulo e fundo da faixa (tag dos KPIs da referência). */
export function occupancyBandTag(pct: number): { label: string; bg: string; fg: string } {
  if (pct > 85) return { label: "crítica", bg: "#FEE2E2", fg: "#B91C1C" };
  if (pct >= 60) return { label: "atenção", bg: "#FEF3C7", fg: "#B45309" };
  return { label: "saudável", bg: "#DCFCE7", fg: "#15803D" };
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

export type OccupancyBand = "critica" | "atencao" | "saudavel" | "inativo" | "sem-vagas";

export type YardRow = {
  readonly yard: YardItem;
  readonly occupancy: YardOccupancySummary | null;
  /** % de vagas ocupadas; null quando o pátio não tem vaga cadastrada ou o resumo não veio. */
  readonly pct: number | null;
  readonly band: OccupancyBand;
};

export function occupancyBand(active: boolean, pct: number | null): OccupancyBand {
  if (!active) return "inativo";
  if (pct === null) return "sem-vagas";
  if (pct > 85) return "critica";
  if (pct >= 60) return "atencao";
  return "saudavel";
}

/** Junta cadastro e ocupação REAL por pátio (uma requisição do resumo, indexada por pátio). */
export function buildYardRows(items: readonly YardItem[], summary: PatiosDashboardSummary | null): YardRow[] {
  const index = new Map<string, YardOccupancySummary>();
  for (const occupancy of summary?.occupancy ?? []) index.set(occupancy.yardId, occupancy);
  return items.map((yard) => {
    const occupancy = index.get(yard.id) ?? null;
    const pct = occupancy && occupancy.totalSpots > 0 ? Math.round((occupancy.occupiedSpots / occupancy.totalSpots) * 100) : null;
    return { yard, occupancy, pct, band: occupancyBand(yard.active, pct) };
  });
}

export type NetworkTotals = {
  readonly total: number;
  readonly occupied: number;
  readonly free: number;
  readonly blocked: number;
  readonly pct: number | null;
};

export function networkTotals(summary: PatiosDashboardSummary | null): NetworkTotals {
  const totals = (summary?.occupancy ?? []).reduce(
    (acc, yard) => ({
      total: acc.total + yard.totalSpots,
      occupied: acc.occupied + yard.occupiedSpots,
      free: acc.free + yard.freeSpots,
      blocked: acc.blocked + yard.blockedSpots,
    }),
    { total: 0, occupied: 0, free: 0, blocked: 0 },
  );
  return { ...totals, pct: totals.total > 0 ? Math.round((totals.occupied / totals.total) * 100) : null };
}

/**
 * Fuso legível (referência: "Brasília (UTC−3)"). Só os fusos brasileiros conhecidos ganham nome; qualquer outro
 * mostra o identificador como veio — nunca um nome inventado.
 */
const TIMEZONE_LABELS: Readonly<Record<string, string>> = {
  "America/Sao_Paulo": "Brasília (UTC−3)",
  "America/Bahia": "Bahia (UTC−3)",
  "America/Fortaleza": "Fortaleza (UTC−3)",
  "America/Recife": "Recife (UTC−3)",
  "America/Belem": "Belém (UTC−3)",
  "America/Manaus": "Manaus (UTC−4)",
  "America/Cuiaba": "Cuiabá (UTC−4)",
  "America/Campo_Grande": "Campo Grande (UTC−4)",
  "America/Porto_Velho": "Porto Velho (UTC−4)",
  "America/Boa_Vista": "Boa Vista (UTC−4)",
  "America/Rio_Branco": "Rio Branco (UTC−5)",
  "America/Noronha": "Fernando de Noronha (UTC−2)",
};

export function timezoneLabel(timezone: string): string {
  return TIMEZONE_LABELS[timezone] ?? timezone;
}

export type PatiosViewProps = {
  readonly items: readonly YardItem[];
  readonly serverTotal: number;
  readonly partialWindow: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
  readonly summary: PatiosDashboardSummary | null;
  readonly summaryDenied: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly onCreate: () => void;
  readonly onEdit: (yard: YardItem) => void;
  /** Contexto de API para o quadro de vagas de UM pátio (B: detalhe da linha; C: quadro ao lado). */
  readonly apiContext: YardsApiContext;
};

/** Ações do cabeçalho padronizado (busca + "Novo pátio"), iguais nas 3 aparências. */
export function PatiosHeaderActions({
  search,
  onSearch,
  canCreate,
  onCreate,
}: {
  readonly search: string;
  readonly onSearch: (value: string) => void;
  readonly canCreate: boolean;
  readonly onCreate: () => void;
}) {
  return (
    <>
      <div className="pat-header-search">
        <Search size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar por nome ou endereço…"
          aria-label="Buscar por nome ou endereço"
        />
      </div>
      {canCreate ? (
        <button type="button" className="pat-btn pat-btn--primary" onClick={onCreate}>
          <Plus size={15} aria-hidden="true" /> Novo pátio
        </button>
      ) : null}
    </>
  );
}

/** Ocupação em linha (barra + %), ou a capacidade prevista quando não há vaga cadastrada/resumo. */
export function OccupancyInline({ row, compact = false }: { readonly row: YardRow; readonly compact?: boolean }) {
  if (row.pct === null || !row.occupancy) {
    return row.yard.capacityHint !== null ? (
      <span className="pat-cell-body">
        <strong className="pat-occ-count">{row.yard.capacityHint}</strong> vagas previstas
      </span>
    ) : (
      <span className="pat-cell-muted">não informada</span>
    );
  }
  const tone = occupancyTone(row.pct);
  return (
    <span className="pat-occ-inline">
      {compact ? null : <span className="pat-occ-inline__txt">{`${row.occupancy.occupiedSpots} de ${row.occupancy.totalSpots} vagas`}</span>}
      <span className="pat-occ-inline__bar" aria-hidden="true">
        <i style={{ width: `${Math.min(100, row.pct)}%`, background: tone.bar }} />
      </span>
      <span className="pat-occ-inline__pct" style={{ color: tone.fg }}>{`${row.pct}%`}</span>
    </span>
  );
}

/** Chip do filtro ativo (vindo de um bloco clicável): visível acima da lista e removível com um clique. */
export function ActiveFilterChip({ label, onClear }: { readonly label: string | null; readonly onClear: () => void }) {
  if (!label) return null;
  return (
    <div className="pat-filtro-chip-bar">
      <div className="pat-filtro-chip">
        <span>{`Filtro: ${label}`}</span>
        <button type="button" onClick={onClear} aria-label="Limpar filtro">
          ✕
        </button>
      </div>
    </div>
  );
}

/** Campo "RÓTULO: valor" do detalhe da linha. */
export function DetailField({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{`${label}:`}</span> <span className="pat-ab-detail-val">{children}</span>
    </div>
  );
}

/** Teclado da linha que abre o detalhe (D-PADRAO-BLOCOS-CLICAVEIS): Enter/Espaço alternam. */
export function rowKeyToggle(event: { key: string; preventDefault: () => void }, toggle: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggle();
  }
}

export type YardRowSortKey = "name" | "occupancy" | "active";
export type YardRowSort = { readonly key: YardRowSortKey; readonly dir: "asc" | "desc" };

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function compareRows(a: YardRow, b: YardRow, key: YardRowSortKey): number {
  if (key === "occupancy") return (a.pct ?? -1) - (b.pct ?? -1);
  if (key === "active") return Number(b.yard.active) - Number(a.yard.active);
  return a.yard.name.localeCompare(b.yard.name, "pt-BR");
}

/**
 * Estado de lista das aparências B e C: busca (nome/endereço), ordenação, página e UMA linha aberta por vez
 * (D-PADRAO-BLOCOS-CLICAVEIS). `rows` já chega filtrado pela aba e pelo bloco clicável de cada aparência.
 */
export function useYardRowList(rows: readonly YardRow[]) {
  const [search, setSearchState] = useState("");
  const [sort, setSort] = useState<YardRowSort>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = normalize(search);
    const matched = query ? rows.filter((row) => normalize(`${row.yard.name} ${row.yard.address}`).includes(query)) : [...rows];
    const factor = sort.dir === "asc" ? 1 : -1;
    return matched.sort((a, b) => compareRows(a, b, sort.key) * factor || a.yard.name.localeCompare(b.yard.name, "pt-BR"));
  }, [rows, search, sort]);

  const pageResult = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);

  return {
    search,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    sort,
    toggleSort: (key: YardRowSortKey) => {
      setSort((current) => ({ key, dir: current.key === key && current.dir === "asc" ? "desc" : "asc" }));
      setPage(1);
    },
    setSort: (next: YardRowSort) => {
      setSort(next);
      setPage(1);
    },
    total: filtered.length,
    visible: pageResult.slice,
    page: pageResult.page,
    totalPages: pageResult.totalPages,
    pageStart: pageResult.pageStart,
    pageEnd: pageResult.pageEnd,
    pageSize,
    setPage,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
    openId,
    toggleOpen: (id: string) => setOpenId((current) => (current === id ? null : id)),
    setOpenId,
  };
}

export function sortLabel(sort: YardRowSort, key: YardRowSortKey): string {
  if (sort.key !== key) return "";
  return sort.dir === "asc" ? " ↑" : " ↓";
}

export function ariaSort(sort: YardRowSort, key: YardRowSortKey): "ascending" | "descending" | "none" {
  if (sort.key !== key) return "none";
  return sort.dir === "asc" ? "ascending" : "descending";
}

export const ACTIVE_TONE ={ bg: "#DCFCE7", fg: "#15803D", dot: "#22C55E" } as const;
export const INACTIVE_TONE = { bg: "#F1F5F9", fg: "#64748B", dot: "#94A3B8" } as const;
