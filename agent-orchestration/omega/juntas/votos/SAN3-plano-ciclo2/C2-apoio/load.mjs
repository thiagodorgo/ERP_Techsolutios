// Carrega o registro real (ecc32712) e o MVP_NAV_PATHS real, sem tsc: remove só a sintaxe de tipo.
import fs from "node:fs";
export function loadRegistry(file) {
  let src = fs.readFileSync(file, "utf8");
  src = src.replace(/^import type .*$/m, "");
  src = src.replace(/export const NAVIGATION_REGISTRY:\s*readonly NavigationItem\[\]\s*=/, "return ");
  if (/\bexport\b/.test(src)) throw new Error("registro tem outro export — conferir");
  return new Function(src)();
}
export function loadMvp(file) {
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/export const MVP_NAV_PATHS = new Set<string>\(\[([\s\S]*?)\]\)/);
  if (!m) throw new Error("MVP_NAV_PATHS nao achado");
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}
export function flatten(items, out = [], depth = 0) {
  for (const it of items) { out.push({ ...it, depth }); if (it.children?.length) flatten(it.children, out, depth + 1); }
  return out;
}
