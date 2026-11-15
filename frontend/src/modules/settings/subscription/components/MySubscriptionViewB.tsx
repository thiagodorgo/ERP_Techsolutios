import { AlertTriangle, Clock, CreditCard, Layers, MessageCircle, ShieldCheck } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { UsagePie } from "../../../../components/charts";
import { PageHeader, StatusPill } from "../../../../components/patterns";
import { dateBR, dateShort } from "../my-subscription.state";
import type { MySubscriptionBlock } from "../my-subscription.types";
import {
  AccessDenied,
  BlockDetail,
  BlockMore,
  LoadErrorBanner,
  LoadingAnnouncement,
  NoSubscription,
  SEAL_TONE,
  Skel,
  StaleBanner,
  UsageSeals,
  blockProps,
  gb,
  oldMeasurementNote,
  onViewKeyDown,
  planNameText,
  type MySubscriptionViewModel,
} from "./my-subscription.shared";

// B-ASS-11 (F4) — aparência B, "Analítica": a faixa de cima resume a situação, o "Como pagar" (só com fatura em aberto,
// na cor da situação) e o plano; embaixo, as duas pizzas grandes lado a lado (168 px), com o número em uso em destaque e as
// barras de em uso e disponível. É o BI que a P12 permite, sem indicador a mais. O mesmo conteúdo da A.

type Tile = { readonly tone: "success" | "danger" | "warning" | "info"; readonly icon: ReactNode };

function Segment({ model, block }: { readonly model: MySubscriptionViewModel; readonly block: MySubscriptionBlock }) {
  const screen = model.screen!;
  let key: string;
  let headline: ReactNode;
  let sub: string;
  let tile: Tile;
  let tone = "";
  if (block === "situacao") {
    const onTime = !screen.overdue;
    key = "SITUAÇÃO";
    tile = onTime ? { tone: "success", icon: <ShieldCheck size={18} aria-hidden="true" /> } : { tone: "danger", icon: <AlertTriangle size={18} aria-hidden="true" /> };
    headline = <span className={onTime ? "assin-texto--sucesso" : "assin-texto--critico"}>{onTime ? "Em dia" : "Em atraso"}</span>;
    const invoice = screen.invoice;
    sub = onTime
      ? invoice?.onTimeUntil
        ? `Continua em dia até ${dateShort(invoice.onTimeUntil)}`
        : invoice
          ? invoice.title
          : "Sem fatura em aberto"
      : screen.overdueSince
        ? `desde ${dateBR(screen.overdueSince)}${invoice ? "" : " · sem fatura em aberto"}`
        : "fale com a equipe para regularizar";
  } else if (block === "pagar") {
    const invoice = screen.invoice!;
    const manual = !invoice.hasPaymentMean;
    const payTone = screen.overdue ? "danger" : invoice.tone;
    key = "COMO PAGAR";
    const icon = manual ? <MessageCircle size={18} aria-hidden="true" /> : <CreditCard size={18} aria-hidden="true" />;
    tile = { tone: payTone, icon };
    tone = payTone === "danger" ? " assin-b-seg--pagar" : payTone === "warning" ? " assin-b-seg--pagar-aviso" : " assin-b-seg--pagar-info";
    headline = "Fatura em aberto";
    sub = `${invoice.dueCaption}${manual ? " · pague com a equipe" : ""}`;
  } else {
    key = "PLANO";
    tile = { tone: "info", icon: <Layers size={18} aria-hidden="true" /> };
    headline = planNameText(screen);
    const franchise = `${gb(screen.includedUsers)} usuários · ${gb(screen.includedStorage)} GB`;
    sub = screen.planName ? franchise : `nome indisponível · ${franchise}`;
  }
  return (
    <button className={`pat-card assin-bloco assin-b-seg${tone}`} {...blockProps(model, "B", block)}>
      <span className={`assin-b-seg__ic assin-b-seg__ic--${tile.tone}${block === "pagar" ? " assin-b-seg__ic--pagar" : ""}`}>
        {tile.icon}
      </span>
      <span className="assin-b-seg__txt">
        <span className="assin-b-seg__k">{key}</span>
        <span className="assin-b-seg__v">{headline}</span>
        <span className="assin-b-seg__d" title={sub}>
          {sub}
        </span>
      </span>
      <BlockMore open={model.open === block} chevronOnly />
    </button>
  );
}

