import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "prisma";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import { businessDateAtRequest } from "./helpers/business-date.js";
import { ensurePermission } from "./helpers/db-permissions.js";
import { dropHarnessObjects, runHarnessDdl } from "./helpers/pg-barrier.js";
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
// D11 (a mais do §8.3, pedido pela medição da F6) é a corrida com a assinatura: ela nasce DEPOIS da checagem do serviço e
// ANTES da leitura de dentro da transação. Sem ele, tirar só a checagem da transação, ou ler a assinatura antes do
// contexto de RLS, sobrevivia aos D1 a D10, porque a checagem do serviço já dá o 409 nos casos sequenciais.
//
// D9 derruba a trilha de plataforma por um gatilho de falha injetada no banco descartável, escopado à organização do
// caso e sempre pelo `runHarnessDdl` (molde de `tests/b-aprov-duraveis-atomic-db.test.ts`); nada de mexer em
// privilégio de papel (o ratchet `tests/db-catalog-write-guard.test.ts` congela quem escreve catálogo de cluster).
//
// Vermelho-controle no head-base `8719cf045`: a porta respondia 409 para TODA organização (D1, D2, D3, D4, D6, D7, D8,
// D9, D10 e o caso "fim no passado" do D5), nada era gravado em `platform_audit_logs`/`audit_logs` e a leitura
// devolvia o mapa de código com o plano cravado `"starter"`.
// Partida: os testes do `dev-planos-modulos-qw` (Qwen), medidos antes de usar; o que mudou está no diário do dev.

const connectionString = process.env.DATABASE_URL;
assert.ok(connectionString, "DATABASE_URL is required");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hojeEmSaoPaulo = businessDateAtRequest();

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
      await h.admin.$executeRawUnsafe(`DELETE FROM tenant_subscriptions WHERE plan_id = ANY($1::uuid[])`, planIds);
      await h.admin.$executeRawUnsafe(`DELETE FROM subscription_plan_versions WHERE plan_id = ANY($1::uuid[])`, planIds);
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
  assert.equal(porChave(modulos).get("finance")?.status, "disabled");
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
  assert.equal(metadataDaOrganizacao.actorType, "system");
  assert.equal(organizacao[0]!.entity, "tenant");
  assert.equal(organizacao[0]!.entity_id, org.tenantId);

  const serializado = JSON.stringify({ plataforma: metadata, organizacao: metadataDaOrganizacao }).toLowerCase();
  for (const proibido of ["token", "password", "secret", "base64", "bucket", "@example.com", "authorization", "modulo_antigo"]) {
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
  const trilhasDaOrganizacao = await trilhasDaOrganizacaoDe(h, org.tenantId);
  assert.equal(trilhas, 1);
  assert.equal(trilhasDaOrganizacao, 1);

  const repetida = await patchModulos(h, org.tenantId, ["work_orders"]);
  assert.equal(repetida.status, 200, JSON.stringify(repetida.body));
  assert.equal(porChave(repetida.body.data as Modulo[]).get("work_orders")?.status, "enabled");
  assert.deepEqual(await modulesDe(h, org.tenantId), ["work_orders"]);
  assert.equal((await trilhasDePlataforma(h, org.tenantId)).length, trilhas, "nenhuma trilha de plataforma nova");
  assert.equal(await trilhasDaOrganizacaoDe(h, org.tenantId), trilhasDaOrganizacao, "nenhuma trilha da organização nova");
  const segunda = await h.admin.tenant.findUniqueOrThrow({
    where: { id: org.tenantId },
    select: { updated_at: true },
  });
  assert.deepEqual(segunda.updated_at, primeira.updated_at, "updated_at não pode mudar sem escrita");
});

test("D5 — assinatura em vigor recusa: valid_to nulo e no futuro dão 409; no passado dá 200", async () => {
  const h = await harness();
  // A regra da assinatura só se prova sob o papel SEM bypass: sob superusuário a leitura cega também veria a linha.
  await assertPapelSemBypass(h);
  const agora = Date.now();
  const plano = await novoPlanoComVersao(h, ["dashboard"], new Date("2000-01-01T00:00:00.000Z"));
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
      assert.equal(await trilhasDaOrganizacaoDe(h, org.tenantId), 0, caso.rotulo);
    } else {
      assert.deepEqual(await modulesDe(h, org.tenantId), ["work_orders"], caso.rotulo);
      assert.equal((await trilhasDePlataforma(h, org.tenantId)).length, 1, caso.rotulo);
    }
  }
});

