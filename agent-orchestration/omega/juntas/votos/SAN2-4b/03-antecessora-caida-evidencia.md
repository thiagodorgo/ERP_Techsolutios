# SAN2-4b — C3 `zelador-do-escopo-do-registro-e-do-kpi` — evidência incremental

> Identidade NOVA. Head julgado `2d2d16d`, branch `fix/san2-4b-corrigir-arnes`, PR #366.
> Worktree `.claude/worktrees/san2-r`. Junta de 3, UNANIMIDADE.
> Rito P1: voto criado PRIMEIRO com os 3 itens EM APURAÇÃO; cada item apenso aqui ao ser medido.
> Afirmação de ata/parecer anterior = "a re-verificar", nunca fato herdado (P3).

## Item 1 — ESCOPO (20 arquivos × §5.1) — **VERDE**, R2 resolvida a favor

### 1.1 O diff e a sua partição em DOIS commits de naturezas diferentes

```
$ git merge-base main HEAD                 -> 45c3b97dcb415493c8cb8461649f5b9a3c6391d6
$ git diff --name-only main...HEAD | wc -l -> 20
$ git diff --check main...HEAD             -> ec=0 (limpo)
$ git log --oneline main..HEAD
2d2d16d docs(registro): ... (SAN2-4b C5+C6)
ecfdb24 fix(arnes): ... (SAN2-4b C3+C4)
f6631d0 fix(authority): ... (SAN2-4b C1+C2)
fca131a docs(gate): porteiro pos-merge do #365 — LIBERADO COM RESSALVA para o SAN2-4b
```

**A medição que decide a R2:**

```
$ git diff --numstat 45c3b97..fca131a
133  0  agent-orchestration/omega/juntas/votos/SAN2-4a/00c-porteiro-pos-merge-365.md   <- UNICO delta
$ git diff --name-only fca131a..HEAD | wc -l -> 19
```

