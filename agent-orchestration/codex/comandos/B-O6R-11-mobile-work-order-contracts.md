# B-O6R-11 — contratos do app de campo com a OS (`Ω6R-QUA-005` e `Ω6R-QUA-004`, em `P-O6R-B11`; item 3)

- **Tipo:** feature (fecha um item do gate) · **Fase:** Execution · **Trilha:** mobile (Flutter) · **Data:** 2026-09-13
- **Branch:** `fix/mobile-work-order-contracts` · **Frente:** 4 do plano SAN3 (app de campo) — primeiro da frente
- **Autor:** orquestrador (rodada SAN3), depois do porteiro do #386 (LIBERADO COM RESSALVA)

## Objetivo

Consertar dois defeitos do app (plano SAN3 §4.1, item 3): o envelope `{ data }` da API é lido como se fosse o corpo — detalhe,
status e atribuição da OS saem errados —, e o enfileiramento na fila local roda sem `await`, então N ações enfileiradas
antes de um reinício podem virar menos de N. Fica de fora: telas novas e o backend.

## Contexto / fontes de verdade

- Ler antes: status-geral, `agent-orchestration/controle/` (`P-O6R-B11`), o log, `PROJECT_MEMORY.md`; achado `QUA-005` em
  `docs/revisoes/O6R/achados.jsonl`.
- Plano: `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 (item 3), §5 (linha do bloco), §5.6 (CE-G1, CE-G2).
- Offline-first (§6 do contrato): idempotência por tenant + usuário + `client_action_id`; o blob local só é apagado em
  `status=stored` (B-108).

## Escopo PERMITIDO

- `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart`
- `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart`
- `mobile/flutter_app/lib/core/sync/sync_queue_repository.dart`
- `mobile/flutter_app/lib/core/local_db/drift_sync_action_store.dart`
- testes em `mobile/flutter_app/test/**` · `agent-orchestration/**` · `Kpis/**`

## Escopo PROIBIDO

`src/**`, `frontend/**`, `prisma/**`, `pubspec.yaml`/`pubspec.lock`, `infra/**`, `.github/**`, `.env`, lockfiles.

## Rito (§C7)

> **Corpo da ref em toda invocação dos gates:** `planejador-mestre`, `inspetor-de-terreno-da-junta` e `porteiro-pos-merge`
> divergem na árvore da sessão; o prompt manda ler `git show origin/main:.claude/agents/<papel>.md`.

1. `planejador-mestre` (Fable) mede em `origin/main`: **toda** leitura de resposta da API no app que ignora o envelope
   `{ data }`, e **todo** enfileiramento sem `await` — gerados por grep a partir do código, não só nos arquivos da linha do §5
   (a propriedade é "nenhuma chamada do app lê o envelope como corpo; nenhuma ação é enfileirada sem esperar"). O que achar fora
   da fronteira vira pendência nomeada com dono.
2. Um dev distinto implementa só o plano aprovado.
3. Inspetor; junta com **unanimidade de 3**.
4. CI verde (inclui o job `flutter`) → squash → limpeza §C5 (comandos separados) → porteiro.

## Teste de encerramento (§5)

Dio fake com `{data:{…}}` → detalhe, status e atribuição corretos; a atribuição envia o campo que o backend lê; N SKUs
enfileirados + reinício → N ações. Vermelho-controle no head-base.

## Bateria de validação

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/<teste do bloco>_test.dart --reporter compact
flutter test --reporter compact
cd ../..
node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
git diff --check
```

## KPIs no próprio PR (§C3)

`flutter_tests` com N e forma (painel único, §C3.2); `blocks_completed` +1; `status: published_per_pr`. Se for o **primeiro PR
de execução a mergear** depois do #386, carrega as dívidas dele (ver o comando do `B-SAN3-04a`).

## DoD · Rastreabilidade

Escopo respeitado · bateria verde · contrato do envelope e fila provados · KPI no PR · junta · §C5 · porteiro. ID `B-O6R-11`
· PR # · merge commit · approved head · junta · status.

## Emenda do orquestrador — decisões sobre o plano (2026-09-18)

Plano do bloco: `agent-orchestration/omega/planos/B-O6R-11-plano.md` (`planejador-mestre`, Fable, 2ª instância; a 1ª caiu no
começo). Decisões, para a ata:

- **(a) Sem crítico.** O bloco não é de invariante financeiro (§C7.1-ter(b)); o plano segue direto para o desenvolvedor, como o
  `B-SAN3-01`.
- **(b) Dono da `P-MOBILE-CHECKLIST-CREATE-RUN-MORTO` (P2 do §6):** fila pós-gate. É código morto sem chamador; o próximo
  bloco que tocar `mobile/flutter_app/lib/features/checklists/data/**` o apaga, com teste que prove a ausência de chamador.
- **(c) As 7 pendências do §6 são registradas pelo desenvolvedor, no PR deste bloco,** com o texto, a evidência e os donos do
  §6 (a P3 com dono `B-O6R-07c` provisório, a ratificar pela junta), na seção "Pendências abertas por `B-O6R-11`".
- **(d) Dívidas do #386: não.** Foram pagas pelo `B-SAN3-01` (#387), o primeiro PR de execução a mergear.
- **(e) Ordem dos merges.** Este bloco mergeia depois do #387 e do `B-SAN3-04a`. Antes da junta o ramo é rebaseado na `main`, e
  os números de KPI são reexecutados (§C3.3), nunca somados.
- **(f) Composição da junta:** a proposta do §14 fica como insumo; o orquestrador a fixa no briefing depois de medir a
  competência que os achados exigem (contrato mobile B-108 e fila offline).
