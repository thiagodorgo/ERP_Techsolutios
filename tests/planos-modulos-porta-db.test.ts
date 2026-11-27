import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "prisma";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import { ensurePermission } from "./helpers/db-permissions.js";
import {
  desmontarPlatOrgReal,
  montarPlatOrgReal,
  type PlatOrgRealHarness,
} from "./helpers/plat-org-real.js";
import { entrar, novaOrganizacao, novoUsuario, portador } from "./helpers/users-seg-desativado-sessao.js";

// B-PLANOS-MODULOS (§8.3 do plano, D1 a D10) — a porta `PATCH /api/v1/platform/tenants/:tenantId/modules` contra o
// PostgreSQL, com o app rodando sob papel EFÊMERO NOSUPERUSER NOBYPASSRLS (o arranjo em que a RLS existe) e a
// semeadura pela conexão administrativa do arnês. Molde: `tests/plat-org-real-isolamento-db.test.ts`.
//
// Decisão do dono `D-PLANOS-MODULOS-PORTA-REAL` (P1, opção A): organização SEM assinatura em vigor é ligada e
// desligada pela plataforma, de verdade e com trilha dupla; COM assinatura em vigor a porta recusa 409 e quem manda
// nos módulos é o plano contratado — a assinatura substitui a lista inteira (D7).
//
// D2 é o teste de encerramento da pendência `P-SAN3-18-PORTA-DE-MODULO-POR-ORG`: o gate e o menu passam a enxergar
// (e deixam de enxergar) a área sem novo login.
//
// Vermelho-controle no head-base `8719cf045`: a porta respondia 409 para TODA organização (D1, D2, D4, D6, D8, D9),
// nada era gravado em `platform_audit_logs`/`audit_logs` (D3) e a leitura devolvia o mapa de código com o plano
// cravado `"starter"` (D10).

const connectionString = process.env.DATABASE_URL;
assert.ok(connectionString, "DATABASE_URL is required");

let harnessPromise: Promise<PlatOrgRealHarness> | undefined;
const harness = (): Promise<PlatOrgRealHarness> => (harnessPromise ??= montarPlatOrgReal(connectionString));
const planIds: string[] = [];

after(async () => {
  if (!harnessPromise) return;
  const h = await harnessPromise.catch(() => undefined);
  if (!h) return;
  try {
    if (planIds.length > 0) {
      await h.admin.$executeRawUnsafe(
        `DELETE FROM tenant_subscription_addons WHERE subscription_id IN (SELECT id FROM tenant_subscriptions WHERE plan_id = ANY($1::uuid[]))`,
        planIds,
      );
      await h.admin.$executeRawUnsafe(
        `DELETE FROM tenant_subscriptions WHERE plan_id = ANY($1::uuid[])`,
        planIds,
      );
      await h.admin.$executeRawUnsafe(
        `DELETE FROM subscription_plan_versions WHERE plan_id = ANY($1::uuid[])`,
        planIds,
      );
      await h.admin.$executeRawUnsafe(`DELETE FROM subscription_plans WHERE id = ANY($1::uuid[])`, planIds);
    }
  } finally {
    await desmontarPlatOrgReal(h);
  }
});

test("D1 — o PATCH grava tenants.modules só da organização alvo", async () => {
  const h = await harness();
  const alvo = await novaOrganizacao(h, "planos-mod-d1-alvo");
  const vizinha = await novaOrganizacao(h, "planos-mod-d1-vizinha");
  await h.admin.tenant.update({ where: { id: vizinha.tenantId }, data: { modules: ["dashboard"] } });

  const resposta = await patchModulos(h, alvo.tenantId, ["patios", "work_orders"]);
  assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
  assert.deepEqual(await modulesDe(h, alvo.tenantId), ["work_orders", "patios"]);
  assert.deepEqual(await modulesDe(h, vizinha.tenantId), ["dashboard"]);

  const lido = await lerModulos(h, alvo.tenantId);
  assert.equal(lido.status, 200, JSON.stringify(lido.body));
  const modulos = lido.body.data as Modulo[];
  assert.equal(porChave(modulos).get("work_orders")?.status, "enabled");
  assert.equal(porChave(modulos).get("patios")?.status, "enabled");
});

