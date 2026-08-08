import { AlertTriangle, Camera, Check, Send, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef } from "react";

import {
  checklistPreviewAccessibleSummary,
  checklistPreviewContextLine,
  checklistPreviewSections,
  checklistPreviewStats,
  checklistPreviewTitle,
} from "../checklist-preview.model";
import type { ChecklistPreviewItem } from "../checklist-preview.model";
import type { ChecklistEditorDraft } from "../checklist-editor.model";

// CHECKLIST P1 PR-02d — PRÉ-VISUALIZAÇÃO no frame de telefone, recriada dos blocos `previewModal`
// (modal 1080×760, painel navy 430px, frame 340px/radius 30/borda 9px) e `previewDock` (4ª coluna
// de 392px, frame radius 26/borda 8px) do protótipo do dono.
//
// O componente é de RENDER: recebe o rascunho REAL e desenha; toda leitura de `config` vem das
// funções puras de `checklist-preview.model.ts` (que por sua vez usam as MESMAS do inspector).
// Nada aqui inventa dado — inclusive o cabeçalho do telefone, que NÃO repete a "OS-4821 ·
// Transportes Ômega" do protótipo (D-007; ver `checklistPreviewContextLine`).

// Junta PR-02d (ALTA do critico-adversarial): a cópia anterior prometia "renderização fiel" do
// aplicativo — e o aplicativo de campo AINDA NÃO honra parte do que o inspector grava
// (P-CHK-CHIPS-SEM-CONSUMIDOR: tipos de veículo, marcadores de avaria e outras chaves não têm
// consumidor no render/Flutter). Prometer fidelidade seria mentir para o operador sobre o que o
// técnico vai ver. A tela passa a dizer o que ela REALMENTE é: a montagem do formulário.
const PREVIEW_TITLE = "Como o formulário fica montado";
const PREVIEW_SUB =
  "Uma simulação da ordem e do conteúdo dos campos no aplicativo de campo — não uma cópia do visual do aplicativo. Confira antes de publicar: depois de publicado, o modelo já sai nas próximas ordens.";

function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'),
  );
}

/**
 * Modal da pré-visualização. Dialog completo (a mesma régua do `KpiDetailModal`): `role="dialog"` +
 * `aria-modal` + `aria-labelledby`, foco preso, Esc fecha, clique fora fecha e o foco VOLTA para o
 * botão que abriu.
 */
