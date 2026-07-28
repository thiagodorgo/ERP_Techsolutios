import { formatMoney } from "../charges/charges.adapter";
import type { ImpoundStatus, ProcessListItem } from "../processes/processes.types";
import type {
  AuctionAttemptDto,
  AuctionClassification,
  AuctionEdictDto,
  AuctionEdictStatus,
  AuctionOutcome,
  AuctionStage,
  AuctionView,
  ScrapGatePrecondition,
} from "./auction.types";

export { formatMoney };

type ChipTone = "default" | "success" | "warning" | "danger" | "info" | "pending" | "audit";

// Piso federal do edital do leilão (Lei 14.133/2021 — >=15 dias úteis). ESPELHO de AUCTION_EDICT_MIN_BUSINESS_DAYS
// (src/modules/auction/auction.repository.ts) — usado só como HINT do gate de sucata; o backend re-verifica.
export const AUCTION_EDICT_MIN_BUSINESS_DAYS = 15;

// Rótulos PT-BR de FALLBACK (o backend já devolve *Label; a UI reusa e só cai aqui se ausente). White-label.
const OUTCOME_LABELS: Record<AuctionOutcome, string> = {
  DESERTED: "Leilão deserto",
  SOLD: "Arrematado",
  NO_PAYMENT: "Arrematante inadimplente",
};

const CLASSIFICATION_LABELS: Record<AuctionClassification, string> = {
  CONSERVED: "Conservado",
  SCRAP: "Sucata",
  UNRECOVERABLE: "Inservível",
};

const EDICT_STATUS_LABELS: Record<AuctionEdictStatus, string> = {
  DESIGNATED: "Designado",
  LOTTED: "Lotado",
  CLOSED: "Encerrado",
};

export function getOutcomeLabel(outcome: AuctionOutcome | string | null | undefined): string {
  return OUTCOME_LABELS[(outcome ?? "DESERTED") as AuctionOutcome] ?? "Rodada";
}

export function getClassificationLabel(classification: AuctionClassification | string | null | undefined): string {
  if (!classification) return "—";
  return CLASSIFICATION_LABELS[classification as AuctionClassification] ?? "—";
}

export function getEdictStatusLabel(status: AuctionEdictStatus | string | null | undefined): string {
  return EDICT_STATUS_LABELS[(status ?? "DESIGNATED") as AuctionEdictStatus] ?? "Designado";
}

// §11 — tom semântico do resultado da rodada: arrematado=verde, deserto=âmbar, inadimplente=vermelho.
export function getOutcomeTone(outcome: AuctionOutcome): ChipTone {
  if (outcome === "SOLD") return "success";
  if (outcome === "NO_PAYMENT") return "danger";
  return "warning";
}

export function getEdictStatusTone(status: AuctionEdictStatus): ChipTone {
  if (status === "LOTTED") return "info";
  if (status === "CLOSED") return "default";
  return "warning";
}

