import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

import { usePermissions } from "../../providers/PermissionProvider";
import {
  buildCommandDestinations,
  filterDestinations,
  optionId,
  resolvePaletteKey,
  type CommandDestination,
} from "./logic";

const LIST_ID = "command-palette-list";

// Apresentação pura (testável em SSR): overlay + diálogo + input + listbox.
// Sem estado próprio — recebe tudo por props, o que permite validar a11y e o
// estado "Nenhum resultado" sem depender de efeitos de teclado.
export function CommandPaletteView({
  query,
  results,
  activeIndex,
  inputRef,
  onQueryChange,
  onKeyDown,
  onSelect,
  onClose,
}: {
  query: string;
  results: readonly CommandDestination[];
  activeIndex: number;
  inputRef?: RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSelect: (destination: CommandDestination) => void;
  onClose: () => void;
}) {
  const activeDescendant = results.length > 0 ? optionId(LIST_ID, activeIndex) : undefined;

  return (
    <div
      className="ui-overlay ui-overlay--top"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Ir para">
        <div className="command-palette__search">
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={LIST_ID}
            aria-activedescendant={activeDescendant}
            aria-label="Buscar destino"
            placeholder="Ir para… (páginas que você pode acessar)"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        {results.length > 0 ? (
          <ul className="command-palette__list" id={LIST_ID} role="listbox" aria-label="Destinos">
            {results.map((destination, index) => {
              const selected = index === activeIndex;
              return (
                <li
                  key={destination.path}
                  id={optionId(LIST_ID, index)}
                  role="option"
                  aria-selected={selected}
                  className="command-palette__option"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(destination);
                  }}
                >
                  <span>{destination.label}</span>
                  <span className="command-palette__option-path">{destination.path}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="command-palette__empty">Nenhum resultado</p>
        )}

        <div className="command-palette__hint">
          <span className="command-kbd">
            <CornerDownLeft size={12} aria-hidden /> Enter
          </span>
          <span>para abrir</span>
          <span className="command-kbd">Esc</span>
          <span>para fechar</span>
        </div>
      </section>
    </div>
  );
}

// Controlador: gerencia busca/seleção/foco e navega. Controlado por open/onClose
// (o AppShell é dono do estado via useCommandPalette, para o atalho global Ctrl+K).
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { roles, can } = usePermissions();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const destinations = useMemo(() => buildCommandDestinations(roles, can), [roles, can]);
  const results = useMemo(() => filterDestinations(destinations, query), [destinations, query]);

  // Ao abrir: limpa a busca, reseta a seleção e prende o foco no input.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Mantém a seleção dentro do range quando a lista filtrada encolhe.
  useEffect(() => {
    setActiveIndex((index) => (results.length === 0 ? 0 : Math.min(index, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  function go(destination: CommandDestination) {
    navigate(destination.path);
    onClose();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Foco preso: Tab não sai do diálogo (input é o único elemento focável;
    // as opções são navegadas por seta via aria-activedescendant).
    if (event.key === "Tab") {
      event.preventDefault();
      return;
    }
    const action = resolvePaletteKey(event.key, results, activeIndex);
    if (action.type === "none") return;
    event.preventDefault();
    if (action.type === "close") onClose();
    else if (action.type === "move") setActiveIndex(action.index);
    else if (action.type === "navigate") {
      navigate(action.path);
      onClose();
    }
  }

  return (
    <CommandPaletteView
      query={query}
      results={results}
      activeIndex={activeIndex}
      inputRef={inputRef}
      onQueryChange={setQuery}
      onKeyDown={onKeyDown}
      onSelect={go}
      onClose={onClose}
    />
  );
}
