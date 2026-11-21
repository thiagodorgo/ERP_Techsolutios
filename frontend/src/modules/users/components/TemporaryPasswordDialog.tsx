import type { CSSProperties } from "react";
import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

import { Alert, Button, Modal } from "../../../components/ui";
import { TEMPORARY_PASSWORD_GROUP_NOTICE, TEMPORARY_PASSWORD_VALIDITY_NOTICE } from "../users.adapter";

// B-APP-ORG-2S (S3, plano 1.8.3 §2.3) — o diálogo que mostra a senha provisória UMA vez: na criação de usuário e na
// redefinição de senha. O valor chega por prop e não é guardado aqui; quem abriu o diálogo o descarta no `onClose`.
// O aviso do grupo só aparece quando a provisória vale em mais de um pátio (`affected_patios` > 1).

const valueStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-8)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-6)",
  padding: "var(--space-10) var(--space-12)",
  margin: "var(--space-12) 0",
};
const codeStyle: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 700, letterSpacing: "0.04em", wordBreak: "break-all" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const hintStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };

type CopyState = "idle" | "copied" | "failed";

export function TemporaryPasswordDialog({
  userName,
  temporaryPassword,
  affectedPatios = 1,
  onClose,
}: {
  readonly userName: string;
  readonly temporaryPassword: string;
  readonly affectedPatios?: number;
  readonly onClose: () => void;
}) {
  const [copy, setCopy] = useState<CopyState>("idle");

  async function copyPassword() {
    try {
      const clipboard = globalThis.navigator?.clipboard;
      if (!clipboard || typeof clipboard.writeText !== "function") throw new Error("clipboard_unavailable");
      await clipboard.writeText(temporaryPassword);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <Modal title="Senha provisória" open onClose={onClose}>
      <p>
        Entregue esta senha a <strong>{userName}</strong>. Ela aparece só agora: depois de fechar, não dá para ver de novo.
      </p>

      <div style={valueStyle}>
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", minWidth: 0 }}>
          <KeyRound size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <code style={codeStyle} aria-label="Senha provisória">
            {temporaryPassword}
          </code>
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={() => void copyPassword()} aria-label="Copiar a senha provisória">
          {copy === "copied" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copy === "copied" ? "Copiada" : "Copiar"}
        </Button>
      </div>

      <div role="status" aria-live="polite" style={hintStyle}>
        {copy === "copied" ? "Senha copiada." : copy === "failed" ? "Não foi possível copiar. Selecione a senha e copie à mão." : null}
      </div>

      <Alert title="Atenção" tone="warning">
        {TEMPORARY_PASSWORD_VALIDITY_NOTICE}
        {affectedPatios > 1 ? (
          <>
            <br />
            {TEMPORARY_PASSWORD_GROUP_NOTICE}
          </>
        ) : null}
      </Alert>

      <footer style={footerStyle}>
        <Button type="button" onClick={onClose}>
          Fechar
        </Button>
      </footer>
    </Modal>
  );
}
