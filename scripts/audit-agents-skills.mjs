#!/usr/bin/env node
// audit-agents-skills.mjs — auditoria mecânica do elenco de agentes e skills, nas duas árvores.
//
// POR QUE ESTE ARQUIVO EXISTE
// O elenco de junta (`.claude/agents/`) e as skills (`.claude/skills/`) são contrato de execução: o §C7
// manda a junta ser obrigatória nos dois ambientes, e o `D-INTEROP-CLAUDE-CODEX` manda os espelhos
// (`.agents/**`) andarem juntos. Até aqui a única verificação era de PARIDADE de bytes
// (`sync-agent-*.mjs --check`) — que diz se o espelho copiou, e NADA sobre o conteúdo estar são.
// Uma auditoria manual de 2026-09-07 mediu, em 5 minutos, defeitos que a paridade não vê:
//   - 5 de 12 skills com `SKILL.md` UM NÍVEL FUNDO (`skills/X/X/SKILL.md`) — invisíveis ao Claude Code
//     e ao Codex; a paridade estava VERDE porque o espelho copiou o defeito fielmente;
//   - jurados de blocos encerrados vivos no diretório, custando ~11,5k tokens de descrição em TODA sessão;
//   - o índice do Codex divergindo do diretório (papéis mortos listados, gates ausentes).
// Nenhum desses é pegável por `--check`. Daí este auditor.
//
// REGRA DE MEDIÇÃO (aprendida na marra, §C7.1-ter(c)): quando o alvo é um COMMIT, o conteúdo é lido do
// BLOB (`git show <ref>:<path>`), nunca de `git archive`+`tar` — sob `core.autocrlf=true` aquilo injeta CR
// e FABRICA divergência. Sem `--ref`, audita a árvore de trabalho.
//
// USO
//   node scripts/audit-agents-skills.mjs                 # árvore de trabalho
//   node scripts/audit-agents-skills.mjs --ref origin/main
//   node scripts/audit-agents-skills.mjs --json          # saída estruturada
//
// SAÍDA: exit 0 sem achado BLOQUEIA; exit 1 com pelo menos um. AVISO nunca derruba o exit.

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const REF = (() => {
  const i = argv.indexOf("--ref");
  return i >= 0 ? argv[i + 1] : null;
})();
const AS_JSON = argv.includes("--json");

/** Papéis cujo modelo o contrato FIXA — §C7.1-bis, §C7.1-quater, §C7.6, §C2.8. */
const MODELO_FIXADO = {
  "planejador-mestre": "fable",
  "porteiro-pos-merge": "fable",
  "inspetor-de-terreno-da-junta": "fable",
  "cadeira-permanente-backend-review": "fable",
};

/** Quem JULGA não pode CONSERTAR (§C7.4-bis). Estes prefixos/nomes não podem ter Write/Edit. */
const JULGA = (nome) =>
  /^jurado-|^critico-|^suplente-critico|^inspetor-|^avaliador-|^validador-|^guardiao-|^porteiro-|^cadeira-permanente-|^coordenador-|^master-teste/.test(
    nome,
  );

const FERRAMENTA_DE_ESCRITA = /\b(Write|Edit|NotebookEdit)\b/;

const achados = [];
const add = (gravidade, regra, alvo, detalhe) => achados.push({ gravidade, regra, alvo, detalhe });

// ─────────────────────────────────────────────────────────────────────────────
// Leitura: da árvore, ou do BLOB do commit (nunca de tar sob autocrlf).
// ─────────────────────────────────────────────────────────────────────────────
// `stderr: "pipe"` porque `git show <ref>:<path>` de caminho ausente é resposta ESPERADA aqui (é assim
// que se pergunta "existe?"); deixar o `fatal:` vazar para o terminal faria a auditoria parecer quebrada.
const git = (args) =>
  execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });

function listar(prefixo) {
  if (REF) {
    return git(["ls-tree", "-r", "--name-only", REF, "--", prefixo])
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }
  const base = join(ROOT, prefixo);
  if (!existsSync(base)) return [];
  const out = [];
  const andar = (dir, rel) => {
    for (const e of readdirSync(dir)) {
      const abs = join(dir, e);
      if (statSync(abs).isDirectory()) andar(abs, posix.join(rel, e));
      else out.push(posix.join(rel, e));
    }
  };
  andar(base, prefixo);
  return out;
}

function ler(caminho) {
  if (REF) {
    try {
      return git(["show", `${REF}:${caminho}`]);
    } catch {
      return null;
    }
  }
  const abs = join(ROOT, caminho);
  return existsSync(abs) ? readFileSync(abs, "utf8") : null;
}

