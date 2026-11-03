// Aplica (arg "apply") a M-C2-a no worktree da C2 por âncora única; sem arg, só conta a âncora.
const fs = require("fs");
const f = "C:/Users/thiag/w-j484-c2/src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts";
const s = fs.readFileSync(f, "utf8");
const a = String.raw`/^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(raw)`;
const b = String.raw`/^(\d{4}-\d{2}-\d{2})/.exec(raw)`;
const n = s.split(a).length - 1;
console.log("anchor", n);
if (n !== 1) process.exit(2);
if (process.argv[2] === "apply") fs.writeFileSync(f, s.replace(a, b));