// ── reason 409/403/404 → PT-BR (white-label) ────────────────────────────────────────────────────────────────
// O `reason` vem do corpo do erro do backend ({ error:{ code, reason } }). Cobre TODOS os reasons DISTINTOS das
// guardas de leilão (impound.transitions.ts: eligibility×6 / scrap×3 / unrecoverable / prep×2 / lot×2 / sale×6 /
// close / default / reclaim) + os AuctionError do serviço (auction_not_eligible / auction_edict_missing / valores
// inválidos). NUNCA vaza corpo cru nem cai no genérico para um reason conhecido.
export function auctionActionErrorMessage(reason: string | null | undefined, status?: number): string {
  switch (reason) {
    // Elegibilidade ao leilão (ACTIVE_CUSTODY→AUCTION_ELIGIBLE) — 6 reasons DISTINTOS.
    case "auction_scope_not_public":
      return "Somente pátios sob convênio público conduzem o leilão administrativo (art. 328).";
    case "auction_deadline_not_reached":
      return "O prazo de elegibilidade ao leilão (a partir de 60 dias da entrada, art. 328) ainda não foi atingido.";
    case "auction_notification_trail_incomplete":
      return "A trilha de notificações legais precisa estar completa antes do leilão.";
    case "auction_owner_initial_missing":
      return "A notificação inicial ao proprietário precisa ter sido emitida (ou dispensada) antes do leilão.";
    case "auction_chain_broken":
      return "A cadeia de integridade da custódia precisa verificar antes de prosseguir no leilão.";
    case "auction_release_in_progress":
      return "Há uma liberação em andamento; o veículo não pode tornar-se elegível a leilão.";
    // Reciclagem por 2 strikes edital-backed (sucata IRREVERSÍVEL) — 3 reasons DISTINTOS.
    case "scrap_strikes_insufficient":
      return "A reciclagem a sucata exige todas as rodadas do certame desertas (art. 328).";
    case "scrap_edict_missing_for_round":
      return "Cada rodada deserta precisa de um edital registrado antes da reciclagem a sucata.";
    case "scrap_edict_incomplete_for_round":
      return "Cada edital que embasa a sucata precisa estar completo (referência, publicação e prazo de 15 dias úteis).";
    // Reciclagem por inservibilidade (§§16-18).
    case "scrap_classification_required":
      return "A reciclagem direta exige a classificação do bem como sucata ou inservível (§§16-18).";
    case "recycling_release_in_progress":
      return "Há uma liberação em andamento; o veículo não pode ir para reciclagem direta.";
    // Preparo do certame.
    case "prep_classification_not_conserved":
      return "A preparação do leilão exige um edital com classificação Conservado (art. 328).";
    case "prep_appraisal_missing":
      return "A preparação do leilão exige a avaliação registrada por perfil habilitado (art. 28).";
    // Lote do certame.
    case "lot_edict_incomplete":
      return "O loteamento exige um edital completo da rodada (referência, publicação e prazo de 15 dias úteis).";
    case "lot_min_bid_missing":
      return "O loteamento exige o lance mínimo registrado por perfil habilitado (art. 28).";
    // Arremate (LOTTED→AUCTIONED) — 6 reasons DISTINTOS.
    case "sale_winner_missing":
      return "Informe a referência do arrematante para registrar o arremate.";
    case "sale_round_not_lotted":
      return "Só a rodada atualmente lotada pode ser arrematada.";
    case "sale_round_not_conserved":
      return "A rodada arrematada precisa ser Conservado (lote de sucata/inservível nunca é vendido).";
    case "sale_round_edict_incomplete":
      return "O edital da rodada arrematada precisa estar completo (referência, publicação e prazo de 15 dias úteis).";
    case "sale_below_min_bid":
      return "O valor arrematado precisa ser ao menos o lance mínimo da rodada lotada (art. 328).";
    case "sale_note_missing":
      return "Informe a referência da nota do leilão (art. 34) para registrar o arremate.";
    // Consumação / inadimplência / reclamado.
    case "close_payment_unconfirmed":
      return "A consumação exige a confirmação do pagamento e da nota (art. 34).";
    case "default_sale_missing":
      return "A reintegração por inadimplência exige um arremate registrado para inadimplir (art. 42).";
    case "reason_required":
      return "Informe o fundamento do ato para concluir esta ação.";
    // AuctionError do serviço.
    case "auction_not_eligible":
      return "Só um processo elegível a leilão pode registrar uma rodada do certame.";
    case "auction_edict_missing":
      return "Registre o edital desta rodada antes de lançar uma rodada deserta.";
    // Valores inválidos (avaliação/lance/arremate).
    case "appraisal_amount_invalid":
    case "min_bid_amount_invalid":
    case "sold_amount_invalid":
      return "Informe um valor válido (número não negativo, com até duas casas decimais).";
    case "round_number_required":
    case "round_number_invalid":
      return "Informe uma rodada válida (número inteiro a partir de 1).";
    case "edict_reference_required":
      return "Informe a referência do edital (uma designação real, não uma rodada vazia).";
    case "classification_invalid":
      return "Classificação inválida. Escolha Conservado, Sucata ou Inservível.";
    // Defensivos da FSM/gate.
    case "auction_gate_unresolved":
      return "Não foi possível validar as pré-condições do leilão. Recarregue o dossiê e tente novamente.";
    case "invalid_transition":
      return "Ação inválida a partir do estado atual do processo.";
    case "transition_not_enabled_yet":
      return "Ação ainda não disponível nesta versão.";
    case "process_not_found":
      return "Processo de custódia não encontrado.";
    default:
      if (status === 401 || status === 403) return "Sessão expirada ou sem permissão para conduzir o leilão.";
      if (status === 404) return "Recurso do leilão não encontrado. Recarregue o dossiê.";
      if (status === 409) return "O estado do processo mudou. Recarregue o dossiê e tente novamente.";
      return "Não foi possível concluir a ação do leilão.";
  }
}

