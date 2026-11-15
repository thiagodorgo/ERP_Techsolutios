// B-SAN3-10b-F4-SEED-ISOLADO (item 44) — a FUNDACAO contra o Postgres REAL (C4-db do plano v2, com os casos
// das Emendas 1 e 1.1), e a linha de comando da fundacao nas travas que nao abrem conexao.
//
// PARTE 1, sem banco (sempre roda): a linha de comando de verdade, num processo filho, recusa antes de conectar:
//   sem `--saida-segredo` (4), argumento fora da lista (2), producao (2), a URL da pilha sem o corte do sufixo
//   (2), trava ocupada (3) e o dotenv por VALOR de argumento, que so a reconferencia do alvo pega (2 ALVO_MUDOU).
//   Nenhuma saida leva URL de banco.
//
// PARTE 2, com banco (DB-gated: sem DATABASE_URL o arquivo DECLARA o pulo). Bases PROPRIAS E DESCARTAVEIS,
// clonadas de um modelo deste arquivo (`CREATE DATABASE … TEMPLATE`), com `migrate deploy`, o `provision-rbac`
// e a organizacao `platform` com usuario `.invalid` pelo `bootstrapPlatformAdmin` exportado. A fundacao roda
// com o store do produto INJETADO no cliente da base do teste:
//   (1) cria a organizacao e o admin (criados=2), credencial com must_change_password=true;
//   (9) o arquivo do id da plataforma (36 bytes, igual ao banco) e a saida sem o id nem a provisoria;
//   (2) a 2a chamada da criados=0;
//   (5) provisoria apagada -> 3 PROVISORIA_PERDIDA;  (5b) provisoria com 0 bytes -> 3 PROVISORIA_PERDIDA;
//   (9b) arquivo do id de outra base -> 3 SAIDA_DE_OUTRA_BASE;
//   (4) e-mail da plataforma fora de `.invalid` -> 3 PLATAFORMA_REAL;
//   (3) outra organizacao criada pelo servico -> 3 ALVO_NAO_VIRGEM;
//   (6) duas fundacoes em Promise.all no MESMO diretorio -> exatamente uma 3 FUNDACAO_EM_CURSO, 1 organizacao;
//   (7) o gancho `aposCriar` cria a duplicata entre a criacao e a releitura -> 3 CORRIDA_DETECTADA;
//   (8) a plataforma sem usuario -> 3 BASE_SEM_OP6, nada criado.
// Em toda recusa, as contagens de `tenants`, `users`, `audit_logs` e `local_auth_credentials` nao mudam.
//
// O cliente GLOBAL do produto vira uma sentinela que FALHA se for usado: a fundacao so pode falar com o banco pelo
// cliente que recebeu. As escritas do teste (o UPDATE e o DELETE dos casos 4 e 8) sao do arnes, na base que o
// proprio teste criou e destroi no fim. O Redis do processo aponta para uma porta vazia: o evento de dominio
// falha rapido e nao entra na fila de ninguem.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { fundar, posCondicaoOk } from "../scripts/demo-isolado/fundacao.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FUNDACAO = path.join(ROOT, "scripts", "demo-isolado", "fundacao.ts");
const TSX = pathToFileURL(createRequire(path.join(ROOT, "package.json")).resolve("tsx")).href;

// Organizacao e admin da fixture de exemplo (os mesmos nomes publicos e genericos).
const FIXTURE = { nome: "Organização Exemplo", nomeAdmin: "Administração Exemplo", emailAdmin: "admin@exemplo.invalid" } as const;
const PLATAFORMA_EMAIL = "plataforma@exemplo.invalid";
// E-mail fora de `.invalid` so como dado de teste, montado em tempo de execucao (C11 e lexical). Dominio inventado.
const email = (local: string, dominio: string) => [local, dominio].join("@");

const temporarios: string[] = [];
function dirTemporario(rotulo: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `demo-isolado-${rotulo}-`));
  temporarios.push(d);
  return d;
}
// Os diretorios temporarios saem no fim tambem sem banco (a parte 1 roda sempre).
after(() => {
  for (const d of temporarios) fs.rmSync(d, { recursive: true, force: true });
});

// ------------------------------------------------------------------------------------------------ PARTE 1
// Ambiente do processo filho: herda o do teste, sem as variaveis do dotenv, com alvo e Redis permitidos e vazios.
const URL_CLI = "postgresql://u@127.0.0.1:55599/demo_isolado_cli";
const REDIS_CLI = "redis://127.0.0.1:6599";

