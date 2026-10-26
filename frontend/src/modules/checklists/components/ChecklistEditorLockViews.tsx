import { AlertTriangle, Ban, Check, History, Layers, Lock, X } from "lucide-react";

import { KpiStatCard } from "../../../components/patterns/KpiStatCard";
import {
  activeRunsPhrase,
  componentHelpText,
  differencesPhrase,
  editorClock,
  editorLockPanelSub,
} from "../checklist-editor.model";
import type { ChecklistDraftDifference, ChecklistEditorComponent, ChecklistEditorLock } from "../checklist-editor.model";
import type { TenantChecklist } from "../types";

// B-SAN3-22 — as variantes dos estados "campos travados" e "conflito ao salvar" nas aparências B (Analítica) e
// C (Painel de impacto), recriadas da referência aprovada `screen-refs/checklist-editor-estados-3opcoes.reference.html`.
// Só compõem o que já existe: KpiStatCard (.pat-kpi--clickable), .pat-filtro-chip, .pat-ab-table, .ckb-ed-col e
// .ckb-ed-insp-*, as ações do diálogo de conflito (.ckb-ed-modal-btn). A aparência A é a tela de hoje com a faixa
// âmbar e o diálogo — vive na própria página.
//
// Nada fabricado (D-007): a B mostra os números que o servidor dá (vistorias em andamento, versão e data de
// publicação) e a contagem local de campos; a lista de vistorias e o histórico de versões não existem no servidor
// e ficam para o B-CHK-EDITOR-LEITURAS-B (resposta do dono à Q5).

export type EditorLockBlock = "runs" | "versao" | "campos";

const STATUS_TAG: Record<TenantChecklist["status"], { readonly label: string; readonly bg: string; readonly fg: string }> = {
  published: { label: "publicada", bg: "#DCFCE7", fg: "#15803D" },
  inactive: { label: "inativo", bg: "#F1F5F9", fg: "#64748B" },
  draft: { label: "rascunho", bg: "#F1F5F9", fg: "#475569" },
  archived: { label: "arquivado", bg: "#F1F5F9", fg: "#94A3B8" },
};

