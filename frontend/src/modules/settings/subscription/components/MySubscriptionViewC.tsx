import { AlertTriangle, ChevronDown, Clock, CreditCard, MessageCircle, ShieldCheck } from "lucide-react";

import { UsagePie } from "../../../../components/charts";
import { PageHeader, StatusPill } from "../../../../components/patterns";
import { dateShort, joinList, longDay, type MySubscriptionScreen } from "../my-subscription.state";
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

// B-ASS-11 (F4) — aparência C, "Situação primeiro": responde primeiro "estou em dia?" e "como eu pago?". A faixa grande
// mostra a situação (e os avisos de "continua em dia até" e de franquia passada); com fatura em aberto, o "Como pagar" fica
// ao lado, em destaque — azul cheio com os meios que vieram, contornado quando não há pagamento pela tela — e o detalhe dele
// já abre. Embaixo, as pizzas menores (76 px) e o plano. O mesmo conteúdo da A.

function situationText(screen: MySubscriptionScreen): string {
  const invoice = screen.invoice;
  if (!screen.overdue) {
    if (!invoice) return "Sem fatura em aberto. A assinatura da organização está regular.";
    return invoice.dueDate ? `A fatura em aberto ${invoice.dueText}.` : "Há uma fatura em aberto, sem data de vencimento.";
  }
  if (!invoice) return `Não há fatura em aberto para pagar por aqui. Fale com ${TEAM} para regularizar.`;
  if (!screen.overdueSince) return `A assinatura consta em atraso. Fale com ${TEAM} para saber o que falta regularizar.`;
  return invoice.hasPaymentMean
    ? "Há uma fatura vencida. Pague para a organização voltar a ficar em dia."
    : "Há uma fatura vencida. Pague direto com a equipe TechSolutions; a situação volta para “Em dia” quando o pagamento for registrado.";
}

function Situation({ model }: { readonly model: MySubscriptionViewModel }) {
  const screen = model.screen!;
  const onTime = !screen.overdue;
  const onTimeUntil = screen.invoice?.onTimeUntil ?? null;
  return (
    <button className={`assin-bloco assin-c-sit ${onTime ? "assin-c-sit--success" : "assin-c-sit--danger"}`} {...blockProps(model, "C", "situacao")}>
      <span className="assin-c-sit__ic">{onTime ? <ShieldCheck size={28} aria-hidden="true" /> : <AlertTriangle size={28} aria-hidden="true" />}</span>
      <span className="assin-c-sit__txt">
        <span className="assin-c-sit__k">SITUAÇÃO DA ASSINATURA</span>
        <span className="assin-c-sit__t">{screen.situationTitle}</span>
        <span className="assin-c-sit__d">{situationText(screen)}</span>
        {onTimeUntil ? (
          <span className="assin-c-sit__aviso">
            <Clock size={14} aria-hidden="true" />
            Continua em dia até {dateShort(onTimeUntil)}, o fim do prazo de tolerância.
          </span>
        ) : null}
        {screen.overLimitAreas.length > 0 ? (
          <span className="assin-c-sit__aviso">
            <AlertTriangle size={14} aria-hidden="true" />O uso passou da franquia {joinList(screen.overLimitAreas)} — o excedente será cobrado.
          </span>
        ) : null}
      </span>
      <BlockMore open={model.open === "situacao"} />
    </button>
  );
}

function Payment({ model }: { readonly model: MySubscriptionViewModel }) {
  const invoice = model.screen!.invoice!;
  const manual = !invoice.hasPaymentMean;
  return (
    <button className={`assin-bloco assin-c-pagar${manual ? " assin-c-pagar--manual" : ""}`} {...blockProps(model, "C", "pagar")}>
      <span className="assin-c-pagar__ic">{manual ? <MessageCircle size={22} aria-hidden="true" /> : <CreditCard size={22} aria-hidden="true" />}</span>
      <span className="assin-c-pagar__txt">
        <span className="assin-c-pagar__t">Como pagar</span>
        <span className="assin-c-pagar__d">
          {invoice.dueCaption}
          {manual ? " · pagamento direto com a equipe TechSolutions" : ` · ${joinList(paymentForms(invoice, true), "ou")}`}
        </span>
      </span>
      <span className="pat-chevron-icon" aria-hidden="true">
        <ChevronDown size={15} />
      </span>
    </button>
  );
}

