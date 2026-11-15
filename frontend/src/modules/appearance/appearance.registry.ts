import type { Appearance } from "./appearance.storage";

// B-APARENCIA-USUARIO — telas que JÁ entregam as 3 aparências aprovadas (D-TELAS-SAEM-COM-TRES). O menu do usuário
// só oferece a escolha onde ela existe de verdade: uma tela entra aqui no mesmo bloco que entrega as 3.
// Os nomes das opções são os da referência aprovada (`screen-refs/patios-3opcoes.reference.html`).

export type AppearanceOption = {
  readonly value: Appearance;
  readonly label: string;
};

/**
 * B-ASS-10b (T5) — onde a tela vive: no app da organização (`"tenant"`, o padrão) ou no console da plataforma
 * (`"platform"`). O menu de cada moldura lista só as telas do próprio escopo, e a escolha de uma tela de plataforma fica
 * numa chave sem organização (`techsol.aparencia.plataforma.<userId>`): o console não tem organização ativa.
 */
export type AppearanceScope = "tenant" | "platform";

export type AppearanceScreen = {
  readonly key: string;
  readonly label: string;
  readonly options: readonly AppearanceOption[];
  readonly scope?: AppearanceScope;
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
  {
    key: "financeiro",
    label: "Financeiro",
    options: [
      { value: "A", label: "Abas do Financeiro" },
      { value: "B", label: "Conta em foco" },
      { value: "C", label: "Conferência do caixa" },
    ],
  },
  // B-APAR-OS — Ordens de Serviço (referência `screen-refs/ordens-de-servico-3opcoes.reference.html`); padrão A
  // (D-APARENCIA-RESPOSTAS (b)), sem entrada em SCREEN_DEFAULT_APPEARANCE.
  {
    key: "ordens-de-servico",
    label: "Ordens de Serviço",
    options: [
      { value: "A", label: "Padrão fiel" },
      { value: "B", label: "Analítica" },
      { value: "C", label: "Fila por agenda" },
    ],
  },
  // B-APAR-DASH — Dashboard (referência `screen-refs/dashboard-3opcoes.reference.html`); padrão A
  // (D-APARENCIA-RESPOSTAS (b)), sem entrada em SCREEN_DEFAULT_APPEARANCE.
  {
    key: "dashboard",
    label: "Dashboard",
    options: [
      { value: "A", label: "Padrão fiel" },
      { value: "B", label: "Analítica" },
      { value: "C", label: "Central de prioridades" },
    ],
  },
  // B-SAN3-24 (24a) — Cheques (referência `screen-refs/cheques-3opcoes.reference.html`, aprovada com as 3 opções em 11/11).
  {
    key: "cheques",
    label: "Cheques",
    options: [
      { value: "A", label: "Abas do Financeiro" },
      { value: "B", label: "Visão analítica" },
      { value: "C", label: "Agenda do bom para" },
    ],
  },
  // B-SAN3-24 (24b) — Fechamento do mês (referência `screen-refs/fechamento-periodo-3opcoes.reference.html`, aprovada com as
  // 3 opções em 11/11).
  {
    key: "fechamento",
    label: "Fechamento do mês",
    options: [
      { value: "A", label: "Lista de competências" },
      { value: "B", label: "Visão analítica" },
      { value: "C", label: "O ano e o checklist" },
    ],
  },
  // B-USERS-ACESSO-SEG (T1) — troca da senha provisória (referência `screen-refs/troca-senha-3opcoes.reference.html`,
  // "Aprovo as 3"). A sessão restrita abre SEMPRE na A (Emenda 4, item 3: "Sim, sempre na A"): B e C ficam registradas
  // e só valem numa troca feita em sessão inteira, que não é deste bloco (nota da P-APARENCIA-APP-SELETOR).
  {
    key: "troca-senha",
    label: "Troca de senha",
    options: [
      { value: "A", label: "Padrão fiel" },
      { value: "B", label: "Com guia" },
      { value: "C", label: "Em duas etapas" },
    ],
  },
  // B-ASS-10b (T5) — Cloud Billing, no console da plataforma (referência `screen-refs/platform-cloud-billing-3opcoes.reference.html`,
  // "aprovo as telas de custos", 14/11, `D-DONO-1411-T5-TRES-OPCOES`); padrão A, sem entrada em SCREEN_DEFAULT_APPEARANCE.
  {
    key: "platform-cloud-billing",
    label: "Cloud Billing",
    scope: "platform",
    options: [
      { value: "A", label: "Fiel à referência" },
      { value: "B", label: "Analítica" },
      { value: "C", label: "Fechamento e grupos" },
    ],
  },
];

/** O escopo da tela; tela fora do registro conta como da organização (o comportamento de antes do escopo). */
export function appearanceScopeOf(screenKey: string): AppearanceScope {
  return APPEARANCE_SCREENS.find((screen) => screen.key === screenKey)?.scope ?? "tenant";
}

/** As telas que o menu de uma moldura oferece: só as do escopo dela. */
export function appearanceScreensFor(scope: AppearanceScope): readonly AppearanceScreen[] {
  return APPEARANCE_SCREENS.filter((screen) => (screen.scope ?? "tenant") === scope);
}
