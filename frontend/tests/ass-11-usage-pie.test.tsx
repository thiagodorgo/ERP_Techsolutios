import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { OVER_LIMIT_NOTE, UsageBadge, UsagePie, type UsagePieProps } from "../src/components/charts";

// B-ASS-11 (F1, Emenda 1 §8.1) — a pizza cheia da franquia, na biblioteca (`components/charts/UsagePie.tsx`):
//   T-U1 "7 de 10 usuários";  T-U2 acima do limite: selo, a frase da franquia e "23 de 20", sem o excedente em número;
//   T-U3 sem medição: "— de 50 GB" e "Em estimativa";  T-U4 limite 0 sem NaN nem Infinity;  T-U5 "11,5";
//   T-U6 role="img" com aria-label que traz os dois números, e nenhum "R$".

/** O texto que a pessoa lê: sem os comentários que o React põe entre nós de texto e sem as tags. */
function visibleText(html: string): string {
  return html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function render(props: UsagePieProps): string {
  return renderToString(
    <>
      <UsageBadge overLimit={props.overLimit} pending={props.pending} />
      <UsagePie {...props} rows />
    </>,
  );
}

test("T-U1 used 7, included 10, unit \"usuários\" → \"7 de 10 usuários\"", () => {
  const html = render({ used: 7, included: 10, unit: "usuários", label: "Usuários", overLimit: false });
  assert.match(visibleText(html), /\b7 de 10 usuários\b/);
  assert.match(visibleText(html), /70% da franquia/);
});

test("T-U2 used 23, included 20 → \"Passou do limite\", a frase da franquia e \"23 de 20\"; nenhum texto com o excedente", () => {
  const html = render({ used: 23, included: 20, unit: "usuários", label: "Usuários", overLimit: true });
  const text = visibleText(html);
  assert.match(text, /Passou do limite/);
  assert.equal(OVER_LIMIT_NOTE, "acima da franquia — o excedente será cobrado");
  assert.ok(text.includes(OVER_LIMIT_NOTE), `a frase da franquia: ${text}`);
  assert.match(text, /\b23 de 20 usuários\b/);
  for (const excess of [/\b3 a mais\b/i, /excedente de 3/i, /\b3 usuários? acima\b/i, /\+ ?3\b/, /\b115%/]) assert.doesNotMatch(text, excess);
  assert.doesNotMatch(text, /Disponível/, "acima do limite não há 'disponível'");
  assert.match(html, /class="ui-usage-pie__over"/, "a pizza inteira na cor crítica");
});

test("T-U3 pending → \"— de 50 GB\" e \"Em estimativa\"", () => {
  const html = render({ used: 0, included: 50, unit: "GB", label: "Espaço", overLimit: false, pending: true });
  const text = visibleText(html);
  assert.match(text, /— de 50 GB/);
  assert.match(text, /Em estimativa/);
  assert.doesNotMatch(text, /\b0 de 50\b/, "sem medição, nunca \"0 de 50\"");
});

test("T-U4 included 0 → renderiza sem NaN nem Infinity", () => {
  for (const props of [
    { used: 0, included: 0, unit: "usuários", label: "Usuários", overLimit: false },
    { used: 3, included: 0, unit: "usuários", label: "Usuários", overLimit: true },
    { used: 0, included: 0, unit: "GB", label: "Espaço", overLimit: false },
  ] as const) {
    const html = render(props);
    assert.doesNotMatch(html, /NaN|Infinity/, JSON.stringify(props));
  }
});

test("T-U5 used 11.5 → \"11,5\"", () => {
  const html = render({ used: 11.5, included: 50, unit: "GB", label: "Espaço", overLimit: false });
  assert.match(visibleText(html), /\b11,5 de 50 GB\b/);
  assert.doesNotMatch(visibleText(html), /11\.5/);
});

test("T-U6 role=\"img\" com aria-label que traz os dois números; nenhum \"R$\"", () => {
  for (const props of [
    { used: 18, included: 20, unit: "usuários", label: "Usuários", overLimit: false },
    { used: 57, included: 50, unit: "GB", label: "Espaço", overLimit: true },
  ] as const) {
    const html = render(props);
    const labels = [...html.matchAll(/<svg[^>]*role="img"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(labels.length, 1, `uma imagem acessível: ${JSON.stringify(labels)}`);
    assert.ok(labels[0].includes(String(props.used)) && labels[0].includes(String(props.included)), labels[0]);
    assert.doesNotMatch(html, /R\$/);
  }
});
