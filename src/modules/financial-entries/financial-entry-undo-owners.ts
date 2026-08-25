import type { FinancialEntry, FinancialEntryError } from "./financial-entry.types.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 3 · C2 (P5) — VÍNCULO DE AGREGADO FAIL-CLOSED POR CONSTRUÇÃO.
//
// A frase da junta que governa este arquivo: *"os defeitos do ciclo 1 estão fechados; a classe que
// os gerou, não."* O ciclo 1 fechou o B-2 ACRESCENTANDO o membro que faltava a uma lista escrita à
// mão; o ciclo 2 reprovou pelo mesmo motivo, porque acrescentar membro não muda a propriedade que
// produziu o membro faltante. O que muda a propriedade é o vínculo novo **não compilar** enquanto
// ninguém decidir o que ele é.
//
// P5 — *nenhum vínculo de agregado nasce permitido em silêncio.* Concretamente, neste arquivo:
//   · campo novo no tipo `FinancialEntry` sem classificação  -> TS1360 no `npm run check`;
//   · chave classificada que não existe no tipo              -> TS2353;
//   · dono-de-desfazer novo sem política para `delete` E para `reverse` -> TS1360;
//   · dono novo fora de qualquer ordem de precedência        -> TS2322 (`true` não atribuível a `never`).
//
// POR QUE ESTE ARQUIVO VIVE EM `src/` E NÃO NO ARNÊS — restrição MEDIDA: `tsconfig.json` tem
// `include: ["src/**/*.ts"]`, e os testes rodam por `tsx` em modo transpile-only. Um `satisfies`
// escrito num arquivo de teste NÃO é conferido por build nenhum: seria uma cerca que ninguém
// inspeciona. O precedente da casa já está em `src/` e provado:
// `src/modules/core-saas/permissions/catalog.ts`.
//
// O QUE MUDOU NO CICLO 4 (C2/P5-v2 — o fato medido, sem overclaim). Até o ciclo 3 o VALOR deste mapa
// não tinha consumidor: `rg FINANCIAL_ENTRY_FIELD_CLASS src tests` achava só a declaração e um
// `Object.keys` no censo — classificar um campo certo ou errado NÃO movia teste nenhum (o `ownsEntry`
// decidia por `entry.titleId != null` / `entry.reversalOf != null` escritos à mão). Desde o ciclo 4 os
// detectores de dono DERIVAM deste mapa (`UNDO_OWNER_FIELDS`, abaixo): desclassificar `titleId` deixa
// o delete de uma liquidação ACEITO (testes vermelhos); classificar um campo `plain` como dono recusa
// um lançamento que era livre (testes vermelhos). O D22 prova as duas direções.
//
// O RESÍDUO, dito antes que alguém o descubra: esta construção força a DECISÃO a existir, a aparecer no
// diff E a ter efeito observável — mas não força a decisão a estar CERTA. Classificar de boa-fé um
// campo NOVO como `"plain"` compila e passa. O que fecha esse resto é o par {decisão visível no diff +
// junta}, o mesmo par que a ata aceitou como fail-closed no precedente do `catalog.ts`. Nenhuma
// construção conhecida deste repositório faz melhor, e este arquivo não finge que faz.
// -----------------------------------------------------------------------------------------------

/** Identidade de cada agregado que RECLAMA um lançamento — a chave da tabela de políticas. */
export const UNDO_OWNER_IDS = ["reversal_pair", "title_settlement", "cheque_link"] as const;
export type UndoOwnerId = (typeof UNDO_OWNER_IDS)[number];

/**
 * O que um campo do lançamento SIGNIFICA para o desfazimento:
 *   · `"plain"`          — dado do próprio lançamento; não amarra ninguém;
 *   · `"owner:<id>"`     — o campo É o vínculo com um agregado, e o agregado manda no desfazimento.
 */
export type FieldClass = "plain" | `owner:${UndoOwnerId}`;

/**
 * CLASSIFICAÇÃO TOTAL dos campos de `FinancialEntry`. `satisfies Record<keyof FinancialEntry, ...>`
 * é o que torna a omissão IMPOSSÍVEL: campo novo no tipo e ausente daqui é TS1360 ("Property ... is
 * missing"); chave aqui sem campo correspondente é TS2353 ("does not exist").
 *
 * É o ataque `payrollId` do guardião com a aceitação invertida: no ciclo 2 ele media `check` exit 0
 * (o campo novo nascia permitido em silêncio); aqui ele tem de medir exit != 0.
 */
export const FINANCIAL_ENTRY_FIELD_CLASS = {
  id: "plain",
  tenantId: "plain",
  accountId: "plain",
  // A LIQUIDAÇÃO: o lançamento carrega o pagamento de um título, e desfazê-lo tem de devolver o
  // pagamento ao título — coisa que só o `reverse` faz (Ω6R-DIN-010).
  titleId: "owner:title_settlement",
  direction: "plain",
  amount: "plain",
  currency: "plain",
  paymentMethod: "plain",
  category: "plain",
  occurredAt: "plain",
  competencia: "plain",
  description: "plain",
  // O PAR DE ESTORNO: original e contrapartida são um par indivisível; desfazer metade dele
  // desbalanceia o saldo nas duas direções.
  reversalOf: "owner:reversal_pair",
  reconciled: "plain",
  divergenceType: "plain",
  reconciliationRef: "plain",
  reconciledAt: "plain",
  reconciledBy: "plain",
  clientActionId: "plain",
  createdBy: "plain",
  updatedBy: "plain",
  createdAt: "plain",
  updatedAt: "plain",
  deletedAt: "plain",
} as const satisfies Record<keyof FinancialEntry, FieldClass>;

