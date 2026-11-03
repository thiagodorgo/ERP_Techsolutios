# J484 — C1b — evidência (P1)

- Cadeira: C1 — isolamento entre organizações e fail-closed (tag de organização no rateio)
- Identidade: `jurado-j484-c1b-opus` (sucessora de `jurado-j484-c1-opus`, parado por PAUSA/P7)
- Modelo: Claude Opus, nível menor, DECLARADO
- Objeto: `5b628b886520bcbece0228eec9d47c965a32b577` · Base: `49ddd0f8b9efa8724923ec99fa546cce907288cc`
- Worktree: `C:/Users/thiag/w-j484-c1b` · Postgres: `j484-c1b-pg` em `127.0.0.1:55484`
- Sondas próprias ficam fora do worktree, nesta pasta, com prefixo `c1b-`.

## Terreno

- **Comando:** memória `FreeVirtualMemory=46,98 GB`; `git worktree add --detach C:/Users/thiag/w-j484-c1b 5b628b88…`; `git rev-parse HEAD`; `git diff --name-only 49ddd0f8..HEAD`; `npm ci --include=dev` (log `c1b-npmci.log`); `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate`.
- **Saída:** HEAD = `5b628b886520bcbece0228eec9d47c965a32b577`; 12 arquivos no diff do conserto (igual ao antecessor); `npmci_exit=0`, `node_modules` próprio (diretório, não junction); status vazio.
- **Veredito parcial:** terreno próprio apto; erp-postgres/erp-redis, portas 3000/5173 e árvore principal não tocados.

## Item 1 — ambiguidade, normalização e tag desconhecida

### P3 — re-execução do registrado pelo antecessor

- **Comando:** `node --test --import tsx tests/san3-03-tenant-tag.test.ts` no objeto; `git checkout 49ddd0f8 -- src/modules/cloud-cost-allocation/` + mesmo comando + `git checkout HEAD -- src/modules/cloud-cost-allocation/` + `git status --porcelain`.
- **Saída:** objeto 11/11 ok, 0 skip. BASE 3/11: vermelhos T-TAG-1, -2, -5, -7, -8, -9, -10, T-TAG-6/13; verdes no BASE T-TAG-3/4, T-TAG-11, T-TAG-12 (os de "não muda"). Status vazio. **Igual ao registrado pelo antecessor.**
- **Veredito parcial:** reproduzido.

- **Comando:** `c1-grafias.mts` do antecessor com o import reapontado para o meu worktree (`c1b-grafias-p3.mts`), `node --import tsx …`, e `diff` (EOL-neutro) contra `c1-grafias-objeto.log`.
- **Saída:** `exit=0`; `IGUAL_AO_ANTECESSOR` (58 linhas idênticas). Inclui `zwsp-no-NOME-A-nomes-iguais` e `soft-hyphen-no-NOME-A-nomes-iguais` → direta `alloc [["b",10]]`, sem `ambiguous_tenant_tag`; `cirilico-nome-A` idem.
- **Veredito parcial:** o C1-A1 do antecessor reproduz no meu terreno.

### Cauda — ordem, plataforma, conservação (medido por mim)

- **Comando:** leitura de `engine.ts:49-81` no objeto.
- **Saída:** l.53 ambígua (`size > 1`) → l.59 desconhecida (`normalizedTag && !matchedTenantIds && strategy === direct…`) → l.69 plataforma → l.75 direta → l.81 regra/uso. `normalizeTenantTag` (l.155) = `NFKC → trim → \s+→" " → toLowerCase`; `addTenantTag` ignora chave vazia; consulta da linha usa a mesma função (l.50); tag só de espaço vira `""` → sem tag.
- **Veredito parcial:** ordem conforme §8 da emenda 2.

- **Comando:** `node --import tsx c1b-propriedade.mts <engine do objeto>` — 4000 execuções pseudoaleatórias (semente fixa), 6 organizações (inclui nome duplicado, nome = slug de outra, nome de cliente = slug da plataforma), 21 tags (vazia, espaço, id/nome/slug da plataforma em várias grafias, desconhecida, largura total, ZWSP), 1–6 linhas, bases aleatórias, as 2 estratégias.
- **Saída:** `{"runs":4000,"bad":0,"platInAllocations":0}` — nenhuma exceção, conservação fecha em todas, a plataforma nunca aparece em `allocations`.
- **Veredito parcial:** plataforma fora de `allocations` e conservação fechando, por propriedade.

