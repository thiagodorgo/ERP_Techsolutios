import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { APPEARANCE_SCREENS } from "../src/modules/appearance/appearance.registry";

// B-APAR-OS (fundação da trilha B-APAR-3, plano §1.2 item 1) — o menu de aparência só oferece uma tela quando ela entrega
// as 3 aparências aprovadas (`appearance.registry.ts`: "uma tela entra aqui no mesmo bloco que entrega as 3"; até aqui era
// só comentário — nenhum teste prendia). Para CADA tela do registro, medido no código:
//   (i)   existe UM arquivo em `frontend/src` (fora do módulo de aparência) que chama `useScreenAppearance` com a chave —
//         literal ou constante resolvida;
//   (ii)  a partir desse contêiner, seguindo os imports relativos, alcançam-se as 3 raízes `data-aparencia="A"|"B"|"C"`;
//   (iii) os rótulos do registro são IGUAIS aos do seletor da referência aprovada (`>A · …<` no HTML de `screen-refs/`).
// Tela registrada sem referência no mapa abaixo reprova (é tela que entrou no menu sem as 3 aprovadas).
//
// Exceções NOMINAIS (registradas, não silenciosas):
//   - `patios`, opção A: o registro diz "Padrão" e a referência "Padrão fiel" (P-APAR-PATIOS-ROTULO-A, pergunta Q-APAR-1);
// O editor de modelo de checklist (B-SAN3-22) desenha as 3 aparências por ramos dentro da própria página; a Emenda 1 do
// orquestrador ao plano B-APAR-3 (A9) autorizou UMA linha na raiz dele, `data-aparencia={appearance}`, e o guard não ganha
// exceção: uma raiz `data-aparencia={appearance}` no arquivo que lê `useScreenAppearance` vale pelas 3 letras, porque o
// valor É a aparência escolhida (A, B ou C, saneada pelo armazenamento).

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "../src");
const REFS = resolve(HERE, "../../docs/claude-code-handoff/screen-refs");
const APPEARANCE_MODULE = join(SRC, "modules", "appearance");

/** Tela → referência aprovada das 3 opções. */
export const SCREEN_REFERENCES: Readonly<Record<string, string>> = {
  patios: "patios-3opcoes.reference.html",
  "checklist-editor": "checklist-editor-estados-3opcoes.reference.html",
  financeiro: "financeiro-baixa-conta-conciliacao-3opcoes.reference.html",
  "ordens-de-servico": "ordens-de-servico-3opcoes.reference.html",
  dashboard: "dashboard-3opcoes.reference.html",
  usuarios: "usuarios-3opcoes.reference.html",
  auditoria: "auditoria-3opcoes.reference.html",
  despachos: "despachos-3opcoes.reference.html",
  estoque: "estoque-3opcoes.reference.html",
  "troca-senha": "troca-senha-3opcoes.reference.html",
  cheques: "cheques-3opcoes.reference.html",
};

const LABEL_EXCEPTIONS: ReadonlySet<string> = new Set(["patios:A"]);

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(path);
  }
  return acc;
}

const FILES = sourceFiles(SRC);
const CONTENT = new Map(FILES.map((file) => [file, readFileSync(file, "utf8")]));

