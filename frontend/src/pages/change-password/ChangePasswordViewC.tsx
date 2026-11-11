import { StepList } from "../../components/ui";
import {
  ChangePasswordBaseStyles,
  ChangePasswordCard,
  ChangePasswordField,
  ChangePasswordHint,
  ChangePasswordSubmit,
  FIELD_LABELS,
  type ChangePasswordViewProps,
} from "./ChangePasswordViewA";

// B-USERS-ACESSO-SEG (T1) — aparência C · Em duas etapas (referência `screen-refs/troca-senha-3opcoes.reference.html`):
// primeiro a provisória, depois a nova. A etapa 1 não consulta o servidor (não existe rota que confira só a provisória):
// "Continuar" só exige o campo preenchido, e o resumo diz "informada", não "confirmada". Provisória errada aparece no fim
// (401): a tela reabre a etapa 1 com a faixa, apaga a provisória e mantém a nova senha já digitada (o contêiner faz isso).
// A tela real abre na etapa 1 (a maquete abre a "Inicial" na 2 porque preenche a provisória de exemplo; diário, L5).
// Registrada no menu de aparência; a sessão restrita abre sempre na A (Emenda 4, item 3). O indicador de etapas é o
// `StepList` da biblioteca (Emenda 6, item 1).

const STEPS_SKIN_CSS = `
.troca-senha .ui-steps__item--done .lg-input{padding-top:9px;padding-bottom:9px;font-size:13px}
.troca-senha .ui-steps__item--done .ui-password button{width:30px;height:30px}
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
      <style>{STEPS_SKIN_CSS}</style>
      <ChangePasswordCard model={model} idPrefix={prefix}>
        <StepList
          label="Etapas da troca de senha"
          steps={[
            {
              key: "current",
              state: atStep1 ? "current" : "done",
              heading: "Etapa 1 de 2",
              doneLabel: "informada",
              action: (
                <button type="button" className="ui-steps__action" disabled={disabled} aria-label="Alterar a senha provisória" onClick={model.onEditCurrent}>
                  Alterar
                </button>
              ),
              children: <ChangePasswordField model={model} idPrefix={prefix} field="current" readOnly={!atStep1} invalid={model.invalidCurrent} />,
            },
            {
              key: "next",
              state: atStep1 ? "future" : "current",
              heading: "Etapa 2 de 2",
              futureNote: model.values.next ? "preenchida" : "depois da etapa 1",
              futureTitle: FIELD_LABELS.next,
              children: (
                <>
                  <ChangePasswordField model={model} idPrefix={prefix} field="next" describedBy={`${prefix}-dica`} />
                  <div className="lg-campo lg-campo--ultimo c-conf">
                    <ChangePasswordField model={model} idPrefix={prefix} field="confirm" />
                  </div>
                  <ChangePasswordHint id={`${prefix}-dica`} className="lg-dica c-dica" />
                </>
              ),
            },
          ]}
        />
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
