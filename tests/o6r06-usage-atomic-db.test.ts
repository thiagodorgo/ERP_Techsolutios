import "dotenv/config";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------------------------
// B-O6R-06 · Ω6R-DIN-005 — A UNIDADE FATURÁVEL COMMITA COM A RUN, contra o Postgres REAL.
//
// O ACHADO: "a run é confirmada antes da métrica faturável, cuja gravação best-effort absorve falhas;
// replay idempotente retorna created:false e não republica". Traduzido: existia uma janela entre o
// COMMIT da run e a gravação da unidade em `cloud_usage_events` — e, se a gravação falhasse ali, a
// unidade se perdia PARA SEMPRE, porque o replay da mesma `client_run_key` devolve `created:false` e o
// serviço pula a publicação do evento que era o único produtor da métrica.
//
// O QUE ESTA BATERIA PROVA, no banco (nunca em memória — memória não é evidência de atomicidade):
//   A1/A2/A3  a linha nasce na MESMA transação, com chave derivada da RUN e a semântica de PR-03
//   A5′       a colisão da chave NÃO aborta a transação interativa (é o `ON CONFLICT DO NOTHING`)
//   A6        8 criações concorrentes com a mesma chave → 1 run, 2 unidades, 7 `created:false`
//   A7        isolamento: sob papel SEM BYPASSRLS, o evento de A é invisível para B e sem GUC
//   A8′/A9    o UNIVERSO de I1′ — run REABERTA é estado legítimo SEM as chaves de criação
//   A10/A11   a trilha de divergência/ciência do mobile continua valendo 0 (EMENDA E1·2)
//   A12′      o ALVO do `ON CONFLICT` é explícito (ver a nota honesta sobre M-19, abaixo)
//   A13       READ COMMITTED — a premissa da PD sob a qual `DO NOTHING` é seguro
//   A14/A15   a chave é da RUN: 2ª emissão descartada, duas transações → 1 linha por chave
//   A17       sob papel SEM BYPASSRLS a captura passa no `WITH CHECK` (fail-closed não vira fail-shut)
//
// DB-gated: sem DATABASE_URL o arquivo inteiro DECLARA o pulo (padrão das demais `-db`).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-O6R-06 usage atomicity requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("A1 · createRun (com e sem client_run_key) grava 2 unidades na MESMA transação, com chave da RUN", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const semChave = await createRun(ctx, seed);
      const eventosSemChave = await usageEventsOf(ctx, seed.tenantId, semChave.id);

      assert.equal(eventosSemChave.length, 2, "criação sem chave → checklist_run.created + checklist_runs_count");
      assert.deepEqual(
        eventosSemChave.map((evento) => evento.metric_key).sort(),
        ["checklist_run.created", "checklist_runs_count"],
      );
      for (const evento of eventosSemChave) {
        assert.equal(Number(evento.quantity), 1);
        assert.equal(evento.source_type, "checklist_run");
        assert.equal(
          evento.idempotency_key,
          `checklist_run:${semChave.id}:${evento.metric_key}`,
          "a chave é derivada da RUN e da métrica — nunca do id da emissão",
        );
        assert.equal(
          evento.occurred_at.getTime(),
          semChave.startedAt.getTime(),
          "o instante do fato é o início da vistoria, não o da gravação",
        );
      }

      const comChave = await createRun(ctx, seed, { clientRunKey: `a1-${uniqueSuffix()}` });
      const eventosComChave = await usageEventsOf(ctx, seed.tenantId, comChave.id);

      assert.equal(eventosComChave.length, 2, "o ramo ON CONFLICT do client_run_key mede igual");
      assert.deepEqual(
        eventosComChave.map((evento) => evento.idempotency_key).sort(),
        [`checklist_run:${comChave.id}:checklist_run.created`, `checklist_run:${comChave.id}:checklist_runs_count`],
      );
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A2 · completeRun grava 1 unidade — inclusive quando o status é pending_acknowledgement", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const comum = await createRun(ctx, seed);
      await ctx.repo.completeRun(seed.tenantId, comum.id, seed.userId, "completed", { meterCompletion: true });
      const daComum = await usageEventsOf(ctx, seed.tenantId, comum.id, "checklist_run.completed");

      assert.equal(daComum.length, 1);
      assert.equal(Number(daComum[0]!.quantity), 1);
      assert.equal(daComum[0]!.idempotency_key, `checklist_run:${comum.id}:checklist_run.completed`);

      // SEMÂNTICA PRESERVADA (não é decisão deste bloco mudá-la): `pending_acknowledgement` é conclusão
      // para efeito de cobrança — é o que o serviço já fazia ao publicar `checklist_run.completed` sem
      // olhar o status. `completed_at` fica NULL nesse estado, então o instante do fato é o do UPDATE.
      const pendente = await createRun(ctx, seed);
      await ctx.repo.completeRun(seed.tenantId, pendente.id, seed.userId, "pending_acknowledgement", {
        meterCompletion: true,
      });
      const daPendente = await usageEventsOf(ctx, seed.tenantId, pendente.id, "checklist_run.completed");

      assert.equal(daPendente.length, 1, "pending_acknowledgement fatura, como sempre faturou");
      assert.equal(Number(daPendente[0]!.quantity), 1);
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A3 · conclusão da vistoria REABERTA vale ZERO e carrega a chave :reopened (regra da junta PR-03)", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const original = await createRun(ctx, seed);
      await ctx.repo.completeRun(seed.tenantId, original.id, seed.userId, "completed", { meterCompletion: true });

      const reaberta = await ctx.repo.reopenRun({
        tenantId: seed.tenantId,
        runId: original.id,
        actorUserId: seed.userId,
        reason: "Foto do para-choque saiu ilegível",
      });
      assert.ok(reaberta);
      await ctx.repo.completeRun(seed.tenantId, reaberta!.run.id, seed.userId, "completed", {
        meterCompletion: true,
      });

      const daReaberta = await usageEventsOf(ctx, seed.tenantId, reaberta!.run.id, "checklist_run.completed");

      assert.equal(daReaberta.length, 1, "a conclusão zerada FICA na trilha — o auditor precisa vê-la");
      assert.equal(Number(daReaberta[0]!.quantity), 0, "corrigir um erro nosso não se cobra de novo");
      assert.equal(daReaberta[0]!.idempotency_key, `checklist_run:${reaberta!.run.id}:checklist_run.completed:reopened`);
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A5′ · duas capturas do mesmo fato na MESMA transação: 2ª afeta 0 linhas e a transação CONTINUA VÁLIDA", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const run = await createRun(ctx, seed);
      const { withTenantRls } = await import("../src/database/rls.js");
      const { appendChecklistRunUsageInTx, buildChecklistRunUsageEvents } = await import(
        "../src/modules/cloud-usage/cloud-usage.capture.js"
      );
      const entradas = buildChecklistRunUsageEvents("completed", {
        id: run.id,
        tenantId: seed.tenantId,
        startedAt: run.startedAt,
        completedAt: new Date(),
      });

      const resultado = await withTenantRls(ctx.client, seed.tenantId, async (tx) => {
        const primeira = await appendChecklistRunUsageInTx(tx, entradas);
        const segunda = await appendChecklistRunUsageInTx(tx, entradas);
        // A PROVA DE QUE A TRANSAÇÃO NÃO ABORTOU: um SELECT depois da colisão. Com `create` (P2002) a
        // transação interativa teria entrado em ABORTED e esta linha estouraria 25P02 — é a lição que
        // `createRunWithClientKey` já registra, e a razão de o append usar ON CONFLICT DO NOTHING.
        const aindaViva = await tx.cloudUsageEvent.count({ where: { tenant_id: seed.tenantId } });

        return { primeira, segunda, aindaViva };
      });

      assert.equal(resultado.primeira, 1, "a 1ª captura insere");
      assert.equal(resultado.segunda, 0, "a 2ª colide na chave e é DESCARTADA, sem erro");
      assert.ok(resultado.aindaViva > 0, "a transação seguiu válida depois da colisão");

      const persistidos = await usageEventsOf(ctx, seed.tenantId, run.id, "checklist_run.completed");
      assert.equal(persistidos.length, 1, "commitou 1 linha por chave");
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A6 · 8 criações CONCORRENTES com a mesma client_run_key: 1 run, 2 unidades, 7 created:false", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const template = await ctx.repo.getTemplate(seed.tenantId, seed.templateId);
      assert.ok(template);
      const clientRunKey = `a6-${uniqueSuffix()}`;

      // FORMA: 8 chamadas realmente concorrentes no pool (não há barreira de lock aqui — a barreira
      // escopada vive na suíte irmã `-concurrency-db`). A propriedade asserida vale com ou sem
      // contenção real: o que não pode existir é uma 2ª run ou uma 3ª unidade.
      const resultados = await Promise.all(
        Array.from({ length: 8 }, () =>
          ctx.repo.createRun(
            { tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.templateId, answers: [], clientRunKey },
            template!,
          ),
        ),
      );

      const criadas = resultados.filter((resultado) => resultado.created);
      assert.equal(criadas.length, 1, "só um vencedor insere");
      assert.equal(resultados.length - criadas.length, 7, "os outros 7 voltam idempotentes");
      assert.equal(new Set(resultados.map((resultado) => resultado.run.id)).size, 1, "todos veem a MESMA run");

      const eventos = await usageEventsOf(ctx, seed.tenantId, criadas[0]!.run.id);
      assert.equal(eventos.length, 2, "exatamente 2 unidades faturáveis para 8 tentativas");
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A7 · sob papel SEM BYPASSRLS: o evento de A é invisível para B, e invisível sem contexto nenhum", async () => {
    const ctx = await bootstrap(connectionString);
    const seedA = await seedScenario(ctx);
    const seedB = await seedScenario(ctx);
    const papel = await createRoleWithoutBypassRls(ctx, connectionString);

    try {
      const runA = await createRun(ctx, seedA);
      const { withTenantRls } = await import("../src/database/rls.js");

      const sobContextoDeB = await withTenantRls(papel.client, seedB.tenantId, (tx) =>
        tx.cloudUsageEvent.count({ where: { source_id: runA.id } }),
      );
      assert.equal(sobContextoDeB, 0, "a organização B não enxerga a unidade faturável de A");

      // Sem GUC, `NULLIF('','')` é NULL e a policy é falsa: zero linhas. É o que torna a leitura de
      // PLATAFORMA (sem tenant) vazia em qualquer papel que não bypasse RLS — pendência nomeada
      // `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS`.
      const semContexto = await papel.client.cloudUsageEvent.count({ where: { source_id: runA.id } });
      assert.equal(semContexto, 0, "sem contexto de organização não se lê linha nenhuma");

      const sobContextoDeA = await withTenantRls(papel.client, seedA.tenantId, (tx) =>
        tx.cloudUsageEvent.count({ where: { source_id: runA.id } }),
      );
      assert.equal(sobContextoDeA, 2, "controle POSITIVO: sob o contexto certo as 2 unidades estão lá");
    } finally {
      await papel.drop();
      await teardown(ctx, seedA.tenantId, { skipDisconnect: true });
      await teardown(ctx, seedB.tenantId);
    }
  });

  test("A8′ · o UNIVERSO de I1′ por SQL: nenhuma run ORIGINAL sem as duas chaves de criação", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const originais = [];
      for (let indice = 0; indice < 10; indice += 1) {
        originais.push(await createRun(ctx, seed));
      }
      for (const run of originais.slice(0, 8)) {
        await ctx.repo.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true });
      }

      const reabertas = [];
      for (const run of originais.slice(0, 2)) {
        const reaberta = await ctx.repo.reopenRun({
          tenantId: seed.tenantId,
          runId: run.id,
          actorUserId: seed.userId,
          reason: "correção",
        });
        assert.ok(reaberta);
        await ctx.repo.completeRun(seed.tenantId, reaberta!.run.id, seed.userId, "completed", {
          meterCompletion: true,
        });
        reabertas.push(reaberta!.run.id);
      }

      // I1′ — o universo é `reopened_from_run_id IS NULL`. A reabertura NÃO recebe chave de criação de
      // propósito (junta PR-03): cobrar de novo pela correção seria cobrar duas vezes o mesmo trabalho.
      const orfas = await rawQuery<{ id: string; metric_key: string }>(
        ctx,
        seed.tenantId,
        `SELECT r.id, m.metric_key
           FROM checklist_runs r
           CROSS JOIN (VALUES ('checklist_run.created'), ('checklist_runs_count')) AS m(metric_key)
          WHERE r.tenant_id = $1::uuid
            AND r.reopened_from_run_id IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM cloud_usage_events e
               WHERE e.tenant_id = r.tenant_id
                 AND e.source_type = 'checklist_run'
                 AND e.source_id = r.id::text
                 AND e.metric_key = m.metric_key
            )`,
        [seed.tenantId],
      );
      assert.equal(orfas.length, 0, "I1′: nenhuma vistoria ORIGINAL existe sem as duas chaves de criação");

      // CONTAGEM POSITIVA para as reabertas — sem isto o recorte do universo viraria cegueira: bastaria
      // "não olhar" para as reabertas para o teste ficar verde com qualquer defeito nelas.
      for (const reabertaId of reabertas) {
        const criacao = await usageEventsOf(ctx, seed.tenantId, reabertaId);
        const conclusao = criacao.filter((evento) => evento.metric_key === "checklist_run.completed");

        assert.equal(
          criacao.filter((evento) => evento.metric_key !== "checklist_run.completed").length,
          0,
          "a reaberta NÃO tem chave de criação — é a regra PR-03, não uma falta",
        );
        assert.equal(conclusao.length, 1, "a reaberta tem exatamente 1 linha de conclusão");
        assert.equal(Number(conclusao[0]!.quantity), 0, "…e ela vale ZERO");
      }
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A9 · reopenRun cria a nova versão SEM unidade de criação, e o vínculo fica gravado", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const original = await createRun(ctx, seed);
      await ctx.repo.completeRun(seed.tenantId, original.id, seed.userId, "completed", { meterCompletion: true });

      const reaberta = await ctx.repo.reopenRun({
        tenantId: seed.tenantId,
        runId: original.id,
        actorUserId: seed.userId,
        reason: "correção",
      });

      assert.ok(reaberta);
      assert.equal(reaberta!.run.reopenedFromRunId, original.id);
      assert.equal(
        (await usageEventsOf(ctx, seed.tenantId, reaberta!.run.id)).length,
        0,
        "a reabertura não é vistoria nova: zero unidade faturável no nascimento",
      );
      assert.equal(
        (await usageEventsOf(ctx, seed.tenantId, original.id)).length,
        3,
        "a original mantém as suas 3 (created + runs_count + completed)",
      );
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A10 · trilha C (divergência → ciência): ZERO unidade de conclusão, antes e depois", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const actor = { tenantId: seed.tenantId, userId: seed.userId };

      // (a) divergência SEM arquivo — é o caminho do sync do mobile.
      const semArquivo = await ctx.service.createRun(actor, { checklistId: seed.templateId, answers: [] });
      await ctx.service.registerDivergence(actor, semArquivo.id, {
        componentId: seed.observationId,
        observation: "Para-choque amassado",
      });
      assert.equal(
        (await usageEventsOf(ctx, seed.tenantId, semArquivo.id, "checklist_run.completed")).length,
        0,
        "registrar divergência NUNCA faturou conclusão — e continua não faturando",
      );

      await ctx.service.acknowledgeRun(actor, semArquivo.id, {
        message: "Ciência do gestor sobre a divergência",
        metadata: {},
      });
      const depoisDaCiencia = await usageEventsOf(ctx, seed.tenantId, semArquivo.id, "checklist_run.completed");
      assert.equal(depoisDaCiencia.length, 0, "a ciência fecha a vistoria e continua valendo 0");
      assert.equal(
        (await ctx.repo.getRun(seed.tenantId, semArquivo.id))?.run.status,
        "completed_with_divergence",
        "…e a run terminou concluída com divergência, com completed_at preenchido",
      );

      // (b) divergência COM arquivo — o caminho REST.
      const comArquivo = await ctx.service.createRun(actor, { checklistId: seed.templateId, answers: [] });
      await ctx.service.registerDivergence(actor, comArquivo.id, {
        componentId: seed.photoId,
        observation: "Vidro trincado",
        fileUrl: "https://example.invalid/foto.jpg",
        fileName: "foto.jpg",
        mimeType: "image/jpeg",
      });
      assert.equal(
        (await usageEventsOf(ctx, seed.tenantId, comArquivo.id, "checklist_run.completed")).length,
        0,
        "com anexo o número é o mesmo: 0",
      );
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A11 · trilha B (conclusão com divergência → ciência): 1 unidade, e NUNCA 2", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const actor = { tenantId: seed.tenantId, userId: seed.userId };
      const run = await ctx.service.createRun(actor, { checklistId: seed.templateId, answers: [] });

      await ctx.service.completeRun(actor, run.id, { hasDivergence: true, observation: "Divergência declarada" });
      const depoisDaConclusao = await usageEventsOf(ctx, seed.tenantId, run.id, "checklist_run.completed");

      assert.equal(depoisDaConclusao.length, 1, "concluir com divergência fatura 1, como sempre faturou");
      assert.equal(Number(depoisDaConclusao[0]!.quantity), 1);
      assert.equal((await ctx.repo.getRun(seed.tenantId, run.id))?.run.status, "pending_acknowledgement");

      await ctx.service.acknowledgeRun(actor, run.id, {
        message: "Ciência do gestor sobre a divergência",
        metadata: {},
      });
      assert.equal(
        (await usageEventsOf(ctx, seed.tenantId, run.id, "checklist_run.completed")).length,
        1,
        "a ciência não fatura de novo — e, se faturasse, a chave estável deduplicaria",
      );
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A12′ · o ALVO do ON CONFLICT é explícito no SQL da captura (guarda de texto — ver a nota sobre M-19)", () => {
    // NOTA HONESTA (achado R2-D do `critico-adversarial`, rodada 2): a mutação M-19 (omitir o alvo do
    // `ON CONFLICT`) é INOBSERVÁVEL por comportamento. `RecordUsageEventInput` não tem campo `id` e
    // `cloud_usage_events.id` é `gen_random_uuid()`, então a colisão de PK é inalcançável pelo caminho
    // de produção; a única outra unique da tabela é `(tenant_id, id)`. Sob M-19 todos os aceites de
    // comportamento (A5′, A14, A15) dariam o MESMO resultado — ficariam verdes com o defeito presente.
    //
    // O aceite A12 do plano, que prometia matar M-19 por um INSERT cru com `id` duplicado, foi por isso
    // NÃO IMPLEMENTADO como estava: ele testaria o PostgreSQL, não o bloco. No lugar dele fica esta
    // guarda LEXICAL, que é o que M-19 de fato muta — e que declara o que é: defesa em profundidade
    // (a PD mostrou que `ON CONFLICT DO NOTHING` sem alvo engole conflito de QUALQUER constraint
    // utilizável, inclusive a PK e qualquer unique FUTURA), não prova de comportamento.
    const capture = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "modules", "cloud-usage", "cloud-usage.capture.ts"),
      "utf8",
    );

    assert.match(
      capture,
      /ON CONFLICT \(tenant_id, idempotency_key\)[\s\S]{0,80}DO NOTHING/,
      "o append tem de nomear (tenant_id, idempotency_key) como alvo do ON CONFLICT",
    );
    assert.equal(
      /ON CONFLICT\s+DO NOTHING/.test(capture),
      false,
      "nenhum ON CONFLICT sem alvo pode existir neste arquivo",
    );
    assert.equal(
      /\.createMany\s*\(/.test(capture),
      false,
      "`createMany({skipDuplicates})` está PROIBIDO aqui: o Prisma emite ON CONFLICT DO NOTHING sem alvo",
    );
  });

  test("A13 · a transação da captura roda em READ COMMITTED — a premissa da PD, pinada por execução", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      const linhas = await withTenantRls(ctx.client, seed.tenantId, (tx) =>
        tx.$queryRawUnsafe<Array<{ nivel: string }>>("SELECT current_setting('transaction_isolation') AS nivel"),
      );

      assert.equal(
        linhas[0]?.nivel,
        "read committed",
        "`ON CONFLICT DO NOTHING` só é seguro sob concorrência em READ COMMITTED (PD §2)",
      );
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A14 · a 2ª emissão com a MESMA chave e quantidade diferente é DESCARTADA — a 1ª permanece", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const run = await createRun(ctx, seed);
      const { withTenantRls } = await import("../src/database/rls.js");
      const { appendChecklistRunUsageInTx } = await import("../src/modules/cloud-usage/cloud-usage.capture.js");

      // ACEITO POR DESENHO e documentado: para a MESMA run a quantidade nunca muda de propósito — a
      // reabertura é run NOVA (chave nova), concluir duas vezes é 409, e o sufixo `:reopened` separa a
      // conclusão reaberta. `DO UPDATE SET quantity` faria a 2ª emissão VENCER, e aí uma reentrega
      // adulterada mudaria o valor cobrado.
      const chave = `checklist_run:${run.id}:checklist_run.completed`;
      const base = {
        tenantId: seed.tenantId,
        sourceType: "checklist_run",
        sourceId: run.id,
        metricKey: "checklist_run.completed" as const,
        unit: "count" as const,
        occurredAt: new Date(),
        idempotencyKey: chave,
      };

      await withTenantRls(ctx.client, seed.tenantId, (tx) => appendChecklistRunUsageInTx(tx, [{ ...base, quantity: 1 }]));
      const segunda = await withTenantRls(ctx.client, seed.tenantId, (tx) =>
        appendChecklistRunUsageInTx(tx, [{ ...base, quantity: 999 }]),
      );

      assert.equal(segunda, 0, "a 2ª não insere");
      const persistidos = await usageEventsOf(ctx, seed.tenantId, run.id, "checklist_run.completed");
      assert.equal(persistidos.length, 1);
      assert.equal(Number(persistidos[0]!.quantity), 1, "a 1ª emissão é a que vale — 999 não entrou na conta");
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A15 · duas emissões da mesma run em DUAS transações → 1 linha por chave (a chave é da RUN)", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const run = await createRun(ctx, seed);
      const { withTenantRls } = await import("../src/database/rls.js");
      const { appendChecklistRunUsageInTx, buildChecklistRunUsageEvents } = await import(
        "../src/modules/cloud-usage/cloud-usage.capture.js"
      );
      const entradas = buildChecklistRunUsageEvents("created", {
        id: run.id,
        tenantId: seed.tenantId,
        startedAt: run.startedAt,
      });

      // Este é o cenário do DEFEITO ORIGINAL: no mundo antigo cada emissão tinha chave própria
      // (`${event.id}:…`), então duas emissões do MESMO fato geravam DUAS linhas faturadas. Com a chave
      // derivada da run, a segunda transação não acrescenta nada.
      await withTenantRls(ctx.client, seed.tenantId, (tx) => appendChecklistRunUsageInTx(tx, entradas));
      await withTenantRls(ctx.client, seed.tenantId, (tx) => appendChecklistRunUsageInTx(tx, entradas));

      const eventos = await usageEventsOf(ctx, seed.tenantId, run.id);
      assert.equal(eventos.length, 2, "duas chaves distintas, uma linha cada — nunca quatro");
      assert.equal(new Set(eventos.map((evento) => evento.idempotency_key)).size, 2);
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("A17 · sob papel SEM BYPASSRLS a captura PASSA no WITH CHECK: run e unidades commitam juntas", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    const papel = await createRoleWithoutBypassRls(ctx, connectionString);

    try {
      const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
      const repoSemBypass = new RlsPrismaChecklistRepository(papel.client);
      const template = await repoSemBypass.getTemplate(seed.tenantId, seed.templateId);
      assert.ok(template, "o papel sem BYPASSRLS lê o modelo sob o contexto do tenant");

      const { run, created } = await repoSemBypass.createRun(
        { tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.templateId, answers: [] },
        template!,
      );

      assert.equal(created, true);
      assert.equal(
        (await usageEventsOf(ctx, seed.tenantId, run.id)).length,
        2,
        "o `WITH CHECK` de cloud_usage_events passa porque o append roda DENTRO do withTenantRls",
      );
    } finally {
      await papel.drop();
      await teardown(ctx, seed.tenantId);
    }
  });
}

