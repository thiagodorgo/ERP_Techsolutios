# BRIEFING — junta do PR #386 (plano SAN3 + registro + fechamento do B-O6R-06)

> Votos em `agent-orchestration/omega/juntas/votos/SAN3-plano/`. Ata: `J-SAN3-plano.md`. Autor do briefing: o
> orquestrador (autor do plano — por isso inelegível para votar, §1).

## 0. Terreno (declarado por escrito — §A7)

- **Conteúdo julgado:** `a143d2c33674cc2c3562de40cc9d3a95350cabe5` da branch `docs/san3-plano-saneamento` (PR #386),
  base `origin/main@15ef3fbed57e217b66e6b307f9ae96502777fd09`. **Este briefing entra no commit seguinte**, que só
  acrescenta arquivos em `agent-orchestration/omega/juntas/` — confira com
  `git diff --stat a143d2c3 <head-do-PR> -- . ':!agent-orchestration/omega/juntas'` (tem de sair vazio).
- **Meça na ref, nunca no disco da sessão:** `git -C <seu-worktree> show a143d2c3:<caminho>` (git-bash:
  `export MSYS_NO_PATHCONV=1`). A norma que vale é a do `CLAUDE.md` NA REF (`git show a143d2c3:CLAUDE.md`). Norma
  citada que não existe na ref não se aplica. O `CLAUDE.md` que a sua sessão carregou pode ser de outra branch
  (`P-GOV-CAMINHO-REPO-SESSAO`) — não o use como fonte.
- **O PR não toca código:** `git diff --stat 15ef3fbe a143d2c3 -- src tests prisma frontend mobile .github scripts`
  tem de sair vazio. Nenhuma cadeira precisa de banco nem de cluster.
- **Isolamento:** cada cadeira mede em **worktree próprio, detached em `a143d2c3`**, com `npm ci` próprio se for
  rodar `node --test`. **Proibido** junction/symlink de `node_modules` entre worktrees; remoção só por
  `git worktree remove --force`. O gerador do índice ESCREVE `pendencias-indice.md`: rode-o numa **cópia fora do
  repo** e compare byte a byte. Base viva `erp-postgres`/`erp-redis`: não é alvo de ninguém. Nada de
  `git stash/checkout/reset/clean` em worktree alheio.
- **Quórum: unanimidade de 3** (§C7.1-ter(b)). O PR não toca código, mas **fecha por presença** pendências de
  segurança, permissão e dinheiro (entre as 31 que viraram FECHADA: `P-018`, `P-SCALE-RBAC-OWNER-APPROVAL`,
  `P-Ω4-7-*`, `P-Ω4-4-REVERSE-IDEM`) — um fechamento errado esconde defeito dessas classes. O quórum é o da classe
  (crítico SAN3 r2, CR2-07). Todo voto declara `escopo` (`dentro-do-bloco` | `pre-existente`, com evidência de
  data/origem) além de `gravidade` (`bloqueia` | `ajuste` | `nota`). "Não consigo medir" = REPROVADO. Nenhuma
  cadeira propõe correção (§C7.4-bis).
- **P2:** cada cadeira grava o voto **incrementalmente**, via Bash, em
  `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/votos-SAN3/<Cn>-<papel>-voto.json`
  e `<Cn>-<papel>-evidencia.md`. O orquestrador versiona em `votos/SAN3-plano/` ao consolidar.
- **P5:** no máximo 2 cadeiras em paralelo.

## 1. Composição

| Cadeira | Titular (papel permanente) | Suplente | Por que esta competência |
|---|---|---|---|
| C1 — ordem, dependências, agenda e viabilidade | `estrategista` | `agente-dba-guardiao` | o caminho crítico do plano é backend de dado e dinheiro (`04a`, `03a`, `SAN3-02`, `SAN3-03`, `SAN3-05`) |
| C2 — classificação de isolamento, permissão e segurança | `coordenador-de-acessos` | `guardiao-fail-closed` | 10 dos 49 bloqueantes (itens 9–18 do §4.1) são de isolamento, RBAC ou segurança, e outros passam pela cadeia papel → menu (12, 13, 14, 38, 39, 45, 46) |
| C3 — diff × regras, KPI e registro | `validador-mestre` | `agente-ci-doutor` | backfill de KPI, painel, obituário e aposentadoria, os 52 flips e as 49 ausentes do registro |

**Inelegíveis neste caso (conferido por nome):** `critico-adversarial` (atacou o plano nas duas rodadas);
`porteiro-pos-merge` (achador das 3 ressalvas do #385 que este PR paga, e porteiro do próximo merge);
`planejador-mestre` (vai planejar os blocos que este plano define); o orquestrador (autor do plano). Os 8
inventariantes e o agente de registro foram agentes `general-purpose`, sem identidade de papel. Os papéis
permanentes não se sepultam (`OBITUARIO-IDENTIDADES.md` §4): a inelegibilidade é por caso, conferida nas atas —
nenhum dos seis nomeados na tabela atuou no `B-O6R-06` nem na rodada SAN3.

## 2. Mandato por cadeira (P4 — 3 itens cada, todos por medição)

**C1 `estrategista`.**
1. **Agenda do §6 com as travas de mesmo arquivo.** Para cada par de blocos em frentes diferentes cujas fronteiras
   (§5) compartilham arquivo, a agenda os serializa? Há dependência de dado omitida? Os tempos de início e fim
   batem com as dependências declaradas na coluna "Dep." do §5?
2. **Viabilidade do §9.** Os 8 tempos de `gh pr view <n> --json commits,mergedAt`, as medianas (28,4 h e 57,0 h),
   a soma de cada frente, o caminho crítico e o que o plano soma de porteiro e reexecução de KPI.
3. **Cobertura e destrave.** Todo item do §4.1 tem bloco no §5 e todo bloco fecha item do §4.1; e as duas revisões
   de decisão que destravam o `B-SAN3-02` e o `B-SAN3-20` estão registradas (`decisoes.md`,
   `REGISTRO-SAN3-CONFLITOS`) e têm pergunta ao dono com default (§10.5).

**C2 `coordenador-de-acessos`.**
1. **Itens 9–18 do §4.1, medidos no código:** são bloqueantes reais pelos critérios 2 e 3? Algum item de
   isolamento, permissão ou segurança das fatias (`docs/revisoes/SAN3/inventario/`) ficou fora do gate sem a
   condição medida que o §2 exige?
2. **Fronteiras na cadeia papel → permissão → provisionamento → menu → rota → backend** dos blocos `B-SAN3-04`,
   `B-SAN3-18`, `B-SAN3-06a`, `B-SAN3-06b`, `B-O6R-07c`, `B-SAN3-13` e `B-SAN3-05`: cada uma alcança o código do item
   que diz fechar?
3. **Os itens provados por composição de leitura** (13 `P-Ω4-FINANCE-READ-ORFA`, 14 `P-033`, 16
   `P-WEB-GATE-MODULO-INCOMPLETO`, 18 `P-MOBILE-LGPD-GPS-SEM-PORTA`): o tratamento do plano é fail-closed? O teste do
   bloco tem vermelho-controle possível, e o item só deixa o gate por ata?

**C3 `validador-mestre`.**
1. **Diff × regras.** Nada em `src/ tests/ prisma/ frontend/ mobile/ .github/ scripts/`. Backfill §C3.5 do #385 por
   EXECUÇÃO (`tests/kpi-achados-paridade.test.ts`, `tests/kpi-dashboard-charts.test.ts`,
   `tests/kpi-dashboard-contraste.test.ts`, `node scripts/kpi-freeze.mjs --check`, `node --check Kpis/app.js`) e a
   pré-condição `git diff --numstat e26eb9e5 ca5fd19a -- src tests prisma frontend mobile .github scripts` = 0.
   Obituário (§1.5) e aposentadoria por identificador de bloco; `node scripts/sync-agent-agents.mjs --check`. As
   mudanças do painel (roadmap e "Últimas demandas") coerentes com os achados e com os merges.
2. **Registro.** Amostra reconferida por presença na ref: **N ≥ 10** das linhas que viraram FECHADA, **N ≥ 3** das
   que viraram `ABERTA (PARCIAL — …)` e **N ≥ 5** das 49 ausentes. Valor antigo preservado em cada linha reescrita;
   nada apagado além das linhas de status (`git diff --numstat`); índice commitado byte-idêntico à saída do gerador
   rodado em cópia; `REGISTRO-SAN3-CONFLITOS` presente e fiel às duas decisões que cita.
3. **Coerência de números** entre o plano (§0, §1, §4, §9), `agent-orchestration/docs/status-geral.md`,
   `agent-orchestration/codex/log-execucao.md` e `Kpis/kpis-latest.json` (notas dos `mvp_*`, `limitations`,
   `recent`).

## 3. Afirmações que chegam "a re-verificar" (não são fato herdado)

- O gerador lê só a 1ª linha de status, e "RESOLVIDO PARCIAL" sai FECHADA (bancada do agente de registro).
- As reclassificações `✓` do §4.1 e os critérios corrigidos (§8.7), inclusive o critério 13 ("polido e testado").
- Os itens conferidos pelo orquestrador no código (coluna "prova" do §4.1).
- Os três resíduos do `P-Ω3F6` fora do gate "com condição medida" (§4.3).
- O melhor caso ≈ 85–95 h e o realista 12–14 dias (§9).
- `mvp_vendavel`/`mvp_demo` intocados com nota (§C3.4 × critério 8).

## 4. Insumos (presentes na ref)

- Pareceres do `critico-adversarial`: `votos/SAN3-plano/00-critico-adversarial-r1.md` (sobre `31e04f6c`: NÃO, 17
  achados, 6 `bloqueia`) e `00-critico-adversarial-r2.md` (sobre `544ab67f`: NÃO, 12 achados, 2 `bloqueia`). A resposta
  do plano a cada achado está nos §12 e §13 do `docs/revisoes/SAN3/PLANO_SAN3.md`. O que a v4 (`a143d2c3`) não tiver
  resolvido é matéria desta junta — a rodada 2 foi a última do crítico.
- `REGISTRO-SAN3-CONFLITOS` e `D-TRACCAR-HTTP-PRIVADO-AWS` em `agent-orchestration/controle/decisoes.md`.
- `PD-O6R-B07B-CLAMD-INSTREAM` (`docs/omega-pd.md`) — insumo do `B-AV-REAL`, não matéria desta junta.
- Inventário: `docs/revisoes/SAN3/inventario/` (8 fatias).
- Parecer do porteiro do #385 (as 3 ressalvas que o PR paga): registrado no `status-geral.md` e no `log-execucao.md`.

## 5. Plano de perda de jurado

Cadeira que cair sem votar é substituída pelo suplente nomeado na tabela do §1, que **re-executa o mandato
inteiro** — nada que o titular começou conta. Voto perdido nunca vale como aprovação; a junta não fecha com menos de
3 votos de mérito. Queda por limite de modelo vira nota no voto (qual papel, qual modelo, por quê).
