# SAN2-2 · Fase 4 (metade PENDÊNCIAS) — diário de execução

**Agente:** `dev-san2-2` · **Data:** 2026-08-30 · **Worktree:** `.claude/worktrees/san2-r` ·
**Branch:** `fix/san2-2-guard-espelho-ci` · **Head na abertura:** `2e4985b`

**Mandato:** as cinco ações de registro em `agent-orchestration/controle/pendencias.md` + regeneração do
índice por script. **Não toco** `Kpis/**`, `CLAUDE.md`, `AGENTS.md`, `src/**`, `tests/**`, `.github/**`.
**Não commito.**

**Por que existe este diário:** um verificador adversarial constatou que esta metade **não foi executada** —
o agente anterior morreu antes de começar. As Fases 1, 2, 3 e 5 estão entregues e provadas; o que falta é o
**registro**, e é o registro que separa "consertamos" de "consta que consertamos". Escrevo após **cada**
edição, porque dezenas de agentes caíram hoje.

---

## F4.0 — Verificação ANTES de escrever (não transcrevo o que não medi)

O mandato me entregou números. A regra da rodada é que número sem execução não entra em registro, então
**medi cada um antes de copiá-lo**. Segue o que mediu o quê.

### F4.0.a — O ID `P-C7-BIS-TER-FORA-DA-MAIN` realmente não existe

```
$ git grep -n "P-C7-BIS-TER-FORA-DA-MAIN" -- .
agent-orchestration/omega/juntas/votos/SAN2-1R/00-quedas-pos-merge.md:31
agent-orchestration/omega/juntas/votos/SAN2-1R/00c-porteiro-evidencia.md:232
agent-orchestration/omega/juntas/votos/SAN2-1R/00c-porteiro-pos-merge-362.md:18,21,69,78,129
agent-orchestration/omega/planos/SAN2-2-plano.md:15,89,129
$ grep -c "P-C7-BIS-TER-FORA-DA-MAIN" agent-orchestration/controle/pendencias.md
0
$ grep -c "P-C7-BIS-TER-FORA-DA-MAIN" agent-orchestration/controle/pendencias-indice.md
0
```

**CONFIRMADO.** O ID vive só na trilha da junta e no plano — **zero** ocorrências nos dois arquivos de
controle. O agravante que o porteiro do #362 nomeou é real: a pendência era citada como se existisse.

### F4.0.b — A ausência que a pendência descreve (§C7.1-bis / §C7.1-ter)

```
$ git show main:CLAUDE.md            | grep -c "1-bis\|1-ter"   -> 0
$ git show main:AGENTS.md            | grep -c "1-bis\|1-ter"   -> 0
$ git show demo/investidor:CLAUDE.md | grep -c "1-bis\|1-ter"   -> 2
$ git show demo/investidor:AGENTS.md | grep -c "1-bis\|1-ter"   -> 2
$ git show 2e4985b:CLAUDE.md         | grep -c "1-bis\|1-ter"   -> 2
$ git show 2e4985b:AGENTS.md         | grep -c "1-bis\|1-ter"   -> 2
```

Os 4 pontos do porteiro reproduzem. E o head desta branch **já corrige** — 2 e 2.

### F4.0.c — A evidência do fechamento (commit `2e4985b`, Fase 3)

```
$ git show --numstat --format= 2e4985b
121  0  .agents/agents/inspetor-de-terreno-da-junta.md
115  0  .claude/agents/inspetor-de-terreno-da-junta.md
 45  0  AGENTS.md
 45  0  CLAUDE.md
525  0  agent-orchestration/omega/juntas/votos/SAN2-2/dev-fase3-log.md
```

**Inserção pura +45/−0 em cada contrato** — confere. Nenhuma linha removida: o transporte não pisou em
regra existente. **115 linhas** no instrumento `.claude/agents/inspetor-de-terreno-da-junta.md` — confere
(o espelho tem 121: o cabeçalho de emulação Codex).

```
$ git show 2e4985b:CLAUDE.md | grep -c "ciclo 5 falho"  -> 0
$ git show 2e4985b:AGENTS.md | grep -c "ciclo 5 falho"  -> 0
```

