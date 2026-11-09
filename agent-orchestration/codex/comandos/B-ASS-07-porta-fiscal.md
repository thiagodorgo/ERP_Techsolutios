# B-ASS-07 — Porta fiscal, reforma tributária e Focus NFe (canal desligado)

- **Tipo:** feature
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-09
- **Branch:** `feat/b-ass-07-porta-fiscal`
- **Autor:** `dev-ass07-codex` (Codex 3, `gpt-5.6-sol`, esforço medium; identidade de dev declarada)
- **Plano:** `B-ASSINATURA` §3, §4.5, §4.6, §4.7 e §12, especialmente §12.2 e §12.4.

## Objetivo

Entregar a porta `InvoiceProviderPort`, regras fiscais em `providers/tax/`, adaptador Focus NFe e servidor falso Focus em `127.0.0.1:0`. O canal permanece desligado por padrão. NFE.io e PlugNotas pertencem ao `B-ASS-15` pelo recorte 1 + 1.

## Regras obrigatórias

- Reusar `providers/http/billing-http.client.ts`; é proibido criar outro cliente ou chamar `fetch` no adaptador.
- O token vem exclusivamente de `VaultService.readSecretForProvider` e nunca aparece em log, erro, URL ou resposta.
- Códigos tributários são campos fornecidos; nenhum valor fiscal “recomendado” é constante.
- `issue` é assíncrono e nunca converte um 2xx inicial em `authorized`.
- IBS/CBS: não-Simples a partir de 2026-12-01; Simples a partir de 2027-01-01; se enviado, o grupo deve estar completo.
- Simples em rota municipal a partir de 2026-11-01 falha fechado.
- Sem migração. A sequência persistida e o T-NF-db-1 pertencem ao B-ASS-08; aqui o dublê é em memória.

## Escopo permitido

- `src/modules/subscription-billing/providers/invoice/**`
- `src/modules/subscription-billing/providers/tax/**`
- `src/modules/subscription-billing/providers/provider.catalog.ts` apenas se necessário para o host Focus já catalogado
- `tests/ass-07-*.test.ts`
- `tests/helpers/fake-providers/focusnfe.ts`
- `tests/ass-06-no-external-calls-guard.test.ts` apenas para manter/ampliar R-EXT-0
- `docs/subscription-billing.md` nas seções de nota fiscal e reforma
- este comando e `docs/revisoes/ASSINATURA/B-ASS-07-dev.md`

## Escopo proibido

- `prisma/**`, migrações, `outbox/**`, `webhooks/**`, `statements/**`, `src/app.ts`, `frontend/**`, lockfiles e dependência nova
- NFE.io e PlugNotas (B-ASS-15)
- qualquer host real em teste ou chamada externa
- `Kpis/**` (congelado)

## Fatias

1. F0: terreno, comando, baseline e relatório.
2. F1: porta + regras fiscais + T-NF-22..27 e 37.
3. F2: falso Focus + adaptador + contrato, assíncrono, duplicidade e erro em 200.
4. F5: registro de emissor/webhook, canal/allowlist/segredo.
5. F6: sequência e reemissão sobre dublê em memória, sem Docker.
6. F7: PDF público Focus, campos Focus e cancelamento.
7. F8: documentação, bateria, push, PR e leitura do CI.

Cada fatia termina em commit e push com caminhos explícitos. Pré-revisão, conferência e junta completa são exclusivamente Claude e/ou DeepSeek.

## Bateria

```bash
npm run check
npm run lint
node --test --import tsx tests/ass-07-*.test.ts
node --test --import tsx tests/ass-06-no-external-calls-guard.test.ts
npm test
npm run build
git diff --check
```

Sem migração. KPI congelado. Não fazer merge: pré-revisão e junta completa.
