# BRIEFING — junta do bloco `B-O6R-ARNES` (2026-08-28)

> **A primeira junta que roda sob `D-JUNTA-ESCOPO-E-CALIBRACAO`.** Leia este briefing inteiro antes de
> medir qualquer coisa. Nada aqui é fato: o que você não executar não conta.

## O objeto

| | |
|---|---|
| **Head a julgar** | **`d4cf978`**, topo de `fix/o6r-arnes-catalogo-unico` · **PR #359**, aberto, **CI 7/7 verde** |
| **Base** | `origin/main` = **`6efe5ad`** (ancestral direto; `git merge-base` conferido pelo inspetor) |
| **Plano** | `agent-orchestration/omega/planos/B-O6R-ARNES-plano.md` — §1 propriedades PA–PG · §5 arquivos · §6 pisos · §7 drills D37–D43 · §9 bateria |
| **Diff** | +1455/−88 em 14 arquivos |
| **Worktree do dev** | `.claude/worktrees/arnes-dev` — **somente leitura para você**; crie o seu |

## Por que este bloco existe

O `B-O6R-02` (financeiro) foi reprovado no ciclo 4 por um defeito de **arnês de teste** que ele **não
criou e estava proibido de consertar**: `tests/audit-security.test.ts` é de 08/06 e
`tests/helpers/auth-identity-fixture.ts` nasceu no bloco anterior em 19/08; a branch do financeiro
começou em 20/08. O dono decidiu (`D-JUNTA-ESCOPO-E-CALIBRACAO` §5) tirar a classe de lá e fechá-la
aqui, primeiro — é pré-requisito de confiança em **qualquer número** dos 10 blocos restantes da rodada.

Insumos do achado: `agent-orchestration/omega/reprovacoes/R-B-O6R-02-ciclo4.md` e o voto
`agent-orchestration/omega/juntas/votos/B-O6R-02-ciclo4/04-jurado-c4-suplente-arnes.json`.

## A REGRA NOVA — o seu voto declara `escopo`

Todo achado seu declara **`gravidade`** (`bloqueia` | `ajuste` | `nota`) **e `escopo`**:

| escopo | significado | efeito |
|---|---|---|
| `dentro-do-bloco` | o achado toca o que este bloco mudou | `bloqueia` reprova |
| `pre-existente` | a classe antecede o bloco e/ou está fora do escopo permitido dele | **não reprova** — vira pendência nomeada com bloco dono, e o número afetado é publicado com N, forma e causa |

**Escopo declarado sem evidência de data ou origem é tratado como `dentro-do-bloco`.** E vale nos dois
sentidos: **não use `pre-existente` para poupar o bloco daquilo que ele veio fechar** — a classe do
arnês É o objeto deste bloco. O veto (cadeiras 1 e 3) só derruba com `bloqueia` **e**
`dentro-do-bloco`.

## Composição — 3 cadeiras, MAIORIA simples

O bloco toca só `tests/` e `scripts/`: não toca dinheiro, segurança, permissão nem dado de produto
(§C7.1-ter). **Sem `critico-adversarial`** — a regra nova o reserva para blocos de invariante; é
desenho, não falta.

| Cadeira | Identidade | Veto | Suplente nomeado |
|---|---|---|---|
| Catálogo / arnês | `jurado-arnes-catalogo-postgres` | sim | `jurado-arnes-suplente-catalogo-postgres` |
| Runner / denominador | `jurado-arnes-runner-denominador` | não | `jurado-arnes-suplente-runner-denominador` |
| Diff / escopo / registro | `jurado-arnes-diff-escopo-registro` | sim | `jurado-arnes-suplente-diff-escopo-registro` |

**Perda de jurado:** voto perdido **nunca** conta como aprovação; o suplente re-executa o briefing
**inteiro** e a identidade caída fica queimada; a junta **não fecha com menos de 3 votos de mérito**.

**Substituição registrada (ressalva R-A do inspetor):** o §13.1 do plano ainda nomeia
`jurado-c5-arnes-catalogo-postgres` como cadeira 1. Ele foi **recusado pelo inspetor na 1ª passada** —
o corpo dele é o contrato da junta do ciclo 5 do `B-O6R-02` (mandato, drills `D26/D26b` e head de
outro bloco, e formato de voto **sem** o campo `escopo`, o que faria uma cadeira com veto reprovar
este bloco por achado pré-existente). Ele fica **intocado e reservado** para aquela junta; a cadeira 1
é o titular novo. A ata consigna a substituição.

## O terreno (inspetor de terreno, 2 passadas — leia os pareceres)

