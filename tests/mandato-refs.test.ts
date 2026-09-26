// Guard do `scripts/mandato-refs.sh` — o script que existe para o orquestrador NUNCA digitar um SHA.
//
// POR QUE ESTE ARQUIVO FOI REESCRITO NO CICLO 2 (bloco B-GOV-MANDATO, PR #393).
// A junta reprovou o ciclo 1 com o bloqueante C2-01: **o guard media uma RÉPLICA, não o artefato**.
// A versão anterior tinha uma função `casar()` em TypeScript que "reproduzia o matcher do script".
// Medido: quebrar o matcher do `.sh` deixava 6/6 verde; **4 dos 6 casos passavam com o script
// APAGADO**; e reescrever só um comentário deixava o guard vermelho (um caso lia a fonte por `cat`).
//
// A PROPRIEDADE QUE ESTE ARQUIVO PASSA A TER: *o teste fica vermelho se — e só se — o COMPORTAMENTO
// do artefato muda.* Dois corolários, e os dois são medidos:
//   - apagar/renomear `scripts/mandato-refs.sh` derruba TODOS os casos (nenhum sobrevive);
//   - reescrever só comentários do script não derruba NENHUM.
// Consequência de desenho, e ela é inegociável aqui: NÃO existe réplica do matcher neste arquivo,
// nenhuma asserção sobre comentário, e nenhum `cat`/`readFileSync` da fonte do script. Todo caso
// passa por `spawnSync("bash", [<o .sh de verdade>, ...])`.
//
// O ARNÊS (novo na casa; o padrão `mkdtemp` + processo-filho já existe em `agents-mirror-guard` e
// em `npm-test-runner-guard`, mas repositório git em tmpdir + `gh` shimado é inédito):
//   1. `mkdtempSync` -> `git init` -> atas-fixture -> commits -> `git update-ref
//      refs/remotes/origin/main <A>` (é o que o script lista) e um commit `B` com uma ata que vive
//      SÓ no ramo (é o caso do PR #393, cuja ata a ferramenta do ciclo 1 não enxergava).
//   2. Um `gh` shimado que RESPONDE POR PR (`MANDATO_GH`), invocado pelo script como `bash <shim>`.
//   3. Os SHAs das fixtures são commits REAIS do repo temporário — o `git rev-parse` do script
//      expande de verdade, em vez de devolver o que leu.
// FRONTEIRA DECLARADA: o `gh` real e a API do GitHub NÃO são atravessados aqui. A forma do JSON está
// colada no shim com a data da captura; a cobertura viva dela é a execução `bash
// scripts/mandato-refs.sh 392/393/387` da bateria do bloco.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const SCRIPT = path.join(RAIZ, "scripts/mandato-refs.sh");

const repo = mkdtempSync(path.join(tmpdir(), "mandato-refs-"));
process.on("exit", () => {
  try {
    rmSync(repo, { recursive: true, force: true });
  } catch {
    /* tmpdir de teste; a limpeza é best-effort */
  }
});

/** git com identidade e EOL fixados — o arnês tem de se comportar igual no Windows e no ubuntu. */
function git(...args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", "-c", "commit.gpgsign=false", ...args],
    { cwd: repo, encoding: "utf8" },
  ).toString();
}
function escreve(rel: string, conteudo: string): void {
  const alvo = path.join(repo, rel);
  mkdirSync(path.dirname(alvo), { recursive: true });
  writeFileSync(alvo, conteudo, "utf8"); // "\n" puro: nenhuma asserção deste arquivo depende de \r
}
function commit(msg: string): string {
  git("add", "-A");
  git("commit", "-q", "-m", msg);
  return git("rev-parse", "HEAD").trim();
}

execFileSync("git", ["-c", "init.defaultBranch=main", "init", "-q", repo], { encoding: "utf8" });

// Seis commits só para virarem os SHAs das fixtures — assim `rev-parse` expande de verdade.
const S: string[] = [];
for (let i = 0; i < 6; i++) {
  escreve(`semente-${i}.txt`, `semente ${i}\n`);
  S.push(commit(`semente ${i}`));
}
const [S1, S2, S3, S4, S5, S6] = S as [string, string, string, string, string, string];
const c7 = (s: string) => s.slice(0, 8);

