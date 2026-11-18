import type { TenantChecklist } from "../checklists/types";
import type {
  WorkOrderChecklistAdjustmentBody,
  WorkOrderChecklistLink,
  WorkOrderChecklistRole,
  WorkOrderDetail,
  WorkOrderEvent,
  WorkOrderStatus,
} from "./work-orders.types";

// B-GUI-02 — o operador escolhe, na web, as vistorias da OS (Emendas 1, 1.1 e 2 do plano). Este arquivo é PURO (só
// `import type`): a regra de quem edita, o corpo de UMA linha que vai ao `PATCH /work-orders/:id/checklists`, o mapa das
// recusas do servidor e o que o detalhe sabe dizer de cada vistoria. O painel (`WorkOrderChecklistsPanel.tsx`) só desenha
// e chama; nada aqui toca rede.
//
// A ORDEM é do servidor (Emenda 2, §1): a primária é a coleta, pela etapa. A tela não reordena, não retira linha que o
// operador não escolheu, e não manda mais de uma linha por chamada (Emenda 1.1, §2).

/** Estados em que a OS não aceita mais ajuste de vistoria (o servidor responde 409 `work_order_terminal`). */
export const TERMINAL_STATUSES: readonly WorkOrderStatus[] = ["completed", "cancelled", "rejected"];

export const DISPATCH_PERMISSION = "field_dispatch:create";
export const TEMPLATES_READ_PERMISSION = "tenant_checklists:read";

export type ChecklistPanelReadOnlyReason = "terminal" | "dispatcher_without_templates" | "read_only_profile" | null;

export type ChecklistPanelAccess = {
  /** Edita: tem as duas chaves e a OS não está encerrada. */
  readonly canEdit: boolean;
  /** Pode ler a lista de modelos (sem isto a tela nem chama `GET /tenant/checklists`). */
  readonly canReadTemplates: boolean;
  readonly hasDispatchCreate: boolean;
  readonly terminal: boolean;
  readonly readOnlyReason: ChecklistPanelReadOnlyReason;
};

/**
 * Quem edita (Emenda 1, §1): `field_dispatch:create` (a rota de gravar) E `tenant_checklists:read` (a lista de modelos),
 * com a OS fora dos estados terminais. O servidor é a autoridade final; isto só molda a tela.
 */
export function checklistPanelAccess(permissions: readonly string[], status: WorkOrderStatus): ChecklistPanelAccess {
  const hasDispatchCreate = permissions.includes(DISPATCH_PERMISSION);
  const hasTemplatesRead = permissions.includes(TEMPLATES_READ_PERMISSION);
  const terminal = TERMINAL_STATUSES.includes(status);
  const canEdit = hasDispatchCreate && hasTemplatesRead && !terminal;
  const readOnlyReason: ChecklistPanelReadOnlyReason = canEdit
    ? null
    : terminal
      ? "terminal"
      : hasDispatchCreate
        ? "dispatcher_without_templates"
        : "read_only_profile";
  return { canEdit, canReadTemplates: hasTemplatesRead, hasDispatchCreate, terminal, readOnlyReason };
}

export const READ_ONLY_MESSAGES: Readonly<Record<Exclude<ChecklistPanelReadOnlyReason, null> | "forbidden_on_save", string>> = {
  terminal: "Esta OS foi encerrada. As vistorias ficam como registro e não podem mais ser ajustadas.",
  dispatcher_without_templates:
    "Seu perfil envia a OS ao guincheiro, mas ainda não vê os modelos de vistoria. Para escolher a vistoria desta OS, peça a um gestor.",
  read_only_profile: "Seu perfil vê as vistorias desta OS, mas não pode alterá-las.",
  forbidden_on_save: "Seu perfil não pode alterar as vistorias desta OS.",
};

/** Só modelos publicados são oferecidos (rascunho, inativo e arquivado ficam fora). */
export function publishedTemplates(templates: readonly TenantChecklist[]): readonly TenantChecklist[] {
  return templates.filter((template) => template.status === "published");
}

// ---------- o corpo de UMA linha ----------

