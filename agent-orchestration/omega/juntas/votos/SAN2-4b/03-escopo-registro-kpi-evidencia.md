# SAN2-4b — Cadeira C3 (`zelador-do-escopo-do-registro-e-do-kpi`), SUPLENTE de identidade nova

> PR **#366** · head julgado **`2d2d16d`** · junta de 3, **UNANIMIDADE** · worktree `.claude/worktrees/san2-r`.
>
> **MÉTODO — imposto pelo terreno.** A cadeira **C2** trabalha NESTE MESMO worktree com mandato de
> **mutar código** (incidente registrado em `00-quedas.md`: despacho do orquestrador, não falha das
> cadeiras). Portanto **toda medição abaixo sai dos BLOBS do head** — `git show 2d2d16d:<path>` e
> `git diff main...2d2d16d` — e **nunca da árvore de trabalho**. Onde a árvore for consultada, isso é
> dito na linha. **Não toquei, não restaurei e não reverti nada da C2.**
>
> **Antecessora.** A cadeira C3 anterior caiu por `server_error` depois de detectar a mutação alheia e
> se recusar a medir por cima dela — decisão correta. Pela **R2**, as conclusões dela **não são insumo**;
> pela **P3**, os comandos que ela registrou foram roteiro de re-execução barata. **Re-executei tudo.**
> O registro dela está preservado, intacto, em `03-antecessora-caida-evidencia.md` e
> `03-antecessora-caida-voto.json.txt` — não editei nem apaguei nada dele.
>
> **Base viva.** `erp-postgres`/`erp-redis` **não receberam um único comando meu**, nem de leitura.
> Nenhum container, nenhuma porta, nenhum commit.

---

## ITEM 1 — ESCOPO — **CONFORME**

### 1.1 O diff e a topologia da branch

```
$ git diff --name-only main...2d2d16d | wc -l    -> 20
$ git diff --check main...2d2d16d                -> ec=0 (limpo)
$ git log --oneline main..2d2d16d
  2d2d16d docs(registro): ... (SAN2-4b C5+C6)
  ecfdb24 fix(arnes): ... (SAN2-4b C3+C4)
  f6631d0 fix(authority): ... (SAN2-4b C1+C2)
  fca131a docs(gate): porteiro pos-merge do #365 — LIBERADO COM RESSALVA para o SAN2-4b
```

Quatro commits: **três do dev** e **um anterior a eles**, `fca131a`.

### 1.2 O 20º arquivo (R2 do inspetor) — **CABE; e não é sequer obra do dev**

A R2 aponta `agent-orchestration/omega/juntas/votos/SAN2-4a/00c-porteiro-pos-merge-365.md`
(novo, **+133/-0**): está sob o glob `agent-orchestration/omega/juntas/**` do §5.1, mas o parêntese
diz "desta junta, pelos papéis dela" — e este é o parecer do **porteiro** sobre a junta do **4a**.

O que a R2 não tinha medido, e eu medi — **a autoria e a data**:

```
$ git log --oneline --diff-filter=A main..2d2d16d -- .../SAN2-4a/00c-porteiro-pos-merge-365.md
  fca131a docs(gate): porteiro pos-merge do #365 — LIBERADO COM RESSALVA para o SAN2-4b
$ git show --name-only --format= fca131a
  agent-orchestration/omega/juntas/votos/SAN2-4a/00c-porteiro-pos-merge-365.md   (ÚNICO arquivo)
```

`fca131a` é o **commit de base da branch**, **anterior aos três commits do dev**, e o cabeçalho do
próprio plano o declara por escrito: *"head no momento do plano `fca131a` (= `main` + o parecer do
porteiro do #365, **único delta**)"*. O §5.1 governa **o que o executor do bloco pode tocar**; o
executor **não tocou** este arquivo — ele já estava na branch quando o plano foi escrito, é a
**autorização de start** do bloco (§C2.8), e é **+133/-0**, adição pura, sem uma linha de registro
alheio editada.

- **Veredito:** não é escopo estourado. **Escopo: `pre-existente`** — evidência de origem: commit
  `fca131a`, anterior a `f6631d0` (primeiro commit do dev), declarado no cabeçalho do plano.
