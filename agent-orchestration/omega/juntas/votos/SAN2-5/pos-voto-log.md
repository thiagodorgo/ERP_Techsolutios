# Pós-voto SAN2-5 (PR #367, APROVADO 3×0) — diário do tratamento dos achados

> **Papel:** agente de tratamento pós-voto. **Não fui quem achou** (§C7.4-bis: quem acha não conserta).
> Os achados vêm de três cadeiras independentes (C1 · C2 · C3), cujos votos e evidências estão em
> `agent-orchestration/omega/juntas/votos/SAN2-5/0{1,2,3}-*.json|md`.
>
> **Worktree:** `.claude/worktrees/san2-r` · **branch** `chore/san2-5-preparar-ciclo5` · **head na abertura** `5256b49`.
> **Regra desta sessão:** medir eu mesmo antes de escrever; não commitar; não tocar `src/`, `tests/`,
> `scripts/`, `.github/`, contratos, nem os arquivos de voto/evidência das cadeiras.

---

## Passo 0 — leitura dos três votos (antes de qualquer edição)

Li `01-corpos-voto.json` (C1), `02-apenso-escopo-voto.json` (C2) e `03-registro-kpi-voto.json` (C3).
Inventário do que me foi despachado:

| Achado | Cadeira | Gravidade | Ação mandada |
|---|---|---|---|
| C3-A1 | C3 | MÉDIA | CORRIGIR a prova falsa ("1 arquivo") nas DUAS superfícies |
| C3-A5 | C3 | MÉDIA | CORRIGIR o índice de pendências fora de sincronia (regenerar pelo script) |
| C3-A4 | C3 | BAIXA | CORRIGIR a justificativa falsa ("§5 do ciclo 5 congela `scripts/**`") |
| C1-A2 | C1 | ajuste | CORRIGIR — apenso E1 sem cláusula de precedência |
| C2-A1 | C2 | BAIXA | CORRIGIR — guard citado "l.223-230" vai até a l.231 |
| C2-A2 | C2 | BAIXA | CORRIGIR — "formato das vizinhas l.209-216" são 213-216 |
| C3-A3 | C3 | BAIXA | REGISTRAR errata (data 28/08 × 29/08) — sem conserto |
| C1-A1 | C1 | nota | REGISTRAR nota (crítico titular sem `escopo`) — sem conserto |

---

## Passo 1 — C3-A1: medi eu mesmo o diff contra a `main`

Comando e saída (head `5256b49`, `main` = `df496d2`):

```
git merge-base main HEAD        -> df496d22659ead321e5050176c604ea0913e541d
git rev-parse main              -> df496d22659ead321e5050176c604ea0913e541d   (merge-base == main: nada escondido pelo "...")
git diff --name-only main...HEAD | wc -l   -> 17
git diff --name-only 44a30e4 5256b49 | wc -l -> 16
git show --name-only 44a30e4 (1 arquivo: .../SAN2-4b/00c-porteiro-pos-merge-366.md)
```

**17 = 1 (`44a30e4`) + 16 (`5256b49`).** O achado C3-A1 está **confirmado por medição minha**, não
herdado do voto. A frase publicada ("o diff commitado inteiro contra a `main` é 1 arquivo") era
verdadeira em `44a30e4` e ficou falsa em `5256b49` — o head julgado — e nunca foi re-medida.

Os 17, por família: 8 corpos em `.claude/agents/especialistas/` · `Kpis/app.js` ·
`Kpis/kpis-history.json` · `Kpis/kpis-latest.json` · `agent-orchestration/controle/pendencias.md` ·
1 parecer de porteiro · 2 diários do dev · 2 planos (`B-O6R-02-ciclo5-plano.md` e `SAN2-5-plano.md`).
**Zero** em `src/`, `tests/`, `prisma/`, `scripts/`, `.github/` — a conclusão que a frase servia
("o bloco não toca código") continua **verdadeira**; só o número estava velho.

### Correção aplicada (as DUAS superfícies)

