# BRIEFING — junta do B-SAN3-01 (a web deixa de fabricar dado quando o backend recusa) — v2

> **v2 (2026-09-18), depois do parecer do inspetor de terreno** (`votos/B-SAN3-01/00b-inspetor-terreno.md`, LIBERADO COM
> RESSALVA, 8 ressalvas). A v1 está versionada em `74f3f7c9`; esta a substitui e entra no commit da ata. O que mudou: a 4ª
> cadeira (R1), as URLs explícitas (R2), objeto × head (R3), escopo declarado pelo próprio jurado e a cópia do e2e como
> subconjunto (R6), a declaração do achador (R7), a prova por papel (R8) e a frase do `roadmap`, que estava errada.

> Votos em `agent-orchestration/omega/juntas/votos/B-SAN3-01/`. Ata: `J-B-SAN3-01.md`. Plano do bloco:
> `agent-orchestration/omega/planos/B-SAN3-01-plano.md`; comando com a emenda do orquestrador:
> `agent-orchestration/codex/comandos/B-SAN3-01-web-wo-sem-fallback-fabricado.md`.

## 0. Terreno (declarado por escrito — §A7)

- **Conteúdo julgado:** `bb540fb3` da branch `fix/web-wo-sem-fallback-fabricado` (PR `#387`). Base: `origin/main@02bd7dab`.
  O que mudou: `git diff --stat 02bd7dab bb540fb3`. **Head do PR na junta: `74f3f7c9`** = o objeto + 10 arquivos só de registro
  da junta (`git diff --stat bb540fb3 74f3f7c9`, zero código) (R3). Commit de código novo na branch reabre a inspeção.
- **Meça na ref, nunca no disco da sessão:** `git -C <seu-worktree> show bb540fb3:<caminho>` (git-bash: `export MSYS_NO_PATHCONV=1`,
  caminhos `C:/...`).
- **Isolamento:** worktree próprio detached em `bb540fb3`, em `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/j-bsan301-<cadeira>`
  (`git -c core.longpaths=true worktree add --detach`); `npm ci` e `npm --prefix frontend ci` próprios; quem subir back e front
  usa **cluster Postgres descartável próprio** (`postgres:16`, nome `j-bsan301-<cadeira>-pg`, porta própria) e portas de app
  próprias, com `VITE_USE_MOCKS` **desligado**; **toda cadeira exporta `DATABASE_URL` e `REDIS_URL` explícitas para os SEUS contêineres antes de qualquer `db:seed`,
  `migrate`, `npm test` ou e2e, e cita no voto a URL usada, sem senha (R2): a porta `5432` desta máquina é o `pastrack-banco-1`,
  banco de OUTRO projeto, e é o padrão do `playwright.config.ts` e de `.env` herdado.** Quem rodar `npm test` usa também **Redis descartável próprio** (`redis:7-alpine`,
  nome `j-bsan301-<cadeira>-redis`) com `REDIS_URL` exportada — sem ela a suíte aponta para `redis://localhost:6379`, o Redis
  vivo da máquina, e com ele parado 6 testes caem em `ECONNREFUSED` (medido pelo orquestrador em 2026-09-18). Portas: confira
  as faixas excluídas do Windows (`netsh int ipv4 show excludedportrange protocol=tcp`). Tudo removido pelo nome ao fim. Sem junction de `node_modules`; sem
  `git stash/checkout/reset/clean` alheio; base viva (`erp-postgres`, `erp-redis`) fora de alvo.
- **Quórum: unanimidade de 4** — o bloco é de perda de dado (§C7.1-ter(b) pede unanimidade de 3); o orquestrador acrescentou a
  4ª cadeira pela R1 do inspetor, e a unanimidade vale para as quatro. Todo achado declara `gravidade` (bloqueia | ajuste | nota)
  e `escopo` (dentro-do-bloco | pre-existente, com evidência de data/origem). "Não consigo medir" = REPROVADO. Nenhuma cadeira
  propõe correção. Sem crítico (bloco não é de invariante financeiro).
