papel: C3 | identidade: jurado-o6r03a-v2-regressao-v3api (corpo jurado-o6r03a-v2-regressao) | modelo: Claude Opus 5.5 pela API v3 · nível menor (fonte: decisoes.md:3132 no objeto, D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO; CLAUDE.md §C7.6) | mandato_md5: f0e6b474a2a1b7a91781941bef8299c7 (cru = EOL-neutro; declarado no disparo: 182184fa7a3a880fbc618bffd0c92e20 — DIVERGE, ver A0) | corpo_md5: 1fdfb5c1108376ebdcc4f49b102166e9 (.claude, blob no objeto; declarado no disparo 1fdfb5c1… CONFERE) · espelho .agents 291dff2c02a13848d264c4fad19d7f59 (espelho adaptado, md5 diferente por desenho)

# Evidência — Cadeira C3 — junta B-O6R-03a (PR 425) — ciclo 1

## Cabeçalho / terreno
- objeto: b75a0c2e96a80b2f54cc629fe856d16660ccbe86 (`git -C /work rev-parse HEAD`) = anexo github-objeto.txt (ls-remote e gh pr view headRefOid, medido pelo orquestrador no host 2026-10-13T03:16:31Z). O container não alcança o GitHub: `gh`/`ls-remote` próprios impossíveis — insumo é o anexo.
- pais do objeto: b75a0c2e ← 5cee8e57 (não é merge); o merge da main é 6798a76f (pais 440cb088, 9566d55b).
- origin/main: NÃO existe no clone do container (`git rev-parse origin/main` → fatal); main atual pelo anexo = 684e9afd (objeto ausente localmente). B = 9566d55bd719ce7d7a545281c57923a25f883ed3 (2º pai do merge 6798a76f; = merge-base colado no mandato). Não pude provar localmente que 684e9afd descende de 9566d55b: declarado.
- cerca do mandato 5cee8e57; delta cerca→objeto medido em A0.
- container: hostname 4a3048cb8297; o disparo diz `agv3-j03a-c3-v3`; os serviços estão em `agv3-j03a-c3-v3b-pg` / `agv3-j03a-c3-v3b-redis` (prefixo j03a-c3 presente; sufixo b) — Postgres 16 e Redis 7 descartáveis do orquestrador, não portas do dono.
- uname: Linux 6.18.33.2-microsoft-standard-WSL2 x86_64; node v20.20.2; npm 10.8.2; psql presente; docker ausente (não necessário); python3 AUSENTE (scripts próprios em node/perl, declarado).
- disco: df -h /work → 947G livres; free -m → 10281 MB disponíveis; nproc 8.
- shell: bash; worktree = /work (só meu, detached no objeto); mutações só em cópia /tmp/w-mut.
- ambiente: DATABASE_URL e REDIS_URL do container (valores não publicados); nada de .env.
- concorrência: container isolado, só os meus processos (sem outras cadeiras dentro dele).

## A0 — Corpo, mandato, legalidade
- `git show b75a0c2e:.claude/agents/especialistas/jurado-o6r03a-v2-regressao.md | tr -d '\r' | md5sum` → 1fdfb5c1108376ebdcc4f49b102166e9 = publicado → corpo CONFERE; li o corpo inteiro (712 linhas).
- `md5sum <mandato C3.md>` → f0e6b474a2a1b7a91781941bef8299c7 (cru = EOL-neutro = blob no objeto; único commit que o tocou é b75a0c2e). Declarado no disparo: 182184fa7a3a880fbc618bffd0c92e20. Testei variantes (CRLF 82c265b3, BOM bf8e50ba, BOM+CRLF 9f78534e, sem LF final 5299dbe1): nenhuma dá 182184fa. Controle: o mandato do inspetor dá 4a5c44a1 aqui, igual ao que o inspetor mediu no Windows → o disco do Windows tem os mesmos bytes do blob; logo o 182184fa publicado não é de nenhuma versão commitada do C3.md. DECISÃO: o corpo (cuja regra de parada é por md5 do CORPO) confere; o mandato que leio é o blob da ref julgada (§A7) e foi o que o inspetor liberou. Sigo, e registro como ACHADO de processo (nota, não grave, fora do produto).
- inspetor (/entrada/anexos/insp-03a-parecer.md): "Veredito: LIBERADO COM RESSALVA", ciclo 1, objeto b75a0c2e; tabela l.38 confere C3 `jurado-o6r03a-v2-regressao`, corpo 1fdfb5c1…, espelho .agents presente. Worktree/cluster próprios: aqui o container cercado substitui (tradução do disparo).
- `git diff --name-only 5cee8e57 b75a0c2e` → só os 4 `00-mandatos/*.md` → delta cerca→objeto é só registro.
- check-runs (anexo do host, objeto b75a0c2e): 14 runs, total=14 | não-verdes=0 | pendentes=0 (todos completed/success: docker×2, authority-portal×2, owner-portal×2, frontend×2, backend-postgres×2, flutter×2, backend×2). IDs não vieram no anexo; logs do CI inacessíveis do container (ver item 1e).
- quórum: unanimidade de 3 com veto, ciclo 1 (régua: bloqueia+dentro-do-bloco reprova).
- inelegibilidade: `grep -c jurado-o6r03a OBITUARIO-IDENTIDADES.md` → 0; nome novo `…-v3api`.
- âncoras no CLAUDE.md do objeto (`git show HEAD:CLAUDE.md | grep -c`): §C5 3 · D-GOV-PROPORCIONAL 3 · 8(5) 1 · §C7.4-bis 6 · 1-ter 4 · 1-bis 3 · "P7 —" 1 · 6-bis 3 · merge_commit 4 (A7 existe como "## A7." no título). origin/main não disponível no container: âncoras só no objeto.
- decisões no objeto (decisoes.md): D-03a-MESMA-CHAVE-OUTRO-ATOR l.3432 · D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO l.3132 · D-GOV-PROPORCIONAL l.2938 → as três existem.
- `git diff --name-only B HEAD -- package.json package-lock.json prisma | wc -l` → 0 (baseline pode usar o mesmo node_modules/cliente/banco).
- Veredito parcial legalidade: OK com nota (md5 do mandato publicado não reproduzível; logs CI só pelo anexo).

