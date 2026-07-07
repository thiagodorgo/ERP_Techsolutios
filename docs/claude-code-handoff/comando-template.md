# B-NNN — <título do bloco>

> Molde de **comando** no formato usado no repo (`agent-orchestration/codex/comandos/`).
> Copie, renomeie para `B-NNN-<slug>.md`, preencha e remova as dicas em itálico.
> Feature = `B-NNN` · KPI pós-aprovação = `B-NNNK` · correção de KPI = `B-NNNF` · gate = `B-NNNG`.

## Objetivo

*O que este bloco entrega, em 1–3 linhas. Escopo mínimo e vertical.*

## Contratos / Endpoints

- `MÉTODO /api/v1/...`
- Campos aceitos / envelope de resposta `{ data }`.
- **Versão do contrato:** `<nome>@<AAAA-MM-DD>.<bloco>`.
- Tenant resolvido pelo **ator autenticado** (ignora `tenant_id` do cliente/form).
- Permissões exigidas (canônicas do `RBAC_MATRIX.md`).
- Idempotência (quando sync): `tenant + usuário + client_action_id`.

## Regras

*Regras de negócio, validações, estados de erro (ex.: segunda decisão →
`*_already_decided`), reprovação exige motivo, etc.*

## Integrações

*OS/checklist/evidência/aprovação/notificação/auditoria afetadas. Auditoria sanitizada.*

## Escopo permitido

- `caminho/exato/**`
- *…só o necessário para este bloco.*

## Escopo proibido

- Feature nova fora do objetivo · arquivos **KPI** (em bloco de feature) ·
  `prisma/**` · `migrations/**` · `frontend/**` (se não for o alvo) · `infra/**` ·
  `.env` · lockfiles · `pubspec.*` · Figma.

## Validações

```bash
# Flutter (se tocar mobile)
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/<bloco>_<slug>_test.dart --reporter compact
# + regressões dos blocos anteriores relevantes
flutter test --reporter compact
cd ../..

# Backend / raiz
npm run check
npm run lint
npm test
npm run build
node --test --import tsx tests/<contrato>.test.ts
node --check Kpis/app.js
node --check mobile/flutter_app/Kpis/app.js

# Frontend (se tocar web)
npm --prefix frontend run check
npm --prefix frontend run build

git diff --check
```

## Limites

- **Não** atualizar KPIs nesta PR (feature).
- *Fora de escopo desta rodada: … (ex.: sem presigned URL, sem antivírus real, sem Prisma).*
- Limpar artefatos Flutter/Node após as validações.

## KPI (proposto, não publicado)

- Blocos concluídos: `NN`
- MVP demo: `NN%`
- MVP vendável: `NN%`
- Totais reais de testes: *preencher após validação final.*

<!-- Publicação real só em bloco B-NNNK/B-NNNF, após avaliação humana + merge + gate,
     com PR #, merge commit e approved head REAIS (campo null bloqueia o próximo bloco). -->
