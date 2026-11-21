import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Input, Modal } from "../../../components/ui";
import { GRANT_ACCESS_ACTION_LABEL, interpretAccessGrantError } from "../users.adapter";
import { grantUserAccess } from "../users.service";
import type { User, UsersApiContext } from "../users.types";

// B-APP-ORG-2S (S3, plano 1.7.1 §2.1 e 1.8 §3.1) — "Dar acesso a este login neste pátio". Abre depois da recusa
// `email_in_group` da criação: o e-mail é o da tentativa (só leitura) e o operador confirma o nome. O perfil é fixo no
// servidor (Técnico de Campo) e a senha é a que a pessoa já usa: este pátio não gera senha para um login que já existe.
// Nenhuma frase revela o outro pátio (1.7.2 §2.4).

const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const hintStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const NAME_MAX = 160;

export function AccessGrantDialog({
  email,
  initialName,
  context,
  onClose,
  onGranted,
}: {
  readonly email: string;
  readonly initialName: string;
  readonly context: UsersApiContext;
  readonly onClose: () => void;
  readonly onGranted: (user: User | null) => void;
}) {
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setServerError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Nome é obrigatório.");
      return;
    }
    if (trimmed.length > NAME_MAX) {
      setNameError(`Nome deve ter no máximo ${NAME_MAX} caracteres.`);
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      const user = await grantUserAccess(context, { email, name: trimmed });
      onGranted(user);
    } catch (error) {
      setServerError(interpretAccessGrantError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={GRANT_ACCESS_ACTION_LABEL} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <div role="alert">
            <Alert title="Não foi possível dar acesso" tone="danger">
              {serverError}
            </Alert>
          </div>
        ) : null}

        <p style={hintStyle}>
          O login que já existe no grupo passa a ter acesso a este pátio, com o perfil Técnico de Campo. A pessoa entra com a
          mesma senha que já usa.
        </p>

        <Input id="access-grant-email" label="E-mail" type="email" value={email} readOnly disabled />
        <div>
          <Input
            id="access-grant-name"
            label="Nome neste pátio *"
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            required
            aria-required
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "access-grant-name-error" : undefined}
            onChange={(event) => setName(event.target.value)}
          />
          {nameError ? (
            <small className="form-error" id="access-grant-name-error">
              {nameError}
            </small>
          ) : null}
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Dando acesso…" : "Dar acesso"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
