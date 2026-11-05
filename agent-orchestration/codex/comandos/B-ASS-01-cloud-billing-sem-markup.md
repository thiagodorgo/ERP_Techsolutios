# B-ASS-01 — Cloud Billing sem markup

## Identidade e origem

- Dev: `dev-ass01-sol` · Codex GPT-5.6 Sol · nível menor declarado · esforço medium.
- Plano: `planejador-assinatura` · Claude Fable 5.1, com correções de 31/10 e 02/11.
- Verificação: pré-revisão, junta completa (3 cadeiras, unanimidade) e conferência pelo Claude, conforme `D-UM-FAZ-OUTRO-VERIFICA`.

## Objetivo

Retirar da superfície pública o cálculo de custo + markup: desmontar as 9 rotas de cloud charges, remover o job `cloud-charges.calculate`, trocar o gate do menu por `platform:cloud-cost-allocation:read` e retirar da tela/adapters o markup. As tabelas, o módulo `src/modules/cloud-charges/**` e as quatro chaves de permissão permanecem intactos.

## Fonte de escopo

Executar literalmente `B-ASSINATURA-plano.md` §4.1 e §12.3/S3, requisitos R-RM-1 a R-RM-8 e fatias F0–F6. O relatório incremental e os comandos executados ficam em `docs/revisoes/ASSINATURA/B-ASS-01-dev.md`.

## Escopo proibido

- `src/modules/cloud-charges/**`
- `prisma/**`
- `src/modules/cloud-cost-allocation/**`
- `src/modules/cloud-usage/**`
- `src/modules/cloud-costs/**`
- `tests/cloud-charge-markup-rules.test.ts`
- apagar qualquer chave do catálogo/tabela `permissions`
- qualquer `DROP` ou `DELETE`

## Bateria

Executar a bateria literal do mandato: raiz `check`, `lint`, `test`, `build`; frontend `check`, `test:smoke`, `build`; suítes R-RM-7 com as contagens medidas; guard de migração; `git diff --check`; diff contido no PERMITIDO. F5 usa apenas PostgreSQL descartável `devass01-pg`, em `127.0.0.1`, porta alta livre, e remove o container no fim.
