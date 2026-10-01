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
// CICLO 3 (E3): import proprio, em linha nova -- o [P-0] so admite adicoes neste arquivo
// (mais as DUAS fixtures reescritas na FORMA, declaradas no plano).
import { readFileSync } from "node:fs";
// CICLO 4 (E1, Dev-T4): idem -- a ancora de alcance dos shims da A15 e do [F-25].
import { existsSync } from "node:fs";

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
  const r = spawnSync("bash", args, { encoding: "utf8", env: { ...process.env, MANDATO_REFS: refs }, timeout: 60_000 });
  assert.equal(r.signal, null, "artefato nao terminou em 60 s");
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
      "  ```",
      "  # tests 3058",
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
    mandato("f-caixa", ["- contagem, medido por: grep -c NAOAPARECE CLAUDE.md caixa-exata: o token e maiusculo por contrato"]),
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

// --- checagem 7 (v3): `approved_head` e TOKEN RESERVADO — rotular deixou de ser afirmar --------
// CICLO 3, Dev-T-3 (plano §13.1/§13.2). Estes tres casos encodavam a semantica da v2 ("rotular e
// afirmar": o rotulo era conferido contra o estado LIDO da ferramenta e ACEITO quando o SHA batia).
// A v3 REVOGOU isso — E2.b [F-7a]: "10/10 REJ nomeando a linha, sob QUALQUER shim (LIDO, ND,
// AUSENTE)". O nome do campo e da FERRAMENTA; a unica via de `approved_head` aparecer num mandato e
// a colagem verbatim. PROPRIEDADE: o ESTADO da ferramenta e a FORMA da linha sao irrelevantes — o
// MESMO corpo tem o MESMO veredito, e o veredito e UMA rejeicao, a do token. A mensagem do detector
// do ciclo 2 (`rotula X como approved_head, mas a ferramenta ...`) nao pode aparecer: se aparece, a
// mesma linha e rejeitada DUAS vezes por uma maquina de forma que o inventario da E2.i nao lista.
// Os quatro casos usam o MESMO byte de rotulo; so o shim (estado) ou a moldura (forma) variam.
// ⇄ mutacoes que os deixam vermelhos (medidas numa COPIA do script, fora de `scripts/`):
//   - o detector do ciclo 2 (`rotulo_ah`) vivo — e o script do head 399ce357 — -> [B8a]/[B8c]
//     VERMELHOS: 2 REJ na mesma linha e a mensagem velha. Nascem vermelhos de proposito: so ficam
//     verdes quando o detector sai (Dev-S-2, §13.1);
//   - o token reservado desligado (nenhum `AH7`) -> [B8a]..[B8d] VERMELHOS (sob LIDO-A: ec=0);
//   - o token restrito a item de lista -> [B8d] VERMELHO (tabela e prosa escapam).
const AH_ROTULO = `approved_head: \`${SHA_A}\``;
function vereditoTokenReservado(r: ReturnType<typeof roda>, linha: number, onde: string): void {
  assert.equal(r.status, 1, `${onde}: o token reservado tem de rejeitar\n${r.out}`);
  assert.equal(r.rejeicoes, 1, `${onde}: exatamente UMA rejeicao (a do token) — nunca a mesma linha duas vezes\n${r.out}`);
  assert.match(r.out, /token reservado/, `${onde}: caiu por OUTRA checagem\n${r.out}`);
  assert.match(r.out, /fora da colagem/, `${onde}: caiu por OUTRA checagem\n${r.out}`);
  assert.match(r.out, new RegExp(`^REJEITADO {2}l\\.${linha}: [^\\n]*token reservado`, "m"), `${onde}: a REJ nao nomeia a l.${linha}\n${r.out}`);
  assert.doesNotMatch(r.out, /rotula .* como approved_head/, `${onde}: a mensagem do detector do ciclo 2 (v2, revogada) apareceu\n${r.out}`);
}

test("[B8a] rotulo approved_head com a ferramenta em NAO DETERMINAVEL: 1 REJ, a do token reservado", () => {
  const r = roda(mandato("f-ah-nd", [`- ${AH_ROTULO} medido por: true`]), "393", REFS_ND);
  vereditoTokenReservado(r, 3, "ND");
});

test("[B8b] rotulo approved_head com LIDO do MESMO SHA: 1 REJ — o SHA bater NAO isenta (v2 revogada)", () => {
  const r = roda(mandato("f-ah-lido-a", [`- ${AH_ROTULO} medido por: true`]), "393", REFS_LIDO_A);
  vereditoTokenReservado(r, 3, "LIDO-A");
});

test("[B8c] rotulo approved_head com LIDO de OUTRO SHA: 1 REJ, a do token reservado", () => {
  const r = roda(mandato("f-ah-lido-b", [`- ${AH_ROTULO} medido por: true`]), "393", REFS_LIDO_B);
  vereditoTokenReservado(r, 3, "LIDO-B");
});