function rodarCli(args: string[], extra: Record<string, string | undefined> = {}, cwd = ROOT) {
  const env: Record<string, string | undefined> = { ...process.env };
  for (const k of Object.keys(env)) if (/^DOTENV_/i.test(k)) delete env[k];
  Object.assign(env, { NODE_ENV: "test", DEMO_ISOLADO_PROJETO: "b10b-seed", DATABASE_URL: URL_CLI, REDIS_URL: REDIS_CLI }, extra);
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const r = spawnSync(process.execPath, ["--import", TSX, FUNDACAO, ...args], { cwd, env: env as NodeJS.ProcessEnv, encoding: "utf8", timeout: 60_000 });
  const saida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  return { status: r.status, saida };
}

function semUrlDeBanco(saida: string) {
  assert.equal((saida.match(/postgres(ql)?:[/]{2}/g) ?? []).length, 0, "a saida da fundacao nao pode ter URL de banco");
}

function fixtureEm(dir: string, nome = "fixture.json"): string {
  const caminho = path.join(dir, nome);
  fs.writeFileSync(caminho, JSON.stringify({ organizacao: { nome: FIXTURE.nome }, admin: { nome: FIXTURE.nomeAdmin, email: FIXTURE.emailAdmin } }));
  return caminho;
}

test("CLI sem --saida-segredo sai 4 antes de conectar (C5)", () => {
  const d = dirTemporario("cli");
  const r = rodarCli(["--fixture", fixtureEm(d)]);
  assert.equal(r.status, 4, r.saida);
  assert.match(r.saida, /FUNDACAO RECUSA SAIDA_SEGREDO_AUSENTE/);
  assert.doesNotMatch(r.saida, /FUNDACAO projeto=/);
  semUrlDeBanco(r.saida);
});

test("CLI argumento fora da lista sai 2 e nao ecoa o argumento (C2b-e11)", () => {
  const d = dirTemporario("cli");
  const r = rodarCli(["--fixture", fixtureEm(d), "--saida-segredo", d, "--limpar", "argumento-secreto-x"]);
  assert.equal(r.status, 2, r.saida);
  assert.match(r.saida, /FUNDACAO RECUSA ARGUMENTO_RECUSADO/);
  assert.doesNotMatch(r.saida, /argumento-secreto-x/);
  assert.deepEqual(fs.readdirSync(d), ["fixture.json"]);
});

test("CLI em producao sai 2, sem escape (C1)", () => {
  const d = dirTemporario("cli");
  const r = rodarCli(["--fixture", fixtureEm(d), "--saida-segredo", d], { NODE_ENV: "production", ALLOW_PROD_SEED: "1", ALLOW_PROD_BOOTSTRAP: "1" });
  assert.equal(r.status, 2, r.saida);
  assert.match(r.saida, /FUNDACAO RECUSA AMBIENTE_PRODUCAO/);
  assert.deepEqual(fs.readdirSync(d), ["fixture.json"]);
});

test("CLI com a URL da pilha sem o corte do sufixo sai 2 (Emenda 1.1 §1)", () => {
  const d = dirTemporario("cli");
  const r = rodarCli(["--fixture", fixtureEm(d), "--saida-segredo", d], { DATABASE_URL: "postgresql://postgres@postgres:5432/erp_techsolutions?schema=public" });
  assert.equal(r.status, 2, r.saida);
  assert.match(r.saida, /FUNDACAO RECUSA ALVO_RECUSADO/);
  semUrlDeBanco(r.saida);
});

test("CLI com a trava ocupada sai 3 FUNDACAO_EM_CURSO e nao apaga a trava alheia (C4-e1)", () => {
  const d = dirTemporario("cli");
  fs.writeFileSync(path.join(d, "fundacao.trava"), "outro");
  const r = rodarCli(["--fixture", fixtureEm(d), "--saida-segredo", d]);
  assert.equal(r.status, 3, r.saida);
  assert.match(r.saida, /FUNDACAO RECUSA FUNDACAO_EM_CURSO/);
  assert.equal(fs.readFileSync(path.join(d, "fundacao.trava"), "utf8"), "outro");
});

