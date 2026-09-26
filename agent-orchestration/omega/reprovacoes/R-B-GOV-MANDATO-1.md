# R-B-GOV-MANDATO-1 — ciclo 1 reprovado (§C7.4)

- **Entrega:** `B-GOV-MANDATO` (PR #393) — o mandato do orquestrador passa a ser verificável por máquina.
- **Objeto reprovado:** `7462b75bfb7768556a2da2ee13f9ac92e9198872`. **Ata:** `J-B-GOV-MANDATO.md`, **2 × 1**.
- **Ciclo:** 1 de 2. `D-TETO-DOIS-CICLOS` — **o ciclo 2 é o último**; reprovar nele manda o bloco a dossiê.

## A classe única, e por que ela importa mais que os quatro bloqueantes

**C1-01** (a trava só enxerga bullets), **C2-01** (o teste exercita uma réplica, não o `.sh`) e o **basename**
(a checagem confere nome, não caminho) **são a mesma coisa**: *guarda que reconhece uma FORMA CONHECIDA em vez
de enunciar a PROPRIEDADE*. Some-se **C2-02**: com `$RAMO` vazio, a ferramenta **fabrica** o `approved_head` —
o #393, sem ata, recebeu `7822deaf…` rotulado "LIDO DA ATA".

É a classe que custou o PR #386 (`feedback-correcao-por-instancia-nao-propriedade`), reaparecendo **dentro da
ferramenta construída para fechá-la**. Consertar as instâncias uma a uma repetiria o erro diagnosticado.

## Separação de papéis (§C7.4-bis) — a ata registra, este arquivo repete

| papel | quem | restrição |
|---|---|---|
| **quem achou** | cadeiras C1 e C2 | não planejam, não consertam |
| **quem planeja** | `planejador-mestre`, **Fable obrigatório** (`D-PLANEJADOR-MODELO-FABLE`) | não desenvolve |
| **quem desenvolve** | dev **novo**, identidade nova | não julga a validade do achado |
| **INELEGÍVEL como dev** | **o orquestrador** | escreveu `mandato-refs.sh`, `mandato-preflight.sh` e o teste |

As três perguntas que o §C7.4-bis manda responder por escrito antes de recompor:
- **(a) a composição cobre a competência do achado?** Parcialmente. A classe é *enumeração fail-closed*, e há
  `guardiao-fail-closed` no elenco — cabe na junta 2. Falta competência em *"o teste mede o artefato, não uma
  réplica"*: é o especialista a criar (§C7.4, ciclos 1–2).
- **(b) quem achou é quem consertou?** Não, e não pode ser. C1 e C2 estão fora do conserto por contrato.
- **(c) o planejador está usando dado podre?** Risco real e nomeado: o mandato do ciclo 1 trazia premissa não
  medida, e a **emenda** que o orquestrador escreveu para a junta **respondia à pergunta vizinha** (conferia se
  o token "aparece", não se é declarado como objeto). Por isso o plano do ciclo 2 exige §0 com linha de base
  medida e, para cada critério, a mutação que o deixaria vermelho.

## Erros do orquestrador neste ciclo, para não virarem fato herdado

1. **SHA fabricado no briefing** — `1c5437daa`, nove caracteres completados de cabeça, que não resolvem. Sexta
   instância da classe na rodada, cometida no briefing do bloco que existe para fechá-la.
2. **A emenda da junta tinha o defeito da rodada** — C2 e C3 registraram independentemente que o `grep`
   prescrito, lido pelo `ec`, teria invertido a conclusão. Ambas leram a substância.
3. **Escopo não declarado** — os 6 corpos de jurado ficaram fora do Escopo PERMITIDO do comando (C3-01).
   Declarado na ata, tarde.
