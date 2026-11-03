// Conta âncoras das mutações dos drivers do dev no objeto, sem escrever nada.
import fs from "node:fs";
const [driverPath, root] = process.argv.slice(2);
let src = fs.readFileSync(driverPath, "utf8");
src = src.replace(/const root = "[^"]+";/, `const root = ${JSON.stringify(root)};`);
// neutraliza execução e escrita
src = src.replace(/^function replace\(/m, "function __origReplace(");
src = src.replace(/^function run\(/m, "function __origRun(");
const prelude = `
import __fs from "node:fs";
globalThis.__res = [];
let __cur = "?";
function replace(file, before, after) {
  const t = __fs.readFileSync(root + "/" + file, "utf8").split(String.fromCharCode(13)).join("");
  const nb = t.split(before).length - 1;
  const na = after === "" ? null : t.split(after).length - 1;
  globalThis.__res.push({id: __cur, file, before: nb, after: na, afterInBefore: after !== "" && before.includes(after)});
}
function run(id, a, b) { __cur = id; const mutate = typeof a === "function" ? a : b; try { mutate(); } catch (e) { globalThis.__res.push({id, error: String(e)}); } }
`;
src = src.replace(/(\nfunction __origReplace)/, prelude + "$1");
src += `\nfor (const r of globalThis.__res) console.log(JSON.stringify(r));\n`;
fs.writeFileSync(driverPath.replace(/.*[\/]/, process.env.OUTDIR + "/h-"), src);
