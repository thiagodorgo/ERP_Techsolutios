import { AlertTriangle, Clock, Eye, Info } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Switch } from "../../../components/ui";
import {
  ORGANIZATION_VIEW_DESCRIPTION,
  ORGANIZATION_VIEW_ROLE,
  hasOrganizationView,
  interpretOrganizationViewError,
  organizationViewEffect,
  organizationViewSessionNote,
  profileRoles,
  roleLabel,
  type OrganizationViewFeedback,
} from "../users.adapter";
import { setOrganizationView } from "../users.service";
import type { User, UsersApiContext } from "../users.types";

// B-USERS-CONCESSAO-PAINEL (F5b) — o controle "Visão da organização" da opção A aprovada (interruptor: um clique salva;
// PUT liga, DELETE desliga) e o selo da linha. Tela-modelo: a própria tela de Usuários de hoje (Q3 = (a) do dono); as 3
// aparências da tela inteira vêm no bloco próprio `B-APAR-USUARIOS`. Quem pode usar o controle é a tela que decide
// (`users:grant_organization_view`); o servidor continua sendo a autoridade (403 vira frase).

const BOX: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const BOX_ON: CSSProperties = { ...BOX, borderColor: "#9fd8ee", background: "#f4fbfe" };
const INFO: CSSProperties = { display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: "#334155", lineHeight: 1.45 };
const INFO_LINE: CSSProperties = { display: "flex", gap: 7, alignItems: "flex-start", margin: 0 };
const INFO_ICON: CSSProperties = { flexShrink: 0, marginTop: 2, color: "#64748b" };
const ERROR_BOX: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  padding: "8px 10px",
  border: "1px solid #fca5a5",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
};
const BADGE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10.5,
  fontWeight: 700,
  color: "#0b6f96",
  background: "#e6f6fc",
  border: "1px solid #9fd8ee",
  padding: "1px 7px",
  borderRadius: 6,
  whiteSpace: "nowrap",
  lineHeight: 1.4,
};

/** O selo da linha (nunca um chip de perfil). O texto ao passar o ponteiro diz o efeito para aquele perfil. */
export function OrganizationViewBadge({ roles }: { readonly roles: readonly string[] }) {
  const effect = organizationViewEffect(roles, true);
  return (
    <span className="pat-ov-badge" style={BADGE} title={`${roleLabel(ORGANIZATION_VIEW_ROLE)}: ${effect}`} data-selo="visao-da-organizacao">
      <Eye size={11} aria-hidden="true" />
      {roleLabel(ORGANIZATION_VIEW_ROLE)}
    </span>
  );
}

export type OrganizationViewControlProps = {
  readonly user: User;
  readonly context: UsersApiContext;
  /** O próprio usuário da sessão (muda o texto: "você não precisa entrar de novo"). */
  readonly isSelf: boolean;
  /** A situação mostrada veio de uma carga que depois falhou ao atualizar. */
  readonly stale?: boolean;
  readonly onSaved: (user: User, granted: boolean) => void;
};

export function OrganizationViewControl({ user, context, isSelf, stale = false, onSaved }: OrganizationViewControlProps) {
  const current = hasOrganizationView(user.roles);
  const [pending, setPending] = useState<boolean | null>(null);
  const [failure, setFailure] = useState<{ readonly granted: boolean; readonly feedback: OrganizationViewFeedback } | null>(null);
  const shown = pending ?? current;
  const descriptionId = `ov-desc-${user.id}`;

  async function save(granted: boolean) {
    setPending(granted);
    setFailure(null);
    try {
      const saved = await setOrganizationView(context, user.id, granted);
      const roles = saved ? saved.roles : granted ? [...profileRoles(user.roles), ORGANIZATION_VIEW_ROLE] : profileRoles(user.roles);
      onSaved(saved ?? { ...user, roles }, granted);
    } catch (error) {
      setFailure({ granted, feedback: interpretOrganizationViewError(error) });
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={shown ? BOX_ON : BOX} data-controle="visao-da-organizacao">
      <Switch
        checked={shown}
        busy={pending !== null}
        onToggle={() => void save(!current)}
        title="Visão da organização"
        icon={<Eye size={14} aria-hidden="true" />}
        description={ORGANIZATION_VIEW_DESCRIPTION}
        descriptionId={descriptionId}
      />
      <div style={INFO}>
        <p style={INFO_LINE}>
          <Info size={13} aria-hidden="true" style={INFO_ICON} />
          <span>{organizationViewEffect(user.roles, shown)}</span>
        </p>
        <p style={INFO_LINE}>
          <Clock size={13} aria-hidden="true" style={INFO_ICON} />
          <span>{organizationViewSessionNote(isSelf)}</span>
        </p>
        {stale ? (
          <p style={INFO_LINE}>
            <AlertTriangle size={13} aria-hidden="true" style={INFO_ICON} />
            <span>A situação mostrada vem da última carga; ao salvar, vale a resposta do servidor.</span>
          </p>
        ) : null}
      </div>
      {failure ? (
        <div role="alert" style={ERROR_BOX}>
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{failure.feedback.message}</span>
          {failure.feedback.retryable ? (
            <button type="button" className="pat-link" onClick={() => void save(failure.granted)}>
              Tentar de novo
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