O trabalho DO BLOCO são **19** arquivos, não 20. O 20º entrou no commit `fca131a`, que é a **base
de planejamento** — o plano, l.5-8, declara por escrito: *"head no momento do plano `fca131a`
(= `main` + o parecer do porteiro do #365, único delta — conferido por `git log/diff
45c3b97..HEAD`). Autorização de start: porteiro pós-merge do #365 = LIBERADO COM RESSALVA
(.../votos/SAN2-4a/00c-porteiro-pos-merge-365.md)"*. Medi eu mesmo o "único delta" e ele é
literalmente verdadeiro.

### 1.2 Os 19 do bloco contra a lista fechada do §5.1

| §5.1 | arquivo | numstat | limite do §5.1 | conferido |
|---|---|---|---|---|
| código | `src/modules/authority/authority-password.ts` | 29/5 | SOMENTE `parseStored` + comentário | **sim** (1.4) |
| código | `tests/authority-portal.test.ts` | 80/2 | tamper l.161 + casos da classe | **sim** — `test()` 12 -> 14, os 2 são os guards novos |
| código | `tests/helpers/auth-identity-fixture.ts` | 32/7 | `SWEPT_ROLE_FAMILIES` + comentário + export | **sim** (1.4) |
| código | `tests/rls-tenant-isolation.test.ts` | 25/5 | invocação do sweep + teardown; corpo do RLS não muda | **sim** — `test()` 2 -> 2, nenhum nome muda |
| código | `tests/db-catalog-write-guard.test.ts` | 31/2 | família nos 2 drills + allowlist; **nenhum `test()` novo/removido** | **sim** — `test()` 6 -> 6, nenhum nome muda |
| registro | `controle/pendencias.md` · `pendencias-indice.md` · `docs/status-geral.md` | — | nomeados | sim (Item 2) |
| registro | `planos/B-O6R-02-ciclo5-plano.md` (apenso D29) · `planos/SAN2-2-plano.md` (apenso <=5 l) · `planos/SAN2-4b-plano.md` | 34/0 · **2/0** · 553/0 | nomeados; SAN2-2 <=5 linhas | sim — SAN2-2 = **+2/-0**, errata datada |
| KPI | `Kpis/kpis-history.json` · `kpis-latest.json` | 15/3 · 23/20 | nomeados | sim (Item 3) |
| KPI | `Kpis/app.js` | **1/1, 1 hunk** | **SOMENTE a linha FROZEN** | **sim** — a única linha `[+-]` é `var FROZEN = {...}` |
| junta | 5 diários `votos/SAN2-4b/dev-c*.md` | 356+389+308+200+473 / 0 | diário do dev | sim |

`test()` contados por execução (`grep -cE` da assinatura no blob de `main` e no de `HEAD`) + `diff`
dos NOMES: em `db-catalog-write-guard` e `rls-tenant-isolation` o diff de nomes é **vazio**; em
`authority-portal` acrescenta exatamente 2 (`base64 NÃO-CANÔNICO` e `pino do keylen`).

### 1.3 O PROIBIDO (§5.2) — medido EOL-neutro, não por `md5sum`

```
$ git -c core.autocrlf=false diff --quiet main...HEAD -- .github/ scripts/ prisma/ migrations/ \
    infra/ frontend/ mobile/ portals/ package.json package-lock.json .claude/ .agents/ \
    CLAUDE.md AGENTS.md API_CONTRACTS.md docs/ .env
ec=0   (name-only nos mesmos caminhos: 0 linhas)

$ git diff --name-only main...HEAD -- 'tests/auth-identity-backfill-db*' \
    'tests/auth-identity-link-events-db*' 'tests/auth-identity-role-real-db*' \
    'tests/auth-login-candidates-fn-db*'
(vazio — os outros 4 gatilhos do sweep, proibidos pelo §5.2, intocados)

$ git diff --name-only main...HEAD -- src/ tests/
-> exatamente os 5 do §5.1, nenhum sexto
```

### 1.4 Os dois limites cirúrgicos que exigiam leitura, não `name-only`

- **`auth-identity-fixture.ts`** — fora de comentário, o diff inteiro é **duas linhas**:
  `+  "rls_test",` no array e `async function` -> `export async function`. Conferi por `diff` de
  conteúdo que `ORPHAN_ROLE_MAX_AGE_MS` (corte de 60 min), o regex de nome e
  `dropEphemeralRoleResilient` são **IDÊNTICOS** a `main` — exatamente o que o §5.1 exige ("o corpo,
  o regex, o corte de 60 min e `dropEphemeralRoleResilient` NÃO mudam").
- **`authority-password.ts`** — inventário de símbolos de `main` × `HEAD`: a lista de exports é
  **idêntica**; o único símbolo novo é `isCanonicalBase64`, **não exportado**, com **2 chamadores,
  ambos dentro de `parseStored`** (`grep -rn` em `src/` e `tests/`). `verifyPassword`,
  `hashPassword`, `derive`, `scryptAsync` têm o **corpo** intacto (só o bloco de comentário de
  `verifyPassword` foi reescrito, e o §5.2 permite: *"comentário de CÓDIGO nos arquivos permitidos
  pode ser reescrito — código não é registro"*). **Nuance registrada**, não achado: o §5.1 escreveu
  "SOMENTE `parseStored`"; um helper privado sem superfície pública nova é detalhe de implementação
  de `parseStored`, e nenhum outro comportamento do arquivo mudou.

### 1.5 Caça ao "número sem origem no método" DENTRO do escopo — o ratchet

A entrada nova da `FROZEN_ALLOWLIST` afirma: *"a contagem CONTINUA 8 por coincidência de composição
(o DROP ROLE que saiu do SQL reapareceu na prosa que explica a migração), medida 8 e não herdada —
CREATE ROLE 2 · DROP ROLE 2 · GRANT 4"*. **Reexecutei a contagem com as 6 regexes literais do guard
(l.62-69) nos DOIS blobs:**

```
MAIN  tests/rls-tenant-isolation.test.ts total=8  [CREATE ROLE 2 · DROP ROLE 2 · GRANT 4]
HEAD  tests/rls-tenant-isolation.test.ts total=8  [CREATE ROLE 2 · DROP ROLE 2 · GRANT 4]
```

E a explicação da coincidência bate linha a linha: em `main` os 2 `DROP ROLE` são o comentário
l.3146 **+ o SQL l.3150**; em `HEAD` são o comentário l.3157 **+ o comentário novo l.3160** — o SQL
sumiu (virou `dropEphemeralRoleResilient`) e a prosa o repôs. **O número tem origem no método, e a
prosa que o explica é literalmente verificável.** Não é achado: é o contra-exemplo do que eu vim
caçar.

### Veredito parcial I1 — **APROVADO**

Os 19 arquivos do bloco cabem, um a um, na lista fechada do §5.1, com os limites cirúrgicos
respeitados por medição (não por promessa). O proibido está intocado EOL-neutro.

**R2 (o 20º arquivo) — CABE.** Fundamento, em quatro pontos medidos: (a) ele **antecede o plano** —
está no commit `fca131a`, que é a própria base de planejamento, e não no trabalho do bloco
(`fca131a..HEAD` = 19); (b) é **só-adição, +133/-0** — nenhuma linha de registro alheio apagada ou
alterada, que é o que o §5.2 proíbe de fato ("Reescrever registro"); (c) é o artefato **sem o qual o
bloco não podia começar** — `D-PORTEIRO-POS-MERGE`/§C2.8: *"Sem parecer dele, nenhum bloco novo
começa"* — e é a fonte literal da dívida dupla que o §3-C6 paga (li o veredito: *"pagar a dívida
dupla C3.5 do #365: pr 365 + merge_commit 45c3b97 + approved_head 4199b92 (head julgado da ata
J-SAN2-4a l.4, não o headRefOid aa22b7f) e blocks_completed 154 para 155"*); (d) o plano **o declara
por escrito** na l.5-8 antes de qualquer código. O parêntese "desta junta" do §5.1 delimita **o que
os papéis desta junta escrevem durante a junta**, não a persistência de um gate que já existia — ler
o parêntese ao contrário obrigaria o bloco a começar com a sua própria autorização fora do disco.
Anoto para o próximo plano que a redação do §5.1 comportava a dúvida, e por isso o inspetor a
levantou; a dúvida se resolve pela medição, não pela redação.

## Item 2 — REGISTRO (C5) — **VERDE com 1 achado** (`observa`, `dentro-do-bloco`)

### 2.1 As 3 pendências fecharam pela LINHA DE STATUS — provado pelo classificador, não pela leitura

O `gerar-indice-pendencias.py` documenta, no próprio corpo, a classe que reprovou o `SAN2-1`:
*"SO A LINHA DE STATUS DECIDE. O cabecalho NUNCA fecha nada"*, e o cabeçalho entra **só para denunciar
contradição** (`CONTRADITORIA`), enquanto a ausência de linha vira `SEM-STATUS`.

As **7 linhas removidas** de `pendencias.md` (numstat `311/7`), na íntegra:

```
-## P-ARNES-AUTHORITY-PORTAL-INTERMITENTE (2026-08-28) — MÉDIA · **Dono: a atribuir por execução** ...
-- **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir
-  <sub>Triagem SAN2-1 (2026-08-29): ... Marcada **ABERTA por padrão conservador** ...</sub>
-## P-REG-BATERIA-BARATA-DUAS-LISTAS (2026-08-29) — MÉDIA · **Dono:** `B-O6R-02` ciclo 5 ...
-- **status:** ABERTA · **severidade:** MEDIA · **dono:** declarado acima
-## P-SAN2-2-PORTA-55432-RESERVADA (2026-08-30) — armadilha de terreno, não defeito de produto
-- **status:** ABERTA · **severidade:** BAIXA · **dono:** a atribuir
```

**As três linhas de status foram trocadas, uma a uma, por `FECHADA`** com dono e data:

```
+- **status:** FECHADA · **severidade:** MEDIA · **dono:** bloco `SAN2-4b` (correcoes C1+C2, commit `f6631d0`) — fechada em 2026-08-31 ...
+- **status:** FECHADA · **severidade:** MEDIA · **dono:** bloco `SAN2-4b` (correcao C5) — fechada em 2026-08-31 ...
+- **status:** FECHADA · **severidade:** BAIXA · **dono:** bloco `SAN2-4b` (correcao C5) — fechada em 2026-08-31 ...
```

**A prova MECÂNICA de que nenhuma fechou por cabeçalho:** rodei o classificador e o placar é
`{FECHADA: 50, ABERTA: 187}` sobre **237 cabeçalhos** — 50+187 = 237, ou seja **zero `CONTRADITORIA` e
zero `SEM-STATUS`**. Fechamento por cabeçalho com a linha ainda ABERTA produziria `CONTRADITORIA` por
construção; não há nenhuma.

### 2.2 §A2/§5.2 — nenhuma linha existente apagada

Os 3 cabeçalhos e as 3 linhas de status são **o ato de fechar**, não reescrita de história (os
cabeçalhos ganharam o sufixo `— FECHADA em 2026-08-31` e o texto anterior segue integral). A 7ª remoção
é a única que não é status, e **não foi apagada**: a nota `<sub>Triagem SAN2-1 (2026-08-29)…` volta
**verbatim** com um `[Superada em 2026-08-31 …]` datado apenso — a mesma forma já usada no fechamento do
`SAN2-2` (`[Superada em 2026-08-30 …]`), precedente vivo no arquivo. Os demais arquivos de registro são
**só-adição**: `status-geral.md` **+55/-0**, `B-O6R-02-ciclo5-plano.md` **+34/-0**, `SAN2-2-plano.md`
**+2/-0**.

### 2.3 As 3 novas: severidade "a classificar" — **sustenta-se**

Cabeçalhos `## P-` acrescentados, por execução (`git diff | grep "^+## "`): **3 abertos** + os 3
fechados. Os 3 abertos:

| entrada | natureza | status/severidade |
|---|---|---|
| `P-O6R-ARNES-ISOLAMENTO — EMENDAS do bloco SAN2-4b` | **emenda**, reusa ID existente | ABERTA · a classificar |
| `P-ARNES-RATCHET-POR-CONTAGEM-CEGO-A-PROSA` | pendência nova, `pre-existente` | ABERTA · a classificar |
| `P-REG-BATERIA-NAO-TYPECHECA-TESTS` | pendência nova, `pre-existente` | ABERTA · a classificar |

- **A emenda com cabeçalho próprio é a convenção do arquivo, não invenção:** `P-O6R-ARNES-ISOLAMENTO`
  já tinha **4** emendas com cabeçalho próprio (junta do ciclo 3, `B-O6R-ARNES`, junta do ciclo 4). No
  índice, **as 5 linhas têm severidade `—`**, inclusive a original de 18/08: a emenda do `SAN2-4b` não
  rebaixa nem dilui nada.
- **"a classificar" não é fuga de carimbo — é o que o classificador lê como balde B**
  (processo/registro), e nenhuma das duas toca dinheiro, permissão ou perda de dado: uma é cegueira de
  um **instrumento de teste**, a outra é cobertura da **bateria**. Medido: balde A **33 -> 31** (só as
  duas fechadas que eram MÉDIA), balde B **77 -> 79** (−1 da PORTA BAIXA fechada, +3 das novas sem
  severidade). Carimbar MÉDIA sem medir impacto teria subido o balde material por asserção.
- Nenhuma das duas propõe correção (§C7.4-bis); ambas nomeiam **achador**, **critério de fechamento
  provável por mutação** e recusam nomear dono não combinado.

### 2.4 O 68 — CARREGADO, e dito

O apenso de `P-ARNES-RLS-TEST-FORA-DO-SWEEP` diz, literalmente: *"**As 68 continuam CARREGADAS — nao
foram recontadas, nem lidas.** … O numero **68** segue sendo o de 18/08 e **nao** foi re-verificado por
este bloco."* A pendência **permanece ABERTA**: o seu campo canônico (`**Estado:** ABERTO`, seção da
l.3473) **não está entre as 7 remoções** — intocado. E o risco residual §7.3 foi escrito para a junta
dona pesar. Nada apresentado como medido.

