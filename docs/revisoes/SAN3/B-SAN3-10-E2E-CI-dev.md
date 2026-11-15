# B-SAN3-10-E2E-CI (item 42, `P-SAN-E2E`) — relatório do dev

- **Dev:** Codex (`dev-42-cx3`, depois `dev-42-cx1`, GPT-5.6 Sol) nas fatias F0 a F2; Claude Opus 5.5 (`dev-42-cl`) da F3 em
  diante, cobrindo o Codex 1, que chegou ao limite da janela de 5 h às 00:26 SP de 15/11 (cobertura declarada). O plano é do
  Claude; a pré-revisão vai a outra casa (§C7 11(1) e (6)).
- **Plano:** v2 de topo, com as Emendas 2.1 e 2.2, fora do repositório. O comando do bloco está em
  `agent-orchestration/codex/comandos/B-SAN3-10-E2E-CI.md`.
- **Ramo:** `feat/e2e-ci-42`, a partir da `origin/main` `8fc4b60e`; a `main` andou para `cd480ab6` sem tocar o que o bloco mede.
- **Diário completo:** fora do repositório (comando, saída e hora de cada passo). Este relatório resume.

## O terreno

Worktree próprio, `npm ci` próprio na raiz e em `frontend/`, Chromium do Playwright dentro do worktree, cluster Postgres 16
descartável só em 127.0.0.1 (porta alta, `timezone = 'UTC'` gravado antes do start), API na 3442 e web na 5442, modo
compilado (`npx tsx src/server.ts` e `vite preview`). Nenhuma das portas da máquina do dono, nenhuma base viva, nenhum `.env`.

## As fatias

| Fatia | Commit | O que entrou | Vermelho antes | Verde depois |
|---|---|---|---|---|
| F0 | `56ef9646` | TD2 e TD3, vermelhos | TD1 13 failed · 0 passed; TD4 2 erros TS2322; TD2 3 de 4 falham; TD3 13 de 14 falham | — |
| F1 | `7203f014` | sessão salva por persona (`apoio/`), rótulos do login, config (§3.3, `outputDir` da Emenda 2.1); testes 1 e 13 | o login de hoje 13/13 vermelho | 6 passed, 0 flaky, 4 logins do administrador demo, 0 com 429; TD4 0 erro |
| F2 | `ee35684f` | testes 2, 3, 4 e 6 (o E1 com a lista cheia) | 2 e 3 por `Notificações` ambíguo; 4 por `Em Atendimento` ambíguo | 5 passed (preparo + 4) |
| F3 | `fa0e6c1d` | testes 5, 9, 11 e 12 (Emenda 2.2); CE-G2 | 3 failed, 1 did not run | **14 passed**; duas chamadas `--repeat-each=2`: **27 passed** cada, 0 flaky, 0 com 429, 7 logins; M12a e M12b vermelhas |
| F4a | `a82464ce` | o guarda do relatório, o módulo de regras, o número preso, o canário e o relator de passos (G11) | TD3 13 de 14 falham | TD3 14/14; `e2e-guard: suite preparo=1 chromium=13 expected=14 …`; o canário "falhou, como devido (pelo sentinela)" |
| F4b | `16e4ffa4` | o TD2 sobre o módulo, com os literais de dono | o TD2 antigo não via a desestruturação fora da spec | TD2 com só o Y vermelho (sem job); as mutações locais |
| F5 | `853159d1` | o job `e2e` e o `needs` do `docker` (P2) | TD2 Y vermelho | TD2 5/5; rodada `43676487975`, tentativa 1, `e2e` verde em 2 min 13 s |

## O que a F3 mediu

- **CE-G2:** as telas abrem sem a injeção de permissões e módulos no navegador (6 passed sem ela); pela regra do plano, a
  injeção saiu (3 auxiliares) e a `P-E2E-CONTEXTO-INJETADO` não nasce.
- **Fato novo:** a semente não tem técnico de campo, e o despacho exige um; num banco novo a lista real de despachos é vazia.
  O teste 5 vale nos dois ramos, sem `if`: as linhas e o indicador "Total" são o que a API devolveu, e a busca filtra até 0
  e volta. A cobertura do teste 5 é só a da lista vazia, ratificada pelo orquestrador; nasce a
  `P-E2E-DESPACHOS-SEM-TECNICO`, com dono no próximo bloco que mexer na semente do e2e.
- **M12a** ("Aparência" → "Aparencia" em `tenant-settings.presentation.ts:23`): o teste 12 não acha o grupo. **M12b** (o
  rótulo do Tech Dark → `tech_dark`): o teste 12 não acha a opção pelo rótulo. As duas âncoras com `grep -cF` = 1, as duas
  restauradas com `git diff` vazio.

## As mutações (plano §5.2 e Emenda 2.1), cada uma com a âncora em contagem 1

| ID | Resultado medido |
|---|---|
| M2 | o `preparo` falha em `Selecione a organização`; 13 não rodam |
| M3 | Playwright 0 (1 skipped); guarda 1 (G5, G6, G7, G10); TD2 S1 |
| M4 | o canário passa; o passo diz "o canário PASSOU"; TD2 S4 |
| M5 | TD2 Y1 (`|| true`) |
| M6 | guarda 1 (`no_disco=12`); TD2 S3 |
| M7 | local: Playwright 0 e guarda 1 (`rodou=1`); TD2 Y3 |
| M8 | Playwright 0; guarda 1 (`expectedStatus=failed`); TD2 S1 |
| M9 | o relator de passos (G11) deixa o Playwright em 1; guarda 1 (G10); TD2 S1 |
| M10 | Playwright 0 (1 skipped); guarda 1; TD2 S1 |
| M11 | com `--forbid-only`, Playwright 1; sem nada que o proíba, Playwright 0 e guarda 1 (`rodou=1`); TD2 S1 e S3 |
| M12 | `--repeat-each=4` nos dois testes que entram pela tela: rc 1, com `e2e: o freio de login respondeu 429` |
| M13 | TD2 Y2 (`if: false`) |
| C24 | `const { skip } = test.step`: S1 e G11 |
| C25 | `const { configure } = test.describe` com 60 s: S1 e G8 |
| M16 | o canário trocado por `throw` do sentinela: guarda e TD2 pelo S4 |
| R2-A5 | a suíte e 2 canários ao mesmo tempo no mesmo worktree: 14 passed, 0 ENOENT, a sessão salva intacta |

