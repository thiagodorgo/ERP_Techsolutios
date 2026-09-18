# BRIEFING — junta do B-SAN3-01 (a web deixa de fabricar dado quando o backend recusa)

> Votos em `agent-orchestration/omega/juntas/votos/B-SAN3-01/`. Ata: `J-B-SAN3-01.md`. Plano do bloco:
> `agent-orchestration/omega/planos/B-SAN3-01-plano.md`; comando com a emenda do orquestrador:
> `agent-orchestration/codex/comandos/B-SAN3-01-web-wo-sem-fallback-fabricado.md`.

## 0. Terreno (declarado por escrito — §A7)

- **Conteúdo julgado:** `bb540fb3` da branch `fix/web-wo-sem-fallback-fabricado` (PR `#387`). Base: `origin/main@02bd7dab`.
  O que mudou: `git diff --stat 02bd7dab bb540fb3`.
- **Meça na ref, nunca no disco da sessão:** `git -C <seu-worktree> show bb540fb3:<caminho>` (git-bash: `export MSYS_NO_PATHCONV=1`,
  caminhos `C:/...`).
- **Isolamento:** worktree próprio detached em `bb540fb3`, em `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/j-bsan301-<cadeira>`
  (`git -c core.longpaths=true worktree add --detach`); `npm ci` e `npm --prefix frontend ci` próprios; quem subir back e front
  usa **cluster Postgres descartável próprio** (`postgres:16`, nome `j-bsan301-<cadeira>-pg`, porta própria) e portas de app
  próprias, com `VITE_USE_MOCKS` **desligado**; quem rodar `npm test` usa também **Redis descartável próprio** (`redis:7-alpine`,
  nome `j-bsan301-<cadeira>-redis`) com `REDIS_URL` exportada — sem ela a suíte aponta para `redis://localhost:6379`, o Redis
  vivo da máquina, e com ele parado 6 testes caem em `ECONNREFUSED` (medido pelo orquestrador em 2026-09-18). Portas: confira
  as faixas excluídas do Windows (`netsh int ipv4 show excludedportrange protocol=tcp`). Tudo removido pelo nome ao fim. Sem junction de `node_modules`; sem
  `git stash/checkout/reset/clean` alheio; base viva (`erp-postgres`, `erp-redis`) fora de alvo.
- **Quórum: unanimidade de 3** — bloco de perda de dado (§C7.1-ter(b)). Todo achado declara `gravidade` (bloqueia | ajuste | nota)
  e `escopo` (dentro-do-bloco | pre-existente, com evidência de data/origem). "Não consigo medir" = REPROVADO. Nenhuma cadeira
  propõe correção. Sem crítico (bloco não é de invariante financeiro).
- **E2e — leia antes de rodar.** O spec rastreado `tests/e2e/critical-flows.spec.ts` morre inteiro no login desde 2026-07-02
  (espera o campo "Tenant ID", que saiu em `d5a4ed43`, #111): é pré-existente, está em `P-SAN3-01-E2E-LOGIN-DEFASADO` (dono
  `B-SAN3-10`) e **não reprova este bloco**. Os casos E1–E3 deste bloco rodam por uma cópia avulsa, versionada em
  `votos/B-SAN3-01/apoio/e2e-copia-avulsa.spec.ts`: casos e auxiliares idênticos ao rastreado no objeto, só o login ajustado
  ao formulário atual (e-mail e senha). Confira você mesmo a identidade (hash das funções) antes de usar; copie-a para o
  `tests/e2e/` do SEU worktree e rode `npx playwright test -c playwright.config.ts tests/e2e/<cópia> --reporter=list`, com
  `DATABASE_URL` do seu cluster, `E2E_API_PORT`/`E2E_FRONTEND_PORT` próprias e `npm run db:seed` antes.
- **Emenda 2 do comando.** O orquestrador decidiu as 11 divergências do desenvolvedor (D-1 a D-11) na emenda 2, ao fim do
  comando: leia-a. As dívidas do #386 (A1, A2, A3 e o parecer do porteiro) são pagas por este PR, em commit próprio do
  orquestrador; a trilha SAN3 no `roadmap` do painel foi feita pela 3ª instância do desenvolvedor (§8.6 do plano).
- **P1/P2:** voto nasce como esqueleto e cada medição é apensada à evidência, em `.../scratchpad/votos-B-SAN3-01/<Cn>-<papel>-voto.json`
  e `-evidencia.md`; mensagem final de 1 linha. **P5:** no máximo 2 cadeiras em paralelo. **P6:** `votos/B-SAN3-01/00-quedas.md`.

## 1. Composição

