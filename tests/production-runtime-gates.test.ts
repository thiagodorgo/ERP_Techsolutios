import assert from "node:assert/strict";
import test from "node:test";

import { envSchema } from "../src/config/env.js";

// B-O6R-05 — os gates de RUNTIME de produção do `env.ts` (Ω6R-DAT-001 + Ω6R-DIN-006).
//
// Ω6R-DAT-001: produção podia subir com o agregado core-saas EM MEMÓRIA — organizações, usuários,
// papéis/vínculos e a auditoria desse agregado viviam na RAM do processo e sumiam no restart. Bastava omitir
// CORE_SAAS_PERSISTENCE (o default do schema era "memory"), e o `Dockerfile` de runtime já faz
// `ENV NODE_ENV=production`: toda execução da imagem oficial era "produção" com default de memória.
// O mesmo valia para DATABASE_URL (só lida de `process.env`, nunca validada) e para REDIS_URL (default
// `redis://localhost:6379` NO SCHEMA — fila isolada dentro do contêiner, perdida no restart).
//
// Ω6R-DIN-006: JOBS_WORKER_ENABLED tinha default `false` e nenhum manifesto o declarava — o worker de jobs
// NUNCA subia em produção, então diária de pátio, reconciliação de custódia e notificação legal jamais eram
// materializadas.
//
// Disciplina destes testes (espelho de `tests/portal-env.test.ts`): um baseline de produção VÁLIDO, e cada
// caso remove/adultera UM campo provando que o schema REJEITA (fail-closed). Sem o baseline aceito, todos os
// casos de rejeição seriam vacuamente verdadeiros.

const PROD_OK = {
  NODE_ENV: "production",
  // Gates pré-existentes (segredo/CORS) — satisfeitos para que a rejeição observada seja SÓ a de runtime.
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
  CORS_ORIGIN: "https://app.exemplo.com",
  PORTAL_SESSION_SECRET: "a-real-production-portal-session-secret",
  PORTAL_LOG_SECRET: "a-real-production-portal-log-secret",
  PORTAL_AUTHORITY_SESSION_SECRET: "a-real-production-authority-session-secret",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
  // Gates de runtime deste bloco.
  CORE_SAAS_PERSISTENCE: "prisma",
  DATABASE_URL: "postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public",
  JOBS_WORKER_ENABLED: "true",
  REDIS_URL: "redis://redis.interno.exemplo.com:6379",
};

function merge(overrides: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...PROD_OK, ...overrides } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete merged[key]; // simula a var AUSENTE do ambiente
  }
  return merged;
}

function rejectsOn(overrides: Record<string, unknown>, path: string): void {
  const result = envSchema.safeParse(merge(overrides));
  assert.equal(result.success, false, `esperava REJEITAR quando ${path} é inválido/ausente`);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((issue) => issue.path.includes(path)),
      `esperava issue no caminho ${path}, veio: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  }
}

function accepts(overrides: Record<string, unknown>): void {
  const result = envSchema.safeParse(merge(overrides));
  assert.equal(
    result.success,
    true,
    result.success ? "" : `esperava ACEITAR, rejeitou em: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
  );
}

// ── Sanidade ───────────────────────────────────────────────────────────────────────────────────────────────

test("baseline: produção com persistência, banco, worker e Redis remoto → schema ACEITA", () => {
  accepts({});
});

// ── G1 · Ω6R-DAT-001 — agregado core-saas em memória ───────────────────────────────────────────────────────

test("G1: produção SEM CORE_SAAS_PERSISTENCE (cai no default 'memory') → REJEITA", () => {
  rejectsOn({ CORE_SAAS_PERSISTENCE: undefined }, "CORE_SAAS_PERSISTENCE");
});

test("G1: produção com CORE_SAAS_PERSISTENCE='memory' explícito → REJEITA", () => {
  rejectsOn({ CORE_SAAS_PERSISTENCE: "memory" }, "CORE_SAAS_PERSISTENCE");
});

// ── G2 · Ω6R-DAT-001 — banco declarado ─────────────────────────────────────────────────────────────────────

test("G2: produção SEM DATABASE_URL → REJEITA", () => {
  rejectsOn({ DATABASE_URL: undefined }, "DATABASE_URL");
});