// ── infra ────────────────────────────────────────────────────────────────────────────────────────
async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
  const { ChecklistService } = await import("../src/modules/checklists/checklist.service.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaChecklistRepository(client);
  const service = new ChecklistService(repo);

  return { client, repo, service };
}

type BootstrapContext = Awaited<ReturnType<typeof bootstrap>>;

type Scenario = {
  readonly tenantId: string;
  readonly userId: string;
  readonly templateId: string;
  readonly observationId: string;
  readonly photoId: string;
};

type UsageEventRow = {
  readonly metric_key: string;
  readonly quantity: unknown;
  readonly unit: string;
  readonly source_type: string;
  readonly source_id: string | null;
  readonly idempotency_key: string | null;
  readonly occurred_at: Date;
};

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * PAPEL SEM BYPASSRLS pelo ARNÊS ÚNICO da casa (`createEphemeralRole`), nunca por SQL de catálogo
 * escrito aqui: criação de papel e concessões fora de `withRoleCatalogLock` disputam a TUPLA DE ACL com as
 * outras suítes sob `node --test` paralelo e produz `XX000 tuple concurrently updated`
 * (`P-O6R-ARNES-ISOLAMENTO`). É também por isso que este arquivo não aparece no ratchet
 * `db-catalog-write-guard`: ele não escreve catálogo, ele PEDE ao arnês.
 *
 * FALHA AQUI É VERMELHO, NUNCA SKIP: sob superusuário (dev e CI usam `postgres`) a RLS é ignorada, e
 * um drill que se autopulasse seria teatro exatamente onde o achado mora.
 */
