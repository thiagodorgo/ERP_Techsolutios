# B-SAN3-26 — diário do dev (o "No local" confere a placa, nas duas portas; item 53 do portão)

- **Autor:** `dev-san326-cl`, Claude Opus 5.5 (subagente da sessão), **dev, identidade nova**. Cobre o Codex por exceção
  declarada: o Codex 1 está sem cota semanal até 16/11 e o Codex 2 está ocupado (§C7.11(6)). Não planejei nem critiquei
  nada deste bloco.
- **Plano:** `plano-B-SAN3-26-v2.md` (`replano-B-SAN3-26-api`, Claude Opus 5.5 pela API). **Crítica:** `crit-26-r2-cl`
  (Claude Opus 5.5, subagente), APROVADO COM AJUSTES; os 8 ajustes C26R2-01 a 08 entram como requisito pela emenda E-01
  a E-08 abaixo.
- **Verificador previsto:** pré-revisão e conferência na outra casa (Codex), pelo §C7.11(6), quando houver crédito; sem
  crédito, identidade nova declarada (§C7.11(2)).
- **Decisões do dono aplicadas:** `D-PORTAO-9-RECOMENDACOES-1011` (P1 só `residencial` isento sem placa; P2 a base marca
  "No local" pelo console sem os dígitos, "registrada pela base") e `D-PORTAO-5-RECOMENDACOES-1111` (P3 reaberta,
  alternativa B: sem tela nova; o guincheiro de OS sem placa vê "peça à base para cadastrar a placa ou registrar a
  chegada"; a base registra pelo console; a criação ganha o campo de placa para reboque e outro; a edição da placa vai
  para outro bloco).
- **Terreno:** worktree `C:/Users/thiag/w-san326`, ramo `fix/checkin-confere-placa` a partir de `origin/main`
  `d0da291e`; `npm ci` próprio (sem junction, ec=0), `prisma generate`, `flutter pub get` (ec=0). Sem banco: nenhum teste
  `-db` é deste bloco, e não subi Postgres.
- **Objeto medido × objeto do plano (§A7):** o plano mediu em `d5ec1696`. `git diff --stat d5ec1696 d0da291e -- src tests
  frontend prisma` = vazio; em `mobile/` só a telemetria (`telemetry_capture_service.dart`, `telemetry_test.dart`), fora
  deste bloco. Os `arquivo:linha` do plano valem com deslocamento de uma linha em `work-order.service.ts`.
- Hora de início: 2026-11-11 02:25 SP, por `date`.

## F0.1 Vermelho-controle (testes escritos antes do código, rodados em `d0da291e`)

Comando: `CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent node --test --import tsx tests/san3-26-checkin-<arquivo>.test.ts`.

| Arquivo | Resultado na base | Motivo, por teste |
|---|---|---|
| `san3-26-checkin-conferencia.test.ts` | 21 testes, **19 fail**, 2 pass | A1, A1b, A3, A5, A9b: `expected 422, actual 200`; A4b, A9a, A11: `expected 'conflict', actual 'accepted'`; A5b, A9c: `Missing expected rejection`; A6, A8, A9b-plataforma: `metadata.checkin` ausente; A7: `expected 403, actual 200`; A8b: `conflict.local.payload.checkin_confirmation` presente (o eco do C26R2-08); A12: a mensagem gravada é a do cliente ("Registrado pela base"); L1: as chaves `checkinMode`/`checkinPlateTail` não existem; L1b: `describeCheckinForList is not a function`; contrato: o módulo `work-order.checkin.ts` não existe |
| | | **Passam na base, como o plano previu:** A2 ("passa por acaso; o controle real é o A3") e A4 ("fica vermelho quando a A4b passa": o controle é a mutação do repasse, F2) |
| `san3-26-checkin-ponto-unico.guard.test.ts` | 5 testes, **5 fail** | G1b e G1b′: `Missing expected rejection` (o InMemory grava `on_site` sem veredito); G1c: `Missing expected rejection` (o stub Prisma é chamado); G1-controle e A9d: o módulo novo não existe |
| `san3-26-checkin-normalizacao.test.ts` | 6 testes, **6 fail** | o módulo `work-order.checkin.ts` não existe (o motivo declarado do A10: "as funções não existem hoje") |

App (Flutter): os testes novos usam a API nova do modelo (`checkinMode`, `checkinPlateTail`, `redoCheckin`) e não
compilam na base; o vermelho-controle deles é por mutação no objeto final (F3). O defeito de hoje está provado pelo
`b115_checkin_flow_test.dart` (teste 5: digita o fim do código `OS-1042`, "42", e a chegada é aceita).

## F0.2 O defeito de hoje, no app (base `d0da291e`)

`flutter test test/features/work_orders/b115_checkin_flow_test.dart --reporter expanded` → `+11: All tests passed!`,
inclusive "5. Plate dialog confirms when input matches last 2 chars AND gpsOk=true": o app aceita "42", o fim do
código da OS, como se fosse o fim da placa.

## F0.3 Emenda do plano (D-EMENDA-ANTES-DO-CODIGO): como cada ajuste da crítica r2 entra, ANTES do código

Os 8 ajustes são requisito por ordem do orquestrador. O "como" é meu, e cada escolha que o plano e o dono não fazem está
marcada **LEITURA DECLARADA** (§A6). A revisão desta emenda cabe à pré-revisão do bloco (outra casa), que a lê antes do
código: o orquestrador mandou tratar os ajustes como requisito do dev, sem nova rodada de crítica.

