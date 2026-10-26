import { AlertTriangle, ArrowRight, Ban, ChevronDown, Pencil, Warehouse } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { PageHeader, StatusPill, TablePager } from "../../../../../components/patterns";
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
  rowKeyToggle,
  sortLabel,
  timezoneLabel,
  useYardRowList,
  type PatiosViewProps,
  type YardRow,
} from "./patiosAparencias.shared";
import { YardSpotBoardPanel } from "./YardSpotBoard";

// B-APARENCIA-USUARIO — aparência C · Mesa de pátio (referência `patios-3opcoes.reference.html`, opção C: lista à
// esquerda e as vagas do pátio escolhido à direita, sempre à vista). Blocos de resumo clicáveis que filtram a lista,
// linha de UMA linha que abre o detalhe embaixo e escolhe o pátio do quadro (D-PADRAO-BLOCOS-CLICAVEIS).
// O quadro busca as vagas SÓ do pátio escolhido (as mesmas chamadas da página do pátio).

type Situation = "todos" | "ativos" | "inativos";
type Target = "criticos" | "bloqueadas" | "inativos";

const SITUATION_TABS: readonly { value: Situation; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
];

const TARGET_LABEL: Readonly<Record<Target, string>> = {
  criticos: "Ocupação crítica (acima de 85%)",
  bloqueadas: "Com vagas bloqueadas",
  inativos: "Pátios inativos",
};

function applyFilters(rows: readonly YardRow[], situation: Situation, target: Target | null): YardRow[] {
  let result = [...rows];
  if (situation === "ativos") result = result.filter((row) => row.yard.active);
  if (situation === "inativos") result = result.filter((row) => !row.yard.active);
  if (target === "criticos") result = result.filter((row) => row.band === "critica");
  if (target === "bloqueadas") result = result.filter((row) => (row.occupancy?.blockedSpots ?? 0) > 0);
  if (target === "inativos") result = result.filter((row) => !row.yard.active);
  return result;
}

function SummaryBlock({
  icon: Icon,
  color,
  bg,
  value,
  label,
  pressed,
  onClick,
}: {
  readonly icon: LucideIcon;
  readonly color: string;
  readonly bg: string;
  readonly value: string | number;
  readonly label: string;
  readonly pressed: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button type="button" className="pat-bloco-c" aria-pressed={pressed} onClick={onClick} aria-label={`${label}: ${value} — filtrar a lista`}>
      <span className="pat-kpi__tile" style={{ background: bg, color, width: 34, height: 34 }} aria-hidden="true">
        <Icon size={16} />
      </span>
      <span>
        <b style={{ color }}>{value}</b>
        <br />
        {label}
      </span>
    </button>
  );
}

