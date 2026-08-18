import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (§7 do plano) — os 9 GUARDS DE PADRÃO do plano v6, mais o guard 10c do ciclo 2 (M-1;
// os guards 10a/10b vivem em tests/core-saas-role-authority.test.ts). Cada guard trava, por
// varredura mecânica, um invariante que a prosa sozinha não segura. Baselines medidos na autoria;
// um match novo fora da allowlist é regressão do invariante, não "ruído do guard".
// -----------------------------------------------------------------------------------------------

const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");
const migrationsRoot = path.join(repoRoot, "prisma", "migrations");

function listFilesRecursive(dir: string, extensions: readonly string[]): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);

    if (stats.isDirectory()) {
      out.push(...listFilesRecursive(full, extensions));
      continue;
    }

    if (extensions.some((ext) => full.endsWith(ext))) {
      out.push(full);
    }
  }

  return out;
}

function relative(file: string): string {
  return path.relative(repoRoot, file).replace(/\\/g, "/");
}

// Varre LINHAS DE CÓDIGO — linhas de comentário (// · * · /* · --) ficam de fora: os guards
// travam o que o código FAZ; prosa que nomeia o padrão para explicá-lo não é ocorrência.
function isCommentLine(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("--")
  );
}

function findMatches(
  files: readonly string[],
  pattern: RegExp,
): Array<{ readonly file: string; readonly line: number; readonly text: string }> {
  const matches: Array<{ file: string; line: number; text: string }> = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((text, index) => {
      if (!isCommentLine(text) && pattern.test(text)) {
        matches.push({ file: relative(file), line: index + 1, text: text.trim() });
      }
    });
  }

  return matches;
}

const srcFiles = listFilesRecursive(srcRoot, [".ts"]);
const migrationFiles = listFilesRecursive(migrationsRoot, [".sql"]);