### 2.5 Índice regenerado por script — e a armadilha do "índice defasado" NÃO caiu

```
$ python agent-orchestration/controle/gerar-indice-pendencias.py
indice: 237 cabecalhos / 228 IDs | {FECHADA: 50, ABERTA: 187} | baldes {-:50, C:77, B:79, A:31} | diferidas-materiais 2

$ sha256sum <regenerado> <blob HEAD>
f3220f4c…a33d2b  (idêntico nos dois)
$ git hash-object <regenerado>              -> 1fa0e0fa410a7ebe2883403d154770d3575feeae
$ git rev-parse HEAD:…/pendencias-indice.md -> 1fa0e0fa410a7ebe2883403d154770d3575feeae
```

**O índice commitado É a saída do script, byte a byte.** Registro a armadilha para o próximo:
`git status --porcelain` passou a marcar ` M` no arquivo depois da minha regeneração e **continuou
marcando após `git update-index --refresh`** — mas `git diff --exit-code` (EOL-neutro) **e**
`git -c core.autocrlf=false diff` dão **ec=0**, o `sha256` bate e o `hash-object` é **o próprio OID do
blob do HEAD**. É stat-cache, não conteúdo: reportar "índice defasado" daqui seria **fabricar** achado,
exatamente como o briefing §4 avisa.

