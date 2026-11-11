import type { Role } from "../core-saas/permissions/catalog.js";
import { WorkOrderError } from "./work-order.types.js";
import type { CheckinEntry, WorkOrderActorContext, WorkOrderStatus } from "./work-order.types.js";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// B-SAN3-26 (item 53 do portão) — o "No local" confere a placa do veículo atendido, nas duas portas.
//
// P-CHECKIN: uma OS só é gravada em `on_site` com um VEREDITO de check-in emitido aqui (`verifyCheckin`), num ponto só.
// O veredito sai em três casos:
//   plate_confirmed     — o pedido traz 2 caracteres que, normalizados, batem com o fim da placa do SERVIDOR;
//   exempt_service_type — a OS não tem placa e o tipo do catálogo, resolvido pelo servidor, está na lista de isentos;
//   office              — a entrada é a rota HTTP de status e o ator é SÓ base.
// Fora disso, a recusa é por padrão. A placa nunca vem do corpo do pedido.
//
// Decisões do dono: `D-PORTAO-9-RECOMENDACOES-1011` (só `residencial` isento; a base marca pelo console, "registrada
// pela base") e `D-PORTAO-5-RECOMENDACOES-1111` (OS sem placa: o guincheiro pede à base). Plano `plano-B-SAN3-26-v2.md`
// com a emenda do dev (`docs/revisoes/SAN3/B-SAN3-26-dev.md`, E-01 a E-08).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export type CheckinVerdictMode = "plate_confirmed" | "exempt_service_type" | "office";

declare const checkinVerdictBrand: unique symbol;

/** Só `verifyCheckin` cria um destes. Os dois repositórios recusam `on_site` com um veredito que não saiu daqui. */
export type CheckinVerdict = {
  readonly mode: CheckinVerdictMode;
  readonly [checkinVerdictBrand]: true;
};

const issuedCheckinVerdicts = new WeakSet<object>();

function issueVerdict(mode: CheckinVerdictMode): CheckinVerdict {
  const verdict = Object.freeze({ mode }) as CheckinVerdict;
  issuedCheckinVerdicts.add(verdict);
  return verdict;
}

// ─── Papéis (C26-04): duas listas literais, com nome ─────────────────────────────────────────────
// RBAC_MATRIX.md "Work orders / service orders" (l.45): full (platform_admin, tenant_admin, manager) e create/edit
// (operator). field_dispatcher = "Operação de Campo", o "despachante" da P2 do dono. super_admin = catálogo inteiro.
// LEITURAS DECLARADAS (registro `C-B-SAN3-26-DESPACHANTE-NA-BASE` em controle/decisoes.md): a lista "base" da
// correção de km (RBAC_MATRIX.md:118) exclui o field_dispatcher, e a l.57 diz que o platform_admin não é o aprovador
// padrão de fluxo da organização. O dono tira qualquer um destes papéis daqui em uma linha.
export const CHECKIN_OFFICE_ROLES: readonly Role[] = Object.freeze<Role[]>([
  "super_admin",
  "platform_admin",
  "tenant_admin",
  "manager",
  "operator",
  "field_dispatcher",
]);

// RBAC_MATRIX.md "execute/update-assigned" (field_technician) e o technician (assigned_only em work-order.types.ts).
export const CHECKIN_FIELD_ROLES: readonly Role[] = Object.freeze<Role[]>(["field_technician", "technician"]);

/**
 * O ator é SÓ base? Regra de união fail-closed: UM papel de campo basta para exigir os dígitos, some o que somar
 * (leitura declarada do plano: o gestor que também é técnico confirma a placa pelo app). Papel em nenhuma lista
 * (viewer, finance, inventory, auditor, support, sem papel) também exige os dígitos.
 */
export function isCheckinOfficeOnly(actor: Pick<WorkOrderActorContext, "roles">): boolean {
  const hasOfficeRole = actor.roles.some((role) => CHECKIN_OFFICE_ROLES.includes(role));
  const hasFieldRole = actor.roles.some((role) => CHECKIN_FIELD_ROLES.includes(role));
  return hasOfficeRole && !hasFieldRole;
}

// ─── Isenção (P1 do dono): só `residencial`, literal ────────────────────────────────────────────
export const CHECKIN_EXEMPT_SERVICE_TYPES: readonly string[] = Object.freeze(["residencial"]);

export type CheckinServiceTypeInfo = { readonly serviceType: string | null } | null;