test("D2 — gate e menu enxergam a área ligada e desligada sem novo login", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "planos-mod-d2");
  const usuario = await usuarioDaOrganizacao(h, org.tenantId, "d2", ["work_orders:read"]);
  const sessao = await entrar(h, { tenantId: org.tenantId, email: usuario.email, password: usuario.password });
  const headers = portador(sessao.accessToken);

  const bloqueado = await requestJson(h.baseUrl, "/api/v1/work-orders", { headers });
  assert.equal(bloqueado.status, 403, JSON.stringify(bloqueado.body));
  assert.equal(bloqueado.body.error?.reason, "module_not_enabled");
  assert.equal(temOrdensDeServico(await menuDe(h, headers)), false, "o menu não pode trazer a área desligada");

  assert.equal((await patchModulos(h, org.tenantId, ["work_orders"])).status, 200);

  const liberado = await requestJson(h.baseUrl, "/api/v1/work-orders", { headers });
  assert.equal(liberado.status, 200, JSON.stringify(liberado.body));
  assert.equal(temOrdensDeServico(await menuDe(h, headers)), true, "o menu passa a trazer a área ligada");

  assert.equal((await patchModulos(h, org.tenantId, [])).status, 200);

  const desligado = await requestJson(h.baseUrl, "/api/v1/work-orders", { headers });
  assert.equal(desligado.status, 403, JSON.stringify(desligado.body));
  assert.equal(desligado.body.error?.reason, "module_not_enabled");
  assert.equal(temOrdensDeServico(await menuDe(h, headers)), false, "o menu perde a área desligada");
});

test("D3 — trilha dupla: 1 linha em platform_audit_logs e 1 em audit_logs, só com os metadados permitidos", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "planos-mod-d3");
  await h.admin.tenant.update({
    where: { id: org.tenantId },
    data: { modules: ["dashboard", "inventory", "modulo_antigo"] },
  });

  const resposta = await patchModulos(h, org.tenantId, ["work_orders", "dashboard"]);
  assert.equal(resposta.status, 200, JSON.stringify(resposta.body));

  const plataforma = await h.admin.platformAuditLog.findMany({
    where: { tenant_id: org.tenantId, action: "organization.modules_changed" },
  });
  assert.equal(plataforma.length, 1, "exatamente uma linha de trilha de plataforma");
  const linha = plataforma[0]!;
  assert.equal(linha.entity, "organization");
  assert.equal(linha.entity_id, org.tenantId);
  assert.equal(linha.actor_user_id, h.actor.userId);
  const metadata = linha.metadata as Record<string, unknown>;
  assert.deepEqual(Object.keys(metadata).sort(), [
    "actor_user_id",
    "modules_added",
    "modules_removed",
    "modules_removed_other",
  ]);
  assert.equal(metadata.actor_user_id, h.actor.userId);
  assert.deepEqual(metadata.modules_added, ["work_orders"]);
  assert.deepEqual(metadata.modules_removed, ["inventory"]);
  assert.equal(metadata.modules_removed_other, 1);

  const organizacao = await h.admin.auditLog.findMany({
    where: { tenant_id: org.tenantId, action: "tenant.modules_changed" },
  });
  assert.equal(organizacao.length, 1, "exatamente uma linha de trilha da organização");
  const metadataDaOrganizacao = organizacao[0]!.metadata as Record<string, unknown>;
  assert.deepEqual(metadataDaOrganizacao.modules_added, ["work_orders"]);
  assert.deepEqual(metadataDaOrganizacao.modules_removed, ["inventory"]);
  assert.equal(organizacao[0]!.entity, "tenant");
  assert.equal(organizacao[0]!.entity_id, org.tenantId);

  const serializado = JSON.stringify({ plataforma: metadata, organizacao: metadataDaOrganizacao }).toLowerCase();
  for (const proibido of ["token", "password", "secret", "base64", "bucket", "@example.com", "authorization"]) {
    assert.equal(serializado.includes(proibido), false, `metadado indevido na trilha: ${proibido}`);
  }
});