## Item 2 — escopo, merge, memória, mutações, mutantes

### 2(a) escopo por caminho e por linha
- `git diff --name-status B HEAD | /tmp/c3/escopo.sh` (md5 9b5097bd8c53ba3ebaceb6ded27d3b50; tabela §6.2 do v2 lida no blob l.261-283) → 33 caminhos: 20 PERMITIDO · 13 REGISTRO (6 corpos jurado-o6r03a-* nos 2 espelhos, decisoes.md, pendencias-indice.md, 5 docs B-O6R-03a-*) · 0 FORA.
- controle: lista fabricada `prisma/schema.prisma` + `Kpis/kpis-latest.json` → ambos FORA (classificador acusa).
- `git diff --name-only B HEAD -- prisma migrations infra Kpis mobile frontend src/database scripts package.json package-lock.json .env* controller.ts routes.ts | wc -l` → 0; outros módulos de src → 0.
- validators.ts: 1 hunk, só a l.10 `uuidPattern` (`[89ab][0-9a-f]{12}` → `[89ab][0-9a-f]{3}-[0-9a-f]{12}`).
- routes.test.ts: +398/-1; a única linha `-` é o `return {…}` do seed (ganha `managerA`); comparador por título (/tmp/c3/tbody.mjs md5 4bdefa03…) → 5 primeiros testes IGUAL; o 6º marcou DIFERE só porque o recorte vai até o fim do arquivo (helpers + T-B anexados) — o hunk @@ -164,6 +164,395 mostra o corpo do 6º intacto em contexto. O comparador acusou (vermelho-controle natural). 6 testes antigos intactos.
- ci.yml: +5 / -0 linhas, 4 de comentário + `SUITES="$SUITES tests/expense-sync-atomic-db.test.ts"` logo após `inventory-migration-drill-db`. Nada mais.
- Veredito parcial 2(a): VERDE.

### 2(b) conteúdo do merge
- commits B..HEAD: 7ed1a7ca…62c95170 (docs), 76bd103b (merge main), 3a648ca4, 440cb088 (bloco, 18 arq.), 6798a76f (merge main), 5cee8e57/b75a0c2e (junta). O objeto NÃO é merge; o merge é 6798a76f.
- `git diff 6798a76f^1 6798a76f -- <cada arq. do 440cb088>` → 0 linhas em src/tests/ci/API_CONTRACTS/REGISTRO/dev.md; mexe só em decisoes.md (31), pendencias-indice.md (81), pendencias.md (38) — o lado da main.
- linhas acrescidas pelo ramo (merge-base→^1) ausentes no objeto: decisoes 0/18 · pendencias 0/38 · pendencias-indice 23/374 — as 23 são o índice GERADO renumerado (placar 537→538, linhas 10923→10934 etc.); as 10 entradas P-O6R-B03-* estão no índice do objeto com nova linha. Nada do bloco perdido.
- Veredito parcial 2(b): VERDE.