- **E2e — leia antes de rodar.** O spec rastreado `tests/e2e/critical-flows.spec.ts` morre inteiro no login desde 2026-07-02
  (espera o campo "Tenant ID", que saiu em `d5a4ed43`, #111): é pré-existente, está em `P-SAN3-01-E2E-LOGIN-DEFASADO` (dono
  `B-SAN3-10`). É a leitura do orquestrador, com evidência; **quem declara `pre-existente` é o jurado, com evidência própria**
  (§C7.1-ter(a), R6). Os casos E1–E3 deste bloco rodam por uma cópia avulsa, versionada em
  `votos/B-SAN3-01/apoio/e2e-copia-avulsa.spec.ts`: é um **subconjunto** do spec (E1–E3 e três auxiliares, sem o `beforeAll` e sem
  os outros 10 casos), com casos e auxiliares idênticos **por função** ao rastreado em `ca7c5d04` e só o login ajustado ao
  formulário atual (e-mail e senha). Confira a identidade por função (hash de cada bloco) antes de usar; copie-a para o
  `tests/e2e/` do SEU worktree e rode `npx playwright test -c playwright.config.ts tests/e2e/<cópia> --reporter=list`, com
  `DATABASE_URL` do seu cluster, `E2E_API_PORT`/`E2E_FRONTEND_PORT` próprias e `npm run db:seed` antes.
- **Emenda 2 do comando.** O orquestrador decidiu as 11 divergências do desenvolvedor (D-1 a D-11) na emenda 2, ao fim do
  comando: leia-a (são 16: as 11 da 2ª instância e as 5 da 3ª). As dívidas do #386 (A1, A2, A3 e o parecer do porteiro) são
  pagas por este PR, em commit próprio do orquestrador. A rodada SAN3 entrou no painel pelo gráfico de entregas por rodada; o
  `roadmap` não tem segunda trilha (medido) e o acompanhamento do gate virou `P-SAN3-PAINEL-TRILHA-DO-GATE` (emenda 2 (e)).
- **P1/P2:** voto nasce como esqueleto e cada medição é apensada à evidência, em `.../scratchpad/votos-B-SAN3-01/<Cn>-<papel>-voto.json`
  e `-evidencia.md`; mensagem final de 1 linha. **P5:** no máximo 2 cadeiras em paralelo (duas levas: C1+C4, depois C2+C3). **P6:** `votos/B-SAN3-01/00-quedas.md`.

## 1. Composição

| Cadeira | Titular | Suplente | Por que |
|---|---|---|---|
| C1 — diff × plano, bateria, KPI e registro | `validador-mestre` | `agente-ci-doutor` | escopo, os vermelhos do commit A e o zero do B, §C3, as pendências e as dívidas do #386 |
| C2 — telas e rotas ponta a ponta, por papel | `master-teste-telas-rotas` | `inspetor-de-rotas` | E1–E3 e as 4 rotas com back e front reais, sem mocks; nenhum ID fabricado na tela |
| C3 — fidelidade dos estados (§7/§11) | `cognicao-visual` | `frontend-pixel-master` (somente leitura) | erro, vazio, sem permissão, não encontrado e desatualizado distintos a olho; sem cópia técnica |
| C4 — fail-closed: todo ramo de erro vira estado, nunca dado | `guardiao-fail-closed` | `coordenador-de-acessos` | as mutações G1, R1 e a do reducer de 403 e o censo da classe, gerado do código (R1 do inspetor) |

**Nota da composição.** O §8.5 do plano propunha três cadeiras mais um voto de fidelidade, com o `guardiao-fail-closed` nas
mutações. A v1 deste briefing deu as mutações à C1; o inspetor mostrou que o corpo do `validador-mestre` não carrega essa
competência (R1). A v2 devolve as mutações a quem as tem: a C4 `guardiao-fail-closed`, e a unanimidade passa a ser de quatro.

**Declaração do orquestrador (R7).** A graduação ALTA da `P-008` veio da fatia C1 do inventário SAN3 (2026-09-11). Essa fatia
foi medida por agentes do tipo padrão (`general-purpose`), lançados duas vezes (a 1ª caiu), e **nenhuma das 8 identidades desta
composição** (titulares e suplentes) foi inventariante. Participação em outro objeto, registrada e sem colisão pela regra:
`validador-mestre` foi C3 do ciclo 1 da junta do plano SAN3 (#386) e `agente-ci-doutor` foi C3 do ciclo 2 e fez a conferência
da aplicação; `coordenador-de-acessos` foi C2 do ciclo 1 do #386.

**Inelegíveis (conferir por nome):** `planejador-mestre` (planejou), o desenvolvedor (agente `general-purpose` do bloco), o
orquestrador, `porteiro-pos-merge`, `inspetor-de-terreno-da-junta`.

## 2. Mandato por cadeira (3 itens cada)

**C1 `validador-mestre`.** (1) Diff × plano: só os arquivos do §5 do plano e da emenda; `OperationsDispatchesPage.tsx` só em
`loadDetail`; nada de `src/**`. (2) A bateria do §8.1 reexecutada no objeto, com N e forma, e os vermelho-controle: os testes do
bloco vermelhos no head-base (o plano previa 31; o desenvolvedor mediu 43 de 47) e verdes no objeto; e o backend (`npm test`)
com Postgres e Redis descartáveis, conferido contra os 2996/2998 publicados. (3) Registro: `P-008` fechada; as pendências do §3.4 com
evidência de data e dono; §C3 (N e forma; `kpi-freeze --check`; os 3 guards de KPI; a rodada SAN3 no gráfico de entregas por rodada, com o caso
novo da guarda do painel vermelho sem a linha do `app.js`; o `roadmap.as_of` e a coerência dos blocos com o history); as dívidas do #386 contra o parecer do porteiro (backfill com os hashes completos,
as duas `jurado-san3c2-*` fora dos dois espelhos com `sync-agent-agents --check` verde, a manchete dos 54 emendada); índice
byte-idêntico ao gerador numa cópia.

