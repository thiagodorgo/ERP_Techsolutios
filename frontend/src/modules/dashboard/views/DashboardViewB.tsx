import { CategoryDonut, Sparkline } from "../../../components/charts";
import type { DashboardSummaryByStatus } from "../dashboard.adapter";
import {
  BlockEmpty,
  BlockForbidden,
  BlockTable,
  CRITICAL_TABS,
  CriticalRows,
  DashHeader,
  DashKpiGrid,
  DashStatusStrip,
  dayMonthOf,
  DispatchesCard,
  EventsCard,
  FieldCard,
  fieldLabel,
  FilterChip,
  KPI_QUEUE_FILTER,
  KpiPanel,
  RegistryStrip,
  SkeletonRows,
  sortCritical,
  SummaryFailure,
  VolumeBars,
  volumeBody,
  VolumeCard,
} from "./dashboard.shared";
import type { DashboardViewModel } from "./dashboard.view-model";

// B-APAR-DASH — APARÊNCIA B "Analítica" (referência aprovada `screen-refs/dashboard-3opcoes.reference.html`, `renderB`):
// mini-gráfico SÓ nos cartões que têm série real (OS hoje = abertas por dia; Concluídas = concluídas por dia); o painel do
// cartão decompõe "OS abertas"/"Em andamento" pelas situações do agregado; a faixa analítica com o volume dos últimos 14 dias
// (recorte da MESMA série de 30; clicar num dia lê o dia), a "Carteira por etapa" (as 10 situações do `byStatus`, cada uma
// filtra a lista) e o "Campo agora" (situação dos operadores, que filtra o status de campo); "OS que exigem atenção" com
// largura cheia, abas e o detalhe da linha (endereço e técnico por `GET /work-orders/:id`, pedido só ao abrir). VIEW PURA.

/** As 10 situações do agregado, na ordem do ciclo; as 7 primeiras são a carteira ATIVA. */
export const ETAPAS: readonly { readonly key: keyof DashboardSummaryByStatus; readonly label: string; readonly color: string; readonly ativa: boolean }[] = [
  { key: "open", label: "Aberta", color: "#94A3B8", ativa: true },
  { key: "assigned", label: "Atribuída", color: "#60A5FA", ativa: true },
  { key: "accepted", label: "Aceita", color: "#2563EB", ativa: true },
  { key: "on_route", label: "Em rota", color: "#0EA5E9", ativa: true },
  { key: "on_site", label: "No local", color: "#22C55E", ativa: true },
  { key: "in_progress", label: "Em atendimento", color: "#F59E0B", ativa: true },
  { key: "paused", label: "Pausada", color: "#B45309", ativa: true },
  { key: "completed", label: "Concluída", color: "#15803D", ativa: false },
  { key: "cancelled", label: "Cancelada", color: "#DC2626", ativa: false },
  { key: "rejected", label: "Recusada", color: "#B91C1C", ativa: false },
];

/** As 5 situações de campo da referência (`CAMPO_SEG`), pelo rótulo de `fieldStatusMeta`. */
export const CAMPO_SEGMENTOS: readonly { readonly label: string; readonly color: string }[] = [
  { label: "Em rota", color: "#2563EB" },
  { label: "No local", color: "#22C55E" },
  { label: "Em atendimento", color: "#F59E0B" },
  { label: "Disponível", color: "#94A3B8" },
  { label: "Sem sinal recente", color: "#DC2626" },
];

function Carteira({ model }: { readonly model: DashboardViewModel }) {
  const by = model.summary.byStatus;
  if (!by) return <BlockEmpty state="error">Situações indisponíveis no momento.</BlockEmpty>;
  const ativas = ETAPAS.filter((etapa) => etapa.ativa);
  const finais = ETAPAS.filter((etapa) => !etapa.ativa);
  const bar = (group: typeof ETAPAS) => {
    const max = Math.max(1, ...group.map((etapa) => by[etapa.key]));
    return group.map((etapa) => {
      const n = by[etapa.key];
      const on = model.state.etapa === etapa.key;
      return (
        <button
          key={etapa.key}
          type="button"
          className="apardash-etapa-bar"
          aria-pressed={on}
          aria-label={`${etapa.label}: ${n} OS — filtrar a lista`}
          onClick={() => model.onState({ ...model.state, etapa: on ? null : etapa.key, linha: null })}
        >
          <span className="apardash-etapa-bar__rot">{etapa.label}</span>
          <span className="apardash-etapa-bar__trilho" aria-hidden="true">
            <i style={{ width: `${(n / max) * 100}%`, background: etapa.color }} />
          </span>
          <b>{n}</b>
        </button>
      );
    });
  };
  return (
    <div className="apardash-etapas-lista" role="group" aria-label="Carteira ativa por etapa">
      {bar(ativas)}
      <div className="apardash-etapas-lista__sep">Finalizadas, no total</div>
      {bar(finais)}
    </div>
  );
}

