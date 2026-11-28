// B-MARCA-LOGIN-SIDEBAR (fatia L) — a cor do sistema ANTES de o React desenhar.
// Importado pelo `main.tsx`: lê a guarda do aparelho (`techsol.tema.dispositivo`) e põe `data-tema` no elemento raiz.
// Antes de entrar não há usuário: o login só usa os tokens `--ps-*` e não tem estado nem efeito de cor.
// Valor inválido ou ausente = Grafite (a de fábrica).
import { applyThemeColor, readDeviceThemeColor, type ThemeColor } from "./theme.storage";

export function bootThemeColor(): ThemeColor {
  const color = readDeviceThemeColor();
  applyThemeColor(color);
  return color;
}

bootThemeColor();
