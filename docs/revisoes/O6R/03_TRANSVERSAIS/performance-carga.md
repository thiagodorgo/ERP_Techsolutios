# Performance sob carga real

Lente: A4. Status: ✅.

## Métricas

- 152 `findMany` backend em 78 arquivos; 44 arquivos candidatos a `for`+`await`.
- 54 arquivos com `useAutoRefresh` (53 consumidores).
- 12 handlers registrados; 4 recorrentes auto-reenfileirantes.
- Telemetria: lote 50, janela 168h e heartbeat 60s.

## Achados ativos

- Ω6R-PERF-001 — worker sobrepõe handlers sem deadline.
- Ω6R-PERF-002 — polling web acumula requests/respostas fora de ordem.
- Ω6R-PERF-003 — Jimp público disputa event loop/memória com ERP.
- Ω6R-ARQ-001/002/003 — fila e realtime inviáveis sob falha/escala horizontal.
- Ω6R-DIN-007 — agregação de custo truncada.

## Top N+1/varreduras

CUR por linha; notificações item×destinatário; overview plataforma por tenant; telemetria por perfil; schedules por destinatário; diárias e notificações legais seriais; tags por associação. Agregados de resumo financeiro/timeseries/performance materializam histórico completo; entram no plano de follow-up P2 por SQL agregado/paginação.
