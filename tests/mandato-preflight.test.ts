// Guard do `scripts/mandato-preflight.sh` — o pré-voo que decide se o MANDATO do orquestrador sai.
//
// POR QUE ESTE ARQUIVO EXISTE (ele é NOVO no ciclo 2 do bloco B-GOV-MANDATO, PR #393).
// No ciclo 1 o pré-voo tinha ZERO cobertura automatizada: `grep -rn 'mandato-preflight' tests/`
// devolvia nada, e `grep -rn 'mandato' .github/workflows/*.yml` também. A junta reprovou o bloco
// com o bloqueante C1-01 — as MESMAS oito afirmações numéricas, sem `medido por:`, passavam em
// TABELA e reprovavam em BULLET — e classificou a ausência de cobertura como nota.
//
// A PROPRIEDADE: *cada checagem enuncia uma propriedade sobre o DOCUMENTO, não um padrão sobre
// FORMAS DE LINHA.* Este arquivo mede isso pela única via que não mente: `spawnSync` do `.sh` de
// verdade sobre fixtures escritas em `mkdtemp`. Não há réplica de nenhuma checagem aqui, nem
// asserção sobre a fonte do script — apagar `scripts/mandato-preflight.sh` derruba TODOS os casos.
//
// FRONTEIRA DECLARADA: o pré-voo é medido COMO SCRIPT. O `mandato-refs.sh` real não é atravessado
// (é shimado por `MANDATO_REFS`), e mandatos não são versionados, logo não existe "pré-voo no CI
// sobre mandatos reais": a única medição sobre um mandato real neste PR é o dogfooding da bateria,
// em que o relatório do próprio desenvolvedor passa pelo pré-voo.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const SCRIPT = path.join(RAIZ, "scripts/mandato-preflight.sh");

const dir = mkdtempSync(path.join(tmpdir(), "mandato-preflight-"));
process.on("exit", () => {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* tmpdir de teste; limpeza best-effort */
  }
});

const SHA_A = "1111111111111111111111111111111111111111";
const SHA_B = "2222222222222222222222222222222222222222";

/** Escreve uma fixture de mandato: `## MEDIDO` com o corpo dado + `## HIPOTESE` mínima válida. */
function mandato(nome: string, corpoMedido: string[], corpoHipotese: string[] = ["- nada aqui. derruba com: true"]): string {
  const alvo = path.join(dir, `${nome}.md`);
  writeFileSync(alvo, ["## MEDIDO", "", ...corpoMedido, "", "## HIPOTESE", "", ...corpoHipotese, ""].join("\n"), "utf8");
  return alvo;
}
function bruto(nome: string, linhas: string[]): string {
  const alvo = path.join(dir, `${nome}.md`);
  writeFileSync(alvo, linhas.join("\n") + "\n", "utf8");
  return alvo;
}
function shim(nome: string, corpo: string): string {
  const alvo = path.join(dir, "bin", nome);
  mkdirSync(path.dirname(alvo), { recursive: true });
  writeFileSync(alvo, corpo, "utf8");
  try {
    chmodSync(alvo, 0o755);
  } catch {
    /* Windows: o script invoca o shim sempre como `bash <arquivo>` */
  }
  return alvo;
}

const REFS_OK = shim(
  "refs-ok.sh",
  `#!/usr/bin/env bash
if [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n%s\\n' "${SHA_A}" "${SHA_B}"; exit 0; fi
printf 'approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #%s\\n' "\${1:-}"
exit 0
`,
);
const REFS_MORTO = shim("refs-morto.sh", '#!/usr/bin/env bash\necho "PARADO: nao li o PR" >&2\nexit 1\n');
const REFS_ND = shim(
  "refs-nd.sh",
  `#!/usr/bin/env bash
if [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n%s\\n' "${SHA_A}" "${SHA_B}"; exit 3; fi
printf 'approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao)\\n'
exit 3
`,
);
const REFS_LIDO_A = shim(
  "refs-lido-a.sh",
  `#!/usr/bin/env bash
if [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n%s\\n' "${SHA_A}" "${SHA_B}"; exit 0; fi
printf 'approved_head:   %s\\n' "${SHA_A}"
printf '                 ^ LIDO DA ATA: agent-orchestration/omega/juntas/J-X.md:4 @head-do-PR\\n'
exit 0
`,
);
const REFS_LIDO_B = shim(
  "refs-lido-b.sh",
  `#!/usr/bin/env bash
if [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n%s\\n' "${SHA_A}" "${SHA_B}"; exit 0; fi
printf 'approved_head:   %s\\n' "${SHA_B}"
printf '                 ^ LIDO DA ATA: agent-orchestration/omega/juntas/J-X.md:4 @head-do-PR\\n'
exit 0
`,
);

