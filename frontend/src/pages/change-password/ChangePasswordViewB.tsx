import { PasswordStrengthMeter, RequirementChecklist, type RequirementItem, type RequirementStatus } from "../../components/ui";
import { newPasswordRuleChecks } from "../../modules/auth/auth.adapter";
import {
  ChangePasswordBaseStyles,
  ChangePasswordCard,
  ChangePasswordFieldBlock,
  ChangePasswordSubmit,
  type ChangePasswordViewModel,
  type ChangePasswordViewProps,
} from "./ChangePasswordViewA";

// B-USERS-ACESSO-SEG (T1) — aparência B · Com guia (referência `screen-refs/troca-senha-3opcoes.reference.html`): os
// requisitos da nova senha se marcam enquanto a pessoa digita, com a MESMA regra do servidor (`newPasswordRuleChecks`),
// e um medidor de força que é só visual (não bloqueia e não é regra). A lista ocupa o lugar da dica. Registrada no menu de
// aparência (D-TELAS-SAEM-COM-TRES); a sessão restrita abre sempre na A (Emenda 4, item 3). A lista e o medidor são da
// biblioteca (`RequirementChecklist`, `PasswordStrengthMeter`; Emenda 6, item 1).

export type PasswordRequirementKey = "length" | "email" | "current" | "confirm";

export const PASSWORD_REQUIREMENTS: readonly { readonly key: PasswordRequirementKey; readonly label: string }[] = [
  { key: "length", label: "Pelo menos 8 caracteres" },
  { key: "email", label: "Diferente do seu e-mail" },
  { key: "current", label: "Diferente da senha provisória" },
  { key: "confirm", label: "Confirmação igual à nova senha" },
];

/** Estado de cada requisito (a mesma leitura da referência); depois de tentar salvar, o pendente vira "não atendido". */
export function evaluatePasswordRequirements(
  values: ChangePasswordViewModel["values"],
  email: string,
  attempted: boolean,
): readonly RequirementItem[] {
  const { next, current, confirm } = values;
  const rules = newPasswordRuleChecks(next, current, email);
  const raw: Readonly<Record<PasswordRequirementKey, RequirementStatus>> = {
    length: rules.longEnough ? "met" : "pending",
    email: !next ? "pending" : rules.differsFromEmail ? "met" : "unmet",
    current: !next || !current ? "pending" : rules.differsFromCurrent ? "met" : "unmet",
    confirm: !confirm ? "pending" : confirm === next ? "met" : confirm.length >= next.length ? "unmet" : "pending",
  };

  return PASSWORD_REQUIREMENTS.map((requirement) => {
    const status = raw[requirement.key];
    return { key: requirement.key, label: requirement.label, status: attempted && status === "pending" ? "unmet" : status };
  });
}

export function ChangePasswordViewB({ model }: ChangePasswordViewProps) {
  const prefix = "wb";
  const guideId = `${prefix}-guia`;

  return (
    <main data-aparencia="B" className="troca-senha">
      <ChangePasswordBaseStyles />
      <ChangePasswordCard model={model} idPrefix={prefix}>
        <ChangePasswordFieldBlock model={model} idPrefix={prefix} field="current" invalid={model.invalidCurrent} />
        <ChangePasswordFieldBlock
          model={model}
          idPrefix={prefix}
          field="next"
          describedBy={guideId}
          after={<PasswordStrengthMeter password={model.values.next} />}
        />
        <ChangePasswordFieldBlock model={model} idPrefix={prefix} field="confirm" last describedBy={guideId} />
        <RequirementChecklist
          id={guideId}
          title="Requisitos da nova senha"
          items={evaluatePasswordRequirements(model.values, model.email, model.attempted)}
        />
        <ChangePasswordSubmit model={model} />
      </ChangePasswordCard>
    </main>
  );
}
