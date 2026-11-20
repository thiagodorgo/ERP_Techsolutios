// B-PLAT-PERMISSAO (item 72 do portão; plano §4.2 + Emenda 1 §3 + Emenda 2 §2) — censo das rotas da plataforma.
// Para cada rota montada sob `/api/v1/platform` (o filtro é insensível a caixa, como o roteador do Express), lê a
// permissão que o portão confere por DOIS leitores independentes, que têm de concordar:
//   R1 (estático)  a propriedade só leitura `platformPermission` do handler de `requirePlatformPermission`, em cada camada
//                  da pilha da rota. Invariante: uma rota, UM portão (0 ou mais de 1 é falha).
//   R2 (dinâmico)  UMA requisição com um ator de organização (`x-role: auditor`, `x-permissions: users.read`): o portão
//                  responde 403 `platform_permission_required` com `Permission P is required.`, e o censo lê P da
//                  mensagem. Sem 403 com P legível, falha (fail-closed). Sem acumular, sem repetir.
// O mapa `{"MÉTODO /caminho": "permissão"}` (chaves ordenadas) é o instantâneo `tests/fixtures/plat-perm-rotas.json`,
// conferido por `tests/plat-perm-censo.test.ts`.
//
// Uso (raiz do repositório):
//   node --import tsx scripts/plat-perm-censo.mjs                 → confere com o instantâneo (rc 1 se divergir)
//   node --import tsx scripts/plat-perm-censo.mjs --gravar        → grava o instantâneo (só se R1 = R2 em toda rota)
//   node --import tsx scripts/plat-perm-censo.mjs --so-dinamico   → só o R2; existe SÓ para o controle na base, onde a
//                                                                   propriedade ainda não existe. O teste nunca o usa.
// Alcance, declarado: o censo enxerga rota MONTADA no app. Roteador exportado e não montado fica fora até ser montado.
// Sem dependência nova. Nada aqui escreve no banco nem fora de 127.0.0.1.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const INSTANTANEO = path.join(RAIZ, "tests", "fixtures", "plat-perm-rotas.json");
export const PLATFORM_PREFIX = /^\/api\/v1\/platform(\/|$)/i;
const PARAM_UUID = "0b9f6a2e-1c3d-4e5f-8a7b-9c0d1e2f3a4b";
const ATOR_ORGANIZACAO = { "x-user-id": "plat-perm-censo", "x-role": "auditor", "x-permissions": "users.read" };
const MENSAGEM = /^Permission (\S+) is required\.$/;

const importar = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);

/** Sobe o app real em memória, numa porta efêmera de 127.0.0.1. Devolve o app, o percurso e um `bate`. */
export async function subirApp() {
  process.env.NODE_ENV ??= "test";
  process.env.CORE_SAAS_PERSISTENCE ??= "memory";
  process.env.LOG_LEVEL ??= "silent";
  process.env.JWT_SECRET ??= "dev-only-change-me";
  process.env.DATABASE_URL ??= "postgresql://plat-perm-censo:x@127.0.0.1:1/plat_perm_censo";
  const walk = await importar("tests/helpers/route-walk.ts");
  walk.instalarRegistroDeCaminhos();
  const { createApp } = await importar("src/app.ts");
  const app = createApp();
  const percurso = walk.percorrerApp(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function bate(method, caminho, headers = {}) {
    const url = base + walk.preencherParametros(caminho, () => PARAM_UUID);
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: method === "GET" ? undefined : "{}",
    });
    const corpo = await res.json().catch(() => ({}));
    return { status: res.status, reason: corpo?.error?.reason, message: corpo?.error?.message ?? "" };
  }
  const fechar = () => new Promise((resolve) => server.close(() => resolve()));
  return { app, percurso, base, bate, fechar };
}

/** R1 de uma rota: as permissões expostas pelos handlers da pilha dela. */
export function portoesDaRota(rota) {
  return (rota.handles ?? []).map((h) => h?.platformPermission).filter((p) => typeof p === "string");
}

