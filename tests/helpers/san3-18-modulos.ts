// B-SAN3-18 — os módulos de uma organização de teste que precisa "de tudo" (o comportamento de antes do gate de
// módulo): toda chave que o gate ou o menu cobram, a mesma lista que o script de provisionamento dá às organizações
// que já existem (P1(a) do dono). Teste com JWT que cria a própria organização e exercita rotas de módulo usa esta
// lista; sem ela o gate responde 403 `module_not_enabled`, como em produção.
import { ALL_MODULE_CLASSES } from "../../src/modules/navigation/route-modules.js";

export const TODOS_OS_MODULOS: readonly string[] = [...ALL_MODULE_CLASSES];
