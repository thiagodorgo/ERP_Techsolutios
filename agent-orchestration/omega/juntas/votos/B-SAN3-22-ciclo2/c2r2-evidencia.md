papel: cadeira C2 (c2r2, REFEITA, sucessora P3) | identidade: jurado-san322-c2-r2-opus | executor: subagente genérico Claude Code | corpo: jurado-san322-c2-contrato-classificador-consumidores | modelo: Claude Opus 5.5 (nível menor DECLARADO, §C7.6; substituição: nenhuma — sucede jurado-san322-c2-r2-sol, caído 02:00Z por limite do Codex) | objeto: 6b03e44d8136792398f521ccaf85d8dd45168a6d | mandato_md5: 574264f83505bd4b43c96b474f020b76 | corpo carregado × blob do objeto: IDENTICO (EOL-neutro)

# Evidência — C2 refeita (sucessora) — B-SAN3-22, ciclo 2

## Terreno e legalidade

- `origin/main` no início: `c9a2d036c1aaff21df92817525d7f9c92cbbe272` (após `git fetch`). `$SCRATCH` = `C:/Users/AMP/erp-pausa-2026-10-03/j22r2-c2/` (a pasta do caído, reaproveitada; as cópias conferidas abaixo). `node -v` = v20.19.5. Variáveis: `OBJ`, `WT`, `S`, `REDIS_URL`.
- Comando → `git show 6b03e44d…:.claude/agents/especialistas/jurado-san322-c2-contrato-classificador-consumidores.md` > scratchpad; `diff <(tr -d '\r' < blob) <(tr -d '\r' < w-san322/.claude/…)`; `tr -d '\r' < cadeira-c2r2.md | md5sum`. Saída → `IDENTICO`; md5 `574264f83505bd4b43c96b474f020b76` (igual ao do caído).
- Comando → `git ls-remote origin refs/heads/fix/checklist-trava-versao`; `gh pr view 464 --json headRefOid,state`. Saída → ambos `6b03e44d8136792398f521ccaf85d8dd45168a6d`, OPEN.
- Legalidade: `insp-san322c2-parecer.md` (`inspetor-san322-c2`, Opus) **LIBERADO COM RESSALVA**, 6 ressalvas lidas; a C2 consta para Claude Opus ou Codex Sol, worktree `j22r2-c2-wt`. Ressalva 1 cumprida abaixo (diff das cópias). Identidade `jurado-san322-c2-r2-opus` não coincide com nenhum dos 21 inelegíveis do mandato nem com as outras cadeiras.
- Recursos (02:05Z): disco C: livre 8,7 GB (≥ 7 GB; esta cadeira não instala nada novo: worktree e `node_modules` do caído reaproveitados); memória de commit livre 8,43 GB (≥ 4 GB); trabalhos Docker fora de `erp-*`: 1 (`j22r2-c1`) + o meu = 2 (teto).
- Worktree: `C:/Users/AMP/j22r2-c2-wt` (do caído), `git rev-parse HEAD` = objeto; `git status --porcelain` = 0 linhas; `node_modules` com `LinkType` vazio (não é junction; 222 entradas; sem `frontend/node_modules`).
- Redis próprio: `j22r2-c2o-redis` (`redis:7-alpine`) só em `127.0.0.1:48032` (porta fora das faixas excluídas, sem escuta antes; o container do caído já removido); `PONG`. Base viva `erp-*` (5432/6379) e as portas 3000/5173/5050/8899/55432/56379 não tocadas.

### Ressalva 1 — diff das cópias conferido (re-execução do comando do caído)

Comando → `for f in ce13.sh ce13b.sh drill.sh silent.sh zz-j22c2-rest.test.ts contrato.mjs mut.mjs; do diff j22-c2/$f j22r2-c2/$f; done`.

