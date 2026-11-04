import { X } from "lucide-react";

import { PageHeader } from "../../../../components/patterns";
import {
  agendaBand,
  agendaInfo,
  ClientCell,
  clientCellTitle,
  CodeCell,
  countWorkOrders,
  filterWorkOrderList,
  isListFailure,
  SOON_MINUTES,
  StatusCell,
  TargetChip,
  TechnicianCell,
  UniverseNote,
  universeLabel,
  WorkOrderSummary,
  WorkOrdersLoadState,
  WorkOrdersStatusStrip,
  WorkOrdersTable,
  WorkOrdersToolbar,
  WORK_ORDER_TABS,
  type AgendaBand,
  type WorkOrderColumn,
  type WorkOrderGroup,
  type WorkOrdersCounts,
} from "./work-orders.shared";
import type { WorkOrdersViewModel } from "./work-orders.view-model";

// B-APAR-OS — APARÊNCIA C "Fila por agenda" (referência aprovada `screen-refs/ordens-de-servico-3opcoes.reference.html`,
// `montarC`/`renderC`/`linhasAgrupadasC`): 7 blocos que filtram (Na fila, Atrasadas, Próximas 2 h, Ainda hoje, Amanhã em
// diante, Sem agenda, Finalizadas); a lista AGRUPADA por essas faixas, em ordem de horário, com HORA · CÓDIGO · CLIENTE/
// SERVIÇO · CIDADE · TÉCNICO · SITUAÇÃO; o resumo traz a linha do ciclo de vida (passos sem horário na OS aparecem "sem
// hora"); "Abrir OS" abre a janela fixa. Sem paginação dentro da fila (a referência não tem). VIEW PURA.

const pad = (n: number) => n.toString().padStart(2, "0");

const GROUPS: readonly { readonly band: AgendaBand; readonly label: string; readonly color: string; readonly bg: string }[] = [
  { band: "atrasadas", label: "Atrasadas", color: "#B91C1C", bg: "#FEE2E2" },
  { band: "prox2h", label: "Próximas 2 horas", color: "#B45309", bg: "#FEF3C7" },
  { band: "hoje", label: "Ainda hoje", color: "#1D4ED8", bg: "#DBEAFE" },
  { band: "depois", label: "Amanhã em diante", color: "#0369A1", bg: "#E0F2FE" },
  { band: "semagenda", label: "Sem agenda", color: "#475569", bg: "#F1F5F9" },
  { band: "finalizadas", label: "Finalizadas", color: "#475569", bg: "#F1F5F9" },
];

const scheduledTime = (iso: string | null | undefined) => {
  const time = iso ? new Date(iso).getTime() : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
};

