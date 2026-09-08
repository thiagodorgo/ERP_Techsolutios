# J-B-GOV-ELENCO-ENXUTO — ata da junta do bloco `B-GOV-ELENCO-ENXUTO`

> **Quórum:** MAIORIA DE 3 (§C7.1-ter(b) literal — governança) · **Head de código:** `adc41a54` ·
> **Head julgado:** `9c0e6ac9` · **Base:** `origin/main` = `fe2748c8` ·
> **Terreno:** `LIBERADO COM RESSALVA` (R1–R5 fechadas antes do disparo; R5 e R6 viraram pendência) ·
> **Modelo:** o inspetor rodou em **Opus** — Fable esgotado, declarado (§C7.6-bis).

---

## §1 · VEREDITO

**APROVADO — 2×1**, por maioria de 3.

| Cadeira | Papel | Voto | Achados |
|---|---|---|---|
| **C1** `validador-mestre` | escopo · faxina · KPI | **REPROVADO** | `C1-E-01` ALTA · `C1-E-02` MÉDIA |
| **C2** `guardiao-fail-closed` | a recusa é fail-closed? | **APROVADO** | 2 MÉDIA · 2 BAIXA — nenhum bloqueia |
| **C3** `agente-ci-doutor` | o auditor encolhido ainda pega? | **APROVADO** | 1 MÉDIA · 4 BAIXA — nenhum bloqueia |

**As três declararam participação prévia** no ciclo 1 do `B-GOV-ELENCO` (ressalva R2 do terreno), e as três
publicaram **forma completa**: Node v20.19.5, `core.autocrlf=true`.

## §1-bis · O MERGE FICA RETIDO POR RAIL, NÃO PELA JUNTA

**A junta aprovou. O merge não sai — e a distinção importa.**

O §8.7 traz um **rail** independente do voto: *"nunca merge com CI vermelho, DoD incompleta ou **KPI
divergente da execução real**"*. O achado `C1-E-01` é exatamente isso, e o orquestrador **reproduziu por
medição própria**: a série do painel é `161 → 162 → 163`, e o **`162` é o `B-GOV-ELENCO` — bloco REPROVADO
2×1 que nunca mergeou**, com `pr=null` e `merge_commit=null`. Mergear assim publicaria no painel **uma
entrega que não aconteceu**, e o desmentido vive num campo que a tela não lê.

**Maioria não levanta rail.** O `D-KPI-INDEX-PAINEL` existe porque o painel **é** a entrega; um painel que
mente é pior que painel nenhum, pela mesma razão que um gate degradado é pior que gate ausente. A cadeira C1
estava certa em reprovar, e as cadeiras C2 e C3 não julgaram esse ponto — o mandato delas era outro.

**Consequência:** correção **antes do merge**, dentro deste bloco, entregue a **agente distinto** de quem
achou (C1) e de quem escreveu o defeito (o orquestrador) — §C7.4-bis. Não é ciclo 2 de reprovação: a junta
aprovou; é o rail sendo cumprido.

---

## §2 · OS DOIS ACHADOS DA C1 — ambos do orquestrador, ambos confirmados por medição independente

### `C1-E-01` (ALTA · `dentro-do-bloco`) — o acumulado publica entrega que não aconteceu
A cadeira executou **o próprio painel** num sandbox `node:vm` (o mesmo arranjo de
`tests/kpi-dashboard-charts.test.ts`), em cópia isolada: `buildChartSeries` devolve
`161 (B-O6R-07b) → 162 (B-GOV-ELENCO) → 163 (B-GOV-ELENCO-ENXUTO)`, e o SVG sai com
`<title>08/09 — 162 blocos</title>`. **As duas afirmações do bloco não podem ser verdadeiras ao mesmo
tempo:** ou o 162 entregou — e aí a nota *"NÃO MERGEOU"* é falsa no instante do merge — ou não entregou, e o
degrau até 163 não se sustenta. `dentro-do-bloco` porque a entrada 162 foi autorada em `7facc396`, que **não
está em `origin/main`** e só chega lá por este PR. A cadeira **não escolheu** entre as duas leituras: é
matéria de quem planeja a correção (§C7.4-bis).

