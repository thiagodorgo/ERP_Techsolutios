# B-GUI-D1 — registro do dev (`dev-guid1-cl`, Claude Opus 5.5, nível menor declarado)

Lei: `plano-APP-GUINCHO-emenda1.md` §5.4 + `plano-B-GUI-D1-emenda1.md` + `plano-B-GUI-D1-emenda1.1.md` (prevalece).
Crítica: `crit-guid1-e1-cl` (SEGUE COM EMENDA), absorvida pela emenda 1.1. Base: `origin/main` `77f0df07`, depois
integrada com a `main` do momento (ver "Integração"). Sem cruzamento: plano, crítica e dev são Claude (o Codex estava sem
limite; §C7 11(2)). A pré-revisão e a junta devem ser de outra casa quando houver crédito.

## F0 — a caracterização e o vermelho-antes (na base `77f0df07`)

- Regressões do servidor na base: `san3-26-checkin-conferencia` 25/25, `work-order-sla` 7/7,
  `work-orders-list-coordinates` 2/2, `work-order-checklist-snapshot-dto` 5/5, `san3-13-wo-list-scope` 10/10.
- App na base: `test/core/local_db/` + `b115_checkin_flow_test.dart` → `+35: All tests passed!`.
- Forma de hoje: o item da lista tem **18** chaves (as 17 da emenda 1 + `serviceKind`, do B-SAN3-15b). O teste F0 as
  caracteriza com valores: nasce verde e fica verde (a mudança é aditiva).
- `tests/bguid1-dados-da-os.test.ts` na base → `# tests 8 # pass 2 # fail 6`: F0 e D1b verdes (como o plano diz); D1
  (o item não tem as 4 chaves), D2/D3/D3b/D3c (`attendedVehicle` não existe), fuzz (o módulo não existe) vermelhos.
- Os 2 arquivos do app na base → o do leitor/store não compila (`No named parameter with the name
  'destinationAddress'`); D5/D5b/D5c `Expected: <19> Actual: <18>`; D6 `Expected: contains 'destination_address:TEXT'`.

## O que entrou

- **Servidor:** `work-order.attended-vehicle.ts` (novo, a forma do §1.3 da emenda 1.1) e as 4 linhas `// B-GUI-D1` em
  `toWorkOrderListDto`, mais o import. `work-order.checkin.ts` intocado.
- **Contrato:** `API_CONTRACTS.md`, a linha de `GET /work-orders`: `work_order_list_destination_vehicle@2026-11.b-gui-d1`.
- **App:** o leitor tolerante (`_textOrNull`, `_doubleOrNull`, `_mapOrNull`), os 7 campos no modelo, no `copyWith`
  (uma linha por campo) e no `props`, o INSERT e o `_workOrderFromRow` do store Drift, `schemaVersion => 19`, as 7
  colunas em `_kWorkOrders`, `_kWorkOrdersV19Columns` e o degrau `if (from < 19)` guardado por coluna. A coleta passa a
  preencher `latitude/longitude` a partir de `serviceLatitude/serviceLongitude`.
- **Âncoras de versão 18 → 19:** as 8 da emenda 1.1 §3.2, **mais 1 que ficou vermelha** e entra pela mesma regra:
  `test/core/local_db/brdvcomp_c1_drift15_migration_test.dart:222-225` (o `expect` quebrado em linhas: `18,` e o
  `reason` "(18)").

## Leituras do dev, declaradas (§A6)

