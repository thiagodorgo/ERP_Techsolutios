import { useEffect, useState } from "react";

import { StatusPill } from "../../../../components/patterns";
import { formatDay } from "../cloud-billing.labels";
import { getEconomicGroupHistory } from "../cloud-billing.service";
import type { GroupMember } from "../cloud-billing.types";
import { CloseButton, DialogFrame, NoticeBox, Sending, type DialogProps } from "./dialog.shared";

// B-ASS-10b (T5) · janela "Histórico do grupo" (plano v2 §6.3): `GET /economic-groups/:id/history`, lido ao abrir —
// todas as linhas do grupo, inclusive as fechadas e as agendadas. Só leitura.

export function GroupHistoryDialog({ model, onClose, groupId }: DialogProps & { readonly groupId: string }) {
  const [rows, setRows] = useState<readonly GroupMember[] | null>(null);
  const [failed, setFailed] = useState(false);
  const groupName = model.groups.find((group) => group.id === groupId)?.name ?? "grupo";

  useEffect(() => {
    let alive = true;
    void getEconomicGroupHistory(groupId)
      .then((value) => {
        if (alive) setRows([...value].sort((a, b) => a.validFrom.localeCompare(b.validFrom) || a.tenantName.localeCompare(b.tenantName, "pt-BR")));
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [groupId]);

  function situation(member: GroupMember) {
    if (member.validFrom > model.today) return <StatusPill sm label="Agendado" bg="#EFF6FF" fg="#2563EB" />;
    if (member.validTo !== null && member.validTo <= model.today) return <StatusPill sm label="Encerrado" bg="#F1F5F9" fg="#64748B" />;
    if (member.validTo !== null) return <StatusPill sm label={`Sai em ${formatDay(member.validTo)}`} bg="#FFFBEB" fg="#B45309" />;
    return <StatusPill sm label="Vigente" bg="#ECFDF5" fg="#047857" />;
  }

  return (
    <DialogFrame title={`Histórico · ${groupName}`} onClose={onClose} footer={<CloseButton onClose={onClose} />} size="lg">
      {failed ? (
        <NoticeBox notice={{ tone: "danger", title: "Não foi possível carregar o histórico.", detail: "Feche a janela e tente de novo." }} />
      ) : rows === null ? (
        <Sending text="Carregando o histórico…" />
      ) : rows.length ? (
        <table className="cb-dialog__table">
          <thead>
            <tr>
              <th>Organização</th>
              <th>Entrou</th>
              <th>Saiu</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((member, index) => (
              <tr key={`${member.tenantId}-${member.validFrom}-${index}`}>
                <td>{member.tenantName}</td>
                <td>{formatDay(member.validFrom)}</td>
                <td>{member.validTo ? formatDay(member.validTo) : "—"}</td>
                <td>{situation(member)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="pat-ab-detail-note">O grupo ainda não teve organizações.</div>
      )}
      <div className="pat-ab-detail-note">Cada mês usa o grupo do último dia do mês. Uma saída fecha o vínculo no dia anterior à data informada.</div>
    </DialogFrame>
  );
}
