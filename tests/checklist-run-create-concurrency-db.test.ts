import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import type { ChecklistTemplate } from "../src/modules/checklists/checklist.types.js";

const connectionString = process.env.DATABASE_URL;

// Conserto MÉDIA da junta — o P2002 catch-then-refetch de `createRun` rodava numa transação ABORTADA (25P02):
// `withTenantRls` envolve TODO o createRun numa ÚNICA transação interativa; sob 2 provisões/run.create
// CONCORRENTES da MESMA client_run_key, o perdedor sofria unique violation (23505/P2002), a tx entrava em
// ABORTED, e a re-busca no `catch` falhava com 25P02 ("current transaction is aborted") — sem code P2002, o
// erro NÃO era re-capturado → createRun LANÇAVA em vez de devolver { created:false }. Isso derrubava o
// perdedor no fail-open do field-dispatch (evento `field_dispatch_checklist_run_failed` ESPÚRIO + notificação
// falsa ao operador) e quebrava a idempotência durável. O conserto (INSERT ... ON CONFLICT DO NOTHING
// RETURNING) é específico do Postgres; Node é single-thread, então só o banco exercita a corrida REAL.
// DB-gated (skip sem DATABASE_URL, exatamente como as demais *-concurrency).
if (!connectionString) {
  test("Checklist run create concurrency (25P02 fix) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const CONCURRENCY = 8;

  // (b) — o PERDEDOR forçado à colisão no INSERT recebe { created:false } LIMPO (sem lançar, sem 25P02) e SÓ
  // 1 run é persistida. Prova DETERMINÍSTICA da cura na RAIZ, direto no repositório, onde o flag `created` é
  // visível.
  //
  // Por que barreira e não N-concorrência ingênua: sob 2..N createRun disparados juntos, o vencedor commita a
  // run tão rápido (tx minúscula) que os perdedores leem a run já commitada no PRÉ-CHECK e nunca chegam ao
  // INSERT — o atalho feliz MASCARA o 25P02 (o MESMO mascaramento da BAIXA, agora no Postgres). A barreira
  // abaixo SEGURA a run do vencedor NÃO-COMMITADA (invisível em READ COMMITTED) até o perdedor ter passado o
  // pré-check e BLOQUEADO no INSERT — forçando o exato caminho ON CONFLICT (código novo) / 23505→tx abortada→
  // 25P02 (código antigo).
  test("perdedor FORÇADO ao ON CONFLICT recebe created:false LIMPO (sem 25P02) e persiste 1 run", async () => {
    const ctx = await bootstrap(connectionString);
    const { client, repo } = ctx;
    const { setTenantRlsContext } = await import("../src/database/rls.js");
    const suffix = uniqueSuffix();
    const { tenantId, userId } = await seedTenant(ctx, suffix);
    try {
      const template = await seedPublishedTemplate(ctx, tenantId, userId, suffix);
      const workOrderId = randomUUID();
      const clientRunKey = `dispatch:${workOrderId}:${template.id}`;

      let releaseWinnerCommit!: () => void;
      const winnerMayCommit = new Promise<void>((resolve) => {
        releaseWinnerCommit = resolve;
      });
      let signalWinnerInserted!: () => void;
      const winnerInserted = new Promise<void>((resolve) => {
        signalWinnerInserted = resolve;
      });

      // "Vencedor" da corrida: insere a run com a client_run_key mas SEGURA a transação ABERTA (uncommitted)
      // até o perdedor ter tentado o INSERT. Enquanto pendente, a linha é INVISÍVEL (READ COMMITTED).
      const winnerTx = client.$transaction(
        async (tx) => {
          await setTenantRlsContext(tx, tenantId);
          await tx.$queryRaw`
            INSERT INTO checklist_runs (tenant_id, template_id, template_version, related_entity_type, related_entity_id, client_run_key, status, started_by)
            VALUES (${tenantId}::uuid, ${template.id}::uuid, ${template.version}::int, 'work_order', ${workOrderId}, ${clientRunKey}, 'in_progress', ${userId}::uuid)
          `;
          signalWinnerInserted();
          await winnerMayCommit;
        },
        { timeout: 20000 },
      );

      await winnerInserted; // vencedor inseriu (uncommitted → invisível)

      // Perdedor: pré-check MISSA (run do vencedor invisível) → ON CONFLICT INSERT BLOQUEIA na linha pendente.
      const loserPromise = repo.createRun(
        {
          checklistId: template.id,
          clientRunKey,
          relatedEntityType: "work_order",
          relatedEntityId: workOrderId,
          answers: [],
          tenantId,
          actorUserId: userId,
        },
        template,
      );

      // dá tempo do perdedor alcançar e BLOQUEAR no INSERT, então libera o commit do vencedor.
      await new Promise((resolve) => setTimeout(resolve, 400));
      releaseWinnerCommit();
      await winnerTx;

      // (b) o perdedor NÃO lança (fixed: ON CONFLICT 0 linhas → SELECT na tx VÁLIDA → run do vencedor). No
      // código ANTIGO: create → 23505/P2002 → tx ABORTADA → refetch 25P02 → esta linha REJEITARIA.
      const loser = await loserPromise;
      assert.equal(loser.created, false, "o perdedor forçado ao ON CONFLICT deve receber created:false");
      assert.equal(loser.run.clientRunKey, clientRunKey);

      // (a, parcial) exatamente 1 run persistida para a client_run_key (idempotência durável sob concorrência).
      const persisted = await repo.listRunsByRelatedEntity(tenantId, "work_order", workOrderId);
      assert.equal(persisted.length, 1, "só pode existir 1 run no banco");
      assert.equal(persisted[0].id, loser.run.id, "a run devolvida ao perdedor é a única persistida (a do vencedor)");
    } finally {
      await teardown(ctx, tenantId);
    }
  });

  // (a) + (c) — via ChecklistService + a MESMA lógica do provisioner do field-dispatch: exatamente 1 unidade
  // faturada (checklist_runs_count) e ZERO evento/notificação field_dispatch espúrios.
  test("2 provisões concorrentes: 1 unidade faturada e ZERO evento/notificação field_dispatch espúrios", async () => {
    const ctx = await bootstrap(connectionString);
    const { client, repo, service } = ctx;
    const suffix = uniqueSuffix();
    const { tenantId, userId } = await seedTenant(ctx, suffix);

    const { resetCloudUsageRuntimeForTests } = await import(
      "../src/modules/cloud-usage/cloud-usage.service.js"
    );
    const { withTenantRls } = await import("../src/database/rls.js");
    resetCloudUsageRuntimeForTests();
    try {
      const template = await seedPublishedTemplate(ctx, tenantId, userId, suffix);
      const actor = { tenantId, userId };
      const workOrderId = randomUUID();
      const clientRunKey = `dispatch:${workOrderId}:${template.id}`;

      // Reproduz FIELMENTE o provisioner do field-dispatch (buildChecklistRunProvisioner) DENTRO do fail-open
      // do serviço: findRunByClientKey → createRun; QUALQUER erro cairia no `catch`, que é EXATAMENTE onde o
      // field-dispatch emite o evento `field_dispatch_checklist_run_failed` + notifica o operador. Se o `catch`
      // nunca roda, não há evento/notificação espúrios.
      const spuriousFailures: unknown[] = [];
      const provisionLikeFieldDispatch = async (): Promise<void> => {
        try {
          const existing = await service.findRunByClientKey(actor, clientRunKey);
          if (existing) {
            return;
          }
          await service.createRun(actor, {
            checklistId: template.id,
            clientRunKey,
            relatedEntityType: "work_order",
            relatedEntityId: workOrderId,
            answers: [],
          });
        } catch (error) {
          // ramo fail-open do field-dispatch: o evento + a notificação ESPÚRIOS nasceriam AQUI.
          spuriousFailures.push(error);
        }
      };

      // N provisões CONCORRENTES da MESMA OS/checklist (mesma client_run_key determinística).
      await Promise.all(Array.from({ length: CONCURRENCY }, () => provisionLikeFieldDispatch()));

      // (c) o ramo fail-open NUNCA rodou → nenhum evento field_dispatch_checklist_run_failed / notificação falsa.
      assert.equal(
        spuriousFailures.length,
        0,
        `provisão NÃO pode falhar (falha ⇒ evento+notificação espúrios). Veio: ${spuriousFailures
          .map((e) => (e as Error)?.message)
          .join(" | ")}`,
      );

      // (a.1) exatamente 1 run persistida.
      const persisted = await repo.listRunsByRelatedEntity(tenantId, "work_order", workOrderId);
      assert.equal(persisted.length, 1, "só pode existir 1 run (a 2ª provisão foi idempotente)");

      // (a.2) billing proxy determinístico em Postgres: o serviço só AUDITA "checklist_run.created" (e só
      // publica o domain event que gera checklist_runs_count) quando created===true. 1 auditoria ⇒ 1 unidade
      // faturada. Independe do backend de cloud-usage (memory/prisma).
      const createdAudits = await withTenantRls(client, tenantId, (tx) =>
        tx.auditLog.count({ where: { tenant_id: tenantId, action: "checklist_run.created" } }),
      );
      assert.equal(createdAudits, 1, "só o vencedor pode auditar/publicar checklist_run.created (1 unidade faturada)");

      // (a.3) prova LITERAL do metric `checklist_runs_count` — B-O6R-06 (Omega6R-DIN-005) tornou-a MAIS
      // forte, e por isso ela mudou de LUGAR. Antes, a unidade nascia do consumidor do evento de dominio
      // (`recordCloudUsageBestEffort`), fire-and-forget, e aterrissava no repositorio EM MEMORIA do
      // cloud-usage quando `CORE_SAAS_PERSISTENCE` nao era prisma — daí o `setTimeout(150)` e o `if`.
      // Agora ela commita na MESMA transacao da run, no MESMO Postgres em que a run vive: o teste le a
      // TABELA, sem espera e sem ramo condicional. Uma leitura fraca (contagem em memoria) passaria a ser
      // vacuamente verde aqui, que e exatamente o que nao se pode aceitar num teste de faturamento.
      const billed = await withTenantRls(client, tenantId, (tx) =>
        tx.cloudUsageEvent.count({ where: { tenant_id: tenantId, metric_key: "checklist_runs_count" } }),
      );
      assert.equal(billed, 1, "exatamente 1 unidade FATURADA checklist_runs_count");
    } finally {
      resetCloudUsageRuntimeForTests();
      await teardown(ctx, tenantId);
    }
  });
}

// ---------- harness ----------

type BootstrapContext = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
  const { ChecklistService } = await import("../src/modules/checklists/checklist.service.js");

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaChecklistRepository(client);
  const service = new ChecklistService(repo);
  return { client, repo, service };
}

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function seedTenant(ctx: BootstrapContext, suffix: string): Promise<{ tenantId: string; userId: string }> {
  const { client } = ctx;
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({
    data: { name: `CHK Run Conc ${suffix}`, slug: `chk-run-conc-${suffix}` },
  });
  // audit_logs.actor_user_id é FK real → o ator do serviço precisa ser um usuário REAL do tenant (users tem
  // FORCE RLS, então cria dentro do contexto).
  const user = await withTenantRls(client, tenant.id, (tx) =>
    tx.user.create({ data: { tenant_id: tenant.id, name: "CHK Actor", email: `chk-actor-${suffix}@example.com` } }),
  );
  return { tenantId: tenant.id, userId: user.id };
}

