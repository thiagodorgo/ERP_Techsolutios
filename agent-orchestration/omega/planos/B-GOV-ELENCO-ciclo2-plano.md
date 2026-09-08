> ## EMENDA 1 — escopo acrescentado POR ORDEM DO DONO, no meio do ciclo (2026-09-07)
>
> Depois de este plano ser escrito e **antes** de qualquer implementação, o dono deu uma ordem nova:
> *"o limite do fable está acabando, DOCUMENTE que quando o limite do fable acabar usar o opus, exatamente
> espelhado no codex com os modelos correspondentes da openai."* Decisão do dono é fonte **§A1.1** e não passa
> por junta.
>
> **O que entrou** (`D-FALLBACK-MODELO-FABLE-OPUS`): `CLAUDE.md` §C7.6-bis + espelho em `AGENTS.md`, e a linha
> de fallback no preâmbulo dos **4 agentes com `model: fable`**. Mais `P-GOV-MODELO-CODEX-SEM-NOME`, porque o
> repositório nunca registrou qual modelo o Codex usa e nomear um por suposição num contrato seria hipótese
> vendida como fato (§A6).
>
> **Por que está aqui, em destaque, e não diluído no corpo:** este escopo **não** nasceu dos achados do ciclo
> 1 e **não** é a correção que o §C7.4-bis manda entregar a outro agente — é ordem nova, sobre matéria
> ortogonal. Foi executado pelo orquestrador, e é isso que a junta do ciclo 2 tem de saber para não o julgar
> como alargamento silencioso (§C4) nem como o orquestrador consertando o próprio defeito.
>
> **O que a junta do ciclo 2 deve conferir nesta emenda:** que o frontmatter dos 4 agentes **continua dizendo
> `fable`** (o fallback é do invocador — trocar o arquivo tornaria a degradação permanente e invisível), que
> `CLAUDE.md` e `AGENTS.md` dizem a mesma coisa, e que a lacuna do ID OpenAI está **registrada como lacuna**,
> não preenchida por chute.

---

# B-GOV-ELENCO — plano do CICLO 2 (a última tentativa — `D-TETO-DOIS-CICLOS`)