// ── Estágio do painel (PURO) — orquestra a UI por process.status (espelha resolveReleaseStage) ────────────────
export function resolveAuctionStage(status: ImpoundStatus): AuctionStage {
  switch (status) {
    case "ACTIVE_CUSTODY":
      return "custody";
    case "AUCTION_ELIGIBLE":
      return "eligible";
    case "AUCTION_PREP":
      return "prep";
    case "LOTTED":
      return "lotted";
    case "AUCTIONED":
      return "auctioned";
    case "AUCTION_CLOSED":
      return "closed";
    case "DIRECT_RECYCLING":
      return "recycling";
    default:
      return "unavailable";
  }
}

// ── Gate de sucata (ESPELHO client-side de evaluateScrapEdictGate + isEdictComplete) ─────────────────────────
// As 3 pré-condições DERIVÁVEIS: rodadas 1..maxAttempts todas com strike DESERTED + edital presente por rodada +
// edital completo (ref + published_at + business_days >= 15). É HINT: mostra ao operador O QUE FALTA. O backend
// RE-VERIFICA sob lock (anti-TOCTOU) + a cadeia I2 e é a AUTORIDADE (409 → PT-BR + recarrega).
export function isEdictComplete(edict: AuctionEdictDto): boolean {
  return (
    typeof edict.edictReference === "string" &&
    edict.edictReference.trim().length > 0 &&
    Boolean(edict.publishedAt) &&
    typeof edict.businessDays === "number" &&
    edict.businessDays >= AUCTION_EDICT_MIN_BUSINESS_DAYS
  );
}

export function deriveScrapGate(view: AuctionView): ScrapGatePrecondition[] {
  const desertedRounds = new Set(view.attempts.filter((a) => a.outcome === "DESERTED").map((a) => a.roundNumber));
  const edictByRound = new Map(view.edicts.map((edict) => [edict.roundNumber, edict] as const));
  const required = Array.from({ length: Math.max(view.maxAttempts, 0) }, (_, index) => index + 1); // 1..maxAttempts

  const strikesInsufficient = required.some((round) => !desertedRounds.has(round));
  const edictMissing = required.some((round) => desertedRounds.has(round) && !edictByRound.has(round));
  const edictIncomplete = required.some((round) => {
    const edict = edictByRound.get(round);
    return desertedRounds.has(round) && edict !== undefined && !isEdictComplete(edict);
  });

  return [
    {
      key: "strikes_insufficient",
      label: `Rodadas desertas (${desertedRounds.size}/${view.maxAttempts})`,
      detail: strikesInsufficient
        ? `Registre uma rodada deserta para cada uma das ${view.maxAttempts} rodadas do certame.`
        : "Todas as rodadas do certame foram registradas como desertas.",
      satisfied: !strikesInsufficient,
    },
    {
      key: "edict_missing",
      label: "Edital por rodada",
      detail: edictMissing
        ? "Cada rodada deserta precisa de um edital registrado (comprovação do certame real)."
        : "Cada rodada deserta tem um edital registrado.",
      satisfied: !edictMissing,
    },
    {
      key: "edict_incomplete",
      label: "Editais completos (15 dias úteis)",
      detail: edictIncomplete
        ? "Complete referência, data de publicação e prazo de 15 dias úteis em cada edital."
        : "Os editais que embasam a sucata estão completos.",
      satisfied: !edictIncomplete,
    },
  ];
}

// Predicado PURO de habilitação do "Reciclar a sucata" — só habilita com as 3 pré-condições derivadas satisfeitas
// (defense-in-depth: o backend re-checa sob lock, inclusive a cadeia I2, e devolve 409 com o reason real). É uma
// ação IRREVERSÍVEL (a sucata destrói patrimônio de 3º) → a UI exige confirmação explícita.
export function isScrapGateSatisfied(preconditions: readonly ScrapGatePrecondition[]): boolean {
  return preconditions.length > 0 && preconditions.every((precondition) => precondition.satisfied);
}