- **Ressalva de redação, sem gravidade:** o parêntese "desta junta" do §5.1 é mais estreito que o
  glob que ele qualifica. Higiene de plano futuro — não defeito deste PR.

### 1.3 Os outros 19, contra o §5.1

**Código — exatamente os 5 nomeados, nenhum a mais:**

```
$ git diff --name-only main...2d2d16d -- 'src/**'    -> src/modules/authority/authority-password.ts
$ git diff --name-only main...2d2d16d -- 'tests/**'  -> authority-portal.test.ts
                                                        db-catalog-write-guard.test.ts
                                                        helpers/auth-identity-fixture.ts
                                                        rls-tenant-isolation.test.ts
```

**Registro/KPI — os 14 restantes, todos nomeados no §5.1:** `pendencias.md` · `pendencias-indice.md` ·
`status-geral.md` · `B-O6R-02-ciclo5-plano.md` (apenso D29) · `SAN2-2-plano.md` (apenso) ·
`SAN2-4b-plano.md` · `Kpis/app.js` · `Kpis/kpis-history.json` · `Kpis/kpis-latest.json` · os **5**
diários `dev-c*.md` em `votos/SAN2-4b/`.

### 1.4 O PROIBIDO (§5.2) — **intocado, medido por pathspec**

```
$ git diff --name-only main...2d2d16d -- '.github/**' 'prisma/**' 'migrations/**' 'scripts/**' \
    'frontend/**' 'mobile/**' 'portals/**' 'package.json' 'package-lock.json' '.claude/**' \
    '.agents/**' 'infra/**' '.env*' 'CLAUDE.md' 'AGENTS.md' 'API_CONTRACTS.md'
  (saída VAZIA)
```

`.github/` **intocado**. Contratos (`API_CONTRACTS.md`) **intocados**. `scripts/**` intocado — o
`kpi-freeze.mjs` e o runner foram **executados**, nunca editados. Nenhum dos outros 4 gatilhos do
sweep (`auth-identity-backfill-db`, `auth-identity-link-events-db`, `auth-identity-role-real-db`,
`auth-login-candidates-fn-db`) aparece no diff.

### 1.5 As restrições FINAS do §5.1 — é onde um bloco escorrega

| Restrição escrita no §5.1 | Medição minha (blob) | Resultado |
|---|---|---|
| `Kpis/app.js`: **SOMENTE a linha FROZEN** | `--numstat` = **`1 1`**; hunk único `@@ -1620,7 +1620,7 @@`, a linha `var FROZEN = {...}` | **OK** |
| `db-catalog-write-guard`: nenhum `test()` novo, nenhum removido | `grep -cE` da assinatura no blob: `main` **6** → head **6** | **OK** |
| `rls-tenant-isolation`: corpo do teste RLS não muda | `main` **2** → head **2** casos; diff = 1 import, 1 chamada de sweep, 1 troca de teardown, comentários | **OK** |
| `auth-identity-fixture`: corpo do varredor, regex, corte de 60 min e `dropEphemeralRoleResilient` NÃO mudam | diff = comentário + `"rls_test"` na lista + `async function` → `export async function`. Corpo do `sweepOrphanEphemeralRoles`, `ORPHAN_ROLE_MAX_AGE_MS` e `dropEphemeralRoleResilient` **ausentes do diff** | **OK** |
| `SAN2-2-plano.md`: apenso ≤ 5 linhas | `--numstat` = **`2 0`** (errata + linha em branco), **adição pura** | **OK** |
| Registro alheio: só apenso/errata datados, nada apagado | `status-geral.md` **55/0**, `B-O6R-02-ciclo5-plano.md` **34/0**, `SAN2-2-plano.md` **2/0** — **zero deleções nos três** | **OK** |
| `authority-portal`: casos novos da classe | **12 → 14** (+2) — exatamente o delta que o KPI publica (item 3) | **OK** |

### 1.6 Os dois pontos onde eu apertei, e o que sobrou

