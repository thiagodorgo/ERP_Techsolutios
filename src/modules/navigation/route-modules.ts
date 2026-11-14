// B-SAN3-18 (item 16 do portão; plano v2 + Emenda 1) — a CLASSE de cada rota de `/api/v1` para o gate de módulo.
//
// Toda rota montada em `src/app.ts` cai em exatamente UMA destas classes:
//   - PLATAFORMA: o console da plataforma (`/platform/**`); o gate deixa passar e os guards de plataforma decidem;
//   - NÚCLEO: o que nunca se desliga por plano (login e sessão, usuários e perfis, configurações, minha assinatura,
//     o painel — resposta P2(a) do dono, `D-DONO-TODAS-RECOMENDACOES-1111`) e, só para GET, a leitura dos cadastros
//     que a OS usa (P3(a));
//   - MÓDULO {S}: a organização precisa ter PELO MENOS UM módulo de S (qualquer-de, R-A5);
//   - SEM CLASSE: rota que este arquivo não conhece. O gate RECUSA (403 `route_module_unclassified`), e o censo
//     `tests/san3-18-route-module-census.test.ts` fica vermelho até alguém classificá-la (fail-closed, CE-1/CE-G1).
//
// A classe é calculada sobre `normalizeRoutePath(req.path)`, porque o Express 5 roteia sem diferenciar maiúscula
// (`caseSensitive=false`) e aceita a barra final (`strict=false`): `/API/V1/Yards/` chega ao handler de `/yards`, e
// por isso tem de ter a mesma classe (R-A1). O texto NÃO é decodificado (o roteador também não decodifica para
// casar). HEAD é classificado como GET.
//
// Só chaves do catálogo canônico (`platform-modules.service.ts`) aparecem aqui (P4).

import { NAVIGATION_REGISTRY } from "./navigation.registry.js";
import type { NavigationItem } from "./navigation.types.js";

export type RouteModuleClass =
  | { readonly kind: "PLATAFORMA" }
  | { readonly kind: "NUCLEO" }
  | { readonly kind: "MODULO"; readonly modules: readonly string[] }
  | { readonly kind: "SEM_CLASSE" };

type RouteOverride = {
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly pattern: string;
} & ({ readonly modules: readonly string[] } | { readonly nucleo: true });

// Primeiro segmento de `/api/v1/<segmento>/…` → PLATAFORMA.
export const PLATAFORMA_API: readonly string[] = ["platform"];

// Primeiro segmento → NÚCLEO (lista LITERAL, independente do registro de navegação — CE-1).
// `webhooks`: o webhook de cobrança (B-ASS-08b) é infraestrutura sem módulo e sem token nosso; está aqui para que
// uma requisição com JWT que caia nele tenha classe (ele é montado antes do gate e, com o canal desligado, responde
// o 404 padrão).
export const NUCLEO_API: readonly string[] = [
  "health",
  "auth",
  "me",
  "sessions",
  "navigation",
  "users",
  "roles",
  "tenants",
  "tenant-settings",
  "billing",
  "attachments",
  "dashboard",
  "webhooks",
];

// P3(a) do dono — a LEITURA (GET/HEAD) dos cadastros que a OS e as telas usam fica liberada para toda organização;
// criar e editar exige a área (a classe de `ROUTE_MODULE_PREFIXES`). É leitura da própria organização: o tenant vem
// do ator, nunca do pedido, e o RLS e os services continuam filtrando por organização.
export const READ_CORE_PREFIXES: readonly string[] = [
  "/customers",
  "/suppliers",
  "/branches",
  "/vehicles",
  "/teams",
  "/service-catalog",
  "/price-tables",
  "/tariffs",
  "/tags",
  "/pois",
  "/operator-profiles",
];

