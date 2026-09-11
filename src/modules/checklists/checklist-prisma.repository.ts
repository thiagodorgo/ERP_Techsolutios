import type { PrismaClient } from "@prisma/client";
import pino from "pino";

import { env } from "../../config/env.js";
import { withTenantRls } from "../../database/rls.js";
import {
  appendChecklistRunUsageInTx,
  buildChecklistRunUsageEvents,
} from "../cloud-usage/cloud-usage.capture.js";
import { EnterpriseAuditLogService } from "../core-saas/audit/audit-log.service.js";
import type { AuditLogWriter } from "../core-saas/audit/audit-log.service.js";
import type { ChecklistAuditEvent } from "./checklist.audit.js";
import {
  assertChecklistRunCompletionTarget,
  assertChecklistRunFieldWritable,
  assertChecklistRunMutable,
  assertChecklistRunReopenable,
  assertChecklistRunStatusTransition,
  checklistRunAlreadyReopenedError,
  checklistRunTemplateArchivedError,
  CHECKLIST_RUN_ACTIVE_STATUSES,
} from "./checklist.run-lifecycle.js";
import { ChecklistError } from "./checklist.types.js";
import type {
  ChecklistAcknowledgement,
  ChecklistAttachment,
  ChecklistComponentType,
  ChecklistMarker,
  ChecklistRun,
  ChecklistRunAnswer,
  ChecklistRunRole,
  ChecklistRunStatus,
  ChecklistStatus,
  ChecklistTemplate,
  ChecklistTemplateComponent,
  ChecklistType,
  JsonRecord,
} from "./checklist.types.js";
import type {
  ChecklistRepository,
  CompleteRunBilling,
  CreateRunData,
  CreateRunResult,
  CreateTemplateData,
  ReopenRunData,
  ReopenRunResult,
  RepositoryRunDetails,
  UpdateRunData,
  UpdateTemplateData,
} from "./checklist.repository.js";
import type {
  CreateChecklistAcknowledgementInput,
  CreateChecklistAttachmentInput,
  CreateChecklistMarkerInput,
} from "./checklist.validator.js";

// Logger do projeto (mesmo padrão de charging/impound). `console.error` ignorava LOG_LEVEL — no CI, que roda
// com LOG_LEVEL=silent, o erro cru do Prisma ia para o stdout do job assim mesmo.
const logger = pino({ level: env.LOG_LEVEL });

