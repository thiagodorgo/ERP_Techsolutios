import { useState } from "react";

import { PasswordInput } from "../../../../components/ui";
import { errorText, GENERIC_ERROR } from "../billing-ops.errors";
import { environmentLabel, providerKindLabel } from "../billing-ops.labels";
import type { CredentialKind, Provider } from "../billing-ops.types";
import type { BillingOpsActions } from "../useBillingOpsActions";
import { DialogFrame, NoticeBox, type Notice } from "./dialog.shared";

// B-ASS-10c-OPERACAO · R-SEGREDO — trocar a credencial do provedor. O segredo:
//  - é digitado num `PasswordInput` (campo de senha), com `autoComplete="off"`;
//  - vive SÓ no estado desta janela: nunca em armazenamento do navegador, URL, estado global nem log;
//  - é LIMPO do estado e do campo logo depois de QUALQUER resposta — sucesso, recusa do servidor ou erro de rede (J-612,
//    C1-02) — e ao fechar a janela. Vale para os 3 ramos: chave de acesso, segredo do aviso e certificado com a senha. A
//    janela continua aberta, com o campo vazio; depois de uma recusa, o segredo é digitado de novo. A tela mostra depois
//    só o final que o servidor devolver na releitura;
//  - o certificado é lido do arquivo SÓ no envio (o arquivo não fica guardado; a senha vai no mesmo envio). O campo do
//    arquivo é recriado ao limpar (`fileKey`), para não guardar a seleção.

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
  const [fileKey, setFileKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const valid = kind === "certificate" ? file !== null && secret.length >= 1 : secret.length >= 8;

  /** Tira o segredo (e o arquivo do certificado) do estado e do campo. */
  const clearSecret = () => {
    setSecret("");
    setFile(null);
    setFileKey((value) => value + 1);
  };

  const submit = async () => {
    if (!valid || sending) return;
    setSending(true);
    setNotice(null);
    let result: Awaited<ReturnType<BillingOpsActions["saveCredential"]>> | null = null;
    try {
      result =
        kind === "certificate" && file
          ? await actions.saveCredential(provider.provider, { kind: "certificate", pfxBase64: await fileToBase64(file), password: secret })
          : await actions.saveCredential(provider.provider, kind === "webhook_secret" ? { kind: "webhook_secret", secret } : { kind: "api_token", secret });
    } catch {
      result = null;
    } finally {
      // Qualquer desfecho limpa: sucesso, recusa, erro de rede ou falha ao ler o arquivo.
      clearSecret();
      setSending(false);
    }
    if (result?.ok) {
      setNotice({ tone: "ok", title: "Credencial salva.", detail: "O campo foi limpo e o segredo não volta a aparecer: a tela mostra só o final." });
      onDone();
    } else if (result) {
      setNotice({ tone: "danger", title: "O servidor recusou. Nada foi salvo.", detail: `${errorText(result.reason)} O campo foi limpo: digite o segredo de novo.` });
    } else {
      setNotice({ tone: "danger", title: "Nada foi salvo.", detail: `${GENERIC_ERROR} O campo foi limpo: digite o segredo de novo.` });
    }
  };

  const close = () => {
    clearSecret();
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
          <input key={fileKey} className="ui-input" type="file" accept=".pfx,.p12" onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)} />
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
