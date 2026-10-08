# R-B-SAN3-11-2 — ciclo 2 reprovado (§C7.4)

- **Entrega:** `B-SAN3-11` (PR #401) — o dossiê rotula a vistoria substituída.
- **Objeto reprovado:** `d24f7283bfba55d298e8118e7b590465c5a4d4d6`. **Ata:** `J-B-SAN3-11.md`, seção "Ciclo 2", **REPROVADO** por veto
  da C2′ (unanimidade de 3).
- **Ciclo:** 2. **Teto:** não há (`D-SEM-TETO-AUDITORIA-NO-3`). **Gatilho do ciclo 3:** se o ciclo 3 também produzir `bloqueia`,
  a auditoria da máquina é obrigatória antes do ciclo 4.

## Os dois `bloqueia`

- **C2c2-F1** (`dentro-do-bloco`): o gerador do censo (P-L3) é **fail-open** para acesso por índice (`ElementAccess`) e para o
  conjunto vazio — o membro não previsto nasce permitido.
- **C2c2-F2** (`dentro-do-bloco`): no fluxo adapter → service → hook → painel, quando uma resposta subsequente é recusada pelo
  contrato, o painel **não limpa as linhas** da resposta anterior — dado velho fica na tela como se fosse válido.

## A classe se repetiu?

Parcialmente. O ciclo 1 reprovou por guardas que reconheciam forma (a régua A17/A18/A25) e por afordância; o ciclo 2 fechou a
afordância (C1′ aprovou) e o registro (C3′ aprovou), e a C2′ achou duas instâncias novas da família *fail-closed*: uma no gerador
(o enumerador não cobre todas as formas de acesso) e uma no estado de erro do painel. É informação nova, com mutação executada.

## Separação de papéis (§C7.4-bis)

- **(a) Composição:** a competência que achou (enumeração tipada e fail-closed) continua na junta 3, com identidade nova.
- **(b) Quem achou não conserta:** a C2′ fica inelegível para planejar e desenvolver o ciclo 3; planejador e dev do ciclo 3 têm
  identidade nova.
- **(c) Dado podre:** o planejador do ciclo 3 re-mede os dois achados no head (vermelho-controle próprio) antes de escrever o plano.

## Onde roda

Fable e GPT-6 Astra suspensos pelo dono até o reset semanal. O ciclo 3 roda no Codex (GPT-5.6 Sol) e, nas janelas em que o Codex está
no limite, no Claude em Opus, uma tarefa por vez (decisão do dono de 2026-10-04).
