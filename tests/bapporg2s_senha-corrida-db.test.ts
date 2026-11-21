import assert from "node:assert/strict";
import test, { after } from "node:test";

import { administradorDe, papelGlobal } from "./helpers/users-seg-desativado-sessao.js";
import { call, desmontarArnes, login, montarArnes, novaFamilia, trocarSenha, type Arnes, type Familia } from "./bapporg2s_familia-helper.js";

// SONDA do planejador (plan-18313-fable): a ORDEM das escritas nas credenciais da família, DETERMINÍSTICA.
// A conta da senha grava os pares em ordem de pátio (menor, meio, maior). O administrador do teste segura a credencial
// do pátio do MEIO; a senha errada grava o menor e para no meio. Então entra a outra operação pelo pátio de MAIOR id.
// Quem grava na mesma ordem espera no menor e passa. Quem grava o próprio (maior) primeiro cruza: impasse, um 5xx.
const connectionString = process.env.DATABASE_URL!;
process.env.CORE_SAAS_PERSISTENCE = "prisma";
process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
process.env.JWT_EXPIRES_IN = "15m";

let harnessPromise: Promise<Arnes> | undefined;
const harness = (): Promise<Arnes> => (harnessPromise ??= montarArnes(connectionString));

after(async () => {
  const h = harnessPromise ? await harnessPromise.catch(() => undefined) : undefined;
  if (h) await desmontarArnes(h);
});

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

async function cruzar(h: Arnes, f: Familia, outra: (maior: Familia["orgs"][number]) => Promise<{ status: number; body: Record<string, any> }>) {
  const sorted = [...f.orgs].sort((a, b) => (a.tenantId < b.tenantId ? -1 : 1));
  const [menor, meio, maior] = [sorted[0]!, sorted[1]!, sorted[2]!];
  let soltar!: () => void;
  const solta = new Promise<void>((resolve) => { soltar = resolve; });
  let travou!: () => void;
  const travada = new Promise<void>((resolve) => { travou = resolve; });
  const trava = h.admin.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM local_auth_credentials WHERE tenant_id = ${meio.tenantId}::uuid AND user_id = ${meio.userId}::uuid FOR UPDATE`;
    travou();
    await solta;
  }, { timeout: 60_000 });

  await travada;
  const errada = login(h, menor.tenantId, f.email, "errada-de-proposito");
  assert.equal(await ate(h, 1, 5_000), 1, "coreografia: a senha errada gravou o menor e parou no meio");
  const op = outra(maior);
  const w2 = await ate(h, 2, 1_500);
  soltar();
  await trava;
  const [l, o] = await Promise.all([errada, op]);
  return { login: l.status, outra: o.status, esperando: w2, corpo: JSON.stringify(o.body).slice(0, 140) };
}

test("GR7 — redefinição pelo pátio de MAIOR id cruza com a conta da senha em voo: 200 e 401, nenhum 5xx", { timeout: 120_000 }, async () => {
  const h = await harness();
  const f = await novaFamilia(h, "gr7");
  const r = await cruzar(h, f, async (maior) => {
    const admin = await administradorDe(h, maior.tenantId);
    return call(h, `/api/v1/auth/users/${maior.userId}/reset-password`, { method: "POST", headers: admin.headers, body: {} });
  });
  console.log(`# SONDA GR7: redefinição ${r.outra} · senha errada ${r.login} · esperando antes de soltar ${r.esperando} · ${r.corpo}`);
  assert.deepEqual([r.outra, r.login], [200, 401], "GR7: a redefinição 200 e a senha errada 401");
});

test("GP9 — troca de senha pelo pátio de MAIOR id cruza com a conta da senha em voo: 200 e 401, nenhum 5xx", { timeout: 120_000 }, async () => {
  const h = await harness();
  const f = await novaFamilia(h, "gp9");
  const sorted = [...f.orgs].sort((a, b) => (a.tenantId < b.tenantId ? -1 : 1));
  const session = await login(h, sorted[2]!.tenantId, f.email, f.password);
  assert.equal(session.status, 200);
  const token = String(session.body.data.access_token ?? session.body.data.accessToken);
  const r = await cruzar(h, f, () => trocarSenha(h, token, f.password, "SenhaNova!2026-Sonda-Aa"));
  console.log(`# SONDA GP9: troca ${r.outra} · senha errada ${r.login} · esperando antes de soltar ${r.esperando} · ${r.corpo}`);
  assert.deepEqual([r.outra, r.login], [200, 401], "GP9: a troca 200 e a senha errada 401");
});

