# Diário do dev — B-SAN3-08 (itens 40 e 41 do portão)

- **autor:** `dev-san3-08-cl` — Claude Opus 5.5 (subagente da sessão), dev, identidade nova. Não planejou nem criticou.
- **verificador:** a definir pelo orquestrador (§C7.11(1): da outra casa, Codex, se houver crédito).
- **fontes, em ordem de prevalência:** `D-PORTAO-7-RECOMENDACOES-1011` e `D-PORTAO-3-RECOMENDACOES-1111`
  (`REGISTRO-PENDENTE.md` l.909-911 e l.930-933) → emenda 1 (`planos/plano-B-SAN3-08-emenda1.md`) → plano v1
  (`planos/B-SAN3-08-plano.md`) → crítica `crit-08-cl` (`revisoes/crit-08-plano.json`).
- **terreno:** worktree próprio `C:/Users/thiag/w-san308`, ramo `feat/web-orcamento-aprovar-destino` a partir da
  `origin/main` `6f727afc0ed9eb40449d34cafb5ebf00a47c52f5` (medida em 2026-11-11 01:56 SP). `npm ci` e
  `npm --prefix frontend ci` próprios, sem junction, ambos `ec=0`.
- **ref do plano × ref do dev:** o plano e a emenda mediram `d5ec1696`. `git diff --stat d5ec1696 HEAD` nos caminhos do bloco
  (`frontend/src/modules/registry/service-quotes`, `QuoteTab.tsx`, `src/modules/service-quotes`, `frontend/tests`,
  `tests/service-quote-approve.test.ts`) → vazio. Os `arquivo:linha` do plano valem na base do dev.
- **mecânica de ramo e commit:** por ordem do orquestrador, o ramo é `feat/web-orcamento-aprovar-destino` (o v1 citava
  `fix/orcamento-destino-e-papel-financeiro`) e o prefixo é `feat(web-orcamentos): …`. Este diário, em
  `docs/revisoes/SAN3/`, também é por ordem do orquestrador (fica declarado fora da lista PERMITIDA do v1 para o revisor).

Formato P1: comando → saída resumida → veredito parcial.

## Linha de base (antes de qualquer edição)

- `node --test --import tsx tests/service-quotes.smoke.test.tsx tests/work-order-quote-tab.test.tsx tests/work-orders-honest-errors.test.tsx`
  (a partir de `frontend/`) → `# tests 85 # pass 85 # fail 0 # skipped 0` (14 + 5 + 66). Veredito: regressões verdes na base.
- `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/service-quote-approve.test.ts` → `# tests 16 # pass 16 # fail 0`.
  Veredito: regressão do backend verde na base.

## F0 — paridade do corpo (P1, R-A4 no servidor)

- **F0.1 builder como cópia literal de hoje.** `service-quote-approve.model.ts` nasceu com o mapeamento snake_case de
  `service-quotes.service.ts:111-121`, sem coordenadas. Veredito: pré-condição do vermelho-controle montada.
- **F0.2 teste novo** `tests/san3-08-aprovar-orcamento-destino.test.ts`: [P1], [P1-b], [P1-pino], ligando o builder da web ao
  `ServiceQuoteService.approve` real (memória), com serviço `requires_destination: true` e tarifa publicada.
- **F0.3 vermelho-controle (02:00 SP).** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/san3-08-aprovar-orcamento-destino.test.ts` →
  `not ok 1 - [P1] … error: 'o approve recusou o corpo da web: 422:destination_required · corpo={"service_address":"Rua da Coleta, 10","destination_address":"Oficina Central, 200","activation_mode":"guincho"}'`
  · `ok 2 - [P1-b]` · `not ok 3 - [P1-pino] … 422:destination_required · corpo={}` · `# pass 1 # fail 2`.
  Veredito: a hipótese do Fato 3 vale também na base `6f727afc` (o servidor não lê snake_case; a sonda A da crítica reproduzida).
- **F0.4 verde.** Builder em camelCase, com as 4 coordenadas (R-A4.1/2) em `ServiceQuoteApprovePayload`; campo vazio fora do
  corpo; `activationMode` só espaços fora do corpo → `# tests 3 # pass 3 # fail 0`.
