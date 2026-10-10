papel: C2 | identidade: jurado-07ca-c2-censo-e-guard | modelo: Claude Opus 5.5 (claude-opus-5-5) · nível menor (substituição §C7.6-bis: o Fable não rodou por decisão do dono D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO, 2026-10-10, objeto:agent-orchestration/controle/decisoes.md:3132 — topo só no plano e em toda reprovação; não por cota) | mandato_md5: 05463375797dc4120d0f56f2bd9efc99 (cru = EOL-neutro; declarado no disparo: 05463375797dc4120d0f56f2bd9efc99) | corpo_md5: faff2d5cbef04f380dca1c3784887867 (.claude no objeto, EOL-neutro; espelho .agents 84f42a56cc6cabb268480b5e54ea9fa7 = mesmo corpo + frontmatter/cabeçalho Codex, diff lido; recebido no prompt: blob do objeto, faff2d5cbef04f380dca1c3784887867, igual ao publicado pelo inspetor)

# Evidência — C2 (censo e guard) — junta do B-O6R-07c-a, PR 414, ciclo 1

## Cabeçalho de terreno (2026-10-10T17:19Z)
- objeto: 4ca2be43c3b4b32b9bed670f02d78145620cdc2e — `git ls-remote origin refs/heads/fix/o6r07c-subresource-scope` = `gh pr view 414 headRefOid` (OPEN, isDraft=true, MERGEABLE, base main)
- B = merge-base(origin/main, objeto) = 9b611468902f3984d7704ef2dd6e3ad1d0c08b3a = origin/main no início
- worktree: C:/Users/AMP/w-ciclo1-07ca-c2 (detached em 4ca2be43; `test -e .git` ok); `npm ci --no-audit --no-fund` próprio: ec=0, 326 pacotes, sem junction
- SCRATCH: C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c2
- uname: MINGW64_NT-10.0-22631 3.6.6 x86_64 Msys · node v20.19.5 · typescript 5.9.3 · express 5.2.1 · git 2.53.0.windows.2
- disco C: 18 GB livres (df -h /c) — acima de 10 GB
- ambiente: nada exportado; censo sob `env -u DATABASE_URL -u REDIS_URL`; `MSYS_NO_PATHCONV=1` só como prefixo
- base viva (erp-postgres, erp-redis) não é alvo; este mandato não usa banco

