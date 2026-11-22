import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import http from "node:http";

import type { PrismaClient } from "@prisma/client";

import {
  administradorDe,
  desmontarSessaoReal,
  montarSessaoReal,
  type SessaoRealHarness,
} from "./helpers/users-seg-desativado-sessao.js";
import { createOrgWithUser, type OrgFixture } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S, fatia S2p — o arnês das suítes `-db` da senha única entre pátios.
//
// - O app REAL (`createApp`) roda com o Prisma GLOBAL no papel EFÊMERO NOSUPERUSER NOBYPASSRLS
//   (`montarSessaoReal`); o `DATABASE_URL` é o administrador do cluster e só monta, mexe na fixture e
//   desmonta.
// - Só a LISTAGEM de candidatos do login atravessa a função elevada pela conexão do administrador: a migração a
//   deixa sem EXECUTE para o papel efêmero (em produção, passo 5 do runbook). Vale para as duas leituras de
//   candidatos: a do login sem organização (`candidatosPeloAdministrador`) e a do leitor da família da senha
//   (`loginCandidatesSource.list`). Todo o resto do login roda no papel.
// - A FAMÍLIA é montada com vínculos NÃO-religação da MESMA identidade (`backfill`), que é a classe que
//   `passwordFamilyOf` define (1.8.3 §2.2). A religação não é família pelo plano (MD8, GR3), e a concessão (S2a)
//   não existe nesta base. Leitura declarada do dev, diário `dev-s2p-cl`, L3.
// - Cada pedido sai de um IP de loopback diferente (127.0.x.y): o balde por IP do login (30 a cada 5 min,
//   por socket) não é o que estas suítes medem, e o `createApp` não deixa trocá-lo.
// -----------------------------------------------------------------------------------------------

export type Familia = {
  readonly email: string;
  readonly password: string;
  readonly identityId: string;
  readonly groupId: string;
  readonly orgs: readonly OrgFixture[];
  readonly names: readonly string[];
};

export type Arnes = SessaoRealHarness & { readonly groupIds: string[] };

let ipCounter = 0;

function nextLoopback(): string {
  ipCounter += 1;
  const n = ipCounter % 60000;
  return `127.0.${Math.floor(n / 250) + 1}.${(n % 250) + 2}`;
}

// `options.criarCliente` (Emenda 1.8.3.17 §2.3 (b)): repassado ao `montarSessaoReal`; quem não passa nada não muda.
export async function montarArnes(
  connectionString: string,
  options?: { readonly criarCliente?: (url: string) => PrismaClient },
): Promise<Arnes> {
  const h = await montarSessaoReal(connectionString, { candidatosPeloAdministrador: true, criarCliente: options?.criarCliente });

  try {
    const { env } = await import("../src/config/env.js");

    assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "a suíte roda em prisma, nunca em memória");
    assert.equal((await import("../src/database/prisma.js")).prisma, h.role.client, "o app usa o papel efêmero");

    const roles = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(roles, [{ rolsuper: false, rolbypassrls: false }], "o papel do app é NOSUPERUSER NOBYPASSRLS");

    const { loginCandidatesSource } = await import("../src/modules/auth/services/password-family.js");
    const { listLoginCandidatesViaFunction } = await import("../src/modules/auth/repositories/login-candidates.repository.js");

    loginCandidatesSource.list = (_tx, email) => listLoginCandidatesViaFunction(h.admin, email);
  } catch (error) {
    await desmontarSessaoReal(h);
    throw error;
  }

  return Object.assign(h, { groupIds: [] as string[] });
}

export async function desmontarArnes(h: Arnes): Promise<void> {
  try {
    if (h.groupIds.length > 0) {
      await h.admin.economicGroupMember.deleteMany({ where: { group_id: { in: h.groupIds } } });
      await h.admin.economicGroup.deleteMany({ where: { id: { in: h.groupIds } } });
    }
  } finally {
    await desmontarSessaoReal(h);
  }
}

export async function call(
  h: Arnes,
  path: string,
  init: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
): Promise<{ status: number; body: Record<string, any> }> {
  const url = new URL(`${h.baseUrl}${path}`);
  const payload = init.body === undefined ? undefined : JSON.stringify(init.body);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: url.hostname === "localhost" || url.hostname === "::" ? "127.0.0.1" : url.hostname.replace(/^\[|\]$/g, ""),
        port: url.port,
        path: url.pathname + url.search,
        method: init.method ?? "GET",
        localAddress: nextLoopback(),
        headers: {
          "content-type": "application/json",
          ...(payload === undefined ? {} : { "content-length": Buffer.byteLength(payload) }),
          ...(init.headers ?? {}),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let body: Record<string, any> = {};

          try {
            body = raw ? (JSON.parse(raw) as Record<string, any>) : {};
          } catch {
            body = { raw };
          }

          resolve({ status: res.statusCode ?? 0, body });
        });
      },
    );

    req.on("error", reject);

    if (payload !== undefined) {
      req.write(payload);
    }

    req.end();
  });
}

