# 04 — Análise: o último upgrade da orquestração ajudou os erros a aparecerem?

Autor: `aud-sintese`, identidade nova, auditoria do topo. Modelo declarado: **Claude Fable 5.1**. Não escrevi os relatórios 01, 02 e 03; reexecutei os comandos que decidem a conclusão (evidência em `04-analise-evidencia.md`, itens E1–E14). Só leitura: nada foi alterado no repositório, nos planos, nos prompts nem nas ferramentas. Medido em 31/10/2026, 22:45–23:30 SP, em `origin/main` = `0fda595a`. **FATO** tem comando; **HIPÓTESE** vem marcada; o que não medi está escrito como "não medido".

## 1. Resumo e veredito

**Veredito: NÃO COMPROVADO.** O último upgrade é o PR #475 (`264c3760`, merge 30/10 09:27 SP): 20 linhas acrescentadas ao contrato, o item 10 "fluxo rápido", mais a regra "Codex primeiro". O bloco com "altos erros" é o B-AV-REAL (#477, antivírus): 27 achados num voto só, 3 bloqueantes distintos, 3 cadeiras reprovando.
- **"O upgrade fez os erros nascerem": NÃO COMPROVADO, e a evidência aponta o contrário.** Os 3 bloqueantes, o job de CI verde com teste vermelho e o clamd que morre nasceram no plano (2 + job + D1) e no dev (1). O plano foi lançado às 09:09, 18 min **antes** do merge do #475; as linhas do overlay vêm da v1, de 29/10. As etapas onde nasceram (plano, crítica, dev, CI) não mudaram de texto no #475. 0 de 25 defeitos tem como primeira etapa capaz uma etapa que o item 10 alterou.
- **"O upgrade deixou erros passarem por mais etapas": NÃO COMPROVADO.** A única etapa que o item 10 acrescentou antes do voto, a pré-revisão, segurou 5 defeitos. Quem deixou passar 24 de 25 foram crítica sem execução, dev lendo a cor do CI e fila que não para, nenhuma delas escrita no item 10. A etapa de risco que o item 10 criou (1 verificador no lugar da junta inteira) **ainda não rodou**: N = 0.
- **"O upgrade só os tornou visíveis": PARCIALMENTE COMPROVADO.** "Lista completa" e as 3 cadeiras votando sempre concentram num voto o que antes se espalhava em ciclos: 3 dos 4 blocos antigos amostrados votaram com painel incompleto no ciclo 1. Mas os defeitos são reais: 2 de produto, reproduzidos pelo topo; 3 bloqueantes distintos = mediana dos 13 blocos anteriores. Reprovar no 1º voto era a regra antes: 11 de 13.

## 2. Refresco de memória: como fazíamos e como fazemos

| Etapa | Antes (contrato até 30/10 09:26; vigorou de 20/10 a 30/10) | Depois (item 10 por cima) | Mudou de fato no #477? |
|---|---|---|---|
| Nível de revisão | Junta completa só em dinheiro, segurança, permissão, perda de dado; o resto 1 revisor + CI | 3 níveis + trava automática pelos arquivos do PR (`trava-risco.sh`) | Sim: a trava existe desde 30/10 09:21 |
| Plano | Fable | Igual; "planos no Claude" | v1 Astra (29/10), v2 Fable |
| Crítica do plano | `critico-adversarial`, nível menor, até 2 rodadas | **O item 10 não fala dela** | Sim: só Sol, 2 e 3 minutos, sem Docker; antes havia ao menos 1 rodada em Opus |
| Dev | Nível menor declarado; externas primeiro (17/10) | "Codex primeiro" | Sim: Sol em todas as fatias; antes o Sol caía e o Opus terminava |
| Pré-revisão | Não existia (avulsa em 4 de 14 blocos) | Passo 1 do fluxo | Sim: Sol, 25 min, prompt do orquestrador |
| Mandatos da junta | Forma A com pré-voo, redator (item 8(3)) | **Não mudou no texto** | Sim: arquivo único de 44 linhas, 0 pré-voo, 1 caminho inexistente |
| Votação | 1 por ciclo; vermelho reprova | 1 vez só, lista completa | 3 Opus em sequência, 1h42 com inspetor |
| Depois do vermelho | Topo audita toda reprovação e replaneja; junta inteira revota (só a cadeira vermelha se refaz, item 9) | Triagem (sem dono escrito) → 1 conserto → 1 verificador; topo só em grave ou desenho | Triagem pelo orquestrador; emenda Fable + revisão Opus (achou 7 defeitos, 1 novo); conserto Argon em curso; verificador ainda não |
| Fila, código do orquestrador | Lançamento à mão, 1 linha por agente em `agentes-vivos.tsv` | **Fora do contrato:** `fila-lib.sh` (30/10 09:06) avança sozinha; orquestrador commitou 4 vezes no objeto | Sim |