test("G2: produção com DATABASE_URL vazia → REJEITA", () => {
  rejectsOn({ DATABASE_URL: "" }, "DATABASE_URL");
});

test("G2: produção com DATABASE_URL só de espaços → REJEITA (o trim não deixa passar por 'não-vazia')", () => {
  rejectsOn({ DATABASE_URL: "   " }, "DATABASE_URL");
});

// ── G3 · Ω6R-DIN-006 — worker de jobs ──────────────────────────────────────────────────────────────────────

test("G3: produção SEM JOBS_WORKER_ENABLED (cai no default false) → REJEITA", () => {
  rejectsOn({ JOBS_WORKER_ENABLED: undefined }, "JOBS_WORKER_ENABLED");
});

// `booleanFlag` é ESTRITO de propósito: só true/1/yes/on ligam. Se alguém trocasse por `z.coerce.boolean()`,
// a STRING "false" viraria `true` e o gate passaria a aceitar exatamente o ambiente que ele existe para barrar.
for (const desligado of ["false", "0", "off", "no"]) {
  test(`G3: produção com JOBS_WORKER_ENABLED='${desligado}' → REJEITA (parse estrito, sem coerção)`, () => {
    rejectsOn({ JOBS_WORKER_ENABLED: desligado }, "JOBS_WORKER_ENABLED");
  });
}

// ── G5 · Ω6R-DAT-001 — fila de jobs fora do loopback ───────────────────────────────────────────────────────

test("G5: produção SEM REDIS_URL → REJEITA (o default do schema deixava de ser detectável)", () => {
  rejectsOn({ REDIS_URL: undefined }, "REDIS_URL");
});

test("G5: produção com REDIS_URL='redis://localhost:6379' → REJEITA", () => {
  rejectsOn({ REDIS_URL: "redis://localhost:6379" }, "REDIS_URL");
});

test("G5: produção com REDIS_URL='redis://127.0.0.1:6379' → REJEITA", () => {
  rejectsOn({ REDIS_URL: "redis://127.0.0.1:6379" }, "REDIS_URL");
});

test("G5 não é over-broad: produção com Redis de serviço ('redis://redis:6379') → ACEITA", () => {
  accepts({ REDIS_URL: "redis://redis:6379" });
});

// O par {localhost, 127.0.0.1} não fechava a família. Cada um dos hosts abaixo foi MEDIDO passando
// no gate antes desta correção, e todos causam o mesmo dano do loopback: fila por instância, não
// compartilhada, perdida no restart. Sem estes casos, fechar o conjunto seria promessa de comentário.
for (const [host, porque] of [
  ["redis://host.docker.internal:6379", "Docker Desktop resolve para a MÁQUINA de quem subiu o compose"],
  ["redis://gateway.docker.internal:6379", "mesmo mecanismo, pelo gateway da rede do Docker Desktop"],
  ["redis://0.0.0.0:6379", "como destino de conexão, no Linux, é o próprio loopback"],
  ["redis://[::1]:6379", "loopback IPv6 — o hostname vem entre colchetes na URL"],
  ["redis://[0:0:0:0:0:0:0:1]:6379", "o mesmo ::1 escrito por extenso: a URL canoniza o IPv6 antes do gate"],
  ["redis://127.0.0.2:6379", "o bloco de loopback é 127.0.0.0/8 INTEIRO (decidido pelo 1º octeto), não só o .1"],
  ["redis://HOST.DOCKER.INTERNAL:6379", "a comparação é feita em minúsculas; maiúscula não é fuga"],
] as const) {
  test(`G5: produção com '${host}' → REJEITA (${porque})`, () => {
    rejectsOn({ REDIS_URL: host }, "REDIS_URL");
  });
}

