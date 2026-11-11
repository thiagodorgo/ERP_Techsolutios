import { Check } from "lucide-react";

import {
  ChangePasswordBaseStyles,
  ChangePasswordCard,
  ChangePasswordHint,
  ChangePasswordInput,
  ChangePasswordSubmit,
  FIELD_LABELS,
  type ChangePasswordViewProps,
} from "./ChangePasswordViewA";

// B-USERS-ACESSO-SEG (T1) — aparência C · Em duas etapas (referência `screen-refs/troca-senha-3opcoes.reference.html`):
// primeiro a provisória, depois a nova. A etapa 1 não consulta o servidor (não existe rota que confira só a provisória):
// "Continuar" só exige o campo preenchido, e o resumo diz "informada", não "confirmada". Provisória errada aparece no fim
// (401): a tela reabre a etapa 1 com a faixa, apaga a provisória e mantém a nova senha já digitada (o contêiner faz isso).
// A tela real abre na etapa 1 (a maquete abre a "Inicial" na 2 porque preenche a provisória de exemplo; diário, L5).
// Registrada no menu de aparência; a sessão restrita abre sempre na A (Emenda 4, item 3). O indicador de etapas nasce aqui
// porque o PERMITIDO do bloco não tem a biblioteca (diário, leitura L4).

const STEPS_CSS = `
.troca-senha .c-etapas{list-style:none;margin:0 0 24px;padding:0}
.troca-senha .c-etapa{position:relative;padding-left:40px}
.troca-senha .c-etapa+.c-etapa{margin-top:18px}
.troca-senha .c-etapa:not(:last-child)::before{content:"";position:absolute;left:12px;top:32px;bottom:-14px;width:2px;border-radius:2px;background:#E2E8F0}
.troca-senha .c-etapa--feita:not(:last-child)::before{background:#A7F3D0}
.troca-senha .c-marca{position:absolute;left:0;top:0;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:#E2E8F0;color:#64748B}
.troca-senha .c-etapa--atual .c-marca{background:#2563EB;color:#fff}
.troca-senha .c-etapa--feita .c-marca{background:#059669;color:#fff}
.troca-senha .c-cab{display:flex;align-items:center;gap:8px;min-height:26px;margin-bottom:4px}
.troca-senha .c-num{font-size:11px;font-weight:700;color:#64748B;letter-spacing:.02em}
.troca-senha .c-feita{display:inline-flex;font-size:11px;font-weight:700;color:#047857;background:#ECFDF5;border:1px solid #A7F3D0;padding:1px 7px;border-radius:99px}
.troca-senha .c-pend{font-size:11px;font-weight:600;color:#64748B}
.troca-senha .c-alterar{display:inline-flex;align-items:center;justify-content:center;margin-left:auto;border:0;background:transparent;color:#2563EB;font-size:12.5px;font-weight:600;cursor:pointer;padding:5px 8px;border-radius:6px;font-family:inherit}
.troca-senha .c-alterar:focus-visible{outline:2px solid #2563EB;outline-offset:1px}
.troca-senha .c-alterar:disabled{opacity:.55;cursor:not-allowed}
.troca-senha .c-tit{display:block;font-size:12.5px;font-weight:700;color:#374151;margin-bottom:6px}
.troca-senha .c-etapa--futura .c-tit{color:#64748B;margin-bottom:0}
.troca-senha .c-etapa--feita .lg-input{padding-top:9px;padding-bottom:9px;font-size:13px}
.troca-senha .c-etapa--feita .lg-olho{width:30px;height:30px}
.troca-senha .c-conf{margin-top:16px}
.troca-senha .c-dica{margin-bottom:0}
`;

export function ChangePasswordViewC({ model }: ChangePasswordViewProps) {
  const prefix = "wc";
  const atStep1 = model.step === 1;
  const disabled = model.submitting || model.locked;

  return (
    <main data-aparencia="C" className="troca-senha">
      <ChangePasswordBaseStyles />
      <style>{STEPS_CSS}</style>
      <ChangePasswordCard model={model} idPrefix={prefix}>
        <ol className="c-etapas" aria-label="Etapas da troca de senha">
          <li className={atStep1 ? "c-etapa c-etapa--atual" : "c-etapa c-etapa--feita"} data-etapa="1" aria-current={atStep1 ? "step" : undefined}>
            <span className="c-marca" aria-hidden="true">
              {atStep1 ? "1" : <Check size={14} aria-hidden="true" focusable="false" />}
            </span>
            <div className="c-cab">
              <span className="c-num">Etapa 1 de 2</span>
              {atStep1 ? null : (
                <>
                  <span className="c-feita">
                    informada<span className="sr">, etapa concluída</span>
                  </span>
                  <button type="button" className="c-alterar" disabled={disabled} aria-label="Alterar a senha provisória" onClick={model.onEditCurrent}>
                    Alterar
                  </button>
                </>
              )}
            </div>
            <label className="c-tit" htmlFor={`${prefix}-current`}>
              {FIELD_LABELS.current}
            </label>
            <ChangePasswordInput model={model} idPrefix={prefix} field="current" readOnly={!atStep1} invalid={model.invalidCurrent} />
          </li>
          <li className={atStep1 ? "c-etapa c-etapa--futura" : "c-etapa c-etapa--atual"} data-etapa="2" aria-current={atStep1 ? undefined : "step"}>
            <span className="c-marca" aria-hidden="true">
              2
            </span>
            <div className="c-cab">
              <span className="c-num">Etapa 2 de 2</span>
              {atStep1 ? <span className="c-pend">{model.values.next ? "preenchida" : "depois da etapa 1"}</span> : null}
            </div>
            <label className="c-tit" htmlFor={`${prefix}-next`}>
              {FIELD_LABELS.next}
            </label>
            <div className="c-corpo" hidden={atStep1}>
              <ChangePasswordInput model={model} idPrefix={prefix} field="next" describedBy={`${prefix}-dica`} />
              <div className="lg-campo lg-campo--ultimo c-conf">
                <label className="lg-rotulo" htmlFor={`${prefix}-confirm`}>
                  {FIELD_LABELS.confirm}
                </label>
                <ChangePasswordInput model={model} idPrefix={prefix} field="confirm" />
              </div>
              <ChangePasswordHint id={`${prefix}-dica`} className="lg-dica c-dica" />
            </div>
          </li>
        </ol>
        {atStep1 ? (
          <button type="submit" className="lg-btn" disabled={disabled}>
            <span>Continuar</span>
          </button>
        ) : (
          <ChangePasswordSubmit model={model} />
        )}
      </ChangePasswordCard>
    </main>
  );
}
