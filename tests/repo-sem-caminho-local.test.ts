// Guarda permanente: nenhum arquivo RASTREADO traz caminho de home com nome de usuário.
//
// POR QUE EXISTE
// O repositório é público. Atas, diários, evidências e definições de agente copiavam caminhos absolutos da
// máquina de quem escreveu (pasta de home do Windows ou do Git Bash), e cada um expunha o nome de usuário
// dessa máquina. A varredura de 14/11 trocou esses prefixos por "~/" (ou "~" sem barra final); este teste
// impede que voltem. Roda no `npm test` e, portanto, no job `backend` da CI.
//
// O QUE ACUSA
// A expressão CAMINHO_DE_HOME abaixo: letra de unidade com dois-pontos e uma ou duas barras (normal,
// invertida ou invertida escapada), OU a forma do Git Bash (barra, letra minúscula, barra), OU a do WSL
// (barra, mnt, barra, letra, barra), seguida de "Users", uma ou duas barras e um segmento de nome, de
// QUALQUER usuário. Lê `git ls-files` (só o que está rastreado), pula binário (byte NUL nos primeiros 8000
// bytes, a heurística do git) e arquivo rastreado ausente do disco.
//
// COMO CORRIGIR UM VERMELHO
// Troque o prefixo de home por "~/" (ex.: a pasta de pausas vira "~/erp-pausa-2026-10-03/..."), ou escreva
// "fora do repositório" quando o caminho não importa ao leitor.
//
// A MENSAGEM NÃO REPETE O NOME
// O log da CI de um repositório público também é público. Por isso a falha lista arquivo, linha e a FORMA
// do caminho com o segmento do nome trocado por <usuário>, nunca o trecho original.
//
// EXCEÇÃO: NENHUMA, NEM ESTE ARQUIVO
// A exceção prevista (este arquivo, só nas strings de controle) ficou desnecessária: as strings de controle
// do autoteste usam o usuário fictício "fulano" e são MONTADAS em tempo de execução (join de partes), então o
// texto-fonte deste arquivo não contém caminho de home nenhum e é varrido como qualquer outro. Os comentários
// descrevem as formas por extenso, sem escrevê-las. Se alguém escrever uma string de controle literal aqui,
// o primeiro teste fica vermelho.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CAMINHO_DE_HOME = /(?:[A-Za-z]:[\\/]{1,2}|\/[a-z]\/|\/mnt\/[a-z]\/)Users[\\/]{1,2}[^\\/\s"'`)]+/;

// Strings de CONTROLE: as seis formas, com o usuário fictício, montadas por partes (ver o cabeçalho).
const U = "Users";
const CONTROLES = [
  ["C:", U, "fulano", "erp-pausa-2026-10-03", "planos", "x.md"].join("/"), // unidade + barra
  ["C:", U, "fulano", "w-teste", "src", "app.ts"].join("\\"), // unidade + contrabarra
  ["C:", U, "fulano", "w-teste", "log.json"].join("\\\\"), // unidade + contrabarra escapada (JSON)
  ["d:", U, "fulano", "w-teste"].join("/"), // outra unidade, minúscula
  "/" + ["c", U, "fulano", "w-teste", "tests"].join("/"), // Git Bash
  "/" + ["mnt", "c", U, "fulano", "w-teste"].join("/"), // WSL
];

type Achado = { arquivo: string; linha: number; forma: string };

function mascarar(trecho: string): string {
  return trecho.replace(/(Users[\\/]{1,2})[^\\/\s"'`)]+$/, "$1<usuário>");
}

function arquivosRastreados(raiz: string): string[] {
  return execFileSync("git", ["-C", raiz, "ls-files", "-z"], { maxBuffer: 1 << 28 })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function acharCaminhosDeHome(raiz: string): Achado[] {
  const achados: Achado[] = [];
  const global = new RegExp(CAMINHO_DE_HOME.source, "g");
  for (const arquivo of arquivosRastreados(raiz)) {
    let bytes: Buffer;
    try {
      bytes = readFileSync(path.join(raiz, arquivo));
    } catch {
      continue; // rastreado, mas ausente do disco (ex.: removido no worktree antes do commit)
    }
    if (bytes.subarray(0, 8000).includes(0)) continue; // binário
    bytes
      .toString("utf8")
      .split("\n")
      .forEach((texto, i) => {
        for (const m of texto.matchAll(global)) achados.push({ arquivo, linha: i + 1, forma: mascarar(m[0]) });
      });
  }
  return achados;
}

function relatorio(achados: Achado[]): string {
  const linhas = achados.slice(0, 50).map((a) => `  ${a.arquivo}:${a.linha}: ${a.forma}`);
  const resto = achados.length > 50 ? [`  ... e mais ${achados.length - 50}`] : [];
  const arquivos = new Set(achados.map((a) => a.arquivo)).size;
  return [
    `${achados.length} caminho(s) de home com nome de usuário em ${arquivos} arquivo(s) rastreado(s).`,
    `Troque o prefixo de home por "~/" (o repositório é público):`,
    ...linhas,
    ...resto,
  ].join("\n");
}

test("nenhum arquivo rastreado traz caminho de home com nome de usuário (este incluído)", () => {
  const achados = acharCaminhosDeHome(ROOT);
  assert.equal(achados.length, 0, relatorio(achados));
});

test("as strings de controle cobrem as seis formas e o texto-fonte deste arquivo não tem nenhuma", () => {
  for (const c of CONTROLES) assert.match(c, CAMINHO_DE_HOME, `string de controle sem caminho de home: ${mascarar(c)}`);
  const fonte = readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.equal(new RegExp(CAMINHO_DE_HOME.source).test(fonte), false, "string de controle literal neste arquivo");
});

test("controle: num repositório temporário, o guarda acusa as seis formas e só o que está rastreado", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "repo-sem-caminho-"));
  try {
    execFileSync("git", ["init", "-q", tmp]);
    // uma forma por linha, cada linha com um caminho
    writeFileSync(path.join(tmp, "a.md"), CONTROLES.map((c) => `ver ${c} aqui`).join("\n") + "\n");
    // não acusa: prefixo neutro, URL do GitHub e "Users" fora da forma de caminho de home
    writeFileSync(
      path.join(tmp, "b.md"),
      ["~/erp-pausa-2026-10-03/planos/x.md", "https://github.com/fulano/repo", "Users e usuários", "C:/Program Files/x"].join(
        "\n",
      ),
    );
    // binário: pulado mesmo com caminho dentro
    writeFileSync(path.join(tmp, "c.bin"), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(CONTROLES[0]!)]));
    // não rastreado: fora do alcance do guarda
    writeFileSync(path.join(tmp, "d.md"), CONTROLES[0]!);
    execFileSync("git", ["-C", tmp, "add", "a.md", "b.md", "c.bin"]);

    const achados = acharCaminhosDeHome(tmp);
    assert.deepEqual(
      achados.map((a) => `${a.arquivo}:${a.linha}`),
      CONTROLES.map((_c, i) => `a.md:${i + 1}`),
    );
    for (const a of achados) assert.match(a.forma, /<usuário>$/);
    assert.ok(achados.every((a) => !a.forma.includes("fulano")), "a mensagem não repete o nome");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
