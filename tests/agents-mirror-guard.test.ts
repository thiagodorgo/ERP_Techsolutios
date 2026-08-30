import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// SAN2-2 / item 1 — guard do guard do espelho Codex (`P-REG-S0-GUARD-FALSO-VERMELHO`).
//
// O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR DE VOLTAR
// `scripts/sync-agent-agents.mjs --check` é a fatia S0 do `inspetor-de-terreno-da-junta`: sem o
// verde dele, nenhuma junta começa (§C7.1-bis). A comparação era ASSIMÉTRICA — o `want` saía
// normalizado de `transform()` (CRLF -> LF na FONTE), o alvo era lido CRU do disco. Sob
// `core.autocrlf=true` (Windows) um checkout fresco materializa CRLF nas DUAS pontas, os blobs
// ficam idênticos e mesmo assim TODO arquivo "divergia": 22/22 falso-vermelho. Na árvore principal
// o guard dava verde só porque lá os alvos tinham sido ESCRITOS pelo próprio script (bytes LF),
// nunca re-checkoutados. Ou seja: o gate fail-closed de toda junta mentia exatamente no arranjo
// que o contrato exige (worktree próprio por jurado).
//
// A CONTRAPARTIDA, QUE ESTE ARQUIVO GUARDA COM O MESMO PESO
// Consertar um falso-vermelho é a maneira mais fácil de comprar um VERDE-CEGO. A normalização é
// EOL-neutra e **só** eol: nada de trim, case ou colapso de espaço. Por isso os casos vêm em dois
// blocos — os que exigem VERDE onde antes havia vermelho mentiroso, e os que exigem VERMELHO para
// qualquer diferença que não seja `\r\n` vs `\n`. Se alguém alargar a normalização no futuro, os
// casos do segundo bloco caem no mesmo `npm test`.
//
// POR QUE O TESTE RODA UMA CÓPIA DO SCRIPT (risco (g) do plano SAN2-2)
// O script deriva o seu `ROOT` da própria localização (`import.meta.url` + `..`), então uma cópia
// em `<tmp>/scripts/` enxerga `<tmp>/.claude/agents` e `<tmp>/.agents/agents` — é o que permite
// montar árvores sintéticas sem tocar as do repositório. A cópia é feita EM RUNTIME a partir de
// `scripts/sync-agent-agents.mjs` (nunca de um snapshot embutido aqui), então o teste acompanha o
// script de verdade. A outra ponta do risco é coberta fora daqui: o passo
// `node scripts/sync-agent-agents.mjs --check` do job `backend` da CI executa o script ORIGINAL na
// árvore ORIGINAL a cada PR. As duas pontas se cobrem; se divergirem, o par de resultados é em si
// o diagnóstico — trata-se o script, nunca se afrouxa o teste.
//
// Zero skip por desenho: nada aqui depende de banco, rede ou variável de ambiente. Um skip neste
// arquivo é teste mentindo, não ambiente faltando. Teardown ESCOPADO ao diretório criado pelo
// próprio caso (`mkdtempSync`), jamais um alvo largo.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(HERE, "..");
const REAL_SCRIPT = path.join(REPO_ROOT, "scripts", "sync-agent-agents.mjs");

type Eol = "lf" | "crlf";

/** Reescreve os fins de linha do texto — e SÓ eles. */
function withEol(text: string, eol: Eol): string {
  const lf = text.replace(/\r\n/g, "\n");
  return eol === "crlf" ? lf.replace(/\n/g, "\r\n") : lf;
}

// Dois papéis de fixture. O primeiro carrega `tools:` E `model:` (o par que o transform trata de
// formas opostas); o segundo existe para provar que o guard NOMEIA o arquivo certo e só ele.
const AGENT_A = [
  "---",
  "name: jurado-fixture",
  "description: papel de fixture do guard do espelho.",
  "tools: Read, Grep, Glob, Bash",
  "model: fable",
  "---",
  "",
  "Corpo do papel — linha A.",
  "Esta cadeira tem poder de VETO.",
  "",
].join("\n");

