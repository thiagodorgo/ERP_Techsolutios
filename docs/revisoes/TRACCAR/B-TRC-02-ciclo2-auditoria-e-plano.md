# B-TRC-02 — ciclo 2: auditoria da reprovação do ciclo 1 e plano de resolução

> **Papel:** `planejador-mestre`, topo (§C7.4, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`). **Identidade:** `planejador-trc02-c2-fable`
> (nova; não votou, não planejou as emendas v2.x, não desenvolveu). **Modelo efetivo:** **Fable** (`claude-fable-5-1`) — o do frontmatter,
> **sem fallback**. **Data:** 2026-10-24 (escrito ~17:30–18:30Z). **Decisão do dono de 24/10, relatada pelo orquestrador (fato dele, não
> medido por mim no repo):** o papel de topo é sempre do Claude, nunca do Codex Astra.
>
> **Nada aqui é afirmação herdada.** Cada número abaixo tem o comando que o produziu; o que é relato do orquestrador está rotulado como tal
> (§A6, fato × hipótese). Medi na ref julgada (§A7): `git show 38504427:...` e `origin/main` = `7ab2fe71` (fetch às 17:40Z).

---

## 0. Objeto, estado e regras aplicadas

| Item | Medido | Comando |
|---|---|---|
| PR | #454 `feat/traccar-b-trc-02`, OPEN, head `38504427a7b962545e559bd4d312b520b458ac42` | `gh pr view 454 --json headRefOid,state` |
| Mergeabilidade **hoje** | **`CONFLICTING` / `DIRTY`** (o mandato do ciclo 1 registrou MERGEABLE às 08:12Z de 21/10; a `main` andou) | `gh pr view 454 --json mergeable,mergeStateStatus` |
| Conflitos | **só registro**: `agent-orchestration/controle/decisoes.md` (1 hunk, l.3820–3901 do merge-tree) e `agent-orchestration/controle/pendencias-indice.md` (5 hunks; arquivo GERADO por `gerar-indice-pendencias.py`). `pendencias.md` auto-mergeia. Nenhum conflito em `src/`, `tests/`, `prisma/` | `git merge-tree --write-tree 38504427 origin/main` → tree `eaf1af16`; `git show eaf1af16:<arq> \| grep -n '^<<<<<<<'` |
| O que a `main` trouxe desde o merge-base `539b078e` | `RBAC_MATRIX.md` (3), `decisoes.md` (+21: `D-SAN3-04B-PAINEL-PROPRIO`, `D-SCOPED`), `pendencias-indice.md` (1148), `pendencias.md` (+2), `docs/revisoes/SAN3/PLANO_SAN3.md` (4) — nenhum caminho do bloco | `git diff --stat 539b078e origin/main` |
| Check-runs do objeto | 14/14 `completed success` (7 jobs × 2 gatilhos) | `gh pr view 454 --json statusCheckRollup` |
| Commits do ramo | 28 (merge-base `539b078e`); o ramo já tem um merge da `main` (`27ebbdee`) — a convenção do ramo é **merge**, não rebase | `git log --oneline origin/main..HEAD` |
| Delta do bloco | 75 arquivos, +15446/−130 | `git diff --stat origin/main...HEAD` |
| Votos do ciclo 1 | não rastreados em `C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/` (3 votos, 3 evidências, inspetor ×2, `00-mandatos/` ×4). **Sem `00-quedas.md`** (P6 exige) | `git status --short`; `ls` |
| Terreno agora | worktrees: raiz (`main` 539b078e), `w-agapi2`, `w-plan21` (detached 539b078e), `w-san320`, `w-trc02`; Docker: só `erp-postgres`/`erp-redis` (0 trabalhos); **disco C: 11 GB livres (96%)** | `git worktree list`; `docker ps`; `df -h` |

**Regras aplicadas (lidas em `git show 38504427:CLAUDE.md`, idêntico ao da `main` — `git diff 38504427 origin/main -- CLAUDE.md` = vazio):**
§C7.4 (topo audita e replaneja em TODA reprovação de junta); §C7.4-bis (achou ≠ planeja ≠ desenvolve; ata responde (a)(b)(c)); §C7 item 8(1)
(bloco de ingestão do Traccar = junta de SEGURANÇA, inspetor + 3 cadeiras, **unanimidade com veto**) e 8(2) (**ciclo 2 é o último em que
`bloqueia dentro-do-bloco` não grave reprova**); §C7 item 9 (só a cadeira vermelha é refeita; voto carregado exige `arquivos_medidos` + comando);
§C7.7 P1–P8; §C7.6-bis (escada de modelos); `D-IAS-EXTERNAS-PRIMEIRO`; `D-GEMINI-SEGUNDO-REVISOR`. **Norma que NÃO existe na ref:**
`§C7.1-quater`/"assento permanente" (0 ocorrências como norma; a única menção é a anedota do §A7) — o molde `TEMPLATE-J-ata.md` (não
rastreado) a cita; **não se aplica** (§A7: "norma citada que não existe na ref julgada não se aplica").

---

## 1. Auditoria da reprovação — por execução

### 1.1 O que a cadeira (b) achou, e se existe no objeto

`cadeira-b-voto.json`: **REPROVADO**, 1 achado `bloqueia` · `dentro-do-bloco` · `não grave` · "nenhum efeito de comportamento medido" (b-1);
3 notas (b-2, b-3, b-4). `arquivos_medidos.uniao = "**"` (fail-closed por escolha dela).

**Existe, exatamente como descrito.** `git show 38504427:src/integrations/traccar/traccar-ingestion.service.ts | grep -n -E '\bbinding\b|\blocked\b'`
em `phaseTwoSteps` (l.385–479) devolve **só** l.391 `let binding: TraccarActiveBinding | undefined; // atribuído no passo 2`, l.412
`binding = bindings[0]!;`, l.413 `const locked = binding;`, e `locked.` em l.418 (passo 3), l.432 (passo 5), l.438 (passo 6) e l.470 (passo 7).
Na base do 01 (`git show c1485c94:... | grep -n binding`): l.224 `const binding = bindings[0]!;` e os passos lendo `binding` direto (l.229, 243, 249).
O caminho irmão do EVENTO, no mesmo arquivo e no mesmo objeto, usa a forma limpa: l.302 `const binding = bindings[0]!;`.

### 1.2 Origem — `git blame` e `git show`

`git blame -L 385,445 38504427 -- <service>`: l.391 e o comentário Q1 = NÃO são de **`498c4e26`** (o revert); l.412–413, 418, 432, 438 são de
**`7c0ed643`** (feat da Q1 = SIM, passos 6–8). `git show 7c0ed643 -- <service>` mostra o porquê original (l.307–323 do diff): `let binding …
// atribuído no passo 2; antes dele, nenhuma amostra (por tipo)` + `const locked = binding;` servem ao gate **dentro da closure
`quarantined()`**: `if (binding && command.telemetry && this.sampleOnQuarantineReasons.has(reason)) { … sampleWithoutOperator(ports, tenantId,
binding, command) }` — a closure precisava ver um `binding` declarado ANTES dela (hoisting por `let`), e `locked` virou o nome do mesmo valor
nos passos seguintes. `git show 498c4e26 -- <service>` **tira o gate** (−5 linhas na closure), **encurta o comentário** da l.391 e **mantém**
`let binding`, a atribuição, `const locked` e as 4 leituras de `locked`. Leitura da cadeira (b) **confirmada linha a linha**.

### 1.3 "Sem efeito de comportamento" — conferido

1. **Por leitura do fluxo:** a closure `quarantined()` do objeto (l.393–396) não lê `binding`; nenhuma outra closure o captura; `binding`
   é escrito uma vez (l.412) e lido uma vez (l.413); `locked` é um alias sem narrowing a mais. Semântica igual à de `const binding = bindings[0]!`.
2. **Por transpilação (feita por mim, scratchpad `…/scratchpad/pl02/`):** `ts.transpileModule` (TypeScript do `w-trc02`, ES2022, sem
   comentários) sobre o arquivo do objeto e sobre o arquivo com o conserto do §3.2 → o JS emitido difere em **exatamente** as 7 linhas do
   andaime (226, 242–243, 247, 258, 262, 291 do JS); normalizados os nomes (`locked.`→`binding.`), **resta só a forma da declaração**
   (`let binding; binding = bindings[0]; const locked = binding;` × `const binding = bindings[0];`). Nenhuma outra linha muda.
3. **Por teste (da cadeira (b), re-lido na evidência dela):** `traccar-event-sample-db` 13/13 e `traccar-event-ingestion-db` 21/21 no objeto.

A afirmação da (b) está **certa**. Não é defeito de produto: é **resíduo estrutural** da variante revertida.

### 1.4 A premissa do §6.6 — lida no objeto

`git show 38504427:docs/revisoes/TRACCAR/B-TRC-02-plano.md`, §6.6, linha de `traccar-ingestion.service.ts`: **Muda** = "`ingestEvent` …; no passo 7
da posição, `insertSampleInSavepoint(tx, …)` …; `quarantineWithoutTenant` …; dois limitadores; [Q1=SIM] `sampleWithoutOperator` no passo 5";
**Não muda** = "**os 7 passos da posição e seus motivos**; `publishAfterCommit`; orçamentos; `NO_OPERATOR_REASON`". As trocas nos passos 3, 5 e 6
e a declaração antes do passo 1 estão na coluna "Não muda", e só se explicam pela faixa `[Q1=SIM]` que a `D-TRC02-Q1-NAO` mandou remover
(§Q1.7). A premissa citada pela (b) é a letra do plano; não há dado podre nela.

### 1.5 A régua que reprovou — está escrita no corpo

Corpo `jurado-trc02-b-superficie-escopo-registro.md` (blob `3fa735d1` no objeto): l.546–549 "Os símbolos da Q1 **não** são faixa permitida …
Linha mudada que só se explica por um desses símbolos é linha **fora** das faixas"; l.551 "toda linha mudada cai numa faixa; linhas fora: **0**";
l.623 "linha fora das faixas de §6.6/emenda" → `bloqueia`; l.630–631 "símbolo da Q1 em `src/` … `bloqueia`, `não grave` (resíduo), salvo efeito
medido". O achado b-1 não é interpretação criativa: é a aplicação literal de uma régua **passável** (remover 7 linhas). Não é "critério impossível".

### 1.6 Causa-raiz (medida) — por que o andaime ficou: a mutação de controle da variante NÃO depende dele

`git show 498c4e26 -- docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs`: o revert apagou as 8 `M-Q1-*` e **criou a `M-E16′`**, cujo
`replace` injeta **dentro da closure `quarantined()`** o bloco `if (binding && command.telemetry) { const forcedReceipt = await
repository.insertReceipt({ … bindingId: binding.id, vehicleId: binding.vehicleId }); if (forcedReceipt) await this.insertVehicleSample(ports,
this.sampleRow(tenantId, binding, forcedReceipt, command)); }`. Essa mutação **só funciona com `let binding` declarado antes da closure**: com a
forma limpa (`const binding` no passo 2, depois da closure), o TypeScript ainda compila (uso dentro de função aninhada não é TS2448), mas a
chamada `quarantined("tenant_inactive")` do passo 1 cairia em **TDZ `ReferenceError`** na forma mutada. O dev manteve o andaime — por
descuido ou para a M-E16′ compilar; o relatório não diz (grep `locked`/`let binding` em `B-TRC-02-dev.md` = 0, como a (b) mediu). Consequência
para o plano: **o conserto do código exige re-ancorar a M-E16′** (§3.3), senão a mutação de controle do F3 vira "frágil" (morde por TDZ, não
pela propriedade). Os corpos (a) l.25/38, (b) l.679 e (c) l.37–38/65/74/211–212/423 citam a M-E16′ **pela propriedade** ("a quarentena nunca
guarda amostra; F3 vermelho por contagem") — isso continua valendo; muda a âncora, que é do catálogo do objeto.

### 1.7 Veredito da auditoria

| Pergunta (§C7.4) | Resposta | Evidência |
|---|---|---|
| O achado b-1 é defeito real ou artefato do processo? | **Real, de escopo/higiene** (resíduo da variante revertida em faixa "Não muda"); **não grave**; **sem efeito de comportamento** (1.3) | 1.1–1.5 |
| O critério era passável? | Sim: remover 7 linhas; o caminho irmão (evento) já tem a forma limpa | 1.1 |
| Premissa herdada como fato? | Não: a (b) mediu `7c0ed643`, `498c4e26`, o blob do objeto e o §6.6 do plano no objeto | `cadeira-b-evidencia.md` l.36–39 |
| Amostra do próprio autor? | Não: o parser de hunks (`zz-jtrc02b-hunks.mjs`) é da (b), com controle que acusou | evidência (b) item 2 |
| Guarda que reconhece forma em vez de propriedade? | Em parte, **por desenho do plano**: o item 2(b) é régua de **escopo** (linha fora de faixa), não de comportamento — e é a régua certa para "a variante revertida saiu inteira?" | corpo (b) l.546–631 |
| A reprovação é válida sem quórum completo? | Sim: unanimidade **com veto**; 1 REPROVADO basta. Os 2 votos perdidos (P3) não contam nem a favor nem contra | §C7 item 8(1); §C7.7 P3 |
| Máquina sã ou defeituosa? | **Sã.** Custo alto para 7 linhas mortas, mas a régua é escrita, passável e pegou exatamente o que a `D-TRC02-Q1-NAO` mandava sumir. "Se está encontrando erro está tudo certo" (§C7.4) | — |

**Classe repetida sem informação nova?** Não: é o 1º ciclo deste bloco; a classe "resíduo de variante revertida" é nova no B-TRC-02.

### 1.8 As três perguntas do §C7.4-bis (para a ata do ciclo 1)

- **(a) A composição cobriu a competência?** Para o achado: **sim** — a (b) é a cadeira de escopo/pathspec e o pegou por parse + `git show`.
  Para a junta: **não** — (a) e (c) **não chegaram a voto** (quedas: (a) pelo limite semanal do Claude, com ~21 seções de evidência — relato do
  orquestrador + `cadeira-a-voto.json` em `EM APURAÇÃO`; (c) no início, evidência de 14 linhas). O item 1 de banco/RLS e o contrato de evento
  **nunca foram julgados por inteiro**; o ciclo 2 os julga pela primeira vez.
- **(b) Quem achou consertou?** **Não** (ainda não houve conserto). A (b) não propôs correção (conferido: o voto registra defeito + evidência +
  motivo). Quem achou = `jurado-trc02-b-opus`; quem planeja = `planejador-trc02-c2-fable` (eu); quem desenvolve = `dev-trc02-c2-argon` (§4).
- **(c) O planejador usa dado podre?** Medi tudo no objeto por `git show`, no GitHub por `gh`, e o merge-tree contra `origin/main` de hoje. Dois
  fatos **relatados** e rotulados: a causa da queda da (a) (limite semanal) e a decisão do dono de 24/10 (topo = Claude). Hipótese **declarada**:
  o motivo pelo qual o dev manteve o andaime (1.6) — a correlação com a M-E16′ é medida; a intenção, não.

---

## 2. As três cadeiras sob o §C7 item 9 (`D-JUNTA-SO-CADEIRA-VERMELHA`)

| Cadeira | Ciclo 1 | Item 9 | Ciclo 2 |
|---|---|---|---|
| **(b)** `jurado-trc02-b-opus` | **REPROVADO** (vermelha); `arquivos_medidos.uniao="**"` | 9(3): **refeita**, identidade nova, régua do ciclo 2, **focada no achado b-1 + regressão dos 3 itens** | `jurado-trc02-c2-b-argon` |
| **(a)** `jurado-trc02-a-opus` | voto `EM APURAÇÃO` (caiu) | **não há verde a carregar** — 9(1)/(2) pressupõem voto; voto perdido não conta (P3) | **refeita do zero no objeto novo**, `jurado-trc02-c2-a-sol`; a evidência parcial é **roteiro P3** (abaixo) |
| **(c)** `jurado-trc02-c-opus` | voto `EM APURAÇÃO` (caiu no início) | idem | **refeita do zero**, `jurado-trc02-c2-c-sol`; roteiro P3 quase vazio (só cabeçalho de terreno + `zz-jtrc02c-voto.cjs`) |

**Como a evidência parcial da (a) serve (P3, verbatim do contrato: "evidência registrada em arquivo pelo caído é roteiro de re-execução
barata … Conclusão sem comando registrado continua sendo não-insumo, inclusive parcial favorável"):**
- `cadeira-a-evidencia.md` tem ~21 seções com **comando → saída → veredito parcial** e as sondas **em disco**, com md5 registrado:
  `C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-a/` (`zz-jtrc02a-run.sh`, `zz-jtrc02a-sonda1.ts`, `zz-jtrc02a-dmlset.sql`, `zz-jtrc02a-inj.mjs`,
  `zz-jtrc02a-injloop.sh`, `zz-jtrc02a-mutrun.sh`, `zz-jtrc02a-mut.mjs`, `zz-jtrc02a-e4x20.sh`, `zz-jtrc02a-catalogo.sql`; saídas `dml-B.txt`,
  `inj-k1-17.txt`, `e4-objeto.txt`, `linux-3x.txt`, `regressao.tap`, `mut/`, `e4-objeto/`).
- O sucessor **re-executa cada comando registrado sobre o objeto NOVO** (não sobre `38504427`), compara a saída com a registrada e **só então
  mede a cauda** que a (a) declarou faltar: "san3-05 runtime-role 12/12, guard 8, aditiva com recibos position, parecer do DBA, T-M sob M-E5x".
  Divergência de saída = mede de novo, não herda. O md5 das sondas é conferido antes de rodar (sonda alterada = sonda nova, não roteiro).
- O que a (a) **concluiu** sem comando visível (ex.: "motivos NOVAS 7/7 sustentados") **não é insumo**: vale só o que o sucessor re-roda.
- Idem para a (b): as 19 sondas em `C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-b/` (em especial `zz-jtrc02b-hunks.mjs` 392a997b, `zz-jtrc02b-laco.mjs`,
  `zz-jtrc02b-runmut.sh`) são roteiro para a nova (b): re-executar sobre o objeto novo, com a **base do laço recalculada** (§3.6).

**Trava do item 9 neste ciclo:** não se aplica a nenhuma cadeira (nenhum verde). A ata do ciclo 2 registra, por cadeira, `refeita` — e o comando
que prova que o voto se refere ao **objeto final** (`objeto` no voto = `git ls-remote origin refs/heads/feat/traccar-b-trc-02` no fim).

---

## 3. Plano do conserto

**Objetivo:** fechar o achado b-1 sem mudar comportamento: `phaseTwoSteps` volta à forma do 01 (`const binding` no passo 2; os passos 3, 5, 6
e 7 leem `binding`), a mutação de controle do F3 é re-ancorada para não depender do andaime, o relatório do dev registra o ciclo 2, e o PR volta
a `MERGEABLE`. **Ator:** `dev-trc02-c2-argon` (§4). **Fluxo:** registro do ciclo 1 → merge da `main` → conserto → relatório → push → CI → junta.

### 3.1 Sequência de commits no ramo (um executor por vez em `C:/Users/AMP/w-trc02`)

| # | Quem | Commit (Conventional) | Conteúdo |
|---|---|---|---|
| R | `redator-trc02-c2-sol` | `docs(junta): B-TRC-02 ciclo 1 — votos, evidências, mandatos, quedas, ata e R-B-TRC-02-1` | `votos/B-TRC-02/**` (já em disco, não rastreado) + `votos/B-TRC-02/00-quedas.md` (P6; 2 linhas) + `omega/juntas/J-B-TRC-02-ciclo1.md` + `omega/reprovacoes/R-B-TRC-02-1.md` + cópia deste plano em `docs/revisoes/TRACCAR/B-TRC-02-ciclo2-auditoria-e-plano.md` + `decisoes.md`: a decisão do dono de 24/10 (topo = Claude) **com as palavras literais que o orquestrador tem** — sem citação, não se grava |
| M | `dev-trc02-c2-argon` | `Merge remote-tracking branch 'origin/main' into feat/traccar-b-trc-02` | §3.6 |
| C | `dev-trc02-c2-argon` | `fix(traccar): phaseTwoSteps sem o andaime da Q1 = SIM revertida e M-E16″ ancorada no passo 5 (B-TRC-02, ciclo 2)` | §3.2 + §3.3 (2 arquivos) |
| D | `dev-trc02-c2-argon` | `docs(traccar): relatório do ciclo 2 — bateria, equivalência e mutações re-executadas (B-TRC-02)` | §3.4 |

**Objeto do ciclo 2 = head após D** (commit comum, não merge: `git show <obj2>` e `git blame` legíveis). Ordem M antes de C para que
`git diff <obj1>..<obj2> -- src/` seja **só** o conserto (a `main` não toca `src/`).

### 3.2 O diff exato do código — `src/integrations/traccar/traccar-ingestion.service.ts`, função `phaseTwoSteps` (l.385–479 no objeto)

```diff
@@ l.390-391
     const { tx, repository, locations, operatorAt } = ports;
-    let binding: TraccarActiveBinding | undefined; // atribuído no passo 2
     // Q1 = NÃO (decisão do dono de 19/10): a quarentena nunca guarda amostra — só o motivo, como no B-TRC-01.
@@ l.412-413
-    binding = bindings[0]!;
-    const locked = binding;
+    const binding = bindings[0]!;
@@ l.418 (passo 3)
-    if (command.fixedAt.getTime() < locked.validFrom.getTime()) return quarantined("fix_before_active_binding");
+    if (command.fixedAt.getTime() < binding.validFrom.getTime()) return quarantined("fix_before_active_binding");
@@ l.432 (passo 5)
-    const operator = await operatorAt(command.fixedAt, locked.vehicleId);
+    const operator = await operatorAt(command.fixedAt, binding.vehicleId);
@@ l.438 (passo 6)
-    const receiptId = await repository.insertReceipt({ tenantId, command, bindingId: locked.id, vehicleId: locked.vehicleId });
+    const receiptId = await repository.insertReceipt({ tenantId, command, bindingId: binding.id, vehicleId: binding.vehicleId });
@@ l.470 (passo 7)
-        await this.insertVehicleSample(ports, this.sampleRow(tenantId, locked, receiptId, command));
+        await this.insertVehicleSample(ports, this.sampleRow(tenantId, binding, receiptId, command));
```

**Contagem esperada:** `git diff --numstat <obj1> <obj2> -- <service>` = `5	7` (7 linhas saem, 5 entram; arquivo 590 → 588 linhas).
`grep -n -E '\blocked\b|let binding' <service>` = **0**. `TraccarActiveBinding` continua importado e usado (`sampleRow`, l.483). O comentário
`// Q1 = NÃO …` da l.392 **fica** (é da variante final, não andaime). Nenhuma outra linha do arquivo muda — nem no caminho do evento.

### 3.3 A mutação de controle — `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs`

A `M-E16′` (l.117) injeta na closure `quarantined()` um bloco que lê `binding` **antes** de ele existir na forma limpa (1.6). Substituí-la por
**`M-E16″`**, ancorada no **passo 5** (âncora única no objeto: `grep -c 'if (operator.kind !== "single") {'` = 1; l.433–435), que é o único
ponto em que a posição vai à quarentena **por operador** — exatamente a propriedade do F3:

```js
  // [Q1=NÃO] M-E16″ (ciclo 2): a M-E16′ dependia do `let binding` hoisted da variante revertida (resíduo b-1 do ciclo 1). Mesma
  // propriedade, âncora no passo 5 — o único ponto em que a posição vai à quarentena POR OPERADOR.
  { id: "M-E16''", prop: "quarentena por operador nunca guarda amostra (Q1 = NÃO)", where: "db", edits: [{ file: SERVICE,
    find: '    if (operator.kind !== "single") {\n      return quarantined(NO_OPERATOR_REASON[operator.kind]);\n    }',
    replace: '    if (operator.kind !== "single") {\n      if (command.telemetry) {\n        const forcedReceipt = await repository.insertReceipt({ tenantId, command, bindingId: binding.id, vehicleId: binding.vehicleId });\n        if (forcedReceipt) await this.insertVehicleSample(ports, this.sampleRow(tenantId, binding, forcedReceipt, command));\n      }\n      return quarantined(NO_OPERATOR_REASON[operator.kind]);\n    }' }], tests: T.F },
```

A entrada `M-E16'` **sai** do catálogo (não fica "executável" uma mutação que depende de código removido — régua do corpo (b) l.679: "nenhuma
M-Q1-* executável"; a mesma lógica vale aqui). Caso que a mutação deve deixar **vermelho por contagem**: `tests/traccar-event-sample-db.test.ts`
l.273 `"amostra: posição em quarentena por operador — 0 recibo, 0 localização, 0 amostra (Q1 = NÃO)"`. Catálogo continua com **86** entradas
(troca 1 por 1). `run-mutations.mjs` exige `tsc` ec 0 na forma mutada: `binding`, `repository`, `ports`, `this.insertVehicleSample`,
`this.sampleRow` existem no escopo do passo 5 → compila.

### 3.4 Relatório do dev — `docs/revisoes/TRACCAR/B-TRC-02-dev.md` (commit D)

Seção nova `## Ciclo 2 — conserto do achado b-1`: identidade/executor/modelo; por passo da bateria (§3.7) **comando → saída → veredito**;
a prova de equivalência (§3.8) com saídas; `M-E16″` com TAP vermelho em F3 e `restoredOk` (sha256); as outras 7 mutações do `SERVICE`
re-executadas; contagens re-medidas (103 novos **inalterados**; `backend-postgres` 463 ×1 local + CI); o merge da `main` (§3.6) com o comando
do gerador do índice e a saída. **Nota b-4 fecha aqui:** o bloco "Contagens finais (variante Q1 = NÃO)" (l.360–366, 97/434) ganha **uma linha**
"SUPERADO pelas seções v2.3/v2.4 (103/463)" — sem apagar. **Nota b-2:** nada a fazer (desvio já declarado em l.94–98; mecanismo pressuposto pelo
plano — C-04/M-E06). **Nota b-3** (critério de encerramento de `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE` escrito como `!== 'inert_no_execute'`, que o corpo
público nunca produz): o texto do critério em `agent-orchestration/controle/pendencias.md` passa a "`active` com o passo do demo × `inactive`
sem ele" — é **registro**, entra no commit R (redator), não no D.

### 3.5 O que NÃO muda (a cadeira (b) mede por parse; a (a) por md5)

- Em `src/`: nenhum arquivo além do `service`; no `service`, **nenhuma** linha de `eventPhaseTwoSteps`, da closure `quarantined()`, de `sampleRow`,
  `insertVehicleSample`, `withSampleSavepoint`, `publishAfterCommit`, `NO_OPERATOR_REASON`, `quarantineWithoutTenant`, `createTraccarIngestAppFromEnv`;
  `computeExternalEventKey`/`computePayloadDigest`/`lockActiveBinding`/`attachLocation` byte a byte.
- `prisma/**` e migrações; **`tests/**` inteiro** (0 teste novo, 0 removido — o conserto não cria comportamento); `.github/workflows/ci.yml`;
  `API_CONTRACTS.md`; `docs/deployment.md`; compose; `infra/**`; `scripts/**`; os 9 arquivos de teste intocáveis do 01 (md5 = `c1485c94`); os 5
  arnês com 1 linha `+`.
- Contagens: 103 / 463 / comentário do `ci.yml` — iguais.
- Decisões do dono: Q1 = NÃO, Q2 = SIM, Q3 = SIM, C-10 = A (guardar), `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` — **não reabertas**.
- Os 3 corpos de jurado (blobs `649c6f80`, `3fa735d1`, `2b749424`) — nenhuma fábrica no ciclo 2.

### 3.6 Merge da `main` (commit M) — como, e o que muda nos mandatos

```
cd C:/Users/AMP/w-trc02 && git fetch origin && git merge --no-ff origin/main     # conflita SÓ em 2 arquivos de registro (medido, §0)
```
- `agent-orchestration/controle/decisoes.md` (hunk único, l.3820–3901 do merge-tree): **os dois lados ficam inteiros** — o bloco do ramo
  ("Registro de 20/10/2026 — B-TRC-02 …" até `D-MIGRACAO-COM-TRANSACAO-EXPLICITA`) e o da `main` (`D-SAN3-04B-PAINEL-PROPRIO`, `D-SCOPED`), em ordem
  cronológica pelos cabeçalhos. Controle: `grep -c` de cada `D-…` dos dois lados antes e depois = igual; nenhuma linha apagada (§A2).
- `agent-orchestration/controle/pendencias.md`: auto-merge; conferir `grep -c` de `P-TRC02-`, `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA` e dos
  2 IDs novos da `main`.
- `agent-orchestration/controle/pendencias-indice.md`: **não resolver à mão** (é GERADO) — depois de `pendencias.md` resolvido:
  `python agent-orchestration/controle/gerar-indice-pendencias.py` (uso: cabeçalho do script, l.35) e `git add` da saída. Controle: rodar 2× → idempotente.
- `git diff --check` → 0; `npm run check` → ec 0 (a `main` não toca `src/`).
- Resultado esperado: `gh pr view 454 --json mergeable` = `MERGEABLE`; `git merge-base <obj2> origin/main` = `7ab2fe71` (se a `main` não andar).
  **Base do laço da (b)** = esse merge-base; `git diff --name-only <merge-base> <obj2>` = os 75 do bloco (já incluem `mutations.mjs` e `dev.md`) +
  registro do ciclo (`omega/juntas/**`, `omega/reprovacoes/**`, `docs/revisoes/TRACCAR/**`, `controle/*`) — todos no PERMITIDO (§7.1 "registro").
- O ramo já tem um merge da `main` (`27ebbdee`); **rebase está fora** (reescreveria 28 commits julgados e os SHAs citados nas evidências).

### 3.7 Bateria exata (dev, em `w-trc02`; o `-db` em contêiner Linux próprio com Postgres descartável, forma do job — `ci-pg-form.cjs` do relatório)

1. `npm run check` · `npm run lint`.
2. Host (sem banco): `node --test --import tsx tests/traccar-event-contract.test.ts tests/traccar-event-sample.test.ts tests/traccar-event-listener.test.ts tests/traccar-event-logs.test.ts tests/traccar-event-topology.test.ts tests/traccar-position-contract.test.ts tests/auth-invariant-guards.test.ts tests/db-catalog-write-guard.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts` → `fail 0` (17 · 11 · 12 · 5 · 9 · … · 11 · 35, como no ciclo 1).
3. `-db` do fluxo da POSIÇÃO e do bloco (papel efêmero NOSUPERUSER, `REDIS_URL` próprio): `tests/traccar-event-sample-db.test.ts` (13) · `tests/traccar-event-ingestion-db.test.ts` (21) · `tests/traccar-event-rls-db.test.ts` (9) · `tests/traccar-event-migration-drill-db.test.ts` (6) · `tests/traccar-position-ingestion-db.test.ts` · `tests/traccar-quarantine-db.test.ts` · `tests/traccar-idempotency-db.test.ts` · `tests/traccar-resolution-race-db.test.ts` · `tests/traccar-binding-uniqueness-db.test.ts` · `tests/san3-05-runtime-role-guard-db.test.ts` → `fail 0`, `skipped 0`.
4. Mutações com `run-mutations.mjs` (âncora única, `tsc` ec 0 na forma mutada, restauro por sha256) — **todas as que tocam `SERVICE`**: `M-E09`, **`M-E16″`**, `M-E17`, `M-E18`, `M-E22`, `M-E37b`, `M-E38`, `MUT-10′@01` → cada uma **vermelha no caso nomeado**; TAP em `B-TRC-02-evidencias/results-db-c2.jsonl`. (As âncoras das 7 antigas não contêm `locked`/`let binding` — conferido no catálogo do objeto; a `M-E16′` sai.)
5. Forma do job `backend-postgres` **1× local** (o 3× é da cadeira (a)) → `# tests 463 # pass 463 # fail 0 # skipped 0`.
6. `npm test` (forma `backend`; **sem** `CORE_SAAS_PERSISTENCE` exportado — lição do dev, relatório l.266) · `npm run build` · `node scripts/sync-agent-agents.mjs --check` · `git diff --check`.
7. Push → check-runs **concluídos** no `<obj2>` (14 = push + pull_request; o `pull_request` volta a disparar porque o PR deixa de conflitar).

### 3.8 A prova de que o conserto não mudou comportamento (o dev registra; a cadeira (b) re-executa como vermelho-controle do item 2)

1. `git diff --numstat <obj1> <obj2> -- src/` = **uma linha**: `5	7	src/integrations/traccar/traccar-ingestion.service.ts`.
2. Transpile-diff: `ts.transpileModule` (TypeScript do worktree, ES2022, `removeComments`) sobre `git show <obj1>:<service>` e `git show <obj2>:<service>`
   → o diff do JS tem **só** as linhas do §3.2; normalizados os nomes (`locked.`→`binding.`), **só a forma da declaração** (reprodução do §1.3).
3. Parser de hunks da (b) (`…/jtrc02-b/zz-jtrc02b-hunks.mjs`, md5 `392a997b…`) sobre `git diff -U0 c1485c94 <obj2> -- <service>`: em `phaseTwoSteps`,
   só o destructuring (`tx`) e o passo 7 (faixa "Muda" do §6.6) → **linhas fora das faixas = 0**. **Controle positivo:** o mesmo parser sobre
   `38504427` acusa as 7 (a ferramenta mede).
4. `grep -c -E '\blocked\b|let binding' <service>` = **0**; o caminho do evento continua com `const binding = bindings[0]!` (l.302).
5. Suítes do passo 3 verdes **antes** (ciclo 1: evidência (b), 13/13 e 21/21) e **depois** (dev; cadeira (a) 3× em Linux).
6. `M-E16″` vermelha em F3 l.273 **por contagem** (recibo + amostra forçados aparecem) e as outras 7 do `SERVICE` vermelhas.

### 3.9 Baseline N e meta M — declarado sem maquiagem

N do bloco = **103** testes novos (A17 · B11 · C12 · D5 · H9 · E21 · F13 · G9 · M6) e **463** no `backend-postgres` (relatório v2.4; re-medidos no ciclo 2).
**O conserto não cria teste**: remove código morto e re-ancora uma mutação. "M ≥ 2N" é régua do bloco, já declarada no plano v2 §9.3 com o déficit
nomeado (`P-TRC02-DEFICIT-2N`, aberta com dono) — o ciclo 2 **não a move** nem para cá nem para lá. A entrega em testes é **0 novos, 0 removidos,
1 mutação trocada**; quem a prova é o §3.8. Teste novo do tipo "não há `let binding`" seria guarda de forma (§C7.4 a desaconselha) — **não entra**.

---

## 4. Composição e executores do ciclo 2 (decidida pelo dono; relato do orquestrador)

| Papel | Identidade NOVA | Executor | Modelo (nível menor, DECLARADO) | Se esgotar |
|---|---|---|---|---|
| Topo: auditoria + plano | `planejador-trc02-c2-fable` (este arquivo) | Claude Code | **Fable** | — (feito) |
| Redator dos mandatos | `redator-trc02-c2-sol` | Codex CLI headless | `gpt-5.6-sol` | → Claude **Opus**, subagente com identidade nova, declarado; Opus esgotado → **PARA** |
| Inspetor de terreno | `insp-trc02-c2-sol` | Codex | `gpt-5.6-sol` | idem |
| Cadeira (a) banco/RLS/migração/arnês | `jurado-trc02-c2-a-sol` | Codex | `gpt-5.6-sol` | idem |
| Cadeira (b) superfície/segredo/escopo/registro | `jurado-trc02-c2-b-argon` | Antigravity (`agy`) | `gemini-4-argon` | idem |
| Cadeira (c) contrato de evento/unidades/ordem | `jurado-trc02-c2-c-sol` | Codex | `gpt-5.6-sol` | idem |
| Dev | `dev-trc02-c2-argon` | Antigravity | `gemini-4-argon` | dev que cai → Claude (Opus) termina e reporta (regra do dono de 21/10, relato do orquestrador); declarado |
| Orquestrador | sessão Claude | — | — | **inelegível** para cadeira, inspeção, dev e redação de voto |

**Leituras declaradas (§A6):** (i) "o orquestrador Claude cobre" = **lança um subagente** Claude Opus com identidade nova e `model: "opus"` explícito —
nunca o orquestrador votando; (ii) `D-GEMINI-SEGUNDO-REVISOR` ("nunca revisor único") é respeitada: o Argon ocupa **1 de 3** cadeiras sob
unanimidade, as outras 2 são Codex; (iii) Argon no dev **e** numa cadeira = mesmo MODELO em dois papéis com identidades distintas — como a
monocultura Opus do ciclo 1 (R-2 do inspetor), vai declarado na ata; (iv) a escada do §C7.6-bis vale para a cobertura: Opus é o único degrau.

### 4.1 Inelegíveis por nome (piso; o inspetor regenera por comando sobre o objeto novo — o comando do mandato do ciclo 1, l.121)

Ciclo 1: `inspetor-trc02-opus`, `jurado-trc02-a-opus`, `jurado-trc02-b-opus`, `jurado-trc02-c-opus`, `dev-trc02-opus`, `dba-trc02-opus`,
`registrador-trc02-opus`, `fabrica-trc02-opus`, `fabrica-trc02b-opus`. Redatores: `redator-trc02-opus`, `redator-trc02-v2`, `redator-trc02-cdx`,
`red-trc02-arg`. Planejadores/críticos: `planejador-trc02-fable`, `planejador-trc02-v2-fable`, `planejador-trc02-emenda-fable`,
`planejador-trc02-escopo-fable`, `planejador-trc02-v23-fable`, `planejador-trc02-v24-fable`, `critico-trc02-opus`, `critico-trc02-flash`,
`critico-trc02-r2-opus`, `prerev-trc02-flash`. Ciclo 2: `planejador-trc02-c2-fable` (eu) e **o orquestrador da sessão**. **Família B-TRC-01 inteira**
(68 nomes medidos no ciclo 1; regenerar). Os 7 nomes novos da tabela não coincidem com nenhum destes — o inspetor prova por `grep -c` no objeto e
no `OBITUARIO-IDENTIDADES.md`.

### 4.2 O que cada mandato troca em relação ao ciclo 1

Geradores: **copiar** `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/{lib.sh,gerar-a.sh,gerar-b.sh,gerar-c.sh,gerar-i.sh,mandato-refs.sh,mandato-preflight.sh}`
para `…/redator-trc02-c2/` e editar **lá** (a pasta do ciclo 1 é evidência; não se toca).

1. `lib.sh`: `H=<obj2>`; `V=C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2`; `R=…/redator-trc02-c2`; `comum_preflight` com
   `RAIZ=C:/Users/AMP/w-trc02` e PR 454 (ver R7).
2. "Você é …": identidade, executor e modelo da tabela; **modelo explícito no disparo** — Codex `--model gpt-5.6-sol`; Antigravity `agy models` antes
   de lançar, `gemini-4-argon` (R-3 do inspetor, generalizada para executores externos).
3. O parágrafo MONOCULTURA **sai**; entra: "composição mista, declarada: Codex Sol ×4 papéis (redator, inspetor, (a), (c)); Argon ×2 (dev, (b));
   Claude só cobre esgotamento, declarado".
4. Esgotamento: "Opus esgotado: PARE" → "**Codex/Argon esgotado** (limite, 429, fila parada): termine o comando em curso, grave `## PAUSA <hora UTC>`
   na evidência (P7) e **pare sem votar**; o orquestrador lança um sucessor em Claude Opus (identidade nova) que re-executa o roteiro (P3); a
   substituição vai no artefato e na ata; **Opus esgotado → PARA** (§C7.6-bis)".
5. Corpo carregado **do blob do objeto novo**: `git show <obj2>:.claude/agents/especialistas/jurado-trc02-<x>.md | tr -d '\r' | md5sum`; o Codex pode
   carregar o espelho `.agents/agents/especialistas/…` (corpo verbatim + adaptador; `node scripts/sync-agent-agents.mjs --check` prova a paridade);
   veredito IDENTICO/DIVERGE na 1ª linha da evidência. Blobs esperados **iguais** aos do ciclo 1 (nenhuma fábrica).
6. Objeto `<obj2>` (ls-remote = `gh pr view 454 --json headRefOid`), check-runs **concluídos** (14 se `pull_request` disparar; 7 se a `main` voltar a
   conflitar — o mandato exige "concluídos", não um número); `mergeable` medido e colado.
7. Base do laço da (b) = `git merge-base <obj2> origin/main` (esperado `7ab2fe71`); `delta-B-obj.txt` regenerado.
8. Divergências corpo×objeto (§A2), as do ciclo 1 **mais**: (i) `M-E16′` → `M-E16″` (corpos citam a closure; vale o corpo para a propriedade, o
   catálogo do objeto para a âncora); (ii) `phaseTwoSteps` sem `let binding`/`locked` — a (b) mede 0 fora das faixas + controle positivo sobre
   `38504427`; (iii) o merge da `main` fora do laço por construção (merge-base novo).
9. Régua explícita: "ciclo 2 — **último** em que `bloqueia dentro-do-bloco` não grave reprova (§C7 item 8(2))".
10. Item 9 explícito: nenhum voto carregado; 3 refeitas; P3 com os caminhos das sondas (`…/jtrc02-a/`, `…/jtrc02-b/`) e a regra "re-executar e
    comparar; conclusão não é insumo".
11. Briefing a mais: este plano (cópia no objeto), `J-B-TRC-02-ciclo1.md`, `R-B-TRC-02-1.md`, `votos/B-TRC-02/00-quedas.md`; o porteiro do #426 mantido
    (unidade com saída `72:LIBERADO COM RESSALVA` — R-1 já corrigida nos geradores de 05:11).
12. Mandato da (b), foco (item 9(3)): item 2 = b-1 fechado (§3.8 (1)(3)(4)) + laço na base nova + réguas b-S1…b-S7/b-A1…b-A7 + `M-E16″`; itens 1 e 3 =
    re-execução do roteiro da (b) do ciclo 1 sobre o objeto novo, com b-4 (SUPERADO marcado) e b-3 (critério active × inactive) conferidas.
13. Decisão do dono de 24/10 (topo = Claude): fato relatado pelo orquestrador até o commit R gravá-la em `decisoes.md` com as palavras literais.

### 4.3 Terreno e sequência de disparo (P5, P8)

- **Antes de tudo:** `bash scripts/post-merge-cleanup.sh` (disco **11 GB**; cada worktree com `npm ci` ≈ 0,4 GB, mais 2 clusters). Worktrees
  `w-plan21` (detached em `539b078e`), `w-agapi2`, `w-san320`: o orquestrador confere **processo vivo e dono** antes de remover — resíduo alheio se
  reporta, não se varre. Memória de commit livre **≥ 4 GB** a cada lançamento; **≤ 2 trabalhos Docker**.
- Worktrees por jurado em caminho curto: `C:/Users/AMP/w-jt2c2-a`, `w-jt2c2-b`, `w-jt2c2-c`; `npm ci` próprio (**junction PROIBIDA**); contêineres
  `jt2c2-<x>-pg` / `jt2c2-<x>-redis`; remoção só por `git worktree remove --force` com 0 processos. Sondas persistentes em `…/erp-pausa-2026-10-03/jt2c2-<x>/`.
- **Ordem:** R → M → C → D → push → check-runs concluídos → redator gera 4 mandatos (pré-voo OK) → **inspetor sozinho** → `LIBERADO` →
  **(a) Codex + (b) Argon em paralelo** (2 trabalhos Docker) → **(c) Codex** quando um concluir → ata. 2 quedas em <30 min → pausa de 15 min (P5).
  Toda queda = 1 linha em `votos/B-TRC-02-ciclo2/00-quedas.md` (P6). O orquestrador commita evidência e voto após cada conclusão (agente não
  commita). **Vigia** em cada braço externo (Codex/Argon morrem em silêncio).

---

## 5. Riscos, rollback e o que a ata registra

| # | Risco | Mitigação / rollback |
|---|---|---|
| R1 | **Ciclo 2 ainda reprova por achado não grave** (8(2)); (a) e (c) julgam pela 1ª vez por inteiro | o dev roda a bateria **completa** (§3.7) e as réguas executáveis dos corpos (a)/(c) que já são testes do plano (G, E, F, M; 5 arnês com 1 linha; 9 intocáveis md5 = `c1485c94`) antes do push, e registra — é a bateria do plano, não autojulgamento. Se reprovar: ciclo 3 só por defeito grave; topo audita de novo |
| R2 | A `main` anda e conflita de novo em `decisoes.md`/`pendencias*` → objeto muda; `pull_request` não dispara | mandatos regenerados pela ferramenta (cola o head); CI por `push` basta (check-runs concluídos); ciclo curto |
| R3 | Codex/Argon esgotam no meio | P1/P2/P7 salvam o parcial; sucessor Opus declarado; Opus esgotado → PARA |
| R4 | Disco / memória (P8) | limpeza antes; (c) espera; abaixo de 10 GB livres, `DEEP_CLEAN=1` |
| R5 | `M-E16″` não compila ou não morde F3 → "não mede" | âncora única (1 ocorrência, medida); símbolos do `replace` existem no escopo do passo 5; o dev prova TAP vermelho em F3 l.273 e restauro por hash; se não morder, volta ao **redator do catálogo**, não ao jurado |
| R6 | Mesmo modelo (Argon) no dev e na cadeira (b) | identidades distintas; declarado na ata (como R-2 do ciclo 1) |
| R7 | `mandato-refs.sh 454` muda ao achar a ata do ciclo 1 nomeando #454 (com o #426 saiu ec 3 por 3 atas) | a ata do ciclo 1 traz a linha legível por máquina `- **approved_head:** nenhum — REPROVADO (ciclo 1)`; o redator mede o ec e registra; a ferramenta cola refs, não decide |
| R8 | Decisão do dono de 24/10 sem citação literal no repo | o orquestrador fornece as palavras; sem elas, fica "relato do orquestrador", não decisão gravada |
| R9 | Rollback do conserto | `git revert <C>` devolve o código do ciclo 1 (idêntico em comportamento); nada de banco, migração ou contrato envolvido |

**A ata do ciclo 2 (`J-B-TRC-02-ciclo2.md`) registra:** objeto final e `approved_head` legível por máquina; por cadeira: identidade, executor, modelo,
nível e substituições (quem cobriu o quê, por quê); item 9 por cadeira = `refeita` ×3 (nenhum carregado) + o comando que prova o objeto; o que
(a) e (b) **re-executaram** do roteiro P3 vs **mediram de novo**, e o que foi descartado por não ter comando; quedas e custo de redo (P6); papéis
§C7.4-bis (achou = `jurado-trc02-b-opus`; planejou = `planejador-trc02-c2-fable`, Fable; desenvolveu = `dev-trc02-c2-argon`; julgaram = as 3 novas)
e as respostas (a)(b)(c) **medidas no ciclo 2**; composição mista e "Gemini 1 de 3, nunca único"; decisão do dono de 24/10; ressalvas do inspetor;
o fechamento do b-1 (comando + saída) e a `M-E16″` vermelha; contagens re-medidas; pendências novas com dono; veredito e quórum (unanimidade com veto).

**Conteúdo mínimo da ata do ciclo 1 (`J-B-TRC-02-ciclo1.md`) e do `R-B-TRC-02-1.md`, a escrever pelo redator a partir deste arquivo:** objeto
`38504427`; terreno `LIBERADO COM RESSALVA` (reinspeção 08:04Z; R-1, R-2, R-3); votos: (b) REPROVADO (b-1 + notas b-2..b-4), (a) e (c) perdidos (P3);
`00-quedas.md` com 2 linhas nas colunas do P6 (`jurado-trc02-a-opus | opus (pin) | 3 | item 3 em curso | limite semanal do Claude (relato do
orquestrador) | redo ≈ a cauda: san3-05, guard 8, aditiva, DBA, T-M` e `jurado-trc02-c-opus | opus (pin) | 3 | cabeçalho de terreno | queda (relato) |
redo = tudo`); papéis do ciclo 1 (planejadores, críticos, dev, DBA, redatores, inspetor, cadeiras — §10 do plano v2 e R3 do inspetor); as respostas
(a)(b)(c) do §1.8; monocultura Opus (escolha do dono de 21/10); `approved_head: nenhum — REPROVADO`; a nota de que `§C7.1-quater`/"assento permanente"
não existem na ref (§A7) — o molde `TEMPLATE-J-ata.md` os cita e **não obriga**.

## 6. Pergunta ao dono

**Nenhuma bloqueante.** Composição, executores e "topo = Claude" já estão decididos. Um pedido ao **orquestrador**, não ao dono: as palavras
literais da decisão de 24/10 para o commit R (R8).

## 7. Registro de execução deste planejador e limpeza

Executado: `git rev-parse/branch/status/fetch`, `gh pr view 454`, `git merge-tree --write-tree 38504427 origin/main`, `git show`/`blame`/`ls-tree`/`grep`
sobre `38504427`, `c1485c94`, `7c0ed643`, `498c4e26`, `origin/main`; leitura dos 3 votos, 3 evidências, parecer e evidência do inspetor, 4 mandatos,
`gerar-*.sh`/`lib.sh`; transpilação objeto × conserto (`ts.transpileModule` do `w-trc02`) no scratchpad. **Nada rastreado editado; nada commitado;
nenhum worktree, contêiner ou banco criado.** Scratchpad: `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/pl02/`
(`service.obj.ts`, `service.fix.ts`, `.js` emitidos, `transpile.cjs`, partes deste arquivo) — só o que eu criei; pode ser apagado.
