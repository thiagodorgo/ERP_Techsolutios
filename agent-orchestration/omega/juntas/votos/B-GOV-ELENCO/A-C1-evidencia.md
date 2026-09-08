# A-C1 (`agente-secops`) — evidência executada · `B-GOV-ELENCO` ciclo 2, fatia A

**Forma (publicada, §7):** Node **v20.19.5** · `core.autocrlf=true` (global; sem override local) ·
worktree `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco` ·
árvore **limpa** (`git status --porcelain` = vazio no início) · **1 execução por estado** (git é determinístico) ·
árvore principal **não lida**. Mutação: nenhuma necessária nos meus 3 itens (medição por `git`/`node` sobre blobs).

---
## ITEM 1 — escopo, arquivo a arquivo

### 1.1 Head medido por mim
```
git -C <wt> rev-parse HEAD            -> d2d25f6b932eb1fd6da17a891cc1774540ae53e2
git -C <wt> rev-parse --abbrev-ref HEAD -> chore/gov-auditoria-elenco
git -C <wt> rev-parse origin/main     -> fe2748c84cc187a54ebe3fa651fcdc347c5b3494  (== fe2748c8 do briefing)
git -C <wt> rev-parse 7facc396^{commit} -> 7facc396d2a5226c077d45b111f7bea6b5378c78
```
`git log --oneline -6`: `d2d25f6b` (CR solto no briefing) · `179557e3` (ressalvas do inspetor) · `9ee66e3f`
(briefing) · `88ff8726` (EMENDA 2) · **`7facc396` (head de CÓDIGO)** · `c0cbfe10` (D-FALLBACK).

### 1.2 Depois do head de código, só `agent-orchestration/`
```
git -C <wt> diff --name-only 7facc396..HEAD            -> 4 caminhos
  agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO-ciclo2-A.md
  agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/A-00-inspetor-evidencia.md
  agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/A-00-inspetor.md
  agent-orchestration/omega/planos/B-GOV-ELENCO-ciclo2-plano.md
git ... | grep -vc '^agent-orchestration/'             -> 0        [esperado 0] OK
```

### 1.3 Diff de código `fe2748c8..7facc396` — N = **91** caminhos (incl. as origens dos renames)
Distribuição: **32 R100** · **22 A** (`agent-orchestration/`) · **1 A** (`scripts/audit-agents-skills.mjs`) ·
**30 D** (15 em `.claude/agents/especialistas/` + 15 em `.agents/agents/especialistas/`) ·
**6 M** (`.agents/agents/README.md`, `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-latest.json`,
`controle/decisoes.md`, `controle/pendencias.md`).

**§5-bis (proibido) — grep sobre a lista de caminhos, contagem por padrão:**
`^src/`→0 · `^tests/`→0 · `^prisma/`→0 · `^frontend/`→0 · `^mobile/`→0 · `^\.github/`→0 · `^\.gitignore$`→0 ·
`^scripts/sync-agent-`→0 · `^infra/`→0 · `^\.env`→0 · `package-lock.json`→0 · `pnpm-lock`→0 · `yarn.lock`→0 ·
`pubspec.lock`→0 · `^scripts/kpi-freeze\.mjs$`→0. **Zero em 15 de 15.**

**Nada escapa do §5.1** — negativo do allowlist de caminhos permitidos sobre os 91 únicos:
```
grep -vE '<allowlist §5.1>' /tmp/allu.txt   -> (vazio)
```
`Kpis/` tocado só nos 3 arquivos permitidos (`app.js`, `kpis-history.json`, `kpis-latest.json`).

