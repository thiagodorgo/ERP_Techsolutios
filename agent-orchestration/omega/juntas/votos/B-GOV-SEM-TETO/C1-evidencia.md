# VOTO-394-C1 — jurado-semteto-c1-fidelidade-transcricao — 2ª INSTÂNCIA

papel: C1 — fidelidade da transcrição · modelo: Opus 5.5 (claude-opus-5-5; o corpo fixa `model: opus`) · md5 EOL-neutro do corpo aplicado: 7a676a2fb44be53999d23471a4abd23c (C:/Users/AMP/w-teto/.claude/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md, 0 CR; e o MESMO md5 no blob `git show 7ad08690:.claude/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md`). Espelho `.agents/` do corpo: md5 7afdcca0ac9835a87341fcc3976c7821 (difere; matéria da C2/C3, não li como defeito meu).

2ª instância: a 1ª caiu sem veredito. Li o parcial dela (`parcial-queda-1207/VOTO-394-C1.md`, 2,3 KB) SÓ como roteiro (P3): ele contém apenas terreno; re-executei cada comando dele (abaixo) e bate. Nada herdado como fato.
Leitura de outras cadeiras: NÃO abri VOTO-394-C2.md, VOTO-394-C3.md, nem nada c2-*/c3-*/jst2/jst3/stc2 antes de gravar este voto.
Escrita: nenhuma no repositório. Único arquivo persistente = este. Cópias de trabalho/mutação em $SCRATCH/c1-394-work/ (descartadas no fim).
Desvios do corpo, por ordem do orquestrador (declarados): worktree `C:/Users/AMP/w-jst1` (o corpo diz `w-stc1`); evidência + voto (JSON ao fim) neste arquivo do scratchpad (o corpo diz `votos/B-GOV-SEM-TETO/c1-*`).

## Esqueleto (P2)
- Item 1 (citação): MEDIDO — concluiu (vermelho-controle nos dois lados); 1 achado `nota` (C1-N1) + 1 achado `nota` em insumo (C1-N2)
- Item 2 (nem mais): MEDIDO — concluiu (mutação do corpo isolada e N+1; mutação NOVA N1a/N1b vira a classe); 0 derivação vestida, 0 contradição; 1 ajuste (C1-A1) + 4 nota
- Item 3 (nem menos): MEDIDO — concluiu (M3 isolado × §C7.5 INDEPENDENTE; mutação NOVA N2a/N2c, que furou e fez consertar o MEU gerador); 0 CONDICIONADA; 1 ajuste (C1-A2) + 1 nota pre-existente (C1-N7)

## Terreno (medido)
- `gh pr view 394 --json headRefOid` = 7ad08690bad5e9cbc4d34fe6905b14c6ac634046 · `git ls-remote origin refs/heads/docs/sem-teto-auditoria-no-3` = 7ad08690bad5e9cbc4d34fe6905b14c6ac634046 → coincidem. Objeto do inspetor `7ad08690` → `git rev-parse 7ad08690^{commit}` = o mesmo 40 hex. **Head NÃO andou (objeto == head).** O diff objeto→head é vazio por IDENTIDADE de SHA; `git diff --name-only <obj> <head> -- CLAUDE.md AGENTS.md decisoes.md` → vazio; controle de pathspec: o mesmo comando sobre `<merge-base> <obj>` volta os 3 arquivos (logo o pathspec não é cego).
- `git fetch origin` ec=0 · `origin/main` = fc3363e38aabd77f54e6b53034128182f8000571 = `git merge-base origin/main 7ad08690` = `fc3363e3^{commit}`.
- Ramo: 3e92b2b8 (texto D-SEM-TETO) · 43b37e4d (plano, briefing, corpos) · dd79c96f (emenda) · 7ad08690 (KPI). `git diff --name-status MB OBJ` = 21 arquivos (lista no log).
- Worktree próprio: `git worktree add --detach C:/Users/AMP/w-jst1 7ad08690…` ec=0 (não existia antes; `w-stc1` também não) · `test -f C:/Users/AMP/w-jst1/.git` ec=0 · HEAD = 7ad08690….
- Blobs por `git show` (objeto e merge-base) de CLAUDE.md, AGENTS.md, decisoes.md + plano + briefing (objeto). CR (python 'rb'): **0** em todos → âncoras LF válidas.
- Resíduo alheio (só reportado): worktrees w-devs2, w-devs393, w-devt393, w-e4 (E4 rodando), w-jst2, w-mandato, w-teto, .claude/worktrees/{b04a,b11,gov-descuido,gov-elenco}; no scratchpad: `c1-jst/` (da 1ª instância C1 — não criei, não apago), `jst3/`, `stc2/`, `c3-394-*` (de outras cadeiras).
- Base viva (5432/6379): nenhum comando meu abre conexão; sem Docker; sem npm ci.

## Item 1 — A citação: toda ocorrência, byte a byte e por tokens  [P1]

**Cadeia de custódia usada:** o literal do corpo (l.28 do blob `.claude/…/jurado-semteto-c1-…md` em 7ad08690), que o orquestrador transmitiu à fábrica. Conferi por script que ele é **byte-idêntico** à l.28 do corpo `.claude`, à l.34 do espelho `.agents`, ao bloco "VERBATIM" do briefing (l.62–63) e ao de "palavras cruas" do plano (l.125–126) — juntando as linhas e tirando o `> ` de continuação: `byte-substring-do-literal=True` nos dois. **Uma só versão das palavras do dono em circulação.** Não tenho a mensagem original; não autentico, confronto.

**Comando.** `git diff -U0 fc3363e3 7ad08690 > diff-U0.txt` (3382 linhas; 21 arquivos; 3157 linhas adicionadas) + blobs `git show 7ad08690:{CLAUDE.md,AGENTS.md,decisoes.md,plano,briefing}`; `python item1.py` / `item1-diff.py` (NFKD, sem marcas combinantes, minúsculas, sem pontuação, espaço colapsado; seleção = linha com ≥2 de 7 marcadores; citação = trecho entre aspas `"`/`“”` do parágrafo, 15–400 chars, com ≥2 marcadores; `difflib.SequenceMatcher(autojunk=False)` sobre tokens; CONTEÚDO = op bruta que a lista declarada não explica). ec=0 em todos.

**Ocorrências nas linhas adicionadas do diff (≥2 marcadores): N=22** — 8 nos dois espelhos do meu próprio corpo (literal/tabela D; fora do texto julgado), 1 CLAUDE.md:436, 1 AGENTS.md:464, 3 decisoes.md:2635–2637, 5 briefing (62,63,69,70,78), 4 plano (125,126,140,159). No texto inteiro dos três arquivos julgados no objeto: **só** decisoes.md:2635–2637, CLAUDE.md:436, AGENTS.md:464 (nenhuma fora do diff).

| arquivo:linha (objeto) | rótulo | citação | byte-substring do literal | ops brutas (tokens) | CONTEÚDO |
|---|---|---|---|---|---|
| decisoes.md:2635–2637 | "O que o dono decidiu, **nas palavras dele**" | literal inteiro (D1–D6), normalizado | não | 1: `replace [gantir] → [garantir que]` | **0** com a lista declarada; **1** (`insert que`) só com a lista estrita |
| CLAUDE.md:436 | "A razão do dono, **nas palavras dele**" | só D6: "se está encontrando erro está tudo certo." | não (acentos, ponto) | 0 | 0 |
| AGENTS.md:464 | idem | idem | não | 0 | 0 |
| briefing:62–63 | "VERBATIM" | literal inteiro | **sim** | 0 | 0 |
| plano:125–126 | "Palavras cruas" | literal inteiro | **sim** | 0 | 0 |
| plano:159 · briefing:78 (T-11) | "o dono cobriu" | "está tudo normal **→** continuaremos" | não | 1: `delete [e]` | **1** |

**Lista DECLARADA de correções (cada item = palavra do dono trocada pelo transcritor, listada, não absorvida):** (1) `gantir → garantir` — digitação; (2) `∅ → que` em "garantir [que] está" — completude gramatical, **não** tipográfica em sentido estrito; declaro-a e publico a conta nos dois modos. Tudo o mais (três/tres, está/esta, orquestração, `,`→`;`, maiúscula, ponto final) **some sob a normalização**.

**Veredito parcial — sem operação de CONTEÚDO em trecho apresentado como palavras do dono no texto julgado.** A citação parcial de CLAUDE/AGENTS (só D6) não muda o sentido do omitido (D6 é frase autônoma de razão no literal). As ocorrências do diff não discordam entre si em conteúdo.

**Achados do item 1:**
- **C1-N1 · `nota` · `dentro-do-bloco`** — decisoes.md:2635–2637 (e CLAUDE:436/AGENTS:464) apresentam sob "nas palavras dele" um texto **normalizado** (duas trocas de palavra — `gantir→garantir`, `∅→que` — e acentuação), sem marca inline de normalização; a normalização só está declarada **por referência** (emenda l.2678–2679 e l.2698 (medidas por grep -n) → plano §2 T-01). Sentido intacto (0 CONTEÚDO). Propriedade ausente: *a citação rotulada "nas palavras dele" não se distingue, no próprio lugar, da forma crua — difere dela em grafia e numa palavra gramatical, não em conteúdo.*
- **C1-N2 · `nota` · `dentro-do-bloco` (insumo acrescentado por este PR: plano/briefing são arquivos novos do diff)** — plano:159 e briefing:78 atribuem ao dono ("o dono cobriu") a paráfrase *"está tudo normal → continuaremos"*: `delete [e]` = 1 op de CONTEÚDO. No literal, "continuaremos" é **coordenado** a "faremos uma auditoria … para garantir que está tudo normal" — não condicionado a "normal". A seta o torna condição, e é assim que o plano o usa ("o ramo 'não está normal' é do transcritor"; "alternativa fiel possível: reportar ao dono"). O verbatim fica correto duas linhas acima; o **texto julgado não carrega** a condicional (CLAUDE:432–435 continua nos dois ramos). Reportado, não escolho: *uma versão do "continuaremos" que o condiciona circula no insumo da junta como coberta pelo dono.*

**Vermelho-controle (rodado, `item1-mut.py`, cópia em `$SCRATCH/c1-394-work/entry.*` da entrada `D-SEM-TETO-AUDITORIA-NO-3` extraída por parse — l.2633–2738, 106 linhas, 0 CR):**
- **M1a** `continuaremos → pararemos` (1 ocorrência; `diff pristino mutante` não-vazio: `5c5 < continuaremos. … > pararemos. …`) → **CONTEÚDO=1** `('replace','continuaremos','pararemos')`. ✔ ficou vermelho.
- **M1b (controle do outro lado)** `orquestração → orquestracao` (2 ocorrências; diff não-vazio `4c4`) → **CONTEÚDO=0**. ✔ acento não vira conteúdo.
- Pristino → CONTEÚDO=0. **O item concluiu.**

## Item 2 — "Nem mais": enumeração GERADA, contra o critério do próprio contrato  [P1]

**Critério citado do objeto (`grep -n` no blob de CLAUDE.md @7ad08690):** l.518–520 (§C7.6-bis) — *"A linha do Astra é **fato dito pelo dono**; a do Sol é **derivada** … porque um contrato de execução não pode apresentar derivação como declaração (§A6)."*

**Extração por parse (`props.py`):** CLAUDE.md início `^4\. \*\*Protocolo de dificuldade` casa **1×** (l.413), fim = linha anterior a `^4-bis\.` (l.446) → **l.413–445**; AGENTS.md **l.441–473** (1×/1×); `decisoes.md` do cabeçalho `## …D-SEM-TETO-AUDITORIA-NO-3…` até `^## `/`^---$` → **l.2633–2738**. Item 4 CLAUDE × AGENTS: **idênticos** (md5 `db96a8bd950fa0ca4954ba8f22078393` nos dois; a comparação de espelho é da C2 — usei só para aplicar a mesma tabela aos dois).

**Regra de quebra publicada:** R1 início de bullet/item/parágrafo; R2 `(?<=[.?!])\s+` antes de maiúscula/aspas/`*`/crase/`(` (não depois de número de item isolado); R3a `;` e ` — ` quebram **se e só se** os dois segmentos vizinhos têm verbo próprio; R3b `→` idem, com o vizinho da esquerda limitado também por `:`. Verbo = infinitivo `(ar|er|ir|or)$` fora de uma lista de substantivos em -or, ênclise `-se/-lo/-la`, forma finita gerada por conjugação regular (3s/3p de 6 tempos) de **170 lemas publicados** em `props.py`, ou lista fechada de irregulares. **N por arquivo: CLAUDE item 4 = 26 · AGENTS item 4 = 26 · entrada decisoes = 79.**

**Classificador FAIL-CLOSED (`item2.py`):** cada proposição é chaveada pelo **md5 do próprio texto** (espaço colapsado, pontuação final removida); texto que mudou vira **NÃO CLASSIFICADA**. A classe de toda proposição que ACRESCENTA é **dinâmica**: **DERIVAÇÃO DECLARADA** só se **todas** as T-ids dela estão declaradas **no texto julgado corrente** — T-21…T-25 exigem o rótulo *"Elaborações NOVAS desta emenda … nenhuma é palavra do dono"* (decisoes l.2698) e o bullet `**T-2x**` depois dele; T-01…T-20 exigem a remissão *"numerado na sequência das T-01…T-20 do plano (§2)"* (l.2678–2679) **e** a linha `| T-xx |` no plano (arquivo rastreado do diff). Faltando = **DERIVAÇÃO APRESENTADA COMO DECISÃO**.

**Resultado no objeto (`python item2.py … pristine`, ec=0):** declaradas no texto corrente = **25/25**; **TRANSCRIÇÃO 7 · DERIVAÇÃO DECLARADA 43 · CONTEXTO 55 · DERIVAÇÃO APRESENTADA COMO DECISÃO 0 · CONTRADIÇÃO 0 · NÃO CLASSIFICADA 0** (tabela completa, 105 linhas com chave, D e T, em `$SCRATCH/c1-394-work/item2-pristine.txt`; CLAUDE 3 TRANS / 21 DECL / 2 CTX; decisoes 4 TRANS / 22 DECL / 53 CTX). Toda T-01…T-25 tem ≥1 proposição.

**Julgamento das 25 elaborações (fiel ao sentido × legislação que o dono não pôs):**

| T | proposições | veredito | por quê (contra D1–D6 literal) |
|---|---|---|---|
| T-01 | CLA-19; dec-03..05 | FIEL | 0 op de conteúdo (item 1); "que" gramatical, grafia |
| T-02 | CLA-02; dec-01,06,07 | FIEL | D1 tira a trava; D5 sem limite e D6 ("encontrar erro está tudo certo") não deixam teto; não restaura o de 5; paradas §C7.5/§C7.6-bis intactas — não diz "nunca parar" |
| T-03 | CLA-03; dec-08 | FIEL | corolário direto de D5+D6 |
| T-04 | CLA-03; dec-20 | FIEL-herança (não legisla) | "nas cadeiras que votaram" já vigia no gate: inspetor 3.1 *"votante do ciclo anterior"* (`git log -S` → d2839039, 2026-08-30); ver C1-N3 |
| T-05 | CLA-04; dec-09,26 | FIEL | "encontrar mais erro" = o bloco ainda não passa; `bloqueia` pre-existente não reprova (§C7.1-ter(a), decisão do dono) → não há ciclo 4 |
| T-06 | CLA-04; dec-09,26 | FIEL | "faremos" é compromisso; "auditoria … e continuaremos" = antes do 4 |
| T-07 | CLA-04; dec-02,09 | FIEL | D3 nomeia orquestração e junta |
| T-08 | CLA-04 | FIEL | método já vigente na casa (afirmação sem comando não conta) |
| T-09 | CLA-04..08 | FIEL (operacionalização necessária) | D4 exige conteúdo para "normal"; (b)(c)(e) já vigem (§C7.4-bis, §C7.1-bis); (a)(d) ficam dentro de orquestração/junta; nenhuma condiciona o continuar |
| T-10 | CLA-09 | FIEL | "faremos" + separação de papéis (decisão do dono 2026-08-17) aplicada ao auditor |
| T-11 | CLA-15,16 | FIEL, com ressalva | "CONTINUA-SE … não uma parada" = D5; "defeituosa → conserta primeiro" deriva de D4 ("garantir"); saída não garantida → C1-A2 |
| T-12 | CLA-19,20,21 | FIEL (interpretação sem força normativa) | "Achado é a junta funcionando" = D6; "deixando de ver os reais" é preocupação não verbalizada → C1-N5 |
| T-13 | CLA-22,23,24; dec-21..24 | **LEGISLAÇÃO** (declarada, neutra) | dever NOVO do orquestrador (relatar a cada ciclo) que nenhuma cláusula D pede; sem consequência; não condiciona o continuar |
| T-14 | CLA-25 | FIEL | D1 remove o "dentro dos dois ciclos" |
| T-15 | CLA-26; dec-20 | FIEL | o dono não tocou no §C7.5; "continuaremos" é sobre reprovação |
| T-16 | dec-11..15 | FIEL (argumento, não-normativo) | coerente com D6 |
| T-17 | dec-16..19 | NÃO VERIFICÁVEL (não-normativo) | estado epistêmico do dono afirmado como fato → C1-N6 |
| T-18 | dec-20 | FIEL (preservação) | ver C1-N3 |
| T-19 | dec-25,26 | FIEL | "vamos remover" (agora) + "se rodar três ciclos" pressupõe o bloco que parou no 2 chegar ao 3 |
| T-20 | CLA-01; dec-02 | FIEL | "no ciclo 3" (disparo) e "antes de abrir o 4" (momento) são as pontas de D2→D5 |
| T-21 | CLA-12,14; dec-46..51 | FIEL (instrumental) | faz o "faremos" acontecer antes do "continuaremos"; declarado "mecanismo do transcritor" |
| T-22 | CLA-13; dec-55..57 | FIEL | registro/forma |
| T-23 | CLA-07; dec-59..62 | FIEL | tira a dependência de ferramenta ausente; a pergunta segue sobre orquestração |
| T-24 | CLA-10,11; dec-65..68 | FIEL | coerente com D2 e §C7.1-ter(a); uma auditoria, como o dono disse; recorrência (M-05) vai ao dono |
| T-25 | CLA-17,18; dec-71,72 | FIEL, com ressalva | deriva de D4; saída sem executor/prazo → C1-A2 |

**Tally: 23 FIÉIS (2 com ressalva: T-11, T-25) · 1 LEGISLAÇÃO declarada e neutra (T-13) · 1 não-verificável não-normativa (T-17).**

**Diferenças de conjunto contra a enumeração do planejador (T-01…T-20 do plano §2 + T-21…T-25 da emenda):**
- **Achei e ele não listou:** (i) **dec-20 × CLA-03** — a entrada põe *"identidade nova nas cadeiras que votaram"* sob **"O que NÃO muda"**, enquanto o contrato **mudou** o texto do merge-base (*"identidade nova na cadeira que reprovou"*, CLAUDE.md@fc3363e3 item 4) → C1-N3; (ii) **dec-24** — *"é isso que a auditoria do ciclo 3 existe para examinar"* (a não-convergência): propósito atribuído à auditoria que D4 não diz e que nenhuma de (a)–(e) mede; a T-13 do plano aponta CLAUDE.md:432–435, que não contém a frase → C1-N4; (iii) **dec-22** *"a resposta do §C7.4 à reprovação é escalar"* — CONTEXTO descritivo não listado; (iv) **CLA-15** *"checagem de saúde da máquina, não uma parada"* — TRANSCRIÇÃO de D4+D5 (a favor do dono); (v) CLA-03 reafirma §C7.4-bis e o `R-*` (herança, não acréscimo). Nenhuma delas é vermelho.
- **Ele listou e eu não achei como proposição própria:** nenhuma — as 25 T têm proposição; T-20 é observação de consistência e T-15 preservação.

**Vermelho-controle do corpo (rodado):** cópia `item4.M2` do item 4 com `; se o ciclo 6 também reprovar, o bloco aguarda o dono` inserido **no meio** do bullet *"Depois da auditoria, CONTINUA-SE"* (âncora `e então o ciclo 4 abre. Quem` — 1 ocorrência; diff não-vazio) → `python item2.py … mut item4.M2 -` ec=0: **N 26 → 27**; a oração sai **isolada** como CLA-17 *«se o ciclo 6 também reprovar, o bloco aguarda o dono.»* → `NÃO CLASSIFICADA (fail-closed) · candidata a CONTRADIÇÃO`; a vizinha CLA-16 **mantém** a chave e a classe (não absorveu). Classifico a nova: **CONTRADIÇÃO** (restaura parada por contagem e espera pelo dono — nega D1 e D5). ✔ ficou vermelho.

