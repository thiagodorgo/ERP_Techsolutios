# Rascunho D-004 — Contratos executáveis API/clientes

Status: proposta. Motivação: Ω6R-QUA-001/002/004/005.

## Decisão proposta

Cada endpoint mobile crítico possui fixture versionada do envelope, tipos de ação e semântica de retry/idempotência. Testes executam cliente concreto Dio contra fixture/servidor, não Map/fake que replica a expectativa. Sync só retorna sucesso após persistência local e confirmação remota conforme contrato.

## Consequências

Backend/React/Flutter compartilham contratos versionados sem expor tenant_id. Drift/restart e 401-refresh fazem parte da bateria obrigatória.
