import { Shield } from "lucide-react";
import { useEffect, useState } from "react";

import { buildMembersPut, initiallyCheckedMembers, isScheduledMember, membersChanged, membersPostconditionHolds, toggleMember, type MembersChange } from "../cloud-billing.groups";
import { formatDay } from "../cloud-billing.labels";
import { getEconomicGroup, getTenantOverview } from "../cloud-billing.service";
import type { EconomicGroupDetail } from "../cloud-billing.types";
import { CloseButton, DialogFrame, NoticeBox, Sending, type DialogProps, type Notice, type Phase } from "./dialog.shared";

// B-ASS-10b (T5) · janela "Editar membros" e a regra R-GRP (plano v2 §6.4.2; Emenda 1, A1-r2). O `PUT …/members` troca o
// conjunto INTEIRO a partir de `validFrom`, sem versão (B8). Por isso:
//  (i)   a caixa abre com TODO membro sem fim marcado, vigente e agendado (o agendado com "entra em <data>") — diferença
//        autorizada da maquete, que marcava só os de hoje;
//  (ii)  o `change` vem das AÇÕES do usuário (marcar, desmarcar), nunca do estado final da caixa;
//  (iii) o agendado não pode ser desmarcado na tela (`P-ASS10B-CANCELAR-AGENDADO`);
// o conjunto enviado sai de `buildMembersPut` sobre o grupo lido DE NOVO imediatamente antes de gravar; se ele mudou
// desde a abertura, a janela não grava; e a resposta tem de trazer todo id enviado, sem fim. UMA escrita por confirmação.

type Option = { readonly tenantId: string; readonly tenantName: string };

const SAME_TIME = "Outra pessoa mudou este grupo agora. Confira a lista e tente de novo.";