| Cadeira | Titular | Suplente | Por que |
|---|---|---|---|
| C1 — diff × plano, bateria e vermelho-controle | `validador-mestre` | `agente-ci-doutor` | o plano mede 31 vermelhos no head-base e zero depois; as mutações do fail-closed (G1, R1, 403) |
| C2 — telas e rotas ponta a ponta, por papel | `master-teste-telas-rotas` | `inspetor-de-rotas` | E1–E3 e as 4 rotas com back e front reais, sem mocks; nenhum ID fabricado na tela |
| C3 — fidelidade dos estados (§7/§11) | `cognicao-visual` | `frontend-pixel-master` (somente leitura) | erro, vazio, sem permissão, não encontrado e desatualizado distintos a olho; sem cópia técnica |

**Nota da composição.** O §8.5 do plano propunha três cadeiras mais um voto de fidelidade; o orquestrador fixou três, com
unanimidade, e deu à C1 as mutações que o plano atribuía ao `guardiao-fail-closed` (o default de todo ramo de erro é estado,
nunca dado).

**Inelegíveis (conferir por nome):** `planejador-mestre` (planejou), o desenvolvedor (agente `general-purpose` do bloco), o
orquestrador, `porteiro-pos-merge`, `inspetor-de-terreno-da-junta`.

## 2. Mandato por cadeira (3 itens cada)

**C1 `validador-mestre`.** (1) Diff × plano: só os arquivos do §5 do plano e da emenda; `OperationsDispatchesPage.tsx` só em
`loadDetail`; nada de `src/**`. (2) A bateria do §8.1 reexecutada no objeto, com N e forma, e os vermelho-controle: os testes do
bloco vermelhos no head-base (o plano mede 31) e verdes no objeto; as mutações G1 (reintroduzir `?? getMock…`), R1 (stale →
apagar) e a do reducer de 403, cada uma deixando teste vermelho. (3) Registro: `P-008` fechada; as pendências do §3.4 com
evidência de data e dono; §C3 (N e forma; `kpi-freeze --check`; os 3 guards de KPI; a trilha SAN3 no `roadmap` fiel à tabela
do §5 do `docs/revisoes/SAN3/PLANO_SAN3.md`); as dívidas do #386 contra o parecer do porteiro (backfill com os hashes completos,
as duas `jurado-san3c2-*` fora dos dois espelhos com `sync-agent-agents --check` verde, a manchete dos 54 emendada); índice
byte-idêntico ao gerador numa cópia. Mais uma mutação: o seletor antigo do E2 (`getByLabel(/^Descri[çc][ãa]o$/)`) de volta
deixa o E2 vermelho.

**C2 `master-teste-telas-rotas`.** (1) Com back e front reais (cluster próprio, `VITE_USE_MOCKS` desligado), percorre E1–E3 e as
4 rotas (`/work-orders`, `/work-orders/new`, `/work-orders/:id` real e inexistente) como `tenant_admin` (`admin.demo@example.com`,
o único usuário que o seed cria). Papel × passo (CE-G2) é o §7 do plano: nenhum passo do e2e usa `operator`, e os demais papéis
estão nos testes unitários com `manager`; confira essa tabela contra as rotas do backend em vez de exigir um usuário que o seed
não tem. (2) Prova
por execução que nenhuma tela mostra ID fabricado (enumere os IDs de mock por `grep` em `frontend/src/mocks/**` e procure-os no
DOM renderizado de cada rota e do detalhe de despacho). (3) Create com 422 → erro na tela, dados digitados preservados, sem
navegar; 404 → estado de erro; detalhe de despacho com falha → mensagem, item da lista mantido.

**C3 `cognicao-visual`.** (1) Erro ≠ vazio ≠ sem permissão ≠ não encontrado ≠ desatualizado, distintos a olho (§7), contra o
protótipo e `screen-refs/` quando houver. (2) KPIs com "—" no erro; nenhuma cópia técnica (§3/§11). (3) Dashboard e Despachos com
vazio honesto.

## 3. A re-verificar (não é fato herdado)

O relatório do desenvolvedor (`votos/B-SAN3-01/00-dev.md`, 2ª e 3ª instâncias) e o plano são afirmações a medir, não prova. Contagem a conferir: o plano previa 31 vermelhos no head-base; o desenvolvedor mediu **43 de 47** no commit A (`7b2ab102`). A conferência do orquestrador (`votos/B-SAN3-01/00a-conferencia-orquestrador.md`) também é insumo, não prova — em especial o censo do §2
(350 `catch`/`??`, 19 da classe A): a C1 regenera o censo por conta própria.

## 4. Perda de jurado

Suplente nomeado re-executa o mandato inteiro; voto perdido não conta; menos de 3 votos de mérito não fecha; toda queda em
`00-quedas.md` (P6).