export function login(h: Arnes, tenantId: string | null, email: string, password: string) {
  return call(h, "/api/v1/auth/login", {
    method: "POST",
    body: { ...(tenantId ? { tenantId } : {}), email, password },
  });
}

export function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

// N pátios com o MESMO login (e-mail e senha), a mesma identidade (vínculos `backfill`) e, por padrão, todos no
// mesmo grupo econômico desde 2026-01-01.
export async function novaFamilia(
  h: Arnes,
  tag: string,
  options: {
    readonly pairs?: number;
    readonly password?: string;
    readonly inGroup?: readonly boolean[];
    readonly groupValidTo?: readonly (string | null)[];
  } = {},
): Promise<Familia> {
  const pairs = options.pairs ?? 3;
  const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `s2p-${suffix}@example.com`;
  const password = options.password ?? "SenhaFamilia!123";
  const orgs: OrgFixture[] = [];
  const names: string[] = [];

  for (let i = 0; i < pairs; i += 1) {
    const name = `S2P ${String.fromCharCode(88 + (i % 3))}${i >= 3 ? i : ""} ${suffix}`;
    const org = await createOrgWithUser(h.admin, { name, slug: `s2p-${i}-${suffix}`, email, password });

    h.tenantIds.push(org.tenantId);
    orgs.push(org);
    names.push(name);
  }

  const identity = await h.admin.$queryRaw<Array<{ id: string }>>`
    INSERT INTO auth_identities (id, created_at) VALUES (gen_random_uuid(), now()) RETURNING id::text AS id
  `;
  const identityId = identity[0]!.id;

  for (const [index, org] of orgs.entries()) {
    const attachedVia = index === 0 ? "backfill" : "concessao";
    await h.admin.$executeRaw`
      INSERT INTO auth_identity_links (identity_id, tenant_id, user_id, attached_via)
      VALUES (${identityId}::uuid, ${org.tenantId}::uuid, ${org.userId}::uuid, ${attachedVia})
    `;

    // B-APP-ORG-2S-c (SC): o par `concessao` carrega a linha `concessao` do registro de criações com a origem (o
    // 1º pátio), como a concessão real grava (`confirmAccessGrant`, S2a). Sem ela, a guarda de saída de grupo não
    // acha a origem e derruba o acesso (falha fechada).
    if (attachedVia === "concessao") {
      await h.admin.userCreationLog.create({
        data: {
          tenant_id: org.tenantId,
          user_id: org.userId,
          origin_tenant_id: orgs[0]!.tenantId,
          state: "concessao",
          email_key: createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex"),
        },
      });
    }
  }

  const group = await h.admin.economicGroup.create({ data: { name: `Grupo S2P ${suffix}` } });

  h.groupIds.push(group.id);

  for (const [i, org] of orgs.entries()) {
    if (options.inGroup && options.inGroup[i] === false) {
      continue;
    }

    const validTo = options.groupValidTo?.[i] ?? null;

    await h.admin.economicGroupMember.create({
      data: {
        tenant_id: org.tenantId,
        group_id: group.id,
        valid_from: new Date("2026-01-01T00:00:00Z"),
        valid_to: validTo ? new Date(`${validTo}T00:00:00Z`) : null,
      },
    });
  }

  return { email, password, identityId, groupId: group.id, orgs, names };
}

export async function credenciais(h: Arnes, familia: Familia) {
  const rows = await h.admin.localAuthCredential.findMany({
    where: { OR: familia.orgs.map((org) => ({ tenant_id: org.tenantId, user_id: org.userId })) },
    select: {
      tenant_id: true,
      password_hash: true,
      must_change_password: true,
      failed_attempts: true,
      locked_until: true,
      password_updated_at: true,
    },
  });

  return familia.orgs.map((org) => {
    const row = rows.find((candidate) => candidate.tenant_id === org.tenantId);

    assert.ok(row, "fixture: cada par tem credencial");

    return row;
  });
}

export async function redefinir(h: Arnes, actorTenantId: string, targetUserId: string, body: unknown = {}) {
  const admin = await administradorDe(h, actorTenantId);

  return call(h, `/api/v1/auth/users/${targetUserId}/reset-password`, {
    method: "POST",
    headers: admin.headers,
    body,
  });
}

export async function trocarSenha(h: Arnes, accessToken: string, currentPassword: string, newPassword: string) {
  return call(h, "/api/v1/auth/password", {
    method: "POST",
    headers: bearer(accessToken),
    body: { currentPassword, newPassword },
  });
}