function CampoAgora({ model }: { readonly model: DashboardViewModel }) {
  const { locations } = model;
  if (!model.access.readLocations || locations.status === "forbidden") return <BlockForbidden>Seu perfil não vê a localização dos operadores.</BlockForbidden>;
  if (locations.status === "loading") return <span className="pat-skel" data-state="loading" style={{ display: "block", height: 96 }} />;
  if (locations.status === "error") return <BlockEmpty state="error">Não foi possível carregar as localizações.</BlockEmpty>;
  const counts = CAMPO_SEGMENTOS.map((segment) => ({ ...segment, count: locations.items.filter((location) => fieldLabel(location) === segment.label).length }));
  const total = counts.reduce((sum, segment) => sum + segment.count, 0);
  if (locations.items.length === 0) return <BlockEmpty>Nenhum operador com localização recente.</BlockEmpty>;
  const fora = locations.items.length - total;
  return (
    <>
      <CategoryDonut
        segments={counts.map((segment) => ({ key: segment.label, label: segment.label, count: segment.count, color: segment.color }))}
        centerValue={total}
        centerLabel="operadores"
        ariaLabel={`${total} operadores por situação`}
        pressedKey={model.state.campo}
        onSelect={(key) => model.onState({ ...model.state, campo: model.state.campo === key ? null : key, linha: null })}
        segmentAriaLabel={(segment) => `${segment.label}: ${segment.count} — filtrar o status de campo`}
      />
      {fora > 0 ? <p className="apardash-nota">{`${fora} ${fora === 1 ? "operador" : "operadores"} em outra situação (pausado, offline ou bloqueado), fora destas cinco.`}</p> : null}
    </>
  );
}

