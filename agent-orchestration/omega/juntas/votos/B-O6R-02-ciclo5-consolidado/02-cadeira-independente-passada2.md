# Passada 2 — cadeira independente sobre o delta `4db8b64 → e3dd810` (PR #378, pré-merge)

> Texto devolvido pelo agente, persistido pelo orquestrador. Ver `00-nota-de-proveniencia.md`.

Delta = 1 commit, 3 arquivos (`README.md` +38/−10, `pendencias.md` +76, `pendencias-indice.md`
regenerado). `src`/`tests`/`prisma` idênticos à `origin/main` por hash de árvore; `git diff --check`
limpo; worktree do PR limpo em `e3dd810`.

## Bateria reexecutada em `e3dd810`

| item | medido |
|---|---|
| gerador ×3 | blob `c73a921` nas 3 = commitado; `264 / 253 · ABERTA 200 · FECHADA 64 · A 37 / B 87 / C 76` |
| `kpi-achados-paridade` / `kpi-dashboard-charts` | 6/6 ec=0 · 16/16 ec=0 |
| `sync-agent-agents.mjs --check` (sem pipe) | `OK — 34 agentes`, **ec=0** |
| **drill de mutação** (cópia fiel de `scripts/` + `.claude/agents/` + `.agents/agents/` no scratchpad; ec capturado direto) | baseline **ec=0** → append no corpo de `jurado-c5-banco-fk-triggers.md` → **ec=1** + `DIVERGE: .agents/agents/especialistas/jurado-c5-banco-fk-triggers.md` → restaurado → **ec=0** |
| árvore restaurada | `git status --porcelain` vazio; `hash-object` do arquivo = `e3dd810:` blob `ab726a8` |

## Item a item

