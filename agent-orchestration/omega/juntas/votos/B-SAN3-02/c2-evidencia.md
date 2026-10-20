executor efetivo: jurado-san302-c2-opus (Claude Code) · modelo: Claude Opus (claude-opus-5-5) · nível: menor, DECLARADO (§C7.6) · objeto: 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 (PR #448) · mandato_md5: 94a2b351ff56acd5bd6240ac3852849f (cru = EOL-neutro) · corpo carregado = blob do objeto `.claude/agents/especialistas/jurado-san302-c2-complementar-e-indice.md` 3b379750 (md5 EOL-neutro 11c3b375f86b7fe6093e20df2e3572f2) · espelho `.agents/` 969ad6a5 · corpo × espelho: IDENTICO (EOL-neutro, descontados frontmatter e bloco Codex)

# Evidência — cadeira C2 — junta B-SAN3-02 ciclo 1 (DINHEIRO, unanimidade de 3 com veto)

## Legalidade (antes do mérito)
- `git ls-remote origin refs/heads/fix/faturamento-atomico-e-delta` → 8e6a6c29…; `gh pr view 448 --json headRefOid,state` → 8e6a6c29… OPEN. Objeto por duas fontes = 8e6a6c29b8a0aced5bf3968383aa9ef247019f46.
- `git merge-base origin/main <obj>` → B = 2ecfb333aed0a0efcc1f171148473aad2921be66; origin/main início = 2ecfb333 (main não andou).
- Parecer `insp-san302-parecer.md`: LIBERADO COM RESSALVA 2026-10-20T01:52Z, nomeia C2 `jurado-san302-c2-opus`, `w-jsan302-c2-`, `teste-linux.sh`/`tl…` + bases `jsan302_c2_*`. Check-runs 14/14 success (mandato e inspetor; re-medido abaixo).
- Inelegibilidade: meu nome `jurado-san302-c2-opus` não está na lista de 16 inelegíveis do inspetor (item 2) → sem colisão.
- Terreno 01:53:35Z: commit livre 3,93 GB (≥3, R4 ok); `docker ps | grep -v ^erp-` → 0 grupos alheios (R5 ok); disco 14G livres (R6 ok, ≥10).

## Terreno próprio (montagem)
- `git -c core.autocrlf=false worktree add --detach C:/Users/AMP/w-jsan302-c2 8e6a6c29…` → HEAD 8e6a6c29; arquivos em LF (= blobs; `git hash-object src/modules/financial-titles/financial-title.service.ts` = `git rev-parse HEAD:…` = 573c307f). Escolha deliberada: sob LF, restauro de mutação se prova por `git hash-object` = blob sem normalização.
- Memória antes do `npm ci`: 01:56:47Z 3,68 GB; 1ª tentativa ec=1 por `ECONNRESET` no postinstall de `@prisma/engines` (rede); 02:02:26Z 3,49 GB → `npm ci` ec=0, 326 pacotes. `node_modules` é diretório real (LinkType vazio = sem junction).

## Item 1 — a migração (parte estática)
- Classificador próprio `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c2/classifica.mjs` (remove comentários, separa por `;` de fim de sentença, regra por sentença): `node classifica.mjs prisma/migrations/20260878000000_invoice_complementary_title/migration.sql` → 6 sentenças: (1) ADD_COLUMN anulável, (2) CREATE UNIQUE INDEX auxiliar, (3) ADD CONSTRAINT FK, (4) ADD CONSTRAINT CHECK, (5) CREATE UNIQUE INDEX de originais, (6) DROP INDEX do antigo; `acusadas=0`, `drop_index_em=6 > ultimo_create_index=5` → **aditiva + troca autorizada, DROP depois do CREATE**. ec=0.
- Vermelho-controle do classificador: cópia com `UPDATE "financial_titles" SET …` e `ALTER TABLE … DROP COLUMN "party_name"` apensados → linhas 7 `DESTRUTIVO:UPDATE` e 8 `DESTRUTIVO:DROP_COLUMN`, `acusadas=2`, ec=1. **Vermelho.**
- `CONCURRENTLY`: 1 ocorrência, l.5, dentro de comentário ("sem CONCURRENTLY"); fora de comentário = 0.
- `20260811000000_add_invoicing/migration.sql`: blob em B = blob no objeto = bd867f7b; `git diff --quiet B obj -- …20260811…/` → IDENTICA. `git diff --name-status B obj -- prisma/migrations` → só `A …20260878000000…/migration.sql`.
- `schema.prisma` por parse dos hunks (`git diff -U0`) contra a borda do `model FinancialTitle {`…`}`: head 1988–2049, hunks +2014,5 / +2033,6 / +2043,2 todos DENTRO; base 1988–2039, hunks -2013,0 / -2028,3 / -2034,0 todos DENTRO. Nenhum outro modelo mudou.
- Veredito parcial: forma do SQL VERDE (aditiva; nenhum destrutivo → sem parada §C7.5).

## Host, sem banco (feito PRIMEIRO, R4/R5)
- `DATABASE_URL=<loopback inerte :59999> npx prisma generate` ec=0 (1ª rodada sem cliente gerado deu 4 falhas de import `Prisma` — artefato de terreno meu, não de produto); `node scripts/run-backend-tests.mjs tests/work-order-invoicing.test.ts` → **35/35**, 0 skip (baseline).
- Sonda própria de porta pública, `tests/jsan302-c2-rota-mem.test.ts` (NÃO versionada; HTTP real do `createApp` em memória, molde `financial-titles-routes`): `POST /api/v1/financial-titles` com `parent_title_id`, `parentTitleId`, `work_order_id`, `workOrderId` no corpo → `status=201 parentTitleId=null workOrderId=null`; GET do criado `parentTitleId=null`; leitura cruzada com DOIS tenants: lista de B sem o id de A, lista de A com ele (controle), `GET` de B no título de A → 404. **1/1 verde.**
- Mutações de memória, uma por vez, por `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c2/mutar-host.mjs` (âncora única, prova de aplicação por tamanho e conteúdo, arquivos LF — CRLF=false medido —, restauro por `git hash-object` = `git rev-parse HEAD:<arq>`). Log: `…/jsan302-c2/mutar-host.log`.

| M | mutação | resultado | quem morreu | restauro |
|---|---|---|---|---|
| M5 (simulação) | InMemory `create` sem `!input.parentTitleId` | VERMELHA 8/35 | T-C1m, T-C2, T-C3, T-C9a, T-C9b, T-C10, T-C11, T-C8[rota] | cb875312 OK |
| M6 (memória) | InMemory `findActiveByWorkOrder` sem `parentTitleId == null` | VERMELHA 2/35 | T-C9a, T-C9b — **o T-C2 (3º delta) NÃO morre** (o 1º inserido é T1; coerente com o plano §7.3 A2) | cb875312 OK |
| M7 | simulação do índice removida | VERMELHA 2/35 | T-C5 + paridade legada | cb875312 OK |
| M21 (memória) | `findActiveByWorkOrder` exclui `status = cancelled` | VERMELHA 1/35 | T-C10 | cb875312 OK |
| M26 | sem a validação do pai na variante | VERMELHA 1/35 | T-C11 | 573c307f OK |
| CF (própria) | `create` público repassa `parent_title_id`/`work_order_id` do corpo | VERMELHA 1/1 | S3-POST | 573c307f OK |

- `git status --short` no fim: só `?? tests/jsan302-c2-rota-mem.test.ts` (meu, sai no teardown).

## Banco — lote 1 (item 1) — terreno
- 02:15:01Z: commit livre 4,57 GB (≥3); `docker ps | grep -v ^erp-` → 0 grupos alheios; disco 14 GB livres. Disparo: `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-jsan302-c2 "bash tmp-jsan302-c2/lote1.sh"` (scripts em `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c2/lote/`, copiados para `tmp-jsan302-c2/` não rastreado do MEU worktree).
- **Contêiner MEU: `tl179246253626587`** (`-pg`/`-redis`/`-run`), identificado por `docker inspect` do `-run`: mount `C:/Users/AMP/w-jsan302-c2`. No mesmo segundo nasceu `tl179246253526570` com mount `C:/Users/AMP/w-jsan302-c1` (a C1) → 2 trabalhos Docker na máquina, contando o meu (teto de 2 respeitado; o `dtrc02` já tinha saído).
- Origem pré-existente da semântica "cancelado por status segue ativo" (medida para o item 2): `git show B:src/modules/work-order-financials/work-order-financial.service.ts` l.357-358 — na base, `findActiveByWorkOrder` (só `deleted_at IS NULL`) acha o original cancelado por status e devolve **409 already_invoiced** a qualquer faturamento da OS; comentário da `20260811000000` l.5-6 ("`WHERE deleted_at IS NULL` deixa de fora os títulos cancelados (delete lógico)"); origem `a74efa53` 2026-07-18 (#212).

## Item 1 — lote 1 no banco (log integral: `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c2/lote1.log`; script `…/lote/lote1.sh`) — 02:18:44Z→02:22:12Z, contêiner `tl179246253626587`, PG 16.14, Prisma 7.8.0; os 5 blobs no contêiner = objeto
- **Fixture legada + deploy** (`jsan302_c2_leg`, migrada até a main = 112 migrações, diretório 20260878 fora): 5 títulos (OS-1: receivable removido, receivable ativo, payable ativo; 1 avulso; 1 cancelado por status em outra org) + 4 itens (3 carimbados, 1 não). `migrate status` antes ec=1 ("not yet applied"); `migrate deploy` ec=0. md5 de `financial_titles` sem a coluna nova e de `work_order_financial_items`: antes = depois (`FT n=5 d3bad04b…`, `IT n=4 2f7d64ff…`) → **dados preservados**; `titulos=5 com_pai=0`. Diff de catálogo antes×depois: +COL `parent_title_id uuid YES`; +CHECK; +FK `del=r` `FOREIGN KEY (tenant_id, work_order_id, direction, parent_title_id) REFERENCES financial_titles(tenant_id, work_order_id, direction, id) ON UPDATE CASCADE ON DELETE RESTRICT`; −`financial_titles_wo_direction_active_key`; +`…tenant_wo_direction_id_key`; +`…original_active_key … WHERE ((deleted_at IS NULL) AND (work_order_id IS NOT NULL) AND (parent_title_id IS NULL))` (predicado EXATO). RLS (`relrowsecurity/relforcerowsecurity`) e policies de `financial_titles`/itens: **IGUAIS**. Leitor de catálogo próprio: 5/5 ok.
- **2º deploy**: "No pending migrations to apply." ec=0; catálogo IGUAL; `migrate status` "up to date" ec=0. VERDE.
- **Vermelho-controle do leitor** (`jsan302_c2_fab`): índice fabricado sem `parent_title_id IS NULL` → `LEITOR ACUSA indice de originais`; FK fabricada `FOREIGN KEY (parent_title_id) REFERENCES financial_titles(id)` → `LEITOR ACUSA FK`. **Vermelho.**
- **Transação única — VERMELHO (ACHADO)** (`jsan302_c2_tx`, na main): cópia da migração com `ALTER TABLE "jsan302_c2_nao_existe" ADD COLUMN "x" INT;` depois da sentença 6 (prova: âncora 1×, 3438→3494 bytes). `migrate deploy` ec=1, `P3018`, `42P01`. **O catálogo NÃO ficou inteiro**: coluna `parent_title_id`, FK, CHECK, índice auxiliar e índice de originais PRESENTES, índice antigo AUSENTE — as 6 sentenças commitaram e só a 7ª falhou; `_prisma_migrations`: `20260878… finished=false rolled_back=false` (migração travada como falha). Logo `prisma migrate deploy` 7.8.0 **não** aplica esta migração numa transação única: a H10 do plano (§0.2 l.109) e o comentário da própria migração (l.4-5 "na mesma transação do `migrate deploy`") estão falsificados por execução. Restauro aca531da OK. (Medição complementar, janela sem backstop por prefixo e recuperação: lote 2, seção I.)
- **Delta de drift (Anexo B §3)**: `dmain` (112, schema da main md5 76177ff9) e `dhead` (113, schema do objeto), `migrate status` "up to date" nos dois; `migrate diff --from-config-datasource --to-schema … --script` → main 217 linhas/71 sentenças, head 220/72. SÓ NA MAIN: (vazio). SÓ NO HEAD: exatamente `ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"`. Controle do mecanismo: `DROP INDEX` de parciais conhecidos no diff da main = **0**; `parent_title_id`/chave auxiliar no delta = 0. **M27** (linha da coluna fora do schema, 1 linha removida) → o mutante ganha `DROP COLUMN "parent_title_id"` — VERMELHA. **M27b** (`@@unique … map: "financial_titles_tenant_wo_direction_id_key"` fora, 1 linha) → ganha `DROP INDEX "financial_titles_tenant_wo_direction_id_key"` — VERMELHA. `prisma validate` ec=0. Restauro d4dd5dbe OK. VERDE.
- **Drill T-D(a)–(e)** no objeto: **5/5**, 0 skip.
- **Rollback** (`jsan302_c2_rb`: main + fixture + deploy; down = rodapé do próprio arquivo, mesma regra de extração do drill, 6 sentenças): **ponta A** `psql -v ON_ERROR_STOP=1 -1 -f down.sql` ec=0 → backstop `…original_active_key` → `…active_key` (def original da 20260811) → re-up `…original_active_key` (1→1→1); coluna/FK/CHECK/aux = 0 após o down; dados iguais up×down; re-up (DELETE da linha da `_prisma_migrations` + `migrate deploy` ec=0): catálogo re-up = up, dados re-up = up. **Ponta B** (1 complementar ativo do original da OS-1): com `ON_ERROR_STOP=1 -1` → ec=3, `23505: could not create unique index "financial_titles_wo_direction_active_key"`; catálogo intacto; linhas intactas incluindo `parent_title_id` (`FTfull n=6 d73ac5fd…`); com `ON_ERROR_STOP` sem `-1` → ec=3, backstop novo segue. VERDE (= `P-SAN3-02-DOWN-COM-COMPLEMENTAR`, comportamento esperado).
- **R2 do DBA re-medida** (clone `jsan302_c2_r2`, o mesmo down por `psql -f` comum): ec=**0**; 23505 só como mensagem; estado final: backstop **nenhum**, coluna `parent_title_id` 0, FK+CHECK 0, **2 receivable ativos na OS-1**, 6 títulos, migração registrada como aplicada, `migrate status` "up to date" ec=0. **Confirma o DBA.** O comentário do down no objeto (l.39-46) não nomeia a invocação; a pendência `P-SAN3-02-DOWN-COM-COMPLEMENTAR` no objeto (pendencias.md l.11398-11409) registra a R2 e exige `psql -v ON_ERROR_STOP=1 --single-transaction` no runbook (dono: operação). Down é manual e nunca automático.
- **Vermelho-controle da migração** (uma por vez, restauro aca531da OK em todas): **M28** (sem o CHECK) → drill `T-D(c)` **not ok** (só ele rodou: padrão de nome), pela asserção "complementar sem OS … 23514" — VERMELHA. **M22** (FK de 2 colunas `(tenant_id, parent_title_id)`) → `T-D(a)` e `T-D(e)` not ok, 3/5 — VERMELHA. **M11b** (down recria o índice velho com outro nome) → `T-D(b)`, `T-D(d)` not ok (e (c)/(e) por base suja), 1/5 — VERMELHA. **M11 (1ª forma)** (down sem `DROP INDEX … original_active_key`): no catálogo, depois do down de 5 sentenças, backstop = só `…active_key`, aux=0, coluna=0 → o `DROP COLUMN` derruba o índice parcial que cita a coluna: **mutante EQUIVALENTE confirmado** pelo comportamento; o drill fica vermelho só por FORMA ("o down traz 6 sentenças (achei 5)").
- **FKS (vermelho-controle do item 3)**: cópia com FK simples `(parent_title_id) → (id)`, base `jsan302_c2_fks`: INSERT como dono de complementar do tenant A com pai de título do tenant B → **ec=0 `INSERT 0 1` (aceito; a sonda acusa)**; o mesmo INSERT na base do objeto (`dhead`) → **23503**.
- Teardown do lote: `bases jsan302_c2_*=0 drill_*=0`; `teste-linux ec=0` (contêiner e rede removidos pelo trap da ferramenta).
- Veredito parcial do item 1: forma, fixture, catálogo, idempotência, drift, drill, rollback A/B e todos os vermelhos-controle VERDES; **transação única VERMELHA** (critério do corpo "deploy não atômico" e do mandato "deploy com falha injetada … deixando o catálogo inteiro"). R2 confirmada (nota, ver voto).

## Banco — lote 2 (itens 2 e 3 + complemento do item 1) — log integral `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c2/lote2.log`, script `…/lote/lote2.sh`, sonda `tests/jsan302-c2-sonda-db.test.ts` (NÃO versionada; cópia em `…/jsan302-c2/`)
- Terreno 02:24:41Z: commit livre 4,31 GB; 1 grupo alheio vivo (`tl179246297929975`, mount `w-jsan302-c1` = C1) → 2 com o meu; disco 14 GB. **Contêiner MEU: `tl179246310831754`** (mount `C:/Users/AMP/w-jsan302-c2`). 02:26:24Z→02:31:08Z. Os 5 blobs no contêiner = objeto (início e fim).
- **Suíte atômica do bloco** no objeto: **17/17**, 0 skip (T-C1d, T-C6, T-C5-db, T-C9d, T-K4b, T-A4b, T-RLS incluídos).
- **Sonda própria no objeto, N=10 por corrida: 14/14**, 0 skip. Papel de runtime lido pela própria conexão: `{"u":"o6r_b01_…","s":false,"b":false}` (NOSUPERUSER, NOBYPASSRLS).

## Item 2 — complementar e índice de originais
- **S2.1 delta (T-C1/T-C2/T-C6)**: r2 `{"parent":T1,"total":45.5,"n":1}`; T2 no banco `parent_title_id=T1`, amount 45.5; **T1 byte-igual** (`to_jsonb` da linha inteira, antes = depois do 2º e do 3º faturamento); i1, i1b → T1; i2 → T2; 3º delta pai = **T1** (nunca T2); 3 ativos, 2 com pai T1; nenhum 23505.
- **S2.2 original pago (T-C3)**: T1 pago por `applyPayment(80)`; delta → complementar com pai T1; T1 `paid`, `paid_amount=80`, byte-igual.
- **S2.3 replay e T-K4b**: replay sem delta → `409/already_invoiced`, títulos 1→1; `markInvoiced` com item já carimbado por outro título → `count 0`, `title_id` mantido.
- **S2.4 INSERT cru de 2º original**: dono → `23505 financial_titles_wo_direction_original_active_key`; **papel de runtime (contexto RLS do tenant) → 23505 no mesmo índice**. **Irmão positivo**: o mesmo INSERT com pai válido (complementar) ACEITO como dono e como papel.
- **S2.5 pela ROTA** (controller real + `sendRouteError` do `http.ts`, decisão podre por Proxy em `findActiveByWorkOrder`): HTTP **409** `{"code":"WORK_ORDER_FINANCIAL_CONFLICT","reason":"already_invoiced"}`; títulos 1; o item do delta sem carimbo (nada persiste).
- **S2.6 corrida de dois ORIGINAIS por INSERT cru com barreira** (o 2º INSERT bloqueado no índice, medido por `waitForOwnBlockedStatement`), N=10: `{"vencedor ok · perdedor 23505":10}`; 1 original ativo em 10/10. Repetido no fim (seção H): 10/10 igual.
- **S2.7 corrida de dois `invoice` reais** na mesma OS, N=10: `{"201 original + 409/already_invoiced":10}`; 1 original ativo, Σ títulos = Σ itens carimbados, 0 item sem carimbo, em 10/10.
- **S2.8 (a) remoção lógica** (T-C4/T-C9): após `delete(T1)` com complementar T2 ativo + item novo → 201 com `parentTitleId null` (original novo; `parent_title_id` NULL no banco); itens de T1 seguem carimbados em T1; T2 segue → T1. Corrida real pós-remoção N=10: `{"201 original + 409/already_invoiced":10}`; corrida crua pós-remoção N=10: `{"vencedor ok · perdedor 23505":10}`; 1 original ativo em todas.
- **S2.9 (b) cancelamento por status** (`changeStatus → cancelled`, `deleted_at` NULL): delta → **201 complementar** com pai = T1 cancelado, `status open`, amount 9 (só o item novo); T1 `cancelled` byte-igual; i1 segue carimbado em T1; replay → 409; INSERT cru de 2º original com T1 cancelado → `23505 …original_active_key` (o cancelado segue sob o predicado); `delete(T1 cancelado)` ok → item novo → **201 original** (pai null), o complementar do cancelado segue ativo; corrida com pai cancelado N=10: `{"201 complementar + 409/already_invoiced":10}`, 1 original ativo, Σ títulos não cancelados = Σ itens carimbados neles, 0 item sem carimbo. **Julgamento pelo efeito em dinheiro**: nenhum faturamento em duplicidade (Σ fecha em 10/10); nenhum item novo fica sem faturamento possível (o delta é cobrado num título `open`); os itens do T1 cancelado ficam carimbados e não refaturáveis — semântica da `D-Ω4-C1` e do índice desde 2026-07-18 (`a74efa53`, #212; na base o mesmo cenário dava **409 already_invoiced** e o delta NUNCA era faturável — base l.357-358): **pre-existente**, inalterada pelo bloco. O "complementar de pai cancelado" é comportamento declarado (plano D3 (ii), T-C10) com pendência `P-SAN3-02-PAI-CANCELADO` (dono `SAN3-25`). Não reprova.
- **Vermelho-controle (banco)**, um por vez, restauro por hash OK em todos:
  - **M5** (migração sem `AND "parent_title_id" IS NULL`; base `jsan302_c2_m5` migrada pela cópia, índice lido `WHERE ((deleted_at IS NULL) AND (work_order_id IS NOT NULL))`) → S2.1 **not ok** ("This work order has already been invoiced." = 409 no delta); T-C1d e T-C6 **not ok**. VERMELHA.
  - **M5b** (índice de originais removido; backstop = 0) → S2.4 **not ok** (2º original cru `ok` como dono e como papel), S2.6 **not ok** (o 2º INSERT não bloqueia: os dois commitam); T-C5-db e T-A4b **not ok**. VERMELHA.
  - **M6** (Prisma `findActiveByWorkOrder` sem `parent_title_id: null`) → S2.1 (3º delta) **SOBREVIVE** (pai T1: o 1º inserido é T1 — coerente com o plano §7.3 A2); morre em S2.8 e T-C9d (400 `invalid_parent_title_reference`). VERMELHA nos casos que a citam.
  - **M15** (`markInvoiced` sem `invoiced_at: null`) → S2.3 **not ok** (`count 1`, `title_id` sobrescrito), T-K4b **not ok**. VERMELHA.
  - **M21** (Prisma `findActiveByWorkOrder` exclui `cancelled`) → S2.9 **not ok** (o delta com pai cancelado vira 409). VERMELHA.
  - Memória (host): M5-sim, M7, M21-mem vermelhas (tabela acima).
- Veredito parcial item 2: **VERDE**.

## Item 3 — parent_title_id não atravessa OS, direção nem organização
- **S3.1 porta do BANCO**, INSERT cru como DONO e como PAPEL DE RUNTIME (contexto RLS do tenant A):

| caso | dono | papel de runtime | garantia mora em |
|---|---|---|---|
| pai de outra organização | 23503 | 23503 | banco (FK 4 col.) |
| pai de outra OS | 23503 | 23503 | banco |
| pai de outra direção | 23503 | 23503 | banco |
| pai avulso | 23503 | 23503 | banco |
| pai = si mesmo | 23514 | 23514 | banco (CHECK) |
| complementar sem OS | 23514 | 23514 | banco (CHECK) |
| **pai que é complementar** | **ACEITO** | **ACEITO** | **serviço** (S3.2 → 400) — **residual de banco** |
| irmão positivo (original ativo, mesma OS/direção) | ACEITO | ACEITO | — |
| papel sob contexto A gravando linha de B | — | 42501 | banco (RLS) |

- **S3.2 porta do SERVIÇO** (`createForWorkOrderInUnit` dentro da `PrismaFinancialUnitOfWork` do papel): outra organização, outra OS, outra direção, removido, complementar, avulso, inexistente → **400 `invalid_parent_title_reference`, criados=0** (7/7); irmão positivo → criado (1). Memória: T-C11 verde; M26 vermelha (host).
- **S3.3 `POST /financial-titles`** (controller real, Prisma) com `parent_title_id`/`parentTitleId`/`work_order_id`/`workOrderId` válidos no corpo → 201, DTO `parentTitleId null`, `workOrderId null`; banco `parent_title_id NULL`, `work_order_id NULL`. HTTP em memória: S3-POST verde; mutação CF (create repassa) vermelha.
- **S3.4 leitura cruzada com DOIS tenants**: lista de B sem o complementar de A e sem id de A; `GET` de B → `404/title_not_found`; sob RLS de B, `findById` (com tenant A e com tenant B) → null/null; controle: A vê o próprio complementar e, sob RLS de A, ele aparece.
- **Vermelho-controle**: FK simples (lote 1, FKS) → outra organização ACEITA como dono (sonda acusa); CF → POST acusa; M26 → T-C11 acusa; M22 → T-D(e) acusa.
- **Residual de banco (não reprova sozinho)**: N=1 forma — pai que é COMPLEMENTAR da mesma org/OS/direção é aceito pelo banco (dono e papel de runtime, por INSERT cru); nenhuma porta da aplicação o grava (serviço recusa 400; rota pública ignora o campo; o faturamento só passa o pai de `findActiveByWorkOrder` = original). Declarado no plano (§1.2 P3″; §5 "o banco não garante pai é original").
- Veredito parcial item 3: **VERDE**, com o residual publicado.

## Item 1 — complemento: deploy não atômico (lote 2, seção I)
- Falha injetada (`ALTER TABLE "jsan302_c2_nao_existe" …`) logo depois da sentença k, base nova no nível da main, prova de aplicação por linha:

| k | deploy | backstop presente | coluna | aux | FK+CHECK | registro falho |
|---|---|---|---|---|---|---|
| 1 | ec=1 | `…active_key` | 1 | 0 | 0 | 1 |
| 2 | ec=1 | `…active_key` | 1 | 1 | 0 | 1 |
| 3 | ec=1 | `…active_key` | 1 | 1 | 1 | 1 |
| 4 | ec=1 | `…active_key` | 1 | 1 | 2 | 1 |
| 5 | ec=1 | `…active_key` + `…original_active_key` | 1 | 1 | 2 | 1 |
| 6 (lote 1) | ec=1 | `…original_active_key` | 1 | 1 | 2 | 1 |

- Em **todo prefixo** a base fica com pelo menos um índice de backstop (quem garante é a ordem CREATE novo → DROP velho; nunca há janela sem backstop), mas o deploy é **parcial**: as sentenças anteriores à falha commitam. Recuperação (base `px5`, arquivo do objeto restaurado): `migrate deploy` → ec=1 `P3009`; `migrate resolve --rolled-back` ec=0; `migrate deploy` → ec=1 `P3018`, `42701` ("column … already exists"): a migração não se reaplica sobre o próprio parcial; recuperar exige limpeza manual do catálogo.
- Teardown do lote 2: `bases jsan302_c2_*=0 papeis_efemeros_restantes=0`, `teste-linux ec=0`.

## Teardown
- Restauros: os 6 arquivos mutados (migração, schema, 2 repositórios Prisma, serviço de títulos, repositório InMemory) com `git hash-object` = `git rev-parse HEAD:<arq>` antes da remoção; `git status` só com os meus não rastreados (`tests/jsan302-c2-*.test.ts`, `tmp-jsan302-c2/`), copiados para `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c2/`.
- Bases `jsan302_c2_*` = 0 no fim de cada lote (e `*_drill_*` = 0; papéis efêmeros restantes = 0); contêineres e redes `tl179246253626587` e `tl179246310831754` removidos pelo trap da ferramenta (`docker ps -a`/`docker network ls` → 0); nenhum contêiner alheio tocado; sem `prune` de Docker.
- Nenhum processo node/npm no worktree; `git worktree remove --force C:/Users/AMP/w-jsan302-c2` ec=0 (diretório inexistente depois; `git worktree list` sem ele). Disco 15 GB livres.
- Base viva `erp-postgres`/`erp-redis` intocada (nunca conectada; nenhuma das portas 5432/6379/3000/5173/5050/8899 usada — os clusters não publicam porta). Nada commitado.
- P7: não recebi PAUSA.