function Blocks({ model, counts }: { readonly model: WorkOrdersViewModel; readonly counts: WorkOrdersCounts }) {
  const soon = new Date(model.now.getTime() + SOON_MINUTES * 60000);
  const blocks: readonly { readonly target: string; readonly label: string; readonly hint: string; readonly color: string; readonly n: number }[] = [
    { target: "fila", label: "Na fila", hint: "não finalizadas", color: "#2563EB", n: counts.abertas },
    { target: "ag-atrasadas", label: "Atrasadas", hint: "agenda vencida", color: "#B91C1C", n: counts.bands.atrasadas },
    { target: "ag-prox2h", label: "Próximas 2 h", hint: `até ${pad(soon.getHours())}:${pad(soon.getMinutes())}`, color: "#B45309", n: counts.bands.prox2h },
    { target: "ag-hoje", label: "Ainda hoje", hint: "depois de 2 h", color: "#1D4ED8", n: counts.bands.hoje },
    { target: "ag-depois", label: "Amanhã em diante", hint: "próximos dias", color: "#0369A1", n: counts.bands.depois },
    { target: "ag-sem-agenda", label: "Sem agenda", hint: "sem horário marcado", color: "#475569", n: counts.bands.semagenda },
    { target: "ag-finalizadas", label: "Finalizadas", hint: "concluídas, canceladas, recusadas", color: "#475569", n: counts.bands.finalizadas },
  ];
  const failure = isListFailure(model.status);
  const universe = universeLabel(model);

  if (model.loading && model.items.length === 0) {
    return (
      <div className="aparos-blocos-c" aria-live="polite">
        {blocks.map((block) => (
          <div key={block.target} className="aparos-bloco-c" aria-hidden="true" style={{ cursor: "default" }}>
            <span className="pat-skel" style={{ width: 30, height: 20 }} />
            <span className="pat-skel" style={{ width: "80%", height: 11 }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="aparos-blocos-c" aria-live="polite">
      {blocks.map((block) =>
        failure ? (
          <div key={block.target} className="aparos-bloco-c" style={{ cursor: "default" }}>
            <b style={{ color: "#94A3B8" }}>—</b>
            <span>{block.label}</span>
            <small>dados indisponíveis</small>
          </div>
        ) : (
          <button
            key={block.target}
            type="button"
            className="aparos-bloco-c"
            aria-pressed={model.state.target === block.target}
            aria-label={`${block.label}: ${block.n}${universe ? ` (${universe})` : ""} — filtrar a lista`}
            onClick={() => model.onState({ ...model.state, target: model.state.target === block.target ? null : block.target })}
          >
            <b style={{ color: block.color }}>{block.n}</b>
            <span>{block.label}</span>
            <small>{block.hint}</small>
          </button>
        ),
      )}
    </div>
  );
}

/** O recorte de `?aba=` (ex.: o "Ver fila" do Dashboard) também vale aqui, e fica à vista: a C não tem abas. */
function TabChip({ model }: { readonly model: WorkOrdersViewModel }) {
  if (model.state.tab === "todas") return null;
  const tab = WORK_ORDER_TABS.find((entry) => entry.key === model.state.tab);
  return (
    <div className="pat-filtro-chip-bar">
      <span className="pat-filtro-chip">
        <span>{`Recorte: ${tab?.label ?? ""}`}</span>
        <button type="button" aria-label="Limpar recorte" onClick={() => model.onState({ ...model.state, tab: "todas" })}>
          <X size={11} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

export function WorkOrdersViewC(model: WorkOrdersViewModel) {
  const counts = countWorkOrders(model.items, model.now);
  const rows = filterWorkOrderList(model.items, model.state, model.now);
  const failure = isListFailure(model.status);
  const groups: readonly WorkOrderGroup[] = GROUPS.map((group) => ({
    key: group.band,
    label: group.label,
    color: group.color,
    bg: group.bg,
    rows: rows.filter((order) => agendaBand(order, model.now) === group.band).sort((x, y) => scheduledTime(x.scheduledFor) - scheduledTime(y.scheduledFor)),
  }));

  const columns: readonly WorkOrderColumn[] = [
    {
      key: "hora",
      header: "HORA",
      width: 100,
      render: (o) => {
        const agenda = agendaInfo(o.scheduledFor, o.status, model.now);
        const date = o.scheduledFor ? new Date(o.scheduledFor) : null;
        const sameDay = date && date.toDateString() === model.now.toDateString();
        const text = !date || Number.isNaN(date.getTime()) ? "—" : sameDay ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        return (
          <span className="aparos-hora" style={{ color: agenda.color }}>
            {text}
          </span>
        );
      },
    },
    { key: "codigo", header: "CÓDIGO", width: 158, render: (o) => <CodeCell order={o} /> },
    { key: "cliente", header: "CLIENTE / SERVIÇO", render: (o) => <ClientCell order={o} />, title: clientCellTitle },
    { key: "cidade", header: "CIDADE", width: 150, render: (o) => (o.serviceCity ? `${o.serviceCity}${o.serviceState ? `/${o.serviceState}` : ""}` : "—") },
    { key: "tecnico", header: "TÉCNICO", width: 120, render: (o) => <TechnicianCell order={o} /> },
    { key: "situacao", header: "SITUAÇÃO", width: 124, render: (o) => <StatusCell order={o} /> },
  ];

  return (
    <div data-aparencia="C" className="aparos aparos--c" style={{ color: "#0F172A" }}>
      <PageHeader
        kicker="OPERAÇÃO · FILA DO DIA"
        title="Ordens de Serviço"
        subtitle="A fila de atendimento pela agenda: o que está atrasado, o que vence nas próximas horas e o que fica para depois."
        actions={model.headerActions}
      />
      {model.filterCard}
      <WorkOrdersStatusStrip model={model} />
      <UniverseNote model={model} />
      <Blocks model={model} counts={counts} />

      {failure && !model.loading ? (
        <WorkOrdersLoadState status={model.status} message={model.error} onRetry={model.onRetry} />
      ) : (
        <div className="aparos-card">
          <WorkOrdersToolbar model={model} total={rows.length} showTabs={false} withServerTotal />
          <TabChip model={model} />
          <TargetChip model={model} />
          <WorkOrdersTable model={model} columns={columns} groups={groups} renderSummary={(order) => <WorkOrderSummary order={order} model={model} variant="c" />} />
        </div>
      )}
    </div>
  );
}