export function pendingScrapCount(preconditions: readonly ScrapGatePrecondition[]): number {
  return preconditions.filter((precondition) => !precondition.satisfied).length;
}

// ── Funil /patios/leiloes ────────────────────────────────────────────────────────────────────────────────────
// Os 6 estados de leilão do funil (ordem do rito). SEM endpoint novo: GET /impound-processes já traz o status; o
// agrupamento/filtro é CLIENT-SIDE (sem N+1 — NUNCA chama .../auction nem .../settlement por linha).
export type AuctionFunnelStage = { readonly status: ImpoundStatus; readonly label: string; readonly tone: ChipTone };

export const AUCTION_FUNNEL_STAGES: readonly AuctionFunnelStage[] = [
  { status: "AUCTION_ELIGIBLE", label: "Elegíveis", tone: "warning" },
  { status: "AUCTION_PREP", label: "Em preparação", tone: "warning" },
  { status: "LOTTED", label: "Loteados", tone: "warning" },
  { status: "AUCTIONED", label: "Arrematados", tone: "warning" },
  { status: "AUCTION_CLOSED", label: "Encerrados", tone: "default" },
  { status: "DIRECT_RECYCLING", label: "Reciclagem", tone: "danger" },
];

export const AUCTION_FUNNEL_STATUSES: readonly ImpoundStatus[] = AUCTION_FUNNEL_STAGES.map((stage) => stage.status);

// Universo do funil = os 6 estados de leilão; stage "all" mantém todos, senão restringe ao estado clicado.
export function filterAuctionProcesses(items: readonly ProcessListItem[], stage: ImpoundStatus | "all"): ProcessListItem[] {
  const universe = new Set<ImpoundStatus>(AUCTION_FUNNEL_STATUSES);
  return items.filter((item) => universe.has(item.status) && (stage === "all" || item.status === stage));
}

export function countAuctionStages(items: readonly ProcessListItem[]): Record<ImpoundStatus, number> {
  const counts = Object.fromEntries(AUCTION_FUNNEL_STATUSES.map((status) => [status, 0])) as Record<ImpoundStatus, number>;
  for (const item of items) {
    if (item.status in counts) counts[item.status] += 1;
  }
  return counts;
}

// ── Adapters de resposta (camelCase do backend; robusto a snake_case) ────────────────────────────────────────
export function adaptAuctionView(response: unknown): AuctionView | null {
  const payload = readRecord(response);
  if (!payload) return null;
  const dataRecord = readRecord(payload.data) ?? payload;
  const status = readString(dataRecord, ["status"]) as ImpoundStatus | undefined;
  if (!status) return null;
  const strikeCount = readNumber(dataRecord, ["strikeCount", "strike_count"]) ?? 0;
  const maxAttempts = readNumber(dataRecord, ["maxAttempts", "max_attempts"]) ?? 0;
  const strikesRemaining = readNumber(dataRecord, ["strikesRemaining", "strikes_remaining"]) ?? Math.max(maxAttempts - strikeCount, 0);
  const attempts = (readArray(payload.attempts) ?? [])
    .map((item) => adaptAttempt(item))
    .filter((item): item is AuctionAttemptDto => Boolean(item));
  const edicts = (readArray(payload.edicts) ?? [])
    .map((item) => adaptEdict(item))
    .filter((item): item is AuctionEdictDto => Boolean(item));
  return { status, strikeCount, maxAttempts, strikesRemaining, attempts, edicts };
}

