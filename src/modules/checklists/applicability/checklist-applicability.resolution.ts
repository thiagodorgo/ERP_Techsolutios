import {
  CHECKLIST_APPLICABILITY_CONCRETE_ROLES,
  type ChecklistApplicabilityRole,
  type ChecklistApplicabilityRule,
} from "./checklist-applicability.types.js";

// CHECKLIST P1 PR-04a — A RESOLUÇÃO. Função PURA: recebe as regras candidatas e o contexto da ordem de serviço,
// devolve quais modelos de vistoria se aplicam. Sem banco, sem I/O — o mesmo comparador roda no repositório em
// memória e no Prisma, exatamente como `pickApplicableTariff` faz. Paridade literal importa aqui: o vínculo é
// sticky na criação da ordem, então uma divergência entre os dois caminhos produziria ordens congeladas com
// vistorias diferentes conforme o modo de persistência.

export type ChecklistApplicabilityContext = {
  readonly serviceCatalogId?: string;
  /**
   * Tipo do serviço. Vem do `service_catalog.service_type` — a ordem de serviço NÃO tem essa coluna. Quem
   * chama deriva antes de chamar; a resolução não faz I/O.
   */
  readonly serviceType?: string;
  readonly customerId?: string;
};

export type ChecklistApplicabilityMatch = {
  readonly role: ChecklistApplicabilityRole;
  readonly templateId: string;
  /** Qual regra venceu — vira PROVENIÊNCIA na junção da PR-04b, e é o que explica a escolha meses depois. */
  readonly ruleId: string;
};

export type ChecklistApplicabilityResolution = {
  /** Os modelos que se aplicam, sem repetição, na ordem das fases. */
  readonly matches: readonly ChecklistApplicabilityMatch[];
  /**
   * Regras que casariam o contexto mas PERDERAM para outra — o "sombreamento". A junta exigiu isto: sem
   * rastro, o administrador que cadastrou a exigência de um cliente não tem como descobrir que ela nunca
   * pega, e a promessa "o operador ajusta no envio" vira ficção (ele precisa PERCEBER).
   */
  readonly shadowed: readonly ChecklistApplicabilityMatch[];
};

/**
 * Um candidato é uma regra VIVA cujo eixo de serviço e eixo de cliente casam o contexto.
 *
 * NULL é valor de negócio ("qualquer"), não ausência: uma regra sem cliente casa qualquer cliente, e uma regra
 * sem serviço casa qualquer serviço. Uma regra COM cliente só casa aquele cliente — nunca o contrário.
 */
export function isApplicabilityCandidate(
  rule: ChecklistApplicabilityRule,
  context: ChecklistApplicabilityContext,
): boolean {
  if (!rule.isActive || rule.deletedAt) return false;

  if (rule.customerId !== undefined && rule.customerId !== context.customerId) return false;

  if (rule.serviceCatalogId !== undefined && rule.serviceCatalogId !== context.serviceCatalogId) return false;

  if (rule.serviceType !== undefined && rule.serviceType !== context.serviceType) return false;

  return true;
}

/**
 * ORDEM TOTAL — decidida pela junta (§C7.1, unânime nos 2 primeiros votos), espelhando `pickApplicableTariff`:
 *
 *   1. **cliente nomeado vence cliente qualquer**  ← o topo, e é o ponto que a junta corrigiu no plano
 *   2. serviço concreto > tipo de serviço > qualquer serviço
 *   3. `createdAt` mais recente
 *   4. `id` crescente (desempate final — nunca há empate de verdade)
 *
 * Por que o cliente no topo: (a) no precedente que a decisão do dono manda ancorar, cliente-específico é o
 * PRIMEIRO critério de `pickApplicableTariff` — inverter seria citar o precedente para contrariá-lo; (b) o dono
 * escreveu "tipo do serviço OU **exigência** do cliente" — exigência é vocabulário contratual, e exigência não
 * perde em silêncio para convenção interna; (c) a precedência que ele cravou ("serviço concreto > tipo > any")
 * é ordem DENTRO do eixo de serviço, e sobrevive intacta aqui como segunda chave — nenhuma palavra dele é
 * descartada; (d) assimetria do erro: cliente-domina coleta prova A MAIS onde bastaria menos; serviço-domina
 * deixa o cliente que PAGOU pela exigência sem a prova contratada, de forma irrecuperável (não se re-vistoria
 * um veículo já entregue, e backfill está fora de escopo).
 */
