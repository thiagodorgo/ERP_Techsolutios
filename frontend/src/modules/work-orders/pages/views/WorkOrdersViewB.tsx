import { CategoryDonut, ColumnBars, type ColumnBarTone } from "../../../../components/charts";
import { PageHeader } from "../../../../components/patterns";
import { WORK_ORDER_PRIORITY_LABEL, WORK_ORDER_STATUS_LABEL } from "../../work-orders-row.logic";
import {
  AgendaCell,
  AnalyticCard,
  ClientCell,
  clientCellTitle,
  CodeCell,
  countWorkOrders,
  filterWorkOrderList,
  isListFailure,
  PriorityMark,
  PRIORITY_ORDER,
  SlaCell,
  STATUS_ORDER,
  STATUS_TONE,
  StatusCell,
  TargetChip,
  UniverseNote,
  universeLabel,
  usePagedRows,
  WorkOrderSummary,
  WorkOrdersKpiGrid,
  WorkOrdersLoadState,
  WorkOrdersStatusStrip,
  WorkOrdersTable,
  WorkOrdersToolbar,
  type AgendaBand,
  type WorkOrderColumn,
  type WorkOrdersCounts,
} from "./work-orders.shared";
import type { WorkOrdersViewModel } from "./work-orders.view-model";

// B-APAR-OS — APARÊNCIA B "Analítica" (referência aprovada `screen-refs/ordens-de-servico-3opcoes.reference.html`,
// `montarB`/`renderB`/`analiticoB`): 5 indicadores (os 4 + "SLA vencido", só OS com prazo de SLA definido); a faixa
// "Situação das OS" (barras), "Agenda das OS na fila" (colunas da biblioteca) e "Prioridade das OS abertas" (rosca da
// biblioteca + "OS sem técnico" e "Sem cliente vinculado") — tudo FILTRA a lista; colunas com PRIORIDADE e SLA; "Abrir OS"
// abre a janela de tamanho fixo por cima da lista (o contêiner cuida de `?os=`). Toda contagem é sobre a lista carregada
// e diz o universo quando o servidor tem mais OS. VIEW PURA.

const AGENDA_COLUMNS: readonly { readonly target: string; readonly band: AgendaBand; readonly label: string; readonly tone: ColumnBarTone }[] = [
  { target: "ag-atrasadas", band: "atrasadas", label: "Atrasadas", tone: "agenda-overdue" },
  { target: "ag-prox2h", band: "prox2h", label: "Próximas 2 h", tone: "agenda-soon" },
  { target: "ag-hoje", band: "hoje", label: "Ainda hoje", tone: "agenda-today" },
  { target: "ag-depois", band: "depois", label: "Amanhã em diante", tone: "agenda-later" },
  { target: "ag-sem-agenda", band: "semagenda", label: "Sem agenda", tone: "agenda-none" },
];

const PRIORITY_COLOR = { urgent: "#B91C1C", high: "#F97316", medium: "#F59E0B", low: "#94A3B8" } as const;

const pad = (n: number) => n.toString().padStart(2, "0");

