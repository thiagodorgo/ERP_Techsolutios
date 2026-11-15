# B-SAN3-10-E2E-CI — os testes de navegador (Playwright) no portão obrigatório da CI (item 42, `P-SAN-E2E`)

- **Tipo:** feature de esteira (testes, guardas e um job de CI; nenhum código de produto além de 4 atributos de acessibilidade)
- **Fase:** Execution / Validation
- **Trilha:** `tests/e2e/**`, `playwright.config.ts`, `scripts/e2e-*.mjs`, `tests/e2e-*.test.ts`, `.github/workflows/ci.yml`
- **Data:** 2026-11-14 / 2026-11-15
- **Branch:** `feat/e2e-ci-42` (o gatilho `push` do `ci.yml` cobre `feat/**`; o plano SAN3 nomeava `test/e2e-no-ci-e-roteiro`)
- **Plano:** v2 de topo (Claude Fable, `plano-42-v2-fable`), com a Emenda 2.1 (os 5 ajustes da crítica r2) e a Emenda 2.2
  (a linha 12 do §4.2, Configurações, e as mutações M12a e M12b). Os três ficam fora do repositório, no registro do
  orquestrador. Em divergência, vale a emenda mais nova.
- **Dev:** Codex (`dev-42-cx3` e `dev-42-cx1`, GPT-5.6 Sol) nas fatias F0 a F2; Claude Opus 5.5 (`dev-42-cl`) da F3 em
  diante, cobrindo o Codex 1 sem limite, por ordem do dono (cobrir na hora). Como o plano também é do Claude, a pré-revisão
  vai a outra casa (§C7 11(1) e (6)).
- **Nível de revisão:** junta completa (a trava do §C7 10(2) lista `.github/**`).

## Objetivo

Os 13 testes de navegador que nenhuma máquina rodava passam a rodar em todo PR e em todo push da `main`, num job `e2e`
obrigatório, que só fica verde se rodaram exatamente os testes que existem no disco, cada um de primeira, sem máscara, e se
o canário (um teste que tem de falhar) falhou pelo motivo certo. O job `docker`, que publica a imagem, passa a esperá-lo.

## Escopo permitido

- `.github/workflows/ci.yml`: só o bloco contíguo do job `e2e` e a linha `needs` do job `docker` (P2 = SIM, decisão do dono).
- `playwright.config.ts`; `tests/e2e/**` (a spec, `apoio/sessao.ts`, `apoio/banco.ts`, `apoio/preparo.setup.ts`,
  `apoio/relator-passos.mjs`, `controle/vermelho-controle.spec.ts`, `contagem-esperada.json`).
- `scripts/e2e-guard-regras.mjs`, `scripts/e2e-report-guard.mjs`; `tests/e2e-gate-guard.test.ts` (TD2),
  `tests/e2e-report-guard.test.ts` (TD3).
- `frontend/src/pages/LoginPage.tsx`: só `htmlFor` e `id` nos dois pares rótulo/campo.
- O registro: este comando, `docs/revisoes/SAN3/B-SAN3-10-E2E-CI-dev.md`, a nota do item 42 no `PLANO_SAN3.md`,
  `controle/pendencias.md` (+ índice gerado), `controle/decisoes.md`, `docs/status-geral.md`.

## Escopo proibido

`src/**` (o freio de login não muda nem ganha exceção de teste), `prisma/**`, `migrations/**`, `infra/**`, `.env`,
`package.json`, `frontend/package.json`, lockfiles, `.gitignore`, `frontend/src/**` fora dos 4 atributos, `Kpis/**`,
`mobile/**`, qualquer outra linha de `.github/**`. Para ficar verde: `test.skip`/`fixme`/`only`/`fail`/`slow`,
`test.step.skip`, `describe.configure` (inclusive desestruturados), `setTimeout`, apagar teste, asserção vazia, subir
limite de tempo, `retries` acima de 1, filtro, baixar o número preso, `continue-on-error`, `|| true`.

## Fatias

F0 terreno e donos vermelhos · F1 sessão salva por persona (o freio intacto) · F2 testes 2, 3, 4 e 6 · F3 testes 5, 9,
11 e 12 (Emenda 2.2) · F4a o guarda do relatório, as regras, o número preso, o canário e o relator de passos · F4b as
regras S1–S4 no TD2 e as mutações locais · F5 o job na CI e as rodadas vermelhas e verdes · F6 bateria e registro.

## Bateria de validação

- `npx playwright test -c playwright.config.ts --forbid-only --fail-on-flaky-tests` no modo compilado, mais
  `node scripts/e2e-report-guard.mjs playwright-report/suite.json --modo=suite` → `e2e-guard: suite preparo=1 chromium=13
  expected=14 unexpected=0 flaky=0 skipped=0`.
- `E2E_CANARIO=1 … --project=controle` falha, e o guarda `--modo=controle` diz "o canário falhou, como devido".
- `node --test --import tsx tests/e2e-gate-guard.test.ts tests/e2e-report-guard.test.ts` verdes.
- `npm run check`, `npm test`, `npm run build`, `git diff --check`, `git diff --numstat origin/main...HEAD -- src/ prisma/`
  vazio.
- Na CI, lê-se o log, e não a cor: `gh run view <run> --job <job> --log | grep -E 'e2e-guard|passed|failed|flaky|skipped'`.
- O check `e2e` vale na tentativa 1; re-rodar exige registro (§3.7 do plano, P7).