export function compareApplicabilityRules(
  left: ChecklistApplicabilityRule,
  right: ChecklistApplicabilityRule,
): number {
  const leftCustomer = left.customerId !== undefined ? 0 : 1;
  const rightCustomer = right.customerId !== undefined ? 0 : 1;
  if (leftCustomer !== rightCustomer) return leftCustomer - rightCustomer;

  const leftService = serviceSpecificity(left);
  const rightService = serviceSpecificity(right);
  if (leftService !== rightService) return leftService - rightService;

  const leftCreated = left.createdAt.getTime();
  const rightCreated = right.createdAt.getTime();
  if (leftCreated !== rightCreated) return rightCreated - leftCreated;

  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function serviceSpecificity(rule: ChecklistApplicabilityRule): number {
  if (rule.serviceCatalogId !== undefined) return 0;
  if (rule.serviceType !== undefined) return 1;
  return 2;
}

/**
 * A resolução completa.
 *
 * 1. Filtra candidatos pelo contexto.
 * 2. Para cada fase CONCRETA (coleta, entrega), a regra vencedora pela ordem total — no máximo uma por fase.
 * 3. **Fallback**: se NENHUMA fase concreta casou, o `generic` entra. Se alguma casou, o genérico não soma —
 *    ele é rede de segurança, não parcela (decisão da junta).
 * 4. **Dedup por modelo**: o mesmo modelo nunca sai duas vezes, mesmo que duas fases apontem para ele. Sem
 *    isto, a junção da PR-04b receberia a mesma vistoria duplicada na mesma ordem de serviço — e a chave
 *    anti-duplicata natural `(ordem, modelo)` estouraria em runtime.
 *
 * O que sobra vira `shadowed`: tudo que casava e perdeu. É o material do aviso de sombreamento na tela.
 */
export function resolveChecklistApplicability(
  rules: readonly ChecklistApplicabilityRule[],
  context: ChecklistApplicabilityContext,
  /**
   * Ids dos modelos PUBLICADOS. Regra apontando para modelo em rascunho, inativado ou arquivado é ignorada —
   * a mesma disciplina do freeze do despacho: nunca se manda ao campo um formulário que a organização não
   * publicou.
   */
  publishedTemplateIds: ReadonlySet<string>,
): ChecklistApplicabilityResolution {
  const candidates = rules
    .filter((rule) => isApplicabilityCandidate(rule, context))
    .filter((rule) => publishedTemplateIds.has(rule.templateId));

  const vencedorPorFase = new Map<ChecklistApplicabilityRole, ChecklistApplicabilityRule>();
  const perdedores: ChecklistApplicabilityRule[] = [];

  for (const role of ["collection", "delivery", "generic"] as const) {
    const daFase = candidates.filter((rule) => rule.role === role).sort(compareApplicabilityRules);
    const [vencedora, ...resto] = daFase;
    if (vencedora) vencedorPorFase.set(role, vencedora);
    perdedores.push(...resto);
  }

  const concretas = CHECKLIST_APPLICABILITY_CONCRETE_ROLES.map((role) => vencedorPorFase.get(role)).filter(
    (rule): rule is ChecklistApplicabilityRule => rule !== undefined,
  );

  const generica = vencedorPorFase.get("generic");
  // O FALLBACK, em uma linha: o genérico só existe quando as fases concretas não produziram nada.
  const aplicadas = concretas.length > 0 ? concretas : generica ? [generica] : [];

  // O genérico que não entrou por já haver fase concreta É sombreamento — e é o caso mais provável de o
  // administrador estranhar ("cadastrei a vistoria padrão e ela não aparece nesta ordem").
  const sombreadas = [...perdedores];
  if (concretas.length > 0 && generica) sombreadas.push(generica);

  const matches: ChecklistApplicabilityMatch[] = [];
  const fasesJaIncluidas = new Set<ChecklistApplicabilityRole>();

  for (const rule of aplicadas) {
    // JUNTA DO PR-04c (3×0, unânime) — A DEDUPLICAÇÃO É POR **FASE**, NÃO POR MODELO.
    //
    // A versão anterior (#345) deduplicava por `templateId`, o que tornava IMPOSSÍVEL o caso de uso
    // central do aplicativo: o MESMO formulário preenchido na coleta E na entrega. Duas regras
    // (`coleta → T`, `entrega → T`) — a configuração natural de quem tem um único modelo de vistoria —
    // produziam UMA vistoria só, e a entrega nunca existia. É justamente esse par que alimenta a tela
    // de comparação, que carrega UM schema e confronta as duas execuções: o resumo de divergências que
    // vira prova jurídica do estado do veículo.
    //
    // A alternativa que sobrava era duplicar o formulário em dois modelos — com a armadilha de eles
    // divergirem com o tempo, os campos deixarem de casar e a comparação passar a produzir
    // divergências vazias ou falsas, em silêncio.
    //
    // Deduplicar por fase preserva o que a proteção original queria (a mesma vistoria nunca é pedida
    // duas vezes NA MESMA FASE) sem proibir o par coleta+entrega.
    if (fasesJaIncluidas.has(rule.role)) {
      sombreadas.push(rule);
      continue;
    }
    fasesJaIncluidas.add(rule.role);
    matches.push({ role: rule.role, templateId: rule.templateId, ruleId: rule.id });
  }

  return {
    matches,
    shadowed: sombreadas.map((rule) => ({ role: rule.role, templateId: rule.templateId, ruleId: rule.id })),
  };
}
