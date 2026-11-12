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