Substituí a frase nas duas, **byte a byte igual** (`raw.count(OLD) == 1` em cada arquivo, replace textual
com `newline=""` para não converter CRLF, e `json.loads` de volta para provar que o JSON sobreviveu):

- `Kpis/kpis-history.json` → `description` da 150ª entrada (SAN2-5) — `numstat 1/1`, CR preservados (2305).
- `Kpis/kpis-latest.json` → `release.summary` — `numstat 1/1`, CR preservados (711).

**Formulação nova, escolhida para NÃO envelhecer** (o número anda sempre com o head em que vale):

> o diff commitado inteiro contra a main, **medido no head `5256b49`** (o head que a junta julgou), é
> **17 arquivos** — `git diff --name-only main...HEAD | wc -l` = **17**, a soma de **1** em `44a30e4` (…)
> com **16** em `5256b49` —, **todos** de registro/governança: 8 corpos em `.claude/agents/especialistas/`,
> 3 em `Kpis/` e 6 em `agent-orchestration/`; **zero** em `src/`, `tests/`, `prisma/`, `scripts/` e `.github/`.
> **ERRATA pós-voto (achado C3-A1…):** esta frase dizia `1 arquivo` — número verdadeiro em `44a30e4` e
> publicado sem re-medição após o commit final `5256b49`. Todo número de diff passa a vir **com o head em
> que vale**, para não envelhecer em silêncio no próximo commit.

Verificação pós-edição: `contra a main e **1 arquivo**` → **0** ocorrências nos dois arquivos;
`e **17 arquivos**` → 1 em cada. `blocks_completed` segue 156 e o history segue com 150 entradas —
não toquei número de KPI nenhum, só o texto da prova.

### PADRÃO OBSERVADO — terceira ocorrência da MESMA classe em TRÊS juntas seguidas

Registro isto como padrão, não como incidente isolado, porque é a instrução explícita do despacho e
porque a série é de três:

| Junta | Número publicado | O que aconteceu |
|---|---|---|
| SAN2-4a | **"+78%"** | medido cedo, publicado tarde, nunca re-medido |
| SAN2-4a (briefing) | **"11 observações"** | idem |
| SAN2-5 (este) | **"1 arquivo"** | verdadeiro em `44a30e4`, falso em `5256b49` — o head julgado |

**A classe:** *número medido cedo, publicado tarde, nunca re-medido.* Não é erro de medição — as três
medições estavam **certas quando foram feitas**. O defeito é de **ciclo de vida do número**: ele é colhido
no meio da autoria e congelado num texto que continua sendo editado depois, enquanto o objeto medido
(a árvore, o diff, a lista) segue mudando até o commit final. O rótulo "PROVA MEDIDA" agrava, porque
transfere para o leitor uma confiança que a frase já não sustenta.

**Mitigação que esta correção instala (e por que ela é estrutural, não cosmética):** o número passa a ser
publicado **ancorado ao head em que vale**. Ancorado, ele não envelhece — vira uma afirmação sobre um
commit imutável, que qualquer um re-mede com o mesmo comando e o mesmo hash. Sem âncora, todo número de
árvore tem prazo de validade que expira no commit seguinte, em silêncio. Sugiro à próxima junta cobrar a
âncora como forma obrigatória de toda "PROVA MEDIDA" sobre a árvore — é o que fecharia a classe, em vez
de fechar a terceira instância dela.

---

## Passo 2 — C3-A5: confirmei a dessincronia do índice E provei que NÃO é a armadilha conhecida

**Antes de corrigir, reproduzi.** Rodei o gerador real em **sandbox isolada** no scratchpad, alimentada
pelos **blobs do head** (`git -c core.autocrlf=false show 5256b49:…`), nunca pela árvore suja:

```
GERADOR sobre os blobs do head 5256b49 -> 241 cabecalhos / 232 IDs | ABERTA 191 | balde A 34
INDICE COMMITADO no mesmo head        -> 240            / 231      | ABERTA 190 | balde A 33
```

