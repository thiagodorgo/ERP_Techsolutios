# B-GUI-D1 — os dados da OS que faltam chegam ao app (servidor + app)

## Papel desta execução

DEV `dev-guid1-cl`, Claude Opus 5.5 (subagente da sessão), nível menor declarado, identidade nova. Não planeja, não
critica e não vota. Entrega o rascunho do PR para a junta completa.

## Fontes, nesta ordem

1. A emenda 1.1 do plano (`plano-B-GUI-D1-emenda1.1.md`, `plano-guid1-e1-cl`), que prevalece: o filtro de placa no
   modelo e na cor (A1, D3c, MD11, MD12), o `copyWith` e o `props` com os 7 campos (A4, D4d, D4e, MD10, MD13), as 8
   âncoras de versão, a D7a com as 2 grafias, `if (from < 19)` e o registro `C-GUI-PLACA-NA-LISTA`.
2. A emenda 1 (`plano-B-GUI-D1-emenda1.md`): o contrato fechado, o modelo de ameaça, D1 a D7 e MD1 a MD9.
3. O §5.4 de `plano-APP-GUINCHO-emenda1.md`.
4. A crítica `crit-guid1-e1-cl` (SEGUE COM EMENDA), absorvida pela emenda 1.1.

O diário do dev, item a item, está em `docs/revisoes/GUI/B-GUI-D1-dev.md`.

## Propriedade

O item da lista de OS (`GET /work-orders`) ganha, ADITIVOS e sempre presentes, `destinationAddress`,
`destinationLatitude`, `destinationLongitude` e `attendedVehicle = { plateMasked, model, color } | null`. Do
`serviceDetails` saem só 3 chaves (lista fechada). `plateMasked` é a referência do check-in sem os 2 finais e existe se e
só se `checkinMode = "plate"`. O fim da placa desta OS nunca chega pelo modelo nem pela cor. O app lê os campos com
tolerância (ausente ou tipo errado vira `null` só no campo), guarda-os no banco do aparelho (versão 19, só
`ALTER TABLE ADD COLUMN` guardado por coluna) e os preserva em toda gravação local (`copyWith`). A fila não enviada fica
intacta na subida.

## Escopo

O PERMITIDO da emenda 1, §6, com as 3 mudanças da emenda 1.1, §6. Servidor: `work-order.dto.ts` (só
`toWorkOrderListDto` e o import) e o novo `work-order.attended-vehicle.ts`; `tests/bguid1-dados-da-os.test.ts`;
`API_CONTRACTS.md` (a linha de `GET /work-orders`). App: `work_order_remote_api.dart` (o leitor e auxiliares),
`work_order_models.dart`, `app_database.dart`, `drift_work_order_local_store.dart`; os 2 testes novos e as âncoras de
versão. Registro: `docs/revisoes/GUI/B-GUI-D1-dev.md`, este comando, `controle/decisoes.md` (só o acréscimo de
`C-GUI-PLACA-NA-LISTA`) e `controle/pendencias.md` + o índice gerado (só as 3 pendências novas). PROIBIDO:
`prisma/**`, `work-order.checkin.ts`, `work-order.service/controller/routes.ts`, `mobile-work-order-sync.ts`,
`core/sync/**`, `work_order_repository.dart`, toda tela, `frontend/**`, `Kpis/**`, `.github/**`, lockfiles, `pubspec.*`.

## Bateria

Servidor: `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/bguid1-dados-da-os.test.ts`; as regressões
`san3-26-checkin-conferencia`, `work-order-sla`, `work-orders-list-coordinates`, `work-order-checklist-snapshot-dto` e
`san3-13-wo-list-scope`, sem edição; `npm run check`, `lint`, `test` e `build`. App (`mobile/flutter_app`):
`flutter pub get`, `dart format --output=none --set-exit-if-changed lib test`, `flutter analyze`, os 2 testes do bloco,
`test/core/local_db/` inteira e `b115_checkin_flow_test.dart`, e `flutter test --reporter compact`. `git diff --check`.
Cada mutação literal (MD-D1, MD1 a MD13, MD2b, MD6b) é aplicada uma por vez, fica vermelha e é revertida, com o restauro
provado.

## Nível de revisão

Junta completa: o bloco expõe dado novo na lista, ao lado da prova de presença do check-in (segurança), e mexe no banco
do aparelho, onde mora a fila ainda não enviada (perda de dado sem volta). As 3 cadeiras sugeridas estão no §6 da emenda
1.1.

## Conserto

Conserto da J-597 (17/11): D2 residencial (MYA/MYB), fim da placa por outro campo (MYD), comentários de fixture, registro C1-03/C3-N1, merge da main 89cf79fe.

Emenda 1.2 (17/11): D7a com `ui/checkin_confirm_dialog.dart` no lugar de `ui/work_order_detail_screen.dart` e D7b pelo fluxo de chegada do FID1 nas 3 aparências; MD6 ancora em `_maskedHint()` de `checkin_confirm_dialog.dart`.