/** Etapas que a tela inclui. A tela nunca acrescenta vistoria geral; só retira uma que já exista. */
export type IncludablePhase = "collection" | "delivery";

/** Linha viva que a tela sabe retirar: a etapa precisa ser conhecida (o servidor exige a etapa na retirada). */
export type RetirableLine = Pick<WorkOrderChecklistLink, "checklistId" | "orderIndex"> & { readonly role: WorkOrderChecklistRole };

export type ChecklistChange =
  | { readonly kind: "include"; readonly checklistId: string; readonly role: IncludablePhase }
  | { readonly kind: "retire"; readonly line: RetirableLine; readonly reason: string };

export type ChecklistLocalRefusal = "duplicate_phase" | "unknown_phase" | "line_not_live" | "reason_required" | "reason_too_long";

export type ChecklistAdjustmentResult =
  | { readonly kind: "body"; readonly body: WorkOrderChecklistAdjustmentBody }
  | { readonly kind: "refused"; readonly reason: ChecklistLocalRefusal };

export const REMOVAL_REASON_MAX = 500;

const KNOWN_ROLES: readonly WorkOrderChecklistRole[] = ["collection", "delivery", "generic"];

/**
 * O corpo que vai ao `PATCH`: SEMPRE uma linha só (Emenda 1.1, §2.3). Incluir manda `{ add: [x] }`; retirar manda
 * `{ remove: [y, motivo] }`. Nenhuma linha que o operador não escolheu entra no corpo, e a etapa vai sempre (sem ela o
 * servidor gravaria vistoria geral). A recusa local evita a chamada que o servidor recusaria de qualquer jeito.
 */
export function buildChecklistAdjustmentBody(live: readonly WorkOrderChecklistLink[], change: ChecklistChange): ChecklistAdjustmentResult {
  if (change.kind === "include" && live.some((line) => line.checklistId === change.checklistId && line.role === change.role)) {
    return { kind: "refused", reason: "duplicate_phase" };
  }
  if (change.kind === "retire") {
    if (!KNOWN_ROLES.includes(change.line.role)) return { kind: "refused", reason: "unknown_phase" };
    if (!live.some((line) => line.checklistId === change.line.checklistId && line.role === change.line.role)) {
      return { kind: "refused", reason: "line_not_live" };
    }
    if (change.reason.trim().length === 0) return { kind: "refused", reason: "reason_required" };
    if (change.reason.length > REMOVAL_REASON_MAX) return { kind: "refused", reason: "reason_too_long" };
  }

  const body = {
    add: change.kind === "include" ? [{ checklistId: change.checklistId, role: change.role }] : [],
    remove: change.kind === "retire" ? [{ checklistId: change.line.checklistId, role: change.line.role, reason: change.reason }] : [],
  };
  if (body.add.length + body.remove.length !== 1) throw new Error("checklist_adjustment_must_be_one_line");

  return {
    kind: "body",
    body: {
      ...(body.add.length > 0 ? { add: body.add } : {}),
      ...(body.remove.length > 0 ? { remove: body.remove } : {}),
    },
  };
}

export const LOCAL_REFUSAL_MESSAGES: Readonly<Record<ChecklistLocalRefusal, string>> = {
  duplicate_phase: "Este modelo já está nesta etapa da OS.",
  unknown_phase: "A etapa desta vistoria não foi informada; não é possível retirá-la por aqui.",
  line_not_live: "Esta vistoria já não está nesta OS. Atualizamos a tela.",
  reason_required: "Informe o motivo para retirar a vistoria.",
  reason_too_long: "O motivo pode ter no máximo 500 caracteres.",
};

// ---------- as recusas do servidor, pelo `reason` (Emenda 1, §2; Emenda 2, §2) ----------

