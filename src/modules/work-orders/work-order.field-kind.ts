/**
 * B-SAN3-15b (P7, itens 35 e 36 do portão) — o tipo de atendimento de campo de uma OS, decidido pelo SERVIDOR a partir
 * do tipo do serviço no catálogo, pela regra da Pergunta 1 (a) do dono:
 *
 *   reboque                       → tow       (guincho)
 *   socorro, residencial e outro  → provider  (prestador)
 *   qualquer outro valor          → unknown
 *
 * `unknown` também vale para a OS sem catálogo, o catálogo sem tipo e o catálogo que não resolve na organização do
 * ator (outra organização ou inexistente: o resolvedor é por organização e devolve `null`). É fail-closed: o app não
 * abre porta especializada para `unknown`.
 *
 * O mapa é literal e fechado (CE-G1): tipo novo no catálogo vira `unknown` até alguém o pôr aqui. A comparação é exata
 * e só por chave PRÓPRIA do objeto, para que `constructor`, `__proto__` e afins nunca casem.
 */
export type FieldServiceKind = "tow" | "provider" | "unknown";

export const FIELD_SERVICE_KIND_BY_CATALOG_TYPE: Readonly<Record<string, Exclude<FieldServiceKind, "unknown">>> = Object.freeze({
  reboque: "tow",
  socorro: "provider",
  residencial: "provider",
  outro: "provider",
});

export function fieldServiceKindOf(serviceType: string | null | undefined): FieldServiceKind {
  if (typeof serviceType !== "string") return "unknown";
  if (!Object.prototype.hasOwnProperty.call(FIELD_SERVICE_KIND_BY_CATALOG_TYPE, serviceType)) return "unknown";

  return FIELD_SERVICE_KIND_BY_CATALOG_TYPE[serviceType] ?? "unknown";
}
