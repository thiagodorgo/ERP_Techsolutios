# Formato do "estado" (decisão do dono, 2026-10-10 — `D-FORMATO-DO-ESTADO`)

> *"quando eu pedir o estado vc me retorna onde estamos, o que estamos fazendo, como estamos indo, onde nos estamos no
> cronograma, previsao do bloco atual e global tudo com checklists para eu acompanhar o progresso, documente isso"*

O dono pediu cinco itens com checklists (a citação acima). A seção 6, a legenda de ícones e as "Regras" no fim são
ELABORAÇÃO do orquestrador, para o formato ficar completo; o dono pode cortá-las.

Toda vez que o dono pedir "estado", "como estamos" ou "repasse o estado", a resposta usa **estas 6 seções, nesta ordem**,
em português simples e sem enrolação, com checklists (✅ feito · 🟡 em curso · ⬜ não começou · ⏸ esperando decisão).

1. **Onde estamos** — data e hora (UTC e local), o head da `main`, o que mergeou desde o último estado e o que está no ar
   (endereços do servidor local).
2. **O que estamos fazendo agora** — tabela: cada agente vivo (Claude ou Codex), o papel, o bloco e desde quando, mais as
   vagas em uso (Claude até 2, Codex 1).
3. **Como estamos indo** — o que deu certo, o que travou e por quê (reprovação de junta, CI, limite de cota, queda), com o
   custo medido.
4. **Onde estamos no cronograma** — a ordem aprovada pelo dono, item por item, com checklist.
5. **Previsão** — do **bloco atual** (os passos que faltam, cada um com prazo) e **global** (produção liberada, Traccar,
   versão vendável), com prazo honesto e o que muda o prazo.
6. **Decisões que esperam o dono** — tabela: decisão, recomendação do orquestrador e o que ela trava.

Regras: número só com fonte medida; previsão sempre como faixa, nunca data fechada sem base; nada de jargão de processo
sem explicar o efeito para o produto.