test("D4 — a segunda chamada igual não cria trilha nem muda updated_at", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "planos-mod-d4");
  assert.equal((await patchModulos(h, org.tenantId, ["work_orders"])).status, 200);

  const primeira = await h.admin.tenant.findUniqueOrThrow({
    where: { id: org.tenantId },
    select: { updated_at: true },
  });
  const trilhas = (await trilhasDePlataforma(h, org.tenantId)).length;

  const repetida = await patchModulos(h, org.tenantId, ["work_orders"]);
  assert.equal(repetida.status, 200, JSON.stringify(repetida.body));
  assert.deepEqual(await modulesDe(h, org.tenantId), ["work_orders"]);
  assert.equal((await trilhasDePlataforma(h, org.tenantId)).length, trilhas, "nenhuma trilha nova");
  const segunda = await h.admin.tenant.findUniqueOrThrow({
    where: { id: org.tenantId },
    select: { updated_at: true },
  });
  assert.deepEqual(segunda.updated_at, primeira.updated_at, "updated_at não pode mudar sem escrita");
});

test("D5 — assinatura em vigor recusa: valid_to nulo e no futuro dão 409; no passado dá 200", async () => {
  const h = await harness();
  const agora = Date.now();
  const plano = await novoPlanoComVersao(h, ["dashboard"], new Date(agora - 86_400_000));
  const casos = [
    { rotulo: "valid_to nulo", validTo: null, esperado: 409 },
    { rotulo: "valid_to no futuro", validTo: new Date(agora + 86_400_000), esperado: 409 },
    { rotulo: "valid_to no passado", validTo: new Date(agora - 3_600_000), esperado: 200 },
  ] as const;

  for (const caso of casos) {
    const org = await novaOrganizacao(h, "planos-mod-d5");
    await novaAssinatura(h, org.tenantId, plano.id, new Date(agora - 7_200_000), caso.validTo);

    const resposta = await patchModulos(h, org.tenantId, ["work_orders"]);
    assert.equal(resposta.status, caso.esperado, `${caso.rotulo}: ${JSON.stringify(resposta.body)}`);
    if (caso.esperado === 409) {
      assert.equal(resposta.body.error?.reason, "module_change_requires_subscription", caso.rotulo);
      assert.deepEqual(await modulesDe(h, org.tenantId), [], `${caso.rotulo}: nada pode mudar`);
      assert.equal((await trilhasDePlataforma(h, org.tenantId)).length, 0, caso.rotulo);
    } else {
      assert.deepEqual(await modulesDe(h, org.tenantId), ["work_orders"], caso.rotulo);
    }
  }
});

test("D6 — duas chamadas concorrentes: a segunda espera a trava e a trilha encadeia no estado que a primeira deixou", async () => {
  const h = await harness();
  assert.equal(process.env.CORE_SAAS_PERSISTENCE, "prisma");
  const [postura] = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
    SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
  `;
  assert.deepEqual(postura, { rolsuper: false, rolbypassrls: false });

  const org = await novaOrganizacao(h, "planos-mod-d6");
  assert.deepEqual(await modulesDe(h, org.tenantId), []);

  let releaseHold: () => void = () => undefined;
  const holdUntil = new Promise<void>((resolve) => {
    releaseHold = resolve;
  });
  let holderHasLock: () => void = () => undefined;
  const holderLockAcquired = new Promise<void>((resolve) => {
    holderHasLock = resolve;
  });
  const holder = h.admin.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${org.tenantId}::uuid FOR UPDATE`;
      holderHasLock();
      await holdUntil;
    },
    { maxWait: 30_000, timeout: 30_000 },
  );
  await holderLockAcquired;

  let resolvedWhileHeld = false;
  let released = false;
  const listaA = ["work_orders"];
  const listaB = ["patios", "work_orders"];
  const requisicoes = Promise.all([
    patchModulos(h, org.tenantId, listaA),
    patchModulos(h, org.tenantId, listaB),
  ]).then((respostas) => {
    if (!released) resolvedWhileHeld = true;
    return respostas;
  });

  let waiters = 0;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline && waiters < 2 && !resolvedWhileHeld) {
    const [row] = await h.admin.$queryRaw<Array<{ waiters: number }>>`
      SELECT count(DISTINCT a.pid)::int AS waiters
      FROM pg_stat_activity a
      JOIN pg_locks l ON l.pid = a.pid
      JOIN pg_class c ON c.oid = l.relation
      WHERE a.usename = ${h.role.roleName}
        AND c.relname = 'tenants'
        AND cardinality(pg_blocking_pids(a.pid)) > 0
    `;
    waiters = row?.waiters ?? 0;
    if (waiters < 2) await new Promise((resolve) => setTimeout(resolve, 50));
  }

  released = true;
  releaseHold();
  await holder;
  const respostas = await requisicoes;

  assert.equal(resolvedWhileHeld, false, "as chamadas não podem concluir enquanto a linha está travada");
  assert.equal(waiters, 2, "as duas transações do app devem esperar a trava da linha de tenants");
  for (const resposta of respostas) assert.equal(resposta.status, 200, JSON.stringify(resposta.body));

  const trilhas = await trilhasDePlataforma(h, org.tenantId);
  assert.equal(trilhas.length, 2, "uma trilha por chamada que mudou algo");
  const resumo = trilhas.map((trilha) => {
    const metadata = trilha.metadata as Record<string, unknown>;
    return { added: metadata.modules_added, removed: metadata.modules_removed };
  });
  const cadeias = [
    // `final` é a lista como a porta GRAVA: na ordem do catálogo (`canonicalModuleList`), e no catálogo
    // `work_orders` vem antes de `patios` — a ordem do corpo da requisição não sobrevive à escrita.
    { rotulo: "A depois B", ordem: [{ added: ["work_orders"], removed: [] }, { added: ["patios"], removed: [] }], final: ["work_orders", "patios"] },
    { rotulo: "B depois A", ordem: [{ added: ["patios", "work_orders"], removed: [] }, { added: [], removed: ["patios"] }], final: ["work_orders"] },
  ];
  const serializado = JSON.stringify(resumo);
  const casou = cadeias.find(
    (cadeia) =>
      serializado === JSON.stringify(cadeia.ordem) ||
      serializado === JSON.stringify([cadeia.ordem[1], cadeia.ordem[0]]),
  );
  assert.ok(casou, `a trilha da segunda chamada tem de partir do estado que a primeira deixou: ${serializado}`);
  assert.deepEqual(await modulesDe(h, org.tenantId), casou.final);
});