### 2(e) nenhum dos 36 mutantes no objeto (incidente R11a — RE-VERIFICADO, não herdado)
- spec.py extraído do blob `docs/revisoes/SAN3/B-O6R-03a-dev.md` l.363-467 (md5 6fad82a2…); sem python no container: traduzido para JS por perl (triple-quote→template, `.replace`→`.replaceAll` [Python troca todas], `def TA`→function) e avaliado num node isolado sem executar arquivo do dev → /tmp/c3/mut/spec.json (md5 9e352b64…): **36 entradas, 42 edições** (o FIXdev de calibração conta entre as 36).
- verificador /tmp/c3/mut/verify2.mjs (md5 06bb7b1d…), sobre `git show HEAD:<arq>` (LF): âncora original 1× e texto mutado 0× FORA da âncora (a âncora é mascarada antes de contar, porque em C3mut/M10c/M17M10c o texto mutado é sub-string da própria âncora). → **36/36 ausentes**. Única ocorrência "fora da âncora": A7bmut `  throw error;` = l.206 `      throw error;` de outra função (texto comum; âncora l.467 presente 1×).
- (a 1ª versão do verificador, verify.mjs md5 dc7e0706…, dava 32/36 por esse falso positivo de sub-string — corrigido o MEU instrumento, não o objeto; declarado.)
- M16 (service.ts) e M11′/M11p (expense-sync.ts), os estados do R11a: âncoras `LOOKUP` e `LEGACY_LOOKUP` 1× no objeto → ausentes.
- vermelho-controle 3: cópia do blob de service.ts com o M16 aplicado (/tmp/c3/mut/M16-…) → verificador marca M16 PRESENTE (e M15, que divide a âncora); cópia de expense-sync.ts com M11p → marca M11/M11p/M11pp PRESENTES. Acusa.
- ownership: C1 8 (m2 m3 m4 m5 m7 A1noclaim A8mut A0super) + C3 6 (m1 m6 m9a m9b M14 M14r) + C2 22 (o resto, FIXdev incluído) = 36. Soma confere.
- O "13/13 por sha256" do dev NÃO é re-verificável (scratchpad fora do objeto) — irrelevante: o que conta é o blob commitado, medido acima.
- Veredito parcial 2(e): VERDE.

### 2(c) memória com rollback honesto (B5) — sonda própria
- `/tmp/c3/probe/mem.mts` (md5 b7afcaf9…): `new InMemoryExpenseManagementRepository()` do objeto (os 5 mapas lidos no blob l.76-80: policies, reports, items, receipts, events). `timeout 120 node --import tsx mem.mts /work` → ec=0, SONDA VERDE:
  - T1 (createReport+claim k1, segura numa promessa minha) × T2: corpo da T2 NÃO começa enquanto T1 segura (fila por instância);
  - T1 falha → mapas voltam (report/k1 somem); T2 comita depois → report+k2 sobrevivem;
  - ordem inversa: T1 comita, T2 falha → commit da T1 preservado, escrita da T2 desfeita. Mapas impressos a cada passo no out.
- serviço em memória (`createMemoryExpenseManagementService`, `/tmp/c3/probe/svc.mts` md5 8b605539…): falha injetada DEPOIS do efeito em `completeMobileActionReceipt` e em `createEvent` → `{reports:0,items:0,receipts:0,events:0}` nos dois pontos (nada sobra). A sonda saiu ec=1 por expectativa MINHA errada no reenvio (esperei 1 evento): `svc2.mts` mostra que um sync limpo grava 2 eventos (`expense_report.created` + `expense_report.synced_from_mobile`); o reenvio deu reports 1 · receipts 1 · events 2 = exatamente um sync limpo. Sem defeito.
- vermelho-controle 2: sob M14 (`void previous`) a sonda acusa 3 FALHAS (T2 não espera; commit da T2 some no restore da T1); sob M14r (sem restore) acusa 2 FALHAS (escrita de transação falha fica); svc.mts sob M14r: "nada sobra" FALHA nos 2 pontos. Mutação aplicada em /tmp/w-mut com âncora 1×, hash-object ≠ blob (b1e7aed1/8c01a7f2 × cebc98a9), restaurada (porcelain=0).
- autor sob mutante: B5 (`--test-name-pattern="^B5 "`) → M14 fail 1/pass 0 · M14r fail 1/pass 0 (vermelho).
- Veredito parcial 2(c): VERDE.

### 2(d) mutações restantes (parte memória/validador)
- m9a (regex antiga): sonda `/tmp/c3/probe/uuid.mts` (md5 f36b18f1…) → objeto: 0/200 UUID v4 recusados; mutante: 200/200 recusados (`EXPENSE_INVALID`); hash do mutante = dde469d8 = blob do validador em B (coerente). Autor B3 sob m9a: fail 1 (`expected: 200`). VERMELHO nos dois → morto.

