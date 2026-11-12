import assert from "node:assert/strict";
import test, { after } from "node:test";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import { TODOS_OS_MODULOS } from "./helpers/san3-18-modulos.js";
import {
  administradorDe,
  desmontarSessaoReal,
  entrar,
  montarSessaoReal,
  novaOrganizacao,
  portador,
  type SessaoRealHarness,
} from "./helpers/users-seg-desativado-sessao.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — T16: o stream do mapa ao vivo (`GET /api/v1/operations/field-events/stream`) de quem é
// desativado se encerra em até um intervalo de keep-alive (25 s), com `event: session_inactive`, e o assinante
// sai do broker. Relógio REAL (até 32 s de espera), app real em modo `prisma` forçado e conferido, Prisma global
// no papel efêmero (A9). Hoje o stream segue aberto sem fim (a conferência só existe na abertura).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-SEG-DESATIVADO · stream (app real) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  let harnessPromise: Promise<SessaoRealHarness> | undefined;

  const harness = (): Promise<SessaoRealHarness> =>
    (harnessPromise ??= (async () => {
      const h = await montarSessaoReal(connectionString);

      try {
        const { env } = await import("../src/config/env.js");

        assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "E1.5: a suíte roda em prisma, nunca em memória");
        assert.equal((await import("../src/database/prisma.js")).prisma, h.role.client, "A9: o portão usa o papel");
      } catch (error) {
        // O assert do modo ou do cliente falhou (drills D-A4/D-A9): desmonta antes de propagar, para o processo
        // não ficar preso no servidor aberto.
        await desmontarSessaoReal(h);
        throw error;
      }

      return h;
    })());

  after(async () => {
    if (harnessPromise) {
      // Arnês que falhou já se desmontou.
      const h = await harnessPromise.catch(() => undefined);

      if (h) {
        await desmontarSessaoReal(h);
      }
    }
  });

  async function esperar(condicao: () => boolean, prazoMs: number): Promise<boolean> {
    const fim = Date.now() + prazoMs;

    while (!condicao()) {
      if (Date.now() > fim) {
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return true;
  }

  test("T16 — desativado com o mapa aberto: o stream fecha com session_inactive em até 25 s e 0 assinantes", async () => {
    const h = await harness();
    const { fieldOpsRealtimeBroker } = await import("../src/modules/field-ops-realtime/field-ops-realtime.broker.js");
    const org = await novaOrganizacao(h, "t16", { roleKey: "manager" });
    await h.admin.tenant.update({ where: { id: org.tenantId }, data: { modules: [...TODOS_OS_MODULOS] } }); // B-SAN3-18: o gate de módulo exige as áreas que o teste usa
    const permission = await h.admin.permission.upsert({
      where: { key: "field_location:read" },
      update: {},
      create: { key: "field_location:read", description: "Permissão field_location:read" },
    });

    await h.admin.rolePermission.create({ data: { role_id: org.roleId, permission_id: permission.id } });

    const admin = await administradorDe(h, org.tenantId);
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });
    const controller = new AbortController();
    const prazo = setTimeout(() => controller.abort(), 40_000);
    let texto = "";
    let terminou = false;

    try {
      const response = await fetch(`${h.baseUrl}/api/v1/operations/field-events/stream`, {
        headers: { ...portador(sessao.accessToken), accept: "text/event-stream" },
        signal: controller.signal,
      });

      assert.equal(response.status, 200, "controle: o ativo abre o stream");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      void (async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();

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

      assert.ok(await esperar(() => texto.includes("event: ready"), 5_000), "o evento ready chega");
      assert.equal(fieldOpsRealtimeBroker.subscriberCount(org.tenantId), 1, "fixture: um assinante");

      const desativa = await requestJson(h.baseUrl, `/api/v1/users/${org.userId}`, {
        method: "PATCH",
        headers: admin.headers,
        body: { status: "inactive" },
      });

      assert.equal(desativa.status, 200, `a desativação pela API: ${JSON.stringify(desativa.body).slice(0, 200)}`);

      const inicio = Date.now();
      const fechou = await esperar(() => terminou, 32_000);
      const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

      assert.ok(fechou, `o stream fecha em até 32 s depois da desativação (esperou ${segundos} s; recebido: ${texto.slice(-200)})`);
      assert.match(texto, /event: session_inactive/, "o último evento diz por quê");
      assert.ok(
        await esperar(() => fieldOpsRealtimeBroker.subscriberCount(org.tenantId) === 0, 2_000),
        "0 assinantes depois do fim",
      );
    } finally {
      clearTimeout(prazo);
      controller.abort();
    }
  });

  test("T16b — sessão encerrada (revogação) com o usuário ATIVO: o stream fecha com session_inactive", async () => {
    const h = await harness();
    const { fieldOpsRealtimeBroker } = await import("../src/modules/field-ops-realtime/field-ops-realtime.broker.js");
    const org = await novaOrganizacao(h, "t16b", { roleKey: "manager" });
    await h.admin.tenant.update({ where: { id: org.tenantId }, data: { modules: [...TODOS_OS_MODULOS] } }); // B-SAN3-18: o gate de módulo exige as áreas que o teste usa
    const permission = await h.admin.permission.upsert({
      where: { key: "field_location:read" },
      update: {},
      create: { key: "field_location:read", description: "Permissão field_location:read" },
    });

    await h.admin.rolePermission.create({ data: { role_id: org.roleId, permission_id: permission.id } });

    const admin = await administradorDe(h, org.tenantId);
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });
    const controller = new AbortController();
    const prazo = setTimeout(() => controller.abort(), 40_000);
    let texto = "";
    let terminou = false;

    try {
      const response = await fetch(`${h.baseUrl}/api/v1/operations/field-events/stream`, {
        headers: { ...portador(sessao.accessToken), accept: "text/event-stream" },
        signal: controller.signal,
      });

      assert.equal(response.status, 200, "controle: o usuário ativo com sessão viva abre o stream");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      void (async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();

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

      assert.ok(await esperar(() => texto.includes("event: ready"), 5_000), "o evento ready chega");
      assert.equal(fieldOpsRealtimeBroker.subscriberCount(org.tenantId), 1, "fixture: um assinante");

      // A sessão é encerrada sem desativar o usuário: é a mutação X3 (ator sem sid) que deixaria o mapa aberto.
      const revogacao = await requestJson(h.baseUrl, `/api/v1/sessions/${sessao.sessionId}/revoke`, {
        method: "POST",
        headers: admin.headers,
      });

      assert.equal(revogacao.status, 200, `a revogação da sessão: ${JSON.stringify(revogacao.body).slice(0, 200)}`);

      const inicio = Date.now();
      const fechou = await esperar(() => terminou, 32_000);
      const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

      assert.ok(fechou, `o stream fecha em até 32 s depois da revogação da sessão (esperou ${segundos} s; recebido: ${texto.slice(-200)})`);
      assert.match(texto, /event: session_inactive/, "o último evento diz por quê");
      assert.ok(
        await esperar(() => fieldOpsRealtimeBroker.subscriberCount(org.tenantId) === 0, 2_000),
        "0 assinantes depois do fim",
      );
    } finally {
      clearTimeout(prazo);
      controller.abort();
    }
  });
}
