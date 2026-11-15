import { AlertTriangle, CheckCircle, ChevronDown, Clock, Copy, CreditCard, ExternalLink, FileText, Lock, RefreshCw, Users } from "lucide-react";
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

import { OVER_LIMIT_NOTE, UsageBadge, formatUsageNumber } from "../../../../components/charts";
import { StatusPill } from "../../../../components/patterns";
import { Button, EmptyState } from "../../../../components/ui";
import { GRACE_DAYS, dateBR, dateShort, joinList, type InvoiceModel, type MySubscriptionScreen, type UsageModel } from "../my-subscription.state";
import type { MySubscriptionBlock } from "../my-subscription.types";

// B-ASS-11 (F3) — as peças comuns das 3 aparências de "Minha assinatura" (referência aprovada
// `screen-refs/minha-assinatura-3opcoes.reference.html`): o modelo que a página entrega às vistas, o texto acessível de
// cada bloco, o detalhe que abre logo abaixo do bloco (propriedades + ações, um aberto por vez, `D-PADRAO-BLOCOS-CLICAVEIS`),
// o link externo único (só `https:`, aba nova, `noopener noreferrer`), a faixa de dado desatualizado e os estados §7.
// O conteúdo é o mesmo nas 3; cada vista só compõe. Nada de valor em dinheiro, módulo, veículo ou tendência (P12).

export type MySubscriptionLoadState = "loading" | "error" | "forbidden" | "none" | "ready";

export type CopyTarget = "invoice" | "pix" | "boletoLine";

export type CopyFeedback = { readonly target: CopyTarget; readonly ok: boolean; readonly text: string };

/** O que a página entrega a cada vista (A, B e C recebem o MESMO objeto). */
export type MySubscriptionViewModel = {
  readonly state: MySubscriptionLoadState;
  readonly screen: MySubscriptionScreen | null;
  readonly organizationName: string | null;
  readonly stale: boolean;
  readonly lastUpdatedAt: string | null;
  readonly refreshing: boolean;
  readonly open: MySubscriptionBlock | null;
  readonly onToggle: (block: MySubscriptionBlock) => void;
  readonly onOpen: (block: MySubscriptionBlock) => void;
  readonly onClose: () => void;
  readonly onRetry: () => void;
  readonly canSeeUsers: boolean;
  readonly copy: CopyFeedback | null;
  readonly onCopy: (target: CopyTarget) => void;
};

export type ViewLetter = "A" | "B" | "C";

/** A equipe que atende a organização: sem nome, e-mail nem telefone (o sistema não guarda contato e o repositório é público). */
export const TEAM = "a equipe TechSolutions que atende a sua organização";

export const gb = (count: number) => formatUsageNumber(count);

export const planNameText = (screen: MySubscriptionScreen) => screen.planName ?? "—";

/** As formas de pagamento que vieram ("link", "Pix", "boleto"), na ordem do servidor. */
export function paymentForms(invoice: InvoiceModel, short: boolean): string[] {
  const forms: string[] = [];
  if (invoice.payUrl) forms.push(short ? "link" : "link de pagamento");
  if (invoice.pixCopyPaste) forms.push(short ? "Pix" : "Pix copia e cola");
  if (invoice.boletoLine || invoice.boletoUrl) forms.push("boleto");
  return forms;
}

/** O texto acessível do bloco (o leitor de tela ouve o conteúdo, não só "Ver detalhes"). */
export function blockSummary(screen: MySubscriptionScreen, block: MySubscriptionBlock): string {
  if (block === "plano") return screen.planName ? `Plano ${screen.planName}` : "Plano: nome indisponível";
  if (block === "situacao") {
    if (!screen.overdue) return `Situação: em dia, ${screen.invoice ? "fatura em aberto" : "sem fatura em aberto"}`;
    return `Situação: ${screen.situationTitle.toLowerCase()}${screen.invoice ? "" : ", sem fatura em aberto"}`;
  }
  if (block === "pagar") {
    const invoice = screen.invoice;
    if (!invoice) return "Como pagar";
    return `Como pagar: ${invoice.title.toLowerCase()}${invoice.hasPaymentMean ? "" : ", pagamento direto com a equipe"}`;
  }
  const usage = block === "usuarios" ? screen.users : screen.storage;
  if (usage.pending) return `${usage.label}: em estimativa, limite de ${gb(usage.included)} ${usage.unit}`;
  const tail = usage.overLimit ? ", passou do limite" : usage.percent === null ? "" : `, ${usage.percent}% da franquia`;
  const old = usage.measurementOld && usage.measuredAt ? `, medição antiga de ${dateShort(usage.measuredAt)}` : "";
  return `${usage.label}: ${gb(usage.used)} de ${gb(usage.included)} ${usage.unit}${tail}${old}`;
}