// ── G5 · a correção do MÉDIO: decidir por ENDEREÇO, não por literal escrito ─────────────────────────────────
// O gate afirmava cobrir "o bloco de loopback inteiro (127.0.0.0/8)" e entregava só a forma de QUATRO
// OCTETOS (`/^127(?:\.\d{1,3}){3}$/`) mais seis nomes literais. As sete notações abaixo foram MEDIDAS
// ACEITAS com este mesmo baseline de produção — cada uma é um destino local que o gate existe para barrar:
// `127.1` é notação `inet_aton` legal, e o resolvedor do sistema a traduz para 127.0.0.1. Um manifesto com
// REDIS_URL=redis://127.1:6379 passava, e a fila de jobs + o sinal de vida do worker iam para dentro do
// contêiner. O predicado passou a converter o host em ENDEREÇO de 32 bits e a decidir por ele.
for (const [host, porque] of [
  ["redis://127.1:6379", "forma curta a.b do inet_aton — a última parte absorve os octetos omitidos"],
  ["redis://127.0.1:6379", "forma curta a.b.c, mesmo endereço"],
  ["redis://127.0.0.1.:6379", "o literal da própria mensagem do gate, com o ponto final da raiz do FQDN"],
  ["redis://0:6379", "o mesmo 0.0.0.0 que o gate já dizia recusar, escrito com um único rótulo"],
  ["redis://2130706433:6379", "0x7f000001 em decimal — um rótulo só, endereço idêntico a 127.0.0.1"],
  ["redis://localhost.:6379", "'localhost' com o ponto da raiz: mesmo destino, e a lista de nomes não casava"],
  ["redis://[::ffff:127.0.0.1]:6379", "IPv4-mapeado — a URL devolve a forma COMPRIMIDA [::ffff:7f00:1]"],
] as const) {
  test(`G5: produção com '${host}' → REJEITA (${porque})`, () => {
    rejectsOn({ REDIS_URL: host }, "REDIS_URL");
  });
}

// As mesmas famílias, nas formas que o parser numérico passou a cobrir junto — octal e hexadecimal são
// notações legais do `inet_aton`, e o `::` é o gêmeo IPv6 do `0.0.0.0` que também estava ACEITO.
for (const [host, porque] of [
  ["redis://0177.0.0.1:6379", "0177 é 127 em OCTAL (o zero à frente): mesmo endereço"],
  ["redis://0x7f000001:6379", "o endereço inteiro em HEXADECIMAL, num rótulo só"],
  ["redis://0x7f.1:6379", "hexadecimal na 1ª parte + forma curta na 2ª"],
  ["redis://127.1.:6379", "forma curta E ponto de raiz na mesma URL"],
  ["redis://[::]:6379", "não-especificado IPv6 — como destino de conexão é o gêmeo do 0.0.0.0"],
  ["redis://[::ffff:0:0]:6379", "IPv4-mapeado do 0.0.0.0"],
  ["redis://127%2E0%2E0%2E1:6379", "escape percentual do ponto — host legítimo nenhum traz '%'"],
] as const) {
  test(`G5: produção com '${host}' → REJEITA (${porque})`, () => {
    rejectsOn({ REDIS_URL: host }, "REDIS_URL");
  });
}

// Host formado SÓ por rótulos numéricos que NÃO formam endereço válido. O regex antigo de quatro octetos
// já recusava `127.0.0.256` (aceitava três dígitos sem checar o intervalo); decidir por endereço, sozinho,
// PASSARIA a aceitá-lo — um afrouxamento silencioso. Vale aqui a mesma doutrina do host vazio: nome DNS
// legítimo não é só dígitos e pontos (o rótulo final não pode ser todo numérico), logo é "não sei para
// onde isto aponta", e não-sei é recusa.
for (const [host, porque] of [
  ["redis://127.0.0.256:6379", "fora do intervalo do octeto — o regex antigo já recusava e continua recusado"],
  ["redis://999.0.0.1:6379", "idem, na primeira parte"],
  ["redis://1.2.3.4.5:6379", "cinco rótulos: o inet_aton só aceita de um a quatro"],
] as const) {
  test(`G5: produção com '${host}' → REJEITA (${porque})`, () => {
    rejectsOn({ REDIS_URL: host }, "REDIS_URL");
  });
}

