import { useState } from "react";

import { PasswordInput } from "../../../../components/ui";
import { errorText } from "../billing-ops.errors";
import { environmentLabel, providerKindLabel } from "../billing-ops.labels";
import type { CredentialKind, Provider } from "../billing-ops.types";
import type { BillingOpsActions } from "../useBillingOpsActions";
import { DialogFrame, NoticeBox, type Notice } from "./dialog.shared";

// B-ASS-10c-OPERACAO · R-SEGREDO — trocar a credencial do provedor. O segredo:
//  - é digitado num `PasswordInput` (campo de senha), com `autoComplete="off"`;
//  - vive SÓ no estado desta janela: nunca em armazenamento do navegador, URL, estado global nem log;
//  - é LIMPO do estado depois do sucesso (a janela continua aberta, para colar o próximo, com o campo vazio) e some com a
//    janela ao fechar; a tela mostra depois só o final que o servidor devolver na releitura;
//  - o certificado é lido do arquivo SÓ no envio (o arquivo não fica guardado; a senha vai no mesmo envio).

type Props = {
  readonly provider: Provider;
  readonly webhook: boolean;
  readonly actions: BillingOpsActions;
  readonly onClose: () => void;
  readonly onDone: () => void;
};

const KIND_LABEL: Readonly<Record<CredentialKind, string>> = { api_token: "Chave de acesso", webhook_secret: "Segredo do aviso automático", certificate: "Certificado digital A1" };

/** O arquivo em base64, lido só na hora do envio. */
async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function CredentialDialog({ provider, webhook, actions, onClose, onDone }: Props) {
  const kinds: CredentialKind[] = provider.kind === "invoice" ? ["api_token", "webhook_secret", "certificate"] : ["api_token", "webhook_secret"];
  const [kind, setKind] = useState<CredentialKind>(webhook ? "webhook_secret" : "api_token");
  const [secret, setSecret] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const valid = kind === "certificate" ? file !== null && secret.length >= 1 : secret.length >= 8;

  const submit = async () => {
    if (!valid || sending) return;
    setSending(true);
    setNotice(null);
    const result =
      kind === "certificate" && file
        ? await actions.saveCredential(provider.provider, { kind: "certificate", pfxBase64: await fileToBase64(file), password: secret })
        : await actions.saveCredential(provider.provider, kind === "webhook_secret" ? { kind: "webhook_secret", secret } : { kind: "api_token", secret });
    setSending(false);
    if (result.ok) {
      setSecret("");
      setFile(null);
      setNotice({ tone: "ok", title: "Credencial salva.", detail: "O campo foi limpo e o segredo não volta a aparecer: a tela mostra só o final." });
      onDone();
    } else {
      setNotice({ tone: "danger", title: "O servidor recusou. Nada foi salvo.", detail: errorText(result.reason) });
    }
  };

  const close = () => {
    setSecret("");
    setFile(null);
    onClose();
  };

  return (
    <DialogFrame
      title="Trocar credencial"
      onClose={close}
      busy={sending}
      footer={
        <>
          <button type="button" className="pat-btn" onClick={close} disabled={sending}>
            Fechar
          </button>
          <button type="button" className="pat-btn pat-btn--primary" onClick={() => void submit()} disabled={sending} aria-disabled={!valid ? "true" : undefined} data-confirmar="">
            {sending ? "Enviando…" : "Salvar credencial"}
          </button>
        </>
      }
    >
      <p className="cb-dialog__text">
        {providerKindLabel(provider.kind)} · {provider.label} · {environmentLabel(provider.environment)}
      </p>
      <label className="ui-field">
        <span>Tipo</span>
        <select className="ui-input" value={kind} onChange={(event) => setKind(event.currentTarget.value as CredentialKind)} disabled={sending}>
          {kinds.map((item) => (
            <option key={item} value={item}>
              {KIND_LABEL[item]}
            </option>
          ))}
        </select>
      </label>
      {kind === "certificate" ? (
        <label className="ui-field">
          <span>Arquivo do certificado</span>
          <input className="ui-input" type="file" accept=".pfx,.p12" onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)} />
          <small>O arquivo é lido só no envio e não fica guardado na tela.</small>
        </label>
      ) : null}
      <PasswordInput
        label={kind === "certificate" ? "Senha do certificado" : `${KIND_LABEL[kind]} *`}
        autoComplete="off"
        spellCheck={false}
        value={secret}
        onChange={(event) => setSecret(event.currentTarget.value)}
        data-autofoco=""
        data-campo="segredo"
      />
      <small style={{ fontSize: 11.5, color: "#64748b" }}>Copie do painel do provedor. Depois de salvo, ele não volta a aparecer: a tela mostra só o final.</small>
      <NoticeBox notice={notice} />
    </DialogFrame>
  );
}
