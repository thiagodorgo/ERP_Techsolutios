# B-SAN3-03 — Rateio exato do custo de nuvem

- **Tipo:** feature
- **Fase:** Execution / Validation
- **Trilha:** backend/raiz
- **Data:** 2026-10-31
- **Branch:** `fix/cloud-billing-exato`
- **Base medida:** `origin/main@0fda595a9cb37d2d75abd45ef23eacc5dc56fea8`
- **Executor:** `dev-san303-sol`, Codex GPT-5.6 Sol, nível menor declarado

## Objetivo

Garantir que cada run rateie exatamente um import, derive as bases de uso de fatos persistidos e atômicos,
separe custo da plataforma, nomeie custo não rateado, conserve dinheiro em micro-unidades e produza resumo
do período exato. Não implementa migração, UI, disparo automático, câmbio, margem, assinatura ou leitura AWS.

## Fontes e precedência

1. Decisões explícitas do dono e `CLAUDE.md`.
2. `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-03-emenda-1.md`.
3. `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-03-plano.md`.
4. `conf-emenda-san303.md` e `rev-san303b.md` do mesmo pacote.

A Emenda 1 substitui o plano onde divergir. As recomendações adotadas são padrão de execução, não decisão
do dono. Nenhuma recomendação ou registro autoriza migração.

## Propriedade de dinheiro

- Uma run fixa um único import elegível em `metadata.importId`; reimportação não duplica custo.
- Toda base vem de fato persistido, capturado na mesma transação ou derivado sob contexto RLS e filtro
  explícito de organização.
- Custo sem destino tem motivo; custo da plataforma é linha própria e não integra `totalUnallocatedCost`.
- Moedas mistas falham fechado.
- Em micro-unidades:
  `importado = alocado + plataforma + não rateado + resíduo`, com
  `abs(resíduo) <= roundingCount × 0,000001`; acima disso a run falha `residual_exceeded`.

## Requisitos emendados

- R1: import explícito exige UUID e status `completed`; sem `importId`, selecionar o import concluído mais
  recente com linhas sobrepostas; ausência conclui run vazia com `importResolution: "none"`.
- R3/R4/R5: upload, concessão de download e job gravam uso de forma aguardada, idempotente por entidade e
  atômica com o fato; falha é fail-closed.
- R6: `storage_bytes_current` soma as quatro tabelas inventariadas de anexos; o censo impede omissão.
- R7: `audited_actions_count` exclui `auth.*`, ator nulo e atos de usuários da plataforma; `awselb` entra em
  API; `api_requests_count`/`api_request.count` não entram na regra.
- R8/R8-b: a organização `platform` permanece no universo e no denominador; tag por id/nome/slug, sem
  diferença de caixa, direciona sua fatia para `totalPlatformCost`; razões não rateadas são obrigatórias.
- R11: regras `compute`, `database`, `cache` e marcador `estimate`; método de alocação existente, sem migration.
- R12: resumo seleciona período UTC exato, prefere run com import e expõe `coverage`, `runId`, `importId`,
  `importResolution`, razões, plataforma, estimativas e resíduo.
- R13/R14: conservação por `BigInt` em micro-unidades e trava de moeda mista.
- R9: remover o `take` residual em agregação e o laço privado duplicado, preservando canários.

## Escopo PERMITIDO

- `src/modules/cloud-cost-allocation/cloud-cost-allocation.repository.ts`
- `src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts`
- `src/modules/cloud-cost-allocation/cloud-cost-allocation.service.ts`
- `src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts`
- `src/modules/cloud-cost-allocation/cloud-cost-allocation.types.ts`
- `src/modules/cloud-cost-allocation/cloud-cost-allocation.rules.ts`
- `src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.ts`
- `src/modules/cloud-usage/cloud-usage.capture.ts`
- `src/modules/cloud-usage/cloud-usage.events.ts`
- `src/modules/cloud-usage/cloud-usage.types.ts`
- `src/modules/cloud-usage/cloud-usage.service.ts` (somente comentário previsto)
- `src/modules/checklists/checklist-prisma.repository.ts` (somente captura de anexo/download)
- `src/modules/checklists/checklist.repository.ts` (somente interface e memória correspondentes)
- `src/modules/checklists/checklist.service.ts` (somente `getAttachmentDownload`)
- `src/infra/jobs/job.worker.ts` (somente ordem handler → captura → complete)
- `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` (somente remover uma linha `take: 100_000`)
- `scripts/san3-05-acessos-de-plataforma.mjs` (somente a linha do wrapper privado)
- Testes novos `tests/san3-03-*.test.ts` e os testes existentes nominalmente autorizados no plano/emenda.
- `docs/cloud-cost-allocation.md`, `docs/revisoes/SAN3/B-SAN3-03-dev.md` e registros nominais do bloco em
  `agent-orchestration/**` e `docs/revisoes/SAN3/PLANO_SAN3.md`.

## Escopo PROIBIDO

- `prisma/**`, `migrations/**`, `Kpis/**`, lockfiles, dependência nova, `.env`, `infra/**`, `frontend/**`,
  `mobile/**`, `.github/**`, `src/modules/cloud-costs/**` e módulos de auth/permissão/navegação.
- `src/modules/cloud-charges/**` fora da única remoção de `take` autorizada.
- Campo ou cálculo de margem, assinatura, preço, plano, franquia, grupo econômico ou câmbio.
- `enqueue` novo, método novo em `CLOUD_COST_ALLOCATION_METHODS`, `take:` novo, `?? 0` em soma monetária/base,
  `createMany({ skipDuplicates })` para uso e novo laço multi-tenant.

## Fatias obrigatórias

F0 preparação/baseline; F1 import em memória; F2 import Prisma; F3 upload atômico; F4 download atômico;
F5 job atômico; F6 bases derivadas em memória; F7 bases no Postgres/censo; F8 plataforma; F8a regras de
serviço; F8b conservação/moeda; F8c resumo; F9 laço único, bateria e registros. Cada fatia exige vermelho-
controle dos testes novos aplicáveis, mutações nomeadas, `npm run check`, testes da fatia, `git diff --check`,
commit, push e seção `## RETOMADA n` no relatório do dev.

Docker somente em F0, F2, F3, F4, F5, F7, F8c e F9: container próprio `pg-san303`, PostgreSQL 16,
`127.0.0.1:55432`, sem volume; remover ao fim de cada fatia. Nunca usar base viva ou `DATABASE_URL` do CI.

## Bateria final

```bash
npm run check
npm test
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/san303?schema=public" npm test
npm run build
node scripts/sync-agent-agents.mjs --check
git diff --check
```

Além da suíte integral: testes dirigidos e 48 mutações M1–M46, M17-b e M31-b da Emenda 1; toda mutação
precisa deixar o teste nomeado vermelho e ser restaurada antes do commit. Verde registra comando, exit code,
contagem e saída; skip de teste `-db` não conta.

## DoD e rastreabilidade

- Escopo respeitado; zero diff em `prisma/**`, `migrations/**`, `Kpis/**`, lockfiles e `frontend/**`.
- Todas as 13 fatias commitadas e empurradas em ordem; relatório retomável completo.
- Recomendações registradas como recomendações adotadas, nunca como decisão do dono.
- PR aberto sem atribuição; não fazer merge; linha `PRONTO PARA PRÉ-REVISÃO` no relatório.
- **ID:** B-SAN3-03 · **PR:** preenchido ao final · **merge/approved head:** n/a na autoria.
- **Junta:** completa após pré-revisão, fora do mandato deste dev.
