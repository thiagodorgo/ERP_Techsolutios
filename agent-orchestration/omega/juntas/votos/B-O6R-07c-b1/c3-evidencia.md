papel: C3 | identidade: jurado-07cb1-c3-opus (corpo: jurado-07cb1-c3-despacho-censo-persistencia) | modelo: Claude Opus 5.5 (claude-opus-5-5) · nível menor DECLARADO (autorização: CLAUDE.md §C7.6 D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO; ref b198fe35 e origin/main 79599143) | mandato_md5: f1d55dff6f9eaace7a35c33559d60f5f (declarado no disparo: f1d55dff6f9eaace7a35c33559d60f5f) | corpo_md5: 58eae26641485cef270b7dfb6bc37284 (.claude, blob b198fe35) · 74c95ad4dc26087731d7419fb4d7715c (.agents, blob b198fe35) (recebido no prompt: n/a — lido do blob; declarado no disparo .claude 58eae266…)

# Evidência da cadeira C3 — junta B-O6R-07c-b1 (PR #440, ciclo 1)

- Objeto: b198fe358b41186b2598ab258ccb735da8c04cbc (git ls-remote do ramo = gh pr view 440 headRefOid; 03:45:14Z)
- B (merge-base origin/main × objeto): 4fe7524ecbcc68b3e69336453cc774ed5937cb1c
- origin/main no início: 795991438a0b07c20602b41e42583580ebb70906 (PR #441 mergeado; R1 do inspetor)
- Host: MINGW64_NT-10.0-22631 x86_64 Msys · node v20.19.5 · git 2.53.0.windows.2 · livre C: 13G (95%)
- docker ps no início: erp-postgres, erp-redis (base viva, NÃO alvo); grupos tl/j de outros trabalhos = 0
- Leitura de outras cadeiras: nenhuma (não abro C1-*/C2-*/c1-*/c2-*).
- Ressalvas do inspetor aplicadas: R1 (decisões 17/10 lidas em 79599143), R2, R4 (sucessor = identidade nova), R5, R7 (db:generate com URL fictícia), R8 (N e forma declarados).
- Régua: ciclo 1 → bloqueia + dentro-do-bloco reprova, qualquer classe; não medido = REPROVADO.

## Legalidade (antes do mérito)

- L1 parecer do inspetor: `insp-07cb1-parecer.md` (instância inspetor-07cb1-opus, 03:30–03:40Z) → **LIBERADO COM RESSALVA**; nomeia C3 = `jurado-07cb1-c3-despacho-censo-persistencia`, corpo .claude 58eae266…/.agents 74c95ad4… (= meus md5 medidos no blob), worktree `C:/Users/AMP/w-j07cb1c3`, prefixo `j07cb1-c3-`. Executor desta cadeira: Claude Opus 5.5 subagente → confere. Veredito parcial: legal.
- L2 objeto por duas fontes: `git ls-remote origin refs/heads/fix/o6r07cb1-despacho-atribui` → b198fe35…; `gh pr view 440 --json headRefOid,...` → b198fe35…, OPEN, isDraft=false. Coincidem.
- L3 check-runs: `gh api repos/.../commits/<O>/check-runs?per_page=100` → total 14 | não-verdes 0 | pendentes 0; backend (117294253935, 117294243720) success; backend-postgres (117294253904, 117294243707) success. Runs 38997853809 e 38997850343.
- L4 base: `git merge-base origin/main <O>` = 4fe7524e…; `git rev-list --merges --parents B..O` → vazio (0 merges no bloco); `git log --first-parent B..O` → 4 commits (67e5cb1c feature, 77678bb2 trava, 34b8ae73 corpos, b198fe35 carimbo), todos autor thiagodorgo.
- L5 decisões (`git show <ref>:agent-orchestration/controle/decisoes.md | grep -n`): objeto → D1-07c 3654, D-07CB-EMENDA-RECOMENDACOES 3658; as de 17/10 ausentes no objeto; origin/main 79599143 → D-07CB1-TRAVA-ATE-B2 3709, D-07CB1-DESPACHO-OS-ENCERRADA 3710, D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO 3711, D-BRACOS-E-DOCKER-17-10 3716, D-INICIO-ATENDIMENTO-CONFIRMADO 3719 (substitui P3). `D-07c-DESPACHO-ALVO`: ausente em decisoes.md nas duas refs; existe como texto na emenda (l.28) e na crítica r1 (l.77,258) do objeto — aplico como regra do plano aprovado (emenda), não como decisão do dono.
- L6 âncoras do CLAUDE.md (objeto | origin/main, `grep -c`): §A1 1|1, §A2 1|1, "A7. Onde se MEDE" 1, §C4 1|1, §C5 3|3, 1-bis 3|3, 1-ter 4|4, 4-bis 7|7, "Paradas imediatas irredutíveis" 1|1, 6-bis 3|3, "P7 — Pausa" 1|1, "GOVERNANÇA PROPORCIONAL" 1|1, "## 8. GitHub Flow" 1|1. Todas existem.
- Veredito parcial legalidade: LIBERADO; ciclo 1; unanimidade de 3 com veto; régua ciclos 1–2.

## Terreno (parte Windows)

- Worktree próprio: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-j07cb1c3 b198fe35…` → `test -e .git` OK, HEAD = objeto. `npm ci --no-audit --no-fund` ec=0 (326 pacotes), sem junction. `DATABASE_URL=postgresql://x:y@127.0.0.1:1/nada npm run db:generate` ec=0 (R7).
- $SCRATCH = `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/j07cb1c3`.
- Desvio procedimental DECLARADO: o arquivo da sonda v1 foi criado no $SCRATCH com a ferramenta Write (não por Bash); depois só Bash (mv para `.mts`, sed). Nenhum arquivo do repositório foi escrito por Write/Edit.

## Item 1 — o despacho grava a atribuição (sonda própria, memória, HTTP porta efêmera)

Comando: `cd C:/Users/AMP/w-j07cb1c3 && timeout 600 node --import tsx $SCRATCH/sonda-item1.mts > sonda-obj.log` (v2 md5 6fb90d731b4286ad4836e1c055682b6d; v1 267eaced… só diferia no corpo do cancel/assign do preparo — o 1º run teve preparo inválido: cancel sem `financial_decision`, assign web exige UUID; corrigido e re-executado). Forma: `CORE_SAAS_PERSISTENCE=memory`, `createApp(MemoryCoreSaasAdapter)`, ator por `x-tenant-id/x-user-id/x-role`. Leitor de estado: GET OS, mapa de linhas `assignments` do repositório em memória (com `metadata.source/dispatchId`), timeline da OS (`work_order_assigned`), lista de despachos + `listTimeline` do despacho, runs.
Limite de terreno declarado: no modo memória o id de usuário não é UUID → `POST /operator-profiles` 400 `invalid_uuid` → o caminho "com perfil" não é exercível em memória (o resolver cai em `undefined` → user id). O "com perfil" é medido no Postgres (item 2).

Resultados no OBJETO (N = 1 execução, 28 casos):
| caso | resposta | estado depois |
|---|---|---|
| CTRL1 web assign (controle do leitor) | 200 | OS assigned, 1 linha (web), 1 evento open->assigned → leitor ACHA |
| C1 dispatcher→tA / →tC, manager→tA / →tC | 201 ×4 | OS open→assigned, op=user=alvo (user id: sem perfil em memória), 1 linha `field_dispatch:<dispatchId>`, 1 evento `open->assigned:field_dispatch`, 1 evento de despacho |
| C2 OS accepted / on_route → despacho p/ tA | 201 ×2 | status PRESERVADO (accepted, on_route), op=user=tA, linha+evento `accepted->accepted` / `on_route->on_route` |
| C3 OS cancelled / rejected / completed | 409 invalid_status_transition ×3 | nenhum despacho novo gravado, OS intacta |
| C4 rascunho | 201 | OS open, sem linha nem evento |
| C4 técnico ativa o próprio rascunho | 403 dispatch_activation_requires_dispatcher | estado intacto |
| C4 dispatcher ativa | 200 | OS assigned, 1 linha, 1 evento |
| C4 rascunho de OS encerrada: criar / ativar | 201 / 409 | OS cancelled intacta, rascunho segue draft |
| C5 reassign A→C | 200 | OS→tC, linha nova `field_dispatch_reassign`, evento `assigned->assigned` |
| C7 dois ativos (A depois C) | 201 ×2 | OS = tC (o último) |
| C6 cancelar o de A (não atual) | 200 | OS segue tC |
| C6 falhar o de B (atual; resta C) | 200 | OS volta a tC, linha+evento `field_dispatch_reassign` |
| C6 cancelar o último ativo | 200 | atribuição FICA (tC) |
| C6' D1 reatribuído a D por último; cancelar D1 | 200 | OS vai a tB = despacho ativo de CRIAÇÃO mais recente (`list` ordena `created_at desc`, `field-dispatch-prisma.repository.ts:45-46`) — "ativo" = {assigned, accepted, on_route, arrived, in_service, reassigned} (`field-dispatch.service.ts` ACTIVE_DISPATCH_STATUSES) |
| C8 Traccar: tA aceita/on_route D1 com a OS já de tC | 200/200; tC em D1 → 403 not_assigned_to_actor | D1 alvo=tA on_route, acceptedAt gravado |

(b) Falha injetada — mecanismo: substituição de método no MEU processo, `InMemoryWorkOrderRepository.prototype.assignFromDispatch` (falha antes de gravar) e `.createEvent` só para `work_order_assigned` (falha DEPOIS de OS+linha gravadas, antes do evento):
| ponto | resposta | estado depois |
|---|---|---|
| (i)a create, repo.assignFromDispatch falha | 400 msg=INJ_ATRIB_REPO (CTRL2: erro injetado aparece) | sem despacho, OS open, sem linha → OK |
| (i)b create, evento da OS falha | 400 | **OS assigned a tA, 1 linha `field_dispatch` com dispatchId de despacho APAGADO, 0 despacho** |
| (i)b' idem com tC | 400 | OS assigned a tC sem despacho; **tC muda status da OS: 200** |
| (ii)a reassign A→C, repo falha | 400 | despacho volta a tA, OS segue tA → OK |
| (ii)b reassign A→C, evento da OS falha | 400 | **despacho restaurado a tA (assigned), OS atribuída a tC**; efeito: **tC (alvo de nenhum despacho) muda status da OS: 200; tA (alvo do despacho ativo) muda status da OS: 403 not_assigned_to_actor** |
| (iii)a ativar rascunho, repo falha | 400 | rascunho segue draft, OS open → OK |
| (iii)b ativar rascunho, evento da OS falha | 400 | **rascunho restaurado a draft, OS assigned a tA com linha** |
| CTRL2 sem injeção | 201 | grava normalmente |

Ordem das escritas lida no blob (`field-dispatch.service.ts` create l.~250-470; `work-order.service.ts` assignFromDispatch l.1755-1822; `work-order-prisma.repository.ts` l.562-610): create = assertWorkOrderBelongsToTenant → assertOperator → (não-draft) OS não terminal + trava → freeze snapshot → provisão do run → `repository.create` (despacho) → `assignFromDispatch` [get OS → resolver de perfil → **transação {UPDATE OS; INSERT work_order_assignments}** → **INSERT work_order_events FORA da transação**] → (falha: `deleteById` do despacho) → evento do despacho → domínio. reassign = get → operador → OS não terminal → trava → `repository.reassign` → assignFromDispatch → (falha: `restoreState(current)`) → evento. draft→assigned = `repository.changeStatus` → assignFromDispatch → (falha: `restoreState`). A compensação desfaz só o DESPACHO; o que a transação da OS já gravou (atribuição + linha) fica.

(c) Vermelho-controle na BASE: `git checkout 4fe7524e -- src` no MEU worktree (13 arquivos de src trocados; `hash-object field-dispatch.service.ts` = 89053241 = blob de B) → `CASOS=base` → C1 ×4: 201 com OS **open**, sem linha nem evento; C3 cancelled/rejected/completed: **201** (despacho aceito em OS encerrada); C5 reassign: 200 com OS open. Restauro: `git checkout HEAD -- src`; `git diff --quiet HEAD -- src` ec=0; hash-object = a49b79f1 = blob do objeto; `git status --porcelain` = 0 linhas.

Veredito parcial item 1: os 8 caminhos pedidos estão corretos no objeto e a base mostra o defeito (os 3 controles acusaram). **ACHADO A1 (bloqueia, dentro-do-bloco):** a falha DEPOIS da transação da OS (no INSERT do evento `work_order_assigned`) deixa despacho e OS em desacordo em create, reassign e ativação de rascunho, porque a compensação só desfaz o despacho; medido o efeito de acesso no reassign (o alvo do despacho ativo perde a escrita na OS, um técnico sem despacho ganha). A confirmar no Postgres (item 2b).

## Terreno (parte Linux) — containers j07cb1-c3-*

- Antes de subir: `docker ps` → só `erp-postgres`, `erp-redis` (base viva, não alvo) e o grupo alheio `tl179220920218731-{run,redis,pg}` (1 grupo de outro trabalho) → o meu é o 2º trabalho com container (limite 3, `D-BRACOS-E-DOCKER-17-10`, origin/main 79599143:decisoes.md:3716).
- Imagem: `erp-junta-node20-pg16:local` (da receita) AUSENTE → `docker pull node:20-trixie-slim` (declarado) e `docker build -t j07cb1-c3-img:local - < Dockerfile.c3` (cópia verbatim de `C:/Users/AMP/erp-terreno/Dockerfile.erp-junta-node20-pg16`, md5 323bb15068362b9e00fe7c970963a73a nos dois) → build ec=0. Motivo: `node:20-bookworm-slim` não tem libssl (prisma).
- Rede `j07cb1-c3-net`; `j07cb1-c3-pg` (postgres:16 → PostgreSQL 16.14 Debian 16.14-1.pgdg13+1), `j07cb1-c3-node` (Linux WSL2 x86_64, node v20.20.2, psql 16.14, sem git). Ports: pg `5432/tcp` exposta, NÃO publicada no host; node nenhuma. Senha do Postgres aleatória (24 bytes hex) num arquivo 0600 do $SCRATCH, entra só por `-e NOME` sem valor; o papel `c3_rt` idem.
- Árvore: `git -c core.autocrlf=false archive b198fe35` → `/c/Users/AMP/t-j07cb1c3` → `git hash-object --no-filters` × `ls-tree`: total=4136 iguais=4136 → tar para `/work` → `md5sum -c` 4136 arquivos ec=0 → árvore temporária removida.
- Dentro: `npm ci` ec=0 · `prisma generate` ec=0 · `prisma migrate deploy` ec=0 (109 migrations found, 109 aplicadas; `20260877000000_backfill…` aplicada por ÚLTIMO, depois de `20260873000000`; em B e em origin/main 79599143 a última é 20260873 — sem colisão de carimbo).
- Ruído declarado: eventos de domínio dão `ECONNREFUSED 127.0.0.1:6379` (não subi Redis; fail-open, "Domain event was not enqueued") — não afeta OS/despacho.

## Item 2 — persistência

(a) `-db` do bloco — `docker exec -e DATABASE_URL -w /work j07cb1-c3-node timeout 600 node --test --import tsx --test-reporter=tap tests/o6r07c-b-scope-db.test.ts`:
- OBJETO: ec=0, `# tests 7 · pass 7 · fail 0 · skipped 0` (ok 1 [modo] … ok 7 [backfill P6 · FORCE RLS]).
- SEM `DATABASE_URL`: ec=0, `# tests 1 · pass 0 · skipped 1` (`# SKIP Defina DATABASE_URL…`) — pulo declarado.
- BASE (`/work/src` trocado pelo `git archive 4fe7524e src`; md5 de `field-dispatch.service.ts` no container = blob de B 8f00d15c…): ec=1, `# tests 7 · pass 3 · fail 4`; `not ok` 2,3,4 → `TypeError: c.ordens.assignFromDispatch is not a function`; `not ok` 5 → `repo.restoreState is not a function`; `ok` 1 [modo], 6 e 7 (backfill: dependem só da migração, que é do bloco e fica). Restauro: `src` re-extraído do objeto; `md5sum -c` de 782 arquivos de src ec=0.
- Leitura do teste: os casos 2–5 chamam `assignFromDispatch`/`restoreState` DIRETAMENTE (não o `FieldDispatchService`); o caso 2 se chama "na mesma transação" mas não injeta falha. Na base o vermelho é estrutural (método ausente), não a propriedade. NOTA N1 (não reprova): o `-db` não exerce o caminho do despacho no Postgres; o meu (b) o exerce.

(b) Atomicidade no Postgres — sonda `sonda-pg.mts` (md5 d942f123f02fc30aacd52b45a853e2c8; `node --import tsx` no container, `CORE_SAAS_PERSISTENCE=prisma`, `createDefaultFieldDispatchService` com core stub que só responde `getUserForTenant` = field_technician; organização própria, teardown escopado). Resultados:
- caminho normal: create→tA (com perfil): OS `assigned op=perfil(tA) user=tA`, 1 linha `field_dispatch` com o dispatchId, 1 evento, despacho com 1 evento; create→tC (sem perfil): `op=tC user=tC`; reassign tA→tC: OS→tC, 2ª linha `field_dispatch_reassign`, 2 eventos.
- gatilho `c3_trg_evento` (BEFORE INSERT ON work_order_events WHEN event_type = work_order_assigned → RAISE `C3_INJ_EVENTO`):
  - create tA → ERRO `C3_INJ_EVENTO`; estado: **OS `assigned op=perfil(tA) user=tA`, 1 linha `field_dispatch:a708f1` (despacho APAGADO pela compensação), 0 evento, 0 despacho**;
  - reassign tA→tC → ERRO; estado: **OS `assigned op=tC user=tC` (linha nova de reassign), despacho `13cd77` restaurado a tA `assigned`** — despacho e OS em desacordo;
  - ativar rascunho → ERRO; estado: **OS `assigned op=perfil(tA)` com linha, despacho `20d0cf` de volta a `draft`**.
- gatilho `c3_trg_linha` (BEFORE INSERT ON work_order_assignments → RAISE): create tA → ERRO `C3_INJ_LINHA`; estado: OS `open`, 0 linha, 0 despacho → a transação OS+linha É atômica (o UPDATE da OS voltou).
- Remoção: DROP TRIGGER ×2, DROP FUNCTION ×2 → `pg_trigger tgname LIKE c3_%` = 0, `pg_proc proname LIKE c3_falha%` = 0. Controle sem gatilho: create grava normalmente (1 linha, 1 evento).
- Leitura do blob: `work-order-prisma.repository.ts` `assignFromDispatch` = `$transaction{findFirst; updateManyAndReturn OS; workOrderAssignment.create}`; `work-order.service.ts` `assignFromDispatch` grava o evento DEPOIS, fora da transação; o `RlsPrisma…` envolve cada chamada em `withTenantRls` própria (transações separadas). A compensação em `field-dispatch.service.ts` (`deleteById` / `restoreState`) desfaz só o despacho.
- Veredito parcial (b): **A1 CONFIRMADO no Postgres.** Efeito de acesso medido em memória (item 1): no reassign, o alvo do despacho ativo recebe 403 ao escrever na OS, e quem não é alvo de despacho nenhum escreve (200).

(c) Backfill P6 com o CORPO REAL (sem troca de âncora). Bancos `c3_bf1` e `c3_bf2` no MEU cluster; `prisma migrate deploy --config c3sonda/prisma.config.pre.ts` (cópia de `prisma/` SEM o diretório 20260877; config md5 1faca72ba11ebbe0c2ec626df52a63cc) → 108 aplicadas, 20260877 ausente. Semeadura idêntica nos dois (`seed-bf.mts` md5 b8127fdf41b92ead0f80307c6da56f46): 2 organizações (T1, T2), cada uma com A e B com perfil e C sem perfil, e 9 OS: preencher_perfil (open, accepted→A), dois_ativos (open, A assigned t0 + C reassigned t1), coerente (assigned ao perfil A, despacho A), divergente (assigned ao perfil B, despacho A on_route), encerrada (rejected, A in_service), so_cancelado, fora_open_accepted (accepted, C arrived), so_rascunho (draft), in_service_perfilB (open, B in_service). Arquivo executado = blob do objeto (md5 e8275cb059aeaa01553c0f80301dfc28, LF; a cópia do worktree é CRLF com 139 CR e não foi usada).
1. Papel de migração em produção: `docs/deployment.md:134` ("o migrate continua como postgres"). `c3_bf1` rodado como `postgres`; `c3_bf2` como `c3_rt` (LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS; grants de `scripts/db-runtime-role.sh:68-76` reproduzidos à mão: CONNECT, USAGE no schema, SELECT/INSERT/UPDATE/DELETE em todas as tabelas, USAGE/SELECT em sequências) → `rolsuper=f rolbypassrls=f`. `tenants` tem `relrowsecurity=f` (as 5 tabelas tocadas t/t FORCE) → por `c3_rt` SEM GUC, `SELECT count(*) FROM tenants` = 2: o laço enxerga todas.
2. NOTICE (stderr do psql) × MINHA contagem (SQL por NOT EXISTS, independente do row_number do arquivo): antes `PROPRIA coerentes=2 a_preencher=8 divergentes=4`; NOTICE exec1 `coerentes=2, a_preencher=8, divergentes=4 (nao tocados); OS preenchidas=8` — idêntico nos dois papéis.
3. Antes/depois por OS (snap.sql): mudaram SÓ as 4 "a preencher" de cada organização — preencher_perfil → `perfil:A`, open→assigned; dois_ativos → `user:C` (o MAIS RECENTE; `bf_do_mais_recente=true`); fora_open_accepted → `user:C`, status `accepted` PRESERVADO; in_service_perfilB → `perfil:B`, open→assigned; cada uma 1 linha `field_dispatch_backfill` + 1 evento. coerente, divergente, encerrada, so_cancelado, so_rascunho INTACTAS. `cruzadas` (linha ou evento com tenant diferente do da OS) = 0 em todas. Totais linhas/eventos/atribuídas 0/0/4 → 8/8/12. O depois de `c3_bf2` (c3_rt) == o de `c3_bf1` (postgres), colunas 1–10, `diff` vazio.
4. 2ª execução, nos dois: NOTICE `coerentes=10, a_preencher=0, divergentes=4; OS preenchidas=0`; snapshot 2 == snapshot 1 (`diff` vazio).
5. NOTICE só com totais (l.137-138: 4 contadores); eventos `field_dispatch_backfill` com uuid na mensagem = 0. GUC depois do DO, na mesma sessão: `current_setting(app.current_tenant_id, true)` = vazio nos dois papéis (o `set_config(...,true)` é local à transação do DO; não vaza id).
6. Script sobre o blob, fora de comentários: só `UPDATE work_orders` (l.55, com `AND assigned_operator_id IS NULL`), `INSERT work_order_assignments`, `INSERT work_order_events`; 0 DROP/TRUNCATE/DELETE/ALTER/CREATE/GRANT/REVOKE. Controle do classificador: linha DELETE fabricada → 1; DROP comentado → 0.
Vermelho-controle: (1) `DO … RAISE NOTICE x=1` → `NOTICE: x=1` capturado; (2) `c3_rt` em work_orders: sem GUC 0; com GUC de T1, 9 linhas de 1 organização; total real (postgres) 18 → papel restrito de verdade; (3) mutação (âncoras únicas: contagem 1 e 1 antes, 0 e 0 depois; 139→138 linhas; diff publicado no log): sem `AND w.assigned_operator_id IS NULL` no SELECT e sem a guarda do UPDATE, a re-execução em `c3_bf1` ESCREVE (`OS preenchidas=12`, linhas 8→20) → o teste de idempotência acusa. Cópia mutada removida.
Veredito parcial item 2: backfill P6 correto, idempotente, sob FORCE RLS sem BYPASSRLS e como postgres, laço real, sem DDL; `-db` 7/7, pulo declarado; **A1 confirmado** (a atomicidade quebra fora da transação OS+linha); N1 (nota).

## Item 3 — censo/T11, régua, escopo

(a) Censo e T11 (Windows, meu worktree, `env -u DATABASE_URL -u REDIS_URL node --test --import tsx --test-reporter=tap tests/o6r07c-census-guard.test.ts`, timeout 600): ec=0, `# tests 31 · pass 31 · fail 0` (T0–T13 + 16 subtestes do T12 + tempo).
- Instantâneo objeto × B, chave a chave (script node sobre `git cat-file blob`): 468 × 468 chaves; entraram 0; saíram 0; mudaram 23 = `VISTORIA·07c-b → VISTORIA·ESCOPO` 18, `EVIDENCIA-OS·07c-b → EVIDENCIA-OS·ESCOPO` 4, `DESPACHO·07c-b → DESPACHO·ALVO` 1; `n` inalterado; mudanças fora de `·07c-b` = 0; `·07c-b` no objeto 0 (na base 23).
- T11 no blob: `const LISTA_07C_B: readonly string[] = []` e `assert.deepEqual(atuais, [...LISTA_07C_B].sort())` → IGUALDADE de conjunto (não inclusão).
- Helper (`git diff B O -- tests/helpers/o6r07c-census.ts`, 3 hunks): só a tabela `IN_PROP` (acrescenta as 3 classes novas, mantém as `·07c-b`) e as strings de classe devolvidas pelo `porRegra` (`VISTORIA·07c-b`→`VISTORIA·ESCOPO` etc.); censo, enumeração, tipos e violações intocados. Veredito: tabela, não algoritmo.
- **Regeneração pelo próprio `gravar` do objeto** (`node --import tsx tests/helpers/o6r07c-census.ts gravar $SCRATCH/regen-clean.json`, src limpo, N=2 execuções byte-idênticas por `cmp`): 468 chaves, 0 violações, mas **3 chaves diferem do instantâneo commitado**: `PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_{observation,photo,signature}` — commitado `EVIDENCIA-OS·ESCOPO`, gerado `OS·SEM-ALCANCE`. O instantâneo do objeto não é o que o gerador do objeto produz; o T-series aceita os dois (o T6 só acusa `SEM-ALCANCE` quando o campo alcança, não o inverso). Não declarado no relatório do dev (grep `gravar|SEM-ALCANCE|instant` → só l.62 "31/31 com o instantâneo reclassificado"). Efeito: quem rodar o `gravar` (procedimento do cabeçalho do helper) tira 3 das 23 vias das classes do laço G sem nenhum T do censo acender; quem acende é o "exatamente 23" do laço G (`tests/o6r07c-b-scope.test.ts`, teste 1). As 3 vias de HOJE seguem testadas pelo laço G com o instantâneo commitado (G-NEG/G-EX/G-POS verdes). → ACHADO A2 (ajuste, não grave).

(b) Régua de regressão — fonte primária: logs da CI do objeto (`gh run view --job <id> --log` para arquivo), runs 38997850343 (push, head b198fe35) e 38997853809 (pull_request, merge ref):
- `backend` (job 117294243720, push): `# tests 3399 · pass 3397 · fail 0 · skipped 2`; (job 117294253935, PR): `# tests 3409 · pass 3407 · fail 0 · skipped 2`. Os 2 skips: `RBAC_DB_PARITY não é 1` (paridade de catálogo; pulo declarado, pré-existente — mesmo par na base).
- `backend-postgres` (117294243707 / 117294253904): `# tests 339 · pass 339 · fail 0 · skipped 0`.
- O `-db` do bloco É executado com banco: o job `backend` tem `services.postgres` + `DATABASE_URL` (`ci.yml:31-55,99`, com trava "DATABASE_URL ausente — gate seria verde-cego"); no TAP: `ok 2075..2081` (push) e `ok 2085..2091` (PR) = os 7 casos ([modo] … [backfill P6 · FORCE RLS]); a linha de pulo "07c-b1 no Postgres exige DATABASE_URL" = 0 nos dois. No `backend-postgres` (subconjunto provisionado) ele não está — não é exigido.
- `o6r07c-b-scope` (laço G "23" ×2 runs), `o6r07c-census-guard` (T11 "lista literal" ×2), `o6r07c-subresource-scope` executados no `backend`; `B-SAN3-05 · o papel de runtime não contorna FORCE RLS` → `ok` nos dois runs (a falha do R8 do dev sob a suíte inteira no container NÃO se repetiu na CI).
- Nomes de teste objeto × base (CI da base: run 38776053535, push 4fe7524e, job backend 116564257876: `# tests 3351 · pass 3349 · fail 0 · skipped 2`): `comm` dos nomes ordenados → **sumiram 1** = `T11 — … EXATAMENTE as 23 de hoje (catraca)` (renomeado para `T11 — … EXATAMENTE a lista literal (catraca; vazia desde o 07c-b1)`, presente); novos 49. Denominador 3351 → 3399 (+48). Nenhum teste some.
- Fonte secundária (suíte inteira no meu container): NÃO executada — a fonte primária responde (fail 0 em 4 jobs) e o limite de Docker da casa estava com outro grupo ativo; declarado.

## INTERRUPÇÃO ~04:20Z (01:20 BRT) — retomada 04:51Z pela MESMA identidade

- Causa (aviso do orquestrador): o VS Code fechou; não foi PAUSA nem defeito. Mesma identidade, mesmo contexto (não é sucessor).
- Estado medido na retomada (04:51:31Z): `w-j07cb1c3` HEAD = b198fe35…, `git status --porcelain` = 0 linhas; `j07cb1-c3-node` e `j07cb1-c3-pg` Up 57 min; grupo alheio vivo agora `tl179221234520038-{run,redis,pg}` (1 grupo) + base viva; containers parados alheios (`jtrc01-*`, `agv3-proxy`, `pastrack-*`) só reportados.
- A rodada de guard em segundo plano (`rodada-guard.sh`, md5 no log) terminou antes da queda e restaurou tudo (hash dos 2 routes e do instantâneo = blobs do objeto: 6bc3d595…, b4d08e7f…, c2ff01fd…). O resultado da M25 nela veio anômalo (`# tests 15`, 4 `not ok`: T0, T11, T12, tempo) → re-executada abaixo.

## Item 3 (continuação, depois da retomada)

(a, cont.) M25 e caminho do preguiçoso — rito de mutação no MEU worktree (âncora única contada antes; restauro por `git checkout HEAD --` do arquivo; prova: `git status --porcelain` = 0 e `hash-object` = blob do objeto):
- **M25** (`"classe": "DESPACHO·ALVO"` → `DESPACHO·07c-b`, âncora=1): 3 execuções. #1 (rodada em 2º plano) e #2: `censo 07c (lotes) falhou: Command failed … o6r07c-census.ts lotes` (processo filho do censo morreu; #1 com `Fatal error in , line 0` do V8) → T0–T10/T12/tempo vermelhos por TERRENO, e T11 vermelho pelo motivo certo (`+ ['ROTA PATCH /api/v1/operations/dispatches/:dispatchId/status'] - []`). Controle de terreno: o censo LIMPO entre as duas deu 31/31. #3: `# tests 31 · pass 30 · fail 1` → **só o T11** vermelho. Restauro: hash c2ff01fd… = blob.
- **Preguiçoso, vistoria** (`mut-rota.cjs` md5 d806c7737a1d336e939de4b787ddc3e2: `POST /mobile/checklist-runs/:runId/x` com `requireChecklistPermission(updateRuns)` e handler 200 SEM escopo): antes do `gravar`, censo 30/31 (`not ok T1` — chave viva fora do instantâneo); `gravar` → a nova chave nasce **`VISTORIA·ESCOPO`** (classificação automática), 469 chaves, 0 violações; censo depois do `gravar` **31/31 verde**; `tests/o6r07c-b-scope.test.ts` → `39 · pass 37 · fail 2`: `not ok 1 laço G … 23 … (nunca a menos)` e `not ok laço G [VISTORIA·ESCOPO] …/x` (sem receita → falha). (O mesmo `gravar` também passou as 3 evidências de lote a `OS·SEM-ALCANCE` — o A2.)
- **Preguiçoso, despacho** (`POST /operations/dispatches/:dispatchId/x`, `requireStatusPermission()`, 200 sem escopo): `gravar` → **`DESPACHO·ALVO`**; censo 31/31 verde; b-scope `39 · pass 37 · fail 2` (laço G "23" e a chave sem receita).
- **Controle com escopo** (a mesma rota de vistoria chamando `service.assertRunMutationScope`, a porta das 6 rotas REST): `gravar` → `VISTORIA·ESCOPO`; b-scope `39 · pass 38 · fail 1` (só o "exatamente 23"; a chave nova, como o G testa por receita própria, não é distinguida). Leitura: o laço G acende para QUALQUER chave nova nas 3 classes (com ou sem escopo) — é uma catraca de contagem exata + receita obrigatória, não um detector de escopo; o censo (T0–T13) fica verde nos dois casos. O caminho do preguiçoso NÃO fica todo verde (o b-scope acende) → sem achado; registro que o controle "com escopo passa no laço G" não é alcançável por construção (contagem exata).
- Restauro final da rodada: hash `checklist.routes.ts` 6bc3d595…, `field-dispatch.routes.ts` b4d08e7f…, instantâneo c2ff01fd… = blobs do objeto; porcelain 0.

(b, cont.) `npm run check` ec=0 · `npm run lint` ec=0 · `npm run build` ec=0 (meu worktree, depois do `db:generate` fictício, R7).

(c) Escopo do diff do BLOCO (base B = 4fe7524e; 0 merges em B..O). Extrator do PERMITIDO/PROIBIDO no blob da emenda (`awk` entre `**Permitido:**`/`**Proibido:**`; saída md5 d747976e554fe67e09881ecc45234fdb); classificador `classifica.sh` md5 7d49b5f94974cafd894793b2de03c3bf. Controle do classificador: `prisma/schema.prisma`, `src/app.ts`, `Kpis/kpis-latest.json` → PROIBIDO ×3 (acusa).
`git diff --name-only B O` = 28 arquivos: 13 PERMITIDO (src listado) · 2 PERMITIDO (`tests/o6r07c-b-scope.test.ts`, `-db`) · 1 AUTORIZADO-P6 (a migração 20260877, autorização nominal P6 em decisoes.md:3658 do objeto) · 1 PERMITIDO-CONDICIONAL (instantâneo) · 1 helper (tabela, não algoritmo — acima) · 7 ARTEFATO (relatório do dev + 6 corpos `jurado-07cb1-*` nos dois espelhos; commits 34b8ae73/b198fe35, autor thiagodorgo) · 3 FORA:
- `tests/o6r07c-subresource-scope.test.ts` (DECLARADO, R4/PR): diff = 1 asserção `rejected`→`conflict` no S-KM-RESTART + comentário; asserts 60→60. Classe (ii) pela `D2-07c`. Igual ao declarado.
- `tests/san3-05-acessos-de-plataforma-guard.test.ts` (DECLARADO): diff = 3 entradas em `NOVAS` = `PrismaWorkOrderRepository.assignFromDispatch` × {`workOrder.findFirst`, `workOrder.updateManyAndReturn`, `workOrderAssignment.create`} — exatamente os acessos do método novo; asserts 20→20. Igual ao declarado.
- `tests/o6r07c-census-guard.test.ts` (NÃO declarado como fora da lista): diff = a lista literal do T11 esvaziada (as 23 viram comentário) + título do T11; asserts 23→23; T11 segue igualdade. É o que o CA11 da MESMA emenda exige ("O T11 chega com a lista vazia") e não há outro arquivo onde fazê-lo → NOTA N3 (não reprova).
- Instantâneo: o PERMITIDO diz "só removendo entradas"; o bloco RECLASSIFICOU 23 (nenhuma removida) — remover violaria o T1 (toda chave viva no instantâneo); o caminho é o do CA11/07c-b.5 → NOTA (junto do A2).
- `prisma/**`: só `prisma/migrations/20260877000000_…/migration.sql`; `git diff --quiet B O -- prisma/schema.prisma` ec=0.
- `Kpis/` ec=0 (controle: `tests/o6r07c-b-scope.test.ts` ec=1); `mobile`, `frontend`, `.github`, `catalog.ts`, `src/app.ts`, `package.json`, `package-lock.json`, `src/modules/damages` → ec=0 cada; `approval.*` no diff = 0.
- `agent-orchestration/controle/*` no diff = 0 arquivos (0 linhas removidas).
- `git diff --check B O` ec=0. `node scripts/sync-agent-agents.mjs --check` → "OK — 58 agentes, espelho consistente", ec=0.
- Base importa: `git diff --name-only 79599143 O` = 47 arquivos (inclui `AGENTS.md`, `CLAUDE.md`, `agent-orchestration/controle/decisoes.md`, que NÃO são do bloco) × B..O = 28.
- Corpo do PR (gh pr view 440 --json body, 34 linhas): declara fechar `Ω6R-SEC-002` (o que a P5 prevê para o b1); não declara nada do b2 como feito. NOTA N2: o corpo cita `prisma/migrations/20260874000000_…` (carimbo antigo; o objeto tem 20260877) e a pergunta 1 fala em `on_route` (substituída por "No local", `D-INICIO-ATENDIMENTO-CONFIRMADO`, 79599143:decisoes.md:3719) — texto desatualizado, sem efeito no código.
Veredito parcial item 3: censo com as 23 reclassificadas e nada mais, T11 vazio por igualdade, M25 acende só o T11, preguiçoso acende o laço G; CI 3399/3397/0/2 (push) e 3409/3407/0/2 (PR), backend-postgres 339/339, `-db` executado com banco na CI, nenhum teste sumiu; check/lint/build 0; diff ⊆ PERMITIDO + P6 + 2 declarados + T11 (CA11). Achado A2 (ajuste); notas N2, N3.

## Gravidade e escopo do A1 (para o voto)

- Escopo `dentro-do-bloco`, com evidência de origem: `git log -S"async assignFromDispatch" 4fe7524e..b198fe35` → só `67e5cb1c` (2026-10-16 22:54 -0300, o commit de feature do bloco); `git log -S"assignFromDispatch" 4fe7524e -- src` → 0 commits (não existe na base); a compensação `repository.deleteById(actor.tenantId, dispatch.id)` também nasce em 67e5cb1c.
- Gravidade `bloqueia`; classe `grave: quebra de permissão` (o efeito medido: no reassign com falha no INSERT do evento, quem não é alvo de despacho nenhum escreve na OS — 200 — e o alvo do despacho ativo recebe 403; no create/ativação, o técnico fica com escrita na OS sem despacho ativo — e a linha de histórico aponta um despacho apagado). Regra do corpo: "a falha injetada que deixa despacho e OS em desacordo … grave … se um técnico perde ou ganha escrita por isso"; o resto não está declarado no relatório do dev (o comentário de `assignFromDispatch` declara que o evento vem depois, fora da transação, mas não que a compensação deixa a atribuição gravada). Ciclo 1: `bloqueia` + `dentro-do-bloco` reprova em qualquer classe.

## Fechamento (05:04Z)

- Objeto no fim: `git ls-remote` do ramo = b198fe35… (igual). origin/main no fim: 2a49b0159c83a6019a63b4d2af4d119fe7410972 (andou: #442, B-ARNES-2); merge-base com o objeto segue 4fe7524e → a base do bloco não mudou.
- Terreno: às ~04:55Z o daemon Docker reiniciou; `docker ps -a` mostra erp-postgres, erp-redis e tl179221234520038-{pg,redis} em `Exited (255) 9 minutes ago` (medido 05:03Z). Meus containers estavam ociosos (último uso ~04:10Z). NÃO religuei a base viva (não é minha). Aviso ao orquestrador.
- Limpeza: containers `j07cb1-c3-node`, `j07cb1-c3-pg` (`docker rm -f -v`), rede `j07cb1-c3-net`, imagens `j07cb1-c3-img:local` e `node:20-trixie-slim` (minhas; 0 containers usando) removidas; contagem j07cb1-c3 = 0; worktree `C:/Users/AMP/w-j07cb1c3` removido por `git worktree remove --force` (0 processos com o caminho, ec 0); subpasta `j07cb1c3` do scratchpad (inclui as senhas) apagada; base viva nunca tocada; resíduo alheio só reportado. Disco C: 11G livres.
- Voto: `c3-voto.json` — **REPROVADO** (A1: bloqueia, dentro-do-bloco, grave: quebra de permissão). A2 ajuste; N1–N3 notas.
