import type { Prisma, PrismaClient } from "@prisma/client";
import pino from "pino";

import { env } from "../../../config/env.js";
import { withTenantRls } from "../../../database/rls.js";
import { ChecklistError } from "../checklist.types.js";
import type { ChecklistApplicabilityRepository } from "./checklist-applicability.repository.js";
import {
  ChecklistApplicabilityError,
  checklistApplicabilityBucketConflictError,
  checklistApplicabilityServiceAxisError,
  type ChecklistApplicabilityRole,
  type ChecklistApplicabilityRule,
  type CreateChecklistApplicabilityRuleInput,
  type ListChecklistApplicabilityRulesFilter,
  type UpdateChecklistApplicabilityRuleInput,
} from "./checklist-applicability.types.js";

// CHECKLIST P1 PR-04a — persistência PostgreSQL da REGRA DE APLICABILIDADE.
//
// Este arquivo é o GÊMEO do `InMemoryChecklistApplicabilityRepository`. A paridade entre os dois não é
// preciosismo de teste: o vínculo com a ordem de serviço é STICKY na criação (PR-04b), então uma divergência
// aqui congela vistorias DIFERENTES conforme o modo de persistência — e uma vistoria congelada não se
// re-decide depois, porque a ordem já foi despachada e o veículo já foi coletado.
//
// Os três pontos onde a paridade é frágil, e por isso estão marcados no código abaixo:
//   1. NULL (banco) ↔ `undefined` (domínio) — NULL aqui é o VALOR "qualquer", não ausência de dado;
//   2. o tri-state do `update` (`null` limpa o eixo, `undefined` não mexe);
//   3. o conflito de bucket, que vem do ÍNDICE (autoridade única), nunca de um SELECT prévio.
//
// NASCE INERTE: nenhuma rota, serviço ou controller consome este repositório nesta fatia (o CRUD entra na
// PR-04c, junto com o consumidor). Ele existe agora para que a fatia seguinte não precise escolher entre
// "publicar rápido" e "publicar com persistência real provada contra o Postgres".

const logger = pino({ level: env.LOG_LEVEL });

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

/**
 * Projeção EXPLÍCITA das colunas do domínio.
 *
 * Duas razões para listar em vez de deixar o Prisma trazer tudo: (a) uma coluna nova acrescentada no futuro
 * (um JSON de condições, por exemplo) não entra sozinha no caminho quente da resolução; (b) o mapeador passa a
 * ter uma forma de entrada exata, então esquecer de mapear um campo vira erro de compilação e não um campo que
 * chega `undefined` em produção. A projeção é COMPLETA de propósito: uma projeção parcial devolveria um objeto
 * do tipo `ChecklistApplicabilityRule` com `notes` sempre vazio, e o chamador não teria como distinguir "sem
 * observação" de "não busquei a observação" — divergência silenciosa contra o repositório em memória.
 */
const RULE_SELECT = {
  id: true,
  tenant_id: true,
  template_id: true,
  service_catalog_id: true,
  service_type: true,
  customer_id: true,
  role: true,
  is_active: true,
  notes: true,
  created_by: true,
  updated_by: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
} satisfies Prisma.ChecklistApplicabilityRuleSelect;

type ChecklistApplicabilityRuleRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly template_id: string;
  readonly service_catalog_id: string | null;
  readonly service_type: string | null;
  readonly customer_id: string | null;
  readonly role: string;
  readonly is_active: boolean;
  readonly notes: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
};

