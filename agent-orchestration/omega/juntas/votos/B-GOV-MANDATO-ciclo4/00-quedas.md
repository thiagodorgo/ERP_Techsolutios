# Quedas (P6)

| hora UTC | agente | modelo (pin/herdado) | mandato (no itens) | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 2026-10-02 ~12:20 | conferente-dois-lados-b-gov-mandato-c4 | Fable 5.1 (pin na chamada) | mandato conferente.md | lotes A/B/C em segundo plano (seguiram e terminaram 12:42Z sem o agente) | HTTP 429, limite de SESSAO da conta (reset 15:10Z) | retomada da MESMA instancia por SendMessage as 15:12Z; parcial preservado (md5 ade74a6182c5) |
| 2026-10-02 ~16:30 | conferente-dois-lados-b-gov-mandato-c4 (2a queda) | Fable 5.1 (pin na chamada) | ver mandato | resultados apos a 1a retomada (secao 9-bis), relatorio 59000 B | HTTP 429, limite de SESSAO da conta (reset 20:10Z); 3 agentes Fable em paralelo caíram juntos | retomada da mesma instancia; parcial preservado em preservado-2050 |
| 2026-10-03 ~05:40 | inspetor-de-terreno-da-junta (junta 4) | Fable 5.1 (pin na chamada) | mandato inspetor.md (69beed56) | secoes 0 a 4.5 gravadas; 5 (quorum), veredito e limpeza EM APURACAO | HTTP 429, limite de SESSAO da conta; 3 agentes vivos (2 Fable, 1 Opus) | sucessor NOVO em Opus 5.5 (decisao do dono 2026-10-03: Fable so em blocos que tocam dinheiro), P3 sobre o parcial preservado (scratchpad/preservado-1113/INSPETOR-393-J4.md) |
| 2026-10-03 18:25 | C2⁗ jurado-mandato-c2d-cobertura-e-dois-lados | Opus 5.5 (pin) | mandato c2d.md (3 itens) | PAUSA do dono (P7) no meio do voto; jobs locais (~40 processos) parados pelo orquestrador ~18:30Z | nao e queda: ordem de pausa (reinicio do PC) | retomada no Codex GPT-5.6 Sol, mesma identidade, P3 sobre a secao PAUSA; os itens em voo refeitos |
| 2026-10-03 22:57 | C2⁗ (sucessora no Codex) | GPT-5.6 Sol | idem | itens 0-6 em re-execucao | limite de uso da conta OpenAI | retomada 03:26Z (04/10), mesma sessao, contexto preservado |
| 2026-10-04 04:00 | C2⁗ (Codex) | GPT-5.6 Sol | idem | item 2, fila C lote 3 | limite de uso da conta OpenAI | retomada 08:28Z, mesma sessao; voto concluido 08:51Z |
