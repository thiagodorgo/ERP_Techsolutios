import { ChecklistError, type ChecklistRunStatus } from "./checklist.types.js";

/**
 * CHECKLIST P1 PR-03 — ciclo de vida da execução (D-CHK-P1-RUN-LIFECYCLE).
 *
 * Decisão do dono: "responder a qualquer momento" = **TRAVA AO CONCLUIR/ASSINAR**. O guincheiro preenche
 * enquanto a OS/custódia está ativa; ao CONCLUIR, a vistoria vira prova jurídica do estado do veículo e fica
 * IMUTÁVEL. Corrigir depois = **reabrir**, o que cria uma NOVA versão vinculada — nunca edição destrutiva.
 *
 * Este módulo concentra a definição do que é "terminal" e as recusas em linguagem de negócio, para que o
 * serviço E os DOIS repositórios (memória e Prisma) apliquem exatamente a MESMA regra. A duplicação é
 * proposital (defesa em profundidade): quem chamar o repositório direto — sync do mobile, efeito de domínio
 * do despacho, código futuro — esbarra na mesma trava, mesmo sem passar pelo serviço.
 */

// Estados TERMINAIS da run. `pending_acknowledgement` NÃO é terminal: a run ainda espera a ciência que a
// leva a `completed_with_divergence` (é justamente o passo que fecha o ciclo, e precisa poder escrever).
export const CHECKLIST_RUN_TERMINAL_STATUSES = [
  "completed",
  "completed_with_divergence",
  "cancelled",
] as const;

export type ChecklistRunTerminalStatus = (typeof CHECKLIST_RUN_TERMINAL_STATUSES)[number];

// Estados em que a vistoria ainda está VIVA (aceita preenchimento).
export const CHECKLIST_RUN_ACTIVE_STATUSES = ["in_progress", "pending_acknowledgement"] as const;

// Só uma vistoria CONCLUÍDA (assinada) é reabrível. `cancelled` não se reabre: a vistoria cancelada não é
// prova de nada — o caminho é criar uma vistoria nova pela ordem de serviço.
export const CHECKLIST_RUN_REOPENABLE_STATUSES = ["completed", "completed_with_divergence"] as const;

