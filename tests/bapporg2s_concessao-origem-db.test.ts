import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test, { after } from "node:test";

import { administradorDe, papelGlobal } from "./helpers/users-seg-desativado-sessao.js";
import { call, desmontarArnes, login, montarArnes, novaFamilia, type Arnes } from "./bapporg2s_familia-helper.js";

// SONDA do planejador (plan-18313-fable): a ORIGEM da concessão é o par onde o login NASCEU (o vínculo que não é
// concessão nem religação), em qualquer ordem de uuid e em corrida. R2S2A-01 e R2S2A-02.
const connectionString = process.env.DATABASE_URL!;
process.env.CORE_SAAS_PERSISTENCE = "prisma";
process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
process.env.JWT_EXPIRES_IN = "15m";

let harnessPromise: Promise<Arnes> | undefined;
const harness = (): Promise<Arnes> => (harnessPromise ??= montarArnes(connectionString));

after(async () => {
  const h = harnessPromise ? await harnessPromise.catch(() => undefined) : undefined;
  if (h) {
    await h.admin.userCreationLog.deleteMany({ where: { tenant_id: { in: h.tenantIds } } }).catch(() => undefined);
    await desmontarArnes(h);
  }
});

const hex = (n: number) => randomBytes(n).toString("hex");
const idMenor = () => `00000000-0000-4000-8000-${hex(6)}`;
const idMaior = () => `ffffffff-ffff-4fff-8fff-${hex(6)}`;

async function patioNoGrupo(h: Arnes, groupId: string, id: string): Promise<string> {
  const tenant = await h.admin.tenant.create({ data: { id, name: `S2P origem ${id.slice(-12)}`, slug: `s2p-o-${id.slice(-12)}-${hex(3)}` } });
  h.tenantIds.push(tenant.id);
  await papelGlobal(h, "field_technician", "tenant");
  await h.admin.economicGroupMember.create({
    data: { tenant_id: tenant.id, group_id: groupId, valid_from: new Date("2026-01-01T00:00:00Z"), valid_to: null },
  });
  return tenant.id;
}

async function conceder(h: Arnes, tenantId: string, email: string) {
  const admin = await administradorDe(h, tenantId);
  return call(h, "/api/v1/users/access-grants", { method: "POST", headers: admin.headers, body: { email, name: "Técnico do grupo" } });
}

async function origemGravada(h: Arnes, tenantId: string): Promise<string | null> {
  const row = await h.admin.userCreationLog.findFirst({ where: { tenant_id: tenantId, state: "concessao" }, orderBy: { seq: "desc" }, select: { origin_tenant_id: true } });
  return row?.origin_tenant_id ?? null;
}

async function ate(h: Arnes, n: number, ms: number): Promise<number> {
  const limit = Date.now() + ms;
  let seen = 0;
  while (Date.now() < limit) {
    const rows = await h.admin.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM pg_stat_activity WHERE datname = current_database() AND usename = ${h.role.roleName} AND wait_event_type = 'Lock'
    `;
    seen = Number(rows[0]!.n);
    if (seen >= n) return seen;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  return seen;
}

for (const [nome, novoId] of [["Y de id MENOR que X", idMenor], ["Y de id MAIOR que X", idMaior]] as const) {
  test(`GO1 (${nome}) — concessão a Y e depois a Z: a origem gravada de Z é X, onde o login nasceu`, async () => {
    const h = await harness();
    const f = await novaFamilia(h, "go1", { pairs: 1 });
    const x = f.orgs[0]!;
    const y = await patioNoGrupo(h, f.groupId, novoId());
    const z = await patioNoGrupo(h, f.groupId, idMaior());

    assert.equal((await conceder(h, y, f.email)).status, 201);
    assert.equal((await conceder(h, z, f.email)).status, 201);
    const oy = await origemGravada(h, y);
    const oz = await origemGravada(h, z);
    console.log(`# SONDA GO1 ${nome}: origem(Y)=${oy === x.tenantId ? "X" : "outro"} origem(Z)=${oz === x.tenantId ? "X" : oz === y ? "Y" : "outro"}`);
    assert.equal(oy, x.tenantId, "GO1: a origem de Y é X");
    assert.equal(oz, x.tenantId, "GO1: a origem de Z é X, não o pátio que recebeu a 1ª concessão");
  });
}

test("GO2 — concessão a Y e a Z ao mesmo tempo (os dois de id menor que X), 10 rodadas: as duas 201 e as duas origens são X", { timeout: 300_000 }, async () => {
  const h = await harness();
  let erradas = 0;

  for (let round = 0; round < 10; round += 1) {
    const f = await novaFamilia(h, `go2-${round}`, { pairs: 1 });
    const x = f.orgs[0]!;
    const y = await patioNoGrupo(h, f.groupId, idMenor());
    const z = await patioNoGrupo(h, f.groupId, idMenor());
    const adminY = await administradorDe(h, y);
    const adminZ = await administradorDe(h, z);
    const grant = (admin: typeof adminY) => call(h, "/api/v1/users/access-grants", { method: "POST", headers: admin.headers, body: { email: f.email, name: "Técnico do grupo" } });
    const [a, b] = await Promise.all([grant(adminY), grant(adminZ)]);

    assert.deepEqual([a.status, b.status], [201, 201], `GO2 rodada ${round}`);
    if ((await origemGravada(h, y)) !== x.tenantId || (await origemGravada(h, z)) !== x.tenantId) erradas += 1;
  }

  console.log(`# SONDA GO2: rodadas com origem errada = ${erradas} de 10`);
  assert.equal(erradas, 0, "GO2: toda concessão grava X como origem");
});

