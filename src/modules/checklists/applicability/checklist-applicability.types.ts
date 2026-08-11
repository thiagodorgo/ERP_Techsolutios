import { ChecklistError } from "../checklist.types.js";

// CHECKLIST P1 PR-04a (D-CHK-P1-APPLICABILITY) — domínio da REGRA DE APLICABILIDADE.
//
// A pergunta que este módulo responde: dada uma ordem de serviço, QUAIS modelos de vistoria se aplicam?
// Hoje a resposta é "o que alguém escolheu à mão em `work_orders.checklist_id`". A decisão do dono quer que o
// sistema resolva — "vai depender do tipo do serviço ou exigência do cliente".
//
// NASCE INERTE: nada consome a resolução nesta fatia. O vínculo com a OS (junção N:N + sticky na criação) é a
// PR-04b. Mesmo padrão de `resolveTariff`, que nasceu inerte no Ω5P PR-03 e só ganhou consumidor no charging.

/**
 * FASE da vistoria dentro do serviço. `generic` NÃO é uma fase concreta: é o curinga do eixo, e a junta de
 * decisão (§C7.1, 3 votos) cravou que ele resolve como **FALLBACK** — só entra quando NENHUMA fase concreta
 * casou para aquela ordem de serviço.
 *
 * Por que fallback e não "irmão que soma": (a) o dono usa curinga como último degrau de escada no outro eixo
 * ("serviço concreto > tipo > any(NULL)") — a mesma palavra não pode significar precedência num eixo e soma no
 * outro; (b) cada vistoria a mais é trabalho real do guincheiro em campo, no celular, às vezes offline, e três
 * vistorias sobrepostas pedindo as mesmas fotos produzem "tudo OK" em série — o que degrada o valor probatório
 * das TRÊS; (c) o app de campo de hoje não tem tela-hub para uma terceira vistoria (o próprio handoff do dono
 * marca essa tela como PENDENTE); (d) reversibilidade: fallback→soma é aditivo (um opt-in por regra no futuro),
 * soma→fallback seria retroativo sobre ordens já criadas, algumas com vistoria já assinada e imutável.
 *
 * `custody_yard`/`custody_field` NÃO entram aqui: a decisão do dono deixa em aberto se a custódia de pátio é um
 * valor de `role` ou um discriminador próprio, e reservar o valor agora congelaria a escolha do eixo antes da
 * decisão. Estender é aditivo e barato.
 */
export const CHECKLIST_APPLICABILITY_ROLES = ["collection", "delivery", "generic"] as const;

export type ChecklistApplicabilityRole = (typeof CHECKLIST_APPLICABILITY_ROLES)[number];

/** As fases CONCRETAS — as que competem entre si; o genérico só resgata quando esta lista não casa nada. */
export const CHECKLIST_APPLICABILITY_CONCRETE_ROLES = ["collection", "delivery"] as const;

export function isChecklistApplicabilityRole(value: string): value is ChecklistApplicabilityRole {
  return (CHECKLIST_APPLICABILITY_ROLES as readonly string[]).includes(value);
}

export type ChecklistApplicabilityRule = {
  readonly id: string;
  readonly tenantId: string;
  readonly templateId: string;
  /** Eixo de serviço, ramo CONCRETO. Mutuamente exclusivo com `serviceType` (CHECK no banco). */
  readonly serviceCatalogId?: string;
  /** Eixo de serviço, ramo TIPO (soft-enum configurável por organização). */
  readonly serviceType?: string;
  /** `undefined` = vale para qualquer cliente. NÃO é ausência de dado: é o valor "qualquer". */
  readonly customerId?: string;
  readonly role: ChecklistApplicabilityRole;
  readonly isActive: boolean;
  readonly notes?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
};

export type CreateChecklistApplicabilityRuleInput = {
  readonly tenantId: string;
  readonly templateId: string;
  readonly serviceCatalogId?: string;
  readonly serviceType?: string;
  readonly customerId?: string;
  readonly role: ChecklistApplicabilityRole;
  readonly isActive?: boolean;
  readonly notes?: string;
  readonly createdBy?: string;
};

/**
 * `templateId` está DE FORA por desenho (achado A8 do critico-adversarial): a PR-04b vai gravar o id da regra
 * na junção como PROVENIÊNCIA ("esta ordem recebeu o modelo T por causa da regra R"). Se a regra pudesse trocar
 * de modelo depois, o histórico passaria a apontar para uma regra que hoje resolve outra coisa — a proveniência
 * mentiria. Trocar de modelo = desativar esta regra e criar outra.
 */
export type UpdateChecklistApplicabilityRuleInput = {
  readonly tenantId: string;
  readonly ruleId: string;
  readonly serviceCatalogId?: string | null;
  readonly serviceType?: string | null;
  readonly customerId?: string | null;
  readonly role?: ChecklistApplicabilityRole;
  readonly isActive?: boolean;
  readonly notes?: string | null;
  readonly updatedBy?: string;
};

export type ListChecklistApplicabilityRulesFilter = {
  readonly tenantId: string;
  readonly templateId?: string;
  readonly role?: ChecklistApplicabilityRole;
  /** Por padrão a listagem esconde as apagadas; o histórico continua no banco. */
  readonly includeDeleted?: boolean;
};

export class ChecklistApplicabilityError extends ChecklistError {}

export function checklistApplicabilityBucketConflictError(): ChecklistApplicabilityError {
  return new ChecklistApplicabilityError(
    409,
    "CHECKLIST_APPLICABILITY_BUCKET_CONFLICT",
    "applicability_bucket_conflict",
    "Já existe uma regra ativa para esta mesma combinação de serviço, cliente e etapa. Ajuste a regra existente " +
      "ou desative-a antes de criar outra — duas regras para a mesma combinação tornariam indefinido qual " +
      "vistoria o técnico receberia.",
  );
}

export function checklistApplicabilityServiceAxisError(): ChecklistApplicabilityError {
  return new ChecklistApplicabilityError(
    400,
    "CHECKLIST_APPLICABILITY_SERVICE_AXIS",
    "applicability_service_axis_conflict",
    "Escolha UM critério de serviço: um serviço específico do catálogo OU um tipo de serviço — nunca os dois. " +
      "Deixe os dois em branco para a regra valer para qualquer serviço.",
  );
}

export function checklistApplicabilityRuleNotFoundError(): ChecklistApplicabilityError {
  return new ChecklistApplicabilityError(
    404,
    "CHECKLIST_APPLICABILITY_RULE_NOT_FOUND",
    "applicability_rule_not_found",
    "Regra de aplicabilidade não encontrada.",
  );
}

export function checklistApplicabilityTemplateImmutableError(): ChecklistApplicabilityError {
  return new ChecklistApplicabilityError(
    409,
    "CHECKLIST_APPLICABILITY_TEMPLATE_IMMUTABLE",
    "applicability_template_immutable",
    "O modelo de uma regra não pode ser trocado: o histórico das ordens de serviço registra por qual regra cada " +
      "vistoria foi escolhida, e trocar o modelo faria esse registro apontar para outra coisa. Desative esta " +
      "regra e crie uma nova.",
  );
}