// Primeiro segmento → conjunto de módulos (qualquer-de). Lista explícita, sem curinga: um prefixo novo
// (`financial-foo`, `expense-bar`) nasce SEM CLASSE e acende o censo.
export const ROUTE_MODULE_PREFIXES: Readonly<Record<string, readonly string[]>> = {
  "work-orders": ["work_orders"],
  "financial-accounts": ["finance"],
  "financial-titles": ["finance"],
  "financial-entries": ["finance"],
  "financial-periods": ["finance"],
  "financial-summary": ["finance"],
  "cheques": ["finance"],
  "commissions": ["finance"],
  "professional-statements": ["finance"],
  "service-quotes": ["quotes"],
  "operations": ["field_operations"],
  "field-locations": ["field_operations"],
  "inventory-items": ["inventory"],
  "stock-movements": ["inventory"],
  "cycle-counts": ["inventory"],
  "fuel-logs": ["vehicles"],
  "maintenance-orders": ["vehicles"],
  "fines": ["vehicles"],
  "insurance-policies": ["vehicles"],
  "damages": ["vehicles"],
  "yards": ["patios"],
  "yard-areas": ["patios"],
  "yard-spots": ["patios"],
  "jurisdiction-profiles": ["patios"],
  "jurisdiction-defaults": ["patios"],
  "impound-processes": ["patios"],
  "patios": ["patios"],
  "vehicle-identities": ["patios"],
  "authority-credentials": ["patios"],
  "price-tables": ["master_data", "patios"],
  "telemetry": ["telemetry"],
  "branches": ["master_data"],
  "service-catalog": ["master_data"],
  "tariffs": ["master_data"],
  "tags": ["master_data"],
  "pois": ["master_data"],
  "operator-profiles": ["master_data"],
  "teams": ["master_data"],
  "vehicles": ["master_data"],
  "customers": ["customers"],
  "suppliers": ["suppliers"],
  "approvals": ["approvals", "work_orders"],
  "notifications": ["notifications"],
  "audit-events": ["audit"],
  "expense-reports": ["expense_management"],
  "expense-policies": ["expense_management"],
  "expense-categories": ["expense_management"],
};

// Exceções por padrão (o mais longo vence). `:x` casa um segmento qualquer; o padrão casa como PREFIXO de segmentos.
// O prefixo `mobile` e o `tenant` NÃO têm classe por primeiro segmento: cada caminho deles está aqui, e um caminho
// novo sob eles nasce SEM CLASSE.
export const ROUTE_MODULE_OVERRIDES: readonly RouteOverride[] = [
  { pattern: "/mobile/bootstrap", nucleo: true },
  { pattern: "/operations/work-orders-timeseries", nucleo: true },
  // R2-01 (Emenda 1) — rotas que escrevem ou leem o razão financeiro ficam em {finance}, mesmo dentro de OS e Frota.
  { pattern: "/work-orders/:id/financial-items", modules: ["finance"] },
  { pattern: "/work-orders/:id/invoice", modules: ["finance"] },
  { pattern: "/fuel-logs/:id/payable", modules: ["finance"] },
  { pattern: "/maintenance-orders/:id/payable", modules: ["finance"] },
  { pattern: "/fines/:id/payable", modules: ["finance"] },
  { pattern: "/insurance-policies/:id/payable", modules: ["finance"] },
  // N1 do plano — o disparo dos alertas de Frota é Frota, embora more sob /notifications.
  { pattern: "/notifications/fleet-alerts/run", modules: ["vehicles"] },
  { pattern: "/tenant/checklists", modules: ["tenant_checklist"] },
  { pattern: "/tenant/checklist-components", modules: ["tenant_checklist"] },
  { pattern: "/mobile/checklists", modules: ["tenant_checklist"] },
  { pattern: "/mobile/checklist-runs", modules: ["tenant_checklist"] },
  { pattern: "/mobile/sync/checklist-actions", modules: ["tenant_checklist"] },
  { pattern: "/mobile/sync/work-order-actions", modules: ["work_orders"] },
  // R-A5 — o mesmo qualquer-de do `generic_evidence_upload` do bootstrap (mobile.routes.ts).
  { pattern: "/mobile/evidence-uploads", modules: ["work_orders", "field_operations"] },
  { pattern: "/mobile/sync/evidence-actions", modules: ["work_orders", "field_operations"] },
  { pattern: "/mobile/field-locations", modules: ["field_operations"] },
  { pattern: "/mobile/location-consent", modules: ["field_operations"] },
  { pattern: "/mobile/location-consent/revoke", nucleo: true },
  { pattern: "/mobile/inventory", modules: ["inventory"] },
  { pattern: "/mobile/technician/stock", modules: ["inventory"] },
  { pattern: "/mobile/sync/inventory-actions", modules: ["inventory"] },
  { pattern: "/mobile/sync/expense-actions", modules: ["expense_management"] },
  { pattern: "/mobile/telemetry", modules: ["telemetry"] },
];

