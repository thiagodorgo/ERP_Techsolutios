import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  countBlockedStatements,
  expectAllFulfilled,
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";

const connectionString = process.env.DATABASE_URL;

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 2 · C3 (fecha B-5) — CONTROLE NEGATIVO PERMANENTE da barreira escopada.
//
// A junta reprovou o ciclo 1 porque quatro suítes chamavam de "barreira determinística" uma consulta
// CLUSTER-WIDE a pg_stat_activity: no job real (29 arquivos, um processo por arquivo) um backend
// alheio bloqueado por qualquer motivo satisfaz a espera, e o teste passa a acreditar que o SEU
// perdedor travou. Um arnês que acredita em qualquer um não é arnês.
//
// Esta suíte é o guard permanente disso, e prova as duas metades:
//   · CONTROLE POSITIVO — um bloqueio REAL de conexões DESTA suíte satisfaz a barreira escopada.
//   · DECOY — duas conexões CRUAS (sem a tag) criam um statement genuinamente bloqueado, com o
//     mesmo texto; o cluster o enxerga (contado sem escopo, para o decoy não ser vácuo), e a barreira
//     escopada RECUSA-O por ~2 s. No mesmo teste, o bloqueio verdadeiro aparece e ela satisfaz na hora.
//
// Drill D14: remover o filtro `application_name` de `tests/helpers/pg-barrier.ts` → o decoy passa a
// satisfazer a barreira e ESTE arquivo fica vermelho.
//
// O par advisory-lock é de propósito: não toca tabela nenhuma do domínio, então o controle não tem
// teardown de dados — nada é criado, nada é apagado.
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Barreira escopada por application_name exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  // ANTES de qualquer import da aplicação (mesma disciplina das irmãs; drill D7 remove a linha).
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  const applicationName = buildApplicationName("pg-barrier-scoped");
  const taggedConnection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = taggedConnection;

  const ADVISORY_FRAGMENT = "pg_advisory_xact_lock";

  test("controle POSITIVO — bloqueio de conexão DESTA suíte satisfaz a barreira escopada, e a tag chega ao backend", async () => {
    const h = await bootstrap();
    const lockKey = `o6r-barrier-pos-${process.pid}-${Date.now()}`;
    let releaseHolder!: () => void;
    const holderMayCommit = new Promise<void>((resolve) => {
      releaseHolder = resolve;
    });
    let signalHolding!: () => void;
    const holding = new Promise<void>((resolve) => {
      signalHolding = resolve;
    });

    // A tag TEM de estar no backend — senão a barreira ficaria verde por nunca casar nada.
    await assertApplicationNamePropagated(h.tagged, applicationName);

    const holderTx = captureSettled(
      h.tagged.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
          signalHolding();
          await holderMayCommit;
        },
        { timeout: 30000, maxWait: 10000 },
      ),
    );
    await holding;

    // Segunda conexão DESTA suíte (mesma tag) bloqueia na mesma chave.
    const blocked = captureSettled(h.tagged.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
    try {
      await waitForOwnBlockedStatement(h.tagged, {
        applicationName,
        fragment: ADVISORY_FRAGMENT,
        label: "controle positivo: bloqueio da própria suíte",
        timeoutMs: 10000,
      });
      assert.equal(
        await countBlockedStatements(h.tagged, { fragment: ADVISORY_FRAGMENT, applicationName }),
        1,
        "exatamente UM bloqueio da própria suíte — nem zero (barreira cega) nem mais (vazamento entre testes)",
      );
    } finally {
      releaseHolder();
      expectAllFulfilled(await Promise.all([holderTx, blocked]), "controle positivo");
      await h.close();
    }
  });

  test("DECOY — statement realmente bloqueado SEM a tag não satisfaz a barreira escopada; o bloqueio verdadeiro satisfaz na hora", async () => {
    const h = await bootstrap();
    const lockKey = `o6r-barrier-decoy-${process.pid}-${Date.now()}`;
    let releaseHolder!: () => void;
    const holderMayCommit = new Promise<void>((resolve) => {
      releaseHolder = resolve;
    });
    let signalHolding!: () => void;
    const holding = new Promise<void>((resolve) => {
      signalHolding = resolve;
    });

    // O DECOY: as duas pontas são conexões CRUAS, sem application_name (o backend reporta '').
    const holderTx = captureSettled(
      h.untagged.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
          signalHolding();
          await holderMayCommit;
        },
        { timeout: 30000, maxWait: 10000 },
      ),
    );
    await holding;
    const decoyBlocked = captureSettled(h.untagged.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

    let taggedBlocked: ReturnType<typeof captureSettled<unknown>> | undefined;
    try {
      // O decoy tem de EXISTIR de verdade — senão "a barreira não satisfez" seria vácuo.
      const deadline = Date.now() + 10000;
      for (;;) {
        if ((await countBlockedStatements(h.tagged, { fragment: ADVISORY_FRAGMENT })) >= 1) break;
        assert.ok(Date.now() <= deadline, "o decoy não chegou a bloquear — o controle negativo seria vácuo");
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      assert.equal(
        await countBlockedStatements(h.tagged, { fragment: ADVISORY_FRAGMENT, applicationName }),
        0,
        "nenhum bloqueio DESTA suíte deveria existir ainda — só o decoy alheio",
      );

      // A prova: por ~2 s a barreira escopada RECUSA o bloqueio alheio, que o cluster enxerga.
      await assert.rejects(
        () =>
          waitForOwnBlockedStatement(h.tagged, {
            applicationName,
            fragment: ADVISORY_FRAGMENT,
            label: "decoy alheio não pode satisfazer",
            timeoutMs: 2000,
          }),
        /timeout esperando statement bloqueado/,
        "a barreira escopada aceitou um statement bloqueado que NÃO é desta suíte (é o defeito B-5 de volta)",
      );

      // E o bloqueio verdadeiro — mesma chave, agora com a tag — satisfaz.
      taggedBlocked = captureSettled(h.tagged.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
      await waitForOwnBlockedStatement(h.tagged, {
        applicationName,
        fragment: ADVISORY_FRAGMENT,
        label: "bloqueio verdadeiro da própria suíte",
        timeoutMs: 10000,
      });
    } finally {
      releaseHolder();
      expectAllFulfilled(await Promise.all([holderTx, decoyBlocked, ...(taggedBlocked ? [taggedBlocked] : [])]), "decoy");
      await h.close();
    }
  });
}

// ---------- harness ----------

async function bootstrap() {
  const [{ PrismaPg }, { PrismaClient }, { env }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
  ]);

  // ASSERT DO MODO (lição do #357): sem a fixação do topo, num processo memory este assert reprova.
  assert.equal(
    env.CORE_SAAS_PERSISTENCE,
    "prisma",
    "assert do modo: a suíte fixa CORE_SAAS_PERSISTENCE=prisma ela mesma; rodar em memory é verde-cego",
  );

  const tagged = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  // CRUA de propósito: a connection string ORIGINAL, sem application_name — é o backend "alheio".
  const untagged = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });

  return {
    tagged,
    untagged,
    async close(): Promise<void> {
      await Promise.all([tagged.$disconnect(), untagged.$disconnect()]);
    },
  };
}