test("D7 — o pacote completo vem com a assinatura: putSubscription substitui a lista e a porta passa a recusar", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "planos-mod-d7");
  assert.equal((await patchModulos(h, org.tenantId, ["patios", "work_orders"])).status, 200);
  assert.deepEqual(await modulesDe(h, org.tenantId), ["work_orders", "patios"]);

  const hoje = new Date().toISOString().slice(0, 10);
  const plano = await novoPlanoComVersao(h, ["dashboard", "finance"], new Date(`${hoje}T00:00:00.000Z`));
  const assinado = await requestJson(h.baseUrl, `/api/v1/platform/billing/tenants/${org.tenantId}/subscription`, {
    method: "PUT",
    headers: h.platformHeaders,
    body: { planCode: plano.code, validFrom: hoje },
  });
  assert.equal(assinado.status, 200, JSON.stringify(assinado.body));
  assert.deepEqual(await modulesDe(h, org.tenantId), ["dashboard", "finance"], "a assinatura substitui a lista");

  const recusado = await patchModulos(h, org.tenantId, ["work_orders"]);
  assert.equal(recusado.status, 409, JSON.stringify(recusado.body));
  assert.equal(recusado.body.error?.reason, "module_change_requires_subscription");
  assert.deepEqual(await modulesDe(h, org.tenantId), ["dashboard", "finance"]);
});

test("D8 — a porta não toca cobrança: contagens de assinatura, adicional e demonstrativo não mudam", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "planos-mod-d8");
  const agora = Date.now();
  const plano = await novoPlanoComVersao(h, ["dashboard"], new Date(agora - 86_400_000));
  await novaAssinatura(h, org.tenantId, plano.id, new Date(agora - 7_200_000), new Date(agora - 3_600_000));

  const antes = await contagemDeCobranca(h, org.tenantId);
  const resposta = await patchModulos(h, org.tenantId, ["work_orders", "patios"]);
  assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
  assert.deepEqual(await modulesDe(h, org.tenantId), ["work_orders", "patios"]);
  assert.deepEqual(await contagemDeCobranca(h, org.tenantId), antes);
});

