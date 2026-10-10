papel: C3 | identidade: jurado-07ca-c3-regressao-escopo | modelo: Claude Opus 5.5 (claude-opus-5-5) · nível menor (substituição declarada §C7.6-bis: o Fable não rodou por decisão do dono D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO, 2026-10-10 — cadeiras de junta no nível menor; fonte: decisoes.md l.3132 no objeto 4ca2be43 e em origin/main 9b611468; não por cota) | mandato_md5: 6715c48de3066a5129c2eedaace0a12f (cru = EOL-neutro; declarado no disparo: 6715c48de3066a5129c2eedaace0a12f) | corpo_md5: 114a51ccaed1894a044123d93ca256ff (EOL-neutro, blob .claude no objeto; espelho .agents f7fcbf9ac3d8cdbc7151c6fd2d109b2d, difere só pelo adaptador Codex esperado: sem linha tools + bloco "Papel para o Codex") (recebido no prompt: n/a — corpo lido do blob por git show no início; publicado no disparo 114a51cc…, igual)

# Evidência — cadeira C3 (regressão, escopo, registro) — junta do B-O6R-07c-a (PR 414), ciclo 1

## Cabeçalho de terreno (2026-10-10T17:25Z)

- objeto: 4ca2be43c3b4b32b9bed670f02d78145620cdc2e — `git ls-remote origin refs/heads/fix/o6r07c-subresource-scope` = `gh pr view 414 headRefOid` (OPEN, isDraft=true, MERGEABLE, base main)
- cerca do mandato (head de geração): d72552634202aafd712a4bde25fe2134285b88c6; `git diff --name-only d7255263 4ca2be43` = só os 3 mandatos C1c/C2c/C3c (registro)
- objeto do inspetor: c8bd4c28; delta c8bd4c28..4ca2be43 = 12 arquivos, todos em agent-orchestration/ (os 7 do #415 + parecer/evidência do inspetor + 3 mandatos) — só registro
- B = git merge-base origin/main objeto = 9b611468902f3984d7704ef2dd6e3ad1d0c08b3a (= origin/main no início)
- merges em B..objeto: 762ac5ad (pais c8bd4c28, 9b611468 = #415) e 054dada2 (pais d4cd35e3, ab52ec50 = #389)
- commits em B..objeto: 20 (first-parent: 18 do ramo + os 2 merges); autor thiagodorgo em todos
- host: MINGW64_NT-10.0-22631 x86_64 · node v20.19.5 · git 2.53.0.windows.2 · docker server 29.6.1
- disco livre C: 14G (df -h /c) no início — acima do piso de 10 GB do disparo
- ambiente: nenhum export; MSYS_NO_PATHCONV=1 só como prefixo de comando
- leitura de outras cadeiras: NENHUMA (o diretório tem 07ca-C1-* e 07ca-C2-*; não abri)

## Legalidade

### L1 — corpo e mandato (17:20Z)
- `git show 4ca2be43:.claude/agents/especialistas/jurado-07ca-c3-regressao-escopo.md | tr -d '\r' | md5sum` → 114a51ccaed1894a044123d93ca256ff (= publicado pelo inspetor) · espelho .agents → f7fcbf9a… (diff = só adaptador Codex)
- `md5sum 00-mandatos/C3c.md` → 6715c48de3066a5129c2eedaace0a12f (= disparo); EOL-neutro igual
- veredito parcial: VERDE — voto permitido

### L2 — parecer do inspetor (17:24Z)
- `insp-07ca-parecer.md` (blob no objeto = disco, md5 EOL-neutro e3a464f8…) → **LIBERADO COM RESSALVA**, objeto c8bd4c28, confere o nome jurado-07ca-c3-regressao-escopo (3.1: 0 no obituário), corpo commitado nos dois espelhos (4.1), worktree e containers próprios com prefixo j07ca-c3- (1.2). R3: diretório real votos/B-O6R-07c/ (o mandato nomeia; vale o mandato)
- veredito parcial: VERDE (liberado com ressalva; delta até o objeto atual só registro)

### L3 — check-runs no objeto (17:27Z)
- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/4ca2be43…/check-runs?per_page=100` → arquivo $SCRATCH/checkruns.json
- total 13 | não-verdes 0 | pendentes 1. Run 38069991906 (pull_request, attempt 1): 7/7 success, inclusive backend (17:00:54→17:10:12) e backend-postgres. Run 38069987168 (push, attempt 2): backend **in_progress** (re-execução iniciada 17:24:25Z), backend-postgres success, docker ainda sem check-run nesta tentativa.
- veredito parcial: o objeto TEM check-runs concluídos (run pull_request inteiro verde); o job backend do push está re-executando — re-meço no fim; não herdo o estado do disparo.

### L4 — main, merges e base do bloco (17:22Z)
- `git fetch origin main`; `git rev-parse origin/main` → 9b611468902f3984d7704ef2dd6e3ad1d0c08b3a
- `git merge-base origin/main 4ca2be43` → B = 9b611468 (a main de agora inteira já está no ramo)
- `git rev-list --merges --parents B..O` → 762ac5ad (c8bd4c28 + 9b611468) · 054dada2 (d4cd35e3 + ab52ec50)
- `git log --first-parent B..O` → 18 commits de ramo + 2 merges; os do produto: 99c5912d (guard+testes), d8900248 (fix src), f423e1a0 (-db), a0dafa05 (fixture); o resto docs/registro/junta
- veredito parcial: base do bloco = B = 9b611468; diff do bloco = B..O. `c1cfdabe` NÃO é base.

## Item 1 — Regressão

### 1a.0 — a régua, regenerada pela regra escrita (17:40Z)
- regra lida no §4 da v1 (`git show 00109988:docs/revisoes/SAN3/B-O6R-07c-plano.md`, l.407-409): "lista gerada por `git grep` dos caminhos/handlers do §2 sobre `tests/` + as de nome `mobile|evidence|dispatch|checklist|comment|mileage|geocod|o6r07a-wo`", não-`-db`.
- script: $SCRATCH/gera-regua.cjs (md5 c9866822ab3594ba3d38cbe470a4c5f2; sem barra invertida, gravado por heredoc). Decisões declaradas: (D1) vias do §2 = as 36 NA PROPRIEDADE (OS, VISTORIA, DESPACHO, EVIDENCIA-OS) da tabela §2.1; (D2) caminho com `:param` → regex de segmento livre; via de sync → endpoint E literal do tipo; (D3) "handlers" fora — o §2 não lista handlers; (D4) universo = `tests/*.test.ts` (o que o runner expande) − `*-db.test.ts` − `o6r07c-*`.
- `node gera-regua.cjs plano-v1.md <wt do objeto> regua-objeto.txt` → vias=36 · padrões=53 · universo=258 (de 301) · **régua=80** (nome 11 · grep 49 · nome+grep 20)
- a mesma regra sobre `tests/` de `c1cfdabe` (git -c core.autocrlf=false archive c1cfdabe tests) → **80** também (universo 257 de 293): os testes que entraram depois de c1cfdabe não mudam a régua.
- por que não 44: 32 dos 80 entram SÓ pelo padrão da via 1 (`PATCH /work-orders/:workOrderId` → `work-orders/<seg>`), que casa qualquer teste que toque uma OS por id; a regra não diz como grepar caminho com parâmetro (ambiguidade D2). 80 − 32 = 48 ≈ 44. Uso o superconjunto de **80**, declarado.
- veredito parcial: régua = 80 suítes (superconjunto da regra; o "44" do plano não é reproduzível pela regra escrita → nota sobre o plano, não defeito do bloco).

### 1.T — terreno (17:45Z–17:55Z)
- worktree próprio: `git -C <repo> worktree add --detach C:/Users/AMP/w-ciclo1-07ca-c3 4ca2be43` → ec 0; `test -e .git` ok; HEAD 4ca2be43; porcelain 0 (caminho estava livre)
- rede `j07ca-c3-net`; containers `j07ca-c3-pg` (postgres:16, PG 16.14), `j07ca-c3-redis` (redis:7), `j07ca-c3-node` (erp-junta-node20-pg16:local, Node v20.20.2, npm 10.8.2, psql 16.14, Linux 6.18.33.2-microsoft-standard-WSL2 x86_64). `docker ps` → ports só "5432/tcp", "6379/tcp" expostos na rede, **nenhum publicado no host**. Base viva (`erp-postgres`, `erp-redis`) não tocada.
- senha do cluster: 48 hex aleatórios por execução, em arquivo do $SCRATCH, entra por `docker run/exec -e NOME` sem valor (atribuição como prefixo do comando, nada exportado). Ressalva honesta: numa conferência de vazamento usei `grep -c "<senha>"` no host — a senha descartável passou 1x pelo argv de um `grep` MSYS local; não é segredo real, morre com o container, e nos logs deu 0 ocorrência.
- ajuste de terreno (não do produto), declarado: `apt-get install git` no container (git 2.47.3) porque o guard chama `git ls-files src` (tests/helpers/o6r07c-census.ts:224 no objeto).
- árvore: `git -c core.autocrlf=false archive 4ca2be43 | docker exec -i j07ca-c3-node tar -xf - -C /work/obj` → ec 0/0; `git hash-object --no-filters --stdin-paths` no container × `ls-tree -r` do host → **4014/4014** byte-idênticos; `git init && git add -A -f && git write-tree` no container → e072733a87ba964c80adf72704250c0e811d64e3 = `git rev-parse 4ca2be43^{tree}` (árvore inteira idêntica); `git ls-files src` (container, 781) × `git ls-tree -r --name-only 4ca2be43 src` (host) → diff vazio.
- `npm ci --no-audit --no-fund` no container → ec 0 (326 pacotes); `npx prisma generate` ec 0; `npx prisma migrate deploy` ec 0 (108 migrations, "All migrations have been successfully applied")
- disco C: 18G livres após o npm ci
- veredito parcial: terreno de pé, árvore = objeto, sem porta no host.

(correção de relógio: as horas "17:40Z" e "17:45Z–17:55Z" acima foram estimadas; o relógio medido por `date -u` estava em 17:25Z no início e 17:33Z no início da régua. Daqui em diante, hora medida.)

### 1a.1 — régua no OBJETO (17:33:08Z → 17:35:36Z)
- `docker exec -w /work/obj j07ca-c3-node sh -c 'env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory timeout 900 node --test --import tsx --test-reporter=tap $(cat /work/regua.txt)' > regua-obj.tap 2>&1` → ec=1
- leitor de TAP ($SCRATCH/leitor-tap.cjs, md5 939cc8447495cd76cc8ffac7d69b6a1e): **tests 785 · pass 779 · fail 2 · skipped 4** (contagem própria: 783 ok + 2 not ok, 4 SKIP)
- os 4 pulos: auto-pulos DECLARADOS sem banco — impound-checklist-link-autolink, impound-process-checklist-link-schema, o6r06-usage-fault-injection, rls-tenant-isolation ("requires DATABASE_URL and a migrated database")
- as 2 falhas: `tests/domain-events.test.ts` — "domain event publishes mapped checklist attachment job" e "…notification job for checklist completion", erro `connect ECONNREFUSED 127.0.0.1:6379` (a forma da régua tira o REDIS_URL). Isolado COM `REDIS_URL=redis://j07ca-c3-redis:6379` → 4/4 pass, ec 0. Arquivo fora do diff do bloco (`git diff --name-only B O | grep -c domain-events` = 0); nasceu em 2c37ce93 (2026-06-08, `git log --diff-filter=A origin/main`). → artefato da FORMA da régua (sem Redis), não do bloco; confiro igual na base.
- vermelho-controle do leitor: cópia do TAP + 1 `not ok` + 1 `# SKIP` → contagem própria 2→3 e 4→5 (acusou); o arquivo lido recebe stdout+stderr (`> f 2>&1`).
- veredito parcial: régua no objeto 785/779/2/4, as 2 falhas são Redis ausente pela forma; falta a base.

## Item 2 — Escopo (medido no host, só git/leitura, enquanto o npm test roda no container) — até 17:41:31Z

### 2a — listas extraídas do blob do plano no objeto
- `git show 4ca2be43:docs/revisoes/SAN3/B-O6R-07c-plano.md` → $SCRATCH/plano-v3.md; extrator $SCRATCH/extrai-listas.cjs (md5 15ad39359d8031dd21c84df7929d6522), crases do parágrafo "**Permitido (caminhos exatos):**" até "**Proibido:**" e deste até "**Worktrees de outros agentes" → permitido 26 itens entre crases (inclui as restrições "só getForMutation, setMileage, geocodeById, geocodeDestinationById"), proibido 22 itens; + §C4 (prisma/**, migrations/**, infra/**, .env*, lockfiles, pubspec).
- o 07c-a.5 NÃO lista `agent-orchestration/controle/decisoes.md`, mas a seção "## Registro" do MESMO plano manda (R.4, último item) "registrar em `controle/decisoes.md` como decisão do orquestrador, no PR do 07c-a" as travas reordenadas → classifico como registro mandado pelo plano.
- veredito parcial: listas extraídas por script.

### 2b — cada arquivo do diff do bloco (base B = 9b611468)
- `git diff --name-only B O` → 38 arquivos (29 A, 9 M). Classificador $SCRATCH/classifica.cjs (md5 3c4097148acb8bdd128f9daf723f640c):
  - permitido 25: os 4 de src/ do 07c-a.5; tests/helpers/o6r07c-census.ts, tests/fixtures/o6r07c-classificacao-vias.json, tests/fixtures/o6r07c-formas/** (7), os 3 tests/o6r07c-*; API_CONTRACTS.md; controle/pendencias.md; controle/pendencias-indice.md; omega/juntas/** (6: 4 mandatos, evidência e parecer do inspetor)
  - artefato 12: 6 corpos jurado-07ca-* (.claude + .agents), 5 docs/revisoes/SAN3/B-O6R-07c-* (plano, críticas r1/r2, relatórios do dev e da fábrica), controle/decisoes.md (R.4)
  - proibido 0
  - "fora" 1: tests/work-order-attachments-routes.test.ts → é fixture da régua (está nos 80); julgada abaixo pela regra (i)/(ii)
- autoria/commits: todos os 20 commits de B..O são de thiagodorgo; produto em 99c5912d (guard+testes), d8900248 (src), f423e1a0 (-db), a0dafa05 (fixture); registro do bloco em d7255263; corpos em 98803254; mandatos em c8bd4c28/4ca2be43.
- vermelho-controle 1 (classificador): lista fabricada {prisma/schema.prisma, core-saas/permissions/catalog.ts, src/modules/mobile/mobile-work-order-sync.ts, Kpis/kpis-latest.json, src/modules/damages/damage.service.ts, .github/workflows/ci.yml} → proibido 6/6 (acusou).
- veredito parcial: PROIBIDO vazio; nada fora do permitido além da fixture da régua.

### 2b.1 — work-order.service.ts bloco a bloco
- `git diff -U0 B O -- src/modules/work-orders/work-order.service.ts` → 4 blocos. Método que contém cada um, pelo último cabeçalho de método do blob (objeto/base):
  - @@-199/+199 → geocodeById (base l.194; objeto l.194) PERMITIDO
  - @@-288/+287 → geocodeDestinationById (base l.283; objeto l.282) PERMITIDO
  - @@+839..852 → bloco NOVO que define `async getForMutation(` (1 ocorrência no trecho), inserido depois do fim de assertMutationObjectScope (o cabeçalho mais próximo acima é o dele) PERMITIDO
  - @@-1253/+1264 → setMileage (base l.1247; objeto l.1258) PERMITIDO
- corpo intocado do 07a: md5 do corpo (cabeçalho até "  }") em B e no objeto — update 296d5a58099d = 296d5a58099d (95 linhas); changeStatus 89649edafaac = 89649edafaac (71 linhas); assertMutationObjectScope 4cdf88a28a51 = 4cdf88a28a51 (33 linhas) → **sem diff**.
- vermelho-controle 1 (cont.): linha fabricada dentro de changeStatus (l.1336) → "changeStatus FORA"; dentro de update (l.858) → "update FORA" (acusou).
- veredito parcial: só os 4 métodos permitidos.

### 2b.2 — API_CONTRACTS.md e registro (contador de APPEND)
- $SCRATCH/conta-append.cjs (md5 c830f668f0bd21c272451b504b20a909): por linha "-", diz se as palavras dela sobrevivem em ordem nas linhas "+" do mesmo hunk.
  - API_CONTRACTS.md: 4 linhas "-", 0 sumiu — as 4 linhas nomeadas pelo plano (anexos, geocode, comentários, /mobile/sync/work-order-actions), cada uma estendida com um trecho "**B-O6R-07c-a:** …".
  - controle/decisoes.md: 0 linha "-" (APPEND de 10 linhas: "## Registro do B-O6R-07c-a" + D-07C-TRAVAS-REORDENADAS).
  - controle/pendencias.md: **1 linha "-"**, texto PRESERVADO: a linha de status da `P-O6R-SUBRECURSO-OBJECT-SCOPE` virou "ABERTA — PARCIAL (2026-10-10, com o merge do PR #414 …). Antes: ABERTA · **severidade:** ALTA · …" (o texto antigo segue inteiro depois de "Antes:"). Não é APPEND puro, mas nada sumiu, e é a própria entrada que o plano (R.4) manda passar a PARCIAL neste PR.
  - log-execucao.md: sem diff no bloco.
  - pendencias-indice.md: 340/335 (índice gerado; o permitido diz "(gerador)").
- vermelho-controle 3 (contador): diff fabricado com "-## P-ALHEIA status: ABERTA" sem "+" → sumiu=1; "-- **status:** ABERTA · ALTA" trocado por "+- **status:** FECHADA · ALTA" → sumiu=1 (acusou os dois).
- veredito parcial: registro só por acréscimo, salvo 1 linha de status reescrita com o texto antigo preservado (nota).

### 2b.3 — fixture da régua (classes (i)/(ii))
- único teste pré-existente mudado: tests/work-order-attachments-routes.test.ts (commit a0dafa05). Bloco: o teste "[RBAC] upload: field_technician e manager 201; …" passa a atribuir a OS (POST …/assign pelo manager, com `assert.equal(atribuida.status, 200)`) a um técnico UUID e a gravar com `x-user-id` dele; o esperado `assert.equal(asTech.status, 201)` fica igual; auditor 403 e viewer 403 iguais.
- contagem: `assert.|expect(` 42 (B) → 43 (objeto); `test(` 12 → 12. → **classe (i)** (OS sem atribuição no arnês → atribuir), nenhuma asserção mais fraca nem esperado trocado.
- veredito parcial: fixture dentro da regra.

### 2b.4 — mutações temporárias, Kpis, diff --check, espelho
- `git diff --quiet B O -- <f>` ec=0 para: src/modules/mobile/mobile-work-order-sync.ts, core-saas/permissions/catalog.ts, work-order-comments/work-order-comment.routes.ts, src/modules/attachments, work-orders/work-order.types.ts, work-orders/work-order.routes.ts, src/app.ts, **Kpis/**, prisma/, .github/, package.json, package-lock.json, tests/o6r07a-wo-object-scope.test.ts
- irmão não-vazio (vermelho-controle 3): tests/o6r07c-census-guard.test.ts ec=1; work-order.service.ts ec=1
- `git diff --check B O` → ec=0, saída 0 linhas
- `node scripts/sync-agent-agents.mjs --check` no meu worktree → ec=0 "52 agentes, espelho consistente". Controle: +1 linha no espelho .agents da C3 → ec=1 "DIVERGE: …"; restaurado (hash-object = blob e20ce993…), porcelain 0, --check ec=0.
- vermelho-controle 2 (a base importa): `git diff --name-only c1cfdabe O` → prisma/ 2, .github/ 1, src/modules/inventory/ 8; contra B → 0, 0, 0.
- veredito parcial: sem resto de mutação, Kpis/ sem diff, diff --check limpo, espelho ok.

### 2c — o merge sem conteúdo próprio
- git 2.53 (tem --remerge-diff). `git show --remerge-diff 054dada2` → só a linha de cabeçalho (1 linha); `git show --remerge-diff 762ac5ad` → 1 linha. **Nenhum conteúdo próprio** nos dois merges.
- controle: o mesmo comando sobre merges anteriores do repositório acusa conteúdo — 4535ebb3 (644 linhas), 325030c8 (107 linhas).
- veredito parcial: merges sem conteúdo próprio.

## Item 3 — Registro (host, só leitura) — até 17:44:37Z

### 3a — nenhuma afirmação de fechamento falso
- detector $SCRATCH/detecta-fecho.cjs (md5 ec322708989c00eefd43050f77cfd6a5): linha que cita SEC-002 / P-O6R-SUBRECURSO-OBJECT-SCOPE / P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO / "item 51" e traz verbo/estado de fechamento SEM limitação (não fecha, só fecha, segue, parcialmente_superado, PARCIAL, 07c-b, resíduo…) na mesma linha → AFIRMA_FECHADO.
- fontes: linhas "+" do diff B..O arquivo a arquivo (38 arquivos); `git log --format=%H%n%B B..O` (20 commits); título+corpo do PR #414 (`gh pr view 414 --json title,body` → $SCRATCH/pr414-body.md, 27 linhas); `git show O:API_CONTRACTS.md`.
- resultado: commits 1 citação / 0 afirma ("P-O6R-SUBRECURSO-OBJECT-SCOPE parcial"); PR 2 citações / 0 afirma ("resíduo do crítico Ω6R-SEC-002"; "o Ω6R-SEC-002 só fecha lá" [no 07c-b]); API_CONTRACTS 2 / 0 (as linhas do 07a). Diff: 92 linhas citam; 25 marcadas pelo heurístico — li as 25: 22 nos corpos jurado-07ca (texto de mandato: "fecha as 10 vias", "nada no PR afirma fechado…"), 1 na evidência do inspetor (fonte do C2-09), 2 no plano (l.423 "**Fecha:** as 10 vias … **Não fecha:** a pendência inteira…, o item 51 nem o Ω6R-SEC-002"; l.430 "É nele — e **só** nele [07c-b] — que o Ω6R-SEC-002 fecha"). **Nenhuma** declara fechado o SEC-002, o item 51 ou a pendência inteira.
- pendencias.md no objeto: a P-O6R-SUBRECURSO-OBJECT-SCOPE (l.6713) tem status "ABERTA — PARCIAL (… as 10 vias fechadas por escopo provado; o resíduo é do B-O6R-07c-b)" e apenso l.6802 com "Resíduo: as 23 entradas ·07c-b … Status: PARCIAL. O Ω6R-SEC-002 segue parcialmente_superado". Índice gerado: a entrada segue na tabela com "sim" (l.106), como a P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO (l.171).
- contagens do PR: "10 vias fechadas" (= plano 07c-a.8); "Fica para o 07c-b: vistoria, evidência e despacho" — não diz "todas as vias". Os números de teste do PR (guard 31/31 · vias 24/24 · 07a 8/8 · -db 6/6 · npm test 3234/3230/2/2) são do head d4cd35e3 do dev — confiro contra os meus no item 1.
- vermelho-controle 1: texto fabricado "Ω6R-SEC-002 — status: fechado", "fecha o item 51", "O Ω6R-SEC-002 segue parcialmente_superado" → AFIRMA_FECHADO nas 2 primeiras, "cita" na 3ª (acusou e não acusou certo).
- veredito parcial: nada no objeto, nos commits ou no PR declara fechado o que o bloco não fecha.

### 3b — o registro que o plano atribui a este PR, e o resto com dono
- localizador: `grep -nF <ID>` em pendencias.md e decisoes.md do blob do objeto e de B (= origin/main 9b611468):

| ID | objeto | main (B) | leitura |
|---|---|---|---|
| append P-O6R-SUBRECURSO-OBJECT-SCOPE ("no PR do 07c-a") | pendencias.md l.6765 (status PARCIAL) + l.6802 (apenso) | 0 apensos | AQUI (commit d7255263) |
| D-07C-TRAVAS-REORDENADAS ("no PR do 07c-a") | decisoes.md l.3188 | 0 | AQUI (d7255263) |
| R.1 P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA | pend l.10781 · dec l.3175 | 1 · 1 | na main (#415, 9b611468) |
| R.2 D1-07c / D2-07c / D3-07c | dec l.3164 / 3169 / 3175 | 1 / 1 / 1 | na main (#415) |
| R.3 D-07c-DESPACHO-ALVO | ausente (git grep -i 'DESPACHO-ALVO' no objeto e na main fora do plano/corpos → 0) | 0 | ausente; é o "default do 07c-b" — o próprio plano (R.4: "o 07c-a e o 07c-b gravam cada uma no PR que as produz") dá destino: o PR do 07c-b |
| R.4 P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA | pend l.10816 | 0 | AQUI |
| R.4 P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA | pend l.10823 | 0 | AQUI |
| R.4 P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO | pend l.10830 | 0 | AQUI |
| R.4 append P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE | cabeçalho l.9697, nenhum apenso 2026-10-10 | 0 | ausente; o texto do R.4 é sobre o 07c-b ("o mecanismo de escopo por run nasce no 07c-b") e o commit d7255263 grava só "o registro do §R.4 que é do 07c-a" → destino: PR do 07c-b, pela regra do próprio R.4 |
| R.4 append P-O6R-B01-RELIGACAO-SEM-REMEDIO | apenso l.3873 | 0 | AQUI |
| R.4 append P-O6R-B11 | apenso l.3427 | 0 | AQUI |
| tensão §A2 (REGISTRO-07CA-TENSAO-COORDENADOR) | dec l.3181 | 1 | na main (#415, 2026-10-10 13:17 -03, antes desta junta) |
| dev: P-O6R-07CA-DB-FORA-DA-LISTA-CI | pend l.10836 | 0 | AQUI |
| dev: P-O6R-07CA-SUBAPP-EM-ROUTER-INVISIVEL | pend l.10842 | 0 | AQUI (escopo dentro-do-bloco; "quem decide é a C2") |
| dev: P-SAN3-05-T15-TETO-DE-RELOGIO | pend l.10402 | 2 | já existia na main desde a9fbe283 (#405, 2026-10-09), dono B-ARNES-2 |
| D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO | dec l.3132 | 1 | na main (#415) — a decisão citada pelo disparo ESTÁ registrada |

- vermelho-controle 2: o localizador acha P-O6R-SUBRECURSO-OBJECT-SCOPE (cabeçalho l.6713) e dá 0/0/0/0 para o ID fabricado P-ID-FABRICADO-XYZ-07C.
- veredito parcial: todo item "no PR do 07c-a" está aqui; os 2 ausentes (D-07c-DESPACHO-ALVO e o apenso do 04A) são do 07c-b e têm destino pela regra escrita do R.4 → nota.

### 3c — KPI
- `git diff --quiet B O -- Kpis/` ec=0 (item 2). O corpo do PR não traz seção de KPI como exigência. Não cobro KPI (§C7 item 8(5)).

### 2b.5 — pendencias-indice.md é o do gerador (17:45:29Z)
- sem rodar o gerador (escreveria no worktree sob autocrlf): cada linha "| `ID` | N |" do índice no objeto conferida contra a linha N do pendencias.md do objeto ("## ID") por awk → **531/531** batem, 0 divergem.
- controle: o mesmo índice contra o pendencias.md de B → 197 batem, 334 divergem (acusou: o índice foi regenerado sobre o pendencias.md do objeto).
- veredito parcial: índice coerente com o registro do objeto.

### 1b — npm test na forma do job backend da CI, no OBJETO (17:36:45Z → 17:47:17Z)
- forma lida no blob do objeto: `.github/workflows/ci.yml` job `backend` — env DATABASE_URL e REDIS_URL de serviço, `CORE_SAAS_PERSISTENCE: memory`, `npx prisma migrate deploy`, `npm test`; `scripts/run-backend-tests.mjs` — `SKIP_BUDGET_DB = 2`, `npm test` = `node scripts/run-backend-tests.mjs`.
- comando: `DATABASE_URL=<j07ca-c3-pg, prefixo> REDIS_URL=redis://j07ca-c3-redis:6379 docker exec -e DATABASE_URL -e REDIS_URL -e CORE_SAAS_PERSISTENCE=memory -w /work/obj j07ca-c3-node timeout 2400 npm test > npmtest-obj.log 2>&1` → **ec=0**
- runner: "CORE_SAAS_PERSISTENCE=memory — herdado do ambiente" · "**301 arquivo(s) · 3298 teste(s) · pass 3296 · fail 0 · skipped 2**"; leitor de TAP: tests 3298 · pass 3296 · fail 0 · skipped 2 (contagem própria 3298 ok, 0 not ok, 2 SKIP)
- os 2 pulos: `permission-catalog-db-parity` (2 testes) — "RBAC_DB_PARITY não é 1 … só é ligada no job backend-postgres" — declarados, = orçamento 2.
- nenhuma falha → nada a isolar; o T15 do #405 (P-SAN3-05-T15-TETO-DE-RELOGIO) NÃO falhou nesta rodada; o A10 do o6r06 não está no job backend.
- vermelho-controle 2 (a suíte viu o Postgres): 41 arquivos `*-db.test.ts` em tests/; 0 linha "requires/exige DATABASE_URL" no TAP; os 6 do `o6r07c-subresource-scope-db` executados (ok 2037–2042, [perfil] 12 289 ms); "PostgreSQL RLS isolation" executada (ok). Tempo do censo do guard sob a carga da suíte: base 262 789 ms · grupo A 269 837 ms · grupo B 262 636 ms (na CI: ~107 s).
- veredito parcial: suíte inteira verde na forma da CI, denominador 3298 = o da CI no mesmo objeto.

### 1d — a CI executa o -db? (LOG, não YAML) — 17:47:53Z
- check-runs re-medidos às 17:47Z: **total 14 · não-verdes 0 · pendentes 0** (o backend do push, attempt 2, terminou success 17:24:25→17:31:03; docker success).
- logs baixados (`gh api repos/…/actions/jobs/<id>/logs`): backend pull_request 114265262756 (20 080 linhas), backend push attempt 2 114269943972, backend-postgres 114265262920 e 114269945223.
- job `backend` (os dois runs): "[run-backend-tests] 301 arquivo(s) · 3298 teste(s) · pass 3296 · fail 0 · skipped 2". O `o6r07c-subresource-scope-db` **EXECUTADO com 6 testes** (ok 2037–2042; [modo] 164 ms, [perfil] 3 447 ms, [user id] 823 ms, negativos 530/321/320 ms — tempo de banco real), 0 linha "exige DATABASE_URL". O guard do censo também roda lá ("# censo 07c — base 106632 ms · grupo A 106883 ms · grupo B 106795 ms").
- job `backend-postgres` (os dois runs): 0 ocorrência de qualquer teste do -db do bloco (lista curada não o contém).
- leitura: a afirmação "no job backend a suíte se declara pulada" (dev; repetida na P-O6R-07CA-DB-FORA-DA-LISTA-CI, pendencias.md l.10836) é FALSA no log — o job backend tem DATABASE_URL de serviço, migra o banco e o teste fixa CORE_SAAS_PERSISTENCE=prisma: o -db É vigiado depois do merge (no job backend). O que falta é só o backend-postgres (banco semeado).
- veredito parcial: a CI executa o -db do bloco com banco (job backend); não há propriedade sem vigia.

### 1b.2 — check, lint, build e controle do build, no OBJETO (17:48:03Z → 17:50:20Z)
- `docker exec -w /work/obj j07ca-c3-node timeout 360 npm run check|lint|build` → **ec 0 / 0 / 0** (dist/ com 781 .js)
- vermelho-controle 3: `printf 'export const controleC3: number = "nao-numero";' >> src/modules/work-orders/work-order.service.ts` (cópia guardada) → `npm run build` **ec=2**, "work-order.service.ts(2293,14): error TS2322"; restaurado → md5 07fe83561fc164ad2d311e2c1adde929 = `git cat-file blob 4ca2be43:<f> | md5sum`; `git diff --quiet -- src` no container ec=0.
- veredito parcial: check/lint/build verdes; o build falha quando deve.

### 1b.3 — o6r07a e as suítes do bloco isoladas, no OBJETO (17:50:30Z → 17:52:33Z)
- `node --test --import tsx --test-reporter=tap tests/o6r07a-wo-object-scope.test.ts` → ec 0, **8/8**; arquivo sem diff no bloco: `git diff --quiet B O -- tests/o6r07a-wo-object-scope.test.ts` ec=0 (irmão: census-guard ec=1).
- `tests/o6r07c-census-guard.test.ts` → ec 0, 31/31 (15 top-level); `tests/o6r07c-subresource-scope.test.ts` → ec 0, 24/24.
- presença no LOG da CI (nomes do meu TAP isolado procurados como "ok N - <nome>"): job backend pull_request 114265262756 — guard 31/31 ok, vias 24/24 ok, 0 not ok; job backend push attempt 2 114269943972 — 31/31 e 24/24; no meu npm test — 31/31 e 24/24.
- veredito parcial: 07a intacto e verde; o guard e as vias do bloco rodam na CI com o N inteiro.

### 1c.1 — o -db do bloco no OBJETO, em cluster próprio (17:53:02Z → 17:53:10Z)
- resíduo antes: `select count(*) from tenants where slug like 'o6r07c-db-%'` = 0; `users where email like 'o6r07c-db-%'` = 0 (o teste semeia com esse slug/email, l.176/180)
- `DATABASE_URL=<j07ca-c3-pg> node --test --import tsx --test-reporter=tap tests/o6r07c-subresource-scope-db.test.ts` → ec 0, **6/6** ([modo], [perfil], [user id], [negativo · anexo], [negativo · comentário], [negativo · km])
- resíduo depois: 0 / 0 (e 0 também depois do npm test, que já tinha rodado o arquivo)
- sem DATABASE_URL (`env -u DATABASE_URL`): ec 0, tests 1 · skipped 1 — "escopo por objeto dos subrecursos da OS no Postgres exige DATABASE_URL # SKIP Defina DATABASE_URL…" — pulo DECLARADO, nem fail nem pass vazio.
- veredito parcial: -db verde no objeto, sem resíduo, pulo declarado sem banco. Falta a base.

### 1a.2 — troca pela BASE no container (17:53Z)
- `src/` do bloco = 4 arquivos M (`git diff --name-status B O -- src/`); cópia do objeto em /work/orig/src-obj.tar (4 arquivos); cada um sobrescrito por `git cat-file blob B:<f>` → md5 no container = md5 do blob B nos 4 (dbec0a7c…, 697de0b8…, ee31ec20…, 309d6c3c…; B = c1cfdabe nesses 4); `git diff --stat -- src` no container: 4 files, 31+/100−.

### 1a.3 — régua na BASE (17:53:43Z → 17:55:49Z)
- mesmo comando da 1a.1 → ec=1; **tests 785 · pass 779 · fail 2 · skipped 4** — as MESMAS 2 falhas (domain-events, Redis ausente pela forma) e os MESMOS 4 pulos declarados.
- diff dos nomes com status (objeto × base, 785 linhas cada): **vazio** (ec 0) — nenhum teste some, nenhum muda de status. Controle: tirar 1 linha da lista da base → diff ec=1 (acusou).
- veredito parcial: régua de 80 suítes 785/779/2/4 no objeto = base; as 2 falhas são anteriores ao bloco e de terreno (domain-events nasceu em 2c37ce93, 2026-06-08; 4/4 com Redis). Nenhuma regressão.

### 1c.2 — o -db na BASE (17:56:02Z → 17:56:07Z)
- `DATABASE_URL=<j07ca-c3-pg> … tests/o6r07c-subresource-scope-db.test.ts` com src/ de B → ec=1; **6 tests · 3 pass · 3 fail**:
  - not ok [negativo · anexo] — "Missing expected rejection: apagar anexo: o técnico B não foi recusado"
  - not ok [negativo · comentário] — "Missing expected rejection: comentar: o técnico B não foi recusado"
  - not ok [negativo · km] — expected 'rejected', actual 'accepted'
  - ok [modo], [perfil], [user id] (controles positivos verdes)
  - "is not a function" no TAP: 0 → vermelho pelo motivo CERTO (a propriedade), não por API ausente.
- resíduo antes/depois: 0/0 tenants, 0 users.

### 1a.4 — restauro provado (17:56Z)
- `tar -xf /work/orig/src-obj.tar` → md5 no container = blob do objeto nos 4 (6fd7cff8…, 34ed3335…, 8aba845b…, 07fe8356…); `git diff --quiet -- src` ec=0; /work/orig removido.

### L5 — normas citadas existem na ref julgada (§A7) (17:58Z)
- `git show <ref>:CLAUDE.md | grep -cF '<âncora>'`, objeto 4ca2be43 / origin/main 9b611468: "## A1. Fontes" 1/1 · "## A2. Regra de conflito" 1/1 · "## A7. Onde se MEDE" 1/1 · "## C4. Disciplina de escopo" 1/1 · "## C5. Limpeza" 1/1 · "**1-bis. INSPEÇÃO DE TERRENO" 1/1 (l.393; a 1ª grafia que tentei, "1-bis. **INSPEÇÃO", deu 0/0 — erro meu de âncora, não ausência) · "1-ter. ESCOPO" 1/1 · "4-bis. **SEPARAÇÃO" 1/1 · "6-bis. **ESGOTADO" 1/1 · "P7 — Pausa ordenada" 1/1 · "D-GOV-PROPORCIONAL" 3/3 · "(1) Junta proporcional" 1/1 · "(2) Teto de 2 ciclos" 1/1 · "(3) Menos burocracia" 1/1 · "(5) KPI congelado" 1/1 · "## 8. GitHub Flow" 1/1
- `docs/revisoes/SAN3/PLANO_SAN3.md`: "CE-2" 2/2 (l.325: "O Ω6R-SEC-002 e o item 51 fecham por escopo provado…"); "## 6" 1/1 (travas l.356-357).
- veredito parcial: toda norma em que me apoio existe no objeto e na main.

### 1c.3 — controle do contador de resíduo (17:57:57Z)
- no MEU cluster (j07ca-c3-pg): `insert into tenants (name, slug) values ('controle c3','o6r07c-db-controle-c3')` → contagem `slug like 'o6r07c-db-%'` = 1 (acusou); `delete … where slug = 'o6r07c-db-controle-c3'` (pelo nome exato) → 0.
- veredito parcial: o "resíduo 0" do -db é medida que acusa.

### Item 1 — fecho
- régua (80, regra da v1): objeto 785/779/2/4 = base 785/779/2/4, nomes e status idênticos; as 2 falhas = domain-events sem Redis (forma da régua), pré-existentes (2c37ce93, 2026-06-08) e verdes com Redis.
- npm test na forma da CI: 301 arquivos · 3298 · pass 3296 · fail 0 · skipped 2 (RBAC_DB_PARITY, = orçamento), ec 0 — igual ao job backend da CI nos dois runs.
- check/lint/build 0/0/0; build falha com erro de tipo proposital.
- o6r07a 8/8, sem diff no bloco; guard 31/31; vias 24/24.
- -db: 6/6 no objeto; base 3 negativos vermelhos pelo motivo certo + 3 controles verdes; skip declarado sem banco; resíduo 0.
- CI: o -db roda COM banco no job backend (6 testes, ms de banco real); não no backend-postgres. Guard e vias também no backend (31 e 24).
- veredito do item 1: VERDE — nenhuma regressão; o -db é vigiado pela CI.

## Fim — objeto re-resolvido e limpeza (18:00:16Z)
- 17:58:07Z: `git ls-remote` do ramo = `gh pr view 414` headRefOid = 4ca2be43c3b4b32b9bed670f02d78145620cdc2e (OPEN, rascunho) — **igual ao do início**; `git fetch origin main` → origin/main = 9b611468 — igual ao do início.
- containers `j07ca-c3-node`, `j07ca-c3-pg`, `j07ca-c3-redis`: `docker rm -f -v <nome>` ec 0 ×3; rede `j07ca-c3-net` removida ec 0; contagem `^j07ca-c3-` containers 0 · redes 0. `erp-postgres`/`erp-redis` seguem "Up 18 hours (healthy)", nunca tocados. Nenhuma imagem removida.
- worktree `C:/Users/AMP/w-ciclo1-07ca-c3`: porcelain 0; processos vivos com o caminho na linha de comando = 0 (Get-CimInstance Win32_Process); `git worktree remove --force` ec 0; diretório não existe; `git worktree list | grep -ic w-ciclo1-07ca-c3` = 0.
- as suítes rodaram no container (árvore em /work/obj, destruída com ele): nenhum `storage/checklist-attachments/<uuid>/` nem temporário `o6r07c-*` meu no host.
- $SCRATCH: senha descartável apagada; cópia de `tests/` de c1cfdabe, TAPs, logs da CI e cópias de registro apagados; ficam só os 7 scripts (md5 nesta evidência) para re-execução (P3). (Uma 1ª tentativa de limpeza com `rm $S/*` foi barrada pela checagem de segurança do harness por expansão de variável; refeita com caminho relativo dentro do diretório do scratch.)
- disco C: 17G livres no fim.
- em `w-07ca` escrevi só `07ca-C3-evidencia.md` e `07ca-C3-voto.json`; não commitei; não li nenhum arquivo `07ca-C1-*` nem `07ca-C2-*`.

## Veredito (18:01:41Z)
- itens: 1 VERDE (regressão) · 2 VERDE (escopo) · 3 VERDE (registro). Achados: 1 ajuste (premissa falsa na P-O6R-07CA-DB-FORA-DA-LISTA-CI) + 6 notas; nenhum bloqueia; nenhum item não medido.
- **VOTO: APROVADO** — arquivo: 07ca-C3-voto.json
