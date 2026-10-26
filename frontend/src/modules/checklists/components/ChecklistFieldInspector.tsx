import { AlertTriangle, ChevronDown, ChevronUp, GripVertical, HelpCircle, ImageIcon, Lock, Plus, Trash2 } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

import {
  checklistComparisonSourceLabel,
  checklistDamageMarkerLabel,
  checklistVehicleTypeLabel,
  resolveChecklistComponentTypeDescription,
  resolveChecklistComponentTypeLabel,
} from "../checklist.constants";
import {
  activeRunsPhrase,
  componentChoiceConfig,
  componentFlagConfig,
  componentHelpText,
  componentListConfig,
  componentNumberConfig,
  componentOptions,
  editorLockReason,
  editorLockReasonFor,
} from "../checklist-editor.model";
import type { ChecklistConfigChange, ChecklistEditorComponent, ChecklistEditorLock } from "../checklist-editor.model";
import { resolveChecklistComponentTile } from "../checklist-tiles";

// CHECKLIST P1 PR-02c — inspector 336px do protótipo (Modelos de Checklist.dc.html, bloco
// "config tipada"): o básico (pergunta · ajuda · obrigatoriedade) mais o formulário CERTO para
// cada um dos 10 tipos de campo. O componente é de RENDER: toda leitura/escrita de `config` vem
// das funções puras de `checklist-editor.model.ts` e volta como `ChecklistConfigChange` — ele não
// conhece a forma do config nem monta payload.
//
// B-SAN3-22 — com vistoria em andamento (ou sem confirmação, fail-closed) só a PERGUNTA e a AJUDA mudam.
// Obrigatório e toda configuração do campo ficam TRAVADOS no padrão do Publicar travado: nunca `disabled`
// (botão desabilitado não recebe foco nem explica nada) — `aria-disabled` + `title` + o clique explica.

const VEHICLE_TYPE_KEYS = ["car", "motorcycle", "truck", "van"] as const;
const DAMAGE_MARKER_KEYS = ["scratch", "dent", "broken", "missing", "other"] as const;
const COMPARISON_SOURCE_KEYS = ["related_collection", "related_delivery"] as const;

const FREE: ChecklistEditorLock = { kind: "free" };

/** Atributos do controle travado — `null` quando livre. */
function lockAttrs(reason: string) {
  return reason ? ({ "aria-disabled": true, title: reason, "data-explica": reason } as const) : {};
}

/** Teclas que acionariam o controle (ou mudariam um número) explicam em vez de agir. */
function explainOnKey(reason: string, onExplain: (message: string) => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (!reason) return;
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      onExplain(reason);
    }
  };
}