const AGENT_B = [
  "---",
  "name: outro-papel",
  "description: segundo papel de fixture, sem model fixado.",
  "tools: Read, Grep",
  "---",
  "",
  "Corpo do outro papel — linha unica.",
  "",
].join("\n");

const SOURCES: Record<string, string> = {
  "jurado-fixture.md": AGENT_A,
  "outro-papel.md": AGENT_B,
};

interface Tree {
  dir: string;
  script: string;
  srcDir: string;
  dstDir: string;
}

/** Monta a árvore sintética e copia o script REAL (§7g) para dentro dela. */
function makeTree(sourceEol: Eol): Tree {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "erp-agents-mirror-"));
  const scriptsDir = path.join(dir, "scripts");
  const srcDir = path.join(dir, ".claude", "agents");
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });
  const script = path.join(scriptsDir, "sync-agent-agents.mjs");
  fs.copyFileSync(REAL_SCRIPT, script);
  for (const [name, body] of Object.entries(SOURCES)) {
    fs.writeFileSync(path.join(srcDir, name), withEol(body, sourceEol));
  }
  return { dir, script, srcDir, dstDir: path.join(dir, ".agents", "agents") };
}

function cleanup(tree: Tree): void {
  // Teardown escopado: só o diretório que ESTE caso criou.
  fs.rmSync(tree.dir, { recursive: true, force: true });
}

function run(tree: Tree, args: string[] = []): { status: number | null; out: string } {
  const res = spawnSync(process.execPath, [tree.script, ...args], { encoding: "utf8" });
  return { status: res.status, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

/** Gera o espelho pelo caminho de ESCRITA do próprio script (nada de reimplementar `transform`). */
function generateMirror(tree: Tree): void {
  const res = run(tree);
  assert.equal(res.status, 0, `sync (modo escrita) deveria sair 0. Saída:\n${res.out}`);
}

/** Reescreve os fins de linha de todos os arquivos do espelho — e só eles. */
function setMirrorEol(tree: Tree, eol: Eol): void {
  for (const name of fs.readdirSync(tree.dstDir)) {
    const file = path.join(tree.dstDir, name);
    fs.writeFileSync(file, withEol(fs.readFileSync(file, "utf8"), eol));
  }
}

function mirrorPath(tree: Tree, name: string): string {
  return path.join(tree.dstDir, name);
}

function patch(file: string, from: string, to: string): void {
  const before = fs.readFileSync(file, "utf8");
  assert.ok(before.includes(from), `fixture inválida: "${from}" não está em ${file}`);
  fs.writeFileSync(file, before.replace(from, to));
}

// ---------------------------------------------------------------------------
// BLOCO 1 — o falso-vermelho morreu: EOL não é divergência.
// ---------------------------------------------------------------------------

test("checkout com CRLF nas DUAS pontas (o arranjo exato do falso-vermelho) sai exit 0", () => {
  // Este é o caso que reproduzia `P-REG-S0-GUARD-FALSO-VERMELHO`: no Windows, sob
  // `core.autocrlf=true`, fonte e espelho materializam CRLF e os blobs são idênticos.
  const tree = makeTree("crlf");
  try {
    generateMirror(tree);
    setMirrorEol(tree, "crlf");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 0, `esperado exit 0 (conteúdo idêntico, só EOL difere). Saída:\n${res.out}`);
    assert.match(res.out, /espelho consistente/);
  } finally {
    cleanup(tree);
  }
});

test("fonte CRLF + espelho LF sai exit 0", () => {
  const tree = makeTree("crlf");
  try {
    generateMirror(tree); // o caminho de escrita grava LF
    setMirrorEol(tree, "lf");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 0, `esperado exit 0. Saída:\n${res.out}`);
  } finally {
    cleanup(tree);
  }
});

test("fonte LF + espelho CRLF sai exit 0", () => {
  const tree = makeTree("lf");
  try {
    generateMirror(tree);
    setMirrorEol(tree, "crlf");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 0, `esperado exit 0. Saída:\n${res.out}`);
  } finally {
    cleanup(tree);
  }
});

