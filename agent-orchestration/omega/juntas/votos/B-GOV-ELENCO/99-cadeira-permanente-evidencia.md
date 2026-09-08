# Cadeira permanente — `B-GOV-ELENCO` · evidência incremental (P1)

**Assento:** `cadeira-permanente-backend-review` (Fable, pinado) · **homologação nº 1** da série.
**Head medido por mim:** `f248183a007153b910fe7f9958c43cc05642d435` · branch `chore/gov-auditoria-elenco` · base `fe2748c8` ·
head de código/elenco `25c0112a` · head que as 3 cadeiras mediram: `918f5a01`.
**Terreno na entrada:** `git status --porcelain` → vazio. `git diff --name-status 918f5a01..HEAD` → 6 `A`, todos
`votos/B-GOV-ELENCO/C{1,2,3}-{voto.json,evidencia.md}`. `git diff --name-only 25c0112a..HEAD | grep -v '^agent-orchestration/' | wc -l` → **0**.
**Ata:** `ls agent-orchestration/omega/juntas/ | grep GOV-ELENCO` → só `BRIEFING-B-GOV-ELENCO.md`. **Não há `J-B-GOV-ELENCO.md` no head.**
Todo comando abaixo com `git -C <wt>` ou caminho absoluto no worktree; árvore principal não tocada.

---

## ITEM 1 — cada VETO foi LEGÍTIMO? (medições)

**Cópia do plano (armadilha §2.2):** `git log -- agent-orchestration/omega/planos/B-GOV-ELENCO-plano.md` → **só `25c0112a`**;
`wc -l` no head = **142** = `git show 25c0112a:<plano> | wc -l` = **142**. Uma cópia, inalterada. As três cadeiras citaram §5/§5-bis/§6/§8 desta cópia.

### C1-01 (ALTA, dentro-do-bloco) — `blocks_completed` value 162 / display "161"
- **(a) origem, medida por mim:** `git show fe2748c8:Kpis/kpis-latest.json` → `value: 161, display: "161"`; head → `value: 162, display: "161"`.
  `git diff fe2748c8..25c0112a -- Kpis/kpis-latest.json` → no hunk de `blocks_completed` a única linha alterada é `-"value": 161` / `+"value": 162`; `display` intocado.
  Amostra de 4 commits da main que tocaram o arquivo (`fe2748c8`, `ed0a692a`, `99f18403`, `e6a64619`): `value == display` em **4/4** (161/161, 160/160, 158/158, 156/156).
  → a divergência **nasce neste diff**. `dentro-do-bloco` CONFIRMADO.
- **(b) o plano pedia?** §5 do plano lista `Kpis/{kpis-latest.json,kpis-history.json,app.js}` como PERMITIDO **"(§C3)"** — invoca o contrato de KPI;
  briefing §1.6 promete "`blocks_completed` 161→162"; §6 A8 cita §C3.0. A cobrança é sobre a **promessa do próprio bloco** num caminho permitido.
  Não está na lista nominal do §5 do briefing (`.gitignore`, `.github/**`, `src/`, `tests/`, suíte local, `blockchain-developer`). **Não é reprovação por construção.**
- **(c) evidência executada:** `grep -n 'function metricDisplay' Kpis/app.js` → l.1047; l.1049: `if (metric.display !== undefined && metric.display !== null) return String(metric.display);`
  → o card imprime `display`. Reexecução direta abaixo.
- **REEXECUTADO (C1-01):** extraí `metricDisplay` do `Kpis/app.js` do head e apliquei ao `metrics.blocks_completed` de `Kpis/kpis-latest.json`:
  `card (metricDisplay) = 161 | value = 162`. **Reproduz.** History: 156 entradas, última `version = B-GOV-ELENCO`.
- **(d) gravidade:** o painel é a ENTREGA (§C3.0, D-KPI-INDEX-PAINEL) e o número deste bloco imprime errado no card enquanto JSON/history/gráfico dizem 162 —
  inconsistência de dado no artefato principal, silenciosa (guards verdes, reexecutados no Item 2). ALTA cabe. **C1-01: LEGÍTIMO.**

