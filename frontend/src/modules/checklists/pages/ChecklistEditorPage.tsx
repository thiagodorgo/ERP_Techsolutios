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
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../../../services/api/client";
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
} from "../checklist-editor.model";
import type { ChecklistConfigChange, ChecklistEditorComponent, ChecklistEditorDraft } from "../checklist-editor.model";
import {
  getTenantChecklist,
  listTenantChecklistComponents,
  publishTenantChecklist,
  updateTenantChecklist,
} from "../checklist.service";
import { CHECKLIST_STATUS_TONE, resolveChecklistComponentTile } from "../checklist-tiles";
import { ChecklistFieldInspector } from "../components/ChecklistFieldInspector";
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
// FORA DESTE PR (não fingir que existe): a pré-visualização em frame de telefone é o PR-02d — o
// botão existe na composição do header, DESABILITADO e marcado "Em breve".

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
}: {
  readonly initialChecklist?: TenantChecklist;
  readonly initialComponents?: readonly TenantChecklistComponentCatalogItem[];
  readonly initialTab?: EditorTab;
  /** Costura de teste: seleciona o campo pela CHAVE (o id é regenerado pelo backend a cada PATCH). */
  readonly initialSelectedComponentKey?: string;
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

  const [checklist, setChecklist] = useState<TenantChecklist | null>(initialChecklist ?? null);
  const [draft, setDraft] = useState<ChecklistEditorDraft | null>(
    initialChecklist ? createEditorDraftFromChecklist(initialChecklist) : null,
  );
  const [catalog, setCatalog] = useState<readonly TenantChecklistComponentCatalogItem[]>(initialComponents ?? []);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    initialSelectedComponentKey && initialChecklist
      ? (initialChecklist.components.find((component) => component.componentKey === initialSelectedComponentKey)?.id ?? null)
      : null,
  );
  const [tab, setTab] = useState<EditorTab>(initialTab ?? "estrutura");
  const [dirty, setDirty] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  /** Para onde o usuário tentou ir com o rascunho sujo — `null` = a lista de modelos (botão Voltar). */
  const [pendingExitPath, setPendingExitPath] = useState<string | null>(null);
  /** P-CHK-PATCH-SEM-LOCK: versão do servidor que mudou embaixo desta sessão de edição. */
  const [conflict, setConflict] = useState<TenantChecklist | null>(null);
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

    const result = duplicateEditorComponent(draft, componentId);
    applyDraft(result.draft);
    if (result.componentId) setSelectedComponentId(result.componentId);
  }

  function handleRemove(componentId: string) {
    if (!draft) return;

    applyDraft(removeEditorComponent(draft, componentId));
    if (selectedComponentId === componentId) setSelectedComponentId(null);
  }

  /**
   * PATCH do modelo. O backend REGENERA o id de cada componente a cada gravação (o `componentKey`
   * é que sobrevive), então a seleção é reancorada pela chave — senão o inspector "perderia" o
   * campo que o usuário acabou de configurar.
   *
   * `base` é o modelo do servidor usado como referência (schema-base + id). `force` pula a
   * checagem de edição concorrente (o usuário já escolheu sobrescrever).
   */
  async function persistDraft(options: { readonly force?: boolean; readonly base?: TenantChecklist } = {}): Promise<boolean> {
    const target = options.base ?? checklist;
    if (!apiContext || !target || !draft) return false;

    // O backend REJEITA (400) modelo sem campo e campo de escolha sem opções — espelhado aqui para
    // o usuário não perder o clique num erro de validação cru depois de montar o formulário todo.
    const blockers = checklistSaveBlockers(draft);
    if (blockers.length > 0) {
      showToast(blockers[0], "warn");
      return false;
    }

    setSaving(true);

    try {
      // P-CHK-PATCH-SEM-LOCK (mitigação sem mudar contrato): o PATCH é last-write-wins. Antes de
      // gravar, relê o modelo; se o `updatedAt` mudou desde a carga, alguém salvou por baixo — e a
      // decisão (recarregar × sobrescrever) passa a ser do usuário, não um apagamento silencioso.
      if (!options.force) {
        const latest = await readLatestChecklist(target.id);
        if (latest && latest.updatedAt !== target.updatedAt) {
          setConflict(latest);
          return false;
        }
      }

      const saved = await updateTenantChecklist(apiContext, target.id, buildUpdateInputFromEditorDraft(draft, target.schema));
      const selectedKey = selectedComponent?.componentKey;
      const nextDraft = createEditorDraftFromChecklist(saved);
      setChecklist(saved);
      setDraft(nextDraft);
      setDirty(false);
      setSelectedComponentId(
        selectedKey ? (nextDraft.components.find((component) => component.componentKey === selectedKey)?.id ?? null) : null,
      );
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao salvar o modelo.", "warn");
      return false;
    } finally {
      setSaving(false);
    }
  }

  /**
   * Releitura best-effort para a guarda de concorrência. Se a leitura falhar (rede), devolve
   * `null` e a gravação SEGUE: uma checagem opcional que falha não pode tirar do usuário a
   * capacidade de salvar — o PATCH em si mostrará o erro real se a rede estiver fora.
   */
  async function readLatestChecklist(checklistIdToRead: string): Promise<TenantChecklist | null> {
    if (!apiContext) return null;
    try {
      return await getTenantChecklist(apiContext, checklistIdToRead);
    } catch {
      return null;
    }
  }

  async function handleSave() {
    if (await persistDraft()) showToast("Modelo salvo. Publique para enviar ao aplicativo.", "ok");
  }

  function handleReloadFromConflict() {
    if (!conflict) return;
    setChecklist(conflict);
    setDraft(createEditorDraftFromChecklist(conflict));
    setSelectedComponentId(null);
    setDirty(false);
    setConflict(null);
    showToast("Modelo recarregado com a versão mais recente. As suas alterações não salvas foram descartadas.", "info");
  }

  async function handleOverwriteConflict() {
    const latest = conflict;
    setConflict(null);
    if (!latest) return;
    // Sobrescrever usa o schema RECÉM-lido como base: os campos são os desta sessão, mas nenhuma
    // chave de schema que a outra pessoa gravou é derrubada por um payload obsoleto.
    if (await persistDraft({ force: true, base: latest })) {
      showToast("Modelo salvo por cima da versão anterior. Publique para enviar ao aplicativo.", "ok");
    }
  }

  // Junta PR-02b (ALTA): deixar Publicar desabilitado REMOVEU capacidade real do produto — o
  // endpoint (POST /tenant/checklists/:id/publish) e o serviço já existem e funcionam.
  // PR-02c: guard-rails espelhando o validator + o rascunho é GRAVADO antes de publicar. Sem isso,
  // publicar com alterações não salvas publicava a versão ANTIGA do servidor e o editor ainda
  // sobrescrevia o rascunho com ela — perda silenciosa do trabalho na tela.
  async function handlePublish() {
    if (!apiContext || !checklist || saving) return;

    const blockers = checklistPublishBlockers(draft ?? createEditorDraftFromChecklist(checklist));
    if (blockers.length > 0) {
      showToast(blockers[0], "warn");
      return;
    }

    if (dirty && !(await persistDraft())) return;

    setSaving(true);
    try {
      const published = await publishTenantChecklist(apiContext, checklist.id);
      setChecklist(published);
      setDraft(createEditorDraftFromChecklist(published));
      setDirty(false);
      showToast("Modelo publicado — já está disponível no aplicativo para as próximas ordens.", "ok");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao publicar o modelo.", "warn");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Inativar/Reativar no editor (promessa da ata do PR-02a). Mesma chamada da lista
   * (`updateTenantChecklist({ status })`), gate `tenant_checklists:update`. NÃO redefine o
   * rascunho: quem tem alteração na tela não a perde por trocar a situação do modelo.
   */
  async function handleToggleStatus() {
    if (!apiContext || !checklist || saving) return;

    const nextStatus: TenantChecklistStatus = checklist.status === "inactive" ? "draft" : "inactive";
    setSaving(true);

    try {
      const saved = await updateTenantChecklist(apiContext, checklist.id, { status: nextStatus });
      setChecklist(saved);
      showToast(
        nextStatus === "inactive"
          ? "Modelo inativado — não entra em novas ordens."
          : "Modelo reativado como rascunho. Publique para enviar ao aplicativo.",
        "ok",
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao alterar a situação do modelo.", "warn");
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
                próximo Salvar, como qualquer outra edição. */}
            <select
              className="ckb-ed-type"
              value={draft.type}
              aria-label="Tipo do modelo"
              disabled={!canUpdate || visibility.editingFrozen}
              onChange={(event) => applyDraft({ ...draft, type: event.target.value as ChecklistEditorDraft["type"] })}
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
                lista (`updateTenantChecklist({ status })`). */}
            {visibility.save ? (
              <button
                type="button"
                className="ckb-ed-btn"
                title={statusActionLabel}
                aria-label={statusActionLabel}
                onClick={() => void handleToggleStatus()}
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
            {/* Junta PR-02b: controle parado marcado com o MESMO token de "parado" do protótipo
                (pill "Em breve" #F3E8FF/#7E22CE), em vez de um cinza de disabled que não existe
                em estado nenhum do desenho. */}
            <span className="ckb-ed-stopped">
              <button type="button" className="ckb-ed-btn" title="Pré-visualização chega em breve" disabled>
                <Smartphone size={15} aria-hidden="true" />
                Pré-visualizar
              </button>
              <span className="ckb-ed-soon-pill">Em breve</span>
            </span>
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
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {/* Navegação PROGRAMÁTICA do próprio editor: passa pela MESMA guarda de saída suja
              (a interceptação de clique só pega âncoras, e este controle é um botão). */}
          {visibility.runsLink ? (
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

      {tab === "estrutura" ? (
        <div
          className={visibility.palette ? "ckb-ed-grid" : "ckb-ed-grid ckb-ed-grid--readonly"}
          role="tabpanel"
          id="ckb-panel-estrutura"
          aria-labelledby="ckb-tab-estrutura"
        >
          {visibility.palette ? <EditorPalette catalog={catalog} onAdd={handleAddField} /> : null}

          <section className="ckb-ed-col">
            <div className="ckb-ed-col-head">
              <div>
                <div className="ckb-ed-col-title">O formulário</div>
                <div className="ckb-ed-col-sub">{editorCanvasMeta(draft, checklist.version)}</div>
              </div>
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
                          title="Remover seção vazia"
                          aria-label={`Remover a seção ${title}`}
                          onClick={() => applyDraft(removeEditorSection(draft, sectionIndex))}
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

          {visibility.inspector ? (
            <ChecklistFieldInspector
              frozen={visibility.editingFrozen}
              component={selectedComponent}
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
        </div>
      ) : (
        <ApplicabilityTab />
      )}

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

      {conflict ? (
        <ConcurrentEditDialog onReload={handleReloadFromConflict} onOverwrite={() => void handleOverwriteConflict()} />
      ) : null}

      <ChecklistToast toast={toast} />
    </div>
  );
}

/** Paleta 264px — clique adiciona ao formulário (o protótipo não faz arrastar-e-soltar aqui). */
function EditorPalette({
  catalog,
  onAdd,
}: {
  readonly catalog: readonly TenantChecklistComponentCatalogItem[];
  readonly onAdd: (item: TenantChecklistComponentCatalogItem) => void;
}) {
  return (
    <section className="ckb-ed-col">
      <div className="ckb-ed-col-head ckb-ed-col-head--stack">
        <div>
          <div className="ckb-ed-col-title">Campos disponíveis</div>
          <div className="ckb-ed-col-sub">Clique para adicionar ao formulário</div>
        </div>
      </div>
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
              className="ckb-ed-pal-item"
              title={`${label} — ${description}`}
              aria-label={`Adicionar campo ${label}`}
              onClick={() => onAdd(item)}
            >
              <span className="ckb-ed-pal-tile" style={{ background: tile.bg, color: tile.fg }} aria-hidden="true">
                <TileIcon size={16} />
              </span>
              <span className="ckb-ed-pal-text">
                <span className="ckb-ed-pal-label">{label}</span>
                <span className="ckb-ed-pal-desc">{description}</span>
              </span>
              <span className="ckb-ed-pal-plus" aria-hidden="true">
                <Plus size={12} />
              </span>
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
  onSelect,
  onMove,
  onDuplicate,
  onRemove,
}: {
  readonly component: ChecklistEditorComponent;
  readonly selected: boolean;
  readonly showActions: boolean;
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
          <FieldActionButton label="Mover para cima" onClick={() => onMove("up")}>
            <ChevronUp size={13} />
          </FieldActionButton>
          <FieldActionButton label="Mover para baixo" onClick={() => onMove("down")}>
            <ChevronDown size={13} />
          </FieldActionButton>
          <FieldActionButton label="Duplicar campo" onClick={onDuplicate}>
            <Copy size={12} />
          </FieldActionButton>
          <FieldActionButton label="Remover campo" danger onClick={onRemove}>
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
  onClick,
  children,
}: {
  readonly label: string;
  readonly danger?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={danger ? "ckb-ed-field-btn ckb-ed-field-btn--danger" : "ckb-ed-field-btn"}
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
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
 * P-CHK-PATCH-SEM-LOCK — mitigação de última-gravação-vence SEM mudar o contrato: o editor relê o
 * modelo antes de gravar e, se ele mudou desde a carga, entrega a decisão ao usuário em vez de
 * apagar o trabalho alheio em silêncio. Exportado porque a cópia é o contrato desta guarda (o
 * estado que a abre depende de rede + interação, que o SSR não executa).
 *
 * NÃO é optimistic locking de verdade (o `If-Match`/versão no contrato é proposta para junta): a
 * janela entre a releitura e o PATCH continua existindo, apenas encolhe de "a sessão inteira de
 * edição" para "o tempo de uma requisição".
 */
export function ConcurrentEditDialog({
  onReload,
  onOverwrite,
}: {
  readonly onReload: () => void;
  readonly onOverwrite: () => void;
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
        <div className="ckb-ed-modal-actions">
          {/* Foco na saída CONSERVADORA: recarregar não destrói o trabalho de quem já salvou. */}
          <button type="button" className="ckb-ed-modal-btn" autoFocus onClick={onReload}>
            Recarregar o modelo
          </button>
          <button type="button" className="ckb-ed-modal-btn ckb-ed-modal-btn--danger" onClick={onOverwrite}>
            Sobrescrever mesmo assim
          </button>
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
