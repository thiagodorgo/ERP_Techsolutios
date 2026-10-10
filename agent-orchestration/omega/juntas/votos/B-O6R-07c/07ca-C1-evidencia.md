papel: C1 | identidade: jurado-07ca-c1-escopo-por-objeto | modelo: Claude Opus 5.5 (claude-opus-5-5) · nível menor (substituição §C7.6-bis: Fable não rodou por decisão do dono D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO, 2026-10-10 — topo só no plano e em toda reprovação; fonte: objeto 4ca2be43:agent-orchestration/controle/decisoes.md l.3132; também D-FABLE-ASTRA-SO-DINHEIRO no objeto) | mandato_md5: 5679184d44bcb0020aad05857fec3787 (declarado no disparo: 5679184d44bcb0020aad05857fec3787; cru = EOL-neutro) | corpo_md5: 23594fb3194c0802651edd8299b8433e (blob .claude no objeto; recebido no prompt = mesmo blob, md5 23594fb3194c0802651edd8299b8433e = publicado pelo inspetor) · espelho .agents a2b9192c86ab7cd40968875d276917f2 (difere só pelo cabeçalho "Papel para o Codex" e sem a linha tools:, forma do espelho)

# Evidência C1 — junta do B-O6R-07c-a (PR 414), ciclo 1

