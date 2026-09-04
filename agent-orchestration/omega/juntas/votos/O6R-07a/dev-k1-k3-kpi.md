# EVIDÊNCIA DE DESENVOLVIMENTO — `dev-o6r07a-kpi-registros` (K1 · K2 · K3)

**Papel:** DESENVOLVER o registro do bloco `B-O6R-07a` — KPI (§C3), pendências e rastreabilidade.
Identidade nova. **Não achei** nada e **não planejei** (§C7.4-bis): implemento o registro do que os
quatro devs anteriores entregaram e o que as emendas E1/E2 decidiram.

**Worktree:** `.claude/worktrees/b07` · **Branch:** `fix/o6r07a-authorization`.
**Protocolo:** P1 (evidência incremental: gravar o item N antes de começar o N+1) · P2 (esqueleto antes
da mensagem final) · P4 (mandato de 3 itens).

---

## §0 · Baseline — MEDIDO por mim, antes de qualquer edição

```
$ git rev-parse HEAD                 → 73a351c8fe3bec1c6dbbe9dad542dac87895e6c8
$ git rev-parse --abbrev-ref HEAD    → fix/o6r07a-authorization
$ git rev-parse origin/main          → f895dd25f0d8cd5fb6b7c18373245e43f968fcd9
$ git merge-base origin/main HEAD    → f895dd2  (base LIMPA — sem drift)
$ git status --porcelain             → só `?? …/dev-k1-k3-kpi.md` (este arquivo)
$ git rev-list --count origin/main..HEAD → 5
$ node --version                     → v20.19.5
$ ls prisma/migrations | wc -l       → 104
```

**Não confiei no head do mandato — medi.** Ele bateu (`73a351c`).

**Diff completo, medido antes de escrever qualquer descrição** (a lição do #368: a `description` foi
escrita cedo e inventariou 45,4% do PR):

```
$ git diff --numstat origin/main...HEAD | awk '{a+=$1;d+=$2;n++} END {...}'
→ arquivos=32  add=4842  del=27

por área:  tests 12 arq +1790 -13 · src 11 arq +344 -14 · prisma 1 arq +47 -0
           agent-orchestration 8 arq +2661 -0
```

**Commits (5):** `2d54ea2` D1-D3 (SEC-002) · `a37a9dd` U1-U3 (provisionamento) · `e3c7a5b` A1-A3
(SEC-003 residuais) · `73a351c` S1-S4 (arranjo do sticky) · `c421f9f` (parecer do porteiro do #368,
herdado da base do branch).

**PROIBIDO — conferido, saiu VAZIO:**
```
$ git diff --name-only origin/main...HEAD -- frontend/ mobile/ .github/ CLAUDE.md AGENTS.md \
      RBAC_MATRIX.md APPROVAL_LIMITS.md scripts/
→ (nenhuma linha)
```

**Cluster:** o descartável do orquestrador (`o6r07a-final-pg` :56450 / `o6r07a-final-redis` :56451,
104 migrations). **A base viva `erp-postgres`:5432 / `erp-redis`:6379 não recebeu um único comando,
nem de leitura.**

---

## K1 — Os números, medidos por mim

### K1.1 · Suíte canônica — REEXECUTADA por mim, não copiada

Forma canônica: `npm test` (= `node scripts/run-backend-tests.mjs`), `DATABASE_URL`/`REDIS_URL`
exportadas para o cluster descartável, `CORE_SAAS_PERSISTENCE` **não exportada**, `RBAC_DB_PARITY`
**ausente** — a mesma forma declarada na nota de KPI do #366 e a do job `backend` do CI. Node v20.19.5.

```
$ npm test
# tests 2647 · pass 2645 · fail 0 · skipped 2 · duration_ms 193155.5
[run-backend-tests] 255 arquivo(s) · 2647 teste(s) · pass 2645 · fail 0 · skipped 2
EC_SUITE=0        · `grep -c "^not ok"` no log inteiro = 0
```

**CONFERE com o número que o orquestrador publicou** (255 · 2647 · 2645 · 0 · 2, ec=0). Nada a
contestar. N=1 rodada completa (o custo é ~193 s; os arquivos novos têm N=3 abaixo).

**Os 2 `skipped` têm nome** (não são flake): `toda permissão do catálogo existe na tabela permissions
do banco` e `os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS`, ambos de
`permission-catalog-db-parity`, auto-pulados porque a forma canônica não exporta `RBAC_DB_PARITY`.
É o orçamento de skip de sempre — e eu os rodei à parte, COM banco, no K1.4.

### K1.2 · O delta +36 fecha pelos DOIS lados

