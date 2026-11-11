import { Circle, CircleCheck, CircleX } from "lucide-react";

// Lista de requisitos que se marcam (B-USERS-ACESSO-SEG, T1 · Emenda 6, item 1): cada item é pendente, atendido ou não
// atendido, com ícone E texto para o leitor de tela (a cor nunca é o único sinal). Nasceu na aparência B da troca de senha
// (`screen-refs/troca-senha-3opcoes.reference.html`) e mora na biblioteca porque não havia equivalente (§4 item 3 do
// CLAUDE.md; registro em COMPONENT_LIBRARY.md). Quem calcula o estado de cada item é a tela que a usa.

export type RequirementStatus = "pending" | "met" | "unmet";

export type RequirementItem = {
  readonly key: string;
  readonly label: string;
  readonly status: RequirementStatus;
};

const STATUS_SUFFIX: Readonly<Record<RequirementStatus, string>> = {
  pending: ": pendente",
  met: ": atendido",
  unmet: ": não atendido",
};

const CHECKLIST_CSS = `
.ui-reqs{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin:6px 0 24px}
.ui-reqs__title{margin:0 0 8px;font-size:12px;font-weight:700;color:#374151}
.ui-reqs ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.ui-reqs__item{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:500;color:#64748B;line-height:1.3}
.ui-reqs__icon{display:inline-flex;flex-shrink:0;color:#94A3B8}
.ui-reqs__icon svg{display:block}
.ui-reqs__item.is-ok{color:#166534}.ui-reqs__item.is-ok .ui-reqs__icon{color:#16A34A}
.ui-reqs__item.is-falha{color:#B91C1C}.ui-reqs__item.is-falha .ui-reqs__icon{color:#DC2626}
`;

function StatusIcon({ status }: { readonly status: RequirementStatus }) {
  if (status === "met") return <CircleCheck size={16} aria-hidden="true" focusable="false" />;
  if (status === "unmet") return <CircleX size={16} aria-hidden="true" focusable="false" />;
  return <Circle size={16} aria-hidden="true" focusable="false" />;
}

export function RequirementChecklist({
  id,
  title,
  items,
}: {
  readonly id?: string;
  readonly title: string;
  readonly items: readonly RequirementItem[];
}) {
  return (
    <div className="ui-reqs" id={id}>
      <style>{CHECKLIST_CSS}</style>
      <p className="ui-reqs__title">{title}</p>
      <ul>
        {items.map((item) => {
          const tone = item.status === "met" ? " is-ok" : item.status === "unmet" ? " is-falha" : "";
          return (
            <li key={item.key} className={`ui-reqs__item${tone}`} data-req={item.key} data-status={item.status}>
              <span className="ui-reqs__icon">
                <StatusIcon status={item.status} />
              </span>
              <span>{item.label}</span>
              <span className="sr-only">{STATUS_SUFFIX[item.status]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