Saída → idêntica à publicada pelo caído: nos 4 roteiros `cd C:/Users/AMP/j22-c2-wt` → `cd C:/Users/AMP/j22r2-c2-wt`, `S=…/j22-c2` → `S=…/j22r2-c2`, `OBJ=44d9cbb3…` → `OBJ=6b03e44d8136792398f521ccaf85d8dd45168a6d`, `REDIS_URL=…:47932` → `…:48032`; `ce13b.sh` sem o bloco que criava/apagava `tests/zz-j22c2-forma.test.ts`; sonda REST com `OUT` em `j22r2-c2/` e mais 6 linhas (id inexistente, rascunho sem viva, inativo sem viva); `contrato.mjs` e `mut.mjs` sem diferença. Reuso a porta 48032 com o MEU container, logo nenhum valor fixo aponta para o objeto do ciclo 1, para o worktree antigo ou para a porta antiga. Nenhum script original roda no lugar.

Veredito parcial → **TERRENO E LEGALIDADE VERDES**.

## Item 1 — C2-01 → E4-01 e E4-10 — FECHADO (re-execução P3 + cauda)

1. Comando → `cd j22r2-c2-wt; REDIS_URL=redis://127.0.0.1:48032 timeout -k 15 600 node --test --import tsx tests/checklist-template-lock.test.ts tests/checklist-routes.test.ts` ×3 (TAP em `$S/o-i1-run{1,2,3}.tap`). Saída → `run1/2/3 ec=0 # tests 29 # pass 29 # fail 0 # skipped 0`; `ok 19 - CE-10c`, `ok 23 - CE-10a/10b/10c (REST)`, `ok 24 - E3-20 (REST): arquivado → 404 nas 5 portas`. **Compara:** igual ao caído (29/29 ×3). Parcial → verde.
2. Comando → sonda REST `$S/zz-j22c2-rest.test.ts` (md5 `72270f2cab7bede957f9a803814889e1`, lida inteira: só HTTP no app em memória, `createApp` + core em memória) copiada para `tests/`, `J22C2_OUT=$S/o-i1-rest.tsv REDIS_URL=… node --test --import tsx tests/zz-j22c2-rest.test.ts`, apagada (`status --porcelain` = 0). Saída → `ec=0 1/1`; linhas (porta · status · code · reason):
   ```text
   E3-20 arquivado: GET detalhe              404 CHECKLIST_NOT_FOUND checklist_not_found
   E3-20 arquivado: PATCH (token antigo)     404 CHECKLIST_NOT_FOUND checklist_not_found
   E3-20 arquivado: DELETE (token antigo)    404 CHECKLIST_NOT_FOUND checklist_not_found
   E3-20 arquivado: publish (token antigo)   404 CHECKLIST_NOT_FOUND checklist_not_found
   E3-20 arquivado: createRun                404 CHECKLIST_NOT_FOUND checklist_not_found
   E3-20 arquivado: render sem viva          404 CHECKLIST_NOT_FOUND checklist_not_found
   render do arquivado COM viva              200 - -   (chaves=obs,fotos,nota)
   CE-12 PATCH/publish/DELETE/GET outra org  404 CHECKLIST_NOT_FOUND checklist_not_found (×4; nome em B intacto, GET em B=200)
   id inexistente: GET detalhe               404 CHECKLIST_NOT_FOUND checklist_not_found
   rascunho sem viva: render                 409 CHECKLIST_NOT_PUBLISHED checklist_not_published
   inativo sem viva: render                  409 CHECKLIST_NOT_PUBLISHED checklist_not_published
   ```
   **Compara:** `diff` do meu TSV com o `i1-rest.tsv` do caído, ids normalizados → **IGUAL**. Parcial → verde.
3. Comando → `bash $S/o-i1-mut.sh` (meu roteiro; `mut.mjs` âncora=1, CRLF=true, numstat 1/1 em cada; restauro por `git checkout $OBJ -- <f>` + `hash-object` = blob, `status` vazio). Saída:
   - M1 (E4-01) ramo do 404 neutralizado `if (false && template.status === "archived" && !servesActiveRun)` → `not ok 24 - E3-20 (REST)`, `expected: 404 · actual: 409`.
   - M2 (E4-01) `renderChecklist` com `getTemplate` (que filtra `archived`) no lugar de `getTemplateForRun` → `not ok 19 - CE-10c` e `not ok 23 - CE-10a/10b/10c (REST)`, `expected: 200 · actual: 404`.
   - M3 (re-execução da mutação própria do caído) `countActiveRunsForTemplate` só `in_progress`, esquecendo `pending_acknowledgement` → `not ok 21 - CE-7a/7b/7c/7d/8a/8b (REST)`, `expected: 409 · actual: 200`. **Compara:** igual ao caído (ele leu pelo `CE-7a`).
   - M4 (MINHA, dentro do corpo do `renderChecklist`) `servesActiveRun` só para `inactive` (arquivado nunca serve a viva) → `not ok 19 CE-10c`, `not ok 23 CE-10a/10b/10c (REST)`, `not ok 24 E3-20 (REST)`, `expected: 200 · actual: 404` (26/29).
   Parcial → as 4 mutações vermelhas pela asserção do caso indicado; verde.