## Legalidade
- L1 parecer do inspetor: `git show 4ca2be43:agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-parecer.md` → "Veredito: LIBERADO COM RESSALVA", objeto do inspetor c8bd4c28; item 3.3 publica C2 faff2d5c… = o meu; nomeia worktree próprio por cadeira (o mandato renomeia para w-ciclo1-07ca-c2). Ressalvas R1–R5 lidas. → VERDE
- L2 delta objeto do inspetor → objeto: `git diff --name-only c8bd4c28 4ca2be43` = 12 arquivos, todos em agent-orchestration/ (merge #415: codex/log, controle/decisoes, pendencias, pendencias-indice, docs/formato-do-estado, status-geral, PORTEIRO-389; e parecer/evidência do inspetor e 3 mandatos). `git diff --stat c8bd4c28 4ca2be43 -- src tests scripts package.json package-lock.json` = vazio. Delta do head do mandato d7255263 → objeto = só os 3 mandatos. Cadeia: 4ca2be43 ← d7255263 ← 762ac5ad (merge de 9b611468) ← c8bd4c28. → só registro, VERDE
- L3 check-runs no objeto (gh api .../commits/4ca2be43/check-runs?per_page=100, 17:2xZ): total 14 | não-verdes 1 | pendentes 0. O não-verde é `backend` do run 38069987168 (event push): `# tests 3298 # pass 3294 # fail 2 # skipped 2`; as 2 linhas `not ok` são `T15 · boot real recusa super antes do Redis e aceita papel limpo` (sub) e `not ok 2360 - B-SAN3-05 · o papel de runtime não contorna FORCE RLS` (pai) = a falha conhecida T15 do #405, PRÉ-EXISTENTE por mandato. No mesmo log, o guard do bloco: `ok 2022 T0` … `ok 2035 T13`, `ok 2036 tempo do censo`. O `backend` do run 38069991906 (pull_request) = success. → VERDE (CI vermelho só por pré-existente; guard verde nos dois)
- L4 normas citadas, `git show <ref>:CLAUDE.md | grep -c` objeto/main: C7.1-bis 2/2 · C7.1-ter 3/3 · C7.4-bis 5/5 · C7.6-bis 1/1 · D-GOV-PROPORCIONAL 3/3 · D-MEDIR-NA-REF-ALVO 1/1 · "P7 — Pausa" 1/1 · "Junta proporcional ao risco" 1/1 · "Teto de 2 ciclos" 2/2; PLANO_SAN3.md CE-G1 7/7, CE-2 2. D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO: objeto decisoes.md:3132 (entrou com o merge do #415). → VERDE
- L5 S0: `node scripts/sync-agent-agents.mjs --check` no meu worktree → "[agents-sync] OK — 52 agentes, espelho consistente." ec=0
- L6 quórum: unanimidade de 3 com veto (permissão, §C7 item 8(1)); ciclo 1 (régua: bloqueia+dentro-do-bloco reprova, de qualquer classe)
- L7 terreno alheio observado (só reportado): `git worktree list` mostra `C:/Users/AMP/w-ciclo1-07ca-c1 4ca2be43 (detached HEAD) prunable` — worktree da C1 marcado prunable; não toquei.

## Item 1 — gerador próprio, contagens e instantâneo regenerado
- 1.0 (17:22Z) `DATABASE_URL=<fictícia, só na linha> npx prisma generate` no meu worktree → ec=0.
- 1.1 (17:24–17:26Z) guard no objeto: `env -u DATABASE_URL -u REDIS_URL timeout 600 node --test --import tsx --test-reporter=tap tests/o6r07c-census-guard.test.ts` → ec=0 · `# tests 31 # pass 31 # fail 0 # skipped 0` · ok 1..15 (T0–T13 + tempo; T12 com 16 subtestes) · diagnóstico `censo 07c — base 103700 ms · grupo A 104292 ms · grupo B 103759 ms`. → guard VERDE no objeto, N=31.
- 1.2 (17:24–17:26Z) helper `gravar`: `env -u DATABASE_URL -u REDIS_URL timeout 600 node --import tsx tests/helpers/o6r07c-census.ts gravar $SCRATCH/inst-objeto.json` → ec=0. Resumo: `camadas: ROTA 409 · ROTEADOR 75 · SUBAPP 0 · MIDDLEWARE 183 (14 chaves) · SEM-CAMINHO 0` · `alcançadas (diferencial): field_technician 125 · technician 123 · toca-por-caminho 32 · toca-por-corpo 0` · `middleware que respondeu sucesso ao campo: 0 · leitura que escreve: 0` · `tipos candidatos 59 | lotes 5 | pares aceitos 30 (field_technician 20 · technician 23) | não resolvidos 3 | curingas estáticos 3 | curinga dinâmico 0 | lotes instáveis 0` · lotes: work-order-actions, checklist-actions, inventory-actions, evidence-actions, expense-actions · `CLASSES: DESPACHO·07c-b=1 · EVIDENCIA-OS·07c-b=4 · LEITURA=174 · LEITURA-OS=12 · LOTE=5 · MIDDLEWARE=183 · N=15 · OS·07a=3 · OS·07c-a=10 · OS·SEM-ALCANCE=15 · R=10 · ROTEADOR=75 · SEM-ALCANCE-CAMPO=172 · VISTORIA·07c-b=18` · `chaves vivas: 468 | entradas ·07c-b: 23 | VIOLAÇÕES: 0`. Única diferença com o plano (c1cfdabe): toca-por-caminho 32 × 31 (não é chave do instantâneo; a explicar em 1.5).
- 1.3 (~17:27Z) instantâneo regenerado × fixture: `cmp <(git show 4ca2be43:tests/fixtures/o6r07c-classificacao-vias.json) inst-objeto.json` → ec=0 (md5 dos dois 1e11cd753ae1d06c542c5ae0d11c86e4). O arquivo do worktree difere só por CRLF (checkout autocrlf; `cmp` EOL-neutro ec=0). Diff por chave (node): 468 × 468, 0 diferenças de classe/n, mesma ordem. Vermelho-controle 3 (cmp acusa): cópia do blob com `MIDDLEWARE`→`MIDDLEWARX` na linha 3 → `cmp` ec=1 "differ: char 62, line 3", diff mostra a linha. → fixture = instantâneo regenerado no objeto (CE-G1(a) "gerado" sustentado).
- 1.4 (~17:28Z) gerador PRÓPRIO de camadas `$SCRATCH/gen/c2gen.mts` (md5 063c3409141d238d3e7b5de06a4b6758, 122 linhas, escrito por mim, sem copiar helper nem Apêndice A). Mecanismo distinto do helper: troca o construtor `Layer` de `router/lib/layer.js` (router 2.2.0) no cache de módulos ANTES de o express carregar (guarda o caminho cru de TODA camada); escuta o evento `mount` de toda app express (sub-app via `app.use`); desce em `route`, em handle com `stack` (Router), em handle que é app express (sub-app por `router.use`) e em `mounted_app` (casado pelo evento); sonda por `Layer.prototype.handleRequest` + `writeHead` (quem respondeu). Comando: `env -u DATABASE_URL -u REDIS_URL timeout 300 node --import tsx $SCRATCH/gen/c2gen.mts $SCRATCH/c2gen-base.json` (cwd = meu worktree) → ec=0 → `C2GEN camadas: ROTA 409 · ROTEADOR 75 · SUBAPP 0 · MIDDLEWARE 183 (14 chaves) · SEM-CAMINHO 0 · SUBAPP-SEM-PAR 0 | sondas 1940 | sucesso<400 ao campo: 2` (os 2 = `GET /api/v1/me → 200 por ROTA /api/v1/me`, rota e não middleware).
- 1.5 (~17:30Z) helper CLI no objeto (para ter o c3/s3): `... o6r07c-census.ts censo $SCRATCH/h-c3.json` ec=0 e `... lotes $SCRATCH/h-c3.json $SCRATCH/h-s3.json` ec=0, mesmos resumos de 1.2. Comparação chave a chave (node): `contagem` do helper × do meu gerador → 438 × 438 chaves, 0 diferenças de n; meu gerador × fixture (chaves não-PAR) → 438 × 438, 0 diferenças; fixture tem +30 chaves PAR = 468. toca-por-caminho 32 (objeto) × 31 (plano em c1cfdabe): não é chave nem classe (as classes por regra deram as mesmas contagens do plano: OS·07c-a=10, OS·SEM-ALCANCE=15, LEITURA-OS=12 etc. idênticas à linha do plano); `git diff --stat c1cfdabe 9b611468 -- src/` traz o inventário do #389 (a medir em 1.7). → meu gerador = helper = fixture.
- 1.6 (~17:32Z) TERCEIRA fonte (inspetor-de-rotas): `$SCRATCH/gen/c2txt.cjs` (md5 20b44e2f7bfc5e7ff25b51b5e12d4e2c), varredura por AST do `typescript` de toda chamada `X.<get|post|put|patch|delete|all>("<literal com />", …)` e `X.use(…)` nos 781 `.ts` de `git ls-files src` → 410 registros de rota textuais · 0 `.route()` · 204 `.use()`. Reconciliação com as ROTA do meu gerador (mesmo método e caminho completo terminando no literal): ROTA do gerador sem registro textual = **0**; registros textuais sem ROTA no gerador = **9**, todos em `src/modules/authority/authority-portal.routes.ts:29,38,43,48` e `src/modules/owner-portal/owner-portal.routes.ts:15,19,25,32,36` — montados só em `src/portal-app.ts:44,48` (`/portal/v1/owner`, `/portal/v1/authority`), app SEPARADO servido em `env.PORTAL_PORT` (`src/server.ts:38-39`), sem `attachAuthenticatedActor`/papel de tenant: exceção explicada (fora do `createApp`, inalcançável ao papel de campo; nenhuma toca OS). Os `.use()` não foram casados um a um; a contagem de camadas de `use` (ROTEADOR 75 + MIDDLEWARE 183) é igual nas duas fontes independentes (1.5). → VERDE, com nota (o censo não cobre o portal-app).
- 1.6c vermelho-controle 1 (meu gerador vê camada nova): `... c2gen.mts $SCRATCH/c2gen-N1.json $SCRATCH/formas/N1.mts` (N1 isolado do `inject-novas.mts` da r2, linhas 23-28 e 31 removidas por sed) → ec=0 → `ROTA 409 · ROTEADOR 76 · MIDDLEWARE 187 (15 chaves)` (a chave nova `MIDDLEWARE /api/v1/work-orders/:workOrderId/via-use · (anônima)` + o roteador e os middlewares da montagem) e a sonda: `field_technician POST …/via-use -> 200 por MIDDLEWARE …/via-use · (anônima)` e o mesmo ao `technician`. ACUSOU.
- 1.6d vermelho-controle 2 (sub-app dentro de Router, forma do MG3b): injeção `$SCRATCH/formas/MG3b-inj.mts` (express() com `POST /work-orders/:workOrderId/via-mg3b` → 200 sob `work_orders:status`, montado por `.use(sub)` no roteador de OS achado pela rota `/work-orders/:workOrderId/geocode`) + `C2_SONDA="POST /api/v1/work-orders/:workOrderId/via-mg3b"` → ec=0 → `ROTA 410 · ROTEADOR 75 · SUBAPP 1 · MIDDLEWARE 185 (14 chaves)`; sonda `field_technician POST /api/v1/work-orders/:workOrderId/via-mg3b -> 200 por ROTA …/via-mg3b` e o mesmo ao `technician`. Meu gerador VÊ o sub-app e a rota de dentro (fonte independente nessa forma). ACUSOU.
- 1.7 (~17:34Z) o que a main trouxe ao src/ entre c1cfdabe e B (9b611468): `git diff --name-only c1cfdabe 9b611468 -- src/` = 8 arquivos, todos `src/modules/inventory/*` (cycle-count*, inventory-prisma.repository, inventory-uow*, inventory.types; 1322+/334-), nenhum `*.routes.ts`. Contagens de chave/classe do objeto = as do plano em c1cfdabe (ROTA 409 · ROTEADOR 75 · MIDDLEWARE 183/14 · SEM-CAMINHO 0; 59 · 5 · 30 (20/23); 468; classes idênticas à linha do plano). Única diferença: toca-por-caminho 32 × 31 — no c3 do objeto as 32 rotas com tocaCaminho casam TODAS o SEG `/(work-orders|checklist-runs|dispatches)/:param` (0 entram na propriedade só por comportamento ⇒ efeito 0 na classe); causa medida: `POST /api/v1/work-orders/:workOrderId/attachments` agora responde ao gestor com id aleatório `404:WORK_ORDER_NOT_FOUND:work_order_not_found` (escopo antes do multipart, mudança do próprio bloco, S-ORDEM; antes, 400 multipart_required para qualquer id ⇒ sem toca-por-caminho). → explicada.
- 1.8 (~17:36Z) lotes e tipos por OUTRO caminho. Lotes por leitura (git grep de `actions` + rotas `/sync/`): `src/modules/mobile/mobile.routes.ts:142,151,169,178` (work-order, checklist, inventory, evidence) e `src/modules/expense-management/expense-management.routes.ts:111` (expense) = 5; `mobile-telemetry-sync.ts` não decide por `type` (grep 0). Tipos por leitura dos despachantes: work-order `mobile-work-order-sync.ts:213,227,245,260` (4: create, assign, mileage, status_change); checklist `ACTION_TYPE_ALIASES` em `mobile-checklist-sync.ts` (14 chaves); inventory `supportedActionTypes` `mobile-inventory-sync.ts:101-105` (3); evidence `supportedActionTypes` `mobile-evidence-sync.ts:86-93` (6); expense `expense-management.service.ts:200,203,207` (3) = 30. Despacho por prefixo/sufixo (grep `type.(startsWith|endsWith|includes)`): exatamente `mobile-evidence-sync.ts:327` (includes ".work_order_") e `:328` (endsWith "_photo", "_signature") = os 3 curingas estáticos do helper (classificação depois de `isSupportedActionType`). Não resolvidos do helper (3): `business-time.ts:29`, `telemetry.dto.ts:123`, `charge.accrual.ts:78` — `part.type === type` de formatToParts, não lote. Sonda HTTP PRÓPRIA `$SCRATCH/gen/c2lotes.mts` (md5 final 123b2861dde98ea772ca044916bab541; igualdade da ENTRADA INTEIRA da ação com UUID, data e o próprio tipo mascarados + status HTTP + chave do array; tenant_admin × field_technician × technician): `C2LOTES lotes 5 | tipos lidos 30 | aceitos 30 (field_technician 20 · technician 23) | inexistente-controle aceito: 0`; × `s3.pares` do helper: 30 × 30, **0 diferenças** de presença e de alcance por papel. Vermelho-controle do comparador: as duas primeiras versões ACUSARAM (o tipo inexistente de controle saiu "aceito" em 5/5 e depois 1/5) porque o corpo ecoa o tipo (`Unsupported sync action: ${type}.`, expense) — corrigido o mascaramento no MEU script (md5 1dd880ea → c0be40b8 → 123b2861), controle final 0/5. → meu gerador de lotes = helper.
- **Veredito parcial item 1: VERDE.** Três fontes (helper, meu gerador por Layer+mount, AST textual) dão ROTA 409 · ROTEADOR 75 · SUBAPP 0 · MIDDLEWARE 183 em 14 chaves · SEM-CAMINHO 0; lotes 5 · pares 30 (20/23) por sonda própria; 468 chaves; fixture = `gravar` byte a byte; guard verde N=31. Notas: (n1) o censo cobre só o `createApp` — `src/portal-app.ts` (9 rotas, porta própria, sem papel de tenant) fica fora; (n2) a contagem 59 de candidatos do helper inclui 29 tipos que nenhum lote aceita (não muda pares).
- (nota de registro, 17:37Z: as horas de 1.4–1.8 foram corrigidas para as medidas por date -u; a primeira gravação trazia estimativas adiantadas)

## Item 2 — formas das críticas e MG1–MG16 no objeto
- 2a (~17:33Z) injeções = apêndices. Extrator `$SCRATCH/gen/extrai.awk` (md5 98c096222e74e917d624762ffa11b52a: primeiro bloco cercado depois de cada `### <nome>`), aplicado a `git show 4ca2be43:docs/revisoes/SAN3/<doc>` → r1: inject.mts (+5 sondas); r2: inject-novas/-tipo/-motivo (+5); plano: inject-prefixo, inject-get-escreve, mk-malclass.cjs, prova-tipos-v3.mts, census/sync/tipos/classify-v3. Comparação EOL-neutra `tr -d '\r' | md5sum` apêndice × `git show 4ca2be43:tests/fixtures/o6r07c-formas/<f>`: inject.mts 87685275… IGUAL · inject-novas.mts 9df19eef… IGUAL · inject-tipo.mts 0021bbae… IGUAL · inject-motivo.mts e55e1c99… IGUAL · inject-prefixo.mts fb3ea6db… IGUAL · inject-get-escreve.mts 80060b1b… IGUAL (6/6). mk-malclass.cjs não tem cópia: o subteste B3 do T12 escreve as MESMAS 3 entradas (classe/n idênticas, lidas). prova-tipos-v3.mts não tem cópia: o subteste N3d do T12 traz os MESMOS 12 casos, com o resultado esperado de cada um. grupo-a.mts (9 linhas) importa inject, inject-prefixo, inject-novas, inject-tipo, inject-motivo e chama os 5 `inject` em sequência; F1′ fica no grupo B sozinho (mesma rota do F1). Interação lida: inject-tipo e inject-motivo embrulham o MESMO último handler do lote de OS em cadeia e anexam linhas ao mesmo `readFileSync` — compatíveis, cada tipo segue pelo seu ramo. Mapa forma → subteste do T12 (no blob): F1→"F1 (r1)" · F2→"F2 (r1)" (5 verbos) · F3→"F3 (r1)" (rota + ROTEADOR) · F4→"F4 (r1)" · F5→"F5 (r1)" (rota + ROTEADOR /api/v1/mobile) · F6→"F6 (r1)" (rota + ≥1 PAR checklist + CURINGA-DINAMICO) · N1→"N1 (r2)" (MIDDLEWARE + 200 aos 2 papéis) · N2→"N2 (r2)" (SUBAPP + rota) · N9→"N9" (SEM-CAMINHO) · N3a/N3b/N3c/N10→um subteste cada (PAR) · F1′→"F1′ (plano)" (LEITURA-ESCREVE) · B3→"B3 (r2)" (3 CLASSE-INCOMPATIVEL) · N3d→"N3d e as formas de tipo" (12 casos). Nenhuma forma perdida. → VERDE.
- 2b (17:33–17:44Z) cada forma SOZINHA contra o guard do objeto. Injeções isoladas derivadas por `sed` das cópias dos apêndices (F1..F5 de inject.mts removendo as linhas das outras formas; N1, N2, N9 de inject-novas.mts; N3a/N3b/N3c de inject-tipo.mts deixando 1 tipo e 1 par de linhas; F6, N10, F1′ = arquivo inteiro; B3 = F1+F3+F4 com o instantâneo `mk-malclass.cjs` do plano aplicado ao blob). Runner `$SCRATCH/gen/c2forma.mts` (md5 3786e877d54cd1302dc5b177467aa8f1: `executarCenso({injecao})` do helper + `classificar(c3, s3, instantâneo)`), lotes A/B/C em paralelo (`lote-formas.sh`, md5 8c8cce7f6db1f4fc531126728579b71f), todos ec=0. Linha de violação que acusa cada uma (as 3 `CONTAGEM` de /api/v1 vêm do `app.use("/api/v1", attachAuthenticatedActor(), r)` da própria injeção):
  - F1 → `NAO-CLASSIFICADA (na propriedade): ROTA GET /api/v1/work-orders/:workOrderId/aceitar-por-link` (+3 CONTAGEM) — 4 violações
  - F2 → 5 × `NAO-CLASSIFICADA (na propriedade): ROTA <GET|POST|PUT|PATCH|DELETE> …/via-all` (+3 CONTAGEM)
  - F3 → `NAO-CLASSIFICADA (na propriedade): ROTA POST …/:workOrderId/notas` + `NAO-CLASSIFICADA: ROTEADOR …/:workOrderId/notas`
  - F4 → `NAO-CLASSIFICADA (na propriedade): ROTA POST /api/v1/work-orders/:id/fechar`
  - N1 → `NAO-CLASSIFICADA: MIDDLEWARE /api/v1/work-orders/:workOrderId/via-use · (anônima)` + 2 `MIDDLEWARE-RESPONDE-SUCESSO: <field_technician|technician> POST …/via-use → 200`
  - N2 → `NAO-CLASSIFICADA: SUBAPP /api/v1` + `NAO-CLASSIFICADA (na propriedade): ROTA POST …/via-subapp`
  - N9 → `SEM-CAMINHO: ROTA /api/v1 ["/work-orders/:workOrderId/via-array"]` + `NAO-CLASSIFICADA: SEM-CAMINHO /api/v1`
  - N3a → `NAO-CLASSIFICADA (na propriedade): PAR /api/v1/mobile/sync/work-order-actions · work_order.odometro` (1 violação)
  - N10 → `NAO-CLASSIFICADA (na propriedade): PAR … · work_order.vistoria_set` (1 violação)
  - F1′ → `LEITURA-ESCREVE: GET /api/v1/work-orders/:workOrderId/aceitar-por-link ["<osA>"]` (+ a rota nova + 3 CONTAGEM)
  - B3 → 3 `CLASSE-INCOMPATIVEL`: `…aceitar-por-link = LEITURA (esperado LEITURA-OS)`, `…/:id/fechar = N (na propriedade)`, `…/notas = N (na propriedade)` (+ ROTEADOR notas não classificado + CONTAGEM)
  - N3d → `prova-tipos-v3.mts` do plano com o import trocado para o helper do objeto (diff de 1 linha): `N3d constante importada que não se resolve | tipos: [] | naoResolvidos: 1`; os 12 casos dão exatamente a coluna "resolvidos / naoResolvidos / curinga" da C.2 (prefixo → curingas 1; variável → naoResolvidos 1). Ponta a ponta no guard: ver MG7.
  - MG3b-inj (injeção minha, sub-app em Router) → só `NAO-CLASSIFICADA: MIDDLEWARE /api/v1 · app` (o helper NÃO vê a rota de dentro; meu gerador viu, 1.6d).
  - F5 → `NAO-CLASSIFICADA: ROTA POST /api/v1/mobile/sync/novidade-actions` + `NAO-CLASSIFICADA: ROTEADOR /api/v1/mobile` (+3 CONTAGEM)
  - F6 → `NAO-CLASSIFICADA: ROTA POST /api/v1/mobile/sync/prefixo-actions` + 8 `NAO-CLASSIFICADA (na propriedade): PAR …/prefixo-actions · checklist.<acknowledgement_create|attachment_attach|complete|divergence_create|item_answer|item_note|marker_create|run_create>` + `CURINGA-DINAMICO: …/prefixo-actions · checklist.__tipo_inexistente_07c_a__ → 200|accepted|||accepted` (+3 CONTAGEM) — 13 violações
  - N3b → `NAO-CLASSIFICADA (na propriedade): PAR … · work_order.reboque` (1)
  - N3c → `NAO-CLASSIFICADA: PAR … · km_rapida` (1)
  → **2b: 15/15 formas das tabelas vermelhas SOZINHAS, cada uma pela linha da C.2** (17:33–17:44Z, 13 censos, ec=0 todos). As 3 `CONTAGEM` de /api/v1 nas formas montadas por `app.use("/api/v1", attachAuthenticatedActor(), r)` são efeito do próprio arnês de injeção (roteador + 2 middlewares novos na montagem), não da forma; N3a/N3b/N3c/N10 (só handler) dão 1 violação cada, a da forma.
- 2c rito de mutação: `$SCRATCH/gen/mut.cjs` (md5 3b07ddab968ed88eaf548918cdd5c25c — âncora de 1 linha contada no texto cru, =1 ou ABORTA ec=3; inserção no EOL do arquivo; cópia `.pristino` antes), `$SCRATCH/gen/rest.sh` (md5 e6393fd48c519ce07b138b00c21c7c30 — restaura e prova `git hash-object` = `git rev-parse 4ca2be43:<f>` e porcelain), `$SCRATCH/gen/guard.sh` (md5 77d1762bb37e312b8e7096afb3cd0354 — arquivo de guard inteiro, `timeout 600`, TAP para arquivo, publica md5 do fixture no disco, `not ok` e linhas de violação), `$SCRATCH/gen/snapmut.cjs` (md5 d8e08c06a81e718a7f009e61bcbd99a3 — mutação do instantâneo por chave, âncora `"<chave>": {` contada).
- 2c vermelho-controle 2 (rito falha fechado, 17:44Z): âncora inexistente `  return routerXYZ_inexistente;` → `MUT ancora ocorrencias = 0 / MUT ABORTADA` ec=3; âncora de 2 linhas unidas por LF (`router.use(tenantContextMiddleware);\n  router.use(createPersistentRbacContextMiddleware());`) no arquivo CRLF → ocorrências 0, ABORTADA ec=3; depois: hash-object = blob (0ee705e9…), sem `.pristino`, porcelain vazio. ACUSOU.
- 2c **MG1** (17:45–17:47Z) `work-order.routes.ts`, antes de `  return router;` (ocorrências 1, CRLF, md5 7c702273→abb7c3a4, diff 1 linha): `router.post("/work-orders/:workOrderId/x", requirePermission(WORK_ORDER_PERMISSIONS.update), (_q, s) => { s.status(200).json(...) })` → guard ec=1 `# tests 31 # pass 30 # fail 1` · CAIU **T1** · `NAO-CLASSIFICADA (na propriedade): ROTA POST /api/v1/work-orders/:workOrderId/x`. Vermelho-controle 1 (o guard é capaz de vermelho, primeira MG, guard verde antes em 1.1): ACUSOU. = plano (T1) e dev.
- 2c vermelho-controle 3 (restauro verificado, 17:47Z): com a MG1 ainda aplicada, `hash-object 76b91b9c…` × blob `0ee705e9…` → DIFERENTE, porcelain ` M src/modules/work-orders/work-order.routes.ts` — ACUSOU; restaurado depois (abaixo) → IGUAL.
- **3b caminho do preguiçoso, rota (17:47–17:50Z)**: MG1 aplicada + `node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json` (fixture copiado antes) → ec=0, 469 chaves, 0 violações, `OS·07c-a=11`; a rota nova recebeu `{"classe":"OS·07c-a","n":1}` (regra por recurso). Guard com esse instantâneo: ec=0, 31/31 VERDE (md5 do fixture no disco 45160387…, o regenerado). Laço G `node --test --import tsx tests/o6r07c-subresource-scope.test.ts`: ec=1 `# tests 25 # pass 24 # fail 1` · `not ok 15 - laço G [OS·07c-a] ROTA POST /api/v1/work-orders/:workOrderId/x — G-NEG 403, G-POS e G-WIDE passam` · `G-NEG ROTA POST /api/v1/work-orders/:workOrderId/x: status 200`. → a via sem escopo NÃO passa no par guard+laço G (o vermelho vem do laço G). O laço G roda na CI: 28 linhas "laço G" no log do job backend do objeto.
- **3b vermelho-controle 2 (rota COM escopo, 17:50–17:53Z)**: `router.post("/work-orders/:workOrderId/x-escopo", requirePermission(update), handleAsyncRoute(async (q, s) => { const svc = await createDefaultWorkOrderService(); await svc.getForMutation(q.tenantContext, q.params.workOrderId); s.status(200)… }))` + `gravar` → classe `OS·07c-a`; guard 31/31 ec=0; laço G ec=0 `# tests 25 # pass 25` (`ok 15 - laço G [OS·07c-a] ROTA POST …/x-escopo`). → o vermelho do MG1 é da falta de escopo. Restauros: fixture hash-object = blob 67a3bca9… IGUAL; `work-order.routes.ts` 0ee705e9… IGUAL; porcelain vazio; sem `.pristino`.
- 2c rótulo de execução das MG de código: `$SCRATCH/gen/mgrun.sh` (md5 7ca818f9b8f6e2291f341720c88a4b2e = mut.cjs → diff contra o .pristino → guard.sh → rest.sh), cadeias sequenciais no MEU worktree.
- 2c **MG2** (forma do plano = N1 num roteador real; 17:54–17:56Z) `work-order.routes.ts` antes de `  return router;`: `router.use("/work-orders/:workOrderId/via-mg2", (q, s, n) => (q.method === "POST" ? requirePermission(WORK_ORDER_PERMISSIONS.status)(q, s, () => s.status(200).json(...)) : n()))` (diff +1) → guard ec=1 31/29/2 · CAIU **T1** (`NAO-CLASSIFICADA: MIDDLEWARE /api/v1/work-orders/:workOrderId/via-mg2 · (anônima)`) e **T5** (`MIDDLEWARE-RESPONDE-SUCESSO: field_technician POST …/via-mg2 → 200` e o mesmo ao technician). **T4 NÃO caiu** — divergência com a coluna "derruba" do plano (T1, T4, T5), igual à do dev: a chave é nova, nenhuma contagem existente muda. Restauro IGUAL, porcelain vazio.
- 2c **MG2T4** (extra do dev, para o T4; 17:55–17:57Z) `router.use((_q, _s, n) => n());` no roteador de OS → guard ec=1 31/30/1 · CAIU **T4** só · `CONTAGEM: MIDDLEWARE /api/v1 · (anônima) instantâneo 114 × vivo 115`. Restauro IGUAL.
- 2c **MG3 na forma do PLANO (N2)** (17:57–17:58Z) `src/app.ts` depois de `app.use("/api/v1", attachAuthenticatedActor(), createWorkOrderRouter(...))`: `{ const sub = express(); sub.post("/work-orders/:workOrderId/via-mg3", …200…); app.use("/api/v1", attachAuthenticatedActor(), sub); }` → guard ec=1 31/29/2 · CAIU **T1** (`NAO-CLASSIFICADA: SUBAPP /api/v1` + `NAO-CLASSIFICADA (na propriedade): ROTA POST …/via-mg3`) e **T4** (`CONTAGEM: MIDDLEWARE /api/v1 · (anônima) 114 × 115`) = plano (T1, T4). Restauro `src/app.ts` df1fdae4… IGUAL. (A forma do dev, `router.use(sub)`, está em 2d.)
- 2c **MG4** (17:58–17:59Z) `router.post(["/work-orders/:workOrderId/via-array-mg4"], …)` → guard ec=1 31/29/2 · CAIU **T1** (`NAO-CLASSIFICADA: SEM-CAMINHO /api/v1`) e **T3** (`SEM-CAMINHO: ROTA /api/v1 ["/work-orders/:workOrderId/via-array-mg4"]`) — plano: T3 ✓. Restauro IGUAL.
- 2c **MG6** (17:59–18:00Z) `mobile-work-order-sync.ts` antes de `    if (action.type !== "work_order.status_change") {` (ocorrências 1): `const MG6_PREFIX = "work_order."; const MG6_FAM = "work_order"; if (action.type === <crase>${MG6_PREFIX}odometro<crase> || action.type === MG6_FAM + ".reboque" || action.type === "km_rapida") { requireActionPermission(...status); return acceptedResult(... service.get ...) }` → guard ec=1 31/30/1 · CAIU **T1** · `NAO-CLASSIFICADA (na propriedade): PAR …work-order-actions · work_order.odometro`, `… · work_order.reboque`, `NAO-CLASSIFICADA: PAR … · km_rapida` = plano (T1). Restauro sync 7ba80969… IGUAL.
- 2c **MG8** (18:00–18:01Z) `if (action.type === "work_order.vistoria_set") { requireActionPermission(...status); if (!payload.checklists?.[0]?.role) throw routeError(400,"BAD_REQUEST","checklist_role_required",…); return acceptedResult(...) }` → 31/30/1 · CAIU **T1** · `NAO-CLASSIFICADA (na propriedade): PAR … · work_order.vistoria_set` = plano. Restauro IGUAL.
- 2c **MG9** (18:01–18:02Z) `if (action.type.split(".")[0] === "checklist") {…accepted…}` → 31/29/2 · CAIU **T1** (8 `NAO-CLASSIFICADA (na propriedade): PAR …work-order-actions · checklist.<run_create|marker_create|item_note|item_answer|divergence_create|complete|attachment_attach|acknowledgement_create>`) e **T10** (`CURINGA-DINAMICO: …work-order-actions · checklist.__tipo_inexistente_07c_a__ → 200|rejected|WORK_ORDER_NOT_FOUND|not_found|rejected`) = plano (T1, T10). Restauro IGUAL.
- 2c **MG10** (18:02–18:04Z) `if (action.type.startsWith("work_order.mg10_")) {…}` → 31/30/1 · CAIU **T9** só · `CURINGA-ESTATICO: src/modules/mobile/mobile-work-order-sync.ts:260: action.type.startsWith("work_order.mg10_")` = plano. Restauro IGUAL.
- 2c **MG13** (18:04–18:05Z) `catalog.ts` depois de `  field_technician: [`: `    "checklist_runs:create",` → 31/30/1 · CAIU **T6** · `CLASSE-INCOMPATIVEL: ROTA POST /api/v1/mobile/checklist-runs = SEM-ALCANCE-CAMPO mas o campo alcança` + `PAR …checklist-actions · checklist_run.create = OS·SEM-ALCANCE mas o campo alcança` + `PAR … · checklist.run_create = OS·SEM-ALCANCE mas o campo alcança` = plano (T6) e cobre a sub-regra 4 do T6. Restauro catalog.ts 8228581b… IGUAL.
- 2c **MG15** (18:05–18:06Z) `attachment-entity-resolver.ts` antes de `  return new RegistryAttachmentEntityResolver(registry);`: `registry.set("work_order", {…})` → 31/30/1 · CAIU **T13** só (deepEqual das entidades, 5 × 4) = plano. Restauro 79182ced… IGUAL.
- 3c **T0 fabricado** (18:06–18:08Z) helper, depois de `  const add = (c: string, x: string) => viol.push(c + ": " + x);`: `  viol.push("NOVA-CATEGORIA-C2: fabricada pela C2");` → 31/30/1 · CAIU **T0** só · `categoria sem T dono: NOVA-CATEGORIA-C2: fabricada pela C2`. Restauro helper f3a7a76e… IGUAL.
- 2c **MG16b** (extrator regride a "só tipo com ponto", a forma do v2; 18:08–18:09Z) helper: `add` de `analisarTipos` passa a descartar valor sem ponto → 31/28/3 · CAIU **T12** (subtestes `N3c (r2) — tipo sem ponto` e `N3d e as formas de tipo (prova-tipos-v3.mts)`) = plano (T12). Restauro IGUAL.

## Item 3 — CE-G1 (a)(b)(c), T6 e T11 na letra
- 3a (18:10Z) de onde vem cada enumeração (lido no blob do helper e do arquivo de guard): camadas = app real montado por `createApp` num processo filho (interceptação de `Router.prototype.use/route` e `express.application.use` + `walk`) — GERADA; alcance = diferencial papel × papel sem permissão no app (catálogo em código) — GERADO; tipos = `git ls-files src` (`o6r07c-census.ts:224`) + AST/checker do `typescript` — GERADOS; lotes = POSTs do c3 sondados — GERADOS; entidades de `/attachments` = `createDefaultAttachmentEntityResolver().entityTypes()` (registro real) comparado com literal — GERADA × catraca; instantâneo = `gravar` (regras `porRegra`) e revisado — GERADO (1.3: blob = regenerado).
- 3a varredor de listas literais `$SCRATCH/gen/listas.cjs` (md5 0f7f4c87607bdb9f38f2aa03a42d914a; AST: array com ≥2 textos e objeto com ≥2 valores texto) sobre o guard, o helper e um fixture de forma. Vermelho-controle 1: acha `ENTIDADES_ATTACHMENTS` (guard:69, n=4) e acha 0 em `inject-get-escreve.mts` → ACUSOU nos dois sentidos. Listas que decidem: guard — `LISTA_07C_B` (l.41, 23), `ENTIDADES_ATTACHMENTS` (l.69, 4), `CATEGORIAS` (l.72, mapa 11); helper — `NAO_RESOLVIDOS_ACEITOS` (l.404, 3), `CURINGAS_ACEITOS` (l.409, 3), `IN_PROP` (l.416, 7 classes), `G07A` (l.417, 3), `R` (l.418, 7), `N` (l.419, 12), e a regex `SEG` (l.415, work-orders|checklist-runs|dispatches). Demais achados do varredor são de arnês (verbos, papéis, nomes de método do AST, `modules` da semente, argv do git). Leitura do uso: LISTA_07C_B e ENTIDADES → `deepEqual` de conjuntos ordenados (igualdade); NAO_RESOLVIDOS/CURINGAS → `!LISTA.has(semLinha(x))` (⊆, casando por arquivo+texto SEM a linha); CATEGORIAS → pertença (T0); IN_PROP → classes aceitas para via da propriedade (cada classe tem a sua condição medida: OS·SEM-ALCANCE exige não-alcance, ·07c-b é limitada pela catraca T11, LOTE exige comportamento de lote); G07A/R/N → só a regra do `gravar` (com instantâneo, a classe escrita decide).
- rito das mutações do instantâneo: `$SCRATCH/gen/snaprun.sh` (md5 3a217b3535d0e90e3082f8b5a51ac7a9) — snapmut (âncora `"<chave>": {` contada: 1 para set, 0 para add) → PROVA-CARGA (md5 do fixture no disco antes do guard) → guard.sh (que publica o md5 do fixture que o teste leu) → rest.sh. Vermelho-controle 3 do item 3 (a mutação carrega): em todas, md5 no disco ≠ 06016698… (o do blob no disco CRLF) e = o publicado pelo guard; a prova de substituição é o md5 antes ≠ depois (a contagem por conjunto de linhas dá 0 no `set` porque a linha `"classe": "X",` existe em outras chaves).
- 2c **MG11** (forma do dev, chaves vivas; 18:09–18:10Z) set `ROTA GET /api/v1/work-orders/:workOrderId`→LEITURA, `ROTA POST …/comments`→N, `ROTA POST …/attachments`→N (md5 06016698→f597c1cd = o lido pelo guard) → 31/30/1 · CAIU **T6** só · `CLASSE-INCOMPATIVEL: ROTA POST …/comments = N (na propriedade)`, `… …/attachments = N (na propriedade)`, `… GET /api/v1/work-orders/:workOrderId = LEITURA (esperado LEITURA-OS)` = plano (T6). (A forma do plano com as rotas injetadas, B3, está em 2b.) Restauro fixture 67a3bca9… IGUAL.
- 2c **MG14** (18:10–18:12Z) set `ROTA POST /api/v1/work-orders/:workOrderId/comments` → `VISTORIA·07c-b` (24 entradas ·07c-b; md5 97a56391 lido) → 31/30/1 · CAIU **T11** só = plano. **MG14b** add chave inexistente `ROTA POST …/inexistente-c2` como `VISTORIA·07c-b` (md5 42f5eb9b lido) → 31/29/2 · CAIU **T11** e **T2** (`ENVELHECIDA: …/inexistente-c2`). Restauros IGUAL.
- **3e T11 nos dois sentidos**: acrescentar = MG14 (vermelho); **tirar** (18:13–18:14Z) set `ROTA POST /api/v1/mobile/checklist-runs/:runId/complete` (VISTORIA·07c-b) → `OS·07c-a` sem mexer na lista literal (22 × 23; md5 8ff61da7 lido) → 31/30/1 · CAIU **T11**. Código (guard l.172-178): `assert.deepEqual(atuais.sort(), [...LISTA_07C_B].sort())` = IGUALDADE de conjunto, não inclusão — na letra ("exatamente"). Lista literal do T11 × Apêndice B do plano: ver 3e-bis.
- 3e-bis (18:15Z) lista literal do T11 × Apêndice B do plano, por script `$SCRATCH/gen/apB.cjs` (md5 8d6a684a116d32e5c29dcc23c4ee5541; tabela do Apêndice B no blob, caminhos normalizados com /api/v1): 23 entradas ·07c-b na tabela = as 23 de `LISTA_07C_B` (guard l.41) = as 23 ·07c-b do fixture → IGUAIS. Tabela (107 linhas) + resumidas (LEITURA 174, SEM-ALCANCE-CAMPO 172, ROTEADOR 15 chaves/75) = 468 = fixture; as 10 "diferenças" do script são só as chaves MIDDLEWARE escritas no apêndice sem o prefixo /api/v1 (minha normalização só cobre ROTA/PAR), não divergência. (A linha corrida "A lista literal do T11" do apêndice quebra em várias linhas; o script só pegou 7 — limite do meu parser, a tabela basta.)
- **3d T6 na letra, sub-regra a sub-regra** (cada uma: snapmut set → guard → restauro fixture 67a3bca9… IGUAL, porcelain vazio):
  1. (18:14–18:16Z) `ROTA POST …/:workOrderId/comments` (OS·07c-a) → `R` (md5 15f3ce59 lido) → 31/30/1 · CAIU **T6** · `CLASSE-INCOMPATIVEL: ROTA POST /api/v1/work-orders/:workOrderId/comments = R (na propriedade)`.
  2. (18:16–18:17Z) a mesma → `SEM-ALCANCE-CAMPO` (285014a1 lido) → **T6** · `… = SEM-ALCANCE-CAMPO mas o campo alcança` + `… = SEM-ALCANCE-CAMPO (na propriedade)`.
  3. (18:17–18:18Z) `ROTA GET …/:workOrderId/comments` (LEITURA-OS) → `LEITURA` (4c7f41c2 lido) → **T6** · `… = LEITURA (esperado LEITURA-OS)`.
  4. `SEM-ALCANCE-CAMPO` que o campo passa a alcançar = **MG13** (acima): **T6** · `ROTA POST /api/v1/mobile/checklist-runs = SEM-ALCANCE-CAMPO mas o campo alcança`.
  5. (18:18–18:19Z) rota que não é lote, `ROTA POST /api/v1/fuel-logs` (R) → `LOTE` (6ee6f6c9 lido) → **T6** · `… = LOTE sem comportamento de lote`.
  6. (18:19–18:20Z) lote com outra classe, `ROTA POST /api/v1/mobile/sync/work-order-actions` (LOTE) → `N` (a4bd7bfd lido) → **T6** · `… é lote e está como N`.
  → as 6 sub-regras da célula do T6 e a regra "leitura da propriedade só aceita LEITURA-OS" ficam vermelhas, cada uma pela linha certa, só o T6 caindo.
- 2c **MG5** (18:21–18:22Z) `$SCRATCH/gen/delrota.cjs` (md5 1dc5f8015d29320be3a2e1a55fdf84a8; âncora `controller.detachTag(request)` ocorrências 1; remove o bloco `router.delete(` … `  );`, linhas 78-84 de `work-order-comment.routes.ts`, 7 linhas listadas) → 31/30/1 · CAIU **T2** só · `ENVELHECIDA: ROTA DELETE /api/v1/work-orders/:workOrderId/comments/:commentId/tags/:tagId` = plano. Restauro f818db3f… IGUAL.
- 2c **MG7** (18:22–18:23Z) arquivo temporário não rastreado `src/modules/mobile/__mg7.ts` = `export const WO_MILEAGE_V2: string = process.env.C2_MG7 ?? "work_order.mg7";` + import dele em `mobile-work-order-sync.ts` (depois do import de `work-order.types.js`) + `if (action.type === WO_MILEAGE_V2) {…}` (2 âncoras, 1 cada) → 31/30/1 · CAIU **T8** só · `TIPO-NAO-RESOLVIDO: src/modules/mobile/mobile-work-order-sync.ts:261: action.type === WO_MILEAGE_V2` = plano (a constante importada não se dobra). Restauro sync 7ba80969… IGUAL; `__mg7.ts` removido; porcelain vazio.
- 2c **MG12** (18:23–18:24Z) `work-order.routes.ts`: `router.get("/work-orders/:workOrderId/aceitar-mg12", requirePermission(read), handleAsyncRoute(async (q, s) => { const svc = await createDefaultWorkOrderService(); await svc.update({ tenantId, userId, roles: ["manager"], permissions: [] }, q.params.workOrderId, { title: "escrito por GET mg12" }).catch(() => undefined); s.status(200)… }))` + snapmut add da chave como `LEITURA-OS` (md5 dd9830ee lido) → 31/30/1 · CAIU **T7** só · `LEITURA-ESCREVE: GET /api/v1/work-orders/:workOrderId/aceitar-mg12 ["<osA>"]` = plano (sem o ruído das 185 leituras da forma do dev, que mutou a timeline). Restauros fixture e rotas IGUAIS, porcelain vazio.
- 2c **MG16a** (o `walk` regride ao do v2 — pula sub-app e camada terminal sem contar; 18:24–18:26Z) helper, 2 âncoras (1 cada; `C2_SEGUNDA` mantém o .pristino original): `if (l.__subapp) { continue; }` e `continue;` antes da chave MIDDLEWARE → 31/27/4 · CAIU **T2** (14 `ENVELHECIDA: MIDDLEWARE …` — `/api/v1/sessions`, `/platform`, `/navigation`, `/me`, `/auth/identity-links`, `/api/v1`, `/ · result|jsonParser|helmetMiddleware|corsMiddleware`) e **T12** (subtestes `N1 (r2)` e `N2 (r2)`) = plano (T12) e dev (T2, T12). Restauro helper f3a7a76e… IGUAL.
- 2c **MG1b** (dev; 18:26–18:27Z) MG1 + snapmut add `ROTA POST …/:workOrderId/x` como `N` (2df98149 lido) → 31/30/1 · CAIU **T6** · `CLASSE-INCOMPATIVEL: ROTA POST /api/v1/work-orders/:workOrderId/x = N (na propriedade)`. Restauros IGUAIS.
- 3c **T10 — sub-propriedade "lote instável"** (sem MG no plano; 18:30–18:32Z) `mobile-work-order-sync.ts`: o motivo de `unsupported_action_type` passa a terminar com `action.type.slice(-4)` → 31/29/2 · CAIU **T10** com `LOTE-INSTAVEL: /api/v1/mobile/sync/work-order-actions : 200|rejected|BAD_REQUEST|unsupported_action_type_a__|rejected × …_b__|rejected` (e T1, porque todo candidato passa a diferir da referência). Restauro IGUAL.
- **FORMA PRÓPRIA C2a — despacho por `Map.get`** (nenhuma crítica nem o plano a listam; 18:27–18:29Z) `mobile-work-order-sync.ts`, antes do teste de `work_order.status_change`: `const MAPA_C2 = new Map<string, true>([["work_order.c2_mapa", true]]); if (MAPA_C2.get(action.type)) { requireActionPermission(actor, action, "work_orders:status"); return { client_action_id, type, status: "accepted" } as any; }` (diff +5, âncora 1) → **guard ec=0 · 31/31/0 VERDE**. Leitura do extrator no blob (`o6r07c-census.ts:377-383`): os pontos de decisão são igualdade, switch, `includes/has/indexOf` e acesso por chave; `.get(t)` não é ponto de decisão → o tipo não vira candidato, não vai a `naoResolvidos` nem a curinga; o curinga dinâmico sonda `work_order.__tipo_inexistente_07c_a__`, que o Map recusa. Sonda HTTP: a 1ª tentativa morreu por conversão de caminho do MSYS no argumento `/api/v1/...` (falha de infraestrutura minha), re-executada em 2e-sonda.
- **FORMA PRÓPRIA C2b — despacho por sufixo com o MESMO texto de um curinga aceito, no mesmo arquivo** (18:29–18:30Z) `mobile-evidence-sync.ts`, antes de `    if (!isSupportedActionType(action.type)) {`: `const type = action.type; if (type.endsWith("_photo") && !isSupportedActionType(type)) { return { client_evidence_id, type, status: "accepted" } as any; }` (diff +4, âncora 1) → **guard ec=0 · 31/31/0 VERDE**. Leitura: o curinga novo sai como `src/modules/mobile/mobile-evidence-sync.ts:<linha nova>: type.endsWith("_photo")`; `semLinha` tira a linha e o texto É membro de `CURINGAS_ACEITOS` (helper l.409-413, `Set` por arquivo+texto) → T9 não acusa; o curinga dinâmico sonda `evidence.__tipo_inexistente_07c_a__`, que não termina em `_photo`. Restauro evidence-sync be699c9d… IGUAL. Sonda HTTP: re-executada em 2e-sonda.
- **2e-sonda (18:33–18:34Z)** `$SCRATCH/gen/c2sonda-tipo.mts` (md5 fbcd1ad03db0f6b594046c9e2da1e058; envelope de 1 ação, `MSYS_NO_PATHCONV=1` só na linha), com a mutação aplicada de novo pelo mesmo rito:
  - C2a, `/api/v1/mobile/sync/work-order-actions` · `work_order.c2_mapa` → tenant_admin, **field_technician** e **technician**: `HTTP 200 accepted:accepted`; controle `work_order.c2_controle_inexistente` → os três `rejected:unsupported_action_type`; controle NO OBJETO (sem mutação, depois do restauro 7ba80969… IGUAL): `work_order.c2_mapa` → os três `rejected:unsupported_action_type`.
  - C2b, `/api/v1/mobile/sync/evidence-actions` · `evidence.work_order_extra_photo` → tenant_admin, **field_technician** e **technician**: `HTTP 200 accepted:accepted`; controle `evidence.work_order_extra_x` → `rejected:unsupported_action_type`; NO OBJETO (restauro be699c9d… IGUAL): `evidence.work_order_extra_photo` → `rejected:unsupported_action_type`.
  → **as duas formas próprias fazem um lote existente aceitar do papel de campo um tipo novo, com o instantâneo intocado e o guard 31/31 verde: escapam EM SILÊNCIO** (régua das críticas: classe do B1/B2). O tipo novo do C2a é de OS (`work_order.*`, prefixo da propriedade); o do C2b é evidência de OS (`evidence.work_order_*`, prefixo da propriedade, mesma família das 3 entradas `EVIDENCIA-OS·07c-b` da catraca) — nenhum dos dois entra no censo, logo nem na catraca do T11 nem no laço G.
- **2d MG3b — residual medido** (`$SCRATCH/gen/mg3b.sh`, md5 0e939fc7ccdd75664fe646f31d13faca; 18:33–18:37Z). `work-order.routes.ts`: import trocado para `import express, { Router, type Response } from "express";` + antes de `return router;`: `{ const sub = express(); sub.use(tenantContextMiddleware); sub.use(createPersistentRbacContextMiddleware()); sub.post("/work-orders/:workOrderId/via-mg3b", requirePermission(WORK_ORDER_PERMISSIONS.status), (_q, s) => { s.status(200).json(...) }); router.use(sub); }` (2 âncoras, 1 cada).
  1. guard com o instantâneo do objeto → ec=1 31/30/1 · CAIU T1 · `NAO-CLASSIFICADA: MIDDLEWARE /api/v1 · app` (a rota de dentro não aparece);
  2. o `gravar` que o cabeçalho do guard prescreve → ec=0, `MIDDLEWARE 184 (15 chaves)`, 469 chaves, 0 violações; **o diff do instantâneo que o revisor vê, verbatim**: `+ "MIDDLEWARE /api/v1 · app": {` / `+  "classe": "MIDDLEWARE",` / `+  "n": 1` / `+ },` — escrito pelo gerador, sem decisão humana (para chave MIDDLEWARE a única classe aceita é MIDDLEWARE);
  3. guard com o instantâneo regenerado → **ec=0 31/31 VERDE**;
  4. laço G com o instantâneo regenerado → **ec=0 24/24 VERDE**, 0 linhas mencionam `via-mg3b`;
  5. sonda HTTP do meu gerador (`C2_SONDA`): `field_technician POST /api/v1/work-orders/:workOrderId/via-mg3b -> 200 por ROTA …/via-mg3b` e o mesmo ao `technician` (meu gerador: `SUBAPP 1`, `ROTA 410`).
  Restauros: fixture 67a3bca9… IGUAL, rotas 0ee705e9… IGUAL, porcelain vazio.
  **Graduação (régua das críticas, declarada):** não é "silêncio puro" (a chave aparece no diff), mas também não é a classe do B3: no B3 a chave inscrita NOMEIA a rota (`ROTA POST …/fechar = N`) e a classe errada é escolha humana; aqui a chave diz "middleware de nome app", a classe é a única possível e o `gravar` a escreve sozinho — a chave NÃO diz ao revisor que há uma rota de escrita atrás dela, e o T5, que o revisor teria para confiar que "middleware não responde", não sonda montagem em "/". Pelo critério do item 3(b) do meu corpo ("com o instantâneo regenerado pelo gravar, a via nova sem escopo passa no guard e no laço G" = default "permitir depois do gravar"), gradua **bloqueia**.
- **3b caminho do preguiçoso, TIPO NOVO DE LOTE (forma N3c)** (`$SCRATCH/gen/cadeia5.sh`, md5 9fe954d1ce8bd166f945bffe553177c5; 18:37–18:42Z) `mobile-work-order-sync.ts`: `if (action.type === "km_rapida") { requireActionPermission(...status); return { …, status: "accepted" } as any; }` (sem escopo) →
  1. `gravar` → **ec=1**, `NAO-CLASSIFICADA=1`, 469 chaves, `VIOLAÇÕES: 1`; a chave recebeu `{"classe":"NAO-CLASSIFICADA","n":1}` (o par não é da propriedade pela regra de nome: `/^work_order[.]/`, `/^checklist/`, `/^evidence[.]work_order_/`);
  2. guard com o regenerado → ec=1 · CAIU **T1** · `NAO-CLASSIFICADA: PAR … · km_rapida` — o `gravar` sozinho NÃO leva ao verde;
  3. classe escrita à mão `OS·07c-a` (b580661e lido) → ec=1 · CAIU **T6** · `CLASSE-INCOMPATIVEL: PAR … · km_rapida = OS·07c-a (fora da propriedade)` — o guard RECUSA pôr o par na propriedade (e o T12/N3c cai porque a injeção do T12 usa o mesmo nome);
  4. classe escrita à mão `R` (7ae5b6ff lido) → T6 VERDE; só o T12/N3c cai, por colisão de NOME com a forma injetada do T12 (medição limpa com outro nome em 3b-bis); laço G ec=0 24/24, 0 linhas `km_rapida`;
  5. sonda: `km_rapida` → tenant_admin, field_technician, technician `HTTP 200 accepted:accepted`.
  Restauros fixture e sync IGUAIS, porcelain vazio.
- **3a acrescentar um membro a cada lista literal** (`$SCRATCH/gen/cadeia6.sh`, md5 5acd308df21c443303f77ef6e06368ff; 18:42–18:49Z; cada um com restauro IGUAL e porcelain vazio):
  - `ENTIDADES_ATTACHMENTS` + `"work_order"` (guard l.69) → ec=1 · CAIU **T13** → **catraca** (igualdade nos dois sentidos; o registro tem 4).
  - `LISTA_07C_B` + `"ROTA POST /api/v1/work-orders/:workOrderId/comments"` (guard l.41, sem mexer no instantâneo) → ec=1 · CAIU **T11** → **catraca**.
  - `CATEGORIAS` + `"NOVA-C2": "T10"` → ec=0 31/31 **verde** → pertença; o membro novo dispensaria do T0 uma categoria que nenhum T afirma (passo humano no próprio arquivo de guard, visível no diff).
  - `CURINGAS_ACEITOS` + `type.startsWith("evidence.")` em mobile-evidence-sync.ts → ec=0 31/31 **verde** → **allowlist (⊆)**: o membro novo dispensa o T9 para um despacho por prefixo `evidence.` nesse arquivo.
  - `NAO_RESOLVIDOS_ACEITOS` + `"src/modules/mobile/mobile-work-order-sync.ts: action.type === WO_MILEAGE_V2"` JUNTO com a MG7 (que sozinha derruba o T8) → ec=0 31/31 **verde** → **allowlist (⊆)**: o membro novo dispensa o T8 do ponto de despacho não resolvido.
  Leitura: as duas listas do T8/T9 são allowlists por desenho do plano (C.2: "aceitos"); crescer a lista exige editar o helper (visível no diff). O que NÃO exige editar lista nenhuma é a forma C2b (o casamento por arquivo+texto sem linha aceita uma ocorrência NOVA com o mesmo texto) — ali o membro novo entra sem passo humano.
- **FORMA PRÓPRIA C2c — despacho pelo operador `in`** (`$SCRATCH/gen/cadeia8.sh`, md5 686fdf6d09ba05437749ea6f1fbce7eb; 18:49–18:51Z) `mobile-work-order-sync.ts`, antes do teste de `status_change`: `if (action.type in ({ "work_order.c2_in": 1 } as Record<string, number>)) { requireActionPermission(...status); return { …, status: "accepted" } as any; }` (diff +4) → **guard ec=0 31/31 VERDE**; sonda: `work_order.c2_in` → tenant_admin, field_technician, technician `HTTP 200 accepted:accepted`; controle `work_order.c2_in_controle` → `rejected:unsupported_action_type` nos três. Restauro IGUAL. Leitura: `in` é `BinaryExpression` com `InKeyword`, fora do conjunto `IGUAL` do extrator (`o6r07c-census.ts:368,372`). → mesma classe do C2a: segunda forma de despacho não reconhecida, mesma fuga silenciosa.
- **3c TABELA T × mutação vermelha no OBJETO (medida por mim):** T0 ← T0 fabricado (categoria nova no classificador) · T1 ← MG1 (e MG3, MG4, MG6, MG8, MG9) · T2 ← MG5 (e MG14b, MG16a) · T3 ← MG4 · T4 ← MG2T4 e MG3 (forma do plano); a MG2 do plano NÃO derruba o T4 · T5 ← MG2 · T6 ← MG13, MG11, MG1b e as 6 sub-regras (3d) · T7 ← MG12 · T8 ← MG7 · T9 ← MG10 · T10 ← MG9 (curinga dinâmico) e a mutação de lote instável (3c) · T11 ← MG14, MG14b, T11-tirar, L-07CB · T12 ← MG16a (N1, N2) e MG16b (N3c, N3d) · T13 ← MG15 e L-ENTIDADES. Teste de tempo: afirma só `ms > 0` nos três censos — não pode falhar pela asserção (cai junto se um censo rejeitar); é publicação (R-a1) → nota. Nenhum T0–T13 sem mutação vermelha.
- **Divergências com a coluna "derruba" do plano e com a S6 do dev:** (i) MG2 → T1+T5, não T4 (como o dev); T4 coberto pela MG2T4 e pela MG3 do plano. (ii) MG3: a forma do PLANO (sub-app por `app.use`, N2) dá T1+T4 como o plano diz; a forma do DEV (`router.use(sub)`) é o MG3b (2d) e dá só T1 por `MIDDLEWARE /api/v1 · app`. (iii) MG4 dá T1+T3 (plano: T3). (iv) MG14b dá T11+T2. (v) MG16a dá T2+T12 (plano: T12). Nenhuma MG derruba OUTRO teste sem derrubar também o do plano.
- **3b-bis tipo novo de lote com nome que não colide com o T12** (`$SCRATCH/gen/cadeia9.sh`, md5 5ef037a5099e539ed14ba3192233c46d; 18:51–18:53Z) mesma mutação com `"km_c2"`: `gravar` ec=1, a chave nasce `NAO-CLASSIFICADA`; classe escrita à mão `R` (d5e6cc37 lido) → **guard ec=0 31/31 VERDE**; laço G ec=0 24/24, 0 linhas `km_c2`; diff do instantâneo que o revisor vê: `+ "PAR /api/v1/mobile/sync/work-order-actions · km_c2": {` / `+  "classe": "R",` / `+  "n": 1` / `+ },`; sonda: `km_c2` → os três papéis `HTTP 200 accepted:accepted`. Restauros IGUAIS, porcelain vazio. → o caminho do preguiçoso com tipo novo de lote NÃO fica verde só com o `gravar` (o T1 segura); fica verde com UMA classe escrita à mão, e a única família de classe que o T6 aceita para esse par é fora da propriedade (`OS·07c-a` recusada em 3b) — a pertença do par à propriedade é decidida só pelo prefixo do nome do tipo, então um tipo do lote de OS sem o prefixo nunca chega ao laço G. Classe do B3 (inscrição visível no diff, nomeando o lote de OS).
- **Veredito parcial item 3: VERMELHO** — CE-G1(a) sustentado (enumerações geradas; listas literais medidas: ENTIDADES e 07C_B catracas; CURINGAS/NAO_RESOLVIDOS allowlists de desenho; CATEGORIAS pertença); CE-G1(c) sustentado (T0–T13 com mutação vermelha, tabela acima); T6 6/6 e T11 na letra (igualdade, dois sentidos, lista = Apêndice B). **CE-G1(b) NÃO sustentado**: o membro não previsto nasce PERMITIDO em três formas medidas — despacho por `Map.get` (C2a) e por `in` (C2c), e sufixo com texto de curinga aceito (C2b), todos com o instantâneo intocado e guard verde — e o sub-app em `Router` (MG3b) fica verde no par guard + laço G depois do `gravar`. O caminho do preguiçoso com ROTA (MG1) é vermelho, com controle verde.

## Fim de medição (18:54Z)
- objeto no fim: `git ls-remote` = `gh pr view 414` = 4ca2be43c3b4b32b9bed670f02d78145620cdc2e (não andou); origin/main no fim = 9b611468… (igual ao início); 0 diretórios `o6r07c-*` no tmpdir; 0 `.pristino` pendentes; porcelain do meu worktree vazio; disco 18 GB livres.

## Apêndice — os geradores próprios da C2, verbatim (P3: roteiro de reexecução; cwd = worktree no objeto)

### c2gen.mts (md5 063c3409141d238d3e7b5de06a4b6758)

```ts
// Gerador PROPRIO da cadeira C2 (jurado-07ca-c2-censo-e-guard). Nao copia o helper do bloco nem o Apendice A.
// Mecanismo: (1) troca o construtor Layer do pacote router no cache de modulos ANTES de o express carregar,
// guardando o caminho cru de TODA camada criada; (2) escuta o evento mount de toda app express (sub-app via
// app.use); (3) percorre app.router.stack descendo em route, em handle com stack (Router), em handle que e app
// express (sub-app montado por router.use) e em mounted_app (sub-app montado por app.use, casado pelo evento);
// (4) sonda: Layer.prototype.handleRequest marca no req a ultima camada que tocou; o writeHead publica a chave.
// Uso: node --import tsx c2gen.mts <saida.json> [injecao.mts]   (cwd = raiz do worktree)
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const cwd = process.cwd();
const req = createRequire(cwd + "/package.json");
const expressMain = req.resolve("express");
const reqExpress = createRequire(expressMain);
const layerPath = reqExpress.resolve("router/lib/layer.js");
const L: any = reqExpress(layerPath);
function C2Layer(this: any, p: any, o: any, fn: any) {
  if (!(this instanceof C2Layer)) return new (C2Layer as any)(p, o, fn);
  L.call(this, p, o, fn); this.__c2p = p;
}
C2Layer.prototype = L.prototype;
(req.cache as any)[layerPath].exports = C2Layer;
const mounts: Array<{ sub: any; parent: any; mp: any }> = [];
const origEmit = EventEmitter.prototype.emit;
EventEmitter.prototype.emit = function (this: any, ev: any, ...a: any[]) {
  if (ev === "mount" && this && typeof this.handle === "function" && typeof this.set === "function") mounts.push({ sub: this, parent: a[0], mp: this.mountpath });
  return origEmit.call(this, ev, ...a);
} as any;
const origHR = L.prototype.handleRequest;
L.prototype.handleRequest = function (this: any, rq: any, rs: any, nx: any) { rq.__c2last = this; return origHR.call(this, rq, rs, nx); };
const origHE = L.prototype.handleError;
L.prototype.handleError = function (this: any, e: any, rq: any, rs: any, nx: any) { rq.__c2last = this; return origHE.call(this, e, rq, rs, nx); };
const owner = new Map<any, string>();
const origWH = http.ServerResponse.prototype.writeHead;
http.ServerResponse.prototype.writeHead = function (this: any, ...a: any[]) {
  try { if (!this.headersSent) this.setHeader("x-c2-resp", encodeURIComponent(owner.get(this.req && this.req.__c2last) ?? "?")); } catch {}
  return origWH.apply(this, a as any);
} as any;

const [saidaArq, injecao] = process.argv.slice(2);
const root = pathToFileURL(cwd).href + "/src/";
const { createApp } = await import(root + "app.ts");
const { CoreSaasRegistry } = await import(root + "modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await import(root + "modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await import(root + "modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const ten = core.createTenant({ name: "C2 gen", modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"] });
const gestor = core.createUser({ tenantId: ten.id, name: "G", email: "c2g@example.com", roles: ["manager"] });
const tec = core.createUser({ tenantId: ten.id, name: "T", email: "c2t@example.com", roles: ["field_technician"] });
const mountsAntes = mounts.length;
const app = createApp(new MemoryCoreSaasAdapter(core));
if (injecao) await (await import(pathToFileURL(path.resolve(injecao)).href)).inject(app);

const cont = new Map<string, number>(); const inc = (k: string) => cont.set(k, (cont.get(k) ?? 0) + 1);
const juntar = (a: string, b: string) => { const s = (a + "/" + b).split("/").filter((x) => x.length > 0).join("/"); return "/" + s; };
const rotas: Array<{ m: string; p: string }> = []; const mwCaminho: Array<{ k: string; p: string }> = []; const montagens: string[] = [];
const semCaminho: string[] = [];
const VERB = ["get", "post", "put", "patch", "delete"];
function subappsDe(parent: any) { return mounts.slice(mountsAntes).filter((x) => x.parent === parent); }
const ehApp = (h: any) => typeof h === "function" && typeof h.handle === "function" && typeof h.set === "function";
function percorre(appOuRouter: any, stack: any[], pre: string) {
  const subs = appOuRouter ? subappsDe(appOuRouter) : []; let iSub = 0;
  for (const l of stack) {
    const p = l.__c2p;
    if (l.route) {
      if (typeof p !== "string") { inc("SEM-CAMINHO " + pre); semCaminho.push("ROTA " + pre + " " + JSON.stringify(String(p))); continue; }
      const full = juntar(pre, p);
      const ms = new Set<string>(); for (const m of Object.keys(l.route.methods)) { if (m === "_all") VERB.forEach((v) => ms.add(v)); else ms.add(m); }
      for (const m of ms) { inc("ROTA " + m.toUpperCase() + " " + full); rotas.push({ m: m.toUpperCase(), p: full }); }
      owner.set(l, "ROTA " + full); for (const il of l.route.stack || []) owner.set(il, "ROTA " + full);
      continue;
    }
    if (typeof p !== "string") { inc("SEM-CAMINHO " + pre); semCaminho.push("CAMADA " + pre + " " + String(p)); continue; }
    const mp = juntar(pre, p);
    const h = l.handle;
    if (h && h.name === "mounted_app") {
      const s = subs[iSub++];
      if (!s) { inc("SUBAPP-SEM-PAR " + mp); continue; }
      inc("SUBAPP " + mp); montagens.push(mp); owner.set(l, "SUBAPP " + mp); percorre(s.sub, s.sub.router.stack, mp); continue;
    }
    if (ehApp(h)) { inc("SUBAPP " + mp); montagens.push(mp); owner.set(l, "SUBAPP " + mp); percorre(h, h.router.stack, mp); continue; }
    if (h && Array.isArray(h.stack)) { inc("ROTEADOR " + mp); montagens.push(mp); owner.set(l, "ROTEADOR " + mp); percorre(null, h.stack, mp); continue; }
    const k = "MIDDLEWARE " + mp + " · " + ((h && h.name) || "(anônima)");
    inc(k); owner.set(l, k);
    if (mp !== "/") mwCaminho.push({ k, p: mp });
  }
}
percorre(app, app.router.stack, "");

const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = "http://127.0.0.1:" + (server.address() as any).port;
const PRM = /:([A-Za-z0-9_]+)/g;
async function bate(m: string, p: string, uid: string, role: string) {
  const u = base + p.replace(PRM, () => randomUUID());
  const r = await fetch(u, { method: m, headers: { "content-type": "application/json", "x-tenant-id": ten.id, "x-user-id": uid, "x-role": role }, body: m === "GET" ? undefined : "{}", signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!r) return { s: 0, quem: "sem-resposta" };
  await r.text().catch(() => "");
  return { s: r.status, quem: decodeURIComponent(r.headers.get("x-c2-resp") ?? "") };
}
const sondas: any[] = [];
const alvos: string[] = [...mwCaminho.map((x) => x.p), ...[...new Set(montagens)].map((x) => juntar(x, "__c2_inexistente__/y"))];
for (const p of alvos) for (const v of VERB) for (const role of ["field_technician", "technician"]) {
  const o = await bate(v.toUpperCase(), p, role === "field_technician" ? tec.id : randomUUID(), role);
  sondas.push({ m: v.toUpperCase(), p, role, s: o.s, quem: o.quem });
}
const extra = process.env.C2_SONDA ? process.env.C2_SONDA.split(";") : [];
for (const e of extra) { const [m, p] = e.split(" "); for (const role of ["field_technician", "technician"]) { const o = await bate(m, p, role === "field_technician" ? tec.id : randomUUID(), role); sondas.push({ m, p, role, s: o.s, quem: o.quem, extra: true }); } }
server.close();
const tipo = (pf: string) => [...cont].filter(([k]) => k.startsWith(pf)).reduce((a, [, n]) => a + n, 0);
const resumo = "C2GEN camadas: ROTA " + tipo("ROTA ") + " · ROTEADOR " + tipo("ROTEADOR ") + " · SUBAPP " + tipo("SUBAPP ") + " · MIDDLEWARE " + tipo("MIDDLEWARE ") + " (" + [...cont.keys()].filter((k) => k.startsWith("MIDDLEWARE ")).length + " chaves) · SEM-CAMINHO " + tipo("SEM-CAMINHO ") + " · SUBAPP-SEM-PAR " + tipo("SUBAPP-SEM-PAR ") + " | sondas " + sondas.length + " | sucesso<400 ao campo: " + sondas.filter((x) => x.s > 0 && x.s < 400).length;
fs.writeFileSync(saidaArq, JSON.stringify({ contagem: Object.fromEntries([...cont].sort()), semCaminho, rotas, mwCaminho, sondas }, null, 1));
console.log(resumo);
for (const x of sondas.filter((x) => x.s > 0 && x.s < 400)) console.log("C2GEN SUCESSO " + x.role + " " + x.m + " " + x.p + " -> " + x.s + " por " + x.quem);
for (const x of sondas.filter((x) => x.extra)) console.log("C2GEN EXTRA " + x.role + " " + x.m + " " + x.p + " -> " + x.s + " por " + x.quem);
process.exit(0);
```

### c2lotes.mts (md5 123b2861dde98ea772ca044916bab541)

```ts
// Sonda PROPRIA de lotes da C2. Lotes e tipos vem da LEITURA dos despachantes (arquivo:linha na evidencia), nao do
// extrator do helper. Para cada lote x tipo: ACEITO = a resposta do tenant_admin ao tipo difere da resposta a um tipo
// inexistente; ALCANCADO por um papel de campo = a resposta do papel e IGUAL a do tenant_admin. Igualdade da entrada
// inteira da acao (ids e datas mascarados) + status HTTP + chave do array. Uso: node --import tsx c2lotes.mts <saida.json>
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const LOTES: Record<string, string[]> = {
  "/api/v1/mobile/sync/work-order-actions": ["work_order.create", "work_order.assign", "work_order.mileage", "work_order.status_change"],
  "/api/v1/mobile/sync/checklist-actions": ["checklist.run_create", "checklist_run.create", "checklist.item_answer", "checklist.item_note", "checklist.marker_create", "checklist_marker.create", "checklist.divergence_create", "checklist_divergence.create", "checklist.acknowledgement_create", "checklist_acknowledgement.create", "checklist.attachment_attach", "checklist_attachment.attach", "checklist.complete", "checklist_run.complete"],
  "/api/v1/mobile/sync/inventory-actions": ["inventory.reserve", "inventory.consume", "inventory.shortage_report"],
  "/api/v1/mobile/sync/evidence-actions": ["evidence.work_order_photo", "evidence.work_order_signature", "evidence.work_order_observation", "evidence.field_photo", "evidence.field_signature", "evidence.field_observation"],
  "/api/v1/mobile/sync/expense-actions": ["expense_report.create", "expense_item.create", "expense_report.submit"],
};
const root = pathToFileURL(process.cwd()).href + "/src/";
const { createApp } = await import(root + "app.ts");
const { CoreSaasRegistry } = await import(root + "modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await import(root + "modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await import(root + "modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const ten = core.createTenant({ name: "C2 lotes", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core));
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = "http://127.0.0.1:" + (server.address() as any).port;
const UUIDRE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const DATARE = /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z/g;
async function manda(lote: string, role: string, type: string) {
  const id = randomUUID();
  const corpo = { client_batch_id: randomUUID(), actions: [{ client_action_id: id, clientActionId: id, client_evidence_id: id, type, local_created_at: new Date().toISOString(), payload: { work_order_id: randomUUID(), run_id: randomUUID(), status: "accepted", mileage_start: 7, note: "c2", value: "c2", observation: "c2" } }] };
  const r = await fetch(base + lote, { method: "POST", headers: { "content-type": "application/json", "x-tenant-id": ten.id, "x-user-id": randomUUID(), "x-role": role }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!r) return "sem-resposta";
  const j: any = await r.json().catch(() => ({}));
  const d = (j && j.data) || {};
  for (const k of Object.keys(d)) if (Array.isArray(d[k])) for (const a of d[k]) if (a && JSON.stringify(a).includes(id)) return r.status + "|" + k + "|" + JSON.stringify(a).replace(UUIDRE, "U").replace(DATARE, "D").split(type).join("T");
  return r.status + "|lote|" + JSON.stringify(j).replace(UUIDRE, "U").replace(DATARE, "D").split(type).join("T");
}
const out: any[] = [];
for (const [lote, tipos] of Object.entries(LOTES)) {
  const ref = await manda(lote, "tenant_admin", "__c2_inexistente__");
  for (const t of [...tipos, "__c2_outro_inexistente__"]) {
    const a = await manda(lote, "tenant_admin", t);
    const row: any = { lote, type: t, aceito: a !== ref };
    for (const role of ["field_technician", "technician"]) { const o = await manda(lote, role, t); row[role] = o === a; }
    out.push(row);
  }
}
server.close();
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const ac = out.filter((x) => x.aceito);
console.log("C2LOTES lotes " + Object.keys(LOTES).length + " | tipos lidos " + Object.values(LOTES).flat().length + " | aceitos " + ac.length + " (field_technician " + ac.filter((x) => x.field_technician).length + " · technician " + ac.filter((x) => x.technician).length + ") | inexistente-controle aceito: " + out.filter((x) => x.type.startsWith("__c2") && x.aceito).length);
process.exit(0);
```

### c2txt.cjs (md5 20b44e2f7bfc5e7ff25b51b5e12d4e2c)

```ts
// Terceira fonte (inspetor-de-rotas): inventario TEXTUAL por AST de toda chamada X.<verbo>("<literal>", ...) e
// X.use(...) em src/ (git ls-files), reconciliado com as ROTA do gerador proprio. Uso: node c2txt.cjs <c2gen.json>
const fs = require("fs"); const cp = require("child_process"); const path = require("path");
const ts = require(path.join(process.cwd(), "node_modules", "typescript"));
const arquivos = cp.execFileSync("git", ["ls-files", "src"], { encoding: "utf8" }).split(String.fromCharCode(10)).filter((f) => f.endsWith(".ts"));
const VERBOS = ["get", "post", "put", "patch", "delete", "all"];
const regs = []; const usos = [];
for (const f of arquivos) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.ES2022, true);
  (function v(n) {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const m = n.expression.name.text; const a0 = n.arguments[0];
      const linha = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
      if (VERBOS.includes(m) && a0 && ts.isStringLiteralLike(a0) && a0.text.startsWith("/")) regs.push({ f, linha, m: m.toUpperCase(), p: a0.text, alvo: n.expression.expression.getText() });
      if (m === "use") usos.push({ f, linha, a0: a0 ? a0.getText().slice(0, 60) : "", alvo: n.expression.expression.getText() });
      if (m === "route" && a0 && ts.isStringLiteralLike(a0)) regs.push({ f, linha, m: "ROUTE()", p: a0.text, alvo: n.expression.expression.getText() });
    }
    ts.forEachChild(n, v);
  })(sf);
}
const gen = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const rotasGen = Object.keys(gen.contagem).filter((k) => k.startsWith("ROTA ")).map((k) => { const [, m, p] = k.split(" "); return { m, p, n: gen.contagem[k] }; });
const casa = (r, g) => (r.m === "ALL" ? true : r.m === g.m) && (g.p === r.p || g.p.endsWith(r.p) || (r.p === "/" && true));
const semRota = regs.filter((r) => r.m !== "ROUTE()" && !rotasGen.some((g) => casa(r, g)));
const usadas = new Set(); for (const r of regs) for (const g of rotasGen) if (r.m !== "ROUTE()" && casa(r, g)) usadas.add(g.m + " " + g.p);
const genSemTexto = rotasGen.filter((g) => !usadas.has(g.m + " " + g.p));
console.log("TXT registros de rota (literal com /): " + regs.filter((r) => r.m !== "ROUTE()").length + " · .route(): " + regs.filter((r) => r.m === "ROUTE()").length + " · .use(): " + usos.length + " · arquivos: " + arquivos.length);
console.log("TXT registros textuais sem ROTA no gerador: " + semRota.length); semRota.forEach((r) => console.log("  TXT-SEM-GEN " + r.f + ":" + r.linha + " " + r.alvo + "." + r.m + " " + r.p));
console.log("TXT ROTA do gerador sem registro textual: " + genSemTexto.length); genSemTexto.forEach((g) => console.log("  GEN-SEM-TXT " + g.m + " " + g.p));
```

## Veredito (18:58Z)
- Item 1 VERDE · Item 2 VERMELHO (A1, A2, A3) · Item 3 VERMELHO (CE-G1(b); A1–A3 bloqueia, A4 ajuste) · notas N1–N4.
- Teardown: worktree `C:/Users/AMP/w-ciclo1-07ca-c2` removido por `git worktree remove --force` (ec=0) depois de 0 processos vivos com o caminho; `git worktree list | grep -c w-ciclo1-07ca-c2` = 0; 0 containers `j07ca-c2-*`; 0 `.pristino` e 0 `o6r07c-*` no tmpdir; scratch próprio apagado depois do voto. Resíduo alheio reportado: `w-ciclo1-07ca-c1` aparecia como prunable às 17:19Z (não tocado).
- VOTO: REPROVADO — ver `07ca-C2-voto.json`.