1. **`isCanonicalBase64` é função NOVA de módulo, fora de `parseStored`.** O §5.1 diz
   "`authority-password.ts` — SOMENTE `parseStored` + comentário l.82-85". Leitura literal: há um
   terceiro elemento. Medi o alcance: são **3 linhas**, `hashPassword` e o **corpo** de
   `verifyPassword` estão **fora do diff** (só o bloco de comentário acima dele muda), e o único
   chamador do helper é `parseStored`. É extração de detalhe de implementação do próprio
   `parseStored`, não função nova de domínio. **Gravidade: nenhuma; não bloqueia.**
2. **Apenso do `B-O6R-02-ciclo5-plano.md` sem linha em branco de fechamento.** Blob do head,
   l.199-200: a última linha do apenso é `> ha consolidado em ...` e a linha **200 preexistente**
   (`**Re-execuções obrigatórias** ...`) vem **colada, sem linha em branco**. Por continuação lazy do
   CommonMark, essa linha preexistente passa a **renderizar DENTRO do blockquote do apenso SAN2-4b**.
   Os **bytes** da linha alheia não mudaram (o `--numstat 34/0` é honesto: adição pura), mas a
   **atribuição visual** dela muda. É a fronteira do §5.2 "não alterar registro alheio" tocada pela
   forma, não pelo conteúdo. **Gravidade: baixa; escopo `dentro-do-bloco`; não bloqueia** — pendência
   de higiene de registro, correção de 1 caractere.

**VEREDITO DO ITEM 1: CONFORME.** 20/20 arquivos dentro do §5.1; o proibido do §5.2 intocado por
medição de pathspec; as 7 restrições finas honradas; o 20º arquivo é o commit de base declarado no
plano, não obra do executor. Dois achados sem gravidade bloqueante (1.6.1 e 1.6.2).

---

# APENSO — C3, **TERCEIRA suplente** (identidade NOVA), 2026-08-31

> As duas antecessoras desta cadeira caíram na transição **medir → gravar**: a primeira
> (`03-antecessora-caida-evidencia.md`, 281 l) gravou os itens 1 e 2 e caiu antes do KPI; a segunda
> (o texto acima, 127 l) gravou o item 1 e caiu. **Nada do que elas concluíram entrou aqui como
> insumo (R2).** Pela **P3**, os comandos que elas registraram foram roteiro de re-execução barata:
> **re-executei todos**, e onde havia lacuna (o item 3 inteiro) medi do zero. **Registro delas
> preservado, intacto — não editei nem apaguei uma linha; este apenso é só-adição.**
>
> **MÉTODO.** Toda medição sai dos **blobs do head** (`git show 2d2d16d:<path>`,
> `git diff main...2d2d16d`), nunca da árvore — a C2 teve mandato de mutar código NESTE worktree
> (`00-quedas.md`). Onde precisei executar script sobre arquivo, montei **cópia isolada no
> scratchpad** a partir dos blobs; **não escrevi um byte em arquivo rastreado, não commitei, não
> restaurei e não reverti nada**. `erp-postgres`/`erp-redis`: **nenhum comando meu, nem de leitura**
> — a única execução de teste que fiz saiu com `DATABASE_URL` apontada para porta **morta**
> (`127.0.0.1:59999`), por construção incapaz de alcançar a base viva.
>
> **Estado da árvore, medido por mim ANTES de tudo:** `git diff --exit-code -- src/ tests/` **ec=0**
> e `git diff --exit-code -- agent-orchestration/` **ec=0** — o conteúdo da árvore é **idêntico ao
> head**. O ` M` que o `git status` mostra é **stat-cache**, não conteúdo. Reportá-lo como defeito
> seria fabricar achado (briefing §4). **Zero mutação viva.**

## Re-execução do ITEM 1 (escopo) — **CONFERE, zero divergência**