/** As propriedades de botão de um bloco clicável: abre e fecha o detalhe logo abaixo, um por vez. */
export function blockProps(model: MySubscriptionViewModel, letter: ViewLetter, block: MySubscriptionBlock) {
  const open = model.open === block;
  return {
    type: "button" as const,
    "data-bloco": block,
    "aria-expanded": open,
    "aria-controls": open ? detailId(letter, block) : undefined,
    "aria-label": `${model.screen ? blockSummary(model.screen, block) : block} — ver detalhes`,
    onClick: () => model.onToggle(block),
  };
}

export const detailId = (letter: ViewLetter, block: MySubscriptionBlock) => `assin-det-${letter.toLowerCase()}-${block}`;

export function BlockMore({ open, closedText = "Ver detalhes", chevronOnly = false }: { readonly open: boolean; readonly closedText?: string; readonly chevronOnly?: boolean }) {
  return (
    <span className="assin-bloco__mais" aria-hidden="true">
      {chevronOnly ? null : open ? "Fechar detalhes" : closedText}
      <span className="pat-chevron-icon">
        <ChevronDown size={15} />
      </span>
    </span>
  );
}

/** As cores dos selos desta tela (as da referência aprovada), entregues ao `StatusPill` da biblioteca. */
export const SEAL_TONE = {
  success: { bg: "#dcfce7", fg: "#15803d" },
  danger: { bg: "#fee2e2", fg: "#b91c1c" },
  warning: { bg: "#fef3c7", fg: "#b45309" },
  info: { bg: "#eff6ff", fg: "#2563eb" },
} as const;

/** Os selos do cartão de uso: "Passou do limite" / "Em estimativa" e, no espaço, "Medição antiga · <data>". */
export function UsageSeals({ usage }: { readonly usage: UsageModel }) {
  const old = usage.measurementOld && usage.measuredAt;
  if (!usage.pending && !usage.overLimit && !old) return null;
  return (
    <span className="assin-selos">
      <UsageBadge overLimit={usage.overLimit} pending={usage.pending} />
      {old ? <StatusPill label={`Medição antiga · ${dateShort(usage.measuredAt!)}`} {...SEAL_TONE.warning} icon={<Clock size={12} />} /> : null}
    </span>
  );
}

/** A linha "sem medição nova há N dias" da legenda do espaço (estado 10). */
export function oldMeasurementNote(usage: UsageModel): ReactNode {
  if (!usage.measurementOld || usage.daysSinceMeasurement === null) return null;
  return <span className="ui-usage-pie__note">sem medição nova há {usage.daysSinceMeasurement} dias</span>;
}

/** O link externo ÚNICO da tela: só recebe endereço que o adapter já aceitou (`https:`), e abre em aba nova. */
function ExternalAction({ href, primary, icon, children }: { readonly href: string; readonly primary: boolean; readonly icon: ReactNode; readonly children: ReactNode }) {
  return (
    <a className={primary ? "pat-btn pat-btn--primary" : "pat-btn"} href={href} target="_blank" rel="noopener noreferrer">
      {icon}
      {children}
    </a>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{label}:</span> <span className="pat-ab-detail-val">{children}</span>
    </div>
  );
}

type DetailContent = {
  readonly title: string;
  readonly headline: ReactNode;
  readonly tone?: "success" | "danger" | "warning";
  readonly caption: string;
  readonly left: readonly (readonly [string, ReactNode])[];
  readonly right: readonly (readonly [string, ReactNode])[];
  readonly note?: string;
  readonly actions?: ReactNode;
};

function focusBlock(root: Element | null | undefined, block: MySubscriptionBlock) {
  const target = root?.querySelector?.(`[data-bloco="${block}"]`) as { focus?: () => void } | null | undefined;
  target?.focus?.();
}

/** Esc fecha o detalhe aberto e devolve o foco ao bloco (Enter e Espaço são do próprio botão). */
export function onViewKeyDown(model: MySubscriptionViewModel) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || model.open === null) return;
    const block = model.open;
    model.onClose();
    focusBlock(event.currentTarget, block);
  };
}

