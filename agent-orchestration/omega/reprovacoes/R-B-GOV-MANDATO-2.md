# R-B-GOV-MANDATO-2 — ciclo 2 reprovado (§C7.4)

- **Entrega:** `B-GOV-MANDATO` (PR #393) — o mandato do orquestrador passa a ser verificável por máquina.
- **Objeto reprovado:** `4c8819effd0b9f7a1ef8040eaa1707ca8342fdad`. **Ata:** `J-B-GOV-MANDATO.md`, seção
  "Ciclo 2", **REPROVADO 2 × 1** (C1′ e C2′ contra, C3″ a favor).
- **Ciclo:** 2. **Teto:** o `D-TETO-DOIS-CICLOS` foi **REVOGADO** pelo dono em 2026-09-27
  (`D-SEM-TETO-AUDITORIA-NO-3`, PR #394). O bloco **retoma no ciclo 3**, e como o ciclo 3 é o do gatilho, se
  ele produzir achado `bloqueia` a **auditoria da orquestração e da junta** é obrigatória antes do ciclo 4.

## A classe que se repetiu — e é o motivo de este registro existir

**Nos dois ciclos, o remédio nasceu com a doença.**

- O **ciclo 1** foi reprovado porque a trava do pré-voo só enxergava `^[-*] `: *"bullet rejeita, tabela
  passa"*.
- O **ciclo 2** criou a **checagem 7** para fechar exatamente isso — e ela nasceu **dependente da forma**:
  mesmo rótulo e mesmo objeto reprovado, **bullet rejeita; tabela, quebra de linha e prosa dão `PRE-VOO
  OK`**. Os três casos de teste dela usavam **uma única forma**.
- E o conserto do **`approved_head` fabricado** — o bloqueante central do ciclo 1 — **não tem teste nenhum**:
  6 das 7 cláusulas de validação de insumo do `mandato-refs.sh` não têm caso. Removendo a validação de
  `origin/$BASE`, a ferramenta deixa de PARAR e volta a emitir `approved_head: … ^ LIDO DA ATA` com **ec=0**
  sob premissa quebrada, **com o guard 18/18 VERDE**.

**Houve informação nova?** Sim, e isto importa para o gatilho de auditoria: o ciclo 2 **não** repetiu o ciclo
1 em silêncio. Ele **fechou** o C2-01 de verdade (`0 de 51` casos sobrevivem ao artefato apagado, contra
**4 de 6** antes), provou que o guard **não** está preso ao texto (4/4 no-ops verdes), fechou a pendência do
basename **duas vezes com amostras independentes** (25/25 e 20/20, contra 0/20), e publicou a **primeira
medição de cobertura que este artefato já teve**: 87,0% sobre 195 pontos enumerados da fonte, 74,0% no
`mandato-refs.sh`. Os bloqueantes do ciclo 2 são **mais fundos** que os do ciclo 1, não os mesmos.

## Separação de papéis para o ciclo 3 (§C7.4-bis)

| papel | quem | restrição |
|---|---|---|
| **quem achou** | C1′ (`guardiao-fail-closed`) e C2′ (`medidor-de-cobertura-do-artefato`) | não planejam, não consertam |
| **quem planeja** | `planejador-mestre`, **Fable obrigatório** (`D-PLANEJADOR-MODELO-FABLE`) | não desenvolve |
| **quem desenvolve** | dev **novo** | não julga a validade do achado |
| **INELEGÍVEIS como jurado** | C1′, C2′, C3″ (ciclo 2) e as três cadeiras do ciclo 1 | votaram; precedente `J-B-O6R-02-ciclo4` |
| **INELEGÍVEL como dev** | o orquestrador e `a4ed42a5e3a81bdd3` (dev do ciclo 2) | escreveram o código julgado |

As três perguntas que o §C7.4-bis manda responder por escrito:
- **(a) a composição cobre a competência do achado?** Sim. A junta 3 nasce com três identidades novas
  dedicadas às três classes vivas: invariância de forma, cobertura por mutação, e fronteira/número/registro.
- **(b) quem achou é quem consertou?** Não, e não pode ser: C1′ e C2′ estão fora do conserto por contrato, e
  o orquestrador está fora por ter escrito o código original.
- **(c) o planejador está usando dado podre?** Risco tratado: o plano do ciclo 3 exige **§0 com linha de base
  medida por ele**, reproduzindo os 5 bloqueantes nos artefatos reais, **nada herdado dos pareceres como
  fato**. Ele **derrubou** inclusive uma premissa da cadeira C1′ ao medir (`medido por: -` passa em bullet
  também, logo não há assimetria tabela×bullet).

## Erros do orquestrador no ciclo 2, e o que foi feito com cada um

1. **Duas falsidades de terreno repetidas em TODOS os mandatos da noite** — *"a 5432 é de outro projeto"* e
   *"a faixa 58284–58483 é excluída pelo Windows"*. Derrubadas por execução pelo inspetor, não por mim.
   **Pago:** corrigidas no briefing (`4c8819ef`) **e**, depois do achado C3b-02, por **ERRATA prefixada e
   datada nos 3 corpos × 2 espelhos**, com a cauda de cada corpo provada byte-idêntica.
2. **A retratação não havia propagado** para os corpos que os atores leem como contrato (C3b-02). **Pago**
   junto com o item 1.
3. **O corpo do PR #393 descrevia o ciclo 1**, com 3 de 11 alegações falsas (C2′). **Pago** por `gh pr edit`.
4. **`decisoes.md` entrou no diff sem declaração de escopo** (C3b-01). **Pago:** autorizado nominalmente no
   §4 do plano do ciclo 3.
5. **Ponteiro de seção errado e "106" contra 107 atas** (C3b-03) — mesma classe do "cinco contra oito".
   **Pago** por errata no plano do ciclo 2.
6. **O heartbeat que eu escrevi para supervisionar a noite media a idade do transcript como sinal de vida** —
   e o `.output` do subagente nasce com **0 bytes**, só preenchido no fim. O sinal nunca mediu nada.
   Corrigido para atividade no worktree, com o `find` limitado a profundidade 1 depois de a primeira versão
   varrer o `node_modules` inteiro e estourar o tempo.
