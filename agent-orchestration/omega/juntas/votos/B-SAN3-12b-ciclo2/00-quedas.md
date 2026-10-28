# Quedas — junta B-SAN3-12b ciclo 2 (P6)

| agente | modelo (pin/herdado) | mandato (nº itens) | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|
| jurado-san312b-c2-r2-sol (Codex) | gpt-5.6-sol, esforço medium (pin no lançador) | 3 | medição: matriz, sete testes, front, cauda R5/R9 e 3 mutações feitas (logs em erp-pausa-2026-10-03/j12b2-c2rev, 01:35–01:40Z); evidência só com "Legalidade" (P1 não aplicado por item) | lançador: o PowerShell tentou desserializar o stream de erro do codex.exe como CLIXML ("Cannot process the XML from the Error stream"), ec=1 às 01:40:52Z; não foi falha do agente | ~12 min de medição; o sucessor re-executa os scripts do scratch como roteiro (P3). Lançador corrigido: o codex.exe roda por um .cmd |
