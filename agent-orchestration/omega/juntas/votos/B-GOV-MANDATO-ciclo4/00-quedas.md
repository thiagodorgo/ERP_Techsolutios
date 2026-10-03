# Quedas (P6)

| hora UTC | agente | modelo (pin/herdado) | mandato (no itens) | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 2026-10-02 ~12:20 | conferente-dois-lados-b-gov-mandato-c4 | Fable 5.1 (pin na chamada) | mandato conferente.md | lotes A/B/C em segundo plano (seguiram e terminaram 12:42Z sem o agente) | HTTP 429, limite de SESSAO da conta (reset 15:10Z) | retomada da MESMA instancia por SendMessage as 15:12Z; parcial preservado (md5 ade74a6182c5) |
| 2026-10-02 ~16:30 | conferente-dois-lados-b-gov-mandato-c4 (2a queda) | Fable 5.1 (pin na chamada) | ver mandato | resultados apos a 1a retomada (secao 9-bis), relatorio 59000 B | HTTP 429, limite de SESSAO da conta (reset 20:10Z); 3 agentes Fable em paralelo caíram juntos | retomada da mesma instancia; parcial preservado em preservado-2050 |
| 2026-10-03 ~05:40 | inspetor-de-terreno-da-junta (junta 4) | Fable 5.1 (pin na chamada) | mandato inspetor.md (69beed56) | secoes 0 a 4.5 gravadas; 5 (quorum), veredito e limpeza EM APURACAO | HTTP 429, limite de SESSAO da conta; 3 agentes vivos (2 Fable, 1 Opus) | sucessor NOVO em Opus 5.5 (decisao do dono 2026-10-03: Fable so em blocos que tocam dinheiro), P3 sobre o parcial preservado (scratchpad/preservado-1113/INSPETOR-393-J4.md) |
