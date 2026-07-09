import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { CommandPaletteView } from "../src/components/command-palette/CommandPalette";
import {
  buildCommandDestinations,
  filterDestinations,
  isOpenShortcut,
  nextIndex,
  resolvePaletteKey,
  type CommandDestination,
} from "../src/components/command-palette/logic";

// Papel amplo (gestor vê os 5 grupos da sidebar); a paleta filtra ainda por permissão
// real. Concede só um subconjunto para provar que oculta o que o papel NÃO pode acessar.
const GESTOR_ROLES = ["Gestor Operacional"];
const GRANTED = new Set(["dashboard:read", "work_orders:read", "notifications:read"]);
const canGranted = (permission: string) => GRANTED.has(permission);
const canAll = () => true;

// ── 1. Abre com Ctrl+K e ⌘K (preventDefault no atalho); ignora outras teclas ──
test("paleta: atalho Ctrl+K e ⌘K abrem; outras combinações não", () => {
  assert.equal(isOpenShortcut({ ctrlKey: true, key: "k" }), true);
  assert.equal(isOpenShortcut({ metaKey: true, key: "K" }), true);
  assert.equal(isOpenShortcut({ ctrlKey: true, key: "j" }), false);
  assert.equal(isOpenShortcut({ key: "k" }), false);
});

// ── 2. Lista SÓ destinos permitidos p/ o papel (mock permissions) e OCULTA o resto ──
test("paleta: destinos filtrados pela permissão do papel (oculta não-permitidos)", () => {
  const paths = buildCommandDestinations(GESTOR_ROLES, canGranted).map((d) => d.path);

  // Permitidos (permissão concedida) aparecem.
  assert.ok(paths.includes("/dashboard"), "Dashboard visível");
  assert.ok(paths.includes("/work-orders"), "Ordens de Serviço visível");
  assert.ok(paths.includes("/notifications"), "Notificações visível");

  // Sem a permissão correspondente → ocultos, mesmo que a sidebar do papel os liste.
  assert.equal(paths.includes("/finance"), false, "Financeiro oculto");
  assert.equal(paths.includes("/users"), false, "Usuários oculto");
  assert.equal(paths.includes("/cadastros/viaturas"), false, "Viaturas oculto");
  assert.equal(paths.includes("/inventory"), false, "Estoque oculto");
});

// ── 3. Digitar filtra por rótulo, sem sensibilidade a acento ──
test("paleta: filtro por texto casa rótulo sem acento-sensível", () => {
  const all = buildCommandDestinations(GESTOR_ROLES, canAll);

  // "servico" (sem cedilha) casa "Serviços"; "" retorna todos.
  const servicos = filterDestinations(all, "servico").map((d) => d.path);
  assert.ok(servicos.includes("/cadastros/servicos"));
  assert.equal(filterDestinations(all, "").length, all.length);

  // Filtro estreita o conjunto.
  const ordens = filterDestinations(all, "ordens");
  assert.ok(ordens.every((d) => /ordens/i.test(d.label)));
  assert.ok(ordens.length < all.length);
});

// ── 4. Enter navega ao destino selecionado ──
test("paleta: Enter resolve navegação para a rota do item ativo", () => {
  const results: CommandDestination[] = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Ordens de Serviço", path: "/work-orders" },
  ];
  assert.deepEqual(resolvePaletteKey("Enter", results, 1), { type: "navigate", path: "/work-orders" });
  // Lista vazia → Enter não navega.
  assert.deepEqual(resolvePaletteKey("Enter", [], 0), { type: "none" });
});

// ── 5. Esc fecha ──
test("paleta: Esc resolve fechamento", () => {
  assert.deepEqual(resolvePaletteKey("Escape", [], 0), { type: "close" });
});

// ── Setas movem a seleção de forma circular ──
test("paleta: setas movem a seleção com rolagem circular", () => {
  const results: CommandDestination[] = [
    { label: "A", path: "/a" },
    { label: "B", path: "/b" },
    { label: "C", path: "/c" },
  ];
  assert.deepEqual(resolvePaletteKey("ArrowDown", results, 0), { type: "move", index: 1 });
  assert.deepEqual(resolvePaletteKey("ArrowUp", results, 0), { type: "move", index: 2 });
  assert.equal(nextIndex(2, 1, 3), 0);
});

// ── 6. "Nenhum resultado" quando o filtro não casa nada ──
test("paleta: sem match retorna vazio e a view mostra 'Nenhum resultado'", () => {
  const all = buildCommandDestinations(GESTOR_ROLES, canAll);
  assert.equal(filterDestinations(all, "zzzz-nao-existe").length, 0);

  const html = renderToString(
    <CommandPaletteView
      query="zzzz-nao-existe"
      results={[]}
      activeIndex={0}
      onQueryChange={() => {}}
      onKeyDown={() => {}}
      onSelect={() => {}}
      onClose={() => {}}
    />,
  );
  assert.match(html, /Nenhum resultado/);
  assert.doesNotMatch(html, /role="option"/);
});

// ── 7. a11y: role=dialog + listbox/option + aria-selected/activedescendant ──
test("paleta: a11y (dialog, listbox, option ativo) e rótulos PT-BR permitidos", () => {
  const results = buildCommandDestinations(GESTOR_ROLES, canGranted);
  const html = renderToString(
    <CommandPaletteView
      query=""
      results={results}
      activeIndex={0}
      onQueryChange={() => {}}
      onKeyDown={() => {}}
      onSelect={() => {}}
      onClose={() => {}}
    />,
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-label="Ir para"/);
  assert.match(html, /role="listbox"/);
  assert.match(html, /role="option"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /aria-activedescendant="command-palette-list-option-0"/);

  // Só rótulos PT-BR de destinos permitidos; nada não-permitido.
  assert.match(html, /Dashboard/);
  assert.match(html, /Ordens de Serviço/);
  assert.match(html, /Notificações/);
  assert.doesNotMatch(html, /Financeiro/);
  assert.doesNotMatch(html, />Usuários</);
});