### 1.4 Partição A/B — nenhum caminho e nenhum HUNK da fatia B na A
Por caminho (contagem): `cadeira-permanente-backend-review`→0 · `backend-review-ts-prisma`→0 ·
`TEMPLATE-J-ata.md`→0 · `^CLAUDE\.md$`→0 · `^AGENTS\.md$`→0 · `inspetor-de-terreno-da-junta.md`→0 ·
`porteiro-pos-merge.md`→0.
Por conteúdo (A-21, o teste forte — os 6 arquivos compartilhados poderiam ter hunk sobrevivente):
```
git -C <wt> diff fe2748c8..7facc396 -- CLAUDE.md AGENTS.md \
  .claude/agents/{inspetor-de-terreno-da-junta,porteiro-pos-merge}.md \
  .agents/agents/{inspetor-de-terreno-da-junta,porteiro-pos-merge}.md | wc -c   -> 0 bytes
```
`decisoes.md`, o outro compartilhado: `D-CADEIRA-PERMANENTE-JUNTA` no head A → **0** ocorrências (o bloco de
115 linhas foi retirado pelo commit da fatia A, `c0cbfe10..7facc396`: 10 inserções / 115 deleções).

### 1.5 Os 32 renames são RENAME PURO (não reescrita)
`git diff --raw -M` dá o hash de blob dos dois lados; comparei campo a campo:
```
32 registros R100 · blob-origem == blob-destino em 32 ; divergentes: 0
```
Todos são o mesmo defeito: aninhamento duplo `X/X/` desfeito (`skill-creator/skill-creator/SKILL.md` →
`skill-creator/SKILL.md`), em **5 skills** × **2 espelhos** (`.claude/skills/` e `.agents/skills/`):
`blockchain-developer`, `cloud-architect`, `cloud-devops`, `payment-integration`, `skill-creator`.
Nenhum toca `backend-review-ts-prisma` (fatia B).

### 1.6 A-30 — `aposentadoria-especialistas.md` não retocado pelo ciclo 2
```
git -C <wt> merge-base --is-ancestor 25c0112a 7facc396 -> SIM (ciclo 1 é ancestral)
git -C <wt> diff 25c0112a..7facc396 -- .../aposentadoria-especialistas.md | wc -c -> 0
blob em 25c0112a e em 7facc396: e919302b76475f6da3317409b0dc5cdf028c9c41 (idêntico)
```

### 1.7 §5-bis "apagar linha de `decisoes.md`" — respeitado
```
git -C <wt> diff fe2748c8..7facc396 -- .../decisoes.md | grep -Ec '^-[^-]'  -> 0
```
Nenhuma linha que **existe na `main`** foi removida. As 115 deleções são contra `c0cbfe10` (commit da própria
branch, nunca mergeado) e retiram `D-CADEIRA-PERMANENTE-JUNTA` + `D-FALLBACK-MODELO-FABLE-OPUS` — exatamente a
cirurgia do §13.2 do plano, cujo texto declara: "não é apagar decisão: ela nunca chegou à `main`".

**VEREDITO PARCIAL ITEM 1 — CONFORME.** 91/91 caminhos dentro do §5.1; 0/15 padrões proibidos; 0 caminho e
**0 byte** de hunk da fatia B; 32/32 renames provados puros por hash de blob; A-30 verde; nenhuma linha de
`main` apagada em `decisoes.md`.

---
## ITEM 2 — o registro é verdadeiro, e a ordem do dono não sumiu

### 2.1 (a) `aposentadoria-especialistas.md` — 15 cadeiras · **amostrei as 15**, não 3
Os 15 nomes da tabela batem **exatamente** com as 15 deleções em `.claude/agents/especialistas/` (e com as
15 espelhadas em `.agents/`). Para cada linha, `git cat-file -e <commit>:<caminho>` + `rev-parse` do blob:

```
corpos presentes no commit citado: 15 / 15   ausentes: 0
blob no commit citado == blob em fe2748c8:   15 / 15   divergentes: 0
```
Amostra do `head -3` (prova de que é o corpo, não um arquivo vazio):
`critico-c5-adversarial @ e6a64619` → `--- name: critico-c5-adversarial description: Crítico adversarial…` ·
`especialista-maquinas-de-desfazer @ 99f18403` → `--- name: especialista-maquinas-de-desfazer description: Máquinas de…` ·
`jurado-07b-contrato-mobile-b108 @ fe2748c8` → `--- name: jurado-07b-contrato-mobile-b108 description: Jurado com IDEN…`

**Os 3 commits de revival são ancestrais de `origin/main`** (o corpo é recuperável de verdade, não de um disco):
`e6a64619` (2026-09-01) · `99f18403` (2026-09-04) · `fe2748c8` (2026-09-06) → `--is-ancestor` = SIM nos três.