export function isChecklistRunTerminal(status: ChecklistRunStatus): boolean {
  return (CHECKLIST_RUN_TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function isChecklistRunReopenable(status: ChecklistRunStatus): boolean {
  return (CHECKLIST_RUN_REOPENABLE_STATUSES as readonly string[]).includes(status);
}

/**
 * Trava de imutabilidade. Chamada ANTES de qualquer escrita numa run (resposta, anexo, marcação de avaria,
 * divergência, conclusão). Vistoria terminal → 409 com motivo próprio e mensagem de negócio em PT-BR.
 */
export function assertChecklistRunMutable(run: { readonly status: ChecklistRunStatus }): void {
  if (run.status === "cancelled") {
    throw new ChecklistError(
      409,
      "CHECKLIST_RUN_CANCELLED",
      "checklist_run_cancelled",
      "Esta vistoria foi cancelada e não recebe mais preenchimento. Inicie uma nova vistoria pela ordem de serviço.",
    );
  }

  if (isChecklistRunTerminal(run.status)) {
    throw new ChecklistError(
      409,
      "CHECKLIST_RUN_LOCKED",
      "checklist_run_locked",
      "Esta vistoria já foi concluída e assinada — ela é a prova do estado do veículo e não pode mais ser alterada. Para corrigir, reabra a vistoria: uma nova versão é criada e a original fica preservada no histórico.",
    );
  }
}

/**
 * Guarda da reabertura: só vistoria CONCLUÍDA vira nova versão. Em andamento → não há o que reabrir (basta
 * continuar preenchendo); cancelada → não é prova, começa-se outra.
 */
export function assertChecklistRunReopenable(run: { readonly status: ChecklistRunStatus }): void {
  if (isChecklistRunReopenable(run.status)) {
    return;
  }

  if (run.status === "cancelled") {
    throw new ChecklistError(
      409,
      "CHECKLIST_RUN_CANCELLED",
      "checklist_run_cancelled",
      "Esta vistoria foi cancelada e não pode ser reaberta. Inicie uma nova vistoria pela ordem de serviço.",
    );
  }

  throw new ChecklistError(
    409,
    "CHECKLIST_RUN_NOT_COMPLETED",
    "checklist_run_not_completed",
    "Só uma vistoria já concluída pode ser reaberta. Esta ainda está em andamento — continue o preenchimento normalmente.",
  );
}

/**
 * Recusa a CONCLUSÃO por edição de rascunho. Concluir carrega assinatura, auditoria e evento de domínio
 * (faturamento); deixar o PATCH gravar `completed`/`completed_with_divergence` cravaria a prova jurídica pela
 * porta dos fundos, sem `completed_at`/`completed_by` e sem trilha. O PATCH continua podendo CANCELAR.
 */
/**
 * Junta PR-03 (ALTA do critico-adversarial) — a versão anterior era BLOCKLIST e só barrava as duas
 * conclusões, deixando duas portas abertas:
 *   · rebaixar `completed_with_divergence` para `in_progress` APAGA a divergência da prova — e a
 *     divergência é justamente o que protege a organização numa disputa sobre o veículo;
 *   · levar a vistoria a `pending_acknowledgement` pelo PATCH alcança estado terminal sem passar
 *     pela conclusão (sem assinatura, sem auditoria, sem evento).
 * Vira ALLOWLIST: o PATCH de status só faz o que ele realmente precisa — cancelar. Toda outra
 * transição pertence à ação de domínio correspondente.
 */
export function assertChecklistRunStatusTransition(next: ChecklistRunStatus | undefined): void {
  if (next === undefined || next === "cancelled") return;

  if (next === "completed" || next === "completed_with_divergence") {
    throw new ChecklistError(
      409,
      "CHECKLIST_RUN_COMPLETION_NOT_ALLOWED",
      "run_completion_requires_complete",
      "A conclusão da vistoria é feita pela ação de concluir (com assinatura), não pela edição do rascunho.",
    );
  }

  if (next === "pending_acknowledgement") {
    throw new ChecklistError(
      409,
      "CHECKLIST_RUN_TRANSITION_NOT_ALLOWED",
      "run_acknowledgement_requires_action",
      "A pendência de ciência é criada pela conclusão da vistoria, não pela edição do rascunho.",
    );
  }

  throw new ChecklistError(
    409,
    "CHECKLIST_RUN_TRANSITION_NOT_ALLOWED",
    "run_status_transition_not_allowed",
    "Esta mudança de situação não é feita por edição. Use a ação correspondente na vistoria.",
  );
}

/**
 * Junta PR-03 (MÉDIA): reabrir uma vistoria cujo MODELO já foi arquivado criava uma versão em LIMBO —
 * o técnico abriria um formulário que a organização decidiu aposentar, e o app de campo (que só lista
 * modelos publicados) nem a mostraria para continuar. Recusa com linguagem de negócio e caminho de saída.
 */
export function checklistRunTemplateArchivedError(): ChecklistError {
  return new ChecklistError(
    409,
    "CHECKLIST_TEMPLATE_ARCHIVED",
    "checklist_template_archived",
    "O modelo desta vistoria foi arquivado e não aceita novos preenchimentos. Reative o modelo ou inicie a vistoria por um modelo publicado.",
  );
}

/**
 * Reabertura duplicada: duas correções paralelas da MESMA vistoria concluída deixariam a cadeia de versões
 * ambígua (qual é a vigente?). O banco barra pelo índice parcial único; aqui a recusa vira linguagem de
 * negócio nos dois repositórios.
 */
export function checklistRunAlreadyReopenedError(): ChecklistError {
  return new ChecklistError(
    409,
    "CHECKLIST_RUN_ALREADY_REOPENED",
    "checklist_run_already_reopened",
    "Esta vistoria já foi reaberta e existe uma versão mais recente dela. Abra a versão vigente para continuar.",
  );
}
