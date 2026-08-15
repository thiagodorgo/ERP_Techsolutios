import {
  CHECKLIST_APPLICABILITY_ROLES,
  type ChecklistApplicabilityRole,
} from "../checklists/applicability/checklist-applicability.types.js";
import { WorkOrderError } from "./work-order.types.js";

// CHECKLIST P1 PR-04c-A (D-CHK-P1-APPLICABILITY-BINDING) — a ordem de serviço passa a carregar um CONJUNTO de
// vistorias, não uma só. Este arquivo é o domínio da JUNÇÃO `work_order_checklists`: o tipo da linha, a
// identidade (que inclui a FASE), a regra da linha PRIMÁRIA (que alimenta o espelho legado
// `work_orders.checklist_id`) e os erros de negócio em PT-BR.
//
// IDENTIDADE COM FASE (junta 04c, 3×0 — ata J-CHK-P1-PR04C-identidade-da-juncao.md): a chave viva é
// `(tenant_id, work_order_id, checklist_id, role)`, NÃO `(ordem, modelo)`. O MESMO formulário pode servir a
// coleta E a entrega da mesma ordem — é justamente esse par que a tela de comparação do app confronta contra um
// schema único, e cujo resumo de divergências vira prova jurídica do estado do veículo. Deduplicar por modelo
// (o desenho anterior) tornava esse caso impossível de representar.

/**
 * FASE da vistoria dentro da ordem de serviço. FONTE ÚNICA do vocabulário: a união do módulo de aplicabilidade
 * (`CHECKLIST_APPLICABILITY_ROLES`). Os CHECKs do banco (regra, junção e run) são gerados a partir dela.
 *
 * MÉDIA 10 da revisão adversarial — este eixo VAI crescer (o dono já nomeou `custody_field`/`custody_yard`).
 * Estender = 1 linha na união TS + 1 migração que refaz os 3 CHECKs; o guard de paridade reprova quem estender
 * só um lado. Não redeclare a lista aqui: duas listas divergem em silêncio, e a divergência só aparece quando
 * uma ordem real recusa a fase nova.
 */
export type WorkOrderChecklistRole = ChecklistApplicabilityRole;

export const WORK_ORDER_CHECKLIST_ROLES = CHECKLIST_APPLICABILITY_ROLES;

/**
 * PROVENIÊNCIA da linha — de onde ela veio, e é o que explica a escolha meses depois numa disputa:
 *  · `resolved` — uma REGRA de aplicabilidade a produziu (`ruleId` obrigatório);
 *  · `manual`  — alguém a escolheu à mão (override no create/update, ajuste do operador, cópia do duplicate).
 *
 * O nome da coluna (`checklist_source`) é verbatim da decisão do dono. O CHECK biconditional
 * `(checklist_source = 'resolved') = (rule_id IS NOT NULL)` vive na migração: a proveniência não pode mentir.
 *
 * O QUE `manual` SIGNIFICA HOJE, DITO HONESTAMENTE (D-007): como NADA re-resolve (o vínculo é sticky na
 * criação e não há backfill), `manual` NÃO é precedência ativa — é marca de auditoria e preparo para um futuro
 * re-resolvedor. Está escrito aqui para ninguém procurar, daqui a seis meses, uma lógica que não existe.
 */
export const WORK_ORDER_CHECKLIST_SOURCES = ["resolved", "manual"] as const;

export type WorkOrderChecklistSource = (typeof WORK_ORDER_CHECKLIST_SOURCES)[number];

