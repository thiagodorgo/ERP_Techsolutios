# J484 — C1 — evidência (P1)

- Cadeira: C1 — DINHEIRO NO MOTOR (tag de organização no rateio)
- Identidade: `jurado-j484-c1-opus`
- Modelo: Claude Opus, nível menor, DECLARADO
- Objeto: `5b628b886520bcbece0228eec9d47c965a32b577`
- Base (vermelho-controle): `49ddd0f8b9efa8724923ec99fa546cce907288cc`
- Worktree: `C:/Users/thiag/w-j484-c1` · Postgres: `j484-c1-pg` em `127.0.0.1:55481`

## Terreno

- **Comando:** `git worktree add --detach C:/Users/thiag/w-j484-c1 5b628b88…`; `git rev-parse HEAD`; `git diff --name-only 49ddd0f8..HEAD`; `npm ci --include=dev` (log `j484/c1-npmci.log`); `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate`.
- **Saída:** HEAD = `5b628b886520bcbece0228eec9d47c965a32b577`; 12 arquivos no diff do conserto (engine, routes, service, 4 testes, API_CONTRACTS, comando, pendências ×2, relatório); `npmci exit 0`, `node_modules` próprio, sem junction.
- **Veredito parcial:** terreno próprio apto; árvore principal e serviços da demo não tocados.

## Item 1 — ambiguidade e normalização

- **Comando:** `node --test --import tsx tests/san3-03-tenant-tag.test.ts` no objeto; depois `git checkout 49ddd0f8 -- src/modules/cloud-cost-allocation/` + mesmo comando + `git checkout HEAD -- src/modules/cloud-cost-allocation/` + `git status --porcelain`.
- **Saída:** objeto 11/11 ok. BASE: 8 falhas (T-TAG-1, -2, -5, -7, -8, -9, -10, T-TAG-6/13); passam no BASE só T-TAG-3/4, T-TAG-11 e T-TAG-12 (controles de "não muda", protegidos pelas mutações M55-b/M55-c). Status depois da restauração: vazio.
- **Veredito parcial:** T-TAG-1..9 verdes no objeto e os exigidos vermelhos no BASE (T-TAG-db medido no item 2, caminho Postgres).

- **Comando:** `node --import tsx C:/Users/thiag/erp-pausa-2026-10-03/revisoes/j484/c1-grafias.mts` (29 grafias novas × 2 estratégias), no objeto (`c1-grafias-objeto.log`) e com o engine do BASE (`c1-grafias-base.log`), restauração por `git checkout HEAD --` e status vazio.
- **Saída (estratégia direta, objeto):** lado da TAG fecha: ZWSP, ZWJ, soft hyphen, NEL (U+0085), en-dash, non-breaking hyphen, `_` vs `-`, ZWSP sozinho → `unknown_tenant_tag` 10; BOM, U+2028, NFD×NFC, ligadura ﬁ, largura total, caixa, id em maiúsculas que colide com nome de outra → `ambiguous_tenant_tag` 10; id em maiúsculas sem colisão → direto para o dono; plataforma: `PLATFORM-ID` → platformCost 10, `ＰＬＡＴＦＯＲＭ` como nome de A → ambígua, `platform\u200b` → desconhecida. **Lado do NOME da organização escapa:** A=`"Duplicada\u200b"` (ou `"Dupli\u00adcada"`, soft hyphen) e B=`"Duplicada"` — dois nomes que se leem iguais — com tag `"Duplicada"` → `alloc [["b",10]]`, sem `ambiguous_tenant_tag`; o mesmo com homoglifo cirílico (`"Dupli\u0441ada"`). BASE dá o mesmo resultado nesses três casos (comportamento anterior ao bloco, de `6f27faae`). O validador de nome (`platform-tenants.validator.ts:85-87`) só faz `trim()`, que não remove U+200B nem U+00AD: o nome é gravável pela API.
- **Veredito parcial:** ACHADO C1-A1 (GRAVE): a recusa de ambiguidade não alcança nomes de organização que diferem só por caractere invisível (Default_Ignorable: U+200B, U+00AD); a tag cai inteira numa das duas. ACHADO C1-A2 (não grave): homoglifo cirílico no nome, mesma consequência, exige tabela de confusáveis (UTS #39), fora do que a emenda prometeu.

## Item 2 — tag desconhecida (§8) e caminho PostgreSQL

- **Comando:** `node --test --import tsx tests/san3-03-tenant-tag.test.ts` (objeto e BASE, já registrado no item 1) — recorte T-TAG-10..13.
- **Saída:** objeto: T-TAG-10, -11, -12 e T-TAG-6/13 ok. BASE: T-TAG-10 e T-TAG-6/13 vermelhos; T-TAG-11 e T-TAG-12 verdes no BASE (são "não muda": só uso ignora tag; tag só de espaço = sem tag), protegidos por M55-b e M55-c (item 3).
- **Veredito parcial:** recusa `unknown_tenant_tag` só na estratégia direta, conservação fechando em todos os casos (`assertConserved`).

- **Comando:** sonda `c1-grafias.mts` (estratégia só por uso e plataforma, `c1-grafias-objeto.log`) e leitura de `engine.ts:49-79`.
- **Saída:** ordem no código = ambígua (l.53) → desconhecida, só `direct_tag_then_usage_weighted_v1` (l.59) → plataforma (l.69) → direta (l.75) → regra/uso (l.81). `PLATFORM-ID` → platformCost 10 nas duas estratégias, 0 alocação; `ＰＬＡＴＦＯＲＭ` como nome de outra → ambígua antes da plataforma nas duas; `platform\u200b` → desconhecida na direta; só por uso: rateio com a fatia da plataforma em `platformCost`. `closes:true` nas 58 execuções.
- **Veredito parcial:** ordem conforme §8; plataforma nunca aparece em `allocations`.

- **Comando:** memória `FreeVirtualMemory=13,56 GB`; `docker run -d --name j484-c1-pg … -p 127.0.0.1:55481:5432 postgres:16`; `npx prisma migrate deploy`; `DATABASE_URL=…55481… CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/san3-03-system-org-db.test.ts`; BASE: `git checkout 49ddd0f8 -- src/modules/cloud-cost-allocation/` + `--test-name-pattern="T-TAG-db"` + restauração.
- **Saída:** todas as migrações aplicadas; objeto 3/3 (T-SYS-db-1, T-SYS-db-2, T-TAG-db), 0 skip; BASE: T-TAG-db `not ok` (`expected: false, actual: true` — alocação para uma das duplicadas); status vazio depois.
- **Veredito parcial:** T-TAG-db verde no objeto e vermelho no BASE, no Postgres descartável próprio.

- **Comando:** sonda temporária `tests/zz-j484-c1-probe-db.test.ts` (não rastreada, removida ao fim) no `j484-c1-pg`, repositório `PrismaCloudCostAllocationRepository`: A=`"Duplicada <u>\u200b"`, B=`"Duplicada <u>"`, linhas `Duplicada <u>`=10, `nao-existe-<u>`=7, `PLATFORM`=5.
- **Saída:** `{"status":"completed","totalAllocated":10,"totalUnallocated":7,"platformCost":5,"allocations":[["B(nome limpo)",10]],"unallocated":[["unknown_tenant_tag",7]]}`.
- **Veredito parcial:** no Postgres a desconhecida falha fechada (7) e a plataforma fica em `platformCost` (5) sem `TenantCloudCostAllocation`; mas o C1-A1 reproduz no caminho real: dois nomes que se leem iguais, um com U+200B, e B recebe a alocação inteira de 10 em `TenantCloudCostAllocation`.
