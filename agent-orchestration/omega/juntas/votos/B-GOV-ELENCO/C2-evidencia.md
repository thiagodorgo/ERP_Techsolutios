# C2 `guardiao-fail-closed` — evidencia incremental (P1)

**Head medido:** `918f5a01dff71db4f6a5d32f44d62b6cd33c88a3`
**Worktree:** `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco`
**Pergunta unica da cadeira:** quando alguem acrescentar o proximo membro a enumeracao e esquecer de
classifica-lo, o sistema NEGA ou PERMITE?

---

## ITEM 0 — terreno e escopo do head

```
git -C <wt> rev-parse HEAD             -> 918f5a01dff71db4f6a5d32f44d62b6cd33c88a3
git -C <wt> status --porcelain         -> (vazio antes da minha escrita)
git -C <wt> diff --name-only 25c0112a..HEAD | grep -v '^agent-orchestration/' | wc -l -> 0
```

Veredito parcial: terreno limpo, regra de escopo do briefing satisfeita (0 caminhos fora de
`agent-orchestration/` depois de `25c0112a`). Prossigo.

---

## ITEM 0-bis — a minha cópia isolada (§7) e o CONTROLE de que o arnês está vivo

Receita do §7 executada **a partir do worktree**, `mktemp -d`, sem `git worktree add`, sem junction,
sem `npm ci`. Copiei `scripts/{audit-agents-skills,sync-agent-agents}.mjs`, `.claude/`, `.agents/`,
`CLAUDE.md`, `AGENTS.md`. Diretório: `/tmp/tmp.tUrZ26DBRc` (removido no fim).

```
BASELINE  node scripts/audit-agents-skills.mjs        -> ec=0  "24 agentes · 12 skills · OK"
          node scripts/sync-agent-agents.mjs --check   -> ec=0  "OK — 24 agentes"
```

**Controle (o guard PODE ficar vermelho neste arquivo):**

| mutação na cópia | saída | ec |
|---|---|---|
| `model: fable` → `sonnet` no assento | `[BLOQUEIA] C3 modelo fixado · cadeira-permanente-backend-review.md` | **1** |
| `tools:` + `Write` no assento | `[BLOQUEIA] C4 §C7.4-bis · papel que JULGA com ferramenta de escrita` | **1** |
| revertido | `OK — nenhum achado` | **0** |

`0 → 1 → 0` nas duas. O arnês está vivo sobre o arquivo do assento — logo, verde nas mutações
seguintes **significa alguma coisa**.

**Medição no worktree (somente leitura), head `918f5a01`:**
```
audit-agents-skills.mjs                  ec=0  "OK — nenhum achado"
audit-agents-skills.mjs --ref fe2748c8   ec=1  "6 BLOQUEIA · 0 AVISO"   (controle do briefing §3: confere)
sync-agent-agents.mjs --check            ec=0  "24 agentes, espelho consistente"
sync-agent-skills.mjs --check            ec=0  "12 skills, 39 arquivos, espelho idêntico"
```

---

## ITEM 1 — a trava de ENTRADA (`inspetor` 3.3) fecha?

**Texto medido** (`.claude/agents/inspetor-de-terreno-da-junta.md:87-92`, **novo** neste bloco —
`git diff fe2748c8..25c0112a` mostra o hunk `@@ -84,6 +84,13 @@` como adição pura):

> `3.3 O ASSENTO PERMANENTE está convocado (…). O plano/briefing da junta **nomeia** a
> cadeira-permanente-backend-review para rodar depois dos votos e antes do merge. **Ausência = BLOQUEADO**`

### 1.a A direção do default é fail-closed no TEXTO — e isso eu concedo