**Mutação NOVA N1 (minha — ataca a separação declaração × derivação que o §C7.6-bis exige e que nenhuma mutação listada toca): some a DECLARAÇÃO, fica a proposição.**
- **N1a** `entry.N1a`: `nenhuma é palavra do dono` → `todas são palavra do dono` (1 ocorrência; `diff` 66c66) → declaradas **25 → 20**; **20 proposições viram DERIVAÇÃO APRESENTADA COMO DECISÃO** (CLA-07,10,11,12,13,14,17,18 + as da entrada nas T-21…T-25), 2 NÃO CLASSIFICADAS (o rótulo mudou). ✔
- **N1b** `entry.N1b`: some `T-01…T-20` da remissão (regex tolerante à quebra de linha; 1 ocorrência; `diff` 46,47c46) → declaradas **25 → 5**; **24 APRESENTADAS COMO DECISÃO** (ex.: CLA-02 *"Não há mais teto…"*). ✔
- O que provou: a classe DECLARADA do objeto **deriva da presença da declaração no texto**, não da forma da proposição — o mesmo contrato, sem a declaração no registro, estaria vestido de decisão.

**Achados do item 2:**
- **C1-A1 · `ajuste` · `dentro-do-bloco`** — No contrato operante (CLAUDE.md l.413–445 = AGENTS.md l.441–473), sob o cabeçalho *"(decisão do dono, 2026-09-27, `D-SEM-TETO-AUDITORIA-NO-3`)"*, **21 proposições de derivação** — **16** delas acrescentam ator/obrigação/condição/restrição (CLA-03…14, 16…18, 24) (ex.: CLA-12 *"O orquestrador a convoca."*, CLA-14 e CLA-18 as travas do inspetor, CLA-24 o dever de relatar a cada ciclo) **sem nenhuma marca local** que as separe do que o dono decidiu; a separação existe **só** no registro (decisoes l.2698: T-21…T-25 *"nenhuma é palavra do dono"*; dec-47 chama a T-21 de *"mecanismo do transcritor"*; l.2678–2679: remissão às T-01…T-20 do plano). O único precedente do critério (§C7.6-bis l.515–520) faz a separação **dentro do contrato**. Propriedade ausente: *o contrato de execução não distingue, no lugar em que o agente o lê, a decisão do dono do mecanismo do transcritor — a distinção só existe no registro para onde o cabeçalho aponta.* Não é `bloqueia`: (1) a derivação está declarada no texto julgado (a mutação N1 prova que a classe depende disso); (2) é a forma de cabeçalho de todos os itens da §C7; (3) nenhuma das 16 muda o que o dono decidiu (tabela acima).
- **C1-N3 · `nota` · `dentro-do-bloco`** — dec-20 (*"O que NÃO muda … identidade nova nas cadeiras que votaram"*) × CLA-03 (o texto do contrato mudou de *"na cadeira que reprovou"*): operativamente a regra em vigor não mudou (gate 3.1, 2026-08-30), mas o registro chama de inalterado um texto do contrato que o bloco alterou, e a consolidação da divergência contrato × gate (pré-existente: D-TETO 2026-08-29 × 3.1 2026-08-30) não está registrada como tal (§A2 — a consistência é da C2).
- **C1-N4 · `nota` · `dentro-do-bloco`** — dec-24 atribui à auditoria um propósito (examinar a não-convergência) que D4 não diz e que nenhuma das perguntas (a)–(e) mede; sem obrigação acrescida.
- **C1-N5 · `nota` · `dentro-do-bloco`** — CLA-21 *"ou deixando de ver os reais"* está dentro do bullet *"A razão do dono, nas palavras dele"*: interpretação posta no bullet da razão do dono; sem força normativa; declarada (T-12).
- **C1-N6 · `nota` · `dentro-do-bloco`** — dec-16 *"Contexto medido que o dono tinha na mão ao decidir"*: afirma como fato o que o dono sabia; não verificável por ninguém nesta junta (declarada T-17); sem força normativa.
- No objeto: nenhuma DERIVAÇÃO APRESENTADA COMO DECISÃO, nenhuma CONTRADIÇÃO. **O item concluiu.**

## Item 3 — "Nem menos": cobertura reversa e todo caminho até uma parada  [P1]

### (a) Cobertura reversa D1–D6 (das proposições do item 2)

| cláusula | N proposições | exemplos |
|---|---|---|
| D1 "remover a trava de dois ciclos" | 10 | CLA-01 (REVOGA D-TETO), CLA-02, CLA-25; dec-03,06,07,33,35 |
| D2 "se rodar três ciclos e encontrar mais erro" | 12 | CLA-04,10,11; dec-09,26,65,66,68 |
| D3 "auditoria na orquestração e na junta" | 23 | CLA-04..09,12..14; dec-47,48,55..57 |
| D4 "para garantir que está tudo normal" | 11 | CLA-05..08,15..18; dec-71,72 |
| D5 "e continuaremos" | 11 | CLA-02,03,14,15,16,18; dec-04,08,35,47,72 |
| D6 "se está encontrando erro está tudo certo" | 8 | CLA-02,19..21; dec-05,11,12,15 |

**Nenhuma cláusula com zero.**

**Travas de dois ciclos em vigor no MERGE-BASE, geradas da árvore do commit** — `git grep -n -i -E '<PAT>' fc3363e3 -- CLAUDE.md AGENTS.md .claude/agents .agents/agents` (ec=0, N=42 linhas; 47 arquivos de agente no merge-base), com `PAT` publicado no log (`(dois|2) ciclos|m[aá]x(imo|\.)? ?(de )?(2|dois|5|cinco)|teto|[0-9][ªºa]? falha|n[aã]o h[aá] ciclo [0-9]|…|dossi[eê]|…`); lidas uma a uma (as de `dossiê` dos agentes de mapa e a narrativa "faltou dois ciclos seguidos" são FORA):
1. CLAUDE.md §C7.4 item 4 (`D-TETO-DOIS-CICLOS`, l.412–428) · 2. AGENTS.md l.440–456 · 3. CLAUDE.md §C7.7 l.522 *"e o teto de dois ciclos ficam intactos"* · 4. AGENTS.md l.550 · 5. `.agents/agents/README.md` passo 5, l.59–63 (*"reprovou no ciclo 2 → PARA e vira dossiê ao dono — não há ciclo 3"*) · 6. `validador-mestre` `.claude` l.100 / `.agents` l.106 — *"Máximo 2 ciclos de reprovação por PR; na 3ª falha = CONDIÇÃO DE PARADA da rodada (reportar ao humano)"*.
Fora do pathspec do corpo, conferido à parte: `PROTOCOLO-JUNTA-RESILIENTE.md:6` (*"e o teto de dois ciclos"*) no merge-base.

**No OBJETO (mesma busca, N=164 — 140 delas nos 6 corpos novos das cadeiras, que citam o teto como assunto):** 1–5 **removidas** (item 4 reescrito; §C7.7 sem a frase; README passo 5 = *"sem teto de ciclos … reprovar não para o bloco"*); PROTOCOLO l.6 **removida** (`git grep` vazio no objeto). **Resta a 6** (`validador-mestre`, os dois espelhos).

**Minha leitura de D1:** "a trava de dois ciclos" (artigo definido, singular) é a `D-TETO-DOIS-CICLOS` — a que parou o #393 —, e ela foi removida por inteiro dos dois contratos, do protocolo Codex, do §C7.7 e do PROTOCOLO; e o contrato (fonte §A1.2) diz agora, universalmente, *"Não há mais teto por contagem de ciclos"*. A trava do `validador-mestre` é **outra**, mais antiga e de escopo BLOCO-AUTO, mas é, em substância, uma trava de dois ciclos **viva** num corpo com veto → **C1-N7**.

### (b) Caminhos até uma parada — frases GERADAS do objeto

**Padrão declarado** (sobre texto sem acento, minúsculo): o mínimo do corpo `\bpar(a|e|ar|ada|adas|ou|am|em)\b|suspend|aguard|dossi|\bdonos?\b|\bhuman|interven|antes de abrir|\bprimeir|so entao` **+ extensão minha** `\blibera|\btrav(a|am|ar|ou)\b|\bbloque|\bespera|interromp|\bimped|nao (abre|comeca|libera)` — **por quê:** com o mínimo, a frase da trava (*"O parecer vai PARA `omega/…`; sem ele … o inspetor não libera junta de ciclo 4"*) casava **só** pelo "para" preposição e caía na minha regra automática A1 — a prova respondendo à pergunta vizinha. **+ REDE 2** (condição de ciclo/reprovação + restrição `só|somente|apenas|até|salvo|exceto|desde que|condiciona` → sempre manual), acrescentada depois que a minha mutação N2c furou a regra A2 (abaixo).
**Frases:** unidades (bullet/item/parágrafo/linha de tabela) + R2 do item 2, sobre CLAUDE.md **inteiro**, AGENTS.md **inteiro** e a entrada de decisoes (l.2633–2738).
**Regras automáticas de FORA DO CAMINHO (publicadas em `item3.py`)**: A1 "para" preposição (não precedido de não/bloco/junta/se/que/…; nunca "PARA" maiúsculo); A2 "decisão do dono" **só na forma de proveniência** (seguida de data/parêntese/travessão/fecho); A3 "dono" = responsável (bloco dono, com/sem dono, dono nomeado); A4 "primeiro/a" ordinal sem "e então/só então/depois/antes" em 6 tokens. Todo o resto é **manual**, chaveado pelo md5 da frase (`item3-manual.json`, 68 chaves) — frase nova ou alterada = NÃO CLASSIFICADA.

**N = 203** (CLAUDE 87 · AGENTS 90 · decisoes 26). **Classes: FORA DO CAMINHO 146 · INDEPENDENTE 37 · ESPERA DO DONO (D2→D3) 12 · PRÉ-CONDIÇÃO SEM SAÍDA 8 · CONDICIONADA 0 · NÃO CLASSIFICADA 0.** Tabela completa (203 linhas com chave, classe e motivo) em `$SCRATCH/c1-394-work/item3-all2.txt`.

**Classe que declaro além da tabela do corpo — "ESPERA DO DONO (D2→D3)":** a espera pela auditoria que **o próprio dono** mandou fazer ("se rodar três ciclos e encontrar mais erro, faremos uma auditoria … e continuaremos"). Ela dispara por número de ciclo, mas **não é teto disfarçado** (a essência do CONDICIONADA do corpo): tem convocador nomeado (*"O orquestrador a convoca"*), é **uma** por bloco (*"o parecer dela serve aos ciclos seguintes"*) e **os dois vereditos continuam**. Classificá-la CONDICIONADA seria votar contra a decisão do dono (reprovação por construção, fim do corpo). As 12: CLAUDE/AGENTS ×3 (gatilho, disparo, trava do inspetor) + decisoes ×6 (dec-09, dec-26, T-21, efeito da trava, T-24, efeito da T-24).

**INDEPENDENTES (37):** §C7.5 e a sua lista, §C7.6-bis (esgotamento de modelo, 10 frases), porteiro pós-merge, §A2 "se bloquear, pare e peça validação", repo inacessível, inspetor antes de toda junta, quórum por tipo de decisão, "O que NÃO muda" — nenhuma depende de reprovação ou de contagem de ciclo.

**PRÉ-CONDIÇÃO SEM SAÍDA (8 = uma só matéria, 4 lugares × espelho):** CLAUDE/AGENTS §C7.1-bis (texto que o bloco escreveu, V-03: *"… e, se ela achou a máquina defeituosa, o registro do conserto"*), CLAUDE/AGENTS item 4 *"máquina defeituosa → conserta-se a máquina primeiro, e então o ciclo 4 abre"* e *"Quem auditou não conserta; … sem esse registro o inspetor também não libera o ciclo 4"*, decisoes T-25 e dec-73 *"**Não** diz quem atesta que o conserto consertou nem quanto a espera pode durar — isso fica em M-04, aberta."*

**Vermelho-controle do corpo (rodado):** `CLAUDE.M3` = acrescentado ao bullet *"Depois da auditoria"* `Se a auditoria não concluir, o bloco aguarda o dono.` (âncora 1×; diff não-vazio) → `python item3.py … CLAUDE=CLAUDE.M3` ec=0: **N 203 → 204**, a frase sai listada `NÃO CLASSIFICADA (fail-closed)` → classifico **CONDICIONADA** (espera pelo dono disparada pelo desfecho do gatilho do ciclo 3; teto disfarçado). **Controle do outro lado:** §C7.5 (`34901924399d`, *"Paradas imediatas irredutíveis (lista encolhida)…"*) sai **INDEPENDENTE** no mesmo run. Classes diferentes → a variável foi isolada. ✔

**Mutação NOVA N2 (minha — a parada escondida FORA do item 4 e vestida de proveniência; nenhuma mutação listada ataca o gerador de frases por aí):**
- **N2a** §C7.1-bis: `o registro do conserto);` → `o registro do conserto e o aceite do dono);` (1×) → a frase sai NÃO CLASSIFICADA (a chave mudou; "dono" fora da forma de proveniência cai no manual) → classifico **CONDICIONADA** (do ciclo 4 em diante, espera pelo dono). ✔
- **N2c** item 4: `Reprovado o ciclo 6, o bloco só segue por nova decisão do dono.` acrescentado ao bullet *"Depois da auditoria"*. **Na 1ª versão do meu gerador ela saiu `FORA DO CAMINHO (auto: A2)`** — a regra A2 lia "decisão do dono" como proveniência e **dispensava uma parada por contagem**: o meu instrumento reconhecia FORMA, não conteúdo. Consertei o instrumento (A2 só na forma de proveniência + REDE 2), **re-rodei o pristino** (N 201 → 203: a REDE 2 trouxe 1 frase nova ×2 espelhos, §C7.1-ter(b) *"Por quê: 'invariante financeiro = 5/5' …"* → classifiquei FORA DO CAMINHO, narrativa), e N2c passou a sair NÃO CLASSIFICADA → classifico **CONDICIONADA** (teto disfarçado no ciclo 6). ✔ (as duas execuções estão no log: `item3-N2c.txt` antes, `item3-N2c-v2.txt` depois.)
- O que provou: com o padrão mínimo e a A2 original, uma trava por contagem **escrita com a palavra "decisão do dono"** passaria por esta cadeira como FORA DO CAMINHO. No objeto não há nenhuma: com o instrumento corrigido o pristino tem **0 CONDICIONADA**.

**Achados do item 3:**
- **C1-A2 · `ajuste` · `dentro-do-bloco`** — o "continuaremos" (D5, **incondicional no literal**) fica condicionado, no ramo *máquina defeituosa*, a um ato — o conserto e o seu registro — **sem executor designado** (o texto só diz quem NÃO conserta), **sem prazo** e **sem desfecho alternativo**, e a trava do inspetor faz essa espera ser executável (CLAUDE.md l.433–435 = AGENTS.md l.461–463; §C7.1-bis CLAUDE l.395–396 / AGENTS l.423–424; decisoes T-25 e dec-73). Propriedade ausente: *o texto não garante a saída do ramo "máquina defeituosa"; o continuar depende de um ato sem dono, sem prazo e sem alternativa.* Por que **não** `bloqueia`: (1) a condição é **explícita**, não escondida; (2) deriva de D4 — auditar "**para garantir** que está tudo normal" implica tornar normal o que não está; (3) o gate confere só a **presença** do registro, que o fluxo normal da casa (§C7.4-bis) produz — não há aprovação nem atestação que possa ficar pendurada; (4) o próprio texto declara a lacuna (dec-73: *"não diz … quanto a espera pode durar — isso fica em M-04, aberta"*) e ela está nomeada com dono em `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS` (dono: orquestrador, que leva o prazo ao dono); (5) nenhum caminho leva a "parar", "dossiê" ou "aguardar o dono" — o bullet diz *"não uma parada"*.
- **C1-N7 · `nota` · `pre-existente`** — `.claude/agents/validador-mestre.md:100` (+ `.agents` l.106): *"Máximo 2 ciclos de reprovação por PR; na 3ª falha = CONDIÇÃO DE PARADA da rodada (reportar ao humano)"* segue viva no objeto. Propriedade: *uma trava de dois ciclos em vigor não foi alcançada pela remoção que o dono ordenou*. Evidência de origem: `git log --reverse -S'Máximo 2 ciclos de reprovação por PR' fc3363e3 -- .claude/agents/validador-mestre.md` → `bed17db3 2026-07-08 (#141)`, anterior ao `D-TETO` e a esta decisão. **N = 1 regra (2 espelhos); forma: regra de conduta de corpo com veto, escopo BLOCO-AUTO; causa: nenhuma revogação a alcançou.** Já é pendência nomeada com dono: `P-GOV-CICLOS-CORPOS-ORFAOS` (V-07; dono: orquestrador → bloco proposto `B-GOV-CICLOS-RESIDUAIS`). Não reprova.
- **Resposta à pergunta do mandato ("continuaremos" sem condição escondida?):** **sim, sem condição ESCONDIDA** — em 203 frases geradas do objeto não há CONDICIONADA; a continuação é afirmada em 4 lugares (CLA-03 *"Reprovação de junta NÃO para o bloco"*, CLA-15 *"CONTINUA-SE … não uma parada"*, dec-08, e as palavras do dono em dec-04); a única espera por ciclo é a auditoria que o dono mandou (uma, com convocador, dois vereditos que continuam); e há **uma** condição **explícita** sem saída garantida (C1-A2).
- **A mutação NOVA está neste parecer (N1 no item 2; N2a/N2c aqui). O item concluiu.**

## Critérios que não puderam falhar / defeitos do MEU instrumento (declarados ANTES do veredito)

- Nenhum vermelho-controle do corpo deixou de ficar vermelho: M1a (conteúdo=1) × M1b (conteúdo=0); M2 (N+1, isolada, CONTRADIÇÃO); M3 (listada, CONDICIONADA) × §C7.5 (INDEPENDENTE).
- **Dois defeitos do meu próprio instrumento, achados por mim e consertados antes de votar:** (1) com o padrão MÍNIMO do corpo, a frase da trava do inspetor casava só por "para" preposição e a minha regra A1 a dispensava — estendi o padrão (`libera|trava|bloque|espera|interromp|imped|não abre/começa/libera`); (2) a minha mutação NOVA N2c (*"Reprovado o ciclo 6, o bloco só segue por nova decisão do dono."*) saiu `FORA DO CAMINHO (auto: A2)` na 1ª versão — a A2 lia a forma "decisão do dono" e dispensava uma trava por contagem. Corrigi (A2 só na forma de proveniência + REDE 2), **re-rodei o pristino** (201 → 203 frases; a frase nova foi classificada) e a N2c passou a sair para classificação. Os resultados publicados acima são os da versão corrigida; as duas execuções da N2c ficam registradas.

## Voto (P2) — `c1-voto.json` (embutido aqui: o orquestrador mandou arquivo único no scratchpad)

