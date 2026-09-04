# Diário pós-voto — SAN2-3 (PR #364, APROVADO 3×0)

**Quem escreve:** agente de correção pós-junta. **Não** foi quem achou (§C7.4-bis,
`D-JUNTA-SEPARACAO-DE-PAPEIS`). Os três achados foram levantados pelas cadeiras C1
(`auditor-do-obituario`), C2 (`zelador-do-escopo-e-do-instrumento`) e C3 (`registro-kpi`).

**Worktree:** `.claude/worktrees/san2-r` · **branch:** `chore/san2-3-obituario-especialistas` ·
**head na abertura:** `23d9227`.

**Escopo autorizado desta passada (fechado):**
`agent-orchestration/controle/pendencias.md` · `agent-orchestration/controle/pendencias-indice.md`
(somente via script) · `agent-orchestration/omega/juntas/votos/SAN2-3/dev-log.md` · este diário.
**Proibido:** `Kpis/`, `src/`, `tests/`, `scripts/`, `.github/`, contratos, o plano do bloco,
a branch `demo/investidor`. **Não commitar.** Não tocar `erp-postgres`/`erp-redis`.

---

## Passo 0 — leitura dos três votos (antes de agir)

Li os três `.json` em `agent-orchestration/omega/juntas/votos/SAN2-3/`:

