# Prompt — B-O6R-08 Jobs duráveis e realtime distribuído

Corrija Ω6R-ARQ-001, Ω6R-ARQ-002, Ω6R-ARQ-003 e Ω6R-PERF-001. Implemente claim pending→processing atômico, lease/reclaim, schedule singleton, concorrência/deadline configurada e broadcast SSE distribuído com replay.

Done-when: crash após claim é recuperado; handler travado expira; três startups mantêm um schedule; limite de concorrência nunca é excedido; cliente em réplica B recebe mutação A/worker C e reconecta por Last-Event-ID. Não contratar serviço externo: reutilize Redis já presente ou exija nova junta 5/5.