**CONTROLE na `main` (`df496d2`), mesma receita:** gerador → `240 / 231 / ABERTA 190 / balde A 33`, e o
arquivo gerado saiu **byte a byte idêntico** ao índice commitado da main (`37207 == 37207`, comparação de
bytes). Ou seja: **na main o índice estava em sincronia; a dessincronia nasce neste PR** — e o PR sequer
tocou o arquivo (`git diff main...HEAD -- pendencias-indice.md` vazio), enquanto acrescentou uma pendência.

### A distinção que me mandaram confirmar — e que confirmei

**Isto NÃO é `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`, nem a classe "md5sum muda com `git diff` vazio".** Prova,
com as armadilhas de medição desta sessão respeitadas:

1. **CR contado por byte** (`.count("\r")` sobre leitura binária/`newline=""`; nunca `grep -c $'\r'`):
   **0 CR no commitado e 0 CR no gerado** — os dois lados vieram de blob, LF puro. **Não há diferença de
   fim de linha para explicar coisa alguma.**
2. **Comparei TEXTO, não hash.** O diff eol-neutro (`unified_diff` sobre as linhas normalizadas) tem
   **76 linhas** e é todo **conteúdo**: as contagens do placar (240→241, 231→232, 190→191, 113→114),
   o título do balde A (33→34), **uma linha nova** (`P-SYNC-AGENTS-NAO-RECURSIVO`) e o deslocamento
   **+39** dos números de linha de todas as demais entradas — o índice commitado foi gerado a partir de um
   `pendencias.md` **39 linhas mais curto**, isto é, de **antes** dos apensos deste PR.
3. **`git diff` NÃO estava vazio** depois de regenerar (`33/32`), que é exatamente o oposto do sintoma da
   armadilha citada. `md5sum` não foi usado como prova em momento algum.

A pendência conhecida `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` é outra coisa: a **coluna `dono`** dizer `sim` para
quem tem `a atribuir` (duas faltas de regex medidas, 91 falsos `sim` em 108). Ela continua **ABERTA** e
**reproduz-se na linha nova** que a regeneração criou — a linha do `P-SYNC-AGENTS-NAO-RECURSIVO` sai com
`dono = sim` embora a pendência diga `**dono:** a atribuir`. **Não corrigi**, e não é omissão: consertar
exige editar `gerar-indice-pendencias.py`, que está **fora** do que este tratamento pode tocar. Fica
nomeado aqui para não ser lido como defeito novo.

### Correção aplicada — pelo script, nunca digitada

```
python agent-orchestration/controle/gerar-indice-pendencias.py
-> indice: 241 cabecalhos / 232 IDs | {FECHADA: 50, ABERTA: 191} | baldes {-:50, C:77, B:80, A:34}
```

**Placar, antes → depois** (o "antes" é o arquivo como estava commitado; o "depois" é a saída do gerador
sobre o `pendencias.md` **já com as correções dos passos 3 e 4** — regenerei por último, de propósito,
porque o índice publica **números de linha** e regenerar antes das edições produziria um índice velho no
mesmo commit):

| | antes | depois |
|---|--:|--:|
| Cabeçalhos `## P-` | 240 | **241** |
| IDs distintos | 231 | **232** |
| **ABERTAS** | 190 | **191** |
| — diferidas (balde C) | 77 | 77 |
| — ativas nesta rodada | 113 | **114** |
| CONTRADITÓRIAS | 0 | 0 |
| FECHADAS | 50 | 50 |
| **ABERTAS · balde A (material)** | 33 | **34** |

`git diff --numstat` do índice: **33/32**. A linha nova está na l.96 do índice, apontando para a l.5169 do
`pendencias.md`.

---

## Passo 3 — C3-A4: corrigi a JUSTIFICATIVA, não a conclusão

**Medi antes de escrever**, no plano do ciclo 5 (`B-O6R-02-ciclo5-plano.md`, 783 linhas no head julgado):