**0/0** — o §C7.4 revogado **não** voltou de carona no transporte. Era o risco real de trazer texto de uma
branch de demo para a `main`, e ele não se materializou.

```
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 23 agentes, espelho consistente.
exit=0
$ ls .claude/agents/*.md | wc -l  -> 23
$ ls .agents/agents/*.md  | wc -l -> 24   (23 espelhados + README.md, que é KEEP)
```

**23/24 e exit 0** — confere, e agora sei de onde vêm os dois números (não são 23 de 24 espelhados com um
faltando; são 23 espelhados e 24 arquivos, porque o README é KEEP).

### F4.0.d — A evidência da Fase 1 (commit `db2d291`)

```
$ git show --numstat --format= db2d291
  9  0  .github/workflows/ci.yml
 43  0  .../votos/SAN2-2/00-quedas.md
953  0  .../votos/SAN2-2/dev-fase1-log.md
453  0  agent-orchestration/omega/planos/SAN2-2-plano.md
  7  1  scripts/sync-agent-agents.mjs
345  0  tests/agents-mirror-guard.test.ts
$ grep -cE "^\s*(test|it)\(" tests/agents-mirror-guard.test.ts  -> 12
$ grep -n "sync-agent-agents" .github/workflows/ci.yml
69:      - name: Agents mirror guard (sync-agent-agents --check)
70:        run: node scripts/sync-agent-agents.mjs --check
```

**12 casos permanentes** — confere por contagem. **O passo do CI existe** — confere. A correção do script é
de **7 linhas com 1 removida**, coerente com "normalizar o alvo como já se normaliza a fonte".

Os drills A e B (22 DIVERGE → 0; 8 mutações, 8 vermelhas) são da Fase 1 e estão no `dev-fase1-log.md`
(953 linhas). **Não os reexecutei** — não é meu mandato e reexecutá-los exigiria checkout fresco. O que
**medi por conta própria** é que o `--check` sai **exit 0 hoje, neste worktree** (F4.0.c) e que os 12 casos
que o tornam permanente existem no disco. Registro a origem de cada número no texto da pendência.

### F4.0.e — A lista de suítes do CI (Fase 2)

```
$ git show 02ced85^:.github/workflows/ci.yml | grep -cE '^\s*SUITES='  -> 23
$ git show 02ced85:.github/workflows/ci.yml  | grep -cE '^\s*SUITES='  -> 27
$ grep -cE '^\s*SUITES=' .github/workflows/ci.yml                      -> 27
```

**23 → 27** — confere pela contagem de linhas de atribuição (a primeira medição que tentei, `grep -c
"test.ts"`, deu 24 → 29 porque pega `test.ts` fora do bloco SUITES; **a régua importa**, e a régua certa é
a linha `SUITES=`).

```
$ git ls-tree main -- tests/financial-entry-delete-reverse-race-db.test.ts
(vazio)
$ git ls-tree feat/o6r-b02-financial-uow -- tests/financial-entry-delete-reverse-race-db.test.ts
100644 blob e52950837ae3e97b1fb3272c159c1a5887d37a12
```

**A suíte não existe na `main`** e existe na branch não-mergeada, com o blob `e5295083` que a Fase 2 citou.
Confere — e é a prova de que fechá-la seria mentir.

### F4.0.f — A causa nova do `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP`

```
$ sed -n '1,13p' src/database/prisma.ts
 1  import "dotenv/config";
 ...
 9  const connectionString = process.env.DATABASE_URL;
10
11  if (!connectionString) {
12    throw new Error("DATABASE_URL is required to initialize Prisma Client.");
13  }
```

**`src/database/prisma.ts:12` é literalmente o `throw`**, em **escopo de módulo** — dispara no *load* do
arquivo, antes de qualquer `test()` registrar. Isso **é** um crash de arquivo, não um auto-pulo. O
mecanismo confere com a causa que o mandato me passou.

Não há `.env` neste worktree (só `.env.example`), então `npm test` aqui roda naturalmente sem
`DATABASE_URL`. Disparei a execução para medir o número **eu mesmo** em vez de copiá-lo — resultado em
F4.5.

---

## F4.2 — `P-REG-S0-GUARD-FALSO-VERMELHO` FECHADA  ✅

