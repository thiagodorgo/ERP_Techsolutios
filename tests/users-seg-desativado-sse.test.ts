import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { type TestContext } from "node:test";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — T16b (Emenda 1, A1): o tique do stream do mapa (`/operations/field-events/stream`)
// confere a sessão sem derrubar o processo. Em MEMÓRIA, dentro do `npm test`.
//
// Montagem: `createApp` em memória e token Bearer `manager` assinado direto. O relógio simulado é o DO TestContext
// (`t.mock.timers`, só em `setInterval`, ligado DEPOIS do `listen` e ANTES de abrir o stream): o `node:test` restaura
// o relógio no fim do caso, inclusive quando a mutação solta rejeição. Depois do evento `ready`, a conferência vira
// dublê (`t.mock.method(sessionLiveness, "check")`), e a chamada do portão na abertura é a real ("skipped" em
// memória). `t.mock.timers.tick(25_000)` dispara o tique; dois `setImmediate` (não simulados) esvaziam a fila. Toda
// leitura do stream tem prazo de relógio REAL (`AbortSignal.timeout`), para que uma mutação dê `not ok` e não trave o
// teste; cada caso tem o próprio teto (`timeout` do `node:test`). Observa `unhandledRejection` e `uncaughtException`.
//
//   16b-1 conferência que rejeita não vaza nem fecha (1 tique)                       · M12 · M14
//   16b-2 duas falhas seguidas fecham com `session_check_unavailable` e 0 assinantes  · M12
//   16b-3 falha, sucesso, falha não fecha                                            · M14 · M15
//   16b-4 tique pendente não sobrepõe                                                · M13
//   16b-5 `inactive` fecha com `session_inactive` e 0 assinantes
//   16b-6 erro síncrono da conferência não vaza
// -----------------------------------------------------------------------------------------------

process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.JWT_SECRET = "dev-only-change-me";
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;

const TIQUE_MS = 25_000;
// E2.6 (PRE543-03): teto de leitura do stream em relógio REAL — o AbortSignal.timeout não pode ser
// desfeito por um clearTimeout do caminho de limpeza, então uma mutação que deixe o stream aberto
// (M12) não trava o processo.
const STREAM_READ_TTL_MS = 2_000;
// Teto por teste (node:test): nenhum caso pode prender a suíte; com o teto do stream em 2 s, o
// orçamento sobra para a limpeza do arnês e para o relógio real do `esperar`.
const TEST_TIMEOUT_MS = 15_000;

type Verdict = "alive" | "inactive" | "skipped";

type Cena = {
  readonly tenantId: string;
  readonly texto: () => string;
  readonly terminou: () => boolean;
  readonly assinantes: () => number;
  readonly rejeicoes: unknown[];
  readonly excecoes: unknown[];
  tique(): Promise<void>;
  chamadas(): number;
};

