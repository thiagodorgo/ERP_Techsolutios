import type { AriaRole, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

// ── Padrão transversal "linha clicável" (decisão do dono, 2026-08-24) ─────────────────────
// UM lugar resolve tudo o que a linha clicável exige, para nenhuma lista repetir a lógica:
//   · cursor + realce de hover + foco visível (classe `.pat-row--clickable`, app.css)
//   · teclado: tabIndex={0} e Enter/Espaço disparando a MESMA ação do clique
//   · aria-label dizendo o que a linha abre
//   · clique em filho interativo (botão, link, checkbox, menu, select…) NÃO abre a linha
//   · arrastar para SELECIONAR TEXTO não abre a linha
//
// FAIL-HONESTO: linha sem objeto para abrir recebe `.pat-row--static` — sem cursor, sem
// realce e sem tabIndex. Affordance mentirosa é defeito, não detalhe.

export const CLICKABLE_ROW_CLASS = "pat-row--clickable";
export const STATIC_ROW_CLASS = "pat-row--static";

// Filhos que já são interativos por si: o clique deles é DELES, nunca da linha. Rede de
// segurança para a regra 4 — vale mesmo que a célula esqueça o `stopPropagation`.
// `[data-row-click-skip]` é a válvula de escape para qualquer área marcar um filho próprio.
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="tab"]',
  '[contenteditable="true"]',
  "[data-row-click-skip]",
].join(",");

// Tolerância entre o mousedown e o click: acima disso o gesto foi arrasto (seleção), não clique.
const DRAG_TOLERANCE_PX = 4;

// Só existe UM gesto de ponteiro por vez — o módulo guarda a origem do último mousedown.
let pressOrigin: { readonly x: number; readonly y: number } | null = null;

export type ClickableRowProps = {
  readonly className: string;
  readonly tabIndex: 0;
  readonly role?: AriaRole;
  readonly "aria-label"?: string;
  readonly onClick: (event: ReactMouseEvent<HTMLElement>) => void;
  readonly onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  readonly onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
};

export type StaticRowProps = {
  readonly className: string;
};

export type RowClickProps = ClickableRowProps | StaticRowProps;

export type RowClickOptions = {
  // `null`/`undefined` = a linha NÃO tem objeto para abrir (fail-honesto).
  readonly onOpen?: (() => void) | null;
  // O que a linha abre, em PT-BR de negócio (ex.: "Abrir detalhamento de Maria Souza").
  readonly label?: string;
  // Classes próprias da lista, preservadas junto com a classe do padrão.
  readonly className?: string;
  // Obrigatório quando a linha é um <div>: `role="button"` (ou `role="row"` dentro
  // de uma grade com semântica de tabela). Sem role, o <div> é `generic` e o
  // `aria-label` abaixo não vira nome acessível. Em <tr> não passe nada — o role
  // de linha já é implícito e sobrescrevê-lo quebra a tabela.
  readonly role?: AriaRole;
};

export function rowClickProps({ onOpen, label, className, role }: RowClickOptions): RowClickProps {
  if (!onOpen) {
    return { className: joinClasses(className, STATIC_ROW_CLASS) };
  }

  return {
    className: joinClasses(className, CLICKABLE_ROW_CLASS),
    tabIndex: 0,
    ...(role ? { role } : {}),
    ...(label ? { "aria-label": label } : {}),
    onMouseDown: (event) => {
      if (event.button !== 0) return;
      pressOrigin = { x: event.clientX, y: event.clientY };
    },
    onClick: (event) => {
      const origin = pressOrigin;
      pressOrigin = null;
      // Regra 4: filho interativo resolve o próprio clique.
      if (isInteractiveTarget(event.target, event.currentTarget)) return;
      // Regra 5: arrastou para selecionar texto — a linha não abre.
      if (draggedBeyondTolerance(origin, event)) return;
      if (textWasSelectedInside(event.currentTarget)) return;
      onOpen();
    },
    onKeyDown: (event) => {
      if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
      // Enter/Espaço em cima de um filho interativo pertence ao filho (evita disparo duplo).
      if (isInteractiveTarget(event.target, event.currentTarget)) return;
      event.preventDefault(); // Espaço rolaria a página
      onOpen();
    },
  };
}

function joinClasses(base: string | undefined, extra: string): string {
  const trimmed = base?.trim();
  return trimmed ? `${trimmed} ${extra}` : extra;
}

function isInteractiveTarget(target: EventTarget | null, row: HTMLElement): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  const hit = target.closest(INTERACTIVE_SELECTOR);
  // O filho interativo tem de estar DENTRO da linha (a linha em si nunca casa o seletor).
  return Boolean(hit) && hit !== row && row.contains(hit);
}

function draggedBeyondTolerance(
  origin: { readonly x: number; readonly y: number } | null,
  event: ReactMouseEvent<HTMLElement>,
): boolean {
  if (!origin) return false;
  return Math.abs(event.clientX - origin.x) > DRAG_TOLERANCE_PX || Math.abs(event.clientY - origin.y) > DRAG_TOLERANCE_PX;
}

function textWasSelectedInside(row: HTMLElement): boolean {
  if (typeof window === "undefined" || typeof window.getSelection !== "function") return false;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return false;
  if (!selection.toString().trim()) return false;
  if (typeof selection.containsNode === "function") {
    try {
      return selection.containsNode(row, true);
    } catch {
      return true;
    }
  }
  const anchor = selection.anchorNode;
  return Boolean(anchor && row.contains(anchor));
}
