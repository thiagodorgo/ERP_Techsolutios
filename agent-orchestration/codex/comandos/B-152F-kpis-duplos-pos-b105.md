# B-152F — Correcao obrigatoria de KPIs duplos pos-B-105

## Objetivo

Corrigir somente KPIs, dashboards e documentacao apos o gate B-152 pos-B-105.
Nao implementar feature e nao alterar codigo funcional.

## Motivo

O gate B-152 confirmou que PR #97 estava mergeada e que Flutter/backend estavam
verdes, mas falhou porque `Kpis/` raiz estava antigo, arquivos JSON/README da
raiz estavam ausentes, os HTMLs nao continham B-105/totais de forma literal e a
politica de KPIs duplos nao estava documentada.

## Politica permanente

Existem dois conjuntos de KPIs:

- `Kpis/`: KPIs gerais/raiz do projeto.
- `mobile/flutter_app/Kpis/`: KPIs especificos do app Flutter.

Regras obrigatorias:

- Mexeu no Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

## Valores B-105 refletidos

- B-105 — GPS/mapa operacional da OS.
- Field Location e DeviceLocationProvider.
- Flutter tests: 613/613.
- Backend tests: 15/15.
- Backend contract tests focados: 47/47.
- Flutter modules: 17/17.
- MVP demo: 87%.
- MVP vendavel: 64%.
- Blocos entregues: 35.
- PR #97 merge commit: `0a01b0b5a6cc63066cd154fd7c91c1ce66edc5f3`.
- Head aprovado: `8fde8b1443fe9510c7f45e9088ddf5b0d5635d6a`.

## Escopo preservado

Nao alterar:

- `mobile/flutter_app/lib/**`
- `mobile/flutter_app/test/**`
- `src/**`
- `frontend/**`
- `prisma/**`
- migrations
- infra
- `.env`
- lockfiles
- Figma

## Validacoes requeridas

- `node --check mobile/flutter_app/Kpis/app.js`
- `node --check Kpis/app.js`
- `rg` dos marcadores B-105 em `mobile/flutter_app/Kpis` e `Kpis`
- comparacao mobile -> raiz
- `npm run check`
- `npm run lint`
- `npm test`
- `git diff --check`