```json
{
 "jurado": "jurado-semteto-c1-fidelidade-transcricao — 2ª INSTÂNCIA (identidade nova; nada de briefing, plano, ata ou da 1ª instância herdado como fato; o parcial da 1ª foi usado só como roteiro P3 e continha apenas terreno, re-executado e coincidente)",
 "cadeira": "C1 — fidelidade da transcrição",
 "modelo": "Opus 5.5 (claude-opus-5-5); frontmatter do corpo: model: opus",
 "corpo_aplicado": "C:/Users/AMP/w-teto/.claude/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md · md5 EOL-neutro 7a676a2fb44be53999d23471a4abd23c (= blob no objeto; 0 CR)",
 "head_medido": "7ad08690bad5e9cbc4d34fe6905b14c6ac634046 (gh pr view 394 = git ls-remote) · objeto do inspetor 7ad08690 resolve para o mesmo 40 hex (head NÃO andou) · merge-base fc3363e38aabd77f54e6b53034128182f8000571 = origin/main · texto julgado idêntico entre objeto e head: sim, por identidade de SHA (controle do pathspec: o mesmo diff sobre merge-base..objeto devolve os 3 arquivos)",
 "literal_usado": "o do corpo, byte a byte (l.28) · cadeia de custódia: dono → orquestrador → fábrica · versões divergentes no briefing/plano: NENHUMA no verbatim (byte-idênticos); uma paráfrase atribuída ao dono com 1 op de conteúdo no plano:159/briefing:78 (C1-N2)",
 "leitura_de_outras_cadeiras": "não li nenhum arquivo c2-*/c3-*, nem VOTO-394-C2.md/VOTO-394-C3.md, nem os diretórios jst2/jst3/stc2 antes de gravar este voto",
 "voto": "APROVADO",
 "justificativa": "Terreno: worktree próprio C:/Users/AMP/w-jst1 detached no objeto; blobs por git show; 0 CR. Item 1: 3 ocorrências das palavras do dono no texto julgado (decisoes 2635–2637, CLAUDE 436, AGENTS 464) + verbatim byte-idêntico no plano e no briefing; 0 operação de CONTEÚDO sob o rótulo do dono com a lista declarada (gantir→garantir; ∅→que); M1a pararemos = 1 conteúdo, M1b acento = 0. Item 2: N=26/26/79 por regra publicada; classificador fail-closed por md5 e classe DECLARADA dinâmica; 7 TRANSCRIÇÃO · 43 DERIVAÇÃO DECLARADA · 55 CONTEXTO · 0 APRESENTADA COMO DECISÃO · 0 CONTRADIÇÃO; das 25 elaborações, 23 fiéis (T-11 e T-25 com ressalva), 1 legislação declarada e neutra (T-13), 1 não-verificável (T-17); M2 isolada (26→27, CONTRADIÇÃO); mutação NOVA N1a/N1b (some a declaração → 20/24 viram APRESENTADA COMO DECISÃO). Item 3: D1–D6 cobertas (10/12/23/11/11/8); travas de 2 ciclos no merge-base = 6, removidas 5 (+PROTOCOLO), resta a do validador-mestre (pre-existente, pendência com dono); 203 frases de parada geradas: 146 FORA · 37 INDEPENDENTE · 12 ESPERA DO DONO (a auditoria que ele mandou) · 8 PRÉ-CONDIÇÃO SEM SAÍDA (uma matéria: o conserto) · 0 CONDICIONADA; M3 CONDICIONADA × §C7.5 INDEPENDENTE; mutação NOVA N2a/N2c furou o meu gerador (A2) e o consertei antes de votar. Limpeza: worktree w-jst1 removido por git worktree remove --force; cópias descartadas; nada rastreado tocado; base viva nunca tocada. VOTO: APROVADO — a citação coincide com o literal em conteúdo (3 ocorrências no texto julgado; correções só ortográficas/gramaticais e listadas), as 105 proposições enumeradas da fonte não trazem derivação vestida de decisão nem contradição, e as seis cláusulas estão cobertas sem condição escondida sobre o \"continuaremos\" (vermelho-controle de cada item publicado)",
 "o_que_executei": [
  {"comando": "gh pr view 394 --json headRefOid; git ls-remote origin refs/heads/docs/sem-teto-auditoria-no-3; git rev-parse 7ad08690^{commit}; git merge-base origin/main 7ad08690", "forma": "cwd árvore principal, após git fetch origin ec=0", "resultado": "7ad08690bad5… nos três; merge-base fc3363e3…"},
  {"comando": "git worktree add --detach C:/Users/AMP/w-jst1 7ad08690…; test -f C:/Users/AMP/w-jst1/.git", "forma": "caminho curto", "resultado": "ec=0; diretório existe"},
  {"comando": "git show <obj|mb>:{CLAUDE.md,AGENTS.md,agent-orchestration/controle/decisoes.md} + plano + briefing + corpo C1 (.claude e .agents)", "forma": "blobs, CR contado por python 'rb'", "resultado": "0 CR em todos; corpo .claude md5 7a676a2f… = o do w-teto"},
  {"comando": "git diff -U0 fc3363e3 7ad08690 > diff-U0.txt; python item1.py / item1-diff.py / item1-mut.py", "forma": "N=22 linhas com ≥2 marcadores nas linhas adicionadas; spans entre aspas; SequenceMatcher", "resultado": "0 conteúdo no texto julgado; M1a=1, M1b=0; plano:159/briefing:78 = 1 conteúdo (paráfrase)"},
  {"comando": "python props.py <W> print; python item2.py <W> pristine | mut item4.M2 - | mut - entry.N1a | mut - entry.N1b", "forma": "blob do objeto; regra de quebra publicada; chave md5", "resultado": "N=26/26/79; 7/43/55/0/0; M2 26→27 isolada; N1a 20 e N1b 24 APRESENTADAS"},
  {"comando": "git grep -n -i -E '<PAT>' <mb|obj> -- CLAUDE.md AGENTS.md .claude/agents .agents/agents; git log --reverse -S'Máximo 2 ciclos de reprovação por PR' fc3363e3 -- .claude/agents/validador-mestre.md", "forma": "árvore do commit, não o disco", "resultado": "mb N=42 → 6 travas; obj: resta validador-mestre (bed17db3 2026-07-08 #141)"},
  {"comando": "python item3.py <W> manual|all [CLAUDE=CLAUDE.M3|N2a|N2c]", "forma": "CLAUDE e AGENTS inteiros + entrada decisoes; padrão e regras publicados; 68 chaves manuais", "resultado": "N=203: 146/37/12/8/0; M3 → 204, CONDICIONADA; §C7.5 INDEPENDENTE; N2c furou A2 v1, saiu manual na v2"}
 ],
 "achados": [
  {"id": "C1-A1", "defeito": "o contrato operante não separa, no lugar em que é lido, a decisão do dono do mecanismo do transcritor", "evidencia": "CLAUDE.md l.413–445 = AGENTS.md l.441–473 sob '(decisão do dono, 2026-09-27, D-SEM-TETO-AUDITORIA-NO-3)': 16 proposições acrescentam ator/obrigação/condição/restrição (CLA-03…14,16…18,24) sem marca local; a separação existe só em decisoes l.2698 ('nenhuma é palavra do dono') e l.2678–2679 (remissão T-01…T-20 do plano); critério §C7.6-bis l.515–520 separa dentro do contrato; mutação N1 prova que a classe DECLARADA depende do registro", "gravidade": "ajuste", "escopo": "dentro-do-bloco", "motivo": "o contrato de execução não distingue, no ponto de leitura, a decisão do dono do mecanismo do transcritor"},
  {"id": "C1-A2", "defeito": "o 'continuaremos' fica condicionado, no ramo 'máquina defeituosa', a um ato sem executor designado, sem prazo e sem desfecho alternativo", "evidencia": "CLAUDE.md l.432–435 = AGENTS.md l.460–463; §C7.1-bis CLAUDE l.395–396 / AGENTS l.423–424; decisoes T-25 e dec-73 ('Não diz quem atesta … nem quanto a espera pode durar — isso fica em M-04, aberta'); item3: 8 frases PRÉ-CONDIÇÃO SEM SAÍDA; cláusula D5 (incondicional no literal) × D4", "gravidade": "ajuste", "escopo": "dentro-do-bloco", "motivo": "o texto não garante a saída do ramo 'máquina defeituosa'; condição explícita, derivável de D4 e declarada (P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS), não escondida"},
  {"id": "C1-N1", "defeito": "citação rotulada 'nas palavras dele' está normalizada (gantir→garantir, ∅→que, acentos) sem marca local", "evidencia": "decisoes l.2635–2637; CLAUDE l.436; AGENTS l.464; item1: 0 conteúdo com a lista declarada, 1 (insert que) com a lista estrita", "gravidade": "nota", "escopo": "dentro-do-bloco", "motivo": "a citação rotulada como palavras do dono difere delas em grafia e numa palavra gramatical, não em conteúdo; normalização declarada só por referência (T-01)"},
  {"id": "C1-N2", "defeito": "paráfrase atribuída ao dono condiciona o 'continuaremos'", "evidencia": "plano:159 e briefing:78 'o dono cobriu \"está tudo normal → continuaremos\"' — delete [e] = 1 op de CONTEÚDO; no literal 'continuaremos' é coordenado a 'faremos', não condicionado a 'normal'", "gravidade": "nota", "escopo": "dentro-do-bloco (plano e briefing são arquivos novos deste diff)", "motivo": "uma versão condicional do 'continuaremos' circula no insumo da junta como coberta pelo dono; o texto julgado não a carrega"},
  {"id": "C1-N3", "defeito": "registro chama de inalterado um texto do contrato que o bloco alterou", "evidencia": "dec-20 'O que NÃO muda … identidade nova nas cadeiras que votaram' × CLAUDE@fc3363e3 item 4 'identidade nova na cadeira que reprovou' → CLAUDE@7ad08690 l.417 'nas cadeiras que votaram'; regra em vigor já era essa no gate (inspetor 3.1, d2839039 2026-08-30)", "gravidade": "nota", "escopo": "dentro-do-bloco", "motivo": "consolidação de divergência pré-existente contrato×gate não registrada como tal (§A2 é matéria da C2)"},
  {"id": "C1-N4", "defeito": "propósito atribuído à auditoria que D4 não diz", "evidencia": "dec-24 'é isso que a auditoria do ciclo 3 existe para examinar' (a não-convergência); nenhuma de (a)–(e) o mede; não listado pelo planejador", "gravidade": "nota", "escopo": "dentro-do-bloco", "motivo": "reformula o propósito do dono ('garantir que está tudo normal') sem força normativa"},
  {"id": "C1-N5", "defeito": "interpretação posta no bullet da razão do dono", "evidencia": "CLAUDE l.436–438 'ou deixando de ver os reais' dentro de 'A razão do dono, nas palavras dele' (T-12)", "gravidade": "nota", "escopo": "dentro-do-bloco", "motivo": "preocupação não verbalizada pelo dono no bullet atribuído a ele; sem força normativa"},
  {"id": "C1-N6", "defeito": "estado epistêmico do dono afirmado como fato", "evidencia": "dec-16 'Contexto medido que o dono tinha na mão ao decidir' (T-17)", "gravidade": "nota", "escopo": "dentro-do-bloco", "motivo": "não verificável por esta junta; sem força normativa"},
  {"id": "C1-N7", "defeito": "uma trava de dois ciclos em vigor não foi alcançada pela remoção que o dono ordenou", "evidencia": ".claude/agents/validador-mestre.md:100 (+ .agents l.106) 'Máximo 2 ciclos de reprovação por PR; na 3ª falha = CONDIÇÃO DE PARADA'; N=1 regra (2 espelhos), forma: conduta de corpo com veto, escopo BLOCO-AUTO; causa: nenhuma revogação a alcançou", "gravidade": "nota", "escopo": "pre-existente — git log -S → bed17db3 2026-07-08 (#141); pendência dona P-GOV-CICLOS-CORPOS-ORFAOS (V-07)", "motivo": "a trava do corpo segue viva abaixo do contrato que a revoga universalmente"}
 ],
 "criterios_que_nao_puderam_falhar": [ "nenhum do corpo (todos os vermelhos-controle ficaram vermelhos)", "do MEU instrumento, achados e consertados antes do voto: padrão mínimo cego à trava do inspetor (casava só por 'para'); regra A2 que dispensava 'nova decisão do dono' (furada pela minha N2c)" ],
 "pendencias_que_aceito": [
  "C3: o briefing (43b37e4d) está defasado nos três pontos da R2 do inspetor — não o herdei",
  "C2: espelho item 4 (medi md5 igual, db96a8bd…, só para aplicar a mesma tabela); corpo .agents da C1 difere do .claude pela adaptação do sync (preâmbulo Codex, sem 'tools:')",
  "C2: o disparo do contrato ('achado bloqueia', CLA-04) e a trava do gate (qualquer junta ≥4, dec-68) têm alcances diferentes — ambos dentro de D2",
  "C2: T-10 exclui quem votou/planejou/desenvolveu, mas não exclui o orquestrador de auditar a própria orquestração — mecanismo, não fidelidade",
  "C2/pendência: M-02, M-04 (resto), M-05, M-06, M-09 em P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS",
  "pendência pre-existente: V-07…V-11 em P-GOV-CICLOS-CORPOS-ORFAOS (C1-N7 é a V-07)"
 ],
 "teardown": "worktree C:/Users/AMP/w-jst1 removido por git worktree remove --force (ec=0; diretório ausente; fora do worktree list) após conferir status vazio e nenhum processo python/git vivo · $SCRATCH/c1-394-work (cópias, mutantes, scripts — scripts e tabelas preservados nos apêndices B/C deste arquivo) e 4 logs c1-* apagados · nenhum arquivo rastreado tocado · base viva nunca tocada · resíduo ALHEIO só reportado"
}
```

## Apêndice A — tabela completa do item 2 (`item2.py … pristine`, objeto 7ad08690)

