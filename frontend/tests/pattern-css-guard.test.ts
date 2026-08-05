import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

// TELAS PADRONIZADAS — guard de CSS do padrão (achado CRÍTICO da junta do PR-D).
// Um comentário contendo "*/" no meio do texto (ex.: "Reusa .pat-table*/.pat-kpi*") FECHA o comentário cedo e faz
// o parser DESCARTAR a regra seguinte — no PR-D isso matou a `.pat-patios-grid` inteira e a tabela ficou sem grade.
// `tsc` não tipa CSS e o jsdom dos smokes não faz layout, então nada pegava. Este teste pega: remove os comentários
// exatamente como um parser CSS faria e exige que as grades/regras estruturais do padrão sobrevivam.
const cssPath = fileURLToPath(new URL("../src/styles/app.css", import.meta.url));
const css = readFileSync(cssPath, "utf8");

/** Remove comentários /* … *\/ na mesma semântica do parser (o primeiro "*\/" fecha). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

const live = stripComments(css);

// Regras estruturais que sustentam as 5 telas da rodada (se uma sumir, a tela perde a grade/o card).
const REQUIRED_RULES: readonly string[] = [
  ".pat-page-header",
  ".pat-kpi",
  ".pat-table",
  ".pat-pager",
  ".pat-pill",
  ".pat-avatar",
  ".pat-os-grid",
  ".pat-users-grid",
  ".pat-audit-grid",
  ".pat-patios-grid",
  ".pat-cell-body",
  ".pat-invite",
];

test("guard de CSS: as regras estruturais do padrão sobrevivem ao parser (nenhum comentário as engole)", () => {
  for (const rule of REQUIRED_RULES) {
    assert.ok(
      new RegExp(`\\${rule}\\s*[,{]`).test(live),
      `A regra ${rule} sumiu do CSS efetivo — provável comentário com "*/" no texto engolindo o bloco seguinte.`,
    );
  }
});

test("guard de CSS: as grades do padrão declaram grid-template-columns no CSS efetivo", () => {
  for (const grid of [".pat-os-grid", ".pat-users-grid", ".pat-audit-grid", ".pat-patios-grid"]) {
    const block = new RegExp(`\\${grid}\\s*\\{([^}]*)\\}`).exec(live);
    assert.ok(block, `Bloco de ${grid} não encontrado no CSS efetivo.`);
    assert.match(block![1], /grid-template-columns\s*:/, `${grid} sem grid-template-columns (grade morta).`);
  }
});

test("guard de CSS: nenhum comentário do arquivo contém um fechamento extra no meio do texto", () => {
  // Cada comentário bem-formado, ao ser recortado, não pode deixar "*/" órfão logo em seguida.
  const orphans = live.match(/\*\//g) ?? [];
  assert.equal(orphans.length, 0, `Há ${orphans.length} fechamento(s) de comentário órfão(s) — comentário fechou cedo.`);
});