4. Comando → `node $S/contrato-r2.mjs <wt> $S/o-i1-rest.tsv` e `… --sem-arquivado` (script do caído, lido inteiro: extrai a seção `#### 3.6.2` até o próximo cabeçalho, 5 fatos do contrato × 5 fatos do TSV, nos dois sentidos). Saída → objeto: `contrato_fatos=5 runtime_fatos=5 · dito_e_nao_feito=0 · feito_e_nao_dito=0 · ec=0`; mutação E4-10 (linha do arquivado tirada da seção): `feito_e_nao_dito=2:arquivado_404_seis_portas,arquivado_render_viva_200 · ec=1`. **Compara:** igual ao caído. Parcial → verde.
5. Vermelho-controle `<objeto>~8` → `git checkout $OBJ~8 -- src/modules/checklists/checklist.service.ts` (o checkout escreve índice e disco, logo `git diff --numstat` sem `--cached` sai vazio; o efeito abaixo prova a troca), sonda + `--test-name-pattern='E3-20'`. Saída → `E3-20 arquivado: render sem viva 409 CHECKLIST_NOT_PUBLISHED checklist_not_published`; render COM viva 200; `not ok 9 - E3-20 (REST)`, `expected: 404 · actual: 409`. Restauro: `hash-object` = blob, `status` = ''. **Compara:** igual ao caído.

Veredito parcial → **VERDE**. C2-01 fechado por execução; E4-10 sem divergência nos dois sentidos; a classe do ciclo 1 não se repetiu.

## Item 2 — C2-06/07 → E4-02; C2-08/09 → E4-03 — FECHADO (re-execução P3 + cauda)

1. Comando → `bash $S/ce13.sh` e `bash $S/ce13b.sh` (as cópias do caído, diff publicado no terreno; restauro `git checkout $OBJ -- tests` + `hash-object`). Saída → CE-13 no objeto `ec=0 · pass 1 · fail 0 · skipped 13`, TAP imprime `URL em variável: 8 declarações / 35 sítios mutantes`. Mutações (âncora=1, CRLF, numstat 1/1, ou 0/1 no `updateTemplate` que só remove a linha do token), todas `ec=1`, nomeando o sítio:
   ```text
   marcador tirado, DELETE por variável    → checklist-template-lock.test.ts:316 DELETE sem expectedUpdatedAt (URL em variável url)
   marcador tirado, PATCH por variável     → checklist-template-lock.test.ts:122 PATCH sem expectedUpdatedAt (URL em variável url)
   marcador tirado, publish por variável   → checklist-template-lock.test.ts:423 POST /publish sem expectedUpdatedAt (URL em variável url)
   token tirado, URL concatenada           → helpers/o6r07c-census.ts:90 POST /publish sem expectedUpdatedAt (URL concatenada)
   token tirado, URL literal/template      → checklist-snapshot-dispatch.test.ts:42 PATCH sem expectedUpdatedAt
   token tirado, updateTemplate direto     → checklist-run-lifecycle-db.test.ts:384 updateTemplate direto sem expectedUpdatedAt
   components sem componentKey             → checklist-template-lock.test.ts:249 PATCH com components sem componentKey
   ```
   Todos restaurados `=blob`, `status=''`. **Compara:** igual ao caído, sítio por sítio. Parcial → verde.
