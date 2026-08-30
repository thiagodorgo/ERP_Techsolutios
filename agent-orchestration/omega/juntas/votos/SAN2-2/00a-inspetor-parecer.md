# PARECER DE TERRENO — junta do SAN2-2 (PR #363) · inspetor-de-terreno-da-junta, instância NOVA

> Data: 2026-08-30 · Worktree: `.claude/worktrees/san2-r` · Branch `fix/san2-2-guard-espelho-ci`
> Head julgado: **`c8dc716e9b4ffa014783289fdab484da07858d67`** (== head do PR #363 no GitHub)
> Evidência item a item, com comando e saída: `votos/SAN2-2/00a-inspetor-evidencia.md` (P1 cumprido).

## Sumário executado (comando → resultado)

| # | Item (§C7.1-bis / §8.4) | Prova executada | Resultado |
|---|---|---|---|
| 1 | Head correto, árvore sem mutação viva | `rev-parse`=c8dc716 · `status --porcelain` vazio · `git diff` da árvore principal VAZIO (os 3 "M" são artefato eol §6.3, `i/lf w/crlf`) | VERDE |
| 2 | §8.4.1 validade do instrumento | blob do inspetor no head == blob da demo: **`8262abfb5ae85049033d5824ce191432f36d8b55`** (mesmo hash, diff=0, 115×115 linhas); inexistente na `origin/main` | VERDE |
| 3 | §8.4.2 fatia S0, script do head, checkout fresco `autocrlf=true` (`w/crlf` comprovado) | `node scripts/sync-agent-agents.mjs --check` → **exit 0**, "OK — 23 agentes, espelho consistente"; contraprova recursiva independente: 23 pares fonte×espelho divergem SÓ pelo transform declarado (`tools:` fora, preâmbulo Codex, `model:` preservado); sem `especialistas/` neste head | VERDE |
| 4 | §8.3 inelegibilidade por nome | 4 nomes de cadeira existem SÓ no plano/briefing deste bloco; zero colisão com pool queimado (B-O6R-02/REG/ARNES/SAN2-R/SAN2-1R); nenhum agente novo em `.claude/agents/` além do inspetor | VERDE |
| 5 | Containers e resíduos | `docker ps -a` → exatamente 4: par descartável `san2-2-*` (56432/56379, declarado) + base viva `erp-*` healthy e intocada; sem órfãos `jur-*`/`crit-*` | VERDE |
| 6 | Baseline honesto | 3 TAPs em disco (dev/verificador/adversarial), env dentro do arquivo, **2607/2609 · fail 0 · skipped 2 · EXIT=0** nos três; pulos conferidos PELO NOME (ok 1646/1647); KPI publica 2607/2609 com N=3 e forma; `npm run check` no head → **exit 0** | VERDE |
| 7 | Isolamento + perda de jurado declarados | Briefing l.298–301 (worktree próprio p/ C1, junction PROIBIDA, banco descartável p/ C2, base viva intocável) · l.255–258 (substituto novo herda roteiro, nunca voto) · P1–P6 verbatim | VERDE |
| 8 | CI do PR #363 | `gh pr checks 363` → **7/7 pass**; headRefOid do PR == c8dc716 local | VERDE |

## Anti-circularidade — por escrito, como o §8.4.3 exige

**Instrumento e fatia S0 nascem neste bloco.** Este parecer foi emitido por uma instância instanciada
do arquivo do próprio head sob julgamento, e a S0 verde do item 3 foi medida COM o script que este PR
corrige. Portanto: **o meu `LIBERADO` NÃO é prova de mérito do item 1.** Um guard cego passa na S0
exatamente como um guard bom — o verde de terreno e o verde-cego são indistinguíveis daqui. **A prova
de mérito é da cadeira C1**, que reexecuta os Drills A e B por conta própria, sem herdar nem o
resultado do dev nem o desta inspeção; se o conserto trocou falso-vermelho por verde-cego, quem pega é
o Drill B dela. Eu julguei o tabuleiro; o mérito é da junta.

## Ressalvas nomeadas (para o orquestrador destacar no briefing das cadeiras)

R1. **MAX_PATH morde worktree fresco em caminho longo.** Dois arquivos rastreados de
    `votos/B-O6R-02-ciclo4/` estouram o limite: meu primeiro `git worktree add` no scratchpad falhou
    com "Filename too long" e deixou registro meio-criado (limpo por `prune`). A **C1**, que criará
    worktree fresco para os Drills, deve usar caminho curto **ou** `git -c core.longpaths=true
    worktree add`, e remover por `git worktree remove --force` (que também pode exigir `rm -rf` do
    resto, como aqui). Pré-existente (arquivos são do ciclo 4 do B-O6R-02), fora do diff.
R2. **O par descartável do dev (`san2-2-pg`/`san2-2-redis`) segue de pé.** É infra declarada do
    bloco, não resíduo de jurado — mas nenhuma cadeira pode reusá-lo (briefing §3-C2: "descartáveis
    próprios, não os do dev"). C2 escolhe porta fora da faixa reservada 55353–55452 (pendência §7.3).
R3. **Os TAPs do baseline vivem no scratchpad da sessão (efêmero).** Sumários e cabeçalhos estão
    transcritos no diário da Fase 5 e na minha evidência; a C4 de todo modo NÃO aceita número copiado
    e reconta do TAP dela.

Nenhuma ressalva é sujeira de tabuleiro; as três são avisos operacionais que evitam achado falso ou
queda de cadeira.

## Veredito

**LIBERADO COM RESSALVA** (R1–R3 acima, nenhuma bloqueante). A junta de 4 cadeiras pode começar sobre
o head `c8dc716`, com o mandato P1–P6 colado em cada cadeira e as 3 ressalvas em destaque no briefing.

## Linha de limpeza

Criei para medir e derrubei: worktree efêmero `s0-fresh` (criado 2×, removido — `git worktree list`
voltou às 5 árvores legítimas, diretório apagado); arquivos inertes no scratchpad da sessão
(`insp-head/demo.md`, `p1/p2.md`, `s0-check.log`, `wt-add*.log`, `insp-npm-check.log`). Nenhum
container criado, nenhum banco tocado (nem leitura na base viva), nada alterado na árvore além dos
meus dois arquivos em `votos/SAN2-2/`. Não sou a fonte da próxima contaminação.
