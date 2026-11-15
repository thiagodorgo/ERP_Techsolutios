import { AlertTriangle, CheckCircle, CreditCard, HardDrive, Layers, MessageCircle, ShieldCheck, Users } from "lucide-react";

import { UsagePie } from "../../../../components/charts";
import { Badge } from "../../../../components/ui";
import { dateBR, dateShort, GRACE_DAYS, joinList, type MySubscriptionScreen } from "../my-subscription.state";
import type { MySubscriptionBlock } from "../my-subscription.types";
import {
  AccessDenied,
  BlockDetail,
  BlockMore,
  LoadErrorA,
  LoadingAnnouncement,
  NoSubscription,
  Skel,
  StaleBanner,
  TEAM,
  UsageSeals,
  blockProps,
  gb,
  oldMeasurementNote,
  onViewKeyDown,
  paymentForms,
  planNameText,
  type MySubscriptionViewModel,
} from "./my-subscription.shared";

// B-ASS-11 (F3) — aparência A, "Padrão fiel": a tela-modelo `TenantSettingsPage` (cabeçalho "Administrador", título e
// subtítulo, alerta com "Tentar de novo", esqueleto, estado vazio) com os cartões Plano, Usuários, Espaço e Situação na
// grade de 4 da área de Configurações (`.tenant-settings-grid`). Com fatura em aberto, o "Como pagar" é um aviso clicável
// acima dos cartões, na cor da situação. Cada bloco abre o detalhe logo abaixo, um por vez.

const CARDS: readonly MySubscriptionBlock[] = ["plano", "usuarios", "espaco", "situacao"];
const BY_FORM = { link: "pelo link de pagamento", Pix: "pelo Pix", boleto: "pelo boleto" } as const;

function PlanCard({ screen }: { readonly screen: MySubscriptionScreen }) {
  return (
    <>
      <span className="assin-pl-nome">{planNameText(screen)}</span>
      <span className="assin-pl-rot">{screen.planName ? "Plano contratado" : "Nome do plano indisponível no momento"}</span>
      <span className="assin-pl-lista">
        <span className="assin-pl-k">FRANQUIA POR MÊS</span>
        <span className="assin-pl-item">
          <Users size={14} aria-hidden="true" />
          <span>
            <b>{gb(screen.includedUsers)}</b> usuários ativos
          </span>
        </span>
        <span className="assin-pl-item">
          <HardDrive size={14} aria-hidden="true" />
          <span>
            <b>{gb(screen.includedStorage)} GB</b> de espaço
          </span>
        </span>
      </span>
    </>
  );
}

function SituationCard({ screen }: { readonly screen: MySubscriptionScreen }) {
  const invoice = screen.invoice;
  let headline: string;
  let key: string;
  let text: string;
  if (!screen.overdue) {
    headline = invoice ? "Fatura em aberto" : "Sem fatura em aberto";
    if (invoice) {
      key = "VENCIMENTO";
      text = `${invoice.dueCaption}${invoice.onTimeUntil ? `; continua em dia até ${dateShort(invoice.onTimeUntil)}` : ""}. Veja como pagar acima.`;
    } else {
      key = "PRAZO DE TOLERÂNCIA";
      text = `Até ${GRACE_DAYS} dias depois do vencimento, a assinatura continua em dia.`;
    }
  } else if (screen.overdueSince && invoice) {
    headline = `Desde ${dateBR(screen.overdueSince)}`;
    key = "FATURA VENCIDA";
    text = `${invoice.dueDate ? `Vencimento em ${dateBR(invoice.dueDate)}` : "Sem data de vencimento"}. Veja como pagar acima.`;
  } else if (invoice) {
    headline = "Fatura em aberto";
    key = "FALE COM A EQUIPE";
    text = "A equipe TechSolutions informa o que falta para voltar a ficar em dia.";
  } else {
    headline = screen.overdueSince ? `Desde ${dateBR(screen.overdueSince)}` : "Sem fatura em aberto";
    key = "SEM FATURA EM ABERTO";
    text = `Fale com ${TEAM} para regularizar.`;
  }
  return (
    <span className="assin-a-sit">
      {screen.overdue ? (
        <span className="ui-badge ui-tone-danger">
          <AlertTriangle size={13} aria-hidden="true" />
          Em atraso
        </span>
      ) : (
        <span className="ui-badge ui-tone-success">
          <CheckCircle size={13} aria-hidden="true" />
          Em dia
        </span>
      )}
      <span className="assin-a-sit__t">{headline}</span>
      <span className="assin-a-sit__sep">
        <span className="assin-pl-k">{key}</span>
        <span className="assin-pl-hint">{text}</span>
      </span>
    </span>
  );
}