2. Comando → `node $S/ce13-count-r2.mjs <wt>/tests` e sobre `git archive <objeto>~8 tests` extraído em `$S/o-base8`; e localização das declarações por `awk` (linha × título do `test(`). Saída → objeto `decl=8 sites=35`; `<objeto>~8` `decl=6 sites=26`. As 2 declarações a mais estão nas l.368 e l.381, ambas dentro do caso novo `E3-20 (REST)` deste ciclo. **D-C2-3** (6/26 → 8/35) é crescimento pelos casos acrescentados, não divergência da propriedade. **Compara:** igual ao caído. Parcial → verde.
3. Comando → `bash $S/o-silent.sh` (cópia minha do `silent.sh`; diff publicado: só o prefixo `o-` dos TAPs e a âncora do U2 trocada por `'body: { expectedUpdatedAt: create.body.data.updatedAt },'`, âncora=1, porque o `assert.equal(publish.status, 200…)` do objeto quebrou a âncora de 5 linhas; é o mesmo sítio que o caído "reaplicou por contexto"). Saída, token defasado `"2000-01-01T00:00:00.000Z"`, um sítio por vez:
   ```text
   U1 routes PATCH inativar (l.925)      ec=1 · not ok 15 "modelo INATIVADO…" · expected 200 · actual 409
   U2 routes publish do helper (l.1018)  ec=1 · 13/15 · not ok 2 e 3 · expected 200 · actual 409 (×2)
   U3 snapshot PATCH (l.42)              ec=1 · not ok 2 "[imutável pós-edição]" · expected 200 · actual 409
   U4 snapshot publish (l.43–44)         ec=1 · not ok 2 "[imutável pós-edição]" · expected 200 · actual 409
   U5 census publish (l.90)              ec=1 · 2/16 · "semente: publish falhou (409:CHECKLIST_TEMPLATE_STALE:template_changed_since_read)" ×28
   controle E3b-12 snapshot l.78         ec=1 · not ok 5 "[reassign mantém o original]"
   ```
   Cinco vermelhos VISÍVEIS, nenhum silencioso; todos restaurados `=blob`, `status=''`. **Compara:** igual ao caído. Parcial → verde.
4. Comando → `bash $S/o-i2-iv.sh` (meu: regra (iv), D-C2-8, residual e formas próprias, com o CE-13 REAL do objeto; sondas `tests/zz-j22r2-c2o-forma.test.ts`, criadas, rodadas e apagadas, md5 no log `$S/o-i2-iv.log`). Saída:
   - `const republished = await req(` → `await req(` → `checklist-snapshot-dispatch.test.ts:44 POST /publish com resultado descartado`.
   - `const publicado = await chamar(` → `await chamar(` → `helpers/o6r07c-census.ts:90 POST /publish com resultado descartado (URL concatenada)`.
   - caso meu `await api.requestJson(baseUrl, \`…/${id}\`, {PATCH…token})` → `zz…:3 PATCH com resultado descartado`. Por `node -e`: `^\s*await\s+[\w.]+\(` casa a linha e a letra `^\s*await\s+\w+\(` não. **D-C2-8** é superconjunto da letra e alcança o helper pontuado; aceita.
   - caso meu, forma prometida (iii) com helper pontuado: `const alvo = \`…\`; await api.requestJson(baseUrl, alvo, {DELETE})` → `zz…:4 DELETE sem expectedUpdatedAt (URL em variável alvo)` (9/36).
   - caso meu, `let` reatribuída: `let alvo=…; alvo=…; requestJson(baseUrl, alvo, {PATCH sem token})` → `zz…:5 PATCH sem expectedUpdatedAt (URL em variável alvo)`.
   - residual (re-execução do caso do caído): URL passada como PARÂMETRO de helper, sem token → **verde** (8/35).
   - residual (meu): chamada que quebra a linha antes da URL, com resultado descartado → **verde**.
   Os dois verdes são formas que o comentário do guard declara FORA (l.673–675: "URL passada como PARÂMETRO de helper… a regra (iv) só lê a linha da chamada (chamada que quebra linha antes da URL escapa dela)"), e `P-FRONT-TESTE-DE-INTERACAO` cita o residual do CE-13 ("não alcança URL passada como parâm…"). Não é furo novo em forma prometida. Parcial → verde.