function PieCard({ model, block }: { readonly model: MySubscriptionViewModel; readonly block: "usuarios" | "espaco" }) {
  const screen = model.screen!;
  const usage = block === "usuarios" ? screen.users : screen.storage;
  const subtitle =
    block === "usuarios"
      ? `Usuários com acesso ativo · maior número de ${screen.month}`
      : `Dados e arquivos da organização · ${usage.measuredAt ? `estimativa de ${dateShort(usage.measuredAt)}` : "em estimativa"}`;
  return (
    <button className="pat-card assin-bloco assin-b-pie" {...blockProps(model, "B", block)}>
      <span className="pat-card__head">
        <span className="pat-card__title">{usage.label}</span>
        <UsageSeals usage={usage} />
      </span>
      <span className="pat-card__subtitle">{subtitle}</span>
      <span className="assin-b-uso">
        <UsagePie
          used={usage.used}
          included={usage.included}
          unit={usage.unit}
          label={usage.label}
          overLimit={usage.overLimit}
          pending={usage.pending}
          size={168}
          layout="side"
          emphasis
          caption={usage.caption}
          pendingCaption={usage.pendingCaption}
          note={oldMeasurementNote(usage)}
          rows
        />
      </span>
      <BlockMore open={model.open === block} />
    </button>
  );
}

const faixa = (count: number) => ({ "--assin-n": String(count) }) as CSSProperties;

function Loading() {
  return (
    <>
      <LoadingAnnouncement />
      <div aria-busy="true" data-state="loading">
        <div className="assin-b-faixa" style={faixa(2)}>
          {[0, 1].map((index) => (
            <div key={index} className="pat-card assin-b-seg" aria-hidden="true">
              <Skel width="38px" height={38} style={{ borderRadius: 10, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                <Skel width="30%" height={10} />
                <Skel width="46%" height={16} style={{ marginTop: 6 }} />
                <Skel width="62%" height={11} style={{ marginTop: 6 }} />
              </span>
            </div>
          ))}
        </div>
        <div className="assin-b-duo">
          {[0, 1].map((index) => (
            <div key={index} className="pat-card assin-b-pie" aria-hidden="true">
              <Skel width="22%" height={14} />
              <Skel width="46%" height={11} style={{ marginTop: 6 }} />
              <span className="ui-usage-pie ui-usage-pie--side assin-b-uso">
                <Skel width="168px" height={168} style={{ borderRadius: "50%", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <Skel width="52%" height={30} />
                  <Skel width="40%" height={12} style={{ marginTop: 10 }} />
                  <Skel width="100%" height={9} style={{ marginTop: 16 }} />
                  <Skel width="100%" height={9} style={{ marginTop: 10 }} />
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function LoadError({ model }: { readonly model: MySubscriptionViewModel }) {
  return (
    <>
      <LoadErrorBanner model={model} />
      <div className="assin-b-faixa" style={faixa(2)}>
        <div className="pat-card assin-b-seg">
          <span className="assin-vazio-txt">Situação indisponível no momento.</span>
        </div>
        <div className="pat-card assin-b-seg">
          <span className="assin-vazio-txt">Plano indisponível no momento.</span>
        </div>
      </div>
      <div className="assin-b-duo">
        <div className="pat-card">
          <span className="pat-card__title">Usuários</span>
          <span className="assin-vazio-txt">Uso indisponível no momento.</span>
        </div>
        <div className="pat-card">
          <span className="pat-card__title">Espaço</span>
          <span className="assin-vazio-txt">Uso indisponível no momento.</span>
        </div>
      </div>
    </>
  );
}

export function MySubscriptionViewB(model: MySubscriptionViewModel) {
  if (model.state === "forbidden") {
    return (
      <section className="assin-tela assin-b" data-aparencia="B">
        <AccessDenied />
      </section>
    );
  }
  const screen = model.state === "ready" ? model.screen : null;
  const segments: MySubscriptionBlock[] = screen ? ["situacao", ...(screen.invoice ? (["pagar"] as const) : []), "plano"] : [];
  const organization = model.organizationName ? ` · ${model.organizationName}` : "";
  return (
    <section className="assin-tela assin-b" data-aparencia="B" onKeyDown={onViewKeyDown(model)}>
      <PageHeader
        kicker="ADMINISTRADOR · ANALÍTICA"
        title="Minha assinatura"
        subtitle={`Quanto da franquia do plano já foi usado neste mês e se a assinatura está em dia${organization}`}
        actions={
          screen ? (
            <StatusPill label={`Uso de ${screen.periodText}`} {...SEAL_TONE.info} icon={<Clock size={12} />} />
          ) : undefined
        }
      />
      {model.state === "loading" ? <Loading /> : null}
      {model.state === "error" ? <LoadError model={model} /> : null}
      {model.state === "none" ? <NoSubscription /> : null}
      {screen ? (
        <>
          <StaleBanner model={model} />
          <div className="assin-b-faixa" style={faixa(segments.length)}>
            {segments.map((block) => (
              <Segment key={block} model={model} block={block} />
            ))}
          </div>
          <BlockDetail model={model} letter="B" blocks={segments} />
          <div className="assin-b-duo">
            <PieCard model={model} block="usuarios" />
            <PieCard model={model} block="espaco" />
          </div>
          <BlockDetail model={model} letter="B" blocks={["usuarios", "espaco"]} />
        </>
      ) : null}
    </section>
  );
}
