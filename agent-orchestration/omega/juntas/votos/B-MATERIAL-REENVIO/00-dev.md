# B-MATERIAL-REENVIO — diário do dev `dev-c-cdx`

- Executor: `dev-c-cdx`, Codex GPT-5.6 Sol, conta 1, identidade nova.
- Plano e crítica: escritos por outras identidades; este dev não participou deles.
- Verificador obrigatório: outra identidade/modelo, conforme o plano e o contrato.

## RETOMADA 1 — 2026-11-12T14:15:26-03:00

- Comando: `git fetch origin`; verificação de worktrees/ramo/disco; `git worktree add -b feat/mobile-material-reenvio C:/Users/thiag/w-material origin/main`; `git status`; `git rev-parse HEAD`.
- Saída resumida: `origin/main` e o worktree em `ef4e98e76215d4ca9d2941f0bb5204b0c46ee881`; árvore limpa; ramo novo acompanhando `origin/main`; `C:` com 173 GB livres.
- Estado: C-F0 iniciada; nenhum código alterado; nenhum cluster criado.
- Head: `ef4e98e76215d4ca9d2941f0bb5204b0c46ee881`.
- Próximo passo exato: `npm ci` em `C:/Users/thiag/w-material`, depois `npx prisma generate`, e `flutter pub get` em `mobile/flutter_app`.

## RETOMADA 2 — 2026-11-12T14:16:02-03:00

- Comando: `npm ci`; `npx prisma generate`; `flutter pub get`; `flutter --version`; `df -BG /c`.
- Saída resumida: `npm ci` concluiu com 326 pacotes; `flutter pub get` concluiu; Flutter 3.41.6/Dart 3.11.4; 172 GB livres. O primeiro `prisma generate` falhou antes de gerar porque `DATABASE_URL` não existe no ambiente do worktree (`PrismaConfigEnvError`); nenhum `.env` foi criado ou tocado.
- Estado: dependências próprias instaladas, sem junction. A falha do Prisma é de ambiente e será repetida com URL fictícia apenas no processo, como já previsto no terreno dos blocos irmãos.
- Head: `ef4e98e76215d4ca9d2941f0bb5204b0c46ee881`.
- Próximo passo exato: `DATABASE_URL=postgresql://postgres@127.0.0.1:55576/erp_material npx prisma generate`, depois reexecutar M.28–M.33 e B.61–B.70 em `HEAD`.

## RETOMADA 3 — 2026-11-12T14:18:28-03:00 — PARADA NA F0

- Comandos: geração Prisma com `DATABASE_URL` fictícia no processo; inspeções por `grep/sed/git diff` de M.28–M.33 e B.61–B.70 em `HEAD`; `git show/git diff` dos merges #548 (`3a62bd49`) e #544 (`fd51409c`); inspeção da rota `GET /mobile/technician/stock`, de `src/modules/navigation/route-modules.ts` e de `prestador_repository.dart`.
- Saída resumida da preparação: Prisma Client 7.8.0 gerado; árvore só contém este diário; 173 GB livres.
- Ref medida: `ef4e98e76215d4ca9d2941f0bb5204b0c46ee881` (`origin/main` no início da F0).

### Comparação literal do terreno

| Medição | Resultado em `ef4e98e7` | Comparação com o plano |
|---|---|---|
| M.28 | `StockMovement` continua expondo `workOrderId` e `createdBy` | BATE; só linhas deslocadas. |
| M.29 | `getForMutation`, `assertMutationObjectScope`, `actorMutatesAssignedOnly`, `isPreviouslyAssignedRefusal` e constantes de conflito continuam presentes; evidência e lote de OS os consomem | BATE; funções deslocadas e lote de OS ampliado por blocos posteriores. |
| M.30 | `createExitForSource`, `findExitBySource`, `removeExitForSource` e o resolver que converte erro em `false` continuam como descritos; o seam ainda fixa custódia BASE e não recebe `workOrderId` | BATE no alicerce antigo; entra em conflito semântico com #548, detalhado abaixo. |
| M.31 | as duas regex seguem `/^work_order[.]/`; os pares de material não estão no snapshot | BATE: material segue fora da propriedade. |
| M.32 | uma linha por OS/SKU, payload sem `material_local_id`, `removeMaterial` só apaga e Drift usa `INSERT OR REPLACE`; apenas InMemory/Drift implementam a interface | BATE nas funções do C. #548 mexeu no mesmo arquivo de repositório, mas só em construtor, carregamento remoto/cache e providers; `addSelection/removeMaterial` ficaram disjuntas. |
| M.33 | `SyncScreen` agora chama `syncResolutionSideEffectsProvider` em conflito e encalhado; `sync_resolution_side_effects.dart` já existe pelo bloco B; `_domainLabel` agora delega a `sync_action_labels.dart` | BATE com o estado pós-B previsto em C2 itens 11–12, mas NÃO bate com o caminho de edição permitido em C4: para criar “Materiais da OS” é preciso tocar `lib/core/sync/sync_action_labels.dart`, não autorizado. |
| B.61 | `source_type TEXT`, índice parcial único e nenhum CHECK do estoque | BATE; sem migração. |
| B.62 | `findItemBySku` ainda não existe; única busca por SKU no Prisma é `contains` da lista | BATE. |
| B.63 | fábrica async, resolver de OS e `assertWorkOrderReference` presentes | BATE; #548 acrescentou resolvedor do perfil do ator sem alterar esse caminho. |
| B.64 | insert genérico já grava `work_order_id`; `createExitForSource` ainda não o repassa | BATE. |
| B.65 | lote de despesa continua com 3 tipos e recusa `receipt.attach`; comprovante vive na rota própria | BATE com o estado posterior a B'. |
| B.66 | `P-MOBILE-MATERIAL-SEM-REPLAY` segue aberta; B-SAN3-16 ainda listado | BATE. |
| B.67 | purga continua retendo por ação/linha de material não sincronizada | BATE; linhas deslocadas. |
| B.68 | config autenticada/Pending do lote de OS continuam; os providers cresceram por blocos anteriores | BATE no comportamento necessário; linhas deslocadas. |
| B.69 | arnês em memória, atores de campo e repositório de estoque em memória continuam disponíveis | BATE. |
| B.70 | snapshot atual é backend `5422/5424` (2 pulados), não `4153/4155`; Flutter também avançou | MUDOU como esperado pela passagem do tempo; N real não foi reexecutado porque a parada ocorreu antes das suítes completas. |

### Premissas que NÃO batem e exigem emenda