## Terreno (2026-10-10T17:01Z)
- objeto: 4ca2be43c3b4b32b9bed670f02d78145620cdc2e — `git ls-remote origin refs/heads/fix/o6r07c-subresource-scope` = `gh pr view 414 headRefOid` (OPEN, isDraft=true, MERGEABLE)
- cerca do mandato: d72552634202aafd712a4bde25fe2134285b88c6 = pai único do objeto; `git diff --name-only d7255263 4ca2be43` = 3 arquivos 00-mandatos/C{1,2,3}c.md (só registro)
- objeto do inspetor: c8bd4c28; `git diff --name-only c8bd4c28 4ca2be43` = 12 arquivos, todos em agent-orchestration/ (merge #415 + parecer + mandatos); 0 em src/ ou tests/
- B = merge-base(origin/main, objeto) = 9b611468902f3984d7704ef2dd6e3ad1d0c08b3a = origin/main no início
- src/ do bloco (`git diff --name-only B objeto -- src/`): work-order-comment.service.ts, work-order-attachment.controller.ts, work-order-attachment.service.ts, work-order.service.ts (4)
- SCRATCH: C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c1
- uname: MINGW64_NT-10.0-22631 N3SOH82 3.6.6 x86_64 Msys · node v20.19.5 · df C: 20G livres (≥10 GB)
- ambiente: Bash (Git Bash), cwd por comando; nenhuma variável exportada; sonda rodará com `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory` por comando, no Windows (Node do worktree)
- worktree: C:/Users/AMP/w-ciclo1-07ca-c1 (detached em 4ca2be43, .git presente, porcelain 0); npm ci próprio em curso; sem junction
- check-runs no objeto às 17:01Z: total 12 | não-verdes 0 | pendentes 8 (in_progress) — re-medir antes do voto

## Item 0 — legalidade (17:01Z–17:20Z)
- `cat votos/B-O6R-07c/insp-07ca-parecer.md` → **LIBERADO COM RESSALVA** (objeto do inspetor c8bd4c28; R1 corpos pelo blob; R2 BEHIND; R3 caminhos; R4 fantasmas no w-07ca; R5 terreno compartilhado). Confere o meu nome (3.1: 0 ocorrências no obituário, composição C1=jurado-07ca-c1-escopo-por-objeto), o meu corpo commitado nos dois espelhos (md5 C1 23594fb3, igual ao que medi) e worktree próprio (o corpo pede w-j07cac1; o mandato nomeia w-ciclo1-07ca-c1, que vale). Veredito parcial: legal.
- objeto andou de c8bd4c28 para 4ca2be43: `git diff --name-only c8bd4c28 4ca2be43` = 12 arquivos, todos `agent-orchestration/**` (merge #415 + parecer + mandatos); src/ e tests/ = 0. O código julgado é o mesmo que o inspetor liberou. Veredito parcial: delta só registro.
- cerca do mandato d7255263 → objeto: só os 3 mandatos C{1,2,3}c.md.
- `git rev-list --parents -n1 4ca2be43` = pai único d7255263; o merge de integração é 762ac5ad (pais c8bd4c28 + 9b611468); B = 9b611468 = origin/main (o merge-base andou de ab52ec50 para 9b611468 porque o #415 entrou; 0 arquivo de src/ no #415).
- normas no objeto (`git show 4ca2be43:CLAUDE.md | grep -c`): D-GOV-PROPORCIONAL=3; decisoes.md: D-FABLE-ASTRA-SO-DINHEIRO=3, D-Ω3F-5-COMMENT=1, D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO l.3132 (entrou com o #415).
- tensão §A2: `REGISTRO-07CA-TENSAO-COORDENADOR` — a conferir no objeto (item abaixo).
- Leio só insumos: plano, críticas, relatório do dev, parecer do inspetor, mandato C1c. NÃO li C2c/C3c nem votos C2/C3.
- catálogo por IMPORT (`node --import tsx catalogo.mts`, md5 bdc49bed088f3f60cd8f7be557fb6bc0), objeto: field_technician e technician = {read, update, status, comment}, sem create/assign/mileage_correct; field_dispatcher = {read, create, status, comment, assign}, sem update; operator = tudo menos assign; manager/tenant_admin/platform_admin/super_admin = todos; finance/auditor/viewer = só read; inventory/support = nenhum work_orders:*. Controle: work_orders:status no field_technician = true; permissão inventada = false (e isValidPermission=false). Veredito parcial: o leitor do catálogo acha e recusa.
- de onde vêm as permissões do ator: `tenant-context.middleware.ts` → `resolvePermissionsForRoles(roles)` (catálogo); `x-permissions` só FILTRA quando presente. A sonda NÃO envia `x-permissions`: permissões = catálogo pelo papel em `x-role`.

## Item 1 — G-NEG/G-POS/G-WIDE no OBJETO (2026-10-10T17:13:18Z)
- terreno da sonda: Node v20.19.5 no Windows, worktree C:/Users/AMP/w-ciclo1-07ca-c1 (objeto 4ca2be43), `npm ci` próprio ec=0 (326 pacotes), `prisma generate` com DATABASE_URL placeholder só no ambiente do comando (sem conexão) ec=0. Sem banco, sem Redis, sem container.
- comando: `timeout 900 env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory NODE_ENV=test LOG_LEVEL=silent C1_TMP=$SCRATCH node --import tsx $SCRATCH/sonda.mts <wt> <rótulo> <wt>/tests/fixtures/o6r07c-classificacao-vias.json 123 <saída>`; variante com dublê do provedor de geocodificação: `--import file:///$SCRATCH/geo-registro.mjs` (troca SÓ a classe NoopGeocoder importada por src/modules/work-orders/* por uma habilitada que devolve coordenada fixa — estágio posterior à decisão de acesso; geo-falso.mjs md5 3f688ff9, geo-loader.mjs 85ecfd86, geo-registro.mjs 94b948cc).
- sonda: $SCRATCH/sonda.mts md5 3d967e579aa51160b923f3d6ca1e2f59 (texto verbatim fica no scratchpad até o teardown; resumo: createApp(new MemoryCoreSaasAdapter(CoreSaasRegistry(InMemoryCoreSaasStore))) em listen(0, 127.0.0.1), tudo por fetch HTTP; ator por x-tenant-id/x-user-id/x-role; SEM x-permissions salvo no controle de motivo; semente por execução: OS criada pelo managerA (serviceAddress+destinationAddress), atribuída por PERFIL ou por USER ID via POST /assign, anexo PNG do managerA, comentário do ATRIBUÍDO, tag1 solta e tag2 presa ao comentário; estado lido pelo managerA: título, status, atribuído, km, geo origem/destino, anexos (id:status do download:md5 do binário), comentários (id|texto|tags|editado), nº de eventos da timeline).
- as 13 entradas, extraídas por script do instantâneo do objeto (468 chaves; OS·07a=3, OS·07c-a=10): DELETE attachments/:id · DELETE comments/:id · DELETE comments/:id/tags/:tagId · PATCH OS · PATCH comments/:id · PATCH status · POST attachments · POST comments · POST comments/:id/tags/:tagId · POST geocode · POST geocode-destination · LOTE work_order.mileage · LOTE work_order.status_change. Permissão comparada (lida no blob): comments/* = work_orders:comment (work-order-comment.routes.ts:46-82); POST attachments = requireAnyPermission(create, update) (work-order.routes.ts:224); DELETE attachments, geocode, geocode-destination, PATCH OS = work_orders:update; PATCH status = work_orders:status; lote: assertSyncActor (create|status|assign) + por ação work_orders:status para mileage e status_change (mobile-work-order-sync.ts:244,264). Os dois papéis de campo têm update+status+comment no catálogo (item 0).
- corpos: vazio ({} / sem multipart / id inexistente de anexo-comentário-tag / km sem mileage_start / status sem status; no geocode: OS SEM endereço (→422) e OS COM coordenada (→409)) e válido (PNG multipart; texto; tag existente; OS com endereço sem coordenada; mileage_start 4242; status accepted; title).
- resultado, verificador $SCRATCH/checa1.cjs (md5 76bc6bcb872b687d322e42e51fac9d6e):
  - objeto puro: {"rotulo":"objeto-puro","linhas":308,"porGrupo":{"G-NEG":56,"G-POS":84,"G-WIDE":56,"G-WIDE-info":28,"S-ROLES":28,"CTRL-MOTIVO":56},"falhas":0}
  - objeto c/ dublê geo: {"rotulo":"objeto-geofalso","linhas":308,"porGrupo":{"G-NEG":56,"G-POS":84,"G-WIDE":56,"G-WIDE-info":28,"S-ROLES":28,"CTRL-MOTIVO":56},"falhas":0}
  - G-NEG (tecnicoB field_technician e tecnicoT technician na osA, 13 entradas × 2-3 corpos = 56 linhas por execução): 403 not_assigned_to_actor no REST (11 rotas) e lote HTTP 200 com a ação rejected not_assigned_to_actor (2 pares), em TODOS os corpos — inclusive corpo vazio (sem multipart: 403 e não 400; id de anexo/comentário/tag inexistente: 403 e não 404; geocode em OS sem endereço: 403 e não 422; em OS com coordenada: 403 e não 409; km sem mileage_start: rejected not_assigned_to_actor e não mileage_required). Estado da OS idêntico antes/depois em 56/56 (inclusive o binário do anexo e a timeline), e com dublê do geocoder habilitado também 0 efeito.
  - G-POS (tecnicoA por perfil na osA; tecnicoU por USER ID na osU; tecnicoT2 technician por perfil na osT): 0 not_assigned_to_actor em 84 linhas; com corpo válido, 2xx/accepted e o estado muda em todas (anexos, comentários, tags, título, status, km); geocode válido = 200 geocoded:false com o Noop (passou escopo, 409 e 422 e chegou ao provedor desligado) e 200 geocoded:true com geoO/geoD movidos sob o dublê. Corpo vazio do atribuído dá a validação esperada (400 multipart_required, 400 comment_required, 422 tag_not_found, 404 attachment_not_found, 409/422 no geocode, rejected mileage_required/invalid_status).
  - G-WIDE (managerA, operatorA na osA): 0 not_assigned_to_actor e 0 permission_required em 56 linhas; válido muda o estado. dispatcherA (informativo): permission_required onde o catálogo não dá update (DELETE anexo, PATCH OS, geocode); comment_forbidden ao editar/apagar/taggear comentário alheio (moderação D-Ω3F-5-COMMENT: não é autor nem tem update) — nunca not_assigned_to_actor.
  - S-ROLES (field_technician+manager, sem atribuição na osA): 0 not_assigned_to_actor; anexo 201 e comentário 201 (e as outras 11 entradas também passam).
  - CTRL leitor de motivo: auditorA (catálogo só read) e tecnicoB com x-permissions=work_orders:read → 403 permission_required em 56/56 linhas, nunca not_assigned_to_actor (o leitor separa RBAC de escopo).
  - CTRL leitor de efeito: as escritas legítimas do managerA (G-WIDE válido) movem o estado em 13/13 entradas (geo com dublê) e o comparador acusa (anexos, comentarios, title, status, km, geoO, geoD, eventos).
- veredito parcial (objeto): G-NEG/G-POS/G-WIDE/S-ROLES conformes; falta o vermelho-controle no head-base.

## Item 1 — vermelho-controle no head-base (2026-10-10T17:15:17Z)
- troca (só no meu worktree): copiei os 4 arquivos de src/ do bloco para $SCRATCH/copia (md5 e683844e, 16eea2ad, 6f45cac1, 8fedad2c) e sobrescrevi cada um com `git cat-file --filters 9b611468:<f>`. Prova: `git hash-object <f>` = `git rev-parse B:<f>` nos 4 (9eef1741, 2199e07f, 0d4ab5d2, a90a19d5 — SIM 4/4; objeto = fe05688b, 47940604, d7d7ab1c, 4196e968).
- a MESMA sonda (md5 3d967e57), pura e com o dublê geo: ec=0 nas duas, 308 linhas cada.
- `node checa1.cjs r-base-geo.json base`: falhas 0 = (a) as 3 entradas do 07a seguem 403/rejected not_assigned_to_actor sem efeito (controle) e (b) as 10 do 07c-a NÃO dão not_assigned_to_actor e, com corpo válido, MUDAM o estado. Tabela G-NEG na base (dublê geo):
  - OS·07c-a | tecnicoB | LOTE work_order.mileage | vazio | 200 rejected mileage_required | =
  - OS·07c-a | tecnicoB | LOTE work_order.mileage | valido | 200 accepted  | km+eventos
  - OS·07c-a | tecnicoT | LOTE work_order.mileage | vazio | 200 rejected mileage_required | =
  - OS·07c-a | tecnicoT | LOTE work_order.mileage | valido | 200 accepted  | km+eventos
  - OS·07a | tecnicoB | LOTE work_order.status_change | vazio | 200 rejected not_assigned_to_actor | =
  - OS·07a | tecnicoB | LOTE work_order.status_change | valido | 200 rejected not_assigned_to_actor | =
  - OS·07a | tecnicoT | LOTE work_order.status_change | vazio | 200 rejected not_assigned_to_actor | =
  - OS·07a | tecnicoT | LOTE work_order.status_change | valido | 200 rejected not_assigned_to_actor | =
  - OS·07c-a | tecnicoB | ROTA DELETE OS/attachments/:attachmentId | vazio | 404  attachment_not_found | =
  - OS·07c-a | tecnicoB | ROTA DELETE OS/attachments/:attachmentId | valido | 204   | anexos
  - OS·07c-a | tecnicoT | ROTA DELETE OS/attachments/:attachmentId | vazio | 404  attachment_not_found | =
  - OS·07c-a | tecnicoT | ROTA DELETE OS/attachments/:attachmentId | valido | 204   | anexos
  - OS·07c-a | tecnicoB | ROTA DELETE OS/comments/:commentId | vazio | 404  not_found | =
  - OS·07c-a | tecnicoB | ROTA DELETE OS/comments/:commentId | valido | 204   | comentarios
  - OS·07c-a | tecnicoT | ROTA DELETE OS/comments/:commentId | vazio | 404  not_found | =
  - OS·07c-a | tecnicoT | ROTA DELETE OS/comments/:commentId | valido | 204   | comentarios
  - OS·07c-a | tecnicoB | ROTA DELETE OS/comments/:commentId/tags/:tagId | vazio | 404  tag_assignment_not_found | =
  - OS·07c-a | tecnicoB | ROTA DELETE OS/comments/:commentId/tags/:tagId | valido | 204   | comentarios
  - OS·07c-a | tecnicoT | ROTA DELETE OS/comments/:commentId/tags/:tagId | vazio | 404  tag_assignment_not_found | =
  - OS·07c-a | tecnicoT | ROTA DELETE OS/comments/:commentId/tags/:tagId | valido | 204   | comentarios
  - OS·07a | tecnicoB | ROTA PATCH OS | vazio | 403  not_assigned_to_actor | =
  - OS·07a | tecnicoB | ROTA PATCH OS | valido | 403  not_assigned_to_actor | =
  - OS·07a | tecnicoT | ROTA PATCH OS | vazio | 403  not_assigned_to_actor | =
  - OS·07a | tecnicoT | ROTA PATCH OS | valido | 403  not_assigned_to_actor | =
  - OS·07c-a | tecnicoB | ROTA PATCH OS/comments/:commentId | vazio | 400  comment_required | =
  - OS·07c-a | tecnicoB | ROTA PATCH OS/comments/:commentId | valido | 200   | comentarios
  - OS·07c-a | tecnicoT | ROTA PATCH OS/comments/:commentId | vazio | 400  comment_required | =
  - OS·07c-a | tecnicoT | ROTA PATCH OS/comments/:commentId | valido | 200   | comentarios
  - OS·07a | tecnicoB | ROTA PATCH OS/status | vazio | 403  not_assigned_to_actor | =
  - OS·07a | tecnicoB | ROTA PATCH OS/status | valido | 403  not_assigned_to_actor | =
  - OS·07a | tecnicoT | ROTA PATCH OS/status | vazio | 403  not_assigned_to_actor | =
  - OS·07a | tecnicoT | ROTA PATCH OS/status | valido | 403  not_assigned_to_actor | =
  - OS·07c-a | tecnicoB | ROTA POST OS/attachments | vazio | 400  multipart_required | =
  - OS·07c-a | tecnicoB | ROTA POST OS/attachments | valido | 201   | anexos
  - OS·07c-a | tecnicoT | ROTA POST OS/attachments | vazio | 400  multipart_required | =
  - OS·07c-a | tecnicoT | ROTA POST OS/attachments | valido | 201   | anexos
  - OS·07c-a | tecnicoB | ROTA POST OS/comments | vazio | 400  comment_required | =
  - OS·07c-a | tecnicoB | ROTA POST OS/comments | valido | 201   | comentarios
  - OS·07c-a | tecnicoT | ROTA POST OS/comments | vazio | 400  comment_required | =
  - OS·07c-a | tecnicoT | ROTA POST OS/comments | valido | 201   | comentarios
  - OS·07c-a | tecnicoB | ROTA POST OS/comments/:commentId/tags/:tagId | vazio | 422  tag_not_found | =
  - OS·07c-a | tecnicoB | ROTA POST OS/comments/:commentId/tags/:tagId | valido | 201   | comentarios
  - OS·07c-a | tecnicoT | ROTA POST OS/comments/:commentId/tags/:tagId | vazio | 422  tag_not_found | =
  - OS·07c-a | tecnicoT | ROTA POST OS/comments/:commentId/tags/:tagId | valido | 201   | comentarios
  - OS·07c-a | tecnicoB | ROTA POST OS/geocode | vazio-422 | 422  no_address | =
  - OS·07c-a | tecnicoB | ROTA POST OS/geocode | vazio-409 | 409  already_geocoded | =
  - OS·07c-a | tecnicoB | ROTA POST OS/geocode | valido | 200   | geoO
  - OS·07c-a | tecnicoT | ROTA POST OS/geocode | vazio-422 | 422  no_address | =
  - OS·07c-a | tecnicoT | ROTA POST OS/geocode | vazio-409 | 409  already_geocoded | =
  - OS·07c-a | tecnicoT | ROTA POST OS/geocode | valido | 200   | geoO
  - OS·07c-a | tecnicoB | ROTA POST OS/geocode-destination | vazio-422 | 422  no_destination_address | =
  - OS·07c-a | tecnicoB | ROTA POST OS/geocode-destination | vazio-409 | 409  already_geocoded | =
  - OS·07c-a | tecnicoB | ROTA POST OS/geocode-destination | valido | 200   | geoD
  - OS·07c-a | tecnicoT | ROTA POST OS/geocode-destination | vazio-422 | 422  no_destination_address | =
  - OS·07c-a | tecnicoT | ROTA POST OS/geocode-destination | vazio-409 | 409  already_geocoded | =
  - OS·07c-a | tecnicoT | ROTA POST OS/geocode-destination | valido | 200   | geoD
- leitura: na base o técnico não atribuído (os DOIS papéis) apaga anexo (204, anexo some), apaga/edita comentário, (des)taggeia, comenta, anexa, geocodifica origem e destino (com provedor: geoO/geoD movem) e lança km (accepted, km gravada); e o corpo vazio revela formato/estado (400 multipart_required, 409 already_geocoded, 422 no_address, 404 attachment_not_found). No objeto, tudo isso virou 403/rejected not_assigned_to_actor sem efeito.
- CTRL do verificador: `checa1.cjs r-base-geo.json objeto` (régua do objeto aplicada à base) → 44 FALHAS (10 vias × 2 papéis × 2-3 corpos = 32+12). A régua acusa quando o defeito existe.
- comparação linha a linha base × objeto ($SCRATCH/compara1.cjs): geo 308/308 chaves, 44 diferentes, TODAS no grupo G-NEG; puro idem 44, todas G-NEG. G-POS (84), G-WIDE (56), dispatcher (28), S-ROLES (28) e CTRL-MOTIVO (56) idênticos base × objeto (status, balde, motivo e campos mudados). CTRL do comparador: objeto × objeto = 0 diferentes.
- restauro: cópia de volta; `git hash-object` = blob do objeto nos 4 (fe05688b, 47940604, d7d7ab1c, 4196e968: SIM 4/4); `git status --porcelain` = 0 linhas.
- veredito parcial ITEM 1: VERDE — G-NEG fechado nas 13 entradas pelos dois papéis assigned_only, nos dois corpos, por status, motivo e efeito, com o escopo antes de qualquer validação; G-POS (perfil e user id, field_technician e technician) e G-WIDE e S-ROLES intactos; vermelho-controle mostra o defeito na base nas 10 vias e o 07a como controle. Nenhum achado.

## Item 2 — matriz efetiva × RBAC_MATRIX.md:45,66 × catálogo; S-MOD; 404 entre organizações (2026-10-10T17:16:56Z)
- RBAC_MATRIX.md no objeto (`git show 4ca2be43:RBAC_MATRIX.md`): l.29 cabeçalho (platform_admin|tenant_admin|manager|operator|finance|inventory|field_technician|auditor|support); l.45 Work orders = full|full|full|create/edit|read|material-view|execute/update-assigned|read|support-view; l.66 field_technician "updates assigned operational flows".
- (a) matriz gerada por script: $SCRATCH/matriz2.cjs (md5 fd315c16520ae40f4acad8191e333ce6) sobre o item2a da sonda (base e objeto, dublê geo), OS NÃO atribuída ao ator, corpo válido, ator novo por papel, papel só pelo x-role (permissões do catálogo). Célula = c (catálogo dá a permissão comparada) / - , base>objeto:
  entrada | permissão | platform_admin | tenant_admin | manager | operator | finance | inventory | field_technician | auditor | support | technician | field_dispatcher
  LOTE work_order.mileage | work_orders:status | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | c:OK>OK
  LOTE work_order.status_change | work_orders:status | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:ESCOPO>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:ESCOPO>ESCOPO | c:OK>OK
  DELETE OS/attachments/:attachmentId | work_orders:update | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM
  DELETE OS/comments/:commentId | work_orders:comment | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | c:403/-/comment_forbidden>403/-/comment_forbidden
  DELETE OS/comments/:commentId/tags/:tagId | work_orders:comment | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | c:403/-/comment_forbidden>403/-/comment_forbidden
  PATCH OS | work_orders:update | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:ESCOPO>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:ESCOPO>ESCOPO | -:PERM>PERM
  PATCH OS/comments/:commentId | work_orders:comment | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | c:403/-/comment_forbidden>403/-/comment_forbidden
  PATCH OS/status | work_orders:status | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:ESCOPO>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:ESCOPO>ESCOPO | c:OK>OK
  POST OS/attachments | work_orders:create/work_orders:update | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | c:OK>OK
  POST OS/comments | work_orders:comment | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | c:OK>OK
  POST OS/comments/:commentId/tags/:tagId | work_orders:comment | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | c:403/-/comment_forbidden>403/-/comment_forbidden
  POST OS/geocode | work_orders:update | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM
  POST OS/geocode-destination | work_orders:update | c:OK>OK | c:OK>OK | c:OK>OK | c:OK>OK | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM | -:PERM>PERM | c:OK>ESCOPO | -:PERM>PERM
  DIFF base×objeto: 20 células
     LOTE work_order.mileage field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     LOTE work_order.mileage technician : 2xx/accepted -> 403 not_assigned_to_actor
     DELETE OS/attachments/:attachmentId field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     DELETE OS/attachments/:attachmentId technician : 2xx/accepted -> 403 not_assigned_to_actor
     DELETE OS/comments/:commentId field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     DELETE OS/comments/:commentId technician : 2xx/accepted -> 403 not_assigned_to_actor
     DELETE OS/comments/:commentId/tags/:tagId field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     DELETE OS/comments/:commentId/tags/:tagId technician : 2xx/accepted -> 403 not_assigned_to_actor
     PATCH OS/comments/:commentId field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     PATCH OS/comments/:commentId technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/attachments field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/attachments technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/comments field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/comments technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/comments/:commentId/tags/:tagId field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/comments/:commentId/tags/:tagId technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/geocode field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/geocode technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/geocode-destination field_technician : 2xx/accepted -> 403 not_assigned_to_actor
     POST OS/geocode-destination technician : 2xx/accepted -> 403 not_assigned_to_actor
  incoerências catálogo×objeto: 0
- leitura: só mudaram as células de field_technician e technician (os dois assigned_only), e só para 403 not_assigned_to_actor (20 = 10 vias × 2 papéis; as 3 do 07a já eram ESCOPO na base). Papéis não assigned_only: 0 célula mudou. Conforme a l.45: platform_admin/tenant_admin/manager (full) e operator (create/edit) escrevem nas 13; finance/auditor (read), inventory (material-view), support (support-view) recebem permission_required nas 13; field_technician (execute/update-assigned) só escreve no atribuído (item 1 G-POS) e recebe escopo no não atribuído nas 13. technician (legado, fora da l.45) = field_technician. field_dispatcher (fora das colunas da l.45): igual base×objeto (OK em lote/status/POST anexo/POST comentário; permission_required onde falta update; comment_forbidden na moderação).
- CE-G2: incoerências catálogo×objeto = 0 (todo papel cujo catálogo dá a permissão comparada nunca recebe permission_required; todo papel sem ela sempre recebe). Nos passos da sonda do item 1, os atores G-NEG/G-POS/G-WIDE têm a permissão que a rota compara (catálogo, item 0).
- divergência matriz×catálogo pré-existente nas 13 entradas: nenhuma medida (finance sem work_orders:comment no catálogo do objeto).
- CTRL comparador: tabelas fabricadas que diferem em UMA célula → aponta só [A|y 403 p→403 n]; tabelas idênticas → []. CTRL leitor do catálogo: work_orders:status no field_technician = true; permissão inventada = false (item 0).
- (b) moderação, base × objeto ($SCRATCH/r-*-geo.json item2b):
  - 1 managerA edita+apaga comentário do tecnicoA na osA: base {"edita":"200","apaga":"204","editou":["comentarios"],"apagou":["comentarios"]} · objeto {"edita":"200","apaga":"204","editou":["comentarios"],"apagou":["comentarios"]} · igual=true
  - 2 operatorA edita+apaga comentário do tecnicoA na osA: base {"edita":"200","apaga":"204","editou":["comentarios"],"apagou":["comentarios"]} · objeto {"edita":"200","apaga":"204","editou":["comentarios"],"apagou":["comentarios"]} · igual=true
  - 3 dispatcherA edita+apaga comentário do tecnicoA na osA: base {"edita":"403 comment_forbidden","apaga":"403 comment_forbidden","editou":[],"apagou":[]} · objeto {"edita":"403 comment_forbidden","apaga":"403 comment_forbidden","editou":[],"apagou":[]} · igual=true
  - CTRL-3 auditorA edita+apaga comentário do tecnicoA na osA: base {"edita":"403 permission_required","apaga":"403 permission_required","editou":[],"apagou":[]} · objeto {"edita":"403 permission_required","apaga":"403 permission_required","editou":[],"apagou":[]} · igual=true
  - 4 tecnicoA edita+apaga, na osA (dele), o comentário do managerA: base {"edita":"200","apaga":"204","editou":["comentarios"],"apagou":["comentarios"]} · objeto {"edita":"200","apaga":"204","editou":["comentarios"],"apagou":["comentarios"]} · igual=true
  - 5 tecnicoA edita o próprio: base {"edita":"200","editou":["comentarios"]} · objeto {"edita":"200","editou":["comentarios"]} · igual=true
  - 6 tecnicoB edita/marca/desmarca/apaga no comentário do tecnicoA na osA: base {"edita":"200","marca":"201","desmarca":"204","apaga":"204","mudou":["comentarios"]} · objeto {"edita":"403 not_assigned_to_actor","marca":"403 not_assigned_to_actor","desmarca":"403 not_assigned_to_actor","apaga":"403 not_assigned_to_actor","mudou":[]} · igual=false
  - leitura: linhas 1, 2, 4 e 5 idênticas base×objeto e com efeito (gestor e operador moderam o comentário do técnico; o atribuído edita e apaga, na OS dele, o comentário da gestão — a cláusula autor OU update do D-Ω3F-5-COMMENT vale dentro da OS que cabe ao técnico; edita o próprio). Linha 3: field_dispatcher recebe 403 comment_forbidden em base e objeto — o catálogo lhe dá work_orders:comment mas não work_orders:update, e ele não é autor. Linha 6: tecnicoB passou de 200/201/204/204 (com efeito) na base a 403 not_assigned_to_actor ×4 no objeto, comentário e tags intactos. CTRL-3: auditor recusado (403 permission_required) nas duas refs; e o dispatcher (com comment, sem update) é a recusa da moderação propriamente dita (comment_forbidden) — o caminho 1–5 não aceita tudo.
- (c) 404 entre organizações (tecnicoB2, field_technician da org B, atribuído à própria osB; sanidade: comenta na osB = 201 nas duas refs):
  - 13/13 entradas: tecnicoB2 na osA → REST 404 (WORK_ORDER_NOT_FOUND/work_order_not_found em anexo; WORK_ORDER_COMMENT_NOT_FOUND/not_found em comentário e tag; WORK_ORDER_NOT_FOUND/not_found em PATCH, status e geocode) e lote 200 com a ação rejected code WORK_ORDER_NOT_FOUND reason not_found; corpo de erro BYTE-IGUAL ao da base em 13/13; estado da osA sem mudança 13/13.
  - id de OS inexistente (tecnicoB, org A): 404 / rejected not_found em 13/13, corpo igual ao da base 13/13, e corpo do cross-tenant == corpo do inexistente em 13/13 (não revela existência).
  - controle: tecnicoB (mesma org, não atribuído) → 403 / rejected not_assigned_to_actor em 13/13 no objeto (na base: 204/201/200/accepted nas 10 vias, 403 nas 3 do 07a) — o 404 não é constante.
- veredito parcial ITEM 2: VERDE — matriz efetiva só muda nos assigned_only e só para escopo, conforme a l.45/l.66; moderação 1–5 igual à base; 404 entre organizações intacto e indistinguível do inexistente. Nenhum achado. R-a5 (despachado sem atribuição perde comentar/anexar pelo console) não é achado — conforme a l.45, matéria da D1.

## Item 3 — a km pelo sync (2026-10-10T17:17:59Z)
- mesma sonda (item3), objeto (puro e dublê geo) e base (troca provada no item 1). Saída por ação (balde/status/code/reason), sem ids:
  - [objeto-geofalso] a tecnicoB/field_technician status+km no mesmo lote: {"http":200,"porAcao":[{"type":"work_order.status_change","balde":"rejected","status":"rejected","code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"},{"type":"work_order.mileage","balde":"rejected","status":"rejected","code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"}],"summary":{"received":2,"accepted":0,"rejected":2,"conflicts":0,"already_applied":0},"mudou":[]}
  - [objeto-geofalso] a tecnicoT/technician status+km no mesmo lote: {"http":200,"porAcao":[{"type":"work_order.status_change","balde":"rejected","status":"rejected","code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"},{"type":"work_order.mileage","balde":"rejected","status":"rejected","code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"}],"summary":{"received":2,"accepted":0,"rejected":2,"conflicts":0,"already_applied":0},"mudou":[]}
  - [objeto-geofalso] a tecnicoB km inválida (sem mileage_start): {"http":200,"porAcao":[{"type":"work_order.mileage","balde":"rejected","status":"rejected","code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"}],"mudou":[]}
  - [objeto-geofalso] b isolamento por ação (tecnicoA: própria osA + osX alheia): {"http":200,"porAcao":[{"type":"work_order.mileage","balde":"accepted","status":"accepted","code":null,"reason":null},{"type":"work_order.mileage","balde":"rejected","status":"rejected","code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"}],"summary":{"received":2,"accepted":1,"rejected":1,"conflicts":0,"already_applied":0},"kmA":[[null,null,null],[1000,null,"app"]],"kmX":[[null,null,null],[null,null,null]],"mudouX":[]}
  - [objeto-geofalso] c S-KM-RESTART: {"p1":{"type":"work_order.mileage","balde":"accepted","status":"accepted","code":null,"reason":null},"p2":{"http":200,"reason":null,"assignedDepois":"perfil tecnicoX"},"p3":{"type":"work_order.mileage","balde":"already_applied","status":"already_applied","code":null,"reason":null},"p4":{"type":"work_order.mileage","balde":"rejected","status":"rejected","code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"},"p5_kmArmazenada":[500,null,"app"],"atribuidoFinal":"perfil tecnicoX"}
  - [objeto-geofalso] CTRL-2 reset é real (tecnicoA continua atribuído): {"q1":"accepted","q2":"already_applied","q3_aposReset":"accepted"}
  - [objeto-geofalso] CTRL-1 leitor da km acha: {"manager":"200","km0":[null,null,null],"km1":[31,null,"base"],"tecnicoA":"accepted","km2":[32,null,"app"]}
  - [base-geofalso] a tecnicoB/field_technician status+km no mesmo lote: {"http":200,"porAcao":[{"type":"work_order.status_change","balde":"rejected","status":"rejected","code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"},{"type":"work_order.mileage","balde":"accepted","status":"accepted","code":null,"reason":null}],"summary":{"received":2,"accepted":1,"rejected":1,"conflicts":0,"already_applied":0},"mudou":["km","eventos"]}
  - [base-geofalso] a tecnicoT/technician status+km no mesmo lote: {"http":200,"porAcao":[{"type":"work_order.status_change","balde":"rejected","status":"rejected","code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"},{"type":"work_order.mileage","balde":"accepted","status":"accepted","code":null,"reason":null}],"summary":{"received":2,"accepted":1,"rejected":1,"conflicts":0,"already_applied":0},"mudou":["km","eventos"]}
  - [base-geofalso] a tecnicoB km inválida (sem mileage_start): {"http":200,"porAcao":[{"type":"work_order.mileage","balde":"rejected","status":"rejected","code":"WORK_ORDER_INVALID","reason":"mileage_required"}],"mudou":[]}
  - [base-geofalso] b isolamento por ação (tecnicoA: própria osA + osX alheia): {"http":200,"porAcao":[{"type":"work_order.mileage","balde":"accepted","status":"accepted","code":null,"reason":null},{"type":"work_order.mileage","balde":"accepted","status":"accepted","code":null,"reason":null}],"summary":{"received":2,"accepted":2,"rejected":0,"conflicts":0,"already_applied":0},"kmA":[[null,null,null],[1000,null,"app"]],"kmX":[[null,null,null],[2000,null,"app"]],"mudouX":["km","eventos"]}
  - [base-geofalso] c S-KM-RESTART: {"p1":{"type":"work_order.mileage","balde":"accepted","status":"accepted","code":null,"reason":null},"p2":{"http":200,"reason":null,"assignedDepois":"perfil tecnicoX"},"p3":{"type":"work_order.mileage","balde":"already_applied","status":"already_applied","code":null,"reason":null},"p4":{"type":"work_order.mileage","balde":"accepted","status":"accepted","code":null,"reason":null},"p5_kmArmazenada":[500,null,"app"],"atribuidoFinal":"perfil tecnicoX"}
  - [base-geofalso] CTRL-2 reset é real (tecnicoA continua atribuído): {"q1":"accepted","q2":"already_applied","q3_aposReset":"accepted"}
  - [base-geofalso] CTRL-1 leitor da km acha: {"manager":"200","km0":[null,null,null],"km1":[31,null,"base"],"tecnicoA":"accepted","km2":[32,null,"app"]}
- (a) objeto: o tecnicoB (field_technician) e o tecnicoT (technician) mandam status_change + mileage da osA NO MESMO LOTE → HTTP 200, as duas ações no balde rejected, code WORK_ORDER_NOT_ASSIGNED, reason not_assigned_to_actor; a forma das duas ações é idêntica (comparação do objeto da ação sem id/type = true; erro byte-igual {code,reason,message}); status e km da osA inalterados. km inválida (sem mileage_start) do tecnicoB → rejected not_assigned_to_actor (não mileage_required). Base: só o status é recusado; a km é accepted e grava (km+eventos mudam); km inválida na base = rejected mileage_required.
- (b) isolamento por ação, objeto: tecnicoA, mesmo lote, km 1000 na própria osA + km 2000 na osX (do tecnicoX) → HTTP 200, summary accepted 1 / rejected 1; osA km [null→1000, app]; osX inalterada (rejected not_assigned_to_actor). Base: as duas accepted e a osX recebe 2000.
- (c) S-KM-RESTART, objeto: p1 K da osA → accepted; p2 POST /assign do managerA para o perfil do tecnicoX → 200, atribuída ao tecnicoX; p3 reenvio de K no mesmo processo → already_applied; p4 após resetMobileWorkOrderSyncRuntimeForTests() → rejected not_assigned_to_actor; p5 km armazenada = 500 (a aplicada no p1), fonte app. Base: p4 = accepted (o escopo não existia).
- CTRL-1 leitor da km acha: managerA PATCH /work-orders/:id/mileage 31 → 200 e km [null→31, base]; tecnicoA km 32 pelo sync na própria → accepted e km [31→32, app] (objeto e base).
- CTRL-2 reset é real: tecnicoA ainda atribuído, K2 → accepted; reenvio → already_applied; após reset → accepted DE NOVO (processado, não already_applied), objeto e base.
- CTRL-3 leitor do lote separa: o corpo da função lote() EXTRAÍDO por awk da própria sonda ($SCRATCH/ctrl-lote.mts md5 c5d0bb87591159645320f1403e53fb41) aplicado a uma resposta fabricada com uma ação accepted e outra rejected → {accepted:1, rejected:1, [accepted:-, rejected:R]}, ec=0.
- R-a4 (informação, não reprova): `git grep -nF 'work_order.mileage' 4ca2be43 -- mobile` = 0; `git log --all --oneline -S'"work_order.mileage"' -- mobile` = 0 commits; controle: -F work_order.status_change = 3 e -F work_order.create = 3 no mesmo alcance (o grep acha o que existe). (Sem -F, o '.' casa 'work_order_mileage_updated' em work_order_remote_api.dart:287, um tipo de EVENTO de timeline, não de ação.) O app não produz a ação work_order.mileage: fechar a via 10 não tira nada do técnico pelo app.
- veredito parcial ITEM 3: VERDE — a km do não atribuído (os dois papéis) é rejected por ação, no lote 200, com a mesma forma e motivo do status do 07a, antes da validação, sem efeito; isolada por ação; S-KM-RESTART already_applied → rejected not_assigned_to_actor com a km aplicada preservada. Nenhum achado.

## Fechamento — objeto, main e CI no fim (2026-10-10T17:20:04Z)
- correção de registro: o cabeçalho "Item 0 — legalidade (17:01Z–17:20Z)" acima traz um intervalo que digitei, não medi; o item 0 foi gravado por volta de 17:07Z. As horas dos itens 1–3 vêm de `date -u` no momento da gravação.
- objeto no fim (17:18:26Z): `git ls-remote` = `gh pr view 414` = 4ca2be43c3b4b32b9bed670f02d78145620cdc2e (não andou; OPEN, rascunho, MERGEABLE); origin/main = 9b611468 (não andou; B não muda).
- check-runs no objeto (`gh api .../commits/4ca2be43.../check-runs?per_page=100`, filtro: não-verde = completed com conclusion ∉ {success, skipped, neutral}; pendente = status ≠ completed): total 14 | não-verdes 1 | pendentes 0.
  - o não-verde: `backend` do run push 38069987168 (job 114265250599), `# tests 3298 # pass 3294 # fail 2`; as 2 linhas not ok são o T15 do B-SAN3-05 (`tests/san3-05-runtime-role-guard-db.test.ts:17`, "processo filho não encerrou em 9847ms") e o pai dele. O mesmo `backend` no run pull_request 38069991906 (mesmo head) = success. Arquivo nascido em a9fbe283 (2026-10-09, #405); 0 linha dele no diff B..objeto. É a falha conhecida que o mandato declara pre-existente.
  - no mesmo log, os 14 testes do laço G e os 10 semânticos S-* do bloco = ok (0 not ok).
- outros chamadores dos métodos mudados (`grep` em src/): só as 13 entradas e o PATCH /work-orders/:id/mileage (setMileage source=base, permissão work_orders:mileage_correct). No catálogo do objeto, mileage_correct está só em platform_admin/tenant_admin/manager/operator/super_admin (todos tenant_wide em WORK_ORDER_MUTATION_SCOPE) — o escopo novo não alcança ninguém por essa rota hoje; medido: managerA PATCH /mileage = 200 (CTRL-1 do item 3).
- a sonda importa só módulos de produção de src/ (app.ts, serviços em memória, CoreSaasRegistry/InMemoryCoreSaasStore/MemoryCoreSaasAdapter); não importa nenhum teste nem helper do bloco (tests/helpers/o6r07c-census.ts, tests/o6r07c-*.test.ts). Rodou idêntica na base, o que prova que tudo o que importa existe antes do bloco.

## Anexo — scripts verbatim (LF, 0 CR, 0 barra invertida, 0 espaço no fim de linha)

### sonda.mts — md5 3d967e579aa51160b923f3d6ca1e2f59
```
// C1 jurado-07ca-c1 — sonda PRÓPRIA. argv[2]=raiz do worktree; argv[3]=rótulo. Fala HTTP com createApp (pilha inteira).
import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";

const RAIZ = process.argv[2];
const ROTULO = process.argv[3] ?? "?";
const TMP = fs.mkdtempSync(path.join(process.env.C1_TMP as string, "anexos-"));
process.env.CHECKLIST_STORAGE_LOCAL_DIR = TMP;
const imp = (p: string): Promise<any> => import(pathToFileURL(`${RAIZ}/src/${p}`).href);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x43, 0x31]);
const LOTE = "/api/v1/mobile/sync/work-order-actions";

const [{ createApp }, woM, opM, apM, ntM, anM, cmM, taM, tgM, syM, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
  imp("app.ts"), imp("modules/work-orders/work-order.service.ts"), imp("modules/operator-profiles/operator-profile.service.ts"),
  imp("modules/work-orders/approval.service.ts"), imp("modules/notifications/notification.service.ts"),
  imp("modules/work-orders/work-order-attachment.service.ts"), imp("modules/work-order-comments/work-order-comment.service.ts"),
  imp("modules/tag-assignments/index.ts"), imp("modules/tags/tag.service.ts"), imp("modules/mobile/mobile-work-order-sync.ts"),
  imp("modules/core-saas/services/core-saas.service.ts"), imp("modules/core-saas/services/memory-core-saas.adapter.ts"), imp("modules/core-saas/store/core-saas.store.ts"),
]);
woM.resetWorkOrderRuntimeForTests(); opM.resetOperatorProfileRuntimeForTests(); apM.resetApprovalRuntimeForTests();
ntM.resetNotificationRuntimeForTests(); anM.resetWorkOrderAttachmentRuntimeForTests(); cmM.resetWorkOrderCommentRuntimeForTests();
taM.resetTagAssignmentRuntimeForTests(); tgM.resetTagRuntimeForTests(); syM.resetMobileWorkOrderSyncRuntimeForTests();

const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const tA = core.createTenant({ name: "C1 sonda A", modules: ["work_orders"] });
const tB = core.createTenant({ name: "C1 sonda B", modules: ["work_orders"] });
const U = () => randomUUID();
const ator = {
  managerA: U(), operatorA: U(), dispatcherA: U(), auditorA: U(), tecnicoA: U(), tecnicoU: U(), tecnicoB: U(),
  tecnicoT: U(), tecnicoT2: U(), duplo: U(), managerB: U(), tecnicoB2: U(), tecnicoX: U(),
};
const prof = await opM.createDefaultOperatorProfileService();
const admA = { tenantId: tA.id, userId: ator.managerA, roles: ["tenant_admin"], permissions: [] };
const admB = { tenantId: tB.id, userId: ator.managerB, roles: ["tenant_admin"], permissions: [] };
const perfil: Record<string, string> = {};
for (const k of ["tecnicoA", "tecnicoB", "tecnicoT", "tecnicoT2", "tecnicoX"] as const) {
  perfil[k] = (await prof.create(admA, { user_id: (ator as any)[k], full_name: `C1 ${k}` })).id;
}
perfil.tecnicoB2 = (await prof.create(admB, { user_id: ator.tecnicoB2, full_name: "C1 tecnicoB2" })).id;
const tags = tgM.createMemoryTagService();
const tagAtor = (t: any) => ({ tenantId: t.id, userId: ator.managerA, roles: ["manager"], permissions: ["tags:read", "tags:create"] });

const app = createApp(new MemoryCoreSaasAdapter(core));
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.once("listening", () => r()));
const BASE = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

type Resp = { status: number; body: any; raw: string };
const h = (user: string, role: string, t: any = tA) => ({ "x-tenant-id": t.id, "x-user-id": user, "x-role": role });
async function req(url: string, o: { method?: string; headers?: Record<string, string>; body?: unknown; semCorpo?: boolean } = {}): Promise<Resp> {
  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  if (!o.semCorpo && o.body !== undefined) headers["content-type"] = "application/json";
  const r = await fetch(`${BASE}${url}`, { method: o.method ?? "GET", headers, body: o.semCorpo || o.body === undefined ? undefined : JSON.stringify(o.body) });
  const raw = await r.text();
  let body: any = null; try { body = raw ? JSON.parse(raw) : null; } catch { body = { naoJson: raw.slice(0, 80) }; }
  return { status: r.status, body, raw };
}
async function upload(osId: string, headers: Record<string, string>): Promise<Resp> {
  const f = new FormData(); f.set("file", new Blob([PNG], { type: "image/png" }), "c1.png");
  const r = await fetch(`${BASE}/api/v1/work-orders/${osId}/attachments`, { method: "POST", headers, body: f });
  const raw = await r.text(); let body: any = null; try { body = raw ? JSON.parse(raw) : null; } catch { body = { naoJson: raw.slice(0, 80) }; }
  return { status: r.status, body, raw };
}
type Acao = { id: string; type: string; payload: Record<string, unknown> };
async function lote(headers: Record<string, string>, acoes: Acao[]) {
  const r = await req(LOTE, { method: "POST", headers, body: { client_batch_id: U(), actions: acoes.map((a) => ({ client_action_id: a.id, type: a.type, payload: a.payload })) } });
  const d = r.body?.data ?? {};
  const baldes: Record<string, any[]> = { accepted: d.accepted ?? [], rejected: d.rejected ?? [], conflicts: d.conflicts ?? [], already_applied: d.already_applied ?? [] };
  const porAcao = acoes.map((a) => {
    for (const [balde, arr] of Object.entries(baldes)) {
      const x = arr.find((y: any) => y.client_action_id === a.id);
      if (x) return { id: a.id, type: a.type, balde, status: x.status, code: x.error?.code ?? null, reason: x.error?.reason ?? null, erro: JSON.stringify(x.error ?? null) };
    }
    return { id: a.id, type: a.type, balde: null, status: null, code: r.body?.error?.code ?? null, reason: r.body?.error?.reason ?? null, erro: r.raw.slice(0, 300) };
  });
  return { http: r.status, porAcao, summary: d.summary ?? null };
}

// ---------------- semente e leitor de ESTADO (lido por um terceiro: o manager da organização) ----------------
const md5 = (b: Buffer) => createHash("md5").update(b).digest("hex").slice(0, 8);
const hMgrA = () => h(ator.managerA, "manager", tA);
type Semente = { os: string; anexo: string; com: string; tag1: string; tag2: string };
async function criarOs(extra: Record<string, unknown> = {}, t: any = tA, mgr = ator.managerA): Promise<string> {
  const r = await req("/api/v1/work-orders", { method: "POST", headers: h(mgr, "manager", t), body: { title: "OS C1", serviceAddress: "Rua A, 1", destinationAddress: "Rua B, 2", ...extra } });
  if (r.status !== 201) throw new Error(`semente: criar OS ${r.status} ${r.raw.slice(0, 200)}`);
  return r.body.data.id;
}
async function atribuir(os: string, alvo: { operatorId?: string; userId?: string }, t: any = tA, mgr = ator.managerA) {
  const r = await req(`/api/v1/work-orders/${os}/assign`, { method: "POST", headers: h(mgr, "manager", t), body: alvo });
  if (r.status !== 200) throw new Error(`semente: atribuir ${r.status} ${r.raw.slice(0, 200)}`);
  return r;
}
async function semear(alvo: { operatorId?: string; userId?: string }, autor: { user: string; role: string }, extra: Record<string, unknown> = {}): Promise<Semente> {
  const os = await criarOs(extra);
  await atribuir(os, alvo);
  const an = await upload(os, hMgrA());
  if (an.status !== 201) throw new Error(`semente: anexo ${an.status} ${an.raw.slice(0, 200)}`);
  const cm = await req(`/api/v1/work-orders/${os}/comments`, { method: "POST", headers: h(autor.user, autor.role), body: { message: "semente C1" } });
  if (cm.status !== 201) throw new Error(`semente: comentário ${cm.status} ${cm.raw.slice(0, 200)}`);
  const tag1 = (await tags.create(tagAtor(tA), { name: `C1 livre ${U().slice(0, 8)}` })).id;
  const tag2 = (await tags.create(tagAtor(tA), { name: `C1 presa ${U().slice(0, 8)}` })).id;
  const at = await req(`/api/v1/work-orders/${os}/comments/${cm.body.data.id}/tags/${tag2}`, { method: "POST", headers: hMgrA() });
  if (at.status >= 300) throw new Error(`semente: tag presa ${at.status} ${at.raw.slice(0, 200)}`);
  return { os, anexo: an.body.data.id, com: cm.body.data.id, tag1, tag2 };
}
async function estado(os: string, hdr = hMgrA()) {
  const o = (await req(`/api/v1/work-orders/${os}`, { headers: hdr })).body?.data ?? {};
  const an = (await req(`/api/v1/work-orders/${os}/attachments`, { headers: hdr })).body?.items ?? [];
  const bins: string[] = [];
  for (const a of an) {
    const r = await fetch(`${BASE}/api/v1/work-orders/${os}/attachments/${a.id}/download`, { headers: hdr });
    bins.push(`${a.id.slice(0, 8)}:${r.status}:${md5(Buffer.from(await r.arrayBuffer()))}`);
  }
  const cm = (await req(`/api/v1/work-orders/${os}/comments`, { headers: hdr })).body?.items ?? [];
  const tl = (await req(`/api/v1/work-orders/${os}/timeline`, { headers: hdr })).body?.data ?? [];
  return {
    title: o.title ?? null, status: o.status ?? null, assigned: o.assignedOperatorId ?? null,
    km: [o.mileageStart ?? null, o.mileageEnd ?? null, o.mileageSource ?? null],
    geoO: [o.serviceLatitude ?? null, o.serviceLongitude ?? null, o.serviceGeocodeSource ?? null],
    geoD: [o.destinationLatitude ?? null, o.destinationLongitude ?? null, o.destinationGeocodeSource ?? null],
    anexos: bins.sort(),
    comentarios: cm.map((c: any) => `${c.id.slice(0, 8)}|${c.message}|${c.tags.map((t: any) => t.id.slice(0, 8)).sort().join(",")}|${c.editedAt ? "ed" : "-"}`).sort(),
    eventos: tl.length,
  };
}
// comparador: devolve a lista de campos que diferem (vazia = idêntico)
function diff(a: any, b: any): string[] {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(k);
  return out;
}

// ---------------- as 13 entradas, LIDAS do instantâneo do objeto (nunca digitadas) ----------------
const INST = JSON.parse(fs.readFileSync(process.argv[4], "utf8")) as Record<string, { classe: string }>;
const ENTRADAS = Object.entries(INST).filter(([, v]) => v.classe === "OS·07a" || v.classe === "OS·07c-a").map(([k, v]) => ({ chave: k, classe: v.classe })).sort((a, b) => a.chave.localeCompare(b.chave));
const P = "/api/v1/work-orders/:workOrderId";
function corposDe(chave: string): string[] {
  return chave.endsWith("/geocode") || chave.endsWith("/geocode-destination") ? ["vazio-422", "vazio-409", "valido"] : ["vazio", "valido"];
}
function extraSemente(chave: string, corpo: string): Record<string, unknown> {
  if (chave.endsWith("/geocode") && corpo === "vazio-422") return { serviceAddress: "" };
  if (chave.endsWith("/geocode") && corpo === "vazio-409") return { serviceLatitude: -23.55, serviceLongitude: -46.63 };
  if (chave.endsWith("/geocode-destination") && corpo === "vazio-422") return { destinationAddress: "" };
  if (chave.endsWith("/geocode-destination") && corpo === "vazio-409") return { destinationLatitude: -23.6, destinationLongitude: -46.7 };
  return {};
}
type Exec = { lote: boolean; http: number; reason: string | null; code: string | null; balde?: string | null; extra?: unknown; corpo?: string };
async function executar(chave: string, corpo: string, s: Semente, H: Record<string, string>): Promise<Exec> {
  const v = corpo === "valido";
  const rest = async (method: string, url: string, body?: unknown, semCorpo = false): Promise<Exec> => {
    const r = await req(url, { method, headers: H, body, semCorpo });
    return { lote: false, http: r.status, reason: r.body?.error?.reason ?? null, code: r.body?.error?.code ?? null, extra: r.body?.data?.geocoded, corpo: r.raw.slice(0, 300) };
  };
  const base = `/api/v1/work-orders/${s.os}`;
  switch (chave) {
    case `ROTA DELETE ${P}/attachments/:attachmentId`: return rest("DELETE", `${base}/attachments/${v ? s.anexo : U()}`, undefined, true);
    case `ROTA DELETE ${P}/comments/:commentId`: return rest("DELETE", `${base}/comments/${v ? s.com : U()}`, undefined, true);
    case `ROTA DELETE ${P}/comments/:commentId/tags/:tagId`: return rest("DELETE", `${base}/comments/${s.com}/tags/${v ? s.tag2 : U()}`, undefined, true);
    case `ROTA PATCH ${P}`: return rest("PATCH", base, v ? { title: "titulo C1" } : {});
    case `ROTA PATCH ${P}/comments/:commentId`: return rest("PATCH", `${base}/comments/${s.com}`, v ? { message: "editado C1" } : {});
    case `ROTA PATCH ${P}/status`: return rest("PATCH", `${base}/status`, v ? { status: "accepted" } : {});
    case `ROTA POST ${P}/attachments`: {
      if (!v) return rest("POST", `${base}/attachments`, {});
      const r = await upload(s.os, H);
      return { lote: false, http: r.status, reason: r.body?.error?.reason ?? null, code: r.body?.error?.code ?? null, corpo: r.raw.slice(0, 300) };
    }
    case `ROTA POST ${P}/comments`: return rest("POST", `${base}/comments`, v ? { message: "C1 escreveu" } : {});
    case `ROTA POST ${P}/comments/:commentId/tags/:tagId`: return rest("POST", `${base}/comments/${s.com}/tags/${v ? s.tag1 : U()}`, undefined, true);
    case `ROTA POST ${P}/geocode`: return rest("POST", `${base}/geocode`, {});
    case `ROTA POST ${P}/geocode-destination`: return rest("POST", `${base}/geocode-destination`, {});
    case `PAR ${LOTE} · work_order.mileage`: {
      const a = { id: U(), type: "work_order.mileage", payload: v ? { work_order_id: s.os, mileage_start: 4242 } : { work_order_id: s.os } };
      const r = await lote(H, [a]); const x = r.porAcao[0];
      return { lote: true, http: r.http, reason: x.reason, code: x.code, balde: x.balde, corpo: x.erro };
    }
    case `PAR ${LOTE} · work_order.status_change`: {
      const a = { id: U(), type: "work_order.status_change", payload: v ? { work_order_id: s.os, status: "accepted" } : { work_order_id: s.os } };
      const r = await lote(H, [a]); const x = r.porAcao[0];
      return { lote: true, http: r.http, reason: x.reason, code: x.code, balde: x.balde, corpo: x.erro };
    }
  }
  throw new Error(`entrada sem receita: ${chave} — a sonda nunca pula uma entrada`);
}

// ---------------- ITEM 1 — G-NEG / G-POS / G-WIDE / S-ROLES / controle de motivo ----------------
const FT = "field_technician";
const tA_ = { user: ator.tecnicoA, role: FT };
type AtorG = { grupo: string; nome: string; user: string; role: string; alvo: { operatorId?: string; userId?: string }; autor: { user: string; role: string }; extraH?: Record<string, string> };
const ATORES_G: AtorG[] = [
  { grupo: "G-NEG", nome: "tecnicoB/field_technician", user: ator.tecnicoB, role: FT, alvo: { operatorId: perfil.tecnicoA }, autor: tA_ },
  { grupo: "G-NEG", nome: "tecnicoT/technician", user: ator.tecnicoT, role: "technician", alvo: { operatorId: perfil.tecnicoA }, autor: tA_ },
  { grupo: "G-POS", nome: "tecnicoA/perfil", user: ator.tecnicoA, role: FT, alvo: { operatorId: perfil.tecnicoA }, autor: tA_ },
  { grupo: "G-POS", nome: "tecnicoU/userId", user: ator.tecnicoU, role: FT, alvo: { userId: ator.tecnicoU }, autor: { user: ator.tecnicoU, role: FT } },
  { grupo: "G-POS", nome: "tecnicoT2/technician/perfil", user: ator.tecnicoT2, role: "technician", alvo: { operatorId: perfil.tecnicoT2 }, autor: { user: ator.tecnicoT2, role: "technician" } },
  { grupo: "G-WIDE", nome: "managerA", user: ator.managerA, role: "manager", alvo: { operatorId: perfil.tecnicoA }, autor: tA_ },
  { grupo: "G-WIDE", nome: "operatorA", user: ator.operatorA, role: "operator", alvo: { operatorId: perfil.tecnicoA }, autor: tA_ },
  { grupo: "G-WIDE-info", nome: "dispatcherA/field_dispatcher", user: ator.dispatcherA, role: "field_dispatcher", alvo: { operatorId: perfil.tecnicoA }, autor: tA_ },
  { grupo: "S-ROLES", nome: "duplo/field_technician+manager", user: ator.duplo, role: "field_technician,manager", alvo: { operatorId: perfil.tecnicoA }, autor: tA_ },
  { grupo: "CTRL-MOTIVO", nome: "auditorA/auditor", user: ator.auditorA, role: "auditor", alvo: { operatorId: perfil.tecnicoA }, autor: tA_ },
  { grupo: "CTRL-MOTIVO", nome: "tecnicoB+x-permissions:read", user: ator.tecnicoB, role: FT, alvo: { operatorId: perfil.tecnicoA }, autor: tA_, extraH: { "x-permissions": "work_orders:read" } },
];
async function item1() {
  const linhas: any[] = [];
  for (const e of ENTRADAS) for (const a of ATORES_G) for (const corpo of corposDe(e.chave)) {
    let linha: any = { chave: e.chave, classe: e.classe, grupo: a.grupo, ator: a.nome, corpo };
    try {
      const s = await semear(a.alvo, a.autor, extraSemente(e.chave, corpo));
      const antes = await estado(s.os);
      const r = await executar(e.chave, corpo, s, { ...h(a.user, a.role), ...(a.extraH ?? {}) });
      const depois = await estado(s.os);
      linha = { ...linha, http: r.http, balde: r.balde ?? null, reason: r.reason, code: r.code, geocoded: r.extra ?? null, mudou: diff(antes, depois) };
    } catch (err) { linha.erro = String(err).slice(0, 300); }
    linhas.push(linha);
  }
  return linhas;
}

// ---------------- ITEM 2 — matriz efetiva, moderação, 404 entre organizações ----------------
const PAPEIS = ["platform_admin", "tenant_admin", "manager", "operator", "finance", "inventory", "field_technician", "auditor", "support", "technician", "field_dispatcher"];
const clsDe = (r: Exec) => r.reason === "permission_required" ? "403 permission_required" : r.reason === "not_assigned_to_actor" ? "403 not_assigned_to_actor"
  : (r.lote ? r.balde === "accepted" : r.http >= 200 && r.http < 300) ? "2xx/accepted" : `${r.http}/${r.balde ?? "-"}/${r.reason}`;
async function item2a() {
  const cel: any[] = [];
  for (const e of ENTRADAS) for (const p of PAPEIS) {
    try {
      const s = await semear({ operatorId: perfil.tecnicoA }, tA_);
      const antes = await estado(s.os);
      const r = await executar(e.chave, "valido", s, h(U(), p));
      const depois = await estado(s.os);
      cel.push({ chave: e.chave, papel: p, cls: clsDe(r), mudou: diff(antes, depois).length > 0 });
    } catch (err) { cel.push({ chave: e.chave, papel: p, cls: "ERRO " + String(err).slice(0, 200) }); }
  }
  return cel;
}
const st = (r: Resp) => `${r.status}${r.body?.error?.reason ? " " + r.body.error.reason : ""}`;
async function item2b() {
  const out: any[] = [];
  const caso = async (nome: string, fn: () => Promise<any>) => { try { out.push({ caso: nome, ...(await fn()) }); } catch (err) { out.push({ caso: nome, erro: String(err).slice(0, 300) }); } };
  const ed = (os: string, c: string, H: Record<string, string>) => req(`/api/v1/work-orders/${os}/comments/${c}`, { method: "PATCH", headers: H, body: { message: "moderado C1" } });
  const ap = (os: string, c: string, H: Record<string, string>) => req(`/api/v1/work-orders/${os}/comments/${c}`, { method: "DELETE", headers: H, semCorpo: true });
  for (const [n, u, r] of [["1 managerA", ator.managerA, "manager"], ["2 operatorA", ator.operatorA, "operator"], ["3 dispatcherA", ator.dispatcherA, "field_dispatcher"], ["CTRL-3 auditorA", ator.auditorA, "auditor"]] as const) {
    await caso(`${n} edita+apaga comentário do tecnicoA na osA`, async () => {
      const s = await semear({ operatorId: perfil.tecnicoA }, tA_); const antes = await estado(s.os);
      const e1 = await ed(s.os, s.com, h(u, r)); const meio = await estado(s.os); const a1 = await ap(s.os, s.com, h(u, r)); const depois = await estado(s.os);
      return { edita: st(e1), apaga: st(a1), editou: diff(antes, meio), apagou: diff(meio, depois) };
    });
  }
  await caso("4 tecnicoA edita+apaga, na osA (dele), o comentário do managerA", async () => {
    const s = await semear({ operatorId: perfil.tecnicoA }, { user: ator.managerA, role: "manager" }); const antes = await estado(s.os);
    const e1 = await ed(s.os, s.com, h(ator.tecnicoA, FT)); const meio = await estado(s.os); const a1 = await ap(s.os, s.com, h(ator.tecnicoA, FT)); const depois = await estado(s.os);
    return { edita: st(e1), apaga: st(a1), editou: diff(antes, meio), apagou: diff(meio, depois) };
  });
  await caso("5 tecnicoA edita o próprio", async () => {
    const s = await semear({ operatorId: perfil.tecnicoA }, tA_); const antes = await estado(s.os);
    const e1 = await ed(s.os, s.com, h(ator.tecnicoA, FT)); const depois = await estado(s.os);
    return { edita: st(e1), editou: diff(antes, depois) };
  });
  await caso("6 tecnicoB edita/marca/desmarca/apaga no comentário do tecnicoA na osA", async () => {
    const s = await semear({ operatorId: perfil.tecnicoA }, tA_); const antes = await estado(s.os); const H = h(ator.tecnicoB, FT);
    const e1 = await ed(s.os, s.com, H);
    const m1 = await req(`/api/v1/work-orders/${s.os}/comments/${s.com}/tags/${s.tag1}`, { method: "POST", headers: H, semCorpo: true });
    const d1 = await req(`/api/v1/work-orders/${s.os}/comments/${s.com}/tags/${s.tag2}`, { method: "DELETE", headers: H, semCorpo: true });
    const a1 = await ap(s.os, s.com, H); const depois = await estado(s.os);
    return { edita: st(e1), marca: st(m1), desmarca: st(d1), apaga: st(a1), mudou: diff(antes, depois) };
  });
  return out;
}
async function item2c() {
  const osB = await criarOs({}, tB, ator.managerB); await atribuir(osB, { operatorId: perfil.tecnicoB2 }, tB, ator.managerB);
  const san = await req(`/api/v1/work-orders/${osB}/comments`, { method: "POST", headers: h(ator.tecnicoB2, FT, tB), body: { message: "B2 na própria" } });
  const linhas: any[] = [];
  for (const e of ENTRADAS) {
    try {
      const s = await semear({ operatorId: perfil.tecnicoA }, tA_); const antes = await estado(s.os);
      const xt = await executar(e.chave, "valido", s, h(ator.tecnicoB2, FT, tB)); const depois = await estado(s.os);
      const inex = await executar(e.chave, "valido", { ...s, os: U() }, h(ator.tecnicoB, FT));
      const s2 = await semear({ operatorId: perfil.tecnicoA }, tA_);
      const ctrl = await executar(e.chave, "valido", s2, h(ator.tecnicoB, FT));
      linhas.push({ chave: e.chave, xt: { http: xt.http, balde: xt.balde ?? null, reason: xt.reason, code: xt.code, corpo: xt.corpo }, mudou: diff(antes, depois),
        inexistente: { http: inex.http, balde: inex.balde ?? null, reason: inex.reason, code: inex.code, corpo: inex.corpo }, ctrlMesmaOrg: { http: ctrl.http, balde: ctrl.balde ?? null, reason: ctrl.reason } });
    } catch (err) { linhas.push({ chave: e.chave, erro: String(err).slice(0, 300) }); }
  }
  return { sanidadeB2NaPropria: st(san), linhas };
}

// ---------------- ITEM 3 — km pelo sync ----------------
const kmA = (os: string, v?: number, id = U()) => ({ id, type: "work_order.mileage", payload: v === undefined ? { work_order_id: os } : { work_order_id: os, mileage_start: v } });
async function item3() {
  const out: any = {};
  const hA = h(ator.tecnicoA, FT);
  for (const [n, u, r] of [["tecnicoB/field_technician", ator.tecnicoB, FT], ["tecnicoT/technician", ator.tecnicoT, "technician"]] as const) {
    const s = await semear({ operatorId: perfil.tecnicoA }, tA_); const antes = await estado(s.os);
    const x = await lote(h(u, r), [{ id: U(), type: "work_order.status_change", payload: { work_order_id: s.os, status: "accepted" } }, kmA(s.os, 777)]);
    const depois = await estado(s.os);
    out[`a ${n} status+km no mesmo lote`] = { http: x.http, porAcao: x.porAcao, summary: x.summary, mudou: diff(antes, depois) };
  }
  { const s = await semear({ operatorId: perfil.tecnicoA }, tA_); const antes = await estado(s.os);
    const x = await lote(h(ator.tecnicoB, FT), [kmA(s.os)]); const depois = await estado(s.os);
    out["a tecnicoB km inválida (sem mileage_start)"] = { http: x.http, porAcao: x.porAcao, mudou: diff(antes, depois) }; }
  { const sA = await semear({ operatorId: perfil.tecnicoA }, tA_); const sX = await semear({ operatorId: perfil.tecnicoX }, { user: ator.tecnicoX, role: FT });
    const aA = await estado(sA.os); const aX = await estado(sX.os);
    const x = await lote(hA, [kmA(sA.os, 1000), kmA(sX.os, 2000)]);
    const dA = await estado(sA.os); const dX = await estado(sX.os);
    out["b isolamento por ação (tecnicoA: própria osA + osX alheia)"] = { http: x.http, porAcao: x.porAcao, summary: x.summary, kmA: [aA.km, dA.km], kmX: [aX.km, dX.km], mudouX: diff(aX, dX) }; }
  { const s = await semear({ operatorId: perfil.tecnicoA }, tA_); const K = U();
    const p1 = await lote(hA, [kmA(s.os, 500, K)]);
    const p2 = await req(`/api/v1/work-orders/${s.os}/assign`, { method: "POST", headers: hMgrA(), body: { operatorId: perfil.tecnicoX } });
    const p3 = await lote(hA, [kmA(s.os, 500, K)]);
    syM.resetMobileWorkOrderSyncRuntimeForTests();
    const p4 = await lote(hA, [kmA(s.os, 500, K)]);
    const fim = await estado(s.os);
    out["c S-KM-RESTART"] = { p1: p1.porAcao[0], p2: { http: p2.status, reason: p2.body?.error?.reason ?? null, assignedDepois: p2.body?.data?.assignedOperatorId === perfil.tecnicoX ? "perfil tecnicoX" : p2.body?.data?.assignedOperatorId ?? null },
      p3: p3.porAcao[0], p4: p4.porAcao[0], p5_kmArmazenada: fim.km, atribuidoFinal: fim.assigned === perfil.tecnicoX ? "perfil tecnicoX" : fim.assigned }; }
  { const s = await semear({ operatorId: perfil.tecnicoA }, tA_); const K2 = U();
    const q1 = await lote(hA, [kmA(s.os, 600, K2)]); const q2 = await lote(hA, [kmA(s.os, 600, K2)]);
    syM.resetMobileWorkOrderSyncRuntimeForTests();
    const q3 = await lote(hA, [kmA(s.os, 600, K2)]);
    out["CTRL-2 reset é real (tecnicoA continua atribuído)"] = { q1: q1.porAcao[0].balde, q2: q2.porAcao[0].balde, q3_aposReset: q3.porAcao[0].balde }; }
  { const s = await semear({ operatorId: perfil.tecnicoA }, tA_); const a0 = await estado(s.os);
    const m = await req(`/api/v1/work-orders/${s.os}/mileage`, { method: "PATCH", headers: hMgrA(), body: { mileageStart: 31 } }); const a1 = await estado(s.os);
    const t = await lote(hA, [kmA(s.os, 32)]); const a2 = await estado(s.os);
    out["CTRL-1 leitor da km acha"] = { manager: `${m.status}`, km0: a0.km, km1: a1.km, tecnicoA: t.porAcao[0].balde, km2: a2.km }; }
  return out;
}

// ---------------- principal ----------------
const MODO = process.argv[5] ?? "123";
const res: any = { rotulo: ROTULO, raiz: RAIZ, entradas: ENTRADAS.map((e) => `${e.classe} | ${e.chave}`) };
try {
  if (MODO.includes("1")) res.item1 = await item1();
  if (MODO.includes("2")) { res.item2a = await item2a(); res.item2b = await item2b(); res.item2c = await item2c(); }
  if (MODO.includes("3")) res.item3 = await item3();
} catch (err) { res.erroFatal = String((err as any)?.stack ?? err).slice(0, 800); }
await new Promise<void>((r) => server.close(() => r()));
fs.rmSync(TMP, { recursive: true, force: true });
fs.writeFileSync(process.argv[6], JSON.stringify(res, null, 1));
process.exit(0);
```

### catalogo.mts — md5 bdc49bed088f3f60cd8f7be557fb6bc0
```
// C1 — leitor do catálogo por IMPORT do objeto (argv[2] = raiz do worktree)
import { pathToFileURL } from "node:url";
const raiz = process.argv[2];
const cat: any = await import(pathToFileURL(`${raiz}/src/modules/core-saas/permissions/catalog.ts`).href);
const papeis = ["platform_admin","tenant_admin","manager","operator","finance","inventory","field_technician","auditor","support","technician","field_dispatcher","viewer","super_admin"];
const perms = ["work_orders:read","work_orders:create","work_orders:update","work_orders:status","work_orders:comment","work_orders:assign","work_orders:mileage_correct"];
const out: Record<string, Record<string,boolean>> = {};
for (const p of papeis) {
  if (!cat.isValidRole(p)) { out[p] = { INVALIDO: true } as any; continue; }
  const set = new Set(cat.resolvePermissionsForRoles([p]));
  out[p] = Object.fromEntries(perms.map((k) => [k, set.has(k)]));
}
// controle: permissão sabida e inventada
const ft = new Set(cat.resolvePermissionsForRoles(["field_technician"]));
const ctrl = { "field_technician tem work_orders:status": ft.has("work_orders:status"), "field_technician tem work_orders:inventada_c1": ft.has("work_orders:inventada_c1"), "isValidPermission(inventada)": cat.isValidPermission("work_orders:inventada_c1") };
console.log(JSON.stringify({ out, ctrl }, null, 1));
```

### checa1.cjs — md5 76bc6bcb872b687d322e42e51fac9d6e
```
// C1 — verificador do item 1 sobre o JSON da sonda. argv[2]=json; argv[3]=modo (objeto|base)
const r = require(process.argv[2]); const modo = process.argv[3];
const ok2 = (l) => l.balde ? l.balde === "accepted" : l.http >= 200 && l.http < 300;
const rec = (l) => (l.balde !== null && l.balde !== undefined ? l.http === 200 && l.balde === "rejected" : l.http === 403) && l.reason === "not_assigned_to_actor";
const geoNoop = (l) => l.chave.includes("geocode") && l.geocoded === false;
const falhas = []; const cont = {};
for (const l of r.item1) {
  const k = `${l.grupo}`; cont[k] = (cont[k] || 0) + 1;
  if (l.erro) { falhas.push(["ERRO", l.ator, l.chave, l.corpo, l.erro]); continue; }
  const mudou = (l.mudou || []).length > 0;
  if (l.grupo === "G-NEG") {
    if (modo === "objeto" && (!rec(l) || mudou)) falhas.push(["G-NEG", l.ator, l.chave, l.corpo, l.http, l.balde, l.reason, l.mudou]);
  } else if (l.grupo === "G-POS" || l.grupo === "S-ROLES" || (l.grupo === "G-WIDE")) {
    if (l.reason === "not_assigned_to_actor") falhas.push([l.grupo, "escopo", l.ator, l.chave, l.corpo]);
    if (l.grupo === "G-WIDE" && l.reason === "permission_required") falhas.push(["G-WIDE vazio", l.ator, l.chave, l.corpo]);
    if (l.corpo === "valido" && !(ok2(l) && (mudou || geoNoop(l)))) falhas.push([l.grupo, "valido sem efeito", l.ator, l.chave, l.http, l.balde, l.reason, l.mudou]);
  } else if (l.grupo === "CTRL-MOTIVO") {
    if (l.reason !== "permission_required" || mudou) falhas.push(["CTRL-MOTIVO", l.ator, l.chave, l.corpo, l.reason]);
  }
}
// base: o G-NEG das 10 vias 07c-a NÃO é not_assigned e, com corpo válido, MUDA o estado; as 3 do 07a seguem recusando
const baseTab = [];
if (modo === "base") {
  for (const l of r.item1.filter((x) => x.grupo === "G-NEG")) {
    const mudou = (l.mudou || []).length > 0;
    if (l.classe === "OS·07a") { if (!rec(l) || mudou) falhas.push(["BASE 07a não recusou", l.ator, l.chave, l.corpo, l.http, l.reason]); }
    else {
      if (l.reason === "not_assigned_to_actor") falhas.push(["BASE 07c-a já recusava", l.ator, l.chave, l.corpo]);
      if (l.corpo === "valido" && !mudou && !geoNoop(l)) falhas.push(["BASE 07c-a válido sem efeito (defeito invisível)", l.ator, l.chave, l.http, l.reason]);
    }
    baseTab.push(`${l.classe} | ${l.ator.split("/")[0]} | ${l.chave.replace("/api/v1/work-orders/:workOrderId", "OS").replace("PAR /api/v1/mobile/sync/work-order-actions · ", "LOTE ")} | ${l.corpo} | ${l.http} ${l.balde || ""} ${l.reason || ""} | ${(l.mudou || []).join("+") || "="}`);
  }
}
console.log(JSON.stringify({ rotulo: r.rotulo, linhas: r.item1.length, porGrupo: cont, falhas: falhas.length }));
for (const f of falhas) console.log("FALHA", JSON.stringify(f));
for (const b of baseTab) console.log(b);
```

### compara1.cjs — md5 633db87aee7a8d0938abc71f0b48c641
```
// C1 — compara item1 base × objeto por (grupo, ator, chave, corpo): status, balde, motivo, campos mudados
const [b, o] = [require(process.argv[2]), require(process.argv[3])];
const key = (l) => `${l.grupo}|${l.ator}|${l.chave}|${l.corpo}`;
const val = (l) => `${l.http}|${l.balde ?? ""}|${l.reason ?? ""}|${(l.mudou || []).join("+")}`;
const mb = new Map(b.item1.map((l) => [key(l), val(l)])); const mo = new Map(o.item1.map((l) => [key(l), val(l)]));
const dif = {}; let n = 0;
for (const [k, vb] of mb) { const vo = mo.get(k); if (vo !== vb) { n++; const g = k.split("|")[0]; dif[g] = (dif[g] || 0) + 1; if (process.argv[4] === "v" && g !== "G-NEG") console.log("DIF", k, "base=", vb, "obj=", vo); } }
console.log(JSON.stringify({ chaves: mb.size, chavesObj: mo.size, diferentes: n, porGrupo: dif }));
```

### matriz2.cjs — md5 fd315c16520ae40f4acad8191e333ce6
```
// C1 — matriz efetiva entrada × papel × (catálogo · base · objeto) e o diff base × objeto. argv: base.json objeto.json catalogo.json [fabricado]
const fs = require("fs");
const [b, o, c] = process.argv.slice(2, 5).map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const curto = (k) => k.replace("ROTA ", "").replace("/api/v1/work-orders/:workOrderId", "OS").replace("PAR /api/v1/mobile/sync/work-order-actions · ", "LOTE ");
// permissão que a ENTRADA compara (lida no blob — work-order.routes.ts, work-order-comment.routes.ts, mobile-work-order-sync.ts)
const perm = (k) => k.includes("/comments") ? ["work_orders:comment"] : k.startsWith("ROTA POST") && k.endsWith("/attachments") ? ["work_orders:create", "work_orders:update"]
  : k.endsWith("/status") || k.includes("work_order.status_change") || k.includes("work_order.mileage") ? ["work_orders:status"] : ["work_orders:update"];
const tab = (r) => new Map(r.item2a.map((x) => [`${x.chave}|${x.papel}`, x.cls]));
function comparar(tb, to) { const d = []; for (const [k, v] of tb) if (to.get(k) !== v) d.push([k, v, to.get(k)]); for (const k of to.keys()) if (!tb.has(k)) d.push([k, undefined, to.get(k)]); return d; }
if (process.argv[5] === "fabricado") {
  const t1 = new Map([["A|x", "2xx"], ["A|y", "403 p"], ["B|x", "2xx"]]); const t2 = new Map([["A|x", "2xx"], ["A|y", "403 n"], ["B|x", "2xx"]]);
  console.log("CTRL comparador fabricado:", JSON.stringify(comparar(t1, t2)), "| idênticas:", JSON.stringify(comparar(t1, new Map(t1))));
  process.exit(0);
}
const tb = tab(b), to = tab(o);
const papeis = [...new Set(o.item2a.map((x) => x.papel))]; const chaves = [...new Set(o.item2a.map((x) => x.chave))];
const ab = (s) => s === "2xx/accepted" ? "OK" : s === "403 permission_required" ? "PERM" : s === "403 not_assigned_to_actor" ? "ESCOPO" : s;
console.log("entrada | permissão | " + papeis.join(" | "));
for (const k of chaves) {
  const cel = papeis.map((p) => { const cat = perm(k).some((q) => c.out[p] && c.out[p][q]); return `${cat ? "c" : "-"}:${ab(tb.get(`${k}|${p}`))}>${ab(to.get(`${k}|${p}`))}`; });
  console.log(`${curto(k)} | ${perm(k).join("/")} | ${cel.join(" | ")}`);
}
const d = comparar(tb, to);
console.log("DIFF base×objeto:", d.length, "células"); for (const x of d) console.log("  ", curto(x[0].split("|")[0]), x[0].split("|")[1], ":", x[1], "->", x[2]);
// CE-G2 / coerência catálogo × comportamento no objeto: catálogo sem a permissão ⇒ PERM; com a permissão ⇒ nunca PERM
const inc = [];
for (const k of chaves) for (const p of papeis) { const cat = perm(k).some((q) => c.out[p] && c.out[p][q]); const v = to.get(`${k}|${p}`); if (!cat && v !== "403 permission_required") inc.push([curto(k), p, "sem perm no catálogo mas", v]); if (cat && v === "403 permission_required") inc.push([curto(k), p, "com perm no catálogo mas", v]); }
console.log("incoerências catálogo×objeto:", inc.length); for (const x of inc) console.log("  ", JSON.stringify(x));
```

### ctrl-lote.mts — md5 c5d0bb87591159645320f1403e53fb41
```
const U = () => "lote-fab"; const LOTE = "/fab";
type Resp = { status: number; body: any; raw: string };
async function req(_u: string, _o: any): Promise<Resp> { return { status: 200, raw: "", body: { data: { accepted: [{ client_action_id: "a1", status: "accepted" }], rejected: [{ client_action_id: "a2", status: "rejected", error: { code: "C", reason: "R" } }], conflicts: [], already_applied: [] } } }; }
type Acao = { id: string; type: string; payload: Record<string, unknown> };
async function lote(headers: Record<string, string>, acoes: Acao[]) {
  const r = await req(LOTE, { method: "POST", headers, body: { client_batch_id: U(), actions: acoes.map((a) => ({ client_action_id: a.id, type: a.type, payload: a.payload })) } });
  const d = r.body?.data ?? {};
  const baldes: Record<string, any[]> = { accepted: d.accepted ?? [], rejected: d.rejected ?? [], conflicts: d.conflicts ?? [], already_applied: d.already_applied ?? [] };
  const porAcao = acoes.map((a) => {
    for (const [balde, arr] of Object.entries(baldes)) {
      const x = arr.find((y: any) => y.client_action_id === a.id);
      if (x) return { id: a.id, type: a.type, balde, status: x.status, code: x.error?.code ?? null, reason: x.error?.reason ?? null, erro: JSON.stringify(x.error ?? null) };
    }
    return { id: a.id, type: a.type, balde: null, status: null, code: r.body?.error?.code ?? null, reason: r.body?.error?.reason ?? null, erro: r.raw.slice(0, 300) };
  });
  return { http: r.status, porAcao, summary: d.summary ?? null };
}
const r = await lote({}, [{ id: "a1", type: "t", payload: {} }, { id: "a2", type: "t", payload: {} }]);
console.log(JSON.stringify({ accepted: r.porAcao.filter((x) => x.balde === "accepted").length, rejected: r.porAcao.filter((x) => x.balde === "rejected").length, porAcao: r.porAcao.map((x) => x.balde + ":" + (x.reason ?? "-")) }));
```

### geo-falso.mjs — md5 3f688ff9325485e04bf7923e1ead8070
```
// C1 — DUBLÊ DO PROVEDOR EXTERNO de geocodificação (só o estágio DEPOIS da decisão de acesso).
// Substitui a classe NoopGeocoder por uma habilitada que devolve coordenada fixa, para que o EFEITO do geocode seja mensurável.
export class NoopGeocoder {
  async geocode() { return { latitude: -22.9, longitude: -43.2, source: "sonda-c1" }; }
  isEnabled() { return true; }
}
```

### geo-loader.mjs — md5 85ecfd86bcfc1a5c16cbfcce14a7a373
```
export async function resolve(specifier, context, next) {
  if (specifier.endsWith("noop-geocoder.js") && context.parentURL && context.parentURL.includes("/src/modules/work-orders/")) {
    return { url: new URL("./geo-falso.mjs", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
}
```

### geo-registro.mjs — md5 94b948ccfd7a5ea93f8f6a9d0a0980b4
```
import { register } from "node:module";
register("./geo-loader.mjs", import.meta.url);
```

### patch.cjs — md5 041248180422c2ffe579f2b2ea71df3e
```
const fs = require("fs"); const f = process.argv[2]; let t = fs.readFileSync(f, "utf8"); let n = 0;
const rep = (a, b) => { if (!t.includes(a)) throw new Error("ancora ausente: " + a.slice(0, 60)); const c = t.split(a).length - 1; if (c !== 1) throw new Error("ancora nao unica (" + c + "): " + a.slice(0, 60)); t = t.replace(a, b); n++; };
rep('if (x) return { id: a.id, type: a.type, balde, status: x.status, code: x.error?.code ?? null, reason: x.error?.reason ?? null };',
    'if (x) return { id: a.id, type: a.type, balde, status: x.status, code: x.error?.code ?? null, reason: x.error?.reason ?? null, erro: JSON.stringify(x.error ?? null) };');
rep('return { id: a.id, type: a.type, balde: null, status: null, code: r.body?.error?.code ?? null, reason: r.body?.error?.reason ?? null };',
    'return { id: a.id, type: a.type, balde: null, status: null, code: r.body?.error?.code ?? null, reason: r.body?.error?.reason ?? null, erro: r.raw.slice(0, 300) };');
rep('type Exec = { lote: boolean; http: number; reason: string | null; code: string | null; balde?: string | null; extra?: unknown };',
    'type Exec = { lote: boolean; http: number; reason: string | null; code: string | null; balde?: string | null; extra?: unknown; corpo?: string };');
rep('return { lote: false, http: r.status, reason: r.body?.error?.reason ?? null, code: r.body?.error?.code ?? null, extra: r.body?.data?.geocoded };',
    'return { lote: false, http: r.status, reason: r.body?.error?.reason ?? null, code: r.body?.error?.code ?? null, extra: r.body?.data?.geocoded, corpo: r.raw.slice(0, 300) };');
rep('return { lote: false, http: r.status, reason: r.body?.error?.reason ?? null, code: r.body?.error?.code ?? null };',
    'return { lote: false, http: r.status, reason: r.body?.error?.reason ?? null, code: r.body?.error?.code ?? null, corpo: r.raw.slice(0, 300) };');
t = t.split('return { lote: true, http: r.http, reason: x.reason, code: x.code, balde: x.balde };').join('return { lote: true, http: r.http, reason: x.reason, code: x.code, balde: x.balde, corpo: x.erro };'); n++;
fs.writeFileSync(f, t); console.log("patches", n);
```

## Voto gravado (2026-10-10T17:23:37Z)
- 07ca-C1-voto.json: APROVADO; itens 1, 2 e 3 VERDE; 1 achado = nota, pre-existente, não grave (T15 do #405 no backend do run push; bloco dono B-SAN3-05). Nenhum achado dentro-do-bloco.
- teardown: worktree removido (worktree list = 0), 0 processo, 0 container j07ca-c1-, scratchpad c1 e c1v apagados; no w-07ca escrevi só estes 2 arquivos, sem commit.