test("D9 — falha na escrita da trilha desfaz tudo: tenants.modules continua como estava", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "planos-mod-d9");
  await h.admin.tenant.update({ where: { id: org.tenantId }, data: { modules: ["dashboard"] } });

  const controle = await patchModulos(h, org.tenantId, ["dashboard", "users"]);
  assert.equal(controle.status, 200, `controle positivo: ${JSON.stringify(controle.body)}`);
  const antes = await modulesDe(h, org.tenantId);
  const trilhasAntes = (await trilhasDePlataforma(h, org.tenantId)).length;
  assert.equal(trilhasAntes, 1, "o controle positivo deixa uma trilha");

  await h.admin.$executeRawUnsafe(`REVOKE INSERT ON platform_audit_logs FROM "${h.role.roleName}"`);
  let status: number;
  try {
    status = (await patchModulosCru(h, org.tenantId, ["work_orders"])).status;
  } finally {
    await h.admin.$executeRawUnsafe(`GRANT INSERT ON platform_audit_logs TO "${h.role.roleName}"`);
  }

  assert.notEqual(status, 200, "a porta não pode responder 200 com a trilha quebrada");
  assert.deepEqual(await modulesDe(h, org.tenantId), antes, "a escrita dos módulos tem de ser desfeita");
  assert.equal((await trilhasDePlataforma(h, org.tenantId)).length, trilhasAntes, "nenhuma trilha nova");
  assert.equal(
    await h.admin.auditLog.count({ where: { tenant_id: org.tenantId, action: "tenant.modules_changed" } }),
    trilhasAntes,
    "a trilha da organização também não pode crescer sem a de plataforma",
  );
});

test("D10 — a leitura sob o papel sem bypass devolve o mesmo corpo que sob a conexão administrativa", async () => {
  const h = await harness();
  const semAssinatura = await novaOrganizacao(h, "planos-mod-d10-sem");
  const comAssinatura = await novaOrganizacao(h, "planos-mod-d10-com");
  const agora = Date.now();
  const plano = await novoPlanoComVersao(h, ["dashboard", "finance"], new Date(agora - 86_400_000));
  await novaAssinatura(h, comAssinatura.tenantId, plano.id, new Date(agora - 7_200_000), null);
  await h.admin.tenant.update({ where: { id: comAssinatura.tenantId }, data: { modules: ["dashboard"] } });
  assert.equal((await patchModulos(h, semAssinatura.tenantId, ["work_orders"])).status, 200);

  for (const org of [semAssinatura, comAssinatura]) {
    const pelaApi = await lerModulos(h, org.tenantId);
    assert.equal(pelaApi.status, 200, JSON.stringify(pelaApi.body));
    assert.deepEqual(pelaApi.body.data, await listarModulosPeloAdministrador(h, org.tenantId));
  }

  const comAssinaturaLida = porChave((await lerModulos(h, comAssinatura.tenantId)).body.data as Modulo[]);
  assert.equal(comAssinaturaLida.get("dashboard")?.status, "enabled");
  assert.equal(comAssinaturaLida.get("patios")?.status, "blocked_by_plan");
  assert.equal(comAssinaturaLida.get("patios")?.availableInPlan, false);
});

type Modulo = {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly status: string;
  readonly availableInPlan: boolean;
};

function porChave(modulos: readonly Modulo[]): Map<string, Modulo> {
  return new Map(modulos.map((modulo) => [modulo.key, modulo]));
}

function temOrdensDeServico(itens: readonly Array<{ readonly id: string }>): boolean {
  return itens.some((item) => item.id === "operations.workOrders");
}

function patchModulos(h: PlatOrgRealHarness, id: string, enabledModules: unknown) {
  return requestJson(h.baseUrl, `/api/v1/platform/tenants/${id}/modules`, {
    method: "PATCH",
    headers: h.platformHeaders,
    body: { enabledModules } as Record<string, unknown>,
  });
}

async function patchModulosCru(h: PlatOrgRealHarness, id: string, enabledModules: unknown) {
  const resposta = await fetch(`${h.baseUrl}/api/v1/platform/tenants/${id}/modules`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...h.platformHeaders },
    body: JSON.stringify({ enabledModules }),
  });
  return { status: resposta.status, texto: await resposta.text() };
}

function lerModulos(h: PlatOrgRealHarness, id: string) {
  return requestJson(h.baseUrl, `/api/v1/platform/tenants/${id}/modules`, { headers: h.platformHeaders });
}

