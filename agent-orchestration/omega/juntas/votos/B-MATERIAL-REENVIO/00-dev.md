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
