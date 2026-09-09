#!/usr/bin/env node
// audit-agents-skills.mjs — auditoria mecânica do elenco de agentes e skills, nas duas árvores.
//
// POR QUE ESTE ARQUIVO EXISTE
// O elenco de junta (`.claude/agents/`) e as skills (`.claude/skills/`) são contrato de execução: o §C7
// manda a junta ser obrigatória nos dois ambientes, e o `D-INTEROP-CLAUDE-CODEX` manda os espelhos
// (`.agents/**`) andarem juntos. Até aqui a única verificação era de PARIDADE de bytes
// (`sync-agent-*.mjs --check`) — que diz se o espelho copiou, e NADA sobre o conteúdo estar são.
// Uma auditoria manual de 2026-09-07 mediu, em 5 minutos, defeitos que a paridade não vê:
//   - 5 de 11 skills com `SKILL.md` UM NÍVEL FUNDO (`skills/X/X/SKILL.md`) — invisíveis ao Claude Code
//     e ao Codex; a paridade estava VERDE porque o espelho copiou o defeito fielmente. (5 de 11 em
//     `origin/main@fe2748c8`, que é o alvo declarado; a 12ª skill nasce na fatia B deste bloco.)
//   - jurados de blocos encerrados vivos no diretório, custando ~5,1k tokens de `description` em TODA
//     sessão em `fe2748c8` (~11k na árvore de trabalho daquela sessão, que carregava 33 efêmeros);
//   - o índice do Codex divergindo do diretório (papéis mortos listados, gates ausentes).
// Nenhum desses é pegável por `--check`. Daí este auditor.
//
// REGRA DE MEDIÇÃO (aprendida na marra, §C7.1-ter(c)): quando o alvo é um COMMIT, o conteúdo é lido do
// BLOB (`git show <ref>:<path>`), nunca de `git archive`+`tar` — sob `core.autocrlf=true` aquilo injeta CR
// e FABRICA divergência. Sem `--ref`, audita a árvore de trabalho.
//
// ─────────────────────────────────────────────────────────────────────────────
// O QUE ESTE AUDITOR **NÃO** FAZ — e por quê (`D-AUDITOR-ENXUTO`, decisão do dono, 2026-09-08)
//
// Duas juntas seguidas mediram a MESMA família de defeito: **o instrumento erra na fronteira da gramática
// que ele próprio define**, e cada conserto fechava a classe apontada e abria a vizinha — prefixo de nome
// (ciclo 1) → lista de ferramentas (ciclo 1) → subconjunto YAML (ciclo 2) → gramática de link (ciclo 2).
// Não é azar: é a consequência de **parsear YAML e Markdown com regex**. Por isso o auditor ENCOLHEU até o
// que regex faz com segurança, em vez de ganhar mais uma camada de gramática.
//
// 1) **NÃO confere link.** A checagem `C8` (link relativo quebrado) foi **CORTADA**, com o regex `LINK`,
//    `semCercas`, `semCodeSpans` e `semComentariosHtml`. Ela sozinha produziu QUATRO classes de erro
//    medidas pela cadeira `A-C2` do ciclo 2: destino CommonMark entre `<>` para arquivo que EXISTE
//    (`A-C2-03`), destino com query string (a instância irmã), cerca de til recuada dentro de lista
//    (`A-C2-04`) e — o **único fail-OPEN medido em toda a auditoria** — destino com espaço, que nunca era
//    conferido (`A-C2-05`). Prevalência de achado `C8` no head, em `origin/main` e em `fe2748c8`
//    quando o corte foi feito: **0 nos três**. Ou seja: saiu superfície de erro, não saiu medição.
//    Quem quiser a checagem de link de volta precisa de um parser Markdown de verdade — o que é
//    dependência nova e portanto **junta unânime de 5** (§C7.1). Está aberto como
//    `P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK`.
//
// 2) **NÃO interpreta YAML além do subconjunto declarado** (a lista está em `lerFrontmatter`, abaixo).
//    Fora dele o auditor **RECUSA a medição, com arquivo e linha** — e não emite nenhuma outra checagem
//    daquele arquivo, para nunca produzir diagnóstico derivado de uma leitura que ele mesmo declarou não
//    confiável. **A recusa REPROVA (`BLOQUEIA`, `ec=1`): não medir é vermelho, nunca verde.** É o conserto
//    de `A-C2-02`, em que uma linha `tools:` com comentário no fim fazia o auditor acusar `C4` com um
//    **nome de ferramenta fabricado**, que não existe em lugar nenhum.
//
// USO
//   node scripts/audit-agents-skills.mjs                 # árvore de trabalho
//   node scripts/audit-agents-skills.mjs --ref origin/main
//   node scripts/audit-agents-skills.mjs --json          # saída estruturada
//
// SAÍDA: exit 0 sem achado BLOQUEIA · exit 1 com pelo menos um · exit 2 erro de USO (flag desconhecida,
// `--ref` sem valor, ref inexistente), com uma linha de uso em stderr e SEM stack trace.
// AVISO nunca derruba o exit.

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ─────────────────────────────────────────────────────────────────────────────
// Argumentos — parser estrito. Erro de uso é `ec=2`, nunca `ec=0` silencioso.
//
// POR QUÊ (achado C3-A7 da junta do ciclo 1): `--ref` como último argumento, sem valor, caía em silêncio
// na árvore de trabalho — quem pediu para medir um COMMIT recebia medição do disco, com `ec=0`. E
// `--ref --json` estourava com stack trace, que é o oposto de uma mensagem de uso.
// ─────────────────────────────────────────────────────────────────────────────
const USO = [
  "uso: node scripts/audit-agents-skills.mjs [--ref <commit-ish>] [--json]",
  "     --ref <commit-ish>  audita o BLOB do commit (sem --ref: a árvore de trabalho)",
  "     --json              saída estruturada (mesmos achados, mesma ordem, mesmo exit code)",
];