export type WorkOrderChecklistLink = {
  readonly id: string;
  readonly tenantId: string;
  readonly workOrderId: string;
  /** Id do MODELO (template) de vistoria. */
  readonly checklistId: string;
  readonly role: WorkOrderChecklistRole;
  readonly source: WorkOrderChecklistSource;
  /** Regra que produziu a linha. Sempre `undefined` quando `source = 'manual'` (CHECK biconditional). */
  readonly ruleId?: string;
  readonly orderIndex: number;
  /**
   * Ω3-c (E1/E3) por LINHA — o formulário como publicado no INSTANTE do despacho. `null` antes do despacho.
   * O espelho `work_orders.checklist_snapshot` é sempre o desta linha quando ela é a primária.
   */
  readonly checklistSnapshot?: Record<string, unknown> | null;
  readonly addedBy?: string;
  /** Remoção é SOFT: por que uma vistoria não aconteceu é informação que uma disputa pode exigir. */
  readonly removedAt?: Date;
  readonly removedBy?: string;
  readonly removedReason?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type WorkOrderChecklistLinkInput = {
  readonly checklistId: string;
  readonly role: WorkOrderChecklistRole;
  readonly source: WorkOrderChecklistSource;
  readonly ruleId?: string;
  /**
   * Posição na fila de vistorias. RELATIVA quando a escrita usa `appendAfterExisting` (o repositório soma a
   * base para a linha nova nunca virar primária numa ordem já despachada).
   */
  readonly orderIndex: number;
  readonly checklistSnapshot?: Record<string, unknown> | null;
  readonly addedBy?: string;
};

/** Alvo de uma remoção: o par `(modelo, fase)` — a fase é obrigatória porque `(ordem, modelo)` deixou de identificar uma linha. */
export type WorkOrderChecklistRemovalInput = {
  readonly checklistId: string;
  readonly role: WorkOrderChecklistRole;
  readonly reason?: string;
};

export type ApplyWorkOrderChecklistsInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly actorUserId?: string;
  /** Marca removidas TODAS as linhas vivas (inclusive a promovida) antes das adições — é o "limpar/substituir". */
  readonly removeAll?: boolean;
  readonly removeAllReason?: string;
  readonly remove?: readonly WorkOrderChecklistRemovalInput[];
  readonly add?: readonly WorkOrderChecklistLinkInput[];
  /**
   * BLOQ 3 (adição pós-despacho) — as adições entram DEPOIS do maior `order_index` vivo, então uma linha
   * acrescentada NUNCA vira primária enquanto uma linha anterior viver. Sem isso, acrescentar uma vistoria
   * numa ordem já despachada re-apontaria o espelho e o campo receberia um formulário que o freeze não viu.
   */
  readonly appendAfterExisting?: boolean;
};

/**
 * CHECKLIST P1 PR-04c (BLOQ 1 da verificação) — congelamento POR LINHA das vistorias que NÃO são a primária.
 *
 * A primária já é congelada por `freezeChecklistSnapshot` (que grava o espelho da ordem e a linha primária na
 * mesma escrita). As demais linhas do conjunto precisam do MESMO carimbo no instante do despacho: sem ele, a
 * vistoria de entrega seria congelada meses depois com um formulário de outra época — quebrando a garantia
 * Ω3-c (E1/E3) de que o técnico responde a versão publicada no instante do despacho.
 *
 * O alvo de cada entrada é o par `(modelo, etapa)` da linha VIVA — a identidade da junção.
 */
export type FreezeChecklistLinkSnapshotsInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly actorUserId?: string;
  readonly entries: readonly {
    readonly checklistId: string;
    readonly role: WorkOrderChecklistRole;
    readonly snapshot: Record<string, unknown> | null;
  }[];
};

export type ApplyWorkOrderChecklistsResult<TWorkOrder> = {
  readonly workOrder: TWorkOrder;
  /** Conjunto VIVO final, já ordenado (a primeira linha é a primária). */
  readonly links: readonly WorkOrderChecklistLink[];
  /** Linhas efetivamente marcadas como removidas nesta escrita (alimenta os eventos de timeline). */
  readonly removed: readonly WorkOrderChecklistLink[];
  readonly added: readonly WorkOrderChecklistLink[];
  /** ALTA 6 — a linha legada materializada por promoção preguiçosa nesta escrita, se houve. */
  readonly promoted?: WorkOrderChecklistLink;
};

/**
 * O banco carrega o CHECK biconditional `(removed_at IS NULL) = (removed_by IS NULL)`: remoção sem autor é
 * remoção sem responsável, e numa disputa sobre o veículo "quem retirou a vistoria" é a primeira pergunta.
 * Recusado aqui, nos dois repositórios, para virar erro de negócio em vez de violação crua de constraint
 * (§2.8 — nome de constraint não vaza para o cliente).
 */