async function createRoleWithoutBypassRls(ctx: BootstrapContext, connection: string) {
  const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
  const papel = await createEphemeralRole(ctx.client, connection);

  const atributos = await ctx.client.$queryRawUnsafe<Array<{ rolbypassrls: boolean; rolsuper: boolean }>>(
    "SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = $1",
    papel.roleName,
  );

  assert.equal(atributos[0]?.rolbypassrls, false, "o papel do drill NÃO pode bypassar RLS");
  assert.equal(atributos[0]?.rolsuper, false, "…nem ser superusuário — senão o drill não mede nada");

  return papel;
}

async function seedScenario(ctx: BootstrapContext): Promise<Scenario> {
  const { client, repo } = ctx;
  const { withTenantRls } = await import("../src/database/rls.js");
  const suffix = uniqueSuffix();
  const tenant = await client.tenant.create({
    data: { name: `O6R06 Usage ${suffix}`, slug: `o6r06-usage-${suffix}` },
  });
  const user = await withTenantRls(client, tenant.id, (tx) =>
    tx.user.create({
      data: { tenant_id: tenant.id, name: "O6R06 Usage Actor", email: `o6r06-usage-${suffix}@example.com` },
    }),
  );

  const template = await repo.createTemplate({
    tenantId: tenant.id,
    actorUserId: user.id,
    name: `Vistoria O6R06 ${suffix}`,
    type: "towing_collection",
    schema: {},
    components: [
      { componentKey: "obs", type: "observation", label: "Observação", required: false, config: {}, validationRules: {}, visibilityRules: {} },
      { componentKey: "fotos", type: "photo_upload", label: "Fotos", required: false, config: {}, validationRules: {}, visibilityRules: {} },
    ],
  });
  const published = await repo.publishTemplate(tenant.id, template.id, user.id);
  assert.ok(published, "o modelo semeado precisa publicar");

  const byKey = new Map(published!.components.map((component) => [component.componentKey, component.id]));

  return {
    tenantId: tenant.id,
    userId: user.id,
    templateId: published!.id,
    observationId: byKey.get("obs")!,
    photoId: byKey.get("fotos")!,
  };
}