test("CLI dotenv por VALOR de argumento: o import troca a URL e a reconferencia pega (2 ALVO_MUDOU)", () => {
  // `dotenv/config` le `dotenv_config_<opcao>=<valor>` em QUALQUER posicao do argv, inclusive como valor de uma flag
  // permitida. A lista fechada de argumentos nao ve isso; a reconferencia do alvo depois do import ve.
  const cwd = dirTemporario("cli-dotenv");
  fs.writeFileSync(path.join(cwd, "alvo.env"), "DATABASE_URL=postgresql://u@127.0.0.1:55598/outra_base\n");
  fixtureEm(cwd, "dotenv_config_path=alvo.env");
  fs.mkdirSync(path.join(cwd, "dotenv_config_override=true"));
  const r = rodarCli(["--fixture", "dotenv_config_path=alvo.env", "--saida-segredo", "dotenv_config_override=true"], {}, cwd);
  assert.equal(r.status, 2, r.saida);
  assert.match(r.saida, /FUNDACAO projeto=b10b-seed banco=demo_isolado_cli /);
  assert.match(r.saida, /FUNDACAO RECUSA ALVO_MUDOU/);
  assert.deepEqual(fs.readdirSync(path.join(cwd, "dotenv_config_override=true")), []);
  semUrlDeBanco(r.saida);
});