**Feito nesta ordem, e a ordem é a regra:** (1) cabeçalho marcado `**FECHADA em 2026-08-30**`; (2) bloco de
evidência inserido logo abaixo do cabeçalho, com o registro original **preservado** (§A2 — não se reescreve);
(3) **a linha de status** — o único campo canônico — virada de `ABERTA` para `FECHADA`, com dono
`SAN2-2 (Fase 1, db2d291)`; (4) a nota da triagem SAN2-1 anotada como **superada**, com data e motivo, em vez
de apagada.

O item (4) importa: a nota dizia *"Marcada ABERTA por padrão conservador — não fechei o que não verifiquei"*.
Deixá-la intacta ao lado de um `status: FECHADA` produziria a **mesma afirmação dupla** que o achado A-3 da
junta do SAN2-1 pegou em `P-O6R-B02-S0-ESPELHO-NO-HEAD` (boilerplate colado contradizendo o próprio status).
Anotei em vez de apagar: a triagem estava certa **na época** — ela não tinha verificado; agora foi verificado.

**Não fechei por cabeçalho.** O cabeçalho recebeu a marca porque é a convenção de leitura deste arquivo, mas
quem move o índice é a linha de status — e é ela que eu virei. Prova pelo classificador:

```
$ python agent-orchestration/controle/gerar-indice-pendencias.py
ANTES: {'FECHADA': 45, 'ABERTA': 184} | baldes {'-': 45, 'C': 77, 'B': 76, 'A': 31}
DEPOIS:{'FECHADA': 46, 'ABERTA': 183} | baldes {'-': 46, 'C': 77, 'B': 76, 'A': 30}
```

**Exatamente uma** entrada mudou de lado (`-` +1, `A` −1). Nenhuma outra se mexeu — o que também prova que a
edição não vazou para entradas vizinhas.

**Honestidade sobre a origem dos números** (está escrita dentro da própria entrada, não só aqui): os drills A
(22 `DIVERGE` → 0) e B (8 mutações, 8 vermelhas) vêm do `dev-fase1-log.md`; **não os reexecutei** — exigiriam
checkout fresco e estão fora do mandato da Fase 4. O que medi por conta própria: 12 casos permanentes, o passo
do CI (`ci.yml:69-70`), o diffstat do `db2d291` e o `--check` verde de hoje (exit 0, 23 agentes).

**EOL preservado:** o arquivo é CRLF uniforme (era 4068/4068, ficou 4101/4101 — só as linhas que somei). Li com
`newline=''` e reescrevi convertendo de volta; não converti o arquivo para LF.

---

## F4.3 — `P-O6R-B02-SUITES-LIST-CI` apensada e com dono  ✅

**Continua ABERTA — de propósito.** A suíte que originou a pendência não existe na `main` (medido:
`git ls-tree main` vazio; `git ls-tree feat/o6r-b02-financial-uow` → blob `e5295083`). Pôr a linha no
`ci.yml` hoje quebraria o job. Fechar aqui seria mentir; foi o que registrei.

**A contradição que a fase resolveu.** O `ci.yml` entregue na Fase 2 **já afirmava**, no comentário do lugar
reservado, que a pendência *"segue ABERTA, com esse PR como dono"* — e o registro dizia `dono: a atribuir`.
Dono declarado no código e ausente no registro é dono que ninguém cobra. Nomeei na linha de status:
**o PR que mergear o `B-O6R-02`**, para quem a inclusão da linha vira DoD. Registrei também o **critério de
fechamento**, para o próximo não ter de deduzir.

**Correção de régua que fiz no meio do caminho, e que fica escrita na própria entrada.** Minha primeira
medição da lista foi `grep -c "test.ts"` → **24 → 29**. Errada para o que se quer contar: pega ocorrências
fora do bloco `SUITES`. A régua certa é a linha de atribuição, `grep -cE '^\s*SUITES='` → **23 → 27**, que
bate com o que a Fase 2 declarou. Deixei as duas no registro com o motivo — num arquivo que existe para matar
número que a execução não produz, esconder a medição descartada seria a própria doença.

**Placar do índice: inalterado** (`{'FECHADA': 46, 'ABERTA': 183}`), como tem de ser — apenso não move estado.

