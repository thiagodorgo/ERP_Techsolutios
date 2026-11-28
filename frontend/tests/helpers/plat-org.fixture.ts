export const ORGANIZATION_A = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Organização A",
  slug: "organizacao-a",
  status: "active",
  createdAt: "2026-11-27T12:00:00.000Z",
  system: false,
  group: { id: "22222222-2222-4222-8222-222222222222", name: "Grupo Teste" },
  setup: { complete: false, missing: ["plan", "admin", "profile"] },
} as const;

export const ORGANIZATION_SYSTEM = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Plataforma",
  slug: "platform",
  status: "active",
  createdAt: "2026-11-20T12:00:00.000Z",
  system: true,
  group: null,
  setup: { complete: true, missing: [] },
} as const;

export const DETAIL_A = {
  id: ORGANIZATION_A.id,
  name: ORGANIZATION_A.name,
  slug: ORGANIZATION_A.slug,
  status: "active",
  createdAt: ORGANIZATION_A.createdAt,
  moduleCount: 1,
  modules: [{ key: "work_orders", label: "Ordens de Serviço", enabled: true }],
  users: [
    { name: "Administrador A", email: "admin-a@example.invalid", roleLabel: "Administrador", status: "active" },
    { name: "Operador A", email: "operador-a@example.invalid", roleLabel: "Operação", status: "active" },
    { name: "Inativo A", email: "inativo-a@example.invalid", roleLabel: "Operação", status: "inactive" },
  ],
  subscription: { planCode: "starter", planName: "Plano Regional Teste", validFrom: "2026-11-05T15:00:00.000Z", overrides: { monthlyPrice: null, includedUsers: null, includedStorageGb: null, extraUserPrice: null, extraGbPrice: null }, addons: [], modules: [] },
} as const;

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
