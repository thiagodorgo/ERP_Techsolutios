# B-SAN3-B1 — o CI passa a existir no SHA que a junta julga, e o GHCR fecha por ramo

- **Tipo:** feature (atualiza KPI no próprio PR, §C3)
- **Fase:** Validation (A5)
- **Trilha:** infra de CI / doc-KPI — **não toca código de produto nem teste**
- **Data:** 2026-09-21
- **Branch:** `chore/ci-ve-o-sha-julgado`
- **Autor:** rodada SAN3 (dev B-SAN3-B1, Claude Opus 5)

## Objetivo

Fazer o CI **existir no SHA que a junta julga** e, na mesma mudança, **fechar o portão do GHCR por ramo**.
Hoje o único gatilho de PR é `pull_request`, que exige `refs/pull/N/merge`; PR de bloco conflita com a `main`
(todo bloco apensa nos mesmos registros de `agent-orchestration/`), então não há merge ref e **não nasce
check-run**: os PRs **#388 e #389 foram julgados por juntas com ZERO check-run no head**. O bloco acrescenta
gatilho `push` por ramo de bloco, `concurrency` que dedupa de verdade, e fixa a versão do Flutter, que
**derivou dentro desta rodada**. Acrescenta ainda ao §C7.1-bis do contrato o item que **bloqueia o start da
junta quando não há CI no SHA**.

**O que NÃO faz:** não mexe em `deploy-production.yml` nem em `deploy-staging.yml`; **não** cria nem altera o
job `e2e` (é do `B-SAN3-10`, autorizado nominalmente só para ele no §10.6 do `PLANO_SAN3.md`); e **não**
configura proteção de ramo nem check exigido no GitHub — isso é **ato do dono** e segue pergunta aberta no
§10.6. Não resolve a divergência entre o Flutter do CI (3.47.5) e o da máquina do dono (3.41.6 / Dart 3.11.4):
vira **pendência nomeada**.

