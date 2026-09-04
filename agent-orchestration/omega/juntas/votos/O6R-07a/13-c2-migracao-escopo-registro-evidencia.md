# EVIDÊNCIA — C3 · `jurado-b07a-migracao-escopo-registro` — CICLO 2 (TETO) do `B-O6R-07a`

- **Cadeira:** C3 — migração / escopo / registro. **Identidade MANTIDA do ciclo 1** (permitido pelo C2·8:
  aprovei sem veto e não consertei nada; quem consertou foi um dev novo — a vedação do §C7.4-bis é sobre
  quem acha consertar).
- **Quórum:** UNANIMIDADE DE 3. **Tenho veto.** **Ciclo-teto:** reprovação aqui = o bloco PARA.
- **Julgo o mérito; não proponho correção** (§C7.4-bis).
- **Head julgado:** `9989c62a3b81468dee6dd39fae3da6246e0e6fb1` — **medido por mim** (`git rev-parse HEAD`
  no worktree `.claude/worktrees/b07`, branch `fix/o6r07a-authorization`). Bate com o esperado `9989c62`.
- **Protocolo P1:** este arquivo nasceu como ESQUELETO antes de qualquer medição; cada sub-prova é
  apensada com **comando · saída · veredito parcial** ANTES de a seguinte começar.

## §0 — Estado inicial medido

```
$ git rev-parse HEAD
9989c62a3b81468dee6dd39fae3da6246e0e6fb1
$ git rev-parse --abbrev-ref HEAD
fix/o6r07a-authorization
$ git status --porcelain
 M agent-orchestration/omega/juntas/votos/O6R-07a/00-quedas.md
?? agent-orchestration/omega/juntas/votos/O6R-07a/00b-inspetor-c2-evidencia.md
?? agent-orchestration/omega/juntas/votos/O6R-07a/00b-inspetor-c2-parecer.md
?? agent-orchestration/omega/juntas/votos/O6R-07a/11-c2-autorizacao-evidencia.md
?? agent-orchestration/omega/juntas/votos/O6R-07a/11-c2-autorizacao-voto.json
?? agent-orchestration/omega/juntas/votos/O6R-07a/12-c2-auth-multiorg-evidencia.md
```