// --- as atas-fixture --------------------------------------------------------------------------
// As duas primeiras são as REGRESSÕES REAIS do ciclo 1, verbatim na estrutura (SHAs trocados pelos
// commits do repo temporário).
escreve(
  "agent-orchestration/omega/juntas/J-B-SAN3-04a.md",
  [
    "# J-B-SAN3-04a — junta do bloco `B-SAN3-04a` (PR #390)",
    "",
    "- **Data:** 2026-09-20.",
    `- **Objeto:** \`${c7(S1)}\` (PR #390); head na junta = o objeto. Base \`origin/main@${c7(S6)}\`.`,
    "",
    "Corpo da ata.",
    "",
  ].join("\n"),
);
escreve(
  "agent-orchestration/omega/juntas/J-B-SAN3-00.md",
  [
    "# J-B-SAN3-00 — junta do bloco `B-SAN3-00` (PR #392)",
    "",
    `- **Objeto julgado:** \`${c7(S2)}\`, ramo \`chore/corpos-de-jurado-rastreados\`, base \`${c7(S3)}\`.`,
    "- **Data:** 2026-09-21.",
    "",
    "## As dividas pagas aqui",
    "As 5 do porteiro do #390 e as 6 do porteiro do #391 — todas conferidas no arquivo rastreado.",
    "",
  ].join("\n"),
);
// ATA_MULTI — dois ciclos, dois Objetos, nenhuma linha de aprovação (é a forma do J-B-SAN3-01 real).
escreve(
  "agent-orchestration/omega/juntas/J-MULTI.md",
  [
    "# J-MULTI — junta do bloco `B-MULTI` (PR #387)",
    "",
    `- **Objeto:** \`${c7(S4)}\` (PR #387); ciclo 1, REPROVADO.`,
    "",
    "## Ciclo 2",
    "",
    `- **Objeto:** \`${c7(S5)}\` (PR #387); ciclo 2.`,
    "",
  ].join("\n"),
);
// ATA_SEM_OBJETO — a classe das 102 atas que não têm linha de Objeto.
escreve(
  "agent-orchestration/omega/juntas/J-SEM-OBJETO.md",
  ["# J-SEM-OBJETO — junta do bloco `B-SEM` (PR #380)", "", "Votou-se; ninguem escreveu o objeto.", ""].join("\n"),
);
// ATA_MENCAO — cita o PR só no corpo. Mencionar não é ser sobre — mas também não é ausência.
escreve(
  "agent-orchestration/omega/juntas/J-MENCAO.md",
  [
    "# J-MENCAO — junta do bloco `B-OUTRO`",
    "",
    `- **Objeto:** \`${c7(S6)}\`; bloco sem relacao.`,
    "",
    "Pagamos de passagem uma divida do #381, que e de outro bloco.",
    "",
  ].join("\n"),
);
// ATA_REPROVADA_UNICA — a forma EXATA da ata do ciclo 1 deste bloco: Objeto julgado + VEREDITO
// REPROVADO em prosa, e NENHUMA linha de aprovação.
escreve(
  "agent-orchestration/omega/juntas/J-REPROVADA.md",
  [
    "# J-REPROVADA (PR #382) — ciclo 1",
    "",
    `- **Objeto julgado:** \`${c7(S6)}\`, resolvido pelas tres cadeiras.`,
    "",
    "## VEREDITO: **REPROVADO — 2 × 1**",
    "",
  ].join("\n"),
);
// ATA_APROVADA — a ÚNICA forma que a ferramenta lê como aprovação.
escreve(
  "agent-orchestration/omega/juntas/J-APROVADA.md",
  [
    "# J-APROVADA (PR #383) — ciclo 1",
    "",
    `- **Objeto julgado:** \`${c7(S1)}\`.`,
    `- **approved_head:** \`${c7(S1)}\``,
    "",
    "## VEREDITO: **APROVADO — 3 × 0**",
    "",
  ].join("\n"),
);
// ATA_CONTRADITORIA — declara aprovação de um head que ela mesma não declarou como objeto.
escreve(
  "agent-orchestration/omega/juntas/J-CONTRADITORIA.md",
  [
    "# J-CONTRADITORIA (PR #384) — ciclo 1",
    "",
    `- **Objeto julgado:** \`${c7(S4)}\`.`,
    `- **approved_head:** \`${c7(S5)}\``,
    "",
  ].join("\n"),
);
// Casa pelo RAMO, não pelo número: o título não tem `#N`; a linha de Objeto nomeia o ramo.
escreve(
  "agent-orchestration/omega/juntas/J-POR-RAMO.md",
  [
    "# J-POR-RAMO — junta do bloco `B-RAMO`",
    "",
    `- **Objeto julgado:** \`${c7(S3)}\`, ramo \`feat/so-pelo-ramo\`, base \`main\`.`,
    `- **approved_head:** \`${c7(S3)}\``,
    "",
  ].join("\n"),
);