## Item 1 — suíte inteira, bateria, CI
### 1(a) baseline em B (forma do job `backend`)
- forma: cópia /tmp/w-base (cp -a de /work, mesmo node_modules/cliente; `git checkout --detach 9566d55b`, porcelain 0; deps/prisma sem diff B..objeto), `CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<container> REDIS_URL=<container> timeout 2400 node scripts/run-backend-tests.mjs > base.tap; ec=$?` (= `npm test`, package.json l.20). Concorrência: só eu no container (nenhuma outra suíte rodando; minhas sondas de memória rodaram em paralelo, sem banco).
- resultado: ec=0 · 488 s · **301 arquivos · 3298 testes · pass 3296 · fail 0 · cancelled 0 · skipped 2** · TAP md5 e9034541c544100c3e21c6830ebfa330. Leitor: /tmp/c3/tap.mjs (md5 314eb36f…).
- skips: os 2 do orçamento nomeado (permission-catalog-db-parity, gated por RBAC_DB_PARITY).
- nota de forma: o dev mediu baseline 3288/3278/8/2 em `3a648ca4` no Windows; aqui B=9566d55b (pós-merge #424) em Linux — outra ref e outro terreno, declarados; não é comparação direta.

## Item 3 — registro, evidência real, fechamento parcial, sem KPI
### 3(a) pendências P-O6R-B03* (blob do objeto, pendencias.md)
- `grep -n "P-O6R-B03" pendencias.md` → 10 cabeçalhos: P-O6R-B03 l.2883 **PARCIAL** (l.2917: "DIN-009 fechado NA AUTORIA … QUA-001 segue ABERTO, dono B-O6R-03b … só ativa depois de P-O6R-B03-FILA-POR-USUARIO"); FECHADA NA AUTORIA: UUID-PATTERN-INVALIDO (l.10934), EVENTO-DE-ITEM-VIOLA-FK (10940), COMPATIBILIDADE-LEGADA (10945), PROVA-DE-REPLAY-POR-ATOR (10951); ABERTA: FILA-POR-USUARIO (10957, dono B-O6R-03b, **bloqueia a ativação do Ω6R-QUA-001**), CONTRATO-CONFLITO-POR-ACAO (10964, inclui N-03), APP-RECEIPT-ATTACH-NAO-SUPORTADO (10971), TRANSIENT-CODES-DUPLICADOS (10976), PUBLICACAO-SEM-WRITER-ANTIGO (10981). Coincide com o esperado.
- lastro de cada "fechada": `/tmp/c3/lastro.sh` (md5 f114e1f6…; 1ª versão be6c6a3d tinha regex sem indentação e dava 0 nos T-A/T-C — controle A99 não discriminava; corrigido o MEU extrator) sobre os 3 arquivos de teste + dev.md do blob → testes citados A7 B3 A7b A11 A11b′ A11c A11d B6 C7 C8 A3′ A3c A12′ A12b B1′ B7′ C3 C9: **18/18 com título 1×**; controle A99 → 0 (acusa). Mutações citadas m9a m9b M11 M11′ M11″ M12 M13 M16 M10c M10i C3mut M15 M17 M17M10c: todas na matriz R11 do relatório (l.222-268) com alvo, resultado VERMELHO e razão; controle Mzz → 0. M11′/M11″ = M11p/M11pp (R11b).
- vermelho-controle 1: o extrator aponta título inexistente (A99 → 0) e mutação inexistente (Mzz → 0).
- Veredito parcial 3(a): VERDE.

### 3(b) DIN-009 e QUA-001
- REGISTRO_ACHADOS_O6R.md (blob): DIN-009 l.612 "Status: fechado NA AUTORIA do B-O6R-03a (… PR e head a preencher pelo orquestrador …)", cita PUBLICACAO-SEM-WRITER-ANTIGO; não diz produção. QUA-001 l.494: seção sem linha Status nova (não fechado; o diff B..objeto não toca a seção); o estado ABERTO/dono 03b está em pendencias.md l.2917.
- achados.jsonl: `git diff --name-only B HEAD -- docs/revisoes/O6R/achados.jsonl` → 0; DIN-009 e QUA-001 com `"status": "ativo"`.
- guard `node --test --import tsx tests/kpi-achados-paridade.test.ts` no objeto → ec=0, 6/6 pass, 0 skip.
- vermelho-controle 2: em /tmp/w-mut, DIN-009 → "fechado" no jsonl e linha Status removida do MD → ec=1, 3 fail (testes 2, 3, 6). Restaurado (porcelain=0).
- Veredito parcial 3(b): VERDE.

### 3(c) passo 0, contrato, KPI, approved_head
- decisoes.md (blob): D-03a-MESMA-CHAVE-OUTRO-ATOR = A l.3432; "Registro de 11/10/2026 (noite) — passo 0" l.3534-3553 com (1) PLANO_SAN3.md:243, (2) Runbook A + trava (c) do CD, (3) incidente R11a. Presente.
- API_CONTRACTS.md: +46/-1; o único bloco novo é `mobile_expense_sync@2026-10-11.b-o6r-03a`; a linha `-` é a descrição da rota na tabela (reescrita). Mérito é da C2.
- `git diff --name-only B HEAD -- Kpis | wc -l` → 0 (KPI congelado respeitado).
- approved_head/merge_commit do #425: nenhum inventado; registro diz "PR e head a preencher pelo orquestrador"; os mandatos dizem "approved_head: AUSENTE".
- Veredito parcial 3(c): VERDE.

### 1(a) objeto (mesma forma)
- `/work`, `CORE_SAAS_PERSISTENCE=memory timeout 2400 node scripts/run-backend-tests.mjs > obj.tap; ec=$?` (sequencial, depois da baseline; nada de banco rodando junto) → ec=1 · 562 s · **303 arquivos · 3339 testes · pass 3335 · fail 2 · cancelled 0 · skipped 2** · TAP md5 b82a10031ea6fffb5cb1b0458c911a59.
- títulos (multiconjunto, `LC_ALL=C sort` + `comm`): **sumidos de B no objeto: 0**; **novos: 41** = T-A 24 (A0 A1 A2 A2b A2c A3′ A3c A4 A4b A5 A6 A7 A7b A8 A9 A10 A11 A11b′ A11c A11d A12′ A12b A13 A15) + T-B 8 (B1′ B2 B3 B3b B4 B5 B6 B7′) + T-C 9 (C1–C9). Delta de contagem 3339−3298 = 41 = soma dos novos. O T-A RODOU no job `backend` (DATABASE_URL presente), 24 ok.
- skips: os mesmos 2 do orçamento (RBAC parity).
### 1(b) falhas classificadas
| teste | ref | isolado | causa medida | etiqueta | na outra ref? |
|---|---|---|---|---|---|
| T15 · boot real recusa super antes do Redis e aceita papel limpo (tests/san3-05-runtime-role-guard-db.test.ts) + o pai "B-SAN3-05 · o papel de runtime não contorna FORCE RLS" ("1 subtest failed") | objeto | `node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts` 3× no objeto → 12/12 pass, ec 0 nas 3; 1× em B → 12/12 | `processo filho não encerrou em 3338ms` (teto de relógio `waitForCloseCode`, l.531-536) sob a carga da suíte inteira | (b)/(c) carga — relógio de parede | passou na baseline sob carga; é a `P-SAN3-05-T15-TETO-DE-RELOGIO` (pendencias.md l.10403, aberta 2026-10-09, dono B-ARNES-2; arquivo nasceu em a9fbe283 2026-10-09); `git diff --name-only B HEAD -- tests/san3-05-… src/server.ts src/config src/database` → 0: o bloco não toca o código dela |
- re-execução da suíte inteira no objeto disparada (obj2) para ver se a falha persiste.

- re-execução da suíte inteira no objeto (obj2, mesma linha) → ec=0 · 536 s · 303 arq. · **3339 · pass 3337 · fail 0** · skipped 2 · TAP md5 b9dfe3835d71cfb986ab39834cd0f9e6; títulos idênticos à 1ª execução do objeto (denominador estável). O T15 não persiste → instável de carga conhecido, pre-existente (dono B-ARNES-2), NÃO falha nova do bloco.
- resíduo depois das 3 suítes inteiras (`/tmp/c3/residuo.sh` md5 f49f1b65…): roles do arnês 0 · tenants exp-sync-% 0 · mobile_action_receipts 0 · expense_reports 0 · expense_events 0.
- vermelho-controle 1 (leitor de TAP): cópia de um TAP com o 1º `ok`→`not ok` e `# skipped 0`→`1` → o leitor aponta NOT_OK 1 e skipped 1. Acusa.
- vermelho-controle 2 (guard do CI): trecho extraído do blob do ci.yml (/tmp/c3/guard.sh md5 45d3bd20…) → TAP verde ec=0; TAP com 1 skip ec=1 ("PULOU 1 teste(s)"). Real.

### 1(c) bateria do bloco, isolada (objeto, meu banco)
- T-C `timeout 300 node --test --import tsx tests/expense-sync-fingerprint.test.ts` → ec=0 · 9/9 pass · 0 fail · 0 skip.
- T-B `CORE_SAAS_PERSISTENCE=memory timeout 300 node scripts/run-backend-tests.mjs tests/expense-management-routes.test.ts` → ec=0 · 14/14 · 0 skip.
- T-A `timeout 600 node --test --import tsx tests/expense-sync-atomic-db.test.ts` ×3 seguidas → ec 0/0/0 · **24/24 · 24/24 · 24/24**, 0 fail, 0 skip, 14 s/13 s/12 s; TAP md5 e7c0cd50/23faa15d/71ba9213. Denominador constante 24. Ocorrências de 25P02/40P01/"current transaction is aborted"/deadlock FORA de títulos: 0 nas 3 (a única linha é o `# Subtest:` do título do A1).
- bateria total 24+14+9 = **47**.
- vermelho-controle 3 (a suíte falou com o MEU banco): vigia a cada 2 s no meu cluster durante cada T-A → `tenants exp-sync-%` > 0 em 6/6/5 amostras e `pg_stat_activity` com application_name `…expense-sync-atomic…` = 11–13 conexões; depois do fim, 0. Acusa.
### 1(d) o T-A sem banco
- `env -u DATABASE_URL … expense-sync-atomic-db.test.ts` → **ec=0, tests 1, skipped 1** ("B-O6R-03a T-A exige DATABASE_URL e um banco migrado # SKIP"). O T-A PULA declarando sem DATABASE_URL — o corpo pede falha; o plano v2 (blob l.129) exige só "sem skip COM DATABASE_URL", e o comentário do ci.yml declara o pulo. Esse pulo é barrado pelos dois gates: o guard do backend-postgres sobre ESTE TAP → ec=1 ("PULOU 1"), e o job `backend` tem o passo "Guard required env" (DATABASE_URL ausente → exit 1). Ver achado-nota N2 (critério do corpo sem norma na ref; não reprova, §A7).
- `DATABASE_URL=postgresql://x:y@127.0.0.1:1/none` (porta fechada) → ec=1 · 24 fail · 0 skip. Falha.

## Sucessor 2026-10-13T22:36:00Z (Codex)

papel: C3 | identidade: jurado-o6r03a-v2-regressao-cdx (sucessor P3, identidade nova) | modelo: GPT-5.6 Sol · esforço high · nível menor (fonte: CLAUDE.md §C7.6 no objeto e decisão do dono de 12/10 no disparo) | mandato_md5 cru: 182184fa7a3a880fbc618bffd0c92e20 (declarado no disparo: 182184fa7a3a880fbc618bffd0c92e20, CONFERE) | corpo_md5 EOL-neutro: 1fdfb5c1108376ebdcc4f49b102166e9 (declarado: igual, CONFERE)

### S0 — retomada P3 e legalidade própria

- Li integralmente a evidência anterior (122 linhas). Todas as conclusões anteriores são roteiro: reexecuto os comandos equivalentes no meu terreno antes de usá-las.
- Disco antes do worktree: `df -h /c` sob Git Bash excedeu timeout de 15 s (`ec=124`); medição equivalente nativa `Get-PSDrive C` = **25,84 GB livres**, acima do piso de 10 GB. `C:/Users/AMP/w-j03a-c3` estava livre; worktrees alheios apenas listados, não tocados.
- Head por duas fontes: `git ls-remote origin refs/heads/fix/expense-sync-atomic` = `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`; `gh pr view 425 --json ...` = mesmo `headRefOid`, PR OPEN, base main, draft=false, mergeable=CONFLICTING. Objeto próprio fixado nesse SHA.
- `git fetch origin main` (`ec=0`): `origin/main` inicial = `f59ad1d6caaa9da3f451f1ad57e5b9e3ea8a235a`; `B = git merge-base origin/main objeto` = `9566d55bd719ce7d7a545281c57923a25f883ed3`; objeto não é merge, pai único `5cee8e5754888ef138d8d8b2bcb9ad9c37907ad5`. A main avançou desde o parecer (684e9afd→f59ad1d6), mas B permaneceu 9566d55b.
- Check-runs próprios: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<objeto>/check-runs?per_page=100` → total 14, não-verdes 0, pendentes 0. Todos `completed/success`: docker 114605355851/114602966470; authority-portal 114603778347/114601463367; owner-portal 114603774998/114601463434; frontend 114603767545/114601463195; backend-postgres 114603751105/114601463352; flutter 114603750967/114601463359; backend 114603750102/114601463382.
- Parecer lido integralmente: `insp-03a-parecer.md` = LIBERADO COM RESSALVA; confere nome-base/corpo/worktree/cluster. Aplico R2 do inspetor: sucessor P3 tem identidade nova; a cláusula “mesma identidade” do corpo vale somente para retomada de PAUSA.
- Veredito parcial S0: **LEGAL para medir**, com objeto fixo, CI concluído e piso de disco atendido.

## Sucessor 2026-10-14T00:16:00Z (Codex 2)

papel: C3 | identidade: jurado-o6r03a-v2-regressao-cdx2 (terceiro ocupante, sucessor P3 com identidade nova) | modelo: GPT-5.6 Sol · esforço medium · sem Fast · nível menor (fonte: CLAUDE.md §C7.6 no objeto e decisão do dono de 12/10 no disparo) | mandato_md5 cru: 182184fa7a3a880fbc618bffd0c92e20 (declarado: igual, CONFERE) | corpo_md5 EOL-neutro: 1fdfb5c1108376ebdcc4f49b102166e9 (declarado: igual, CONFERE)

### S0 — sucessão P3 e terreno herdado

- Li integralmente o corpo de 711 linhas, o mandato Forma A, o parecer LIBERADO COM RESSALVA e as 136 linhas de evidência anteriores; não li arquivos C1/C2. As conclusões anteriores são apenas roteiro até reexecução equivalente própria.
- Gates próprios: corpo `git show b75a0c2e…:.claude/agents/especialistas/jurado-o6r03a-v2-regressao.md | tr -d '\r' | md5sum` = `1fdfb5c1108376ebdcc4f49b102166e9`; mandato `md5sum C3.md` = `182184fa7a3a880fbc618bffd0c92e20`.
- Disco antes de criar/reusar terreno: `Get-PSDrive C` = 22,64 GB livres (> piso 10 GB). `df -h /c` em chamada combinada não retornou antes do timeout; medição nativa é a equivalente usada.
- O caminho obrigatório `C:/Users/AMP/w-j03a-c3` já existia, deixado pelo segundo ocupante em `B=9566d55bd719ce7d7a545281c57923a25f883ed3`, `git status --porcelain` vazio e sem `node_modules`. Não o aceitei como prova; ele é apenas o terreno próprio desta cadeira parado no ponto de baseline, como a sucessão descreve. `w-j03a-c3b` não existe.
- Veredito parcial S0: **LEGAL PARA REEXECUTAR**, sujeito à nova resolução git+gh/check-runs e à validação do worktree/isolamento abaixo.

### S0 — legalidade própria concluída

- Head por duas fontes próprias: `timeout 60 git ls-remote origin refs/heads/fix/expense-sync-atomic` (ec=0) e `gh pr view 425 --json headRefOid,…` = `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`; PR OPEN, base main, draft=false, mergeable=CONFLICTING. Corpo do PR relido integralmente.
- `git fetch origin main` ec=0; `origin/main=f59ad1d6caaa9da3f451f1ad57e5b9e3ea8a235a`; `B=9566d55bd719ce7d7a545281c57923a25f883ed3`; objeto tem pai único `5cee8e5754888ef138d8d8b2bcb9ad9c37907ad5`.
- Check-runs próprios: total=14, não-verdes=0, pendentes=0; todos `completed/success`: docker 114605355851/114602966470; authority-portal 114603778347/114601463367; owner-portal 114603774998/114601463434; frontend 114603767545/114601463195; backend-postgres 114603751105/114601463352; flutter 114603750967/114601463359; backend 114603750102/114601463382.
- Worktree herdado validado: `.git` existe; HEAD=B; status 0; sem junctions (`cmd /c dir /AL` = “Arquivo não encontrado”); sem `node_modules`. Ferramentas host: Node v20.19.5, npm 11.7.0, Docker 29.6.1. Base viva e containers/portas alheios não tocados.
- Comparação com ocupantes anteriores: head, main, B, pai e 14 check-runs coincidem com a medição do segundo ocupante; IDs coincidem. Legalidade reexecutada, não herdada.
- Veredito parcial S0: **VERDE**.

### Item 1 — reexecução própria da regressão e do banco (P3)

- Baseline `B=9566d55bd719ce7d7a545281c57923a25f883ed3`, no `teste-linux.sh`, forma `npm test`: **301 arquivos, 3298 testes, 3296 pass, 0 fail, 2 skip**, ec=0. Objeto, primeira passagem idêntica: **303 arquivos, 3339 testes, 3335 pass, 2 fail, 2 skip**, ec=1; as duas linhas são T15 + pai por teto de relógio. T15 isolado no objeto 3×: **12/12, ec=0** nas três. Segunda suíte integral do objeto: **3339, 3337 pass, 0 fail, 2 skip**, ec=0. Diferença multiconjunto: nenhum título removido e **41 novos = T-A 24 + T-B 8 + T-C 9**.
- Classificação da única oscilação: `tests/san3-05-runtime-role-guard-db.test.ts` não é tocado por `B..objeto`; nasceu antes do bloco e a pendência `P-SAN3-05-T15-TETO-DE-RELOGIO` já estava aberta, dona `B-ARNES-2`. Os logs próprios do CI no head mostram `backend` com 3339/3337/0/2 e T15 verde. Portanto é **pre-existente, não bloqueante**, com origem e dono medidos.
- Bateria isolada pelo lançador obrigatório, sempre em Postgres 16/Redis 7 descartáveis sem portas publicadas: T-C **9/9**; T-B **14/14**; T-A **24/24, 24/24, 24/24**, zero skip. Na forma do `backend-postgres`, a lista de 43 suítes + seed + `RBAC_DB_PARITY=1` passou **3× seguidas, 339/339, zero skip**. As tentativas sem a variável e sem seed foram marcadas inválidas, não usadas como verde.
- CI como insumo reexecutado: job `backend-postgres` no head contém T-A na lista e fecha **339/339/0/0**; job `backend` fecha **3339/3337/0/2**. Os 14 check-runs do head estão `completed/success`.
- Controle de banco: com `DATABASE_URL` removida, T-A declara um skip (1/1), mas o guard real do `backend-postgres` transforma esse TAP em ec=1 e o passo `Guard required env` também falha fechado. Com URL em porta fechada, T-A dá **24 fail, 0 skip, ec=1**. O corpo esperava falha direta sem URL; a norma do plano na ref exige “sem skip COM DATABASE_URL” e o CI impede o falso verde. Registro como nota de critério, sem defeito do bloco.
- Resíduo após T-A completo: roles=0, tenants=0, receipts=0, reports=0, events=0. Controle de aborto duro `timeout 1` deixa roles=2, tenants=5, receipts=3, reports=3, events=6. A origem é anterior ao bloco: `P-O6R-ARNES-ISOLAMENTO` (2026-08-18) já registra ausência de varredor depois de SIGKILL e tem dono próprio ainda não aberto; o helper antecede o T-A. Classificação: **pre-existente**, não bloqueia este bloco; número, forma e causa publicados aqui.
- Veredito parcial do item 1: **VERDE**, aceitando as duas pendências preexistentes nomeadas e a nota do gate sem URL.

### Item 2 — escopo, regressão e matriz de mutações (P3)

- `git diff --name-status B objeto` lista **33 caminhos**. Busca nos proibidos (`prisma`, `migrations`, `infra`, `Kpis`, `mobile`, `frontend`, `src/database`, `scripts`, manifests/locks, `.env`, controller/routes) = vazio. `ci.yml` é +5/−0 (comentários + T-A); `validators.ts` é +1/−1 só na regex UUID; `expense-management-routes.test.ts` é +398/−1, com os seis testes anteriores preservados. O classificador de controle acusa caminhos inventados `prisma/**` e `Kpis/**` como FORA.
- O objeto é commit simples; o merge-base é o segundo pai do merge `6798a76f`. `git diff 6798a76f^1 6798a76f -- <produto/testes/CI/contrato>` = vazio: a integração anterior não perdeu produto do bloco.
- Reexecução independente do `spec` publicado: parse AST somente até a atribuição `spec`; **36 entradas, 42 edits, 36/36 âncoras presentes exatamente uma vez e 36/36 blobs mudam**, BAD=0. Controle M16 aplicado só em memória: âncora original 0, texto mutante 1, classificador acusa. Isso revalida o incidente R11a no objeto atual, sem herdar a frase do dev.
- Controles executáveis próprios no `teste-linux.sh`: `m9b` torna **A7 ec=1** (FK do evento) e **B3 ec=1** (payload_mismatch); `M14` torna B5 ec=1 (“a segunda transação ESPERA…”); `M14r` torna B5 ec=1 (“a transação que falhou não deixou NADA…”). `m1` sobrevive conforme previsto: `npm run check` ec=0 e A1+A2 **2/2**. `m6` sobrevive conforme previsto: A1+A2c+A6 **3/3**, inclusive o estresse de 10 reenvios × 5 rodadas. Todos os arquivos do worktree foram restaurados ao blob após cada controle.
- A evidência anterior de memória foi reexecutada pelo equivalente: B5 limpo está incluído na suíte integral e na bateria T-B; os dois mutantes de serialização/restore acima ficaram vermelhos. O comportamento de banco de m9b foi refeito em cluster próprio. A matriz fecha no resultado declarado: **34 mortos por asserção, 2 sobreviventes previstos (`m1`, `m6`)**.
- Veredito parcial do item 2: **VERDE** — nenhum arquivo proibido, nenhum teste anterior removido e controles discriminantes.

### Item 3 — registro, números e fechamento (P3)

- Pendências e lastro rechecados no blob: o grupo `P-O6R-B03*` mantém DIN-009 fechado na autoria, QUA-001 aberto/dono 03b e os riscos de ativação/publicação nomeados. O extrator anterior foi reexecutado contra os três testes e o relatório: **18/18 títulos citados existem 1×**, A99=0; todas as mutações citadas existem na R11 e Mzz=0.
- `REGISTRO_ACHADOS_O6R.md` diz “fechado NA AUTORIA”, sem alegar merge/produção; `achados.jsonl` mantém DIN-009 e QUA-001 ativos até merge. Guard limpo `tests/kpi-achados-paridade.test.ts`: **6/6**. Controle em cópia Linux (DIN-009 fechado no JSONL + remoção do status no MD): **3 fail, ec=1**; acusa estado, data e `aguardando_merge`.
- Decisão e passo 0 presentes no objeto: `D-03a-MESMA-CHAVE-OUTRO-ATOR = A` e seção “passo 0” com os três conflitos. `API_CONTRACTS.md` adiciona o contrato versionado; `Kpis/*` tem diff vazio; `approved_head`/`merge_commit` não foram inventados.
- Números recontados: **108** diretórios de migração existentes e zero novo; bateria real própria **47 = 24+14+9**; suíte Linux do objeto **3339/3337/0/2**; matriz **36 = 34+2**; T-A 3× sem skip. O corpo do PR atribui 3329/3321/6/2 à execução Windows do dev, explicitamente em outra forma/terreno; não a mistura com a execução Linux desta cadeira.
- Re-resolução ao fechar: `git ls-remote` e `gh pr view 425` continuam em `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`; PR OPEN, não draft, base main. Nenhuma alteração local de produto permaneceu.
- Veredito parcial do item 3: **VERDE**.

### Conclusão C3

- Critérios que não puderam falhar e não falharam: nenhum teste anterior sumiu; T-A executou 3× em Postgres descartável com zero skip; 34 mutantes exigidos morreram e os dois sobreviventes eram previstos; nenhum caminho proibido/KPI/migração entrou; registro e painel ficaram coerentes e o guard acusou adulteração.
- Achados dentro do bloco que bloqueiam: **nenhum**.
- Pendências aceitas, todas com escopo/origem: `P-SAN3-05-T15-TETO-DE-RELOGIO` (pre-existente, `B-ARNES-2`) e `P-O6R-ARNES-ISOLAMENTO` (pre-existente, bloco próprio ainda não aberto). Nota não bloqueante: T-A sem URL pula diretamente, mas os dois gates do CI recusam esse estado.
- **VOTO: APROVADO.**

### Teardown e selo final

- Antes da remoção: worktree próprio em `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`, `git status --porcelain` vazio; nenhum container `tl*` ativo. `git worktree remove --force C:/Users/AMP/w-j03a-c3` ec=0; caminho removido. Nenhum recurso `jtrc01-*`, `j03a-c1/c2-*`, base viva ou porta proibida foi tocado.
- Depois da remoção: nenhum container `tl*`; disco C: **20,64 GB livres**. Selo remoto final por git e gh: head ainda `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`, PR 425 OPEN, não draft, base main.
