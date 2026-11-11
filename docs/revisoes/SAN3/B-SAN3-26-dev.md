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