export function ChecklistFieldInspector({
  component,
  frozen = false,
  lock = FREE,
  showLockNote = false,
  onExplain = () => undefined,
  onChangeLabel,
  onChangeHelp,
  onToggleRequired,
  onConfigChange,
}: {
  readonly component: ChecklistEditorComponent | null;
  /** Congela a edição enquanto o modelo está sendo gravado (junta PR-02b, ALTA). */
  readonly frozen?: boolean;
  /** B-SAN3-22 — trava por vistoria em andamento (ou não confirmada). Livre por padrão. */
  readonly lock?: ChecklistEditorLock;
  /** Aparência A: o aviso âmbar no inspector diz o que pode mudar agora. */
  readonly showLockNote?: boolean;
  /** Clique num controle travado: a página mostra o motivo (toast de aviso). */
  readonly onExplain?: (message: string) => void;
  readonly onChangeLabel: (label: string) => void;
  readonly onChangeHelp: (help: string) => void;
  readonly onToggleRequired: () => void;
  readonly onConfigChange: (change: ChecklistConfigChange) => void;
}) {
  const tile = component ? resolveChecklistComponentTile(component.type) : null;
  const TileIcon = tile?.Icon;
  const locked = lock.kind !== "free";

  return (
    <section className="ckb-ed-col">
      <div className="ckb-ed-col-head ckb-ed-col-head--stack">
        <div>
          <div className="ckb-ed-col-title">{component ? "Configurações do campo" : "Configurações"}</div>
          <div className="ckb-ed-col-sub">
            {component ? "O que o técnico vê e o que é obrigatório" : "Selecione um campo no formulário"}
          </div>
        </div>
      </div>
      <div className="ckb-ed-insp-body">
        {!component ? (
          <div className="ckb-ed-insp-empty">
            <div className="ckb-ed-insp-empty-tile" aria-hidden="true">
              <HelpCircle size={22} />
            </div>
            <div className="ckb-ed-insp-empty-title">Nenhum campo selecionado</div>
            <p className="ckb-ed-insp-empty-sub">
              Clique em um campo do formulário para configurar o texto da pergunta, obrigatoriedade e regras.
            </p>
          </div>
        ) : (
          <>
            <div className="ckb-ed-insp-card">
              <span className="ckb-ed-insp-tile" style={{ background: tile!.bg, color: tile!.fg }} aria-hidden="true">
                {TileIcon ? <TileIcon size={16} /> : null}
              </span>
              <span>
                <span className="ckb-ed-insp-type">{resolveChecklistComponentTypeLabel(component.type, component.type)}</span>
                <span className="ckb-ed-insp-desc">{resolveChecklistComponentTypeDescription(component.type, "")}</span>
              </span>
            </div>

            <div className="ckb-ed-group">
              <label className="ckb-ed-label" htmlFor="ckb-insp-label">
                Pergunta exibida ao técnico
              </label>
              <input
                id="ckb-insp-label"
                className="ckb-ed-input"
                value={component.label}
                placeholder="Ex.: Fotos do veículo na coleta"
                readOnly={frozen}
                onChange={(event) => onChangeLabel(event.target.value)}
              />
            </div>

            <div className="ckb-ed-group">
              <label className="ckb-ed-label" htmlFor="ckb-insp-help">
                Texto de ajuda <span className="ckb-ed-label-soft">(opcional)</span>
              </label>
              <textarea
                id="ckb-insp-help"
                className="ckb-ed-textarea"
                value={componentHelpText(component)}
                placeholder="Instrução curta que aparece abaixo da pergunta no aplicativo"
                readOnly={frozen}
                onChange={(event) => onChangeHelp(event.target.value)}
              />
            </div>

            {locked && showLockNote ? (
              <div className="ckb-ed-insp-warn" role="status">
                <Lock size={14} aria-hidden="true" />
                <span>
                  {lock.kind === "locked"
                    ? `A pergunta e a ajuda podem mudar agora. Obrigatório e as regras abaixo ficam travados enquanto houver ${activeRunsPhrase(lock.activeRuns)}.`
                    : editorLockReason(lock)}
                </span>
              </div>
            ) : null}

            <InspectorToggle
              on={component.required}
              title="Resposta obrigatória"
              sub="O técnico não conclui o checklist sem preencher"
              disabled={frozen}
              lockedReason={editorLockReasonFor(lock, "Tornar obrigatório ou opcional muda o campo")}
              onExplain={onExplain}
              onToggle={onToggleRequired}
            />

            <div className="ckb-ed-insp-section">Configurações do campo</div>

            <TypedFieldConfig component={component} frozen={frozen} lock={lock} onExplain={onExplain} onConfigChange={onConfigChange} />
          </>
        )}
      </div>
    </section>
  );
}

type ConfigProps = {
  readonly component: ChecklistEditorComponent;
  readonly frozen: boolean;
  readonly lock: ChecklistEditorLock;
  readonly onExplain: (message: string) => void;
  readonly onConfigChange: (change: ChecklistConfigChange) => void;
};

/** Campo numérico do config — travado vira somente leitura que explica no clique e nas setas. */
function ConfigNumberInput({
  id,
  className,
  min,
  value,
  frozen,
  lockedReason,
  onExplain,
  onRaw,
}: {
  readonly id: string;
  readonly className: string;
  readonly min: number;
  readonly value: number;
  readonly frozen: boolean;
  readonly lockedReason: string;
  readonly onExplain: (message: string) => void;
  readonly onRaw: (raw: string) => void;
}) {
  return (
    <input
      id={id}
      type="number"
      min={min}
      className={className}
      value={value}
      readOnly={frozen || Boolean(lockedReason)}
      {...lockAttrs(lockedReason)}
      onClick={() => {
        if (lockedReason) onExplain(lockedReason);
      }}
      onKeyDown={explainOnKey(lockedReason, onExplain)}
      onChange={(event) => {
        if (lockedReason) return;
        onRaw(event.target.value);
      }}
    />
  );
}

