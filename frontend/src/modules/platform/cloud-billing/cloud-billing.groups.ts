// B-ASS-10b (T5) · R-GRP (plano v2 §6.4.2; Emenda 1, A1-r2) — de onde vem o conjunto do `PUT /economic-groups/:id/members`.
// O servidor troca o conjunto INTEIRO a partir de `validFrom` (`economic-groups.service.ts`, `putMembers`): quem está no
// grupo de `validFrom` em diante e não vem na lista é fechado; quem vem e tem saída marcada tem a saída desfeita. Não há
// troca de grupo numa operação nem versão no PUT (B8): por isso toda ação de grupo da tela é UMA escrita, o conjunto vem
// do servidor lido na hora, e o `change` vem das AÇÕES do usuário (marcar, desmarcar), nunca do estado final da caixa.
// Referência executada pelo plano: `planos/plano-B-ASS-10b-T5-v2-ref-ref-members.ts.txt` (`buildMembersPut` intacta).

import type { EconomicGroupDetail, GroupMember } from "./cloud-billing.types";

export type MembersChange = { readonly add: readonly string[]; readonly remove: readonly string[] };
export type MembersPutPlan =
  | { readonly ok: true; readonly body: { readonly tenantIds: string[]; readonly validFrom: string }; readonly added: string[]; readonly removed: string[] }
  | { readonly ok: false; readonly reason: "data_passada" | "sem_mudanca" }
  | { readonly ok: false; readonly reason: "saida_marcada"; readonly tenantId: string; readonly minDate: string };

/**
 * `members` = a resposta de `GET /economic-groups/:id` lida AGORA (vigentes hoje + agendados).
 * Conjunto enviado = todo membro SEM fim (vigente ou agendado) − o que o usuário desmarcou + o que ele marcou.
 * Membro com saída marcada depois da data escolhida não tem escolha neutra no servidor: a janela não escreve e pede
 * uma data igual ou posterior à saída.
 */
export function buildMembersPut(members: readonly GroupMember[], change: MembersChange, validFrom: string, today: string): MembersPutPlan {
  if (validFrom < today) return { ok: false, reason: "data_passada" };
  const blocking = members.filter((m) => m.validTo !== null && m.validTo > validFrom).sort((a, b) => (a.validTo! < b.validTo! ? 1 : -1))[0];
  if (blocking) return { ok: false, reason: "saida_marcada", tenantId: blocking.tenantId, minDate: blocking.validTo! };
  const base = [...new Set(members.filter((m) => m.validTo === null).map((m) => m.tenantId))];
  const removed = base.filter((id) => change.remove.includes(id));
  const added = [...new Set(change.add)].filter((id) => !base.includes(id));
  if (removed.length === 0 && added.length === 0) return { ok: false, reason: "sem_mudanca" };
  const tenantIds = [...base.filter((id) => !removed.includes(id)), ...added].sort();
  return { ok: true, body: { tenantIds, validFrom }, added, removed };
}

/**
 * A1-r2 (ii): o `change` nasce das ações do usuário. `toggle` registra marcar/desmarcar sobre o estado inicial da caixa;
 * marcar de novo o que tinha desmarcado anula a ação (e vice-versa). Nunca se deriva do estado final.
 */
export function toggleMember(change: MembersChange, tenantId: string, checked: boolean, initiallyChecked: boolean): MembersChange {
  const add = change.add.filter((id) => id !== tenantId);
  const remove = change.remove.filter((id) => id !== tenantId);
  if (checked && !initiallyChecked) return { add: [...add, tenantId], remove };
  if (!checked && initiallyChecked) return { add, remove: [...remove, tenantId] };
  return { add, remove };
}

/** A1-r2 (i): a caixa abre com TODO membro sem fim marcado, vigente e agendado. */
export function initiallyCheckedMembers(members: readonly GroupMember[]): string[] {
  return [...new Set(members.filter((member) => member.validTo === null).map((member) => member.tenantId))];
}

/** A1-r2 (iii): o agendado não pode ser desmarcado na tela (o cancelamento é `P-ASS10B-CANCELAR-AGENDADO`). */
export function isScheduledMember(members: readonly GroupMember[], tenantId: string): boolean {
  return members.some((member) => member.tenantId === tenantId && member.scheduled && member.validTo === null);
}

/** Edição simultânea (§6.4.2.3): os membros lidos antes de gravar diferem dos lidos ao abrir a janela? */
export function membersChanged(atOpen: readonly GroupMember[], beforeSave: readonly GroupMember[]): boolean {
  const key = (list: readonly GroupMember[]) => list.map((member) => `${member.tenantId}|${member.validFrom}|${member.validTo ?? ""}`).sort().join(",");
  return key(atOpen) !== key(beforeSave);
}

/** Pós-condição (§6.4.2.4): todo id enviado está na resposta do PUT, sem fim. */
export function membersPostconditionHolds(sent: readonly string[], response: readonly GroupMember[]): boolean {
  return sent.every((id) => response.some((member) => member.tenantId === id && member.validTo === null));
}

/** O vínculo de uma organização num grupo, a partir dos detalhes dos grupos lidos em segundo plano. */
export type TenantMembership = { readonly groupId: string; readonly groupName: string; readonly member: GroupMember };

/** Índice "organização → vínculos" (vigentes e agendados), montado dos detalhes dos grupos. */
export function membershipIndex(details: readonly EconomicGroupDetail[]): ReadonlyMap<string, readonly TenantMembership[]> {
  const index = new Map<string, TenantMembership[]>();
  for (const detail of details) {
    for (const member of detail.members) {
      const list = index.get(member.tenantId) ?? [];
      list.push({ groupId: detail.id, groupName: detail.name, member });
      index.set(member.tenantId, list);
    }
  }
  return index;
}

/** O grupo de HOJE de uma organização (vínculo vigente, não agendado), ou `null`. */
export function currentGroupOf(index: ReadonlyMap<string, readonly TenantMembership[]>, tenantId: string, today: string): TenantMembership | null {
  return (index.get(tenantId) ?? []).find((item) => item.member.validFrom <= today && (item.member.validTo === null || item.member.validTo > today)) ?? null;
}

/** Os agendamentos ("X entra no grupo Y em <data>"), do mais próximo ao mais distante. */
export function scheduledEntries(details: readonly EconomicGroupDetail[], today: string): { readonly tenantName: string; readonly groupName: string; readonly validFrom: string }[] {
  return details
    .flatMap((detail) => detail.members.filter((member) => member.scheduled || member.validFrom > today).map((member) => ({ tenantName: member.tenantName, groupName: detail.name, validFrom: member.validFrom })))
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom) || a.tenantName.localeCompare(b.tenantName, "pt-BR"));
}