const COMMIT_BASE = commit("atas em origin/main");
git("update-ref", "refs/remotes/origin/main", COMMIT_BASE);

// Ata que vive SÓ no head do PR — é o caso do #393, invisível para a ferramenta do ciclo 1.
escreve(
  "agent-orchestration/omega/juntas/J-SO-NO-RAMO.md",
  [
    "# J-SO-NO-RAMO (PR #385) — ciclo 1",
    "",
    `- **Objeto julgado:** \`${c7(S2)}\`.`,
    `- **approved_head:** \`${c7(S2)}\``,
    "",
  ].join("\n"),
);
const COMMIT_HEAD = commit("ata que so existe no ramo");

// --- os shims de `gh` ---------------------------------------------------------------------------
// Forma REAL do JSON, capturada em 2026-09-26T03:39Z com gh 2.89.0:
//   {"baseRefName":"main","headRefName":"chore/corpos-de-jurado-rastreados",
//    "headRefOid":"5cfcd7d35f1fbb7027c8d1811898a1c0e3216188","isDraft":false,
//    "mergeCommit":{"oid":"fc3363e38aabd77f54e6b53034128182f8000571"},"mergeable":"UNKNOWN",
//    "state":"MERGED"}
// O script consome esses sete campos por `gh --jq '[...]|@tsv'`; o shim devolve o TSV correspondente.
const PRS: Record<string, { ramo: string; estado: string; rascunho: string; merge: string }> = {
  "390": { ramo: "fix/rbac-catalogo-banco-matriz", estado: "MERGED", rascunho: "false", merge: S6 },
  "392": { ramo: "chore/corpos-de-jurado-rastreados", estado: "MERGED", rascunho: "false", merge: S6 },
  "387": { ramo: "fix/multi", estado: "MERGED", rascunho: "false", merge: S6 },
  "386": { ramo: "feat/so-pelo-ramo", estado: "OPEN", rascunho: "false", merge: "" },
  "385": { ramo: "fix/so-no-ramo", estado: "OPEN", rascunho: "true", merge: "" },
  "384": { ramo: "fix/contraditoria", estado: "OPEN", rascunho: "false", merge: "" },
  "383": { ramo: "fix/aprovada", estado: "OPEN", rascunho: "false", merge: "" },
  "382": { ramo: "fix/reprovada", estado: "OPEN", rascunho: "true", merge: "" },
  "381": { ramo: "fix/mencao", estado: "OPEN", rascunho: "false", merge: "" },
  "380": { ramo: "fix/sem-objeto", estado: "OPEN", rascunho: "false", merge: "" },
  "999": { ramo: "fix/nenhuma-ata-fala-disto", estado: "OPEN", rascunho: "false", merge: "" },
};

function shim(nome: string, corpo: string): string {
  const alvo = path.join(repo, "bin", nome);
  mkdirSync(path.dirname(alvo), { recursive: true });
  writeFileSync(alvo, corpo, "utf8");
  try {
    chmodSync(alvo, 0o755);
  } catch {
    /* no Windows o bit de execução não existe; o script invoca o shim como `bash <arquivo>` */
  }
  return alvo;
}

