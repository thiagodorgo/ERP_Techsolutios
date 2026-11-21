import type { ReactNode } from "react";

// Interruptor (B-USERS-CONCESSAO-PAINEL, F5b) — botão nativo com `role="switch"` e `aria-checked`: um clique liga ou
// desliga, e quem salva é a tela (`onToggle`). Mostra o título (com ícone opcional), a descrição ligada por
// `aria-describedby` e o estado em texto ("Ligada", "Desligada", "Salvando…"), nunca só a cor. Alvo de pelo menos 44 px e
// foco visível. Enquanto salva, fica desabilitado com `aria-busy`. Nasceu na opção A da maquete da concessão da visão da
// organização (`telas-3opcoes/users-concede-3opcoes.reference.html`, classes `.ov-toggle`) e mora na biblioteca porque a
// web não tinha interruptor (o do editor de checklist é local; §4 item 3 do CLAUDE.md; registro em COMPONENT_LIBRARY.md).

const SWITCH_CSS = `
.ui-switch{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:8px 12px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;cursor:pointer;text-align:left;color:#0F172A;font:inherit}
.ui-switch:hover:not(:disabled){border-color:#93C5FD}
.ui-switch:focus-visible{outline:2px solid #2563EB;outline-offset:2px}
.ui-switch:disabled{cursor:progress;opacity:.75}
.ui-switch--on{border-color:#93C5FD;background:#EFF6FF}
.ui-switch__track{width:38px;height:22px;border-radius:99px;background:#94A3B8;position:relative;flex-shrink:0;transition:background .15s}
.ui-switch--on .ui-switch__track{background:#2563EB}
.ui-switch__knob{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
.ui-switch--on .ui-switch__knob{left:19px}
.ui-switch__text{flex:1;min-width:0}
.ui-switch__title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800}
.ui-switch__sub{display:block;font-size:11.5px;color:#64748B;margin-top:2px;line-height:1.45}
.ui-switch__state{font-size:11.5px;font-weight:800;color:#64748B;white-space:nowrap}
.ui-switch--on .ui-switch__state{color:#1D4ED8}
@media (prefers-reduced-motion: reduce){.ui-switch__track,.ui-switch__knob{transition:none}}
`;

export type SwitchProps = {
  readonly checked: boolean;
  readonly onToggle: () => void;
  readonly title: string;
  /** Texto da descrição; o id liga o `aria-describedby`. */
  readonly description: string;
  readonly descriptionId: string;
  readonly icon?: ReactNode;
  /** Enquanto salva: desabilitado, `aria-busy` e o estado "Salvando…". */
  readonly busy?: boolean;
  readonly onLabel?: string;
  readonly offLabel?: string;
  readonly busyLabel?: string;
};

export function Switch({
  checked,
  onToggle,
  title,
  description,
  descriptionId,
  icon,
  busy = false,
  onLabel = "Ligada",
  offLabel = "Desligada",
  busyLabel = "Salvando…",
}: SwitchProps) {
  return (
    <>
      <style>{SWITCH_CSS}</style>
      <button
        type="button"
        role="switch"
        className={checked ? "ui-switch ui-switch--on" : "ui-switch"}
        aria-checked={checked}
        aria-describedby={descriptionId}
        aria-busy={busy || undefined}
        disabled={busy}
        onClick={onToggle}
      >
        <span className="ui-switch__track" aria-hidden="true">
          <span className="ui-switch__knob" />
        </span>
        <span className="ui-switch__text">
          <span className="ui-switch__title">
            {icon}
            {title}
          </span>
          <span className="ui-switch__sub" id={descriptionId}>
            {description}
          </span>
        </span>
        <span className="ui-switch__state">{busy ? busyLabel : checked ? onLabel : offLabel}</span>
      </button>
    </>
  );
}