function AnalyticStrip({ model, counts }: { readonly model: WorkOrdersViewModel; readonly counts: WorkOrdersCounts }) {
  const pressed = model.state.target;
  const toggle = (key: string) => model.onState({ ...model.state, target: pressed === key ? null : key });
  const universe = universeLabel(model);
  const suffix = universe ? ` (${universe})` : "";
  const statuses = STATUS_ORDER.filter((status) => counts.byStatus[status] > 0);
  const maxStatus = Math.max(1, ...statuses.map((status) => counts.byStatus[status]));

  return (
    <div className="aparos-analitico">
      <AnalyticCard title="Situação das OS" hint={universe ?? "clique para filtrar"}>
        {statuses.map((status) => {
          const n = counts.byStatus[status];
          const key = `st-${status}`;
          const color = STATUS_TONE[status].fg;
          return (
            <button key={status} type="button" className="aparos-barra" aria-pressed={pressed === key} aria-label={`${WORK_ORDER_STATUS_LABEL[status]}: ${n}${suffix} — filtrar a lista`} onClick={() => toggle(key)}>
              <span className="aparos-barra__rot">
                <i style={{ background: color }} aria-hidden="true" />
                {WORK_ORDER_STATUS_LABEL[status]}
              </span>
              <span className="aparos-barra__trilho" aria-hidden="true">
                <b style={{ width: `${((n / maxStatus) * 100).toFixed(1)}%`, background: color }} />
              </span>
              <span className="aparos-barra__n">{n}</span>
            </button>
          );
        })}
      </AnalyticCard>

      <AnalyticCard title="Agenda das OS na fila" hint={`a partir de agora · ${pad(model.now.getHours())}:${pad(model.now.getMinutes())}`}>
        <ColumnBars
          ariaLabel="OS por faixa de agenda"
          height={128}
          barHeight={82}
          pressedKey={pressed}
          onSelect={toggle}
          items={AGENDA_COLUMNS.map((column) => ({
            key: column.target,
            label: column.label,
            value: counts.bands[column.band],
            ariaLabel: `${column.label}: ${counts.bands[column.band]}${suffix} — filtrar a lista`,
            bars: [{ tone: column.tone, value: counts.bands[column.band] }],
          }))}
        />
        <div className="aparos-nota">Mesma regra de atraso da lista: agenda vencida e sem conclusão.</div>
      </AnalyticCard>

      <AnalyticCard title="Prioridade das OS abertas" hint={`${counts.abertas} na fila`} className="aparos-an-prio">
        <CategoryDonut
          ariaLabel="Prioridade das OS abertas"
          centerValue={counts.abertas}
          centerLabel="abertas"
          pressedKey={pressed}
          onSelect={toggle}
          segments={PRIORITY_ORDER.map((priority) => ({ key: `pr-${priority}`, label: WORK_ORDER_PRIORITY_LABEL[priority], count: counts.openByPriority[priority], color: PRIORITY_COLOR[priority] }))}
          segmentAriaLabel={(segment) => `Prioridade ${segment.label} (abertas): ${segment.count}${suffix} — filtrar a lista`}
        />
        <div className="aparos-atencao">
          <button type="button" aria-pressed={pressed === "sem-tecnico"} aria-label={`OS sem técnico: ${counts.semTecnico}${suffix} — filtrar a lista`} onClick={() => toggle("sem-tecnico")}>
            <b>{counts.semTecnico}</b>
            <span>OS sem técnico</span>
          </button>
          <button type="button" aria-pressed={pressed === "sem-cliente"} aria-label={`Sem cliente vinculado: ${counts.semCliente}${suffix} — filtrar a lista`} onClick={() => toggle("sem-cliente")}>
            <b>{counts.semCliente}</b>
            <span>Sem cliente vinculado</span>
          </button>
        </div>
      </AnalyticCard>
    </div>
  );
}

export function WorkOrdersViewB(model: WorkOrdersViewModel) {
  const counts = countWorkOrders(model.items, model.now);
  const rows = filterWorkOrderList(model.items, model.state, model.now);
  const failure = isListFailure(model.status);
  const resetKey = `${model.state.tab}|${model.state.target ?? ""}|${model.state.q}|${model.items.length}`;
  const { pageRows, pager } = usePagedRows(rows, resetKey);
  const showStrip = !model.loading && !failure && model.items.length > 0;

  const columns: readonly WorkOrderColumn[] = [
    { key: "codigo", header: "CÓDIGO", width: 112, render: (o) => <CodeCell order={o} withPriority={false} /> },
    { key: "cliente", header: "CLIENTE / SERVIÇO", render: (o) => <ClientCell order={o} />, title: clientCellTitle },
    { key: "prioridade", header: "PRIORIDADE", width: 96, render: (o) => <PriorityMark priority={o.priority} /> },
    { key: "sla", header: "SLA", width: 150, render: (o) => <SlaCell order={o} now={model.now} /> },
    { key: "agenda", header: "AGENDA", width: 172, render: (o) => <AgendaCell order={o} now={model.now} /> },
    { key: "situacao", header: "SITUAÇÃO", width: 124, render: (o) => <StatusCell order={o} /> },
  ];

  return (
    <div data-aparencia="B" className="aparos aparos--b" style={{ color: "#0F172A" }}>
      <PageHeader
        kicker="OPERAÇÃO · VISÃO ANALÍTICA"
        title="Ordens de Serviço"
        subtitle="Onde está a pressão do dia — atrasos, prazo de SLA, OS sem técnico — e a lista logo abaixo."
        actions={model.headerActions}
      />
      {model.filterCard}
      <WorkOrdersStatusStrip model={model} />
      <UniverseNote model={model} />
      <WorkOrdersKpiGrid
        kpis={counts}
        extra
        skeleton={model.loading && model.items.length === 0}
        degraded={failure}
        pressed={model.state.target}
        onFilter={(key) => model.onState({ ...model.state, target: model.state.target === key ? null : key })}
        universe={universeLabel(model)}
      />
      {showStrip ? <AnalyticStrip model={model} counts={counts} /> : null}

      {failure && !model.loading ? (
        <WorkOrdersLoadState status={model.status} message={model.error} onRetry={model.onRetry} />
      ) : (
        <div className="aparos-card">
          <WorkOrdersToolbar model={model} total={rows.length} showTabs />
          <TargetChip model={model} />
          <WorkOrdersTable model={model} columns={columns} rows={pageRows} renderSummary={(order) => <WorkOrderSummary order={order} model={model} variant="b" />} />
          {model.loading ? null : pager}
        </div>
      )}
    </div>
  );
}
