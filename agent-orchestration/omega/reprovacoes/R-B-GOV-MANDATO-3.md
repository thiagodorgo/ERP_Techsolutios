# R-B-GOV-MANDATO-3 — ciclo 3 reprovado (§C7.4) — e o gatilho da auditoria

- **Entrega:** `B-GOV-MANDATO` (PR #393) — o mandato do orquestrador passa a ser verificável por máquina.
- **Objeto reprovado:** `28b4defdc067387f384e06614e033e0976e9912b`. **Ata:** `J-B-GOV-MANDATO.md`, seção
  "Ciclo 3", **REPROVADO 2 × 1** (C1‴ e C2‴ contra, C3‴ a favor).
- **Ciclo:** 3. **Teto:** não há (`D-SEM-TETO-AUDITORIA-NO-3`). **Gatilho:** reprovação do ciclo 3 com
  `bloqueia` `dentro-do-bloco` → **auditoria da orquestração e da junta antes do ciclo 4** (§C7.4 item 4).
  Parecer esperado em `R-B-GOV-MANDATO-ciclo3-auditoria.md`; sem ele o inspetor não libera o ciclo 4.

## A classe que se repetiu — pela terceira vez, e agora na ferramenta de medição

- **Ciclo 1:** o pré-voo só enxergava `^[-*] ` — *"bullet rejeita, tabela passa"*.
- **Ciclo 2:** a checagem 7 nasceu dependente da forma; o conserto do `approved_head` fabricado não tinha teste.
- **Ciclo 3:** o pré-voo ganhou oráculo único, token reservado e inventário de isenções — e a junta achou
  **quatro** formas novas que ele reconhece em vez de enunciar (a colagem isenta absolve linha injetada; o SHA
  colado a um caminho por `:` sai da checagem; a cerca declarada saída vale como comando; a linha `## …` não
  está no inventário). E a **ferramenta de medição**, que existia para provar cobertura, publicou como
  "coberto" **35 mutantes que não compilam** — mediu se o guard ficou vermelho, não se o mutante era um
  programa. Com mutantes viáveis, 4 pontos publicados como cobertos não são, e um dos 3 "equivalentes" é
  discriminável: o `[M-1]`, publicado 0, é ≥ 5.

**Houve informação nova?** Sim. Tudo o que o ciclo 3 **publicou** se reproduz: a C2‴ obteve o `refs` inteiro
**linha a linha igual** à matriz, a amostra do pré-voo deu 0 divergência, o KPI bate com o CI em 2 execuções,
o `[B8b]` fechou por propriedade, a integração por merge não perdeu nada. **O número era reproduzível e
errado ao mesmo tempo.** A informação nova é essa: reprodução não falsifica medição cuja ferramenta tem o
mesmo defeito do artefato. É o sinal de não-convergência que o §C7.4 manda relatar — e exatamente a pergunta
(a) da auditoria.

## Separação de papéis (§C7.4-bis), respondida por escrito

| papel | quem | restrição |
|---|---|---|
| **quem achou** | C1‴ (`jurado-mandato-c1c-invariancia-de-forma`), C2‴ (`jurado-mandato-c2c-cobertura-por-mutacao`) | não planejam, não consertam |
| **quem planejou** | `planejador-mestre` (Fable 5.1), v3 + §12 + §13 + §14 a §14.20 | não desenvolveu |
| **quem desenvolveu** | Dev-T, Dev-S, Dev-T-3, Dev-S-2, Dev-T-4, Dev-T-5, Dev-T-6 | não julgam a validade do achado |
| **quem audita** | identidade **nova**: não votou (ciclos 1–3), não planejou, não desenvolveu, não é o orquestrador | não conserta |
| **INELEGÍVEIS como jurado do ciclo 4** | as 9 cadeiras dos ciclos 1–3, o inspetor desta junta, os devs e o planejador | votaram, inspecionaram ou escreveram |

- **(a) a composição cobriu a competência do achado?** Sim — e é a prova de que a composição do ciclo 3 era
  a certa: a C2‴ foi criada para cobertura por mutação, e foi ela que falsificou a matriz publicada.
- **(b) quem achou é quem consertou?** Não. Ninguém consertou ainda: o conserto só vem **depois** da
  auditoria, pelo papel que ela não ocupou.
- **(c) o planejador usou dado podre?** **Sim, e este registro o declara**: o §14.18 classificou 3
  equivalentes com fixtures próprias e **o 336 era discriminável** (C2c-02); o §14.2.1 congelou o blob da
  ferramenta `37549262` com o `bash -n` que não valida awk (C2c-01). As duas premissas vieram **medidas**, não
  herdadas — e estavam erradas pelo mesmo mecanismo que a auditoria precisa nomear.

## Erros do orquestrador no ciclo 3, e o que foi feito com cada um

1. **Exportei `MSYS_NO_PATHCONV=1` nos runners da E4** e a variável vazou para o artefato medido. A trava do
   §13.5 abortou a 1ª delta B. **Pago:** §14.19 (o ambiente entrou na identidade da matriz), delta refeita,
   ERRATA E-11, lição no `conhecimento-de-terreno.md`.
2. **Removi um worktree com a E4 viva dentro** e corrompi uma rodada (28/09). **Pago:** rodada refeita do zero;
   regra "processo vivo antes de remover" no manual.
3. **Deixei um mutante travado por horas** (l.161) sem perceber, porque olhava o log errado. **Pago:** §14.15,
   fronteira 25, protocolo de morte da vaga.
4. **Li o silêncio das três cadeiras como "votando" por 6 h** (30/09, 06:50 → 13:11) sem consultar a lista de
   agentes do harness. **Pago:** parciais preservados, terreno limpo pelo nome, 2ª instância sem herança,
   evidência com hora obrigatória no mandato, lição registrada.
5. **A C2‴ caiu no limite semanal da conta** e eu a retomei na mesma instância depois de medir 0 processos
   vivos. É a forma permitida (instância, não identidade nova) — fica declarado para a auditoria julgar.

## O que entra no ciclo 4 — só depois da auditoria
Nada é decidido aqui. A auditoria responde (a)–(e); o planejador (identidade nova para o ciclo 4) recebe o
parecer **e** os três votos; o conserto da ferramenta (validar o awk dos mutantes; `ec≠0` quando um controle
falha; equivalentes conferidos por id — fronteiras 25, 26, 28 já declaradas) e do pré-voo (as quatro formas
de C1‴) é desenhado lá, com a régua da linha 21: **para cada critério, a mutação que o deixaria vermelho — e,
agora, a prova de que o mutante é um programa**.
