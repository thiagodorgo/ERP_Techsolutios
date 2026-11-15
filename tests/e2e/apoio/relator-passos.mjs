// B-SAN3-10-E2E-CI (item 42), Emenda 2.1 R2-A1, regra G11. O relatório JSON do Playwright 1.60 esconde o passo
// pulado: o passo sai só com título e duração. A API de relator o mostra em `onStepEnd`, nas anotações do passo.
// Este relator anota cada passo mascarado e, no fim, devolve o estado "failed": a rodada sai vermelha.
// As anotações proibidas vêm do módulo de regras dos guardas, para não divergirem.
import { ANOTACOES_PROIBIDAS } from "../../../scripts/e2e-guard-regras.mjs";

export default class RelatorPassos {
  constructor() {
    this.mascarados = [];
  }

  onStepEnd(test, _result, step) {
    if (step.category !== "test.step") return;
    if ((step.annotations ?? []).some((annotation) => ANOTACOES_PROIBIDAS.has(annotation.type))) {
      this.mascarados.push(`${test.titlePath().filter(Boolean).join(" › ")} › ${step.title}`);
    }
  }

  onEnd() {
    if (this.mascarados.length === 0) return undefined;
    for (const passo of this.mascarados) console.log(`e2e-guard: VERMELHO — G11: passo pulado: ${passo}`);
    return { status: "failed" };
  }
}
