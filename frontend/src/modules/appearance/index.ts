// B-APARENCIA-USUARIO — aparência pessoal por tela (D-APARENCIA-POR-USUARIO, D-APARENCIA-RESPOSTAS).
export { useScreenAppearance } from "./useScreenAppearance";
export type { ScreenAppearance } from "./useScreenAppearance";
export {
  APPEARANCES,
  APPEARANCE_STORAGE_PREFIX,
  SCREEN_DEFAULT_APPEARANCE,
  appearanceStorageKey,
  defaultAppearanceFor,
  isAppearance,
  readScreenAppearance,
  sanitizeAppearancePrefs,
  writeScreenAppearance,
} from "./appearance.storage";
export type { Appearance, AppearancePrefs } from "./appearance.storage";
export { APPEARANCE_SCREENS } from "./appearance.registry";
export type { AppearanceOption, AppearanceScreen } from "./appearance.registry";
export { AppearanceChoices, AppearanceMenu } from "./AppearanceMenu";
