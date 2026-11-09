import { InvoiceProviderError } from "../invoice/invoice-errors.js";
import type { InvoiceTaxProfile, NfseRoute } from "../invoice/invoice-provider.port.js";
import { isSimplesRegime } from "./ibs-cbs.rules.js";

const SIMPLES_NATIONAL_ONLY_START = "2026-11-01";

export function validateTaxProfileBeforeNetwork(profile: InvoiceTaxProfile, competenceDate: string): { readonly route: NfseRoute; readonly regimeTributario: string } {
  const regimeTributario = profile.regimeTributario?.trim();
  if (!regimeTributario) {
    throw new InvoiceProviderError("fiscal_data_incomplete", "Fiscal data is incomplete.", { missing: ["regimeTributario"] });
  }
  const route = profile.nfseRoute ?? "nacional";
  if (route === "municipal" && competenceDate >= SIMPLES_NATIONAL_ONLY_START && isSimplesRegime(regimeTributario)) {
    throw new InvoiceProviderError("municipal_route_not_allowed_for_simples", "Municipal route is not allowed for Simples after the national cutover.");
  }
  return { route, regimeTributario };
}
