import { env } from "../../config/env.js";
import {
  NoopEvidenceScanner,
  UnavailableEvidenceScanner,
  type EvidenceScanner,
} from "./evidence-storage.js";

/**
 * B-O6R-07b (Ω6R-SEC-004) · §3.2 do plano — REGISTRO ÚNICO do scanner de evidência.
 *
 * ANTES: cada via de upload guardava a sua própria variável de módulo com `new NoopEvidenceScanner()`
 * como default (`mobile-evidence-upload.ts:54`, `attachment.storage.ts:53`,
 * `work-order-attachment.storage.ts:50`) — e duas vias (checklist, dano) não tinham scanner nenhum.
 * Três defaults independentes que dizem "limpo" é o mecanismo (1) do achado, replicado.
 *
 * AGORA: um registro só. O default NÃO é escolhido por quem chama, é derivado do AMBIENTE
 * (`EVIDENCE_SCANNER`, resolvida em `src/config/env.ts` a partir do `NODE_ENV`):
 *   - `production` → `unavailable`  → todo upload responde 503, nada é gravado (fail-closed)
 *   - `development` / `test` → `noop`
 * e `EVIDENCE_SCANNER=noop` com `NODE_ENV=production` é **recusado no BOOT** pelo refinamento do
 * `envSchema` — produção não sobe com scanner que mente. Esquecer a variável em produção resolve para
 * `unavailable`, que é o lado seguro: o fail-closed não depende de ninguém lembrar de setar nada.
 *
 * Os `configure*ScannerForTests` das três vias viram wrappers finos daqui (as suítes que os usam não
 * mudam), e `tests/o6r07b-upload-gate-census.test.ts` (C3) proíbe `new NoopEvidenceScanner(` /
 * `new UnavailableEvidenceScanner(` em `src/**` fora deste arquivo — um quarto default privado não
 * nasce em silêncio.
 */

let override: EvidenceScanner | undefined;
let resolved: EvidenceScanner | undefined;

function createDefaultEvidenceScanner(): EvidenceScanner {
  return env.EVIDENCE_SCANNER === "noop" ? new NoopEvidenceScanner() : new UnavailableEvidenceScanner();
}

/** O scanner vigente: o injetado por teste, senão o default do ambiente (memoizado). */
export function resolveEvidenceScanner(): EvidenceScanner {
  if (override) return override;
  resolved ??= createDefaultEvidenceScanner();
  return resolved;
}

/** Nome do scanner vigente, para o log estruturado e para a marca de verificação (§3.1). */
export function resolveEvidenceScannerName(): string {
  return resolveEvidenceScanner().constructor.name;
}

export function setEvidenceScannerForTests(next: EvidenceScanner): void {
  override = next;
}

export function resetEvidenceScannerForTests(): void {
  override = undefined;
  resolved = undefined;
}