async function menuDe(h: PlatOrgRealHarness, headers: Record<string, string>) {
  const resposta = await requestJson(h.baseUrl, "/api/v1/navigation/menu", { headers });
  assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
  return resposta.body.data as Array<{ readonly id: string }>;
}

async function modulesDe(h: PlatOrgRealHarness, tenantId: string): Promise<string[]> {
  const linha = await h.admin.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { modules: true } });
  return [...linha.modules];
}

async function trilhasDePlataforma(h: PlatOrgRealHarness, tenantId: string) {
  return h.admin.platformAuditLog.findMany({
    where: { tenant_id: tenantId, action: "organization.modules_changed" },
    orderBy: { created_at: "asc" },
  });
}

async function contagemDeCobranca(h: PlatOrgRealHarness, tenantId: string) {
  const [assinaturas, adicionais, demonstrativos] = await Promise.all([
    h.admin.tenantSubscription.count({ where: { tenant_id: tenantId } }),
    h.admin.tenantSubscriptionAddon.count({ where: { tenant_id: tenantId } }),
    h.admin.subscriptionStatement.count({ where: { tenant_id: tenantId } }),
  ]);
  return { assinaturas, adicionais, demonstrativos };
}

// O usuário da organização precisa de papel CANÔNICO e de permissão GRAVADA. Em modo prisma o
// `persistent-rbac-context.middleware` substitui o contexto da requisição por `resolveForActor`
// (`persistent-authorization.service.ts`), que filtra os papéis por `isValidRole` e lê as permissões da tabela
// `role_permissions` — não do catálogo em código. Papel inventado dá 403 `role_required`; papel canônico sem
// permissão gravada dá 403 `permission_required`. Nenhum dos dois chega ao gate de módulo, e o D2 mediria nada.
async function usuarioDaOrganizacao(
  h: PlatOrgRealHarness,
  tenantId: string,
  tag: string,
  permissoes: readonly string[],
) {
  const roleKey = "tenant_admin";
  const usuario = await novoUsuario(h, tenantId, tag, roleKey);
  const papel = await h.admin.role.findFirstOrThrow({ where: { tenant_id: tenantId, key: roleKey } });
  for (const key of permissoes) {
    const permissao = await ensurePermission(h.admin, key);
    await h.admin.rolePermission.create({ data: { role_id: papel.id, permission_id: permissao.id } });
  }
  return usuario;
}

async function novoPlanoComVersao(
  h: PlatOrgRealHarness,
  modules: readonly string[],
  validFrom: Date,
): Promise<{ readonly id: string; readonly code: string }> {
  const code = `pmod_${Date.now().toString(36)}${Math.random().toString(16).slice(2, 8)}`;
  const linhas = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO subscription_plans (code, kind, name) VALUES ($1, 'base', $1) RETURNING id`,
    code,
  );
  const id = linhas[0]!.id;
  planIds.push(id);
  await h.admin.$executeRawUnsafe(
    `INSERT INTO subscription_plan_versions
       (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb,
        extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
     VALUES ($1::uuid, 1, $2::timestamptz, 1, 1, 1, 1, 1, NULL, 'flat', $3::text[])`,
    id,
    validFrom,
    [...modules],
  );
  return { id, code };
}

async function novaAssinatura(
  h: PlatOrgRealHarness,
  tenantId: string,
  planId: string,
  validFrom: Date,
  validTo: Date | null,
): Promise<string> {
  const linhas = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from, valid_to)
     VALUES ($1::uuid, $2::uuid, $3::timestamptz, $4::timestamptz) RETURNING id`,
    tenantId,
    planId,
    validFrom,
    validTo,
  );
  return linhas[0]!.id;
}

async function listarModulosPeloAdministrador(h: PlatOrgRealHarness, tenantId: string): Promise<unknown> {
  const { createDefaultPlatformOrganizationsService } = await import(
    "../src/modules/platform/platform-organizations.service.js"
  );
  const anterior = (globalThis as { prisma?: unknown }).prisma;
  try {
    (globalThis as { prisma?: unknown }).prisma = h.admin;
    const service = await createDefaultPlatformOrganizationsService();
    return await service.listTenantModules(tenantId);
  } finally {
    (globalThis as { prisma?: unknown }).prisma = anterior;
  }
}
