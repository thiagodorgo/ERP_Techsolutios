import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import { getEconomicGroup } from "../cloud-billing.service";
import type { EconomicGroupDetail } from "../cloud-billing.types";
import { CloseButton, DialogFrame, NoticeBox, Sending, type DialogProps, type Notice, type Phase } from "./dialog.shared";

// B-ASS-10b (T5) · janela "Excluir grupo" (plano v2 §6.4.2.7). Com membro vigente ou agendado (lido ao abrir), a janela
// só explica, como na maquete. Sem membros, confirma e faz UMA escrita (`DELETE`, exclusão lógica que guarda o histórico).
// A confirmação do grupo vazio é diferença autorizada da maquete (§9.3, item 6).

export function DeleteGroupDialog({ model, actions, onClose, onDone, groupId }: DialogProps & { readonly groupId: string }) {
  const [detail, setDetail] = useState<EconomicGroupDetail | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [notice, setNotice] = useState<Notice | null>(null);
  const groupName = detail?.name ?? model.groups.find((group) => group.id === groupId)?.name ?? "grupo";

  useEffect(() => {
    let alive = true;
    void getEconomicGroup(groupId)
      .then((value) => {
        if (alive) setDetail(value);
      })
      .catch(() => {
        if (alive) setNotice({ tone: "danger", title: "Não foi possível carregar o grupo.", detail: "Feche a janela e tente de novo." });
      });
    return () => {
      alive = false;
    };
  }, [groupId]);

  const hasMembers = (detail?.members.length ?? 0) > 0;

  async function confirm() {
    if (phase !== "form" || !detail || hasMembers) return;
    setPhase("sending");
    setNotice(null);
    const result = await actions.deleteGroup(groupId);
    if (!result.ok) {
      setPhase("form");
      if (result.reason === "group_has_members") setNotice({ tone: "danger", title: "Este grupo tem organizações.", detail: "Tire as organizações do grupo antes de excluir." });
      else if (result.reason === "group_not_found") setNotice({ tone: "danger", title: "O grupo não existe mais." });
      else if (result.reason === "sem_permissao") setNotice({ tone: "danger", title: "Seu perfil não administra grupos." });
      else setNotice({ tone: "danger", title: "Não foi possível excluir o grupo.", detail: "Nada mudou. Tente de novo." });
      return;
    }
    setPhase("final");
    setNotice({ tone: "ok", title: `Grupo “${groupName}” excluído.`, detail: "O histórico do grupo fica guardado." });
    onDone();
  }

  return (
    <DialogFrame
      title="Excluir grupo"
      onClose={onClose}
      footer={
        phase === "final" || hasMembers || !detail ? (
          <CloseButton onClose={onClose} />
        ) : (
          <>
            <CloseButton onClose={onClose} label="Cancelar" />
            <button type="button" className="pat-btn pat-btn--primary cb-btn--danger-solid" onClick={() => void confirm()} disabled={phase === "sending"}>
              Excluir grupo
            </button>
          </>
        )
      }
    >
      {!detail && !notice ? <Sending text="Carregando o grupo…" /> : null}
      {detail && hasMembers ? (
        <div className="ui-alert ui-alert--warning cb-notice">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            <b>Este grupo tem organizações.</b> Tire as organizações do grupo antes de excluir. A exclusão guarda o histórico.
          </span>
        </div>
      ) : null}
      {detail && !hasMembers && phase !== "final" ? <p className="cb-dialog__text">Excluir o grupo “{groupName}”? Ele não tem organizações. O histórico do grupo fica guardado.</p> : null}
      {phase === "sending" ? <Sending text="Excluindo…" /> : null}
      <NoticeBox notice={notice} />
    </DialogFrame>
  );
}
