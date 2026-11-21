import { ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";

import { enableChecklist } from "../billing-ops.errors";
import { environmentLabel, providerKindLabel } from "../billing-ops.labels";
import type { Provider } from "../billing-ops.types";
import type { BillingOpsActions } from "../useBillingOpsActions";
import { ActionDialog } from "./dialog.shared";

// B-ASS-10c-OPERACAO · R-LIGAR — ligar o canal é ATO DO DONO. O botão só habilita com o texto digitado IDÊNTICO a
// `<provedor>:<ambiente>` (sem aparar espaço, sem ignorar caixa); o corpo é `{ confirm }`. Se o servidor recusar
// (`enable_preconditions_failed`), cada condição vira uma linha do checklist; código que a tela não conhece vira a linha
// genérica. Em produção, o aviso forte. A tela nunca liga sozinha: nem teste, nem semente, nem agente.

type Props = {
  readonly provider: Provider;
  readonly actions: BillingOpsActions;
  /** O servidor está com a cobrança desligada (sabido por uma recusa recente); `null` = não sei. */
  readonly serverOff: boolean | null;
  readonly now: Date;
  readonly onClose: () => void;
  readonly onDone: () => void;
};

const THIRTY_MINUTES = 30 * 60 * 1000;

/**
 * As condições que a TELA consegue conferir no que já leu do canal, para o caso de a recusa não trazer a lista do servidor
 * (o cliente de API de hoje não repassa `details.failed[]`: pendência `P-API-CLIENT-DETAILS-DESCARTADO`, decisão do orquestrador de 20/11 de não mexer no cliente). O servidor
 * continua sendo quem decide; esta lista só explica a recusa.
 */
export function derivedEnableFailures(provider: Provider, serverOff: boolean | null, now: Date): string[] {
  const failed: string[] = [];
  if (serverOff) failed.push("channel_disabled_by_env");
  if (!provider.credentials.some((item) => item.kind === "api_token") || provider.credentialsReadable === false) failed.push("api_token_not_readable");
  if (!provider.lastTest || provider.lastTest.ok !== true) failed.push("last_test_required");
  else if (provider.lastTest.environment !== null && provider.lastTest.environment !== provider.environment) failed.push("last_test_environment_mismatch");
  else {
    const at = Date.parse(provider.lastTest.at);
    if (!Number.isFinite(at) || now.getTime() - at > THIRTY_MINUTES) failed.push("last_test_expired");
  }
  if (!provider.credentials.some((item) => item.kind === "webhook_secret")) failed.push("webhook_not_registered_for_environment");
  if (provider.kind === "invoice" && !provider.fiscalDataComplete) failed.push("fiscal_data_incomplete");
  return failed;
}

export function EnableDialog({ provider, actions, serverOff, now, onClose, onDone }: Props) {
  const expected = `${provider.provider}:${provider.environment}`;
  const [typed, setTyped] = useState("");
  const [failures, setFailures] = useState<readonly string[] | null>(null);
  const [fromServer, setFromServer] = useState(false);
  const matches = typed === expected;
  return (
    <ActionDialog
      title="Ligar o canal"
      confirmLabel="Ligar"
      valid={matches}
      form={
        <>
          <p className="cb-dialog__text">
            Ligar <b>{providerKindLabel(provider.kind).toLocaleLowerCase("pt-BR")}</b> com <b>{provider.label}</b> em <b>{environmentLabel(provider.environment).toLocaleLowerCase("pt-BR")}</b>. A partir daí,{" "}
            {provider.kind === "payment" ? "as cobranças" : "as notas"} passam a sair para o provedor.
          </p>
          {provider.environment === "production" ? (
            <div className="pat-banner pat-banner--error" role="alert" data-aviso-forte="">
              <XCircle size={16} aria-hidden="true" />
              <span>
                <b>Isto passa a cobrar clientes de verdade.</b>
              </span>
            </div>
          ) : null}
          <label className="ui-field">
            <span>
              Para confirmar, digite <span className="cb-dialog__echo">{expected}</span>
            </span>
            <input className="ui-input pat-mono" autoComplete="off" spellCheck={false} value={typed} onChange={(event) => setTyped(event.currentTarget.value)} data-autofoco="" data-campo="confirma" />
            <small>Igual, letra por letra: maiúsculas e espaços contam.</small>
          </label>
          {failures ? (
            <div className="ui-alert ui-alert--danger cb-notice" role="alert" data-checklist="">
              <XCircle size={16} aria-hidden="true" />
              <div>
                <b>{fromServer ? "O servidor não ligou. Falta:" : "O servidor não ligou. Pela leitura do canal que a tela tem, falta:"}</b>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {enableChecklist(failures).map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </ul>
                {!fromServer ? (
                  <small style={{ display: "block", marginTop: 6 }}>
                    Esta lista é a leitura do canal que a tela já tem, não a lista da recusa do servidor; o servidor confere também a configuração dele.
                  </small>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="ui-alert ui-alert--info cb-notice">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              <b>Ligar é um ato do dono.</b> O servidor confere, antes: cobrança liberada na configuração dele, chave legível, teste de menos de 30 minutos neste ambiente, aviso automático registrado e dados fiscais completos.
            </span>
          </div>
        </>
      }
      onSubmit={() => actions.enableProvider(provider.provider, typed)}
      onSuccess={() => ({ message: `${providerKindLabel(provider.kind)} ligado. A tela vai reler o canal.` })}
      onRefusal={(reason, failed) => {
        if (reason !== "enable_preconditions_failed") return "final";
        setFromServer(failed !== undefined);
        const list = failed ?? derivedEnableFailures(provider, serverOff, now);
        setFailures(list.length ? list : ["desconhecido"]);
        return "form-quiet";
      }}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