Consistente com a ressalva **R1** do inspetor (a queda #4 vive só na árvore) e com as cadeiras C1-v2 /
C2-v2 escrevendo agora.

---

## K1 — Escopo do C2·5, arquivo a arquivo, INCLUSIVE os congelados

### K1.a — O diff cabe nos 14 itens permitidos? — **CONFERE (com 1 `nota`)**

**Fronteira do ciclo 2 medida por mim** (não herdada): `git merge-base HEAD origin/main` = `f895dd2`
(== `origin/main`). Log da branch: o ciclo 1 foi julgado em `fb6618b`; a ata do ciclo 1 é `cec0e07`; o
apenso do plano é `9d44989`; o código do ciclo 2 é `9989c62`. **Delta do ciclo 2 = `cec0e07..9989c62`.**

```
$ git diff --numstat --name-status cec0e07 9989c62      (23 arquivos)
1	1	M Kpis/app.js                                     -> item 12 (nominado)
12	0	M Kpis/kpis-history.json                          -> item 12
18	0	M Kpis/kpis-history.md                            -> item 12  [fecha meu C3-A1]
8	13	M Kpis/kpis-latest.json                           -> item 12
41	0	M agent-orchestration/codex/log-execucao.md       -> item 13
10	7	M agent-orchestration/controle/pendencias-indice.md -> GERADO do item 11 (ver nota)
146	0	M agent-orchestration/controle/pendencias.md      -> item 11 (SÓ APPEND: 0 remoções)
5	0	M agent-orchestration/docs/status-geral.md        -> item 13
97	0	M .../votos/O6R-07a/00-quedas.md                  -> item 14
698	0	A .../votos/O6R-07a/dev-ciclo2.md                 -> item 14
351	0	M .../omega/planos/B-O6R-07-plano.md              -> item 14 (append-only: ver K1.d)
66	24	M docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md       -> item 10
1	1	M docs/revisoes/O6R/achados.jsonl                 -> item 10
24	0	M prisma/migrations/2026087.../migration.sql      -> item 9  (ver K3.a)
7	0	M src/modules/auth/auth-runtime.ts                -> item 4  (ampliação nominal)
3	0	M src/modules/auth/routes/auth.routes.ts          -> item 3
39	0	M src/modules/auth/services/anonymous-login.service.ts   -> item 1
56	27	M src/modules/auth/services/local-auth-login.service.ts   -> item 2
16	1	M src/modules/work-orders/work-order.service.ts   -> item 5
76	0	M tests/o6r07a-anon-lockout-db.test.ts            -> item 7
310	0	A tests/o6r07a-anon-lockout-multiorg.test.ts       -> item 6
11	12	M tests/o6r07a-anon-lockout.test.ts               -> item 7 (ver abaixo)
141	0	M tests/o6r07a-wo-object-scope.test.ts            -> item 8
```

**Nada além dos 14 itens.** As restrições de CONTEÚDO dos itens que as têm, conferidas uma a uma:

**item 4 (`auth-runtime.ts`, "SÓ o método espelho + zero outra linha"):** o diff é **um único hunk**, um
método `registerAnonymousFailure` na forma exata do `finalizeAnonymousLogin` vizinho (`withTenantRls` →
`buildService(tx)`), mais 2 linhas de comentário citando o C2·3/C2·5. Zero outra linha. **CONFERE.**

**item 5 (`work-order.service.ts`, "SÓ o dual-match dentro de `assertMutationObjectScope`"):** hunk único
em `@@ -814,7 +814,22 @@`, dentro do método; 10 das 16 adições são comentário. A única linha removida
é o `if` antigo, substituído por `atribuidoPorPerfil`/`atribuidoPorUsuario` + `if (!a && !b)`. Nenhuma
outra função tocada. **CONFERE.**

**item 7 (`o6r07a-anon-lockout.test.ts` 11/12 — "asserções mono-org NÃO afrouxam"):** é o ponto que o
orquestrador mandou auditar e **não herdar**; re-medi por conta própria nos blobs:
```
$ git show cec0e07:tests/o6r07a-anon-lockout.test.ts | grep -c "^test("   -> 7
$ git show 9989c62:tests/o6r07a-anon-lockout.test.ts | grep -c "^test("   -> 7
$ ... | grep -c "assert\."                                    -> 31  ->  30
```
As 12 remoções são: 2 chamadas de 5 linhas a `harness.service.verifyAnonymousCandidate({...})` trocadas
pela fiação real `harness.anonymous.attempt({...})` (a assinatura interna mudou de sítio — é exatamente o
"ajuste mecânico" que o item 7 permite), e 2 asserções (`result.ok === false` + `result.reason ===
"invalid_credentials"`) trocadas por **uma** (`outcome.kind === "invalid"`). **Não afrouxa:** medi os
discriminadores do tipo de retorno — `rate_limited`, `tenant_id_required`, `invalid`,
`selection_required`, `success` (`anonymous-login.service.ts:42-50`) — logo `kind === "invalid"` é o
mesmo conjunto que `ok=false ∧ reason=invalid_credentials`, sem alargar. E as **duas asserções que dão
nome aos testes são byte-idênticas**: `assert.deepEqual(harness.repository.mutations,
[incrementFailedAttempts:credential-1:${TENANT}])` e `assert.equal(harness.auditRows.length, 1)`.
**CONFERE** — 1 falha mono-org segue = 1 incremento + 1 linha.

**item 8 (`o6r07a-wo-object-scope.test.ts`, "+3 casos"):** 141/**0** — append puro. `grep -c "^test("`
**5 → 8**; os 3 novos são nominalmente `D3/DM1`, `D3/DM2`, `D3/DM3`. **Exatamente 3, nenhum removido.**

**item 11 (`pendencias.md`, "SÓ APPEND"):** 146/**0** — zero remoções. **CONFERE.**

**item 13 (`API_CONTRACTS.md` NÃO entra):** ver K1.e.

> **`nota` K1-N1 — `agent-orchestration/controle/pendencias-indice.md` (10/7) não é nominado no C2·5.**
> É o artefato **GERADO** de `pendencias.md` (item 11). É a MESMA classe que eu levantei no ciclo 1 no
> `C3-A3` — e o C2·4 nominou `Kpis/app.js` (a outra metade da minha nota) e **não** esta. Não é desvio de
> escopo: arquivo derivado mecanicamente de um arquivo permitido não pode ser omitido sem quebrar o
> gerador, e o K2.f prova que o conteúdo é **exatamente** o que o gerador produz. É lacuna de redação da
> lista, e a mesma regra que absolveu o `app.js` no ciclo 1 absolve este. `nota`, `dentro-do-bloco`.

### K1.b — Congelados intocados (lista nominal do C2·5-PROIBIDO) — **CONFERE**

**Passada 1 — os congelados nominais do C2·5, no delta do ciclo 2 (`cec0e07..9989c62`): saída VAZIA.**
```
$ git diff --name-only cec0e07 9989c62 -- \
    src/modules/core-saas/permissions/catalog.ts \
    src/modules/work-orders/approval.service.ts \
    src/modules/work-orders/work-order.routes.ts \
    src/modules/auth/services/password.service.ts \
    src/modules/auth/repositories/local-auth-credential.repository.ts \
    tests/work-order-checklists-sticky.test.ts tests/core-saas.test.ts \
    tests/fixtures/role-catalog-contract.snapshot.json \
    src/modules/work-orders/work-order-attachment.service.ts \
    'src/modules/work-order-comments/**'
(vazio)
```
**Vazio por INTOCADO, não por pathspec morto** — conferi que cada caminho EXISTE no head
(`git cat-file -e 9989c62:<f>` para os 8 arquivos = EXISTE em todos) e que
`src/modules/auth/repositories/local-auth-credential.repository.ts` e
`src/modules/work-order-comments/**` (10 arquivos, de `index.ts` a `work-order-comment.types.ts`) são os
caminhos reais, listados por `git ls-tree -r --name-only 9989c62`. **A "lei do ciclo" foi respeitada: nem
`work-order-attachment.service.ts` nem UM arquivo de `work-order-comments/` foi tocado** — a superfície
que o C2·2 fechou de propósito não reabriu.

**Passada 2 — os 8 testes do ciclo 5 + o §5-PROIBIDO do corpo, no delta do ciclo 2: saída VAZIA.**
```
$ git diff --name-only cec0e07 9989c62 -- tests/audit-security.test.ts \
    tests/vehicle-identity-schema.test.ts tests/impound-process-checklist-link-schema.test.ts \
    tests/helpers/auth-identity-fixture.ts tests/db-catalog-write-guard.test.ts \
    tests/core-saas-role-authority-db.test.ts tests/npm-test-runner-guard.test.ts \
    tests/financial-entry-delete-reverse-race-db.test.ts 'scripts/**' \
    'src/modules/authority/**' 'src/modules/financial*/**' '.github/**' 'frontend/**' 'mobile/**' \
    CLAUDE.md AGENTS.md '.env*' package-lock.json RBAC_MATRIX.md APPROVAL_LIMITS.md \
    docs/revisoes/O6R/PLANO_O6R.md prisma/schema.prisma
(vazio)
```

**Passada 3 — o mesmo pathspec contra o PR INTEIRO (`f895dd2..9989c62`), porque o que merga é o PR e não
o delta:** também **VAZIO**. E `prisma/**` no PR inteiro reduz-se a **UMA** linha:
```
$ git diff --name-status f895dd2 9989c62 -- 'prisma/**'
A	prisma/migrations/20260871000000_grant_work_orders_approve_permission/migration.sql
$ git diff --name-status f895dd2 9989c62 -- 'prisma/migrations/**' | grep -v '^A'
(vazio)  -> nenhuma migração EXISTENTE editada; schema.prisma intocado
```

**Passada 4 — os demais `tests/o6r07a-*`:** o head tem **8**; o delta do ciclo 2 tocou exatamente **4**
(`anon-lockout-db`, `anon-lockout-multiorg`, `anon-lockout`, `wo-object-scope`) — os 4 nominados nos itens
6/7/8. Os outros 4 (`approval-permission`, `approval-sod`, `login-rate-limit`, `scrypt-pin`) **não
aparecem no diff**, como o congelamento manda.

### K1.c — Prova POR MUTAÇÃO (não por diff vazio) — **A PASSADA MORDE**

Terreno: worktree descartável **meu**, `.claude/worktrees/o6r07a-c3-drill` (prefixo com o identificador do
**BLOCO**, `o6r07a`, conforme a regra de remoção), criado por `git worktree add --detach ... 9989c62`;
head conferido `9989c62a3b…`, `git status --porcelain` vazio. **Sem npm ci** (a prova é puramente `git`);
**zero junction/symlink de `node_modules`**.

**Mutação de 4 pernas REAIS** (`printf >>`, jamais `sed -i`), escolhidas para cobrir as três famílias de
congelado: a "lei do ciclo" (2), um teste do ciclo 5 (1) e um congelado do ciclo 1 (1).
```
$ printf '\n// MUTACAO-DRILL-C3-O6R07A\n' >> src/modules/work-order-comments/work-order-comment.service.ts
$ printf '\n// MUTACAO-DRILL-C3-O6R07A\n' >> src/modules/work-orders/work-order-attachment.service.ts
$ printf '\n// MUTACAO-DRILL-C3-O6R07A\n' >> tests/audit-security.test.ts
$ printf '\n// MUTACAO-DRILL-C3-O6R07A\n' >> src/modules/work-orders/approval.service.ts
$ git diff --name-only cec0e07 -- <os MESMOS pathspecs do K1.b>
src/modules/work-order-comments/work-order-comment.service.ts
src/modules/work-orders/approval.service.ts
src/modules/work-orders/work-order-attachment.service.ts
tests/audit-security.test.ts
-> ec=1 (NOMEOU 4 arquivos)
```
**A passada NOMEIA as quatro.** Logo o vazio do K1.b é vazio por intocado, e não por pathspec que não
alcança nada.

**Restauro por edição inversa exata** (truncagem de sufixo em Python — sem `git checkout -- .`, sem
`reset`, sem `stash`):
```
$ python restore_c3.py
truncado (-28 bytes): ... (4 arquivos)   ec_restore=0
$ <a MESMA passada, repetida>            -> ec=0 (VAZIO) — VOLTOU A ZERO
$ git status --porcelain                 -> (vazio) — árvore do drill LIMPA
```

### K1.d — Append-only do apenso CICLO 2 (`N 0`) — **CONFERE, e mais forte que o exigido**

O head pré-apenso é `cec0e07` (a ata do ciclo 1); o apenso entrou em `9d44989`.
```
$ git diff --numstat cec0e07 9d44989 -- agent-orchestration/omega/planos/B-O6R-07-plano.md
351	0
$ git diff --numstat cec0e07 9989c62 -- <o mesmo>
351	0
$ git diff --numstat 9d44989 9989c62 -- <o mesmo>
(vazio)   -> o plano NÃO mudou depois do apenso
```
`N 0` como o C2·8 exige. **Fui além**, porque `0` remoções ainda admitiria inserção no MEIO do corpo (o
que quebraria a promessa "nenhuma linha deles foi reescrita" do C2·0 se algo fosse inserido entre as
seções antigas): comparei os arquivos.
```
$ git show cec0e07:<plano> | wc -l     -> 699
$ git show 9989c62:<plano> | wc -l     -> 1050        (699 + 351)
$ diff <(git show cec0e07:<plano>) <(git show 9989c62:<plano> | head -n 699)
(sem diferença)  -> as 699 primeiras linhas são BYTE A BYTE as do pré-apenso
```
**O apenso é SUFIXO PURO.** O corpo, a E1 e a E2 estão intactos — a cláusula de precedência do C2·0 opera
por errata (C2·7), não por reescrita, exatamente como declarado.

### K1.e — `API_CONTRACTS.md` NÃO devia entrar — **CONFIRMADO**

```
$ git diff --name-only cec0e07 9989c62 -- API_CONTRACTS.md
(vazio)   -> NÃO entrou no ciclo 2
```
Contraprova de que o arquivo é alcançável pelo pathspec (não é vazio por engano): no **PR inteiro** ele
tem `15 4`, e o `git log` do caminho mostra **um único** commit — `62ec12d`, do **ciclo 1**, que o corpo
§5 PERMITIA nominalmente (*"`API_CONTRACTS.md` (delta §3)"*) e que eu mesmo auditei no ciclo 1
(`C3-3d_description`). **O ciclo 2 não acrescentou uma linha** — coerente com a razão declarada no item
13 ("nenhum código HTTP muda no ciclo 2").

### K1 — VEREDITO PARCIAL: **APROVA** (1 `nota`: K1-N1, `pendencias-indice.md` não nominado)

---

## K2 — KPI e registro (aceite C2·6 item 6)

### K2.a — Entrada nova com contagem real e §C3.3 em TODAS as não exercidas — **CONFERE**, mas a narrativa PUBLICADA do PR ficou no ciclo 1 (**achado `K2-A1`, `alta`**)

**A entrada nova existe e é do ciclo 2.** `kpis-history.json` tem **153** entradas; a última é
`version: "B-O6R-07a-ciclo2"`, `snapshot_date` 2026-09-03, `pr` **369**, `merge_commit` **null**,
`approved_head` **null**, `backend_tests` **"2654/2656"**, `blocks_completed` **158** (fica em 158 — mesmo
bloco, mesmo PR; só sobe a 159 no merge, e a entrada diz isso). O `description` dela é o registro do
ciclo 2 e **é honesto**: nomeia a reversão (*"o ciclo 2 REVERTE a declaracao"*), o `parcialmente_superado`
com as 9 rotas, o delta **+9** fechado por arquivo (`multiorg` novo = 5 · `-db` 6→7 · `wo-object-scope`
5→8), os vermelhos-controle com `ec` e trecho, e — o que mais conta — **as duas rodadas vermelhas sob
contenda de máquina, com as vítimas e a classe nomeadas**, além da rodada 1 em que o próprio guard FROZEN
mordeu a cauda da queda #3. Número honesto inclui a rodada feia; esta entrada inclui.

**§C3.3 em TODAS as não exercidas — conferido métrica a métrica** (não só as nomeadas; foi essa a minha
lição do ciclo 1). Varri as 10 métricas de `kpis-latest.json`:

| métrica | valor | marcador `B-O6R-07a` | `§C3.3` |
|---|---|---|---|
| `flutter_tests` | 864/864 | sim | **sim** |
| `frontend_smoke_tests` | 1126/1126 | sim | **sim** |
| `backend_tests` | **2654/2656** | — (**exercida**: nota de execução real com N e forma) | n/a |
| `backend_contract_tests_focused` | 34/34 | sim | **sim** |
| `flutter_modules` | 17/17 | sim | **sim** |
| `mobile_backend_contracts` | 18/18 | sim | **sim** |
| `mobile_core_saas_contracts` | 21/21 | sim | **sim** |
| `mvp_demo` | 99% | sim | n/a (§C3.4 — ver K2.b) |
| `mvp_vendavel` | 88% | sim | n/a (§C3.4) |
| `blocks_completed` | 158 | sim | n/a (contador de escopo) |

**6 de 6 não exercidas carregam a frase, na MESMA forma literal** (`valor CARREGADO … sem reexecucao
(§C3.3)`), e a única sem a frase é a **exercida** — que é o correto. **Não repeti o achado do ciclo 1.**
A nota de `backend_tests` publica N (=1 rodada completa), a forma canônica inteira (`npm test`,
`DATABASE_URL`/`REDIS_URL` do par descartável, `CORE_SAAS_PERSISTENCE` não exportada, `RBAC_DB_PARITY`
ausente) e a saída literal `256 arquivo(s) · 2656 teste(s) · pass 2654 · fail 0 · skipped 2`, `ec=0`.

---

> ### `K2-A1` — **`alta`, `dentro-do-bloco`** — a narrativa que o PR PUBLICA ficou no ciclo 1, e é a
> declaração que o ciclo 2 existe para reverter
>
> O registro **dentro do repositório** está certo. O que o PR **publica** não. Medido:
>
> **(a) O título do PR #369 é** `fix(auth): SEC-002 P0 **fechado** — permissao dedicada, SoD e escopo por
> objeto, mais os residuais do SEC-003 (B-O6R-07a)`.
> ```
> $ gh pr view 369 --json headRefOid,state,title
> headRefOid 9989c62a3b…  state OPEN   title "...SEC-002 P0 fechado..."
> ```
> **E o título vira o assunto do squash em `main`, verbatim** — medido nos 5 últimos merges:
> ```
> $ gh pr view 368 --json title -q .title   -> docs(contrato): P1-P6 inline ... (SAN2-6)
> $ git log -1 --format=%s f895dd2          -> docs(contrato): P1-P6 inline ... (SAN2-6) (#368)
> ```
> Mergear como está grava **"SEC-002 P0 fechado"** na história de `main`, permanentemente — sobre um
> achado que este mesmo ciclo rebaixou para `parcialmente_superado` com 9 rotas abertas.
>
> **(b) O corpo do PR é o texto do ciclo 1, intocado:**
> ```
> $ gh pr view 369 --json body  (4 863 bytes)
> grep -ci "ciclo 2"              -> 0
> grep -c  "parcialmente_superado"-> 0
> grep -c  "2654"                 -> 0     (a contagem do ciclo 2)
> grep -c  "2645"                 -> 1     (a contagem do CICLO 1, publicada como se fosse a deste PR)
> ```
> **(c) `kpis-latest.json → release.summary` idem** — `snapshot_date` subiu para 2026-09-03, mas o
> `summary` não foi tocado no ciclo 2 (o hunk do diff não o alcança):
> ```
> "fecha o P0 **Ω6R-SEC-002** por inteiro"  -> 1 ocorrência
> "perde TODA mutação"                      -> 1 ocorrência   (a caracterização que a errata E-a declara FALSA)
> "parcialmente_superado" / "ciclo 2"       -> 0 ocorrências
> ```
> e ele contradiz, **no mesmo arquivo**, o `findings.p0[SEC-002].status = "parcialmente_superado"` e a
> retirada do SEC-002 de `production_readiness.aguardando_merge` — as duas correções centrais do ciclo.
>
> **Por que não é `bloqueia`, e digo o critério em voz alta.** Tudo o que o painel **publica** está certo
> e é guardado: o painel lê de `release` apenas `status_label` (`Kpis/app.js:932` — o `summary` não tem
> consumidor na tela, e o bloco já registrou isso como `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`), e
> `findings` / `production_readiness` / `p0_fechados` estão corretos e cobertos por
> `kpi-achados-paridade`. A narrativa corrigida **existe e está no lugar canônico do §C3.1** — a entrada
> nova do `kpis-history.json`. O defeito é texto de fora do repositório, sem uma medição em risco.
>
> **Por que também não é `baixa`, pela MINHA própria régua do ciclo 1.** No `C3-A2` eu graduei o erro
> "42 arquivos" como `baixa` **explicitamente porque** *"a `description` do KPI NÃO repete o erro, então
> o painel não publica número errado"*. Aqui o PR **publica** número errado (`2645/2647` como execução
> real deste PR) e um **status revertido**. E o agravante é literal: o próprio texto do bloco cita, como
> precedente, *"a lição do #368, onde a `description` foi escrita cedo, nunca mais tocada, e acabou
> inventariando 45,4% do PR (**achado alta, por DUAS cadeiras independentes**)"* — e então repete a
> classe, agravada, porque desta vez não é inventário incompleto, é **status invertido**.
>
> **Escopo:** `dentro-do-bloco`. O texto é do ciclo 1 **deste mesmo PR**, `Kpis/kpis-latest.json` está no
> escopo PERMITIDO (C2·5 item 12), e o C2·8 exige por escrito *"Registro no PR: KPI §C3 completo
> (contagens de execução real …)"*. Não antecede o bloco e não está fora do escopo dele.
> **Não declarado:** `dev-ciclo2.md` não menciona `release` nem `summary` em nenhuma linha
> (`grep -i` = 0) — não é decisão consciente registrada, é omissão.

### K2.b — `mvp_*` intocados; `pr`/`merge_commit`/`approved_head` null na autoria — **CONFERE**

```
$ git diff cec0e07 9989c62 -- Kpis/kpis-latest.json | grep 'mvp_demo\|mvp_vendavel'
(vazio)   -> os hunks do ciclo 2 nem alcançam as duas métricas
$ para f895dd2 / cec0e07 / 9989c62:
f895dd2: mvp_demo=99  mvp_vendavel=88  blocks=157
cec0e07: mvp_demo=99  mvp_vendavel=88  blocks=158
9989c62: mvp_demo=99  mvp_vendavel=88  blocks=158
```
`mvp_*` **idênticos ao último oficial da `main`** — o ciclo 2 não moveu escopo, e a justificativa de 1
linha está na entrada do history (*"o ciclo 2 nao move escopo de MVP — corrige defeitos e registro do
proprio bloco"*). `blocks_completed` **fica em 158** (mesmo bloco, mesmo PR — só sobe a 159 no merge), e a
entrada diz isso por escrito.
`release.pr` = **369** · `release.merge_commit` = **null** · `release.approved_head` = **null** ·
`release.status` = **`published_per_pr`**, e a entrada nova do history repete os três. **§C3.5 cumprido.**

### K2.c — Espelho `Kpis/kpis-history.md` apensado (meu `C3-A1`) — **CONFERE — o destino declarado foi cumprido nas DUAS metades**

`18 0` — **append puro**, uma seção `## 2026-09-03 — B-O6R-07a-ciclo2 (PR #369, autoria)` no fim do
arquivo. E ela **declara a própria fronteira**, que era a segunda metade do meu `C3-A1`:
> *"Este espelho recebe SÓ a própria entrada: o backlog #361–#368 está em
> `P-KPI-HISTORY-MD-BACKLOG` (BAIXA, próximo `…F` de KPI)."*

Ou seja: o `C3-A1` do ciclo 1 (que eu graduei `baixa`/`pre-existente`) foi fechado exatamente como o C2·4
prometeu — **espelho apensado** + **pendência nomeada com dono** para o backlog herdado. O conteúdo da
entrada bate com o JSON (2654/2656, Δ +9 por arquivo, `p0_fechados` 4, `blocks` 158, `merge_commit`/
`approved_head` null).

### K2.d — `Kpis/app.js` só a `var FROZEN`; `kpi-freeze --check` ec=0 — **CONFERE**

```
$ git diff --numstat cec0e07 9989c62 -- Kpis/app.js          -> 1  1
$ git diff ... | grep -c '^[+-][^+-]'                        -> 2   (uma linha trocada)
$ git diff ... | grep '^[+-][^+-]' | cut -c1-30
-var FROZEN = {"snapshot_date"
+var FROZEN = {"snapshot_date"
$ node scripts/kpi-freeze.mjs --check   -> "kpi-freeze: em dia (snapshot 2026-09-03)."   ec=0
$ node --check Kpis/app.js                                                               ec=0
```
**Exatamente uma linha, e é a `var FROZEN`** — a paridade que o §C3.0 exige e que o C2·5 item 12 passou a
nominar por causa do meu `C3-A3`. **Destino do `C3-A3` cumprido.**

### K2.e — O guard MORDE (drill isolado: `app.js` da `main` × JSON do head → ec=1) — **MORDE, com DOIS testemunhos**

Drill no **meu** worktree descartável `o6r07a-c3-drill` (nunca no `b07`, onde as cadeiras C1-v2/C2-v2
medem agora). **Sem `npm ci` e sem junction:** o guard só importa `node:*`, então rodei-o com o `tsx` do
`b07` **por caminho absoluto** — não é junction nem symlink, é um `--import file:///…` de um arquivo, e
nada foi criado dentro de `node_modules` de ninguém.

**Estado limpo (head `9989c62`):**
```
$ node --import file:///…/b07/node_modules/tsx/dist/loader.mjs --test tests/kpi-dashboard-charts.test.ts
# tests 16 · # pass 16 · # fail 0     ec=0
```

**Injeção** — `app.js` da `main` contra o JSON do head (`git show f895dd2:Kpis/app.js > Kpis/app.js`;
155 014 → 146 103 bytes):
```
not ok 11 - painel: a cópia congelada é IDÊNTICA ao kpis-latest.json (gerada, nunca digitada)
    a cópia congelada do app.js divergiu do kpis-latest.json nas chaves
    [snapshot_date, version, release, metrics, production_readiness, findings] — rode
    `node scripts/kpi-freeze.mjs` e faça commit dos dois juntos.
# tests 16 · # pass 15 · # fail 1
$ node scripts/kpi-freeze.mjs --check
kpi-freeze: a cópia congelada do app.js DIVERGE do kpis-latest.json.        ec=1
```
**Dois guards independentes mordem e NOMEIAM as 6 chaves divergentes.**

**Restauro por cópia de bytes** (backup tirado ANTES da injeção, não `git checkout --`, para não depender
de `autocrlf`):
```
$ sha256sum Kpis/app.js  == sha256 do backup  -> ea036f8de569e97595cb9ac8a33c9d880a93dd9b5b4621dcf8d2199fc8cede74
$ git status --porcelain -> (vazio)
$ guard  -> # tests 16 · # pass 16 · # fail 0
$ kpi-freeze --check -> "em dia (snapshot 2026-09-03)"   ec=0
```
Backup do scratchpad removido ao final.

### K2.f — `pendencias-indice.md` regenerado PELO GERADOR sobre os blobs do head — **ZERO DESSINCRONIA**

É o meu precedente do `J-SAN2-5/C3-A5` (o índice commitado divergia do que o gerador produzia), então
**rodei o gerador**, não li o diff. Diretório isolado no scratchpad, alimentado por **`git show` do
blob** (nunca `git archive`+`tar` — a armadilha que injeta CR sob `autocrlf`):
```
$ git show 9989c62:agent-orchestration/controle/pendencias.md              > .../pendencias.md
$ git show 9989c62:agent-orchestration/controle/gerar-indice-pendencias.py > .../gerar-...py
$ git show 9989c62:agent-orchestration/controle/pendencias-indice.md       > .../indice-COMMITADO.md
$ tr -cd '\r' < .../pendencias.md | wc -c        -> 0     (blob LF puro — o "EOL misto" é da
                                                            árvore de trabalho sob autocrlf; nota de
                                                            método que eu já havia registrado no ciclo 1)
$ python agent-orchestration/controle/gerar-indice-pendencias.py
indice: 252 cabecalhos / 243 IDs | {'FECHADA': 55, 'ABERTA': 197}
        | baldes {'-': 55, 'C': 76, 'B': 83, 'A': 38} | diferidas-materiais 1      ec=0
$ sha256sum <regenerado> <commitado>
58d0a1445c4ec1059c99059a9ae17385398ba9b7e7f12b0740e22b80c91e0977  (regenerado)
58d0a1445c4ec1059c99059a9ae17385398ba9b7e7f12b0740e22b80c91e0977  (commitado)
```
**Hashes idênticos.** O índice commitado é EXATAMENTE o que o gerador produz sobre os blobs do head — não
foi digitado, e a classe do `J-SAN2-5/C3-A5` não reabriu. (É também o que sustenta a `nota` K1-N1: o
arquivo é derivado mecanicamente, não escrito.)

### K2.g — Os 7 registros do C2·5 item 11, bem-formados (N/forma/causa + dono) — **CONFERE, 7/7**

Extraí as **146 linhas adicionadas** de `pendencias.md` (`git diff | grep '^+'`) e li uma a uma. O bloco
abre declarando a própria mecânica (§A2): EOL misto, APPEND ao fim, cada registro **nomeando a
entrada-alvo por título e linha**, *"NENHUMA linha pré-existente foi editada"* — o que o `146/0` prova —,
e a **autoria** (`dev-o6r07a-ciclo2-c`, *"fecha registro; não achou, não planejou — §C7.4-bis"*).

| # | registro | forma | dono | veredito |
|---|---|---|---|---|
| 1 | APPEND à `D-DIVERGENCIA-B07A-A3-METODO-DA-PROVA` (l.5631) | razão FALSA corrigida **com a margem publicada**: canônica **49,08 ms** × trio fora do pino **0,04–0,40 ms** (**≥120×**), `N=32768` em 0,09 ms; decisão mantida | n/a (reparo) | **BEM-FORMADO** |
| 2 | **`P-O6R-SUBRECURSO-OBJECT-SCOPE`** (nova, ALTA) | as **9 rotas uma a uma com N/forma/causa**; distribuição **3 execução · 4 leitura · 2 condicionadas a env**; denominador dito (14 mutantes do router principal, 6 passam o gate, 2 guardadas / 4 abertas + as 5 de comentários) | **`B-O6R-07c`** (branch nomeada) | **BEM-FORMADO** |
| 3 | **`P-AUTH-KDF-ROTACAO-V2`** (nova, MÉDIA) | consolida `C2-A2` + `C2-A3`, escopo do bloco dono enumerado (coexistência v1/v2 + re-hash + defesa da l.45) | **`B-AUTH-KDF-V2`** | **BEM-FORMADO** |
| 4 | **`P-KPI-HISTORY-MD-BACKLOG`** (nova, BAIXA) | **forma do número declarada**: *"8 entradas ausentes, contadas por diff de IDs entre `kpis-history.json` e o espelho"* | próximo bloco `…F` de KPI | **BEM-FORMADO** |
| 5 | APPEND à tensão do `assigned_operator_id` (l.2896-2924) | devolvida MEDIDA e resolvida por dual-match, com o sítio do write (`work-order.service.ts:1669`) e o vermelho-controle (3 casos → 8/8 N=3) | `Ω6R-QUA-004` **segue aberto** com o dono dele | **BEM-FORMADO** |
| 6 | FECHAMENTO do residual `P-O6R-B07A-RASTRO-ANONIMO-SEM-IP` | evidência nomeada (`ok 6 … ipAddress/userAgent`, 3/3 `ec=0`) **com vermelho-controle** (`ec=1`, `2 !== 1`); diz o que NÃO fecha (`X-Forwarded-For` segue na mãe) | mãe segue ABERTA/MÉDIA | **BEM-FORMADO** |
| 7 | APPEND ao `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` (l.5589) | `C2-A4`: folga do piso sob carga **não medida**, dita como não medida; + a nota a favor (escritas do ramo de falha caem de 2×N para **≤2**) | pendência-mãe | **BEM-FORMADO** |

**Os três registros que criam pendência nova declaram os quatro campos** (`status` · `severidade` ·
`escopo` · `dono`), e o `escopo: pre-existente` do #2 vem **com evidência de data** (`bf456b0`,
2026-07-13, PR #173, e `D-Ω3F-5-COMMENT`) — que é o que o `D-JUNTA-ESCOPO-E-CALIBRACAO` exige para o
rótulo valer. **Nada aqui é "aberta, a ver".**

### K2 — VEREDITO PARCIAL: **APROVA com o achado `K2-A1` (`alta`, não `bloqueia`)**

Tudo o que o aceite C2·6 item 6 pede está entregue e medido: contagem de execução real com N e forma ·
§C3.3 em 6/6 não exercidas na mesma forma literal · `mvp_*` intocados com justificativa · `pr` 369 e
`merge_commit`/`approved_head` null · espelho apensado · FROZEN em paridade e `kpi-freeze --check` ec=0 ·
guard provado MORDENDO por dois testemunhos · índice regenerado com sha256 idêntico · 7/7 registros
bem-formados. **O que falha é a narrativa que o PR publica** (`K2-A1`).

---

## K3 — A migração e as erratas (aceite C2·6 item 5)

### K3.a — Diff da migração é SÓ comentários `--` no cabeçalho; corpo SQL byte-idêntico — **CONFERE**

```
$ git diff --numstat cec0e07 9989c62 -- prisma/migrations/2026087…/migration.sql
24	0                       -> 24 adições, ZERO remoções (47 -> 71 linhas)
$ git diff … | grep '^+' | grep -v '^+++' | sed 's/^+//' | grep -vc '^--'
0                       -> NENHUMA das 24 linhas deixa de começar por '--'
$ git show cec0e07:<migração> | grep -v '^--' | sha256sum
bf2bd0daaf7cc6fc898cfbec91170df2d187290d8cf74a31a3dc1319fc23ca89
$ git show 9989c62:<migração> | grep -v '^--' | sha256sum
bf2bd0daaf7cc6fc898cfbec91170df2d187290d8cf74a31a3dc1319fc23ca89
```
**Corpo SQL byte-idêntico** (mesmo sha256) e **zero remoções** — o que, por si, garante que toda linha
original sobreviveu verbatim. O hunk é **único** (`@@ -33,6 +33,30 @@`) e cai **dentro do bloco de
cabeçalho**, logo após o runbook de `down` e **antes** do primeiro `INSERT`. Nenhum comentário foi
inserido no meio do SQL.

### K3.b — Os avisos dos meus `C3-A4`/`C3-A5` entraram — **CONFERE, e foram além do que eu achei**

- **`AVISO 1` = meu `C3-A4`**, nominalmente citado: *"o DOWN desfaz os DADOS, mas NAO desmarca a migracao
  em `_prisma_migrations`"*; `migrate deploy` não a reaplica; e dá as **duas** saídas conscientes ((a)
  rodar o corpo à mão, idempotente; (b) migração nova, recomendada em produção por deixar rastro).
  **Acrescentou o que eu não tinha medido:** `prisma migrate resolve --rolled-back` mexe no registro e
  **não reexecuta**, e apagar a linha à mão é **drift silencioso**.
- **`AVISO 2` = meu `C3-A5`**, nominalmente citado: em banco só-migrado, `roles` vazia → o `CROSS JOIN`
  não acha as três chaves → o 2º `INSERT` insere **0 linhas** e a migração **termina com `ec=0` — sucesso
  aparente, permissão concedida a ninguém**. Diz o que eu disse (não é defeito da migração, é
  **dependência de ordem**) e **entrega a consulta de 1 linha** para o operador conferir que o grant
  pegou (espera `super_admin, tenant_admin, manager`).

**Os dois destinos declarados no C2·4 para `C3-A4`/`C3-A5` foram cumpridos**, e com mais informação
operacional do que a que eu levantei.

### K3.c — Idempotência RE-PROVADA (3 aplicações, ec=0, cluster descartável meu) — **RE-PROVADA nos DOIS estados, e os dois AVISOS são VERDADEIROS por execução**

**Terreno.** Portas **re-medidas no momento** (`docker ps` + `netsh … excludedportrange`): de pé só
`erp-postgres`:5432 e `erp-redis`:6379 — a **base viva, que não recebeu comando meu nem de leitura**; o
`jur-c2v2-pg`:15831 da cadeira C2-v2 já não estava de pé. Escolhi **`127.0.0.1:25433`**, fora de toda
faixa excluída do Hyper-V listada (2869 · 5357 · 49698+ · 50000+ · 53295+ · 54183+ · 60413+). **Nunca
55432.** Container **`o6r07a-c3-pg`** (`postgres:16`) — prefixo com o identificador do **BLOCO**.

```
$ DATABASE_URL=…@127.0.0.1:25433/erp_c3  npx prisma migrate deploy     -> ec=0
```

**ESTADO 1 — banco SÓ-MIGRAÇÃO, sem seed (é a hipótese do `AVISO 2`):**
```
perm=1 | roles=0 | grants=0        <- a migração SUCEDEU e concedeu a NINGUÉM
_prisma_migrations …approve = t
3 aplicações do MESMO arquivo do head (git show 9989c62:… | psql -v ON_ERROR_STOP=1):
aplicacao 1: ec=0 | 1|0|0
aplicacao 2: ec=0 | 1|0|0
aplicacao 3: ec=0 | 1|0|0
```
**`AVISO 2` confirmado por EXECUÇÃO**, não por leitura: `ec=0` com **0 grants** — o "sucesso aparente"
que o comentário passou a declarar.

**ESTADO 2 — papéis semeados** (6 papéis globais: os 3 alvo + `technician`/`field_dispatcher`/`viewer`
como controle):
```
aplicacao 1: ec=0 | perm=1 roles=6 grants=3
aplicacao 2: ec=0 | perm=1 roles=6 grants=3
aplicacao 3: ec=0 | perm=1 roles=6 grants=3
$ <a consulta que o AVISO 2 entrega ao operador>
manager
super_admin
tenant_admin
```
**3 aplicações, `ec=0` nas três, estado estável**, e a distribuição é exatamente a prometida — os 3
papéis de controle **não** receberam nada. **Idempotência re-provada nos dois estados** (o C2·5 item 9
pedia 1×3; entreguei 2×3).

**`AVISO 1` também confirmado por EXECUÇÃO** — rodei o runbook de `down` do cabeçalho, literal:
```
DELETE 3 / DELETE 1                      ec=0     -> estado 0|0
_prisma_migrations …approve  finished_at IS NOT NULL = t     (CONTINUA marcada como aplicada)
$ npx prisma migrate deploy -> "No pending migrations to apply."   ec=0
estado APÓS o deploy: 0|0                <- NÃO reaplicou; a permissão ficou fora do banco
```
É exatamente a armadilha que o comentário novo descreve. **O aviso não é só presente — é verdadeiro.**

### K3.d — Erratas `E-a`…`E-f` existem e são fiéis; `E-c` (41, não 42) e o painel nunca publicou 42 — **AS SEIS EXISTEM E OS SEIS ALVOS SÃO REAIS**

**Uma errata que descreve mal o alvo não é errata.** Então fui a cada alvo citado:

| errata | alvo declarado | o alvo diz mesmo aquilo? |
|---|---|---|
| **E-a** | E2 `F2.5(a)` + **briefing §6.3** | **SIM** — plano l.117: *"TODA mutação do ator de campo, inclusive edição comum"*; e `BRIEFING-O6R-07a.md` **seção 6, item 3**, l.134-135: *"técnico **não atribuído** perde **toda** mutação, inclusive a inócua"*. (Meu primeiro `grep "TODA muta"` no briefing deu vazio — a frase quebra de linha; achei-a lendo a seção. Registro o falso-negativo do meu método.) |
| **E-b** | corpo §4, linha 6 | **SIM** — a linha 6 da tabela do §4 prescreve *"espião de scrypt … (espião conta 1 scrypt)"*, mecanismo que a errata substitui por PROPRIEDADE com margem publicada |
| **E-c** | diário `dev-k1-k3-kpi.md`, §Fechamento | **SIM** — ver bloco abaixo |
| **E-d** | corpo §3.4 | **SIM** — l.192-193: *"`verifyAnonymousCandidate` … **passa a chamar** o MESMO `incrementFailedAttempts` atômico do B01"* — é literalmente o sítio que virou o defeito `C2-A1` |
| **E-e** | corpo §3.5 | **SIM** — *"aplicado às **DUAS rotas de login** (com organização e anônima)"* |
| **E-f** | tensão `assigned_operator_id` da E1/E4 | **SIM** — a entrada em `pendencias.md` (~l.2924) fechava com *"fica com a junta"*, e o C2·4 (l.904) a nomeia por linha |

**`E-c` — a minha — verificada nas três pontas:**
```
$ grep -n "TOTAL DO PR" .../dev-k1-k3-kpi.md
434:**TOTAL DO PR: 42 arquivos.**                       <- o erro existe, no diário
$ git diff --name-only f895dd2 62ec12d | wc -l
41                                                     <- o DISTINTO é 41, re-medido por mim
$ git diff --name-only f895dd2 73a351c -- agent-orchestration/controle/pendencias.md
agent-orchestration/controle/pendencias.md             <- a CAUSA: contado nas DUAS camadas
```
**E o painel nunca publicou 42** — varri os três artefatos de KPI nas duas pontas do ciclo:
```
"42 arquivos" em  kpis-latest.json / kpis-history.json / app.js
  em cec0e07 -> 0 / 0 / 0
  em 9989c62 -> 0 / 0 / 0
```
**Zero ocorrências.** O erro ficou contido no diário (registro histórico, que não se edita — daí a
errata), exatamente como eu graduei no ciclo 1. **Destino do `C3-A2` cumprido.**

**Onde a caracterização falsa ainda vive no head, e por que está certo:**
`git grep -l "TODA mutação" 9989c62 -- '*.md'` devolve **2** arquivos: `J-O6R-07a-ciclo1.md` (a **ata do
ciclo 1** — registro histórico do que a junta disse; editá-la seria falsificar a ata) e o **corpo da E2 no
plano** (append-only, superado pela errata). **Em nenhum dos dois ela vale como doutrina corrente** — o
C2·0 dá precedência ao apenso. O `BRIEFING-O6R-07a.md` é o briefing do **ciclo 1** (último toque em
`fb6618b`, do ciclo 1) e é da mesma classe: registro histórico. Se o briefing do **ciclo 2** cita a forma
corrigida é item da cadeira **C1-v2** (mandato dela, item 3), não meu — e o meu próprio mandato não
reproduz a frase falsa em lugar nenhum.

### K3 — VEREDITO PARCIAL: **APROVA, sem achado**

---

## §Destino dos meus achados do ciclo 1 (conferência declarada no mandato)

| achado | destino declarado (C2·4) | conferido? |
|---|---|---|
| `C3-A1` | pendência `P-KPI-HISTORY-MD-BACKLOG` + espelho apensado | **CUMPRIDO nas 2 metades** (K2.c, K2.g#4): espelho `18 0` com a própria entrada, que declara a fronteira; pendência BAIXA com dono e **forma do número** ("8 entradas ausentes, por diff de IDs") |
| `C3-A2` | errata **E-c** | **CUMPRIDO** (K3.d): errata presente, alvo real (l.434), 41 re-medido, causa confirmada, e o painel **nunca** publicou 42 (0/0/0 nos 3 artefatos, nas 2 pontas) |
| `C3-A3` | `Kpis/app.js` NOMINADO no escopo (C2·5 item 12) | **CUMPRIDO** (K1.a, K2.d): nominado no item 12, e o diff é **1 linha, a `var FROZEN`**. *Resta a metade irmã que o C2·5 não nominou:* `pendencias-indice.md` — `nota` K1-N1 |
| `C3-A4` | comentário `--` no cabeçalho da migração | **CUMPRIDO E MAIS** (K3.b, K3.c): `AVISO 1` presente, citando o achado por ID, e **verdadeiro por execução** (down → `_prisma_migrations` = `t` → `migrate deploy` "No pending migrations" → permissão fica fora) |
| `C3-A5` | comentário `--` no cabeçalho da migração | **CUMPRIDO E MAIS** (K3.b, K3.c): `AVISO 2` presente e **verdadeiro por execução** (`perm=1 roles=0 grants=0` com `ec=0`), + consulta de verificação para o operador |
| `C3-A6` | nada (auto-errata minha) | **CORRETO** — nada a fazer; não reapareceu em lugar nenhum |

---

## §Terreno e limpeza

- **Cluster descartável meu:** `o6r07a-c3-pg` (`postgres:16`, `127.0.0.1:25433`) — portas RE-MEDIDAS
  antes (`docker ps` + `netsh … excludedportrange`); **nunca 55432**. **REMOVIDO** (`docker rm -f`);
  `docker ps` final mostra só `erp-postgres` e `erp-redis`.
- **Base viva (`erp-postgres`:5432 / `erp-redis`:6379): ZERO comando meu, nem de leitura.**
- **Worktree descartável meu:** `.claude/worktrees/o6r07a-c3-drill` (detached em `9989c62`), **sem
  `npm ci`**, **zero junction/symlink de `node_modules`** — o `tsx` do `b07` foi usado por
  `--import file:///…` (arquivo, não link). Removido por `git worktree remove --force`.
- **REGRA DE REMOÇÃO respeitada:** só removi recursos cujo nome leva o identificador do **BLOCO**
  (`o6r07a-c3-*`). **Não toquei** em `agent-af6ea607f3ddf8efd`, `gov-descuido`, nem em container algum
  que não fosse meu; **nenhum `git worktree prune` foi rodado por mim.**
- **REPORTE de resíduo alheio (não varrido por mim):** na minha PRIMEIRA medição, `git worktree list` já
  mostrava `.claude/worktrees/jur-c2v2-red` como **`prunable`** — ou seja, **o diretório em disco já não
  existia** e sobrava só a entrada administrativa; quem o removeu foi a própria cadeira C2-v2, antes de
  eu rodar qualquer comando. Ao remover o MEU `o6r07a-c3-drill` por `git worktree remove --force`, a
  faxina automática do próprio git reapou aquela entrada morta. **Impacto zero** (não havia arquivo
  algum) e **não foi ato meu de remoção**; registro porque resíduo alheio se REPORTA.
- **Árvore principal:** não escrevi nela.
- **Escritas minhas no `b07`:** apenas `votos/O6R-07a/13-c2-migracao-escopo-registro-evidencia.md` e
  `…-voto.json`. **Não commitei nada.**
- **Proibições respeitadas:** nenhum `git reset` / `checkout -- .` / `stash` / `rm` de lock / `gc` /
  `prune` / `pack-refs` / `--force` sobre `.git`; nenhum `sed -i` ou `perl -i`; nenhum
  `git archive`+`tar` (usei `git show` do blob); nenhum heredoc com aspas (arquivos por `Write`);
  nenhum mass-delete.
- **R2 (contenda):** **não re-executei a suíte plena.** Medi `docker ps` antes de cada passo; no meu
  intervalo de medição só a base viva estava de pé. As contagens de suíte que julgo são as **declaradas
  e auditáveis** (entrada de KPI + diário, com N, forma, `ec` e as rodadas vermelhas nomeadas), e o
  guard de painel eu **executei** (16/16) e **provei mordendo**. Não reprovo por vermelho ambiental e
  não aceito vermelho sem classe nomeada — o diário nomeia a classe (timeout de transação Prisma,
  vítimas fora do bloco, interseção vazia), o inspetor reproduziu a mesma assinatura na ressalva R2, e
  a CI está **7/7** neste head.

---

## VEREDITO DA CADEIRA C3: **APROVADO** — com o achado `K2-A1` (`alta`, `dentro-do-bloco`) e a `nota` K1-N1

**Head julgado:** `9989c62a3b81468dee6dd39fae3da6246e0e6fb1`, medido por mim no início e reconferido no
fim. **Identidade mantida do ciclo 1**, como o C2·8 permite.

**Os três itens do meu mandato passam por medição, não por leitura:**

- **K1 — escopo.** O delta do ciclo 2 são **23 arquivos** e todos cabem nos 14 itens do C2·5; as
  restrições de conteúdo (ampliação nominal do `auth-runtime.ts`, "só o dual-match", "asserções mono-org
  não afrouxam", "+3 casos", "SÓ APPEND") foram conferidas **uma a uma no diff**. Os **congelados estão
  intocados** — inclusive a "lei do ciclo" (`work-order-attachment.service.ts` e os 10 arquivos de
  `work-order-comments/`), os 8 testes do ciclo 5 e os 4 `tests/o6r07a-*` não nominados — e provei que
  a passada **morde**, mutando 4 pernas reais e medindo `ec=1` com os nomes. O apenso é **sufixo puro**
  (699 linhas iniciais byte-idênticas). `API_CONTRACTS.md` **não entrou**.
- **K2 — KPI e registro.** Entrada nova `B-O6R-07a-ciclo2` com **execução real** (2654/2656, N e forma,
  Δ +9 fechado por arquivo, e as rodadas vermelhas declaradas com a classe nomeada); **6/6** métricas não
  exercidas com o §C3.3 na mesma forma literal — **não repeti o meu achado do ciclo 1**; `mvp_*`
  intocados; `pr` 369 e os dois hashes `null`; espelho apensado; FROZEN em paridade e **guard provado
  mordendo por dois testemunhos**; índice **regenerado pelo gerador** com **sha256 idêntico**; 7/7
  registros de pendência bem-formados, com dono e forma do número.
- **K3 — migração e erratas.** Diff **24/0, todas linhas `--`, no cabeçalho**, corpo SQL com **sha256
  idêntico**; os dois avisos são os meus `C3-A4`/`C3-A5` e são **verdadeiros por execução**;
  idempotência re-provada **2×3 aplicações** (`roles` vazia e semeada), `ec=0` nas seis, distribuição
  exata; as **seis erratas existem e os seis alvos dizem o que elas afirmam**; o painel **nunca**
  publicou 42.

**Os seis destinos que o C2·4 prometeu aos meus achados do ciclo 1 foram cumpridos** — dois deles
(`C3-A4`/`C3-A5`) com mais informação operacional do que a que eu levantei.

### Por que APROVO apesar do `K2-A1`, e o que a ata TEM de registrar

O `K2-A1` é real e eu o graduei `alta`, não `baixa`, pela minha própria régua do ciclo 1: o PR
**publica** um número errado (`2645/2647` como execução real deste PR) e um **status revertido**
("SEC-002 P0 fechado" no título, que vira o assunto do squash em `main` — medido nos 5 últimos merges).

Não é `bloqueia` porque **nada do que o produto e o painel publicam está errado**: código, migração,
escopo, contagens, `findings`, `production_readiness`, pendências e erratas foram medidos e conferem, e
a narrativa corrigida existe no lugar canônico do §C3.1 (a entrada nova do history) e no espelho `.md`.
O defeito é texto — dois campos do GitHub e um campo sem consumidor na tela (`Kpis/app.js:932` lê de
`release` só o `status_label`). Gastar a ÚLTIMA tentativa de um bloco cujo conteúdo está correto, por um
título editável em segundos e sem nenhuma medição em risco, seria exatamente o que o
`D-JUNTA-ESCOPO-E-CALIBRACAO` mediu e mandou parar de fazer (*"o bloqueante final sendo processo/medição
em 11 dos 16"*).

**Mas o meu APROVADO é sobre a ENTREGA, não sobre a etiqueta.** Fica escrito, para a ata e para quem
mergear:

> **O merge NÃO pode carregar o título atual.** `fix(auth): SEC-002 P0 **fechado** …` grava em `main`,
> permanentemente, a declaração que este ciclo existiu para reverter. O título e o corpo do PR #369 têm
> de refletir o ciclo 2 (`parcialmente_superado` com 9 rotas nomeadas; `backend_tests` **2654/2656**)
> **antes** do `gh pr merge`. Enquanto o corpo do PR disser `2645` e o repositório disser `2654`, o
> porteiro pós-merge acha divergência de promessa × diff — e acha com razão.

E o `release.summary` de `kpis-latest.json` merece a mesma correção ou uma pendência própria com dono:
hoje ele afirma, no mesmo arquivo que diz `parcialmente_superado`, que o P0 fechou "por inteiro".
**Qual dos dois caminhos seguir é decisão de quem planeja e de quem desenvolve — não minha** (§C7.4-bis:
eu acho e não conserto, e não proponho a correção).
