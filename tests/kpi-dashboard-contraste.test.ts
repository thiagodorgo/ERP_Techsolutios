import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

// O painel de KPI é a página que o dono abre — no telefone, no escritório, em tema claro ou escuro.
// A revisão adversarial mediu e achou cinco pares reprovando: `--ink-3` falhava o mínimo NO TEMA
// CLARO nas três superfícies (e ele pinta todos os rótulos de eixo dos gráficos), o acento do menu
// caía a 1,52:1 porque invertia com o tema sobre um masthead que NÃO inverte, a série do app de campo
// ficava abaixo do piso de objeto gráfico, e o branco fixo sobre a marca dava 2,99:1 no escuro.
//
// Nenhum deles aparece "quebrado" numa captura de tela — é por isso que precisa ser medido, e por
// isso que a medição vira teste. Um tema é metade da entrega, não um extra.

const CSS = readFileSync(fileURLToPath(new URL("../Kpis/styles.css", import.meta.url)), "utf8");

/** Extrai os tokens de cor de um bloco de CSS. */
function tokensDe(bloco: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of bloco.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})/g)) out[m[1]] = m[2];
  return out;
}

const blocoRoot = /^:root \{([\s\S]*?)^\}/m.exec(CSS);
const blocoDark = /@media \(prefers-color-scheme: dark\) \{\s*:root \{([\s\S]*?)^ {2}\}/m.exec(CSS);
assert.ok(blocoRoot, "styles.css precisa de um bloco :root com a paleta completa");
assert.ok(blocoDark, "styles.css precisa do bloco @media (prefers-color-scheme: dark)");

const CLARO = tokensDe(blocoRoot![1]);
const ESCURO = { ...CLARO, ...tokensDe(blocoDark![1]) };

const canal = (h: string): number[] => {
  let s = h.replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const luminancia = (h: string): number => {
  const [r, g, b] = canal(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string): number => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [frente, fundo, piso, o que é na tela]
// Piso 4,5 = texto; piso 3,0 = objeto gráfico (linha de série, borda, acento não-textual).
const PARES: ReadonlyArray<readonly [string, string, number, string]> = [
  ["ink", "bg-panel", 4.5, "texto principal dos cartões"],
  ["ink-2", "bg-panel", 4.5, "texto corrente dos cartões"],
  ["ink-2", "bg-page", 4.5, "subtítulo das seções"],
  ["ink-3", "bg-panel", 4.5, "rótulos de eixo e legendas dos gráficos"],
  ["ink-3", "bg-page", 4.5, "kicker das seções"],
  ["ink-3", "bg-inset", 4.5, "texto auxiliar em superfície embutida"],
  ["ink-masthead", "bg-masthead", 4.5, "título do painel"],
  ["ink-masthead-2", "bg-masthead", 4.5, "linha de metadados do masthead"],
  ["brand", "bg-panel", 3.0, "acento sobre cartão"],
  ["masthead-accent", "bg-masthead", 3.0, "foco/hover do menu — o masthead NÃO inverte com o tema"],
  ["series-backend", "bg-panel", 3.0, "linha da série backend"],
  ["series-web", "bg-panel", 3.0, "linha da série console web"],
  ["series-campo", "bg-panel", 3.0, "linha da série app de campo"],
  ["on-brand", "brand", 4.5, "texto do chip de filtro selecionado e do passo 'próximo'"],
  ["on-ok", "ok", 3.0, "glifo de concluído sobre o verde semântico"],
  ["crit-text", "bg-panel", 4.5, "veredito de reprovação"],
  ["ok-text", "bg-panel", 4.5, "linha de achado corrigido"],
  ["warn-text", "bg-panel", 4.5, "linha de achado adiado"],
];

for (const [nome, tema] of [["claro", CLARO], ["escuro", ESCURO]] as const) {
  test(`painel: contraste mínimo no tema ${nome}`, () => {
    const falhas: string[] = [];
    for (const [fg, bg, piso, oque] of PARES) {
      assert.ok(tema[fg], `token --${fg} não existe no tema ${nome}`);
      assert.ok(tema[bg], `token --${bg} não existe no tema ${nome}`);
      const r = contraste(tema[fg], tema[bg]);
      if (r < piso) falhas.push(`--${fg} sobre --${bg}: ${r.toFixed(2)}:1 (piso ${piso}) — ${oque}`);
    }
    assert.deepEqual(falhas, [], `contraste insuficiente no tema ${nome}:\n  ${falhas.join("\n  ")}`);
  });
}

test("painel: nenhuma cor nasce dentro de um bloco de tema", () => {
  // O bug clássico de página ilegível: uma cor cuja ÚNICA definição está no @media escuro. No estado
  // não-marcado (a configuração padrão do sistema), o texto de um tema cai sobre o fundo do outro.
  const soNoEscuro = Object.keys(tokensDe(blocoDark![1])).filter((k) => !(k in CLARO));
  assert.deepEqual(soNoEscuro, [], `tokens definidos SÓ no tema escuro: ${soNoEscuro.join(", ")}`);
});

test("painel: cor literal não escapa do sistema de tokens", () => {
  // Um `#ffffff` cravado numa regra é uma cor que não acompanha o tema — foi exatamente assim que o
  // chip de filtro selecionado foi parar em 2,99:1 no escuro. Literais só podem existir na definição
  // dos tokens; qualquer regra abaixo do :root usa var().
  const corpo = CSS.slice(CSS.indexOf("[hidden]"));
  const literais = corpo
    .split("\n")
    .map((linha, i) => ({ linha, n: i }))
    .filter(({ linha }) => /:\s*#[0-9a-fA-F]{3,8}\b/.test(linha) && !/^\s*(\/\*|\*)/.test(linha))
    .map(({ linha }) => linha.trim());

  assert.deepEqual(
    literais,
    [],
    `cores literais fora da definição de tokens (usem var(--token)):\n  ${literais.join("\n  ")}`,
  );
});

test("painel: toda classe de marca SVG que o app.js emite tem regra no CSS", () => {
  // Um `<rect class="week-gap">` sem regra correspondente nasce com preenchimento PRETO do navegador.
  // Foi o que aconteceu: a marca de "semana sem medição" virou a maior barra do gráfico — pior que o
  // zero que ela substituiu, porque se lê como o valor mais alto. Nenhum teste de dado pega isso;
  // este pega.
  const APP = readFileSync(fileURLToPath(new URL("../Kpis/app.js", import.meta.url)), "utf8");
  const semFROZEN = APP.replace(/^var FROZEN = .*;$/m, "");

  const classes = new Set<string>();
  for (const m of semFROZEN.matchAll(/<(rect|circle|path|line|polyline|text)\b[^>]*class="([^"]+)"/g)) {
    for (const c of m[2].split(/\s+/)) {
      // O atributo é montado por concatenação, então pedaços de expressão aparecem aqui
      // (`(wk.spansGap`). Só interessa o que é um nome de classe de verdade.
      if (!/^[a-z][a-z0-9-]*$/i.test(c)) continue;
      if (c.startsWith("fill-") || c.startsWith("stroke-")) continue;
      classes.add(c);
    }
  }
  assert.ok(classes.size > 0, "não achei nenhuma classe de marca SVG no app.js — o extrator quebrou?");

  const semRegra = [...classes].filter((c) => !new RegExp(`\\.${c}\\b[^{]*\\{`).test(CSS));
  assert.deepEqual(
    semRegra,
    [],
    `classes usadas no SVG e sem regra no styles.css (o navegador as pinta de preto): ${semRegra.join(", ")}`,
  );
});

test("painel: body pinta o próprio fundo a partir de um token", () => {
  // Sem fundo explícito, a página compõe sobre o fundo de quem a hospeda — e herda o tema errado.
  const body = /(^|\})\s*body \{([\s\S]*?)\}/m.exec(CSS);
  assert.ok(body, "styles.css precisa de uma regra body");
  assert.match(body![2], /background:\s*var\(--/, "body precisa de background vindo de token");
});