- **F0.5 mutações literais** (script `mut.mjs` no scratchpad: `grep -cF` âncora = 1, aplica, roda, restaura byte a byte;
  `CORE_SAAS_PERSISTENCE=memory` exportado):
  - **M1** `destinationAddress: payload.destinationAddress,` → `destination_address: payload.destinationAddress,` · âncora = 1 ·
    `not ok 1 - [P1] … 422:destination_required` · `# fail 1` · restaurado=true. Vermelha.
  - **M1b** apagar `destinationLatitude: toCoordinate(payload.destinationLatitude),` · âncora = 1 ·
    `not ok 3 - [P1-pino] … 422:destination_required · corpo={"destinationLongitude":-46.63}` · restaurado=true. Vermelha.
  - **M2** `destinationAddress: payload.destinationAddress,` → `destinationAddress: payload.destinationAddress ?? "x",` · âncora = 1 ·
    `not ok 2 - [P1-b] … 'Missing expected rejection.'` (e o [P1-pino] também cai, porque o "x" vira endereço) · restaurado=true. Vermelha.
  - controle sem mutação depois das três → `# pass 3 # fail 0`.
  - **nota de terreno:** a 1ª rodada das mutações passou `CORE_SAAS_PERSISTENCE=memory` como prefixo do comando, que o `cmd.exe`
    do `spawnSync` não entende; saiu `ec=1` sem TAP. Não contou como vermelho; refeita com a variável exportada (acima).
- **F0.6 ligação.** `approveServiceQuote` passa a mandar `buildServiceQuoteApproveBody(body)`. `npm --prefix frontend run check` → ok.
  `node --test --import tsx tests/san3-08-aprovar-orcamento-destino.test.ts tests/service-quote-approve.test.ts` (memória) →
  `# tests 19 # pass 19 # fail 0 # skipped 0`. Veredito: F0 verde.

## F1 — diálogo único de aprovação (R-A2, R-A4, R-A5, R-A6, R-A8, R-A9, acabamento)

- **Tela-modelo:** `frontend/src/modules/registry/service-quotes/components/ServiceQuoteFormModal.tsx` (mesmo `Modal`, `Input`,
  `Alert`, `Button` de `components/ui`, mesma grade de 2 colunas, mesmo `Field` com erro abaixo do campo e `aria-describedby`).
  Campos e cópia de origem e destino dos cards de `WorkOrderForm.tsx:257-280`. `Accordion` da biblioteca para o "Adicionar destino".
  Sem componente novo na biblioteca: todos os blocos já existiam. Skills: `ts-frontend-full` (implementar) e `ui-ux-pro-max` (revisar).
- **Decisão do dono aplicada:** o diálogo herda a aparência, sem as 3 opções e sem seletor (`D-PORTAO-7-RECOMENDACOES-1011`); só
  tokens `var(--…)` no diálogo.
- **Arquivos:** modelo `service-quote-approve.model.ts` (+ `DestinationRule`, `loadDestinationRule`, `hasRealDestination`,
  `validateApproveForm`, `toApprovePayload`, `approveErrorOutcome`, `createApproveSubmitter`, `submitApprove`); diálogo novo
  `components/ServiceQuoteApproveDialog.tsx`; `QuoteTab.tsx` e `OrcamentosPage.tsx` só abrem o diálogo; testes em
  `frontend/tests/service-quotes.smoke.test.tsx` (+11), `frontend/tests/work-order-quote-tab.test.tsx` (+4) e
  `frontend/tests/work-orders-honest-errors.test.tsx` (só `GUARDED_FILES`, as 2 constantes e as 2 asserções do R-A8).
- **Vermelho-controle (02:12 SP),** testes novos sobre o objeto da F0 (`1b9b674c`), com as mudanças de `src/` da F1 guardadas por
  `git stash push -u` e devolvidas por `git stash pop` (stash `b4aed1ea`, descartado no pop):
  `node --test --import tsx tests/service-quotes.smoke.test.tsx tests/work-order-quote-tab.test.tsx tests/work-orders-honest-errors.test.tsx`
  → `# tests 100 # pass 84 # fail 16`: `not ok 15 [G-APPROVE]` com o diagnóstico
  `[G-APPROVE] arquivos=667 · chamadas=3 (no diálogo=0) · fora=2 · rotas=1 · rota fora=0` (os 2 de fora são
  `OrcamentosPage.tsx:108` e `QuoteTab.tsx:106`, conferidos por `grep -rn "approveServiceQuote(" src`); `not ok 16` a `25`
  (modelo e aviso por ausência: `approvedNoticeFor is not a function`); `not ok 31` a `34` (diálogo por ausência);
  `not ok 90 [G1]` (`diálogo de aprovação presente nas raízes`). Veredito: todo caso novo nasce vermelho no objeto anterior.
