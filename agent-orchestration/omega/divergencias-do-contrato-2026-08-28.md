# Divergências do contrato — inventário para a reconciliação (2026-08-28)

> Levantamento **somente leitura** das quatro versões vivas do registro normativo, pedido pelo
> orquestrador para instruir o PR de reconciliação que `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` manda fazer.
> Quem levanta **não propõe a redação** (§C7.4-bis). As afirmações decisivas foram re-conferidas pelo
> orquestrador por execução própria e estão na ERRATA de `D-JUNTA-ESCOPO-E-CALIBRACAO` §6.


## 0. Topologia (o fato que reorganiza tudo)

```
git merge-base origin/main HEAD      = 6efe5adf  (= origin/main)
git merge-base origin/main 12c3825   = 6efe5adf
git merge-base origin/main 48a75e9   = 6efe5adf
git merge-base 12c3825   48a75e9     = 6efe5adf
```

`origin/main` (`6efe5ad`, 2026-08-19) **é o ancestral comum das três branches**. Nenhuma contém trabalho de outra. Reconciliação de 3 vias com base única e limpa.

| Arquivo | `origin/main` | `demo/investidor` (`d711f50`) | `feat/o6r-b02-financial-uow` (`12c3825`) | `docs/governanca-…-sol` (`48a75e9`) |
|---|---|---|---|---|
| `CLAUDE.md` | 470 ln · `081c4b90` | 515 ln · `b0323fba` **+39/−0**, 1 hunk | **`081c4b90` — BYTE-IDÊNTICO à main** | 563 ln · `43722f4d` **+123/−33**, 11 hunks |
| `AGENTS.md` | 519 ln · `e0f15245` | 564 ln · `7a7c3d99` **+39/−0**, 1 hunk | **`e0f15245` — BYTE-IDÊNTICO** | 610 ln · `06f40cc3` **+126/−37**, 14 hunks |
| `EXECUTION_MODEL.md` | 592 ln · `cbcc8aa8` | **idêntico** | **idêntico** | 659 ln · `c4239b95` **+80/−18**, 21 hunks |
| `decisoes.md` | 1545 ln | 1700 ln **+155/−0** | 1649 ln **+104/−0** | 1664 ln **+119/−0** |
| `pendencias.md` | 2973 ln | 3128 ln **+121/−0** | 3119 ln **+114/−0** | 3269 ln **+208/−0** |

**Três consequências duras, medidas:**

1. **A branch do financeiro não é uma versão do contrato.** `CLAUDE.md`, `AGENTS.md` e `EXECUTION_MODEL.md` em `12c3825` são o **mesmo blob** da `main`. Cumprimento literal de `D-CONTRATOS-FORA-DO-PR-FINANCEIRO`. Sua divergência vive **só** em `decisoes.md` + `pendencias.md`.
2. **`decisoes.md` é append-only nas três branches.** `git diff origin/main <ref> -- …/decisoes.md | grep -c '^-[^-]'` = **0** nas três. **Nenhuma decisão pré-existente foi reescrita por ninguém.** O mesmo vale para `pendencias.md` (0 remoções nas três).
3. **Só a governança sobrescreve norma.** As 33 / 37 / 18 linhas removidas em `CLAUDE.md` / `AGENTS.md` / `EXECUTION_MODEL.md` são exclusivamente do `48a75e9`. `demo/investidor` é 100 % aditivo (1 hunk).

---

## 1. Tabela de decisões `D-*` por versão

`decisoes.md` tem **69 headings `## D-`** na `main` (51 ASCII + 18 com `Ω`). **Nenhum id duplicado dentro de um mesmo arquivo.** Comparei o texto de cada seção por hash (`awk` de `^## <id>` até o próximo `^## `, `git hash-object`).

### 1a. As 69 decisões herdadas — texto idêntico nas 4

Todas as 69 decisões que já existiam em `origin/main` têm **texto byte-idêntico nas quatro versões**. Confirmado por duas vias: hash por seção e `grep -c '^-[^-]'` = 0 nos três diffs.

Uma única diferença de hash aparente, e é **artefato**: `D-O6R-B01-IDENTIDADE-GLOBAL` (`fcfdff73` em main/fin vs `4bf62ed7` em HEAD/gov) — HEAD e gov acrescentaram `\n---\n` **depois** do último parágrafo antes de apensar suas seções; a branch do financeiro não. O texto normativo é o mesmo. Classificação: **COSMÉTICO**.

### 1b. As 8 decisões que existem em UMA OU DUAS versões

| id | título curto | main | demo | fin | gov | texto difere? | data |
|---|---|:--:|:--:|:--:|:--:|---|---|
| `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO` | separação de alçadas em todo o fluxo | ✗ | ✗ | ✓ `5a8e576f` | ✓ `b2aae63b` | **SIM — mesma id, dois textos** | 2026-08-20 (ambas) |
| `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` | contratos saem do PR financeiro | ✗ | ✗ | ✓ | ✗ | n/a | 2026-08-23 |
| `D-INSTANCIA-NOVA-COM-AUDITORIA` | instância nova conta como agente novo se auditar | ✗ | ✗ | ✓ | ✗ | n/a | 2026-08-23 |
| `D-PORTEIRO-PRE-MERGE` | porteiro move para antes do merge (+3 emendas) | ✗ | ✗ | ✗ | ✓ | n/a | 2026-08-20 (+21, +22, +22) |
| `D-FABLE-PARA-GPT-5-6-SOL` | Codex usa `gpt-5.6-sol` onde a doc diz Fable | ✗ | ✗ | ✗ | ✓ | n/a | 2026-08-20 |
| `D-INSPETOR-TERRENO-JUNTA` | inspeção de terreno antes de toda junta | ✗ | ✓ | ✗ | ✗ | n/a | 2026-08-24 |
| `D-GOV-AMEACA-DESCUIDO` | modelo de ameaça = descuido, não malícia | ✗ | ✓ | ✗ | ✗ | n/a | 2026-08-25 |
| `D-JUNTA-ESCOPO-E-CALIBRACAO` | escopo do veredito + quórum por risco | ✗ | ✓ | ✗ | ✗ | n/a | 2026-08-28 |

