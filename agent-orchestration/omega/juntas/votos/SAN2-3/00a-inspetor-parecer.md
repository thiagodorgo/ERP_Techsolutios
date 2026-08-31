# Parecer do inspetor-de-terreno-da-junta — SAN2-3 (PR #364, head 23d9227)

Instância NOVA, Fable por contrato. Evidência item a item, com comando e saída, em
`00a-inspetor-evidencia.md` (mesmo diretório) — este parecer só consolida o que lá foi EXECUTADO.
Inspeção em 2026-08-30, worktree `.claude/worktrees/san2-r`.

## O que foi provado (comando → resultado; detalhe na evidência)

| # | Item | Como medi | Resultado |
|---|---|---|---|
| 1 | Head/árvore/diff | `rev-parse` 23d9227 = mandato · `status --porcelain` vazio · merge-base = d283903 · diff main...HEAD = **11 arquivos**, todos ⊆ §5; caminhos proibidos → vazio | **VERDE** |
| 2 | Resíduos/base viva | `docker ps -a` → SÓ `erp-postgres`/`erp-redis` (Up, healthy, intocados — nem leitura); zero `san2-2-*`/`jur-*`/`crit-*` | **VERDE** |
| 3 | Fatia S0 + edição do meu corpo | `sync-agent-agents.mjs --check` → "OK — 23 agentes", **exit 0** (o guard do #363 funcionou aqui); diff do inspetor = **+4/−0 nas 2 pontas**, linhas inseridas idênticas byte a byte, offset do hunk = preâmbulo Codex | **VERDE** |
| 4 | Insumos | plano (308 l.) · dev-log (219 l.) · obituário (144 l.) · porteiro #363 (LIBERADO COM RESSALVA, l.58) · protocolo P1–P6 — todos em disco. Ciclo 1 → crítico/PD não exigidos (§C7.4). **BRIEFING-SAN2-3.md NÃO existe** | **AMARELO** |
| 5 | Inelegibilidade vs obituário | Placar **15+2 re-executado por mim** (17 nomes demo × tabela 1:1; autores dos 8 votos ARNES/c4 conferidos no campo `jurado`; as 2 RESERVADAS **nunca assinaram voto** — grep em votos/ só acha menção/pareceres). As 2 reservadas marcadas RESERVADA (l.92-93), **não sepultadas** | **VERDE** |
| 6 | Baseline honesto | guards **12/12** e **16/16** (N=2 cada) · `kpi-freeze --check` "em dia" · `node --check app.js` OK · **`npm run check` exit 0 local** · asserções KPI: hist[-2] = (SAN2-2, **363, d283903, c8dc716**, 152) · hist[-1] = (SAN2-3, nulls, **153**) · mvp **99/88 intocados** · carregadas 2607/2609·1126·864 c/ nota §C3.3 | **VERDE** |
| 7 | CI do PR #364 | `gh pr view/checks` → OPEN, MERGEABLE, headRefOid = 23d9227, **7/7 pass** no run 33346995433 | **VERDE** |
| 8 | Perda de jurado | Protocolo P3/P5/P6 no head; plano §8 declara 3 suplentes nomeados ANTES do início | **VERDE** (nomes → ressalva 1) |

## DECLARAÇÃO DE CIRCULARIDADE (obrigatória)

O bloco que inspecionei **alterou o instrumento que eu sou**: as +4 linhas em
`.claude/agents/inspetor-de-terreno-da-junta.md` criam o passo 3.1-bis (obituário como fonte primeira)
que eu mesmo apliquei nesta inspeção — por mandato do orquestrador, pois meu corpo carregado é o da
árvore principal, anterior à edição. Por isso a conferência do Item 5 foi **dobrada**: usei o obituário
em julgamento E re-executei o `grep` independente nas atas/votos. **Este LIBERADO atesta o TERRENO,
não o mérito** do obituário, da conta 15+2 nem da edição do meu corpo — esse mérito é exatamente o que
as cadeiras 1 (registro/atas) e 3 (governança/espelho) existem para julgar, re-medindo do zero.

## Veredito: **LIBERADO COM RESSALVA**

**RESSALVA 1 (forte — condição de voto, não de start).** `BRIEFING-SAN2-3.md` ainda não existe (no
SAN2-2 ele existia antes do voto). Ele deve nascer **antes do primeiro voto**, contendo:
(a) os **nomes** das 3 cadeiras + 3 suplentes, todas identidades novas com **0 colisões** contra a
lista fechada da minha evidência (Item 5): as **15 SEPULTADAS** do obituário · as **2 RESERVADAS**
(`jurado-c5-arnes-catalogo-postgres`, `critico-c5-adversarial` — fora da junta do ciclo 5 comportam-se
como sepultadas) · as 4 votantes do SAN2-2 (`provador-de-mutacao-do-espelho`,
`curador-da-lista-suites-ci`, `zelador-do-contrato-canonico`, `auditor-do-kpi-honesto`) · o
`planejador-mestre` desta mesa e o dev `dev-san2-3` · o `porteiro-pos-merge` do #363 (achador das duas
ressalvas quitadas);
(b) as afirmações da ata J-SAN2-2, do dev-log e do plano marcadas **"A RE-VERIFICAR"** — cada cadeira
re-mede, não herda (em especial: a conta 15+2, o diff-vazio do `pendencias-indice.md` e os números de
KPI);
(c) o plano de perda de jurado apontado (P3/P5/P6 + os 3 suplentes nomeados).
A ata `J-SAN2-3.md` registra a conferência de (a) — ata sem isso = ciclo inválido (§C7.4-bis).

**RESSALVA 2 (nota).** A circularidade acima, para constar no briefing em destaque: o parecer do
inspetor **não é insumo de mérito** sobre o obituário.

**Notas de terreno (não bloqueiam):** worktrees alheios `agent-af6ea607…` (B-O6R-02, insumo do ciclo 5
— não tocar) e `gov-descuido`, ambos com árvore limpa (resíduo inerte); o dev-log fecha dizendo "não
commitado" — o commit único 23d9227 veio depois e contém exatamente os 11 arquivos declarados.

**Linha de limpeza:** criei para medir apenas `insp-npm-check.log` no scratchpad da sessão (inerte,
fora do repo) e os meus dois arquivos em `votos/SAN2-3/` (peças da junta, §5 permite). Nenhum
container, worktree ou banco criado; base viva não consultada. Não sou a fonte da próxima contaminação.
