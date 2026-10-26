import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// B-SAN3-22 — fatia web da trava do modelo de checklist (plano E3 + E3-bis; CE-26…CE-32).
// O servidor é a autoridade: salvar, publicar e inativar/reativar levam o `updatedAt` lido (409 se alguém gravou
// depois) e toda resposta de modelo único traz `activeRuns` (vistorias em andamento). A tela antecipa a regra: com
// vistoria em andamento só os textos mudam; ausente = travado (fail-closed). Os dois estados ("campos travados" e
// "conflito ao salvar") saem nas 3 aparências aprovadas, conferidas contra os marcadores da referência
// `docs/claude-code-handoff/screen-refs/checklist-editor-estados-3opcoes.reference.html`.

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
  },
});
Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: { hidden: false, getElementById: () => null, createElement: () => ({ click() {} }) },
});

const REFERENCE = readFileSync(
  fileURLToPath(new URL("../../docs/claude-code-handoff/screen-refs/checklist-editor-estados-3opcoes.reference.html", import.meta.url)),
  "utf8",
);

const TENANT_ID = "ten-industrial-01";
const CHECKLIST_ID = "chk-trava-01";
const WRITE_PERMISSIONS = [
  "tenant_checklists:read",
  "tenant_checklists:create",
  "tenant_checklists:update",
  "tenant_checklists:publish",
  "checklist_runs:read",
] as const;

type AnyChecklist = import("../src/modules/checklists/types").TenantChecklist;

/** O modelo da referência: "Vistoria de coleta — Guincho", publicado, v4, 7 campos em 3 seções. */
function modelo(overrides: Partial<AnyChecklist> = {}): AnyChecklist {
  const field = (index: number, section: number, type: string, label: string, config: Record<string, unknown> = {}, required = true) => ({
    id: `cmp-${index}`,
    componentKey: `campo_${index}`,
    type,
    label,
    required,
    orderIndex: index,
    config: { sectionIndex: section, ...config },
    validationRules: {},
    visibilityRules: {},
  });
  return {
    id: CHECKLIST_ID,
    tenantId: TENANT_ID,
    name: "Vistoria de coleta — Guincho",
    type: "towing_collection",
    status: "published",
    version: 4,
    publishedAt: "2026-10-12T13:00:00.000Z",
    updatedAt: "2026-10-12T13:00:00.000Z",
    activeRuns: 4,
    schema: { source: "ckb_editor", sections: ["Veículo", "Avarias e fotos", "Entrega ao responsável"] },
    components: [
      field(0, 0, "vehicle_selector", "Tipo do veículo", { vehicleTypes: ["car", "motorcycle", "van"] }),
      field(1, 0, "single_choice", "Estado geral", { options: ["Bom", "Regular", "Ruim", "Sem condições de rodar"] }),
      field(2, 1, "damage_map", "Avarias encontradas", { markerTypes: ["scratch", "dent", "broken"], requireDescription: true }),
      field(3, 1, "photo_upload", "Fotos das 4 laterais", { minPhotos: 4, maxPhotos: 8, help: "Frente, traseira e as duas laterais" }),
      field(4, 1, "observation", "Observações do técnico", { multiline: true, maxLength: 500 }, false),
      field(5, 2, "acknowledgement", "Ciência do responsável", { requireObservation: false }),
      field(6, 2, "signature", "Assinatura do responsável", { requireName: true }),
    ],
    ...overrides,
  } as unknown as AnyChecklist;
}

