import type { PlatformOverviewOrg } from "./platform-overview.types";

// PR-SCALE-5a — normalização DEFENSIVA do payload de GET /api/v1/platform/overview (clona a defesa de
// audit-events.adapter). NUNCA fabrica organização nem número (D-007): só normaliza o que o servidor
// enviou. Regras:
//  - contagem não-numérica / NaN / negativa → 0 (nunca chuta um valor);
//  - organização sem `id` OU sem `name` string → descartada (sem identidade honesta, não entra na tabela);
//  - o view NÃO inventa campo: MRR / uptime / plano nem aparecem — a projeção PlatformOverviewOrg sequer
//    tem esses campos, então nada além do DTO real chega à UI.

// Contagem honesta: só número finito e não-negativo; qualquer outra coisa → 0 (nunca fabrica valor).
function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function adaptOrg(raw: unknown): PlatformOverviewOrg | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = nonEmptyString(row.id);
  const name = nonEmptyString(row.name);
  if (!id || !name) return null; // sem identidade/nome honesto → descartada (D-007)

  // Projeção EXPLÍCITA: só os campos do DTO real. Um campo extra do backend (mrr/uptime/plan) NÃO é
  // copiado — não há como um valor sem fonte vazar para a UI.
  return {
    id,
    name,
    slug: optionalString(row.slug),
    status: nonEmptyString(row.status) ?? "unknown",
    moduleCount: toCount(row.moduleCount),
    userCount: toCount(row.userCount),
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
  };
}

export function adaptPlatformOverview(raw: unknown): {
  activeOrgs: number;
  totalOrgs: number;
  totalUsers: number;
  orgs: PlatformOverviewOrg[];
} {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const orgs: PlatformOverviewOrg[] = [];
  if (Array.isArray(root.orgs)) {
    for (const entry of root.orgs) {
      const org = adaptOrg(entry);
      if (org) orgs.push(org);
    }
  }

  return {
    activeOrgs: toCount(root.activeOrgs),
    totalOrgs: toCount(root.totalOrgs),
    totalUsers: toCount(root.totalUsers),
    orgs,
  };
}
