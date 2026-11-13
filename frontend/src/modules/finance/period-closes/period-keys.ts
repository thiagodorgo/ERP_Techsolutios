// B-SAN3-24 (24b, R-COMPETENCIA-SP — A-09 da crítica r1) — a competência (`AAAA-MM`) de um instante, no FUSO DE NEGÓCIO,
// exatamente como o servidor (`src/config/business-time.ts`, `deriveCompetencia`): nunca o fuso do navegador nem UTC.
// Um lançamento às 23h de 30/06 em São Paulo (02h de 01/07 em UTC) é de junho. O rótulo `MM/AAAA` sai da chave.
// R-E2E-JWT: só TypeScript puro.

const COMPETENCIA_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
});

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** `AAAA-MM` do instante no fuso de negócio (America/Sao_Paulo). */
export function toPeriodKey(instant: Date): string {
  const parts = COMPETENCIA_FORMAT.formatToParts(instant);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

const KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isPeriodKey(value: string): boolean {
  return KEY.test(value);
}

/** `2026-07` → `07/2026`. */
export function periodLabel(key: string): string {
  const match = KEY.exec(key);
  return match ? `${match[2]}/${match[1]}` : key;
}

/** `2026-07` → `Julho/2026`. */
export function periodName(key: string): string {
  const match = KEY.exec(key);
  return match ? `${MONTHS[Number(match[2]) - 1]}/${match[1]}` : key;
}

/** `2026-07` → `Julho` (só o mês). */
export function periodMonthName(key: string): string {
  const match = KEY.exec(key);
  return match ? MONTHS[Number(match[2]) - 1] : key;
}

/** A competência anterior (`2026-01` → `2025-12`). */
export function previousPeriodKey(key: string): string {
  const match = KEY.exec(key);
  if (!match) return key;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

/** As `count` competências terminando em `last`, da mais recente para a mais antiga. */
export function recentPeriodKeys(last: string, count: number): string[] {
  const out: string[] = [];
  let key = last;
  for (let index = 0; index < count; index++) {
    out.push(key);
    key = previousPeriodKey(key);
  }
  return out;
}