- `grep -n 'scripts/\*\*'` → **vazio**. A string **não existe** no arquivo.
- §5 **l.131**: `scripts/run-backend-tests.mjs` está na lista de arquivos **PERMITIDOS** ao dev do ciclo 5.
- §5 **l.133**: o S0 **deve** rodar `scripts/sync-agent-agents.mjs` **em modo escrita** + commit.
- §5 **l.134** (PROIBIDO): `src/**` inteiro · demais `tests/**` · `ci.yml` · `prisma/schema.prisma` ·
  migrations existentes · `CLAUDE.md`/`AGENTS.md` · `.env` · lockfiles · `infra/**` · frontend · mobile ·
  RBAC · `mvp_*`. **`scripts/**` não está lá.**

Logo a razão publicada era falsa. **Troquei a razão, mantive a conclusão** — a pendência continua **não**
atribuída ao ciclo 5, dono `a atribuir` —, porque a conclusão sempre teve outro pé, agora o único escrito:
o arquivo **não está na allowlist fechada** do dev do ciclo 5, cuja regra é *"Arquivo fora das listas → o
dev PARA e devolve"*, e o ciclo 5 é a **única tentativa** restante (`D-TETO-DOIS-CICLOS`).

**Conferi também o outro pé, o que a cadeira C3 disse ser verdadeiro:** `SAN2-5-plano.md` **l.427** traz
`scripts/**` no PROIBIDO, com o parêntese *"executar `kpi-freeze`/`sync`/`run-backend-tests` sim; EDITAR
não"*. **É verdadeiro** — fica de pé, sem alteração.

Escrevi ao lado uma **ERRATA datada** que transcreve a frase falsa e diz por que caiu: quem ler a pendência
vê o erro e a medição, não um texto silenciosamente trocado (§A2).

---

## Passo 4 — C1-A2 e C2-A1/C2-A2: o apenso E1.10

Os três vivem no `B-O6R-02-ciclo5-plano.md`, cujos apensos são **"apensado — §A2, nunca reescrita"**. Não
existe forma legítima de "editar a linha errada" ali: **a correção de um apenso é outro apenso**. Escrevi
**E1.10 — CLÁUSULA DE PRECEDÊNCIA e ERRATA DE CITAÇÃO**, dentro do apenso E1 (o único que meu despacho
autoriza), append-only.

**(a) C1-A2 — a cláusula que faltava.** Medi: E3 declara *"Este apenso EMENDA o §5 (l.134), o §10.5 (l.234)
e o §12 (l.256)… Onde divergirem, vence este apenso"*; E4 declara o equivalente; **E1 tinha zero**
ocorrência de *vence/prevalece/substitui*. E1.10 dá a E1 a mesma forma: **emenda o §13 (l.260), o §13.3
(l.266) e o §13.4 (l.267)**, e diz o que fica superado, item a item — as "≥7 cadeiras" e as 6 votantes do
§13.3 (valem as **3** de E1.1, unanimidade de 3) e o piso de **6** votos do §13.4 (o piso é **3**, com os
suplentes 1-a-1 de E1.7). Registro por que era ressalva e não defeito: a substância já estava resolvida
**acima** de E1, na EMENDA DO ORQUESTRADOR (item 4, *"3 unânimes, não 7"*), e repetida em 8/8 corpos —
faltava só a forma, que é justamente o que o inspetor **fail-closed** lê.

**(b) C2-A1 e C2-A2 — os dois intervalos, re-medidos por mim** no blob do arquivo **mergeado**
(`git -c core.autocrlf=false show main:.github/workflows/ci.yml` — sem `git archive`/`tar`, que injetariam
CR e fabricariam divergência, §C7.1-ter(c)):