## Contexto / fontes de verdade

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/`,
  `agent-orchestration/codex/log-execucao.md`.
- `CLAUDE.md` §C7 (juntas, 1-bis inspeção de terreno) · §C3 (KPI por PR) · §8 (GitHub Flow) · §9 (bateria).
- `AGENTS.md` — espelho Codex, alterado no MESMO trabalho (regra de espelhamento).
- `docs/revisoes/SAN3/PLANO_SAN3.md` §10.6 (proteção de ramo = pergunta ao dono; job e2e = `B-SAN3-10`).
- Evidência da sonda S2 (ramo `chore/ci-probe`, commit `27eae4b0`, run `35624685955`).

## As duas mudanças são INSEPARÁVEIS

O passo do CD se chama *"push to GHCR only on main"*, mas a condição era `github.event_name == 'push'` —
**não olhava o ramo**. Acrescentar o gatilho `push` por ramo **sem** corrigir isso faria **todo push de ramo
de bloco publicar `erp-backend:<sha>` e sobrescrever `:latest`** com código que junta nenhuma julgou.

**Alcance medido (e é mais preciso do que "alcançaria produção"):**

- `deploy-production.yml` é `workflow_dispatch` puro e deploya por **SHA explícito**
  (`flyctl deploy --image ghcr.io/<owner>/erp-backend:<sha>`), **nunca** por `:latest`;
- `deploy-staging.yml` dispara **só em push para `main`** — o gatilho novo não o alcança;
- `:latest` **não é lido por caminho de deploy nenhum** do repositório — só é escrito pelo `ci.yml`;
- **mas** a trava (c) do `deploy-production.yml` (l.117-118) checa apenas que a imagem do SHA
  **existe**, e a mensagem dela diz *"Garanta que o SHA foi mergeado na main e publicado no GHCR"*:
  ela **assume que existir no GHCR implica ter sido mergeado na main**. Publicar por ramo **quebraria essa
  premissa em silêncio e esvaziaria uma das três travas de produção** (as outras duas — ata na `main` e
  smoke de staging verde no mesmo SHA — continuam de pé).

Por isso as duas mudanças entram no mesmo PR. A correção **não é acessório**.

## Escopo PERMITIDO

- `.github/workflows/ci.yml` — **só** o bloco `on:`, o `concurrency:` novo, os **dois** portões do GHCR no
  job `docker` e o `flutter-version` no job `flutter`.
- `CLAUDE.md` e `AGENTS.md` — **só** o §C7.1-bis (item novo + o "por quê"), idênticos nos dois.
- `.claude/agents/inspetor-de-terreno-da-junta.md` e `.agents/agents/inspetor-de-terreno-da-junta.md`
  — item **4.3** novo (`git add -f` nos dois).
- `agent-orchestration/**` — comando, trilha, pendências.
- `Kpis/**` — §C3.

## Escopo PROIBIDO

- `.github/workflows/deploy-production.yml` · `deploy-staging.yml` · `backup-database.yml` ·
  `uptime-check.yml` — **intocados**.
- **Job `e2e`** em `ci.yml` — é do `B-SAN3-10` (§10.6).
- **Proteção de ramo / check exigido no GitHub** — ato do dono, pergunta aberta no §10.6.
- `src/**` · `frontend/**` · `mobile/**` · `tests/**` · `prisma/**` · `migrations/**` · `infra/**` ·
  `.env` · lockfiles JS · `pubspec.yaml`/`pubspec.lock`.
- Worktrees, ramos e contêineres alheios (`san300`, `b04a`, `b11`, árvore principal): **reportar, nunca
  varrer**; remoção só por identificador do próprio bloco.

## Passos de implementação

1. Aplicar o patch provado da sonda S2 em `.github/workflows/ci.yml`: gatilho `push` em `fix/**`, `feat/**`,
   `chore/**`, `docs/**` + `workflow_dispatch`; `concurrency` por `(workflow, evento, ref)` com
   `cancel-in-progress: true`; os **dois** portões do GHCR passando a testar `github.ref` = `refs/heads/main`.
2. Fixar `flutter-version: 3.47.5` mantendo `channel: stable`, com a medição da deriva em comentário.
3. §C7.1-bis em `CLAUDE.md` **e** `AGENTS.md` (mesmo trabalho, texto idêntico) + item 4.3 nos **dois**
   corpos do `inspetor-de-terreno-da-junta`; `node scripts/sync-agent-agents.mjs --check`.
4. Comando, trilha (`status-geral.md`, `log-execucao.md`), pendências pelo **gerador**.
5. KPI no próprio PR (§C3).
6. **Prova do bloco:** empurrar e medir no próprio head os check-runs e o estado do passo do GHCR.

### Por que estes quatro globs, e não outros

Conferidos contra `git branch -r` **real**, não inventados:

| Prefixo | ramos | commit mais recente | veredito |
|---|---|---|---|
| `feature/` | 78 | 2026-06-19 | convenção **morta**; não está no §8.2 |
| `feat/` | 26 | 2026-07-05 | no §8.2 → entra |
| `fix/` | 12 | 2026-09-20 | vivo → entra |
| `chore/` | 9 | 2026-09-21 | vivo → entra |
| `docs/` | 3 | 2026-08-29 | vivo → entra |
| `codex/` | 4 | 2026-05-26 | morto |
| `test/` | 1 | 2026-06-10 | morto |
| `demo/` | 1 | 2026-08-29 | **fora de propósito** — ramo de demonstração, nenhuma junta o julga |

### Por que a versão do Flutter é fixada, e por que subir vira ato deliberado

`channel: stable` **sem versão** resolve o que o canal servir no dia. Medido por execução própria no caminho
`/opt/hostedtoolcache/flutter/stable-<versão>-x64` dos logs: `3.47.4` até **2026-09-18T18:37Z** (runs
`35380369290`, `35381265287`) e `3.47.5` a partir de **2026-09-19T00:26Z** (run `35409352362`). **A deriva
aconteceu DENTRO desta rodada**, e foi dela que veio a divergência de `dart format` que deixou o CI vermelho
no #388. A partir deste bloco, **subir a versão do Flutter é ato deliberado** — muda-se a linha, e a junta vê.

## Bateria de validação (§9)

```bash
npm run check
npm run lint
npm test
npm run build
npm --prefix frontend run check
node scripts/kpi-freeze.mjs --check
node --test --import tsx tests/kpi-dashboard-charts.test.ts
node --test --import tsx tests/kpi-dashboard-contraste.test.ts
node --test --import tsx tests/kpi-achados-paridade.test.ts
node --check Kpis/app.js
node scripts/sync-agent-agents.mjs --check
git diff --cached --check || exit 1
```

O `git diff --cached --check || exit 1` vai **em linha própria**, antes de **cada** commit — nesta rodada
entrou whitespace duas vezes por ele ter sido elo de corrente.

**Prova do bloco (depois de empurrar):** contar os check-runs do próprio head pela API e conferir no log do
job `docker` que o passo `Log in to GHCR` saiu `skipped`.

## Estados obrigatórios (§7)

Não se aplica — o bloco **não tem tela**. Não toca `frontend/**` nem `mobile/**`.

## KPIs no próprio PR (§C3)

- O PR **não toca código de produto nem teste**: as métricas de trilha **carregam** o último valor oficial
  **com nota explícita** (§C3.3) — nada de reexecução fabricada.
- `blocks_completed` sobe **um** a partir do valor da `main` (`165` → `166`). **Atenção:** o `B-SAN3-00` está
  em desenvolvimento em paralelo no worktree `san300` e também soma um; se ele mergear antes, **a recontagem
  é deste bloco no pré-merge**.
- `mvp_demo`/`mvp_vendavel` **intocados** (o PR não move escopo de produto).
- `merge_commit`/`approved_head` = **`null` na autoria**; `pr` preenchido após `gh pr create`;
  `status: "published_per_pr"`.
- `node scripts/kpi-freeze.mjs` para regenerar a cópia `var FROZEN` do `app.js`, e `--check` na bateria.

## Junta (§C7)

- **Quórum:** o bloco **não** toca dinheiro, permissão nem perda de dado; toca **pipeline**, logo
  `agente-secops` é obrigatório por gatilho. **Maioria de 3** (§C7.1-ter(b)).
- **Obrigatório por gatilho (com VETO):** `agente-secops` — toca pipeline e o portão de publicação de imagem.
- **Composição sugerida (≥3):** `agente-secops` · `agente-devops-provisionador` · `agente-ci-doutor`.
- Todo voto declara **`escopo`** (`dentro-do-bloco` | `pre-existente`, este com evidência de data/origem)
  além de **`gravidade`** — §C7.1-ter(a).
- **Registro:** `agent-orchestration/omega/juntas/J-<n>-ci-ve-o-sha-julgado.md`. Junta sem registro = merge
  inválido.
- **Inspeção de terreno antes da junta** (§C7.1-bis) — e, a partir deste bloco, ela inclui o item 4.3: o
  objeto da junta é um SHA com check-runs concluídos.

## Definition of Done (§10)

- [ ] Escopo respeitado (nada fora do permitido; `deploy-*.yml`, job e2e e proteção de ramo intocados).
- [ ] Bateria verde.
- [ ] `CLAUDE.md` e `AGENTS.md` alterados no MESMO trabalho, texto idêntico (regra de espelhamento).
- [ ] Os dois corpos do inspetor versionados (`git add -f`) e `sync-agent-agents.mjs --check` OK.
- [ ] KPIs atualizados no próprio PR, com nota de carregamento (§C3.3).
- [ ] **Prova executada no próprio head:** check-runs > 0 e `Log in to GHCR` = `skipped`.
- [ ] PR aberto; limpeza §C5 após o merge.

## Rastreabilidade (§C6)

- **ID:** B-SAN3-B1
- **Branch:** `chore/ci-ve-o-sha-julgado`
- **PR #:** a preencher após abrir o PR
- **merge commit:** `null` na autoria → backfill pós-merge
- **approved head:** `null` na autoria → backfill pós-merge
- **Gate:** junta (maioria de 3, `agente-secops` obrigatório) + `porteiro-pos-merge`
- **Status:** `published_per_pr`
- **Evidência da sonda:** ramo `chore/ci-probe`, commit `27eae4b0`, run `35624685955` (6 check-runs,
  `Log in to GHCR` = `skipped`). O ramo da sonda é apagado depois que este bloco mergear.