**As 4 atas citadas existem e são rastreadas em `origin/main`** (não só na árvore de alguém):
`J-B-O6R-02-ciclo1.md` (195 l.) · `-ciclo2.md` (193 l.) · `-ciclo5.md` (240 l.) · `J-B-O6R-07b.md` (183 l.).
**Os PRs citados são merges reais na `main`:** `#371` = `99f18403` · `#380` = `fe2748c8` — e são **os mesmos
hashes** da coluna "Corpo em" das linhas 9–11 e 12–15, o que torna a tabela auto-consistente.

### 2.2 (b) A ordem do dono NÃO sumiu — `D-FALLBACK-MODELO-FABLE-OPUS` está inteira na fatia B
```
git show chore/gov-elenco-fatia-b:CLAUDE.md | grep -c '6-bis'                       -> 3   [>=1 OK]
git show chore/gov-elenco-fatia-b:CLAUDE.md | grep -c 'D-FALLBACK-MODELO-FABLE-OPUS'-> 1
git show chore/gov-elenco-fatia-b:AGENTS.md | grep -c 'D-FALLBACK-MODELO-FABLE-OPUS'-> 1
git show chore/gov-elenco-fatia-b:.../decisoes.md | grep -c 'D-FALLBACK…'            -> 1
```
E os **4** agentes `model: fable` da fatia B carregam a linha de fallback (`grep -ci opus` = 2 em cada):
`cadeira-permanente-backend-review` · `inspetor-de-terreno-da-junta` · `planejador-mestre` · `porteiro-pos-merge`.
(No head A existem só **3** — o 4º é arquivo da fatia B; não é lacuna, é a partição.)
`chore/gov-elenco-fatia-b` = `c0cbfe10`, e `c0cbfe10` **é ancestral** de `7facc396`: o ponteiro do superset
foi criado **antes** da cirurgia (§13.1), então nada foi perdido — foi retirado da A e preservado na B.

**`D-QUORUM-B-GOV-ELENCO` permaneceu na fatia A:** presente no head A (`decisoes.md` l.1961), ausente em
`fe2748c8` (nasce no bloco) e presente **também** na fatia B. Nasceu em `c0cbfe10`, não no commit da A — o que
explica e confirma o §2(c) do plano, que a declarava "registrada" ao medir o worktree naquele head.

### 2.3 (c) O texto descreve o que o diff faz? — medi as afirmações numéricas, não as li
Refiz **pelo método declarado** (frontmatter linha a linha, aspas removidas, `String.length`), com script
próprio em `$SCRATCHPAD/mede.mjs` lendo blobs por `git show` (sem tocar a árvore):

| Afirmação no registro | Onde | Medido por mim | Bate? |
|---|---|---|---|
| `fe2748c8` = **23** papéis / **5.563** chars / **5,4 KB** | errata em `decisoes.md` | 23 / 5563 / 5.4 KB | **sim** |
| head desta fatia idem (23 / 5.563 / 5,4 KB) | idem | 23 / 5563 / 5.4 KB | **sim** |
| 15 efêmeros = **20.271** chars = **19,8 KB** | idem | 15 / 20271 / 19.8 KB | **sim** |
| razão **3,64×** (não 3×) | idem | 20271/5563 = **3,6439** | **sim** |
| elenco efêmero no head = **0** | idem / README | 0 papéis / 0 chars | **sim** |
| `C1-02`: `.claude/skills` em `fe2748c8` = **11** dirs | `pendencias.md` | `git ls-tree` = **11** (e 11 no head A) | **sim** |
| `N = 17` papéis com `Bash` fora da allowlist | `pendencias.md` | auditor: 17 · **contagem independente minha**: 20 com `Bash` − 3 da allowlist que o têm = **17** | **sim** |
| `--json` devolve a lista dos 17 em `achados[].papeis` | `pendencias.md` | `--json` → `papeis` com **17** nomes | **sim** |

Auditor na árvore (leitura, sem mutação): `23 agentes · 11 skills` · `0 BLOQUEIA · 1 AVISO` · **`ec=0`**.
Eu (`agente-secops`) estou nomeado entre os 17 — a exceção é de fato **visível**, não abstrata.