export function PatiosViewC({ items, serverTotal, loading, error, onRetry, summary, canCreate, canUpdate, onCreate, onEdit, apiContext }: PatiosViewProps) {
  const rows = useMemo(() => buildYardRows(items, summary), [items, summary]);
  const [situation, setSituation] = useState<Situation>("todos");
  const [target, setTarget] = useState<Target | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredRows = useMemo(() => applyFilters(rows, situation, target), [rows, situation, target]);
  const list = useYardRowList(filteredRows);

  const hasData = !(loading && items.length === 0) && !(error && items.length === 0);
  const counts = {
    todos: rows.length,
    criticos: rows.filter((row) => row.band === "critica").length,
    bloqueadas: rows.filter((row) => (row.occupancy?.blockedSpots ?? 0) > 0).length,
    inativos: rows.filter((row) => !row.yard.active).length,
  };
  const show = (value: number) => (hasData ? value : "—");

  // Quadro: o pátio escolhido; sem escolha, o primeiro da lista visível (referência: começa num pátio).
  const selected = rows.find((row) => row.yard.id === selectedId)?.yard ?? list.visible[0]?.yard ?? null;
  const pickTarget = (next: Target | null) => {
    setTarget((current) => (next === null || current === next ? null : next));
    list.setOpenId(null);
  };

  return (
    <div style={{ color: "#0F172A" }} data-aparencia="C">
      <PageHeader
        kicker="PÁTIOS · MESA DE PÁTIO"
        title="Pátios"
        subtitle="Lista dos pátios à esquerda e as vagas do pátio escolhido à direita, sempre à vista."
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

      <div className="pat-blocos-c" aria-live="polite">
        {loading && items.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => <div key={index} className="pat-skel" style={{ height: 58, borderRadius: 12 }} aria-hidden="true" />)
        ) : (
          <>
            <SummaryBlock icon={Warehouse} color="#2563EB" bg="#EFF6FF" value={show(counts.todos)} label="Todos os pátios" pressed={target === null} onClick={() => pickTarget(null)} />
            <SummaryBlock icon={AlertTriangle} color="#B91C1C" bg="#FEF2F2" value={show(counts.criticos)} label="Ocupação crítica (>85%)" pressed={target === "criticos"} onClick={() => pickTarget("criticos")} />
            <SummaryBlock icon={Ban} color="#B45309" bg="#FFFBEB" value={show(counts.bloqueadas)} label="Com vagas bloqueadas" pressed={target === "bloqueadas"} onClick={() => pickTarget("bloqueadas")} />
            <SummaryBlock icon={Ban} color="#64748B" bg="#F1F5F9" value={show(counts.inativos)} label="Pátios inativos" pressed={target === "inativos"} onClick={() => pickTarget("inativos")} />
          </>
        )}
      </div>

      <div className="pat-mesa">
        <div className="pat-table">
          <div className="pat-table__topbar">
            <div className="pat-os-tabs" role="group" aria-label="Filtrar por situação">
              {SITUATION_TABS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={situation === item.value ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                  aria-pressed={situation === item.value}
                  onClick={() => {
                    setSituation(item.value);
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
              ) : !hasData ? (
                "—"
              ) : list.total !== serverTotal ? (
                `${list.total} de ${serverTotal} pátios`
              ) : (
                `${serverTotal} ${serverTotal === 1 ? "pátio cadastrado" : "pátios cadastrados"}`
              )}
            </span>
          </div>
          <ActiveFilterChip label={target ? TARGET_LABEL[target] : null} onClear={() => pickTarget(null)} />

          <table className="pat-ab-table">
            <colgroup>
              <col />
              <col style={{ width: 132 }} />
              <col style={{ width: 92 }} />
              <col style={{ width: 40 }} />
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
                    {`OCUPAÇÃO${sortLabel(list.sort, "occupancy")}`}
                  </button>
                </th>
                <th>SITUAÇÃO</th>
                <th>
                  <span className="sr-only">Abrir detalhe</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0
                ? [0, 1, 2].map((index) => (
                    <tr key={index} className="pat-ab-row" aria-hidden="true">
                      {Array.from({ length: 4 }).map((_, cell) => (
                        <td key={cell}>
                          <span className="pat-skel" style={{ display: "inline-block", width: "80%", height: 12, verticalAlign: "middle" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : null}
              {error && list.total === 0 && !loading ? (
                <tr>
                  <td colSpan={4}>
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
                  <td colSpan={4}>
                    <div className="pat-table__empty">
                      <div className="pat-table__empty-title">Nenhum pátio encontrado</div>
                      <div className="pat-table__empty-detail">
                        {items.length > 0 ? "Ajuste a busca, a situação ou o filtro para encontrar pátios." : "Cadastre o primeiro pátio para organizar as áreas e vagas de guarda."}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
              {!error || list.total > 0
                ? list.visible.map((row) => {
                    const open = list.openId === row.yard.id;
                    const tone = row.yard.active ? ACTIVE_TONE : INACTIVE_TONE;
                    const toggle = () => {
                      list.toggleOpen(row.yard.id);
                      setSelectedId(row.yard.id);
                    };
                    return (
                      <Fragment key={row.yard.id}>
                        <tr
                          className="pat-ab-row"
                          tabIndex={0}
                          aria-expanded={open}
                          aria-current={selected?.id === row.yard.id ? "true" : undefined}
                          onClick={toggle}
                          onKeyDown={(event) => rowKeyToggle(event, toggle)}
                        >
                          <td title={row.yard.name}>
                            <span className="pat-nome-patio">{row.yard.name}</span>
                          </td>
                          <td>
                            <OccupancyInline row={row} compact />
                          </td>
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
                            <td colSpan={4} className="pat-ab-detail-cell">
                              <div className="pat-ab-detail-content">
                                <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
                                  <div className="pat-ab-detail-col">
                                    <DetailField label="Endereço">{row.yard.address || "—"}</DetailField>
                                    <DetailField label="Fuso horário">{timezoneLabel(row.yard.timezone)}</DetailField>
                                  </div>
                                  <div className="pat-ab-detail-col">
                                    {row.occupancy && row.occupancy.totalSpots > 0 ? (
                                      <>
                                        <DetailField label="Vagas">{`${row.occupancy.totalSpots} (${row.occupancy.freeSpots} livres)`}</DetailField>
                                        <DetailField label="Ocupadas">{`${row.occupancy.occupiedSpots} · ${row.pct ?? 0}%`}</DetailField>
                                        <DetailField label="Bloqueadas">{row.occupancy.blockedSpots}</DetailField>
                                      </>
                                    ) : (
                                      <DetailField label="Capacidade prevista">{row.yard.capacityHint !== null ? `${row.yard.capacityHint} vagas` : "não informada"}</DetailField>
                                    )}
                                  </div>
                                </div>
                                <div className="pat-ab-detail-actions">
                                  <Link to={`/patios/patios/${row.yard.id}`} className="pat-btn pat-btn--primary">
                                    <ArrowRight size={14} aria-hidden="true" /> Abrir página do pátio
                                  </Link>
                                  {canUpdate ? (
                                    <button type="button" className="pat-btn" onClick={() => onEdit(row.yard)}>
                                      <Pencil size={13} aria-hidden="true" /> Editar
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

        <YardSpotBoardPanel yard={hasData ? selected : null} apiContext={apiContext} />
      </div>
    </div>
  );
}