// A outra metade da mesma regra: fechar o conjunto não pode barrar deploy legítimo. Um Redis
// declarado por nome de serviço ou por host interno continua ACEITO — inclusive um nome que começa
// com dígitos, que um casamento frouxo de "127." recusaria por engano.
//
// Estes casos são o CONTRAPESO da decisão por endereço: se o parser numérico ficar largo a ponto de
// tratar NOME como literal IPv4, é aqui que a correção cai. `redis://redis:6379` (serviço nomeado) é
// exigido pela tabela §8.1 do plano; recusá-lo é reprovação, não zelo.
for (const host of [
  "redis://cache-prod.interno.exemplo.com:6379",
  "redis://127-cache.interno.exemplo.com:6379",
  "rediss://cache.interno.exemplo.com:6380",
  // Endereço público literal: prova que a recusa é do BLOCO 127/8 e do 0.0.0.0, não de "host numérico".
  "redis://203.0.113.10:6379",
  // Nome que COMEÇA com dígitos sem ser IPv4 válido — o rótulo "8x8" tem forma numérica só pela metade.
  "redis://8x8-cache.interno.exemplo.com:6379",
  // IPv4-mapeado de um endereço PÚBLICO: o ramo do ::ffff: decide por endereço, não recusa a família toda.
  "redis://[::ffff:203.0.113.10]:6379",
]) {
  test(`G5 não é over-broad: produção com '${host}' → ACEITA`, () => {
    accepts({ REDIS_URL: host });
  });
}

// ── G5 · o que o gate NÃO decide, dito como asserção (pendência, não cobertura) ─────────────────────────────
// O predicado decide por ENDEREÇO e por NOME conhecido; não resolve DNS no boot. Os hosts abaixo continuam
// ACEITOS e a documentação do `env.ts` diz isso com todas as letras — o defeito que reprovou este bloco foi
// exatamente afirmar cobertura que o código não entregava. Se um dia algum deles for fechado, este teste
// falha e obriga a atualizar a afirmação junto com o código.
for (const [host, porque] of [
  ["redis://localhost.localdomain:6379", "alias de /etc/hosts — só se revela loopback na RESOLUÇÃO"],
  ["redis://127.0.0.1.exemplo.com:6379", "DNS curinga (estilo nip.io) resolve para 127.0.0.1, mas é NOME"],
  ["redis://[::ffff:0:7f00:1]:6379", "IPv4-translated: outro prefixo, só chega a destino via tradutor SIIT"],
  ["redis://[64:ff9b::7f00:1]:6379", "NAT64: idem, depende de um gateway de tradução"],
] as const) {
  test(`G5 pendência declarada: produção com '${host}' → ACEITA (${porque})`, () => {
    accepts({ REDIS_URL: host });
  });
}

// URL SEM HOST — o gate falhava ABERTO aqui, e não em tese:
//  · `redis//host:6379` (faltam os dois-pontos do esquema) faz `new URL(...)` lançar; o `catch` do
//    gate devolve string vazia, que não casava com host local nenhum. Quem rejeitava era só a
//    validação `.url()` do campo, e nada amarrava isso ao gate: trocá-la por uma validação de
//    string frouxa fazia o boot ACEITAR uma URL que o cliente Redis rebenta no 1º comando.
//  · `redis:6379` é URL VÁLIDA para `.url()` (esquema + caminho, sem host). Chegava ao gate com
//    hostname vazio pelo caminho normal e foi MEDIDA ACEITA — nem o `.url()` protegia.
// Hostname vazio passou a ser recusa explícita, e estes casos amarram as duas metades: a recusa
// existe E aponta para o Redis.
for (const semHost of ["redis//redis.interno.exemplo.com:6379", "nao-e-url", "redis:6379"]) {
  test(`G5: produção com REDIS_URL sem host declarado ('${semHost}') → REJEITA no caminho do Redis`, () => {
    rejectsOn({ REDIS_URL: semHost }, "REDIS_URL");
  });
}

// A outra camada, que os casos acima não exercitam mais (o gate agora recusa sozinho): a validação
// de URL do CAMPO, que vale em todo ambiente. MUTAÇÃO QUE ESTE CASO MATA: trocar `.url()` por uma
// validação de string simples — dev/test passariam a aceitar lixo no lugar da URL do Redis.
test("G5: a validação de URL do campo vale FORA de produção também (dev com lixo → REJEITA)", () => {
  const result = envSchema.safeParse({ NODE_ENV: "development", REDIS_URL: "nao-e-url" });

  assert.equal(result.success, false, "fora de produção o campo continua tendo de ser uma URL");
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.includes("REDIS_URL")));
  }
});