export function assertChecklistRemovalHasActor(actorUserId: string | undefined): asserts actorUserId is string {
  if (!actorUserId) {
    throw new WorkOrderError(
      400,
      "WORK_ORDER_INVALID",
      "checklist_removal_actor_required",
      "Não é possível retirar uma vistoria sem identificar quem a retirou.",
    );
  }
}

/** Linha viva = ainda não removida. A remoção é soft, então `removed_at IS NULL` é o predicado de tudo. */
export function isLiveChecklistLink(link: WorkOrderChecklistLink): boolean {
  return link.removedAt === undefined || link.removedAt === null;
}

/**
 * ORDEM DA FILA — e, no topo dela, a PRIMÁRIA: menor `order_index`, desempate por `created_at` e por `id`.
 * A primária é a linha que o espelho legado (`work_orders.checklist_id` + `checklist_snapshot`) reproduz e a
 * única que o despacho provisiona nesta fatia (§7.3 do plano). Comparador ÚNICO: memória e Prisma o
 * compartilham, senão o conjunto congelado dependeria do modo de persistência.
 */
export function sortChecklistLinks(
  links: readonly WorkOrderChecklistLink[],
): readonly WorkOrderChecklistLink[] {
  return [...links].sort((left, right) => {
    if (left.orderIndex !== right.orderIndex) return left.orderIndex - right.orderIndex;
    const leftCreated = left.createdAt.getTime();
    const rightCreated = right.createdAt.getTime();
    if (leftCreated !== rightCreated) return leftCreated - rightCreated;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

export function liveChecklistLinks(
  links: readonly WorkOrderChecklistLink[],
): readonly WorkOrderChecklistLink[] {
  return sortChecklistLinks(links.filter(isLiveChecklistLink));
}

export function pickPrimaryChecklistLink(
  links: readonly WorkOrderChecklistLink[],
): WorkOrderChecklistLink | undefined {
  return liveChecklistLinks(links)[0];
}

/**
 * A VISÃO SINTÉTICA da ordem legada (§5.3 do plano) — derivada, NUNCA gravada.
 *
 * Sem backfill (decisão do dono), uma ordem anterior ao 04c tem `checklist_id` e junção vazia. Para o resto do
 * sistema ela precisa parecer um conjunto de uma linha; é isso que esta função devolve. O que a materializa de
 * verdade é a PROMOÇÃO PREGUIÇOSA, na primeira escrita de junção daquela ordem (ver o repositório).
 */
export function syntheticChecklistSet(workOrder: {
  readonly checklistId?: string;
  readonly checklistSnapshot?: Record<string, unknown> | null;
}): readonly WorkOrderChecklistLinkInput[] {
  if (!workOrder.checklistId) return [];

  return [
    {
      checklistId: workOrder.checklistId,
      role: "generic",
      source: "manual",
      orderIndex: 0,
      checklistSnapshot: workOrder.checklistSnapshot ?? null,
    },
  ];
}

/**
 * O conjunto EFETIVO que o resto do domínio enxerga: a junção viva quando existe; senão a visão sintética da
 * ordem legada; senão vazio. É a mesma precedência que a promoção preguiçosa materializa — usar duas leituras
 * diferentes para "o que esta ordem tem hoje" é como a segunda vistoria sumiria em silêncio.
 */
export function effectiveChecklistSet(
  workOrder: { readonly checklistId?: string; readonly checklistSnapshot?: Record<string, unknown> | null },
  links: readonly WorkOrderChecklistLink[],
): readonly { readonly checklistId: string; readonly role: WorkOrderChecklistRole; readonly orderIndex: number; readonly ruleId?: string; readonly source: WorkOrderChecklistSource }[] {
  const live = liveChecklistLinks(links);
  if (live.length > 0) {
    return live.map((link) => ({
      checklistId: link.checklistId,
      role: link.role,
      orderIndex: link.orderIndex,
      ruleId: link.ruleId,
      source: link.source,
    }));
  }

  return syntheticChecklistSet(workOrder).map((link) => ({
    checklistId: link.checklistId,
    role: link.role,
    orderIndex: link.orderIndex,
    ruleId: link.ruleId,
    source: link.source,
  }));
}

export function isWorkOrderChecklistRole(value: unknown): value is WorkOrderChecklistRole {
  return typeof value === "string" && (WORK_ORDER_CHECKLIST_ROLES as readonly string[]).includes(value);
}

// ---------- erros de negócio (PT-BR, §3: nada de termo técnico na cópia) ----------

/**
 * ALTA 7a — o campo legado `checklistId` no UPDATE não pode apagar o conjunto em silêncio. Com 2+ vistorias
 * vivas ele não tem como expressar a intenção (é um id só), e sobrescrever a primária destruiria a segunda —
 * exatamente o sumiço silencioso que a revisão adversarial mediu.
 */
export function workOrderChecklistSetRequiresEndpointError(): WorkOrderError {
  return new WorkOrderError(
    409,
    "WORK_ORDER_CHECKLIST_SET_REQUIRES_ENDPOINT",
    "checklist_set_requires_endpoint",
    "Esta ordem tem mais de uma vistoria. Use o endpoint de vistorias para alterá-las.",
  );
}

export function workOrderChecklistSetConflictError(): WorkOrderError {
  return new WorkOrderError(
    400,
    "WORK_ORDER_INVALID",
    "checklist_set_conflict",
    "Envie o conjunto de vistorias OU o campo antigo de vistoria única — nunca os dois na mesma requisição.",
  );
}

export function workOrderChecklistDuplicateError(): WorkOrderError {
  return new WorkOrderError(
    409,
    "WORK_ORDER_CONFLICT",
    "duplicate_checklist_phase",
    "Esta vistoria já está nesta ordem para a mesma etapa. Escolha outra etapa ou outro modelo.",
  );
}

export function workOrderChecklistNotPublishedError(): WorkOrderError {
  return new WorkOrderError(
    400,
    "WORK_ORDER_INVALID",
    "checklist_not_published",
    "Uma das vistorias informadas não é um modelo publicado desta organização.",
  );
}

/**
 * §10.2.5 — vistoria já enviada ao técnico não é retirada: a run existe, pode estar sendo respondida em campo
 * (às vezes offline) e é prova. O caminho de correção é a reabertura da vistoria, não o sumiço da linha.
 */
export function workOrderChecklistAlreadyDispatchedError(): WorkOrderError {
  return new WorkOrderError(
    409,
    "WORK_ORDER_CONFLICT",
    "checklist_already_dispatched",
    "Esta vistoria já foi enviada ao técnico e não pode ser retirada; para corrigir, use a reabertura.",
  );
}

export function workOrderChecklistLinkNotFoundError(): WorkOrderError {
  return new WorkOrderError(
    404,
    "WORK_ORDER_CHECKLIST_NOT_FOUND",
    "checklist_link_not_found",
    "Esta vistoria não está nesta ordem de serviço.",
  );
}

export function workOrderChecklistReasonRequiredError(): WorkOrderError {
  return new WorkOrderError(
    400,
    "WORK_ORDER_INVALID",
    "checklist_removal_reason_required",
    "Informe o motivo para retirar a vistoria da ordem.",
  );
}

/**
 * §10.2.9 (ALTA 8) — retirar uma vistoria exigida por CONTRATO de um cliente nomeado exige mais que um clique:
 * confirmação distinta + motivo. A junta D2 decidiu por unanimidade que exigência contratada não perde em
 * silêncio para convenção interna; sem esta trava, valeria só de um lado.
 */
export function workOrderChecklistCustomerScopedConfirmationError(): WorkOrderError {
  return new WorkOrderError(
    409,
    "WORK_ORDER_CHECKLIST_CUSTOMER_SCOPED",
    "checklist_customer_scoped_confirmation_required",
    "Esta vistoria foi exigida pelo contrato do cliente. Confirme explicitamente a retirada e informe o motivo.",
  );
}

export function workOrderChecklistTerminalError(): WorkOrderError {
  return new WorkOrderError(
    409,
    "WORK_ORDER_CONFLICT",
    "work_order_terminal",
    "Esta ordem já foi encerrada; as vistorias não podem mais ser ajustadas.",
  );
}

export function workOrderChecklistAdjustmentEmptyError(): WorkOrderError {
  return new WorkOrderError(
    400,
    "WORK_ORDER_INVALID",
    "checklist_adjustment_empty",
    "Informe ao menos uma vistoria para incluir ou retirar.",
  );
}
