import { useEffect, useState } from "react";

import { buildMembersPut, membersChanged, membersPostconditionHolds } from "../cloud-billing.groups";
import { formatDay } from "../cloud-billing.labels";
import { getEconomicGroup } from "../cloud-billing.service";
import type { EconomicGroupDetail } from "../cloud-billing.types";
import { CloseButton, DialogFrame, NoticeBox, Sending, type DialogProps, type Notice, type Phase } from "./dialog.shared";

// B-ASS-10b (T5) · janela "Mudar de grupo" (plano v2 §6.4.2.6), sempre UMA escrita:
//  - organização SEM grupo → escolhe um grupo: 1 `PUT` no grupo de destino (o conjunto dele + ela);
//  - organização EM um grupo → "Sem grupo": 1 `PUT` no grupo atual (o conjunto dele − ela);
//  - de um grupo para OUTRO: a janela não oferece (a troca numa operação é `P-ASS10B-TROCA-DE-GRUPO-ATOMICA`, B8).
// O conjunto vem do grupo lido ao escolher e de novo antes de gravar (R-GRP); se mudou, não grava.

const SAME_TIME = "Outra pessoa mudou este grupo agora. Confira a lista e tente de novo.";

export function MoveGroupDialog({ model, actions, onClose, onDone, tenantId }: DialogProps & { readonly tenantId: string }) {
  const line = model.lines.find((item) => item.tenantId === tenantId);
  const tenantName = line?.tenantName ?? "Organização";
  // O grupo de HOJE, fixado ao abrir: depois de salvar a tela relê o mês e o modelo muda; a janela continua a mostrar
  // a operação feita, sem virar a oposta (achado do aceite na base real, F11).
  const [current] = useState(() => model.currentGroupByTenant[tenantId] ?? null);
  const groupsReady = model.scheduled !== "loading";
  const [target, setTarget] = useState<string>(current ? "" : "");
  const [detail, setDetail] = useState<EconomicGroupDetail | null>(null);
  const [validFrom, setValidFrom] = useState(model.today);
  const [phase, setPhase] = useState<Phase>("form");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  // O grupo que a escrita vai tocar: o atual (para sair) ou o escolhido (para entrar).
  const groupId = current ? current.groupId : target || null;

  useEffect(() => {
    let alive = true;
    setDetail(null);
    if (!groupId) return;
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

  async function confirm() {
    if (phase !== "form" || !groupId || !detail) {
      if (!current && !target) setFieldError("Escolha um grupo.");
      return;
    }
    if (!validFrom || validFrom < model.today) {
      setFieldError(`A data não pode ser anterior a hoje (${formatDay(model.today)}).`);
      return;
    }
    setFieldError(null);
    setNotice(null);
    setPhase("sending");
    let fresh: EconomicGroupDetail;
    try {
      fresh = await getEconomicGroup(groupId);
    } catch {
      setPhase("form");
      setNotice({ tone: "danger", title: "Não foi possível reler o grupo antes de gravar.", detail: "Nada foi gravado." });
      return;
    }
    if (membersChanged(detail.members, fresh.members)) {
      setDetail(fresh);
      setPhase("form");
      setNotice({ tone: "danger", title: SAME_TIME });
      return;
    }
    const change = current ? { add: [], remove: [tenantId] } : { add: [tenantId], remove: [] };
    const plan = buildMembersPut(fresh.members, change, validFrom, model.today);
    if (!plan.ok) {
      setPhase("form");
      if (plan.reason === "sem_mudanca") setNotice({ tone: "info", title: "Nada mudou." });
      else if (plan.reason === "data_passada") setFieldError(`A data não pode ser anterior a hoje (${formatDay(model.today)}).`);
      else if (plan.reason === "saida_marcada") {
        const name = fresh.members.find((member) => member.tenantId === plan.tenantId)?.tenantName ?? "Uma organização";
        setFieldError(`${name} tem saída marcada para ${formatDay(plan.minDate)}. Escolha uma data a partir de ${formatDay(plan.minDate)}.`);
      }
      return;
    }
    const result = await actions.putMembers(groupId, plan.body);
    if (!result.ok) {
      setPhase("form");
      if (result.reason === "tenant_in_another_group") setNotice({ tone: "danger", title: `${tenantName} já está em outro grupo nessa data.`, detail: "Uma organização fica em um grupo só. Tire-a do grupo atual primeiro." });
      else if (result.reason === "membership_conflict") setNotice({ tone: "danger", title: SAME_TIME });
      else if (result.reason === "membership_retroactive" || result.reason === "invalid_valid_from") setFieldError(`A data não pode ser anterior a hoje (${formatDay(model.today)}).`);
      else if (result.reason === "platform_organization") setNotice({ tone: "danger", title: "A organização da plataforma não entra em grupo." });
      else if (result.reason === "sem_permissao") setNotice({ tone: "danger", title: "Seu perfil não administra grupos." });
      else setNotice({ tone: "danger", title: "Não foi possível mudar o grupo.", detail: "Nada mudou. Tente de novo." });
      return;
    }
    setPhase("final");
    if (!membersPostconditionHolds(plan.body.tenantIds, result.value.members)) setNotice({ tone: "warning", title: "O servidor não confirmou todos os vínculos.", detail: "A tela vai reler o grupo." });
    else setNotice({ tone: "ok", title: current ? `${tenantName} sai de ${current.groupName} a partir de ${formatDay(plan.body.validFrom)}.` : `${tenantName} entra no grupo a partir de ${formatDay(plan.body.validFrom)}.`, detail: "Meses anteriores não mudam." });
    onDone();
  }

  return (
    <DialogFrame
      title={`Mudar de grupo · ${tenantName}`}
      onClose={onClose}
      footer={
        phase === "final" ? (
          <CloseButton onClose={onClose} />
        ) : (
          <>
            <CloseButton onClose={onClose} label="Cancelar" />
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => void confirm()} disabled={phase === "sending" || !groupsReady || (groupId !== null && !detail)}>
              Salvar
            </button>
          </>
        )
      }
    >
      {!groupsReady ? (
        <Sending text="Carregando os grupos…" />
      ) : (
        <>
          <label className="ui-field">
            <span>Grupo</span>
            <select className="ui-input" value={current ? "" : target} disabled={phase !== "form"} onChange={(event) => setTarget(event.currentTarget.value)} data-grupo-sel="">
              {current ? (
                <option value="">Sem grupo</option>
              ) : (
                <>
                  <option value="">Escolha um grupo</option>
                  {model.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {current ? (
              <small data-explica="">
                Hoje em {current.groupName}. Uma organização fica em um grupo só. Para passar a outro grupo, tire-a do grupo atual e depois inclua no novo a partir da mesma data.
              </small>
            ) : (
              <small>Hoje sem grupo.</small>
            )}
          </label>
          <label className="ui-field">
            <span>Vale a partir de</span>
            <input className="ui-input" type="date" min={model.today} value={validFrom} aria-invalid={fieldError !== null} disabled={phase !== "form"} onChange={(event) => setValidFrom(event.currentTarget.value)} data-desde="" />
            <small>A mudança vale de hoje ({formatDay(model.today)}) em diante; os meses passados não mudam.</small>
            {fieldError ? <span className="form-error" role="alert">{fieldError}</span> : null}
          </label>
        </>
      )}
      {phase === "sending" ? <Sending text="Salvando o vínculo…" /> : null}
      <NoticeBox notice={notice} />
    </DialogFrame>
  );
}