async function renderEditor(options: {
  readonly checklist?: AnyChecklist;
  readonly appearance?: string | null;
  readonly selectedKey?: string;
  readonly conflict?: { latest: AnyChecklist; draftName?: string; draftLabel?: string };
  readonly block?: "runs" | "versao" | "campos";
  readonly permissions?: readonly string[];
  readonly foreignAppearance?: boolean;
} = {}): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  storage.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredSessionPermissions } = await import("./helpers/session-permissions");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { ChecklistEditorPage } = await import("../src/modules/checklists/pages/ChecklistEditorPage");
  const model = await import("../src/modules/checklists/checklist-editor.model");
  const { mockChecklistComponents } = await import("../src/modules/checklists/checklist.mock");

  const permissions = options.permissions ?? WRITE_PERMISSIONS;
  const session = mockSessionForEmail("gestor.web@techsolutions.example");
  setStoredSessionPermissions(session, permissions);
  storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: TENANT_ID,
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Matriz",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard", "tenant_checklist"],
      scope: "branch",
    }),
  );
  if (options.appearance !== undefined && options.appearance !== null) {
    const key = options.foreignAppearance ? `techsol.aparencia.${TENANT_ID}.outro-usuario` : `techsol.aparencia.${TENANT_ID}.${session.user.id}`;
    storage.set(key, JSON.stringify({ "checklist-editor": options.appearance }));
  }

  const checklist = options.checklist ?? modelo();
  let initialConflict;
  if (options.conflict) {
    let draft = model.createEditorDraftFromChecklist(checklist);
    if (options.conflict.draftName) draft = { ...draft, name: options.conflict.draftName };
    if (options.conflict.draftLabel) draft = model.updateEditorComponent(draft, draft.components[3]!.id, { label: options.conflict.draftLabel });
    initialConflict = { latest: options.conflict.latest, draft, openedAt: "2026-10-12T14:05:00.000Z" };
  }

  return renderToString(
    <MemoryRouter initialEntries={[`/administrator/checklists/${CHECKLIST_ID}`]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Routes>
              <Route
                path="/administrator/checklists/:checklistId"
                element={
                  <ChecklistEditorPage
                    initialChecklist={checklist}
                    initialComponents={mockChecklistComponents}
                    initialSelectedComponentKey={options.selectedKey}
                    initialConflict={initialConflict}
                    initialLockBlock={options.block}
                  />
                }
              />
            </Routes>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function visible(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
}

/** Marcador que precisa existir na referência aprovada E na tela renderizada. */
function assertMarker(html: string, marker: string, where: string) {
  assert.ok(REFERENCE.includes(marker), `marcador "${marker}" não existe na referência (${where}) — o teste lê dela`);
  assert.ok(html.includes(marker) || visible(html).includes(marker), `marcador da referência ausente na tela: "${marker}" (${where})`);
}

const outraPessoa = () =>
  modelo({
    activeRuns: 0,
    updatedAt: "2026-10-12T14:32:00.000Z",
    components: modelo().components.map((item) =>
      item.componentKey === "campo_3" ? { ...item, label: "Fotos das 4 laterais e do painel" } : item,
    ),
  });

// ── CE-26a — o token sai nos 4 gestos ─────────────────────────────────────────────────────────────

test("CE-26a: o payload do salvar leva o token da base; publicar e arquivar levam o token no corpo e na consulta", async () => {
  const model = await import("../src/modules/checklists/checklist-editor.model");
  const base = modelo();
  const payload = model.buildUpdateInputFromEditorDraft(model.createEditorDraftFromChecklist(base), base.schema, base.updatedAt);
  assert.equal(payload.expectedUpdatedAt, base.updatedAt);

  process.env.VITE_USE_MOCKS = "false";
  const adapter = await import("../src/modules/checklists/checklist.adapter");
  const calls: { url: string; method: string; body: unknown }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), method: String(init?.method), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(JSON.stringify({ data: { ...base, activeRuns: 0 } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const context = { tenantId: TENANT_ID, role: "Gestor", permissions: [] };
    await adapter.updateTenantChecklistFromApi(context, CHECKLIST_ID, { expectedUpdatedAt: base.updatedAt, status: "inactive" });
    await adapter.publishTenantChecklistFromApi(context, CHECKLIST_ID, "2026-10-12T13:00:00.123Z");
    await adapter.deleteTenantChecklistFromApi(context, CHECKLIST_ID, "2026-10-12T13:00:00.456Z").catch(() => undefined);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "true";
  }
  assert.equal(calls[0]!.method, "PATCH");
  assert.deepEqual(calls[0]!.body, { expectedUpdatedAt: base.updatedAt, status: "inactive" });
  assert.equal(calls[1]!.method, "POST");
  assert.match(calls[1]!.url, /\/tenant\/checklists\/chk-trava-01\/publish$/);
  assert.deepEqual(calls[1]!.body, { expectedUpdatedAt: "2026-10-12T13:00:00.123Z" });
  assert.equal(calls[2]!.method, "DELETE");
  assert.match(calls[2]!.url, /\?expectedUpdatedAt=2026-10-12T13%3A00%3A00\.456Z$/);
});

test("CE-26c: publicar depois de salvar usa o updatedAt DEVOLVIDO pelo salvar (o do fechamento daria 409 contra o próprio salvar)", async () => {
  const model = await import("../src/modules/checklists/checklist-editor.model");
  const mock = await import("../src/modules/checklists/checklist.mock");
  const before = await mock.getMockTenantChecklist("chk_technical_before_after");
  const draft = model.createEditorDraftFromChecklist(before);
  const saved = await mock.updateMockTenantChecklist(
    before.id,
    model.buildUpdateInputFromEditorDraft({ ...draft, name: `${draft.name} (rev.)` }, before.schema, before.updatedAt),
  );
  assert.notEqual(saved.updatedAt, before.updatedAt);
  assert.equal(model.publishTokenAfterSave(saved, before), saved.updatedAt);
  assert.equal(model.publishTokenAfterSave(null, before), before.updatedAt);

  // O token do fechamento (antes do salvar) é recusado como defasado — é o defeito que a CE-26c existe para pegar.
  await assert.rejects(mock.publishMockTenantChecklist(before.id, before.updatedAt), (error: unknown) => {
    assert.equal((error as { status?: number }).status, 409);
    assert.equal((error as { reason?: string }).reason, "template_changed_since_read");
    return true;
  });
  const published = await mock.publishMockTenantChecklist(before.id, model.publishTokenAfterSave(saved, before));
  assert.equal(published.status, "published");
});

// ── CE-26b — o 409 vira apresentação, nunca o toast genérico ──────────────────────────────────────

test("CE-26b: resolveSaveError separa conflito, vistoria em andamento e o resto pelo `reason` estável", async () => {
  const { resolveSaveError } = await import("../src/modules/checklists/checklist-editor.model");
  const { ApiError } = await import("../src/services/api/client");
  const msg = "Conflito de dados. Recarregue e tente novamente.";
  assert.equal(resolveSaveError(new ApiError(409, msg, "CHECKLIST_TEMPLATE_STALE", "template_changed_since_read")).kind, "conflict");
  assert.equal(resolveSaveError(new ApiError(409, msg, "CHECKLIST_TEMPLATE_IN_USE", "template_has_active_runs")).kind, "in_use");
  assert.equal(resolveSaveError(new ApiError(409, msg, "CHECKLIST_COMPONENT_IN_USE", "component_has_answers")).kind, "other");
  assert.equal(resolveSaveError(new ApiError(400, "x")).kind, "other");
  assert.equal(resolveSaveError(new Error("rede")).kind, "other");
});

test("CE-26b/E3b-14: o diálogo da A mantém o texto e ganha a linha de horário; sem 'Sobrescrever' no conflito do publicar", async () => {
  const { ConcurrentEditDialog } = await import("../src/modules/checklists/pages/ChecklistEditorPage");
  const { conflictWhenLine } = await import("../src/modules/checklists/checklist-editor.model");
  const when = conflictWhenLine("2026-10-12T14:32:00.000Z", "2026-10-12T14:05:00.000Z");
  assert.match(when, /^Salvo por outra pessoa às \d{2}:\d{2} · você abriu às \d{2}:\d{2}$/);
  assert.equal(conflictWhenLine("2026-10-12T14:32:00.000Z", null), "", "sem a hora de abertura, a linha não é inventada");

  const html = renderToString(<ConcurrentEditDialog when={when} onReload={() => {}} onOverwrite={() => {}} />);
  assert.match(html, /Este modelo foi alterado por outra pessoa depois que você o abriu\. Recarregar traz a versão mais recente/);
  assert.match(html, /class="ckb-ed-modal-when"/);
  assert.match(visible(html), /Salvo por outra pessoa às \d{2}:\d{2} · você abriu às \d{2}:\d{2}/);
  assert.match(html, /Sobrescrever mesmo assim/);

  const publishHtml = renderToString(<ConcurrentEditDialog when={when} onReload={() => {}} />);
  assert.match(publishHtml, /Recarregar o modelo/);
  assert.doesNotMatch(publishHtml, /Sobrescrever mesmo assim/);
});

// ── CE-27 — trava alimentada por toda resposta; ausente = travado ─────────────────────────────────

test("CE-27: nextEditorLock — 0 livre, N travado, ausente ou inválido NÃO CONFIRMADO (travado)", async () => {
  const { nextEditorLock } = await import("../src/modules/checklists/checklist-editor.model");
  assert.deepEqual(nextEditorLock({ activeRuns: 0 }), { kind: "free" });
  assert.deepEqual(nextEditorLock({ activeRuns: 2 }), { kind: "locked", activeRuns: 2 });
  assert.deepEqual(nextEditorLock({}), { kind: "unknown" });
  assert.deepEqual(nextEditorLock(undefined), { kind: "unknown" });
  assert.deepEqual(nextEditorLock({ activeRuns: -1 }), { kind: "unknown" });
  assert.deepEqual(nextEditorLock({ activeRuns: "2" }), { kind: "unknown" });
  assert.deepEqual(nextEditorLock({ activeRuns: 1.5 }), { kind: "unknown" });
});

test("CE-27: na tela, ausente trava com 'não foi possível confirmar'; 0 libera; N trava com a faixa que diz N", async () => {
  const unknown = await renderEditor({ checklist: modelo({ activeRuns: undefined }), appearance: "A" });
  assert.match(unknown, /Não foi possível confirmar se há vistorias em andamento/);
  assert.match(unknown, /aria-label="Adicionar campo|aria-label="Remover campo"[^>]*aria-disabled="true"/);
  assert.match(unknown, /class="ckb-ed-field-btn"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*class="ckb-ed-field-btn/);
  assert.match(unknown, /Recarregar o modelo/);

  const free = await renderEditor({ checklist: modelo({ activeRuns: 0 }), appearance: "A" });
  assert.doesNotMatch(free, /Não foi possível confirmar/);
  assert.doesNotMatch(free, /aria-disabled="true"[^>]*data-explica/);
  assert.doesNotMatch(free, /ckb-pill--inuse/);

  const locked = await renderEditor({ checklist: modelo({ activeRuns: 2 }), appearance: "A" });
  assert.match(visible(locked), /Há 2 vistorias em andamento com este modelo\. Agora só os textos podem mudar/);
  assert.match(locked, /ckb-pill--inuse/);
  assert.match(visible(locked), /Em uso por 2 vistorias/);
});

test("CE-27/E3b-19: releitura que falha depois de um 409 → não confirmado (travado), sem comparador", async () => {
  const { resolveWriteError } = await import("../src/modules/checklists/checklist-editor.model");
  const { ApiError } = await import("../src/services/api/client");
  const stale = new ApiError(409, "x", "CHECKLIST_TEMPLATE_STALE", "template_changed_since_read");
  const failed = await resolveWriteError(stale, async () => {
    throw new Error("rede");
  });
  assert.equal(failed.kind, "unknown");
  assert.match((failed as { message: string }).message, /Não foi possível confirmar se há vistorias em andamento/);
  const nulled = await resolveWriteError(stale, async () => null);
  assert.equal(nulled.kind, "unknown");
});

// ── CE-28 — 409 em uso: relê o detalhe e diz N ────────────────────────────────────────────────────

test("CE-28: 409 'vistoria em andamento' relê o detalhe e a cópia diz o N lido (não um número fixo)", async () => {
  const { resolveWriteError } = await import("../src/modules/checklists/checklist-editor.model");
  const { ApiError } = await import("../src/services/api/client");
  const inUse = new ApiError(409, "x", "CHECKLIST_TEMPLATE_IN_USE", "template_has_active_runs");
  let reads = 0;
  const outcome = await resolveWriteError(inUse, async () => {
    reads += 1;
    return modelo({ activeRuns: 3 });
  });
  assert.equal(reads, 1, "relê o detalhe uma vez");
  assert.equal(outcome.kind, "in_use");
  assert.match((outcome as { message: string }).message, /^Há 3 vistorias em andamento com este modelo\. Agora só os textos podem mudar; para mudar campos, inative o modelo e espere elas terminarem\.$/);
  const one = await resolveWriteError(inUse, async () => modelo({ activeRuns: 1 }));
  assert.match((one as { message: string }).message, /^Há 1 vistoria em andamento com este modelo\./);
});

// ── CE-29 — Reativar travado no editor; na lista, o PATCH direto e o N no 409 ─────────────────────

test("CE-29 (editor): Reativar travado com vistoria em andamento (aria-disabled + title que explica); Inativar livre e confirma", async () => {
  const { editorStatusAction } = await import("../src/modules/checklists/checklist-editor.model");
  const inactive = await renderEditor({ checklist: modelo({ status: "inactive", activeRuns: 2 }), appearance: "A" });
  const reactivate = /<button[^>]*aria-label="Reativar modelo"[^>]*>/.exec(inactive)?.[0] ?? "";
  assert.match(reactivate, /aria-disabled="true"/);
  assert.match(reactivate, /title="Reativar volta o modelo para rascunho, e isso cortaria as 2 vistorias em andamento\. Espere elas terminarem\."/);
  assert.doesNotMatch(reactivate, /\sdisabled=""/, "travado nunca usa disabled (não recebe foco nem explica)");

  const published = await renderEditor({ checklist: modelo({ activeRuns: 2 }), appearance: "A" });
  const inactivate = /<button[^>]*aria-label="Inativar modelo"[^>]*>/.exec(published)?.[0] ?? "";
  assert.ok(inactivate, "Inativar presente");
  assert.doesNotMatch(inactivate, /aria-disabled="true"/, "Inativar é sempre permitido");

  assert.deepEqual(editorStatusAction("published", { kind: "locked", activeRuns: 2 }), { kind: "confirm_inactivate" });
  assert.deepEqual(editorStatusAction("published", { kind: "free" }), { kind: "confirm_inactivate" });
  assert.deepEqual(editorStatusAction("inactive", { kind: "free" }), { kind: "reactivate" });
  assert.equal(editorStatusAction("inactive", { kind: "locked", activeRuns: 2 }).kind, "explain");
  assert.equal(editorStatusAction("inactive", { kind: "unknown" }).kind, "explain", "não confirmado também trava o Reativar");
});

test("CE-29 (lista): Reativar vai direto com o token; no 409 em uso relê o detalhe e avisa com N; Inativar segue livre", async () => {
  const { toggleChecklistStatusFromList } = await import("../src/modules/checklists/pages/TenantChecklistsPage");
  const { ApiError } = await import("../src/services/api/client");
  const row = modelo({ status: "inactive", activeRuns: undefined });
  const updates: unknown[] = [];
  let reads = 0;
  const result = await toggleChecklistStatusFromList(row, {
    update: async (_id, input) => {
      updates.push(input);
      throw new ApiError(409, "x", "CHECKLIST_TEMPLATE_IN_USE", "template_has_active_runs");
    },
    readDetail: async () => {
      reads += 1;
      return modelo({ status: "inactive", activeRuns: 2 });
    },
  });
  assert.deepEqual(updates, [{ status: "draft", expectedUpdatedAt: row.updatedAt }], "sem leitura prévia, com o token da linha");
  assert.equal(reads, 1);
  assert.equal(result.tone, "warn");
  assert.match(result.message, /cortaria as 2 vistorias em andamento/);

  const stale = await toggleChecklistStatusFromList(modelo({ activeRuns: undefined }), {
    update: async () => {
      throw new ApiError(409, "x", "CHECKLIST_TEMPLATE_STALE", "template_changed_since_read");
    },
    readDetail: async () => modelo({ updatedAt: "2026-10-12T15:00:00.000Z", activeRuns: 0 }),
  });
  assert.equal(stale.row?.updatedAt, "2026-10-12T15:00:00.000Z", "a linha é atualizada com a releitura");
  assert.match(stale.message, /Outra pessoa alterou este modelo/);

  const ok = await toggleChecklistStatusFromList(modelo({ activeRuns: undefined }), {
    update: async (_id, input) => ({ ...modelo(), status: input.status }),
    readDetail: async () => {
      throw new Error("não deveria reler");
    },
  });
  assert.equal(ok.tone, "ok");
  assert.match(ok.message, /Modelo inativado/);
});

// ── E3b-10 — remover seção travado; acrescentar e renomear livres ─────────────────────────────────

test("E3b-10: com vistoria em andamento, remover seção fica travado; 'Nova seção' e renomear seguem livres", async () => {
  const base = modelo({
    activeRuns: 2,
    schema: { source: "ckb_editor", sections: ["Veículo", "Seção vazia", "Avarias e fotos", "Entrega ao responsável"] },
    components: modelo().components.map((item) => ({
      ...item,
      config: { ...item.config, sectionIndex: (item.config.sectionIndex as number) === 0 ? 0 : (item.config.sectionIndex as number) + 1 },
    })),
  });
  const html = await renderEditor({ checklist: base, appearance: "A" });
  const remove = /<button[^>]*aria-label="Remover a seção Seção vazia"[^>]*>/.exec(html)?.[0] ?? "";
  assert.ok(remove, "o botão de remover a seção vazia existe");
  assert.match(remove, /aria-disabled="true"/);
  assert.match(remove, /Remover a seção move os campos seguintes/);
  const addSection = /<button[^>]*class="ckb-ed-ghost-btn"[^>]*>/.exec(html)?.[0] ?? "";
  assert.ok(addSection);
  assert.doesNotMatch(addSection, /aria-disabled/);
  assert.doesNotMatch(/<input[^>]*aria-label="Nome da seção"[^>]*>/.exec(html)?.[0] ?? "", /readOnly|readonly/);

  const free = await renderEditor({ checklist: { ...base, activeRuns: 0 }, appearance: "A" });
  const removeFree = /<button[^>]*aria-label="Remover a seção Seção vazia"[^>]*>/.exec(free)?.[0] ?? "";
  assert.doesNotMatch(removeFree, /aria-disabled/);
});

test("E3-11: com a trava, paleta, ações de campo, tipo, obrigatório e config ficam aria-disabled; pergunta e ajuda livres", async () => {
  const html = await renderEditor({ appearance: "A", selectedKey: "campo_3" });
  assert.match(/<select[^>]*class="ckb-ed-type"[^>]*>/.exec(html)?.[0] ?? "", /aria-disabled="true"[^>]*title="O tipo do modelo muda os campos: fica travado enquanto houver 4 vistorias em andamento\."/);
  assert.match(/<button[^>]*role="switch"[^>]*>/.exec(html)?.[0] ?? "", /aria-disabled="true"/);
  assert.match(/<input[^>]*id="ckb-insp-minphotos"[^>]*>/.exec(html)?.[0] ?? "", /aria-disabled="true"[^>]*title="O mínimo de fotos decide quando a vistoria pode ser concluída/);
  for (const action of ["Mover para cima", "Mover para baixo", "Duplicar campo", "Remover campo"]) {
    assert.match(new RegExp(`<button[^>]*aria-label="${action}"[^>]*>`).exec(html)?.[0] ?? "", /aria-disabled="true"/, action);
  }
  assert.doesNotMatch(/<input[^>]*id="ckb-insp-label"[^>]*>/.exec(html)?.[0] ?? "", /aria-disabled|readonly/i);
  assert.doesNotMatch(/<textarea[^>]*id="ckb-insp-help"[^>]*>/.exec(html)?.[0] ?? "", /aria-disabled|readonly/i);
  // Nunca `disabled` nos controles travados (o padrão do Publicar travado).
  assert.doesNotMatch(html, /aria-disabled="true"[^>]*disabled=""/);
});

// ── CE-30 — as 3 aparências × 2 estados, contra a referência ──────────────────────────────────────

test("CE-30: sem preferência → A; valor inválido → A; a escolha de outro usuário não vaza", async () => {
  const none = await renderEditor({ appearance: null });
  const invalid = await renderEditor({ appearance: "Z" });
  const foreign = await renderEditor({ appearance: "C", foreignAppearance: true });
  for (const [name, html] of [["sem preferência", none], ["inválida", invalid], ["de outro usuário", foreign]] as const) {
    assert.match(html, /Ver execuções deste modelo/, name);
    assert.doesNotMatch(html, /Em uso agora/, `${name}: não é a C`);
    assert.doesNotMatch(html, /pat-kpi--clickable/, `${name}: não é a B`);
    assert.match(visible(html), /Há 4 vistorias em andamento com este modelo\. Agora só os textos podem mudar: nome, descrição, nomes de seção, pergunta e ajuda\./, name);
  }
});

test("CE-30 A · Padrão fiel — campos travados e conflito", async () => {
  const travado = await renderEditor({ appearance: "A", selectedKey: "campo_3" });
  for (const marker of [
    "ckb-ed-blockbar",
    "Agora só os textos podem mudar: nome, descrição, nomes de seção, pergunta e ajuda. Para mudar campos, inative o modelo e espere as vistorias terminarem.",
    "ckb-pill ckb-pill--inuse",
    "Em uso por ",
    "ckb-ed-insp-warn",
    "A pergunta e a ajuda podem mudar agora. Obrigatório e as regras abaixo ficam travados enquanto houver ",
    "Ver execuções deste modelo",
  ]) {
    assertMarker(travado, marker, "A · travado");
  }
  const conflito = await renderEditor({ appearance: "A", checklist: modelo({ activeRuns: 0 }), conflict: { latest: outraPessoa(), draftName: "Vistoria de coleta — Guincho" } });
  for (const marker of ["ckb-ed-modal-overlay", "Outra pessoa alterou este modelo", "ckb-ed-modal-when", "Recarregar o modelo", "Sobrescrever mesmo assim"]) {
    assertMarker(conflito, marker, "A · conflito");
  }
  assert.match(visible(conflito), /Salvo por outra pessoa às \d{2}:\d{2} · você abriu às \d{2}:\d{2}/);
});

test("CE-30 B · Analítica — três blocos com números reais, nada fabricado e sem link morto", async () => {
  const travado = await renderEditor({ appearance: "B" });
  for (const marker of ["b22-faixa", "pat-kpi pat-kpi--clickable", "Vistorias em andamento", "usam este modelo agora", "Versão publicada", "Campos travados", "7 de 7", "ckb-ed-field-lock", "em uso"]) {
    assertMarker(travado, marker, "B · travado");
  }
  assert.equal((travado.match(/pat-kpi pat-kpi--clickable/g) ?? []).length, 3);
  assert.match(visible(travado), /v4/);
  assert.doesNotMatch(travado, /Ver execuções deste modelo/, "a B não tem o link (E3b-18)");
  assert.doesNotMatch(visible(travado), /versões no histórico|OS-\d+|há \d+ min/, "nada de lista ou série que o servidor não dá (D-007)");

  const campos = await renderEditor({ appearance: "B", block: "campos" });
  for (const marker of [
    "O que muda agora",
    "Nome do modelo, descrição e nomes de seção",
    "Pergunta e texto de ajuda de cada campo",
    "Obrigatório, mínimo de fotos, opções, tipos de veículo e de avaria",
    "Adicionar, remover, reordenar ou duplicar campo",
    "Tipo do modelo e voltar a rascunho",
    "pat-ab-table",
  ]) {
    assertMarker(campos, marker, "B · campos");
  }
  const versao = await renderEditor({ appearance: "B", block: "versao" });
  for (const marker of ["Publicada em", "Enquanto houver vistorias", "os campos ficam travados; só os textos mudam"]) {
    assertMarker(versao, marker, "B · versão");
  }
  const runs = await renderEditor({ appearance: "B", block: "runs" });
  assert.match(runs, /ckb-ed-blockbar ckb-ed-blockbar--destaque/, "o bloco de vistorias destaca a faixa que explica a trava");

  const conflito = await renderEditor({ appearance: "B", checklist: modelo({ activeRuns: 0 }), conflict: { latest: outraPessoa() } });
  assert.match(conflito, /class="ckb-ed-blockbar" role="alert"/);
  assert.match(visible(conflito), /Outra pessoa alterou este modelo às \d{2}:\d{2}, depois que você o abriu \(\d{2}:\d{2}\)\s*\.\s*1 diferença\s*:\s*“Fotos das 4 laterais e do painel” — pergunta\./);
  assert.doesNotMatch(conflito, /ckb-ed-modal-overlay/, "na B não há diálogo");
  assertMarker(conflito, "Recarregar o modelo", "B · conflito");
  assertMarker(conflito, "Sobrescrever mesmo assim", "B · conflito");
});

test("CE-30 C · Painel de impacto — 'Em uso agora', paleta compacta e 'Salvo × Seu'", async () => {
  const travado = await renderEditor({ appearance: "C", selectedKey: "campo_3" });
  for (const marker of [
    "Em uso agora",
    "vistorias em andamento usam este modelo",
    "c22-lista",
    "podem mudar agora",
    "Adicionar, remover, reordenar ou duplicar campo",
    "Como mudar os campos",
    "Textos do campo selecionado",
    "Somente textos",
    "ckb-ed-col--compact",
    "ckb-ed-pal-item--compact",
    "Ver execuções deste modelo",
  ]) {
    assertMarker(travado, marker, "C · travado");
  }
  assert.match(travado, /ckb-ed-grid--compacta/);
  assert.doesNotMatch(travado, /Configurações do campo/, "o inspector dá lugar ao painel");
  assert.doesNotMatch(travado, /class="ckb-ed-blockbar"/, "a C explica no painel, sem faixa");

  const conflito = await renderEditor({ appearance: "C", checklist: modelo({ activeRuns: 0 }), conflict: { latest: outraPessoa() } });
  for (const marker of ["c22-cmp", "Salvo", "Seu (não salvo)", "Recarregar o modelo", "Sobrescrever mesmo assim"]) {
    assertMarker(conflito, marker, "C · conflito");
  }
  assert.ok(REFERENCE.includes(".c22-cmp .v.dif"), "a referência marca a diferença com .v.dif");
  assert.match(conflito, /class="v dif"/);
  assert.match(visible(conflito), /1 diferença\. Recarregar traz a versão mais recente/);
  assert.match(visible(conflito), /Salvo às \d{2}:\d{2} · você abriu às \d{2}:\d{2}/);
  assert.doesNotMatch(conflito, /ckb-ed-modal-overlay/);
});

test("E3-08: o comparador acha as diferenças reais (2 quando há 2) e nenhuma quando não há", async () => {
  const model = await import("../src/modules/checklists/checklist-editor.model");
  const server = outraPessoa();
  const mine = model.updateEditorComponent(model.createEditorDraftFromChecklist(modelo()), "cmp-4", { help: "Anote o que não aparece nas fotos" });
  const rows = model.diffEditorDraft(server, mine);
  assert.deepEqual(
    rows.map((row) => row.label),
    ["“Fotos das 4 laterais e do painel” — pergunta", "“Observações do técnico” — ajuda"],
  );
  assert.equal(model.differencesPhrase(rows.length), "2 diferenças");
  assert.deepEqual(model.diffEditorDraft(server, model.createEditorDraftFromChecklist(server)), []);
});

// ── CE-31 — o mock é paritário (token e vistorias em andamento) ───────────────────────────────────

test("CE-31/E3b-06: o mock devolve activeRuns contado, recusa token defasado e recusa mudança de campo com vistoria viva", async () => {
  const mock = await import("../src/modules/checklists/checklist.mock");
  const model = await import("../src/modules/checklists/checklist-editor.model");
  const free = await mock.getMockTenantChecklist("chk_towing_delivery");
  assert.equal(free.activeRuns, 0);
  const inUse = await mock.getMockTenantChecklist(mock.MOCK_CHECKLIST_IN_USE_ID);
  assert.equal(inUse.activeRuns, 2, "o modelo de demonstração nasce com 2 vistorias em andamento");

  await assert.rejects(mock.updateMockTenantChecklist(free.id, { expectedUpdatedAt: "2020-01-01T00:00:00.000Z", name: "X" }), (error: unknown) =>
    (error as { reason?: string }).reason === "template_changed_since_read");

  const draft = model.createEditorDraftFromChecklist(inUse);
  const onlyText = await mock.updateMockTenantChecklist(
    inUse.id,
    model.buildUpdateInputFromEditorDraft(model.updateEditorComponent(draft, draft.components[0]!.id, { label: "Tipo do veículo rebocado" }), inUse.schema, inUse.updatedAt),
  );
  assert.equal(onlyText.activeRuns, 2, "salvar devolve activeRuns");
  const fresh = model.createEditorDraftFromChecklist(onlyText);
  await assert.rejects(
    mock.updateMockTenantChecklist(
      inUse.id,
      model.buildUpdateInputFromEditorDraft(model.updateEditorComponent(fresh, fresh.components[0]!.id, { required: false }), onlyText.schema, onlyText.updatedAt),
    ),
    (error: unknown) => (error as { reason?: string }).reason === "template_has_active_runs",
  );
  await assert.rejects(mock.updateMockTenantChecklist(inUse.id, { expectedUpdatedAt: onlyText.updatedAt, status: "draft" }), (error: unknown) =>
    (error as { reason?: string }).reason === "template_has_active_runs");
  const inactive = await mock.updateMockTenantChecklist(inUse.id, { expectedUpdatedAt: onlyText.updatedAt, status: "inactive" });
  assert.equal(inactive.status, "inactive");
  assert.equal(inactive.activeRuns, 2);
});

// ── CE-32 — linguagem: nada técnico; a frase das vistorias não afirma versão ──────────────────────

test("CE-32: os 2 estados × 3 aparências sem termo técnico; a frase das vistorias não fala de versão (E3b-16)", async () => {
  const model = await import("../src/modules/checklists/checklist-editor.model");
  for (const appearance of ["A", "B", "C"]) {
    for (const state of ["travado", "conflito"] as const) {
      const html =
        state === "travado"
          ? await renderEditor({ appearance, selectedKey: "campo_3" })
          : await renderEditor({ appearance, checklist: modelo({ activeRuns: 0 }), conflict: { latest: outraPessoa() } });
      const text = visible(html);
      assert.doesNotMatch(text, /\btemplate\b|\btenant\b|\bruns?\b|\bPATCH\b|\b409\b|activeRuns|updatedAt|chk-trava-01|campo_\d/i, `${appearance} · ${state}`);
    }
  }
  const lock = { kind: "locked" as const, activeRuns: 4 };
  for (const phrase of [
    model.editorLockBanner(lock, "published"),
    model.editorLockBanner(lock, "inactive"),
    model.editorLockReason(lock),
    model.editorLockPanelSub(lock),
  ]) {
    assert.doesNotMatch(phrase, /vers[ãa]o/i, phrase);
  }
  assert.equal(model.editorLockPanelSub(lock), "4 vistorias em andamento usam este modelo");
});

test("E3b-16: o selo da versão segue a situação real do modelo (publicada · inativo · rascunho)", async () => {
  const published = await renderEditor({ appearance: "B" });
  assert.match(visible(published), /publicada v4 Versão publicada/);
  const inactive = await renderEditor({ appearance: "B", checklist: modelo({ status: "inactive" }) });
  assert.match(visible(inactive), /inativo v4 Versão atual/);
  assert.doesNotMatch(visible(inactive), /Versão publicada/);
});

// ── E3b-17 — a confirmação de inativar ────────────────────────────────────────────────────────────

test("E3b-17: a confirmação de inativar segue o molde do 'Sair sem salvar?' e diz que quem está no campo termina", async () => {
  const { InactivateConfirmDialog } = await import("../src/modules/checklists/pages/ChecklistEditorPage");
  const html = renderToString(<InactivateConfirmDialog activeRuns={4} onCancel={() => {}} onConfirm={() => {}} />);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Inativar este modelo\?/);
  assert.match(visible(html), /As novas ordens deixam de usar o modelo\. Quem está no campo termina: as 4 vistorias em andamento continuam com este modelo\./);
  assert.match(html, /autofocus=""[^>]*>Continuar editando</);
  assert.match(html, /ckb-ed-modal-btn--danger[^>]*>Inativar modelo</);
});

// ── E3b-08 — o 409 do publicar passa pela mesma apresentação (critério de FORMA, declarado) ───────

test("E3b-08 (forma): salvar, publicar e inativar/reativar levam o erro ao mesmo tratamento do 409 — nunca ao toast genérico", () => {
  // O SSR não clica nem faz rede; a prova de comportamento é a captura ao vivo do relatório do dev. Este guard só
  // impede que um dos três gestos volte a mandar o erro direto para o toast genérico do cliente.
  const source = readFileSync(fileURLToPath(new URL("../src/modules/checklists/pages/ChecklistEditorPage.tsx", import.meta.url)), "utf8");
  for (const gesture of ["save", "publish", "status"]) {
    assert.ok(source.includes(`await handleWriteError(error, "${gesture}"`), gesture);
  }
  assert.doesNotMatch(source, /showToast\(error instanceof Error \? error\.message : "Falha ao publicar o modelo\."/);
});