export class PrismaChecklistApplicabilityRepository implements ChecklistApplicabilityRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateChecklistApplicabilityRuleInput): Promise<ChecklistApplicabilityRule> {
    try {
      const record = await this.client.checklistApplicabilityRule.create({
        data: {
          tenant_id: input.tenantId,
          template_id: input.templateId,
          // `undefined` no domínio é o curinga "qualquer"; no banco isso é NULL, e NULL participa do índice
          // como VALOR (`NULLS NOT DISTINCT`) — é o ÍNDICE que faz duas regras curinga do mesmo bucket
          // colidirem, não estas linhas. O `?? null` é explicitação: o Prisma já omitiria a chave `undefined`
          // e a coluna anulável viraria NULL do mesmo jeito (medido pelo verificador: remover os três `??`
          // mantém a suíte verde). Fica explícito porque "qualquer" é uma ESCOLHA de negócio aqui, não um
          // campo que o chamador esqueceu de preencher — e quem ler precisa ver isso.
          service_catalog_id: input.serviceCatalogId ?? null,
          service_type: input.serviceType ?? null,
          customer_id: input.customerId ?? null,
          role: input.role,
          is_active: input.isActive ?? true,
          notes: input.notes ?? null,
          created_by: input.createdBy ?? null,
        },
        select: RULE_SELECT,
      });

      return mapRuleRecord(record);
    } catch (error) {
      throw sanitizeApplicabilityFailure(error, "create");
    }
  }

  async findById(tenantId: string, ruleId: string): Promise<ChecklistApplicabilityRule | undefined> {
    try {
      // SEM filtro de `deleted_at`: o repositório em memória também devolve a regra apagada aqui, e quem
      // decide o que fazer com ela é o chamador (`update`/`softDelete` recusam; a tela de histórico mostra).
      const record = await this.client.checklistApplicabilityRule.findFirst({
        where: { tenant_id: tenantId, id: ruleId },
        select: RULE_SELECT,
      });

      return record ? mapRuleRecord(record) : undefined;
    } catch (error) {
      throw sanitizeApplicabilityFailure(error, "find-by-id");
    }
  }

  async list(filter: ListChecklistApplicabilityRulesFilter): Promise<readonly ChecklistApplicabilityRule[]> {
    try {
      const records = await this.client.checklistApplicabilityRule.findMany({
        where: {
          tenant_id: filter.tenantId,
          ...(filter.includeDeleted ? {} : { deleted_at: null }),
          ...(filter.templateId ? { template_id: filter.templateId } : {}),
          ...(filter.role ? { role: filter.role } : {}),
        },
        // `id` como segunda chave porque `created_at` empata: duas regras criadas no mesmo microssegundo
        // sairiam em ordem arbitrária do Postgres, e uma listagem paginada sem ordem total repete ou pula
        // linhas entre páginas.
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
        select: RULE_SELECT,
      });

      return records.map(mapRuleRecord);
    } catch (error) {
      throw sanitizeApplicabilityFailure(error, "list");
    }
  }

  async listActive(tenantId: string): Promise<readonly ChecklistApplicabilityRule[]> {
    try {
      // A ENTRADA DA RESOLUÇÃO. O predicado (`is_active` + `deleted_at IS NULL`) é o mesmo do índice parcial e
      // vai para o SQL: a regra desativada nem chega ao processo. Só o desempate roda em JS
      // (`compareApplicabilityRules`), porque a ordem que decide qual vistoria o técnico recebe não pode
      // depender do plano do banco.
      const records = await this.client.checklistApplicabilityRule.findMany({
        where: { tenant_id: tenantId, is_active: true, deleted_at: null },
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
        select: RULE_SELECT,
      });

      return records.map(mapRuleRecord);
    } catch (error) {
      throw sanitizeApplicabilityFailure(error, "list-active");
    }
  }

  async update(input: UpdateChecklistApplicabilityRuleInput): Promise<ChecklistApplicabilityRule | undefined> {
    try {
      // `updateManyAndReturn` com o `deleted_at: null` DENTRO do `where`: a guarda "não mexe em regra apagada"
      // e a escrita são o mesmo comando. Um `findById` antes seria check-then-act — entre a leitura e a
      // escrita outra sessão apaga a regra e o update ressuscitaria uma regra que a organização removeu.
      const rows = await this.client.checklistApplicabilityRule.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.ruleId, deleted_at: null },
        // TRI-STATE, e ele é literal: `null` chega ao Prisma e vira NULL (o eixo volta a "qualquer");
        // `undefined` é REMOVIDO por `withoutUndefined` e a coluna não é tocada.
        //
        // NÃO "simplifique" para `input.serviceCatalogId ?? null`: isso transformaria "não mexer" em "limpar",
        // e uma edição só do rótulo apagaria em silêncio o cliente e o serviço da regra — a exigência
        // contratual do cliente viraria uma regra curinga que passa a valer para TODO MUNDO.
        data: withoutUndefined({
          service_catalog_id: input.serviceCatalogId,
          service_type: input.serviceType,
          customer_id: input.customerId,
          role: input.role,
          is_active: input.isActive,
          notes: input.notes,
          updated_by: input.updatedBy,
        }),
        select: RULE_SELECT,
      });

      return rows[0] ? mapRuleRecord(rows[0]) : undefined;
    } catch (error) {
      throw sanitizeApplicabilityFailure(error, "update");
    }
  }

  async softDelete(
    tenantId: string,
    ruleId: string,
    actorUserId?: string,
  ): Promise<ChecklistApplicabilityRule | undefined> {
    try {
      // `is_active = false` JUNTO com `deleted_at`: os dois entram no predicado do índice parcial, e gravar só
      // um deles deixaria a regra apagada ainda ocupando o bucket — a organização não conseguiria cadastrar a
      // substituta sem apagar a linha de verdade, perdendo o registro de por que a regra existiu.
      const rows = await this.client.checklistApplicabilityRule.updateManyAndReturn({
        where: { tenant_id: tenantId, id: ruleId, deleted_at: null },
        data: withoutUndefined({ is_active: false, deleted_at: new Date(), updated_by: actorUserId }),
        select: RULE_SELECT,
      });

      return rows[0] ? mapRuleRecord(rows[0]) : undefined;
    } catch (error) {
      throw sanitizeApplicabilityFailure(error, "soft-delete");
    }
  }
}

