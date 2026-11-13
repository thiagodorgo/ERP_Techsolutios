// B-ASS-08c1a (Emenda 2.1, D-2′) — erros da porta de pagamento que não são da camada HTTP.
//
//  - `provider_list_incomplete`: a listagem por referência não PROVOU que está completa (`hasMore === false`,
//    `totalCount` inteiro e igual ao tamanho da página). Fail-closed: sem essa prova a lista não vale, e o despacho
//    nunca cria cobrança a partir dela (reagenda a linha nova; a órfã volta na rodada seguinte).
//
// Fica fora de `providers/http/billing-errors.ts` de propósito: a união `BillingHttpErrorCode` é da camada HTTP e não
// muda neste bloco. O despacho lê o `.code` (o `errorCode` de `outbox.dispatcher.ts`), como de qualquer erro.

export class ProviderListIncompleteError extends Error {
  readonly code = "provider_list_incomplete" as const;

  constructor() {
    super("The provider list did not prove it is complete.");
    this.name = "ProviderListIncompleteError";
  }
}