function segurar(h: Arnes, travar: (tx: any) => Promise<unknown>) {
  let soltar!: () => void;
  const solta = new Promise<void>((resolve) => { soltar = resolve; });
  let travou!: () => void;
  const travada = new Promise<void>((resolve) => { travou = resolve; });
  const fim = h.admin.$transaction(async (tx) => {
    await travar(tx);
    travou();
    await solta;
  }, { timeout: 30_000 });
  return { travada, soltar, fim };
}

test("GO3 — com Y (id menor) já concedido e a credencial de X travada por uma troca em voo, a concessão a Z ESPERA X", { timeout: 60_000 }, async () => {
  const h = await harness();
  const f = await novaFamilia(h, "go3", { pairs: 1 });
  const x = f.orgs[0]!;
  const y = await patioNoGrupo(h, f.groupId, idMenor());
  const z = await patioNoGrupo(h, f.groupId, idMaior());

  assert.equal((await conceder(h, y, f.email)).status, 201);
  const adminZ = await administradorDe(h, z);
  const trava = segurar(h, (tx) => tx.$queryRaw`SELECT id FROM local_auth_credentials WHERE tenant_id = ${x.tenantId}::uuid AND user_id = ${x.userId}::uuid FOR UPDATE`);

  await trava.travada;
  let terminou = false;
  const grant = call(h, "/api/v1/users/access-grants", { method: "POST", headers: adminZ.headers, body: { email: f.email, name: "Técnico do grupo" } }).then((r) => { terminou = true; return r; });
  const w = await ate(h, 1, 1_200);
  console.log(`# SONDA GO3: esperando na credencial de X = ${w} · terminou com X travado = ${terminou}`);
  trava.soltar();
  await trava.fim;
  const g = await grant;
  assert.equal(w, 1, "GO3: a concessão espera a credencial de X");
  assert.equal(g.status, 201);
});

test("GO4 — par legado sem vínculo, de id menor, com outra senha: a concessão copia do par da IDENTIDADE, nunca do legado", async () => {
  const h = await harness();
  const f = await novaFamilia(h, "go4", { pairs: 1, password: "SenhaDoLogin!B-123" });
  const v = f.orgs[0]!;
  const { hashPassword } = await import("../src/modules/auth/services/password.service.js");
  const legado = await patioNoGrupo(h, f.groupId, idMenor());
  const user = await h.admin.user.create({ data: { tenant_id: legado, name: "Legado", email: f.email, status: "active" } });
  const outra = await hashPassword("SenhaDoLegado!A-123");

  await h.admin.localAuthCredential.create({ data: { tenant_id: legado, user_id: user.id, email: f.email, password_hash: outra.password_hash, password_algorithm: outra.password_algorithm } });
  const y = await patioNoGrupo(h, f.groupId, idMaior());
  const g = await conceder(h, y, f.email);

  assert.equal(g.status, 201, `GO4: concessão ${g.status} ${JSON.stringify(g.body).slice(0, 160)}`);
  const credY = await h.admin.localAuthCredential.findFirst({ where: { tenant_id: y, email: f.email }, select: { password_hash: true } });
  const credV = await h.admin.localAuthCredential.findFirst({ where: { tenant_id: v.tenantId, email: f.email }, select: { password_hash: true } });
  const oy = await origemGravada(h, y);
  console.log(`# SONDA GO4: hash de Y = ${credY?.password_hash === credV?.password_hash ? "do login" : credY?.password_hash === outra.password_hash ? "do LEGADO" : "outro"} · origem = ${oy === v.tenantId ? "V" : "outro"}`);
  assert.equal(credY?.password_hash, credV?.password_hash, "GO4: Y recebe a senha do login da identidade");
  assert.equal(oy, v.tenantId, "GO4: a origem é o par da identidade");
  assert.equal((await login(h, y, f.email, "SenhaDoLogin!B-123")).status, 200, "GO4: a senha do login entra em Y");
});