test("[B8d] o MESMO rotulo em TABELA e em PROSA sob LIDO-A: o MESMO veredito do item de lista", () => {
  const lista = roda(mandato("f-ah-d-lista", [`- ${AH_ROTULO} medido por: true`]), "393", REFS_LIDO_A);
  const tabela = roda(
    mandato("f-ah-d-tabela", ["| afirmacao | medido por: |", "|---|---|", `| ${AH_ROTULO} | true |`]),
    "393",
    REFS_LIDO_A,
  );
  const prosa = roda(mandato("f-ah-d-prosa", [`O ${AH_ROTULO} deste ciclo, medido por: true`]), "393", REFS_LIDO_A);
  vereditoTokenReservado(lista, 3, "lista");
  vereditoTokenReservado(tabela, 5, "tabela");
  vereditoTokenReservado(prosa, 3, "prosa");
  // "o mesmo veredito" e literal: as linhas REJEITADO das tres formas, sem o numero da linha, sao iguais.
  const rej = (s: string) => s.split("\n").filter((l) => l.startsWith("REJEITADO")).map((l) => l.replace(/l\.\d+/, "l.N"));
  assert.deepEqual(rej(tabela.out), rej(lista.out), `tabela x lista\n${tabela.out}\n--\n${lista.out}`);
  assert.deepEqual(rej(prosa.out), rej(lista.out), `prosa x lista\n${prosa.out}\n--\n${lista.out}`);
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

// =================================================================================================
// CICLO 3 -- E3. Laco de FORMAS contra over-rejection, os fixtures das DUAS rodadas do critico como
// casos, e os reciprocos NOS DOIS LADOS (partir E juntar).
//
// O PRINCIPIO COMPLETO (§0.5 v3 do plano): quem MOVE a fronteira da unidade e o autor, e ele a move
// nos DOIS sentidos. Para regra ∀, PARTIR e seguro (rejeita a mais) e JUNTAR e inseguro (um `medido
// por:` cobre N afirmacoes). O ciclo 1 escapou pela tabela; o ciclo 2, pela linha; a v1 do plano,
// por PARTIR o paragrafo; a v2, por JUNTAR (indentacao e cerca). Por isso todo caso ∀ deste bloco
// tem o par: um que PARTE e um que JUNTA.
//
// Nada aqui replica checagem nenhuma: todo caso e `spawnSync` do `.sh` de verdade, e o [F-0] mede
// que com o artefato ausente NENHUM passa.
// =================================================================================================

// --- o shim de refs em modo COMPLETO: e dele que as colagens sao GERADAS, nunca literais ---------
// A 1a linha e a 1a linha real da saida do `mandato-refs.sh` (capturada do artefato em 2026-09-27).
// `# gerado em:` carrega o PID: muda a CADA invocacao, DE PROPOSITO -- no ciclo 4 so o CARIMBO dela e
// normalizado e a linha e COMPARADA (§15.14); um `# gerado em:` fixo deixaria a normalizacao sem teste.
const PR_SHA = (n: string, papel: 0 | 1) => (papel === 0 ? "a" : "b").repeat(4) + n.padStart(4, "0").repeat(9);
const PRS_COLAGEM = ["701", "702", "777", "393"] as const;
const REFS_COMPLETO = shim(
  "refs-completo.sh",
  `#!/usr/bin/env bash
set -u
N="\${1:-}"
case "$N" in
` +
    PRS_COLAGEM.map(
      (n) =>
        `  ${n}) H="${PR_SHA(n, 0)}"; O="${PR_SHA(n, 1)}"; ${
          n === "777"
            ? `AH="${PR_SHA(n, 0)}"; AH2="                 ^ LIDO DA ATA: agent-orchestration/omega/juntas/J-${n}.md:4 @head-do-PR"; EC=0`
            : `AH="NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')"; AH2="                 objeto declarado \${O} (agent-orchestration/omega/juntas/J-${n}.md:3 @head-do-PR) — aprovacao nao legivel por maquina"; EC=3`
        } ;;`,
    ).join("\n") +
    `
  666) echo "PARADO: nao li o PR #666" >&2; exit 1 ;;
  *) echo "PARADO: PR desconhecido: $N" >&2; exit 1 ;;
esac
if [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n%s\\n' "$H" "$O"; exit $EC; fi
printf '# refs do PR #%s — GERADO por scripts/mandato-refs.sh, para COLAR no mandato\\n' "$N"
printf '# gerado em: %s · repo: t/t\\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)-$$"
printf '\\n'
printf 'ramo:            fix/x\\n'
printf 'base:            origin/main\\n'
printf 'estado:          OPEN | rascunho=false | UNKNOWN\\n'
printf 'head do PR:      %s\\n' "$H"
printf 'merge-base:      %s\\n' "$O"
printf 'merge commit:    <ainda nao mergeado>\\n'
printf 'check-runs:      total=14 nao-verdes=0 pendentes=0\\n'
printf 'approved_head:   %s\\n' "$AH"
printf '%s\\n' "$AH2"
printf '\\n'
exit $EC
`,
);

/** As linhas da saida REAL do shim, sem `\\r`. A colagem do mandato e SEMPRE gerada por aqui. */
function saidaDoRefs(n: string, refs: string = REFS_COMPLETO): string[] {
  const r = spawnSync("bash", [refs, n], { encoding: "utf8" });
  const linhas = (r.stdout ?? "").replace(/\r/g, "").split("\n");
  while (linhas.length > 0 && linhas[linhas.length - 1] === "") linhas.pop();
  assert.ok(
    linhas[0]?.startsWith(`# refs do PR #${n}`),
    `o shim nao produziu a 1a linha da saida real para #${n}: ${JSON.stringify(linhas[0])}`,
  );
  return linhas;
}
/** O bloco de colagem: cercado e indentado, como o §8 do plano manda colar no mandato. */
function colagem(n: string, recuo = "  ", muta?: (l: string[]) => string[]): string[] {
  const corpo = muta ? muta(saidaDoRefs(n)) : saidaDoRefs(n);
  return [`${recuo}\`\`\``, ...corpo.map((l) => (l === "" ? "" : recuo + l)), `${recuo}\`\`\``];
}
const UNIDADE_COLAGEM = (n: string) => `- referencias do #${n}, medido por: bash scripts/mandato-refs.sh ${n}`;

/** Igual a `mandato()`, mas o arquivo vai para o disco em CRLF -- e o [F-EOL]. */
function mandatoCrLf(nome: string, corpoMedido: string[], corpoHipotese: string[] = ["- nada aqui. derruba com: true"]): string {
  const alvo = path.join(dir, `${nome}.md`);
  writeFileSync(alvo, ["## MEDIDO", "", ...corpoMedido, "", "## HIPOTESE", "", ...corpoHipotese, ""].join("\r\n"), "utf8");
  return alvo;
}
/** Escreve um fixture do critico VERBATIM (o conteudo dele, byte a byte, como corpo do arquivo). */
function verbatim(nome: string, linhas: string[]): string {
  const alvo = path.join(dir, `${nome}.md`);
  writeFileSync(alvo, linhas.join("\n") + "\n", "utf8");
  return alvo;
}

// --- as 19 FORMAS -------------------------------------------------------------------------------
// Uma forma recebe (a, b): `a` e a reivindicacao, `b` e o resto (que carrega o `medido por:` quando
// o caso e positivo). As 14 primeiras mantem a e b na MESMA unidade; as 5 ultimas -- as do critico,
// rodada 1 -- separam a de b por uma LINHA VAZIA, e sao elas que derrubaram o detector por paragrafo.
type Forma = { nome: string; frouxa: boolean; render: (a: string, b: string) => string[] };
const temToken = (b: string) => /medido por:/.test(b);
const junta = (a: string, b: string) => (b === "" ? a : `${a} ${b}`);
const FORMAS: Forma[] = [
  { nome: "bullet", frouxa: false, render: (a, b) => [`- ${junta(a, b)}`] },
  { nome: "numerada", frouxa: false, render: (a, b) => [`1. ${junta(a, b)}`] },
  { nome: "asterisco", frouxa: false, render: (a, b) => [`* ${junta(a, b)}`] },
  { nome: "paragrafo", frouxa: false, render: (a, b) => [junta(a, b)] },
  { nome: "citacao", frouxa: false, render: (a, b) => [`> ${junta(a, b)}`] },
  {
    nome: "tabela",
    frouxa: false,
    render: (a, b) => [
      "| afirmacao | medido por: |",
      "|---|---|",
      temToken(b) ? `| ${a} | ${b} |` : `| ${junta(a, b)} |  |`,
    ],
  },
  { nome: "recuada", frouxa: false, render: (a, b) => [`  - ${junta(a, b)}`] },
  { nome: "aposUnidade", frouxa: false, render: (a, b) => ["- contexto, medido por: true", "", `- ${junta(a, b)}`] },
  { nome: "negrito", frouxa: false, render: (a, b) => [`- **${a}** ${b}`.trimEnd()] },
  { nome: "checkbox", frouxa: false, render: (a, b) => [`- [x] ${junta(a, b)}`] },
  { nome: "duasLinhasIndentada", frouxa: false, render: (a, b) => (b === "" ? [`- ${a}`] : [`- ${a}`, `  ${b}`]) },
  {
    nome: "cercado",
    frouxa: false,
    render: (a, b) => ["- contexto, medido por: true", "  ```", `  ${junta(a, b)}`, "  ```"],
  },
  { nome: "cabecalho", frouxa: false, render: (a, b) => [`### ${junta(a, b)}`] },
  {
    nome: "comCercaAntes",
    frouxa: false,
    render: (a, b) => ["- contexto, medido por: true", "  ```", "  saida", "  ```", "", `- ${junta(a, b)}`],
  },
  { nome: "listaFrouxa", frouxa: true, render: (a, b) => (b === "" ? [`- ${a}:`] : [`- ${a}:`, "", `  ${b}`]) },
  {
    nome: "detailsFrouxo",
    frouxa: true,
    render: (a, b) => ["<details>", `<summary>${a}</summary>`, "", b, "", "</details>"].filter((l, i) => !(i === 3 && b === "")),
  },
  { nome: "definicaoFrouxa", frouxa: true, render: (a, b) => (b === "" ? [a] : [a, "", `: ${b}`]) },
  { nome: "citacaoAposVazia", frouxa: true, render: (a, b) => (b === "" ? [`- ${a}`] : [`- ${a}`, "", `> ${b}`]) },
  {
    nome: "cercaAposVazia",
    frouxa: true,
    render: (a, b) => (b === "" ? [`- ${a}`] : [`- ${a}`, "", "```", b, "```"]),
  },
];
const FORMAS_NOMEADAS = [
  "bullet",
  "tabela",
  "cercado",
  "cabecalho",
  "listaFrouxa",
  "detailsFrouxo",
  "definicaoFrouxa",
  "citacaoAposVazia",
  "cercaAposVazia",
];

test("[F-MIN] o laco tem >= 19 formas e as 9 NOMEADAS — ⇄ remover uma delas deixa este caso vermelho", () => {
  assert.ok(FORMAS.length >= 19, `so ${FORMAS.length} formas`);
  for (const n of FORMAS_NOMEADAS) assert.ok(FORMAS.some((f) => f.nome === n), `falta a forma nomeada ${n}`);
  assert.equal(FORMAS.filter((f) => f.frouxa).length, 5, "as 5 formas frouxas do critico (rodada 1) tem de estar todas");
  assert.equal(new Set(FORMAS.map((f) => f.nome)).size, FORMAS.length, "nome de forma repetido");
  // SONDA FORTALECIDA (2a instancia) — este era o UNICO caso do arquivo que sobrevivia ao artefato
  // apagado. Medido: com `scripts/mandato-preflight.sh` removido, 298 casos dao 297 `fail` e
  // 1 `pass`, e o sobrevivente era este, porque ele so olhava o array `FORMAS` em memoria.
  // A regra da matriz de ausencia e ZERO sobreviventes: o caso passa a atravessar o artefato,
  // renderizando cada forma e exigindo veredito dele. Um `render` que devolva lixo (ou o script
  // ausente) derruba este caso tambem.
  for (const f of FORMAS) {
    const r = roda(mandato(`fmin-${f.nome}`, f.render("uma afirmacao sem numero", "medido por: true")));
    assert.ok(
      r.status === 0 || r.status === 1,
      `a forma ${f.nome} nao produziu veredito do artefato (ec=${r.status})\n${r.out}`,
    );
    assert.match(r.out, /PRE-VOO (OK|REJEITOU)/, `a forma ${f.nome} nao chegou ao artefato\n${r.out}`);
  }
});

// --- as sementes ∀ ------------------------------------------------------------------------------
type Semente = {
  id: string;
  o_que: string;
  neg: [string, string];
  pos: [string, string];
  pr?: string;
  refs?: string;
};
const SEMENTES: Semente[] = [
  {
    id: "S3",
    o_que: "checagem 3 — toda unidade de MEDIDO declara a evidencia",
    neg: ["cobertura 87,4% em 12 de 13 rotas", ""],
    pos: ["cobertura 87,4% em 12 de 13 rotas", "medido por: true"],
  },
  {
    id: "S4",
    o_que: "checagem 4 — todo SHA citado tem proveniencia",
    neg: [`cite o head ${FAKE(20)}`, "medido por: true"],
    pos: [`cite o head ${SHA_A}`, "medido por: true"],
    pr: "393",
  },
  {
    id: "S5",
    o_que: "checagem 5 — a invocacao de grep que decide ausencia leva -i",
    neg: ["nao aparece no arquivo", 'medido por: grep -c "naoaparece" CLAUDE.md'],
    pos: ["nao aparece no arquivo", 'medido por: grep -ic "naoaparece" CLAUDE.md'],
  },
  {
    id: "S6",
    o_que: "checagem 6 — o caminho citado existe exatamente onde foi citado",
    neg: ["li o arquivo src/zzz/nao/existe/falso.ts", "medido por: true"],
    pos: ["li o arquivo scripts/mandato-refs.sh", "medido por: true"],
  },
];

// ISENCOES DO LACO -- cada uma com o veredito ESPERADO escrito e o motivo inventariado (§E2.i).
// Sem esta tabela o [F-INV] seria um criterio que nao pode falhar: ele exige uniformidade, e uma
// isencao nao declarada apareceria como "o laco esta errado" em vez de "a isencao existe".
type Esperado = { neg: number; pos: number; motivo: string };
function esperado(s: string, f: Forma): Esperado {
  if (f.frouxa) {
    return {
      neg: 1,
      pos: 1,
      motivo: "forma frouxa: a linha vazia separa a reivindicacao da evidencia — over-rejection DESEJADA (particao ∀ e segura)",
    };
  }
  if (f.nome === "cercado" && s === "S3") {
    return { neg: 0, pos: 0, motivo: "I19: conteudo de cerca e SAIDA por convencao — fronteira 18, dono B-GOV-MANDATO-2" };
  }
  if (f.nome === "cabecalho" && s === "S3") {
    return { neg: 0, pos: 0, motivo: "I7: `###` dentro das secoes e isento da checagem 3 — fronteira 13, dono B-GOV-MANDATO-2" };
  }
  return { neg: 1, pos: 0, motivo: "" };
}

const VEREDITOS = new Map<string, number>();
for (const s of SEMENTES) {
  for (const f of FORMAS) {
    const e = esperado(s.id, f);
    for (const lado of ["neg", "pos"] as const) {
      const [a, b] = lado === "neg" ? s.neg : s.pos;
      const alvo = lado === "neg" ? e.neg : e.pos;
      const rotulo = `[F-INV ${s.id}/${f.nome}/${lado}]`;
      test(`${rotulo} ${s.o_que}${e.motivo ? ` — ISENCAO: ${e.motivo}` : ""}`, () => {
        const r = roda(mandato(`inv-${s.id}-${f.nome}-${lado}`, f.render(a, b)), s.pr, s.refs);
        VEREDITOS.set(`${s.id}|${f.nome}|${lado}`, r.status ?? -1);
        assert.equal(r.status, alvo, `${rotulo} esperava ec=${alvo}\n${r.out}`);
      });
    }
  }
}

test("[F-INV] uniformidade: fora das isencoes, negativa = 1 em TODA forma e positiva = 0 em TODA forma", () => {
  const neg = new Set<number>();
  const pos = new Set<number>();
  const faltando: string[] = [];
  for (const s of SEMENTES) {
    for (const f of FORMAS) {
      const e = esperado(s.id, f);
      for (const lado of ["neg", "pos"] as const) {
        const k = `${s.id}|${f.nome}|${lado}`;
        if (!VEREDITOS.has(k)) {
          faltando.push(k);
          continue;
        }
        if (e.motivo !== "") continue; // isencao declarada: sai do conjunto de uniformidade
        (lado === "neg" ? neg : pos).add(VEREDITOS.get(k) as number);
      }
    }
  }
  assert.deepEqual(faltando, [], "caso do laco nao registrou veredito");
  assert.deepEqual([...neg], [1], "a rejeicao depende da FORMA — e o defeito que este bloco existe para matar");
  assert.deepEqual([...pos], [0], "forma legitima rejeitada (over-rejection): achado, nunca ajuste do laco");
});

// --- S7: o TOKEN RESERVADO -- 19 formas, 8 grafias, e as colagens GERADAS -----------------------
const S7_A = "o approved_head deste ciclo, medido por: true";
const S7_B = `vale \`${SHA_A}\`, medido por: true`;
// A carga tem token nos DOIS lados e o SHA esta na proveniencia do shim (REFS_LIDO_A): a
// checagem 3 e a 4 ficam satisfeitas, e so a 7 pode rejeitar. Sem isso o caso era uma sonda
// FRACA -- medido: com `approved_head` seco, 5 das 19 formas caiam pela checagem 3 e as
// outras 14 pela checagem 4, e nenhuma delas mudaria de cor se a checagem 7 nao mudasse.
for (const f of FORMAS) {
  test(`[F-INV S7/${f.nome}] o token reservado fora da colagem REJEITA em toda forma, mesmo com a ferramenta em LIDO`, () => {
    const r = roda(mandato(`inv-S7-${f.nome}`, f.render(S7_A, S7_B)), "393", REFS_LIDO_A);
    assert.equal(r.status, 1, `a forma ${f.nome} escapou do token reservado\n${r.out}`);
    // As DUAS partes da mensagem contratada. Com a alternancia, "fora da colagem" sozinho
    // bastava -- e a checagem 7 de HOJE ja imprime a palavra `approved_head` na mensagem dela
    // ("o mandato rotula X como approved_head, mas a ferramenta diz AUSENTE", medido), logo uma
    // sonda frouxa aqui corria o risco de casar com a checagem VELHA.
    assert.match(r.out, /token reservado/i, `a forma ${f.nome} caiu por OUTRA checagem\n${r.out}`);
    assert.match(r.out, /fora da colagem/i, `a forma ${f.nome} caiu por OUTRA checagem\n${r.out}`);
  });
}

const GRAFIAS: Array<[string, string[]]> = [
  ["hifen", ["- o approved-head deste bloco, medido por: true"]],
  ["camel", ["- o approvedHead deste bloco, medido por: true"]],
  ["maiuscula-espaco", ["- o APPROVED HEAD deste bloco, medido por: true"]],
  ["dentro-de-cerca", ["- contexto, medido por: true", "  ```", "  approved_head: xyz", "  ```"]],
  ["inline-code", ["- o `approved_head` deste bloco, medido por: true"]],
  ["celula-de-tabela", ["| campo | medido por: |", "|---|---|", "| approved_head | true |"]],
  ["partido-em-2-linhas", ["- o approved_", "  head deste bloco, medido por: true"]],
  ["partido-em-3-linhas", ["- contexto, medido por: true", "  ```", "  appro", "  ved_", "  head:", "  ```"]],
];
for (const [nome, linhas] of GRAFIAS) {
  test(`[F-7b/${nome}] grafia do token reservado: REJEITA — ⇄ janela de 2 linhas deixa o partido-em-3 passar`, () => {
    const r = roda(mandato(`g-${nome}`, linhas), "393", REFS_ND);
    assert.equal(r.status, 1, `a grafia ${nome} escapou\n${r.out}`);
    assert.match(r.out, /token reservado/i, `${nome} caiu por outra checagem\n${r.out}`);
    assert.match(r.out, /fora da colagem/i, `${nome} caiu por outra checagem\n${r.out}`);
  });
}

test("[F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: 3 PASTE, 0 rejeicao, 0 AVISO de ausencia", () => {
  const corpo: string[] = [];
  for (const n of ["701", "702", "777"]) corpo.push(UNIDADE_COLAGEM(n), ...colagem(n), "");
  const r = roda(mandato("p-3prs", corpo), "393", REFS_COMPLETO);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.doesNotMatch(r.out, /sem colagem/i, "com 3 colagens verificadas nao cabe o AVISO de ausencia");
});

test("[F-7c-1pr] uma colagem so, gerada do shim: PASTE, 0 rejeicao — ⇄ isentar por paragrafo em vez de por bloco", () => {
  const r = roda(mandato("p-1pr", [UNIDADE_COLAGEM("777"), ...colagem("777")]), "393", REFS_COMPLETO);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  // SONDA FORTALECIDA: "0 rejeicoes" tambem seria o resultado de uma checagem 7 que simplesmente
  // nao existisse. O que distingue "a colagem foi RECONHECIDA" de "ninguem olhou" e a ausencia do
  // AVISO de mandato sem colagem (E2.b: "Sem colagem no mandato -> AVISO", fronteira 16).
  assert.doesNotMatch(r.out, /sem colagem/i, "a colagem foi verificada — nao cabe o AVISO de ausencia");
});

test("[F-4d] SHA de OUTRO PR citado em prosa COM o bloco dele presente: aceito por proveniencia — ⇄ chk4 sem a uniao das colagens", () => {
  const alheio = PR_SHA("702", 0);
  const com = roda(
    mandato("p-4d-com", [
      `- o head do #702 e \`${alheio}\`, medido por: bash scripts/mandato-refs.sh 702`,
      UNIDADE_COLAGEM("702"),
      ...colagem("702"),
    ]),
    "393",
    REFS_COMPLETO,
  );
  assert.equal(com.rejeicoes, 0, com.out);
  // controle negativo NA MESMA execucao: sem o bloco, o mesmo SHA nao tem proveniencia.
  const sem = roda(
    mandato("p-4d-sem", [`- o head do #702 e \`${alheio}\`, medido por: true`]),
    "393",
    REFS_COMPLETO,
  );
  assert.equal(sem.status, 1, sem.out);
  assert.match(sem.out, new RegExp(alheio));
});

test("[F-7d/acima] afirmacao fabricada ACIMA da colagem: REJ so a de cima — ⇄ isencao por paragrafo", () => {
  const r = roda(
    mandato("p-abuso-acima", [
      `- approved_head: \`${PR_SHA("393", 0)}\`, medido por: true`,
      UNIDADE_COLAGEM("701"),
      ...colagem("701"),
    ]),
    "393",
    REFS_COMPLETO,
  );
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /token reservado/i, r.out);
  assert.match(r.out, /fora da colagem/i, r.out);
  assert.match(r.out, /l\.3\b/, "a linha da afirmacao fabricada tem de ser nomeada");
});

test("[F-7d/abaixo] afirmacao fabricada ABAIXO da colagem: REJ — o abuso A-2 do critico, do outro lado", () => {
  const r = roda(
    mandato("p-abuso-abaixo", [
      UNIDADE_COLAGEM("701"),
      ...colagem("701"),
      "",
      `- approved_head: \`${PR_SHA("393", 0)}\`, medido por: true`,
    ]),
    "393",
    REFS_COMPLETO,
  );
  assert.equal(r.status, 1, r.out);
  // SONDA FORTALECIDA (2a instancia): a alternancia aceitava METADE do contrato. A mensagem
  // contratada e uma so -- "token reservado approved_head fora da colagem" (proto reserved.awk /
  // reserved3.awk, plano §0.6(d) e §0.6(f)) -- e as duas partes sao exigidas.
  assert.match(r.out, /token reservado/i, r.out);
  assert.match(r.out, /fora da colagem/i, r.out);
});

test("[F-7d/dentro] linha inserida DENTRO do bloco: o bloco deixa de bater e vira DESATUALIZADO", () => {
  const r = roda(
    mandato("p-abuso-dentro", [
      UNIDADE_COLAGEM("701"),
      ...colagem("701", "  ", (l) => [...l.slice(0, 5), `e o approved_head deste bloco e ${FAKE(33)}`, ...l.slice(5)]),
    ]),
    "393",
    REFS_COMPLETO,
  );
  assert.equal(r.status, 1, r.out);
  // SONDA FORTALECIDA: os quatro ramos da alternancia sao pedacos da MESMA mensagem contratada
  // ("bloco '# refs do PR #N' NAO bate com a saida atual de mandato-refs.sh N (parcial, editado ou
  // DESATUALIZADO: o head andou?)" — E2.b). Exigir um deles aceitava a mensagem pela metade.
  assert.match(r.out, /NAO bate com a saida atual/i, r.out);
  assert.match(r.out, /DESATUALIZADO/i, r.out);
  assert.match(r.out, /#701/, "o bloco que deixou de bater tem de ser nomeado");
});

test("[F-7d/sha-trocado] UM SHA trocado no bloco: so AQUELE bloco cai — ⇄ prefixo em vez de igualdade", () => {
  const corpo: string[] = [];
  corpo.push(UNIDADE_COLAGEM("701"), ...colagem("701", "  ", (l) => l.map((x) => x.replace(PR_SHA("701", 0), FAKE(34)))), "");
  corpo.push(UNIDADE_COLAGEM("702"), ...colagem("702"), "");
  const r = roda(mandato("p-701-velha", corpo), "393", REFS_COMPLETO);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /#701/, "a causa tem de nomear o bloco que caiu");
  assert.doesNotMatch(r.out, /702.*(NAO bate|DESATUALIZADO|parcial|editado)/i, "o bloco intacto do #702 nao pode cair junto");
});

test("[F-7d/desordem] duas linhas TROCADAS de lugar no bloco: a ordem faz parte da igualdade", () => {
  const r = roda(
    mandato("p-desordem", [
      UNIDADE_COLAGEM("701"),
      ...colagem("701", "  ", (l) => {
        const c = [...l];
        const t = c[4] as string;
        c[4] = c[5] as string;
        c[5] = t;
        return c;
      }),
    ]),
    "393",
    REFS_COMPLETO,
  );
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /NAO bate com a saida atual/i, r.out);
  assert.match(r.out, /DESATUALIZADO/i, r.out);
});

test("[F-7g] bloco SEM a 1a linha `# refs do PR #N`: nao e colagem, e os tokens dele REJEITAM", () => {
  const r = roda(
    mandato("p-sem-cabecalho", [UNIDADE_COLAGEM("777"), ...colagem("777", "  ", (l) => l.slice(1))]),
    "393",
    REFS_COMPLETO,
  );
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /token reservado/i, r.out);
  assert.match(r.out, /fora da colagem/i, r.out);
});

test("[F-7h] refs MORTO para um N: REJ nomeando #666, e nunca 'colagem falsa'", () => {
  const bloco = colagem("701");
  const corpo = [UNIDADE_COLAGEM("701"), ...bloco.map((l) => l.replace("#701", "#666"))];
  const r = roda(mandato("p-refs-morto", corpo), "393", REFS_COMPLETO);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /666/, "a causa e a indisponibilidade daquele PR, nomeada");
  assert.doesNotMatch(r.out, /falsa/i);
});