function adaptEdict(input: unknown): AuctionEdictDto | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  if (!id) return null;
  const classification = (readString(item, ["classification"]) ?? null) as AuctionClassification | null;
  const status = (readString(item, ["status"]) ?? "DESIGNATED") as AuctionEdictStatus;
  // SIGILO art. 28 — os valores só entram no DTO de quem tem auction:appraise. Detecta a PRESENÇA das chaves
  // (não o valor): se ausentes, o ator NÃO pode ver a avaliação → a UI nunca as renderiza.
  const canSeeAppraisal = "appraisalAmount" in item || "minBidAmount" in item || "appraisal_amount" in item || "min_bid_amount" in item;
  return {
    id,
    processId: readString(item, ["processId", "process_id"]) ?? "",
    roundNumber: readNumber(item, ["roundNumber", "round_number"]) ?? 0,
    classification,
    classificationLabel: readString(item, ["classificationLabel"]) ?? (classification ? getClassificationLabel(classification) : null),
    edictReference: readString(item, ["edictReference", "edict_reference"]) ?? null,
    edictPlatform: readString(item, ["edictPlatform", "edict_platform"]) ?? null,
    publishedAt: readString(item, ["publishedAt", "published_at"]) ?? null,
    auctioneerRef: readString(item, ["auctioneerRef", "auctioneer_ref"]) ?? null,
    pncpUrl: readString(item, ["pncpUrl", "pncp_url"]) ?? null,
    businessDays: readNumber(item, ["businessDays", "business_days"]) ?? null,
    canSeeAppraisal,
    appraisalAmount: canSeeAppraisal ? readString(item, ["appraisalAmount", "appraisal_amount"]) ?? null : null,
    minBidAmount: canSeeAppraisal ? readString(item, ["minBidAmount", "min_bid_amount"]) ?? null : null,
    status,
    statusLabel: readString(item, ["statusLabel"]) ?? getEdictStatusLabel(status),
    notes: readString(item, ["notes"]) ?? null,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? new Date().toISOString(),
  };
}

function adaptAttempt(input: unknown): AuctionAttemptDto | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  if (!id) return null;
  const outcome = (readString(item, ["outcome"]) ?? "DESERTED") as AuctionOutcome;
  return {
    id,
    processId: readString(item, ["processId", "process_id"]) ?? "",
    roundNumber: readNumber(item, ["roundNumber", "round_number"]) ?? 0,
    outcome,
    outcomeLabel: readString(item, ["outcomeLabel"]) ?? getOutcomeLabel(outcome),
    notes: readString(item, ["notes"]) ?? null,
    winnerRef: readString(item, ["winnerRef", "winner_ref"]) ?? null,
    soldAmount: readString(item, ["soldAmount", "sold_amount"]) ?? null,
    saleNoteReference: readString(item, ["saleNoteReference", "sale_note_reference"]) ?? null,
    defaultedSaleRound: readNumber(item, ["defaultedSaleRound", "defaulted_sale_round"]) ?? null,
    // §2.8 — recordedBy é UUID de ator interno: NÃO adaptado/renderizado (suprimido por design).
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? new Date().toISOString(),
  };
}

// Linha unificada por rodada (join edital × resultado) p/ a tabela de rodadas do painel de estado.
export type AuctionRoundRow = {
  readonly roundNumber: number;
  readonly edict: AuctionEdictDto | null;
  readonly attempt: AuctionAttemptDto | null;
};

export function buildRoundRows(view: AuctionView): AuctionRoundRow[] {
  const rounds = new Set<number>();
  for (const edict of view.edicts) rounds.add(edict.roundNumber);
  for (const attempt of view.attempts) rounds.add(attempt.roundNumber);
  return [...rounds]
    .sort((a, b) => a - b)
    .map((roundNumber) => ({
      roundNumber,
      edict: view.edicts.find((edict) => edict.roundNumber === roundNumber) ?? null,
      // Última tentativa da rodada (append-only; a mais recente reflete o resultado corrente).
      attempt: [...view.attempts].reverse().find((attempt) => attempt.roundNumber === roundNumber) ?? null,
    }));
}

// Rodada default sugerida para uma ação por estágio (o edital de maior rodada; a lotada p/ o arremate/consumação).
export function defaultRoundForStage(view: AuctionView, stage: AuctionStage): number {
  if (stage === "lotted" || stage === "auctioned" || stage === "closed") {
    const lotted = view.edicts.find((edict) => edict.status === "LOTTED");
    if (lotted) return lotted.roundNumber;
  }
  const maxEdictRound = view.edicts.reduce((max, edict) => Math.max(max, edict.roundNumber), 0);
  if (maxEdictRound > 0) return maxEdictRound;
  return view.strikeCount + 1; // próxima rodada a designar (elegível sem editais ainda)
}

function readArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readString(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(input: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