- **Verde.** Mesmo comando → `# tests 100 # pass 100 # fail 0 # skipped 0` (85 da base + 15 novos). Diagnósticos:
  `[G-APPROVE] arquivos=668 · chamadas=2 (no diálogo=1) · fora=0 · rotas=1 · rota fora=0`;
  `[G1] raízes=92 (por pasta 73/16 + 3 arquivo) · fecho=59 · referências de origem mock nas raízes=20 (guardadas=20) · vazamentos raiz/fecho=0/0`;
  `[G1b] literais de objeto em ramo de falha vistos nas raízes=20 · com identidade constante=0`.
  **Risco do R-A8:** o `[G1]` ficou verde com o diálogo nas raízes (o fecho inclui `service-catalog.service.ts`); não houve
  vermelho anterior ao bloco, então não há emenda 2.
- **Mutações literais, uma por vez** (`mut.mjs`: `grep -cF` âncora = 1 antes de aplicar; restaurado byte a byte; logs
  `mut-f1-a/b/c.log` no scratchpad). Todas com âncora = 1 e `restaurado=true`; todas vermelhas:

  | ID | Teste vermelho (TAP) |
  |---|---|
  | M3a | `not ok 19 [R-A5] unknown não bloqueia` (e `not ok 21 [P3]`) |
  | M3b | `not ok 20 [R-A5] required bloqueia` (e `16 [P2]`, `17 [R-A4]`) |
  | M3c | `not ok 17 [R-A4] destino por pino, 0/0 e faixa` |
  | M3d | `not ok 17 [R-A4]` (o caso 0/0) |
  | M4a | `not ok 18 [R-A5] derivação` (o lançar) |
  | M4b | `not ok 18 [R-A5] derivação` (o null) |
  | M5 | `work-order-quote-tab` `not ok 6 [R-A5] … destino obrigatório` · `error: 'o marcador de obrigatório no endereço de destino'` |
  | M6 | `not ok 23 [R-A2] envio duplo` |
  | M7a | `not ok 22 [R-A2] desfechos` (409) |
  | M7b | `not ok 22 [R-A2] desfechos` (403) |
  | M7c | `not ok 22 [R-A2] desfechos` (404) |
  | M8 | `not ok 21 [P3]` |
  | M9a | `not ok 24 [R-A9] modo vazio não bloqueia` (e 16, 17, 19, 21, 23: todo envio sem modo vira inválido) |
  | M9b | `work-order-quote-tab` `not ok 8 [R-A9] … até 120 caracteres` |
  | M10a | `not ok 15 [G-APPROVE]` · `+ 'modules/work-orders/components/tabs/QuoteTab.tsx:327 (alias)'` |
  | M10b | `not ok 15 [G-APPROVE]` · `+ 'modules/registry/service-quotes/pages/OrcamentosPage.tsx:422 (texto)'` e `(namespace)` |
  | M10c | `not ok 15 [G-APPROVE]` (rota) · `+ 'modules/work-orders/components/tabs/QuoteTab.tsx:326'` |
  | M11a | `work-orders-honest-errors` `not ok 57 [G1b] entidade fabricada inline` |
  | M11b | `work-orders-honest-errors` `not ok 56 [G1]` · `error: 'diálogo de aprovação presente nas raízes: …'` |
  | M14 | `not ok 25 [acabamento] o aviso de sucesso … não imprime o identificador` |

  Controle sem mutação depois de todas → `# tests 100 # pass 100 # fail 0`.
  - **Notas de aplicação, sem troca de mutação:** M3d apaga o trecho `&& !(lat === 0 && lng === 0)` (âncora literal = 1),
    junto do espaço que o precede, para a linha continuar válida. M8 apaga a linha `case "destination_required":` e o `return`
    seguinte, que é de uma linha só. M9a acrescenta a linha logo depois de `const errors: string[] = [];`. M9b troca
    `maxLength={120}` por nada. M10a a M10c e M11a são acrescentadas ao fim do arquivo (âncora "fim do arquivo").