**E a aritmética do C5 reproduz por execução minha**, rodando o mesmo script contra o `pendencias.md`
de `main` em cópia isolada no scratchpad:

```
ANTES   234 cabecalhos / 226 IDs | {FECHADA: 47, ABERTA: 187} | baldes {-:47, C:77, B:77, A:33}
DEPOIS  237 cabecalhos / 228 IDs | {FECHADA: 50, ABERTA: 187} | baldes {-:50, C:77, B:79, A:31}
```

Bate **linha a linha** com o diário (l.233/237): +3 cabeçalhos, +2 IDs (a emenda reusa ID), 3
fechamentos e 3 aberturas, soma de conferência **50+77+79+31 = 237**. **`ABERTAS` fica em 187 e isso é
verdade** — o bloco publicou o número parado e explicou a composição, em vez de deixá-lo ser lido como
progresso ou como estagnação.

### 2.6 ACHADO A-1 — atribuição de origem ERRADA na pendência nova do ratchet

`P-ARNES-RATCHET-POR-CONTAGEM-CEGO-A-PROSA` declara o escopo assim: *"**Escopo: pre-existente, com
evidencia de origem.** O ratchet por contagem **nasceu no bloco `B-O6R-ARNES` (2026-08-28)**"*. O mesmo
está em `dev-c5-c6-registro-kpi.md:190` (*"ratchet é do `B-O6R-ARNES`, 28/08"*).