export const CHECKLIST_ADJUST_MESSAGES: Readonly<Record<string, string>> = {
  checklist_not_published: "Este modelo não está mais publicado. Atualizamos a lista; escolha outro.",
  duplicate_checklist_phase: "Este modelo já está nesta etapa da OS.",
  checklist_already_dispatched:
    "Esta vistoria já foi enviada ao guincheiro e não pode ser retirada. Para corrigir, use a reabertura da vistoria.",
  work_order_terminal: "Esta OS foi encerrada. As vistorias não podem mais ser ajustadas.",
  collection_after_dispatch: "Esta OS já foi enviada sem vistoria de coleta. A coleta não pode entrar depois do envio.",
  checklist_customer_scoped_confirmation_required: "Esta vistoria foi exigida pelo contrato do cliente e não pode ser retirada por aqui.",
  checklist_link_not_found: "Esta vistoria já não está nesta OS. Atualizamos a tela.",
  not_found: "Esta OS não foi encontrada nesta organização.",
  permission_required: "Seu perfil não pode alterar as vistorias desta OS.",
  checklist_removal_reason_required: "Informe o motivo para retirar a vistoria.",
  checklist_removal_reason_too_long: "O motivo pode ter no máximo 500 caracteres.",
  invalid_uuid: "Não foi possível salvar as vistorias. Atualize a página e tente de novo.",
  invalid_checklist_role: "Não foi possível salvar as vistorias. Atualize a página e tente de novo.",
  invalid_checklist_adjustment: "Não foi possível salvar as vistorias. Atualize a página e tente de novo.",
  checklist_adjustment_empty: "Não foi possível salvar as vistorias. Atualize a página e tente de novo.",
  checklist_role_required: "Não foi possível salvar as vistorias. Atualize a página e tente de novo.",
  checklist_removal_actor_required: "Não foi possível salvar as vistorias. Atualize a página e tente de novo.",
};

export const CHECKLIST_ADJUST_FALLBACK = "Não foi possível salvar agora.";

/** O que fazer depois de cada recusa, além de mostrar a frase. */
export type ChecklistAdjustFollowUp = "reload_templates" | "reload_work_order" | "read_only" | "retry" | null;

export function checklistAdjustFollowUp(status: number | undefined, reason: string | undefined): ChecklistAdjustFollowUp {
  if (reason === "checklist_not_published") return "reload_templates";
  if (reason === "work_order_terminal") return "read_only";
  if (reason === "checklist_link_not_found") return "reload_work_order";
  if (reason === "permission_required" || status === 403) return "read_only";
  if (reason && Object.prototype.hasOwnProperty.call(CHECKLIST_ADJUST_MESSAGES, reason)) return null;
  return "retry";
}

/**
 * A frase da recusa, procurada pelo `reason` (o discriminador estável do servidor). O número só serve de reserva quando o
 * `reason` é desconhecido; o `reason` em si nunca aparece na tela.
 */
export function checklistAdjustMessage(status: number | undefined, reason: string | undefined): string {
  if (reason && Object.prototype.hasOwnProperty.call(CHECKLIST_ADJUST_MESSAGES, reason)) return CHECKLIST_ADJUST_MESSAGES[reason];
  if (status === 403) return CHECKLIST_ADJUST_MESSAGES.permission_required;
  if (status === 404) return CHECKLIST_ADJUST_MESSAGES.not_found;
  return CHECKLIST_ADJUST_FALLBACK;
}

// ---------- o que o detalhe sabe dizer ----------

/** A OS já saiu para o guincheiro (no nível da OS; qual linha virou execução o detalhe não diz). */
export function workOrderAlreadyDispatched(workOrder: Pick<WorkOrderDetail, "checklistSnapshot">, timeline: readonly WorkOrderEvent[]): boolean {
  return workOrder.checklistSnapshot != null || timeline.some((event) => event.eventType === "field_dispatch_created");
}

export type ChecklistInclusion = { readonly label: string | null; readonly createdAt: string };