type PrismaModelDelegate = {
  findMany(args?: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<unknown>;
  createMany(args: unknown): Promise<unknown>;
  upsert?(args: unknown): Promise<unknown>;
};

type PrismaChecklistClient = {
  checklistTemplate: PrismaModelDelegate;
  checklistTemplateComponent: PrismaModelDelegate;
  checklistRun: PrismaModelDelegate;
  checklistRunAnswer: PrismaModelDelegate;
  checklistAttachment: PrismaModelDelegate;
  checklistMarker: PrismaModelDelegate;
  checklistAcknowledgement: PrismaModelDelegate;
  auditLog: PrismaModelDelegate;
  // P0a — INSERT ... ON CONFLICT DO NOTHING RETURNING para a criação idempotente-durável de run (createRun com
  // client_run_key). O tagged-template do Prisma; tipado frouxo (o repo já recebe o `tx` por cast opaco).
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  // B-O6R-06 (Omega6R-DIN-005) — INSERT ... ON CONFLICT (tenant_id, idempotency_key) DO NOTHING da
  // unidade FATURAVEL, na MESMA transacao da run (`cloud-usage.capture.ts`). Mesma tipagem frouxa do
  // `$queryRaw` acima: o repositorio ja recebe o `tx` por cast opaco.
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
};

export class PrismaChecklistRepository implements ChecklistRepository {
  constructor(private readonly client: PrismaChecklistClient) {}

  async listTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    const records = await this.client.checklistTemplate.findMany({
      where: {
        tenant_id: tenantId,
        status: {
          not: "archived",
        },
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return records.map(mapTemplateRecord);
  }

  async listPublishedTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    const records = await this.client.checklistTemplate.findMany({
      where: {
        tenant_id: tenantId,
        status: "published",
        deleted_at: null,
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return records.map(mapTemplateRecord);
  }

  async createTemplate(data: CreateTemplateData): Promise<ChecklistTemplate> {
    const record = await this.client.checklistTemplate.create({
      data: {
        tenant_id: data.tenantId,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        status: "draft",
        version: 1,
        schema: data.schema,
        created_by: data.actorUserId,
        updated_by: data.actorUserId,
        components: {
          // P-CHK-TEMPLATE-PRISMA-V7 — NÃO passar `tenant_id` aqui: é relation-scalar COMPARTILHADO entre a relação
          // `template` (FK composta [tenant_id, template_id], setada pelo nested-create do pai) e a relação `tenant`.
          // O Prisma v7 rejeita o argumento explícito ("Unknown argument tenant_id") e o infere do template pai.
          create: data.components.map((component, index) => ({
            component_key: component.componentKey ?? `${component.type}_${index + 1}`,
            type: component.type,
            label: component.label,
            required: component.required,
            order_index: component.orderIndex ?? index,
            config: component.config,
            validation_rules: component.validationRules,
            visibility_rules: component.visibilityRules,
          })),
        },
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return mapTemplateRecord(record);
  }

  async getTemplate(tenantId: string, checklistId: string): Promise<ChecklistTemplate | null> {
    const record = await this.client.checklistTemplate.findFirst({
      where: {
        id: checklistId,
        tenant_id: tenantId,
        status: {
          not: "archived",
        },
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return record ? mapTemplateRecord(record) : null;
  }

  async updateTemplate(data: UpdateTemplateData): Promise<ChecklistTemplate | null> {
    const existing = await this.getTemplate(data.tenantId, data.checklistId);

    if (!existing) {
      return null;
    }

    // CHECKLIST P1 PR-02c (ALTA da junta) — PRESERVA a identidade dos componentes.
    //
    // O caminho anterior era `deleteMany` + `create` de TODOS os componentes: cada Salvar
    // rotacionava os UUIDs, mesmo quando nada de estrutura mudava. Provado contra o Postgres:
    // salvar só o NOME do modelo já trocava `id` dos dois componentes (componentKey sobrevivia).
    //
    // Por que isso perdia trabalho de campo: `checklist_run_answers.component_id` referencia o
    // componente com `onDelete: Restrict`. Um técnico offline que respondeu com o id ANTIGO tem a
    // resposta recusada para sempre quando sincroniza (o componente não existe mais); e um modelo
    // que já tem resposta nem consegue ser salvo — o `deleteMany` estoura P2003 cru.
    //
    // Agora a reconciliação é por `component_key` (a chave ESTÁVEL, que já sobrevivia):
    //   · chave que continua → UPDATE no lugar (o `id` permanece, respostas seguem válidas);
    //   · chave nova → CREATE;
    //   · chave removida → DELETE (e aqui o Restrict é CORRETO: apagar um componente respondido
    //     deve falhar; o serviço traduz para 409 em vez de vazar o erro cru do Postgres).
    if (data.components) {
      const desired = data.components.map((component, index) => ({
        componentKey: component.componentKey ?? `${component.type}_${index + 1}`,
        type: component.type,
        label: component.label,
        required: component.required,
        orderIndex: component.orderIndex ?? index,
        config: component.config,
        validationRules: component.validationRules,
        visibilityRules: component.visibilityRules,
      }));

      const desiredKeys = new Set(desired.map((component) => component.componentKey));
      const currentKeys = new Set(existing.components.map((component) => component.componentKey));

      const removedKeys = [...currentKeys].filter((key) => !desiredKeys.has(key));
      if (removedKeys.length > 0) {
        await this.client.checklistTemplateComponent.deleteMany({
          where: {
            tenant_id: data.tenantId,
            template_id: data.checklistId,
            component_key: { in: removedKeys },
          },
        });
      }

      for (const component of desired) {
        if (currentKeys.has(component.componentKey)) {
          await this.client.checklistTemplateComponent.updateMany({
            where: {
              tenant_id: data.tenantId,
              template_id: data.checklistId,
              component_key: component.componentKey,
            },
            data: {
              type: component.type,
              label: component.label,
              required: component.required,
              order_index: component.orderIndex,
              config: component.config,
              validation_rules: component.validationRules,
              visibility_rules: component.visibilityRules,
            },
          });
        }
      }
    }

    const componentsToCreate = data.components
      ? data.components
          .map((component, index) => ({
            component_key: component.componentKey ?? `${component.type}_${index + 1}`,
            type: component.type,
            label: component.label,
            required: component.required,
            order_index: component.orderIndex ?? index,
            config: component.config,
            validation_rules: component.validationRules,
            visibility_rules: component.visibilityRules,
          }))
          .filter((component) => !existing.components.some((current) => current.componentKey === component.component_key))
      : [];

    const record = await this.client.checklistTemplate.update({
      where: {
        tenant_id_id: {
          tenant_id: data.tenantId,
          id: data.checklistId,
        },
      },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        // CHECKLIST P1 PR-02c (P-CHK-PATCH-SEM-TYPE) — a coluna `type` ja existia em
        // `checklist_templates` (nao ha migration aqui); faltava so grava-la no update.
        ...(data.type ? { type: data.type } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.schema ? { schema: data.schema } : {}),
        updated_by: data.actorUserId,
        ...(componentsToCreate.length > 0
          ? {
              components: {
                // P-CHK-TEMPLATE-PRISMA-V7 — `tenant_id` é inferido do template pai (relation-scalar
                // compartilhado template/tenant); passá-lo explícito quebra no runtime do Prisma v7.
                create: componentsToCreate,
              },
            }
          : {}),
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return mapTemplateRecord(record);
  }

  async archiveTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    const existing = await this.getTemplate(tenantId, checklistId);

    if (!existing) {
      return null;
    }

    const record = await this.client.checklistTemplate.update({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: checklistId,
        },
      },
      data: {
        status: "archived",
        deleted_at: new Date(),
        updated_by: actorUserId,
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return mapTemplateRecord(record);
  }

  async publishTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    const existing = await this.getTemplate(tenantId, checklistId);

    if (!existing) {
      return null;
    }

    const record = await this.client.checklistTemplate.update({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: checklistId,
        },
      },
      data: {
        status: "published",
        version: existing.status === "published" ? existing.version : existing.version + 1,
        schema: {
          ...existing.schema,
          components: existing.components.map((component) => ({
            id: component.id,
            componentKey: component.componentKey,
            type: component.type,
            label: component.label,
            required: component.required,
            orderIndex: component.orderIndex,
            config: component.config,
            validationRules: component.validationRules,
            visibilityRules: component.visibilityRules,
          })),
        },
        published_at: new Date(),
        updated_by: actorUserId,
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return mapTemplateRecord(record);
  }

  async listTemplatesByType(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return this.listPublishedTemplates(tenantId);
  }

  async createRun(data: CreateRunData, template: ChecklistTemplate): Promise<CreateRunResult> {
    // P0a — idempotência durável do replay de `checklist.run_create`. Com client_run_key, pré-checa (atalho
    // feliz) e insere via ON CONFLICT DO NOTHING (não pelo `create`, que abortaria a tx no P2002) — ver
    // `createRunWithClientKey`. Sem chave (web/despacho manual), o `create` normal roda: NULLs distintos no
    // unique [tenant_id, client_run_key] → nunca colidem entre si, sempre `created:true`.
    if (data.clientRunKey) {
      const existing = await this.getRunByClientKey(data.tenantId, data.clientRunKey);

      if (existing) {
        return { run: existing, created: false };
      }

      return this.createRunWithClientKey(data, template, data.clientRunKey);
    }

    const record = await this.client.checklistRun.create({
      data: {
        tenant_id: data.tenantId,
        template_id: template.id,
        template_version: template.version,
        related_entity_type: data.relatedEntityType ?? null,
        related_entity_id: data.relatedEntityId ?? null,
        client_run_key: null,
        status: "in_progress",
        started_by: data.actorUserId,
        answers: {
          // P-CHK-TEMPLATE-PRISMA-V7 (bug IRMÃO, achado da junta dba) — MESMO defeito do createTemplate: `tenant_id`
          // é relation-scalar COMPARTILHADO (`run` [tenant_id, run_id] + `component` [tenant_id, component_id] +
          // `tenant`), inferido do run pai. Passá-lo explícito quebra em `POST /checklists/:id/runs` com answers
          // (caminho REST/web) → 500 no runtime do Prisma v7. Mascarado pela suíte em memória.
          create: data.answers.map((answer) => ({
            component_id: answer.componentId,
            value: answer.value,
            metadata: answer.metadata,
          })),
        },
      },
    });

    const run = mapRunRecord(record);

    // B-O6R-06 (Omega6R-DIN-005) — a unidade FATURAVEL nasce AQUI, dentro da MESMA transacao interativa
    // que `withTenantRls` abriu para todo o `createRun`. Ou a run e as duas linhas de
    // `cloud_usage_events` commitam juntas, ou nenhuma existe (F1). Nao ha mais a janela "run confirmada,
    // medicao perdida" que o achado descreve.
    await appendChecklistRunUsageInTx(this.client, buildChecklistRunUsageEvents("created", run));

    return { run, created: true };
  }

  // P0a (conserto MÉDIA da junta) — insere a run com client_run_key SEM nunca abortar a transação sob corrida.
  // `withTenantRls` envolve TODO o createRun numa ÚNICA transação interativa; se usássemos `create`, o perdedor
  // da corrida sofreria unique violation (23505/P2002), a transação entraria em ABORTED, e a re-busca no
  // `catch` falharia com 25P02 ("current transaction is aborted") → createRun LANÇARIA em vez de devolver
  // `created:false` (Prisma não cria savepoint por query em tx interativa). A cura na RAIZ é
  // `INSERT ... ON CONFLICT (tenant_id, client_run_key) DO NOTHING RETURNING`: o DO NOTHING NÃO erra, então a
  // transação continua VÁLIDA — 0 linhas ⇒ conflito ⇒ um SELECT normal (`getRunByClientKey`, tx ainda viva)
  // devolve a run do vencedor com `created:false`; 1 linha ⇒ inserimos com `created:true`. Nunca há 23505/25P02.
  private async createRunWithClientKey(
    data: CreateRunData,
    template: ChecklistTemplate,
    clientRunKey: string,
  ): Promise<CreateRunResult> {
    // Colunas com default no banco (id, status, started_at, created_at, updated_at) são omitidas — o Postgres
    // preenche. NOT NULL sem default (tenant_id, template_id, template_version, started_by) e as opcionais
    // (related_entity_*, client_run_key, role) vão explícitas. `status` fixa 'in_progress' (paridade com o
    // `create`). `role` (CHECKLIST P1 PR-04c) só chega por este caminho: quem cria run à mão pela web/mobile
    // não declara fase, e o parser REST nem lê o campo.
    const inserted = await this.client.$queryRaw<unknown[]>`
      INSERT INTO checklist_runs (
        tenant_id,
        template_id,
        template_version,
        related_entity_type,
        related_entity_id,
        client_run_key,
        role,
        status,
        started_by
      )
      VALUES (
        ${data.tenantId}::uuid,
        ${template.id}::uuid,
        ${template.version}::int,
        ${data.relatedEntityType ?? null},
        ${data.relatedEntityId ?? null},
        ${clientRunKey},
        ${data.role ?? null},
        'in_progress',
        ${data.actorUserId}::uuid
      )
      ON CONFLICT (tenant_id, client_run_key) DO NOTHING
      RETURNING
        id,
        tenant_id,
        template_id,
        template_version,
        related_entity_type,
        related_entity_id,
        client_run_key,
        role,
        status,
        started_by,
        completed_by,
        started_at,
        completed_at,
        created_at,
        updated_at
    `;

    if (inserted.length === 0) {
      // Conflito: o vencedor da corrida já inseriu esta client_run_key (MESMO tenant → RLS a enxerga). O
      // DO NOTHING não abortou a tx, então este SELECT roda normalmente e devolve a run existente.
      const existing = await this.getRunByClientKey(data.tenantId, clientRunKey);

      if (existing) {
        return { run: existing, created: false };
      }

      // Estado teoricamente inalcançável (conflito no unique sem linha visível no mesmo tenant). Falha alto e
      // claro em vez de mascarar — nunca deveria ocorrer.
      throw new Error("checklist run insert conflicted but no existing run was found for the client_run_key");
    }

    const run = mapRunRecord(inserted[0]);

    // A run acabou de ser inserida (`created:true`) — persiste as respostas na MESMA transação (atomicidade
    // idêntica ao nested-create). Runs de despacho vêm sem respostas (answers vazio) → nada a inserir.
    if (data.answers.length > 0) {
      await this.client.checklistRunAnswer.createMany({
        data: data.answers.map((answer) => ({
          tenant_id: data.tenantId,
          run_id: run.id,
          component_id: answer.componentId,
          value: answer.value,
          metadata: answer.metadata,
        })),
      });
    }

    // B-O6R-06 — SO no ramo que REALMENTE inseriu. No ramo de conflito (`created:false`) a metrica ja
    // commitou com a run do vencedor, entao o replay nao tem o que reparar — e o `ON CONFLICT DO
    // NOTHING` da propria captura torna a repeticao inocua de qualquer forma (A15).
    await appendChecklistRunUsageInTx(this.client, buildChecklistRunUsageEvents("created", run));

    return { run, created: true };
  }

  async getRunByClientKey(tenantId: string, clientRunKey: string): Promise<ChecklistRun | null> {
    const record = await this.client.checklistRun.findFirst({
      where: {
        tenant_id: tenantId,
        client_run_key: clientRunKey,
      },
    });

    return record ? mapRunRecord(record) : null;
  }

  // CHECKLIST P1 PR-04c (§8) — carimbo de fase da ADOÇÃO, em UMA sentença atômica.
  //
  // O `WHERE role IS NULL` é a trava, e ela mora no BANCO de propósito: não há leitura-decisão-escrita, então
  // dois despachos concorrentes da mesma ordem não conseguem, entre eles, sobrescrever uma fase já gravada. É
  // também o motivo de não haver dependência de o `role` voltar nas leituras tipadas do Prisma — a decisão de
  // carimbar é do Postgres, não deste processo.
  //
  // `tenant_id` na cláusula (além da RLS): isolamento explícito, no padrão dos demais métodos deste arquivo.
  async stampRunRole(tenantId: string, runId: string, role: ChecklistRunRole): Promise<boolean> {
    const updated = await this.client.$queryRaw<unknown[]>`
      UPDATE checklist_runs
         SET role = ${role},
             updated_at = now()
       WHERE tenant_id = ${tenantId}::uuid
         AND id = ${runId}::uuid
         AND role IS NULL
      RETURNING id
    `;

    return updated.length > 0;
  }

  async listRuns(tenantId: string): Promise<readonly ChecklistRun[]> {
    const records = await this.client.checklistRun.findMany({
      where: {
        tenant_id: tenantId,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return records.map(mapRunRecord);
  }

  async listRunsByRelatedEntity(
    tenantId: string,
    relatedEntityType: string,
    relatedEntityId: string,
  ): Promise<readonly ChecklistRun[]> {
    const records = await this.client.checklistRun.findMany({
      where: {
        tenant_id: tenantId,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return records.map(mapRunRecord);
  }

  async getRun(tenantId: string, runId: string): Promise<RepositoryRunDetails | null> {
    const record = await this.client.checklistRun.findFirst({
      where: {
        id: runId,
        tenant_id: tenantId,
      },
      include: {
        answers: true,
        attachments: true,
        markers: true,
        acknowledgements: true,
      },
    });

    return record ? mapRunDetailsRecord(record) : null;
  }

  async updateRun(data: UpdateRunData): Promise<RepositoryRunDetails | null> {
    const existing = await this.getRun(data.tenantId, data.runId);

    if (!existing) {
      return null;
    }

    // CHECKLIST P1 PR-03 — trava de imutabilidade no repositório REAL (defesa em profundidade). Antes desta
    // linha, um PATCH numa vistoria já concluída regravava as respostas por cima da prova assinada.
    assertChecklistRunFieldWritable(existing.run);
    assertChecklistRunStatusTransition(data.status);

    for (const answer of data.answers) {
      const current = existing.answers.find((item) => item.componentId === answer.componentId);

      if (current) {
        await this.client.checklistRunAnswer.update({
          where: {
            id: current.id,
          },
          data: {
            value: answer.value,
            metadata: answer.metadata,
          },
        });
      } else {
        await this.client.checklistRunAnswer.create({
          data: {
            tenant_id: data.tenantId,
            run_id: data.runId,
            component_id: answer.componentId,
            value: answer.value,
            metadata: answer.metadata,
          },
        });
      }
    }

    if (data.status) {
      await this.client.checklistRun.update({
        where: {
          tenant_id_id: {
            tenant_id: data.tenantId,
            id: data.runId,
          },
        },
        data: {
          status: data.status,
        },
      });
    }

    return this.getRun(data.tenantId, data.runId);
  }

  async completeRun(
    tenantId: string,
    runId: string,
    actorUserId: string,
    status: ChecklistRunStatus,
    billing: CompleteRunBilling,
  ): Promise<RepositoryRunDetails | null> {
    const existing = await this.getRun(tenantId, runId);

    if (!existing) {
      return null;
    }

    assertChecklistRunMutable(existing.run);
    // Junta PR-03 (2ª rodada): de `pending_acknowledgement` só existe UM salto — a ciência levando a
    // `completed_with_divergence`. Concluir de novo por fora é reescrever prova assinada.
    assertChecklistRunCompletionTarget(existing.run.status, status);

    await this.client.checklistRun.update({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: runId,
        },
      },
      data: {
        status,
        completed_by: status === "pending_acknowledgement" ? null : actorUserId,
        completed_at: status === "pending_acknowledgement" ? null : new Date(),
      },
    });

    const updated = await this.getRun(tenantId, runId);

    // B-O6R-06 (Omega6R-DIN-005) + EMENDA E1.2: a unidade de CONCLUSAO na MESMA transacao do UPDATE de
    // status — e SO quando o chamador declara que este caminho fatura. Dos tres chamadores de
    // `repository.completeRun`, apenas `service.completeRun` publica `checklist_run.completed` hoje;
    // `registerDivergence` e `acknowledgeRun` valem 0 e continuam valendo 0 (A10, F6, C4).
    if (billing.meterCompletion && updated) {
      await appendChecklistRunUsageInTx(this.client, buildChecklistRunUsageEvents("completed", updated.run));
    }

    return updated;
  }

  // CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE) — reabertura APPEND-ONLY. A run concluída não recebe UPDATE
  // nenhum: nasce uma NOVA run vinculada por `reopened_from_run_id`, herdando modelo/versão, vínculo com a
  // OS/custódia, respostas e marcações. Roda dentro da MESMA transação RLS do wrapper (atomicidade: ou a nova
  // versão nasce completa, ou nada). `client_run_key` fica NULL (chave de idempotência de UMA criação do app).
  //
  // CORREÇÃO DE COMENTÁRIO (junta PR-03, 2ª rodada — medido no banco): o índice anti-dupla-reabertura
  // `checklist_runs_tenant_id_reopened_from_run_id_key` NÃO é parcial (`indpred` é NULL) — os comentários que
  // diziam "índice parcial único" estavam errados. Ele é um UNIQUE comum sobre (tenant_id,
  // reopened_from_run_id), e o invariante só funciona porque no Postgres NULLs são DISTINTOS num índice único:
  // as vistorias ORIGINAIS (reopened_from_run_id NULL, a esmagadora maioria) não colidem entre si. Quem ler
  // "parcial" pode tentar "consertar" com NULLS NOT DISTINCT — e aí TODAS as vistorias originais da mesma
  // organização passam a colidir em NULL, matando a criação de vistoria. Não adicione NULLS NOT DISTINCT aqui.
  //
  // Junta PR-03 (2ª rodada, ALTA §2.8) — a proteção cobre o MÉTODO INTEIRO, não só o `create`.
  // Antes, o `FOR UPDATE`, o `getRun`, a busca do modelo e os dois `createMany` corriam nus: um P2028 (timeout
  // dos 5s da transação interativa sob contenção da trava) ou um 40001 no meio da cópia subia cru até o
  // `sendRouteError`, que devolve qualquer `Error` como HTTP 400 com `error.message` LITERAL — caminho absoluto
  // do servidor, nomes de coluna internas e trecho da query no corpo, ainda por cima classificados como erro do
  // cliente. As recusas de NEGÓCIO continuam passando intactas (ver `sanitizeReopenFailure`).
  async reopenRun(data: ReopenRunData): Promise<ReopenRunResult | null> {
    try {
      return await this.reopenRunWithinTransaction(data);
    } catch (error) {
      throw sanitizeReopenFailure(error, data.runId);
    }
  }

  private async reopenRunWithinTransaction(data: ReopenRunData): Promise<ReopenRunResult | null> {
    // Junta PR-03 (MÉDIA — check-then-act): a leitura e a criação da nova versão eram dois passos sem
    // trava. Entre "li que está concluída" e "criei a versão", outra transação podia CANCELAR a vistoria —
    // e a versão nascia pendurada numa prova cancelada (o índice único só barra reabertura DUPLA,
    // não a corrida com o cancelamento). `FOR UPDATE` segura a linha até o fim desta transação RLS.
    const locked = await this.client.$queryRaw<Array<{ status: string }>>`
      SELECT status
        FROM checklist_runs
       WHERE tenant_id = ${data.tenantId}::uuid
         AND id = ${data.runId}::uuid
       FOR UPDATE
    `;

    if (locked.length === 0) {
      return null;
    }

    const previous = await this.getRun(data.tenantId, data.runId);

    if (!previous) {
      return null;
    }

    // A situação que vale é a lida SOB TRAVA (a de `getRun` foi lida na mesma transação, mas o assert
    // precisa apontar para a linha que está efetivamente segurada).
    assertChecklistRunReopenable({ status: locked[0]!.status as ChecklistRunStatus });

    // Junta PR-03 (MÉDIA): modelo arquivado não recebe novo preenchimento — nem por reabertura.
    const template = (await this.client.checklistTemplate.findFirst({
      where: { tenant_id: data.tenantId, id: previous.run.templateId, deleted_at: null },
      select: { status: true },
    })) as { status?: string } | null;

    if (!template || template.status === "archived") {
      throw checklistRunTemplateArchivedError();
    }

    // A colisão no unique (tenant_id, reopened_from_run_id) — duas reaberturas concorrentes da MESMA vistoria —
    // vira recusa de negócio no `sanitizeReopenFailure`, que é quem classifica TODA falha deste método. Nada
    // mais é consultado depois de um erro aqui (a transação já está abortada).
    const record = await this.client.checklistRun.create({
      data: {
        tenant_id: data.tenantId,
        template_id: previous.run.templateId,
        template_version: previous.run.templateVersion,
        related_entity_type: previous.run.relatedEntityType ?? null,
        related_entity_id: previous.run.relatedEntityId ?? null,
        client_run_key: null,
        reopened_from_run_id: previous.run.id,
        reopen_reason: data.reason,
        status: "in_progress",
        started_by: data.actorUserId,
      },
    });

    const run = mapRunRecord(record);

    if (previous.answers.length > 0) {
      await this.client.checklistRunAnswer.createMany({
        data: previous.answers.map((answer) => ({
          tenant_id: data.tenantId,
          run_id: run.id,
          component_id: answer.componentId,
          value: answer.value,
          metadata: answer.metadata,
        })),
      });
    }

    if (previous.markers.length > 0) {
      await this.client.checklistMarker.createMany({
        data: previous.markers.map((marker) => ({
          tenant_id: data.tenantId,
          run_id: run.id,
          component_id: marker.componentId,
          x: marker.x,
          y: marker.y,
          marker_type: marker.markerType,
          description: marker.description ?? null,
          metadata: marker.metadata,
          created_by: data.actorUserId,
        })),
      });
    }

    return {
      run,
      previous: previous.run,
      copiedAnswers: previous.answers.length,
      copiedMarkers: previous.markers.length,
    };
  }

  async hasActiveRunsForTemplate(tenantId: string, templateId: string): Promise<boolean> {
    const record = await this.client.checklistRun.findFirst({
      where: {
        tenant_id: tenantId,
        template_id: templateId,
        status: {
          in: [...CHECKLIST_RUN_ACTIVE_STATUSES],
        },
      },
    });

    return record !== null;
  }

  async createAttachment(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAttachmentInput,
  ): Promise<ChecklistAttachment | null> {
    const run = await this.getRun(tenantId, runId);

    if (!run) {
      return null;
    }

    assertChecklistRunFieldWritable(run.run);

    const record = await this.client.checklistAttachment.create({
      data: {
        tenant_id: tenantId,
        run_id: runId,
        component_id: data.componentId,
        file_url: data.fileUrl,
        file_name: data.fileName ?? null,
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes ?? null,
        metadata: data.metadata,
        created_by: actorUserId,
      },
    });

    return mapAttachmentRecord(record);
  }

  async createMarker(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistMarkerInput,
  ): Promise<ChecklistMarker | null> {
    const run = await this.getRun(tenantId, runId);

    if (!run) {
      return null;
    }

    assertChecklistRunFieldWritable(run.run);

    const record = await this.client.checklistMarker.create({
      data: {
        tenant_id: tenantId,
        run_id: runId,
        component_id: data.componentId,
        x: data.x,
        y: data.y,
        marker_type: data.markerType,
        description: data.description ?? null,
        metadata: data.metadata,
        created_by: actorUserId,
      },
    });

    return mapMarkerRecord(record);
  }

  async createAcknowledgement(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAcknowledgementInput,
  ): Promise<ChecklistAcknowledgement | null> {
    const run = await this.getRun(tenantId, runId);

    if (!run) {
      return null;
    }

    assertChecklistRunMutable(run.run);

    const record = await this.client.checklistAcknowledgement.create({
      data: {
        tenant_id: tenantId,
        run_id: runId,
        acknowledged_by: actorUserId,
        message: data.message,
        observation: data.observation ?? null,
        metadata: data.metadata,
      },
    });

    return mapAcknowledgementRecord(record);
  }

  async createAuditEvent(event: ChecklistAuditEvent): Promise<void> {
    const auditWriter: AuditLogWriter = {
      create: (data) =>
        this.client.auditLog.create({
          data,
        }) as ReturnType<AuditLogWriter["create"]>,
    };

    await new EnterpriseAuditLogService(auditWriter).record({
      tenantId: event.tenantId,
      actorId: event.actorUserId,
      actorType: event.actorUserId ? "user" : "system",
      action: event.action,
      resourceType: event.entity,
      resourceId: event.entityId,
      outcome: "success",
      severity: event.action.includes("divergence") ? "warning" : "info",
      metadata: event.metadata,
    });
  }
}

export class RlsPrismaChecklistRepository implements ChecklistRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  listTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return this.withTenant(tenantId, (repository) => repository.listTemplates(tenantId));
  }

  listPublishedTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return this.withTenant(tenantId, (repository) => repository.listPublishedTemplates(tenantId));
  }

  createTemplate(data: CreateTemplateData): Promise<ChecklistTemplate> {
    return this.withTenant(data.tenantId, (repository) => repository.createTemplate(data));
  }

  getTemplate(tenantId: string, checklistId: string): Promise<ChecklistTemplate | null> {
    return this.withTenant(tenantId, (repository) => repository.getTemplate(tenantId, checklistId));
  }

  updateTemplate(data: UpdateTemplateData): Promise<ChecklistTemplate | null> {
    return this.withTenant(data.tenantId, (repository) => repository.updateTemplate(data));
  }

  archiveTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    return this.withTenant(tenantId, (repository) => repository.archiveTemplate(tenantId, checklistId, actorUserId));
  }

  publishTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    return this.withTenant(tenantId, (repository) => repository.publishTemplate(tenantId, checklistId, actorUserId));
  }

  listTemplatesByType(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return this.withTenant(tenantId, (repository) => repository.listTemplatesByType(tenantId));
  }

  createRun(data: CreateRunData, template: ChecklistTemplate): Promise<CreateRunResult> {
    return this.withTenant(data.tenantId, (repository) => repository.createRun(data, template));
  }

  listRuns(tenantId: string): Promise<readonly ChecklistRun[]> {
    return this.withTenant(tenantId, (repository) => repository.listRuns(tenantId));
  }

  getRun(tenantId: string, runId: string): Promise<RepositoryRunDetails | null> {
    return this.withTenant(tenantId, (repository) => repository.getRun(tenantId, runId));
  }

  getRunByClientKey(tenantId: string, clientRunKey: string): Promise<ChecklistRun | null> {
    return this.withTenant(tenantId, (repository) => repository.getRunByClientKey(tenantId, clientRunKey));
  }

  stampRunRole(tenantId: string, runId: string, role: ChecklistRunRole): Promise<boolean> {
    return this.withTenant(tenantId, (repository) => repository.stampRunRole(tenantId, runId, role));
  }

  listRunsByRelatedEntity(
    tenantId: string,
    relatedEntityType: string,
    relatedEntityId: string,
  ): Promise<readonly ChecklistRun[]> {
    return this.withTenant(tenantId, (repository) =>
      repository.listRunsByRelatedEntity(tenantId, relatedEntityType, relatedEntityId),
    );
  }

  updateRun(data: UpdateRunData): Promise<RepositoryRunDetails | null> {
    return this.withTenant(data.tenantId, (repository) => repository.updateRun(data));
  }

  completeRun(
    tenantId: string,
    runId: string,
    actorUserId: string,
    status: ChecklistRunStatus,
    billing: CompleteRunBilling,
  ): Promise<RepositoryRunDetails | null> {
    return this.withTenant(tenantId, (repository) => repository.completeRun(tenantId, runId, actorUserId, status, billing));
  }

  // Segunda rede, no MESMO nível do `$transaction`: o timeout da transação interativa e o rollback por
  // serialização estouram no wrapper, FORA do método já protegido. Sem isto, justamente a falha mais provável
  // (contenção na trava `FOR UPDATE`) escaparia crua para o `sendRouteError` — que a devolveria como HTTP 400
  // com a mensagem literal do Prisma. Recusa de negócio (ChecklistError) atravessa intacta; não há log duplo.
  async reopenRun(data: ReopenRunData): Promise<ReopenRunResult | null> {
    try {
      return await this.withTenant(data.tenantId, (repository) => repository.reopenRun(data));
    } catch (error) {
      throw sanitizeReopenFailure(error, data.runId);
    }
  }

  hasActiveRunsForTemplate(tenantId: string, templateId: string): Promise<boolean> {
    return this.withTenant(tenantId, (repository) => repository.hasActiveRunsForTemplate(tenantId, templateId));
  }

  createAttachment(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAttachmentInput,
  ): Promise<ChecklistAttachment | null> {
    return this.withTenant(tenantId, (repository) => repository.createAttachment(tenantId, runId, actorUserId, data));
  }

  createMarker(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistMarkerInput,
  ): Promise<ChecklistMarker | null> {
    return this.withTenant(tenantId, (repository) => repository.createMarker(tenantId, runId, actorUserId, data));
  }

  createAcknowledgement(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAcknowledgementInput,
  ): Promise<ChecklistAcknowledgement | null> {
    return this.withTenant(tenantId, (repository) => repository.createAcknowledgement(tenantId, runId, actorUserId, data));
  }

  createAuditEvent(event: ChecklistAuditEvent): Promise<void> {
    return this.withTenant(event.tenantId, (repository) => repository.createAuditEvent(event));
  }

  private withTenant<T>(
    tenantId: string,
    work: (repository: PrismaChecklistRepository) => Promise<T>,
  ): Promise<T> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      work(new PrismaChecklistRepository(tx as unknown as PrismaChecklistClient)),
    );
  }
}

export async function createPrismaChecklistRepository(): Promise<ChecklistRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaChecklistRepository(prisma);
}

/**
 * Classificador ÚNICO das falhas da reabertura. Existe para que nenhuma linha do método fique nua: o
 * `sendRouteError` transforma qualquer `Error` solto em HTTP 400 com `error.message` literal, e a mensagem do
 * Prisma carrega caminho absoluto do servidor, nomes de coluna internas e trecho da query.
 *
 * A ordem importa:
 *   1. recusa de NEGÓCIO (`ChecklistError`) passa intacta — engolir "modelo arquivado" ou "já reaberta" num
 *      500 genérico esconderia do gestor o único motivo que ele consegue resolver sozinho;
 *   2. colisão no unique da reabertura vira a recusa de negócio correspondente;
 *   3. o resto é falha de infraestrutura, e aí a resposta separa TRANSITÓRIO de DETERMINÍSTICO: mandar repetir
 *      o que nunca vai passar é o mesmo erro de orientação impossível que a junta reprovou no sync.
 */
function sanitizeReopenFailure(error: unknown, runId: string): unknown {
  if (error instanceof ChecklistError) {
    return error;
  }

  if (isUniqueViolation(error)) {
    return checklistRunAlreadyReopenedError();
  }

  const transient = isTransientDatabaseFailure(error);

  // Campos estruturados: o objeto de erro CRU nunca entra no log (é ele que carrega caminho e query).
  logger.error(
    { runId, code: databaseErrorCodes(error).join("/") || "unknown", reason: errorReason(error), transient },
    "checklist.reopen-run: falha de banco sanitizada antes de responder ao cliente",
  );

  return transient
    ? new ChecklistError(
        503,
        "CHECKLIST_RUN_REOPEN_UNAVAILABLE",
        "checklist_run_reopen_unavailable",
        "A vistoria não pôde ser reaberta agora porque o sistema estava ocupado. Tente novamente em alguns instantes.",
      )
    : new ChecklistError(
        500,
        "CHECKLIST_RUN_REOPEN_FAILED",
        "checklist_run_reopen_failed",
        "Não foi possível reabrir a vistoria. Repetir a operação não resolve; acione o suporte informando esta vistoria.",
      );
}

/**
 * Falha que o TEMPO resolve: contenção (a trava `FOR UPDATE` é o ponto mais provável), serialização, deadlock,
 * timeout da transação interativa e queda de conexão. Só nestes casos a resposta convida a repetir.
 * Detecta pelo CÓDIGO, nunca pela mensagem — texto muda entre versões, código não.
 */
function isTransientDatabaseFailure(error: unknown): boolean {
  const transientCodes = new Set([
    "P1001", // não alcançou o banco
    "P1002", // timeout de conexão
    "P1008", // timeout da operação
    "P1017", // servidor fechou a conexão
    "P2024", // esgotou o pool esperando conexão
    "P2028", // transação interativa expirada/encerrada
    "P2034", // write conflict / deadlock (o wrapper Prisma do 40001/40P01)
    "40001", // serialization_failure
    "40P01", // deadlock_detected
    "55P03", // lock_not_available
    "57014", // query_canceled (statement_timeout)
    "53300", // too_many_connections
    "08000",
    "08003",
    "08006", // connection_exception
  ]);

  return databaseErrorCodes(error).some((code) => transientCodes.has(code));
}

/**
 * Códigos candidatos de um erro de banco. Dois níveis porque o Prisma embrulha a falha do driver: uma query
 * crua ($queryRaw, como o `FOR UPDATE` daqui) chega como P2010 com o SQLSTATE real em `meta.code`.
 */
function databaseErrorCodes(error: unknown): readonly string[] {
  if (typeof error !== "object" || error === null) return [];

  const codes: string[] = [];
  const code = (error as { code?: unknown }).code;

  if (typeof code === "string") codes.push(code);

  const meta = (error as { meta?: unknown }).meta;

  if (typeof meta === "object" && meta !== null) {
    const metaCode = (meta as { code?: unknown }).code;

    if (typeof metaCode === "string") codes.push(metaCode);
  }

  return codes;
}

/**
 * Motivo REDIGIDO para o log (mesmo helper de charging/impound): nome/`reason` do erro, nunca a mensagem —
 * é ela que carrega o caminho absoluto e o trecho da query.
 */
function errorReason(error: unknown): string {
  if (error && typeof error === "object" && "reason" in error) {
    return String((error as { reason?: unknown }).reason ?? "error");
  }
  if (error instanceof Error) return error.name;
  return "error";
}

/**
 * Violação de índice único do Postgres (23505 / Prisma P2002). Detecta pelo CÓDIGO, nunca pela mensagem —
 * texto muda entre versões, código não. Usado na reabertura para transformar a corrida entre duas reaberturas
 * da MESMA vistoria numa recusa de negócio (409) em vez de erro cru de banco.
 */
function isUniqueViolation(error: unknown): boolean {
  return databaseErrorCodes(error).some((code) => code === "P2002" || code === "23505");
}

function mapTemplateRecord(record: unknown): ChecklistTemplate {
  const value = record as {
    id: string;
    tenant_id: string;
    name: string;
    description: string | null;
    type: ChecklistType;
    status: ChecklistStatus;
    version: number;
    schema: JsonRecord;
    created_by: string | null;
    updated_by: string | null;
    published_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    components?: unknown[];
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    name: value.name,
    description: value.description ?? undefined,
    type: value.type,
    status: value.status,
    version: value.version,
    schema: value.schema,
    createdBy: value.created_by ?? undefined,
    updatedBy: value.updated_by ?? undefined,
    publishedAt: value.published_at ?? undefined,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    deletedAt: value.deleted_at ?? undefined,
    components: (value.components ?? []).map(mapComponentRecord),
  };
}

function mapComponentRecord(record: unknown): ChecklistTemplateComponent {
  const value = record as {
    id: string;
    tenant_id: string;
    template_id: string;
    component_key: string;
    type: ChecklistComponentType;
    label: string;
    required: boolean;
    order_index: number;
    config: JsonRecord;
    validation_rules: JsonRecord;
    visibility_rules: JsonRecord;
    created_at: Date;
    updated_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    templateId: value.template_id,
    componentKey: value.component_key,
    type: value.type,
    label: value.label,
    required: value.required,
    orderIndex: value.order_index,
    config: value.config,
    validationRules: value.validation_rules,
    visibilityRules: value.visibility_rules,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function mapRunRecord(record: unknown): ChecklistRun {
  const value = record as {
    id: string;
    tenant_id: string;
    template_id: string;
    template_version: number;
    related_entity_type: string | null;
    related_entity_id: string | null;
    client_run_key?: string | null;
    reopened_from_run_id?: string | null;
    reopen_reason?: string | null;
    // CHECKLIST P1 PR-04c — opcional na FORMA porque nem toda leitura seleciona a coluna (o RETURNING do
    // insert com chave a traz; um `findFirst` a traz se o modelo Prisma a declarar). Ausente ⇒ `undefined`,
    // que é o mesmo que "vistoria sem fase" — nunca uma fase inventada (D-007).
    role?: ChecklistRunRole | null;
    status: ChecklistRunStatus;
    started_by: string | null;
    completed_by: string | null;
    started_at: Date;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    templateId: value.template_id,
    templateVersion: value.template_version,
    relatedEntityType: value.related_entity_type ?? undefined,
    relatedEntityId: value.related_entity_id ?? undefined,
    clientRunKey: value.client_run_key ?? undefined,
    reopenedFromRunId: value.reopened_from_run_id ?? undefined,
    reopenReason: value.reopen_reason ?? undefined,
    role: value.role ?? undefined,
    status: value.status,
    startedBy: value.started_by ?? undefined,
    completedBy: value.completed_by ?? undefined,
    startedAt: value.started_at,
    completedAt: value.completed_at ?? undefined,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function mapRunDetailsRecord(record: unknown): RepositoryRunDetails {
  const value = record as {
    answers?: unknown[];
    attachments?: unknown[];
    markers?: unknown[];
    acknowledgements?: unknown[];
  };

  return {
    run: mapRunRecord(record),
    answers: (value.answers ?? []).map(mapAnswerRecord),
    attachments: (value.attachments ?? []).map(mapAttachmentRecord),
    markers: (value.markers ?? []).map(mapMarkerRecord),
    acknowledgements: (value.acknowledgements ?? []).map(mapAcknowledgementRecord),
  };
}

function mapAnswerRecord(record: unknown): ChecklistRunAnswer {
  const value = record as {
    id: string;
    tenant_id: string;
    run_id: string;
    component_id: string;
    value: unknown;
    metadata: JsonRecord;
    created_at: Date;
    updated_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    runId: value.run_id,
    componentId: value.component_id,
    value: value.value,
    metadata: value.metadata,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function mapAttachmentRecord(record: unknown): ChecklistAttachment {
  const value = record as {
    id: string;
    tenant_id: string;
    run_id: string;
    component_id: string;
    file_url: string;
    file_name: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    metadata: JsonRecord;
    created_by: string | null;
    created_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    runId: value.run_id,
    componentId: value.component_id,
    fileUrl: value.file_url,
    fileName: value.file_name ?? undefined,
    mimeType: value.mime_type ?? undefined,
    sizeBytes: value.size_bytes ?? undefined,
    metadata: value.metadata,
    createdBy: value.created_by ?? undefined,
    createdAt: value.created_at,
  };
}

function mapMarkerRecord(record: unknown): ChecklistMarker {
  const value = record as {
    id: string;
    tenant_id: string;
    run_id: string;
    component_id: string;
    x: number;
    y: number;
    marker_type: string;
    description: string | null;
    metadata: JsonRecord;
    created_by: string | null;
    created_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    runId: value.run_id,
    componentId: value.component_id,
    x: value.x,
    y: value.y,
    markerType: value.marker_type,
    description: value.description ?? undefined,
    metadata: value.metadata,
    createdBy: value.created_by ?? undefined,
    createdAt: value.created_at,
  };
}

function mapAcknowledgementRecord(record: unknown): ChecklistAcknowledgement {
  const value = record as {
    id: string;
    tenant_id: string;
    run_id: string;
    acknowledged_by: string;
    message: string;
    observation: string | null;
    acknowledged_at: Date;
    metadata: JsonRecord;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    runId: value.run_id,
    acknowledgedBy: value.acknowledged_by,
    message: value.message,
    observation: value.observation ?? undefined,
    acknowledgedAt: value.acknowledged_at,
    metadata: value.metadata,
  };
}
