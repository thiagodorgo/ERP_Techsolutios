import { capitalize, monthLabel, monthName } from "../billing-ops.labels";
import { KPI_KEYS } from "../billing-ops.state";
import {
  BillingOpsBanners,
  BillingOpsHeader,
  BucketLegend,
  Card,
  ChannelBlock,
  isPressed,
  KpiBlock,
  MissingTag,
  MonthsChart,
  SituationBars,
  StatementList,
  type BillingOpsViewProps,
} from "./billingOps.shared";

// B-ASS-10c-OPERACAO — aparência A · Fiel ao console (a maquete aprovada, `viewA`): 10 blocos em 5 × 2 (9 indicadores que
// filtram e o canal, que abre o painel), "Demonstrativos por mês e situação", "Situação de <mês>" e "Cobranças por forma",
// e a lista larga com o detalhe logo abaixo da linha.

export function BillingOpsViewA(props: BillingOpsViewProps) {
  const { model, onTarget, onMonth, onRefresh, channelPanel } = props;
  return (
    <div className="cb-view" data-aparencia="A">
      <BillingOpsHeader model={model} onMonth={onMonth} onRefresh={onRefresh} />
      <BillingOpsBanners model={model} onRefresh={onRefresh} onTarget={onTarget} />
      <div className="cb-kpis" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {KPI_KEYS.map((key) => (
          <KpiBlock key={key} kpi={model.kpis[key]} pressed={isPressed(model, key)} onTarget={onTarget} />
        ))}
        <ChannelBlock model={model} onTarget={onTarget} />
      </div>
      {model.ui.canal ? channelPanel : null}
      <div className="cb-charts-a">
        <Card
          title="Demonstrativos por mês e situação"
          hint={`Últimos 6 meses · quantidade · clique num mês para abri-lo${model.partial ? ` · ${model.orgLoaded} de ${model.orgTotal} organizações` : ""}`}
          side={<MissingTag title="A série em reais por mês depende da rota de resumo no servidor (pendência P-ASS10C-RESUMO-ENTRE-ORGANIZACOES)." />}
        >
          <MonthsChart model={model} onMonth={onMonth} height={170} />
          <BucketLegend model={model} onTarget={onTarget} />
        </Card>
        <Card title={`Situação de ${monthName(model.month)}`} hint="Quantidade de demonstrativos · filtra a lista">
          <SituationBars model={model} onTarget={onTarget} />
        </Card>
        <Card title="Cobranças por forma" hint="Quantidade · filtra a lista" side={<MissingTag title="A forma de cada cobrança (Pix, boleto, cartão) ainda não vem nas respostas do servidor (pendência P-ASS10C-FORMA-DA-COBRANCA)." />}>
          <p className="pat-ab-detail-note" style={{ margin: 0 }}>
            A forma de cada cobrança de {capitalize(monthLabel(model.month))} ainda não vem do servidor. Quando vier, este quadro conta Pix, boleto e cartão e filtra a lista.
          </p>
        </Card>
      </div>
      <StatementList {...props} wide />
    </div>
  );
}