**(1) README L17-20 — CONFERE, com um erro novo de datação.** Substituído por texto que afirma o que mede
(11/11, ec=0, drill); original preservado riscado em L26-28. **Mas** L25 diz "falso desde `1aeb6e9`
(2026-08-25)" e L28 diz "era verdade quando escrito (`f895dd2`, #368, 2026-09-02)" — as duas frases se
contradizem no mesmo parágrafo. Medido: `1aeb6e9` **não** é ancestral de `f895dd2`; o script em `f895dd2`
é raso (`withFileTypes` = 0); só `99f1840` (09-04) o torna recursivo na `main`. A nota do topo viveu na
`main` e foi **verdadeira de 09-02 a 09-04** — "falso desde 08-25" data pela linha da branch do #371, que
não é a linha onde a nota existiu. Também "herdando a premissa de `8145415`" não tem sustentação:
`8145415` não é ancestral de `f895dd2` nem da `origin/main`; a premissa do autor do #368 veio do script
raso da `main`, que era fato.

**(2) Over-claim anterior — CORRIGIDO e nomeia o mecanismo certo.** L143-152: `8145415` (08-23) ancestral
de `1aeb6e9` (08-25) — confirmado; "conserto que não atualizou a documentação" é o mecanismo real; a
"regra que fica" (`git log -S` na `main` não data o que aconteceu dentro de branch squashada) está certa.
Varredura de resíduo: "já nasceu falsa" só aparece em L143 como citação do erro; "apenas o topo" /
"conferir à mão" só no bloco riscado L157-161. **Mas a regra recém-escrita é violada no mesmo commit** —
ver (3).

**(3) `P-SYNC-AGENTS-NAO-RECURSIVO` FECHADA — conclusão certa, justificativa errada; (d) sustentado por
argumento quando a medição era mais forte.**

- Gerador lê FECHADA (índice L339, seção FECHADAS — 64). Placar: A 37→36 ao fechar, volta a 37 com a
  pendência nova (também MÉDIA → balde A); ABERTA 200→199→200; FECHADA 63→64 — bate.
- **(b) provado** pelo meu drill acima. **(a)** está escrito no README (topo + §especialistas) — aceito.
- **Errado** (`pendencias.md` L5555-5558): "publicado na `main` pelo squash `99f1840` — **cinco dias
  antes** de esta pendência ser aberta. Ela nasceu de leitura de uma versão que a `main` já não tinha."
  Medido: pendência aberta 08-31, entrou na `main` em `e6a6461` (09-01) com script **raso**
  (`withFileTypes` = 0 em `e6a6461`, `f895dd2` e `99f1840^`); `99f1840` é de 09-04, **quatro dias depois**
  da abertura; `1aeb6e9` não é ancestral de `e6a6461`. A pendência nasceu **verdadeira** sobre a `main` e
  ficou sem objeto em 09-04. O texto lhe atribui um erro de leitura que não houve — a mesma classe de
  datação-pela-branch que o README L149-151 acabou de proibir.
- **(d) é escapatória parcial**: "fora da linha da `main`, não governa" é argumento, não medição — e a
  medição derruba a própria premissa da divergência. `demo/investidor` reconstruída por blob
  (`git cat-file`, 82 arquivos, 0 vazios): script **recursivo**, 17/17 especialistas espelhados,
  `--check` → `OK — 40 agentes`, **ec=0**. Não há divergência de convenção entre as duas linhas; (d) está
  satisfeito por um fato que o texto não mediu. Números: `git rev-list --left-right --count
  origin/main...demo/investidor` = **19 / 49**, não "50 / 18".

**(4) `P-GOV-REGISTRO-PURO-QUORUM` — enunciado honesto na tese, consequência SUAVIZADA por omissão.** Diz
"cadeia de 6 PRs" e a tabela tem **5 linhas**; a cadeia tem **7**: faltam **#372** (`cae6086`, julgado por
porteiro independente pré-merge — uma cadeira, sem ata) e **#376** (`3c29189`, só reavaliação de porteiro
pós-merge). Nenhum dos dois tem `J-*.md` nem diretório em `votos/`. Ao pé da letra do §C7.1, os merges
inválidos já consumados seriam **cinco** (#372, #374, #375, #376, #377), não quatro. O critério de
fechamento e o dono estão corretos; escopo `pre-existente` com evidência de data — aceito.

**(5) Branch `chore/o6r-b02-c5-desc` — CONFERE, nada se perdeu.** `git branch --list` só mostra
`consolidado`; `ea76b56` segue objeto `commit`; `rev-list --count 41710b5..ea76b56` = **0**;
`41710b5^{tree}` = `9919f4d^{tree}` = `8c49d5a`.

## Over-claims novos

1. `.agents/agents/README.md` L25 "falso desde `1aeb6e9` (2026-08-25)" — contradiz L28 e a `main`; falso
   desde `99f1840` (09-04).
2. `.agents/agents/README.md` L28-29 "herdando a premissa de `8145415`" — sem sustentação (commit fora da
   linha do #368).
3. `pendencias.md` L5555-5558 "cinco dias antes … versão que a `main` já não tinha" — inverte a
   cronologia; a pendência era verdadeira ao nascer.
4. `pendencias.md` (d) "50 exclusivos / 18 ausentes" — medido **49 / 19**; e a divergência de convenção
   que (d) reconcilia por argumento **não existe** por medição (`demo/investidor` `--check` ec=0,
   recursivo, 17/17).
5. `pendencias.md` tabela de quórum omite #372 e #376; "quatro" merges → **cinco**.

Nenhum deles altera código, guard, placar ou o start do próximo bloco; todos são **registro que um leitor
futuro herdaria como fato** — a classe que este PR existe para corrigir, cometida três vezes no delta que
a corrige.

## Veredito

**LIBERADO COM RESSALVA: merge do #378 e, com ele, start do `B-O6R-07b`** | corrigir no próprio #378 antes
do merge, ou no primeiro PR que tocar registro: (1) README L25/L28-29 — datar a nota do topo pela linha da
`main` (verdadeira 09-02→09-04, falsa desde `99f1840`) e retirar a herança de `8145415` não medida;
(2) `pendencias.md` L5555-5558 — a pendência nasceu verdadeira (script raso em `e6a6461`), ficou sem
objeto em `99f1840`; (3) (d) com a medição real (`demo/investidor` recursiva, 17/17, `--check` ec=0;
49/19) em vez de "não governa"; (4) tabela do quórum com as 7 linhas (#372 e #376 sem ata) e "cinco" no
lugar de "quatro"; (5) pós-merge: apagar remota+local+worktree `chore/o6r-b02-c5-consolidado`.