1. **Custódia do estoque (#548):** o plano C fixa a baixa em `BASE` e diz que o futuro `B-SAN3-15` trocará a custódia. O #548, já na main, entregou `GET /mobile/technician/stock` escolhendo a custódia pelo ator: profissional ativo vê saldo `professional`; gestão sem cadastro pode ver BASE. O app agora carrega esse estoque real. Se o C for implementado literalmente, o técnico seleciona uma peça de sua custódia profissional, mas o seam debita BASE, podendo produzir `insufficient_balance` falso ou baixar o balde errado. É mudança de regra/propriedade, não simples deslocamento de linha.
   - Evidência: `git diff 3a62bd49^ 3a62bd49 -- src/modules/inventory/inventory.service.ts mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart` mostra `technicianStock`/cache/API real; `inventory.service.ts:createExitForSource` continua fixando BASE.
2. **Gate de módulo (#544):** `/mobile/sync/inventory-actions` agora é classe `{inventory}` em `route-modules.ts`. O plano só descreve permissão por ação (`work_orders:update` para material) e não declara o pré-requisito de módulo nem o setup correspondente em RC2/RC3. O orquestrador precisa decidir e escrever se material exige simultaneamente módulo `inventory` e permissão/escopo de OS, e ajustar critérios/fixtures. A rota de estoque do #548 também foi classificada `{inventory}`.
3. **Arquivo do rótulo fora do permitido:** C4 autoriza o ramo de `_domainLabel` em `sync_screen.dart`, mas a main delega para `lib/core/sync/sync_action_labels.dart`. Alterar o rótulo sem emenda violaria o escopo; deixar como está mostraria material sob “Ordens de Serviço”, contrariando C2 item 12.

- Veredito F0: **NÃO BATE; PARADA OBRIGATÓRIA antes de C-F1 e antes de qualquer código.** Nenhum cluster Postgres foi criado; nenhuma suíte completa foi iniciada; nenhum arquivo de produto foi alterado.
- Head: `ef4e98e76215d4ca9d2941f0bb5204b0c46ee881`.
- Próximo passo exato: o orquestrador escrever e revisar uma emenda ao §C cobrindo (a) custódia pós-#548, (b) requisito/testes do gate de módulo pós-#544 e (c) inclusão de `sync_action_labels.dart` no escopo; depois o dev retoma a F0, reexecuta N_f/N_b e só então decide C-F1.

## RETOMADA 4 — 2026-11-12T14:19:28-03:00

- Comando: `bash C:/Users/thiag/erp-pausa-2026-10-03/ferramentas/checkup-conclusao.sh material`.
- Saída resumida: `checkup material: worktree-preservado(w-material)`.
- Head antes deste apenso: `248d6603` (F0 registrada e ramo empurrado).
- Próximo passo exato: aguardar a emenda escrita e revisada pelo orquestrador; não iniciar C-F1.

## RETOMADA 5 — 2026-11-12T15:31:43-03:00

- Comando: leitura integral de `CLAUDE.md`, `PROJECT_MEMORY.md`, das skills `ts-frontend-full`, `ui-ux-pro-max` e `saas-multi-tenant`, do §C e das Emendas C2/C2.1/C2.2; conferência de `HEAD`, remoto, branch, árvore e processos do terreno.
- Saída resumida: `HEAD`, alvo e `origin/feat/mobile-material-reenvio` iguais a `7d1a392a205b1c3d6af8ae2f056f7241a002fc40`; branch correta; árvore inicialmente limpa; nenhum processo `node`, `dart` ou `flutter` ativo. As três divergências da F0 anterior estão endereçadas pelas emendas: custódia final no C, gate de módulos com casos por ação e `sync_action_labels.dart` no PERMITIDO. A aderência ainda depende da re-medição literal e das baselines fail-closed.
- Head: `7d1a392a205b1c3d6af8ae2f056f7241a002fc40`.
- Próximo passo exato: inicializar `C:/Users/thiag/pg-material`, gravar `timezone`/`log_timezone` UTC antes do start, subir em `127.0.0.1:55576`, criar/migrar/semear `bmat_base`, subir `material-redis` em `127.0.0.1:56576` e provar `SHOW timezone = UTC` + `PONG` antes das suítes.

## RETOMADA 6 — 2026-11-12T15:44:01-03:00 — PARADA NA F0 REFEITA

- Comando: `initdb` em `C:/Users/thiag/pg-material`; configuração de `timezone = 'UTC'`, `log_timezone = 'UTC'`, `listen_addresses = '127.0.0.1'` e porta `55576` antes do primeiro start; `SHOW timezone`; criação de `bmat_base`; `docker run --name material-redis -p 127.0.0.1:56576:6379 redis:7`; probe `PONG`; `prisma generate`; `prisma migrate deploy`; `prisma migrate status`; `npm run db:seed`; `npm test` com `DATABASE_URL`, `REDIS_URL` e `CORE_SAAS_PERSISTENCE=memory` exportados na mesma sessão, gravado em `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/f0-material-npm-test.tap`.
- Saída resumida do terreno: Postgres aceitou conexão em `127.0.0.1:55576`; `SHOW timezone` e `SHOW log_timezone` deram `UTC`; 134 migrações aplicadas, status atualizado e seed concluído; Redis em `127.0.0.1:56576` respondeu `PONG`. As âncoras E5 continuam iguais a `ef4e98e7`: código relevante sem diff, blob de `inventory.actor-custody.ts` igual, seam ainda em BASE, gate `{inventory}`, 26 rótulos e os dois caminhos da tela já chamando o gancho.
- Baseline backend: **INVÁLIDA / NÃO BATE** — `[run-backend-tests] 534 arquivo(s) · 5431 teste(s) · pass 5420 · fail 9 · skipped 2`, com piso de denominador por `tests/traccar-event-migration-drill-db.test.ts` sem registrar teste após `EBUSY` no `after`. Os outros não-verdes foram 5 subtestes de `san3-05-runtime-role-guard-db.test.ts` (quatro ligados à ausência de `setsid`/boot real e um T8d), mais o pai; e `san3-09-bootstrap-platform-admin-db.test.ts` (o subprocesso tentou executar o shim Bash `node_modules/.bin/prisma` como JavaScript), mais o pai. Não apareceu a classe `XX000`; portanto a repetição automática prevista em R-C21-04 não se aplica.
- Baseline Flutter: **não medida**; a trava fail-closed da baseline backend exigiu parada antes de iniciar outra suíte. Nenhum arquivo de produto foi alterado; C-F1 não começou.
- Veredito F0: as três divergências antigas estão cobertas pelas emendas, mas a baseline canônica ainda não bate. **PARADA OBRIGATÓRIA por `D-EMENDA-ANTES-DO-CODIGO`.**
- Head: `7d1a392a205b1c3d6af8ae2f056f7241a002fc40`.
- Próximo passo exato: o orquestrador decidir por emenda revisada como executar a forma canônica no Git Bash/Windows diante de `setsid` ausente, shim Prisma interpretado pelo Node e `EBUSY`; só depois refazer N_b e N_f. Não iniciar C-F1.

## RETOMADA 7 — 2026-11-12T19:38:25-03:00 — F0 CONCLUÍDA PELA EMENDA C2.3

- Comando: leitura do run `43249586610` com `gh run view --job ... --log`; subida do Postgres exclusivo em `127.0.0.1:55576` com `timezone`/`log_timezone = UTC`, migração e seed de `bmat_base`; `docker run --name material-redis -p 127.0.0.1:56576:6379 redis:7` + `PONG`; regressões backend, PostgreSQL e Flutter nomeadas pelas Emendas C2/C2.1; registro de `P-AMBIENTE-SUITE-INTEIRA-NO-WINDOWS`.
- Saída resumida do CI (`main` `ef4e98e7`): backend `[run-backend-tests] 534 arquivo(s) · 5440 teste(s) · pass 5438 · fail 0 · skipped 2`; `backend-postgres` `610/610`, `fail 0`, `skipped 0`; Flutter `+1170: All tests passed!`. Estes são `N_b = 5440` e `N_f = 1170` pela E-C23.1.
- Saída resumida no host: Postgres aceitando em `127.0.0.1:55576`, `SHOW timezone` e `SHOW log_timezone` = `UTC`; Redis `127.0.0.1:56576` = `PONG`; regressão backend em memória `123/123`, `fail 0`, `skipped 0`; regressão `-db` `37/37`, `fail 0`, `skipped 0`, incluindo a prova `NOSUPERUSER NOBYPASSRLS`; regressão Flutter `66/66`, `All tests passed!`. Os arquivos `tests/b-material-*` ainda não existem na F0 e entram nas fatias próprias.
- Ambiente: `P-AMBIENTE-SUITE-INTEIRA-NO-WINDOWS` aberta com dono `B-FERR-AGENTES`, conforme E-C23.3; não é defeito do C e não bloqueia o bloco porque a suíte inteira roda no CI do PR.
- Head: `f01e4a77ef336f8aaf7b1028aee0f4c36ed9f418` antes deste apenso.
- Próximo passo exato: executar a C-F1 em worktree temporário de `origin/main`: reexecutar `ataque.mts`, `censo.mts` e as sondas `s02`/`s03`, registrar cada vermelho-controle e remover somente o worktree temporário; não iniciar C-F2 antes do commit e push da C-F1.

## RETOMADA 8 — 2026-11-12T19:42:53-03:00 — C-F1 CONCLUÍDA

- Comando: worktree temporário `C:/Users/thiag/w-material-f1` em `origin/main` `ef4e98e7`, com `npm ci` e Prisma próprios; execução de `ataque.mts`, `censo.mts`, sondas `s02`/`s03` e controle Flutter descartável de RC5(1); remoção somente do worktree temporário com `git worktree remove --force` (sem `prune`).
- Saída resumida de `ataque.mts`: G1 reproduzido (`get` simples deixa tecB ler a OS, `getForMutation` recusa); G4/S3 reproduzidos (mesma origem devolve o movimento de tecA para quantidade e ator divergentes); tipos antigos/contratos continuam como medidos. Exit 0.
- Saída resumida de `censo.mts`: base com `violacoes: 0`; acrescentar `work_order_material.add` produz `NAO-CLASSIFICADA`; a regex `^work_order[.]` não casa. Exit 0.
- Sondas C2.1: `s02` provou que o mutante BASE sobrevive aos quatro casos antigos e morre apenas em gerente/misto com cadastro; `s03` devolveu `rejected not_found` mas baixou saldo `5→3`, criou movimento `1→2` e deixou saída fantasma — oráculo literal verde, oráculo `resposta+saldo+razão` vermelho. Ambas exit 0.
- RC5(1) no head: controle descartável falhou como esperado (`Expected SyncStatus.synced`, `Actual SyncStatus.pending`, exit 1); o `removeMaterial` atual só apaga a linha e não desfaz/enfileira a ação. RC2(1)/RC3 permanecem “não aplicável” porque o handler de material não existe na `main`.
- Head: `05fd718e25f7c5ac8bb0caf7d8ebed22734968d8` antes deste apenso; árvore do `w-material` limpa antes do diário.
- Próximo passo exato: C-F2 — implementar somente o seam do estoque dos itens C2(1)-(3), criar `tests/b-material-exit-source.test.ts`, provar RC1(1)-(6), M-C1/M-C2 e os quatro guards de estoque; rodar `npm run check`, registrar, commitar e empurrar antes da C-F2b.

## RETOMADA 9 — 2026-11-12T19:46:46-03:00 — C-F2 CONCLUÍDA

- Executor da fatia: `dev-c3-cdx`, Codex GPT-5.6 Sol, conta 1.
- Código: `work_order_material` entrou nas origens de baixa com `reason = baixa_material_os`; `workOrderId` atravessa service → repositórios memória/Prisma → razão; `findItemBySku` é exato e tenant-scoped na interface, memória, Prisma/RLS e serviço. Nenhum arquivo Prisma, rota ou permissão foi tocado.
- Provas: `tests/b-material-exit-source.test.ts` RC1(1)-(6) = `6/6`; conjunto com os quatro guards de estoque = `49/49`, `fail 0`, `skipped 0`; `npm run check` exit 0; `flutter analyze` = `No issues found`. `dart format`: não aplicável, pois nenhum arquivo Dart mudou.
- Mutações: M-C1 (não repassar `workOrderId`) deixou RC1(1) vermelho por `undefined`; M-C2 (`includes` no SKU) deixou RC1(4) vermelho por falso positivo; ambas revertidas, e `git diff --check` verde.
- Head: `d799043bc70edb7cb6464da2ed0ecba701b4babe` antes deste apenso.
- Próximo passo exato: commitar/push da C-F2 e abrir o PR em rascunho; depois iniciar C-F2b, limitada à custódia no seam (E1), RC1(7)-(8), M-C25/M-C26 e regressões nomeadas.

## RETOMADA 10 — 2026-11-12T19:47:34-03:00 — PR EM RASCUNHO ABERTO

- Comando: commit/push da C-F2; `gh pr create --base main --head feat/mobile-material-reenvio --draft`.
- Saída resumida: C-F2 em `e62656d2eebbd122e098b939dadd9ec581741e32`; PR rascunho **#551**, `https://github.com/thiagodorgo/ERP_Techsolutios/pull/551`, com F0/F1/F2 concluídas, fatias restantes e dependência da C-F6b declaradas; corpo termina com a assinatura exigida.
- Head: `e62656d2eebbd122e098b939dadd9ec581741e32`.
- Próximo passo exato: C-F2b — implementar `custody?`, `custodyOfMovement`, saldo/inserção na custódia informada e estorno na custódia original; acrescentar RC1(7)-(8), executar M-C25/M-C26, regressões, `npm run check` e `flutter analyze`; commitar/push antes da C-F3.

## RETOMADA 11 — 2026-11-12T19:52:20-03:00 — C-F2b CONCLUÍDA

- Executor da fatia: `dev-c3-cdx`, Codex GPT-5.6 Sol, conta 1.
- Código: `custody?` atravessa o seam de `createExitForSource`; saldo e inserção usam a custódia selecionada, com BASE apenas como default compatível; `custodyOfMovement` reconstrói a custódia persistida e `removeExitForSource` estorna exatamente o balde original. O serviço aceita somente BASE ou profissional com UUID válido e rejeita veículo.
- Provas: RC1(1)-(8) = `8/8`; regressão nomeada (`b-material-exit-source`, estoque do técnico, decremento, combustível, peças de manutenção e guard de escrita) = `74/74`, `fail 0`, `skipped 0`; `npm run check` exit 0; `flutter analyze` = `No issues found`. `dart format`: não aplicável, pois nenhum arquivo Dart mudou. `git diff --check` verde.
- Mutações: a primeira tentativa de M-C25 atingiu por engano a ocorrência genérica de `createMovement` e sobreviveu; foi revertida sem permanecer no diff. Reaplicada no ponto correto de `createExitForSource`, M-C25 (forçar BASE na baixa) deixou RC1(7) vermelho por saldo insuficiente. M-C26 (forçar BASE no estorno) deixou RC1(8) vermelho por custódia divergente. Ambas foram revertidas e os testes finais voltaram a verde.
- Head: `02c992f8110f201defa4c4ed0bec731cda49b33f` antes deste apenso.
- Próximo passo exato: commitar e empurrar a C-F2b; depois iniciar somente a C-F3, criando o handler `work_order_material.add`, sua rota/classificação prevista e os casos RC2/mutações definidos para essa fatia, sem antecipar a custódia/módulo da C-F3b.

## RETOMADA 12 — 2026-11-12T20:00:37-03:00 — C-F3 CONCLUÍDA

- Executor da fatia: `dev-c3-cdx`, Codex GPT-5.6 Sol, conta 1.
- Código: o lote aceita `inventory.manage` ou `work_orders:update`, mas aplica a permissão correta por ação; `work_order_material.add` valida UUID/SKU/quantidade/OS, consulta a OS com `getForMutation` para campo e `get` para gestão, resolve SKU exato, faz pré e pós-check duráveis da origem e distingue `accepted`, `already_applied`, `action_owned_by_other_actor` e `idempotency_payload_mismatch`. As recusas de ex-técnico viram `assignment_changed_pending_review`; 503 propaga. A rota resolve e memoiza os serviços de estoque e OS. O recibo em memória continua restrito aos três tipos antigos; o material usa o razão. O contrato passou a `2026-11.b-material-reenvio` e ecoa os ids locais sem lê-los como autoridade.
- Provas: `tests/b-material-sync.test.ts` RC2(1)-(12),(16),(17t) = `14/14`; junto de RC1 e `tests/mobile-backend-contracts.test.ts` = `47/47`, `fail 0`, `skipped 0`; `npm run check` exit 0; `flutter analyze` = `No issues found`. `dart format`: não aplicável, pois nenhum arquivo Dart mudou. `git diff --check` verde.
- Mutações: M-C3 (material exigindo `inventory.manage`) deixou RC2(1) vermelho; M-C4 (`get` no lugar de `getForMutation`) deixou RC2(10) vermelho; M-C5 (retirar a comparação de `createdBy`) deixou RC2(4) vermelho. As três foram executadas isoladamente, gravadas em `revisoes/c-f3-m-c3.tap`, `c-f3-m-c4.tap` e `c-f3-m-c5.tap`, e revertidas antes da bateria final.
- Head: `adda839e7ceea47898b64dbb0b6094ea8c0c369e` antes deste apenso.
- Próximo passo exato: commitar e empurrar a C-F3; depois iniciar somente a C-F3b — custódia resolvida pelo ator, `operator_profile_required`, guarda por ação do módulo `work_orders`, injeção preguiçosa na rota e bootstrap, com RC8(1),(2),(4),(5), RC2(19)-(21) e M-C27/M-C28/M-C29/M-C31/M-C32/M-C33.

## RETOMADA 13 — 2026-11-12T20:08:54-03:00 — C-F3b CONCLUÍDA

- Executor da fatia: `dev-c3-cdx`, Codex GPT-5.6 Sol, conta 1.
- Código: `InventoryService.actorStockCustody` aplica a regra única do cadastro ativo/BASE tenant-wide e normaliza falha de consulta em 503; o handler resolve essa custódia depois do pré-check, recusa campo sem perfil com `operator_profile_required` e a envia ao seam. `work_order_material.add` exige `work_orders` por ação antes de ler a OS; a rota lê os módulos do tenant do ator de forma preguiçosa e memoizada, com falha em 503. O bootstrap mantém o gate de `inventory` e habilita o sync para `inventory.manage` ou `work_orders:update`.
- Provas: RC8(1),(2),(4),(5) = `4/4`; RC2 completo com os novos (19)-(21) = `17/17`; alvo C-F3b + censo de módulos = `28/28`; regressão ampliada (RC1/RC2/RC8, estoque do técnico, decremento, combustível, manutenção, guard de escrita e contrato mobile) = `120/120`, `fail 0`, `skipped 0`; `npm run check` exit 0; `flutter analyze` = `No issues found`. `dart format`: não aplicável, pois nenhum arquivo Dart mudou. `git diff --check` verde.
- Mutações: M-C27 deixou RC8(1) vermelho; M-C28 deixou RC8(4) vermelho; M-C29 deixou RC8(5) vermelho; M-C31 deixou RC2(19) e o censo de módulos vermelhos; M-C32 deixou RC2(20) vermelho; M-C33 deixou RC2(21) vermelho. Todas foram isoladas, registradas em `revisoes/c-f3b-m-c27.tap`…`c-f3b-m-c33.tap` e revertidas. `inventory.actor-custody.ts` e `route-modules.ts`, tocados só pelas mutações autorizadas, terminaram sem diff.
- Head: `6c4327d48883217bb0bdf1c0e726451b685d875a` antes deste apenso.
- Próximo passo exato: commitar e empurrar a C-F3b; depois iniciar somente a C-F3c, acrescentando RC8(6),(7), RC2(17t-a/b), `razaoIntacto` e as mutações M-C35/M-C36/M-C37, sem antecipar o remove da C-F4.

## RETOMADA 14 — 2026-11-12T20:12:31-03:00 — C-F3c CONCLUÍDA

- Executor da fatia: `dev-c3-cdx`, Codex GPT-5.6 Sol, conta 1.
- Código/testes: nenhum arquivo de produto precisou mudar. RC8 ganhou gerente com cadastro ativo, provando que o cadastro vence o papel e que saldo só na BASE não serve de fallback. RC2(17t) foi dividido em técnico e gestor; o técnico prova ainda que a mesma origem recusada pode ser reenviada legitimamente. O helper `snapshotLedger/assertLedgerUnchanged` compara ids do razão, saldos BASE/profissionais e ausência da origem, aplicado também às recusas de SKU, OS ausente, nunca atribuído e ex-técnico.
- Provas: RC8 completo nesta etapa = `6/6`; RC2 com 17t-a/b e módulo/bootstrap = `18/18`; alvo conjunto = `24/24`; regressão ampliada = `123/123`, `fail 0`, `skipped 0`; `npm run check` exit 0; `flutter analyze` = `No issues found`. `dart format`: não aplicável, pois nenhum arquivo Dart mudou. `git diff --check` verde.
- Mutações: M-C35 (tenant-wide forçado à BASE no handler) deixou RC8(6) e (7) vermelhos; M-C36 (tenant-wide forçado à BASE no service) deixou RC8(6) vermelho; M-C37 (escopo movido para depois da baixa) deixou RC2(10),(11),(17t-a),(17t-b) vermelhos pelo razão alterado. Todas foram isoladas, registradas em `revisoes/c-f3c-m-c35.tap`…`c-f3c-m-c37.tap` e revertidas; produto terminou sem diff.
- Head: `8731fb26d4c9f7b3c5f425eb8a7d548c626b3f7a` antes deste apenso.
- Próximo passo exato: commitar e empurrar a C-F3c; depois iniciar somente a C-F4, implementando `work_order_material.remove`, RC2(13)-(15),(18), RC8(3) e a parte de estorno do RC8(6), com M-C7.

## RETOMADA 15 — 2026-11-12T20:13:28-03:00 — PARADA ANTES DA C-F4

- Executor: `dev-c3-cdx`, Codex GPT-5.6 Sol, conta 1.
- Comando/medição: releitura literal do C2 item 4, RC2(15), N4/R-C21 e do próximo passo da C-F4, confrontada com o handler ainda não escrito. A árvore estava limpa e `HEAD = origin/feat/mobile-material-reenvio = d3e98a082394d2dc3fa32a19954bbb2108f69e87` antes deste apenso.
- Conflito: a regra N4 mais nova manda o remove (1) achar a baixa, (2) aplicar escopo por objeto sobre `exit.workOrderId`, (3) rejeitar `work_order_mismatch` quando o `work_order_id` do payload difere da baixa e só (4) conferir `exit.createdBy`. RC2(15), porém, ainda exige que tecB cite a OS Y dele para a baixa de tecA na OS X e receba `action_owned_by_other_actor`, justificando que “o escopo passa em Y”. Essa justificativa usa a ordem antiga expressamente revogada. Na ordem vigente, tecB ou falha no escopo de X antes da posse, ou, se puder passar em X, recebe `work_order_mismatch` porque Y ≠ X antes da posse. Nenhum setup produz o resultado exigido.
- Veredito: **PARADA OBRIGATÓRIA antes de qualquer código da C-F4**, por `D-EMENDA-ANTES-DO-CODIGO`. C-F4 e seguintes não começaram; nenhum arquivo de produto ficou modificado.
- Próximo passo exato: o orquestrador escrever e revisar uma emenda escolhendo a precedência observável do remove — recomendação técnica: manter N4 e a ordem `escopo da baixa → mismatch → posse`, reescrevendo RC2(15)/M-C7 para os resultados alcançáveis; depois o próximo dev retoma na C-F4.

## RETOMADA 16 — 2026-11-12T20:15:13-03:00 — CHECKUP FINAL

- Comando: `pg_ctl -D C:/Users/thiag/pg-material stop -m fast`; duas tentativas de remoção do caminho absoluto validado (Git Bash e `Remove-Item -LiteralPath` nativo); `bash C:/Users/thiag/erp-pausa-2026-10-03/ferramentas/checkup-conclusao.sh material`; probes finais de container, árvore e refs.
- Saída resumida: Postgres `material` parou (`server stopped`); as duas remoções do diretório foram recusadas pela política de execução antes de iniciar, portanto `C:/Users/thiag/pg-material` ficou **presente, mas parado**. Checkup: `containers worktree-preservado(w-material)`; `material-redis` não existe mais; worktree preservado; árvore limpa antes deste apenso; `HEAD` e remoto iguais a `d88976dfdf1c3b60e3827f1f2651221a13fe76de`.
- Próximo passo exato: remover `C:/Users/thiag/pg-material` quando a política do host permitir; funcionalmente, aguardar a emenda revisada da C-F4 descrita na RETOMADA 15.

## RETOMADA 17 — 2026-11-13T00:35:13-03:00 — TERRENO DA C2.4 APROVADO

- Executor: `dev-c4-cdx`, Codex GPT-5.6 Sol, conta 1, sucessor do `dev-c3-cdx`; não escreveu o plano, as emendas nem as críticas.
- Comando: leitura integral do contrato, memória, skills aplicáveis, §C, Emendas C2–C2.4 e dos dois diários; `git fetch origin`; conferência de `HEAD`, remoto, branch, árvore e processos; sondas de `pg-material2`, portas 55576/56576 e `material-redis`.
- Saída resumida: `HEAD = origin/feat/mobile-material-reenvio = 262cdc9849e4fb69e40f1e40d52a7c2bf56ad27e`; ramo correto; árvore limpa; nenhum processo `node`, `dart` ou `flutter` ativo; `C:/Users/thiag/pg-material2` ausente; portas 55576/56576 livres; `material-redis` ausente. A Emenda C2.4 foi lida e resolve a contradição da RETOMADA 15 mantendo N4 e reescrevendo RC2(15), com RC2(15b) novo.
- Head: `262cdc9849e4fb69e40f1e40d52a7c2bf56ad27e`.
- Próximo passo exato: inicializar somente `C:/Users/thiag/pg-material2`, gravar UTC/127.0.0.1/porta 55576 antes do primeiro start, migrar e semear; subir somente `material-redis` em 127.0.0.1:56576 e provar `SHOW timezone = UTC`, `SHOW log_timezone = UTC` e `PONG`; então iniciar exclusivamente a C-F4.

## RETOMADA 18 — 2026-11-13T00:36:51-03:00 — POSTGRES E REDIS PRÓPRIOS PRONTOS

- Comando: `initdb` em `C:/Users/thiag/pg-material2` com UTF8/locale C; configuração, antes do primeiro start, de `listen_addresses = '127.0.0.1'`, porta 55576, `timezone = 'UTC'` e `log_timezone = 'UTC'`; criação de `bmat_base`; `prisma generate`, `migrate deploy`, `migrate status` e `db:seed`; `docker run --name material-redis -p 127.0.0.1:56576:6379 redis:7`; probes por `pg_isready`, `psql` e `redis-cli`.
- Saída resumida: Postgres aceitando somente em 127.0.0.1:55576; 134 migrações aplicadas, schema atualizado e seed concluído; `SHOW timezone = UTC`, `SHOW log_timezone = UTC`, banco `bmat_base|UTF8`; Redis próprio respondeu `PONG`. A primeira forma do probe `psql` rejeitou o parâmetro Prisma `?schema=public`; o probe foi repetido corretamente com `-h/-p/-U/-d` e ficou verde, sem mudança no banco.
- Head: `262cdc9849e4fb69e40f1e40d52a7c2bf56ad27e`.
- Próximo passo exato: iniciar somente a C-F4: inspecionar o handler/add e os helpers do teste já presentes; escrever primeiro RC2(13),(14),(15 reescrito),(15b),(18) e os estornos RC8(3)/(6); implementar `work_order_material.remove` na ordem N4; provar M-C7 contra RC2(15b); executar testes da fatia, `npm run lint`, `npm run check` e `flutter analyze`; registrar, commitar e empurrar antes da C-F5.

## RETOMADA 19 — 2026-11-13T00:42:18-03:00 — C-F4 CONCLUÍDA

- Executor da fatia: `dev-c4-cdx`, Codex GPT-5.6 Sol, conta 1.
- Código: `work_order_material.remove` foi implementado na ordem N4 fixada pela Emenda C2.4: valida payload e módulo; acha a baixa; aplica escopo sobre `exit.workOrderId`; recusa `work_order_mismatch`; confere `exit.createdBy`; só então estorna. Baixa ausente ou já estornada devolve `already_applied`. O estorno usa o seam existente e volta à custódia original.
- Provas: vermelho-controle inicial = 7 falhas nos sete cenários de remove; depois, RC2(13),(14),(15 reescrito),(15b),(18),(20-r) e RC8(3)/(6) verdes. Conjunto `b-material-sync` + `b-material-custodia` = `31/31`, `fail 0`, `skipped 0`; `npm run lint` exit 0; `npm run check` exit 0; `flutter analyze` = `No issues found`; `dart format` não aplicável (nenhum Dart alterado); `git diff --check` verde.
- Mutação: M-C7 removeu somente a conferência `exit.createdBy`; RC2(15b) ficou vermelho porque o gerente estornou a baixa alheia e não recebeu `action_owned_by_other_actor`. A checagem foi restaurada; bateria final verde. A Emenda C2.2 também ficou presa por RC2(20-r): sem o módulo `work_orders`, o remove é rejeitado sem estorno.
- Isolamento: `tenant_id` do payload continua ignorado; OS de outra organização continua `not_found`; nenhuma consulta usa organização do corpo. Nenhum arquivo Prisma, catálogo de permissões, work-orders ou KPI foi tocado.
- Head: `262cdc9849e4fb69e40f1e40d52a7c2bf56ad27e` antes do commit da fatia.
- Próximo passo exato: commitar a C-F4 com coautoria exigida e empurrar; depois iniciar somente a C-F5, alterando as duas regex do censo e os dois pares `work_order_material.add|remove` da fixture, provar RC7, `censo.mts = 0` e M-C20, rodar a bateria da fatia, registrar, commitar e empurrar antes da C-F6a.

## RETOMADA 20 — 2026-11-13T00:46:16-03:00 — PARADA ANTES DE EDITAR A C-F5

- Executor: `dev-c4-cdx`, Codex GPT-5.6 Sol, conta 1.
- Comando/medição: `node --test --import tsx tests/o6r07c-census-guard.test.ts` no head empurrado da C-F4; confronto do resultado com C2 item 6, C4 e C-F5, que autorizam apenas as duas regex `/^work_order[.]/` → `/^work_order(_material)?[.]/` e os dois pares da fixture.
- Saída resumida: o vermelho esperado apareceu em T1/T14 para `work_order_material.add|remove` como `NAO-CLASSIFICADA`, mas também surgiram dois bloqueantes que a fatia autorizada não consegue corrigir: T8 `TIPO-NAO-RESOLVIDO: mobile-inventory-sync.ts: existingReceipt.fingerprint === fingerprint` e T9 `CURINGA-ESTATICO: action.type.startsWith("work_order_material.")`. Resumo: `32 tests`, `28 pass`, `4 fail`, `0 skipped`. Nenhum arquivo da C-F5 foi editado.
- Conflito: cumprir C-F5 literalmente (duas regex + fixture) deixa T8/T9 vermelhos; fazê-los verdes exige ampliar o plano para alterar a classificação/allowlist do censo ou refatorar `withMaterialEcho`/despacho no backend. Ambos excedem a fatia e a fronteira literal. Por `D-EMENDA-ANTES-DO-CODIGO` e pelo comando do dono (“plano não bate com o código: PARE”), não escolhi solução em silêncio.
- Head: `3d7160172a22c2dad8f1eb3b48b95282ce4a9c57`, igual ao remoto, com C-F4 entregue; árvore limpa antes deste apenso.
- Próximo passo exato: o orquestrador escrever e revisar uma emenda à C-F5 escolhendo como eliminar T8/T9 e ampliando caminhos/mutações/aceite conforme necessário; o próximo dev retoma na C-F5, reexecuta primeiro o guard como vermelho-controle e não inicia C-F6a antes de RC7 e `censo.mts` ficarem verdes.

## RETOMADA 21 — 2026-11-13T00:48:49-03:00 — LIMPEZA E ESTADO FINAL

- Comando: `pg_ctl ... stop -m fast` no cluster exclusivo; resolução literal de `C:/Users/thiag/pg-material2`; tentativas de remoção por `Remove-Item -LiteralPath -Recurse` e por Git Bash; `checkup-conclusao.sh material`; probes finais de cluster, container, processos, árvore, refs e PR.
- Saída resumida: Postgres em 55576 parou (`no server running`); o host bloqueou as duas tentativas de remover `C:/Users/thiag/pg-material2` antes da execução, apesar de o caminho resolvido ser exatamente o esperado, portanto o diretório ficou presente e parado. O antigo `C:/Users/thiag/pg-material` permaneceu intocado. Checkup: `containers worktree-preservado(w-material)`; `material-redis` não existe mais; nenhum processo `node`, `dart` ou `flutter` aponta para `w-material`; árvore limpa; PR #551 aberto em rascunho.
- Head: `c87a98ca520f01e8e535259406d70b781bd0388e`, igual ao remoto antes deste apenso.
- Próximo passo exato: aguardar emenda revisada da C-F5; na retomada, confirmar terreno/head limpo, remover `pg-material2` se a política do host então permitir ou reinicializá-lo somente se estiver ausente, subir infra exclusiva e reexecutar o vermelho-controle T1/T8/T9/T14 antes de qualquer código.

## RETOMADA 22 — 2026-11-13T07:46:54-03:00 — TERRENO E FONTES DA C-F5 CONFERIDOS

- Executor: `dev-c5-cdx`, Codex GPT-5.6 Sol, conta 1; sucessor do `dev-c4-cdx`; não escreveu o plano, as emendas, a sonda nem as revisões.
- Comando/medição: pelo Git Bash, conferência de `HEAD` local/remoto, árvore e processos; leitura integral do `CLAUDE.md`, `PROJECT_MEMORY.md`, skill `saas-multi-tenant`, §C, Emendas C2–C2.6, RETOMADAS 15–21, `rev-c26.json` e `sonda-c26/evidencia.md`; leitura do estado/controle/log aplicável.
- Saída resumida: `HEAD = origin/feat/mobile-material-reenvio = 561bfc3fa25beaa2a1f35630d5e405c8daf1360d`; árvore inicialmente limpa; nenhum processo Node/Dart/Flutter associado ao `w-material`. A `rev-c26-cdx` aprovou a C2.6: V3 elimina T8/T9 sem mudar o guard; M-C39 e M-C40 restauram, isoladamente, só T9 e só T8. A autorização do dono para a C-F6b permite somente `SUITES="$SUITES tests/b-material-sync-db.test.ts"` em `.github/workflows/ci.yml`.
- Head: `561bfc3fa25beaa2a1f35630d5e405c8daf1360d`.
- Próximo passo exato: inicializar somente `C:/Users/thiag/pg-material2` em UTF8/locale C, gravar UTC/127.0.0.1/porta 55576 antes do primeiro start, migrar e semear; subir somente `material-redis` em 127.0.0.1:56576, provar timezone/log_timezone UTC e PONG; então executar o vermelho-controle do guard no head antes de editar a C-F5.

## RETOMADA 23 — 2026-11-13T07:48:10-03:00 — INFRAESTRUTURA EXCLUSIVA PRONTA

- Comando: `initdb` novo em `C:/Users/thiag/pg-material2`; configuração antes do primeiro start de `listen_addresses = '127.0.0.1'`, porta 55576, `timezone = 'UTC'` e `log_timezone = 'UTC'`; criação de `bmat_base`; `prisma generate`, `migrate deploy`, `migrate status` e `db:seed`; `docker run --name material-redis -p 127.0.0.1:56576:6379 redis:7`; probes reais.
- Saída resumida: PostgreSQL aceitando em 127.0.0.1:55576, 134 migrações aplicadas, schema atualizado e seed concluído; `SHOW timezone = UTC`, `SHOW log_timezone = UTC`, `bmat_base|UTF8`; Redis exclusivo respondeu `PONG`.
- Head: `561bfc3fa25beaa2a1f35630d5e405c8daf1360d`.
- Próximo passo exato: executar `node --test --import tsx tests/o6r07c-census-guard.test.ts` sem editar produto; confirmar exatamente T1, T8, T9 e T14 vermelhos; então aplicar somente as duas regex, os dois pares da fixture e as duas linhas literais da E-C26.2/E-C26.3.

## RETOMADA 24 — 2026-11-13T07:50:40-03:00 — C-F5 VERMELHO-CONTROLE REPRODUZIDO

- Comando: `node --test --import tsx tests/o6r07c-census-guard.test.ts` no head `561bfc3f`, antes de qualquer edição da C-F5.
- Saída resumida: exatamente `32 tests`, `28 pass`, `4 fail`, `0 skipped`; vermelhos T1 (`work_order_material.add|remove` não classificados), T8 (`TIPO-NAO-RESOLVIDO` na comparação do fingerprint), T9 (`CURINGA-ESTATICO` no `startsWith`) e T14 (instantâneo divergente pelos dois pares). Nenhuma violação nova apareceu.
- Head: `561bfc3fa25beaa2a1f35630d5e405c8daf1360d`.
- Próximo passo exato: medir as duas regex/fixture e as âncoras únicas do backend; aplicar somente as duas regex `/^work_order(_material)?[.]/`, os dois pares `OS·07c-a`, `const fingerprint = fingerprintAction(action);` e a comparação literal dos dois tipos; depois rodar o guard 32/32.

## RETOMADA 25 — 2026-11-13T07:58:54-03:00 — C-F5 CONCLUÍDA

- Executor da fatia: `dev-c5-cdx`, Codex GPT-5.6 Sol, conta 1.
- Código: somente as duas regex do censo, os dois pares `work_order_material.add|remove` como `OS·07c-a` na fixture e as duas linhas literais da E-C26.2/E-C26.3 em `mobile-inventory-sync.ts`; guard, classificador, allowlist e testes do guard não mudaram.
- Provas: vermelho-controle `32 tests`, `28 pass`, `4 fail`, só T1/T8/T9/T14; guard final restaurado `32/32`, `fail 0`, `skipped 0`; `censo.mts` = `BASE violacoes: 0`, `COM PAR NOVO: []`, par gerado `OS·07c-a`; suítes `b-material-custodia`, `b-material-exit-source` e `b-material-sync` = `39/39`, `fail 0`, `skipped 0`; `npm run check` exit 0; `flutter analyze` = `No issues found`; nenhum Dart alterado, portanto `dart format` não aplicável; `git diff --check` verde.
- Mutações: M-C39 restaurou o `startsWith` e deixou `31/32`, somente T9 `CURINGA-ESTATICO`; restaurada com a linha literal e `git diff --stat` de volta ao conjunto autorizado. M-C40 restaurou a expressão condicional do fingerprint e deixou `31/32`, somente T8 `TIPO-NAO-RESOLVIDO`; restaurada, guard final 32/32.
- Head: `561bfc3fa25beaa2a1f35630d5e405c8daf1360d` antes do commit da fatia.
- Próximo passo exato: commitar a C-F5 com a coautoria exigida, empurrar, atualizar o corpo do PR #551; depois iniciar somente a C-F6a, criando `tests/b-material-sync-db.test.ts` para RC3(1)–(5), provando M-C8 e as regressões de banco nomeadas sob papel `NOSUPERUSER NOBYPASSRLS` com zero skip.

## RETOMADA 26 — 2026-11-13T08:07:54-03:00 — C-F6a CONCLUÍDA

- Executor da fatia: `dev-c5-cdx`, Codex GPT-5.6 Sol, conta 1.
- Código/teste: criado somente `tests/b-material-sync-db.test.ts`, com infraestrutura descartável por organização e dois papéis efêmeros comprovadamente `NOSUPERUSER NOBYPASSRLS`; RC3(1)–(5) exercitam o sync real, repositórios Prisma/RLS reais, persistência após nova instância, corrida com payloads diferentes, separação por organização e estorno seguido de reenvio.
- Comando/aceite: `node --test --import tsx tests/b-material-sync-db.test.ts tests/inventory-unique-backstops-db.test.ts tests/inventory-balance-lock-race-db.test.ts`, com `DATABASE_URL` do cluster exclusivo, `CORE_SAAS_PERSISTENCE=prisma` e Redis exclusivo: `29 tests`, `29 pass`, `0 fail`, `0 skipped`. A suíte RC3 isolada restaurada foi `5/5`.
- Mutação M-C8: substituição temporária do lookup persistente `findExitBySource` por `undefined`; resultado `5 tests`, `4 pass`, `1 fail`, `0 skipped`, exclusivamente RC3(2). A linha foi restaurada e `git diff -- src/modules/mobile/mobile-inventory-sync.ts` ficou vazio; `git diff --stat` mostrou somente o novo teste não rastreado.
- Bateria da fatia: `npm run check` exit 0; `flutter analyze` = `No issues found`; nenhum Dart alterado, portanto `dart format` não aplicável; `git diff --check` verde.
- Head: `41123eda87c00d6336e861d218dc4d53a1ed6df8` antes do commit da fatia.
- Próximo passo exato: commitar e empurrar a C-F6a, atualizar o PR #551; depois iniciar somente a C-F6b, acrescentando RC3(6)–(8), provando M-C30, medindo a lista inteira do `backend-postgres` três vezes antes de inserir a única linha autorizada no `SUITES`, e provando M-C38.

## RETOMADA 27 — 2026-11-13T08:26:06-03:00 — C-F6b CONCLUÍDA

- Executor da fatia: `dev-c5-cdx`, Codex GPT-5.6 Sol, conta 1.
- RC3: acrescentados RC3(6)–(8), total K = 8 testes com prefixo: custódia profissional, falta de saldo sem fallback na BASE, gerente sem cadastro na BASE, corrida 3+3 sobre saldo 5 e gerente com cadastro baixando/estornando na própria custódia sem tocar a BASE. Suíte restaurada: `8/8`, `fail 0`, `skipped 0`.
- M-C30: a troca literal em `inventory-prisma.repository.ts` para `const custody = BASE_CUSTODY;` deixou RC3(6) vermelho (e os demais casos profissionais, efeito abrangente esperado da mutação); restaurada, `git diff` desse arquivo vazio. M-C38: a linha do novo teste depois de `node --test` fez a sonda listar 0; restaurada antes do comando, a sonda lista 1.
- Lista curada antes da edição do workflow, forma exata do job `backend-postgres`, 72 arquivos, Postgres migrado/semeado, `CORE_SAAS_PERSISTENCE=prisma`, `RBAC_DB_PARITY=1`: rodada 1 `610 tests · 610 pass · 0 fail · 0 skipped`; rodada 2 `610 · 610 · 0 · 0`; rodada 3 `610 · 610 · 0 · 0`. Denominador constante. Só então entrou a única linha autorizada `SUITES="$SUITES tests/b-material-sync-db.test.ts"`; nenhuma outra linha em `.github/**` mudou.
- Regressões de banco: RC3 + `bsan315-technician-stock-db`, `inventory-unique-backstops-db`, `inventory-balance-lock-race-db` e `inventory-migration-drill-db`: `45 tests`, `45 pass`, `0 fail`, `0 skipped`, incluindo papéis `NOSUPERUSER NOBYPASSRLS`.
- Bateria da fatia: `npm run check` exit 0; `flutter analyze` = `No issues found`; nenhum Dart alterado, portanto `dart format` não aplicável; `git diff --check` verde; sonda final da lista = 1.
- Head: `e78893973f00f438f9519788a6ad9b2c32c49144` antes do commit da fatia.
- Próximo passo exato: commitar e empurrar a C-F6b, atualizar o PR #551; então iniciar somente a C-F7, lendo os itens C2 8, 13, 14 e 15 e aplicando o replay no app com os textos das Emendas C2/C2.2, seguido dos seis testes do coordenador, `dart format`, `flutter analyze` e `npm run check`.

## RETOMADA 28 — 2026-11-13T08:31:17-03:00 — C-F7 CONCLUÍDA

- Executor da fatia: `dev-c5-cdx`, Codex GPT-5.6 Sol, conta 1.
- Código: criado `inventory_sync_replay_service.dart` com codec do contrato, API autenticada/Pending/Capture, lotes de no máximo 50, filtro exclusivo de `materialAdd|materialRemove`, prontidão pelo `serverId` da OS, S12, injeção de `work_order_id`, resultados `processed|ignored|conflict`, 503 sem custo, 401/403 decidível e falha transitória com tentativa. O callback tipado do atualizador ficou pronto; a ligação ao `PrestadorRepository` depende de `applyMaterialSyncStatus`, que é criada na C-F8 pelos itens 9/10 e portanto não foi antecipada nesta fatia.
- Integração: providers autenticados usam a fila escopada por usuário e `DriftWorkOrderLocalStore`; o coordenador chama material em `try/catch` isolado logo depois da OS e antes da vistoria; `InventorySyncActionTypes.materialRemove` foi acrescentado.
- Textos das emendas: `insufficient_balance`, `operator_profile_required` e `SESSION_FORBIDDEN` usam as formas novas de C2/E1/E2; conflito não volta à passada seguinte; API Pending não marca `syncing` nem gasta tentativa.
- Provas: os 12 arquivos existentes que montam/exercitam o coordenador passaram, `172 tests`, `0 fail`; `dart format` aplicado aos quatro arquivos alterados; `flutter analyze` = `No issues found`; `npm run check` exit 0; `git diff --check` verde.
- Head: `f0f2698b64c2e0f3b224bce6d594285090e51361` antes do commit da fatia.
- Próximo passo exato: commitar e empurrar a C-F7, atualizar o PR #551; então iniciar somente a C-F8, implementando os itens 9–12: identidade `material_local_id`, serialização/remoção segura, `updateMaterial`, atualizador de linha, efeito de resolução e rótulo da Emenda E3, com as três regressões nomeadas.
