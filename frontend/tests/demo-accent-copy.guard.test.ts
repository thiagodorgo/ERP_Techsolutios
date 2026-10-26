import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const FRONTEND = fileURLToPath(new URL("../", import.meta.url));
const REPO = path.dirname(FRONTEND);
const UI_ROOTS = [path.join(FRONTEND, "src"), path.join(REPO, "mobile/flutter_app/lib")];
const SOURCE_EXTENSION = /\.(?:dart|ts|tsx)$/;
const STRING_LITERAL = /(["'`])(?:\\.|(?!\1).)*\1/g;
const FORBIDDEN_COPY = /\b(?:Titulo|Descricao|Localizacao|Ultimo fix|Nao foi possivel|Ciencia|Atribuida|Atribuidas|Concluida|Concluidas)\b|Enviar localizacao agora|Registrar evidencia/g;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? sourceFiles(target) : SOURCE_EXTENSION.test(target) ? [target] : [];
  });
}

function forbiddenUiCopy(source: string): string[] {
  return [...source.matchAll(STRING_LITERAL)]
    .flatMap(([literal]) => [...literal.matchAll(FORBIDDEN_COPY)].map(([copy]) => copy));
}

test("DEMO-D AC-14 impede o retorno da copia sem acento nas strings de UI", () => {
  const violations = UI_ROOTS.flatMap(sourceFiles).flatMap((file) =>
    forbiddenUiCopy(readFileSync(file, "utf8")).map((copy) => `${path.relative(REPO, file)}: ${copy}`),
  );

  assert.deepEqual(violations, []);
  assert.deepEqual(forbiddenUiCopy("const label = 'Enviar localizacao agora';"), ["Enviar localizacao agora"]);
});

test("DEMO-D AC-17 mantem Checklists e Notificacoes fora dos atalhos da Home", () => {
  const home = readFileSync(path.join(REPO, "mobile/flutter_app/lib/shared/ui/home_screen.dart"), "utf8");
  assert.doesNotMatch(home, /MobileActionTile\([\s\S]{0,240}?label:\s*['"](?:Checklists|Notificações)['"]/);
});
