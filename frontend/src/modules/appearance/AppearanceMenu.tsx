import { Check, Palette } from "lucide-react";
import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { APPEARANCE_SCREENS, type AppearanceScreen } from "./appearance.registry";
import { defaultAppearanceFor } from "./appearance.storage";
import { useScreenAppearance } from "./useScreenAppearance";

// B-APARENCIA-USUARIO — a escolha da aparência fica no MENU DO USUÁRIO (D-APARENCIA-RESPOSTAS (c)), que no shell
// é o rodapé da barra lateral (avatar · nome · papel · Sair). Aberto a TODO usuário autenticado: é preferência
// pessoal, não configuração da organização — nenhuma permissão, nenhum papel decide se o item aparece.
// Modelo do menu suspenso: `modules/fleet/damages/pages/DanosPage.tsx` (StatusTransitionMenu): camada que fecha
// no clique fora, Escape devolve o foco ao gatilho, foco no primeiro item, itens com `.ui-menu-item`.

const wrapStyle: CSSProperties = { position: "relative", display: "flex", flexShrink: 0 };
const overlayStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 40, background: "transparent", border: "none", cursor: "default" };
const panelStyle: CSSProperties = {
  position: "absolute",
  bottom: "calc(100% + 10px)",
  left: 0,
  zIndex: 41,
  width: 268,
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  boxShadow: "0 12px 32px rgb(15 23 42 / 18%)",
  padding: 10,
  color: "#0F172A",
};
const titleStyle: CSSProperties = { fontSize: 13, fontWeight: 800, padding: "2px 6px 0" };
const noteStyle: CSSProperties = { fontSize: 11.5, color: "#64748B", padding: "2px 6px 8px", lineHeight: 1.4 };
const groupLabelStyle: CSSProperties = { fontSize: 10.5, fontWeight: 800, letterSpacing: ".07em", color: "#64748B", padding: "8px 6px 4px", textTransform: "uppercase" };
const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  minHeight: 36,
  padding: "6px 8px",
  border: "none",
  borderRadius: 8,
  font: "inherit",
  fontSize: 13,
  color: "#0F172A",
  textAlign: "left",
  cursor: "pointer",
};
const badgeStyle: CSSProperties = { marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: "#64748B" };

export function AppearanceMenu({ triggerStyle }: { readonly triggerStyle?: CSSProperties }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLButtonElement>("[role='menuitemradio'][aria-checked='true'], [role='menuitemradio']")?.focus();
  }, [open]);

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeAndReturnFocus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']") ?? []);
    const index = items.findIndex((item) => item === document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  }

  return (
    <span ref={wrapRef} style={wrapStyle}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Aparência das telas"
        title="Aparência das telas"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={triggerStyle}
      >
        <Palette size={16} aria-hidden="true" />
      </button>
      {open ? (
        <>
          <button type="button" aria-hidden="true" tabIndex={-1} style={overlayStyle} onClick={() => setOpen(false)} />
          <div ref={panelRef} role="menu" aria-label="Aparência das telas" style={panelStyle} onKeyDown={onPanelKeyDown}>
            <AppearanceChoices onChosen={closeAndReturnFocus} />
          </div>
        </>
      ) : null}
    </span>
  );
}

/** Conteúdo do menu: uma escolha por tela que já tem as 3 aparências. */
export function AppearanceChoices({ onChosen }: { readonly onChosen: () => void }) {
  return (
    <>
      <div style={titleStyle}>Aparência</div>
      <div style={noteStyle}>Escolha pessoal: vale só para você, nesta organização e neste navegador.</div>
      {APPEARANCE_SCREENS.map((screen) => (
        <AppearanceScreenGroup key={screen.key} screen={screen} onChosen={onChosen} />
      ))}
    </>
  );
}

function AppearanceScreenGroup({ screen, onChosen }: { readonly screen: AppearanceScreen; readonly onChosen: () => void }) {
  const { appearance, setAppearance } = useScreenAppearance(screen.key);
  const fallback = defaultAppearanceFor(screen.key);
  const groupId = `aparencia-${screen.key}`;

  return (
    <div role="group" aria-labelledby={groupId}>
      <div id={groupId} style={groupLabelStyle}>
        {screen.label}
      </div>
      {screen.options.map((option) => {
        const checked = option.value === appearance;
        return (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={checked}
            className="ui-menu-item"
            style={{ ...itemStyle, fontWeight: checked ? 700 : 500 }}
            onClick={() => {
              setAppearance(option.value);
              onChosen();
            }}
          >
            <span aria-hidden="true" style={{ width: 16, display: "inline-flex", color: "#2563EB" }}>
              {checked ? <Check size={15} /> : null}
            </span>
            <span>{`${option.value} · ${option.label}`}</span>
            {option.value === fallback ? <span style={badgeStyle}>padrão</span> : null}
          </button>
        );
      })}
    </div>
  );
}
