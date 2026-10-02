import assert from "node:assert/strict";
import { mkdtempSync, rmSync, cpSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import {
  adaptChecklistRunsResponse,
} from "../src/modules/patios/processes/processes.adapter";
import type { ChecklistRunSummaryItem } from "../src/modules/patios/processes/processes.types";
import { ChecklistRunsPanel } from "../src/modules/patios/processes/components/ChecklistRunsPanel";
import { DossiePrintDocument } from "../src/modules/patios/processes/components/DossiePrintDocument";
import { VehicleDossieView, type VehicleDossieViewProps } from "../src/modules/patios/processes/components/VehicleDossieModal";
import type { ProcessDetail } from "../src/modules/patios/processes/processes.types";

// B-SAN3-11 — testes T1–T14: o dossiê rotula a vistoria substituída (item 8 do gate vendável).

const TEMPLATE_ID = "11111111-2222-4333-8444-111111111111";
const RELATED_ID  = "99999999-8888-4777-8666-999999999999";

// Cenário A: processo aberto ANTES da reabertura — só v1 na lista, mas v1 aponta v3 como vigente
const RUN_V1: ChecklistRunSummaryItem = {
  id: "run-v1", templateId: TEMPLATE_ID, templateName: "Vistoria de recolhimento",
  templateVersion: 1, status: "completed", relatedEntityType: "work_order", relatedEntityId: RELATED_ID,
  startedAt: "2026-09-01T10:00:00.000Z", completedAt: "2026-09-01T10:30:00.000Z",
  reopenedFromRunId: null, supersededByRunId: "run-v2", currentRunId: "run-v3",
};
const RUN_V2: ChecklistRunSummaryItem = {
  id: "run-v2", templateId: TEMPLATE_ID, templateName: "Vistoria de recolhimento",
  templateVersion: 1, status: "completed", relatedEntityType: "work_order", relatedEntityId: RELATED_ID,
  startedAt: "2026-09-02T10:00:00.000Z", completedAt: "2026-09-02T10:30:00.000Z",
  reopenedFromRunId: "run-v1", supersededByRunId: "run-v3", currentRunId: "run-v3",
};
const RUN_V3: ChecklistRunSummaryItem = {
  id: "run-v3", templateId: TEMPLATE_ID, templateName: "Vistoria de recolhimento",
  templateVersion: 1, status: "in_progress", relatedEntityType: "work_order", relatedEntityId: RELATED_ID,
  startedAt: "2026-09-03T10:00:00.000Z", completedAt: null,
  reopenedFromRunId: "run-v2", supersededByRunId: null, currentRunId: null,
};

// Cenário B: processo aberto DEPOIS — u1 (substituída) e u2 (vigente de reabertura) ambas na lista
const RUN_U1: ChecklistRunSummaryItem = {
  id: "run-u1", templateId: TEMPLATE_ID, templateName: "Checklist de avarias",
  templateVersion: 2, status: "completed", relatedEntityType: "work_order", relatedEntityId: RELATED_ID,
  startedAt: "2026-09-05T10:00:00.000Z", completedAt: "2026-09-05T11:00:00.000Z",
  reopenedFromRunId: null, supersededByRunId: "run-u2", currentRunId: "run-u2",
};
const RUN_U2: ChecklistRunSummaryItem = {
  id: "run-u2", templateId: TEMPLATE_ID, templateName: "Checklist de avarias",
  templateVersion: 2, status: "completed_with_divergence", relatedEntityType: "work_order", relatedEntityId: RELATED_ID,
  startedAt: "2026-09-06T10:00:00.000Z", completedAt: "2026-09-06T11:00:00.000Z",
  reopenedFromRunId: "run-u1", supersededByRunId: null, currentRunId: null,
};

// Vistoria única (sem reabertura)
const RUN_UNICO: ChecklistRunSummaryItem = {
  id: "run-unico", templateId: TEMPLATE_ID, templateName: "Checklist completo",
  templateVersion: 1, status: "completed", relatedEntityType: "work_order", relatedEntityId: RELATED_ID,
  startedAt: "2026-09-10T08:00:00.000Z", completedAt: "2026-09-10T08:30:00.000Z",
  reopenedFromRunId: null, supersededByRunId: null, currentRunId: null,
};

const PROCESS: ProcessDetail = {
  id: "550e8400-e29b-41d4-a716-446655440000", vehiclePlate: "ABC1D23", vehicleUnidentified: false,
  yardId: "yard-1", profileId: "prof-1", status: "ACTIVE_CUSTODY", statusLabel: "Custódia ativa",
  enteredAt: "2026-09-01T10:00:00.000Z", frozenAt: null, originAuthority: "DETRAN-SP",
  custodySeqHead: 1, createdAt: "2026-09-01T10:00:00.000Z", custodyHashHead: "seal-01",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

function renderPanel(runs: readonly ChecklistRunSummaryItem[]): string {
  return renderToString(<ChecklistRunsPanel runs={runs} loading={false} error={null} denied={false} onRetry={() => {}} />);
}

function trHtml(html: string, id: string): string {
  const start = html.indexOf(`id="vistoria-${id}"`);
  if (start === -1) return "";
  const trStart = html.lastIndexOf("<tr", start);
  const trEnd = html.indexOf("</tr>", start) + 5;
  return html.slice(trStart, trEnd);
}

// ─────────────── T1–T3: adapter preserva os 3 campos ───────────────

test("T1: adapter camelCase — 3 campos preservados", () => {
  const [run] = adaptChecklistRunsResponse({
    items: [{
      id: "x", templateId: TEMPLATE_ID, templateVersion: 1, status: "completed",
      startedAt: "2026-09-01T10:00:00.000Z", completedAt: null,
      reopenedFromRunId: null, supersededByRunId: "y", currentRunId: "z",
    }],
  });
  assert.strictEqual(run.reopenedFromRunId, null);
  assert.strictEqual(run.supersededByRunId, "y");
  assert.strictEqual(run.currentRunId, "z");
});

test("T2: adapter snake_case — 3 campos preservados", () => {
  const [run] = adaptChecklistRunsResponse({
    items: [{
      id: "x", template_id: TEMPLATE_ID, template_version: 1, status: "completed",
      started_at: "2026-09-01T10:00:00.000Z", completed_at: null,
      reopened_from_run_id: "prev", superseded_by_run_id: null, current_run_id: null,
    }],
  });
  assert.strictEqual(run.reopenedFromRunId, "prev");
  assert.strictEqual(run.supersededByRunId, null);
  assert.strictEqual(run.currentRunId, null);
});

test("T3: adapter chaves ausentes → null (não undefined)", () => {
  const [run] = adaptChecklistRunsResponse({
    items: [{ id: "x", templateId: TEMPLATE_ID, templateVersion: 1, status: "completed", startedAt: "2026-09-01T10:00:00.000Z" }],
  });
  assert.strictEqual(run.reopenedFromRunId, null);
  assert.strictEqual(run.supersededByRunId, null);
  assert.strictEqual(run.currentRunId, null);
});

// ─────────────── T4: substituída não tem chip verde (vermelho-controle via fixture) ───────────────

test("T4: substituída → 'Versão substituída', sem ui-tone-success, com 'Situação na época: Concluído'", () => {
  const html = renderPanel([RUN_V1]);
  const tr = trHtml(html, "run-v1");
  assert.match(tr, /Versão substituída/, "deve conter chip 'Versão substituída'");
  assert.doesNotMatch(tr, /ui-tone-success/, "NÃO deve ter tom de sucesso (seria bug — v1 é substituída)");
  assert.match(tr, /Situação na época: Concluído/, "deve mostrar o status histórico");
});

// ─────────────── T5/T5b: substituída COM vigente na lista ───────────────

test("T5: substituída com vigente na lista → frase + âncora; vigente aparece ACIMA (startedAt desc)", () => {
  const html = renderPanel([RUN_U2, RUN_U1]); // adapter ordena startedAt DESC; u2 mais recente vem antes
  const trU1 = trHtml(html, "run-u1");
  assert.match(trU1, /Versão vigente:/, "deve ter frase da vigente");
  assert.match(trU1, /href="#vistoria-run-u2"/, "âncora aponta a vigente (u2)");
  assert.ok(html.indexOf("vistoria-run-u2") < html.indexOf("vistoria-run-u1"), "vigente (u2, mais recente) antes da substituída (u1)");
});

test("T5b: cadeia v1→v2→v3 com as três na lista — v1 aponta v3 (fim da cadeia), v2 aponta v3, v3 é 'Versão atual'", () => {
  const html = renderPanel([RUN_V3, RUN_V2, RUN_V1]);
  const trV1 = trHtml(html, "run-v1");
  const trV2 = trHtml(html, "run-v2");
  assert.match(trV1, /href="#vistoria-run-v3"/, "v1 aponta v3 (currentRunId), não v2");
  assert.doesNotMatch(trV1, /href="#vistoria-run-v2"/, "v1 NÃO deve apontar v2");
  assert.match(trV2, /href="#vistoria-run-v3"/, "v2 aponta v3");
  assert.match(trHtml(html, "run-v3"), /Versão atual — substitui uma vistoria anterior/, "v3 é 'Versão atual'");
  assert.match(trHtml(html, "run-v3"), /href="#vistoria-run-v2"/, "v3 tem link para a anterior (v2)");
});

// ─────────────── T6: substituída SEM vigente na lista ───────────────

test("T6: substituída sem vigente na lista → frase fixa, nenhuma âncora href='#vistoria-'", () => {
  const html = renderPanel([RUN_V1]); // v2/v3 não estão na lista
  const trV1 = trHtml(html, "run-v1");
  assert.match(trV1, /A versão vigente desta vistoria não está vinculada a este dossiê\./);
  assert.doesNotMatch(trV1, /href="#vistoria-run-v3"/);
  assert.doesNotMatch(trV1, /href="#vistoria-run-v2"/);
});

// ─────────────── T7/T7b: vigente nascida de reabertura ───────────────

test("T7: vigente de reabertura sem anterior na lista → chip de status mantido + 'Versão atual', sem 'Ver versão anterior'", () => {
  const html = renderPanel([RUN_U2]); // u1 não está na lista
  const trU2 = trHtml(html, "run-u2");
  assert.match(trU2, /Versão atual — substitui uma vistoria anterior/);
  assert.match(trU2, /ui-tone-warning/, "chip de status mantido (completed_with_divergence → warning)");
  assert.doesNotMatch(trU2, /Ver versão anterior/);
});

test("T7b: vigente de reabertura COM anterior na lista → 'Ver versão anterior' com âncora", () => {
  const html = renderPanel([RUN_U1, RUN_U2]);
  const trU2 = trHtml(html, "run-u2");
  assert.match(trU2, /Ver versão anterior/);
  assert.match(trU2, /href="#vistoria-run-u1"/);
});

// ─────────────── T8: única (null/null/null) — linha idêntica à de hoje ───────────────

test("T8: vistoria única (sem reabertura) → sem 'Versão', sem âncora de versão", () => {
  const html = renderPanel([RUN_UNICO]);
  const tr = trHtml(html, "run-unico");
  assert.doesNotMatch(tr, /Versão substituída/);
  assert.doesNotMatch(tr, /Versão atual/);
  assert.doesNotMatch(tr, /href="#vistoria-/);
  assert.match(tr, /Concluído/); // chip de status normal
});

// ─────────────── T9: impressão com substituída ───────────────

test("T9: DossiePrintDocument com substituída → 'Versão substituída' presente, sem ui-tone-success", () => {
  const html = renderToString(
    <DossiePrintDocument
      process={PROCESS} issuedAt="2026-09-10T10:00:00.000Z" orgName="Org" yardName="Pátio"
      currentSpot={null} inspection={null} verify={null} events={[]} statement={null}
      canReadChecklist checklistRuns={[RUN_V1]} historyItems={[]}
    />,
  );
  assert.match(html, /Versão substituída/);
  const tr = trHtml(html, "run-v1");
  assert.doesNotMatch(tr, /ui-tone-success/);
});

// ─────────────── T10: integração no modal ───────────────

test("T10: VehicleDossieView aba checklist com substituída → texto presente; canReadChecklist=false → ausente", () => {
  const baseProps: VehicleDossieViewProps = {
    canRead: true, loading: false, error: null, notFound: false, process: PROCESS,
    events: [], verify: null, inspection: null, yardName: "Pátio", currentSpot: null,
    statement: null, statementLoading: false, statementError: null, statementDenied: false,
    canCreateCharge: false, canTransition: false,
    canReadChecklist: true, checklistRuns: [RUN_V1], checklistLoading: false, checklistError: null, checklistDenied: false,
    historyItems: [], historyLoading: false, historyError: null,
    context: {}, activeTab: "checklist", onTabChange: () => {}, onReload: () => {}, onReloadStatement: () => {},
    onReloadChecklist: () => {}, onReloadHistory: () => {}, onReloadAll: () => {}, onLaunchCharge: () => {},
    onPrint: () => {}, printReady: true,
  };
  const htmlWith = renderToString(<VehicleDossieView {...baseProps} />);
  assert.match(htmlWith, /Versão substituída/);
  const htmlWithout = renderToString(<VehicleDossieView {...baseProps} canReadChecklist={false} />);
  assert.doesNotMatch(htmlWithout, /Versão substituída/);
});

// ─────────────── T11: §allowlist — ids só em atributos, sem UUID/tenant como texto ───────────────

test("T11: HTML sem tags não casa UUID nem 'tenant'/'work_order'; ids só em id=/href=", () => {
  const html = renderPanel([RUN_V1, RUN_U1, RUN_U2]);
  // sem tags, nenhum UUID aparece como texto
  const textOnly = html.replace(/<[^>]*>/g, " ");
  assert.doesNotMatch(textOnly, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.doesNotMatch(textOnly, /\btenant\b/i);
  assert.doesNotMatch(textOnly, /work_order/);
  // com tags, ids aparecem apenas em id=" e href="#
  assert.match(html, /id="vistoria-run-v1"/);
  assert.match(html, /href="#vistoria-run-u2"/);
  // ids não-UUID usados no teste não disparam falso positivo
  assert.doesNotMatch(textOnly, /run-v1|run-u1|run-u2/);
  // Teste extra com UUID real: o id fica em atributo, não em texto
  const uuidRun: ChecklistRunSummaryItem = {
    id: TEMPLATE_ID, templateId: TEMPLATE_ID, templateName: "Teste UUID",
    templateVersion: 1, status: "completed", relatedEntityType: null, relatedEntityId: null,
    startedAt: "2026-09-01T10:00:00.000Z", completedAt: null,
    reopenedFromRunId: null, supersededByRunId: null, currentRunId: null,
  };
  const htmlUuid = renderPanel([uuidRun]);
  const textUuid = htmlUuid.replace(/<[^>]*>/g, " ");
  assert.doesNotMatch(textUuid, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, "UUID não deve aparecer como texto");
  assert.match(htmlUuid, new RegExp(`id="vistoria-${TEMPLATE_ID}"`), "UUID aparece como atributo id");
});

// ─────────────── T12–T14: guard gerado (CE-G1) ───────────────

const _dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(_dir, "../..");
const FRONTEND_ROOT = resolve(_dir, "..");
const CENSO_SCRIPT = join(REPO_ROOT, "scripts", "san3-11-dossie-vistoria-censo.mjs");

function runCenso(root: string, env?: Record<string, string>): { exitCode: number; stdout: string } {
  const result = spawnSync(process.execPath, [CENSO_SCRIPT, root], {
    env: { ...process.env, TS_ROOT: FRONTEND_ROOT, ...env },
    encoding: "utf8",
    // SEM teto (ERRATA 1, §15.2 P-A): o relógio não é veredito. O tempo é do runner/CI, de fora, e uma morte lá aparece como morte.
  });
  if (result.error) throw new Error(`gerador não executou: ${result.error.message}`);
  if (result.status === null) throw new Error(`gerador morto por sinal ${result.signal} — não é veredito (ERRATA 1)`);
  return { exitCode: result.status, stdout: result.stdout ?? "" };
}

// Mutação de texto-fonte em qualquer EOL de checkout, com PROVA de que aplicou antes de o gerador correr (ERRATA 1, §15.2 P-B).
function mutate(path: string, fn: (src: string) => string): void {
  const original = readFileSync(path, "utf8").replace(/\r\n/g, "\n"); // qualquer EOL de checkout → LF (ERRATA 1, P-B)
  const mutated = fn(original);
  if (mutated === original) throw new Error(`mutação não aplicou em ${path} (ERRATA 1)`);
  writeFileSync(path, mutated);
}

test("T12: gerador no head → DESCARTADAS 0, pontos sem consulta 0, exit 0", () => {
  const { exitCode, stdout } = runCenso(REPO_ROOT);
  assert.match(stdout, /DESCARTADAS pelo espelho \(0\): ∅/, "espelho sem descarte");
  assert.match(stdout, /DESCARTADAS pelo adapter \(0\): ∅/, "adapter sem descarte");
  assert.match(stdout, /pontos sem consulta=0/, "nenhum ponto sem consulta");
  assert.strictEqual(exitCode, 0, `gerador deve sair 0; stdout:\n${stdout}`);
});

test("T13: mutação 1 — ponto novo sem consulta em DossiePrintDocument → gerador exit 1", () => {
  const tmp = mkdtempSync(join(tmpdir(), ".tmp-censo-"));
  try {
    // Copia apenas os arquivos que o gerador lê
    cpSync(join(REPO_ROOT, "src", "modules", "impound", "impound.checklist-link.dto.ts"),
      join(tmp, "src", "modules", "impound", "impound.checklist-link.dto.ts"), { recursive: true });
    cpSync(join(REPO_ROOT, "frontend", "src"), join(tmp, "frontend", "src"), { recursive: true });
    writeFileSync(join(tmp, "frontend", "package.json"), readFileSync(join(FRONTEND_ROOT, "package.json")));
    // Injeta ponto de apresentação sem consulta em DossiePrintDocument — UMA mutação, sobre o elemento real (runs=), com prova (ERRATA 1)
    const printPath = join(tmp, "frontend", "src", "modules", "patios", "processes", "components", "DossiePrintDocument.tsx");
    mutate(printPath, (s) => s.replace(/(<ChecklistRunsPanel[^>]*\/>)/, `$1\n{checklistRuns.map((run) => React.createElement("span", {key: run.id}, run.status))}`));
    const { exitCode, stdout } = runCenso(tmp, { TS_ROOT: FRONTEND_ROOT });
    assert.strictEqual(exitCode, 1, `mutação 1 deve deixar gerador vermelho; stdout:\n${stdout}`);
    assert.match(stdout, /pontos sem consulta=[1-9]/, "deve reportar ponto sem consulta");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("T14: mutação 2 — adapter sem supersededByRunId → DESCARTADAS pelo adapter (1), exit 1", () => {
  const tmp = mkdtempSync(join(tmpdir(), ".tmp-censo-"));
  try {
    cpSync(join(REPO_ROOT, "src", "modules", "impound", "impound.checklist-link.dto.ts"),
      join(tmp, "src", "modules", "impound", "impound.checklist-link.dto.ts"), { recursive: true });
    cpSync(join(REPO_ROOT, "frontend", "src"), join(tmp, "frontend", "src"), { recursive: true });
    writeFileSync(join(tmp, "frontend", "package.json"), readFileSync(join(FRONTEND_ROOT, "package.json")));
    // Remove supersededByRunId do adapter
    const adapterPath = join(tmp, "frontend", "src", "modules", "patios", "processes", "processes.adapter.ts");
    mutate(adapterPath, (s) => s.replace(/\s*supersededByRunId:.*\n/, "\n"));
    const { exitCode, stdout } = runCenso(tmp, { TS_ROOT: FRONTEND_ROOT });
    assert.strictEqual(exitCode, 1, `mutação 2 deve deixar gerador vermelho; stdout:\n${stdout}`);
    assert.match(stdout, /DESCARTADAS pelo adapter \([1-9]/, "deve reportar chave descartada");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