**Medi, e não é.** O mecanismo inteiro que a entrada descreve já existe **verbatim** na PRIMEIRA versão
do arquivo:

```
$ git log --diff-filter=A --date=short --format='%h %ad %s' -- tests/db-catalog-write-guard.test.ts
0a39824 2026-08-19 fix(auth): identidade global + allowlist fail-closed … (B-O6R-01) (#357)
$ git log -S 'FROZEN_ALLOWLIST' -- tests/db-catalog-write-guard.test.ts   -> só 0a39824
$ git show 0a39824:tests/db-catalog-write-guard.test.ts
  l.48-55  CATALOG_WRITE_PATTERNS = as MESMAS 6 regexes
  l.60     FROZEN_ALLOWLIST: Map<string,{count:number; reason:string}>   (9 entradas com count:)
  l.70-75  ["rls-tenant-isolation.test.ts", { count: 8, … }]            <- a MESMA entrada, o MESMO 8
  l.144    countCatalogWrites(source) -> soma matches sobre o TEXTO CRU  <- a cegueira a comentário
  l.185    else if (count !== frozen.count) -> ratchet POR CONTAGEM
$ git log --date=short --format='%h %ad %s' -- tests/db-catalog-write-guard.test.ts
  ecfdb24 2026-08-31 (SAN2-4b) · f081b5d 2026-08-28 (B-O6R-ARNES #359) · 0a39824 2026-08-19 (B-O6R-01 #357)
```

O `B-O6R-ARNES` (`f081b5d`, #359) **atualizou contagens e razões** de uma allowlist que herdou; quem
**desenhou** o ratchet por contagem — e portanto quem é dono da cegueira — foi o **`B-O6R-01`, PR #357,
`0a39824`, 2026-08-19**, e o comentário de lá até diz *"baseline medido na implementação do ciclo 3"*.

**O que o achado NÃO derruba:** a classificação `pre-existente` **fica de pé, e mais forte** — a classe
é **12 dias** anterior à branch, não 3. Nenhum número publicado, nenhuma linha de código e nenhum
veredito muda por causa disto.

**O que o achado É:** exatamente a classe que o briefing §3 mandou caçar — *"onde o número não derivar
do método declarado, é achado"*. A entrada diz "**com evidencia de origem**" e a evidência não foi
executada: um `git log` de dois segundos no arquivo dá o bloco certo. E tem custo prático — manda o
futuro dono da pendência procurar o desenho no `#359`, onde ele **não está**.

- `gravidade`: **observa** — corrigível por errata datada no pós-voto; não reprova.
- `escopo`: **`dentro-do-bloco`**, com evidência de origem: as duas frases foram **escritas por este
  bloco** (`pendencias.md` l.4849-4850 e o diário `dev-c5-c6` l.190, ambos no commit `2d2d16d`); não
  existiam em `main`.
- Não proponho a correção (§C7.4-bis) — registro defeito, evidência executada e motivo.

### Veredito parcial I2 — **APROVADO com achado `observa`**

Os 3 fechamentos passaram pelo campo canônico, e o placar do classificador (zero `CONTRADITORIA`, zero
`SEM-STATUS`) é a prova mecânica disso; §A2 respeitado sem apagar uma linha; o 68 declarado CARREGADO e
a pendência dele intocada; o índice é a saída literal do script (OID idêntico) e toda a aritmética do C5
reproduz na minha execução. O único defeito é a atribuição de origem do A-1, que não muda nenhum
veredito nem número.
