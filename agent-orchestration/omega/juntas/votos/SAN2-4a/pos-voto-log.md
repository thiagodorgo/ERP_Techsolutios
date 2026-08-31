# Pós-voto do SAN2-4a — diário do agente que CONSERTA (não achou)

> **Papel (§C7.4-bis):** quem acha não conserta. Os cinco achados abaixo foram levantados pelas três
> cadeiras da junta do PR **#365** (**APROVADO 3×0**). Eu não votei, não medi nada do bloco e não
> escrevi nenhum dos três diários de medição. Meu trabalho é **executar as correções nomeadas**,
> com evidência própria de cada passo.
>
> **Worktree:** `.claude/worktrees/san2-r` · **branch:** `chore/san2-4a-medir-arnes` · **head de
> partida:** `4199b92`.
>
> **Escrita incremental:** este arquivo é escrito **após cada passo**, não no fim.

---

## Passo 0 — leitura dos votos antes de qualquer edição

Li os três votos **antes** de tocar em qualquer arquivo (a instrução era explícita, e o motivo é o
§C7.4-bis: eu preciso da evidência do achador, não da minha reconstrução dela).

| Arquivo | Cadeira | Veredito | Achados que me cabem |
|---|---|---|---|
| `01-medicao1-voto.json` | C1 — auditor da medição 1 | APROVADO | **C1-A1** (BAIXA) — o `+78 %` |
| `02-medicoes-2-3-voto.json` | C2 — auditor das medições 2 e 3 | APROVADO | **C2-A1** e **C2-A2** (atenção) |
| `03-escopo-kpi-voto.json` | C3 — zelador do escopo e do KPI | APROVADO | **A-1** (MÉDIA) e **A-3** (BAIXA) |

Mais o erro do **orquestrador** (as "11 observações" do briefing), que a C3 registrou no seu
`alvo_extra_da_C1.analogo_na_minha_area` com escopo `pre-existente` e dono "próxima passada do
inspetor-de-terreno-da-junta" — e que o mandato me manda corrigir agora.

**O que li e vou usar como fonte (não como memória):**

- **C1-A1:** o voto dá a aritmética inteira. F1 `n=30 min=2637 max=2765 média=2703,83`; F2 `n=10
  min=3902 max=4797 média=4375`. Os quatro pareamentos: `min↔min 48,0 %` · `max↔max 73,5 %` ·
  `maxF2/mínF1 81,9 %` · `mínF2/maxF1 41,1 %`. O voto acrescenta um quinto que o mandato não cita:
  `maxF2/médiaF1 = 77,4 %` — "o mais generoso defensável". **Nenhum dá 78.** A C3 corroborou
  independentemente e fechou igual ("para fechar, o max da F2 teria de ser 4922 ms").
- **C2-A1:** três listas de **6 arquivos distintas** produzem `(6,37)`, e a C2 **executou as três**
  (`lista6` 3/3, `lista6alt` 3/3, `lista6alt2` 2/2). O contraexemplo já estava no **§R.5** do próprio
  documento, rotulado `[outra]`, e o laço com o E-2 três parágrafos adiante não foi fechado.
  Atenuante que a C2 faz questão de registrar: **o §V.3 está correto e completo** — nomeia os 6
  arquivos e diz "não intercambiável". O errado é o **alcance** do E-2, não a medição.