/** O formulário certo para cada tipo — um bloco por tipo, como o protótipo (10 casos). */
function TypedFieldConfig({ component, frozen, lock, onExplain, onConfigChange }: ConfigProps) {
  const isChoice = component.type === "single_choice" || component.type === "multi_choice";
  const generic = editorLockReason(lock);

  if (isChoice) {
    return (
      <>
        <OptionListConfig component={component} frozen={frozen} lock={lock} onExplain={onExplain} onConfigChange={onConfigChange} />
        {component.type === "multi_choice" ? (
          <div className="ckb-ed-group ckb-ed-group--tight">
            <label className="ckb-ed-label" htmlFor="ckb-insp-minsel">
              Mínimo de seleções
            </label>
            <ConfigNumberInput
              id="ckb-insp-minsel"
              className="ckb-ed-input ckb-ed-input--num-sm"
              min={0}
              value={componentNumberConfig(component, "minSelected", 0, 0)}
              frozen={frozen}
              lockedReason={generic}
              onExplain={onExplain}
              onRaw={(raw) => onConfigChange({ kind: "number", key: "minSelected", raw, min: 0 })}
            />
          </div>
        ) : null}
      </>
    );
  }

  if (component.type === "photo_upload") {
    const minPhotos = componentNumberConfig(component, "minPhotos", 0, 0);
    return (
      <div>
        <div className="ckb-ed-insp-row">
          <div className="ckb-ed-insp-row-item">
            <label className="ckb-ed-label" htmlFor="ckb-insp-minphotos">
              Mínimo de fotos
            </label>
            <ConfigNumberInput
              id="ckb-insp-minphotos"
              className="ckb-ed-input"
              min={0}
              value={minPhotos}
              frozen={frozen}
              lockedReason={editorLockReasonFor(lock, "O mínimo de fotos decide quando a vistoria pode ser concluída")}
              onExplain={onExplain}
              onRaw={(raw) => onConfigChange({ kind: "number", key: "minPhotos", raw, min: 0 })}
            />
          </div>
          <div className="ckb-ed-insp-row-item">
            <label className="ckb-ed-label" htmlFor="ckb-insp-maxphotos">
              Máximo de fotos
            </label>
            <ConfigNumberInput
              id="ckb-insp-maxphotos"
              className="ckb-ed-input"
              min={1}
              value={componentNumberConfig(component, "maxPhotos", 1, 1)}
              frozen={frozen}
              lockedReason={generic}
              onExplain={onExplain}
              onRaw={(raw) => onConfigChange({ kind: "number", key: "maxPhotos", raw, min: 1 })}
            />
          </div>
        </div>
        <p className="ckb-ed-insp-hint">
          {/* Junta PR-02c: o protótipo escreve "1 espaços"; a concordância vence o verbatim (§11.3). */}
          O aplicativo mostra {minPhotos} {minPhotos === 1 ? "espaço" : "espaços"} de foto e só libera a conclusão quando
          todos estiverem preenchidos.
        </p>
      </div>
    );
  }

  if (component.type === "vehicle_selector") {
    return (
      <div>
        <ChipToggleGroup
          legend="Tipos de veículo aceitos"
          keys={VEHICLE_TYPE_KEYS}
          labels={checklistVehicleTypeLabel}
          selected={componentListConfig(component, "vehicleTypes")}
          tone="vehicle"
          disabled={frozen}
          lockedReason={editorLockReasonFor(lock, "Os tipos de veículo aceitos são as opções do campo", "ficam travados")}
          onExplain={onExplain}
          onToggle={(value) => onConfigChange({ kind: "list_toggle", key: "vehicleTypes", value })}
        />
        <span className="ckb-ed-label">Imagem de referência da vistoria</span>
        {/* Slot do PR-07 (imagem própria da organização). Cartão INERTE e assumidamente futuro —
            nada de botão que promete um envio que ainda não existe (D-007). */}
        <div className="ckb-ed-insp-slot">
          <span className="ckb-ed-insp-slot-tile" aria-hidden="true">
            <ImageIcon size={16} />
          </span>
          <span>
            <span className="ckb-ed-insp-slot-title">Silhueta padrão por tipo de veículo</span>
            <span className="ckb-ed-insp-slot-sub">Enviar imagem própria — em breve</span>
          </span>
        </div>
      </div>
    );
  }

  if (component.type === "damage_map") {
    return (
      <div>
        <ChipToggleGroup
          legend="Tipos de avaria que o técnico pode marcar"
          keys={DAMAGE_MARKER_KEYS}
          labels={checklistDamageMarkerLabel}
          selected={componentListConfig(component, "markerTypes")}
          tone="damage"
          disabled={frozen}
          lockedReason={editorLockReasonFor(lock, "Os tipos de avaria mudam o campo", "ficam travados")}
          onExplain={onExplain}
          onToggle={(value) => onConfigChange({ kind: "list_toggle", key: "markerTypes", value })}
        />
        <InspectorToggle
          on={componentFlagConfig(component, "requireDescription", false)}
          title="Exigir descrição em cada avaria"
          sub="Protege a organização em disputas sobre o estado do veículo"
          disabled={frozen}
          flush
          lockedReason={editorLockReasonFor(lock, "Exigir descrição muda o que é obrigatório")}
          onExplain={onExplain}
          onToggle={() => onConfigChange({ kind: "flag", key: "requireDescription", defaultOn: false })}
        />
      </div>
    );
  }

  if (component.type === "observation") {
    return (
      <div>
        <InspectorToggle
          on={componentFlagConfig(component, "multiline", true)}
          title="Texto longo"
          sub="Campo com várias linhas em vez de uma só"
          tight
          disabled={frozen}
          lockedReason={generic}
          onExplain={onExplain}
          onToggle={() => onConfigChange({ kind: "flag", key: "multiline", defaultOn: true })}
        />
        <label className="ckb-ed-label" htmlFor="ckb-insp-maxlen">
          Limite de caracteres
        </label>
        <ConfigNumberInput
          id="ckb-insp-maxlen"
          className="ckb-ed-input ckb-ed-input--num-md"
          min={1}
          value={componentNumberConfig(component, "maxLength", 500, 1)}
          frozen={frozen}
          lockedReason={generic}
          onExplain={onExplain}
          onRaw={(raw) => onConfigChange({ kind: "number", key: "maxLength", raw, min: 1 })}
        />
      </div>
    );
  }

  if (component.type === "signature") {
    return (
      <InspectorToggle
        on={componentFlagConfig(component, "requireName", false)}
        title="Exigir nome de quem assina"
        sub="Nome completo registrado junto da assinatura"
        disabled={frozen}
        flush
        lockedReason={editorLockReasonFor(lock, "Exigir o nome muda o que é obrigatório")}
        onExplain={onExplain}
        onToggle={() => onConfigChange({ kind: "flag", key: "requireName", defaultOn: false })}
      />
    );
  }

  if (component.type === "acknowledgement") {
    return (
      <InspectorToggle
        on={componentFlagConfig(component, "requireObservation", false)}
        title="Exigir observação na ciência"
        sub="Quem dá ciência precisa justificar por escrito"
        disabled={frozen}
        flush
        lockedReason={editorLockReasonFor(lock, "Exigir observação muda o que é obrigatório")}
        onExplain={onExplain}
        onToggle={() => onConfigChange({ kind: "flag", key: "requireObservation", defaultOn: false })}
      />
    );
  }

  if (component.type === "before_after") {
    return (
      <InspectorToggle
        on={componentFlagConfig(component, "requireBothStages", true)}
        title="Exigir os dois estágios"
        sub="Antes e depois precisam ser registrados"
        disabled={frozen}
        flush
        lockedReason={editorLockReasonFor(lock, "Exigir os dois estágios muda o que é obrigatório")}
        onExplain={onExplain}
        onToggle={() => onConfigChange({ kind: "flag", key: "requireBothStages", defaultOn: true })}
      />
    );
  }

  if (component.type === "comparison") {
    return (
      <div>
        <label className="ckb-ed-label" htmlFor="ckb-insp-compare">
          Comparar com
        </label>
        <select
          id="ckb-insp-compare"
          className="ckb-ed-select"
          value={componentChoiceConfig(component, "compareWith", COMPARISON_SOURCE_KEYS, "related_collection")}
          disabled={frozen}
          {...lockAttrs(generic)}
          onMouseDown={(event) => {
            if (!generic) return;
            event.preventDefault();
            onExplain(generic);
          }}
          onKeyDown={explainOnKey(generic, onExplain)}
          onChange={(event) => {
            if (generic) return;
            onConfigChange({ kind: "select", key: "compareWith", value: event.target.value });
          }}
        >
          {COMPARISON_SOURCE_KEYS.map((key) => (
            <option key={key} value={key}>
              {checklistComparisonSourceLabel[key]}
            </option>
          ))}
        </select>
        <p className="ckb-ed-insp-hint">O aplicativo mostra lado a lado as fotos e avarias da vistoria escolhida.</p>
      </div>
    );
  }

  // Fallback honesto: tipo sem configuração própria diz isso, em vez de deixar a seção vazia.
  return <p className="ckb-ed-insp-hint">Este campo não tem configurações próprias além das acima.</p>;
}

