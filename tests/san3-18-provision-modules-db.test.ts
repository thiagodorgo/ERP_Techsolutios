import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// B-SAN3-18 (P6 do plano v2; R2-04 e R2-09 da Emenda 1; P1(a) do dono) — o script de provisionamento só ACRESCENTA,
// numa transação única, sob papel NOSUPERUSER NOBYPASSRLS (o papel efêmero do arnês, nunca o dono do banco):
//   - depois dele, toda organização tem `ALL_MODULE_CLASSES` e nenhuma chave antiga some; o apelido ganha a canônica;
//   - o menu visível depois contém o menu visível antes, para as 4 organizações de fixture (R2-04(3));
//   - a contagem impressa bate com o SELECT; a 2ª execução muda 0 linhas; a simulação não grava nada;
//   - `assinaturas_com_versao_sem_chaves` conta 1 para a assinatura vigente cuja versão não tem `patios`, lida com o
//     GUC organização por organização — o 0 só vale se o caso com 1 imprimir 1 (R2-09);
//   - organização que sobra incompleta → código de saída 1 e a transação inteira desfeita.
// Vermelho-controle no head-base (`da12fec6`): o script não existe.

const connectionString = process.env.DATABASE_URL;
const NOW = new Date("2026-11-11T12:00:00-03:00");

