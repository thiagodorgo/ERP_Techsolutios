# J-B-O6R-REG — junta do bloco de sincronização de registro (2026-08-29)

**VEREDITO: APROVADO por maioria — 3 APROVADO · 0 REPROVADO · 0 voto perdido contado.**
Nenhum veto efetivo. **10 achados, ZERO `bloqueia`.**

---

## 1. Identificação e a cadeia de hashes (achado T-1 / N1 / REG-DIFF-2)

Três registros diferentes nomearam heads diferentes, e a ata consigna **todos**, porque sem isso o porteiro
pós-merge não consegue casar `approved_head` com voto nenhum:

| Hash | O que é | Quem o usou |
|---|---|---|
| `757485c` | conteúdo da entrega | o briefing o nomeia |
| `8c00fab` | + o briefing | **terreno inspecionado** — o `LIBERADO COM RESSALVA` foi medido aqui |
| `b9058a7` | + emenda das ressalvas + `P-REG-S0-GUARD-FALSO-VERMELHO` | — |
| **`ee5ef03`** | + parecer do inspetor persistido | **head julgado pelas TRÊS cadeiras** |
| `630f224` · `77a27b7` · `9a7fef3` · `ff7e637` | registros de perda de jurado e votos | inertes para o mérito |
| `d481b75` | **correções exigidas por esta junta** (pós-voto) | head final |

**Delta entre o terreno inspecionado e o head julgado, medido:** três arquivos, todos papelada de junta — a
emenda do briefing, a pendência do falso-vermelho do S0 e o próprio parecer. São exatamente os artefatos que as
ressalvas do inspetor mandavam apensar (§A2). A cadeira de diff **não herdou** a liberação: remediu todas as
promessas centrais em `ee5ef03`.