### Cauda — grafias NOVAS e julgamento do C1-A1

- **Comando:** `node --import tsx c1b-grafias-novas.mts <engine>` no objeto (`c1b-grafias-novas-objeto.log`) e com o engine do BASE (`c1b-grafias-novas-base.log`), restauração `git checkout HEAD --`, status vazio. 12 invisíveis (U+00AD, U+200B, U+200C, U+200D, U+2060, U+FEFF no meio, U+034F, U+FE0F, U+200E, U+202E, U+180E, U+2062) × 4 cenários × 2 estratégias: `nameSide` (A=`"Dupli"+ch+"cada"`, B=`"Duplicada"`, tag `"Duplicada"`), `nameEdge` (A=`"Duplicada"+ch`), `tagSide` (A e B com nome `Duplicada`, tag com o invisível), `tagSingle` (tag `"Alfa"+ch`, A única).
- **Saída (objeto, estratégia direta):**
  - `nameSide`: **12/12 → `alloc [["b",10]]`**, nenhum `ambiguous_tenant_tag`;
  - `nameEdge`: 11/12 → `[["b",10]]`; só U+FEFF na ponta vira `ambiguous_tenant_tag` 10 (porque `trim()` remove U+FEFF);
  - `tagSide`: 12/12 → `unknown_tenant_tag` 10 (falha fechada);
  - `tagSingle`: 11/12 → `unknown_tenant_tag` 10; U+FEFF na ponta → direto para A (trim).
  - closes:true em todas.
- **Saída (BASE):** `nameSide` e `nameEdge` → `[["b",10]]` em 12/12 (mesmo sintoma, código anterior ao bloco); `tagSide` → rateio por uso entre A e B (o bloco consertou esse lado).
- **Comando:** `git show 49ddd0f8:…engine.ts | grep -c normalizeTenantTag` → `0`; base indexa por `toLowerCase()` com `Map.set` (l.41-43). O validador de nome `src/modules/platform/platform-tenants.validator.ts` só faz `trim()`; o slug é `^[a-z0-9]+(?:-[a-z0-9]+)*$` (não carrega invisível). Quem grava nome: só `platform:tenants:update` (`platform.routes.ts:122`). A alocação alimenta a cobrança: `cloud-charges/cloud-charge-prisma.repository.ts:197` lê `tenantCloudCostAllocation` do run.
- **Julgamento do C1-A1 — GRAVE, dentro-do-bloco.**
  - Motivo da gravidade: duas organizações cujos nomes se leem iguais na tela (um com um caractere Default_Ignorable, gravável pela API e comum em colagem: hífen suave, ZWSP, BOM no meio, word joiner), e a tag digitada por quem lê a tela (`"Duplicada"`) leva **o valor inteiro, em silêncio, para B**, sem `ambiguous_tenant_tag`; a alocação vira cobrança (`cloud-charges`). Se o custo era de A, B paga pelo que não usou — erra dinheiro entre organizações. O próprio bloco adotou o critério "a mesma chave humana" (crítica E2-A1, §7 da emenda: "nenhuma grafia de uma chave ambígua escapa da recusa"), e o motor do objeto **já** trata U+FEFF na ponta do nome como a mesma chave (vira ambígua) mas não U+FEFF no meio nem os outros 11 — a fronteira não é uma propriedade, é um acidente do `trim()`.
  - Motivo do escopo: o bloco puxou o A5 para dentro (emenda 2 §1 "conserto agora (C2)", §2 D-E2-2, §7 E2-A1) e escreveu o código que decide a ambiguidade (`normalizeTenantTag`/`addTenantTag`, ausentes no BASE: contagem 0), dentro do PERMITIDO (`engine.ts`). O sintoma existe no BASE (origem `6f27faae`, 08/06), declarado; mas o defeito é o fechamento incompleto de um achado que o bloco tomou para si e declara fechado.
  - Lado da tag: fecha (12/12 `unknown_tenant_tag`).