// ---------------------------------------------------------------------------
// BLOCO 2 — o guard ainda MORDE: drift real continua reprovando (anti-verde-cego).
// Estes quatro casos são o Drill B do plano, congelado como regressão permanente.
// ---------------------------------------------------------------------------

test("mutação de 1 linha no corpo da FONTE reprova, nomeando só esse arquivo", () => {
  const tree = makeTree("crlf");
  try {
    generateMirror(tree);
    setMirrorEol(tree, "crlf");
    patch(path.join(tree.srcDir, "jurado-fixture.md"), "poder de VETO", "poder de voto");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 1, `mutação de conteúdo TEM de reprovar. Saída:\n${res.out}`);
    assert.match(res.out, /DIVERGE: \.agents\/agents\/jurado-fixture\.md/);
    assert.doesNotMatch(res.out, /outro-papel\.md/, "o arquivo intacto não pode ser acusado");
  } finally {
    cleanup(tree);
  }
});

test("mutação de 1 linha no corpo do ESPELHO reprova, nomeando só esse arquivo", () => {
  const tree = makeTree("crlf");
  try {
    generateMirror(tree);
    setMirrorEol(tree, "crlf");
    patch(mirrorPath(tree, "outro-papel.md"), "linha unica", "linha adulterada");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 1, `mutação de conteúdo TEM de reprovar. Saída:\n${res.out}`);
    assert.match(res.out, /DIVERGE: \.agents\/agents\/outro-papel\.md/);
    assert.doesNotMatch(res.out, /jurado-fixture\.md/, "o arquivo intacto não pode ser acusado");
  } finally {
    cleanup(tree);
  }
});

test("arquivo faltando no espelho reprova com FALTA", () => {
  const tree = makeTree("crlf");
  try {
    generateMirror(tree);
    setMirrorEol(tree, "crlf");
    fs.rmSync(mirrorPath(tree, "jurado-fixture.md"));
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 1, `espelho incompleto TEM de reprovar. Saída:\n${res.out}`);
    assert.match(res.out, /FALTA no espelho: \.agents\/agents\/jurado-fixture\.md/);
  } finally {
    cleanup(tree);
  }
});

test("arquivo a mais no espelho (fora do KEEP) reprova com SOBRA", () => {
  const tree = makeTree("crlf");
  try {
    generateMirror(tree);
    setMirrorEol(tree, "crlf");
    fs.writeFileSync(mirrorPath(tree, "intruso.md"), "# papel que não existe na origem\n");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 1, `papel sem origem TEM de reprovar. Saída:\n${res.out}`);
    assert.match(res.out, /SOBRA no espelho .*: \.agents\/agents\/intruso\.md/);
  } finally {
    cleanup(tree);
  }
});

test("README.md do espelho é KEEP e NÃO vira SOBRA", () => {
  // O README carrega o protocolo de emulação do Codex; se o guard o acusasse, o conserto óbvio
  // seria apagá-lo — e a instrução de emulação morreria junto.
  const tree = makeTree("crlf");
  try {
    generateMirror(tree);
    fs.writeFileSync(mirrorPath(tree, "README.md"), "# índice / protocolo de emulação\n");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 0, `README é KEEP e não pode reprovar. Saída:\n${res.out}`);
    assert.doesNotMatch(res.out, /SOBRA/);
  } finally {
    cleanup(tree);
  }
});

// ---------------------------------------------------------------------------
// BLOCO 3 — a normalização é EOL-neutra e SÓ eol (risco (a) do plano).
// Cada caso aqui fixa uma diferença que NÃO é `\r\n` vs `\n` e exige vermelho.
// ---------------------------------------------------------------------------