### C2-01 (bloqueia, dentro-do-bloco) — enumeração defendida por exclusão no consumidor (porteiro 5-bis)
- **(a) origem:** `git diff fe2748c8..25c0112a -- .claude/agents/porteiro-pos-merge.md` → hunk `@@ -41,6 +41,15 @@`, só linhas `+` (item 5-bis novo). Texto medido:
  "(b) o veredito era HOMOLOGADO ou HOMOLOGADO COM RESSALVA — merge sobre veredito ANULADO é merge inválido". Meia allowlist, meia denylist, na mesma frase. Texto deste bloco.
- **Componente PRE-EXISTENTE dentro do achado:** a "prova de FAIL-OPEN" é auditor ec=0 + sync ec=0 + zero parsers do veredito diante de uma ata fictícia com 5º veredito.
  Nem o auditor nem o sync foram desenhados (nem prometidos pelo plano §3) para ler atas. Nenhum veredito deste projeto tem parser executável: grep de LIBERADO|BLOQUEADO|REPROVADO|APROVADO
  em scripts/ tests/ .github/ → 8 arquivos, todos comentário ou nome de teste; o único assert (kpi-achados-paridade.test.ts:122) confere um campo de JSON, não uma ata.
  A classe "gate de junta é prosa lida por agente" antecede o bloco (D-SAN-AUTONOMIA 2026-07-13; porteiro 2026-08-12; inspetor 2026-08-24) — a própria C2-03 admite isso.
