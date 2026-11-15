import { AlertTriangle, Clock } from "lucide-react";
import type { ReactNode } from "react";

// B-ASS-11 (F1, Emenda 1 §6.1) — a pizza CHEIA da franquia (raio interno 0), SVG inline (PD-004), a partir do
// `ReconcileDonut.tsx`. O limite contratado é a pizza inteira: a fatia azul é o que está em uso e a clara o que está
// disponível. Acima do limite, a pizza fica inteira na cor crítica, com o selo "Passou do limite" e a frase da franquia;
// o excedente NUNCA aparece em número (nem em dinheiro). A legenda é sempre "<usado> de <limite> <unidade>", a fala do
// dono, e por isso "23 de 20" aparece. Sem medição (`pending`), "— de <limite>" e "Em estimativa". Nenhum campo
// monetário nas propriedades; `included = 0` não divide por zero; números em pt-BR ("11,5").
// O selo fica num export à parte (`UsageBadge`), porque a referência aprovada o põe no cabeçalho do cartão.

export const OVER_LIMIT_NOTE = "acima da franquia — o excedente será cobrado";

export type UsagePieProps = {
  readonly used: number;
  readonly included: number;
  /** Unidade por extenso na legenda ("usuários", "GB"). */
  readonly unit: string;
  /** Nome do uso, para o texto acessível ("Usuários", "Espaço"). */
  readonly label: string;
  readonly overLimit: boolean;
  /** Ainda sem medição: "— de <limite>". */
  readonly pending?: boolean;
  /** Lado do SVG, em px (padrão 104). */
  readonly size?: number;
  /** "side" põe a legenda ao lado da pizza; o padrão a põe embaixo. */
  readonly layout?: "stack" | "side";
  /** O número em uso em destaque (aparência analítica). */
  readonly emphasis?: boolean;
  /** Complemento da legenda ("maior número de novembro", "estimativa de 13/11"). */
  readonly caption?: string | null;
  /** Texto de "Em estimativa" quando `pending` (padrão: só "Em estimativa"). */
  readonly pendingCaption?: string;
  /** Linha extra de aviso, abaixo da legenda (ex.: medição antiga). */
  readonly note?: ReactNode;
  /** As barras de "Em uso" e "Disponível". */
  readonly rows?: boolean;
};

const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Número da franquia em pt-BR, ou "—" quando não é um número finito. */
export function formatUsageNumber(value: number): string {
  return Number.isFinite(value) ? NUMBER.format(value) : "—";
}

/** Fração em uso (0..1) sobre o limite; limite 0 ou inválido → 0, sem divisão por zero. */
export function usageFraction(used: number, included: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(included) || included <= 0) return 0;
  return Math.max(0, Math.min(1, used / included));
}

/** Percentual da franquia, só até 100% e só com limite positivo; senão `null`. */
export function usagePercent(used: number, included: number, overLimit: boolean): number | null {
  if (overLimit || !Number.isFinite(used) || !Number.isFinite(included) || included <= 0) return null;
  return Math.round(usageFraction(used, included) * 100);
}

function available(used: number, included: number): number | null {
  if (!Number.isFinite(used) || !Number.isFinite(included) || used > included) return null;
  return included - used;
}

/** O selo do cartão: "Passou do limite" acima da franquia, "Em estimativa" sem medição; nada no resto. */
export function UsageBadge({ overLimit, pending = false }: { readonly overLimit: boolean; readonly pending?: boolean }) {
  if (pending) {
    return (
      <span className="pat-pill ui-usage-pie__badge ui-usage-pie__badge--pending">
        <Clock size={12} aria-hidden="true" />
        Em estimativa
      </span>
    );
  }
  if (!overLimit) return null;
  return (
    <span className="pat-pill ui-usage-pie__badge ui-usage-pie__badge--over">
      <AlertTriangle size={12} aria-hidden="true" />
      Passou do limite
    </span>
  );
}