### 2.4 Aditividade e frases mortas
```
diff fe2748c8..7facc396 -- decisoes.md   | grep -Ec '^-[^-]'  -> 0
diff fe2748c8..7facc396 -- pendencias.md | grep -Ec '^-[^-]'  -> 0
```
Nada que exista na `main` foi apagado. As 3 ocorrências de "6,6 KB" em `decisoes.md` são: **l.1923** o texto
original **preservado** (§A2) e **l.1927/1933** a errata que o cita para corrigi-lo — não é número podre
sobrevivendo, é o registro exigido pelo §A2.
`grep -c '5 de 12'` no script → **0**; `'5 de 11'` → **2** (l.10 e l.12, com o alvo declarado e a nota da 12ª
skill nascer na fatia B).
"por construção" no Apenso 1 → 3 ocorrências, **todas** dentro da seção `E3 · §4.4 … está RETIRADA` (título da
retirada, explicação, e a frase substituta "por convenção, não por construção, para `Bash`") — citação marcada,
que é o que o A-29 admite.

### 2.5 A-27 — o plano do ciclo 1 não foi reescrito
```
git show 25c0112a:…/B-GOV-ELENCO-plano.md            -> 142 linhas
git show 7facc396:…/B-GOV-ELENCO-plano.md            -> 211 linhas, '## Apenso 1' na l.146
diff <(git show 25c0112a:<plano>) <(git show 7facc396:<plano> | head -142)  -> VAZIO
```
`R-B-GOV-ELENCO-ciclo1.md` existe (79 linhas) — o registro de reprovação que o §C7.4 exige e o ciclo 1 não criou.

**VEREDITO PARCIAL ITEM 2 — CONFORME.** 15/15 corpos recuperáveis em commits ancestrais de `origin/main`;
4/4 atas e 2/2 PRs reais; a ordem do dono **não sumiu** (inteira na fatia B, nos 4 agentes + os dois contratos
+ `decisoes.md`) e `D-QUORUM` permaneceu na A; **8/8 afirmações numéricas do registro reproduziram** na minha
medição independente; nenhuma linha de `main` apagada; plano do ciclo 1 byte-idêntico nas 142 linhas julgadas.

---
## ITEM 3 — KPI (§C3) e a EMENDA 2

### 3.1 A-23 — `display` x `value`, e o FROZEN
```
toda métrica cujo display é só dígitos:
OK  blocks_completed  value=162  display="162"    métricas só-dígitos: 1 | divergentes: 0
```
O `C1-01` está fechado: **162 no `value` E no `display`**. A `note` do card diz "161 -> 162 ... O display passa
a bater com o value (achado C1-01 ...)".

**FROZEN x `kpis-latest.json`:** `var FROZEN = {...}` é **uma linha minificada** (73.814 chars) e o JSON é
indentado (80.442 chars) — **não são byte-idênticos como texto, e não devem ser**: é a forma que o
`kpi-freeze.mjs` gera. O que importa é identidade de conteúdo, e ela vale:
```
JSON CANONICO IDENTICO: true      (JSON.stringify(parse(FROZEN)) === JSON.stringify(parse(latest)))
FROZEN.metrics.blocks_completed = {"value":162,"display":"162", ...}
node scripts/kpi-freeze.mjs --check  -> "kpi-freeze: em dia (snapshot 2026-09-08)"  ec=0
```
Publico a forma em vez de repetir a palavra "byte-idêntico": o FROZEN **não** carrega o defeito para o modo
`file://`, que era o risco do `C1-01`.
`release`: `pr=null` · `merge_commit=null` · `approved_head=null` · `status="published_per_pr"` — §C3.5, autoria.

