import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { Modal } from "../src/components/ui";

// Ω-VID PR-06 — variante `size="lg"` do Modal do design system (base do dossiê do veículo, PR-07).
// Testes de estrutura (renderToString), mesmo padrão dos demais smoke tests deste repo.

test("Modal size=lg: aplica a classe ui-modal--lg e envolve o children num body scrollável", () => {
  const html = renderToString(
    <Modal title="Dossiê do veículo" open size="lg" onClose={() => {}}>
      <p>conteúdo do dossiê</p>
    </Modal>,
  );
  assert.match(html, /class="ui-modal ui-modal--lg"/);
  assert.match(html, /class="ui-modal__body"/);
  // o children fica DENTRO do body (para o scroll interno da variante grande)
  assert.match(html, /class="ui-modal__body">.*conteúdo do dossiê/s);
});

test("Modal size=lg: mantém role=dialog + aria-modal + aria-label + botão de fechar (X)", () => {
  const html = renderToString(
    <Modal title="Dossiê do veículo" open size="lg" onClose={() => {}}>
      <p>x</p>
    </Modal>,
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-label="Dossiê do veículo"/);
  assert.match(html, /aria-label="Fechar"/); // botão X
  assert.match(html, /<svg/); // ícone do X (lucide)
});

test("Modal default (md): NÃO recebe a variante lg nem o wrapper — modais existentes intocados", () => {
  const html = renderToString(
    <Modal title="Novo processo" open onClose={() => {}}>
      <form>campo</form>
    </Modal>,
  );
  assert.match(html, /class="ui-modal"/);
  assert.doesNotMatch(html, /ui-modal--lg/);
  assert.doesNotMatch(html, /ui-modal__body/); // md renderiza o children direto, sem body-div
  assert.match(html, /<form>campo<\/form>/); // children direto, byte-idêntico ao comportamento anterior
});

test("Modal fechado (open=false) não renderiza nada, mesmo em size=lg", () => {
  const html = renderToString(
    <Modal title="Dossiê" open={false} size="lg" onClose={() => {}}>
      <p>invisível</p>
    </Modal>,
  );
  assert.equal(html, "");
});