| medição | antecessoras | **minha execução** |
|---|---|---|
| `git merge-base main 2d2d16d` | `45c3b97` | **`45c3b97`** |
| `git diff --name-only main...2d2d16d \| wc -l` | 20 | **20** |
| `git diff --check main...2d2d16d` | ec=0 | **ec=0** |
| commits `main..2d2d16d` | 4 (3 do dev + `fca131a`) | **4, idem** |
| `Kpis/app.js` numstat / hunks | `1 1` / 1 hunk | **`1 1` / 1 hunk**; as duas linhas `+`/`-` são a `var FROZEN = …` |
| `test()` `authority-portal` | 12 → 14 | **12 → 14** |
| `test()` `db-catalog-write-guard` | 6 → 6 | **6 → 6** |
| `test()` `rls-tenant-isolation` | 2 → 2 | **2 → 2** |
| §5.2 proibido (pathspec) | vazio | **vazio** — ampliei com `docs/**`, `RBAC_MATRIX.md`, `APPROVAL_LIMITS.md` |
| 4 gatilhos do sweep proibidos | vazio | **vazio** |

**`.github/` intocado · contratos (`API_CONTRACTS.md`) intocados · `scripts/**` intocado** —
`kpi-freeze.mjs`, `run-backend-tests.mjs` e `gerar-indice-pendencias.py` foram **executados**, e
`git diff --exit-code main...2d2d16d -- agent-orchestration/controle/gerar-indice-pendencias.py`
sai **ec=0**: o classificador que julga o registro **não foi tocado pelo bloco que ele julga**.

### R2 do inspetor (o 20º arquivo) — **julgada: CABE, e não é obra do executor**

`votos/SAN2-4a/00c-porteiro-pos-merge-365.md` (+133/-0). Medi a **autoria**:
`git log --diff-filter=A main..2d2d16d -- <arquivo>` → **`fca131a`**, e
`git show --name-only fca131a` mostra esse **único** arquivo, data **2026-08-31**, commit
**anterior** aos três do dev. É a **autorização de start** exigida pelo §C2.8 /
`D-PORTEIRO-POS-MERGE`, declarada por escrito no cabeçalho do plano (l.5-8) **antes** de existir
código. Adição pura: nenhuma linha de registro alheio alterada — que é o que o §5.2 proíbe. **Não é
escopo estourado.** Fica a ressalva de **redação** (o parêntese "desta junta" do §5.1 é mais estreito
que o glob que qualifica) — higiene de plano futuro, sem gravidade.

### Nuance registrada (não é achado)

`isCanonicalBase64` é função **nova de módulo**, e o §5.1 diz "SOMENTE `parseStored`". Medi o
alcance: **2 hunks** no arquivo inteiro; `grep -rn` em `src/` e `tests/` dá **2 ocorrências, ambas
dentro de `parseStored`**; a função **não é exportada**; os corpos de `hashPassword`/`verifyPassword`
estão **fora do diff** (só o bloco de comentário muda, e o §5.2 autoriza reescrever comentário de
código). Detalhe de implementação do próprio `parseStored`, não superfície nova. **Não bloqueia.**

## Re-execução do ITEM 2 (registro) — **CONFERE, com 1 achado meu novo**

### 2.1 As 3 fecharam pela LINHA DE STATUS — provado, não lido

As **7 remoções** de `pendencias.md` são **3 cabeçalhos + 3 linhas de status ABERTA + 1 nota**
(extraí todas com `grep '^-' | grep -v '^---'`; o filtro `^-[^-]` das antecessoras esconderia as
linhas de status, que em diff começam por `--`). As 3 linhas de status voltam **FECHADA**, com dono e
data. A nota removida (`<sub>Triagem SAN2-1…`) volta **verbatim** com `[Superada em 2026-08-31 …]`.

**Prova mecânica, rodada por mim em cópia isolada do scratchpad** (blobs de `main` e do head, com o
script do head):

```
MAIN  indice: 234 cabecalhos / 226 IDs | {FECHADA: 47, ABERTA: 187} | baldes {-:47, C:77, B:77, A:33}
HEAD  indice: 237 cabecalhos / 228 IDs | {FECHADA: 50, ABERTA: 187} | baldes {-:50, C:77, B:79, A:31}
```

47+187 = 234 e 50+187 = 237: **zero `CONTRADITORIA`, zero `SEM-STATUS`** nos dois. Fechar por
cabeçalho com a linha ainda ABERTA produz `CONTRADITORIA` **por construção** no classificador — não
há nenhuma. A aritmética do C5 (+3 cabeçalhos, +2 IDs porque a emenda reusa ID, A 33→31, B 77→79)
**reproduz na minha execução**.

