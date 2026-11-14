import type { KeyboardEvent } from "react";

// B-ASS-10b (T5) — ponte em degraus SVG inline (PD-004), nascida para "Da assinatura à margem" da aparência C do Cloud
// Billing (`screen-refs/platform-cloud-billing-3opcoes.reference.html`, `ponte()`): começa num valor, tira degraus e termina
// num valor. O `BalanceBridge` não serve (é preso à semântica de saldo de conta, 4 colunas fixas) e não é mexido.
// O VALOR FINAL é o literal recebido (`displayValue` do degrau "end"); a soma interna dos degraus é só geometria e nunca
// vira texto. Cada degrau é um botão (`role="button"`, Tab, Enter/Espaço, `aria-pressed`). Qualquer valor ausente → o
// estado indisponível ("Margem indisponível."), nunca uma ponte com zero inventado.

export type StepBridgeKind = "start" | "minus" | "end";

export type StepBridgeTone = "accent" | "danger" | "warning" | "violet" | "neutral" | "muted" | "success";

export type StepBridgeStep = {
  readonly key: string;
  /** Rótulo sob a barra; `\n` quebra em duas linhas. */
  readonly label: string;
  /** Número de DESENHO do degrau; nunca é exibido. */
  readonly value: number | null;
  readonly kind: StepBridgeKind;
  /** Texto do valor, já formatado pelo chamador a partir do literal do servidor. */
  readonly displayValue: string;
  /** Cor do degrau; sem ela, "start" é azul, "minus" é cinza e "end" é verde ou vermelho pelo sinal. */
  readonly tone?: StepBridgeTone;
  /** Linha opcional sob o rótulo (ex.: o percentual da margem, já formatado pelo chamador). */
  readonly note?: string;
};

export type StepBridgeProps = {
  readonly steps: readonly StepBridgeStep[];
  readonly pressedKey?: string | null;
  readonly onSelect?: (key: string) => void;
  readonly ariaLabel: string;
  readonly emptyLabel?: string;
};

const WIDTH = 640;
const HEIGHT = 236;
const X_LEFT = 14;
const X_RIGHT = 630;
const Y_TOP = 26;
const Y_BOTTOM = 184;
const BAR = 44;

const KINDS: ReadonlySet<string> = new Set(["start", "minus", "end"]);

/** Tira o sinal do texto já formatado ("-R$ 0,12" → "R$ 0,12"); é texto, não conta. */
const unsigned = (text: string) => text.replace(/^[-−]\s?/, "");

function toneOf(step: StepBridgeStep): StepBridgeTone {
  if (step.tone) return step.tone;
  if (step.kind === "start") return "accent";
  if (step.kind === "end") return (step.value as number) >= 0 ? "success" : "danger";
  return "neutral";
}

export function StepBridge({ steps, pressedKey = null, onSelect, ariaLabel, emptyLabel = "Margem indisponível." }: StepBridgeProps) {
  if (steps.length === 0 || steps.some((step) => step.value === null || !Number.isFinite(step.value) || !KINDS.has(step.kind))) {
    return <div className="ui-step-bridge ui-step-bridge--empty">{emptyLabel}</div>;
  }

  // Geometria: cada degrau é um intervalo [baixo, alto]. "start" sobe do zero; "minus" desce do nível atual; "end" é o
  // literal do servidor, do zero — o nível acumulado NÃO decide a barra final.
  let level = 0;
  const spans = steps.map((step) => {
    const value = step.value as number;
    if (step.kind === "start") {
      level = value;
      return [0, value] as const;
    }
    if (step.kind === "minus") {
      const span = [level - value, level] as const;
      level -= value;
      return span;
    }
    return [0, value] as const;
  });
  const flat = spans.flat();
  const minimum = Math.min(0, ...flat);
  const maximum = Math.max(0, ...flat);
  const range = maximum - minimum || 1;
  const sy = (value: number) => Y_BOTTOM - ((value - minimum) / range) * (Y_BOTTOM - Y_TOP);
  const band = (X_RIGHT - X_LEFT) / steps.length;

  const activate = (key: string) => onSelect?.(key);
  const onKeyDown = (event: KeyboardEvent<SVGGElement>, key: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(key);
    }
  };

  return (
    <figure className="ui-step-bridge">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="group" aria-label={ariaLabel}>
        <line className="ui-step-bridge__base" x1={X_LEFT} x2={X_RIGHT} y1={sy(0).toFixed(1)} y2={sy(0).toFixed(1)} />
        {steps.map((step, index) => {
          const [low, high] = [Math.min(...spans[index]), Math.max(...spans[index])];
          const top = sy(high);
          const bottom = sy(low);
          const center = X_LEFT + (index + 0.5) * band;
          const minus = step.kind === "minus";
          const shown = minus ? `${(step.value as number) >= 0 ? "−" : "+"}${unsigned(step.displayValue)}` : step.displayValue;
          const [lineOne, lineTwo] = step.label.split("\n");
          const next = steps[index + 1];
          // Nível em que o degrau seguinte começa: o topo depois de "start", a base depois de "minus".
          const carry = step.kind === "start" ? spans[index][1] : spans[index][0];
          return (
            <g key={step.key}>
              <g
                className={`ui-step-bridge__step ui-step-bridge__step--${toneOf(step)}`}
                role="button"
                tabIndex={0}
                aria-pressed={pressedKey === step.key}
                aria-label={`${step.label.replace("\n", "")}: ${minus ? "menos " : ""}${step.displayValue}`}
                onClick={() => activate(step.key)}
                onKeyDown={(event) => onKeyDown(event, step.key)}
              >
                <rect className="ui-step-bridge__hit" x={(X_LEFT + index * band + 3).toFixed(1)} y={2} width={(band - 6).toFixed(1)} height={HEIGHT - 4} rx={8} />
                <rect className="ui-step-bridge__bar" x={(center - BAR / 2).toFixed(1)} y={top.toFixed(1)} width={BAR} height={Math.max(2, bottom - top).toFixed(1)} rx={4} />
                <text className="ui-step-bridge__value" x={center.toFixed(1)} y={Math.max(12, top - 6).toFixed(1)} fontSize={10.5} fontWeight={800} textAnchor="middle">
                  {shown}
                </text>
                <text className="ui-step-bridge__label" x={center.toFixed(1)} y={Y_BOTTOM + 18} fontSize={10.5} fontWeight={700} textAnchor="middle">
                  {lineOne}
                </text>
                {lineTwo ? (
                  <text className="ui-step-bridge__label" x={center.toFixed(1)} y={Y_BOTTOM + 30} fontSize={10.5} fontWeight={700} textAnchor="middle">
                    {lineTwo}
                  </text>
                ) : null}
                {step.note ? (
                  <text className="ui-step-bridge__note" x={center.toFixed(1)} y={Y_BOTTOM + (lineTwo ? 42 : 31)} fontSize={10} fontWeight={800} textAnchor="middle">
                    {step.note}
                  </text>
                ) : null}
              </g>
              {next && step.kind !== "end" ? (
                <line className="ui-step-bridge__link" x1={(center + BAR / 2).toFixed(1)} x2={(center + band - BAR / 2).toFixed(1)} y1={sy(carry).toFixed(1)} y2={sy(carry).toFixed(1)} />
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">{steps.map((step) => `${step.label.replace("\n", "")}: ${step.kind === "minus" ? "menos " : ""}${step.displayValue}`).join("; ")}.</figcaption>
    </figure>
  );
}