5. Comando → `$S/o-guard-runner.ts` (meu: o trecho do guard do objeto extraído por parse, de `function listFiles(` ao fim de `checklistTokenCallSiteViolations`, 142 linhas, md5 `1e0a47649a3291749020e419f75e1775`), rodado com `node --import tsx` sobre os `tests` do objeto (controle do runner: `declaracoes=8 sitios=35 violacoes=0`, igual ao CE-13) e sobre `git -c core.autocrlf=false archive <objeto>~21 tests` extraído em `$S/o-base21` (344 arquivos). Saída → `violacoes=35`, únicas 35: **30 `sem expectedUpdatedAt` + 5 `com resultado descartado` + 0 `sem componentKey`**, em 14 arquivos (routes 11, snapshot 7, mobile-backend-contracts 3, census 2, routes-db 2, template-prisma-db 2, e 1 em cada um de attachments, run-lifecycle-db, field-dispatch-multi-checklist, mobile-checklists-available, o6r07b-mime-sniff-routes, o6r07c-b-scope, legacy-key-fallback, sticky). N ≥ 30. **Compara:** igual ao caído (35 = 30 + 5). Parcial → verde.
6. Vermelho-controle `<objeto>~8` → (a) `git checkout $OBJ~8 -- tests/checklist-template-lock.test.ts` + marcador do DELETE por variável tirado (âncora=1, numstat 1/1) → CE-13 **VERDE** `pass 1 · fail 0` (a classe que a E4-02 fecha); (b) `git checkout $OBJ~8 -- tests/checklist-snapshot-dispatch.test.ts` + token defasado no publish → `[imutável pós-edição]` **VERDE** `pass 1 · fail 0` (a classe que a E4-03 fecha). Ambos restaurados `=blob`, `status=''`. **Compara:** igual ao caído.

Veredito parcial → **VERDE**. C2-06/07/08/09 fechados por execução; nenhuma falha silenciosa nos 5 sítios; as classes "guarda que reconhece forma" e "sítio sem status afirmado" NÃO se repetiram em forma prometida; os residuais estão declarados no guard e na pendência com dono.

## Item 3 — regressão C2, E4-07, CE-33, escopo e E4-11 — FECHADO (re-execução P3 + julgamento próprio do C2R2-01)