test("D6 — duas chamadas concorrentes: a segunda espera a trava e a trilha encadeia no estado que a primeira deixou", async () => {
  const h = await harness();
  assert.equal(process.env.CORE_SAAS_PERSISTENCE, "prisma");
  await assertPapelSemBypass(h);

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
    { rotulo: "A depois B", ordem: [{ added: ["work_orders"], removed: [] }, { added: ["patios"], removed: [] }], final: ["work_orders", "patios"] },
    { rotulo: "B depois A", ordem: [{ added: ["work_orders", "patios"], removed: [] }, { added: [], removed: ["patios"] }], final: ["work_orders"] },
  ];
  const serializado = JSON.stringify(resumo);
  const casou = cadeias.find(
    (cadeia) =>
      serializado === JSON.stringify(cadeia.ordem) ||
      serializado === JSON.stringify([cadeia.ordem[1], cadeia.ordem[0]]),
  );
  assert.ok(casou, `a trilha da segunda chamada tem de partir do estado que a primeira deixou: ${serializado}`);
  assert.deepEqual(await modulesDe(h, org.tenantId), casou.final, `o estado final é o da segunda (${casou.rotulo})`);
});

test("D7 — o pacote completo vem com a assinatura: putSubscription substitui a lista e a porta passa a recusar", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "planos-mod-d7");
  assert.equal((await patchModulos(h, org.tenantId, ["patios", "work_orders"])).status, 200);
  assert.deepEqual(await modulesDe(h, org.tenantId), ["work_orders", "patios"]);

  const plano = await novoPlanoComVersao(h, ["dashboard", "finance"], new Date("2000-01-01T00:00:00.000Z"));
  const assinado = await requestJson(h.baseUrl, `/api/v1/platform/billing/tenants/${org.tenantId}/subscription`, {
    method: "PUT",
    headers: h.platformHeaders,
    body: { planCode: plano.code, validFrom: hojeEmSaoPaulo() },
  });
  assert.equal(assinado.status, 200, JSON.stringify(assinado.body));
  assert.deepEqual(await modulesDe(h, org.tenantId), ["dashboard", "finance"], "a assinatura substitui a lista");

  const recusado = await patchModulos(h, org.tenantId, ["work_orders"]);
  assert.equal(recusado.status, 409, JSON.stringify(recusado.body));
  assert.equal(recusado.body.error?.reason, "module_change_requires_subscription");
  assert.deepEqual(await modulesDe(h, org.tenantId), ["dashboard", "finance"]);

  const lido = porChave((await lerModulos(h, org.tenantId)).body.data as Modulo[]);
  assert.equal(lido.get("finance")?.status, "enabled");
  assert.equal(lido.get("work_orders")?.status, "blocked_by_plan", "com assinatura, a área fora do plano só liga pelo plano");
});

test("D8 — a porta não toca cobrança: contagens de assinatura, adicional e demonstrativo não mudam", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "planos-mod-d8");
  const agora = Date.now();
  const plano = await novoPlanoComVersao(h, ["dashboard"], new Date("2000-01-01T00:00:00.000Z"));
  await novaAssinatura(h, org.tenantId, plano.id, new Date(agora - 7_200_000), new Date(agora - 3_600_000));

  const antes = await contagemDeCobranca(h, org.tenantId);
  assert.equal(antes.assinaturas, 1, "a organização tem histórico de assinatura (encerrada)");
  const resposta = await patchModulos(h, org.tenantId, ["work_orders", "patios"]);
  assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
  assert.deepEqual(await modulesDe(h, org.tenantId), ["work_orders", "patios"]);
  assert.deepEqual(await contagemDeCobranca(h, org.tenantId), antes);
});

