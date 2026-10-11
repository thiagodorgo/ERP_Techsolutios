# PORTEIRO PÓS-MERGE — PR #414 / B-O6R-07c-a

- Identidade: `porteiro-414-claude` (NOVA)
- Papel: `porteiro-pos-merge`
- Modelo executado: **Claude Opus 5.5** (`claude-opus-5-5`) — nível **menor**, declarado (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, §C7.6)
- Motivo da substituição: SUBSTITUI `porteiro-414-codex` (GPT-5.6 Sol), que parou às 18:21Z no limite de uso do Codex com os itens 3 a 8 em apuração. Regra do dono `D-CLAUDE-SO-ORQUESTRA`: agente Claude com o Codex fora e a tarefa no caminho crítico (o `B-TRC-01` espera este parecer).
- Sucessão (P3, §C7.7): o parcial do caído está preservado em `C:/Users/AMP/erp-pausa-2026-10-03/PORTEIRO-414-codex-parcial.md` (byte-idêntico ao arquivo original, conferido por `diff` às 18:23Z antes da substituição). Itens 1 e 2 do caído foram RE-EXECUTADOS por mim; nada dele conta sem re-execução.
- Ref de medição (§A7): `origin/main` após `git fetch origin` (18:23Z) = `ca03638c`; objeto julgado = merge do #414 `86ea8a81fa6e833a27910297d88c93ebe0533558`.
- Estado: **CONCLUÍDO** (18:44Z de 2026-10-11)

## 1. Merge íntegro

