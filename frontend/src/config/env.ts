type FrontendEnvKey =
  | "VITE_API_BASE_URL"
  | "VITE_DEFAULT_TENANT_ID"
  | "VITE_USE_MOCKS";

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
