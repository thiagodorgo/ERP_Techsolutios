import { PageHeader } from "../../../../components/patterns";
import {
  AgendaCell,
  ClientCell,
  clientCellTitle,
  CodeCell,
  countWorkOrders,
  filterWorkOrderList,
  isListFailure,
  StatusCell,
  TargetChip,
  TechnicianCell,
  UniverseNote,
  universeLabel,
  usePagedRows,
  WorkOrderSummary,
  WorkOrdersKpiGrid,
  WorkOrdersLoadState,
  WorkOrdersStatusStrip,
  WorkOrdersTable,
  WorkOrdersToolbar,
  type WorkOrderColumn,
} from "./work-orders.shared";
import type { WorkOrdersViewModel } from "./work-orders.view-model";

// B-APAR-OS — APARÊNCIA A "Padrão fiel" (referência aprovada `screen-refs/ordens-de-servico-3opcoes.reference.html`,
// `montarA`/`renderA`): a lista de hoje no padrão D-PADRAO-BLOCOS-CLICAVEIS. Cabeçalho OPERAÇÃO com Filtrar/Exportar/
// Nova OS; os 4 indicadores de hoje, agora FILTRANDO a lista (chip removível) no lugar do pop-up; colunas CÓDIGO ·
// CLIENTE/SERVIÇO · TÉCNICO · AGENDA · SITUAÇÃO numa linha só, sem botão; a linha abre o resumo embaixo com os alvos
// que ela tinha; "Abrir OS" leva à página do detalhe (`/work-orders/:id`), como hoje. VIEW PURA.

export function WorkOrdersViewA(model: WorkOrdersViewModel) {
  const counts = countWorkOrders(model.items, model.now);
  const rows = filterWorkOrderList(model.items, model.state, model.now);
  const failure = isListFailure(model.status);
  const resetKey = `${model.state.tab}|${model.state.target ?? ""}|${model.state.q}|${model.items.length}`;
  const { pageRows, pager } = usePagedRows(rows, resetKey);

  const columns: readonly WorkOrderColumn[] = [
    { key: "codigo", header: "CÓDIGO", width: 150, render: (o) => <CodeCell order={o} /> },
    { key: "cliente", header: "CLIENTE / SERVIÇO", render: (o) => <ClientCell order={o} />, title: clientCellTitle },
    { key: "tecnico", header: "TÉCNICO", width: 132, render: (o) => <TechnicianCell order={o} /> },
    { key: "agenda", header: "AGENDA", width: 178, render: (o) => <AgendaCell order={o} now={model.now} /> },
    { key: "situacao", header: "SITUAÇÃO", width: 126, render: (o) => <StatusCell order={o} /> },
  ];

  return (
    <div data-aparencia="A" className="aparos aparos--a" style={{ color: "#0F172A" }}>
      <PageHeader kicker="OPERAÇÃO" title="Ordens de Serviço" subtitle="Atribuição, execução, SLA e rastreabilidade de cada atendimento em campo." actions={model.headerActions} />
      {model.filterCard}
      <WorkOrdersStatusStrip model={model} />
      <UniverseNote model={model} />
      <WorkOrdersKpiGrid
        kpis={counts}
        skeleton={model.loading && model.items.length === 0}
        degraded={failure}
        pressed={model.state.target}
        onFilter={(key) => model.onState({ ...model.state, target: model.state.target === key ? null : key })}
        universe={universeLabel(model)}
      />

      {failure && !model.loading ? (
        <WorkOrdersLoadState status={model.status} message={model.error} onRetry={model.onRetry} />
      ) : (
        <div className="aparos-card">
          <WorkOrdersToolbar model={model} total={rows.length} showTabs />
          <TargetChip model={model} />
          <WorkOrdersTable model={model} columns={columns} rows={pageRows} renderSummary={(order) => <WorkOrderSummary order={order} model={model} variant="a" />} />
          {model.loading ? null : pager}
        </div>
      )}
    </div>
  );
}