function usageDetail(screen: MySubscriptionScreen, usage: UsageModel, model: MySubscriptionViewModel): DetailContent {
  if (usage.id === "usuarios") {
    return {
      title: "Usuários",
      headline: `${gb(usage.used)} de ${gb(usage.included)} usuários`,
      caption: usage.overLimit ? `Passou do limite · ${OVER_LIMIT_NOTE}` : `${usage.percent ?? 0}% da franquia · maior número de ${screen.month}`,
      left: [
        ["O que conta", "usuários com acesso ativo na organização"],
        ["Como é medido", "contagem diária; vale o maior número do mês"],
        ["Período", screen.periodText],
      ],
      right: [
        ["Limite contratado", `${gb(usage.included)} usuários`],
        ["Em uso", gb(usage.used)],
        usage.overLimit ? ["Situação", <b className="assin-texto--critico">{OVER_LIMIT_NOTE}</b>] : ["Disponível", gb(usage.included - usage.used)],
      ],
      actions: model.canSeeUsers ? (
        <Link className="pat-btn pat-btn--primary" to="/users">
          <Users size={14} aria-hidden="true" /> Ver usuários
        </Link>
      ) : undefined,
    };
  }
  if (usage.pending || usage.measuredAt === null) {
    return {
      title: "Espaço",
      headline: `— de ${gb(usage.included)} GB`,
      caption: usage.pendingCaption,
      left: [
        ["O que conta", "dados da organização e arquivos enviados (fotos, documentos e anexos)"],
        ["Quando foi medido", "ainda não houve medição neste mês"],
      ],
      right: [
        ["Limite contratado", `${gb(usage.included)} GB`],
        ["Como é medido", "estimativa diária; vale o maior número do mês"],
      ],
      note: "O uso aparece aqui assim que a primeira estimativa do mês sair. A tela atualiza sozinha.",
    };
  }
  const old = usage.measurementOld;
  return {
    title: "Espaço",
    headline: `${gb(usage.used)} de ${gb(usage.included)} GB`,
    caption: `${usage.overLimit ? `Passou do limite · ${OVER_LIMIT_NOTE}` : `${usage.percent ?? 0}% da franquia`} · estimativa de ${dateShort(usage.measuredAt)}${old ? " · medição antiga" : ""}`,
    left: [
      ["O que conta", "dados da organização e arquivos enviados (fotos, documentos e anexos)"],
      [
        "Quando foi medido",
        <>
          {dateBR(usage.measuredAt)} · estimativa{old ? <> · <b className="assin-texto--aviso">há {usage.daysSinceMeasurement} dias</b></> : null}
        </>,
      ],
      ["Como é medido", "estimativa diária; vale o maior número do mês"],
    ],
    right: [
      ["Limite contratado", `${gb(usage.included)} GB`],
      ["Em uso", `${gb(usage.used)} GB`],
      usage.overLimit ? ["Situação", <b className="assin-texto--critico">{OVER_LIMIT_NOTE}</b>] : ["Disponível", `${gb(usage.included - usage.used)} GB`],
    ],
    note: old
      ? `A medição de espaço é diária, e a mais recente é de ${dateBR(usage.measuredAt)}. Até sair uma medição nova, o uso real pode estar acima deste número. A tela atualiza sozinha.`
      : "É uma estimativa diária. No fechamento do mês vale o maior número medido.",
  };
}