const casos = Object.entries(PRS)
  .map(
    ([pr, d]) =>
      `    ${pr}) printf '%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\n' "${COMMIT_HEAD}" "${d.ramo}" "main" "${d.estado}" "${d.rascunho}" "UNKNOWN" "${d.merge}" ;;`,
  )
  .join("\n");

const CABECA_SHIM = "#!/usr/bin/env bash\nset -u\n";
const PR_VIEW = `if [ "\${1:-}" = "pr" ] && [ "\${2:-}" = "view" ]; then
  case "\${3:-}" in
${casos}
    *) exit 9 ;;
  esac
  exit 0
fi
`;
const API_OK = `if [ "\${1:-}" = "api" ]; then printf '%s\\n' "14 0 0"; exit 0; fi
exit 9
`;

const SHIM_OK = shim("gh-ok.sh", CABECA_SHIM + PR_VIEW + API_OK);
const SHIM_RAMO_NULO = shim(
  "gh-ramo-nulo.sh",
  CABECA_SHIM +
    `if [ "\${1:-}" = "pr" ] && [ "\${2:-}" = "view" ]; then
  printf '%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\n' "${COMMIT_HEAD}" "" "main" "OPEN" "false" "UNKNOWN" ""
  exit 0
fi
` +
    API_OK,
);
const SHIM_MORTO = shim("gh-morto.sh", CABECA_SHIM + 'echo "gh: boom" >&2\nexit 1\n');
const SHIM_API_MORTA = shim(
  "gh-api-morta.sh",
  CABECA_SHIM + PR_VIEW + 'if [ "${1:-}" = "api" ]; then exit 1; fi\nexit 9\n',
);

// --- o invocador: TODO caso passa por aqui, e aqui roda o ARTEFATO ------------------------------
function roda(pr: string, args: string[] = [], gh: string = SHIM_OK) {
  const r = spawnSync("bash", [SCRIPT, pr, ...args], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, MANDATO_GH: gh, MANDATO_REPO: "t/t" },
  });
  return { status: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
}
/** Todo SHA de 40 hex que a saída imprime, como conjunto ordenado. */
function shas(texto: string): string[] {
  return [...new Set(texto.match(/\b[0-9a-f]{40}\b/g) ?? [])].sort();
}

test("[A1a] #390 — o objeto sai da ata QUE SE DECLARA sobre o #390, com arquivo e linha", () => {
  const r = roda("390");
  assert.equal(r.status, 3, r.out + r.err);
  assert.match(r.out, /NAO DETERMINAVEL/);
  assert.match(
    r.out,
    new RegExp(`objeto declarado ${S1} \\(agent-orchestration/omega/juntas/J-B-SAN3-04a\\.md:4 @head-do-PR\\)`),
  );
  assert.doesNotMatch(r.out, new RegExp(`objeto declarado ${S2}`), "o objeto do #392 nao pode aparecer para o #390");
});

test("[A1b] #392 — a ata do #392 MENCIONA #390 e #391; mencionar nao e ser sobre", () => {
  const r = roda("392");
  assert.equal(r.status, 3, r.out + r.err);
  assert.match(
    r.out,
    new RegExp(`objeto declarado ${S2} \\(agent-orchestration/omega/juntas/J-B-SAN3-00\\.md:3 @head-do-PR\\)`),
  );
  // a mesma linha de Objeto cita `base <hex>`: o VALOR do campo e o PRIMEIRO SHA depois do rotulo.
  assert.doesNotMatch(r.out, new RegExp(`objeto declarado ${S3}`), "a base citada na linha nao e objeto");
});

test("[A1c] ata com a linha '- **approved_head:**' — o unico LIDO possivel, ec=0", () => {
  const r = roda("383");
  assert.equal(r.status, 0, r.out + r.err);
  assert.match(r.out, new RegExp(`approved_head:   ${S1}`));
  assert.match(r.out, /\^ LIDO DA ATA: agent-orchestration\/omega\/juntas\/J-APROVADA\.md:4/);
});

test("[A1d] casa pelo RAMO quando o titulo nao tem o numero — a 1a regressao do ciclo 1", () => {
  const r = roda("386");
  assert.equal(r.status, 0, r.out + r.err);
  assert.match(r.out, new RegExp(`approved_head:   ${S3}`));
  assert.match(r.out, /LIDO DA ATA: agent-orchestration\/omega\/juntas\/J-POR-RAMO\.md:/);
});

