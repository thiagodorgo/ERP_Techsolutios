import type { Cheque, ChequeAction } from "./cheques.types";

// B-SAN3-24 (24a, P-ACESSO) — uma ação é OFERECIDA se, e só se, o servidor a aceita para aquele papel, estado e vínculo
// (`src/modules/cheques/cheque.routes.ts` e `cheque.service.ts`). A página e as 3 aparências só leem daqui; o teste A5
// cruza esta tabela com o servidor real (oferecida ⇒ 2xx; negada ⇒ 403 ou 422).
//   registered: depositar, editar (cheques:update); cancelar e excluir também exigem cheque SEM título (vinculado →
//               422 `cheque_linked_unlink_first` para todo ator; R-VINCULO);
//   deposited:  compensar (move dinheiro: cheques:update E financial_entries:create); devolver sem caixa (cheques:update);
//   cleared:    devolver move dinheiro (as duas permissões);
//   bounced, cancelled, excluído: nenhuma.
// R-E2E-JWT: só TypeScript puro.

export type PermissionSet = { has(permission: string): boolean };

const NONE: readonly ChequeAction[] = [];

export function chequeActionsFor(cheque: Cheque, perms: PermissionSet): readonly ChequeAction[] {
  if (!cheque.active) return NONE;
  const update = perms.has("cheques:update");
  const moveMoney = perms.has("cheques:update") && perms.has("financial_entries:create");
  const linkFree = cheque.titleId === null;
  const actions: ChequeAction[] = [];
  if (cheque.status === "registered" && update) {
    actions.push("deposit");
    actions.push("edit");
    if (linkFree) actions.push("cancel");
    if (linkFree) actions.push("delete");
  }
  if (cheque.status === "deposited") {
    if (moveMoney) actions.push("clear");
    if (update) actions.push("bounce");
  }
  if (cheque.status === "cleared" && moveMoney) actions.push("bounce");
  return actions;
}

/** Registrar cheque (`POST /cheques`). */
export function canRegisterCheque(perms: PermissionSet): boolean {
  return perms.has("cheques:create");
}

/** Devolver exige motivo quando o cheque depositado tem título (o servidor responde 400 `bounce_reason_required`). */
export function bounceReasonRequired(cheque: Cheque): boolean {
  return cheque.status === "deposited" && cheque.titleId !== null;
}

/** Ações que movem dinheiro pedem confirmação com o impacto de caixa (R-CAIXA). */
export function movesMoney(cheque: Cheque, action: ChequeAction): boolean {
  return action === "clear" || (action === "bounce" && cheque.status === "cleared");
}

export const CHEQUE_ACTION_LABELS: Readonly<Record<ChequeAction, string>> = {
  deposit: "Depositar",
  clear: "Compensar",
  bounce: "Devolver",
  cancel: "Cancelar",
  edit: "Editar",
  delete: "Excluir",
};

export const CHEQUE_STATUS_LABELS: Readonly<Record<Cheque["status"], string>> = {
  registered: "Registrado",
  deposited: "Depositado",
  cleared: "Compensado",
  bounced: "Devolvido",
  cancelled: "Cancelado",
};

export const CHEQUE_STATUS_TONES: Readonly<Record<Cheque["status"], { readonly bg: string; readonly fg: string }>> = {
  registered: { bg: "#EFF6FF", fg: "#1D4ED8" },
  deposited: { bg: "#F5F3FF", fg: "#6D28D9" },
  cleared: { bg: "#ECFDF5", fg: "#047857" },
  bounced: { bg: "#FEF2F2", fg: "#B91C1C" },
  cancelled: { bg: "#F1F5F9", fg: "#475569" },
};

export function directionLabel(direction: Cheque["direction"]): string {
  return direction === "received" ? "A receber" : "A pagar";
}