/**
 * O censo. `soDinamico` pula o R1. Devolve `{ mapa, falhas, rotas }`: `mapa` só com as rotas sem falha; `falhas` com uma
 * linha por divergência (vazio = R1 = R2 em toda rota).
 */
export async function gerarCenso({ soDinamico = false, ambiente } = {}) {
  const amb = ambiente ?? (await subirApp());
  const rotas = amb.percurso.rotas.filter((r) => PLATFORM_PREFIX.test(r.path));
  const mapa = {};
  const falhas = [];
  for (const rota of rotas) {
    const chave = `${rota.method} ${rota.path}`;
    const resposta = await amb.bate(rota.method, rota.path, ATOR_ORGANIZACAO);
    const m = MENSAGEM.exec(resposta.message);
    const r2 = resposta.status === 403 && resposta.reason === "platform_permission_required" && m ? m[1] : null;
    let falhou = false;
    if (!r2) {
      falhas.push(`R2 ${chave}: sem 403 platform_permission_required com permissão legível (${resposta.status}/${resposta.reason})`);
      falhou = true;
    }
    if (!soDinamico) {
      const r1 = portoesDaRota(rota);
      if (r1.length !== 1) {
        falhas.push(`R1 ${chave}: ${r1.length} portões (uma rota, UM portão)`);
        falhou = true;
      } else if (r2 && r1[0] !== r2) {
        falhas.push(`R1≠R2 ${chave}: R1=${r1[0]} R2=${r2}`);
        falhou = true;
      }
    }
    if (falhou) continue;
    if (Object.hasOwn(mapa, chave)) {
      falhas.push(`duplicada ${chave}`);
      continue;
    }
    mapa[chave] = r2;
  }
  if (!ambiente) await amb.fechar();
  return { mapa: ordenar(mapa), falhas, rotas: rotas.length };
}

export function ordenar(mapa) {
  return Object.fromEntries(Object.keys(mapa).sort().map((k) => [k, mapa[k]]));
}

export function serializar(mapa) {
  return JSON.stringify(ordenar(mapa), null, 2) + "\n";
}

async function main() {
  const args = process.argv.slice(2);
  const soDinamico = args.includes("--so-dinamico");
  const gravar = args.includes("--gravar");
  const { mapa, falhas, rotas } = await gerarCenso({ soDinamico });
  const n = Object.keys(mapa).length;
  console.log(`# rotas sob /api/v1/platform: ${rotas} · no mapa: ${n} · falhas: ${falhas.length}${soDinamico ? " · só R2" : " · R1 = R2"}`);
  for (const f of falhas) console.log(`  ${f}`);
  if (falhas.length) process.exit(1);
  const texto = serializar(mapa);
  if (gravar) {
    fs.writeFileSync(INSTANTANEO, texto);
    console.log(`# instantâneo gravado: ${path.relative(RAIZ, INSTANTANEO)} (${n} rotas)`);
    return;
  }
  const atual = fs.existsSync(INSTANTANEO) ? fs.readFileSync(INSTANTANEO, "utf8").replace(/\r\n/g, "\n") : "";
  if (atual === texto) {
    console.log("# instantâneo: igual");
    return;
  }
  const antes = atual ? JSON.parse(atual) : {};
  for (const k of new Set([...Object.keys(antes), ...Object.keys(mapa)])) {
    if (antes[k] !== mapa[k]) console.log(`  diverge ${k}: instantâneo=${antes[k] ?? "(ausente)"} agora=${mapa[k] ?? "(ausente)"}`);
  }
  console.log("# instantâneo: DIVERGE (regrave com --gravar se a mudança for intencional)");
  process.exit(1);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().then(
    () => process.exit(0),
    (erro) => {
      console.error(erro);
      process.exit(2);
    },
  );
}