test("[A4/C1] headRefName vazio: PARADO, ec=1, e NADA no stdout (achado C2-02)", () => {
  const r = roda("393", [], SHIM_RAMO_NULO);
  assert.equal(r.status, 1, r.out + r.err);
  assert.match(r.err, /PARADO: campo 'headRefName' VAZIO/);
  assert.equal(r.out.trim(), "", "com ramo vazio o ciclo 1 imprimia um approved_head FABRICADO");
  assert.doesNotMatch(r.out, /approved_head/);
});

test("[A5] gh morto: ec=1 no modo completo E no --sha-only, com ZERO linha de SHA", () => {
  const completo = roda("392", [], SHIM_MORTO);
  assert.equal(completo.status, 1);
  assert.match(completo.err, /PARADO: nao li o PR #392/);
  const so = roda("392", ["--sha-only"], SHIM_MORTO);
  assert.equal(so.status, 1);
  assert.equal(so.out.trim(), "");
});

test("[C2] duas linhas de Objeto, zero aprovacao: ec=3 e as DUAS listadas (achado C2-04)", () => {
  const r = roda("387");
  assert.equal(r.status, 3, r.out + r.err);
  assert.match(r.out, new RegExp(`objeto declarado ${S4} \\(agent-orchestration/omega/juntas/J-MULTI\\.md:3`));
  assert.match(r.out, new RegExp(`objeto declarado ${S5} \\(agent-orchestration/omega/juntas/J-MULTI\\.md:7`));
  assert.doesNotMatch(r.out, /approved_head:   [0-9a-f]{40}/, "nenhum dos dois pode sair rotulado como aprovado");
});

test("[C3] ata que casa no titulo e nao tem linha de Objeto: ec=3 nomeando a ata", () => {
  const r = roda("380");
  assert.equal(r.status, 3, r.out + r.err);
  assert.match(r.out, /J-SEM-OBJETO\.md \(sem linha de Objeto\)/);
});

test("[C4] mencao so no corpo: ec=3, e a ferramenta diz que foi mencao — nao diz AUSENTE", () => {
  const r = roda("381");
  assert.equal(r.status, 3, r.out + r.err);
  assert.match(r.out, /J-MENCAO\.md \(mencao no corpo\)/);
  assert.doesNotMatch(r.out, /AUSENTE/);
});

test("[C5] nenhuma ata nomeia nem menciona: AUSENTE, ec=0 — e so aqui o silencio e afirmavel", () => {
  const r = roda("999");
  assert.equal(r.status, 0, r.out + r.err);
  assert.match(r.out, /approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #999/);
});

test("[C6] ata que vive SO no head do PR e lida — e o caso do #393", () => {
  const r = roda("385");
  assert.equal(r.status, 0, r.out + r.err);
  assert.match(r.out, new RegExp(`approved_head:   ${S2}`));
  assert.match(r.out, /LIDO DA ATA: agent-orchestration\/omega\/juntas\/J-SO-NO-RAMO\.md:\d+ @head-do-PR/);
});

test("[C7] --sha-only e EXATAMENTE o conjunto de SHAs do modo completo, um por linha", () => {
  for (const pr of ["387", "383", "392"]) {
    const completo = roda(pr);
    const so = roda(pr, ["--sha-only"]);
    // ÂNCORA ABSOLUTA, e ela existe por um defeito medido: sem ela, com o script APAGADO os dois lados
    // saem vazios e a comparação relativa passa vazia — o caso sobreviveria ao artefato, que é
    // exatamente o bloqueante C2-01. O critério [A2] pegou isto.
    assert.match(completo.out, /^approved_head:/m, `o modo completo nao produziu saida no #${pr}`);
    assert.equal(so.status, completo.status, `ec diverge entre os modos no #${pr}`);
    const linhas = so.out.split("\n").filter((l) => l.trim() !== "");
    assert.ok(linhas.length >= 3, `--sha-only devolveu ${linhas.length} linha(s) no #${pr}`);
    assert.ok(
      linhas.every((l) => /^[0-9a-f]{40}$/.test(l)),
      `--sha-only imprimiu algo que nao e SHA no #${pr}: ${JSON.stringify(linhas)}`,
    );
    assert.deepEqual([...linhas].sort(), shas(completo.out), `conjuntos divergem no #${pr}`);
  }
});

test("[C8] ata UNICA e REPROVADA: objeto julgado NAO vira approved_head (adendo A1)", () => {
  const r = roda("382");
  assert.equal(r.status, 3, r.out + r.err);
  assert.doesNotMatch(r.out, /approved_head:   [0-9a-f]{40}/, "o objeto de uma ata REPROVADA sairia como aprovado");
  assert.match(r.out, new RegExp(`objeto declarado ${S6} \\(agent-orchestration/omega/juntas/J-REPROVADA\\.md:3`));
  assert.match(r.out, /aprovacao nao legivel por maquina/);
});

test("[C9] approved_head que nao bate com objeto nenhum da ata: ec=3, contradicao", () => {
  const r = roda("384");
  assert.equal(r.status, 3, r.out + r.err);
  assert.match(r.out, /contradicao/);
  assert.doesNotMatch(r.out, /LIDO DA ATA/);
});

test("[D1] sem `python` no PATH a saida e IDENTICA — a dependencia nao declarada morreu", () => {
  const binMorto = path.join(repo, "bin-sem-python");
  mkdirSync(binMorto, { recursive: true });
  for (const n of ["python", "python3", "python.exe", "python3.exe"]) {
    writeFileSync(path.join(binMorto, n), "#!/usr/bin/env bash\nexit 1\n", "utf8");
    try {
      chmodSync(path.join(binMorto, n), 0o755);
    } catch {
      /* Windows */
    }
  }
  const normal = roda("392");
  const semPython = spawnSync("bash", [SCRIPT, "392"], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binMorto}${path.delimiter}${process.env.PATH ?? ""}`,
      MANDATO_GH: SHIM_OK,
      MANDATO_REPO: "t/t",
    },
  });
  // ÂNCORA ABSOLUTA, pela mesma razão do [C7]: comparar duas saídas VAZIAS passaria com o script
  // apagado. A linha abaixo exige que a execução normal tenha, de fato, produzido o relatório.
  assert.equal(normal.status, 3, normal.out + normal.err);
  assert.match(normal.out, /^approved_head:   NAO DETERMINAVEL/m);
  const semLinhaDeData = (s: string) => s.replace(/^# gerado em:.*$/m, "");
  assert.equal(semPython.status, normal.status);
  assert.equal(semLinhaDeData(semPython.stdout ?? ""), semLinhaDeData(normal.out));
});

test("[D2] check-runs que nao respondem: PARADO ec=1 — 'nao perguntei' nao e 'zero check-run'", () => {
  const r = roda("392", [], SHIM_API_MORTA);
  assert.equal(r.status, 1, r.out + r.err);
  assert.match(r.err, /PARADO: nao li os check-runs/);
  assert.doesNotMatch(r.out, /total=0/, "o ciclo 1 virava '0 0 0' e disparava BLOQUEADO pela causa errada");
});

test("[D3] flag desconhecida: mensagem de uso e ec=2, nunca modo completo em silencio", () => {
  const r = roda("392", ["--shaonly"]);
  assert.equal(r.status, 2, r.out + r.err);
  assert.match(r.err, /uso: mandato-refs\.sh/);
  assert.equal(r.out.trim(), "");
});

test("[D3b] PR ausente ou nao-numerico: ec=2 com uso; nunca ec=0", () => {
  const semPr = spawnSync("bash", [SCRIPT], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, MANDATO_GH: SHIM_OK, MANDATO_REPO: "t/t" },
  });
  assert.equal(semPr.status, 2);
  assert.match(semPr.stderr ?? "", /uso: mandato-refs\.sh/);
  const naoNumerico = roda("--sha-only");
  assert.equal(naoNumerico.status, 2);
  assert.match(naoNumerico.err, /PR nao-numerico/);
});
