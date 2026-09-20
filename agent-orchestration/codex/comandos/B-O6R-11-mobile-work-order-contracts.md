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

## Emenda 2 do orquestrador — as 9 divergências do desenvolvedor (2026-09-18)

Relatório: `agent-orchestration/omega/juntas/votos/B-O6R-11/00-dev.md` (1ª instância caiu por 429 depois do vermelho-controle; a
2ª mediu o trabalho vivo e terminou). Decisões:

- **(g) Aceitas: 1, 2, 3, 6, 7, 8 e 9.** Medem mais que o plano (17 vermelhos em 21; M3 derruba 3 casos), seguem o plano
  (caminhos de teste, 3 arquivos de código, head-base de mesma árvore `mobile/`) ou são mais rígidas que ele (guard T4 com
  `\.enqueue\b`, comentário ignorado e piso de 22).
- **(h) Divergência 4 — severidades das pendências do §6:** `P-MOBILE-MATERIAL-E-FILA-NAO-ATOMICOS` (P4) **ALTA** — um crash
  entre as duas transações deixa material local sem ação na fila, e a ação nunca chega ao backend: perda de dado, a 1ª prioridade
  do gate; `P-MOBILE-EXPENSE-ENVELOPE` (P1), `P-WO-ASSIGN-OPERATOR-ID-TORTO` (P3, backend vivo), `P-MOBILE-STATUS-ACCEPTED-LOSSY`
  (P6) e `P-MOBILE-FILA-RMW-STORE` (P7) **MÉDIA**; `P-MOBILE-APPROVAL-REQUEST-REST-404` (P5) **BAIXA**; a P2 segue BAIXA.
- **(i) Divergência 5 NÃO aceita — vira requisito deste bloco.** O T1 caso 3 se chama "o tenant vem do parâmetro da sessão, nunca
  do corpo", mas `_workOrderFromRemoteJson` faz `corpo ?? sessão`: quando o corpo traz tenant, o corpo vence. O teste promete mais
  do que prova, e a regra da casa é que o tenant se resolve pelo ator autenticado, nunca por conteúdo de payload (§2.8 do
  `CLAUDE.md`). Requisito: quando o chamador passa o tenant da sessão, **ele vence** qualquer tenant que venha no corpo; o T1 ganha
  o caso "corpo traz tenant diferente → vence a sessão", vermelho no código atual do bloco e verde depois. Quem achou foi a 2ª
  instância do desenvolvedor; quem conserta é outra instância (§C7.4-bis).

## Emenda 3 do orquestrador — as 4 divergências da 3ª instância e a composição da junta (2026-09-18)

A emenda 2 (i) nomeou três métodos: é a correção por instância que a casa já aprendeu a evitar. A propriedade é "em toda
leitura de resposta da OS neste arquivo, o tenant da sessão vence o do corpo". Decisões:

- **(j) I3-1 — a lista entra.** `fetchWorkOrders` segue a mesma propriedade, com caso no T1 (vermelho no head `cf075a82`,
  verde depois). Sem efeito vivo hoje (o DTO do backend não emite tenant), mas é o mesmo arquivo e a mesma regra.
- **(k) I3-2 — fora da fronteira, pendência com dono.** `checklist_remote_api.dart:397` (`_templateFromRemoteJson`, o corpo vence
  com o chamador passando o tenant) → `P-MOBILE-CHECKLIST-TENANT-DO-CORPO`, MÉDIA, fila pós-gate (nenhum bloco SAN3 tem
  `features/checklists/data/**`); `expense_remote_api.dart:216` (`_itemFromJson`, tenant só do corpo) → emenda da
  `P-MOBILE-EXPENSE-ENVELOPE`, dono `B-O6R-03b`.
- **(l) I3-3 — a trilha e o registro com o número atual.** As menções a 885, 21 casos e T1 12 no `status-geral.md`, no
  `log-execucao.md` e na `P-O6R-B11` passam aos números medidos no head final.
- **(m) I3-4 — tenant vazio vence o corpo, e isso fica escrito em teste.** Chamador que passa `''` não tem sessão estabelecida;
  adotar o tenant do corpo seria confiar em payload. O resultado `''` deixa a OS invisível, que é o lado fechado.