/**
 * Frontmatter YAML mínimo — chaves de primeiro nível, valor cru. Sem dependência nova (§C7.1).
 *
 * ARMADILHA MEDIDA (2026-09-07, na primeira execução deste auditor): a árvore de trabalho roda sob
 * `core.autocrlf=true` e alguns arquivos chegam ao disco com **CRLF** (`planejador-mestre.md` e
 * `porteiro-pos-merge.md` estavam assim; os demais, LF). Em JavaScript, `.` **não casa `\r`** — ele é
 * terminador de linha para a regex. Logo `/(.*)$/` sem a flag `m` FALHA em `name: valor\r`, e a v1 deste
 * auditor reportou "sem name/description/model" em dois agentes perfeitamente válidos — falso-positivo que
 * teria virado achado numa ata. A leitura normaliza a quebra ANTES de qualquer regex: é a mesma família da
 * lição do §C7.1-ter(c) (não medir conteúdo com ferramenta que reescreve a quebra de linha).
 */
function frontmatter(texto) {
  if (!texto) return null;
  const normalizado = texto.replace(/\r\n?/g, "\n");
  if (!normalizado.startsWith("---")) return null;
  const fim = normalizado.indexOf("\n---", 3);
  if (fim < 0) return null;
  const campos = {};
  for (const linha of normalizado.slice(4, fim).split("\n")) {
    const m = /^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/.exec(linha);
    if (m) campos[m[1]] = m[2].trim();
  }
  return campos;
}

