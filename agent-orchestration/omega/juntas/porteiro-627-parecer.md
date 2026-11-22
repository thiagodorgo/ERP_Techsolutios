# Parecer do porteiro pós-merge — PR #627 (B-GRUPO-GESTOR-1b)

- **papel · modelo:** `porteiro-627-cl` · Claude Opus 5.5, nível menor, declarado. Identidade nova: não planejei, não desenvolvi e não revisei o bloco.
- **objeto:** squash `afe3106a47b1e88bce5841868d17f3fd00690c2b` na `origin/main` (19:50:51 SP de 22/11), PR `MERGED`, head do PR `28d664c699cc9441eab2d05f4c187d4d3ebaf566`.
- **ref medida (§A7):** tudo por `git show afe3106a4:<caminho>` ou `git diff <refs>`, depois de `git fetch origin`. Nada lido do disco da sessão, que está em `fix/seed-org-demo-pt-br`.
- **Não escrevi em 5432 nem em 6379.** Não subi banco nem Redis e não apaguei nada.

## 1. Promessa × diff — CONFORME

| Comando | Saída |
|---|---|
| `git log origin/main -4` | `afe3106a4` no topo, sobre `6235b894e` (#624) |
| `gh pr view 627 --json state,mergeCommit,headRefOid` | `MERGED`, `mergeCommit=afe3106a47b1…`, head `28d664c69` |
| `git diff --stat 28d664c69 afe3106a4` | vazio: a árvore do squash é a do head do PR |
| `git show --stat afe3106a4` | 19 arquivos, +2405 −6 |
| `git diff --stat 9aec26eb2 28d664c69 -- <os 19 arquivos>` | vazio. Entre o objeto revisado (`rev-627-cx6`, `9aec26eb2`) e o mergeado, os arquivos do bloco não mudaram. Os 2 merges da `main` (`6c66adbe3`, `28d664c69`) só trouxeram o #625 e o #624: o `comm` com `git diff --name-only f31561be7 6235b894e` sai vazio |
| `git diff --check 6235b894e afe3106a4` | código 0 |

**Escopo.** Os 19 caminhos caem todos no PERMITIDO do §7.2 ou no da Emenda 1b:
- §7.2: `frontend/src/modules/group-panel/**`, `App.tsx`, `navigation.registry.ts` com `tests/navigation-menu.test.ts`, `tests/grupo-gestor-frontend-contract.test.ts`, e a referência com 1 linha no README;
- Emenda 1b §2.1: `appSidebarNav.ts`, `AppShell.tsx`, `useGroupPanelMenuScope.ts`, `frontend/tests/grupo-gestor-menu.test.tsx` e 1 linha em `docs/navigation-matrix.md`.

Nada foi tocado em `frontend/src/components/**`, `FinanceiroPage`, `package.json` ou lockfile, `prisma/**`, `mobile/**` e `Kpis/**` (o KPI está congelado). Em `src/`, só o `navigation.registry.ts`.

**Âncoras.** Contadas no squash, linha inteira, no texto sem CR (`grep -cxF`): AN-1, a AN-2 nova (`path: "/group"`), AN-3, AN-4, AN-5, AN-6, AH-1, AH-2, AH-3, AS-1, AS-2 e AS-3 dão 1 cada. A AN-2 antiga (`path: GROUP_PANEL_PATH`) dá 0. O `AppShell.tsx` mudou só no que foi autorizado: o import, o `groupPanelContext` gated por `financial_entries:read`, o hook, o 3º argumento e a dependência no `useMemo`.

**Promessas do corpo, conferidas no código.**
- Os 8 blocos (`KpiStatCard`).
- O gráfico de 6 meses em SVG, com a série de pagos tracejada, e a comparação por pátio.
- A `DenseTable` com o detalhe e a faixa de cobertura.
- "Incompleto" quando não há total, e os 5 estados.
- Os atalhos pelo `POST /auth/active-tenant`.
- O item do menu só com 2 ou mais pátios, e a paleta sem o item.

A janela Gestores do grupo NÃO está no PR, como o corpo declara: a Parte B foi para o `B-GRUPO-GESTOR-1c` pela resposta (A) do dono (`D-DONO-2211-GRUPO-JANELA-A`, `REGISTRO-PENDENTE.md` l.4340).

**Achado N1 (não grave, corpo do PR).** A última linha do corpo diz "Verificador: a designar, de outra casa". A revisão `rev-627-cx6` (Codex conta 6, GPT-5.6 Sol, APROVA em `9aec26eb2`) já existia às 18:54. O corpo ficou desatualizado, e o registro deve nomear o verificador.

## 2. CI do commit na main — CONFORME

O comando foi `gh api repos/<owner>/<repo>/commits/afe3106a4/check-runs`, reexecutado até que tudo concluísse, às 20:14 SP. São 10 check-runs:
- 9 concluídos em `success`: `backend`, `backend-postgres`, `frontend`, `e2e`, `flutter`, `docker`, `antivirus`, `authority-portal` e `owner-portal`;
- o `deploy` saiu `skipped`, como em todo push sem deploy.

TAP lido pelo `gh api …/actions/jobs/<id>/logs`, filtrado pelas linhas de resumo e pelos `not ok`:

| Job | Resumo | `not ok` |
|---|---|---|
| `frontend` (137385712405) | `# tests 2118 # pass 2118 # fail 0 # cancelled 0 # skipped 0`. As linhas `ok 995` a `ok 1002` são o GM-MENU-1 a 8 | 0 |
| `backend` (137385712273) | `# tests 7640 # pass 7638 # fail 0 # cancelled 0 # skipped 2`. Inclui `ok 3518` a `ok 3523`, que são o FRO-1 a 6, e `ok 4158`, que é o `group.panel` em `navigation-menu`. O `san3-04a-menu-front-x-catalogo`, que parou a 1b.1, passa: são 0 `not ok` no job | 0 |
| `backend-postgres` (137385712389) | `# tests 1271 # pass 1271 # fail 0 # skipped 0`, mais a verificação adicional 1/1 | 0 |

**Os números do corpo reproduzem.**
- O frontend dá 2118, exatamente o declarado.
- No backend, o corpo declarou 7585 e 7602 em `9aec26eb2`; a `main` dá 7640, já com o #625 e o #624.
- No backend-postgres, o corpo declarou 1236 e 1252; a `main` dá 1271.

A diferença vem só dos blocos que entraram depois, sem falha nem pulo novo: os 2 pulos do backend são os mesmos do corpo. Os FRO 6/6 e os GM-MENU 8/8 aparecem como `ok` na execução real da `main`.

## 3. Tela: não soma, sem termo técnico, segue o lote — CONFORME

**Não soma.** Rodei um `grep -nE` pelos padrões de soma (reduce, +=, sum, soma, total, Math.max, Math.min) em cada arquivo de `frontend/src/modules/group-panel/` no squash:
- não há `reduce` nem `+=`;
- os `Math.max` só dão escala ao SVG (`GroupPanelCharts.tsx:25,83`);
- `consolidatedValue` (`group-panel.state.ts:77-78`) lê só o `consolidated` do servidor e devolve `null` se ele não veio;
- `formatDuration` (`state.ts:147-150`) só formata minutos;
- o adaptador (`group-panel.adapter.ts:21,63`) mantém um `consolidated` nulo como nulo.

**Sem termo técnico.** Nenhum texto visível traz tenant, scope ou manager. As ocorrências que o grep acha não aparecem na tela:
- `not_group_manager` (`GroupPanelPage.tsx:77,79`; `state.ts:251`) é comparação de código de erro;
- `data-scope` (`GroupPanelPage.tsx:363`) é atributo;
- `POST /auth/active-tenant` (`GroupPanelOrganizationDetail.tsx:37`) está num JSDoc.

**Lote.** O `md5sum` do `painel-do-grupo.reference.html` no squash, com e sem CR, é `710bd526a871eda39917262e8aabb73c`, o mesmo de `painel/lote-gestor-grupo.html`. É cópia byte a byte.

**Capturas.** Abri 4 e mais uma de conferência, e li o log de requisições:
- `f5-capturas/02-grupo-todos-os-patios.png`: o cabeçalho tem Ver e Atualizar, e a faixa diz "1 pátio sem acesso… A soma é de 3 pátios". Os 8 blocos aparecem, com variação só em Recebido e em Pago. O gráfico tem a série de pagos tracejada, as barras por pátio mostram "sem acesso", e a lista tem uma linha por pátio. Bate com o lote e com as emendas: sem seletor de mês, com o tempo de chegada e os funcionários.
- `f5-capturas/08-patio-em-erro-total-nao-somado.png`: o aviso vermelho diz "O total do grupo não foi somado: Pátio Sul não respondeu", e os 8 blocos dizem "Incompleto". O gráfico do grupo sai sem série, e o Pátio Sul aparece como "erro na leitura" na comparação. A tela não recompõe o total.
- `f5-capturas/12-acesso-nao-permitido.png`: "Só o gestor do grupo abre este painel", em PT-BR e sem código.
- `f5b-capturas/01-gestora-4-patios-menu-aberto-com-o-item.png`: "Painel do grupo" em VISÃO GERAL, logo depois do Dashboard, com o foco visível.
- `f5b-capturas/05-item-clicado-abre-o-painel-do-grupo.png`: o item fica ativo, e a barra superior diz "Painel do grupo".
- `f5b-capturas/06-requisicoes-group-panel.log`: do login até a 3ª navegação, o menu fez 1 `GET /api/v1/group-panel/scope` e nenhum `/summary`.

**Observação O1 (não é achado).** Nas capturas da F5, tiradas antes do menu, a barra superior dizia "Operação". Com o item no menu (2 ou mais pátios), `currentNavTitle` (`appSidebarNav.ts:357-366`) passa a dizer "Painel do grupo", como mostra a captura 05. Quem abre `/group` com 0 ou 1 pátio ainda vê "Operação" na barra, no estado vazio. É cosmético.

## 4. Pendências — COM RESSALVA

| Comando | Saída |
|---|---|
| `git grep -n <id> origin/main -- agent-orchestration docs` para `P-GRUPO-JANELA-GESTORES`, `P-GRUPO-PALETA` e `C-1B-PERMISSAO-JANELA` | 0 ocorrências |
| `grep -c <id> REGISTRO-PENDENTE.md` | `P-GRUPO-JANELA-GESTORES` 0 · `P-GRUPO-PALETA` 0 |
| `git grep <id> 707095d5b` (head do PR de registro #628, aberto) | 0 nos 3 ids |
| `grep -rl` nos `.md` de `erp-pausa-2026-10-03` | só `planos/plano-B-GRUPO-GESTOR-emenda-1b.md` §5 |

**Achado A1 (MÉDIO, registro).** Duas pendências e um registro de divergência têm id, gravidade e dono **só no plano** (Emenda 1b §5):
- `P-GRUPO-JANELA-GESTORES`, ALTA, dona `B-GRUPO-GESTOR-1c`;
- `P-GRUPO-PALETA`, BAIXA, dona `B-GRUPO-GESTOR-1c`;
- o registro de divergência `C-1B-PERMISSAO-JANELA`, com o orquestrador como dono.

Nenhum dos três está no `REGISTRO-PENDENTE.md` nem no PR de registro #628. O plano fica fora do repositório: se o registro não os levar, eles se perdem. A `P-GRUPO-JANELA-GESTORES` é ALTA, porque é o que falta para alguém ser marcado gestor pela tela.

**Achado A2 (BAIXO, registro).** A `P-GRUPO-GESTOR-PAINEL` (`pendencias.md` na `main`, l.17542-17547) tem como critério "a 1ª entrega do `B-GRUPO-GESTOR` na `main`, com junta completa". O critério está cumprido agora:
- o servidor (#623) passou por junta completa (J-623);
- a tela (#627) passou por revisão reforçada, o nível que o plano-base §9 (l.410) fixou para o 1b.

Falta marcá-la FECHADA no registro, citando o #623 e o #627, e dizendo que a janela de gestores segue na `P-GRUPO-JANELA-GESTORES`.

**Amostragem de "RESOLVIDA".** O bloco não fechou pendência no código. A amostra cabível é a parada da 1b.1: 7 `not ok` em `san3-04a-menu-front-x-catalogo`, com "item não resolvido: PAINEL_GRUPO". No squash, a AN-2 literal dá 1, e quem prova que o teste passa é o job `backend` da `main` (seção 2).

**BLOQUEIA.** Nenhuma pendência marcada como bloqueante nomeia o `B-GRUPO-GESTOR-1c` nem o leilão. Cruzei `grep -i bloqueia` em `pendencias.md` da `main` com `GRUPO-GESTOR` e `LEILAO`, e nenhuma tem "bloqueia: sim".

## 5. Limpeza — COM RESSALVA (listado, nada apagado)

| O quê | Comando | Estado |
|---|---|---|
| worktree `~/w-f5-grupo` | `git worktree list`; `git -C … status --porcelain`; `git log origin/feat/grupo-gestor-1b..HEAD` | **existe**, em `9aec26eb2`, limpo, sem commit fora do remoto, 766 MB. Nenhum processo tem `w-f5-grupo` na linha de comando (`Get-CimInstance Win32_Process`) |
| branch remota `feat/grupo-gestor-1b` | `git ls-remote --heads origin feat/grupo-gestor-1b` | **existe** (`28d664c69`): o merge não usou `--delete-branch` |
| branch local `feat/grupo-gestor-1b` | `git branch --list` | existe, presa ao worktree |
| worktree da revisão `~/w-rev-627` | `git worktree list`; `ls -d` | removido |
| terreno da F5 e da F5b: PG 55491/55493, Redis 56391/56393, API 3191/3193, Vite 5191/5193 e os contêineres `redis-f5-grupo` e `redis-f5b-grupo` | `netstat -ano` filtrado por LISTENING; `docker ps -a` | nada vivo |
| artefatos em `revisoes/grupo/` (`dev-f5b-grupo-cl/MM-*.tap` e as capturas) | `ls` | ficam, porque são evidência |
| disco | `df -h /c` | 135 GB livres: não precisa de `DEEP_CLEAN` |

**Ressalva L1.** Falta remover, pelo §C5, o `w-f5-grupo` (`git worktree remove --force`), a branch local e a remota `feat/grupo-gestor-1b`. A remota já está mergeada (`git diff 28d664c69 afe3106a4` sai vazio), então apagá-la não perde nada.

## O que executei, em resumo

- `git fetch origin` e `git log origin/main -4`.
- `gh pr view 627` (estado, `mergeCommit`, head, corpo e arquivos).
- `git show --stat afe3106a4`.
- `git diff` entre `28d664c69`, `9aec26eb2`, `6235b894e` e `afe3106a4`, e o `--check`.
- A contagem das 13 âncoras com `grep -cxF` no texto sem CR.
- O grep de soma e o de termo técnico no módulo.
- O `md5sum` da referência contra o lote.
- A leitura de 5 capturas e do log de requisições.
- `gh api …/check-runs` do squash e do head do PR, e `gh api …/jobs/<id>/logs` dos 3 jobs.
- `git grep` e `grep -c` dos ids de pendência na `main`, no `REGISTRO-PENDENTE.md` e no head do #628.
- `git worktree list`, `git ls-remote`, `git branch --list`, `netstat`, `docker ps -a`, `Get-CimInstance Win32_Process` e `df -h`.

**Não executei** a suíte localmente: por ordem de casa, a suíte inteira roda no CI do GitHub, e ele foi lido. Também não subi a tela, porque as capturas do dev, com o build de produção e o terreno próprio, foram o insumo visual.

## Veredito

Nenhum achado grave. A entrega bate com a promessa, o CI da `main` está verde com as contagens reproduzidas, e a tela não soma dinheiro, não mostra termo técnico e é cópia do lote aprovado. Viajam junto 4 dívidas, que não impedem o start:
- **A1:** `P-GRUPO-JANELA-GESTORES` (ALTA), `P-GRUPO-PALETA` (BAIXA) e `C-1B-PERMISSAO-JANELA` entram no registro (`REGISTRO-PENDENTE.md` e o próximo PR de registro; o #628 não as tem), com a dona `B-GRUPO-GESTOR-1c`.
- **A2:** marcar FECHADA a `P-GRUPO-GESTOR-PAINEL` (#623 e #627).
- **N1:** o registro nomeia o verificador, `rev-627-cx6`, que o corpo do PR deixou como "a designar".
- **L1:** remover `~/w-f5-grupo` e a branch local e a remota `feat/grupo-gestor-1b`.

LIBERADO COM RESSALVA: a próxima demanda da fila (o leilão `B-PATIO-LEILAO-DIARIAS` ou o `B-GRUPO-GESTOR-1c`) | no próximo PR de registro: levar P-GRUPO-JANELA-GESTORES, P-GRUPO-PALETA e C-1B-PERMISSAO-JANELA com dono, fechar P-GRUPO-GESTOR-PAINEL e nomear o verificador rev-627-cx6; antes do próximo start, remover w-f5-grupo e a branch feat/grupo-gestor-1b (local e remota)
