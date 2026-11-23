import type { DailyCap, DailyModel } from "../jurisdiction/jurisdiction.types.js";

// Ω5P PR-07 — MOTOR DE DIÁRIAS (I4), formalização do ESTUDO §5. Função PURA (zero I/O, testável por DI):
//
//   n_diárias(asOf) = min( count(model, t0, asOf) , cap(perfil, t0) )
//
// DST-SAFE SEM LIB NOVA (dependência ZERO): a aritmética de calendário usa Intl.DateTimeFormat({timeZone}) — o
// ICU embutido no Node. Uma lib de data exigiria junta-5.
//   ROLLING_24H (federal, Res. 1025 art. 21 §1º): tempo FÍSICO ABSOLUTO — 24h são 24h em ms, imunes a DST por
//     definição. A diária N vence em t0 + N·24h; devidas = floor((asOf − t0)/24h) (convenção-piso do §5:
//     nada devido em [t0, t0+24h); 1ª vence em t0+24h — D-Ω5P-CHG-06).
//   CALENDAR (contratual): nº de DATAS-LOCAIS distintas do pátio em [t0, asOf] (entra 23:30 → 00:10 = 2 datas).
//     DST-safe extraindo Y-M-D locais via Intl.
// Teto (I4/RN-DIA-02) pela DATA DE ENTRADA via process.regime.dailyCap (regime intertemporal, ESTUDO §2.3):
//   SIX_MONTHS (CTB 271 §10 / 328 §5º): cap = count(model, t0, t0+6meses-de-calendário-no-TZ). Acumulação PARA.
//   THIRTY_DAYS_LEGACY (Tema 124/STJ): cap = 30 (fixo).
//   UNLIMITED (privado): sem teto.
// Congelamento (RN-DIA-04): asOf = min(now, frozen_at) — passado pelo chamador.

const MS_PER_DAY = 86_400_000;

export type LocalWallClock = {
  readonly year: number;
  readonly month: number; // 1-based
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

export type AccrualParams = {
  readonly t0: Date; // entered_at
  readonly asOf: Date; // min(now, frozen_at)
  readonly timezone: string; // yard.timezone
  readonly model: DailyModel;
  readonly cap: DailyCap;
  readonly suspensions: readonly AccrualSuspension[];
};

// Um intervalo em que a diária NÃO corre (leilão / legado congelado). `to` ausente = aberto até agora.
export type AccrualSuspension = {
  readonly from: Date;
  readonly to?: Date;
};

// Um período de diária DEVIDO: ordinal (chave de idempotência DST-imune) + legenda de data local + o instante
// representativo p/ resolver a tarifa vigente NAQUELA data (F1 do PR-03: date=asOf da resolução).
export type DuePeriod = {
  readonly periodSeq: number; // 1-based
  readonly refDate: string; // "YYYY-MM-DD" (data-local-do-pátio)
  readonly refInstant: Date; // instante representativo p/ resolveTariff
};

export type AccrualSummary = {
  readonly nDue: number; // devidas pelo tempo decorrido (sem teto)
  readonly capCount: number | null; // teto em diárias (null = ilimitado)
  readonly nAccrue: number; // min(nDue, cap) — o que efetivamente acumula
  readonly capReached: boolean;
};

// ── Intl helpers (DST-safe, dependência ZERO) ──────────────────────────────────────────────────────────────
const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let dtf = partsCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsCache.set(timeZone, dtf);
  }
  return dtf;
}

// Relógio de parede LOCAL de um instante no fuso dado.
export function localWallClock(instant: Date, timeZone: string): LocalWallClock {
  const parts = formatter(timeZone).formatToParts(instant);
  const pick = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? "0");
  let hour = pick("hour");
  if (hour === 24) hour = 0; // normaliza o "24:00" de alguns ICU
  return { year: pick("year"), month: pick("month"), day: pick("day"), hour, minute: pick("minute"), second: pick("second") };
}