**ACHADO COLATERAL, e ele é sério (ver F4.7).** Depois da re-atribuição, a linha do índice para esta pendência
continua **idêntica**:

```
| `P-O6R-B02-SUITES-LIST-CI` | 3690 | MÉDIA | sim | ... |
```

Ela já dizia `sim` **antes**, quando o campo era literalmente `**dono:** a atribuir`. Ou seja: a coluna que
responde *"de quem é"* não distinguia dono nomeado de dono ausente. Medi e registrei — F4.7.

---

## F4.4 — `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` apensada com a causa nova  ✅

**Não copiei o número que me deram: reexecutei.** Havia `.env.example` mas **nenhum `.env`** neste worktree,
então `npm test` roda aqui naturalmente sem `DATABASE_URL` — o cenário exato. Resultado:

```
[run-backend-tests] 248 arquivo(s) · 2371 teste(s) · pass 2312 · fail 1 · skipped 58     EXIT=1
```

**Idêntico** às 2 execuções anteriores do orquestrador. Esta é a **terceira**, independente. Denominador não
se moveu.

**A causa, verificada no mecanismo e não só no sintoma.** `src/database/prisma.ts` lê `process.env.DATABASE_URL`
na l.9 e **lança na l.12**, em **escopo de módulo** — dispara no `import`, antes de qualquer `test()` se
registrar. Por isso o arquivo some inteiro do denominador em vez de virar falha ou pulo. Confere com o
stack da execução (`prisma.ts:12:9`, 2 ocorrências). **Não é auto-pulo**, que é o cenário que a entrada
descreve e que só se obtinha por mutação. Quem for consertar procurando `skip:` não acha nada.

**Arquivo culpado, nomeado pela própria execução:** `tests/core-saas-role-authority.test.ts`. Cruzei com o
registro: a entrada `P-O6R-B02-BATERIA-CANONICAS-1-2`, de **2026-08-28**, já nomeava este mesmo arquivo como
pré-existente — é a **evidência de data** que a `D-JUNTA-ESCOPO-E-CALIBRACAO` §1-ter(a) exige para eu poder
declarar `pre-existente` em vez de `dentro-do-bloco`. Sem ela, o escopo declarado valeria como
`dentro-do-bloco`.

