import { Lock } from "lucide-react";
import { useState } from "react";

import { StatusPill } from "../../../../components/patterns";
import { formatDateTime, monthLabel, monthName } from "../cloud-billing.labels";
import { asRate, formatRate, parseRatePtBr, rateEcho, sameRate } from "../cloud-billing.money";
import { CloseButton, DialogFrame, NoticeBox, Sending, type DialogProps, type Notice, type Phase } from "./dialog.shared";

// B-ASS-10b (T5) · janela "Dólar do mês" e a regra R-FX (plano v2 §6.4.1). O servidor recusa "5,41" e ACEITA "541" (que
// multiplicaria por 100 todo o custo em reais do mês): a janela converte pelo `parseRatePtBr` (o separador é TROCADO
// por ponto, nunca retirado), mostra ANTES de salvar o eco "1 dólar = R$ <a taxa que vai no corpo>", não envia o que não
// passa, e confere DEPOIS que a taxa gravada é a enviada (`sameRate`); se não for, mostra erro, não fecha e relê o mês.
// Sem `platform:billing:manage`, a janela abre só o histórico (§6.4.3).

export function FxRateDialog({ model, access, actions, onClose, onDone }: DialogProps) {
  const [text, setText] = useState(() => (model.fx?.rate ? formatRate(model.fx.rate, 6) : ""));
  const [phase, setPhase] = useState<Phase>("form");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const parsed = parseRatePtBr(text);
  const month = monthLabel(model.month);
  const history = [...(model.fx?.history ?? [])].sort((a, b) => b.version - a.version);

  async function confirm() {
    if (phase !== "form" || !access.manageBilling) return;
    if (!parsed.ok) {
      setFieldError(parsed.reason === "zero" ? "O dólar tem de ser maior que zero." : "Digite um número maior que zero e menor que 1.000, com até 6 casas decimais (ex.: 5,412300).");
      return;
    }
    setFieldError(null);
    setNotice(null);
    setPhase("sending");
    const sent = parsed.rate;
    const result = await actions.saveFxRate(model.month, sent);
    if (!result.ok) {
      setPhase("form");
      if (result.reason === "rate_invalid") setNotice({ tone: "danger", title: "O servidor recusou a taxa.", detail: "Digite um número maior que zero e menor que 1.000, com até 6 casas decimais." });
      else if (result.reason === "fx_month_in_future") setNotice({ tone: "danger", title: "Não dá para cadastrar o dólar de um mês que ainda não começou.", detail: "Escolha um mês até o corrente." });
      else if (result.reason === "currency_pair_unsupported") setNotice({ tone: "danger", title: "O servidor não aceita esse par de moedas." });
      else if (result.reason === "sem_permissao") setNotice({ tone: "danger", title: "Seu perfil só consulta o dólar." });
      else setNotice({ tone: "danger", title: "Não foi possível salvar o dólar.", detail: "Nada mudou. Tente de novo." });
      return;
    }
    const stored = result.value.current.rate;
    // Pós-condição (R-FX 3): a taxa gravada tem de ser a enviada; senão, erro, a janela não fecha e o mês é relido.
    if (stored === null || !sameRate(sent, stored)) {
      setPhase("form");
      setNotice({ tone: "danger", title: "O servidor gravou um dólar diferente do enviado.", detail: `Enviado: ${rateEcho(sent)}; gravado: ${formatRate(stored, 6)}. Confira o histórico antes de usar os números do mês.` });
      onDone();
      return;
    }
    setPhase("final");
    setNotice({ tone: "ok", title: `Dólar de ${monthName(model.month)} salvo: ${formatRate(asRate(stored), 6)} (versão ${result.value.current.version}).`, detail: "Custo e margem do mês passam a usar a versão nova." });
    onDone();
  }

  return (
    <DialogFrame
      title={`Dólar do mês · ${month}`}
      onClose={onClose}
      footer={
        phase === "final" || !access.manageBilling ? (
          <CloseButton onClose={onClose} />
        ) : (
          <>
            <CloseButton onClose={onClose} label="Cancelar" />
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => void confirm()} disabled={phase === "sending"}>
              Salvar nova versão
            </button>
          </>
        )
      }
    >
      {access.manageBilling ? (
        <label className="ui-field">
          <span>Quanto valia 1 dólar em reais neste mês</span>
          <input
            className="ui-input pat-mono"
            inputMode="decimal"
            value={text}
            aria-invalid={fieldError !== null}
            disabled={phase !== "form"}
            onChange={(event) => {
              setText(event.currentTarget.value);
              setFieldError(null);
            }}
            data-taxa=""
          />
          <small>
            Use a <b>cotação da fatura da AWS</b> de {monthName(model.month)}, com até 6 casas. Corrigir cria uma versão nova; as anteriores ficam no histórico, e cada mês mostra qual versão usou.
          </small>
          {parsed.ok ? (
            <span className="cb-dialog__echo" data-eco="">
              1 dólar = R$ {rateEcho(parsed.rate)}
            </span>
          ) : null}
          {fieldError ? <span className="form-error" role="alert">{fieldError}</span> : null}
        </label>
      ) : (
        <div className="ui-alert ui-alert--info cb-notice">
          <Lock size={16} aria-hidden="true" />
          <span>
            <b>Seu perfil só consulta o dólar.</b> Quem corrige é quem administra a cobrança da plataforma.
          </span>
        </div>
      )}
      <div className="cb-dialog__section">Histórico de {month}</div>
      {history.length ? (
        <table className="cb-dialog__table">
          <thead>
            <tr>
              <th>Versão</th>
              <th>Dólar</th>
              <th>Cadastrado em</th>
            </tr>
          </thead>
          <tbody>
            {history.map((version) => (
              <tr key={version.version}>
                <td>
                  {version.version} {version.version === model.fx?.version ? <StatusPill sm label="vale" bg="#ECFDF5" fg="#047857" /> : null}
                </td>
                <td className="pat-mono">{formatRate(version.rate, 6)}</td>
                <td>{formatDateTime(version.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="pat-ab-detail-note">Nenhuma taxa cadastrada para este mês.</div>
      )}
      {phase === "sending" ? <Sending text="Salvando a nova versão…" /> : null}
      <NoticeBox notice={notice} />
    </DialogFrame>
  );
}