- **Leituras do dev, declaradas (§A6), sem mudar requisito:**
  1. `onNotice` recebe também o tom (`"info" | "danger"`): a tabela do R-A2 distingue `close_and_reload_notice` (aviso) de
     `close_and_reload` (erro), e os 4 callbacks da emenda não tinham onde levar a mensagem de erro de quem fecha e recarrega.
  2. Enquanto o diálogo confere o serviço, **Aprovar fica desabilitado e Cancelar não**. A leitura do serviço tem teto de 8 s
     (`withTimeout` no diálogo, passado ao `loadDestinationRule` injetado); passou disso, a regra vira `"unknown"`, que não bloqueia.
  3. A recusa `destination_required` do servidor nunca é desfeita por uma leitura do catálogo que chegue depois
     (`setRule((current) => (current === "loading" ? loaded : current))`).
  4. O aviso de sucesso da tela Orçamentos virou `approvedNoticeFor` + `ActionNoticeBody`, exportados da página para o teste.
     O estado do aviso passou a guardar `{ text, workOrderId }` atrás de um `setActionNotice(text, workOrderId?)`, para as linhas
     do Compartilhar e do Anular ficarem iguais.
  5. A aba Orçamento ganhou um aviso informativo (sucesso e "já aprovado"), com o mesmo estilo inline em hex que o próprio
     arquivo usa no cartão de erro.
  6. `messageForError` (`QuoteTab.tsx`) e `messageForQuoteError` (`OrcamentosPage.tsx`) continuam, só para o Compartilhar.
- **Revisão `ui-ux-pro-max` (pelo dev, não substitui o revisor):** acrescentado `role="alert"` em volta do erro do servidor;
  carregando com `role="status"`; foco no primeiro campo inválido e no endereço de destino depois da recusa do servidor; botões
  do rodapé com 44 px; PT-BR sem termo técnico. Fica como está, igual à tela-modelo: o `Modal` da biblioteca não fecha por ESC nem
  pelo fundo (fora da fronteira do bloco).
- `npm --prefix frontend run check` → ok.

## F2 — o Financeiro com as permissões do banco (P4, item 41, CE-5 e CE-G2)

- **Teste novo** `tests/san3-08-financeiro-cria-orcamento-db.test.ts`, no arnês do `san3-04a` (papel efêmero
  `NOSUPERUSER NOBYPASSRLS` por `createEphemeralRole`, postura asserida, app importado depois de `CORE_SAAS_PERSISTENCE=prisma`,
  JWT real, dois braços declarados no nome de cada passo). **Um `t.test()` por passo** (i) a (v) (emenda §4.1). **Segregação:**
  `finance-A` cria, `finance-B` aprova, com o mesmo papel (emenda §4.2); o teste não afirma autoaprovação.
  `SERVICE_QUOTE_PERMISSIONS` é lido da rota (import dinâmico depois de fixar o modo, para o `env.ts` não congelar em `memory`).
  Cadastro semeado pela conexão administrativa: dois serviços `requires_destination: true` (um para o manual, outro para a tarifa)
  e uma tabela `published` com tarifa de 380. Limpeza escopada à organização do teste, em passadas por toda tabela com `tenant_id`,
  que LANÇA se sobrar linha.
- **Terreno:** cluster descartável próprio `san308-pg` (`postgres:16`, `127.0.0.1:55934`, banco `erp_san308`), criado às 02:18 SP;
  `npx prisma generate` e `npx prisma migrate deploy` → `All migrations have been successfully applied.` Nenhum outro container
  foi tocado. Linha de base no braço 2: `tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts` → `# tests 26 # pass 26 # fail 0`.
- **Braço 2 (base só migrada, a forma do job `backend` da CI)** →
  `ok 1 (i)` · `ok 2 (ii)` · `ok 3 (iii)` · `ok 4 (iv)` · `ok 5 (v)` · `# tests 6 # pass 6 # fail 0 # skipped 0`. Resíduo depois:
  `select count(*) from tenants where slug like 'san3-08-%'` → 0; usuários `san3-08-%` → 0.
- **Braço 1 (base provisionada, obrigatório na revisão).** `npm run db:provision-rbac` no mesmo cluster →
  `CONVERGIDO — banco reflete o catálogo` (12 papéis, 929 concessões). Teste →
  `[braço 1 — base PROVISIONADA (papel global)]` `ok 1` a `ok 5` · `# tests 6 # pass 6 # fail 0 # skipped 0`. Resíduo → 0 e 0.
