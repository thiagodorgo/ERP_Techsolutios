# SAN2-1R — Evidência da cadeira 1 (FIDELIDADE À OPÇÃO C)

**Cadeira:** 1/3 — fidelidade à opção C · **poder de veto** · identidade nova.
**Head julgado:** `4cd0867` (o inspetor liberou `31cd9ad`; o delta foi conferido, não herdado).
**Base:** `a0a1075` · **Data:** 2026-08-29 · worktree `.claude/worktrees/san2-1`.
**Regra de ouro:** cada item escrito aqui ANTES de iniciar o item seguinte.

---

## Item 1 — Drift de head + R2 do inspetor

**Comandos executados:**
- `git rev-parse HEAD` → `4cd08677f69ae853723e99d6f360df58fe923ce5` ✔ (é o head do mandato)
- `git diff 31cd9ad..4cd0867 --name-status` →
  - `M agent-orchestration/controle/decisoes.md`
  - `A agent-orchestration/omega/juntas/votos/SAN2-1R/00-quedas.md`
  - `A agent-orchestration/omega/juntas/votos/SAN2-1R/00a-inspetor-evidencia.md`
  - `A agent-orchestration/omega/juntas/votos/SAN2-1R/00a-inspetor-parecer.md`
- `git diff 31cd9ad..4cd0867 --stat` → 4 arquivos, **237 inserções, 0 deleções**.
- O hunk de `decisoes.md` é `@@ -1843,3 +1843,24 @@` — **append puro** (só linhas `+`), nenhuma
  entrada anterior tocada. Os outros 3 são arquivos novos do próprio gate (quedas do inspetor,
  evidência e parecer). **Nenhum toque em código, pendências, KPI ou contratos.**

**Veredito parcial:** o delta é **registro puro**, exatamente o que o mandato descreve. ✔

**A `D-SAN2-OPCAO-C`** (append em `decisoes.md`, commit `4cd0867` "docs(governanca): D-SAN2-OPCAO-C
— a escolha do dono ganha entrada propria (R2 do inspetor)"):
- Existe, datada 2026-08-29, atribuída ao dono, citando o dossiê
  `omega/reprovacoes/DOSSIE-SAN2-1-parada.md` e a `D-TETO-DOIS-CICLOS`.
- **Fidelidade aos 5 elementos** contra o §4 do dossiê (opção C = "A agora, B depois"):
  1. **Salvar o verificado** — entrada: "mergear agora o que as duas juntas verificaram — índice
     gerado e idempotente, 97→0 sem status, a CRÍTICA falsa fechada, backfill, reconciliação,
     limpeza de disco". Bate item a item com a coluna "ganha" da opção A no §4 do dossiê. ✔
  2. **Etiqueta verdadeira** — entrada cita a frase exata do dossiê: "adiada por triagem
     automática; NÃO verificada item a item" (dossiê §4, opção A, mesma frase com ênfase em
     itálico no original). ✔
  3. **P-036 duplicata** — "fechar `P-036` como duplicata da `P-CHK-TEMPLATE-PRISMA-V7`" =
     dossiê §4 "P-036 é fechada apontando para a gêmea" + §2/A-C1 (mesma chamada, mesma causa). ✔
  4. **Tripwire fora** — "retirar o tripwire de tarifa do balde C". Não está verbatim na linha C
     da tabela §4, mas é a consequência direta do achado A-C2 do ciclo 2 (§2 do dossiê:
     "enterrá-lo num balde cuja etiqueta diz 'sem consequência de dinheiro' anula a única função
     que ele tem") e consta do briefing (item 3) como parte da escolha do dono. Fiel. ✔
  5. **Leitura adiada com registro** — "adiar — não descartar — a leitura real das 79 ... para
     DEPOIS do ciclo 5 ... registrada com dono e critério em `P-SAN2-LEITURA-DAS-79`" = dossiê §4,
     opção C: "B depois como bloco próprio, quando o ciclo 5 fechar". ✔
- A entrada ainda registra o **porquê de existir** (R2 do inspetor: decisão do dono tem de viver
  em `decisoes.md`, lição da `D-GOLIVE-MAPS-ROTACAO-DISPENSADA`) — o R2 está **atendido**.

**Item 1: LIMPO.** Delta = registro puro; `D-SAN2-OPCAO-C` existe e descreve fielmente a opção C
com os 5 elementos.

---

## Item 2 — A etiqueta (frase antiga × frase nova, nas 79)

**Frase antiga** ("sem consequência de produto, dado, segurança ou número"):
- `grep -rc` em `agent-orchestration/controle/` → **2 ocorrências**, ambas em `pendencias.md`
  (linhas 948 e 1240), dentro das entradas reabertas para o balde A no ciclo 1
  (`P-Ω4-3-REFATURAR-DELTA`, `P-Ω4-7-CLEAR-ATOMIC`). As duas são **citações** — *"A etiqueta
  colada aqui afirmava '...' — e o próprio texto da pendência desmente"* — nota de correção
  explicando por que a entrada voltou ao balde por severidade real. **Nenhuma afirma.** Bate com
  as 2 citações legítimas que o bloco alega. ✔

**Frase nova** ("adiada por triagem automática; NÃO verificada item a item"):
- `grep -c` da frase completa em `pendencias.md` → **79**. Fragmento "NÃO verificada item a item"
  → 80: a 80ª (linha 4060) é a citação da etiqueta dentro da própria `P-SAN2-LEITURA-DAS-79`,
  quebrada em duas linhas. Legítima.
- Mapeamento por script (python, cada linha de etiqueta → cabeçalho `## ` precedente): **79
  etiquetas em 79 entradas distintas** — 47 no formato `<sub>balde C —` + 32 no formato
  `<sub>Triagem SAN2-1 (...)`: exatamente o 32 + 47 = 79 que o dossiê nomeia como a população
  carimbada.
- **Reconciliação com o índice** (79 etiquetadas × 77 no balde C): 79 = **77 atualmente no balde C**
  (lista nominal do `pendencias-indice.md` §"ABERTAS · balde C — 77", incluindo as 2 diferidas de
  severidade MATERIAL destacadas para o dono: `P-Ω3b`, `P-Ω4-8-DASHBOARD-FIDELITY`) **+ `P-036`**
  (FECHADA como duplicata; trilha preservada §A2) **+ o tripwire `P-Ω3F3B-UPDATE-VALIDA4`**
  (RETIRADO do balde C; trilha preservada). As duas saídas mantêm a etiqueta corrigida como
  histórico, com a nota nova ACIMA — o índice **não** as conta como diferidas (P-036 na lista
  FECHADAS; tripwire na lista "balde A — material"). Nenhuma contagem mente.
- A troca da frase **não foi silenciosa**: cada etiqueta carrega o parêntese "(etiqueta corrigida
  em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que
  ninguém conferiu — achado A-C3 ...)".

