# Conhecimento de terreno — para agentes locais e de nuvem

> **O que é:** o registro das lições **medidas** de operação deste repositório, que até 30/09/2026 viviam só na
> memória da sessão do orquestrador. Foi escrito para que qualquer agente — nesta máquina ou numa sessão de
> nuvem em claude.ai/code — trabalhe com o mesmo conhecimento.
>
> **O que não é:** norma. O contrato é o `CLAUDE.md` (espelhado no `AGENTS.md`), e as fontes de verdade são as do
> §A1. **Onde este arquivo divergir do contrato, vale o contrato.** Cada lição diz a data, o que foi medido e
> como aplicar; algumas só valem no Windows do dono, e estão marcadas **[Windows]**.

---

## 1. Onde cada coisa roda

### 1.1 As três máquinas, medidas em 29–30/09/2026

| | CI (a referência) | máquina do dono (Windows 11) | nuvem (claude.ai/code) |
|---|---|---|---|
| sistema | ubuntu-latest | MINGW64 / Git Bash | Linux |
| Node | **20** (`ci.yml`) | 20.19.5 ✅ | **22.22.2 ❌** — use Node 20 |
| Flutter | **3.47.5** stable (`ci.yml`) | 3.41.6 ❌ (diferente do CI) | não medido |
| Postgres | 16 (serviço do job) | 16 (Docker) | 16 instalado, **sem daemon Docker** — suba com `pg_ctl` numa porta própria |
| Redis | 7 (serviço) | 7 (Docker) | não medido |

**Consequência:** um número de teste só vale como número de CI se veio de Node 20 (e, no app, de Flutter 3.47.5).
Declare no §0 de todo plano ou relatório: `uname -a`, `node -v`, `git --version` e, se houver app, `flutter --version`.

### 1.2 O que a nuvem faz e o que fica na máquina do dono

- **Nuvem:** planejar, criticar e **desenvolver** blocos de backend e web que não dependem do Windows. A nuvem vê
  **só o GitHub**: não vê o disco do dono, a base viva, os worktrees nem `.env`. Tudo o que um agente de nuvem
  precisar tem de estar num ramo do GitHub.
- **Máquina do dono:** inspetor de terreno, juntas, merge, porteiro pós-merge, integração da `main` e tudo o que
  mede comportamento de Windows (ex.: os scripts `scripts/mandato-*.sh` do `B-GOV-MANDATO`) ou precisa do Flutter do CI.
- **Um orquestrador só.** O merge acontece só pela sessão local, depois de junta e CI. A sessão de nuvem entrega
  um ramo empurrado; o dono cola o retorno; o orquestrador confere **pelo commit** (arquivos tocados, base,
  SHA) e só então segue.
- **Prova de onde rodou:** agente que diz estar "na nuvem" publica `uname -a` no §0. Em 29/09 um agente lançado
  com `isolation: "remote"` rodou **no Windows do dono** sem aviso — só o `uname` mostrou.

### 1.3 Ramos

- A árvore principal do dono trabalha **na `main`** desde 30/09. O ramo `demo/investidor` (49 commits fora da
  `main`, 23–29/08) **não é mais base de trabalho**; ele continua no GitHub (ver §4).
- Plano: `docs/plano-<bloco>`. Implementação: o ramo do bloco (`feat/…`, `fix/…`, `chore/…`). **Nunca** empurrar
  para a `main`, nunca `--force`, nunca abrir PR a partir da nuvem sem o orquestrador pedir.

---

## 2. Lições medidas

### 2.1 Durabilidade e destruição