const semAspas = (s) => (s || "").replace(/^["']|["']$/g, "");

// ─────────────────────────────────────────────────────────────────────────────
// C1..C5 — AGENTES
// ─────────────────────────────────────────────────────────────────────────────
const arquivosAgente = listar(".claude/agents").filter((p) => p.endsWith(".md"));
const nomesAgente = new Set();

for (const caminho of arquivosAgente) {
  const base = caminho.split("/").pop().replace(/\.md$/, "");
  const texto = ler(caminho);
  const fm = frontmatter(texto);

  if (!fm) {
    add("BLOQUEIA", "C1 frontmatter", caminho, "sem bloco `---` de frontmatter — o agente não carrega");
    continue;
  }
  const nome = semAspas(fm.name);
  const desc = semAspas(fm.description);
  nomesAgente.add(base);

  if (!nome) add("BLOQUEIA", "C1 frontmatter", caminho, "sem `name:`");
  else if (nome !== base) add("BLOQUEIA", "C2 nome × arquivo", caminho, `name:"${nome}" ≠ arquivo "${base}"`);

  if (!desc) add("BLOQUEIA", "C1 frontmatter", caminho, "sem `description:` — o agente não é roteável");
  else if (desc.length < 40) add("AVISO", "C1 frontmatter", caminho, `description curta (${desc.length} chars)`);

  const modeloExigido = MODELO_FIXADO[base];
  if (modeloExigido && semAspas(fm.model) !== modeloExigido) {
    add("BLOQUEIA", "C3 modelo fixado", caminho, `contrato exige model:${modeloExigido}, achei "${fm.model ?? "<ausente>"}"`);
  }

  if (JULGA(base) && FERRAMENTA_DE_ESCRITA.test(fm.tools || "")) {
    add("BLOQUEIA", "C4 §C7.4-bis", caminho, `papel que JULGA com ferramenta de escrita — tools: ${fm.tools}`);
  }

  if (!fm.tools) add("AVISO", "C5 ferramentas", caminho, "sem `tools:` — herda tudo, inclusive escrita");
}

// ─────────────────────────────────────────────────────────────────────────────
// C6..C8 — SKILLS
// ─────────────────────────────────────────────────────────────────────────────
const arquivosSkill = listar(".claude/skills");
const dirsSkill = [...new Set(arquivosSkill.map((p) => p.split("/")[2]).filter(Boolean))];

for (const dir of dirsSkill) {
  const esperado = `.claude/skills/${dir}/SKILL.md`;
  const texto = ler(esperado);

  if (!texto) {
    const fundo = arquivosSkill.filter((p) => p.startsWith(`.claude/skills/${dir}/`) && p.endsWith("SKILL.md"));
    add(
      "BLOQUEIA",
      "C6 SKILL.md na raiz",
      `.claude/skills/${dir}/`,
      fundo.length
        ? `SKILL.md está FUNDO em "${fundo[0]}" — a skill NÃO carrega; achatar um nível`
        : "sem SKILL.md em lugar nenhum — a skill NÃO carrega",
    );
    continue;
  }

  const fm = frontmatter(texto);
  if (!fm) {
    add("BLOQUEIA", "C6 frontmatter", esperado, "sem bloco `---` de frontmatter");
    continue;
  }
  const nome = semAspas(fm.name);
  if (!nome) add("BLOQUEIA", "C6 frontmatter", esperado, "sem `name:`");
  else if (nome !== dir) add("BLOQUEIA", "C7 nome × pasta", esperado, `name:"${nome}" ≠ pasta "${dir}"`);
  if (!semAspas(fm.description)) add("BLOQUEIA", "C6 frontmatter", esperado, "sem `description:`");

  // C8 — link relativo que não resolve dentro da própria skill.
  //
  // ARMADILHA MEDIDA (2026-09-07, segunda execução deste auditor): a v1 varria o markdown INTEIRO e
  // reportou 6 links quebrados em `skill-creator/SKILL.md` — `FORMS.md`, `REFERENCE.md`, `EXAMPLES.md`…
  // Todos os 6 estavam dentro de um bloco ```markdown, ILUSTRANDO como se referencia um arquivo numa
  // skill. Não são links: são exemplo de documentação. Achado falso é pior que achado nenhum, porque
  // entra em ata com a mesma cara de um verdadeiro. O bloco cercado sai antes da varredura; o vão de
  // linha é preservado para o número não escorregar em diagnóstico futuro.
  const semCerca = texto.replace(/^```[\s\S]*?^```/gm, (b) => b.replace(/[^\n]/g, ""));
  for (const m of semCerca.matchAll(/\]\((?!https?:|#)([^)]+)\)/g)) {
    const alvo = m[1].split("#")[0];
    if (!alvo || alvo.startsWith("/")) continue;
    const resolvido = posix.normalize(posix.join(`.claude/skills/${dir}`, alvo));
    const existe = REF
      ? ler(resolvido) !== null || listar(resolvido).length > 0
      : existsSync(join(ROOT, resolvido));
    if (!existe) add("BLOQUEIA", "C8 link quebrado", esperado, `-> ${alvo}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// C9 — ESPELHO: existência par a par (a paridade de BYTES é dos sync-*.mjs)
// ─────────────────────────────────────────────────────────────────────────────
const espelhoAgentes = new Set(listar(".agents/agents").filter((p) => p.endsWith(".md")));
for (const caminho of arquivosAgente) {
  const par = caminho.replace(".claude/agents/", ".agents/agents/");
  if (!espelhoAgentes.has(par)) add("BLOQUEIA", "C9 espelho Codex", caminho, `sem par em ${par} (D-INTEROP)`);
}
for (const caminho of espelhoAgentes) {
  if (caminho.endsWith("README.md")) continue;
  const par = caminho.replace(".agents/agents/", ".claude/agents/");
  if (!arquivosAgente.includes(par)) add("BLOQUEIA", "C9 espelho Codex", caminho, `órfão: não existe ${par}`);
}

const espelhoSkills = new Set(listar(".agents/skills"));
for (const caminho of arquivosSkill) {
  const par = caminho.replace(".claude/skills/", ".agents/skills/");
  if (!espelhoSkills.has(par)) add("BLOQUEIA", "C9 espelho Codex", caminho, `sem par em ${par} (D-INTEROP)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// C10 — ESPECIALISTAS DE BLOCO ENCERRADO (peso de contexto em TODA sessão)
// ─────────────────────────────────────────────────────────────────────────────
const especialistas = arquivosAgente.filter((p) => p.includes("/especialistas/"));
let bytesDescricao = 0;
for (const caminho of especialistas) {
  const fm = frontmatter(ler(caminho));
  bytesDescricao += (semAspas(fm?.description) || "").length;
}
if (especialistas.length) {
  const grav = bytesDescricao > 20_000 ? "BLOQUEIA" : "AVISO";
  add(
    grav,
    "C10 peso do elenco efêmero",
    ".claude/agents/especialistas/",
    `${especialistas.length} especialistas, ~${(bytesDescricao / 1024).toFixed(1)} KB de description (~${Math.round(bytesDescricao / 4)} tokens) carregados em TODA sessão. ` +
      `Jurado de bloco ENCERRADO é aposentável — a rastreabilidade vive na ata e no git, não no diretório vivo.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Saída
// ─────────────────────────────────────────────────────────────────────────────
const bloqueia = achados.filter((a) => a.gravidade === "BLOQUEIA");
const avisos = achados.filter((a) => a.gravidade === "AVISO");

if (AS_JSON) {
  console.log(JSON.stringify({ ref: REF ?? "<árvore de trabalho>", agentes: arquivosAgente.length, skills: dirsSkill.length, achados }, null, 2));
} else {
  console.log(`[audit] alvo: ${REF ?? "árvore de trabalho"} · ${arquivosAgente.length} agentes · ${dirsSkill.length} skills`);
  for (const a of [...bloqueia, ...avisos]) {
    console.log(`  [${a.gravidade}] ${a.regra} · ${a.alvo}`);
    console.log(`      ${a.detalhe}`);
  }
  console.log(
    achados.length
      ? `[audit] ${bloqueia.length} BLOQUEIA · ${avisos.length} AVISO`
      : "[audit] OK — nenhum achado.",
  );
}

process.exit(bloqueia.length ? 1 : 0);