// ------------------------------------------------------------------------------------------------ PARTE 2
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("C4-db (fundacao no Postgres real) exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suite.",
  });
} else {
  // O evento de dominio da auditoria vai para uma porta vazia (falha rapido, sem entrar na fila de ninguem). Posto
  // antes do 1o import do codigo do produto, que congela o ambiente.
  process.env.REDIS_URL = REDIS_CLI;
  process.env.LOG_LEVEL = "silent";

  // Sentinela: o cliente GLOBAL do produto nao pode ser usado pela fundacao nem pelo arnes.
  const sentinela = new Proxy(
    {},
    {
      get(_alvo, prop) {
        if (prop === "then" || typeof prop === "symbol") return undefined;
        throw new Error(`cliente global do produto usado no teste (${String(prop)}): a fundacao tem de usar o cliente recebido`);
      },
    },
  );
  (globalThis as { prisma?: unknown }).prisma = sentinela;

  type Base = { nome: string; url: string; client: any };
  let admin: any;
  let modelo: string | undefined;
  const bases: Base[] = [];
  const raiz = decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, "")) || "postgres";
  const nomeDeBase = (rotulo: string) => `${raiz}_dis_${rotulo}_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
  const urlDe = (nome: string) => {
    const u = new URL(connectionString);
    u.pathname = `/${nome}`;
    return u.toString();
  };
  let preparo: Promise<void> | undefined;

  async function clientePara(url: string) {
    const [{ createPgAdapter }, { PrismaClient }] = await Promise.all([import("../src/database/pg-connection.ts"), import("@prisma/client")]);
    return new PrismaClient({ adapter: createPgAdapter(url) });
  }

  // O modelo: migrate deploy + provision-rbac + plataforma com usuario `.invalid`. Uma vez por arquivo.
  function prepararModelo(): Promise<void> {
    preparo ??= (async () => {
      admin = await clientePara(connectionString!);
      modelo = nomeDeBase("modelo");
      await admin.$executeRawUnsafe(`CREATE DATABASE "${modelo}" TEMPLATE template0`);
      const url = urlDe(modelo);
      const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
      const env = { ...process.env, DATABASE_URL: url };
      execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env, stdio: "pipe" });
      execFileSync(process.execPath, ["--import", "tsx", path.join(ROOT, "scripts", "provision-rbac.ts")], { cwd: ROOT, env, stdio: "pipe" });
      const db = await clientePara(url);
      try {
        const { bootstrapPlatformAdmin } = await import("../scripts/bootstrap-platform-admin.js");
        // Senha so em memoria, nunca impressa nem gravada.
        const senha = `Xy9!${randomBytes(12).toString("base64url")}`;
        const r = await bootstrapPlatformAdmin(db, { email: PLATAFORMA_EMAIL, name: "Plataforma Exemplo", password: senha, resetPassword: false });
        assert.equal(r.tenantCreated && r.userCreated && r.credentialCreated, true, "bootstrap do modelo");
      } finally {
        await db.$disconnect();
      }
    })();
    return preparo;
  }

  async function novaBase(rotulo: string): Promise<Base> {
    await prepararModelo();
    const nome = nomeDeBase(rotulo);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${nome}" TEMPLATE "${modelo}"`);
    const url = urlDe(nome);
    const base = { nome, url, client: await clientePara(url) };
    bases.push(base);
    return base;
  }

  after(async () => {
    for (const b of bases) await b.client.$disconnect().catch(() => undefined);
    if (admin) {
      for (const b of bases) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${b.nome}" WITH (FORCE)`);
      if (modelo) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${modelo}" WITH (FORCE)`);
      await admin.$disconnect();
    }
  });

  type Contagem = { tenants: number; users: number; audit_logs: number; credenciais: number };
  async function contar(b: Base): Promise<Contagem> {
    const [c] = (await b.client.$queryRawUnsafe(
      `SELECT (SELECT count(*) FROM tenants)::int AS tenants, (SELECT count(*) FROM users)::int AS users,
              (SELECT count(*) FROM audit_logs)::int AS audit_logs, (SELECT count(*) FROM local_auth_credentials)::int AS credenciais`,
    )) as Contagem[];
    return c;
  }

  async function plataformaId(b: Base): Promise<string> {
    const [p] = (await b.client.$queryRawUnsafe(`SELECT id::text AS id FROM tenants WHERE slug = 'platform'`)) as Array<{ id: string }>;
    return p.id;
  }

  async function organizacoesDaFixture(b: Base): Promise<number> {
    const [n] = (await b.client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM tenants WHERE name = $1`, FIXTURE.nome)) as Array<{ n: number }>;
    return n.n;
  }

  async function servicoDaBase(b: Base) {
    const [{ PrismaCoreSaasService }, { PrismaCoreSaasStore }, repos] = await Promise.all([
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);
    const c = b.client;
    return new PrismaCoreSaasService(
      new PrismaCoreSaasStore(c, new repos.TenantRepository(c), new repos.UserRepository(c), new repos.RoleRepository(c), new repos.UserRoleRepository(c), new repos.AuditLogRepository(c)),
    );
  }

  async function criarOrganizacao(b: Base, nome: string) {
    const { ALL_MODULE_CLASSES } = await import("../src/modules/navigation/route-modules.js");
    await (await servicoDaBase(b)).createTenant({ name: nome, modules: [...ALL_MODULE_CLASSES] });
  }

  // Captura tudo o que o processo escreve (stdout e stderr, inclusive os avisos do produto), sem engolir nada.
  function capturar() {
    const pedacos: string[] = [];
    const orig = { out: process.stdout.write.bind(process.stdout), err: process.stderr.write.bind(process.stderr) };
    const gravar = (destino: (c: any, ...r: any[]) => boolean) => (chunk: any, ...resto: any[]) => {
      pedacos.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return destino(chunk, ...resto);
    };
    process.stdout.write = gravar(orig.out) as typeof process.stdout.write;
    process.stderr.write = gravar(orig.err) as typeof process.stderr.write;
    const linhas: string[] = [];
    return {
      linha: (l: string) => linhas.push(l),
      parar: () => {
        process.stdout.write = orig.out as typeof process.stdout.write;
        process.stderr.write = orig.err as typeof process.stderr.write;
        return `${linhas.join("\n")}\n${pedacos.join("")}`;
      },
    };
  }

  const opcoes = (dirSaida: string, extra: Record<string, unknown> = {}) => ({ ...FIXTURE, dirSaida, saida: () => undefined, ...extra });

  // ---------------------------------------------------------------- base A: a sequencia de uma pilha so
  const A: { base?: Base; dir?: string; provisoria?: string } = {};

  test("C4-db (1) cria a organizacao e o admin pelo servico: criados=2 e must_change_password=true", async () => {
    A.base = await novaBase("a");
    A.dir = dirTemporario("saida-a");
    const antes = await contar(A.base);
    const cap = capturar();
    let r;
    try {
      r = await fundar(A.base.client, opcoes(A.dir, { saida: cap.linha }));
    } finally {
      (A as { saidaCapturada?: string }).saidaCapturada = cap.parar();
    }
    assert.equal(r.codigo, 0, r.motivo);
    assert.equal(r.criados, 2);
    assert.equal(r.existentes, 0);
    const depois = await contar(A.base);
    assert.equal(depois.tenants, antes.tenants + 1);
    assert.equal(depois.users, antes.users + 1);
    assert.equal(depois.credenciais, antes.credenciais + 1);
    const linhas = (await A.base.client.$queryRawUnsafe(
      `SELECT c.must_change_password AS pendente, r.key AS papel FROM users u JOIN tenants t ON t.id = u.tenant_id
         LEFT JOIN local_auth_credentials c ON c.user_id = u.id AND c.tenant_id = u.tenant_id
         LEFT JOIN user_role_assignments a ON a.user_id = u.id LEFT JOIN roles r ON r.id = a.role_id
        WHERE t.name = $1 AND u.email = $2`,
      FIXTURE.nome,
      FIXTURE.emailAdmin,
    )) as Array<{ pendente: boolean; papel: string }>;
    assert.equal(linhas.length, 1, JSON.stringify(linhas));
    assert.equal(linhas[0].pendente, true);
    assert.equal(linhas[0].papel, "tenant_admin");
    const arquivo = path.join(A.dir, `${FIXTURE.emailAdmin}.provisoria`);
    A.provisoria = fs.readFileSync(arquivo, "utf8");
    assert.ok(A.provisoria.length > 0);
    assert.deepEqual(fs.readdirSync(A.dir).sort(), [`${FIXTURE.emailAdmin}.provisoria`, "plataforma.tenant-id"]);
  });

  test("C4-db (9) o arquivo do id da plataforma: 36 bytes, igual ao banco, e a saida sem o id nem a provisoria (C5)", async () => {
    assert.ok(A.base && A.dir && A.provisoria, "depende do (1)");
    const lido = fs.readFileSync(path.join(A.dir, "plataforma.tenant-id"), "utf8");
    assert.equal(lido.length, 36);
    assert.equal(lido, await plataformaId(A.base));
    const saida = (A as { saidaCapturada?: string }).saidaCapturada ?? "";
    assert.match(saida, /FUNDACAO CENSO total=1 estranhas=0 mesmas=0 plataforma_fora_de_invalid=0/);
    assert.match(saida, /FUNDACAO FIM criados=2 existentes=0/);
    assert.equal(saida.split(lido).length - 1, 0, "o id da plataforma nao sai do processo");
    assert.equal(saida.split(A.provisoria).length - 1, 0, "a provisoria nao sai do processo");
  });

  test("C4-db (2) a 2a chamada da criados=0 e nada muda", async () => {
    assert.ok(A.base && A.dir, "depende do (1)");
    const antes = await contar(A.base);
    const r = await fundar(A.base.client, opcoes(A.dir));
    assert.equal(r.codigo, 0, r.motivo);
    assert.equal(r.criados, 0);
    assert.equal(r.existentes, 2);
    assert.deepEqual(await contar(A.base), antes);
  });

  test("C4-db (5) provisoria apagada com a troca pendente sai 3 PROVISORIA_PERDIDA (mata a M17)", async () => {
    assert.ok(A.base && A.dir && A.provisoria, "depende do (1)");
    const arquivo = path.join(A.dir, `${FIXTURE.emailAdmin}.provisoria`);
    fs.rmSync(arquivo);
    const antes = await contar(A.base);
    try {
      const r = await fundar(A.base.client, opcoes(A.dir));
      assert.equal(r.codigo, 3);
      assert.equal(r.motivo, "PROVISORIA_PERDIDA");
      assert.deepEqual(await contar(A.base), antes);
    } finally {
      fs.writeFileSync(arquivo, A.provisoria, { flag: "wx", mode: 0o600 });
    }
  });

  test("C4-db (5b) provisoria com 0 bytes sai 3 PROVISORIA_PERDIDA (mata a M21)", async () => {
    assert.ok(A.base && A.dir && A.provisoria, "depende do (1)");
    const arquivo = path.join(A.dir, `${FIXTURE.emailAdmin}.provisoria`);
    fs.truncateSync(arquivo, 0);
    const antes = await contar(A.base);
    try {
      const r = await fundar(A.base.client, opcoes(A.dir));
      assert.equal(r.codigo, 3);
      assert.equal(r.motivo, "PROVISORIA_PERDIDA");
      assert.deepEqual(await contar(A.base), antes);
    } finally {
      fs.writeFileSync(arquivo, A.provisoria, { mode: 0o600 });
    }
  });

  test("C4-db (9b) arquivo do id de outra base sai 3 SAIDA_DE_OUTRA_BASE (mata a M22)", async () => {
    assert.ok(A.base && A.dir, "depende do (1)");
    const arquivo = path.join(A.dir, "plataforma.tenant-id");
    const certo = fs.readFileSync(arquivo, "utf8");
    fs.writeFileSync(arquivo, "00000000-0000-4000-8000-000000000000");
    const antes = await contar(A.base);
    try {
      const r = await fundar(A.base.client, opcoes(A.dir));
      assert.equal(r.codigo, 3);
      assert.equal(r.motivo, "SAIDA_DE_OUTRA_BASE");
      assert.deepEqual(await contar(A.base), antes);
    } finally {
      fs.writeFileSync(arquivo, certo);
    }
    assert.equal((await fundar(A.base.client, opcoes(A.dir))).codigo, 0, "com o arquivo certo, segue");
  });

  test("C4-db (4) e-mail da plataforma fora de .invalid sai 3 PLATAFORMA_REAL (mata a M4c)", async () => {
    assert.ok(A.base && A.dir, "depende do (1)");
    const plataforma = await plataformaId(A.base);
    // Escrita do ARNES, na base do proprio teste.
    await A.base.client.$executeRawUnsafe(`UPDATE users SET email = $1 WHERE tenant_id = $2::uuid`, email("plataforma", "empresa.exemplo"), plataforma);
    const antes = await contar(A.base);
    try {
      const r = await fundar(A.base.client, opcoes(A.dir));
      assert.equal(r.codigo, 3);
      assert.equal(r.motivo, "PLATAFORMA_REAL");
      assert.deepEqual(await contar(A.base), antes);
    } finally {
      await A.base.client.$executeRawUnsafe(`UPDATE users SET email = $1 WHERE tenant_id = $2::uuid`, PLATAFORMA_EMAIL, plataforma);
    }
  });

  test("C4-db (3) outra organizacao criada pelo servico sai 3 ALVO_NAO_VIRGEM, contagens iguais (mata a M4b)", async () => {
    assert.ok(A.base && A.dir, "depende do (1)");
    await criarOrganizacao(A.base, "Outra Exemplo");
    const antes = await contar(A.base);
    const r = await fundar(A.base.client, opcoes(A.dir));
    assert.equal(r.codigo, 3);
    assert.equal(r.motivo, "ALVO_NAO_VIRGEM");
    assert.deepEqual(await contar(A.base), antes);
  });

  // ---------------------------------------------------------------- bases B, C e D: uma por caso
  test("C4-db (6) duas fundacoes em Promise.all no MESMO diretorio: exatamente uma 3 FUNDACAO_EM_CURSO (mata a M19)", async () => {
    const b = await novaBase("b");
    const dir = dirTemporario("saida-b");
    const rs = await Promise.all([fundar(b.client, opcoes(dir)), fundar(b.client, opcoes(dir))]);
    const codigos = rs.map((r) => r.codigo).sort();
    assert.deepEqual(codigos, [0, 3], JSON.stringify(rs));
    assert.equal(rs.filter((r) => r.motivo === "FUNDACAO_EM_CURSO").length, 1);
    assert.equal(await organizacoesDaFixture(b), 1);
    assert.equal(fs.existsSync(path.join(dir, "fundacao.trava")), false, "a trava e solta no fim");
  });

  test("C4-db (7) o gancho cria a duplicata entre a criacao e a releitura: 3 CORRIDA_DETECTADA (mata a M20)", async () => {
    const c = await novaBase("c");
    const dir = dirTemporario("saida-c");
    assert.equal(await organizacoesDaFixture(c), 0, "base so com a plataforma");
    const r = await fundar(c.client, opcoes(dir, { aposCriar: () => criarOrganizacao(c, FIXTURE.nome) }));
    assert.equal(r.codigo, 3, r.motivo);
    assert.equal(r.motivo, "CORRIDA_DETECTADA");
    assert.equal(await organizacoesDaFixture(c), 2);
    assert.equal(posCondicaoOk({ mesmas: 2, admins: 1 }), false);
    assert.equal(posCondicaoOk({ mesmas: 1, admins: 0 }), false);
    assert.equal(posCondicaoOk({ mesmas: 1, admins: 1 }), true);
  });

  test("C4-db (8) a plataforma sem usuario sai 3 BASE_SEM_OP6 e nada e criado (mata a M14)", async () => {
    const d = await novaBase("d");
    const dir = dirTemporario("saida-d");
    // Escrita do ARNES, na base do proprio teste: apaga o usuario da plataforma.
    await d.client.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = $1::uuid`, await plataformaId(d));
    const antes = await contar(d);
    assert.equal(antes.users, 0);
    const r = await fundar(d.client, opcoes(dir));
    assert.equal(r.codigo, 3);
    assert.equal(r.motivo, "BASE_SEM_OP6");
    assert.deepEqual(await contar(d), antes);
    assert.deepEqual(fs.readdirSync(dir), []);
  });
}
