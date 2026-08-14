# Contratos API ↔ React ↔ Flutter

Lente: A5. Status: ✅.

## Achados

- Ω6R-QUA-001 — replay RDV sem token.
- Ω6R-QUA-002 — contrato de estoque paralelo e sem replay.
- Ω6R-QUA-004 — OS Flutter viola envelope/casing/payload.
- Ω6R-QUA-005 — fila de materiais retorna antes da durabilidade.
- Ω6R-QUA-003 — testes financeiros Memory não validam contratos de persistência.

## Cobertura

218 arquivos de teste backend, 139 frontend e 60 Flutter; 99/139 testes frontend são renderização estática e há 11 cenários Playwright. Os fluxos críticos sem contrato E2E comprovado são expense sync autenticado, inventory sync, OS detail/status/timeline/assign e seleção multi-SKU.

Done-when de correção: fixtures de resposta reais, cliente concreto (Dio/fetch), erro/retry/offline e persistência reaberta após restart.