```
declaradas no texto corrente: 25 → ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08', 'T-09', 'T-10', 'T-11', 'T-12', 'T-13', 'T-14', 'T-15', 'T-16', 'T-17', 'T-18', 'T-19', 'T-20', 'T-21', 'T-22', 'T-23', 'T-24', 'T-25']
contagem por classe: {'TRANSCRIÇÃO': 7, 'DERIVAÇÃO DECLARADA': 43, 'CONTEXTO': 55}
CLA-01 [06a813a78329] TRANSCRIÇÃO | D=D1 | T=T-20 | cabeçalho "decisão do dono" + REVOGA D-TETO = D1; "NO CICLO 3" = T-20 | «4. **Protocolo de dificuldade — SEM TETO DE CICLOS; AUDITORIA DA MÁQUINA NO CICLO 3 (decisão do dono, 2026-09-27, `D-SEM-TETO-AUDITORIA-NO-3`).** **RE»
CLA-02 [b0b8c6764c2b] DERIVAÇÃO DECLARADA | D=D1 D5 D6 | T=T-02 | universaliza D1: nenhum teto por contagem | «**Não há mais teto por contagem de ciclos.**»
CLA-03 [967fda6bd757] DERIVAÇÃO DECLARADA | D=D5 | T=T-03,T-04 | reprovação não para; identidade nova nas que VOTARAM (herança alterada) | «- **Reprovação de junta NÃO para o bloco.** Abre-se o ciclo seguinte, com os papéis recompostos pelo §C7.4-bis (quem achou ≠ quem planeja ≠ quem desen»
CLA-04 [21411d9dfeee] DERIVAÇÃO DECLARADA | D=D2 D3 | T=T-05,T-06,T-07,T-08,T-09 | gatilho bloqueia; OBRIGATÓRIA antes do 4; máquina; por execução; (a) | «- **GATILHO NO CICLO 3 — auditoria da MÁQUINA, não do bloco.** Se o ciclo 3 também produzir achado `bloqueia`, **antes de abrir o ciclo 4** é OBRIGATÓ»
CLA-05 [c6480884a65d] DERIVAÇÃO DECLARADA | D=D3 D4 | T=T-09 | (b) | «(b) a **composição** cobre a competência que os achados exigem, e a **inelegibilidade** foi conferida por nome?»
CLA-06 [dba46ee781fc] DERIVAÇÃO DECLARADA | D=D3 D4 | T=T-09 | (c) | «(c) o **planejador** está usando dado podre?»
CLA-07 [95dc606c5730] DERIVAÇÃO DECLARADA | D=D3 D4 | T=T-09,T-23 | (d) reescrita | «(d) o **mandato do orquestrador** foi conferido antes do voto?»
CLA-08 [5f483db7744a] DERIVAÇÃO DECLARADA | D=D3 D4 | T=T-09 | (e) | «(e) o **terreno** foi limpo em cada ciclo, e o inspetor liberou cada junta?»
CLA-09 [33da045eb47a] DERIVAÇÃO DECLARADA | D=D3 | T=T-10 | quem conduz (ator restrito) | «Conduz a auditoria uma identidade que **não votou, não planejou e não desenvolveu** no bloco.»
CLA-10 [8365c092734d] DERIVAÇÃO DECLARADA | D=D2 | T=T-24 | disparo: o bloqueia que reprova | «Conta o `bloqueia` que reprova o ciclo 3»
CLA-11 [062457718f4b] DERIVAÇÃO DECLARADA | D=D2 | T=T-24 | pre-existente não abre ciclo 4; uma auditoria, serve aos seguintes | «o `pre-existente` não reprova (§C7.1-ter(a)) nem abre ciclo 4 —, e a auditoria é a do ciclo 3: o parecer dela serve aos ciclos seguintes.»
CLA-12 [9dd61e56d670] DERIVAÇÃO DECLARADA | D=D3 | T=T-21 | orquestrador convoca (ator) | «O orquestrador a convoca.»
CLA-13 [916ee8d33176] DERIVAÇÃO DECLARADA | D=D3 | T=T-22 | registro R-*-ciclo3-auditoria + veredito sã/defeituosa | «O parecer vai para `omega/reprovacoes/R-<entrega>-ciclo3-auditoria.md`, com o comando executado em cada pergunta e o veredito **máquina sã** ou **máqu»
CLA-14 [5e648711b005] DERIVAÇÃO DECLARADA | D=D3 D5 | T=T-21 | gate do inspetor: sem parecer não libera junta ≥4 (condição) | «sem ele no briefing, o `inspetor-de-terreno-da-junta` não libera junta de ciclo 4 ou seguinte (§C7.1-bis).»
CLA-15 [178d763455b5] TRANSCRIÇÃO | D=D4 D5 | T=T-11 | CONTINUA-SE; não é parada; sã → ciclo 4 abre | «- **Depois da auditoria, CONTINUA-SE.** Ela é checagem de saúde da máquina, **não uma parada**: máquina sã → o ciclo 4 abre»
CLA-16 [f1212d49eadd] DERIVAÇÃO DECLARADA | D=D4 D5 | T=T-11 | defeituosa → conserta primeiro, então ciclo 4 (condição) | «máquina defeituosa → conserta-se a máquina primeiro, e então o ciclo 4 abre.»
CLA-17 [d329f0e164f3] DERIVAÇÃO DECLARADA | D=D4 | T=T-25 | quem auditou não conserta | «Quem auditou não conserta (§C7.4-bis)»
CLA-18 [6a7168f41492] DERIVAÇÃO DECLARADA | D=D4 D5 | T=T-25 | registro do conserto + gate (condição) | «o conserto fica registrado no mesmo arquivo do parecer, e sem esse registro o inspetor também não libera o ciclo 4.»
CLA-19 [2c44d26ab275] TRANSCRIÇÃO | D=D6 | T=T-01,T-12 | citação D6 (normalizada) + "Achado é a junta funcionando" | «- **A razão do dono, nas palavras dele:** ***"se está encontrando erro está tudo certo."*** Achado é a junta funcionando.»
CLA-20 [76829c5588cc] DERIVAÇÃO DECLARADA | D=D6 | T=T-12 | glosa: vigilância não é o bloco que reprova 3x | «O que merece vigilância não é o bloco que reprova três vezes»
CLA-21 [1023145e4937] DERIVAÇÃO DECLARADA | D=D3 D6 | T=T-12 | glosa: fabricando achados / deixando de ver os reais | «é a possibilidade de a máquina estar **fabricando** achados, ou **deixando de ver** os reais.»
CLA-22 [5c43c24abb78] CONTEXTO | D=- | T=T-13 | risco declarado | «- **Risco assumido, declarado:** sem teto por contagem, um bloco que não converge pode consumir indefinidamente.»
CLA-23 [ca2a5a4aa5ee] CONTEXTO | D=D2 D3 | T=T-13 | argumento "melhor dirigido" | «A mitigação é o gatilho do ciclo 3, **melhor dirigido que uma contagem** — ele pergunta se a máquina está certa, não se o orçamento acabou.»
CLA-24 [77dc87ac3700] DERIVAÇÃO DECLARADA | D=- | T=T-13 | DEVER novo: orquestrador relata a cada ciclo (obrigação) | «O orquestrador relata, a cada ciclo, se a classe de defeito **se repetiu sem informação nova**, que é o sinal de não-convergência.»
CLA-25 [f7d028ef9423] DERIVAÇÃO DECLARADA | D=D1 | T=T-14 | fábrica por ciclo (limite dos 2 removido) | «- A `agente-fabrica` continua criando especialistas por ciclo.»
CLA-26 [d069d06f8bc0] DERIVAÇÃO DECLARADA | D=- | T=T-15 | §C7.5 preservado | «As **paradas imediatas irredutíveis** (§C7.5) são independentes disto e continuam valendo integralmente.»
dec-01 [5fcf8fe16753] DERIVAÇÃO DECLARADA | D=D1 | T=T-02 | título: o teto de ciclos cai | «## `D-SEM-TETO-AUDITORIA-NO-3` — o teto de ciclos cai»
dec-02 [7580776b41cc] DERIVAÇÃO DECLARADA | D=D2 D3 | T=T-20,T-07 | título: no ciclo 3 audita-se a MÁQUINA (decisão do dono) | «no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)»
dec-03 [52a1ce916dd4] TRANSCRIÇÃO | D=D1 | T=T-01 | citação | «**O que o dono decidiu, nas palavras dele:** *"vamos remover a trava de dois ciclos»
dec-04 [1ddf088167f3] TRANSCRIÇÃO | D=D2 D3 D4 D5 | T=T-01 | citação | «se rodar três ciclos e encontrar mais erro, faremos uma auditoria na orquestração e na junta para garantir que está tudo normal e continuaremos.»
dec-05 [e3679f543d94] TRANSCRIÇÃO | D=D6 | T=T-01 | citação | «Se está encontrando erro está tudo certo."* Fonte §A1.1.»
dec-06 [6e2b0b671a64] TRANSCRIÇÃO | D=D1 | T=T-02 | REVOGA D-TETO | «**REVOGA `D-TETO-DOIS-CICLOS`** (2026-08-29), que revogara o teto de 5.»
dec-07 [c89c162101e0] DERIVAÇÃO DECLARADA | D=D1 | T=T-02 | não há mais teto por contagem | «Não há mais teto por contagem.»
dec-08 [811cc074e4fc] DERIVAÇÃO DECLARADA | D=D5 | T=T-03 | reprovação deixa de parar o bloco | «**O que muda.** Reprovação de junta deixa de parar o bloco.»
dec-09 [88ddfaa3d107] DERIVAÇÃO DECLARADA | D=D2 D3 | T=T-05,T-06,T-07 | gatilho bloqueia antes do 4; máquina não bloco | «No lugar do teto entra um gatilho de natureza diferente: **no ciclo 3 com achado `bloqueia`, audita-se a orquestração e a junta antes do ciclo 4** — a»
dec-10 [4ee61ac9dcb6] CONTEXTO | D=- | T= | ponteiro para o texto operante | «Texto operante no §C7.4 item 4 do `CLAUDE.md` e no espelho do `AGENTS.md`.»
dec-11 [a38cb9378d18] CONTEXTO | D=D6 | T=T-16 | argumento | «**Por que a troca é uma melhora de desenho, e não um afrouxamento.** O teto por contagem pergunta *"o bloco gastou o orçamento?"*.»
dec-12 [3d6ad1b932ca] CONTEXTO | D=D6 | T=T-16 | argumento | «A pergunta útil é *"a máquina está achando defeito de verdade?"*.»
dec-13 [58ae477b9d38] CONTEXTO | D=- | T=T-16 | argumento | «Foi o próprio `B-GOV-MANDATO` que mostrou a diferença: nos dois ciclos, as juntas acharam defeitos **reais e medidos por mutação**»
dec-14 [59425270d048] CONTEXTO | D=- | T=T-16 | argumento | «a trava que só via bullets, o guard que testava uma réplica em vez do artefato, e o conserto do `approved_head` que não tinha teste nenhum e cuja remo»
dec-15 [0b31c70bd7c0] CONTEXTO | D=D6 | T=T-16 | argumento | «Parar ali por contagem descartaria uma máquina que estava funcionando.»
dec-16 [6562e7502678] CONTEXTO | D=- | T=T-17 | estado epistêmico atribuído ao dono (não verificável) | «**Contexto medido que o dono tinha na mão ao decidir.** `B-GOV-MANDATO` ciclo 1 REPROVADO 2×1, ciclo 2 REPROVADO 2×1.»
dec-17 [9d021b961b23] CONTEXTO | D=- | T=T-17 | números do #393 | «O ciclo 2 **fechou** o defeito central do ciclo 1 (0 de 51 casos sobrevivem ao artefato apagado, contra 4 de 6), fechou a pendência do basename **duas»
dec-18 [775ce58133b4] CONTEXTO | D=- | T=T-17 | classe nomeada | «Os bloqueantes novos são de uma classe nomeada: **o remédio nasceu com a doença**»
dec-19 [fbbe80820b16] CONTEXTO | D=- | T=T-17 | checagem 7 | «a checagem 7, escrita no ciclo 2 para fechar o ciclo 1, é literalmente *"bullet rejeita, tabela passa"*.»
dec-20 [de811cbcbfab] DERIVAÇÃO DECLARADA | D=- | T=T-18,T-04,T-15 | O que NÃO muda (inclui identidade nova nas que votaram) | «**O que NÃO muda.** §C7.4-bis (quem acha ≠ quem planeja ≠ quem desenvolve) · identidade nova nas cadeiras que votaram · inspetor de terreno fail-close»
dec-21 [4b5147a3fef2] CONTEXTO | D=- | T=T-13 | risco | «**Risco assumido e sua mitigação, declarados.** Sem teto por contagem, um bloco que não converge pode consumir indefinidamente»
dec-22 [1ba5f70beb21] CONTEXTO | D=- | T=T-13 | custo de escalar | «e a resposta do §C7.4 à reprovação é **escalar**, o que torna cada ciclo mais caro.»
dec-23 [edba5805fe9b] DERIVAÇÃO DECLARADA | D=- | T=T-13 | DEVER: orquestrador relata a cada ciclo | «A mitigação não é um teto disfarçado: é o orquestrador **relatar, a cada ciclo, se a classe de defeito se repetiu sem informação nova**.»
dec-24 [3d4cf2f35573] DERIVAÇÃO DECLARADA | D=D3 | T=T-13 | propósito atribuído à auditoria: examinar não-convergência | «Classe repetida sem informação nova é o sinal de não-convergência, e é isso que a auditoria do ciclo 3 existe para examinar.»
dec-25 [d277dcfa1a55] DERIVAÇÃO DECLARADA | D=D1 D2 | T=T-19 | B-GOV-MANDATO retoma no ciclo 3 | «**Blocos em voo.** O `B-GOV-MANDATO`, que havia parado no teto revogado, **retoma no ciclo 3** sob esta decisão.»
dec-26 [e4f6f9d8ac20] DERIVAÇÃO DECLARADA | D=D2 D3 | T=T-19,T-05,T-06 | aplicação ao #393 | «Como o ciclo 3 é exatamente o do gatilho, se ele produzir achado `bloqueia` a auditoria da máquina é obrigatória antes do ciclo 4.»
dec-27 [5cd73c6bdd2f] CONTEXTO | D=- | T= | emenda: quem escreve | «**Emenda de 2026-09-28 — o que entrou além do texto de 27/09, e por quê (§A2: nada em silêncio).** Quem escreve: `dev-semteto-emenda`, desenvolvedor d»
dec-28 [6a27017cefc3] CONTEXTO | D=- | T= | emenda | «O orquestrador escreveu o texto de 27/09 e **não emenda o próprio texto** (§C7.4-bis)»
dec-29 [6c4dcfc8a03e] CONTEXTO | D=- | T= | emenda | «o `planejador-mestre` do bloco mediu que ele estava incompleto (`docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md` §3–§5 e §7), e esta emenda implementa aqu»
dec-30 [66bf231449e8] CONTEXTO | D=- | T= | afirmação "nada abaixo muda o que o dono decidiu" | «**Nada abaixo muda o que o dono decidiu.** O que remove regra é consistência»
dec-31 [9e3c132090d6] CONTEXTO | D=- | T= | referência T-01…T-20 | «o que acrescenta está numerado na sequência das T-01…T-20 do plano (§2), para a cadeira C1 julgar uma a uma contra as palavras do dono.»
dec-32 [3ff3b57b540e] CONTEXTO | D=- | T= | V-* | «*Regras vivas que contradiziam a decisão — classe (a) do plano §3.3, nos dois contratos quando é contrato:*»
dec-33 [6b6ca67c45f8] CONTEXTO | D=D1 | T= | V-01 | «- **V-01** §C7.7: saiu *"e o teto de dois ciclos"* da lista do que o protocolo resiliente não muda.»
dec-34 [a99f046763ea] CONTEXTO | D=- | T= |  | «Só deleção.»
dec-35 [3fadac111b3e] CONTEXTO | D=D1 D5 | T= | V-02 | «- **V-02** cauda do item 4 (*"Por quê, medido … com dois conjuntos de achados na mesa, não cinco"*): saiu inteira.»
dec-36 [00f518ac410d] CONTEXTO | D=- | T= |  | «Era a justificativa da decisão **revogada**; cada fato dela já está nesta casa, na entrada `D-TETO-DOIS-CICLOS` acima (B-O6R-01 em 3 ciclos, B-O6R-02 »
dec-37 [b2c7ab7fb647] CONTEXTO | D=- | T= |  | «Só deleção; nada se perde.»
dec-38 [7c4ccaf98f1c] CONTEXTO | D=- | T= | V-03 | «- **V-03** §C7.1-bis: o insumo *"parecer do crítico + PD nos ciclos ≥3"* era do protocolo do teto de 5, que a regra nova reativaria sem prescrever.»
dec-39 [031c361955af] CONTEXTO | D=- | T= | V-03 → T-21 | «Virou *"do ciclo 4 em diante, o parecer da auditoria da máquina do §C7.4 e, se ela achou a máquina defeituosa, o registro do conserto"* — é a T-21 aba»
dec-40 [6b1b6b8cebb0] CONTEXTO | D=- | T= | V-04 | «- **V-04** `inspetor-de-terreno-da-junta`, **só o item 2.2** (+ espelho `.agents/`, regenerado por `sync-agent-agents.mjs`): a mesma troca, por **exce»
dec-41 [3360817ece8a] CONTEXTO | D=- | T= |  | «era o único remanescente que bloquearia **por construção** a junta 3 do #393.»
dec-42 [6926b26157e0] CONTEXTO | D=- | T= |  | «Diff de 1 hunk; os demais itens do corpo intactos.»
dec-43 [7db2ad04f6a2] CONTEXTO | D=- | T= | V-05 | «- **V-05** `.agents/agents/README.md` passo 5 e l.122/126: o lado Codex repete o item 4 (sem teto; auditoria no ciclo 3; a fábrica cria especialistas »
dec-44 [8b6c9fd7132c] CONTEXTO | D=- | T= | V-06 | «**V-06** `PROTOCOLO-JUNTA-RESILIENTE.md` l.6: só deleção, a mesma de V-01.»
dec-45 [e5b866028862] CONTEXTO | D=- | T= | cabeçalho da declaração | «*Elaborações NOVAS desta emenda — continuam a numeração do plano; nenhuma é palavra do dono:*»
dec-46 [5fd2cdfc07b9] CONTEXTO | D=- | T=T-21 | rótulo | «- **T-21** `[acrésc]` **A trava e a convocação**»
dec-47 [6746591e2db7] DERIVAÇÃO DECLARADA | D=D3 D5 | T=T-21 | gate | «adotada a opção §4.2(ii) do plano, declarada aqui como **mecanismo do transcritor**: o inspetor, no item 2.2 e no §C7.1-bis, não libera junta de ciclo»
dec-48 [1028b0af8ab7] DERIVAÇÃO DECLARADA | D=D3 | T=T-21 | convoca | «*"O orquestrador a convoca"*.»
dec-49 [0a56a422a2ec] CONTEXTO | D=- | T= |  | «Mede-se contra W3 (*"faremos uma auditoria"*) e o»
dec-50 [c326b01ccb3c] CONTEXTO | D=- | T= |  | «*"OBRIGATÓRIA"* da T-06.»
dec-51 [1830fd083d40] CONTEXTO | D=- | T=T-21 | efeito | «**Efeito, dito para não ser descoberto:** o gate é o último ponto em que a ausência é detectável por máquina — ele trava a **junta** do ciclo 4, não o»
dec-52 [8a231bd35eb6] CONTEXTO | D=- | T= |  | «a regra continua sendo»
dec-53 [73a7031470bf] CONTEXTO | D=- | T= |  | «*"antes de abrir o ciclo 4"*.»
dec-54 [bce794ee7674] CONTEXTO | D=- | T= |  | «Fecha M-01 e M-08.»
dec-55 [5b3c6e23f7e9] DERIVAÇÃO DECLARADA | D=D3 | T=T-22 | registro | «- **T-22** `[acrésc]` **O registro e a forma do veredito** — o parecer vai para `omega/reprovacoes/R-<entrega>-ciclo3-auditoria.md` (o registro `R-*` »
dec-56 [40f3d79c46ef] DERIVAÇÃO DECLARADA | D=D3 | T=T-22 | quem decide o veredito | «Quem decide o veredito é quem conduz»
dec-57 [9a1a6d4476c5] DERIVAÇÃO DECLARADA | D=D3 | T=T-22 | quórum 1 | «quórum de uma identidade, como o texto já dizia.»
dec-58 [008310319c5c] CONTEXTO | D=- | T= |  | «Fecha M-03.»
dec-59 [2f4f1338fd87] CONTEXTO | D=- | T=T-23 | rótulo | «- **T-23** `[interp]` **A pergunta (d) reescrita**»
dec-60 [c321da4979c2] DERIVAÇÃO DECLARADA | D=D3 | T=T-23 | (d) | «*"passou no pré-voo?"* virou *"foi conferido antes do voto?"*.»
dec-61 [cd7b6c65222a] CONTEXTO | D=- | T= |  | «O "pré-voo" só existe no #393 (`scripts/mandato-preflight.sh`, ausente da `main`)»
dec-62 [52f93475ca16] DERIVAÇÃO DECLARADA | D=D3 | T=T-23 | pré-voo futuro | «a propriedade não depende da ferramenta, e quando o pré-voo por máquina estiver na `main` ele passa a ser a forma de conferir sem reescrever o contrat»
dec-63 [1a34509985e6] CONTEXTO | D=- | T= |  | «A T-09 continua sendo julgada como elaboração.»
dec-64 [7a0466a7668c] CONTEXTO | D=- | T= |  | «Fecha M-07.»
dec-65 [156decdf1298] DERIVAÇÃO DECLARADA | D=D2 | T=T-24 | disparo | «- **T-24** `[interp]` **O disparo, sem ambiguidade** — *"Conta o `bloqueia` que reprova o ciclo 3»
dec-66 [22a30f9a0d6b] DERIVAÇÃO DECLARADA | D=D2 | T=T-24 | disparo | «o `pre-existente` não reprova (§C7.1-ter(a)) nem abre ciclo 4 —, e a auditoria é a do ciclo 3: o parecer dela serve aos ciclos seguintes."* Não é regr»
dec-67 [c2ddcc28c3f6] CONTEXTO | D=- | T= |  | «Mede-se contra W2 (*"se rodar três ciclos e encontrar mais erro"*).»
dec-68 [3683ee0fedf8] DERIVAÇÃO DECLARADA | D=D2 | T=T-24 | efeito: sem bloqueia também exige auditoria (gate) | «**Efeito:** reprovação sem achado `bloqueia` (ex.: *"não consigo medir"*) abre o ciclo 4 e, pelo gate, também exige a auditoria.»
dec-69 [2e3e785981dc] CONTEXTO | D=- | T= | M-05 | «Se o dono quer nova auditoria mais adiante, isso **não** está decidido aqui — é M-05, aberta.»
dec-70 [062b899e9090] CONTEXTO | D=- | T= |  | «Fecha M-10.»
dec-71 [08a74108b25c] DERIVAÇÃO DECLARADA | D=D4 | T=T-25 | quem auditou não conserta | «- **T-25** `[acrésc]` **O conserto da máquina** — *"Quem auditou não conserta (§C7.4-bis)»
dec-72 [187ba052671a] DERIVAÇÃO DECLARADA | D=D4 D5 | T=T-25 | registro + gate | «o conserto fica registrado no mesmo arquivo do parecer, e sem esse registro o inspetor também não libera o ciclo 4."* Dá executor e lugar ao *"consert»
dec-73 [6cef160040c8] CONTEXTO | D=- | T= | lacuna declarada | «**Não** diz quem atesta que o conserto consertou nem quanto a espera pode durar»
dec-74 [2ec1cad94c92] CONTEXTO | D=- | T= |  | «isso fica em M-04, aberta.»
dec-75 [9bac6fca8f62] CONTEXTO | D=- | T= |  | «Fecha M-04 em parte.»
dec-76 [10f785ce9f7e] CONTEXTO | D=- | T= |  | «*As dez peças do plano §4:* **M-01** T-21 · **M-02** aberta · **M-03** T-22 · **M-04** parte T-25, resto aberto · **M-05** aberta (pergunta ao dono) ·»
dec-77 [4c4eb8615721] CONTEXTO | D=- | T= |  | «As abertas estão **nomeadas com dono** em `pendencias.md` → `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS`.»
dec-78 [5d599fc4e833] CONTEXTO | D=- | T= |  | «*Fora deste bloco, com dono — classe (b) do plano §3.3:* V-07 `validador-mestre:100`, V-08 `critico-adversarial:3,6`, V-09 `avaliador-mapas:17`, V-10 »
dec-79 [391a52fc0d11] CONTEXTO | D=- | T= | KPI | «*KPI (§C3):* `blocks_completed` 167 → 168, recontado da `origin/main` (`fc3363e3`); métricas de teste carregadas com nota (§C3.3); `mvp_*` intocados; »
```

## Apêndice B — tabela completa do item 3 (`item3.py … all`, objeto 7ad08690; frases idênticas nos dois contratos aparecem uma vez com os rótulos juntos)