test("[F-7i] o MESMO bloco duas vezes: 2 PASTE, 0 rejeicao", () => {
  const b = colagem("777");
  const r = roda(
    mandato("p-2x", [UNIDADE_COLAGEM("777"), ...b, "", UNIDADE_COLAGEM("777"), ...b]),
    "393",
    REFS_COMPLETO,
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.doesNotMatch(r.out, /sem colagem/i, "dois blocos verificados — nao cabe o AVISO de ausencia");
  // o bloco repetido nao pode virar "DESATUALIZADO": a 2a ocorrencia bate com a ferramenta igual.
  assert.doesNotMatch(r.out, /DESATUALIZADO/i, r.out);
});

test("[F-7e] token fora de bloco e SEM o numero do PR no argumento: REJ (nada pode ser conferido)", () => {
  const r = roda(mandato("p-sem-pr-token", [`- approved_head: \`${SHA_A}\` medido por: true`]));
  assert.equal(r.status, 1, r.out);
  // SONDA FORTALECIDA (2a instancia): medido, esta fixture ja cai no ciclo 2 — mas por OUTRA
  // checagem ("o mandato cita SHA mas nao recebeu o numero do PR"), porque ela traz um SHA junto.
  // Ou seja, ela ficaria verde mesmo que o token reservado nao existisse. A variante abaixo tira o
  // SHA: sem SHA nenhum, a unica coisa que pode cobrar a linha e a regra do TOKEN. Medido no ciclo
  // 2: PRE-VOO OK (ec=0) — logo este par nasce vermelho e discrimina a checagem 7 de verdade.
  const semSha = roda(mandato("p-sem-pr-token-sem-sha", ["- o approved_head deste bloco ainda nao existe, medido por: true"]));
  assert.equal(semSha.status, 1, `o nome do campo e da FERRAMENTA: o autor nao o escreve\n${semSha.out}`);
  assert.match(semSha.out, /token reservado/i, semSha.out);
});

test("[F-7f] sinonimo em prosa: OK DE PROPOSITO — fronteira 11, dono B-GOV-MANDATO-2 (nao ha remedio form-free)", () => {
  const r = roda(
    mandato("p-sinonimo", [`- o head que a junta aprovou e \`${SHA_A}\`, medido por: true`]),
    "393",
    REFS_LIDO_A,
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

// --- F-7a: os fixtures da RODADA 1 do critico, VERBATIM -----------------------------------------
// Cinco escapes de fronteira de paragrafo + as cinco formas de paragrafo unico. No proto v1 do
// planejador os cinco escapes deram `<<< NADA >>>` (5/5) e o abuso da colagem ABSOLVEU um SHA
// fabricado. Aqui entram como corpo de `## MEDIDO`, com o veredito v3 escrito em cada um.
const AH_CRITICO = "6852cd8400000000000000000000000000000000";
const HEAD_CRITICO = "7e42f338aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
// Shim com a proveniencia dos DOIS SHAs do critico: sem ele a checagem 4 rejeitava os dez
// fixtures e o caso ficava verde com a checagem 7 intacta (sonda fraca, classe A6).
const REFS_CRITICO = shim(
  "refs-critico.sh",
  `#!/usr/bin/env bash
if [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n%s\\n' "${HEAD_CRITICO}" "${AH_CRITICO}"; exit 3; fi
printf 'approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao)\\n'
exit 3
`,
);
const FIXTURES_CRITICO_R1: Array<[string, string[]]> = [
  ["f-bullet", [`- approved_head: \`${AH_CRITICO}\` medido por: true`]],
  ["f-heading", [`### approved_head \`${AH_CRITICO}\``]],
  ["f-prosa", [`o approved_head deste bloco e \`${AH_CRITICO}\`, medido por: true`]],
  ["f-quebra", ["- o approved_head do ciclo 1 e:", `  \`${AH_CRITICO}\` medido por: true`]],
  ["f-tabela", ["| campo | valor | evid |", "|---|---|---|", `| approved_head | \`${AH_CRITICO}\` | true |`]],
  ["x-lista-frouxa", ["- approved_head deste ciclo:", "", `  \`${AH_CRITICO}\` medido por: true`]],
  ["x-details", ["<details>", "<summary>approved_head do ciclo 2</summary>", "", `\`${AH_CRITICO}\``, "", "</details>"]],
  ["x-definicao-frouxa", ["approved_head", "", `: \`${AH_CRITICO}\` medido por: true`]],
  ["x-citacao-apos", ["- approved_head (medido por: true)", "", `> \`${AH_CRITICO}\``]],
  ["x-cerca-apos", ["- approved_head deste ciclo, medido por: true", "", "```", AH_CRITICO, "```"]],
];
for (const [nome, linhas] of FIXTURES_CRITICO_R1) {
  test(`[F-7a/${nome}] fixture VERBATIM da rodada 1 do critico: REJ (no proto v1 eram 5/5 <<< NADA >>>)`, () => {
    const r = roda(mandato(`crit1-${nome}`, linhas), "393", REFS_CRITICO);
    assert.equal(r.status, 1, `${nome} escapou\n${r.out}`);
    assert.match(
      r.out,
      /token reservado|fora da colagem/i,
      `${nome} caiu por OUTRA checagem — com o SHA na proveniencia, so a 7 pode rejeitar\n${r.out}`,
    );
  });
}

// --- F-1 / F-2 / F-8: o ORACULO UNICO de secao e cerca ------------------------------------------
test("[F-1c] `## HIPOTESE` engolido por cerca BALANCEADA (fixture m3 do critico, verbatim): REJ nomeando a linha engolida", () => {
  const r = roda(
    verbatim("m3-cerca-engole", [
      "# Mandato",
      "",
      "## MEDIDO",
      "",
      "- suite 3103/3105 verde, medido por: npm test",
      "```",
      "saida colada",
      "## HIPOTESE",
      "- o modulo X quebra sob concorrencia",
      "```",
    ]),
  );
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /falta a secao '## HIPOTESE'/, r.out);
  assert.match(r.out, /DENTRO de cerca/i, "a mensagem tem de nomear a ocorrencia engolida — e o ∃ que o grep -q enxerga e a maquina nao");
});

test("[F-1c-controle] a fixture do [F-1c] sem a cerca E com 'derruba com:' na HIPOTESE (difere do m3-controle do critico, que nao o tem): PRE-VOO OK", () => {
  const r = roda(
    verbatim("m3-controle-sem-cerca", [
      "# Mandato",
      "",
      "## MEDIDO",
      "",
      "- suite 3103/3105 verde, medido por: npm test",
      "",
      "## HIPOTESE",
      "- o modulo X quebra sob concorrencia. derruba com: true",
    ]),
  );
  assert.equal(r.status, 0, r.out);
});

test("[F-1d] `## MEDIDO` engolido por cerca: REJ 'falta a secao ## MEDIDO' (so a falta; o 'DENTRO de cerca' e asserido pelo [F-1e-linha]) — ⇄ manter o `grep -q` na checagem 1", () => {
  const r = roda(
    verbatim("m3-medido-engolido", [
      "```",
      "## MEDIDO",
      "- suite 3103/3105 verde, medido por: npm test",
      "```",
      "",
      "## HIPOTESE",
      "",
      "- h. derruba com: true",
    ]),
  );
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /falta a secao '## MEDIDO'/, r.out);
});

test("[F-1e] `## HIPOTESE` presente e VAZIA: OK, com AVISO de secao sem unidades", () => {
  const r = roda(bruto("f-hip-vazia", ["## MEDIDO", "", "- x, medido por: true", "", "## HIPOTESE", ""]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /AVISO[^\n]*sem unidades/, "secao vazia e estado previsto: AVISO, nunca silencio");
});

test("[F-2a] `>` e `###` ANTES de `## MEDIDO`: conteudo fora das secoes, REJ — ⇄ awk proprio da checagem 2", () => {
  const r = roda(
    bruto("f-fora-citacao-h3", [
      "> suite 3103/3105 verde e CI 14/14",
      "### suite 3103/3105 verde",
      "",
      "## MEDIDO",
      "",
      "- x, medido por: true",
      "",
      "## HIPOTESE",
      "",
      "- y. derruba com: true",
    ]),
  );
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /fora de MEDIDO\/HIPOTESE/);
});

test("[F-2b] `# Titulo` fora das secoes: OK (I8) — ⇄ tirar a isencao do titulo quebra 12 fixtures legitimas", () => {
  const r = roda(
    bruto("f-titulo", ["# Mandato do bloco X", "", "## MEDIDO", "", "- x, medido por: true", "", "## HIPOTESE", "", "- y. derruba com: true"]),
  );
  assert.equal(r.status, 0, r.out);
});

test("[F-2c] cerca ABERTA antes de `## MEDIDO`: REJ — o oraculo unico ve conteudo fora, nao uma secao", () => {
  const r = roda(
    bruto("f-cerca-antes", ["```", "saida solta", "", "## MEDIDO", "", "- x, medido por: true", "", "## HIPOTESE", "", "- y. derruba com: true"]),
  );
  assert.equal(r.status, 1, r.out);
  // SONDA FORTALECIDA (2a instancia) — este caso NASCIA VERDE e nao provava nada.
  // O 1o ramo da alternancia anterior (`fora de MEDIDO/HIPOTESE`) e EXATAMENTE a mensagem do
  // artefato de HOJE. Medido, ciclo 2, sobre esta fixture: ec=1, rej=1,
  //   "REJEITADO  linha(s) de conteudo fora de MEDIDO/HIPOTESE:  1: ```  2: saida solta".
  // A propriedade do oraculo unico (E2.a, M0/M1) e outra: a cerca abre em l.1 e NUNCA fecha, logo
  // `## MEDIDO` e `## HIPOTESE` estao DENTRO dela, nao ha secao nenhuma, e o documento nao sai
  // "REJ nomeando a abertura". O ciclo 2 nao tem estado de saida para isso (medido: uma cerca
  // aberta sozinha da PRE-VOO OK) — e por isso este caso agora nasce VERMELHO.
  assert.match(r.out, /cerca aberta/i, r.out);
});

const UNI_OK = ["- suite 3058/3060, medido por: npm test"];
test("[F-8a] cerca aberta no fim do arquivo: REJ nomeando a ABERTURA — o estado sem saida do ciclo 2", () => {
  const r = roda(mandato("f8a", [...UNI_OK, "```", "saida que nunca fecha", "", "- CI 14/14 sem evidencia nenhuma"]));
  assert.equal(r.status, 1, r.out);
  // `/cerca/i` sozinho casaria com qualquer mensagem que cite a palavra (inclusive a isencao
  // I19, "cerca = saida"). O contrato de M1 e "REJ nomeando a ABERTURA": mensagem + linha.
  assert.match(r.out, /cerca aberta/i, r.out);
  assert.match(r.out, /l\.\d/, "a abertura tem de ser nomeada por numero de linha");
});

test("[F-8b] cerca `~~~` aberta no fim: REJ (CommonMark: fecha so com o MESMO caractere)", () => {
  const r = roda(mandato("f8b", [...UNI_OK, "~~~", "saida que nunca fecha"]));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /cerca aberta/i, r.out);
});

test("[F-8c] paridade invertida: ``` colada DENTRO de cerca de 3 crases deixa a cerca aberta — REJ", () => {
  const r = roda(mandato("f8c", [...UNI_OK, "  ```", "  saida com cerca colada dentro:", "  ```", "  # pass 3058", "  ```"]));
  assert.equal(r.status, 1, r.out);
  // `status===1` sozinho aceitava rejeicao por QUALQUER checagem — inclusive a 3, que hoje cobra
  // "  # pass 3058" como unidade sem token quando a contagem de cerca fica impar por outro motivo.
  // A propriedade aqui e a PARIDADE: 3 cercas => a ultima abre e nao fecha.
  assert.match(r.out, /cerca aberta/i, r.out);
});

test("[F-8d] fecho com MENOS crases do que a abertura: nao fecha — REJ", () => {
  const r = roda(mandato("f8d", [...UNI_OK, "  ````", "  saida", "  ```"]));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /cerca aberta/i, r.out);
});

test("[F-8e] os dois contornos honestos: ```` e ~~~ envolvendo ``` colada — PRE-VOO OK nos dois", () => {
  const quatro = roda(mandato("f8e1", [...UNI_OK, "  ````", "  ```", "  # pass 3058", "  ```", "  ````"]));
  assert.equal(quatro.status, 0, quatro.out);
  const til = roda(mandato("f8e2", [...UNI_OK, "  ~~~", "  ```", "  # pass 3058", "  ```", "  ~~~"]));
  assert.equal(til.status, 0, til.out);
});

// --- F-4: tokenizacao -- PARTIR e JUNTAR --------------------------------------------------------
test("[F-4a] `git log <legitimo>..<fabricado>`: o `..` PARTE o token e o fabricado e cobrado", () => {
  const r = roda(mandato("f4a", [`- historico, medido por: git log ${SHA_A}..${FAKE(41)}`]), "393");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, new RegExp(FAKE(41)));
});

test("[F-4b] `.<fabricado>`: o ponto inicial sai da ponta e o SHA e cobrado", () => {
  const r = roda(mandato("f4b", [`- veja .${FAKE(42)}, medido por: true`]), "393");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, new RegExp(FAKE(42)));
});

test("[F-4c] SHA COLADO: `<40 legitimo><40 fabricado>` = 80 hex — corrida > 40 REJEITA (fail-closed)", () => {
  const r = roda(mandato("f4c", [`- head ${SHA_A}${FAKE(43)} medido por: true`]), "393");
  assert.equal(r.status, 1, r.out);
  // SONDA FORTALECIDA: o ramo `80` da alternancia casava com QUALQUER saida que contivesse "80"
  // — inclusive um SHA que por acaso tenha 8 seguido de 0. A propriedade e a corrida hexadecimal
  // de comprimento > 40 (E2.c), e o comprimento e 80: exige-se a mensagem E o numero.
  assert.match(r.out, /corrida hexadecimal/i, r.out);
  assert.match(r.out, /\b80\b/, "a mensagem tem de publicar o comprimento da corrida");
  // controle na MESMA rodada: separados por um espaco, o fabricado cai pela regra normal.
  const sep = roda(mandato("f4c-controle", [`- head ${SHA_A} ${FAKE(43)} medido por: true`]), "393");
  assert.equal(sep.status, 1, sep.out);
  assert.match(sep.out, new RegExp(FAKE(43)));
});

test("[F-4-neg] `_` NAO parte o token (fronteira 10) e UUID/`deadbeef.md` seguem fora: PRE-VOO OK", () => {
  const r = roda(
    mandato("f4neg", [
      `- o arquivo relatorio_${FAKE(44)}.log ficou no scratchpad, medido por: true`,
      "- uuid solto 3ad1b87d-fdbf-41f2-b085-1068e01c5d64, medido por: true",
    ]),
    "393",
  );
  assert.equal(r.status, 0, r.out);
});

// --- F-5: checagem 5 por SEGMENTO ---------------------------------------------------------------
test("[F-5a] `egrep`/`fgrep` sem -i: familia e quem TERMINA em grep, nao uma lista de nomes", () => {
  const r = roda(
    mandato("f5a", ['- nao aparece, medido por: egrep "ausente" f', '- nem aqui, medido por: fgrep "ausente" g']),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
});

test("[F-5b] `sort -ui l && grep \"ausente\" f`: o -ui e de OUTRO segmento — REJ", () => {
  const r = roda(mandato("f5b", ['- nao aparece, medido por: sort -ui lista && grep "ausente" f']));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[F-5c] `rg` sem -i: REJ (a familia ja tinha o rg)", () => {
  const r = roda(mandato("f5c", ['- nao aparece, medido por: rg -c "ausente" f']));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[F-5d] `--ignore-case`: aceita — fecha PARCIALMENTE o item 2 da P-GOV-MANDATO-2-FRONTEIRAS", () => {
  const r = roda(mandato("f5d", ['- nao aparece, medido por: grep -c --ignore-case "ausente" CLAUDE.md']));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[F-5e] `grep -i x f | grep y g`: o 2o segmento nao herda o -i do 1o — REJ", () => {
  const r = roda(mandato("f5e", ['- nao aparece, medido por: grep -i "ausente" f | grep "outro" g']));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[F-5f = F-ISO-2 intra-unidade] `caixa-exata:` na linha 1 NAO absolve o grep da linha 2 (m4 do critico)", () => {
  const r = roda(
    verbatim("m4-caixa-exata-2grep", [
      "# M",
      "",
      "## MEDIDO",
      "",
      "- nenhuma ata usa 'Maioria de 3', medido por: grep -c 'Maioria de 3' atas.md caixa-exata: a string e literal",
      '  e conferi o outro lado, medido por: grep -c "aprovado" atas.md',
      "",
      "## HIPOTESE",
      "",
      "- h, derruba com: x",
    ]),
  );
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /aprovado/, "o 2o grep, sem -i e sem caixa-exata no proprio segmento, tem de cair");
});

test("[F-5g = F-ISO-2 intra-linha] `grep A f caixa-exata: x && grep B g`: isenta o segmento 1, cobra o 2", () => {
  const r = roda(
    mandato("f5g", ['- a, medido por: grep -c NAOAPARECE CLAUDE.md caixa-exata: literal && grep -c "aprovado" atas.md']),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /aprovado/);
  // SONDA FORTALECIDA: com dois segmentos, `rejeicoes===1` nao distingue "isentou o segmento 1"
  // de "isentou o 2" — a mensagem ecoa a linha INTEIRA, logo `/aprovado/` casa nos dois casos.
  // Com TRES segmentos o numero passa a discriminar a direcao do JUNTAR (A13): a isencao cobre
  // exatamente o segmento dela, e os outros DOIS caem. Isentar a linha da 0; escorregar para o
  // segmento seguinte da 1. Medido no ciclo 2: ec=0 (a isencao vale para a unidade inteira).
  const tres = roda(
    mandato("f5g-3seg", ['- a, medido por: grep -c NAOAPARECE CLAUDE.md caixa-exata: literal && grep -c "aprovado" atas.md && grep -c "outro" atas.md']),
  );
  assert.equal(tres.rejeicoes, 2, `a isencao cobre so o segmento dela; os outros dois caem\n${tres.out}`);
});

test("[F-5h] `grep A f && grep B g caixa-exata:`: isenta o segmento 2, cobra o 1 — a isencao nao anda para tras", () => {
  const r = roda(
    mandato("f5h", ['- a, medido por: grep -c "aprovado" atas.md && grep -c NAOAPARECE CLAUDE.md caixa-exata: literal']),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /aprovado/);
  // o mesmo fortalecimento do F-5g, na direcao contraria: a isencao esta no ULTIMO segmento e nao
  // pode andar para tras. Com tres segmentos, os dois da frente caem.
  const tres = roda(
    mandato("f5h-3seg", ['- a, medido por: grep -c "aprovado" atas.md && grep -c "outro" atas.md && grep -c NAOAPARECE CLAUDE.md caixa-exata: literal']),
  );
  assert.equal(tres.rejeicoes, 2, `a isencao do ultimo segmento nao absolve os anteriores\n${tres.out}`);
});

test("[F-ISO-11] PARTIR segmentos so rejeita a mais: `sort -ui l && egrep \"x\" f | grep -i y g` cobra o egrep", () => {
  const r = roda(mandato("fiso11", ['- a, medido por: sort -ui l && egrep "x" f | grep -i "y" g']));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /egrep/, r.out);
});

// --- F-6: existencia exata e as classificacoes inventariadas ------------------------------------
test("[F-6a = reciproco de I3] `(novo)` isenta SO o token imediatamente anterior", () => {
  const r = roda(
    mandato("f6a", ["- `tests/novo.test.ts` (novo) e li `src/zzz/nao/existe/falso.ts`, medido por: true"]),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /falso\.ts/);
  assert.doesNotMatch(r.out, /novo\.test\.ts/, "o token que o `(novo)` declara nao pode cair");
});

test("[F-6c] `<caminho-inexistente>:<caminho-existente>`: so e revisao se o prefixo RESOLVE", () => {
  const r = roda(mandato("f6c", ["- li src/zzz/nao/existe/falso.ts:package.json, medido por: true"]));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /falso\.ts/, r.out);
});