/** Arquivos (fora do módulo de aparência) que chamam `useScreenAppearance` com a chave, literal ou constante resolvida. */
export function containersFor(key: string, files: ReadonlyMap<string, string> = CONTENT): string[] {
  const constants = new Set<string>();
  for (const source of files.values()) {
    for (const match of source.matchAll(/(?:export\s+)?const\s+([A-Z0-9_]+)\s*=\s*"([^"]+)"/g)) if (match[2] === key) constants.add(match[1]);
  }
  const found: string[] = [];
  for (const [file, source] of files) {
    if (file.startsWith(APPEARANCE_MODULE)) continue;
    const code = source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of code.matchAll(/useScreenAppearance\(\s*([^)]+?)\s*\)/g)) {
      const arg = match[1];
      const literal = /^["'`]([^"'`]+)["'`]$/.exec(arg)?.[1];
      if (literal === key || constants.has(arg)) {
        found.push(file);
        break;
      }
    }
  }
  return found;
}

function resolveImport(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** As letras `data-aparencia` alcançáveis a partir do contêiner, seguindo os imports relativos dentro de `src`. */
export function reachableRoots(container: string, files: ReadonlyMap<string, string> = CONTENT): Set<string> {
  const letters = new Set<string>();
  const seen = new Set<string>();
  const queue = [container];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = files.get(file) ?? (existsSync(file) ? readFileSync(file, "utf8") : "");
    for (const match of source.matchAll(/data-aparencia="([ABC])"/g)) letters.add(match[1]);
    if (/data-aparencia=\{appearance\}/.test(source) && /const \{ appearance \} = useScreenAppearance\(/.test(source)) for (const letter of "ABC") letters.add(letter);
    for (const match of source.matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)) {
      const next = resolveImport(file, match[1]);
      if (next && next.startsWith(SRC) && !next.startsWith(APPEARANCE_MODULE)) queue.push(next);
    }
  }
  return letters;
}

export function referenceLabels(file: string): Record<string, string> {
  const html = readFileSync(join(REFS, file), "utf8");
  const labels: Record<string, string> = {};
  for (const match of html.matchAll(/>([ABC]) · ([^<]+)</g)) labels[match[1]] = match[2].trim();
  return labels;
}

test("o registro tem tela e o guard mede algo (denominador)", () => {
  assert.ok(APPEARANCE_SCREENS.length >= 3, `telas no registro: ${APPEARANCE_SCREENS.length}`);
  assert.ok(FILES.length > 100, `arquivos medidos em frontend/src: ${FILES.length}`);
});

for (const screen of APPEARANCE_SCREENS) {
  test(`[${screen.key}] (i) um contêiner chama useScreenAppearance com a chave`, () => {
    const found = containersFor(screen.key).map((file) => relative(SRC, file));
    assert.equal(found.length, 1, `contêineres da tela "${screen.key}": ${JSON.stringify(found)}`);
  });

  test(`[${screen.key}] (ii) as 3 raízes data-aparencia A, B e C são alcançáveis a partir do contêiner`, () => {
    const [container] = containersFor(screen.key);
    assert.ok(container, `sem contêiner para "${screen.key}"`);
    const letters = [...reachableRoots(container)].sort();
    assert.deepEqual(letters, ["A", "B", "C"], `raízes alcançáveis a partir de ${relative(SRC, container)}: ${JSON.stringify(letters)}`);
  });

  test(`[${screen.key}] (iii) os rótulos do registro são os do seletor da referência aprovada`, () => {
    const reference = SCREEN_REFERENCES[screen.key];
    assert.ok(reference, `a tela "${screen.key}" está no registro sem referência aprovada das 3 opções`);
    const labels = referenceLabels(reference);
    assert.deepEqual(Object.keys(labels).sort(), ["A", "B", "C"], `seletor da referência ${reference}: ${JSON.stringify(labels)}`);
    assert.deepEqual(
      screen.options.map((option) => option.value),
      ["A", "B", "C"],
      `opções do registro de "${screen.key}"`,
    );
    const wrong = screen.options
      .filter((option) => !LABEL_EXCEPTIONS.has(`${screen.key}:${option.value}`))
      .filter((option) => option.label !== labels[option.value])
      .map((option) => `${option.value}: registro "${option.label}" × referência "${labels[option.value]}"`);
    assert.deepEqual(wrong, [], `rótulos divergentes em "${screen.key}"`);
  });
}

test("a exceção nominal de rótulo continua sendo exceção (se a referência e o registro se igualarem, ela sai)", () => {
  const patios = APPEARANCE_SCREENS.find((screen) => screen.key === "patios");
  assert.ok(patios, "pátios está no registro");
  const labels = referenceLabels(SCREEN_REFERENCES.patios);
  const optionA = patios.options.find((option) => option.value === "A");
  assert.notEqual(optionA?.label, labels.A, "P-APAR-PATIOS-ROTULO-A resolvida: tire a exceção nominal deste guard");
});
