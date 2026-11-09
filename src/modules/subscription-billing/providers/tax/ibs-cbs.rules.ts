import { InvoiceProviderError } from "../invoice/invoice-errors.js";
import type { IbsCbsFields } from "../invoice/invoice-provider.port.js";

const NON_SIMPLES_START = "2026-12-01";
const SIMPLES_START = "2027-01-01";
const IBS_CBS_FIELDS = ["cst", "cClassTrib", "indicadorDestinatario", "finalidadeEmissao"] as const;

export function isSimplesRegime(regimeTributario: string): boolean {
  return regimeTributario.trim().toLowerCase() === "simples_nacional";
}

function assertIsoDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new InvoiceProviderError("fiscal_data_incomplete", "Competence date must use YYYY-MM-DD.", { missing: ["competenceDate"] });
  }
}

export function shouldSendIbsCbs(competenceDate: string, regimeTributario: string, configured?: boolean): boolean {
  assertIsoDate(competenceDate);
  if (configured !== undefined) return configured;
  return competenceDate >= (isSimplesRegime(regimeTributario) ? SIMPLES_START : NON_SIMPLES_START);
}

export function ibsCbsPayloadFor(input: {
  readonly competenceDate: string;
  readonly regimeTributario: string;
  readonly ibsCbs?: IbsCbsFields;
}): Readonly<Required<Omit<IbsCbsFields, "enviar">>> | undefined {
  if (!shouldSendIbsCbs(input.competenceDate, input.regimeTributario, input.ibsCbs?.enviar)) return undefined;

  const missing = IBS_CBS_FIELDS.filter((field) => !input.ibsCbs?.[field]?.trim());
  if (missing.length > 0) {
    throw new InvoiceProviderError("ibs_cbs_incomplete", "IBS/CBS fields are incomplete.", { missing });
  }
  return {
    cst: input.ibsCbs!.cst!,
    cClassTrib: input.ibsCbs!.cClassTrib!,
    indicadorDestinatario: input.ibsCbs!.indicadorDestinatario!,
    finalidadeEmissao: input.ibsCbs!.finalidadeEmissao!,
  };
}
