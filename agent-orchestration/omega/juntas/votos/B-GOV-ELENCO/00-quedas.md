# Quedas de agente — junta `B-GOV-ELENCO` (§C7.7 · P6)

| agente | modelo (pin/herdado) | mandato (nº itens) | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|
| _(nenhuma até aqui)_ | | | | | |

## Nota de protocolo — P1/P2/P4 não aplicados na passada 1 do inspetor

O disparo do `inspetor-de-terreno-da-junta` na passada 1 levou **mandato de 7 itens** (P4 manda ≤3, ou
fatiar em duas cadeiras) e **sem** as linhas de P1 (evidência incremental em arquivo) e P2
(voto-arquivo-primeiro). Falha do **orquestrador**, não do agente.

Não houve queda — mas o risco era real e é exatamente o que o `D-JUNTA-RESILIENTE` mede: o inspetor entregou
um parecer longo, com 4 suítes executadas e 3 execuções do auditor, **inteiramente na mensagem final**. Uma
queda de streaming teria custado 100% do trabalho, e o postmortem de 29/08 mediu ~50% de queda numa sessão.

Corrigido a partir da passada 2: todo disparo leva o **modelo de mandato verbatim** do §C7.7, com ≤3 itens,
`<cadeira>-evidencia.md` apensado a cada item e `<cadeira>-voto.json` escrito antes da mensagem final.
Registrado na ata (§3).