function Card({ model, block }: { readonly model: MySubscriptionViewModel; readonly block: MySubscriptionBlock }) {
  const screen = model.screen!;
  const open = model.open === block;
  const usage = block === "usuarios" ? screen.users : block === "espaco" ? screen.storage : null;
  const icon =
    block === "plano" ? <Layers size={18} aria-hidden="true" /> : block === "usuarios" ? <Users size={18} aria-hidden="true" /> : block === "espaco" ? <HardDrive size={18} aria-hidden="true" /> : screen.overdue ? <AlertTriangle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />;
  const title = block === "plano" ? "Plano" : block === "situacao" ? "Situação" : usage!.label;
  return (
    <button className="ui-card assin-bloco assin-a-card" {...blockProps(model, "A", block)}>
      <span className="assin-a-card__head">
        {icon}
        <span className="assin-a-card__t">{title}</span>
        {usage ? <UsageSeals usage={usage} /> : null}
      </span>
      {block === "plano" ? <PlanCard screen={screen} /> : null}
      {block === "situacao" ? <SituationCard screen={screen} /> : null}
      {usage ? (
        <UsagePie
          used={usage.used}
          included={usage.included}
          unit={usage.unit}
          label={usage.label}
          overLimit={usage.overLimit}
          pending={usage.pending}
          size={104}
          caption={usage.caption}
          pendingCaption={usage.pendingCaption}
          note={oldMeasurementNote(usage)}
          rows
        />
      ) : null}
      <BlockMore open={open} />
    </button>
  );
}

function PaymentAlert({ model }: { readonly model: MySubscriptionViewModel }) {
  const screen = model.screen!;
  const invoice = screen.invoice!;
  const manual = !invoice.hasPaymentMean;
  const text = manual ? `Esta fatura não tem pagamento pela tela: pague direto com ${TEAM}.` : `Pague ${joinList(paymentForms(invoice, true).map((form) => BY_FORM[form as keyof typeof BY_FORM]), "ou")}.`;
  const tone = screen.overdue ? "danger" : invoice.tone;
  return (
    <button className={`ui-alert ui-alert--${tone} assin-bloco assin-a-pagar`} {...blockProps(model, "A", "pagar")}>
      {manual ? <MessageCircle size={18} aria-hidden="true" /> : <CreditCard size={18} aria-hidden="true" />}
      <span className="assin-a-pagar__txt">
        <strong>{invoice.title}</strong>
        <span>{text}</span>
      </span>
      <BlockMore open={model.open === "pagar"} closedText="Como pagar" />
    </button>
  );
}

function Loading() {
  return (
    <>
      <LoadingAnnouncement />
      <div className="tenant-settings-grid" aria-busy="true" data-state="loading">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="ui-card assin-a-card" aria-hidden="true">
            <Skel width="46%" height={14} />
            {index === 1 || index === 2 ? <Skel width="104px" height={104} style={{ borderRadius: "50%", margin: "16px auto 14px" }} /> : <Skel width="58%" height={26} style={{ marginTop: 18 }} />}
            <Skel width="72%" height={13} style={{ marginTop: 10 }} />
            <Skel width="50%" height={11} style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>
    </>
  );
}

export function MySubscriptionViewA(model: MySubscriptionViewModel) {
  if (model.state === "forbidden") {
    return (
      <section className="page-stack assin-tela assin-a" data-aparencia="A">
        <AccessDenied />
      </section>
    );
  }
  const screen = model.state === "ready" ? model.screen : null;
  return (
    <section className="page-stack assin-tela assin-a" data-aparencia="A" onKeyDown={onViewKeyDown(model)}>
      <header className="page-heading page-heading--row">
        <div>
          <span>Administrador</span>
          <h1>Minha assinatura</h1>
          <p>Plano, uso da franquia e situação de pagamento da organização.</p>
        </div>
        {screen ? (
          <div className="work-orders-actions">
            <Badge tone="info">Uso de {screen.periodText}</Badge>
          </div>
        ) : null}
      </header>
      {model.state === "loading" ? <Loading /> : null}
      {model.state === "error" ? <LoadErrorA model={model} /> : null}
      {model.state === "none" ? <NoSubscription /> : null}
      {screen ? (
        <>
          <StaleBanner model={model} />
          {screen.invoice ? (
            <>
              <PaymentAlert model={model} />
              <BlockDetail model={model} letter="A" blocks={["pagar"]} />
            </>
          ) : null}
          <div className="tenant-settings-grid">
            {CARDS.map((block) => (
              <Card key={block} model={model} block={block} />
            ))}
          </div>
          <BlockDetail model={model} letter="A" blocks={CARDS} />
        </>
      ) : null}
    </section>
  );
}
