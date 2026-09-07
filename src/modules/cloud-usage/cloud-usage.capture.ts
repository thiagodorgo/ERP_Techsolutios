import {
  type CloudUsageMetricKey,
  type RecordUsageEventInput,
} from "./cloud-usage.types.js";
import {
  createMemoryCloudUsageService,
  sanitizeCloudUsageMetadata,
  validateCloudUsageInput,
} from "./cloud-usage.service.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-06 (Ω6R-DIN-005) — CAPTURA TRANSACIONAL da medição faturável da vistoria.
//
// NOME (EMENDA E1·4(4), a partir da `PD-O6R-B06-OUTBOX-IN-DB`): isto NÃO é um Transactional Outbox.
// Não há segundo sistema nem relay — o consumidor do fato é o MESMO banco (o rateio lê esta tabela).
// É escrita atômica com chave natural única, que para o problema do dual write é MAIS forte do que o
// outbox; chamá-la de outbox seria pedir emprestada uma chancela que a literatura não dá. Daí
// `capture`, e daí o contrato `checklist_run_billing@2026-09-06.b-o6r-06` estar escrito em linguagem
// de banco (unique + atomicidade da transação), sem a expressão "exactly-once".
//
// O QUE ESTA CAPTURA COMPRA: antes, a unidade faturável nascia DEPOIS do commit da run, num
// `recordCloudUsageBestEffort(...).catch(warn)` disparado pelo publisher de evento de domínio, com
// chave derivada do `event.id` (`randomUUID()` por emissão). Uma falha entre o commit e a medição
// perdia a unidade PARA SEMPRE: o replay da mesma `client_run_key` devolve `created:false` e o
// serviço PULA a publicação (D-CHK-DISPATCH-CREATE), então nada nunca reparava a sub-contagem.
// Agora a linha de `cloud_usage_events` é inserida DENTRO da transação que insere/conclui a run, com
// chave derivada da RUN. Não existe estado em que a run original exista sem a unidade (I1′/I2′).
//
// FAIL-CLOSED, ASSUMIDO (EMENDA E1·4(3), §10 linha 12): se a medição falhar, a run NÃO commita e o
// técnico recebe erro. É o que o P0 pede, e o acoplamento é mitigado por construção — o builder é
// TOTAL (função pura sobre campos da run, chaves de lista fechada, `quantity ∈ {0,1}`: nunca lança
// para run válida) e o append não tem lógica (um INSERT). O fail-open com alarme foi considerado e
// recusado: é o próprio achado com outro nome.
// -----------------------------------------------------------------------------------------------

/**
 * A superfície MÍNIMA do executor de banco que a captura toca — estrutural, como `PgQueryClient` do
 * arnês. Serve tanto ao `Prisma.TransactionClient` quanto ao cliente estrutural do repositório de
 * checklists, e não arrasta um import de `@prisma/client` para dentro deste módulo.
 */
export type CloudUsageCaptureClient = {
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
};

/** Os dois marcos da vistoria que produzem unidade faturável. */
export type ChecklistRunUsageKind = "created" | "completed";

/** Os campos da run que a medição lê — nada além disto entra na chave nem no valor. */
export type ChecklistRunUsageSource = {
  readonly id: string;
  readonly tenantId: string;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly updatedAt?: Date;
  readonly reopenedFromRunId?: string;
};

export const CHECKLIST_RUN_USAGE_SOURCE_TYPE = "checklist_run";

/** Prefixo da chave natural. A chave é da RUN, nunca da emissão — é isso que torna o replay inócuo. */
export const CHECKLIST_RUN_USAGE_KEY_PREFIX = "checklist_run";

/**
 * Chave de idempotência ESTÁVEL: `checklist_run:{runId}:{metricKey}` (+ `:reopened` na conclusão da
 * versão reaberta, preservando o marcador que a junta PR-03 introduziu). Duas emissões do mesmo fato
 * — replay, reentrega, reconciliação — colidem no unique `(tenant_id, idempotency_key)` e a segunda
 * é descartada pelo `ON CONFLICT ... DO NOTHING`.
 */
export function buildChecklistRunUsageKey(
  runId: string,
  metricKey: CloudUsageMetricKey,
  reopened = false,
): string {
  return `${CHECKLIST_RUN_USAGE_KEY_PREFIX}:${runId}:${metricKey}${reopened ? ":reopened" : ""}`;
}

/**
 * Builder PURO e TOTAL (aceite A16): para toda combinação `status × reopenedFromRunId × kind` devolve
 * entradas válidas e NUNCA lança. Não abre transação, não consulta banco, não chama serviço.
 *
 * `created` → 2 entradas (`checklist_run.created` + `checklist_runs_count`, `quantity 1`). Quem chama
 * é `createRun`/`createRunWithClientKey`, e por construção nenhum dos dois cria run REABERTA — a
 * reabertura tem sítio próprio (`reopenRunWithinTransaction`), que de propósito NÃO mede: cobrar de
 * novo pela correção de um trabalho já cobrado é a regra PR-03, e é o universo de I1′ (`∀ r com
 * reopened_from_run_id IS NULL`). A mutação M-14 (chamar esta captura na reabertura) é justamente o
 * falsificador de A8′/A9/R6.
 *
 * `completed` → 1 entrada, `quantity = reopenedFromRunId ? 0 : 1`, com sufixo `:reopened` na chave.
 */