### `C1-E-02` (MÉDIA · `dentro-do-bloco`) — a parada de rodada não tem decisão registrada
O `§C7.6-bis` institui a escada `Fable → Opus → PARADA` citando `D-FALLBACK-MODELO-FABLE-OPUS`.
Medido: **0 ocorrências** desse identificador em `agent-orchestration/controle/decisoes.md`, contra 21
arquivos `.md` da árvore que o citam. **Não foi falta de oportunidade** — o mesmo diff acrescentou
`D-SAN2-OPCAO-C`, `D-APOSENTADORIA-ELENCO-EFEMERO`, `D-QUORUM-B-GOV-ELENCO` e `D-AUDITOR-ENXUTO` ao registro.
A norma governa **em que modelo todo gate de junta roda** e institui uma **parada**, e a sua única autoridade
escrita é o texto que a cita — circular. É §A5/§A6/§C6: decisão materialmente relevante vai para a estrutura
operacional, não só para o corpo do contrato.

---

## §3 · O QUE AS OUTRAS DUAS PROVARAM

**C2 — fail-closed provado em 40 mutações.** Papel de **nome qualquer** com `Write`, ferramenta
**desconhecida** e `tools:` **ausente** saem todos vermelhos; a recusa nomeada reprova **sem fabricar nome**
em **15 de 16** construções fora do subconjunto declarado. A 16ª virou `C2E-01`.

**C3 — o auditor encolhido ainda pega o que promete.** Tabela de falso-negativo por checagem, com o corte do
`C8` confirmado como real e sem desativar nada em silêncio; o `C0` (alvo vazio não é limpo) sobreviveu.

**Os dois bloqueantes do ciclo 2 do bloco anterior morreram por construção**, e o orquestrador os verificou
antes da junta: link quebrado injetado → `0 achados, ec=0` (a checagem não existe mais); comentário no fim de
`tools:` → `ec=1` com `C1 recusa de medição` e **zero** fabricação de nome.

## §4 · PENDÊNCIAS ABERTAS POR ESTA JUNTA

Nenhuma bloqueia; todas com dono, em `controle/pendencias.md`:
`P-GOV-RECUSA-CANCELA-ACUSACAO` (`C2E-01` — a chave excluída da recusa cancela acusação verdadeira:
**fail-OPEN de exit code**) · `P-GOV-DEFAULT-DENY-POR-NOME-BASE` (`C3-E1` — a allowlist é chaveada pelo
nome-base do arquivo, não pelo papel: **fail-OPEN por colisão de nome**) · `P-GOV-MODELO-FIXADO-SEM-MECANISMO`
(`C2E-02` — gate novo nasce não-conferido) · `P-GOV-AUDITOR-ARESTAS-MENORES` (`C2E-04`, `C3-E2`..`C3-E5`).
Somam-se as do terreno: `P-GOV-INSPETOR-33-SEM-NORMA` (ALTA) e `P-GOV-ESGOTADO-SEM-TESTE`.

## §5 · §C7.4-bis — QUEM OCUPOU CADA PAPEL

| Papel | Quem |
|---|---|
| Quem ACHOU | `inspetor-de-arnes-concorrente` (bloco anterior) · e, nesta junta, C1, C2, C3 e o inspetor |
| Quem DECIDIU o corte | **o dono**, a partir do `DOSSIE-B-GOV-ELENCO.md` (§A1.1) |
| Quem DESENVOLVEU | `dev-gov-enxuto` — identidade distinta, não é o orquestrador |
| Quem JULGOU | `validador-mestre` · `guardiao-fail-closed` · `agente-ci-doutor` — participação prévia declarada por todas |
| Gate | `inspetor-de-terreno-da-junta`, em **Opus** (Fable esgotado, declarado) |
| Quem CORRIGE o rail | **agente distinto de C1 e do orquestrador** — §6 |

## §6 · CONSEQUÊNCIA

1. **Correção do rail, antes do merge:** `C1-E-01` (o acumulado do KPI) e `C1-E-02` (a decisão ausente do
   registro). Entregue a agente distinto de quem achou e de quem escreveu o defeito.
2. **Re-verificação por quem achou** — a C1 confere o conserto. Verificar não é consertar; o §C7.4-bis proíbe
   o segundo, não o primeiro.
3. **PR, CI verde, merge** (squash + `--delete-branch`), `post-merge-cleanup.sh`, e o `porteiro-pos-merge`.
