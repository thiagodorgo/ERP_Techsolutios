import assert from "node:assert/strict";
import test from "node:test";

import { AlertTriangle } from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StatusPill } from "../src/components/patterns";

// B-ASS-11 (REV576-04, `D-TELAS-SEGUEM-O-PADRAO`) — o `StatusPill` da biblioteca ganha a variante `icon`, para os selos
// que a referência aprovada desenha com ícone. A variante é opcional e NÃO muda quem já usa o selo: sem `icon`, o HTML é
// byte a byte o de antes (os 4 literais abaixo são a saída do `StatusPill` da `main` `4acd14ad`, medida antes da mudança).

const BEFORE: readonly (readonly [Parameters<typeof StatusPill>[0], string])[] = [
  [{ label: "Registrado", bg: "#EFF6FF", fg: "#1D4ED8" }, '<span class="pat-pill" style="background:#EFF6FF;color:#1D4ED8">Registrado</span>'],
  [{ label: "Depositado", bg: "#F5F3FF", fg: "#6D28D9", sm: true }, '<span class="pat-pill pat-pill--sm" style="background:#F5F3FF;color:#6D28D9">Depositado</span>'],
  [
    { label: "Dados demonstrativos", bg: "#EFF6FF", fg: "#2563EB", dot: "#2563EB" },
    '<span class="pat-pill" style="background:#EFF6FF;color:#2563EB"><span class="pat-pill__dot" style="background:#2563EB" aria-hidden="true"></span>Dados demonstrativos</span>',
  ],
  [
    { label: "Em execução", bg: "#ECFDF5", fg: "#047857", dot: "#10B981", sm: true },
    '<span class="pat-pill pat-pill--sm" style="background:#ECFDF5;color:#047857"><span class="pat-pill__dot" style="background:#10B981" aria-hidden="true"></span>Em execução</span>',
  ],
];

test("sem icon, o StatusPill sai byte a byte como antes (texto, sm e ponto)", () => {
  for (const [props, html] of BEFORE) assert.equal(renderToStaticMarkup(<StatusPill {...props} />), html, props.label);
});

test("com icon, o ícone vem antes do rótulo, escondido do leitor de tela, e o ponto não aparece", () => {
  const html = renderToStaticMarkup(<StatusPill label="Passou do limite" bg="#fee2e2" fg="#b91c1c" dot="#b91c1c" icon={<AlertTriangle size={12} />} />);
  assert.match(html, /^<span class="pat-pill" style="background:#fee2e2;color:#b91c1c"><span class="pat-pill__icon" aria-hidden="true"><svg[^>]*>[\s\S]*<\/svg><\/span>Passou do limite<\/span>$/);
  assert.doesNotMatch(html, /pat-pill__dot/);
});
