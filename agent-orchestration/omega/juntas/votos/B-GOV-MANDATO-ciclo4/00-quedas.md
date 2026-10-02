# Quedas (P6)

| hora UTC | agente | modelo (pin/herdado) | mandato (no itens) | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 2026-10-02 ~12:20 | conferente-dois-lados-b-gov-mandato-c4 | Fable 5.1 (pin na chamada) | mandato conferente.md | lotes A/B/C em segundo plano (seguiram e terminaram 12:42Z sem o agente) | HTTP 429, limite de SESSAO da conta (reset 15:10Z) | retomada da MESMA instancia por SendMessage as 15:12Z; parcial preservado (md5 ade74a6182c5) |
| 2026-10-02 ~16:30 | conferente-dois-lados-b-gov-mandato-c4 (2a queda) | Fable 5.1 (pin na chamada) | ver mandato | resultados apos a 1a retomada (secao 9-bis), relatorio 59000 B | HTTP 429, limite de SESSAO da conta (reset 20:10Z); 3 agentes Fable em paralelo caíram juntos | retomada da mesma instancia; parcial preservado em preservado-2050 |
