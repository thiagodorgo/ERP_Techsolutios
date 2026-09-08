# Cadeira permanente — parecer sobre a junta do `B-GOV-ELENCO` (homologação nº 1)

**Assento:** `cadeira-permanente-backend-review` (Fable, pinado) · **Head medido:** `f248183a` · head de código/elenco `25c0112a` · head que as cadeiras mediram `918f5a01` (delta = só os 6 arquivos de voto) ·
base `fe2748c8` · **Veredito da junta:** REPROVADO 3x0 (C1 `validador-mestre` · C2 `guardiao-fail-closed` · C3 `agente-ci-doutor`) · **Quórum do plano:** unanimidade de 3.
**Evidência incremental:** `99-cadeira-permanente-evidencia.md` (ao lado). **Fronteira:** não julguei a entrega; julguei o julgamento. Nada aqui aprova o bloco.
**Nota de conflito, encarada:** o bloco julgado criou este assento, e C2-01/C2-02 atacam o meu próprio texto. Medi-os com a mesma régua dos outros e reconheço a ambiguidade que C2-02 nomeia. Não a conserto (§C7.4-bis).

## 1 · Cadeira x voto ganho

| cadeira | executou? | N e forma? | escopo com evidência? | veredito |
|---|---|---|---|---|
| C1 `validador-mestre` | SIM — 118 caminhos filtrados, 32/32 hashes de rename, 15/15 revivals, app.js executado; **eu reexecutei** 16/16·6/6·6/6·12/12 (ec=0) e o `metricDisplay` → card 161 x value 162 | SIM (forma publicada; falta versão do Node) | SIM (8 commits da main, `status A`, `ls-tree`; C1-05 datado) | **GANHO** |
| C2 `guardiao-fail-closed` | SIM — 6 mutações em cópia isolada, 0→1→0; **eu reproduzi** o controle `model: sonnet` → ec=1 C3 | SIM (falta versão do Node) | SIM em C2-03/05/07; **NÃO** no componente mecânico de C2-01 | **GANHO** — com C2-01 a re-escopar |
| C3 `agente-ci-doutor` | SIM — 21 mutações de falso-negativo + 18 de falso-positivo; **eu reproduzi** C3-A1 (ci-doutor +Write → ec=0; validador → ec=1) e C3-A4 (fence de til → 1 C8 falso; crase → 0) | SIM (Node v20.19.5, autocrlf, cópia pristina por teste) | SIM (`git log` do script) | **GANHO** |

Nenhum voto é prosa. Nenhum herdou afirmação da ata (ciclo 1; os três re-mediram o §4 do briefing). Denominadores estáveis. "Não consigo medir" declarado por C2/C3 e não usado para aprovar.

## 2 · Achado bloqueante x legitimidade

| achado | dentro-do-bloco? (provado por mim) | no escopo que o plano escreveu? | evidência executada? | gravidade cabe? | veredito |
|---|---|---|---|---|---|
| **C1-01** ALTA — `blocks_completed` value 162 / display "161" | SIM — diff toca só `value`; 4/4 commits da main com value==display | SIM — §5 lista `Kpis/*` "(§C3)"; briefing §1.6 promete 161→162 | SIM — reexecutei `metricDisplay` → 161 | SIM — painel é a ENTREGA (§C3.0) | **LEGÍTIMO** |
| **C2-01** bloqueia — enumeração defendida por exclusão (porteiro 5-bis) | Texto: SIM (hunk só `+`). Mecanismo: **NÃO** — "veredito de junta é prosa sem parser" antecede o bloco (D-SAN-AUTONOMIA 07-13; porteiro 08-12; inspetor 08-24); grep em scripts/tests/.github → 0 parsers | Texto: SIM (§5 `.claude/agents/**`). Mecanismo: **NÃO** — exigiria `tests/**`/`.github/**`, §5-bis PROIBIDO | Leitura de linha (adequada a prosa); a mutação prova o que ninguém contestou | **NÃO como está** — bloqueia calibrado pelo componente pre-existente; o textual sustenta ALTA | **LEGÍTIMO no componente textual (ALTA) · NÃO SE SUSTENTA como veto mecânico** |
| **C2-02** bloqueia — 3 desfechos do mandato sem veredito; "não medi" → lado que libera | SIM — arquivo `A` neste bloco; l.129-133 e l.187-188 x l.170-181 | SIM — bloco promete "travas fail-closed"; §8 manda C2 provar | Leitura de linha, conferida | SIM — contradição na função central do gate | **LEGÍTIMO** |
| **C3-A1** BLOQUEIA — C4 cego a papel que JULGA fora dos prefixos | SIM — script só em 25c0112a; regex l.49-50/54 | SIM — §3 C4, §4.4, §8 C3 | SIM — **reproduzido por mim** (ec=0 x controle ec=1) | SIM — não vê a cadeira C3 desta junta | **LEGÍTIMO** |
| **C3-A4** BLOQUEIA — 3ª classe de falso-positivo (til/indentado/code span/YAML) | SIM — l.210 só crase na coluna 0 | SIM — §3 "fora de bloco cercado"; briefing §2 fixa "3ª classe = bloqueia" | SIM — **reproduzido por mim** (til → 1 C8 falso) | SIM pelo padrão declarado; latente (prevalência 0, publicada) | **LEGÍTIMO** (não sustentaria sozinho) |

