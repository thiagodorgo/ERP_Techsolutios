import assert from "node:assert/strict";
import test, { after } from "node:test";

import { administradorDe, papelGlobal } from "./helpers/users-seg-desativado-sessao.js";
import {
  call,
  desmontarArnes,
  login,
  montarArnes,
  novaFamilia,
  redefinir,
  type Arnes,
  type Familia,
} from "./bapporg2s_familia-helper.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S, fatia S2p — os critérios do dono que dependem da CONCESSÃO (S2a, no ramo pelo merge da
// 1.8.3.11): GP3, GP3b, GP8-pendente e GR6. A concessão é a rota real `POST /api/v1/users/access-grants`, pelo
// administrador do pátio que recebe o acesso; o app real roda no papel sem bypass.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-APP-ORG-2S S2p · concessão exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  let harnessPromise: Promise<Arnes> | undefined;
  const harness = (): Promise<Arnes> => (harnessPromise ??= montarArnes(connectionString));

  after(async () => {
    const h = harnessPromise ? await harnessPromise.catch(() => undefined) : undefined;

    if (h) {
      await desmontarArnes(h);
    }
  });

  const HOUR = 60 * 60 * 1000;

  // Um pátio novo no MESMO grupo da família, sem o técnico.
  async function patioNoGrupo(h: Arnes, f: Familia, tag: string): Promise<string> {
    const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenant = await h.admin.tenant.create({ data: { name: `S2P concessão ${suffix}`, slug: `s2p-c-${suffix}` } });

    h.tenantIds.push(tenant.id);
    // O papel de sistema que a concessão atribui (no CI vem do provisionamento; aqui, criado se faltar).
    await papelGlobal(h, "field_technician", "tenant");
    await h.admin.economicGroupMember.create({
      data: { tenant_id: tenant.id, group_id: f.groupId, valid_from: new Date("2026-01-01T00:00:00Z"), valid_to: null },
    });

    return tenant.id;
  }

  async function conceder(h: Arnes, tenantId: string, email: string) {
    const admin = await administradorDe(h, tenantId);

    return call(h, "/api/v1/users/access-grants", { method: "POST", headers: admin.headers, body: { email, name: "Técnico do grupo" } });
  }

  async function credencial(h: Arnes, tenantId: string, email: string) {
    return h.admin.localAuthCredential.findFirst({
      where: { tenant_id: tenantId, email },
      select: { password_hash: true, failed_attempts: true, locked_until: true, password_updated_at: true, must_change_password: true },
    });
  }

  async function comRelogio<T>(offsetMs: number, work: () => Promise<T>): Promise<T> {
    const { temporaryPasswordClock } = await import("../src/modules/auth/temporary-password.rules.js");
    const original = temporaryPasswordClock.now;

    temporaryPasswordClock.now = () => new Date(Date.now() + offsetMs);

    try {
      return await work();
    } finally {
      temporaryPasswordClock.now = original;
    }
  }

  test("GP3 — concessão na hora 23 de uma provisória: na hora 25 ela não entra em Y nem em X (dar acesso não renova)", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp3", { pairs: 1 });
    const [x] = f.orgs;
    const reset = await redefinir(h, x.tenantId, x.userId);

    assert.equal(reset.status, 200);

    const temp = String(reset.body.data.temporary_password);

    // A provisória foi gravada há 23 h (a hora vai para a origem; a concessão copia a hora de lá).
    await h.admin.localAuthCredential.updateMany({ where: { tenant_id: x.tenantId, user_id: x.userId }, data: { password_updated_at: new Date(Date.now() - 23 * HOUR) } });

    const y = await patioNoGrupo(h, f, "gp3y");
    const granted = await conceder(h, y, f.email);

    assert.equal(granted.status, 201, `GP3: concessão ${granted.status} ${JSON.stringify(granted.body).slice(0, 200)}`);

    const copy = await credencial(h, y, f.email);
    const origin = await credencial(h, x.tenantId, f.email);

    assert.equal(copy?.password_updated_at.getTime(), origin?.password_updated_at.getTime(), "GP3: a cópia leva a hora da gravação");
    assert.equal(copy?.must_change_password, true, "GP3: a cópia leva a marca de troca (MP6)");

    await comRelogio(2 * HOUR, async () => {
      assert.equal((await login(h, y, f.email, temp)).status, 401, "GP3: na hora 25, não entra em Y");
      assert.equal((await login(h, x.tenantId, f.email, temp)).status, 401, "GP3: nem em X");
    });

    const inY = await login(h, y, f.email, temp);

    assert.equal(inY.status, 200, "GP3: antes das 24 h, a cópia entra em Y");
    assert.equal(inY.body.data.must_change_password ?? inY.body.data.mustChangePassword, true, "GP3: e entra só para trocar (MP6)");
  });

  test("GP3b — dar acesso não zera as tentativas nem o bloqueio", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp3b", { pairs: 1 });
    const [x] = f.orgs;

    for (let i = 0; i < 4; i += 1) assert.equal((await login(h, x.tenantId, f.email, "errada")).status, 401);

    const y = await patioNoGrupo(h, f, "gp3by");

    assert.equal((await conceder(h, y, f.email)).status, 201);
    assert.equal((await credencial(h, y, f.email))?.failed_attempts, 4, "GP3b: a cópia leva o contador (MP12)");

    assert.equal((await login(h, y, f.email, "errada")).status, 401);

    const lockedX = await credencial(h, x.tenantId, f.email);
    const lockedY = await credencial(h, y, f.email);

    assert.ok(lockedX?.locked_until && lockedY?.locked_until, "GP3b: mais 1 erro em Y bloqueia X e Y");

    const z = await patioNoGrupo(h, f, "gp3bz");

    assert.equal((await conceder(h, z, f.email)).status, 201);

    const copyZ = await credencial(h, z, f.email);
    const originNow = await credencial(h, x.tenantId, f.email);

    assert.equal(copyZ?.locked_until?.getTime(), originNow?.locked_until?.getTime(), "GP3b: com X bloqueado, a concessão para Z copia o bloqueio (MP12b)");
  });

  // ABERTO (dev-s2p-cl, PARADA registrada): a auditoria da concessão (`grantAccess`, `prisma-core-saas.store.ts`, da S2a,
  // fora do PERMITIDO da S2p) não grava `temporary_password_pending`; e o filtro da auditoria troca por [REDACTED] toda
  // chave que casa /password/i. A asserção fica como o plano manda; o `todo` só impede que o defeito conhecido derrube a
  // suíte. Pendência P-S2P-GP8-PENDENTE-NAO-GRAVADO.
  test("GP8-pendente — a concessão com a provisória pendente grava temporary_password_pending true; com senha própria, false", { todo: "P-S2P-GP8-PENDENTE-NAO-GRAVADO" }, async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp8p", { pairs: 1 });
    const [x] = f.orgs;

    assert.equal((await redefinir(h, x.tenantId, x.userId)).status, 200);

    const y = await patioNoGrupo(h, f, "gp8py");

    assert.equal((await conceder(h, y, f.email)).status, 201);

    const g = await novaFamilia(h, "gp8pb", { pairs: 1 });
    const w = await patioNoGrupo(h, g, "gp8pw");

    assert.equal((await conceder(h, w, g.email)).status, 201);

    const pending = await h.admin.auditLog.findMany({ where: { tenant_id: y }, select: { action: true, metadata: true } });
    const own = await h.admin.auditLog.findMany({ where: { tenant_id: w }, select: { action: true, metadata: true } });
    const flag = (rows: typeof pending) =>
      rows.map((row) => (row.metadata as Record<string, unknown> | null)?.temporary_password_pending).find((value) => value !== undefined);

    assert.equal(flag(pending), true, `GP8-pendente: true com a provisória pendente (${JSON.stringify(pending).slice(0, 300)})`);
    assert.equal(flag(own), false, "GP8-pendente: false com senha própria");
  });

  test("GR6 — redefinição × concessão simultâneas, 20 rodadas em cada ordem: nunca sobram hashes diferentes", { timeout: 600_000 }, async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gr6", { pairs: 2 });
    const [x] = f.orgs;
    const adminX = await administradorDe(h, x.tenantId);

    for (const order of ["reset-primeiro", "concessao-primeiro"] as const) {
      for (let round = 0; round < 20; round += 1) {
        const z = await patioNoGrupo(h, f, `gr6-${order}-${round}`);
        const adminZ = await administradorDe(h, z);
        const reset = () => call(h, `/api/v1/auth/users/${x.userId}/reset-password`, { method: "POST", headers: adminX.headers, body: {} });
        const grant = () => call(h, "/api/v1/users/access-grants", { method: "POST", headers: adminZ.headers, body: { email: f.email, name: "Técnico do grupo" } });
        const [first, second] = order === "reset-primeiro" ? [reset, grant] : [grant, reset];
        const p1 = first();
        const p2 = second();
        const [r1, r2] = await Promise.all([p1, p2]);

        const [resetResponse, grantResponse] = order === "reset-primeiro" ? [r1, r2] : [r2, r1];

        assert.equal(resetResponse.status, 200, `GR6 ${order} ${round}: redefinição ${JSON.stringify(resetResponse.body).slice(0, 160)}`);
        assert.equal(grantResponse.status, 201, `GR6 ${order} ${round}: concessão ${JSON.stringify(grantResponse.body).slice(0, 160)}`);

        const rows = await h.admin.localAuthCredential.findMany({ where: { email: f.email }, select: { password_hash: true } });

        assert.equal(new Set(rows.map((row) => row.password_hash)).size, 1, `GR6 ${order} ${round}: um hash só entre ${rows.length} pares`);
      }
    }
  });
}
