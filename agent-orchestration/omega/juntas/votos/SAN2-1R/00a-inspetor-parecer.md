# SAN2-1R — Parecer do inspetor de terreno (00a)

**Papel:** `inspetor-de-terreno-da-junta` · 4ª tentativa · **identidade nova** (nada dos 3
caídos é insumo; nenhum escreveu nada). **Modelo:** `general-purpose` pela exceção contratual
de indisponibilidade (§C7.6 por analogia — o pin `fable` caiu 3× consecutivas neste gate;
registro em `votos/SAN2-1R/00-quedas.md`).
**Data:** 2026-08-29 · worktree `.claude/worktrees/san2-1` · branch `chore/san2-1-resgate`.
**Evidência item a item (P1):** `votos/SAN2-1R/00a-inspetor-evidencia.md` — escrita ANTES de
cada item seguinte, conforme o mandato.

Eu **não julgo o mérito** da entrega. Julgo se o tabuleiro está limpo e justo para o voto.

## Tabela do executado

| # | Item do mandato | Medição | Resultado |
|---|---|---|---|
| 1 | Head = `31cd9ad` | `git rev-parse HEAD` → `31cd9adc0a05…` · branch `chore/san2-1-resgate` | ✔ LIMPO |
| 1 | Árvore sem mutação viva | `git status --porcelain -uall` → só `?? votos/SAN2-1R/00-quedas.md` (esperado) | ✔ LIMPO |
| 1 | `node_modules` sem junction | `fsutil reparsepoint query` → "não é um ponto de nova análise" (diretório real) | ✔ LIMPO |
| 2 | Diff de código VAZIO (sustenta maioria-de-3) | `git diff a0a1075..31cd9ad --stat -- src prisma tests scripts frontend mobile .github package-lock.json` → **vazio** | ✔ LIMPO |
| 2 | Todos os caminhos na lista permitida | `--name-status` → 21 caminhos; grep inverso por fora-da-lista → **zero** (`agent-orchestration/**`, `docs/**`, `Kpis/*`, `CLAUDE.md`, `AGENTS.md`) | ✔ LIMPO |
| 2 | Composição dos commits | `a0a1075` = `origin/main` = merge-base (linear); `8860fc3` conteúdo + `31cd9ad` só o briefing (`diff 8860fc3..31cd9ad` = 1 arquivo) | ✔ LIMPO |
| 3 | Cadeiras cobrem a competência | Mapeamento 7 itens do briefing × 3 cadeiras — nenhum item órfão; diff documental não exige cadeira de banco/código | ✔ LIMPO |
| 3 | Orquestrador inelegível | Declarado no briefing por papel e motivo ("autor do diff e do resgate") | ✔ LIMPO |
| 3 | Enquadramento × `D-TETO-DOIS-CICLOS` | Ciclos 1 e 2 + parada + dossiê ao dono medidos no repo; SAN2-1R = execução da intervenção humana que o teto exige, não ciclo 3; briefing se autolimita a "Ciclo 1 de 2" | ✔ CORRETO (ressalva R2) |
| 3 | Nenhum jurado precisa de banco | Bateria do briefing roda com node/python sobre arquivos; `erp-postgres`/`erp-redis` não são alvo; sem cluster por jurado | ✔ LIMPO |
| — | Plano de perda de jurado | Briefing invoca `PROTOCOLO-JUNTA-RESILIENTE` P1/P2/P4/P5; P6 já em uso (`00-quedas.md`) | ✔ DECLARADO |

## Ressalvas numeradas

- **R1 (registro — exceção de modelo).** Este inspetor rodou em `general-purpose`, não no
  `fable` do contrato: o pin caiu 3× consecutivas neste gate (`00-quedas.md`). Nota de
  indisponibilidade conforme a exceção prevista no contrato (§C7.6, por analogia); a ata da
  junta deve carregá-la.
- **R2 (registro — escolha do dono sem entrada própria).** A escolha da **opção C** pelo dono
  vive no briefing e nas etiquetas de `pendencias.md`, mas **não tem entrada em `decisoes.md`**.
  A lição da `D-GOLIVE-MAPS-ROTACAO-DISPENSADA` (decisão do dono vive no repositório) se aplica.
  Cadeira 1/3: conferir e, se confirmada a lacuna, exigir o registro como condição do verde —
  não bloqueia o START da junta.
- **R3 (operacional — idempotência do índice).** A checagem "índice idempotente" (item 7 do
  briefing) roda `gerar-indice-pendencias.py`, que REESCREVE `pendencias-indice.md` (rastreado).
  Quem medir: rodar e conferir `git diff --exit-code -- agent-orchestration/controle/`; se o
  gerador sujar a árvore (não idempotente), **restaurar com `git checkout -- <arquivo>` e
  registrar o achado** — a árvore devolvida ao próximo jurado tem de ficar como a recebeu.
- **R4 (registro — S0 não medida pelo guard).** Por instrução expressa do mandato, o
  `sync-agent-agents.mjs --check` NÃO foi executado (falso-vermelho conhecido,
  `P-REG-S0-GUARD-FALSO-VERMELHO`). O risco substantivo (paridade dos dois contratos) está
  coberto pelo item 5 do briefing — cadeira 2/3 confere o §C7 renumerado **por diff textual
  direto** dos dois arquivos, não pelo guard.
- **R5 (observação — executável em caminho documental).** `agent-orchestration/controle/
  gerar-indice-pendencias.py` é o único arquivo executável do diff; está dentro do caminho
  permitido e fora de `scripts/`/CI. Cadeira 2: ler o conteúdo (é gerador de índice, não deve
  tocar nada além de `pendencias-indice.md`).

## Veredito

**LIBERADO COM RESSALVA** (R1–R5 acima; nenhuma bloqueia o start). O tabuleiro está limpo:
head e árvore conferem, diff de código vazio sustenta a maioria-de-3, os caminhos cabem na
lista permitida, as 3 cadeiras cobrem os 7 itens do briefing, o autor do diff está inelegível,
o enquadramento "bloco novo executando decisão do dono" é fiel à `D-TETO-DOIS-CICLOS`, e
nenhum jurado precisa de banco ou de worktree próprio. **A junta do SAN2-1R pode começar.**

O inspetor dorme agora.
