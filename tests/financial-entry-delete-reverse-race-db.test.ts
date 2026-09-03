import "dotenv/config";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("delete-reverse-race");

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 4 · C1 (P9, Ω6R-DIN-002 concorrente) — a corrida delete×reverse sob Postgres REAL,
// e a INVARIANTE DE BANCO contra a metade órfã (migration add_reversal_pair_atomicity).
//
// A propriedade: as portas delete e reverse do MESMO par nunca comprometem ambas sob concorrência —
// efeito líquido 0, perdedor com o erro do controle sequencial. Duas defesas, medidas separadamente:
//   · SERVIÇO — delete e reverse serializam no FOR UPDATE do original dentro de uow.run; o perdedor
//     re-checa sob o lock e sai 422 reversal_pair_immutable / 404 (não a RAISE do trigger).
//   · BANCO — para o escritor que NÃO passa pelo serviço (SQL cru, corrida, bug), o par de triggers
//     recusa a metade órfã. O FOR SHARE do Trigger B serializa os dois caminhos no row lock do
//     original, no próprio Postgres.
//
// Disciplina (§C7.5, lição do PR-05 Ω5P): tenant descartável por teste, asserções ESCOPADAS aos ids
// do próprio teste, teardown em ordem de FK — nenhuma sentença sobre a base inteira. Cluster
// descartável (NUNCA a base viva). O DELETE em massa por wildcard na base viva foi um incidente; aqui
// todo delete é por tenant_id do próprio teste.
// -----------------------------------------------------------------------------------------------

const RACE_N = 20;

function isDomainError(error: unknown, statusCode: number, reason: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason
  );
}

