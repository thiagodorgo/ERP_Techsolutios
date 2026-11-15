import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// B-ASS-01, com o enunciado do B-ASS-10b (plano v2 §8.3(b)): a tela de custo e margem da plataforma não fala de cobrança
// por markup. A lista é TODO `.ts`/`.tsx` de `modules/platform/cloud-billing/**` (as 3 aparências, janelas e o modelo
// entram sozinhos), e "Margem" sai do padrão proibido: a margem (assinatura − custo, calculada pelo servidor) é o assunto
// da tela. O teste antigo das "quatro leituras" saiu; o substituto é o T14 de `frontend/tests/san3-06b-cloud-billing.smoke.test.tsx`.

const MODULE = "frontend/src/modules/platform/cloud-billing";

async function moduleFiles(directory: string): Promise<string[]> {
  const out: string[] = [];
  for (const name of await readdir(directory)) {
    const target = path.join(directory, name);
    if ((await stat(target)).isDirectory()) out.push(...(await moduleFiles(target)));
    else if (/\.(ts|tsx)$/.test(name)) out.push(target);
  }
  return out;
}

test("ASS-01 Cloud Billing nao referencia markup nem cloud-charge", async () => {
  const files = await moduleFiles(MODULE);
  assert.ok(files.length >= 8, `controle de vacuidade: o módulo tem arquivos (${files.length})`);
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /cloud-charge|CloudCharge|markup|Valor cobrável|Organizações com cobrança|Cobrança por organização/i, file);
  }
});
