// M5 — executa o filterNavigationByTenantModules REAL de ecc32712 (transpilado com o typescript 5.9.3, somente leitura)
// sobre o registro simulado "depois do bloco" (/patios/* e /telemetria/* COM requiredModules).
const fs = require("node:fs");
const path = require("node:path");
const ts = require("C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/node_modules/typescript");
const S = process.argv[2];
const src = fs.readFileSync(path.join(S, "navigation.service.ts"), "utf8");
const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace('require("./navigation.registry.js")', 'require("./m5-registry.cjs")');
fs.writeFileSync(path.join(S, "m5-navigation.service.cjs"), out);
// registro real, com as 11 entradas de Pátios/Telemetria ganhando chave (o que o bloco promete)
let rsrc = fs.readFileSync(path.join(S, "registry.ts"), "utf8").replace(/^import type .*$/m, "").replace(/export const NAVIGATION_REGISTRY:\s*readonly NavigationItem\[\]\s*=/, "const NAVIGATION_REGISTRY =");
rsrc += `\nfor (const e of NAVIGATION_REGISTRY) { if (e.path.startsWith("/patios/")) e.requiredModules = ["patios"]; if (e.path.startsWith("/telemetria/")) e.requiredModules = ["telemetria"]; }\nmodule.exports = { NAVIGATION_REGISTRY };\n`;
fs.writeFileSync(path.join(S, "m5-registry.cjs"), rsrc);
const nav = require(path.join(S, "m5-navigation.service.cjs"));
const { NAVIGATION_REGISTRY } = require(path.join(S, "m5-registry.cjs"));
const patios = (items) => items.filter((i) => /^\/(patios|telemetria)\//.test(i.path)).length;
console.log("registro simulado: entradas /patios+/telemetria com requiredModules =", NAVIGATION_REGISTRY.filter(e=>/^\/(patios|telemetria)\//.test(e.path) && e.requiredModules?.length).length);
console.log("org com modules = ['dashboard']       → itens Pátios/Telemetria no menu:", patios(nav.filterNavigationByTenantModules(NAVIGATION_REGISTRY, ["dashboard"])));
console.log("org com modules = []                  → itens Pátios/Telemetria no menu:", patios(nav.filterNavigationByTenantModules(NAVIGATION_REGISTRY, [])));
console.log("org com modules = ['patios']          → itens Pátios/Telemetria no menu:", patios(nav.filterNavigationByTenantModules(NAVIGATION_REGISTRY, ["patios"])));
console.log("modules NAO RESOLVIDOS (undefined)     → itens Pátios/Telemetria no menu:", patios(nav.filterNavigationByTenantModules(NAVIGATION_REGISTRY, undefined)));
console.log("getMenuForCurrentUser, tenant sem módulos resolvidos, permissões de Pátios →", patios(nav.getMenuForCurrentUser({ tenantId: "t1", roles: ["manager"], permissions: ["yard:read","impound:read","jurisdiction:read","price_tables:read","telemetry:read"], enabledModules: undefined })));