1. Comando → `REDIS_URL=… node --test --import tsx tests/checklist-template-change.test.ts tests/checklist-editor-classifier-parity.test.ts` ×3 (`$S/o-i3-class-{1,2,3}.tap`) e o classificador isolado. Saída → `51/51` nas 3 rodadas (fail 0, skipped 0); classificador isolado `33/33`; CE-37 com 18 `ok` (publicado, legado e do editor × sem mudança/rótulo/nome+seção/reordenar/mover seção; seção vazia do meio; ajuda ausente×vazia; obrigatório desligado) e E3b-01(a)(c)(d) `ok`. **Compara:** igual ao caído (51/51 ×3; 33/33). Parcial → verde.
2. Comando → E4-07: `mut.mjs src/modules/checklists/checklist.template-change.ts '/^schema\.sections(?:\..*)?$/' '/^schema\.sections(?:\..*)?/'` (âncora=1, CRLF, numstat 1/1), teste do classificador do objeto; depois `git checkout $OBJ~8 -- tests/checklist-template-change.test.ts` com o MESMO mutante. Saída → objeto: `31/33`, `not ok 25 - CE-18: schema.sectionsX …` e `not ok 26 - CE-18: schema.sections2 …`, ambos `expected: 'field' · actual: 'text'`; teste de `<objeto>~8` + mutante: **verde `31/31`** (a classe que a E4-07 fecha). Código e teste restaurados `=blob`, `status=''`. **Compara:** igual ao caído. Parcial → verde.
3. Regressão do ciclo 1 com N igual: CE-18/CE-37/E3b-01/`TEXT_PATHS` = 51/51 ×3 (acima); REST da trava = 29/29 ×3 (Item 1). `TEXT_PATHS` e o classificador: `git diff --name-only <objeto>~8 <objeto> -- src/modules/checklists/checklist.template-change.ts` = 0. **D-W1** re-medida por execução: o caso `ok 6 - CE-37: salvar SEM alteração um modelo legado…` afirma `kind = "text"` e `paths = ["schema.sections","schema.source"]` (`LEGACY_FIRST_SAVE_PATHS`, l.138–143 do teste); a minha sonda REST (Item 1, `o-i1-rest.tsv`) mostra `D-W1 legado salvo sem mudança pelo editor (1 viva) 200 · version 2->2` e `(0 vivas) 200 · version 2->2`, render `placa,fotos,assinatura` preservado. Efeito nulo; a ratificação da E4-11 (d) é o que o código faz. Parcial → verde.
4. CE-33 SÓ nos hunks do conserto → `git diff -U0 <objeto>~8 <objeto> -- <7 arquivos>` lido hunk a hunk:

   | arquivo | hunks | classificação |
   |---|---:|---|
   | `tests/checklist-template-lock.test.ts` | 11 | 1 caso novo `E3-20 (REST)` (todo DELETE/PATCH/publish/createRun/complete com status afirmado: `204`, `assertNotFound`, `200`, `409`); 1 acréscimo ao `CE-12 (REST)` (token errado −1 ms: 3 portas `404` afirmadas; controle do dono `200` afirmado); 9 do guard CE-13 (regras iii/iv, comentário, retorno com contagem) |
   | `tests/checklist-template-lock-db.test.ts` | 6 | comentário + CE-12-forma por sentença (troca 3 `assert.match` por julgamento por sentença que segue exigindo `FOR UPDATE`, `FOR KEY SHARE` e `date_trunc` — reforço, não troca de regra de negócio); E4-01-db (404 afirmado depois de concluir a viva); E4-05 (3 portas `null`, nunca stale); CE-5 publish/archive com arnês (rejeição stale e estado final afirmados) — banco/concorrência é da C1 |
   | `tests/checklist-template-change.test.ts` | 1 | regressão E4-07 (2 casos) |
   | `tests/checklist-routes.test.ts` | 3 | encanamento do resultado + `assert.equal(…status, 200)` no PATCH inativar (l.925/930) e no publish do helper (l.1021) |
   | `tests/checklist-snapshot-dispatch.test.ts` | 1 | `assert.equal(edited.status, 200)` + `const republished` + `assert.equal(republished.status, 200)` |
   | `tests/helpers/o6r07c-census.ts` | 1 | `const publicado` + `throw` se `≠ 200` (D-C2-5) |
   | `frontend/tests/checklists-editor-lock.smoke.test.tsx` | 3 | E4-09 (`assertMarker` por classe exata) e E4-08 (guard de forma da fiação); nenhuma requisição mutante — mérito da C3 |

   Total **26 hunks**; (iv) asserção de negócio alterada = **0**; (v) requisição mutante sem status 2xx afirmado = **0**. As linhas retiradas (`-`) do conserto são só: o `const missing`/`assert.deepEqual` antigo do CE-13 e a 1ª linha do comentário (lock, 6), os 4 `assert.match`/`readFileSync` do CE-12-forma (lock-db), o `await` sem atribuição de routes l.925, snapshot l.43 e census l.90 (cada um substituído por atribuição + status afirmado) e 2 linhas do `assertMarker` (smoke). Todo hunk do ciclo 1 que não aparece neste `diff -U0 <objeto>~8..<objeto>` não mudou — é o comando que carrega o veredito do ciclo 1 sobre eles. Parcial → verde.