/**
 * O vínculo com o CHEQUE não é campo do lançamento: ele mora do outro lado, nas duas pontas da linha
 * do cheque (`cleared_entry_id`/`bounce_entry_id`). Por isso `cheque_link` não aparece no mapa acima
 * — e por isso a fonte única dele vive em `cheque.types.ts`, consumida pelos dois repositórios.
 * Registrar a assimetria aqui evita que alguém "conserte" o mapa inventando um campo que não existe.
 */
export const CHEQUE_LINK_LIVES_ON_THE_CHEQUE_SIDE = true;

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 4 · C2 (P5-v2) — O VALOR DA CLASSIFICAÇÃO GANHA CONSUMIDOR.
//
// `UNDO_OWNER_FIELDS` é DERIVADO de `FINANCIAL_ENTRY_FIELD_CLASS` em runtime: para cada campo com
// classe `owner:<id>`, o campo entra na lista daquele dono. É o SEGUNDO consumidor do mapa (o
// primeiro era só `Object.keys` no censo) — e o que dá EFEITO ao valor: o detector de dono (`ownsEntry`
// no serviço) pergunta a este mapa quem é dono, em vez de checar `entry.titleId`/`entry.reversalOf`
// à mão. Mudar a classe de um campo muda o comportamento de delete/reverse (D22 prova as duas direções).
//
// A base é `UNDO_OWNER_IDS` (não um literal de 3 chaves): dono novo em `UNDO_OWNER_IDS` nasce com lista
// vazia aqui automaticamente — nunca uma chave ausente que o `[owner]` acessaria como `undefined`.
// `cheque_link` fica com lista VAZIA de propósito (não tem campo NO lançamento — vive nas pontas do
// cheque); o detector dele é 100% "extra" (leitura das pontas), montado no serviço.
// -----------------------------------------------------------------------------------------------
export const UNDO_OWNER_FIELDS: Record<UndoOwnerId, readonly (keyof FinancialEntry)[]> = (() => {
  const acc = Object.fromEntries(UNDO_OWNER_IDS.map((id) => [id, [] as (keyof FinancialEntry)[]])) as Record<
    UndoOwnerId,
    (keyof FinancialEntry)[]
  >;
  for (const [field, klass] of Object.entries(FINANCIAL_ENTRY_FIELD_CLASS) as [keyof FinancialEntry, FieldClass][]) {
    if (klass !== "plain") {
      // `owner:<id>` → `<id>`. O `id` é membro de UNDO_OWNER_IDS por construção do tipo FieldClass.
      const ownerId = klass.slice("owner:".length) as UndoOwnerId;
      acc[ownerId].push(field);
    }
  }
  return acc;
})();

/**
 * O lançamento é dono-de-`owner` PELO CAMPO? — a metade "de campo" do detector, derivada do mapa.
 * `true` se qualquer campo classificado para esse dono estiver preenchido no lançamento. A outra
 * metade (leituras que não são campo: o irmão do estorno, as pontas do cheque) é o "extra" do serviço.
 */
export function entryHasOwnerField(owner: UndoOwnerId, entry: FinancialEntry): boolean {
  return UNDO_OWNER_FIELDS[owner].some((field) => entry[field] != null);
}

/** A decisão de uma rota diante de um dono: recusar (com o erro nomeado) ou permitir (com o porquê). */
export type UndoPolicy =
  | { readonly kind: "refuse"; readonly error: () => FinancialEntryError }
  | { readonly kind: "allow"; readonly why: string };

export function refuse(error: () => FinancialEntryError): UndoPolicy {
  return { kind: "refuse", error };
}

export function allow(why: string): UndoPolicy {
  return { kind: "allow", why };
}

/** As duas rotas de desfazimento da superfície de lançamentos. */
export type UndoRoute = "delete" | "reverse";

/** Política CÉLULA A CÉLULA: cada dono decide, separadamente, o que faz em cada rota. */
export type UndoOwnerPolicies = Record<UndoRoute, UndoPolicy>;

/**
 * Constrói a tabela de políticas. As fábricas de erro entram por parâmetro porque elas vivem no
 * repositório (que importa este módulo indiretamente) — injetá-las mantém este arquivo sem ciclo e
 * sem conhecer a camada de erro.
 *
 * **Não existe `else`.** `satisfies Record<UndoOwnerId, UndoOwnerPolicies>` exige as DUAS células de
 * TODO dono: um `UndoOwnerId` novo sem `delete` e `reverse` escritos não compila. E a permissão que
 * hoje é o SILÊNCIO entre dois ifs — `title_settlement` no `reverse` — passa a ser uma linha
 * assinada, com o motivo por escrito.
 */
