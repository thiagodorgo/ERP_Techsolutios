// P-SAN-SEED-GUARD (Ω-INFRA-3) — impede que qualquer seed de demonstração rode em PRODUÇÃO.
//
// Camada de defesa do CONTAINER / execução manual: se alguém rodar `npm run db:seed*` num ambiente
// com NODE_ENV=production, a execução aborta. IMPORTANTE (honestidade de escopo): no RUNNER do
// GitHub Actions o NODE_ENV NÃO é 'production' (só é setado no [env] do fly.*.toml, que é o
// container) — logo, no vetor de PIPELINE a proteção real é a AUSÊNCIA do passo de seed no
// `deploy-production.yml`, não esta guarda. Esta guarda cobre o container e a execução manual.
//
// Escape hatch ESTRITO — mesma semântica do `booleanFlag` do env.ts (src/config/env.ts:11): só
// 'true'/'1'/'yes'/'on' (case-insensitive) habilitam. 'false'/'0'/'' MANTÊM a guarda armada. Isto
// evita o footgun do `Boolean("false") === true`: um operador tentando DESLIGAR com ALLOW_PROD_SEED=0
// não pode acidentalmente LIGAR o seed em produção.

const TRUTHY = new Set(["true", "1", "yes", "on"]);

function strictBool(raw: string | undefined): boolean {
  if (!raw) return false;
  return TRUTHY.has(raw.trim().toLowerCase());
}

/**
 * Núcleo puro/testável: um seed é permitido fora de produção; em produção só com opt-in ESTRITO
 * `ALLOW_PROD_SEED` (one-off controlado, ver Runbook B em docs/deployment.md).
 */
export function isSeedAllowed(
  envLike: Record<string, string | undefined> = process.env,
): boolean {
  if (envLike.NODE_ENV === "production") {
    return strictBool(envLike.ALLOW_PROD_SEED);
  }
  return true;
}

/** Aborta o processo (exit 1) quando o seed não é permitido. Chamar no topo de cada entrypoint. */
export function assertSeedAllowed(
  envLike: Record<string, string | undefined> = process.env,
): void {
  if (isSeedAllowed(envLike)) return;
  console.error(
    "[seed-guard] Seed BLOQUEADO em produção (NODE_ENV=production). Seeds são de demonstração e " +
      "nunca devem rodar em produção. Para um bootstrap one-off controlado, defina ALLOW_PROD_SEED=1 " +
      "inline nesse único comando e remova-o em seguida (nunca persista a variável no ambiente).",
  );
  process.exit(1);
}