/** dd/mm (pt-BR) ou vazio. */
function shortDate(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** As 5 linhas fixas de "O que muda agora" (E3b-15) — a mesma régua do servidor, em linguagem de negócio. */
export const EDITOR_LOCK_RULES: readonly { readonly item: string; readonly free: boolean }[] = [
  { item: "Nome do modelo, descrição e nomes de seção", free: true },
  { item: "Pergunta e texto de ajuda de cada campo", free: true },
  { item: "Obrigatório, mínimo de fotos, opções, tipos de veículo e de avaria", free: false },
  { item: "Adicionar, remover, reordenar ou duplicar campo", free: false },
  { item: "Tipo do modelo e voltar a rascunho", free: false },
];

/** Opção B — os três blocos clicáveis acima da grade, cada um abre logo abaixo o seu conteúdo. */
export function EditorLockKpis({
  lock,
  checklist,
  fieldCount,
  block,
  onBlock,
}: {
  readonly lock: Extract<ChecklistEditorLock, { kind: "locked" }>;
  readonly checklist: Pick<TenantChecklist, "status" | "version" | "publishedAt">;
  readonly fieldCount: number;
  readonly block: EditorLockBlock | null;
  readonly onBlock: (next: EditorLockBlock | null) => void;
}) {
  const tag = STATUS_TAG[checklist.status];
  const published = checklist.status === "published";
  const publishedOn = shortDate(checklist.publishedAt);
  const inactive = checklist.status === "inactive";
  const toggle = (next: EditorLockBlock) => onBlock(block === next ? null : next);

  return (
    <div className="b22-faixa">
      <div className="kpi-grid">
        <KpiStatCard
          icon={History}
          iconBg="#FEF3C7"
          iconColor="#B45309"
          tag={{ label: "em uso", bg: "#FEF3C7", fg: "#B45309" }}
          value={lock.activeRuns}
          label="Vistorias em andamento"
          hint="usam este modelo agora"
          ariaLabel={`Vistorias em andamento: ${lock.activeRuns}. Mostra por que os campos estão travados`}
          onClick={() => toggle("runs")}
        />
        <KpiStatCard
          icon={Layers}
          iconBg={tag.bg}
          iconColor={tag.fg}
          tag={{ label: tag.label, bg: tag.bg, fg: tag.fg }}
          value={`v${checklist.version}`}
          label={published ? "Versão publicada" : "Versão atual"}
          hint={publishedOn ? `publicada em ${publishedOn}` : "ainda não publicada"}
          ariaLabel={`${published ? "Versão publicada" : "Versão atual"}: v${checklist.version}. Abre o resumo da versão`}
          onClick={() => toggle("versao")}
        />
        <KpiStatCard
          icon={Lock}
          iconBg="#F1F5F9"
          iconColor="#475569"
          tag={{ label: "travado", bg: "#F1F5F9", fg: "#475569" }}
          value={`${fieldCount} de ${fieldCount}`}
          label="Campos travados"
          hint={inactive ? "modelo inativo; só os textos mudam" : "só os textos podem mudar"}
          ariaLabel={`Campos travados: ${fieldCount} de ${fieldCount}. Abre o que pode e o que não pode mudar agora`}
          onClick={() => toggle("campos")}
        />
      </div>

      {block === "versao" ? (
        <div className="b22-lista">
          <div className="pat-filtro-chip-bar">
            <span className="pat-filtro-chip">
              {published ? "Versão publicada" : "Versão atual"}
              <button type="button" aria-label="Fechar o resumo" onClick={() => onBlock(null)}>
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          </div>
          <div className="pat-ab-detail-cell">
            <div className="pat-ab-detail-grid">
              <div className="pat-ab-detail-col">
                <h4>Versão</h4>
                <div className="pat-ab-detail-field">
                  <span className="pat-ab-detail-val">v{checklist.version}</span>
                </div>
              </div>
              <div className="pat-ab-detail-col">
                <h4>Publicada em</h4>
                <div className="pat-ab-detail-field">
                  <span className="pat-ab-detail-val">{publishedOn || "—"}</span>
                </div>
              </div>
              <div className="pat-ab-detail-col">
                <h4>Enquanto houver vistorias</h4>
                <div className="pat-ab-detail-field">
                  <span className="pat-ab-detail-val">os campos ficam travados; só os textos mudam</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {block === "campos" ? (
        <div className="b22-lista">
          <div className="pat-filtro-chip-bar">
            <span className="pat-filtro-chip">
              O que muda agora
              <button type="button" aria-label="Tirar o filtro" onClick={() => onBlock(null)}>
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          </div>
          <table className="pat-ab-table">
            <colgroup>
              <col />
              <col className="b22-col-agora" />
            </colgroup>
            <thead>
              <tr>
                <th>Item</th>
                <th>Agora</th>
              </tr>
            </thead>
            <tbody>
              {EDITOR_LOCK_RULES.map((rule) => (
                <tr key={rule.item} className="pat-ab-row">
                  <td title={rule.item}>{rule.item}</td>
                  <td>
                    <b style={{ color: rule.free ? "var(--color-status-success)" : "var(--color-status-warning)" }}>
                      {rule.free ? "pode mudar" : "travado"}
                    </b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

/** Opção C — com a trava, a coluna da direita vira "Em uso agora": a regra, como destravar e os textos do campo. */
export function EditorImpactPanel({
  lock,
  status,
  component,
  frozen,
  canInactivate,
  onInactivate,
  onChangeLabel,
  onChangeHelp,
}: {
  readonly lock: Extract<ChecklistEditorLock, { kind: "locked" }>;
  readonly status: TenantChecklist["status"];
  readonly component: ChecklistEditorComponent | null;
  readonly frozen: boolean;
  readonly canInactivate: boolean;
  readonly onInactivate: () => void;
  readonly onChangeLabel: (label: string) => void;
  readonly onChangeHelp: (help: string) => void;
}) {
  const runs = activeRunsPhrase(lock.activeRuns);
  const theRuns = lock.activeRuns === 1 ? "a vistoria terminar" : `as ${runs.replace(" em andamento", "")} terminarem`;
  const inactive = status === "inactive";

  return (
    <section className="ckb-ed-col">
      <div className="ckb-ed-col-head ckb-ed-col-head--stack">
        <div>
          <div className="ckb-ed-col-title">Em uso agora</div>
          <div className="ckb-ed-col-sub">{editorLockPanelSub(lock)}</div>
        </div>
      </div>
      <div className="ckb-ed-insp-body">
        <ul className="c22-lista">
          <li>
            <Check size={15} aria-hidden="true" style={{ color: "var(--color-status-success)" }} />
            <span>
              Nome do modelo, descrição, nomes de seção, pergunta e texto de ajuda — <strong>podem mudar agora</strong>
            </span>
          </li>
          <li>
            <X size={15} aria-hidden="true" style={{ color: "var(--color-status-warning)" }} />
            <span>Adicionar, remover, reordenar ou duplicar campo</span>
          </li>
          <li>
            <X size={15} aria-hidden="true" style={{ color: "var(--color-status-warning)" }} />
            <span>Obrigatório ou opcional, mínimo e máximo de fotos, opções de resposta, tipos de veículo e de avaria</span>
          </li>
          <li>
            <X size={15} aria-hidden="true" style={{ color: "var(--color-status-warning)" }} />
            <span>Tipo do modelo e voltar a rascunho</span>
          </li>
        </ul>

        <div className="ckb-ed-insp-section">Como mudar os campos</div>
        <p className="ckb-ed-insp-hint">
          {inactive
            ? `O modelo já está inativo: as novas ordens não o usam. Quando ${theRuns}, os campos destravam.`
            : `Inative o modelo: novas ordens deixam de usá-lo e quem está no campo termina. Quando ${theRuns}, os campos destravam.`}
        </p>
        {!inactive && canInactivate ? (
          <div className="c22-acoes">
            <button type="button" className="ckb-ed-btn" onClick={onInactivate}>
              <Ban size={14} aria-hidden="true" />
              Inativar modelo
            </button>
          </div>
        ) : null}

        <div className="ckb-ed-insp-section">Textos do campo selecionado</div>
        {component ? (
          <>
            <div className="ckb-ed-group">
              <label className="ckb-ed-label" htmlFor="ckb-impact-label">
                Pergunta exibida ao técnico
              </label>
              <input
                id="ckb-impact-label"
                className="ckb-ed-input"
                value={component.label}
                readOnly={frozen}
                onChange={(event) => onChangeLabel(event.target.value)}
              />
            </div>
            <div className="ckb-ed-group">
              <label className="ckb-ed-label" htmlFor="ckb-impact-help">
                Texto de ajuda <span className="ckb-ed-label-soft">(opcional)</span>
              </label>
              <textarea
                id="ckb-impact-help"
                className="ckb-ed-textarea"
                value={componentHelpText(component)}
                readOnly={frozen}
                onChange={(event) => onChangeHelp(event.target.value)}
              />
            </div>
          </>
        ) : (
          <p className="ckb-ed-insp-hint">Clique em um campo do formulário para mudar a pergunta e o texto de ajuda.</p>
        )}
      </div>
    </section>
  );
}

/** Opção C no conflito — "Salvo × Seu" na coluna da direita, com as ações do diálogo de hoje. */
export function EditorConflictCompare({
  differences,
  savedAt,
  openedAt,
  onReload,
  onOverwrite,
}: {
  readonly differences: readonly ChecklistDraftDifference[];
  readonly savedAt: string | null;
  readonly openedAt: string | null;
  readonly onReload: () => void;
  /** Ausente no conflito do publicar (não há rascunho a sobrescrever: a saída é recarregar e publicar de novo). */
  readonly onOverwrite?: () => void;
}) {
  const saved = editorClock(savedAt);
  const opened = editorClock(openedAt);
  return (
    <section className="ckb-ed-col">
      <div className="ckb-ed-col-head ckb-ed-col-head--stack">
        <div>
          <div className="ckb-ed-col-title">Outra pessoa alterou este modelo</div>
          <div className="ckb-ed-col-sub">{saved && opened ? `Salvo às ${saved} · você abriu às ${opened}` : "Salvo depois que você abriu"}</div>
        </div>
      </div>
      <div className="ckb-ed-insp-body">
        <div className="c22-cmp">
          <div className="h">Salvo</div>
          <div className="h">Seu (não salvo)</div>
          {differences.map((row) => (
            <ConflictCells key={row.label} row={row} />
          ))}
        </div>
        <p className="ckb-ed-insp-hint">
          {`${differencesPhrase(differences.length)}. Recarregar traz a versão mais recente e descarta as suas alterações não salvas; sobrescrever mantém as suas e substitui as dela.`}
        </p>
        <div className="ckb-ed-modal-actions c22-acoes">
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
    </section>
  );
}

function ConflictCells({ row }: { readonly row: ChecklistDraftDifference }) {
  return (
    <>
      <div className="v dif">
        <b>{row.label}</b>
        <br />
        {row.saved}
      </div>
      <div className="v dif">
        <b>{row.label}</b>
        <br />
        {row.mine}
      </div>
    </>
  );
}

/** Opção B no conflito — a faixa âmbar (a mesma do "Publicar travado") com as ações do diálogo, sem diálogo. */
export function EditorConflictBar({
  differences,
  savedAt,
  openedAt,
  onReload,
  onOverwrite,
}: {
  readonly differences: readonly ChecklistDraftDifference[];
  readonly savedAt: string | null;
  readonly openedAt: string | null;
  readonly onReload: () => void;
  readonly onOverwrite?: () => void;
}) {
  const saved = editorClock(savedAt);
  const opened = editorClock(openedAt);
  const when = saved && opened ? ` às ${saved}, depois que você o abriu (${opened})` : " depois que você o abriu";
  const listed = differences.slice(0, 3).map((row) => row.label).join("; ");
  return (
    <div className="ckb-ed-blockbar" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>
        Outra pessoa alterou este modelo{when}. <b>{differencesPhrase(differences.length)}{listed ? ":" : "."}</b>
        {listed ? ` ${listed}${differences.length > 3 ? "; e outras" : ""}.` : ""}
      </span>
      <button type="button" className="ckb-ed-modal-btn" autoFocus onClick={onReload}>
        Recarregar o modelo
      </button>
      {onOverwrite ? (
        <button type="button" className="ckb-ed-modal-btn ckb-ed-modal-btn--danger" onClick={onOverwrite}>
          Sobrescrever mesmo assim
        </button>
      ) : null}
    </div>
  );
}