| cadeira | achado | escopo | gravidade | ação mandatada |
|---|---|---|---|---|
| C3 `03-registro-kpi-voto.json` | `A-1` — `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` declara **dois donos**: a linha de status já diz `SAN2-5`, a narrativa "### Dono e o que falta" ainda abre com "**Dono: a atribuir**" | `dentro-do-bloco` | baixa | **CORRIGIR** (alinhar a narrativa) |
| C2 `02-escopo-voto.json` | `C2-A1` — o fechamento do `dev-log.md` afirma que os **11** arquivos do diff estão **todos** na lista fechada do §5; a formulação exata é **10 na lista + 1 nomeado no cabeçalho** (`votos/SAN2-2/00c-porteiro-pos-merge-363.md`, l.6 do plano) | `dentro-do-bloco` | BAIXA | **CORRIGIR NO REGISTRO** (dev-log; não alterar o plano) |
| C1 `01-obituario-voto.json` | `A-1` — o obituário cobre quem tinha **arquivo**, não quem **votou**: derivado de `.claude/agents/especialistas/`, deixou **15** identidades queimadas fora do registro (entre elas as 4 cadeiras que julgaram o #363) | `pre-existente` | media | **REGISTRAR COMO PENDÊNCIA — não consertar** |

Anotações que os votos deixam explícitas e que orientam esta passada:

- C3 mede que o defeito **não tem impacto no índice gerado** — o classificador procura `**dono:**`
  ou `**Dono:?**`, e a linha narrativa é `**Dono: a atribuir**` (espaço depois de `Dono:`, não `**`),
  que não casa nenhum dos dois. O dano é de **leitura humana**: quem abre a pendência lê dois donos.
- C2 registra que o índice inalterado é `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` **se manifestando**, e que
  isso **não é defasagem** — medição eol-neutro, nunca `md5sum`/`git status`.
- C1 nomeia o **atenuante medido** que salva o documento (§4 declara a fronteira; §1.4 se recusa a
  absolver por ausência — fail-closed) e diz que **o número real é maior** que 15 (jurados caídos e
  inspetores não contados). E fecha com `correcao_proposta: null`.

## Passo 1 — placar do índice ANTES de qualquer edição

```
$ python agent-orchestration/controle/gerar-indice-pendencias.py
indice: 233 cabecalhos / 225 IDs | {'FECHADA': 47, 'ABERTA': 186} | baldes {'-': 47, 'C': 77, 'B': 77, 'A': 32} | diferidas-materiais 2
$ git diff --exit-code -- agent-orchestration/controle/pendencias-indice.md   ->  exit=0
```

Medição **eol-neutro** (`git diff --exit-code`, nunca `md5sum`/`git status`): o índice commitado já
estava em dia com o `pendencias.md` do head `23d9227`.

---

## Passo 2 — C3/A-1 CORRIGIDO: a narrativa da `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` alinhada ao `SAN2-5`

**O que estava errado.** A mesma pendência declarava **dois donos**: a linha de status (campo canônico,
final da pendência) já dizia `**dono:** bloco **SAN2-5**`, e a seção narrativa `### Dono e o que falta`
ainda abria com `**Dono: a atribuir**` seguido de "Não nomeio bloco existente…" — texto do registrador do
`SAN2-2`, escrito quando de fato não havia dono, e que o `SAN2-3` deixou intocado ao editar só a linha de
status. A C3 mediu que isso **não afeta o índice gerado** (o classificador procura `**dono:**` /
`**Dono:?**`, e `**Dono: a atribuir**` não casa nenhum): o dano é de leitura humana.

**O que fiz — e só isso.** Substituí o parágrafo de abertura da seção narrativa (3 linhas → 5), sem
reescrever nenhuma outra parte da pendência: o `### O que é`, a citação da C4, a re-medição própria, o
`### Por que importa`, o `### Severidade`, a direção de correção e o critério de fechamento seguem
**verbatim**. O novo parágrafo (a) nomeia `SAN2-5` como dono, (b) preserva a razão histórica do "a
atribuir" em vez de apagá-la, (c) diz quem nomeou (`SAN2-3`, §3.5 do plano, quitando a ressalva do
porteiro do #363) e (d) declara que a **linha de status é o campo canônico**, para o próximo leitor não
reabrir a mesma dúvida.

Diff medido: `+5 / -3` no único parágrafo, dentro da pendência. Nenhuma outra pendência tocada — as duas
outras ocorrências de "Dono: a atribuir" que restam no arquivo (l.3890 `P-ARNES-AUTHORITY-PORTAL-
INTERMITENTE`, l.4334 outra pendência) são de **outros** registros, fora do mandato desta passada.

---

## Passo 3 — C2/A-1 CORRIGIDO NO REGISTRO: a conta do §5 no `dev-log.md`

**O que estava errado.** O `## Fechamento` do `dev-log.md` afirmava: *"os 11 arquivos do PR estão **todos**
dentro da lista fechada do §5"*. Impreciso em **1 dos 11**.

**Conferi eu mesmo, não copiei da C2.** A lista PERMITIDA do §5 (`SAN2-3-plano.md` l.222-231) tem 11
marcadores e cobre 10 dos 11 arquivos do diff:

| # | arquivo do diff (`git diff --name-only main...HEAD`) | onde é autorizado |
|---|---|---|
| 1 | `.claude/agents/inspetor-de-terreno-da-junta.md` | §5, marcador próprio |
| 2 | `.agents/agents/inspetor-de-terreno-da-junta.md` | §5, "somente via `sync-agent-agents.mjs`" |
| 3 | `Kpis/app.js` | §5, "somente a linha `var FROZEN` via `kpi-freeze.mjs`" |
| 4 | `Kpis/kpis-history.json` | §5 |
| 5 | `Kpis/kpis-latest.json` | §5 |
| 6 | `agent-orchestration/controle/decisoes.md` | §5 |
| 7 | `agent-orchestration/controle/pendencias.md` | §5 |
| 8 | `.../omega/juntas/OBITUARIO-IDENTIDADES.md` | §5 |
| 9 | `.../omega/planos/SAN2-3-plano.md` | §5 |
| 10 | `.../omega/juntas/votos/SAN2-3/dev-log.md` | §5, pelo glob `votos/SAN2-3/**` |
| **11** | `.../omega/juntas/votos/SAN2-2/00c-porteiro-pos-merge-363.md` | **NÃO está na lista** — o glob do §5 é `votos/SAN2-3/**`. Está **nomeado verbatim na l.6 do cabeçalho do plano**, como autorização de start |

**O que fiz.** Reescrevi **só** a frase de escopo do `## Fechamento`, com a contagem certa (**10 na lista
fechada + 1 nomeado no cabeçalho**), o caminho e a linha exata da citação, o motivo de o arquivo não poder
existir no próprio #363 (é o parecer *sobre* aquele merge, commitado em `f56e453`) e a razão pela qual a C2
ressalvou sem reprovar (adição pura de peça de rastreabilidade §C6, nada do PROIBIDO). O restante do
`dev-log.md` — P1-P7, a tabela da bateria, as divergências, a limpeza — ficou **intocado**.

**O plano NÃO foi alterado**, como o mandato exige: a imprecisão estava no registro do dev, não no §5.

---

## Passo 4 — C1/A-1 REGISTRADO COMO PENDÊNCIA (não consertado)

Criada `## P-OBITUARIO-DERIVADO-DO-DIRETORIO (2026-08-31) — MÉDIA`, apensada ao fim de
`agent-orchestration/controle/pendencias.md` (l.4506, 90 linhas). **Nada do obituário foi tocado** — o
achado é `pre-existente` e o mandato desta passada é registrá-lo, não fechá-lo; a cadeira C1 fechou com
`correcao_proposta: null` e o §C7.4-bis proíbe que quem trata a junta emende o artefato julgado.

O que a pendência carrega, item a item do mandato:

- **status ABERTA · severidade MÉDIA · dono real `SAN2-5`** — não "a atribuir", coerente com as duas outras
  pendências da rodada, que o `SAN2-3` já atribuiu a esse bloco ("ferramentas de registro honestas"); esta
  entra como **parte 3**. Com a cláusula de re-atribuição com registro, se o dono humano redirecionar.
- **A evidência da C1 com N, forma e causa:** `N = 15`; forma = contadas **só** nos `votos/*/*.json` com
  campo de autor, em juntas **concluídas**; causa = o registro **derivou do diretório**
  `.claude/agents/especialistas/`, **não das atas** (`git ls-tree demo/investidor -- .claude/agents/` = 0
  ocorrências para cada um dos 15 nomes). Registrado, como o voto exige, que **o número real é maior** —
  jurados caídos, suplentes que não assinaram e inspetores de terreno **não foram contados**.
- **A evidência de data** que sustenta o `pre-existente` (as quatro atas de 29-30/08 anteriores ao head
  `23d9227`) e a **de origem** (o mandato escrito do bloco era o diretório, §5 do plano l.54-57).
- **As 15 nomeadas**, com as **quatro cadeiras que julgaram o #363** destacadas
  (`provador-de-mutacao-do-espelho`, `curador-da-lista-suites-ci`, `zelador-do-contrato-canonico`,
  `auditor-do-kpi-honesto`) — são as mais recentes e as mais caras num descuido de composição.
- **O atenuante medido**, em seção própria: o documento **declara a fronteira** (§4, "o obituário NÃO os
  cobre") e **se recusa a absolver por ausência** (§1.4, fail-closed — "nome não listado exige a
  conferência nas atas, não um passe livre"), texto que o `3.1-bis` do inspetor replica. Conclusão escrita
  na pendência: o defeito é de **cobertura**, não de **confiabilidade** — e é por isso que é MÉDIA e não
  reprovou.
- **Critério de fechamento:** o obituário passa a ser **derivado das ATAS**, não do diretório — segunda
  passada varrendo `votos/**/*.json` e `J-*.md` pelo campo de autor e pelos briefings, absorvendo as 15 e
  as classes não contadas, cada linha com a evidência do voto/ata que a queimou, e o §5 reconciliado com o
  placar novo.

Conferi antes de fechar que o classificador **lê** a entrada como pretendido (mesmas regras do
`gerar-indice-pendencias.py`, aplicadas ao bloco novo): linha de status = `ABERTA`, severidade = `MÉDIA`,
`dono = True`, balde **A** (material, não diferida).

---

## Passo 5 — Provas

**Índice regenerado (DEPOIS):**

```
$ python agent-orchestration/controle/gerar-indice-pendencias.py
indice: 234 cabecalhos / 226 IDs | {'FECHADA': 47, 'ABERTA': 187} | baldes {'-': 47, 'C': 77, 'B': 77, 'A': 33} | diferidas-materiais 2
```

**Placar antes × depois:**

| | antes | depois | Δ |
|---|--:|--:|--:|
| cabeçalhos `## P-` | 233 | **234** | +1 |
| IDs distintos | 225 | **226** | +1 |
| ABERTAS | 186 | **187** | +1 |
| — ativas nesta rodada | 109 | **110** | +1 |
| FECHADAS | 47 | 47 | 0 |
| balde A (material) | 32 | **33** | +1 |
| baldes B / C | 77 / 77 | 77 / 77 | 0 |
| CONTRADITÓRIAS | 0 | **0** | 0 |

O `+1` inteiro é a pendência nova; nada mais se moveu.

**A armadilha, confirmada na prática.** O diff do índice (`+7/-6`) contém **só** a linha nova de
`P-OBITUARIO-DERIVADO-DO-DIRETORIO` e os contadores. A linha de `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`
**não mudou**: sua coluna `dono` já dizia `sim` antes da correção do Passo 2 e continua `sim` depois —
é `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` se manifestando, exatamente como a C2 antecipou. **Isso não é
defasagem do índice**, e a correção do Passo 2, sozinha, produziria diff **vazio** aqui.

**Medição eol-neutro em todas as pontas** (`git diff --exit-code`, nunca `md5sum` nem `git status` —
`core.autocrlf=true` nesta árvore, e o `pendencias.md` está em CRLF no disco / LF no objeto):

```
$ git diff --exit-code -- agent-orchestration/controle/pendencias-indice.md   # ANTES: exit=0 (em dia)
$ git diff --exit-code -- agent-orchestration/controle/pendencias-indice.md   # DEPOIS: exit=1 (+7/-6)
$ git diff --check   ->  exit=0   (zero whitespace error)
```

**Arquivos tocados — e só estes:**

```
M  agent-orchestration/controle/pendencias.md            (Passo 2: +5/-3 · Passo 4: +90 linhas)
M  agent-orchestration/controle/pendencias-indice.md     (só via script)
M  agent-orchestration/omega/juntas/votos/SAN2-3/dev-log.md   (Passo 3: frase de escopo do Fechamento)
?? agent-orchestration/omega/juntas/votos/SAN2-3/pos-voto-log.md   (este diário)
```

**Intocados, conferidos por `git diff --name-status`:** `Kpis/**`, `src/**`, `tests/**`, `scripts/**`,
`.github/**`, contratos, `agent-orchestration/omega/planos/SAN2-3-plano.md`, o
`OBITUARIO-IDENTIDADES.md`, os papéis de agente e os dois espelhos. `demo/investidor` fora do alcance —
nenhum comando desta passada saiu da branch `chore/san2-3-obituario-especialistas`.
`erp-postgres`/`erp-redis` **não foram sequer consultados** — nada aqui precisa de banco.

**Não commitado**, como o mandato manda: a árvore fica para o próximo gate ler.