if (!connectionString) {
  test("B-SAN3-18 · provisionamento exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL para executar o P6 do B-SAN3-18.",
  });
} else {
  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new Client({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    return { admin, role, tenantIds: [] as string[], planIds: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      if (h.tenantIds.length > 0) {
        await h.admin.$executeRawUnsafe(`DELETE FROM tenant_subscription_addons WHERE tenant_id = ANY($1::uuid[])`, h.tenantIds);
        await h.admin.$executeRawUnsafe(`DELETE FROM tenant_subscriptions WHERE tenant_id = ANY($1::uuid[])`, h.tenantIds);
        await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, h.tenantIds);
      }
      if (h.planIds.length > 0) {
        await h.admin.$executeRawUnsafe(`DELETE FROM subscription_plan_versions WHERE plan_id = ANY($1::uuid[])`, h.planIds);
        await h.admin.$executeRawUnsafe(`DELETE FROM subscription_plans WHERE id = ANY($1::uuid[])`, h.planIds);
      }
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  async function novaOrganizacao(h: Harness, tag: string, modules: readonly string[]): Promise<string> {
    const slug = `san318-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenants (name, slug, modules) VALUES ($1, $1, $2::text[]) RETURNING id::text AS id`,
      slug,
      [...modules],
    );
    h.tenantIds.push(rows[0]!.id);
    return rows[0]!.id;
  }

  async function assinaturaComVersao(h: Harness, tenantId: string, modules: readonly string[]): Promise<void> {
    const code = `san318_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const plano = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO subscription_plans (code, kind, name) VALUES ($1, 'base', $1) RETURNING id::text AS id`,
      code,
    );
    const planId = plano[0]!.id;
    h.planIds.push(planId);
    await h.admin.$executeRawUnsafe(
      `INSERT INTO subscription_plan_versions
         (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb, extra_user_price, extra_gb_price, pricing_unit, modules)
       VALUES ($1::uuid, 1, $2::timestamptz, 100.00, 10, 10.000, 5.00, 2.00, 'flat', $3::text[])`,
      planId,
      new Date("2026-11-01T00:00:00-03:00"),
      [...modules],
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from) VALUES ($1::uuid, $2::uuid, $3::timestamptz)`,
      tenantId,
      planId,
      new Date("2026-11-01T00:00:00-03:00"),
    );
  }

  async function modulosDe(client: PrismaClient, ids: readonly string[]): Promise<Record<string, string[]>> {
    const rows = await client.$queryRawUnsafe<Array<{ id: string; modules: string[] }>>(
      `SELECT id::text AS id, modules FROM tenants WHERE id = ANY($1::uuid[])`,
      [...ids],
    );
    return Object.fromEntries(rows.map((r) => [r.id, r.modules]));
  }

  async function menuDe(modules: readonly string[]): Promise<string[]> {
    const [{ getMenuForCurrentUser }, { ROLE_PERMISSIONS }] = await Promise.all([
      import("../src/modules/navigation/navigation.service.js"),
      import("../src/modules/core-saas/permissions/catalog.js"),
    ]);
    return getMenuForCurrentUser({ userId: "u", tenantId: "t", roles: ["tenant_admin"], permissions: [...ROLE_PERMISSIONS.tenant_admin], enabledModules: modules }).map((i) => i.path);
  }

  const DEMO_ANTIGA = ["dashboard", "work_orders", "field_operations", "logistics", "finance", "checklists", "tenant_checklist", "notifications", "users", "audit"];

  test("P6 — simulação e aplicação sob papel sem bypass: só acrescenta, menu não encolhe, contagens batem, 2ª execução muda 0", async () => {
    const h = await harness();
    const [{ provisionarModulos }, { ALL_MODULE_CLASSES }] = await Promise.all([
      import("../scripts/san3-18-provisionar-modulos.js"),
      import("../src/modules/navigation/route-modules.js"),
    ]);
    const demo = await novaOrganizacao(h, "demo", DEMO_ANTIGA);
    const vazia = await novaOrganizacao(h, "vazia", []);
    const apelido = await novaOrganizacao(h, "apelido", ["work-orders", "checklists", "dashboard"]);
    const comAssinatura = await novaOrganizacao(h, "assinatura", ["dashboard", "work_orders"]);
    await assinaturaComVersao(h, comAssinatura, ALL_MODULE_CLASSES.filter((k) => k !== "patios"));
    const ids = [demo, vazia, apelido, comAssinatura];
    const antes = await modulosDe(h.admin, ids);
    const menusAntes = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await menuDe(antes[id]!)] as const)));

    const simulacao = await provisionarModulos(h.role.client, { aplicar: false, agora: NOW, somenteOrganizacoes: h.tenantIds });
    assert.equal(simulacao.codigoDeSaida, 0, simulacao.linhas.join("\n"));
    assert.equal(simulacao.organizacoes, 4);
    assert.equal(simulacao.incompletasAntes, 4);
    assert.equal(simulacao.aAlterar, 4, `a simulação vê as 4 de fixture: ${simulacao.aAlterar}`);
    assert.equal(simulacao.assinaturasComVersaoSemChaves, 1, "a assinatura da fixture cuja versão não tem patios");
    assert.equal(simulacao.alteradas, 0);
    assert.equal(simulacao.incompletasDepois, 0);
    assert.deepEqual(await modulosDe(h.admin, ids), antes, "a simulação não grava nada");

    const aplicado = await provisionarModulos(h.role.client, { aplicar: true, agora: NOW, somenteOrganizacoes: h.tenantIds });
    assert.equal(aplicado.codigoDeSaida, 0, aplicado.linhas.join("\n"));
    assert.equal(aplicado.alteradas, aplicado.aAlterar);
    assert.ok(aplicado.linhas.includes(`alteradas=${aplicado.alteradas}`));
    assert.ok(aplicado.linhas.includes("incompletas_depois=0"));
    const depois = await modulosDe(h.admin, ids);
    for (const id of ids) {
      for (const chave of ALL_MODULE_CLASSES) assert.ok(depois[id]!.includes(chave), `${id} sem ${chave}`);
      for (const chave of antes[id]!) assert.ok(depois[id]!.includes(chave), `${id} perdeu ${chave}`);
      const menuDepois = await menuDe(depois[id]!);
      assert.deepEqual(menusAntes[id]!.filter((p: string) => !menuDepois.includes(p)), [], `${id}: o menu visível encolheu`);
    }
    assert.ok(depois[apelido]!.includes("work-orders") && depois[apelido]!.includes("work_orders"), "o apelido fica e ganha a canônica");
    assert.ok(depois[apelido]!.includes("checklists") && depois[apelido]!.includes("tenant_checklist"));
    const incompletasNoBanco = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM tenants WHERE id = ANY($2::uuid[]) AND NOT (modules @> $1::text[])`,
      [...ALL_MODULE_CLASSES],
      ids,
    );
    assert.equal(incompletasNoBanco[0]!.n, 0, "o SELECT confirma a contagem impressa (0 incompletas)");

    const segunda = await provisionarModulos(h.role.client, { aplicar: true, agora: NOW, somenteOrganizacoes: h.tenantIds });
    assert.equal(segunda.alteradas, 0, "idempotente: a 2ª execução muda 0 linhas");
    assert.equal(segunda.aAlterar, 0);
  });

  test("P6 (R2-09) — a assinatura vigente cuja versão não tem `patios` conta 1, lida com o GUC sob papel sem bypass", async () => {
    const h = await harness();
    const [{ provisionarModulos }, { ALL_MODULE_CLASSES }] = await Promise.all([
      import("../scripts/san3-18-provisionar-modulos.js"),
      import("../src/modules/navigation/route-modules.js"),
    ]);
    const completa = await novaOrganizacao(h, "assin-completa", []);
    await assinaturaComVersao(h, completa, [...ALL_MODULE_CLASSES]);
    const semPatios = await novaOrganizacao(h, "assin-sem-patios", []);
    await assinaturaComVersao(h, semPatios, ALL_MODULE_CLASSES.filter((k) => k !== "patios"));
    const r = await provisionarModulos(h.role.client, { aplicar: false, agora: NOW, somenteOrganizacoes: [completa, semPatios] });
    assert.equal(r.assinaturasComVersaoSemChaves, 1, r.linhas.join("\n"));
    const soCompleta = await provisionarModulos(h.role.client, { aplicar: false, agora: NOW, somenteOrganizacoes: [completa] });
    assert.equal(soCompleta.assinaturasComVersaoSemChaves, 0, "controle: a versão completa não conta");
    assert.ok(r.linhas.includes(`assinaturas_com_versao_sem_chaves=${r.assinaturasComVersaoSemChaves}`));
    const papel = await h.role.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
    );
    assert.deepEqual(papel[0], { rolsuper: false, rolbypassrls: false }, "a leitura roda sob papel sem superusuário e sem BYPASSRLS");
  });

  test("P6 — organização que sobra incompleta → código de saída 1 e nada gravado (transação desfeita)", async () => {
    const h = await harness();
    const [{ provisionarModulos }, { ALL_MODULE_CLASSES }] = await Promise.all([
      import("../scripts/san3-18-provisionar-modulos.js"),
      import("../src/modules/navigation/route-modules.js"),
    ]);
    const org = await novaOrganizacao(h, "incompleta", ["dashboard"]);
    const antes = await modulosDe(h.admin, [org]);
    const r = await provisionarModulos(h.role.client, { aplicar: true, agora: NOW, somenteOrganizacoes: [org], chavesAcrescentadas: ALL_MODULE_CLASSES.filter((k) => k !== "patios") });
    assert.equal(r.codigoDeSaida, 1, r.linhas.join("\n"));
    assert.ok(r.linhas.some((l) => l.startsWith("FALHOU")));
    assert.deepEqual(await modulosDe(h.admin, [org]), antes, "a transação foi desfeita");
    const ok = await provisionarModulos(h.role.client, { aplicar: true, agora: NOW, somenteOrganizacoes: h.tenantIds });
    assert.equal(ok.codigoDeSaida, 0, ok.linhas.join("\n"));
  });
}