function erroDeUso(mensagem) {
  process.stderr.write(`[audit] erro de uso: ${mensagem}\n`);
  for (const linha of USO) process.stderr.write(`${linha}\n`);
  process.exit(2);
}

let REF = null;
let AS_JSON = false;
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") {
      AS_JSON = true;
      continue;
    }
    if (a === "--ref") {
      const valor = argv[i + 1];
      if (valor === undefined) erroDeUso("`--ref` sem valor");
      if (valor.startsWith("--")) erroDeUso(`\`--ref\` recebeu a flag "${valor}" em vez de um commit`);
      REF = valor;
      i++;
      continue;
    }
    erroDeUso(`argumento desconhecido "${a}"`);
  }
}

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

if (REF) {
  try {
    git(["rev-parse", "--verify", "--quiet", `${REF}^{commit}`]);
  } catch {
    erroDeUso(`ref "${REF}" não resolve para um commit (git rev-parse --verify falhou)`);
  }
}

/** Papéis cujo modelo o contrato FIXA — §C7.1-bis, §C7.6, §C2.8. */
const MODELO_FIXADO = {
  "planejador-mestre": "fable",
  "porteiro-pos-merge": "fable",
  "inspetor-de-terreno-da-junta": "fable",
};

// ─────────────────────────────────────────────────────────────────────────────
// POLÍTICA DE ESCRITA — default-deny (§C7.4-bis)
//
// A v1 perguntava "quem JULGA?" por uma regex de PREFIXO de nome, e negava escrita a quem casasse.
// A junta do ciclo 1 mediu o buraco (achado C3-A1): dos 24 papéis daquele head, a regex reconhecia 11 e
// era CEGA a 13 — entre eles `agente-ci-doutor`, `agente-dba-guardiao` e `agente-secops`, todos com voto
// e veto em junta. A cadeira C3 daquela junta pôs `Write, Edit, NotebookEdit` no próprio arquivo dela e o
// auditor saiu `OK — nenhum achado`, `ec=0`. E a lista de ferramentas de escrita eram TRÊS nomes literais
// (C3-A2): `MultiEdit` passava limpo.
//
// A pergunta muda de lado. Não se pergunta mais "quem julga?" (conjunto que nenhum nome consegue
// delimitar), e sim "quem está AUTORIZADO a escrever?" — que é uma lista curta, nomeada e visível no diff.
// Todo o resto é NÃO-ESCRITOR POR DEFAULT, e ferramenta desconhecida em não-escritor é NEGADA.
// ─────────────────────────────────────────────────────────────────────────────