export function buildUndoOwnerPolicies(errors: {
  readonly reversalPairImmutable: () => FinancialEntryError;
  readonly settlementEntryImmutable: () => FinancialEntryError;
  readonly chequeEntryImmutable: () => FinancialEntryError;
}) {
  return {
    reversal_pair: {
      // Deletar o original já estornado deixaria a contrapartida ativa (saldo desbalanceado);
      // deletar a própria contrapartida desfaria o estorno.
      delete: refuse(errors.reversalPairImmutable),
      // Estornar um contra-lançamento abriria chain infinita de re-estorno flipando o saldo.
      reverse: refuse(errors.reversalPairImmutable),
    },
    title_settlement: {
      // Apagar devolvia o caixa e deixava o título com paid_amount intacto, sem rota de saída.
      delete: refuse(errors.settlementEntryImmutable),
      // ESTA LINHA É O PONTO: `reverse` É o fluxo do agregado título — ele devolve o pagamento na
      // MESMA unidade (restorePaymentGuarded). Hoje essa permissão existe como AUSÊNCIA de if; aqui
      // ela é uma decisão escrita, que aparece no diff de quem a mudar.
      reverse: allow("reverse É o fluxo do agregado título: devolve o pagamento na mesma unidade"),
    },
    cheque_link: {
      // Quem desfaz movimento de cheque é a máquina de estados dele (`bounce`), nunca esta porta.
      delete: refuse(errors.chequeEntryImmutable),
      reverse: refuse(errors.chequeEntryImmutable),
    },
  } as const satisfies Record<UndoOwnerId, UndoOwnerPolicies>;
}

export type UndoOwnerPolicyTable = ReturnType<typeof buildUndoOwnerPolicies>;

// -----------------------------------------------------------------------------------------------
// PRECEDÊNCIA POR ROTA, COMO DADO — e com IGUALDADE DE UNIÃO conferida pelo compilador.
//
// A ordem VIGENTE não muda uma posição (é critério de aceitação do refactor, não efeito colateral):
//   delete : 404 -> entry_reconciled -> reversal_pair -> title_settlement -> cheque_link -> período
//   reverse: 404 -> entry_reconciled -> reversal_pair -> cheque_link -> already_reversed -> período
// Os checks que NÃO são vínculo de agregado (404, entry_reconciled, already_reversed, período)
// continuam onde estão, no serviço: eles não pertencem a dono nenhum.
// -----------------------------------------------------------------------------------------------

export const DELETE_UNDO_ORDER = ["reversal_pair", "title_settlement", "cheque_link"] as const;
export const REVERSE_UNDO_ORDER = ["reversal_pair", "cheque_link"] as const;

/** `true` só quando os dois lados são exatamente a MESMA união (nem mais, nem menos). */
type AssertSame<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

/**
 * O guard de exaustividade das ordens. Dono novo declarado em `UNDO_OWNER_IDS` e esquecido em
 * `DELETE_UNDO_ORDER` faz `AssertSame` colapsar em `never`, e `true` não é atribuível a `never`:
 * TS2322. Dono a mais numa ordem (um id que não existe) cai pelo mesmo teto.
 *
 * `REVERSE_UNDO_ORDER` NÃO é comparada com a união inteira de propósito, e a razão está escrita:
 * `title_settlement` é `allow` no `reverse`, logo não pertence à ordem de RECUSA dessa rota. Quem a
 * proteje é a tabela de políticas (que exige a célula), não esta lista.
 */
export const DELETE_ORDER_IS_TOTAL: AssertSame<(typeof DELETE_UNDO_ORDER)[number], UndoOwnerId> = true;

/** Todo id da ordem do `reverse` tem de ser um dono conhecido — subconjunto, não igualdade. */
export const REVERSE_ORDER_IS_KNOWN: (typeof REVERSE_UNDO_ORDER)[number] extends UndoOwnerId ? true : never = true;

/**
 * E o complemento que impede a ordem do `reverse` de encolher em silêncio: todo dono que a política
 * do `reverse` classifica como `refuse` TEM de estar na ordem. Como a tabela é construída em runtime
 * (as fábricas de erro entram por parâmetro), este par é conferido pelo censo em runtime — ver
 * `assertUndoOrdersCoverEveryRefusal`.
 */
export function assertUndoOrdersCoverEveryRefusal(policies: UndoOwnerPolicyTable): void {
  const check = (route: UndoRoute, order: readonly UndoOwnerId[]): void => {
    for (const owner of UNDO_OWNER_IDS) {
      const policy: UndoPolicy = policies[owner][route];
      if (policy.kind === "refuse" && !order.includes(owner)) {
        throw new Error(
          `B-O6R-02 P5: o dono '${owner}' RECUSA na rota '${route}' mas está fora da ordem de precedência dela — ` +
            "uma recusa que ninguém percorre é uma recusa que não acontece.",
        );
      }
    }
  };
  check("delete", DELETE_UNDO_ORDER);
  check("reverse", REVERSE_UNDO_ORDER);
}