test("D9 — falha na escrita da trilha desfaz tudo: tenants.modules continua como estava", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "planos-mod-d9");
  assert.match(org.tenantId, UUID);
  await h.admin.tenant.update({ where: { id: org.tenantId }, data: { modules: ["dashboard"] } });

  // Controle positivo: sem a falha, a mesma porta grava e deixa uma trilha (o caso não pode passar por não escrever).
  const controle = await patchModulos(h, org.tenantId, ["dashboard", "users"]);
  assert.equal(controle.status, 200, `controle positivo: ${JSON.stringify(controle.body)}`);
  const antes = await modulesDe(h, org.tenantId);
  const trilhasAntes = (await trilhasDePlataforma(h, org.tenantId)).length;
  const trilhasDaOrganizacaoAntes = await trilhasDaOrganizacaoDe(h, org.tenantId);
  assert.deepEqual(antes, ["dashboard", "users"]);
  assert.equal(trilhasAntes, 1, "o controle positivo deixa uma trilha");

  const nome = `pmod_d9_inj_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await runHarnessDdl(h.admin, `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RAISE EXCEPTION 'pmod_d9_falha_injetada'; END $f$`);
  let status = 0;
  let erroDoCorpo: unknown;
  try {
    await runHarnessDdl(
      h.admin,
      `CREATE TRIGGER ${nome} BEFORE INSERT ON platform_audit_logs FOR EACH ROW WHEN (NEW.tenant_id = '${org.tenantId}'::uuid) EXECUTE FUNCTION ${nome}()`,
    );
    status = (await patchModulosCru(h, org.tenantId, ["work_orders"])).status;
  } catch (error) {
    erroDoCorpo = error;
  } finally {
    await dropHarnessObjects(h.admin, erroDoCorpo, [`DROP TRIGGER IF EXISTS ${nome} ON platform_audit_logs`, `DROP FUNCTION IF EXISTS ${nome}()`]);
  }
  if (erroDoCorpo !== undefined) throw erroDoCorpo;
  const [{ gatilhos }] = await h.admin.$queryRawUnsafe<Array<{ gatilhos: number }>>(
    "SELECT count(*)::int AS gatilhos FROM pg_trigger WHERE tgname = $1",
    nome,
  );
  const [{ funcoes }] = await h.admin.$queryRawUnsafe<Array<{ funcoes: number }>>(
    "SELECT count(*)::int AS funcoes FROM pg_proc WHERE proname = $1",
    nome,
  );
  assert.deepEqual([gatilhos, funcoes], [0, 0], `o gatilho ${nome} sobrou no catálogo`);

  assert.notEqual(status, 200, "a porta não pode responder 200 com a trilha quebrada");
  assert.deepEqual(await modulesDe(h, org.tenantId), antes, "a escrita dos módulos tem de ser desfeita");
  assert.equal((await trilhasDePlataforma(h, org.tenantId)).length, trilhasAntes, "nenhuma trilha de plataforma nova");
  assert.equal(
    await trilhasDaOrganizacaoDe(h, org.tenantId),
    trilhasDaOrganizacaoAntes,
    "a trilha da organização também não pode crescer sem a de plataforma",
  );
});

test("D10 — a leitura sob o papel sem bypass devolve o mesmo corpo que sob a conexão administrativa", async () => {
  const h = await harness();
  await assertPapelSemBypass(h);
  const semAssinatura = await novaOrganizacao(h, "planos-mod-d10-sem");
  const comAssinatura = await novaOrganizacao(h, "planos-mod-d10-com");
  const agora = Date.now();
  const plano = await novoPlanoComVersao(h, ["dashboard", "finance"], new Date("2000-01-01T00:00:00.000Z"));
  await novaAssinatura(h, comAssinatura.tenantId, plano.id, new Date(agora - 7_200_000), null);
  await h.admin.tenant.update({ where: { id: comAssinatura.tenantId }, data: { modules: ["dashboard"] } });
  assert.equal((await patchModulos(h, semAssinatura.tenantId, ["work_orders"])).status, 200);

  for (const org of [semAssinatura, comAssinatura]) {
    const pelaApi = await lerModulos(h, org.tenantId);
    assert.equal(pelaApi.status, 200, JSON.stringify(pelaApi.body));
    assert.deepEqual(pelaApi.body.data, await listarModulosPeloAdministrador(h, org.tenantId));
  }

  const semAssinaturaLida = porChave((await lerModulos(h, semAssinatura.tenantId)).body.data as Modulo[]);
  assert.equal(semAssinaturaLida.get("work_orders")?.status, "enabled");
  assert.equal(semAssinaturaLida.get("patios")?.status, "disabled");
  assert.equal(semAssinaturaLida.get("patios")?.availableInPlan, true);
  const comAssinaturaLida = porChave((await lerModulos(h, comAssinatura.tenantId)).body.data as Modulo[]);
  assert.equal(comAssinaturaLida.get("dashboard")?.status, "enabled");
  assert.equal(comAssinaturaLida.get("patios")?.status, "blocked_by_plan");
  assert.equal(comAssinaturaLida.get("patios")?.availableInPlan, false);
});

test("D11 — corrida com a assinatura: ela nasce depois da checagem do serviço e antes da leitura da transação; a leitura sob o contexto recusa", async () => {
  const h = await harness();
  // §5.5 do plano: "a checagem do serviço dá o 409 nos dois modos; a de dentro da transação é a que vale sob corrida".
  // O D5 é sequencial e para na checagem do serviço; este caso põe a assinatura no meio, com barreira por `pg_locks`
  // (molde do D6/C10, sem `sleep`), e prova a leitura de DENTRO da transação: depois do `FOR UPDATE`, sob o contexto
  // de RLS da organização. Sob o papel sem bypass, uma leitura sem o contexto veria zero linhas e a porta abriria.
  await assertPapelSemBypass(h);
  const org = await novaOrganizacao(h, "planos-mod-d11");
  assert.deepEqual(await modulesDe(h, org.tenantId), []);
  const plano = await novoPlanoComVersao(h, ["dashboard"], new Date("2000-01-01T00:00:00.000Z"));

  let releaseHold: () => void = () => undefined;
  const holdUntil = new Promise<void>((resolve) => {
    releaseHold = resolve;
  });
  let holderHasLock: () => void = () => undefined;
  const holderLockAcquired = new Promise<void>((resolve) => {
    holderHasLock = resolve;
  });
  let liberarAssinatura: () => void = () => undefined;
  const assinaturaPodeNascer = new Promise<void>((resolve) => {
    liberarAssinatura = resolve;
  });
  const holder = h.admin.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${org.tenantId}::uuid FOR UPDATE`;
      holderHasLock();
      // A assinatura nasce DENTRO do detentor: o commit dela e a soltura da linha acontecem juntos, depois que a
      // chamada do app já passou pela checagem do serviço e está parada na trava.
      await assinaturaPodeNascer;
      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from, valid_to) VALUES ($1::uuid, $2::uuid, $3::timestamptz, NULL)`,
        org.tenantId,
        plano.id,
        new Date(Date.now() - 7_200_000),
      );
      await holdUntil;
    },
    { maxWait: 30_000, timeout: 30_000 },
  );
  await holderLockAcquired;

  let resolvedWhileHeld = false;
  let released = false;
  const chamada = patchModulos(h, org.tenantId, ["work_orders"]).then((resposta) => {
    if (!released) resolvedWhileHeld = true;
    return resposta;
  });

  let waiters = 0;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline && waiters < 1 && !resolvedWhileHeld) {
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
    if (waiters < 1) await new Promise((resolve) => setTimeout(resolve, 50));
  }

  liberarAssinatura();
  released = true;
  releaseHold();
  await holder;
  const resposta = await chamada;

  assert.equal(resolvedWhileHeld, false, "a chamada não pode concluir enquanto a linha está travada");
  assert.equal(waiters, 1, "a transação do app tem de esperar a trava da linha de tenants depois da checagem do serviço");
  assert.equal(resposta.status, 409, JSON.stringify(resposta.body));
  assert.equal(resposta.body.error?.reason, "module_change_requires_subscription");
  assert.deepEqual(await modulesDe(h, org.tenantId), [], "a assinatura vence: nada é escrito");
  assert.equal((await trilhasDePlataforma(h, org.tenantId)).length, 0);
  assert.equal(await trilhasDaOrganizacaoDe(h, org.tenantId), 0);
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

async function assertPapelSemBypass(h: PlatOrgRealHarness): Promise<void> {
  const [postura] = await h.client.$queryRaw<Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>>`
    SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user
  `;
  assert.deepEqual(postura, { current_user: h.role.roleName, rolsuper: false, rolbypassrls: false });
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

async function trilhasDaOrganizacaoDe(h: PlatOrgRealHarness, tenantId: string): Promise<number> {
  return h.admin.auditLog.count({ where: { tenant_id: tenantId, action: "tenant.modules_changed" } });
}

async function contagemDeCobranca(h: PlatOrgRealHarness, tenantId: string) {
  const [assinaturas, adicionais, demonstrativos] = await Promise.all([
    h.admin.tenantSubscription.count({ where: { tenant_id: tenantId } }),
    h.admin.tenantSubscriptionAddon.count({ where: { tenant_id: tenantId } }),
    h.admin.subscriptionStatement.count({ where: { tenant_id: tenantId } }),
  ]);
  return { assinaturas, adicionais, demonstrativos };
}

// Um usuário da organização com papel CANÔNICO (`operator`): a sessão só leva papel do catálogo (`parseRoles`), e um
// papel de chave inventada chegaria vazio ao RBAC (403 `role_required`), o que não diz nada sobre o gate. O papel da
// organização recebe só as permissões pedidas, no banco (RBAC persistente).
async function usuarioDaOrganizacao(
  h: PlatOrgRealHarness,
  tenantId: string,
  tag: string,
  permissoes: readonly string[],
) {
  const roleKey = "operator";
  const papel =
    (await h.admin.role.findFirst({ where: { tenant_id: tenantId, key: roleKey } })) ??
    (await h.admin.role.create({ data: { tenant_id: tenantId, key: roleKey, name: `Papel ${tag}`, scope: "tenant" } }));
  for (const key of permissoes) {
    const permissao = await ensurePermission(h.admin, key);
    await h.admin.rolePermission.create({ data: { role_id: papel.id, permission_id: permissao.id } });
  }
  return novoUsuario(h, tenantId, tag, roleKey);
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