```
N por arquivo: {'CLAUDE': 87, 'AGENTS': 90, 'DEC': 26} · N total = 203
por classe: {'FORA DO CAMINHO': 146, 'INDEPENDENTE': 37, 'PRÉ-CONDIÇÃO SEM SAÍDA': 8, 'ESPERA DO DONO': 12}
CLAUDE [a3ea16b04c48] FORA DO CAMINHO (auto: A1) |  | «> papel que o `AGENTS.md` tinha para o Codex** e preserva **a mesma lógica de execução por»
CLAUDE+AGENTS [24de86d53252] FORA DO CAMINHO (auto: A2) |  | «> **Decisão do dono (2026-07-28, registrada em `agent-orchestration/controle/decisoes.md` — `D-INTEROP-CLAUDE-CODEX`):**»
CLAUDE+AGENTS [7936ac25a778] FORA DO CAMINHO (auto: A1) |  | «> - **Alterou um, altera o outro no mesmo trabalho** (mesmo bloco, commit e PR) para toda regra»
CLAUDE+AGENTS [a6ad724b2aad] FORA DO CAMINHO (auto: A1) |  | «Os protótipos `*.dc.html` deste pacote são **fonte de verdade de UX/visual e de lógica de interação** (steppers, validações, fluxos, estados), **subordinados** às fontes 1–2 para **domínio, permissão e regra de negócio**.»
CLAUDE+AGENTS [12b5c746eb2a] INDEPENDENTE | §A2: conflito entre fontes que bloqueia → pare e peça validação; não depende de reprovação nem de ciclo | «Se bloquear, **pare e peça validação**.»
CLAUDE+AGENTS [d6062584df10] FORA DO CAMINHO (auto: A1) |  | «Tudo materialmente relevante (produto, arquitetura, permissão, alçada, UX, execução, rastreabilidade) vai para **arquivo/estrutura operacional** — não fica só no chat nem só no corpo do PR.»
CLAUDE+AGENTS [09e35d583bed] FORA DO CAMINHO (auto: A1) |  | «Manter rastreabilidade · preservar organização por **módulos e domínios** · registrar decisões e pendências em `controle/` · **não esconder conflitos** · separar **fato de hipótese** · escalar para documentação/skill especializada em vez de improvisar.»
CLAUDE+AGENTS [7092881a6882] FORA DO CAMINHO (auto: A2) |  | «Onde se MEDE — a ref alvo, nunca a árvore da sessão (decisão do dono, 2026-09-08, `D-MEDIR-NA-REF-ALVO`)»
CLAUDE+AGENTS [5e514032e8ec] FORA DO CAMINHO | narrativa de contaminação de gate | «Numa rodada só, esse caminho produziu **três contaminações**: o `inspetor-de-terreno-da-junta` recebeu um item mandando bloquear por um `§C7.1-quater` **que não existia em ref nenhuma**; o `porteiro-pos-merge` recebeu um **corpo de agente pré-merge**; e o orqu»
CLAUDE+AGENTS [e29f513711a6] FORA DO CAMINHO | regra de voto: norma inexistente não se aplica; não interrompe bloco | «- **Norma citada que não existe na ref julgada não se aplica.** Bloquear por cláusula que não está escrita é reprovação por construção — a patologia que a auditoria de 2026-08-28 mediu em **11 de 16** bloqueantes.»
CLAUDE+AGENTS [9b4cb0c919ae] FORA DO CAMINHO (auto: A1) |  | «**Não são código de produção para copiar.** Recrie essas telas no ambiente já existente:»
CLAUDE+AGENTS [b42e6212b090] FORA DO CAMINHO (auto: A1) |  | «- **Backend** → **Node.js + TypeScript**, REST `/api/v1`, Prisma + PostgreSQL, Redis, monólito modular multi-tenant (Outbox para eventos)»
CLAUDE+AGENTS [1112d7e0cde1] FORA DO CAMINHO (auto: A1) |  | «| `support.js` | Runtime só para abrir os `.dc.html` (não portar) |»
CLAUDE+AGENTS [9b503f2f4501] FORA DO CAMINHO (auto: A1) |  | «Para **ler a lógica**: abra o `.dc.html` como texto.»
CLAUDE+AGENTS [332fadf7354f] FORA DO CAMINHO (auto: A1) |  | «7. **Offline-first no mobile:** escrita vai para fila local e sincroniza depois (§6).»
CLAUDE+AGENTS [bd562b9068ea] FORA DO CAMINHO (auto: A1) |  | «Shell: sidebar 236px (navy) + topbar 60px; colapsa para 74px (labels somem, ícones centralizados, badges permanecem).»
CLAUDE+AGENTS [d1848ed0b9bb] FORA DO CAMINHO (auto: A1) |  | «Persistência local para fila de sync/flags offline.»
CLAUDE+AGENTS [7283066d048c] FORA DO CAMINHO | verde da junta = merge; humano audita depois (pró-continuidade) | «Verde da junta = merge (autonomia por juntas, §C7); o humano audita a posteriori pelo history.»
CLAUDE+AGENTS [eeda7d11e945] FORA DO CAMINHO (auto: A2) |  | «8. **PORTEIRO PÓS-MERGE — o gate do próximo start (decisão do dono, 2026-08-12, `D-PORTEIRO-POS-MERGE`).** Concluído o merge, nasce o agente `porteiro-pos-merge` (Fable por contrato).»
CLAUDE+AGENTS [36732f7389bd] INDEPENDENTE | porteiro pós-merge entre blocos; não depende de reprovação/ciclo | «Ele **revalida** o que foi entregue — promessa do PR × diff real, contagens **reexecutadas** (não copiadas), KPI com `merge_commit`/ `approved_head` preenchidos, ata da junta, pendências abertas/fechadas conferidas por amostragem, limpeza §C5, e s
CLAUDE+AGENTS [2cba87e5af00] INDEPENDENTE | porteiro autoriza a próxima demanda; independente de ciclo | «Só então **autoriza o início da próxima demanda** (`LIBERADO` / `LIBERADO COM RESSALVA` / `BLOQUEADO`), e morre até o próximo merge.»
CLAUDE+AGENTS [d75c76117abe] FORA DO CAMINHO | política de KPI | «Política de KPI por PR (permanente) — **revoga a política pós-avaliação humana (2026-07-13, D-KPI-PER-PR)**»
CLAUDE+AGENTS [bd3bf3c5fa29] FORA DO CAMINHO | política de KPI revogada | «> A política antiga ("KPI só após avaliação humana em bloco `…K`") está **REVOGADA**.»
CLAUDE+AGENTS [e376b1b3ab77] FORA DO CAMINHO (auto: A2) |  | «Decisão do dono»
CLAUDE+AGENTS [352d15c197d6] FORA DO CAMINHO | humano audita a posteriori | «A junta do PR valida os números; o humano audita a posteriori pelo history.»
CLAUDE+AGENTS [5e32952c3364] FORA DO CAMINHO (auto: A2) |  | «O ARTEFATO PRINCIPAL É O `Kpis/index.html` — não os JSON** (decisão do dono, 2026-08-04, `D-KPI-INDEX-PAINEL`).»
CLAUDE+AGENTS [20a48fdd7485] FORA DO CAMINHO | o dono abre o painel | «Os JSON são a **fonte de dados**; o painel é a **entrega** — é ele que o dono abre para ver onde o projeto está.»
CLAUDE+AGENTS [9ebdeb10282a] FORA DO CAMINHO (auto: A2) |  | «2. **Política dupla REVOGADA (decisão do dono, 2026-08-12 — `D-KPI-DUPLA-REVOGADA`).** O painel de KPI do Flutter (`mobile/flutter_app/Kpis/`) foi **apagado**: existia UM painel por trilha, e manter dois em paridade manual só multiplicava o trabalho e o risco »
CLAUDE+AGENTS [2e9e967c5e50] FORA DO CAMINHO | null não bloqueia (KPI) | «`null` nesses campos na autoria **não bloqueia** (a regra antiga de bloqueio por `null` foi revogada).»
CLAUDE+AGENTS [f639ccec7805] FORA DO CAMINHO | limpeza pós-merge | «**Limpeza pós-merge OBRIGATÓRIA (disco escasso — decisão do dono, 2026-07-20).** Toda vez que um PR **merga**, além de já usar `--delete-branch` (remoto), o agente **limpa o lixo local** que cada rodada deixa — o dono está com pouco espaço em disco e não quer »
CLAUDE+AGENTS [4dc1a734ddb3] FORA DO CAMINHO | limpeza de cache | «Rodar `DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh` a cada poucos merges (ou quando o livre cair de ~10 GB): libera gradle/npm/docker sem tocar em `node_modules`, `.env` nem rastreado.»
CLAUDE+AGENTS [7349c676a142] FORA DO CAMINHO (auto: A4) |  | «Recuperou **4,85 GB** na primeira execução.»
CLAUDE+AGENTS [3c902d7079dd] FORA DO CAMINHO | armadilha do Docker | «**Armadilha do Docker no Windows:** `docker image prune` libera espaço DENTRO da VM, mas o `docker_data.vhdx` **não encolhe** — compactar exige `wsl --shutdown`, que derruba PostgreSQL/Redis; por isso fica fora do automático.»
CLAUDE+AGENTS [4aa51e8b3e64] FORA DO CAMINHO | substitui aprovação humana por PR (pró-continuidade) | «Substitui, onde aplicável, a aprovação humana por PR.»
CLAUDE+AGENTS [59847f02c43a] INDEPENDENTE | quórum por tipo de decisão (unânime-5 nas críticas); não é contagem de ciclo | «1. **Verde da junta = merge + próximo bloco.** Toda decisão que seria humana passa por **junta de agentes** (composição por bloco, ≥3): maioria simples nos blocos normais; **unânime com 5 agentes** nas decisões críticas (deploy de PROD
CLAUDE+AGENTS [cd8b5921f532] FORA DO CAMINHO | narrativa da auditoria de 28/08 | «ESCOPO DO VEREDITO E CALIBRAÇÃO POR RISCO (decisão do dono, 2026-08-28, `D-JUNTA-ESCOPO-E-CALIBRACAO`).** Dois ajustes, medidos em `agent-orchestration/omega/auditoria-juntas-2026-08-28.md` (≈155 juntas, ≈66 ciclos, 34 defeitos reais de produto pegos — e 3 blo»
CLAUDE+AGENTS [080cc40ac340] FORA DO CAMINHO | regra de escopo do voto | «**(a) Todo voto declara `escopo`, além de `gravidade`.** `dentro-do-bloco` → `bloqueia` reprova, como sempre.»
CLAUDE+AGENTS [1de7242348f0] FORA DO CAMINHO (auto: A3) |  | «`pre-existente` (a classe do achado antecede o bloco e/ou está fora do escopo permitido dele) → **não reprova**: vira **pendência nomeada com bloco dono**, e o número afetado é publicado com **N, forma e causa**.»
CLAUDE+AGENTS [df9fb0997bae] FORA DO CAMINHO (auto: A1) |  | «**Escopo declarado sem evidência é tratado como `dentro-do-bloco`.** O veto continua inteiro para o que o bloco mexeu.»
CLAUDE+AGENTS [895339bc1b76] FORA DO CAMINHO (auto: A1) |  | «**(b) Quórum por risco, agora escrito.** **Unanimidade de 3** quando o bloco toca **dinheiro, segurança, permissão ou perda de dado**; **maioria de 3** no resto; **unanimidade de 5** permanece só para as decisões críticas do item 1 (produção, dependência nova,»
CLAUDE+AGENTS [47942eaca862] FORA DO CAMINHO | §C7.1-ter(b) "Por quê": narrativa do quórum 5/5 não escrito; não interrompe bloco (surgiu pela REDE 2) | «Por quê: "invariante financeiro = 5/5" era regra **não escrita** — vivia só nos corpos dos jurados e nas atas — e reprovou quatro ciclos; e a resposta do protocolo à reprovação é escalar, o que **reduz** a 
CLAUDE+AGENTS [cac342292f27] FORA DO CAMINHO (auto: A2) |  | «INSPEÇÃO DE TERRENO ANTES DE TODA JUNTA — fail-closed (decisão do dono, 2026-08-24, `D-INSPETOR-TERRENO-JUNTA`).** Antes de a junta votar, nasce o agente `inspetor-de-terreno-da-junta` (Fable por contrato).»
CLAUDE+AGENTS [6ee1ab75f383] PRÉ-CONDIÇÃO SEM SAÍDA | §C7.1-bis (texto que o bloco ESCREVEU, V-03): do ciclo 4 em diante exige o parecer da auditoria (espera do dono, D2→D3) E, se defeituosa, o registro do conserto — ato sem executor designado, sem prazo, sem desfecho alternativo; mesma matéria de CLA-16/18 | «Ele **não julga o mérito** — julga se o TABULEI
CLAUDE+AGENTS [cf867b336615] INDEPENDENTE | inspetor antes de toda junta; não é contagem de ciclo | «**Sem o `LIBERADO` dele a junta não começa.** Por quê: três ciclos julgaram bem e falharam sempre no terreno — a contaminação entre jurados "encerrada" num ciclo voltou no seguinte, a fatia S0 faltou dois ciclos seguidos, e uma premissa falsa da ata anterior
CLAUDE+AGENTS [ad4a8ef5fa14] FORA DO CAMINHO (auto: A1) |  | «O inspetor é para a junta o que o cluster descartável é para o jurado de banco: a condição de o voto significar algo.»
CLAUDE+AGENTS [79d4c9f27fed] FORA DO CAMINHO | humano informado, não consultado (pró-continuidade) | «2. O humano é **informado** (relatório + history de KPI por PR), **não consultado** por PR.»
CLAUDE+AGENTS [06a813a78329] FORA DO CAMINHO (auto: A2) |  | «4. **Protocolo de dificuldade — SEM TETO DE CICLOS; AUDITORIA DA MÁQUINA NO CICLO 3 (decisão do dono, 2026-09-27, `D-SEM-TETO-AUDITORIA-NO-3`).** **REVOGA o `D-TETO-DOIS-CICLOS`** (2026-08-29), que por sua vez já revogara o teto de 5.»
CLAUDE+AGENTS [967fda6bd757] FORA DO CAMINHO | NEGA a parada: reprovação não para o bloco (transcreve D5) | «- **Reprovação de junta NÃO para o bloco.** Abre-se o ciclo seguinte, com os papéis recompostos pelo §C7.4-bis (quem achou ≠ quem planeja ≠ quem desenvolve), identidade nova nas cadeiras que votaram, e o registro `omega/reprovacoes/R-<entrega>-<ciclo
CLAUDE+AGENTS [21411d9dfeee] ESPERA DO DONO (D2→D3) | a auditoria que o dono mandou fazer no 3º ciclo com erro, antes de continuar; convocador nomeado (CLA-12); os dois vereditos continuam — não é teto | «- **GATILHO NO CICLO 3 — auditoria da MÁQUINA, não do bloco.** Se o ciclo 3 também produzir achado `bloqueia`, **antes de abrir o ciclo 4** é OBRIGATÓRIA 
CLAUDE+AGENTS [0937eeaaac00] ESPERA DO DONO (D2→D3) | define o disparo; UMA auditoria por bloco (o parecer serve aos seguintes) — não repete espera | «Conta o `bloqueia` que reprova o ciclo 3 — o `pre-existente` não reprova (§C7.1-ter(a)) nem abre ciclo 4 —, e a auditoria é a do ciclo 3: o parecer dela serve aos ciclos seguintes.»
CLAUDE+AGENTS [b19a7106cdf0] ESPERA DO DONO (D2→D3) | trava do inspetor sem o parecer da auditoria; convocador nomeado; saída nos dois vereditos | «O parecer vai para `omega/reprovacoes/R-<entrega>-ciclo3-auditoria.md`, com o comando executado em cada pergunta e o veredito **máquina sã** ou **máquina defeituosa**; sem ele no briefing, o `inspetor-de-terreno
CLAUDE+AGENTS [aa8a97941c15] PRÉ-CONDIÇÃO SEM SAÍDA | ramo 'máquina defeituosa → conserta-se primeiro, e então o ciclo 4 abre': o continuar depende do conserto, sem executor designado, sem prazo, sem desfecho alternativo (o ramo 'sã' é transcrição de D5) | «- **Depois da auditoria, CONTINUA-SE.** Ela é checagem de saúde da máquina, **não uma parada**: máqui
CLAUDE+AGENTS [c4af4cbce9ea] PRÉ-CONDIÇÃO SEM SAÍDA | sem o registro do conserto o inspetor não libera o ciclo 4; o texto só diz quem NÃO conserta | «Quem auditou não conserta (§C7.4-bis); o conserto fica registrado no mesmo arquivo do parecer, e sem esse registro o inspetor também não libera o ciclo 4.»
CLAUDE+AGENTS [2c44d26ab275] FORA DO CAMINHO | razão do dono (D6) — casou por 'dono' | «- **A razão do dono, nas palavras dele:** ***"se está encontrando erro está tudo certo."*** Achado é a junta funcionando.»
CLAUDE+AGENTS [d069d06f8bc0] INDEPENDENTE | §C7.5 preservado, independente de ciclo | «As **paradas imediatas irredutíveis** (§C7.5) são independentes disto e continuam valendo integralmente.»
CLAUDE+AGENTS [3ea5c937c09e] FORA DO CAMINHO (auto: A2) |  | «**SEPARAÇÃO DE PAPÉIS NA CORREÇÃO — quem acha NÃO conserta** (decisão do dono, 2026-08-17, `D-JUNTA-SEPARACAO-DE-PAPEIS`).»
CLAUDE+AGENTS [5e61808d37a9] FORA DO CAMINHO (auto: A1) |  | «(b) **quem achou é quem consertou?** — se sim, o ciclo está contaminado e a correção volta para outro agente; (c) o **planejador está usando dado podre** (premissa não medida, versão errada do arquivo, afirmação herdada e não verificada)?»
CLAUDE+AGENTS [34901924399d] INDEPENDENTE | §C7.5 paradas irredutíveis | «5. **Paradas imediatas irredutíveis (lista encolhida):** { migration destrutiva; exposição de segredo; ação irreversível em produção sem junta unânime prévia }.»
CLAUDE+AGENTS [05eb1b44ce07] INDEPENDENTE | parada antiga removida (integração externa) | «(A antiga parada por "integração externa" saiu — vira decisão de junta + PD.»
CLAUDE+AGENTS [2c697d08d618] INDEPENDENTE | parada temporária por credencial/pagamento/domínio (D-SAN-AUTONOMIA); não é ciclo | «Rodadas específicas podem somar uma parada temporária, ex.: falta de credencial/ pagamento/domínio externo na trilha de infra — ver D-SAN-AUTONOMIA em `controle/decisoes.md`.)»
CLAUDE+AGENTS [8c5f1eb54755] FORA DO CAMINHO (auto: A2) |  | «6. **Modelo do `planejador-mestre` (decisão do dono, 2026-08-11 — `D-PLANEJADOR-MODELO-FABLE`).** O `planejador-mestre` roda em **Fable por padrão**.»
CLAUDE+AGENTS [1f9650474e5c] FORA DO CAMINHO (auto: A1) |  | «E, quando houve **correção de código e o fluxo volta para ele** — o replanejamento do protocolo de dificuldade (§C7.4) e a **validação do código corrigido** — o **Fable é OBRIGATÓRIO**, não preferência: é o passo em que um plano fraco reintroduz o defeito que »
CLAUDE+AGENTS [43b08116dfcb] FORA DO CAMINHO (auto: A1) |  | «Fixado no frontmatter `model:` de `.claude/agents/planejador-mestre.md` (e no espelho `.agents/agents/`), para valer **independente do modelo da sessão**; quem invoca não precisa lembrar.»
CLAUDE+AGENTS [41b219e53633] FORA DO CAMINHO (auto: A1) |  | «Chamada de `Agent`/`Workflow` que passe `model` diferente para esse papel **contraria o contrato** — a única exceção é indisponibilidade do modelo, que vira nota no registro da junta.»
CLAUDE+AGENTS [5d25b2b01be7] INDEPENDENTE | §C7.6-bis esgotamento de modelo | «**ESGOTADO O FABLE, CAI PARA O OPUS.»
CLAUDE+AGENTS [c83b0f58f015] INDEPENDENTE | §C7.6-bis esgotamento de modelo | «ESGOTADO O OPUS, PARA (decisão do dono, 2026-09-07, ampliada em 2026-09-08 — `D-FALLBACK-MODELO-FABLE-OPUS`).** Os gates da junta e o `planejador-mestre` têm `model: fable` fixado no frontmatter.»
CLAUDE+AGENTS [29159931897f] INDEPENDENTE | §C7.6-bis | «**A escada é de dois degraus, e o terceiro é uma parada.**»
CLAUDE+AGENTS [c409d2673a41] INDEPENDENTE | §C7.6-bis | «| Opus esgotado | **PARA.** Não se desce mais um degrau |»
CLAUDE+AGENTS [eb3d9bd9e6f5] INDEPENDENTE | §C7.6-bis | «Por isso o fallback é para **um** modelo nomeado, e por isso ele **termina numa parada** em vez de continuar descendo.»
CLAUDE+AGENTS [35b064ef5be2] INDEPENDENTE | §C7.6-bis: parada por esgotamento do Opus, dono avisado; não é reprovação | «**A parada por esgotamento do Opus é da família do §C7.5** (paradas imediatas irredutíveis): o trabalho em voo é **registrado onde está** (evidência P1, votos parciais, head medido) e o dono é avisado.»
CLAUDE+AGENTS [11ff50c052bb] FORA DO CAMINHO | frontmatter fable | «**O frontmatter continua dizendo `fable`.** O fallback é do **invocador**, não do arquivo: trocar o `model:` tornaria a degradação **permanente e invisível** para a próxima sessão — exatamente o que o `D-PLANEJADOR-MODELO-FABLE` existe para impedir.»
CLAUDE+AGENTS [80e62335aafb] FORA DO CAMINHO (auto: A1) |  | «Quem caiu para Opus **volta ao Fable quando o limite renovar**.»
CLAUDE+AGENTS [9cfd2a6f3133] FORA DO CAMINHO (auto: A2) |  | «**Espelho Codex — o mapeamento, agora nomeado (decisão do dono, 2026-09-08).** O roster da conta OpenAI é **GPT-6 Astra · GPT-5.6 Sol · GPT-5.6 Terra · GPT-5.6 Luna · GPT-5.5**, em ordem decrescente de capacidade.»
CLAUDE+AGENTS [511b388fc68c] FORA DO CAMINHO | equivalência declarada pelo dono (proveniência) | «| Modelo fixado dos gates e do planejador | **Fable** | **GPT-6 Astra** — *equivalência declarada pelo dono* |»
CLAUDE+AGENTS [01970def36cf] INDEPENDENTE | §C7.6-bis | «| Abaixo disso | **PARA** | **PARA** |»
CLAUDE+AGENTS [72fa482519cb] FORA DO CAMINHO | o critério fato × derivação (proveniência) | «A linha do Astra é **fato dito pelo dono**; a do Sol é **derivada** de ele ser o degrau imediatamente abaixo no roster.»
CLAUDE+AGENTS [201aeff52f89] INDEPENDENTE | §C7.6-bis | «`Terra`, `Luna` e `GPT-5.5` **não são fallback de gate em hipótese alguma** — para eles vale a parada.»
CLAUDE+AGENTS [9c26a609aa16] FORA DO CAMINHO (auto: A2) |  | «7. **Protocolo de junta resiliente (decisão do dono, 2026-08-29 — `D-JUNTA-RESILIENTE`) — P1–P6, inline.** Toda junta, inspeção de terreno e porteiro seguem as seis normas abaixo.»
CLAUDE+AGENTS [a5c1e1b0bfbb] FORA DO CAMINHO (auto: A4) |  | «- **P2 — Voto-arquivo-primeiro.** O voto (`<cadeira>-voto.json`, mesmo diretório) é escrito **ANTES** da mensagem final; a mensagem final é **1 linha** apontando o arquivo.»
CLAUDE+AGENTS [4705962a97dc] FORA DO CAMINHO (auto: A1) |  | «Vale para pareceres de inspetor e porteiro (`.md`).»
CLAUDE+AGENTS [030b9c86593d] FORA DO CAMINHO | P3 perda de jurado | «- **P3 — Perda de jurado (emenda à R2).** Voto perdido não conta; o sucessor tem identidade nova — e: *"**Nada conta sem re-execução própria** — mas evidência **registrada em arquivo** pelo caído (P1) é **roteiro de re-execução barata**: o sucessor re-roda cad»
CLAUDE+AGENTS [adf1d497bd0a] FORA DO CAMINHO | git pull antes de abrir branch | «Antes de abrir branch: `git pull --rebase origin main`.»
CLAUDE+AGENTS [5fffbc854676] INDEPENDENTE | repo inacessível → pare e peça acesso; não é ciclo | «Não crie repositório paralelo; se o repo não estiver acessível, **pare e peça URL/acesso**.»
CLAUDE+AGENTS [ebd7917a4b89] FORA DO CAMINHO | disco | «Disco é escasso; não deixe lixo para o dono varrer.»
CLAUDE+AGENTS [ba888a0e22b9] FORA DO CAMINHO (auto: A1) |  | «Quando existir uma referência para a tela do bloco, ela é o **alvo exato**: abra no navegador e **reproduza fielmente** em React — mesma grade, mesmos tokens, mesma densidade, mesma cópia.»
CLAUDE+AGENTS [a173b5df2566] FORA DO CAMINHO (auto: A1) |  | «Onde divergirem: código vence para tokens/medidas, PNG vence para layout/intenção.»
CLAUDE+AGENTS [4313a7cb1fc2] FORA DO CAMINHO (auto: A1) |  | «Cada PNG mapeia para uma chave `screen` — ver a tabela no `screen-refs/README.md` (Web: estado `screen`+`role`; Mobile: `screen`+`serviceType`+`entregaMode`).»
AGENTS [f60424b5a235] FORA DO CAMINHO (auto: A1) |  | «> Este arquivo é o **contrato de execução para o Codex** neste repositório.»
AGENTS [d6d654376f45] FORA DO CAMINHO (auto: A1) |  | «Companheiros neste pacote (valem para os dois»
AGENTS [8e6f7e09eb1b] FORA DO CAMINHO (auto: A1) |  | «>   `scripts/sync-agent-skills.mjs` — rode-o quando criar/alterar uma skill para manter os espelhos»
AGENTS [44915b3474b4] FORA DO CAMINHO (auto: A1) |  | «- **Subagentes / papéis de junta:** os **23 papéis** que o Claude Code roda como subagentes isolados (`.claude/agents/*.md`) estão espelhados para o Codex em **`.agents/agents/*.md`** — **corpo verbatim** (as instruções e os poderes de **VETO** não sofrem drif»
DEC [316d48587c33] FORA DO CAMINHO (auto: A2) |  | «## `D-SEM-TETO-AUDITORIA-NO-3` — o teto de ciclos cai; no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)»
DEC [da876efbb53d] FORA DO CAMINHO | as palavras do dono: '… e continuaremos' (afirma continuar) | «**O que o dono decidiu, nas palavras dele:** *"vamos remover a trava de dois ciclos; se rodar três ciclos e encontrar mais erro, faremos uma auditoria na orquestração e na junta para garantir que está tudo normal e continuaremos.»
DEC [811cc074e4fc] FORA DO CAMINHO | NEGA a parada (D5) | «**O que muda.** Reprovação de junta deixa de parar o bloco.»
DEC [88ddfaa3d107] ESPERA DO DONO (D2→D3) | gatilho no ciclo 3 antes do 4 | «No lugar do teto entra um gatilho de natureza diferente: **no ciclo 3 com achado `bloqueia`, audita-se a orquestração e a junta antes do ciclo 4** — a máquina, não o bloco.»
DEC [fd36e9fe1f90] FORA DO CAMINHO | narrativa do #393 | «Foi o próprio `B-GOV-MANDATO` que mostrou a diferença: nos dois ciclos, as juntas acharam defeitos **reais e medidos por mutação** — a trava que só via bullets, o guard que testava uma réplica em vez do artefato, e o conserto do `approved_head` que não tinha t»
DEC [0b31c70bd7c0] FORA DO CAMINHO | argumento CONTRA parar por contagem | «Parar ali por contagem descartaria uma máquina que estava funcionando.»
DEC [6562e7502678] FORA DO CAMINHO | contexto atribuído ao dono (T-17) | «**Contexto medido que o dono tinha na mão ao decidir.** `B-GOV-MANDATO` ciclo 1 REPROVADO 2×1, ciclo 2 REPROVADO 2×1.»
DEC [9d021b961b23] FORA DO CAMINHO (auto: A4) |  | «O ciclo 2 **fechou** o defeito central do ciclo 1 (0 de 51 casos sobrevivem ao artefato apagado, contra 4 de 6), fechou a pendência do basename **duas vezes com amostras independentes**, e publicou a primeira medição de cobertura que este artefato já teve: **8»
DEC [2f1d6903b0b9] FORA DO CAMINHO | narrativa | «Os bloqueantes novos são de uma classe nomeada: **o remédio nasceu com a doença** — a checagem 7, escrita no ciclo 2 para fechar o ciclo 1, é literalmente *"bullet rejeita, tabela passa"*.»
DEC [de811cbcbfab] INDEPENDENTE | O que NÃO muda: inspetor antes de cada junta, §C7.5 — nada disso é contagem de ciclo | «**O que NÃO muda.** §C7.4-bis (quem acha ≠ quem planeja ≠ quem desenvolve) · identidade nova nas cadeiras que votaram · inspetor de terreno fail-closed antes de cada junta · quórum por risco (§C7.1-ter(b)) · junta com ata regis
DEC [3d4cf2f35573] FORA DO CAMINHO (auto: A1) |  | «Classe repetida sem informação nova é o sinal de não-convergência, e é isso que a auditoria do ciclo 3 existe para examinar.»
DEC [e4f6f9d8ac20] ESPERA DO DONO (D2→D3) | aplicação ao #393 no ciclo 3 | «Como o ciclo 3 é exatamente o do gatilho, se ele produzir achado `bloqueia` a auditoria da máquina é obrigatória antes do ciclo 4.»
DEC [ba0262126203] FORA DO CAMINHO | meta da emenda | «**Nada abaixo muda o que o dono decidiu.** O que remove regra é consistência; o que acrescenta está numerado na sequência das T-01…T-20 do plano (§2), para a cadeira C1 julgar uma a uma contra as palavras do dono.»
DEC [7e6155d8c948] FORA DO CAMINHO | narrativa V-04 | «- **V-04** `inspetor-de-terreno-da-junta`, **só o item 2.2** (+ espelho `.agents/`, regenerado por `sync-agent-agents.mjs`): a mesma troca, por **exceção escrita** do plano §3.3(a) — era o único remanescente que bloquearia **por construção** a junta 3 do #393.»
DEC [e5b866028862] FORA DO CAMINHO | rótulo de declaração | «*Elaborações NOVAS desta emenda — continuam a numeração do plano; nenhuma é palavra do dono:*»
DEC [32bcb174712f] ESPERA DO DONO (D2→D3) | T-21 declarada: trava + convocação | «- **T-21** `[acrésc]` **A trava e a convocação** — adotada a opção §4.2(ii) do plano, declarada aqui como **mecanismo do transcritor**: o inspetor, no item 2.2 e no §C7.1-bis, não libera junta de ciclo 4 ou seguinte sem o parecer da auditoria; *"O orquestrador»
DEC [e6075a8d08d0] ESPERA DO DONO (D2→D3) | efeito da trava: junta do 4, não o planejamento | «**Efeito, dito para não ser descoberto:** o gate é o último ponto em que a ausência é detectável por máquina — ele trava a **junta** do ciclo 4, não o planejamento dele; a regra continua sendo *"antes de abrir o ciclo 4"*.»
DEC [5b3c6e23f7e9] FORA DO CAMINHO (auto: A1) |  | «- **T-22** `[acrésc]` **O registro e a forma do veredito** — o parecer vai para `omega/reprovacoes/R-<entrega>-ciclo3-auditoria.md` (o registro `R-*` que já existe), com o comando executado em cada pergunta e o veredito **máquina sã** ou **máquina defeituosa**»
DEC [8c1716db8c5d] ESPERA DO DONO (D2→D3) | T-24 declarada: disparo | «- **T-24** `[interp]` **O disparo, sem ambiguidade** — *"Conta o `bloqueia` que reprova o ciclo 3 — o `pre-existente` não reprova (§C7.1-ter(a)) nem abre ciclo 4 —, e a auditoria é a do ciclo 3: o parecer dela serve aos ciclos seguintes."* Não é regra nova: é »
DEC [3683ee0fedf8] ESPERA DO DONO (D2→D3) | a trava exige a auditoria também em reprovação sem bloqueia — ainda a MESMA auditoria única | «**Efeito:** reprovação sem achado `bloqueia` (ex.: *"não consigo medir"*) abre o ciclo 4 e, pelo gate, também exige a auditoria.»
DEC [2e3e785981dc] FORA DO CAMINHO | pergunta ao dono em aberto (M-05); nada espera a resposta | «Se o dono quer nova auditoria mais adiante, isso **não** está decidido aqui — é M-05, aberta.»
DEC [94c21ee3d0ac] PRÉ-CONDIÇÃO SEM SAÍDA | T-25 declarada: registro do conserto trava o ciclo 4 | «- **T-25** `[acrésc]` **O conserto da máquina** — *"Quem auditou não conserta (§C7.4-bis); o conserto fica registrado no mesmo arquivo do parecer, e sem esse registro o inspetor também não libera o ciclo 4."* Dá executor e lugar ao *"conserta-se a m
DEC [08b2e20e1414] PRÉ-CONDIÇÃO SEM SAÍDA | o próprio texto declara a lacuna: não diz quem atesta nem quanto a espera pode durar (M-04) | «**Não** diz quem atesta que o conserto consertou nem quanto a espera pode durar — isso fica em M-04, aberta.»
DEC [10f785ce9f7e] FORA DO CAMINHO | índice das peças; 'pergunta ao dono' sem espera | «*As dez peças do plano §4:* **M-01** T-21 · **M-02** aberta · **M-03** T-22 · **M-04** parte T-25, resto aberto · **M-05** aberta (pergunta ao dono) · **M-06** aberta · **M-07** T-23 · **M-08** V-03/V-04 · **M-09** aberta · **M-10** T-24.»
DEC [4c4eb8615721] FORA DO CAMINHO (auto: A3) |  | «As abertas estão **nomeadas com dono** em `pendencias.md` → `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS`.»
DEC [5d599fc4e833] FORA DO CAMINHO (auto: A3) |  | «*Fora deste bloco, com dono — classe (b) do plano §3.3:* V-07 `validador-mestre:100`, V-08 `critico-adversarial:3,6`, V-09 `avaliador-mapas:17`, V-10 `agente-fabrica:8` e V-11 `EXECUTION_MODEL.md:273–278`, pré-existentes por data (2026-07-08 a 2026-08-15), sem»
```

## Apêndice C — os scripts, para re-execução comando a comando (P3)

### `props.py`
```python
# -*- coding: utf-8 -*-
# REGRA DE QUEBRA (publicada):
#  R1 inicio de bullet (linha que casa ^\s*- ) ou de item numerado, ou paragrafo (linha em branco), abre proposicao nova;
#  R2 fim de frase: (?<=[.?!])\s+ seguido de maiuscula / aspas / asterisco / crase / parentese;
#  R3 ';' , '→' e travessao ' — ' quebram SE E SO SE os DOIS lados (ate o delimitador vizinho) tem verbo proprio.
#  Verbo = token (sem acento, minusculo) que casa: infinitivo (ar|er|ir|or)$ fora de lista de substantivos em -or/-ar |
#          enclise \w+-(se|lo|la|los|las) | forma finita gerada por conjugacao regular (pres/pret/imperf/fut/cond/subj 3s,3p)
#          de uma lista de LEMAS publicada | forma irregular de lista fechada publicada.
import re, sys, unicodedata

def sa(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c)).lower()

LEMAS = ("abrir acabar achar acontecer acrescentar adiar adotar afirmar afrouxar aguardar alcancar alterar apagar apensar "
         "aplicar aprovar articular assumir atestar atribuir auditar aumentar avaliar avisar bastar bloquear buscar caber cair "
         "chamar checar cobrar comecar conduzir conferir consertar conservar considerar consumir contar continuar contradizer "
         "convergir convocar corrigir cortar criar cumprir custar datar decidir declarar deixar derrubar descartar descobrir "
         "desenhar desenvolver detectar devolver dispensar disparar distinguir dizer entrar enumerar enviar escalar escrever "
         "esgotar esperar examinar executar exigir existir explicar faltar fechar ficar fixar funcionar gastar garantir gerar "
         "herdar implementar implicar impor impedir incluir informar interromper julgar lancar legalizar legislar ler levar "
         "liberar limitar listar manter mandar marcar medir merecer mostrar mudar nascer negar nomear numerar obrigar ocupar "
         "olhar operar ordenar parar passar perder perguntar permitir prescrever preservar prever produzir proibir provar "
         "publicar quebrar querer reabrir reativar receber recompor reconhecer registrar reintroduzir relatar remover repetir "
         "reprovar resolver responder restabelecer retomar revogar rodar sair saber seguir sentir servir sobrar somar "
         "substituir sumir surgir tocar tornar tratar travar trazer trocar usar valer ver verificar vigiar virar votar").split()
IRREG = ("e eh sao era eram foi foram sera serao seria seja sejam esta estao estava estavam estara esteja tem tinha tinham "
         "tera teria tenha ha havia houve haja vai vao ia iria fara faz fazem fez fizeram faria pode podem podia poderia "
         "possa diz dizem disse dizia dira da dao deu dava daria poe pos poria vem veio vira ve viu cobre cobrem mede medem "
         "pede serve servem sai saem cai caem conduz produz traz trouxe impoe quer quis sabe cabe vale valem").split()

def conj(l):
    f = {l}
    r = l[:-2]
    if l.endswith('ar'):
        f |= {r+'a', r+'am', r+'ou', r+'aram', r+'ava', r+'avam', r+'ara', r+'arao', r+'aria', r+'ariam', r+'e', r+'em'}
    elif l.endswith('er'):
        f |= {r+'e', r+'em', r+'eu', r+'eram', r+'ia', r+'iam', r+'era', r+'erao', r+'eria', r+'eriam', r+'a', r+'am'}
    elif l.endswith('ir'):
        f |= {r+'e', r+'em', r+'iu', r+'iram', r+'ia', r+'iam', r+'ira', r+'irao', r+'iria', r+'iriam', r+'a', r+'am'}
    return f

FORMS = set(IRREG)
for _l in LEMAS:
    FORMS |= conj(_l)
STOP = {'a', 'e', 'o', 'as', 'os', 'da', 'de', 'do', 'na', 'no', 'para', 'que', 'se', 'um', 'uma', 'em', 'ao', 'por',
        'mas', 'nem', 'ou', 'com', 'sem', 'nao', 'ja', 'so', 'entre', 'era', 'ha'}
NOUN_OR = {'maior', 'menor', 'anterior', 'posterior', 'interior', 'exterior', 'valor', 'autor', 'setor', 'fator', 'favor',
           'ator', 'melhor', 'pior', 'auditor', 'orquestrador', 'transcritor', 'inspetor', 'planejador', 'desenvolvedor',
           'primeiro', 'lugar', 'par', 'mar', 'bar', 'nivel', 'destinatario', 'seguir'}

def has_verb(s):
    toks = re.findall(r"[\w\-]+", sa(re.sub(r'`[^`]*`', ' X ', s)))
    for t in toks:
        if t in STOP:
            continue
        if t in FORMS:
            return True
        if re.fullmatch(r'\w{3,}(ar|er|ir|or)', t) and t not in NOUN_OR:
            return True
        if re.fullmatch(r'\w+-(se|lo|la|los|las)', t):
            return True
    return False

def split_units(text):
    units = []
    cur = []
    for line in text.split('\n'):
        if re.match(r'^\s*$', line):
            if cur:
                units.append(' '.join(cur)); cur = []
            continue
        if re.match(r'^\s*(- |\d+(-bis)?\. |## |\*[^*])', line) and cur:
            units.append(' '.join(cur)); cur = []
        cur.append(line.strip())
    if cur:
        units.append(' '.join(cur))
    return units

def split_sent(u):
    # R2: fim de frase; NAO quebra depois de numero de item isolado ("4.", "12.")
    return [s for s in re.split(r'(?<!^\d\.)(?<!^\d\d\.)(?<=[.?!])\s+(?=[\*"“`(A-ZÁÉÍÓÚÂÊÔÃÕÇ])', u) if s.strip()]

def _split_on(s, pat, left_bound, right_bound):
    parts = re.split('(' + pat + ')', s)
    segs = [parts[0]]; dels = []
    for i in range(1, len(parts), 2):
        dels.append(parts[i]); segs.append(parts[i+1])
    out = [segs[0]]
    for k, (d, seg) in enumerate(zip(dels, segs[1:])):
        left_near = re.split(left_bound, segs[k])[-1]      # segmento vizinho imediato à esquerda
        right_near = re.split(right_bound, seg)[0]         # segmento vizinho imediato à direita
        if has_verb(left_near) and has_verb(right_near):
            out.append(seg)
        else:
            out[-1] = out[-1] + d + seg
    return out

def split_delims(s):
    # R3a: ';' e travessão ' — ' (orações inteiras, condicionais inclusas)
    out = []
    for piece in _split_on(s, r';\s+|\s+—\s+', r'$^', r'$^'):
        # R3b: '→' só quebra se o vizinho imediato à esquerda (limitado por : ; — →) E o à direita tiverem verbo
        out += _split_on(piece, r'\s+→\s+', r':\s+|;\s+|\s+—\s+|\s+→\s+', r';\s+|\s+—\s+|\s+→\s+')
    return out

def propositions(text):
    P = []
    for u in split_units(text):
        for s in split_sent(u):
            for p in split_delims(s):
                if p.strip():
                    P.append(p.strip())
    return P

def extract_item4(src):
    L = src.split('\n')
    st = [i for i, l in enumerate(L) if re.match(r'^4\. \*\*Protocolo de dificuldade', l)]
    en = [i for i, l in enumerate(L) if re.match(r'^4-bis\.', l)]
    assert len(st) == 1 and len(en) == 1, (st, en)
    return st[0]+1, en[0], '\n'.join(L[st[0]:en[0]])

def extract_entry(src):
    L = src.split('\n')
    st = [i for i, l in enumerate(L) if l.startswith('## ') and 'D-SEM-TETO-AUDITORIA-NO-3' in l]
    assert len(st) == 1
    e = st[0]+1
    while e < len(L) and not (L[e].startswith('## ') or L[e] == '---'):
        e += 1
    return st[0]+1, e, '\n'.join(L[st[0]:e])

if __name__ == '__main__':
    W = sys.argv[1]; mode = sys.argv[2]
    if mode == 'print':
        for lab, fn, ex in [('CLAUDE-item4', 'CLAUDE.md.obj', extract_item4), ('AGENTS-item4', 'AGENTS.md.obj', extract_item4),
                            ('decisoes-entrada', 'decisoes.md.obj', extract_entry)]:
            src = open(W+'/'+fn, 'rb').read().decode('utf-8')
            a, b, t = ex(src); P = propositions(t)
            print('#### %s linhas %d..%d · N=%d' % (lab, a, b, len(P)))
            if lab != 'AGENTS-item4':
                for i, p in enumerate(P, 1):
                    print('%s-%02d | %s' % (lab[:3], i, p))
```
### `item1.py`
```python
# -*- coding: utf-8 -*-
import sys, re, unicodedata, difflib
LIT = "vamos remover a trava de dois ciclos, se rodar tres ciclos e encontrar mais erro, faremos uma auditoria na orquestração e na junta para gantir esta tudo normal e continuaremos. se esta encontrando erro esta tudo certo"
MARK = ['trava de dois','tres ciclos','auditoria na orquestra','tudo normal','continuaremos','encontrando erro','tudo certo']
# Lista DECLARADA de correções (cada entrada = lugar onde o transcritor trocou palavra do dono). Aplicada ao LITERAL normalizado.
CORR_FULL = [ (['gantir'],['garantir'],'gantir -> garantir (digitação)'),
              (['garantir','esta'],['garantir','que','esta'],'∅ -> que (completude gramatical; declarada; NÃO é tipográfica estrita)') ]
CORR_STRICT = CORR_FULL[:1]
def strip_acc(s): return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
def norm(s):
    s = strip_acc(s).lower(); s = re.sub(r'[^\w\s]', ' ', s).replace('_',' ')
    return re.sub(r'\s+', ' ', s).strip()
def nmarks(s): n = norm(s); return [m for m in MARK if m in n]
def apply_corr(toks, corr):
    t = list(toks)
    for a,b,_ in corr:
        i=0
        while i <= len(t)-len(a):
            if t[i:i+len(a)]==a: t[i:i+len(a)]=b; i+=len(b)
            else: i+=1
    return t
LT = norm(LIT).split()
def ops_between(A, C):
    sm = difflib.SequenceMatcher(None, A, C, autojunk=False)
    bl = [b for b in sm.get_matching_blocks() if b.size>0]
    if not bl: return None
    a0=bl[0].a; a1=bl[-1].a+bl[-1].size; c0=bl[0].b; c1=bl[-1].b+bl[-1].size
    sm2 = difflib.SequenceMatcher(None, A[a0:a1], C[c0:c1], autojunk=False)
    ops=[(t,' '.join(A[a0+i1:a0+i2]),' '.join(C[c0+j1:c0+j2])) for t,i1,i2,j1,j2 in sm2.get_opcodes() if t!='equal']
    return dict(a0=a0,a1=a1,ops=ops, cov=' '.join(A[a0:a1]), pre=' '.join(A[:a0]), suf=' '.join(A[a1:]))
def classify(cit):
    C = norm(cit).split()
    raw = ops_between(LT, C)
    full = ops_between(apply_corr(LT, CORR_FULL), C)
    strict = ops_between(apply_corr(LT, CORR_STRICT), C)
    return raw, full, strict
def spans(text):
    out=[]
    for p in re.split(r'\n\s*\n', text):
        j = re.sub(r'\s*\n\s*(>\s*)?', ' ', p)
        qpos = [m.start() for m in re.finditer(r'["“”]', j)]
        for k in range(len(qpos)-1):
            s = j[qpos[k]+1:qpos[k+1]]
            if 15 <= len(s) <= 400 and len(nmarks(s))>=2: out.append(s)
    return out
if __name__=='__main__':
    for spec in sys.argv[1:]:
        label, path = spec.split('=',1)
        t = open(path,'rb').read().decode('utf-8')
        print('#### ARQUIVO', label, '(CR=%d)' % t.count('\r'))
        for i,l in enumerate(t.split('\n'),1):
            if len(nmarks(l))>=2:
                n=norm(l); rot = 'nas palavras dele' if 'palavras dele' in n else ('VERBATIM' if 'verbatim' in n else ('literal' if 'literal' in n else '-'))
                print('  LINE %s:%d | rótulo=%s | %s' % (label,i,rot,l.strip()[:200]))
        seen=set()
        for s in spans(t):
            if s in seen: continue
            seen.add(s)
            raw, full, strict = classify(s)
            print('  SPAN | byte-substring-do-literal=%s | "%s"' % (s in LIT, s[:260]))
            print('     cobre do literal: [%s] · omitido: prefixo=[%s] sufixo=[%s]' % (raw['cov'], raw['pre'], raw['suf']))
            for o in raw['ops']: print('     op-bruta %s: [%s] -> [%s]' % o)
            print('     CONTEUDO após lista completa (%d): %s' % (len(full['ops']), full['ops']))
            print('     CONTEUDO após lista estrita (só gantir) (%d): %s' % (len(strict['ops']), strict['ops']))
```
### `item1-mut.py`
```python
import sys, re
sys.path.insert(0, sys.argv[1])
import item1 as I
W=sys.argv[1]
src = open(W+'/decisoes.md.obj','rb').read().decode('utf-8')
lines = src.split('\n')
st = [i for i,l in enumerate(lines) if l.startswith('## ') and 'D-SEM-TETO-AUDITORIA-NO-3' in l]
assert len(st)==1, st
s = st[0]; e = s+1
while e < len(lines) and not (lines[e].startswith('## ') or lines[e]=='---'): e+=1
entry = '\n'.join(lines[s:e])
print('entrada: linhas %d..%d (1-based %d..%d), N linhas=%d' % (s,e-1,s+1,e,e-s))
open(W+'/entry.pristine','wb').write(entry.encode('utf-8'))
def run(txt, tag):
    res=[]
    for sp in I.spans(txt):
        raw, full, strict = I.classify(sp)
        if raw is None: continue
        # CONTEUDO = ops brutas que a lista declarada não explica
        cont = 0 if not raw['ops'] else len(full['ops'])
        res.append((sp[:90], len(raw['ops']), cont, full['ops']))
    print(tag, '→ spans=%d' % len(res))
    for r in res: print('   span="%s…" ops-brutas=%d CONTEUDO=%d %s' % r)
    return res
run(entry, 'PRISTINO')
for tag, a, b in [('M1a continuaremos->pararemos','continuaremos','pararemos'), ('M1b orquestração->orquestracao','orquestração','orquestracao')]:
    n = entry.count(a)
    mut = entry.replace(a, b)
    open(W+'/entry.'+tag.split()[0],'wb').write(mut.encode('utf-8'))
    print('%s: ocorrências da âncora=%d · diff pristino×mutante não-vazio=%s' % (tag, n, mut!=entry))
    run(mut, tag)
```
### `item1-diff.py`
```python
import sys, re
sys.path.insert(0, sys.argv[1]); import item1 as I
W=sys.argv[1]
d = open(W+'/diff-U0.txt','rb').read().decode('utf-8')
cur=None; ln=0; hits=[]; added={}
for l in d.split('\n'):
    if l.startswith('+++ '): cur=l[6:] if l.startswith('+++ b/') else l[4:]; continue
    m = re.match(r'@@ -\S+ \+(\d+)(?:,(\d+))? @@', l)
    if m: ln=int(m.group(1)); continue
    if l.startswith('+') and not l.startswith('+++'):
        added.setdefault(cur,[]).append((ln,l[1:]))
        if len(I.nmarks(l))>=2: hits.append((cur,ln,l[1:].strip()[:170]))
        ln+=1
print('arquivos com linhas adicionadas:', len(added), '· linhas adicionadas total:', sum(len(v) for v in added.values()))
print('linhas adicionadas com >=2 marcadores: N=%d' % len(hits))
for h in hits: print('  %s:%d | %s' % h)
# spans por arquivo sobre as linhas adicionadas contíguas
print('--- spans (citações entre aspas, >=2 marcadores) nas linhas adicionadas, com CONTEUDO pela lista declarada')
for f,v in added.items():
    txt = '\n'.join(x[1] for x in v)
    for sp in dict.fromkeys(I.spans(txt)):
        raw, full, strict = I.classify(sp)
        cont = 0 if not raw['ops'] else len(full['ops'])
        print('  %s | byte=%s | ops-brutas=%d | CONTEUDO=%d %s | "%s"' % (f, sp in I.LIT, len(raw['ops']), cont, full['ops'] if cont else '', sp[:120]))
```
### `item2.py`
```python
# -*- coding: utf-8 -*-
# Item 2 — "nem mais": enumeração GERADA + classificação FAIL-CLOSED (chave = md5 do texto da proposição)
# Classe final de proposição com base ADDS é DINÂMICA: DERIVAÇÃO DECLARADA só se TODAS as T-ids dela estão
# declaradas no texto julgado CORRENTE (entrada de decisoes.md); senão DERIVAÇÃO APRESENTADA COMO DECISÃO.
import sys, re, hashlib, json
sys.path.insert(0, sys.argv[1])
import props as P

W = sys.argv[1]

def key(p):
    return hashlib.md5(re.sub(r'[\s.;:,]+$', '', re.sub(r'\s+', ' ', p).strip()).encode('utf-8')).hexdigest()[:12]

# (base, D-clauses, T-ids, nota curta) por índice na ordem gerada no OBJETO — convertido em dict por md5 abaixo
CLA = {
 1: ('TRANS', 'D1', ['T-20'], 'cabeçalho "decisão do dono" + REVOGA D-TETO = D1; "NO CICLO 3" = T-20'),
 2: ('ADDS', 'D1 D5 D6', ['T-02'], 'universaliza D1: nenhum teto por contagem'),
 3: ('ADDS', 'D5', ['T-03', 'T-04'], 'reprovação não para; identidade nova nas que VOTARAM (herança alterada)'),
 4: ('ADDS', 'D2 D3', ['T-05', 'T-06', 'T-07', 'T-08', 'T-09'], 'gatilho bloqueia; OBRIGATÓRIA antes do 4; máquina; por execução; (a)'),
 5: ('ADDS', 'D3 D4', ['T-09'], '(b)'),
 6: ('ADDS', 'D3 D4', ['T-09'], '(c)'),
 7: ('ADDS', 'D3 D4', ['T-09', 'T-23'], '(d) reescrita'),
 8: ('ADDS', 'D3 D4', ['T-09'], '(e)'),
 9: ('ADDS', 'D3', ['T-10'], 'quem conduz (ator restrito)'),
 10: ('ADDS', 'D2', ['T-24'], 'disparo: o bloqueia que reprova'),
 11: ('ADDS', 'D2', ['T-24'], 'pre-existente não abre ciclo 4; uma auditoria, serve aos seguintes'),
 12: ('ADDS', 'D3', ['T-21'], 'orquestrador convoca (ator)'),
 13: ('ADDS', 'D3', ['T-22'], 'registro R-*-ciclo3-auditoria + veredito sã/defeituosa'),
 14: ('ADDS', 'D3 D5', ['T-21'], 'gate do inspetor: sem parecer não libera junta ≥4 (condição)'),
 15: ('TRANS', 'D4 D5', ['T-11'], 'CONTINUA-SE; não é parada; sã → ciclo 4 abre'),
 16: ('ADDS', 'D4 D5', ['T-11'], 'defeituosa → conserta primeiro, então ciclo 4 (condição)'),
 17: ('ADDS', 'D4', ['T-25'], 'quem auditou não conserta'),
 18: ('ADDS', 'D4 D5', ['T-25'], 'registro do conserto + gate (condição)'),
 19: ('TRANS', 'D6', ['T-01', 'T-12'], 'citação D6 (normalizada) + "Achado é a junta funcionando"'),
 20: ('ADDS', 'D6', ['T-12'], 'glosa: vigilância não é o bloco que reprova 3x'),
 21: ('ADDS', 'D3 D6', ['T-12'], 'glosa: fabricando achados / deixando de ver os reais'),
 22: ('CTX', '-', ['T-13'], 'risco declarado'),
 23: ('CTX', 'D2 D3', ['T-13'], 'argumento "melhor dirigido"'),
 24: ('ADDS', '-', ['T-13'], 'DEVER novo: orquestrador relata a cada ciclo (obrigação)'),
 25: ('ADDS', 'D1', ['T-14'], 'fábrica por ciclo (limite dos 2 removido)'),
 26: ('ADDS', '-', ['T-15'], '§C7.5 preservado'),
}
DEC = {
 1: ('ADDS', 'D1', ['T-02'], 'título: o teto de ciclos cai'),
 2: ('ADDS', 'D2 D3', ['T-20', 'T-07'], 'título: no ciclo 3 audita-se a MÁQUINA (decisão do dono)'),
 3: ('TRANS', 'D1', ['T-01'], 'citação'), 4: ('TRANS', 'D2 D3 D4 D5', ['T-01'], 'citação'), 5: ('TRANS', 'D6', ['T-01'], 'citação'),
 6: ('TRANS', 'D1', ['T-02'], 'REVOGA D-TETO'),
 7: ('ADDS', 'D1', ['T-02'], 'não há mais teto por contagem'),
 8: ('ADDS', 'D5', ['T-03'], 'reprovação deixa de parar o bloco'),
 9: ('ADDS', 'D2 D3', ['T-05', 'T-06', 'T-07'], 'gatilho bloqueia antes do 4; máquina não bloco'),
 10: ('CTX', '-', [], 'ponteiro para o texto operante'),
 11: ('CTX', 'D6', ['T-16'], 'argumento'), 12: ('CTX', 'D6', ['T-16'], 'argumento'), 13: ('CTX', '-', ['T-16'], 'argumento'),
 14: ('CTX', '-', ['T-16'], 'argumento'), 15: ('CTX', 'D6', ['T-16'], 'argumento'),
 16: ('CTX', '-', ['T-17'], 'estado epistêmico atribuído ao dono (não verificável)'),
 17: ('CTX', '-', ['T-17'], 'números do #393'), 18: ('CTX', '-', ['T-17'], 'classe nomeada'), 19: ('CTX', '-', ['T-17'], 'checagem 7'),
 20: ('ADDS', '-', ['T-18', 'T-04', 'T-15'], 'O que NÃO muda (inclui identidade nova nas que votaram)'),
 21: ('CTX', '-', ['T-13'], 'risco'), 22: ('CTX', '-', ['T-13'], 'custo de escalar'),
 23: ('ADDS', '-', ['T-13'], 'DEVER: orquestrador relata a cada ciclo'),
 24: ('ADDS', 'D3', ['T-13'], 'propósito atribuído à auditoria: examinar não-convergência'),
 25: ('ADDS', 'D1 D2', ['T-19'], 'B-GOV-MANDATO retoma no ciclo 3'),
 26: ('ADDS', 'D2 D3', ['T-19', 'T-05', 'T-06'], 'aplicação ao #393'),
 27: ('CTX', '-', [], 'emenda: quem escreve'), 28: ('CTX', '-', [], 'emenda'), 29: ('CTX', '-', [], 'emenda'),
 30: ('CTX', '-', [], 'afirmação "nada abaixo muda o que o dono decidiu"'), 31: ('CTX', '-', [], 'referência T-01…T-20'),
 32: ('CTX', '-', [], 'V-*'), 33: ('CTX', 'D1', [], 'V-01'), 34: ('CTX', '-', [], ''), 35: ('CTX', 'D1 D5', [], 'V-02'),
 36: ('CTX', '-', [], ''), 37: ('CTX', '-', [], ''), 38: ('CTX', '-', [], 'V-03'), 39: ('CTX', '-', [], 'V-03 → T-21'),
 40: ('CTX', '-', [], 'V-04'), 41: ('CTX', '-', [], ''), 42: ('CTX', '-', [], ''), 43: ('CTX', '-', [], 'V-05'), 44: ('CTX', '-', [], 'V-06'),
 45: ('CTX', '-', [], 'cabeçalho da declaração'),
 46: ('CTX', '-', ['T-21'], 'rótulo'), 47: ('ADDS', 'D3 D5', ['T-21'], 'gate'), 48: ('ADDS', 'D3', ['T-21'], 'convoca'),
 49: ('CTX', '-', [], ''), 50: ('CTX', '-', [], ''), 51: ('CTX', '-', ['T-21'], 'efeito'), 52: ('CTX', '-', [], ''), 53: ('CTX', '-', [], ''),
 54: ('CTX', '-', [], ''),
 55: ('ADDS', 'D3', ['T-22'], 'registro'), 56: ('ADDS', 'D3', ['T-22'], 'quem decide o veredito'), 57: ('ADDS', 'D3', ['T-22'], 'quórum 1'),
 58: ('CTX', '-', [], ''), 59: ('CTX', '-', ['T-23'], 'rótulo'), 60: ('ADDS', 'D3', ['T-23'], '(d)'), 61: ('CTX', '-', [], ''),
 62: ('ADDS', 'D3', ['T-23'], 'pré-voo futuro'), 63: ('CTX', '-', [], ''), 64: ('CTX', '-', [], ''),
 65: ('ADDS', 'D2', ['T-24'], 'disparo'), 66: ('ADDS', 'D2', ['T-24'], 'disparo'), 67: ('CTX', '-', [], ''),
 68: ('ADDS', 'D2', ['T-24'], 'efeito: sem bloqueia também exige auditoria (gate)'), 69: ('CTX', '-', [], 'M-05'), 70: ('CTX', '-', [], ''),
 71: ('ADDS', 'D4', ['T-25'], 'quem auditou não conserta'), 72: ('ADDS', 'D4 D5', ['T-25'], 'registro + gate'),
 73: ('CTX', '-', [], 'lacuna declarada'), 74: ('CTX', '-', [], ''), 75: ('CTX', '-', [], ''), 76: ('CTX', '-', [], ''),
 77: ('CTX', '-', [], ''), 78: ('CTX', '-', [], ''), 79: ('CTX', '-', [], 'KPI'),
}
STOPV = re.compile(r'aguard|\bpar(a|e|ar|ada|ou)\b.*\bbloco\b|\bbloco\b.*\bpar(a|e|ar|ada|ou)\b|dossi|suspend|\bpara\b(?= o bloco)', re.I)
CYC = re.compile(r'ciclo\s*\d|reprov', re.I)

def declared_set(entry_text, plan_text):
    d = set()
    m = re.search(r'Elaborações NOVAS desta emenda[^\n]*nenhuma é palavra do dono', entry_text)
    if m:
        for t in re.findall(r'\*\*(T-2[1-5])\*\*', entry_text[m.end():]):
            d.add(t)
    if re.search(r'T-01…T-20 do plano', entry_text):
        for t in re.findall(r'^\| (T-\d\d) \|', plan_text, re.M):
            if int(t[2:]) <= 20:
                d.add(t)
    return d

def build_tables(item4_text, entry_text):
    return P.propositions(item4_text), P.propositions(entry_text)

def classify_all(props_item4, props_entry, keymap, declared):
    out = []
    for lab, props in (('CLA', props_item4), ('dec', props_entry)):
        for i, p in enumerate(props, 1):
            k = key(p)
            if k in keymap:
                base, D, T, note = keymap[k]
                if base == 'ADDS':
                    miss = [t for t in T if t not in declared]
                    cls = 'DERIVAÇÃO DECLARADA' if not miss else 'DERIVAÇÃO APRESENTADA COMO DECISÃO (não declaradas: %s)' % ','.join(miss)
                else:
                    cls = {'TRANS': 'TRANSCRIÇÃO', 'CTX': 'CONTEXTO', 'CONTRA': 'CONTRADIÇÃO'}[base]
            else:
                D, T, note = '?', [], ''
                cls = 'NÃO CLASSIFICADA (fail-closed)'
                if STOPV.search(p) and CYC.search(p):
                    cls += ' · candidata a CONTRADIÇÃO (vocabulário de parada + condição de ciclo/reprovação)'
            out.append((lab, i, k, cls, D, ','.join(T), note, p))
    return out

if __name__ == '__main__':
    mode = sys.argv[2]
    src_c = open(W + '/CLAUDE.md.obj', 'rb').read().decode('utf-8')
    src_d = open(W + '/decisoes.md.obj', 'rb').read().decode('utf-8')
    plan = open(W + '/plano.obj', 'rb').read().decode('utf-8')
    a, b, item4 = P.extract_item4(src_c)
    ea, eb, entry = P.extract_entry(src_d)
    pi, pe = build_tables(item4, entry)
    assert len(pi) == 26 and len(pe) == 79, (len(pi), len(pe))
    keymap = {}
    for i, p in enumerate(pi, 1):
        keymap[key(p)] = CLA[i]
    for i, p in enumerate(pe, 1):
        keymap[key(p)] = DEC[i]
    if mode == 'pristine':
        dec = declared_set(entry, plan)
        print('declaradas no texto corrente: %d → %s' % (len(dec), sorted(dec)))
        res = classify_all(pi, pe, keymap, dec)
    else:
        # modo mutante: argv[3] = arquivo item4 mutado ou '-' ; argv[4] = arquivo entrada mutada ou '-'
        mi = open(sys.argv[3], 'rb').read().decode('utf-8') if sys.argv[3] != '-' else item4
        me = open(sys.argv[4], 'rb').read().decode('utf-8') if sys.argv[4] != '-' else entry
        dec = declared_set(me, plan)
        print('declaradas no texto corrente: %d → %s' % (len(dec), sorted(dec)))
        pim, pem = build_tables(mi, me)
        print('N item4 = %d (pristino 26) · N entrada = %d (pristino 79)' % (len(pim), len(pem)))
        res = classify_all(pim, pem, keymap, dec)
    from collections import Counter
    c = Counter(r[3].split(' (')[0].split(' ·')[0] for r in res)
    print('contagem por classe:', dict(c))
    for r in res:
        if mode == 'pristine' or not (r[3].startswith('TRANSCRIÇÃO') or r[3].startswith('CONTEXTO') or r[3] == 'DERIVAÇÃO DECLARADA'):
            print('%s-%02d [%s] %s | D=%s | T=%s | %s | «%s»' % (r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7][:150]))
```
### `item3.py`
```python
# -*- coding: utf-8 -*-
# Item 3(b) — frases com vocabulário de parada / espera / chamada ao dono, GERADAS da fonte.
# PADRÃO DECLARADO (sobre texto sem acento, minúsculo) — o mínimo do corpo + EXTENSÃO minha
# (libera|trava|bloque|espera|interromp|imped|nao abre/comeca/libera), porque a espera do gate se escreve
# 'não libera', e só com o mínimo a frase do gate casava apenas por 'para' preposição e caía no A1:
PAT = r"\bpar(a|e|ar|ada|adas|ou|am|em)\b|suspend\w*|aguard\w*|dossi\w*|\bdonos?\b|\bhuman\w*|interven\w*|antes de abrir|\bprimeir\w*|so entao|\blibera\w*|\btrav(a|am|ar|ou)\b|\bbloque\w*|\bespera\w*|interromp\w*|\bimped\w*|nao (abre|comeca|libera)"
# REGRAS AUTOMÁTICAS DE 'FORA DO CAMINHO' (publicadas; tudo o que não cai nelas vai para classificação MANUAL,
# chaveada por md5 do texto — texto novo ou alterado = NÃO CLASSIFICADA, fail-closed):
#  A1 'para' preposição: o casamento é o token 'para' minúsculo no original, NÃO precedido de
#     {nao, bloco, junta, se, que, trabalho, rodada, ciclo, ele, ela} e NÃO em maiúsculas;
#  A2 'dono' de proveniência: dentro de 'decisao/decisoes do dono' (com ou sem 'aprovada(s) explicitamente pelo');
#  A3 'dono' = responsável por tarefa: 'bloco dono', 'com dono', 'sem dono', 'dono nomeado', 'tem dono', 'seu dono', 'dono do quorum';
#  A4 'primeiro/a' ordinal: não seguido (em até 6 tokens) de 'e entao|so entao|depois|antes'.
import re, sys, hashlib, unicodedata
sys.path.insert(0, sys.argv[1])
import props as P

def sa(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c)).lower()

def units(text):
    out = []; cur = []
    for line in text.split('\n'):
        if re.match(r'^\s*$', line) or re.match(r'^\s*```', line):
            if cur: out.append(' '.join(cur)); cur = []
            continue
        if re.match(r'^\s*\|', line):
            if cur: out.append(' '.join(cur)); cur = []
            out.append(line.strip()); continue
        if re.match(r'^\s*(- |\d+(-bis|-ter)?\. |#+ |> )', line) and cur:
            out.append(' '.join(cur)); cur = []
        cur.append(line.strip())
    if cur: out.append(' '.join(cur))
    return out

def sentences(text):
    S = []
    for u in units(text):
        S += P.split_sent(u)
    return [s.strip() for s in S if s.strip()]

def key(s):
    return hashlib.md5(re.sub(r'[\s.;:,]+$', '', re.sub(r'\s+', ' ', s).strip()).encode('utf-8')).hexdigest()[:12]

PREP_BLOCK = {'nao', 'bloco', 'junta', 'se', 'que', 'trabalho', 'rodada', 'ciclo', 'ele', 'ela'}

def auto(s):
    n = sa(s)
    ms = list(re.finditer(PAT, n))
    # REDE 2 (acrescentada depois que a minha mutação N2c furou a A2): condição de ciclo/reprovação + restrição
    # ao seguir → sempre MANUAL, com ou sem o vocabulário do PAT
    if re.search(r'ciclo \d|\d+[oa]? ciclo|reprovad|reprova', n) and re.search(r'\b(so|somente|apenas|ate|salvo|exceto|desde que|condicion\w*)\b', n):
        return 'MANUAL'
    if not ms:
        return None
    reasons = []
    toks = re.findall(r"[\w\-]+", n)
    otoks = re.findall(r"[\w\-]+", s)
    for m in ms:
        w = m.group(0)
        ctx_before = n[:m.start()].split()[-1:] if n[:m.start()].split() else ['']
        prev = re.sub(r'[^\w]', '', ctx_before[0])
        if w == 'para':
            orig = s[m.start():m.end()] if len(s) == len(n) else None
            upper = ('PARA' in s) and re.search(r'\bPARA\b', s) is not None
            if prev not in PREP_BLOCK and not upper:
                reasons.append('A1'); continue
            return 'MANUAL'
        if w in ('dono', 'donos'):
            before = n[max(0, m.start()-60):m.start()]
            after = n[m.end():m.end()+20]
            # A2 CORRIGIDA: só a FORMA DE PROVENIÊNCIA — "decisão do dono" seguida de data/ID/parêntese/travessão/fecho
            if (re.search(r'decis(ao|oes) (do|pelo) $', before) and re.match(r'^(\s*[,(]\s*\d{4}-|\s*\(|\s*\)|\s*—|\s*\*\*\s*\(|\s*$)', after)) or re.search(r'aprovad\w* explicitamente pelo $', before):
                reasons.append('A2'); continue
            if re.search(r'(bloco|com|sem|tem|seu) $', before) or re.match(r'^ (nomead|do quorum)', after):
                reasons.append('A3'); continue
            return 'MANUAL'
        if w.startswith('primeir'):
            after = ' '.join(n[m.end():].split()[:6])
            if not re.search(r'\b(e entao|so entao|depois|antes)\b', after):
                reasons.append('A4'); continue
            return 'MANUAL'
        return 'MANUAL'
    return 'FORA DO CAMINHO (auto: %s)' % ','.join(sorted(set(reasons)))

def gen(label, text):
    res = []
    for s in sentences(text):
        a = auto(s)
        if a is None:
            continue
        res.append((label, key(s), a, s))
    return res

if __name__ == '__main__':
    W = sys.argv[1]; mode = sys.argv[2]
    srcs = {}
    for lab, fn in (('CLAUDE', 'CLAUDE.md.obj'), ('AGENTS', 'AGENTS.md.obj')):
        srcs[lab] = open(W + '/' + fn, 'rb').read().decode('utf-8')
    d = open(W + '/decisoes.md.obj', 'rb').read().decode('utf-8')
    _, _, srcs['DEC'] = P.extract_entry(d)
    # substituições de modo mutante: argv[3..] = LAB=arquivo
    for spec in sys.argv[3:]:
        lab, path = spec.split('=', 1)
        srcs[lab] = open(path, 'rb').read().decode('utf-8')
    allres = []
    for lab in ('CLAUDE', 'AGENTS', 'DEC'):
        allres += gen(lab, srcs[lab])
    import json, os
    manual = {}
    mp = W + '/item3-manual.json'
    if os.path.exists(mp):
        manual = json.load(open(mp, encoding='utf-8'))
    from collections import Counter
    c = Counter(); per = Counter()
    rows = []
    for lab, k, a, s in allres:
        if a == 'MANUAL':
            if k in manual:
                cls = manual[k][0]; why = manual[k][1]
            else:
                cls = 'NÃO CLASSIFICADA (fail-closed)'; why = ''
        else:
            cls = a; why = ''
        c[cls.split(' (')[0]] += 1; per[lab] += 1
        rows.append((lab, k, cls, why, s))
    print('N por arquivo:', dict(per), '· N total =', sum(per.values()))
    print('por classe:', dict(c))
    for r in rows:
        if mode == 'all' or not r[2].startswith('FORA DO CAMINHO (auto'):
            print('%s [%s] %s | %s | «%s»' % (r[0], r[1], r[2], r[3], r[4][:260]))
```
### `item3-manual.json`
```json
{
 "12b5c746eb2a": [
  "INDEPENDENTE",
  "§A2: conflito entre fontes que bloqueia → pare e peça validação; não depende de reprovação nem de ciclo"
 ],
 "5e514032e8ec": [
  "FORA DO CAMINHO",
  "narrativa de contaminação de gate"
 ],
 "e29f513711a6": [
  "FORA DO CAMINHO",
  "regra de voto: norma inexistente não se aplica; não interrompe bloco"
 ],
 "7283066d048c": [
  "FORA DO CAMINHO",
  "verde da junta = merge; humano audita depois (pró-continuidade)"
 ],
 "36732f7389bd": [
  "INDEPENDENTE",
  "porteiro pós-merge entre blocos; não depende de reprovação/ciclo"
 ],
 "2cba87e5af00": [
  "INDEPENDENTE",
  "porteiro autoriza a próxima demanda; independente de ciclo"
 ],
 "d75c76117abe": [
  "FORA DO CAMINHO",
  "política de KPI"
 ],
 "bd3bf3c5fa29": [
  "FORA DO CAMINHO",
  "política de KPI revogada"
 ],
 "352d15c197d6": [
  "FORA DO CAMINHO",
  "humano audita a posteriori"
 ],
 "20a48fdd7485": [
  "FORA DO CAMINHO",
  "o dono abre o painel"
 ],
 "2e9e967c5e50": [
  "FORA DO CAMINHO",
  "null não bloqueia (KPI)"
 ],
 "f639ccec7805": [
  "FORA DO CAMINHO",
  "limpeza pós-merge"
 ],
 "4dc1a734ddb3": [
  "FORA DO CAMINHO",
  "limpeza de cache"
 ],
 "3c902d7079dd": [
  "FORA DO CAMINHO",
  "armadilha do Docker"
 ],
 "4aa51e8b3e64": [
  "FORA DO CAMINHO",
  "substitui aprovação humana por PR (pró-continuidade)"
 ],
 "59847f02c43a": [
  "INDEPENDENTE",
  "quórum por tipo de decisão (unânime-5 nas críticas); não é contagem de ciclo"
 ],
 "cd8b5921f532": [
  "FORA DO CAMINHO",
  "narrativa da auditoria de 28/08"
 ],
 "080cc40ac340": [
  "FORA DO CAMINHO",
  "regra de escopo do voto"
 ],
 "6ee1ab75f383": [
  "PRÉ-CONDIÇÃO SEM SAÍDA",
  "§C7.1-bis (texto que o bloco ESCREVEU, V-03): do ciclo 4 em diante exige o parecer da auditoria (espera do dono, D2→D3) E, se defeituosa, o registro do conserto — ato sem executor designado, sem prazo, sem desfecho alternativo; mesma matéria de CLA-16/18"
 ],
 "cf867b336615": [
  "INDEPENDENTE",
  "inspetor antes de toda junta; não é contagem de ciclo"
 ],
 "79d4c9f27fed": [
  "FORA DO CAMINHO",
  "humano informado, não consultado (pró-continuidade)"
 ],
 "967fda6bd757": [
  "FORA DO CAMINHO",
  "NEGA a parada: reprovação não para o bloco (transcreve D5)"
 ],
 "21411d9dfeee": [
  "ESPERA DO DONO (D2→D3)",
  "a auditoria que o dono mandou fazer no 3º ciclo com erro, antes de continuar; convocador nomeado (CLA-12); os dois vereditos continuam — não é teto"
 ],
 "0937eeaaac00": [
  "ESPERA DO DONO (D2→D3)",
  "define o disparo; UMA auditoria por bloco (o parecer serve aos seguintes) — não repete espera"
 ],
 "b19a7106cdf0": [
  "ESPERA DO DONO (D2→D3)",
  "trava do inspetor sem o parecer da auditoria; convocador nomeado; saída nos dois vereditos"
 ],
 "aa8a97941c15": [
  "PRÉ-CONDIÇÃO SEM SAÍDA",
  "ramo 'máquina defeituosa → conserta-se primeiro, e então o ciclo 4 abre': o continuar depende do conserto, sem executor designado, sem prazo, sem desfecho alternativo (o ramo 'sã' é transcrição de D5)"
 ],
 "c4af4cbce9ea": [
  "PRÉ-CONDIÇÃO SEM SAÍDA",
  "sem o registro do conserto o inspetor não libera o ciclo 4; o texto só diz quem NÃO conserta"
 ],
 "2c44d26ab275": [
  "FORA DO CAMINHO",
  "razão do dono (D6) — casou por 'dono'"
 ],
 "d069d06f8bc0": [
  "INDEPENDENTE",
  "§C7.5 preservado, independente de ciclo"
 ],
 "34901924399d": [
  "INDEPENDENTE",
  "§C7.5 paradas irredutíveis"
 ],
 "05eb1b44ce07": [
  "INDEPENDENTE",
  "parada antiga removida (integração externa)"
 ],
 "2c697d08d618": [
  "INDEPENDENTE",
  "parada temporária por credencial/pagamento/domínio (D-SAN-AUTONOMIA); não é ciclo"
 ],
 "5d25b2b01be7": [
  "INDEPENDENTE",
  "§C7.6-bis esgotamento de modelo"
 ],
 "c83b0f58f015": [
  "INDEPENDENTE",
  "§C7.6-bis esgotamento de modelo"
 ],
 "29159931897f": [
  "INDEPENDENTE",
  "§C7.6-bis"
 ],
 "c409d2673a41": [
  "INDEPENDENTE",
  "§C7.6-bis"
 ],
 "eb3d9bd9e6f5": [
  "INDEPENDENTE",
  "§C7.6-bis"
 ],
 "35b064ef5be2": [
  "INDEPENDENTE",
  "§C7.6-bis: parada por esgotamento do Opus, dono avisado; não é reprovação"
 ],
 "11ff50c052bb": [
  "FORA DO CAMINHO",
  "frontmatter fable"
 ],
 "511b388fc68c": [
  "FORA DO CAMINHO",
  "equivalência declarada pelo dono (proveniência)"
 ],
 "01970def36cf": [
  "INDEPENDENTE",
  "§C7.6-bis"
 ],
 "72fa482519cb": [
  "FORA DO CAMINHO",
  "o critério fato × derivação (proveniência)"
 ],
 "201aeff52f89": [
  "INDEPENDENTE",
  "§C7.6-bis"
 ],
 "030b9c86593d": [
  "FORA DO CAMINHO",
  "P3 perda de jurado"
 ],
 "adf1d497bd0a": [
  "FORA DO CAMINHO",
  "git pull antes de abrir branch"
 ],
 "5fffbc854676": [
  "INDEPENDENTE",
  "repo inacessível → pare e peça acesso; não é ciclo"
 ],
 "ebd7917a4b89": [
  "FORA DO CAMINHO",
  "disco"
 ],
 "da876efbb53d": [
  "FORA DO CAMINHO",
  "as palavras do dono: '… e continuaremos' (afirma continuar)"
 ],
 "811cc074e4fc": [
  "FORA DO CAMINHO",
  "NEGA a parada (D5)"
 ],
 "88ddfaa3d107": [
  "ESPERA DO DONO (D2→D3)",
  "gatilho no ciclo 3 antes do 4"
 ],
 "fd36e9fe1f90": [
  "FORA DO CAMINHO",
  "narrativa do #393"
 ],
 "0b31c70bd7c0": [
  "FORA DO CAMINHO",
  "argumento CONTRA parar por contagem"
 ],
 "6562e7502678": [
  "FORA DO CAMINHO",
  "contexto atribuído ao dono (T-17)"
 ],
 "2f1d6903b0b9": [
  "FORA DO CAMINHO",
  "narrativa"
 ],
 "de811cbcbfab": [
  "INDEPENDENTE",
  "O que NÃO muda: inspetor antes de cada junta, §C7.5 — nada disso é contagem de ciclo"
 ],
 "e4f6f9d8ac20": [
  "ESPERA DO DONO (D2→D3)",
  "aplicação ao #393 no ciclo 3"
 ],
 "ba0262126203": [
  "FORA DO CAMINHO",
  "meta da emenda"
 ],
 "7e6155d8c948": [
  "FORA DO CAMINHO",
  "narrativa V-04"
 ],
 "e5b866028862": [
  "FORA DO CAMINHO",
  "rótulo de declaração"
 ],
 "32bcb174712f": [
  "ESPERA DO DONO (D2→D3)",
  "T-21 declarada: trava + convocação"
 ],
 "e6075a8d08d0": [
  "ESPERA DO DONO (D2→D3)",
  "efeito da trava: junta do 4, não o planejamento"
 ],
 "8c1716db8c5d": [
  "ESPERA DO DONO (D2→D3)",
  "T-24 declarada: disparo"
 ],
 "3683ee0fedf8": [
  "ESPERA DO DONO (D2→D3)",
  "a trava exige a auditoria também em reprovação sem bloqueia — ainda a MESMA auditoria única"
 ],
 "2e3e785981dc": [
  "FORA DO CAMINHO",
  "pergunta ao dono em aberto (M-05); nada espera a resposta"
 ],
 "94c21ee3d0ac": [
  "PRÉ-CONDIÇÃO SEM SAÍDA",
  "T-25 declarada: registro do conserto trava o ciclo 4"
 ],
 "08b2e20e1414": [
  "PRÉ-CONDIÇÃO SEM SAÍDA",
  "o próprio texto declara a lacuna: não diz quem atesta nem quanto a espera pode durar (M-04)"
 ],
 "10f785ce9f7e": [
  "FORA DO CAMINHO",
  "índice das peças; 'pergunta ao dono' sem espera"
 ],
 "47942eaca862": [
  "FORA DO CAMINHO",
  "§C7.1-ter(b) \"Por quê\": narrativa do quórum 5/5 não escrito; não interrompe bloco (surgiu pela REDE 2)"
 ]
}
```

## Limpeza (1 linha)
Removi **só o que criei**: worktree `C:/Users/AMP/w-jst1` (`git worktree remove --force`, ec=0, confirmado ausente) e `$SCRATCH/c1-394-work` + 4 logs `c1-*`; nada rastreado tocado; base viva nunca tocada. **Resíduo alheio, só reportado:** `$SCRATCH/c1-jst/` (1ª instância da C1 — não criei, não apaguei), `jst3/`, `stc2/`, `c3-394-*`, `parcial-queda-1207/`; worktrees `w-devs2`, `w-devs393`, `w-devt393`, `w-e4` (E4), `w-mandato` (andou para c32f77b5 durante a minha medição), `w-teto`, `.claude/worktrees/{b04a,b11,gov-descuido,gov-elenco}`; `w-jst2` sumiu do `worktree list` durante a minha medição (não fui eu). Head re-conferido no fim: 7ad08690bad5e9cbc4d34fe6905b14c6ac634046 (não andou).

VOTO: APROVADO — a citação coincide com o literal em conteúdo (3 ocorrências no texto julgado; correções só ortográficas/gramaticais e listadas), as 105 proposições enumeradas da fonte não trazem derivação vestida de decisão nem contradição, e as seis cláusulas estão cobertas sem condição escondida sobre o "continuaremos" (vermelho-controle de cada item publicado)
