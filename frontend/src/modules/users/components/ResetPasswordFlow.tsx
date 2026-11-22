import type { CSSProperties } from "react";

import { Alert, Button, Modal } from "../../../components/ui";
import { usePasswordReset } from "../usePasswordReset";
import type { User, UsersApiContext } from "../users.types";
import { TemporaryPasswordDialog } from "./TemporaryPasswordDialog";

// B-APP-ORG-2S (S3, plano 1.8.3 §2.3) — "Redefinir senha": confirmar → o servidor gera a provisória → o diálogo a mostra
// UMA vez → fechar descarta o valor (`dismiss` do hook). Carregando, erro (frase fixa por motivo) e sem permissão.
// O gatilho é o botão "Redefinir senha" do diálogo "Editar usuário" (`UserFormModal`, Emenda 1.8.3.4).

const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function ResetPasswordFlow({
  user,
  context,
  onClose,
}: {
  readonly user: User;
  readonly context: UsersApiContext;
  readonly onClose: () => void;
}) {
  const { state, reset, dismiss } = usePasswordReset(context);

  function close() {
    dismiss();
    onClose();
  }

  if (state.status === "revealed") {
    return (
      <TemporaryPasswordDialog
        userName={user.name}
        temporaryPassword={state.temporaryPassword}
        affectedPatios={state.affectedPatios}
        onClose={close}
      />
    );
  }

  const loading = state.status === "loading";
  return (
    <Modal title="Redefinir senha" open onClose={close}>
      {state.status === "error" ? (
        <div role="alert">
          <Alert title="Não foi possível redefinir" tone="danger">
            {state.message}
          </Alert>
        </div>
      ) : null}
      <p>
        Redefinir a senha de <strong>{user.name}</strong>? A senha atual deixa de valer, as sessões abertas são encerradas e o
        sistema gera uma senha provisória para você entregar.
      </p>
      <footer style={footerStyle}>
        <Button type="button" variant="ghost" onClick={close} disabled={loading}>
          Cancelar
        </Button>
        <Button type="button" variant="danger" onClick={() => void reset(user.id)} disabled={loading}>
          {loading ? "Redefinindo…" : "Redefinir senha"}
        </Button>
      </footer>
    </Modal>
  );
}
