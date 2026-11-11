import { Check } from "lucide-react";
import type { ReactNode } from "react";

// Indicador de etapas (B-USERS-ACESSO-SEG, T1 · Emenda 6, item 1): lista ordenada em que cada etapa está atual, feita ou
// futura; a atual leva `aria-current="step"`, a feita troca o número por ✓ e pode mostrar um selo e uma ação (por exemplo
// "Alterar"), a futura esconde o conteúdo e pode mostrar uma nota. Nasceu na aparência C da troca de senha
// (`screen-refs/troca-senha-3opcoes.reference.html`; no app, o desenho do `WorkOrderStepper`) e mora na biblioteca porque
// a web não tinha equivalente (§4 item 3 do CLAUDE.md; registro em COMPONENT_LIBRARY.md).

export type StepState = "current" | "done" | "future";

export type StepItem = {
  readonly key: string;
  readonly state: StepState;
  /** Por exemplo "Etapa 1 de 2". */
  readonly heading: string;
  /** Selo da etapa feita (por exemplo "informada"); o leitor de tela ouve também ", etapa concluída". */
  readonly doneLabel?: string;
  /** Nota da etapa futura (por exemplo "depois da etapa 1"). */
  readonly futureNote?: string;
  /** Ação no cabeçalho (por exemplo o botão "Alterar"); use a classe `ui-steps__action`. */
  readonly action?: ReactNode;
  /** Título visível quando a etapa é futura e o conteúdo está escondido. */
  readonly futureTitle?: string;
  readonly children: ReactNode;
};

const STEPS_CSS = `
.ui-steps{list-style:none;margin:0 0 24px;padding:0}
.ui-steps [hidden]{display:none!important}
.ui-steps__item{position:relative;padding-left:40px}
.ui-steps__item+.ui-steps__item{margin-top:18px}
.ui-steps__item:not(:last-child)::before{content:"";position:absolute;left:12px;top:32px;bottom:-14px;width:2px;border-radius:2px;background:#E2E8F0}
.ui-steps__item--done:not(:last-child)::before{background:#A7F3D0}
.ui-steps__mark{position:absolute;left:0;top:0;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:#E2E8F0;color:#64748B}
.ui-steps__item--current .ui-steps__mark{background:#2563EB;color:#fff}
.ui-steps__item--done .ui-steps__mark{background:#059669;color:#fff}
.ui-steps__head{display:flex;align-items:center;gap:8px;min-height:26px;margin-bottom:4px}
.ui-steps__num{font-size:11px;font-weight:700;color:#64748B;letter-spacing:.02em}
.ui-steps__done{display:inline-flex;font-size:11px;font-weight:700;color:#047857;background:#ECFDF5;border:1px solid #A7F3D0;padding:1px 7px;border-radius:99px}
.ui-steps__note{font-size:11px;font-weight:600;color:#64748B}
.ui-steps__future-title{margin:0;font-size:12.5px;font-weight:700;color:#64748B}
.ui-steps__action{display:inline-flex;align-items:center;justify-content:center;margin-left:auto;border:0;background:transparent;color:#2563EB;font-size:12.5px;font-weight:600;cursor:pointer;padding:5px 8px;border-radius:6px;font-family:inherit}
.ui-steps__action:focus-visible{outline:2px solid #2563EB;outline-offset:1px}
.ui-steps__action:disabled{opacity:.55;cursor:not-allowed}
`;

export function StepList({ label, steps }: { readonly label: string; readonly steps: readonly StepItem[] }) {
  return (
    <ol className="ui-steps" aria-label={label}>
      <style>{STEPS_CSS}</style>
      {steps.map((step, index) => (
        <li
          key={step.key}
          className={`ui-steps__item ui-steps__item--${step.state}`}
          data-step={index + 1}
          aria-current={step.state === "current" ? "step" : undefined}
        >
          <span className="ui-steps__mark" aria-hidden="true">
            {step.state === "done" ? <Check size={14} aria-hidden="true" focusable="false" /> : index + 1}
          </span>
          <div className="ui-steps__head">
            <span className="ui-steps__num">{step.heading}</span>
            {step.state === "done" && step.doneLabel ? (
              <span className="ui-steps__done">
                {step.doneLabel}
                <span className="sr-only">, etapa concluída</span>
              </span>
            ) : null}
            {step.state === "future" && step.futureNote ? <span className="ui-steps__note">{step.futureNote}</span> : null}
            {step.state === "done" ? step.action : null}
          </div>
          {step.state === "future" && step.futureTitle ? <p className="ui-steps__future-title">{step.futureTitle}</p> : null}
          <div className="ui-steps__body" hidden={step.state === "future"}>
            {step.children}
          </div>
        </li>
      ))}
    </ol>
  );
}