- **Mutações literais** (`mut.mjs`, âncora = 1, `restaurado=true`; nunca commitadas; logs `mut-f2-braco1.log` e
  `mut-f2-braco2.log` no scratchpad), nos dois braços:
  - **M12** `src/modules/service-quotes/service-quote.routes.ts:18` `  create: "service_quotes:create",` →
    `  create: "service_quotes:approve_x",` · `not ok 1 (i)` (`permissão comparada pela rota ausente nas linhas do banco`,
    `'service_quotes:approve_x'`) e `not ok 3 (iii)` com
    `POST /service-quotes manual → 403 {"error":{"code":"FORBIDDEN","reason":"permission_required",…` · (iv) e (v) caem em
    cascata (`sem o orçamento … do passo (iii)`) · `# pass 1 # fail 5`. Vermelha, e o 403 da rota é observado (fecha a A7(d)).
  - **M13** (= M1 no modelo) `destinationAddress: payload.destinationAddress,` → `destination_address: …` ·
    `not ok 4 (iv)` com `POST /approve → 422 {"error":{"code":"WORK_ORDER_UNPROCESSABLE","reason":"destination_required",…` ·
    `# pass 4 # fail 2`. Vermelha. É também o vermelho-controle do (iv) "no objeto de hoje": o corpo snake_case recusado.
  - (i) a (iii) passam no objeto de hoje porque o #390 já concedeu as permissões (declarado no v1); o vermelho delas vem da M12.
- **Fato medido, sem mudança de requisito:** o approve responde **200**, não 201 (`service-quote.controller.ts:86` devolve
  `{ data }` sem `status`, e `sendResult` usa 200). O v1 dizia "→ 201" no passo (iv); o teste afirma 200, que é o comportamento
  do servidor, que este bloco não muda.
- **Cuidado de paralelismo, conferido:** nenhuma outra suíte cria papel `finance` GLOBAL (`grep -rn 'key: "finance"' tests/` só
  acha papéis da organização em `financial-title-invariants-db` e a leitura do `b-san3-12-ce4-db`), então a escolha do braço não
  é contaminada no job `backend`.

## F3 — registro

- Comando novo `agent-orchestration/codex/comandos/B-SAN3-08-orcamento-destino-e-papel-financeiro.md`; apenso em
  `agent-orchestration/codex/log-execucao.md`.
- `pendencias.md`: linha de encerramento (não a de status, que muda no registro pós-merge) em `P-Ω3F4C-ACTIVATION-PROMPT` e na
  parte do item 41 da `P-Ω3a`, com os testes de encerramento; 6 pendências novas: `P-SAN3-08-APPROVE-BACKEND-SO-CAMELCASE`,
  `P-SAN3-08-APROVAR-NA-OS-CRIA-OS-NOVA`, `P-SAN3-08-RESOLVER-TIPO-FAIL-OPEN` (§8 do v1), `P-SAN3-08-ORCAMENTO-SEM-ALCADA`,
  `P-SAN3-08-APPROVE-OS-NAO-ATOMICA` (dono `B-O6R-09`, pela Q1 (c)) e `P-SAN3-08-CATALOGO-PLATFORM-ADMIN-APROVA` (§5 da emenda).
  **Leitura do dev, declarada (§A6):** a `P-Ω3a` tem também o aditivo `quotes[]` no detalhe da OS (diferido para Ω3-e), que não é
  deste bloco; o orquestrador decide se ele vira entrada própria antes de a linha de status fechar.
- **Cuidado com o classificador do índice** (família `P-INDICE-PENDENCIAS-CRITICA-COMO-SEVERIDADE`): na 1ª geração, as entradas
  novas que citavam "a crítica `crit-08-cl`" saíram como `CRÍTICA`, e a que dizia "proposta de ALTA" saiu `ALTA`. A redação passou
  a "o parecer `crit-08-cl`" e "proposta de subir um nível", sem mudar conteúdo; regenerado, cada uma sai com a gravidade da linha
  de status (4 MÉDIA, 2 BAIXA). `python agent-orchestration/controle/gerar-indice-pendencias.py` →
  `indice: 816 cabecalhos / 805 IDs | {'FECHADA': 193, 'ABERTA': 619, 'SEM-STATUS': 4}`; segunda geração byte a byte igual
  (`cmp` → sem diff residual). O diff grande do índice é o deslocamento de linha das entradas depois da l.437.
- `decisoes.md`: `D-SAN3-08-DIALOGO-SEM-TRES-OPCOES` (a dispensa das 3 opções, por decisão do dono), `D-SAN3-08-PORTAO-Q1-Q2`,
  `D-SAN3-08-P1-CORPO-CAMELCASE` e `D-SAN3-08-NIVEL-DE-REVISAO` (a divergência do §5, registrada e não escolhida em silêncio).
  Os IDs `D-PORTAO-7-RECOMENDACOES-1011` e `D-PORTAO-3-RECOMENDACOES-1111` ficam para o registro do orquestrador, para não nascer
  cabeçalho duplicado.
