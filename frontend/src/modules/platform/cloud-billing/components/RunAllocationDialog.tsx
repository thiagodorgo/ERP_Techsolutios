import { AlertTriangle, Play } from "lucide-react";
import { useState } from "react";

import { capitalize, formatDateTime, monthLabel, monthName } from "../cloud-billing.labels";
import { CloseButton, DialogFrame, NoticeBox, Sending, Summary, type DialogProps, type Notice, type Phase } from "./dialog.shared";

// B-ASS-10b (T5) · janela "Rodar rateio do mês" (plano v2 §6.4). O corpo é o período do MÊS DA TELA
// (`periodForMonth`, dentro de `useCloudBillingActions`), sem `importId`: o servidor usa o arquivo que vale no mês. O
// rateio anterior fica no histórico. Sem arquivo no mês, a janela avisa que o rateio vai rodar vazio (como na maquete).

export function RunAllocationDialog({ model, actions, onClose, onDone }: DialogProps) {
  const [phase, setPhase] = useState<Phase>("form");
  const [notice, setNotice] = useState<Notice | null>(null);
  const month = monthLabel(model.month);
  const completedImports = (model.imports ?? []).filter((item) => item.status === "completed");
  const current = completedImports[0] ?? null;
  const lastRun = model.runs[0] ?? null;

  async function confirm() {
    if (phase !== "form") return;
    setPhase("sending");
    setNotice(null);
    const result = await actions.runAllocation(model.month);
    if (!result.ok) {
      setPhase("form");
      if (result.reason === "import_not_completed") setNotice({ tone: "danger", title: "O arquivo do mês ainda não terminou de importar.", detail: "Espere a importação concluir e rode de novo." });
      else if (result.reason === "sem_permissao") setNotice({ tone: "danger", title: "Seu perfil só consulta os rateios." });
      else setNotice({ tone: "danger", title: "O rateio falhou.", detail: "O servidor respondeu com erro; o rateio anterior continua valendo. Tente de novo." });
      return;
    }
    const run = result.value;
    setPhase("final");
    if (run.status === "completed") setNotice({ tone: "ok", title: `Rateio de ${monthName(model.month)} concluído.`, detail: "A tela relê os números; o rateio anterior fica no histórico." });
    else if (run.status === "failed") setNotice({ tone: "danger", title: `O rateio de ${monthName(model.month)} terminou com falha.`, detail: "O rateio anterior continua valendo." });
    else setNotice({ tone: "info", title: `Rateio de ${monthName(model.month)} em processamento.`, detail: "A tela mostra quando ele concluir." });
    onDone();
  }

  return (
    <DialogFrame
      title="Rodar rateio do mês"
      onClose={onClose}
      footer={
        phase === "final" ? (
          <CloseButton onClose={onClose} />
        ) : (
          <>
            <CloseButton onClose={onClose} label="Cancelar" />
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => void confirm()} disabled={phase === "sending"} data-autofoco="">
              <Play size={13} aria-hidden="true" />
              Rodar rateio de {monthName(model.month)}
            </button>
          </>
        )
      }
    >
      <Summary
        items={[
          { label: "Mês", value: capitalize(month) },
          { label: "Arquivo que vale", value: model.imports === null ? "—" : current ? formatDateTime(current.importedAt ?? current.createdAt) : "nenhum" },
          { label: "Último rateio", value: lastRun ? `${formatDateTime(lastRun.startedAt ?? lastRun.createdAt)}${lastRun.status === "completed" ? "" : " · não concluído"}` : "—" },
        ]}
      />
      <p className="cb-dialog__text">O rateio refaz a divisão do custo de {month} entre as organizações, com o arquivo que vale no mês. O rateio anterior fica no histórico, e a tela passa a usar o novo.</p>
      {model.imports !== null && !current ? (
        <div className="ui-alert ui-alert--warning cb-notice">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            <b>O mês não tem arquivo de custo.</b> O rateio vai rodar vazio. Importe o arquivo do mês primeiro.
          </span>
        </div>
      ) : null}
      {phase === "sending" ? <Sending text={`Rodando o rateio de ${monthName(model.month)}…`} /> : null}
      <NoticeBox notice={notice} />
    </DialogFrame>
  );
}
