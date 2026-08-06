import { AlertTriangle, Check, HelpCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// CHECKLIST P1 PR-02a — toast do protótipo (Modelos de Checklist.dc.html): fixo no rodapé,
// bg #0F172A, ícone 26px por tipo, fadeUp .18s e auto-dismiss em 3600ms. Infra NOVA e
// reutilizável — os PRs 02b-d (editor/inspector/preview) reusam este mesmo par hook+componente.

export type ChecklistToastKind = "ok" | "warn" | "info";

export type ChecklistToastData = {
  readonly message: string;
  readonly kind: ChecklistToastKind;
};

export const CHECKLIST_TOAST_DURATION_MS = 3600;

const KIND_STYLE: Record<ChecklistToastKind, { readonly bg: string; readonly Icon: typeof Check }> = {
  ok: { bg: "#15803D", Icon: Check },
  warn: { bg: "#B45309", Icon: AlertTriangle },
  info: { bg: "#334155", Icon: HelpCircle },
};

export function useChecklistToast(): {
  toast: ChecklistToastData | null;
  showToast: (message: string, kind?: ChecklistToastKind) => void;
} {
  const [toast, setToast] = useState<ChecklistToastData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const showToast = useCallback((message: string, kind: ChecklistToastKind = "ok") => {
    setToast({ message, kind });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), CHECKLIST_TOAST_DURATION_MS);
  }, []);

  return { toast, showToast };
}

export function ChecklistToast({ toast }: { readonly toast: ChecklistToastData | null }) {
  // A região viva fica SEMPRE montada (aria-live só anuncia mudanças dentro de região existente).
  return (
    <div role="status" aria-live="polite">
      {toast ? <ChecklistToastBody toast={toast} /> : null}
    </div>
  );
}

function ChecklistToastBody({ toast }: { readonly toast: ChecklistToastData }) {
  const { bg, Icon } = KIND_STYLE[toast.kind];
  return (
    <div className="ckb-toast">
      <span className="ckb-toast-icon" style={{ background: bg }} aria-hidden="true">
        <Icon size={14} />
      </span>
      <span className="ckb-toast-msg">{toast.message}</span>
    </div>
  );
}