/** Lista de opções (escolha única/múltipla) — grip + texto + ↑/↓/lixeira, como o protótipo. */
function OptionListConfig({ component, frozen, lock, onExplain, onConfigChange }: ConfigProps) {
  const options = componentOptions(component);
  const reason = lock.kind === "locked"
    ? `${editorLockReasonFor(lock, "As opções de resposta mudam o campo", "ficam travadas")} O texto da pergunta continua livre.`
    : editorLockReason(lock);

  return (
    <div>
      {options.length === 0 ? (
        <div className="ckb-ed-insp-warn" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>Adicione ao menos 1 opção — sem opções este campo impede a publicação do modelo.</span>
        </div>
      ) : null}

      {options.map((option, index) => (
        <div className="ckb-ed-opt" key={`option-${index}`}>
          {/* Grip DECORATIVO — a reordenação real é pelos botões ↑/↓ (mesma decisão do canvas). */}
          <span className="ckb-ed-opt-grip" aria-hidden="true">
            <GripVertical size={14} />
          </span>
          <input
            className="ckb-ed-opt-input"
            value={option}
            aria-label={`Texto da opção ${index + 1}`}
            readOnly={frozen || Boolean(reason)}
            {...lockAttrs(reason)}
            onClick={() => {
              if (reason) onExplain(reason);
            }}
            onKeyDown={explainOnKey(reason, onExplain)}
            onChange={(event) => {
              if (reason) return;
              onConfigChange({ kind: "option_rename", index, text: event.target.value });
            }}
          />
          <OptionButton
            label={`Subir a opção ${index + 1}`}
            disabled={frozen || (!reason && index === 0)}
            lockedReason={reason}
            onExplain={onExplain}
            onClick={() => onConfigChange({ kind: "option_move", index, direction: "up" })}
          >
            <ChevronUp size={12} />
          </OptionButton>
          <OptionButton
            label={`Descer a opção ${index + 1}`}
            disabled={frozen || (!reason && index === options.length - 1)}
            lockedReason={reason}
            onExplain={onExplain}
            onClick={() => onConfigChange({ kind: "option_move", index, direction: "down" })}
          >
            <ChevronDown size={12} />
          </OptionButton>
          <OptionButton
            label={`Remover a opção ${index + 1}`}
            danger
            disabled={frozen}
            lockedReason={reason}
            onExplain={onExplain}
            onClick={() => onConfigChange({ kind: "option_remove", index })}
          >
            <Trash2 size={12} />
          </OptionButton>
        </div>
      ))}

      <button
        type="button"
        className="ckb-ed-opt-add"
        disabled={frozen}
        {...lockAttrs(reason)}
        onClick={() => (reason ? onExplain(reason) : onConfigChange({ kind: "option_add" }))}
      >
        <Plus size={14} aria-hidden="true" />
        Adicionar opção
      </button>
      <p className="ckb-ed-insp-hint">Deixe as respostas mais comuns no topo — em campo, com luva, cada toque conta.</p>
    </div>
  );
}