export function buildChecklistRunUsageEvents(
  kind: ChecklistRunUsageKind,
  run: ChecklistRunUsageSource,
): readonly RecordUsageEventInput[] {
  const reopened = Boolean(run.reopenedFromRunId);
  const base = {
    tenantId: run.tenantId,
    sourceType: CHECKLIST_RUN_USAGE_SOURCE_TYPE,
    sourceId: run.id,
    unit: "count" as const,
    metadata: {
      capturedIn: "checklist_run_transaction",
      runId: run.id,
      ...(reopened ? { reopenedFromRunId: run.reopenedFromRunId } : {}),
    },
  };

  if (kind === "created") {
    return [
      {
        ...base,
        metricKey: "checklist_run.created",
        quantity: 1,
        occurredAt: run.startedAt,
        idempotencyKey: buildChecklistRunUsageKey(run.id, "checklist_run.created"),
      },
      {
        ...base,
        metricKey: "checklist_runs_count",
        quantity: 1,
        occurredAt: run.startedAt,
        idempotencyKey: buildChecklistRunUsageKey(run.id, "checklist_runs_count"),
      },
    ];
  }

  // `pending_acknowledgement` conclui a vistoria para efeito de cobrança SEM carimbar `completed_at`
  // (é o comportamento de hoje — `checklist.service.ts` publica `checklist_run.completed` sem olhar o
  // status). O instante do fato, nesse caso, é o do UPDATE que mudou o status.
  return [
    {
      ...base,
      metricKey: "checklist_run.completed",
      quantity: reopened ? 0 : 1,
      occurredAt: run.completedAt ?? run.updatedAt ?? run.startedAt,
      idempotencyKey: buildChecklistRunUsageKey(run.id, "checklist_run.completed", reopened),
    },
  ];
}

/**
 * SÓ INSERE — nunca chama serviço, nunca abre transação própria. O chamador roda dentro da MESMA
 * transação RLS do repositório dono da run: o INSERT da unidade faturável e o INSERT/UPDATE da run
 * rolam JUNTOS ou NENHUM dos dois. Espelho da disciplina de `impound.outbox.repository.ts`.
 *
 * `$executeRaw` com ALVO EXPLÍCITO, e o alvo é lei (EMENDA E1·4(1), a partir da PD): a opção
 * `createMany({ skipDuplicates: true })` foi RETIRADA do plano porque o Prisma emite `ON CONFLICT DO
 * NOTHING` **sem alvo**, e o PostgreSQL, sem alvo, engole conflito de QUALQUER constraint utilizável
 * — inclusive a PK e qualquer unique futura. Aqui o alvo é `(tenant_id, idempotency_key)` e só ele
 * (o `WHERE idempotency_key IS NOT NULL` é a inferência do índice PARCIAL da migration
 * `20260611000000`, sem o qual o PostgreSQL não consegue inferir o índice).
 *
 * Proibido `create` (P2002 aborta a transação interativa → 25P02, a lição de `createRunWithClientKey`)
 * e proibido `findUnique`+`create` (corrida). `DO NOTHING` só é seguro sob concorrência em READ
 * COMMITTED — premissa PINADA por execução no aceite A13.
 *
 * Devolve quantas linhas foram REALMENTE inseridas (0 = já existia).
 */
export async function appendChecklistRunUsageInTx(
  client: CloudUsageCaptureClient,
  inputs: readonly RecordUsageEventInput[],
): Promise<number> {
  let inserted = 0;

  for (const input of inputs) {
    const validated = validateCloudUsageInput(input);
    const metadata = JSON.stringify(sanitizeCloudUsageMetadata(validated.metadata));

    inserted += await client.$executeRaw`
      INSERT INTO cloud_usage_events (
        tenant_id,
        source_type,
        source_id,
        metric_key,
        quantity,
        unit,
        occurred_at,
        idempotency_key,
        metadata
      )
      VALUES (
        ${validated.tenantId}::uuid,
        ${validated.sourceType},
        ${validated.sourceId ?? null},
        ${validated.metricKey},
        ${validated.quantity}::numeric,
        ${validated.unit},
        ${validated.occurredAt ?? new Date()}::timestamptz,
        ${validated.idempotencyKey ?? null},
        ${metadata}::jsonb
      )
      ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    `;
  }

  return inserted;
}

/**
 * DUBLÊ em memória — para as suítes em memória continuarem exercendo a MESMA semântica pelo MESMO
 * builder. Não é evidência de atomicidade (regra do `financial-uow.ts`): a prova de que run e unidade
 * commitam juntas é a suíte `-db`, contra Postgres de verdade.
 */
export async function appendChecklistRunUsageInMemory(
  inputs: readonly RecordUsageEventInput[],
): Promise<void> {
  if (inputs.length === 0) return;

  await createMemoryCloudUsageService().recordManyUsageEvents(inputs);
}