5. Escopo → `git diff --name-only/--numstat` (re-medido): `<objeto>~8..<objeto>` = 25 caminhos; só o dev (`<objeto>~7..<objeto>`) = 13: `API_CONTRACTS.md` 5/0, `pendencias-indice.md` 10/7, `pendencias.md` 20/0, `B-SAN3-22-dev.md` 288/0, `B-SAN3-22-plano.md` 93/0, smoke 62/2, `checklist.service.ts` 5/0, routes 3/1, snapshot 3/1, change 9/0, lock-db 107/4, lock 137/6, census 2/1. Os 12 restantes (`<objeto>~8..<objeto>~7`, commit `4978f7d9` do orquestrador) são os votos do ciclo 1 em `omega/juntas/` e o `omega/reprovacoes/R-B-SAN3-22-ciclo1.md` que o §C7.4 manda registrar — não são diff do dev. PROIBIDO (frontend/src, prisma, mobile, src/database, core-saas, .github, Kpis, os 2 repositórios, 4 manifestos/lockfiles): **0** em cada. `checklist.service.ts`: um hunk `@@ -290,0 +291,5 @@`, dentro de `renderChecklist` (l.279–310). `git diff --check <objeto>~8 <objeto>`: ec=0. Parcial → verde, salvo o caminho julgado em 7.
6. E4-11 → `grep -c '^## P-(CHK-EDITOR-LEITURAS-B|CHK-COMPONENTES-EMPATE-ORDER-INDEX|FRONT-TESTE-DE-INTERACAO) '` = **3**; as três `ABERTA`, dono orquestrador (a 1ª para planejar `B-CHK-EDITOR-LEITURAS-B`; a 2ª `pre-existente`). D-C2-1 (régua do `assertMarker`) é da C3; D-C2-2 (22 mutações) não muda requisito meu; D-C2-3 recontada (8/35); D-C2-4 deslocamento de linha confirmado (l.423, l.930, l.1021); D-C2-5 medida (U5 lança a semente, visível); D-C2-6 superada pelo cruzamento executado no Item 1; D-C2-7 é registro de mutante equivalente (C1); D-C2-8 medida e aceita. Nenhuma muda o que a E4 manda. Parcial → verde.
7. **C2R2-01, julgado por mim** (o caído o deu `bloqueia · dentro-do-bloco · não grave`). Comandos:
   - `tr -d '\r' < docs/revisoes/SAN3/B-SAN3-22-plano.md | grep -n '^| \*\*E4-11\*\*'` e `sed -n '/^### E4\.2 /,/^### E4\.3 /p'` → a linha da E4-11, na coluna de CAMINHOS do próprio requisito, diz `agent-orchestration/controle/pendencias.md (+ python agent-orchestration/controle/gerar-indice-pendencias.py)` e o critério de aceite diz `= 3; índice regenerado`; a E4.2 ("consolidado") lista `pendencias.md` e não o índice, e diz "PROIBIDO: tudo o mais".
   - `python agent-orchestration/controle/gerar-indice-pendencias.py` no meu worktree (o gerador lê `P = pendencias.md` e escreve `O = pendencias-indice.md`, l.41–42) → `diff` EOL-neutro do gerado × blob do objeto = **0 linhas**. Controle: o mesmo gerador sobre o `pendencias.md` de `<objeto>~8` reproduz o índice de `<objeto>~8` com **0 linhas** de diferença. Logo o `pendencias-indice.md` do objeto é função pura do `pendencias.md` PERMITIDO; os 10+/7− são os totais (661→664 cabeçalhos, 499→502 abertas…) e as 3 linhas das pendências novas. Restaurado `=blob`, `status=''`.
   - `git log <objeto>~8..<objeto> -- …/pendencias-indice.md` → só `c0e477b7` (`<objeto>~1`, "docs(registro): pendências do ciclo 2 … (E4-11)"); o relatório do dev declara a regeneração às claras (C2-14 "Índice: `python …gerar-indice-pendencias.py` → 664 cabeçalhos…; `pendencias-indice.md` +10/−7") e lista `pendencias{,-indice}.md` no escopo (C2-15). Não houve consolidação silenciosa por parte de quem desenvolveu.
   - **Julgamento:** o diff do objeto cumpre a cláusula ESPECÍFICA (a linha da E4-11, com o caminho do gerador e o aceite "índice regenerado") e o artefato tocado é derivado byte a byte do arquivo permitido. A contradição está no TEXTO do plano: a E4.2 consolidou as linhas da E4.1 e deixou de fora o artefato derivado que a E4-11 nomeia. As duas cláusulas, na letra, não são satisfeitas juntas por objeto nenhum: sem regenerar, falha a E4-11; regenerando, falha a letra da E4.2. É critério impossível de passar (pergunta (a) do §C7.4), artefato do processo, não defeito do produto nem do conserto; reprovar por ele seria reprovação por construção. **Classe: não grave · gravidade: `nota` · escopo: `dentro-do-bloco`** (origem: o texto da Emenda E4 deste bloco, de `planejador-san322-c1rep-fable`; evidência: as duas linhas citadas, no objeto). A tensão fica registrada aqui e na ata (§A2), sem consolidação silenciosa minha. Não proponho correção.

