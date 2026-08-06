type FrontendEnvKey =
  | "VITE_API_BASE_URL"
  | "VITE_DEFAULT_TENANT_ID"
  | "VITE_USE_MOCKS"
  | "VITE_GOOGLE_MAPS_API_KEY"
  // J-MAPAS-10: provedor de mapa. Vazio/ausente = MapLibre (default pixel-perfect, sem custo);
  // "google" = espelho Google opt-in, até a paridade fechar no PR-2.
  | "VITE_MAPS_PROVIDER";

type ImportMetaWithEnv = ImportMeta & {
  readonly env?: Partial<Record<FrontendEnvKey, string>>;
};

export function readFrontendEnv(key: FrontendEnvKey, fallback = ""): string {
  const viteValue = (import.meta as ImportMetaWithEnv).env?.[key];
  const nodeValue = (globalThis as { process?: { env?: Partial<Record<FrontendEnvKey, string>> } })
    .process?.env?.[key];

  return viteValue ?? nodeValue ?? fallback;
}

export function isMockMode(): boolean {
  return readFrontendEnv("VITE_USE_MOCKS") === "true";
}