- **Escopo, conferido por laço:** `git diff --name-only origin/main...HEAD` mais o não commitado = 17 caminhos, todos na lista
  PERMITIDA do v1 com os acréscimos da emenda (e este diário, por ordem do orquestrador); `git diff --stat origin/main...HEAD --
  Kpis prisma .github src` → vazio. **Trava 10(2):** nenhum caminho de `src/**`, `prisma/**`, `.github/**`, `catalog.ts`,
  `RBAC_MATRIX.md`, `frontend/src/modules/auth/**`, `frontend/src/providers/**`; `git diff -U0 origin/main...HEAD | grep -E
  '^[-+].*(permissions\.includes\(|can\(|requirePermission\()'` → nenhuma linha.

## Bateria final (saída lida, não só o código de saída)

1. `npm ci` e `npm --prefix frontend ci` no worktree próprio → `ec=0` e `ec=0`.
2. Raiz, sem `DATABASE_URL` (o runner fixa `CORE_SAAS_PERSISTENCE=memory`), 02:25–02:31 SP: `npm run check` `ec=0` · `npm run lint`
   `ec=0` · `npm run build` `ec=0` · `npm test` → `464 arquivo(s) · 4134 teste(s) · pass 4000 · fail 1 · skipped 133`. O único
   vermelho é `tests/core-saas-role-authority.test.ts`, que morre no carregamento com `DATABASE_URL is required to initialize Prisma
   Client.` porque o worktree não tem `.env`: **ambiente, fora do bloco** (arquivo não tocado). Com `DATABASE_URL` do cluster
   descartável, sozinho → `# tests 12 # pass 12 # fail 0`. Os dois `san3-08` em memória aparecem verdes; o `-db` declara o pulo.
3. `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/san3-08-aprovar-orcamento-destino.test.ts tests/service-quote-approve.test.ts`
   → `# tests 19 # pass 19 # fail 0 # skipped 0`.
4. `-db`, cluster descartável `san308-pg`: braço 2 e braço 1 da F2, cada um `# tests 6 # pass 6 # fail 0`;
   `tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts` → `# tests 26 # pass 26` (braço 2). Suíte inteira com `DATABASE_URL`
   no cluster (já provisionado para o braço 1), 02:34–02:46 SP: `464 arquivo(s) · 4893 teste(s) · pass 4878 · fail 13 · skipped 2`,
   com `ok 3631 - san3-08 — o Financeiro cria e aprova …`, `ok 3596 - san3-04a T2 …` e os 3 `[P1…]` verdes. Os 7 arquivos vermelhos
   são de fora do bloco e do terreno desta máquina, não do diff: tempo sob carga (`ass-08-channel-db`: `1104 ms < 1 000`;
   `o6r07c-b-scope-db`: transação de 5212 ms > 5000; `traccar-position-ingestion-db` ×2), ferramenta do Windows
   (`san3-05-runtime-role-guard-db`: `setsid: ausente — necessário para impedir que psql \password leia a senha`), base já
   provisionada por mim (`san3-09` T2.1 espera "banco só migrado") e ordem de lista em custo de nuvem
   (`san3-05-leituras-de-plataforma-db` T11d: os mesmos dois itens em ordem trocada). A CI (Linux, base só migrada) é a autoridade.
5. `npm --prefix frontend run check` `ec=0` · `npm --prefix frontend run build` `ec=0` (`✓ built in 10.28s`, só o aviso de tamanho
   de bloco que já existia) · `npm --prefix frontend run test:smoke` (02:32–02:34 SP) → `# tests 1691 # pass 1691 # fail 0 # skipped 0`.
6. `node --check Kpis/app.js` → ok · `git diff --check origin/main...HEAD` → ok · escopo por laço (F3, acima) → 0 fora do PERMITIDO.
7. Limpeza §C5: ver o fechamento abaixo.

## Fechamento

- **Limpeza §C5 (02:48 SP):** removidos `dist/` (6,9 MB), `frontend/dist/` (3,7 MB), `frontend/tsconfig.tsbuildinfo`, `test-results/`, os anexos de teste em `storage/checklist-attachments/` (o `.gitkeep` rastreado ficou) e o container próprio `san308-pg`. Ficam o worktree e os `node_modules` (o PR segue aberto) e os logs da bateria e das mutações no scratchpad da sessão. Nenhum outro container, worktree nem a árvore principal foram tocados.