/**
 * Wrapper de isolamento. Cada método roda dentro de UMA transação com `app.current_tenant_id` setado, que é o
 * que a política RLS da tabela lê. O filtro `tenant_id` das queries continua existindo de propósito: em
 * desenvolvimento a conexão é superusuário e o Postgres ignora RLS para esse papel — sem o filtro na query, o
 * isolamento seria provado só onde ele não é necessário.
 */
export class RlsPrismaChecklistApplicabilityRepository implements ChecklistApplicabilityRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateChecklistApplicabilityRuleInput): Promise<ChecklistApplicabilityRule> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaChecklistApplicabilityRepository(tx).create(input),
    );
  }

  findById(tenantId: string, ruleId: string): Promise<ChecklistApplicabilityRule | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaChecklistApplicabilityRepository(tx).findById(tenantId, ruleId),
    );
  }

  list(filter: ListChecklistApplicabilityRulesFilter): Promise<readonly ChecklistApplicabilityRule[]> {
    return withTenantRls(this.prismaClient, filter.tenantId, (tx) =>
      new PrismaChecklistApplicabilityRepository(tx).list(filter),
    );
  }

  listActive(tenantId: string): Promise<readonly ChecklistApplicabilityRule[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaChecklistApplicabilityRepository(tx).listActive(tenantId),
    );
  }

  update(input: UpdateChecklistApplicabilityRuleInput): Promise<ChecklistApplicabilityRule | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaChecklistApplicabilityRepository(tx).update(input),
    );
  }

  softDelete(
    tenantId: string,
    ruleId: string,
    actorUserId?: string,
  ): Promise<ChecklistApplicabilityRule | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaChecklistApplicabilityRepository(tx).softDelete(tenantId, ruleId, actorUserId),
    );
  }
}

export async function createPrismaChecklistApplicabilityRepository(): Promise<RlsPrismaChecklistApplicabilityRepository> {
  const { prisma } = await import("../../../database/prisma.js");

  return new RlsPrismaChecklistApplicabilityRepository(prisma);
}