- **(n) Composição da junta:** C1 `validador-mestre` (diff × plano, bateria Flutter, KPI e registro; suplente `agente-ci-doutor`);
  C2 `guardiao-fail-closed` (guard T4 por mutação, vocabulário de status exaustivo, tenant da sessão; suplente
  `coordenador-de-acessos`); C3 `jurado-o6r11-contrato-mobile-fila`, criado pela `agente-fabrica` para este bloco (envelope, fila
  offline, B-108, idempotência; suplente `jurado-o6r11-suplente-contrato-mobile-fila`). Unanimidade de 3 (perda de dado).

## Emenda 4 do orquestrador — as 5 divergências da 4ª instância (2026-09-18)

- **(o) Aceitas: I4-1, I4-3 e I4-4.** O caso 3d sobre os quatro leitores segue a propriedade (emenda 3); o teste de encerramento
  proposto na pendência nova fica rotulado como proposta; a trilha e o painel atualizados além das quatro menções evitam registro
  que se contradiz.
- **(p) I4-2 — achado novo, anterior ao bloco:** o backend emite `tenant_id` na resposta de `GET /mobile/checklists/available`
  (`src/modules/checklists/checklist.dto.ts:70`, `toMobileChecklistTemplateDto`, desde `39412b0c`, 2026-06-15), contra a leitura
  da casa do §2.8 (o DTO da OS não emite; o `buildChecklistSnapshot` o remove citando o §2.8). Nasce
  `P-CHECKLIST-DTO-EMITE-TENANT-ID`, MÉDIA, dono `B-SAN3-22` (tem `src/modules/checklists/**` no escopo). A
  `P-MOBILE-CHECKLIST-TENANT-DO-CORPO` deixa de ser latente: o corpo traz o campo hoje.
- **(q) I4-5 — os dois jurados novos ficam neste PR** (emenda 3 (n)); a aposentadoria deles vem no PR seguinte ao merge
  (`D-APOSENTADORIA-ELENCO-EFEMERO`), e o sepultamento no obituário junto da ata.

## Emenda 5 do orquestrador — as divergências da correção do ciclo 2 (2026-09-20)

Relatório: `.../scratchpad/DEV-B-O6R-11-ciclo2.md` (2 instâncias; a 1ª caiu por 429 depois de 3 commits, medidos e continuados pela
2ª). Decisões:

- **(r) D1 aceita, e é a forma certa.** O `docs/revisoes/SAN3/PLANO_SAN3.md` está fora do escopo deste bloco: desfazer por edição
  inversa a alteração que a 1ª instância fizera nele, guardando o patch, e **reescrever os textos das pendências para que nenhuma
  afirme uma fronteira que não existe** é o caminho do §5.4 do plano. Consequência registrada: `P-MOBILE-FILA-RMW-STORE` fica em
  fila pós-gate (nenhum bloco do §5 tem `sync_action_store.dart`, `drift_sync_action_store.dart` nem `sync_queue_repository.dart`);
  as demais ficam com o dono do arquivo principal e a nota "fronteira a ampliar no comando do dono"; a
  `P-CI-FLUTTER-SEM-PIN` fica no `B-SAN3-10` com a ressalva de que a autorização escrita lá é só para o job e2e. **A ampliação das
  fronteiras do §5 é ato de registro do `B-SAN3-10`**, na recontagem do gate — não deste bloco.
- **(s) D2, D3, D4 e D5 aceitas.** São 15 mutações (o texto do plano dizia 14 e a tabela listava 15), e as 15 ficam vermelhas; o
  espelho de agentes está consistente com os corpos que existem hoje (os jurados do ciclo 2 são da `agente-fabrica`, não do dev — e
  a fábrica os nomeou `jurado-o6r11-c2-fail-closed-dart` e `jurado-o6r11-c2-suplente-fail-closed-dart`, não
  `jurado-o6r11-fail-closed-dart-flutter` como o §8 do plano antecipava: vale o nome real, e a junta o confere por nome);
  `P-MOBILE-TELEMETRIA-STOP-NAO-AGUARDA-TICK` nasce como pré-existente com prova executada e dono fila pós-gate; a normalização de
  fim de linha do `pendencias.md` de volta a LF deixa o diff do commit com o conteúdo, não com o arquivo inteiro.