test("guard 1 — consulta cross-tenant por e-mail: listTenantsForUserEmail não existe mais e a função elevada tem UMA entrada", () => {
  // O bypass removido (Ω6R-TEN-001) não pode voltar com o mesmo nome.
  const legacy = findMatches(srcFiles, /listTenantsForUserEmail/);
  assert.deepEqual(legacy, [], "listTenantsForUserEmail foi removida — reintroduzi-la reabre o TEN-001");

  // A única entrada documentada da leitura pré-autenticação (partilhada pela sonda — §3.8):
  // o repositório login-candidates. Qualquer outro arquivo CHAMANDO a função elevada é uma
  // segunda entrada — reprova (critério §13.2 da ata). A forma de chamada é `FROM
  // public.auth_login_candidates(...)`; a consulta de CATÁLOGO da sonda (pg_proc por
  // regprocedure, em login-readiness.ts) referencia a identidade da função sem executá-la.
  const functionCallers = new Set(
    findMatches(srcFiles, /FROM\s+public\.auth_login_candidates\(/i).map((match) => match.file),
  );
  assert.deepEqual(
    [...functionCallers].sort(),
    ["src/modules/auth/repositories/login-candidates.repository.ts"],
    "a função elevada só pode ser chamada pelo repositório documentado (uma entrada)",
  );

  const mentions = new Set(findMatches(srcFiles, /auth_login_candidates/).map((match) => match.file));
  assert.deepEqual(
    [...mentions].sort(),
    [
      "src/modules/auth/repositories/login-candidates.repository.ts",
      "src/modules/auth/services/login-readiness.ts",
    ],
    "menções à função elevada: só a entrada documentada e a consulta de catálogo da sonda",
  );
});

test("guard 2 (camada de texto) — identity_id não aparece nos construtores de resposta das rotas de identidade", () => {
  // Primeira camada (a segunda, POR VALOR, vive em tests/auth-identity-exposure-scan.test.ts).
  // As rotas que serializam vínculos/memberships não podem sequer mencionar identity_id como
  // chave de resposta. O claim do JWT (auth.routes.ts) é a exceção sancionada pelo §3.5 e vive
  // dentro do token assinado, não do corpo JSON.
  const responseBuilders = [
    path.join(srcRoot, "modules", "auth", "routes", "identity-links.routes.ts"),
    path.join(srcRoot, "modules", "auth", "routes", "me.routes.ts"),
    path.join(srcRoot, "modules", "mobile", "mobile.routes.ts"),
  ];
  const matches = findMatches(responseBuilders, /identity_id/);

  assert.deepEqual(matches, [], "identity_id em rota de resposta é correlator vazando");
});

test("guard 3 — GUC de identidade e set_config vivem SÓ em src/database/rls.ts", () => {
  const gucMatches = findMatches(srcFiles, /app\.current_identity_id/).filter(
    (match) => match.file !== "src/database/rls.ts",
  );
  assert.deepEqual(gucMatches, [], "o GUC de identidade fora de rls.ts contorna o setter (§3.7)");

  const setConfigMatches = findMatches(srcFiles, /set_config\(/).filter(
    (match) => match.file !== "src/database/rls.ts",
  );
  assert.deepEqual(setConfigMatches, [], "set_config fora de rls.ts contorna a fronteira do GUC");
});

test("guard 4 — SECURITY DEFINER em prisma/migrations/** só na ocorrência documentada", () => {
  const matches = findMatches(migrationFiles, /SECURITY DEFINER/);

  assert.deepEqual(
    matches.map((match) => match.file),
    ["prisma/migrations/20260868000000_add_auth_identities/migration.sql"],
    "a única SECURITY DEFINER do repositório é auth_login_candidates (baseline 0 antes deste bloco)",
  );
});

test("guard 5 — create()/upsert() nas duas tabelas INSERT-only reprovam (o RETURNING avaliaria a política de SELECT)", () => {
  const matches = findMatches(
    srcFiles,
    /\.authIdentity\.(create|upsert)\(|\.authIdentityLinkEvent\.(create|upsert)\(/,
  );

  assert.deepEqual(
    matches,
    [],
    "auth_identities e auth_identity_link_events só aceitam INSERT sem RETURNING (createMany/$executeRaw)",
  );
});

test("guard 6 — literal authType: \"jwt\" em posição de valor só no middleware (allowlist: a declaração do tipo)", () => {
  // Baseline MEDIDO: 2 ocorrências — o VALOR no middleware (a entrada permitida) e a DECLARAÇÃO
  // do tipo em auth.types.ts (allowlist documentada — crítico 4/especialista 6: sem ela o guard
  // nasceria vermelho e convidaria a alargar o padrão).
  const matches = findMatches(srcFiles, /authType: "jwt"/);

  assert.deepEqual(
    matches.map((match) => match.file).sort(),
    [
      "src/modules/auth/middleware/authenticated-actor.middleware.ts",
      "src/modules/auth/types/auth.types.ts",
    ],
    "construir AuthenticatedActor fora do middleware forjaria o ator do setter (V2)",
  );
});

test("guard 7 — session_replication_role não aparece em src/** (o contorno do append-only é só de manutenção)", () => {
  const matches = findMatches(srcFiles, /session_replication_role/);

  assert.deepEqual(
    matches,
    [],
    "session_replication_role em código de aplicação desligaria o trigger da trilha (dba 5)",
  );
});

test("guard 8 — nenhum GRANT em prisma/migrations/** (ativação é ato humano, não efeito de migração)", () => {
  const matches = findMatches(migrationFiles, /^\s*GRANT\b/);

  assert.deepEqual(matches, [], "GRANT em migração ativaria o caminho elevado sem ato humano (secops 4)");
});

test("guard 9 — forma do setter: 2º argumento identificador nu; e rls.ts importa AuthenticatedActor SÓ de auth.types", () => {
  // (a) `setIdentityRlsContext(tx, {...actor, userId: X})` compila e forjaria o par sem conter
  // o literal do guard 6 — por isso a FORMA da chamada é travada: o 2º argumento precisa ser um
  // identificador nu (sem `{`, sem `...`, sem `as `).
  const callPattern = /setIdentityRlsContext\(\s*([^,()]+)\s*,\s*([^)]+)\)/g;
  const offenders: Array<{ file: string; argument: string }> = [];

  for (const file of srcFiles) {
    if (relative(file) === "src/database/rls.ts") {
      continue; // a declaração da função, não uma chamada
    }

    const content = readFileSync(file, "utf8");

    for (const match of content.matchAll(callPattern)) {
      const secondArgument = (match[2] ?? "").trim();

      if (!/^[A-Za-z_$][\w$]*$/.test(secondArgument)) {
        offenders.push({ file: relative(file), argument: secondArgument });
      }
    }
  }

  assert.deepEqual(offenders, [], "o 2º argumento do setter deve ser um identificador nu (secops 2)");

  // (b) o homônimo `AuthenticatedActor` de core-saas.types.ts (sem email/authType — o tipo de
  // request.tenantContext) importado em rls.ts reabriria o V2 em silêncio.
  const rlsSource = readFileSync(path.join(srcRoot, "database", "rls.ts"), "utf8");

  assert.match(
    rlsSource,
    /import type \{ AuthenticatedActor \} from "\.\.\/modules\/auth\/types\/auth\.types\.js"/,
    "rls.ts deve importar AuthenticatedActor de auth.types.ts",
  );

  const importLines = rlsSource
    .split(/\r?\n/)
    .filter((line) => /^\s*import\b/.test(line));

  assert.equal(
    importLines.some((line) => line.includes("core-saas.types")),
    false,
    "rls.ts não pode importar o homônimo de core-saas.types.ts",
  );
});

test("guard 10c — DISABLE TRIGGER não aparece em src/** (baseline 0; o DONO desligaria o append-only sem superusuário)", () => {
  // M-1 (R-B-O6R-01-ciclo1): o dono da tabela, mesmo NOSUPERUSER, desliga o trigger da trilha
  // com ALTER TABLE … DISABLE TRIGGER — caracterizado por execução em
  // tests/auth-identity-link-events-db.test.ts. Na topologia em que a aplicação é dona das
  // tabelas, uma linha dessas em código de aplicação apagaria a prova do C3. Baseline: 0.
  const matches = findMatches(srcFiles, /DISABLE\s+TRIGGER/i);

  assert.deepEqual(matches, [], "DISABLE TRIGGER em src/** desligaria a trilha append-only (M-1)");
});
