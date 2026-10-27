import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  ExternalLink,
  GripVertical,
  HelpCircle,
  Lock,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Trash2,
} from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../../../services/api/client";
import { useScreenAppearance } from "../../appearance/useScreenAppearance";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { buildChecklistApiContext } from "../checklist.api-context";
import { hasChecklistPendingChanges } from "../checklist.builder";
import {
  CHECKLIST_TYPES,
  checklistStatusLabel,
  checklistTypeLabel,
  resolveChecklistComponentDefaultConfig,
  resolveChecklistComponentTypeDescription,
  resolveChecklistComponentTypeLabel,
} from "../checklist.constants";
import {
  addEditorComponent,
  addEditorSection,
  applyChecklistConfigChange,
  checklistPublishBlockers,
  checklistSaveBlockers,
  componentSectionIndex,
  componentsInSection,
  buildUpdateInputFromEditorDraft,
  createEditorDraftFromChecklist,
  duplicateEditorComponent,
  editorCanvasMeta,
  editorFieldChips,
  editorSectionCount,
  moveEditorComponent,
  publishButtonState,
  canRemoveEditorSection,
  removeEditorComponent,
  removeEditorSection,
  renameEditorSection,
  updateEditorComponent,
  conflictWhenLine,
  diffEditorDraft,
  editorLockBanner,
  editorLockPill,
  editorLockReason,
  editorLockReasonFor,
  editorStatusAction,
  EDITOR_LOCK_UNKNOWN_MESSAGE,
  nextEditorLock,
  publishTokenAfterSave,
  reactivateLockReason,
  resolveWriteError,
} from "../checklist-editor.model";
import type {
  ChecklistConfigChange,
  ChecklistEditorComponent,
  ChecklistEditorDraft,
  ChecklistEditorLock,
} from "../checklist-editor.model";
import {
  EditorConflictBar,
  EditorConflictCompare,
  EditorImpactPanel,
  EditorLockKpis,
} from "../components/ChecklistEditorLockViews";
import type { EditorLockBlock } from "../components/ChecklistEditorLockViews";
import { resolveChecklistPreviewMode } from "../checklist-preview.model";
import type { ChecklistPreviewMode } from "../checklist-preview.model";
import {
  getTenantChecklist,
  listTenantChecklistComponents,
  publishTenantChecklist,
  updateTenantChecklist,
} from "../checklist.service";
import { CHECKLIST_STATUS_TONE, resolveChecklistComponentTile } from "../checklist-tiles";
import { ChecklistFieldInspector } from "../components/ChecklistFieldInspector";
import { ChecklistPreviewDock, ChecklistPreviewModal } from "../components/ChecklistPreview";
import { ChecklistToast, useChecklistToast } from "../components/ChecklistToast";
import type { TenantChecklist, TenantChecklistComponentCatalogItem, TenantChecklistStatus } from "../types";

// CHECKLIST P1 PR-02b/02c — o EDITOR de "Modelos de Checklist" em rota própria
// (/administrator/checklists/:checklistId), recriado sobre o protótipo do dono
// (Modelos de Checklist.dc.html, bloco scEditor): header com nome inline + situação + dirty,
// abas Estrutura/Aplicabilidade, paleta 264px + canvas com SEÇÕES + inspector 336px, modal
// "Sair sem salvar?" e aba Aplicabilidade estática ("Em breve").
//
// PR-02c acrescenta: inspector TIPADO por tipo de campo (ChecklistFieldInspector), guard-rails de
// publicação espelhando o validator do backend, o seletor de TIPO ligado (o PATCH passou a aceitar
// `type` — P-CHK-PATCH-SEM-TYPE), guarda de saída suja para QUALQUER link interno, confirmação de
// edição concorrente (P-CHK-PATCH-SEM-LOCK) e a ação de Inativar/Reativar no editor.
//
// PR-02d FECHA o editor: a PRÉ-VISUALIZAÇÃO em frame de telefone (`ChecklistPreview`), no modal do
// protótipo ou como 4ª coluna (dock) quando a janela comporta — decisão automática e única, em
// `resolveChecklistPreviewMode`. O selo "Em breve" saiu do botão Pré-visualizar (segue apenas onde
// a capacidade REALMENTE não existe: as regras de aplicabilidade, que são o PR-04).
//
// B-SAN3-22 (fatia web) — a trava do modelo saiu do navegador para o servidor: salvar, publicar e
// inativar/reativar levam o `updatedAt` da última leitura (409 se alguém gravou depois), e o servidor diz
// em TODA resposta de modelo quantas vistorias em andamento o usam (`activeRuns`; ausente = travado). Com
// vistoria em andamento só os textos mudam. Os dois estados ("campos travados" e "conflito ao salvar") saem
// nas 3 aparências aprovadas (`useScreenAppearance("checklist-editor")`; referência
// `screen-refs/checklist-editor-estados-3opcoes.reference.html`): A · Padrão fiel, B · Analítica,
// C · Painel de impacto.

/** Chave da tela no registro de aparências (o menu do usuário oferece a escolha). */
export const CHECKLIST_EDITOR_APPEARANCE_KEY = "checklist-editor";

export const CHECKLIST_LIST_PATH = "/administrator/checklists";
const CHECKLIST_RUNS_PATH = "/operations/checklists";

/** Mensagem entregue à lista após "Salvar e sair" (o toast não sobrevive à troca de rota). */
export const CHECKLIST_TOAST_HANDOFF_KEY = "checklistToast";

type EditorTab = "estrutura" | "aplicabilidade";

const TABS: readonly { readonly id: EditorTab; readonly label: string }[] = [
  { id: "estrutura", label: "Estrutura do formulário" },
  { id: "aplicabilidade", label: "Aplicabilidade" },
];

/**
 * Esconde-fino do EDITOR, como função pura (mesma lição da junta do PR-02a: SSR sem efeitos não
 * prova esconde-fino). A autoridade final continua sendo o backend (§2.4) — aqui a tela apenas
 * deixa de oferecer o que o perfil não pode.
 */
export function editorActionVisibility(input: {
  readonly canUpdate: boolean;
  readonly canReadRuns: boolean;
  /** Junta PR-02b (ALTA): enquanto grava, a superfície de edição CONGELA. Sem isso o usuário
   *  editava durante o PATCH, o toast verde confirmava um save que não incluiu as edições e o
   *  trabalho sumia em silêncio quando a resposta redefinia o rascunho. */
  readonly busy?: boolean;
}): {
  readonly palette: boolean;
  readonly save: boolean;
  readonly addSection: boolean;
  readonly fieldActions: boolean;
  readonly inspector: boolean;
  readonly runsLink: boolean;
  readonly editingFrozen: boolean;
} {
  const writable = input.canUpdate && !input.busy;
  return {
    palette: writable,
    save: input.canUpdate,
    addSection: writable,
    fieldActions: writable,
    // O inspector continua MONTADO durante o save (some só por permissão) — os campos entram em
    // readOnly via `editingFrozen`, para a tela não piscar a cada gravação.
    inspector: input.canUpdate,
    // Leitura de execuções tem gate PRÓPRIO — não herda o de escrita.
    runsLink: input.canReadRuns,
    editingFrozen: Boolean(input.busy),
  };
}

/**
 * Largura da janela como FATO ou `null` — nunca um número inventado. No render de servidor (e nos
 * smokes) `window.innerWidth` não existe; `null` cai no modal, que não depende de espaço na grade.
 */
function readViewportWidth(): number | null {
  if (typeof window === "undefined") return null;
  const width = (window as { innerWidth?: unknown }).innerWidth;
  return typeof width === "number" && Number.isFinite(width) ? width : null;
}

/** Mensagem honesta por causa real: indisponível ≠ sem permissão ≠ falha de rede. */
export function resolveEditorLoadError(error: unknown): string {
  const status = error instanceof ApiError ? error.status : undefined;
  if (status === 404) return "Este modelo não existe nesta organização (ou foi arquivado).";
  if (status === 401 || status === 403) return "Você não tem permissão para abrir este modelo.";
  return "A conexão com o servidor falhou. Verifique sua internet e tente novamente — nenhum modelo foi alterado.";
}