export function GroupMembersDialog({ model, actions, onClose, onDone, groupId }: DialogProps & { readonly groupId: string }) {
  const [detail, setDetail] = useState<EconomicGroupDetail | null>(null);
  const [options, setOptions] = useState<readonly Option[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [change, setChange] = useState<MembersChange>({ add: [], remove: [] });
  const [validFrom, setValidFrom] = useState(model.today);
  const [phase, setPhase] = useState<Phase>("form");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [group, tenants] = await Promise.all([getEconomicGroup(groupId), getTenantOverview(model.currentMonth)]);
        if (!alive) return;
        const byId = new Map<string, Option>();
        for (const line of tenants.lines) byId.set(line.tenantId, { tenantId: line.tenantId, tenantName: line.tenantName });
        for (const member of group.members) if (!byId.has(member.tenantId)) byId.set(member.tenantId, { tenantId: member.tenantId, tenantName: member.tenantName });
        setOptions([...byId.values()].sort((a, b) => a.tenantName.localeCompare(b.tenantName, "pt-BR")));
        setDetail(group);
      } catch {
        if (alive) setLoadFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [groupId, model.currentMonth]);

  const initial = new Set(detail ? initiallyCheckedMembers(detail.members) : []);
  const isChecked = (tenantId: string) => (initial.has(tenantId) && !change.remove.includes(tenantId)) || change.add.includes(tenantId);

  function hint(tenantId: string): string {
    const member = detail?.members.find((item) => item.tenantId === tenantId && item.validTo === null);
    if (member && (member.scheduled || member.validFrom > model.today)) return `entra em ${formatDay(member.validFrom)}; o cancelamento do agendamento ainda não é feito pela tela`;
    const leaving = detail?.members.find((item) => item.tenantId === tenantId && item.validTo !== null);
    if (leaving) return `sai em ${formatDay(leaving.validTo)}`;
    if (member) return "no grupo";
    const other = model.currentGroupByTenant[tenantId];
    return other && other.groupId !== groupId ? `hoje no ${other.groupName}` : "sem grupo";
  }

  async function confirm() {
    if (phase !== "form" || !detail) return;
    if (!validFrom || validFrom < model.today) {
      setFieldError(`A data não pode ser anterior a hoje (${formatDay(model.today)}): os meses passados não mudam.`);
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
      setNotice({ tone: "danger", title: "Não foi possível reler o grupo antes de gravar.", detail: "Nada foi gravado. Tente de novo." });
      return;
    }
    // Edição simultânea (§6.4.2.3): o grupo mudou desde que a janela abriu → não grava e recarrega.
    if (membersChanged(detail.members, fresh.members)) {
      setDetail(fresh);
      setChange({ add: [], remove: [] });
      setPhase("form");
      setNotice({ tone: "danger", title: SAME_TIME });
      return;
    }
    const plan = buildMembersPut(fresh.members, change, validFrom, model.today);
    if (!plan.ok) {
      setPhase("form");
      if (plan.reason === "sem_mudanca") setNotice({ tone: "info", title: "Nada mudou.", detail: "Marque ou desmarque uma organização para salvar." });
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
      if (result.reason === "tenant_in_another_group") setNotice({ tone: "danger", title: "Uma organização marcada já está em outro grupo nessa data.", detail: "Uma organização fica em um grupo só. Tire-a do outro grupo primeiro." });
      else if (result.reason === "membership_conflict") setNotice({ tone: "danger", title: SAME_TIME });
      else if (result.reason === "membership_retroactive" || result.reason === "invalid_valid_from") setFieldError(`A data não pode ser anterior a hoje (${formatDay(model.today)}).`);
      else if (result.reason === "platform_organization") setNotice({ tone: "danger", title: "A organização da plataforma não entra em grupo." });
      else if (result.reason === "too_many_members") setNotice({ tone: "danger", title: "O grupo passaria de 500 organizações." });
      else if (result.reason === "group_not_found" || result.reason === "tenant_not_found") setNotice({ tone: "danger", title: "O grupo ou uma organização não existe mais.", detail: "Feche a janela; a tela relê a lista." });
      else if (result.reason === "sem_permissao") setNotice({ tone: "danger", title: "Seu perfil não administra grupos." });
      else setNotice({ tone: "danger", title: "Não foi possível salvar os vínculos.", detail: "Nada mudou. Tente de novo." });
      return;
    }
    setPhase("final");
    // A caixa passa a mostrar o grupo que o SERVIDOR devolveu (quem entrou aparece "no grupo", não mais "sem grupo";
    // achado do aceite na base real, F11).
    setDetail(result.value);
    setChange({ add: [], remove: [] });
    // Pós-condição (§6.4.2.4): todo id enviado está na resposta, sem fim; senão, aviso e releitura.
    if (!membersPostconditionHolds(plan.body.tenantIds, result.value.members)) {
      setNotice({ tone: "warning", title: "O servidor não confirmou todos os vínculos.", detail: "A tela vai reler o grupo; confira a lista." });
    } else {
      setNotice({ tone: "ok", title: `Vínculos salvos a partir de ${formatDay(plan.body.validFrom)}.`, detail: "Meses anteriores não mudam; cada mês usa o grupo do último dia do mês." });
    }
    onDone();
  }

  const groupName = detail?.name ?? model.groups.find((group) => group.id === groupId)?.name ?? "grupo";
  return (
    <DialogFrame
      title={`Membros · ${groupName}`}
      onClose={onClose}
      size="lg"
      footer={
        phase === "final" ? (
          <CloseButton onClose={onClose} />
        ) : (
          <>
            <CloseButton onClose={onClose} label="Cancelar" />
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => void confirm()} disabled={phase === "sending" || !detail}>
              Salvar
            </button>
          </>
        )
      }
    >
      {loadFailed ? (
        <NoticeBox notice={{ tone: "danger", title: "Não foi possível carregar o grupo.", detail: "Feche a janela e tente de novo." }} />
      ) : !detail ? (
        <Sending text="Carregando o grupo…" />
      ) : (
        <>
          <div className="cb-dialog__section">Organizações no grupo a partir da data abaixo</div>
          <div className="cb-dialog__checks">
            {options.map((option) => {
              const scheduled = isScheduledMember(detail.members, option.tenantId) || detail.members.some((member) => member.tenantId === option.tenantId && member.validTo === null && member.validFrom > model.today);
              return (
                <label key={option.tenantId} className="cb-dialog__check">
                  <input
                    type="checkbox"
                    checked={isChecked(option.tenantId)}
                    disabled={phase !== "form" || scheduled}
                    data-membro={option.tenantId}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setChange((current) => toggleMember(current, option.tenantId, checked, initial.has(option.tenantId)));
                    }}
                  />
                  <span>
                    {option.tenantName}
                    <small>{hint(option.tenantId)}</small>
                  </span>
                </label>
              );
            })}
          </div>
          <label className="ui-field">
            <span>Vale a partir de</span>
            <input className="ui-input" type="date" min={model.today} value={validFrom} aria-invalid={fieldError !== null} disabled={phase !== "form"} onChange={(event) => setValidFrom(event.currentTarget.value)} data-desde="" />
            <small>A mudança vale de hoje ({formatDay(model.today)}) em diante; os meses passados não mudam. Uma organização fica em um grupo só.</small>
            {fieldError ? <span className="form-error" role="alert">{fieldError}</span> : null}
          </label>
        </>
      )}
      <div className="ui-alert ui-alert--info cb-notice">
        <Shield size={16} aria-hidden="true" />
        <span>
          <b>Só a plataforma vê o grupo.</b> Ele serve para cobrança e para a visão de custo; não dá a uma filial acesso aos dados de outra.
        </span>
      </div>
      {phase === "sending" ? <Sending text="Salvando os vínculos…" /> : null}
      <NoticeBox notice={notice} />
    </DialogFrame>
  );
}