test("GO5 — sem par de origem no grupo, 404; com dois pares de origem da mesma identidade, 409; nada é criado", async () => {
  const h = await harness();
  const f = await novaFamilia(h, "go5a", { pairs: 2 });
  await h.admin.economicGroupMember.deleteMany({ where: { tenant_id: f.orgs[0]!.tenantId } });
  const z = await patioNoGrupo(h, f.groupId, idMaior());
  const a = await conceder(h, z, f.email);
  const g = await novaFamilia(h, "go5b", { pairs: 2 });
  await h.admin.$executeRaw`UPDATE auth_identity_links SET attached_via = 'backfill' WHERE identity_id = ${g.identityId}::uuid`;
  const w = await patioNoGrupo(h, g.groupId, idMaior());
  const b = await conceder(h, w, g.email);

  console.log(`# SONDA GO5: sem origem ${a.status} ${a.body.error?.reason} · duas origens ${b.status} ${b.body.error?.reason}`);
  assert.equal(a.status, 404, "GO5: sem par de origem no grupo, 404");
  assert.equal(b.status, 409, "GO5: duas origens, 409");
  assert.equal(await h.admin.user.count({ where: { tenant_id: { in: [z, w] }, email: { in: [f.email, g.email] } } }), 0, "GO5: nada criado");
});

test("GK11-DET — criação do login em voo em X (a linha em_curso aberta) e concessão em Y: a concessão espera e dá 201", { timeout: 60_000 }, async () => {
  const h = await harness();
  const base = await novaFamilia(h, "gk11", { pairs: 1 });
  const x = base.orgs[0]!;
  const y = await patioNoGrupo(h, base.groupId, idMaior());
  const adminY = await administradorDe(h, y);
  const email = `s2p-gk11-${hex(4)}@example.com`;
  const { creationEmailKey } = await import("../src/modules/core-saas/services/user-creation-log.js");
  const { hashPassword } = await import("../src/modules/auth/services/password.service.js");
  const senha = await hashPassword("SenhaNovoLogin!123");
  let seq = 0n;
  const trava = segurar(h, async (tx) => {
    const log = await tx.userCreationLog.create({ data: { tenant_id: x.tenantId, email_key: creationEmailKey(email), state: "em_curso" }, select: { seq: true } });
    seq = log.seq;
    const user = await tx.user.create({ data: { tenant_id: x.tenantId, name: "Novo login", email, status: "active" } });
    const identity = await tx.$queryRaw`INSERT INTO auth_identities (id, created_at) VALUES (gen_random_uuid(), now()) RETURNING id::text AS id`;
    await tx.$executeRaw`INSERT INTO auth_identity_links (identity_id, tenant_id, user_id, attached_via) VALUES (${identity[0].id}::uuid, ${x.tenantId}::uuid, ${user.id}::uuid, 'backfill')`;
    await tx.localAuthCredential.create({ data: { tenant_id: x.tenantId, user_id: user.id, email, password_hash: senha.password_hash, password_algorithm: senha.password_algorithm } });
    await tx.userCreationLog.update({ where: { seq }, data: { state: "confirmado", user_id: user.id } });
  });

  await trava.travada;
  const grant = call(h, "/api/v1/users/access-grants", { method: "POST", headers: adminY.headers, body: { email, name: "Técnico do grupo" } });
  const w = await ate(h, 1, 1_200);
  trava.soltar();
  await trava.fim;
  const g = await grant;
  console.log(`# SONDA GK11-DET: esperando na linha em_curso = ${w} · concessão ${g.status} ${g.body.error?.reason ?? ""}`);
  assert.equal(w, 1, "GK11-DET: a concessão espera a criação em voo");
  assert.equal(g.status, 201, "GK11-DET: e, ao passar, enxerga o login criado");
});

test("GO6 — par de RELIGAÇÃO da mesma identidade no grupo, de id menor e com o mesmo e-mail: a origem continua sendo X", async () => {
  const h = await harness();
  const f = await novaFamilia(h, "go6", { pairs: 1 });
  const x = f.orgs[0]!;
  const { hashPassword } = await import("../src/modules/auth/services/password.service.js");
  const w = await patioNoGrupo(h, f.groupId, idMenor());
  const user = await h.admin.user.create({ data: { tenant_id: w, name: "Conta religada", email: f.email, status: "active" } });
  const outra = await hashPassword("SenhaDaReligada!A-123");

  await h.admin.localAuthCredential.create({ data: { tenant_id: w, user_id: user.id, email: f.email, password_hash: outra.password_hash, password_algorithm: outra.password_algorithm } });
  await h.admin.$executeRaw`INSERT INTO auth_identity_links (identity_id, tenant_id, user_id, attached_via) VALUES (${f.identityId}::uuid, ${w}::uuid, ${user.id}::uuid, 'religacao')`;
  const z = await patioNoGrupo(h, f.groupId, idMaior());
  const g = await conceder(h, z, f.email);
  const oz = await origemGravada(h, z);
  const credZ = await h.admin.localAuthCredential.findFirst({ where: { tenant_id: z, email: f.email }, select: { password_hash: true } });

  console.log(`# SONDA GO6: concessão ${g.status} ${g.body.error?.reason ?? ""} · origem = ${oz === x.tenantId ? "X" : oz === w ? "RELIGADA" : "nenhuma"} · hash = ${credZ?.password_hash === outra.password_hash ? "da RELIGADA" : "do login"}`);
  assert.equal(g.status, 201, "GO6: a concessão passa");
  assert.equal(oz, x.tenantId, "GO6: a origem é X, não a conta religada");
  assert.notEqual(credZ?.password_hash, outra.password_hash, "GO6: Z não recebe a senha da conta religada");
});