export function ChecklistEditorPage({
  // Costura de teste (SSR não executa efeitos): com o modelo/catálogo injetados, o primeiro render
  // já nasce carregado e o markup real do editor fica auditável. `initialTab` deixa a 2ª aba
  // auditável sem simular clique — sempre a árvore REAL da página. Produção não passa as props.
  initialChecklist,
  initialComponents,
  initialTab,
  initialSelectedComponentKey,
  initialPreviewOpen,
  initialPreviewMode,
  initialConflict,
  initialLockBlock,
}: {
  readonly initialChecklist?: TenantChecklist;
  /**
   * Costura de teste (SSR não roda clique nem rede): abre já no estado de conflito, com o modelo que "outra
   * pessoa" salvou e o rascunho desta sessão. Produção nunca passa.
   */
  readonly initialConflict?: { readonly latest: TenantChecklist; readonly draft?: ChecklistEditorDraft; readonly openedAt?: string };
  /** Costura de teste: o bloco da aparência B já aberto. */
  readonly initialLockBlock?: EditorLockBlock;
  readonly initialComponents?: readonly TenantChecklistComponentCatalogItem[];
  readonly initialTab?: EditorTab;
  /** Costura de teste: seleciona o campo pela CHAVE (o id é regenerado pelo backend a cada PATCH). */
  readonly initialSelectedComponentKey?: string;
  /** Costura de teste (PR-02d): abre a pré-visualização já no 1º render (SSR não roda clique). */
  readonly initialPreviewOpen?: boolean;
  /** Costura de teste: força modal × dock (em produção quem decide é a largura da janela). */
  readonly initialPreviewMode?: ChecklistPreviewMode;
} = {}) {
  const { checklistId } = useParams<{ checklistId: string }>();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const canUpdate = can("tenant_checklists:update");
  const canPublish = can("tenant_checklists:publish");
  const canReadRuns = can("checklist_runs:read");

  const apiContext = useMemo(
    () => buildChecklistApiContext(activeContext, session?.accessToken),
    [activeContext, session?.accessToken],
  );
  const { toast, showToast } = useChecklistToast();

  const { appearance } = useScreenAppearance(CHECKLIST_EDITOR_APPEARANCE_KEY);

  const [checklist, setChecklist] = useState<TenantChecklist | null>(initialChecklist ?? null);
  const [draft, setDraft] = useState<ChecklistEditorDraft | null>(
    initialConflict?.draft ?? (initialChecklist ? createEditorDraftFromChecklist(initialChecklist) : null),
  );
  /** B-SAN3-22 (CE-27) — trava alimentada por TODA resposta de modelo único; ausente = travado (fail-closed). */
  const [lock, setLock] = useState<ChecklistEditorLock>(() =>
    initialChecklist ? nextEditorLock(initialConflict?.latest ?? initialChecklist) : { kind: "unknown" },
  );
  /** Quando esta sessão leu o modelo sobre o qual o rascunho é feito (linha de horário do conflito, E3b-14). */
  const [openedAt, setOpenedAt] = useState<string | null>(initialConflict?.openedAt ?? (initialChecklist ? new Date().toISOString() : null));
  /** Bloco aberto da aparência B (vistorias · versão · campos). */
  const [lockBlock, setLockBlock] = useState<EditorLockBlock | null>(initialLockBlock ?? null);
  /** E3b-17 — confirmação de inativar (molde do "Sair sem salvar?"). */
  const [confirmInactivate, setConfirmInactivate] = useState(false);
  const [catalog, setCatalog] = useState<readonly TenantChecklistComponentCatalogItem[]>(initialComponents ?? []);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    initialSelectedComponentKey && initialChecklist
      ? (initialChecklist.components.find((component) => component.componentKey === initialSelectedComponentKey)?.id ?? null)
      : null,
  );
  const [tab, setTab] = useState<EditorTab>(initialTab ?? "estrutura");
  const [previewOpen, setPreviewOpen] = useState(Boolean(initialPreviewOpen));
  /** Largura da janela — só ela decide modal × dock (ver `resolveChecklistPreviewMode`). */
  const [viewportWidth, setViewportWidth] = useState<number | null>(readViewportWidth());
  const [dirty, setDirty] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  /** Para onde o usuário tentou ir com o rascunho sujo — `null` = a lista de modelos (botão Voltar). */
  const [pendingExitPath, setPendingExitPath] = useState<string | null>(null);
  /**
   * P-CHK-PATCH-SEM-LOCK / B-SAN3-22: o modelo que outra pessoa salvou depois da nossa leitura (relido no 409
   * `template_changed_since_read`). `source` diz qual gesto bateu: só o SALVAR pode sobrescrever (publicar e
   * inativar não carregam rascunho — a saída é recarregar e repetir).
   */
  const [conflict, setConflict] = useState<{ readonly latest: TenantChecklist; readonly source: "save" | "publish" | "status" } | null>(
    initialConflict ? { latest: initialConflict.latest, source: "save" } : null,
  );
  const [loading, setLoading] = useState(initialChecklist === undefined);
  const [saving, setSaving] = useState(false);
  const visibility = editorActionVisibility({ canUpdate, canReadRuns, busy: saving });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Junta PR-02b (MÉDIA): ao TROCAR de organização, zera o que está na tela antes do fetch —
    // senão o modelo da organização anterior continuava visível E EDITÁVEL durante a troca.
    setChecklist(null);
    setDraft(null);
    setSelectedComponentId(null);
    setDirty(false);
    void loadEditor();
  }, [apiContext, checklistId]);

  // PR-02d: a pré-visualização acompanha a janela — quem abriu o dock num monitor largo e reduz a
  // janela vê a MESMA prévia virar modal, em vez de espremer o formulário até o ilegível.
  useEffect(() => {
    function onResize() {
      setViewportWidth(readViewportWidth());
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Junta PR-02b (MÉDIA): a guarda de saída suja cobria só o botão Voltar. F5/fechar aba é a
  // saída mais barata de cobrir e a mais fácil de acontecer sem querer.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /**
   * PR-02c — guarda de saída suja para QUALQUER link interno (sidebar, topbar, atalhos), não só o
   * botão Voltar.
   *
   * LIMITAÇÃO HONESTA: `useBlocker` do react-router 7 exige um DATA ROUTER
   * (`useDataRouterContext`) e o app monta um `BrowserRouter` clássico em `main.tsx` — migrar o
   * roteador inteiro é mudança estrutural que este PR não tem autorização para fazer. A cobertura
   * possível sem migrar é interceptar o CLIQUE em `<a href>` na fase de captura: o shell navega
   * por `NavLink` (que renderiza âncora), então sidebar e topbar ficam cobertas. NÃO cobre:
   * botão voltar/avançar do navegador e navegação PROGRAMÁTICA de outras telas (`navigate(...)`,
   * ex.: paleta de comandos e o botão Sair) — para essas, a proteção que resta é o `beforeunload`
   * (só recarga/fechamento) e o registro desta limitação.
   */
  useEffect(() => {
    if (!dirty) return;

    function onDocumentClickCapture(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as Element | null;
      const anchor = typeof target?.closest === "function" ? target.closest("a[href]") : null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const opensNewTab = anchor.getAttribute("target") === "_blank";
      // Só navegação INTERNA (rota do app). Link externo/download/nova aba não perde o rascunho.
      if (!href || opensNewTab || !href.startsWith("/") || href.startsWith("//")) return;
      if (href === `${CHECKLIST_LIST_PATH}/${checklistId ?? ""}`) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingExitPath(href);
      setConfirmExit(true);
    }

    document.addEventListener("click", onDocumentClickCapture, true);
    return () => document.removeEventListener("click", onDocumentClickCapture, true);
  }, [dirty, checklistId]);

  const selectedComponent = draft?.components.find((component) => component.id === selectedComponentId) ?? null;

  async function loadEditor() {
    if (!checklistId) return;

    if (!apiContext) {
      setLoading(false);
      setLoadError("Selecione uma organização ativa para abrir o modelo.");
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [nextChecklist, nextCatalog] = await Promise.all([
        getTenantChecklist(apiContext, checklistId),
        listTenantChecklistComponents(apiContext),
      ]);
      setChecklist(nextChecklist);
      setDraft(createEditorDraftFromChecklist(nextChecklist));
      setLock(nextEditorLock(nextChecklist));
      setOpenedAt(new Date().toISOString());
      setConflict(null);
      setCatalog(nextCatalog);
      setSelectedComponentId(null);
      setDirty(false);
    } catch (error) {
      // Junta PR-02b (MÉDIA): 404/403 apareciam como "Verifique sua internet" — a tela mentia a
      // causa e oferecia "Tentar novamente" para algo que nunca ia funcionar.
      setLoadError(resolveEditorLoadError(error));
    } finally {
      setLoading(false);
    }
  }

  /** Toda mutação do rascunho passa por aqui — é o único lugar que liga o dirty. */
  function applyDraft(next: ChecklistEditorDraft) {
    setDraft(next);
    setDirty(true);
  }

  function handleAddField(item: TenantChecklistComponentCatalogItem) {
    if (!draft) return;
    // B-SAN3-22: com vistoria em andamento (ou não confirmado) só textos mudam — a ação explica em vez de agir.
    if (lock.kind !== "free") {
      explainLocked(editorLockReason(lock));
      return;
    }

    const targetSection = selectedComponent
      ? componentSectionIndex(selectedComponent, draft.sections.length)
      : Math.max(0, draft.sections.length - 1);
    // Junta PR-02b (ALTA): o catálogo do backend devolve rótulo SEM acento ("Observacao",
    // "Seletor de veiculo"). Criar o campo com ele gravava a pergunta que o TÉCNICO lê no app,
    // errada e persistida. A paleta já resolvia pelo mapa local; a criação agora também.
    // PR-02c: o mesmo vale para as OPÇÕES semeadas ("Opcao 1"/"Opcao 2") — são as respostas que o
    // técnico lê e escolhe no aplicativo.
    const result = addEditorComponent(
      draft,
      {
        ...item,
        label: resolveChecklistComponentTypeLabel(item.type, item.label),
        defaultConfig: resolveChecklistComponentDefaultConfig(item.type, item.defaultConfig),
      },
      targetSection,
    );
    applyDraft(result.draft);
    setSelectedComponentId(result.componentId);
  }

  function handleDuplicate(componentId: string) {
    if (!draft) return;
    // B-SAN3-22: com vistoria em andamento (ou não confirmado) só textos mudam — a ação explica em vez de agir.
    if (lock.kind !== "free") {
      explainLocked(editorLockReason(lock));
      return;
    }

    const result = duplicateEditorComponent(draft, componentId);
    applyDraft(result.draft);
    if (result.componentId) setSelectedComponentId(result.componentId);
  }

  function handleRemove(componentId: string) {
    if (!draft) return;
    // B-SAN3-22: com vistoria em andamento (ou não confirmado) só textos mudam — a ação explica em vez de agir.
    if (lock.kind !== "free") {
      explainLocked(editorLockReason(lock));
      return;
    }

    applyDraft(removeEditorComponent(draft, componentId));
    if (selectedComponentId === componentId) setSelectedComponentId(null);
  }

  /** B-SAN3-22 — controle de campo travado: o clique explica (toast de aviso) em vez de agir. */
  function explainLocked(message: string) {
    showToast(message, "warn");
  }

  /**
   * PATCH do modelo. O backend REGENERA o id de cada componente a cada gravação (o `componentKey`
   * é que sobrevive), então a seleção é reancorada pela chave — senão o inspector "perderia" o
   * campo que o usuário acabou de configurar.
   *
   * B-SAN3-22 (E3-04/E3b-07): `base` é o modelo do servidor sobre o qual o rascunho foi feito — dele vêm o
   * schema-base e o TOKEN (`updatedAt`). A releitura best-effort antes de gravar SAIU: quem decide se alguém
   * gravou por baixo é o servidor (409). Devolve o modelo salvo (o publicar usa o `updatedAt` dele) ou `null`.
   */
  async function persistDraft(options: { readonly base?: TenantChecklist } = {}): Promise<TenantChecklist | null> {
    const target = options.base ?? checklist;
    if (!apiContext || !target || !draft) return null;

    // O backend REJEITA (400) modelo sem campo e campo de escolha sem opções — espelhado aqui para
    // o usuário não perder o clique num erro de validação cru depois de montar o formulário todo.
    const blockers = checklistSaveBlockers(draft);
    if (blockers.length > 0) {
      showToast(blockers[0], "warn");
      return null;
    }

    setSaving(true);

    try {
      const saved = await updateTenantChecklist(
        apiContext,
        target.id,
        buildUpdateInputFromEditorDraft(draft, target.schema, target.updatedAt),
      );
      const selectedKey = selectedComponent?.componentKey;
      const nextDraft = createEditorDraftFromChecklist(saved);
      setChecklist(saved);
      setLock(nextEditorLock(saved));
      setOpenedAt(new Date().toISOString());
      setConflict(null);
      setDraft(nextDraft);
      setDirty(false);
      setSelectedComponentId(
        selectedKey ? (nextDraft.components.find((component) => component.componentKey === selectedKey)?.id ?? null) : null,
      );
      return saved;
    } catch (error) {
      await handleWriteError(error, "save", "Falha ao salvar o modelo.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  /**
   * Leitura do detalhe depois de um 409. Falha (rede) devolve `null` — e quem chama cai no fail-closed
   * (E3b-19): campos travados como "não confirmado" e nenhum comparador sem dado.
   */
  async function readLatestChecklist(checklistIdToRead: string): Promise<TenantChecklist | null> {
    if (!apiContext) return null;
    try {
      return await getTenantChecklist(apiContext, checklistIdToRead);
    } catch {
      return null;
    }
  }

  /**
   * B-SAN3-22 — erro de gravação (salvar, publicar, inativar/reativar):
   *  · 409 `template_changed_since_read` → relê e apresenta o conflito na aparência do usuário (CE-26b);
   *  · 409 `template_has_active_runs` → relê e diz quantas vistorias seguram o modelo (CE-28; o cliente não
   *    expõe a mensagem do servidor);
   *  · releitura que falha → travado como "não confirmado" (E3b-19).
   */
  async function handleWriteError(error: unknown, source: "save" | "publish" | "status", fallback: string) {
    if (!checklist) return;
    const target = checklist;
    const outcome = await resolveWriteError(error, () => readLatestChecklist(target.id));
    if (outcome.kind === "other") {
      showToast(error instanceof Error ? error.message : fallback, "warn");
      return;
    }
    if (outcome.kind === "unknown") {
      setConflict(null);
      setLock({ kind: "unknown" });
      showToast(outcome.message, "warn");
      return;
    }
    setLock(outcome.lock);
    if (outcome.kind === "conflict") {
      setConflict({ latest: outcome.latest, source });
      return;
    }
    showToast(outcome.message, "warn");
  }

  async function handleSave() {
    if (await persistDraft()) showToast("Modelo salvo. Publique para enviar ao aplicativo.", "ok");
  }

  /** "Recarregar" (E3-08): GET e substitui o rascunho. Falha na leitura → travado como não confirmado. */
  async function handleReloadFromConflict() {
    if (!checklist) return;
    const fresh = await readLatestChecklist(checklist.id);
    setConflict(null);
    if (!fresh) {
      setLock({ kind: "unknown" });
      showToast(EDITOR_LOCK_UNKNOWN_MESSAGE, "warn");
      return;
    }
    setChecklist(fresh);
    setDraft(createEditorDraftFromChecklist(fresh));
    setLock(nextEditorLock(fresh));
    setOpenedAt(new Date().toISOString());
    setSelectedComponentId(null);
    setDirty(false);
    showToast("Modelo recarregado com a versão mais recente. As suas alterações não salvas foram descartadas.", "info");
  }

  /**
   * "Sobrescrever" (E3-08): GET + PATCH com o token RECÉM-lido — nunca grava sem a versão. Os campos são os desta
   * sessão; o schema-base é o recém-lido, para nenhuma chave que a outra pessoa gravou cair por um payload obsoleto.
   */
  async function handleOverwriteConflict() {
    if (!checklist) return;
    setConflict(null);
    const fresh = await readLatestChecklist(checklist.id);
    if (!fresh) {
      setLock({ kind: "unknown" });
      showToast(EDITOR_LOCK_UNKNOWN_MESSAGE, "warn");
      return;
    }
    setLock(nextEditorLock(fresh));
    if (await persistDraft({ base: fresh })) {
      showToast("Modelo salvo por cima da versão anterior. Publique para enviar ao aplicativo.", "ok");
    }
  }

  // Junta PR-02b (ALTA): deixar Publicar desabilitado REMOVEU capacidade real do produto — o
  // endpoint (POST /tenant/checklists/:id/publish) e o serviço já existem e funcionam.
  // PR-02c: guard-rails espelhando o validator + o rascunho é GRAVADO antes de publicar. Sem isso,
  // publicar com alterações não salvas publicava a versão ANTIGA do servidor e o editor ainda
  // sobrescrevia o rascunho com ela — perda silenciosa do trabalho na tela.
  // B-SAN3-22 (E3b-07/08): o publicar leva o `updatedAt` DEVOLVIDO pelo salvar (não o da tela antes dele); o 409
  // do publicar passa pela mesma apresentação de conflito, sem "Sobrescrever".
  async function handlePublish() {
    if (!apiContext || !checklist || saving) return;

    const blockers = checklistPublishBlockers(draft ?? createEditorDraftFromChecklist(checklist));
    if (blockers.length > 0) {
      showToast(blockers[0], "warn");
      return;
    }

    let saved: TenantChecklist | null = null;
    if (dirty) {
      saved = await persistDraft();
      if (!saved) return;
    }

    setSaving(true);
    try {
      const published = await publishTenantChecklist(apiContext, checklist.id, publishTokenAfterSave(saved, checklist));
      setChecklist(published);
      setLock(nextEditorLock(published));
      setOpenedAt(new Date().toISOString());
      setDraft(createEditorDraftFromChecklist(published));
      setDirty(false);
      // Protótipo: publicar FECHA a pré-visualização (a conferência acabou; o toast confirma).
      setPreviewOpen(false);
      showToast("Modelo publicado — já está disponível no aplicativo para as próximas ordens.", "ok");
    } catch (error) {
      await handleWriteError(error, "publish", "Falha ao publicar o modelo.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Inativar/Reativar no editor (promessa da ata do PR-02a). Mesma chamada da lista
   * (`updateTenantChecklist({ status })`), gate `tenant_checklists:update`. NÃO redefine o
   * rascunho: quem tem alteração na tela não a perde por trocar a situação do modelo.
   *
   * B-SAN3-22: Inativar abre a confirmação (E3b-17); Reativar volta a rascunho e por isso fica TRAVADO enquanto
   * houver vistoria em andamento ou enquanto isso não estiver confirmado (CE-29). Os dois levam o token.
   */
  function handleToggleStatus() {
    if (!apiContext || !checklist || saving) return;
    const action = editorStatusAction(checklist.status, lock);
    if (action.kind === "explain") {
      explainLocked(action.message);
      return;
    }
    if (action.kind === "reactivate") {
      void changeStatus("draft");
      return;
    }
    setConfirmInactivate(true);
  }

  async function changeStatus(nextStatus: TenantChecklistStatus) {
    if (!apiContext || !checklist) return;
    setSaving(true);

    try {
      const saved = await updateTenantChecklist(apiContext, checklist.id, { status: nextStatus, expectedUpdatedAt: checklist.updatedAt });
      setChecklist(saved);
      setLock(nextEditorLock(saved));
      showToast(
        nextStatus === "inactive"
          ? "Modelo inativado — não entra em novas ordens."
          : "Modelo reativado como rascunho. Publique para enviar ao aplicativo.",
        "ok",
      );
    } catch (error) {
      await handleWriteError(error, "status", "Falha ao alterar a situação do modelo.");
    } finally {
      setSaving(false);
    }
  }

  /** Sai do editor para `path` (ou para a lista). O toast só viaja quando o destino é a lista. */
  function leaveEditor(path: string | null, toastMessage?: string) {
    const destination = path ?? CHECKLIST_LIST_PATH;
    navigate(
      destination,
      toastMessage && destination === CHECKLIST_LIST_PATH ? { state: { [CHECKLIST_TOAST_HANDOFF_KEY]: toastMessage } } : undefined,
    );
  }

  /** Saída por controle do próprio editor: com rascunho sujo, confirma antes de sair. */
  function guardedNavigate(path: string | null) {
    if (dirty) {
      setPendingExitPath(path);
      setConfirmExit(true);
      return;
    }
    leaveEditor(path);
  }

  function handleBack() {
    guardedNavigate(null);
  }

  async function handleSaveAndExit() {
    const destination = pendingExitPath;
    setConfirmExit(false);
    // O toast não sobrevive à troca de rota — a mensagem viaja no state e a lista a exibe.
    if (await persistDraft()) leaveEditor(destination, "Modelo salvo.");
  }

  const showSkeleton = loading && checklist === null;
  const showErrorCard = !loading && loadError !== null && checklist === null;

  if (showSkeleton) return <ChecklistEditorSkeleton />;

  if (showErrorCard || !checklist || !draft) {
    return (
      <div className="ckb-page">
        <div className="ckb-error-wrap">
          <div className="ckb-error" role="alert">
            <div className="ckb-error-tile" aria-hidden="true">
              <AlertTriangle size={26} />
            </div>
            <div className="ckb-error-title">Não foi possível abrir o modelo</div>
            <div className="ckb-error-detail">
              {loadError ?? "O modelo não está mais disponível nesta organização."}
            </div>
            <div className="ckb-ed-error-actions">
              <button type="button" className="ckb-btn-primary ckb-btn-primary--retry" onClick={() => void loadEditor()}>
                <RefreshCcw size={15} aria-hidden="true" />
                Tentar novamente
              </button>
              <button type="button" className="ckb-ed-btn" onClick={() => leaveEditor(null)}>
                <ChevronLeft size={15} aria-hidden="true" />
                Voltar para a lista de modelos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusTone = CHECKLIST_STATUS_TONE[checklist.status];
  const pendingChanges = hasChecklistPendingChanges(checklist);
  // Guard-rails de publicação (protótipo `blockers()`, espelhando o validator do backend).
  const publishBlockers = checklistPublishBlockers(draft);
  const publishState = publishButtonState(publishBlockers);
  const statusActionLabel = checklist.status === "inactive" ? "Reativar modelo" : "Inativar modelo";
  // PR-02d — modal × dock: decisão ÚNICA e automática (largura da janela + aba ativa). O botão é
  // um só; não existe um segundo controle pedindo ao usuário que administre o layout.
  const previewMode: ChecklistPreviewMode =
    initialPreviewMode ?? resolveChecklistPreviewMode({ viewportWidth, onStructureTab: tab === "estrutura" });
  const showPreviewDock = previewOpen && previewMode === "dock";
  const showPreviewModal = previewOpen && previewMode === "modal";

  // B-SAN3-22 — estados da trava por aparência (referência aprovada das 3 opções).
  const locked = lock.kind !== "free";
  const knownLock = lock.kind === "locked" ? lock : null;
  const lockReason = editorLockReason(lock);
  const reactivateReason = checklist.status === "inactive" ? reactivateLockReason(lock) : "";
  const lockPill = canUpdate ? editorLockPill(lock, appearance) : "";
  // C · Painel de impacto: com a trava conhecida, a coluna da direita vira "Em uso agora" e a paleta recolhe.
  const showImpactPanel = appearance === "C" && knownLock !== null && canUpdate && !conflict;
  const showConflictCompare = appearance === "C" && conflict !== null;
  const compactPalette = showPreviewDock || showImpactPanel;
  // A e B mostram a faixa que explica a trava; a C a explica no painel. "Não confirmado" aparece em todas.
  const showLockBanner = canUpdate && locked && (appearance !== "C" || lock.kind === "unknown");
  const conflictDifferences = conflict ? diffEditorDraft(conflict.latest, draft) : [];
  const overwrite = conflict?.source === "save" ? () => void handleOverwriteConflict() : undefined;

  /**
   * O dock é uma COLUNA da aba Estrutura. Trocar de aba com ele aberto o transformaria num modal
   * saltando por cima da aba que o usuário acabou de abrir — então ele simplesmente fecha. O modal,
   * esse, é deliberadamente sobreposto e continua válido em qualquer aba (como no protótipo).
   */
  function handleTabChange(next: EditorTab) {
    if (next !== "estrutura" && previewMode === "dock") setPreviewOpen(false);
    setTab(next);
  }
  // §2.8/§3: o telefone mostra o nome da organização ATIVA da sessão — nunca id, nunca "tenant".
  const organizationName = activeContext?.tenantName ?? null;
  // Junta PR-02d (ALTA, medido em Edge): a classe usava `visibility.palette`, que carrega o `busy`
  // do save. Durante a gravação a paleta DESMONTAVA e o template de colunas deixava de bater com o
  // número de filhos — com o dock aberto, o painel do telefone saltava para uma 2ª linha de 1050px
  // a cada Salvar. LAYOUT é decidido por PERMISSÃO (quem não edita não tem paleta/inspector);
  // estado transitório de gravação NUNCA muda a grade.
  const layoutReadonly = !canUpdate;
  const structureGridClass = [
    "ckb-ed-grid",
    layoutReadonly ? "ckb-ed-grid--readonly" : "",
    showPreviewDock ? "ckb-ed-grid--preview" : "",
    !showPreviewDock && showImpactPanel ? "ckb-ed-grid--compacta" : "",
  ]
    .filter(Boolean)
    .join(" ");

  /** Tipo do modelo travado: o seletor não abre e explica (nunca `disabled`, que não diria nada). */
  const typeLockReason = editorLockReasonFor(lock, "O tipo do modelo muda os campos");
  function explainTypeKey(event: ReactKeyboardEvent<HTMLSelectElement>) {
    if (!typeLockReason || event.key === "Tab") return;
    event.preventDefault();
    explainLocked(typeLockReason);
  }

  return (
    <div className="ckb-ed">
      <header className="ckb-ed-head">
        <div className="ckb-ed-head-row">
          <button
            type="button"
            className="ckb-ed-back"
            aria-label="Voltar para a lista de modelos"
            title="Voltar para a lista de modelos"
            onClick={handleBack}
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </button>

          <div className="ckb-ed-ident">
            <input
              className="ckb-ed-name"
              value={draft.name}
              aria-label="Nome do modelo"
              readOnly={!canUpdate || visibility.editingFrozen}
              onChange={(event) => applyDraft({ ...draft, name: event.target.value })}
            />
            {/* PR-02c: seletor LIGADO — o PATCH passou a aceitar `type` (validator + os dois
                repositórios; P-CHK-PATCH-SEM-TYPE resolvida). A troca entra no rascunho e vai no
                próximo Salvar, como qualquer outra edição. B-SAN3-22: com vistoria em andamento, travado. */}
            <select
              className="ckb-ed-type"
              value={draft.type}
              aria-label="Tipo do modelo"
              disabled={!canUpdate || visibility.editingFrozen}
              {...(canUpdate && typeLockReason
                ? { "aria-disabled": true, title: typeLockReason, "data-explica": typeLockReason }
                : {})}
              onMouseDown={(event) => {
                if (!typeLockReason) return;
                event.preventDefault();
                explainLocked(typeLockReason);
              }}
              onKeyDown={explainTypeKey}
              onChange={(event) => {
                if (typeLockReason) return;
                applyDraft({ ...draft, type: event.target.value as ChecklistEditorDraft["type"] });
              }}
            >
              {CHECKLIST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {checklistTypeLabel[type]}
                </option>
              ))}
            </select>
            <span className="ckb-pill" style={{ background: statusTone.bg, color: statusTone.fg }}>
              {checklistStatusLabel[checklist.status]}
            </span>
            {lockPill ? (
              <span className="ckb-pill ckb-pill--inuse">
                <Lock size={11} aria-hidden="true" />
                {lockPill}
              </span>
            ) : null}
            {pendingChanges ? <span className="ckb-pill ckb-pill--pending">Alterações não publicadas</span> : null}
            {dirty ? (
              <span className="ckb-ed-dirty">
                <span className="ckb-ed-dirty-dot" aria-hidden="true" />
                Alterações não salvas
              </span>
            ) : null}
          </div>

          <div className="ckb-ed-head-actions">
            {/* PR-02c — promessa da ata do PR-02a: tirar de circulação um modelo é capacidade REAL
                do backend e o lugar definitivo dela é o editor. Mesmo gate e mesma chamada da
                lista (`updateTenantChecklist({ status })`). B-SAN3-22: Inativar confirma antes; Reativar
                fica travado (e explica) enquanto houver vistoria em andamento. */}
            {visibility.save ? (
              <button
                type="button"
                className="ckb-ed-btn"
                title={reactivateReason || statusActionLabel}
                aria-label={statusActionLabel}
                aria-disabled={reactivateReason ? true : undefined}
                data-explica={reactivateReason || undefined}
                onClick={() => handleToggleStatus()}
                disabled={saving}
              >
                {checklist.status === "inactive" ? (
                  <RotateCcw size={15} aria-hidden="true" />
                ) : (
                  <Ban size={15} aria-hidden="true" />
                )}
                {statusActionLabel}
              </button>
            ) : null}
            {/* PR-02d: o botão LIGOU (o selo "Em breve" da junta do PR-02b saiu com ele). Um único
                controle: a pré-visualização abre como dock ou modal conforme a janela comporta. */}
            <button
              type="button"
              className={previewOpen ? "ckb-ed-btn ckb-ed-btn--preview-on" : "ckb-ed-btn"}
              title="Ver como o técnico verá no aplicativo"
              aria-expanded={previewOpen}
              onClick={() => setPreviewOpen((open) => !open)}
            >
              <Smartphone size={15} aria-hidden="true" />
              Pré-visualizar
            </button>
            {visibility.save ? (
              <button
                type="button"
                className={dirty ? "ckb-ed-btn ckb-ed-btn--save-dirty" : "ckb-ed-btn"}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                <Save size={15} aria-hidden="true" />
                Salvar
              </button>
            ) : null}
            {canPublish ? (
              // Travado NÃO usa `disabled`: o protótipo mantém o botão clicável em cinza e o clique
              // EXPLICA o bloqueio (botão desabilitado não recebe foco nem dá retorno nenhum).
              <button
                type="button"
                className={
                  publishState.locked
                    ? "ckb-ed-btn ckb-ed-btn--publish ckb-ed-btn--publish-locked"
                    : "ckb-ed-btn ckb-ed-btn--publish"
                }
                title={publishState.title}
                aria-disabled={publishState.locked}
                onClick={() => void handlePublish()}
                disabled={saving}
              >
                <Send size={15} aria-hidden="true" />
                Publicar
              </button>
            ) : null}
          </div>
        </div>

        <div className="ckb-ed-tabs-row">
          <div className="ckb-ed-tabs" role="tablist" aria-label="Seções do modelo">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`ckb-tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`ckb-panel-${item.id}`}
                className={tab === item.id ? "ckb-ed-tab ckb-ed-tab--active" : "ckb-ed-tab"}
                onClick={() => handleTabChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {/* Navegação PROGRAMÁTICA do próprio editor: passa pela MESMA guarda de saída suja
              (a interceptação de clique só pega âncoras, e este controle é um botão).
              B-SAN3-22 (E3b-18): a B não tem o link — a tela de execuções não filtra por modelo
              (fica para o B-CHK-EDITOR-LEITURAS-B); A e C o mantêm como hoje. */}
          {visibility.runsLink && appearance !== "B" ? (
            <button type="button" className="ckb-ed-runs-link" onClick={() => guardedNavigate(CHECKLIST_RUNS_PATH)}>
              <ExternalLink size={14} aria-hidden="true" />
              Ver execuções deste modelo
            </button>
          ) : null}
        </div>
      </header>

      {/* Bloqueio de publicação (protótipo): faixa âmbar logo abaixo do header, com a MESMA
          mensagem que o Publicar carrega no title e dispara no clique. */}
      {publishState.message ? (
        <div className="ckb-ed-blockbar" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{publishState.message}</span>
        </div>
      ) : null}

      {/* B-SAN3-22 — conflito na aparência B: a faixa âmbar com as ações do diálogo, sem diálogo. */}
      {conflict && appearance === "B" ? (
        <EditorConflictBar
          differences={conflictDifferences}
          savedAt={conflict.latest.updatedAt}
          openedAt={openedAt}
          onReload={() => void handleReloadFromConflict()}
          onOverwrite={overwrite}
        />
      ) : null}

      {/* B-SAN3-22 — a faixa que explica a trava (A e B; "não confirmado" em todas). */}
      {showLockBanner ? (
        <div
          className={appearance === "B" && lockBlock === "runs" ? "ckb-ed-blockbar ckb-ed-blockbar--destaque" : "ckb-ed-blockbar"}
          role="status"
          id="ckb-faixa-trava"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{editorLockBanner(lock, checklist.status)}</span>
          {lock.kind === "unknown" ? (
            <button type="button" className="ckb-ed-link" onClick={() => void loadEditor()}>
              Recarregar o modelo
            </button>
          ) : null}
        </div>
      ) : null}

      {!canUpdate ? (
        <div className="ckb-readonly-banner ckb-ed-readonly-banner">
          <div className="ckb-readonly-tile" aria-hidden="true">
            <Lock size={16} />
          </div>
          <div>
            <div className="ckb-readonly-title">Você está no modo somente leitura</div>
            <div className="ckb-readonly-sub">Seu perfil permite consultar os modelos, mas não criar, editar ou publicar.</div>
          </div>
        </div>
      ) : null}

      {/* B-SAN3-22 — aparência B: os três blocos clicáveis com números reais (resposta do dono à Q5). */}
      {appearance === "B" && knownLock && canUpdate && tab === "estrutura" ? (
        <EditorLockKpis
          lock={knownLock}
          checklist={checklist}
          fieldCount={draft.components.length}
          block={lockBlock}
          onBlock={setLockBlock}
        />
      ) : null}

      {tab === "estrutura" ? (
        <div className={structureGridClass} role="tabpanel" id="ckb-panel-estrutura" aria-labelledby="ckb-tab-estrutura">
          {canUpdate ? (
            <EditorPalette
              catalog={catalog}
              onAdd={handleAddField}
              collapsed={compactPalette}
              frozen={visibility.editingFrozen}
              lockedReason={lockReason}
              onExplain={explainLocked}
            />
          ) : null}

          <section className="ckb-ed-col">
            <div className="ckb-ed-col-head">
              <div>
                <div className="ckb-ed-col-title">O formulário</div>
                <div className="ckb-ed-col-sub">{editorCanvasMeta(draft, checklist.version)}</div>
              </div>
              {/* B-SAN3-22 (E3b-10): acrescentar seção é texto (`schema.sections`) — segue livre com a trava. */}
              {visibility.addSection ? (
                <button type="button" className="ckb-ed-ghost-btn" onClick={() => applyDraft(addEditorSection(draft))}>
                  <Plus size={13} aria-hidden="true" />
                  Nova seção
                </button>
              ) : null}
            </div>
            <div className="ckb-ed-canvas-body">
              {draft.components.length === 0 ? (
                <div className="ckb-ed-empty">
                  <div className="ckb-ed-empty-tile" aria-hidden="true">
                    <GripVertical size={26} />
                  </div>
                  <div className="ckb-ed-empty-title">Nenhum campo ainda</div>
                  <p className="ckb-ed-empty-sub">
                    Escolha um campo na coluna da esquerda para começar. Uma vistoria de coleta costuma ter veículo, mapa de
                    avarias, fotos e assinatura.
                  </p>
                </div>
              ) : null}

              {draft.sections.map((title, sectionIndex) => {
                const items = componentsInSection(draft, sectionIndex);
                // E3b-10: remover seção reindexa os campos seguintes (mudança de campo) — travado com a trava.
                const removeSectionReason = editorLockReasonFor(lock, "Remover a seção move os campos seguintes");
                return (
                  <div key={`${title}-${sectionIndex}`} className="ckb-ed-section">
                    <div className="ckb-ed-section-head">
                      <span className="ckb-ed-section-chip">SEÇÃO</span>
                      <input
                        className="ckb-ed-section-title"
                        value={title}
                        aria-label="Nome da seção"
                        readOnly={!canUpdate || visibility.editingFrozen}
                        onChange={(event) => applyDraft(renameEditorSection(draft, sectionIndex, event.target.value))}
                      />
                      <span className="ckb-ed-section-count">{editorSectionCount(items.length)}</span>
                      {visibility.addSection && canRemoveEditorSection(draft, sectionIndex) ? (
                        <button
                          type="button"
                          className="ckb-ed-section-del"
                          title={removeSectionReason || "Remover seção vazia"}
                          aria-label={`Remover a seção ${title}`}
                          aria-disabled={removeSectionReason ? true : undefined}
                          data-explica={removeSectionReason || undefined}
                          onClick={() =>
                            removeSectionReason
                              ? explainLocked(removeSectionReason)
                              : applyDraft(removeEditorSection(draft, sectionIndex))
                          }
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <div className="ckb-ed-section-items">
                      {items.map((component) => (
                        <EditorFieldCard
                          key={component.id}
                          component={component}
                          selected={component.id === selectedComponentId}
                          showActions={visibility.fieldActions}
                          lockedReason={lockReason}
                          lockChip={appearance === "B" && knownLock !== null ? knownLock.activeRuns : null}
                          onExplain={explainLocked}
                          onSelect={() => setSelectedComponentId(component.id)}
                          onMove={(direction) => applyDraft(moveEditorComponent(draft, component.id, direction))}
                          onDuplicate={() => handleDuplicate(component.id)}
                          onRemove={() => handleRemove(component.id)}
                        />
                      ))}
                      {items.length === 0 ? (
                        <div className="ckb-ed-section-empty">Seção vazia — adicione um campo pela coluna da esquerda</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {showConflictCompare && conflict ? (
            <EditorConflictCompare
              differences={conflictDifferences}
              savedAt={conflict.latest.updatedAt}
              openedAt={openedAt}
              onReload={() => void handleReloadFromConflict()}
              onOverwrite={overwrite}
            />
          ) : showImpactPanel && knownLock ? (
            <EditorImpactPanel
              lock={knownLock}
              status={checklist.status}
              component={selectedComponent}
              frozen={visibility.editingFrozen}
              canInactivate={visibility.save}
              onInactivate={() => handleToggleStatus()}
              onChangeLabel={(label) => selectedComponent && applyDraft(updateEditorComponent(draft, selectedComponent.id, { label }))}
              onChangeHelp={(help) => selectedComponent && applyDraft(updateEditorComponent(draft, selectedComponent.id, { help }))}
            />
          ) : visibility.inspector ? (
            <ChecklistFieldInspector
              frozen={visibility.editingFrozen}
              component={selectedComponent}
              lock={lock}
              showLockNote={appearance === "A"}
              onExplain={explainLocked}
              onChangeLabel={(label) => selectedComponent && applyDraft(updateEditorComponent(draft, selectedComponent.id, { label }))}
              onChangeHelp={(help) => selectedComponent && applyDraft(updateEditorComponent(draft, selectedComponent.id, { help }))}
              onToggleRequired={() =>
                selectedComponent &&
                applyDraft(updateEditorComponent(draft, selectedComponent.id, { required: !selectedComponent.required }))
              }
              onConfigChange={(change: ChecklistConfigChange) =>
                selectedComponent && applyDraft(applyChecklistConfigChange(draft, selectedComponent.id, change))
              }
            />
          ) : null}

          {showPreviewDock ? (
            <ChecklistPreviewDock draft={draft} organizationName={organizationName} onClose={() => setPreviewOpen(false)} />
          ) : null}
        </div>
      ) : (
        <ApplicabilityTab />
      )}

      {showPreviewModal ? (
        <ChecklistPreviewModal
          draft={draft}
          organizationName={organizationName}
          blockers={publishBlockers}
          canPublish={canPublish}
          publishTitle={publishState.title}
          publishLocked={publishState.locked}
          publishBusy={saving}
          onClose={() => setPreviewOpen(false)}
          onPublish={() => void handlePublish()}
        />
      ) : null}

      {confirmExit ? (
        <ExitConfirmDialog
          onCancel={() => {
            setConfirmExit(false);
            setPendingExitPath(null);
          }}
          onSaveAndExit={() => void handleSaveAndExit()}
          onDiscard={() => {
            const destination = pendingExitPath;
            setConfirmExit(false);
            setPendingExitPath(null);
            setDirty(false);
            leaveEditor(destination);
          }}
        />
      ) : null}

      {confirmInactivate ? (
        <InactivateConfirmDialog
          activeRuns={knownLock?.activeRuns ?? null}
          onCancel={() => setConfirmInactivate(false)}
          onConfirm={() => {
            setConfirmInactivate(false);
            void changeStatus("inactive");
          }}
        />
      ) : null}

      {/* A · Padrão fiel: o diálogo de hoje, com a linha de horário (E3b-14). */}
      {conflict && appearance === "A" ? (
        <ConcurrentEditDialog
          when={conflictWhenLine(conflict.latest.updatedAt, openedAt)}
          onReload={() => void handleReloadFromConflict()}
          onOverwrite={overwrite}
        />
      ) : null}

      <ChecklistToast toast={toast} />
    </div>
  );
}

/**
 * Paleta 264px — clique adiciona ao formulário (o protótipo não faz arrastar-e-soltar aqui).
 * PR-02d: com a pré-visualização em dock ela COLAPSA para 76px de ícones (`palFull` do protótipo);
 * o rótulo continua acessível pelo `title`/`aria-label` de cada botão, nunca só pela cor do tile.
 */
function EditorPalette({
  catalog,
  onAdd,
  collapsed = false,
  frozen = false,
  lockedReason = "",
  onExplain = () => undefined,
}: {
  readonly catalog: readonly TenantChecklistComponentCatalogItem[];
  readonly onAdd: (item: TenantChecklistComponentCatalogItem) => void;
  readonly collapsed?: boolean;
  /** B-SAN3-22 — acrescentar campo é mudança de campo: travado, o clique explica (nunca `disabled`). */
  readonly lockedReason?: string;
  readonly onExplain?: (message: string) => void;
  /** Junta PR-02d: durante a gravação a paleta fica MONTADA e desabilitada — desmontá-la mudava
   *  a contagem de filhos da grade e quebrava o layout (o dock saltava de linha a cada Salvar). */
  readonly frozen?: boolean;
}) {
  return (
    <section className={collapsed ? "ckb-ed-col ckb-ed-col--compact" : "ckb-ed-col"}>
      {collapsed ? null : (
        <div className="ckb-ed-col-head ckb-ed-col-head--stack">
          <div>
            <div className="ckb-ed-col-title">Campos disponíveis</div>
            <div className="ckb-ed-col-sub">Clique para adicionar ao formulário</div>
          </div>
        </div>
      )}
      <div className="ckb-ed-palette-body">
        {catalog.map((item) => {
          // §3 — o catálogo do backend devolve rótulo/descrição sem acento; a UI usa SEMPRE o
          // mapa PT-BR local e jamais a chave técnica.
          const label = resolveChecklistComponentTypeLabel(item.type, item.label);
          const description = resolveChecklistComponentTypeDescription(item.type, item.description);
          const tile = resolveChecklistComponentTile(item.type);
          const TileIcon = tile.Icon;
          return (
            <button
              key={item.type}
              type="button"
              className={collapsed ? "ckb-ed-pal-item ckb-ed-pal-item--compact" : "ckb-ed-pal-item"}
              title={lockedReason || `${label} — ${description}`}
              aria-label={`Adicionar campo ${label}`}
              aria-disabled={lockedReason ? true : undefined}
              data-explica={lockedReason || undefined}
              disabled={frozen}
              onClick={() => (lockedReason ? onExplain(lockedReason) : onAdd(item))}
            >
              <span className="ckb-ed-pal-tile" style={{ background: tile.bg, color: tile.fg }} aria-hidden="true">
                <TileIcon size={16} />
              </span>
              {collapsed ? null : (
                <>
                  <span className="ckb-ed-pal-text">
                    <span className="ckb-ed-pal-label">{label}</span>
                    <span className="ckb-ed-pal-desc">{description}</span>
                  </span>
                  <span className="ckb-ed-pal-plus" aria-hidden="true">
                    <Plus size={12} />
                  </span>
                </>
              )}
            </button>
          );
        })}
        {catalog.length === 0 ? (
          <p className="ckb-ed-palette-empty">Os campos disponíveis não puderam ser carregados agora.</p>
        ) : null}
      </div>
    </section>
  );
}

function EditorFieldCard({
  component,
  selected,
  showActions,
  lockedReason = "",
  lockChip = null,
  onExplain = () => undefined,
  onSelect,
  onMove,
  onDuplicate,
  onRemove,
}: {
  readonly component: ChecklistEditorComponent;
  readonly selected: boolean;
  readonly showActions: boolean;
  /** B-SAN3-22 — mover, duplicar e remover são mudança de campo: travados, o clique explica. */
  readonly lockedReason?: string;
  /** Aparência B: o selo "em uso" no cartão, com N vistorias no `title`. */
  readonly lockChip?: number | null;
  readonly onExplain?: (message: string) => void;
  readonly onSelect: () => void;
  readonly onMove: (direction: "up" | "down") => void;
  readonly onDuplicate: () => void;
  readonly onRemove: () => void;
}) {
  const tile = resolveChecklistComponentTile(component.type);
  const TileIcon = tile.Icon;
  const typeLabel = resolveChecklistComponentTypeLabel(component.type, component.type);

  return (
    // O card inteiro seleciona no clique (mouse), mas o alvo ACESSÍVEL é o botão do rótulo —
    // um `role="button"` no contêiner aninharia os botões de ação dentro de outro botão.
    <div className={selected ? "ckb-ed-field ckb-ed-field--selected" : "ckb-ed-field"} onClick={onSelect}>
      {/* Grip DECORATIVO: a reordenação real é pelos botões ↑/↓ (o protótipo também não
          implementa arrastar-e-soltar aqui; DnD real exigiria dependência nova + junta). */}
      <span className="ckb-ed-field-grip" title="Arrastar para reordenar" aria-hidden="true">
        <GripVertical size={15} />
      </span>
      <span className="ckb-ed-field-tile" style={{ background: tile.bg, color: tile.fg }} aria-hidden="true">
        <TileIcon size={16} />
      </span>
      <button
        type="button"
        className="ckb-ed-field-main"
        aria-pressed={selected}
        aria-label={`Configurar o campo ${component.label}`}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <span className="ckb-ed-field-labelrow">
          <span className="ckb-ed-field-label">{component.label}</span>
          {component.required ? (
            <span className="ckb-ed-field-required" title="Resposta obrigatória">
              *
            </span>
          ) : null}
          {lockChip !== null ? (
            <span
              className="ckb-ed-field-lock"
              title={`Em uso por ${lockChip} ${lockChip === 1 ? "vistoria" : "vistorias"}: só o texto pode mudar`}
            >
              <Lock size={10} aria-hidden="true" />
              em uso
            </span>
          ) : null}
        </span>
        <span className="ckb-ed-field-meta">
          <span className="ckb-ed-field-type">{typeLabel}</span>
          {editorFieldChips(component).map((chip) => (
            <span key={chip.text} className="ckb-ed-chip" style={{ background: chip.bg, color: chip.fg }}>
              {chip.text}
            </span>
          ))}
        </span>
      </button>
      {showActions ? (
        <span className="ckb-ed-field-actions">
          <FieldActionButton label="Mover para cima" lockedReason={lockedReason} onExplain={onExplain} onClick={() => onMove("up")}>
            <ChevronUp size={13} />
          </FieldActionButton>
          <FieldActionButton label="Mover para baixo" lockedReason={lockedReason} onExplain={onExplain} onClick={() => onMove("down")}>
            <ChevronDown size={13} />
          </FieldActionButton>
          <FieldActionButton label="Duplicar campo" lockedReason={lockedReason} onExplain={onExplain} onClick={onDuplicate}>
            <Copy size={12} />
          </FieldActionButton>
          <FieldActionButton label="Remover campo" danger lockedReason={lockedReason} onExplain={onExplain} onClick={onRemove}>
            <Trash2 size={13} />
          </FieldActionButton>
        </span>
      ) : null}
    </div>
  );
}

function FieldActionButton({
  label,
  danger,
  lockedReason = "",
  onExplain = () => undefined,
  onClick,
  children,
}: {
  readonly label: string;
  readonly danger?: boolean;
  readonly lockedReason?: string;
  readonly onExplain?: (message: string) => void;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={danger ? "ckb-ed-field-btn ckb-ed-field-btn--danger" : "ckb-ed-field-btn"}
      title={lockedReason || label}
      aria-label={label}
      aria-disabled={lockedReason ? true : undefined}
      data-explica={lockedReason || undefined}
      onClick={(event) => {
        event.stopPropagation();
        if (lockedReason) {
          onExplain(lockedReason);
          return;
        }
        onClick();
      }}
    >
      {children}
    </button>
  );
}

/**
 * Aba Aplicabilidade — ESTÁTICA e assumidamente "Em breve" (D-007: as duas linhas são exemplo
 * ilustrativo inerte, nunca dado real da organização). A aplicabilidade de verdade é a
 * sub-sequência do PR-04 (D-CHK-P1-APPLICABILITY).
 */
function ApplicabilityTab() {
  const exampleRules = [
    { servico: "Guincho — remoção", cliente: "Todos os clientes", fase: "Coleta" },
    { servico: "Guincho — remoção", cliente: "Seguradora Atlas", fase: "Entrega" },
  ];

  return (
    <div className="ckb-ed-aplic" role="tabpanel" id="ckb-panel-aplicabilidade" aria-labelledby="ckb-tab-aplicabilidade">
      <div className="ckb-ed-aplic-inner">
        <div className="ckb-ed-info">
          <div className="ckb-ed-info-tile" aria-hidden="true">
            <HelpCircle size={16} />
          </div>
          <div>
            <div className="ckb-ed-info-title">Quando este checklist é enviado ao técnico</div>
            <div className="ckb-ed-info-sub">
              As regras abaixo definem em quais serviços o modelo entra automaticamente. Quem despacha a ordem ainda pode
              ajustar antes de enviar.
            </div>
          </div>
        </div>

        <div className="ckb-ed-card">
          <div className="ckb-ed-card-head">
            <div>
              <div className="ckb-ed-card-title">Regras de aplicação</div>
              <div className="ckb-ed-card-sub">Uma ordem pode receber mais de um checklist</div>
            </div>
            <span className="ckb-ed-soon-pill">Em breve</span>
          </div>
          {exampleRules.map((rule) => (
            <div key={`${rule.cliente}-${rule.fase}`} className="ckb-ed-rule" title="Exemplo ilustrativo — em breve">
              <div>
                <span className="ckb-ed-rule-label">Tipo de serviço</span>
                <div className="ckb-ed-rule-box">{rule.servico}</div>
              </div>
              <div>
                <span className="ckb-ed-rule-label">Cliente</span>
                <div className="ckb-ed-rule-box">{rule.cliente}</div>
              </div>
              <div>
                <span className="ckb-ed-rule-label">Fase</span>
                <div className="ckb-ed-rule-box">{rule.fase}</div>
              </div>
              <button type="button" className="ckb-ed-rule-del" aria-label="Remover regra" disabled>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
          <div className="ckb-ed-rule-add-wrap">
            <button type="button" className="ckb-ed-rule-add" disabled>
              <Plus size={14} aria-hidden="true" />
              Adicionar regra
            </button>
          </div>
        </div>

        <div className="ckb-ed-publish-card">
          <div className="ckb-ed-publish-title">O que acontece ao publicar</div>
          <p className="ckb-ed-publish-text">
            Publicar congela esta versão do modelo. Ordens já despachadas continuam com a versão que receberam — nada muda
            para o técnico que já está em campo.
          </p>
          <div className="ckb-ed-publish-tiles">
            <div className="ckb-ed-publish-tile ckb-ed-publish-tile--ok">
              <div className="ckb-ed-publish-tile-title">Novas ordens</div>
              <div className="ckb-ed-publish-tile-sub">Recebem a versão recém-publicada</div>
            </div>
            <div className="ckb-ed-publish-tile">
              <div className="ckb-ed-publish-tile-title">Em andamento</div>
              <div className="ckb-ed-publish-tile-sub">Mantêm a versão recebida no despacho</div>
            </div>
            <div className="ckb-ed-publish-tile">
              <div className="ckb-ed-publish-tile-title">Concluídas</div>
              <div className="ckb-ed-publish-tile-sub">Ficam imutáveis, com trilha de auditoria</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal "Sair sem salvar?" do protótipo. Exportado porque é o CONTRATO de cópia da saída suja —
 * o smoke o audita diretamente (o estado que o abre depende de interação, que o SSR não executa).
 * Nota (não feito aqui): o bloqueio é só do botão Voltar; um blocker GLOBAL de rota (sidebar,
 * back do navegador) exigiria `useBlocker`/data-router — registrado para o PR-02c.
 */
export function ExitConfirmDialog({
  onCancel,
  onSaveAndExit,
  onDiscard,
}: {
  readonly onCancel: () => void;
  readonly onSaveAndExit: () => void;
  readonly onDiscard: () => void;
}) {
  // Esc = "Continuar editando" (a saída mais conservadora: nunca descarta por tecla).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="ckb-ed-modal-overlay">
      <div className="ckb-ed-modal" role="dialog" aria-modal="true" aria-labelledby="ckb-exit-title">
        <div className="ckb-ed-modal-tile" aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
        <div className="ckb-ed-modal-title" id="ckb-exit-title">
          Sair sem salvar?
        </div>
        <p className="ckb-ed-modal-text">
          Você tem alterações que ainda não foram salvas neste modelo. Se sair agora, elas serão perdidas.
        </p>
        <div className="ckb-ed-modal-actions">
          {/* Diálogo modal: o foco entra nele pela opção CONSERVADORA (continuar editando) —
              nunca pelo "Descartar", que perderia o trabalho com um Enter distraído. */}
          <button type="button" className="ckb-ed-modal-btn" autoFocus onClick={onCancel}>
            Continuar editando
          </button>
          <button type="button" className="ckb-ed-modal-btn ckb-ed-modal-btn--primary" onClick={onSaveAndExit}>
            Salvar e sair
          </button>
          <button type="button" className="ckb-ed-modal-btn ckb-ed-modal-btn--danger" onClick={onDiscard}>
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * B-SAN3-22 (E3b-17) — confirmação de inativar, no molde do "Sair sem salvar?": as novas ordens deixam de usar o
 * modelo; quem está no campo termina. Foco na saída conservadora (continuar), Esc cancela.
 */
export function InactivateConfirmDialog({
  activeRuns,
  onCancel,
  onConfirm,
}: {
  /** Vistorias em andamento conhecidas (null = não confirmado). */
  readonly activeRuns: number | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const inField =
    activeRuns === null || activeRuns === 0
      ? "Quem está no campo com este modelo termina a vistoria normalmente."
      : `Quem está no campo termina: ${activeRuns === 1 ? "a vistoria em andamento continua" : `as ${activeRuns} vistorias em andamento continuam`} com este modelo.`;

  return (
    <div className="ckb-ed-modal-overlay">
      <div className="ckb-ed-modal" role="dialog" aria-modal="true" aria-labelledby="ckb-inactivate-title">
        <div className="ckb-ed-modal-tile" aria-hidden="true">
          <Ban size={22} />
        </div>
        <div className="ckb-ed-modal-title" id="ckb-inactivate-title">
          Inativar este modelo?
        </div>
        <p className="ckb-ed-modal-text">As novas ordens deixam de usar o modelo. {inField}</p>
        <div className="ckb-ed-modal-actions">
          <button type="button" className="ckb-ed-modal-btn" autoFocus onClick={onCancel}>
            Continuar editando
          </button>
          <button type="button" className="ckb-ed-modal-btn ckb-ed-modal-btn--danger" onClick={onConfirm}>
            Inativar modelo
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * P-CHK-PATCH-SEM-LOCK — diálogo do conflito ao salvar. Exportado porque a cópia é o contrato desta guarda (o
 * estado que o abre depende de rede + interação, que o SSR não executa).
 *
 * B-SAN3-22: a trava agora é do SERVIDOR (o salvar leva o `updatedAt` lido; 409 se alguém gravou depois). O
 * diálogo é a apresentação da aparência A, com o texto de sempre e a linha de horário da referência aprovada
 * (E3b-14). Sem `onOverwrite` (conflito no publicar/inativar), só "Recarregar".
 */
export function ConcurrentEditDialog({
  when,
  onReload,
  onOverwrite,
}: {
  /** "Salvo por outra pessoa às HH:MM · você abriu às HH:MM" — omitida quando não há as duas horas. */
  readonly when?: string;
  readonly onReload: () => void;
  readonly onOverwrite?: () => void;
}) {
  return (
    <div className="ckb-ed-modal-overlay">
      <div className="ckb-ed-modal" role="dialog" aria-modal="true" aria-labelledby="ckb-conflict-title">
        <div className="ckb-ed-modal-tile" aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
        <div className="ckb-ed-modal-title" id="ckb-conflict-title">
          Outra pessoa alterou este modelo
        </div>
        <p className="ckb-ed-modal-text">
          Este modelo foi alterado por outra pessoa depois que você o abriu. Recarregar traz a versão mais recente e
          descarta as suas alterações não salvas; sobrescrever mantém as suas e substitui as dela.
        </p>
        {when ? <div className="ckb-ed-modal-when">{when}</div> : null}
        <div className="ckb-ed-modal-actions">
          {/* Foco na saída CONSERVADORA: recarregar não destrói o trabalho de quem já salvou. */}
          <button type="button" className="ckb-ed-modal-btn" autoFocus onClick={onReload}>
            Recarregar o modelo
          </button>
          {onOverwrite ? (
            <button type="button" className="ckb-ed-modal-btn ckb-ed-modal-btn--danger" onClick={onOverwrite}>
              Sobrescrever mesmo assim
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Skeleton do editor (§7) — mesma shimmer da lista, no esqueleto de 3 colunas. */
function ChecklistEditorSkeleton() {
  return (
    <div className="ckb-ed" aria-hidden="true">
      <div className="ckb-ed-skl-head">
        <div className="ckb-skl" style={{ width: 34, height: 34 }} />
        <div className="ckb-skl" style={{ width: 280, height: 26 }} />
        <div className="ckb-skl" style={{ width: 120, height: 26 }} />
      </div>
      <div className="ckb-ed-grid">
        <div className="ckb-skl" style={{ height: 360 }} />
        <div className="ckb-skl" style={{ height: 360 }} />
        <div className="ckb-skl" style={{ height: 360 }} />
      </div>
    </div>
  );
}
