import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// B-MARCA-LOGIN-SIDEBAR (fatia L) — guardas de arquivo da marca Pátio Sul ERP (DESIGN_SYSTEM.md, "Marca Pátio Sul ERP").
//   T-L12 cor só por token: nenhum hexadecimal (nem rgb/rgba/hsl) em `LoginPage.tsx` e em `marca.css`; os tokens `--ps-*` do
//         login existem em `tokens.css` com os valores da seção 4.1 do plano (já corrigidos pela Emenda 2);
//   T-L13 o repositório é público: o PNG do logo mede 709 × 259 (sem a linha do site), lido do cabeçalho do arquivo;
//   T-L15 as 3 cores trocam os tokens pelo `data-tema` do elemento raiz (Branca e Preta), com os valores da maquete aprovada;
//   T-L20 os dois PNG medem 709 × 259 e 709 × 258: nenhum tem a faixa do site (que começa na linha 266 de 304 e na 1107 de
//         1262 dos originais), lidos do cabeçalho do arquivo.
// A sidebar estende este arquivo com os tokens `--ps-sb-*` (fatia S1).

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "../src");
const read = (relative: string) => readFileSync(resolve(SRC, relative), "utf8");
const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Os tokens `--ps-*` de um bloco do `tokens.css`, com o valor normalizado (sem espaço, minúsculo). */
function tokensOf(css: string, selector: string): Map<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // `(?<=\})`: o fecho do bloco anterior não é consumido, para dois blocos seguidos do mesmo seletor serem lidos.
  const blocks = [...bare.matchAll(new RegExp(`(?:^|(?<=\\}))\\s*${escaped}\\s*\\{([^}]*)\\}`, "g"))].map((match) => match[1]);
  const tokens = new Map<string, string>();
  for (const block of blocks) {
    for (const match of block.matchAll(/(--ps-[a-z0-9-]+)\s*:\s*([^;]+);/g)) tokens.set(match[1], normalize(match[2]));
  }
  return tokens;
}

const normalize = (value: string) => value.replace(/\s+/g, "").toLowerCase();

/** Seção 4.1 do plano, com a Emenda 2 (E2.4): os tokens do LOGIN e o valor de cada um. */
const LOGIN_TOKENS: ReadonlyArray<readonly [string, string]> = [
  ["--ps-grafite", "#3A3E3E"],
  ["--ps-grafite-fundo", "#2B2E2E"],
  ["--ps-painel", "linear-gradient(155deg,#6F7373 0%,#4C5050 45%,#2B2E2E 100%)"],
  ["--ps-brasa", "radial-gradient(60% 100% at 22% 100%,rgba(184,64,30,.55),rgba(184,64,30,0) 72%)"],
  ["--ps-filete", "linear-gradient(90deg,#FBB343,#B8401E)"],
  ["--ps-amarelo", "#FDC300"],
  ["--ps-amarelo-hover", "#E8B100"],
  ["--ps-sobre-amarelo", "#1A1A1A"],
  ["--ps-superficie", "#FFFFFF"],
  ["--ps-texto", "#232626"],
  ["--ps-texto-mudo", "#585C5C"],
  ["--ps-borda-campo", "#7A7E7E"],
  ["--ps-fio", "#E4E4E0"],
  ["--ps-link", "#7A5C00"],
  ["--ps-foco", "#232626"],
  ["--ps-foco-anel", "rgba(35,38,38,.22)"],
  ["--ps-perigo", "#B42318"],
  ["--ps-perigo-fundo", "#FDECEA"],
  ["--ps-perigo-borda", "#E9B8B0"],
];