| Citação | Diz | **Vale** | Medição |
|---|---|---|---|
| E3.2, item 3 | guard "l.**223-230**" | **l.223-231** | l.223-225 comentário; `- name: Fail on skipped tests (green-blind guard)` na l.226; `run:` até a **l.231**, e a l.231 é `test "$skipped" -eq 0 \|\| { … exit 1; }` — **a asserção que faz o guard morder**. A l.230 só trata *não conseguir ler* a contagem. |
| E3.3, item (a) (e a mesma citação em E3.2, item 3) | "vizinhas (l.**209-216**)" | **l.213-216** | l.208-212 são **comentário** (`# SAN2-2 (item 2 de P-O6R-B02-SUITES-LIST-CI) …`); as linhas no formato `SUITES="$SUITES …"` são **213-216** (e 197-204, 207 antes do bloco). |

A errata é declarada **OPERANTE**, e o espelho de C2-A2 em `pendencias.md` (l.3838, dentro do apenso que
**este PR** criou na entrada `P-O6R-B02-SUITES-LIST-CI`) foi corrigido no texto. **Nenhuma das duas desloca
a decisão do B3**: o guard existe, é do #363 (`d283903`), e a linha a escrever segue transcrita verbatim.

### Uma armadilha que eu mesmo criei, e como a fechei

Escrevi E1.10 citando `l.598` / `l.601` / `l.614` — os números dos **votos**. Só que E1.10 entra **acima**
do apenso E3: inserir 58 linhas deslocou os alvos para **656/659/672**, e a nota de método que acrescentei
depois deslocou de novo, para **662/665/678**. **Foi a classe do C3-A1 renascendo na própria correção
dela** (§C7.4-bis: quem conserta escreve o conserto com a mesma confiança que produziu o erro). Fechei
assim: (1) a coluna *Onde* aponta para **seções** (E3.2 item 3, E3.3 item (a)), que são âncoras estáveis;
(2) os números de linha entram entre parênteses, **re-medidos por execução depois da última inserção** e
com substituição de **largura igual**, para não deslocarem nada; (3) E1.10 carrega uma nota dizendo que as
citações dos votos valiam no head `5256b49`, antes deste apenso. Re-medição final, já com o arquivo
gravado: **662 · 665 · 678** — batendo com a tabela.

**Append-only conferido na forma forte, depois de tudo:** `git diff --numstat main` do plano = **506 0**
(zero remoção) e `head -c 48455 <plano> | git hash-object --stdin` = **`a191381bea1ffd76c176c206f00f9c65b9585823`**,
**o mesmo OID de blob** do arquivo inteiro na main — as 341 linhas originais não são "parecidas", são o
**mesmo objeto git**.

---

## Passo 5 — C3-A3 e C1-A1: REGISTRADOS, sem conserto (como mandado)

### C3-A3 — errata de data (BAIXA)

Medi: `git log -1 --format='%ad|%cd|%as|%cs' --date=iso 74430cc` → **`2026-08-29 01:15:15 -0300`** nas
quatro formas. **Nenhuma devolve 2026-08-28.** Rastreei a fonte real do "2026-08-28": é o
**`snapshot_date` da entrada de KPI do #360** (`version B-O6R-REG`, `pr 360`, `merge_commit 74430cc`) —
conferido no próprio `kpis-history.json`. O texto do item (4) de "O QUE ESTE BLOCO NÃO FECHOU" atribui essa
data ao `git log` que cita ao lado; **o comando não a produz**. **A substância sobrevive inteira:** o
espelho `Kpis/kpis-history.md` está parado desde o **#360**, o hash e o PR estão certos, e a classificação
`pre-existente` fica de pé. É defeito de **transcrição de proveniência**: o número veio de um artefato e foi
creditado a outro. Registro como errata; a nota pós-voto do KPI a repete para quem só lê o painel.

### C1-A1 — nota sobre o corpo do crítico titular (sem gravidade)