Veredito parcial → **VERDE**. Regressão da C2 com N igual; E4-07 vermelha pela asserção e o controle `<objeto>~8` verde; CE-33 com (iv)=0 e (v)=0 em 26 hunks; PROIBIDO vazio; o C2R2-01 é contradição do plano, rebaixado a `nota`.

## Teardown e fim (02:18Z)

- Head no fim: `git ls-remote` = `gh pr view 464 headRefOid` = `6b03e44d8136792398f521ccaf85d8dd45168a6d` (não andou). Worktree no fim: `rev-parse HEAD` = objeto, `status --porcelain` = 0 (toda mutação e todo checkout de base restaurados, `hash-object` = blob).
- `docker rm -f -v j22r2-c2o-redis` → contagem `j22r2-c2o` = 0. Containers `j22r2-c1-*` (de outra cadeira), `erp-*` e `agv3-proxy` não tocados.
- Processos com o caminho do worktree: 0 (só a própria consulta) → `git worktree remove --force C:/Users/AMP/j22r2-c2-wt` ec=0; diretório ausente; `worktree list` sem ele.
- Apagados: os meus extraídos `$S/o-base8`, `$S/o-base21`, `$S/o-idx8.md` e a cópia do corpo no scratchpad da sessão. Ficam no `$S` os meus roteiros (`o-i1-mut.sh`, `o-silent.sh`, `o-i2-iv.sh`, `o-guard-runner.ts`) e TAPs/logs `o-*`, ao lado dos do caído (não apagados).
- `w-san322`: só `c2r2-evidencia.md` e `c2r2-voto.json` escritos por mim; sem commit. Base viva nunca tocada. Disco livre no fim: 9,0 GB.

**Quedas/P3:** sucedi `jurado-san322-c2-r2-sol`. Re-executei cada comando registrado na evidência dele; todas as saídas bateram (29/29 ×3, TSV da sonda igual, 4 mutações do Item 1, contrato 5×5 e a mutação E4-10, CE-13 e as 7 formas, 8/35 e 6/26, U1–U5, 35 = 30 + 5 em `<objeto>~21`, os 2 controles `<objeto>~8`, 51/51 ×3, 33/33, E4-07 31/33 e 31/31, 26 hunks com (iv)=(v)=0, 13 caminhos do dev). Medi de novo, como cauda minha: a mutação M4 no corpo do `renderChecklist`, as formas próprias da regra (iii)/(iv) (helper pontuado com URL em variável, `let` reatribuída, quebra de linha antes da URL), o runner do guard extraído por parse e o gerador do índice de pendências contra o blob. A única divergência de JULGAMENTO é o C2R2-01: `bloqueia` para ele, `nota` para mim (Item 3, passo 7).

**Classe repetida?** Não. As classes "guarda que reconhece forma e não propriedade" e "sítio sem status afirmado" não se repetiram em forma prometida; os verdes da minha bateria são os residuais declarados no guard e em `P-FRONT-TESTE-DE-INTERACAO`.

VOTO: APROVADO — E4-01: arquivado sem viva 404 checklist_not_found nas 6 portas, com viva render 200, rascunho/inativo sem viva 409 (controle `<objeto>~8`: 409); E4-10 contrato × código 5×5 sem divergência; E4-02/E4-03: CE-13 vermelho em 7 formas e na regra (iv), cinco sítios visíveis, 35 violações em `<objeto>~21`; E4-07 vermelha pela asserção; CE-33 26 hunks com (iv)=(v)=0; PROIBIDO vazio; C2R2-01 = contradição do plano (E4-11 × E4.2), artefato derivado byte a byte do arquivo permitido → nota.
