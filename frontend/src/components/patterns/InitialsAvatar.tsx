// PR-A TELAS PADRONIZADAS — avatar de iniciais com paleta rotativa do design
// (fonte: "ERP Web - Telas Padronizadas.dc.html", const AV). A cor é DETERMINÍSTICA por
// nome (mesmo nome → mesma cor em qualquer tela); `bg`/`fg` sobrepõem quando o contexto
// pede cor semântica (ex.: Status de campo colore o avatar pelo estado do operador).

const PALETTE: readonly (readonly [string, string])[] = [
  ["#EFF6FF", "#2563EB"],
  ["#F0FDF4", "#15803D"],
  ["#FAF5FF", "#7E22CE"],
  ["#FFFBEB", "#B45309"],
  ["#F0F9FF", "#0369A1"],
];

/** Iniciais (até 2) de um nome — "Diego Ferreira" → "DF". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function paletteIndex(name: string): number {
  let sum = 0;
  for (let index = 0; index < name.length; index += 1) {
    sum = (sum + name.charCodeAt(index)) % PALETTE.length;
  }
  return sum;
}

export type InitialsAvatarProps = {
  name: string;
  /** Diâmetro em px (design: 28–34; padrão 30). */
  size?: number;
  bg?: string;
  fg?: string;
};

export function InitialsAvatar({ name, size = 30, bg, fg }: InitialsAvatarProps) {
  const [paletteBg, paletteFg] = PALETTE[paletteIndex(name)];
  return (
    <span
      className="pat-avatar"
      style={{ width: size, height: size, background: bg ?? paletteBg, color: fg ?? paletteFg, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