### 3.2 A-24 — as 4 suítes, **reexecutadas por mim** (não aceitei a contagem do dev)
Forma: `node --test --import file:///C:/.../ERP_Techsolutios/node_modules/tsx/dist/loader.mjs <suite>`, com o
`tsx` da árvore principal **por URL absoluta**, cwd = worktree, **sem `npm ci`** (§10.6).
```
kpi-dashboard-charts    -> tests 16 · pass 16 · fail 0 · ec=0
kpi-achados-paridade    -> tests  6 · pass  6 · fail 0 · ec=0
kpi-dashboard-contraste -> tests  6 · pass  6 · fail 0 · ec=0
agents-mirror-guard     -> tests 12 · pass 12 · fail 0 · ec=0
```
Batem **exatamente** com o publicado (16/16, 6/6, 6/6, 12/12). N=1 execução por suíte.
*Nota de forma:* com caminho Windows cru o `--import` falha com `ERR_UNSUPPORTED_ESM_URL_SCHEME` — erro de
**ambiente**, não de teste, que produz `1 test / 1 fail` em ~60 ms. Só o `file://` roda. Registro para ninguém
ler essa queda como suíte vermelha.

### 3.3 Backfill do `B-O6R-07b` — íntegro
```
{"version":"B-O6R-07b","pr":380,"merge_commit":"fe2748c84cc187a54ebe3fa651fcdc347c5b3494",
 "approved_head":"a2988b5","backfill_note":true}
```
E `#380` é, de fato, o commit de merge `fe2748c8` na `main` (confirmado no ITEM 2.1).

