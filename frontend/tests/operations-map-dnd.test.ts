import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  OS_DRAG_MIME,
  beginWorkOrderDrag,
  canDropOnTechnician,
  readDraggedWorkOrderId,
} from "../src/modules/operations/map/map/dnd";
import { OperationsIncomingCallsList } from "../src/modules/operations/map/components/OperationsIncomingCallsList";
import type { OperationsIncomingCall } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 (D5.3) — drag-and-drop NATIVO HTML5 (zero lib): arrastar card de OS até a linha do
// técnico aloca. Payload mínimo "text/os" (LGPD), linha "off" rejeita, gating por
// field_dispatch:create, caminho de teclado preservado (seleção + botão Alocar).

const SRC = new URL("../src/modules/operations/map/", import.meta.url);
const CALLS_SRC = readFileSync(fileURLToPath(new URL("components/OperationsIncomingCallsList.tsx", SRC)), "utf8");
const LIST_SRC = readFileSync(fileURLToPath(new URL("components/OperationsOperatorList.tsx", SRC)), "utf8");
const PAGE_SRC = readFileSync(fileURLToPath(new URL("pages/OperationsMapPage.tsx", SRC)), "utf8");
const CSS = readFileSync(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");

function makeCall(overrides: Partial<OperationsIncomingCall> = {}): OperationsIncomingCall {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Guincho",
    priority: "medium",
    customerName: "Cliente A",
    serviceAddress: null,
    scheduledFor: null,
    createdAt: "2026-07-19T11:00:00.000Z",
    slaDueAt: null,
    hasLocation: true,
    ...overrides,
  };
}

function makeDataTransfer() {
  const data = new Map<string, string>();
  return {
    data,
    effectAllowed: "",
    dropEffect: "",
    setData: (format: string, value: string) => void data.set(format, value),
    getData: (format: string) => data.get(format) ?? "",
  };
}

// 1 — dragstart: payload = SÓ o id da OS no tipo "text/os" (verbatim; LGPD sem coordenada/PII).
test("beginWorkOrderDrag grava só o id da OS em 'text/os' e effectAllowed=move", () => {
  const dt = makeDataTransfer();
  beginWorkOrderDrag(dt, "wo-123");
  assert.equal(OS_DRAG_MIME, "text/os");
  assert.equal(dt.data.get("text/os"), "wo-123");
  assert.equal(dt.data.size, 1); // NADA além do id
  assert.equal(dt.effectAllowed, "move");
});

// 2 — drop: readDraggedWorkOrderId lê o payload; vazio/ausente → null (drop ignorado).
test("readDraggedWorkOrderId devolve o id ou null quando o payload não existe", () => {
  const dt = makeDataTransfer();
  beginWorkOrderDrag(dt, "wo-9");
  assert.equal(readDraggedWorkOrderId(dt), "wo-9");
  assert.equal(readDraggedWorkOrderId(makeDataTransfer()), null);
});

// 3 — linha "off" NÃO aceita drop; sem permissão de alocar nenhum grupo aceita (gating D5).
test("canDropOnTechnician: 'off' rejeita sempre; sem permissão nada aceita; ativo com permissão aceita", () => {
  assert.equal(canDropOnTechnician("disp", true), true);
  assert.equal(canDropOnTechnician("rota", true), true);
  assert.equal(canDropOnTechnician("atend", true), true);
  assert.equal(canDropOnTechnician("off", true), false);
  assert.equal(canDropOnTechnician("disp", false), false);
  assert.equal(canDropOnTechnician("off", false), false);
});

// 4 — card: draggable GATED por permissão; dragstart seleciona SEM pan e liga a classe .dragging.
test("card de OS: draggable gated; dragstart usa beginWorkOrderDrag + seleção sem pan + .dragging", () => {
  const semPermissao = renderToString(
    createElement(OperationsIncomingCallsList, { calls: [makeCall()], onSelect: () => undefined }),
  );
  assert.doesNotMatch(semPermissao, /draggable="true"/);
  const comPermissao = renderToString(
    createElement(OperationsIncomingCallsList, { calls: [makeCall()], onSelect: () => undefined, draggableEnabled: true }),
  );
  assert.match(comPermissao, /draggable="true"/);
  // Fiação do componente: helper puro + seleção sem pan + estado de dragging (classe .dragging do CSS).
  assert.match(CALLS_SRC, /beginWorkOrderDrag\(event\.dataTransfer, call\.id\)/);
  assert.match(CALLS_SRC, /onSelect\(call, \{ pan: false \}\)/);
  assert.match(CALLS_SRC, /setDraggingId\(call\.id\)/);
  assert.match(CSS, /\.opmap-os\.dragging\s*\{[^}]*opacity:\s*0\.45/);
});

// 5 — linha do técnico: dragover/drop usam os helpers (droptarget verde liga/desliga; drop chama
//     onDropAllocate com o id lido do payload).
test("trow: dragOver/drop via canDropOnTechnician/readDraggedWorkOrderId → onDropAllocate(os, tec)", () => {
  assert.match(LIST_SRC, /canDropOnTechnician\(group, dropEnabled\)/);
  assert.match(LIST_SRC, /readDraggedWorkOrderId\(event\.dataTransfer\)/);
  assert.match(LIST_SRC, /onDropAllocate\?\.\(workOrderId, location\)/);
  assert.match(LIST_SRC, /setDropTargetId\(location\.id\)/);
  assert.match(LIST_SRC, /onDragLeave/);
  // droptarget verde do protótipo.
  assert.match(CSS, /\.opmap-trow\.droptarget\s*\{[^}]*rgb\(34 197 94 \/ 16%\)/);
  assert.match(CSS, /\.opmap-trow\.droptarget\s*\{[^}]*border-color:\s*#22c55e/);
});

// 6 — página: o drop converge no MESMO performAllocation dos demais gestos (endpoint real #241);
//     caminho de teclado preservado (seleção + botão Alocar da linha).
test("página: handleDropAllocate → performAllocation (mesma verdade), a11y via seleção+Alocar", () => {
  assert.match(PAGE_SRC, /const handleDropAllocate = useCallback\(/);
  assert.match(PAGE_SRC, /void performAllocation\(\{ id: call\.id, code: call\.code \}, location\)/);
  assert.match(PAGE_SRC, /onDropAllocate=\{handleDropAllocate\}/);
  // Caminho de teclado: o botão Alocar por linha existe no painel (gated), sem depender do mouse.
  assert.match(LIST_SRC, /aria-label=\{`Alocar chamado selecionado para \$\{location\.displayName\}`\}/);
});