/**
 * NULL → `undefined` em TODOS os eixos.
 *
 * Errar isto é o bug mais caro e mais silencioso desta fatia: a resolução compara `rule.customerId !==
 * undefined` para decidir se a regra é curinga. Um `null` vazando para o domínio passa nessa comparação, a
 * regra curinga deixa de casar QUALQUER contexto, e o efeito visível é "cadastrei a vistoria padrão e ela
 * nunca aparece" — com o banco cheio de regras corretas.
 */
function mapRuleRecord(record: ChecklistApplicabilityRuleRecord): ChecklistApplicabilityRule {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    templateId: record.template_id,
    serviceCatalogId: record.service_catalog_id ?? undefined,
    serviceType: record.service_type ?? undefined,
    customerId: record.customer_id ?? undefined,
    // O CHECK `checklist_applicability_rules_role_chk` é quem garante que só as três fases do domínio existem
    // no banco. O casamento entre o CHECK e a união de TypeScript é travado por teste
    // (`tests/checklist-applicability-prisma-db.test.ts`): estender um sem o outro reprova a suíte — é o mesmo
    // par que já produziu o hotfix P-CHK-COMPONENT-TYPE-CHECK, ali na direção inversa.
    role: record.role as ChecklistApplicabilityRole,
    isActive: record.is_active,
    notes: record.notes ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

/**
 * Remove as chaves `undefined` preservando as `null`. É o que materializa o tri-state do `update`: o que não
 * veio no pedido não vira coluna no UPDATE; o que veio como `null` vira `NULL` explícito.
 */
function withoutUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

/**
 * Classificador ÚNICO das falhas de banco desta tabela — nenhum método fica nu.
 *
 * Por que isto não é zelo excessivo (medido contra o Postgres real deste repositório, 2026-08-10):
 *   - a violação do índice de bucket chega como `P2002`, e a mensagem do Prisma embute o CAMINHO ABSOLUTO do
 *     arquivo no servidor mais o trecho da query;
 *   - a violação de CHECK chega como um `DriverAdapterError` CRU, sem `code` no topo, cujo `cause.detail`
 *     carrega A LINHA INTEIRA que falhou — inclusive o `tenant_id` (§2.8) — e cuja `message` é o texto do
 *     Postgres com o nome interno da constraint;
 *   - `sendRouteError` devolve qualquer `Error` solto como HTTP 400 com `error.message` literal.
 *
 * A ordem importa: recusa de NEGÓCIO passa intacta (é a única que o administrador resolve sozinho); depois o
 * que é dado inválido (409/400); e o resto vira falha de infraestrutura separando TRANSITÓRIO (repetir
 * resolve) de DETERMINÍSTICO (repetir nunca resolve — mandar tentar de novo é orientação impossível).
 */
function sanitizeApplicabilityFailure(error: unknown, operation: string): unknown {
  if (error instanceof ChecklistError) {
    return error;
  }

  // A ÚNICA chave única desta tabela é o índice de bucket (a primária é `gen_random_uuid()`, que na prática
  // não colide). Por isso toda violação de unicidade aqui É o conflito de bucket, e ele é uma recusa de
  // NEGÓCIO com texto que o administrador entende — não um erro de banco.
  if (isUniqueViolation(error)) {
    return checklistApplicabilityBucketConflictError();
  }

  if (isForeignKeyViolation(error)) {
    return invalidReferenceError(error);
  }

  if (isCheckViolation(error)) {
    return checkViolationError(error);
  }

  const transient = isTransientDatabaseFailure(error);

  // Campos ESTRUTURADOS. O objeto de erro cru nunca entra no log: é `message`/`cause.detail` que carregam o
  // caminho do servidor, o trecho da query e a linha que falhou com o `tenant_id` dentro.
  logger.error(
    {
      operation,
      code: databaseErrorCodes(error).join("/") || "unknown",
      reason: errorReason(error),
      transient,
    },
    "checklist.applicability: falha de banco sanitizada antes de responder ao cliente",
  );

  return transient
    ? new ChecklistApplicabilityError(
        503,
        "CHECKLIST_APPLICABILITY_UNAVAILABLE",
        "applicability_unavailable",
        "Não foi possível concluir agora porque o sistema estava ocupado. Tente novamente em alguns instantes.",
      )
    : new ChecklistApplicabilityError(
        500,
        "CHECKLIST_APPLICABILITY_FAILED",
        "applicability_failed",
        "Não foi possível concluir a operação sobre as regras de vistoria. Repetir não resolve; acione o suporte.",
      );
}

/**
 * FK violada = referência que não existe NESTA organização. As chaves são compostas tenant-first, então
 * apontar para o modelo/cliente/serviço de outra organização produz exatamente este erro — e a resposta não
 * pode nem confirmar nem negar que o registro existe em outro lugar (§2.8).
 *
 * A identificação usa o campo ESTRUTURADO da constraint que o driver devolve, nunca a mensagem.
 */
function invalidReferenceError(error: unknown): ChecklistApplicabilityError {
  const constraint = structuredConstraintHint(error);

  const detalhe = constraint.includes("template")
    ? "O modelo de vistoria informado não existe nesta organização."
    : constraint.includes("service_catalog")
      ? "O serviço informado não existe nesta organização."
      : constraint.includes("customer")
        ? "O cliente informado não existe nesta organização."
        : "Um dos registros informados não existe nesta organização.";

  return new ChecklistApplicabilityError(
    400,
    "CHECKLIST_APPLICABILITY_INVALID_REFERENCE",
    "applicability_invalid_reference",
    detalhe,
  );
}

/**
 * CHECK violado — a última linha de defesa, quando a validação de entrada deixou passar.
 *
 * A CLASSIFICAÇÃO é pelo código (23514), nunca pelo texto. O nome da constraint é lido da mensagem apenas para
 * ESCOLHER uma explicação melhor, e o texto do Postgres jamais entra na resposta: se o nome não for
 * reconhecido, a mensagem genérica assume.
 */
function checkViolationError(error: unknown): ChecklistApplicabilityError {
  if (checkConstraintName(error).includes("service_axis")) {
    return checklistApplicabilityServiceAxisError();
  }

  return new ChecklistApplicabilityError(
    400,
    "CHECKLIST_APPLICABILITY_RULE_INVALID",
    "applicability_rule_invalid",
    "Os dados da regra não são válidos. Revise a etapa da vistoria e o critério de serviço antes de salvar.",
  );
}

/**
 * Códigos candidatos de um erro de banco, varrendo os níveis em que cada camada esconde o seu.
 *
 * Não é paranoia: com o driver adapter do PostgreSQL, medido neste repositório, `P2002`/`P2003` aparecem no
 * topo, mas o SQLSTATE real (`23505`, `23503`, `23514`) só existe em `cause.code`/`cause.originalCode` ou
 * dentro de `meta.driverAdapterError.cause`. Um classificador que olhasse apenas `error.code` (como o da
 * reabertura de vistoria) simplesmente NÃO ENXERGA a violação de CHECK — ela não tem código no topo.
 */
function databaseErrorCodes(error: unknown): readonly string[] {
  const codes: string[] = [];

  const collect = (candidate: unknown, depth: number): void => {
    if (depth > 4 || typeof candidate !== "object" || candidate === null) return;

    const record = candidate as Record<string, unknown>;

    for (const key of ["code", "originalCode"]) {
      const value = record[key];

      if (typeof value === "string") codes.push(value);
    }

    collect(record.cause, depth + 1);
    collect(record.meta, depth + 1);
    collect(record.driverAdapterError, depth + 1);
  };

  collect(error, 0);

  return codes;
}

function hasDatabaseErrorCode(error: unknown, codes: readonly string[]): boolean {
  const found = new Set(databaseErrorCodes(error));

  return codes.some((code) => found.has(code));
}

function isUniqueViolation(error: unknown): boolean {
  return hasDatabaseErrorCode(error, ["P2002", "23505"]);
}

function isForeignKeyViolation(error: unknown): boolean {
  return hasDatabaseErrorCode(error, ["P2003", "23503"]);
}

function isCheckViolation(error: unknown): boolean {
  return hasDatabaseErrorCode(error, ["23514"]);
}

/**
 * Falha que o TEMPO resolve: contenção, serialização, deadlock, timeout da transação interativa e queda de
 * conexão. Só nestes casos a resposta convida a repetir. Mesma lista da reabertura de vistoria — duplicada
 * porque lá ela é privada do arquivo e esta fatia não tem permissão para mexer nele; consolidar num utilitário
 * de banco é trabalho de uma fatia que possa tocar os dois.
 */
function isTransientDatabaseFailure(error: unknown): boolean {
  return hasDatabaseErrorCode(error, [
    "P1001", // não alcançou o banco
    "P1002", // timeout de conexão
    "P1008", // timeout da operação
    "P1017", // servidor fechou a conexão
    "P2024", // esgotou o pool esperando conexão
    "P2028", // transação interativa expirada/encerrada
    "P2034", // write conflict / deadlock
    "40001", // serialization_failure
    "40P01", // deadlock_detected
    "55P03", // lock_not_available
    "57014", // query_canceled (statement_timeout)
    "53300", // too_many_connections
    "08000",
    "08003",
    "08006", // connection_exception
  ]);
}

/**
 * Identificadores ESTRUTURADOS da constraint (nome do índice e colunas), que o driver entrega em campos
 * próprios. Nunca a mensagem — e o que sai daqui serve só para escolher a explicação, jamais vai na resposta.
 */
function structuredConstraintHint(error: unknown): string {
  const pieces: string[] = [];

  const collect = (candidate: unknown, depth: number): void => {
    if (depth > 5 || typeof candidate !== "object" || candidate === null) return;

    const record = candidate as Record<string, unknown>;

    for (const key of ["index", "field_name", "target", "constraint_name", "column"]) {
      const value = record[key];

      if (typeof value === "string") pieces.push(value);
      if (Array.isArray(value)) pieces.push(value.filter((item): item is string => typeof item === "string").join(" "));
    }

    const fields = record.fields;

    if (Array.isArray(fields)) {
      pieces.push(fields.filter((item): item is string => typeof item === "string").join(" "));
    }

    collect(record.cause, depth + 1);
    collect(record.meta, depth + 1);
    collect(record.driverAdapterError, depth + 1);
    collect(record.constraint, depth + 1);
  };

  collect(error, 0);

  return pieces.join(" ").toLowerCase();
}

/**
 * Nome da constraint de CHECK. O Postgres só o entrega dentro do texto da mensagem, então aqui — e SÓ aqui —
 * há leitura de texto. O resultado nunca chega ao cliente: ele apenas escolhe entre duas mensagens escritas
 * à mão, e um nome desconhecido cai na genérica.
 */
function checkConstraintName(error: unknown): string {
  const messages: string[] = [];

  const collect = (candidate: unknown, depth: number): void => {
    if (depth > 4 || typeof candidate !== "object" || candidate === null) return;

    const record = candidate as Record<string, unknown>;

    for (const key of ["message", "originalMessage"]) {
      const value = record[key];

      if (typeof value === "string") messages.push(value);
    }

    collect(record.cause, depth + 1);
    collect(record.meta, depth + 1);
    collect(record.driverAdapterError, depth + 1);
  };

  collect(error, 0);

  const match = /violates check constraint "([^"]+)"/.exec(messages.join(" "));

  return match?.[1] ?? "";
}

/** Motivo REDIGIDO para o log: nome/`reason` do erro, nunca a mensagem — é ela que carrega caminho e query. */
function errorReason(error: unknown): string {
  if (error && typeof error === "object" && "reason" in error) {
    return String((error as { readonly reason?: unknown }).reason ?? "error");
  }

  if (error instanceof Error) return error.name;

  return "error";
}