// Data local "YYYY-MM-DD" de um instante no fuso.
function localDateStr(instant: Date, timeZone: string): string {
  const w = localWallClock(instant, timeZone);
  return `${pad4(w.year)}-${pad2(w.month)}-${pad2(w.day)}`;
}

// Offset do fuso (ms) num instante = (parede-como-UTC) − instante.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const w = localWallClock(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - instant.getTime();
}

// Converte um relógio-de-parede LOCAL (no fuso) para o instante UTC. Passo de correção único (suficiente p/ o
// teto de 6 meses e o meio-dia do CALENDAR — 1h de wobble de DST na fronteira é imaterial p/ contagem de diárias).
function zonedWallToUtc(w: LocalWallClock, timeZone: string): Date {
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  let offset = tzOffsetMs(new Date(asUtc), timeZone);
  let utc = asUtc - offset;
  offset = tzOffsetMs(new Date(utc), timeZone);
  utc = asUtc - offset;
  return new Date(utc);
}

// ── Aritmética de DATA-ONLY (proléptica, TZ-independente — sem DST) ─────────────────────────────────────────
function dateStrToUtcMidnight(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcMidnightToDateStr(ms: number): string {
  const dt = new Date(ms);
  return `${pad4(dt.getUTCFullYear())}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  return utcMidnightToDateStr(dateStrToUtcMidnight(dateStr) + days * MS_PER_DAY);
}

function daysBetweenDateStr(from: string, to: string): number {
  return Math.round((dateStrToUtcMidnight(to) - dateStrToUtcMidnight(from)) / MS_PER_DAY);
}

// ── Contagem por modelo ─────────────────────────────────────────────────────────────────────────────────────
// Soma da interseção de cada intervalo de suspensão com [t0, asOf] (ms). Intervalo aberto usa asOf como fim.
function suspendedOverlapMs(suspensions: readonly AccrualSuspension[], t0: Date, asOf: Date): number {
  let total = 0;
  const start = t0.getTime();
  const end = asOf.getTime();
  for (const suspension of suspensions) {
    const from = Math.max(suspension.from.getTime(), start);
    const to = Math.min(suspension.to?.getTime() ?? end, end);
    if (to > from) total += to - from;
  }
  return total;
}

function rollingCount(params: AccrualParams): number {
  const delta = params.asOf.getTime() - params.t0.getTime();
  if (delta <= 0) return 0;
  const suspendedMs = suspendedOverlapMs(params.suspensions, params.t0, params.asOf);
  const effective = delta - suspendedMs;
  return effective <= 0 ? 0 : Math.floor(effective / MS_PER_DAY);
}

// Datas locais inteiramente suspensas (fechadas: estritamente entre from e to; abertas: todas depois de from).
function suspendedLocalDates(params: AccrualParams): Set<string> {
  const { suspensions, asOf, timezone } = params;
  const start = localDateStr(params.t0, timezone);
  const end = localDateStr(asOf, timezone);
  const suspended = new Set<string>();
  for (const suspension of suspensions) {
    let fromDate = localDateStr(suspension.from, timezone);
    if (fromDate < start) fromDate = start;
    if (suspension.to) {
      let toDate = localDateStr(suspension.to, timezone);
      if (toDate > end) toDate = end;
      const between = daysBetweenDateStr(fromDate, toDate) - 1; // estritamente entre: os dias de ida e volta cobram
      for (let d = 1; d <= between; d += 1) suspended.add(addDaysToDateStr(fromDate, d));
    } else {
      const after = daysBetweenDateStr(fromDate, end); // todas depois do dia de ida (inclusive o fim do período)
      for (let d = 1; d <= after; d += 1) suspended.add(addDaysToDateStr(fromDate, d));
    }
  }
  return suspended;
}

function fullySuspendedDates(params: AccrualParams): number {
  return suspendedLocalDates(params).size;
}

function calendarCount(params: AccrualParams): number {
  if (params.asOf.getTime() <= params.t0.getTime()) return 0;
  const start = localDateStr(params.t0, params.timezone);
  const end = localDateStr(params.asOf, params.timezone);
  const totalDates = daysBetweenDateStr(start, end) + 1; // datas locais distintas em [t0, asOf], inclusivo
  const chargedDates = totalDates - fullySuspendedDates(params);
  return chargedDates;
}

function countDue(params: AccrualParams): number {
  return params.model === "ROLLING_24H"
    ? rollingCount(params)
    : calendarCount(params);
}

// Teto em diárias pela DATA DE ENTRADA. 180 para tudo, exceto o legado de 30 (D-DONO-2311-DIARIA-AUDIO, P13 "para tudo").
const DAILY_CAP_DAYS = 180;

function capCountFor(params: AccrualParams): number | null {
  if (params.cap === "THIRTY_DAYS_LEGACY") return 30;
  return DAILY_CAP_DAYS;
}

// Instante real em que o relógio fora-do-leilão marca outOfAuctionMs (soma as suspensões já atravessadas).
function instantForRollingPeriod(outOfAuctionMs: number, params: AccrualParams): Date {
  let instant = params.t0.getTime() + outOfAuctionMs;
  for (const suspension of params.suspensions) {
    const from = suspension.from.getTime();
    if (from > instant) continue;
    const to = suspension.to?.getTime() ?? params.asOf.getTime();
    const duration = to - from;
    if (duration > 0) instant += duration;
  }
  return new Date(instant);
}

// Instante/legenda representativos do período N.
function periodFor(n: number, params: AccrualParams): DuePeriod {
  if (params.model === "ROLLING_24H") {
    // Diária N nasce no instante em que o relógio fora-do-leilão marca (N-1)·24h; a suspensão empurra esse instante.
    const refInstant = instantForRollingPeriod((n - 1) * MS_PER_DAY, params);
    return { periodSeq: n, refDate: localDateStr(refInstant, params.timezone), refInstant };
  }
  // CALENDAR: N-ésima data local COBRADA (pula as datas inteiramente suspensas); instante = meio-dia local.
  const suspended = suspendedLocalDates(params);
  const startStr = localDateStr(params.t0, params.timezone);
  let refDate = startStr;
  let charged = 0;
  for (let cursor = startStr; ; cursor = addDaysToDateStr(cursor, 1)) {
    if (!suspended.has(cursor)) {
      charged += 1;
      if (charged === n) {
        refDate = cursor;
        break;
      }
    }
  }
  const [year, month, day] = refDate.split("-").map(Number);
  const refInstant = zonedWallToUtc({ year, month, day, hour: 12, minute: 0, second: 0 }, params.timezone);
  return { periodSeq: n, refDate, refInstant };
}

// ── API do motor ────────────────────────────────────────────────────────────────────────────────────────────
export function summarizeAccrual(params: AccrualParams): AccrualSummary {
  const nDue = countDue(params);
  const capCount = capCountFor(params);
  const nAccrue = capCount === null ? nDue : Math.min(nDue, capCount);
  return { nDue, capCount, nAccrue, capReached: capCount !== null && nDue >= capCount };
}

// Lista ORDENADA dos períodos devidos [1..nAccrue] com legenda de data + instante de resolução de tarifa.
// PURA e determinística: re-run com o mesmo asOf devolve o mesmo conjunto (idempotência à montante do repo).
export function computeDuePeriods(params: AccrualParams): readonly DuePeriod[] {
  const { nAccrue } = summarizeAccrual(params);
  const periods: DuePeriod[] = [];
  for (let n = 1; n <= nAccrue; n += 1) {
    periods.push(periodFor(n, params));
  }
  return periods;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function pad4(value: number): string {
  return String(value).padStart(4, "0");
}
