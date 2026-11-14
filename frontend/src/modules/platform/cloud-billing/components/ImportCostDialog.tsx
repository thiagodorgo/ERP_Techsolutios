import { RefreshCw, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";

import { capitalize, formatDateTime, monthLabel, monthName } from "../cloud-billing.labels";
import { formatCount } from "../cloud-billing.money";
import { CloseButton, DialogFrame, NoticeBox, Sending, Summary, type DialogProps, type Notice, type Phase } from "./dialog.shared";

// B-ASS-10b (T5) · janela "Importar arquivo de custo" (plano v2 §6.4). O servidor aceita até 1.000.000 de caracteres
// (`aws-cur.routes.ts`, 413 `csv_too_large`): a janela confere ANTES de enviar e não envia o que passa disso
// (`P-ASS10B-IMPORTACAO-1MB`, dono `B-ASS-13`). Arquivo de outro mês é importado para o mês dele: a janela avisa e
// oferece o atalho. Linhas repetidas que o servidor pulou aparecem contadas.

export const CSV_LIMIT = 1_000_000;

type Chosen = { readonly name: string; readonly text: string } | { readonly name: string; readonly tooLarge: true };

export function ImportCostDialog({ model, actions, onClose, onDone, onMonth }: DialogProps) {
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [otherMonth, setOtherMonth] = useState<string | null>(null);
  const month = monthLabel(model.month);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    setNotice(null);
    if (!file) {
      setChosen(null);
      return;
    }
    const text = await file.text();
    if (text.length > CSV_LIMIT) {
      setChosen({ name: file.name, tooLarge: true });
      setNotice({ tone: "danger", title: "O arquivo passa de 1 MB.", detail: "Hoje a importação manual aceita até 1 MB por arquivo. Nada será enviado." });
      return;
    }
    setChosen({ name: file.name, text });
  }

  async function confirm() {
    if (phase !== "form") return;
    if (!chosen) {
      setNotice({ tone: "danger", title: "Escolha o arquivo do mês.", detail: "Use o campo acima." });
      return;
    }
    if ("tooLarge" in chosen) {
      setNotice({ tone: "danger", title: "O arquivo passa de 1 MB.", detail: "Hoje a importação manual aceita até 1 MB por arquivo. Nada será enviado." });
      return;
    }
    setPhase("sending");
    setNotice(null);
    const result = await actions.importCsv(chosen.text);
    if (!result.ok) {
      setPhase("form");
      if (result.reason === "csv_too_large") setNotice({ tone: "danger", title: "O arquivo passa de 1 MB.", detail: "Hoje a importação manual aceita até 1 MB por arquivo. Nada foi importado." });
      else if (result.reason === "csv_required") setNotice({ tone: "danger", title: "O arquivo está vazio.", detail: "Nada foi importado." });
      else if (result.reason === "sem_permissao") setNotice({ tone: "danger", title: "Seu perfil não importa arquivo de custo." });
      else setNotice({ tone: "danger", title: "A importação falhou.", detail: `O servidor recusou o arquivo. Nada mudou em ${monthName(model.month)}.` });
      return;
    }
    const imported = result.value;
    const skipped = imported.duplicateRowsSkipped ?? 0;
    const skippedText = skipped > 0 ? ` ${formatCount(skipped)} ${skipped === 1 ? "linha repetida foi ignorada" : "linhas repetidas foram ignoradas"}.` : "";
    if (imported.periodMonth && imported.periodMonth !== model.month) {
      setOtherMonth(imported.periodMonth);
      setNotice({ tone: "warning", title: `O arquivo é de ${monthLabel(imported.periodMonth)}.`, detail: `Ele foi importado para o mês dele; ${month} continua como estava.${skippedText}` });
    } else {
      setNotice({ tone: "ok", title: `Arquivo importado: ${formatCount(imported.rowCount)} linhas de ${month}.`, detail: `O rateio do mês roda sozinho em seguida; a tela relê os números.${skippedText}` });
    }
    setPhase("final");
    onDone();
  }

  const lastRun = model.lastCompletedRun;
  return (
    <DialogFrame
      title="Importar arquivo de custo"
      onClose={onClose}
      footer={
        phase === "final" ? (
          <>
            {otherMonth ? (
              <button type="button" className="pat-btn" onClick={() => { onMonth(otherMonth); onClose(); }}>
                Ver {monthLabel(otherMonth)}
              </button>
            ) : null}
            <CloseButton onClose={onClose} />
          </>
        ) : (
          <>
            <span className="cb-dialog__hint">O mês do rateio é o mês do arquivo.</span>
            <CloseButton onClose={onClose} label="Cancelar" />
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => void confirm()} disabled={phase === "sending"}>
              <Upload size={14} aria-hidden="true" />
              Importar arquivo
            </button>
          </>
        )
      }
    >
      <Summary
        items={[
          { label: "Mês da tela", value: capitalize(month) },
          { label: "Arquivos no mês", value: model.imports === null ? "—" : formatCount(model.imports.length) },
          { label: "Último rateio", value: lastRun ? formatDateTime(lastRun.completedAt ?? lastRun.createdAt) : "—" },
        ]}
      />
      <label className="ui-field">
        <span>Arquivo de custo da AWS (CSV)</span>
        <input className="ui-input" type="file" accept=".csv,text/csv" disabled={phase !== "form"} onChange={(event) => void choose(event)} data-arquivo="" data-autofoco="" />
        <small>
          Envie o <b>arquivo completo do mês</b>, até 1 MB. {chosen ? `Escolhido: ${chosen.name}.` : "Nenhum arquivo escolhido."}
        </small>
      </label>
      <div className="ui-alert ui-alert--info cb-notice">
        <RefreshCw size={16} aria-hidden="true" />
        <span>
          <b>Depois da importação, o rateio do mês roda sozinho.</b> Se o mês já tem um arquivo, o novo passa a valer e nada é somado. O arquivo de outro mês é importado para o mês dele.
        </span>
      </div>
      {phase === "sending" ? <Sending text="Enviando o arquivo…" /> : null}
      <NoticeBox notice={notice} />
    </DialogFrame>
  );
}
