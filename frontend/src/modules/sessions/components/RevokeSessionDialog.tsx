import type { CSSProperties } from "react";

import { Alert, Button, Modal } from "../../../components/ui";
import { SESSION_REVOKE_CONFIRM } from "../sessions.adapter";
import type { SessionView } from "../sessions.types";

const bodyStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-12)" };
const dlStyle: CSSProperties = { display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--space-4) var(--space-12)", margin: 0, fontSize: "var(--text-sm)" };
const dtStyle: CSSProperties = { color: "var(--text-secondary)", fontWeight: 700 };
const ddStyle: CSSProperties = { margin: 0, color: "var(--text-primary, #0F172A)" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-8)" };

// Confirmação antes de revogar (nunca revoga direto). Mostra o usuário/dispositivo da sessão (§2.8: só o
// rótulo grosseiro, nunca IP/token) e o caveat honesto da janela de ~15 min do access token JWT.
export function RevokeSessionDialog({
  session,
  busy,
  onConfirm,
  onClose,
}: {
  readonly session: SessionView;
  readonly busy: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}) {
  return (
    <Modal title="Revogar sessão" open onClose={onClose}>
      <div style={bodyStyle}>
        <dl style={dlStyle}>
          <dt style={dtStyle}>Usuário</dt>
          <dd style={ddStyle}>{session.userLabel}</dd>
          <dt style={dtStyle}>Dispositivo</dt>
          <dd style={ddStyle}>{session.deviceLabel}</dd>
        </dl>

        <Alert title="Encerramento não é instantâneo" tone="warning">
          {SESSION_REVOKE_CONFIRM}
        </Alert>

        <div style={footerStyle}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Revogando…" : "Revogar sessão"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
