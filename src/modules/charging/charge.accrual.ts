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
// Teto (I4/RN-DIA-02) pela DATA DE ENTRADA via profile.dailyCap (regime intertemporal, ESTUDO §2.3):
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

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

// t0 + N meses de CALENDÁRIO (clamp do dia p/ meses curtos). 6 meses ≠ 180 dias.
function addMonthsLocal(w: LocalWallClock, months: number): LocalWallClock {
  const totalMonths = w.year * 12 + (w.month - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return { year, month, day: Math.min(w.day, daysInMonth(year, month)), hour: w.hour, minute: w.minute, second: w.second };
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
function rollingCount(t0: Date, asOf: Date): number {
  const delta = asOf.getTime() - t0.getTime();
  return delta <= 0 ? 0 : Math.floor(delta / MS_PER_DAY);
}

function calendarCount(t0: Date, asOf: Date, timeZone: string): number {
  if (asOf.getTime() <= t0.getTime()) return 0;
  const start = localDateStr(t0, timeZone);
  const end = localDateStr(asOf, timeZone);
  return daysBetweenDateStr(start, end) + 1; // datas locais distintas em [t0, asOf], inclusivo
}

function countDue(params: AccrualParams): number {
  return params.model === "ROLLING_24H"
    ? rollingCount(params.t0, params.asOf)
    : calendarCount(params.t0, params.asOf, params.timezone);
}

// Teto em diárias pela DATA DE ENTRADA. null = ilimitado.
function capCountFor(params: AccrualParams): number | null {
  if (params.cap === "UNLIMITED") return null;
  if (params.cap === "THIRTY_DAYS_LEGACY") return 30;
  // SIX_MONTHS: capDate = t0 + 6 meses de calendário no TZ; conta as diárias ATÉ ele sob o MESMO modelo.
  const capDate = zonedWallToUtc(addMonthsLocal(localWallClock(params.t0, params.timezone), 6), params.timezone);
  return countDue({ ...params, asOf: capDate });
}

// Instante/legenda representativos do período N.
function periodFor(n: number, params: AccrualParams): DuePeriod {
  if (params.model === "ROLLING_24H") {
    // Diária N cobre [t0+(N-1)·24h, t0+N·24h); legenda = data local do INÍCIO do bloco.
    const refInstant = new Date(params.t0.getTime() + (n - 1) * MS_PER_DAY);
    return { periodSeq: n, refDate: localDateStr(refInstant, params.timezone), refInstant };
  }
  // CALENDAR: N-ésima data local a partir da data de entrada; instante = meio-dia local (DST-inequívoco).
  const startStr = localDateStr(params.t0, params.timezone);
  const refDate = addDaysToDateStr(startStr, n - 1);
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
