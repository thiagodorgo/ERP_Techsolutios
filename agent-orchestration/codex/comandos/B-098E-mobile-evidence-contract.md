# B-098E - Mobile Evidence Contract

## Objetivo

Implementar contrato backend mobile parcial para registrar manifestos de evidencias de Ordem de Servico e evidencias genericas de campo, sem alterar Flutter.

## Base

- branch: `feature/mobile-evidence-contract`
- base: `origin/main`
- merge obrigatorio confirmado: `fc86ae1f70b21b7bdec02fa308b070cadca9b0a4`
- worktree isolado: `C:\Users\AMP\Documents\GitHub\ERP_Techsolutios-codex-b098e`

## Contrato

- `POST /api/v1/mobile/sync/evidence-actions`
- lote `{ client_batch_id, actions[] }`
- ID por acao: `client_evidence_id`
- tipos de OS: foto, assinatura e observacao
- tipos de campo: foto, assinatura e observacao
- tenant obtido somente do ator autenticado
- idempotencia por tenant + usuario + `client_evidence_id`
- resposta com `summary`, `accepted`, `rejected`, `conflicts` e `already_applied`

## Permissoes

- evidencias de OS: `work_orders:update`
- evidencias genericas de campo: `field_location:send`

## Limite do bloco

Contrato de manifesto/metadados. Upload binario, URL assinada, storage, antivirus, persistencia duravel e consumo Flutter permanecem fora do B-098E.

## Escopo preservado

- nao alterar `mobile/**`
- nao executar comandos Flutter
- nao tocar Figma
- nao alterar secrets, `.env`, migrations ou infra
- nao iniciar B-098F