**C2 `master-teste-telas-rotas`.** (1) Com back e front reais (cluster próprio, `VITE_USE_MOCKS` desligado), percorre E1–E3 e as
4 rotas (`/work-orders`, `/work-orders/new`, `/work-orders/:id` real e inexistente) como `tenant_admin` (`admin.demo@example.com`,
o único usuário que o seed cria). Papel × passo (CE-G2) é o §7 do plano: nenhum passo do e2e usa `operator`, e os demais papéis
estão nos testes unitários com `manager`; confira essa tabela contra as rotas do backend em vez de exigir um usuário que o seed
não tem. (2) Prova
por execução que nenhuma tela mostra ID fabricado (enumere os IDs de mock por `grep` em `frontend/src/mocks/**` e procure-os no
DOM renderizado de cada rota e do detalhe de despacho). (3) Create com 422 → erro na tela, dados digitados preservados, sem
navegar; 404 → estado de erro; detalhe de despacho com falha → mensagem, item da lista mantido. Mais uma mutação: o seletor
antigo do E2 (`getByLabel(/^Descri[çc][ãa]o$/)`) de volta deixa o E2 vermelho. Registre no voto que a prova por papel
`operator` fica nos testes unitários (CE-G2, §7 do plano), não no e2e (R8).

**C3 `cognicao-visual`.** (1) Erro ≠ vazio ≠ sem permissão ≠ não encontrado ≠ desatualizado, distintos a olho (§7), contra o
protótipo e `screen-refs/` quando houver. (2) KPIs com "—" no erro; nenhuma cópia técnica (§3/§11). (3) Dashboard e Despachos com
vazio honesto.

**C4 `guardiao-fail-closed`.** (1) As três mutações do fail-closed, cada uma com o teste que tem de ficar vermelho e a forma
(comando, N, saída): G1 — reintroduzir `?? getMock…` (ou um `catch` que devolva mock) num service de OS ou de despachos fora de
`isMockMode()`; R1 — o estado "desatualizado" apagar os dados já exibidos em vez de mantê-los com a faixa; a do reducer — o 403
virar lista vazia em vez de "sem permissão". (2) O censo da classe gerado do código por você (todo `catch`/`.catch`/`??` que
devolve entidade fabricada em `frontend/src/**`): cada ocorrência da fronteira do plano fechada, e cada uma fora dela com
pendência nomeada e dono (as `P-SAN3-01-*`); membro novo da classe que nasça permitido sem quebrar teste é `bloqueia`. (3) O
guard G1 prova-se por mutação e não por leitura, inclusive a regra de ignorar linha só de comentário (D-11 da emenda 2).

## 3. A re-verificar (não é fato herdado)

O relatório do desenvolvedor (`votos/B-SAN3-01/00-dev.md`, 2ª e 3ª instâncias) e o plano são afirmações a medir, não prova. Contagem a conferir: o plano previa 31 vermelhos no head-base; o desenvolvedor mediu **43 de 47** no commit A (`7b2ab102`). A conferência do orquestrador (`votos/B-SAN3-01/00a-conferencia-orquestrador.md`) também é insumo, não prova — em especial o censo do §2
(350 `catch`/`??`, 19 da classe A): a C1 regenera o censo por conta própria.

## 4. Perda de jurado

Suplente nomeado re-executa o mandato inteiro; voto perdido não conta; menos de 4 votos de mérito não fecha; toda queda em
`00-quedas.md` (P6).