function situationDetail(screen: MySubscriptionScreen, model: MySubscriptionViewModel): DetailContent {
  const invoice = screen.invoice;
  const updated = model.stale && model.lastUpdatedAt ? `às ${model.lastUpdatedAt} · a última atualização falhou` : "agora · a tela atualiza sozinha";
  const right: (readonly [string, ReactNode])[] = [
    ["Prazo de tolerância", `até ${GRACE_DAYS} dias depois do vencimento, sem mudar a situação`],
    ["Atualizado", updated],
  ];
  const actions = invoice ? (
    <button type="button" className="pat-btn pat-btn--primary" onClick={() => model.onOpen("pagar")}>
      <CreditCard size={14} aria-hidden="true" /> Ver como pagar
    </button>
  ) : undefined;
  if (!screen.overdue) {
    const left: (readonly [string, ReactNode])[] = [
      ["Situação", <StatusPill label="Em dia" {...SEAL_TONE.success} icon={<CheckCircle size={12} />} />],
      invoice ? ["Fatura em aberto", invoice.dueDate ? invoice.dueText : "sem data de vencimento"] : ["Próximo vencimento", "sem fatura em aberto"],
    ];
    if (invoice?.onTimeUntil) left.push(["Continua em dia até", dateBR(invoice.onTimeUntil)]);
    return { title: "Situação", headline: "Em dia", tone: "success", caption: invoice ? invoice.title : "Sem fatura em aberto", left, right, actions };
  }
  const left: (readonly [string, ReactNode])[] = [["Situação", <StatusPill label="Em atraso" {...SEAL_TONE.danger} icon={<AlertTriangle size={12} />} />]];
  if (invoice) left.push(["Fatura em aberto", invoice.dueDate ? invoice.dueText : "sem data de vencimento"]);
  if (!invoice || !screen.overdueSince) left.push(["Para voltar a ficar em dia", `falar com ${TEAM}`]);
  else
    left.push([
      "Para voltar a ficar em dia",
      invoice.hasPaymentMean ? "pagar a fatura em aberto" : "pagar a fatura direto com a equipe TechSolutions; muda quando o pagamento for registrado",
    ]);
  let note: string | undefined;
  if (!invoice)
    note = `Não há fatura em aberto para pagar por aqui, mas a assinatura consta em atraso — por exemplo, quando um pagamento é devolvido pelo banco. Fale com ${TEAM} para regularizar. A tela atualiza sozinha.`;
  else if (!screen.overdueSince)
    note = `A assinatura consta em atraso, sem uma data de início — por exemplo, quando um pagamento é devolvido pelo banco. Fale com ${TEAM}: ela informa o que falta regularizar. A fatura em aberto segue em “Como pagar”.`;
  return {
    title: "Situação",
    headline: screen.situationTitle,
    tone: "danger",
    caption: screen.overdueSince ? (invoice ? invoice.title : "Sem fatura em aberto") : "Fale com a equipe para saber o que falta regularizar",
    left,
    right,
    note,
    actions,
  };
}

function invoiceTone(screen: MySubscriptionScreen, invoice: InvoiceModel): DetailContent["tone"] {
  if (screen.overdue) return "danger";
  return invoice.past ? "warning" : undefined;
}

function paymentDetail(screen: MySubscriptionScreen, invoice: InvoiceModel, model: MySubscriptionViewModel): DetailContent {
  const due: ReactNode = invoice.dueDate ? `${dateBR(invoice.dueDate)}${invoice.past ? " · vencida" : ""}` : "não informado";
  if (!invoice.hasPaymentMean) {
    const onTime = !screen.overdue;
    const right: (readonly [string, ReactNode])[] = [
      ["Nota fiscal", "tratada com a equipe, junto com o pagamento"],
      onTime
        ? ["Depois do pagamento", "a fatura sai daqui quando a equipe registrar o pagamento"]
        : screen.overdueSince
          ? ["Volta a ficar em dia", "quando a equipe registrar o pagamento"]
          : ["Situação", "a equipe informa o que falta para voltar a ficar em dia"],
    ];
    if (invoice.onTimeUntil) right.push(["Continua em dia até", dateBR(invoice.onTimeUntil)]);
    return {
      title: "Como pagar",
      headline: "Fatura em aberto",
      tone: invoiceTone(screen, invoice),
      caption: `${invoice.dueCaption} · sem pagamento pela tela`,
      left: [
        ["Vencimento", due],
        ["Forma de pagamento", `direto com ${TEAM}`],
        ["O que é copiado", invoice.copyText],
      ],
      right,
      note: `Esta fatura não tem pagamento pela tela. Fale com ${TEAM} e informe ${invoice.dueDate ? "o vencimento da fatura" : "que há uma fatura em aberto"}. Assim que o pagamento for registrado, ${onTime || !screen.overdueSince ? "ela sai daqui" : "a situação volta para “Em dia”"}. A tela atualiza sozinha.`,
      actions: (
        <button type="button" className="pat-btn" onClick={() => model.onCopy("invoice")}>
          <Copy size={14} aria-hidden="true" /> Copiar dados da fatura
        </button>
      ),
    };
  }
  return {
    title: "Como pagar",
    headline: "Fatura em aberto",
    tone: invoiceTone(screen, invoice),
    caption: invoice.dueCaption,
    left: [
      ["Vencimento", due],
      ["Formas de pagamento", joinList(paymentForms(invoice, false))],
    ],
    right: [
      ["Nota fiscal", `tratada com ${TEAM}`],
      ["Onde ver a cobrança", "na página de pagamento e no aplicativo do seu banco"],
    ],
    note: "Os dados da cobrança aparecem na página de pagamento e no aplicativo do seu banco. Os códigos são copiados, não mostrados por extenso.",
    actions: (
      <>
        {invoice.payUrl ? (
          <ExternalAction href={invoice.payUrl} primary icon={<ExternalLink size={14} aria-hidden="true" />}>
            Pagar
          </ExternalAction>
        ) : null}
        {invoice.pixCopyPaste ? (
          <button type="button" className="pat-btn" onClick={() => model.onCopy("pix")}>
            <Copy size={14} aria-hidden="true" /> Copiar código Pix
          </button>
        ) : null}
        {invoice.boletoLine ? (
          <button type="button" className="pat-btn" onClick={() => model.onCopy("boletoLine")}>
            <Copy size={14} aria-hidden="true" /> Copiar linha digitável
          </button>
        ) : null}
        {invoice.boletoUrl ? (
          <ExternalAction href={invoice.boletoUrl} primary={false} icon={<FileText size={14} aria-hidden="true" />}>
            Abrir boleto
          </ExternalAction>
        ) : null}
      </>
    ),
  };
}