async function createRun(ctx: BootstrapContext, seed: Scenario, extra: Record<string, string> = {}) {
  const template = await ctx.repo.getTemplate(seed.tenantId, seed.templateId);
  assert.ok(template);
  const { run } = await ctx.repo.createRun(
    { tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.templateId, answers: [], ...extra },
    template!,
  );

  return run;
}

async function usageEventsOf(
  ctx: BootstrapContext,
  tenantId: string,
  runId: string,
  metricKey?: string,
): Promise<UsageEventRow[]> {
  const { withTenantRls } = await import("../src/database/rls.js");

  return withTenantRls(ctx.client, tenantId, (tx) =>
    tx.$queryRawUnsafe<UsageEventRow[]>(
      `SELECT metric_key, quantity, unit, source_type, source_id, idempotency_key, occurred_at
         FROM cloud_usage_events
        WHERE tenant_id = $1::uuid AND source_id = $2 ${metricKey ? "AND metric_key = $3" : ""}
        ORDER BY metric_key`,
      ...(metricKey ? [tenantId, runId, metricKey] : [tenantId, runId]),
    ),
  );
}

async function rawQuery<T>(ctx: BootstrapContext, tenantId: string, sql: string, params: readonly unknown[]): Promise<T[]> {
  const { withTenantRls } = await import("../src/database/rls.js");

  return withTenantRls(ctx.client, tenantId, (tx) => tx.$queryRawUnsafe<T[]>(sql, ...params));
}

