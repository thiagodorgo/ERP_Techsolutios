// B-ASS-11 (F2, Emenda 1 §6.1 e Emenda 1.1 §5.1) — o estado da tela "Minha assinatura". NENHUM campo de dinheiro: a
// rota do cliente não manda valor, e a tela também não guarda (T-G2 lê este arquivo). O adapter copia SÓ estas chaves
// (allowlist, T-A1): o identificador do demonstrativo, o código do plano, a marca de estimativa e a disponibilidade da
// nota não entram, porque a tela não os usa.

export type MySubscriptionUsage = {
  readonly used: number;
  readonly included: number;
  readonly overLimit: boolean;
};

export type MySubscriptionStorage = MySubscriptionUsage & {
  /** Data (`AAAA-MM-DD`) da medição mais recente do mês, ou `null` antes da primeira. */
  readonly measuredAt: string | null;
};

export type MySubscriptionStatus = {
  readonly inGoodStanding: boolean;
  /** Vencimento da fatura mais antiga em atraso; `null` em dia ou em atraso sem data (estorno). */
  readonly overdueSince: string | null;
  readonly nextDueDate: string | null;
};

/** Só existe com fatura fechada e não paga. Cada meio é `null` quando o servidor não o mandou. */
export type MySubscriptionPayment = {
  readonly dueDate: string | null;
  /** Endereço `https:` normalizado, ou `null`. */
  readonly payUrl: string | null;
  readonly pixCopyPaste: string | null;
  readonly boletoLine: string | null;
  /** Endereço `https:` normalizado, ou `null`. */
  readonly boletoUrl: string | null;
};

export type MySubscription = {
  /** Mês de referência, `AAAA-MM`. */
  readonly period: string;
  /** Nome do plano; `null` quando o servidor o manda vazio. */
  readonly planName: string | null;
  readonly users: MySubscriptionUsage;
  readonly storageGb: MySubscriptionStorage;
  readonly status: MySubscriptionStatus;
  readonly payment: MySubscriptionPayment | null;
};

/** O que o adapter tira da resposta: pronta, sem assinatura (`data: null`) ou fora da forma. */
export type MySubscriptionParse =
  | { readonly kind: "ready"; readonly subscription: MySubscription }
  | { readonly kind: "none" }
  | { readonly kind: "invalid" };

/** O que o service devolve à tela. */
export type MySubscriptionResult =
  | { readonly kind: "ready"; readonly subscription: MySubscription }
  | { readonly kind: "none" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "failed"; readonly status: number | null };

export type MySubscriptionApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

/** Os blocos clicáveis da tela (um aberto por vez). */
export type MySubscriptionBlock = "plano" | "usuarios" | "espaco" | "situacao" | "pagar";
