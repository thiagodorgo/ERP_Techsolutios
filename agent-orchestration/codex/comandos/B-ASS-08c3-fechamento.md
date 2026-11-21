# B-ASS-08c3 — O fechamento do canal de cobrança: pronto e DESLIGADO (item 60)

- **Tipo:** feature (bloco de DINHEIRO: crédito desfeito, confirmação do cancelamento, órfã do despacho, troca do provedor de nota,
  estorno parcial; muda permissão com as rotas de plataforma e abre superfície externa com o teste de conexão e o webhook)
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-19 (devs) e 2026-11-20 (integração, pré-revisões, conserto e junta)
- **Branch:** `feat/billing-channel-enable` (integração), a partir das mãos `feat/billing-channel-enable-a` e `-b`
- **PR:** #608
- **Autores (devs, declarados):** Dev A `dev-08c3-a-dp` (DeepSeek Pro, nível menor) — o LIGAR: `providers/**`, `vault/**`,
  `[LOOKUP-ID]`, testes A. Dev B `dev-08c3-b-azc` (gpt-5.3-codex, nível Sol) — o DESPACHO e o DEMONSTRATIVO: `outbox/**`, o
  `close` e a rota nova de `statements/**`, `credits/**`, testes B. Integração `int-08c3-azc` (gpt-5.3-codex). Conserto único
  das pré-revisões `fix-608b-cl` e conserto da junta `fix-608c-cl` (Claude Opus, nível menor, que não acharam).
- **Plano (norma, a mais nova vence):** `plano-B-ASS-08c3-fechamento.md` → `…-emenda1.md` → `…-emenda2.md` → `…-emenda2.1.md` →
  `…-emenda2.2.md` (e a Emenda 3 da triagem da junta), fora do repositório, na pasta do orquestrador. A evidência do plano é
  `plano-B-ASS-08c3-fechamento-evidencia.md`.
- **Decisões do dono aplicadas:** Q1 = (b) (`C-08C3-Q1-PADRAO-SEM-RESPOSTA`: a nota fica, com aviso ao contador, até todo o
  dinheiro ser devolvido); Q2 sem resposta, segue (a); Q3 = (a) (o crédito desfeito não cancela nem reemite nota).
- **Nível de revisão:** junta completa (§C7 item 10(1)), unanimidade. A trava automática do item 10(2) também o sobe
  (`outbox/**`, `statements/**`, `credits/**`, `vault/**`).
- **KPI:** congelado (§C7 item 8(5)); PR nenhum atualiza `Kpis/*`.
- **Canal:** continua DESLIGADO. Ligar em produção NÃO é este bloco: é decisão crítica do dono, com junta de 5 unânime (§C7
  item 1), pelo roteiro "Como ligar o canal (ato do dono)" em `docs/`.

## Objetivo

O último bloco do item 60. Entregar as ações que faltam para o dono ligar o canal quando quiser (testar a conexão, registrar o
webhook, ligar e desligar, cada uma com as suas travas) e tirar do caminho os defeitos que impediriam ligar com segurança: o
estorno de um crédito já aplicado que nunca era cobrado de volta; a falha de uma órfã que parava a rodada de todas as
organizações; o cancelamento sem confirmação do provedor sem saída no sistema; a trilha do despacho que não era gravada; os 10
fechamentos concorrentes que expiravam; e os ajustes herdados do 08c2.

## Fatias (plano §10)

Dev A: F-A0 terreno · F-A1 o teste de conexão (`[TEST-CONN]`) · F-A2 o repositório do provedor (`setEnabled`, `recordTest`,
`recordWebhook`, a transação do `enable`) · F-A3 o serviço e a `P-557` (EN6t) · F-A4 as 4 rotas, a permissão e as trilhas ·
F-A5 o `enable`/`disable` no banco · F-A6 o id da nota na reconsulta (`[LOOKUP-ID]`), VM1 e GS-ISO · F-A7 a bateria do sub-ramo A.
Dev B: F-B0 terreno e o registro `C-08C3-Q1-PADRAO-SEM-RESPOSTA` · F-B1 a órfã isolada · F-B2 a trilha persistida · F-B3 a troca
do provedor de nota (`[RETARGET-01]`) · F-B4 a confirmação do operador (`[CONFIRM-LOCK]`, `[CONFIRM-CODES]`) · F-B5 a releitura do
`cancel-unknown` · F-B6 o `close` (`[CLOSE-RESOLVE-OUT]`, `[CLOSE-PIN-CHECK]`) · F-B7 o estorno do provedor (Q1, `[EP-PARCIAL]`) ·
F-B8 o crédito desfeito (`[CREDIT-RECOMPUTE]`).
Integração: F-I1 o merge das mãos e o contrato · F-I2 e F-I3 a bateria.

## Escopo

PERMITIDO e PROIBIDO: o §8 do plano, com as aberturas das emendas. Sem `prisma/**`: nenhuma migração. PROIBIDO medido vazio no
fim (`git diff --name-only origin/main...HEAD -- <caminho>`).

## Bateria

`npm run check` · `npm run lint` · `npm run build` · `node scripts/migration-transaction-guard.mjs` ·
`node scripts/sync-agent-agents.mjs --check` · os testes do bloco em memória e os `-db` (3×) num cluster descartável com
`timezone = 'UTC'`, sob papel NOSUPERUSER NOBYPASSRLS · as mutações do plano §6.4, cada uma vermelha no teste que o plano
nomeia · o T13 do `san3-05` · `CORE_SAAS_PERSISTENCE=memory npm test` com o resumo TAP · os jobs `backend` e `backend-postgres`
do CI com o resumo TAP lido · `git diff --check` · 0 caminho local no diff.

## Registro

- Diários dos devs (P1), versionados por pedido do plano §8: `docs/revisoes/ASSINATURA/B-ASS-08c3-dev-a.md` e
  `docs/revisoes/ASSINATURA/B-ASS-08c3-dev-b.md`. O diário da integração e dos consertos (`int-08c3.md`) fica fora do
  repositório, na pasta do orquestrador.
- Pendências fechadas e abertas: `agent-orchestration/controle/pendencias.md` (fechamentos datados de 2026-11-20, com o PR #608 e
  a prova de cada um; aberturas `P-08C3-*` e `P-T13-INJETADO-PONTO-CEGO`).
- Contrato: `API_CONTRACTS.md`, seção `subscription_billing_channel@2026-11-19.b-ass-08c3`.