async function esperar(condicao: () => boolean, prazoMs = 1_500): Promise<boolean> {
  const fim = Date.now() + prazoMs;

  while (!condicao()) {
    if (Date.now() > fim) {
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  return true;
}

const drenar = async (): Promise<void> => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

async function comStream(
  t: TestContext,
  impl: (...args: unknown[]) => Promise<Verdict> | Verdict,
  corpo: (cena: Cena) => Promise<void>,
): Promise<void> {
  const [
    { createApp },
    { signAccessToken },
    { sessionLiveness },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { fieldOpsRealtimeBroker },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/auth/index.js"),
    import("../src/modules/auth/services/session-liveness.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/field-ops-realtime/field-ops-realtime.broker.js"),
  ]);
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "Mapa ao vivo", modules: ["work_orders", "field_operations"] });
  const user = core.createUser({ tenantId: tenant.id, name: "Gestor", email: "gestor-mapa@example.com", roles: ["manager"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const token = await signAccessToken({
    user_id: user.id,
    tenant_id: tenant.id,
    email: "gestor-mapa@example.com",
    roles: ["manager"],
  });
  const server: Server = app.listen(0, "127.0.0.1");

  await new Promise<void>((resolve) => server.once("listening", () => resolve()));

  const rejeicoes: unknown[] = [];
  const excecoes: unknown[] = [];
  const onRejection = (reason: unknown) => rejeicoes.push(reason);
  const onException = (error: unknown) => excecoes.push(error);

  process.on("unhandledRejection", onRejection);
  process.on("uncaughtException", onException);

  let texto = "";
  let terminou = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    t.mock.timers.enable({ apis: ["setInterval"] });

    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const response = await fetch(`${base}/api/v1/operations/field-events/stream`, {
      headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" },
      signal: AbortSignal.timeout(STREAM_READ_TTL_MS),
    });

    assert.equal(response.status, 200, "o stream abre");

    reader = response.body!.getReader();

    const decoder = new TextDecoder();
    const leitor = reader;

    void (async () => {
      try {
        for (;;) {
          const { done, value } = await leitor.read();

          if (done) {
            terminou = true;
            break;
          }

          texto += decoder.decode(value, { stream: true });
        }
      } catch {
        terminou = true;
      }
    })();

    assert.ok(await esperar(() => texto.includes("event: ready")), "o evento ready chega");

    const check = t.mock.method(sessionLiveness, "check", impl as never);

    await corpo({
      tenantId: tenant.id,
      texto: () => texto,
      terminou: () => terminou,
      assinantes: () => fieldOpsRealtimeBroker.subscriberCount(tenant.id),
      rejeicoes,
      excecoes,
      async tique() {
        t.mock.timers.tick(TIQUE_MS);
        await drenar();
      },
      chamadas: () => check.mock.callCount(),
    });
  } finally {
    await reader?.cancel().catch(() => undefined);
    await esperar(() => fieldOpsRealtimeBroker.subscriberCount(tenant.id) === 0, 1_000);
    process.off("unhandledRejection", onRejection);
    process.off("uncaughtException", onException);
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

const rejeita = async (): Promise<Verdict> => {
  throw new Error("banco fora (dublê)");
};

test("16b-1 — conferência que rejeita não vaza nem fecha", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  await comStream(t, rejeita, async (cena) => {
    await cena.tique();

    assert.equal(cena.chamadas(), 1, "o tique chama a conferência uma vez");
    assert.equal(cena.terminou(), false, "o stream segue aberto");
    assert.equal(cena.assinantes(), 1, "o assinante segue");
    assert.doesNotMatch(cena.texto(), /event: session_check_unavailable/);
    assert.deepEqual(cena.rejeicoes, [], "0 rejeições sem tratamento");
    assert.deepEqual(cena.excecoes, [], "0 exceções sem tratamento");
  });
});

test("16b-2 — duas falhas seguidas fecham com session_check_unavailable e 0 assinantes", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  await comStream(t, rejeita, async (cena) => {
    await cena.tique();
    await cena.tique();

    assert.ok(await esperar(() => cena.terminou()), "a leitura termina (done)");
    assert.match(cena.texto(), /event: session_check_unavailable/);
    assert.ok(await esperar(() => cena.assinantes() === 0), "0 assinantes depois do fim");
    assert.equal(cena.chamadas(), 2);
    assert.deepEqual(cena.rejeicoes, []);
    assert.deepEqual(cena.excecoes, []);
  });
});

test("16b-3 — falha, sucesso, falha não fecha", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  const respostas: Array<() => Promise<Verdict>> = [rejeita, async () => "alive", rejeita];
  let i = 0;

  await comStream(t, () => (respostas[i++] ?? rejeita)(), async (cena) => {
    await cena.tique();
    await cena.tique();
    await cena.tique();

    assert.equal(cena.chamadas(), 3, "três tiques, três conferências");
    assert.equal(cena.terminou(), false, "o sucesso no meio zerou a contagem: o stream segue aberto");
    assert.equal(cena.assinantes(), 1);
    assert.doesNotMatch(cena.texto(), /event: session_check_unavailable/);
    assert.deepEqual(cena.rejeicoes, []);
  });
});

test("16b-4 — tique pendente não sobrepõe outra conferência", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  let liberar: (verdict: Verdict) => void = () => undefined;
  let primeira = true;

  await comStream(
    t,
    () => {
      if (primeira) {
        primeira = false;

        return new Promise<Verdict>((resolve) => {
          liberar = resolve;
        });
      }

      return Promise.resolve("alive" as const);
    },
    async (cena) => {
      await cena.tique();
      await cena.tique();

      assert.equal(cena.chamadas(), 1, "com a primeira pendente, o segundo tique não chama de novo");

      liberar("alive");
      await drenar();
      await cena.tique();

      assert.equal(cena.chamadas(), 2, "resolvida a primeira, o tique seguinte chama");
      assert.equal(cena.terminou(), false);
    },
  );
});

test("16b-5 — inactive fecha com session_inactive e 0 assinantes", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  await comStream(t, async () => "inactive", async (cena) => {
    await cena.tique();

    assert.ok(await esperar(() => cena.terminou()), "a leitura termina (done)");
    assert.match(cena.texto(), /event: session_inactive/);
    assert.ok(await esperar(() => cena.assinantes() === 0), "0 assinantes depois do fim");
    assert.equal(cena.chamadas(), 1);
  });
});

test("16b-6 — erro síncrono da conferência não vaza", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  await comStream(
    t,
    () => {
      throw new Error("erro síncrono (dublê)");
    },
    async (cena) => {
      await cena.tique();

      assert.equal(cena.chamadas(), 1);
      assert.equal(cena.terminou(), false, "o stream segue aberto");
      assert.equal(cena.assinantes(), 1);
      assert.deepEqual(cena.rejeicoes, [], "0 rejeições sem tratamento");
      assert.deepEqual(cena.excecoes, [], "0 exceções sem tratamento");
    },
  );
});