### 1.1 Re-execução do comando do caído: `git fetch origin` + `git log origin/main -3 --decorate --oneline --parents`
- Saída (18:23Z): `ca03638c` (pai `86ea8a81`, #422 docs/governança) → `86ea8a81` (pai `17f4a30d`, #414) → `17f4a30d` (#421). `HEAD -> main` = `origin/main` = `ca03638c6fb4…`.
- Comparação com o caído: **IDÊNTICA**.
- Veredito parcial: **CONFERE**. O #414 está na `main` remota; o commit seguinte (#422) é documental e não altera o objeto julgado, que é medido em `86ea8a81`.

### 1.2 Re-execução: `gh pr view 414 --json state,mergedAt,mergeCommit,headRefOid,statusCheckRollup`
- Saída: `state=MERGED`, `mergedAt=2026-10-11T17:21:36Z`, `mergeCommit=86ea8a81fa6e833a27910297d88c93ebe0533558`, `headRefOid=09084d30b1d1b5c478fb1f850ae01db0f3e120b1`, branch `fix/o6r07c-subresource-scope`; 14 checks `COMPLETED/SUCCESS` (2 execuções × 7 jobs: backend, backend-postgres, frontend, owner-portal, authority-portal, flutter, docker).
- Comparação com o caído: **IDÊNTICA**.

### 1.3 Medição própria (cauda): integridade do squash
- `git cat-file -p 86ea8a81` → 1 pai (`17f4a30d`), squash. `git rev-parse 86ea8a81^{tree} 09084d30^{tree}` → **ambos `ecec1327…`**: a árvore mergeada é exatamente a do head aprovado. `git merge-base --is-ancestor 17f4a30d 09084d30` → verdadeiro (o head já continha a `main` anterior; nada da `main` foi revertido pelo squash).
- `gh api …/commits/09084d30…/check-runs` → `total_count=14`, todos `completed/success` no SHA do head. `…/commits/86ea8a81…/check-runs` → 8 (7 `success` + `deploy skipped`).
- Veredito item 1: **CONFERE**.

## 2. Promessa × diff e preservação de registros

### 2.1 Re-execução: `gh pr view 414 --json body` + `git diff --name-status/--shortstat 17f4a30d 86ea8a81` + diff de `src/**`
- Saída: **49 arquivos, 13.453 inserções, 385 remoções** (idêntico ao caído). Código de produto: 4 arquivos — `src/modules/work-orders/{work-order.service.ts,work-order-attachment.service.ts,work-order-attachment.controller.ts}` e `src/modules/work-order-comments/work-order-comment.service.ts`. Teste pré-existente alterado: `tests/work-order-attachments-routes.test.ts` (+9/−2, classe (i): a OS do arnês passa a ser atribuída ao técnico). `API_CONTRACTS.md` (+4/−4: linhas de anexo, geocode, comentário e `/mobile/sync/work-order-actions`).
- As **10 vias** prometidas, conferidas uma a uma no diff de `86ea8a81`:
  - anexo POST: `work-order-attachment.controller.ts` chama `service.assertCanMutate` **antes** do teste de multipart e do parse; `createUploadedAttachment` também passa por `assertWorkOrderForMutation` (defesa no serviço);
  - anexo DELETE: `deleteAttachment` → `assertWorkOrderForMutation` antes de `findAttachment`;
  - comentário POST/PATCH/DELETE e tag POST/DELETE (5): `addComment`, `editComment`, `deleteComment`, `attachTag`, `detachTag` → `assertWorkOrderForMutation` → `workOrderService.getForMutation`, antes do parse/busca; a moderação (autor OU `work_orders:update`) continua depois;
  - geocode e geocode-destination: `geocodeById`/`geocodeDestinationById` trocam `findById` por `getForMutation`, antes do 409/422;
  - `work_order.mileage` pelo sync: `setMileage` usa `getForMutation`; chamado por `src/modules/mobile/mobile-work-order-sync.ts:245-247` (`git grep` em `86ea8a81`), arquivo **não tocado** (proibido do plano).
  - `getForMutation` (novo, `work-order.service.ts` ~l.847) = `get` (404 cross-tenant) + `assertMutationObjectScope` do 07a, corpo deste último intocado.
- Afirmação documental conferida contra o código: `API_CONTRACTS.md` diz que o recibo de idempotência do sync é "em memória por processo" e "consultado antes" → `mobile-work-order-sync.ts:65` `const syncReceipts = new Map(...)`, consultado em l.82-85 antes da aplicação. **Confere.**
- **Escopo, medido na norma do bloco (§A7):** `docs/revisoes/SAN3/B-O6R-07c-plano.md` @`86ea8a81`, §07c-a.5 (l.331-334) PERMITE nominalmente `src/modules/work-order-comments/work-order-comment.service.ts`. A "ressalva de escopo" do caído media contra a abreviação do mandato do orquestrador ("só `src/modules/work-orders/**`"), não contra o plano: **ressalva do caído NÃO confirmada** — o arquivo está dentro do permitido. Proibido do plano (prisma, `work-order.types.ts`, `catalog.ts`, checklists, field-dispatch, `src/modules/mobile/**`, `mobile/**`, `frontend/**`, `Kpis/**`, `src/app.ts`, `.github/**`, `package*.json`, `.env*`, arquivos-base): **nenhum** aparece no `--name-status`.
- Arquivos que o corpo do PR não nomeia: 6 corpos de jurado (`.claude/agents/especialistas/jurado-07ca-*` e espelhos `.agents/`), docs de ciclo 2 (`B-O6R-07c-a-ciclo2-*`), `omega/reprovacoes/R-B-O6R-07c-a-1.md` e `decisoes.md`. São artefatos de processo/registro; `decisoes.md` é anunciado no próprio corpo ("registra as decisões do dono de 11/10 em `controle/`"). Nenhum é produto. **Sem crescimento silencioso de produto.**
- Veredito 2.1: **CONFERE** (a promessa funcional existe no diff; a execução dos testes é o item 3).

### 2.2 Re-execução: cabeçalhos `^## ` de `decisoes.md` e `pendencias.md` nos pais da integração (`b647a9a4` = `6a4ab8b9` + `17f4a30d`, conferido por `git cat-file -p`) × merge `86ea8a81`
- Comando: `git -c core.autocrlf=false show <ref>:agent-orchestration/controle/<f>.md | tr -d '\r' | grep '^## '`, união dos dois pais, `grep -Fxc` no merge.
- Saída: `decisoes`: união 108 → **108/108** presentes, 109 no merge, 0 duplicados. `pendencias`: união 544 → **543/544**, 546 no merge, 0 duplicados; ausente: `## P-TRC-MODELOS-RASTREADOR (2026-10-11) — … não foram informados (F-9) — ALTA`. **Idêntico ao caído.**
- Medição própria (cauda): `git diff --numstat 17f4a30d 86ea8a81` → `decisoes.md` **76/0** (append puro); `pendencias.md` **74/6**. As 6 linhas removidas são: (a) 1 linha de status de `P-O6R-SUBRECURSO-OBJECT-SCOPE` (l.6759), reescrita para "ABERTA — PARCIAL … Antes: ABERTA …"; (b) 5 linhas de `P-TRC-MODELOS-RASTREADOR`, **fechada no lugar** como `FECHADA (2026-10-11, D-TRC-MODELOS-CANTRACK)` com "Antes: ABERTA". A decisão `D-TRC-MODELOS-CANTRACK` existe em `decisoes.md` @`86ea8a81` (seção "Registro de 11/10/2026 (fim da tarde)"), com a fala literal do dono.
- Entradas novas: decisões `D-03a-MESMA-CHAVE-OUTRO-ATOR`, `D-07CA-OPCAO-D`, `D-TELAS-SAN3-06a`, `D-TRC-CELULAR-PELO-APP`, `D-TRC-MODELOS-CANTRACK` + "Registro do `B-O6R-07c-a`"; pendências novas: `P-GOV-GUARDA-POR-PROPRIEDADE`, `P-LOGISTICS-MOCK`, `P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA`, `P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO`, `P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA`, `P-O6R-07CA-DB-FORA-DA-LISTA-CI`, `P-O6R-07CA-SUBAPP-EM-ROUTER-INVISIVEL`. O #422 (posterior) só acrescenta 21/0 em `decisoes.md`.
- Veredito 2.2: **NENHUMA ENTRADA SE PERDEU.** O único cabeçalho ausente é um fechamento no lugar, rastreado à decisão do dono. **Ressalva leve (registro, não produto):** o plano do bloco declara `pendencias.md` como APPEND (§07c-a.5) e a reescrita no lugar de `P-TRC-MODELOS-RASTREADOR` apagou do texto vivo que ela bloqueava o `B-TRC-03a` **e o `G-TRC-NLB`** ("bloqueia: nada mais"); a decisão do dono responde à F-9, mas não diz nada sobre o `G-TRC-NLB`. O texto antigo segue no git (`17f4a30d`).

## 3. Contagens reexecutadas

### 3.0 Terreno (medido antes de executar)
- Objeto executado: worktree `C:/Users/AMP/w-port414` (do caído), `git rev-parse HEAD` = `ca03638c` (detached), `git status --porcelain` vazio. `git diff --name-only 86ea8a81 ca03638c` → só `.agents/**`, `.claude/**`, `AGENTS.md`, `CLAUDE.md`, `decisoes.md` (o #422): **nenhum** arquivo de `src/`, `tests/`, `prisma/` ou `package*.json` — executar em `ca03638c` equivale, para código, a executar em `86ea8a81`.
- `node_modules` do caído: `fsutil reparsepoint query node_modules` → "não é um ponto de nova análise" (**não é junction**); `npm ls --depth=0` e `npm ls --all` → exit 0; `node_modules/.package-lock.json` presente (escrito no fim do reify). **`npm ci` completo, reaproveitado.** Faltava `node_modules/.prisma/client` (não gerado) → `npm run db:generate` com `DATABASE_URL` só no ambiente (não há `.env` no worktree) → exit 0.
- Container do caído `porteiro414-pg`: criado 18:20:11Z (1 min antes da queda), volume anônimo, `POSTGRES_DB=erp_port414`, `127.0.0.1:59414`. Estado: 22 tabelas e `_prisma_migrations` com `20260612000000_add_aws_cur_cost_import` **`finished_at` nulo** (migração interrompida). **Dúvida → recriado**: `docker rm -f -v porteiro414-pg`; `docker run -d --name porteiro414-claude-pg … -p 127.0.0.1:59415:5432 postgres:16`.
- Banco próprio: `npx prisma migrate deploy` → exit 0, "All migrations have been successfully applied"; `_prisma_migrations` = **108 aplicadas, 0 pendentes**, igual às 108 pastas de `prisma/migrations`. `npm run db:seed` → exit 0. Base viva (`erp-postgres`, porta 5432) **não tocada**.

### 3.1 Suítes do bloco (sem banco), em `w-port414` @`ca03638c`, `DATABASE_URL` ausente
- `timeout 600 node --test --import tsx tests/o6r07c-census-guard.test.ts` → exit 0 · **tests 31 · pass 31 · fail 0 · skipped 0** (83 s). Declarado no PR: guard 31/31. **Reproduz.**
- `timeout 600 node --test --import tsx tests/o6r07c-subresource-scope.test.ts` → exit 0 · **tests 24 · pass 24 · fail 0 · skipped 0**. Declarado: vias 24/24. **Reproduz.**
- `tests/o6r07a-wo-object-scope.test.ts` → **8/8**, 0 skip. Declarado: 07a 8/8. **Reproduz.**
- `tests/work-order-attachments-routes.test.ts` (fixture alterada pelo bloco) → **12/12**, 0 skip.

### 3.2 Suíte `-db` contra o Postgres próprio (`porteiro414-claude-pg`, `127.0.0.1:59415/erp_port414`, migrado + semeado)
- `DATABASE_URL=… timeout 600 node --test --import tsx tests/o6r07c-subresource-scope-db.test.ts` → exit 0 · **tests 6 · pass 6 · fail 0 · skipped 0**. Declarado: `-db` 6/6. **Reproduz, e NÃO pulou** (o caso `[modo]` confirma a composição em prisma). Os 6 casos: modo prisma; positivo por perfil; positivo por user id; negativo anexo; negativo comentário; negativo km (`rejected` por ação, banco inalterado).
- Execução no CI, conferida no log (não presumida): `gh api repos/:owner/:repo/actions/jobs/114526003639/logs` (job `backend`, head `09084d30`) → os 6 casos aparecem como `ok 2037` … `ok 2042`, inclusive `[modo] … prisma`; totais do job: **tests 3298 · pass 3296 · fail 0 · skipped 2**. A suíte `-db` roda no job `backend` (que tem Postgres migrado), não no `backend-postgres` — o que confirma o fechamento "NÃO PROCEDE" de `P-O6R-07CA-DB-FORA-DA-LISTA-CI` (item 6).

### 3.3 `npm test` completo, na árvore do merge, contra banco e Redis próprios
- Comando: `DATABASE_URL=…127.0.0.1:59415/erp_port414_full` (banco **novo, só migrado**, como no job `backend`) `REDIS_URL=redis://127.0.0.1:59416` (`porteiro414-claude-redis`, `redis:7`) `CORE_SAAS_PERSISTENCE=memory timeout 3600 npm test`, 18:31:21Z → 18:38:01Z, exit 1.
- Saída: `[run-backend-tests] 301 arquivo(s) · 3288 teste(s) · pass 3280 · fail 6 · skipped 2`.
- **Forma das 6 falhas, todas de AMBIENTE, em 2 arquivos que o #414 não toca** (fora do `--name-status` do merge):
  - `tests/san3-05-runtime-role-guard-db.test.ts` (nasceu em `a9fbe283`, #405): T14a/b, T14c, T14d + o pai → `scripts/db-runtime-role.sh: line 36: psql: command not found` (127). `which psql` → ausente nesta máquina.
  - `tests/san3-09-bootstrap-platform-admin-db.test.ts` (nasceu em `026ff7b8`, #400): T2.1 + o pai → `node_modules/.bin/prisma:2 … SyntaxError` (o shim sh do `prisma` executado pelo `node` no Windows). O T2 parou no 1º subteste: **10 subtestes não chegaram a se registrar** (CI: 11 subtestes; aqui: 1).
- Reconciliação com o CI na **mesma árvore** (`ecec1327`, item 1.3), job `backend` `114526003639`: `301 arquivo(s) · 3298 teste(s) · pass 3296 · fail 0 · skipped 2`. Aqui: 3280 pass + 6 falhas de ambiente + 10 não registrados = **3296**; `skipped 2` idêntico. **Fecha.** O T15 do #405 (o "por relógio") passou nesta execução (`ok 11 - T15`).
- Número do corpo do PR (`npm test` 3234/3230/2 falhas/2 skips): o relatório do dev (`B-O6R-07c-a-DEV-relatorio.md` @`86ea8a81`, l.229-262) dá a forma: no Windows, os **mesmos 6 vermelhos de ambiente nos mesmos 2 arquivos** (S9, que eu reproduzi); a medida final do dev foi em container Linux, head `a0dafa05`, **296 arquivos**. A diferença para 301/3298 é a `main` integrada depois: `git diff --stat d4cd35e3 86ea8a81 -- tests` → só 7 arquivos de estoque (`inventory-*`, `db-catalog-write-guard`), +4.238 linhas, nenhum do bloco. **Não reexecutei o `npm test` em `d4cd35e3`**: o número do corpo é de um head anterior à integração e não é o objeto do merge; o objeto do merge reproduz.
- Veredito item 3: **CONFERE** — 31/31, 24/24, 8/8 e `-db` 6/6 reproduzem exatamente; `npm test` na árvore do merge fecha com o CI, e as 6 falhas locais são de ambiente (sem `psql`, shim do `prisma`), pré-existentes e fora do bloco.

## 4. KPI
**NÃO APLICÁVEL** — congelado por `D-GOV-PROPORCIONAL`, §C7 item 8(5).

## 5. Junta × decisão do dono

- Comandos: `git show 86ea8a81:agent-orchestration/omega/juntas/votos/B-O6R-07c/07ca-C{1,2,3}-voto.json` (lidos por `node`); `git show 86ea8a81:…/J-B-O6R-07c-a-ciclo1.md | grep`; `git show 86ea8a81:…/decisoes.md` (seção "Registro de 11/10/2026 (fim da tarde)"); `awk` da entrada `P-GOV-GUARDA-POR-PROPRIEDADE` em `pendencias.md` @`86ea8a81`.
- Votos: C1 `APROVADO` (1 nota `pre-existente`, T15 do #405), C2 `REPROVADO` (3 `bloqueia` A1/A2/A3 + 1 `ajuste` A4 + 4 notas, todos `dentro-do-bloco`), C3 `APROVADO` (1 ajuste + 6 notas). Modelo declarado nos três: Claude Opus 5.5, nível menor. Ata `J-B-O6R-07c-a-ciclo1.md:16`: **"VEREDITO: REPROVADO (2 × 1 — a unanimidade não se formou)"**; l.24: "classe não grave: nenhum é defeito do produto hoje". **O veredito registrado bate com os votos.**
- Natureza dos 3 `bloqueia` (texto do `defeito` no voto C2): A1 despacho por `Map.get(action.type)`/`in` escapa do extrator; A2 curinga casado por arquivo+texto sem linha; A3 sub-app `express()` dentro de `Router` não descido. Os três são sobre o **teste-vigia** (`tests/o6r07c-census-guard.test.ts` + helper), não sobre as 10 vias de produto. **Confere com o mandato.**
- Decisão do dono: `D-07CA-OPCAO-D (2026-10-11)` registrada em `decisoes.md` @`86ea8a81` com a fala literal ("07c-a: D"), o que entra (o conserto do produto), o que vira pendência e o **risco aceito** (rota NOVA pode escapar do aviso do teste). **Confere.**
- O vigia virou `P-GOV-GUARDA-POR-PROPRIEDADE` (`pendencias.md:10901` @`86ea8a81`): ABERTA, ALTA, **dono: o bloco `B-GOV-GUARDA-POR-PROPRIEDADE`**, instâncias A1–A4 + as 6 da pré-crítica, insumos nomeados (`bd504cc4`, `6a4ab8b9`), **bloqueia: nada hoje, por decisão do dono**, teste de encerramento por propriedade e mutação. A A3 tem ainda entrada própria, `P-O6R-07CA-SUBAPP-EM-ROUTER-INVISIVEL`. **Confere.**
- Ressalvas leves (registro, não produto):
  - (R5.1) A ata `J-B-O6R-07c-a-ciclo1.md` e a reprovação `R-B-O6R-07c-a-1.md` **não apontam** para `D-07CA-OPCAO-D` (`grep "OPCAO-D\|opção D\|dono decid"` → 0 nas duas); a ata termina em "Próximo: … ciclo 2". Quem ler só a ata conclui que o bloco seguiu para o ciclo 2. A decisão está registrada (`decisoes.md`, corpo do PR) — falta o ponteiro da ata para ela.
  - (R5.2) `pendencias-indice.md` @`86ea8a81` está em dia com o gerador (regenerado em diretório de rascunho a partir dos blobs do commit: **0 linhas de diferença**), mas o gerador classifica `P-GOV-GUARDA-POR-PROPRIEDADE` como **CRÍTICA** (a entrada diz ALTA): `severidade()` (`gerar-indice-pendencias.py:75-80`) casa `\bCRÍTICA\b` com `re.I` dentro de "pré-**crítica**". Defeito do gerador, **pré-existente** ao bloco; o próprio índice declara que vale o `pendencias.md`.
- Veredito item 5: **CONFERE** — o merge sem junta verde está coberto por decisão do dono registrada, com o vigia transformado em pendência com bloco dono.

## 6. Pendências

- Comandos: `git show 86ea8a81:agent-orchestration/controle/pendencias.md` (cópia sem CR) + `awk` por ID; `git show origin/main:…/pendencias.md` + `awk` dos `bloqueia`; mutação de amostragem (abaixo).
- **Abertas pelo bloco** (7, todas com dono e destino): `P-GOV-GUARDA-POR-PROPRIEDADE` (dono `B-GOV-GUARDA-POR-PROPRIEDADE`; bloqueia nada, por decisão do dono); `P-O6R-07CA-SUBAPP-EM-ROUTER-INVISIVEL` (ABSORVIDA pela anterior); `P-O6R-07CA-DB-FORA-DA-LISTA-CI` (FECHADA — NÃO PROCEDE); `P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA` (`pre-existente`, pesa no 07c-b); `P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO` (`pre-existente`, bloqueia não); `P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA` (`pre-existente`, classe R, bloqueia não). Do registro do dono no mesmo PR: `P-LOGISTICS-MOCK` (dono: o orquestrador nomeia o bloco depois do `B-SAN3-06a`).
- **Fechadas/parciais pelo bloco:** `P-O6R-SUBRECURSO-OBJECT-SCOPE` → "ABERTA — PARCIAL" (10 vias fechadas; resíduo do `B-O6R-07c-b`, 23 entradas `·07c-b` do instantâneo); `P-O6R-07CA-DB-FORA-DA-LISTA-CI` → "NÃO PROCEDE"; `P-TRC-MODELOS-RASTREADOR` → FECHADA (decisão do dono, não do código).
- **Amostragem 1 — no código, `P-O6R-SUBRECURSO-OBJECT-SCOPE` (a via comentário DELETE):** mutação no worktree `w-port414`, por script com âncora CRLF conferida (`anchor count 1`): `deleteComment` volta de `assertWorkOrderForMutation` para `assertWorkOrder` (a leitura de antes) → `node --test … tests/o6r07c-subresource-scope.test.ts` → **tests 24 · pass 22 · fail 2** (`not ok 5 - laço G … DELETE …/comments/:commentId — G-NEG 403…`; `not ok 18 - S-COM …`). Restaurado por **edição inversa** com a mesma âncora; `git status --porcelain` vazio e `git diff --quiet` verdadeiro. **O "fechado por escopo provado" é verdade nessa via, e o teste o guarda.**
- **Amostragem 2 — `P-O6R-07CA-DB-FORA-DA-LISTA-CI` ("NÃO PROCEDE"):** confirmada no log do CI (item 3.2): a suíte `-db` roda no job `backend` com os 6 casos `ok` e o `[modo] … prisma` verde.
- Nota leve: o status de `P-O6R-SUBRECURSO-OBJECT-SCOPE` data o fechamento parcial "2026-10-10, com o merge do PR #414", mas o merge é de **2026-10-11T17:21:36Z** (item 1.2).
- Veredito item 6: **CONFERE.**

## 7. Limpeza §C5

- `git ls-remote origin 'refs/heads/fix/o6r07c*'` → vazio: **branch remota apagada**. `git branch --list '*o6r07c*' '*07ca*' '*07c-a*'` e `git branch -r --list '*o6r07c*'` → vazios: **sem branch local nem referência remota morta**.
- `git status --porcelain | grep '^ D'` na árvore principal (`main` @`ca03638c`) → vazio: **nenhum rastreado apagado**. Untracked presentes: `.history-memo/` (10/10 14:10 local), `agent-orchestration/omega/juntas/TEMPLATE-J-ata.md` (07/09) e este parecer — os dois primeiros anteriores ao bloco e não dele; reportados, não varridos.
- Worktree do dev (`C:/Users/AMP/w-07ca`, nomeado no relatório do dev) → **não existe mais** (`git worktree list`, `ls`). Containers do dev/junta (`dev07ca-*`, jurados) → **nenhum** em `docker ps -a`; os parados `erp-postgres-alt` (3 semanas) e `pastrack-teste-banco-teste-1` (2 semanas) não são do bloco.
- Base viva: **não medida por proibição do mandato** (`erp-postgres`/5432 vedados). O relatório do dev declara cluster próprio (`dev07ca-pg`/`dev07ca-npg`) e nada na base viva; não verifiquei essa afirmação diretamente.
- **Ressalva leve (resíduo provável do bloco):** worktree `C:/Users/AMP/w-pvpr`, criado em 10/10 13:24 local, detached em `d7255263` — commit do ramo do 07c-a ("parecer do inspetor do B-O6R-07c-a"), ancestral do head `09084d30` — com 2 untracked `scripts/mandato-preflight.sh` e `scripts/mandato-refs.sh` (pré-voo de mandato), 70 MB, sem `node_modules`. É o pré-voo das cadeiras da junta do 07c-a. **Não removido** (pode servir ao pré-voo de outra junta; remoção é por identificador de bloco e decisão de quem o criou): o orquestrador decide.
- Minha própria limpeza: `docker rm -f -v porteiro414-claude-pg porteiro414-claude-redis` (por nome; o `porteiro414-pg` do caído já fora removido com o volume anônimo no item 3.0); conferido antes que nenhum processo usava `w-port414` (`Get-CimInstance Win32_Process` → só o meu shell; os `node.exe` vivos são o dev server e o painel do dono, na árvore principal); `git worktree remove --force C:/Users/AMP/w-port414` → exit 0, diretório inexistente depois; `node_modules` da árvore principal intacto (222 entradas, `.prisma/client` presente).
- Disco: `df -h /c` → **13 GB livres** antes da minha limpeza, **14 GB** depois (95% usado). Acima do limiar de ~10 GB, mas perto: **recomendo `DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh`** num dos próximos merges (`docs/limpeza-de-disco.md`).
- Veredito item 7: **CONFERE COM RESSALVA LEVE** (o `w-pvpr`).

## 8. Próximo start

### 8.1 `B-TRC-01` — gate §8.0, linha 6 (`docs/revisoes/TRACCAR/PLANO_TRACCAR.md` @`origin/main`, l.1162-1176)
- A linha 6 pede "Porteiro do **último merge de produto** e a trava `Ω6R-SEC-002`". As emendas v2.2/v2.3 (`git show origin/main:…EMENDA-v2.{2,3}.md | grep "linha 6\|PORTEIRO"`) **não mexem na linha 6** (a v2.2 só troca a linha 4 por "PD aprovada pelo dono por escrito").
- Último merge de produto: o **#414** (o #422 posterior é governança). O comando da linha 6 ainda lê `PORTEIRO-411.md`; depois do #414, o porteiro que vale é **este parecer**, que precisa estar na `main` (o orquestrador versiona) para a linha 6 ficar verde.
- Trava `Ω6R-SEC-002` (`pendencias.md:3104-3123` @`origin/main`): "Bloqueia: feature nova em ordens de serviço, aprovações e RBAC". O #414 **reduz** o resíduo (10 vias fechadas; o resto é do 07c-b) e não a amplia. O `B-TRC-01` (§8.3) não toca nenhum arquivo do #414 (`grep work-order` em §8.3 → nada; só `prisma/schema.prisma` com campo novo em `FieldDispatch`).
- Pendências que dizem **bloquear o B-TRC-01** (`awk` dos `bloqueia` em `pendencias.md` @`origin/main`): `P-TRC-FORMA-QUATRO-OU-SETE`, `P-TRC-AWS-FLY-PRAZO`, `P-TRC-CONVIVENCIA-APP`, `P-TRC-PLANO-V22` → **todas FECHADAS** em 2026-10-11 por decisão do dono. Nenhuma pendência aberta bloqueia o B-TRC-01.
- Informação para o dev (não é achado do #414): a linha 5 do gate (`git diff --name-only c1cfdabe origin/main -- src prisma docs/deployment.md`) **não está vazia** — além dos 4 arquivos do #414, entraram `prisma/schema.prisma`, uma migração de estoque e 8 arquivos `src/modules/inventory/**`. O próprio gate manda o dev re-medir os arquivos de §8.3 antes do passo 1 de §8.5 e registrar; `prisma/schema.prisma` está em §8.3.
- **Linha 6, quanto ao #414: verde** assim que este parecer entrar na `main`.

### 8.2 Dev do `B-O6R-03a` (`fix/expense-sync-atomic`) e dev do `B-SAN3-06a-telas` (`fix/menu-sem-tela-ficticia`)
- `awk` case-insensitive de `bloqueia|depende de|pré-requisito` com `03a|06a|07c-a` em `pendencias.md` @`origin/main` → nenhuma pendência aberta bloqueia o início do 03a. Para o 06a, só `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA`, que bloqueia o **gate da versão vendável dentro do** `B-SAN3-06a` — é escopo do bloco, não condição de início; e o dono já decidiu "/logistics ligar depois" (`D-TELAS-SAN3-06a`, `P-LOGISTICS-MOCK`).
- Interseção com o #414: `git diff --name-only $(git merge-base origin/main <ramo>) <ramo>` ∩ arquivos do #414 → **vazia** nos dois ramos; os dois já têm merge-base `ca03638c` (a `main` atual).
- **Achado de processo (não do #414):** os dois ramos já têm `wip(registro): relatório parcial do dev (Codex parou no limite às 18:21Z)` (`3a648ca4`, `e6b81542`, 15:22 local = 18:22Z) e os relatórios `docs/revisoes/SAN3/B-O6R-03a-dev.md` e `B-SAN3-06a-dev.md`. O `B-O6R-03a-dev.md` registra o pré-voo do `dev-03a-codex` às **2026-10-11T18:16:47Z** sobre `76bd103b` (merge da `main` de 17:50Z); o `B-SAN3-06a-dev.md` (`dev-06a-codex`, head inicial `b459f8c1`, merge da `main` de 17:49Z) não data as entradas, e o commit dele é de 18:22Z. Ou seja, **o trabalho de dev dos dois começou depois do merge do #414 (17:21Z) e antes de qualquer parecer de porteiro** (o do Codex ainda apurava e caiu às 18:21Z), ao contrário do §C2.8 ("sem parecer dele, nenhum bloco novo começa"). O delta dos dois ramos sobre a `main` é **só documental** (`git diff --stat ca03638c <ramo>`: 6 e 2 arquivos em `docs/revisoes/SAN3/`, nenhum em `src/`), então nada do código deles depende do que este parecer conclui. Fica registrado para o orquestrador; não muda o veredito.

## Veredito

### O que executei (resumo; o detalhe está em cada item)
- `git fetch origin`; `git log origin/main -3 --parents`; `gh pr view 414` (estado, merge, head, checks, corpo); `git cat-file -p 86ea8a81`; `git rev-parse 86ea8a81^{tree} 09084d30^{tree}` (iguais); `gh api …/check-runs` no head e no merge.
- `git diff --name-status/--shortstat/-U` de `17f4a30d..86ea8a81` (código, contratos, registros); `git grep` do chamador do `setMileage` e do recibo do sync; leitura do §07c-a.5 do plano.
- Cabeçalhos de `decisoes.md`/`pendencias.md` nos dois pais da integração × merge; `git diff --numstat` e linhas removidas; regeneração do `pendencias-indice.md` em rascunho (0 diferença).
- Suítes: guard 31/31, vias 24/24, 07a 8/8, rotas de anexo 12/12, `-db` 6/6 (Postgres próprio); `npm test` 3288/3280/6 fail de ambiente/2 skip, reconciliado com o CI 3298/3296/0/2; log do job `backend` do CI.
- Mutação de amostragem (comentário DELETE) → 2 vermelhos, restaurada por edição inversa.
- `ls-remote`, `branch`, `status`, `worktree list`, `docker ps -a`, `df -h`; processos por `Get-CimInstance`; limpeza própria (2 containers, 1 worktree).
- **Não executado:** `npm test` no head declarado no corpo (`d4cd35e3`); os 2 arquivos `-db` com falha de ambiente em container Linux (rodaram verdes no CI na mesma árvore); qualquer leitura da base viva (vedada).

### Achados
1. **(leve, registro)** `agent-orchestration/omega/juntas/J-B-O6R-07c-a-ciclo1.md:54` e `agent-orchestration/omega/reprovacoes/R-B-O6R-07c-a-1.md` não apontam para `D-07CA-OPCAO-D`: a ata termina mandando para o ciclo 2, e o bloco mergeou por decisão do dono. A decisão está registrada em `decisoes.md` e no corpo do PR; falta o ponteiro.
2. **(leve, registro)** `agent-orchestration/controle/pendencias.md:10856-10862` @`86ea8a81`: `P-TRC-MODELOS-RASTREADOR` foi fechada **no lugar** (o plano do bloco declara `pendencias.md` como APPEND), e o texto vivo trocou "bloqueia: o B-TRC-03a e o `G-TRC-NLB`" por "bloqueia: nada mais". A decisão do dono (`D-TRC-MODELOS-CANTRACK`) responde à F-9, mas não fala do `G-TRC-NLB`. Nenhuma entrada se perdeu (decisões 108/108, append puro; pendências 543/544 + esta, fechada no lugar).
3. **(leve, pré-existente, gerador)** `agent-orchestration/controle/gerar-indice-pendencias.py:75-80` casa `CRÍTICA` dentro de "pré-crítica": `pendencias-indice.md:261` mostra `P-GOV-GUARDA-POR-PROPRIEDADE` como CRÍTICA, e a entrada diz ALTA.
4. **(nota)** `agent-orchestration/controle/pendencias.md:6765` @`86ea8a81` data o fechamento parcial em "2026-10-10, com o merge do PR #414", mas o merge é de 2026-10-11T17:21:36Z.
5. **(leve, limpeza)** o worktree `C:/Users/AMP/w-pvpr` (detached em `d7255263`, do ramo do 07c-a, pré-voo de mandato, 70 MB) sobrou. Não o removi.
6. **(processo, fora do #414)** os devs do `B-O6R-03a` (`docs/revisoes/SAN3/B-O6R-03a-dev.md:11`, 18:16:47Z) e do `B-SAN3-06a-telas` começaram antes deste parecer (§C2.8). O delta deles é só documental, então nada se perde, mas o desvio precisa ser registrado.
7. **(sem efeito)** a "ressalva de escopo" do caído (`work-order-comments`) **não procede**: o arquivo está no PERMITIDO do plano (`docs/revisoes/SAN3/B-O6R-07c-plano.md:331-333` @`86ea8a81`).
- Disco: 14 GB livres. Rodar o `DEEP_CLEAN=1` em breve.
- Nada é grave. A promessa do produto (10 vias) está no código. As contagens do bloco reproduzem exatamente. O `npm test` da árvore do merge fecha com o CI. O merge sem junta verde tem a decisão do dono registrada, e o vigia virou pendência com bloco dono. Nenhuma pendência aberta bloqueia o `B-TRC-01`, o dev do `B-O6R-03a` ou o dev do `B-SAN3-06a-telas`. A linha 6 do gate do Traccar fica verde quando este parecer entrar na `main`.

LIBERADO COM RESSALVA: B-TRC-01 (gate §8.0, linha 6) e a continuação dos devs do B-O6R-03a e do B-SAN3-06a-telas | no próximo PR de registro (o mesmo que versiona este parecer): pôr o ponteiro para D-07CA-OPCAO-D na ata J-B-O6R-07c-a-ciclo1.md e na R-B-O6R-07c-a-1.md; confirmar com o dono ou registrar se o G-TRC-NLB ainda depende de algo que P-TRC-MODELOS-RASTREADOR dizia bloquear; decidir o destino do worktree w-pvpr; registrar que os devs do 03a e do 06a-telas começaram antes do porteiro; e rodar DEEP_CLEAN=1 num dos próximos merges (14 GB livres).