### 2.2 O índice NÃO está defasado — e a armadilha não caiu

```
git hash-object <indice regenerado do head>  -> 1fa0e0fa410a7ebe2883403d154770d3575feeae
git rev-parse 2d2d16d:.../pendencias-indice.md -> 1fa0e0fa410a7ebe2883403d154770d3575feeae  (IDENTICO)
git hash-object <indice regenerado de main>  -> 65927aa05db48687ab92f2abf906686a3544f484
git rev-parse main:.../pendencias-indice.md  -> 65927aa05db48687ab92f2abf906686a3544f484  (IDENTICO)
```

O índice commitado **é** a saída do script, nos dois lados. `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`
confirmada: reportar defasagem por `md5sum`/`git status` daqui seria **fabricar** achado.
**Regenerei em cópia do scratchpad — não escrevi no arquivo rastreado.**

### 2.3 "a classificar" — **sustenta-se**, e é convenção do arquivo, não invenção

Linhas de status com `severidade: a classificar`: **main 34 → head 37** (+3, exatamente as 3 novas).
O bloco **não inventou** o carimbo: ele já governava 34 entradas. As 3 novas: uma **emenda** de
`P-O6R-ARNES-ISOLAMENTO` (que já tinha **4** emendas com cabeçalho próprio — l.3402/3424/3907, e a
nova em 3926) e duas pendências que não tocam dinheiro, permissão nem perda de dado. Carimbar MÉDIA
sem medir impacto **subiria o balde material por asserção** — o oposto do que a rodada exige. E o
placar **ABERTAS fica em 187**, publicado parado em vez de disfarçado.

**Verifiquei as duas afirmações de fato das entradas novas:**

- `P-REG-BATERIA-NAO-TYPECHECA-TESTS`: `package.json` l.33 `"lint": "npm run check"`, l.19
  `"check": "tsc -p tsconfig.json --noEmit"`, `tsconfig.json` l.15 `"include": ["src/**/*.ts"]`.
  **Literalmente verdadeira.**
- `P-ARNES-RATCHET-…`: reexecutei as **6 regexes literais** do guard sobre os 4 blobs →
  `rls-tenant-isolation` **8 → 8** [CREATE ROLE 2 · DROP ROLE 2 · GRANT 4] e `auth-identity-fixture`
  **30 → 30** [CR 9 · DR 8 · GRANT 10 · REVOKE 1 · OWNER TO 2]. **Bate com a tabela publicada, célula
  a célula.** O número tem origem no método — é o contra-exemplo do que eu vim caçar.

### ACHADO A-2 — atribuição de origem errada (confirmo a antecessora por execução própria)

A entrada nova declara, sob o rótulo "**Escopo: `pre-existente`, com evidencia de origem**", que
*"o ratchet por contagem nasceu no bloco `B-O6R-ARNES` (2026-08-28)"*. **Medi:**

```
git log --diff-filter=A -- tests/db-catalog-write-guard.test.ts -> 0a39824  2026-08-19  (B-O6R-01, #357)
git log -S 'FROZEN_ALLOWLIST' -- <mesmo arquivo>                -> so 0a39824
git show 0a39824:<arquivo> -> CATALOG_WRITE_PATTERNS (l.48) - FROZEN_ALLOWLIST com `count` (l.60)
                              countCatalogWrites sobre o TEXTO CRU (l.144) - count !== frozen.count (l.185)
                              entrada "rls-tenant-isolation.test.ts" com count: 8 e a MESMA reason (l.71-74)
git log -- <arquivo> -> ecfdb24 (31/08) - f081b5d (28/08, B-O6R-ARNES) - 0a39824 (19/08, B-O6R-01)
```