**Achado que MELHORA a entrada, e que eu não esperava encontrar.** O guard **não está mais mudo**. O piso de
denominador entregue pelo `B-O6R-ARNES` (#359) **mordeu neste caso real**: saiu `ec=1`, nomeou o arquivo e
**citou esta pendência pelo ID** na própria mensagem. Então a entrada acima, que diz `ec=0` e "guard mudo",
descreve **o head em que foi escrita**, não o de hoje. Registrei a distinção em vez de deixar a frase velha
passar por verdade corrente — e o que resta aberto mudou de natureza: não é mais a **detecção**, é a
**causa** (o arquivo não declara skip sem `DATABASE_URL`, ao contrário do irmão `-db`).

**Não consertei**, e digo por quê na entrada: `src/**` e `tests/**` estão fora do escopo do `SAN2-2`, e quem
acha não conserta (`D-JUNTA-SEPARACAO-DE-PAPEIS`).

**Status:** segue `ABERTA`, `dono: a atribuir` — o mandato pediu apenso, não re-atribuição, e eu não tenho
como nomear dono para trabalho em `tests/**`. Placar do índice inalterado.

---

## F4.1 — `P-C7-BIS-TER-FORA-DA-MAIN` criada E fechada  ✅

**A ordem foi: provar que não existia → criar → fechar.** `grep -c` nos dois arquivos de controle → **0 e 0**
(F4.0.a). O ID vivia só nos 3 artefatos da junta do `SAN2-1R` e no plano — citado como se existisse. Escrevi
essa asimetria na própria entrada, porque é ela que justifica abrir e fechar no mesmo PR: sem entrada, o
fechamento não teria onde constar, e o índice continuaria respondendo "não há tal pendência" a quem
perguntasse.

**A entrada carrega as duas metades separadas:** a ausência (4 pontos, 0/0/2/2, escopo `pre-existente`,
`74430cc` já media 0) e o fechamento (`2e4985b`: **+45/−0 em cada contrato**, `ciclo 5 falho` **0/0**,
instrumento de **115 linhas** portado verbatim, `--check` **exit 0** com 23 agentes em 24 arquivos).

**Os dois números que eu não entendia, e agora entendo:** "23/24" não é *23 de 24 espelhados com um faltando*
— são **23 agentes espelhados** em **24 arquivos**, porque o `README.md` do espelho é KEEP (e há um caso
permanente no guard exatamente para ele não virar `SOBRA`). Escrevi assim na entrada para o próximo não ler
como "um agente ficou de fora".

**Severidade: MÉDIA, classificada aqui e com o critério dito.** Nenhuma junta havia atribuído severidade a
este achado — ele nunca teve entrada. Em vez de carimbar um rótulo emprestado, classifiquei e escrevi o
porquê: é governança/registro (não toca dinheiro, dado, permissão nem produto — a régua de quórum da própria
§C7.1-ter), mas atinge o contrato que decide **como toda junta começa**.

**Índice:** `FECHADA` 46 → **47**; cabeçalhos 229 → **230**; IDs 221 → **222**. `ABERTA` não se moveu — que é
o esperado para uma entrada que nasce fechada.

---

## F4.5 — `P-SAN2-2-PORTA-55432-RESERVADA` criada  ✅

**Verifiquei a causa em vez de transcrever a mensagem de erro.** O log da Fase 2 dizia "faixa excluída
55353–55452". Consultei o sistema:

```
$ netsh interface ipv4 show excludedportrange protocol=tcp
     55253       55352
     55353       55452      <- 55432 cai AQUI
```

**Confirmado**, e de quebra confirmei o contorno: **56432** e **56379** não caem em nenhuma faixa da mesma
listagem. O erro *parece* do Docker e é do Windows — foi por isso que custou tempo.

**Severidade BAIXA e dono `a atribuir` — as duas honestas.** BAIXA é a classificação que a Fase 2 já
registrou (`dev-fase2-log.md` l.319) e o critério se sustenta: nada em `src/`, `tests/`, `prisma/` ou
`.github/` está errado, nenhum número publicado depende disto. **Não inventei dono:** o trabalho que fecharia
a pendência é documental — corrigir as duas linhas do `SAN2-2-plano.md` (l.221/223, que **continuam**
prescrevendo 55432 em arquivo rastreado) ou somar a consulta do `netsh` à receita de cluster descartável em
`docs/`. Os dois arquivos estão **fora** do escopo desta fase. Nomear dono que não combinei seria inventar
compromisso alheio.

**A lição durável que escrevi na entrada não é "use 56432".** As faixas são dinâmicas — variam por máquina e
mudam entre reinicializações do Hyper-V/WinNAT. É **consultar antes de escolher**. Registrar "use 56432"
produziria a próxima armadilha em vez de matar esta.

**Índice:** `ABERTA` 183 → **184**, balde **B** (processo/registro) 76 → 77 — correto: BAIXA não é material,
então não entra no balde A.

---

## F4.7 — ACHADO NÃO PEDIDO: a coluna "dono" do índice diz **sim** para quem não tem dono  ✅ registrado

**Isto não estava nas cinco ações.** Registrei por §A2 (não esconder conflito) e porque **calá-lo tornaria a
ação 3 inconsequente**: eu re-atribuí um dono e o índice continuou dizendo exatamente a mesma coisa.

**Medido sobre este arquivo, em 2026-08-30:**

| | qtde |
|---|--:|
| cabeçalhos `## P-` | 231 (na hora da medição) |
| marcados `dono = sim` | **108** |
| — dos quais o campo diz `a atribuir` (**falso sim**) | **91** |
| — com dono de verdade | 17 |

**São DUAS faltas independentes**, e provei cada uma isolada em vez de deduzir da leitura:

1. O lookahead negativo não protege, porque `\s*` **retrocede para zero espaços** e o `(?!a atribuir)` acaba
   avaliado diante de `" a atribuir"` — que começa com espaço. `re.search(...,'- **dono:** a atribuir')` →
   **casa**.
2. A segunda alternativa (`\*\*Dono:?\*\*`) não tem filtro e roda sob `re.I`, então casa `**dono:**` de
   qualquer entrada. **Mesmo consertando a falta 1, o `or` reintroduziria o defeito.**

**Não corrigi o script** — está fora do escopo desta fase e quem acha não conserta. Deixei a correção
indicada e **exigi prova por mutação** de quem receber, do mesmo jeito que o `agents-mirror-guard` prova o
seu (Drill B). Enquanto não for corrigido, escrevi na entrada que **a coluna `dono` do índice não deve ser
citada** — vale ler o campo na fonte.

**Ironia útil, e ela é auto-demonstrativa:** a própria entrada nova aparece no índice como `dono | sim`
enquanto seu campo diz `a atribuir`. O registro do defeito é uma instância do defeito.

---

## F4.6 — Índice regenerado por script · placar antes/depois  ✅

**Regenerado, nunca digitado:** `python agent-orchestration/controle/gerar-indice-pendencias.py`.

| | ANTES (head `2e4985b`) | DEPOIS | Δ |
|---|--:|--:|--:|
| cabeçalhos `## P-` | 229 | **232** | +3 |
| IDs distintos | 221 | **224** | +3 |
| ABERTAS | 184 | **185** | +1 |
| FECHADAS | 45 | **47** | +2 |
| balde A (material) | 31 | **31** | 0 |
| balde B (processo/registro) | 76 | **77** | +1 |
| balde C (`DIFERIDO-LEVE`) | 77 | **77** | 0 |

**Os deltas fecham com as ações, um a um:** +3 cabeçalhos e +3 IDs = as três entradas novas
(`P-C7-BIS-TER-FORA-DA-MAIN`, `P-SAN2-2-PORTA-55432-RESERVADA`, `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`).
FECHADAS +2 = `P-REG-S0-GUARD-FALSO-VERMELHO` (era aberta, balde A → −1 em A) e `P-C7-BIS-TER-FORA-DA-MAIN`
(nasce fechada). ABERTAS +1 = as duas novas abertas (+2) menos a S0 que fechou (−1). Balde A: −1 (S0) +1
(`INDICE-DONO`) = 0. Balde B: +1 (`PORTA-55432`, BAIXA → não é material). **Os dois apensos não movem nada**,
como tem de ser.

### A armadilha do verificador, medida como ele mandou

O aviso era: rodar o gerador muda o `md5sum` e faz o `git status` marcar ` M`, mas a diferença é **100% EOL**;
não reportar "índice defasado" com base em md5 ou `git status`. **Confirmado, e medido eol-neutro:**

```
md5 eol-neutro do indice ANTES de regenerar  : a5cd9e7a78acc3186ec834af3a0c76b1
md5 eol-neutro DEPOIS de regenerar           : a5cd9e7a78acc3186ec834af3a0c76b1   <- IDENTICO
```

Regenerar duas vezes seguidas dá **o mesmo conteúdo eol-neutro** — o índice é **idempotente** e está **em
dia** com a fonte. O gerador escreve com `newline=''` (LF puro), enquanto a árvore está sob
`core.autocrlf=true`; é daí que vem o ` M` cosmético, e não de conteúdo. Na primeira execução desta fase, o
`git diff` do índice veio **vazio** com o `git status` marcando ` M` — exatamente o falso-positivo descrito.
(Agora o índice diverge **de verdade** do commitado, porque o placar mudou; isso é a mudança real, não EOL.)

**`pendencias.md` continua CRLF uniforme:** 4068/4068 → **4400/4400**. Li com `newline=''` e reconverti ao
escrever; não converti o arquivo para LF em momento nenhum.

---

## Fechamento — o que mudou, e o que eu NÃO toquei

### O diff, linha a linha

```
$ git diff --numstat -- agent-orchestration/controle/
 26  23  agent-orchestration/controle/pendencias-indice.md   (gerado)
336   5  agent-orchestration/controle/pendencias.md
```

**Apenas CINCO linhas removidas no arquivo inteiro**, e todas deliberadas:

1. a linha de status de `P-O6R-B02-SUITES-LIST-CI` (→ dono re-atribuído);
2. o cabeçalho de `P-REG-S0-GUARD-FALSO-VERMELHO` (→ marcado FECHADA);
3. a linha de status de `P-REG-S0-GUARD-FALSO-VERMELHO` (→ `FECHADA`);
4. a nota de triagem SAN2-1 dessa entrada (→ anotada como superada, **não apagada**);
5. a última linha do arquivo, **re-inserida idêntica** — o arquivo não tinha `newline` no fim e passou a ter.

Nenhuma outra entrada foi tocada. Nenhum texto histórico foi reescrito (§A2).

### Escopo respeitado

- **Toquei:** `agent-orchestration/controle/pendencias.md`, `pendencias-indice.md` (**só via script**) e este
  diário.
- **NÃO toquei:** `Kpis/**`, `CLAUDE.md`, `AGENTS.md`, `src/**`, `tests/**`, `.github/**`,
  `gerar-indice-pendencias.py`.
- **`Kpis/app.js`, `kpis-history.json` e `kpis-latest.json` aparecem como ` M` no `git status` — não são
  meus.** São da outra metade da Fase 4 (o agente de KPI, cujo diário `dev-fase4-kpi-log.md` já estava no
  disco quando comecei), rodando no mesmo worktree. Digo isto porque um verificador que olhe só o
  `git status` vai ver KPI modificado num PR onde o agente de pendências jurou não tocar em KPI.
- **Não commitei.**
- **Containers intactos** (conferido ao fim): `san2-2-pg` e `san2-2-redis` de pé há 4 h em 56432/56379;
  `erp-postgres` e `erp-redis` de pé há 40 h, *healthy*. O `npm test` da F4.4 rodou **sem** `DATABASE_URL` —
  não encostou em banco nenhum.

### As regras de forma, uma a uma

| regra | como cumpri |
|---|---|
| Só a linha de status decide | Fechei a S0 **pela linha**; o cabeçalho recebeu a marca por convenção de leitura, e a prova é o placar ter movido exatamente 1 entrada |
| Nunca fechar por cabeçalho | `P-O6R-B02-SUITES-LIST-CI` **continua ABERTA** apesar de o `ci.yml` já falar dela no passado; `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` continua ABERTA |
| Não carimbar severidade não verificada | As duas severidades que **eu** atribuí (`P-C7-BIS-TER`, `P-SAN2-2-INDICE-DONO`) vêm com **o critério escrito**; a da porta **cita a classificação anterior** da Fase 2 e concorda com razão dada; nas duas apensadas **não mexi na severidade** |
| Regenerar o índice por script | Sim, e o placar antes/depois está acima com os deltas conferidos um a um |
| Não reportar defasagem por md5/`git status` | Medi **eol-neutro**: idempotente, mesmo md5. Reportei o ` M` como cosmético e disse a causa |

### O que fica para quem vier

- **`P-SAN2-2-INDICE-DONO-SEMPRE-SIM`** — a coluna `dono` do índice não vale como resposta enquanto não for
  corrigida **com prova por mutação**. É o achado com maior consequência desta fase.
- **`P-O6R-B02-RUNNER-SUMICO-SEM-SKIP`** mudou de natureza: a detecção **já está tampada** (o piso de
  denominador morde, `ec=1`, nomeando o arquivo); o que resta é a causa em
  `tests/core-saas-role-authority.test.ts`.
- **`P-O6R-B02-SUITES-LIST-CI`** tem dono nomeado e critério de fechamento escrito: o PR que mergear o
  `B-O6R-02`.
- **`P-SAN2-2-PORTA-55432-RESERVADA`**: o `SAN2-2-plano.md` (l.221/223) **ainda** prescreve 55432 em arquivo
  rastreado. Quem puder tocar o plano ou `docs/` fecha.

---

## Estado

- [x] F4.1 — criar e fechar `P-C7-BIS-TER-FORA-DA-MAIN`
- [x] F4.2 — fechar `P-REG-S0-GUARD-FALSO-VERMELHO`
- [x] F4.3 — apensar `P-O6R-B02-SUITES-LIST-CI` (+ re-atribuir dono)
- [x] F4.4 — apensar `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP`
- [x] F4.5 — criar `P-SAN2-2-PORTA-55432-RESERVADA`
- [x] F4.6 — regenerar o índice por script, placar antes/depois
- [x] F4.7 — (não pedido, §A2) registrar `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`
