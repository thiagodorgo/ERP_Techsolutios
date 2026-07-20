import { X } from "lucide-react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * J-MAPAS-7 (SPRINT ALOCAÇÃO) — casca de diálogo a11y-completa para os popups de alocação (D/E) do Mapa.
 * Mesma máquina de acessibilidade PROVADA do `KpiDetailModal` (focus-trap, Esc, clique no backdrop e
 * retorno de foco ao gatilho) — reusada, não reinventada. O DS `Modal` genérico NÃO faz focus-trap/Esc,
 * por isso não serve sozinho ao requisito de a11y desta feature.
 *
 * Visual: painel de VIDRO NAVY compacto (não modal cheio que tapa o mapa). Backdrop semitransparente
 * mantém o mapa levemente visível atrás; o painel ocupa uma coluna estreita ancorada (à esquerda p/ o
 * popup de CHAMADO — perto do rail de chamados; à direita p/ o popup de TÉCNICO). `anchor` controla o lado.
 */

function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export function MapAllocationDialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  anchor = "right",
  title,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly labelledBy: string;
  readonly describedBy?: string;
  readonly anchor?: "left" | "right";
  // Rótulo do botão fechar (fica no header do próprio popup; aqui é fallback de aria).
  readonly title: string;
  readonly children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

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
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
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
    if (!open) return undefined;
    restoreFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const id = window.setTimeout(() => {
      const focusables = focusableWithin(dialogRef.current);
      (focusables[0] ?? dialogRef.current)?.focus();
    }, 0);
    return () => {
      window.clearTimeout(id);
      // Devolve o foco a quem abriu (a linha/cartão) — sem isso o teclado "cai no topo".
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`ui-overlay operations-alloc-overlay operations-alloc-overlay--${anchor}`}
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        className="operations-alloc-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <button type="button" className="operations-alloc-dialog__close" onClick={onClose} aria-label={`Fechar ${title}`}>
          <X size={18} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
