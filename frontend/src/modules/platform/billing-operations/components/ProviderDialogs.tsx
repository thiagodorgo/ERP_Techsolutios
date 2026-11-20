import { KeyRound, XCircle } from "lucide-react";
import { useState } from "react";

import { environmentLabel, fiscalFieldLabel, providerKindLabel } from "../billing-ops.labels";
import type { Environment, Provider } from "../billing-ops.types";
import type { BillingOpsActions } from "../useBillingOpsActions";
import { ActionDialog, Summary } from "./dialog.shared";

// B-ASS-10c-OPERACAO — ambiente e dados fiscais do provedor (`PUT /providers/:p`) e desligar o canal (confirmação forte,
// emenda 1 E2). Segredo NUNCA vai em dado fiscal (o servidor recusa com `secret_in_settings`); a janela lembra isso.

type Props = { readonly provider: Provider; readonly actions: BillingOpsActions; readonly onClose: () => void; readonly onDone: () => void };

/** Os campos de texto que a janela edita: os que o provedor já tem e os que faltam (o `missing[]` do servidor). */
function editableFields(provider: Provider): string[] {
  const keys = new Set<string>(provider.missing);
  for (const [key, value] of Object.entries(provider.settings)) if (typeof value === "string") keys.add(key);
  return [...keys];
}

export function ProviderSettingsDialog({ provider, actions, onClose, onDone }: Props) {
  const [environment, setEnvironment] = useState<Environment>(provider.environment);
  const fields = editableFields(provider);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((key) => [key, typeof provider.settings[key] === "string" ? String(provider.settings[key]) : ""])));
  const settings = () => {
    const next: Record<string, string | number | boolean> = { ...provider.settings };
    for (const key of fields) {
      const value = (values[key] ?? "").trim();
      if (value) next[key] = value;
      else delete next[key];
    }
    return next;
  };
  return (
    <ActionDialog
      title="Ambiente e dados fiscais"
      confirmLabel="Salvar"
      valid
      form={
        <>
          <p className="cb-dialog__text">
            {providerKindLabel(provider.kind)} · {provider.label}
          </p>
          <fieldset className="ui-field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Ambiente</legend>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["sandbox", "production"] as const).map((item) => (
                <label key={item} className="cb-dialog__check" style={{ minWidth: 160 }}>
                  <input type="radio" name="ambiente" value={item} checked={environment === item} onChange={() => setEnvironment(item)} data-autofoco={item === provider.environment ? "" : undefined} />
                  <span>{environmentLabel(item)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {fields.length ? (
            fields.map((key) => (
              <label key={key} className="ui-field">
                <span>
                  {fiscalFieldLabel(key)}
                  {provider.missing.includes(key) ? <span style={{ color: "#b45309" }}> · falta</span> : null}
                </span>
                <input className="ui-input" value={values[key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.currentTarget.value }))} autoComplete="off" />
              </label>
            ))
          ) : (
            <p className="cb-dialog__text">Este provedor não pede dado fiscal.</p>
          )}
          <div className="ui-alert ui-alert--info cb-notice">
            <KeyRound size={16} aria-hidden="true" />
            <span>
              <b>Segredo não vai aqui.</b> Chave, senha e certificado ficam em “Trocar credencial”.
            </span>
          </div>
          {environment === "production" ? (
            <div className="pat-banner pat-banner--error" role="alert">
              <XCircle size={16} aria-hidden="true" />
              <span>Produção cobra clientes de verdade. A troca só vale depois de testar e ligar de novo.</span>
            </div>
          ) : null}
        </>
      }
      onSubmit={() => actions.saveProviderSettings(provider.provider, { environment, settings: settings() })}
      onSuccess={() => ({ message: "Dados salvos. A tela vai reler o canal." })}
      onRefusal={() => "form"}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

/** Desligar o canal: confirmação forte (emenda 1, E2) — o nome do provedor na janela e um botão que só habilita depois de conferir. */
export function DisableDialog({ provider, actions, onClose, onDone }: Props) {
  const [checked, setChecked] = useState(false);
  const summary = (
    <Summary
      items={[
        { label: "Tipo", value: providerKindLabel(provider.kind) },
        { label: "Provedor", value: provider.label },
        { label: "Ambiente", value: environmentLabel(provider.environment) },
      ]}
    />
  );
  return (
    <ActionDialog
      title="Desligar o canal"
      danger
      twoStep
      confirmLabel="Desligar"
      valid
      reviewValid={checked}
      form={
        <>
          {summary}
          <p className="cb-dialog__text">
            Desligar <b>{providerKindLabel(provider.kind).toLocaleLowerCase("pt-BR")}</b> ({provider.label}).{" "}
            {provider.kind === "payment" ? "Cobranças novas deixam de sair; as já enviadas continuam valendo no provedor." : "Notas novas ficam na fila até religar."}
          </p>
        </>
      }
      review={
        <>
          {summary}
          <label className="cb-dialog__check">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.currentTarget.checked)} data-autofoco="" />
            <span>
              Conferi: desligar <b>{provider.label}</b> em <b>{environmentLabel(provider.environment).toLocaleLowerCase("pt-BR")}</b>
            </span>
          </label>
        </>
      }
      onSubmit={() => actions.disableProvider(provider.provider)}
      onSuccess={() => ({ message: `${providerKindLabel(provider.kind)} desligado. A tela vai reler o canal.` })}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