Baseline oficial (#366, `kpis-latest`): **248 arquivos · 2611 · pass 2609 · skipped 2**.
Agora: **255 · 2647 · 2645 · 2**. Δ = **+7 arquivos, +36 testes, +36 pass**, skip inalterado.

Denominador de cada arquivo NOVO, medido isoladamente (`node --test --import tsx <arquivo>`):

| arquivo novo | ec | tests | pass |
|---|---|---|---|
| `tests/o6r07a-approval-permission.test.ts` | 0 | 3 | 3 |
| `tests/o6r07a-approval-sod.test.ts` | 0 | 3 | 3 |
| `tests/o6r07a-wo-object-scope.test.ts` | 0 | 5 | 5 |
| `tests/o6r07a-anon-lockout.test.ts` | 0 | 7 | 7 |
| `tests/o6r07a-anon-lockout-db.test.ts` | 0 | 6 | 6 |
| `tests/o6r07a-login-rate-limit.test.ts` | 0 | 6 | 6 |
| `tests/o6r07a-scrypt-pin.test.ts` | 0 | 6 | 6 |
| **soma** | | **36** | **36** |

**36 = o delta exato.** Logo **nenhum arquivo pré-existente mudou de denominador** — confirmado um a
um nos 4 arquivos editados: `work-order-checklists-sticky` **15/15** (era 15 com 1 fail),
`approval-routes` **2/2**, `auth-login-anonymous-db` **6/6**, `core-saas` **26/26**. A conta fecha
pelos dois lados; não há número órfão.

### K1.3 · Bateria — `ec` de cada passo, medido por mim nesta árvore

| passo | comando | `ec` |
|---|---|---|
| tipos | `npm run check` | **0** |
| lint | `npm run lint` | **0** |
| suíte | `npm test` (forma canônica) | **0** |
| build | `npm run build` | **0** |
| contrato mobile | `node --test --import tsx tests/mobile-backend-contracts.test.ts` | **0** — `tests 25 · pass 25 · fail 0 · skipped 0` |
| frontend tipos | `npm --prefix frontend run check` | **0** |
| frontend build | `npm --prefix frontend run build` | **0** |
| whitespace | `git diff --check` | **0** |

**Nota de ambiente (não é regressão):** o mandato avisou que o frontend só passa depois de `npm ci`.
Medi: `frontend/node_modules` **já estava presente** nesta árvore, e os dois comandos deram `ec=0` sem
que eu instalasse nada. E o bloco **não toca a trilha web nem a mobile** — prova:
`git diff --name-only origin/main...HEAD -- frontend/ mobile/` sai **VAZIO** (`wc -l` = 0).

### K1.4 · Os DOIS guards de paridade RBAC — rodados COM banco, por mim

O aceite do E3.1 da emenda E1 exige os dois guards verdes e **nenhum deles `skipped`**. Refiz:

| guard | forma | `ec` | tests/pass/fail/**skipped** |
|---|---|---|---|
| `permission-catalog-migration-parity` (sem banco) | `node --test --import tsx` | **0** | 3 / 3 / 0 / **0** |
| `permission-catalog-db-parity` (COM banco) | `DATABASE_URL` do banco `erp_k3_parity`, `CORE_SAAS_PERSISTENCE=prisma`, `RBAC_DB_PARITY=1` | **0** | 2 / 2 / 0 / **0** |

**Como cheguei lá — e o falso alarme que NÃO publiquei.** Rodado direto contra o banco
`erp_techsolutions` do cluster, o db-parity deu **ec=1, 0/2**. Antes de chamar isso de achado, medi a
causa: `select count(*) from roles` → **0**, `role_permissions` → **0**, `permissions` → **14**. O
cluster está **migrado e NÃO semeado**, e o próprio guard diz na mensagem de skip que exige banco
"PROVISIONADO (migrate + seed)". Então criei um banco **separado** no mesmo cluster
(`CREATE DATABASE erp_k3_parity`, sem tocar `erp_techsolutions`), rodei `prisma migrate deploy`
(`ec=0`) + `npm run db:seed` (`ec=0`) e o guard ficou **2/2, skipped 0, ec=0**. Banco derrubado em
seguida (`DROP DATABASE`; `pg_database` volta a listar só `erp_techsolutions`).

**E a migração provisiona de fato — medido por mim, não herdado do diário do U1:**
```
$ select key from permissions where key='work_orders:approve';   → work_orders:approve
  (no cluster SÓ-MIGRADO, sem seed — quem inseriu foi a migração)
$ select r.key from role_permissions rp join roles r … join permissions p …
  where p.key='work_orders:approve';                              → manager, super_admin, tenant_admin
  (no banco semeado — exatamente os 3 da distribuição; technician/operator/field_technician de fora)
```

### K1.5 · §C3.3 — o que NÃO foi exercido por este PR

`frontend_smoke_tests` (**1126/1126**) e `flutter_tests` (**864/864**) **não foram exercidos**: o diff
de `frontend/` e `mobile/` é **VAZIO** nas duas pontas (`git diff --name-only origin/main...HEAD` e
`git status --porcelain`). Carregam o último valor oficial **com marcador §C3.3 explícito**, na mesma
forma literal das demais métricas. `backend_contract_tests_focused` (34/34), `flutter_modules` (17/17),
`mobile_backend_contracts` (18/18) e `mobile_core_saas_contracts` (21/21) idem — carregados com o
marcador. **A regra que a C3 do SAN2-6 cobrou (métrica sem a frase) vale para TODAS: nenhuma métrica
carregada fica sem o marcador §C3.3 nomeando este bloco.**

**Veredito parcial K1: CUMPRIDO.** Todos os números do mandato conferidos por execução própria;
nenhuma divergência contra o orquestrador.

---

## K2 — Entrada nova (152) + backfill §C3.5 do #368

### K2.0 · Como editei os JSON — e a prova de que não converti EOL

Os dois arquivos são **100% CRLF** (`tr -cd '\r' | wc -c` == `wc -l`: history **2317/2317**, latest
**711/711**). `sed`/`perl -i` **não foram usados** — em modo texto eles convertem o arquivo inteiro e a
mudança em massa passa por diff limpo.

Editei por **script Node** (`JSON.parse` → mutar → `JSON.stringify(obj, null, 2)`), e o script tem uma
**trava de fidelidade que roda ANTES de qualquer mutação**:

```js
const round = JSON.stringify(arr, null, 2).replace(/\n/g, "\r\n") + "\r\n";
if (round !== raw) throw new Error("roundtrip NAO e byte-exato — abortando para nao converter EOL");
```

Ou seja: se o meu escritor não reproduzisse o arquivo **byte a byte** antes de eu mudar nada, ele
abortaria. Os dois passaram. Pós-escrita, CR == LF nos dois (history **2329/2329**, latest **722/722**)
— e o crescimento de CR é exatamente o número de linhas novas, não uma conversão.

### K2.1 · Backfill §C3.5 do #368 — a dívida do porteiro, PAGA

Aplicado na entrada **151** (índice 150 = `SAN2-6`), com trava anti-duplicação no script (`if pr !== null
… throw` — a regra do primeiro-que-merge exige VERIFICAR, não sobrescrever):

| campo | valor |
|---|---|
| `pr` | **368** |
| `merge_commit` | **`f895dd2`** |
| `approved_head` | **`d90fbbb`** |

**A razão do `approved_head` está TRANSCRITA na própria entrada 151, ao lado do valor** — não neste
diário. Texto apenso à `description` da 151 (verificado no arquivo gravado: contém `BACKFILL §C3.5
APLICADO PELO B-O6R-07a`, `ressalva R1`, `**3 de 3**` e `9051e9b`). O conteúdo:

- grava-se **o head da ATA**, nunca o `headRefOid`: a ata `J-SAN2-6.md` nomeia `d90fbbb` (3 ocorrências)
  e **não nomeia** `9051e9b` nem `85a9058` (0 ocorrências);
- o precedente é **provado**, não invocado: a cadeira C3 do `J-SAN2-6` mediu **3 de 3** casos com hashes
  divergentes (#363, #364, #366) e nos três o gravado foi o head julgado;
- **o head final `9051e9b` carrega o delta pós-voto** — árvore idêntica à do squash, e o delta é o que a
  ata declara **em prosa sem pinar por hash**. Isto está dito porque o porteiro do #368 registrou como
  **ressalva R1** exatamente que a ata não nomeava esse hash, sob pena de nascer a 7ª materialização da
  classe "número sem âncora";
- **regra do primeiro-que-merge (§7.1 do plano):** o ciclo 5 do `B-O6R-02` roda em paralelo e a dívida
  estava atribuída ao "PR seguinte". **Este PR paga; o ciclo 5 VERIFICA e não duplica** — dito na entrada
  151, no `release.backfill_note` e no §Registro §A2 de `pendencias.md`.

### K2.2 · Entrada nova — a 152

```
$ node scripts-do-bloco/apply-history.mjs
entradas: 152
151: SAN2-6 368 f895dd2 d90fbbb
152: B-O6R-07a 2645/2647 158 desc chars: 20322
CR: 2329 LF: 2329 iguais: true     · git diff --numstat → 15 3
```

| campo | valor |
|---|---|
| `snapshot_date` | `2026-09-02` |
| `version` | **`B-O6R-07a`** |
| `pr` / `merge_commit` / `approved_head` | **`null` na autoria** (§C3.5) — o orquestrador não me passou nº de PR; **digo em vez de inventar**: `pr` fica `null` e recebe backfill como qualquer outro |
| `backend_tests` | **`2645/2647`** (execução real minha) |
| `frontend_smoke_tests` / `flutter_tests` | `1126/1126` / `864/864` — **carregados §C3.3** |
| `blocks_completed` | **157 → 158** |
| chaves | idênticas às das entradas 147–151 (10 campos, mesma ordem) |

**A `description` inventaria o PR INTEIRO** — foi escrita DEPOIS de `git diff --numstat
origin/main...HEAD` (32 arquivos, +4.842/−27, 5 commits), não de memória nem do mandato. Estão nela, por
nome: os 3 cortes do SEC-002 · os 2 residuais do SEC-003 · o pino do KDF · a migração de provisionamento
**com o motivo** (permissão sem migração nasce MORTA: produção roda só `migrate deploy`, sem seed → 403
para TODOS, inclusive o manager) · as DUAS emendas e o que cada uma corrigiu **do próprio plano** · a
descoberta do `RBAC_MATRIX.md:45` (o guard CUMPRE a matriz; o **200 antigo é que a contrariava**) · os
**7 vermelhos-controle com os números** · as **duas quedas com o custo real** · as contagens com N e
forma · o que o bloco **não** fechou (SEC-004, alçada por valor, `team_id`, rate-limit distribuído, a
tensão §A2, as 3 condições `pre-existente` do painel).

`mvp_demo` **99%** e `mvp_vendavel` **88%** — **INTOCADOS** (§C3.4), com marcador em cada `note`.

### K2.3 · `Kpis/kpis-latest.json` — o cartão do painel

`git diff --numstat` → **37 26**. Topo `version` `B-O6R-07a` / `snapshot_date` `2026-09-02`;
`release.{block,title,summary}` reescritos (o `summary` é a MESMA `description` da entrada 152);
`release.pr/merge_commit/approved_head` **null**, `status: "published_per_pr"`; `release.backfill_note`
reescrito para o #368. Métricas: `backend_tests` → `2645/2647` com nota de **execução real em primeira
pessoa** (N, forma, cluster, Node, delta +36 fechando pelos dois lados, os 2 skips nomeados);
`frontend_smoke_tests`, `flutter_tests`, `flutter_modules`, `mobile_core_saas_contracts`,
`backend_contract_tests_focused` e `mobile_backend_contracts` receberam **marcador §C3.3 nomeando este
bloco** — nenhuma ficou sem a frase (a C3 do SAN2-6 cobrou exatamente isso). `blocks_completed` → **158**,
com a condição escrita para o próprio sucessor ("159 só quando o 07a mergear").

**Uma decisão de honestidade que registro em voz alta:** rodei
`tests/mobile-backend-contracts.test.ts` e ele deu **25/25, ec=0**. A métrica `mobile_backend_contracts`
publica **18/18**. **Não promovi 25 a valor da métrica** — a régua dos 18/18 é outra (a métrica se chama
"contratos do app com o servidor", não "testes do arquivo"), e trocar régua sem junta fabricaria uma
quebra de série. O 25/25 está publicado como **execução de regressão**, na nota, com essa razão escrita.

**Veredito parcial K2: CUMPRIDO.**

---

## K3 — Painel, guards e registros

### K3.1 · `kpi-freeze` — e a atenção medida do mandato, confirmada

O mandato avisou: mexer no `release.summary` **muda o `app.js`**, e se o `--check` sair `ec != 0` depois
do freeze eu deveria parar. **Não saiu.** Sequência completa, com o `ec` de cada passo:

```
$ node scripts/kpi-freeze.mjs --check     → "a cópia congelada do app.js DIVERGE do kpis-latest.json"   ec=1
$ node scripts/kpi-freeze.mjs             → "cópia congelada reinjetada (snapshot 2026-09-02, 82373 bytes)"  ec=0
$ node scripts/kpi-freeze.mjs --check     → "em dia (snapshot 2026-09-02)"                              ec=0
```

O `ec=1` **antes** não é falha: é o guard fazendo o trabalho dele (eu tinha acabado de reescrever o
`summary`). O que importa é a ordem — mordeu, reinjetou, fechou.

### K3.2 · Os guards do painel — e a prova de que o de gráficos MORDE

| guard | `ec` | resultado |
|---|---|---|
| `node --check Kpis/app.js` | **0** | — |
| `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **0** | `16/16`, fail 0, skipped 0 |
| `node --test --import tsx tests/kpi-achados-paridade.test.ts` | **0** | `6/6`, fail 0, skipped 0 |

**Drill de mordida (o guard passar não prova que ele morde).** Troquei o `Kpis/app.js` pelos **bytes do
blob da `main`** (obtidos por `git show origin/main:Kpis/app.js` com `encoding: "buffer"` — **nunca**
`git checkout --`, que re-materializa CRLF), rodei o guard contra o JSON NOVO e restaurei:

```
app.js atual sha256[0:16]: c8f903a0f6dec0cc | 154689 bytes
app.js da main  sha256[0:16]: 581e6380d67a53a3 | 146103 bytes
ec = 1
not ok 11 - painel: a cópia congelada é IDÊNTICA ao kpis-latest.json (gerada, nunca digitada)
# tests 16 · pass 15 · fail 1
restaurado byte-exato: true | sha: c8f903a0f6dec0cc
```

**O guard morde, e a restauração é byte-exata** (mesmo sha256 antes e depois; `git diff --numstat` de
`Kpis/app.js` continua `1 1`, a linha do `FROZEN`).

### K3.3 · `Kpis/index.html` — INTOCADO, confirmado por medição

```
$ git diff --numstat -- Kpis/index.html   → (nenhuma linha)
$ git diff --numstat -- Kpis/             → 1 1 app.js · 15 3 kpis-history.json · 37 26 kpis-latest.json
```

**Nenhuma dimensão nova nasce neste bloco** — nenhuma métrica, rodada ou trilha nova — e o painel hidrata
dos JSON (§C3.0). Por isso o `index.html` não muda: mexer nele sem dimensão nova seria mudança sem causa.

### K3.4 · Pendências — o que fechou, com a evidência DE FECHAMENTO

Editei `pendencias.md` por script com **trava de âncora única** (`if (ocorrências !== 1) throw`) e
**contador de EOL antes/depois**: o arquivo é MISTO (5.568 CR para 5.603 linhas — **35 linhas LF-only**
pré-existentes), e o script provou que **as 35 continuam 35** depois da edição — nenhuma conversão
disfarçada de inserção.

| pendência | antes | depois | evidência de fechamento registrada na própria entrada |
|---|---|---|---|
| `P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE` | ABERTA · **BLOQUEIA o merge do 07a** | **FECHADA** | migração `20260871000000` entregue; `migration-parity` 3/3 e `db-parity` 2/2 (skipped 0, `ec=0`, banco semeado); chave presente em banco **só-migrado**; grants em manager/super_admin/tenant_admin e mais ninguém; `PERMISSOES_HERDADAS_DO_SEED` **não cresceu** (189) |
| `P-O6R-B07A-STICKY-409-VIRA-403` | ABERTA · **BLOQUEIA o merge do 07a** | **FECHADA + CORREÇÃO DE RUMO** | o título estava **invertido**: o sticky **não virou 403, VOLTOU a 409**. Arranjo consertado (técnico atribuído), 2 linhas revertidas byte-exato ao pré-E1, arquivo **15/15 `ec=0`**, vermelho-controle `14/15` no head `a37a9dd` |
| `P-O6R-B01-ANONIMO-SEM-LOCKOUT` (ALTA) | ABERTA (triagem SAN2-1 marcara por padrão conservador) | **FECHADA** | reuso do `UPDATE` atômico do B01 + rastro; resposta segue 401 uniforme; `o6r07a-anon-lockout` 7/7 + `-db` 6/6, vermelho-controle conjunto `13 · pass 4 · fail 9`; trade-off do DoS de conta consignado, não escondido |
| `P-O6R-B01-RATE-LIMIT-IP` (item de lista) | ABERTA | **FECHADA** na metade dele | balde por IP nas duas rotas, 429 `RATE_LIMITED`, `o6r07a-login-rate-limit` 6/6 com vermelho `6 · pass 2 · fail 4`; **residual migrado, não perdido** → `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` |
| `P-O6R-B07` (mãe) | ABERTA — 1 P0 + 2 P1 | **ABERTA — resta 1 P1** | metade fechada; `Ω6R-SEC-004` é o 07b; o `Bloqueia:` de auth/OS/aprovações cai, o de anexos/upload permanece |
| `P-O6R-B07A-REGISTRO-A2-DIVIDA-368` | — | **NOVA, FECHADA** | registro §A2 da reatribuição da dívida do #368, consumado no mesmo PR que a paga |

**Donos conferidos nas abertas pelos devs:** `P-O6R-B07-APPROVAL-BY-POLICY` — *"dono natural: o bloco que
introduzir alçada por valor"* ✓ · `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` — presente com origem declarada
(B-O6R-07a §3.5) ✓. As duas já nasceram com dono; **não inventei dono para nenhuma**.

### K3.5 · Índice — REGENERADO PELO GERADOR, com placar antes/depois

```
$ python agent-orchestration/controle/gerar-indice-pendencias.py
indice: 249 cabecalhos / 240 IDs | {'FECHADA': 54, 'ABERTA': 195} | baldes {'-': 54, 'C': 77, 'B': 82, 'A': 36}
ec=0
```

| | antes | depois | Δ |
|---|---:|---:|---:|
| Cabeçalhos `## P-` | 244 | **249** | +5 |
| IDs distintos | 235 | **240** | +5 |
| **ABERTAS** | 194 | **195** | +1 |
| — diferidas (balde C) | 77 | 77 | 0 |
| — ativas nesta rodada | 117 | **118** | +1 |
| **CONTRADITÓRIAS** | 0 | **0** | 0 |
| FECHADAS | 50 | **54** | +4 |

**O +5 de cabeçalhos tem causa nomeada, e ela é um achado sobre o índice, não sobre mim:** eu acrescentei
**UMA** entrada (o registro §A2). As outras **quatro** são as pendências que os devs abriram nos commits
anteriores (`P-O6R-B07-APPROVAL-BY-POLICY`, `P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE`,
`P-O6R-B07A-STICKY-409-VIRA-403`, `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`) — **o índice estava defasado: não
havia sido regenerado depois das +140 linhas que eles apensaram.** A aritmética fecha: ABERTAS 194 + 4
novas − 3 que fechei (PROVISIONAMENTO, STICKY, ANONIMO) = **195**; FECHADAS 50 + 3 + 1 (o §A2, que nasce
fechado) = **54**. Nenhuma CONTRADITÓRIA nasceu — o gerador denuncia cabeçalho que contradiz a linha de
status, e as minhas entradas fechadas mantêm cabeçalho e linha coerentes.

### K3.6 · `achados.jsonl` + `REGISTRO_ACHADOS_O6R.md` — formato MEDIDO antes de editar

Antes de tocar, li o formato de um fechamento existente (`Ω6R-SEC-001`): os três campos extras são
`fechado_em`, `fechado_por`, `evidencia_fechamento` — **não inventei campo**. E li o guard
`tests/kpi-achados-paridade.test.ts` inteiro, que impõe quatro coisas que eu teria errado por conta
própria:

1. **`fechado` na AUTORIA ≠ `fechado` na MAIN.** O guard classifica por **hash de merge no
   `fechado_por`** (`/[0-9a-f]{7,40}/`). Como este PR não mergeou, os dois `fechado_por` **não podem
   conter hash** — e o script tem asserção que aborta se contiverem, testando **as duas** regexes que o
   guard usa (com e sem `\b`). Consequência: `p0_fechados` continua **4** e `p1_fechados` continua **0**.
   *(Isto me fez corrigir o meu próprio rascunho: eu havia escrito `fechado_por` do SEC-003 como
   "B-O6R-01 (PR #357, 0a39824) + …", e o `0a39824` teria feito o painel contar um P1 como corrigido na
   `main`. O hash foi para a `evidencia_fechamento`, onde não engana contador.)*
2. **`production_readiness.aguardando_merge` tem de listar EXATAMENTE os fechados na autoria** — agora
   `Ω6R-SEC-002` e `Ω6R-SEC-003`, com `por`/`em` no mesmo formato da lista `fechados`.
3. **A seção do Markdown tem de dizer `- Status: **fechado**`** — senão o guard reprova o JSONL.
4. **O veredito não se move sozinho:** `deploy_bloqueado: true` e `REPROVADO PARA PRODUÇÃO` seguem
   intactos; o guard só permitiria mudá-los com veredito novo de junta em `fonte_veredito`.

Resultado: `achados.jsonl` **2 2** · `REGISTRO_ACHADOS_O6R.md` **56 0** (as duas seções + rodapé de
atualização, no idioma das anteriores, dizendo que a distribuição POR STATUS vai a P0 5/15 e P1 1/15
**enquanto o contador do painel não se move**). Guard de paridade **6/6, `ec=0`**.

`Ω6R-SEC-004` **não** foi tocado — segue `ativo`, coberto pelo bloco `B-O6R-07` no cronograma (o guard
exige que todo achado aberto tenha bloco; se eu tivesse marcado `B-O6R-07` como concluído, ele reprovaria).
**Não mexi no `roadmap`**: o estado `a_fazer` do `B-O6R-07` continua verdadeiro enquanto o 07b não entrar,
e mudá-lo seria juízo meu, não medição.

### K3.7 · `API_CONTRACTS.md` — o arquivo DOCUMENTA neste nível, então o delta entrou

**Medi antes de decidir:** a linha 232 já nomeava a permissão exata de `POST /approvals/:id/approve` e
`/reject` (`work_orders:update`), e a linha do `POST /auth/login` já enumerava `429 RATE_LIMITED`, `423`,
`409 TENANT_SELECTION_REQUIRED` e `400 TENANT_ID_REQUIRED`. Ou seja: o arquivo documenta permissão por
rota **e** código de erro por fluxo — o delta cabe, e **não** foi forçado. Entrou (`15 4`):

- `POST /approvals/:id/approve|reject` → **`work_orders:approve`**, com os papéis que passam a receber
  403 e o **403 `self_decision`** da SoD; preservados 404 cross-tenant e 409 `APPROVAL_ALREADY_DECIDED`;
- `PATCH /work-orders/:id` **e** `/status` → **403 `not_assigned_to_actor`** para ator de campo não
  atribuído, com a nota de que isso **cumpre** `RBAC_MATRIX.md:45` e que **404 segue reservado a
  cross-tenant**;
- `POST /auth/login` **com** organização → **`429 RATE_LIMITED` também aqui**, pelo balde por IP;
- nota em bloco sobre o freio por IP e o lockout anônimo, incluindo **o que NÃO é coberto**
  (multi-réplica/Redis, `X-Forwarded-For`, enumeração pelo 400) com o nome da pendência ao lado.

CRLF preservado (483/483, 100% CRLF antes e depois).

**Veredito parcial K3: CUMPRIDO.**

---

## Fechamento

### `git diff --numstat` — completo, nada elidido

**Camada de CÓDIGO + EVIDÊNCIA (commitada, herdada dos 4 devs anteriores), head `73a351c` vs `f895dd2`:**
**32 arquivos · +4.842 / −27** — `tests/` 12 arq +1.790/−13 · `src/` 11 arq +344/−14 · `prisma/` 1 arq
+47 · `agent-orchestration/` 8 arq +2.661.

**Camada de REGISTRO (minha, na árvore de trabalho): 9 modificados · +309 / −125**

| arquivo | +/− | o quê |
|---|---|---|
| `Kpis/kpis-history.json` | 15 / 3 | backfill do #368 na entrada 151 + **entrada 152** (`B-O6R-07a`) |
| `Kpis/kpis-latest.json` | 37 / 26 | cartão do painel: release, métricas, findings, `production_readiness` |
| `Kpis/app.js` | 1 / 1 | **só a linha do `FROZEN`**, reinjetada por `scripts/kpi-freeze.mjs` |
| `agent-orchestration/controle/pendencias.md` | 91 / 6 | 4 fechamentos + metade do `P-O6R-B07` + registro §A2 |
| `agent-orchestration/controle/pendencias-indice.md` | 88 / 83 | **regenerado pelo gerador** (nunca à mão) |
| `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` | 56 / 0 | SEC-002 e SEC-003 com `Status: **fechado**` + rodapé |
| `docs/revisoes/O6R/achados.jsonl` | 2 / 2 | os 2 registros virados, com os 3 campos de rastro |
| `API_CONTRACTS.md` | 15 / 4 | delta de contrato (permissão nova, 2× 403, 429, nota de rate-limit) |
| `agent-orchestration/docs/status-geral.md` | 4 / 0 | entrada do bloco (teto do mandato: ≤5 linhas) |

**+ 1 arquivo novo:** este diário (`.../votos/O6R-07a/dev-k1-k3-kpi.md`).
**TOTAL DO PR: 42 arquivos.** `Kpis/index.html` **não** aparece em lugar nenhum — é a medição, não uma
promessa.

### `ec` de cada passo — todos medidos por mim, nesta árvore

| passo | `ec` | resultado |
|---|---|---|
| `npm test` (forma canônica) — **antes** dos meus registros | **0** | `255 arq · 2647 · pass 2645 · fail 0 · skipped 2` · 0 `not ok` |
| `npm test` (forma canônica) — **depois** dos meus registros | **0** | **idêntico**: `255 · 2647 · 2645 · 0 · 2` · 0 `not ok` → **N=2, denominador idêntico** |
| `npm run check` (antes / depois) | **0** / **0** | — |
| `npm run lint` | **0** | — |
| `npm run build` | **0** | — |
| `node --test … tests/mobile-backend-contracts.test.ts` | **0** | `25/25` |
| `node --test … tests/permission-catalog-migration-parity.test.ts` | **0** | `3/3`, skipped 0 |
| `node --test … tests/permission-catalog-db-parity.test.ts` (`RBAC_DB_PARITY=1`, banco semeado) | **0** | `2/2`, skipped 0 |
| `node --test … tests/kpi-achados-paridade.test.ts` | **0** | `6/6` |
| `node --test … tests/kpi-dashboard-charts.test.ts` | **0** | `16/16` |
| **drill de mordida** do guard de gráficos (`app.js` da `main` × JSON novo) | **1** | `not ok 11` · restauração byte-exata provada por sha256 |
| `node --check Kpis/app.js` | **0** | — |
| `node scripts/kpi-freeze.mjs --check` (antes / depois do freeze) | **1** / **0** | mordeu e fechou |
| `python …/gerar-indice-pendencias.py` | **0** | 249 cabeçalhos / 240 IDs |
| `npm --prefix frontend run check` / `build` | **0** / **0** | sem `npm ci` — já estava instalado |
| `git diff --check` (antes / depois) | **0** / **0** | — |

### Escopo — o PROIBIDO conferido por comando, não por memória

```
$ git status --porcelain -- src/ tests/ prisma/ scripts/ .github/ frontend/ mobile/ \
      CLAUDE.md AGENTS.md RBAC_MATRIX.md APPROVAL_LIMITS.md agent-orchestration/omega/planos/
→ (nenhuma linha)

$ git diff --name-only origin/main...HEAD -- .github/ scripts/ frontend/ mobile/ CLAUDE.md AGENTS.md \
      RBAC_MATRIX.md APPROVAL_LIMITS.md docs/revisoes/O6R/PLANO_O6R.md src/modules/authority/ \
      <os 8 arquivos de teste reservados ao ciclo 5>   | wc -l
→ 0
```

Os 9 arquivos que editei estão **todos** no §5-PERMITIDO do plano (`Kpis/*` os quatro — dos quais o
`index.html` não precisou mudar —, `pendencias.md`, `achados.jsonl` + `REGISTRO`, `status-geral.md`,
`API_CONTRACTS.md`), mais `pendencias-indice.md` (artefato **gerado** a partir do permitido) e o meu
diário em `votos/O6R-07a/`.

### Placar do índice — antes → depois

**244 → 249** cabeçalhos · **235 → 240** IDs · **ABERTAS 194 → 195** · **FECHADAS 50 → 54** ·
**CONTRADITÓRIAS 0 → 0** · diferidas (balde C) 77 → 77 · ativas 117 → 118.
Causa do +5 explicada no K3.5 (4 delas são pendências dos devs que o índice ainda não tinha visto — ele
estava defasado; 1 é a minha).

### O QUE EU NÃO FIZ, E POR QUÊ

1. **Não commitei, não abri PR, não mergeei.** Não é meu papel (mandato).
2. **`pr` da entrada 152 ficou `null`.** O orquestrador não me passou número de PR; o mandato manda dizer
   em vez de inventar. `merge_commit`/`approved_head` também `null` — §C3.5, correto na autoria.
3. **Não atualizei `Kpis/kpis-history.md`** (o espelho Markdown, parado desde o #360) **nem o bloco
   `recent`** do `kpis-latest.json` (congelado no #359, `P-KPI-RECENT-CONGELADO`). São condições
   **`pre-existente`** com pendência nomeada; o SAN2-6 as declarou e não as tocou, e destravá-las agora
   criaria assimetria (faltariam #361–#368) sem junta ter decidido a régua. **Declarado na `description`,
   não escondido.**
4. **Não mexi no `roadmap` do painel.** `B-O6R-07` segue `a_fazer` porque o 07b não entrou; mudar o
   estado seria juízo meu. Consequência medida e aceita: `Ω6R-SEC-004` aparece como "Adiado — na fila do
   bloco B-O6R-07", que é verdade.
5. **Não promovi o `25/25` do contrato mobile a valor de métrica** (a métrica publica 18/18, régua
   diferente) — publicado como execução de regressão, com a razão escrita (K2.3).
6. **Não derrubei os containers do cluster** (`o6r07a-final-pg` / `o6r07a-final-redis`): são do
   orquestrador e o mandato disse para não derrubá-los sem avisar. **O banco `erp_k3_parity` que EU criei
   foi derrubado** (`DROP DATABASE`; `pg_database` volta a listar só `erp_techsolutions`).
7. **Não toquei a base viva** `erp-postgres`:5432 / `erp-redis`:6379 — **nenhum comando, nem de leitura**.
8. **Não julguei o mérito de nada** (§C7.4-bis): a tensão §A2 do `assigned_operator_id`, a leitura de
   contrato do F2 e o trade-off de DoS do lockout anônimo estão **registrados e entregues à junta**, não
   resolvidos por mim.
9. **Não corrigi nem apaguei nada dos devs anteriores.** Só registrei o que eles mediram, sempre
   re-executando o que eu podia re-executar barato.

### Divergência que devolvo ao orquestrador (§A2)

O mandato pede "as **duas** quedas de agente com o custo real de cada uma". **Medi: o `00-quedas.md`
deste bloco registra UMA queda** (`dev-o6r07a-auth-residuais`, `server_error`, custo 3/3 das provas). A
**segunda** que o próprio arquivo cita é a da **cadeira C3 do `J-SAN2-6`** (queda `rate_limit` 429, 0
voto perdido, P1 cumprido, custo 1/3 do mandato) — ela é da junta do **#368**, e está neste PR só porque
o parecer do porteiro daquele merge viaja aqui. **Inventariei as duas com a origem de cada uma
declarada**, para não inflar o numerador da série P6 do bloco 07a. Se o orquestrador tinha uma segunda
queda de 07a em mente, ela **não está registrada em disco** — e eu não a inventei.

### Limpeza (§C5) — 1 linha

Removido: o banco de sonda `erp_k3_parity` (`DROP DATABASE`, conferido por `pg_database`); nenhum build
artifact gerado além dos regeneráveis de `npm run build`/`frontend build`; os scripts e logs desta sessão
ficaram **fora da árvore do repositório** (scratchpad); containers do orquestrador **preservados**,
branches e `.git` intocados, base viva sem um único comando.

### Veredito do desenvolvedor de registro

**K1 CUMPRIDO · K2 CUMPRIDO · K3 CUMPRIDO.** Todo número publicado tem comando e head ao lado; nenhum foi
estimado. A `description` da entrada 152 foi escrita **depois** de medir o diff inteiro e nomeia **todos**
os artefatos do PR — a classe que o #368 materializou pela 6ª vez não se repete aqui.
