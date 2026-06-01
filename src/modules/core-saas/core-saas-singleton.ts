import { CoreSaasRegistry } from "./services/core-saas.service.js";
import { InMemoryCoreSaasStore } from "./store/core-saas.store.js";

export const coreSaasStore = new InMemoryCoreSaasStore();
export const coreSaasService = new CoreSaasRegistry(coreSaasStore);
