const SP_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export function businessDateAtRequest(now: () => Date = () => new Date()): () => string {
  return () => SP_DATE.format(now());
}