test("normalização é só EOL: espaço no fim da linha continua reprovando (sem trim)", () => {
  const tree = makeTree("lf");
  try {
    generateMirror(tree);
    patch(mirrorPath(tree, "jurado-fixture.md"), "linha A.", "linha A. ");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 1, `espaço a mais é drift de conteúdo. Saída:\n${res.out}`);
    assert.match(res.out, /DIVERGE: \.agents\/agents\/jurado-fixture\.md/);
    assert.doesNotMatch(res.out, /outro-papel\.md/, "o arquivo intacto não pode ser acusado");
  } finally {
    cleanup(tree);
  }
});

test("normalização é só EOL: diferença de caixa continua reprovando (sem case-fold)", () => {
  const tree = makeTree("lf");
  try {
    generateMirror(tree);
    patch(mirrorPath(tree, "jurado-fixture.md"), "poder de VETO", "poder de veto");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 1, `troca de caixa é drift de conteúdo. Saída:\n${res.out}`);
    assert.match(res.out, /DIVERGE: \.agents\/agents\/jurado-fixture\.md/);
    assert.doesNotMatch(res.out, /outro-papel\.md/, "o arquivo intacto não pode ser acusado");
  } finally {
    cleanup(tree);
  }
});

test("normalização é só EOL: linha em branco a mais continua reprovando (sem colapso)", () => {
  const tree = makeTree("crlf");
  try {
    generateMirror(tree);
    setMirrorEol(tree, "crlf");
    patch(mirrorPath(tree, "jurado-fixture.md"), "linha A.", "linha A.\r\n");
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 1, `linha a mais é drift de conteúdo. Saída:\n${res.out}`);
    assert.match(res.out, /DIVERGE: \.agents\/agents\/jurado-fixture\.md/);
    assert.doesNotMatch(res.out, /outro-papel\.md/, "o arquivo intacto não pode ser acusado");
  } finally {
    cleanup(tree);
  }
});

// ---------------------------------------------------------------------------
// BLOCO 4 — a regra de execução do papel não pode sofrer drift.
// ---------------------------------------------------------------------------

test("espelho gerado remove `tools:` e PRESERVA `model:` (D-PLANEJADOR-MODELO-FABLE)", () => {
  // `tools:` é mecanismo do Claude Code e não tem equivalente no Codex — sai. `model:` é REGRA DE
  // EXECUÇÃO do papel: o `planejador-mestre` roda em Fable por contrato, obrigatoriamente na
  // revalidação de código corrigido. Se a sincronização apagasse essa linha, o espelho Codex
  // perderia a regra EM SILÊNCIO a cada execução — foi exatamente o que aconteceu na primeira
  // tentativa de aplicar a decisão.
  const tree = makeTree("crlf");
  try {
    generateMirror(tree);
    const mirrored = fs.readFileSync(mirrorPath(tree, "jurado-fixture.md"), "utf8");

    assert.match(mirrored, /^model: fable$/m, "`model:` TEM de sobreviver ao espelhamento");
    assert.doesNotMatch(mirrored, /^\s*tools\s*:/m, "`tools:` TEM de sair do espelho");
    assert.match(mirrored, /^name: jurado-fixture$/m, "`name:` continua no frontmatter");

    // Corpo VERBATIM: os poderes do papel (inclusive VETO) não podem sofrer drift.
    assert.match(mirrored, /Corpo do papel — linha A\./);
    assert.match(mirrored, /Esta cadeira tem poder de VETO\./);
    assert.match(mirrored, /Papel para o Codex/, "o preâmbulo de emulação entra no espelho");

    // E o par escrita/verificação fecha: o que o script escreve, ele aprova.
    const res = run(tree, ["--check"]);
    assert.equal(res.status, 0, `o espelho recém-gerado tem de passar no --check. Saída:\n${res.out}`);

    // Papel sem `model:` não ganha um do nada.
    const outro = fs.readFileSync(mirrorPath(tree, "outro-papel.md"), "utf8");
    assert.doesNotMatch(outro, /^model:/m, "papel sem `model:` não pode ganhar um no espelho");
    assert.doesNotMatch(outro, /^\s*tools\s*:/m, "`tools:` TEM de sair do espelho");
  } finally {
    cleanup(tree);
  }
});