test("[F-6d] `HEAD:package.json` (sem `/`: pela I13 nao e caminho e nao chega a checagem 6): aceita — o ramo `<rev>:<caminho>` e o [F-6i/520]", () => {
  const r = roda(mandato("f6d", ["- li HEAD:package.json, medido por: true"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[F-6e] diretorio inexistente COM barra final: REJ (o caso negativo que faltava — C2'-03)", () => {
  const r = roda(mandato("f6e", ["- li docs/nao/existe/, medido por: true"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[F-6f] as 7 classificacoes do que NAO e caminho: OK de PROPOSITO (I13-I18, fronteiras 3 e 4)", () => {
  const r = roda(
    mandato("f6f", [
      "- li naoexiste-xyz.md, medido por: true",
      "- li src/modules/inexistente, medido por: true",
      "- a razao 9999/8888, medido por: true",
      "- li <placeholder>/x.md, medido por: true",
      "- o log foi para C:/x/y-8899.log, medido por: true",
      "- e para /x/y-8899.log, medido por: true",
      "- a doc esta em https://example.invalid/nao/existe.md, medido por: true",
    ]),
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  // controle NA MESMA rodada: com uma barra, o mesmo nome vira caminho e CAI.
  const c = roda(mandato("f6f-controle", ["- li dir/naoexiste-xyz.md, medido por: true"]));
  assert.equal(c.status, 1, c.out);
  assert.equal(c.rejeicoes, 1, c.out);
});

// --- F-3 / F-AGG: a agregacao LIMITADA POR ESTRUTURA (o achado B-1 do critico) -------------------
test("[F-3h] cabecalho de TABELA com afirmacao: e unidade, e cai — ⇄ `continue` no cabecalho", () => {
  const r = roda(mandato("f3h", ["| suite 3103/3105 e CI 14/14 | valor |", "|---|---|", "| x | npm test |"]));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /3103/, r.out);
});

test("[F-3h-ok] cabecalho que NOMEIA a coluna de evidencia: satisfaz", () => {
  const r = roda(mandato("f3h-ok", ["| afirmacao | medido por: |", "|---|---|", "| CI 14/14 | gh pr checks |"]));
  assert.equal(r.status, 0, r.out);
});

test("[F-3s] SIMETRIA: bullet e celula aceitam `-` como evidencia — o conteudo nao e verificado (fronteira 9)", () => {
  const bullet = roda(mandato("f3s-bullet", ["- cobertura 87,4% em 12 de 13 rotas, medido por: -"]));
  const celula = roda(
    mandato("f3s-celula", ["| afirmacao | medido por: |", "|---|---|", "| cobertura 87,4% em 12 de 13 rotas | - |"]),
  );
  assert.equal(bullet.status, celula.status, "um aperto de um lado so tem de aparecer como divergencia aqui");
  assert.equal(bullet.status, 0, bullet.out);
});

test("[F-AGG-1] 5 afirmacoes INDENTADAS apos o token (m8 do critico, verbatim): >= 1 REJ, NUNCA 0", () => {
  const r = roda(
    verbatim("m8-agrega-indent", [
      "# M",
      "",
      "## MEDIDO",
      "",
      "- suite 3103/3105 verde, medido por: npm test",
      "  a cobertura e 87,4 por cento",
      "  o P95 caiu para 120 ms",
      "  3 rotas perderam autorizacao",
      "  o custo da E4 e 2 horas",
      "  e o guard ficou verde em 30 mutantes",
      "",
      "## HIPOTESE",
      "",
      "- h, derruba com: x",
    ]),
  );
  assert.equal(r.status, 1, r.out);
  assert.ok(r.rejeicoes >= 1, `esperava >= 1 rejeicao, veio ${r.rejeicoes}\n${r.out}`);
  // SONDA FORTALECIDA: `>= 1` sozinho ficaria verde com uma rejeicao de QUALQUER outra checagem
  // (e o m8 tem 5 afirmacoes numericas soltas, farto material para cair por engano). A propriedade
  // e nominal: as indentadas DEPOIS do token abrem unidade nova, e e ELA que cai. Entao a saida
  // tem de nomear a 1a indentada e trazer a mensagem do contorno (E2.g).
  assert.match(r.out, /a cobertura e 87,4/, `a unidade nova depois do token tem de ser nomeada\n${r.out}`);
  assert.match(r.out, /ap[oó]s o comando/i, `a mensagem tem de dizer POR QUE caiu\n${r.out}`);
});

test("[F-AGG-1-controle] as MESMAS 5 em coluna 0 (m8-controle do critico): 5 rejeicoes — o par PARTIR/JUNTAR", () => {
  const r = roda(
    verbatim("m8-controle-nao-indent", [
      "# M",
      "",
      "## MEDIDO",
      "",
      "- suite 3103/3105 verde, medido por: npm test",
      "a cobertura e 87,4 por cento",
      "o P95 caiu para 120 ms",
      "3 rotas perderam autorizacao",
      "o custo da E4 e 2 horas",
      "e o guard ficou verde em 30 mutantes",
      "",
      "## HIPOTESE",
      "",
      "- h, derruba com: x",
    ]),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 5, r.out);
});

test("[F-AGG-2] prosa indentada ANTES do token: OK de PROPOSITO — fronteira 17 (atribuicao, nao veracidade)", () => {
  const r = roda(
    verbatim("m8-legit-prosa-antes", [
      "## MEDIDO",
      "",
      "- a suite passou",
      "  com 3103/3105 e o CI 14/14,",
      "  medido por: npm test",
      "  ```",
      "  # tests 3105",
      "  ```",
      "",
      "## HIPOTESE",
      "",
      "- x. derruba com: true",
    ]),
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[F-AGG-3] saida CERCADA apos o token: OK — e a forma que o cabecalho do script passa a ensinar", () => {
  const r = roda(mandato("fagg3", ["- suite 3058/3060, medido por: npm test", "  ```", "  # tests 3058", "  saida", "  ```"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[F-AGG-4] saida NAO cercada apos o token: REJ, e a mensagem diz o contorno (custo R13 declarado)", () => {
  const r = roda(mandato("fagg4", ["- suite 3058/3060, medido por: npm test", "  # tests 3058", "  ```", "  saida", "  ```"]));
  assert.equal(r.status, 1, r.out);
  // `/cerca/i` casa tambem com "cerca aberta" (M1) — que e outra propriedade. Exige-se a causa
  // ("apos o comando") E o contorno ("vai em cerca"), que sao as duas metades da mensagem de E2.g.
  assert.match(r.out, /ap[oó]s o comando/i, r.out);
  assert.match(r.out, /cerca/i, "a mensagem tem de ensinar o contorno: saida colada vai em cerca");
  assert.match(r.out, /# tests 3058/, "a linha nao cercada tem de ser a nomeada");
});

test("[F-AGG-5 = reciproco de I12] celula de evidencia NAO absolve as indentadas (m5c do critico, verbatim)", () => {
  const r = roda(
    verbatim("m5c-uok-3-afirmacoes", [
      "# M",
      "",
      "## MEDIDO",
      "",
      "| afirmacao | medido por: |",
      "|---|---|",
      "| suite 3103/3105 | npm test |",
      "   a cobertura caiu para 61 por cento",
      "   e o P95 subiu para 1400 ms",
      "   e 3 rotas perderam autorizacao",
      "",
      "## HIPOTESE",
      "",
      "- h, derruba com: x",
    ]),
  );
  assert.equal(r.status, 1, r.out);
  assert.ok(r.rejeicoes >= 1, `esperava >= 1, veio ${r.rejeicoes}\n${r.out}`);
  // SONDA FORTALECIDA: medido contra o ciclo 2 esta fixture da ec=0/rej=0, entao `>= 1` ja nasce
  // vermelho — mas ficaria verde se a rejeicao viesse da LINHA DE TABELA (a celula esta cheia:
  // `npm test`) em vez das indentadas. O reciproco de I12 e justamente que a celula cheia satisfaz
  // SO a linha dela; entao a saida tem de nomear a indentada, e nao pode cobrar a linha da tabela.
  assert.match(r.out, /cobertura caiu para 61/, `a indentada e que abre unidade nova\n${r.out}`);
  assert.doesNotMatch(
    r.out,
    /l\.7:/,
    "a linha de tabela tem a celula de evidencia cheia — cobra-la seria over-rejection (I12)",
  );
});

test("[F-AGG-6] cerca numa unidade SEM token: REJ (saida colada sem comando) — I19 do outro lado", () => {
  const r = roda(mandato("fagg6", ["- suite 3058/3060 verde", "  ```", "  # tests 3058", "  ```"]));
  assert.equal(r.status, 1, r.out);
  // SONDA FORTALECIDA (2a instancia) — este caso NASCIA VERDE e nao provava nada.
  // Medido contra o artefato do ciclo 2: ec=1, rej=1, "REJEITADO  unidade de MEDIDO sem
  // 'medido por: <comando>' — l.3: - suite 3058/3060 verde". Ou seja: ele ja rejeitava, mas pela
  // checagem 3 VELHA (unidade sem token), nao por haver cerca sem comando. Tirar numeros da
  // unidade nao resolve — medido tambem: "- a suite ficou verde" + cerca da a MESMA rejeicao
  // velha, porque hoje TODA unidade precisa de token, com ou sem numero. Logo o unico
  // discriminador honesto e a mensagem contratada de I19: "saida colada sem comando" (E2.g).
  assert.match(r.out, /sa[ií]da colada sem comando/i, r.out);
});

test("[F-AGG-7] 3 afirmacoes DENTRO de cerca sob token (m8-agrega-cerca do critico): OK de PROPOSITO — fronteira 18", () => {
  const r = roda(
    verbatim("m8-agrega-cerca", [
      "# M",
      "",
      "## MEDIDO",
      "",
      "- suite 3103/3105 verde, medido por: npm test",
      "```",
      "a cobertura e 87,4 por cento",
      "o P95 caiu para 120 ms",
      "3 rotas perderam autorizacao",
      "```",
      "",
      "## HIPOTESE",
      "",
      "- h, derruba com: x",
    ]),
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[F-AGG-8] prosa APOS o token (m5-controle do critico, verbatim): REJ — custo R13, asserido", () => {
  const r = roda(
    verbatim("m5-controle-unidade-normal", [
      "# M",
      "",
      "## MEDIDO",
      "",
      "- suite 3103/3105, medido por: npm test",
      "   e a cobertura caiu para 61 por cento",
      "",
      "## HIPOTESE",
      "",
      "- h, derruba com: x",
    ]),
  );
  assert.equal(r.status, 1, r.out);
  // SONDA FORTALECIDA: `status===1` aceitava rejeicao por qualquer motivo. O custo R13 so esta
  // asserido se a linha de prosa que vem DEPOIS do token for a nomeada, com a causa na mensagem.
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /cobertura caiu para 61/, `a prosa apos o token e que abre unidade nova\n${r.out}`);
  assert.match(r.out, /ap[oó]s o comando/i, r.out);
});

// --- reciprocos e maquinas ----------------------------------------------------------------------
test("[F-ISO-5] o separador `|---|` e isento, mas uma linha que so PARECE separador e unidade", () => {
  const r = roda(
    mandato("fiso5", ["| afirmacao | medido por: |", "|---|---|", "| CI 14/14 | gh pr checks |", "|--- suite 3103/3105 ---|"]),
  );
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /3103/, "a isencao do separador nao pode cobrir uma linha com afirmacao dentro");
  // SONDA FORTALECIDA: este caso ja nascia VERDE (medido: ciclo 2 da ec=1, rej=1, nomeando l.6) e
  // por isso nao discriminava nada do v3. O que o v3 MUDA nesta fixture e o cabecalho de tabela:
  // I6 foi REMOVIDA e o cabecalho vira unidade. Se ele passar a ser cobrado por engano, ou se a
  // celula de evidencia cheia da linha de dados deixar de absolver, a contagem sobe — e so a
  // contagem EXATA pega isso. Uma rejeicao, e e a da linha que so PARECE separador.
  assert.equal(r.rejeicoes, 1, r.out);
  assert.doesNotMatch(r.out, /l\.3:/, "o cabecalho NOMEIA a coluna de evidencia — cobra-lo e over-rejection");
  assert.doesNotMatch(r.out, /14\/14/, "a linha de dados tem a celula cheia (I12) — nao pode cair");
});

test("[F-ISO-7] `###` dentro das secoes isenta a afirmacao: OK DE PROPOSITO — fronteira 13, visivel por grep", () => {
  const r = roda(mandato("fiso7", ["- x, medido por: true", "", "### cobertura 87,4% em 12 de 13 rotas"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[F-ISO-10] PARTIR por linha em branco so cria unidade a mais, e cada uma precisa do seu token", () => {
  const juntas = roda(mandato("fiso10a", ["- CI 14/14 e suite 3058/3060, medido por: npm test"]));
  assert.equal(juntas.status, 0, juntas.out);
  const partidas = roda(mandato("fiso10b", ["- CI 14/14, medido por: gh pr checks", "", "- suite 3058/3060"]));
  assert.equal(partidas.status, 1, partidas.out);
  assert.equal(partidas.rejeicoes, 1, partidas.out);
});

test("[F-SM-3] estado nao previsto da maquina de unidade: indentada SEM unidade aberta vira unidade", () => {
  const r = roda(mandato("fsm3", ["  uma linha indentada sem pai nenhum, com 3058/3060 dentro"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[F-SM-4] estados nao previstos da maquina de TABELA: sem separador, celula vazia e `|` sem cabecalho", () => {
  const semSeparador = roda(mandato("fsm4a", ["| suite 3058/3060 | npm test |"]));
  assert.equal(semSeparador.status, 1, semSeparador.out);
  // sem separador a maquina nao entra em modo tabela: a linha e unidade normal, UMA rejeicao.
  // Se o v3 passar a tratar `|` solto como tabela, a celula `npm test` absolveria e daria 0.
  assert.equal(semSeparador.rejeicoes, 1, semSeparador.out);
  const celulaVazia = roda(
    verbatim("m5b-celula-vazia", [
      "# M",
      "",
      "## MEDIDO",
      "",
      "| afirmacao | medido por: |",
      "|---|---|",
      "| suite 3103/3105 |  |",
      "   e a cobertura caiu para 61 por cento",
      "",
      "## HIPOTESE",
      "",
      "- h, derruba com: x",
    ]),
  );
  assert.equal(celulaVazia.status, 1, celulaVazia.out);
  // SONDA FORTALECIDA (2a instancia) — `>= 1` nascia VERDE e nao discriminava nada.
  // Medido contra o artefato do ciclo 2: ec=1, rej=1 — so a linha da tabela, com a celula de
  // evidencia vazia. A indentada que vem DEPOIS dela era absorvida (a agregacao velha) e saia de
  // graca. No v3 duas regras contratadas incidem sobre esta MESMA fixture: celula vazia => REJ
  // (M4) e "linha de tabela nunca agrega; indentada apos linha abre unidade nova" (M4/I12). Logo
  // sao DUAS rejeicoes, e `>= 1` continuaria verde com a segunda perdida. A contagem exata pega.
  assert.equal(celulaVazia.rejeicoes, 2, `celula vazia (1) + indentada que abre unidade nova (2)\n${celulaVazia.out}`);
  assert.match(celulaVazia.out, /cobertura caiu para 61/, celulaVazia.out);
});

// --- F-EOL: o mesmo veredito em CRLF ------------------------------------------------------------
// SONDA FORTALECIDA (2a instancia): antes o caso so comparava LF com CRLF. Igualdade entre as
// duas pontas fica VERDE quando as duas erram do MESMO jeito — e `s7-neg` era exatamente isso:
// medido, o ciclo 2 devolve ec=0 nas DUAS pontas (a checagem 7 velha aceita o rotulo porque o SHA
// bate com o LIDO do shim), e o caso passava anunciando "mesmo veredito". Agora cada semente
// declara o VEREDITO ESPERADO, e a igualdade LF/CRLF continua sendo cobrada por cima dele.
for (const [nome, corpo, pr, refs, ecEsperado] of [
  ["s3-neg", ["- cobertura 87,4% em 12 de 13 rotas"], undefined, undefined, 1],
  ["s3-pos", ["- cobertura 87,4% em 12 de 13 rotas, medido por: true"], undefined, undefined, 0],
  ["s4-neg", [`- cite o head ${FAKE(20)}, medido por: true`], "393", undefined, 1],
  ["s5-neg", ['- nao aparece, medido por: grep -c "naoaparece" CLAUDE.md'], undefined, undefined, 1],
  ["s6-neg", ["- li src/zzz/nao/existe/falso.ts, medido por: true"], undefined, undefined, 1],
  ["s7-neg", [`- approved_head: \`${SHA_A}\` medido por: true`], "393", "LIDO", 1],
] as Array<[string, string[], string | undefined, string | undefined, number]>) {
  test(`[F-EOL/${nome}] o veredito em CRLF e o MESMO do LF, E e o esperado — \`grep -c $'\\r'\` e cego, so o \`od\` ve`, () => {
    const shimRefs = refs === "LIDO" ? REFS_LIDO_A : REFS_OK;
    const lf = roda(mandato(`eol-lf-${nome}`, corpo), pr, shimRefs);
    const alvoCrLf = mandatoCrLf(`eol-crlf-${nome}`, corpo);
    const bytes = readFileSync(alvoCrLf);
    assert.ok(bytes.includes(0x0d), "a fixture CRLF nasceu sem CR — o caso nao discrimina (classe A3)");
    const crlf = roda(alvoCrLf, pr, shimRefs);
    assert.equal(lf.status, ecEsperado, `o veredito em LF nao e o esperado (ec=${ecEsperado})\n${lf.out}`);
    assert.equal(crlf.status, lf.status, `LF=${lf.status} CRLF=${crlf.status}\n--LF--\n${lf.out}\n--CRLF--\n${crlf.out}`);
    assert.equal(crlf.rejeicoes, lf.rejeicoes, `rejeicoes LF=${lf.rejeicoes} CRLF=${crlf.rejeicoes}\n${crlf.out}`);
  });
}

test("[F-EOL/colagem] a colagem gerada tambem vale em CRLF — a igualdade e apos trim", () => {
  const corpo = [UNIDADE_COLAGEM("777"), ...colagem("777")];
  const lf = roda(mandato("eol-lf-colagem", corpo), "393", REFS_COMPLETO);
  const alvo = mandatoCrLf("eol-crlf-colagem", corpo);
  assert.ok(readFileSync(alvo).includes(0x0d), "a fixture CRLF nasceu sem CR");
  const crlf = roda(alvo, "393", REFS_COMPLETO);
  assert.equal(crlf.status, lf.status, `LF=${lf.status} CRLF=${crlf.status}\n${crlf.out}`);
  assert.equal(lf.status, 0, lf.out);
  // SONDA FORTALECIDA: sem estas duas linhas, o caso passava se as DUAS pontas errassem igual.
  assert.equal(crlf.rejeicoes, 0, `o CR nao pode quebrar a igualdade do bloco (a comparacao e apos trim)\n${crlf.out}`);
  assert.doesNotMatch(crlf.out, /sem colagem/i, "em CRLF a colagem tem de continuar sendo RECONHECIDA");
});

// --- F-EXT: 3 formas que variam a FRONTEIRA e 3 que JUNTAM (o mandato da cadeira C1''' antecipado)
test("[F-EXT/fronteira-1] a unidade atravessa o fim da SECAO: a ultima linha de MEDIDO sem token cai", () => {
  const r = roda(mandato("fext1", ["- x, medido por: true", "", "- suite 3058/3060"], ["- h. derruba com: true"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
});

test("[F-EXT/fronteira-2] a unidade atravessa o EOF: ultima linha do arquivo, sem `\\n` final", () => {
  const alvo = path.join(dir, "fext2.md");
  writeFileSync(alvo, ["## MEDIDO", "", "- x, medido por: true", "", "## HIPOTESE", "", "- h. derruba com: true", "", "## MEDIDO", "", "- suite 3058/3060"].join("\n"), "utf8");
  const r = roda(alvo);
  assert.equal(r.status, 1, r.out);
  // `status===1` aceitaria rejeicao vinda da 1a secao. A propriedade e o EOF: a unidade que fecha
  // o arquivo sem `\n` final tem de ser vista, e ser a UNICA que cai.
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /3058\/3060/, `a unidade do EOF e que cai\n${r.out}`);
});

test("[F-EXT/fronteira-3] cabecalho de secao REPETIDO, com unidade valida em cada trecho: PRE-VOO OK (so o veredito; a unidade do 2o `## MEDIDO` ser cobrada e o [F-EXT/fronteira-2])", () => {
  const r = roda(
    bruto("fext3", ["## MEDIDO", "", "- x, medido por: true", "", "## HIPOTESE", "", "- h. derruba com: true", "", "## MEDIDO", "", "- suite 3058/3060, medido por: true"]),
  );
  assert.equal(r.status, 0, r.out);
});

test("[F-EXT/juntar-1] tabela + indentadas + celula cheia: a linha de tabela NUNCA agrega", () => {
  const r = roda(
    mandato("fext4", ["| afirmacao | medido por: |", "|---|---|", "| CI 14/14 | gh pr checks |", "  cobertura 87,4% em 12 de 13 rotas", "  latencia 340 ms"]),
  );
  assert.equal(r.status, 1, r.out);
  // SONDA FORTALECIDA: as duas indentadas depois da linha de tabela formam UMA unidade nova, sem
  // token — uma rejeicao, e e a delas. Se a celula cheia voltar a absolver o que vem embaixo,
  // a contagem cai para 0; se a linha de dados for cobrada junto, sobe. So a exata discrimina.
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /cobertura 87,4/, `a indentada apos a linha de tabela e que cai\n${r.out}`);
  assert.doesNotMatch(r.out, /14\/14/, "a linha de dados tem a celula de evidencia cheia (I12)");
});

test("[F-EXT/juntar-2] DOIS greps num segmento so, com um `caixa-exata:`: os dois isentos (fronteira 20) com AVISO", () => {
  // SONDA CORRIGIDA E FORTALECIDA (2a instancia). A fixture anterior usava `;`, que e SEPARADOR de
  // segmento — ela media a PARTICAO, nao a fronteira 20 que o titulo anuncia. O titulo prometia uma
  // coisa e o caso media outra; e, medido, o ciclo 2 devolve ec=0 nas duas formas (hoje o
  // `caixa-exata:` isenta a UNIDADE inteira), entao nenhuma das duas discriminava a mudanca.
  // Agora o JUNTAR de verdade: dois `grep` no MESMO segmento, um `caixa-exata:` — os dois isentos,
  // e o AVISO publica a contagem (E2.d / I2 / fronteira 20). Sem o AVISO a isencao fica invisivel.
  const umSegmento = roda(
    mandato("fext5", ["- a, medido por: grep -c NAOAPARECE CLAUDE.md caixa-exata: literal e conferi com grep -c OUTRO CLAUDE.md"]),
  );
  assert.equal(umSegmento.rejeicoes, 0, `fronteira 20: os dois do MESMO segmento sao isentos\n${umSegmento.out}`);
  assert.equal(umSegmento.status, 0, umSegmento.out);
  assert.match(umSegmento.out, /AVISO/, `a isencao de 2 invocacoes tem de ser VISIVEL\n${umSegmento.out}`);
  assert.match(umSegmento.out, /\b2\b/, `o AVISO tem de contar quantas invocacoes isentou\n${umSegmento.out}`);
  // controle de PARTICAO na mesma rodada: com `;` sao dois segmentos, a isencao cobre so o dela.
  const doisSegmentos = roda(
    mandato("fext5b", ["- a, medido por: grep -c NAOAPARECE CLAUDE.md; grep -c OUTRO CLAUDE.md caixa-exata: literal"]),
  );
  assert.equal(doisSegmentos.status, 1, doisSegmentos.out);
  assert.equal(doisSegmentos.rejeicoes, 1, doisSegmentos.out);
});

test("[F-EXT/juntar-3] `## HIPOTESE` dentro de cerca ABERTA: REJ 'cerca aberta' e a secao HIPOTESE citada na saida (o 'DENTRO de cerca' e asserido pelo [F-1c]/[F-1f])", () => {
  const r = roda(
    bruto("fext6", ["## MEDIDO", "", "- x, medido por: true", "", "```", "## HIPOTESE", "", "- h. derruba com: true"]),
  );
  assert.equal(r.status, 1, r.out);
  // SONDA FORTALECIDA (2a instancia): o titulo prometia "e ele e nomeado" e NADA asseria isso.
  // Medido contra o ciclo 2 esta fixture ja da ec=1 — mas por outro motivo: "unidade de MEDIDO sem
  // 'medido por:' — l.5: ```", ou seja, a cerca foi tratada como UNIDADE, nao como cerca aberta.
  // O caso nascia verde provando o contrario do que anuncia. Agora cobra os dois defeitos que o
  // oraculo unico tem de ver: a cerca que nao fecha E a secao engolida por ela.
  assert.match(r.out, /cerca aberta/i, r.out);
  assert.match(r.out, /HIPOTESE/, "a secao engolida pela cerca tem de ser nomeada (M0)");
});

// --- [F-0]: a rota E o artefato -----------------------------------------------------------------
test("[F-0] guarda do guard: zero leitura da FONTE do artefato, e com o `.sh` ausente nada passa", () => {
  const fonte = readFileSync(import.meta.filename, "utf8");
  assert.doesNotMatch(fonte, /readFileSync\(\s*SCRIPT/, "ler a fonte do artefato prende o guard ao texto");
  assert.doesNotMatch(fonte, /readFileSync\([^)]*mandato-preflight\.sh/);
  assert.equal(
    (fonte.match(/"scripts\/mandato-preflight\.sh"/g) ?? []).length,
    1,
    "o caminho do artefato so pode aparecer na string que monta SCRIPT",
  );
  const ausente = spawnSync("bash", [`${SCRIPT}.NAO-EXISTE`, mandato("f0", ["- x, medido por: true"])], {
    encoding: "utf8",
    env: { ...process.env, MANDATO_REFS: REFS_OK },
  });
  assert.notEqual(ausente.status, 0, "sem o artefato a invocacao nao pode terminar em 0");
  assert.doesNotMatch(ausente.stdout ?? "", /PRE-VOO OK/);
  // controle positivo, na MESMA rota
  const presente = roda(mandato("f0-controle", ["- x, medido por: true"]));
  assert.match(presente.out, /PRE-VOO OK/);
});

// =================================================================================================
// CICLO 3 -- §14.18 do plano (Dev-T-6, passo T7). A E4 do pre-voo (rodada A, tripla
// faa408c8/3d875a54/37549262) terminou com 16 NAO-COBERTOS. Treze ganham caso aqui, UM POR PONTO,
// cada um com a fixture que o planejador mediu (pristino x mutante DIFERE); 245, 318 e 336 sao
// EQUIVALENTES (arquivo proprio, do Dev-S-2); 161 e TIMEOUT (§14.15) e nunca entra em `--only`.
// SO ADICOES -- as premissas (b)-(d) do lema do §14.18(3): nenhuma linha acima foi tocada, nenhuma
// declaracao de topo e repetida, e nada roda no carregamento do modulo (os shims novos nascem DENTRO
// dos casos). Cada caso nomeia a linha do artefato (blob faa408c8) que discrimina e o operador da
// ferramenta de mutacao que o deixa vermelho.
// =================================================================================================

/** [F-2d] cerca INTEIRA fora das secoes, antes de `## MEDIDO`: abre l.1, conteudo l.2, VAZIA l.3, fecha l.4. */
function cercaForaDasSecoes(nome: string): string {
  return bruto(nome, [
    "```",
    "conteudo",
    "",
    "```",
    "",
    "## MEDIDO",
    "",
    "- x, medido por: true",
    "",
    "## HIPOTESE",
    "",
    "- y. derruba com: true",
  ]);
}
/** A listagem da checagem 2 (recuo de 11 colunas + `N: texto`), como pares [linha, texto]. */
function foraListadas(out: string): Array<[number, string]> {
  const pares: Array<[number, string]> = [];
  for (const m of out.replace(/\r/g, "").matchAll(/^ {11}(\d+): (.*)$/gm)) pares.push([Number(m[1]), m[2] ?? ""]);
  return pares;
}
/** Precondicao de fixture: o que ha em `RAIZ/<rel>` -- "arquivo", ou o codigo do erro (ENOENT, EISDIR). */
function tipoNaRaiz(rel: string): string {
  try {
    readFileSync(path.join(RAIZ, rel));
    return "arquivo";
  } catch (e) {
    return String((e as { code?: unknown }).code ?? "sem-codigo");
  }
}

// --- [F-2d] cerca fora das secoes: a listagem de conteudo fora nomeia abertura, conteudo e fechamento,
// e NAO a linha vazia. Um caso por ponto do artefato; o REJ e o mesmo nos 4 mutantes -- so a LISTAGEM
// muda, e e ela que cada caso cobra.
test("[F-2d/165] cerca fora das secoes: a ABERTURA (l.1) e listada como conteudo fora — ⇄ M10 na l.165 do artefato", () => {
  const r = roda(cercaForaDasSecoes("t6-2d-165"));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /linha\(s\) de conteudo fora de MEDIDO\/HIPOTESE:/, r.out);
  assert.deepEqual(
    foraListadas(r.out).filter(([n]) => n === 1),
    [[1, "```"]],
    `a linha que ABRE a cerca fora das secoes e conteudo fora, e tem de ser nomeada\n${r.out}`,
  );
});

test("[F-2d/182] cerca fora das secoes: o FECHAMENTO (l.4) e listado como conteudo fora — ⇄ M10 na l.182 do artefato", () => {
  const r = roda(cercaForaDasSecoes("t6-2d-182"));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /linha\(s\) de conteudo fora de MEDIDO\/HIPOTESE:/, r.out);
  assert.deepEqual(
    foraListadas(r.out).filter(([n]) => n === 4),
    [[4, "```"]],
    `a linha que FECHA a cerca fora das secoes e conteudo fora, e tem de ser nomeada\n${r.out}`,
  );
});

test("[F-2d/189] cerca fora das secoes: a linha VAZIA do corpo (l.3) NAO e listada; a de conteudo (l.2) e — ⇄ M4 na l.189 do artefato", () => {
  const r = roda(cercaForaDasSecoes("t6-2d-189"));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  const listadas = foraListadas(r.out);
  assert.deepEqual(listadas.filter(([n]) => n === 3), [], `linha vazia nao e conteudo: lista-la troca a causa\n${r.out}`);
  assert.deepEqual(listadas.filter(([n]) => n === 2), [[2, "conteudo"]], `o conteudo da cerca tem de ser o listado\n${r.out}`);
});

test("[F-2d/190] cerca fora das secoes: o CONTEUDO do corpo (l.2) e listado como conteudo fora — ⇄ M10 na l.190 do artefato", () => {
  const r = roda(cercaForaDasSecoes("t6-2d-190"));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /linha\(s\) de conteudo fora de MEDIDO\/HIPOTESE:/, r.out);
  assert.deepEqual(
    foraListadas(r.out).filter(([n]) => n === 2),
    [[2, "conteudo"]],
    `a linha de conteudo DENTRO da cerca fora das secoes tem de ser nomeada\n${r.out}`,
  );
});

// --- [F-1e-linha] / [F-1f]: secao engolida por cerca, com OUTRA linha antes dela na cerca -- a checagem 1
// nomeia a linha EXATA do cabecalho engolido, nao a primeira linha da cerca. O rotulo do §14.18 para o
// caso de MEDIDO e `[F-1e]`, mas `[F-1e]` ja nomeia o caso de secao VAZIA (acima, ciclo 3 -- E3); este
// ganha o sufixo `-linha` para que nenhum rotulo nomeie dois casos.
test("[F-1e-linha] `## MEDIDO` engolido por cerca com outra linha antes dele: a checagem 1 nomeia a l.7 EXATA — ⇄ M4 na l.187 do artefato", () => {
  const r = roda(
    verbatim("t6-1e-medido-engolido", ["# Mandato", "", "## HIPOTESE", "- h. derruba com: true", "```", "linha", "## MEDIDO", "outra", "```"]),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(
    r.out,
    /falta a secao '## MEDIDO'[^\n]*DENTRO de cerca, l\.7(?!\d)/,
    `o cabecalho engolido esta na l.7; a l.6 e a outra linha da cerca\n${r.out}`,
  );
});

test("[F-1f] `## HIPOTESE` engolido por cerca com outra linha antes dele: a checagem 1 nomeia a l.7 EXATA — ⇄ M4 na l.188 do artefato", () => {
  const r = roda(
    verbatim("t6-1f-hipotese-engolido", ["# Mandato", "", "## MEDIDO", "- x, medido por: true", "```", "linha", "## HIPOTESE", "outra", "```"]),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(
    r.out,
    /falta a secao '## HIPOTESE'[^\n]*DENTRO de cerca, l\.7(?!\d)/,
    `o cabecalho engolido esta na l.7; a l.6 e a outra linha da cerca\n${r.out}`,
  );
});

// --- [F-AGG-9] a cerca como PRIMEIRA coisa da secao abre a unidade (I19 + checagem 3). Os outros casos de
// I19 tem uma linha de prosa antes da cerca, e ai a unidade ja estava aberta quando a cerca chegou.
test("[F-AGG-9] cerca como PRIMEIRA coisa de MEDIDO, sem `medido por:`: exatamente 2 REJ (I19 + unidade sem token), ec=1 — ⇄ M10 na l.393 do artefato", () => {
  const r = roda(mandato("t6-agg9-cerca-primeira", ["```", "saida colada", "```"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
  assert.match(r.out, /unidade de MEDIDO sem 'medido por: <comando>'[^\n]*l\.3:/, `a unidade que a cerca abre (l.3) cai pela checagem 3\n${r.out}`);
  assert.match(r.out, /saida colada sem comando[^\n]*l\.3:/, `e pela I19: cerca numa unidade sem comando\n${r.out}`);
});

// --- [F-7j] / [F-7k]: a colagem da ferramenta, por PR, com o refs consultado UMA vez por N ------------
test("[F-7j] o refs e consultado UMA vez por PR por documento: shim com ESTADO, 2 blocos iguais -> 2 COLAGEM, 0 REJ — ⇄ M3 na l.249 do artefato", () => {
  // Shim com ESTADO: a 1a chamada devolve o estado A, as seguintes o estado B (o head "andou"). O
  // contador vive no `dir` deste guard; o caminho vai com `/` porque e o bash que o le e escreve.
  // O corpo vai como ARRAY de linhas (nenhuma linha nova em coluna 0 fora de test(/function).
  const contador = path.join(dir, "bin", "refs-estado.cont").replace(/\\/g, "/");
  const estadoA = "c".repeat(40);
  const estadoB = "d".repeat(40);
  const refs = shim(
    "refs-estado.sh",
    [
      "#!/usr/bin/env bash",
      "set -u",
      `C="${contador}"`,
      `k=$(cat "$C" 2>/dev/null || echo 0); k=$((k+1)); printf '%s' "$k" > "$C"`,
      `if [ "$k" -eq 1 ]; then H="${estadoA}"; else H="${estadoB}"; fi`,
      `if [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n' "$H"; exit 0; fi`,
      `printf '# refs do PR #%s — GERADO por scripts/mandato-refs.sh, para COLAR no mandato\\n' "\${1:-}"`,
      `printf '# gerado em: %s-%s · repo: t/t\\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$$"`,
      "printf '\\n'",
      "printf 'ramo:            fix/x\\n'",
      `printf 'head do PR:      %s\\n' "$H"`,
      "exit 0",
      "",
    ].join("\n"),
  );
  writeFileSync(contador, "0", "utf8");
  const corpo = saidaDoRefs("712", refs); // a colagem e GERADA da 1a chamada: estado A
  assert.ok(corpo.some((l) => l.includes(estadoA)), `a colagem nao nasceu do estado A\n${corpo.join("\n")}`);
  const bloco = ["  ```", ...corpo.map((l) => (l === "" ? "" : `  ${l}`)), "  ```"];
  writeFileSync(contador, "0", "utf8"); // a 1a chamada do PRE-VOO ve o MESMO estado A
  const r = roda(mandato("t6-7j-paste2", [UNIDADE_COLAGEM("712"), ...bloco, "", UNIDADE_COLAGEM("712"), ...bloco]), undefined, refs);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.equal((r.out.match(/^COLAGEM {4}/gm) ?? []).length, 2, `os DOIS blocos conferem com a MESMA consulta\n${r.out}`);
  assert.doesNotMatch(r.out, /DESATUALIZADO/, r.out);
  assert.equal(readFileSync(contador, "utf8").trim(), "1", "o pre-voo consultou o refs mais de uma vez para o MESMO N");
  // controle NA MESMA rodada: o shim tem estado de verdade -- a chamada seguinte ja devolve o B. Sem
  // isto, um contador que nao grava deixaria o caso verde tambem sob o mutante (sonda fraca).
  assert.ok(saidaDoRefs("712", refs).some((l) => l.includes(estadoB)), "o shim com estado nao mudou de estado");
});

test("[F-7k] refs MORTO para o N de DOIS blocos: a REJ nomeia a indisponibilidade de #666 em cada um e NUNCA 'NAO bate'/'DESATUALIZADO' — ⇄ M7 na l.255 do artefato", () => {
  const bloco = colagem("701").map((l) => l.replace("#701", "#666"));
  const r = roda(
    mandato("t6-7k-paste2-morto", [UNIDADE_COLAGEM("666"), ...bloco, "", UNIDADE_COLAGEM("666"), ...bloco]),
    "393",
    REFS_COMPLETO,
  );
  assert.equal(r.status, 1, r.out);
  const indisponiveis = r.out.match(/^REJEITADO {2}l\.\d+-\d+: referencias indisponiveis para #666 \(mandato-refs\.sh ec=1\)/gm) ?? [];
  assert.equal(indisponiveis.length, 2, `uma REJ de indisponibilidade por bloco\n${r.out}`);
  assert.doesNotMatch(
    r.out,
    /NAO bate|DESATUALIZADO/,
    `com o refs morto nada foi comparado: acusar "colagem desatualizada" e culpar o mandato pela ferramenta\n${r.out}`,
  );
});

// --- [F-6g] / [F-6h] / [F-6i]: checagem 6, os caminhos LEGITIMOS que o artefato aceita por um ramo so ----
test("[F-6g] diretorio que existe SO sob mobile/flutter_app/ (`lib/core/sync/`): OK — ⇄ M3 na l.514 do artefato", () => {
  // precondicao: se `lib/core/sync/` existisse na RAIZ, o caso passaria sem atravessar a l.514.
  assert.equal(tipoNaRaiz("lib/core/sync"), "ENOENT", "precondicao: `lib/core/sync` nao pode existir na raiz");
  assert.equal(tipoNaRaiz("mobile/flutter_app/lib/core/sync"), "EISDIR", "precondicao: o diretorio existe sob o app Flutter");
  const r = roda(mandato("t6-6g-dir-flutter", ["- `lib/core/sync/` medido por: true"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  // controle NA MESMA rodada: diretorio que nao existe em nenhuma das duas raizes cai.
  const c = roda(mandato("t6-6g-controle", ["- `lib/core/naoexiste-8851/` medido por: true"]));
  assert.equal(c.status, 1, c.out);
  assert.equal(c.rejeicoes, 1, c.out);
  assert.match(c.out, /diretorio citado nao existe: lib\/core\/naoexiste-8851\//, c.out);
});

test("[F-6h] `HEAD:<dir>/` existente (`HEAD:docs/revisoes/SAN3/`): OK — ⇄ M3 na l.515 do artefato", () => {
  const r = roda(mandato("t6-6h-rev-dir", ["- `HEAD:docs/revisoes/SAN3/` medido por: true"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  // controle NA MESMA rodada: `HEAD:` na frente de um diretorio que nao existe nao o salva.
  const c = roda(mandato("t6-6h-controle", ["- `HEAD:docs/revisoes/naoexiste-8852/` medido por: true"]));
  assert.equal(c.status, 1, c.out);
  assert.equal(c.rejeicoes, 1, c.out);
  assert.match(c.out, /diretorio citado nao existe: HEAD:docs\/revisoes\/naoexiste-8852\//, c.out);
});

// [F-6i] vira DOIS casos, um por ponto: a l.520 decide ENTRAR no ramo da revisao (a rev tem de resolver);
// a l.523 decide pela EXISTENCIA do caminho sob a rev que resolveu, na raiz OU sob o app Flutter.
// `HEAD:package.json` NAO serve: sem `/` o token nao e caminho (I13) e nao chega a ser conferido.
test("[F-6i/520] `HEAD:<caminho/com/barra>` existente: OK, e a MESMA citacao com rev que nao resolve cai — ⇄ M3 na l.520 do artefato", () => {
  const r = roda(mandato("t6-6i-520", ["- li `HEAD:scripts/mandato-refs.sh`, medido por: true"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  const c = roda(mandato("t6-6i-520-controle", ["- li `naoexiste-rev:scripts/mandato-refs.sh`, medido por: true"]));
  assert.equal(c.status, 1, c.out);
  assert.equal(c.rejeicoes, 1, c.out);
  assert.match(c.out, /caminho citado nao existe: naoexiste-rev:scripts\/mandato-refs\.sh/, c.out);
});

test("[F-6i/523] sob rev que resolve, a EXISTENCIA decide — na raiz e sob mobile/flutter_app/: OK; inexistente cai — ⇄ M7 na l.523 do artefato", () => {
  const r = roda(
    mandato("t6-6i-523", [
      "- li `HEAD:scripts/mandato-refs.sh`, medido por: true",
      "- e `HEAD:lib/core/sync/sync_action_store.dart`, medido por: true",
    ]),
  );
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  const c = roda(mandato("t6-6i-523-controle", ["- li `HEAD:scripts/naoexiste-8853.sh`, medido por: true"]));
  assert.equal(c.status, 1, c.out);
  assert.equal(c.rejeicoes, 1, c.out);
  assert.match(c.out, /caminho citado nao existe: HEAD:scripts\/naoexiste-8853\.sh/, c.out);
});

// =================================================================================================
// CICLO 4 -- E1 (plano §15.2/§15.3; identidade `dev-tests-ciclo4-b-gov-mandato`). Os bloqueantes do
// ciclo 3 que sao do PRE-VOO (C1c-01..04), a fixture que discrimina o ponto 336 (C2c-02), a classe A15
// (fail-closed inclui a propria MORTE de um componente), C1c-05/06, os quatro [M-EXT] sobreviventes
// da C2''' que sao deste artefato (C2c-03: X07, X08, X09, X11) e as fronteiras 25 ([F-25]) e 27
// ([F-6j]). Cada titulo diz a mutacao (⇄) que deixa o caso vermelho.
// Os casos que ATACAM um defeito do pre-voo do head nascem vermelhos contra ele (vermelho-controle
// historico, §15.8). Ficam verdes no head, e continuam verdes depois do conserto: os controles
// positivos ([C1c-01d], [C1c-02c], [C1c-03c], [C1c-04e], [A15/refs], [A15/stderr-limpo]) e os que
// atacam um MUTANTE do artefato, nao o artefato ([C2c-02/336], [X07], [X08], [X09], [X11]) ou o
// proprio guard ([F-25]). Nenhum caso le a fonte do artefato: todos passam por `roda()` ou
// `rodaComPath()` -- `spawnSync` do `.sh` de verdade, com o mesmo limite de 60 s.
// =================================================================================================

/**
 * `roda()` com um diretorio PREFIXADO ao PATH do spawn (A15: o shim que mata UM componente) e/ou com
 * variaveis extras no ambiente ([F-6j]); o mesmo limite de 60 s e a mesma forma de retorno de `roda()`.
 * A chave do PATH e procurada sem caixa: no Windows o Node herda `Path`, e acrescentar `PATH` ao lado
 * dela deixaria duas chaves -- qual delas o filho herda nao e garantido (e o `ambienteCom` do guard do
 * refs, pelo mesmo motivo).
 */
function rodaComPath(
  fixture: string,
  dirDoShim: string | undefined,
  opcoes: { pr?: string; refs?: string; env?: Record<string, string> } = {},
) {
  const env: NodeJS.ProcessEnv = { ...process.env, MANDATO_REFS: opcoes.refs ?? REFS_OK, ...(opcoes.env ?? {}) };
  if (dirDoShim !== undefined) {
    const chaves = Object.keys(env).filter((k) => k.toUpperCase() === "PATH");
    const chave = chaves[0] ?? "PATH";
    const atual = env[chave] ?? "";
    for (const k of chaves) delete env[k];
    env[chave] = `${dirDoShim}${path.delimiter}${atual}`;
  }
  const args = opcoes.pr === undefined ? [SCRIPT, fixture] : [SCRIPT, fixture, opcoes.pr];
  const r = spawnSync("bash", args, { encoding: "utf8", env, timeout: 60_000 });
  assert.equal(r.signal, null, "artefato nao terminou em 60 s");
  const out = r.stdout ?? "";
  return { status: r.status, out, err: r.stderr ?? "", rejeicoes: (out.match(/^REJEITADO {2}/gm) ?? []).length };
}

/** [C2c-02/336] `## MEDIDO`, unidade valida, linhas vazias, `## HIPOTESE`, unidade valida: `linhas` no total. */
function docGrande(nome: string, linhas = 1_000_003): string {
  const alvo = path.join(dir, `${nome}.md`);
  const cabeca = ["## MEDIDO", "", "- x, medido por: true"];
  const cauda = ["## HIPOTESE", "", "- nada. derruba com: true"];
  const vazias = linhas - cabeca.length - cauda.length;
  writeFileSync(alvo, cabeca.join("\n") + "\n" + "\n".repeat(vazias) + cauda.join("\n") + "\n", "utf8");
  return alvo;
}

/**
 * [F-25] um `mandato-refs.sh` que NAO termina: dorme ate `segundos`, ou ate o caso criar o arquivo de
 * PARADA -- e assim que o caso encerra o orfao (o `spawnSync` mata so o filho direto; o shim e NETO, o
 * pre-voo o chama). Ao sair, grava o arquivo de FIM: e por ele que o caso prova que nao deixou processo.
 */
function shimQueDorme(nome: string, segundos = 120): { caminho: string; para: string; fim: string } {
  const para = path.join(dir, "bin", `${nome}.PARA`);
  const fim = path.join(dir, "bin", `${nome}.FIM`);
  const caminho = shim(
    nome,
    [
      "#!/usr/bin/env bash",
      `i=0; while [ "$i" -lt ${segundos} ]; do [ -f "${para.split(path.sep).join("/")}" ] && break; sleep 1; i=$((i+1)); done`,
      `: > "${fim.split(path.sep).join("/")}"`,
      "exit 0",
      "",
    ].join("\n"),
  );
  return { caminho, para, fim };
}

// --- C1c-01: a isencao I1 cobre EXATAMENTE as linhas cuja igualdade foi verificada --------------------
test("[C1c-01a] linha `# gerado em: … <SHA fabricado>` INSERIDA na colagem: REJ 'NAO bate' e o SHA que a prosa cita e cobrado — ⇄ voltar ao `grep -v '^# gerado em:'`", () => {
  const fab = FAKE(51);
  const prosa = `- o head aprovado verdadeiro e ${fab}, medido por: true`;
  const bloco = colagem("701", "  ", (l) => [...l.slice(0, 2), `# gerado em: o head aprovado verdadeiro e ${fab}`, ...l.slice(2)]);
  assert.equal(bloco.filter((l) => l.includes(fab)).length, 1, "◐ a linha injetada nao entrou no bloco (A2)");
  const r = roda(mandato("c1c01a-gerado-em-inj", [UNIDADE_COLAGEM("701"), ...bloco, "", prosa]), "393", REFS_COMPLETO);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}l\.\d+-\d+: bloco '# refs do PR #701' NAO bate com a saida atual/m, r.out);
  assert.match(r.out, new RegExp(`^REJEITADO {2}SHA '${fab}' nao esta na saida`, "m"), r.out);
  assert.doesNotMatch(r.out, /^COLAGEM/m, `bloco com linha nao conferida nao e colagem verificada\n${r.out}`);
  // controle NA MESMA rodada (o par do voto): sem a linha injetada a colagem confere, e o MESMO SHA da
  // prosa cai pela checagem 4 -- era a linha injetada, e so ela, que o lavava.
  const par = roda(mandato("c1c01a-par", [UNIDADE_COLAGEM("701"), ...colagem("701"), "", prosa]), "393", REFS_COMPLETO);
  assert.equal(par.status, 1, par.out);
  assert.equal(par.rejeicoes, 1, par.out);
  assert.match(par.out, /^COLAGEM {4}l\.\d+-\d+: refs do PR #701 confere/m, par.out);
  assert.match(par.out, new RegExp(`^REJEITADO {2}SHA '${fab}' nao esta na saida`, "m"), par.out);
});

test("[C1c-01b] a linha de CARIMBO editada com um SHA (sem a forma de carimbo): REJ 'NAO bate' — ⇄ voltar ao `grep -v '^# gerado em:'`", () => {
  const bloco = colagem("701", "  ", (l) => l.map((x) => (x.startsWith("# gerado em:") ? `# gerado em: ${FAKE(52)} · repo: t/t` : x)));
  assert.equal(bloco.filter((l) => l.includes(FAKE(52))).length, 1, "◐ a edicao nao foi aplicada (A2)");
  const r = roda(mandato("c1c01b-gerado-em-edit", [UNIDADE_COLAGEM("701"), ...bloco]), "393", REFS_COMPLETO);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}l\.\d+-\d+: bloco '# refs do PR #701' NAO bate com a saida atual/m, r.out);
  assert.doesNotMatch(r.out, /^COLAGEM/m, r.out);
});

test("[C1c-01c] SHA fabricado no info string da ABERTURA da cerca: a colagem confere e a checagem 4 cobra o SHA da abertura — ⇄ `EXENTAS` de `ini` a `fim`", () => {
  const bloco = colagem("701");
  bloco[0] = `  \`\`\`${FAKE(53)}`;
  const r = roda(mandato("c1c01c-info-string", [UNIDADE_COLAGEM("701"), ...bloco]), "393", REFS_COMPLETO);
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /^COLAGEM {4}l\.\d+-\d+: refs do PR #701 confere/m, `o corpo do bloco e o da ferramenta: a colagem confere\n${r.out}`);
  assert.match(r.out, new RegExp(`^REJEITADO {2}SHA '${FAKE(53)}' nao esta na saida`, "m"), r.out);
});

test("[C1c-01d] colagem LEGITIMA com carimbo DIFERENTE do da execucao do pre-voo: COLAGEM confere, 0 REJ — controle positivo: ⇄ tirar a normalizacao do carimbo", () => {
  const bloco = colagem("701");
  const doBloco = bloco.find((l) => l.trim().startsWith("# gerado em:"));
  const agora = saidaDoRefs("701").find((l) => l.startsWith("# gerado em:"));
  assert.ok(doBloco !== undefined && agora !== undefined, "◐ o shim nao produziu a linha de carimbo");
  assert.notEqual(doBloco.trim(), agora, "◐ o shim repetiu o carimbo: o caso nao discrimina a normalizacao");
  const r = roda(mandato("c1c01d-colagem-legitima", [UNIDADE_COLAGEM("701"), ...bloco]), "393", REFS_COMPLETO);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^COLAGEM {4}l\.\d+-\d+: refs do PR #701 confere/m, r.out);
});

// --- C1c-02: a classificacao SHA/caminho e por TOKEN, e `:` nao esconde um SHA -----------------------
test("[C1c-02a] `<SHA fabricado>:CLAUDE.md`, com 40 e com 8 hex: 1 REJ da checagem 4 em cada — ⇄ nao partir no `:` / emitir SHA so com 40 hex", () => {
  for (const fab of [FAKE(54), "deadbe57"]) {
    const r = roda(mandato(`c1c02a-${fab.length}`, [`- o objeto julgado e ${fab}:CLAUDE.md, medido por: true`]), "393");
    assert.equal(r.status, 1, r.out);
    assert.equal(r.rejeicoes, 1, r.out);
    assert.match(r.out, new RegExp(`^REJEITADO {2}SHA '${fab}' nao esta na saida`, "m"), r.out);
  }
  // controle NA MESMA rodada (o par do voto): com espaco no lugar do `:`, o MESMO SHA ja cai hoje.
  const par = roda(mandato("c1c02a-par", [`- o objeto julgado e ${FAKE(54)} CLAUDE.md, medido por: true`]), "393");
  assert.equal(par.rejeicoes, 1, par.out);
  assert.match(par.out, new RegExp(`^REJEITADO {2}SHA '${FAKE(54)}' nao esta na saida`, "m"), par.out);
});

test("[C1c-02b] `<SHA fabricado>:<caminho que existe>`: 2 REJ — a checagem 4 (proveniencia) E a 6 (a revisao nao existe) — ⇄ `rev-parse --verify` na checagem 6", () => {
  const fab = FAKE(55);
  const r = roda(mandato("c1c02b", [`- o objeto julgado e ${fab}:scripts/mandato-preflight.sh, medido por: true`]), "393");
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
  assert.match(r.out, new RegExp(`^REJEITADO {2}SHA '${fab}' nao esta na saida`, "m"), r.out);
  assert.match(r.out, new RegExp(`^REJEITADO {2}(?=[^\\n]*nao existe)(?=[^\\n]*${fab})`, "m"), `a checagem 6 tem de recusar a revisao que nao existe\n${r.out}`);
});

test("[C1c-02c] `<HEAD da raiz>:scripts/mandato-refs.sh` com esse SHA na proveniencia: 0 REJ — controle positivo: o conserto nao pode recusar a citacao legitima", () => {
  const head = execFileSync("git", ["-C", RAIZ, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  assert.match(head, /^[0-9a-f]{40}$/, "◐ a raiz do guard nao e repositorio git com HEAD");
  const refs = shim("refs-c1c02c.sh", `#!/usr/bin/env bash\nif [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n' "${head}"; exit 0; fi\nexit 0\n`);
  const r = roda(mandato("c1c02c", [`- li ${head}:scripts/mandato-refs.sh, medido por: true`]), "393", refs);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

test("[C1c-02d] `<HEAD da raiz>:scripts/mandato-refs.sh` FORA da proveniencia: exatamente 1 REJ, da checagem 4 — nenhuma da 6 (a revisao existe) — ⇄ nao partir no `:`", () => {
  const head = execFileSync("git", ["-C", RAIZ, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  assert.match(head, /^[0-9a-f]{40}$/, "◐ a raiz do guard nao e repositorio git com HEAD");
  const r = roda(mandato("c1c02d", [`- li ${head}:scripts/mandato-refs.sh, medido por: true`]), "393");
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, new RegExp(`^REJEITADO {2}SHA '${head}' nao esta na saida`, "m"), r.out);
  assert.doesNotMatch(r.out, /nao existe/, `a revisao EXISTE: a checagem 6 nao pode recusar\n${r.out}`);
});

test("[C1c-02e] `<SHA fabricado>:scripts/mandato-refs.sh` COM o fabricado na proveniencia: 1 REJ, da checagem 6 (a revisao nao existe) — ⇄ `rev-parse --verify` de volta (aceita qualquer 40-hex)", () => {
  const fab = FAKE(56);
  const existe = spawnSync("git", ["-C", RAIZ, "cat-file", "-e", fab], { encoding: "utf8" });
  assert.notEqual(existe.status, 0, "◐ o SHA 'fabricado' existe na raiz: o caso nao discrimina");
  const refs = shim("refs-c1c02e.sh", `#!/usr/bin/env bash\nif [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n' "${fab}"; exit 0; fi\nexit 0\n`);
  const r = roda(mandato("c1c02e", [`- li ${fab}:scripts/mandato-refs.sh, medido por: true`]), "393", refs);
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, new RegExp(`^REJEITADO {2}(?=[^\\n]*nao existe)(?=[^\\n]*${fab})`, "m"), r.out);
  assert.doesNotMatch(r.out, /nao esta na saida/, `o fabricado esta na proveniencia: a checagem 4 nao pode cobra-lo\n${r.out}`);
});

// ERRATA §15.14(c), T4c-2: o ramo de DIRETORIO da checagem 6 e instancia da MESMA propriedade
// da C1c-02(ii) ("a revisao so resolve se existe"). A rev NAO-hex isola a checagem 6 (nenhuma REJ da 4).
test("[C1c-02f] `<rev inexistente>:<diretorio que existe>/`: 1 REJ da checagem 6, e `HEAD:` no mesmo diretorio passa — ⇄ ramo `*/)` sem a conferencia da revisao", () => {
  assert.equal(tipoNaRaiz("docs/revisoes/SAN3"), "EISDIR", "◐ o diretorio citado tem de existir na raiz do guard");
  const rev = spawnSync("git", ["-C", RAIZ, "rev-parse", "--verify", "--quiet", "naoexiste-rev-8891^{commit}"], { encoding: "utf8" });
  assert.notEqual(rev.status, 0, "◐ a revisao 'inexistente' resolve na raiz: o caso nao discrimina");
  const r = roda(mandato("c1c02f-rev-dir", ["- li `naoexiste-rev-8891:docs/revisoes/SAN3/`, medido por: true"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}(?=[^\n]*nao existe)(?=[^\n]*naoexiste-rev-8891:docs\/revisoes\/SAN3\/)/m, r.out);
  assert.doesNotMatch(r.out, /componente interno morreu/, `revisao inexistente nao e morte do git\n${r.out}`);
  // controle NA MESMA rodada (o par do [F-6h]): `HEAD:` no MESMO diretorio passa.
  const ctrl = roda(mandato("c1c02f-ctrl", ["- li `HEAD:docs/revisoes/SAN3/`, medido por: true"]));
  assert.equal(ctrl.rejeicoes, 0, ctrl.out);
  assert.equal(ctrl.status, 0, ctrl.out);
});

// --- C1c-03: a cerca e SAIDA, nunca COMANDO ------------------------------------------------------------
test("[C1c-03a] `medido por:` SO dentro da cerca: exatamente 2 REJ (unidade sem token + saida colada sem comando) — ⇄ `satisfeita()` sobre o texto com as linhas cercadas", () => {
  const r = roda(mandato("c1c03a", ["- cobertura 87,4% em 12 de 13 rotas", "  ```", "  medido por: true", "  ```"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
  assert.match(r.out, /^REJEITADO {2}unidade de MEDIDO sem 'medido por: <comando>' — l\.3: - cobertura 87,4%/m, r.out);
  assert.match(r.out, /^REJEITADO {2}saida colada sem comando — l\.3:/m, r.out);
});

test("[C1c-03b] saida de `grep` colada que CONTEM a string `medido por:`: exatamente 2 REJ — ⇄ `satisfeita()` sobre o texto com as linhas cercadas", () => {
  const r = roda(mandato("c1c03b", ["- o relatorio cita o token", "  ```", "  relatorio.md:12:- x, medido por: true", "  ```"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
  assert.match(r.out, /^REJEITADO {2}unidade de MEDIDO sem 'medido por: <comando>' — l\.3: - o relatorio cita o token/m, r.out);
  assert.match(r.out, /^REJEITADO {2}saida colada sem comando — l\.3:/m, r.out);
});

test("[C1c-03c] o MESMO conteudo cercado com o token na PROSA: 0 REJ — controle positivo (e o [B1-correto])", () => {
  const r = roda(mandato("c1c03c", ["- cobertura 87,4% em 12 de 13 rotas, medido por: true", "  ```", "  medido por: true", "  ```"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
});

// --- C1c-04: o cabecalho de secao e EXATAMENTE o nome; toda outra linha `## …` e conteudo ------------
test("[C1c-04a] `## MEDIDO — <afirmacao>` nao e o cabecalho: REJ 'falta a secao' E a linha listada como conteudo fora — ⇄ reconhecedor por prefixo", () => {
  const linha = "## MEDIDO — cobertura 87,4% em 12 de 13 rotas";
  const r = roda(bruto("c1c04a", [linha, "", "- a, medido por: true", "", "## HIPOTESE", "", "- h. derruba com: true"]));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}falta a secao '## MEDIDO'/m, r.out);
  assert.match(r.out, /^REJEITADO {2}linha\(s\) de conteudo fora de MEDIDO\/HIPOTESE:/m, r.out);
  assert.ok(foraListadas(r.out).some(([n, t]) => n === 1 && t.startsWith(linha)), `a linha do cabecalho com texto e conteudo, e tem de ser nomeada\n${r.out}`);
});

test("[C1c-04b] `## MEDIDO medido por: grep -c …` nao e o cabecalho: REJ 'falta a secao' E a linha listada como conteudo fora — ⇄ reconhecedor por prefixo", () => {
  const linha = '## MEDIDO medido por: grep -c "naoaparece" CLAUDE.md';
  const r = roda(bruto("c1c04b", [linha, "", "- a, medido por: true", "", "## HIPOTESE", "", "- h. derruba com: true"]));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}falta a secao '## MEDIDO'/m, r.out);
  assert.match(r.out, /^REJEITADO {2}linha\(s\) de conteudo fora de MEDIDO\/HIPOTESE:/m, r.out);
  assert.ok(foraListadas(r.out).some(([n, t]) => n === 1 && t.startsWith(linha)), r.out);
});

test("[C1c-04c] `## Resumo — <afirmacao>` ANTES de `## MEDIDO`: conteudo fora das secoes, 1 REJ nomeando a linha — ⇄ `## X` sem `FORA`", () => {
  const linha = "## Resumo — suite 3103/3105 verde e CI 14/14";
  const resto = ["", "## MEDIDO", "", "- a, medido por: true", "", "## HIPOTESE", "", "- h. derruba com: true"];
  const r = roda(bruto("c1c04c", [linha, ...resto]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.ok(foraListadas(r.out).some(([n, t]) => n === 1 && t.startsWith(linha)), r.out);
  // controle NA MESMA rodada (o do voto): com `###` a MESMA linha ja e conteudo fora hoje.
  const ctrl = roda(bruto("c1c04c-h3", [`#${linha}`, ...resto]));
  assert.equal(ctrl.rejeicoes, 1, ctrl.out);
  assert.ok(foraListadas(ctrl.out).some(([n, t]) => n === 1 && t.startsWith(`#${linha}`)), ctrl.out);
});

test("[C1c-04d] `## Conclusao — <afirmacao>` DEPOIS de `## HIPOTESE`: 1 REJ nomeando a linha — ⇄ `## X` sem `FORA`", () => {
  const linha = "## Conclusao — suite 3103/3105 verde e CI 14/14";
  const r = roda(mandato("c1c04d", ["- a, medido por: true"], ["- h. derruba com: true", "", linha]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.ok(foraListadas(r.out).some(([n, t]) => n === 9 && t.startsWith(linha)), r.out);
});

test("[C1c-04e] `## MEDIDO`/`## HIPOTESE` com espacos finais, e em CRLF: 0 REJ — controle positivo: ⇄ `$` sem `[[:space:]]*`", () => {
  const espacos = roda(bruto("c1c04e-espacos", ["## MEDIDO   ", "", "- a, medido por: true", "", "## HIPOTESE  ", "", "- h. derruba com: true"]));
  assert.equal(espacos.rejeicoes, 0, espacos.out);
  assert.equal(espacos.status, 0, espacos.out);
  const alvo = mandatoCrLf("c1c04e-crlf", ["- a, medido por: true"]);
  assert.ok(readFileSync(alvo).includes(0x0d), "◐ a fixture CRLF nasceu sem CR (classe A3)");
  const crlf = roda(alvo);
  assert.equal(crlf.rejeicoes, 0, crlf.out);
  assert.equal(crlf.status, 0, crlf.out);
});

test("[C1c-04f] secao `## OUTRA` com conteudo: 1 REJ listando o CABECALHO e o conteudo (M2 revogada pela forma A) — ⇄ `## X` sem `FORA`", () => {
  const r = roda(mandato("c1c04f", ["- a, medido por: true"], ["- h. derruba com: true", "", "## OUTRA", "", "- conteudo da outra secao, medido por: true"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  const listadas = foraListadas(r.out);
  assert.ok(listadas.some(([n, t]) => n === 9 && t.startsWith("## OUTRA")), `o cabecalho de secao estranha e conteudo fora\n${r.out}`);
  assert.ok(listadas.some(([n, t]) => n === 11 && t.startsWith("- conteudo da outra secao")), r.out);
});

// --- C2c-02: o ponto 336 tem fixture que discrimina -----------------------------------------------------
test("[C2c-02/336] documento de 1 000 003 linhas, sem SHA e sem PR: PRE-VOO OK — ⇄ M7(next) na l.336 do artefato (blob faa408c8): o numero de linha >= 1000000 do oraculo vira SHA", () => {
  const alvo = docGrande("c2c02-336-um-milhao");
  let linhas = 0;
  for (const b of readFileSync(alvo)) if (b === 0x0a) linhas++;
  assert.equal(linhas, 1_000_003, "◐ o documento nao tem as 1 000 003 linhas");
  const r = roda(alvo, undefined, REFS_MORTO);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /PRE-VOO OK/, r.out);
  assert.doesNotMatch(r.out, /cita SHA/, r.out);
});

// --- A15: fail-closed inclui a propria morte (§1.5 do parecer; P-GOV-MAQUINA-393-D-M3-FALHA-INTERNA) ---
// Um shim no PATH mata UM componente: o awk so na invocacao cujo programa contem o marcador (o oraculo,
// a passada 2, os filtros peg/pega), tr/sed/git sempre. Cada caso exige ec=1, UMA rejeicao, a que NOMEIA
// o componente, e nunca PRE-VOO OK. A ancora de alcance (◐) e o arquivo que o shim grava ao morrer: sem
// ele o caso diz que nao mediu a morte. E o controle NA MESMA rodada -- a mesma fixture sem o shim -- sai
// PRE-VOO OK, logo a morte e a unica variavel. [A15/refs] e [A15/stderr-limpo] vem em seguida.
type ComponenteA15 = {
  id: string;
  comando: string;
  marcador?: string;
  codigo: number;
  nomeia: RegExp;
  fixture: (nome: string) => string;
  pr?: string;
  refs?: string;
};
const A15_POSITIVA = (nome: string) => mandato(nome, ["- suite 3103/3105 verde e CI 14/14, medido por: true"]);
const COMPONENTES_A15: ComponenteA15[] = [
  { id: "awk1", comando: "awk", marcador: "marcaChar", codigo: 2, nomeia: /^REJEITADO {2}componente interno morreu: awk[^\n]*oraculo/m, fixture: A15_POSITIVA },
  { id: "awk2", comando: "awk", marcador: "isento(num)", codigo: 2, nomeia: /^REJEITADO {2}componente interno morreu: awk[^\n]*passada[ -]?2/m, fixture: A15_POSITIVA },
  { id: "awkfiltro", comando: "awk", marcador: "$1==t", codigo: 2, nomeia: /^REJEITADO {2}componente interno morreu: awk[^\n]*filtro/m, fixture: A15_POSITIVA },
  { id: "tr", comando: "tr", codigo: 2, nomeia: /^REJEITADO {2}componente interno morreu: tr\b/m, fixture: A15_POSITIVA },
  {
    id: "sed",
    comando: "sed",
    codigo: 2,
    nomeia: /^REJEITADO {2}componente interno morreu: sed\b/m,
    fixture: (nome) => mandato(nome, [UNIDADE_COLAGEM("777"), ...colagem("777")]),
    pr: "393",
    refs: REFS_COMPLETO,
  },
  {
    id: "git",
    comando: "git",
    codigo: 128,
    nomeia: /^REJEITADO {2}componente interno morreu: git\b/m,
    fixture: (nome) => mandato(nome, ["- li `HEAD:scripts/mandato-refs.sh`, medido por: true"]),
  },
];
for (const c of COMPONENTES_A15) {
  const como = c.marcador === undefined ? "morto" : `morto so na invocacao com '${c.marcador}'`;
  test(`[A15/${c.id}] ${c.comando} ${como}: ec=1, 1 REJ que NOMEIA o componente, nunca PRE-VOO OK — ⇄ ler a saida vazia do componente morto como 'nada a rejeitar'`, () => {
    const controle = roda(c.fixture(`a15-${c.id}-controle`), c.pr, c.refs ?? REFS_OK);
    assert.equal(controle.status, 0, `◐ sem o shim a fixture nao sai PRE-VOO OK: a morte nao seria a unica variavel\n${controle.out}`);
    const pasta = path.join(dir, "bin", `a15-${c.id}`);
    mkdirSync(pasta, { recursive: true });
    const alcancado = path.join(pasta, "ALCANCADO");
    const morre = [
      `echo '${c.comando}: morte sintetica${c.marcador === undefined ? "" : ` (${c.marcador})`}' >&2`,
      `: > "${alcancado.split(path.sep).join("/")}"`,
      `exit ${c.codigo}`,
    ];
    let corpo = ["#!/usr/bin/env bash", ...morre, ""];
    if (c.marcador !== undefined) {
      const real = (spawnSync("bash", ["-c", `command -v ${c.comando}`], { encoding: "utf8" }).stdout ?? "").trim();
      assert.ok(real.startsWith("/"), `◐ nao achei o ${c.comando} real para o shim delegar: ${JSON.stringify(real)}`);
      corpo = [
        "#!/usr/bin/env bash",
        `for a in "$@"; do case "$a" in *'${c.marcador}'*) ${morre.join("; ")} ;; esac; done`,
        `exec "${real}" "$@"`,
        "",
      ];
    }
    shim(`a15-${c.id}/${c.comando}`, corpo.join("\n"));
    const r = rodaComPath(c.fixture(`a15-${c.id}`), pasta, { pr: c.pr, refs: c.refs });
    assert.ok(existsSync(alcancado), `◐ o shim de ${c.comando} nao foi alcancado: o caso nao mediu a morte\n${r.out}\n${r.err}`);
    assert.equal(r.status, 1, r.out);
    assert.doesNotMatch(r.out, /PRE-VOO OK/, `componente morto e veredito positivo: fail-open\n${r.out}`);
    assert.equal(r.rejeicoes, 1, r.out);
    assert.match(r.out, c.nomeia, `a rejeicao tem de NOMEAR o componente que morreu\n${r.out}`);
  });
}

test("[A15/refs] mandato-refs.sh morto nos DOIS pontos em que e chamado (colagem e --sha-only): 2 REJ nomeando a ferramenta, nunca 'NAO bate'/'SHA nao esta' — o [B4] estendido a colagem", () => {
  const alcancado = path.join(dir, "bin", "a15-refs.ALCANCADO");
  const refs = shim("a15-refs-morto.sh", ["#!/usr/bin/env bash", `: >> "${alcancado.split(path.sep).join("/")}"`, 'echo "PARADO: nao li o PR" >&2', "exit 1", ""].join("\n"));
  const r = roda(
    mandato("a15-refs", [
      UNIDADE_COLAGEM("701"),
      "  ```",
      "  # refs do PR #701 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato",
      "  ramo:            fix/x",
      "  ```",
      "",
      `- head \`${SHA_A}\`, medido por: true`,
    ]),
    "393",
    refs,
  );
  assert.ok(existsSync(alcancado), "◐ o refs morto nao foi alcancado");
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
  assert.match(r.out, /^REJEITADO {2}l\.\d+-\d+: referencias indisponiveis para #701 \(mandato-refs\.sh ec=1\)/m, r.out);
  assert.match(r.out, /^REJEITADO {2}referencias indisponiveis \(mandato-refs\.sh ec=1\)/m, r.out);
  assert.doesNotMatch(r.out, /PRE-VOO OK|NAO bate|DESATUALIZADO|nao esta na saida/, r.out);
});

test("[A15/stderr-limpo] 5 controles positivos (bullets, tabela, colagem, rev:caminho, CRLF): PRE-VOO OK com o stderr do artefato VAZIO — ⇄ componente que morre com diagnostico (o `syntax error` dos mutantes)", () => {
  const casos: Array<[string, ReturnType<typeof roda>]> = [
    ["bullets", roda(mandato("a15-limpo-bullets", ["- suite 3058/3060, medido por: npm test", "- CI 14/14, medido por: gh pr checks"]))],
    ["tabela", roda(mandato("a15-limpo-tabela", ["| afirmacao | medido por: |", "|---|---|", "| CI 14/14 | gh pr checks |"]))],
    ["colagem", roda(mandato("a15-limpo-colagem", [UNIDADE_COLAGEM("777"), ...colagem("777")]), "393", REFS_COMPLETO)],
    ["rev:caminho", roda(mandato("a15-limpo-rev", ["- li `HEAD:scripts/mandato-refs.sh`, medido por: true"]))],
    ["crlf", roda(mandatoCrLf("a15-limpo-crlf", ["- suite 3058/3060, medido por: npm test"]))],
  ];
  for (const [nome, r] of casos) {
    assert.equal(r.status, 0, `${nome}: ${r.out}`);
    assert.equal(r.rejeicoes, 0, `${nome}: ${r.out}`);
    assert.equal(r.err, "", `${nome}: o artefato escreveu no stderr num caso positivo\n${r.err}`);
  }
});

// --- C1c-05 / C1c-06 ------------------------------------------------------------------------------------
test("[C1c-05] grep invocado por CAMINHO (`/usr/bin/grep -c`) e com EXTENSAO (`grep.exe -c`), sem -i: 2 REJ da checagem 5 — ⇄ familia que nao aceita caminho/extensao antes do nome", () => {
  const r = roda(
    mandato("c1c05", ['- nao aparece, medido por: /usr/bin/grep -c "naoaparece" CLAUDE.md', '- nem aqui, medido por: grep.exe -c "naoaparece" CLAUDE.md']),
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 2, r.out);
  assert.match(r.out, /^REJEITADO {2}invocacao de grep\/rg SEM -i[^\n]*l\.3:[^\n]*\/usr\/bin\/grep -c/m, r.out);
  assert.match(r.out, /^REJEITADO {2}invocacao de grep\/rg SEM -i[^\n]*l\.4:[^\n]*grep\.exe -c/m, r.out);
  // controle NA MESMA rodada: o -i no MESMO segmento continua valendo para as duas formas.
  const ctrl = roda(
    mandato("c1c05-ctrl", ['- nao aparece, medido por: /usr/bin/grep -ic "naoaparece" CLAUDE.md', '- nem aqui, medido por: grep.exe -ic "naoaparece" CLAUDE.md']),
  );
  assert.equal(ctrl.rejeicoes, 0, ctrl.out);
  assert.equal(ctrl.status, 0, ctrl.out);
});

test("[C1c-06] `\\|` escapado numa celula e literal, nao fronteira: a celula de evidencia VAZIA cai — 1 REJ — ⇄ `split` sem trocar o `\\|`", () => {
  const cab = ["| afirmacao | medido por: |", "|---|---|"];
  const r = roda(mandato("c1c06", [...cab, "| suite 3103/3105 \\| CI 14/14 |  |"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}unidade de MEDIDO sem 'medido por: <comando>' — l\.5:[^\n]*3103\/3105/m, r.out);
  // controle NA MESMA rodada: o MESMO pipe escapado com a celula de evidencia cheia passa.
  const ctrl = roda(mandato("c1c06-ctrl", [...cab, "| suite 3103/3105 \\| CI 14/14 | npm test |"]));
  assert.equal(ctrl.rejeicoes, 0, ctrl.out);
  assert.equal(ctrl.status, 0, ctrl.out);
});

// --- C2c-03 (pre-voo): os [M-EXT] da C2''' que mudavam o comportamento com o guard VERDE ----------------
test("[X07] colagem cujo refs sai ec=2: 'referencias indisponiveis … ec=2', nunca 'NAO bate'/'DESATUALIZADO' — ⇄ X07: a condicao RCN=2 sai da l.253 do artefato", () => {
  const refs = shim("refs-ec2.sh", '#!/usr/bin/env bash\necho "uso: mandato-refs.sh <PR> [--sha-only]" >&2\nexit 2\n');
  const r = roda(
    mandato("x07-refs-ec2", [
      UNIDADE_COLAGEM("667"),
      "  ```",
      "  # refs do PR #667 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato",
      "  ramo:            fix/x",
      "  ```",
    ]),
    undefined,
    refs,
  );
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}l\.\d+-\d+: referencias indisponiveis para #667 \(mandato-refs\.sh ec=2\)/m, r.out);
  assert.doesNotMatch(r.out, /NAO bate|DESATUALIZADO/, r.out);
});

test("[X08] --sha-only que sai ec=2: 'referencias indisponiveis (mandato-refs.sh ec=2)', nunca 'SHA … nao esta na saida' — ⇄ X08: a condicao RC=2 sai da l.473 do artefato", () => {
  const refs = shim("refs-ec2.sh", '#!/usr/bin/env bash\necho "uso: mandato-refs.sh <PR> [--sha-only]" >&2\nexit 2\n');
  const r = roda(mandato("x08-sha-only-ec2", [`- head \`${SHA_A}\`, medido por: true`]), "393", refs);
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}referencias indisponiveis \(mandato-refs\.sh ec=2\)/m, r.out);
  assert.doesNotMatch(r.out, /nao esta na saida/, r.out);
});

test("[X09] SHA de 7 hex numa colagem VERIFICADA entra na proveniencia: a prosa que o cita passa — ⇄ X09: `length($0)>=7` -> `>=8` na l.263 do artefato", () => {
  const curto = "abcdef1";
  const refs = shim(
    "refs-x09.sh",
    [
      "#!/usr/bin/env bash",
      `if [ "\${2:-}" = "--sha-only" ]; then printf '%s\\n' "${SHA_A}"; exit 0; fi`,
      `printf '# refs do PR #%s — GERADO por scripts/mandato-refs.sh, para COLAR no mandato\\n' "\${1:-}"`,
      "printf '# gerado em: 2026-10-01T00:00Z · repo: t/t\\n'",
      "printf '\\n'",
      "printf 'ramo:            fix/x\\n'",
      `printf 'merge commit:    %s\\n' "${curto}"`,
      "exit 0",
      "",
    ].join("\n"),
  );
  const corpo = saidaDoRefs("713", refs);
  assert.ok(corpo.some((l) => l.includes(curto)), `◐ a colagem nao traz o SHA curto\n${corpo.join("\n")}`);
  const bloco = ["  ```", ...corpo.map((l) => (l === "" ? "" : `  ${l}`)), "  ```"];
  const r = roda(mandato("x09-sha-curto", [UNIDADE_COLAGEM("713"), ...bloco, "", `- o merge do #713 e \`${curto}\`, medido por: true`]), "393", refs);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^COLAGEM {4}l\.\d+-\d+: refs do PR #713 confere/m, r.out);
});

test("[X11] unidade sem token DEPOIS de linha em branco: a REJ sai SEM a dica 'apos o comando' — ⇄ X11: tirar `ultimaSat=0` da linha em branco (l.399 do artefato)", () => {
  const r = roda(mandato("x11-apos-branco", ["- x, medido por: true", "", "- suite 3058/3060 sem evidencia"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}unidade de MEDIDO sem 'medido por: <comando>' — l\.5: - suite 3058\/3060 sem evidencia$/m, r.out);
  assert.doesNotMatch(r.out, /ap[oó]s o comando/i, r.out);
  // controle NA MESMA rodada: COLADA ao comando (sem a linha em branco), a MESMA unidade leva a dica.
  const ctrl = roda(mandato("x11-ctrl", ["- x, medido por: true", "- suite 3058/3060 sem evidencia"]));
  assert.equal(ctrl.rejeicoes, 1, ctrl.out);
  assert.match(ctrl.out, /ap[oó]s o comando/i, ctrl.out);
});

// --- fronteiras 25 e 27 ---------------------------------------------------------------------------------
test("[F-25] artefato que NAO TERMINA (refs que dorme 120 s): `roda()` falha em 60 s nomeando a causa, em vez de travar a suite — ⇄ tirar o `timeout` de `roda()`", () => {
  const dorme = shimQueDorme("refs-dorme-f25.sh");
  try {
    assert.throws(
      () => roda(mandato("f25-refs-dorme", [`- head \`${SHA_A}\`, medido por: true`]), "393", dorme.caminho),
      /artefato nao terminou em 60 s/,
    );
  } finally {
    writeFileSync(dorme.para, "", "utf8");
  }
  // ◐ o shim e NETO do spawn: sem a parada ele seguiria vivo ate 120 s. O caso so termina quando ele
  // gravou o arquivo de fim -- nenhum processo deste caso fica para tras.
  const espera = spawnSync(
    "bash",
    ["-c", 'for i in $(seq 100); do [ -f "$1" ] && exit 0; sleep 0.2; done; exit 1', "_", dorme.fim.split(path.sep).join("/")],
    { encoding: "utf8" },
  );
  assert.equal(espera.status, 0, "o shim que dorme continuou vivo depois do caso");
});

test("[F-6j] `HEAD:scripts/mandato-refs.sh` com MSYS_NO_PATHCONV=1 no ambiente do spawn: segue OK — ⇄ `RAIZ` em forma POSIX (`/c/...`), que o git.exe recusa sem a conversao do MSYS (fronteira 27)", () => {
  const corpo = ["- li `HEAD:scripts/mandato-refs.sh`, medido por: true"];
  const r = rodaComPath(mandato("f6j-sem-pathconv", corpo), undefined, { env: { MSYS_NO_PATHCONV: "1" } });
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  // controle NA MESMA rodada: sem a variavel, a MESMA citacao passa (e o [F-6i/520]).
  const ctrl = roda(mandato("f6j-ctrl", corpo));
  assert.equal(ctrl.status, 0, ctrl.out);
});

// =================================================================================================
// CICLO 4 -- T4c-3 (errata §15.15(c4)/(d); identidade `dev-tests-ciclo4-b-gov-mandato`). Quatro casos
// [M-EXT] para os pontos 298, 305, 364 e 405: a matriz do ciclo 3 os publicou como cobertos com mutantes
// que nao compilam, e as versoes VIAVEIS (X04, X02, V364, V405 da C2 do ciclo 3) deixavam o guard verde
// com o comportamento mudado. Os quatro asseram o comportamento CERTO -- verdes no head e no S4a --, e o
// vermelho-controle e POR MUTACAO: cada um fica vermelho com a forma viavel do seu ponto (titulo).
// So adicoes; a lista historica de vermelhos (os 24) nao muda.
// =================================================================================================

test("[V298] linha com `grep` sem -i DENTRO de uma colagem VERIFICADA e isenta da checagem 5: COLAGEM confere, 0 REJ — ⇄ X04: `if (isento(num)) return` -> `if (0) return` em coletaGrep", () => {
  const refs = shim(
    "refs-v298.sh",
    [
      "#!/usr/bin/env bash",
      `printf '# refs do PR #%s — GERADO por scripts/mandato-refs.sh, para COLAR no mandato\\n' "\${1:-}"`,
      `printf '# gerado em: %s-%s · repo: t/t\\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$$"`,
      "printf '\\n'",
      "printf 'ramo:            fix/x\\n'",
      `printf 'dica:            grep -c "aprovado" J-%s.md\\n' "\${1:-}"`,
      "exit 0",
      "",
    ].join("\n"),
  );
  const corpo = saidaDoRefs("714", refs);
  assert.ok(corpo.some((l) => /grep -c "aprovado"/.test(l)), `◐ a colagem nao traz a linha com grep sem -i\n${corpo.join("\n")}`);
  const bloco = ["  ```", ...corpo.map((l) => (l === "" ? "" : `  ${l}`)), "  ```"];
  const r = roda(mandato("v298-grep-na-colagem", [UNIDADE_COLAGEM("714"), ...bloco]), undefined, refs);
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^COLAGEM {4}l\.\d+-\d+: refs do PR #714 confere/m, r.out);
  // controle NA MESMA rodada: a MESMA linha FORA da colagem e cobrada pela checagem 5.
  const ctrl = roda(mandato("v298-ctrl", ['- dica, medido por: grep -c "aprovado" J-714.md']));
  assert.equal(ctrl.rejeicoes, 1, ctrl.out);
  assert.match(ctrl.out, /^REJEITADO {2}invocacao de grep\/rg SEM -i/m, ctrl.out);
});

test("[V305] `caixa-exata:` num segmento SEM grep nao isenta nada e nao gera AVISO: PRE-VOO OK sem 'caixa-exata: isenta' — ⇄ X02: `if (c == 0) continue` -> `if (c == 0) ;` em coletaGrep", () => {
  const r = roda(mandato("v305-caixa-sem-grep", ["- x, medido por: `true # caixa-exata: nada a isentar`"]));
  assert.equal(r.rejeicoes, 0, r.out);
  assert.equal(r.status, 0, r.out);
  assert.doesNotMatch(r.out, /caixa-exata: isenta/, `segmento sem invocacao nao tem o que isentar\n${r.out}`);
  // controle NA MESMA rodada: com UM grep no segmento, o AVISO existe e conta 1.
  const ctrl = roda(mandato("v305-ctrl", ["- x, medido por: grep -c NAOAPARECE CLAUDE.md caixa-exata: literal"]));
  assert.equal(ctrl.status, 0, ctrl.out);
  assert.match(ctrl.out, /^AVISO {6}caixa-exata: isenta 1 invocacao\(oes\) sem -i — l\.3/m, ctrl.out);
});

test("[V364] corrida hexadecimal de 41 caracteres: EXATAMENTE 1 REJ, a de corrida, e ela nunca vira SHA para a proveniencia — ⇄ V364: sem o `continue` do ramo HEXLONGO", () => {
  const corrida = `${SHA_A}a`;
  assert.equal(corrida.length, 41, "◐ a corrida nao tem 41 hex");
  const r = roda(mandato("v364-hex41", [`- head ${corrida} medido por: true`]), "393");
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}corrida hexadecimal de 41 caracteres/m, r.out);
  assert.doesNotMatch(r.out, /nao esta na saida/, `a corrida longa nao e SHA: a checagem 4 nao pode cobra-la\n${r.out}`);
  // controle NA MESMA rodada: um SHA de 40 fabricado, com o MESMO PR e o MESMO shim, cai pela checagem 4.
  const ctrl = roda(mandato("v364-ctrl", [`- head ${FAKE(57)} medido por: true`]), "393");
  assert.equal(ctrl.rejeicoes, 1, ctrl.out);
  assert.match(ctrl.out, new RegExp(`^REJEITADO {2}SHA '${FAKE(57)}' nao esta na saida`, "m"), ctrl.out);
});

test("[V405] o CABECALHO de tabela e UMA unidade: `grep` sem -i nele da EXATAMENTE 1 REJ, nomeando a l.3 — ⇄ V405: sem o `continue` final do ramo do cabecalho (ele cai tambem como linha de tabela)", () => {
  const r = roda(mandato("v405-cabecalho-grep", ["| conta `grep -c foo x` | medido por: |", "|---|---|", "| CI 14/14 | gh pr checks |"]));
  assert.equal(r.status, 1, r.out);
  assert.equal(r.rejeicoes, 1, r.out);
  assert.match(r.out, /^REJEITADO {2}invocacao de grep\/rg SEM -i[^\n]*l\.3:/m, r.out);
  // controle NA MESMA rodada: o MESMO cabecalho com -i nao cai (o cabecalho nomeia a coluna de evidencia).
  const ctrl = roda(mandato("v405-ctrl", ["| conta `grep -ic foo x` | medido por: |", "|---|---|", "| CI 14/14 | gh pr checks |"]));
  assert.equal(ctrl.rejeicoes, 0, ctrl.out);
  assert.equal(ctrl.status, 0, ctrl.out);
});