/** A inclusão mais recente da linha na linha do tempo (`work_order_checklist_added`): o nome do modelo naquela hora e a data. */
export function inclusionOf(
  timeline: readonly WorkOrderEvent[],
  line: Pick<WorkOrderChecklistLink, "checklistId" | "role">,
): ChecklistInclusion | null {
  let found: WorkOrderEvent | null = null;
  for (const event of timeline) {
    if (event.eventType !== "work_order_checklist_added") continue;
    const meta = event.metadata ?? {};
    if (meta.checklistId !== line.checklistId) continue;
    if (line.role !== null && meta.role !== undefined && meta.role !== line.role) continue;
    if (!found || event.createdAt > found.createdAt) found = event;
  }
  if (!found) return null;
  const label = typeof found.metadata?.checklistLabel === "string" && found.metadata.checklistLabel.trim() ? found.metadata.checklistLabel.trim() : null;
  return { label, createdAt: found.createdAt };
}

const ROLE_RANK: Readonly<Record<string, number>> = { collection: 0, delivery: 1, generic: 2 };

/** Exibição por etapa: Coleta, Entrega, Vistoria geral e, por último, as de etapa desconhecida. Só apresentação. */
export function displayOrder(lines: readonly WorkOrderChecklistLink[]): readonly WorkOrderChecklistLink[] {
  return lines
    .map((line, position) => ({ line, position }))
    .sort((left, right) => {
      const byRole = (left.line.role ? ROLE_RANK[left.line.role] : 3) - (right.line.role ? ROLE_RANK[right.line.role] : 3);
      if (byRole !== 0) return byRole;
      if (left.line.orderIndex !== right.line.orderIndex) return left.line.orderIndex - right.line.orderIndex;
      return left.position - right.position;
    })
    .map((entry) => entry.line);
}

/** As linhas vivas que a OS traz. Payload sem o conjunto (servidor antigo) → nada a editar. */
export function liveLinesOf(workOrder: Pick<WorkOrderDetail, "checklists">): readonly WorkOrderChecklistLink[] {
  return workOrder.checklists ?? [];
}

// ---------- o que o modelo pede (a mesma leitura que o B-GUI-03 vai usar no app: `pedidosDaOs`) ----------

export type TemplateRequirements = {
  /** Mínimo de fotos somado dos campos de foto (0 = não pede foto). */
  readonly photos: number;
  /** Campo "antes e depois" (serviço no local). */
  readonly beforeAfter: boolean;
  readonly damageMap: boolean;
  readonly signature: boolean;
  readonly comparison: boolean;
  readonly fields: number;
  readonly requiredFields: number;
};

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export function templateRequirements(template: Pick<TenantChecklist, "components">): TemplateRequirements {
  const components = template.components ?? [];
  let photos = 0;
  for (const component of components) {
    if (component.type === "photo_upload") photos += Math.max(1, numberFrom(component.config?.minPhotos, 1));
  }
  return {
    photos,
    beforeAfter: components.some((component) => component.type === "before_after"),
    damageMap: components.some((component) => component.type === "damage_map"),
    signature: components.some((component) => component.type === "signature"),
    comparison: components.some((component) => component.type === "comparison"),
    fields: components.length,
    requiredFields: components.filter((component) => component.required).length,
  };
}

/** A frase do que o app vai pedir, em língua de negócio. */
export function requirementsSentence(req: TemplateRequirements): string {
  const parts: string[] = [];
  if (req.beforeAfter) parts.push("foto antes e depois");
  if (req.photos > 0) parts.push(req.photos === 1 ? "no mínimo 1 foto" : `no mínimo ${req.photos} fotos`);
  if (req.damageMap) parts.push("mapa de avarias");
  if (req.signature) parts.push("assinatura");
  if (req.comparison) parts.push("comparação com a coleta");
  if (parts.length > 0) return parts.join(", ");
  return req.fields === 1 ? "1 pergunta, sem foto" : `${req.fields} perguntas, sem foto`;
}

export const TEMPLATE_TYPE_LABELS: Readonly<Record<TenantChecklist["type"], string>> = {
  towing_collection: "Coleta de reboque",
  towing_delivery: "Entrega de reboque",
  technical_evidence: "Evidência técnica",
  custom: "Uso geral",
};

export const PHASE_LABELS: Readonly<Record<WorkOrderChecklistRole, string>> = {
  collection: "coleta",
  delivery: "entrega",
  generic: "vistoria geral",
};