1. **`// dart format off/on` em 2 lugares** (`work_order_remote_api.dart`, a âncora MD3; `work_order_models.dart`, as 7
   linhas do `copyWith`). O formatador quebrava as duas linhas longas, e a emenda exige a forma literal ("uma linha por
   campo"; "mutação literal, trocar exige emenda"). Há precedente em `lib/core/appearance/app_appearance_providers.dart`.
2. **O fuzz mata a MD11.** O §1.4 da emenda 1.1 diz que o fuzz fica em 0 sob cada mutação sozinha; as minhas 5 decorações
   incluem 2 que o check-in não aceita (`ABC.1D/23` e U+200B), e o fuzz vaza 4 000 textos sob a MD11. O fuzz continua
   sendo propriedade; quem mata a MD11 e a MD12 são os casos nomeados.
3. **A contagem do plano:** o §6 da emenda 1.1 diz "18 casos" e "São 18" mutações, mas as listas têm 17 testes e 16
   mutações. Foram feitos os 17 (mais o F0 e o fuzz) e as 16.
4. **D6 também cobre o banco vindo da 1 COM uma `work_orders` da era 18** (o caso que só `if (from < 19)` completa).
5. **`P-APP-GUINCHO-VEICULO-ATENDIDO` não foi tocada:** a emenda 1 dizia que ela "fecha com o merge", e a emenda 1.1 §6
   restringe `pendencias.md` às 3 novas. O fechamento fica para o registro pós-merge.

## Testes do bloco

Servidor (`tests/bguid1-dados-da-os.test.ts`, 8): F0, D1, D1b, D2, D3 (15 casos de placa, inclusive `ABC2323` por
posição), D3b, D3c (8 casos, conferência por dobra campo a campo), D3c-fuzz (N = 5 000, semente fixa).
App (19): `bguid1_dados_da_os_test.dart` (D4 ×3, D4b, D4c, D4d, D4e ×7, D7a, D7b) e `bguid1_subida_19_test.dart`
(D5, D5b, D5c, D6). Todos pelo app real onde o plano pede (`createApp`; Drift sobre `AppDatabase.openInMemory()`;
`_LegacyDb` em arquivo).

## Mutações (16), uma a uma, âncora `grep -cF` = 1, restauro provado (`git checkout --` + `git diff --quiet`)

| Mutação | Arquivo | Vermelho |
|---|---|---|
| MD-D1 | `work-order.dto.ts` | D1 |
| MD1 | `work-order.attended-vehicle.ts` | D1, D2 (`/SENHA-ZQ9/`), D3b, D3c, fuzz |
| MD2 | idem | D1, D3 (`"ABC1234": plateMasked`), D3b, D3c, fuzz |
| MD2b | idem | D3 (`"abc-1d23"`, `SEM PLACA`), D3c |
| MD9 | idem | D1, D3b, D3c |
| MD11 | idem | D3c (`Onix ABC1D2​3`), fuzz |
| MD12 | idem | D3c (`SEM PLACA` + `Gol ABC1D23`) |
| MD3 | `work_order_remote_api.dart` | D4 (servidor antigo, tipo errado), D4b |
| MD4 | `app_database.dart` | D5, D5b, D5c |
| MD5 | idem | D4b, D4c, D4d, D6 |
| MD7 | idem | D5b, D5c, D6 (duplicate column) |
| MD8 | `drift_work_order_local_store.dart` | D4b, D4c, D4d |
| MD10 | `work_order_models.dart` (`copyWith`) | D4b, D4d |
| MD13 | `work_order_models.dart` (`props`) | D4e |
| MD6 | `ui/work_order_detail_screen.dart` (PROIBIDO; temporária) | D7b |
| MD6b | `lib/shared/ui/_mutante_d7.dart` (criado e apagado) | D7a |

## Bateria

- Servidor: o arquivo do bloco 8/8; as 5 regressões sem edição, verdes; `npm run check`, `lint` e `build` → 0.
- `npm test` local: `# tests 5120 # pass 4901 # fail 20 # cancelled 1 # skipped 198`. Os 21 vermelhos estão em 8
  arquivos de ambiente (o worktree não tem `.env` nem Redis): `ass-05-vault-routes`, `core-saas-role-authority`,
  `domain-events`, `job-queue`, `job-worker-bootstrap`, `traccar-ingest-listener`, `users-seg-desativado-sse` e
  `worker-heartbeat`. Os 8 isolados dão o MESMO resultado com o `work-order.dto.ts` da base (`# tests 66 # pass 50
  # fail 15 # cancelled 1`, `diff` dos `not ok` vazio). O juiz da suíte inteira é o CI.
- App: `dart format` (só `test/features/bsan313_minhas_os_escopo_test.dart`, fora do bloco: formatador local 3.11.4 ×
  CI), `flutter analyze` sem problemas, os 2 arquivos do bloco `+19`, `test/core/local_db/` + b115 + bsan326 ×2 + b125
  `+75`, a suíte inteira `+1716 ~216: All other tests passed!`.
- `git diff --check` limpo. O espelho de agentes não muda.

## Nota para o B-GUI-FID1 (emenda 1.1, §4)

`_workOrderFromRemoteJson` também lê o detalhe (`fetchWorkOrder`) e as respostas de `PATCH` (`updateWorkOrderStatus`,
`assignWorkOrder`), que não trazem `attendedVehicle`. Hoje nenhum código de `lib/` grava esse resultado. Um bloco que
passar a gravá-lo no store **não pode apagar o veículo**: ou a resposta passa a trazer `attendedVehicle`, ou quem grava
faz `copyWith` sobre a OS local. Quando o FID1 extrair o diálogo de chegada, ele troca a lista da D7a no mesmo PR.

## Registro

- `controle/decisoes.md`: `C-GUI-PLACA-NA-LISTA` (só acrescentado; a junta completa decide).
- `controle/pendencias.md` + o índice gerado: `P-OS-LISTA-SEM-CIDADE`, `P-OS-REBOQUE-SEM-MODELO-E-COR`,
  `P-OS-PLACA-NO-TEXTO-LIVRE`. O apenso do A3 (`P-WO-LEITURAS-TENANT-WIDE-TECNICO`) é do orquestrador.
