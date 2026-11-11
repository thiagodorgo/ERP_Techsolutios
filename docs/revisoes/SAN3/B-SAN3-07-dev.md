# B-SAN3-07 — diário do dev (item 47: papéis legados no seed base e nome da organização demonstração, provados no banco)

- **Dev:** `dev-san3-07-cl`, Claude Opus 5.5, subagente da sessão, identidade nova (nível menor, declarado). Cobre o Codex,
  com exceção declarada: o Codex 1 está sem cota semanal até 16/11 e o Codex 2 está ocupado. Não planejei nem critiquei.
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/plano-B-SAN3-07.md` (autor `plano-B-SAN3-07-api`, Claude Opus 5.5
  pela API), com a Emenda 1 (orquestrador, 11/11 03:01), que prevalece. Crítica `crit-07-cl` (Claude Opus 5.5 da sessão),
  APROVADO COM AJUSTES: `revisoes/crit-07-plano.json` e `-evidencia.md`.
- **Verificador:** de outra casa, a cargo do orquestrador (emenda 1, item 8). Este diário não verifica a si mesmo.
- **Terreno:** worktree `C:/Users/thiag/w-san307`, ramo `fix/seed-papeis-legados` a partir de `origin/main` = `07898adf`
  (`git rev-parse origin/main`, 11/11 03:02 SP). `npm ci` próprio, sem junction. Postgres 16.15 descartável `san307-pg`
  em `127.0.0.1:55498`.
- **Horas:** de `date`, em São Paulo.

## F0 — comando (03:05)

- `agent-orchestration/codex/comandos/B-SAN3-07-seed-papeis-e-nome.md`, no formato curto da trilha SAN3
  (`B-SAN3-21-acentuacao.md`).
- O ramo é `fix/seed-papeis-legados`, o do mandato do orquestrador; o plano dizia `fix/seed-demo-nome-de-negocio`.
- O texto sobre a superfície da mudança de permissão já sai corrigido pela emenda 1, item 3: ganham os 5 papéis só as
  bases preparadas apenas por `db:seed` (CI `backend-postgres`, `test:e2e`, dev sem `db:seed:users`). O staging roda
  `db:seed:demo`, e o `seed-users.ts` já cria os 5.