**Não-bloqueantes com componente pre-existente, corretamente declarados:** C2-03 (alta), C2-05 (alta), C2-07 (media), C1-05 (MEDIA, dono B-O6R-02 ciclo 5). Devem virar pendência nomeada, não achado do ciclo.
**Reprovação por construção (briefing §5)?** Nenhuma cadeira cobrou `.gitignore`, `.github/**`, `src/`, `tests/`, `npm ci` local ou `blockchain-developer`. C2 e C3 nomearam explicitamente que não cobram a CI.
**Cópia do plano:** uma só (`25c0112a`, 142 linhas, inalterada). Sem risco de régua sem apensos.

## 3 · Quórum

Exigido pelo §C7.1-ter(b) literal: **maioria de 3** (governança; sem dinheiro/segurança/permissão/perda de dado no produto). Aplicado: **unanimidade de 3**, subido pelo plano §8 com justificativa escrita (reescreve a regra da junta; remove 15 arquivos).
`decisoes.md`: **0** menções a "unanimidade de 3" ou a "B-GOV-ELENCO" — o registro vive só no plano. **Bate como decisão declarada, não silenciosa**; não é a escalada-por-reprovação que a auditoria de 28/08 mediu. Efeito neste ciclo: nenhum (3x0).
Ressalva: no ciclo de correção, ou registra-se a subida em `decisoes.md`, ou volta-se à maioria de 3 — não se herda um quórum elevado por inércia.
Votos perdidos: **0** (`00-quedas.md`). Junta fechou com 3 votos de mérito = quórum íntegro. Assento não ocupou cadeira de mérito (grep no plano/briefing: só como "P"/"Quem HOMOLOGA").

## 4 · Série entre juntas

96 atas `J-*`, 34 `R-*`. `validador-mestre` 45 J/7 R · `agente-ci-doutor` 9 J/0 R · `guardiao-fail-closed` 4 J/1 R. "Reprovação por construção" já nomeada em 6 atas anteriores — padrão **já documentado** (auditoria 28/08), não novo.
Neste bloco, o inspetor pegou a mesma classe **antes** do voto (passada 2: regra de escopo falsa no briefing). **Nenhum padrão novo — a série do assento começa aqui.** Não medi voto a voto as 45 atas do validador-mestre.

## 5 · A minha série

**Homologadas: 1 (com ressalva) · Anuladas: 0.** Acumulado após esta junta. É esta linha que o `porteiro-pos-merge` confere.

## 6 · Pendências que abro (não são voto meu)

1. **C2-01 re-escopado** — componente mecânico ("nenhum gate executável entre o último voto e o merge; veredito sem parser") → `pre-existente`, classe D-SAN-AUTONOMIA (2026-07-13), fora do §5 (§5-bis `tests/**`, `.github/**`). Bloco dono: o que herdar `P-GOV-AUDITOR-FORA-DA-CI`. **Só o componente textual (porteiro 5-bis sem cláusula "qualquer outro veredito = inválido"; ALTA, dentro-do-bloco) segue para o ciclo de correção.**
2. **C2-05 parte pre-existente** — Bash em papéis que julgam (inspetor 08-24, porteiro 08-12): decisão do dono, não do ciclo. A parte do bloco (guard C4 cego a Bash/MultiEdit; = C3-A2) segue no ciclo.
3. **C2-07 parte pre-existente** — CLAUDE.md x AGENTS.md sem guard executável (D-INTEROP 2026-07-28): bloco dono futuro de governança.
4. **C1-05** — nota "Divergência RESOLVIDA" do `.agents/agents/README.md` com medição congelada (34/11 x 38/15 em fe2748c8): dono `B-O6R-02 ciclo 5`, como C1 pediu.
5. **C1-02/03/04 (BAIXA)** sem registro em `pendencias.md` no head (C1 conferiu por grep) — registrar antes do ciclo.
6. **Ata `J-B-GOV-ELENCO.md`** — inexistente no head; deve nascer com o §9 do briefing verbatim, as respostas (a)(b)(c) do §C7.4-bis por escrito, e a **condição (i) ativada: a correção vai para agente distinto do orquestrador** (que foi achador + planejador + dev).
7. **Briefing §7 x P1/P2/P4** (C2-N1) — o texto do ciclo 2 deve excepcionar `votos/<bloco>/` da regra "nenhum jurado escreve no worktree".
8. **Forma dos votos** — C1 e C2 não publicaram `node --version`/`core.autocrlf`; próximos votos publicam (C3 é o modelo).
9. **Quórum** — registrar a subida em `decisoes.md` ou voltar à maioria (§3).