function OptionButton({
  label,
  danger,
  disabled,
  lockedReason = "",
  onExplain = () => undefined,
  onClick,
  children,
}: {
  readonly label: string;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly lockedReason?: string;
  readonly onExplain?: (message: string) => void;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={danger ? "ckb-ed-opt-btn ckb-ed-opt-btn--danger" : "ckb-ed-opt-btn"}
      title={lockedReason || label}
      aria-label={label}
      disabled={disabled}
      aria-disabled={lockedReason ? true : undefined}
      data-explica={lockedReason || undefined}
      onClick={() => (lockedReason ? onExplain(lockedReason) : onClick())}
    >
      {children}
    </button>
  );
}

/** Chips-toggle (tipos de veículo / de avaria) — `role="group"` + `aria-pressed` por chip. */
function ChipToggleGroup({
  legend,
  keys,
  labels,
  selected,
  tone,
  disabled,
  lockedReason = "",
  onExplain = () => undefined,
  onToggle,
}: {
  readonly legend: string;
  readonly keys: readonly string[];
  readonly labels: Record<string, string>;
  readonly selected: readonly string[];
  readonly tone: "vehicle" | "damage";
  readonly disabled: boolean;
  readonly lockedReason?: string;
  readonly onExplain?: (message: string) => void;
  readonly onToggle: (value: string) => void;
}) {
  return (
    <div className="ckb-ed-group" role="group" aria-label={legend}>
      <span className="ckb-ed-label">{legend}</span>
      <div className="ckb-ed-chips">
        {keys.map((key) => {
          const on = selected.includes(key);
          const className = [
            "ckb-ed-chip-toggle",
            tone === "damage" ? "ckb-ed-chip-toggle--damage" : "",
            on ? "ckb-ed-chip-toggle--on" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              className={className}
              aria-pressed={on}
              disabled={disabled}
              {...lockAttrs(lockedReason)}
              onClick={() => (lockedReason ? onExplain(lockedReason) : onToggle(key))}
            >
              {labels[key] ?? key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Switch 38×22 do protótipo — o MESMO de "Resposta obrigatória", reusado por todas as flags. */
function InspectorToggle({
  on,
  title,
  sub,
  disabled,
  flush,
  tight,
  lockedReason = "",
  onExplain = () => undefined,
  onToggle,
}: {
  readonly on: boolean;
  readonly title: string;
  readonly sub: string;
  readonly disabled?: boolean;
  /** Último elemento do bloco: sem a margem inferior do toggle padrão. */
  readonly flush?: boolean;
  /** Junta PR-02c: gap 12px do protótipo quando o toggle é seguido de outro campo. */
  readonly tight?: boolean;
  /** B-SAN3-22 — travado por vistoria em andamento: o clique explica em vez de alternar. */
  readonly lockedReason?: string;
  readonly onExplain?: (message: string) => void;
  readonly onToggle: () => void;
}) {
  const className = [
    "ckb-ed-toggle",
    on ? "ckb-ed-toggle--on" : "",
    flush ? "ckb-ed-toggle--flush" : "",
    tight ? "ckb-ed-toggle--tight" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={className}
      disabled={disabled}
      {...lockAttrs(lockedReason)}
      onClick={() => (lockedReason ? onExplain(lockedReason) : onToggle())}
    >
      <span className="ckb-ed-switch" aria-hidden="true">
        <span className="ckb-ed-switch-knob" />
      </span>
      <span>
        <span className="ckb-ed-toggle-title">{title}</span>
        <span className="ckb-ed-toggle-sub">{sub}</span>
      </span>
    </button>
  );
}