- **E-01 (C26R2-01, o pull apaga o cartão).** `_upsertRemoteOrders` (`work_order_repository.dart`) passa a preservar,
  além da OS `pending`, a OS que tem ação de chegada recusada em `conflict` (código ∈ `kCheckinRefusalCodes`) à espera do
  "Confirmar a placa de novo". O cartão fica até o toque; o toque aposenta as ações (o `redoCheckin` do plano) e o pull
  seguinte volta a atualizar a OS. Como as ações aposentadas ficam `synced`, a purga do B-SAN3-13 volta a tirar a OS
  depois de fechada. A **M5 ganha um pull** entre a recusa e o `redoCheckin` e afirma que o cartão continua.
  Âncora nova (M5(iii)): `if (existing != null && checkinRedoPending.contains(existing.localId)) continue;` → apagar a
  linha deixa a M5 vermelha.
- **E-02 (C26R2-02, a tela Sincronização).** O escopo cresce para `lib/shared/ui/sync_screen.dart` (a crítica mostra
  que a 2ª superfície existe). As ações afetadas por uma chegada recusada — a própria chegada e as ações de status
  posteriores da mesma OS — não mostram "Minha versão" (reenviaria a recusa determinística) nem "Versão do gestor"
  (aposentaria só uma, sem reverter a OS): mostram o motivo e **um** botão, "Confirmar a placa de novo"
  (`Key('conflict-checkin-redo-<id>')`), que roda o mesmo `redoCheckin` da OS. O cálculo de quais ações são afetadas é
  uma função pura (`checkinRedoAffectedActionIds`) no serviço de resolução, a mesma que o cartão da OS usa.
  `sync_resolution_side_effects.dart` não muda. Mutação: `final checkinRedoIds = checkinRedoAffectedActionIds(conflicts);`
  → `final checkinRedoIds = <String>{};` deixa o teste M7 vermelho.