**Decisões que existem SÓ numa branch e somem se alguém mergear por cima:**

- **Só na `feat/o6r-b02-financial-uow`:** `D-CONTRATOS-FORA-DO-PR-FINANCEIRO`, `D-INSTANCIA-NOVA-COM-AUDITORIA`.
- **Só na `docs/governanca-porteiro-pre-merge-sol`:** `D-PORTEIRO-PRE-MERGE` (com 3 emendas datadas), `D-FABLE-PARA-GPT-5-6-SOL`.
- **Só na `demo/investidor`:** `D-INSPETOR-TERRENO-JUNTA`, `D-GOV-AMEACA-DESCUIDO`, `D-JUNTA-ESCOPO-E-CALIBRACAO`.
- **Em duas, com textos diferentes:** `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO` (fin × gov).

### 1c. Ids `D-*` fora do `decisoes.md`

`12c3825:agent-orchestration/controle/pendencias.md` carrega um heading `## D-DIVERGENCIA-C4-PONTA-AUSENTE (2026-08-25)` — um id `D-` que vive no arquivo de pendências, não no de decisões. Não existe nas outras três.

### 1d. Superseção declarada mas não aplicada (dentro da própria gov)

Em `48a75e9`, `D-PORTEIRO-POS-MERGE` continua **byte-idêntico** (`1cb299e5`, igual às quatro versões) enquanto `D-PORTEIRO-PRE-MERGE` afirma no título *"supersede a posição de `D-PORTEIRO-POS-MERGE`"*. Mesmo padrão com `D-PLANEJADOR-MODELO-FABLE` (`da8d42a6`, idêntico nas quatro) × `D-FABLE-PARA-GPT-5-6-SOL`, que diz *"Esta decisão **supersede somente a seleção de modelo** em `D-PLANEJADOR-MODELO-FABLE` e `D-PORTEIRO-POS-MERGE`"*. E `D-JUNTA-SEPARACAO-DE-PAPEIS` (2026-08-17, `51e9a088`) é idêntico nas quatro, com fin e gov apensando amplificações incompatíveis entre si. **O `decisoes.md` da gov contém as duas normas contraditórias sobre o porteiro, lado a lado.**

---

## 2. Divergências de TEXTO, parágrafo a parágrafo

### 2.1 `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO` — mesma id, duas leis — **CONFLITANTE**

`git show 12c3825:agent-orchestration/controle/decisoes.md` (linhas 1480-1517):

> **A separação não nasce na reprovação: vale desde o primeiro passo de TODA entrega.** Planejar, escrever o código, analisar/revisar, votar na junta e exercer o **porteiro pós-merge** são alçadas incompatíveis dentro da mesma entrega.

> | **Porteiro pós-merge** | **nasce depois do merge**, reexecuta promessa × diff × testes × KPI × pendências e decide o próximo start | não participou das alçadas anteriores desta entrega e nunca conserta o que encontrar |

`git show 48a75e9:agent-orchestration/controle/decisoes.md` (linhas 1548-1560):

> **A separação vale desde a origem de toda entrega.** Achador, planejador, desenvolvedor, cada analista/revisor, cada votante, **porteiro pré-merge e executor pós-merge** são agentes/pessoas distintos.

Além do porteiro, o texto do financeiro tem **6 consequências numeradas** que **não existem** na gov, entre elas:

> 6. A decisão vale prospectivamente a partir de 2026-08-20, inclusive para entregas já em andamento nas etapas ainda não executadas. Não invalida retroativamente commits anteriores…

e o parágrafo de aplicação nominal (`/root/planejador_f6`, exceção de indisponibilidade do Fable no plano F6). A gov comprime tudo em 2 parágrafos e acrescenta o executor pós-merge. **Parte ADITIVO (as 6 consequências e a tabela de alçadas só existem na fin), parte CONFLITANTE (pós-merge × pré-merge + executor).**

### 2.2 `CLAUDE.md`/`AGENTS.md` §C7.1 item 1 — colisão de linha — **CONFLITANTE mecanicamente**

Base `origin/main:CLAUDE.md` linhas 327 e 331:

