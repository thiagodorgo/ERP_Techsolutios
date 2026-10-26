import type { Appearance } from "./appearance.storage";

// B-APARENCIA-USUARIO — telas que JÁ entregam as 3 aparências aprovadas (D-TELAS-SAEM-COM-TRES). O menu do usuário
// só oferece a escolha onde ela existe de verdade: uma tela entra aqui no mesmo bloco que entrega as 3.
// Os nomes das opções são os da referência aprovada (`screen-refs/patios-3opcoes.reference.html`).

export type AppearanceOption = {
  readonly value: Appearance;
  readonly label: string;
};

export type AppearanceScreen = {
  readonly key: string;
  readonly label: string;
  readonly options: readonly AppearanceOption[];
};

export const APPEARANCE_SCREENS: readonly AppearanceScreen[] = [
  {
    key: "patios",
    label: "Pátios",
    options: [
      { value: "A", label: "Padrão" },
      { value: "B", label: "Analítica" },
      { value: "C", label: "Mesa de pátio" },
    ],
  },
  // B-SAN3-22 — editor de modelo de checklist (referência `screen-refs/checklist-editor-estados-3opcoes.reference.html`).
  {
    key: "checklist-editor",
    label: "Editor de modelo de checklist",
    options: [
      { value: "A", label: "Padrão fiel" },
      { value: "B", label: "Analítica" },
      { value: "C", label: "Painel de impacto" },
    ],
  },
];
