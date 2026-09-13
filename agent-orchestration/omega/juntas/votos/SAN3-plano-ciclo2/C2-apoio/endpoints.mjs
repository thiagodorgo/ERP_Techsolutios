import { loadRegistry, flatten } from "./load.mjs";
const S = process.argv[2];
const reg = flatten(loadRegistry(`${S}/registry.ts`));
const two = reg.filter((e) => ["/controle/notificacoes", "/operations/quotes"].includes(e.path));
for (const e of two) console.log(JSON.stringify(e));
const all = reg.flatMap((e) => (e.relatedEndpoints ?? []).map((x) => ({ path: e.path, ep: x, mods: e.requiredModules ?? [] })));
console.log("relatedEndpoints no registro:", all.length, "em", reg.filter(e=>e.relatedEndpoints?.length).length, "de", reg.length, "entradas");
for (const p of ["/patios/", "/telemetria/"]) {
  const es = reg.filter((e) => e.path.startsWith(p));
  console.log(p, "entradas:", es.length, "com relatedEndpoints:", es.filter(e=>e.relatedEndpoints?.length).length, "endpoints listados:", es.reduce((n,e)=>n+(e.relatedEndpoints?.length??0),0));
  for (const e of es) console.log("   ", e.path, "->", (e.relatedEndpoints ?? []).join(" ; ") || "(nenhum)");
}
const keys = ["requiredModules","requiredPermissions","featureKey","moduleKey","platformOnly","tenantOnly","status","relatedEndpoints"];
console.log("campos presentes em alguma entrada:", [...new Set(reg.flatMap(e=>Object.keys(e)))].join(","));