// Seed do template PUBLICADO via SQL cru (padrão dos DB-gated deste repo — ex.: yard-occupancy). Evita o
// nested-create do Prisma para `checklist_template_components`, cujo input gerado (v7) exclui `tenant_id`
// (relation-scalar compartilhado entre as relations `tenant` e `template`) — quirk do `createTemplate`
// existente, fora do escopo deste conserto. Uma run sem respostas não precisa de componentes.
async function seedPublishedTemplate(
  ctx: BootstrapContext,
  tenantId: string,
  userId: string,
  suffix: string,
): Promise<ChecklistTemplate> {
  const { client, repo } = ctx;
  const { withTenantRls } = await import("../src/database/rls.js");
  const schema = JSON.stringify({ source: "db-conc" });
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO checklist_templates (tenant_id, name, type, status, version, schema, created_by, updated_by, published_at)
      VALUES (
        ${tenantId}::uuid,
        ${`Coleta ${suffix}`},
        'technical_evidence',
        'published',
        1,
        ${schema}::jsonb,
        ${userId}::uuid,
        ${userId}::uuid,
        now()
      )
      RETURNING id
    `,
  );
  const template = await repo.getTemplate(tenantId, rows[0].id);
  assert.ok(template, "template semeado deve ser encontrado");
  return template;
}

// Teardown FK-safe: answers → runs → components → templates; audit_logs + cloud_usage_events (FK Restrict →
// tenant) → users → tenant. cloud_usage_events só existe quando o cloud-usage roda em prisma; deleção
// defensiva (no-op em memória).
async function teardown(ctx: BootstrapContext, tenantId: string): Promise<void> {
  const { client } = ctx;
  const { withTenantRls } = await import("../src/database/rls.js");
  try {
    await withTenantRls(client, tenantId, async (tx) => {
      await tx.checklistRunAnswer.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistRun.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistTemplateComponent.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistTemplate.deleteMany({ where: { tenant_id: tenantId } });
      await tx.auditLog.deleteMany({ where: { tenant_id: tenantId } });
      try {
        await tx.cloudUsageEvent.deleteMany({ where: { tenant_id: tenantId } });
      } catch {
        // cloud_usage_events pode não ter sido tocado (cloud-usage em memória) — ignora.
      }
      await tx.user.deleteMany({ where: { tenant_id: tenantId } });
    });
    // ACHADO (subconjunto de rota contra o Postgres): o registro de consumo é BEST-EFFORT e
    // fire-and-forget — ele aterrissava DEPOIS do delete acima e a exclusão do tenant batia na FK
    // `cloud_usage_events_tenant_id_fkey`. Repetir a exclusão NÃO resolve (a corrida continua aberta entre
    // as tentativas — provado no CI). O determinístico é ESPERAR as gravações em voo e só então limpar.
    const { drainCloudUsageBestEffortForTests } = await import("../src/modules/cloud-usage/cloud-usage.service.js");
    await drainCloudUsageBestEffortForTests();
    await client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id = $1::uuid", tenantId);
    await client.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    await client.$disconnect();
  }
}
