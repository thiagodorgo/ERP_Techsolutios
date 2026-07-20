// Fuso de negócio (P-Ω4-COMPETENCIA-TZ). A competência 'YYYY-MM' e o parse de datas contábeis
// (issue_date/occurred_at) são ancorados AQUI, no fuso do Brasil — nunca em UTC. Isso alimenta a
// trava retroativa do Ω4-6 (chokepoint assertPeriodOpen) e o relatório financeiro: um título/lançamento
// de fim de mês em horário BR precisa cair no MÊS BRASILEIRO, não no mês UTC.
//
// PREMISSA UTC-3 FIXA: o Brasil não tem horário de verão desde 2019, então America/Sao_Paulo resolve
// para UTC-3 o ano todo. Mantemos o nome IANA (não "-03:00" cru) para deriveCompetencia acompanhar
// automaticamente caso o DST volte. Ressalva: se o DST voltar, uma data date-only na virada do dia
// PERTO da transição de DST pode variar 1h no offset fixo abaixo (parseBusinessDate) — aceitável no v1.
export const BUSINESS_TIMEZONE = "America/Sao_Paulo";

// Offset fixo do horário-padrão do Brasil (UTC-3), usado só para ANCORAR uma data date-only à meia-noite
// BR-local (ver parseBusinessDate). deriveCompetencia NÃO usa isto — formata pelo fuso IANA via Intl.
const BUSINESS_UTC_OFFSET = "-03:00";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Datetime SEM fuso (sem Z e sem ±hh:mm) — ex. "2026-08-01T01:00" ou "…T01:00:30.500".
const NAIVE_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/;

// competência 'YYYY-MM' DERIVADA de um INSTANTE, formatada no FUSO DE NEGÓCIO (não em UTC).
// Ex.: 2026-08-01T02:00:00Z (= 31/07 23h BRT) → "2026-07"; 2026-07-01T02:00:00Z (= 30/06 23h BRT) → "2026-06".
// en-CA garante o formato ISO (year-month) estável e independente de locale do runtime.
export function deriveCompetencia(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(instant);
  const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}`;
}

// Data civil (YYYY-MM-DD) DERIVADA de um INSTANTE, formatada no FUSO DE NEGÓCIO (não em UTC) — irmã diária de
// deriveCompetencia (mesmo Intl/BUSINESS_TIMEZONE, só com o dia). Usada p/ o bucketing diário do agregado de
// série temporal de OS e p/ o round-trip que barra dia fora de range em parseBusinessDate.
// Ex.: 2026-08-01T02:00:00Z (= 31/07 23h BRT) → "2026-07-31".
export function deriveBusinessDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

// Parse de data contábil (issue_date/occurred_at) ANCORADO ao fuso de negócio. Helper compartilhado
// pelos validadores de Título e Lançamento (só a MENSAGEM de erro difere → o caller valida o retorno):
//   - ausente/vazio  → server now (instante real);
//   - date-only "YYYY-MM-DD" → MEIA-NOITE BR-LOCAL (…T00:00:00-03:00), para NÃO cruzar a fronteira do
//     dia ao derivar a competência (parse naïve como UTC-midnight jogaria fim-de-mês BR no mês seguinte);
//   - datetime SEM fuso ("…T01:00") → BR-LOCAL (determinístico; senão o Date usaria o fuso do SERVIDOR);
//   - datetime com Z/offset → parseado COMO ESTÁ (o offset embutido é a autoridade).
// **Round-trip (P-Ω4-COMPETENCIA-TZ, caso d):** um date-only com dia fora de range (2026-06-31, 2026-02-30,
// 2026-02-29 não-bissexto) passa no regex mas o JS ROLA silenciosamente para o mês seguinte — o que
// misclassificaria a competência num mês adjacente (fura/bloqueia errado o chokepoint). Validamos que a data
// civil BR do instante ancorado BATE com a string; se não bater, devolvemos Invalid Date → o caller dá 400.
// Retorna um Date que pode ser INVÁLIDO (Number.isNaN(getTime())) — cabe ao caller traduzir no seu erro 400.
export function parseBusinessDate(value: unknown): Date {
  if (value === undefined || value === null || value === "") return new Date();
  if (value instanceof Date) return value;
  const raw = String(value).trim();
  if (DATE_ONLY_PATTERN.test(raw)) {
    const anchored = new Date(`${raw}T00:00:00${BUSINESS_UTC_OFFSET}`);
    if (Number.isNaN(anchored.getTime())) return anchored;
    // dia fora de range rolou para outro mês/dia → rejeita (Invalid Date).
    return deriveBusinessDate(anchored) === raw ? anchored : new Date(Number.NaN);
  }
  if (NAIVE_DATETIME_PATTERN.test(raw)) return new Date(`${raw}${BUSINESS_UTC_OFFSET}`);
  return new Date(raw);
}
