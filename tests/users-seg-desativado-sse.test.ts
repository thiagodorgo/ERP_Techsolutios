import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { mock } from "node:test";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — T16b (Emenda 1, A1): o tique do stream do mapa (`/operations/field-events/stream`)
// confere a sessão sem derrubar o processo. Em MEMÓRIA, dentro do `npm test`.
//
// Montagem: `createApp` em memória e token Bearer `manager` assinado direto. `mock.timers` só em `setInterval`
// (ligado DEPOIS do `listen` e ANTES de abrir o stream); depois do evento `ready`, a conferência vira dublê
// (`mock.method(sessionLiveness, "check")`), e a chamada do portão na abertura é a real ("skipped" em memória).
// `mock.timers.tick(25_000)` dispara o tique; dois `setImmediate` (não simulados) esvaziam a fila. Toda leitura do
// stream tem prazo (relógio real), para que uma mutação dê `not ok` e não trave o teste. Observa
// `unhandledRejection` e `uncaughtException` do processo.
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
  mock.timers.enable({ apis: ["setInterval"] });

  const controller = new AbortController();
  const prazo = setTimeout(() => controller.abort(), 2_000);
  let texto = "";
  let terminou = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const response = await fetch(`${base}/api/v1/operations/field-events/stream`, {
      headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" },
      signal: controller.signal,
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

    const check = mock.method(sessionLiveness, "check", impl as never);

    await corpo({
      tenantId: tenant.id,
      texto: () => texto,
      terminou: () => terminou,
      assinantes: () => fieldOpsRealtimeBroker.subscriberCount(tenant.id),
      rejeicoes,
      excecoes,
      async tique() {
        mock.timers.tick(TIQUE_MS);
        await drenar();
      },
      chamadas: () => check.mock.callCount(),
    });
  } finally {
    clearTimeout(prazo);
    await reader?.cancel().catch(() => undefined);
    controller.abort();
    await esperar(() => fieldOpsRealtimeBroker.subscriberCount(tenant.id) === 0, 1_000);
    mock.timers.reset();
    mock.restoreAll();
    process.off("unhandledRejection", onRejection);
    process.off("uncaughtException", onException);
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

const rejeita = async (): Promise<Verdict> => {
  throw new Error("banco fora (dublê)");
};

test("16b-1 — conferência que rejeita não vaza nem fecha", async () => {
  await comStream(rejeita, async (cena) => {
    await cena.tique();

    assert.equal(cena.chamadas(), 1, "o tique chama a conferência uma vez");
    assert.equal(cena.terminou(), false, "o stream segue aberto");
    assert.equal(cena.assinantes(), 1, "o assinante segue");
    assert.doesNotMatch(cena.texto(), /event: session_check_unavailable/);
    assert.deepEqual(cena.rejeicoes, [], "0 rejeições sem tratamento");
    assert.deepEqual(cena.excecoes, [], "0 exceções sem tratamento");
  });
});

test("16b-2 — duas falhas seguidas fecham com session_check_unavailable e 0 assinantes", async () => {
  await comStream(rejeita, async (cena) => {
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

test("16b-3 — falha, sucesso, falha não fecha", async () => {
  const respostas: Array<() => Promise<Verdict>> = [rejeita, async () => "alive", rejeita];
  let i = 0;

  await comStream(() => (respostas[i++] ?? rejeita)(), async (cena) => {
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

test("16b-4 — tique pendente não sobrepõe outra conferência", async () => {
  let liberar: (verdict: Verdict) => void = () => undefined;
  let primeira = true;

  await comStream(
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

test("16b-5 — inactive fecha com session_inactive e 0 assinantes", async () => {
  await comStream(async () => "inactive", async (cena) => {
    await cena.tique();

    assert.ok(await esperar(() => cena.terminou()), "a leitura termina (done)");
    assert.match(cena.texto(), /event: session_inactive/);
    assert.ok(await esperar(() => cena.assinantes() === 0), "0 assinantes depois do fim");
    assert.equal(cena.chamadas(), 1);
  });
});

test("16b-6 — erro síncrono da conferência não vaza", async () => {
  await comStream(
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
