// Compila os vídeos de fluxo. React 19 não publica mais bundle UMD, então em vez
// de "vendorizar" o React solto na pasta, o esbuild (o mesmo que o Vite do
// frontend já usa) empacota React + lucide-react dentro de cada arquivo.
//
// Resultado: cada .html abre por file:// sem servidor e sem rede. Nada de fetch —
// dados-reais.json entra no bundle em tempo de compilação.
//
// Uso:  node docs/demo-fluxos/build.mjs
//       node docs/demo-fluxos/build.mjs --watch

import { build, context } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "../..");

// Compila o que existe: os fluxos entram um a um, e o build nao quebra no meio.
const entradas = ["hub", "espelho", "fluxo1", "fluxo2", "fluxo3", "fluxo4"].filter((n) =>
  fs.existsSync(path.join(aqui, "src", `${n}.jsx`)),
);

const config = {
  entryPoints: entradas.map((n) => path.join(aqui, "src", `${n}.jsx`)),
  outdir: path.join(aqui, "assets"),
  entryNames: "[name]",
  bundle: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  loader: { ".json": "json", ".png": "dataurl", ".svg": "dataurl", ".woff2": "dataurl" },
  // O espelho importa o app REAL de frontend/src. Este apelido existe para que
  // o import diga isso em voz alta, em vez de um ../../../ que ninguém lê.
  alias: {
    "@erp": path.join(raiz, "frontend", "src"),
    // UMA copia de React no bundle. Sem estes tres apelidos o esbuild resolve
    // react duas vezes — a do frontend para os arquivos @erp e a da raiz para os
    // arquivos do video — e o segundo React nasce com o dispatcher nulo:
    // "Cannot read properties of null (reading 'useRef')".
    react: path.join(raiz, "frontend", "node_modules", "react"),
    "react-dom": path.join(raiz, "frontend", "node_modules", "react-dom"),
    "react-router-dom": path.join(raiz, "frontend", "node_modules", "react-router-dom"),
  },
  // O frontend usa import.meta.env (Vite). No formato iife não existe
  // import.meta, então o valor entra fixo no bundle: modo REAL, sem mocks — o
  // dado vem do snapshot, não de uma segunda camada de mentira.
  define: {
    "process.env.NODE_ENV": '"production"',
    "import.meta.env": JSON.stringify({
      VITE_USE_MOCKS: "false",
      VITE_API_BASE_URL: "/api/v1",
      VITE_MAPS_PROVIDER: "",
      VITE_GOOGLE_MAPS_API_KEY: "",
      MODE: "production",
      PROD: true,
      DEV: false,
    }),
  },
  // React e lucide-react vivem em frontend/node_modules (o app web).
  nodePaths: [path.join(raiz, "frontend", "node_modules"), path.join(raiz, "node_modules")],
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await context(config);
  await ctx.watch();
  console.log("observando docs/demo-fluxos/src/…");
} else {
  const r = await build(config);
  const total = Object.values(r.metafile?.outputs ?? {}).length;
  console.log(`ok — ${entradas.length} bundles${total ? ` (${total} saídas)` : ""}`);
}