### 3.4 Contagens de teste CARREGADAS — legítimo neste diff
```
flutter_tests 864/864 · backend_tests 2936/2938 · frontend_smoke_tests 1126/1126
entrada anterior (B-O6R-07b): 864/864 · 2936/2938 · 1126/1126   -> idênticas = carregadas
git diff --name-only -M fe2748c8..7facc396 | grep -Ec '(^tests/|^src/|^frontend/|^mobile/|[.]test[.]|[.]spec[.])' -> 0
```
**O diff não toca um único arquivo de teste ou de código de produto** — logo carregar é o que o §C3.3 manda, e
a nota está escrita na `description` ("CONTAGENS (§C3.3). Nenhuma métrica de teste se move ... CARREGADOS com
esta nota").

### 3.5 A-26 — README
`Nasceu em` -> **0** (a tabela vazia saiu) · `24 papéis` -> **0** · `23 agentes` -> **2** ·
`34 agentes` -> **3** (texto antigo **preservado**, §A2) · `0 contra 0` -> **1** · `Adendo` -> **1** ·
`assento permanente` -> **0** (é fatia B).
**Reexecutei as duas afirmações do adendo**, em vez de lê-las:
`node scripts/sync-agent-agents.mjs --check` -> `OK — 23 agentes, espelho consistente` (`ec=0`);
`sync-agent-skills.mjs --check` -> `OK — 11 skills, 36 arquivos` (`ec=0`);
`.claude/agents/especialistas/*.md` = **0** e `.agents/agents/especialistas/*.md` = **0** -> o "**0 contra 0**"
reproduz. (Só executei; não editei — `scripts/sync-agent-*.mjs` é §5-bis.)

### 3.6 A EMENDA 2 afrouxou a propriedade do A-25? — **NÃO.** O artefato passa nos DOIS critérios
`A-25`, medido na entrada `B-GOV-ELENCO` do history:
`blocks_completed` = **162** · `pr/merge_commit/approved_head` = **null** (autoria; a branch **não está
pushada** — `git ls-remote origin chore/gov-auditoria-elenco` não acha —, então "sem PR ainda" é o estado
honesto, §C3.5) · `description` (6.741 chars): `"5 de 12"` -> **0** · `"6,6 KB"` -> **0**.

**Critério ANTIGO** (`sem "assento"`): grep por `assento` na `description` -> **0 ocorrências**. O artefato
**passaria no critério antigo tal como escrito**.
**Critério NOVO** (substância): a frase existe, literal —
"o desenho da cadeira permanente da junta vai inteiro para a **fatia B**, com PR e junta próprios — esta
entrada **NÃO o publica como entregue**."
Cobre as **duas** metades: não credita, e diz o destino. `fatia B` x2, `NÃO o publica` x1.

**Julgamento (o que o briefing me pediu).** Mover a trave seria emendar um critério que o artefato **reprova**
para um que ele **aprova**. Aqui o artefato **satisfaz os dois** — a emenda **não é load-bearing** para esta
aprovação, e portanto não comprou nada para o dev nem para o orquestrador. No mérito ela **aperta**: o grep
antigo proibia uma **palavra** e era falsificável por sinônimo (um texto dizendo "a cadeira permanente foi
entregue" passaria com 0 ocorrências de "assento" — falso-negativo real); o novo proíbe a **substância** e
ainda **acrescenta uma obrigação positiva** que o antigo nunca teve ("deve dizer que vai para a fatia B").
Proibição semântica **mais** dever positivo é estritamente mais forte que proibição lexical.
**Nenhum achado contra o orquestrador.**

**Vermelho de controle reexecutado** (o briefing proíbe aceitar a tabela T1-T7' do dev sem reexecutar):
rodei a mutação do **A-16** em cópia isolada (`mktemp -d` + `cp` de `scripts/`, `.claude/{agents,skills}`,
`.agents/{agents,skills}`; **sem** `git worktree add`, symlink, junction ou `npm ci`; `rm -rf` ao final):
```
baseline na cópia              -> 23 agentes · 11 skills · 0 BLOQUEIA · 1 AVISO · ec=0
CR presente no disco da cópia  -> SIM (od -c acha o CR) — a mutação é significativa
mutação (l.217 -> "const normalizado = texto;")
                               -> 34 BLOQUEIA · 0 AVISO · ec=1
   decomposição: 23 em agents/ + 11 em skills/  ==  o "34 = 23 agentes + 11 SKILL.md" da EMENDA 2
restaurado                     -> 0 BLOQUEIA · 1 AVISO · ec=0
```
Ciclo **0 -> 34 -> 0**. O conserto de CRLF é **load-bearing**, e o número re-publicado pela EMENDA 2 (34, no
lugar do 71 herdado do parser do ciclo 1) **reproduz na minha execução**, pelo mecanismo que ela alegou (o
parser novo recusa o arquivo inteiro com **um** achado, onde o antigo emitia três).

### 3.7 Observação de datação (BAIXA, não bloqueia)
O adendo do `.agents/agents/README.md` se data **2026-09-07**; a errata do `decisoes.md` e os snapshots de
`Kpis/*` **do mesmo commit** se datam **2026-09-08**, e `7facc396` foi autorado em **2026-09-08 01:40 -0300**.
Trabalho atravessando a meia-noite explica sem defeito, e a medição que o adendo carrega reproduz (3.5) — por
isso é BAIXA e não vira reprovação. Registro porque este repositório já pagou caro por datar registro pela
linha errada.

### 3.8 Falso achado que eu NÃO levanto (verifiquei antes de acusar)
A `note` de `blocks_completed` está sem acentos ("governanca"). **Não é regressão desta fatia:** a mesma `note`
em `origin/main@fe2748c8` também é ASCII (regex de acentuadas -> `false` nos dois). Convenção
**pre-existente** do arquivo; evidência = o blob da `main`.

**VEREDITO PARCIAL ITEM 3 — CONFORME.** `display` == `value` == 162; FROZEN canonicamente idêntico e
`kpi-freeze --check` em dia; 4/4 suítes reexecutadas por mim com as contagens exatas; backfill do
`B-O6R-07b` íntegro; contagens carregadas **legitimamente** (0 arquivo de teste/código no diff) e com a nota
§C3.3; A-26 verde com as afirmações do adendo reexecutadas; A-25 satisfeito no critério **novo e no antigo**;
EMENDA 2 **não afrouxou** — e o `34` dela reproduziu na minha mutação.

---
## Isolamento e higiene
Não mutei o worktree: única escrita minha são `A-C1-evidencia.md` e `A-C1-voto.json` em `votos/B-GOV-ELENCO/`
(exceção P1/P2 do briefing). A única mutação de código rodou em `mktemp -d` e foi **removida** (`rm -rf`;
diretório inexistente ao final). `git status` ao fim mostra apenas arquivos de voto — inclusive
`A-C2-evidencia.md`, da cadeira A-C2 escrevendo em paralelo: **esperado, não é anomalia de terreno.**
Árvore principal (`demo/investidor`) **não lida** em nenhum comando.