- **(b) o plano pedia?** §8: C2 = "as duas travas novas (inspetor 3.3, porteiro 5-bis) fecham mesmo? prova por mutação". O bloco afirma "fail-closed nas duas pontas" (CLAUDE.md l.403-406, medido).
  A cadeira testou o que o plano pediu, contra a afirmação que o bloco fez. A parte TEXTUAL (consequência nomeada só para ANULADO) é corrigível em .claude/agents/** (§5 PERMITIDO).
  A parte MECÂNICA (parser/gate executável entre voto e merge) exigiria tests/** ou .github/** — PROIBIDOS (§5-bis); cobrar isso é por construção.
- **(c) evidência:** a mutação foi executada e é reprodutível, mas prova propriedade que ninguém contestou. O que sustenta o achado é a leitura do texto (porteiro l.48; CLAUDE.md:232 sem else;
  decisoes.md tabela de 4 linhas) — conferida por mim linha a linha. Adequada para artefato de prosa.
- **(d) gravidade:** o "bloqueia" está calibrado pelo componente mecânico ("verde + aceito = FAIL-OPEN"), pre-existente e fora do escopo. O componente dentro-do-bloco (texto sem else) sustenta ALTA.
  → **C2-01: LEGÍTIMO no componente textual (dentro-do-bloco, ALTA); NÃO se sustenta como veto mecânico (pre-existente + §5-bis).** Não muda o veredito da cadeira: ela reprova também por C2-02.

### C2-02 (bloqueia, dentro-do-bloco) — três desfechos do mandato do assento sem veredito; "não consegui medir" roteado para o lado que libera
- **(a) origem:** `git diff --name-status fe2748c8..25c0112a -- .claude/agents/cadeira-permanente-backend-review.md` → **A** (novo). Medido no head: l.129-130 "está inválida";
  l.132-133 "Ausência = ciclo inválido"; l.187-188 "Cadeira não medida não é cadeira homologada: ela entra como ressalva nomeada"; l.170-181: nenhuma das 4 linhas finais se chama "inválido",
  e "ressalva nomeada" só cabe em HOMOLOGADO COM RESSALVA, que o porteiro 5-bis(b) aceita para merge. **dentro-do-bloco CONFIRMADO.**
- **(b) o plano pedia?** Sim: o bloco promete "assento com duas travas fail-closed" (briefing §1.4) e o §8 manda C2 provar que a trava do porteiro fecha. A trava consome a enumeração do
  assento; enumeração com default permissivo para "não medi" = trava que não fecha. Corrigível em .claude/agents/** (§5). **Dentro do que o plano escreveu.**
- **(c) evidência:** estática, por citação de linha — verificada por mim. Adequada ao artefato.
- **(d) gravidade:** o bloco existe para criar um gate que aplica "não consigo medir = REPROVADO" às outras cadeiras (item 1.6 do próprio assento) e o gate, para si, roteia o mesmo caso
  para o lado que libera. Contradição na função central. **bloqueia cabe. C2-02: LEGÍTIMO.** (Eu sou este texto; reconheço a ambiguidade e não a conserto — §C7.4-bis.)

### C3-A1 (BLOQUEIA, dentro-do-bloco) — C4 não cobre papel que JULGA fora dos prefixos
- **(a) origem:** `git log -- scripts/audit-agents-skills.mjs` → só 25c0112a (2026-09-07). l.49-50 JULGA = prefixos jurado-|critico-|...|cadeira-permanente-|coordenador-|master-teste;
  l.54 FERRAMENTA_DE_ESCRITA = (Write|Edit|NotebookEdit). agente-ci-doutor não casa nenhum prefixo. **dentro-do-bloco CONFIRMADO.**
- **(b) o plano pedia?** §3 C4 "papel que JULGA com ferramenta de escrita"; §4.4 publica "respeitado por construção"; §8 C3 = "o auditor mede o que diz medir? falso-positivo e falso-negativo".
  É a pergunta que o plano fez. Corrigível em scripts/audit-agents-skills.mjs (§5). **Dentro do que o plano escreveu.**
- **(c) REEXECUTADO por mim em cópia isolada no scratchpad (128 arquivos; git rev-parse → not a git repository):** baseline 24 agentes · 12 skills · OK ec=0 →
  agente-ci-doutor `tools: Read, Grep, Glob, Bash, Write, Edit` → **OK — nenhum achado, ec=0** → revert ec=0. Controle: mesma mutação em validador-mestre → **[BLOQUEIA] C4 §C7.4-bis ec=1** → revert ec=0. **Reproduz.**
- **(d) gravidade:** o guard apresentado como imposição do §C7.4-bis não enxerga a cadeira C3 desta junta (nomeada "Quem JULGA" no briefing §9). **BLOQUEIA cabe. C3-A1: LEGÍTIMO.**

### C3-A4 (BLOQUEIA, dentro-do-bloco) — terceira classe de falso-positivo do C8/C1
- **(a) origem:** mesmo commit 25c0112a. l.210: a retirada do bloco cercado casa só crase tripla na coluna 0. **dentro-do-bloco CONFIRMADO.**
- **(b) o plano pedia?** §3: C8 = "link relativo quebrado (fora de bloco cercado)"; fence de til e fence indentado SÃO bloco cercado (CommonMark). Briefing §2: "Terceira classe de
  falso-positivo = achado dentro-do-bloco que bloqueia" — padrão fixado pelo orquestrador no contrato do jurado. §8: C3 mede falso-positivo. **Dentro do que plano/briefing escreveram.** Corrigível em scripts/ (§5).
- **(c) REEXECUTADO por mim:** fence de til com link ilustrativo em saas-multi-tenant/SKILL.md (cópia) → **[BLOQUEIA] C8 link quebrado ec=1** (falso-positivo) → revert ec=0.
  Controle: mesmo link em fence de 3 crases → 0 achados ec=0. **Reproduz.**
- **(d) gravidade:** artefato válido reprovado com ec=1, mesma família dos dois falsos-positivos que o bloco declara fechados; a cadeira publicou honestamente prevalência ZERO no head (latente).
  O BLOQUEIA vem do padrão do briefing §2. **C3-A4: LEGÍTIMO** — sozinho seria veto sobre defeito latente; não está sozinho.

### Bloqueantes que são, na verdade, pre-existente?
- **C2-05** (alta, não bloqueia) — a cadeira separa: "dar Bash a papéis que julgam é PRE-EXISTENTE (inspetor 2026-08-24, porteiro 2026-08-12)"; o guard C4 é do bloco. Não é veto; a parte pre-existente vai para pendência com bloco dono.
- **C2-07** (media, não bloqueia) — "classe CLAUDE.md x AGENTS.md sem guard é PRE-EXISTENTE (D-INTEROP 2026-07-28)". Não é veto. Idem.
- **C2-01** — componente mecânico pre-existente e fora do §5, rotulado inteiro como dentro-do-bloco. **É o único bloqueante com componente pre-existente não declarado.**
- **C2-03** (alta, não bloqueia) — a cadeira declarou o componente pre-existente e por isso não pôs bloqueia. Correto.

**Controles que também reexecutei (C2):** model fable→sonnet no assento → [BLOQUEIA] C3 ec=1 → revert ec=0 (0→1→0). Forma A4 (R5): link morto em UMA SKILL.md → exatamente 1 C8 nomeando o arquivo, ec=1 → revert 0, ec=0.
**Limpeza:** rm -rf da cópia → "copia removida ec=0"; git status --porcelain do worktree → só `?? .../99-cadeira-permanente-evidencia.md`.

---

## ITEM 2 — o voto foi GANHO, cadeira a cadeira? (medições)

**Substância (executou ou leu?):** `C1-evidencia.md` 371 linhas, `ec=` x7, `git ` x21 · `C2-evidencia.md` 291 linhas, `ec=` x16 · `C3-evidencia.md` 417 linhas, `ec=` x32, `node ` x10.
Os três `*-voto.json` trazem `comandos_executados` com saída resumida (C1: 27 · C2: 19 · C3: 23 entradas). Nenhum voto é prosa.
**Head:** os três registram `head_medido = 918f5a01...` (R1 cumprida) e a regra de escopo do briefing (`diff 25c0112a..HEAD` fora de `agent-orchestration/` = 0) — re-medida por mim no head `f248183a`: **0**.
**Denominador (1.5) — REEXECUTADO por mim** com `node --import file:///.../node_modules/tsx/dist/loader.mjs --test` (tsx da árvore principal por caminho absoluto, só leitura, sem instalar; Node **v20.19.5**; `core.autocrlf=true`):
`kpi-dashboard-charts` **16/16** ec=0 · `kpi-achados-paridade` **6/6** ec=0 · `kpi-dashboard-contraste` **6/6** ec=0 · `agents-mirror-guard` **12/12** ec=0 — iguais aos 28/28 + 12/12 de C1 e aos do inspetor (passada 1). Estável.
**N e forma:** auditor determinístico, 1x por estado (baseline/mutação/revert); forma publicada nas três (cópia isolada via mktemp/scratchpad a partir do worktree, sem junction/npm ci).
C3 publicou `node --version` e `core.autocrlf`; **C1 e C2 não publicaram versão do Node** (forma sim, ambiente não). Gap menor — não anula, vira ressalva.
**Escopo com evidência:** C1 — `status A`, `git show` de 8 commits, `ls-tree` em fe2748c8 (C1-05 datado 2026-09-05). C2 — hunks `@@`, `D-*` datadas (exceto o componente mecânico de C2-01). C3 — `git log` do script, `cat-file -e`.
**Herança (1.4):** ciclo 1, sem ata anterior. Os três re-mediram a afirmação corrigida do briefing §4 (CI) em vez de herdar; C1 conferiu A9 15/15 e A10 contra a ata do 07b.
**"Não consigo medir" (1.6):** C2 lista `nao_executado`; C3 marca "BOM UTF-8: NÃO CONTO — não provei"; nenhum aprovou sobre não-medido. Moot para o veredito (3x REPROVADO), mas a disciplina está lá.

| cadeira | executou? | N e forma? | escopo com evidência? | veredito do voto |
|---|---|---|---|---|
| C1 `validador-mestre` | SIM (28/28+12/12 reexecutados por mim; app.js executado; 32/32 hashes) | SIM (falta versão do Node) | SIM | **GANHO** |
| C2 `guardiao-fail-closed` | SIM (mutações 0→1→0 reproduzidas: controles C3/C4) | SIM (falta versão do Node) | SIM em C2-03/05/07; **NÃO** no componente mecânico de C2-01 | **GANHO** — C2-01 a re-escopar |
| C3 `agente-ci-doutor` | SIM (C3-A1 e C3-A4 reproduzidos por mim; 21+18 mutações) | SIM (Node, autocrlf, cópia pristina por teste) | SIM | **GANHO** |

**Quórum:** plano §8 = **unanimidade de 3**, "por decisão registrada". `grep -c 'unanimidade de 3' decisoes.md` → **0**; `grep -c 'B-GOV-ELENCO' decisoes.md` → **0**. O registro vive **só no plano §8** (l.127-130), com justificativa
(reescreve a regra da junta; remove 15 arquivos). Pelo §C7.1-ter(b) literal seria **maioria de 3**. Leitura: subida **declarada e justificada, não silenciosa** — não é a classe medida em 28/08 (regra não escrita; escalada em resposta a reprovação).
Efeito neste ciclo: **nenhum** (3x0 fecha igual). Observação para o ciclo de correção: manter unanimidade só se a mesma razão valer, e registrar em `decisoes.md`, não só no plano.

---

## ITEM 3 — papéis, terreno, e a minha série (medições)

**Papéis §C7.4-bis:** briefing §9 (comitado em `23285d2d`) traz a tabela ACHOU/PLANEJOU/DESENVOLVEU/JULGA/HOMOLOGA e a nota honesta: achar/planejar/desenvolver caíram no mesmo orquestrador (ciclo 1, fluxo §C2),
com as condições (i) "se a junta reprovar, a correção vai para agente distinto do orquestrador" e (ii) "esta nota entra na ata". **A junta reprovou: a condição (i) está ATIVADA.**
**Ata:** `ls agent-orchestration/omega/juntas/ | grep GOV-ELENCO` → só o briefing. **`J-B-GOV-ELENCO.md` não existe no head `f248183a`** — por desenho (a ata resume este parecer), então não é ausência ainda;
mas as três perguntas (a)(b)(c) do §C7.4-bis passam a ser obrigatórias por escrito agora que há reprovação, e a ata que nascer tem de trazê-las.
**Inspetor:** `git log fe2748c8..HEAD` → passada 1 BLOQUEADO em `911ed749`, correção em `02466192`, passada 3 LIBERADO em `918f5a01` — as três comitadas. A passada 2 BLOQUEOU por regra de escopo falsa no briefing
(prefixo `omega/juntas/` em vez de `agent-orchestration/`) — a classe "reprovação por construção" pega **antes** do voto. Registrado.
**`00-quedas.md`:** tabela de quedas vazia + nota "P1/P2/P4 não aplicados na passada 1 — falha do orquestrador, não do agente". Registrado; confirmado pela transcrição no cabeçalho de `00-inspetor-terreno-passada1.md`.
**C2-N1 (briefing §7 x P1/P2/P4):** o §7 diz "nenhum jurado escreve no worktree"; o protocolo manda escrever `<cadeira>-voto.json`/`-evidencia.md` nele. Os 6 arquivos foram comitados em `f248183a`. Dívida de texto do briefing.

**Série entre juntas (bounded, primeira aplicação):** inventário 96 `J-*.md` · 34 `R-*.md`. `validador-mestre` em 45 J / 7 R; `agente-ci-doutor` 9 J / 0 R; `guardiao-fail-closed` 4 J / 1 R (J-O6R-B01-ciclo2/3, J-B-O6R-02-ciclo4).
"por construção" já aparece em 6 atas (J-B-O6R-02-ciclo2/3/4, J-O6R-B01-ciclo2, J-O6R-B05-PR353-merge, J-SAN2-4a) — padrão **já documentado** na auditoria de 28/08 (l.34-35), não novo.
Não medi voto a voto as 45 atas do validador-mestre; a série do assento começa aqui. **Nenhum padrão novo afirmado — não fabrico tendência.**
**Minha série:** homologação nº 1 → **1 homologada (com ressalva) · 0 anuladas.**