**Branch:** `chore/o6r-reg-sync-359` · **base:** `origin/main` = `f081b5d` (#359).
**Quórum:** maioria de 3 (`D-JUNTA-ESCOPO-E-CALIBRACAO` §2 — não toca dinheiro, segurança, permissão nem perda
de dado). O inspetor **verificou essa classificação contra o diff real** antes de homologá-la.

---

## 2. As três perguntas do §C7.4-bis, respondidas por escrito

**(a) A composição cobre a competência que os achados exigem?** Sim, e o inspetor homologou as três cadeiras
por nome antes de existirem: **diff/escopo** (veto), **KPI/números**, **trilha/append-only** (veto). O teste é
o resultado: os dez achados se distribuem pelas três lentes sem sobreposição, e cada cadeira pegou o que
**só ela** podia pegar — a de diff achou a citação errada da fonte da regra, a de trilha achou o off-by-one dos
snapshots, a de KPI achou a frase que sobreviveu viva no corpo do `kpis-history.md`. Nenhuma das três teria
achado o achado da outra.

**(b) Quem achou é quem consertou?** **Não, e isso foi preservado com rigor.** Os dez achados vieram de três
jurados de identidade nova; **as correções foram todas do orquestrador**, que não votou. E o orquestrador está
**inelegível para votar por dois motivos declarados**: escreveu o diff **e** achou o item 6 (a troca de status
B-04/B-05). Por isso o inspetor impôs a R4 — a cadeira de trilha teve de verificar aquele item **por contraprova
independente**, nunca pelo texto do orquestrador —, e ela o fez: foi ao `roadmap.blocos` da **base**, ao
`production_readiness` da **base** e ao título real do merge `a8901ff`, e ainda checou que o oráculo é
**bit-a-bit igual** entre base e head, isto é, que ninguém ajustou o oráculo à narrativa.

**(c) O planejador estava usando dado podre?** Não houve planejador — e essa é a divergência que o bloco
declarou **contra si mesmo** (`P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE`), submetida à junta com a instrução
explícita *"se acharem que é `bloqueia`, reprovem"*. A cadeira de diff **decidiu o mérito** e ratificou como
pontual, com fundamento medido: o antecedente da regra não ocorre (zero byte de código), o precedente é maciço
(cinco PRs de registro mergeados sem plano) e o **raio de dano** é uma única adição de iniciativa própria — o
`.gitignore` de duas linhas —, provada inerte pela forma forte (`git ls-files -z | git check-ignore --stdin -z`
→ zero). Ver §5.

---

## 3. Os votos

| # | Cadeira | Veredito | Achados | `bloqueia` |
|---|---|---|---|---|
| 01 | diff e escopo (veto) | **APROVADO** | 3 | 0 |
| 02 | KPI e números | **APROVADO** | 3 | 0 |
| 03 | trilha e append-only (veto, **suplente**) | **APROVADO** | 4 | 0 |

Votos verbatim em `votos/B-O6R-REG/`. **Todo achado declara `escopo`** — nove `dentro-do-bloco`, e o décimo
(o conflito das duas listas da bateria barata) é `pre-existente` com evidência de origem, achado **pós-voto**
pelo orquestrador e por isso registrado como pendência em vez de fechado (§6).

### O que cada cadeira provou, e não apenas leu

**Diff/escopo.** O diff de código contra a base sai com **zero bytes** — não "sem mudança relevante",
literalmente vazio. Nenhum modo diferente de `100644` (portanto nenhum symlink nem submódulo se disfarçando de
documento), nenhum binário, nenhum `D`/`R`. Foi além do exigido: **reparseou o `FROZEN` do `app.js` e comparou
com o `JSON.parse` do `kpis-latest.json`** — mesma estrutura, logo o congelado foi **gerado**, não digitado, que
é a armadilha que o próprio comentário do arquivo nomeia.

**Trilha/append-only.** O `decisoes.md` da `main` é **prefixo estrito byte-a-byte** do novo: mesmo `sha256` nas
1545 primeiras linhas, zero linhas de remoção, e o blob que chegou é **o mesmo blob** de `demo/investidor` — sem
reescrita no transporte. **Nenhuma decisão do dono foi perdida.** O conjunto de IDs de pendência não perdeu nada
(`comm -23` vazio) e as dez linhas removidas estão todas contabilizadas: seis são o par de status B-04/B-05
sendo **movido**, quatro são a canônica 1 errada, substituída com o texto antigo citado verbatim dentro de um
bloco `> CORRIGIDO`.

**KPI/números.** Reexecutou a bateria inteira em vez de aceitar a palavra do bloco: **16/16**, **6/6**, freeze
"em dia", `node --check` ec=0 — e somou por folga `npm run check` ec=0 e `git diff --check` limpo, que
**nenhuma outra cadeira havia medido**. Conferiu o backfill **contra o git, não contra a ata**: `f081b5d` é
`origin/main` e o squash do #359, `d4cf978` é o head que a ata do ARNES declara julgado, e as árvores de
`0c37fa2` e `f081b5d` são **o mesmo objeto** (`87c7323`).

---

## 4. Os dez achados

| id | cadeira | gravidade | escopo | o quê |
|---|---|---|---|---|
| REG-DIFF-1 | diff | `ajuste` | dentro | a pendência da divergência citava a frase como verbatim do `CLAUDE.md` §C7; ela vive no frontmatter do agente |
| REG-DIFF-2 | diff | `nota` | dentro | três hashes na junta, não dois |
| REG-DIFF-3 | diff | `nota` | dentro | divergência de processo **ratificada** como pontual, com raio de dano medido |
| A-1 | KPI | `ajuste` | dentro | **`piso 0` sobreviveu vivo** em `kpis-history.md:122`, no arquivo que o bloco editou |
| A-2 | KPI | `ajuste` | dentro | as três métricas carregadas sem marcador deste bloco; `backend_tests` afirmava N=10 "sobre o código final deste PR" |
| A-3 | KPI | `nota` | dentro | "29 registros" não reproduz por comando: são 30 no diff, 28 reconciliados |
| T-1 | trilha | `nota` | dentro | a ata precisa consignar a cadeia inteira de hashes |
| T-2 | trilha | `nota` | dentro | a reconciliação **não é total**: `P-GOV-MAIN-SEM-PROTECAO` segue só na `demo/investidor` |
| T-3 | trilha | `nota` | dentro | o CRONOGRAMA publicava **142** snapshots numa coluna "Hoje" com **143** no history do mesmo commit |
| T-4 | trilha | `nota` | dentro | declaração do **não medido**, para não virar aprovação por silêncio |

**Todos corrigidos em `d481b75`**, com o texto original preservado e datado onde era registro histórico (§A2).

### O achado que mais importa, dito sem maquiagem

**A-1 é o bloco cometendo, contra si, a classe que existia para exterminar.** O `B-O6R-REG` editou o topo do
`Kpis/kpis-history.md` anunciando que a frase "piso 0" fora corrigida — e **não varreu o corpo do próprio
arquivo**, onde ela sobreviveu viva 98 linhas abaixo. Pior: marcou `P-ARNES-REGISTROS-DEFASADOS-NA-MAIN` como
**FECHADA** sem alcançá-la. Declarar fechado o que a execução mostra aberto é exatamente o defeito que o
porteiro nomeou no #359 e que este bloco nasceu para consertar. A pendência ganhou **errata de fechamento**
registrando isto por inteiro; releitura não pegaria — foi execução (`grep` sobre o arquivo inteiro) que pegou,
o que é mais uma evidência a favor da `D-JUNTA-SEPARACAO-DE-PAPEIS`.

---

## 5. A decisão da junta sobre a divergência de processo

O bloco foi implementado **sem plano do `planejador-mestre`** e declarou isso contra si antes de qualquer voto.
A cadeira de diff/escopo, a quem o briefing atribuiu o mérito, **ratificou como divergência pontual e não
reprovou**, por três razões medidas:

1. **O antecedente da regra não ocorre** — a norma protege contra escopo não planejado e defeito reintroduzido
   *em código*, e o diff de código é de **zero bytes**. Punir um bloco por não planejar código que ele
   comprovadamente não escreveu é formalismo sem objeto tutelado.
2. **O precedente é maciço** — ao menos cinco PRs de registro/backfill mergeados na `main` (#358, #351, #345,
   #344, #315) e **nenhum** plano de bloco de registro entre os 20 arquivos de plano rastreados. A regra tal
   como escrita é violada por **todo** bloco de registro que este repositório já fez.
3. **O raio de dano foi quantificado, não suposto** — das 41 alterações, as quatro ressalvas vêm do parecer
   **ex-ante** do porteiro (outro agente, antes do diff) e cronograma/`PROJECT_MEMORY` são instrução do dono
   (§A1.1); a **única** iniciativa própria fora dessa lista fechada é o `.gitignore` de duas linhas, provado
   inerte de forma exaustiva.

**A junta endossa a recomendação (b) da própria pendência:** a carve-out para blocos sem diff de código deve ser
**escrita** no contrato e entrar na lista do §6 da `D-JUNTA-ESCOPO-E-CALIBRACAO` — *"regra que todo mundo viola e
ninguém aplica corrompe as regras que importam"*. A junta registra a favor do bloco que ele **não se
auto-anistiou**: `CLAUDE.md` e `AGENTS.md` ficaram intocados e a correção foi **recomendada à junta** em vez de
aplicada pela própria mão.

---

## 6. Pendências que esta junta abre ou mantém

| Pendência | Dono |
|---|---|
| `P-REG-S0-GUARD-FALSO-VERMELHO` — o `--check` do espelho dá falso-vermelho em **todo checkout fresco no Windows** | próximo bloco que puder tocar `scripts/` |
| `P-REG-BATERIA-BARATA-DUAS-LISTAS` — **duas listas contraditórias** da bateria barata na `main`, ambas declarando denominador 37 | `B-O6R-02` ciclo 5 |
| `P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE` — ratificada como pontual; a carve-out fica para o contrato | junta de contrato |
| `P-GOV-MAIN-SEM-PROTECAO` — **não** reconciliado; segue só na `demo/investidor` (T-2) | workstream de governança |

O `P-REG-BATERIA-BARATA-DUAS-LISTAS` foi achado pelo orquestrador em varredura **pós-voto** e **não foi revisto
por esta junta** — está declarado como tal, com escopo `pre-existente` provado (`git show f081b5d` já o contém),
e **não foi consertado**: decidir qual lista é a certa exige executar a bateria, e quem acha não conserta.

---

## 7. A junta perdeu três jurados por infraestrutura — e isso é uma classe

**3 quedas em 5 disparos**, duas na mesma cadeira. A regra R2 do inspetor foi aplicada sem exceção: **voto
perdido não conta**, suplente de identidade nova **re-executa o mandato inteiro**, e a junta **não fecha com
menos de 3 votos**. O titular de trilha chegou a produzir um parcial **favorável** à entrega; ele foi
explicitamente marcado como **não-insumo** para o suplente, porque herdar um parcial a favor colocaria o
suplente já convencido do ponto que lhe cabe atacar.

**A causa parece medida, não aleatória:** as duas cadeiras que morreram no início tinham mandatos de **6 itens
com execução de teste embutida**; a que completou com folga tinha os itens mais baratos. Cadeira grande é a que
morre. O terceiro disparo foi encurtado a **4 itens em sequência fixa**, com ordem de emitir o voto ao terminar
— e completou, medindo mais do que os dois anteriores juntos. Precedente: a junta do ciclo 4 do `B-O6R-02`
perdeu **quatro** cadeiras pela mesma causa em 26/08. Fica a recomendação: **cadeira de junta deve ser
dimensionada como fatia de bloco — se não cabe num mandato curto, são duas cadeiras.**

---

## 8. Terreno

`inspetor-de-terreno-da-junta`, 1ª passada: **`LIBERADO COM RESSALVA`** (R1–R6 + N1), parecer em
`votos/B-O6R-REG/00a-`. Mediu por conta própria o diff vazio, o `.gitignore` sem rastreado ignorado, o
`app.js` de uma linha, o povoamento fora, a ausência de junction e o baseline `npm run check` ec=0 — e
**investigou antes de classificar** o vermelho do S0, descobrindo que era bug do próprio guard e não
divergência do espelho. Sem essa investigação, a junta teria começado com 22 falsos achados ou teria sido
bloqueada sem motivo.

---

**Merge autorizado** (§C7.1: verde da junta = merge). Segue para PR e, após o merge, para o
`porteiro-pos-merge`, que decide o start da próxima demanda.
