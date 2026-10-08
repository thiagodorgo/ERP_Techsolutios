# Quedas (P6)

| hora UTC | agente | modelo (pin/herdado) | mandato (no itens) | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 2026-10-02 ~12:20 | inspetor-de-terreno-da-junta (junta 1) | Fable 5.1 (pin na chamada) | 4 hipoteses | item 4.2, baseline da raiz em curso (secoes 0 a 4.2 gravadas) | HTTP 429, limite de SESSAO da conta (reset 15:10Z) | retomada da MESMA instancia por SendMessage as 15:12Z; parcial preservado (md5 54ead09f1f1b) |
| 2026-10-02 ~16:30 | planejador-errata1-b-san3-11 (errata 1-bis) | Fable 5.1 (pin na chamada) | ver mandato | texto 15-bis escrito; faltava a limpeza (secao 5) | HTTP 429, limite de SESSAO da conta (reset 20:10Z); 3 agentes Fable em paralelo caíram juntos | retomada da mesma instancia; so a cauda |
| 2026-10-03 ~05:40 | planejador-ciclo2-bis-b-san3-11 (emenda 16-bis) | Fable 5.1 (pin na chamada) | mandato planejador-ciclo2-bis.md (80c06834) | inicio (leitura do mandato); nada gravado | HTTP 429, limite de SESSAO da conta; 3 agentes vivos (2 Fable, 1 Opus) | relancado do zero em Opus 5.5 (decisao do dono 2026-10-03: Fable so em blocos que tocam dinheiro); custo do redo = a leitura inicial |
| 2026-10-03 ~05:46 | dev-ciclo2-b-san3-11 (fatia D2) | Opus 5.5 (pin na chamada) | mandato dev-ciclo2-D2.md (2570adcd), 3 itens | itens 1 e 2 gravados e commit a73fb35f local; item 3 (bateria nos dois terrenos) no npm ci do terreno LF | HTTP 429, limite de SESSAO da conta | retomada da MESMA instancia (Opus); w-dc2 com o gerador convertido a CRLF na arvore (diff so de EOL, preservado em scratchpad/preservado-1113/) |