- **C2-A2:** `grep -rn "await createEphemeralRole(" tests/ src/ scripts/ | cut -d: -f1 | sort -u`
  devolve **5** arquivos. O quinto é `tests/db-catalog-write-guard.test.ts` (chamadas em l.383,
  l.471, l.511), último commit `f081b5d` (2026-08-28, #359) — **já existia** quando a medição foi
  escrita. A l.470 dele diz literalmente "O sweep roda dentro de createEphemeralRole — é assim que
  ele roda na suíte de verdade".
- **A-1 (C3):** `kpis-history` tem **147** entradas em `main` **e** 147 no `HEAD`; `grep -c
  '"SAN2-4a"'` nos dois JSON = **0**; `kpis-latest` segue `version "SAN2-3"`. O plano exigia a
  entrada em **dois** lugares (§1.6 "obrigação, não opção" e §6.4, item da bateria). Consequência
  medida pela própria C3: no merge do #365 o painel volta a estar **um merge atrás** — o defeito que
  o commit `83d0366` anuncia ter consertado.
- **A-3 (C3):** `release.backfill_note` **não** está entre as 7 chaves que mudaram — `main` e `HEAD`
  são **byte a byte idênticos** ali, ambos falando do **#363**. A C3 é explícita: **não é falso e
  não há contradição factual** (363/d283903/c8dc716 estão corretos e vivem na entrada SAN2-2); o
  defeito é de **localização**. A explicação certa do #364 existe — foi para o `release.summary`
  (apenso de 1801 chars) e para `blocks_completed.note`.

**Ordem que vou seguir** (a mais barata primeiro nas erratas de texto, o KPI por último porque é o
que a bateria tem de validar depois): §3 C2-A1 → §4 C2-A2 → §5 C1-A1 → §6 briefing → §1/§2 KPI
(entrada nova + `backfill_note`) → provas.

**Limites que aceitei:** toco apenas `Kpis/*`, os três diários de medição, o briefing e este
arquivo. Não toco `src/`, `tests/`, `scripts/`, `.github/`, contratos, `pendencias.md`, nem os
arquivos de voto/evidência das cadeiras. **Não commito.** `erp-postgres`/`erp-redis` não recebem
nem leitura.

---

## Passo 1 — **C2-A1** (atenção): a conclusão do **E-2** era falsa · FEITO

**Arquivo:** `agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-2-bateria-barata.md`

**O que estava escrito** (fim do E-2, antigas l.409-411):

> *"Publicar/conferir o par — e não só o total — é o que torna a bateria barata reproduzível por
> terceiro."*

**Por que é falso:** a cadeira C2 **executou o contraexemplo** — **três** listas de 6 arquivos
distintas produzem `(6, 37)` (`lista6` 3/3 · `lista6alt` 3/3 · `lista6alt2` 2/2, as três imprimindo
`6 arquivo(s) - 37 teste(s)`). Quem receber só `(6, 37)` continua sem saber qual das três rodou.

**O agravante que reli na fonte:** o contraexemplo já estava **impresso neste mesmo documento**, no
`§R.5`, três parágrafos acima — a saída do `recon.mjs` lista duas combinações e rotula a primeira
`[outra]`. O laço não foi fechado.

**Compatibilidade das duas contagens (conferida por leitura, não assumida):** o `§R.5` enumera **sob
o filtro** "contém as 4 vítimas nomeadas" e acha **2**; a C2 enumerou **sem** esse filtro e achou
**3**. `2 ⊂ 3` — não há divergência entre as cadeiras. E o filtro não salva a frase: bastava **uma**
segunda lista para derrubá-la, e o §R.5 já exibia essa segunda.

**O que fiz:**

1. **Não toquei a medição** (ela está certa: o `37` sozinho não identifica a lista; o par discrimina
   a lista-6 da lista-7). Preservei o parágrafo do discriminador, encerrando-o no que é verdadeiro —
   *"o par melhora sobre o total"*.
2. Apensei um bloco **`⚠ E-2 · ERRATA DA ERRATA`**, datado `2026-08-31`, atribuído ao achado
   **C2-A1**, com gravidade e escopo. Ele **cita a frase retirada na íntegra** antes de retirá-la
   (§A2 — errata datada, nunca reescrita silenciosa), publica o contraexemplo executado da C2, o
   auto-contraexemplo do §R.5 e a reconciliação `2 ⊂ 3`.
3. **Conclusão corrigida, com as palavras exatas do mandato:** o par é **NECESSÁRIO e
   INSUFICIENTE** — necessário porque o total sozinho nem fixa a cardinalidade; insuficiente porque
   cardinalidade + total ainda admitem ≥ 3 listas. **A receita reprodutível exige NOMEAR os 6
   arquivos**, que é o que o **§V.3 já faz** (os seis nomes, o par, N, forma, versão do Node, head).
4. **Deixei explícito que o ciclo 5 usa o §V.3, não o E-2** — e **emendei a observação O-2** na
   tabela do §V.5, que mandava apensar a E-2 ao critério do D29. Agora ela diz que o que se apensa ao
   D29 é o **§V.3 (a lista NOMEADA)**. Sem isso a correção ficaria pela metade: o defeito material
   não é a frase, é o **D29 herdar um critério que não pina a forma** — exatamente o que a C2
   registrou em `consequencia`.

**Atenuante que a C2 fez questão de registrar e eu preservei:** o §V.3 **já estava correto e
completo** ("não intercambiável"). Não precisou de uma vírgula.

**Não toquei:** a medição, o §R.5, o §V.3, nem os arquivos de voto/evidência das cadeiras.

---

> ## ⚠ TROCA DE INSTÂNCIA (2026-08-31)
>
> A instância que escreveu o Passo 0 e o Passo 1 **caiu por `server_error`**. Esta é a sucessora — mesmo
> papel (**quem conserta**, §C7.4-bis), mesmo worktree (`.claude/worktrees/san2-r`), mesma branch
> (`chore/san2-4a-medir-arnes`), mesmo head de partida `4199b92`. **Não recomecei nada:** conferi por
> **leitura do diff** o que já estava em disco (Passos 1 e 2) e segui do que faltava. Também **não votei,
> não medi o bloco e não escrevi nenhum dos três diários de medição** — a inelegibilidade do papel é
> herdada inteira.
>
> **Falta a fazer, na ordem executada:** Passo 3 (C1-A1, o `+78 %`) → Passo 4 (briefing, "11 observações")
> → Passo 5 (C3-A1, a entrada de KPI) → Passo 6 (C3-A3, o `backfill_note`) → Passo 7 (provas).

---

## Passo 2 — **C2-A2** (atenção): o censo dizia **4** gatilhos do sweep, e são **5** · FEITO PELO ANTECESSOR, CONFERIDO POR MIM

**Arquivo:** `agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-3-censo-roles.md`

O antecessor **executou** esta correção mas caiu antes de registrá-la aqui. Como a regra da junta
resiliente manda o sucessor **conferir o que está gravado, não confiar na promessa**, li o diff inteiro
(`git diff` do arquivo) antes de dar o passo por fechado. **Está lá, e está certo:**

1. A frase do corpo deixou de dizer *"alguma das **4** suítes"* com quatro nomes entre parênteses e
   passa a dizer *"alguma das **5** suítes"*, **nomeando as cinco em lista** — as quatro antigas mais
   **`tests/db-catalog-write-guard.test.ts`**.
2. Foi aposta uma **`⚠ ERRATA` datada `2026-08-31`**, atribuída ao achado **C2-A2** com gravidade
   `atenção` e escopo `dentro-do-bloco`, que **cita a contagem retirada**, publica o comando que fecha as
   cinco (`grep -rn "await createEphemeralRole(" tests/ src/ scripts/ | cut -d: -f1 | sort | uniq -c` →
   **5 arquivos, 8 chamadas**), e prova que **o arquivo não é novo** (último commit `f081b5d`, 2026-08-28,
   #359) — a omissão é da enumeração, não do terreno.
3. A errata **separa o que se move do que não se move**: a exclusão dupla e a consequência qualitativa
   ("rodar `rls-tenant-isolation.test.ts` sozinho não varre nada") **continuam verdadeiras com 4 ou com
   5**; o que estava errado é um **N publicado como enumeração completa** dentro da frase entregue ao 4b
   como **O-1**. E registra por que dói mais do que um número: o gatilho que faltava é justamente o
   **guard que existe para exercitar o sweep de propósito** — o lugar mais provável de a correção do 4b
   ser verificada.

**Conferência independente que fiz (não reexecutei o `grep` — está fora do meu escopo tocar `tests/`,
mas o §V.5 e a tabela do §F6.3 do próprio documento já listam as três chamadas):** as l.383/471/511 de
`tests/db-catalog-write-guard.test.ts` aparecem citadas, e a tabela de l.111-113 do mesmo diário já
mencionava esse arquivo por outros motivos (`reason` da allowlist, `vid_rls_test_`, corte de 60 min) —
ou seja, **o arquivo já estava sob os olhos do censo** quando a contagem foi escrita. Isso reforça a
leitura do antecessor: falha de enumeração.

**Não toquei:** nada neste arquivo. O passo estava completo.

---

## Passo 3 — **C1-A1** (baixa): o `+78 %` que não deriva de nenhum pareamento · FEITO

**Arquivo:** `agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-1-authority-portal.md`

**O que estava escrito** (duas ocorrências, l.129 no corpo da F2 e l.229 na coluna "Como ler" da tabela
do §1 do Fecho): *"2 637–2 765 ms → 3 902–4 797 ms, **+48 % a +78 %**"*.

**Recomputei a aritmética eu mesmo**, dos seis números publicados nas tabelas §F1/§F2 (F1 `n=30 · mín
2637 · máx 2765 · média 2703,83`; F2 `n=10 · mín 3902 · máx 4797 · média 4375`) — não copiei os
resultados da C1, justamente para o achado ter uma segunda medição independente:

```
node -e "..."   →   min<->min 48.0 · max<->max 73.5 · media<->media 61.8
                    maxF2/minF1 81.9 · minF2/maxF1 41.1 · maxF2/mediaF1 77.4
                    (maxF1 que faria 78% fechar: 4922 ms)
```

**Seis** pareamentos possíveis, **nenhum dá 78** — e o meu `4922 ms` bateu com o que a C1 tinha achado
por caminho próprio. O `+48 %` **é exato** (mín↔mín, +47,97 % arredondado), o que denuncia a forma do
erro: o par que o `48` inaugura é o **homólogo**, e o homólogo do topo é **+73,5 %**.

**O que fiz** — o mandato admitia duas saídas (corrigir o número **ou** declarar o pareamento) e eu fiz
**as duas**, porque intervalo sem pareamento declarado é irreproduzível mesmo com os extremos certos:

1. As **duas** ocorrências passam a `+48,0 % a +73,5 %` e **declaram o pareamento** — "percentis
   homólogos (mín F2 ÷ mín F1 e máx F2 ÷ máx F1)" no corpo, "mín↔mín / máx↔máx" na tabela. Ambas
   apontam para a errata.
2. Apus o **§8 · `⚠ E-1 · ERRATA`**, datado `2026-08-31`, atribuído a **C1-A1** com gravidade `baixa` e
   escopo `dentro-do-bloco`, que **cita a frase retirada na íntegra antes de retirá-la** (§A2 — errata
   datada, nunca reescrita silenciosa) e publica a **tabela dos seis pareamentos** com a conta de cada
   um, para que o próximo leitor não precise refazer o que eu refiz.
3. Registrei **o que a errata não move**, que é o essencial: sob a leitura **mais conservadora possível**
   (`mín F2 ÷ máx F1`) a F2 ainda é **+41,1 %** mais lenta, e os dois intervalos são **disjuntos** —
   `[2637, 2765]` e `[3902, 4797]`, com folga de **1 137 ms**. A contenção segue provada. As taxas
   (**F1 0/30 · F2 0/10 · F3 483/120 000**), a causa nomeada e a previsão 20 000/20 000 ficam intocadas.
   É defeito de **relato**, não de medição — por isso a C1 aprovou com gravidade `baixa`.

**Não toquei:** as tabelas §F1/§F2, os N, as taxas, o §F3, nem os arquivos de voto/evidência.

---

## Passo 4 — **erro do orquestrador**: as "11 observações" do briefing · FEITO

**Arquivo:** `agent-orchestration/omega/juntas/BRIEFING-SAN2-4a.md`

**O que estava escrito** (duas vezes — l.10 no §1 e l.25 no mandato da C3): *"O bloco deixa **11
observações nomeadas** para o 4b"* e *"E as **11 observações** estão nomeadas para o 4b, sem
conserto?"*.

**Por que é defeito, e de quem é:** o `11` foi publicado **como se fosse a contagem** e **não deriva de
nada registrado**. A C3 mediu por rótulo distinto e achou **12**; o `grep "11 observ|onze observ|11
achado"` nos três diários e no plano volta **vazio** — o número nasceu no briefing e em lugar nenhum
mais. O escopo é **`pre-existente / fora do bloco`** com evidência: o briefing está **untracked**
(`?? ` no `git status`, conferido por mim) e **não integra o diff do PR** — foi escrito pelo
orquestrador para a junta, não pelo bloco.

**O que mais me incomodou, e registrei:** o `11` **fecha** — mas por uma regra **tácita**, "as
observações **com dono nomeado**", que ninguém escreveu. Número que fecha por acidente é pior que
número que não fecha, porque não convida ninguém a conferir.

**O que fiz — e o mandato pedia explicitamente "escreva de onde sai a contagem":**

1. O §1 passa a **12 (11 com dono)** e traz a **tabela de derivação**, contada por rótulo distinto:

   | Diário | Rótulos | Subtotal | Com dono |
   |---|---|---|---|
   | M1 | `OBS-1 OBS-2 OBS-3` | 3 | **2** (`OBS-3` sem dono) |
   | M2 | `O-1..O-4` | 4 | **4** (tabela "Sugestão de dono") |
   | M3 | `O-1..O-5` | 5 | **5** (coluna "Dono sugerido") |
   | | | **12** | **11** |

   E **nomeia qual é a 12ª**: `OBS-3` da M1, nota de método sem dono (a de que "N=10 tem 96,2 % de
   chance de sair verde com o defeito presente"). **As duas contagens são verdadeiras e medem coisas
   diferentes** — o que faltava era dizer **qual** o briefing publicava.
2. O mandato da C3 no §3 passa a citar as duas, apontando para a derivação do §1.
3. Apus o **§8 · `⚠ E-B1 · ERRATA do orquestrador`**, datado, com as **duas frases retiradas na
   íntegra**, o escopo com evidência (untracked + fora do diff), e o registro de que **nada do veredito
   se move** — a C3 aprovou os três itens, disse *"Nada falso no bloco"*, e o `12` só torna a frase
   **mais** favorável ao bloco (uma observação a mais nomeada para o 4b, não uma a menos).
4. **Corrigi a terceira ocorrência da mesma classe no mesmo arquivo:** o §2 repetia o `+48 % a +78 %`
   herdado da M1. Ficou **`+48,0 % a +73,5 %`** com o pareamento declarado, apontando para a errata
   **E-1**. Deixar o briefing propagando um número que a junta acabou de retirar seria consertar pela
   metade — é literalmente o defeito do Passo 3 sobrevivendo num segundo arquivo.
5. Nomeei **dono da classe**: a próxima passada do `inspetor-de-terreno-da-junta` — número publicado em
   briefing **sem derivação registrada** é insumo defeituoso, e o §C7.1-bis já o obriga a conferir os
   insumos antes de a junta começar.

**Não toquei:** o veredito, os mandatos das cadeiras além da citação do número, o protocolo P1–P6, nem
os arquivos de voto/evidência.

---

## Passo 5 — **C3-A1** (MÉDIA): a entrada de KPI do SAN2-4a, que não existia · FEITO

**Arquivos:** `Kpis/kpis-history.json` · `Kpis/kpis-latest.json` · `Kpis/app.js` (só a linha `FROZEN`).

**Por que é o achado mais material dos cinco, e por que só agora pôde ser feito:** o §1.6 e o §6.4 do
plano **exigiam** a entrada; ela não existia (`grep -c '"SAN2-4a"'` = **0** nos dois JSON, `kpis-latest`
ainda em `version "SAN2-3"`). Sem ela, o merge do #365 deixaria o painel **um merge atrás** — que é
**exatamente o defeito que o commit `83d0366` deste mesmo PR anuncia ter consertado**. E ela **não podia
ser escrita antes**: uma entrada de KPI publica os números das medições, e as três só fecharam com a
junta. Agora fecharam.

### 5.1 — O que medi antes de escrever (nada foi copiado do bloco anterior)

**Prova de que o PR não toca código** — as **três** pontas, não duas:

```
git diff --name-only main...HEAD -- src/ tests/ scripts/                → VAZIO (0 arquivos)
git diff --name-only main...HEAD -- (+ prisma/ migrations/ frontend/ mobile/ .github/) → VAZIO
git status --porcelain -- (os mesmos 8 caminhos)                        → VAZIO
```

É isso que autoriza `backend_tests`, `frontend_smoke_tests`, `flutter_tests` e
`backend_contract_tests_focused` a entrarem **CARREGADOS com marcador §C3.3** — e cada marcador **carrega
a sua própria prova**, não a genérica: o de `mobile/` cita o diff de `mobile/`, o de `frontend/` o de
`frontend/`, o de backend os três caminhos `src/ tests/ scripts/`.

### 5.2 — A contagem de execução real: o que este bloco **exerceu**

O bloco **não cria teste** (§1.7 do plano: teste novo seria conserto de arnês, que é o 4b). O que ele
executou foram **medições**, e é isso que a entrada publica, com N e forma tirados dos três diários:

| Forma | N | Resultado |
|---|---|---|
| M1·F1 — `run-backend-tests.mjs tests/authority-portal.test.ts`, máquina livre | **30 execuções** | 0 falhas, denominador constante 12, `ec=0` 30/30 |
| M1·F2 — idem sob starvation de CPU declarada (7 busy-loops) | **10 execuções** | 0 falhas; +48,0 % a +73,5 % de duração |
| M1·F3 — sonda sobre o `verifyPassword` real de `src/` | **120 000 iterações** | **483** capturas; previsão bateu 20 000/20 000 |
| M2 — bateria barata, 3 registros | **25 rodadas** | 0 `XX000`, 0 queda de denominador; `(6,37)` e `(7,37)` |
| M3 — censo do mecanismo | **17 rodadas** (10 F7 + 5 F8.3 + 2 F9) | 5/5 órfãs, 460 privilégios = 115×4 |

**Nenhuma delas move a contagem da suíte** — e a entrada **diz isso com todas as letras**, em vez de
deixar o leitor supor. O único número de suíte que este PR **exerceu de fato** é o do guard do painel:
`tests/kpi-dashboard-charts.test.ts` = **16/16/0/0**, **N=2**, a segunda execução **depois** do
`kpi-freeze` final — e esses 16 já estão **dentro** dos 2607.

### 5.3 — O que a entrada conta **que não fechou** (o mandato exigia; e é o que separa KPI de propaganda)

1. **O 68 continua CARREGADO.** É de **18/08**, treze dias atrás, e **não foi re-verificado** — contá-lo
   exigiria consultar `erp-postgres`, e o §5.2 do plano proíbe **qualquer** comando lá, inclusive
   leitura. O número de **hoje** é **desconhecido**, e "≥ 68" é **argumento, não medição**. A entrada
   registra também a receita da recontagem supervisionada e que a decisão **não é do 4a**.
2. **A segunda hipótese do 1/2 não foi decidida.** Sob 1/256, ver ≥1 falha em 2 execuções tem
   probabilidade **0,780 %**: ou o jurado teve azar de 1-em-128, ou **existe uma segunda contribuição
   que só aparece no arranjo de suíte inteira**. As medições **não decidem**, e o bloco **não podia**
   decidir (§3.1 do plano). A entrada diz que as formas **diferem** e que nada aqui refuta o vermelho
   original.
3. **O E-2 foi corrigido pela junta, não pelo bloco** — com as outras duas erratas da mesma passada (o
   4→5 do censo e o `+78 %`), nomeadas como defeitos **de relato**, que não movem taxa, N nem veredito,
   e corrigidas por agente que **não as achou** (§C7.4-bis).

### 5.4 — O que ficou intocado, por regra

- **`blocks_completed` 154**, na entrada **e** no cartão. Escrevi a condição, com o sujeito certo:
  *"sobe para 155 **SO QUANDO ESTE BLOCO (SAN2-4a, PR #365) MERGEAR**"* — a nota anterior dizia "o
  próximo bloco", que é ambíguo e foi o que produziu a defasagem que este PR consertou.
- **`mvp_demo` 99 % e `mvp_vendavel` 88 %** — o PR não move escopo de produto (não há uma linha de
  código nele), então §C3.4 não se aplica.
- **`pr`/`merge_commit`/`approved_head` `null` na autoria** (§C3.5 e §6.4-4 do plano). O PR **é** o #365
  e a junta **já** votou 3×0, e mesmo assim os três ficam `null`: gravar um `merge_commit` que ainda não
  existe é a mesma classe de mentira que o backfill existe para desfazer. O fato de o PR ser o #365 fica
  **em prosa** na `description`, onde é verdade sem fingir ser campo preenchido.
- **`notes` e `recent`** do `kpis-latest.json`: **não toquei**. Estão parados desde 01/08 e nenhum bloco
  SAN2 escreveu neles; abrir essa frente por conta própria seria mudar prática de registro sem junta.

### 5.5 — Forma da escrita (a armadilha do EOL, que o §C7.1-ter(c) nomeia)

Os dois JSON são **exatamente** `JSON.stringify(…, null, 2) + "\n"` **com CRLF** — conferi por
**round-trip byte a byte antes de escrever** (`raw === crlf(JSON.parse(raw))` → `true` nos dois).
Escrevi de volta **preservando CRLF**. Se eu tivesse gravado LF, o `core.autocrlf=true` esconderia a
troca do `git status` e o arquivo carregaria uma mudança de EOL invisível — a armadilha que já fabricou
uma pendência ALTA nesta rodada. **Resultado medido:** `kpis-history.json` **+12/−0** (append **puro**,
nenhuma entrada anterior tocada) e `kpis-latest.json` **14+/14−**, que são exatamente as **14 chaves**
que eu quis mover: `snapshot_date`, `version`, as 7 do `release` e os 5 `note` (as 4 métricas carregadas
+ `blocks_completed`). `Kpis/app.js`: **1 linha**, a `FROZEN`, **gravada pelo script, nunca à mão**.

---

## Passo 6 — **C3-A3** (BAIXA): o `backfill_note` que falava do PR errado · FEITO

**Arquivo:** `Kpis/kpis-latest.json`, chave `release.backfill_note`.

**O defeito, como a C3 o enunciou:** o campo carregava **byte a byte** o texto do backfill **anterior**
(o do **#363**) — `main` e `HEAD` **idênticos** ali. A C3 é explícita, e eu preservei a distinção porque
ela muda o conserto: **não é falso e não há contradição factual** (363 / `d283903` / `c8dc716` estão
corretos e vivem na entrada **SAN2-2** do history). O defeito é de **localização**: o §1.6 mandava este
PR aplicar o backfill do **#364**, e o campo que existe para explicá-lo continuou falando do anterior.

**O que escrevi**, com os valores do mandato: `pr 364` · `merge_commit c9fd3a1` · `approved_head 23d9227`
— e, principalmente, **por que** o `approved_head` é `23d9227`: é o head **JULGADO**, consignado na ata
`J-SAN2-3.md` l.4, **não** o `headRefOid 4083146` do GitHub. O delta `23d9227..4083146` é **um único
commit de registro puro** — 14 arquivos, **todos** em `agent-orchestration/`, **zero** em `Kpis/`,
`src/`, `tests/`, `scripts/` ou `.github/`. **Gravar 4083146 declararia que a junta aprovou um commit que
ela nunca viu.** Mesma lógica dos backfills do #362 (`4cd0867 != 55aa8a3`) e do #363
(`c8dc716 != e4926bd`).

**E não apaguei o #363 em silêncio:** o campo termina com uma **nota de errata datada** que diz o que
estava ali antes, que aquilo **não era falso**, e **onde** o backfill do #363 continua vivo. Sem essa
nota, quem procurasse o texto do #363 concluiria que ele foi perdido.

---

## Passo 7 — Provas, e a prova de que o guard **morde**

Todas executadas nesta instância, na ordem, com o exit code transcrito.

### 7.1 — O guard do freeze mordeu (o item que o mandato pede explicitamente)

Registro os **três** momentos, porque só os três juntos provam que o guard **discrimina** — um `--check`
verde no fim, sozinho, também sairia verde se o guard estivesse quebrado:

| # | Momento | Comando | Saída | `ec` |
|---|---|---|---|---|
| 0 | **Antes de qualquer edição** (linha de base) | `node scripts/kpi-freeze.mjs --check` | `em dia (snapshot 2026-08-30)` | **0** |
| 1 | **JSON editados, `app.js` ainda não** | `node scripts/kpi-freeze.mjs --check` | `a cópia congelada do app.js DIVERGE do kpis-latest.json` | **1** |
| 2 | Freeze | `node scripts/kpi-freeze.mjs` | `reinjetada (snapshot 2026-08-31, 63940 bytes)` | 0 |
| 3 | **Depois do freeze** | `node scripts/kpi-freeze.mjs --check` | `em dia (snapshot 2026-08-31)` | **0** |
| 4 | Após a 2ª edição (a contagem real do kpi-charts) | `--check` → freeze → `--check` | `DIVERGE` → `reinjetada (64167 bytes)` → `em dia` | **1** → 0 → **0** |

O `ec=0` da linha 0 é o que dá sentido ao `ec=1` da linha 1: o guard estava **verde** e ficou
**vermelho por causa da minha edição**, não por já estar quebrado. E a linha 4 mostra que ele morde
**toda vez** — mordeu de novo no segundo ciclo, sem que eu precisasse induzi-lo.

### 7.2 — O resto da bateria

| Prova | Comando | Resultado | `ec` |
|---|---|---|---|
| Guard do painel | `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **16 tests · 16 pass · 0 fail · 0 skipped · 0 cancelled**, **N=2** (a 2ª após o freeze final) | 0 |
| Sintaxe do painel | `node --check Kpis/app.js` | limpo | **0** |
| JSON parseando | `node -e` lendo os dois | `kpis-history.json` **148 entradas** (era 147) · `kpis-latest.json` `version SAN2-4a` | **0** |
| Whitespace | `git diff --check` | limpo | **0** |

### 7.3 — Conferência por **parser**, não por olho (§6.4-4 do plano)

```
SAN2-3  : pr 364 · merge_commit c9fd3a1 · approved_head 23d9227 · blocks 154
SAN2-4a : pr null · merge_commit null · approved_head null · blocks 154 · 2026-08-31
          backend 2607/2609 · smoke 1126/1126 · flutter 864/864
latest  : SAN2-4a 2026-08-31 · release 3× null · status published_per_pr
summary == description ? true      (o painel e o history contam a MESMA história)
backfill_note fala do #364 ? true  · ainda abre falando do #363 ? false
mvp_demo 99 · mvp_vendavel 88 · blocks_completed 154   (os três INTOCADOS)
marcador [SAN2-4a: em backend_tests / frontend_smoke_tests / flutter_tests /
          backend_contract_tests_focused → true nos quatro
```

### 7.4 — Escopo e limpeza

`git status --porcelain` fecha **exatamente** na lista autorizada: `Kpis/app.js`,
`Kpis/kpis-history.json`, `Kpis/kpis-latest.json`, os **três** diários de medição, mais o briefing e
este diário (untracked). `git status --porcelain -- src/ tests/ scripts/ .github/` sai **VAZIO** — o
proibido segue intocado, medido **depois** de todo o trabalho e não só antes. **Não commitei.**
`erp-postgres`/`erp-redis` não receberam nem leitura; nenhum container foi criado ou parado; nenhuma
porta alocada. **Limpeza §C5:** os dois scripts `.mjs` de edição de JSON viveram **fora do repositório**,
no scratchpad da sessão, e morrem com ela — nenhum arquivo temporário foi criado dentro da árvore.

---

## Estado final

Os **cinco achados da junta do #365** e o **erro do orquestrador** estão fechados: **C2-A1** e **C2-A2**
pelo antecessor (conferidos por mim, por leitura do diff), **C1-A1**, **C3-A1**, **C3-A3** e o briefing
por esta instância. **Nenhum conserto de código** foi aplicado — o diff de `src/`, `tests/`, `scripts/`
e `.github/` continua **vazio**, que é a natureza do 4a. O que mudou foi **registro**: três erratas
datadas, uma entrada de KPI que faltava e um `backfill_note` que falava do PR errado.