// O default do REDIS_URL saiu do SCHEMA e foi para o EXPORT (espelho exato do JWT_SECRET). A diferença não é
// cosmética: com `.default()` no schema, "ninguém declarou Redis" e "declararam localhost" viram o MESMO
// valor, e o gate perde a informação de que a variável está ausente. Hoje isso ainda REJEITA porque o default
// era localhost — mas trocá-lo por um host qualquer (`redis://redis:6379`) faria a omissão passar calada.
// Este teste crava o contrato para que essa regressão silenciosa não seja possível.
test("G5: o schema NÃO fabrica REDIS_URL — o default de dev vive no export, como no JWT_SECRET", () => {
  const parsed = envSchema.parse({ NODE_ENV: "development" });
  assert.equal(
    parsed.REDIS_URL,
    undefined,
    "default no SCHEMA torna 'não declarado' indistinguível de 'declarado como localhost'",
  );
  assert.equal(parsed.JWT_SECRET, undefined, "o padrão espelhado: optional no schema, `??` no export");
});

test("G5: o export `env` continua entregando REDIS_URL como string (consumidores intocados)", async () => {
  const { env } = await import("../src/config/env.js");
  assert.equal(typeof env.REDIS_URL, "string");
  assert.ok(env.REDIS_URL.length > 0);
});

// ── A quase-vítima, documentada ────────────────────────────────────────────────────────────────────────────
// `tests/persistent-rbac-middleware.test.ts` gera um PROCESSO FILHO com exatamente a combinação que G1+G2
// proíbem (CORE_SAAS_PERSISTENCE="memory" + DATABASE_URL="" + JWT_SECRET dev-only). Ele NÃO foi editado e
// continua verde porque nem o job `backend` nem o `backend-postgres` setam NODE_ENV=production — o filho
// nasce em ambiente de teste. O fato fica registrado AQUI, como asserção: sob produção, aquela combinação é
// rejeitada. Se um dia alguém puser NODE_ENV=production naquele spawn, este teste explica o porquê da quebra.
test("documental: a combinação do processo filho do persistent-rbac, SOB PRODUÇÃO, seria REJEITADA", () => {
  const result = envSchema.safeParse(
    merge({
      CORE_SAAS_PERSISTENCE: "memory",
      DATABASE_URL: "",
      JWT_SECRET: "dev-only-change-me",
      JWT_EXPIRES_IN: "15m",
      LOG_LEVEL: "silent",
    }),
  );
  assert.equal(result.success, false);
  if (!result.success) {
    const paths = result.error.issues.map((issue) => issue.path.join("."));
    for (const expected of ["CORE_SAAS_PERSISTENCE", "DATABASE_URL", "JWT_SECRET"]) {
      assert.ok(paths.includes(expected), `esperava issue em ${expected}, veio: ${paths.join(", ")}`);
    }
  }
});

// ── Fora de produção os gates NÃO se aplicam ───────────────────────────────────────────────────────────────

test("desenvolvimento sem nenhuma das quatro variáveis → ACEITA (só produção é barrada)", () => {
  assert.equal(envSchema.safeParse({ NODE_ENV: "development" }).success, true);
});

test("teste sem nenhuma das quatro variáveis → ACEITA (a suíte roda em memória de propósito)", () => {
  assert.equal(envSchema.safeParse({ NODE_ENV: "test" }).success, true);
});

// ── Regressão: os gates novos não afrouxaram nenhum dos treze anteriores ───────────────────────────────────

test("regressão: produção sem JWT_SECRET continua REJEITANDO com os gates de runtime satisfeitos", () => {
  rejectsOn({ JWT_SECRET: undefined }, "JWT_SECRET");
});

test("regressão: produção com CORS_ORIGIN='*' continua REJEITANDO", () => {
  rejectsOn({ CORS_ORIGIN: "*" }, "CORS_ORIGIN");
});

test("regressão: produção sem PORTAL_SESSION_SECRET continua REJEITANDO", () => {
  rejectsOn({ PORTAL_SESSION_SECRET: undefined }, "PORTAL_SESSION_SECRET");
});

test("regressão: produção com PORTAL_AUTHORITY_SESSION_SECRET === JWT_SECRET continua REJEITANDO", () => {
  rejectsOn({ PORTAL_AUTHORITY_SESSION_SECRET: PROD_OK.JWT_SECRET }, "PORTAL_AUTHORITY_SESSION_SECRET");
});

test("regressão: produção + Nominatim público continua REJEITANDO", () => {
  rejectsOn(
    { GEOCODING_ENABLED: "true", NOMINATIM_BASE_URL: "https://nominatim.openstreetmap.org/search" },
    "GEOCODING_ENABLED",
  );
});