- **Homoglifo (C1-A2 do antecessor) — não grave, pré-existente.** Mesma consequência, mas só se alcança por escrita deliberada de letra de outro escrito no nome pelo papel mais privilegiado (`platform:tenants:update`); não nasce de colagem acidental, e a emenda não prometeu confusáveis (UTS #39). Pendência com dono.
- **Veredito parcial item 1:** T-TAG-1..13 verdes no objeto e os exigidos vermelhos no BASE; ordem conforme; plataforma fora de `allocations`; conservação fecha. **Achado C1b-A1 (= C1-A1) GRAVE dentro-do-bloco**; C1b-A2 (homoglifo) não grave.

## Item 2 — caminho PostgreSQL (repositório Prisma)

- **Comando:** `FreeVirtualMemory=46,95 GB`; `docker run -d --name j484-c1b-pg -e POSTGRES_USER=erp -e POSTGRES_PASSWORD=erp -e POSTGRES_DB=erp_c1b -p 127.0.0.1:55484:5432 postgres:16`; `pg_isready`; `DATABASE_URL=postgresql://erp:erp@127.0.0.1:55484/erp_c1b npx prisma migrate deploy`.
- **Saída:** container próprio pronto; "All migrations have been successfully applied".
- **Veredito parcial:** banco descartável próprio; nenhum serviço da demo tocado.

- **Comando:** `DATABASE_URL=…55484… CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/san3-03-system-org-db.test.ts` no objeto; depois `git checkout 49ddd0f8 -- src/modules/cloud-cost-allocation/` + mesmo comando + restauração; depois `git checkout 7c89c73b -- src/modules/cloud-cost-allocation/` (a `main` antes do bloco = merge-base) + mesmo comando + restauração; `git status --porcelain`.
- **Saída:** objeto **3/3** (T-SYS-db-1, T-SYS-db-2, T-TAG-db), 0 skip. Base do conserto `49ddd0f8`: T-SYS-db-1/2 ok, **T-TAG-db `not ok`** (`expected: false, actual: true` — alocação para uma das duplicadas). Antes do bloco (`7c89c73b`): **0/3** — T-SYS-db-1 e -2 `AssertionError` (ids), T-TAG-db `AssertionError`. Status vazio depois de cada restauração.
- **Veredito parcial:** T-TAG-db verde no objeto e vermelho na base do conserto; T-SYS-db verde no objeto e vermelho antes do bloco (a base do conserto já trazia o T-SYS, que não é deste conserto). Igual ao registrado pelo antecessor para T-TAG-db.

- **Comando (P3 + cauda, sonda própria):** `c1b-probe-db.test.ts` (cópia guardada nesta pasta; executada como `tests/zz-j484-c1b-probe-db.test.ts` temporário, removido, status vazio), serviço real `CloudCostAllocationService` + `PrismaCloudCostAllocationRepository`. Por invisível ∈ {U+00AD, U+200B, U+2060, U+FEFF no meio}: nome de A passado por `parseCreatePlatformTenantDto` (o validador da API) = `"Dupli"+ch+"cada <u>"`, B = `"Duplicada <u>"`; linhas `Duplicada <u>`=10, `nao-existe-<u>`=7, `PLATFORM`=5.
- **Saída:** nos 4: validador aceita o nome com o invisível; `status=completed`, `totalAllocated=10`, `totalUnallocated=7`; `allocations=[["B(limpo)",10]]`; linhas persistidas em `tenant_cloud_cost_allocations` = `[["B(limpo)","10"]]` (nenhuma da plataforma); `unallocated=[["unknown_tenant_tag",7]]`.
- **Veredito parcial:** no Postgres a desconhecida falha fechada e a plataforma não ganha linha de alocação; **o C1b-A1 reproduz no caminho real** com 4 invisíveis distintos, inclusive o nome entrando pelo validador da API: B recebe e persiste os 10 inteiros.

## Item 3 — mutações

- **Comando:** driver `c1b-mutations.mjs` = cópia P3 do `c1-mutations.mjs` do antecessor com a raiz trocada para `w-j484-c1b`, mais a minha mutação nova `MC1B`; `DATABASE_URL=…55484… CORE_SAAS_PERSISTENCE=prisma node c1b-mutations.mjs` (log `c1b-mutations.log`); `diff` EOL-neutro contra `c1-mutations.log`.
- **Saída:** `driver_exit=0`; **todas** com âncora `count=1`, mutante `exit=1`, natureza `assertion`, `restored=true`, `git status --porcelain=[]`:
  - M48 → T-TAG-db, T-TAG-1, -2, -5, -7, -8, T-TAG-6/13 (7 de 14);
  - M49′ (id e slug por `set`, nome acumula) → T-TAG-2, -7, -8, -6/13;
  - M50 (forma do dev: apaga o bloco da ambígua) e M50-lit (ambígua cai na regra/uso) → T-TAG-1, -2, -5, -7, -8, -6/13;
  - M51 (plataforma antes da ambígua) → T-TAG-5;
  - M52 (ambígua só na direta) → T-TAG-5, -7, -8;
  - M53 (sem trim/colapso) → T-TAG-8, -9, -12; M53-b (sem NFKC) → T-TAG-8; M53-c (consulta só `toLowerCase`) → T-TAG-8, -9, -12;
  - M55 (sem o ramo `unknown_tenant_tag`) → T-TAG-10, -6/13; M55-b (recusa também no só-uso) → T-TAG-11; M55-c (tag só de espaço = desconhecida) → T-TAG-12;
  - M22′ (apaga id e nome do índice) → T-SYS-2; M17-b (dublê esconde a plataforma) → T-SYS-1, -2, -3, -4; M23 (plataforma só na direta) → T-SYS-2;
  - M-C1-NOVA do antecessor (auto-colisão nome==slug vira ambígua) → T-SYS-8.
  - `diff` contra o log do antecessor: **idêntico** nas 17 entradas dele; só a minha entrada a mais.
- **Mutação própria nova — M-C1b-NOVA ("o id literal vence a colisão"):** `if (matchedTenantIds && matchedTenantIds.size > 1 && !tenantsById.has(line.tenantTag ?? ""))` → `exit=1`, **T-TAG-2 vermelho** (o caso id de A = nome/slug de B), assertion, restaurada, status vazio.
- **Veredito parcial:** as 14 mutações do mandato e a nova mordem pela asserção do teste previsto no plano (M48→T-TAG-1; M49′→T-TAG-2; M50→T-TAG-1/-6; M51→T-TAG-5; M52→T-TAG-7; M53/-b/-c→T-TAG-8; M55/-b/-c→T-TAG-10/-11/-12; M22′/M23→T-SYS-2; M17-b→T-SYS). Nenhuma mutação cobre o C1b-A1 (ele não é regressão de código existente; é caso que nenhum teste exercita).

### Ressalva R2 — o exit 1 do driver do dev depois da M13/M16

- **Comando:** `c1b-r2.mjs` (meu), `DATABASE_URL=…55484… CORE_SAAS_PERSISTENCE=memory`, `tests/san3-03-derived-basis-db.test.ts`: controle sem mutação, M13 e M16 com as âncoras literais do `dev-san303-e2-mutations.mjs:126-131`; natureza lida por bloco `not ok` (log `c1b-r2.log` e `c1b-r2-<id>.log`). Leitura de `dev-san303-e2-mutations.mjs:37-38`.
- **Saída:** controle 9/9. M13: âncora 1, `exit=1`, `not ok T-STO-db-1` com `CloudCostAllocationError` `CLOUD_COST_ALLOCATION_CONTEXT_LEAK` ("attachments returned rows for another organization"). M16: âncora 1, `exit=1`, `not ok T-API-db-1` e `T-API-db-3b` com o mesmo erro sobre `audit_logs`. `AssertionError presente=false`, sem `SyntaxError`/`TransformError`; restauradas, status vazio. O driver do dev exige `/AssertionError|ERR_ASSERTION|Missing expected rejection/` (l.37) e lança "did not fail by assertion" (l.38) — daí o exit 1.
- **Veredito parcial:** R2 explicada e medida: o exit 1 é do critério do invólucro, não de mutante vivo nem de ambiente. O vermelho da M13/M16 é a sentinela `assertRowsBelongToTenant` acusando linha de outra organização — falha fechada pelo motivo certo. Sem achado.

## Fechamento

- **Comando:** `git status --porcelain` (vazio, 0 sonda `zz-` em `tests/`); `docker rm -f j484-c1b-pg`; `git worktree remove --force C:/Users/thiag/w-j484-c1b`; `docker ps`; `git worktree list | grep -c c1b`.
- **Saída:** worktree removido (`wt_exit=0`, diretório ausente, 0 na lista); container removido; vivos: `erp-postgres`, `erp-redis` (intocados) e `j484-c2-pg` (de outra cadeira, intocado).
- **Voto:** **REPROVADO** — 1 grave (C1b-A1, dentro-do-bloco), 1 não grave (C1b-A2, pré-existente). Arquivo: `c1b-voto.json`.