- **O que só existe num disco não conta como entregue.** Commit que doa perder ganha upstream **na hora**, não no
  PR. Origem: decisão do dono de 29/08 (`D-DURABILIDADE-BRANCHES-LOCAIS`, texto em `demo/investidor` `d1fab3bc`;
  **portada para a `main` em 30/09 pelo PR #396**, verbatim, fechando a `P-GOV-D-DURABILIDADE-FORA-DA-MAIN`;
  esta linha dizia o contrário no mesmo commit, e o porteiro do #396 a pegou — R4). Em 28/08, 82 commits viviam
  só em três ramos locais.
- **Trava de MERGED antes de destruir.** Em 13/09 um `gh pr merge` falhou (SHA curto no `--match-head-commit`,
  e um pipe escondeu o código de saída), a cadeia apagou os ramos e o GitHub fechou o PR. Regra: use o SHA
  **completo** em `--match-head-commit`, não passe o merge por pipe, e só limpe ramo/worktree depois de ler
  `gh pr view N --json state` = `MERGED`.
- **Processo vivo antes de remover worktree.** Em 28/09 um worktree foi removido com uma medição rodando dentro;
  a rodada saiu corrompida, e 18 processos de `--jobs` sobreviveram à queda da sessão. Conte processos pela
  linha de comando (`Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*<caminho>*' }` no
  Windows; `pgrep -af <caminho>` no Linux) = 0 antes de remover; ao matar, filtre pelo caminho, nunca pelo nome
  do executável.
- **Preservar o parcial antes do sucessor.** Agente que cai deixa trabalho no disco. Meça o disco, copie o
  parcial, só então relance — em 13/09 um sucessor sobrescreveu 56 KB de plano.
- **Remoção por identificador de bloco, nunca por nome de papel.** Com blocos simultâneos, nomes de cadeira
  colidem entre sessões; em 04/09 uma cadeira apagou o worktree vivo de outra sessão. Resíduo alheio se
  **reporta**, não se varre.
- **Nada de delete em massa na base viva.** `erp-postgres` (5432) e `erp-redis` (6379) são a **base viva deste
  projeto** e nunca são alvo de teste, jurado ou limpeza. Teste com banco sobe cluster **descartável próprio**,
  em porta livre **provada** (comando + saída), removido pelo nome.
- **Sem junction/symlink de `node_modules` entre worktrees** (já no `CLAUDE.md` §C7.1-ter(c)): cada worktree roda o
  seu `npm ci`; remoção só por `git worktree remove --force <caminho próprio>`.

### 2.2 Vida, morte e travamento de agentes e jobs

- **Vida se mede em arquivo; morte, pelo harness; silêncio não é nada.** O sinal de vida é o artefato que cresce
  **de verdade** (linhas de matriz, bytes de relatório, commit). Concluir "morreu" a partir de silêncio já errou
  duas vezes.
- **Nunca `tail -f`, `watch` ou leitura sem fim.** Em 28/09 um `tail -f` travou um agente até o harness matá-lo.
  Leia com `tail -n`/`cat`; comando longo sob `timeout`.
- **Todo job longo precisa de critério de travado.** A ferramenta de mutação do `B-GOV-MANDATO` não tem timeout por
  mutante (fronteira 25): um mutante em laço infinito parou a rodada por horas. Critério: artefato parado +
  CPU parada ou girando sem produzir + sem filho. Decidir o que fazer com medição travada é do dono do plano.
- **O PC do dono suspende à noite** (eventos 42/1 do Windows). Job local noturno para até ele acordar.
- **Vigia precisa de linha de base.** Um detector armado com a condição já verdadeira dispara na hora e não mede
  nada — confira a condição **antes** de armar.
- **Pausa ordenada é corte limpo, não morte (P7, `D-PAUSA-GRAVA-E-PARA`, 01/10).** Ordem de pausa do dono: o
  orquestrador repassa `PAUSA` a cada agente vivo; o agente termina o comando em curso, grava `## PAUSA <hora UTC>`
  na evidência (head · feito · falta · próximo comando · meio-escritos) — quem não tem uma, no arquivo de saída
  que o mandato nomeia — e para sozinho em 1 linha. Só se mata quem não respondeu; job sem modelo (rodada de
  mutação, CI, cluster descartável) não é alvo. Em 01/10 um `TaskStop` no meio de uma conversão LF→CRLF
  custou um parcial suspeito e ~30 min de redo — a pausa estava certa, o corte não. Um vigia parado também: vigia
  que dispara re-invoca o orquestrador e gasta tokens.

### 2.3 Medir a pergunta certa

- **A ferramenta que responde QUASE a pergunta.** Casos medidos: `git diff A B -- src` volta vazio **tanto** se o
  delta foi absorvido **quanto** se ele não toca `src` (absorção se prova comparando árvores:
  `git rev-parse A^{tree}` × `B^{tree}`); `grep` sensível a caixa perdeu "Não há ciclo 3"; contar tamanho não é
  classificar natureza. Antes de confiar numa saída, pergunte: que resultado ela daria se a resposta fosse a
  oposta?
- **Correção por instância não fecha a propriedade.** Três de cinco bloqueios de um ciclo eram a mesma classe do
  outro lado da fronteira corrigida. Gere **todas** as instâncias da propriedade por script, a partir da fonte.
- **Nomeie o mecanismo antes de creditar um resultado.** Um protocolo não reduz o que não tem mecanismo para
  reduzir.
- **Squash apaga a história interna do ramo.** `git log -S` na `main` não data o que aconteceu dentro do ramo, e
  datar texto da `main` por commit de ramo inverte a cronologia.
- **Leia a borda do bloco, não a janela.** Um "job cego a falha" era falso: o `set -o pipefail` estava 77 linhas
  acima, no mesmo bloco `run:`. Delimite o bloco por parse antes de concluir.
- **Checagem é trava, não elo de cadeia.** `git diff --cached --check || exit 1` em **linha própria** antes do
  commit; `a && b` numa linha e o commit na seguinte deixou passar espaço em branco duas vezes.
- **Quem executa pode falsificar a premissa de quem planejou.** Aceite a falsificação medida por emenda escrita
  do planejador, não por silêncio.
- **O ambiente de quem mede entra na medição.** Em 29–30/09 os runners do orquestrador exportavam uma variável de
  conveniência (`MSYS_NO_PATHCONV=1`) que vazou para o artefato medido. Não exporte conveniência no shell que
  roda artefato, guard ou ferramenta: prefixe só o comando que precisa; declare o ambiente no cabeçalho da rodada.

### 2.4 Git, CI e registro

- **Gatilho de push não alcança SHA já empurrado.** Mudar o gatilho do CI não roda check-run em head que já
  estava no remoto; só head novo dispara.
- **Contratos do front vivem na suíte do backend.** `tests/*.test.ts` leem `.tsx` por texto — mexer no front pode
  quebrar o job `backend`. Rode as duas suítes.
- **Router novo:** inclua `src/app.ts` no commit, senão o CI dá 404 `route_not_found`.
- **KPI:** o `Kpis/index.html` é o artefato principal e hidrata dos JSON (`CLAUDE.md` §C3); a cópia congelada do
  `Kpis/app.js` só se gera por `node scripts/kpi-freeze.mjs`; o índice de pendências só pelo gerador
  `agent-orchestration/controle/gerar-indice-pendencias.py`.
- **`approved_head` é o objeto que a JUNTA julgou**, lido da ata — não o head do PR no merge.
- **Sessão de nuvem acrescenta linhas de atribuição por padrão.** Em 30/09 um commit de plano saiu com
  `Co-Authored-By` e `Claude-Session` e com e-mail de autor inventado (refeito com a mesma árvore). O projeto não usa
  linha de atribuição: antes de empurrar, confira `git log -1 --format=%B` e o autor. Num PR de **um commit só**, o
  squash do GitHub mantém o autor original desse commit na `main`.

### 2.5 Agentes e modelos

- **Os papéis de gate têm modelo fixado** no frontmatter (ex.: `planejador-mestre`, `inspetor-de-terreno-da-junta`,
  `porteiro-pos-merge` em Fable). A cota do Fable é **separada** da de sessão; esgotada, o papel roda em Opus com
  **nota de substituição** no parecer (`CLAUDE.md` §C7.6). Escolha explícita do dono por outro modelo também se
  declara no cabeçalho.
- **A `agente-fabrica` não tem Bash:** ela escreve o corpo do agente; quem versiona (sync dos espelhos, `git add -f`,
  commit, push) é o orquestrador. O espelho `.agents/agents/` é **gerado** por
  `node scripts/sync-agent-agents.mjs` (`--check` tem de dar ec=0) — nunca escrito à mão.
- **Corpo aplicado ≠ corpo carregado.** Quando o harness carrega o corpo de um diretório velho, o agente lê o corpo
  do **head julgado** (`git show <ref>:.claude/agents/<nome>.md`), confere o md5 EOL-neutro
  (`tr -d '\r' | md5sum`) e o declara na 1ª linha. Agente lançado como `general-purpose` tem `Write`/`Edit` que o
  corpo pode negar: o mandato proíbe escrita fora do arquivo de evidência.
- **Limite de concorrência medido:** acima de 3 agentes simultâneos na mesma conta, o 429 derrubou agentes.

### 2.6 Armadilhas do Windows do dono **[Windows]**

- **CRLF:** arquivo rastreado sai CRLF no disco (`core.autocrlf=true`); `grep -c $'\r'`/`cat -A` não mostram — use
  `od -c` ou md5 EOL-neutro. Mutação/edição por âncora tem de casar CRLF, e a substituição se **prova** antes de ler
  o resultado. ` M` em `git status` pode ser fantasma de stat-cache: confira `git hash-object` × `git rev-parse :<f>`.
- **`git archive` + `tar` sob autocrlf injeta CR** e fabrica divergência (`CLAUDE.md` §C7.1-ter(c)).
- **Caminho longo:** worktree dentro do scratchpad falha com *Filename too long* e não cria o diretório — use
  caminho curto (`C:/Users/AMP/w-<id>`) e confira que existe.
- **`MSYS_NO_PATHCONV=1`** faz `git.exe`/`node.exe` recusarem `/c/…` e quebra `git show ref:caminho` sem ela —
  use por comando, nunca exportada (§2.3).
- **O ignore global do dono cobre `.claude/` e `.agents/`:** corpo novo nasce invisível; versione com `git add -f` nos
  dois espelhos (a classe residual por nome é a `P-SAN3-00-IGNORE-GLOBAL-POR-NOME-DENTRO-DOS-REINCLUIDOS`).
- **Faixas de porta excluídas pelo Windows existem** (`netsh int ipv4 show excludedportrange protocol=tcp`): escolha a
  porta e **prove** que ligou.

---

## 3. Receitas que funcionaram

- **Lançar um gate/jurado com corpo do head:** `git show <sha>:.claude/agents/<nome>.md`, md5 EOL-neutro conferido
  no prompt ("divergiu → pare"), `model:` do corpo, proibição de escrita fora do arquivo de evidência, worktree
  próprio em caminho curto, evidência **incremental** num arquivo, mensagem final de uma linha.
- **Medição longa reproduzível:** worktree detached no SHA, cabeçalho com o blob (`git rev-parse HEAD:<arquivo>`)
  de cada artefato medido **e** o ambiente, sinal de vida em arquivo, limpeza pelo nome no fim.
- **Merge:** `gh pr merge N --squash --match-head-commit <SHA completo>` sem pipe → `gh pr view N --json state`
  = `MERGED` → só então apagar ramo remoto, worktree e ramo local → porteiro pós-merge.
- **Integração da `main` num PR em curso:** por `merge`, nunca `rebase`; ensaie a resolução num worktree
  descartável e só aplique se a árvore resultante for **idêntica** à do ensaio.

---

## 4. O que está vivo fora da `main` (medido em 30/09)

O ramo `demo/investidor` (49 commits, 23–29/08, base `6efe5adf`) foi comparado arquivo a arquivo com a `main`:

- **Regra viva ausente da `main`:** só a `D-DURABILIDADE-BRANCHES-LOCAIS` (§2.1). Todas as outras decisões e todas
  as pendências do ramo já existem na `main`; os parágrafos de contrato que só o ramo tem são versões **antigas**
  que a `main` reescreveu (protocolo de 5 ciclos, texto velho do inspetor).
- **Registro ausente da `main`:** o parecer do porteiro do #360
  (`agent-orchestration/omega/juntas/votos/B-O6R-REG/00c-porteiro-pos-merge-360.md`) e os planos de povoamento da demo
  (`agent-orchestration/omega/planos/povoamento/*.json`).
- **Trabalho de produto ausente da `main`:** ~227 arquivos de demo para investidor e de acabamento de UX —
  seeds e vídeos de demo (`docs/demo-fluxos/`, `frontend/public/`, `scripts/seed-demo-*`), painel de pátios, tabela
  de preços, clique-na-linha em todas as listas, consistência visual, dossiê do veículo, e fidelidade do app de
  campo (OS, checklists, despesas, estoque, sincronização). Em 223 desses arquivos a `main` não mexeu depois;
  4 colidem (`WorkOrdersPage.tsx`, `GeneralInfoTab.tsx`, `work-orders-row-actions.test.tsx`,
  `scripts/sync-agent-agents.mjs`). **Não entra na `main` por merge direto:** o que for aproveitado vira bloco com
  plano, crítico e junta — e parte dele toca áreas de PRs em voo (app de campo).

---

## 5. Contexto que ainda só existia na memória do orquestrador

### 5.1 `B-O6R-11c` — idempotência durável da sincronização (pré-requisito do app de campo)

Idempotência **durável** por `client_action_id` nos quatro domínios de sincronização do app, começando por
`work_order.create`, que hoje **não carimba**. Toca `prisma/**` e `migrations/**` (autorização nominal, migração
aditiva, `agente-dba-guardiao`, unanimidade de 3). É **pré-requisito** do `B-O6R-11` (#388), não sucessor: sem ele,
resgatar um lote preso em `syncing` troca "ação encalhada" por "OS duplicada", porque o backend não deduplica de
forma durável. Enquanto ele não mergear, o caminho de perda **MP5** (lote preso em `syncing`, invisível ao replay)
continua vivo. Os 6 sítios de `sync_replay_service.dart` que rasgam transição atômica (`status` e `result_ref`
no mesmo `copyWith`, l.731) só entram depois dele, ou com um comando SQL composto provado por drill com morte
entre comandos.
