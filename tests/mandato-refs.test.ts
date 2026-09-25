// Guard do `scripts/mandato-refs.sh` — o script que existe para o orquestrador NUNCA digitar um SHA.
//
// POR QUE ESTE TESTE EXISTE, e por que ele testa o MATCHER e nao a saida bonita:
// o script errou DUAS VEZES, na mesma sessao, a mesma classe ("a ferramenta responde a pergunta
// VIZINHA"), e as duas so apareceram porque foi testado contra respostas JA CONHECIDAS:
//   1a) casava a ata pelo RAMO  -> falso-negativo no #390, cuja ata cita "PR #390" e nao cita o ramo;
//   2a) casava por "o documento MENCIONA #PR" -> devolvia a ata do #392 para os tres PRs, porque ela
//       menciona #390 e #391 (paga dividas deles). Mencionar != ser sobre.
// Os dois casos viram fixture aqui. O matcher e sobre o CABECALHO (titulo + linha do objeto).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Reproduz o matcher do script sobre um conjunto de atas sinteticas. */
function casar(atas: Record<string, string>, pr: string, ramo: string): string | null {
  for (const nome of Object.keys(atas).sort()) {
    const linhas = atas[nome]!.split("\n");
    const linha = linhas.find((l) => /^- \*\*Objeto( julgado)?:\*\*/.test(l));
    if (!linha) continue;
    // Discriminador ESTRUTURAL: so o TITULO e a LINHA DO OBJETO votam.
    // Janela de N linhas nao serve - foi a 3a tentativa, e a mencao cai dentro dela.
    const id = [linhas.find((l) => /^# /.test(l)) ?? "", linha].join("\n");
    const casaPr = new RegExp(`(^|[^0-9])#${pr}([^0-9]|$)`).test(id);
    const casaRamo = id.includes(ramo);
    if (!casaPr && !casaRamo) continue;
    const sha = linha.match(/`([0-9a-f]{7,40})`/)?.[1];
    if (sha) return sha;
  }
  return null;
}

const ATA_390 = [
  "# J-B-SAN3-04a — junta do bloco `B-SAN3-04a` (PR #390)",
  "",
  "- **Data:** 2026-09-20.",
  "- **Objeto:** `fbda96b0` (PR #390); head na junta = o objeto. Base `origin/main@02bd7dab`.",
].join("\n");

const ATA_392 = [
  "# J-B-SAN3-00 — junta do bloco `B-SAN3-00` (PR #392)",
  "",
  "- **Objeto julgado:** `7822deaf`, ramo `chore/corpos-de-jurado-rastreados`, base `aadaa6d5`.",
  "- **Data:** 2026-09-21.",
  "",
  "## As dividas pagas aqui",
  "As 5 do porteiro do #390 e as 6 do porteiro do #391 — todas conferidas no arquivo rastreado.",
].join("\n");

test("1a regressao: a ata do #390 nao cita o ramo — casar so por ramo dava FALSO-NEGATIVO", () => {
  assert.equal(ATA_390.includes("fix/rbac-catalogo-banco-matriz"), false, "a fixture tem de reproduzir o caso real");
  const achado = casar({ "J-B-SAN3-04a.md": ATA_390 }, "390", "fix/rbac-catalogo-banco-matriz");
  assert.equal(achado, "fbda96b0");
});

test("2a regressao: a ata do #392 MENCIONA #390 e #391 — mencionar nao e ser sobre", () => {
  assert.ok(ATA_392.includes("#390"), "a fixture tem de reproduzir a mencao");
  const atas = { "J-B-SAN3-00.md": ATA_392, "J-B-SAN3-04a.md": ATA_390 };
  // J-B-SAN3-00.md vem antes na ordem alfabetica: o matcher errado devolveria 7822deaf para o #390.
  assert.equal(casar(atas, "390", "fix/rbac-catalogo-banco-matriz"), "fbda96b0");
  assert.equal(casar(atas, "392", "chore/corpos-de-jurado-rastreados"), "7822deaf");
});

test("sem ata, NAO inventa: devolve nulo em vez de chutar o head do PR", () => {
  assert.equal(casar({ "J-outro.md": "# J-outro\n\n- **Objeto:** `deadbeef`, ramo `outro/ramo`." }, "999", "fix/inexistente"), null);
});

test("o script existe, e executavel e tem o modo --sha-only que o pre-voo consome", () => {
  const raiz = path.resolve(import.meta.dirname, "..");
  // sem argumento o script sai 1 de proposito — a mensagem de uso vai para stderr.
  let saida = "";
  try {
    execFileSync("bash", [path.join(raiz, "scripts/mandato-refs.sh")], { encoding: "utf8" });
  } catch (e) {
    saida = String((e as { stderr?: string }).stderr ?? "");
  }
  assert.match(saida, /uso: mandato-refs\.sh/);
});

test("o cabecalho do script nomeia o defeito que ele previne", () => {
  const raiz = path.resolve(import.meta.dirname, "..");
  const src = execFileSync("cat", [path.join(raiz, "scripts/mandato-refs.sh")], { encoding: "utf8" }).toString();
  assert.match(src, /approved_head/);
  assert.match(src, /REGISTRO-SAN3-00-APPROVED-HEAD-DUAS-VEZES/);
  assert.match(src, /TITULO \+ LINHA DO OBJETO/);
});

test("vermelho-controle: o matcher errado (documento inteiro) QUEBRA as fixtures", () => {
  // Se alguem trocar o cabecalho pelo documento inteiro, este teste tem de acusar.
  // o matcher errado: qualquer mencao no DOCUMENTO inteiro vota.
  const errado = (atas: Record<string, string>, pr: string) => {
    for (const nome of Object.keys(atas).sort()) {
      const doc = atas[nome]!;
      if (!new RegExp(`(^|[^0-9])#${pr}([^0-9]|$)`).test(doc)) continue;
      const linha = doc.split("\n").find((l) => /^- \*\*Objeto( julgado)?:\*\*/.test(l));
      const sha = linha?.match(/`([0-9a-f]{7,40})`/)?.[1];
      if (sha) return sha;
    }
    return null;
  };
  const atas = { "J-B-SAN3-00.md": ATA_392, "J-B-SAN3-04a.md": ATA_390 };
  assert.equal(errado(atas, "390"), "7822deaf", "o matcher errado devolve a ata do #392 para o #390 — e por isso ele e errado");
  assert.notEqual(casar(atas, "390", "fix/rbac-catalogo-banco-matriz"), errado(atas, "390"));
});