const NUCLEO: RouteModuleClass = { kind: "NUCLEO" };
const PLATAFORMA: RouteModuleClass = { kind: "PLATAFORMA" };
const SEM_CLASSE: RouteModuleClass = { kind: "SEM_CLASSE" };

// Minúscula e sem as barras finais. O vazio vira "/".
export function normalizeRoutePath(path: string): string {
  const lowered = path.toLowerCase().replace(/\/+$/, "");
  return lowered === "" ? "/" : lowered;
}

function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function overrideMatches(override: RouteOverride, method: string, segments: readonly string[]): boolean {
  if (override.method && override.method !== method) return false;
  const pattern = segmentsOf(override.pattern);
  if (segments.length < pattern.length) return false;
  return pattern.every((part, index) => part.startsWith(":") || part === segments[index]);
}

function normalizeMethod(method: string): string {
  const upper = method.trim().toUpperCase();
  return upper === "HEAD" ? "GET" : upper;
}

// Classe de um caminho RELATIVO a `/api/v1` (o `req.path` do gate, montado em `/api/v1`).
export function classifyRoute(method: string, relativePath: string): RouteModuleClass {
  const verb = normalizeMethod(method);
  const path = normalizeRoutePath(relativePath);
  const segments = segmentsOf(path);
  const first = segments[0] ?? "";

  let best: RouteOverride | undefined;
  for (const override of ROUTE_MODULE_OVERRIDES) {
    if (!overrideMatches(override, verb, segments)) continue;
    if (!best || segmentsOf(override.pattern).length > segmentsOf(best.pattern).length) best = override;
  }
  if (best) return "nucleo" in best ? NUCLEO : { kind: "MODULO", modules: [...best.modules] };

  if (PLATAFORMA_API.includes(first)) return PLATAFORMA;
  if (NUCLEO_API.includes(first)) return NUCLEO;
  if (verb === "GET" && READ_CORE_PREFIXES.includes(`/${first}`)) return NUCLEO;

  const modules = Object.prototype.hasOwnProperty.call(ROUTE_MODULE_PREFIXES, first) ? ROUTE_MODULE_PREFIXES[first] : undefined;
  if (modules) return { kind: "MODULO", modules: [...modules] };

  return SEM_CLASSE;
}

// Classe de um caminho COMPLETO (`/api/v1/...`), para o censo e os testes. O prefixo é tirado sem diferenciar
// maiúscula, como o Express faz na montagem.
export function classifyApiRoute(method: string, fullPath: string): RouteModuleClass {
  const relative = fullPath.replace(/^\/api\/v1(?=\/|$)/i, "");
  return classifyRoute(method, relative === "" ? "/" : relative);
}

export function formatRouteModuleClass(routeClass: RouteModuleClass): string {
  if (routeClass.kind === "MODULO") return `{${routeClass.modules.join(",")}}`;
  return routeClass.kind;
}

// Todas as chaves de módulo que alguma classe de rota usa.
export const ROUTE_MODULE_KEYS: readonly string[] = [
  ...new Set([
    ...Object.values(ROUTE_MODULE_PREFIXES).flat(),
    ...ROUTE_MODULE_OVERRIDES.flatMap((override) => ("modules" in override ? override.modules : [])),
  ]),
].sort();

// B-SAN3-18 (P6, R2-04 da Emenda 1) — TODA chave de módulo que o gate ou o menu cobram: as classes de rota mais todo
// `requiredModules` do registro de navegação (inclui `logistics`, que é chave só de menu). É o que o script de
// provisionamento acrescenta a toda organização que já existe (P1(a) do dono), e o que `DEMO_TENANT_MODULES`
// (prisma/seed.ts) contém, para que nenhuma organização perca acesso no dia em que a recusa ligar.
export const ALL_MODULE_CLASSES: readonly string[] = [
  ...new Set([...ROUTE_MODULE_KEYS, ...collectRegistryModules(NAVIGATION_REGISTRY)]),
].sort();

function collectRegistryModules(items: readonly NavigationItem[]): string[] {
  return items.flatMap((item) => [...(item.requiredModules ?? []), ...collectRegistryModules(item.children ?? [])]);
}