function detailContent(model: MySubscriptionViewModel, screen: MySubscriptionScreen, block: MySubscriptionBlock): DetailContent | null {
  if (block === "plano") {
    return {
      title: "Plano",
      headline: planNameText(screen),
      caption: screen.planName ? "Plano contratado pela organização" : "Nome do plano indisponível no momento",
      left: [
        ["Plano", planNameText(screen)],
        ["Período em uso", screen.periodText],
      ],
      right: [
        ["Franquia de usuários", `${gb(screen.includedUsers)} usuários ativos`],
        ["Franquia de espaço", `${gb(screen.includedStorage)} GB`],
      ],
      note: "A franquia é o que o plano inclui por mês. O uso do mês é comparado com ela nas pizzas de usuários e de espaço.",
    };
  }
  if (block === "usuarios") return usageDetail(screen, screen.users, model);
  if (block === "espaco") return usageDetail(screen, screen.storage, model);
  if (block === "situacao") return situationDetail(screen, model);
  return screen.invoice ? paymentDetail(screen, screen.invoice, model) : null;
}

const HEADLINE_TONE = { success: "assin-det__v--success", danger: "assin-det__v--danger", warning: "assin-det__v--warning" } as const;

/** O detalhe que abre logo abaixo, quando o bloco aberto é um dos `blocks` deste trecho da vista. */
export function BlockDetail({ model, letter, blocks }: { readonly model: MySubscriptionViewModel; readonly letter: ViewLetter; readonly blocks: readonly MySubscriptionBlock[] }) {
  const screen = model.screen;
  const block = model.open;
  if (!screen || block === null || !blocks.includes(block)) return null;
  const content = detailContent(model, screen, block);
  if (!content) return null;
  const close = (event: MouseEvent<HTMLButtonElement>) => {
    const root = (event.currentTarget as { closest?: (selector: string) => Element | null }).closest?.("[data-aparencia]");
    model.onClose();
    focusBlock(root, block);
  };
  const copy = block === "pagar" ? model.copy : null;
  return (
    <section className="assin-det" id={detailId(letter, block)} role="region" aria-label={`Detalhe: ${content.title}`}>
      <div className="assin-det__topo">
        <div>
          <div className="assin-det__t">{content.title}</div>
          <div className={`assin-det__v${content.tone ? ` ${HEADLINE_TONE[content.tone]}` : ""}`}>{content.headline}</div>
          <div className="assin-det__c">{content.caption}</div>
        </div>
        <button type="button" className="pat-link" onClick={close}>
          Fechar
        </button>
      </div>
      <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
        <div className="pat-ab-detail-col">
          {content.left.map(([label, text]) => (
            <Field key={label} label={label}>
              {text}
            </Field>
          ))}
        </div>
        <div className="pat-ab-detail-col">
          {content.right.map(([label, text]) => (
            <Field key={label} label={label}>
              {text}
            </Field>
          ))}
        </div>
      </div>
      {content.note ? <p className="assin-det__nota">{content.note}</p> : null}
      {content.actions ? <div className="pat-ab-detail-actions">{content.actions}</div> : null}
      {copy ? (
        <div className={copy.ok ? "ui-alert ui-alert--info assin-copia" : "ui-alert ui-alert--warning assin-copia"} role="status" data-copia={copy.ok ? "ok" : "falhou"}>
          {copy.ok ? <CheckCircle size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          <span>{copy.text}</span>
        </div>
      ) : null}
    </section>
  );
}

/** Estado 15: a atualização em 2º plano falhou e o dado anterior fica, com o aviso e "Tentar de novo". */
export function StaleBanner({ model }: { readonly model: MySubscriptionViewModel }) {
  if (!model.stale) return null;
  return (
    <div role="status" data-state="stale" className="pat-banner pat-banner--warning">
      <AlertTriangle size={14} aria-hidden="true" />
      <span>{model.refreshing ? "Atualizando…" : `Dados desatualizados${model.lastUpdatedAt ? ` — última atualização às ${model.lastUpdatedAt}` : ""}`}</span>
      {model.refreshing ? null : (
        <button type="button" className="pat-link" onClick={model.onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

/** Estado 13: 403 do servidor (papel sem `billing:read` ou ator de plataforma), sem dado nenhum. */
export function AccessDenied() {
  return (
    <div className="apardash-acesso" data-state="forbidden" role="alert">
      <span className="apardash-acesso__ic" aria-hidden="true">
        <Lock size={24} />
      </span>
      <h2>Acesso não permitido</h2>
      <p>Seu perfil não tem acesso à assinatura da organização. Se precisar ver o plano, o uso da franquia ou como pagar, fale com o administrador da organização.</p>
    </div>
  );
}

/** Estado 14: o servidor respondeu `data: null`. */
export function NoSubscription() {
  return (
    <div data-state="empty">
      <EmptyState
        title="Sua organização ainda não tem assinatura"
        detail="Quando a assinatura da organização for ativada pela equipe TechSolutions, o plano, o uso da franquia e a situação de pagamento aparecem aqui. A tela atualiza sozinha."
      />
    </div>
  );
}

/** Estado 12 na aparência A (a tela-modelo): o aviso e "Tentar de novo". */
export function LoadErrorA({ model }: { readonly model: MySubscriptionViewModel }) {
  return (
    <>
      <section className="ui-alert ui-alert--warning" role="alert" data-state="error">
        <AlertTriangle size={18} aria-hidden="true" />
        <div>
          <strong>Não foi possível carregar a assinatura</strong>
          <p>A conexão com o servidor falhou. A tela tenta de novo sozinha; se preferir, tente agora.</p>
        </div>
      </section>
      <div className="assin-retry">
        <Button type="button" variant="secondary" onClick={model.onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> Tentar de novo
        </Button>
      </div>
    </>
  );
}

/** Estado 12 nas aparências B e C: a faixa de erro do padrão, com "Tentar de novo". */
export function LoadErrorBanner({ model }: { readonly model: MySubscriptionViewModel }) {
  return (
    <div role="alert" className="pat-banner pat-banner--error" data-state="error">
      <span>Não foi possível carregar a assinatura agora.</span>
      <button type="button" className="pat-link" onClick={model.onRetry}>
        Tentar de novo
      </button>
    </div>
  );
}

/** Texto só para o leitor de tela enquanto o esqueleto aparece. */
export function LoadingAnnouncement() {
  return (
    <p className="sr-only" role="status">
      Carregando a assinatura…
    </p>
  );
}

export function Skel({ width, height, style }: { readonly width: string; readonly height: number; readonly style?: CSSProperties }) {
  return <span className="pat-skel assin-skel" style={{ width, height, ...style }} />;
}

/** O texto do aviso depois de copiar: sucesso, ou a recusa do navegador (sem a mensagem de sucesso). */
export function copyFeedbackText(target: CopyTarget, ok: boolean, copied: string): string {
  if (target === "invoice") {
    return ok
      ? `Dados da fatura copiados: ${copied}. Cole na mensagem para a equipe.`
      : `Não foi possível copiar os dados da fatura: o navegador não liberou a área de transferência. Anote: ${copied.replace(" · fatura em aberto", "")}.`;
  }
  const what = target === "pix" ? "o código Pix" : "a linha digitável";
  if (ok) return target === "pix" ? "Código Pix copiado. Cole no aplicativo do seu banco." : "Linha digitável copiada. Cole no aplicativo do seu banco.";
  return `Não foi possível copiar ${what}: o navegador não liberou a área de transferência.`;
}