export function UsagePie({
  used,
  included,
  unit,
  label,
  overLimit,
  pending = false,
  size = 104,
  layout = "stack",
  emphasis = false,
  caption = null,
  pendingCaption,
  note,
  rows = false,
}: UsagePieProps) {
  const usedLabel = formatUsageNumber(used);
  const includedLabel = formatUsageNumber(included);
  const percent = usagePercent(used, included, overLimit);
  const free = available(used, included);
  const freeLabel = free === null ? null : formatUsageNumber(free);
  // Nas barras, a unidade curta acompanha o número ("42 GB"); a longa fica só na legenda ("18").
  const rowSuffix = unit.length <= 3 ? ` ${unit}` : "";
  const center = size / 2;
  const radius = center - 1;

  let ariaLabel: string;
  let body: ReactNode;
  if (pending) {
    ariaLabel = `${label}: em estimativa, limite contratado de ${includedLabel} ${unit}`;
    const icon = Math.round(size * 0.32);
    body = (
      <>
        <circle className="ui-usage-pie__pending" cx={center} cy={center} r={radius - 1} strokeWidth={1.5} strokeDasharray="5 4">
          <title>{`Em estimativa: limite contratado de ${includedLabel} ${unit}`}</title>
        </circle>
        <g transform={`translate(${center - icon / 2} ${center - icon / 2}) scale(${icon / 24})`} className="ui-usage-pie__clock" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={12} cy={12} r={10} />
          <polyline points="12 6 12 12 16 14" />
        </g>
      </>
    );
  } else if (overLimit) {
    ariaLabel = `${label}: ${usedLabel} de ${includedLabel} ${unit}, passou do limite`;
    body = (
      <circle className="ui-usage-pie__over" cx={center} cy={center} r={radius}>
        <title>{`Em uso: ${usedLabel} de ${includedLabel} ${unit} — ${OVER_LIMIT_NOTE}`}</title>
      </circle>
    );
  } else {
    const fraction = usageFraction(used, included);
    ariaLabel = `${label}: ${usedLabel} de ${includedLabel} ${unit} em uso${percent === null ? "" : `, ${percent}% da franquia`}${freeLabel === null ? "" : `; ${freeLabel} disponíveis`}`;
    const usedTitle = <title>{`Em uso: ${usedLabel} ${unit}`}</title>;
    if (fraction >= 1) {
      body = (
        <circle className="ui-usage-pie__used" cx={center} cy={center} r={radius}>
          {usedTitle}
        </circle>
      );
    } else {
      const angle = fraction * 2 * Math.PI;
      const x = center + radius * Math.sin(angle);
      const y = center - radius * Math.cos(angle);
      body = (
        <>
          <circle className="ui-usage-pie__free" cx={center} cy={center} r={radius}>
            <title>{`Disponível: ${freeLabel ?? "—"} ${unit}`}</title>
          </circle>
          {fraction > 0 ? (
            <path
              className="ui-usage-pie__used ui-usage-pie__slice"
              d={`M${center} ${center} L${center} ${center - radius} A${radius} ${radius} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`}
              strokeWidth={1.5}
              strokeLinejoin="round"
            >
              {usedTitle}
            </path>
          ) : null}
        </>
      );
    }
  }

  const main = pending ? (
    emphasis ? (
      <span className="ui-usage-pie__strong">
        <span className="ui-usage-pie__num">—</span> <span className="ui-usage-pie__of">de {includedLabel} {unit}</span>
      </span>
    ) : (
      <span className="ui-usage-pie__main">— de {includedLabel} {unit}</span>
    )
  ) : emphasis ? (
    <span className="ui-usage-pie__strong">
      <span className="ui-usage-pie__num">{usedLabel}</span> <span className="ui-usage-pie__of">de {includedLabel} {unit}</span>
    </span>
  ) : (
    <span className="ui-usage-pie__main">{usedLabel} de {includedLabel} {unit}</span>
  );

  const sub = pending ? (
    <span className="ui-usage-pie__sub">{pendingCaption ?? "Em estimativa"}</span>
  ) : overLimit ? (
    <>
      <span className="ui-usage-pie__over-note">{OVER_LIMIT_NOTE}</span>
      {caption ? <span className="ui-usage-pie__sub">{caption}</span> : null}
    </>
  ) : (
    <span className="ui-usage-pie__sub">{[percent === null ? null : `${percent}% da franquia`, caption].filter(Boolean).join(" · ")}</span>
  );

  const meterWidth = (value: number) => `${(usageFraction(value, included) * 100).toFixed(1)}%`;
  const bars =
    rows && !pending ? (
      <span className="ui-usage-pie__rows">
        <span className="ui-usage-pie__item">
          <span className="ui-usage-pie__name">
            <i className={`ui-usage-pie__swatch ${overLimit ? "ui-usage-pie__swatch--over" : "ui-usage-pie__swatch--used"}`} aria-hidden="true" />
            Em uso
          </span>
          <span className="ui-usage-pie__meter" aria-hidden="true">
            <b className={overLimit ? "ui-usage-pie__swatch--over" : "ui-usage-pie__swatch--used"} style={{ width: overLimit ? "100%" : meterWidth(used) }} />
          </span>
          <span className="ui-usage-pie__count">{usedLabel}{rowSuffix}</span>
        </span>
        {!overLimit && free !== null ? (
          <span className="ui-usage-pie__item">
            <span className="ui-usage-pie__name">
              <i className="ui-usage-pie__swatch ui-usage-pie__swatch--free" aria-hidden="true" />
              Disponível
            </span>
            <span className="ui-usage-pie__meter" aria-hidden="true">
              <b className="ui-usage-pie__swatch--free" style={{ width: meterWidth(free) }} />
            </span>
            <span className="ui-usage-pie__count">{freeLabel}{rowSuffix}</span>
          </span>
        ) : null}
      </span>
    ) : null;

  return (
    <span className={`ui-usage-pie${layout === "side" ? " ui-usage-pie--side" : ""}`}>
      <svg className="ui-usage-pie__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        {body}
      </svg>
      <span className="ui-usage-pie__legend">
        {main}
        {sub}
        {note ?? null}
        {bars}
      </span>
    </span>
  );
}