## 3. Evidências a favor e contra

**Contra a culpa do upgrade (FATO):**
- Cronologia: plano v2 lançado 09:09, gravado 09:39; merge do #475 09:27 (`agentes-vivos.tsv` l.243; `ls planos/`; `gh pr view 475`). As linhas 139 e 141 do plano (overlay `internal: true` × freshclam 12×/dia) não têm marca `[v2]`: vêm da v1 de 29/10.
- Primeira etapa capaz de pegar, N = 25: crítica 9, dev 13, prompt 1, conserto 1, anterior 1 (03 §4). Nenhuma dessas etapas mudou de texto no #475 (`git diff 264c3760^ 264c3760 -- CLAUDE.md`: 20 linhas, só o item 10).
- Reprovar no ciclo 1 era a regra: 11 de 13 blocos com junta desde 10/10 (`git log --diff-filter=A -- omega/reprovacoes/R-*.md`: 10 com sufixo de 1º ciclo + o #389). 3×0 já ocorreu em #400 e #405, 3 semanas antes (02 §7.6).
- Bloqueantes distintos: 3 = mediana dos 13 anteriores (02 §6). Em números absolutos o bloco não é fora da curva.
- A pré-revisão (etapa nova do item 10) segurou 5 defeitos antes do voto; a revisão da emenda achou o único defeito que escapou da junta (D1).
- Mesmo contrato, mesma semana: críticas Opus que executaram sondas acharam 7+13, 10+15 e 17+17 em 3 planos; a crítica Sol do antivírus, sem Docker, achou 0 graves em 2 min 38 (`agentes-vivos.tsv` l.256-258; `codex-crit-avreal-1.status`).

**A favor de alguma culpa (FATO no número, HIPÓTESE na causa):**
- Achados por voto: 27 crus, o maior da janela (antes, máximo 22). Achados por cadeira 9,0 contra mediana 4,0. Parte é construção: 3 cadeiras sempre votam e listam tudo; antes 3 de 4 blocos amostrados tiveram painel incompleto no ciclo 1 (B-SAN3-13 só C2; B-SAN3-02 sem C3; B-SAN3-12a só C2 e C4).
- "Codex primeiro" entrou no **mesmo PR**: os 2 blocos com dev só em Codex são os 2 mais densos (B/mil 4,18 e 2,50; N = 2, 02 §7.4). Executor e fluxo mudaram juntos e, com N = 1, não se separam.
- A pressa do fluxo rápido coincide com as filas (nascidas 21 min antes do merge) e com o orquestrador consertando em 22 min. Datas batem; causa não isolável.

**Limites:** DEPOIS tem N = 1 junta, aberta; nenhuma conferência de verificador aconteceu; tokens Claude não existem registrados; dedupe de achados só existe no B-AV-REAL; viés de seleção desde 04/10 (só bloco de risco tem junta).

## 4. Causas reais, em ordem de peso

| # | Causa | Evidência (comando → saída) | Ligada ao #475? |
|---|---|---|---|
| **C1** | **Provar a porta ao lado e declarar a propriedade.** Aceite "só `docker compose config`" para um compose que precisava subir; `console.warn` em vez do `pino`; cor do job em vez do TAP; `ec=0` em vez do diário. 3 de 3 bloqueantes + job + D1 | Plano l.205 `não (só o CLI docker compose config)`; `gh run view 41207885759 --job 124556664769 --log` → `not ok 8 · # pass 7 · # fail 1` com job `success`; dev l.217 "8/8 sem pulo"; pré-revisão l.100 "guard efetivo", l.166 "permanece verde". N = 7 casos (03 §5). Família anterior: `auditoria-juntas-2026-08-28.md` l.57 "Onze falsos-verdes" | Não. Anterior a 28/08 |
| **C2** | **Plano com contradição escrita + crítica que não executa, em 2-3 min, no modelo que não achou nada.** 9 de 25 defeitos tinham a crítica como primeira etapa capaz; a crítica aprovou | `grep -c -iE 'overlay\|freshclam\|internal'` nos 2 pareceres → 0 e 0; `grep -c 'tee\|pipefail\|db:generate'` → 0; prompt v2 l.12 "Sem Docker"; status: 2 min 21 e 2 min 38. Contraste Opus: 7/10/17 graves (E9) | Não no texto. Sim na prática: a fila escolheu Sol (`fila-av.sh` l.5) |
| **C3** | **Dev declara feito o que não está feito; pré-revisor no mesmo modelo repete a mesma troca.** 9 de 23 achados desmentem o dev; 24 de 25 passaram pela pré-revisão; em 2 ela afirmou o contrário do real | dev l.217 × TAP real; dev l.148 honesto ("Nenhum container foi iniciado") sem ninguém reagir; `prerev-avreal-parecer.md` l.98-100 (`console.warn`); ambos `gpt-5.6-sol medium` (`.status`) | Pré-revisão é do item 10, e segurou 5. O modelo igual ao do dev é escolha da sessão |
| **C4** | **Fila que avança com ajuste pendente e chama `ec=0` de entrega.** F11 órfã (C3-A8), timeout sem dono (C2-A6), "dev entregue" com o dev parado na F1 | `filas.log` l.23-25: crítica 09:44 → dev 09:44; `fila-av.sh` l.8 aceita `APROVADO COM AJUSTES` e segue; `fila-lib.sh` l.38 `ec=0` = ok, l.23 `rm -f` do status anterior; l.101-102 "dev entregue" × diário "Feito: F0 e F1" | Não está no contrato. Nasceu 30/10 09:06 |
| **C5** | **Orquestrador escrevendo código, emenda e mandato sem revisão.** 4 commits no objeto julgado; 1 com 2 defeitos (regex quebrada, `db:generate` sem URL); emenda 3 do B-O6R-11 lançada após 2 `VOLTA`; mandato sem pré-voo com caminho inexistente | `git log f1d3463d..2746eb60` → bf24bb2b, b407692a, 9bad1f7e, 2746eb60 (17:49-18:10); `gh run view 41240903375 … --log-failed` → `PrismaConfigEnvError`; `fila-o6r11.sh` l.2 "Sem terceira rodada"; `mandatos.md` 0 pré-voo; inspetor l.93 | Não. O item 8(3), ainda escrito, exige pré-voo |
| **C6** | **Troca de executor por limite.** Sol caiu 2× no dev; Opus cobriu o conserto; Argon faz o conserto final: 3 executores no mesmo objeto | `.status` `ec=1` 10:06 e 11:08; `grep -c LIMITE filas.log` → 6 em 31/10; `agentes-vivos.tsv` l.270 Argon | Não. `D-CLAUDE-COBRE-ATE-0411` e limites. **Efeito em defeitos: não medido** (só C1-A12 nasceu no conserto) |

**O que não é causa, medido:** o texto do item 10 (0 de 25 defeitos em etapa que ele alterou). **Risco do item 10 ainda sem medida:** 1 verificador no lugar da re-junta.

## 5. Plano, condicionado às causas comprovadas

Nada aqui é aplicado. Cada medida nasce de uma causa da tabela; causa não comprovada ganha medição, não medida. Nenhuma medida acrescenta ciclo de junta.

| # | Causa | O que muda | Quem faz | Custo por bloco | Como medir se funcionou | Critério para desfazer |
|---|---|---|---|---|---|---|
| **M1** | C1 | **Aceite na forma real.** Fatia que entrega compose, script ou job de CI tem como aceite subir e ler a saída (`up --wait` + TAP/log), nunca `config` nem a cor do job. Todo passo de CI com pipe leva `set -o pipefail`. Mutação do plano é literal: trocar exige emenda | Planejador (molde do plano) e crítico (pergunta fixa: "o entregável sobe e funciona como será usado?") | +15 a 30 min em bloco de infra; 0 nos outros | Bloqueantes de junta cuja etapa capaz foi "aceite por leitura": era 3 de 3; meta 0 em 3 blocos | 3 blocos seguidos com 0 e custo medido > 1 h: reduz a 1 subida por bloco |
| **M2** | C2 | **Crítica executa, no nível que executa.** Em bloco de junta completa, a crítica roda com Docker e sondas e não recebe lista de classes que restringem `VOLTA`; segue no teto de 2 rodadas | Orquestrador (prompt); crítico em Claude Opus para junta completa; Sol pode fazer a de revisão simples | 3 min → 20 a 40 min; tokens Claude não medidos | Razão "graves na crítica / bloqueantes de plano na junta": era 0/2; meta ≥ 1 e junta com ≤ 1 bloqueante de plano em 3 blocos | Se 3 críticas Sol seguidas acharem o mesmo que o baseline Opus, volta "Codex primeiro" na crítica |
| **M3** | C3 | **Pré-revisor em modelo diferente do dev**, com mandato fixo: ler o resumo TAP de todo job citado, executar as mutações do plano como escritas (não "à escolha"), subir o entregável. Dev com CI vermelho não escreve `PRONTO PARA JUNTA` | Orquestrador (prompt) e dev (regra de 1 linha no diário) | 25 → ~40 min | Bloqueantes que a pré-revisão tinha dado como OK: era 2 + job; meta 0. Achados da pré-revisão antes do voto: manter ≥ 5 | Se em 3 blocos a pré-revisão achar 0 e a junta também, encurta para 2 itens |
| **M4** | C4 | **Fila para em `APROVADO COM AJUSTES`** até os ajustes virarem linha do prompt do dev ou emenda; entrega decidida pelo marcador do diário (`PRONTO PARA JUNTA`, `retida`), nunca `ec=0`; log com data; status anterior rotacionado, não apagado | Orquestrador (ferramenta fora do repo) | 5 a 10 min por transição | Fatias órfãs e "entregue" falso: eram 3; meta 0. Logs perdidos por etiqueta: era 1; meta 0 | Não se desfaz: é correção de erro, não regra |
| **M5** | C5 | **Orquestrador não commita no objeto julgado.** Se o Claude cobre o dev, é uma identidade de dev declarada, com `npm run check` + teste tocado antes do push e revisão antes do voto. `VOLTA` só se encerra por `PASSA` de revisor, nunca por comentário de script. Mandato de junta passa por pré-voo mecânico (`git cat-file -e` em cada caminho), que já é regra | Orquestrador | 10 a 20 min | Commits do orquestrador no objeto: eram 4; meta 0. Mandato com caminho inexistente: era 1; meta 0 | Não se desfaz |
| **M6** | C6 | **Medição, não medida.** O diário registra o executor por fatia; em 5 blocos, contar defeitos por executor (o sinal do 02 §7.4 tem N = 2) | Dev (1 linha) e próximo auditor | 0 | Tabela defeitos × executor com N ≥ 5 | — |
| **M7** | Risco do item 10 | **Medição única do verificador.** No #477, depois da conferência, uma identidade re-executa só os comandos registrados de C2 e C3 (roteiro P3) e compara. É controle, uma vez, não ciclo | Orquestrador lança; identidade nova | ~40 min, uma vez | Se a re-execução achar grave que o verificador não viu, o item 10(4) ganha regra; se não, fica como está | Depois de 1 medição |

**Decisões do dono (com recomendação):**
- **D-a.** M2 contraria "Codex primeiro" na crítica de blocos de junta completa. Recomendo aprovar: o dono já disse que não confia no Codex para plano (`D-CODEX-PRIMEIRO…`, l.4100), e a crítica é a revisão do plano. Codex segue em dev, pré-revisão simples e registro.
- **D-b.** M5: o Claude pode seguir cobrindo o dev (`D-CLAUDE-COBRE-ATE-0411`), mas como dev declarado e revisado, não como orquestrador commitando. Recomendo aprovar.
- **D-c.** M7 custa 40 min uma vez. Recomendo aprovar: é o único jeito de medir o risco que o próprio item 10 declara.
- **Fica como está:** item 10 inteiro (3 níveis, 1 votação, lista completa, 1 conserto, verificador), trava, triagem. Nenhum número justifica voltar a mais ciclos: 1,45 reprovações por objeto na janela, igual ao 1,47 de 28/08.

## 6. O que NÃO fazer

- **Não voltar a re-junta por ciclo nem a auditoria do topo em toda reprovação.** Os 3 bloqueantes nasceram antes da junta; mais junta não os evitaria.
- **Não desfazer "lista completa" nem "3 cadeiras sempre".** O número alto é, em parte, a junta vendo tudo de uma vez: é o que o dono pediu.
- **Não culpar o Codex no atacado.** N = 2 blocos com dev só em Codex; o dado é sinal (M6), não veredito. O que está medido é a crítica Sol sem Docker em 3 minutos, não o dev.
- **Não restringir `VOLTA` por classe no prompt da crítica.** O prompt v2 fez isso; 0 menções ao overlay.
- **Não acrescentar regra de processo que vire bloqueante de junta.** Antes do upgrade, 53% dos bloqueantes eram de processo (02 §8); o dono pediu produto, não registro.
- **Não reusar etiqueta de fila, nem deixar o orquestrador "consertar rápido" no objeto.** 22 min e 3 heads vermelhos no #477.
- **Não concluir nada sobre o verificador antes de M7.** N = 0.