"Ausência = BLOQUEADO" mais a regra de ouro do próprio inspetor (l.31-34: "qualquer verificação que você
não conseguir confirmar por execução vira BLOQUEADO") fecham o vão do briefing que **não menciona** o
assento: `grep` retorna 0 ⇒ ausência ⇒ BLOQUEADO. Testei o vão e ele está tapado **na redação**.

### 1.b O vão que continua aberto: 3.3 confere uma PROMESSA, não uma EXECUÇÃO

3.3 roda **antes** do primeiro voto e verifica que o briefing **nomeia** a cadeira. Nada em 3.3 —
e nada em lugar nenhum — verifica que ela **rodou**. O objeto verificado é uma frase no briefing;
o objeto que importa é um parecer que só existe ~N horas depois. Entre o `LIBERADO` do inspetor e o
merge, **não há gate algum**: o §C2 põe `6 → 6-bis (assento) → 7 → 8 (porteiro)`, e o item 8 diz
literalmente "**Concluído o merge**, nasce o `porteiro-pos-merge`" (`CLAUDE.md:236`).

### 1.c 3.3 × 4.1 — a comparação que o mandato pediu, e ela é medível NESTE bloco

4.1 tem comando (`node scripts/sync-agent-agents.mjs --check`) e falha sozinho. 3.3 não tem nenhum.
Não é teoria — é medição das **três passadas do inspetor deste mesmo bloco**:

| passada | veredito | conferiu **4.1** (tem comando)? | conferiu **3.3** (não tem)? |
|---|---|---|---|
| 1 (`00-inspetor-terreno-passada1.md:73`) | BLOQUEADO | sim | **sim** — "3.3 … VERDE, com circularidade registrada" |
| 2 (`00b-…passada2.md:45`) | BLOQUEADO | **sim** — `sync-agent-agents --check → OK, ec=0` | **não** — `grep -n "3\.3\|assento\|cadeira-permanente"` → **0 linhas** |
| 3 (`00c-…passada3.md:41`) | LIBERADO | **sim** — `sync-agent-agents --check → OK` | **não** — mesmo grep → **0 linhas** |

Mesmo agente, mesmo bloco, mesma passada incremental: o item **com** comando foi reexecutado nas duas
passadas; o item **sem** comando não reapareceu em nenhuma. Concedo a defesa honesta (passadas 2 e 3
foram incrementais, P4/3 itens, e 3.3 não havia mudado). O que a tabela prova mesmo assim é a
propriedade: **3.3 só dispara enquanto alguém lembra de procurar** — é o `else → allow` com um passo
humano no meio, exatamente o que eu veto.

**Veredito parcial do ITEM 1:** a redação de 3.3 é fail-closed; o **mecanismo** não é. A trava é de
promessa, não de execução, e o ponto de decisão que ela alega proteger (o merge) fica fora do alcance dela.

---

## ITEM 2 — a enumeração dos vereditos: o membro não previsto nasce PERMITIDO

### 2.a A álgebra do consumidor: a negação é DENYLIST, o permitido é o complemento

Produtor (`.claude/agents/cadeira-permanente-backend-review.md:170-181`): "Termine SEMPRE com uma
destas **quatro** linhas". Consumidor (`.claude/agents/porteiro-pos-merge.md:48`, **novo** neste bloco):

> `(b) o veredito era HOMOLOGADO ou HOMOLOGADO COM RESSALVA — **merge sobre veredito ANULADO é merge inválido**`

Duas regras contraditórias na **mesma frase**: a primeira metade é *allowlist* (fecha), a segunda é
*denylist* nomeando só `ANULADO` (abre). E as outras cópias da mesma verdade só têm a metade que abre:

- `CLAUDE.md:232` (§C2.6-bis): "`HOMOLOGADO` (ou com ressalva) libera; `ANULADO…` devolve à junta" — mapeamento de dois ramos, **sem `else`**;
- `CLAUDE.md:405` (§C7.1-quater): "…e **merge sobre veredito ANULADO como merge inválido**" — só a denylist;
- `agent-orchestration/controle/decisoes.md:1948-1951`: tabela de 4 linhas, **sem linha "qualquer outra"**.

Quinta string ⇒ não é `ANULADO` ⇒ a regra de negação **não dispara**. É defesa derivada por exclusão.

### 2.b MUTAÇÃO — quinto veredito, sem classificação em lugar nenhum

Na cópia `/tmp/tmp.tUrZ26DBRc`, criei
`agent-orchestration/omega/juntas/votos/B-FICTICIO/99-cadeira-permanente.md` terminando em
`SUSPENSO POR QUORUM INVALIDO: 2 de 3 votos de merito; a cadeira C3 caiu por limite de sessao`.

| verificação | resultado |
|---|---|
| **(a) build / `npm run check` / `tsc`** | **não existe** — a enumeração vive só em prosa `.md`; não há compilador para ficar vermelho |
| **(b) suíte / gates** | `audit-agents-skills.mjs` **ec=0** · `sync-agent-agents.mjs --check` (**o único gate de CI**) **ec=0** |
| **(b') consumidores executáveis do literal** | `grep -rln "omega/juntas\|99-cadeira-permanente\|VEREDITO DO ASSENTO\|HOMOLOGADO" scripts/ tests/ .github/` → 6 arquivos, e **os 6 são comentário/caminho** (`tests/helpers/auth-identity-fixture.ts:96`, `tests/o6r07a-approval-sod.test.ts:17`, `deploy-production.yml:9,68`). **Zero parsers do veredito.** |
| **(c) runtime, no ponto de decisão** | **ACEITO** — nenhum gate entre o último voto e o merge; o porteiro nasce **depois** do merge (`CLAUDE.md:236`) |

**Compila (n/a) + verde + aceito = FAIL-OPEN.** É o critério literal do meu mandato.

### 2.c E o membro não previsto NÃO é hipotético: o próprio mandato do assento produz três

O corpo do assento manda-o detectar três condições cujo desfecho **nenhuma das quatro linhas exprime**:

| item do mandato | desfecho que ele manda declarar | cabe em qual dos 4? |
|---|---|---|
| `3.2` (l.129-130) | "junta que fechou com menos votos que o quórum exige está **inválida**" | em nenhum: os votos presentes podem ter sido **ganhos** (não é "aprovação não ganha"), não houve veto, e `HOMOLOGADO` seria falso |
| `3.3` (l.132-133) | papéis do §C7.4-bis ausentes = "**ciclo inválido**" | em nenhum, pelo mesmo motivo |
| l.187-188 | cadeira que ele **não conseguiu medir** → "entra como **ressalva nomeada**" | mapeia para **`HOMOLOGADO COM RESSALVA`** — que, por `porteiro:48`, **libera o merge** |

O terceiro é o mais grave, porque o texto **roteia explicitamente o caso não medido para o lado
permitido**, contra a regra que o mesmo bloco cobra de todos os outros:

- briefing §6: "**'Não consigo medir' = REPROVADO**";
- item **1.6** do próprio assento (l.98-99): "Se alguma cadeira não conseguiu medir e mesmo assim aprovou, o voto não foi ganho — **a regra é literal**";
- `decisoes.md:1937`: "…'não consigo medir' tratado como reprovado".

Cadeira de mérito que não mede ⇒ REPROVADO. Assento que não consegue medir a cadeira ⇒ **ressalva ⇒ merge
liberado**. A assimetria aponta para o merge, e está escrita, não inferida.

### 2.d Mapa das cópias da autoridade e quem VENCE na divergência

| # | arquivo:linha | mecanismo que força a concordância |
|---|---|---|
| L1 | `.claude/agents/cadeira-permanente-backend-review.md:170-181` | — |
| L2 | `.agents/agents/cadeira-permanente-backend-review.md:176-187` | **`sync-agent-agents.mjs --check`** (L1↔L2) — em CI (`ci.yml:69-70`) |
| L3 | `.claude/agents/porteiro-pos-merge.md:48` | ↔L4 pelo mesmo sync |
| L4 | `.agents/agents/porteiro-pos-merge.md:54` | idem |
| L5 | `.claude/skills/backend-review-ts-prisma/SKILL.md:32` | ↔ espelho por `sync-agent-skills --check`, **manual** (`grep -c … ci.yml` → **0**) |
| L6 | `CLAUDE.md:232` e `CLAUDE.md:382` | **nenhum** |
| L7 | `AGENTS.md:260` e `AGENTS.md:410` | **nenhum** (`grep -rln AGENTS.md scripts/*.mjs tests/*.ts .github/**` → só um comentário em `sync-agent-agents.mjs:31`) |
| L8 | `agent-orchestration/controle/decisoes.md:1948-1951` | **nenhum** |
| L9 | `agent-orchestration/omega/juntas/TEMPLATE-J-ata.md:86` | **nenhum** |

**Hoje elas CONCORDAM** — medi: `diff` de L1×L2 nas 4 linhas finais → idênticas; `diff` de
`CLAUDE.md:370-406` × `AGENTS.md:398-434` → **saída vazia**. Registro isso a favor do bloco.

**MUTAÇÃO de divergência (cópia isolada):** troquei em `CLAUDE.md:382` `ANULADO POR APROVAÇÃO NÃO GANHA`
por `ANULADO POR APROVACAO NAO GANHA` (sem acento — a divergência realista nesta base) **e acrescentei um
quinto veredito `HOMOLOGADO SOB PROTESTO`**, deixando o corpo do agente, o `AGENTS.md`, o `decisoes.md` e o
TEMPLATE com a lista antiga:

```
audit-agents-skills.mjs      ec=0   OK — nenhum achado
sync-agent-agents.mjs --check ec=0  OK — 24 agentes, espelho consistente
```

O contrato canônico (§A "em qualquer divergência prevalece o `CLAUDE.md`") pode passar a listar cinco
vereditos, um deles novo e permissivo, e **nada fica vermelho**. Revertido: `diff CLAUDE.md <worktree>` → idêntico.

**Quem vence na divergência:** o **consumidor no merge** (`porteiro:48`) vence o produtor; e dentro do
porteiro vence a **metade permissiva**, porque ele roda **pós-merge** — o que ele emite é `achado`, não
rollback. Divergir aqui resolve-se pelo lado mais permissivo, que é o critério do meu mandato.

**Veredito parcial do ITEM 2:** enumeração fail-open. Membro novo nasce permitido; três casos reais do
próprio mandato não têm veredito; o caso "não consegui medir" nasce do lado que libera o merge.

---

## ITEM 3 — a fronteira anti-superjurado sustenta?

### 3.a Inelegibilidade neste bloco — **VERDE, medido**

`grep -rn "cadeira-permanente-backend-review"` no plano e no briefing: aparece na linha `| **P** |`
do plano §8 (`plano:142`) e em "Quem HOMOLOGA" (`briefing:151`), **nunca** como C1/C2/C3
(`validador-mestre` · `guardiao-fail-closed` · `agente-ci-doutor`). Não acumula papéis aqui.
Registro que a trava que garante isso (`inspetor` 3.3, 2ª frase) tem o mesmo defeito de mecanismo do
ITEM 1: é conferência por leitura, sem comando.

### 3.b "NÃO CONSERTA" **não** é imposto pelo `tools:` — mutação executada

```
grep '^tools:' .claude/agents/cadeira-permanente-backend-review.md
  -> tools: Read, Grep, Glob, Bash
scripts/audit-agents-skills.mjs:54
  -> const FERRAMENTA_DE_ESCRITA = /\b(Write|Edit|NotebookEdit)\b/;
scripts/audit-agents-skills.mjs:162  (C4, aplicado a ^cadeira-permanente-)
```

O C4 — **código novo deste bloco** — enumera as ferramentas de escrita **por nome**. `Bash` é escrita
plena (`cat >`, `>>`, `sed -i`, `tee`) e **não está na enumeração**: nasce do lado permitido.

Mutação na cópia, com o **toolset exato do assento**:

| ação | auditor | `sync --check` |
|---|---|---|
| `tools:` + `Write` (controle) | **ec=1** `[BLOQUEIA] C4 §C7.4-bis` | — |
| `printf … >> .claude/agents/cadeira-permanente-backend-review.md` (Bash) | **ec=0** `OK — nenhum achado` | ec=1 *(só porque o espelho divergiu, não porque a escrita seja proibida)* |
| edição de `CLAUDE.md` via Bash (arquivo **sem espelho automático**) — vide 2.d | **ec=0** | **ec=0** |

Ou seja: o assento pode reescrever `CLAUDE.md`, `decisoes.md`, `pendencias.md`, a ata e os votos com o
`tools:` que tem, e **nenhum gate acusa**. Prova viva: este parecer foi escrito com `Read, Grep, Glob, Bash`.
"Não conserta" é regra de prosa, não capacidade removida — e o guard que este bloco criou para impô-la
(C4) é uma allowlist de negação por enumeração de nomes.

### 3.c Anulação → aprovação de fato: o caminho existe e não tem teto

`ANULADO POR VETO ILEGÍTIMO` (l.179-181): "os achados ilegítimos caem para pendência … e a junta
**reaprecia sem eles**. **Não consome ciclo** do teto". Composição do caminho:

1. o assento **remove** achados da apreciação da junta;
2. a operação **não consome ciclo** do `D-TETO-DOIS-CICLOS`;
3. `grep -i "teto\|limite\|maxim\|repet\|quantas"` nas quatro cópias (`CLAUDE.md`, `AGENTS.md`, corpo do
   assento, `decisoes.md`) sobre anulação → **0 linhas**: **não existe teto de anulações**.

Iterado, isso esvazia o veto sem que nenhuma linha diga "aprovado" — a fronteira "anulação nunca produz
veredito de mérito" é respeitada **na forma** e contornada **no efeito**. O único freio desenhado é o
item 5 ("série … carimbo/pedágio"), que é (i) **auto-publicado pelo próprio assento**, (ii) sem limiar
numérico, e (iii) conferido pelo `porteiro-pos-merge`, isto é, **depois do merge**. Freio auto-reportado,
sem número, medido tarde.

**Veredito parcial do ITEM 3:** inelegibilidade OK neste bloco; "não conserta" não é imposto por
mecanismo; existe caminho não-limitado em que a anulação vira aprovação de fato.

---

## LIMPEZA E TERRENO

- Cópia isolada `/tmp/tmp.tUrZ26DBRc` — **removida** (`rm -rf`), confirmado por `test -d`.
- Mutações **todas** na cópia; **zero** mutação no worktree e **zero** na árvore principal
  (todo comando usou `cd <wt>` absoluto ou a cópia; nunca `demo/investidor`).
- `git -C <wt> status --porcelain` ao final: apenas `?? …/C1-evidencia.md` (da cadeira C1, mesmo
  protocolo) e os meus dois arquivos. Não toquei nos da C1.
- **Nota de terreno (não é achado de mérito):** o briefing §7 diz "**Nenhum jurado escreve nele**" e
  exige `status --porcelain` **vazio** ao fim; o protocolo P1/P2/P4 do meu mandato **ordena** escrever dois
  arquivos exatamente ali. As duas instruções se contradizem no head medido; segui o P1/P2/P4 e registro.

## O QUE NÃO EXECUTEI

- `npm run check` / `npm test` / `npm run build`: §7 do plano os exclui e §5 do briefing os marca como
  reprovação por construção (worktree sem `node_modules`; `npm ci` desaconselhado pelo §C7.1-ter(c)).
- `tests/agents-mirror-guard.test.ts`: não o rodei; li que ele exercita `sync-agent-agents.mjs` sobre
  `.claude/agents` × `.agents/agents` e **não lê** `CLAUDE.md`/`AGENTS.md` (`grep` → 0 ocorrências),
  logo não altera nenhuma conclusão minha. O inspetor já o mediu 12/12 ec=0 (passada 3).
- Não simulei o comportamento real de um `porteiro-pos-merge` vivo diante de uma quinta string: julguei
  o texto dele por leitura adversarial, como o mandato manda para artefato de prosa.

---

## VEREDITO DA CADEIRA C2

Aplico a regra literal do meu mandato. **A FAVOR** exigiria: mutação com **build ou teste vermelho** na
omissão, **runtime negando** o membro novo, e **autoridade única** (ou concordância imposta por mecanismo
que falha sozinho). Medi: **nenhum vermelho** (auditor ec=0, `sync --check` ec=0, zero parsers do
veredito), **runtime aceitando** (nenhum gate entre o último voto e o merge), e **4 cópias sem mecanismo**.

O que sustenta o **REPROVADO** são dois achados `bloqueia`, os dois `dentro-do-bloco` e os dois exatamente
da classe que esta cadeira existe para pegar:

- **C2-01** — a enumeração é defendida no consumidor por **denylist** (`merge sobre veredito ANULADO`); o
  membro não previsto nasce **permitido**, provado por mutação.
- **C2-02** — o próprio mandato do assento gera **três desfechos sem veredito**, e o caso "não consegui
  medir" é roteado por texto explícito para `HOMOLOGADO COM RESSALVA`, que **libera o merge** — contra a
  regra "não consigo medir = REPROVADO" que o mesmo bloco cobra de todas as outras cadeiras.

Os demais (`alta`/`media`) não sustentam o voto sozinhos e ficam registrados com escopo e data.

**Não proponho correção e não escolho mecanismo** (§C7.4-bis). Entrego a propriedade ausente, provada.

`VOTO: CONTRA — enumeração de veredito defendida por exclusão: o membro não previsto nasce do lado que libera o merge | evidência: quinto veredito 'SUSPENSO POR QUORUM INVALIDO' gravado na ata da cópia isolada ⇒ auditor ec=0, sync-agent-agents --check (único gate de CI) ec=0, zero parsers do literal, runtime ACEITA — enquanto o controle 0→1→0 (model e tools) prova que o arnês estava vivo no mesmo arquivo`
