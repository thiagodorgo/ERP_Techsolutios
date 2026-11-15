import { Shield } from "lucide-react";
import { useState } from "react";

import { CloseButton, DialogFrame, NoticeBox, Sending, type DialogProps, type Notice, type Phase } from "./dialog.shared";

// B-ASS-10b (T5) · janelas "Novo grupo econômico" e "Renomear grupo" (plano v2 §6.4.2). Uma escrita por confirmação:
// `POST /economic-groups` ou `PATCH /economic-groups/:id`. Nome de 1 a 120 caracteres; nome repetido → 409.

export function GroupFormDialog({ actions, onClose, onDone, groupId, initialName = "", initialNotes = "" }: DialogProps & { readonly groupId?: string; readonly initialName?: string; readonly initialNotes?: string }) {
  const creating = groupId === undefined;
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes);
  const [phase, setPhase] = useState<Phase>("form");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function confirm() {
    if (phase !== "form") return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 120) {
      setFieldError("Digite um nome de 1 a 120 caracteres.");
      return;
    }
    setFieldError(null);
    setNotice(null);
    setPhase("sending");
    const cleanNotes = notes.trim() ? notes.trim() : null;
    const result = creating ? await actions.createGroup(trimmed, cleanNotes) : await actions.renameGroup(groupId, trimmed, cleanNotes);
    if (!result.ok) {
      setPhase("form");
      if (result.reason === "group_name_exists") setFieldError("Já existe um grupo com esse nome.");
      else if (result.reason === "name_invalid") setFieldError("Digite um nome de 1 a 120 caracteres.");
      else if (result.reason === "group_not_found") setNotice({ tone: "danger", title: "O grupo não existe mais.", detail: "Feche a janela; a tela relê a lista." });
      else if (result.reason === "sem_permissao") setNotice({ tone: "danger", title: "Seu perfil não administra grupos." });
      else setNotice({ tone: "danger", title: "Não foi possível salvar o grupo.", detail: "Nada mudou. Tente de novo." });
      return;
    }
    setPhase("final");
    setNotice(
      creating
        ? { tone: "ok", title: `Grupo “${result.value.name}” criado.`, detail: "Agora escolha as organizações em “Editar membros”, no grupo; ele aparece na lista quando tiver organizações no mês." }
        : { tone: "ok", title: "Nome salvo.", detail: "A lista e o histórico já mostram o nome novo." },
    );
    onDone();
  }

  return (
    <DialogFrame
      title={creating ? "Novo grupo econômico" : "Renomear grupo"}
      onClose={onClose}
      footer={
        phase === "final" ? (
          <CloseButton onClose={onClose} />
        ) : (
          <>
            <CloseButton onClose={onClose} label="Cancelar" />
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => void confirm()} disabled={phase === "sending"}>
              {creating ? "Criar grupo" : "Salvar nome"}
            </button>
          </>
        )
      }
    >
      <label className="ui-field">
        <span>Nome do grupo</span>
        <input className="ui-input" maxLength={120} value={name} aria-invalid={fieldError !== null} disabled={phase !== "form"} onChange={(event) => setName(event.currentTarget.value)} data-nome="" data-autofoco="" />
        <small>De 1 a 120 caracteres. Dois grupos não podem ter o mesmo nome.</small>
        {fieldError ? <span className="form-error" role="alert">{fieldError}</span> : null}
      </label>
      <label className="ui-field">
        <span>Observações</span>
        <textarea className="ui-input" rows={3} value={notes} disabled={phase !== "form"} onChange={(event) => setNotes(event.currentTarget.value)} />
      </label>
      <div className="ui-alert ui-alert--info cb-notice">
        <Shield size={16} aria-hidden="true" />
        <span>
          <b>O grupo junta as organizações de um mesmo cliente.</b> Serve para cobrança e para a visão de custo da plataforma. Ele não dá a uma filial acesso aos dados de outra. A matriz assina pelo grupo.
        </span>
      </div>
      {phase === "sending" ? <Sending text="Salvando…" /> : null}
      <NoticeBox notice={notice} />
    </DialogFrame>
  );
}