function isCheckinExemptServiceType(typeInfo: CheckinServiceTypeInfo): boolean {
  // `typeInfo` nulo (sem catálogo, sem resolver, ou de outra organização) NÃO isenta.
  const exempt = typeInfo !== null && CHECKIN_EXEMPT_SERVICE_TYPES.includes(typeInfo.serviceType ?? "");
  return exempt;
}

// ─── Normalização da placa (C26-07 e C26R2-03, emenda E-03) ─────────────────────────────────────
// Placa brasileira, antiga (LLL NNNN) ou Mercosul (LLL N L NN), procurada como PALAVRA: sem letra ou dígito colado
// antes ou depois, com hífen, ponto ou espaço opcional entre as letras e os números. Assim "Onix 2019 ABC1D23" dá
// ABC1D23, e "SEM PLACA", "ZERO KM" e "A DEFINIR" não dão nada.
const BR_PLATE_PATTERN = /(?<![A-Z0-9])([A-Z]{3})[\s.-]{0,2}([0-9][A-Z0-9][0-9]{2})(?![A-Z0-9])/g;

/**
 * A referência do check-in: a placa normalizada (`ABC1D23`), ou `null` quando a OS não tem placa que sirva.
 * Só string conta (número, booleano e null = sem referência, nunca 500). Exatamente UMA placa no texto: nenhuma, ou
 * duas diferentes ("Uno 2010 ABC1234"), é sem referência — fail-closed, a base registra a chegada.
 */
export function resolveCheckinReference(details: Readonly<Record<string, unknown>> | null | undefined): string | null {
  const raw = details?.plate;
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  const candidates = new Set<string>();
  for (const match of upper.matchAll(BR_PLATE_PATTERN)) candidates.add(`${match[1]}${match[2]}`);
  if (candidates.size !== 1) return null;
  const [reference] = candidates;
  return reference ?? null;
}

/** Os 2 caracteres digitados, normalizados como a placa; qualquer outra forma é `null` (= confirmação ausente). */
export function normalizeTypedTail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length === 2 ? normalized : null;
}

// ─── Recusa (contrato de erro) ──────────────────────────────────────────────────────────────────
export const CHECKIN_REFUSAL_REASONS = Object.freeze([
  "checkin_confirmation_required",
  "checkin_confirmation_mismatch",
  "checkin_reference_missing",
] as const);

export type CheckinRefusalReason = (typeof CHECKIN_REFUSAL_REASONS)[number];

// A mensagem nunca ecoa a placa nem o que foi digitado (§2.8).
const CHECKIN_REFUSAL_MESSAGES: Readonly<Record<CheckinRefusalReason, string>> = {
  checkin_confirmation_required: "The last 2 characters of the vehicle plate are required to confirm the arrival.",
  checkin_confirmation_mismatch: "The characters do not match the vehicle plate of this work order.",
  checkin_reference_missing: "This work order has no vehicle plate; the office must register the arrival.",
};

function checkinError(reason: CheckinRefusalReason): WorkOrderError {
  return new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", reason, CHECKIN_REFUSAL_MESSAGES[reason]);
}

export function isCheckinRefusal(error: unknown): error is WorkOrderError {
  return error instanceof WorkOrderError && (CHECKIN_REFUSAL_REASONS as readonly string[]).includes(error.reason);
}

function readLastDigits(confirmation: unknown): unknown {
  if (typeof confirmation !== "object" || confirmation === null || Array.isArray(confirmation)) return undefined;
  return (confirmation as Record<string, unknown>).last_digits;
}

// ─── O veredito ─────────────────────────────────────────────────────────────────────────────────
export type CheckinWorkOrderSnapshot = {
  readonly code: string;
  readonly serviceDetails?: Readonly<Record<string, unknown>>;
};

/**
 * O ÚNICO emissor de veredito de check-in. Recebe a OS como o servidor a tem (`current`), o tipo do catálogo resolvido
 * pelo servidor e o corpo do pedido (`checkin_confirmation: { last_digits }`). Lança 422 com o motivo, ou devolve o
 * veredito. A porta (`entry`) só ESTREITA a isenção da base: a fila do app exige os dígitos de todos.
 */