> 327: `1. **Verde da junta = merge + próximo bloco.** Toda decisão que seria humana passa por **junta de agentes**`
> 331: `   em ...J-<n>-<tema>.md`. **Junta sem registro = merge inválido.**`

- **`demo/investidor`** — hunk `@@ -331,0 +332,45 @@`: **insere 45 linhas logo após a linha 331** (as cláusulas **1-ter** e **1-bis**), sem tocar 327 nem 331.
- **`docs/governanca-…`** — hunks `@@ -327 +384 @@` e `@@ -331 +388,2 @@`: **reescreve a linha 327** (`1. **Verde da junta + CI verde = candidatura ao porteiro pré-merge.**`) e **modifica a 331** (acrescenta `Mesmo verde, a junta não substitui o parecer pré-merge do porteiro no head exato (§C2.8).`).

As duas branches operam sobre as mesmas 5 linhas. Merge textual conflita. **Semanticamente as duas mudanças são compatíveis** (uma calibra quórum, a outra insere um gate posterior) — mas o merge não resolve sozinho.

### 2.3 §C7.1 — quórum — **ADITIVO sobre a gov, CONFLITANTE com o texto vigente**

Só em `demo/investidor` (`CLAUDE.md:376-383`, `AGENTS.md:404-411`):

> **(b) Quórum por risco, agora escrito.** **Unanimidade de 3** quando o bloco toca **dinheiro, segurança, permissão ou perda de dado**; **maioria de 3** no resto; **unanimidade de 5** permanece só para as decisões críticas do item 1 (produção, dependência nova, serviço externo pago).

Só em `docs/governanca-…` (`CLAUDE.md:427-431`):

> **Escalada por superfície de governança.** […] **exige `junta.critical === true`** quando o diff toca `.github/workflows/**`, `.github/rulesets/**`, `.gitattributes`, os scripts do gate/sync, os testes de governança, **`CLAUDE.md`/`AGENTS.md`** ou `.claude/agents/**`/`.agents/agents/**`. `critical: true` implica **5 votantes distintos e unânimes** (§C7.1).

**CONFLITANTE na interseção:** um PR que toque `CLAUDE.md` e seja "de dinheiro" é **unanimidade de 3** pela regra da `demo/investidor` e **unanimidade de 5** pela regra da governança. A própria gov diz: *"**Consequência para o próprio PR desta governança:** ele toca a superfície inteira, logo **exige junta crítica 5/5** — não há caminho de maioria simples para ele."* — o que se aplica também ao PR de reconciliação.

### 2.4 §C7.4-bis — **CONFLITANTE** (o parágrafo que `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` nomeia)

`origin/main` / `demo/investidor` / `12c3825` (`CLAUDE.md:341`) — inalterado:

> 4-bis. **SEPARAÇÃO DE PAPÉIS NA CORREÇÃO — quem acha NÃO conserta** (decisão do dono, 2026-08-17, `D-JUNTA-SEPARACAO-DE-PAPEIS`). Todo ciclo de reprovação distribui **três papéis em três agentes distintos**…

`48a75e9` (`CLAUDE.md:399`) — substituído:

> 4-bis. **SEPARAÇÃO DE PAPÉIS EM TODO O FLUXO — ninguém atesta o próprio trabalho** (decisões do dono, 2026-08-17 e ampliações de 2026-08-20, `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO`). Desde a origem de **toda entrega**, achador, planejador, desenvolvedor, cada analista/revisor, cada votante, **porteiro pré-merge e executor pós-merge** são **agentes/pessoas distintos**.

Mais dois blocos **ADITIVOS** só na gov: *"**Limite mecânico admitido — a ata é o controle compensatório.** […] Ele **não pega pseudônimo**"* e a *Escalada por superfície de governança*.

**Nota:** `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` registra que o head `e4e914a` do financeiro carregava *"19 linhas alteradas em cada um dos dois contratos, reescrevendo o §C7.4-bis"*. **Essa reescrita não está mais em `12c3825`** — foi revertida por `7ba441a` (2026-08-23). A versão financeira do §C7.4-bis **não é recuperável do head atual**; está só no histórico (`git show e4e914a:CLAUDE.md`).

### 2.5 §A4.3 (precedência/qualificação da aprovação) — **espelho quebrado em 3 das 4 versões**

`origin/main`, `demo/investidor`, `12c3825` — **`CLAUDE.md:87` × `AGENTS.md:95` divergem**:

> `CLAUDE.md:87` — `3. **Valide bloco a bloco** e **só avance após aprovação**, exatamente como o Codex fazia.`
> `AGENTS.md:95` — `3. **Valide bloco a bloco** e **só avance após aprovação** (junta — §C7), exatamente no mesmo protocolo que o Claude Code segue.`

`48a75e9` — **corrigido nos dois** (`CLAUDE.md:95`, `AGENTS.md:103`):

> `…**só avance após aprovação** (junta — §C7)… A qualificação é obrigatória: desde `D-SAN-AUTONOMIA` a aprovação por PR é da **junta de agentes** + CI verde + porteiro pré-merge; o humano é **informado, não consultado** (§C7.2). "Aprovação" sem qualificar apontava para o regime revogado.`

**ADITIVO quanto a `(junta — §C7)`** (o canônico `CLAUDE.md` é o lado pobre — a gov registra isso explicitamente em `decisoes.md`, seção *"Divergência de espelho resolvida — §A4.3"*). **CONFLITANTE quanto a `+ porteiro pré-merge`**, que arrasta a decisão do §2.7.

### 2.6 Cabeçalho do `CLAUDE.md` — precedência `CLAUDE.md` × `AGENTS.md` — **contradição não resolvida em NENHUMA das 4**

`origin/main:CLAUDE.md:3-6` — **idêntico nas quatro versões** (nenhuma branch toca essas linhas):

> Onde este arquivo divergir do `AGENTS.md` ou das fontes de verdade, **valem o `AGENTS.md` e as fontes de verdade** — nunca a memória do agente.

`origin/main:CLAUDE.md:28-30` — **idêntico nas quatro**:

> **Em qualquer divergência, prevalece o `CLAUDE.md`.** Isto **atualiza** o parágrafo de abertura acima (que dizia "valem o `AGENTS.md` e as fontes de verdade")…

O `AGENTS.md` (linhas 7-8, idênticas nas quatro) não tem a ambiguidade: *"**Em divergência, prevalece o `CLAUDE.md`.**"*. **CONFLITANTE intra-arquivo**, herdado da `main`, não introduzido nem corrigido por branch nenhuma. A cláusula 28-30 se auto-declara emenda, mas o parágrafo 3-6 continua literal no topo.

### 2.7 Bloco de interoperabilidade de modelo — **ADITIVO (só gov)**

`48a75e9:CLAUDE.md:39-46` e `AGENTS.md:45-52`, cercado por `<!-- interop:modelo:v1 -->`:

> - **Modelo por papel — mecanismo específico de cada ferramenta.** Os dois papéis de alto raciocínio (`planejador-mestre` e o porteiro pré-merge) têm **identificador de modelo diferente em cada lado**: no **Claude Code** é **`fable`**… no **Codex** é **`gpt-5.6-sol`** com `reasoning_effort: ultra`…

O mesmo bloco reescreve §C7.6 nos dois contratos. **Guardado por teste executável:** `48a75e9:tests/agent-model-routing.test.ts` linhas 222-252 exigem ≥1 bloco `<!-- interop:modelo:v1 -->` em `CLAUDE.md`, `AGENTS.md` e `EXECUTION_MODEL.md`, e falham se a alegação de modelo aparecer **fora** de bloco marcado. Marcadores ausentes em `origin/main`, `demo/investidor` e `12c3825` (`git grep -l 'interop:modelo'` = vazio nos três). **Mergear a gov sem os marcadores torna o teste vermelho; mergear os marcadores sem o teste os torna decorativos.**

### 2.8 §C2 — ciclo de vida de 8 → 10 etapas — **CONFLITANTE**

Ver §3 abaixo (o caso do porteiro, isolado).

### 2.9 Ajustes menores — **COSMÉTICO / ADITIVO** (só gov)

| Onde | `origin/main` (= demo = fin) | `48a75e9` | classe |
|---|---|---|---|
| §C9 KPI/documental | ``node --check`` dos `app.js` de KPI · `rg` confirmando marcadores | ``node --check Kpis/app.js`` (o painel é **UM** — `D-KPI-DUPLA-REVOGADA`) · `git grep` | ADITIVO (precisão + troca de ferramenta) |
| §8.5 GitHub Flow | `**Merge só com CI verde** + revisão quando exigida.` | `**Merge só com CI verde + junta registrada + parecer pré-merge literal do porteiro no mesmo head**` | CONFLITANTE |
| §C10 DoD | — | +2 checkboxes (porteiro pré-merge; executor pós-merge) | ADITIVO/CONFLITANTE |
| `AGENTS.md` §B1 e tabela de mapeamento | `os **24 papéis**… **EMULE** a junta adotando um papel de cada vez` | `A emulação sequencial pelo mesmo agente foi revogada por `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO`; sem agentes isolados suficientes, a entrega bloqueia.` + remove a contagem "24" | CONFLITANTE (revoga o fallback de emulação) |

### 2.10 `EXECUTION_MODEL.md` — só a gov diverge — **CONFLITANTE**

`§2` título: `## 2. Ciclo de vida de um bloco (as 7 etapas do C2)` → `(as 10 etapas do C2)`. `Etapa 6` deixa de ser *"verde = merge"*; nascem `Etapa 8` (porteiro pré-merge, com blocos `<!-- interop:modelo:v1 -->` e `<!-- gov:appid:v1 -->`), `Etapa 9` (merge) e `Etapa 10` (fechamento pós-merge factual). 21 hunks, 18 linhas removidas.

**Divergência interna latente:** o `EXECUTION_MODEL.md` da gov já reflete o porteiro pré-merge, mas **não** reflete o `1-bis`/`1-ter` da `demo/investidor` — e o `EXECUTION_MODEL.md` da `demo/investidor` **não reflete nem uma coisa nem outra** (blob idêntico ao da main). O contrato da `demo/investidor` está internamente dessincronizado com seu próprio `EXECUTION_MODEL.md` no §C7.1.

### 2.11 Defeito de fato dentro de `D-JUNTA-ESCOPO-E-CALIBRACAO` §6 (demo/investidor)

`HEAD:agent-orchestration/controle/decisoes.md`, §6:

> **Quatro versões divergentes do contrato** (`decisoes.md`: **1480** linhas em `origin/main`, **1606** em `demo/investidor`, 1649 na branch do financeiro, 1664 na de governança).

Medido: `origin/main` = **1545**, `demo/investidor` = **1700**. Os números 1649 e 1664 estão corretos. O "1606" era a contagem de `demo/investidor` **antes** do próprio commit que escreveu a decisão (`git show 1231e71^:…decisoes.md | wc -l` = 1606; `1231e71` = 1700). O "1480" não corresponde a nenhum estado de `origin/main` — a `main` não se moveu desde `6efe5ad`.

---

## 3. O caso do porteiro, isolado

### 3.1 `origin/main` = `demo/investidor` = `feat/o6r-b02-financial-uow` — **PÓS-MERGE**

`git show origin/main:CLAUDE.md` linha **231** (idem `AGENTS.md:259`; idem `HEAD:CLAUDE.md:231`; idem `12c3825:CLAUDE.md:231`) — verbatim:

> 8. **PORTEIRO PÓS-MERGE — o gate do próximo start (decisão do dono, 2026-08-12, `D-PORTEIRO-POS-MERGE`).**
>    Concluído o merge, nasce o agente `porteiro-pos-merge` (Fable por contrato). Ele **revalida** o que foi entregue — promessa do PR × diff real, contagens **reexecutadas** (não copiadas), KPI com `merge_commit`/`approved_head` preenchidos, ata da junta, pendências abertas/fechadas conferidas por amostragem, limpeza §C5, e se alguma pendência que **BLOQUEIA** o próximo alvo continua aberta. Só então **autoriza o início da próxima demanda** (`LIBERADO` / `LIBERADO COM RESSALVA` / `BLOQUEADO`), e morre até o próximo merge. **Sem parecer dele, nenhum bloco novo começa** — antes disso, quem entregava era quem atestava a própria entrega e já emendava no bloco seguinte.

E `§C2.6` imediatamente acima: *"**Junta do PR valida** (inclusive os números de KPI). Verde da junta = merge (autonomia por juntas, §C7); o humano audita a posteriori pelo history."*

| | |
|---|---|
| **Quando nasce** | **Depois** do merge concluído |
| **O que verifica** | 8 pontos: merge íntegro · promessa × diff · contagens reexecutadas · KPI fechado (§C3.5) · ata da junta (§C7.1) · pendências (1 por amostragem) · limpeza §C5 · pendência que BLOQUEIA o próximo alvo |
| **O que autoriza** | O **início da próxima demanda**. Não autoriza merge nenhum — o merge já ocorreu |
| **Linha literal de saída** | `LIBERADO` / `LIBERADO COM RESSALVA` / `BLOQUEADO` (sem PR nem SHA) |
| **Modelo** | Fable, por frontmatter |
| **Artefatos** | `.claude/agents/porteiro-pos-merge.md` (`9a97167d`) + espelho `.agents/agents/porteiro-pos-merge.md` (`c853fdc0`) — **os mesmos blobs nas três versões**. `scripts/post-merge-cleanup.sh`. **Nenhum `scripts/porteiro-*.mjs`. Nenhum workflow. Nenhum ruleset versionado.** |

**Só na `demo/investidor`:** `D-GOV-AMEACA-DESCUIDO` + `P-GOV-MAIN-SEM-PROTECAO — ATUALIZAÇÃO (2026-08-25)` registram um ruleset **instalado no servidor** (`gh api …/rulesets` → `21453239 active "main — PR + CI verde (tripwire, D-GOV-AMEACA-DESCUIDO)"`, `integration_id` 15368 pinado), **sem arquivo versionado no repo** (`.github/rulesets/` não existe em `HEAD`) e **explicitamente sem** o check do porteiro: *"O check do porteiro NÃO entrou: o workflow não existe na `main`, e exigi-lo bloquearia todo merge (e era o overclaim que o ciclo 3 derrubou)."*

### 3.2 `docs/governanca-porteiro-pre-merge-sol` — **PRÉ-MERGE**

`git show 48a75e9:CLAUDE.md` linha **242** (idem `AGENTS.md:268`) — verbatim (abertura):

> 8. **PORTEIRO PRÉ-MERGE — gate independente do merge** (decisão do dono, 2026-08-20, `D-PORTEIRO-PRE-MERGE`; identificador técnico legado `porteiro-pos-merge` preservado). Depois de junta + CI verdes, nasce um agente que não ocupou nenhuma alçada anterior. Ele reexecuta promessa × diff × testes × KPI × ata × pendências no **head exato** e só pode autorizar com a linha literal
>    `LIBERADO: merge do PR #<n> no head <sha>`. `LIBERADO COM RESSALVA` e `BLOQUEADO` **não autorizam merge** — e deixam **rastro externo** (`publish --verdict BLOQUEADO|RESSALVA` publica comentário marcado + check-run `failure`). Qualquer commit/push que mude o head expira o parecer e exige novo porteiro independente.

Staffing (`<!-- interop:modelo:v1 -->`):

> **Staffing e modelo (mecanismo por ferramenta).** O porteiro é **staffado no Codex**: a invocação passa explicitamente `model: gpt-5.6-sol` e `reasoning_effort: ultra`. O **Claude Code** não emite atestado válido para este papel **por desenho** […] **Não há exceção de indisponibilidade aqui:** sem Codex/Sol o fluxo fica **bloqueado**…

> Os campos `runtime`/`model`/`reasoningEffort` do atestado são **declaração de invocação obrigatória — não são recibo nem prova** […] A prova conferível do atestado é outra: `commands` (lista de `{cmd, exitCode}`, cada `cmd` não vazia e todo `exitCode` igual a `0`) e `evidence.kpiLatestBlobSha`, que o gate confere contra o blob real de `Kpis/kpis-latest.json` **no head**…

Proveniência (`<!-- gov:proveniencia:v1 -->`):

> **VETO permanente.** A resolução de proveniência via **check-suite** é **VETADA** como mecanismo de verificação (`PD-GOV-PORTEIRO-PROVENIENCIA`, 2026-08-22: a API associa por repo+SHA e devolve atribuição **falsa** para `POST /check-runs`…). Reabrir exige **nova PD com medição que contradiga a atual**.

E as etapas 9 e 10, que não existem nas outras versões:

> 9. **Merge** somente com junta registrada, CI verde e o `LIBERADO` exato do porteiro para o mesmo head.
> 10. **PÓS-MERGE factual.** Outro agente, também distinto do porteiro e das alçadas anteriores, faz somente backfill de `pr`/`merge_commit`/`approved_head`… Ele não reabre mérito nem autoriza o merge já ocorrido. Sem esse fechamento, o próximo bloco não começa.

| | |
|---|---|
| **Quando nasce** | **Antes** do merge, depois de junta registrada + CI verde no head exato |
| **O que verifica** | promessa × diff × testes × KPI × ata × pendências **no `headRefOid` candidato**; independência cruzada contra `junta.identities` do snapshot; `junta.critical` conforme superfície do diff |
| **O que autoriza** | **O merge**, e só dele. O start do próximo bloco passa a depender da **Etapa 10** (executor pós-merge distinto) |
| **Linha literal de saída** | **`LIBERADO: merge do PR #<n> no head <sha>`** — literal, com nº do PR e SHA. `LIBERADO COM RESSALVA` e `BLOQUEADO` não autorizam |
| **Modelo** | `gpt-5.6-sol` + `reasoning_effort: ultra`, staffado no Codex; **Claude Code não emite atestado válido**; **sem exceção de indisponibilidade** |
| **Artefatos executáveis** | `scripts/porteiro-pre-merge.mjs` · `scripts/merge-authorized-pr.mjs` · `scripts/post-merge-finalize.mjs` · `scripts/kpi-release.mjs` · `.github/workflows/porteiro-pre-merge.yml` · `.github/rulesets/main.template.json` · `tests/porteiro-pre-merge-governance.test.ts` · `tests/kpi-release-tooling.test.ts` · `tests/agent-model-routing.test.ts` |
| **Agentes** | `.claude/agents/porteiro-pos-merge.md` **reescrito** (`de14431c`, +121/−121 vs main) · **`.claude/agents/executor-pos-merge.md` (NOVO, só aqui)** · 3 novos especialistas: `guardiao-anti-teatro-de-atestado.md`, `guardiao-enforcement-github-porteiro.md`, `guardiao-interoperabilidade-modelos-claude-codex.md` · `planejador-mestre.md` alterado |
| **Registro** | `J-GOV-PORTEIRO-PRE-MERGE-ciclo2.md` · `R-GOV-PORTEIRO-PRE-MERGE-ciclo1.md` e `-ciclo2.md` · 2 planos · `docs/omega-pd.md` +225 |

Frontmatter do agente, `48a75e9:.claude/agents/porteiro-pos-merge.md` linha 3 (vs. `origin/main` linha 3):

> gov: `description: Gate independente PRÉ-MERGE. Após junta e CI verdes, revalida o head exato e só a autorização literal permite o merge.`
> main/demo/fin: `description: Nasce na conclusão de CADA merge. Revalida o que foi entregue […] Poder de VETO sobre o start seguinte. Dorme até o próximo merge.`

Nos dois casos `name: porteiro-pos-merge` e `model: fable` — **mesmo id técnico, mesmo frontmatter de modelo, corpos opostos**. Uma reconciliação que preserve os dois arquivos com o mesmo `name` produz colisão de subagente.

### 3.3 O que cada versão diz sobre a decisão de escolher

`12c3825:agent-orchestration/controle/decisoes.md`, `D-CONTRATOS-FORA-DO-PR-FINANCEIRO`:

> **O que este registro NÃO faz.** Não escolhe um dos dois textos, não funde os dois, não declara qual está certo. **O texto normativo pertence à trilha de governança** (`docs/governanca-porteiro-pre-merge-sol`)… Enquanto não ocorrer, **vale o que está no `origin/main`**.

`HEAD:agent-orchestration/controle/decisoes.md`, `D-JUNTA-ESCOPO-E-CALIBRACAO` §6:

> - **O porteiro em dois lugares** (pós-merge no texto vigente, pré-merge no da governança) — a decisão que registra o conflito explicitamente não escolhe. Escolher na reconciliação.

`HEAD`, `D-GOV-AMEACA-DESCUIDO` consequência 3 — a única das quatro que diz o que **sobrevive** da branch de governança:

> **A entrega da governança encolhe** para o que a plataforma sustenta mecanicamente: PR obrigatório · head congelado (strict) · CI verde do app certo · sem force-push · sem delete de `main`. O que sobrevive da branch: compare-and-swap do head, normalização de checks (D-10), paginação de files, `aplicaSeABranchDefault`, registro externo imutável por merge.

E consequência 1, que contradiz o §C2.8 da gov ponto a ponto:

> 1. **O pin de modelo/runtime SAI do `verifyAttestation`** e vira registro auditável a posteriori […] O gate que exige `runtime === 'codex'` está morto: era controle de sinal trocado (o honesto ficava vermelho, o forjador verde).

---

## 4. Espelho `CLAUDE.md` × `AGENTS.md` DENTRO de cada versão

Método: `diff <(sed -n '/^## C2\./,/^## 8\. GitHub Flow/p' CLAUDE.md) <(idem AGENTS.md)`.

### §C2–C7: **3 hunks nas quatro versões — todos mecanismo puro, e idênticos entre as quatro**

| # | §  | `CLAUDE.md` | `AGENTS.md` | classe |
|---|---|---|---|---|
| 1 | C5.4 | `…3 PNGs de marca, `.env` local, `.claude/skills/*``  | `…`.agents/skills/*` e `.claude/skills/*`` | mecanismo (caminho de skills) |
| 2 | C7.3 | `qualquer dúvida → `agente-pesquisador-web` (≥3 fontes)` | `qualquer dúvida → subagente pesquisador web (≥3 fontes)` | mecanismo (nome de subagente) |
| 3 | C7.4 | `**ciclos 1–2 = a `agente-fabrica` CRIA 1–2 especialistas…** ` | `**ciclos 1–2 = a fábrica de agentes CRIA 1–2 especialistas…** ` | mecanismo (nome de subagente) |

Ranges: main `84c84 / 116c116 / 119,122c119,122` · demo `84c84 / 161c161 / 164,167c164,167` · fin `84c84 / 116c116 / 119,122c119,122` · gov `130c130 / 163c163 / 166,169c166,169`.

**Nas quatro versões o espelho §C2–C7 está exatamente como o esperado: só mecanismo.** Em particular:
- **`demo/investidor`:** as 39 linhas do `1-bis`/`1-ter` foram inseridas **byte-idênticas** nos dois contratos.
- **`48a75e9`:** o §C2.8 pré-merge, o §C7.4-bis reescrito e o §C7.6 foram inseridos **byte-idênticos** nos dois contratos.
- **`12c3825`:** nada mudou, logo nada divergiu.

### PARTE A: **5 hunks nas quatro** — e um deles **não** é mecanismo

O §A4.3 (item 2.5 acima) é **regra comum divergente** em `origin/main`, `demo/investidor` e `12c3825` (`CLAUDE.md` sem `(junta — §C7)`), e **está corrigido só em `48a75e9`**. A própria gov classifica e registra isso em `decisoes.md`:

> **Classificação:** o qualificador `(junta — §C7)` é **regra comum**, não mecanismo de ferramenta […] Logo, **harmoniza**. […] o `CLAUDE.md` recebe o qualificador e ambos passam a nomear o regime vigente.

Os outros 4 hunks de PARTE A são cabeçalho/preâmbulo legitimamente assimétricos (título, "espelha AGENTS.md" × "mesma do `CLAUDE.md`", §A1 item 2, §A4 título "Codex → Claude Code" × "Claude Code ↔ Codex").

### Fora de C2–C7 (só `AGENTS.md`, portanto sem espelho a conferir)

Só em `48a75e9`, o `AGENTS.md` §B1 e a tabela de mapeamento final: remoção da contagem `**24 papéis**` / `24 agentes` e revogação do fallback de emulação sequencial. **Sem contraparte no `CLAUDE.md`** — correto (seções exclusivas do adaptador Codex), mas a norma que revogam (`D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO`) existe só na gov e na fin, em textos diferentes.

---

## 5. Ordem de nascimento

`git log -S"<id>" --all --reverse --format='%ci %h %s'`:

| id | 1ª aparição | branch | 2ª aparição | branch | leitura |
|---|---|---|---|---|---|
| `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO` | **2026-08-20 21:38:38 `29fa507`** *"docs(governanca): separa papeis em todo fluxo e aprova plano F6"* | `feat/o6r-b02-financial-uow` | 2026-08-20 23:58:53 `f3ba01b` | `docs/governanca-…-sol` | **A versão do financeiro é o original (2h20 antes).** A da governança é a **emenda**, e é ela que troca "porteiro pós-merge" por "porteiro pré-merge + executor pós-merge" — a emenda **encurtou** o texto e **descartou** as 6 consequências numeradas e a tabela de alçadas |
| `D-PORTEIRO-PRE-MERGE` | 2026-08-20 23:58 `f3ba01b` | gov | emendas: `e8cdaf6`, `845551f`, `438d8b3`, `c0438ae` (todas 2026-08-22) | gov | nasce e vive só na gov; a emenda `845551f` (*"atestado sem teatro"*) **retrata** a alegação "GitHub App comprovada" da emenda do ciclo 1 |
| `D-FABLE-PARA-GPT-5-6-SOL` | 2026-08-20 23:58 `f3ba01b` | gov | `1bf3a46` (2026-08-22, guard) | gov | mesmo commit de nascimento do pré-merge — são um par |
| `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` | 2026-08-23 16:07 `7ba441a` | fin | 2026-08-28 `1231e71` (citada) | demo | nasce na fin; a `demo/investidor` a **cita** em `D-JUNTA-ESCOPO-E-CALIBRACAO` §6 sem carregá-la |
| `D-INSTANCIA-NOVA-COM-AUDITORIA` | 2026-08-23 `40bfd72` | fin | — | — | posterior ao `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO` da fin; **responde a uma pergunta aberta pela rodada de governança**, mas mora na branch do financeiro |
| `D-INSPETOR-TERRENO-JUNTA` | 2026-08-25 `3b4837a` | demo | — | — | posterior às duas versões do TODO-FLUXO; a cláusula `1-bis` que a amarra existe só na demo |
| `D-GOV-AMEACA-DESCUIDO` | 2026-08-25 `baac5d0` | demo | — | — | **a mais nova sobre governança do merge** — posterior a todo o corpo da branch de governança (`48a75e9` é de 2026-08-23) |
| `D-JUNTA-ESCOPO-E-CALIBRACAO` | 2026-08-28 `1231e71` | demo | `d711f50` (emenda) | demo | a mais nova de todas |

**Cronologia consolidada da norma de papéis/porteiro:**
`D-PORTEIRO-POS-MERGE` (08-12, main) → `D-JUNTA-SEPARACAO-DE-PAPEIS` (08-17, main) → **TODO-FLUXO/fin** (08-20 21:38) → **TODO-FLUXO/gov + PRE-MERGE + FABLE-SOL** (08-20 23:58) → emendas gov (08-21/08-22) → `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` (08-23) + `D-INSTANCIA-NOVA` (08-23) → `D-INSPETOR-TERRENO` (08-25) → **`D-GOV-AMEACA-DESCUIDO` (08-25)** → `D-JUNTA-ESCOPO-E-CALIBRACAO` (08-28).

A decisão **mais recente** sobre o assunto do porteiro (`D-GOV-AMEACA-DESCUIDO`, 08-25) é **posterior a toda a branch de governança** e manda encolher explicitamente o que ela entrega — mas vive numa branch que **não contém** o texto que ela manda encolher.

---

## 6. Risco de perda

### Se `feat/o6r-b02-financial-uow` (`12c3825`) mergear na `main` sem reconciliação

- Contratos: **risco zero** — `CLAUDE.md`/`AGENTS.md`/`EXECUTION_MODEL.md` são o blob da `main`.
- Entra: `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO` (versão **fin**, pós-merge) + `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` + `D-INSTANCIA-NOVA-COM-AUDITORIA`.
- **Perda:** nenhuma decisão pré-existente. **Mas** a `main` passa a ter na `decisoes.md` uma norma (`TODO-FLUXO`, alçada *"Porteiro pós-merge"*) que a versão da gov depois vai querer **substituir sob o mesmo id** — e o §C7.4-bis do `CLAUDE.md` **continua apontando para `D-JUNTA-SEPARACAO-DE-PAPEIS`** (2026-08-17), sem citar a ampliação. Norma nova em `decisoes.md` sem cláusula correspondente no contrato.
- Detalhe: `D-DIVERGENCIA-C4-PONTA-AUSENTE` entra na `main` como heading `D-` dentro de `pendencias.md`.

### Se `demo/investidor` (`d711f50`) mergear na `main` sem reconciliação

- Contratos: **puramente aditivo, 1 hunk**. Nada da `main` é apagado.
- Entra: §C7.1 `1-ter` (escopo do veredito + quórum por risco + 2 lições de terreno) e `1-bis` (inspetor de terreno) nos **dois** contratos + `D-INSPETOR-TERRENO-JUNTA`, `D-GOV-AMEACA-DESCUIDO`, `D-JUNTA-ESCOPO-E-CALIBRACAO` + `P-GOV-MAIN-SEM-PROTECAO` + o agente `inspetor-de-terreno-da-junta` (`.claude/` + `.agents/`).
- **Perde-se:** nada existente. **Fica faltando, e vira dívida silenciosa:**
  - `EXECUTION_MODEL.md` **não** recebe o `1-bis`/`1-ter` → o companheiro do contrato passa a descrever um §C7.1 que não existe mais (`§5 Composição da junta` continua "maioria simples / unânime com 5", sem o quórum por risco). Dessincronia introduzida **pelo próprio merge**.
  - `D-GOV-AMEACA-DESCUIDO` entra na `main` mandando encolher uma branch (`docs/governanca-…`) cujo conteúdo a `main` não tem — decisão sem objeto.
  - O ruleset descrito em `P-GOV-MAIN-SEM-PROTECAO` continua **só no servidor**, sem `.github/rulesets/` versionado.
  - Fixa na `main` os números errados de `D-JUNTA-ESCOPO-E-CALIBRACAO` §6 (1480/1606 vs 1545/1700).
- **Colisão futura garantida:** o hunk `@@ -331,0 +332,45 @@` fica adjacente às linhas 327/331 que a gov reescreve.

### Se `docs/governanca-porteiro-pre-merge-sol` (`48a75e9`) mergear na `main` sem reconciliação

Único caso com **remoção real de norma**. Perde-se, parágrafo a parágrafo:

**Do `CLAUDE.md` (−33 linhas) e `AGENTS.md` (−37):**
1. **§C2.6 inteiro** — `Verde da junta = merge (autonomia por juntas, §C7); o humano audita a posteriori pelo history.`
2. **§C2.8 inteiro** — o porteiro pós-merge de `D-PORTEIRO-POS-MERGE` (10 linhas em cada contrato), incluindo *"**Sem parecer dele, nenhum bloco novo começa**"* e *"pendências abertas/fechadas conferidas por amostragem"*. A função "gate do próximo start" migra para a Etapa 10 (executor factual) que **não reabre mérito**.
3. **§C7.1 item 1, primeira linha** — `**Verde da junta = merge + próximo bloco.**`
4. **§C7.4-bis inteiro** — `SEPARAÇÃO DE PAPÉIS NA CORREÇÃO — quem acha NÃO conserta` (`D-JUNTA-SEPARACAO-DE-PAPEIS`, 2026-08-17), substituído pela redação `TODO-FLUXO` da gov, que **não repete** as consequências da versão do financeiro.
5. **§C7.6 inteiro** — `O `planejador-mestre` roda em **Fable por padrão**`, substituído pelo par `fable`/`gpt-5.6-sol`.
6. **§8.5** — `**Merge só com CI verde** + revisão quando exigida.`
7. **`AGENTS.md` §B1 + tabela de mapeamento** — o **protocolo de emulação da junta** (*"se **não** puder, **EMULE** a junta adotando um papel de cada vez… e registre os votos na ata"*) e as contagens `24 papéis` / `24 agentes`. É o único fallback documentado para Codex sem subagentes isolados.

**Do `EXECUTION_MODEL.md` (−18 linhas):** títulos das Etapas 6 e 7, `**Verde da junta + CI verde = merge**`, `### Composição da junta`, `**backfill pós-merge** no bloco seguinte` (3 ocorrências), a moral do exemplo Ω4C PR-06 (`a junta aprova o produto, mas o **CI verde** é condição de merge`), e `rg "<marcador-do-bloco>"`.

**Perde-se por ausência (o que a gov não tem e a `main` de amanhã precisará):**
- `D-INSPETOR-TERRENO-JUNTA`, `D-GOV-AMEACA-DESCUIDO`, `D-JUNTA-ESCOPO-E-CALIBRACAO` e as cláusulas `1-bis`/`1-ter`.
- `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` — a decisão que **manda** fazer esta reconciliação some do registro se a gov mergear primeiro e a fin depois for rebaseada por cima.
- `D-INSTANCIA-NOVA-COM-AUDITORIA` — que responde a uma pergunta aberta **pela própria rodada de governança**.
- A versão original (e mais longa) de `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO`.

**E entra em contradição direta com o que já está decidido na `demo/investidor`:**
- `D-GOV-AMEACA-DESCUIDO` §1 (*"o pin de modelo/runtime **SAI** do `verifyAttestation`"*, *"O gate que exige `runtime === 'codex'` está morto"*) × §C2.8 da gov (*"**Staffing e modelo**… `model: gpt-5.6-sol` e `reasoning_effort: ultra`… **Não há exceção de indisponibilidade aqui**"*) e `tests/agent-model-routing.test.ts`.
- `D-GOV-AMEACA-DESCUIDO` §4 (*"nenhum artefato diz 'prova', 'independente' ou 'inforjável'"*) × o vocabulário do §C2.8 da gov (*"A prova conferível do atestado é outra"*, *"nasce um agente que não ocupou nenhuma alçada anterior"*, `porteiro pré-merge **independente**` no DoD).
- Quórum: `unanimidade de 3` para dinheiro/segurança (demo) × `critical: true` ⇒ `5 votantes distintos e unânimes` para qualquer diff que toque `CLAUDE.md`/`AGENTS.md` (gov).

### Perda transversal (qualquer ordem de merge)

- **Colisão de id:** `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO` com dois corpos. Quem mergear por último e resolver "escolhendo um lado" apaga o outro em silêncio — o cenário nominal que `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` proíbe.
- **Colisão de agente:** `.claude/agents/porteiro-pos-merge.md` e `.agents/agents/porteiro-pos-merge.md` têm `name: porteiro-pos-merge` nos dois desenhos. Não coexistem.
- **Marcadores × guard:** `<!-- interop:modelo:v1 -->` / `<!-- gov:proveniencia:v1 -->` / `<!-- gov:appid:v1 -->` só existem na gov, junto com `tests/agent-model-routing.test.ts` que os exige em `CLAUDE.md`, `AGENTS.md` **e** `EXECUTION_MODEL.md`. Mergear o teste sem o texto (ou o texto sem o teste) quebra um dos dois lados.
- **A contradição do cabeçalho** (`CLAUDE.md:5-6` × `CLAUDE.md:28-30`) sobrevive a qualquer merge — nenhuma das quatro a toca.
- **`EXECUTION_MODEL.md`** só tem duas versões (main/demo/fin × gov), mas **três** conjuntos de norma para refletir. Qualquer merge o deixa desatualizado em relação a pelo menos uma branch.
- **Estado de trabalho não commitado** em `demo/investidor`: `git status` marca `M` em `.claude/agents/planejador-mestre.md`, `.claude/agents/porteiro-pos-merge.md` e `scripts/sync-agent-agents.mjs`, mas `git diff` desses caminhos é **vazio** (sujeira de line-ending / stat). Vale um `git diff --stat` antes de qualquer operação, para garantir que não é uma quinta versão parcial.

---

### Referências rápidas para o orquestrador

```
git show origin/main:CLAUDE.md                    # §C2.8 pós-merge em 231; §C7.1 em 327-331; §C7.4-bis em 341
git show origin/main:AGENTS.md                    # §C2.8 em 259; §A4.3 (rico) em 95
git show d711f50:CLAUDE.md                        # §C7.1 1-ter/1-bis em 332-376
git show 12c3825:agent-orchestration/controle/decisoes.md   # TODO-FLUXO/fin em 1480-1517
git show 48a75e9:CLAUDE.md                        # §C2.8 pré-merge em 242-293; §C7.4-bis em 399; §C7.6 em 438
git show 48a75e9:agent-orchestration/controle/decisoes.md   # TODO-FLUXO/gov em 1548; D-PORTEIRO-PRE-MERGE em 1580
git show e4e914a:CLAUDE.md                        # §C7.4-bis financeiro revertido (só no histórico)
```