/** Exceção nomeada: os únicos papéis autorizados a escrever. Acrescentar nome aqui é decisão visível. */
const PODE_ESCREVER = new Set([
  "agente-devops-provisionador",
  "agente-fabrica",
  "dev-mapas",
  "frontend-pixel-master",
]);

/** As únicas ferramentas seguras num não-escritor. Qualquer nome fora daqui é negado. */
const SOMENTE_LEITURA = new Set(["Read", "Grep", "Glob", "WebFetch", "WebSearch"]);

/**
 * `Bash` escreve (redirecionamento de shell) e está em quase todo papel que julga — mas TIRÁ-LO quebraria
 * o §C7.7 P1/P2, que manda o jurado gravar evidência e voto por conta própria. A pendência
 * `P-GOV-BASH-EM-QUEM-JULGA` é do dono. Enquanto ela não fecha, o auditor NÃO reprova: publica UM aviso
 * agregado com o N e os nomes — a exceção fica nomeada, contada e com dono, em vez de invisível.
 */
const TOLERADA_COM_AVISO = new Set(["Bash"]);

const achados = [];
const add = (gravidade, regra, alvo, detalhe, extra) =>
  achados.push({ gravidade, regra, alvo, detalhe, ...(extra ?? {}) });

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

const semAspas = (s) => {
  const t = (s ?? "").trim();
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1);
  }
  return t;
};

/**
 * As chaves cujo VALOR o auditor transforma em ACUSAÇÃO — e só elas.
 *
 * Este conjunto é o critério da recusa nomeada, e ele não é arbitrário: `name` vira `C2` ("name ≠
 * arquivo"), `model` vira `C3` ("contrato exige model:X"), `tools` vira `C4`/`C5` ("ferramenta Y não é
 * somente-leitura"). Se o parser ler ERRADO o valor de uma destas três, o auditor **fabrica um
 * diagnóstico** — foi exatamente o `A-C2-02`. Logo, valor fora do subconjunto NESTAS chaves = RECUSA.
 *
 * `description` fica de fora **por medição, não por esquecimento**: dela o auditor mede apenas PRESENÇA e
 * COMPRIMENTO, e um comentário absorvido no fim não consegue virar acusação nenhuma. Incluí-la seria caro e
 * errado: em `origin/main` e em `fe2748c8` há **5 arquivos** cuja `description` contém ` #` (o texto
 * `PR #363`), e recusá-los inventaria a QUINTA classe de falso-positivo — a mesma patologia que este bloco
 * existe para cortar. Medido em 2026-09-08 nos três alvos; a limitação está declarada acima.
 */
const CHAVES_MEDIDAS_POR_VALOR = new Set(["name", "model", "tools"]);