**Amostragem de 3 diferidas ao acaso** (sorteio reprodutível: `random.seed('4cd0867')` — o head
julgado — sobre a lista das 79 na ordem do arquivo; `random.sample(, 3)`):
1. `P-JMAPAS7-PERF-SCALE` (linha 1473) — otimização futura de agregação, feature funcionando.
   Marcador `DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)` presente; nenhuma nota de verificação
   individual na entrada; consta na lista nominal do balde C (índice, linha 238). A frase nova
   diz a verdade: foi adiada pela triagem automática e ninguém a leu item a item. ✔
2. `P-WOTS-SCALE` (linha 1484) — mesma classe; idem (índice, linha 239). ✔
3. `P-REDIS-DEV-LIXO-DE-FILA` (linha 3237) — lixo de fila no Redis de dev, com nota de cuidado
   sobre mass-delete; idem (índice, linha 256). A etiqueta nova não nega o risco anotado (a
   antiga negaria "consequência de dado"). Verdadeira. ✔

**Achado menor (nota, dentro-do-bloco):** em `P-036` e no tripwire, a trilha preservada ainda
termina com "**Diferida, não descartada**"/"**Continua ABERTA** ... balde C" ABAIXO da nota nova
(FECHADA/RETIRADO). É a convenção §A2 (append, não apaga) e a nota vigente fica acima e é
inequívoca — mas um leitor apressado pode tropeçar. Não bloqueia; fica registrado.

**Item 2: LIMPO** (com 1 nota).

---

## Item 3 — Os 3 atos restantes

**(a) `P-036` FECHADA como duplicata** (`pendencias.md` linhas 425–439):
- Linha de status: `- **status:** FECHADA · **severidade:** era ALTA · **dono:** encerrado`.
- Nota de fechamento (linha 437): "FECHADA em 2026-08-29 (resgate da opção C) como DUPLICATA da
  `P-CHK-TEMPLATE-PRISMA-V7`, resolvida em 2026-08-02 ... mesma chamada (`checklistTemplate.create`),
  mesma causa (`tenant_id` explícito no nested-create do Prisma v7), mesma correção". Registra as
  DUAS afirmações erradas ("cosmética" + 27 dias aberta após o gêmeo fechar) e preserva o texto
  original (§A2).