export function DashboardViewB(model: DashboardViewModel) {
  const header = <DashHeader model={model} kicker="VISÃO GERAL · ANALÍTICA" subtitle="Onde a operação trava, o que vence primeiro e quem está em campo" />;
  if (model.summary.status === "forbidden") {
    return (
      <div data-aparencia="B" className="apardash apardash--b">
        {header}
        <SummaryFailure model={model} />
      </div>
    );
  }
  const { state } = model;
  const seriesReady = model.access.readWorkOrders && model.series.status === "ready" && model.series.items.length > 0;
  const sparkFooter = (key: string) =>
    seriesReady && (key === "created_today" || key === "completed") ? (
      <span className="apardash-spark">
        <Sparkline
          data={model.series.items.map((point) => (key === "created_today" ? point.created : point.completed))}
          tone={key === "created_today" ? "info" : "success"}
          height={26}
          ariaLabel={key === "created_today" ? "Abertas por dia nos últimos 30 dias" : "Concluídas por dia nos últimos 30 dias"}
        />
      </span>
    ) : null;

  const days = model.series.items.slice(-14);
  const dia = state.dia !== null && state.dia < days.length ? state.dia : days.length - 1;
  const point = days[dia];

  const all = sortCritical(model.summary.critical, model.now);
  const tab = CRITICAL_TABS.find((entry) => entry.key === state.aba) ?? CRITICAL_TABS[0];
  const kpiFilter = state.cartao ? KPI_QUEUE_FILTER[state.cartao] ?? null : null;
  const etapa = state.etapa ? ETAPAS.find((entry) => entry.key === state.etapa) ?? null : null;
  const rows = all
    .filter((order) => tab.match(order, model.now))
    .filter((order) => (kpiFilter ? kpiFilter.match(order, model.now) : true))
    .filter((order) => (etapa ? order.status === etapa.key : true));
  const chip = kpiFilter ? kpiFilter.label : etapa ? `Etapa ${etapa.label}` : null;

  let list;
  if (model.summary.status === "loading") list = <SkeletonRows cols={7} rows={4} />;
  else if (model.summary.status === "error")
    list = (
      <div className="apardash-lista-vazia" data-state="error">
        <b>Não foi possível carregar a fila crítica</b>
        <span>
          Tentaremos novamente na próxima atualização —{" "}
          <button type="button" className="pat-link" onClick={model.onRetry}>
            Tentar novamente
          </button>
        </span>
      </div>
    );
  else
    list = (
      <>
        <FilterChip label={chip} onClear={() => model.onState({ ...state, cartao: null, etapa: null })} />
        <BlockTable widths={[84, 118, null, null, 104, 128, 40]} head={["AGENDA", "OS", "CLIENTE", "SERVIÇO", "PRIORIDADE", "SITUAÇÃO", ""]}>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: 0 }}>
                <div className="apardash-lista-vazia" data-state="empty">
                  <b>{all.length > 0 ? "Nenhuma OS crítica neste filtro" : "Nenhuma OS crítica no momento"}</b>
                  <span>{all.length > 0 ? "Limpe o filtro ou troque a aba." : "Quando uma OS vencer a agenda ou tiver prioridade alta, ela aparece aqui."}</span>
                </div>
              </td>
            </tr>
          ) : (
            <CriticalRows model={model} orders={rows} mode="larga" />
          )}
        </BlockTable>
      </>
    );

  const openCount = model.summary.byStatus ? ETAPAS.filter((entry) => entry.ativa).reduce((sum, entry) => sum + (model.summary.byStatus as DashboardSummaryByStatus)[entry.key], 0) : null;

  return (
    <div data-aparencia="B" className="apardash apardash--b">
      {header}
      <DashStatusStrip model={model} />
      {model.summary.status === "error" ? <SummaryFailure model={model} /> : null}
      <DashKpiGrid model={model} footer={sparkFooter} />
      <RegistryStrip model={model} />
      <KpiPanel model={model} breakdown filterText={`A lista abaixo está filtrada por este indicador (nas ${all.length} OS críticas).`} />

      {model.summary.status === "ready" ? (
        <div className="apardash-b-ana">
          <VolumeCard model={model} className="apardash-b-vol" subtitle="Últimos 14 dias · abertas, concluídas e canceladas">
            {volumeBody(model, days, () => (
              <>
                <VolumeBars points={days} selected={dia} onDay={(index) => model.onState({ ...state, dia: index })} />
                {point ? (
                  <div className="apardash-dia" aria-live="polite">
                    <b>{dia === days.length - 1 ? "Hoje" : dayMonthOf(point.date)}</b>
                    <span>
                      <span className="pat-dash-dot" style={{ background: "#2563EB" }} aria-hidden="true" /> {point.created} abertas
                    </span>
                    <span>
                      <span className="pat-dash-dot" style={{ background: "#22C55E" }} aria-hidden="true" /> {point.completed} concluídas
                    </span>
                    <span>
                      <span className="pat-dash-dot" style={{ background: "#CBD5E1" }} aria-hidden="true" /> {point.cancelled} canceladas
                    </span>
                    <span className="apardash-dia__dica">· clique num dia</span>
                  </div>
                ) : null}
              </>
            ))}
          </VolumeCard>
          <section className="pat-card">
            <div className="pat-card__head">
              <h2 className="pat-card__title">Carteira ativa por etapa</h2>
            </div>
            <div className="pat-card__subtitle pat-card__subtitle--gap">{openCount === null ? "Situações indisponíveis" : `${openCount} OS em aberto na organização · clique filtra a lista`}</div>
            <Carteira model={model} />
          </section>
          <section className="pat-card">
            <div className="pat-card__head">
              <h2 className="pat-card__title">Campo agora</h2>
            </div>
            <div className="pat-card__subtitle pat-card__subtitle--gap">Situação dos operadores pela última posição</div>
            <CampoAgora model={model} />
          </section>
        </div>
      ) : null}

      <section className="pat-table apardash-lista">
        <div className="pat-table__topbar">
          <div className="apardash-lista__head">
            <h2 className="pat-card__title">OS que exigem atenção</h2>
            <div className="pat-os-tabs" role="group" aria-label="Filtrar a lista">
              {CRITICAL_TABS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={entry.key === tab.key ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                  aria-pressed={entry.key === tab.key}
                  onClick={() => model.onState({ ...state, aba: entry.key, linha: null })}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
          {model.summary.status === "ready" ? <span className="pat-table__count">{`${rows.length !== all.length ? `${rows.length} de ` : ""}${all.length} OS críticas`}</span> : null}
        </div>
        {list}
      </section>

      <div className="pat-dash-duo">
        <DispatchesCard model={model} />
        <FieldCard model={model} filter={state.campo} onClearFilter={() => model.onState({ ...state, campo: null })} />
      </div>
      <EventsCard model={model} />
    </div>
  );
}