Defeito de produto que eu tenha visto e não seja das cadeiras: **nenhum.**

## 7 · Verificações executadas (N=1 cada, salvo indicado; `git -C <wt>` ou caminho absoluto; árvore principal só lida em `node_modules/tsx`)

- `git rev-parse HEAD` → `f248183a` · `status --porcelain` → vazio na entrada · `diff --name-status 918f5a01..HEAD` → 6 `A` (votos) · `diff --name-only 25c0112a..HEAD | grep -v '^agent-orchestration/' | wc -l` → 0.
- Plano: `git log -- <plano>` → só `25c0112a`; `wc -l` = 142 no head e em `25c0112a`.
- C1-01: `git show fe2748c8:Kpis/kpis-latest.json` (161/"161") x head (162/"161"); `git diff fe2748c8..25c0112a -- Kpis/kpis-latest.json` (só `value`); value x display em `fe2748c8 ed0a692a 99f18403 e6a64619` → 4/4 iguais; `metricDisplay` extraída do `app.js` e aplicada ao JSON → **161**.
- C2: `git diff fe2748c8..25c0112a -- .claude/agents/{porteiro-pos-merge,inspetor-de-terreno-da-junta}.md` (hunks só `+`); `--name-status` do assento → `A`; `sed` l.125-135 e l.168-190 do assento; `grep`/`sed` CLAUDE.md l.228-238 e l.378-408; `sed` decisoes.md l.1916-1960; `grep -rlE 'LIBERADO|BLOQUEADO|REPROVADO|APROVADO' scripts/ tests/ .github/` → 8 arquivos, 0 parsers; `git log --diff-filter=A` dos gates em prosa.
- C3: `git log -- scripts/audit-agents-skills.mjs` → só `25c0112a`; `grep -n` das regex l.49-50, l.54, l.162-163, l.210.
- **Cópia isolada** (scratchpad, 128 arquivos, fora de qualquer repo): baseline ec=0 → M1 `agente-ci-doutor` +Write,Edit **ec=0** → revert 0 → M2 `validador-mestre` +Write,Edit **ec=1 C4** → revert 0 → M3 fence de til **ec=1 C8** → revert 0 → M4 fence de crase **ec=0** → M5 `model: sonnet` **ec=1 C3** → revert 0 → M6 link morto **1 C8** → revert 0. `rm -rf` ec=0; worktree limpo.
- Suítes (Node v20.19.5, `core.autocrlf=true`, `node --import <tsx da árvore principal, caminho absoluto> --test`): `kpi-dashboard-charts` 16/16 · `kpi-achados-paridade` 6/6 · `kpi-dashboard-contraste` 6/6 · `agents-mirror-guard` 12/12 — ec=0 nos quatro.
- Substância dos votos: `wc -l` e `grep -c 'ec='` nas três evidências (371/7 · 291/16 · 417/32); versão do Node publicada só em C3.
- Quórum: `grep -c 'unanimidade de 3'` e `'B-GOV-ELENCO'` em `decisoes.md` → 0 e 0; plano §8 l.127-130.
- Série: contagem de `J-*`/`R-*`; `grep -l` das três cadeiras; `grep -l 'por construção'` → 6 atas; auditoria 28/08 l.34-35.
- Terreno/papéis: `git log fe2748c8..HEAD` (7 commits, 3 do inspetor); `ls juntas/ | grep GOV-ELENCO` → só briefing; `00-quedas.md` lido.

**Não executado, dito explicitamente:** `npm run check/test/build` (plano §7; cobrar seria por construção); `buildChartSeries` (a afirmação central de C1 — o card — foi a reexecutada); leitura voto a voto das 45 atas do `validador-mestre`; simulação de um porteiro vivo diante de um 5º veredito (prosa, julgada por leitura, como C2 declarou).

---

HOMOLOGADO COM RESSALVA: REPROVADO 3x0 vale — sustentado por C1-01, C2-02, C3-A1 (e C3-A4), todos dentro-do-bloco, no §5 do plano, com evidência reexecutada por mim | a fechar antes do ciclo de correção: (1) C2-01 re-escopado — o componente mecânico (gate/parser executável entre voto e merge) é pre-existente e §5-bis e vira pendência com bloco dono; só o componente textual (ALTA) segue como achado; (2) ata J-B-GOV-ELENCO.md com o §9 do briefing, as respostas (a)(b)(c) do §C7.4-bis por escrito e a correção entregue a agente distinto do orquestrador; (3) quórum unanimidade registrado em decisoes.md ou reduzido à maioria de 3; (4) pendências nomeadas para as partes pre-existentes de C2-05/C2-07 e para C1-05 (dono B-O6R-02 ciclo 5) e C1-02/03/04; (5) briefing §7 excepcionando votos/<bloco>/ de "nenhum jurado escreve"; (6) próximos votos publicam versão do Node e autocrlf.
