import assert from "node:assert/strict";
import test from "node:test";

import React, { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Wallet } from "lucide-react";

import { DenseExpandableRow, DenseTable } from "../src/components/dense-list";
import { KpiStatCard } from "../src/components/patterns";

// B-SAN3-12b — biblioteca (§6.2 do plano): `DenseTable` com `renderDetail` + `expandedKey` e o novo `DenseExpandableRow`,
// no padrão `D-PADRAO-BLOCOS-CLICAVEIS` (linha de UMA altura, sem botão, que abre o detalhe logo abaixo, um por vez;
// Enter/Espaço alternam, Escape fecha), e `KpiStatCard` com `pressed` → `aria-pressed` (indicador que filtra).

type Row = { readonly id: string; readonly nome: string; readonly valor: string };
const ROWS: Row[] = [
  { id: "a", nome: "Cliente Alfa com um nome bem comprido que corta", valor: "R$ 10,00" },
  { id: "b", nome: "Cliente Beta", valor: "R$ 20,00" },
];
const COLUMNS = [
  { key: "nome", header: "Cliente", render: (r: Row) => r.nome },
  { key: "valor", header: "Valor", align: "right" as const, tabular: true, render: (r: Row) => r.valor },
];

function table(expandedKey: string | null) {
  return renderToStaticMarkup(
    <DenseTable
      columns={COLUMNS}
      rows={ROWS}
      keyForRow={(r) => r.id}
      sort={null}
      onSort={() => undefined}
      onRowClick={() => undefined}
      expandedKey={expandedKey}
      renderDetail={(r) => <div>{`Propriedades de ${r.id}`}</div>}
      cellTitle={(r, key) => (key === "nome" ? r.nome : undefined)}
    />,
  );
}

test("DenseTable com renderDetail: linhas do padrão (.pat-ab-row), foco por teclado, aria-expanded, sem botão na linha", () => {
  const html = table(null);
  assert.equal((html.match(/class="pat-ab-row"/g) ?? []).length, 2);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 2);
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 2);
  const body = html.slice(html.indexOf("<tbody>"));
  assert.doesNotMatch(body, /<button/, "a linha não tem botão de ação");
  assert.doesNotMatch(html, /pat-ab-detail-row/, "nada aberto");
  assert.match(html, /title="Cliente Alfa com um nome bem comprido que corta"/, "texto longo leva o texto inteiro no title");
});

test("DenseTable com renderDetail: só a linha de expandedKey abre, e o detalhe vem LOGO ABAIXO dela", () => {
  const html = table("a");
  assert.equal((html.match(/pat-ab-detail-row/g) ?? []).length, 1, "um detalhe por vez");
  assert.match(html, /aria-expanded="true"[^]*?<\/tr><tr class="pat-ab-detail-row"><td colspan="3" class="pat-ab-detail-cell">.*Propriedades de a/i);
  assert.doesNotMatch(html, /Propriedades de b/);
});

test("DenseTable SEM renderDetail continua a tabela .ui-table de sempre (regressão das 30 telas que a usam)", () => {
  const html = renderToStaticMarkup(<DenseTable columns={COLUMNS} rows={ROWS} keyForRow={(r) => r.id} sort={null} onSort={() => undefined} />);
  assert.match(html, /class="ui-table dense-table"/);
  assert.doesNotMatch(html, /pat-ab-row|aria-expanded|tabindex/);
});

/** Acha o <tr> da linha na árvore devolvida pelo componente (sem DOM) e devolve as props dele. */
function rowProps(element: ReactNode): Record<string, unknown> {
  const found: Record<string, unknown>[] = [];
  const visit = (node: ReactNode) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isValidElement(node)) return;
    const el = node as ReactElement<Record<string, unknown>>;
    if (el.type === "tr" && (el.props.className as string | undefined)?.includes("pat-ab-row")) found.push(el.props);
    visit(el.props.children as ReactNode);
  };
  visit(element);
  assert.equal(found.length, 1);
  return found[0];
}

function keyEvent(key: string) {
  let prevented = false;
  return { event: { key, preventDefault: () => void (prevented = true) }, prevented: () => prevented };
}

test("DenseExpandableRow: Enter e Espaço alternam (e impedem a rolagem); Escape fecha só a linha aberta; clique alterna", () => {
  const calls: string[] = [];
  const render = (expanded: boolean) =>
    rowProps(DenseExpandableRow({ rowKey: "a", expanded, colSpan: 3, onToggle: () => calls.push(expanded ? "fechar" : "abrir"), cells: [{ key: "x", content: "x" }, { key: "y", content: "y" }], detail: "d" }));

  const closed = render(false);
  for (const key of ["Enter", " "]) {
    const k = keyEvent(key);
    (closed.onKeyDown as (e: unknown) => void)(k.event);
    assert.equal(k.prevented(), true, `${JSON.stringify(key)} não rola a página`);
  }
  const esc = keyEvent("Escape");
  (closed.onKeyDown as (e: unknown) => void)(esc.event);
  (closed.onKeyDown as (e: unknown) => void)(keyEvent("Tab").event);
  (closed.onClick as () => void)();
  assert.deepEqual(calls, ["abrir", "abrir", "abrir"], "Escape e Tab não abrem; clique abre");

  calls.length = 0;
  (render(true).onKeyDown as (e: unknown) => void)(keyEvent("Escape").event);
  assert.deepEqual(calls, ["fechar"], "Escape fecha a linha aberta");
});

test("KpiStatCard: com onClick e pressed publica aria-pressed; sem pressed não inventa o atributo", () => {
  const on = renderToStaticMarkup(<KpiStatCard icon={Wallet} iconColor="#000" iconBg="#fff" value="R$ 1,00" label="Saldo" onClick={() => undefined} pressed />);
  const off = renderToStaticMarkup(<KpiStatCard icon={Wallet} iconColor="#000" iconBg="#fff" value="R$ 1,00" label="Saldo" onClick={() => undefined} pressed={false} />);
  const plain = renderToStaticMarkup(<KpiStatCard icon={Wallet} iconColor="#000" iconBg="#fff" value="R$ 1,00" label="Saldo" onClick={() => undefined} />);
  assert.match(on, /<button[^>]*aria-pressed="true"/);
  assert.match(off, /<button[^>]*aria-pressed="false"/);
  assert.doesNotMatch(plain, /aria-pressed/);
});