O **desenho inteiro** — inclusive a cegueira a comentário e a própria entrada `count: 8` — nasceu em
**`0a39824`, 2026-08-19, `B-O6R-01` (#357)**. O `B-O6R-ARNES` apenas **atualizou contagens e razões**
de uma allowlist herdada. A classificação `pre-existente` **fica de pé e mais forte** (12 dias, não
3); nenhum número, código ou veredito muda. O defeito é a **evidência não executada** sob um rótulo
que promete evidência — e custa: manda o futuro dono procurar o desenho no #359, onde ele **não
está**.

- `gravidade`: **observa** · `escopo`: **`dentro-do-bloco`** — evidência de origem: a frase não existe
  em `main` (`grep -c` = **0**) e foi escrita no commit `2d2d16d`. Não proponho correção (§C7.4-bis).

### ACHADO A-1 — o apenso muda a ATRIBUIÇÃO RENDERIZADA de uma linha de plano alheio (medido, não deduzido)

O apenso ao `B-O6R-02-ciclo5-plano.md` termina na l.199 (`> ha consolidado em omega/medicoes/.`) e a
l.200 é **preexistente** (`**Re-execuções obrigatórias** …`, l.166 em `main`) — **sem linha em branco
entre as duas**. Os bytes da linha alheia não mudaram (numstat **34/0**, adição pura, honesto).

**Não deduzi da spec: renderizei.** Passei os dois contextos pelo renderizador **GFM do próprio
GitHub** (`gh api -X POST markdown`, `mode: gfm`):

```
MAIN  -> 0 blockquotes; a linha aparece FORA de qualquer blockquote:  true
HEAD  -> 1 blockquote;  a linha aparece DENTRO dele: true  |  fora de blockquote: false
```

**Vermelho-controle nos dois sentidos.** Uma linha normativa do plano do **ciclo 5 do B-O6R-02** (a
lista de re-execuções obrigatórias dele) passa a renderizar **dentro do blockquote do apenso do
SAN2-4b** — deixa de se apresentar como texto do plano e passa a parecer citação de outro bloco. É a
fronteira do §5.2 ("nenhuma linha existente de planos alheios é apagada ou **alterada**") tocada pela
**forma**, não pelo conteúdo.

**Varri a classe inteira, não só a instância** (continuações-lazy por arquivo de registro tocado,
`main` × head): `pendencias.md` **2 → 2** (as duas pré-existentes), `status-geral.md` **0 → 0**,
`SAN2-2-plano.md` **0 → 0**, `SAN2-4b-plano.md` **0 → 0**, e **`B-O6R-02-ciclo5-plano.md` 0 → 1**.
**Uma única instância nova**, e o bloco acertou a linha em branco de fechamento nos outros dois
apensos (`status-geral.md` l.68-70, `SAN2-2-plano.md` l.233-235) — é inconsistência pontual, não
incompreensão do padrão.

- `gravidade`: **observa** (BAIXA) — correção de **1 caractere**; nenhum número, código ou veredito
  muda · `escopo`: **`dentro-do-bloco`** — evidência de origem: `main` tem **0** continuações nesse
  arquivo; o apenso entrou no commit `2d2d16d`, único desta branch a tocar o arquivo. Não proponho
  correção (§C7.4-bis).

**Veredito parcial I2 — APROVADO**, com 2 achados `observa`.

## ITEM 3 (KPI) — medido do zero por mim; as duas antecessoras caíram antes de chegar aqui

### 3.1 Backfill do #365 — o `approved_head` **é** o head da ata, provado por fonte externa

| campo | publicado | minha verificação |
|---|---|---|
| `pr` | **365** | `gh pr view 365` → `"number":365`, `state: MERGED` |
| `merge_commit` | **`45c3b97`** | `gh` → `mergeCommit.oid 45c3b97dcb…`; **é o tip da `main`** (`git log -1 main`) |
| `approved_head` | **`4199b92`** | `J-SAN2-4a.md` **l.4**: *"**Head julgado:** `4199b92`"*. O `headRefOid` do GitHub é **`aa22b7f`**, que é o commit que **persistiu a própria ata** (`docs(junta): SAN2-4a APROVADO 3x0…`) e portanto é **posterior** ao julgamento. **O KPI carrega o head JULGADO, não o do GitHub.** |

**E o backfill diz a sua própria má notícia.** A `description` da entrada SAN2-4a **começa com o texto
de `main` byte a byte** (`y.startsWith(x)` = **true**, +1 270 chars de sufixo) — apenso datado, §A2
respeitado, zero reescrita. No sufixo o bloco publica que, em `4199b92`, **a entrada de KPI do próprio
SAN2-4a não existia**. **Reexecutei as quatro afirmações:**

```
git diff --name-only 4199b92..aa22b7f | wc -l                                  -> 15
git diff --name-only 4199b92..aa22b7f -- src/ tests/ scripts/ prisma/ .github/ -> VAZIO
git diff --name-only 4199b92..aa22b7f -- Kpis/                                 -> app.js, kpis-history.json, kpis-latest.json
history em 4199b92: 147 entradas - ultima = SAN2-3 - existe SAN2-4a? FALSE
```

**As quatro batem.** Este era o lugar óbvio para esconder um número; o bloco o transformou em nota de
honestidade rastreável ao achado C3-A1 da junta anterior.

### 3.2 `blocks_completed` **155**, com a condição do 156 escrita

`main` 154 → head **155**. A nota traz a condição, com estas letras: *"o numero sobe para **156 SO
QUANDO O SAN2-4b MERGEAR** — na autoria ele fica em 155"*, e cita a promessa que a entrada anterior
tinha feito (*"sobe para 155 so quando o SAN2-4a mergear"*), que **cumpriu-se** (`45c3b97`). É o mesmo
padrão do bloco anterior; não é número novo sem regra.

### 3.3 `backend_tests` **2609/2611**, delta **+2** — causa conferida **pelos dois lados**

- Aritmética: anterior **2607/2609** → **2609/2611**; `+2` no pass e `+2` no total, **2 pulos** em
  ambos. Fecha.
- Causa nomeada: `tests/authority-portal.test.ts` **12 → 14**. Conferi os **nomes**: os 2 novos são
  `hashing: stored com base64 NÃO-CANÔNICO é rejeitado (SAN2-4b — classe do padding)` (l.214) e
  `hashing: hash canônico de comprimento diferente do keylen é rejeitado (SAN2-4b — pino do keylen)`
  (l.242). Os outros 12 são os de `main`, **nome por nome**.
- **Executei o arquivo** (com `DATABASE_URL` em porta morta; base viva intocada):
  `# tests 14 · # pass 14 · # fail 0 · # skipped 0`. O denominador novo é **execução, não promessa**.
- Contraprova do "nenhum outro arquivo mudou de denominador": `db-catalog-write-guard` **6→6** e
  `rls-tenant-isolation` **2→2**, com diff de **nomes vazio** nos dois. `+2` no repositório inteiro =
  `+2` no KPI.
- Número lateral publicado, e verificável: a nota diz **"248 arquivo(s)"**.
  `git ls-tree -r --name-only 2d2d16d tests/ | grep -c '\.test\.ts$'` → **248** (e **248** em `main`:
  o bloco não criou nem removeu arquivo de teste). **Confere.**
- O `N=1` da suíte completa está **declarado na própria nota**, não escondido — e o `N=3` do
  denominador isolado também.

### 3.4 `mvp_*` intocados; três `null` na autoria; history append-only

`mvp_demo` **99** e `mvp_vendavel` **88**: `value`, `unit`, `display`, `label` e `caveat`
**IDÊNTICOS** campo a campo. Só o `note` mudou, por **acréscimo**: `[SAN2-4b: INTOCADO — o PR nao move
escopo … (§C3.4)]` — é o §C3.4 cumprido pelo lado de dentro, justificando **não** mover.
`release.pr`/`merge_commit`/`approved_head` = **`null`/`null`/`null`** com `status:
"published_per_pr"` (§C3.5 na autoria); os mesmos três `null` na entrada nova do history.
**History append-only:** das 148 entradas de `main`, **147 são idênticas byte a byte**; a única que
muda é a do **SAN2-4a** (backfill + apenso na `description`), e a 149ª é nova.

### 3.5 Os guards, reexecutados por MIM — e o do freeze **morde nos dois sentidos**

```
node scripts/kpi-freeze.mjs --check  -> "em dia (snapshot 2026-08-31)"   ec=0
node --check Kpis/app.js                                                 ec=0
node --test --import tsx tests/kpi-dashboard-charts.test.ts -> tests 16 - pass 16 - fail 0
npm run check (tsc -p tsconfig.json --noEmit)                            ec=0
```

**Mordida nos dois sentidos, em cópia isolada do scratchpad** (blobs do head; **não toquei a árvore**):

```
(1) intacto                                 -> "em dia"   ec=0
(2) mutei blocks_completed.value 155 -> 999 -> "DIVERGE"   ec=1
(3) restaurei o blob                        -> "em dia"    ec=0
```

**ec=0 → ec=1 → ec=0 confirmado por execução minha.** E o `--check` verde no head é, ele próprio, a
prova de que a linha `FROZEN` do `app.js` foi **gerada pelo script** a partir do JSON, como o §5.1
exige ("SOMENTE a linha FROZEN, via script") — não digitada.

### ACHADO A-3 (novo, meu) — a seção `recent` do painel está parada 2 entregas atrás

`Kpis/kpis-latest.json` → `recent`: **idêntico em `main` e no head** — `as_of` **2026-08-28**, PR mais
novo da lista **359**. Não há **#364 (SAN2-3)** nem **#365 (SAN2-4a)**, embora as duas já tenham
entrada no history; com este PR serão **três**. E a seção **é renderizada**: `Kpis/app.js` l.1195
`var rec = latest.recent;`, l.1233 `setHTML("recent-list", …)`, l.1234 `reveal("recent-section")`. Sob
`D-KPI-INDEX-PAINEL` ("o painel é a entrega"), o cartão de últimas entregas mostra ao dono um estado
de 28/08.

- `gravidade`: **observa** · `escopo`: **`pre-existente`** — evidência de data/origem: o objeto
  `recent` do blob de **`main`** já traz `as_of 2026-08-28` / PR-topo 359 **enquanto o history de
  `main` já continha SAN2-3 e SAN2-4a**; a classe antecede esta branch (nasce, no mínimo, no bloco
  que mergeou o #364). O §5.1 deste bloco escopou o trabalho de KPI à dívida dupla + a entrada do
  bloco; **não reprova** (§C7.1-ter(a)) — fica **NOMEADA**, com dono a designar. Não proponho
  correção.

**Veredito parcial I3 — APROVADO**, com 1 achado `observa` `pre-existente`.

## O que eu vim caçar, e o que encontrei

- **"Conclusão além da medição":** procurei em cada número que o bloco publica. As **12 observações**
  do §3.0 estão lá, uma a uma, com **11 FECHA + 1 NÃO FECHA (item 10, as 68 da base viva)** e a razão
  escrita — a conta do briefing ("11 das 12") **é literal**. O `2609/2611` declara N e forma; o `+2`
  fecha pelos dois lados; o `248` confere; o `8→8` do ratchet confere célula a célula; o
  `15 arquivos / 147 entradas` do backfill confere. **Não achei o análogo dos "+78%" e das "11
  observações" que a junta do 4a pegou.**
- **"Pendência fechada sem o critério que ela própria declarava":** as 3 fecharam pelo **campo
  canônico**, com o classificador dando **zero `CONTRADITORIA`**.
- **O 68:** declarado **CARREGADO** em quatro pontos do apenso (*"nao foram recontadas, nem lidas"*),
  a pendência dona segue **ABERTA** (`**Estado:** ABERTO`, l.3475, **fora** das 7 remoções), e o
  **risco residual** de o sweep alcançar as 68 sob violação de `DATABASE_URL` está escrito **para a
  junta dona pesar**, não escondido.
- O que achei foi **um erro de atribuição (A-2)**, **um caractere de formatação (A-1)** e **uma seção
  de painel parada, pré-existente (A-3)**. Nenhum toca número, código, permissão ou dinheiro.

## Linha de limpeza

Criei **apenas** este apenso e o meu voto (registro da junta, ficam) + temporários no **scratchpad da
sessão** (cópias de blobs, os dois renders do GFM, a árvore isolada do classificador e a do
`kpi-freeze`), que morrem com ela. **Zero containers, zero portas, zero worktrees, zero commits, zero
comandos à base viva, zero escrita em arquivo rastreado.** A árvore que recebi é a árvore que devolvo
(`git diff --exit-code` **ec=0**).
