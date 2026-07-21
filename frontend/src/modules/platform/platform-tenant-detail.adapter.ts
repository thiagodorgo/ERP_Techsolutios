import type {
  PlatformTenantDetailInfo,
  PlatformTenantDetailModule,
  PlatformTenantDetailUser,
} from "./platform-tenant-detail.types";

// PR-SCALE-5c — normalização DEFENSIVA do payload de GET /api/v1/platform/tenants/:tenantId/detail (clona
// a defesa de platform-overview.adapter). NUNCA fabrica organização, usuário nem número (D-007): só
// normaliza o que o servidor enviou. Regras:
//  - contagem não-numérica / NaN / negativa → 0 (nunca chuta um valor);
//  - org sem `id` OU sem `name` string → detalhe NULO (sem identidade honesta, não há tela a montar);
//  - usuário sem `name` OU sem `email` → descartado (sem identidade honesta, não entra na lista);
//  - módulo sem `key`/`label` string, ou `enabled` que não seja boolean → descartado (nada inventado);
//  - projeção EXPLÍCITA: um campo extra do backend (mrr/uptime/health/address) NÃO é copiado — não há
//    como um valor sem fonte vazar para a UI.

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function adaptModule(raw: unknown): PlatformTenantDetailModule | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const key = nonEmptyString(row.key);
  const label = nonEmptyString(row.label);
  if (!key || !label) return null; // sem identidade/rótulo honesto → descartado
  if (typeof row.enabled !== "boolean") return null; // flag ambígua → não inventa habilitação

  return { key, label, enabled: row.enabled };
}

function adaptUser(raw: unknown): PlatformTenantDetailUser | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const name = nonEmptyString(row.name);
  const email = nonEmptyString(row.email);
  if (!name || !email) return null; // sem nome/e-mail honesto → descartado (D-007)

  // Projeção EXPLÍCITA: só os campos do DTO real (name/email/roleLabel/status). roleLabel é opcional;
  // status vira "" quando ausente (a UI mostra rótulo neutro, nunca inventa "Ativo").
  return {
    name,
    email,
    roleLabel: optionalString(row.roleLabel),
    status: nonEmptyString(row.status) ?? "",
  };
}

export function adaptPlatformTenantDetail(raw: unknown): PlatformTenantDetailInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = nonEmptyString(row.id);
  const name = nonEmptyString(row.name);
  if (!id || !name) return null; // sem identidade/nome honesto → não há tela a montar (rota → 404/vazio)

  const modules: PlatformTenantDetailModule[] = [];
  if (Array.isArray(row.modules)) {
    for (const entry of row.modules) {
      const module = adaptModule(entry);
      if (module) modules.push(module);
    }
  }

  const users: PlatformTenantDetailUser[] = [];
  if (Array.isArray(row.users)) {
    for (const entry of row.users) {
      const user = adaptUser(entry);
      if (user) users.push(user);
    }
  }

  // Projeção EXPLÍCITA: só os campos do DTO real. Campo extra (mrr/uptime/health) NÃO é copiado.
  return {
    id,
    name,
    slug: optionalString(row.slug),
    status: nonEmptyString(row.status) ?? "unknown",
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    moduleCount: toCount(row.moduleCount),
    modules,
    users,
  };
}