`votos/B-O6R-ARNES/00a-…-BLOQUEADO.md` (1ª) e `00b-…-LIBERADO-COM-RESSALVA.md` (2ª).
Regras que você cumpre: **worktree próprio** (`git worktree add --detach`), **`npm ci` próprio —
junction/symlink de `node_modules` é PROIBIDA** (em 26/08 a remoção de um worktree apagou o
`node_modules` alheio por dentro de uma junction), **cluster Postgres descartável próprio** em porta
livre, derrubado no fim. A base viva `erp-postgres`/`erp-redis` **não é alvo de ninguém, nem para
leitura**. Node **v20.19.5**. **Exit por variável, nunca por pipe.** Pristino por
`git hash-object` = `git rev-parse <head>:<caminho>`; **medir commit por `git archive` + `tar` sob
`core.autocrlf=true` é PROIBIDO** — injeta CR e fabrica divergência (virou pendência ALTA e foi
fechada por não-reprodução). Logs em scratchpad próprio, nunca dentro do worktree.

**Ressalvas que você recebe em destaque:**

- **R-B** worktree `gov-descuido` com mutação viva — fora desta junta, não entre nele.
- **R-C** `.tmp-demo/` untracked na árvore principal — inerte.
- **R-D** worktrees do bloco irmão vivos (`agent-af6ea607…`, `plan-c5`), porcelain limpo — não os reutilize.
- **R-E** as **duas divergências declaradas pelo dev** são para **julgar, não herdar**.
- **N1** na árvore principal, `planejador-mestre.md`, `porteiro-pos-merge.md` e
  `scripts/sync-agent-agents.mjs` aparecem como `M` no `git status` — é **fim de linha/stat, não
  mutação** (blob = índice, provado por `hash-object`). Não trate como contaminação nem conserte.

## As afirmações do dev — TODAS `[A RE-VERIFICAR]`, nenhuma é fato

| # | Afirmação | Quem re-verifica |
|---|---|---|
| 1 | **F0 na base: 7/13 vermelhas** com `XX000`, incluindo vítimas que **tomavam** o lock (`rls-tenant-isolation` 3x, `auth-identity-backfill-db` 1x), e 1 queda de denominador 37 para 32. **O plano previa 5/13 — a divergência é sua para resolver por execução** | catálogo |
| 2 | Canônica 3 pós, **N=10**: as 10 idênticas — `2597 · 2595 · fail 0 · skip 2 · ec 0 · XX000 0 · Δroles 0 · Δlinhas +10` | catálogo |
| 3 | Bateria barata pós **13/13**, denominador **37 idêntico** | catálogo |
| 4 | Casos de guarda **22 para 34**; KPI `backend_tests` 2595/2597, focada 34/34, `mvp_*` intocados | diff/escopo |
| 5 | Canônica 1: ec=1 nas 3, denominador **2358 idêntico**, vermelho ambiental **pré-existente nomeado**; canônica 2: 3/3 ec=0, 148 idêntico | runner |
| 6 | Piso de denominador: `ec` 0 para 1 **nomeando o arquivo**; porte +42/+56 verbatim (blobs `28a589b`/`593c3b8`) | runner |
| 7 | Residual **+10/rodada atribuído por execução** a `core-saas-prisma` (+4/+4) e `core-saas-role-authority-db` (+1/+1), **fora da §5** — nomeados, não consertados | catálogo · diff/escopo |
| 8 | **Dois auto-defeitos que o próprio dev achou e corrigiu** (`14fb8fb`, `1676a5b`) | todas |

**Sobre o item 8, a advertência que importa:** é honesto que ele os tenha reportado, mas o §C7.4-bis
diz que **quem acha não conserta**, e aqui ele fez as duas coisas. Trate-os como **sinal, não
absolvição**: (a) o `.catch(() => undefined)` **morreu** ou apenas **mudou de lugar**? (b) o piso de
denominador foi exercitado com fixture **dentro E fora** do repositório? — foi exatamente a fixture
fora do repositório que cegou o drill original, e a lição que o dev registrou é
*"drill cuja fixture não reproduz o arranjo real prova o mecanismo, não a propriedade"*.

## O que NÃO é objeto deste bloco (§10 do plano)

O mérito financeiro (FK, RLS, contrato do `B-O6R-02`) · paralelismo declarado (`--test-concurrency`) ·
DDL de esquema compartilhado · as 68 roles `rls_test_` legadas · teto da fila do lock · o vermelho
ambiental da canônica 1 · `P-O6R-B02-SUITES-LIST-CI`. Achado nessas áreas é `pre-existente` **com
evidência** — pendência nomeada, não reprovação.

## Sobrevivência

Cadeiras já morreram por limite de sessão nesta casa. Vá direto ao que a **sua** cadeira julga; lotes
focados; diga qual cadeira cobre o que você não repetir; **economia nunca substitui execução** —
afirmação sem comando executado invalida o voto. Se sentir que vai cair, **devolva o que já mediu**.