/**
 * Teardown ESCOPADO no tenant que ESTE teste criou (nunca wildcard, nunca a partir de listagem). Ordem
 * FK-safe: filhos da run → versões REABERTAS antes das originais (a auto-FK é RESTRICT e o Postgres a
 * verifica linha a linha) → runs → unidades de consumo (FK RESTRICT para `tenants`) → modelos →
 * auditoria → usuários → organização.
 */
async function teardown(
  ctx: BootstrapContext,
  tenantId: string,
  options?: { readonly skipDisconnect?: boolean },
): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");

  try {
    await withTenantRls(ctx.client, tenantId, async (tx) => {
      await tx.checklistMarker.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistAttachment.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistAcknowledgement.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistRunAnswer.deleteMany({ where: { tenant_id: tenantId } });
      for (let guard = 0; guard < 10; guard += 1) {
        const removed = await tx.checklistRun.deleteMany({
          where: { tenant_id: tenantId, reopened_from_run_id: { not: null }, reopened_into: { none: {} } },
        });
        if (removed.count === 0) break;
      }
      await tx.checklistRun.deleteMany({ where: { tenant_id: tenantId } });
      await tx.cloudUsageEvent.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistTemplateComponent.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistTemplate.deleteMany({ where: { tenant_id: tenantId } });
      await tx.auditLog.deleteMany({ where: { tenant_id: tenantId } });
      await tx.user.deleteMany({ where: { tenant_id: tenantId } });
    });
    await ctx.client.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    if (!options?.skipDisconnect) await ctx.client.$disconnect();
  }
}
