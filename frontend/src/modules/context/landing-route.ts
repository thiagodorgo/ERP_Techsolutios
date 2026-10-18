export type ContextLandingRoute =
  | "/dashboard"
  | "/finance"
  | "/inventory"
  | "/work-orders"
  | "/notifications";

/** Resolve a primeira tela somente por capacidades canônicas emitidas pelo backend. */
export function resolveContextLandingRoute(
  permissions: readonly string[],
): ContextLandingRoute | null {
  const effective = new Set(permissions);

  if (effective.has("dashboard:read")) return "/dashboard";
  if (effective.has("financial_entries:read")) return "/finance";
  if (effective.has("inventory_items:read")) return "/inventory";
  if (effective.has("work_orders:read")) return "/work-orders";
  if (effective.has("notifications:read")) return "/notifications";

  return null;
}
