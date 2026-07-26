import type { DailyCap, DailyModel, ProfileScope, ReleaseRequirement } from "./jurisdiction.types.js";

// Ω5P PR-02 (D-Ω5P-JUR-02) — Constante CANÔNICA única: a norma federal escrita UMA vez. Espelha os @default das
// colunas de jurisdiction_profiles. Módulo PURO (zero dependência de service/prisma) — charging (PR-07, motor de
// diárias I4) e auction (notificações/leilão I6) importam daqui SEM acoplar ao service.
//
// Aderência normativa (artigo por parâmetro):
//   ownerNotifDays=10           — Res. CONTRAN 1025/2026 art. 15 (notificação ao proprietário em <=10 dias)
//   noticeEdictDay=30           — Res. 1025 art. 26 (edital complementar após 30 dias sem regularização)
//   auctionEligibleDay=60       — CTB art. 328 (Lei 13.160/2015) + Res. 1025 art. 25 (não reclamado em 60 dias)
//   auctionEdictBusinessDays=15 — Lei 14.133/2021 (edital do leilão >=15 dias úteis)
//   dailyModel=ROLLING_24H      — Res. 1025 art. 21 §1º (diária = período de 24h contado da entrada)
//   dailyCap=SIX_MONTHS         — CTB art. 271 §10 (Lei 13.281/2016) / art. 328 §5º (teto de 6 meses de estada)
export const FEDERAL_DEFAULTS = {
  ownerNotifDays: 10,
  noticeEdictDay: 30,
  auctionEligibleDay: 60,
  auctionEdictBusinessDays: 15,
  dailyModel: "ROLLING_24H",
  dailyCap: "SIX_MONTHS",
} as const satisfies {
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
  readonly auctionEligibleDay: number;
  readonly auctionEdictBusinessDays: number;
  readonly dailyModel: DailyModel;
  readonly dailyCap: DailyCap;
};

// Tema Repetitivo 124/STJ (REsp 1.104.775/RS) — estada limitada a 30 diárias no regime ANTERIOR. NÃO é escolha de
// scope: é teto INTERTEMPORAL por DATA DE ENTRADA, aplicado pelo charging (PR-07) lendo profile.dailyCap. PR-02 só
// expõe o enum + esta constante para o PR-07 ter uma fonte única (ESTUDO §2.3).
export const TEMA_124_LEGACY_CAP = "THIRTY_DAYS_LEGACY" as const;

// Baseline SUGERIDO de checklist de liberação (CTB art. 271 §1º / Res. 1025 arts. 23-24). A coluna
// release_requirements NASCE VAZIA (D-Ω5P-JUR-04: documentos variam por órgão) — este baseline é o que a UI
// (PR-04) pode OFERTAR ao operador; o create NÃO o aplica automaticamente.
export const FEDERAL_RELEASE_REQUIREMENTS: readonly ReleaseRequirement[] = [
  { code: "OWNER_ID", label: "Documento de identificação de quem retira", required: true },
  { code: "OWNERSHIP_PROOF", label: "Comprovante de propriedade / autorização do proprietário", required: true },
  { code: "DEBTS_SETTLED", label: "Quitação de multas, taxas de remoção e estada (ou dispensa fundamentada)", required: true },
  { code: "AUTHORITY_RELEASE", label: "Autorização de liberação do órgão/autoridade solicitante", required: true },
];

export type ResolvedDefaults = {
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
  readonly auctionEligibleDay: number;
  readonly auctionEdictBusinessDays: number;
  readonly dailyModel: DailyModel;
  readonly dailyCap: DailyCap;
};

// resolveDefaults(scope): defaults para pré-preencher um perfil NOVO daquele scope (o que o create aplica quando o
// cliente omite um campo).
//   PUBLIC_AGREEMENT  -> FEDERAL_DEFAULTS inalterado (regime estrito: teto 6 meses, rolling-24h, 10/30/60/15).
//   PRIVATE_CONTRACT  -> dailyCap UNLIMITED (custódia privada não incorre no teto de estada do CTB; os prazos
//                        federais seguem como referência — o pátio privado tipicamente não roda o leilão
//                        administrativo do art. 328). D-Ω5P-JUR-02.
export function resolveDefaults(scope: ProfileScope): ResolvedDefaults {
  if (scope === "PRIVATE_CONTRACT") {
    return { ...FEDERAL_DEFAULTS, dailyCap: "UNLIMITED" };
  }
  return { ...FEDERAL_DEFAULTS };
}
