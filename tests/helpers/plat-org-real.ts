import type { OrgFixture } from "./auth-identity-fixture.js";
import { requestJson } from "./auth-identity-fixture.js";
import {
  desmontarSessaoReal,
  montarSessaoReal,
  novaOrganizacao,
  type SessaoRealHarness,
} from "./users-seg-desativado-sessao.js";

export type PlatOrgRealHarness = SessaoRealHarness & {
  readonly actor: OrgFixture;
  readonly platformHeaders: Record<string, string>;
};

export async function montarPlatOrgReal(
  connectionString: string,
  options: Parameters<typeof montarSessaoReal>[1] = {},
): Promise<PlatOrgRealHarness> {
  const session = await montarSessaoReal(connectionString, options);
  const actor = await novaOrganizacao(session, "plat-org-actor");

  return {
    ...session,
    actor,
    platformHeaders: {
      "x-user-id": actor.userId,
      "x-role": "platform_admin",
    },
  };
}

export async function assegurarPapeisGlobais(
  harness: PlatOrgRealHarness,
  keys: readonly string[],
): Promise<void> {
  for (const key of keys) {
    const existing = await harness.admin.role.findFirst({
      where: { key, tenant_id: null },
      select: { id: true },
    });
    if (!existing) {
      const created = await harness.admin.role.create({
        data: { key, name: `Global ${key} (plat-org)`, scope: "system" },
        select: { id: true },
      });
      harness.createdGlobalRoleIds.push(created.id);
    }
  }
}

export async function desmontarPlatOrgReal(harness: PlatOrgRealHarness): Promise<void> {
  await desmontarSessaoReal(harness);
}

export async function criarGrupo(harness: PlatOrgRealHarness, name: string): Promise<{ readonly id: string }> {
  return harness.admin.economicGroup.create({
    data: {
      name,
      notes: null,
      created_by: harness.actor.userId,
      updated_by: harness.actor.userId,
    },
    select: { id: true },
  });
}

export async function criarOrganizacaoPelaPlataforma(
  harness: PlatOrgRealHarness,
  input: { readonly name: string; readonly group: { readonly id: string } | { readonly name: string } },
) {
  const response = await requestJson(harness.baseUrl, "/api/v1/platform/tenants", {
    method: "POST",
    headers: harness.platformHeaders,
    body: input,
  });
  const id = (response.body.data as { organization?: { id?: unknown } } | undefined)?.organization?.id;

  if (typeof id === "string" && !harness.tenantIds.includes(id)) {
    harness.tenantIds.push(id);
  }

  return response;
}
