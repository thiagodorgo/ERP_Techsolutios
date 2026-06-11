# B-076 - Flutter Mobile UX Architecture + HTML Screen Proposals

## Objetivo

Mapear a estrutura Flutter existente, propor a arquitetura UX/UI mobile tela por tela e entregar prototipos HTML/CSS estaticos para validacao antes de qualquer implementacao Flutter final.

## Pre-condicao

1. Executar `git status --short`.
2. Atualizar `main` com `git checkout main` e `git pull --ff-only origin main`.
3. Confirmar PR #75 em `main` por existencia de:
   - `mobile/flutter_app`
   - `docs/expense-management.md`
   - `docs/mobile-flutter-app.md`
   - `docs/mobile-sync-contracts.md`
   - `src/modules/expense-management`
4. Criar a branch `docs/flutter-mobile-ux-html-proposals`.

## Escopo Permitido

- Criar/atualizar documentacao em `docs/`.
- Criar prototipos HTML/CSS estaticos em `docs/prototypes/flutter-mobile/`.
- Atualizar `agent-orchestration/**` somente de forma aditiva.
- Registrar referencia Figma se houver link versionado no repositorio.

## Fora de Escopo

- Implementar telas Flutter finais.
- Alterar backend, migrations, APIs ou contratos.
- Implementar Field Ops realtime, mapa real, upload, OCR, PDF, pagamento, fiscal, contabil ou comissoes.
- Criar ou editar Figma automaticamente.
- Alterar `experiments/`.
- Refactors nao relacionados.

## Telas Minimas a Documentar

- Splash / bootstrap
- Login
- Selecao de tenant
- Home operacional
- Dashboard mobile
- Lista de ordens de servico
- Detalhe de ordem de servico
- Execucao em campo
- Checklist dinamico
- Captura de evidencia
- Mapa / rota / localizacao
- Estoque do tecnico
- Solicitacao de material
- Aprovacoes
- Financeiro basico
- Gestao de Despesas mobile
- Notificacoes
- Sync / offline / conflitos
- Perfil / tenant / permissoes
- Auditoria / timeline
- Estados de erro, vazio, bloqueado, sem permissao, sem internet e conflito de sync

## Prototipos HTML Minimos

- Login + tenant context
- Home operacional field_technician
- Lista priorizada de OS
- Detalhe de OS
- Execucao/checklist
- Captura de evidencia
- Mapa/rota/localizacao
- Sync/offline/conflito

## Validacoes

- `git status --short`
- `flutter pub get`
- `flutter analyze`
- `flutter test`
- `npm run check`
- `git diff --check`
- Validacao visual/local do HTML, preferencialmente com Playwright ou equivalente quando disponivel

## Retorno Esperado

- Branch e commit.
- Link do PR.
- Caminho do HTML.
- Resumo executivo.
- Lista de telas entregues.
- Recomendacoes e gaps.
- Validacoes OK/falha com motivo.
- Confirmacao de preservacao de `agent-orchestration/**`, `memory/**`, documentos historicos e `experiments/`.