function roda(fixture: string, pr?: string, refs: string = REFS_OK) {
  const args = pr === undefined ? [SCRIPT, fixture] : [SCRIPT, fixture, pr];
  const r = spawnSync("bash", args, { encoding: "utf8", env: { ...process.env, MANDATO_REFS: refs } });
  const out = r.stdout ?? "";
  return {
    status: r.status,
    out,
    err: r.stderr ?? "",
    rejeicoes: (out.match(/^REJEITADO {2}/gm) ?? []).length,
  };
}

// --- checagem 3: a UNIDADE, não o marcador de lista (bloqueante C1-01) -------------------------
const NUM_A = "suite 3058/3060";
const NUM_B = "CI 14/14";

test("[B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1)", () => {
  const r = roda(mandato("f-bullet", [`- ${NUM_A}`, `- ${NUM_B}`]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
});

test("[B1-tabela] linhas de TABELA sem evidencia: 2 rejeicoes — era 0 e PRE-VOO OK no ciclo 1", () => {
  const r = roda(
    mandato("f-tabela", ["| afirmacao | medido por: |", "|---|---|", `| ${NUM_A} |  |`, `| ${NUM_B} |  |`]),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
});

test("[B1-paragrafo] paragrafo solto sem evidencia: 1 unidade, 1 rejeicao", () => {
  const r = roda(mandato("f-paragrafo", [`A suite passou ${NUM_A} e o ${NUM_B}.`]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[B1-numerada] lista numerada sem evidencia: 2 rejeicoes", () => {
  const r = roda(mandato("f-numerada", [`1. ${NUM_A}`, `2. ${NUM_B}`]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
});

test("[B1-citacao] bloco de citacao sem evidencia: 1 rejeicao", () => {
  const r = roda(mandato("f-citacao", [`> ${NUM_A} e ${NUM_B}`]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[B1-recuada] item recuado sem pai: 1 rejeicao — indentar nao e esconder", () => {
  const r = roda(mandato("f-recuada", [`  - ${NUM_A} (recuada, sem pai)`]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[B1-bullet-um-sem] so o item SEM evidencia reprova: 1 rejeicao, e e a do 2o", () => {
  const r = roda(mandato("f-bullet1", [`- ${NUM_A}, medido por: npm test`, `- ${NUM_B}`]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /CI 14\/14/);
  assert.doesNotMatch(r.out, /l\.3:/, "o item COM evidencia nao pode ser acusado");
});

test("[B1-tabela-uma-sem] so a linha SEM evidencia reprova: 1 rejeicao", () => {
  const r = roda(
    mandato("f-tabela1", [
      "| afirmacao | medido por: |",
      "|---|---|",
      `| ${NUM_A} | npm test |`,
      `| ${NUM_B} |  |`,
    ]),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /CI 14\/14/);
});

test("[B1-correto] bullet + saida colada + bloco cercado + tabela com evidencia: ZERO rejeicao", () => {
  const r = roda(
    mandato("f-correto", [
      `- ${NUM_A}, medido por: npm test`,
      "  # tests 3058",
      "  ```",
      "  saida colada, com linha em branco dentro:",
      "",
      "  # pass 3058",
      "  ```",
      "",
      "| afirmacao | medido por: |",
      "|---|---|",
      `| ${NUM_B} | gh pr checks |`,
      "",
      "### um cabecalho dentro da secao nao e afirmacao",
      "",
      "- outra, medido por: true",
    ]),
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /PRE-VOO OK/);
});

test("[B2] as 8 afirmacoes numericas REAIS deste bloco, em tabela, sem evidencia: 8 rejeicoes", () => {
  const oito = [
    "suite 3058/3060",
    "blocks_completed 167 -> 168",
    "CI 14/14",
    "20/20 caminhos errados aceitos",
    "5/5 rejeitados",
    "6 checagens",
    "9 chamadas de falha",
    "9 arquivos no diff",
  ];
  const r = roda(
    mandato("f-oito", ["| afirmacao | medido por: |", "|---|---|", ...oito.map((a) => `| ${a} |  |`)]),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 8, r.out);
});

// --- checagem 4: o TOKEN, não a vizinhança -----------------------------------------------------
const FAKE = (n: number) => `deadbeefdeadbeefdeadbeefdeadbeefdeadbe${String(n).padStart(2, "0")}`;

test("[B3] as 11 vizinhancas do SHA: 11 rejeicoes — a pontuacao deixa de esconder o SHA", () => {
  const linhas = [
    `- entre crases \`${FAKE(1)}\` medido por: true`,
    `- virgula ${FAKE(2)}, medido por: true`,
    `- ponto final ${FAKE(3)}. medido por: true`,
    `- parenteses (${FAKE(4)}) medido por: true`,
    `- hifen colado -${FAKE(5)} medido por: true`,
    `- maiusculas \`${FAKE(6).toUpperCase()}\` medido por: true`,
    `- commit=${FAKE(7)} medido por: true`,
    `${FAKE(8)} no inicio da linha, medido por: true`,
    `- dois SHAs a um espaco: ${SHA_A} ${FAKE(9)} medido por: true`,
    `- sufixo de linha ${FAKE(10)}:12 medido por: true`,
    `- colchetes [${FAKE(11)}] medido por: true`,
  ];
  const r = roda(mandato("f-vizinhancas", linhas), "393");
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 11, r.out);
  for (let i = 1; i <= 11; i++) assert.match(r.out, new RegExp(FAKE(i)), `a vizinhanca ${i} escapou`);
});

test("[B3-neg] controles negativos: caminho do scratchpad, UUID e `deadbeef.md` NAO sao SHA", () => {
  const r = roda(
    mandato("f-neg", [
      "- caminho C:/Users/AMP/AppData/Local/Temp/claude/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/x, medido por: true",
      "- uuid solto 3ad1b87d-fdbf-41f2-b085-1068e01c5d64, medido por: true",
      "- arquivo `deadbeef.md` citado como nome, medido por: true",
    ]),
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[B4] ferramenta de referencias MORTA: a causa e ela, nunca 'SHA VELHO' do mandato", () => {
  const r = roda(mandato("f-refs-morta", [`- head \`${SHA_A}\` medido por: true`]), "393", REFS_MORTO);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /referencias indisponiveis \(mandato-refs\.sh ec=1\)/);
  assert.doesNotMatch(r.out, /SHA VELHO/, "culpar o mandato pela morte da ferramenta e a pergunta vizinha");
});

test("[B4b] referencias em ec=3: AVISO, nao REJEITADO — a proveniencia dos SHAs continua valendo", () => {
  const r = roda(mandato("f-refs-nd", [`- head \`${SHA_A}\` medido por: true`]), "393", REFS_ND);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /AVISO {6}approved_head NAO DETERMINAVEL/);
});

test("[B4c] SHA citado sem o numero do PR: rejeita, porque nada pode ser conferido", () => {
  const r = roda(mandato("f-sem-pr", [`- head \`${SHA_A}\` medido por: true`]));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /cita SHA mas nao recebeu o numero do PR/);
});

// --- checagem 5: o COMANDO, não o vocabulário --------------------------------------------------
test("[B5a] 'nao aparece' ACENTUADO com grep sem -i: rejeita (o ciclo 1 era cego ao til)", () => {
  const r = roda(mandato("f-acento", ['- "não aparece" no arquivo, medido por: grep -c "naoaparece" CLAUDE.md']));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[B5b] aspas SIMPLES com grep sem -i: rejeita", () => {
  const r = roda(mandato("f-aspas", ["- nao existe, medido por: grep -c 'naoexiste' CLAUDE.md"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[B5c] o token `via-interna` nao vale como -i: rejeita", () => {
  const r = roda(mandato("f-viainterna", ["- nenhum via-interna, medido por: grep -c via-interna CLAUDE.md"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[B5d] `-ni` (agrupado) conta como -i: aceita", () => {
  const r = roda(mandato("f-ni", ["- nao aparece, medido por: grep -ni naoaparece CLAUDE.md"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[B5e] `caixa-exata:` na unidade dispensa o -i: aceita", () => {
  const r = roda(
    mandato("f-caixa", ["- contagem, medido por: grep -c NAOAPARECE CLAUDE.md", "  caixa-exata: o token e maiusculo por contrato"]),
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

// --- checagem 6: a EXISTÊNCIA EXATA (fecha P-GOV-MANDATO-PREFLIGHT-CAMINHO-POR-BASENAME) --------
test("[B6] >= 20 basenames RASTREADOS sob um diretorio inexistente: 0 aceitos", () => {
  const rastreados = execFileSync("git", ["ls-files", "scripts/*.mjs", "tests/*.ts", "src/config/*.ts"], {
    cwd: RAIZ,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(0, 20)
    .map((p) => p.split("/").pop() as string);
  assert.ok(rastreados.length >= 20, `o repo devolveu so ${rastreados.length} basenames rastreados`);
  const r = roda(
    mandato(
      "f-basename",
      rastreados.map((b) => `- caminho src/diretorio/que/nao/existe/${b} medido por: true`),
    ),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, rastreados.length, r.out);
  for (const b of rastreados) assert.match(r.out, new RegExp(b.replace(/\./g, "\\.")), `${b} foi aceito por basename`);
});

test("[B6b] o uso legitimo que a pendencia protege: caminho relativo a raiz do app Flutter", () => {
  const r = roda(mandato("f-flutter", ["- `lib/core/sync/sync_action_store.dart` medido por: true"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[B6c] 5 basenames que nao existem em lugar nenhum: 5 rejeicoes", () => {
  const nomes = ["zzz-a-8831.ts", "zzz-b-8832.mjs", "zzz-c-8833.dart", "zzz-d-8834.json", "zzz-e-8835.yml"];
  const r = roda(mandato("f-inexistentes", nomes.map((n) => `- \`src/${n}\` medido por: true`)));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 5, r.out);
});

test("[B7] `.sh` inexistente COM e SEM crases: as duas rejeitam (a lista de extensoes morreu)", () => {
  const r = roda(
    mandato("f-sh", [
      "- `scripts/zzz-inexistente-8821.sh` medido por: true",
      "- scripts/zzz-inexistente-8822.sh medido por: true",
    ]),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
  assert.match(r.out, /zzz-inexistente-8821\.sh/);
  assert.match(r.out, /zzz-inexistente-8822\.sh/);
});

test("[B7b] `(novo)`, diretorio existente e glob: nenhuma rejeicao", () => {
  const r = roda(
    mandato("f-novo", [
      "- `tests/mandato-ainda-nao-existe.test.ts` (novo) medido por: true",
      "- `docs/revisoes/SAN3/` medido por: true",
      "- `src/**` medido por: true",
    ]),
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[B7c] razao numerica e caminho absoluto nao sao caminho do repositorio", () => {
  const r = roda(
    mandato("f-razao", [
      "- a suite deu 3058/3060 e o CI 14/14, medido por: true",
      "- o log ficou em C:/Users/AMP/w-dev393/nao-existe-8899.log, medido por: true",
      "- a doc esta em https://example.invalid/nao/existe.md, medido por: true",
    ]),
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

// --- checagem 7: rotular é afirmar (adendo A1) -------------------------------------------------
test("[B8a] rotular approved_head com a ferramenta em NAO DETERMINAVEL: rejeita", () => {
  const r = roda(mandato("f-ah-nd", [`- approved_head: \`${SHA_A}\` medido por: true`]), "393", REFS_ND);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, new RegExp(`rotula ${SHA_A} como approved_head, mas a ferramenta diz NAO DETERMINAVEL`));
});

test("[B8b] rotular approved_head com LIDO do MESMO SHA: aceita", () => {
  const r = roda(mandato("f-ah-ok", [`- approved_head: \`${SHA_A}\` medido por: true`]), "393", REFS_LIDO_A);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[B8c] rotular approved_head com LIDO de OUTRO SHA: rejeita", () => {
  const r = roda(mandato("f-ah-outro", [`- approved_head: \`${SHA_A}\` medido por: true`]), "393", REFS_LIDO_B);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, new RegExp(`rotula ${SHA_A} como approved_head, mas a ferramenta LEU ${SHA_B}`));
});

// --- checagens 1 e 2, que o ciclo 1 já tinha e que continuam de pé -----------------------------
test("[A1] falta a secao '## MEDIDO': rejeita", () => {
  const r = roda(bruto("f-sem-medido", ["## HIPOTESE", "", "- nada. derruba com: true"]));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /falta a secao '## MEDIDO'/);
});

test("[A2] conteudo fora das duas secoes: rejeita nomeando a linha", () => {
  const r = roda(
    bruto("f-fora", ["texto solto antes de tudo", "", "## MEDIDO", "", "- x, medido por: true", "", "## HIPOTESE", "", "- y. derruba com: true"]),
  );
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /linha\(s\) de conteudo fora de MEDIDO\/HIPOTESE/);
});

test("[A3] arquivo inexistente: mensagem de uso e ec=1, nunca PRE-VOO OK", () => {
  const r = spawnSync("bash", [SCRIPT, path.join(dir, "nao-existe-9911.md")], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr ?? "", /uso: mandato-preflight\.sh/);
  assert.doesNotMatch(r.stdout ?? "", /PRE-VOO OK/);
});

test("[A4] o HIPOTESE tambem e por unidade: tabela sem 'derruba com:' reprova", () => {
  const r = roda(
    mandato("f-hip", ["- x, medido por: true"], ["| hipotese | derruba com: |", "|---|---|", "| o CI cai em ubuntu |  |"]),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /unidade de HIPOTESE sem 'derruba com:/);
});
