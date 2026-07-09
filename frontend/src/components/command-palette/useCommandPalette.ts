import { useCallback, useEffect, useState } from "react";

import { isOpenShortcut } from "./logic";

// Estado de abertura da paleta + atalho global Ctrl+K / ⌘K.
// Montado uma única vez no AppShell. Ctrl+K alterna; Esc/clique fora fecham na UI.
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isOpenShortcut(event)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  return { open, openPalette, closePalette };
}