export function verifyCheckin(
  actor: Pick<WorkOrderActorContext, "roles">,
  current: CheckinWorkOrderSnapshot,
  typeInfo: CheckinServiceTypeInfo,
  body: Readonly<Record<string, unknown>>,
  entry: CheckinEntry,
): CheckinVerdict {
  const officeEntry = entry === "http_status_route" && isCheckinOfficeOnly(actor);
  if (officeEntry) return issueVerdict("office");

  const reference = resolveCheckinReference(current.serviceDetails);
  const exempt = isCheckinExemptServiceType(typeInfo);
  if (reference === null && !exempt) throw checkinError("checkin_reference_missing");
  if (reference === null) return issueVerdict("exempt_service_type");

  // OS COM placa exige os dígitos, mesmo quando o tipo é isento.
  const typed = normalizeTypedTail(readLastDigits(body.checkin_confirmation ?? body.checkinConfirmation));
  if (typed === null) throw checkinError("checkin_confirmation_required");
  if (typed !== reference.slice(-2)) throw checkinError("checkin_confirmation_mismatch");
  return issueVerdict("plate_confirmed");
}

/**
 * A guarda dos repositórios (C26-08): `on_site` só com um veredito EMITIDO por `verifyCheckin`. Um objeto com a mesma
 * forma montado à mão não está no registro e é recusado — vale para todo escritor, inclusive de outro módulo.
 */
export function assertCheckinVerdictForStatus(input: { readonly status: WorkOrderStatus; readonly checkin?: unknown }): void {
  if (input.status !== "on_site") return;
  const verdict = input.checkin;
  if (typeof verdict === "object" && verdict !== null && issuedCheckinVerdicts.has(verdict)) return;
  throw new WorkOrderError(500, "WORK_ORDER_INVARIANT", "checkin_verdict_required", "Work order arrival requires a server check-in verdict.");
}

/** Para o `changeStatus` montar a entrada de `on_site`: sem veredito, é falha de composição (500), nunca um aceite. */
export function requireCheckinVerdict(verdict: CheckinVerdict | undefined): CheckinVerdict {
  if (verdict) return verdict;
  throw new WorkOrderError(500, "WORK_ORDER_INVARIANT", "checkin_verdict_required", "Work order arrival requires a server check-in verdict.");
}

/** A mensagem da linha do tempo em `on_site` é do servidor; o `message` do corpo é ignorado (C26-05). */
export function checkinTimelineMessage(verdict: CheckinVerdict): string {
  switch (verdict.mode) {
    case "office":
      return "Chegada ao local registrada pela base.";
    case "plate_confirmed":
      return "Operador chegou ao local, com a placa conferida.";
    case "exempt_service_type":
      return "Operador chegou ao local (serviço sem placa).";
  }
}

// ─── Quem confere não escreve a referência (C26-06) ─────────────────────────────────────────────
/**
 * Compara a referência RESULTANTE com a atual, já normalizadas. O PATCH substitui o objeto inteiro, então trocar,
 * omitir, anular ou esvaziar a placa muda a referência; mudança só cosmética ("abc-1d23" por "ABC1D23") não muda.
 */
export function assertCheckinReferenceUnchanged(
  currentDetails: Readonly<Record<string, unknown>> | undefined,
  serviceDetails: Readonly<Record<string, unknown>> | undefined,
): void {
  const currentReference = resolveCheckinReference(currentDetails);
  const nextReference = resolveCheckinReference(serviceDetails);
  if (currentReference !== nextReference) {
    throw new WorkOrderError(403, "FORBIDDEN", "checkin_reference_not_editable", "Field actors cannot change the vehicle plate of a work order.");
  }
}

// ─── O modo do check-in na LISTA (C26-03): o app grava e usa, sem lógica de tipo própria ────────
export type CheckinListMode = "plate" | "exempt" | "reference_missing";
export type CheckinListDescription = { readonly mode: CheckinListMode; readonly plateTail: string | null };

/** Só os 2 caracteres finais vão para a lista; a placa inteira e o `serviceDetails` ficam no detalhe. */
export function describeCheckinMode(
  serviceDetails: Readonly<Record<string, unknown>> | null | undefined,
  typeInfo: CheckinServiceTypeInfo,
): CheckinListDescription {
  const reference = resolveCheckinReference(serviceDetails);
  if (reference !== null) return { mode: "plate", plateTail: reference.slice(-2) };
  if (isCheckinExemptServiceType(typeInfo)) return { mode: "exempt", plateTail: null };
  return { mode: "reference_missing", plateTail: null };
}
