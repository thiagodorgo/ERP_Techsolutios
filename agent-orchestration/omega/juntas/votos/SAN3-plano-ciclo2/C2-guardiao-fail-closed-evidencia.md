# C2 — guardiao-fail-closed — evidencia (ciclo 2, objeto ecc32712)

Modelo: claude-opus-5. Worktree proprio: C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/j-san3c2-c2 (detached ecc32712).
Toda medicao na ref via `git show ecc32712:<caminho>` ou no worktree detached (sem mutacao). Mutacoes so em copia no scratchpad.

## E0 — terreno
- `git worktree add --detach .../j-san3c2-c2 ecc32712` → HEAD ecc32712b626d836c661dfd28b2172fb75a1d475; `status --porcelain` = 0 linhas.
- Insumos lidos NA REF: briefing @03e4977a (inteiro), parecer do inspetor (scratchpad), plano v5 `docs/revisoes/SAN3/PLANO_SAN3.md` @ecc32712 (592 l.), plano de correção, relatório do aplicador, voto+evidência C2 do ciclo 1.
- Registro/menu/serviço/catálogo/app.ts extraídos por `git show ecc32712:<caminho>` para `scratchpad/c2g/` (cópia de leitura, fora do repo).

## E1 — item 16: a contagem 38 (script `c2g/count.mjs`, carrega o NAVIGATION_REGISTRY real sem tsc e o MVP_NAV_PATHS real)
- Saída: registro 36 entradas (0 filhos) · MVP_NAV_PATHS 51 · MVP − registro = **27** · 27 ∩ {/patios,/telemetria sem módulo} = ∅ → 27 + 11 = 38 é aritmética correta.
- MAS: registro SEM `requiredModules` = **17**, não 11: 4 `platformOnly` (/platform/*) + **13** de organização, todas no MVP: as 11 de /patios e /telemetria **e** `/controle/notificacoes` e `/operations/quotes` (tenantOnly, sem módulo, liberadas pelo mesmo `hasModule` de `navigation.service.ts:114-115`).
- O plano (item 16 e linha do B-SAN3-18) diz "as 11 entradas registradas sem `requiredModules`" — o método que produziu 11 filtrou por NOME (/patios, /telemetria), não pela PROPRIEDADE (sem módulo). Pela definição do próprio item ("itens do menu fora do gate de módulo") o total é 27 + 13 = **40**.
- Veredito parcial: 38 NÃO confere pela definição do item; o guard fail-closed (se implementado como escrito) acusaria as 2 que faltam — o erro de contagem é absorvido pelo mecanismo, não abre buraco. Candidato a achado `ajuste`.

## E2 — decisão de módulo em runtime (código em ecc32712)
- `navigation.routes.ts:83-95` `resolveEnabledModules`: sem tenantId → `undefined`; `catch { return undefined; }`.
- `navigation.service.ts:37-38` `filterNavigationByTenantModules`: `if (!enabledModules) return items.map(sanitize)` → lista de módulos não resolvida = **nenhum filtro de módulo** (catch → libera tudo).
- `mobile.routes.ts:417-419` tem um SEGUNDO `hasModule(modules, key) = modules.includes(key)` (semântica diferente: estrita).
- Chaves de módulo: catálogo `platform-modules.service.ts:3-23` = 19 chaves; registro usa 12 chaves, 4 fora do catálogo (`checklists`, `work_orders`, `work-orders`, `logistics`); demo na migração `20260722000000_add_tenant_modules` l.19-22 e seed com listas próprias; coluna `tenants.modules TEXT[] DEFAULT '{}'` sem validação contra o catálogo.

## E3 — a enumeração que o B-SAN3-18 existe para fechar: ROTAS do backend por módulo (script `c2g/endpoints2.mjs`)
- Routers extraídos por `git show ecc32712:` (71 arquivos `*.routes.ts`); endpoints literais `router.<verbo>("...")` = **407**; pares método+caminho mapeados por `relatedEndpoints` do registro = **89** (em 24 de 36 entradas).
- Pátios (yard, impound, auction, release, jurisdiction, charging, patios-dashboard, vehicle-identities, authority-credential, tariffs, price-tables): **82** endpoints, **35 sem mapeamento** no registro (ex.: `POST /api/v1/impound-processes`, `POST .../transitions`, `POST .../charges`, `POST .../auction/settlement`, `GET /api/v1/patios/dashboard/summary`, todo `/tariffs`, todo `/vehicle-identities`).
- Frota (vehicles, fuel-logs, maintenance-orders, fines, insurance-policies, damages, professional-statements): **38** endpoints, **38 sem mapeamento** (nenhuma entrada /fleet no registro).
- Telemetria: 5 endpoints, 5 mapeados.
- `app.ts:114-247`: TODOS os routers de domínio montados em `"/api/v1"` (mesmo prefixo) — "recusa no ponto de montagem" só funciona com um mapa caminho→módulo; o plano cita "12 routers" (única ocorrência: PLANO_SAN3.md:256) sem enumerá-los.
- Veredito parcial: o guard do plano lê só registro + menu; a enumeração rota→módulo (onde a recusa acontece) não tem autoridade escrita nem guard.

## E4 — censo de vias do B-O6R-07c (itens 11 e 51), medido em ecc32712
- Regra de saída (PLANO_SAN3.md:251): "via achada fora da fronteira no censo vira pendência nomeada com dono, e o `Ω6R-SEC-002` só fecha quando **todas** as vias do censo tiverem dono"; censo = "da superfície de sync".
- Teste de encerramento (mesma linha): "403 `not_assigned_to_actor` nas 10 vias (**piso: 1, 2 e 10**)" + item 51 "ao responder, concluir e dar ciência". `git grep piso`: ausente no PLANO_O6R@15ef3fbe; presente no PLANO_SAN3 desde a143d2c3 → texto DESTE PR.
- As 10 vias (pendencias.md:6574-6640 @ref): 1-2 anexos, 3-7 comentários (router de comentários), 8-9 geocode, 10 mileage no sync. O piso cobre 3 das 10.
- Vistoria (checklist.routes.ts @ref): rotas mutantes de run com a permissão que o técnico porta (catalog.ts:939-942): PATCH `/mobile/checklist-runs/:runId` (updateRuns), POST `.../attachments` (updateRuns), POST `.../markers` (updateRuns), POST `.../divergence` (updateRuns), POST `.../complete` (completeRuns), POST `.../acknowledgement` (acknowledgeRuns). O teste do item 51 nomeia 3 ações (responder, concluir, ciência); attachments/markers/divergence (mesma permissão de "responder") ficam fora do teste.
- Fronteira × vias medidas: vistoria → `checklist.routes.ts` + `checklist.service.ts` (SIM); checklist sync → `mobile-checklist-sync.ts` (SIM); evidência → `mobile-evidence-sync.ts` (SIM); `mobile-evidence-upload.ts` fora da fronteira, mas exige recibo de metadado do MESMO ator (`findMobileEvidenceSyncReceiptForUpload(actor, …)`, l.~104) e amarra ao `workOrderId` do recibo → herda o escopo do sync (não é via independente); km → `mobile-work-order-sync.ts` (SIM) e PATCH mileage-correct exige `mileageCorrect` (técnico não porta).
- Veredito parcial: fronteira alcança as vias medidas; regra de saída nega o esquecimento de DONO, mas "dono" ≠ "fechado"; o teste de encerramento não cobre toda a enumeração conhecida (piso 3/10; 3/6 rotas de run).

## E5 — itens 52 e 53 (conferência no servidor)
- 52: único escritor de `fieldOperatorLocation` = `field-location-prisma.repository.ts:19` ← `field-location.service.ts:21-38 recordMobileLocation` ← `POST` em `field-location.routes.ts:31-35` (`field_location:send`: technician, operator, field_technician). Sem checagem de consentimento. A telemetria (`telemetry.service.ts`) exige perfil (`operator_profile_required` 422) e rejeita GPS sem `trackingConsent`. Teste do plano ("sem consentimento → recusado e nada gravado; com → gravado") é VERMELHO no head-base (= controle desligado) — discrimina.
- 53: o diálogo gateia `enRoute → arrived` (`work_order_detail_screen.dart` `_openArrivalDialog` → `_doStatus(WorkOrderStatus.arrived)` → `repo.updateStatus`); no servidor o check-in é a transição de status, com ≥2 entradas: sync `work_order.status` (`mobile-work-order-sync.ts:265 service.changeStatus`) e web `PATCH /work-orders/:id/status` (`work-order.routes.ts:135-137`, `work_orders:status`, que o técnico porta). WorkOrder não tem coluna de placa: `vehicle_id String?` (schema.prisma:2347) + campos dinâmicos (l.2334) → OS pode não ter placa/série.

## E6 — MUTAÇÃO do desenho do guard do B-SAN3-18 (script `c2g/guard-san3-18.mjs`, cópia fora do repo; nada no worktree do PR)
Guard implementado LITERALMENTE como PLANO_SAN3.md:256 o escreve (G1: entrada tem `requiredModules` OU está na lista fechada de núcleo; G2: todo caminho do menu está no registro), contra o registro e o menu REAIS de ecc32712. Núcleo = literal independente do registro (6 caminhos).
```
S0 head-base real, CORE vazio                              → VERMELHO  (G1 17 | G2 27)
S0' head-base real, CORE literal (6)                       → VERMELHO  (G1 11 | G2 27)
S1 depois do bloco (simulado), CORE literal                → VERDE
M1 entrada nova SEM requiredModules (fora do núcleo)       → VERMELHO  (G1 1 /patios/relatorio-novo)
M1b entrada nova com requiredModules: []                   → VERMELHO  (G1 1 /frota/novo)
M1c entrada nova com chave fora do catálogo ('patio')      → VERDE     (runtime: hasModule falso p/ todos → escondido = lado negado)
M2 caminho novo no MVP_NAV_PATHS fora do registro          → VERMELHO  (G2 1 /novo-menu)
M3 M1 com núcleo DERIVADO do registro (sonda tautologia)   → VERDE
M4 endpoint novo POST /impound-processes/:p/export         → VERDE     (nenhum relatedEndpoints o associa a módulo)
M4b router NOVO montado em app.ts                          → VERDE
```
- Veredito parcial: para a enumeração do REGISTRO o guard é fail-closed (M1/M1b/M2 vermelhos) — a correção do C2-02 do ciclo 1 funciona NO QUE PROMETE para o registro. Para a enumeração que decide o acesso no BACKEND (rota → módulo), o guard não pode falhar: M4/M4b verdes por construção (as rotas não são entrada do guard). A propriedade depende ainda de o núcleo ser literal (M3) — "lista fechada" o implica, sem fixar onde vive.

## E7 — runtime REAL do filtro de módulo (script `c2g/m5-runtime.cjs`: `navigation.service.ts@ecc32712` transpilado com typescript 5.9.3 da árvore principal, SOMENTE leitura; registro com as 11 entradas já COM chave, como o bloco promete)
```
org com modules = ['dashboard']   → itens Pátios/Telemetria no menu: 0
org com modules = []              → 0
org com modules = ['patios']      → 6
modules NAO RESOLVIDOS (undefined)→ 11
getMenuForCurrentUser(tenant, permissões de Pátios, enabledModules undefined) → 11
```
- `undefined` é exatamente o que `resolveEnabledModules` devolve no `catch` (`navigation.routes.ts:94-95`). Origem: `84ca113c` 2026-06-09 (`git log -S "catch {"` e `-S "if (!enabledModules)"`). Mesmo depois das chaves, lista não resolvida = tudo liberado no ponto de decisão que o bloco estende (`navigation.service.ts` está na fronteira); o teste do bloco não cobre o caso.

## E8 — checagens simples re-executadas no MEU worktree (ecc32712)
- `node scripts/sync-agent-agents.mjs --check` → `[agents-sync] OK — 25 agentes, espelho consistente.` ec=0
- `node scripts/kpi-freeze.mjs --check` → `em dia (snapshot 2026-09-11)` ec=0 · `node --check Kpis/app.js` ec=0 · porcelain após = 0.
- Os 3 guards de KPI (tsx) e `npm run check` NÃO rodei (sem `npm ci`; fora do mandato C2 — são da C3). Nenhum número deles é afirmado neste voto.

## E9 — MUTAÇÃO do desenho do fechamento do B-O6R-07c (script `c2g/census-07c.mjs`, sobre as rotas REAIS de ecc32712)
Rotas dos 3 routers da fronteira (work-order, work-order-comment, checklist), permissões resolvidas pelas constantes da ref, cruzadas com as 42 permissões do `field_technician` (catalog.ts:895-943). 07a guarda `service.update` (:842/852) e `changeStatus` (:1319).
```
rotas nos 3 routers: 49 | mutantes: 31 | mutantes que o técnico alcança: 17
  PATCH /work-orders/:workOrderId, PATCH .../status                      → guardadas pelo 07a
  POST/DELETE .../attachments                                            → no piso do teste
  PATCH /mobile/checklist-runs/:runId, POST .../complete, .../acknowledgement → no teste do item 51
  POST .../geocode, .../geocode-destination                              → FORA do teste
  POST/PATCH/DELETE .../comments, POST/DELETE .../comments/:id/tags/:tagId (5) → FORA do teste
  POST /mobile/checklist-runs/:runId/attachments | /markers | /divergence (checklist_runs:update) → FORA do teste
rotas alcançáveis fora do 07a e fora do piso: 10
```
- Predicado de fechamento do plano = (toda via do censo de SYNC tem dono) ∧ (teste do piso verde) → VERDADEIRO com as 10 rotas sem escopo por objeto. Na leitura mais generosa do "piso" (as 10 vias testadas; piso só para o vermelho-controle), restam 3 rotas de vistoria de OS alheia (anexar, marcar avaria, registrar divergência — o catálogo agrupa "responder/marcar avaria/anexar" em `update`, catalog.ts:936) fora de qualquer teste.
- A pendência que o bloco fecha já registrou a lição (pendencias.md:6655-6659 @ref): "um censo por enumeração acha o que o autor lembrou de enumerar … O `07c` que repita o método, não a lista." O plano fecha por censo (enumeração) + piso da lista + dono.
- Veredito parcial: regra de saída nega o esquecimento de DONO; não nega a via que o censo não lista nem a via com dono sem escopo. Exaustividade alegada ("todas as vias") sem verificação executável.

## E10 — conferências finais
- `ci.yml@ecc32712` ~l.169: "Provision database (seed)" → `npm run db:seed` (sem provisionamento de chave de módulo) — base da CI recebe só `DEMO_TENANT_MODULES` (`prisma/seed.ts:196-207`).
- Datação: `git diff a143d2c3 ecc32712 -- PLANO_SAN3.md` → o "**38** ... 11 entradas" do item 16 (+77) e a linha do B-SAN3-18 (+187) são da v5.
- Terreno re-medido: `san3` HEAD 03e4977a, porcelain 23 (o fantasma do R7, intocado); árvore principal d1fab3bc; worktree da C1 (`j-san3c2-c1`) presente e não tocado.

## Veredito: REPROVADO
- bloqueia · dentro-do-bloco: **C2c2-01** (gate de módulo do backend sem enumeração fechada — M4/M4b verdes) e **C2c2-03** (SEC-002/item 51 fecham por dono + piso: 10 rotas alcançáveis fora do teste).
- ajuste: C2c2-02 (38 → 40), C2c2-04 (seed fora da fronteira do 18), C2c2-05 (pré-existente, 84ca113c 2026-06-09 — pendência nomeada), C2c2-07 (check-in: 2 entradas, OS sem placa).
- nota: C2c2-06 (item 52), C2c2-08 (núcleo literal).
- O que ficou provado A FAVOR: o guard do REGISTRO é fail-closed por mutação (M1/M1b/M2 vermelhos); o teste do item 52 discrimina; a fronteira do 07c alcança as vias medidas.
- Não executei: login/HTTP real por papel (Docker parado, R2 — nenhum item do mandato dependeu disso: tudo acima é desenho do plano medido contra o código da ref); os 3 guards de KPI e `npm run check` (mandato da C3).

## Limpeza (feita e re-medida)
- `git -C .../san3 worktree remove --force .../j-san3c2-c2` → ec=0; `git worktree list` → principal d1fab3bc, gov-descuido, gov-elenco 15ef3fbe [main], j-san3c2-c1 (da C1, intocado), san3 03e4977a — sem j-san3c2-c2; o diretório não existe mais.
- `scratchpad/c2g/` (cópias por `git show` e cópias mutadas `routes-mut-impound.routes.ts`, `app-mut.ts`, `m5-*.cjs`) apagado; os 7 scripts ficaram em `votos-SAN3-c2/C2-apoio/` com `LEIA-ME.txt` (as entradas saem de novo por `git show ecc32712:`). Os caminhos `c2g/*.mjs` citados acima são os mesmos scripts, agora em `C2-apoio/`.
- Nada escrito em `san3`, `gov-elenco`, `j-san3c2-c1` nem na árvore principal. Nenhum banco nem container.
- Anomalia de terreno anotada (sem efeito no mérito, não varrida): `.claude/worktrees/insp-npm-ci.log` solto (alheio; nome sugere o inspetor) e `.claude/worktrees/san2-r` vazio (R7).
- 1ª tentativa de gravar o voto JSON falhou por aspas no shell (o arquivo ficou no esqueleto por alguns segundos); regravado e validado por `JSON.parse`.
