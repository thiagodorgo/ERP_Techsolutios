import { Circle, CircleCheck, CircleX } from "lucide-react";

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
// aparência (D-TELAS-SAEM-COM-TRES); a sessão restrita abre sempre na A (Emenda 4, item 3). A lista e o medidor nascem
// aqui porque o PERMITIDO do bloco não tem a biblioteca (diário, leitura L4).

export type RequirementStatus = "pending" | "met" | "unmet";

export type PasswordRequirementKey = "length" | "email" | "current" | "confirm";

export const PASSWORD_REQUIREMENTS: readonly { readonly key: PasswordRequirementKey; readonly label: string }[] = [
  { key: "length", label: "Pelo menos 8 caracteres" },
  { key: "email", label: "Diferente do seu e-mail" },
  { key: "current", label: "Diferente da senha provisória" },
  { key: "confirm", label: "Confirmação igual à nova senha" },
];

const STATUS_SUFFIX: Readonly<Record<RequirementStatus, string>> = {
  pending: ": pendente",
  met: ": atendido",
  unmet: ": não atendido",
};

/** Estado de cada requisito (a mesma leitura da referência); depois de tentar salvar, o pendente vira "não atendido". */
export function evaluatePasswordRequirements(
  values: ChangePasswordViewModel["values"],
  email: string,
  attempted: boolean,
): Readonly<Record<PasswordRequirementKey, RequirementStatus>> {
  const { next, current, confirm } = values;
  const rules = newPasswordRuleChecks(next, current, email);
  const raw: Record<PasswordRequirementKey, RequirementStatus> = {
    length: rules.longEnough ? "met" : "pending",
    email: !next ? "pending" : rules.differsFromEmail ? "met" : "unmet",
    current: !next || !current ? "pending" : rules.differsFromCurrent ? "met" : "unmet",
    confirm: !confirm ? "pending" : confirm === next ? "met" : confirm.length >= next.length ? "unmet" : "pending",
  };

  if (!attempted) return raw;

  return {
    length: raw.length === "pending" ? "unmet" : raw.length,
    email: raw.email === "pending" ? "unmet" : raw.email,
    current: raw.current === "pending" ? "unmet" : raw.current,
    confirm: raw.confirm === "pending" ? "unmet" : raw.confirm,
  };
}

export const STRENGTH_LABELS = ["Força: —", "Força: fraca", "Força: razoável", "Força: boa", "Força: forte"] as const;

/** Medidor da referência: tamanho (8 e 12), maiúscula com minúscula, número e símbolo; 0 sem senha, depois de 1 a 4. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
}

const GUIDE_CSS = `
.troca-senha .b-forca{display:flex;align-items:center;gap:10px;margin-top:8px}
.troca-senha .b-forca__barras{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.troca-senha .b-forca__barras i{height:4px;border-radius:99px;background:#E2E8F0}
.troca-senha .b-forca__txt{font-size:12px;font-weight:600;color:#64748B;min-width:96px;text-align:right}
.troca-senha .b-forca[data-nivel="1"] i:nth-child(-n+1){background:#DC2626}.troca-senha .b-forca[data-nivel="1"] .b-forca__txt{color:#B91C1C}
.troca-senha .b-forca[data-nivel="2"] i:nth-child(-n+2){background:#D97706}.troca-senha .b-forca[data-nivel="2"] .b-forca__txt{color:#92400E}
.troca-senha .b-forca[data-nivel="3"] i:nth-child(-n+3){background:#2563EB}.troca-senha .b-forca[data-nivel="3"] .b-forca__txt{color:#1D4ED8}
.troca-senha .b-forca[data-nivel="4"] i{background:#16A34A}.troca-senha .b-forca[data-nivel="4"] .b-forca__txt{color:#166534}
.troca-senha .b-guia{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin:6px 0 24px}
.troca-senha .b-guia__tit{margin:0 0 8px;font-size:12px;font-weight:700;color:#374151}
.troca-senha .b-guia ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.troca-senha .b-req{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:500;color:#64748B;line-height:1.3}
.troca-senha .b-req__ic{display:inline-flex;flex-shrink:0;color:#94A3B8}
.troca-senha .b-req__ic svg{display:block}
.troca-senha .b-req.is-ok{color:#166534}.troca-senha .b-req.is-ok .b-req__ic{color:#16A34A}
.troca-senha .b-req.is-falha{color:#B91C1C}.troca-senha .b-req.is-falha .b-req__ic{color:#DC2626}
`;

function StrengthMeter({ password }: { readonly password: string }) {
  const level = passwordStrength(password);

  return (
    <div className="b-forca" data-nivel={level} aria-hidden="true">
      <div className="b-forca__barras">
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="b-forca__txt">{STRENGTH_LABELS[level]}</span>
    </div>
  );
}

function RequirementIcon({ status }: { readonly status: RequirementStatus }) {
  if (status === "met") return <CircleCheck size={16} aria-hidden="true" focusable="false" />;
  if (status === "unmet") return <CircleX size={16} aria-hidden="true" focusable="false" />;
  return <Circle size={16} aria-hidden="true" focusable="false" />;
}

function RequirementsGuide({ id, model }: { readonly id: string; readonly model: ChangePasswordViewModel }) {
  const statuses = evaluatePasswordRequirements(model.values, model.email, model.attempted);

  return (
    <div className="b-guia" id={id}>
      <p className="b-guia__tit">Requisitos da nova senha</p>
      <ul>
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const status = statuses[requirement.key];
          const tone = status === "met" ? " is-ok" : status === "unmet" ? " is-falha" : "";
          return (
            <li key={requirement.key} className={`b-req${tone}`} data-req={requirement.key} data-status={status}>
              <span className="b-req__ic">
                <RequirementIcon status={status} />
              </span>
              <span>{requirement.label}</span>
              <span className="sr">{STATUS_SUFFIX[status]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChangePasswordViewB({ model }: ChangePasswordViewProps) {
  const prefix = "wb";
  const guideId = `${prefix}-guia`;

  return (
    <main data-aparencia="B" className="troca-senha">
      <ChangePasswordBaseStyles />
      <style>{GUIDE_CSS}</style>
      <ChangePasswordCard model={model} idPrefix={prefix}>
        <ChangePasswordFieldBlock model={model} idPrefix={prefix} field="current" invalid={model.invalidCurrent} />
        <ChangePasswordFieldBlock
          model={model}
          idPrefix={prefix}
          field="next"
          describedBy={guideId}
          after={<StrengthMeter password={model.values.next} />}
        />
        <ChangePasswordFieldBlock model={model} idPrefix={prefix} field="confirm" last describedBy={guideId} />
        <RequirementsGuide id={guideId} model={model} />
        <ChangePasswordSubmit model={model} />
      </ChangePasswordCard>
    </main>
  );
}