/** Nome de ferramenta legível: identificador puro. Qualquer outra forma em `tools:` é RECUSA, não palpite. */
const TOKEN_FERRAMENTA = /^[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * Frontmatter — SUBCONJUNTO YAML DECLARADO. Sem dependência nova (§C7.1).
 *
 * O que este parser LÊ (e é tudo o que ele promete ler):
 *   - `chave: valor` numa linha, com ou sem aspas simples/duplas;
 *   - `chave:` vazia seguida de linhas com recuo ≥ 2 → **plain multi-linha**, juntadas com espaço;
 *   - `chave: |`, `|-`, `|+`, `>`, `>-`, `>+` seguidas de bloco recuado → escalar em bloco
 *     (`|` junta com quebra de linha, `>` junta com espaço). Os indicadores de chomping (`-`, `+`) são
 *     ACEITOS e não mudam a medição — o auditor mede presença e comprimento, não bytes finais;
 *   - `chave:` seguida de linhas `  - item` → lista (é a forma alternativa de `tools:`); `tools` também
 *     aceita a forma `a, b, c` numa linha;
 *   - linha em branco e comentário `#` → ignorados.
 *   - CRLF normalizado ANTES de qualquer regex; BOM UTF-8 inicial removido antes de procurar o `---`
 *     (a junta do ciclo 1 NÃO provou que um arquivo com BOM carrega no Claude Code, então o auditor
 *     tampouco reprova por isso — mede o que sabe medir).
 *
 * QUALQUER outra construção (coleção em fluxo `{}`/`[]`, âncora `&`, alias `*`, tag `!`, linha que não
 * seja `chave:` fora de bloco) faz o parser RECUSAR o arquivo com a linha nomeada. Recusa não é
 * diagnóstico: nenhuma outra checagem C1–C5 sai para esse arquivo, para o auditor nunca dizer
 * "sem description" sobre um arquivo cujo frontmatter ele não conseguiu ler.
 *
 * FRONTEIRA DAS CHAVES MEDIDAS POR VALOR (`CHAVES_MEDIDAS_POR_VALOR`, acima) — conserto do `A-C2-02`.
 * Nestas três chaves o parser recusa, em vez de adivinhar, quando:
 *   (a) o valor está na própria linha, NÃO está entre aspas e contém ` #` — em YAML isso inicia um
 *       comentário, e este parser não sabe onde o conteúdo termina e o comentário começa. Era o caso exato
 *       de `tools: Read, Grep, Glob, Bash # comentário`, que produzia `C4` acusando uma "ferramenta"
 *       chamada `Bash # comentário`, inexistente;
 *   (b) a chave aparece DUAS VEZES no mesmo frontmatter — o "último vence" é um palpite, não uma leitura;
 *   (c) `tools:` produz um item que não é um identificador puro (`TOKEN_FERRAMENTA`), qualquer que tenha
 *       sido a forma de origem (linha única, lista `- item`, com ou sem aspas). Cobre o `#` colado sem
 *       espaço, que YAML NÃO trata como comentário e que mesmo assim não é nome de ferramenta.
 * LIMITAÇÃO DECLARADA: em escalar de BLOCO (`|`, `>`) e em `description` o ` #` NÃO é recusado — no bloco
 * ele é conteúdo literal por YAML, e em `description` a leitura errada não vira acusação (ver acima).
 *
 * ARMADILHA MEDIDA (2026-09-07, na primeira execução deste auditor): a árvore de trabalho roda sob
 * `core.autocrlf=true` e alguns arquivos chegam ao disco com **CRLF**. Em JavaScript, `.` **não casa
 * `\r`**. Logo `/(.*)$/` sem a flag `m` FALHA em `name: valor\r`, e a v1 reportou "sem name/description"
 * em dois agentes válidos. Falsificado na junta: sem a normalização voltam 71 BLOQUEIA falsos.
 *
 * SEGUNDA ARMADILHA (achado C3-A4d): a v1 lia linha a linha com uma regex só, e `description:` em plain
 * multi-linha — YAML perfeitamente válido — virava "sem `description:` — o agente não é roteável".
 */
function lerFrontmatter(texto) {
  if (texto == null) return { ausente: true };
  const normalizado = texto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const primeiraQuebra = normalizado.indexOf("\n");
  if (primeiraQuebra < 0) return { ausente: true };
  if (normalizado.slice(0, primeiraQuebra).trim() !== "---") return { ausente: true };
  const fim = normalizado.indexOf("\n---", primeiraQuebra);
  if (fim < 0) return { ausente: true };

  const linhas = normalizado.slice(primeiraQuebra + 1, fim).split("\n");
  const campos = {};
  const linhaDaChave = {};
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    const numeroNoArquivo = i + 2; // o corpo do frontmatter começa na linha 2 do arquivo
    if (linha.trim() === "" || /^\s*#/.test(linha)) {
      i++;
      continue;
    }

    const m = /^([A-Za-z_][\w-]*)\s*:(.*)$/.exec(linha);
    if (!m) return { erro: numeroNoArquivo };
    const chave = m[1];
    const resto = m[2];
    const bloco = /^\s*([|>])([+-]?)\s*$/.exec(resto);

    // (b) chave medida repetida: "último vence" é palpite, não leitura.
    if (CHAVES_MEDIDAS_POR_VALOR.has(chave) && chave in campos) {
      return { erro: numeroNoArquivo, motivo: `chave \`${chave}:\` repetida no mesmo frontmatter` };
    }
    linhaDaChave[chave] = numeroNoArquivo;

    if (resto.trim() !== "" && !bloco) {
      // Valor na própria linha. Coleção em fluxo, âncora, alias e tag ficam FORA do subconjunto.
      const cru = resto.trim();
      if (/^[{[&*!]/.test(cru)) return { erro: numeroNoArquivo };
      // (a) ` #` num escalar PLANO de chave medida: YAML abre comentário aqui e este parser não sabe onde
      //     o conteúdo acaba. Recusa nomeada em vez de valor com o comentário grudado.
      const entreAspas =
        cru.length >= 2 && ((cru[0] === '"' && cru.at(-1) === '"') || (cru[0] === "'" && cru.at(-1) === "'"));
      if (CHAVES_MEDIDAS_POR_VALOR.has(chave) && !entreAspas && /\s#/.test(resto)) {
        return {
          erro: numeroNoArquivo,
          motivo: `\`${chave}:\` é escalar plano com \` #\` — comentário e conteúdo indistinguíveis`,
        };
      }
      campos[chave] = semAspas(resto);
      i++;
      continue;
    }

    // `chave:` vazia, ou indicador de escalar em bloco: o valor está nas linhas recuadas abaixo.
    const indicador = bloco ? bloco[1] : null;
    const recolhidas = [];
    let ehLista = false;
    let j = i + 1;
    while (j < linhas.length) {
      const l = linhas[j];
      if (l.trim() === "") {
        recolhidas.push("");
        j++;
        continue;
      }
      const recuada = /^ {2,}(.*)$/.exec(l);
      if (!recuada) break; // voltou ao nível da chave
      if (!indicador && /^-\s/.test(recuada[1])) ehLista = true;
      recolhidas.push(recuada[1]);
      j++;
    }
    while (recolhidas.length && recolhidas.at(-1) === "") recolhidas.pop();

    if (recolhidas.length === 0) {
      campos[chave] = ""; // `chave:` sem valor nenhum — lida, e vazia
      i++;
      continue;
    }
    if (ehLista) {
      campos[chave] = recolhidas
        .filter(Boolean)
        .map((s) => semAspas(s.replace(/^-\s*/, "")))
        .join(", ");
    } else if (indicador === "|") {
      campos[chave] = recolhidas.join("\n").trim();
    } else {
      campos[chave] = semAspas(recolhidas.join(" ").replace(/\s+/g, " "));
    }
    i = j;
  }

  // (c) FRONTEIRA DO `tools:` — cada item tem de ser um identificador puro, venha de linha única, de lista
  //     `- item` ou de aspas. Item que não é nome de ferramenta é RECUSA, nunca uma acusação `C4` com um
  //     nome inventado (`A-C2-02`). O `#` colado sem espaço cai aqui, porque YAML não o trata como
  //     comentário e ele tampouco é nome de ferramenta.
  if (typeof campos.tools === "string" && campos.tools.trim() !== "") {
    // `.filter(Boolean)` espelha `listaFerramentas`: item vazio (vírgula dobrada, vírgula final) é
    // descartado dos dois lados e nunca vira acusação — logo não há o que recusar nele.
    for (const item of campos.tools.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!TOKEN_FERRAMENTA.test(item)) {
        return {
          erro: linhaDaChave.tools,
          motivo: `\`tools:\` tem o item ${JSON.stringify(item)}, que não é um nome de ferramenta legível`,
        };
      }
    }
  }

  return { campos };
}

const listaFerramentas = (bruto) =>
  (bruto ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────
// C0 — PISO: alvo vazio não é "limpo", é "não auditado".
//
// POR QUÊ (achado C3-A6): contra o commit raiz do repositório o auditor saía `0 agentes · 0 skills ·
// OK — nenhum achado`, `ec=0`. A pendência `P-GOV-AUDITOR-FORA-DA-CI` aponta para consumo por EXIT CODE
// numa pipeline, onde ninguém lê o cabeçalho — e um alvo vazio passaria como verde.
// ─────────────────────────────────────────────────────────────────────────────
const arquivosAgente = listar(".claude/agents").filter((p) => p.endsWith(".md"));
const arquivosSkill = listar(".claude/skills");
const dirsSkill = [...new Set(arquivosSkill.map((p) => p.split("/")[2]).filter(Boolean))];
const basesAgente = new Set(arquivosAgente.map((p) => p.split("/").pop().replace(/\.md$/, "")));

if (arquivosAgente.length === 0 || dirsSkill.length === 0) {
  add(
    "BLOQUEIA",
    "C0 alvo vazio",
    REF ?? "árvore de trabalho",
    `nada foi auditado — ${arquivosAgente.length} agentes e ${dirsSkill.length} skills. ` +
      "Alvo vazio não é resultado limpo: é ausência de medição.",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// C1..C5 — AGENTES
// ─────────────────────────────────────────────────────────────────────────────
const bashTolerado = new Set();

for (const caminho of arquivosAgente) {
  const base = caminho.split("/").pop().replace(/\.md$/, "");
  const lido = lerFrontmatter(ler(caminho));

  if (lido.erro) {
    add(
      "BLOQUEIA",
      "C1 recusa de medição",
      caminho,
      `não consigo ler o frontmatter — linha ${lido.erro}` +
        `${lido.motivo ? `: ${lido.motivo}` : " fora do subconjunto YAML declarado"}. ` +
        "RECUSA, não diagnóstico: nenhuma outra checagem C1–C5 sai para este arquivo, para o auditor não " +
        "acusar a partir de leitura que ele mesmo declarou não confiável. Não medir REPROVA (`ec=1`).",
      { linha: lido.erro },
    );
    continue;
  }
  if (lido.ausente) {
    add("BLOQUEIA", "C1 frontmatter", caminho, "sem bloco `---` de frontmatter — o agente não carrega");
    continue;
  }
  const fm = lido.campos;
  const nome = fm.name ?? "";
  const desc = fm.description ?? "";

  if (!nome) add("BLOQUEIA", "C1 frontmatter", caminho, "sem `name:`");
  else if (nome !== base) add("BLOQUEIA", "C2 nome × arquivo", caminho, `name:"${nome}" ≠ arquivo "${base}"`);

  if (!desc) add("BLOQUEIA", "C1 frontmatter", caminho, "sem `description:` — o agente não é roteável");
  else if (desc.length < 40) add("AVISO", "C1 frontmatter", caminho, `description curta (${desc.length} chars)`);

  const modeloExigido = MODELO_FIXADO[base];
  if (modeloExigido && (fm.model ?? "") !== modeloExigido) {
    add(
      "BLOQUEIA",
      "C3 modelo fixado",
      caminho,
      `contrato exige model:${modeloExigido}, achei "${fm.model ?? "<ausente>"}"`,
    );
  }

  // C4/C5 — default-deny. Quem está na allowlist de escrita não é medido aqui (é a exceção nomeada).
  const podeEscrever = PODE_ESCREVER.has(base);
  const bruto = fm.tools;

  if (bruto === undefined || bruto === "") {
    if (podeEscrever) {
      add("AVISO", "C5 ferramentas", caminho, "sem `tools:` — herda tudo; o papel está na allowlist de escrita");
    } else {
      add(
        "BLOQUEIA",
        "C5 ferramentas",
        caminho,
        "sem `tools:` — herda TUDO, inclusive escrita, e o papel NÃO está na allowlist de escrita (§C7.4-bis)",
      );
    }
  } else if (!podeEscrever) {
    // UM achado por PAPEL, nomeando todas as ferramentas negadas — não um achado por ferramenta: o defeito
    // é "este papel escreve", e contá-lo três vezes porque o papel lista três ferramentas infla o número
    // de achados sem acrescentar um defeito.
    const negadas = listaFerramentas(bruto).filter((t) => {
      if (SOMENTE_LEITURA.has(t)) return false;
      if (TOLERADA_COM_AVISO.has(t)) {
        bashTolerado.add(base);
        return false;
      }
      return true;
    });
    if (negadas.length === 1) {
      add(
        "BLOQUEIA",
        "C4 §C7.4-bis",
        caminho,
        `ferramenta "${negadas[0]}" não é somente-leitura e o papel não está na allowlist de escrita`,
      );
    } else if (negadas.length > 1) {
      add(
        "BLOQUEIA",
        "C4 §C7.4-bis",
        caminho,
        `ferramentas ${negadas.map((t) => `"${t}"`).join(", ")} não são somente-leitura e o papel não está ` +
          "na allowlist de escrita",
      );
    }
  }
}

if (bashTolerado.size) {
  const nomes = [...bashTolerado].sort();
  add(
    "AVISO",
    "C4-bis Bash tolerado",
    ".claude/agents/",
    `${nomes.length} papéis fora da allowlist de escrita carregam \`Bash\`, que escreve por redirecionamento ` +
      "de shell. Tolerado por decisão pendente do dono (`P-GOV-BASH-EM-QUEM-JULGA`): tirar `Bash` quebraria " +
      `o §C7.7 P1/P2, em que o jurado grava a própria evidência e o próprio voto. Papéis: ${nomes.join(", ")}`,
    { papeis: nomes },
  );
}

// Honestidade das listas: nome citado numa política sem arquivo correspondente é política morta.
for (const nome of [...PODE_ESCREVER, ...Object.keys(MODELO_FIXADO)]) {
  if (!basesAgente.has(nome) && arquivosAgente.length > 0) {
    add(
      "AVISO",
      "C4-ter lista cita papel inexistente",
      `.claude/agents/${nome}.md`,
      "nome citado em `PODE_ESCREVER`/`MODELO_FIXADO` sem arquivo correspondente neste alvo",
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// C6..C7 — SKILLS
//
// `C8` (link relativo quebrado) foi CORTADO por `D-AUDITOR-ENXUTO` — ver o bloco "O QUE ESTE AUDITOR NÃO
// FAZ", no cabeçalho. Saíram com ele o regex `LINK` e as três passadas que só existiam para alimentá-lo
// (`semCercas`, `semCodeSpans`, `semComentariosHtml`) e o utilitário `embranquecer`. O que fica aqui é
// PURO SISTEMA DE ARQUIVOS — onde a `SKILL.md` está e o que o `name:` dela diz — que é justamente o que
// achou as 5 skills que nunca carregaram.
// ─────────────────────────────────────────────────────────────────────────────

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

  const lido = lerFrontmatter(texto);
  if (lido.erro) {
    add(
      "BLOQUEIA",
      "C6 recusa de medição",
      esperado,
      `não consigo ler o frontmatter — linha ${lido.erro}` +
        `${lido.motivo ? `: ${lido.motivo}` : " fora do subconjunto YAML declarado"}. ` +
        "RECUSA, não diagnóstico: nenhuma outra checagem sai para este arquivo. Não medir REPROVA (`ec=1`).",
      { linha: lido.erro },
    );
    continue;
  }
  if (lido.ausente) {
    add("BLOQUEIA", "C6 frontmatter", esperado, "sem bloco `---` de frontmatter");
    continue;
  }
  const fm = lido.campos;
  const nome = fm.name ?? "";
  if (!nome) add("BLOQUEIA", "C6 frontmatter", esperado, "sem `name:`");
  else if (nome !== dir) add("BLOQUEIA", "C7 nome × pasta", esperado, `name:"${nome}" ≠ pasta "${dir}"`);
  if (!(fm.description ?? "")) add("BLOQUEIA", "C6 frontmatter", esperado, "sem `description:`");
}

// ─────────────────────────────────────────────────────────────────────────────
// C9 — ESPELHO: existência par a par (a paridade de BYTES é dos sync-*.mjs)
//
// Achado C3-A5: a v1 tinha os DOIS laços para agentes e só UM para skills — uma skill morta esquecida
// só no espelho do Codex era invisível, e "índice do Codex divergindo do diretório" é, pelo cabeçalho
// deste arquivo, um dos três defeitos que motivaram o auditor existir.
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
for (const caminho of espelhoSkills) {
  const par = caminho.replace(".agents/skills/", ".claude/skills/");
  if (!arquivosSkill.includes(par)) add("BLOQUEIA", "C9 espelho Codex", caminho, `órfão: não existe ${par}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// C10 — PESO do elenco efêmero em TODA sessão
//
// HONESTIDADE DO QUE ESTA CHECAGEM MEDE (achado C3-A3): ela mede PESO — bytes de `description` somados.
// Ela NÃO consulta ata, `aposentadoria-especialistas.md` nem git para saber se um bloco encerrou; a v1
// dizia "jurado de bloco ENCERRADO é aposentável", que é uma afirmação de detecção que a checagem não
// faz. A detecção mecânica de "bloco encerrado" está desenhada e deferida em `P-GOV-C10-ENCERRADO`.
// ─────────────────────────────────────────────────────────────────────────────
const especialistas = arquivosAgente.filter((p) => p.includes("/especialistas/"));
let bytesDescricao = 0;
for (const caminho of especialistas) {
  const lido = lerFrontmatter(ler(caminho));
  bytesDescricao += (lido.campos?.description ?? "").length;
}
if (especialistas.length) {
  const grav = bytesDescricao > 20_000 ? "BLOQUEIA" : "AVISO";
  add(
    grav,
    "C10 peso do elenco efêmero",
    ".claude/agents/especialistas/",
    `${especialistas.length} especialistas, ~${(bytesDescricao / 1024).toFixed(1)} KB de description ` +
      `(~${Math.round(bytesDescricao / 4)} tokens) carregados em TODA sessão. Esta checagem mede PESO; ` +
      "o critério de aposentadoria (bloco com ata fechada e PR mergeado) é humano — " +
      "`D-APOSENTADORIA-ELENCO-EFEMERO`.",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Saída — texto e `--json` na MESMA ordem, com o MESMO exit code.
// ─────────────────────────────────────────────────────────────────────────────
const bloqueia = achados.filter((a) => a.gravidade === "BLOQUEIA");
const avisos = achados.filter((a) => a.gravidade === "AVISO");
const ordenados = [...bloqueia, ...avisos];

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        ref: REF ?? "<árvore de trabalho>",
        agentes: arquivosAgente.length,
        skills: dirsSkill.length,
        achados: ordenados,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`[audit] alvo: ${REF ?? "árvore de trabalho"} · ${arquivosAgente.length} agentes · ${dirsSkill.length} skills`);
  for (const a of ordenados) {
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