- **E-03 (C26R2-03, o que não é placa vira placa).** A referência passa a ser **só a placa brasileira** (antiga LLL NNNN
  e Mercosul LLL N L NN), procurada **como palavra** (sem letra ou dígito colado antes ou depois), com hífen, ponto ou
  espaço opcional entre letras e números, e **exatamente uma** no texto. Nenhuma, ou duas diferentes ("Uno 2010
  ABC1234"), = sem referência (fail-closed: a base registra). Sai o ramo "5 a 8 alfanuméricos" do v2, que transformava
  "SEM PLACA", "ZERO KM" e "A DEFINIR" em placa. **LEITURA DECLARADA:** placa estrangeira (ex.: "AB 123 CD") passa a
  contar como sem referência — a linha do A10 do plano que a aceitava muda de desfecho, e o caso vira a pendência
  `P-CHECKIN-PLACA-ESTRANGEIRA` (BAIXA) para o dono decidir. **Residual declarado:** "GOL 2010" tem a forma exata de uma
  placa antiga e é indistinguível dela. O A10 ganha os casos da crítica (marcadores, modelo e ano antes, ambíguo,
  repetido). As mutações (ii) e (iii) do C26-07 apontavam para linhas que deixam de existir; as novas, literais:
  (ii) `if (candidates.size !== 1) return null;` → `if (candidates.size === 0) return null;` (o ambíguo vira placa);
  (iii) `const BR_PLATE_PATTERN = /(?<![A-Z0-9])([A-Z]{3})[\s.-]{0,2}([0-9][A-Z0-9][0-9]{2})(?![A-Z0-9])/g;` →
  `const BR_PLATE_PATTERN = /([A-Z]{3})[\s.-]{0,2}([0-9][A-Z0-9][0-9]{2})/g;` ("Onix 2019 ABC1D23" vira ambíguo);
  (iv) `if (candidates.size !== 1) return null;` → `if (candidates.size !== 1) return upper.replace(/[^A-Z0-9]/g, "") || null;`
  (a volta do ramo de fallback: os marcadores viram placa). A (i) do plano fica como está.
- **E-04 (C26R2-04, "toda OS nova").** A F5-B mostra o campo "Placa do veículo" para **todo tipo menos `residencial`**:
  reboque, outro, "Sem tipo definido" e OS **sem catálogo** (o socorro mantém o seu cartão). Assim a afirmação da
  recomendação B que o dono aceitou passa a ser verdade para a criação pelo console. **LEITURA DECLARADA:** o dono disse
  "para reboque e outro"; estender a "sem tipo" e "sem catálogo" é o que torna verdadeira a premissa que ele aceitou
  ("põe placa em toda OS nova"); ele desfaz em uma linha. Residual nomeado, que fica na `P-CONSOLE-EDITA-PLACA-DA-OS`:
  OS de orçamento, da semente e criada pelo app nascem sem placa e só andam pela base até o bloco de edição.
  Mutação: `return serviceType !== "residencial";` → `return serviceType === "socorro";`.
- **E-05 (C26R2-05, offline).** Declarado como risco no contrato e no PR, e pendência nova `P-CHECKIN-SEM-PLACA-OFFLINE`
  (MÉDIA): com a OS sem placa e o guincheiro sem dados, ele fica em "A caminho" até um pull trazer o `on_site` que a base
  registrou; é uma exceção ao offline-first (§6), escolhida pela decisão B do dono, que o dono pode rever.
- **E-06 (C26R2-06, mutações sem âncora).** Âncoras literais, cada uma com `grep -cF` = 1 provado no fechamento (F4):
  - M1(i): `String? get _expected => widget.wo.checkinPlateTail;` → `String? get _expected => widget.wo.code.substring(widget.wo.code.length - 2);`
  - M1(ii) (o `_prefix` sai do código no N-03, então a mutação do plano não compilaria): `final hint = _maskedHint();` → `final hint = widget.wo.code;`
  - M2(i): `if (newStatus == WorkOrderStatus.arrived && lastDigits != null) 'checkin_confirmation': {'last_digits': lastDigits},` → apagar a linha
  - M2(ii): `if (checkinConfirmation != null) payload['checkin_confirmation'] = checkinConfirmation;` → apagar a linha
  - M5(ii): `if (action.createdAt.isBefore(checkinAction.createdAt)) continue;` → `if (action.clientActionId != checkinAction.clientActionId) continue;`
  - M6: `final checkinRedo = conflicts.any(isCheckinRefusalAction);` → `final checkinRedo = false;`
  - L1(ii): `let pending = typeInfoByCatalog.get(item.serviceCatalogId);` → `let pending: Promise<ServiceCatalogTypeInfo> | undefined = undefined;`
  - A8: `...(checkin ? { checkin: checkin.mode } : {}),` → `...(checkin ? { checkin: checkin.mode, confirmation: body.checkin_confirmation } : {}),`
  - M4 (o v15 já guarda a coluna por `PRAGMA table_info`, e a v16 segue esse padrão; com a guarda de coluna, tirar o
    `from >= 2` não falha mais, então a mutação do plano ficaria verde): `if (!hasCheckinMode) {` → `if (true) {`, com o
    caso novo do M4 "banco v15 que já tem as colunas" (o app novo aberto, devolvido ao antigo e reaberto).
- **E-07 (C26R2-07, field_dispatcher × `RBAC_MATRIX.md:118`).** O conflito fica registrado em `controle/decisoes.md`
  (§A2), sem consolidar em silêncio: a lista "base" da matriz (a da correção de km, l.118) exclui o `field_dispatcher`, e
  o bloco o põe na base do check-in pela P2 do dono ("despachante"). O comentário de `CHECKIN_OFFICE_ROLES` cita a l.118
  e a l.57 (o `platform_admin` não é aprovador padrão de fluxo da organização), e as duas leituras ficam declaradas para o
  dono desfazer em uma linha.
- **E-08 (C26R2-08, eco dos dígitos).** O `checkin_confirmation` sai do `conflict.local` de **todo** conflito da fila,
  na função comum `sanitizeActionForConflict`, não só no ramo novo. O A8b prova dois ramos (transição inválida e reenvio
  com outro corpo). Mutação: `payload: normalizePayload(withoutCheckinConfirmation(action.payload)),` →
  `payload: normalizePayload(action.payload),`.

Desvios de forma (não mudam comportamento):
- ramo `fix/checkin-confere-placa` (o do orquestrador) e commits `fix(checkin): …`, no lugar de
  `fix/mobile-checkin-confere-placa` e dos títulos do §6 do plano;
- o conflito do apêndice A (`C-B-SAN3-26-P3-PREMISSA`) é registrado por mim em `controle/decisoes.md` nesta F0, antes de
  qualquer fatia de código: o §4 do plano põe esse registro no PERMITIDO, e o §6 trava o código nele.

## F0.4 Âncoras da tabela de abertura

Gravadas depois da implementação, em F4 (o plano manda medir no objeto final).

## F1 — o servidor (commit `6d9bb780`)

- `src/modules/work-orders/work-order.checkin.ts` (novo): as duas listas de papéis, a isenção literal, a normalização
  (E-03), `verifyCheckin` (o único emissor do veredito, com marca de tipo e registro num `WeakSet`), a guarda dos
  repositórios, a mensagem da linha do tempo, a guarda da placa no `update` e o modo da lista.
- `work-order.types.ts`: `ChangeWorkOrderStatusInput` vira união (`on_site` exige `checkin: CheckinVerdict`),
  `CreateWorkOrderInput.status` exclui `on_site` (só no tipo), e `CheckinEntry`.
- `work-order.checkin.typecheck.ts` (novo, só tipos): 3 `@ts-expect-error` + um controle positivo.
- Os dois repositórios chamam `assertCheckinVerdictForStatus(input)` na 1ª linha do `changeStatus`.
- `work-order.service.ts`: o veredito no `changeStatus` (4º parâmetro `options.entry`), a mensagem do servidor, o
  `metadata.checkin`, a guarda da placa no `update`, e `describeCheckinForList` (memória por catálogo, e só para a OS
  sem placa).
- `work-order.controller.ts`: a rota de status passa `entry: "http_status_route"`; a lista passa o mapa do modo.
- `work-order.dto.ts`: `checkinMode` e `checkinPlateTail` na lista (aditivas).
- `work-order.repository.ts`: a OS de remoção da autoridade nasce com `serviceDetails.plate` (a placa da solicitação).
- Desvio de forma: a guarda da placa no `update`, o modo da lista e a OS de remoção, que o §6 do plano põe na F2,
  entraram aqui; a F2 ficou com a fila. Nada muda de comportamento por isso.
- Resultado depois da F1: conferência 16/21 (as 5 que faltavam eram da fila, F2), guard 5/5, normalização 6/6.

## F2 — a fila no servidor e as regressões (commit `cbf62a71`)

- `mobile-work-order-sync.ts`: repassa `checkin_confirmation`, entra como `mobile_sync`, a recusa do check-in sai em
  `conflicts[]` com `next_action: "redo_checkin"` (1ª linha de `actionErrorResult`), e o `conflict.local` de TODO
  conflito sai sem `checkin_confirmation` (E-08).
- Regressões, só fixture (a asserção não muda):
  - `tests/o6r07c-b-scope.test.ts`: a OS do arnês nasce com `service_details.plate`, e a etapa `on_site` do técnico
    manda `checkin_confirmation` (`corpoDeStatus`), nos dois laços que levam a OS a `on_site`;
  - `tests/work-order-checklists-sticky.test.ts`: a OS do teste de ajuste nasce com placa, e o `on_site` interno
    (ator `roles: []`, entrada `internal`) manda os dígitos.
  - `approval-routes`, `san3-13-wo-list-scope` e `work-order-checklist-snapshot-dto`: não mudaram (o `manager` pela rota
    HTTP é base; o `create` não tem guarda em execução; as chaves da lista são aditivas).
- Resultado: conferência 21/21; as 5 regressões do plano 219/219; `authority-removal`, `authority-portal`,
  `authority-release-approval` e `work-order-origin-destination` 49/49.

## F3 — o app (commit `23a6a5c5`)

- Modelo (`CheckinMode`, `checkinMode`, `checkinPlateTail`, `clearArrivedAt`/`clearStartedAt`), leitura da lista
  (camel e snake; ausente ou desconhecido = `unknown`), store drift e banco v16 (guarda `from >= 2 && from < 16`, tabela
  e coluna por `PRAGMA table_info`, no padrão da v15).
- `updateStatus(…, lastDigits:)` grava `checkin_confirmation` só na chegada; o replay o repassa (só `last_digits`).
- `_upsertRemoteOrders`: o pull não sobrescreve a OS com chegada recusada à espera do toque (E-01).
- Serviço de resolução: `kCheckinRefusalCodes`, `isCheckinRefusalAction`, `checkinRedoAffectedActionIds`, o caso
  `redoCheckin` e o método `undoRefusedCheckin` (restaura o status de antes, tira `arrivedAt`, e `startedAt` quando a
  ação aposentada era o "Iniciar atendimento"; aposenta a chegada recusada e as ações de status posteriores da mesma OS
  com `CHECKIN_REDO_REQUIRED`).
- Desvio de forma, com causa medida: o método se chamaria `redoCheckin`, o mesmo nome do valor do enum; o guard
  `P-FILA-AWAIT` (`test/core/sync/bo6r11_guard_fila_await_ast_test.dart`) leu o `WorkOrderConflictResolution.redoCheckin`
  como "tear-off" do método que grava na fila e reprovou. O método virou `undoRefusedCheckin`; o enum fica `redoCheckin`.
- Diálogo por modo (`plate`, `exempt`, `referenceMissing`, `unknown`); no `plate`, os 2 caracteres errados mostram "Os
  dígitos não conferem com a placa do veículo." e o confirmar fica desligado (o teste 6 do b115 segue valendo); a dica é
  a placa mascarada, sem o código (N-03). Textos tocados com acento (§11.3).
- Cartão da OS: chegada recusada mostra o motivo e só "Confirmar a placa de novo"; o toque desfaz a chegada, abre o
  diálogo (o `showDialog` é chamado antes de o repositório recarregar, porque o cartão sai da tela quando a OS deixa de
  estar em conflito) e enfileira uma chegada NOVA.
- Tela Sincronização (E-02): as ações presas a uma chegada recusada mostram só "Confirmar a placa de novo".
- Regressões, só fixture: `b115_checkin_flow_test.dart` (modo `plate`, fim "23"; o digitado vira o fim da placa);
  `app_database_migration_test.dart`, `bfilausuario_drift_user_id_test.dart` e `brdvcomp_c1_drift15_migration_test.dart`
  afirmavam a versão do banco depois de abrir (`15`) e passam a afirmar `16` (o schema atual; a migração que cada um
  prova não muda).
- Fato medido fora do escopo, registrado na `P-MOBILE-STATUS-NOMES`: o pull lê o status pelo nome do enum do app, e
  `on_route`/`on_site` do servidor viram `scheduled`. Os testes do app deste bloco usam os nomes do app na lista falsa,
  como o probe do revisor do plano.

## F5 — a criação no console (commit `85057a10`)

- `WorkOrderForm.tsx`: `showsVehiclePlateField` (todo tipo menos residencial) e `serviceDetailsInputFor` (a placa em
  `service_details.plate` para reboque, outro, sem tipo e sem serviço); cartão "Veículo atendido" com o mesmo `Card` e o
  mesmo `Input` do socorro (padrão do sistema, §4: nenhuma tela nova nem componente novo).
- Smoke: `work-order-form-destination.test.ts` (as duas funções) e `work-order-registry-links.test.tsx` (o SSR da
  criação sem serviço mostra "Veículo atendido" e "Placa do veículo"); os dois estão no `test:smoke`.

## F4 — contrato e registro

- `API_CONTRACTS.md`: a lista, o `PATCH /work-orders/:id`, o `PATCH …/status` e o §3.5.2 novo (o "No local"), e a ação
  da fila.
- `controle/pendencias.md`: fecha a `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS`; abre a `P-DESPACHO-ARRIVED-SEM-CONFERENCIA`,
  a `P-CHECKIN-NUMERO-DE-SERIE`, a `P-CONSOLE-EDITA-PLACA-DA-OS`, a `P-CHECKIN-SEM-PLACA-OFFLINE` (E-05) e a
  `P-CHECKIN-PLACA-ESTRANGEIRA` (E-03); nota medida na `P-MOBILE-STATUS-NOMES`. Índice regenerado pelo gerador.
- `controle/decisoes.md`: os dois conflitos (F0).

## Mutações literais (43, uma por vez)

Roteiro: para cada uma, conta as linhas do arquivo que têm a âncora (tem de dar 1), aplica a troca, roda o teste-dono, exige vermelho e restaura o arquivo byte a byte (conferido). Rodadas em `21373f1b` (o merge da main depois não tocou nenhum dos arquivos mutados; as 43 âncoras foram recontadas no head integrado `b426918b`: 43 com contagem 1). Resultado: **43/43 vermelhas, 43/43 restauradas, 0 âncora não única.** Comandos: backend `node --test --import tsx tests/san3-26-checkin-<arquivo>.test.ts` (com `CORE_SAAS_PERSISTENCE=memory`); tipo `npx tsc -p tsconfig.json --noEmit` (o G1a dá `TS2578 Unused '@ts-expect-error' directive` na linha da guarda certa); app `flutter test --no-pub` do teste do bloco; web `node --test --import tsx` dos 2 smoke do formulário.

Equivalências declaradas (a forma muda, o efeito é o do plano): M1(ii), M2(i), M3(ii), M5(i), M5(iii) e M4 seguem a emenda E-06 (o `dart format` quebra as linhas do plano, e o `_prefix` saiu); a G1a-marca é nova (prova a 2ª diretiva do arquivo de guarda, que a G1a do plano não alcança).

| # | Mutação | Arquivo | Âncora (`grep -cF` = 1) | Troca por | Resultado |
|---|---|---|---|---|---|
| 1 | A11 | `work-order.checkin.ts` | `const officeEntry = entry === "http_status_route" && isCheckinOfficeOnly(actor);` (1) | `const officeEntry = false;` | ec=1, VERMELHA |
| 2 | A9a | `work-order.checkin.ts` | `const officeEntry = entry === "http_status_route" && isCheckinOfficeOnly(actor);` (1) | `const officeEntry = isCheckinOfficeOnly(actor);` | ec=1, VERMELHA |
| 3 | A9b | `work-order.checkin.ts` | `return hasOfficeRole && !hasFieldRole;` (1) | `return hasOfficeRole;` | ec=1, VERMELHA |
| 4 | A9c | `work-order.checkin.ts` | `return hasOfficeRole && !hasFieldRole;` (1) | `return !hasFieldRole;` | ec=1, VERMELHA |
| 5 | A9d | `work-order.checkin.ts` | `  "operator",` (1) | (apagar a linha) | ec=1, VERMELHA |
| 6 | A4 | `mobile-work-order-sync.ts` | `checkin_confirmation: action.payload.checkin_confirmation,` (1) | (apagar a linha) | ec=1, VERMELHA |
| 7 | A4b | `mobile-work-order-sync.ts` | `if (isCheckinRefusal(error)) return checkinConflictResult(action, error);` (1) | (apagar a linha) | ec=1, VERMELHA |
| 8 | A5 | `work-order.checkin.ts` | `if (reference === null && !exempt) throw checkinError("checkin_reference_missing");` (1) | `if (reference === null) return issueVerdict("exempt_service_type");` | ec=1, VERMELHA |
| 9 | A6-i | `work-order.checkin.ts` | `export const CHECKIN_EXEMPT_SERVICE_TYPES: readonly string[] = Object.freeze(["residencial"]);` (1) | `export const CHECKIN_EXEMPT_SERVICE_TYPES: readonly string[] = Object.freeze([]);` | ec=1, VERMELHA |
| 10 | A6-ii | `work-order.checkin.ts` | `const exempt = typeInfo !== null && CHECKIN_EXEMPT_SERVICE_TYPES.includes(typeInfo.serviceType ?? "");` (1) | `const exempt = true;` | ec=1, VERMELHA |
| 11 | A2-A3 | `work-order.checkin.ts` | `if (typed !== reference.slice(-2)) throw checkinError("checkin_confirmation_mismatch");` (1) | `if (typed !== current.code.slice(-2)) throw checkinError("checkin_confirmation_mismatch");` | ec=1, VERMELHA |
| 12 | A1 | `work-order.service.ts` | `const checkin = await this.verifyCheckinForStatus(actor, current, nextStatus, body, options?.entry ?? "internal");` (1) | (apagar a linha) | ec=1, VERMELHA |
| 13 | A12 | `work-order.service.ts` | `const message = checkin ? checkinTimelineMessage(checkin) : optionalString(body.message) ?? defaultStatusMessage(nextStatus);` (1) | `const message = optionalString(body.message) ?? defaultStatusMessage(nextStatus);` | ec=1, VERMELHA |
| 14 | A7-i | `work-order.service.ts` | `this.assertCheckinReferenceUnchangedByField(actor, current, serviceDetails);` (1) | (apagar a linha) | ec=1, VERMELHA |
| 15 | A7-ii | `work-order.checkin.ts` | `const nextReference = resolveCheckinReference(serviceDetails);` (1) | `const nextReference = serviceDetails && "plate" in serviceDetails ? resolveCheckinReference(serviceDetails) : currentReference;` | ec=1, VERMELHA |
| 16 | A8 | `work-order.service.ts` | `...(checkin ? { checkin: checkin.mode } : {}),` (1) | `...(checkin ? { checkin: checkin.mode, confirmation: body.checkin_confirmation } : {}),` | ec=1, VERMELHA |
| 17 | A8b | `mobile-work-order-sync.ts` | `payload: normalizePayload(withoutCheckinConfirmation(action.payload)),` (1) | `payload: normalizePayload(action.payload),` | ec=1, VERMELHA |
| 18 | A10-i | `work-order.checkin.ts` | `if (typeof raw !== "string") return null;` (1) | `if (raw == null) return null;` | ec=1, VERMELHA |
| 19 | A10-ii | `work-order.checkin.ts` | `if (candidates.size !== 1) return null;` (1) | `if (candidates.size === 0) return null;` | ec=1, VERMELHA |
| 20 | A10-iii | `work-order.checkin.ts` | `const BR_PLATE_PATTERN = /(?<![A-Z0-9])([A-Z]{3})[\s.-]{0,2}([0-9][A-Z0-9][0-9]{2})(?![A-Z0-9])/g;` (1) | `const BR_PLATE_PATTERN = /([A-Z]{3})[\s.-]{0,2}([0-9][A-Z0-9][0-9]{2})/g;` | ec=1, VERMELHA |
| 21 | A10-iv | `work-order.checkin.ts` | `if (candidates.size !== 1) return null;` (1) | `if (candidates.size !== 1) return upper.replace(/[^A-Z0-9]/g, "") \|\| null;` | ec=1, VERMELHA |
| 22 | A10-v | `work-order.checkin.ts` | `return normalized.length === 2 ? normalized : null;` (1) | `return normalized.length >= 1 ? normalized : null;` | ec=1, VERMELHA |
| 23 | L1-i | `work-order.dto.ts` | `checkinPlateTail: checkin?.plateTail ?? null,` (1) | `checkinPlateTail: null,` | ec=1, VERMELHA |
| 24 | L1-ii | `work-order.service.ts` | `let pending = typeInfoByCatalog.get(item.serviceCatalogId);` (1) | `let pending: Promise<ServiceCatalogTypeInfo> \| undefined = undefined;` | ec=1, VERMELHA |
| 25 | G1a | `work-order.types.ts` | `readonly status: Exclude<WorkOrderStatus, "on_site">;` (1) | `readonly status: WorkOrderStatus;` | ec=2, VERMELHA |
| 26 | G1a-create | `work-order.types.ts` | `readonly status?: Exclude<WorkOrderStatus, "on_site">;` (1) | `readonly status?: WorkOrderStatus;` | ec=2, VERMELHA |
| 27 | G1b | `work-order.repository.ts` | `assertCheckinVerdictForStatus(input);` (1) | (apagar a linha) | ec=1, VERMELHA |
| 28 | G1c | `work-order-prisma.repository.ts` | `assertCheckinVerdictForStatus(input);` (1) | (apagar a linha) | ec=1, VERMELHA |
| 29 | M1-i | `work_order_detail_screen.dart` | `String? get _expected => widget.wo.checkinPlateTail;` (1) | `String? get _expected => widget.wo.code.substring(widget.wo.code.length - 2);` | ec=1, VERMELHA |
| 30 | M1-ii | `work_order_detail_screen.dart` | `final hint = _maskedHint();` (1) | `final hint = widget.wo.code;` | ec=1, VERMELHA |
| 31 | M2-i | `work_order_repository.dart` | `if (newStatus == WorkOrderStatus.arrived && lastDigits != null)` (1) | `if (false)` | ec=1, VERMELHA |
| 32 | M2-ii | `sync_replay_service.dart` | `payload['checkin_confirmation'] = checkinConfirmation;` (1) | (apagar a linha) | ec=1, VERMELHA |
| 33 | M3-i | `work_order_detail_screen.dart` | `final canConfirmWithoutDigits = widget.wo.checkinMode == CheckinMode.exempt;` (1) | `final canConfirmWithoutDigits = true;` | ec=1, VERMELHA |
| 34 | M3-ii | `work_order_detail_screen.dart` | `if (widget.wo.checkinMode == CheckinMode.referenceMissing) {` (1) | `if (false) {` | ec=1, VERMELHA |
| 35 | M-L1-app | `work_order_remote_api.dart` | `json['checkinMode'] ?? json['checkin_mode'],` (1) | `null,` | ec=1, VERMELHA |
| 36 | M4 | `app_database.dart` | `if (!hasCheckinMode) {` (1) | `if (true) {` | ec=1, VERMELHA |
| 37 | M5-i | `work_order_conflict_resolution_service.dart` | `final restored = _restoreBeforeCheckin(` (1) | `final restored = current; final _ = (` | ec=1, VERMELHA |
| 38 | M5-ii | `work_order_conflict_resolution_service.dart` | `if (action.createdAt.isBefore(checkinAction.createdAt)) continue;` (1) | `if (action.clientActionId != checkinAction.clientActionId) continue;` | ec=1, VERMELHA |
| 39 | M5-iii | `work_order_repository.dart` | `if (existing != null && checkinRedoPending.contains(existing.localId)) {` (1) | `if (false) {` | ec=1, VERMELHA |
| 40 | M6 | `work_order_detail_screen.dart` | `final checkinRedo = conflicts.any(isCheckinRefusalAction);` (1) | `final checkinRedo = false;` | ec=1, VERMELHA |
| 41 | M7 | `sync_screen.dart` | `final checkinRedoIds = checkinRedoAffectedActionIds(conflicts);` (1) | `final checkinRedoIds = <String, String>{};` | ec=1, VERMELHA |
| 42 | F5 | `WorkOrderForm.tsx` | `return serviceType !== "residencial";` (1) | `return serviceType === "socorro";` | ec=1, VERMELHA |
| 43 | G1a-marca | `work-order.checkin.ts` | `  readonly [checkinVerdictBrand]: true;` (1) | (apagar a linha) | ec=2, VERMELHA |

## Incidente de terreno (11/11, ~03:50 SP, por `date`)

Os arquivos `*.log` do scratchpad da sessão sumiram enquanto o `npm test` na forma da CI rodava (o scratchpad é
compartilhado com a sessão do orquestrador; não fui eu que os apaguei). Perdidos: os logs crus do vermelho-controle, da
1ª rodada de mutações e da 1ª rodada do `npm test`. Preservado: o resumo de cada um, já neste diário, e a tabela das
mutações (gerada do log antes de ele sumir). O `npm test` cuja saída ia para o arquivo apagado foi parado (só a árvore
de processos dele, PID 28284) e o cluster Postgres descartável foi recriado (a rodada parada deixou 6 bancos de drill
nele). Os logs desta fase em diante ficam em `C:/Users/thiag/w-san326-logs/`, apagada no fim.

## Bateria final (§9), no head integrado com a main (`b426918b`, depois do merge da `origin/main` `07898adf`)

| Passo | Comando | Resultado |
|---|---|---|
| App · dependências | `flutter pub get` | ec=0 |
| App · formato | `dart format --output=none --set-exit-if-changed lib test` | ec=1, só por `test/features/bsan313_minhas_os_escopo_test.dart`, que o bloco não toca (`git diff origin/main` vazio): é a versão local do Dart (3.11.4) × a da CI; os 21 arquivos Dart do bloco formatados (ec=0 só neles) |
| App · análise | `flutter analyze` | No issues found |
| App · testes do bloco | `bsan326_checkin_confere_placa_test.dart` + `bsan326_checkin_conflito_test.dart` | +15, All tests passed |
| App · regressões | `b115_checkin_flow_test.dart`, `b103_work_order_sync_test.dart`, `app_database_migration_test.dart` | +59, All tests passed |
| App · suíte | `flutter test --reporter compact` | +1118, All tests passed |
| Backend · testes do bloco | os 3 `tests/san3-26-*` | 33/33 |
| Backend · regressões | `o6r07c-b-scope`, `work-order-checklists-sticky`, `approval-routes`, `san3-13-wo-list-scope`, `work-order-checklist-snapshot-dto` | 219/219 |
| Backend · tipo e lint | `npm run check` · `npm run lint` | ec=0 · ec=0 |
| Backend · suíte, na forma do job `backend` da CI | `npm test` com `DATABASE_URL` (Postgres 16 próprio, `san326-pg`, migrações aplicadas) e `REDIS_URL` (Redis 7 próprio, `san326-redis`), `CORE_SAAS_PERSISTENCE=memory` | 478 arquivos · 4989 testes · pass 4972 · **fail 15** · skipped 2 · piso de denominador: 2 arquivos (os dois drills). Triagem abaixo |
| Backend · build | `npm run build` | ec=0 |
| Web | `npm --prefix frontend run check` · `build` · `test:smoke` | ec=0 · ec=0 · 1715/1715 |
| Migração | `node scripts/migration-transaction-guard.mjs` | 130 migrações · violações 0 |
| Espaços | `git diff --check origin/main...HEAD` | ec=0 |
| Escopo | `git diff --name-only origin/main...HEAD` | 38 arquivos; nada em `prisma/`, `.github/`, `Kpis/`, `infra/`, `migrations/`, lockfiles, `pubspec.*`, `catalog.ts`, `RBAC_MATRIX.md`, `field-dispatch/`, `work-order.routes.ts` |

**Triagem das 15 falhas do `npm test` local (nenhuma é do bloco).** Cada arquivo que falhou foi reexecutado sozinho, em
sequência, no mesmo cluster:

| Arquivo | Sozinho | Causa |
|---|---|---|
| `core-saas-prisma`, `san3-05-leituras-de-plataforma-db`, `traccar-position-ingestion-db`, `users-acesso-seg-logs-db`, `users-acesso-seg-portao-db` | verdes (6/6, 12/12, 22/22, 1/1, 4/4) | carga: na hora, rodavam mais 3 `run-backend-tests` de outras sessões na mesma máquina ("Unable to start a transaction in the given time", tempo esgotado) |
| `traccar-event-migration-drill-db`, `work-order-invoicing-migration-drill-db` | 6/6 testes verdes; falha só a limpeza | Windows: `EBUSY: resource busy or locked, rmdir` do diretório temporário do drill |
| `san3-05-runtime-role-guard-db` | 8 verdes, 4 vermelhos | Windows: `setsid: ausente` (o teste exige `setsid` para o `psql \password`) |
| `san3-09-bootstrap-platform-admin-db` | 0/2 | o T2 desse arquivo só roda em container Linux (corpo do jurado `jurado-san3-09c2-*`) |

Nenhum desses arquivos é tocado pelo bloco nem cria OS em `on_site`. A medida que vale é a CI do GitHub no head
empurrado (Linux), lida pelo resumo TAP (§C7.11(3)): ver o PR.

**Teste manual "app da versão anterior contra o servidor novo" (§6 do plano): não executado** — não há aparelho nem
emulador neste terreno. O que o cobre, sem substituí-lo: o codec do app (`WorkOrderSyncCodec`) não mudou na leitura de
`conflicts[]`, e a M5 usa o codec real com a resposta no formato do servidor novo (a recusa vira `conflict`, retry 0,
uma chamada); o cartão antigo de conflito é o mesmo que a regressão da M6 afirma ("conflito de outro tipo mantém as 3
saídas"). Fica para a pré-revisão ou para o porteiro, se um aparelho estiver disponível.

**Limpeza (§C5):** no fechamento, os containers `san326-pg` e `san326-redis` são removidos, `dist/` e
`frontend/dist/` (gitignored) apagados, e a pasta `C:/Users/thiag/w-san326-logs` apagada; o worktree fica para a
pré-revisão e a junta.

## Conserto da pré-revisão (fluxo rápido, §C7 item 10(3), passo 1)

- **Autor:** `dev-san3-26-fix-cl`, Claude Opus 5.5 (subagente da sessão), dev, **sucessor** do `dev-san326-cl`. Não fiz
  a pré-revisão. **Verificador:** a conferência do item 10(3)5, por outra identidade. Sem cruzamento, pelo mesmo motivo
  declarado na pré-revisão (§C7 item 11(2)).
- **Insumo:** `prerev-534.json` e `prerev-534-evidencia.md` (`prerev-534-cl`, APROVADO com 5 não graves e 1 grave
  pré-existente), em `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/`.
- **Objeto de partida:** `e5287e8e`, árvore limpa (`git status --porcelain` vazio), medido às 05:14 SP por `date`.
- Um commit por item, na ordem abaixo.

### PR534-02 — as duas mutações próprias que sobreviveram

Os casos novos ficam nos testes do bloco; o produto não muda.

- `tests/san3-26-checkin-normalizacao.test.ts`: o A10 ganha "ABC12345", "ABC1D234" e "ABC1D23X" (letra ou dígito colado
  depois da placa = sem referência), na tabela e no `resolveCheckinReference`.
- `tests/san3-26-checkin-conferencia.test.ts`: o A7b novo. O `technician` pela rota HTTP não troca a placa (403
  `checkin_reference_not_editable`, a placa fica), e a mudança cosmética passa. O `viewer`, papel fora das duas listas,
  chamado direto no serviço, também toma 403. O gestor troca, como controle.
- Verde no código: os 2 arquivos, 29/29.
- Vermelho com a mutação, pelo roteiro de sempre: âncora com contagem 1, troca, teste-dono, `git checkout`, e o
  `git diff --quiet` do arquivo dá 0.

| # | Mutação | Arquivo | Âncora → troca | Resultado |
|---|---|---|---|---|
| 1 | PROPRIA-3 (guarda da direita) | `work-order.checkin.ts` | `(?![A-Z0-9])/g;` → `/g;` | ec=1, VERMELHA: normalização pass 5, fail 2 (as 2 do A10) |
| 2 | PROPRIA-4 (a guarda só para `field_technician`) | `work-order.service.ts` | `if (serviceDetails === undefined \|\| isCheckinOfficeOnly(actor)) return;` → `… \|\| !actor.roles.includes("field_technician")) return;` | ec=1, VERMELHA: conferência pass 21, fail 1 (A7b) |
| 3 | PROPRIA-4a (só o `technician` escapa) | idem | → `… \|\| isCheckinOfficeOnly(actor) \|\| actor.roles.includes("technician")) return;` | ec=1, VERMELHA (A7b, pela rota HTTP) |
| 4 | PROPRIA-4b (só o `viewer` escapa) | idem | → `… \|\| isCheckinOfficeOnly(actor) \|\| actor.roles.includes("viewer")) return;` | ec=1, VERMELHA (A7b, pelo serviço) |

As 4/4 restauradas. As linhas 3 e 4 provam que cada metade do A7b mata a sua variante sozinha.

### PR534-06 — os 2 arquivos fora do PERMITIDO

- **Este diário (`docs/revisoes/SAN3/B-SAN3-26-dev.md`) fica.** Ele é o artefato do dev, com o vermelho-controle, a
  emenda, as mutações, a bateria e este conserto. Não é código nem teste. É a mesma classe do `CONF527B-N01`
  (conferência do PR #527: os diários dos devs de tela fora do PERMITIDO, um artefato de processo). Ele fica no ramo e
  vale como registro do bloco.
- **`mobile/flutter_app/lib/shared/ui/sync_screen.dart` fica, porque é necessário.** O requisito que o exige é do
  próprio plano v2:
  - a tabela de abertura, linha N-02: "o cartão de check-in não oferece 'Aceitar servidor' nem 'Manter local'; o
    caminho é o `redoCheckin`";
  - o §2.2, "Recusa do servidor = conflito resolvível": "Some 'Manter local', que repetiria a recusa, e 'Aceitar
    servidor', que não reverte (N-02)".

  A tela Sincronização é a segunda superfície que oferece essas duas saídas para a mesma ação: "Minha versão" (`keepMine`)
  e "Versão do gestor" (`useServer`), em `sync_screen.dart`. A crítica r2 mediu isso no `C26R2-02`: depois de "Versão
  do gestor" sobra 1 ação em conflito, e "Minha versão" chama a API de novo e recebe a mesma recusa. O plano v2 não
  listava o arquivo no PERMITIDO porque não sabia dessa segunda superfície. Sem a mudança, a propriedade do §2.2 cai
  por essa porta. A mudança se limita a isto:
  - para as ações presas a uma chegada recusada, o cartão mostra só "Confirmar a placa de novo", que chama o mesmo
    `undoRefusedCheckin` do cartão da OS;
  - qualquer outro conflito continua com as 2 escolhas.
- **Prova por execução (05:27 SP, por `date`):** voltei só este arquivo ao da base (`git show
  b6caf568:mobile/flutter_app/lib/shared/ui/sync_screen.dart`) e rodei
  `flutter test --no-pub test/features/work_orders/bsan326_checkin_conflito_test.dart`. Deu ec=1, `+5 -1`, e caiu o M7
  ("a tela Sincronização (C26R2-02) …"): `Expected: exactly one matching candidate · Actual: Found 0 widgets with key
  [<'conflict-checkin-redo-chegada'>]`. Na base, a tela mostra as 2 escolhas antigas para a chegada recusada. Depois
  restaurei com `git checkout -- …sync_screen.dart`, e o `git status --porcelain` ficou vazio.
- O que muda o PERMITIDO continua sendo uma decisão de plano. Esta justificativa fica aqui, e a confirmação fica para a
  conferência do item 10(3)5 (outra identidade).