> **Tipo:** governança · **Base:** `origin/main` = `fe2748c8` · **Head insumo (reprovado 3×0):** `c520b80f`
> (código/elenco do ciclo 1: `25c0112a`) · **Planejador:** `planejador-mestre` em **Fable** (§C7.6 — obrigatório
> na revalidação de código corrigido) · **Data:** 2026-09-07 · **Evidência deste plano (P1):**
> `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/PLANO-C2-evidencia.md`.
>
> **Quem escreve isto não achou nada e não implementa nada** (§C7.4-bis). Este plano nasce dos três votos, das
> três evidências, da homologação nº 1 do assento e do plano do ciclo 1 — todos lidos no worktree
> `.claude/worktrees/gov-elenco`, **nunca** na árvore principal (`demo/investidor`, que carrega um rascunho
> desatualizado do mesmo contrato: o dado podre do §C7.4-bis(c)).
>
> **Regra dura:** se a junta reprovar o ciclo 2, o bloco **PARA** e vira dossiê ao dono. **Não existe ciclo 3.**
> Por isso este plano faz duas coisas que o do ciclo 1 não fez: (i) **fatia** o bloco para que a parte já provada
> não fique refém da parte que foi reprovada (§1), e (ii) escreve **todo critério de aceite com a mutação que o
> deixa vermelho** (§7) — o ciclo 1 caiu por afirmação que não sobreviveu à execução ("§C7.4-bis respeitado por
> construção", produzida por instrumento cego).

---

## §0 · Objetivo · ator · fluxo · contrato · modelagem

**Objetivo.** Fechar os cinco bloqueantes do ciclo 1 (`C3-A1`, `C3-A4`, `C2-02`, `C2-01`-textual, `C1-01`) e
tratar-ou-deferir-com-justificativa os ALTA/MÉDIA/BAIXA (`C3-A2`, `C2-06`, `C2-03`, `C2-04`, `C3-A3/A5/A6/A7`,
`C1-02/03/04`), **sem** tocar caminho proibido, **sem** dependência nova e **sem** reintroduzir a classe de
defeito que a junta acabou de pegar (afirmação sem instrumento que a sustente).

**Ator.** Quatro agentes, nenhum acumulando papel (§2): quem achou (as três cadeiras do ciclo 1) · quem
planejou (este arquivo) · quem desenvolve (identidade nova, não-orquestrador) · quem julga (cadeiras novas).

**Fluxo origem → destino.**
`c520b80f` (branch `chore/gov-auditoria-elenco`, REPROVADO 3×0) → **fatia A** (`PR-A`: faxina + auditor corrigido +
KPI) → junta A → merge → porteiro → **fatia B** (`PR-B`: assento permanente redesenhado) → crítico ataca o plano
da B → junta B → assento homologa (nota de conflito) → colagem pré-merge → merge → porteiro. Qualquer
reprovação = **parada daquela fatia** com dossiê; a outra fatia segue o próprio destino (§1.4).

**Contrato.** Este bloco não tem rota HTTP, payload nem código de status de API. Os seus "contratos" são dois,
e os dois são executáveis:
1. **Exit code do auditor** `scripts/audit-agents-skills.mjs`: `0` = nenhum BLOQUEIA · `1` = ≥1 BLOQUEIA ·
   **`2` = erro de uso** (flag desconhecida, `--ref` sem valor, ref inexistente) — sem stack trace. Saída
   `--json` equivalente ao texto em achados e `ec`.
2. **Desfecho do assento permanente**: lista **fechada de sete linhas** + **cláusula de fechamento** (qualquer
   outra string equivale a `NÃO HOMOLOGADO — JUNTA INVÁLIDA`) + **teto de UMA não-homologação por ciclo**, com
   artefato contável por comando (§6).

**Modelagem.** Nenhuma: sem model, sem migration, sem banco, sem `Decimal`/`timestamptz`/delete lógico. O que
o template de plano pede nesse campo **não se aplica** e é dito aqui para a junta não procurar.

---

## §1 · A pergunta obrigatória: misturar ou fatiar? — **FATIAR**, e por quê

O ciclo 1 misturou (a) uma **faxina de elenco/skills** que passou inteira — A1–A10 verdes nas três cadeiras,
118 caminhos sem um fora do §5, 32/32 renames provados por hash de blob, 15/15 aposentadorias verificadas — com
(b) o **desenho do assento permanente** + o **instrumento de medição**, que foram reprovados.

### 1.1 · Caminho M — continuar misturando (um PR, uma junta)

| Custo | Medida |
|---|---|
| Overhead de junta | **1×** (inspetor + 3 cadeiras + assento + porteiro) |
| Cirurgia de git | **zero** — a branch já é o superset |
| **Risco de reféns** | **total**: se a junta reprovar QUALQUER critério da parte (b), a parte (a) — 5 skills que **nunca carregaram** em `main`, 15 especialistas mortos, índice do Codex falso — **morre junto** e vai para o dossiê |
| Probabilidade de aprovação | ≈ P(a) × P(b). (a) é determinística (hashes, contagens, mutações com `ec` esperado); (b) é **prosa de governança** julgada adversarialmente — a C2 achou **7** achados num texto cuidadoso, e uma cadeira nova acha por ângulo novo |
| Acoplamento real entre (a) e (b) | **fraco e removível**: só `MODELO_FIXADO` cita o assento (1 linha), o prefixo `cadeira-permanente-` em `JULGA()` (morre no redesenho), a seção do assento no README e 1 parágrafo do KPI |

### 1.2 · Caminho F — fatiar em A (faxina + auditor + KPI) e B (assento)

| Custo | Medida |
|---|---|
| Overhead de junta | **2×** (dois inspetores, 6 votos de mérito, 1 assento, 2 porteiros) — e exposição dobrada a quedas (~50%/sessão no postmortem de 29/08; o §C7.7 converte queda em perda parcial, não a evita) |
| Cirurgia de git | **pequena e verificável**: B = 9 arquivos inteiros + hunks aditivos em 6 + 4 arquivos compartilhados (lista exata em §5.3); A = branch atual **menos** B; a cadeira A-C1 confere por `git diff --name-status` que A não contém um caminho de B |
| Risco de reféns | **zero**: A merga por mérito próprio; B reprovada vira dossiê **só da B** |
| KPI | mesma entrega em dois PRs: `blocks_completed` sobe **uma vez** (em A); B publica entrada `B-GOV-ELENCO-B` com **162, sem incremento** — precedente medido no history: `B-O6R-07a` e `B-O6R-07a-ciclo2` ambos 158 |
| Contrato da junta A | o de `origin/main` (sem §C7.1-quater): **o assento não é convocado na A** — não está no contrato dela. Perde-se a homologação nº 2 sobre A; ganha-se não julgar a A sob uma regra que ainda está em julgamento |
| Circularidade na B | igual à do ciclo 1: o assento homologa a junta que julga o próprio texto dele. Declarada como **nota de conflito** no parecer (o ciclo 1 já fez isso) e listada em §10 como não-cobrável |

### 1.3 · Recomendação: **F — fatiar**

Decisiva é a **assimetria de risco sob "não há ciclo 3"**: a parte já provada não pode ficar refém da parte
estruturalmente mais arriscada. O pedido original do dono ("audite agente por agente, skill por skill, faça o
espelhamento, deixe o repo organizado") **é a fatia A**; o assento foi decisão do mesmo dia, mas **não é
pré-condição** para a A. A ordem é A → B porque B **edita** (`inspetor`, `porteiro`, `README`, `script`) arquivos que a
A entrega — B nasce por rebase sobre A mergeada, sem conflito de conteúdo previsível.

### 1.4 · O que fatiar NÃO compra — dito para ninguém ler como brecha

- **Não compra ciclo.** As duas fatias são **o ciclo 2 do mesmo bloco** `B-GOV-ELENCO`. Reprovação em A = parada
  da A (e B não começa — depende dela). Reprovação em B = parada da B, dossiê ao dono; A permanece mergeada.
  Nenhuma das duas tem terceira tentativa.
- **Não compra um bloco a mais no KPI** (§1.2).
- **Não muda o quórum**: unanimidade de 3 nas duas, por `D-QUORUM-B-GOV-ELENCO` (registrada, l.2020 de
  `decisoes.md`: o ciclo 2 mantém a unanimidade de 3).

---

## §2 · Papéis do §C7.4-bis no ciclo 2 — três agentes distintos, nomeados

| Papel | Quem | Inelegível para |
|---|---|---|
| **Quem ACHOU** | `validador-mestre` (C1) · `guardiao-fail-closed` (C2) · `agente-ci-doutor` (C3) · o assento (re-escopo de `C2-01`) | consertar; votar no ciclo 2 (votante do ciclo anterior — `inspetor` 3.1) |
| **Quem PLANEJOU** | `planejador-mestre` (Fable) — este arquivo | implementar; votar |
| **Quem DESENVOLVE** | **identidade nova, não-orquestrador**: um thread `Agent` de propósito geral com `Read, Write, Edit, Grep, Glob, Bash`, nomeado na ata como `dev-gov-elenco-c2` — **não** é arquivo novo em `.claude/agents/` (o bloco acabou de aposentar 15 e o C10 existe para isso) | julgar a validade de qualquer achado; votar |
| **Quem JULGA — fatia A** | `A-C1` **`agente-secops`** · `A-C2` **`inspetor-de-arnes-concorrente`** · `A-C3` **`coordenador-de-acessos`** (§9.1) | — |
| **Quem JULGA — fatia B** | `B-C1` **`agente-secops`** · `B-C2` **`coordenador-de-acessos`** · `B-C3` **`agente-dba-guardiao`** (§9.2) | — |
| **Quem ATACA o plano da B** | `critico-adversarial` (máx. 2 rodadas, antes do dev da B; **não vota** na B) | votar na B |
| **Gates** | `inspetor-de-terreno-da-junta` (A e B) · `porteiro-pos-merge` (após cada merge) | — |
| **Homologa** | `cadeira-permanente-backend-review` — **só na B** (nota de conflito obrigatória) | cadeira de mérito |
| **Orquestrador** | dispara, escreve briefing e ata, roda a colagem pré-merge | implementar; votar |

**As três perguntas do §C7.4-bis, respondidas antes de recompor a junta:**

**(a) A composição cobre a competência que os achados exigem?** Os achados são de três classes: **escopo/registro/KPI**
(C1), **enumeração fail-closed e separação de poderes** (C2), **instrumento que mede o que diz** (C3). Para a A:
`agente-secops` (competência permanente: nada fora do permitido entra, gate não afrouxa → escopo §5/§5-bis, KPI
honesto, registro); `inspetor-de-arnes-concorrente` (mede em N execuções, denominador que varia, falso-positivo/
negativo de arnês → o auditor sob mutação); `coordenador-de-acessos` (papel → permissão, **SoD** → a allowlist de
escrita e o default-deny do C4). Para a B: `agente-secops` (allowlist/else/teto no texto), `coordenador-de-acessos`
(SoD: inelegibilidade, quem escreve, teto de anulações), `agente-dba-guardiao` (aditividade da emenda, paridade
das cópias, rollback provado). Nenhuma das seis é votante do ciclo 1, planejador ou dev.

**(b) Quem achou é quem conserta?** **Não.** As três cadeiras do ciclo 1 não escrevem uma linha; o orquestrador
(achador+planejador+dev do ciclo 1) **não implementa** nem vota; o planejador (Fable) não implementa. A ata de
cada fatia registra os nomes.

**(c) O planejador está usando dado podre?** Medido, não presumido: todos os fatos deste plano foram **re-medidos
no worktree** (`PLANO-C2-evidencia.md` §1) — auditor `ec=0`/`ec=1`, regex `JULGA` 11/24, `Bash` 21/24, `display`
"161", 9 literais da enumeração, `D-QUORUM` registrada, `R-*` ausente. A árvore principal **não foi lida**.

---

## §3 · Mapa achado → correção → fatia → critério

| Achado | Grav. | O que o ciclo 2 faz | Fatia | Critérios (§7) |
|---|---|---|---|---|
| `C3-A1` `JULGA()` por prefixo, cega a `agente-*` | BLOQUEIA | **Mata `JULGA()`.** Quem pode escrever é **allowlist explícita** (`PODE_ESCREVER`, 4 nomes); todo o resto é **não-escritor por default** — o C4 deixa de perguntar "quem julga?" e passa a perguntar "quem está autorizado a escrever?" | A | A-3, A-5 |
| `C3-A2` escrita = lista fechada de 3 nomes; `Bash` em 11/11; §4.4 falso | ALTA | **Inverte a lista:** só `Read, Grep, Glob, WebFetch, WebSearch` são somente-leitura; **qualquer outra ferramenta** (MultiEdit, NotebookEdit, Task, nome desconhecido) em não-escritor = BLOQUEIA. **`Bash` = exceção NOMEADA e decidida** (`P-GOV-BASH-EM-QUEM-JULGA`): AVISO **agregado** com os N nomes. A frase "§C7.4-bis respeitado por construção" **morre**; o que se publica é: por construção para Write/Edit/MultiEdit/NotebookEdit/desconhecida; por convenção para Bash, N=18, dono nomeado | A | A-4, A-6, A-29 |
| `C3-A4` 3ª classe de falso-positivo | BLOQUEIA | Parser de cerca **por linha** (CommonMark: até 3 espaços de recuo, crase tripla ou til triplo, fecho com comprimento maior ou igual ao da abertura), code spans, comentários HTML, destino com parêntese balanceado; frontmatter com **subconjunto YAML declarado** (plain multi-linha, escalares em bloco com chomping, lista `- x`); construção fora do subconjunto = BLOQUEIA **"não consigo ler"** (recusa nomeada, nunca "sem description") | A | A-8, A-9 |
| `C2-02` três desfechos sem veredito; "não medi" roteado ao lado permitido | BLOQUEIA | Enumeração **fechada de 7 linhas** com efeito/ciclo/próximo ator por linha; `3.2`/`3.3` → `NÃO HOMOLOGADO — JUNTA INVÁLIDA`; "não consegui medir" → `NÃO HOMOLOGADO — MEDIÇÃO INCOMPLETA`; **ressalva nunca é "não medi"** | B | B-1, B-4 |
| `C2-01` textual: negação nomeia só `ANULADO` | ALTA | Todo consumidor vira **allowlist**: libera só `^HOMOLOGADO( COM RESSALVA)?:`; **cláusula de fechamento** em cada cópia; a palavra `ANULADO` some do porteiro | B | B-2, B-3 |
| `C1-01` `display "161"` × `value 162` | ALTA | `display: "162"`; FROZEN regenerado por `kpi-freeze.mjs` (`--check` verde); critério executado `value == Number(display)`; guard em `tests/` **proibido** → `P-GOV-KPI-DISPLAY-SEM-GUARD` | A | A-23, A-24 |
| `C2-06` anulação sem teto | ALTA | **Teto de UMA não-homologação por ciclo**; a segunda = `PARADA — DOSSIÊ AO DONO`; artefato = pareceres numerados `99`, `99b`…; comando de contagem no assento, no porteiro e no `CLAUDE.md` | B | B-5 |
| `C2-03` merge sem guarda no meio | ALTA | **Tratado no que cabe no §5:** colagem pré-merge (passo com artefato: `tail -n1` do parecer + hash colados na ata; porteiro confere). O gate executável exige `.github/**`/`tests/**` → **deferido** em `P-GOV-VEREDITO-SEM-PARSER` (pre-existente, D-SAN-AUTONOMIA), com justificativa em §12 | B | B-7 |
| `C2-04` trava 3.3 sem artefato | ALTA | Linha-marcador obrigatória no briefing `ASSENTO-PERMANENTE:` + dois comandos no item 3.3 do inspetor; ausência ou contagem diferente de 1 = BLOQUEADO | B | B-6 |
| `C3-A3` C10 mede peso, anuncia "encerrado" | MÉDIA | Texto do C10 passa a dizer **exatamente o que mede** (peso) e remete o critério "encerrado" a `D-APOSENTADORIA`; detecção mecânica **deferida com desenho** (`P-GOV-C10-ENCERRADO`, §12) | A | A-14, A-15 |
| `C3-A5` C9 unidirecional para skills | MÉDIA | Laço reverso para `.agents/skills/` | A | A-11 |
| `C3-A6` verde vazio | MÉDIA | Piso: 0 agentes **ou** 0 skills = BLOQUEIA `C0 alvo vazio` | A | A-12 |
| `C3-A7` `--ref` sem valor cai na árvore | BAIXA | Parser de argumentos estrito: `ec=2` + uso, sem stack trace | A | A-13 |
| `C1-02` "5 de 12" (base tinha 11) | BAIXA | Corrigido no script (l.10), no history e por **apenso** ao plano do ciclo 1 (não se reescreve o plano julgado) | A | A-25, A-27, A-29 |
| `C1-03` "6,6 KB" não reproduz | BAIXA | Idem: 24 papéis/6,0 KB no head; 23/5,4 KB na base; "3×" mantido (3,3×) | A | A-25, A-27 |
| `C1-04` tabela vazia no README | BAIXA | Tabela substituída por frase de estado (elenco efêmero: 0) | A | A-26 |
| `C1-05` nota 34/11 congelada (pre-existente) | MÉDIA | **Fechada de carona** (mesmo arquivo, mesma promessa "índice reconciliado"): adendo datado com os números do head; texto antigo preservado (§A2) | A | A-26 |
| `C2-05`/`C2-07` componentes pre-existentes | — | Ficam nas pendências já abertas (`P-GOV-BASH-EM-QUEM-JULGA` mecanismo; `P-GOV-ESPELHO-CONTRATO-SEM-GUARD`); a B **reduz as cópias** da enumeração de 9 para as que têm mecanismo ou são registro datado (§6.8) | B | B-9 |

---

## §4 · Fatia A — desenho (faxina + auditor corrigido + KPI + registro)

### 4.1 · `scripts/audit-agents-skills.mjs` — o que muda, função a função

**4.1.1 Política de escrita (substitui `JULGA()` e `FERRAMENTA_DE_ESCRITA`).**
```js
// Quem PODE escrever é exceção nomeada; todo o resto é não-escritor por default (§C7.4-bis, default-deny).
const PODE_ESCREVER = new Set(["agente-devops-provisionador", "agente-fabrica", "dev-mapas", "frontend-pixel-master"]);
const SOMENTE_LEITURA = new Set(["Read", "Grep", "Glob", "WebFetch", "WebSearch"]);
const TOLERADA_COM_AVISO = new Set(["Bash"]); // P-GOV-BASH-EM-QUEM-JULGA: escrita por shell, decisão do dono pendente
```
Regra **C4**, por agente **fora** de `PODE_ESCREVER`, para cada ferramenta `t` de `tools`: `t ∈ SOMENTE_LEITURA` → ok;
`t ∈ TOLERADA_COM_AVISO` → acumula para **um** AVISO agregado `C4-bis Bash tolerado · N papéis: a, b, c…` (o `--json`
carrega a lista); **qualquer outro `t`** → BLOQUEIA `C4 §C7.4-bis · <arquivo> · ferramenta "<t>" não é somente-leitura
e o papel não está na allowlist de escrita`. Agente em `PODE_ESCREVER`: sem C4. **C5** (`tools:` ausente): fora da
allowlist → BLOQUEIA (herda tudo); na allowlist → AVISO. **Honestidade das listas:** nome em `PODE_ESCREVER` ou em
`MODELO_FIXADO` sem arquivo correspondente → AVISO `lista cita papel inexistente`. Na A, `MODELO_FIXADO` perde a
entrada do assento (a B devolve).
*Por que allowlist no script e não chave nova no frontmatter:* medido — os 24 agentes usam só `name/description/tools/model`;
chave nova é comportamento não testado do Claude Code neste repo; a lista no script é política-como-código visível no diff.

**4.1.2 Frontmatter — subconjunto YAML lido (declarado; fora dele = recusa nomeada).**
- `chave: valor` numa linha (com ou sem aspas simples/duplas).
- `chave:` vazia seguida de linhas com recuo de 2 ou mais espaços → **plain multi-linha**: junta com espaço.
- `chave: |`, `|-`, `|+`, `>`, `>-`, `>+` seguida de bloco recuado → escalar em bloco (`|` junta com quebra, `>` com espaço).
- `chave:` seguida de linhas `  - item` → lista (usada em `tools`); `tools` aceita também a forma `a, b, c`.
- Linha em branco ou comentário `#` → ignorada. CRLF normalizado antes (mantido). BOM UTF-8 inicial removido antes de
  procurar `---` (a C3 não provou que carrega; o auditor **não** reprova por BOM, e o comentário diz isso).
- **Qualquer outra linha** (`{`, `[`, `&`, `*`, `?`, linha sem `chave:` fora de bloco) → BLOQUEIA
  `C1 frontmatter · <arquivo> · não consigo ler o frontmatter (linha N fora do subconjunto YAML lido)` e **nenhuma outra
  checagem C1–C5** é emitida para esse arquivo (recusa, não diagnóstico).

**4.1.3 C8 — o que é "fora de código".** Antes de varrer links, três remoções que preservam quebras de linha:
(i) **cercas**: abertura `^ {0,3}(crase×3+ | til×3+)`; fecho na primeira linha `^ {0,3}` com o **mesmo caractere** e
comprimento **maior ou igual** ao da abertura; sem fecho = até o fim do arquivo; (ii) **code spans**: sequência de N crases
casada com a próxima sequência de exatamente N crases (CommonMark §6.1); (iii) **comentários HTML** `<!-- … -->`. Depois,
links: `\]\(` + destino com **um nível de parêntese balanceado** `((?:[^()\s]|\([^()\s]*\))+)` + título opcional + `\)`;
ignora `http(s):`, `#`, `mailto:` e caminhos absolutos. O caminho reportado é o destino **inteiro**. **Limitação
declarada:** bloco de código por recuo de 4 espaços (sem cerca) **não** é reconhecido — prevalência 0 no head (C3 mediu).

**4.1.4 C9 bidirecional para skills.** Laço reverso: caminho em `.agents/skills/**` sem par em `.claude/skills/**` →
BLOQUEIA `C9 espelho Codex · <caminho> · órfão`.

**4.1.5 Piso (C0).** `0 agentes` **ou** `0 skills` → BLOQUEIA `C0 alvo vazio · <ref> · nada foi auditado`. Contra o commit
raiz (`0f17135a`) o auditor passa a sair `ec=1` — que é o correto.

**4.1.6 Argumentos.** Só `--ref <valor>` e `--json`. `--ref` sem valor, valor começando por `--`, flag desconhecida, ou ref
que falhe em `git rev-parse --verify --quiet <ref>^{commit}` → 1–2 linhas de uso em stderr e **`ec=2`**, sem stack trace.
`ec`: 0 limpo · 1 achado · 2 uso.

**4.1.7 C10 — texto honesto.** Regra e limiar mantidos (`> 20000` chars = BLOQUEIA; senão AVISO). O `detalhe` passa a:
`N especialistas, ~X KB de description (~T tokens) carregados em TODA sessão. Esta checagem mede PESO; o critério de
aposentadoria (bloco com ata fechada e PR mergeado) é humano — D-APOSENTADORIA-ELENCO-EFEMERO.` A frase "Jurado de bloco
ENCERRADO é aposentável" sai (era afirmação de detecção que a checagem não faz).

**4.1.8 Cabeçalho do script.** l.10: "5 de 12" → "5 de 11 (em `origin/main@fe2748c8`; a 12ª skill nasce na fatia B)";
l.12: "~11,5k tokens" → "~5,1k tokens em `fe2748c8` (~11k na árvore de trabalho da sessão, que carregava 33)".

**4.1.9 O que NÃO entra no script:** self-test embutido (a bateria de mutação vive em §7, é executada pelo dev e pela
junta, e a versão permanente vai para `tests/` quando o auditor entrar na CI — adendo a `P-GOV-AUDITOR-FORA-DA-CI`);
detecção de "bloco encerrado" (§12); qualquer checagem de KPI (domínio errado); dependência (§C7.1).

### 4.2 · KPI (`Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/app.js`)
- `metrics.blocks_completed.display` → `"162"`; a `note` perde "assento permanente instituido" (é B).
- `version` permanece `B-GOV-ELENCO`; `pr`/`merge_commit`/`approved_head` **null na autoria** (§C3.5); `pr` preenchido após `gh pr create`.
- History: a entrada `B-GOV-ELENCO` (última, ainda não mergeada) é **reescrita** para descrever só a fatia A: "5 de 12" → "5 de 11";
  "6,6 KB" → "6,0 KB no head (24 papéis); 5,4 KB na base (23)"; sem o parágrafo do assento; contagens `flutter_tests`/`backend_tests`/
  `frontend_smoke_tests` **CARREGADAS** com a nota §C3.3 (o diff não toca `src/`/`tests/` — provado por A-21).
- `node scripts/kpi-freeze.mjs` (**executar, nunca editar**) regenera o FROZEN; `node scripts/kpi-freeze.mjs --check` → `em dia`.
- **Não** se cria guard: `tests/**` é proibido → `P-GOV-KPI-DISPLAY-SEM-GUARD` (§12).

### 4.3 · `.agents/agents/README.md`
- l.5-6 e l.75: `23 agentes` / `24 papéis` → **23 / 23** na A (a B faz 24/24).
- Seção "Assento permanente" (l.90-93) **sai** na A (volta na B).
- Seção "Especialistas do protocolo de reprovação": a tabela vazia (cabeçalho + separador, l.135-136) **sai**; entra uma frase de
  estado: "Elenco efêmero neste head: **0** (estado correto — cadeira efêmera só existe enquanto vota). Quem saiu, de qual bloco e
  em que commit: `agent-orchestration/controle/aposentadoria-especialistas.md`. Quando houver cadeiras vivas, esta seção volta a
  listá-las." O parágrafo acima passa ao tempo correto ("permanecem **enquanto o bloco está em voo**").
- Nota "Divergência RESOLVIDA" (l.138-141): **adendo datado**, sem apagar: "**Adendo (B-GOV-ELENCO ciclo 2, 2026-09-0X):** os
  números acima (34 agentes; 11/11) são do head de 2026-09-05. Medido neste head: `--check → OK, 23 agentes`; `especialistas/` =
  0 contra 0. O texto anterior fica como registro do que era verdade quando escrito." Fecha `P-GOV-NOTA-KPI-CONGELADA` — cujo
  texto diz `Kpis/*` por engano: a nota vive neste README; a pendência é fechada **com essa correção escrita**.

### 4.4 · Registro (tudo em `agent-orchestration/`)
- **`omega/reprovacoes/R-B-GOV-ELENCO-ciclo1.md`** (novo; caminho acrescentado ao §5): o que foi entregue, o que cada cadeira
  achou, quem ocupou cada papel, e o que o ciclo 2 faz (aponta este plano). O §C7.4 exige o registro e o ciclo 1 não o criou.
- **Apenso 1 ao plano do ciclo 1** (`omega/planos/B-GOV-ELENCO-plano.md`, **só acréscimo ao fim** — as 142 linhas julgadas
  ficam byte-idênticas): errata de §4.1 ("5 de 12" → "5 de 11 em fe2748c8"), de §4.2 ("6,6 KB" → "6,0 KB/24 no head; 5,4 KB/23
  na base; razão 3,3×") e a retirada de §4.4 ("por construção"), com o texto que a substitui (§3 deste plano).
- **`controle/pendencias.md`**: entrada "Achados BAIXA do ciclo 1 (`C1-02`, `C1-03`, `C1-04`) — FECHADOS na fatia A" com o
  commit; `P-GOV-NOTA-KPI-CONGELADA` → FECHADA; `P-GOV-BASH-EM-QUEM-JULGA` → adendo (componente (b) fechado: a afirmação morreu,
  o auditor publica N com dono); abre `P-GOV-KPI-DISPLAY-SEM-GUARD` e `P-GOV-C10-ENCERRADO`; adendo em `P-GOV-AUDITOR-FORA-DA-CI`
  (a bateria §7.1 é a regressão a levar para `tests/` no bloco que fiar a CI).
- **`controle/decisoes.md`** na A: **nada novo**; sob o parágrafo de `D-APOSENTADORIA-ELENCO-EFEMERO` que diz "6,6 KB" (l.1992)
  entra **uma linha de errata datada** (aditiva), não edição do texto.

### 4.5 · O que a fatia A NÃO faz
Não toca o assento nem os dois gates (B). Não roda `npm ci`/`npm run check|test|build` no worktree (§C7.1-ter(c), disco).
Não cria agente em `.claude/agents/`. Não edita `scripts/kpi-freeze.mjs` nem `scripts/sync-agent-*.mjs` (só os executa).
Não reescreve o plano do ciclo 1 (apenso apenas). Não retoca `aposentadoria-especialistas.md` (os números lá são a saída
literal do auditor e estão corretos).

---

## §5 · Escopo — caminhos exatos

### 5.1 · PERMITIDO — fatia A (`PR-A`, branch `chore/gov-auditoria-elenco`)
- `scripts/audit-agents-skills.mjs`
- `.claude/skills/**` e `.agents/skills/**` **exceto** `backend-review-ts-prisma/` (B) — na A esses caminhos só existem como
  os 32 renames do ciclo 1 (já feitos; não se tocam de novo)
- `.claude/agents/**` e `.agents/agents/**` **exceto** `cadeira-permanente-backend-review.md`, `inspetor-de-terreno-da-junta.md`,
  `porteiro-pos-merge.md` (B) — na A: as 30 deleções do ciclo 1 (já feitas) e `.agents/agents/README.md`
- `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/app.js` (só via `kpi-freeze.mjs`)
- `agent-orchestration/controle/{pendencias,decisoes}.md` (`aposentadoria-especialistas.md`: leitura — 4.5)
- `agent-orchestration/omega/planos/**` · `agent-orchestration/omega/juntas/**` ·
  **`agent-orchestration/omega/reprovacoes/R-B-GOV-ELENCO-*.md`** (novo no §5 — o ciclo 1 não o tinha e por isso não criou o `R-`)

### 5.2 · PERMITIDO — fatia B (`PR-B`, branch `chore/gov-elenco-fatia-b`, rebase sobre `main` pós-A)
- `.claude/agents/cadeira-permanente-backend-review.md` · `.claude/agents/inspetor-de-terreno-da-junta.md` ·
  `.claude/agents/porteiro-pos-merge.md` (+ espelhos em `.agents/agents/`, **gerados** por `sync-agent-agents.mjs`)
- `.claude/skills/backend-review-ts-prisma/**` (+ espelho `.agents/skills/backend-review-ts-prisma/**`, gerado)
- `CLAUDE.md` · `AGENTS.md` (§C2.6-bis e §C7.1-quater, espelhados)
- `.agents/agents/README.md` (seção do assento; 23 → 24)
- `scripts/audit-agents-skills.mjs` (**só** a linha de `MODELO_FIXADO` do assento)
- `Kpis/*` (entrada `B-GOV-ELENCO-B`, sem incremento; FROZEN)
- `agent-orchestration/controle/{decisoes,pendencias}.md` · `agent-orchestration/omega/{planos,juntas}/**` ·
  `agent-orchestration/omega/juntas/TEMPLATE-J-ata.md` · `agent-orchestration/omega/reprovacoes/R-B-GOV-ELENCO-*.md`

### 5.3 · A partição exata do diff `fe2748c8..25c0112a` (para a cirurgia e para a cadeira A-C1)
**Só B — 9 arquivos inteiros:** `.claude/agents/cadeira-permanente-backend-review.md` · `.agents/agents/cadeira-permanente-backend-review.md` ·
`.claude/skills/backend-review-ts-prisma/{SKILL.md,references/checklist.md,references/repo-erp.md}` ·
`.agents/skills/backend-review-ts-prisma/{SKILL.md,references/checklist.md,references/repo-erp.md}` ·
`agent-orchestration/omega/juntas/TEMPLATE-J-ata.md`.
**Só B — hunks inteiros (aditivos) em 6 arquivos:** `CLAUDE.md` (+43, todos) · `AGENTS.md` (+47, todos) ·
`.claude/agents/inspetor-de-terreno-da-junta.md` (+7, item 3.3) · `.claude/agents/porteiro-pos-merge.md` (+9, item 5-bis) · os dois espelhos.
**Compartilhados (hunks separáveis):** `decisoes.md` (A: `D-APOSENTADORIA-ELENCO-EFEMERO`, `D-QUORUM-B-GOV-ELENCO`; B: `D-CADEIRA-PERMANENTE-JUNTA`) ·
`.agents/agents/README.md` (A: reconciliação; B: seção do assento e 24) · `scripts/audit-agents-skills.mjs` (B: 1 linha de `MODELO_FIXADO`) ·
`Kpis/*` (A: 162 e texto da A; B: entrada própria).
**Só A:** todo o resto — script, 32 renames, 30 deleções, `aposentadoria-especialistas.md`, plano, briefing, ata, votos, `pendencias.md`.

### 5-bis · PROIBIDO (as duas fatias) — o do ciclo 1, mais dois acréscimos
`src/**` · `tests/**` · `prisma/**` · `frontend/**` · `mobile/**` · `.github/**` · `.gitignore` · `scripts/sync-agent-*.mjs` ·
**`scripts/kpi-freeze.mjs`** (executar, nunca editar) · lockfiles · `infra/**` · `.env` · **arquivo novo em `.claude/agents/`**
(nenhum papel novo: o bloco aposentou 15 e o C10 existe para isso; o dev do ciclo 2 é thread efêmero, não arquivo) ·
reescrever linhas já julgadas de `B-GOV-ELENCO-plano.md` (só apenso ao fim) · apagar linha de `decisoes.md` (só acréscimo).

> **Se um bloqueante exigisse caminho proibido, estaria dito aqui.** Não exige: os cinco bloqueantes fecham em
> `scripts/audit-agents-skills.mjs`, `.claude/agents/**`, `CLAUDE.md`/`AGENTS.md` e `Kpis/*`. O que exigiria
> `tests/**`/`.github/**` (parser de veredito, guard de KPI, regressão do auditor) está **deferido com dono** (§12),
> não escondido.

---

## §6 · Fatia B — desenho do assento permanente (o que a C2 reprovou, fechado no texto e no artefato)

### 6.1 · A enumeração fechada — SETE desfechos, e o que cada um faz
Vive **canônica** em `CLAUDE.md` §C7.1-quater e **verbatim** no corpo do assento (espelhado por `sync --check`, que está na CI).
Todo parecer do assento termina com **exatamente uma** destas linhas, **e nada depois dela**:

| # | Linha final (prefixo verbatim, até os dois-pontos) | Libera merge? | Consome ciclo? | Quem age a seguir | Artefato |
|---|---|---|---|---|---|
| 1 | `HOMOLOGADO: <veredito da junta vale>` | **sim** (se a junta aprovou) | — | orquestrador merga com colagem pré-merge | `99-cadeira-permanente.md` |
| 2 | `HOMOLOGADO COM RESSALVA: <veredito vale> \| <dívida de processo, com dono>` | **sim** | — | idem + dívida em `pendencias.md` | idem |
| 3 | `ANULADO POR APROVAÇÃO NÃO GANHA: <cadeiras e motivos>` | não | não | cadeiras nomeadas revotam; assento roda de novo | `99b-…` |
| 4 | `ANULADO POR VETO ILEGÍTIMO: <achados e motivos>` | não (nem aprova) | não | achados → pendência com dono; junta reaprecia sem eles; assento roda de novo | `99b-…` |
| 5 | `NÃO HOMOLOGADO — JUNTA INVÁLIDA: <quórum não atingido (3.2) \| papéis §C7.4-bis ausentes da ata (3.3)>` | não | não | orquestrador completa o quórum / a ata; assento roda de novo | `99b-…` |
| 6 | `NÃO HOMOLOGADO — MEDIÇÃO INCOMPLETA: <cadeira ou achado não medido, e por quê>` | não | não | a cadeira nomeada republica evidência (ou o orquestrador provê o insumo); assento roda de novo | `99b-…` |
| 7 | `PARADA — DOSSIÊ AO DONO: <as duas não-homologações do ciclo>` | não | **o bloco para** | dono | `99c-…` |

**Cláusula de fechamento (em cada cópia da tabela):** parecer cujo desfecho não seja **exatamente** uma das sete linhas — ausente,
truncado, outra string, acento ou maiúscula diferente, linha em branco depois — **não libera nada**: todo consumidor o trata como
a linha 5. **Só as linhas 1 e 2 liberam**, e o teste é um comando, não uma leitura:
`tail -n1 <parecer> | grep -Eq '^HOMOLOGADO( COM RESSALVA)?:'` (ec 0 = libera; qualquer outro ec = nega).

**Restrição da linha 2, escrita:** ressalva é dívida de processo que **não impediu nenhuma medição**; "não consegui medir X"
**nunca** é ressalva — é a linha 6. Isto remove a assimetria que a C2-02 mediu (cadeira que não mede é reprovada; assento que
não mede **não homologa**).

### 6.2 · O teto — UMA não-homologação por ciclo (fecha `C2-06`)
As linhas 3–6 não consomem ciclo do `D-TETO-DOIS-CICLOS` (são processo), **mas são contadas**: no mesmo ciclo do bloco, o
assento pode emitir **no máximo uma** delas. Se, ao rodar de novo, o resultado for outra vez 3–6, a linha emitida é
**obrigatoriamente a 7** — o bloco para e vai ao dono, o mesmo destino do ciclo 2 reprovado.
**Artefato:** pareceres numerados `99-`, `99b-`, `99c-cadeira-permanente.md` em `votos/<bloco>/`.
**Comando (no assento, no porteiro 5-bis e no `CLAUDE.md`)** — conta os pareceres cuja **última linha** não libera:
`for f in votos/<bloco>/99*-cadeira-permanente.md; do tail -n1 "$f" | grep -Eq '^HOMOLOGADO( COM RESSALVA)?:' || echo "$f"; done | wc -l`
→ `0` ou `1` são estados válidos; `2` sem um parecer `PARADA` = violação do teto = merge inválido.
**Por que 1 e não 2:** a C2-06 mostrou que o freio era auto-reportado, sem número e medido tarde. Um número baixo, contado por
comando, converte a iteração que esvaziaria o veto em decisão humana — o espírito do `D-TETO`.

### 6.3 · O corpo do assento (`cadeira-permanente-backend-review.md`) — mudanças linha a linha
- l.170-181 → a tabela de 6.1 + cláusula + regra do teto 6.2.
- Item **3.2** ("está inválida") e **3.3** ("ciclo inválido") → passam a dizer "→ linha 5".
- l.187-188 ("entra como ressalva nomeada") → "→ linha 6; nunca ressalva".
- Item **5** (série): publica também, por bloco, `não-homologações neste ciclo: 0|1` e o acumulado por linha (1–7).
- **Nota de conflito obrigatória:** quando o bloco julgado altera o próprio arquivo do assento (caso da B), o parecer abre com
  "Conflito: o bloco edita o meu texto; medi com a mesma régua; não conserto (§C7.4-bis)".
- `tools` **inalterados** (`Read, Grep, Glob, Bash`); `model: fable` inalterado.

### 6.4 · `porteiro-pos-merge.md` item 5-bis — só allowlist, só comando
(b) passa a: "a **última linha** do parecer mais recente (`ls votos/<bloco>/99*-cadeira-permanente.md | tail -1`) casa
`^HOMOLOGADO( COM RESSALVA)?:` — comando: `tail -n1 <parecer> | grep -Eq '^HOMOLOGADO( COM RESSALVA)?:'; echo $?` → `0`.
Qualquer outro resultado (outra linha, arquivo ausente, ec diferente de 0) = **merge inválido**." (b2) "a ata traz a **colagem
pré-merge** (§C2.6-bis): a mesma linha + `git hash-object <parecer>`; ausência = achado do tamanho do merge." (b3) "teto: o
comando de 6.2 devolve no máximo `1`." A palavra `ANULADO` **sai** do porteiro (denylist morta).

### 6.5 · `inspetor-de-terreno-da-junta.md` item 3.3 — artefato + comando (fecha `C2-04`)
O briefing tem **exatamente uma** linha começando por `ASSENTO-PERMANENTE:` que nomeia `cadeira-permanente-backend-review`, a
ordem (após C1..Cn, antes do merge) e a inelegibilidade. Comandos: (i) `grep -c '^ASSENTO-PERMANENTE:' <briefing>` → `1`;
(ii) `grep -n 'cadeira-permanente-backend-review' <briefing> | grep -v ':ASSENTO-PERMANENTE:' | grep -vi 'HOMOLOGA'` → **vazio**
(qualquer outra ocorrência = possível acúmulo de papel). (i) diferente de 1, ou (ii) não-vazio = **BLOQUEADO**. "Ausência =
BLOQUEADO" fica; o que muda é que a ausência passa a ter um comando cuja saída a denuncia.

### 6.6 · `CLAUDE.md` (canônico) e `AGENTS.md` (espelho)
- **§C2.6-bis** → "Libera SOMENTE `HOMOLOGADO:` / `HOMOLOGADO COM RESSALVA:` (regex `^HOMOLOGADO( COM RESSALVA)?:` na última
  linha do parecer mais recente). Qualquer outro desfecho **nega** o merge (lista fechada e cláusula no §C7.1-quater).
  **Colagem pré-merge:** antes de `gh pr merge`, quem merga roda `tail -n1 <parecer>` e `git hash-object <parecer>` e cola as
  duas saídas na ata (§5 CONSEQUÊNCIA); o porteiro (5-bis) confere. Teto: uma não-homologação por ciclo (§C7.1-quater)."
- **§C7.1-quater** → "Quatro vereditos" vira a tabela de 6.1 (verbatim), a cláusula de fechamento, o teto (6.2) e o parágrafo
  **"Fail-closed nas TRÊS pontas, dito com honestidade"**: antes (inspetor 3.3 — artefato + comando); **no merge** (colagem
  pré-merge — passo humano **com artefato conferível**; o gate executável é `P-GOV-VEREDITO-SEM-PARSER`, pre-existente desde
  `D-SAN-AUTONOMIA`); depois (porteiro 5-bis — comando). A frase "merge sobre veredito ANULADO como merge inválido" sai.
- `AGENTS.md`: mesmas linhas, com a única diferença permitida (parágrafo "No Codex").

### 6.7 · `decisoes.md` — emenda ADITIVA
Novo bloco ao fim: **`D-CADEIRA-PERMANENTE-JUNTA-EMENDA-1 (2026-09-0X)`** — "proposta pela junta `J-B-GOV-ELENCO` (ciclo 1;
achados C2-01 textual, C2-02, C2-03, C2-04, C2-06) e aplicada no ciclo 2 sob o §C7.2 (o dono é informado e audita a posteriori;
**pode revogar** — se revogar, o revert do PR-B restaura o estado de `main`)". Conteúdo: a tabela de 6.1, a cláusula, o teto, as
três pontas. Abaixo da tabela antiga (l.1948-1951) entra **uma linha**: "→ **emendada** por `D-CADEIRA-PERMANENTE-JUNTA-EMENDA-1`;
a tabela acima é histórica." Nenhuma linha é apagada (B-10).

### 6.8 · Reduzir cópias (trata `C2-07` no que cabe)
De 9 literais para: L1 assento ↔ L2 espelho (mecanismo: `sync --check`, na CI) · L6 `CLAUDE.md` ↔ L7 `AGENTS.md` (sem mecanismo —
`P-GOV-ESPELHO-CONTRATO-SEM-GUARD`, pre-existente) · L8 `decisoes.md` (registro datado). **L3/L4 porteiro, L5 skill e L9 template
deixam de copiar a enumeração**: referem "as sete linhas do §C7.1-quater" e, onde executam, usam a regex de allowlist (B-9).

### 6.9 · Espelhos, skill e template
`node scripts/sync-agent-agents.mjs` e `node scripts/sync-agent-skills.mjs` (executar) → `--check` verde nos dois. A skill
`backend-review-ts-prisma/SKILL.md` l.32 passa a referir o §C7.1-quater (sem lista). `TEMPLATE-J-ata.md`: linha "VEREDITO DO
ASSENTO" → "`<uma das sete linhas do §C7.1-quater, verbatim>`"; §5 CONSEQUÊNCIA ganha o slot "Colagem pré-merge: <linha> · <hash>".

### 6.10 · O crítico ataca ESTE desenho antes do dev da B
`critico-adversarial`, máx. 2 rodadas, sobre §6.1–6.9 (não sobre a A). Parecer em `votos/B-GOV-ELENCO-c2B/00-critico-plano.md`;
o `planejador-mestre` (Fable) responde por **apenso** a este plano (§14) — o que sobreviver vira critério em §7; o que for rejeitado
fica com motivo. O crítico **não vota** na B.

---

## §7 · Critérios de aceite — falsificáveis, com a mutação que os deixa vermelhos

**Baseline N = 10** (A1–A10 do ciclo 1). **Meta M = 45 ≥ 2N** (30 na A + 15 na B). **Forma obrigatória:** toda mutação roda em
**cópia isolada própria** (receita do briefing §7 do ciclo 1: `cp` a partir do worktree, fora do repo, sem `git worktree add`, sem
junction, sem `npm ci`), partindo de baseline `0 BLOQUEIA · ec=0`, com **revert → 0** ao final; cada voto publica `node --version`
e `core.autocrlf`. "Baseline" é **0 BLOQUEIA / ec=0**, não a string "OK — nenhum achado" (a A passa a ter 1 AVISO agregado).

### 7.1 · Fatia A

| # | Critério (comando → esperado) | Mutação que o deixa VERMELHO |
|---|---|---|
| A-1 | `node scripts/audit-agents-skills.mjs` → cabeçalho `23 agentes · 11 skills`, `0 BLOQUEIA · 1 AVISO` (C4-bis agregado), `ec=0` | qualquer BLOQUEIA; contagem diferente de 23/11 (na B: 24/12) |
| A-2 | `--ref fe2748c8` → **exatamente 6 BLOQUEIA** (5×C6 + 1×C10), `ec=1` | 5 ou 7 BLOQUEIA (o novo C4 não pode inventar BLOQUEIA na base: os 15 efêmeros tinham só Read/Grep/Glob/Bash) |
| A-3 | cópia: `agente-ci-doutor.md` com `tools: … , Write, Edit, NotebookEdit` → **1 BLOQUEIA `C4`** nomeando o arquivo, `ec=1`; revert → 0 | qualquer papel fora de `PODE_ESCREVER` com Write passando `ec=0` (era `C3-A1`) |
| A-4 | cópia: `estrategista.md` com `MultiEdit` → 1 BLOQUEIA; com `NotebookEdit` → 1; com `Ferramenta-Inexistente` → 1 (desconhecida = negada) | qualquer um dos três com `ec=0` (era `C3-A2`) |
| A-5 | `dev-mapas.md` já tem Write/Edit → 0 BLOQUEIA (allowlist funciona); cópia do **script** com `dev-mapas` removido de `PODE_ESCREVER` → 1 BLOQUEIA | allowlist sem efeito em qualquer direção |
| A-6 | baseline: 1 AVISO `C4-bis Bash tolerado` listando **N=17** nomes (A) / 18 (B); `--json` traz a lista; cópia com `Bash` removido de `estrategista.md` → N−1 | AVISO ausente, N errado, ou Bash em não-escritor virando BLOQUEIA (quebraria P1/P2 — §10) |
| A-7 | cópia: `estrategista.md` sem `tools:` → 1 BLOQUEIA `C5`; `agente-fabrica.md` sem `tools:` → 1 AVISO `C5`, `ec=0` | não-escritor sem `tools:` com `ec=0` |
| A-8 | cópia (frontmatter): `description:` plain multi-linha → 0; `description: >-` com 40+ chars juntos → 0 e sem AVISO "curta"; `description: \|` → 0; `tools:` em lista `- Read` → lido; linha `foo: {a: b}` → **1 BLOQUEIA "não consigo ler o frontmatter (linha N)"** e **nenhum** "sem description" | qualquer dos 4 válidos com achado; a recusa saindo como "sem description" (era `C3-A4d`) |
| A-9 | cópia (C8): cerca recuada 3 espaços com link → 0; cerca de til → 0; code span com link → 0; comentário HTML com link → 0; `references/paren(1).md` existindo → 0 e, ausente, caminho reportado **completo**; cerca de 4 crases aninhando 3 + link real quebrado depois → **exatamente 1** (o real) | qualquer falso-positivo `ec=1` com artefato válido; o real deixando de ser pego (era `C3-A4a/b/c`) |
| A-10 | forma A4 (R5): `[teste](references/NAO-EXISTE.md)` em UMA `SKILL.md` → **exatamente 1** `C8` nomeando o arquivo, `ec=1`; revert → 0 | 0 ou 2 achados |
| A-11 | cópia: `.agents/skills/skill-morta/SKILL.md` órfã → 1 BLOQUEIA `C9 órfão`; controle: agente órfão em `.agents/agents/` → 1 | skill órfã com `ec=0` (era `C3-A5`) |
| A-12 | `--ref 0f17135a` (raiz) → 1 BLOQUEIA `C0 alvo vazio`, `ec=1`; cópia sem `.claude` e `.agents` → `ec=1` | `0 agentes · OK · ec=0` (era `C3-A6`) |
| A-13 | `--ref` sem valor → `ec=2` + linha de uso, **sem stack trace**; `--ref nao-existe` → `ec=2`; `--foo` → `ec=2`; `--ref --json` → `ec=2` | `ec=0` silencioso ou stack trace (era `C3-A7`) |
| A-14 | `--ref fe2748c8` → a linha C10 contém `mede PESO` e `D-APOSENTADORIA`, e **não** contém `ENCERRADO é aposentável` | texto antigo de detecção sobrevivendo (era `C3-A3`) |
| A-15 | cópia: 15 efêmeros restaurados de `fe2748c8` (blob via `git show`) → BLOQUEIA C10; 14 → AVISO, `ec=0` (comportamento **documentado**, não prometido) | limiar mudado sem registro |
| A-16 | falsificação do conserto CRLF: cópia do script com `normalizado = texto` → **1 ou mais BLOQUEIA falsos** (71 no ciclo 1); restaurado → 0 | conserto não load-bearing (0 falsos sem ele) |
| A-17 | falsificação do conserto de cerca: cópia do script sem a remoção de cercas → voltam os **6** falsos do `skill-creator`; restaurado → 0 | idem |
| A-18 | `--json` × texto: mesmos achados, mesma ordem, mesmo `ec` (medido em `fe2748c8`) | divergência |
| A-19 | `--ref <headA>` × árvore limpa: `diff` dos JSON vazio fora de `ref` | divergência |
| A-20 | `sync-agent-agents.mjs --check` → `OK, 23 agentes`, `ec=0`; `sync-agent-skills.mjs --check` → `OK, 11 skills`, `ec=0` | qualquer `DIVERGE` |
| A-21 | `git diff --name-status -M fe2748c8..<headA>`: **zero** caminho do §5-bis; **zero** caminho "só B" (§5.3); `git diff fe2748c8..<headA> -- CLAUDE.md AGENTS.md .claude/agents/inspetor-de-terreno-da-junta.md .claude/agents/porteiro-pos-merge.md` → **vazio** | um caminho de B em A; um hunk de B sobrevivendo |
| A-22 | roteiro C1 re-executado: 32/32 renames com hash de blob idêntico; 30 D = 15×2; 15/15 corpos no commit citado (`git cat-file -e`) e iguais a `fe2748c8`; 3 commits de revival ancestrais de `origin/main` | qualquer contagem diferente |
| A-23 | `node -e` sobre `kpis-latest.json`: para toda métrica cujo `display` seja só dígitos, `value === Number(display)` → **verdadeiro** (hoje só `blocks_completed`); `app.js` executado em sandbox `vm` (técnica da C1) → card **"162"**; `node scripts/kpi-freeze.mjs --check` → `em dia`, `ec=0` | `display "161"`; FROZEN defasado |
| A-24 | 4 suítes com o `tsx` da árvore principal **por caminho absoluto** (sem instalar): `kpi-dashboard-charts` 16/16 · `kpi-achados-paridade` 6/6 · `kpi-dashboard-contraste` 6/6 · `agents-mirror-guard` 12/12, `ec=0`; N=1, Node e autocrlf publicados | qualquer falha; contagem publicada sem forma |
| A-25 | history: entrada `B-GOV-ELENCO` com `blocks_completed: 162`, `pr/merge_commit/approved_head: null` na autoria, `description` **sem** "5 de 12", **sem** "6,6 KB", **sem** "assento"; contagens de teste CARREGADAS com nota §C3.3 | grep positivo em qualquer um dos três |
| A-26 | README: `grep -c 'Nasceu em'` → 0 (tabela vazia saiu); `grep -c '24 papéis'` → 0 e `23` presente; adendo datado sob "Divergência RESOLVIDA" com `23 agentes` e `0 contra 0`; texto antigo preservado (`34 agentes` ainda aparece, como registro) | tabela vazia presente; 24 na A; adendo ausente; texto antigo apagado |
| A-27 | registro: `R-B-GOV-ELENCO-ciclo1.md` existe com a tabela de papéis; `B-GOV-ELENCO-plano.md` tem `## Apenso 1` ao fim e as **142 linhas iniciais byte-idênticas** a `25c0112a` (`diff <(git show 25c0112a:<plano>) <(head -142 <plano>)` vazio); `pendencias.md` com as entradas de §4.4 | linha do plano antigo alterada; `R-` ausente |
| A-28 | `node --check` em `audit-agents-skills.mjs`, `kpi-freeze.mjs`, `Kpis/app.js` → `ec=0`; `git diff --check` limpo | erro de sintaxe; whitespace |
| A-29 | `grep -c '5 de 12' scripts/audit-agents-skills.mjs` → 0; `grep -c 'por construção'` no apenso do plano e na history → 0 fora de citação marcada como retirada | frase morta sobrevivendo |
| A-30 | `git diff 25c0112a..<headA> -- agent-orchestration/controle/aposentadoria-especialistas.md` → vazio (arquivo não retocado na A) | retoque não planejado |

### 7.2 · Fatia B

| # | Critério (comando → esperado) | Mutação que o deixa VERMELHO |
|---|---|---|
| B-1 | `grep -c` de cada um dos 7 prefixos (`HOMOLOGADO:`, `HOMOLOGADO COM RESSALVA:`, `ANULADO POR APROVAÇÃO NÃO GANHA:`, `ANULADO POR VETO ILEGÍTIMO:`, `NÃO HOMOLOGADO — JUNTA INVÁLIDA:`, `NÃO HOMOLOGADO — MEDIÇÃO INCOMPLETA:`, `PARADA — DOSSIÊ AO DONO:`) → 1 ou mais em **assento**, **CLAUDE.md**, **AGENTS.md**, **decisoes.md (EMENDA-1)**; a frase-âncora da cláusula `não libera nada` presente nos quatro | cópia sem uma linha ou sem a cláusula (era `C2-02`) |
| B-2 | `grep -c 'ANULADO' .claude/agents/porteiro-pos-merge.md` → **0**; o porteiro contém a regex `^HOMOLOGADO( COM RESSALVA)?:`; `CLAUDE.md` §C2.6-bis contém "Qualquer outro desfecho" e a regex | denylist sobrevivendo; consumidor sem regex (era `C2-01` textual) |
| B-3 | cópia: parecer terminando em `SUSPENSO POR QUORUM INVALIDO: x` → comando do porteiro `ec` diferente de 0 (**nega**); `HOMOLOGADO SOB PROTESTO: x` → nega; `homologado: x` → nega; linha em branco após `HOMOLOGADO: x` → nega; controles `HOMOLOGADO: x` e `HOMOLOGADO COM RESSALVA: x \| y` → `ec=0` (medido pelo planejador em `PLANO-C2-evidencia.md` §4) | 5ª string aceita (era a mutação da C2) |
| B-4 | assento: 3.2 e 3.3 remetem à linha 5; "não consegui medir" remete à linha 6; `grep -c 'ressalva nomeada'` no parágrafo final → 0 | texto antigo l.187-188 sobrevivendo |
| B-5 | assento, porteiro e `CLAUDE.md` trazem o comando de contagem de 6.2; cópia com `99-` e `99b-` ambos não-homologados → `2` → a regra manda `PARADA` | comando ausente; teto sem número (era `C2-06`) |
| B-6 | inspetor 3.3 tem os comandos (i) e (ii) de §6.5; briefing B: (i) → `1`, (ii) → vazio; cópia do briefing sem a linha → (i) `0`; cópia com o assento na tabela de cadeiras → (ii) não-vazio | 3.3 sem comando (era `C2-04`) |
| B-7 | `CLAUDE.md` §C2.6-bis e `TEMPLATE-J-ata.md` têm o slot "Colagem pré-merge"; a ata da B traz linha + hash; o porteiro 5-bis(b2) os exige | slot ausente |
| B-8 | `sync-agent-agents.mjs --check` → `OK, 24 agentes`; `sync-agent-skills.mjs --check` → `OK, 12 skills`; `diff` das linhas `+` de `CLAUDE.md` × `AGENTS.md` → só o parágrafo "No Codex" | divergência |
| B-9 | as 7 linhas extraídas de L1 (assento) ↔ L6 (`CLAUDE.md`) ↔ L7 (`AGENTS.md`) ↔ L8 (EMENDA-1) → `diff` vazio; `grep -c 'ANULADO POR' TEMPLATE-J-ata.md SKILL.md porteiro-pos-merge.md` → 0 (referem, não copiam) | cópia divergente; cópia extra (era `C2-07`, no que cabe) |
| B-10 | `git diff main..<headB> -- agent-orchestration/controle/decisoes.md \| grep -c '^-[^-]'` → **0** (emenda aditiva; a linha-ponteiro sob a tabela antiga é `+`) | qualquer linha removida |
| B-11 | auditor no head B: `24 agentes · 12 skills · 0 BLOQUEIA`; cópia com `model: sonnet` no assento → 1 BLOQUEIA `C3`; assento com `Write` → 1 BLOQUEIA `C4` (sem prefixo — via default-deny) | assento fora de `MODELO_FIXADO`; C4 cego ao assento |
| B-12 | `git diff --name-status main..<headB>`: só caminhos de §5.2 + registro; zero §5-bis | caminho fora |
| B-13 | KPI B: history com entrada `B-GOV-ELENCO-B`, `blocks_completed: 162` e nota citando o precedente `B-O6R-07a-ciclo2`; `kpis-latest.version = B-GOV-ELENCO-B`; `kpi-freeze.mjs --check` em dia; 4 suítes verdes (forma de A-24) | 163; FROZEN defasado |
| B-14 | `votos/B-GOV-ELENCO-c2B/99-cadeira-permanente.md` abre com a nota de conflito e termina com uma das 7 linhas, nada depois | parecer sem nota; linha final fora da lista |
| B-15 | `votos/B-GOV-ELENCO-c2B/00-critico-plano.md` existe; cada item "sobrevivente" está em §14 como critério ou como rejeitado com motivo | crítico não rodou; item sem destino |

---

## §8 · Bateria de validação (forma declarada) e evidência do dev
**Dev (antes do PR, P1 obrigatório):** `votos/B-GOV-ELENCO-c2A/DEV-evidencia.md` (e `-c2B/`) com, por critério de §7, o comando,
a saída resumida e o `ec` — **incluindo as mutações em cópia isolada**. O dev **não** julga achado: executa o plano e registra.
**Ordem (A):** `node --check` (3 arquivos) → auditor árvore → auditor `--ref fe2748c8` → mutações A-3…A-17 em cópia → A-18/19 →
`sync --check` ×2 → `kpi-freeze --check` → 4 suítes via `tsx` absoluto → A-21/22/23/25/26/27/29/30 → `git diff --check`.
**(B):** B-8 → auditor → B-1/2/4/5/6/7/9/10/11/12/13 → mutações B-3 em cópia → `git diff --check`.
**Forma:** Node `v20.19.5`, `core.autocrlf=true`, cópia via `cp` do worktree, 1 execução por estado (o auditor é determinístico),
saídas longas só no arquivo de evidência (P4). **Não roda:** `npm ci`, `npm run check|test|build` (§7 do ciclo 1; §C7.1-ter(c)).

## §9 · A junta do ciclo 2
### 9.1 · Fatia A — mandatos (3 itens cada, P4)
| Cadeira | Mandato |
|---|---|
| `A-C1` `agente-secops` | (1) escopo: A-21, A-30 e "nenhum caminho de B"; (2) registro: A-22, A-27, A-25; (3) KPI: A-23, A-24, A-26 |
| `A-C2` `inspetor-de-arnes-concorrente` | (1) falso-negativo: A-3…A-7, A-11, A-12, A-15; (2) falso-positivo: A-8, A-9, A-10, A-16, A-17; (3) forma: A-1, A-2, A-13, A-18, A-19, A-20, A-28 |
| `A-C3` `coordenador-de-acessos` | (1) SoD: o default-deny do C4 (A-3, A-4, A-5) e a honestidade das listas; (2) a exceção `Bash` (A-6) é **nomeada, contada e com dono** — e não pode ser removida sem quebrar P1/P2 (§10); (3) A-29: a afirmação "por construção" morreu em todos os lugares |
### 9.2 · Fatia B — mandatos
| Cadeira | Mandato |
|---|---|
| `B-C1` `agente-secops` | (1) allowlist/else nos consumidores: B-2, B-3, B-7; (2) enumeração fechada: B-1; (3) auditor no head B: B-11 |
| `B-C2` `coordenador-de-acessos` | (1) três desfechos roteados e assimetria removida: B-4; (2) teto com artefato e comando: B-5; (3) trava 3.3 com comando: B-6; inelegibilidade do assento conferida por (ii) |
| `B-C3` `agente-dba-guardiao` | (1) aditividade: B-10; (2) paridade das cópias e espelhos: B-8, B-9; (3) rollback provado em cópia (revert do PR-B → estado de `main`), B-12, B-13, B-14, B-15 |
### 9.3 · Quórum · inelegibilidade · perda de voto
**Unanimidade de 3** nas duas fatias (`D-QUORUM-B-GOV-ELENCO`). Inelegíveis conferidos por nome (inspetor 3.1): `validador-mestre`,
`guardiao-fail-closed`, `agente-ci-doutor` (votantes do ciclo 1), `planejador-mestre`, o orquestrador, o dev. Obituário: nenhum
papel permanente sepultado (§4 do obituário). **Perda de voto (P3/P5):** re-disparo da mesma identidade uma vez; segunda queda →
voto perdido em `00-quedas.md` e **a junta não fecha com menos de 3** (não há "maioria dos presentes" sob unanimidade); máx. 2
cadeiras em paralelo; 2 quedas em menos de 30 min → pausa de 15 min.
### 9.4 · Briefing — itens obrigatórios (o inspetor bloqueia sem eles)
1. Head a julgar medido pelo jurado (`git -C <wt> rev-parse HEAD`) e a regra de escopo: após o head de código da fatia, só `agent-orchestration/`.
2. Isolamento (§7 do briefing do ciclo 1: cópia própria; exceção `votos/<bloco>/` para P1/P2); Node e autocrlf no voto.
3. **Só na B:** a linha `ASSENTO-PERMANENTE: cadeira-permanente-backend-review · roda após C1..C3 · antes do merge · inelegível como cadeira de mérito · parecer em votos/B-GOV-ELENCO-c2B/99-cadeira-permanente.md`. **Na A, o assento não é convocado** (contrato de `main`) — dito no briefing para o inspetor não cobrar.
4. **Corpo carregado × corpo julgado (lacuna do ciclo 1):** o briefing declara **como** cada identidade é carregada (subagente nomeado do `.claude/agents/` do cwd da sessão, ou corpo colado do blob do head) e o inspetor confere, por identidade usada, `md5sum <cwd>/.claude/agents/<x>.md` × `git -C <wt> show <head>:.claude/agents/<x>.md | md5sum`. Divergência = ressalva nomeada; **na B, divergência no corpo do assento = BLOQUEADO** (o objeto sob julgamento tem de ser o que roda).
5. As afirmações da ata do ciclo 1 entram como "A RE-VERIFICAR"; a evidência P1 registrada é roteiro de re-execução barata (P3).
6. A lista de reprovação por construção (§10), transcrita.

---

## §10 · O que é REPROVAÇÃO POR CONSTRUÇÃO no ciclo 2 (cobrar isto é reprovar sem defeito)
1. Qualquer caminho do §5-bis: `tests/**` (guard de KPI, regressão do auditor, parser de veredito), `.github/**` (auditor na CI, gate
   entre voto e merge), `.gitignore`, `src/`, `prisma/`, `frontend/`, `mobile/`, lockfiles, `scripts/sync-agent-*.mjs`, `scripts/kpi-freeze.mjs`.
2. **Gate executável entre o último voto e o merge** — `P-GOV-VEREDITO-SEM-PARSER`, pre-existente (`D-SAN-AUTONOMIA`, 13/07),
   re-escopado pelo assento na homologação nº 1. A B entrega o passo **com artefato** (colagem); o parser é do bloco dono.
3. **Remover `Bash` dos papéis que julgam** — quebra P1/P2 do §C7.7 (o jurado só tem `Bash` para gravar evidência e voto); é
   `P-GOV-BASH-EM-QUEM-JULGA` (decisão do dono). O que a A entrega é a exceção **nomeada, contada (N) e com dono**, e a morte da
   afirmação falsa. Corolário: cobrar que o AVISO agregado de A-6 seja BLOQUEIA é o mesmo item.
4. **Guard `CLAUDE.md` × `AGENTS.md`** — `P-GOV-ESPELHO-CONTRATO-SEM-GUARD` (`D-INTEROP`, 28/07).
5. **Que outro agente homologue a junta da B** — não existe outro homologador no contrato; a circularidade é declarada (nota de
   conflito, B-14) e o porteiro é a leitura independente seguinte.
6. `npm ci` / `npm run check|test|build` no worktree — §C7.1-ter(c) e disco; as 4 suítes que leem artefatos tocados rodam via
   `tsx` absoluto (A-24).
7. **Detecção mecânica de "bloco encerrado" no C10** — deferida com desenho (`P-GOV-C10-ENCERRADO`); o que se cobra é o texto honesto (A-14).
8. **YAML completo no frontmatter sem dependência** — o subconjunto é declarado; a recusa nomeada ("não consigo ler", A-8) **não** é
   falso-positivo: é medição recusada, fail-closed, com linha.
9. **Bloco de código por recuo de 4 espaços** no C8 — limitação declarada (§4.1.3), prevalência 0.
10. **Contar a B como bloco novo no KPI** — mesmo bloco; precedente `B-O6R-07a-ciclo2` (B-13).
11. Remover `blockchain-developer` — `P-GOV-SKILLS-RELEVANCIA`, decisão do dono.
12. Reescrever o plano do ciclo 1 além do apenso; apagar linha de `decisoes.md`.
13. Que a A traga o assento, o inspetor 3.3 ou o porteiro 5-bis — são B por desenho (§1).
14. Que a emenda ao assento (`EMENDA-1`) tenha aprovação prévia do dono — o §C7.2 informa e o dono audita a posteriori; a
    emenda registra a causa e é revertível por `git revert`.

## §11 · Riscos e rollback
| Risco | Prob. / efeito | Mitigação | Rollback |
|---|---|---|---|
| A reescrita do C8/frontmatter introduz falso-negativo novo | média / instrumento cego de novo | gramática fechada em §4.1.2–4.1.3; A-8/A-9/A-10 com controles negativos; falsificação A-16/A-17 | `git revert` do PR-A (docs + script; sem dado) |
| Default-deny do C4 bloqueia agente legítimo | baixa / `ec=1` na árvore | medido: 4 escritores = allowlist; 0 sem `tools:`; tools de não-escritores ⊂ {Read, Grep, Glob, Bash, WebFetch, WebSearch} | acrescentar nome à allowlist **no diff**, visível à junta |
| Cirurgia A/B deixa hunk de B na A | média / escopo sujo | A-21 (diff vazio nos 4 arquivos de B); lista §5.3 | `git checkout fe2748c8 -- <arquivo>` |
| Corpo carregado ≠ corpo julgado (sessão em `demo/investidor`) | **desconhecida** (não medida no ciclo 1) / voto sobre texto errado | §9.4 item 4 — md5 por identidade; BLOQUEADO na B para o assento | re-disparo com o corpo do blob |
| Emenda ao assento contraria o dono | baixa / revogação | `EMENDA-1` registra causa e §C7.2; nada apagado | `git revert` do PR-B restaura `main` |
| Teto de 1 não-homologação trava junta legítima | baixa / parada precoce | é o desenho: duas tentativas honestas → dono (`D-TETO`) | dono ajusta o número por decisão |
| Quedas de agente (≈50%) dobradas por 2 juntas | alta / retrabalho | P1–P6; 2 em paralelo; evidência incremental | re-execução pelo roteiro P3 |
| Dev reintroduz a classe "afirmação sem instrumento" (`SAN2-1`) | média | todo texto novo aponta o comando que o prova; A-29/B-9 caçam frases mortas | ciclo para; dossiê |
**Sem migration, sem dado, sem runtime:** os dois PRs são docs + 1 script + KPI; o rollback é `git revert` puro.

---

## §12 · Pendências — fecha · atualiza · abre (todas em `controle/pendencias.md`, com dono)
**Fecha (A):** `P-GOV-NOTA-KPI-CONGELADA` (adendo no README; com a correção escrita: a nota vive em `.agents/agents/README.md`,
não em `Kpis/*`); achados BAIXA `C1-02/03/04` (entrada única, com o commit).
**Atualiza (A):** `P-GOV-BASH-EM-QUEM-JULGA` — componente (b) fechado (afirmação morta; o auditor publica N com dono); o
mecanismo segue ABERTO, dono = decisão do dono. `P-GOV-AUDITOR-FORA-DA-CI` — adendo: a bateria §7.1 (A-3…A-17) é a regressão a
levar para `tests/` no bloco que fiar a CI.
**Abre (A):** `P-GOV-KPI-DISPLAY-SEM-GUARD` (MÉDIA; `tests/kpi-*` não compara card × value; dono: próximo bloco de KPI) ·
`P-GOV-C10-ENCERRADO` (MÉDIA; desenho: `bloco:` obrigatório no frontmatter de todo efêmero — fail-closed, ausente = BLOQUEIA — e
"encerrado" = `kpis-history.json` tem entrada com `version == bloco` e `merge_commit != null`; dono: o bloco que fiar a CI).
**Atualiza (B):** `P-GOV-VEREDITO-SEM-PARSER` — adendo: a B entregou a colagem pré-merge com artefato; o parser (allowlist + else,
exit code) segue com o mesmo dono. `P-GOV-ESPELHO-CONTRATO-SEM-GUARD` — adendo: cópias reduzidas (§6.8).
**Justificativa escrita das deferências:** cada uma exige `tests/**` ou `.github/**` (§5-bis) ou decisão do dono; nenhuma é
bloqueante do ciclo 2 — pelo re-escopo do assento (homologação nº 1) e pelo §C7.1-ter(a).

## §13 · Sequência de execução (o dev segue; o orquestrador dispara)
1. `git -C <wt> switch -c chore/gov-elenco-fatia-b` (ponteiro que preserva o superset) → `git -C <wt> switch chore/gov-auditoria-elenco`.
2. **Retirar B da A:** `git rm -r` dos 9 arquivos "só B" (§5.3); `git checkout fe2748c8 -- CLAUDE.md AGENTS.md
   .claude/agents/inspetor-de-terreno-da-junta.md .claude/agents/porteiro-pos-merge.md .agents/agents/inspetor-de-terreno-da-junta.md
   .agents/agents/porteiro-pos-merge.md`; em `decisoes.md`, retirar **só** o bloco `D-CADEIRA-PERMANENTE-JUNTA` (o commit da A nasce
   sem ele — não é "apagar decisão": ela nunca chegou à `main`; a B a leva de volta, emendada); README sem a seção do assento; script
   sem a entrada do assento. Conferir A-21 antes de qualquer outra coisa.
3. Implementar §4 (A). Rodar §8. Escrever `DEV-evidencia.md`. Commit `fix(gov): ciclo 2, fatia A — auditor default-deny, 3a classe
   de FP, KPI 162 (B-GOV-ELENCO)`. Push, `gh pr create` (corpo: objetivo, DoD, como testar, KPI). Preencher `pr` no history.
4. Briefing A (§9.4) → inspetor → 3 cadeiras (P5) → ata `J-B-GOV-ELENCO-ciclo2-A.md` (§C7.4-bis por escrito) → merge (squash,
   `--delete-branch`) → `bash scripts/post-merge-cleanup.sh` → porteiro → `LIBERADO` → B.
5. **B:** `git switch chore/gov-elenco-fatia-b && git rebase origin/main` (os arquivos "só A" já estão na `main`; conflitos só nos
   compartilhados — resolver pelo lado da `main` + hunks de B). Rodar `critico-adversarial` sobre §6 (máx. 2 rodadas) → apenso §14 →
   implementar §6 → `sync` ×2 → §8 (B) → commit `feat(gov): ciclo 2, fatia B — assento permanente com enumeração fechada, teto e
   artefatos (B-GOV-ELENCO)` → PR-B.
6. Briefing B (com `ASSENTO-PERMANENTE:`) → inspetor → 3 cadeiras → assento (`99-`) → colagem pré-merge na ata → merge → limpeza →
   porteiro (5-bis novo).
7. Reprovação em qualquer fatia: `R-B-GOV-ELENCO-ciclo2-<A|B>.md` + dossiê ao dono (§C7.4 item 3). **Sem ciclo 3.**

## §14 · Apensos
*(vazio na autoria; recebe a defesa ao crítico da B e qualquer emenda datada — nunca edição das seções acima)*