export function ChecklistPreviewModal({
  draft,
  organizationName,
  blockers,
  canPublish,
  publishTitle,
  publishLocked,
  publishBusy = false,
  onClose,
  onPublish,
}: {
  readonly draft: ChecklistEditorDraft;
  readonly organizationName: string | null;
  readonly blockers: readonly string[];
  readonly canPublish: boolean;
  readonly publishTitle: string;
  readonly publishLocked: boolean;
  /** Gravando/publicando: o botão sai do ar de verdade (dois cliques = duas publicações). */
  readonly publishBusy?: boolean;
  readonly onClose: () => void;
  readonly onPublish: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = focusableWithin(dialogRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    restoreFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const id = window.setTimeout(() => {
      const focusables = focusableWithin(dialogRef.current);
      (focusables[0] ?? dialogRef.current)?.focus();
    }, 0);

    // Junta PR-02d (MÉDIA): o Esc só respondia com o foco DENTRO do diálogo — clicar no overlay
    // (ou qualquer perda de foco) deixava o usuário preso, tendo de achar o ✕ com o mouse.
    // Ouvindo no documento, Esc fecha sempre, como manda o padrão de diálogo modal.
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onDocumentKeyDown);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onDocumentKeyDown);
      // Sem isto o teclado "cai no topo da página" ao fechar — o foco volta ao Pré-visualizar.
      restoreFocusRef.current?.focus?.();
    };
  }, [onClose]);

  const stats = checklistPreviewStats(draft);

  return (
    <div className="ckb-pv-overlay" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="ckb-pv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="ckb-pv-side">
          <div className="ckb-pv-head">
            <div>
              <div className="ckb-pv-kicker">PRÉ-VISUALIZAÇÃO</div>
              <h2 className="ckb-pv-title" id={titleId}>
                {PREVIEW_TITLE}
              </h2>
              <p className="ckb-pv-sub">{PREVIEW_SUB}</p>
            </div>
            <button type="button" className="ckb-pv-close" aria-label="Fechar pré-visualização" onClick={onClose}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="ckb-pv-summary">
            <div className="ckb-pv-summary-title">Resumo do modelo</div>
            <div className="ckb-pv-stats">
              {stats.map((stat) => (
                <div key={stat.key} className="ckb-pv-stat">
                  <span className="ckb-pv-stat-dot" style={{ background: stat.color }} aria-hidden="true" />
                  <span className="ckb-pv-stat-value">{stat.value}</span>
                  <span className="ckb-pv-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {blockers.length > 0 ? (
            // Protótipo: banner âmbar único com a 1ª mensagem. DIVERGÊNCIA CONSCIENTE — aqui saem
            // TODOS os bloqueios: este é justamente o momento de "conferir antes de publicar", e
            // esconder o 2º bloqueio obrigaria o usuário a descobri-lo por tentativa.
            <div className="ckb-pv-banner ckb-pv-banner--block" role="status">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                {blockers.map((blocker) => (
                  <span key={blocker} className="ckb-pv-banner-line">
                    {blocker}
                  </span>
                ))}
              </span>
            </div>
          ) : (
            <div className="ckb-pv-banner ckb-pv-banner--ok" role="status">
              <Check size={16} aria-hidden="true" />
              <span>Modelo pronto para publicar</span>
            </div>
          )}

          <div className="ckb-pv-spacer" />

          <div className="ckb-pv-actions">
            <button type="button" className="ckb-pv-btn" onClick={onClose}>
              Continuar editando
            </button>
            {canPublish ? (
              // Travado NÃO usa `disabled` (mesma decisão do header): o clique EXPLICA o bloqueio.
              <button
                type="button"
                className={publishLocked ? "ckb-pv-btn ckb-pv-btn--publish ckb-pv-btn--locked" : "ckb-pv-btn ckb-pv-btn--publish"}
                title={publishTitle}
                aria-disabled={publishLocked}
                disabled={publishBusy}
                onClick={onPublish}
              >
                <Send size={15} aria-hidden="true" />
                {/* Junta PR-02d: rótulo diz o que está acontecendo — sem isto o usuário via um
                    botão azul intacto que só não respondia durante a publicação. */}
                {publishBusy ? "Publicando…" : "Publicar modelo"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="ckb-pv-stage">
          <ChecklistPhoneFrame draft={draft} organizationName={organizationName} variant="modal" />
        </div>
      </div>
    </div>
  );
}

/**
 * Dock: a MESMA pré-visualização como 4ª coluna da aba Estrutura (392px). Quem decide dock × modal
 * é `resolveChecklistPreviewMode` — aqui só se renderiza o que foi decidido.
 */
export function ChecklistPreviewDock({
  draft,
  organizationName,
  onClose,
}: {
  readonly draft: ChecklistEditorDraft;
  readonly organizationName: string | null;
  readonly onClose: () => void;
}) {
  return (
    <aside className="ckb-pv-dock" aria-label="Pré-visualização do formulário no aplicativo de campo">
      <div className="ckb-pv-dock-head">
        <div>
          <div className="ckb-pv-dock-title">Como o formulário fica montado</div>
          <div className="ckb-pv-dock-sub">Aplicativo de campo · 390 × 812</div>
        </div>
        <button type="button" className="ckb-pv-dock-close" aria-label="Fechar pré-visualização" onClick={onClose}>
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="ckb-pv-dock-body">
        <ChecklistPhoneFrame draft={draft} organizationName={organizationName} variant="dock" />
      </div>
    </aside>
  );
}

/**
 * O telefone. O frame inteiro é ILUSTRAÇÃO (`aria-hidden`) — quem usa leitor de tela recebe o
 * resumo textual que vai logo acima, mais o card "Resumo do modelo" do modal.
 */
export function ChecklistPhoneFrame({
  draft,
  organizationName,
  variant,
}: {
  readonly draft: ChecklistEditorDraft;
  readonly organizationName: string | null;
  readonly variant: "modal" | "dock";
}) {
  const sections = checklistPreviewSections(draft);
  const isEmpty = draft.components.length === 0;

  return (
    <>
      <p className="ckb-pv-sr">{checklistPreviewAccessibleSummary(draft)}</p>
      <div className={variant === "dock" ? "ckb-pv-phone ckb-pv-phone--dock" : "ckb-pv-phone"} aria-hidden="true">
        <div className="ckb-pv-phone-head">
          <div className="ckb-pv-phone-status">
            <span>9:41</span>
            <span>4G ▮</span>
          </div>
          <div className="ckb-pv-phone-name">{checklistPreviewTitle(draft)}</div>
          {/* D-007: nome REAL da organização + rótulo neutro. Nada de OS fictícia. */}
          <div className="ckb-pv-phone-context">{checklistPreviewContextLine(organizationName)}</div>
        </div>
        <div className="ckb-pv-phone-body">
          {isEmpty ? (
            <div className="ckb-pv-phone-empty">
              <div className="ckb-pv-phone-empty-title">Nenhum campo ainda</div>
              <p className="ckb-pv-phone-empty-sub">
                Adicione campos ao formulário para ver aqui, exatamente, o que o técnico vai preencher em campo.
              </p>
            </div>
          ) : (
            <>
              {sections.map((section, sectionIndex) => (
                <div key={`${section.title}-${sectionIndex}`} className="ckb-pv-sec">
                  <div className="ckb-pv-sec-title">{section.title}</div>
                  {section.items.map((item) => (
                    <PreviewFieldCard key={item.id} item={item} />
                  ))}
                  {section.items.length === 0 ? <div className="ckb-pv-sec-empty">Seção sem campos</div> : null}
                </div>
              ))}
              {/* CTA final do protótipo — só existe quando existe formulário para concluir. */}
              <div className="ckb-pv-cta">Concluir checklist</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Um card por campo, com o corpo CERTO para cada um dos 10 tipos (protótipo, bloco `pi.*`). */
function PreviewFieldCard({ item }: { readonly item: ChecklistPreviewItem }) {
  return (
    <div className="ckb-pv-card">
      <div className="ckb-pv-card-label">
        {item.label}
        {item.required ? <span className="ckb-pv-req"> *</span> : null}
      </div>
      {item.help ? <div className="ckb-pv-card-help">{item.help}</div> : null}
      <PreviewFieldBody item={item} />
    </div>
  );
}

function PreviewFieldBody({ item }: { readonly item: ChecklistPreviewItem }) {
  if (item.type === "vehicle_selector") {
    if (item.vehicleChips.length === 0) {
      return <div className="ckb-pv-note">Nenhum tipo de veículo escolhido — o técnico não veria opção nenhuma.</div>;
    }
    return (
      <div className="ckb-pv-chips">
        {item.vehicleChips.map((chip) => (
          <span key={chip.label} className={chip.selected ? "ckb-pv-chip ckb-pv-chip--on" : "ckb-pv-chip"}>
            {chip.label}
          </span>
        ))}
      </div>
    );
  }

  if (item.type === "damage_map") {
    return (
      <>
        <div className="ckb-pv-damage">
          {/* Silhueta do protótipo, verbatim (viewBox 132×60), com dois pinos de exemplo. */}
          <svg width="132" height="60" viewBox="0 0 132 60" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinejoin="round">
            <path d="M10 42h112M16 42V30l14-16h72l14 16v12" />
            <circle cx="34" cy="45" r="7" />
            <circle cx="98" cy="45" r="7" />
            <path d="M30 30h72" />
          </svg>
          <span className="ckb-pv-pin ckb-pv-pin--a" />
          <span className="ckb-pv-pin ckb-pv-pin--b" />
        </div>
        {item.markerChips.length > 0 ? (
          <div className="ckb-pv-marks">
            {item.markerChips.map((mark) => (
              <span key={mark} className="ckb-pv-mark">
                {mark}
              </span>
            ))}
          </div>
        ) : (
          <div className="ckb-pv-note">Nenhum tipo de avaria escolhido — o técnico não teria o que marcar.</div>
        )}
      </>
    );
  }

  if (item.type === "photo_upload") {
    return (
      <>
        <div className="ckb-pv-slots">
          {Array.from({ length: item.photoSlots }, (_, index) => (
            <div key={index} className="ckb-pv-slot">
              <Camera size={15} />
            </div>
          ))}
        </div>
        <div className="ckb-pv-hint">{item.photoHint}</div>
      </>
    );
  }

  if (item.type === "observation") {
    return <div className={item.multiline ? "ckb-pv-textarea" : "ckb-pv-textarea ckb-pv-textarea--single"}>Digite aqui…</div>;
  }

  if (item.type === "single_choice" || item.type === "multi_choice") {
    if (item.options.length === 0) {
      // O protótipo desenha uma lista vazia; a lista vazia sozinha faria a tela parecer quebrada.
      return <div className="ckb-pv-note">Nenhuma opção configurada — o técnico não teria o que responder.</div>;
    }
    const single = item.type === "single_choice";
    return (
      <div className="ckb-pv-opts">
        {item.options.map((option, index) => (
          <div key={`${option}-${index}`} className="ckb-pv-opt">
            <span className={single ? "ckb-pv-radio" : "ckb-pv-check"} />
            <span className="ckb-pv-opt-text">{option}</span>
          </div>
        ))}
      </div>
    );
  }

  if (item.type === "signature") {
    return (
      <div className="ckb-pv-sign">
        {item.requireName ? <div className="ckb-pv-sign-name">Nome de quem assina</div> : null}
        <div className="ckb-pv-sign-pad">Assine no espaço acima</div>
      </div>
    );
  }

  if (item.type === "acknowledgement") {
    return (
      <div className="ckb-pv-ack">
        <span className="ckb-pv-check" />
        <span className="ckb-pv-ack-text">Declaro ciência da responsabilidade sobre o veículo</span>
      </div>
    );
  }

  if (item.type === "before_after") {
    return (
      <div className="ckb-pv-duo">
        <div className="ckb-pv-duo-slot">
          <Camera size={15} />
          <span>Antes</span>
        </div>
        <div className="ckb-pv-duo-slot">
          <Camera size={15} />
          <span>Depois</span>
        </div>
      </div>
    );
  }

  if (item.type === "comparison") {
    return (
      <div className="ckb-pv-duo">
        <div className="ckb-pv-cmp">Coleta</div>
        <div className="ckb-pv-cmp ckb-pv-cmp--now">Agora</div>
      </div>
    );
  }

  // Tipo sem desenho próprio: honestidade em vez de card mudo (o app renderiza o que souber).
  return <div className="ckb-pv-note">Este campo não tem uma prévia própria — o aplicativo o exibe como texto.</div>;
}