## A CI

Leu-se o log de cada job (pela API do job), e não a cor. Todas as rodadas na tentativa 1.

| Rodada | Head | O que é | Job `e2e` | Job `backend` |
|---|---|---|---|---|
| `43676487975` | `853159d1` | F5, o job novo | **verde** em 2 min 13 s: o canário "falhou, como devido (pelo sentinela)"; `14 passed`; `e2e-guard: suite preparo=1 chromium=13 expected=14 unexpected=0 flaky=0 skipped=0` | cancelado pelo push seguinte |
| `43676740412` | `b8ec361e` | **M1** (o login demo vai a `/login`) | **vermelho**: o `preparo` cai em `Selecione a organização`, `1 failed`, `13 did not run`; o diagnóstico rodou | cancelado pelo push seguinte |
| `43676998672` | `19bcbee9` | **M7** (`-g "logout real"` no passo) | **vermelho pelo guarda**: `2 passed` no Playwright e `G2: … rodou=1` | **vermelho**: `# tests 5813 / # pass 5810 / # fail 1`, a única falha é o TD2 `Y1-Y4` |
| `43678175375` | `43c23ac6` | **M8** (`test.fail()` e `expect(1).toBe(2)` no logout) | **vermelho pelo guarda**: `14 passed` no Playwright e `G5: expectedStatus=failed`, G6, G10 | ver o PR |

Depois da M8, o `429dcacd` desfaz a última mutação: a árvore dele é idêntica à do `853159d1` (`git diff --name-only 853159d1 429dcacd` vazio). As rodadas verdes seguidas que fecham o aceite da F5, e as do head final (push e pull_request), estão no corpo do PR.

## A F6

- `npm run check` e `npm run build` da raiz: rc 0. O `npm test` da raiz precisa de Postgres e Redis nas portas da máquina do dono, que o terreno proíbe; a prova dele é o job `backend` da CI no mesmo head (o TAP, acima e no PR).
- `git diff --numstat origin/main...HEAD -- src/ prisma/`: vazio. O freio de login está intacto.
- A `main` absorvida por merge (`b00f3161`), sem conflito; no head misturado, local: os testes dos guardas e do registro 41/41, a suíte 14 passed com a linha do guarda, o canário "falhou, como devido".
- Registro: fecham (ao entrar na `main`) a `P-SAN-E2E`, a `P-SAN3-01-E2E-LOGIN-DEFASADO` e a `P-SAN3-06B-E2E-PLATAFORMA-DEFASADO`; nascem 7 (`P-SAN3-10-E2E-PERSONAS`, `P-WEB-PLATAFORMA-MENU-FIXO`, `P-E2E-OS-LISTA-VAZIA`, `P-E2E-DESPACHOS-SEM-TECNICO`, `P-E2E-RODA-COMO-SUPERUSUARIO`, `P-E2E-SEM-ARTEFATO-DE-FALHA`, `P-CI-SEM-PROTECAO-DE-BRANCH`); não nascem a `P-E2E-CONTEXTO-INJETADO` (a F3 mediu que as telas abrem sem a injeção) nem a `P-CI-DOCKER-SEM-E2E` (P2 = sim). O índice foi regenerado pela ferramenta. Em `decisoes.md`, a `D-CI-DOCKER-ESPERA-E2E` e as leituras do bloco (P1, o alargamento, o nome do ramo, a regra de nova tentativa).

## O conserto da pré-revisão (`prerev-575-cl`: REPROVADO, 0 grave e 3 não graves)

Quem achou não consertou (§C7.4-bis): a pré-revisão achou, o `dev-42-cl` consertou. Cada achado foi re-executado antes.

- **A2:** um `exit 0` no corpo do passo da suíte ou do canário deixava o job `e2e` verde sem rodar nada, e o TD2 seguia verde,
  porque só conferia que cada linha EXISTIA no job. Agora o Y3 compara o corpo de cada passo vigiado, por igualdade, com a
  lista de linhas do §3.1, e exige que o passo tenha só `name` e `run: |`. Mutação: o `exit 0` em cada um dos 2 passos deixa
  o TD2 vermelho ("o corpo do passo … difere do plano"); M5, M7, M13 e uma linha a menos também.
- **A1:** a linha em branco a mais no fim de `tests/e2e/apoio/banco.ts` e de `tests/e2e/apoio/sessao.ts` saiu;
  `git diff --check origin/main...HEAD` mede o diff do PR.
- **A3:** cada caso do TD3 exige a linha VERMELHO da própria regra; nasceu o caso "G3 título trocado". Mutação: desligar
  qualquer uma das 16 linhas de regra do guarda (G1, G2, as 3 do G3 que o relatório alimenta, G4, G5, G6, G7, as 2 do G8, G9,
  G11 e as 3 do canário) deixa o TD3 vermelho no caso dela. Residual declarado: a linha "título repetido no disco" do G3 lê
  o disco real, e a cobre o S3 (TD2 e G10).
- **O teste 5:** a cobertura do teste 5 é só a da lista vazia, ratificada pelo orquestrador; a semente não muda neste bloco.