if (!connectionString) {
  test("Corrida delete×reverse sob Postgres exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  for (const order of ["reverse-first", "delete-first"] as const) {
    test(`[C1/P9][db][${order}] corrida REAL delete×reverse (serviço, ${RACE_N}×): saldo líquido 0, nunca ambas, perdedor 422/404, zero deadlock`, async () => {
      const h = await bootstrap(connection);
      const { client } = h;
      try {
        for (let it = 0; it < RACE_N; it++) {
          const seed = await seedTenant(h, `race-${order}`);
          const entry = await h.entryService.create(seed.actor, {
            account_id: seed.accountId,
            direction: "out",
            amount: 100,
            payment_method: "pix",
          });

          const reverse = () => captureSettled(h.entryService.reverse(seed.actor, entry.id));
          const del = () => captureSettled(h.entryService.delete(seed.actor, entry.id));
          const [a, b] = await Promise.all(order === "reverse-first" ? [reverse(), del()] : [del(), reverse()]);

          const bothAccepted = a.status === "fulfilled" && b.status === "fulfilled";
          assert.equal(bothAccepted, false, `it=${it}: as duas portas commitaram — saldo fabricado`);

          const balance = await h.entryService.balance(seed.actor, seed.accountId);
          assert.equal(balance.balance, 0, `it=${it}: saldo líquido tem de ser 0, veio ${balance.balance}`);

          const loser = [a, b].find((r) => r.status === "rejected");
          assert.ok(loser, `it=${it}: uma porta tem de recusar`);
          const reason = (loser as { reason: unknown }).reason;
          // deadlock (40P01) NUNCA é aceitável — a ordem única de locks (advisory → row → escrita) o impede.
          assert.notEqual((reason as { code?: string })?.code, "40P01", `it=${it}: deadlock 40P01`);
          assert.equal(
            isDomainError(reason, 422, "reversal_pair_immutable") || isDomainError(reason, 404, "entry_not_found"),
            true,
            `it=${it}: perdedor tem de ser 422 reversal_pair_immutable ou 404 entry_not_found`,
          );

          // No máximo UMA contrapartida ATIVA; o original NUNCA fica órfão (deletado com contrapartida viva).
          const counters = await client.financialEntry.count({
            where: { tenant_id: seed.tenantId, reversal_of: entry.id, deleted_at: null },
          });
          const originalRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: entry.id } });
          const originalDeleted = originalRow?.deleted_at != null;
          assert.equal(counters <= 1, true, `it=${it}: no máximo 1 contrapartida ativa`);
          assert.equal(
            counters === 1 && originalDeleted,
            false,
            `it=${it}: metade órfã — contrapartida viva com original deletado`,
          );
          await teardownTenant(h, seed.tenantId);
        }
      } finally {
        await teardown(h);
      }
    });
  }

  test("[C1/P9][db][trigger B] SQL cru: INSERT de estorno vivo apontando original APAGADO → RAISE Ω6R-DIN-002", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "orphan-insert");
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });
      // apaga o original (avulso, sem estorno → delete permitido)
      await h.entryService.delete(seed.actor, original.id);

      // SQL CRU: cria a metade órfã diretamente, contornando o serviço. O trigger tem de recusar.
      await assert.rejects(
        client.$executeRawUnsafe(
          `INSERT INTO financial_entries (tenant_id, account_id, direction, amount, payment_method, competencia, reversal_of)
           VALUES ($1::uuid, $2::uuid, 'in', 100, 'pix', '2026-05', $3::uuid)`,
          seed.tenantId,
          seed.accountId,
          original.id,
        ),
        (error: unknown) => /Ω6R-DIN-002/.test(String((error as { message?: unknown })?.message ?? error)),
      );

      // Nenhuma contrapartida órfã ficou no banco.
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: seed.tenantId, reversal_of: original.id } }),
        0,
      );
      await teardownTenant(h, seed.tenantId);
    } finally {
      await teardown(h);
    }
  });

  test("[C1/P9][db][trigger A] SQL cru: UPDATE soft-delete de original com contrapartida VIVA → RAISE Ω6R-DIN-002", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "orphan-delete");
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });
      const counter = await h.entryService.reverse(seed.actor, original.id); // par vivo, atômico

      // SQL CRU: soft-delete do original por baixo do serviço (o serviço recusaria com reversal_pair).
      await assert.rejects(
        client.$executeRawUnsafe(
          `UPDATE financial_entries SET deleted_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          seed.tenantId,
          original.id,
        ),
        (error: unknown) => /Ω6R-DIN-002/.test(String((error as { message?: unknown })?.message ?? error)),
      );

      // O original continua VIVO (a RAISE abortou o UPDATE); o par segue íntegro.
      const originalRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: original.id } });
      assert.equal(originalRow?.deleted_at, null, "a RAISE tem de ter abortado o soft-delete");
      const counterRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: counter.id } });
      assert.equal(counterRow?.deleted_at, null);
      await teardownTenant(h, seed.tenantId);
    } finally {
      await teardown(h);
    }
  });

  test("[C1/P9][db][barrier · FOR SHARE] SQL cru: estorno-insert e soft-delete concorrentes SERIALIZAM no row lock do original; nunca ambos", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "barrier-forshare");
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });

      // VENCEDOR emulado: tx crua que INSERE a contrapartida (Trigger B toma FOR SHARE do original) e
      // segura a transação aberta. O soft-delete do original vai encontrar esse lock.
      let releaseWinner!: () => void;
      const winnerMayCommit = new Promise<void>((resolve) => {
        releaseWinner = resolve;
      });
      let signalWinnerReady!: () => void;
      const winnerReady = new Promise<void>((resolve) => {
        signalWinnerReady = resolve;
      });
      const winnerTx = client.$transaction(
        async (tx) => {
          await h.setTenantRlsContext(tx, seed.tenantId);
          await tx.$executeRawUnsafe(
            `INSERT INTO financial_entries (tenant_id, account_id, direction, amount, payment_method, competencia, reversal_of)
             VALUES ($1::uuid, $2::uuid, 'in', 100, 'pix', '2026-05', $3::uuid)`,
            seed.tenantId,
            seed.accountId,
            original.id,
          );
          signalWinnerReady();
          await winnerMayCommit;
        },
        { timeout: 30000, maxWait: 10000 },
      );
      const winnerOutcome = captureSettled(winnerTx);
      await winnerReady;

      // PERDEDOR REAL: soft-delete cru do original. Conflita com o FOR SHARE do vencedor → BLOQUEIA.
      let loserSettled = false;
      const loserOutcome = captureSettled(
        client.$executeRawUnsafe(
          `UPDATE financial_entries SET deleted_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          seed.tenantId,
          original.id,
        ),
      ).then((outcome) => {
        loserSettled = true;
        return outcome;
      });
      await waitForOwnBlockedStatement(client, {
        applicationName,
        fragment: "financial_entries",
        label: "soft-delete do original bloqueado no FOR SHARE do estorno",
      });
      assert.equal(loserSettled, false, "o soft-delete TEM de estar bloqueado no row lock do original");

      releaseWinner();
      const winner = await winnerOutcome;
      assert.equal(winner.status, "fulfilled", "o vencedor (insert do estorno) tem de commitar");

      // Ao destravar, o Trigger A re-avalia sob READ COMMITTED e vê a contrapartida commitada → RAISE.
      const loser = await loserOutcome;
      assert.equal(loser.status, "rejected", "o perdedor (soft-delete) tem de ser recusado pelo Trigger A");
      assert.match(String((loser as { reason: unknown }).reason), /Ω6R-DIN-002/);

      // Exatamente 1 contrapartida ativa; original VIVO. Par íntegro, nunca órfão.
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: seed.tenantId, reversal_of: original.id, deleted_at: null } }),
        1,
      );
      const originalRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: original.id } });
      assert.equal(originalRow?.deleted_at, null);
      await teardownTenant(h, seed.tenantId);
    } finally {
      await teardown(h);
    }
  });

  // ---------------------------------------------------------------------------------------------
  // B-O6R-02 ciclo 5 · C9 (P13, A1) — as duas portas CRUAS que os triggers NÃO cobrem, fechadas POR
  // CONSTRUÇÃO pela FK composta financial_entries_reversal_pair_fk (migration
  // 20260871000000_add_reversal_pair_fk): o Trigger A só guarda a transição de SOFT-delete e o
  // Trigger B só dispara em INSERT/UPDATE de reversal_of/deleted_at — DELETE físico e rename da PK
  // do original passavam por baixo (medido no §0.d do plano: ambas ACEITAS sem FK). Sondas (v) e
  // (vii), agora permanentes. Vermelho-controle: no down da FK (drill D35) as duas são ACEITAS.
  // ---------------------------------------------------------------------------------------------

  test("[C9/P13][db][fk · sonda v] SQL cru: DELETE físico do original com estorno vivo → 23503 (financial_entries_reversal_pair_fk); par intacto", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "fk-delete-fisico");
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });
      const counter = await h.entryService.reverse(seed.actor, original.id); // par vivo

      await assert.rejects(
        client.$executeRawUnsafe(
          `DELETE FROM financial_entries WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          seed.tenantId,
          original.id,
        ),
        (error: unknown) =>
          /financial_entries_reversal_pair_fk|23503|foreign key/i.test(
            String((error as { message?: unknown })?.message ?? error),
          ),
        "o DELETE físico do original com contrapartida referenciando-o tem de ser recusado pela FK",
      );

      // Par FÍSICO intacto: as duas linhas continuam existindo, e a contrapartida segue apontando.
      const originalRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: original.id } });
      assert.ok(originalRow, "o original tem de continuar existindo fisicamente");
      const counterRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: counter.id } });
      assert.equal(counterRow?.reversal_of, original.id, "a contrapartida tem de seguir apontando o original");
      await teardownTenant(h, seed.tenantId);
    } finally {
      await teardown(h);
    }
  });

  test("[C9/P13][db][fk · sonda vii] SQL cru: UPDATE do id (rename da PK) do original com estorno vivo → 23503; nenhuma PK renomeada", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "fk-rename-pk");
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });
      await h.entryService.reverse(seed.actor, original.id); // par vivo

      await assert.rejects(
        client.$executeRawUnsafe(
          `UPDATE financial_entries SET id = gen_random_uuid() WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          seed.tenantId,
          original.id,
        ),
        (error: unknown) =>
          /financial_entries_reversal_pair_fk|23503|foreign key/i.test(
            String((error as { message?: unknown })?.message ?? error),
          ),
        "o rename da PK do original com contrapartida apontando tem de ser recusado pela FK (ON UPDATE RESTRICT)",
      );

      const originalRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: original.id } });
      assert.ok(originalRow, "a PK do original tem de continuar a mesma (nenhum rename commitou)");
      await teardownTenant(h, seed.tenantId);
    } finally {
      await teardown(h);
    }
  });

  // ---------------------------------------------------------------------------------------------
  // B-O6R-02 ciclo 5 · C10 (P14, A2) — o caso [RLS] REFORMULADO para valer o que o título afirma.
  // Antes ele rodava sob a conexão do harness (superusuário, rolbypassrls=t — medido no §0.e do
  // plano): a política nunca era exercitada e o caso ficou VERDE com os triggers derrubados no
  // ciclo 4. Agora ele roda sob papel efêmero NOBYPASSRLS criado PELO MECANISMO ÚNICO do arnês
  // (createEphemeralRole — a escrita de catálogo entra no lock; teardown resiliente no drop), com a
  // postura do papel ASSERIDA por execução e as duas portas de órfão provadas SOB a política:
  //   · positivo — par legítimo commita (o FOR SHARE do Trigger B enxerga o original sob RLS);
  //   · negativo A — soft-delete do original com contrapartida viva → RAISE Ω6R-DIN-002 (Trigger A);
  //   · negativo B — estorno apontando original SOFT-deletado → RAISE Ω6R-DIN-002 (Trigger B).
  // O negativo B é deliberadamente INDIFERENTE à FK (o original soft-deletado EXISTE fisicamente,
  // a FK passa) — é o que faz o drill D34 discriminar: triggers no down → este caso fica VERMELHO.
  // ---------------------------------------------------------------------------------------------

  test("[C10/P14][db][RLS real] par legítimo commita e as DUAS portas de órfão recusam sob papel efêmero NOBYPASSRLS com a política aplicada", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    const seed = await seedTenant(h, "rls-real");
    const efemera = await createEphemeralRole(client, connection);
    try {
      // Postura do papel, por execução — é isto que o título afirma.
      const postura = await efemera.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
      );
      assert.equal(postura.length, 1);
      assert.equal(postura[0].rolsuper, false, "o papel efêmero não pode ser superusuário");
      assert.equal(postura[0].rolbypassrls, false, "o papel efêmero não pode atravessar a RLS");

      // A política MORDE para este papel: sem contexto de organização, a linha semeada pelo
      // harness é invisível; com o contexto, aparece. (FORCE ROW LEVEL SECURITY na tabela.)
      const semente = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 50,
        payment_method: "pix",
      });
      const semContexto = await efemera.client.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT count(*)::bigint AS n FROM financial_entries WHERE tenant_id = $1::uuid`,
        seed.tenantId,
      );
      assert.equal(Number(semContexto[0].n), 0, "sem contexto, a política tem de esconder as linhas do tenant");
      const comContexto = await h.withTenantRls(efemera.client, seed.tenantId, (tx) =>
        tx.$queryRawUnsafe<Array<{ n: bigint }>>(
          `SELECT count(*)::bigint AS n FROM financial_entries WHERE tenant_id = $1::uuid`,
          seed.tenantId,
        ),
      );
      assert.equal(Number(comContexto[0].n), 1, "com contexto, a linha do próprio tenant aparece");

      // POSITIVO — o par legítimo, inteiro sob o papel RLS-real: original + estorno commitam.
      const par = await h.withTenantRls(efemera.client, seed.tenantId, async (tx) => {
        const [orig] = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO financial_entries (tenant_id, account_id, direction, amount, payment_method, competencia)
           VALUES ($1::uuid, $2::uuid, 'out', 100, 'pix', '2026-05') RETURNING id`,
          seed.tenantId,
          seed.accountId,
        );
        const [rev] = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO financial_entries (tenant_id, account_id, direction, amount, payment_method, competencia, reversal_of)
           VALUES ($1::uuid, $2::uuid, 'in', 100, 'pix', '2026-05', $3::uuid) RETURNING id`,
          seed.tenantId,
          seed.accountId,
          orig.id,
        );
        return { originalId: orig.id, counterId: rev.id };
      });
      assert.ok(par.originalId && par.counterId, "o par legítimo tem de commitar sob o papel RLS-real");

      // NEGATIVO A — porta do delete (Trigger A) sob a política: original com contrapartida viva.
      await assert.rejects(
        h.withTenantRls(efemera.client, seed.tenantId, (tx) =>
          tx.$executeRawUnsafe(
            `UPDATE financial_entries SET deleted_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid`,
            seed.tenantId,
            par.originalId,
          ),
        ),
        (error: unknown) => /Ω6R-DIN-002/.test(String((error as { message?: unknown })?.message ?? error)),
        "soft-delete do original com estorno vivo tem de ser recusado pelo Trigger A sob o papel RLS-real",
      );

      // NEGATIVO B — porta do estorno (Trigger B) sob a política: primeiro desmonta o par por ordem
      // legítima (contrapartida, depois original), e então tenta estornar o original SOFT-deletado.
      await h.withTenantRls(efemera.client, seed.tenantId, async (tx) => {
        await tx.$executeRawUnsafe(
          `UPDATE financial_entries SET deleted_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          seed.tenantId,
          par.counterId,
        );
        await tx.$executeRawUnsafe(
          `UPDATE financial_entries SET deleted_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          seed.tenantId,
          par.originalId,
        );
      });
      await assert.rejects(
        h.withTenantRls(efemera.client, seed.tenantId, (tx) =>
          tx.$executeRawUnsafe(
            `INSERT INTO financial_entries (tenant_id, account_id, direction, amount, payment_method, competencia, reversal_of)
             VALUES ($1::uuid, $2::uuid, 'in', 100, 'pix', '2026-05', $3::uuid)`,
            seed.tenantId,
            seed.accountId,
            par.originalId,
          ),
        ),
        (error: unknown) => /Ω6R-DIN-002/.test(String((error as { message?: unknown })?.message ?? error)),
        "estorno de original soft-deletado tem de ser recusado pelo Trigger B sob o papel RLS-real (a FK NÃO cobre este caso)",
      );

      assert.equal(typeof semente.id, "string");
      await teardownTenant(h, seed.tenantId);
    } finally {
      await efemera.drop();
      await teardown(h);
    }
  });

  // ---------------------------------------------------------------------------------------------
  // B-O6R-02 ciclo 5 · A6 — caso PERMANENTE do censo de legado da migration 20260870: semeia um
  // órfão real (modo réplica desliga os triggers — o idioma dos moldes do repositório —, sempre em
  // tenant PRÓPRIO), executa o MESMO bloco DO $censo$ do arquivo da migration (extraído do .sql,
  // nunca uma cópia digitada) e observa o WARNING nomeado (P-O6R-B02-ORFAOS-LEGADOS). Controle
  // negativo: com o par restaurado, o mesmo censo roda MUDO. Teardown escopado ao tenant próprio.
  // ---------------------------------------------------------------------------------------------

  test("[A6][db][censo] órfão semeado em tenant próprio é contado pelo censo da migration 20260870 com o WARNING nomeado; par restaurado → censo mudo", async () => {
    const h = await bootstrap(connection);
    const seed = await seedTenant(h, "censo-legado");
    const { Client } = await import("pg");
    const raw = new Client({ connectionString: connection });
    const avisos: string[] = [];
    raw.on("notice", (n) => {
      avisos.push(String((n as { message?: string })?.message ?? ""));
    });
    await raw.connect();
    try {
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });
      await h.entryService.reverse(seed.actor, original.id); // par vivo e legítimo

      // Semeia o órfão: soft-delete do original COM os triggers desligados (modo réplica), na MESMA
      // sessão crua — exatamente o estado de legado que o censo existe para contar. A FK do par não
      // é violada (o original segue existindo fisicamente).
      await raw.query(`SET session_replication_role = 'replica'`);
      await raw.query(`UPDATE financial_entries SET deleted_at = now() WHERE tenant_id = $1 AND id = $2`, [
        seed.tenantId,
        original.id,
      ]);
      await raw.query(`SET session_replication_role = DEFAULT`);

      // O censo é o DA MIGRATION — extraído do arquivo .sql, não uma cópia que poderia divergir.
      const migrationSql = readFileSync(
        new URL("../prisma/migrations/20260870000000_add_reversal_pair_atomicity/migration.sql", import.meta.url),
        "utf8",
      );
      const censo = migrationSql.match(/DO \$censo\$[\s\S]*?\$censo\$;/)?.[0];
      assert.ok(censo, "o bloco DO $censo$ tem de existir na migration 20260870");

      avisos.length = 0;
      await raw.query(censo);
      const nomeado = avisos.filter((m) => /ORFAO/i.test(m) && /P-O6R-B02-ORFAOS-LEGADOS/.test(m));
      assert.equal(nomeado.length, 1, `o censo tem de emitir exatamente 1 WARNING nomeado; avisos=${JSON.stringify(avisos)}`);
      assert.match(nomeado[0], /[1-9]\d* estorno/, "o WARNING tem de publicar a contagem (>0)");

      // Controle negativo: restaura o original (transição deletado → vivo não é guardada pelos
      // triggers) e o MESMO censo roda mudo.
      await raw.query(`UPDATE financial_entries SET deleted_at = NULL WHERE tenant_id = $1 AND id = $2`, [
        seed.tenantId,
        original.id,
      ]);
      avisos.length = 0;
      await raw.query(censo);
      assert.equal(
        avisos.filter((m) => /P-O6R-B02-ORFAOS-LEGADOS/.test(m)).length,
        0,
        `com o par restaurado o censo tem de rodar MUDO; avisos=${JSON.stringify(avisos)}`,
      );

      await teardownTenant(h, seed.tenantId);
    } finally {
      await raw.end();
      await teardown(h);
    }
  });
}

// ---------- harness ----------

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { env }, { setTenantRlsContext, withTenantRls }, { deriveCompetencia }, { createDefaultFinancialEntryService }] =
    await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/config/env.js"),
      import("../src/database/rls.js"),
      import("../src/modules/financial-titles/index.js"),
      import("../src/modules/financial-entries/financial-entry.service.js"),
    ]);

  assert.equal(
    env.CORE_SAAS_PERSISTENCE,
    "prisma",
    "assert do modo: a suíte fixa CORE_SAAS_PERSISTENCE=prisma ela mesma; rodar em memory é verde-cego",
  );

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(client, applicationName);
  const entryService = await createDefaultFinancialEntryService();

  return {
    client,
    entryService,
    deriveCompetencia,
    setTenantRlsContext,
    withTenantRls,
    tenantIds: [] as string[],
  };
}

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function seedTenant(h: Harness, tag: string) {
  const { client } = h;
  const marca = `${tag}-${suffix()}`;
  const tenant = await client.tenant.create({ data: { name: `Race ${marca}`, slug: `race-${marca}` } });
  h.tenantIds.push(tenant.id);

  const user = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.user.create({ data: { tenant_id: tenant.id, name: "Financeiro race", email: `race-${marca}@example.com` } }),
  );
  const account = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.financialAccount.create({
      data: { tenant_id: tenant.id, name: `Conta ${marca}`, kind: "cash", currency: "BRL", is_active: true },
    }),
  );

  return {
    tenantId: tenant.id,
    userId: user.id,
    accountId: account.id,
    actor: { tenantId: tenant.id, userId: user.id, roles: [], permissions: [] },
  };
}

// Teardown ESCOPADO ao tenant do próprio teste (nunca a base inteira), em ordem de FK.
async function teardownTenant(h: Harness, tenantId: string): Promise<void> {
  const { client } = h;
  await client.$executeRawUnsafe("delete from financial_entries where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from financial_accounts where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from audit_logs where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from users where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from tenants where id = $1::uuid", tenantId);
  h.tenantIds = h.tenantIds.filter((id) => id !== tenantId);
}

async function teardown(h: Harness): Promise<void> {
  const { client } = h;
  try {
    for (const tenantId of [...h.tenantIds]) {
      await teardownTenant(h, tenantId);
    }
  } finally {
    await client.$disconnect();
  }
}