/** PNG: largura e altura no cabeçalho IHDR (bytes 16 a 23), depois da assinatura de 8 bytes. */
function pngSize(relative: string): { readonly width: number; readonly height: number } {
  const bytes = readFileSync(resolve(SRC, relative));
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${relative} é PNG`);
  assert.equal(bytes.subarray(12, 16).toString("ascii"), "IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test("T-L12 cor só por token: sem cor solta no LoginPage.tsx nem no marca.css, e os tokens do login com os valores aprovados", () => {
  const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/gi;
  for (const file of ["pages/LoginPage.tsx", "styles/marca.css"]) {
    const hits = withoutComments(read(file)).match(COLOR_LITERAL) ?? [];
    assert.deepEqual(hits, [], `${file}: cor escrita solta`);
  }
  const css = read("styles/tokens/tokens.css");
  const root = tokensOf(css, ":root");
  for (const [token, value] of LOGIN_TOKENS) {
    assert.equal(root.get(token), normalize(value), `${token} no :root do tokens.css`);
  }
  // Todo token que a folha do login usa existe no tokens.css.
  const used = new Set([...read("styles/marca.css").matchAll(/var\((--ps-[a-z0-9-]+)\)/g)].map((match) => match[1]));
  assert.ok(used.size >= 15, `tokens usados pela folha do login: ${used.size}`);
  for (const token of used) assert.ok(root.has(token), `${token} usado no marca.css e ausente do tokens.css`);
});

test("T-L13 o PNG do logo do login mede 709 × 259 (sem a linha do site), lido do cabeçalho do arquivo", () => {
  assert.deepEqual(pngSize("brand/patiosul-logo-login.png"), { width: 709, height: 259 });
});

test("T-L15 as 3 cores: a Branca e a Preta trocam os tokens pelo data-tema do elemento raiz", () => {
  const css = read("styles/tokens/tokens.css");
  const root = tokensOf(css, ":root");
  const branca = tokensOf(css, ':root[data-tema="branca"]');
  const preta = tokensOf(css, ':root[data-tema="preta"]');
  const expected: Record<string, Record<string, string>> = {
    branca: {
      "--ps-grafite": "#F4F4F1",
      "--ps-grafite-fundo": "#ECECE8",
      "--ps-painel": "linear-gradient(155deg,#FFFFFF 0%,#FAFAF8 45%,#ECECE8 100%)",
      "--ps-painel-texto": "#232626",
      "--ps-brasa": "radial-gradient(60% 100% at 22% 100%,rgba(253,195,0,.18),rgba(253,195,0,0) 72%)",
      "--ps-cartao-borda": "#DFDFDA",
      "--ps-cartao-sombra": "0 6px 22px rgba(35,38,38,.10)",
    },
    preta: {
      "--ps-grafite": "#000000",
      "--ps-grafite-fundo": "#000000",
      "--ps-painel": "linear-gradient(155deg,#1C1C1C 0%,#0E0E0E 45%,#000000 100%)",
      "--ps-cartao-sombra": "0 12px 34px rgba(0,0,0,.60)",
    },
  };
  for (const [name, block] of [["branca", branca], ["preta", preta]] as const) {
    assert.deepEqual(
      Object.fromEntries([...block.entries()].sort()),
      Object.fromEntries(Object.entries(expected[name]).map(([token, value]) => [token, normalize(value)]).sort()),
      `os valores da ${name}`,
    );
    for (const [token, value] of block) {
      assert.ok(root.has(token), `${name}: ${token} existe na Grafite`);
      assert.notEqual(value, root.get(token), `${name}: ${token} muda de valor`);
    }
  }
  // A Grafite é a de fábrica: nenhum bloco `data-tema="grafite"` repete os valores.
  assert.equal(tokensOf(css, ':root[data-tema="grafite"]').size, 0);
  // A tela usa os tokens que trocam: o fundo, o painel, o texto do painel e o cartão.
  const marca = read("styles/marca.css");
  for (const token of ["--ps-grafite", "--ps-painel", "--ps-painel-texto", "--ps-cartao-borda", "--ps-cartao-sombra", "--ps-brasa"]) {
    assert.match(marca, new RegExp(`var\\(${token}\\)`), `a folha do login usa ${token}`);
  }
});

test("T-L20 os dois logos medem 709 × 259 e 709 × 258: nenhum tem a faixa do site", () => {
  const amarelo = pngSize("brand/patiosul-logo-login.png");
  const escuro = pngSize("brand/patiosul-logo-login-escuro.png");
  assert.deepEqual(amarelo, { width: 709, height: 259 }, "o de letras amarelas: cortado na linha 259 (o site começa na 266)");
  assert.deepEqual(escuro, { width: 709, height: 258 }, "o de letras pretas: cortado na linha 1077 de 1262 e reduzido a 709");
  // A proporção do corte: a faixa do site começa a 87,5% (266/304) e a 87,7% (1107/1262) da altura dos originais.
  assert.ok(amarelo.height / 304 < 266 / 304, "o amarelo para antes da faixa do site");
  assert.ok(escuro.height / Math.round((1262 * 709) / 2958) < 1107 / 1262, "o escuro para antes da faixa do site");
});