function Mini({ model, block }: { readonly model: MySubscriptionViewModel; readonly block: "usuarios" | "espaco" | "plano" }) {
  const screen = model.screen!;
  if (block === "plano") {
    return (
      <button className="pat-card assin-bloco assin-c-mini" {...blockProps(model, "C", block)}>
        <span className="pat-card__head">
          <span className="pat-card__title">Plano</span>
        </span>
        <span className="assin-pl-nome assin-c-plano">{planNameText(screen)}</span>
        <span className="assin-pl-hint">
          {screen.planName ? "" : "Nome do plano indisponível no momento. "}
          Franquia de {gb(screen.includedUsers)} usuários e {gb(screen.includedStorage)} GB por mês
        </span>
        <BlockMore open={model.open === block} />
      </button>
    );
  }
  const usage = block === "usuarios" ? screen.users : screen.storage;
  return (
    <button className="pat-card assin-bloco assin-c-mini" {...blockProps(model, "C", block)}>
      <span className="pat-card__head">
        <span className="pat-card__title">{usage.label}</span>
        <UsageSeals usage={usage} />
      </span>
      <span className="assin-c-uso">
        <UsagePie
          used={usage.used}
          included={usage.included}
          unit={usage.unit}
          label={usage.label}
          overLimit={usage.overLimit}
          pending={usage.pending}
          size={76}
          layout="side"
          caption={usage.caption}
          pendingCaption={usage.pendingCaption}
          note={oldMeasurementNote(usage)}
        />
      </span>
      <BlockMore open={model.open === block} />
    </button>
  );
}

function Loading() {
  return (
    <>
      <LoadingAnnouncement />
      <div aria-busy="true" data-state="loading">
        <div className="assin-c-faixa">
          <div className="assin-c-sit" aria-hidden="true">
            <Skel width="56px" height={56} style={{ borderRadius: 16, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>
              <Skel width="22%" height={10} />
              <Skel width="30%" height={24} style={{ marginTop: 8 }} />
              <Skel width="58%" height={13} style={{ marginTop: 8 }} />
            </span>
          </div>
        </div>
        <div className="assin-c-trio">
          {[0, 1, 2].map((index) => (
            <div key={index} className="pat-card assin-c-mini" aria-hidden="true">
              <Skel width="34%" height={14} />
              <span className="ui-usage-pie ui-usage-pie--side assin-c-uso">
                <Skel width="76px" height={76} style={{ borderRadius: "50%", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <Skel width="70%" height={14} />
                  <Skel width="52%" height={11} style={{ marginTop: 8 }} />
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
      <div className="assin-c-faixa">
        <div className="assin-c-sit">
          <span className="assin-c-sit__txt">
            <span className="assin-c-sit__k">SITUAÇÃO DA ASSINATURA</span>
            <span className="assin-vazio-txt">Situação indisponível no momento.</span>
          </span>
        </div>
      </div>
      <div className="assin-c-trio">
        <div className="pat-card assin-c-mini">
          <span className="pat-card__title">Usuários</span>
          <span className="assin-vazio-txt">Uso indisponível no momento.</span>
        </div>
        <div className="pat-card assin-c-mini">
          <span className="pat-card__title">Espaço</span>
          <span className="assin-vazio-txt">Uso indisponível no momento.</span>
        </div>
        <div className="pat-card assin-c-mini">
          <span className="pat-card__title">Plano</span>
          <span className="assin-vazio-txt">Plano indisponível no momento.</span>
        </div>
      </div>
    </>
  );
}

const TOP: readonly MySubscriptionBlock[] = ["situacao", "pagar"];
const BOTTOM: readonly ("usuarios" | "espaco" | "plano")[] = ["usuarios", "espaco", "plano"];

export function MySubscriptionViewC(model: MySubscriptionViewModel) {
  if (model.state === "forbidden") {
    return (
      <section className="assin-tela assin-c" data-aparencia="C">
        <AccessDenied />
      </section>
    );
  }
  const screen = model.state === "ready" ? model.screen : null;
  const organization = model.organizationName ? ` · ${model.organizationName}` : "";
  const today = screen ? ` · ${longDay(screen.todayKey)}` : "";
  return (
    <section className="assin-tela assin-c" data-aparencia="C" onKeyDown={onViewKeyDown(model)}>
      <PageHeader
        kicker="ADMINISTRADOR · SITUAÇÃO PRIMEIRO"
        title="Minha assinatura"
        subtitle={`Primeiro a situação de pagamento, depois o uso da franquia${organization}${today}`}
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
          <div className="assin-c-faixa">
            <Situation model={model} />
            {screen.invoice ? <Payment model={model} /> : null}
          </div>
          <BlockDetail model={model} letter="C" blocks={TOP} />
          <div className="assin-c-trio">
            {BOTTOM.map((block) => (
              <Mini key={block} model={model} block={block} />
            ))}
          </div>
          <BlockDetail model={model} letter="C" blocks={BOTTOM} />
        </>
      ) : null}
    </section>
  );
}