- **Gêmeo conferido** (linha 1675): `P-CHK-TEMPLATE-PRISMA-V7` — "**RESOLVIDO (2026-08-02)**",
  fix = remoção do `tenant_id` explícito dos nested-creates, mesmo erro `Unknown argument
  tenant_id`, teste DB-gated `tests/checklist-template-prisma-db.test.ts` que falha contra o
  código antigo. O corpo da P-036 descreve exatamente a mesma chamada
  (`checklist-prisma.repository.ts:105`, `checklistTemplate.create`), mesmo erro, mesma causa
  (relation-scalar compartilhado no Prisma v7). **Duplicata procede.**
- **Comentário do fix conferido por leitura** (sem executar nada):
  `src/modules/checklists/checklist-prisma.repository.ts` linhas 142–144 — "P-CHK-TEMPLATE-PRISMA-V7
  — NÃO passar `tenant_id` aqui: é relation-scalar COMPARTILHADO ... O Prisma v7 rejeita o
  argumento explícito ('Unknown argument tenant_id') e o infere do template pai." É o comentário
  exato citado na nota de fechamento. ✔
- Índice: `P-036` na lista **FECHADAS — 45** (linha 270). ✔

**(b) Tripwire `P-Ω3F3B-UPDATE-VALIDA4` fora do balde C** (`pendencias.md` linhas 608–624):
- `- **status:** ABERTA · **severidade:** MÉDIA (reclassificada)` +
  `- **agendamento:** ~~DIFERIDO-LEVE~~ → **RETIRADO DO BALDE C em 2026-08-29** (achado A-C2 da junta)`.
- **Motivo escrito** no `<sub>`: "É um **tripwire de bypass de TARIFA**: existe exclusivamente
  para ser VISTO no dia em que alguém tornar `customer_id`/`service_catalog_id` mutáveis no
  update ... Enterrá-lo num balde rotulado 'sem consequência de dinheiro' anulava a única função
  que ele tem. O invariante segue valendo hoje (medido pela junta: `UpdateWorkOrderInput` não
  expõe os dois campos)." ✔
- Índice: consta na lista **ABERTAS · balde A — material — 31** (linha 64), NÃO na lista do
  balde C. O gerador não recaiu no defeito de marcar por substring (o `~~DIFERIDO-LEVE~~`
  riscado não o devolveu ao balde — exatamente o agravante do dossiê §3, agora não reproduzido). ✔

**(c) `P-SAN2-LEITURA-DAS-79`** (`pendencias.md` linhas 4050–4068; índice linha 93):
- Existe, `status: ABERTA · severidade: MÉDIA` · **dono:** "bloco próprio, após o ciclo 5"
  (índice: dono = sim). ✔
- **Prazo relativo:** "DEPOIS do ciclo 5 do financeiro", com o porquê (decisão do dono; ~4–6 h
  fora do caminho crítico do teto §C7.4). ✔
- **Critério de fechamento explícito:** "as 79 com veredito individual e evidência; as materiais
  promovidas de balde; o índice regenerado; e a etiqueta de triagem automática removida". ✔
- A entrada ainda publica a taxa medida (~40% — 4 materiais em 11 lidas, nomeadas) e a
  extrapolação (~25–30 materiais escondidos) como justificativa da severidade MÉDIA — honesta.
- **Observação (nota):** o título fala em "as 79", e após o resgate o balde C tem 77 (P-036
  fechada, tripwire retirado — a própria entrada diz "todas já retiradas/fechadas
  individualmente"). O número 79 é a população histórica carimbada; o texto é internamente
  coerente. Não bloqueia.

**Item 3: LIMPO** (com 1 observação).

---

## Conclusão da cadeira

Os 5 elementos da opção C do dono estão executados e registrados com fidelidade: (1) o verificado
salvo e nomeado na `D-SAN2-OPCAO-C`; (2) a etiqueta falsa morta como afirmação (sobrevive só como
2 citações em notas de correção) e a verdadeira nas 79; (3) `P-036` fechada como duplicata com o
gêmeo e o fix conferidos; (4) o tripwire de tarifa fora do balde C com o motivo escrito; (5) a
leitura adiada com dono, prazo relativo e critério de fechamento. O delta pós-liberação do
inspetor (`31cd9ad..4cd0867`) é registro puro e fecha o R2. Dois achados de gravidade **nota**,
nenhum bloqueante.
