import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// B-INFRA-RDS-CA — o driver `pg` trata `sslmode=require` como `verify-full`, e o Node não conhece a
// autoridade certificadora do RDS. Medido em 23/11/2026, contra o RDS de produção, pelo túnel do Session
// Manager: sem o pacote, a conexão é recusada ("self-signed certificate in certificate chain"); com o
// pacote e o nome real do RDS, conecta em TLS 1.3; com o pacote e um nome errado, é recusada. Esta guarda
// falha se a imagem perder o pacote, se o Node deixar de apontar para ele, ou se o pacote não tiver a
// autoridade que assina o banco desta conta (`rds-ca-rsa2048-g1`, roteiro da AWS, passo 2.3).

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (relativo: string) => readFileSync(path.join(repoRoot, relativo), "utf8");
const BUNDLE = "docker/certs/rds-global-bundle.pem";

function estagioRuntime(dockerfile: string): string {
  const linhas = dockerfile.split(/\r?\n/);
  const inicio = linhas.findIndex((l) => /^FROM\s+\S+\s+AS\s+runtime\s*$/i.test(l.trim()));
  assert.ok(inicio >= 0, "o Dockerfile precisa ter o estágio `AS runtime`");
  const fim = linhas.findIndex((l, i) => i > inicio && /^FROM\s/i.test(l.trim()));
  return linhas.slice(inicio, fim < 0 ? undefined : fim).join("\n");
}

function certificados(pem: string): X509Certificate[] {
  return pem
    .split(/(?=-----BEGIN CERTIFICATE-----)/)
    .filter((bloco) => bloco.includes("-----BEGIN CERTIFICATE-----"))
    .map((bloco) => new X509Certificate(bloco));
}

test("a imagem de runtime copia o pacote do RDS e o Node confia nele (NODE_EXTRA_CA_CERTS)", () => {
  const runtime = estagioRuntime(ler("Dockerfile"));
  const copia = runtime.match(/^COPY\s+docker\/certs\/rds-global-bundle\.pem\s+(\S+)\s*$/m);
  assert.ok(copia, "o estágio runtime precisa copiar docker/certs/rds-global-bundle.pem");
  const destino = copia[1];
  const env = runtime.match(/^ENV\s+NODE_EXTRA_CA_CERTS=(\S+)\s*$/m);
  assert.ok(env, "o estágio runtime precisa definir ENV NODE_EXTRA_CA_CERTS");
  assert.equal(env[1], destino, "NODE_EXTRA_CA_CERTS precisa apontar para o arquivo copiado");
  const idxEnv = runtime.indexOf(env[0]);
  const idxCmd = runtime.search(/^CMD\s/m);
  assert.ok(idxCmd < 0 || idxEnv < idxCmd, "o ENV precisa vir antes do CMD");
});

test("o pacote do RDS existe, todos os certificados abrem e nenhum está vencido", () => {
  const certs = certificados(ler(BUNDLE));
  assert.ok(certs.length >= 1, "o pacote precisa ter ao menos 1 certificado");
  const agora = Date.now();
  const vencidos = certs.filter((c) => new Date(c.validTo).getTime() < agora).map((c) => c.subject);
  assert.deepEqual(vencidos, [], "nenhum certificado do pacote pode estar vencido");
});

test("o pacote traz a autoridade que assina o banco desta conta (us-east-1, RSA2048 G1)", () => {
  const certs = certificados(ler(BUNDLE));
  const alvo = certs.filter((c) => /Amazon RDS us-east-1 Root CA RSA2048 G1/.test(c.subject));
  assert.ok(alvo.length >= 1, "falta a autoridade Amazon RDS us-east-1 Root CA RSA2048 G1");
  assert.ok(alvo.every((c) => c.ca), "a autoridade precisa ser um certificado de CA");
});

test("o .dockerignore não tira o pacote do contexto da imagem", () => {
  const ignorados = ler(".dockerignore")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const tira = ignorados.filter((l) => /^\/?docker(\/|\/certs\/?|\/certs\/rds-global-bundle\.pem)?$/.test(l) || l === "*.pem");
  assert.deepEqual(tira, [], "o .dockerignore não pode excluir docker/certs/rds-global-bundle.pem");
});
