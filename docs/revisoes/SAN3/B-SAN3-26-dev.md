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

### PR534-03 — o status da OS no pull: passado ao `B-O6R-11d`, sem conserto aqui

- **Não consertado neste bloco, por ordem do orquestrador.** O defeito é a tradução de status do app na volta:
  `workOrderStatusFromApiValue` (`work_order_remote_api.dart`) casa pelo nome do enum do app, e o `on_route` e o
  `on_site` do servidor viram `scheduled`. A causa é anterior ao bloco (`P-MOBILE-STATUS-NOMES`, 04/11), e este PR
  não mexe nessa função.
- **Passado ao `B-O6R-11d`.** O plano v2 dele (`plano-B-O6R-11d-v2.md`) já trata disso: o D5 da tabela de partida
  (`workOrderStatusFromApiValue`) e a P1 (`'on_route'` → `enRoute`, `'on_site'` → `arrived`), com o T5 e as
  mutações M5/M5b.
- **O que fica dependendo do 11d.** Três afirmações deste bloco só ficam verdadeiras no app depois do conserto do 11d:
  - a E-05;
  - o `API_CONTRACTS.md` ("a OS fica 'A caminho' no app até um pull trazer o `on_site` que a base registrou");
  - a `P-CHECKIN-SEM-PLACA-OFFLINE` ("o app só vê o `on_site` depois de um pull").

  Com o app de hoje, o pull traz a OS como "Agendada". As três ficam como estão, por ordem do orquestrador ("só
  registre").

### PR534-01 — quem revisou a emenda

- **As emendas E-01 a E-08** (F0.3 acima) foram escritas pelo dev anterior, sem revisão antes do código. Agora estão
  **revisadas pela pré-revisão `prerev-534-cl`**, uma identidade que não planejou, não criticou e não desenvolveu
  (`prerev-534.json`, achado PR534-01, e a seção "Emendas E-01..E-08 — autoria" da evidência).
  - E-01, E-02, E-06 e E-08 se sustentam por mutação.
  - A E-03 é fail-closed.
  - A E-04 e a troca de desfecho do A10 ("AB 123 CD") seguem como escolha de produto, ainda não ratificada pelo dono:
    "LEITURA DECLARADA" na F0.3 e `P-CHECKIN-PLACA-ESTRANGEIRA`.
  - A E-05 depende do PR534-03 (acima).
- **Daqui em diante, o dev não emenda o plano por conta própria** (§C7.4-bis e `D-EMENDA-ANTES-DO-CODIGO`). Se aparecer
  uma decisão nova, ela vai ao orquestrador como emenda escrita, e o código só vem depois da revisão. Este conserto não
  emendou nada:
  - os casos do PR534-02 são testes de propriedades que o bloco já tinha;
  - o PR534-06 justifica o arquivo pelo próprio plano v2;
  - o PR534-03 e o PR534-04 não mexem em código.

### PR534-05 — o teste manual "app da versão anterior contra o servidor novo" (§6 do plano), executado

Executado em 11/11, das 05:18 às 06:00 SP (por `date`). As capturas e os registros ficam fora do repositório (o
repositório é público, e o PR534-06 pede para não abrir arquivo novo fora do PERMITIDO), em
`C:/Users/thiag/erp-pausa-2026-10-03/revisoes/dev-534-fix-emulador/`:
- 26 capturas (`NN-*.png`);
- `estados.log`: a fila e a OS lidas do banco local do app, e o status e a linha do tempo no servidor, a cada passo;
- `emu-server-http.log`: cada chamada HTTP que o app fez;
- os roteiros `emu-server.mts`, `cenario.sh`, `estado.sh`, `ui.sh` e `cap.sh`;
- `app-debug-excecao-do-detalhe.log`.

**Terreno**
- **Emulador:** AVD `erp_pixel` (API 36, x86_64), porta 5626, com `-no-snapshot-load -no-snapshot-save`. O boot levou
  31,5 s.
- **JDK:** o JBR 21 do Android Studio, que é o JDK 17+ do roteiro e o mesmo que o Flutter usa. Não há JDK 17 nesta
  máquina.
- **App antigo:** o APK da `origin/main` `b6caf568`, montado num worktree próprio (`C:/Users/thiag/w-san326old`, já
  removido). Foi gerado com `--dart-define=ERP_AUTH_MODE=remote --dart-define=API_BASE_URL=http://10.0.2.2:3626`.
- **Backend:** `createApp` mais `createCoreSaasService`, a mesma composição do `src/server.ts`, com o `src/` do head
  (`git diff --quiet e5287e8e HEAD -- src` = igual). Rodou com `CORE_SAAS_PERSISTENCE=memory` em `127.0.0.1:3626`.
- **O que é da sonda, e não do produto:** só o `POST /api/v1/auth/login` (e o `/refresh`). O login real precisa da
  tabela de credenciais do Prisma, que o modo memória não tem. Por isso a sonda assina o JWT com o mesmo
  `signAccessToken` do head, e o middleware real o confere. Tudo o mais é o app real do head.
- **As OS:** o gestor criou, pelo HTTP, 2 OS de reboque, com placas `ABC1D21` e `ABC1D22`, e despachou ao guincheiro
  (`field_technician`).

**Duas barreiras anteriores ao bloco, achadas no caminho**

1. **O APK debug não mostra o detalhe da OS.** O corpo fica em branco, e o `flutter attach` mostra a causa:
   `BoxConstraints forces an infinite width`. O erro vem do `OutlinedButton` "Abrir mapa", em
   `work_order_operational_map_screen.dart:274`. Ele está numa `Row` sem `Expanded`, e o tema dá aos botões
   `minimumSize: Size.fromHeight(44)` (`erp_mobile_theme.dart`). O bloco não toca esses arquivos, e a mesma coisa
   acontece na `main`.
   - Para seguir, usei o APK **profile** do mesmo código (`flutter build apk --profile --target-platform android-x64`,
     que roda sem asserts). Ali o detalhe aparece, mas o "Abrir mapa" sai com a largura estourada (bounds
     `[95,320][1080,399]`).
   - Este achado é para o orquestrador registrar e dar dono. Não consertei.
2. **No app antigo, o guincheiro não chega ao "No local" de uma OS vinda do servidor.** Pelo PR534-03, todo status do
   pull vira "Agendada" (cap. 01 e 02). De "Agendada", o "Iniciar rota" é recusado no próprio app: "Invalid transition:
   WorkOrderStatus.scheduled → WorkOrderStatus.enRoute" (cap. 04).
   - Para pôr no aparelho uma OS "Em rota", como num app que já estava a caminho antes da troca do servidor, editei o
     banco local do app. Usei o `run-as`, porque o APK profile é depurável, e mudei só `work_orders.status` para
     `enRoute`, com `sync_status = synced`. No servidor, a mesma OS foi para `on_route` pelo técnico, via HTTP.
   - A partir daí, cada ação é do código real do app antigo.

**O teste (OS-000002)**

| Passo | O que fiz | O que se viu (cap.; `estados.log`) |
|---|---|---|
| 1 | Modo avião, "Cheguei ao local" e o diálogo antigo, com o fim do CÓDIGO, "02" | o diálogo pede "os 2 últimos dígitos do nr de série", com o prefixo "OS-0000" (cap. 13). A OS fica "No local · Sync pendente" (cap. 14). A fila tem 1 `arrived` `pending`, **sem `checkin_confirmation`** no payload |
| 2 | Rede de volta | **1** chamada a `POST /mobile/sync/work-order-actions`. A ação fica **`conflict`**, `last_error_code = checkin_confirmation_required`, `retry_count = 0` (e1). No servidor, a OS segue `on_route`, sem evento `on_site` |
| 3 | "Sincronizar agora" | **0** chamada nova. O conflito sai do reenvio automático, sem as 5 tentativas (e2) |
| 4 | Tela Sincronização | o cartão de conflito antigo: "Conflito remoto exige decisão manual", com "Minha versão" e "Versão do gestor" (cap. 17) |
| 5 | "Minha versão" e sincronizar | **1** chamada, e volta `conflict` `checkin_confirmation_required`, retry 0 (e3, e4; cap. 18) |
| 6 | "Versão do gestor" | a ação fica `synced`, e a tela mostra 0 pendente, 0 erro e 0 conflito (e5; cap. 19). **A fila não travou** |
| 7 | Pull (puxar a lista) | a OS volta como **"Agendada"**, não "A caminho" (e6; cap. 20). O servidor segue `on_route` |
| 8 | A base marca "No local" pelo console (gestor, sem dígitos, com `message` do cliente) | no servidor, `on_site`, com a mensagem "Chegada ao local registrada pela base." e `metadata.checkin = office`. O pull seguinte do app (08:57:47Z, depois do PATCH de 08:57:46Z) mostra a OS como "Agendada" (e7; cap. 21) |

**Repetição (OS-000001, com o servidor em `on_route`)**
- O desfecho é o mesmo: 1 chamada e `conflict` `checkin_confirmation_required`, retry 0 (f1, f2).
- Reaberto offline (sem pull), o detalhe da OS mostra o cartão de conflito antigo, com "Manter local e tentar
  novamente", "Aceitar estado do servidor" e "Marcar para revisão manual" (cap. 22).
- "Aceitar estado do servidor" marca a ação `synced`, mas a OS segue "No local" no aparelho: é o N-02 do app antigo,
  que não reverte (cap. 23; f3). O pull a traz como "Agendada" (cap. 24; f4).

**Ensaio descartado.** A 1ª passada (OS-000001, com o servidor ainda em `accepted`) deu `invalid_status_transition`, e
não a recusa do check-in. O erro foi de montagem minha: o estado do aparelho não batia com o do servidor. Ficou
registrado como `e0` e nas cap. 05 a 11, e não conta como resultado.

**Contra o §6 do plano**
- "o resultado tem de ser o cartão de conflito antigo, e não uma fila morta": **CONFIRMADO**. É conflito resolvível,
  não `failed`, e não há reenvio em laço. As duas superfícies antigas (a OS e a tela Sincronização) resolvem com um
  toque, e a fila fica vazia.
- "'Aceitar servidor' seguido de um pull devolve a OS a `on_route`": **NÃO, no app**. O servidor fica em `on_route`,
  mas o app mostra "Agendada", pelo PR534-03 (passado ao `B-O6R-11d`).
- O servidor não gravou `on_site` sem a conferência: a linha do tempo das 2 OS não tem `on_site` vindo do campo, e o
  único `on_site` é o da base, com `office`.
- **Não medido:** o corpo da resposta do sync. O registro do corpo na sonda falhou, porque o Express reescreve o
  `req.url` durante a rota. O desfecho foi lido do banco do app (`last_error_code`) e do servidor (status e linha do
  tempo). A forma e o sigilo do corpo já estão provados pelo A4b e pelo A8b do bloco.

**Limpeza deste item (06:01 SP)**
- No emulador: `pm clear` do app (a sessão de teste sai), modo avião desligado e emulador desligado (`adb emu kill`;
  `adb devices` vazio).
- O app instalado no AVD antes do teste era um build de 02/11 e guardava só uma sessão salva, sem banco local. As
  `shared_prefs` dele ficam em `dev-534-fix-emulador/app-dados-0211-shared_prefs.tar`. O APK de 02/11 não foi
  guardado.
- O servidor da sonda foi parado (0 listener em 3626). O worktree `w-san326old` foi removido: o
  `git worktree remove --force` falhou por caminho longo depois de tirar o registro, e o diretório saiu com
  `rd /s /q \\?\…`.

## Conserto único da junta (fluxo rápido, §C7 item 10(3), passo 4)

- **Autor:** `dev-san3-26-fix-cl`, Claude Opus 5.5 (subagente da sessão), dev. Não achei nenhum dos achados: os da
  junta são das cadeiras C1, C2 e C3 (`C:/Users/thiag/erp-pausa-2026-10-03/revisoes/j534/c*-voto.json`, 3 de 3
  APROVADO, sem grave). A triagem é do orquestrador (11/11, ~08:00 SP). Sem cruzamento, pelo mesmo motivo da
  pré-revisão (§C7 item 11(2)).
- **Objeto de partida:** `1a1328ef`, árvore limpa, medido às 07:57 SP por `date`.

### C1-A1 — a marca da base não é forjada pela mensagem do cliente

**Forma escolhida, a menor que fecha a propriedade:** o servidor **descarta** a mensagem do cliente que imita a marca, e
o evento leva a mensagem padrão da transição. A transição não é recusada.
- A recusa criaria um motivo novo de erro, um tipo novo de conflito na fila e tratamento no app.
- Tirar a marca do texto (o console mostrar o `metadata.checkin`) exige mexer no `WorkOrderTimeline.tsx`, fora do
  PERMITIDO.

**Onde.** Um helper em `work-order.checkin.ts` (`withoutReservedOfficeMark`) e três chamadas em `work-order.service.ts`.
São todas as transições que gravam mensagem do cliente na linha do tempo da OS:
- `changeStatus`: a rota HTTP de status e a fila;
- `assign`: `POST /work-orders/:id/assign` e a ação `work_order.assign` da fila;
- `assignFromDispatch`: o motivo da reatribuição do despacho, que chega pelo `field-dispatch` e não é tocado.

O cancelamento usa a mensagem padrão.

**LEITURA DECLARADA (§A6).**
- A reserva é "registrad[ao] pela base", e não a frase inteira: "Chegada no local registrada pela base" também forjaria.
- A comparação ignora caixa, acento, pontuação, espaços repetidos, caracteres invisíveis e largura (NFKD).
- **Residual declarado:** letra de outro alfabeto com a mesma forma (homóglifo) não é reconhecida. O fechamento pleno é
  o console mostrar a marca pelo `metadata.checkin`, registrado como pendência (C3, abaixo).

**Testes.**
- `tests/san3-26-checkin-conferencia.test.ts`:
  - A12b: `on_route` e `in_progress`, pela rota HTTP e pela fila, com a frase. Prova que a mensagem cai para a padrão
    ("Operador em deslocamento." e "Atendimento iniciado.") e que outra mensagem do cliente continua valendo;
  - A12c: a atribuição pela rota e pela fila, e o motivo da reatribuição do despacho.
- `tests/san3-26-checkin-normalizacao.test.ts`: 10 formas forjadas (caixa, "registrado", tabulação, invisível, acento,
  largura total, hífens, e invisível e acento no meio da palavra) e 4 mensagens que ficam.

**Mutações literais.** Âncora com contagem 1, restauradas pela cópia do arquivo.

| # | Mutação | Âncora → troca | Resultado |
|---|---|---|---|
| 1 | M-C1a (`changeStatus`) | `      : withoutReservedOfficeMark(optionalString(body.message)) ?? defaultStatusMessage(nextStatus);` → `      : optionalString(body.message) ?? defaultStatusMessage(nextStatus);` | ec=1, VERMELHA: conferência pass 23, fail 1 (A12b) |
| 2 | M-C1b (`assign`) | `    const message = withoutReservedOfficeMark(optionalString(body.message)) ?? "Ordem de servico atribuida.";` → `    const message = optionalString(body.message) ?? "Ordem de servico atribuida.";` | ec=1, VERMELHA: pass 23, fail 1 (A12c) |
| 3 | M-C1c (`assignFromDispatch`) | `      withoutReservedOfficeMark(optionalString(input.message)) ??` → `      optionalString(input.message) ??` | ec=1, VERMELHA: pass 23, fail 1 (A12c, "motivo do despacho: a marca da base foi forjada") |
| 4 | M-C1d (a reserva) | `const RESERVED_OFFICE_MARK = /registrad[ao] pela base/;` → `const RESERVED_OFFICE_MARK = /chegada ao local registrada pela base\.$/;` | ec=1, VERMELHA: normalização pass 7, fail 1 |
| 5 | M-C1e (a dobra) | `    .replace(/[\p{M}\p{Cf}]/gu, "")` → (apagar) | ec=1, VERMELHA: normalização pass 7, fail 1 |

A M-C1e sobreviveu na 1ª rodada. Invisível e acento no FIM de uma palavra caem mesmo sem a dobra, porque viram
separador. Entraram os 2 casos com o invisível e o acento no MEIO da palavra ("regis\u200btrada", "regístrada"), e a
M-C1e ficou vermelha.

**Contrato:** `API_CONTRACTS.md` §3.5.2 ganhou o item "A marca da base é do servidor".

### C2-01 — a normalização aceita os separadores da vida real e a UF colada

**O que mudou** (`work-order.checkin.ts`, só `BR_PLATE_PATTERN`, `resolveCheckinReference` e `normalizeTypedTail`):
- Entre dois caracteres quaisquer da placa cabe um separador, e entre as letras e os números, até três (" - ").
- O separador é espaço (inclusive NBSP), ponto, sublinhado, hífen, U+2010 a U+2015 (traços e travessões) ou U+2212
  (sinal de menos).
- A UF colada no fim só vale se for uma das 27. Outra letra colada continua tirando a placa: "ABC1D23X", "ABC1D23XY" e
  "ABC1D23SPX" dão sem placa.
- A placa e o digitado passam pela mesma dobra (NFKC e maiúsculas), e a largura total vira ASCII.
- **O que não vira placa:** o código da OS ("OS-000041", "os 000041", "OS-000041/SP"), porque tem duas letras.
  Separador demais também não vira: "AB - C 1234" e "ABC -  - 1234".

**LEITURA DECLARADA (§A6):** a junta pediu " - ", os travessões, "_", espaço entre tudo e a UF colada. NFKC e U+2212
entraram porque estão na sonda da C2 (o caso "fullwidth") e são a mesma propriedade, "a placa digitada de outro jeito
é a mesma placa".

**Testes**
- `tests/san3-26-checkin-normalizacao.test.ts`: todos os casos de texto da sonda da C2 (`probe-c2-http.mts`, de
  "mercosul" a "nbsp") entram na tabela do A10, com o desfecho que a placa pede, mais os casos do que não é placa.
  - Os casos "objeto" e "lista" não entram: a criação já recusa valor não primitivo em `service_details` (422
    `invalid_service_details`).
  - Os números e o booleano já estavam no A10.
- `tests/san3-26-checkin-conferencia.test.ts`: o A10b, pela rota HTTP. Cobre " - ", travessão, espaço entre tudo, "_" e
  UF colada: a lista traz `plate` e o fim certo, e a chegada com esse fim dá 200. O código da OS no campo da placa dá
  422 `checkin_reference_missing`.

**Vermelho-controle:** com o `work-order.checkin.ts` do commit anterior (`git show HEAD:…`), os testes novos dão pass
30 e fail 3 (A10b, a tabela do A10 e o `resolveCheckinReference`). O arquivo foi restaurado com `cmp` igual.

**Mutações literais.** Âncora com contagem 1, restauradas pela cópia do arquivo. A M-C2a rodou por um script com
`String.raw`, porque as barras invertidas da âncora não passam íntegras pelo argv no Git Bash.

| # | Mutação | Âncora → troca | Resultado |
|---|---|---|---|
| 1 | M-C2a (a classe de separadores) | `const PLATE_SEPARATOR = "[\\s._\\-\\u2010-\\u2015\\u2212]";` → `const PLATE_SEPARATOR = "[\\s.\\-]";` | ec=1, VERMELHA: pass 30, fail 3 |
| 2 | M-C2b (a UF colada) | `` `(?:${PLATE_SEPARATOR}{0,3}${PLATE_UF_SUFFIX})?(?![A-Z0-9])`, `` → `` `(?![A-Z0-9])`, `` | ec=1, VERMELHA: pass 30, fail 3 |
| 3 | M-C2c (o separador entre as letras) | `` `(?<![A-Z0-9])([A-Z])${PLATE_SEPARATOR}?([A-Z])${PLATE_SEPARATOR}?([A-Z])${PLATE_SEPARATOR}{0,3}` + `` → `` `(?<![A-Z0-9])([A-Z])([A-Z])([A-Z])${PLATE_SEPARATOR}{0,3}` + `` | ec=1, VERMELHA: pass 30, fail 3 |
| 4 | M-C2d (até três entre os blocos) | `` ([A-Z])${PLATE_SEPARATOR}{0,3}` + `` → `` ([A-Z])${PLATE_SEPARATOR}{0,2}` + `` | ec=1, VERMELHA: pass 30, fail 3 |
| 5 | M-C2e (NFKC) | `  return text.normalize("NFKC").toUpperCase();` → `  return text.toUpperCase();` | ec=1, VERMELHA: normalização pass 6, fail 2 |
| 6 | M-C2f (só as 27 UF) | `const PLATE_UF_SUFFIX = "(?:AC\|…\|TO)";` → `const PLATE_UF_SUFFIX = "[A-Z]{2}";` | ec=1, VERMELHA: pass 6, fail 2 |
| 7 | M-C2g (guarda da direita) | ``(?![A-Z0-9])`,`` → `` `, `` | ec=1, VERMELHA: pass 6, fail 2 |
| 8 | M-C2h (guarda da esquerda) | `` `(?<![A-Z0-9])([A-Z]) `` → `` `([A-Z]) `` | ec=1, VERMELHA: pass 6, fail 2 |
| 9 | M-C2i (ambígua) | `  if (candidates.size !== 1) return null;` → `  if (candidates.size === 0) return null;` | ec=1, VERMELHA: pass 7, fail 1 |
| 10 | M-C2j (a junção dos 7 grupos) | `candidates.add(match.slice(1, 8).join(""));` → `candidates.add(match.slice(1, 7).join(""));` | ec=1, VERMELHA: pass 4, fail 4 |

**As âncoras antigas** da tabela de mutações do F4 (A10-ii, A10-iii, A10-iv) e a PROPRIA-3 do PR534-02 apontavam para
o padrão antigo, que deixou de existir. As propriedades delas são as linhas 7, 8 e 9 acima, com as âncoras novas.

### A main entrou no ramo (#530 e #538)

O `merge(main)` `3233bed8` conflitou só em registro (`decisoes.md` e `pendencias.md`). As duas entradas foram
mantidas, a do ramo primeiro, e o índice foi regenerado pelo gerador. O #538 já tinha dado ID às 2 barreiras do
emulador (`P-APP-DETALHE-OS-LARGURA-INFINITA` e `P-APP-ANTIGO-INICIAR-ROTA-DE-AGENDADA`) e passado a
`P-USERS-DESATIVADO-TOKEN-MOBILE` ao `B-USERS-SEG-DESATIVADO`. Nesta última não mexi.

### C3-01, C3-02, C3-03 e as pendências da triagem (registro, `controle/pendencias.md`)

A regra de dono é a do orquestrador: defeito do app de OS ou da fila vai para o `B-O6R-11d`, e texto, para o
`B-SAN3-19b`. Se nenhum couber, "dono a definir pelo orquestrador".

**C3-01, as 2 barreiras do emulador:**
- `P-APP-DETALHE-OS-LARGURA-INFINITA` (ALTA) ganha o dono `B-O6R-11d`;
- `P-APP-ANTIGO-INICIAR-ROTA-DE-AGENDADA` já tinha esse dono e ganha a nota da C3-02: o app deste PR também tem a
  barreira.

**C3-02, o mapeamento de status:**
- `P-MOBILE-STATUS-NOMES` passa ao `B-O6R-11d` no registro versionado, com a nota do PR534-03.
- O fechamento da `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` (item 53) agora diz exatamente o que fecha: a metade do
  servidor, nas duas portas, que é a autoridade. A metade do app está no código, mas com o servidor real só é
  alcançável depois do conserto do mapeamento (dono `B-O6R-11d`).

**C3-03, as 5 pendências que o bloco abre:**

| Pendência | Dono |
|---|---|
| `P-CHECKIN-SEM-PLACA-OFFLINE` | `B-O6R-11d` (o pull trazer o `on_site` da base; a exceção segue decisão do dono) |
| `P-DESPACHO-ARRIVED-SEM-CONFERENCIA` | a definir pelo orquestrador (é do despacho no servidor; o `B-SAN3-26b` do plano não existe) |
| `P-CHECKIN-NUMERO-DE-SERIE` | a definir pelo orquestrador (decisão de produto) |
| `P-CONSOLE-EDITA-PLACA-DA-OS` | a definir pelo orquestrador (tela do console) |
| `P-CHECKIN-PLACA-ESTRANGEIRA` | a definir pelo orquestrador (decisão de produto) |

**Viram pendência, sem código:**
- C2-02 vira `P-CHECKIN-CARTAO-CONGELADO-NO-PULL` (MÉDIA, `B-O6R-11d`);
- C2-03 e C2-04 entram como nota na `P-MOBILE-REPO-SESSAO-DEMO-DURANTE-RELOAD`;
- C1-A2 vira `P-CHECKIN-CAMPO-REESCREVE-PLACA-NAO-RECONHECIDA` (BAIXA, anterior ao bloco, `B-O6R-11d`);
- o residual do C1-A1 vira `P-CHECKIN-MARCA-DA-BASE-SO-NO-TEXTO` (BAIXA, dono a definir pelo orquestrador).

O índice foi regenerado pelo gerador: 864 cabeçalhos e 853 IDs.

## A junção com a main `c95ad4fd` (#535, #536, #540, #541): Emenda 3 do plano

- **Autor:** `dev-san3-26-fix-cl`, dev do #534. Não achei o conflito como defeito. Às 11:13 SP, o merge deu conflito de
  CÓDIGO em 4 arquivos, eu PAREI (`git merge --abort`) e avisei. O orquestrador escreveu a Emenda 3 no fim do
  `plano-B-SAN3-26-v2.md` às 11:15 SP e autorizou a resolução. Comecei às 11:16 SP, por `date`.
- **Causa:** o #536 (B-SAN3-23) trocou a escrita de situação por um CAS (`expectedStatus`) com releitura, revalidação e
  uma regravação. O #534 tinha posto, no mesmo `changeStatus`, o veredito do check-in e a neutralização da frase.

### Como ficou, item por item da emenda

1. **Nenhum "No local" sem veredito, em nenhum caminho.** O `changeStatus` calcula o veredito sobre a OS lida e monta a
   escrita a partir dele (`statusWrite(veredito, expectedStatus)`). Se o CAS casar 0, o serviço relê e revalida
   (escopo e transição, do #536). Depois **recalcula o veredito sobre a OS relida**, na linha marcada
   `// B-SAN3-26:veredito-na-releitura`, e só então regrava, com a escrita refeita a partir do veredito novo. Veredito
   que não fecha na relida recusa (422) e não grava nada.
2. **Nada sobrescreve o cancelamento.** A revalidação do #536 vem antes do recálculo: relida `cancelled` dá 409
   `invalid_status_transition`.
3. **Um tipo só.** `ChangeWorkOrderStatusCommon` ganhou o `expectedStatus` do #536. O `status` fica só na união do
   #534, e `on_site` exige o `checkin: CheckinVerdict`. O `CancelWorkOrderWithFinancialDecision*` do #536 entrou como
   está.
4. **Ordem.** `assertCheckinVerdictForStatus(input)` é a 1ª linha do `changeStatus` nos dois repositórios, antes do CAS
   e de qualquer escrita. No Prisma já estava assim depois da fusão automática; na memória, ficou antes do
   `liveWorkOrder`.
5. **A frase reservada na regravação.** A mensagem sai do `statusWrite` a cada passada, com `withoutReservedOfficeMark`.

### Fora dos 4 arquivos: o que a junção exigiu, sem asserção editada (declarado)

- **`work-order.checkin.typecheck.ts`** (guarda de tipo do #534): a base das entradas ganhou `expectedStatus`. Sem
  ele, os 2 `@ts-expect-error` passariam a falhar pela falta do campo do CAS, e não pelo veredito: a guarda ficaria
  vazia. Prova: com o `Exclude<…, "on_site">` trocado por `WorkOrderStatus`, o `tsc` dá `TS2578 Unused
  '@ts-expect-error'` na linha 16, e o arquivo foi restaurado.
- **`tests/san3-26-checkin-ponto-unico.guard.test.ts`** (do #534): as chamadas diretas ao repositório ganharam o
  `expectedStatus`. É fixture: o G1-controle falhava porque o CAS casava 0 sem o campo.
- **`tests/b-san3-23-cas-retentativa.test.ts`** (do #536): o arnês `setStatus` leva a OS a `on_site` com um veredito
  emitido por `verifyCheckin`, pela porta da base (`office`). Sem isso, a guarda do #534 recusa o `on_site` do arnês,
  e 4 casos caem por `checkin_verdict_required`. Só o arnês muda; nenhuma asserção.

### Testes novos (`tests/san3-26-checkin-juncao-cas.test.ts`)

Em memória, com barreira determinística: um Proxy roda o gancho antes da 1ª escrita de situação, como no
`b-san3-23-cas-retentativa`.
- **T-JUNCAO:** o `cancel` (keep) entra entre a leitura e a escrita de um "No local" COM veredito. Resultado: 409
  `invalid_status_transition`, OS `cancelled`, `arrivedAt` vazio, 0 evento `on_site` e 1 escrita só (sem regravação).
- **T-JUNCAO-b:** a base troca a placa (`XYZ9A99`) ou a tira, e marca o "No local", entre a leitura e a escrita do
  técnico, que mandou os dígitos certos da placa que leu ("23"). Resultado: 422 (`checkin_confirmation_mismatch` ou
  `checkin_reference_missing`), 1 escrita só, 0 evento do técnico, e a OS não fica gravada em nome dele.
- **T-JUNCAO-c:** a frase da base em `on_route`, com a regravação exercida (2 escritas). A mensagem gravada não tem a
  marca.

| Mutação | Âncora → troca | Resultado |
|---|---|---|
| M-JUNC-a (o recálculo na releitura) | `      checkin = await this.verifyCheckinForStatus(actor, reread, nextStatus, body, entry); // B-SAN3-26:veredito-na-releitura` → (apagar) | ec=1, **VERMELHA**: T-JUNCAO-b, "era para recusar e passou" |
| M-JUNC-b (a revalidação do #536) | `      await this.revalidateStatusChange(actor, reread, nextStatus); // B-SAN3-23:revalida-status` → (apagar) | ec=1, VERMELHA: T-JUNCAO |
| M-JUNC-c (a frase na regravação) | `        : withoutReservedOfficeMark(optionalString(body.message)) ?? defaultStatusMessage(nextStatus);` → `        : optionalString(body.message) ?? defaultStatusMessage(nextStatus);` | ec=1, VERMELHA: T-JUNCAO-c |
| M-JUNC-d (a escrita refeita na releitura) | `      write = statusWrite(checkin, fromStatus);` → (apagar) | ec=1, VERMELHA: T-JUNCAO-c |

As 4 foram restauradas (`cmp` igual).

### Bateria (11:20 a 11:36 SP)

- **#534, testes do bloco** (`san3-26-*`, 4 arquivos, com o novo): 41/41, skipped 0.
- **#534, regressões:** as 5 do plano deram 219/219, e atribuição e despacho (`mobile-work-order-assign-registry`,
  `field-dispatch-routes`, `checklist-snapshot-dispatch`) deram 22/22.
- **#536 em memória:** `b-san3-23-cas-retentativa` 10/10. As suítes vizinhas (`work-order-cancel-duplicate*`,
  `work-order-financials*`) deram 73/73.
- **#536 em Postgres:** `b-san3-23-cancel-race-db` deu **21/21, `# skipped 0`**, com `# cancelled 0`.
  - Rodou num Postgres 16 descartável meu, `san326j-pg` em `127.0.0.1:55426`, migrado e semeado como na CI.
  - O A8 da própria suíte prova, dentro dela, a conexão pelo papel efêmero `NOSUPERUSER` sem `BYPASSRLS`.
- **`-db` vizinhas da OS:** 55/56. A falha é só a limpeza do drill de faturamento no Windows (`EBUSY: rmdir` do
  diretório temporário), a mesma da triagem do F4. Os 6 testes do drill passam.
- `npm run check` e `lint` ec=0; a guarda de migração deu 131 migrações e 0 violação.
- `flutter analyze` sem achados; Flutter do bloco mais as regressões, +74.
- `git diff --check` ec=0.

### Registro

- Os conflitos de `pendencias.md` e do índice mantiveram as duas entradas, e o índice foi regenerado pelo gerador.
- A `P-CHECKIN-MARCA-DA-BASE-SO-NO-TEXTO` ganhou a nota da CONF534-01 (os preenchedores Hangul U+115F, U+3164 e U+FFA0
  passam a dobra; o resíduo do homóglifo continua declarado).