test("GR5-DET — duas redefinições da mesma identidade, pelo pátio de MENOR e pelo de MAIOR id, a 1ª parada no vínculo do MEIO: as duas 200, um hash só", { timeout: 120_000 }, async () => {
  const h = await harness();
  const f = await novaFamilia(h, "gr5det");
  const sorted = [...f.orgs].sort((a, b) => (a.tenantId < b.tenantId ? -1 : 1));
  const [menor, meio, maior] = [sorted[0]!, sorted[1]!, sorted[2]!];
  const adminMenor = await administradorDe(h, menor.tenantId);
  const adminMaior = await administradorDe(h, maior.tenantId);
  let soltar!: () => void;
  const solta = new Promise<void>((resolve) => { soltar = resolve; });
  let travou!: () => void;
  const travada = new Promise<void>((resolve) => { travou = resolve; });
  const trava = h.admin.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM auth_identity_links WHERE tenant_id = ${meio.tenantId}::uuid AND user_id = ${meio.userId}::uuid FOR UPDATE`;
    travou();
    await solta;
  }, { timeout: 60_000 });

  await travada;
  const a = call(h, `/api/v1/auth/users/${menor.userId}/reset-password`, { method: "POST", headers: adminMenor.headers, body: {} });
  assert.equal(await ate(h, 1, 5_000), 1, "coreografia: a 1ª redefinição travou o próprio vínculo e parou no do meio");
  const b = call(h, `/api/v1/auth/users/${maior.userId}/reset-password`, { method: "POST", headers: adminMaior.headers, body: {} });
  const w2 = await ate(h, 2, 1_200);
  soltar();
  await trava;
  const [ra, rb] = await Promise.all([a, b]);
  const rows = await h.admin.localAuthCredential.findMany({ where: { email: f.email }, select: { password_hash: true } });
  console.log(`# SONDA GR5-DET: menor ${ra.status} · maior ${rb.status} · esperando antes de soltar ${w2} · hashes ${new Set(rows.map((row) => row.password_hash)).size}`);
  assert.deepEqual([ra.status, rb.status], [200, 200], "GR5-DET: as duas 200, nenhum 5xx");
  assert.equal(new Set(rows.map((row) => row.password_hash)).size, 1, "GR5-DET: um hash só nos três");
});

async function patioNoGrupoDet(h: Arnes, f: Familia, tag: string): Promise<string> {
  const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await h.admin.tenant.create({ data: { name: `S2P concessão ${suffix}`, slug: `s2p-c-${suffix}` } });
  h.tenantIds.push(tenant.id);
  await papelGlobal(h, "field_technician", "tenant");
  await h.admin.economicGroupMember.create({
    data: { tenant_id: tenant.id, group_id: f.groupId, valid_from: new Date("2026-01-01T00:00:00Z"), valid_to: null },
  });
  return tenant.id;
}

for (const quem of ["origem", "outro"] as const) {
  test(`GR6-DET (${quem}) — a concessão em voo já leu a origem; redefine o pátio ${quem === "origem" ? "de ORIGEM da cópia" : "que NÃO é a origem da cópia"}: um hash só`, { timeout: 120_000 }, async () => {
    const h = await harness();
    const f = await novaFamilia(h, `det-${quem}`, { pairs: 2 });
    const sorted = [...f.orgs].sort((a, b) => (a.tenantId < b.tenantId ? -1 : 1));
    const origem = sorted[0]!;
    const outro = sorted[1]!;
    const resetter = quem === "origem" ? origem : outro;
    const z = await patioNoGrupoDet(h, f, `det-${quem}`);
    const adminR = await administradorDe(h, resetter.tenantId);
    const adminZ = await administradorDe(h, z);

    let soltar!: () => void;
    const solta = new Promise<void>((resolve) => { soltar = resolve; });
    let travou!: () => void;
    const travada = new Promise<void>((resolve) => { travou = resolve; });
    const trava = h.admin.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM roles WHERE key = 'field_technician' FOR UPDATE`;
      travou();
      await solta;
    }, { timeout: 60_000 });

    await travada;
    const grant = call(h, "/api/v1/users/access-grants", { method: "POST", headers: adminZ.headers, body: { email: f.email, name: "Técnico do grupo" } });
    const w1 = await ate(h, 1, 5_000);
    assert.equal(w1, 1, "coreografia: a concessão está parada na trava do papel");
    const reset = call(h, `/api/v1/auth/users/${resetter.userId}/reset-password`, { method: "POST", headers: adminR.headers, body: {} });
    const w2 = await ate(h, 2, 1_500);
    console.log(`# SONDA ${quem}: esperando na trava antes de soltar = ${w2}`);
    soltar();
    await trava;
    const [g, r] = await Promise.all([grant, reset]);

    assert.equal(g.status, 201, `concessão ${g.status} ${JSON.stringify(g.body).slice(0, 160)}`);
    assert.equal(r.status, 200, `redefinição ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);

    const rows = await h.admin.localAuthCredential.findMany({ where: { email: f.email }, select: { tenant_id: true, password_hash: true } });
    const novo = rows.find((row) => row.tenant_id === resetter.tenantId)!.password_hash;
    const fora = rows.filter((row) => row.password_hash !== novo).map((row) => (row.tenant_id === z ? "Z(concedido)" : row.tenant_id === origem.tenantId ? "origem" : "outro"));
    console.log(`# SONDA ${quem}: pares=${rows.length} hashes=${new Set(rows.map((row) => row.password_hash)).size} com-senha-velha=[${fora.join(",")}] affected_patios=${r.body.data.affected_patios}`);
    assert.equal(new Set(rows.map((row) => row.password_hash)).size, 1, `GR6-DET ${quem}: um hash só entre ${rows.length} pares`);
  });
}
