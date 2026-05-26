import { CoreSaasRegistry } from "./services/core-saas.service.js";
import { InMemoryCoreSaasStore } from "./store/core-saas.store.js";

export * from "./middleware/rbac.middleware.js";
export * from "./middleware/tenant-context.middleware.js";
export * from "./permissions/catalog.js";
export * from "./routes/index.js";
export * from "./services/core-saas.service.js";
export * from "./store/core-saas.store.js";
export * from "./types/core-saas.types.js";

export const coreSaasStore = new InMemoryCoreSaasStore();
export const coreSaasService = new CoreSaasRegistry(coreSaasStore);
