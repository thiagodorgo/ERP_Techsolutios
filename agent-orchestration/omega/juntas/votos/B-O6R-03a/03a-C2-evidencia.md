papel: C2 | identidade: jurado-o6r03a-v2-replay | modelo: Claude Opus 5.5 (claude-opus-5-5) · nível menor (fonte: decisoes.md:3132 no objeto b75a0c2e, D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO; substitui D-FABLE-ASTRA-SO-DINHEIRO l.3153) | mandato_md5: 73f4c41ef24c0e3ad80bfc3e7d15fe87 EOL-neutro, a29a5283c316fab588401c86eb51aed9 cru (declarado no disparo: a29a5283c316fab588401c86eb51aed9 cru) | corpo_md5: 8ef06bc866bef9987f28e32c4b70b213 .claude, 8f0eaf4813215162085046581b79fca1 .agents (recebido no prompt: lido do blob b75a0c2e por git show, 8ef06bc866bef9987f28e32c4b70b213 declarado no disparo)

# Evidência — Cadeira C2 (replay e prova por ator) — junta B-O6R-03a (PR 425), ciclo 1

Lançada como `general-purpose`, limitada por escrito a Read, Grep, Glob e Bash; escrita só nos dois arquivos de saída, por Bash.

## Cabeçalho (início, 2026-10-11T23:58Z)

