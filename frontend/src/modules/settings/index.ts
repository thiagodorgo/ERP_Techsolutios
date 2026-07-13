// Ω2-e — módulo DATA-BACKED de Parâmetros da Organização. O antigo `settings.mock.ts`/`types.ts`
// (fonte de dados falsa) foi removido; a apresentação virou decoração pura em
// `tenant-settings.presentation.ts`.
export * from "./tenant-settings.types";
export * from "./tenant-settings.presentation";
export * from "./tenant-settings.adapter";
export * from "./tenant-settings.service";
export * from "./useTenantSettings";
export * from "./pages/TenantSettingsPage";
