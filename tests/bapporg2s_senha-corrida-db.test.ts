import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test, { after } from "node:test";

import { createOrgWithUser } from "./helpers/auth-identity-fixture.js";
import { dropHarnessObjects, runHarnessDdl } from "./helpers/pg-barrier.js";
import { administradorDe, papelGlobal } from "./helpers/users-seg-desativado-sessao.js";
import { bearer, call, desmontarArnes, login, montarArnes, novaFamilia, trocarSenha, type Arnes, type Familia } from "./bapporg2s_familia-helper.js";

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

for (const pares of [1, 2] as const) {
  test(`G9b-DET (${pares} par${pares > 1 ? "es" : ""}) — a concessão em voo já leu a origem; o técnico troca a senha: um hash só e a nova entra no pátio concedido`, { timeout: 120_000 }, async () => {
    const h = await harness();
    const f = await novaFamilia(h, `g9b-${pares}`, { pairs: pares });
    const sorted = [...f.orgs].sort((a, b) => (a.tenantId < b.tenantId ? -1 : 1));
    const quemTroca = sorted[sorted.length - 1]!;
    const z = await patioNoGrupoDet(h, f, `g9b-${pares}`);
    const adminZ = await administradorDe(h, z);
    const session = await login(h, quemTroca.tenantId, f.email, f.password);

    assert.equal(session.status, 200);
    const token = String(session.body.data.access_token ?? session.body.data.accessToken);
    const nova = "SenhaNova!2026-G9b-Aa";

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
    assert.equal(await ate(h, 1, 5_000), 1, "coreografia: a concessão está parada na trava do papel");
    const troca = trocarSenha(h, token, f.password, nova);
    const w2 = await ate(h, 2, 1_500);
    soltar();
    await trava;
    const [g, t] = await Promise.all([grant, troca]);

    assert.equal(g.status, 201, `concessão ${g.status} ${JSON.stringify(g.body).slice(0, 160)}`);
    assert.equal(t.status, 200, `troca ${t.status} ${JSON.stringify(t.body).slice(0, 160)}`);

    const rows = await h.admin.localAuthCredential.findMany({ where: { email: f.email }, select: { tenant_id: true, password_hash: true } });
    const entraEmZ = (await login(h, z, f.email, nova)).status;
    const velhaEmZ = (await login(h, z, f.email, f.password)).status;

    assert.equal(new Set(rows.map((row) => row.password_hash)).size, 1, `G9b-DET: um hash só entre ${rows.length} pares`);
    assert.equal(entraEmZ, 200, "G9b-DET: a senha nova entra no pátio concedido");
    assert.equal(velhaEmZ, 401, "G9b-DET: a senha velha não entra mais");
  });
}

