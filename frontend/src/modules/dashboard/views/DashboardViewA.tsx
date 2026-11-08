import {
  BlockEmpty,
  BlockTable,
  CriticalRows,
  DashHeader,
  DashKpiGrid,
  DashStatusStrip,
  DispatchesCard,
  EventsCard,
  FieldCard,
  FilterChip,
  KPI_QUEUE_FILTER,
  KpiPanel,
  RegistryStrip,
  SkeletonRows,
  sortCritical,
  SummaryFailure,
  VolumeCard,
} from "./dashboard.shared";
import type { DashboardViewModel } from "./dashboard.view-model";

// B-APAR-DASH — APARÊNCIA A "Padrão fiel" (referência aprovada `screen-refs/dashboard-3opcoes.reference.html`, `renderA`):
// a tela de hoje no padrão D-PADRAO-BLOCOS-CLICAVEIS. Os 5 cartões abrem o detalhe do cartão (o texto de
// `buildDashboardKpiDetail`) num PAINEL embaixo, no lugar do pop-up, e filtram a fila "Exige ação agora" (localmente, sobre
// as OS críticas que o servidor mandou); faixa CADASTROS; a fila com TODAS as críticas do agregado (até 8; hoje eram 4) em
// linha de uma altura que abre o detalhe com "Abrir OS"; volume de 30 dias, despachos, campo e eventos, cada bloco com o seu
// estado §7. VIEW PURA.

export function DashboardViewA(model: DashboardViewModel) {
  if (model.summary.status === "forbidden") {
    return (
      <div data-aparencia="A" className="apardash apardash--a">
        <DashHeader model={model} kicker="VISÃO GERAL" subtitle="Operação, SLA e cadastros" />
        <SummaryFailure model={model} />
      </div>
    );
  }
  const filter = model.state.cartao ? KPI_QUEUE_FILTER[model.state.cartao] ?? null : null;
  const all = sortCritical(model.summary.critical, model.now);
  const rows = filter ? all.filter((order) => filter.match(order, model.now)) : all;

  let queue;
  if (model.summary.status === "loading") queue = <SkeletonRows cols={4} rows={4} />;
  else if (model.summary.status === "error") queue = <BlockEmpty state="error">Não foi possível carregar a fila crítica.</BlockEmpty>;
  else
    queue = (
      <>
        <FilterChip label={filter?.label ?? null} onClear={() => model.onState({ ...model.state, cartao: null })} />
        {rows.length === 0 ? (
          <BlockEmpty>{filter ? "Nenhuma OS crítica neste filtro." : "Nenhuma OS crítica no momento."}</BlockEmpty>
        ) : (
          <BlockTable widths={[64, null, 118, 30]}>
            <CriticalRows model={model} orders={rows} mode="compacta" />
          </BlockTable>
        )}
      </>
    );

  return (
    <div data-aparencia="A" className="apardash apardash--a">
      <DashHeader model={model} kicker="VISÃO GERAL" subtitle="Operação, SLA e cadastros" />
      <DashStatusStrip model={model} />
      {model.summary.status === "error" ? <SummaryFailure model={model} /> : null}
      <DashKpiGrid model={model} />
      <RegistryStrip model={model} />
      <KpiPanel model={model} filterText={`A fila “Exige ação agora” está filtrada por este indicador (nas ${all.length} OS críticas).`} />

      <div className="pat-dash-charts">
        <VolumeCard model={model} />
        <section className="pat-card">
          <div className="pat-card__head">
            <h2 className="pat-card__title">Exige ação agora</h2>
            {model.access.readWorkOrders ? (
              <button type="button" className="pat-link" onClick={() => model.onNavigate("/work-orders")}>
                Ver todas
              </button>
            ) : null}
          </div>
          <div className="pat-card__subtitle pat-card__subtitle--gap">
            Fila crítica por prioridade e agenda
            {filter && model.summary.status === "ready" ? ` · ${rows.length} de ${all.length} OS críticas` : ""}
          </div>
          {queue}
        </section>
      </div>

      <div className="pat-dash-duo">
        <DispatchesCard model={model} />
        <FieldCard model={model} />
      </div>
      <EventsCard model={model} />
    </div>
  );
}