Medi em `.claude/agents/especialistas/critico-c5-adversarial.md` (357 linhas): o **formato de saída**, item
4 "Achados" (l.259-260), pede *defeito · evidência · gravidade · motivo* — **sem `escopo`**; as linhas de
VEREDITO (l.267-269) idem. **Mas:** (1) o corpo veio **verbatim** do blob `7c47b0f5` de `demo/investidor`,
logo a classe **antecede** o SAN2-5; (2) o **APENSO** do bloco se declara *"OPERANTE e vence o corpo acima
onde divergir"* (l.276) e a sua **A.4** (l.337) manda **classificar cada achado com `escopo`, além da
gravidade**, citando `§C7.1-ter(a)`; (3) o crítico **não vota** (l.32: *"não vota, não planeja, não
desenvolve"*), e o `§C7.1-ter(a)` obriga o campo **no VOTO**. Portanto: **nota, não defeito** — e nenhuma
ação. Corrigir o corpo por dentro custaria reescrever uma identidade **reservada e ainda não servida**, que
é precisamente o que E1.9 evitou ao usar emendas cirúrgicas + apenso.

---

## Passo 6 — Provas finais (todas reexecutadas DEPOIS da última edição)

| Prova | Saída |
|---|---|
| `node scripts/kpi-freeze.mjs` | `cópia congelada reinjetada (snapshot 2026-09-01, 70219 bytes)` · **ec=0** |
| `node scripts/kpi-freeze.mjs --check` | `em dia (snapshot 2026-09-01)` · **ec=0** |
| `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **16 tests / 16 pass / 0 fail / 0 skipped** · **ec=0** |
| `node --check Kpis/app.js` | **ec=0** |
| `git diff --check` | limpo · **ec=0** |
| Índice, placar antes → depois | **240/231/190/33 → 241/232/191/34** (pelo script) |

**Escopo — o que foi tocado, e o que não foi:**

```
1  1   Kpis/app.js                      (só a var FROZEN, reinjetada pelo kpi-freeze)
1  1   Kpis/kpis-history.json           (C3-A1 + nota pós-voto — JSON de uma linha por entrada)
1  1   Kpis/kpis-latest.json            (C3-A1 + nota pós-voto)
33 32  agent-orchestration/controle/pendencias-indice.md   (regenerado pelo script)
25 4   agent-orchestration/controle/pendencias.md          (C3-A4 + espelho C2-A2)
64 0   agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md  (apenso E1.10)
+      agent-orchestration/omega/juntas/votos/SAN2-5/pos-voto-log.md  (este diário)

git diff --name-only -- src tests scripts .github prisma CLAUDE.md AGENTS.md
                         API_CONTRACTS.md .agents frontend mobile   ->  0 arquivos
```

Os arquivos de **voto e evidência das cadeiras** (`0{0a,1,2,3}-*`) **não foram tocados** — só lidos.
**Nenhum commit.** **Nenhum comando** contra `erp-postgres`/`erp-redis`, nem de leitura.

### O append-only do PR SOBREVIVEU ao tratamento — e isto é medição, não promessa

Reescrevi 4 linhas (3 da justificativa C3-A4 + 1 do espelho C2-A2), o que faz `25/4` **contra o head
`5256b49`**. Mas o que o PR entrega é o diff **contra a `main`**, e ali:

```
git diff --numstat main -- .../pendencias.md                    ->  121  0
git diff --numstat main -- .../B-O6R-02-ciclo5-plano.md         ->  506  0
```

**Zero remoções nas duas.** A razão é verificável: **as 4 linhas que reescrevi nasceram neste PR e nunca
existiram na main** — `git show main:…/pendencias.md | grep -c` das duas frases devolve **0** e **0**. Ou
seja, nenhuma linha **pré-existente** foi alterada, que é a propriedade que a cadeira C3 mediu ao dizer
*"nada foi fechado por cabeçalho"*. Os números `442 0` e `100 0` publicados no KPI continuam **verdadeiros
no head `5256b49`**, e a nota pós-voto publica os novos **com o head/base em que valem** — a mitigação do
C3-A1 aplicada ao próprio texto que a instalou.

### Limpeza (§C5)

Sandboxes de medição (`idx_head/`, `idx_main/`) e scripts de edição viveram **fora da árvore do
repositório**, no scratchpad da sessão, e foram removidos ao final. Nenhum container, nenhum cluster,
nenhum artefato de build gerado — este tratamento não compila nada.