for (const pares of [1, 2] as const) {
  test(`GP-ATOM-TARDIA (${pares}) — a gravação do par que nasce durante a troca FALHA: nenhum par fica com a senha nova`, { timeout: 120_000 }, async () => {
    const h = await harness();
    const f = await novaFamilia(h, `atomt-${pares}`, { pairs: pares });
    const quemTroca = f.orgs[f.orgs.length - 1]!;
    const tenant = await h.admin.tenant.create({ data: { name: `S2P atom ${randomBytes(4).toString("hex")}`, slug: `s2p-at-${randomBytes(5).toString("hex")}` } });
    const z = tenant.id;

    h.tenantIds.push(z);
    await papelGlobal(h, "field_technician", "tenant");
    await h.admin.economicGroupMember.create({ data: { tenant_id: z, group_id: f.groupId, valid_from: new Date("2026-01-01T00:00:00Z"), valid_to: null } });
    const adminZ = await administradorDe(h, z);
    const session = await login(h, quemTroca.tenantId, f.email, f.password);

    assert.equal(session.status, 200);
    const token = String(session.body.data.access_token ?? session.body.data.accessToken);
    const nova = "SenhaNova!2026-Atom-Aa";
    const antes = await h.admin.localAuthCredential.findMany({ where: { email: f.email }, select: { tenant_id: true, password_hash: true } });
    const name = `s2p_atomt_${randomBytes(5).toString("hex")}`;

    await runHarnessDdl(h.admin, `CREATE FUNCTION ${name}_fn() RETURNS trigger AS $$ BEGIN IF NEW.tenant_id = '${z}'::uuid THEN RAISE EXCEPTION 'falha injetada no par tardio'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
    await runHarnessDdl(h.admin, `CREATE TRIGGER ${name} BEFORE UPDATE ON local_auth_credentials FOR EACH ROW EXECUTE FUNCTION ${name}_fn()`);

    let g!: Awaited<ReturnType<typeof call>>;
    let t!: Awaited<ReturnType<typeof call>>;
    let esperou = 0;
    let corpo: unknown;

    try {
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
      assert.equal(await ate(h, 1, 5_000), 1, "coreografia: a concessão está parada depois de ler a origem");
      const troca = trocarSenha(h, token, f.password, nova);
      const w2 = await ate(h, 2, 1_500);
      soltar();
      await trava;
      [g, t] = await Promise.all([grant, troca]);
      esperou = w2;
    } catch (error) {
      corpo = error;
    }

    await dropHarnessObjects(h.admin, corpo, [`DROP TRIGGER IF EXISTS ${name} ON local_auth_credentials`, `DROP FUNCTION IF EXISTS ${name}_fn()`]);
    if (corpo !== undefined) throw corpo;

    assert.equal(esperou, 2, "coreografia: a troca espera a concessão em voo");
    const rows = await h.admin.localAuthCredential.findMany({ where: { email: f.email }, select: { tenant_id: true, password_hash: true } });
    const mudaram = antes.filter((old) => rows.find((row) => row.tenant_id === old.tenant_id)?.password_hash !== old.password_hash).length;
    const copiaDeAntes = antes.some((old) => old.password_hash === rows.find((row) => row.tenant_id === z)?.password_hash);
    const novaEmX = (await login(h, quemTroca.tenantId, f.email, nova)).status;
    const velhaEmZ = (await login(h, z, f.email, f.password)).status;

    assert.equal(g.status, 201, "a concessão passa");
    assert.notEqual(t.status, 200, "a troca não responde 200 quando um par não pôde ser gravado");
    assert.equal(mudaram, 0, "GP-ATOM-TARDIA: nenhum par que já existia mudou de senha");
    assert.equal(copiaDeAntes, true, "GP-ATOM-TARDIA: o par novo guarda a senha de antes, igual aos outros");
    assert.equal(novaEmX, 401, "GP-ATOM-TARDIA: a senha nova não entra em pátio nenhum");
    assert.equal(velhaEmZ, 200, "GP-ATOM-TARDIA: a senha de antes segue valendo em todos");
  });
}

// B-APP-ORG-2S (Emenda 1.8.3.17 §2.3 (a), C5-02) — a redefinição por um pátio do grupo e a religação feita pelo técnico
// num PAR do grupo se serializam. T tem a identidade em X e H (mesmo grupo); W é outra empresa, fora do grupo, com conta e
// senha próprias de T e vínculo próprio. O ATOR da religação é T logado em X; quem redefine é o administrador de H. Cada
// teste roda nas duas ordens de id (X menor que H e X maior que H). A barreira lê o `pg_stat_activity` do papel efêmero:
// ou o pedido bloqueou numa trava cujo texto casa com o padrão, ou respondeu. Sem relógio.
type ParGr8 = { tenantId: string; userId: string };
type RespGr8 = { status: number; body: Record<string, any> };

async function cenarioGr8(h: Arnes, tag: string, ordem: "x<h" | "x>h") {
  const f = await novaFamilia(h, tag, { pairs: 2 });
  const sorted = [...(f.orgs as unknown as ParGr8[])].sort((a, b) => (a.tenantId.toLowerCase() < b.tenantId.toLowerCase() ? -1 : 1));
  const [x, home] = ordem === "x<h" ? [sorted[0]!, sorted[1]!] : [sorted[1]!, sorted[0]!];
  const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const wPassword = "SenhaPropriaW!2026";
  const w = await createOrgWithUser(h.admin, { name: `S2P W ${suffix}`, slug: `s2p-w-${suffix}`, email: f.email, password: wPassword });
  h.tenantIds.push(w.tenantId);
  const [idw] = await h.admin.$queryRaw<Array<{ id: string }>>`
    INSERT INTO auth_identities (id, created_at) VALUES (gen_random_uuid(), now()) RETURNING id::text AS id
  `;
  await h.admin.$executeRaw`
    INSERT INTO auth_identity_links (identity_id, tenant_id, user_id, attached_via)
    VALUES (${idw!.id}::uuid, ${w.tenantId}::uuid, ${w.userId}::uuid, 'backfill')
  `;
  const sx = await login(h, x.tenantId, f.email, f.password);
  assert.equal(sx.status, 200, "fixture: o técnico entra em X");
  const adminH = await administradorDe(h, home.tenantId);
  return { f, x, home, w, wPassword, token: String(sx.body?.data?.access_token ?? ""), adminH };
}

type CenarioGr8 = Awaited<ReturnType<typeof cenarioGr8>>;

async function wNaIdentidade(h: Arnes, c: CenarioGr8): Promise<boolean> {
  const [row] = await h.admin.$queryRaw<Array<{ identity_id: string }>>`
    SELECT identity_id::text FROM auth_identity_links WHERE tenant_id = ${c.w.tenantId}::uuid AND user_id = ${c.w.userId}::uuid
  `;
  return row?.identity_id === c.f.identityId;
}

async function credenciaisXH(h: Arnes, c: CenarioGr8) {
  return h.admin.localAuthCredential.findMany({
    where: { tenant_id: { in: [c.x.tenantId, c.home.tenantId] } },
    select: { tenant_id: true, password_hash: true, must_change_password: true },
    orderBy: { tenant_id: "asc" },
  });
}

async function bloqueadoOuRespondeu(h: Arnes, pending: Promise<unknown>, pattern: RegExp): Promise<"bloqueado" | "respondeu"> {
  let settled = false;
  void pending.then(() => { settled = true; }, () => { settled = true; });
  const deadline = Date.now() + 15_000;
  for (;;) {
    if (settled) return "respondeu";
    const rows = await h.admin.$queryRaw<Array<{ query: string }>>`
      SELECT query FROM pg_stat_activity WHERE usename = ${h.role.roleName} AND wait_event_type = 'Lock' AND state = 'active'
    `;
    if (rows.some((row) => pattern.test(row.query))) return "bloqueado";
    assert.ok(Date.now() < deadline, "coreografia: o pedido nem bloqueou nem respondeu");
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

function portaoGr8() {
  let abrir!: () => void;
  let avisar!: () => void;
  const aberto = new Promise<void>((resolve) => { abrir = resolve; });
  const pronto = new Promise<void>((resolve) => { avisar = resolve; });
  return { abrir, avisar, aberto, pronto };
}

for (const ordem of ["x<h", "x>h"] as const) {
  test(`GR8-LV (${ordem}) — a religação por um PAR do grupo está em voo (já moveu o vínculo, não confirmou): a redefinição por H ESPERA e responde 409`, { timeout: 120_000 }, async () => {
    const h = await harness();
    const c = await cenarioGr8(h, `gr8lv${ordem === "x<h" ? "a" : "b"}`, ordem);
    const antes = await credenciaisXH(h, c);
    const p = portaoGr8();
    const trava = h.admin.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE auth_identity_link_events IN SHARE MODE`;
      p.avisar();
      await p.aberto;
    }, { maxWait: 10_000, timeout: 60_000 });
    await p.pronto;
    let religacao: RespGr8 | undefined;
    let reset: RespGr8 | undefined;
    try {
      const relP = call(h, "/api/v1/auth/identity-links", { method: "POST", headers: bearer(c.token), body: { tenantId: c.w.tenantId, email: c.f.email, password: c.wPassword } });
      assert.equal(await bloqueadoOuRespondeu(h, relP, /auth_identity_link_events/), "bloqueado", "coreografia: a religação parou depois de mover o vínculo");
      const resetP = call(h, `/api/v1/auth/users/${c.home.userId}/reset-password`, { method: "POST", headers: c.adminH.headers, body: {} });
      const barreira = await bloqueadoOuRespondeu(h, resetP, /FROM auth_identity_links[\s\S]*FOR UPDATE/);
      console.log(`# GR8-LV ${ordem} barreira da redefinição: ${barreira}`);
      assert.equal(barreira, "bloqueado", "GR8-LV: a redefinição espera a religação em voo (não decide sobre vínculo não confirmado)");
      p.abrir();
      await trava;
      religacao = await relP;
      reset = await resetP;
    } finally {
      p.abrir();
      await trava.catch(() => undefined);
    }
    console.log(`# GR8-LV ${ordem} ${JSON.stringify({ religacao: religacao.status, reset: reset.status, reason: reset.body?.error?.reason ?? null })}`);
    assert.equal(religacao.status, 201, "GR8-LV: a religação confirma");
    assert.equal(reset.status, 409, "GR8-LV: a redefinição recusa");
    assert.equal(reset.body?.error?.reason, "identity_linked_elsewhere", "GR8-LV: o motivo é o vínculo em outra organização");
    assert.deepEqual(await credenciaisXH(h, c), antes, "GR8-LV: nenhum par muda de senha nem de marca");
  });

  test(`GR8-RV (${ordem}) — a redefinição por H está em voo (travou o vínculo do próprio par): a religação por um PAR do grupo ESPERA e responde 403`, { timeout: 120_000 }, async () => {
    const h = await harness();
    const c = await cenarioGr8(h, `gr8rv${ordem === "x<h" ? "a" : "b"}`, ordem);
    const p = portaoGr8();
    // O lado controlado faz o que a redefinição por H faz: FOR UPDATE no vínculo do PRÓPRIO par e a marca nos 2 pares.
    const lado = h.admin.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auth_identity_links WHERE tenant_id = ${c.home.tenantId}::uuid AND user_id = ${c.home.userId}::uuid FOR UPDATE`;
      await tx.$executeRaw`UPDATE local_auth_credentials SET must_change_password = true WHERE tenant_id IN (${c.x.tenantId}::uuid, ${c.home.tenantId}::uuid) AND email = ${c.f.email}`;
      p.avisar();
      await p.aberto;
    }, { maxWait: 10_000, timeout: 60_000 });
    await p.pronto;
    let religacao: RespGr8 | undefined;
    try {
      const relP = call(h, "/api/v1/auth/identity-links", { method: "POST", headers: bearer(c.token), body: { tenantId: c.w.tenantId, email: c.f.email, password: c.wPassword } });
      const barreira = await bloqueadoOuRespondeu(h, relP, /FROM auth_identity_links[\s\S]*FOR SHARE/);
      console.log(`# GR8-RV ${ordem} barreira da religação: ${barreira}`);
      assert.equal(barreira, "bloqueado", "GR8-RV: a religação espera a redefinição em voo");
      p.abrir();
      await lado;
      religacao = await relP;
    } finally {
      p.abrir();
      await lado.catch(() => undefined);
    }
    console.log(`# GR8-RV ${ordem} ${JSON.stringify({ religacao: religacao.status, reason: religacao.body?.error?.reason ?? null, wNaIdentidade: await wNaIdentidade(h, c) })}`);
    assert.equal(religacao.status, 403, "GR8-RV: a religação recusa");
    assert.equal(religacao.body?.error?.reason, "password_change_required", "GR8-RV: o motivo é a provisória");
    assert.equal(await wNaIdentidade(h, c), false, "GR8-RV: o vínculo de W não entra na identidade do técnico");
  });
}