- objeto: `b75a0c2e96a80b2f54cc629fe856d16660ccbe86` — `git ls-remote origin refs/heads/fix/expense-sync-atomic` = `gh pr view 425 --json headRefOid` (OPEN, isDraft=false, MERGEABLE, base main). ec=0 nos dois.
- cerca do mandato: `5cee8e57`; `git diff --name-only 5cee8e57 b75a0c2e` = 4 arquivos `agent-orchestration/omega/juntas/votos/B-O6R-03a/00-mandatos/{C1,C2,C3,inspetor-03a}.md` — só registro.
- origin/main no início: `684e9afd7710486682992ee9fb464db17256e68a` (após `git fetch origin main`, ec=0).
- B = `git merge-base origin/main <objeto>` = `9566d55bd719ce7d7a545281c57923a25f883ed3`. Pais do objeto: `5cee8e57` (o objeto não é merge); o merge do ramo é `6798a76f` (pais `440cb088`, `9566d55b`).
- `git diff --name-status B <objeto> -- src/`: 8 arquivos em `src/modules/expense-management/`, 7 M + 1 A (`expense-sync.ts`).
- `git diff --name-only 3a648ca4 B -- src/modules/expense-management` = vazio (ec=0): o binário antigo montado em B é o mesmo produto do head-base do dev (3a648ca4).
- check-runs (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/<objeto>/check-runs?per_page=100`, filtro: não-verde = completed com conclusion fora de success/skipped/neutral; pendente = status ≠ completed): total=14 | não-verdes=0 | pendentes=0. 7 jobs × 2 runs (docker, authority-portal, owner-portal, frontend, backend-postgres, flutter, backend).
- legalidade: parecer `insp-03a-parecer.md` = LIBERADO COM RESSALVA; tabela "Conferência por cadeira" confere C2 = `jurado-o6r03a-v2-replay`, corpo `8ef06bc8…` commitado nos 2 espelhos, worktree `C:/Users/AMP/w-j03a-c2` próprio, prefixo `j03a-c2-`.
- decisões no objeto (`grep -c` em decisoes.md, obj/main): D-03a-MESMA-CHAVE-OUTRO-ATOR 2/1 (l.3432) · D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO 3/3 (l.3132) · D-GOV-PROPORCIONAL 5/5 (l.2938).
- âncoras do CLAUDE.md (`grep -cF`, obj/main): D-MEDIR-NA-REF-ALVO 1/1 · "1-bis. INSPEÇÃO DE TERRENO" 1/1 · "1-ter. ESCOPO DO VEREDITO" 1/1 · "4-bis. **SEPARAÇÃO DE PAPÉIS" 1/1 · "5. **Paradas imediatas irredutíveis" 1/1 · "6-bis. **ESGOTADO O FABLE" 1/1 · "P7 — Pausa ordenada" 1/1 · "(1) Junta proporcional ao risco" 1/1 · "(2) Teto de 2 ciclos" 1/1 · "(5) KPI congelado" 1/1 · "Idempotência = tenant" 1/1 · "Conflitos com resolução manual inicial" 1/1 · "Limpeza pós-validação e" 1/1 · "Regra de conflito (sem consolidação" 1/1 · "Fontes de verdade (ordem" 1/1.
- régua: unanimidade de 3 com veto (bloco de dinheiro, §C7 item 8(1)); ciclo 1 (mandato e disparo) → `bloqueia` + `dentro-do-bloco` reprova, de qualquer classe; KPI não se cobra (8(5)).
- shell: Git Bash (MINGW64_NT-10.0-22631 3.6.6 x86_64); node v20.19.5; docker 29.6.1 (server/client).
- disco em C: no início: 16G livres (238G, 94%).
- outros em execução no início: `docker ps` = erp-postgres, erp-redis (base viva, não alvo); node.exe = 6.
- SCRATCH = `/c/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c2`.
- inelegibilidade: o meu nome não está entre os inelegíveis do §8.2 nem do parecer (3.1 do inspetor); conferência própria no obituário a seguir.
- ressalvas do inspetor aplicadas: R1 (objeto b75a0c2e), R2 (queda → sucessor de identidade nova, P3), R3 (R11a e "o binário anterior relança" A RE-VERIFICAR), R5 (disco ≥10 GB), R7 (CI attempt 1 T15).
- espelho `.agents`: md5 EOL-neutro 8f0eaf48… ≠ `.claude` 8ef06bc8…; `diff` mostra só o adaptador Codex (linha `tools:` ausente e o bloco "Papel para o Codex") — corpo idêntico no resto.
- obituário no objeto: `grep -c SEPULTADA` = 34; `grep -n '03a'` = 0 ocorrência → o meu nome não está sepultado nem reservado.

## Legalidade — veredito parcial: LEGAL (inspetor LIBERADO COM RESSALVA confere C2; objeto por 2 fontes; 14/14 check-runs concluídos e verdes; normas citadas existem na ref).

## Terreno (montado 2026-10-12T00:05Z)

- `df -h /c` antes do worktree: 16G livres (piso 10 GB OK). Depois do `npm ci`: 15G.
- worktree próprio: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-j03a-c2 b75a0c2e…` → ec=0; `test -e C:/Users/AMP/w-j03a-c2/.git` OK; `rev-parse HEAD` = b75a0c2e; `status --porcelain` = 0 linhas. O caminho estava livre antes (sem resíduo alheio).
- `timeout 900 npm ci --no-audit --no-fund` → "added 326 packages", ec=0 (próprio, sem junction — prova `dir /AL` no teardown).
- porta 58472: fora de toda faixa de `netsh interface ipv4 show excludedportrange protocol=tcp` (faixas 50000-50059, 54861-56019, 64297-65426, 5357); `Get-NetTCPConnection -LocalPort 58472` → vazio ("free 58472").
- container: `docker run -d --name j03a-c2-pg -e POSTGRES_PASSWORD -e POSTGRES_DB=erp_j03a_c2 --publish 127.0.0.1:58472:5432 postgres:16` (senha aleatória por execução, só por ambiente, guardada em arquivo 0600 no SCRATCH; nunca em argv nem aqui) → ec=0; `pg_isready` OK; PostgreSQL 16.14.
- `npx prisma generate` (DATABASE_URL só no ambiente do comando) ec=0; `npx prisma migrate deploy` ec=0 "All migrations have been successfully applied"; `SELECT count(*) FROM _prisma_migrations` = 108 (0 não terminadas/revertidas).
- RLS medido: expense_events/expense_items/expense_policies/expense_reports/mobile_action_receipts/users/work_orders = relrowsecurity t, relforcerowsecurity t; tenants f/f. Política `tenant_id = NULLIF(current_setting('app.current_tenant_id', true),'')::uuid`.
- esquema medido: `mobile_action_receipts.actor_user_id uuid NOT NULL` (PK `(tenant_id, client_action_id)`; CHECK status ∈ processed/failed/conflict); `expense_events.actor_user_id uuid` NULO admitido; `expense_events.aggregate_id` FK → `expense_reports(tenant_id,id)`; sem gatilho em expense_events (`grep TRIGGER` nas migrações de expense = 0).
- papel do serviço: `CREATE ROLE j03a_c2_app LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE` + `GRANT USAGE ON SCHEMA public` + `GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES` + sequências. Postura pela MESMA conexão do PrismaClient do serviço (`node --import tsx posture.mjs`): `{"u":"j03a_c2_app","rolsuper":false,"rolbypassrls":false,"rolinherit":false}`; `SELECT count(*) FROM expense_reports` sem GUC = 0 (RLS ativo).
- HTTP: app real `createApp(new MemoryCoreSaasAdapter(core))` com `CORE_SAAS_PERSISTENCE=memory` (como o T-B, lido no blob); ator por `x-tenant-id`/`x-user-id`/`x-role` (`authenticated-actor.middleware.ts:66-72`); permissões do CATÁLOGO pelo papel (`createTenantContextFromRequestActor` → `resolvePermissionsForRoles`; sem `x-permissions`); o `createPersistentRbacContextMiddleware` não tem resolvedor em memória (`env.CORE_SAAS_PERSISTENCE !== "prisma"` → null).
- base viva: `erp-postgres`/`erp-redis` não tocados; nenhuma conexão a 5432/6379.

## Sonda — arquivos (SCRATCH/c2, md5)

- `lib.mjs` 63d454d43221f8d58ad5213f72089158 (cliente Prisma por URL, instantâneo sha256 das 4 tabelas por tenant em ordem estável, contagens, semeadura tenant+u1/u2/u3+work order pelo admin, atores do CATÁLOGO `resolvePermissionsForRoles` — u1t=field_technician, u2m=manager, u2t=u2 field_technician, u3t; sem importar T-A/T-B/T-C).
- `swap.sh` 677bbfc8ccc0ca0ac9706cc83c2f971e (troca os 7 arquivos M de src pelo blob de B via `git cat-file --filters`, prova `hash-object = rev-parse B:<f>`, tira `expense-sync.ts` para o SCRATCH; restaura e prova `hash-object = rev-parse <objeto>:<f>` + `status --porcelain` = 0).
- `i1_seed.mjs` fbf6cd28a18ee5535e1f6eb1dc0491a2 · `i1_old.mjs` 34b23bd73c69e6f7397455e98de629cd.
- Execução: `env -u DATABASE_URL -u REDIS_URL PROBE_ROOT=… PROBE_STATE=… ADMIN_URL=<superusuário do meu cluster> APP_URL=<j03a_c2_app> LOG_LEVEL=silent timeout <n> node --import tsx <sonda>` (da raiz do worktree).

## Baseline do autor no objeto (insumo, não prova)

- `DATABASE_URL=<meu cluster> node --test --test-reporter=tap --import tsx tests/expense-sync-atomic-db.test.ts` → ec=0, tests 24, pass 24, fail 0, skipped 0 (14 s).
- `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory node --test … tests/expense-management-routes.test.ts tests/expense-sync-fingerprint.test.ts` → ec=0, tests 23, pass 23 (14 s).

## Item 1 — legado, namespace, rollout/rollback, M11/M11′/M11″/M12/M13/M16/M18

### 1(a) o legado nasce do BINÁRIO ANTIGO (caminho: serviço sobre Postgres, papel j03a_c2_app)

- `i1_seed.mjs` → ec=0; T1=84839241-…, T2=8244537f-… (outra organização); `EXPENSE_SYNC_RECEIPT_KEY_PREFIX` do blob tem 161 caracteres ("expense-sync-v2/~~~~…").
- `swap.sh to-base` → ec=0: 7/7 "base OK" (hash-object = blob de B), `expense-sync.ts` fora.
- `i1_old.mjs` (processo Node separado, código de B) → ec=0. Prova de que carregou o binário antigo: `svc.runSyncAction` = undefined; `RlsPrismaExpenseManagementRepository.prototype.createMobileActionReceipt` = function (só existe em B).
- Formas (u1 field_technician, `expense_report.create`, advanceAmount 10): F1 UUID v4 (como `sync_action_factory.dart:25` `_uuid.v4()`), F2 `local:42`, F3 `z`×160, F4 `<uuid>:x`; PRÓPRIAS: F5 `'  '+uuid+'\t '` (o validador faz trim — testa se a normalização casa o legado), F6 `P.slice(0,160)` (o legado adversarial da r2), F7 `q`×170 (o validador corta em 160 — testa o corte).
- O que o binário antigo GRAVOU (lido pelo admin), por forma: 7/7 `processed`, `replayed:false`; recibo na chave CRUA normalizada (len 36/8/160/38/36/160/160 — F5 gravado SEM os espaços, F7 gravado com 160), `actor_user_id`=u1, `action_type`=`expense_report.create`, `status`=processed, `result_ref`=id do relatório, 1 evento `expense_report.synced_from_mobile` com agregado=result_ref, ator=u1 e `payload_hash = sha256(JSON.stringify({type, clientActionId}))` (7/7 iguais ao hash antigo recalculado).
- Tipos que o binário antigo produz: SÓ `expense_report.create`. Item e submit com UUID canônico → 400 `EXPENSE_INVALID`/`invalid_uuid` "reportId must be a valid UUID." (regex antiga sem o 4º grupo: `git diff B <objeto> -- …validators.ts`). Item/submit legado será semeado pelo admin na forma exata que o binário antigo gravaria (declarado em 1(d)).
- contagens T1 após o binário antigo: reports 7, advance 70, events 14 (7 created + 7 sync), receipts_raw 7, k2t 0.
- `swap.sh restore` → ec=0: 8/8 "restore OK" (hash-object = blob do objeto), `status --porcelain` = 0.
- veredito parcial 1(a): legado REAL produzido (7 formas); o binário antigo não produz item/submit.

### 1(b)(c) legado do próprio ator e de outro ator, no objeto (caminho: serviço sobre Postgres, processo NOVO com o código do objeto)

- `legacy.mjs` b0e4da256656bcfa208763aa171144f6 (semeadura pelo admin na forma do binário antigo) · `i1_bc.mjs` ef73ce5d88cd53e8090a9aa88284af8d · `i1_fid.mjs` 7eac10695590bd759fdc278fbca6ac5e.
- `SOURCE=state … node --import tsx i1_bc.mjs` (legado REAL do binário antigo em T1) → ec=0. 7 formas × 6 casos = 42 linhas; por forma:
  - u1 carga igual → `conflict/legacy_payload_unverifiable/replayed=true/resultRef=PRÓPRIO`, dReports 0, dK2t 0, dEvents 0, instantâneo igual;
  - u1 divergente (advanceAmount 999) → idem `legacy_payload_unverifiable`, ref próprio, zero escrita;
  - u1 outro tipo (`expense_item.create` no relatório do legado) → `conflict/payload_mismatch`, ref próprio, zero escrita;
  - u2 gestor, u2 técnico, u3 técnico → `conflict/action_owned_by_other_actor/resultRef=null`, zero escrita.
  - RESUMO: casos=42 efeitos_novos=0 processed_sobre_legado=0 resultRef_de_u1_para_outro=0 snapshot_mudou=0 divergem_do_esperado=0.
- Fidelidade da semeadura do admin × binário antigo (para as rodadas de mutação, que precisam de legado novo a cada vez): `i1_fid.mjs` → "FIDELIDADE formas=7 iguais=7 diferentes=0" (recibo sem tenant/ref/datas, relatório sem ids/datas, eventos por tipo+hash+ator+agregado). Controle do comparador: a variante com `type: expense_report.submit` → "iguais=0 diferentes=7" (o comparador acusa).
- `SOURCE=seed` no objeto (legado semeado pelo admin, tenant novo) → mesmo RESUMO: 42 casos, todos 0.
- veredito parcial 1(b)(c): VERDE — nenhum efeito novo, nenhum `processed`, nenhum resultRef de u1 para outro ator, instantâneo igual, nas 4 formas da v3 e nas 3 próprias.

### 1(d) A11d — estados que ninguém produz (caminho: serviço sobre Postgres; semeados pelo admin)

- `i1_d.mjs` 1590594e4172c90507fc828e5512324b → ec=0. Por estado (resposta | instantâneo):
  - d1 cru + K2t do MESMO ator: u1 → `receipt_ambiguous`/ref null | igual; u2 gestor → `action_owned_by_other_actor`/null | igual.
  - d2 legado `result_ref` nulo: u1 → `receipt_unverifiable`/null | igual.
  - d3 legado `status=failed`: u1 → `receipt_unverifiable`/null | igual. d4 legado `status=conflict`: idem.
  - d5 legado com `actor_user_id` NULL: o banco RECUSA o INSERT ("null value in column actor_user_id … violates not-null constraint") — estado impossível no esquema.
  - d6 cru de u1 + K2t de u2: u1 e u2 gestor → `action_owned_by_other_actor`/null | igual. d7 cru de u2 + K2t de u1: u1 → `action_owned_by_other_actor`/null | igual.
  - d8 K2t pendente (claim sem resultado), d9 K2t `failed`, d10 K2t com ref não-UUID, d11 K2t apontando relatório de OUTRA organização: u1 → `receipt_unverifiable`/null | igual (4/4).
  - d12 legado de ITEM na forma do binário antigo: o evento antigo com agregado = id do item é RECUSADO pela FK `expense_events(tenant_id, aggregate_id) → expense_reports` (logo o legado de item é item + recibo cru, sem evento); u1 igual → `legacy_payload_unverifiable`/ref próprio | igual; u2 gestor → `action_owned_by_other_actor`/null | igual.
  - d13 legado de SUBMIT (recibo + evento antigo): u1 igual → `legacy_payload_unverifiable`/ref próprio | igual; u3 técnico → `action_owned_by_other_actor`/null | igual.
  - RESUMO_D casos=18 escreveu=0 processed=0 ref_nao_nulo_onde_v2_manda_nulo=0 divergem=0.
- veredito parcial 1(d): VERDE — todo estado fora do previsto nasce NEGADO, sem escrita.

### Correção de terreno declarada (atores)

- Medido no catálogo do objeto (`cat.mjs`, `resolvePermissionsForRoles` por papel): `field_technician` tem ZERO permissão `expense_*` (sem `expense_sync:write`, sem `read_own`); o técnico de campo que sincroniza despesa no catálogo é `technician` (e `operator`): `sync:write=true read=false read_own=true create/update/submit=true`; `manager`: `read=true`.
- Minha 1ª rodada usou `field_technician` como u1: o caminho do serviço não confere permissão de escrita (quem confere é a rota), e o replay K2t `processed` de u1 num processo novo saiu **403 permission_required** (`loadReadableReport` sem `read_own`). Não é achado: `field_technician` não alcança a rota (`requirePermission(expense_sync:write)`). Troquei u1/u2/u3 técnicos para `technician` (`lib.mjs` → md5 6552171e40d6767b0edf35b85445cdd0; `u1ft` field_technician mantido só para o 403 do item 3) e RE-EXECUTEI 1(b)(c), 1(d) e A11c: resultados idênticos (abaixo). A rodada antiga fica registrada como artefato meu, não insumo.
- Re-execução com `technician`: `i1_bc.mjs SOURCE=state` → ec=0, 42/42 OK, RESUMO todos 0 · `i1_d.mjs` → ec=0, RESUMO_D casos=18 escreveu=0 processed=0 ref_nao_nulo=0 divergem=0.

### 1(e) namespace da K2t por gerador PRÓPRIO (caminho: puro, funções do blob) + A11c no banco

- `i1_e.mjs` 5556805da4d88059b154450ad06e3cb6 → ec=0. Gera 258 ids (':' em 20 posições de um id de 160; 160/159/161/200 unidades; 21 especiais — espaço, tab, aspas simples/duplas, barra invertida, colchetes, `["x"]`, é, 中文, emoji, NUL, `a\0b`, meio par surrogate alto/baixo, U+2028, U+200B, U+FEFF — em 4 posições cada; prefixos `P.slice(0,k)` e do P LITERAL para k∈{1,15,16,17,40,100,159,160,161,162}; `expense-sync-v2/` + JSON, `P`+JSON e `P_lit`+JSON; 10 pares por trim e 10 trincas por corte em 160; formas da v3 com UUID em caixa alta). Normalizados pelo validador do blob (`assertNonEmptyString(…,160)`): 258 válidos, 173 distintos.
  - `GERADOR ids_gerados=258 normalizados_validos=258 distintos=173 recusados_pelo_validador=0 Plen_modulo=161`
  - `FALHAS f1_K2t_igual_a_id_legado=0 f2_ida_e_volta=0 f3_dois_ids_mesma_K2t=0 f4_K2t_curta_ou_sem_P=0 f5_legado_decodificado_como_K2t=0`
- A11c no banco (`i1_a11c.mjs` 6d237ab6c9cae2d7b48809561981364d): por rodada, legados de **u2** com ids `P_lit.slice(0,160)`, `<U>:x` e `expense-sync-v2/["<U>"]`; u1 (technician) manda a ação NOVA `U` → 3/3 `processed/null/replayed=false`, dReports=1 → "RESUMO_A11C rodadas=3 capturadas=0".

### 1(f) rollout e rollback, medidos (caminho: serviço sobre Postgres; um processo Node por binário)

- antigo → novo: é o 1(a)+(b)+(c): o legado do binário antigo sobrevive à troca com conflito e zero efeito novo (42/42).
- reinício (A15, drill 3b): `i1_f.mjs` b2ba856b9256f87b89e2d969fc986ba0 `MODE=create` (pid 31168) → u1 cria X (UUID v4) → `processed/replayed=false`, ref a85a91f8…, reports 7→8. `MODE=replay` (processo NOVO, pid 13936, sem estado em memória, u1 technician) → `processed/replayed=true`, ref a85a91f8… (`mesmo_resultRef_do_create=true`), reports 8→8, events 16→16.
- novo → antigo (drill 3a, R3 do inspetor "o binário anterior relança" — RE-VERIFICADO): `swap.sh to-base` (7/7 base OK) → `MODE=old` (pid 17588, `binario_novo=false`) reenvia X fielmente → `processed/replayed=false`, ref NOVO 4af0c99c…, **reports 8→9, advance 103→136, events 16→18**. O binário antigo relança e DOBRA diante da K2t: evidência do perigo para `P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO`, NÃO achado deste bloco (reprovação por construção, item 3 do corpo). `swap.sh restore` → 8/8 OK, porcelain 0.

### Vermelho-controle 1 do item 1 — o legado é legado

- `i1_vc1.mjs` b3da769dce150c60eb67da2baca50f1b → ec=0 (classificador: prefixo de 161 LITERAL + `decodeSyncReceiptKey` do blob + ida e volta; insere 1 legado fabricado `local:fabricado` e 1 K2t fabricada `build('fab:<uuid>')`):
  - binário-antigo → legado: 7 (5 com `position(':')=0`, 2 com `:`); objeto → k2t: 1 (sem `:`); fabricado-legado → legado: 1 (com `:`); fabricado-K2t → k2t: 1 (com `:`).
  - `position(':' in client_action_id)` NÃO separa: há legado com e sem `:` e K2t com e sem `:`.
- veredito parcial 1(e)(f)+VC1: VERDE.

### 1(g) mutações do item 1 — uma por vez, num processo, com restauro provado (driver próprio)

- `mutspec.mjs` ef2bfcc4085c87f343c2910d28bc4fc9 (onde mutar = roteiro do spec.py do dev; âncoras reescritas por mim) · `mutapply.mjs` 3b610ee905883e83f0c162788342dc48 (âncora convertida ao EOL do arquivo, contagem = 1 senão ABORT sem gravar; backup; `git hash-object` ≠ blob e trecho novo presente; restauro com `hash-object` = blob e `status --porcelain` = 0) · `runmut.sh` 45e7d0f3c752931810a8f6bc9a74368f (aplica → import dos 4 módulos → T-A inteiro (24) + T-B/T-C inteiros (23) → minha sonda → restaura) · `loadcheck.mjs` 51e6e9d3002bcd30e63cd7300ca5f386 · `i1_bc.mjs` (com EFEITO_POR_FORMA) c15dd3448e103851a9ae8c77b191eb0e.
- Contagem de âncora a seco (`mutcount.mjs`, CRLF tratado): 23/23 mutações com toda âncora = 1.
- Resultados (autor = 1ª linha `not ok`; irmãos verdes = os demais testes do arquivo; minha sonda = serviço sobre Postgres, legado semeado pelo admin com fidelidade provada):
  - **M11** (sem leitura legada): load 4/4; autor T-A 20/24 (vermelhos A11, A11b′, A11c, A11d), T-B/T-C 21/23 (B6, C8); **sonda: efeitos_novos=7 processed_sobre_legado=7 snapshot_mudou=7** (1 por forma) → VERMELHO-CONTROLE 2 do item 1 OK (+1 efeito sobre o legado). Restauro OK, porcelain 0.
  - **M11′** (legado só com ':'): autor A11, A11b′, A11c, A11d, B6, C8 vermelhos; **sonda: EFEITO_POR_FORMA F1,F3,F5,F6,F7 = 1 cada** (as 5 formas sem ':'), efeitos=5. Restauro OK.
  - **M11″** (legado só sem ':'): autor A11, A11c, B6 vermelhos; **sonda: EFEITO_POR_FORMA F2,F4 = 1 cada** (as 2 formas com ':'), efeitos=2. Restauro OK.
  - **M13** (legado promovido pelo hash do replay): autor A11, A11b′, A11c, B6, C8 vermelhos (A11d verde, como o roteiro previa); **sonda: processed_sobre_legado=14 efeitos=14** (u1 igual e divergente nas 7 formas). Restauro OK.
  - **M16** (legado de outro ator ignorado): autor A11b′ vermelho (resto verde); **sonda: efeitos=7 (u2 sobre o legado de u1, 1 por forma), processed=14, resultRef_para_outro=14**. Restauro OK.
  - **M12** (prefixo curto): autor A1, A11c, C7 vermelhos; **gerador: f4_K2t_curta_ou_sem_P=165, f5_legado_decodificado_como_K2t=5** (Plen_modulo=16) e **A11c: capturadas=3/3** (a ação nova de u1 capturada pelo legado de u2 → perda de dado) → VERMELHO-CONTROLE 3 do item 1 OK (o gerador não é vácuo). Restauro OK.
  - **M18** (K2t + pid): autor A15 e C7 vermelhos; **sonda: create (pid 16512) reports 9→10; replay em processo NOVO (pid 27864) → processed/replayed=false, ref NOVO, reports 10→11, advance +33** (segundo efeito depois do reinício). Restauro OK.
- veredito parcial 1(g): 7/7 mutações vistas pelo autor (asserção de negócio) E pela minha sonda; nenhum mutante vivo.
- **veredito parcial do ITEM 1: VERDE** (sem achado). [resta só transcrever para o voto]

## PAUSA 2026-10-12T00:19Z

Ordem do orquestrador (dono, P7) recebida depois do fim do comando em curso (runmut M12 + M18, ambos restaurados). Nenhum item novo iniciado.

- **head medido**: objeto `b75a0c2e96a80b2f54cc629fe856d16660ccbe86` (ls-remote = gh, 23:58Z; não re-medido na pausa); worktree `C:/Users/AMP/w-j03a-c2` HEAD = b75a0c2e96a80b2f54cc629fe856d16660ccbe86, `status --porcelain` = 0 linhas (nenhum src mutado ou trocado; último restauro M18 OK).
- **feito**: legalidade; terreno; baseline do autor; ITEM 1 inteiro — 1(a) binário antigo, 1(b)(c), 1(d), 1(e) gerador + A11c, 1(f) reinício + drill 3a, VC1/VC2/VC3, 1(g) 7/7 mutações (tudo acima, com comando e saída).
- **falta**:
  - ITEM 2 — escrever e rodar as sondas: (a) dono A3′/B1′ pelo serviço E pelo HTTP (app em memória, `x-tenant-id/x-user-id/x-role`, papéis `technician`/`manager`) e na sequência real do app (lote [create X, item {report_local_id}] → 400 depois do commit, reenviado sob u2); (b) A12′ com `normalizeSyncCommand`; (c) A12b (UPDATE do `actor_user_id` do evento para u2 e para NULL — não há gatilho em expense_events); (d) tabela `campo variado | hash igual?`; (e) A13; (f) forma própria (u1 em caixa alta; prova em outra org; perda de leitura); (g) mutações M10c, M10i, C3mut, M15, M17, M17M10c, FIXdev, A13mut; VC do item 2.
  - ITEM 3 — (a) forma da resposta HTTP; (b) 3 listas de códigos; (c) lote parcial; (d) 400/403/404/409/422/503 (espião em `withSyncTransaction`; 503 por sessão de controle segurando a K2t); (e) normalização; (f) NEWTYPE (a′ `npm run check`, b′ testes, c′ runtime); (g) m8, A4hash, A4field, A9mut, A10mut, A7bmut, A7bwide; VC do item 3.
  - transcrever itens 1–3 para `03a-C2-voto.json`; resolver o objeto de novo no fim (ls-remote + gh) e `origin/main`; teardown (container, worktree, SCRATCH); `grep -cE '[[:space:]]+$'` = 0 nos 2 arquivos.
- **próximo comando exato** (retomada): `git -C C:/Users/AMP/w-j03a-c2 status --porcelain | wc -l; docker ps --filter name=j03a-c2-pg --format '{{.Names}} {{.Status}}'; timeout 60 git -C C:/Users/AMP/w-03a ls-remote origin refs/heads/fix/expense-sync-atomic` — e então escrever `<SCRATCH>/c2/i2_owner.mjs` (item 2(a), serviço + HTTP) e rodá-lo com `env -u DATABASE_URL -u REDIS_URL PROBE_ROOT=C:/Users/AMP/w-j03a-c2 PROBE_STATE=<SCRATCH>/c2/state1.json ADMIN_URL=<superusuário do meu cluster, senha em <SCRATCH>/c2/.pw> APP_URL=<j03a_c2_app, senha em <SCRATCH>/c2/.pwapp> LOG_LEVEL=silent timeout 300 node --import tsx <SCRATCH>/c2/i2_owner.mjs` da raiz do worktree. Mutações: `bash <SCRATCH>/c2/runmut.sh <id> "<VAR=v:>sonda.mjs" …`.
- **arquivos meio-escritos / de pé**:
  - `03a-C2-voto.json`: ESQUELETO (itens EM APURAÇÃO) — não é voto.
  - este arquivo de evidência: completo até esta seção.
  - nenhum arquivo de `src/` mutado ou trocado (backups das mutações em `<SCRATCH>/c2/mutbak/`, cópias da troca pela base em `<SCRATCH>/c2/orig/` — inertes).
  - nenhuma sessão de controle aberta segurando PK.
  - container de pé: j03a-c2-pg Up 18 minutes (127.0.0.1:58472, banco erp_j03a_c2, papel j03a_c2_app); worktree de pé: `C:/Users/AMP/w-j03a-c2` (com node_modules próprio e cliente Prisma gerado). Deixados de pé por ordem da pausa.
  - SCRATCH: `<SCRATCH>/c2/` = `/c/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c2` (sondas, `state1.json`, `.pw`/`.pwapp` 0600 — valores nunca registrados, logs `mut/<id>/`).

## Sucessor 2026-10-13T17:06:19Z (Codex)

- identidade nova: jurado-o6r03a-v2-replay-cdx · cadeira C2 · ciclo 1.
- modelo declarado conforme invocação do dono: GPT-5.6 Sol · esforço high · nível menor (CLAUDE.md do objeto, §C7.6/6-bis; D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO).
- P3: li integralmente a evidência anterior; nenhuma conclusão anterior será usada sem reexecução do comando registrado.
- retomada exata: status do worktree = 0 linhas; j03a-c2-pg Up 15 hours; ls-remote = b75a0c2e96a80b2f54cc629fe856d16660ccbe86; scratch presente. ec=0 nos três comandos.
- veredito parcial de retomada: terreno preservado e objeto remoto ainda coincide; inicia reexecução P3 do item 1 antes da cauda.

### P3 — reexecução integral do item 1 pelo sucessor

- comandos reexecutados: legalidade/head/check-runs/âncoras; npm ci próprio; Prisma generate+migrate deploy; postura RLS/role; baseline T-A no contêiner Linux e T-B/T-C em memória; i1_seed → swap to-base → i1_old → restore; i1_bc state/seed; fidelidade+controle; i1_d; catálogo com technician; i1_e; A11c; rollout create/replay/old; classificador VC1; mutações M11/M11p/M11pp/M13/M16/M12/M18, uma por vez, com testes do autor, sonda própria e restauro.
- comparação com a evidência anterior: baseline 24/24 e 23/23; legado 7 formas e contagens idênticas; 42 casos com 0 efeitos/0 processed/0 vazamento/0 snapshot alterado; A11d 18 casos, 0 escrita; gerador 258/258, 173 distintos, quatro falhas = 0; A11c 0/3 capturadas; reinício reconhece K2t e binário antigo relança; mutações reproduziram M11=7, M11p=5, M11pp=2, M13=14, M16=7 efeitos/14 refs, M12 f4=165/f5=5/capturadas=3, M18 segundo efeito.
- forma corrigida pelo ambiente desta máquina: toda suíte -db foi reexecutada pelo teste-linux.sh em contêiner Linux isolado; os mesmos denominadores e vermelhos de negócio foram observados.
- comando/saída: logs p3-* e p3mut/* no SCRATCH; todos os apply tiveram âncora=1, todos os restores deram hash-object=blob e status --porcelain=0.
- veredito parcial do item 1 (sucessor): VERDE — a saída reexecutada coincide materialmente com a anterior; os três vermelhos-controle acusaram; 7/7 mutações detectadas; nenhum achado.

## Sucessor 2026-10-13T21:35:28Z (Codex 2)

- identidade nova: `jurado-o6r03a-v2-replay-cdx2` · cadeira C2 · ciclo 1.
- modelo declarado conforme invocação do dono: GPT-5.6 Sol · esforço medium · sem Fast · nível menor (CLAUDE.md do objeto, §C7.6/6-bis; `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`).
- hashes conferidos antes do mérito: corpo EOL-neutro `8ef06bc866bef9987f28e32c4b70b213`; mandato cru `a29a5283c316fab588401c86eb51aed9`.
- P3: corpo, mandato, parecer, `00-quedas.md` e esta evidência foram lidos integralmente. As conclusões anteriores só contam após reexecução própria dos comandos registrados; os arquivos `p3-i2*.log` sem registro P1 do sucessor anterior não são insumo.
- retomada executada: `df -h /c` sob Git Bash bateu timeout de 10 s (`ec=124`); medição independente `Get-PSDrive C` = 27,46 GiB livres, acima do piso de 10 GiB. `git -C C:/Users/AMP/w-j03a-c2 rev-parse HEAD` = objeto; `ls-remote` = objeto; container `j03a-c2-pg` ausente.
- divergência de terreno encontrada antes de qualquer conclusão: `git status --porcelain` mostrou `M src/modules/expense-management/expense-management.service.ts`; hash no disco `404865f0`, blob do objeto `527058bc`. O diff é exatamente a mutação `A13mut` (agregado tomado do pedido). Os logs mostram tentativa não registrada do sucessor anterior; como não há comando/conclusão P1 correspondente, ela não é insumo. Próximo passo: restaurar pelo backup nomeado, provar hash=blob e árvore limpa, então reconstruir o cluster próprio.
- veredito parcial de retomada: TERRENO AINDA NÃO LIBERADO PARA MÉRITO até o restauro provado; nenhuma conclusão herdada aplicada.
- correção do terreno: `MUTBAK=… timeout 60 node mutapply.mjs restore A13mut` → ec=0, `hash-object=527058bc` = blob do objeto e `status --porcelain` = 0. O container parado da cadeira foi removido pelo nome exato; a porta histórica 58472 passou a integrar faixa excluída do Windows (58448–58547), embora sem listener. Porta substituta 60072 foi provada fora das faixas excluídas e sem listener.
- cluster reconstruído: `j03a-c2-pg` em `127.0.0.1:60072`, PostgreSQL 16; `prisma generate` ec=0; `migrate deploy` ec=0; 108 migrações, 0 incompletas/revertidas. Papel `j03a_c2_app` recriado; postura pela mesma conexão do serviço: `rolsuper=false`, `rolbypassrls=false`, `rolinherit=false`, 0 relatórios visíveis sem GUC. `runmut.sh` do scratch passou a usar apenas a nova porta; nenhuma árvore fora do terreno foi tocada.
- veredito parcial de terreno: LIBERADO PARA MÉRITO — worktree limpo, cluster próprio ativo e papel runtime sem bypass provado.

### P3 Codex 2 — item 1 reexecutado integralmente

- legalidade reexecutada: `ls-remote` e `gh pr view 425` = `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`; PR OPEN, base main, não draft; GitHub agora reporta `mergeable=CONFLICTING` (estado externo, não objeto desta cadeira). `gh api …/check-runs` = total 14, não-verdes 0, pendentes 0.
- baseline do autor: T-A pelo `teste-linux.sh` em contêiner Linux isolado = 24/24, 0 fail, 0 skip; T-B/T-C em memória = 23/23, 0 fail, 0 skip.
- binário antigo e legado: `i1_seed → swap.sh to-base → i1_old → restore` = 7 formas produzidas, item/submit recusados por `invalid_uuid`; troca e restauro 8/8, árvore limpa. `i1_bc` state e seed = 42 casos cada, efeitos 0, processed sobre legado 0, resultRef de u1 para outro 0, snapshot alterado 0. Fidelidade 7/7; controle divergente 0/7.
- estados/namespace/rollout: `i1_d` = 18 casos, 0 escrita, 0 processed; `i1_e` = 258 gerados/258 válidos/173 distintos, f1=f2=f3=f4=f5=0; A11c capturadas 0/3; reinício = mesmo resultRef e relatórios 8→8; retorno ao binário antigo = relatórios 8→9, advance 103→136, eventos 16→18, re-verificando de modo próprio o drill 3a. Classificador: legado antigo 7 (5 sem `:`, 2 com), K2t 1, fabricados 1+1; `:` não separa.
- driver próprio `cdx2-runmut.sh` md5 `c5439933a7bf655a8dae608d4cc848f1`; cada mutação teve âncora=1, módulo carregado, suíte do autor, sonda própria e restauro hash=blob/status=0. M11: autor 20/24 e 21/23, sonda +7 efeitos. M11′: primeira T-A caiu por `npm ECONNRESET` no invólucro Linux; repetição própria = 20/24, quatro vermelhos de negócio; T-B/C 21/23; sonda +5 (F1,F3,F5,F6,F7). M11″: 22/24 e 22/23; sonda +2 (F2,F4). M13: 21/24 e 21/23; sonda +14/processed 14. M16: 23/24 e 23/23; sonda +7, processed 14, refs para outro 14. M12: 22/24 e 22/23; gerador f4=165/f5=5 e A11c capturadas 3/3. M18: 23/24 e 22/23; processos distintos criaram segundo efeito, mesmo_resultRef=false. Todas restauradas; status final 0.
- comparação P3: resultados materialmente idênticos aos dois ocupantes anteriores, inclusive os três vermelhos-controle; a única diferença foi infraestrutura transitória `ECONNRESET`, repetida com denominador completo.
- veredito parcial ITEM 1 (Codex 2): VERDE — nenhum achado; 7/7 mutações detectadas pela sonda e pelo autor, legado e estados imprevistos falham fechados.

### Item 2 — identidade da prova e dono

- sonda própria `i2_probe.mjs` md5 `aa5365f546b0b6463d0302ea639aa030`, serviço sobre Postgres pelo papel sem BYPASSRLS + HTTP real em memória com permissões do catálogo. Uma primeira execução sorteou tenant iniciado em `f`, tornando a troca ingênua do primeiro caractere por `f` um comparador constante; a sonda foi corrigida para escolher `e`/`f` diferente e reexecutada. O controle passou: só `same` manteve o hash.
- A3′/B1′: u1 cria, u2 manager e u2 technician recebem `conflict/action_owned_by_other_actor`, `resultRef=null`, relatórios 1→1. HTTP: u1 200 processed; u2 200 por ação conflict/action_owned_by_other_actor. Sequência real create+item local: 400 depois do create para u1 e u2; total HTTP=2 (create inicial + create do primeiro lote), sem segundo relatório no reenvio por u2.
- A12′: normalizados deep-equal (`a12_normalized_equal=true`, fixture C9 `true`); u2 recebe conflict/action_owned_by_other_actor, total 10, 1 item. A12b: ator do evento trocado para u2 e depois NULL (UPDATE admin, pois `expense_events.actor_user_id` é nullable e não há trigger) → conflict/payload_mismatch, zero efeito; ator restaurado → processed/replayed=true.
- hash: mesmo comando=true; tenantId, actorUserId, clientActionId, type, employeeUserId, periodStart, periodEnd, origin, workOrderId, projectId, costCenter, city, advanceAmount, currency e policyVersion alterados → hash diferente. A13: recibo de item reenviado com outro reportId, inclusive evento plantado no outro agregado → conflict/payload_mismatch. Forma própria: UUID do ator em caixa alta → conflict/action_owned_by_other_actor, efeito 0 (fail-closed; nota, não bloqueia).
- driver `cdx2-runmut-i2.sh` md5 `f555724a53405cd564ce0e5ebe38bd8a`; cada mutação âncora=1, carregou, rodou autor+sonda e restaurou hash=blob/status=0. M10c: A12b+C3 vermelhos; prova errada/nula saiu processed e hash ignorou ator. M10i: A12b vermelho isolado; prova errada/nula saiu processed. C3mut: C3 vermelho isolado; `hashSame=same,actorUserId`. M15: A3′/A3c/A12′ e B1′/B7′ vermelhos; u2 processed, HTTP processed, relatórios 4. M17: dono ausente mudou código para receipt_unverifiable (não action_owned_by_other_actor), detectado pelo autor e sonda. M17+M10c: primeira T-A caiu por `npm ECONNRESET`; repetição = 18/24, seis vermelhos de negócio; T-B/C 20/23; A12′ e A12b saíram processed e hash ignorou ator. FIXdev: C9 vermelho e `fixtureEq=false`. A13mut: A13 vermelho, sonda A13=`processed`.
- vermelhos-controle: replay fiel do próprio u1 saiu processed/replayed=true; M17+M10c produziu `processed` sob u2 no A12′; comparador de hash deu igual no mesmo e diferente em cada campo. As duas falhas `ECONNRESET` da rodada foram repetidas até obter denominador completo e não foram usadas como mérito.
- veredito parcial ITEM 2: VERDE — nenhum achado; 8/8 mutações detectadas, dono e prova são proteções independentes, A12′/A12b/A13 falham fechados.

### Item 3 — contrato HTTP, códigos, atomicidade e falha fechada

- sondas próprias: `i3_probe.mjs` md5 `3efe38e0c466ba446cd1129be6a963d8`; `i3_busy.mjs` md5 `f9a0a2f52d0e0c7edc0c6c6f4de3f5e5`; driver `cdx2-runmut-i3.sh` md5 `12a30b4ed77c25e2fb81378cb0e09a20`. Caminhos exercidos: HTTP real em memória, serviço real sobre Postgres/RLS e sessão concorrente própria no cluster C2.
- forma HTTP no objeto: requisição nova = 200/`processed`, `replayed=false`; replay fiel = 200/`processed`, `replayed=true`; conflito = 200/`conflict` com `errorCode=payload_mismatch`; campos obrigatórios presentes e `errorCode=null` no sucesso. Recibo permaneceu imutável depois do conflito. `field_technician` recebeu 403/`permission_required`.
- validação antes de transação: ações ausentes, não-array, vazias e ação inválida deram 400; espião de `withSyncTransaction` contou `invalidTx=0`. Controle com duas entradas válidas contou `validTx=2`.
- lote parcial: `[create válido, segundo comando inválido]` respondeu 400 após o primeiro commit; contagens foram 1 relatório/2 eventos e o reenvio não duplicou (`1-2-2`). Isto confirma o contrato por ação, não atomicidade do lote inteiro.
- Postgres real: relatório ausente e de outra organização deram 404; work order ausente/de outra organização foi 404 em create, update e sync; FK de employee permaneceu distinguível e não foi convertido em 404 de work order. Relatório vazio = 422/`empty_report`; item após submit = 409/`status_not_editable`; submit repetido com outro id = 409/`status_not_submittable`; replay fiel do submit permaneceu `processed/replayed=true`.
- normalização: formas equivalentes produziram o mesmo resultado; variação de cada campo consumido de create/item alterou a impressão, inclusive ordem recursiva de `policyFlags`; `tenantId` externo foi ignorado e o tenant persistido foi o do ator autenticado.
- 503 real: uma sessão de controle segurou a chave K2t; após 5647 ms a rota respondeu 503 `EXPENSE_SYNC_UNAVAILABLE/sync_busy`, sem relatório/recibo/evento parcial. Depois de liberar a sessão, o retry processou uma vez; contagens finais 1/1/2.
- três listas reconciliadas: constantes runtime = `action_owned_by_other_actor`, `legacy_payload_unverifiable`, `payload_mismatch`, `receipt_ambiguous`, `receipt_unverifiable`; contrato versionado contém as mesmas 5, diferença 0; união observada nas sondas/logs contém as 5 (ocorrências respectivamente 745/391/419/26/100). Razões HTTP observadas: `empty_report`, `invalid_action`, `invalid_actions`, `invalid_uuid`, `not_found`, `permission_required`, `required_field`, `status_not_editable`, `status_not_submittable`, `sync_busy`, `unsupported_action`, `work_order_not_found`.
- NEWTYPE: mutação própria adicionou `expense_report.delete` apenas ao enum. `npm run check` ficou verde; T-A 24/24 e T-B/C 23/23 ficaram verdes; o runtime recusou 400/`unsupported_action`, instantâneo idêntico. Resultado: falha fechada operacional (nenhuma escrita), porém o build/teste não acusa sozinho a ampliação do enum — registrado como ajuste não bloqueante, pois dinheiro, autorização e dados permanecem protegidos.
- sete mutações, uma por vez, com âncora=1 e restauro hash=blob/status=0: **m8** fez replay com ordem recursiva diferente virar conflict/payload_mismatch (autor T-B/C C1 vermelho; sonda corrigida para incluir ordem recursiva); **A4hash** e **A4field** aceitaram carga divergente (`conflict=null`) e foram acusadas pelo autor+sonda; **A10mut** abriu transação para três entradas inválidas (`invalidTx=3`); **A7bmut** converteu erros reais de work order em P2003 em vez de 404; **A7bwide** converteu também FK de employee em falso 404 de work order; **A9mut** devolveu erro cru em vez de 503/sync_busy sob lock. A7bmut teve um `npm ECONNRESET` inicial e foi repetida: T-A 23/24 com A7b vermelho. Todas as demais tiveram o vermelho de negócio esperado; nenhum mutante ficou vivo.
- vermelhos-controle: duas ações válidas abriram transação; m8 distinguiu ordem recursiva; A9mut removeu o 503 esperado; A7bmut/A7bwide separaram 404 de work order de outras FKs. Árvore final limpa.
- veredito parcial ITEM 3: VERDE COM AJUSTE — contrato e falha fechada preservados; 7/7 mutações detectadas; NEWTYPE recusado sem escrita, mas sem guarda estática/teste antecipada para expansão do enum.

### Fechamento Codex 2 — 2026-10-13T22:26:33Z

- objeto re-resolvido por duas fontes: `git ls-remote origin refs/heads/fix/expense-sync-atomic` e `gh pr view 425` = `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`; PR OPEN, não draft. O GitHub passou a informar `mergeable=CONFLICTING`, sem mover o head. Check-runs do SHA: total 14, incompletos 0, não-verdes 0.
- `origin/main` observado no fechamento = `f59ad1d6caaa9da3f451f1ad57e5b9e3ea8a235a`; merge-base do objeto = `9566d55bd719ce7d7a545281c57923a25f883ed3`. O conflito atual da branch é estado externo ao SHA julgado, não conclusão de mérito C2.
- teardown: status do worktree = 0 linhas antes da remoção; `docker rm -f -v j03a-c2-pg` removeu apenas o container da cadeira; containers com prefixo C2 = 0; `git worktree remove --force C:/Users/AMP/w-j03a-c2` concluiu; caminho e registro do worktree = ausentes; scratch C2, inclusive credenciais efêmeras, removido pelo caminho absoluto previamente resolvido e validado; disco C: 25,84 GiB livres. Base viva, portas proibidas e recursos `jtrc01-*`/outras cadeiras não foram tocados.
- arquivos finais: JSON parseável; evidência e voto com 0 linhas de whitespace final. Voto escrito em `03a-C2-voto.json`.
- **veredito C2: APROVADO**, sem veto; um ajuste não bloqueante `C2-AJ-01` sobre NEWTYPE, com runtime comprovadamente fail-closed e sem escrita.
